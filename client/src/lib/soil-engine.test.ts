import { describe, it, expect } from 'vitest';
import { analyseSoil, type SoilInput } from './soil-engine';

const balanced: SoilInput = { n: 60, p: 40, k: 60, ph: 6.8, organicCarbon: 0.6 };

describe('analyseSoil', () => {
  it('returns an integer health score in 0..100', () => {
    const { healthScore } = analyseSoil(balanced);
    expect(Number.isInteger(healthScore)).toBe(true);
    expect(healthScore).toBeGreaterThanOrEqual(0);
    expect(healthScore).toBeLessThanOrEqual(100);
  });

  it('scores a well-balanced soil highly and a depleted soil poorly', () => {
    const good = analyseSoil(balanced).healthScore;
    const poor = analyseSoil({ n: 5, p: 3, k: 4, ph: 4.5, organicCarbon: 0.05 }).healthScore;
    expect(good).toBeGreaterThan(poor);
    expect(poor).toBeLessThan(40);
  });

  it('recommends nitrogen-fixing inputs when nitrogen is low', () => {
    const { fertilizer } = analyseSoil({ ...balanced, n: 20 });
    expect(fertilizer.name).toMatch(/Azolla|Vermicompost/i);
  });

  it('appends a lime note for acidic soil and a gypsum note for alkaline soil', () => {
    expect(analyseSoil({ ...balanced, ph: 5.2 }).fertilizer.rationale).toMatch(/lime/i);
    expect(analyseSoil({ ...balanced, ph: 8.2 }).fertilizer.rationale).toMatch(/gypsum/i);
  });

  it('swaps a hazardous pesticide for a safer alternative', () => {
    const { pesticide } = analyseSoil({ ...balanced, pesticide: 'Chlorpyrifos 20 EC' });
    expect(pesticide.name).toMatch(/neem/i);
  });

  it('falls back to IPM when no risky pesticide is named', () => {
    expect(analyseSoil(balanced).pesticide.name).toMatch(/IPM/i);
  });

  it('always produces a 3-step plan with ascending steps', () => {
    const { plan } = analyseSoil(balanced);
    expect(plan).toHaveLength(3);
    expect(plan.map((p) => p.step)).toEqual([1, 2, 3]);
  });
});
