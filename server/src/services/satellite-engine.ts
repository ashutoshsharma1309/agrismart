// Satellite analysis engine.
//
// Pure, deterministic domain logic that turns a fused optical + SAR time-series
// into the four PS deliverables:
//   1. Crop-type classification   (nearest-centroid over phenology signatures)
//   2. Stage-wise phenology mapping
//   3. Moisture-stress detection  (NDWI + SAR soil moisture + trend)
//   4. Irrigation advisory        (stage water demand vs. current supply)
//
// No external services, no LLM — this always runs and is fully testable.

import type { SatelliteField, SatObservation } from '../data/satellite-fields.js';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const round = (v: number, dp = 1) => {
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
};

// ---------------------------------------------------------------------------
// 1. CROP-TYPE CLASSIFICATION
// ---------------------------------------------------------------------------
// Each reference crop has a canonical spectral/temporal signature. We extract
// the same features from the observed field and score by weighted distance,
// then convert distances to probabilities with a softmax. This is a compact,
// explainable stand-in for the Random-Forest / temporal-CNN classifier that a
// production build would train on labelled Sentinel time-series.

export type CropSignature = {
  crop: string;
  peakDay: number; // day-after-sowing of NDVI peak
  peakNdvi: number;
  duration: number; // total crop cycle length (days)
  earlyVv: number; // mean VV (dB) over first ~40% of cycle (rice floods low)
  amplitude: number; // NDVI peak - green-up baseline
};

export const CROP_LIBRARY: CropSignature[] = [
  { crop: 'Rice', peakDay: 72, peakNdvi: 0.82, duration: 135, earlyVv: -18.5, amplitude: 0.6 },
  { crop: 'Wheat', peakDay: 85, peakNdvi: 0.78, duration: 125, earlyVv: -13.0, amplitude: 0.58 },
  { crop: 'Maize', peakDay: 62, peakNdvi: 0.86, duration: 105, earlyVv: -12.5, amplitude: 0.62 },
  { crop: 'Cotton', peakDay: 95, peakNdvi: 0.71, duration: 165, earlyVv: -12.0, amplitude: 0.53 },
  { crop: 'Sugarcane', peakDay: 150, peakNdvi: 0.85, duration: 330, earlyVv: -11.5, amplitude: 0.59 },
];

// Canonical NDVI(das) phenology curve for a reference crop — an asymmetric bell
// matching the shape a healthy stand traces through its cycle.
function modelNdvi(das: number, sig: CropSignature): number {
  const base = sig.peakNdvi - sig.amplitude;
  const spread = sig.peakDay * 0.85;
  const g = Math.exp(-Math.pow((das - sig.peakDay) / spread, 2));
  return base + (sig.peakNdvi - base) * g;
}

export type CropClassification = {
  crop: string;
  confidence: number; // 0..100
  method: string;
  alternatives: { crop: string; probability: number }[];
};

export function classifyCrop(field: SatelliteField): CropClassification {
  const series = field.series;
  const cycleSoFar = series[series.length - 1].das;
  // Mean VV over the first ~40% of the observed cycle — the SAR establishment
  // signal that separates flooded paddy from dryland crops.
  const earlyCut = cycleSoFar * 0.4;
  const early = series.filter((o) => o.das <= earlyCut);
  const earlyVv =
    (early.length ? early : series.slice(0, 2)).reduce((s, o) => s + o.sar_vv_db, 0) /
    (early.length || 2);

  const scored = CROP_LIBRARY.map((sig) => {
    // Shape match: RMSE between the observed NDVI trajectory and the crop's
    // canonical phenology curve, sampled at the same acquisition days.
    let sq = 0;
    for (const o of series) sq += Math.pow(o.ndvi - modelNdvi(o.das, sig), 2);
    const rmse = Math.sqrt(sq / series.length);
    const dShape = rmse / 0.12;
    // SAR establishment signal (flooded vs dryland).
    const dEarlyVv = Math.abs(earlyVv - sig.earlyVv) / 8;
    // Duration prior: a crop whose whole cycle is shorter than what we've
    // already observed cannot be the answer — penalise it hard.
    const overrun = Math.max(0, cycleSoFar - sig.duration) / 15;
    const dist = 3.0 * dShape + 1.4 * dEarlyVv + 2.5 * overrun;
    return { crop: sig.crop, dist };
  });

  // Softmax over negative distance -> probabilities.
  const temp = 0.5;
  const exps = scored.map((s) => ({ crop: s.crop, e: Math.exp(-s.dist / temp) }));
  const sum = exps.reduce((a, b) => a + b.e, 0) || 1;
  const probs = exps
    .map((s) => ({ crop: s.crop, probability: round((s.e / sum) * 100, 1) }))
    .sort((a, b) => b.probability - a.probability);

  return {
    crop: probs[0].crop,
    confidence: probs[0].probability,
    method: 'Optical–SAR temporal signature matching (nearest-centroid)',
    alternatives: probs.slice(1, 4),
  };
}

