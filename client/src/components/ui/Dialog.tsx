import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'dialog-title' : undefined}
        >
          <div
            className="absolute inset-0 bg-ink/50 backdrop-blur-md"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            className={cn(
              'relative z-10 w-full max-w-md rounded-3xl border border-border/70 bg-white p-6 shadow-xl',
              className,
            )}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-2 top-2 inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-ink-muted hover:bg-surface-2"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
            {title ? (
              <h2 id="dialog-title" className="mb-1 text-lg font-semibold text-ink">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mb-4 text-sm text-ink-muted">{description}</p>
            ) : null}
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
