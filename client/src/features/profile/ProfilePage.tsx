import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SelectableChip } from '../../components/ui/Chip';
import { Avatar } from '../../components/shared/Avatar';
import { useProfile, type FarmerProfile } from '../../app/profile';
import { COMMON_CROPS, INDIAN_STATES } from '../../lib/constants';
import { languages, setLanguage, type Lang } from '../../i18n';

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { profile, setProfile } = useProfile();
  const [draft, setDraft] = useState<FarmerProfile>(profile);

  const update = (patch: Partial<FarmerProfile>) => setDraft((d) => ({ ...d, ...patch }));
  const toggleCrop = (c: string) =>
    setDraft((d) =>
      d.crops.includes(c) ? { ...d, crops: d.crops.filter((x) => x !== c) } : { ...d, crops: [...d.crops, c] },
    );

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(draft);
    if (draft.language && draft.language !== i18n.language) {
      setLanguage(draft.language as Lang);
    }
    toast.success(t('profile.saved'));
  };

  return (
    <div className="container-page py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t('profile.title')}</h1>
        <p className="text-sm text-ink-muted">{t('profile.subtitle')}</p>
      </header>

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center gap-3 text-center lg:col-span-1">
          <Avatar name={draft.name || 'Farmer'} size={88} />
          <div className="font-semibold text-ink">{draft.name || '—'}</div>
          <div className="text-sm text-ink-muted">
            {[draft.district, draft.state].filter(Boolean).join(', ') || '—'}
          </div>
          {draft.farmSize ? (
            <div className="text-xs text-ink-subtle">{draft.farmSize} acres</div>
          ) : null}
        </Card>

        <Card className="grid gap-4 lg:col-span-2 sm:grid-cols-2">
          <Input
            label={t('profile.name')}
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            className="sm:col-span-2"
          />
          <Input
            label={t('profile.phone')}
            value={draft.phone}
            onChange={(e) => update({ phone: e.target.value })}
            inputMode="tel"
          />
          <Input
            label={t('profile.farmSize')}
            type="number"
            min={0}
            step="0.1"
            value={draft.farmSize}
            onChange={(e) => update({ farmSize: e.target.value })}
          />
          <Select
            label={t('profile.state')}
            value={draft.state}
            onChange={(e) => update({ state: e.target.value })}
            placeholder="Select state"
            options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
          />
          <Input
            label={t('profile.district')}
            value={draft.district}
            onChange={(e) => update({ district: e.target.value })}
          />
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-ink">{t('profile.crops')}</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_CROPS.map((c) => (
                <SelectableChip
                  key={c}
                  selected={draft.crops.includes(c)}
                  onClick={() => toggleCrop(c)}
                >
                  {c}
                </SelectableChip>
              ))}
            </div>
          </div>
          <Select
            label={t('profile.language')}
            value={draft.language || i18n.language}
            onChange={(e) => update({ language: e.target.value })}
            options={languages.map((l) => ({ value: l.code, label: `${l.nativeName} (${l.name})` }))}
            className="sm:col-span-2"
          />
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" size="md">
              {t('profile.save')}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
