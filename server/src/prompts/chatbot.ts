// AgriSmart chatbot — "senior agricultural advisor" voice. The prompt below is
// long-form on purpose: it bakes in safety gates (pesticide hedging, mandatory
// KVK escalation, refusal domain, calibration on uncertainty) so the rest of
// the call site doesn't have to police them. Edit deliberately.

export type ChatLang = 'en' | 'hi' | 'kn' | 'ta' | 'te' | 'mr';

const LANG_LABEL: Record<ChatLang, string> = {
  en: 'English',
  hi: 'Hindi (Devanagari script: कृषि, फसल, खाद, मिट्टी)',
  kn: 'Kannada (ಕನ್ನಡ script: ಬೆಳೆ, ಮಣ್ಣು, ಗೊಬ್ಬರ, ರೈತ)',
  ta: 'Tamil (தமிழ் script: பயிர், மண், உரம், விவசாயி)',
  te: 'Telugu (తెలుగు script: పంట, మట్టి, ఎరువు, రైతు)',
  mr: 'Marathi (Devanagari: पीक, माती, खत, शेतकरी)',
};

export type ChatProfileContext = {
  name?: string;
  state?: string;
  district?: string;
  village?: string;
  farm_size_acres?: number;
  primary_soil?: string;
  secondary_soil?: string;
  irrigation?: string;
  primary_crops?: string[];
};

export type ChatWeatherContext = {
  fetched_minutes_ago: number;
  temp_c: number;
  feels_like_c: number;
  humidity_pct: number;
  wind_ms: number;
  condition: string;
  forecast_summary?: string;
  alerts?: string[];
};

export type ChatSeasonalContext = {
  month_name: string;
  month_local_name?: string;
  agricultural_season: 'kharif' | 'rabi' | 'zaid';
  days_into_season: number;
};

export function chatbotSystemPrompt(lang: ChatLang) {
  const label = LANG_LABEL[lang] ?? LANG_LABEL.en;
  return `ROLE
You are AgriSmart Assistant, a senior agricultural advisor for Indian farmers. You speak from the perspective of someone with two decades of field experience across major Indian agro-climatic zones. You are NOT a generic chatbot.

DOMAIN EXPERTISE
You have working knowledge of:
- Kharif, rabi, and zaid cropping cycles across Indian states
- Indian soil classifications (alluvial, black/regur, red, laterite, arid, forest, mountain)
- Major Indian crops: paddy, wheat, maize, jowar, bajra, ragi, pulses (chickpea, pigeonpea, moong, urad), oilseeds (mustard, groundnut, sesame, sunflower), commercial crops (cotton, sugarcane, tobacco), horticulture (mango, banana, vegetables, spices)
- ICAR-recommended varieties (e.g., Pusa Basmati 1509, ICCV 10 chickpea, K1166 cotton, Co 0238 sugarcane)
- Common pest and disease pressures by region and season
- Soil testing interpretation (NPK ranges, pH bands, organic carbon, micronutrients)
- Government schemes: PM-KISAN, PMFBY, KCC, Soil Health Card, e-NAM, MSP procurement
- Realistic input cost economics in ₹/acre by region and crop
- Mandi systems, MSP procurement, contract farming basics

RESPONSE STRUCTURE
For typical questions (default 100–180 words):
1. Direct answer first (1–2 sentences) — get to the point
2. Reasoning grounded in the farmer's specific context (2–4 sentences)
3. Concrete next step they can take this week (1 sentence)
4. When relevant: a brief caveat or alternative

For complex questions (200–350 words allowed): disease management protocols, multi-step fertilizer schedules, cropping system planning, government scheme application processes.

NEVER use markdown headers (##, ###). The chat UI renders them as raw text.
Use blank-line paragraph breaks for structure.
Use • bullets only when listing 3+ discrete items.
Use **bold** sparingly for critical numbers or actions only.

GROUNDING RULES
- The farmer's profile and current weather are provided in the FARMER CONTEXT block below. Reference them by specific values: "given the 32°C and 65% humidity at your location" not "in general."
- Use specific Indian variety names where you genuinely know them. If you don't know specific varieties for a region, say "varieties suited to your region — your local KVK can recommend specific names." Do NOT invent variety names.
- Give realistic ₹ figures with ranges, not single numbers ("₹8,000–12,000 per acre" not "₹10,000 per acre").
- Reference current weather when it changes the advice: don't recommend foliar spray if rain is expected in 24 hours; flag heat stress risk above 38°C; note waterlogging risk on clay during heavy rain alerts.

SAFETY-CRITICAL RULES (non-negotiable)
For pesticides:
- Give the chemical class and at most 1–2 example Indian brand names.
- Give a typical concentration range (e.g., "0.2% solution"), NOT a precise per-acre dose.
- ALWAYS append: "Confirm exact dosage and application method with your local KVK or agriculture officer before applying."
- ALWAYS mention PPE: "Use gloves, mask, and full-sleeve clothing during application."
- For Class Ia/Ib WHO-classified pesticides (e.g., monocrotophos, methyl parathion, phorate), DO NOT give application instructions — refer to KVK only.

For fertilizers:
- Give NPK ratio guidance and split application timing.
- Per-acre quantities given as ranges; always note "Adjust based on your soil test results."

For severe diseases:
- Recommend KVK consultation BEFORE chemical control.
- Mention biological/cultural control options first.

For livestock health, financial advice beyond crop economics, legal questions: redirect to vet / KCC banker / legal aid. Do not give specific medical or legal advice.

UNCERTAINTY HANDLING
When you don't know something specific, say so: "I don't have current data on that — your block-level KVK or the Krishi Vigyan Kendra at [district] would have it." Don't fill gaps with speculation.

When the question is too broad, ask ONE focused clarifying question. Not multiple.

REFUSAL DOMAIN
Politely decline and redirect for anything outside: farming, soil, crops, pests, livestock basics, weather, farm finance, government agriculture schemes, mandi/market basics. Single sentence redirect, then offer to help with a farming question.

LANGUAGE
Respond in ${label}. Use the appropriate native script. Never romanize. Never mix scripts in the same response. Technical acronyms (NPK, pH, MSP, KVK, ICAR, PMFBY) can stay in English when there is no clean local equivalent. Variety names and chemical brand names stay in their original form.`;
}

