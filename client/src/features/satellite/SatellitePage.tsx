import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Droplets,
  Gauge,
  Layers,
  MapPin,
  Radar,
  Ruler,
  Satellite,
  Sprout,
  TrendingDown,
  TrendingUp,
  Waves,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { cn } from '../../lib/utils';
import {
  fetchFieldAnalysis,
  fetchFields,
  fetchRegionOverview,
  type FieldAnalysis,
  type FieldSummary,
  type IrrigationAction,
  type RegionOverview,
  type StageKey,
  type StressLevel,
} from '../../lib/satellite-client';

const STRESS_COLOR: Record<StressLevel, string> = {
  none: '#16A34A',
  mild: '#F59E0B',
  moderate: '#EA580C',
  severe: '#DC2626',
};

const STRESS_TONE: Record<StressLevel, 'brand' | 'warning' | 'danger'> = {
  none: 'brand',
  mild: 'warning',
  moderate: 'warning',
  severe: 'danger',
};

const ACTION_META: Record<
  IrrigationAction,
  { label: string; tone: 'brand' | 'warning' | 'danger' | 'info' }
> = {
  irrigate_now: { label: 'Irrigate now', tone: 'danger' },
  irrigate_soon: { label: 'Irrigate soon', tone: 'warning' },
  adequate: { label: 'Adequate', tone: 'brand' },
  reduce: { label: 'Reduce / stop', tone: 'info' },
};

const STAGE_ORDER: StageKey[] = [
  'establishment',
  'vegetative',
  'reproductive',
  'maturity',
  'harvest',
];
const STAGE_SHORT: Record<StageKey, string> = {
  establishment: 'Establish',
  vegetative: 'Vegetative',
  reproductive: 'Flowering',
  maturity: 'Maturity',
  harvest: 'Harvest',
};

