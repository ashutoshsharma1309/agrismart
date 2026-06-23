import Groq from 'groq-sdk';
import { z, type ZodSchema } from 'zod';
import { config, isGroqConfigured } from '../config.js';
import { logger } from '../lib/logger.js';

// Lazy singleton. We never import this from client-facing code.
let client: Groq | null = null;
function groq(): Groq {
  if (!isGroqConfigured) {
    throw new GroqError('upstream_auth_failed', 'GROQ_API_KEY is not configured');
  }
  if (!client) {
    client = new Groq({
      apiKey: config.GROQ_API_KEY,
      timeout: config.GROQ_TIMEOUT_MS,
    });
  }
  return client;
}

export type GroqReason =
  | 'upstream_auth_failed'
  | 'upstream_rate_limited'
  | 'upstream_unavailable'
  | 'upstream_timeout'
  | 'schema_validation_failed'
  | 'invalid_input'
  | 'upstream_bad_request';

export class GroqError extends Error {
  constructor(
    public reason: GroqReason,
    message: string,
  ) {
    super(message);
    this.name = 'GroqError';
  }
}

export type GroqSuccess<T> = { ok: true; data: T; usage: TokenUsage };
export type GroqFailure = { ok: false; reason: GroqReason };
export type GroqResult<T> = GroqSuccess<T> | GroqFailure;

export type TokenUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  model: string;
};

type CallOpts<T> = {
  system: string;
  user: string;
  schema?: ZodSchema<T>;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  /** For chat use; prepended after system, before user. */
  history?: { role: 'user' | 'assistant'; content: string }[];
};

type VisionOpts<T> = {
  system: string;
  prompt: string;
  imageDataUrl: string; // data:image/jpeg;base64,...
  schema?: ZodSchema<T>;
  temperature?: number;
  maxTokens?: number;
  model?: string;
};

async function withBackoff<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseMs = 1000,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || i === attempts - 1) throw err;
      const delay = baseMs * Math.pow(3, i); // 1s, 3s
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function isRetryable(err: unknown): boolean {
  if (err instanceof GroqError) {
    return (
      err.reason === 'upstream_unavailable' ||
      err.reason === 'upstream_timeout' ||
      err.reason === 'upstream_rate_limited'
    );
  }
  const status = (err as { status?: number })?.status;
  if (typeof status === 'number') {
    return status >= 500 || status === 429;
  }
  return true; // network errors: retry
}

function classify(err: unknown): GroqError {
  if (err instanceof GroqError) return err;
  const e = err as { status?: number; message?: string; code?: string };
  if (e.status === 401 || e.status === 403) {
    return new GroqError('upstream_auth_failed', 'Groq rejected credentials');
  }
  if (e.status === 429) {
    return new GroqError('upstream_rate_limited', 'Groq rate-limited');
  }
  if (e.status === 400) {
    return new GroqError('upstream_bad_request', e.message ?? 'Bad request');
  }
  if (e.code === 'ETIMEDOUT' || (e.message ?? '').toLowerCase().includes('timeout')) {
    return new GroqError('upstream_timeout', 'Groq timed out');
  }
  return new GroqError('upstream_unavailable', e.message ?? 'Unknown upstream error');
}

/** Call Groq text completion. */
export async function callGroq<T = string>(opts: CallOpts<T>): Promise<GroqResult<T>> {
  const model = opts.model ?? config.GROQ_MODEL_TEXT;
  const temperature = opts.temperature ?? (opts.schema ? 0.3 : 0.7);
  const maxTokens = Math.min(opts.maxTokens ?? config.GROQ_MAX_TOKENS, config.GROQ_MAX_TOKENS);

  const messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[] = [{ role: 'system', content: opts.system }];
  if (opts.history?.length) {
    for (const m of opts.history) {
      messages.push({ role: m.role, content: m.content });
    }
  }
  messages.push({ role: 'user', content: opts.user });

  const useJson = !!opts.schema;

  const started = Date.now();
  try {
    const raw = await withBackoff(async () => {
      try {
        return await groq().chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          ...(useJson ? { response_format: { type: 'json_object' as const } } : {}),
        });
      } catch (err) {
        throw classify(err);
      }
    });

    const duration = Date.now() - started;
    const choice = raw.choices[0];
    const content = choice?.message?.content ?? '';
    const usage: TokenUsage = {
      prompt_tokens: raw.usage?.prompt_tokens ?? 0,
      completion_tokens: raw.usage?.completion_tokens ?? 0,
      total_tokens: raw.usage?.total_tokens ?? 0,
      model,
    };

    // PII-safe log: tokens + model + duration, no prompt/response content.
    logger.info(
      {
        provider: 'groq',
        model,
        duration_ms: duration,
        tokens: usage.total_tokens,
        finish_reason: choice?.finish_reason,
        json_mode: useJson,
      },
      'groq call',
    );

    if (opts.schema) {
      const parsed = tryParseJson(content);
      if (parsed !== null) {
        const first = opts.schema.safeParse(parsed);
        if (first.success) {
          return { ok: true, data: first.data as T, usage };
        }
        // Surface the validation failure shape in logs so we can refine the
        // prompt or schema. Only field names + error codes — never the user's
        // prompt or response content.
        logger.warn(
          {
            errors: first.error.issues.slice(0, 8).map((i) => ({
              path: i.path.join('.'),
              code: i.code,
              message: i.message,
            })),
            top_level_keys:
              parsed && typeof parsed === 'object' ? Object.keys(parsed) : null,
          },
          'groq schema validation failed (first attempt)',
        );
      }

      // Retry once with a stricter prompt appended, to squeeze valid JSON out.
      const stricter = await withBackoff(async () => {
        try {
          return await groq().chat.completions.create({
            model,
            temperature: 0.1,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' as const },
            messages: [
              ...messages,
              {
                role: 'system',
                content:
                  'Your previous response was not valid JSON matching the schema. Return ONLY the JSON object, no prose, no code fences.',
              },
            ],
          });
        } catch (err) {
          throw classify(err);
        }
      });
      const retryContent = stricter.choices[0]?.message?.content ?? '';
      const retryParsed = tryParseJson(retryContent);
      if (retryParsed !== null) {
        const second = opts.schema.safeParse(retryParsed);
        if (second.success) {
          usage.prompt_tokens += stricter.usage?.prompt_tokens ?? 0;
          usage.completion_tokens += stricter.usage?.completion_tokens ?? 0;
          usage.total_tokens += stricter.usage?.total_tokens ?? 0;
          return { ok: true, data: second.data as T, usage };
        }
      }
      return { ok: false, reason: 'schema_validation_failed' };
    }

    return { ok: true, data: content as T, usage };
  } catch (err) {
    const ge = err instanceof GroqError ? err : classify(err);
    logger.warn({ reason: ge.reason, model }, 'groq call failed');
    return { ok: false, reason: ge.reason };
  }
}

