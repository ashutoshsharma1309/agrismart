import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Bell,
  Cpu,
  Database,
  Download,
  Globe,
  Info,
  Mail,
  Shield,
  Trash2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Dialog } from '../../components/ui/Dialog';
import { useProfile } from '../../app/profile';
import { INDIAN_STATES } from '../../lib/constants';
import { languages, setLanguage, type Lang } from '../../i18n';
import { defaultSettings, getSettings, saveSettings, type AppSettings } from '../../lib/settings';
import { clearActivity } from '../../lib/session-activity';
import { cn } from '../../lib/utils';

const APP_VERSION = '1.0.0';
const BUILD_DATE = '2026-04-25';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { profile, setProfile } = useProfile();
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const handler = () => setSettings(getSettings());
    window.addEventListener('agrismart:settings', handler);
    return () => window.removeEventListener('agrismart:settings', handler);
  }, []);

  const update = (patch: Partial<AppSettings>) => {
    const next = saveSettings(patch);
    setSettings(next);
  };

  const onLanguageChange = (code: Lang) => {
    setLanguage(code);
    setProfile({ ...profile, language: code });
    toast.success(t('settings.toast.languageChanged'));
  };

  const onDownloadData = () => {
    const dump: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('agrismart.')) continue;
      try {
        dump[key] = JSON.parse(localStorage.getItem(key) ?? 'null');
      } catch {
        dump[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agrismart-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('settings.toast.exported'));
  };

  const onClearSession = () => {
    clearActivity();
    setConfirmOpen(false);
    toast.success(t('settings.toast.cleared'));
  };

  return (
    <div className="container-page py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t('settings.title')}</h1>
        <p className="text-sm text-ink-muted">{t('settings.subtitle')}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section 1 — Language & Region */}
        <Card>
          <SectionHeader icon={<Globe size={18} />} title={t('settings.lang.title')} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select
              label={t('settings.lang.language')}
              value={i18n.language}
              onChange={(e) => onLanguageChange(e.target.value as Lang)}
              options={languages.map((l) => ({ value: l.code, label: l.nativeName }))}
            />
            <Select
              label={t('settings.lang.region')}
              value={profile.state}
              onChange={(e) => setProfile({ ...profile, state: e.target.value })}
              placeholder={t('settings.lang.regionPlaceholder')}
              options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-muted">
            <Info size={14} />
            {t('settings.lang.units')}
          </div>
        </Card>

        {/* Section 2 — Notifications */}
        <Card>
          <SectionHeader icon={<Bell size={18} />} title={t('settings.notif.title')} />
          <div className="mt-4 divide-y divide-border">
            <ToggleRow
              label={t('settings.notif.weatherAlerts')}
              hint={t('settings.notif.weatherAlertsHint')}
              checked={settings.notifyWeatherAlerts}
              onChange={(v) => update({ notifyWeatherAlerts: v })}
            />
            <ToggleRow
              label={t('settings.notif.dailyTip')}
              hint={t('settings.notif.dailyTipHint')}
              checked={settings.notifyDailyTip}
              onChange={(v) => update({ notifyDailyTip: v })}
            />
            <ToggleRow
              label={t('settings.notif.diseaseWarnings')}
              hint={t('settings.notif.diseaseWarningsHint')}
              checked={settings.notifyDiseaseWarnings}
              onChange={(v) => update({ notifyDiseaseWarnings: v })}
            />
          </div>
        </Card>

        {/* Section 3 — AI Preferences */}
        <Card>
          <SectionHeader icon={<Cpu size={18} />} title={t('settings.ai.title')} />
          <div className="mt-4 divide-y divide-border">
            <ToggleRow
              label={t('settings.ai.useAdvisory')}
              hint={t('settings.ai.useAdvisoryHint')}
              checked={settings.useAiAdvisory}
              onChange={(v) => update({ useAiAdvisory: v })}
            />
            <ToggleRow
              label={t('settings.ai.saveConvos')}
              hint={t('settings.ai.saveConvosHint')}
              checked={settings.saveAiConversations}
              onChange={(v) => update({ saveAiConversations: v })}
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="mt-3"
            onClick={() => {
              update({ ...defaultSettings });
              toast.success(t('settings.toast.reset'));
            }}
          >
            {t('settings.ai.reset')}
          </Button>
        </Card>

        {/* Section 4 — Data & Privacy */}
        <Card>
          <SectionHeader icon={<Shield size={18} />} title={t('settings.privacy.title')} />
          <p className="mt-3 text-sm text-ink-muted">{t('settings.privacy.body')}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<Download size={14} />}
              onClick={onDownloadData}
            >
              {t('settings.privacy.download')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              leadingIcon={<Trash2 size={14} />}
              onClick={() => setConfirmOpen(true)}
            >
              {t('settings.privacy.clear')}
            </Button>
          </div>
        </Card>

        {/* Section 5 — About */}
        <Card className="lg:col-span-2">
          <SectionHeader icon={<Database size={18} />} title={t('settings.about.title')} />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Stat label={t('settings.about.version')} value={`v${APP_VERSION}`} />
            <Stat label={t('settings.about.build')} value={BUILD_DATE} />
            <Stat label={t('settings.about.platform')} value="Web · MVP" />
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a
              href="mailto:hello@agrismart.app"
              className="inline-flex items-center gap-1.5 text-brand-600 hover:underline"
            >
              <Mail size={14} />
              {t('settings.about.contact')}
            </a>
          </div>
        </Card>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('settings.confirm.title')}
        description={t('settings.confirm.body')}
      >
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" size="sm" onClick={onClearSession}>
            {t('settings.confirm.confirm')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        {icon}
      </div>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink">{label}</div>
        {hint ? <div className="mt-0.5 text-xs text-ink-muted">{hint}</div> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition',
          checked ? 'bg-brand' : 'bg-border-strong',
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-ink-subtle">{label}</div>
      <div className="mt-1 text-base font-semibold text-ink">{value}</div>
    </div>
  );
}
