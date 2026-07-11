import type { FastifyInstance } from 'fastify';
import { fileTypeFromBuffer } from 'file-type';
import {
  DiseaseInput,
  DiseaseSchema,
  diseaseSystemPrompt,
  diseaseUserPrompt,
} from '../prompts/disease.js';
import { callGroqVision, groqStatus } from '../services/groq.js';
import { enforceDiseaseSafetyGates } from '../lib/disease-safety.js';
import { llmCache, llmCacheKey, sha256, ttl } from '../lib/llm-cache.js';
import {
  beginActive,
  checkAiLimits,
  endActive,
  identityFromReq,
} from '../lib/ai-rate-limit.js';
import { trackUsage } from '../lib/usage.js';

// 6MB of base64 ≈ 4.5MB binary. Matches the Fastify bodyLimit so we never
// reject a request the client successfully sent. The client downscales before
// upload, so real payloads land at 150–400 KB; this is just a safety ceiling.
const MAX_BASE64_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function registerDiseaseRoutes(app: FastifyInstance) {
  app.post('/api/disease/analyze', async (req, reply) => {
    const parsed = DiseaseInput.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ ok: false, reason: 'invalid_query', details: parsed.error.flatten().fieldErrors });
    }

    const input = parsed.data;

    if (input.image_data_url.length > MAX_BASE64_BYTES) {
      return reply.status(413).send({ ok: false, reason: 'image_too_large' });
    }

    const commaIdx = input.image_data_url.indexOf(',');
    if (commaIdx === -1) {
      return reply.status(400).send({ ok: false, reason: 'invalid_image' });
    }
    const base64 = input.image_data_url.slice(commaIdx + 1);
    let buf: Buffer;
    try {
      buf = Buffer.from(base64, 'base64');
    } catch {
      return reply.status(400).send({ ok: false, reason: 'invalid_image' });
    }
    if (buf.byteLength > MAX_BASE64_BYTES) {
      return reply.status(413).send({ ok: false, reason: 'image_too_large' });
    }

    const detected = await fileTypeFromBuffer(buf);
    if (!detected || !ALLOWED_MIME.has(detected.mime)) {
      return reply.status(400).send({ ok: false, reason: 'invalid_image' });
    }

    if (!groqStatus.configured()) {
      return reply.status(503).send({ ok: false, reason: 'upstream_auth_failed' });
    }

    const identity = identityFromReq(req);
    const gate = checkAiLimits('disease', identity);
    if (!gate.allowed) {
      return reply.status(429).send({ ok: false, reason: gate.reason });
    }

    const hash = sha256(buf);
    const key = llmCacheKey('disease', [hash, input.lang]);
    const cached = llmCache.get<object>(key);
    if (cached) {
      return reply.status(200).send({ ok: true, data: cached, cached: true });
    }

    beginActive('disease');
    try {
      const result = await callGroqVision({
        system: diseaseSystemPrompt(input.lang),
        prompt: diseaseUserPrompt(input),
        imageDataUrl: input.image_data_url,
        schema: DiseaseSchema,
        temperature: 0.2,
        // Richer schema with differentials + structured treatment + image
        // quality + escalation. Typical 2500–3500 tokens; 2800 leaves headroom
        // without inviting padding.
        maxTokens: 2800,
      });

      if (!result.ok) {
        return reply.status(result.reason === 'upstream_auth_failed' ? 503 : 502).send({
          ok: false,
          reason: result.reason,
        });
      }

      const safe = enforceDiseaseSafetyGates(result.data);

      trackUsage('disease', result.usage);
      llmCache.set(key, safe, ttl.sevenDays);

      return reply.status(200).send({ ok: true, data: safe, cached: false });
    } finally {
      endActive('disease');
    }
  });
}
