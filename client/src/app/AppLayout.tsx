import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  History as HistoryIcon,
  Leaf,
  LogOut,
  MessageCircle,
  Scan,
  Settings as SettingsIcon,
  Sprout,
  Sun,
  User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Logo } from '../components/ui/Logo';
import { LanguageSwitcher } from '../components/shared/LanguageSwitcher';
import { Avatar } from '../components/shared/Avatar';
import { useSession } from './session';
import { useProfile } from './profile';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/app/dashboard', i18n: 'nav.dashboard', icon: BarChart3 },
  { to: '/app/advisory', i18n: 'nav.advisory', icon: Sprout },
  { to: '/app/disease', i18n: 'nav.disease', icon: Scan },
  { to: '/app/soil', i18n: 'nav.soil', icon: Leaf },
  { to: '/app/weather', i18n: 'nav.weather', icon: Sun },
  { to: '/app/chatbot', i18n: 'nav.chatbot', icon: MessageCircle },
  { to: '/app/history', i18n: 'nav.history', icon: HistoryIcon },
  { to: '/app/settings', i18n: 'nav.settings', icon: SettingsIcon },
];

// Mobile bottom nav: 5 most-used features. Settings, History, Profile live in
// the user menu instead of the bottom rail to keep tap targets generous.
const mobileNavItems = navItems.filter((item) =>
  ['/app/dashboard', '/app/advisory', '/app/disease', '/app/chatbot', '/app/weather'].includes(
    item.to,
  ),
);

export function AppLayout() {
  const { t } = useTranslation();
  const { session, logout } = useSession();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayName = profile.name || session?.name || 'Farmer';

  return (
    <div className="flex min-h-screen bg-surface-2">
      {/* Desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-screen w-60 flex-col border-r border-border bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link to="/app/dashboard">
            <Logo />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              <item.icon size={18} />
              <span>{t(item.i18n)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <NavLink
            to="/app/profile"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
              )
            }
          >
            <User size={18} />
            <span>{t('nav.profile')}</span>
          </NavLink>
          <button
            type="button"
            onClick={() => {
              logout();
              toast.success(t('auth.loggedOut'));
              navigate('/');
            }}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <LogOut size={18} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white px-4 md:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <Link to="/app/dashboard">
              <Logo />
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitcher compact />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white py-1.5 pl-1.5 pr-3 text-sm hover:bg-surface-2"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <Avatar name={displayName} size={28} />
                <span className="hidden text-sm font-medium text-ink sm:inline">{displayName}</span>
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-white shadow-lg"
                >
                  <Link
                    to="/app/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    <User size={14} />
                    {t('nav.profile')}
                  </Link>
                  <Link
                    to="/app/settings"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    <SettingsIcon size={14} />
                    {t('nav.settings')}
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      logout();
                      toast.success(t('auth.loggedOut'));
                      navigate('/');
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface-2"
                  >
                    <LogOut size={14} />
                    {t('nav.logout')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 pb-24 lg:pb-10">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-white px-2 lg:hidden">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-medium',
                  isActive ? 'text-brand-700' : 'text-ink-muted',
                )
              }
            >
              <item.icon size={20} />
              <span className="leading-none">{t(item.i18n)}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
