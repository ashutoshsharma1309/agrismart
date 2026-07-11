import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Compass,
  Droplets,
  Info,
  Locate,
  MapPin,
  RefreshCw,
  Search,
  Sun,
  Thermometer,
  Wind,
  WifiOff,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { readJson, storageKeys, writeJson } from '../../lib/storage';
import { cn } from '../../lib/utils';
import {
  fetchAlerts,
  fetchCurrentWeather,
  fetchForecast,
  geocode,
  type AlertsResponse,
  type CurrentWeather,
  type ForecastDay,
  type ForecastResponse,
  type GeocodeResult,
} from '../../lib/weather-client';
import {
  fallbackAlerts,
  fallbackCurrent,
  fallbackForecast,
} from '../../lib/weather-fallback';
import { conditionIcon, conditionIconByLabel } from './conditionIcon';
import type { Lang } from '../../i18n';

type SavedLocation = {
  name: string;
  lat: number;
  lon: number;
};

function readSavedLocations(): SavedLocation[] {
  const raw = readJson<unknown[]>(storageKeys.weatherSaved, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is SavedLocation =>
      typeof x === 'object' &&
      x !== null &&
      typeof (x as SavedLocation).name === 'string' &&
      typeof (x as SavedLocation).lat === 'number' &&
      typeof (x as SavedLocation).lon === 'number',
  );
}

type LoadState = 'idle' | 'loading' | 'ready';

