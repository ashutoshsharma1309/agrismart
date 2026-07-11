import { describe, it, expect } from 'vitest';
import { deriveAlerts } from './alerts.js';
import type { ForecastDay, ForecastResponse } from './openweather.js';

function day(date_iso: string, overrides: Partial<ForecastDay> = {}): ForecastDay {
  return {
    date_iso,
    temp_min_c: 15,
    temp_max_c: 30,
    humidity_avg_pct: 50,
    precipitation_mm: 0,
    condition: { label: 'Clear', icon: 'x', description: 'clear sky' },
    wind_speed_avg_ms: 3,
    ...overrides,
  };
}

function forecast(days: ForecastDay[]): ForecastResponse {
  return {
    location: { name: 'Test', country: 'IN', lat: 0, lon: 0 },
    days,
    source: 'openweathermap',
    cached: false,
  };
}

function alertsOf(days: ForecastDay[], lang = 'en') {
  return deriveAlerts(forecast(days), lang);
}

describe('heat_wave', () => {
  it('flags a single heat-wave alert for a run of days >= 38C', () => {
    const alerts = alertsOf([
      day('2026-05-01', { temp_max_c: 38 }),
      day('2026-05-02', { temp_max_c: 39 }),
    ]);
    const heat = alerts.filter((a) => a.type === 'heat_wave');
    expect(heat).toHaveLength(1);
    expect(heat[0].severity).toBe('moderate');
  });

  it('is severe when the peak reaches 41C', () => {
    const alerts = alertsOf([day('2026-05-01', { temp_max_c: 41 })]);
    expect(alerts.find((a) => a.type === 'heat_wave')?.severity).toBe('severe');
  });

  it('uses the run peak to decide severity (38, 42, 39 -> severe)', () => {
    const alerts = alertsOf([
      day('2026-05-01', { temp_max_c: 38 }),
      day('2026-05-02', { temp_max_c: 42 }),
      day('2026-05-03', { temp_max_c: 39 }),
    ]);
    const heat = alerts.find((a) => a.type === 'heat_wave');
    expect(heat?.severity).toBe('severe');
  });
});

describe('heavy_rain', () => {
  it('is moderate at >= 50 mm and severe at >= 100 mm', () => {
    expect(alertsOf([day('2026-06-01', { precipitation_mm: 50 })]).find((a) => a.type === 'heavy_rain')?.severity).toBe(
      'moderate',
    );
    expect(alertsOf([day('2026-06-01', { precipitation_mm: 120 })]).find((a) => a.type === 'heavy_rain')?.severity).toBe(
      'severe',
    );
  });

  it('does not fire below the 50 mm threshold', () => {
    expect(alertsOf([day('2026-06-01', { precipitation_mm: 49.9 })]).some((a) => a.type === 'heavy_rain')).toBe(false);
  });
});

describe('high_wind', () => {
  it('is moderate at >= 12 m/s and severe at >= 18 m/s', () => {
    expect(alertsOf([day('2026-06-01', { wind_speed_avg_ms: 12 })]).find((a) => a.type === 'high_wind')?.severity).toBe(
      'moderate',
    );
    expect(alertsOf([day('2026-06-01', { wind_speed_avg_ms: 20 })]).find((a) => a.type === 'high_wind')?.severity).toBe(
      'severe',
    );
  });
});

describe('cold_snap', () => {
  it('is moderate at <= 5C and severe at <= 2C', () => {
    expect(alertsOf([day('2026-01-01', { temp_min_c: 4 })]).find((a) => a.type === 'cold_snap')?.severity).toBe(
      'moderate',
    );
    expect(alertsOf([day('2026-01-01', { temp_min_c: 1 })]).find((a) => a.type === 'cold_snap')?.severity).toBe(
      'severe',
    );
  });

  it('grades a multi-day run by its COLDEST day, not the largest magnitude', () => {
    // Regression: a warmer day (4C) must not mask the severe cold of 1C. The
    // run peak is the minimum temperature for cold snaps.
    const alerts = alertsOf([
      day('2026-01-01', { temp_min_c: 4 }),
      day('2026-01-02', { temp_min_c: 1 }),
      day('2026-01-03', { temp_min_c: 3 }),
    ]);
    const cold = alerts.filter((a) => a.type === 'cold_snap');
    expect(cold).toHaveLength(1);
    expect(cold[0].severity).toBe('severe');
    expect(cold[0].start_date_iso).toBe('2026-01-01');
    expect(cold[0].end_date_iso).toBe('2026-01-03');
  });
});

describe('run collapsing', () => {
  it('collapses consecutive matching days into a single alert spanning the run', () => {
    const alerts = alertsOf([
      day('2026-05-01', { temp_max_c: 39 }),
      day('2026-05-02', { temp_max_c: 40 }),
      day('2026-05-03', { temp_max_c: 38 }),
    ]);
    const heat = alerts.filter((a) => a.type === 'heat_wave');
    expect(heat).toHaveLength(1);
    expect(heat[0].start_date_iso).toBe('2026-05-01');
    expect(heat[0].end_date_iso).toBe('2026-05-03');
  });

  it('splits non-consecutive matching days into separate alerts', () => {
    const alerts = alertsOf([
      day('2026-05-01', { temp_max_c: 39 }),
      day('2026-05-02', { temp_max_c: 30 }), // gap: below threshold
      day('2026-05-03', { temp_max_c: 39 }),
    ]);
    const heat = alerts.filter((a) => a.type === 'heat_wave');
    expect(heat).toHaveLength(2);
    expect(heat[0].start_date_iso).toBe('2026-05-01');
    expect(heat[0].end_date_iso).toBe('2026-05-01');
    expect(heat[1].start_date_iso).toBe('2026-05-03');
    expect(heat[1].end_date_iso).toBe('2026-05-03');
  });
});

describe('no-match', () => {
  it('returns an empty array when nothing crosses any threshold', () => {
    const alerts = alertsOf([
      day('2026-04-01', { temp_max_c: 30, temp_min_c: 18, precipitation_mm: 2, wind_speed_avg_ms: 4 }),
      day('2026-04-02', { temp_max_c: 33, temp_min_c: 20, precipitation_mm: 0, wind_speed_avg_ms: 5 }),
    ]);
    expect(alerts).toEqual([]);
  });
});

describe('localization', () => {
  it("returns a non-empty Hindi title differing from the English title", () => {
    const days = [day('2026-05-01', { temp_max_c: 42 })];
    const en = alertsOf(days, 'en').find((a) => a.type === 'heat_wave');
    const hi = alertsOf(days, 'hi').find((a) => a.type === 'heat_wave');
    expect(en?.title).toBeTruthy();
    expect(hi?.title).toBeTruthy();
    expect(hi?.title).not.toBe(en?.title);
  });

  it('falls back to English for an unknown language code', () => {
    const days = [day('2026-05-01', { temp_max_c: 42 })];
    const en = alertsOf(days, 'en').find((a) => a.type === 'heat_wave');
    const unknown = alertsOf(days, 'zz').find((a) => a.type === 'heat_wave');
    expect(unknown?.title).toBe(en?.title);
  });
});
