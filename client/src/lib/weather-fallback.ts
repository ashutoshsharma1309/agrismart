// Last-resort fallback used when the backend proxy is unreachable
// (dev mode offline, backend not running, etc.). Keeps the app usable
// instead of showing a hard error. Never makes any network call.

import fallbackData from '../data/weather.fallback.json';
import { hashString, seededRandom } from './utils';
import type {
  AlertsResponse,
  CurrentWeather,
  ForecastDay,
  ForecastResponse,
  WeatherAlert,
} from './weather-client';

type RawForecastDay = {
  date: string;
  hi: number;
  lo: number;
  condition: string;
  rain: number;
  label: string;
};

type RawEntry = {
  current: { temp: number; feelsLike: number; humidity: number; wind: number; condition: string };
  forecast: RawForecastDay[];
};

type RawData = Record<string, RawEntry>;

// Frontend picks its own icon via Lucide based on condition.label/code,
// so the URL here is intentionally empty.
const FALLBACK_ICON = '';

function conditionLabel(c: string): { label: string; description: string } {
  const map: Record<string, { label: string; description: string }> = {
    rain: { label: 'Rain', description: 'Showers' },
    cloudy: { label: 'Clouds', description: 'Cloudy' },
    'partly-cloudy': { label: 'Clouds', description: 'Partly cloudy' },
    sunny: { label: 'Clear', description: 'Clear sky' },
    hot: { label: 'Clear', description: 'Hot and clear' },
    humid: { label: 'Humidity', description: 'Humid' },
  };
  return map[c] ?? { label: 'Unknown', description: c };
}

function pickEntry(query: string): { key: string; entry: RawEntry } {
  const data = fallbackData as RawData;
  const match = Object.keys(data).find(
    (k) => k.toLowerCase() === query.trim().toLowerCase(),
  );
  if (match) return { key: match, entry: data[match] };
  // Synthesise a deterministic forecast for any query so we never throw.
  const seed = hashString(query);
  const rand = seededRandom(seed);
  const baseTemp = 22 + Math.floor(rand() * 14);
  const forecast: RawForecastDay[] = Array.from({ length: 7 }).map((_, i) => {
    const swing = Math.floor(rand() * 6) - 2;
    const rain = rand() > 0.75 ? Math.floor(rand() * 60) : Math.floor(rand() * 10);
    const hi = baseTemp + swing + 4;
    const lo = baseTemp + swing - 4;
    let condition = 'sunny';
    let label = 'Sunny';
    if (rain > 40) {
      condition = 'rain';
      label = 'Showers';
    } else if (rain > 15) {
      condition = 'cloudy';
      label = 'Cloudy';
    } else if (hi > 38) {
      condition = 'hot';
      label = 'Hot';
    } else if (rain > 0) {
      condition = 'partly-cloudy';
      label = 'Partly cloudy';
    }
    return { date: `Day ${i + 1}`, hi, lo, condition, rain, label };
  });
  return {
    key: query,
    entry: {
      current: {
        temp: baseTemp + 4,
        feelsLike: baseTemp + 5,
        humidity: 45 + Math.floor(rand() * 40),
        wind: 6 + Math.floor(rand() * 16),
        condition: forecast[0].condition,
      },
      forecast,
    },
  };
}

export function fallbackCurrent(query: string): CurrentWeather {
  const { key, entry } = pickEntry(query);
  const cond = conditionLabel(entry.current.condition);
  const now = Date.now();
  return {
    location: { name: key, country: 'IN', lat: 0, lon: 0 },
    current: {
      temp_c: entry.current.temp,
      feels_like_c: entry.current.feelsLike,
      humidity_pct: entry.current.humidity,
      pressure_hpa: 1012,
      wind_speed_ms: entry.current.wind / 3.6,
      wind_deg: 0,
      cloud_cover_pct: 0,
      visibility_m: 10000,
      condition: {
        code: 0,
        label: cond.label,
        icon: FALLBACK_ICON,
        description: cond.description,
      },
    },
    sun: {
      sunrise_iso: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      sunset_iso: new Date(now + 6 * 60 * 60 * 1000).toISOString(),
    },
    observed_at_iso: new Date(now).toISOString(),
    source: 'openweathermap',
    cached: true,
    stale: true,
  };
}

export function fallbackForecast(query: string): ForecastResponse {
  const { key, entry } = pickEntry(query);
  const start = new Date();
  const days: ForecastDay[] = entry.forecast.slice(0, 5).map((f, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const cond = conditionLabel(f.condition);
    return {
      date_iso: d.toISOString().slice(0, 10),
      temp_min_c: f.lo,
      temp_max_c: f.hi,
      humidity_avg_pct: entry.current.humidity,
      precipitation_mm: f.rain,
      wind_speed_avg_ms: entry.current.wind / 3.6,
      condition: { ...cond, icon: FALLBACK_ICON },
    };
  });
  return {
    location: { name: key, country: 'IN', lat: 0, lon: 0 },
    days,
    source: 'openweathermap',
    cached: true,
    stale: true,
    notice: 'Offline preview — backend proxy unreachable',
  };
}

export function fallbackAlerts(query: string): AlertsResponse {
  const forecast = fallbackForecast(query);
  const alerts: WeatherAlert[] = [];
  for (const d of forecast.days) {
    if (d.temp_max_c >= 38) {
      alerts.push({
        type: 'heat_wave',
        severity: d.temp_max_c >= 41 ? 'severe' : 'moderate',
        start_date_iso: d.date_iso,
        end_date_iso: d.date_iso,
        title: 'Heat wave expected',
        description: `Daytime highs around ${d.temp_max_c}°C.`,
        recommended_action: 'Mulch the root zone and water before 8 AM.',
      });
    }
    if (d.precipitation_mm >= 50) {
      alerts.push({
        type: 'heavy_rain',
        severity: d.precipitation_mm >= 100 ? 'severe' : 'moderate',
        start_date_iso: d.date_iso,
        end_date_iso: d.date_iso,
        title: 'Heavy rain likely',
        description: `Forecast rainfall around ${d.precipitation_mm} mm.`,
        recommended_action: 'Clear drainage channels today.',
      });
    }
  }
  return {
    location: forecast.location,
    alerts,
    source: 'openweathermap',
    cached: true,
    stale: true,
  };
}
