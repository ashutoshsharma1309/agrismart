import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  Check,
  CloudRain,
  Globe2,
  Leaf,
  MessageCircle,
  Minus,
  Play,
  Plus,
  ScanLine,
  Sparkles,
  Sprout,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Avatar } from '../../components/shared/Avatar';
import { languages } from '../../i18n';
import { HeroAppMock } from './HeroAppMock';
import { LiveDemo } from './LiveDemo';

export function LandingPage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <LiveDemoSection />
      <Testimonials />
      <LanguageShowcase />
      <Pricing />
      <Faq />
      <CTA />
    </div>
  );
}

function Hero() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden border-b border-border bg-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-fade opacity-80" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-[-10%] h-[460px] w-[460px] rounded-full bg-brand-100/60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-25%] left-[-8%] h-[360px] w-[360px] rounded-full bg-accent-100/40 blur-3xl"
      />
      <div className="container-page relative grid gap-12 py-16 md:py-24 lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className="lg:col-span-6">
          <Chip tone="brand" className="mb-5">
            <Sparkles size={12} />
            {t('landing.hero.eyebrow')}
          </Chip>
          <h1 className="text-balance text-4xl font-bold leading-[1.05] text-ink sm:text-5xl lg:text-6xl">
            {t('landing.hero.title')}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-muted">{t('landing.hero.subtitle')}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/signup">
              <Button size="lg">{t('landing.hero.cta.primary')}</Button>
            </Link>
            <a href="#live-demo">
              <Button size="lg" variant="secondary" leadingIcon={<Play size={16} />}>
                {t('landing.hero.cta.secondary')}
              </Button>
            </a>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-muted">
            <Trust icon={<Leaf size={14} />} label={t('landing.hero.trust.villages')} />
            <Trust icon={<Globe2 size={14} />} label={t('landing.hero.trust.languages')} />
            <Trust icon={<Award size={14} />} label={t('landing.hero.trust.uptime')} />
          </div>
        </div>
        <div className="lg:col-span-6">
          <HeroAppMock />
        </div>
      </div>
    </section>
  );
}

function Trust({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        {icon}
      </span>
      {label}
    </span>
  );
}

