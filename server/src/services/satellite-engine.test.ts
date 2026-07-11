import { describe, it, expect } from 'vitest';
import {
  CROP_LIBRARY,
  classifyCrop,
  detectStage,
  detectMoistureStress,
  irrigationAdvisory,
  analyzeField,
  summarizeField,
  type StageKey,
  type MoistureStress,
  type PhenologyStage,
} from './satellite-engine.js';
import {
  SATELLITE_FIELDS,
  type SatelliteField,
  type SatObservation,
} from '../data/satellite-fields.js';

const CROP_NAMES = new Set(CROP_LIBRARY.map((c) => c.crop));
const VALID_STAGES: StageKey[] = [
  'establishment',
  'vegetative',
  'reproductive',
  'maturity',
  'harvest',
];

// Minimal observation/field builders for the synthetic-fixture cases (stage
// bands + harvest irrigation), where we need to hit an exact day-after-sowing.
function obs(partial: Partial<SatObservation> & { das: number }): SatObservation {
  return {
    date_iso: '2026-01-01',
    ndvi: 0.5,
    ndwi: 0.1,
    sar_vv_db: -12,
    sar_vh_db: -16,
    soil_moisture_pct: 30,
    rainfall_mm: 0,
    ...partial,
  };
}

function makeField(series: SatObservation[], overrides: Partial<SatelliteField> = {}): SatelliteField {
  return {
    id: 'test-field',
    name: 'Test Field',
    village: 'V',
    district: 'D',
    state: 'S',
    lat: 10,
    lon: 79,
    area_ha: 2,
    sowing_date_iso: '2026-01-01',
    ground_truth_crop: 'Rice',
    polygon: [
      [10, 79],
      [10, 79],
    ],
    series,
    ...overrides,
  };
}

describe('classifyCrop', () => {
  for (const field of SATELLITE_FIELDS) {
    describe(field.id, () => {
      const c = classifyCrop(field);

      it('returns a crop that exists in CROP_LIBRARY', () => {
        expect(CROP_NAMES.has(c.crop)).toBe(true);
      });

      it('has a confidence in (0, 100]', () => {
        expect(c.confidence).toBeGreaterThan(0);
        expect(c.confidence).toBeLessThanOrEqual(100);
      });

      it('sorts alternatives strictly descending by probability', () => {
        for (let i = 1; i < c.alternatives.length; i++) {
          expect(c.alternatives[i - 1].probability).toBeGreaterThanOrEqual(
            c.alternatives[i].probability,
          );
        }
      });

      it('has a top confidence >= every alternative probability (calibrated softmax)', () => {
        // confidence is probs[0] (the argmax of the softmax distribution); every
        // alternative is a later entry of the same descending-sorted list.
        for (const alt of c.alternatives) {
          expect(c.confidence).toBeGreaterThanOrEqual(alt.probability);
        }
      });

      it('exposes up to 3 alternatives, none equal to the chosen crop', () => {
        expect(c.alternatives.length).toBeLessThanOrEqual(3);
        for (const alt of c.alternatives) {
          expect(alt.crop).not.toBe(c.crop);
        }
      });
    });
  }
});

describe('detectStage', () => {
  it('maps stage bands correctly from the day-after-sowing fraction', () => {
    // Rice: duration 135. f = das/135. Bands: <0.12 est, <0.42 veg,
    // <0.62 repro, <0.88 maturity, else harvest.
    const cases: { das: number; expected: StageKey }[] = [
      { das: 12, expected: 'establishment' }, // 0.089
      { das: 36, expected: 'vegetative' }, // 0.267
      { das: 72, expected: 'reproductive' }, // 0.533
      { das: 108, expected: 'maturity' }, // 0.8
      { das: 126, expected: 'harvest' }, // 0.933
    ];
    for (const { das, expected } of cases) {
      const field = makeField([obs({ das })]);
      const stage = detectStage(field, 'Rice');
      expect(stage.stage).toBe(expected);
    }
  });

  it('produces a valid stage key and progressPct within 0..100 for every fixture', () => {
    for (const field of SATELLITE_FIELDS) {
      const cls = classifyCrop(field);
      const stage = detectStage(field, cls.crop);
      expect(VALID_STAGES).toContain(stage.stage);
      expect(stage.progressPct).toBeGreaterThanOrEqual(0);
      expect(stage.progressPct).toBeLessThanOrEqual(100);
      expect(stage.dayAfterSowing).toBe(field.series[field.series.length - 1].das);
    }
  });
});

