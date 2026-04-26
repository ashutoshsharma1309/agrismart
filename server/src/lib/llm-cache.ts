import NodeCache from 'node-cache';
import { createHash } from 'node:crypto';

// Separate cache for LLM outputs. Long-lived entries (7 days for disease scans).
const HOUR = 60 * 60;
export const llmCache = new NodeCache({
  stdTTL: 24 * HOUR,
  checkperiod: 10 * 60,
  useClones: false,
});

export function llmCacheKey(feature: string, parts: (string | number | undefined)[]) {
  return `groq:${feature}:${parts.filter((p) => p !== undefined).join(':').toLowerCase()}`;
}

export function sha256(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

/** TTL helpers for readability. */
export const ttl = {
  oneHour: HOUR,
  oneDay: 24 * HOUR,
  sevenDays: 7 * 24 * HOUR,
};
