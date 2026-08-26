'use client';
import React, { useState, useEffect } from 'react';
import { Moon, Sun, Menu, X, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { useFavorites } from '@/lib/context/FavoritesContext';

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
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 992);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    handleScroll();
    handleResize();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
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
          className={`nav-glass-capsule ${isBlendedMode ? 'hero-blended' : 'separated-glass'} ${isMapMode ? 'map-glass-capsule' : ''}`}
          initial={false}
          animate={{
            x: isMapMode && isDesktop ? (locale === 'ar' ? 200 : -200) : 0,
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
          z-index: 1000;
          pointer-events: none;
          transition: top 350ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .nav-capsule-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          padding: 0 1.5rem;
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
          border-radius: var(--radius-full);
          transition: background var(--transition-smooth), border-color var(--transition-smooth), box-shadow var(--transition-smooth);
        }

        /* 2. Hero Blended State (Fully transparent over hero in both light and dark modes) */
        .nav-glass-capsule.hero-blended {
          background: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          border: 1px solid transparent !important;
          box-shadow: none !important;
        }

        [data-theme="dark"] .nav-glass-capsule.hero-blended,
        [data-theme="light"] .nav-glass-capsule.hero-blended {
          background: transparent !important;
          border-color: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          box-shadow: none !important;
        }

        /* 3. Scrolled / Separated State */
        .nav-glass-capsule.separated-glass {
          background: var(--bg-glass);
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid var(--border-glass);
          box-shadow: var(--shadow-glass);
          transform: translateY(0);
        }

        [data-theme="dark"] .nav-glass-capsule.separated-glass {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.06) 30%, rgba(18, 24, 38, 0.42) 65%, rgba(10, 14, 24, 0.65) 100%);
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.38), inset 0 1.5px 2px rgba(255, 255, 255, 0.65), inset 0 -1px 1px rgba(255, 255, 255, 0.12);
        }

        [data-theme="light"] .nav-glass-capsule.separated-glass {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.38) 40%, rgba(255, 255, 255, 0.58) 100%);
          backdrop-filter: blur(32px) saturate(210%) contrast(106%);
          -webkit-backdrop-filter: blur(32px) saturate(210%) contrast(106%);
          border: 1.5px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.10), inset 0 1.5px 2px rgba(255, 255, 255, 0.95), inset 0 -1px 1px rgba(0, 0, 0, 0.03);
        }

        /* 4. Map Mode State */
        [data-theme="dark"] .nav-glass-capsule.map-glass-capsule {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.05) 25%, rgba(18, 24, 38, 0.46) 60%, rgba(10, 14, 24, 0.62) 100%) !important;
          backdrop-filter: blur(24px) saturate(200%) contrast(105%) brightness(105%) !important;
          -webkit-backdrop-filter: blur(24px) saturate(200%) contrast(105%) brightness(105%) !important;
          border: 1px solid rgba(255, 255, 255, 0.24) !important;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.38), inset 0 1.5px 2px rgba(255, 255, 255, 0.55), inset 0 -1px 1px rgba(255, 255, 255, 0.08) !important;
        }

        [data-theme="light"] .nav-glass-capsule.map-glass-capsule {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.58) 0%, rgba(255, 255, 255, 0.32) 40%, rgba(248, 246, 240, 0.48) 100%) !important;
          backdrop-filter: blur(22px) saturate(180%) contrast(102%) brightness(102%) !important;
          -webkit-backdrop-filter: blur(22px) saturate(180%) contrast(102%) brightness(102%) !important;
          border: 1px solid rgba(255, 255, 255, 0.70) !important;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08), inset 0 1.5px 2px #FFFFFF, inset 0 -1px 1px rgba(255, 255, 255, 0.35) !important;
        }

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
          color: rgba(255, 255, 255, 0.85);
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }

        .nav-link:hover,
        .nav-link.active {
          color: var(--gold-primary);
        }

        .hero-blended .nav-link:hover,
        .hero-blended .nav-link.active {
          color: #E5B869;
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
          background: rgba(0, 0, 0, 0.15);
          z-index: 1001;
          pointer-events: auto;
        }

        .mobile-drawer-glass {
          position: fixed;
          top: 76px;
          left: 0.75rem;
          right: 0.75rem;
          width: auto;
          max-height: calc(100vh - 96px);
          background: var(--bg-glass);
          backdrop-filter: blur(28px) saturate(210%);
          -webkit-backdrop-filter: blur(28px) saturate(210%);
          border: 1px solid var(--border-glass);
          border-radius: 20px;
          padding: 1.25rem 1.25rem 1.5rem;
          box-shadow: var(--shadow-glass);
          z-index: 1002;
          pointer-events: auto;
        }

        [data-theme="dark"] .mobile-drawer-glass {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.25) 0%,
            rgba(255, 255, 255, 0.08) 30%,
            rgba(18, 24, 38, 0.42) 65%,
            rgba(10, 14, 24, 0.65) 100%
          );
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow:
            0 20px 48px rgba(0, 0, 0, 0.38),
            0 4px 14px rgba(0, 0, 0, 0.18),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
            inset 0 -1px 1px rgba(255, 255, 255, 0.12);
        }

        [data-theme="light"] .mobile-drawer-glass {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.65) 0%,
            rgba(255, 255, 255, 0.32) 40%,
            rgba(255, 255, 255, 0.52) 100%
          );
          backdrop-filter: blur(32px) saturate(210%) contrast(106%);
          -webkit-backdrop-filter: blur(32px) saturate(210%) contrast(106%);
          border: 1.5px solid rgba(255, 255, 255, 0.75);
          box-shadow:
            0 24px 56px rgba(15, 23, 42, 0.14),
            0 4px 16px rgba(0, 0, 0, 0.04),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.95),
            inset 0 -1px 1px rgba(0, 0, 0, 0.05);
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
            top: 0.75rem;
          }
          .nav-capsule-container {
            padding: 0 0.65rem;
          }
          .nav-glass-capsule {
            height: 52px;
            padding: 0 0.65rem;
          }
          .nav-controls {
            gap: 4px;
          }
          .lang-btn {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
          }
          .theme-btn,
          .bookmark-nav-btn {
            width: 32px;
            height: 32px;
            padding: 0;
          }
          .mobile-toggle {
            width: 32px;
            height: 32px;
            padding: 0;
          }
        }
      `}</style>
    </header>
  );
};
