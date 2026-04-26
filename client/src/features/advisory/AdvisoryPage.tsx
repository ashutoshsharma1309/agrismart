import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  BookmarkPlus,
  CheckCircle2,
  ChevronDown,
  Droplets,
  FileDown,
  Info,
  Leaf,
  MapPin,
  Phone,
  ShieldAlert,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SelectableChip } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { COMMON_CROPS, INDIAN_CITIES } from '../../lib/constants';
import { addHistory } from '../../lib/history';
import { logActivity } from '../../lib/session-activity';
import { getAdvisory } from '../../lib/mock-api';
import {
  generateAdvisory,
  type AdvisoryCrop,
  type AdvisoryResponse,
  type AiErrorReason,
  type CroppingStrategy,
  type Irrigation,
  type RiskPref,
  type SoilType,
  type Experience,
} from '../../lib/ai-client';
import { cn } from '../../lib/utils';
import type { Lang } from '../../i18n';
import { AiDisclaimer } from '../../components/shared/AiDisclaimer';

type ViewResult = {
  source: 'api' | 'fallback';
  data: AdvisoryResponse;
  cached?: boolean;
  errorReason?: AiErrorReason;
};

const SOIL_TYPES: SoilType[] = [
  'loam',
  'clay',
  'sandy',
  'alluvial',
  'black',
  'red',
  'laterite',
  'arid',
];
const IRRIGATION_TYPES: Irrigation[] = ['rainfed', 'borewell', 'canal', 'drip', 'mixed'];
const RISK_TYPES: RiskPref[] = ['stable', 'balanced', 'high_reward'];
const EXPERIENCE_TYPES: Experience[] = ['novice', 'experienced', 'advanced'];
const PREF_INTERESTS = [
  'Pulses',
  'Oilseeds',
  'Vegetables',
  'Cash crops',
  'Horticulture',
  'Fodder',
];

