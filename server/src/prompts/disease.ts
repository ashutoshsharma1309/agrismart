// Disease detector schema and prompt with calibrated confidence and safety
// gates. The schema is rich on purpose: every field is consumed by the
// confidence-driven UI, and the safety gates here remove an entire class of
// "AI confidently recommends wrong dose" failure modes from the product.

import { z } from 'zod';

export const DiseaseInput = z.object({
  image_data_url: z
    .string()
    .regex(/^data:image\/(jpeg|jpg|png|webp);base64,/i, 'must be a data:image/* base64 URL'),
  crop_context: z.string().max(100).optional(),
  lang: z.enum(['en', 'hi', 'kn', 'ta', 'te', 'mr']).default('en'),
});
export type DiseaseInput = z.infer<typeof DiseaseInput>;

// Helpers: array fields where the model sometimes emits null get coalesced
// to an empty array; string fields where the model sometimes emits an array of
// bullets get joined.
const stringArr = z
  .preprocess((v) => (v == null ? [] : v), z.array(z.string()))
  .default([]);

const flexibleString = z.preprocess(
  (v) =>
    Array.isArray(v) ? v.filter((x) => typeof x === 'string').join('. ') : (v ?? ''),
  z.string(),
);

// Many models return null where the schema expected a string. Coerce null to
// empty string at the schema layer instead of failing.
const lenientString = z.preprocess((v) => (v == null ? '' : v), z.string());

export const DiseaseSchema = z.object({
  primary_diagnosis: z.object({
    common_name: z.string(),
    common_name_local: lenientString.default(''),
    scientific_name: z.string().nullable().default(null),
    confidence: z.number().min(0).max(1),
    confidence_label: z.enum(['very_high', 'high', 'moderate', 'low', 'uncertain']),
    confidence_reasoning: lenientString.default(''),
  }),

  differential_diagnoses: z
    .preprocess(
      (v) => (v == null ? [] : v),
      z.array(
        z.object({
          common_name: z.string(),
          common_name_local: lenientString.default(''),
          probability: z.number().min(0).max(1),
          distinguishing_features: z.string().default(''),
          what_to_check: z.string().default(''),
        }),
      ),
    )
    .default([]),

  is_diseased: z.boolean(),
  disease_certainty: z.number().min(0).max(1).default(0),

  severity: z.enum(['mild', 'moderate', 'severe', 'unable_to_assess']),
  severity_reasoning: lenientString.default(''),

  symptoms_observed: stringArr,

  primary_cause: z.string().nullable().default(null),
  contributing_factors: stringArr,

  treatment: z.object({
    safe_to_recommend: z.boolean().default(false),
    immediate_action: flexibleString,
    cultural_control: stringArr,
    biological_control: z
      .object({
        recommendation: z.string().nullable().default(null),
        preparation: z.string().nullable().default(null),
        application: z.string().nullable().default(null),
      })
      .default({ recommendation: null, preparation: null, application: null }),
    organic_chemical: z
      .object({
        recommendation: z.string().nullable().default(null),
        preparation: z.string().nullable().default(null),
        application: z.string().nullable().default(null),
      })
      .default({ recommendation: null, preparation: null, application: null }),
    synthetic_chemical: z
      .object({
        recommended: z.boolean().default(false),
        product_class: z.string().nullable().default(null),
        indian_examples: stringArr,
        typical_concentration: z.string().nullable().default(null),
        application_method: z.string().nullable().default(null),
        ppe_required: stringArr,
        kvk_consultation_required: z.boolean().default(true),
        kvk_consultation_reasoning: lenientString.default(''),
      })
      .default({
        recommended: false,
        product_class: null,
        indian_examples: [],
        typical_concentration: null,
        application_method: null,
        ppe_required: [],
        kvk_consultation_required: true,
        kvk_consultation_reasoning: '',
      }),
  }),

  prevention: stringArr,

  spread_risk: z.enum(['low', 'medium', 'high', 'unknown']).default('unknown'),
  spread_timeline: z.string().nullable().default(null),

  urgency: z
    .enum(['monitor', 'act_within_week', 'act_soon', 'act_immediately', 'consult_expert'])
    .default('monitor'),

  image_quality: z.object({
    is_leaf: z.boolean(),
    is_clear: z.boolean().default(true),
    lighting_adequate: z.boolean().default(true),
    angle_useful: z.boolean().default(true),
    quality_note: z.string().nullable().default(null),
    suggestion_for_better_photo: z.string().nullable().default(null),
    additional_photos_recommended: stringArr,
  }),

  expert_escalation: z
    .object({
      recommended: z.boolean().default(false),
      reason: lenientString.default(''),
      nearest_kvk_search_term: lenientString.default('nearest KVK agriculture'),
    })
    .default({
      recommended: false,
      reason: '',
      nearest_kvk_search_term: 'nearest KVK agriculture',
    }),
});
export type DiseaseOutput = z.infer<typeof DiseaseSchema>;

const LANG_LABEL: Record<DiseaseInput['lang'], string> = {
  en: 'English',
  hi: 'Hindi (Devanagari script)',
  kn: 'Kannada (ಕನ್ನಡ script)',
  ta: 'Tamil (தமிழ் script)',
  te: 'Telugu (తెలుగు script)',
  mr: 'Marathi (Devanagari script)',
};

