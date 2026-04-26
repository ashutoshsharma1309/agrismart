import type { FastifyInstance } from 'fastify';
import { AdvisoryInput, AdvisorySchema, advisorySystemPrompt, advisoryUserPrompt } from '../prompts/advisory.js';
import { callGroq, groqStatus } from '../services/groq.js';
import { getCurrentWeather, getForecast } from '../services/openweather.js';
import { llmCache, llmCacheKey, ttl } from '../lib/llm-cache.js';
import {
  beginActive,
  checkAiLimits,
  endActive,
  identityFromReq,
} from '../lib/ai-rate-limit.js';
import { trackUsage } from '../lib/usage.js';
import { geocode } from '../services/openweather.js';

export async function registerAdvisoryRoutes(app: FastifyInstance) {
  app.post('/api/advisory/generate', async (req, reply) => {
    const parsed = AdvisoryInput.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ ok: false, reason: 'invalid_query', details: parsed.error.flatten().fieldErrors });
    }
    const input = parsed.data;

    if (!groqStatus.configured()) {
      return reply.status(503).send({ ok: false, reason: 'upstream_auth_failed' });
    }

    const identity = identityFromReq(req);
    const gate = checkAiLimits('advisory', identity);
    if (!gate.allowed) {
      return reply.status(429).send({ ok: false, reason: gate.reason });
    }

    const key = llmCacheKey('advisory', [
      input.primary_soil,
      input.secondary_soil ?? '_',
      String(input.primary_soil_share_pct ?? ''),
      String(input.sowing_month ?? ''),
      input.season ?? '_',
      input.location,
      input.lang,
      input.irrigation ?? '_',
      String(input.budget_per_acre_inr ?? ''),
      input.risk_preference ?? '_',
      input.experience ?? '_',
      input.previous_crop ?? '_',
      input.preferred_crops?.slice().sort().join(','),
    ]);
    const cached = llmCache.get<object>(key);
    if (cached) {
      return reply.status(200).send({ ok: true, data: cached, cached: true });
    }

    beginActive('advisory');
    try {
      const weatherContext = await weatherContextFor(input.location);
      const result = await callGroq({
        system: advisorySystemPrompt(input.lang),
        user: advisoryUserPrompt(input, weatherContext),
        schema: AdvisorySchema,
        temperature: 0.25,
        // Richer schema: 3+ recommendations × varieties × economics + 2–3
        // strategies + caveats. Reach for the env cap (4500) — clamped further
        // inside callGroq, but we ask for headroom so the schema's min=3 is
        // achievable.
        maxTokens: 4500,
      });

      if (!result.ok) {
        return reply.status(result.reason === 'upstream_auth_failed' ? 503 : 502).send({
          ok: false,
          reason: result.reason,
        });
      }

      trackUsage('advisory', result.usage);
      llmCache.set(key, result.data, ttl.oneDay);

      return reply.status(200).send({ ok: true, data: result.data, cached: false });
    } finally {
      endActive('advisory');
    }
  });
}

/** Best-effort weather context for LLM grounding. Silent on failure. */
async function weatherContextFor(location: string): Promise<string | undefined> {
  try {
    const geo = await geocode(location, 1);
    const hit = geo[0];
    if (!hit) return undefined;
    const [c, f] = await Promise.all([
      getCurrentWeather({ lat: hit.lat, lon: hit.lon, units: 'metric', lang: 'en' }),
      getForecast({ lat: hit.lat, lon: hit.lon, units: 'metric', lang: 'en' }),
    ]);
    const next5Rain = f.days.reduce((acc, d) => acc + d.precipitation_mm, 0);
    const maxTemp = Math.max(...f.days.map((d) => d.temp_max_c));
    return `Currently ${c.current.temp_c}°C, ${c.current.condition.description}. Next 5 days: total rainfall ~${next5Rain.toFixed(0)}mm, peak temp ~${maxTemp}°C.`;
  } catch {
    return undefined;
  }
}
