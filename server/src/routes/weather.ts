import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { cache } from '../lib/cache.js';
import { UpstreamError, statusForReason } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import {
  geocode,
  getCurrentWeather,
  getForecast,
  isUpstreamReachable,
} from '../services/openweather.js';
import { deriveAlerts } from '../services/alerts.js';

const Coords = z.object({
  lat: z
    .string()
    .transform((v) => Number(v))
    .pipe(z.number().min(-90).max(90)),
  lon: z
    .string()
    .transform((v) => Number(v))
    .pipe(z.number().min(-180).max(180)),
  units: z.enum(['metric', 'imperial', 'standard']).optional().default('metric'),
  lang: z.enum(['en', 'hi', 'kn', 'ta', 'te', 'mr']).optional().default('en'),
});

const GeocodeQuery = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 5))
    .pipe(z.number().int().min(1).max(10)),
});

export async function registerWeatherRoutes(app: FastifyInstance) {
  app.get('/api/weather/health', async () => {
    const reachable = await isUpstreamReachable();
    return {
      ok: true,
      upstream: reachable ? 'reachable' : 'unreachable',
      cached_keys: cache.keys().length,
    };
  });

  app.get('/api/weather/current', async (req, reply) => {
    const parsed = Coords.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, reason: 'invalid_query', details: parsed.error.flatten().fieldErrors });
    }
    try {
      const data = await getCurrentWeather(parsed.data);
      return data;
    } catch (err) {
      return handleUpstream(err, reply);
    }
  });

  app.get('/api/weather/forecast', async (req, reply) => {
    const parsed = Coords.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, reason: 'invalid_query', details: parsed.error.flatten().fieldErrors });
    }
    try {
      const data = await getForecast(parsed.data);
      return data;
    } catch (err) {
      return handleUpstream(err, reply);
    }
  });

  app.get('/api/weather/alerts', async (req, reply) => {
    const parsed = Coords.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, reason: 'invalid_query', details: parsed.error.flatten().fieldErrors });
    }
    try {
      const forecast = await getForecast(parsed.data);
      const alerts = deriveAlerts(forecast, parsed.data.lang);
      return {
        location: forecast.location,
        alerts,
        source: 'openweathermap' as const,
        cached: forecast.cached,
        stale: forecast.stale,
      };
    } catch (err) {
      return handleUpstream(err, reply);
    }
  });

  app.get('/api/geocode', async (req, reply) => {
    const parsed = GeocodeQuery.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, reason: 'invalid_query', details: parsed.error.flatten().fieldErrors });
    }
    try {
      const results = await geocode(parsed.data.q, parsed.data.limit);
      return { results, source: 'openweathermap' as const };
    } catch (err) {
      return handleUpstream(err, reply);
    }
  });
}

function handleUpstream(err: unknown, reply: import('fastify').FastifyReply) {
  if (err instanceof UpstreamError) {
    return reply.status(statusForReason(err.reason)).send({ ok: false, reason: err.reason });
  }
  logger.error({ err: (err as Error).message }, 'unhandled weather route error');
  return reply.status(500).send({ ok: false, reason: 'internal_error' });
}
