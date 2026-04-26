// Crop advisory schema + prompt. Designed for Indian farms with mixed soil
// patterns, honest economic ranges, named ICAR varieties where confident, and
// "low_general" hedging where not. Output drives a layered UI; every tier of
// detail is independently optional so the grid can render cleanly even when
// the model returns less than the maximum.

import { z } from 'zod';

const SoilType = z.enum([
  'loam',
  'clay',
  'sandy',
  'alluvial',
  'black',
  'red',
  'laterite',
  'arid',
]);
const Irrigation = z.enum(['rainfed', 'borewell', 'canal', 'drip', 'mixed']);
const RiskPref = z.enum(['stable', 'balanced', 'high_reward']);
const Experience = z.enum(['novice', 'experienced', 'advanced']);
const Lang = z.enum(['en', 'hi', 'kn', 'ta', 'te', 'mr']);

export const AdvisoryInput = z.object({
  location: z.string().trim().min(2).max(200),
  primary_soil: SoilType,
  secondary_soil: SoilType.optional(),
  primary_soil_share_pct: z.number().int().min(50).max(100).optional(),
  // Sowing month is more useful than coarse season buckets, but we keep an
  // explicit season override for clients that don't yet have month-precision
  // pickers.
  sowing_month: z.number().int().min(1).max(12).optional(),
  season: z.enum(['kharif', 'rabi', 'zaid']).optional(),
  farm_size_acres: z.number().positive().max(10000).optional(),
  irrigation: Irrigation.optional(),
  budget_per_acre_inr: z.number().int().min(1000).max(200000).optional(),
  risk_preference: RiskPref.optional(),
  experience: Experience.optional(),
  preferred_crops: z.array(z.string().max(50)).max(10).optional(),
  previous_crop: z.string().max(50).optional(),
  lang: Lang.default('en'),
});
export type AdvisoryInput = z.infer<typeof AdvisoryInput>;

export const AdvisorySchema = z.object({
  recommendations: z
    .array(
      z.object({
        rank: z.number().int().min(1).max(20),
        crop_name: z.string(),
        crop_name_local: z.string(),

        variety_suggestions: z
          .array(
            z.object({
              name: z.string(),
              duration_days: z.number().int().min(30).max(400),
              notable_traits: z.string(),
            }),
          )
          .max(4)
          .default([]),
        variety_data_confidence: z.enum(['high', 'medium', 'low_general']),

        fit_score: z.number().min(0).max(100),
        fit_label: z.enum(['excellent', 'good', 'fair', 'marginal']),
        fit_breakdown: z.object({
          soil_match: z.number().min(0).max(100),
          season_match: z.number().min(0).max(100),
          water_match: z.number().min(0).max(100),
          budget_match: z.number().min(0).max(100),
          market_match: z.number().min(0).max(100),
        }),

        economics: z.object({
          confidence_level: z.enum(['estimate', 'rough_estimate', 'indicative_only']),
          expected_yield_range_per_acre: z.string(),
          expected_revenue_per_acre: z.string(),
          input_cost_per_acre: z.string(),
          net_profit_estimate: z.string(),
          msp_applicable: z.boolean(),
          msp_price_per_quintal: z.string().nullable().default(null),
          market_price_volatility: z.enum(['low', 'medium', 'high']),
          notes: z.string().default(''),
        }),

        timeline: z.object({
          sowing_window: z.string(),
          duration_days: z.number().int().min(30).max(400),
          harvest_window: z.string(),
          critical_stages: z.array(z.string()).max(5).default([]),
        }),

        requirements: z.object({
          water_requirement: z.enum(['low', 'medium', 'high']),
          irrigation_frequency: z.string(),
          fertilizer_summary: z.string(),
          labor_intensity: z.enum(['low', 'medium', 'high']),
          mechanization_friendly: z.boolean(),
        }),

        rationale: z.array(z.string()).min(2).max(5),

        key_risks: z
          .array(
            z.object({
              risk: z.string(),
              likelihood: z.enum(['low', 'medium', 'high']),
              mitigation: z.string(),
            }),
          )
          .max(5)
          .default([]),

        companion_crops: z.array(z.string()).max(6).default([]),
        rotation_suggestions: z.array(z.string()).max(5).default([]),

        market_outlook: z.string(),

        scheme_eligibility: z
          .array(z.enum(['MSP', 'PMFBY', 'PM_KISAN', 'KCC', 'eNAM', 'SOIL_HEALTH_CARD']))
          .default([]),

        best_for_zone: z.enum(['primary_soil', 'secondary_soil', 'both']).default('primary_soil'),
      }),
    )
    .min(3)
    .max(7),

  cropping_strategies: z
    .array(
      z.object({
        strategy_name: z.string(),
        description: z.string(),
        crops_involved: z.array(z.string()).min(1).max(5),
        rationale: z.string(),
        total_revenue_estimate: z.string(),
        total_input_cost_estimate: z.string(),
        net_estimate: z.string(),
        risk_level: z.enum(['low', 'medium', 'high']),
        best_for_profile: z.string(),
      }),
    )
    .max(4)
    .default([]),

  general_advice: z.string(),
  weather_context_summary: z.string(),
  caveats: z.array(z.string()).max(5).default([]),

  expert_consultation_recommended: z.boolean(),
  expert_consultation_reasoning: z.string().nullable().default(null),

  data_freshness_note: z.string(),
});
export type AdvisoryOutput = z.infer<typeof AdvisorySchema>;

