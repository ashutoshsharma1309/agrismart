# Satellite Crop Advisory Module

AI-driven crop-type classification, stage-wise phenology mapping, moisture-stress
detection, and irrigation advisory from **fused optical + microwave (SAR)
satellite signatures**.

This module implements the problem statement:

> *AI-Driven Automated Crop-type, Moisture-Stress Detection and Irrigation
> Advisory Across Growth Stages Using Moderate-Resolution Spectral Signatures
> (Optical & Microwave Satellite Data).*

---

## What it does

For every monitored field, the engine ingests a time-series of satellite
observations and produces four deliverables:

| # | Deliverable | Method |
|---|-------------|--------|
| 1 | **Crop-type classification** | Optical–SAR temporal signature matching (nearest-centroid over NDVI phenology curves + SAR establishment signal) |
| 2 | **Stage-wise phenology** | Day-after-sowing vs. crop-cycle fraction, cross-checked with the NDVI trend |
| 3 | **Moisture-stress detection** | Weighted index over NDWI, SAR-derived soil moisture, temporal trend, and VV/VH ratio |
| 4 | **Irrigation advisory** | Stage crop-coefficient (FAO-56 Kc) vs. current root-zone moisture deficit |

### Why optical **and** SAR

- **Optical** (Sentinel-2 / Landsat / LISS-IV) → NDVI (vegetation vigour) and
  NDWI (canopy water). High information content, but **blind under cloud**.
- **Microwave SAR** (Sentinel-1) → VV/VH backscatter, sensitive to soil moisture
  and crop structure, and **cloud-penetrating** — usable through the monsoon,
  exactly when irrigation decisions matter most.

Fusing the two gives all-weather monitoring and lets moisture stress be detected
from canopy-water and soil-moisture signals **before** it becomes visible as a
drop in greenness (NDVI lags NDWI under water stress).

---

## Architecture

```
Sentinel-2 optical ─┐
                    ├─► [ time-series fixtures ]  server/src/data/satellite-fields.ts
Sentinel-1 SAR ─────┘                │
                                     ▼
                    [ analysis engine ]  server/src/services/satellite-engine.ts
                    · classifyCrop()      · detectStage()
                    · detectMoistureStress()  · irrigationAdvisory()
                                     │
                                     ▼
                    [ REST API ]  server/src/routes/satellite.ts
                                     │
                                     ▼
                    [ React dashboard ]  client/src/features/satellite/SatellitePage.tsx
                    · field list · crop card · stress gauge
                    · stage timeline · irrigation card · optical & SAR charts
```

The engine is **pure and deterministic** — no LLM, no external API — so it always
runs and is fully unit-testable.

---

## API

Base URL: `${VITE_API_BASE_URL}` (default `http://localhost:4000`).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/satellite/overview` | Region headline stats (fields, area, stressed count, crop mix) |
| `GET` | `/api/satellite/fields` | All fields as lightweight summaries |
| `GET` | `/api/satellite/fields/:id` | Full analysis for one field |

All responses use the app-wide envelope `{ ok: boolean, data: … }`.

### Example

```bash
curl http://localhost:4000/api/satellite/fields/fld-yavatmal-03
```

```jsonc
{
  "ok": true,
  "data": {
    "classification": { "crop": "Cotton", "confidence": 87.4, "alternatives": [...] },
    "ground_truth_crop": "Cotton",
    "correct": true,
    "stage": { "stage": "maturity", "label": "Grain Filling / Maturity", "dayAfterSowing": 120 },
    "moisture_stress": { "level": "severe", "index": 66, "soilMoisturePct": 11.2, "ndwi": -0.24 },
    "irrigation": {
      "action": "irrigate_now",
      "headline": "Irrigate now — severe moisture stress at grain filling / maturity",
      "water_mm": 38, "water_litres_total": 912000, "priority": "critical"
    },
    "series": [ /* per-pass NDVI, NDWI, VV, VH, soil moisture, rainfall */ ]
  }
}
```

---

## Methodology detail

### Crop classification
Each reference crop has a canonical NDVI(day-after-sowing) phenology curve
(asymmetric bell) plus a mean early-season SAR VV level. For an observed field we
compute the **RMSE** between its NDVI trajectory and each crop's model curve,
add the SAR establishment distance (flooded paddy sits several dB lower early),
and apply a **duration prior** (a crop can't still be growing past its cycle
length). Distances go through a softmax to yield calibrated probabilities.

### Moisture-stress index (0–100)
```
index = 0.40·soilScore + 0.30·ndwiScore + 0.15·trendScore + 0.15·sarRatioScore
```
Bands: `none <20`, `mild 20–39`, `moderate 40–63`, `severe ≥64`.

### Irrigation advisory
Stage crop-coefficient (Kc: establishment 0.45 → reproductive 1.15 → harvest
0.35) sets a target root-zone moisture. The deficit vs. current SAR-derived soil
moisture drives the recommended depth (mm) and total volume (m³), and combines
with the stress index to pick `irrigate_now` / `irrigate_soon` / `adequate` /
`reduce`.

---

## From demo to production

The current build ships **realistic synthesized time-series** so the engine has
genuine signal to analyse without a live geospatial pipeline. To productionise:

1. **Data ingestion** — replace `satellite-fields.ts` with a Google Earth Engine
   / Sentinel Hub pipeline that pulls Sentinel-2 and Sentinel-1 scenes for each
   field polygon and computes NDVI/NDWI plus σ⁰ VV/VH per pass.
2. **SAR preprocessing** — ESA SNAP graph for calibration, speckle filtering,
   and terrain correction; derive soil moisture (e.g. change-detection or a
   trained regression).
3. **Classifier** — swap the nearest-centroid stand-in for a Random Forest or
   temporal CNN/LSTM trained on labelled Sentinel time-series (the `classifyCrop`
   interface stays identical).
4. **Field boundaries** — accept farmer-drawn or cadastral polygons instead of
   the demo squares.
5. **Scheduling** — a cron job re-runs analysis on each new satellite pass and
   pushes stress/irrigation alerts.

The API contract and the entire React dashboard remain unchanged through all of
the above — only the data and model layers evolve.

---

## Files

```
server/src/data/satellite-fields.ts       # observation fixtures + generator
server/src/services/satellite-engine.ts    # classification / phenology / stress / irrigation
server/src/routes/satellite.ts             # REST endpoints
client/src/lib/satellite-client.ts         # typed API client
client/src/features/satellite/SatellitePage.tsx  # dashboard UI
```
