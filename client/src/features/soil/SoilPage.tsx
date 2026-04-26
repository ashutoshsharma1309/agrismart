import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BookmarkPlus,
  Leaf,
  ShieldAlert,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { runSoilAnalysis } from '../../lib/mock-api';
import { addHistory, pushSoilScore } from '../../lib/history';
import { logActivity } from '../../lib/session-activity';
import { COMMON_FERTILIZERS, COMMON_PESTICIDES } from '../../lib/constants';
import { clamp } from '../../lib/utils';
import { analyzeSoil } from '../../lib/ai-client';
import type { Lang } from '../../i18n';

type SoilView = {
  healthScore: number;
  fertilizer: { name: string; rationale: string; dosage: string };
  pesticide: { name: string; rationale: string; applicationNotes: string };
  plan: { step: number; title: string; body: string }[];
  warnings: string[];
  fallback: boolean;
};

export function SoilPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const [n, setN] = useState('55');
  const [p, setP] = useState('30');
  const [k, setK] = useState('40');
  const [ph, setPh] = useState('6.8');
  const [oc, setOc] = useState('0.55');
  const [crop, setCrop] = useState('Rice');
  const [fert, setFert] = useState('Urea');
  const [pest, setPest] = useState('Chlorpyrifos');
  const [result, setResult] = useState<SoilView | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ai = await analyzeSoil({
        nitrogen_kg_ha: Number(n) || 0,
        phosphorus_kg_ha: Number(p) || 0,
        potassium_kg_ha: Number(k) || 0,
        ph: Number(ph) || 7,
        organic_carbon_pct: Number(oc) || 0,
        intended_crop: crop,
        intended_fertilizer: fert,
        intended_pesticide: pest,
        lang,
      });

      if (ai.ok && ai.data) {
        const view: SoilView = {
          healthScore: ai.data.soil_health_score,
          fertilizer: {
            name: ai.data.eco_fertilizer.recommendation,
            rationale: ai.data.eco_fertilizer.reasoning,
            dosage: ai.data.eco_fertilizer.application_rate,
          },
          pesticide: {
            name: ai.data.eco_pesticide.recommendation,
            rationale: ai.data.eco_pesticide.reasoning,
            applicationNotes: ai.data.eco_pesticide.application_notes,
          },
          plan: ai.data.improvement_plan.map((p) => ({
            step: p.step,
            title: p.action,
            body: `${p.timing ? p.timing + ' — ' : ''}${p.expected_impact}`,
          })),
          warnings: ai.data.warnings,
          fallback: false,
        };
        setResult(view);
        pushSoilScore(view.healthScore);
        logActivity('soil', `${crop} · score ${view.healthScore}/100`);
      } else {
        // Fall back to the offline rule engine.
        const r = await runSoilAnalysis({
          n: Number(n) || 0,
          p: Number(p) || 0,
          k: Number(k) || 0,
          ph: Number(ph) || 7,
          organicCarbon: Number(oc) || 0,
          fertilizer: fert,
          pesticide: pest,
        });
        const view: SoilView = {
          healthScore: r.healthScore,
          fertilizer: r.fertilizer,
          pesticide: {
            name: r.pesticide.name,
            rationale: r.pesticide.rationale,
            applicationNotes: '',
          },
          plan: r.plan,
          warnings: [],
          fallback: true,
        };
        setResult(view);
        pushSoilScore(view.healthScore);
        logActivity('soil', `${crop} · score ${view.healthScore}/100 (offline)`);
      }
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    if (!result) return;
    addHistory({
      id: Math.random().toString(36).slice(2, 10),
      type: 'soil',
      createdAt: new Date().toISOString(),
      title: `Soil plan · score ${result.healthScore}`,
      summary: `${result.fertilizer.name} · ${result.pesticide.name}`,
      score: result.healthScore,
    });
    toast.success(t('common.savedToHistory'));
  };

  return (
    <div className="container-page py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t('soil.title')}</h1>
        <p className="text-sm text-ink-muted">{t('soil.subtitle')}</p>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-base font-semibold text-ink">{t('soil.form.report.title')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('soil.form.nitrogen')}
              type="number"
              min={0}
              max={300}
              value={n}
              onChange={(e) => setN(e.target.value)}
              help="kg/ha"
            />
            <Input
              label={t('soil.form.phosphorus')}
              type="number"
              min={0}
              max={200}
              value={p}
              onChange={(e) => setP(e.target.value)}
              help="kg/ha"
            />
            <Input
              label={t('soil.form.potassium')}
              type="number"
              min={0}
              max={300}
              value={k}
              onChange={(e) => setK(e.target.value)}
              help="kg/ha"
            />
            <Input
              label={t('soil.form.ph')}
              type="number"
              step="0.1"
              min={3}
              max={10}
              value={ph}
              onChange={(e) => setPh(e.target.value)}
            />
            <Input
              label={t('soil.form.organicCarbon')}
              type="number"
              step="0.05"
              min={0}
              max={3}
              value={oc}
              onChange={(e) => setOc(e.target.value)}
              help="%"
              className="col-span-2"
            />
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-base font-semibold text-ink">{t('soil.form.plan.title')}</h3>
          <div className="space-y-4">
            <Input
              label="Intended crop"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              placeholder="e.g. Rice, Wheat"
            />
            <Input
              label={t('soil.form.fertilizer')}
              value={fert}
              onChange={(e) => setFert(e.target.value)}
              placeholder={t('soil.form.fertilizerPlaceholder')}
              list="fertilizer-list"
            />
            <datalist id="fertilizer-list">
              {COMMON_FERTILIZERS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            <Input
              label={t('soil.form.pesticide')}
              value={pest}
              onChange={(e) => setPest(e.target.value)}
              placeholder={t('soil.form.pesticidePlaceholder')}
              list="pesticide-list"
            />
            <datalist id="pesticide-list">
              {COMMON_PESTICIDES.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={loading}
              leadingIcon={<Sparkles size={18} />}
            >
              {t('soil.form.submit')}
            </Button>
          </div>
        </Card>
      </form>

      {loading ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <div className="mb-3 h-9 w-9 animate-pulse rounded-lg bg-surface-2" />
              <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
              <div className="mt-3 h-20 w-full animate-pulse rounded bg-surface-2" />
            </Card>
          ))}
        </div>
      ) : result ? (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          {result.fallback ? (
            <Card className="mb-5 border-amber-200 bg-amber-50">
              <div className="flex items-center gap-3 text-sm text-amber-900">
                <Wifi size={16} />
                {t('ai.banner.fallback')}
              </div>
            </Card>
          ) : null}

          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-ink">{t('soil.result.title')}</h2>
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={<BookmarkPlus size={14} />}
              onClick={save}
            >
              {t('common.saveToHistory')}
            </Button>
          </div>

          {result.warnings.length > 0 ? (
            <Card className="mb-5 border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />
                <div>
                  <div className="text-sm font-semibold text-red-900">Heads up</div>
                  <ul className="mt-1 space-y-1 text-sm text-red-900/90">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-3">
            <Card>
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Leaf size={18} />
              </div>
              <h3 className="text-base font-semibold text-ink">{t('soil.result.fertilizer')}</h3>
              <div className="mt-2 text-sm font-medium text-brand-700">
                {result.fertilizer.name}
              </div>
              <p className="mt-2 text-sm text-ink-muted">{result.fertilizer.rationale}</p>
              {result.fertilizer.dosage ? (
                <div className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
                  {result.fertilizer.dosage}
                </div>
              ) : null}
            </Card>

            <Card>
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                <ShieldAlert size={18} />
              </div>
              <h3 className="text-base font-semibold text-ink">{t('soil.result.pesticide')}</h3>
              <div className="mt-2 text-sm font-medium text-accent-600">
                {result.pesticide.name}
              </div>
              <p className="mt-2 text-sm text-ink-muted">{result.pesticide.rationale}</p>
              {result.pesticide.applicationNotes ? (
                <div className="mt-3 rounded-xl bg-accent-50 px-3 py-2 text-xs font-medium text-accent-600">
                  {result.pesticide.applicationNotes}
                </div>
              ) : null}
            </Card>

            <Card>
              <h3 className="mb-4 text-base font-semibold text-ink">{t('soil.result.health')}</h3>
              <HealthGauge score={result.healthScore} />
            </Card>
          </div>

          <div className="mt-6">
            <Card>
              <h3 className="mb-4 text-base font-semibold text-ink">{t('soil.result.plan')}</h3>
              <ol className="grid gap-3 md:grid-cols-3">
                {result.plan.map((p) => (
                  <li
                    key={p.step}
                    className="rounded-2xl border border-border bg-surface-2 p-4"
                  >
                    <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                      {p.step}
                    </div>
                    <div className="text-sm font-semibold text-ink">{p.title}</div>
                    <div className="mt-1 text-sm text-ink-muted">{p.body}</div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </motion.section>
      ) : null}
    </div>
  );
}

function HealthGauge({ score }: { score: number }) {
  const safeScore = clamp(score, 0, 100);
  const radius = 56;
  const circ = Math.PI * radius;
  const offset = circ * (1 - safeScore / 100);
  const color = safeScore >= 70 ? '#16A34A' : safeScore >= 45 ? '#F59E0B' : '#DC2626';
  return (
    <div className="flex items-center gap-5">
      <svg width={140} height={80} viewBox="0 0 140 80" aria-hidden>
        <path
          d={`M 14 70 A ${radius} ${radius} 0 0 1 126 70`}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={12}
          strokeLinecap="round"
        />
        <path
          d={`M 14 70 A ${radius} ${radius} 0 0 1 126 70`}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div>
        <div className="font-display text-4xl font-bold text-ink">{safeScore}</div>
        <div className="text-xs uppercase tracking-wide text-ink-subtle">/ 100</div>
      </div>
    </div>
  );
}
