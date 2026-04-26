import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { getAdvisory, type AdvisoryResult } from '../../lib/mock-api';
import { cn } from '../../lib/utils';

export function LiveDemo() {
  const { t } = useTranslation();
  const [location, setLocation] = useState('Nashik, Maharashtra');
  const [soilType, setSoilType] = useState<'loam' | 'clay' | 'sandy'>('loam');
  const [season, setSeason] = useState<'kharif' | 'rabi' | 'zaid'>('kharif');
  const [result, setResult] = useState<AdvisoryResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGo = async () => {
    setLoading(true);
    try {
      const r = await getAdvisory({ location, soilType, season });
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <div className="space-y-4">
          <Input
            label={t('advisory.form.location')}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('advisory.form.locationPlaceholder')}
          />
          <Select
            label={t('advisory.form.soil')}
            value={soilType}
            onChange={(e) => setSoilType(e.target.value as 'loam' | 'clay' | 'sandy')}
            options={[
              { value: 'loam', label: t('advisory.form.soil.loam') },
              { value: 'clay', label: t('advisory.form.soil.clay') },
              { value: 'sandy', label: t('advisory.form.soil.sandy') },
            ]}
          />
          <Select
            label={t('advisory.form.season')}
            value={season}
            onChange={(e) => setSeason(e.target.value as 'kharif' | 'rabi' | 'zaid')}
            options={[
              { value: 'kharif', label: t('advisory.form.season.kharif') },
              { value: 'rabi', label: t('advisory.form.season.rabi') },
              { value: 'zaid', label: t('advisory.form.season.zaid') },
            ]}
          />
          <Button
            fullWidth
            size="lg"
            onClick={handleGo}
            loading={loading}
            leadingIcon={<Sparkles size={16} />}
          >
            {t('landing.demo.cta')}
          </Button>
        </div>
      </Card>

      <Card className="lg:col-span-3">
        <h3 className="mb-4 text-lg font-semibold text-ink">{t('advisory.results.title')}</h3>
        {!result ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-ink-muted">
            Fill the form and generate your first recommendation.
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {result.crops.map((c, i) => (
              <div
                key={c.id}
                className={cn(
                  'rounded-2xl border p-4',
                  i === 0 ? 'border-brand-200 bg-brand-50/40' : 'border-border bg-white',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                    {c.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-ink">{c.name}</div>
                      <div className="text-xs font-medium text-brand-700">{c.confidence}%</div>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${c.confidence}%` }}
                      />
                    </div>
                    <div className="mt-1.5 text-xs text-ink-muted">
                      {c.yieldRange} · water: {c.waterNeed}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </Card>
    </div>
  );
}