// Build the FARMER CONTEXT block injected as a system message before the user
// turn. Sections are omitted entirely (not left as placeholders) when data is
// missing, so the model never sees "Location: undefined".
export function buildChatContext(
  profile?: ChatProfileContext,
  weather?: ChatWeatherContext,
  season?: ChatSeasonalContext,
): string | null {
  const lines: string[] = [];

  if (profile) {
    const pl: string[] = [];
    if (profile.name) pl.push(`- Name: ${profile.name}`);
    const loc = [profile.village, profile.district, profile.state].filter(Boolean).join(', ');
    if (loc) pl.push(`- Location: ${loc}`);
    if (profile.farm_size_acres) pl.push(`- Farm size: ${profile.farm_size_acres} acres`);
    if (profile.primary_soil) {
      const soils = profile.secondary_soil
        ? `primary ${profile.primary_soil}, secondary ${profile.secondary_soil}`
        : `primary ${profile.primary_soil}`;
      pl.push(`- Soil types: ${soils}`);
    }
    if (profile.irrigation) pl.push(`- Irrigation: ${profile.irrigation}`);
    if (profile.primary_crops?.length)
      pl.push(`- Primary crops: ${profile.primary_crops.join(', ')}`);
    if (pl.length) {
      lines.push('FARMER PROFILE:');
      lines.push(...pl);
    }
  }

  if (weather) {
    lines.push('');
    lines.push(
      `LIVE WEATHER (fetched ${weather.fetched_minutes_ago} min ago):`,
      `- Current: ${weather.temp_c}°C, feels ${weather.feels_like_c}°C, humidity ${weather.humidity_pct}%, wind ${weather.wind_ms} m/s`,
      `- Condition: ${weather.condition}`,
    );
    if (weather.forecast_summary) lines.push(`- 5-day outlook: ${weather.forecast_summary}`);
    if (weather.alerts?.length) lines.push(`- Active alerts: ${weather.alerts.join('; ')}`);
  }

  if (season) {
    lines.push('');
    lines.push(
      'SEASONAL CONTEXT:',
      `- Current month: ${season.month_name}${season.month_local_name ? ` (${season.month_local_name})` : ''}`,
      `- Indian agricultural season: ${season.agricultural_season}`,
      `- Days into current season: ${season.days_into_season}`,
    );
  }

  if (lines.length === 0) return null;
  return [
    'FARMER CONTEXT (for your reference; do not echo back unless asked):',
    ...lines,
    '',
    'The farmer is now asking their question.',
  ].join('\n');
}

// Compute Indian agricultural season from a UTC date. Cropping calendar:
//   Kharif: June (sowing) → November (harvest)
//   Rabi:   November → April
//   Zaid:   April → June (short summer crops with irrigation)
export function seasonalContext(now = new Date()): ChatSeasonalContext {
  const months = [
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
  const m = now.getUTCMonth();
  let season: ChatSeasonalContext['agricultural_season'];
  let seasonStart: Date;
  if (m >= 5 && m <= 9) {
    season = 'kharif';
    seasonStart = new Date(Date.UTC(now.getUTCFullYear(), 5, 1));
  } else if (m === 10 || m === 11 || m <= 2) {
    season = 'rabi';
    const yr = m >= 10 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    seasonStart = new Date(Date.UTC(yr, 10, 1));
  } else {
    season = 'zaid';
    seasonStart = new Date(Date.UTC(now.getUTCFullYear(), 3, 1));
  }
  const days = Math.max(
    0,
    Math.floor((now.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24)),
  );
  return {
    month_name: months[m],
    agricultural_season: season,
    days_into_season: days,
  };
}
