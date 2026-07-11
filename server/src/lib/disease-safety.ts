// Defense-in-depth safety gates for the leaf-disease diagnosis output.
//
// Even if the system prompt is ignored, the schema validates a dangerous
// payload, or the model hallucinates, this pass sanitizes the result before it
// reaches a farmer. It mirrors the safety rules in the disease system prompt so
// that a single failure — prompt drift, schema gap, or model error — cannot slip
// a chemical recommendation past the confidence threshold.
//
// Kept as a standalone, pure function (no I/O) so it is trivially unit-testable
// and reusable independently of the HTTP route.

import { DiseaseSchema, type DiseaseOutput } from '../prompts/disease.js';

/** Confidence at or above which a specific synthetic chemical may be named. */
export const SYNTHETIC_CHEMICAL_CONFIDENCE_THRESHOLD = 0.7;

/** Minimum PPE that must accompany any recommended synthetic chemical. */
export const REQUIRED_PPE = ['gloves', 'mask', 'full-sleeve clothing'] as const;

/** Diagnosis names that must never carry a treatment recommendation. */
const NON_ACTIONABLE_NAMES = new Set(['not_a_leaf', 'healthy', 'uncertain']);

/** Map a numeric confidence to its label band. Single source of truth so the
 * UI's colour gating can never disagree with the threshold gates below. */
export function confidenceLabelFor(
  confidence: number,
): DiseaseOutput['primary_diagnosis']['confidence_label'] {
  if (confidence >= 0.9) return 'very_high';
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.55) return 'moderate';
  if (confidence >= 0.35) return 'low';
  return 'uncertain';
}

export function enforceDiseaseSafetyGates(raw: unknown): DiseaseOutput {
  // Re-parse through the schema so defaults are applied and the type narrows
  // from the loose `unknown` we get out of callGroqVision (whose generic uses
  // z.input, not z.output).
  const out: DiseaseOutput = DiseaseSchema.parse(raw);
  const conf = out.primary_diagnosis.confidence;
  const sc = out.treatment.synthetic_chemical;

  // Sync confidence_label to the band of the numeric confidence.
  out.primary_diagnosis.confidence_label = confidenceLabelFor(conf);

  // KVK consultation flag is non-negotiable.
  sc.kvk_consultation_required = true;

  // Below the synthetic-chemical threshold: scrub all specific guidance.
  if (conf < SYNTHETIC_CHEMICAL_CONFIDENCE_THRESHOLD || out.severity === 'unable_to_assess') {
    sc.recommended = false;
    sc.product_class = null;
    sc.indian_examples = [];
    sc.typical_concentration = null;
    sc.application_method = null;
    if (!sc.kvk_consultation_reasoning || sc.kvk_consultation_reasoning.length < 5) {
      sc.kvk_consultation_reasoning =
        'Confidence in this diagnosis is below the threshold for chemical recommendations. Please consult your KVK or agriculture officer for a specific treatment plan.';
    }
  } else if (sc.recommended) {
    // Above threshold and recommended: ensure the PPE minimum is present.
    const have = new Set(sc.ppe_required.map((p) => p.toLowerCase()));
    for (const required of REQUIRED_PPE) {
      if (!Array.from(have).some((h) => h.includes(required))) {
        sc.ppe_required.push(required);
      }
    }
  }

  // If the model answered "not_a_leaf", "healthy", or "uncertain", make sure no
  // treatment sneaks through.
  const name = out.primary_diagnosis.common_name.toLowerCase();
  if (NON_ACTIONABLE_NAMES.has(name)) {
    out.treatment.safe_to_recommend = false;
    sc.recommended = false;
    sc.product_class = null;
    sc.indian_examples = [];
    sc.typical_concentration = null;
    sc.application_method = null;
  }

  return out;
}
