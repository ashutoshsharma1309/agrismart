// Client wrapper around the AgriSmart backend AI proxy.
// The LLM provider key lives ONLY on the backend. Do not reference any
// provider SDK, domain, or key in this or any other client file.

import type { Lang } from '../i18n';
import { readJson, storageKeys } from './storage';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000';

export type AiErrorReason =
  | 'upstream_auth_failed'
  | 'upstream_rate_limited'
  | 'upstream_unavailable'
  | 'upstream_timeout'
  | 'upstream_bad_request'
  | 'schema_validation_failed'
  | 'invalid_query'
  | 'invalid_image'
  | 'image_too_large'
  | 'user_rate_limited'
  | 'ip_rate_limited'
  | 'server_busy'
  | 'network_error'
  | 'unknown';

type Envelope<T> = { ok: true; data?: T; [k: string]: unknown } | { ok: false; reason: AiErrorReason; [k: string]: unknown };

export class AiClientError extends Error {
  constructor(public reason: AiErrorReason, public status?: number) {
    super(`ai_client:${reason}`);
  }
}

function userIdHeader(): Record<string, string> {
  const session = readJson<{ email?: string; name?: string } | null>(storageKeys.session, null);
  const id = session?.email ?? session?.name;
  return id ? { 'X-User-Id': id } : {};
}

async function post<T>(path: string, body: unknown): Promise<Envelope<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...userIdHeader(),
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as Envelope<T> | null;
    if (!res.ok) {
      const reason: AiErrorReason =
        ((json as { reason?: AiErrorReason })?.reason as AiErrorReason) ?? 'upstream_unavailable';
      return { ok: false, reason, ...(json ?? {}) };
    }
    if (!json) {
      return { ok: false, reason: 'unknown' };
    }
    return json;
  } catch {
    return { ok: false, reason: 'network_error' };
  }
}

