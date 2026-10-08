'use client';
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Moon, Sun, Menu, X, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { useFavorites } from '@/lib/context/FavoritesContext';
import { createFrameScheduler } from '@/lib/utils/frameScheduler';

interface NavbarProps {
  currentView?: 'home' | 'properties' | 'detail' | 'about' | 'contact' | 'map' | 'admin' | 'maintenance' | 'not-found';
  locale?: string;
  onNavigate?: (view: string, propertyId?: string) => void;
  onOpenInquiry?: (type?: string) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onOpenAdmin?: () => void;
  isLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView: propCurrentView,
  locale = 'en',
  onNavigate: propOnNavigate,
  onOpenInquiry = () => {},
  isDarkMode = true,
  onToggleTheme = () => {},
  isLoading = false
}) => {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { favoriteIds, setIsDrawerOpen } = useFavorites();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth > 992 : true);

  // Determine current view from pathname if not explicitly passed
  let currentView = propCurrentView;
  if (!currentView) {
    if (pathname.includes('/properties/') && pathname.split('/properties/')[1]?.length > 0) {
      currentView = 'detail';
    } else if (pathname.includes('/properties')) {
      currentView = 'properties';
    } else if (pathname.includes('/map')) {
      currentView = 'map';
    } else if (pathname.includes('/about')) {
      currentView = 'about';
    } else if (pathname.includes('/contact')) {
      currentView = 'contact';
    } else if (pathname.includes('/admin')) {
      currentView = 'admin';
    } else if (pathname.includes('/maintenance')) {
      currentView = 'maintenance';
    } else {
      currentView = 'home';
    }
  }

  const onNavigate = (view: string) => {
    if (propOnNavigate) {
      propOnNavigate(view);
    } else {
      if (view === 'home') router.push('/' + locale);
      else router.push('/' + locale + '/' + view);
    }
    setMobileMenuOpen(false);
  };

  const handleToggleLang = () => {
    const nextLocale = locale === 'en' ? 'ar' : 'en';
    if (typeof window !== 'undefined') {
      try {
        const currentTheme = document.documentElement.getAttribute('data-theme') || (isDarkMode ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('zf_theme', currentTheme);
        document.cookie = `zf_theme=${currentTheme}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {}
    }
    const parts = pathname.split('/');
    if (parts[1] === 'en' || parts[1] === 'ar') {
      parts[1] = nextLocale;
      router.push(parts.join('/') || '/' + nextLocale);
    } else {
      router.push('/' + nextLocale);
    }
  };

  useEffect(() => {
    let scrolled = false;
    const scrollFrame = createFrameScheduler(() => {
      const next = window.scrollY > 30;
      if (next !== scrolled) {
        scrolled = next;
        setIsScrolled(next);
      }
    });
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 992);
    };
    window.addEventListener('scroll', scrollFrame.schedule, { passive: true });
    window.addEventListener('resize', handleResize);
    scrollFrame.schedule();
    handleResize();
    return () => {
      window.removeEventListener('scroll', scrollFrame.schedule);
      scrollFrame.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const capsuleRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const capsule = capsuleRef.current;
    if (!capsule) return;
    const measure = () => document.documentElement.style.setProperty(
      '--map-navbar-bottom', `${capsule.getBoundingClientRect().bottom}px`
    );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(capsule);
    window.addEventListener('resize', measure);
    capsule.parentElement?.parentElement?.addEventListener('transitionend', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      capsule.parentElement?.parentElement?.removeEventListener('transitionend', measure);
      document.documentElement.style.removeProperty('--map-navbar-bottom');
    };
  }, []);

  const navLinks: { id: 'home' | 'properties' | 'map' | 'about' | 'contact'; label: string }[] = [
    { id: 'home', label: locale === 'ar' ? 'الرئيسية' : 'Home' },
    { id: 'properties', label: locale === 'ar' ? 'العقارات' : 'Properties' },
    { id: 'map', label: locale === 'ar' ? 'الخريطة' : 'Map' },
    { id: 'about', label: locale === 'ar' ? 'عن الشركة' : 'About' },
    { id: 'contact', label: locale === 'ar' ? 'اتصل بنا' : 'Contact' }
  ];

  const isBlendedMode = currentView === 'home' && !isScrolled;
  const isMapMode = currentView === 'map' && !isLoading;

  return (
    <header className="navbar-wrapper">
      <div className="nav-capsule-container">
        <motion.div 
          ref={capsuleRef}
          className={`nav-glass-capsule ${isBlendedMode ? 'hero-blended' : 'separated-glass'} ${isMapMode ? 'map-glass-capsule' : ''} ${currentView === 'detail' ? 'detail-glass-capsule' : ''}`}
          initial={false}
          animate={{
            x: 0,
            maxWidth: isMapMode && isDesktop ? 1040 : 1280,
          }}
          transition={{
            type: 'spring',
            stiffness: 160,
            damping: 24,
            mass: 0.8
          }}
        >
          {/* Brand Logo with Sovereign Crest */}
          <BrandLogo 
            size="md"
            locale={locale}
            onClick={() => onNavigate('home')}
          />

          {/* Desktop Navigation Links */}
          <nav className="desktop-nav">
            {navLinks.map((link) => {
              const isActive = currentView === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  {link.label}
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavIndicator"
                      className="nav-indicator"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="nav-controls">
            {/* Saved Portfolio Shortlist Button */}
            <button
              className={`theme-btn bookmark-nav-btn ${isBlendedMode ? 'blended-pill' : ''} ${favoriteIds.length > 0 ? 'has-favorites' : ''}`}
              onClick={() => setIsDrawerOpen(true)}
              title={locale === 'ar' ? 'العقارات المحفوظة' : 'Saved Portfolio Shortlist'}
              type="button"
            >
              <Bookmark size={16} fill={favoriteIds.length > 0 ? 'currentColor' : 'none'} />
              {favoriteIds.length > 0 && (
                <span className="nav-badge-count">{favoriteIds.length}</span>
              )}
            </button>

            {/* Language Switcher */}
            <button 
              className={`lang-btn ${isBlendedMode ? 'blended-pill' : ''}`}
              onClick={handleToggleLang}
              title={locale === 'ar' ? 'التحويل إلى English' : 'التحويل إلى العربية'}
              aria-label={locale === 'ar' ? 'تغيير لغة المنصة' : 'Switch Platform Language'}
            >
              <span className={locale.toUpperCase() === 'EN' ? 'active-lang' : ''}>EN</span>
              <span className="lang-divider">|</span>
              <span className={locale.toUpperCase() === 'AR' ? 'active-lang' : ''}>عربي</span>
            </button>

            {/* Theme Toggle */}
            <button 
              className={`theme-btn ${isBlendedMode ? 'blended-pill' : ''}`}
              onClick={onToggleTheme}
              title={isDarkMode ? 'Dark Mode Active' : 'Switch Mode'}
              suppressHydrationWarning
            >
              {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Mobile Hamburger */}
            <button 
              className="mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </motion.div>

        {/* Mobile Drawer (Glass Pill Style) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                className="mobile-drawer-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div 
                className="mobile-drawer-glass"
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.22 }}
                dir={locale === 'ar' ? 'rtl' : 'ltr'}
              >
                <div className="mobile-links">
                  {navLinks.map((link) => (
                    <button
                      key={link.id}
                      onClick={() => {
                        onNavigate(link.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`mobile-nav-link ${currentView === link.id ? 'active' : ''}`}
                      type="button"
                    >
                      <span>{link.label}</span>
                      {currentView === link.id && <span className="mobile-active-dot" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      <style>{`
        .navbar-wrapper {
          position: fixed;
          top: 1.25rem;
          left: 0;
          right: 0;
          width: 100%;
          z-index: 2000;
          pointer-events: none;
          transition: top 350ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .nav-capsule-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          padding: 0 1.5rem;
          box-sizing: border-box;
        }

        @media (min-width: 993px) {
          .map-glass-capsule {
            padding: 0 1.35rem;
          }

          .map-glass-capsule .desktop-nav {
            gap: 1.25rem;
          }
        }

        /* 1. Base Glass Capsule */
        .nav-glass-capsule {
          pointer-events: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          max-width: 1280px;
          height: 66px;
          padding: 0 1.75rem;
          box-sizing: border-box;
          border-radius: var(--radius-full);
          transition: background var(--transition-smooth), border-color var(--transition-smooth), box-shadow var(--transition-smooth);
        }

        /* 2. Strong tint over hero imagery; retain the existing no-blur state. */
        .nav-glass-capsule.hero-blended {
          background: var(--glass-strong) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          border: var(--glass-border) !important;
          box-shadow: var(--shadow-glass) !important;
        }

        [data-theme="dark"] .nav-glass-capsule.hero-blended,
        [data-theme="light"] .nav-glass-capsule.hero-blended {
          background: var(--glass-strong) !important;
          border: var(--glass-border) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          box-shadow: var(--shadow-glass) !important;
        }

        /* 3. Scrolled / Separated State */
        .nav-glass-capsule.separated-glass {
          background: var(--bg-glass);
          backdrop-filter: var(--glass-blur-nav);
          -webkit-backdrop-filter: var(--glass-blur-nav);
          border: var(--glass-border);
          box-shadow: var(--shadow-glass);
          transform: translateY(0);
          text-shadow: var(--glass-text-shadow);
        }

        [data-theme="dark"] .nav-glass-capsule.separated-glass {
          background: var(--bg-glass);
          border: var(--glass-border);
          box-shadow: var(--shadow-glass);
        }

        [data-theme="light"] .nav-glass-capsule.separated-glass {
          background: var(--bg-glass);
          backdrop-filter: var(--glass-blur-nav);
          -webkit-backdrop-filter: var(--glass-blur-nav);
          border: var(--glass-border);
          box-shadow: var(--shadow-glass);
          text-shadow: var(--glass-text-shadow);
        }

        /* 4. Map Mode State */
        [data-theme="dark"] .nav-glass-capsule.map-glass-capsule {
          background: var(--glass-strong) !important;
          backdrop-filter: var(--glass-blur-nav) !important;
          -webkit-backdrop-filter: var(--glass-blur-nav) !important;
          border: var(--glass-border) !important;
          box-shadow: var(--shadow-glass) !important;
          text-shadow: var(--glass-text-shadow);
        }

        [data-theme="light"] .nav-glass-capsule.map-glass-capsule {
          background: var(--glass-strong) !important;
          backdrop-filter: var(--glass-blur-nav) !important;
          -webkit-backdrop-filter: var(--glass-blur-nav) !important;
          border: var(--glass-border) !important;
          box-shadow: var(--shadow-glass) !important;
          text-shadow: var(--glass-text-shadow);
        }

        .nav-glass-capsule.hero-blended .blended-pill {
          background: transparent !important;
          color: var(--text-primary) !important;
        }

        .nav-glass-capsule.separated-glass.detail-glass-capsule { background: var(--glass-strong); }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 1.75rem;
        }

        .nav-link {
          position: relative;
          color: var(--text-secondary);
          font-family: inherit;
          font-size: 0.9375rem;
          font-weight: 600;
          transition: color var(--transition-fast);
          padding: 0.5rem 0.25rem;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .hero-blended .nav-link {
          color: var(--text-secondary);
          text-shadow: var(--glass-text-shadow);
        }

        .nav-link:hover,
        .nav-link.active {
          color: var(--gold-primary);
        }

        .hero-blended .nav-link:hover,
        .hero-blended .nav-link.active {
          color: var(--gold-primary);
        }

        .nav-indicator {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #E5B869 0%, #FFF0C2 50%, #B8934A 100%);
          border-radius: 2px;
          box-shadow: 0 0 10px rgba(229, 184, 105, 0.8);
        }

        .nav-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .lang-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8125rem;
          font-weight: 700;
          padding: 0.4rem 0.75rem;
          border-radius: var(--radius-full);
          color: var(--text-primary);
          background: var(--bg-glass-card);
          border: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .lang-btn.blended-pill {
          background: rgba(0, 0, 0, 0.35);
          border-color: rgba(255, 255, 255, 0.2);
          color: #FFFFFF !important;
        }

        .lang-btn:hover {
          color: var(--gold-primary);
          border-color: var(--gold-border);
          transform: translateY(-1px);
        }

        .active-lang {
          color: var(--gold-primary);
          font-weight: 800;
        }

        .lang-divider {
          opacity: 0.4;
          font-size: 0.7rem;
        }

        .theme-btn,
        .bookmark-nav-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          background: var(--bg-glass-card);
          border: 1px solid var(--border-subtle);
          transition: all var(--transition-fast);
          position: relative;
          cursor: pointer;
        }

        .bookmark-nav-btn.has-favorites {
          color: var(--gold-primary);
          border-color: var(--gold-border);
          background: rgba(229, 184, 105, 0.12);
        }

        .nav-badge-count {
          position: absolute;
          top: -4px;
          right: -4px;
          background: linear-gradient(135deg, #FFF0C2 0%, #E5B869 50%, #B8934A 100%);
          color: #0E121A;
          font-size: 0.625rem;
          font-weight: 900;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
        }

        .theme-btn:hover,
        .bookmark-nav-btn:hover {
          color: var(--gold-primary);
          border-color: var(--gold-border);
          transform: translateY(-1px);
        }

        .mobile-toggle {
          display: none;
          color: var(--text-primary);
          padding: 0.4rem;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .hero-blended .mobile-toggle {
          color: #FFFFFF !important;
        }

        /* Mobile Drawer Backdrop & Glass Menu */
        .mobile-drawer-backdrop {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.25);
          z-index: 2001;
          pointer-events: auto;
        }

        .mobile-drawer-glass {
          position: fixed;
          top: 76px;
          left: 0.75rem;
          right: 0.75rem;
          width: auto;
          max-height: calc(100vh - 96px);
          background: var(--glass-strong);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border: var(--glass-border);
          border-radius: 20px;
          padding: 1.25rem 1.25rem 1.5rem;
          box-shadow: var(--shadow-glass);
          z-index: 2002;
          pointer-events: auto;
          text-shadow: var(--glass-text-shadow);
        }

        [data-theme="dark"] .mobile-drawer-glass {
          background: var(--glass-strong);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border: var(--glass-border);
          box-shadow: var(--shadow-glass);
          text-shadow: var(--glass-text-shadow);
        }

        [data-theme="light"] .mobile-drawer-glass {
          background: var(--glass-strong);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border: var(--glass-border);
          box-shadow: var(--shadow-glass);
          text-shadow: var(--glass-text-shadow);
        }

        .mobile-links {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .mobile-nav-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          text-align: left;
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
          padding: 0.75rem 1rem;
          border-radius: 12px;
          background: transparent;
          border: none;
          white-space: nowrap;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .navbar-wrapper[dir="rtl"] .mobile-nav-link,
        .mobile-drawer-glass[dir="rtl"] .mobile-nav-link,
        [dir="rtl"] .mobile-nav-link {
          text-align: right;
        }

        .mobile-nav-link:hover {
          background: rgba(229, 184, 105, 0.12);
          color: var(--gold-primary);
        }

        .mobile-nav-link.active {
          background: rgba(229, 184, 105, 0.18);
          color: var(--gold-primary);
        }

        .mobile-active-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--gold-primary);
          box-shadow: 0 0 8px var(--gold-primary);
        }

        @media (max-width: 992px) {
          .desktop-nav {
            display: none;
          }
          .mobile-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .nav-cta {
            display: none;
          }
          .nav-glass-capsule {
            height: 56px;
            padding: 0 1rem;
          }
        }

        @media (max-width: 640px) {
          .navbar-wrapper {
            top: 0.5rem;
          }
          .nav-capsule-container {
            padding: 0 0.5rem;
            box-sizing: border-box;
          }
          .nav-glass-capsule {
            height: 56px;
            padding: 0 0.85rem;
            box-sizing: border-box;
            border-radius: 9999px;
          }
          .luxury-brand-logo {
            margin: 0;
            padding: 0;
            flex-shrink: 0;
          }
          .nav-controls {
            gap: 4px;
            margin: 0;
            padding: 0;
            flex-shrink: 0;
          }
          .lang-btn {
            padding: 0.22rem 0.42rem;
            font-size: 0.72rem;
          }
          .theme-btn,
          .bookmark-nav-btn {
            width: 30px;
            height: 30px;
            padding: 0;
          }
          .mobile-toggle {
            width: 30px;
            height: 30px;
            padding: 0;
          }
        }
        [data-theme="light"] .nav-glass-capsule .nav-link.active,
        [data-theme="light"] .nav-glass-capsule .active-lang {
          color: var(--gold-dark);
        }
      `}</style>
    </header>
  );
};
