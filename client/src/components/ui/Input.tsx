import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  help?: string;
  leadingIcon?: ReactNode;
  trailingElement?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, help, leadingIcon, trailingElement, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name ?? undefined;
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle">
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-ink shadow-xs',
            'placeholder:text-ink-subtle',
            'focus:border-brand focus:ring-4 focus:ring-brand/12 focus:outline-none',
            'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-70',
            'transition duration-150',
            leadingIcon && 'pl-10',
            trailingElement && 'pr-10',
            error && 'border-danger focus:border-danger focus:ring-danger/15',
            className,
          )}
          {...rest}
        />
        {trailingElement ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailingElement}</span>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : help ? (
        <p className="text-xs text-ink-subtle">{help}</p>
      ) : null}
    </div>
  );
});
