import type { FastifyInstance } from 'fastify';
import { fileTypeFromBuffer } from 'file-type';
import {
  DiseaseInput,
  DiseaseSchema,
  diseaseSystemPrompt,
  diseaseUserPrompt,
  type DiseaseOutput,
} from '../prompts/disease.js';
import { callGroqVision, groqStatus } from '../services/groq.js';
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

// Defense-in-depth: even if the prompt is ignored or the schema validates a
// dangerous payload, sanitize before sending. Mirrors the safety gates from
// the system prompt so a single failure (prompt drift, schema gap, model
// hallucination) can't slip a chemical recommendation past a 0.7 confidence.
function enforceDiseaseSafetyGates(raw: unknown): DiseaseOutput {
  // Re-parse through the schema so defaults are applied and the type narrows
  // from the loose `unknown` we get out of callGroqVision (whose generic uses
  // z.input, not z.output).
  const out: DiseaseOutput = DiseaseSchema.parse(raw);
  const conf = out.primary_diagnosis.confidence;
  const sc = out.treatment.synthetic_chemical;

  // Sync confidence_label to the band of the numeric confidence so the UI's
  // colour gating can't disagree with the threshold gates here.
  out.primary_diagnosis.confidence_label =
    conf >= 0.9
      ? 'very_high'
      : conf >= 0.75
        ? 'high'
        : conf >= 0.55
          ? 'moderate'
          : conf >= 0.35
            ? 'low'
            : 'uncertain';

  // KVK consultation flag is non-negotiable.
  sc.kvk_consultation_required = true;

  // Below the synthetic-chemical threshold: scrub all specific guidance.
  if (conf < 0.7 || out.severity === 'unable_to_assess') {
    sc.recommended = false;
    sc.product_class = null;
    sc.indian_examples = [];
    sc.typical_concentration = null;
    sc.application_method = null;
    if (!sc.kvk_consultation_reasoning || sc.kvk_consultation_reasoning.length < 5) {
      sc.kvk_consultation_reasoning =
        'Confidence in this diagnosis is below the threshold for chemical recommendations. Please consult your KVK or agriculture officer for a specific treatment plan.';
    }
  } else if (sc.recommended) {
    // Above threshold and recommended: ensure PPE minimum is present.
    const required = ['gloves', 'mask', 'full-sleeve clothing'];
    const have = new Set(sc.ppe_required.map((p) => p.toLowerCase()));
    for (const r of required) {
      if (!Array.from(have).some((h) => h.includes(r))) {
        sc.ppe_required.push(r);
      }
    }
  }

  // If the model answered "not_a_leaf" or "healthy", make sure no treatment
  // sneaks through.
  const name = out.primary_diagnosis.common_name.toLowerCase();
  if (name === 'not_a_leaf' || name === 'healthy' || name === 'uncertain') {
    out.treatment.safe_to_recommend = false;
    sc.recommended = false;
    sc.product_class = null;
    sc.indian_examples = [];
    sc.typical_concentration = null;
    sc.application_method = null;
  }

  return out;
}
