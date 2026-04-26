import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Chip({
  children,
  className,
  tone = 'neutral',
  ...rest
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'brand' | 'warning' | 'danger' | 'info';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-surface-2 text-ink-muted border-border',
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-accent-50 text-accent-600 border-accent-100',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export function SelectableChip({
  children,
  selected,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; children?: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition',
        selected
          ? 'border-brand bg-brand-50 text-brand-700'
          : 'border-border bg-white text-ink-muted hover:border-brand-200 hover:bg-brand-50/40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
