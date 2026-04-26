import { config, isPlaceholderKey } from '../config.js';
import { cache, cacheKey, staleCache, storeBoth } from '../lib/cache.js';
import { UpstreamError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

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

export type GeocodeResult = {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
};

type OpenWeatherCurrent = {
  coord: { lat: number; lon: number };
  weather: { id: number; main: string; description: string; icon: string }[];
  main: {
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
  };
  wind: { speed: number; deg: number };
  clouds: { all: number };
  visibility?: number;
  sys: { country: string; sunrise: number; sunset: number };
  name: string;
  dt: number;
};

type OpenWeatherForecast = {
  list: {
    dt: number;
    main: { temp: number; temp_min: number; temp_max: number; humidity: number };
    weather: { id: number; main: string; description: string; icon: string }[];
    wind: { speed: number };
    rain?: { '3h'?: number };
    snow?: { '3h'?: number };
    dt_txt: string;
  }[];
  city: { name: string; country: string; coord: { lat: number; lon: number } };
};

function iconUrl(code: string) {
  return `https://openweathermap.org/img/wn/${code}@2x.png`;
}

/**
 * Fetch with defensive error classification. Never leaks the API key into errors or logs.
 */
async function ow<T>(path: string, params: Record<string, string | number>): Promise<T> {
  if (isPlaceholderKey) {
    throw new UpstreamError('upstream_auth_failed', 'API key not configured');
  }
  const qs = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    appid: config.OPENWEATHER_API_KEY,
  });
  const url = `${path}?${qs.toString()}`;
  const started = Date.now();
  try {
    const res = await fetch(url, { method: 'GET' });
    const duration = Date.now() - started;
    const safeUrl = url.replace(config.OPENWEATHER_API_KEY, '[redacted]');
    logger.info({ url: safeUrl, status: res.status, duration_ms: duration }, 'upstream call');

    if (res.status === 401) {
      throw new UpstreamError('upstream_auth_failed', 'OpenWeatherMap rejected credentials');
    }
    if (res.status === 404) {
      throw new UpstreamError('upstream_not_found', 'Resource not found');
    }
    if (res.status === 429) {
      throw new UpstreamError('upstream_rate_limited', 'OpenWeatherMap rate-limited');
    }
    if (!res.ok) {
      throw new UpstreamError('upstream_unavailable', `Upstream error ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof UpstreamError) throw err;
    logger.error({ err: (err as Error).message }, 'upstream network failure');
    throw new UpstreamError('upstream_unavailable', 'Network error contacting upstream', err);
  }
}

function normaliseCurrent(raw: OpenWeatherCurrent): Omit<CurrentWeather, 'cached' | 'stale'> {
  const w = raw.weather[0] ?? { id: 0, main: 'Unknown', description: 'Unknown', icon: '01d' };
  return {
    location: { name: raw.name, country: raw.sys.country, lat: raw.coord.lat, lon: raw.coord.lon },
    current: {
      temp_c: Math.round(raw.main.temp * 10) / 10,
      feels_like_c: Math.round(raw.main.feels_like * 10) / 10,
      humidity_pct: raw.main.humidity,
      pressure_hpa: raw.main.pressure,
      wind_speed_ms: Math.round(raw.wind.speed * 10) / 10,
      wind_deg: raw.wind.deg ?? 0,
      cloud_cover_pct: raw.clouds.all,
      visibility_m: raw.visibility ?? 10000,
      condition: {
        code: w.id,
        label: w.main,
        icon: iconUrl(w.icon),
        description: w.description,
      },
    },
    sun: {
      sunrise_iso: new Date(raw.sys.sunrise * 1000).toISOString(),
      sunset_iso: new Date(raw.sys.sunset * 1000).toISOString(),
    },
    observed_at_iso: new Date(raw.dt * 1000).toISOString(),
    source: 'openweathermap',
  };
}

function bucketForecastByDay(raw: OpenWeatherForecast): ForecastDay[] {
  const byDay = new Map<string, OpenWeatherForecast['list']>();
  for (const slice of raw.list) {
    const date = slice.dt_txt.slice(0, 10);
    const existing = byDay.get(date) ?? [];
    existing.push(slice);
    byDay.set(date, existing);
  }
  const days: ForecastDay[] = [];
  for (const [date, slices] of byDay.entries()) {
    let min = Infinity;
    let max = -Infinity;
    let humiditySum = 0;
    let precipTotal = 0;
    let windSum = 0;
    const conditionCount = new Map<
      string,
      { label: string; description: string; icon: string; count: number }
    >();

    for (const s of slices) {
      if (s.main.temp_min < min) min = s.main.temp_min;
      if (s.main.temp_max > max) max = s.main.temp_max;
      humiditySum += s.main.humidity;
      windSum += s.wind.speed;
      precipTotal += (s.rain?.['3h'] ?? 0) + (s.snow?.['3h'] ?? 0);
      const w = s.weather[0];
      if (w) {
        const key = w.main;
        const existing = conditionCount.get(key) ?? {
          label: w.main,
          description: w.description,
          icon: w.icon,
          count: 0,
        };
        existing.count += 1;
        conditionCount.set(key, existing);
      }
    }

    let dominant = Array.from(conditionCount.values()).sort((a, b) => b.count - a.count)[0];
    if (!dominant) {
      dominant = { label: 'Unknown', description: 'Unknown', icon: '01d', count: 0 };
    }

    days.push({
      date_iso: date,
      temp_min_c: Math.round(min * 10) / 10,
      temp_max_c: Math.round(max * 10) / 10,
      humidity_avg_pct: Math.round(humiditySum / slices.length),
      precipitation_mm: Math.round(precipTotal * 10) / 10,
      wind_speed_avg_ms: Math.round((windSum / slices.length) * 10) / 10,
      condition: {
        label: dominant.label,
        icon: iconUrl(dominant.icon),
        description: dominant.description,
      },
    });
  }
  return days;
}

export async function getCurrentWeather(params: {
  lat: number;
  lon: number;
  units: string;
  lang: string;
}): Promise<CurrentWeather> {
  const key = cacheKey('current', params.lat, params.lon, params.units, params.lang);
  const fresh = cache.get<CurrentWeather>(key);
  if (fresh) return { ...fresh, cached: true };

  try {
    const raw = await ow<OpenWeatherCurrent>(`${config.OPENWEATHER_BASE_URL}/weather`, {
      lat: params.lat,
      lon: params.lon,
      units: params.units,
      lang: params.lang,
    });
    const value: CurrentWeather = { ...normaliseCurrent(raw), cached: false };
    storeBoth(key, value);
    return value;
  } catch (err) {
    const stale = staleCache.get<CurrentWeather>(key);
    if (stale) {
      logger.warn({ key }, 'serving stale cache after upstream failure');
      return { ...stale, cached: true, stale: true };
    }
    throw err;
  }
}

export async function getForecast(params: {
  lat: number;
  lon: number;
  units: string;
  lang: string;
}): Promise<ForecastResponse> {
  const key = cacheKey('forecast', params.lat, params.lon, params.units, params.lang);
  const fresh = cache.get<ForecastResponse>(key);
  if (fresh) return { ...fresh, cached: true };

  try {
    const raw = await ow<OpenWeatherForecast>(`${config.OPENWEATHER_BASE_URL}/forecast`, {
      lat: params.lat,
      lon: params.lon,
      units: params.units,
      lang: params.lang,
    });
    const days = bucketForecastByDay(raw).slice(0, 5);
    const value: ForecastResponse = {
      location: {
        name: raw.city.name,
        country: raw.city.country,
        lat: raw.city.coord.lat,
        lon: raw.city.coord.lon,
      },
      days,
      source: 'openweathermap',
      cached: false,
      notice: '5-day forecast on free plan',
    };
    storeBoth(key, value);
    return value;
  } catch (err) {
    const stale = staleCache.get<ForecastResponse>(key);
    if (stale) {
      logger.warn({ key }, 'serving stale forecast after upstream failure');
      return { ...stale, cached: true, stale: true };
    }
    throw err;
  }
}

export async function geocode(query: string, limit = 5): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const cacheK = `geocode:${trimmed.toLowerCase()}:${limit}`;
  const fresh = cache.get<GeocodeResult[]>(cacheK);
  if (fresh) return fresh;

  try {
    const raw = await ow<
      { name: string; country: string; state?: string; lat: number; lon: number }[]
    >(`${config.OPENWEATHER_GEO_URL}/direct`, { q: trimmed, limit });
    const results = raw.map((r) => ({
      name: r.name,
      country: r.country,
      state: r.state,
      lat: r.lat,
      lon: r.lon,
    }));
    cache.set(cacheK, results);
    return results;
  } catch (err) {
    const stale = staleCache.get<GeocodeResult[]>(cacheK);
    if (stale) return stale;
    throw err;
  }
}

export function isUpstreamReachable(): Promise<boolean> {
  if (isPlaceholderKey) return Promise.resolve(false);
  // Cheap health probe: query London with a 2s timeout.
  return (async () => {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 2000);
      const qs = new URLSearchParams({
        q: 'London',
        appid: config.OPENWEATHER_API_KEY,
      });
      const res = await fetch(`${config.OPENWEATHER_BASE_URL}/weather?${qs}`, {
        signal: ac.signal,
      });
      clearTimeout(timer);
      return res.ok || res.status === 401;
    } catch {
      return false;
    }
  })();
}