/** Vision call — accepts a base64 data URL. */
export async function callGroqVision<T = string>(opts: VisionOpts<T>): Promise<GroqResult<T>> {
  const model = opts.model ?? config.GROQ_MODEL_VISION;
  const temperature = opts.temperature ?? (opts.schema ? 0.3 : 0.5);
  // Vision schema (disease v2) is rich — calibrated confidence, differentials,
  // structured treatment, image quality, escalation. Cap at 4096 to match the
  // text-side env ceiling.
  const maxTokens = Math.min(opts.maxTokens ?? 3500, 4096);
  const useJson = !!opts.schema;

  const started = Date.now();
  try {
    const raw = await withBackoff(async () => {
      try {
        return await groq().chat.completions.create({
          model,
          temperature,
          max_tokens: maxTokens,
          ...(useJson ? { response_format: { type: 'json_object' as const } } : {}),
          messages: [
            { role: 'system', content: opts.system },
            {
              role: 'user',
              content: [
                { type: 'text', text: opts.prompt },
                { type: 'image_url', image_url: { url: opts.imageDataUrl } },
              ],
            },
          ],
        });
      } catch (err) {
        throw classify(err);
      }
    });

    const duration = Date.now() - started;
    const content = raw.choices[0]?.message?.content ?? '';
    const usage: TokenUsage = {
      prompt_tokens: raw.usage?.prompt_tokens ?? 0,
      completion_tokens: raw.usage?.completion_tokens ?? 0,
      total_tokens: raw.usage?.total_tokens ?? 0,
      model,
    };
    logger.info(
      { provider: 'groq', model, duration_ms: duration, tokens: usage.total_tokens, vision: true },
      'groq vision call',
    );

    if (opts.schema) {
      const parsed = tryParseJson(content);
      if (parsed !== null) {
        const first = opts.schema.safeParse(parsed);
        if (first.success) {
          return { ok: true, data: first.data as T, usage };
        }
        logger.warn(
          {
            errors: first.error.issues.slice(0, 8).map((i) => ({
              path: i.path.join('.'),
              code: i.code,
              message: i.message,
            })),
            top_level_keys:
              parsed && typeof parsed === 'object' ? Object.keys(parsed) : null,
          },
          'groq vision schema validation failed (first attempt)',
        );
      }

      // Retry once with a stricter prompt appended, to squeeze valid JSON out.
      const stricter = await withBackoff(async () => {
        try {
          return await groq().chat.completions.create({
            model,
            temperature: 0.1,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' as const },
            messages: [
              { role: 'system', content: opts.system },
              {
                role: 'user',
                content: [
                  { type: 'text', text: opts.prompt },
                  { type: 'image_url', image_url: { url: opts.imageDataUrl } },
                ],
              },
              {
                role: 'system',
                content:
                  'Your previous response was not valid JSON matching the schema. Return ONLY the JSON object, no prose, no code fences.',
              },
            ],
          });
        } catch (err) {
          throw classify(err);
        }
      });
      const retryContent = stricter.choices[0]?.message?.content ?? '';
      const retryParsed = tryParseJson(retryContent);
      if (retryParsed !== null) {
        const second = opts.schema.safeParse(retryParsed);
        if (second.success) {
          usage.prompt_tokens += stricter.usage?.prompt_tokens ?? 0;
          usage.completion_tokens += stricter.usage?.completion_tokens ?? 0;
          usage.total_tokens += stricter.usage?.total_tokens ?? 0;
          return { ok: true, data: second.data as T, usage };
        }
      }
      return { ok: false, reason: 'schema_validation_failed' };
    }
    return { ok: true, data: content as T, usage };
  } catch (err) {
    const ge = err instanceof GroqError ? err : classify(err);
    logger.warn({ reason: ge.reason, model }, 'groq vision call failed');
    return { ok: false, reason: ge.reason };
  }
}

function tryParseJson(s: string): unknown {
  if (!s) return null;
  try {
    // Strip ```json fences if the model added them anyway.
    const cleaned = s
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    return JSON.parse(cleaned);
  } catch {
    // Try to extract the first {...} block as a last resort.
    const match = s.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Small helper for routes to reason about missing config.
export const groqStatus = {
  configured: () => isGroqConfigured,
};

// Re-exported for route handlers building explicit Zod schemas for LLM outputs.
export { z };
