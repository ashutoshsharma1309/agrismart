import { useEffect, useState } from 'react';
import { CloudOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Persistent banner shown while the device is offline. Listens to the browser's
 * online/offline events (cleaned up on unmount) and renders a translated notice
 * so users know they're viewing saved data.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    // Sync once in case status changed before listeners were attached.
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

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