function TrustBar() {
  const stats = [
    { label: 'states', value: '28' },
    { label: 'languages', value: '6' },
    { label: 'farmers', value: '10K+' },
    { label: 'scans processed', value: '250K+' },
  ];
  return (
    <section className="border-b border-border bg-surface-2">
      <div className="container-page grid grid-cols-2 gap-4 py-10 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-display text-3xl font-bold tracking-tighter text-ink sm:text-4xl">{s.value}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-[0.1em] text-ink-subtle">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const { t } = useTranslation();
  const items = [
    { icon: Sprout, key: 'advisory' },
    { icon: ScanLine, key: 'disease' },
    { icon: Leaf, key: 'soil' },
    { icon: CloudRain, key: 'weather' },
    { icon: Globe2, key: 'multi' },
    { icon: MessageCircle, key: 'chat' },
  ];
  return (
    <section id="features" className="section-y bg-surface">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold text-ink sm:text-4xl">
            {t('landing.features.title')}
          </h2>
          <p className="mt-3 text-ink-muted">{t('landing.features.subtitle')}</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, key }) => (
            <Card
              key={key}
              className="group relative overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 transition group-hover:bg-brand-100">
                <Icon size={20} />
              </div>
              <h3 className="mb-1.5 text-base font-semibold text-ink">
                {t(`landing.features.${key}.title`)}
              </h3>
              <p className="text-sm text-ink-muted">{t(`landing.features.${key}.body`)}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useTranslation();
  const steps = ['s1', 's2', 's3'];
  return (
    <section className="section-y border-y border-border bg-surface-2">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold text-ink sm:text-4xl">
            {t('landing.how.title')}
          </h2>
          <p className="mt-3 text-ink-muted">{t('landing.how.subtitle')}</p>
        </div>
        <div className="relative mt-12 grid gap-5 lg:grid-cols-3 lg:gap-8">
          {steps.map((s, i) => (
            <div key={s} className="relative rounded-2xl border border-border bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white shadow-sm shadow-brand/30 ring-1 ring-inset ring-white/20">
                {i + 1}
              </div>
              <h3 className="mb-1 text-lg font-semibold text-ink">
                {t(`landing.how.${s}.title`)}
              </h3>
              <p className="text-sm text-ink-muted">{t(`landing.how.${s}.body`)}</p>
              {i < steps.length - 1 ? (
                <div
                  aria-hidden
                  className="absolute right-[-18px] top-1/2 hidden h-px w-9 -translate-y-1/2 bg-border lg:block"
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveDemoSection() {
  const { t } = useTranslation();
  return (
    <section id="live-demo" className="section-y bg-surface">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold text-ink sm:text-4xl">
            {t('landing.demo.title')}
          </h2>
          <p className="mt-3 text-ink-muted">{t('landing.demo.subtitle')}</p>
        </div>
        <LiveDemo />
      </div>
    </section>
  );
}

function Testimonials() {
  const { t } = useTranslation();
  const items = ['t1', 't2', 't3'];
  return (
    <section className="section-y border-y border-border bg-surface-2">
      <div className="container-page">
        <h2 className="mx-auto max-w-2xl text-center text-balance text-3xl font-bold text-ink sm:text-4xl">
          {t('landing.testimonials.title')}
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {items.map((k) => (
            <Card key={k} className="flex flex-col gap-4 bg-white">
              <p className="text-base italic leading-relaxed text-ink">
                “{t(`landing.testimonials.${k}.quote`)}”
              </p>
              <div className="mt-auto flex items-center gap-3">
                <Avatar name={t(`landing.testimonials.${k}.name`)} size={40} />
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {t(`landing.testimonials.${k}.name`)}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {t(`landing.testimonials.${k}.role`)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function LanguageShowcase() {
  const [idx, setIdx] = useState(0);
  const headlines = useMemo(
    () =>
      languages.map((l) => ({
        code: l.code,
        native: l.nativeName,
      })),
    [],
  );

  useEffect(() => {
    const handle = setInterval(() => {
      setIdx((i) => (i + 1) % headlines.length);
    }, 2200);
    return () => clearInterval(handle);
  }, [headlines.length]);

  const current = headlines[idx];

  return (
    <section className="section-y bg-surface">
      <div className="container-page">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-brand-50 to-white p-10 text-center md:p-16">
          <div className="text-sm font-semibold uppercase tracking-wide text-brand-700">
            Built for all of India
          </div>
          <h3 className="relative mx-auto mt-3 h-14 w-full max-w-2xl overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span
                key={current.code}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.32 }}
                className="absolute inset-0 flex items-center justify-center font-display text-3xl font-bold text-ink sm:text-4xl"
              >
                {current.native}
              </motion.span>
            </AnimatePresence>
          </h3>
          <p className="mt-3 text-ink-muted">
            English · हिन्दी · ಕನ್ನಡ · தமிழ் · తెలుగు · मराठी
          </p>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const { t } = useTranslation();
  const plans: { k: 'free' | 'pro' | 'coop'; highlight?: boolean; features: string[] }[] = [
    { k: 'free', features: ['f1', 'f2', 'f3', 'f4'] },
    { k: 'pro', highlight: true, features: ['f1', 'f2', 'f3', 'f4', 'f5'] },
    { k: 'coop', features: ['f1', 'f2', 'f3', 'f4'] },
  ];
  return (
    <section id="pricing" className="section-y border-y border-border bg-surface-2">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <Chip tone="brand" className="mb-4">
            {t('landing.pricing.demoBadge')}
          </Chip>
          <h2 className="text-balance text-3xl font-bold text-ink sm:text-4xl">
            {t('landing.pricing.title')}
          </h2>
          <p className="mt-3 text-ink-muted">{t('landing.pricing.subtitle')}</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.k}
              className={
                'flex flex-col rounded-2xl border p-7 ' +
                (p.highlight
                  ? 'relative border-brand bg-white shadow-lg ring-1 ring-brand/15 md:-my-2 md:scale-[1.02]'
                  : 'border-border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md')
              }
            >
              {p.highlight ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-0.5 text-xs font-semibold text-white shadow-sm shadow-brand/30 ring-1 ring-inset ring-white/20">
                  Most popular
                </div>
              ) : null}
              <div className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
                {t(`landing.pricing.${p.k}.name`)}
              </div>
              <div className="mt-2 font-display text-3xl font-bold text-ink">
                {t(`landing.pricing.${p.k}.price`)}
              </div>
              <ul className="mt-6 flex flex-col gap-3 text-sm text-ink">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 text-brand" />
                    <span>{t(`landing.pricing.${p.k}.${f}`)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                <Link to="/signup">
                  <Button
                    fullWidth
                    variant={p.highlight ? 'primary' : 'secondary'}
                    size="md"
                  >
                    {t(`landing.pricing.${p.k}.cta`)}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const { t } = useTranslation();
  const items = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'];
  const [open, setOpen] = useState<string | null>('q1');
  return (
    <section id="faq" className="section-y bg-surface">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold text-ink sm:text-4xl">
            {t('landing.faq.title')}
          </h2>
        </div>
        <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-border bg-white">
          {items.map((id, i) => {
            const isOpen = open === id;
            return (
              <div key={id} className={i > 0 ? 'border-t border-border' : ''}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-6 px-5 py-4 text-left transition-colors duration-150 hover:bg-surface-2"
                  onClick={() => setOpen(isOpen ? null : id)}
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-semibold text-ink">
                    {t(`landing.faq.${id}`)}
                  </span>
                  {isOpen ? (
                    <Minus size={16} className="text-ink-muted" />
                  ) : (
                    <Plus size={16} className="text-ink-muted" />
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-5 pb-5 text-sm leading-relaxed text-ink-muted">
                        {t(`landing.faq.${id.replace('q', 'a')}`)}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const { t } = useTranslation();
  return (
    <section className="section-y bg-surface">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-400 p-10 text-center text-white md:p-16">
          <div aria-hidden className="absolute inset-0 bg-leaf-pattern opacity-30" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold sm:text-4xl">
              {t('landing.hero.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">{t('landing.hero.subtitle')}</p>
            <div className="mt-7 flex justify-center">
              <Link to="/signup">
                <Button size="lg" variant="secondary">
                  {t('landing.hero.cta.primary')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
