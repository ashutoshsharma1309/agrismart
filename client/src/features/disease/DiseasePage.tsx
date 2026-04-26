import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Bookmark,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Info,
  Phone,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Upload,
  Wifi,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { addHistory } from '../../lib/history';
import { logActivity } from '../../lib/session-activity';
import { analyseLeaf } from '../../lib/mock-api';
import {
  analyzeDisease,
  fileToDataUrl,
  type AiErrorReason,
  type ConfidenceLabel,
  type DifferentialDx,
  type DiseaseResponse,
} from '../../lib/ai-client';
import { cn } from '../../lib/utils';
import type { Lang } from '../../i18n';
import { AiDisclaimer } from '../../components/shared/AiDisclaimer';

type Severity = DiseaseResponse['severity'];
type Urgency = DiseaseResponse['urgency'];
type ImageQuality = DiseaseResponse['image_quality'];

// Normalized view that tolerates either a real LLM response or the offline
// mock fallback. Each render branch reads from this single shape.
type ReportView = {
  primary: {
    name: string;
    nameLocal: string;
    scientificName: string | null;
    confidence: number;
    confidenceLabel: ConfidenceLabel;
    confidenceReasoning: string;
  };
  differentials: DifferentialDx[];
  isDiseased: boolean;
  isHealthy: boolean;
  isNotLeaf: boolean;
  severity: Severity;
  severityReasoning: string;
  symptoms: string[];
  primaryCause: string | null;
  contributingFactors: string[];
  treatment: DiseaseResponse['treatment'];
  prevention: string[];
  spreadRisk: DiseaseResponse['spread_risk'];
  spreadTimeline: string | null;
  urgency: Urgency;
  imageQuality: ImageQuality;
  expert: DiseaseResponse['expert_escalation'];
  fallback: boolean;
  cached?: boolean;
};

const PROGRESS_STAGES: { key: string; i18n: string }[] = [
  { key: 'upload', i18n: 'disease.progress.upload' },
  { key: 'analyze', i18n: 'disease.progress.analyze' },
  { key: 'report', i18n: 'disease.progress.report' },
  { key: 'almost', i18n: 'disease.progress.almost' },
];

