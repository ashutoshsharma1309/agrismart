import NodeCache from 'node-cache';

// Per-user and per-IP rolling counters with hourly window.
const userCounter = new NodeCache({ stdTTL: 60 * 60, checkperiod: 5 * 60, useClones: false });
const ipCounter = new NodeCache({ stdTTL: 60 * 60, checkperiod: 5 * 60, useClones: false });

// Global concurrency gate: active LLM calls across all users.
const activeByEndpoint = new Map<string, number>();

export type AiLimitDecision =
  | { allowed: true }
  | { allowed: false; reason: 'user_rate_limited' | 'ip_rate_limited' | 'server_busy' };

const USER_LIMIT_PER_HOUR = 60;
const IP_LIMIT_PER_HOUR = 120;
const MAX_CONCURRENT_PER_ENDPOINT = 20;

// Chatbot conversations are legitimately longer-running than form submissions,
// so it gets a higher per-user-hour budget. All other endpoints fall through to
// USER_LIMIT_PER_HOUR.
const PER_ENDPOINT_USER_LIMIT: Record<string, number> = {
  chat: 100,
};

export function identityFromReq(req: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}): { userId: string | null; ip: string } {
  const header = req.headers['x-user-id'];
  const userId = typeof header === 'string' && header.trim() ? header.trim().slice(0, 200) : null;
  return { userId, ip: req.ip ?? 'unknown' };
}

export function checkAiLimits(
  endpoint: string,
  identity: { userId: string | null; ip: string },
): AiLimitDecision {
  const active = activeByEndpoint.get(endpoint) ?? 0;
  if (active >= MAX_CONCURRENT_PER_ENDPOINT) {
    return { allowed: false, reason: 'server_busy' };
  }
  if (identity.userId) {
    const userLimit = PER_ENDPOINT_USER_LIMIT[endpoint] ?? USER_LIMIT_PER_HOUR;
    // Counter is keyed per-endpoint so chat's higher allowance doesn't bleed
    // into the lower-budget endpoints' counts.
    const userKey = `${endpoint}:${identity.userId}`;
    const count = (userCounter.get<number>(userKey) ?? 0) + 1;
    if (count > userLimit) {
      return { allowed: false, reason: 'user_rate_limited' };
    }
    userCounter.set(userKey, count);
  }
  const ipCount = (ipCounter.get<number>(identity.ip) ?? 0) + 1;
  if (ipCount > IP_LIMIT_PER_HOUR) {
    return { allowed: false, reason: 'ip_rate_limited' };
  }
  ipCounter.set(identity.ip, ipCount);
  return { allowed: true };
}

export function beginActive(endpoint: string) {
  activeByEndpoint.set(endpoint, (activeByEndpoint.get(endpoint) ?? 0) + 1);
}
export function endActive(endpoint: string) {
  const next = (activeByEndpoint.get(endpoint) ?? 1) - 1;
  if (next <= 0) activeByEndpoint.delete(endpoint);
  else activeByEndpoint.set(endpoint, next);
}
