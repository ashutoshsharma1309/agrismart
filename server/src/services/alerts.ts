import { getAlertStrings, type AlertKind } from '../i18n/alerts.js';
import type { ForecastDay, ForecastResponse } from './openweather.js';

export type DerivedAlert = {
  type: AlertKind;
  severity: 'moderate' | 'severe';
  start_date_iso: string;
  end_date_iso: string;
  title: string;
  description: string;
  recommended_action: string;
};

type Rule = {
  kind: AlertKind;
  test: (d: ForecastDay) => { matches: boolean; value: number };
  severityAt: (value: number) => 'moderate' | 'severe';
  // Which direction along `value` is more severe. For heat/rain/wind the higher
  // reading is worse; for a cold snap the *lower* temperature is worse. This
  // decides which day drives a multi-day run's severity.
  worst: 'higher' | 'lower';
};

const rules: Rule[] = [
  {
    kind: 'heat_wave',
    test: (d) => ({ matches: d.temp_max_c >= 38, value: d.temp_max_c }),
    severityAt: (v) => (v >= 41 ? 'severe' : 'moderate'),
    worst: 'higher',
  },
  {
    kind: 'heavy_rain',
    test: (d) => ({ matches: d.precipitation_mm >= 50, value: d.precipitation_mm }),
    severityAt: (v) => (v >= 100 ? 'severe' : 'moderate'),
    worst: 'higher',
  },
  {
    kind: 'high_wind',
    test: (d) => ({ matches: d.wind_speed_avg_ms >= 12, value: d.wind_speed_avg_ms }),
    severityAt: (v) => (v >= 18 ? 'severe' : 'moderate'),
    worst: 'higher',
  },
  {
    kind: 'cold_snap',
    test: (d) => ({ matches: d.temp_min_c <= 5, value: d.temp_min_c }),
    severityAt: (v) => (v <= 2 ? 'severe' : 'moderate'),
    worst: 'lower',
  },
];

function dateLabel(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function deriveAlerts(forecast: ForecastResponse, lang: string): DerivedAlert[] {
  const alerts: DerivedAlert[] = [];
  for (const rule of rules) {
    let run: { start: ForecastDay; end: ForecastDay; peak: number } | null = null;
    for (const day of forecast.days) {
      const r = rule.test(day);
      if (r.matches) {
        if (!run) run = { start: day, end: day, peak: r.value };
        else {
          run.end = day;
          // Keep the most-severe reading in the run: the highest value for
          // heat/rain/wind, the lowest for a cold snap.
          run.peak =
            rule.worst === 'lower'
              ? Math.min(r.value, run.peak)
              : Math.max(r.value, run.peak);
        }
      } else if (run) {
        alerts.push(buildAlert(rule, run, lang));
        run = null;
      }
    }
    if (run) alerts.push(buildAlert(rule, run, lang));
  }
  return alerts;
}

function buildAlert(
  rule: Rule,
  run: { start: ForecastDay; end: ForecastDay; peak: number },
  lang: string,
): DerivedAlert {
  const severity = rule.severityAt(run.peak);
  const label = dateLabel(run.start.date_iso);
  const strings = getAlertStrings(lang, rule.kind, { value: run.peak, dateLabel: label });
  return {
    type: rule.kind,
    severity,
    start_date_iso: run.start.date_iso,
    end_date_iso: run.end.date_iso,
    ...strings,
  };
}