const LANG_LABEL: Record<AdvisoryInput['lang'], string> = {
  en: 'English',
  hi: 'Hindi (Devanagari script)',
  kn: 'Kannada (ಕನ್ನಡ script)',
  ta: 'Tamil (தமிழ் script)',
  te: 'Telugu (తెలుగు script)',
  mr: 'Marathi (Devanagari script)',
};

const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function advisorySystemPrompt(lang: AdvisoryInput['lang']) {
  const label = LANG_LABEL[lang];
  return `ROLE
You are a senior agricultural economist and agronomist advising Indian farmers on cropping decisions. You produce ranked, honest recommendations based on the farmer's specific farm conditions.

QUALITY BAR — every output must meet:
- Recommend ONLY crops actually grown in the given Indian agro-climatic region in the specified sowing month or season.
- Use specific Indian variety names where you genuinely know them. If your knowledge of varieties for the region is limited, set variety_data_confidence = "low_general" and provide generic guidance ("look for drought-tolerant medium-duration varieties suited to your region — your KVK can recommend specific names"). Do NOT invent variety names.
- Yield ranges and economics must be REALISTIC, not best-case. A small farm with limited budget gets the lower-end range.
- Set economics.confidence_level honestly:
  - "estimate" — you have reasonable knowledge of typical yields and costs in this region
  - "rough_estimate" — general knowledge only, broad ranges
  - "indicative_only" — very general; flag clearly in notes
- net_profit_estimate = realistic revenue MINUS realistic input cost. Don't show ₹50,000 profit on a ₹20,000 input crop when the realistic realised profit in the region is ₹15,000–25,000.
- For mixed-soil farms (secondary_soil provided): genuinely consider what fits each zone separately, then build cropping_strategies that intelligently use both zones. Set best_for_zone honestly.
- Risk ratings reflect reality: pulses are price-volatile but low-input; cash crops high-reward high-risk; staples generally stable.
- Market outlook must be HONESTLY hedged. If you don't have current price data, say "subject to mandi conditions and seasonal variation, verify via e-NAM" rather than inventing a trend.
- Multi-crop strategies should reflect real farmer logic: stable + high-reward hedging, soil-zone specialization, rotation planning.

FIT SCORING
- fit_score 0–100: weighted aggregate of fit_breakdown components.
- fit_label: excellent (85+), good (70–84), fair (55–69), marginal (<55).
- Only return crops with fit_score >= 50; below that, omit them.
- You MUST return AT LEAST 3 recommendations and at most 7, ranked by fit_score descending. If you cannot find 3 crops with fit_score >= 50 for the farmer's exact inputs, broaden the search to include marginal-fit crops with realistic notes — but always return at least 3 entries in the array. Never return 1 or 2.

EXPERT ESCALATION
Set expert_consultation_recommended = true when:
- Farmer's inputs suggest a complex situation (very small farm with high budget, or very large farm with low budget — economically unusual)
- Recommendations heavily depend on local microclimate or pest pressure
- previous_crop creates rotation considerations needing local expertise
- risk_preference is "high_reward" and you're recommending volatile crops

Provide expert_consultation_reasoning (string in ${label}) explaining specifically what the KVK should help with. If false, set the reasoning to null.

SCHEME REFERENCES
For each crop, fill scheme_eligibility with a subset of the listed scheme codes that apply:
- MSP: government procurement at announced minimum support price (paddy, wheat, pulses, oilseeds, cotton, jute, etc.)
- PMFBY: crop insurance (broadly eligible kharif and rabi crops)
- PM_KISAN: income support (most farming households)
- KCC: Kisan Credit Card (input credit)
- eNAM: electronic mandi platform
- SOIL_HEALTH_CARD: soil testing scheme

Don't fabricate eligibility — only include codes where the crop genuinely qualifies.

INDIAN CONTEXT
- Variety names from ICAR / state agriculture departments where you know them
- Realistic ₹ figures based on Indian agricultural economics
- Reference government schemes when relevant
- Acknowledge mandi vs MSP price differences

LANGUAGE
All user-facing string fields in ${label}: crop_name_local, rationale, key_risks.risk + mitigation, all economics text fields, timeline.sowing_window/harvest_window/critical_stages, requirements.irrigation_frequency + fertilizer_summary, market_outlook, scheme_eligibility codes (codes themselves stay in English), companion_crops, rotation_suggestions, cropping_strategies (all string fields), general_advice, weather_context_summary, caveats, expert_consultation_reasoning, data_freshness_note.

The English crop_name and the variety names stay in their original Latin/Indian form. Numerical fields and enums stay as-is.

EXACT JSON SHAPE — use these EXACT top-level field names. Do not rename them.
{
  "recommendations": [
    {
      "rank": 1,
      "crop_name": "...",
      "crop_name_local": "...",
      "variety_suggestions": [{"name": "...", "duration_days": 120, "notable_traits": "..."}],
      "variety_data_confidence": "high" | "medium" | "low_general",
      "fit_score": 0..100,
      "fit_label": "excellent" | "good" | "fair" | "marginal",
      "fit_breakdown": {"soil_match": 0..100, "season_match": 0..100, "water_match": 0..100, "budget_match": 0..100, "market_match": 0..100},
      "economics": {
        "confidence_level": "estimate" | "rough_estimate" | "indicative_only",
        "expected_yield_range_per_acre": "...",
        "expected_revenue_per_acre": "...",
        "input_cost_per_acre": "...",
        "net_profit_estimate": "...",
        "msp_applicable": true|false,
        "msp_price_per_quintal": "..." | null,
        "market_price_volatility": "low" | "medium" | "high",
        "notes": "..."
      },
      "timeline": {"sowing_window": "...", "duration_days": 120, "harvest_window": "...", "critical_stages": ["..."]},
      "requirements": {"water_requirement": "low"|"medium"|"high", "irrigation_frequency": "...", "fertilizer_summary": "...", "labor_intensity": "low"|"medium"|"high", "mechanization_friendly": true|false},
      "rationale": ["...", "..."],
      "key_risks": [{"risk": "...", "likelihood": "low"|"medium"|"high", "mitigation": "..."}],
      "companion_crops": ["..."],
      "rotation_suggestions": ["..."],
      "market_outlook": "...",
      "scheme_eligibility": ["MSP"|"PMFBY"|"PM_KISAN"|"KCC"|"eNAM"|"SOIL_HEALTH_CARD"],
      "best_for_zone": "primary_soil" | "secondary_soil" | "both"
    }
  ],
  "cropping_strategies": [
    {"strategy_name": "...", "description": "...", "crops_involved": ["..."], "rationale": "...", "total_revenue_estimate": "...", "total_input_cost_estimate": "...", "net_estimate": "...", "risk_level": "low"|"medium"|"high", "best_for_profile": "..."}
  ],
  "general_advice": "...",
  "weather_context_summary": "...",
  "caveats": ["..."],
  "expert_consultation_recommended": true|false,
  "expert_consultation_reasoning": "..." | null,
  "data_freshness_note": "..."
}

Return ONLY this JSON object. The top-level key MUST be "recommendations" (not "crop_recommendations" or any synonym). No prose outside JSON. No code fences.`;
}

