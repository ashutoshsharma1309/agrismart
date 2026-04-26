import type { FastifyInstance } from 'fastify';
import { SoilInput, SoilSchema, soilSystemPrompt, soilUserPrompt } from '../prompts/soil.js';
import { callGroq, groqStatus } from '../services/groq.js';
import { analyseSoil } from '../services/soil-baseline.js';
import { llmCache, llmCacheKey, ttl } from '../lib/llm-cache.js';
import {
  beginActive,
  checkAiLimits,
  endActive,
  identityFromReq,
} from '../lib/ai-rate-limit.js';
import { trackUsage } from '../lib/usage.js';

export async function registerSoilRoutes(app: FastifyInstance) {
  app.post('/api/soil/analyze', async (req, reply) => {
    const parsed = SoilInput.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ ok: false, reason: 'invalid_query', details: parsed.error.flatten().fieldErrors });
    }
    const input = parsed.data;

    const baseline = analyseSoil(input);

    if (!groqStatus.configured()) {
      return reply.status(503).send({ ok: false, reason: 'upstream_auth_failed', baseline });
    }

    const identity = identityFromReq(req);
    const gate = checkAiLimits('soil', identity);
    if (!gate.allowed) {
      return reply.status(429).send({ ok: false, reason: gate.reason });
    }

    const key = llmCacheKey('soil', [
      input.nitrogen_kg_ha,
      input.phosphorus_kg_ha,
      input.potassium_kg_ha,
      input.ph,
      input.organic_carbon_pct,
      input.intended_crop,
      input.intended_fertilizer ?? '',
      input.intended_pesticide ?? '',
      input.lang,
    ]);
    const cached = llmCache.get<object>(key);
    if (cached) {
      return reply.status(200).send({ ok: true, data: cached, cached: true });
    }

    beginActive('soil');
    try {
      const result = await callGroq({
        system: soilSystemPrompt(input.lang),
        user: soilUserPrompt(input, {
          score: baseline.healthScore,
          suggestedFertilizer: baseline.fertilizer.name,
          suggestedPesticide: baseline.pesticide.name,
          planSummary: baseline.plan.map((p) => `${p.step}. ${p.title}: ${p.body}`).join(' | '),
        }),
        schema: SoilSchema,
        temperature: 0.3,
        maxTokens: 1400,
      });

      if (!result.ok) {
        // Fall through to baseline so the farmer still gets advice.
        return reply.status(200).send({
          ok: true,
          data: {
            soil_health_score: baseline.healthScore,
            eco_fertilizer: {
              recommendation: baseline.fertilizer.name,
              reasoning: baseline.fertilizer.rationale,
              application_rate: baseline.fertilizer.dosage,
            },
            eco_pesticide: {
              recommendation: baseline.pesticide.name,
              reasoning: baseline.pesticide.rationale,
              application_notes: 'Apply as per label instructions.',
            },
            improvement_plan: baseline.plan.map((p) => ({
              step: p.step,
              action: p.title,
              timing: p.title,
              expected_impact: p.body,
            })),
            warnings: [],
          },
          cached: false,
          fallback_used: true,
          reason: result.reason,
        });
      }

      // Trust the rule engine's health score over what the LLM returned.
      const data = { ...result.data, soil_health_score: baseline.healthScore };
      trackUsage('soil', result.usage);
      llmCache.set(key, data, ttl.oneDay);

      return reply.status(200).send({ ok: true, data, cached: false });
    } finally {
      endActive('soil');
    }
  });
}
