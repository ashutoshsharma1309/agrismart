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
    'bg-brand text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm hover:shadow-md disabled:bg-brand/60',
  secondary:
    'bg-white text-ink border border-border hover:bg-surface-2 active:bg-surface-3 shadow-sm',
  ghost: 'bg-transparent text-ink hover:bg-surface-2 active:bg-surface-3',
  destructive: 'bg-danger text-white hover:bg-danger/90 active:bg-danger/80 shadow-sm',
  link: 'bg-transparent text-brand hover:underline underline-offset-4 px-0 h-auto',
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
        'inline-flex items-center justify-center rounded-xl font-semibold transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
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
