import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { readJson, removeKey, storageKeys, writeJson } from '../lib/storage';

type Session = { loggedIn: true; name: string; email: string } | null;

type SessionContextShape = {
  session: Session;
  login: (name: string, email: string) => void;
  logout: () => void;
};

const SessionContext = createContext<SessionContextShape | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(() =>
    readJson<Session>(storageKeys.session, null),
  );

  const login = useCallback((name: string, email: string) => {
    const next = { loggedIn: true as const, name, email };
    setSession(next);
    writeJson(storageKeys.session, next);
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    removeKey(storageKeys.session);
  }, []);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKeys.session) {
        setSession(readJson<Session>(storageKeys.session, null));
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const location = useLocation();
  if (!session?.loggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
