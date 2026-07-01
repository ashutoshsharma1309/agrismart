// Satellite observation fixtures for the Crop + Moisture-Stress + Irrigation
// advisory engine.
//
// In production these per-field time-series come from a geospatial pipeline
// (Google Earth Engine / Sentinel Hub) that fuses:
//   • Sentinel-2 / Landsat / LISS-IV  -> optical indices (NDVI, NDWI)
//   • Sentinel-1 SAR                  -> VV/VH backscatter + derived soil moisture
//
// For a self-contained demo we synthesize physically-plausible phenology curves
// so the analysis engine (satellite-engine.ts) has genuine signal to work on.
// The engine never sees `ground_truth_crop`; it classifies purely from the
// spectral/temporal signatures below, and the UI compares its prediction back
// against the ground truth to show live accuracy.

export type SatObservation = {
  /** Acquisition date of the satellite pass. */
  date_iso: string;
  /** Days since sowing at this acquisition. */
  das: number;
  /** Normalised Difference Vegetation Index (optical), 0..1. */
  ndvi: number;
  /** Normalised Difference Water Index (optical canopy water), -1..1. */
  ndwi: number;
  /** Sentinel-1 VV backscatter (dB). */
  sar_vv_db: number;
  /** Sentinel-1 VH backscatter (dB). */
  sar_vh_db: number;
  /** Surface soil moisture (%) derived from SAR. */
  soil_moisture_pct: number;
  /** Rainfall since previous pass (mm). */
  rainfall_mm: number;
};

export type SatelliteField = {
  id: string;
  name: string;
  village: string;
  district: string;
  state: string;
  lat: number;
  lon: number;
  area_ha: number;
  sowing_date_iso: string;
  /** Held-out label — used only by the UI to display prediction accuracy. */
  ground_truth_crop: string;
  /** Field boundary ring [lat, lon] for the map overlay. */
  polygon: [number, number][];
  series: SatObservation[];
};

// ----- deterministic pseudo-random (seeded LCG) so fixtures never drift -----
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

type Phenology = {
  peakDay: number; // day-after-sowing of NDVI peak
  peakNdvi: number;
  baseNdvi: number;
  floodedEstablishment: boolean; // rice/paddy: standing water depresses early VV
  wetBaseline: number; // typical soil moisture (%) under no stress
};

type FieldSpec = {
  id: string;
  name: string;
  village: string;
  district: string;
  state: string;
  lat: number;
  lon: number;
  area_ha: number;
  sowing_date_iso: string;
  ground_truth_crop: string;
  passes: number; // number of satellite acquisitions so far
  cadenceDays: number; // revisit interval
  pheno: Phenology;
  /** Water-stress intensity 0..1 as a function of day-after-sowing. */
  stressAt: (das: number) => number;
  seed: number;
};

const DAY_MS = 86_400_000;

function polygonAround(lat: number, lon: number, areaHa: number): [number, number][] {
  // Rough square ring sized from area (1 ha ~ 100m x 100m; 0.001 deg ~ 111m).
  const side = Math.sqrt(areaHa) * 0.0009;
  return [
    [lat + side, lon - side],
    [lat + side, lon + side],
    [lat - side, lon + side],
    [lat - side, lon - side],
    [lat + side, lon - side],
  ];
}

function buildField(spec: FieldSpec): SatelliteField {
  const rnd = seeded(spec.seed);
  const { pheno } = spec;
  const sowMs = new Date(spec.sowing_date_iso).getTime();
  const spread = pheno.peakDay * 0.85; // width of the phenology bell

  const series: SatObservation[] = [];
  for (let i = 0; i < spec.passes; i++) {
    const das = (i + 1) * spec.cadenceDays;
    const stress = clamp(spec.stressAt(das), 0, 1);

    // NDVI: asymmetric bell (slower senescence than green-up), depressed by stress.
    const g = Math.exp(-Math.pow((das - pheno.peakDay) / spread, 2));
    const ndviClean = pheno.baseNdvi + (pheno.peakNdvi - pheno.baseNdvi) * g;
    // NDVI (greenness) lags moisture stress — canopy water (NDWI) and soil
    // moisture crash first, so NDVI is only mildly suppressed. This keeps the
    // crop's temporal signature classifiable even under severe water stress.
    const ndvi = clamp(ndviClean * (1 - 0.13 * stress) + (rnd() - 0.5) * 0.015, 0.05, 0.95);

    // NDWI tracks canopy water: falls sharply under moisture stress.
    const ndwi = clamp(-0.15 + ndvi * 0.55 - stress * 0.5 + (rnd() - 0.5) * 0.02, -0.6, 0.7);

    // Soil moisture: wet baseline eroded by stress, nudged by recent rainfall.
    const rainfall = clamp((1 - stress) * 12 * rnd() + (stress < 0.3 ? 4 : 0), 0, 30);
    const soil = clamp(
      pheno.wetBaseline * (1 - 0.8 * stress) + rainfall * 0.35 + (rnd() - 0.5) * 3,
      6,
      55,
    );

    // SAR VV: rises with biomass; flooded establishment pulls early passes down.
    const floodPull = pheno.floodedEstablishment && das < pheno.peakDay * 0.4 ? -6.5 : 0;
    const vv = -17 + ndvi * 8.5 + floodPull + (rnd() - 0.5) * 0.6;
    // VH (volume scattering) sits several dB below VV, grows with canopy structure.
    const vh = vv - (3.5 + ndvi * 3) + (rnd() - 0.5) * 0.5;

    series.push({
      date_iso: new Date(sowMs + das * DAY_MS).toISOString().slice(0, 10),
      das,
      ndvi: round(ndvi, 3),
      ndwi: round(ndwi, 3),
      sar_vv_db: round(vv, 2),
      sar_vh_db: round(vh, 2),
      soil_moisture_pct: round(soil, 1),
      rainfall_mm: round(rainfall, 1),
    });
  }

  return {
    id: spec.id,
    name: spec.name,
    village: spec.village,
    district: spec.district,
    state: spec.state,
    lat: spec.lat,
    lon: spec.lon,
    area_ha: spec.area_ha,
    sowing_date_iso: spec.sowing_date_iso,
    ground_truth_crop: spec.ground_truth_crop,
    polygon: polygonAround(spec.lat, spec.lon, spec.area_ha),
    series,
  };
}

