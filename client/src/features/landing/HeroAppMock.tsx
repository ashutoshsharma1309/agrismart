import { motion } from 'framer-motion';
import { Droplets, Sparkles, TrendingUp } from 'lucide-react';

export function HeroAppMock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-md"
    >
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-[48px] bg-gradient-to-br from-brand-100 via-white to-brand-50 blur-2xl opacity-80"
      />
      <div className="relative rounded-[32px] border border-border bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-brand" />
            <span className="text-xs font-medium text-ink-muted">Advisory · Nashik</span>
          </div>
          <span className="text-xs text-ink-subtle">Kharif · Loam</span>
        </div>
        <div className="space-y-3">
          <CropMockCard
            emoji="🌾"
            name="Rice"
            confidence={92}
            yieldVal="4.5 – 5.8 t/acre"
            highlight
          />
          <CropMockCard emoji="🌽" name="Maize" confidence={86} yieldVal="3.2 – 4.1 t/acre" />
          <CropMockCard emoji="🫘" name="Soybean" confidence={81} yieldVal="1.0 – 1.3 t/acre" />
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-700">
          <Sparkles size={14} />
          Tuned to your exact soil and season.
        </div>
      </div>
    </motion.div>
  );
}

function CropMockCard({
  emoji,
  name,
  confidence,
  yieldVal,
  highlight,
}: {
  emoji: string;
  name: string;
  confidence: number;
  yieldVal: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        'flex items-center gap-3 rounded-2xl border p-3 ' +
        (highlight ? 'border-brand-200 bg-brand-50/40' : 'border-border bg-white')
      }
    >
      <div
        aria-hidden
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm"
      >
        {emoji}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-ink">{name}</div>
          <div className="text-xs font-medium text-brand-700">{confidence}%</div>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${confidence}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <TrendingUp size={10} />
            {yieldVal}
          </span>
          <span className="inline-flex items-center gap-1">
            <Droplets size={10} />
            Medium
          </span>
        </div>
      </div>
    </div>
  );
}
