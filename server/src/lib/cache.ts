import NodeCache from 'node-cache';
import { config } from '../config.js';

// Primary cache — fresh values within TTL.
export const cache = new NodeCache({
  stdTTL: config.CACHE_TTL_SECONDS,
  checkperiod: 60,
  useClones: false,
});

// Stale cache — we keep entries up to 6 hours for graceful degradation
// when the upstream is unavailable or rate-limited.
const STALE_TTL = 6 * 60 * 60;
export const staleCache = new NodeCache({
  stdTTL: STALE_TTL,
  checkperiod: 300,
  useClones: false,
});

export function cacheKey(
  endpoint: string,
  lat: number,
  lon: number,
  units: string,
  lang: string,
) {
  return `${endpoint}:${lat.toFixed(2)},${lon.toFixed(2)}:${units}:${lang}`;
}

export function storeBoth<T>(key: string, value: T) {
  cache.set(key, value);
  staleCache.set(key, value);
}