function round(v: number, dp: number) {
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
}

// A ramp helper: 0 before `from`, rising to `peak` by `to`, then holding.
const ramp = (from: number, to: number, peak: number) => (das: number) =>
  das <= from ? 0 : das >= to ? peak : (peak * (das - from)) / (to - from);

const FIELD_SPECS: FieldSpec[] = [
  {
    id: 'fld-thanjavur-01',
    name: 'Kaveri Delta Plot A',
    village: 'Budalur',
    district: 'Thanjavur',
    state: 'Tamil Nadu',
    lat: 10.787,
    lon: 79.138,
    area_ha: 3.2,
    sowing_date_iso: '2026-02-05',
    ground_truth_crop: 'Rice',
    passes: 6,
    cadenceDays: 12,
    pheno: { peakDay: 72, peakNdvi: 0.83, baseNdvi: 0.22, floodedEstablishment: true, wetBaseline: 42 },
    // Reproductive-stage moisture stress from a canal-supply shortfall.
    stressAt: ramp(24, 84, 0.85),
    seed: 101,
  },
  {
    id: 'fld-ludhiana-02',
    name: 'Sutlej Bank Wheat',
    village: 'Jagraon',
    district: 'Ludhiana',
    state: 'Punjab',
    lat: 30.79,
    lon: 75.473,
    area_ha: 5.1,
    sowing_date_iso: '2026-04-02',
    ground_truth_crop: 'Wheat',
    passes: 4,
    cadenceDays: 12,
    pheno: { peakDay: 85, peakNdvi: 0.79, baseNdvi: 0.2, floodedEstablishment: false, wetBaseline: 38 },
    stressAt: () => 0.05, // well-irrigated, healthy
    seed: 202,
  },
  {
    id: 'fld-yavatmal-03',
    name: 'Vidarbha Cotton Block',
    village: 'Kalamb',
    district: 'Yavatmal',
    state: 'Maharashtra',
    lat: 20.393,
    lon: 78.13,
    area_ha: 2.4,
    sowing_date_iso: '2026-01-20',
    ground_truth_crop: 'Cotton',
    passes: 10,
    cadenceDays: 12,
    pheno: { peakDay: 95, peakNdvi: 0.71, baseNdvi: 0.18, floodedEstablishment: false, wetBaseline: 30 },
    // Severe late-season drought stress (rain-fed, dry spell).
    stressAt: ramp(48, 132, 0.95),
    seed: 303,
  },
  {
    id: 'fld-davangere-04',
    name: 'Bhadra Command Maize',
    village: 'Harihar',
    district: 'Davangere',
    state: 'Karnataka',
    lat: 14.512,
    lon: 75.804,
    area_ha: 4.0,
    sowing_date_iso: '2026-03-15',
    ground_truth_crop: 'Maize',
    passes: 3,
    cadenceDays: 12,
    pheno: { peakDay: 62, peakNdvi: 0.86, baseNdvi: 0.24, floodedEstablishment: false, wetBaseline: 34 },
    // Mild vegetative-stage stress; recoverable with one irrigation.
    stressAt: ramp(6, 42, 0.44),
    seed: 404,
  },
  {
    id: 'fld-kolhapur-05',
    name: 'Panchganga Sugarcane',
    village: 'Hatkanangale',
    district: 'Kolhapur',
    state: 'Maharashtra',
    lat: 16.746,
    lon: 74.44,
    area_ha: 6.5,
    sowing_date_iso: '2025-11-10',
    ground_truth_crop: 'Sugarcane',
    passes: 8,
    cadenceDays: 18,
    pheno: { peakDay: 150, peakNdvi: 0.85, baseNdvi: 0.26, floodedEstablishment: false, wetBaseline: 40 },
    stressAt: () => 0.08, // drip-irrigated, stable
    seed: 505,
  },
];

export const SATELLITE_FIELDS: SatelliteField[] = FIELD_SPECS.map(buildField);

export function getFieldById(id: string): SatelliteField | undefined {
  return SATELLITE_FIELDS.find((f) => f.id === id);
}
