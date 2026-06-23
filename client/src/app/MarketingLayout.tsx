import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { LanguageSwitcher } from '../components/shared/LanguageSwitcher';
import { cn } from '../lib/utils';

export function MarketingLayout() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      <header
        className={cn(
          'sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md transition duration-200 supports-[backdrop-filter]:bg-white/65',
          scrolled ? 'border-b border-border shadow-sm' : 'border-b border-transparent',
        )}
      >
        <div className="container-page flex h-16 items-center justify-between">
          <Link to="/" className="inline-flex items-center">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            <a href="#features" className="text-sm font-medium text-ink-muted transition-colors duration-150 hover:text-ink">
              {t('nav.features')}
            </a>
            <a href="#pricing" className="text-sm font-medium text-ink-muted transition-colors duration-150 hover:text-ink">
              {t('nav.pricing')}
            </a>
            <a href="#faq" className="text-sm font-medium text-ink-muted transition-colors duration-150 hover:text-ink">
              {t('nav.about')}
            </a>
            <Link to="/login" className="text-sm font-medium text-ink-muted transition-colors duration-150 hover:text-ink">
              {t('nav.login')}
            </Link>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitcher compact />
            <Link to="/signup">
              <Button size="sm">{t('nav.getStarted')}</Button>
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink transition hover:bg-surface-2 md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileOpen ? (
          <div className="animate-fade-in border-t border-border bg-white md:hidden">
            <div className="container-page flex flex-col gap-3 py-4">
              <a href="#features" className="text-sm font-medium text-ink" onClick={() => setMobileOpen(false)}>
                {t('nav.features')}
              </a>
              <a href="#pricing" className="text-sm font-medium text-ink" onClick={() => setMobileOpen(false)}>
                {t('nav.pricing')}
              </a>
              <a href="#faq" className="text-sm font-medium text-ink" onClick={() => setMobileOpen(false)}>
                {t('nav.about')}
              </a>
              <Link to="/login" className="text-sm font-medium text-ink" onClick={() => setMobileOpen(false)}>
                {t('nav.login')}
              </Link>
              <div className="flex items-center gap-2 pt-2">
                <LanguageSwitcher compact />
                <Link to="/signup" className="flex-1">
                  <Button size="sm" fullWidth>
                    {t('nav.getStarted')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </header>
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border bg-white">
      <div className="container-page grid grid-cols-2 gap-8 py-12 md:grid-cols-5">
        <div className="col-span-2 md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-muted">{t('brand.tagline')}</p>
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="mb-1 text-sm font-semibold text-ink">{t('landing.footer.product')}</h4>
          <a href="#features" className="text-sm text-ink-muted hover:text-ink">
            {t('nav.features')}
          </a>
          <a href="#pricing" className="text-sm text-ink-muted hover:text-ink">
            {t('nav.pricing')}
          </a>
          <a href="#faq" className="text-sm text-ink-muted hover:text-ink">
            {t('nav.about')}
          </a>
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="mb-1 text-sm font-semibold text-ink">{t('landing.footer.company')}</h4>
          <span className="text-sm text-ink-subtle">About</span>
          <span className="text-sm text-ink-subtle">Careers</span>
          <span className="text-sm text-ink-subtle">Press</span>
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="mb-1 text-sm font-semibold text-ink">{t('landing.footer.resources')}</h4>
          <span className="text-sm text-ink-subtle">Docs</span>
          <a
            href="mailto:hello@agrismart.app"
            className="text-sm text-ink-muted hover:text-ink"
          >
            Help centre
          </a>
          <span className="text-sm text-ink-subtle">Community</span>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col items-start justify-between gap-3 py-5 sm:flex-row sm:items-center">
          <p className="text-xs text-ink-subtle">{t('landing.footer.rights')}</p>
          <div className="flex items-center gap-4 text-xs text-ink-subtle">
            <span>{t('landing.footer.legal')}</span>
            <LanguageSwitcher compact />
          </div>
        </div>
      </div>
    </footer>
  );
}
