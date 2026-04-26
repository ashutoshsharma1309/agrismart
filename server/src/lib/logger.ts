import pino from 'pino';
import { config } from '../config.js';

export const logger = pino({
  level: config.LOG_LEVEL,
  base: { service: 'agrismart-server' },
  // Never log the API key. Redact aggressively.
  redact: {
    paths: [
      'req.headers.authorization',
      'appid',
      'apiKey',
      'OPENWEATHER_API_KEY',
      '*.appid',
    ],
    remove: true,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