export function advisoryUserPrompt(input: AdvisoryInput, weatherContext?: string) {
  const monthLabel = input.sowing_month ? MONTH_NAMES[input.sowing_month] : undefined;
  const lines: string[] = [
    `Location: ${input.location}`,
    input.secondary_soil
      ? `Soil pattern: primary ${input.primary_soil} (${input.primary_soil_share_pct ?? 70}%), secondary ${input.secondary_soil} (${100 - (input.primary_soil_share_pct ?? 70)}%)`
      : `Soil type: ${input.primary_soil}`,
  ];
  if (monthLabel) lines.push(`Planned sowing month: ${monthLabel}`);
  if (input.season) lines.push(`Season: ${input.season}`);
  if (input.farm_size_acres) lines.push(`Farm size: ${input.farm_size_acres} acres`);
  if (input.irrigation) lines.push(`Irrigation: ${input.irrigation}`);
  if (input.budget_per_acre_inr)
    lines.push(`Input budget per acre: ₹${input.budget_per_acre_inr.toLocaleString('en-IN')}`);
  if (input.risk_preference) lines.push(`Risk preference: ${input.risk_preference}`);
  if (input.experience) lines.push(`Farmer experience: ${input.experience}`);
  if (input.previous_crop) lines.push(`Previous crop: ${input.previous_crop}`);
  if (input.preferred_crops?.length)
    lines.push(`Crops the farmer is interested in: ${input.preferred_crops.join(', ')}`);
  if (weatherContext) lines.push(`Current weather context: ${weatherContext}`);
  lines.push(`Reply language for user-facing strings: ${LANG_LABEL[input.lang]}.`);
  return lines.join('\n');
}
