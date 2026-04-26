import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Leaf, Scan, Sprout, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Dialog } from '../../components/ui/Dialog';
import { clearHistory, getHistory, type HistoryItem } from '../../lib/history';
import { formatDateTime } from '../../lib/utils';

type Filter = 'all' | 'advisory' | 'disease' | 'soil';

export function HistoryPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<HistoryItem[]>(() => getHistory());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((h) => h.type === filter);
  }, [filter, items]);

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: t('history.filter.all') },
    { value: 'advisory', label: t('history.filter.advisory') },
    { value: 'disease', label: t('history.filter.disease') },
    { value: 'soil', label: t('history.filter.soil') },
  ];

  return (
    <div className="container-page py-6 md:py-10">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t('history.title')}</h1>
          <p className="text-sm text-ink-muted">{t('history.subtitle')}</p>
        </div>
        {items.length ? (
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Trash2 size={14} />}
            onClick={() => setConfirmOpen(true)}
          >
            {t('history.clear')}
          </Button>
        ) : null}
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={
                'h-9 rounded-full border px-3.5 text-sm font-medium transition ' +
                (active
                  ? 'border-brand bg-brand-50 text-brand-700'
                  : 'border-border bg-white text-ink-muted hover:border-brand-200')
              }
              aria-pressed={active}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Sprout size={22} />
          </div>
          <h3 className="text-lg font-semibold text-ink">{t('history.empty.title')}</h3>
          <p className="max-w-sm text-sm text-ink-muted">{t('history.empty.body')}</p>
          <Link to="/app/advisory" className="mt-2">
            <Button size="sm">{t('dashboard.shortcut.advisory')}</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((h) => (
            <Card key={h.id} className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                {h.type === 'advisory' ? <Sprout size={18} /> : h.type === 'disease' ? <Scan size={18} /> : <Leaf size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold text-ink">{h.title}</div>
                  {h.type === 'disease' ? (
                    <Chip tone={h.severity === 'severe' ? 'danger' : h.severity === 'moderate' ? 'warning' : 'brand'}>
                      {t(`disease.report.severity.${h.severity}`)}
                    </Chip>
                  ) : h.type === 'soil' ? (
                    <Chip tone={h.score >= 70 ? 'brand' : h.score >= 45 ? 'warning' : 'danger'}>
                      {h.score}/100
                    </Chip>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-ink-muted">{h.summary}</p>
              </div>
              <div className="text-xs text-ink-subtle whitespace-nowrap">
                {formatDateTime(h.createdAt)}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('history.clear')}
        description={t('history.clear.confirm')}
      >
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              clearHistory();
              setItems([]);
              setConfirmOpen(false);
              toast.success(t('history.clear'));
            }}
          >
            {t('common.confirm')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