export function AdvisoryPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;

  const [location, setLocation] = useState('Nashik, Maharashtra');
  const [primarySoil, setPrimarySoil] = useState<SoilType>('loam');
  const [secondarySoil, setSecondarySoil] = useState<SoilType | ''>('');
  const [primaryShare, setPrimaryShare] = useState(70);
  const [sowingMonth, setSowingMonth] = useState<number>(new Date().getMonth() + 1);
  const [farmSize, setFarmSize] = useState('3');
  const [irrigation, setIrrigation] = useState<Irrigation>('borewell');
  const [budget, setBudget] = useState(15000);
  const [risk, setRisk] = useState<RiskPref>('balanced');
  const [experience, setExperience] = useState<Experience>('experienced');
  const [previousCrop, setPreviousCrop] = useState('');
  const [prefs, setPrefs] = useState<string[]>([]);

  const [result, setResult] = useState<ViewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'profit' | 'lowRisk' | 'lowWater' | 'short' | null>(null);

  const togglePref = (c: string) => {
    setPrefs((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ai = await generateAdvisory({
        location,
        primary_soil: primarySoil,
        secondary_soil: secondarySoil || undefined,
        primary_soil_share_pct: secondarySoil ? primaryShare : undefined,
        sowing_month: sowingMonth,
        farm_size_acres: Number(farmSize) || undefined,
        irrigation,
        budget_per_acre_inr: budget,
        risk_preference: risk,
        experience,
        previous_crop: previousCrop || undefined,
        preferred_crops: prefs.length ? prefs : undefined,
        lang,
      });

      if (ai.ok && ai.data) {
        setResult({
          source: 'api',
          data: ai.data,
          cached: Boolean((ai as { cached?: boolean }).cached),
        });
        setExpanded(ai.data.recommendations[0]?.crop_name ?? null);
        logActivity('advisory', `${ai.data.recommendations[0]?.crop_name ?? '—'} · ${location}`);
      } else {
        const errorReason = ai.ok ? undefined : ai.reason;
        const fallback = await buildFallback({
          location,
          primarySoil,
          season: monthToSeason(sowingMonth),
        });
        setResult({ source: 'fallback', data: fallback, errorReason });
        setExpanded(fallback.recommendations[0]?.crop_name ?? null);
        logActivity('advisory', `${fallback.recommendations[0]?.crop_name ?? '—'} · ${location} (offline)`);
      }
    } finally {
      setLoading(false);
    }
  };

  const sortedRecs = useMemo(() => {
    if (!result) return [];
    const recs = [...result.data.recommendations];
    if (filter === 'profit') {
      recs.sort(
        (a, b) =>
          parseProfit(b.economics.net_profit_estimate) -
          parseProfit(a.economics.net_profit_estimate),
      );
    } else if (filter === 'lowRisk') {
      const score = (c: AdvisoryCrop) =>
        c.key_risks.reduce(
          (acc, r) => acc + (r.likelihood === 'high' ? 3 : r.likelihood === 'medium' ? 2 : 1),
          0,
        );
      recs.sort((a, b) => score(a) - score(b));
    } else if (filter === 'lowWater') {
      const w = (c: AdvisoryCrop) =>
        c.requirements.water_requirement === 'low'
          ? 0
          : c.requirements.water_requirement === 'medium'
            ? 1
            : 2;
      recs.sort((a, b) => w(a) - w(b));
    } else if (filter === 'short') {
      recs.sort((a, b) => a.timeline.duration_days - b.timeline.duration_days);
    } else {
      recs.sort((a, b) => a.rank - b.rank);
    }
    return recs;
  }, [result, filter]);

  const saveResult = () => {
    if (!result) return;
    const top = result.data.recommendations[0];
    addHistory({
      id: Math.random().toString(36).slice(2, 10),
      type: 'advisory',
      createdAt: new Date().toISOString(),
      title: `${top?.crop_name ?? '—'} + ${result.data.recommendations.length - 1} more`,
      summary: `${location} · ${primarySoil}${secondarySoil ? ` + ${secondarySoil}` : ''} · ${MONTH_NAMES[sowingMonth]}`,
      meta: {
        location,
        primarySoil,
        secondarySoil: secondarySoil || '',
        sowingMonth: String(sowingMonth),
      },
    });
    toast.success(t('common.savedToHistory'));
  };

  return (
    <div className="container-page py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t('advisory.title')}</h1>
        <p className="text-sm text-ink-muted">{t('advisory.subtitle')}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label={t('advisory.form.location')}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('advisory.form.locationPlaceholder')}
                leadingIcon={<MapPin size={16} />}
                list="city-list"
                required
              />
              <datalist id="city-list">
                {INDIAN_CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>

              <Select
                label={t('advisory.form.primarySoil')}
                value={primarySoil}
                onChange={(e) => setPrimarySoil(e.target.value as SoilType)}
                options={SOIL_TYPES.map((s) => ({ value: s, label: t(`advisory.soil.${s}`) }))}
              />
              <Select
                label={t('advisory.form.secondarySoil')}
                value={secondarySoil}
                onChange={(e) => setSecondarySoil(e.target.value as SoilType | '')}
                placeholder={t('advisory.form.secondarySoilPlaceholder')}
                options={SOIL_TYPES.filter((s) => s !== primarySoil).map((s) => ({
                  value: s,
                  label: t(`advisory.soil.${s}`),
                }))}
              />
              {secondarySoil ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">
                    {t('advisory.form.split', { primary: primaryShare, secondary: 100 - primaryShare })}
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={90}
                    value={primaryShare}
                    onChange={(e) => setPrimaryShare(Number(e.target.value))}
                    className="w-full accent-brand"
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label={t('advisory.form.sowingMonth')}
                  value={String(sowingMonth)}
                  onChange={(e) => setSowingMonth(Number(e.target.value))}
                  options={MONTH_NAMES.slice(1).map((m, i) => ({
                    value: String(i + 1),
                    label: m,
                  }))}
                />
                <Input
                  label={t('advisory.form.farmSize')}
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={farmSize}
                  onChange={(e) => setFarmSize(e.target.value)}
                />
              </div>

              <Select
                label={t('advisory.form.irrigation')}
                value={irrigation}
                onChange={(e) => setIrrigation(e.target.value as Irrigation)}
                options={IRRIGATION_TYPES.map((i) => ({
                  value: i,
                  label: t(`advisory.irrigation.${i}`),
                }))}
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-ink">
                  {t('advisory.form.budget', { value: budget.toLocaleString('en-IN') })}
                </label>
                <input
                  type="range"
                  min={3000}
                  max={50000}
                  step={500}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full accent-brand"
                />
              </div>

              <Select
                label={t('advisory.form.risk')}
                value={risk}
                onChange={(e) => setRisk(e.target.value as RiskPref)}
                options={RISK_TYPES.map((r) => ({ value: r, label: t(`advisory.risk.${r}`) }))}
              />

              <Select
                label={t('advisory.form.experience')}
                value={experience}
                onChange={(e) => setExperience(e.target.value as Experience)}
                options={EXPERIENCE_TYPES.map((x) => ({
                  value: x,
                  label: t(`advisory.experience.${x}`),
                }))}
              />

              <Input
                label={t('advisory.form.previousCrop')}
                value={previousCrop}
                onChange={(e) => setPreviousCrop(e.target.value)}
                placeholder={t('advisory.form.previousCropPlaceholder')}
                list="crop-list"
              />
              <datalist id="crop-list">
                {COMMON_CROPS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink">
                  {t('advisory.form.interests')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {PREF_INTERESTS.map((p) => (
                    <SelectableChip
                      key={p}
                      selected={prefs.includes(p)}
                      onClick={() => togglePref(p)}
                    >
                      {p}
                    </SelectableChip>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                fullWidth
                loading={loading}
                leadingIcon={<Sparkles size={16} />}
              >
                {t('advisory.form.submit')}
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {result ? (
            <ResultsView
              result={result}
              expanded={expanded}
              setExpanded={setExpanded}
              filter={filter}
              setFilter={setFilter}
              sortedRecs={sortedRecs}
              location={location}
              primarySoil={primarySoil}
              onSave={saveResult}
            />
          ) : loading ? (
            <ResultsSkeleton />
          ) : (
            <Card>
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Leaf size={22} />
                </div>
                <h3 className="mt-3 text-base font-semibold text-ink">{t('advisory.empty.title')}</h3>
                <p className="mt-1 text-sm text-ink-muted">{t('advisory.empty.body')}</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultsView({
  result,
  expanded,
  setExpanded,
  filter,
  setFilter,
  sortedRecs,
  location,
  primarySoil,
  onSave,
}: {
  result: ViewResult;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  filter: 'profit' | 'lowRisk' | 'lowWater' | 'short' | null;
  setFilter: (f: 'profit' | 'lowRisk' | 'lowWater' | 'short' | null) => void;
  sortedRecs: AdvisoryCrop[];
  location: string;
  primarySoil: SoilType;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const data = result.data;
  return (
    <div className="space-y-5">
      {result.source === 'fallback' ? (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 text-sm text-amber-900">
            <Wifi size={14} />
            {t('ai.banner.fallback')}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {t('advisory.results.heading', {
                count: data.recommendations.length,
                soil: t(`advisory.soil.${primarySoil}`),
                location,
              })}
            </h2>
            {data.weather_context_summary ? (
              <p className="mt-1 text-xs text-ink-muted">{data.weather_context_summary}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" leadingIcon={<BookmarkPlus size={14} />} onClick={onSave}>
              {t('common.saveToHistory')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={<FileDown size={14} />}
              onClick={() => window.print()}
            >
              {t('common.print')}
            </Button>
          </div>
        </div>
        {data.general_advice ? (
          <p className="mt-3 rounded-xl bg-brand-50/40 p-3 text-sm text-ink">{data.general_advice}</p>
        ) : null}
        <AiDisclaimer />
      </Card>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-subtle">{t('advisory.results.sort')}:</span>
        {(
          [
            ['profit', t('advisory.results.sort.profit')],
            ['lowRisk', t('advisory.results.sort.lowRisk')],
            ['lowWater', t('advisory.results.sort.lowWater')],
            ['short', t('advisory.results.sort.short')],
          ] as const
        ).map(([key, label]) => (
          <button
            type="button"
            key={key}
            onClick={() => setFilter(filter === key ? null : key)}
            className={cn(
              'inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition',
              filter === key
                ? 'border-brand bg-brand-50 text-brand-700'
                : 'border-border bg-white text-ink-muted hover:border-brand-200',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Crop comparison grid */}
      <div className="grid gap-3 md:grid-cols-2">
        {sortedRecs.map((c) => (
          <CropCard
            key={c.crop_name}
            crop={c}
            expanded={expanded === c.crop_name}
            onToggle={() => setExpanded(expanded === c.crop_name ? null : c.crop_name)}
          />
        ))}
      </div>

      {/* Cropping strategies */}
      {data.cropping_strategies.length ? (
        <div>
          <h3 className="mb-3 text-base font-semibold text-ink">
            {t('advisory.strategies.title')}
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {data.cropping_strategies.map((s) => (
              <StrategyCard key={s.strategy_name} strategy={s} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Expert escalation */}
      {data.expert_consultation_recommended && data.expert_consultation_reasoning ? (
        <Card className="border-brand-200 bg-brand-50/40">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="mt-0.5 shrink-0 text-brand-700" />
            <div className="flex-1 text-sm">
              <div className="font-semibold text-ink">{t('advisory.expert.title')}</div>
              <p className="mt-1 text-ink-muted">{data.expert_consultation_reasoning}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent('nearest KVK ' + location)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button size="sm" variant="primary" leadingIcon={<ShieldAlert size={14} />}>
                    {t('advisory.expert.findKvk')}
                  </Button>
                </a>
                <a href="tel:1800-180-1551">
                  <Button size="sm" variant="secondary" leadingIcon={<Phone size={14} />}>
                    {t('advisory.expert.callKisan')}
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Caveats */}
      {data.caveats.length ? (
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {t('advisory.caveats.title')}
          </div>
          <ul className="mt-2 space-y-1.5 text-xs italic text-ink-muted">
            {data.caveats.map((c) => (
              <li key={c}>· {c}</li>
            ))}
          </ul>
          {data.data_freshness_note ? (
            <p className="mt-2 text-[11px] text-ink-subtle">{data.data_freshness_note}</p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

function CropCard({
  crop,
  expanded,
  onToggle,
}: {
  crop: AdvisoryCrop;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="space-y-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                crop.rank === 1 ? 'bg-brand text-white' : 'bg-surface-2 text-ink',
              )}
            >
              {crop.rank}
            </span>
            <h3 className="truncate text-base font-semibold text-ink">{crop.crop_name}</h3>
            <span className="text-xs text-ink-subtle">{crop.crop_name_local}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            <FitBadge score={crop.fit_score} label={crop.fit_label} />
            <span className="inline-flex items-center gap-1">
              <Droplets size={12} />
              {t(`advisory.water.${crop.requirements.water_requirement}`)}
            </span>
            <span>· {crop.timeline.duration_days} {t('advisory.crop.days')}</span>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={cn(
            'mt-1 shrink-0 text-ink-subtle transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <Mini label={t('advisory.crop.netProfit')} value={crop.economics.net_profit_estimate} />
        <Mini label={t('advisory.crop.yield')} value={crop.economics.expected_yield_range_per_acre} />
      </div>
      <EconomicsConfidence level={crop.economics.confidence_level} />
      {crop.scheme_eligibility.length ? (
        <div className="flex flex-wrap gap-1.5">
          {crop.scheme_eligibility.map((s) => (
            <span
              key={s}
              className="inline-flex items-center rounded-md bg-accent-50 px-2 py-0.5 text-[10px] font-semibold text-accent-600"
            >
              {s.replace('_', ' ')}
            </span>
          ))}
        </div>
      ) : null}

      {expanded ? (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 border-t border-border pt-3"
        >
          {crop.variety_suggestions.length ? (
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                {t('advisory.crop.varieties')}
                {crop.variety_data_confidence !== 'high' ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] normal-case text-amber-800">
                    {t(`advisory.crop.varietyConf.${crop.variety_data_confidence}`)}
                  </span>
                ) : null}
              </div>
              <ul className="space-y-1 text-xs text-ink-muted">
                {crop.variety_suggestions.map((v) => (
                  <li key={v.name}>
                    <span className="font-medium text-ink">{v.name}</span> · {v.duration_days}d ·{' '}
                    {v.notable_traits}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {crop.rationale.length ? (
            <Section title={t('advisory.crop.rationale')}>
              <ul className="space-y-1.5 text-xs text-ink-muted">
                {crop.rationale.map((r) => (
                  <li key={r} className="flex items-start gap-2">
                    <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-brand" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <Mini label={t('advisory.crop.revenue')} value={crop.economics.expected_revenue_per_acre} />
            <Mini label={t('advisory.crop.cost')} value={crop.economics.input_cost_per_acre} />
          </div>
          {crop.economics.msp_applicable && crop.economics.msp_price_per_quintal ? (
            <div className="rounded-xl bg-accent-50/50 px-3 py-2 text-xs text-accent-600">
              <span className="font-semibold">MSP:</span> {crop.economics.msp_price_per_quintal} ·{' '}
              <span className="text-ink-muted">{t('advisory.crop.mspNote')}</span>
            </div>
          ) : null}
          <div className="text-xs text-ink-muted">{crop.market_outlook}</div>

          {crop.timeline.critical_stages.length ? (
            <Section title={t('advisory.crop.timeline')}>
              <div className="text-xs text-ink-muted">
                <div>
                  <span className="font-medium text-ink">
                    {t('advisory.crop.sowingWindow')}:
                  </span>{' '}
                  {crop.timeline.sowing_window}
                </div>
                <div>
                  <span className="font-medium text-ink">
                    {t('advisory.crop.harvestWindow')}:
                  </span>{' '}
                  {crop.timeline.harvest_window}
                </div>
                <ul className="mt-1.5 list-disc pl-4">
                  {crop.timeline.critical_stages.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </Section>
          ) : null}

          <Section title={t('advisory.crop.fertilizer')}>
            <p className="text-xs text-ink-muted">{crop.requirements.fertilizer_summary}</p>
          </Section>

          {crop.key_risks.length ? (
            <Section title={t('advisory.crop.risks')}>
              <ul className="space-y-1.5 text-xs">
                {crop.key_risks.map((r) => (
                  <li key={r.risk} className="rounded-lg border border-border bg-surface-2 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-ink">{r.risk}</span>
                      <span
                        className={cn(
                          'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                          r.likelihood === 'high'
                            ? 'bg-red-100 text-red-700'
                            : r.likelihood === 'medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-brand-50 text-brand-700',
                        )}
                      >
                        {t(`advisory.likelihood.${r.likelihood}`)}
                      </span>
                    </div>
                    <p className="mt-1 text-ink-muted">{r.mitigation}</p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {crop.rotation_suggestions.length ? (
            <Section title={t('advisory.crop.rotation')}>
              <p className="text-xs text-ink-muted">
                {crop.rotation_suggestions.join(' · ')}
              </p>
            </Section>
          ) : null}

          {crop.best_for_zone !== 'primary_soil' ? (
            <div className="text-[11px] text-ink-subtle">
              <Info size={10} className="mr-1 inline" />
              {t(`advisory.crop.bestFor.${crop.best_for_zone}`)}
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </Card>
  );
}

function StrategyCard({ strategy }: { strategy: CroppingStrategy }) {
  const { t } = useTranslation();
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-ink">{strategy.strategy_name}</h4>
        <span
          className={cn(
            'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold',
            strategy.risk_level === 'high'
              ? 'bg-red-100 text-red-700'
              : strategy.risk_level === 'medium'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-brand-50 text-brand-700',
          )}
        >
          {t(`advisory.likelihood.${strategy.risk_level}`)} {t('advisory.strategies.risk')}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{strategy.description}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {strategy.crops_involved.map((c) => (
          <span
            key={c}
            className="inline-flex items-center rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink"
          >
            {c}
          </span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <Mini label={t('advisory.crop.revenue')} value={strategy.total_revenue_estimate} compact />
        <Mini label={t('advisory.crop.cost')} value={strategy.total_input_cost_estimate} compact />
        <Mini label={t('advisory.crop.netProfit')} value={strategy.net_estimate} compact />
      </div>
      <p className="mt-2 text-[11px] italic text-ink-subtle">{strategy.best_for_profile}</p>
    </Card>
  );
}

function FitBadge({ score, label }: { score: number; label: AdvisoryCrop['fit_label'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
        label === 'excellent'
          ? 'bg-brand text-white'
          : label === 'good'
            ? 'bg-brand-50 text-brand-700'
            : label === 'fair'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-red-100 text-red-700',
      )}
    >
      {Math.round(score)} · {label}
    </span>
  );
}

function EconomicsConfidence({
  level,
}: {
  level: AdvisoryCrop['economics']['confidence_level'];
}) {
  const { t } = useTranslation();
  if (level === 'estimate') return null;
  return (
    <div className="text-[10px] uppercase tracking-wide text-ink-subtle">
      <span className="rounded bg-surface-2 px-1.5 py-0.5">{t(`advisory.crop.econConf.${level}`)}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {title}
      </div>
      {children}
    </div>
  );
}

function Mini({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('rounded-lg border border-border bg-white', compact ? 'p-1.5' : 'p-2')}>
      <div className="text-[10px] uppercase tracking-wide text-ink-subtle">{label}</div>
      <div className={cn('mt-0.5 font-medium text-ink', compact ? 'text-[11px]' : 'text-xs')}>
        {value}
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-3">
      <Card>
        <div className="h-6 w-2/3 animate-pulse rounded bg-surface-2" />
        <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-surface-2" />
      </Card>
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="space-y-3">
          <div className="h-5 w-1/3 animate-pulse rounded bg-surface-2" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-12 animate-pulse rounded bg-surface-2" />
            <div className="h-12 animate-pulse rounded bg-surface-2" />
          </div>
        </Card>
      ))}
    </div>
  );
}

const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function monthToSeason(m: number): 'kharif' | 'rabi' | 'zaid' {
  if (m >= 6 && m <= 10) return 'kharif';
  if (m === 11 || m === 12 || m <= 3) return 'rabi';
  return 'zaid';
}

function parseProfit(s: string): number {
  // crude: extract first number cluster from a free-text rupee string
  const m = s.match(/[0-9][0-9,]*/);
  if (!m) return 0;
  return Number(m[0].replace(/,/g, '')) || 0;
}

// Build a fallback shaped like the new schema from the legacy mock so the
// results panel renders even when the backend is unreachable.
async function buildFallback(args: {
  location: string;
  primarySoil: SoilType;
  season: 'kharif' | 'rabi' | 'zaid';
}): Promise<AdvisoryResponse> {
  // The legacy mock has a smaller surface; we synthesise the rest with safe
  // defaults and clear honest labels. Map only the fields we actually have.
  const legacy = await getAdvisory({
    location: args.location,
    soilType:
      args.primarySoil === 'clay'
        ? 'clay'
        : args.primarySoil === 'sandy'
          ? 'sandy'
          : 'loam',
    season: args.season,
  });
  const recs: AdvisoryCrop[] = legacy.crops.map((c, idx) => ({
    rank: idx + 1,
    crop_name: c.name,
    crop_name_local: c.name,
    variety_suggestions: [],
    variety_data_confidence: 'low_general',
    fit_score: c.confidence,
    fit_label:
      c.confidence >= 85
        ? 'excellent'
        : c.confidence >= 70
          ? 'good'
          : c.confidence >= 55
            ? 'fair'
            : 'marginal',
    fit_breakdown: {
      soil_match: c.confidence,
      season_match: c.confidence,
      water_match: 60,
      budget_match: 60,
      market_match: 60,
    },
    economics: {
      confidence_level: 'indicative_only',
      expected_yield_range_per_acre: c.yieldRange,
      expected_revenue_per_acre: '—',
      input_cost_per_acre: '—',
      net_profit_estimate: '—',
      msp_applicable: false,
      msp_price_per_quintal: null,
      market_price_volatility: 'medium',
      notes: 'Offline mode — economics not available.',
    },
    timeline: {
      sowing_window: '—',
      duration_days: 120,
      harvest_window: '—',
      critical_stages: [],
    },
    requirements: {
      water_requirement: c.waterNeed as 'low' | 'medium' | 'high',
      irrigation_frequency: '—',
      fertilizer_summary: '—',
      labor_intensity: 'medium',
      mechanization_friendly: true,
    },
    rationale: c.rationale,
    key_risks: c.risks.map((r) => ({ risk: r, likelihood: 'medium', mitigation: '—' })),
    companion_crops: c.companions,
    rotation_suggestions: [],
    market_outlook: 'Subject to mandi conditions; verify via e-NAM.',
    scheme_eligibility: [],
    best_for_zone: 'primary_soil',
  }));
  return {
    recommendations: recs,
    cropping_strategies: [],
    general_advice: 'Offline guidance from the rule engine. Connect to AgriSmart AI for richer analysis.',
    weather_context_summary: '',
    caveats: ['Offline mode — yield and economic estimates are not available.'],
    expert_consultation_recommended: true,
    expert_consultation_reasoning:
      'AgriSmart AI is unreachable. Please consult your KVK before final cropping decisions.',
    data_freshness_note: '',
  };
}
