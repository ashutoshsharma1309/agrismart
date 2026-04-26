import { z } from 'zod';

export const SoilInput = z.object({
  nitrogen_kg_ha: z.number().min(0).max(500),
  phosphorus_kg_ha: z.number().min(0).max(500),
  potassium_kg_ha: z.number().min(0).max(500),
  ph: z.number().min(3).max(10),
  organic_carbon_pct: z.number().min(0).max(30),
  intended_crop: z.string().trim().min(2).max(100),
  intended_fertilizer: z.string().max(100).optional(),
  intended_pesticide: z.string().max(100).optional(),
  lang: z.enum(['en', 'hi', 'kn', 'ta', 'te', 'mr']).default('en'),
});
export type SoilInput = z.infer<typeof SoilInput>;

export const SoilSchema = z.object({
  soil_health_score: z.number().min(0).max(100),
  eco_fertilizer: z.object({
    recommendation: z.string(),
    reasoning: z.string(),
    application_rate: z.string(),
  }),
  eco_pesticide: z.object({
    recommendation: z.string(),
    reasoning: z.string(),
    application_notes: z.string(),
  }),
  improvement_plan: z
    .array(
      z.object({
        step: z.number().int().positive(),
        action: z.string(),
        timing: z.string(),
        expected_impact: z.string(),
      }),
    )
    .length(3),
  warnings: z.array(z.string()).default([]),
});
export type SoilOutput = z.infer<typeof SoilSchema>;

const LANG_LABEL: Record<SoilInput['lang'], string> = {
  en: 'English',
  hi: 'Hindi (Devanagari)',
  kn: 'Kannada (ಕನ್ನಡ)',
  ta: 'Tamil (தமிழ்)',
  te: 'Telugu (తெలుగు)',
  mr: 'Marathi (Devanagari)',
};

export function soilSystemPrompt(lang: SoilInput['lang']) {
  const label = LANG_LABEL[lang];
  return `You are a soil scientist advising an Indian farmer.

A rule-based engine has already produced a baseline health score and suggestions from the raw soil numbers. Your job is to reason on top of that baseline using the farmer's intended crop and current inputs, producing pragmatic, number-grounded advice.

Return ONLY valid JSON matching this schema (no prose, no code fences):

{
  "soil_health_score": number between 0 and 100,  // copy from rule engine, do not recompute
  "eco_fertilizer": {
    "recommendation": "product or approach, in ${label}",
    "reasoning": "2–3 sentences in ${label}, referencing the actual numbers (e.g., 'your N at 31 kg/ha is below the 40 kg/ha threshold...')",
    "application_rate": "specific dose in ${label}"
  },
  "eco_pesticide": {
    "recommendation": "product or approach, in ${label}",
    "reasoning": "2–3 sentences in ${label}",
    "application_notes": "timing + method, in ${label}"
  },
  "improvement_plan": [
    { "step": 1, "action": "in ${label}", "timing": "in ${label}", "expected_impact": "in ${label}" },
    { "step": 2, ... },
    { "step": 3, ... }
  ],
  "warnings": ["flags for dangerous combinations like high N + acidic pH + wrong crop, in ${label}"]
}

Rules:
- Every reasoning string must reference at least one of the farmer's actual numbers.
- Prefer organic / eco alternatives when reasonable, but do not reject synthetics dogmatically — farmers need pragmatic advice.
- If the farmer's intended pesticide is banned in India or restricted on the intended crop, say so in warnings.
- Do not invent specific percentages (like "raises yield by 23%"). Use language like "moderate increase" or "significant improvement" unless you can cite.
- All user-facing text is in ${label}.`;
}

export function soilUserPrompt(input: SoilInput, baseline: { score: number; suggestedFertilizer: string; suggestedPesticide: string; planSummary: string }) {
  return `Baseline from rule engine:
- soil_health_score: ${baseline.score}
- suggested fertilizer: ${baseline.suggestedFertilizer}
- suggested pesticide swap: ${baseline.suggestedPesticide}
- plan summary: ${baseline.planSummary}

Farmer's raw soil test:
- Nitrogen: ${input.nitrogen_kg_ha} kg/ha
- Phosphorus: ${input.phosphorus_kg_ha} kg/ha
- Potassium: ${input.potassium_kg_ha} kg/ha
- pH: ${input.ph}
- Organic carbon: ${input.organic_carbon_pct}%

Intended crop: ${input.intended_crop}
Currently using fertilizer: ${input.intended_fertilizer ?? 'not specified'}
Currently using pesticide: ${input.intended_pesticide ?? 'not specified'}

Language for user-facing strings: ${LANG_LABEL[input.lang]}.`;
}