export function DiseasePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [report, setReport] = useState<ReportView | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [errorReason, setErrorReason] = useState<AiErrorReason | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const stageTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (stageTimerRef.current) window.clearTimeout(stageTimerRef.current);
    };
  }, [previewUrl]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const f = fileList[0];
    if (!f.type.startsWith('image/')) {
      toast.error(t('ai.error.invalidImage'));
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      toast.error(t('ai.error.imageTooLarge'));
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(f);
    setFile(f);
    setPreviewUrl(url);
    setReport(null);
    setErrorReason(null);
    setAnalyzing(true);
    setStageIndex(0);

    // Tick stages forward on a timer so even a single ~5s Groq call shows
    // progress. The actual response advances stage 2 when it arrives.
    if (stageTimerRef.current) window.clearTimeout(stageTimerRef.current);
    const advanceTo = (idx: number, delay: number) => {
      stageTimerRef.current = window.setTimeout(() => setStageIndex(idx), delay);
    };
    advanceTo(3, 5500);

    try {
      const dataUrl = await fileToDataUrl(f);
      setStageIndex(1);

      const ai = await analyzeDisease({ image_data_url: dataUrl, lang });
      setStageIndex(2);

      if (ai.ok && ai.data) {
        const view = normalizeFromApi(ai.data);
        setReport(view);
        logActivity(
          'disease',
          view.isNotLeaf
            ? 'Image not a leaf'
            : view.isHealthy
              ? 'Healthy leaf'
              : `${view.primary.name} · ${view.severity} · ${Math.round(view.primary.confidence * 100)}%`,
        );
      } else {
        setErrorReason(ai.ok ? null : ai.reason);
        const m = await analyseLeaf(f);
        setReport(normalizeFromMock(m));
        logActivity('disease', `${m.name} · ${m.severity} (offline)`);
      }
    } catch {
      setErrorReason('network_error');
      const m = await analyseLeaf(f);
      setReport(normalizeFromMock(m));
      logActivity('disease', `${m.name} · ${m.severity} (offline)`);
    } finally {
      if (stageTimerRef.current) window.clearTimeout(stageTimerRef.current);
      setAnalyzing(false);
    }
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setReport(null);
    setErrorReason(null);
    setStageIndex(0);
  };

  const save = () => {
    if (!report) return;
    addHistory({
      id: Math.random().toString(36).slice(2, 10),
      type: 'disease',
      createdAt: new Date().toISOString(),
      title: report.primary.name,
      summary: report.primaryCause ?? report.severityReasoning,
      severity:
        report.severity === 'unable_to_assess' ? 'mild' : (report.severity as 'mild' | 'moderate' | 'severe'),
    });
    toast.success(t('common.savedToHistory'));
  };

  return (
    <div className="container-page py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t('disease.title')}</h1>
        <p className="text-sm text-ink-muted">{t('disease.subtitle')}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          {!previewUrl ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void handleFiles(e.dataTransfer.files);
              }}
              className={cn(
                'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition',
                dragOver ? 'border-brand bg-brand-50/40' : 'border-border bg-surface-2',
              )}
            >
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm">
                <ImageIcon size={24} />
              </div>
              <div className="font-semibold text-ink">{t('disease.upload.drop')}</div>
              <div className="mt-1 text-sm text-ink-muted">{t('disease.upload.or')}</div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button
                  variant="primary"
                  leadingIcon={<Upload size={16} />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('disease.upload.browse')}
                </Button>
                <Button
                  variant="secondary"
                  leadingIcon={<Camera size={16} />}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  {t('disease.upload.camera')}
                </Button>
              </div>
              <p className="mt-4 max-w-sm text-xs text-ink-subtle">
                {t('disease.upload.hint')}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleFiles(e.target.files)}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => void handleFiles(e.target.files)}
              />
            </div>
          ) : (
            <div>
              <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-2">
                <img
                  src={previewUrl}
                  alt={file?.name ?? 'Uploaded leaf'}
                  className="h-[320px] w-full object-cover"
                />
                {analyzing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <Sparkles size={18} className="animate-pulse" />
                    </div>
                    <div className="text-sm font-semibold text-ink">{t('disease.analyzing')}</div>
                    <div className="flex items-center gap-2">
                      {PROGRESS_STAGES.map((s, i) => (
                        <span
                          key={s.key}
                          className={cn(
                            'inline-flex h-1.5 w-12 overflow-hidden rounded-full',
                            i <= stageIndex ? 'bg-brand' : 'bg-surface-3',
                          )}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-ink-muted">{t(PROGRESS_STAGES[stageIndex]?.i18n ?? '')}</div>
                  </div>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={<RotateCcw size={14} />}
                  onClick={reset}
                >
                  {t('common.analyzeAnother')}
                </Button>
                {report ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    leadingIcon={<Bookmark size={14} />}
                    onClick={save}
                  >
                    {t('common.saveToHistory')}
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {report ? (
            <ReportPanel report={report} errorReason={errorReason} />
          ) : errorReason && !analyzing ? (
            <Card className="border-red-200 bg-red-50 text-sm text-red-900">
              {errorReason === 'image_too_large'
                ? t('ai.error.imageTooLarge')
                : errorReason === 'invalid_image'
                  ? t('ai.error.invalidImage')
                  : errorReason === 'user_rate_limited' || errorReason === 'ip_rate_limited'
                    ? t('ai.error.rateLimited')
                    : errorReason === 'network_error'
                      ? t('ai.error.network')
                      : t('ai.error.unavailable')}
            </Card>
          ) : (
            <Card>
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-ink-muted">
                {t('disease.empty')}
              </div>
            </Card>
          )}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-ink">{t('disease.tips.title')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(['t1', 't2', 't3', 't4'] as const).map((k) => (
            <Card key={k}>
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <CheckCircle2 size={18} />
              </div>
              <h3 className="text-sm font-semibold text-ink">{t(`disease.tips.${k}.title`)}</h3>
              <p className="mt-1 text-sm text-ink-muted">{t(`disease.tips.${k}.body`)}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportPanel({
  report,
  errorReason,
}: {
  report: ReportView;
  errorReason: AiErrorReason | null;
}) {
  const { t } = useTranslation();
  const conf = report.primary.confidence;
  const tone = confidenceTone(report.primary.confidenceLabel);

  if (report.isNotLeaf) {
    return (
      <Card className="space-y-3 border-amber-200 bg-amber-50">
        <div className="flex items-center gap-2 font-semibold text-amber-900">
          <AlertTriangle size={18} />
          {t('disease.notLeaf.title')}
        </div>
        <p className="text-sm text-amber-900/90">{t('disease.notLeaf.body')}</p>
        {report.imageQuality.suggestion_for_better_photo ? (
          <p className="text-xs text-amber-800">
            {report.imageQuality.suggestion_for_better_photo}
          </p>
        ) : null}
      </Card>
    );
  }

  if (report.isHealthy) {
    return (
      <Card className="space-y-3 border-brand-200 bg-brand-50/40">
        <div className="flex items-center gap-2 font-semibold text-brand-700">
          <CheckCircle2 size={18} />
          {t('disease.healthy.title')}
        </div>
        <p className="text-sm text-ink-muted">{report.primary.confidenceReasoning}</p>
        <AiDisclaimer />
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      {report.fallback ? (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <Wifi size={14} className="mt-0.5 shrink-0" />
          <div>
            <div>{t('ai.banner.fallback')}</div>
            {errorReason ? (
              <div className="mt-0.5 text-[11px] text-amber-800/80">
                {t(`ai.error.${errorReason}`, { defaultValue: errorReason })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Confidence-aware banner */}
      <div
        className={cn(
          'rounded-xl border px-3.5 py-3 text-sm',
          tone === 'green'
            ? 'border-brand-200 bg-brand-50/60 text-brand-700'
            : tone === 'brand'
              ? 'border-brand-200 bg-brand-50/40 text-brand-700'
              : tone === 'amber'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-red-200 bg-red-50 text-red-900',
        )}
      >
        <div className="font-semibold">
          {t(`disease.confidence.banner.${report.primary.confidenceLabel}`)}
        </div>
        <div className="mt-1 text-xs opacity-90">{report.primary.confidenceReasoning}</div>
      </div>

      {/* Heading */}
      <div>
        <h2 className="text-xl font-bold text-ink">{report.primary.name}</h2>
        {report.primary.nameLocal && report.primary.nameLocal !== report.primary.name ? (
          <div className="text-sm text-ink-muted">{report.primary.nameLocal}</div>
        ) : null}
        {report.primary.scientificName ? (
          <p className="mt-0.5 text-xs italic text-ink-subtle">{report.primary.scientificName}</p>
        ) : null}
      </div>

      {/* Confidence bar */}
      <ConfidenceBar value={conf} tone={tone} label={report.primary.confidenceLabel} />

      {/* Severity strip */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
        <span
          className={cn(
            'h-3 w-3 rounded-full',
            report.severity === 'severe'
              ? 'bg-danger'
              : report.severity === 'moderate'
                ? 'bg-warning'
                : 'bg-brand',
          )}
        />
        <div className="flex-1 text-sm">
          <span className="font-medium text-ink">
            {t(`disease.severity.${report.severity}`)}
          </span>
          <span className="ml-2 text-xs text-ink-muted">{report.severityReasoning}</span>
        </div>
      </div>

      {/* Image quality feedback */}
      {!report.imageQuality.is_clear ||
      !report.imageQuality.lighting_adequate ||
      !report.imageQuality.angle_useful ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
          <div className="flex items-start gap-2 text-sm text-amber-900">
            <Info size={14} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold">{t('disease.quality.title')}</div>
              {report.imageQuality.quality_note ? (
                <p className="mt-0.5 text-xs">{report.imageQuality.quality_note}</p>
              ) : null}
              {report.imageQuality.suggestion_for_better_photo ? (
                <p className="mt-1 text-xs">
                  {report.imageQuality.suggestion_for_better_photo}
                </p>
              ) : null}
              {report.imageQuality.additional_photos_recommended.length ? (
                <ul className="mt-1 list-disc pl-4 text-xs">
                  {report.imageQuality.additional_photos_recommended.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Differentials */}
      {report.differentials.length ? (
        <details
          className="rounded-xl border border-border bg-white"
          open={
            report.primary.confidenceLabel === 'moderate' ||
            report.primary.confidenceLabel === 'low'
          }
        >
          <summary className="cursor-pointer list-none px-3.5 py-2.5 text-sm font-semibold text-ink">
            {t('disease.differentials.title', { n: report.differentials.length })}
          </summary>
          <div className="space-y-3 border-t border-border px-3.5 py-3">
            {report.differentials.map((d) => (
              <div key={d.common_name}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-ink">{d.common_name}</div>
                  <div className="text-xs text-ink-subtle">
                    {Math.round(d.probability * 100)}%
                  </div>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-full rounded-full bg-ink/30"
                    style={{ width: `${Math.round(d.probability * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-ink-muted">{d.distinguishing_features}</p>
                <p className="mt-0.5 text-xs italic text-ink-subtle">
                  {t('disease.differentials.check')}: {d.what_to_check}
                </p>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {/* Symptoms + cause */}
      {report.symptoms.length ? (
        <Section title={t('disease.report.symptoms')}>
          <ul className="space-y-1.5 text-sm text-ink-muted">
            {report.symptoms.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-brand" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      {report.primaryCause ? (
        <Section title={t('disease.report.cause')}>
          <p className="text-sm text-ink-muted">{report.primaryCause}</p>
        </Section>
      ) : null}

      {/* Treatment block, confidence-gated */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          {t('disease.report.treatment')}
        </div>

        {/* Always shown */}
        <Section title={t('disease.treatment.immediate')} compact>
          <p className="text-sm text-ink">{report.treatment.immediate_action}</p>
        </Section>
        {report.treatment.cultural_control.length ? (
          <Section title={t('disease.treatment.cultural')} compact>
            <ul className="space-y-1.5 text-sm text-ink-muted">
              {report.treatment.cultural_control.map((s) => (
                <li key={s} className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {/* Org/bio at conf >= 0.55 (server has filled them) */}
        {conf >= 0.55 ? (
          <Tabs defaultValue="organic" className="mt-4">
            <TabsList>
              {report.treatment.organic_chemical.recommendation ? (
                <TabsTrigger value="organic">{t('disease.treatment.organic')}</TabsTrigger>
              ) : null}
              {report.treatment.biological_control.recommendation ? (
                <TabsTrigger value="biological">{t('disease.treatment.biological')}</TabsTrigger>
              ) : null}
              {report.treatment.synthetic_chemical.recommended ? (
                <TabsTrigger value="synthetic">{t('disease.treatment.synthetic')}</TabsTrigger>
              ) : null}
            </TabsList>
            {report.treatment.organic_chemical.recommendation ? (
              <TabsContent value="organic">
                <TreatmentBlock
                  recommendation={report.treatment.organic_chemical.recommendation}
                  preparation={report.treatment.organic_chemical.preparation}
                  application={report.treatment.organic_chemical.application}
                  iconColor="text-brand"
                />
              </TabsContent>
            ) : null}
            {report.treatment.biological_control.recommendation ? (
              <TabsContent value="biological">
                <TreatmentBlock
                  recommendation={report.treatment.biological_control.recommendation}
                  preparation={report.treatment.biological_control.preparation}
                  application={report.treatment.biological_control.application}
                  iconColor="text-accent-600"
                />
              </TabsContent>
            ) : null}
            {report.treatment.synthetic_chemical.recommended ? (
              <TabsContent value="synthetic">
                <SyntheticBlock sc={report.treatment.synthetic_chemical} />
              </TabsContent>
            ) : null}
          </Tabs>
        ) : null}

        {/* Below 0.7 confidence: synthetic chemical replaced with KVK card */}
        {conf < 0.7 ? (
          <Card className="mt-4 border-brand-200 bg-brand-50/40">
            <div className="flex items-start gap-3">
              <ShieldAlert size={20} className="mt-0.5 shrink-0 text-brand-700" />
              <div className="flex-1 text-sm">
                <div className="font-semibold text-ink">{t('disease.kvk.title')}</div>
                <p className="mt-1 text-ink-muted">
                  {report.treatment.synthetic_chemical.kvk_consultation_reasoning}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <KvkSearchButton term={report.expert.nearest_kvk_search_term} />
                  <KisanCallButton />
                </div>
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      {/* Prevention */}
      {report.prevention.length ? (
        <Section title={t('disease.report.prevention')}>
          <ul className="space-y-1.5 text-sm text-ink-muted">
            {report.prevention.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Spread risk + urgency */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
          <div className="text-ink-subtle">{t('disease.spread.risk')}</div>
          <div className="mt-0.5 font-medium text-ink">
            {t(`disease.spread.${report.spreadRisk}`)}
            {report.spreadTimeline ? (
              <span className="text-ink-muted"> · {report.spreadTimeline}</span>
            ) : null}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
          <div className="text-ink-subtle">{t('disease.urgency.label')}</div>
          <div className="mt-0.5 font-medium text-ink">
            {t(`disease.urgency.${report.urgency}`)}
          </div>
        </div>
      </div>

      {/* Expert escalation */}
      {report.expert.recommended ? (
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-red-700" />
            <div className="flex-1 text-sm">
              <div className="font-semibold text-red-900">{t('disease.escalation.title')}</div>
              <p className="mt-1 text-red-900/90">{report.expert.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <KvkSearchButton term={report.expert.nearest_kvk_search_term} />
                <KisanCallButton />
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <AiDisclaimer />
    </Card>
  );
}

function ConfidenceBar({
  value,
  tone,
  label,
}: {
  value: number;
  tone: ConfTone;
  label: ConfidenceLabel;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-ink-muted">
          {t('disease.confidence.label')}: {t(`disease.confidence.${label}`)}
        </span>
        <span className="font-medium text-ink">{Math.round(value * 100)}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
        <span
          className={cn(
            'block h-full rounded-full transition-all duration-700',
            tone === 'green' && 'bg-brand',
            tone === 'brand' && 'bg-brand-500',
            tone === 'amber' && 'bg-warning',
            tone === 'red' && 'bg-danger',
          )}
          style={{ width: `${Math.max(4, Math.round(value * 100))}%` }}
        />
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  compact,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'mt-3' : ''}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {title}
      </div>
      {children}
    </div>
  );
}

function TreatmentBlock({
  recommendation,
  preparation,
  application,
  iconColor,
}: {
  recommendation: string | null;
  preparation: string | null;
  application: string | null;
  iconColor: string;
}) {
  if (!recommendation) return null;
  return (
    <div className="space-y-2 text-sm text-ink">
      <div className="flex items-start gap-2">
        <CheckCircle2 size={14} className={cn('mt-0.5 shrink-0', iconColor)} />
        <span className="font-medium">{recommendation}</span>
      </div>
      {preparation ? (
        <div className="ml-6 text-xs text-ink-muted">{preparation}</div>
      ) : null}
      {application ? (
        <div className="ml-6 text-xs text-ink-subtle">{application}</div>
      ) : null}
    </div>
  );
}

function SyntheticBlock({ sc }: { sc: DiseaseResponse['treatment']['synthetic_chemical'] }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 text-sm">
      {sc.product_class ? (
        <div className="rounded-xl bg-surface-2 px-3 py-2 text-xs">
          <span className="font-semibold text-ink">{t('disease.synthetic.class')}: </span>
          <span className="text-ink-muted">{sc.product_class}</span>
        </div>
      ) : null}
      {sc.indian_examples.length ? (
        <div className="text-xs">
          <div className="font-semibold text-ink-subtle">{t('disease.synthetic.examples')}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {sc.indian_examples.map((ex) => (
              <span
                key={ex}
                className="inline-flex items-center rounded-md bg-surface-2 px-2 py-0.5 font-medium text-ink"
              >
                {ex}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {sc.typical_concentration ? (
        <div className="text-xs text-ink-muted">
          <span className="font-semibold text-ink-subtle">
            {t('disease.synthetic.concentration')}:{' '}
          </span>
          <span className="font-medium text-ink">{sc.typical_concentration}</span>
        </div>
      ) : null}
      {sc.application_method ? (
        <div className="text-xs text-ink-muted">{sc.application_method}</div>
      ) : null}
      {sc.ppe_required.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <div className="font-semibold">{t('disease.synthetic.ppe')}</div>
          <div className="mt-0.5">{sc.ppe_required.join(' · ')}</div>
        </div>
      ) : null}
      <div className="rounded-xl border border-brand-200 bg-brand-50/40 px-3 py-2 text-xs text-brand-700">
        <span className="font-semibold">{t('disease.synthetic.kvkRequired')}: </span>
        {sc.kvk_consultation_reasoning}
      </div>
    </div>
  );
}

function KvkSearchButton({ term }: { term: string }) {
  const { t } = useTranslation();
  const safe = term?.trim() || 'KVK nearest agriculture';
  const url = `https://www.google.com/search?q=${encodeURIComponent(safe)}`;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <Button size="sm" variant="primary" leadingIcon={<ShieldAlert size={14} />}>
        {t('disease.kvk.find')}
      </Button>
    </a>
  );
}

function KisanCallButton() {
  const { t } = useTranslation();
  return (
    <a href="tel:1800-180-1551">
      <Button size="sm" variant="secondary" leadingIcon={<Phone size={14} />}>
        {t('disease.kvk.callKisan')}
      </Button>
    </a>
  );
}

type ConfTone = 'green' | 'brand' | 'amber' | 'red';

function confidenceTone(label: ConfidenceLabel): ConfTone {
  if (label === 'very_high') return 'green';
  if (label === 'high') return 'brand';
  if (label === 'moderate') return 'amber';
  return 'red';
}

function normalizeFromApi(d: DiseaseResponse): ReportView {
  const name = d.primary_diagnosis.common_name.toLowerCase();
  return {
    primary: {
      name: d.primary_diagnosis.common_name,
      nameLocal: d.primary_diagnosis.common_name_local,
      scientificName: d.primary_diagnosis.scientific_name,
      confidence: d.primary_diagnosis.confidence,
      confidenceLabel: d.primary_diagnosis.confidence_label,
      confidenceReasoning: d.primary_diagnosis.confidence_reasoning,
    },
    differentials: d.differential_diagnoses,
    isDiseased: d.is_diseased,
    isHealthy: name === 'healthy',
    isNotLeaf: name === 'not_a_leaf' || !d.image_quality.is_leaf,
    severity: d.severity,
    severityReasoning: d.severity_reasoning,
    symptoms: d.symptoms_observed,
    primaryCause: d.primary_cause,
    contributingFactors: d.contributing_factors,
    treatment: d.treatment,
    prevention: d.prevention,
    spreadRisk: d.spread_risk,
    spreadTimeline: d.spread_timeline,
    urgency: d.urgency,
    imageQuality: d.image_quality,
    expert: d.expert_escalation,
    fallback: false,
  };
}

type LegacyMock = Awaited<ReturnType<typeof analyseLeaf>>;

function normalizeFromMock(m: LegacyMock): ReportView {
  // The offline mock has fewer fields. Map what we have, leave the rest sane.
  return {
    primary: {
      name: m.name,
      nameLocal: m.name,
      scientificName: m.scientificName,
      confidence: 0.5,
      confidenceLabel: 'moderate',
      confidenceReasoning:
        'Offline diagnosis from rule engine — actual confidence unknown until backend AI is reachable.',
    },
    differentials: [],
    isDiseased: true,
    isHealthy: false,
    isNotLeaf: false,
    severity: m.severity,
    severityReasoning: '',
    symptoms: m.symptoms,
    primaryCause: m.cause,
    contributingFactors: [],
    treatment: {
      safe_to_recommend: false,
      immediate_action:
        'Quarantine the affected plants and remove obviously diseased leaves. Photograph for follow-up.',
      cultural_control: m.prevention,
      biological_control: { recommendation: null, preparation: null, application: null },
      organic_chemical:
        m.organicTreatment[0]
          ? { recommendation: m.organicTreatment[0], preparation: null, application: null }
          : { recommendation: null, preparation: null, application: null },
      synthetic_chemical: {
        recommended: false,
        product_class: null,
        indian_examples: [],
        typical_concentration: null,
        application_method: null,
        ppe_required: [],
        kvk_consultation_required: true,
        kvk_consultation_reasoning:
          'Offline mode — please consult your KVK or agriculture officer for a chemical recommendation.',
      },
    },
    prevention: m.prevention,
    spreadRisk: 'unknown',
    spreadTimeline: null,
    urgency: 'consult_expert',
    imageQuality: {
      is_leaf: true,
      is_clear: true,
      lighting_adequate: true,
      angle_useful: true,
      quality_note: null,
      suggestion_for_better_photo: null,
      additional_photos_recommended: [],
    },
    expert: {
      recommended: true,
      reason:
        'Offline diagnosis cannot be calibrated. Please confirm with a local KVK before treating.',
      nearest_kvk_search_term: 'nearest KVK agriculture extension',
    },
    fallback: true,
  };
}