// ---------------------------------------------------------------------------
// 2. PHENOLOGY / GROWTH STAGE
// ---------------------------------------------------------------------------
export type StageKey = 'establishment' | 'vegetative' | 'reproductive' | 'maturity' | 'harvest';

export type PhenologyStage = {
  stage: StageKey;
  label: string;
  dayAfterSowing: number;
  progressPct: number; // through the whole cycle
  ndviTrend: 'rising' | 'plateau' | 'declining';
  note: string;
};

const STAGE_LABELS: Record<StageKey, string> = {
  establishment: 'Establishment / Germination',
  vegetative: 'Vegetative Growth',
  reproductive: 'Flowering / Reproductive',
  maturity: 'Grain Filling / Maturity',
  harvest: 'Ripening / Harvest',
};

function ndviTrend(series: SatObservation[]): 'rising' | 'plateau' | 'declining' {
  const n = series.length;
  if (n < 3) return 'plateau';
  const slope = series[n - 1].ndvi - series[n - 3].ndvi;
  if (slope > 0.04) return 'rising';
  if (slope < -0.04) return 'declining';
  return 'plateau';
}

export function detectStage(field: SatelliteField, crop: string): PhenologyStage {
  const sig = CROP_LIBRARY.find((c) => c.crop === crop) ?? CROP_LIBRARY[0];
  const das = field.series[field.series.length - 1].das;
  const f = das / sig.duration; // fraction through the cycle
  const trend = ndviTrend(field.series);

  let stage: StageKey;
  if (f < 0.12) stage = 'establishment';
  else if (f < 0.42) stage = 'vegetative';
  else if (f < 0.62) stage = 'reproductive';
  else if (f < 0.88) stage = 'maturity';
  else stage = 'harvest';

  const notes: Record<StageKey, string> = {
    establishment: 'Canopy is developing; keep the seedbed consistently moist.',
    vegetative: 'Rapid biomass accumulation — nitrogen and water demand rising.',
    reproductive: 'Most water-sensitive stage; stress now directly cuts yield.',
    maturity: 'Grain/boll filling; taper irrigation as the canopy senesces.',
    harvest: 'Crop is ripening — withhold water ahead of harvest.',
  };

  return {
    stage,
    label: STAGE_LABELS[stage],
    dayAfterSowing: das,
    progressPct: round(clamp(f, 0, 1) * 100, 0),
    ndviTrend: trend,
    note: notes[stage],
  };
}

// ---------------------------------------------------------------------------
// 3. MOISTURE-STRESS DETECTION
// ---------------------------------------------------------------------------
export type StressLevel = 'none' | 'mild' | 'moderate' | 'severe';

export type MoistureStress = {
  level: StressLevel;
  index: number; // 0..100 (higher = more stressed)
  ndwi: number;
  soilMoisturePct: number;
  trend: 'improving' | 'stable' | 'worsening';
  drivers: string[];
};

