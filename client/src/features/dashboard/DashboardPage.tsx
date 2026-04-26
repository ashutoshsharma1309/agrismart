import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { BarChart3, CloudRain, Leaf, MessageCircle, Scan, Sprout } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useSession } from '../../app/session';
import { useProfile } from '../../app/profile';
import { getHistory, getSoilScores, type HistoryItem } from '../../lib/history';
import {
  fetchAlerts,
  fetchCurrentWeather,
  geocode,
  type AlertsResponse,
  type CurrentWeather,
} from '../../lib/weather-client';
import { readJson, storageKeys } from '../../lib/storage';
import { formatDateTime } from '../../lib/utils';
import {
  activityCounts,
  getActivity,
  type ActivityEntry,
  type ActivityKind,
} from '../../lib/session-activity';
import type { Lang } from '../../i18n';

type SavedLocation = { name: string; lat: number; lon: number };

function firstSavedLocation(): SavedLocation | null {
  const raw = readJson<unknown[]>(storageKeys.weatherSaved, []);
  if (!Array.isArray(raw)) return null;
  const valid = raw.find(
    (x): x is SavedLocation =>
      typeof x === 'object' &&
      x !== null &&
      typeof (x as SavedLocation).lat === 'number' &&
      typeof (x as SavedLocation).lon === 'number',
  );
  return valid ?? null;
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const { session } = useSession();
  const { profile } = useProfile();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [alertsData, setAlertsData] = useState<AlertsResponse | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>(() => getActivity());
  const soilScores = useMemo(() => getSoilScores(), [history]);
  const counts = useMemo(() => activityCounts(activity), [activity]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  useEffect(() => {
    const handler = () => setActivity(getActivity());
    window.addEventListener('agrismart:session-activity', handler);
    return () => window.removeEventListener('agrismart:session-activity', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const resolveCoords = async (): Promise<SavedLocation | null> => {
      const saved = firstSavedLocation();
      if (saved) return saved;
      const district = profile.district?.trim();
      if (!district) return null;
      try {
        const r = await geocode([district, profile.state].filter(Boolean).join(', '));
        const hit = r.results[0];
        return hit ? { name: district, lat: hit.lat, lon: hit.lon } : null;
      } catch {
        return null;
      }
    };

    void (async () => {
      const loc = await resolveCoords();
      if (!loc || cancelled) return;
      try {
        const [c, a] = await Promise.all([
          fetchCurrentWeather(loc.lat, loc.lon, lang),
          fetchAlerts(loc.lat, loc.lon, lang),
        ]);
        if (!cancelled) {
          setCurrent(c);
          setAlertsData(a);
        }
      } catch {
        // Hide the chip on failure — don't break the dashboard for a weather blip.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile.district, profile.state, lang]);

  const name = profile.name || session?.name || 'Farmer';

  const advisoriesCount = history.filter((h) => h.type === 'advisory').length;
  const scansCount = history.filter((h) => h.type === 'disease').length;
  const latestSoilScore = soilScores.length ? soilScores[soilScores.length - 1].score : 0;
  const alertsCount = alertsData?.alerts.length ?? 0;

  return (
    <div className="container-page py-6 md:py-10">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">
            {t('dashboard.welcome', { name })}
          </h1>
          <p className="text-sm text-ink-muted">{t('dashboard.subtitle')}</p>
        </div>
        {current ? (
          <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-2.5 text-sm shadow-sm">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
              <CloudRain size={18} />
            </div>
            <div>
              <div className="font-semibold capitalize text-ink">
                {Math.round(current.current.temp_c)}°C · {current.current.condition.description}
              </div>
              <div className="text-xs text-ink-muted">{current.location.name}</div>
            </div>
          </div>
        ) : null}
      </header>

      {alertsCount > 0 && alertsData ? (
        <Card className="mb-6 border-warning/40 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <CloudRain size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-900">
                {alertsData.alerts[0].title}
              </div>
              <div className="mt-1 text-sm text-amber-800/90">
                {alertsData.alerts[0].recommended_action}
              </div>
            </div>
            <Link to="/app/weather">
              <Button variant="secondary" size="sm">
                {t('common.viewAll')}
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}

      <Card className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{t('dashboard.session.title')}</h3>
          {activity.length === 0 ? (
            <span className="text-xs text-ink-subtle">{t('dashboard.session.idle')}</span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SessionTile
            icon={<Sprout size={16} />}
            label={t('nav.advisory')}
            count={counts.advisory}
          />
          <SessionTile
            icon={<Scan size={16} />}
            label={t('nav.disease')}
            count={counts.disease}
          />
          <SessionTile
            icon={<Leaf size={16} />}
            label={t('nav.soil')}
            count={counts.soil}
          />
          <SessionTile
            icon={<MessageCircle size={16} />}
            label={t('nav.chatbot')}
            count={counts.chat}
            suffix={counts.chat ? ` ${t('dashboard.session.msg')}` : ''}
          />
        </div>
        {activity.length > 0 ? (
          <ul className="mt-5 space-y-2 text-sm text-ink-muted">
            {activity.slice(0, 4).map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <ActivityKindIcon kind={a.kind} />
                  <span className="text-ink">{a.summary}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-subtle">
                  {new Date(a.ts).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-ink-muted">
            {t('dashboard.session.empty')}{' '}
            <Link to="/app/advisory" className="font-medium text-brand-700 hover:underline">
              {t('dashboard.session.cta')}
            </Link>
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Sprout size={18} />}
          label={t('dashboard.kpi.advisories')}
          value={advisoriesCount}
        />
        <KpiCard
          icon={<Scan size={18} />}
          label={t('dashboard.kpi.scans')}
          value={scansCount}
        />
        <KpiCard
          icon={<Leaf size={18} />}
          label={t('dashboard.kpi.soil')}
          value={latestSoilScore || '—'}
          suffix={latestSoilScore ? ' / 100' : ''}
        />
        <KpiCard
          icon={<CloudRain size={18} />}
          label={t('dashboard.kpi.alerts')}
          value={alertsCount}
          tone={alertsCount > 0 ? 'warning' : 'neutral'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink">{t('dashboard.chart.title')}</h3>
              <div className="text-xs text-ink-subtle">Last {soilScores.length || '—'} check-ins</div>
            </div>
            {soilScores.length < 2 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-ink-muted">
                {t('dashboard.chart.empty')}
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={soilScores.map((s, i) => ({ name: `#${i + 1}`, score: s.score }))}>
                    <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#94A3B8" fontSize={12} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} stroke="#94A3B8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: 12,
                        fontSize: 13,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#16A34A"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#16A34A' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
          <Card className="mt-6">
            <h3 className="mb-4 text-lg font-semibold text-ink">{t('dashboard.recent.title')}</h3>
            {history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-ink-muted">
                {t('dashboard.recent.empty')}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {history.slice(0, 6).map((h) => (
                  <li key={h.id} className="flex items-start gap-3 py-3">
                    <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                      {h.type === 'advisory' ? (
                        <Sprout size={16} />
                      ) : h.type === 'disease' ? (
                        <Scan size={16} />
                      ) : (
                        <Leaf size={16} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink">{h.title}</div>
                      <div className="truncate text-xs text-ink-muted">{h.summary}</div>
                    </div>
                    <div className="text-xs text-ink-subtle whitespace-nowrap">
                      {formatDateTime(h.createdAt)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-ink">Shortcuts</h3>
            <div className="grid grid-cols-2 gap-3">
              <ShortcutLink to="/app/advisory" icon={<Sprout size={18} />} label={t('dashboard.shortcut.advisory')} />
              <ShortcutLink to="/app/disease" icon={<Scan size={18} />} label={t('dashboard.shortcut.scan')} />
              <ShortcutLink to="/app/soil" icon={<Leaf size={18} />} label={t('dashboard.shortcut.soil')} />
              <ShortcutLink to="/app/chatbot" icon={<MessageCircle size={18} />} label={t('dashboard.shortcut.chat')} />
            </div>
          </Card>
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-ink">Your week</h3>
            <ul className="space-y-3 text-sm text-ink-muted">
              <li className="flex items-start gap-2">
                <BarChart3 size={14} className="mt-0.5 text-brand" />
                <span>
                  Keep your advisory notes in one place — tap any recommendation to save it.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Leaf size={14} className="mt-0.5 text-brand" />
                <span>A quick soil check every 4–6 weeks keeps your score meaningful.</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  suffix,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  suffix?: string;
  tone?: 'neutral' | 'warning';
}) {
  return (
    <Card>
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        {icon}
      </div>
      <div className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={'font-display text-3xl font-bold ' + (tone === 'warning' ? 'text-amber-700' : 'text-ink')}>
          {value}
        </span>
        {suffix ? <span className="text-xs text-ink-muted">{suffix}</span> : null}
      </div>
    </Card>
  );
}

function SessionTile({
  icon,
  label,
  count,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-subtle">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-700">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="font-display text-2xl font-bold text-ink">{count}</span>
        {suffix ? <span className="text-xs text-ink-muted">{suffix}</span> : null}
      </div>
    </div>
  );
}

function ActivityKindIcon({ kind }: { kind: ActivityKind }) {
  const Icon =
    kind === 'advisory'
      ? Sprout
      : kind === 'disease'
        ? Scan
        : kind === 'soil'
          ? Leaf
          : MessageCircle;
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-700">
      <Icon size={12} />
    </span>
  );
}

function ShortcutLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-start gap-2 rounded-xl border border-border bg-white p-3 text-left transition hover:border-brand-200 hover:bg-brand-50/40"
    >
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        {icon}
      </div>
      <div className="text-sm font-semibold text-ink">{label}</div>
    </Link>
  );
}
