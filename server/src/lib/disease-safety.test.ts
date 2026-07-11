import { describe, it, expect } from 'vitest';
import {
  enforceDiseaseSafetyGates,
  confidenceLabelFor,
  SYNTHETIC_CHEMICAL_CONFIDENCE_THRESHOLD,
  REQUIRED_PPE,
} from './disease-safety.js';

// A minimal, valid-ish raw model output. The schema fills the rest via defaults,
// so tests only specify the fields under test. `as` keeps the fixtures terse
// while still exercising the real DiseaseSchema.parse() inside the gate.
function rawDiagnosis(overrides: Record<string, unknown> = {}) {
  return {
    primary_diagnosis: {
      common_name: 'Early blight',
      confidence: 0.85,
      confidence_label: 'very_high',
      ...(overrides.primary_diagnosis as object),
    },
    is_diseased: true,
    severity: 'moderate',
    treatment: {
      synthetic_chemical: {
        recommended: true,
        product_class: 'Triazole fungicide',
        indian_examples: ['SomeBrand 25EC'],
        typical_concentration: '0.2–0.3% solution',
        application_method: 'Foliar spray',
        ppe_required: [],
        kvk_consultation_required: false,
        kvk_consultation_reasoning: '',
        ...((overrides.treatment as Record<string, unknown>)?.synthetic_chemical as object),
      },
    },
    image_quality: { is_leaf: true },
    ...overrides,
  };
}

describe('confidenceLabelFor', () => {
  it('maps numeric confidence to the correct band', () => {
    expect(confidenceLabelFor(0.95)).toBe('very_high');
    expect(confidenceLabelFor(0.8)).toBe('high');
    expect(confidenceLabelFor(0.6)).toBe('moderate');
    expect(confidenceLabelFor(0.4)).toBe('low');
    expect(confidenceLabelFor(0.2)).toBe('uncertain');
  });

  it('is consistent at the exact band boundaries', () => {
    expect(confidenceLabelFor(0.9)).toBe('very_high');
    expect(confidenceLabelFor(0.75)).toBe('high');
    expect(confidenceLabelFor(0.55)).toBe('moderate');
    expect(confidenceLabelFor(0.35)).toBe('low');
  });
});

describe('enforceDiseaseSafetyGates', () => {
  it('always forces KVK consultation, even when a chemical is recommended', () => {
    const out = enforceDiseaseSafetyGates(rawDiagnosis());
    expect(out.treatment.synthetic_chemical.kvk_consultation_required).toBe(true);
  });

  it('syncs confidence_label to the numeric confidence band', () => {
    const out = enforceDiseaseSafetyGates(
      rawDiagnosis({ primary_diagnosis: { common_name: 'X', confidence: 0.6, confidence_label: 'very_high' } }),
    );
    expect(out.primary_diagnosis.confidence_label).toBe('moderate');
  });

  it('scrubs all synthetic-chemical specifics below the confidence threshold', () => {
    const out = enforceDiseaseSafetyGates(
      rawDiagnosis({
        primary_diagnosis: { common_name: 'X', confidence: 0.5, confidence_label: 'low' },
      }),
    );
    const sc = out.treatment.synthetic_chemical;
    expect(sc.recommended).toBe(false);
    expect(sc.product_class).toBeNull();
    expect(sc.indian_examples).toEqual([]);
    expect(sc.typical_concentration).toBeNull();
    expect(sc.application_method).toBeNull();
    expect(sc.kvk_consultation_reasoning.length).toBeGreaterThan(5);
  });

  it('scrubs specifics when severity is unable_to_assess even at high confidence', () => {
    const out = enforceDiseaseSafetyGates(
      rawDiagnosis({ severity: 'unable_to_assess', primary_diagnosis: { common_name: 'X', confidence: 0.95, confidence_label: 'very_high' } }),
    );
    expect(out.treatment.synthetic_chemical.recommended).toBe(false);
    expect(out.treatment.synthetic_chemical.product_class).toBeNull();
  });

  it('enforces the PPE minimum when a chemical is recommended above threshold', () => {
    const out = enforceDiseaseSafetyGates(rawDiagnosis());
    const ppe = out.treatment.synthetic_chemical.ppe_required.map((p) => p.toLowerCase());
    for (const required of REQUIRED_PPE) {
      expect(ppe.some((p) => p.includes(required))).toBe(true);
    }
  });

  it('does not duplicate PPE that is already present (as a substring)', () => {
    const out = enforceDiseaseSafetyGates(
      rawDiagnosis({
        treatment: { synthetic_chemical: { ppe_required: ['rubber gloves', 'N95 mask', 'full-sleeve clothing'] } },
      }),
    );
    const gloves = out.treatment.synthetic_chemical.ppe_required.filter((p) => p.toLowerCase().includes('gloves'));
    expect(gloves).toHaveLength(1);
  });

  it('blocks all treatment for a non-leaf image', () => {
    const out = enforceDiseaseSafetyGates(
      rawDiagnosis({
        primary_diagnosis: { common_name: 'not_a_leaf', confidence: 0.99, confidence_label: 'very_high' },
      }),
    );
    expect(out.treatment.safe_to_recommend).toBe(false);
    expect(out.treatment.synthetic_chemical.recommended).toBe(false);
    expect(out.treatment.synthetic_chemical.indian_examples).toEqual([]);
  });

  it('blocks treatment for a healthy leaf', () => {
    const out = enforceDiseaseSafetyGates(
      rawDiagnosis({
        primary_diagnosis: { common_name: 'healthy', confidence: 0.9, confidence_label: 'very_high' },
        is_diseased: false,
      }),
    );
    expect(out.treatment.safe_to_recommend).toBe(false);
    expect(out.treatment.synthetic_chemical.recommended).toBe(false);
  });

  it('permits a recommendation exactly at the threshold', () => {
    const out = enforceDiseaseSafetyGates(
      rawDiagnosis({
        primary_diagnosis: {
          common_name: 'Early blight',
          confidence: SYNTHETIC_CHEMICAL_CONFIDENCE_THRESHOLD,
          confidence_label: 'moderate',
        },
      }),
    );
    // At exactly 0.7 the guard (`conf < 0.7`) is false, so a recommendation survives.
    expect(out.treatment.synthetic_chemical.recommended).toBe(true);
  });
});
