import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  CloudRain,
  Cpu,
  Droplets,
  Gauge,
  Layers,
  LineChart,
  Radar,
  Satellite,
  Sprout,
  Sun,
  Waves,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5 },
};

export function SatelliteLandingPage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <Problem />
      <Deliverables />
      <OpticalVsSar />
      <HowItWorks />
      <StatBand />
      <TechStack />
      <FinalCta />
    </div>
  );
}

function Hero() {
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
            <Satellite size={12} />
            Optical + Microwave SAR · AI advisory
          </Chip>
          <h1 className="text-balance text-4xl font-bold leading-[1.05] text-ink sm:text-5xl lg:text-[3.4rem]">
            See crop stress from space — before it shows on the ground
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-muted">
            Automated crop-type classification, growth-stage mapping, and moisture-stress detection
            from fused Sentinel-2 optical and Sentinel-1 radar data — turned into field-level
            irrigation guidance for every farm.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/app/satellite">
              <Button size="lg" trailingIcon={<ArrowRight size={18} />}>
                Launch the live tool
              </Button>
            </Link>
            <a href="#how">
              <Button size="lg" variant="secondary">
                How it works
              </Button>
            </a>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-muted">
            <Trust icon={<Sun size={14} />} label="Sentinel-2 optical" />
            <Trust icon={<Radar size={14} />} label="Sentinel-1 SAR" />
            <Trust icon={<Sprout size={14} />} label="5 crop types" />
          </div>
        </div>
        <div className="lg:col-span-6">
          <HeroPanel />
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

// A stylised "analysis" card that hints at the real dashboard.
function HeroPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative"
    >
      <Card className="overflow-hidden p-0 shadow-lg ring-1 ring-black/[0.03]">
        <div className="flex items-center justify-between border-b border-border bg-surface-2/60 px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Satellite size={15} className="text-brand-700" /> Vidarbha Cotton Block
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Severe stress
          </span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border">
          <PanelStat icon={<Sprout size={15} />} label="Crop" value="Cotton" sub="87% confidence" />
          <PanelStat icon={<Gauge size={15} />} label="Stress index" value="66 / 100" sub="soil 11.2%" />
          <PanelStat icon={<Layers size={15} />} label="Stage" value="Maturity" sub="day 120" />
          <PanelStat
            icon={<Droplets size={15} />}
            label="Advisory"
            value="Irrigate now"
            sub="~38 mm"
            accent
          />
        </div>
        <div className="space-y-2 p-5">
          <SparkRow label="NDVI" color="#16A34A" values={[38, 52, 66, 74, 78, 76, 70, 64]} />
          <SparkRow label="Soil moisture" color="#60A5FA" values={[70, 62, 52, 40, 30, 22, 16, 12]} />
          <SparkRow label="SAR VV" color="#7C3AED" values={[30, 42, 55, 60, 62, 61, 60, 58]} />
        </div>
      </Card>
    </motion.div>
  );
}

function PanelStat({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white p-4">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
        <span className={accent ? 'text-accent-600' : 'text-brand-700'}>{icon}</span>
        {label}
      </div>
      <div className={`text-lg font-bold ${accent ? 'text-accent-600' : 'text-ink'}`}>{value}</div>
      <div className="text-xs text-ink-subtle">{sub}</div>
    </div>
  );
}

