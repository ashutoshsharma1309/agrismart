import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { languages, setLanguage, type Lang } from '../../i18n';
import { cn } from '../../lib/utils';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = languages.find((l) => l.code === i18n.language) ?? languages[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 text-sm font-medium text-ink',
          'hover:bg-surface-2 transition',
          compact ? 'h-9' : 'h-11',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe size={16} className="text-ink-muted" />
        <span>{current.nativeName}</span>
        <ChevronDown size={14} className="text-ink-subtle" />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-white shadow-lg"
        >
          {languages.map((lang) => {
            const active = lang.code === i18n.language;
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setLanguage(lang.code as Lang);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-ink hover:bg-surface-2',
                  active && 'bg-brand-50 text-brand-700',
                )}
              >
                <span className="font-medium">{lang.nativeName}</span>
                <span className="text-xs text-ink-subtle">{lang.name}</span>
                {active ? <Check size={14} className="text-brand" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
