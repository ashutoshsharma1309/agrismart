import { useSyncExternalStore } from 'react';
import { CloudOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Subscribe to the browser's connectivity as an external store. This is the
 * idiomatic way to read a browser value that changes over time — it avoids an
 * effect-driven setState and can't tear during concurrent renders. */
function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

const getIsOffline = () => typeof navigator !== 'undefined' && !navigator.onLine;
// The server has no connectivity concept — render as online so SSR/CSR agree.
const getServerSnapshot = () => false;

/**
 * Persistent banner shown while the device is offline, so users know they're
 * viewing saved data.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const offline = useSyncExternalStore(subscribeOnline, getIsOffline, getServerSnapshot);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
    >
      <CloudOff size={16} className="shrink-0" />
      <span>{t('offline.banner', "You're offline — showing saved data.")}</span>
    </div>
  );
}
