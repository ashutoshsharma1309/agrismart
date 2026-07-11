import { describe, it, expect } from 'vitest';
import { analyseSoil } from './soil-baseline.js';
import type { SoilInput } from '../prompts/soil.js';

function baseInput(overrides: Partial<SoilInput> = {}): SoilInput {
  return {
    nitrogen_kg_ha: 60,
    phosphorus_kg_ha: 40,
    potassium_kg_ha: 50,
    ph: 6.8,
    organic_carbon_pct: 0.5,
    intended_crop: 'Wheat',
    lang: 'en',
    ...overrides,
  };
}

describe('analyseSoil healthScore', () => {
  it('is an integer within 0..100 across a range of inputs', () => {
    const inputs = [
      baseInput(),
      baseInput({ nitrogen_kg_ha: 0, phosphorus_kg_ha: 0, potassium_kg_ha: 0, ph: 3, organic_carbon_pct: 0 }),
      baseInput({ nitrogen_kg_ha: 500, phosphorus_kg_ha: 500, potassium_kg_ha: 500, ph: 7, organic_carbon_pct: 30 }),
      baseInput({ nitrogen_kg_ha: 80, phosphorus_kg_ha: 60, potassium_kg_ha: 80, ph: 6.75, organic_carbon_pct: 1 }),
    ];
    for (const input of inputs) {
      const { healthScore } = analyseSoil(input);
      expect(Number.isInteger(healthScore)).toBe(true);
      expect(healthScore).toBeGreaterThanOrEqual(0);
      expect(healthScore).toBeLessThanOrEqual(100);
    }
  });

  it('gives a perfect score for ideal nutrients/pH/carbon', () => {
    // All component scores saturate to 1 -> 100.
    const { healthScore } = analyseSoil(
      baseInput({ nitrogen_kg_ha: 80, phosphorus_kg_ha: 60, potassium_kg_ha: 80, ph: 6.75, organic_carbon_pct: 1 }),
    );
    expect(healthScore).toBe(100);
  });
});

describe('fertilizer selection', () => {
  it('selects the Vermicompost/Azolla path when nitrogen is low (<40)', () => {
    const r = analyseSoil(baseInput({ nitrogen_kg_ha: 30, organic_carbon_pct: 0.9 }));
    // Low-N branch wins even over high organic carbon (checked first).
    expect(r.fertilizer.name).toContain('Vermicompost');
    expect(r.fertilizer.name).toContain('Azolla');
  });

  it('selects the farmyard-manure path when organic carbon is high (>0.75) and N is adequate', () => {
    const r = analyseSoil(baseInput({ nitrogen_kg_ha: 60, organic_carbon_pct: 0.8 }));
    expect(r.fertilizer.name).toContain('farmyard manure');
  });

  it('appends the lime note to the rationale for acidic soil (pH < 6.0)', () => {
    const r = analyseSoil(baseInput({ ph: 5.5 }));
    expect(r.fertilizer.rationale).toMatch(/lime/i);
    expect(r.fertilizer.rationale).not.toMatch(/gypsum/i);
  });

  it('appends the gypsum note to the rationale for alkaline soil (pH > 7.8)', () => {
    const r = analyseSoil(baseInput({ ph: 8.0 }));
    expect(r.fertilizer.rationale).toMatch(/gypsum/i);
    expect(r.fertilizer.rationale).not.toMatch(/agricultural lime/i);
  });
});

describe('pesticide swap', () => {
  it('maps a chlorpyrifos input to the neem-oil swap', () => {
    const r = analyseSoil(baseInput({ intended_pesticide: 'Chlorpyrifos 20% EC' }));
    expect(r.pesticide.name).toContain('Neem oil');
  });

  it('falls back to the IPM kit for an unknown pesticide', () => {
    const r = analyseSoil(baseInput({ intended_pesticide: 'some-unheard-of-brand' }));
    expect(r.pesticide.name).toContain('Integrated Pest Management');
  });

  it('falls back to the IPM kit when no pesticide is provided', () => {
    const r = analyseSoil(baseInput());
    expect(r.pesticide.name).toContain('Integrated Pest Management');
  });
});

describe('improvement plan', () => {
  it('has exactly 3 steps with ascending step numbers 1..3', () => {
    const r = analyseSoil(baseInput());
    expect(r.plan).toHaveLength(3);
    expect(r.plan.map((s) => s.step)).toEqual([1, 2, 3]);
    for (const step of r.plan) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
    }
  });
});
