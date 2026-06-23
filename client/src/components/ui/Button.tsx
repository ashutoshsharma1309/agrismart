import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

const sizeMap: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-[52px] px-7 text-base gap-2',
};

const iconSizeMap: Record<Size, number> = {
  sm: 16,
  md: 16,
  lg: 18,
};

const variantMap: Record<Variant, string> = {
  primary:
    'bg-brand text-white shadow-sm shadow-brand/25 hover:bg-brand-600 hover:shadow-md active:bg-brand-700 disabled:bg-brand/60 [box-shadow:0_1px_2px_rgb(10_15_26/0.12),inset_0_1px_0_rgb(255_255_255/0.16)]',
  secondary:
    'bg-white text-ink border border-border shadow-xs hover:bg-surface-2 hover:border-border-strong active:bg-surface-3',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-2 hover:text-ink active:bg-surface-3',
  destructive: 'bg-danger text-white shadow-sm shadow-danger/25 hover:bg-danger/90 active:bg-danger/80',
  link: 'bg-transparent text-brand-700 hover:text-brand hover:underline underline-offset-4 px-0 h-auto',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const iconSize = iconSizeMap[size];

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled ?? loading}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-xl font-semibold transition duration-150',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 focus-visible:ring-offset-1 focus-visible:ring-offset-white',
        variant !== 'link' && 'active:scale-[0.985]',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        variant !== 'link' && sizeMap[size],
        variantMap[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" aria-hidden />
      ) : leadingIcon ? (
        <span className="shrink-0" style={{ width: iconSize, height: iconSize }}>
          {leadingIcon}
        </span>
      ) : null}
      {children}
      {!loading && trailingIcon ? (
        <span className="shrink-0" style={{ width: iconSize, height: iconSize }}>
          {trailingIcon}
        </span>
      ) : null}
    </button>
  );
});