// -------- Chat --------
export type ChatProfile = {
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
export type ChatRequest = {
  conversation_id: string;
  message: string;
  lang: Lang;
  profile?: ChatProfile;
};
export type ChatResponse = {
  reply: string;
  fallback_used?: boolean;
  tokens?: number;
  grounded?: boolean;
};

export async function sendChat(req: ChatRequest): Promise<Envelope<ChatResponse>> {
  const res = await post<ChatResponse>('/api/chat/message', req);
  // The chat route returns a top-level { ok, reply, ... } rather than { ok, data }.
  // Normalise into the data-envelope used everywhere else.
  if (res.ok) {
    const { reply, fallback_used, tokens } = res as unknown as {
      reply: string;
      fallback_used?: boolean;
      tokens?: number;
    };
    return { ok: true, data: { reply, fallback_used, tokens } };
  }
  // If backend attached a fallback string (key missing path), surface it as data too.
  const fallback = (res as { fallback?: string }).fallback;
  if (fallback) {
    return { ok: true, data: { reply: fallback, fallback_used: true } };
  }
  return res;
}

// -------- Advisory --------
export type SoilType =
  | 'loam'
  | 'clay'
  | 'sandy'
  | 'alluvial'
  | 'black'
  | 'red'
  | 'laterite'
  | 'arid';
export type Irrigation = 'rainfed' | 'borewell' | 'canal' | 'drip' | 'mixed';
export type RiskPref = 'stable' | 'balanced' | 'high_reward';
export type Experience = 'novice' | 'experienced' | 'advanced';
export type SchemeCode =
  | 'MSP'
  | 'PMFBY'
  | 'PM_KISAN'
  | 'KCC'
  | 'eNAM'
  | 'SOIL_HEALTH_CARD';

export type AdvisoryRequest = {
  location: string;
  primary_soil: SoilType;
  secondary_soil?: SoilType;
  primary_soil_share_pct?: number;
  sowing_month?: number;
  season?: 'kharif' | 'rabi' | 'zaid';
  farm_size_acres?: number;
  irrigation?: Irrigation;
  budget_per_acre_inr?: number;
  risk_preference?: RiskPref;
  experience?: Experience;
  preferred_crops?: string[];
  previous_crop?: string;
  lang: Lang;
};

export type AdvisoryCrop = {
  rank: number;
  crop_name: string;
  crop_name_local: string;
  variety_suggestions: { name: string; duration_days: number; notable_traits: string }[];
  variety_data_confidence: 'high' | 'medium' | 'low_general';
  fit_score: number;
  fit_label: 'excellent' | 'good' | 'fair' | 'marginal';
  fit_breakdown: {
    soil_match: number;
    season_match: number;
    water_match: number;
    budget_match: number;
    market_match: number;
  };
  economics: {
    confidence_level: 'estimate' | 'rough_estimate' | 'indicative_only';
    expected_yield_range_per_acre: string;
    expected_revenue_per_acre: string;
    input_cost_per_acre: string;
    net_profit_estimate: string;
    msp_applicable: boolean;
    msp_price_per_quintal: string | null;
    market_price_volatility: 'low' | 'medium' | 'high';
    notes: string;
  };
  timeline: {
    sowing_window: string;
    duration_days: number;
    harvest_window: string;
    critical_stages: string[];
  };
  requirements: {
    water_requirement: 'low' | 'medium' | 'high';
    irrigation_frequency: string;
    fertilizer_summary: string;
    labor_intensity: 'low' | 'medium' | 'high';
    mechanization_friendly: boolean;
  };
  rationale: string[];
  key_risks: { risk: string; likelihood: 'low' | 'medium' | 'high'; mitigation: string }[];
  companion_crops: string[];
  rotation_suggestions: string[];
  market_outlook: string;
  scheme_eligibility: SchemeCode[];
  best_for_zone: 'primary_soil' | 'secondary_soil' | 'both';
};

export type CroppingStrategy = {
  strategy_name: string;
  description: string;
  crops_involved: string[];
  rationale: string;
  total_revenue_estimate: string;
  total_input_cost_estimate: string;
  net_estimate: string;
  risk_level: 'low' | 'medium' | 'high';
  best_for_profile: string;
};

export type AdvisoryResponse = {
  recommendations: AdvisoryCrop[];
  cropping_strategies: CroppingStrategy[];
  general_advice: string;
  weather_context_summary: string;
  caveats: string[];
  expert_consultation_recommended: boolean;
  expert_consultation_reasoning: string | null;
  data_freshness_note: string;
};

export function generateAdvisory(req: AdvisoryRequest) {
  return post<AdvisoryResponse>('/api/advisory/generate', req);
}

// -------- Soil --------
export type SoilRequest = {
  nitrogen_kg_ha: number;
  phosphorus_kg_ha: number;
  potassium_kg_ha: number;
  ph: number;
  organic_carbon_pct: number;
  intended_crop: string;
  intended_fertilizer?: string;
  intended_pesticide?: string;
  lang: Lang;
};

export type SoilResponse = {
  soil_health_score: number;
  eco_fertilizer: { recommendation: string; reasoning: string; application_rate: string };
  eco_pesticide: { recommendation: string; reasoning: string; application_notes: string };
  improvement_plan: {
    step: number;
    action: string;
    timing: string;
    expected_impact: string;
  }[];
  warnings: string[];
};

export function analyzeSoil(req: SoilRequest) {
  return post<SoilResponse>('/api/soil/analyze', req);
}

// -------- Disease --------
export type DiseaseRequest = {
  image_data_url: string;
  crop_context?: string;
  lang: Lang;
};

export type ConfidenceLabel = 'very_high' | 'high' | 'moderate' | 'low' | 'uncertain';

export type DifferentialDx = {
  common_name: string;
  common_name_local: string;
  probability: number;
  distinguishing_features: string;
  what_to_check: string;
};

export type DiseaseResponse = {
  primary_diagnosis: {
    common_name: string;
    common_name_local: string;
    scientific_name: string | null;
    confidence: number;
    confidence_label: ConfidenceLabel;
    confidence_reasoning: string;
  };
  differential_diagnoses: DifferentialDx[];
  is_diseased: boolean;
  disease_certainty: number;
  severity: 'mild' | 'moderate' | 'severe' | 'unable_to_assess';
  severity_reasoning: string;
  symptoms_observed: string[];
  primary_cause: string | null;
  contributing_factors: string[];
  treatment: {
    safe_to_recommend: boolean;
    immediate_action: string;
    cultural_control: string[];
    biological_control: {
      recommendation: string | null;
      preparation: string | null;
      application: string | null;
    };
    organic_chemical: {
      recommendation: string | null;
      preparation: string | null;
      application: string | null;
    };
    synthetic_chemical: {
      recommended: boolean;
      product_class: string | null;
      indian_examples: string[];
      typical_concentration: string | null;
      application_method: string | null;
      ppe_required: string[];
      kvk_consultation_required: boolean;
      kvk_consultation_reasoning: string;
    };
  };
  prevention: string[];
  spread_risk: 'low' | 'medium' | 'high' | 'unknown';
  spread_timeline: string | null;
  urgency: 'monitor' | 'act_within_week' | 'act_soon' | 'act_immediately' | 'consult_expert';
  image_quality: {
    is_leaf: boolean;
    is_clear: boolean;
    lighting_adequate: boolean;
    angle_useful: boolean;
    quality_note: string | null;
    suggestion_for_better_photo: string | null;
    additional_photos_recommended: string[];
  };
  expert_escalation: {
    recommended: boolean;
    reason: string;
    nearest_kvk_search_term: string;
  };
};

export function analyzeDisease(req: DiseaseRequest) {
  return post<DiseaseResponse>('/api/disease/analyze', req);
}

// Reads a File as a data URL with a built-in downscale step. Phone cameras
// routinely produce 4–12 MB JPEGs that are needlessly heavy for a vision model
// and that risk hitting the server's base64 size cap. We render the image into
// a canvas at max 1280px on the long edge and re-encode as JPEG at 0.85, which
// keeps disease-relevant detail while landing comfortably under any limit and
// shaving seconds off the upload + Groq call.
export async function fileToDataUrl(file: File): Promise<string> {
  const MAX_EDGE = 1280;
  const QUALITY = 0.85;

  // Decode via createImageBitmap when available (faster, off-main-thread).
  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('image_decode_failed'));
      };
      img.src = url;
    });
  }

  const w = (bitmap as ImageBitmap).width ?? (bitmap as HTMLImageElement).naturalWidth;
  const h = (bitmap as ImageBitmap).height ?? (bitmap as HTMLImageElement).naturalHeight;
  if (!w || !h) {
    // Fallback: just return the raw data URL.
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error ?? new Error('read failed'));
      reader.readAsDataURL(file);
    });
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const targetW = Math.round(w * scale);
  const targetH = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unsupported');
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, targetW, targetH);
  if ('close' in bitmap && typeof (bitmap as ImageBitmap).close === 'function') {
    (bitmap as ImageBitmap).close();
  }

  // Always emit JPEG — the server's accepted MIME set is JPEG/PNG/WebP, and
  // JPEG gives the best size/quality trade for natural leaf photos.
  return canvas.toDataURL('image/jpeg', QUALITY);
}
