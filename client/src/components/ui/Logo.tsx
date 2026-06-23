import { cn } from '../../lib/utils';

export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-sm shadow-brand/30 ring-1 ring-inset ring-white/20 [box-shadow:0_2px_6px_-1px_rgb(22_163_74/0.35),inset_0_1px_0_rgb(255_255_255/0.25)]"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
          <path
            d="M17 6c0 6-3.2 9-8 10 0-6 3.2-9 8-10zM8 16c-.8-3 0-5.2 2.3-7.5"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showWordmark ? (
        <span className="font-display text-lg font-bold tracking-tight text-ink">AgriSmart</span>
      ) : null}
    </div>
  );
}
