'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { InquiryModal } from '@/components/InquiryModal';
import { LuxuryCursor } from '@/components/LuxuryCursor';
import { NavigationProgress } from '@/components/NavigationProgress';
import { SavedPortfolioDrawer } from '@/components/property/SavedPortfolioDrawer';
import { FALLBACK_PROPERTIES } from '@/lib/data/fallbackProperties';
import { adaptProperties } from '@/lib/utils/propertyAdapter';
import { preloadPropertyMapSites } from '@/lib/mapCache';

interface ClientAppShellProps {
  children: React.ReactNode;
  locale: string;
}

export const ClientAppShell: React.FC<ClientAppShellProps> = ({ children, locale }) => {
  const pathname = usePathname() || '';
  const isMapRoute = pathname.endsWith('/map') || pathname.includes('/map');

  // Theme state — always starts dark to match SSR default; mount effect corrects from DOM (no hydration mismatch)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // On mount: read theme the inline script already applied to `data-theme` (set before React hydrates)
  // This is a one-time correction that never causes hydration mismatch because it runs after first paint
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zf_theme');
      const docTheme = document.documentElement.getAttribute('data-theme');
      const resolved = (saved === 'light' || saved === 'dark') ? saved
        : (docTheme === 'light' || docTheme === 'dark') ? docTheme
        : 'dark';
      setIsDarkMode(resolved === 'dark');
    } catch {
      // keep default
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global Inquiry Modal state
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [inquiryModalTitle, setInquiryModalTitle] = useState('Private Acquisition Inquiry');
  const [inquiryPropertyName, setInquiryPropertyName] = useState<string | undefined>(undefined);

  // Sync DOM data-theme attribute, localStorage, and cookie on mount and every route/locale change
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zf_theme');
      if (saved === 'light' || saved === 'dark') {
        const isDark = saved === 'dark';
        setIsDarkMode(isDark);
        document.documentElement.setAttribute('data-theme', saved);
        document.cookie = `zf_theme=${saved}; path=/; max-age=31536000; SameSite=Lax`;
      } else {
        const current = isDarkMode ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', current);
        localStorage.setItem('zf_theme', current);
        document.cookie = `zf_theme=${current}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {}
  }, [pathname, locale]);

  // MutationObserver to ensure data-theme is never stripped or desynced during Next.js client-side navigations
  useEffect(() => {
    const applyExpectedTheme = () => {
      try {
        const saved = localStorage.getItem('zf_theme');
        const expected = (saved === 'light' || saved === 'dark')
          ? saved
          : (isDarkMode ? 'dark' : 'light');
        const current = document.documentElement.getAttribute('data-theme');
        if (current !== expected) {
          document.documentElement.setAttribute('data-theme', expected);
        }
      } catch {}
    };

    applyExpectedTheme();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          const current = document.documentElement.getAttribute('data-theme');
          if (!current || (current !== 'light' && current !== 'dark')) {
            applyExpectedTheme();
          }
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      const theme = next ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      try {
        localStorage.setItem('zf_theme', theme);
        document.cookie = `zf_theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    // Pre-cache sovereign property map sites in background during idle
    const timer = setTimeout(() => {
      preloadPropertyMapSites();
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenInquiry = (title?: string, propertyName?: string) => {
    setInquiryModalTitle(title || 'Private Acquisition Inquiry');
    setInquiryPropertyName(propertyName);
    setIsInquiryModalOpen(true);
  };

  return (
    <div className="app-root">
      {/* Luxury Top Navigation Progress Laser */}
      <NavigationProgress />

      {/* Luxury Magnetic Cursor */}
      <LuxuryCursor />

      {/* Top Floating Liquid Crystal Navbar */}
      <Navbar
        locale={locale}
        onOpenInquiry={(title) => handleOpenInquiry(title)}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main View Container */}
      <main className="main-content">
        {children}
      </main>

      {/* Luxury Footer (Hidden on Fullscreen Map View) */}
      {!isMapRoute && (
        <Footer locale={locale} />
      )}

      {/* Global Sovereign Dossier Inquiry Modal */}
      <InquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        title={inquiryModalTitle}
        propertyName={inquiryPropertyName}
        locale={locale}
      />

      {/* Global Anonymous Saved Portfolio Shortlist Drawer */}
      <SavedPortfolioDrawer
        properties={adaptProperties(FALLBACK_PROPERTIES as any, locale as any)}
        locale={locale}
      />
    </div>
  );
};

export default ClientAppShell;
