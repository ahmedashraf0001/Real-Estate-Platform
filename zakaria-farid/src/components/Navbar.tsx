'use client';
import React, { useState, useEffect } from 'react';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';

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
          animate={{
            x: isMapMode && isDesktop ? -200 : 0,
            maxWidth: isMapMode && isDesktop ? 1040 : 1280,
          }}
          transition={{
            type: 'spring',
            stiffness: 160,
            damping: 24,
            mass: 0.8
          }}
        >
          {/* Brand Logo */}
          <div 
            className="brand-logo" 
            onClick={() => onNavigate('home')}
          >
            <span className="logo-gold">ZAKARIA</span>
            <span className="logo-white">FARID</span>
          </div>

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
            {/* Language Switcher */}
            <button 
              className={`lang-btn ${isBlendedMode ? 'blended-pill' : ''}`}
              onClick={handleToggleLang}
              title="Switch Language"
            >
              <span className={locale.toUpperCase() === 'EN' ? 'active-lang' : ''}>EN</span>
              <span className="lang-divider">|</span>
              <span className={locale.toUpperCase() === 'AR' ? 'active-lang' : ''}>AR</span>
            </button>

            {/* Theme Toggle */}
            <button 
              className={`theme-btn ${isBlendedMode ? 'blended-pill' : ''}`}
              onClick={onToggleTheme}
              title={isDarkMode ? 'Dark Mode Active' : 'Switch Mode'}
            >
              {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Primary Inquire CTA */}
            <button 
              className="btn-gold nav-cta"
              onClick={() => onOpenInquiry('General Acquisition Inquiry')}
            >
              {locale === 'ar' ? 'استفسر الآن' : 'Inquire Now'}
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
            <motion.div 
              className="mobile-drawer-glass"
              initial={{ opacity: 0, y: -15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mobile-links">
                {navLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => onNavigate(link.id)}
                    className={`mobile-nav-link ${currentView === link.id ? 'active' : ''}`}
                  >
                    {link.label}
                  </button>
                ))}
                <div className="mobile-actions">
                  <button 
                    className="btn-gold mobile-cta-btn"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenInquiry('General Acquisition Inquiry');
                    }}
                  >
                    {locale === 'ar' ? 'استفسر الآن' : 'Inquire Now'}
                  </button>
                </div>
              </div>
            </motion.div>
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
            gap: clamp(1rem, 1.5vw, 1.75rem);
          }

          .map-glass-capsule .nav-controls {
            gap: 0.85rem;
          }

          .map-glass-capsule .nav-cta {
            padding: 0.55rem 1.15rem;
            font-size: 0.875rem;
          }
        }

        /* 1. Base Glass Capsule */
        .nav-glass-capsule {
          pointer-events: auto;
          width: 100%;
          height: 66px;
          padding: 0 1.75rem;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          box-sizing: border-box;
          will-change: transform, max-width;
          transition: 
            padding 400ms cubic-bezier(0.16, 1, 0.3, 1),
            background 450ms cubic-bezier(0.16, 1, 0.3, 1),
            border-color 450ms cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 450ms cubic-bezier(0.16, 1, 0.3, 1),
            backdrop-filter 450ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* 2. Top Blended State (Blends with Hero seamlessly) */
        .nav-glass-capsule.hero-blended {
          background: transparent;
          border: 1px solid transparent;
          backdrop-filter: blur(0px);
          -webkit-backdrop-filter: blur(0px);
          box-shadow: 0 0 0 transparent;
        }

        /* 3. Scrolled / Separated State (Floating Frosted Liquid Crystal Glass Capsule) */
        .nav-glass-capsule.separated-glass {
          background: var(--bg-glass);
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid var(--border-glass);
          box-shadow: var(--shadow-glass);
          transform: translateY(0);
        }

        [data-theme="dark"] .nav-glass-capsule.separated-glass {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.22) 0%,
            rgba(255, 255, 255, 0.06) 30%,
            rgba(18, 24, 38, 0.42) 65%,
            rgba(10, 14, 24, 0.65) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: 
            0 20px 48px rgba(0, 0, 0, 0.38), 
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
            inset 0 -1px 1px rgba(255, 255, 255, 0.12);
        }

        [data-theme="light"] .nav-glass-capsule.separated-glass {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.65) 0%,
            rgba(255, 255, 255, 0.30) 35%,
            rgba(255, 255, 255, 0.48) 100%
          );
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid rgba(255, 255, 255, 0.75);
          box-shadow: 
            0 18px 44px rgba(15, 23, 42, 0.08), 
            inset 0 1.5px 2px #FFFFFF,
            inset 0 -1px 1px rgba(255, 255, 255, 0.25);
        }

        /* 4. Map Mode State */
        [data-theme="dark"] .nav-glass-capsule.map-glass-capsule {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.22) 0%,
            rgba(255, 255, 255, 0.06) 30%,
            rgba(18, 24, 38, 0.45) 65%,
            rgba(10, 14, 24, 0.70) 100%
          ) !important;
          backdrop-filter: blur(24px) saturate(220%) contrast(108%) brightness(108%) !important;
          -webkit-backdrop-filter: blur(24px) saturate(220%) contrast(108%) brightness(108%) !important;
          border: 1px solid rgba(255, 255, 255, 0.28) !important;
          box-shadow: 
            0 20px 50px rgba(0, 0, 0, 0.38), 
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
            inset 0 -1px 1px rgba(255, 255, 255, 0.12) !important;
        }

        [data-theme="light"] .nav-glass-capsule.map-glass-capsule {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.65) 0%,
            rgba(255, 255, 255, 0.32) 35%,
            rgba(255, 255, 255, 0.50) 100%
          ) !important;
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%) !important;
          border: 1px solid rgba(255, 255, 255, 0.75) !important;
          box-shadow: 
            0 18px 45px rgba(15, 23, 42, 0.09), 
            inset 0 1.5px 2px #FFFFFF,
            inset 0 -1px 1px rgba(255, 255, 255, 0.25) !important;
        }

        [data-theme="dark"] .map-glass-capsule .logo-white {
          color: #FFFFFF !important;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
        }

        [data-theme="dark"] .map-glass-capsule .nav-link {
          color: #FFFFFF !important;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
        }

        [data-theme="dark"] .map-glass-capsule .nav-link:hover,
        [data-theme="dark"] .map-glass-capsule .nav-link.active {
          color: #DDA752 !important;
        }

        [data-theme="dark"] .map-glass-capsule .lang-btn,
        [data-theme="dark"] .map-glass-capsule .theme-btn {
          background: rgba(255, 255, 255, 0.1) !important;
          border-color: rgba(255, 255, 255, 0.25) !important;
          color: #FFFFFF !important;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
        }

        [data-theme="light"] .nav-glass-capsule.map-glass-capsule {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.46) 0%,
            rgba(255, 255, 255, 0.26) 100%
          ) !important;
          backdrop-filter: blur(14px) saturate(180%) contrast(102%) !important;
          -webkit-backdrop-filter: blur(14px) saturate(180%) contrast(102%) !important;
          border: 1px solid rgba(255, 255, 255, 0.60) !important;
          box-shadow: 
            0 16px 45px rgba(15, 23, 42, 0.09), 
            inset 0 1.5px 1.5px #FFFFFF,
            inset 0 -1px 1px rgba(255, 255, 255, 0.20) !important;
        }

        [data-theme="light"] .map-glass-capsule .logo-white {
          color: #0D1117 !important;
        }

        [data-theme="light"] .map-glass-capsule .nav-link {
          color: #0D1117 !important;
        }

        [data-theme="light"] .map-glass-capsule .nav-link:hover,
        [data-theme="light"] .map-glass-capsule .nav-link.active {
          color: var(--gold-primary) !important;
        }

        [data-theme="light"] .map-glass-capsule .lang-btn,
        [data-theme="light"] .map-glass-capsule .theme-btn {
          background: rgba(0, 0, 0, 0.05) !important;
          border-color: rgba(0, 0, 0, 0.08) !important;
          color: #0D1117 !important;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          cursor: pointer;
          user-select: none;
          flex-shrink: 0;
        }

        [data-theme="dark"] .brand-logo {
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
        }

        .logo-gold {
          color: var(--gold-primary);
        }

        .logo-white {
          color: var(--text-primary);
          transition: color var(--transition-fast);
        }

        .hero-blended .logo-white {
          color: #FFFFFF !important;
        }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: clamp(1.25rem, 2vw, 2rem);
          flex-shrink: 1;
        }

        .nav-link {
          position: relative;
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-primary);
          padding: 0.5rem 0.25rem;
          transition: color var(--transition-fast);
        }

        [data-theme="dark"] .nav-link {
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
        }

        .hero-blended .nav-link {
          color: #FFFFFF !important;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
        }

        .nav-link:hover {
          color: var(--gold-primary);
        }

        .nav-link.active {
          color: var(--gold-primary);
          font-weight: 700;
        }

        .nav-indicator {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--gold-primary);
          border-radius: 2px;
          box-shadow: 0 0 10px var(--gold-glow);
        }

        .nav-controls {
          display: flex;
          align-items: center;
          gap: 1.15rem;
          flex-shrink: 0;
        }

        .lang-btn {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0.35rem 0.6rem;
          border-radius: var(--radius-full);
          background: var(--bg-glass-card);
          border: 1px solid var(--border-subtle);
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .lang-btn {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
        }

        .lang-btn.blended-pill {
          background: rgba(0, 0, 0, 0.35);
          border-color: rgba(255, 255, 255, 0.2);
          color: #FFFFFF !important;
        }

        .lang-btn:hover {
          color: var(--gold-primary);
          border-color: var(--gold-border);
        }

        .active-lang {
          color: var(--gold-primary);
        }

        .lang-divider {
          opacity: 0.5;
          font-size: 0.6875rem;
        }

        .theme-btn {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          background: var(--bg-glass-card);
          border: 1px solid var(--border-subtle);
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .theme-btn {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
        }

        .theme-btn.blended-pill {
          background: rgba(0, 0, 0, 0.35);
          border-color: rgba(255, 255, 255, 0.2);
          color: #FFFFFF !important;
        }

        .theme-btn:hover {
          color: var(--gold-primary);
          border-color: var(--gold-border);
          transform: translateY(-1px);
        }

        .nav-cta {
          padding: 0.55rem 1.25rem;
          font-size: 0.875rem;
          border-radius: var(--radius-full);
        }

        .mobile-toggle {
          display: none;
          color: var(--text-primary);
          padding: 0.4rem;
        }

        .hero-blended .mobile-toggle {
          color: #FFFFFF !important;
        }

        /* Mobile Drawer Glass */
        .mobile-drawer-glass {
          pointer-events: auto;
          width: 100%;
          max-width: 1240px;
          background: var(--bg-surface);
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          padding: 1.5rem 1.75rem 2rem;
          margin-top: 0.75rem;
          box-shadow: var(--shadow-lg);
        }

        .mobile-links {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .mobile-nav-link {
          text-align: left;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-subtle);
        }

        .mobile-nav-link.active {
          color: var(--gold-primary);
          font-weight: 700;
        }

        .mobile-actions {
          margin-top: 1rem;
        }

        .mobile-cta-btn {
          width: 100%;
          border-radius: var(--radius-full);
        }

        @media (max-width: 992px) {
          .desktop-nav {
            display: none;
          }
          .mobile-toggle {
            display: block;
          }
          .nav-cta {
            display: none;
          }
          .nav-glass-capsule {
            height: 60px;
            padding: 0 1.25rem;
          }
        }
      `}</style>
    </header>
  );
};