describe('detectMoistureStress', () => {
  function bandForLevel(level: MoistureStress['level'], idx: number) {
    switch (level) {
      case 'none':
        return idx < 20;
      case 'mild':
        return idx >= 20 && idx < 40;
      case 'moderate':
        return idx >= 40 && idx < 64;
      case 'severe':
        return idx >= 64;
    }
  }

  for (const field of SATELLITE_FIELDS) {
    it(`${field.id}: index 0..100 and level consistent with the index band`, () => {
      const s = detectMoistureStress(field);
      expect(s.index).toBeGreaterThanOrEqual(0);
      expect(s.index).toBeLessThanOrEqual(100);
      expect(bandForLevel(s.level, s.index)).toBe(true);
      expect(Array.isArray(s.drivers)).toBe(true);
      expect(s.drivers.length).toBeGreaterThan(0);
    });
  }
});

describe('irrigationAdvisory', () => {
  const stress: MoistureStress = {
    level: 'none',
    index: 5,
    ndwi: 0.2,
    soilMoisturePct: 40,
    trend: 'stable',
    drivers: ['ok'],
  };

  it("returns action 'reduce' with zero water at the harvest stage", () => {
    const harvestStage: PhenologyStage = {
      stage: 'harvest',
      label: 'Ripening / Harvest',
      dayAfterSowing: 130,
      progressPct: 96,
      ndviTrend: 'declining',
      note: 'x',
    };
    const field = makeField([obs({ das: 130, soil_moisture_pct: 25 })]);
    const adv = irrigationAdvisory(field, harvestStage, stress, 80);
    expect(adv.action).toBe('reduce');
    expect(adv.water_mm).toBe(0);
    expect(adv.water_litres_total).toBe(0);
  });

  it('reports zero total litres whenever the action is adequate or reduce, and confidence 40..97', () => {
    for (const field of SATELLITE_FIELDS) {
      const a = analyzeField(field);
      const adv = a.irrigation;
      if (adv.action === 'adequate' || adv.action === 'reduce') {
        expect(adv.water_litres_total).toBe(0);
        expect(adv.water_mm).toBe(0);
      } else {
        expect(adv.water_litres_total).toBeGreaterThan(0);
      }
      expect(adv.confidence).toBeGreaterThanOrEqual(40);
      expect(adv.confidence).toBeLessThanOrEqual(97);
    }
  });
});

describe('analyzeField / summarizeField', () => {
  it('produces correctly-shaped analysis with correct === (crop === ground_truth)', () => {
    for (const field of SATELLITE_FIELDS) {
      const a = analyzeField(field);
      expect(a.field.id).toBe(field.id);
      expect(a.ground_truth_crop).toBe(field.ground_truth_crop);
      expect(a.correct).toBe(a.classification.crop === field.ground_truth_crop);
      expect(a.series).toBe(field.series);
      expect(CROP_NAMES.has(a.classification.crop)).toBe(true);
      expect(VALID_STAGES).toContain(a.stage.stage);
    }
  });

  it('classifies a majority of fixtures correctly (fixtures carry genuine signal)', () => {
    const results = SATELLITE_FIELDS.map((f) => analyzeField(f));
    const correct = results.filter((r) => r.correct).length;
    // Fixtures are designed with a real spectral/temporal signature per crop,
    // so most should classify to their ground truth.
    // eslint-disable-next-line no-console
    console.log(
      `[satellite-engine] classified ${correct}/${SATELLITE_FIELDS.length} fixtures correctly:`,
      results.map((r) => `${r.ground_truth_crop}->${r.classification.crop}`).join(', '),
    );
    expect(correct).toBeGreaterThanOrEqual(Math.ceil(SATELLITE_FIELDS.length / 2));
  });

  it('summarizeField exposes the expected flat summary shape', () => {
    for (const field of SATELLITE_FIELDS) {
      const s = summarizeField(field);
      expect(s).toEqual({
        id: field.id,
        name: field.name,
        village: field.village,
        district: field.district,
        state: field.state,
        area_ha: field.area_ha,
        crop: expect.any(String),
        stage: expect.any(String),
        stress_level: expect.stringMatching(/^(none|mild|moderate|severe)$/),
        stress_index: expect.any(Number),
        action: expect.stringMatching(/^(irrigate_now|irrigate_soon|adequate|reduce)$/),
      });
    }
  });
});

describe('determinism', () => {
  it('analyzeField yields deeply-equal results across repeated calls', () => {
    for (const field of SATELLITE_FIELDS) {
      expect(analyzeField(field)).toEqual(analyzeField(field));
    }
  });
});