function SparkRow({ label, color, values }: { label: string; color: string; values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 24 - ((v - min) / (max - min || 1)) * 22 - 1;
      return `${x},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-ink-muted">{label}</span>
      <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-6 flex-1">
        <polyline points={pts} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function Problem() {
  return (
    <section className="border-b border-border bg-surface-2">
      <div className="container-page py-16 md:py-20">
        <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
          <p className="eyebrow mb-3">The problem</p>
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">
            Irrigation decisions are made blind — until it's too late
          </h2>
          <p className="mt-4 text-ink-muted">
            Ground surveys are slow and can't scale. Optical satellites go blind under monsoon cloud
            — exactly when water decisions matter most. So farmers irrigate on guesswork, drought
            damage is caught late, and yields and water are lost. Knowing <em>what</em> is growing,
            <em> which stage</em> it's in, and <em>where</em> moisture stress is building — reliably,
            at scale — is the missing piece.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

const DELIVERABLES = [
  {
    icon: Sprout,
    title: 'Crop-type classification',
    body: 'Identifies the crop in each field from its optical–SAR temporal signature — no ground survey needed.',
  },
  {
    icon: Layers,
    title: 'Stage-wise phenology',
    body: 'Tracks every field through establishment, vegetative, flowering, maturity, and harvest.',
  },
  {
    icon: Gauge,
    title: 'Moisture-stress detection',
    body: 'Flags water stress from canopy-water and soil-moisture signals before it is visible as crop damage.',
  },
  {
    icon: Droplets,
    title: 'Irrigation advisory',
    body: 'Converts stage and stress into clear "when and how much" guidance — depth in mm and total volume.',
  },
];

function Deliverables() {
  return (
    <section className="border-b border-border bg-white">
      <div className="container-page py-16 md:py-20">
        <motion.div {...fadeUp} className="mb-10 max-w-2xl">
          <p className="eyebrow mb-3">What it delivers</p>
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">
            One pipeline, four decisions — end to end
          </h2>
        </motion.div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DELIVERABLES.map((d, i) => (
            <motion.div key={d.title} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.06 }}>
              <Card className="h-full">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <d.icon size={20} />
                </div>
                <h3 className="text-base font-semibold text-ink">{d.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{d.body}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OpticalVsSar() {
  return (
    <section className="border-b border-border bg-surface-2">
      <div className="container-page py-16 md:py-20">
        <motion.div {...fadeUp} className="mb-10 max-w-2xl">
          <p className="eyebrow mb-3">Why fuse two sensors</p>
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">
            Optical sees health. Radar sees through clouds.
          </h2>
          <p className="mt-3 text-ink-muted">
            Each sensor alone has a blind spot. Together they give reliable, all-weather monitoring.
          </p>
        </motion.div>
        <div className="grid gap-5 md:grid-cols-2">
          <motion.div {...fadeUp}>
            <Card className="h-full border-brand-100">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Sun size={20} />
              </div>
              <h3 className="text-lg font-semibold text-ink">Optical — Sentinel-2 / Landsat</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Multispectral bands reveal vegetation vigour (NDVI) and canopy water (NDWI).
              </p>
              <ul className="mt-4 space-y-2">
                <Bullet good>Rich biochemical & vigour signal</Bullet>
                <Bullet good>Best for crop discrimination</Bullet>
                <Bullet>Blocked by cloud during monsoon</Bullet>
              </ul>
            </Card>
          </motion.div>
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.08 }}>
            <Card className="h-full border-accent-100">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                <Radar size={20} />
              </div>
              <h3 className="text-lg font-semibold text-ink">Microwave — Sentinel-1 SAR</h3>
              <p className="mt-1 text-sm text-ink-muted">
                VV/VH backscatter responds to soil moisture and crop structure.
              </p>
              <ul className="mt-4 space-y-2">
                <Bullet good>Penetrates cloud — works in monsoon</Bullet>
                <Bullet good>Direct soil-moisture sensitivity</Bullet>
                <Bullet good>Detects flooded paddy establishment</Bullet>
              </ul>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Bullet({ children, good }: { children: React.ReactNode; good?: boolean }) {
  return (
    <li className="flex items-start gap-2 text-sm text-ink-muted">
      <span
        className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          good ? 'bg-brand-50 text-brand-700' : 'bg-surface-3 text-ink-subtle'
        }`}
      >
        {good ? <Check size={11} /> : <CloudRain size={10} />}
      </span>
      {children}
    </li>
  );
}

const STEPS = [
  { icon: Satellite, title: 'Acquire', body: 'Pull Sentinel-2 optical and Sentinel-1 SAR passes for each field boundary.' },
  { icon: Waves, title: 'Fuse & index', body: 'Compute NDVI, NDWI, and SAR backscatter; build a per-field time-series.' },
  { icon: Cpu, title: 'Classify & detect', body: 'ML matches spectral signatures to crops, stages, and moisture stress.' },
  { icon: Droplets, title: 'Advise', body: 'Stage water demand vs. deficit yields a clear irrigation recommendation.' },
];

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-b border-border bg-white">
      <div className="container-page py-16 md:py-20">
        <motion.div {...fadeUp} className="mb-10 max-w-2xl">
          <p className="eyebrow mb-3">How it works</p>
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">From orbit to advisory in four steps</h2>
        </motion.div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.06 }}>
              <Card className="relative h-full">
                <span className="absolute right-4 top-4 font-display text-3xl font-bold text-surface-3">
                  {i + 1}
                </span>
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <s.icon size={20} />
                </div>
                <h3 className="text-base font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{s.body}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatBand() {
  const stats = [
    { value: '2', label: 'satellite sources fused' },
    { value: '5', label: 'crop types classified' },
    { value: '4', label: 'growth stages tracked' },
    { value: '100%', label: 'cloud-resilient (SAR)' },
  ];
  return (
    <section className="border-b border-border bg-brand-700 text-white">
      <div className="container-page grid grid-cols-2 gap-6 py-12 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{s.value}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-brand-100">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const STACK = [
  'Sentinel-2', 'Landsat', 'LISS-IV', 'Sentinel-1 SAR', 'Google Earth Engine', 'ESA SNAP',
  'Random Forest', 'LSTM / CNN', 'React', 'Fastify', 'Recharts', 'TypeScript',
];

function TechStack() {
  return (
    <section className="border-b border-border bg-surface-2">
      <div className="container-page py-16 md:py-20">
        <motion.div {...fadeUp} className="mb-8 max-w-2xl">
          <p className="eyebrow mb-3">Built with</p>
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">A grounded, production-ready stack</h2>
          <p className="mt-3 text-ink-muted">
            Open satellite data and open-source tooling — from ingestion to the farmer's dashboard.
          </p>
        </motion.div>
        <motion.div {...fadeUp} className="flex flex-wrap gap-2.5">
          {STACK.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-sm font-medium text-ink-muted"
            >
              <LineChart size={13} className="text-brand-700" />
              {t}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-white">
      <div className="container-page py-20">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-3xl border border-border bg-ink px-8 py-14 text-center text-white md:py-16"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-500/30 blur-3xl"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold sm:text-4xl">
              Turn satellite signals into irrigation decisions
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">
              Explore live field analyses — crop type, growth stage, moisture stress, and irrigation
              advisory — across five real Indian farms.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/app/satellite">
                <Button size="lg" trailingIcon={<ArrowRight size={18} />}>
                  Open the live dashboard
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="lg"
                  variant="secondary"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  Create an account
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
