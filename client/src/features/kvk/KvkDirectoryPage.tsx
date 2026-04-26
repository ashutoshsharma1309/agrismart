import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, MapPin, Phone, Search, ShieldAlert, UserCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { HELPLINES, KVK_ENTRIES, kvkLookupUrl, type KvkEntry } from './kvkData';

export function KvkDirectoryPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return KVK_ENTRIES;
    return KVK_ENTRIES.filter((k) =>
      [k.name, k.district, k.state].some((s) => s.toLowerCase().includes(q)),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, KvkEntry[]>();
    for (const k of filtered) {
      if (!map.has(k.state)) map.set(k.state, []);
      map.get(k.state)!.push(k);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="container-page py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t('kvk.title')}</h1>
        <p className="text-sm text-ink-muted">{t('kvk.subtitle')}</p>
      </header>

      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <Card className="border-brand-200 bg-brand-50/40">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="mt-0.5 shrink-0 text-brand-700" />
            <div className="flex-1 text-sm">
              <div className="font-semibold text-ink">{t('kvk.helpline.title')}</div>
              <p className="mt-1 text-ink-muted">{t('kvk.helpline.body')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={`tel:${HELPLINES.kisanCallCentre.replace(/[^0-9+]/g, '')}`}>
                  <Button size="sm" variant="primary" leadingIcon={<Phone size={14} />}>
                    {HELPLINES.kisanCallCentre}
                  </Button>
                </a>
                <a
                  href="https://kvk.icar.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
                >
                  {t('kvk.helpline.icarLink')}
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <UserCheck size={20} className="mt-0.5 shrink-0 text-amber-700" />
            <div className="flex-1 text-sm">
              <div className="font-semibold text-ink">{t('kvk.personal.title')}</div>
              <p className="mt-1 text-ink-muted">{t('kvk.personal.body')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={`tel:${HELPLINES.agriSmartPersonal.replace(/[^0-9+]/g, '')}`}>
                  <Button size="sm" variant="primary" leadingIcon={<Phone size={14} />}>
                    {HELPLINES.agriSmartPersonal}
                  </Button>
                </a>
                <a
                  href={`https://wa.me/${HELPLINES.agriSmartPersonal.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-amber-800 hover:underline"
                >
                  {t('kvk.personal.whatsapp')}
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('kvk.searchPlaceholder')}
        leadingIcon={<Search size={16} />}
        className="mb-5"
        aria-label={t('kvk.searchPlaceholder')}
      />

      {grouped.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-ink-muted">{t('kvk.empty')}</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([state, entries]) => (
            <section key={state}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-subtle">
                {state}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {entries.map((k) => (
                  <Card key={`${state}-${k.name}`}>
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="mt-1 shrink-0 text-brand-700" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-ink">{k.name}</h3>
                        <p className="text-xs text-ink-muted">{k.district}</p>
                        {k.address ? (
                          <p className="mt-1 text-xs text-ink-subtle">{k.address}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <a href={kvkLookupUrl(k)} target="_blank" rel="noreferrer">
                            <Button
                              size="sm"
                              variant="secondary"
                              leadingIcon={<ExternalLink size={12} />}
                            >
                              {t('kvk.entry.findContact')}
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-[11px] text-ink-subtle">{t('kvk.dataNote')}</p>
    </div>
  );
}
