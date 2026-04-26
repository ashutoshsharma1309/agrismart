import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

// Mandatory footer for any AI-generated card. Inoffensive but important —
// reminds the farmer this is decision support, not a substitute for a
// human expert. Render at the bottom of disease reports, advisory results,
// and chatbot responses.
export function AiDisclaimer({
  className,
  timestamp,
}: {
  className?: string;
  timestamp?: number;
}) {
  const { t } = useTranslation();
  const stamp = timestamp ? new Date(timestamp) : null;
  return (
    <div
      className={cn(
        'mt-2 flex flex-wrap items-center gap-1.5 text-[11px] leading-tight text-ink-subtle',
        className,
      )}
      role="note"
    >
      <Info size={11} className="shrink-0" aria-hidden />
      <span>{t('ai.disclaimer.text')}</span>
      {stamp ? (
        <span className="opacity-70">
          ·{' '}
          {stamp.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ) : null}
    </div>
  );
}