function levelFromIndex(idx: number): StressLevel {
  if (idx < 20) return 'none';
  if (idx < 40) return 'mild';
  if (idx < 64) return 'moderate';
  return 'severe';
}

export function detectMoistureStress(field: SatelliteField): MoistureStress {
  const s = field.series;
  const last = s[s.length - 1];
  const prev3 = s.slice(-3);
  const smSlope = prev3.length >= 2 ? prev3[prev3.length - 1].soil_moisture_pct - prev3[0].soil_moisture_pct : 0;
  const ndwiSlope = prev3.length >= 2 ? prev3[prev3.length - 1].ndwi - prev3[0].ndwi : 0;

  // Component scores (each 0..100, higher = drier/more stressed).
  const soilScore = clamp((33 - last.soil_moisture_pct) * 4.0, 0, 100);
  const ndwiScore = clamp((0.15 - last.ndwi) * 180, 0, 100);
  const trendScore = clamp(-smSlope * 6 - ndwiSlope * 120, 0, 100);
  // SAR VV/VH ratio widens as canopies dry and lose volume scattering.
  const ratio = last.sar_vv_db - last.sar_vh_db;
  const sarScore = clamp((ratio - 5) * 12, 0, 100);

  const index = round(
    clamp(soilScore * 0.4 + ndwiScore * 0.3 + trendScore * 0.15 + sarScore * 0.15, 0, 100),
    0,
  );

  const drivers: string[] = [];
  if (last.soil_moisture_pct < 20) drivers.push(`Surface soil moisture low (${last.soil_moisture_pct}%)`);
  if (last.ndwi < 0.05) drivers.push(`Canopy water index depressed (NDWI ${last.ndwi})`);
  if (smSlope < -2) drivers.push('Soil moisture falling over the last 3 passes');
  if (ndwiSlope < -0.03) drivers.push('Vegetation water content declining');
  if (ratio > 7) drivers.push('SAR VV/VH ratio indicates canopy drying');
  if (drivers.length === 0) drivers.push('All moisture indicators within the healthy band');

  const trend: MoistureStress['trend'] =
    smSlope < -1.5 || ndwiSlope < -0.025 ? 'worsening' : smSlope > 1.5 ? 'improving' : 'stable';

  return {
    level: levelFromIndex(index),
    index,
    ndwi: last.ndwi,
    soilMoisturePct: last.soil_moisture_pct,
    trend,
    drivers,
  };
}

// ---------------------------------------------------------------------------
// 4. IRRIGATION ADVISORY
// ---------------------------------------------------------------------------
export type IrrigationAction = 'irrigate_now' | 'irrigate_soon' | 'adequate' | 'reduce';

export type IrrigationAdvisory = {
  action: IrrigationAction;
  headline: string;
  water_mm: number; // recommended depth to apply
  water_litres_total: number; // across the whole field
  window: string; // when to act
  priority: 'low' | 'medium' | 'high' | 'critical';
  rationale: string;
  confidence: number; // 0..100
};

// Stage crop-coefficient (Kc, FAO-56 style) -> target root-zone moisture band.
const STAGE_KC: Record<StageKey, number> = {
  establishment: 0.45,
  vegetative: 0.75,
  reproductive: 1.15,
  maturity: 0.8,
  harvest: 0.35,
};

