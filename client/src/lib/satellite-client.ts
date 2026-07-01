// Client for the satellite advisory backend. The engine is a pure rule-based
// service, so these calls never require an API key and always resolve.

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000';

export type StressLevel = 'none' | 'mild' | 'moderate' | 'severe';
export type IrrigationAction = 'irrigate_now' | 'irrigate_soon' | 'adequate' | 'reduce';
export type StageKey = 'establishment' | 'vegetative' | 'reproductive' | 'maturity' | 'harvest';

export type FieldSummary = {
  id: string;
  name: string;
  village: string;
  district: string;
  state: string;
  area_ha: number;
  crop: string;
  stage: string;
  stress_level: StressLevel;
  stress_index: number;
  action: IrrigationAction;
};

export type Observation = {
  date_iso: string;
  das: number;
  ndvi: number;
  ndwi: number;
  sar_vv_db: number;
  sar_vh_db: number;
  soil_moisture_pct: number;
  rainfall_mm: number;
};

export type FieldAnalysis = {
  field: {
    id: string;
    name: string;
    village: string;
    district: string;
    state: string;
    lat: number;
    lon: number;
    area_ha: number;
    sowing_date_iso: string;
    polygon: [number, number][];
  };
  classification: {
    crop: string;
    confidence: number;
    method: string;
    alternatives: { crop: string; probability: number }[];
  };
  ground_truth_crop: string;
  correct: boolean;
  stage: {
    stage: StageKey;
    label: string;
    dayAfterSowing: number;
    progressPct: number;
    ndviTrend: 'rising' | 'plateau' | 'declining';
    note: string;
  };
  moisture_stress: {
    level: StressLevel;
    index: number;
    ndwi: number;
    soilMoisturePct: number;
    trend: 'improving' | 'stable' | 'worsening';
    drivers: string[];
  };
  irrigation: {
    action: IrrigationAction;
    headline: string;
    water_mm: number;
    water_litres_total: number;
    window: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    rationale: string;
    confidence: number;
  };
  series: Observation[];
};

export type RegionOverview = {
  total_fields: number;
  total_area_ha: number;
  stressed_fields: number;
  fields_needing_irrigation: number;
  crop_distribution: { crop: string; count: number }[];
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`satellite_client:${res.status}`);
  const body = (await res.json()) as { ok: boolean; data: T };
  if (!body.ok) throw new Error('satellite_client:not_ok');
  return body.data;
}

export function fetchRegionOverview() {
  return getJson<RegionOverview>('/api/satellite/overview');
}

export function fetchFields() {
  return getJson<FieldSummary[]>('/api/satellite/fields');
}

export function fetchFieldAnalysis(id: string) {
  return getJson<FieldAnalysis>(`/api/satellite/fields/${id}`);
}