export function SatellitePage() {
  const [overview, setOverview] = useState<RegionOverview | null>(null);
  const [fields, setFields] = useState<FieldSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FieldAnalysis | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchRegionOverview(), fetchFields()])
      .then(([ov, fl]) => {
        if (!alive) return;
        setOverview(ov);
        setFields(fl);
        setSelectedId((prev) => prev ?? fl[0]?.id ?? null);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoadingList(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let alive = true;
    setLoadingAnalysis(true);
    fetchFieldAnalysis(selectedId)
      .then((a) => alive && setAnalysis(a))
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoadingAnalysis(false));
    return () => {
      alive = false;
    };
  }, [selectedId]);

  return (
    <div className="container-page py-6 md:py-10">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <Satellite size={13} />
            Optical + SAR fusion
          </div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Satellite Crop Advisory</h1>
          <p className="max-w-2xl text-sm text-ink-muted">
            Automated crop-type classification, stage-wise phenology, and moisture-stress detection
            from fused Sentinel-2 optical and Sentinel-1 radar signatures — turned into field-level
            irrigation guidance.
          </p>
        </div>
      </header>

      {/* Region overview */}
      <OverviewStrip overview={overview} loading={loadingList} />

      {error ? (
        <Card className="mt-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-3 text-sm text-red-900">
            <AlertTriangle size={16} />
            Couldn't reach the advisory service. Make sure the backend is running on port 4000.
          </div>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Field list */}
        <div className="flex flex-col gap-3">
          <p className="eyebrow px-1">Monitored fields</p>
          {loadingList
            ? [0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-surface-2" />
              ))
            : fields.map((f) => (
                <FieldListItem
                  key={f.id}
                  field={f}
                  active={f.id === selectedId}
                  onSelect={() => setSelectedId(f.id)}
                />
              ))}
        </div>

        {/* Analysis panel */}
        <div>
          {loadingAnalysis || !analysis ? (
            <AnalysisSkeleton />
          ) : (
            <motion.div
              key={analysis.field.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-5"
            >
              <FieldHeader analysis={analysis} />
              <div className="grid gap-5 md:grid-cols-2">
                <CropCard analysis={analysis} />
                <StressCard analysis={analysis} />
              </div>
              <StageTimeline analysis={analysis} />
              <IrrigationCard analysis={analysis} />
              <SeriesChart analysis={analysis} />
              <SarChart analysis={analysis} />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function OverviewStrip({
  overview,
  loading,
}: {
  overview: RegionOverview | null;
  loading: boolean;
}) {
  const stats = [
    {
      icon: Layers,
      label: 'Fields monitored',
      value: overview ? String(overview.total_fields) : '—',
      sub: overview ? `${overview.total_area_ha} ha total` : '',
    },
    {
      icon: Droplets,
      label: 'Need irrigation',
      value: overview ? String(overview.fields_needing_irrigation) : '—',
      sub: 'flagged this pass',
    },
    {
      icon: AlertTriangle,
      label: 'Under stress',
      value: overview ? String(overview.stressed_fields) : '—',
      sub: 'moderate or severe',
    },
    {
      icon: Sprout,
      label: 'Crop types',
      value: overview ? String(overview.crop_distribution.length) : '—',
      sub: overview ? overview.crop_distribution.map((c) => c.crop).join(', ') : '',
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="p-4">
          {loading ? (
            <div className="h-14 animate-pulse rounded bg-surface-2" />
          ) : (
            <div className="flex items-start gap-3">
              <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <s.icon size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold leading-tight text-ink">{s.value}</div>
                <div className="text-xs font-medium text-ink-muted">{s.label}</div>
                {s.sub ? <div className="truncate text-[11px] text-ink-subtle">{s.sub}</div> : null}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function FieldListItem({
  field,
  active,
  onSelect,
}: {
  field: FieldSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-2xl border p-4 text-left transition duration-150',
        active
          ? 'border-brand bg-brand-50/60 shadow-sm ring-1 ring-inset ring-brand-100'
          : 'border-border bg-white hover:border-brand-200 hover:bg-surface-2',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">{field.name}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
            <MapPin size={11} />
            <span className="truncate">
              {field.district}, {field.state}
            </span>
          </div>
        </div>
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: STRESS_COLOR[field.stress_level] }}
          aria-hidden
        />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Chip tone="brand">{field.crop}</Chip>
        <Chip tone={STRESS_TONE[field.stress_level]}>{field.stress_level} stress</Chip>
      </div>
    </button>
  );
}

function FieldHeader({ analysis }: { analysis: FieldAnalysis }) {
  const { field, classification, correct, ground_truth_crop } = analysis;
  return (
    <Card>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4">
          <FieldMap analysis={analysis} />
          <div>
            <h2 className="text-lg font-bold text-ink">{field.name}</h2>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
              <MapPin size={13} />
              {field.village}, {field.district}, {field.state}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-subtle">
              <span className="inline-flex items-center gap-1">
                <Ruler size={12} /> {field.area_ha} ha
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} /> Sown {field.sowing_date_iso}
              </span>
              <span>
                {field.lat.toFixed(3)}°N, {field.lon.toFixed(3)}°E
              </span>
            </div>
          </div>
        </div>
        <div className="shrink-0">
          {correct ? (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
              <CheckCircle2 size={14} />
              Prediction matches ground truth
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              <AlertTriangle size={14} />
              Predicted {classification.crop} · actual {ground_truth_crop}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function FieldMap({ analysis }: { analysis: FieldAnalysis }) {
  const { field, moisture_stress } = analysis;
  const color = STRESS_COLOR[moisture_stress.level];
  // Normalise the polygon into a 0..100 viewBox.
  const pts = field.polygon;
  const lats = pts.map((p) => p[0]);
  const lons = pts.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const spanLat = maxLat - minLat || 1;
  const spanLon = maxLon - minLon || 1;
  const poly = pts
    .map((p) => {
      const x = 12 + ((p[1] - minLon) / spanLon) * 76;
      const y = 12 + (1 - (p[0] - minLat) / spanLat) * 76;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width={108}
      height={108}
      viewBox="0 0 112 112"
      className="shrink-0 rounded-xl border border-border bg-surface-2"
      aria-label="Field boundary and stress overlay"
    >
      <defs>
        <pattern id="grid" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M 14 0 L 0 0 0 14" fill="none" stroke="#E2E8F0" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="112" height="112" fill="url(#grid)" />
      <polygon points={poly} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={2} />
      <circle cx={56} cy={56} r={3} fill={color} />
    </svg>
  );
}

function CropCard({ analysis }: { analysis: FieldAnalysis }) {
  const { classification } = analysis;
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Sprout size={18} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-ink">Crop classification</h3>
          <p className="text-[11px] text-ink-subtle">{classification.method}</p>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold text-ink">{classification.crop}</div>
        <div className="text-right">
          <div className="text-lg font-bold text-brand-700">{classification.confidence}%</div>
          <div className="text-[11px] text-ink-subtle">confidence</div>
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${classification.confidence}%` }}
        />
      </div>
      {classification.alternatives.length > 0 ? (
        <div className="mt-4">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
            Other candidates
          </p>
          <div className="space-y-1.5">
            {classification.alternatives.map((alt) => (
              <div key={alt.crop} className="flex items-center gap-2 text-xs">
                <span className="w-16 shrink-0 text-ink-muted">{alt.crop}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-border-strong"
                    style={{ width: `${Math.min(alt.probability, 100)}%` }}
                  />
                </div>
                <span className="w-9 shrink-0 text-right tabular-nums text-ink-subtle">
                  {alt.probability}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function StressCard({ analysis }: { analysis: FieldAnalysis }) {
  const s = analysis.moisture_stress;
  const color = STRESS_COLOR[s.level];
  const TrendIcon = s.trend === 'worsening' ? TrendingDown : s.trend === 'improving' ? TrendingUp : Waves;
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <div
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <Gauge size={18} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-ink">Moisture stress</h3>
          <p className="text-[11px] capitalize text-ink-subtle">Trend: {s.trend}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <StressGauge index={s.index} color={color} />
        <div className="space-y-1.5">
          <Chip tone={STRESS_TONE[s.level]} className="capitalize">
            {s.level} stress
          </Chip>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Droplets size={12} /> Soil moisture {s.soilMoisturePct}%
          </div>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <TrendIcon size={12} /> NDWI {s.ndwi}
          </div>
        </div>
      </div>
      <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
        {s.drivers.map((d, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-ink-muted">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            {d}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function StressGauge({ index, color }: { index: number; color: string }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - index / 100);
  return (
    <div className="relative h-[86px] w-[86px] shrink-0">
      <svg width={86} height={86} viewBox="0 0 86 86" className="-rotate-90">
        <circle cx={43} cy={43} r={r} fill="none" stroke="#E2E8F0" strokeWidth={8} />
        <circle
          cx={43}
          cy={43}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-ink">{index}</span>
        <span className="text-[9px] uppercase tracking-wide text-ink-subtle">index</span>
      </div>
    </div>
  );
}

function StageTimeline({ analysis }: { analysis: FieldAnalysis }) {
  const { stage } = analysis;
  const currentIdx = STAGE_ORDER.indexOf(stage.stage);
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">Growth stage</h3>
          <p className="text-xs text-ink-muted">
            Day {stage.dayAfterSowing} after sowing · {stage.progressPct}% through cycle · NDVI{' '}
            {stage.ndviTrend}
          </p>
        </div>
        <Chip tone="info">{stage.label}</Chip>
      </div>
      <div className="flex items-center">
        {STAGE_ORDER.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition',
                    active
                      ? 'bg-brand text-white ring-4 ring-brand-100'
                      : done
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-surface-2 text-ink-subtle',
                  )}
                >
                  {done ? <CheckCircle2 size={15} /> : i + 1}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium',
                    active ? 'text-brand-700' : 'text-ink-subtle',
                  )}
                >
                  {STAGE_SHORT[s]}
                </span>
              </div>
              {i < STAGE_ORDER.length - 1 ? (
                <div
                  className={cn(
                    'mx-1 mb-5 h-0.5 flex-1 rounded',
                    i < currentIdx ? 'bg-brand-200' : 'bg-surface-2',
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-4 rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-muted">{stage.note}</p>
    </Card>
  );
}

function IrrigationCard({ analysis }: { analysis: FieldAnalysis }) {
  const ir = analysis.irrigation;
  const meta = ACTION_META[ir.action];
  const isAction = ir.action === 'irrigate_now' || ir.action === 'irrigate_soon';
  return (
    <Card
      className={cn(
        ir.priority === 'critical' && 'border-red-200 bg-red-50/40',
        ir.priority === 'high' && 'border-amber-200 bg-amber-50/40',
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              isAction ? 'bg-accent-50 text-accent-600' : 'bg-brand-50 text-brand-700',
            )}
          >
            <Droplets size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-ink">{ir.headline}</h3>
              <Chip tone={meta.tone}>{meta.label}</Chip>
            </div>
            <p className="mt-1 max-w-xl text-sm text-ink-muted">{ir.rationale}</p>
            <div className="mt-1 text-xs font-medium text-ink-subtle">⏱ {ir.window}</div>
          </div>
        </div>
        {isAction ? (
          <div className="flex shrink-0 gap-4 rounded-xl bg-surface-2 px-4 py-3 text-center">
            <div>
              <div className="text-2xl font-bold text-ink">{ir.water_mm}</div>
              <div className="text-[10px] uppercase tracking-wide text-ink-subtle">mm depth</div>
            </div>
            <div className="border-l border-border pl-4">
              <div className="text-2xl font-bold text-ink">
                {(ir.water_litres_total / 1000).toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-ink-subtle">m³ total</div>
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-[11px] text-ink-subtle">
        <span className="capitalize">Priority: {ir.priority}</span>
        <span>·</span>
        <span>Advisory confidence {ir.confidence}%</span>
      </div>
    </Card>
  );
}

function SeriesChart({ analysis }: { analysis: FieldAnalysis }) {
  const data = useMemo(
    () =>
      analysis.series.map((o) => ({
        date: o.date_iso.slice(5),
        NDVI: o.ndvi,
        NDWI: o.ndwi,
        'Soil moisture %': o.soil_moisture_pct,
      })),
    [analysis],
  );
  return (
    <Card>
      <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-ink">
        <Waves size={16} className="text-brand-700" /> Optical indices &amp; soil moisture
      </h3>
      <p className="mb-4 text-xs text-ink-muted">
        Vegetation vigour (NDVI) and canopy water (NDWI) from Sentinel-2, with SAR-derived soil
        moisture, across the season.
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} />
          <YAxis
            yAxisId="idx"
            domain={[-0.4, 1]}
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="sm"
            orientation="right"
            domain={[0, 55]}
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #E2E8F0',
              fontSize: 12,
              boxShadow: '0 4px 16px rgb(10 15 26 / 0.08)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area
            yAxisId="sm"
            type="monotone"
            dataKey="Soil moisture %"
            fill="#DBEAFE"
            stroke="#60A5FA"
            strokeWidth={1.5}
          />
          <Line
            yAxisId="idx"
            type="monotone"
            dataKey="NDVI"
            stroke="#16A34A"
            strokeWidth={2.5}
            dot={{ r: 2.5 }}
          />
          <Line
            yAxisId="idx"
            type="monotone"
            dataKey="NDWI"
            stroke="#0EA5E9"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ r: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}

function SarChart({ analysis }: { analysis: FieldAnalysis }) {
  const data = useMemo(
    () =>
      analysis.series.map((o) => ({
        date: o.date_iso.slice(5),
        'VV (dB)': o.sar_vv_db,
        'VH (dB)': o.sar_vh_db,
      })),
    [analysis],
  );
  return (
    <Card>
      <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-ink">
        <Radar size={16} className="text-brand-700" /> Sentinel-1 SAR backscatter
      </h3>
      <p className="mb-4 text-xs text-ink-muted">
        Cloud-penetrating radar — VV/VH backscatter tracks crop structure and standing water,
        available even under monsoon cloud cover.
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #E2E8F0',
              fontSize: 12,
              boxShadow: '0 4px 16px rgb(10 15 26 / 0.08)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="VV (dB)" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="VH (dB)" stroke="#DB2777" strokeWidth={2} dot={{ r: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="grid gap-5">
      <div className="h-28 animate-pulse rounded-2xl bg-surface-2" />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-56 animate-pulse rounded-2xl bg-surface-2" />
      </div>
      <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
      <div className="h-72 animate-pulse rounded-2xl bg-surface-2" />
    </div>
  );
}
