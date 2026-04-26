// Client for our backend proxy. The upstream provider's key lives on the server,
// not here. Do not add any upstream domain references in this file.

import type { Lang } from '../i18n';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000';

export type CurrentWeather = {
  location: { name: string; country: string; lat: number; lon: number };
  current: {
    temp_c: number;
    feels_like_c: number;
    humidity_pct: number;
    pressure_hpa: number;
    wind_speed_ms: number;
    wind_deg: number;
    cloud_cover_pct: number;
    visibility_m: number;
    condition: { code: number; label: string; icon: string; description: string };
  };
  sun: { sunrise_iso: string; sunset_iso: string };
  observed_at_iso: string;
  source: 'openweathermap';
  cached: boolean;
  stale?: boolean;
};

export type ForecastDay = {
  date_iso: string;
  temp_min_c: number;
  temp_max_c: number;
  humidity_avg_pct: number;
  precipitation_mm: number;
  condition: { label: string; icon: string; description: string };
  wind_speed_avg_ms: number;
};

export type ForecastResponse = {
  location: { name: string; country: string; lat: number; lon: number };
  days: ForecastDay[];
  source: 'openweathermap';
  cached: boolean;
  stale?: boolean;
  notice?: string;
};

export type WeatherAlert = {
  type: 'heat_wave' | 'heavy_rain' | 'high_wind' | 'cold_snap';
  severity: 'moderate' | 'severe';
  start_date_iso: string;
  end_date_iso: string;
  title: string;
  description: string;
  recommended_action: string;
};

export type AlertsResponse = {
  location: { name: string; country: string; lat: number; lon: number };
  alerts: WeatherAlert[];
  source: 'openweathermap';
  cached: boolean;
  stale?: boolean;
};

export type GeocodeResult = {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
};

export type ErrorReason =
  | 'upstream_auth_failed'
  | 'upstream_rate_limited'
  | 'upstream_unavailable'
  | 'upstream_not_found'
  | 'network_error'
  | 'invalid_query';

export class WeatherClientError extends Error {
  constructor(public reason: ErrorReason, public status?: number) {
    super(`weather_client:${reason}`);
  }
}

async function get<T>(path: string, query: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)])),
  );
  const url = `${API_BASE}${path}?${qs.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      let reason: ErrorReason = 'upstream_unavailable';
      try {
        const body = (await res.json()) as { reason?: ErrorReason };
        if (body?.reason) reason = body.reason;
      } catch {
        // response wasn't JSON — keep generic reason
      }
      throw new WeatherClientError(reason, res.status);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof WeatherClientError) throw err;
    throw new WeatherClientError('network_error');
  }
}

export function fetchCurrentWeather(lat: number, lon: number, lang: Lang = 'en') {
  return get<CurrentWeather>('/api/weather/current', { lat, lon, lang });
}

export function fetchForecast(lat: number, lon: number, lang: Lang = 'en') {
  return get<ForecastResponse>('/api/weather/forecast', { lat, lon, lang });
}

export function fetchAlerts(lat: number, lon: number, lang: Lang = 'en') {
  return get<AlertsResponse>('/api/weather/alerts', { lat, lon, lang });
}

export function geocode(query: string) {
  return get<{ results: GeocodeResult[] }>('/api/geocode', { q: query });
}