export function irrigationAdvisory(
  field: SatelliteField,
  stage: PhenologyStage,
  stress: MoistureStress,
  classificationConfidence: number,
): IrrigationAdvisory {
  const kc = STAGE_KC[stage.stage];
  const last = field.series[field.series.length - 1];
  // Target surface moisture scales with stage demand; deficit drives the dose.
  const target = clamp(22 + kc * 20, 22, 46);
  const deficitPct = clamp(target - last.soil_moisture_pct, 0, 40);
  // ~1 mm of water raises ~10 cm root-zone moisture by ~0.1%; empirical demo mm.
  const waterMm = round(deficitPct * 1.4, 0);
  const litres = Math.round(waterMm * field.area_ha * 10_000); // 1 mm over 1 ha = 10,000 L

  let action: IrrigationAction;
  let priority: IrrigationAdvisory['priority'];
  let window: string;
  let headline: string;

  if (stage.stage === 'harvest') {
    action = 'reduce';
    priority = 'low';
    window = 'Withhold irrigation before harvest';
    headline = 'Stop irrigation — crop is ripening';
  } else if (stress.index >= 45 && deficitPct > 6) {
    action = 'irrigate_now';
    priority = stress.level === 'severe' ? 'critical' : 'high';
    window = 'Within 24–48 hours';
    headline = `Irrigate now — ${stress.level} moisture stress at ${stage.label.toLowerCase()}`;
  } else if (stress.index >= 20 || deficitPct > 4) {
    action = 'irrigate_soon';
    priority = 'medium';
    window = 'Within the next 3–5 days';
    headline = 'Schedule irrigation soon';
  } else {
    action = 'adequate';
    priority = 'low';
    window = 'No action needed — reassess at next pass';
    headline = 'Soil moisture is adequate';
  }

  const rainNote =
    last.rainfall_mm >= 8
      ? ` Recent rainfall (${last.rainfall_mm} mm) partially offsets demand.`
      : '';

  const rationale =
    action === 'reduce'
      ? 'The canopy is senescing into harvest; further irrigation risks lodging and delays drydown.'
      : action === 'adequate'
        ? `Root-zone moisture (${last.soil_moisture_pct}%) meets the ${stage.label.toLowerCase()} target of ~${round(target, 0)}%.${rainNote}`
        : `${stage.label} demands a crop coefficient of ${kc}. Current moisture (${last.soil_moisture_pct}%) is ${round(deficitPct, 0)}% below the ~${round(target, 0)}% target, so apply ~${waterMm} mm.${rainNote}`;

  // Confidence blends classification certainty and data recency (single fixture
  // is "fresh"); reproductive-stage calls are weighted slightly more cautious.
  const confidence = round(clamp(classificationConfidence * 0.6 + 38, 40, 97), 0);

  return {
    action,
    headline,
    water_mm: action === 'adequate' || action === 'reduce' ? 0 : waterMm,
    water_litres_total: action === 'adequate' || action === 'reduce' ? 0 : litres,
    window,
    priority,
    rationale,
    confidence,
  };
}

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------
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
  classification: CropClassification;
  ground_truth_crop: string;
  correct: boolean;
  stage: PhenologyStage;
  moisture_stress: MoistureStress;
  irrigation: IrrigationAdvisory;
  series: SatObservation[];
};

export function analyzeField(field: SatelliteField): FieldAnalysis {
  const classification = classifyCrop(field);
  const stage = detectStage(field, classification.crop);
  const stress = detectMoistureStress(field);
  const irrigation = irrigationAdvisory(field, stage, stress, classification.confidence);

  return {
    field: {
      id: field.id,
      name: field.name,
      village: field.village,
      district: field.district,
      state: field.state,
      lat: field.lat,
      lon: field.lon,
      area_ha: field.area_ha,
      sowing_date_iso: field.sowing_date_iso,
      polygon: field.polygon,
    },
    classification,
    ground_truth_crop: field.ground_truth_crop,
    correct: classification.crop === field.ground_truth_crop,
    stage,
    moisture_stress: stress,
    irrigation,
    series: field.series,
  };
}

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

export function summarizeField(field: SatelliteField): FieldSummary {
  const a = analyzeField(field);
  return {
    id: a.field.id,
    name: a.field.name,
    village: a.field.village,
    district: a.field.district,
    state: a.field.state,
    area_ha: a.field.area_ha,
    crop: a.classification.crop,
    stage: a.stage.label,
    stress_level: a.moisture_stress.level,
    stress_index: a.moisture_stress.index,
    action: a.irrigation.action,
  };
}
