import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config, isGroqConfigured, isPlaceholderKey } from './config.js';
import { logger } from './lib/logger.js';
import { registerWeatherRoutes } from './routes/weather.js';
import { registerChatRoutes } from './routes/chat.js';
import { registerAdvisoryRoutes } from './routes/advisory.js';
import { registerSoilRoutes } from './routes/soil.js';
import { registerDiseaseRoutes } from './routes/disease.js';
import { registerAdminRoutes } from './routes/admin.js';

async function main() {
  const app = Fastify({
    loggerInstance: logger,
    // Big-enough body limit for base64 disease uploads (4MB image + JSON overhead).
    bodyLimit: 6 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: config.ALLOWED_ORIGIN.split(',').map((s) => s.trim()),
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
    credentials: false,
  });

  // Global safety net: 60 req/IP/min across all routes.
  await app.register(rateLimit, {
    global: true,
    max: 60,
    timeWindow: '1 minute',
  });

  // Stricter 30 req/IP/min for weather + geocode routes.
  app.register(
    async (scope) => {
      await scope.register(rateLimit, {
        max: 30,
        timeWindow: '1 minute',
        keyGenerator: (req) => req.ip,
      });
      await registerWeatherRoutes(scope);
    },
    { prefix: '' },
  );

  // AI routes: the service-layer has per-user/per-IP/hour limits.
  // Fastify rate-limit gives us a minute-level safety net on top.
  app.register(
    async (scope) => {
      await scope.register(rateLimit, {
        max: 30,
        timeWindow: '1 minute',
        keyGenerator: (req) => req.ip,
      });
      await registerChatRoutes(scope);
      await registerAdvisoryRoutes(scope);
      await registerSoilRoutes(scope);
      await registerDiseaseRoutes(scope);
    },
    { prefix: '' },
  );

  await app.register(async (scope) => {
    await registerAdminRoutes(scope);
  });

  app.get('/api/health', async () => ({
    ok: true,
    uptime_s: Math.round(process.uptime()),
    weather_configured: !isPlaceholderKey,
    groq_configured: isGroqConfigured,
  }));

  app.get('/', async () => ({
    name: 'agrismart-server',
    routes: [
      '/api/health',
      '/api/weather/health',
      '/api/weather/current',
      '/api/weather/forecast',
      '/api/weather/alerts',
      '/api/geocode',
      '/api/chat/message',
      '/api/advisory/generate',
      '/api/soil/analyze',
      '/api/disease/analyze',
      '/api/admin/usage',
    ],
    groq_configured: isGroqConfigured,
  }));

  if (isPlaceholderKey) {
    logger.warn(
      'OPENWEATHER_API_KEY is still the placeholder. Weather upstream calls will fail.',
    );
  }
  if (!isGroqConfigured) {
    logger.warn(
      'GROQ_API_KEY is not configured. AI features will return 503 and the client will fall back to rule-based responses.',
    );
  }

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.info({ port: config.PORT, allowed_origin: config.ALLOWED_ORIGIN }, 'server ready');
  } catch (err) {
    logger.error(err, 'failed to start');
    process.exit(1);
  }

  // Graceful shutdown: drain in-flight requests, then exit cleanly.
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      logger.error(err, 'error during shutdown');
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

// Crash safety nets. Log via the structured logger; never silently die.
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandledRejection');
});
process.on('uncaughtException', (err) => {
  logger.error(err, 'uncaughtException');
  process.exit(1);
});

void main();
