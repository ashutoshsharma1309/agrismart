import { logger } from './logger.js';

// Back-of-envelope per-million-token prices for budgeting. These are rough —
// the point is to watch the trend, not to replace billing.
// Update when Groq prices change: https://groq.com/pricing
const PRICE_PER_M_TOKENS: Record<string, number> = {
  'llama-3.3-70b-versatile': 0.59, // blended in/out approximation
  'llama-3.2-90b-vision-preview': 0.9,
  default: 0.6,
};

type Tally = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  calls: number;
  estimated_cost_usd: number;
};

const byModel = new Map<string, Tally>();
let totalCalls = 0;
const startedAt = Date.now();

export function trackUsage(feature: string, usage: {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  model: string;
}) {
  const price = PRICE_PER_M_TOKENS[usage.model] ?? PRICE_PER_M_TOKENS.default;
  const cost = (usage.total_tokens / 1_000_000) * price;

  const existing = byModel.get(usage.model) ?? {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    calls: 0,
    estimated_cost_usd: 0,
  };
  existing.prompt_tokens += usage.prompt_tokens;
  existing.completion_tokens += usage.completion_tokens;
  existing.total_tokens += usage.total_tokens;
  existing.calls += 1;
  existing.estimated_cost_usd += cost;
  byModel.set(usage.model, existing);
  totalCalls += 1;

  logger.info(
    {
      feature,
      model: usage.model,
      tokens: usage.total_tokens,
      estimated_cost_usd: Number(cost.toFixed(6)),
    },
    'usage tracked',
  );
}

export function usageSnapshot() {
  const totals = Array.from(byModel.entries()).map(([model, tally]) => ({ model, ...tally }));
  const total_cost_usd = totals.reduce((acc, t) => acc + t.estimated_cost_usd, 0);
  return {
    started_at_iso: new Date(startedAt).toISOString(),
    uptime_seconds: Math.round((Date.now() - startedAt) / 1000),
    total_calls: totalCalls,
    total_cost_usd: Number(total_cost_usd.toFixed(4)),
    by_model: totals,
  };
}