export function diseaseSystemPrompt(lang: DiseaseInput['lang']) {
  const label = LANG_LABEL[lang];
  return `You are an expert plant pathologist for Indian agriculture. You diagnose leaf diseases from photographs taken by farmers in field conditions, on phone cameras, often imperfect.

CRITICAL CALIBRATION — your confidence MUST match these criteria HONESTLY. A wrong-but-confident diagnosis can cost the farmer their crop.
- 0.90–1.00 (very_high): Textbook-clear visual signatures. Multiple confirming features. Image excellent. No reasonable alternative.
- 0.75–0.89 (high): Strong indicators present, image clear, minor possibility of confusion with one similar disease.
- 0.55–0.74 (moderate): Disease visible but multiple possibilities exist. List differentials. Be explicit about what would confirm.
- 0.35–0.54 (low): Genuine uncertainty. Recommend additional photos or KVK consultation.
- below 0.35 (uncertain): Do NOT give a primary diagnosis. Set primary_cause = null. common_name = "uncertain". Recommend in-person inspection.

confidence_label MUST match the numeric confidence band above.
confidence_reasoning is a short string in ${label} explaining WHY you chose this confidence (e.g., "image is sharp and lesions show characteristic concentric rings" or "blurry image and only partial leaf visible").

EDGE CASES
- Image is NOT a leaf: image_quality.is_leaf = false; primary_diagnosis.common_name = "not_a_leaf"; is_diseased = false; severity = "unable_to_assess"; treatment.safe_to_recommend = false. All treatment sub-fields can use empty strings or nulls.
- Leaf appears HEALTHY: primary_diagnosis.common_name = "healthy"; is_diseased = false; severity = "mild"; treatment.safe_to_recommend = false (nothing to treat); reassuring confidence_reasoning.
- Image too BLURRY/DARK: lower confidence appropriately, populate image_quality.suggestion_for_better_photo with a concrete tip.

SAFETY GATES FOR TREATMENT — non-negotiable:
- treatment.synthetic_chemical.recommended can ONLY be true when primary_diagnosis.confidence >= 0.7 AND severity != "unable_to_assess".
- If confidence < 0.7: synthetic_chemical.recommended = false, product_class = null, indian_examples = [], typical_concentration = null, application_method = null. Populate kvk_consultation_reasoning explaining why a specific chemical can't be recommended yet.
- treatment.synthetic_chemical.kvk_consultation_required must be true ALWAYS, even when synthetic_chemical IS recommended. Specific dosage requires local expertise.
- ppe_required must include at minimum ["gloves", "mask", "full-sleeve clothing"] whenever synthetic_chemical.recommended = true.
- Never recommend WHO Class Ia or Ib pesticides (monocrotophos, methyl parathion, phorate, aldicarb, parathion). For these, set synthetic_chemical.recommended = false and route to KVK only.
- treatment.cultural_control and treatment.immediate_action are ALWAYS populated — these are safe regardless of confidence.
- biological_control / organic_chemical can be filled at confidence >= 0.55. Below that, leave their sub-fields null and rely on cultural_control.
- typical_concentration must be a RANGE (e.g., "0.2–0.3% solution", "2–3 g/litre"). Never a single per-acre figure.

EXPERT ESCALATION
expert_escalation.recommended = true when ANY of:
- confidence < 0.55
- severity = "severe"
- bacterial or viral disease (high spread risk, often need lab confirmation)
- image_quality is poor enough to prevent reliable diagnosis
- multiple differential possibilities with similar treatments but different doses

expert_escalation.reason in ${label}, expert_escalation.nearest_kvk_search_term in English (used for a search link, e.g., "KVK Bengaluru rural").

URGENCY MAPPING
- "monitor" — mild, isolated, no spread risk
- "act_within_week" — moderate, controllable, low spread
- "act_soon" — moderate-severe with spread risk
- "act_immediately" — severe with high spread or near-fatal
- "consult_expert" — anything where you'd want the farmer to talk to a human first

INDIAN CONTEXT
- Indian agricultural product names where you know them
- Reference Indian organic preparations: neem oil, jeevamrut, panchgavya, trichoderma, beauveria
- Scientific names in Latin
- Common names in ${label} for *_local fields

LANGUAGE
All user-facing string fields are in ${label}: common_name_local, confidence_reasoning, severity_reasoning, symptoms_observed, primary_cause, contributing_factors, all treatment recommendation/preparation/application strings, prevention, spread_timeline, image_quality.quality_note + suggestion_for_better_photo, expert_escalation.reason. The English common_name and Latin scientific_name and the English search_term for KVK stay in their original form.

Return ONLY valid JSON matching the schema. No code fences, no prose outside JSON.`;
}

export function diseaseUserPrompt(input: DiseaseInput) {
  return `Diagnose the leaf in the attached image. Reply language: ${LANG_LABEL[input.lang]}.${
    input.crop_context ? `\nFarmer says crop is: ${input.crop_context}` : ''
  }`;
}