export function WeatherPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;

  const [primed, setPrimed] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [saved, setSaved] = useState<SavedLocation[]>(() => readSavedLocations());
  const [active, setActive] = useState<SavedLocation | null>(() => readSavedLocations()[0] ?? null);

  const [state, setState] = useState<LoadState>('idle');
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [fallback, setFallback] = useState<null | 'unreachable' | 'stale'>(null);

  useEffect(() => {
    writeJson(storageKeys.weatherSaved, saved);
  }, [saved]);

  const load = useCallback(
    async (loc: SavedLocation) => {
      setState('loading');
      try {
        const [c, f, a] = await Promise.all([
          fetchCurrentWeather(loc.lat, loc.lon, lang),
          fetchForecast(loc.lat, loc.lon, lang),
          fetchAlerts(loc.lat, loc.lon, lang),
        ]);
        setCurrent(c);
        setForecast(f);
        setAlerts(a);
        setFallback(c.stale || f.stale ? 'stale' : null);
        setState('ready');
      } catch {
        // Backend unreachable or upstream failed with no stale cache.
        // Fall back to local seeds so the page never looks broken.
        setCurrent(fallbackCurrent(loc.name));
        setForecast(fallbackForecast(loc.name));
        setAlerts(fallbackAlerts(loc.name));
        setFallback('unreachable');
        setState('ready');
      }
    },
    [lang],
  );

  useEffect(() => {
    // `load` synchronously enters its loading state before awaiting the network,
    // which is the intended behaviour when the active location changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (active) void load(active);
  }, [active, load]);

  const retry = () => {
    if (active) void load(active);
  };

  const requestGeo = () => {
    setPrimed(true);
    if (!('geolocation' in navigator)) {
      setGeoDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc: SavedLocation = {
          name: 'My location',
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4)),
        };
        try {
          const r = await geocode(`${loc.lat},${loc.lon}`);
          if (r.results[0]) {
            loc.name =
              [r.results[0].name, r.results[0].state].filter(Boolean).join(', ') ||
              loc.name;
          }
        } catch {
          // keep placeholder name — not fatal
        }
        setActive(loc);
        setSaved((s) =>
          s.some((x) => x.lat === loc.lat && x.lon === loc.lon) ? s : [loc, ...s].slice(0, 6),
        );
      },
      () => setGeoDenied(true),
      { timeout: 7000, enableHighAccuracy: false },
    );
  };

  const runSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchLoading(true);
    setSearchResults(null);
    try {
      const r = await geocode(query);
      setSearchResults(r.results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const pickSearchResult = (r: GeocodeResult) => {
    const loc: SavedLocation = {
      name: [r.name, r.state, r.country].filter(Boolean).join(', '),
      lat: r.lat,
      lon: r.lon,
    };
    setActive(loc);
    setQuery('');
    setSearchResults(null);
  };

  const toggleSave = (loc: SavedLocation) => {
    setSaved((s) =>
      s.some((x) => x.lat === loc.lat && x.lon === loc.lon)
        ? s.filter((x) => !(x.lat === loc.lat && x.lon === loc.lon))
        : [loc, ...s].slice(0, 6),
    );
  };

  const showPriming = !primed && !active;

  return (
    <div className="container-page py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t('weather.title')}</h1>
        <p className="text-sm text-ink-muted">{t('weather.subtitle')}</p>
      </header>

      {showPriming ? (
        <Card className="mb-6 border-brand-200 bg-brand-50/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
              <Compass size={20} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-ink">{t('weather.geo.priming.title')}</div>
              <p className="mt-0.5 text-sm text-ink-muted">{t('weather.geo.priming.body')}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" leadingIcon={<Locate size={14} />} onClick={requestGeo}>
                {t('weather.geo.priming.cta')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setPrimed(true);
                  setGeoDenied(true);
                }}
              >
                {t('weather.geo.priming.skip')}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <form onSubmit={runSearch} className="relative mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('weather.search.placeholder')}
          leadingIcon={<Search size={16} />}
          className="sm:flex-1"
          aria-label={t('weather.search.placeholder')}
        />
        <div className="flex gap-2">
          <Button type="submit" leadingIcon={<MapPin size={16} />} loading={searchLoading}>
            {t('common.search')}
          </Button>
          {!geoDenied && !showPriming ? (
            <Button
              type="button"
              variant="secondary"
              onClick={requestGeo}
              leadingIcon={<Locate size={16} />}
              aria-label={t('weather.geo.priming.cta')}
            >
              <span className="hidden sm:inline">{t('weather.geo.priming.cta')}</span>
            </Button>
          ) : null}
        </div>
        {searchResults ? (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-white shadow-lg sm:right-auto sm:w-[min(560px,100%)]">
            {searchResults.length === 0 ? (
              <div className="px-4 py-3 text-sm text-ink-muted">
                {t('weather.search.noResults')}
              </div>
            ) : (
              searchResults.map((r) => (
                <button
                  key={`${r.lat}-${r.lon}`}
                  type="button"
                  onClick={() => pickSearchResult(r)}
                  className="flex w-full items-center gap-2 border-b border-border px-4 py-2.5 text-left text-sm text-ink last:border-b-0 hover:bg-surface-2"
                >
                  <MapPin size={14} className="shrink-0 text-ink-subtle" />
                  <span className="truncate">
                    {[r.name, r.state, r.country].filter(Boolean).join(', ')}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </form>

      {saved.length ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {saved.map((loc) => {
            const isActive = active?.lat === loc.lat && active?.lon === loc.lon;
            return (
              <button
                key={`${loc.lat}-${loc.lon}`}
                type="button"
                onClick={() => setActive(loc)}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition',
                  isActive
                    ? 'border-brand bg-brand-50 text-brand-700'
                    : 'border-border bg-white text-ink-muted hover:border-brand-200',
                )}
              >
                <MapPin size={12} />
                {loc.name}
              </button>
            );
          })}
        </div>
      ) : null}

      {fallback === 'unreachable' ? (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <WifiOff size={18} />
            </div>
            <div className="flex-1 text-sm text-amber-900">
              {t('weather.banner.unavailable')}
            </div>
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={<RefreshCw size={14} />}
              onClick={retry}
            >
              {t('weather.banner.retry')}
            </Button>
          </div>
        </Card>
      ) : fallback === 'stale' ? (
        <Card className="mb-6 border-accent-100 bg-accent-50">
          <div className="flex items-center gap-3 text-sm text-accent-600">
            <Info size={16} />
            {t('weather.banner.stale')}
          </div>
        </Card>
      ) : null}

      {geoDenied && !active ? (
        <Card className="mb-6">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-ink-muted">
              <Locate size={18} />
            </div>
            <div>
              <div className="font-semibold text-ink">{t('weather.geo.denied.title')}</div>
              <p className="mt-1 text-sm text-ink-muted">{t('weather.geo.denied.body')}</p>
            </div>
          </div>
        </Card>
      ) : null}

      <p className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-subtle">
        <Info size={12} />
        {t('weather.liveCaption')}
      </p>

      {!active ? null : state === 'loading' || !current || !forecast ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <div className="h-36 animate-pulse rounded-xl bg-surface-2" />
          </Card>
          <Card className="lg:col-span-2">
            <div className="h-36 animate-pulse rounded-xl bg-surface-2" />
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <div className="mb-2 inline-flex items-center gap-2 text-xs text-ink-muted">
              <MapPin size={12} />
              {current.location.name}
              {current.location.country ? `, ${current.location.country}` : ''}
            </div>
            <div className="flex items-end gap-3">
              <span className="font-display text-6xl font-bold text-ink">
                {Math.round(current.current.temp_c)}°
              </span>
              <div className="mb-1.5">
                {conditionIcon(
                  current.current.condition.code,
                  { size: 36, className: 'text-accent-600', 'aria-hidden': true },
                  current.current.condition.description,
                )}
                <div className="text-sm capitalize text-ink-muted">
                  {current.current.condition.description}
                </div>
              </div>
            </div>
            <div className="mt-4 text-xs text-ink-subtle">
              {t('weather.current.feelsLike', {
                value: Math.round(current.current.feels_like_c),
              })}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <MiniStat
                icon={<Thermometer size={14} />}
                label="Max"
                value={`${Math.round(forecast.days[0]?.temp_max_c ?? current.current.temp_c)}°`}
              />
              <MiniStat
                icon={<Droplets size={14} />}
                label={t('weather.current.humidity')}
                value={`${current.current.humidity_pct}%`}
              />
              <MiniStat
                icon={<Wind size={14} />}
                label={t('weather.current.wind')}
                value={`${Math.round(current.current.wind_speed_ms * 3.6)} km/h`}
              />
            </div>
            {active ? (
              <div className="mt-5">
                <Button
                  variant={
                    saved.some((s) => s.lat === active.lat && s.lon === active.lon)
                      ? 'secondary'
                      : 'primary'
                  }
                  size="sm"
                  fullWidth
                  onClick={() => toggleSave(active)}
                >
                  {saved.some((s) => s.lat === active.lat && s.lon === active.lon)
                    ? t('weather.remove')
                    : t('weather.save')}
                </Button>
              </div>
            ) : null}
          </Card>

          <Card className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">
                {t('weather.forecast.title', { n: forecast.days.length })}
              </h3>
              <span className="text-xs text-ink-subtle">{t('weather.forecast.freeTier')}</span>
            </div>
            <div
              className="flex gap-3 overflow-x-auto scrollbar-hidden pb-1 md:grid md:overflow-visible"
              style={{
                gridTemplateColumns: `repeat(${forecast.days.length}, minmax(0, 1fr))`,
              }}
            >
              {forecast.days.map((f) => (
                <ForecastTile key={f.date_iso} forecast={f} />
              ))}
            </div>
          </Card>
        </div>
      )}

      {alerts && alerts.alerts.length > 0 ? (
        <section className="mt-6">
          <h3 className="mb-4 text-base font-semibold text-ink">{t('weather.alerts.title')}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {alerts.alerts.map((a) => (
              <div
                key={`${a.type}-${a.start_date_iso}`}
                className={cn(
                  'relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm',
                  a.severity === 'severe' && 'border-red-200',
                  a.severity === 'moderate' && 'border-amber-200',
                )}
              >
                <span
                  className={cn(
                    'absolute left-0 top-0 h-full w-1',
                    a.severity === 'severe' && 'bg-danger',
                    a.severity === 'moderate' && 'bg-warning',
                  )}
                />
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'inline-flex h-9 w-9 items-center justify-center rounded-lg',
                      a.severity === 'severe' && 'bg-red-50 text-danger',
                      a.severity === 'moderate' && 'bg-amber-50 text-amber-700',
                    )}
                  >
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-ink">{a.title}</div>
                    <p className="mt-1 text-sm text-ink-muted">{a.description}</p>
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink">
                      <Chip tone={a.severity === 'severe' ? 'danger' : 'warning'}>Action</Chip>
                      <span>{a.recommended_action}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : alerts && active ? (
        <section className="mt-6">
          <Card className="flex items-center gap-3 border-brand-200 bg-brand-50/50">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Sun size={18} />
            </div>
            <div className="text-sm text-ink">{t('weather.alerts.empty')}</div>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function ForecastTile({ forecast }: { forecast: ForecastDay }) {
  const d = new Date(forecast.date_iso + 'T00:00:00');
  const label = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  return (
    <div className="flex min-w-[120px] flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface-2 p-3 text-center">
      <div className="text-xs font-medium text-ink-muted">{label}</div>
      {conditionIconByLabel(
        forecast.condition.label,
        { size: 28, className: 'text-accent-600', 'aria-hidden': true },
        forecast.condition.description,
      )}
      <div className="mt-1 text-sm font-semibold text-ink">
        {Math.round(forecast.temp_max_c)}° / {Math.round(forecast.temp_min_c)}°
      </div>
      <div className="text-[11px] capitalize text-ink-subtle">
        {forecast.condition.description}
      </div>
      {forecast.precipitation_mm > 0 ? (
        <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-accent-600">
          <Droplets size={10} />
          {forecast.precipitation_mm.toFixed(1)} mm
        </span>
      ) : null}
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="inline-flex items-center gap-1 text-xs text-ink-muted">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-base font-semibold text-ink">{value}</div>
    </div>
  );
}
