'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { InquiryModal } from '@/components/InquiryModal';
import { LuxuryCursor } from '@/components/LuxuryCursor';
import { preloadPropertyMapSites } from '@/lib/mapCache';

interface ClientAppShellProps {
  children: React.ReactNode;
  locale: string;
}

export const ClientAppShell: React.FC<ClientAppShellProps> = ({ children, locale }) => {
  const pathname = usePathname() || '';
  const isMapRoute = pathname.endsWith('/map') || pathname.includes('/map');

  // Theme state with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('zf_theme');
      return saved ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });

  // Modal states
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [inquiryModalTitle, setInquiryModalTitle] = useState('Private Acquisition Inquiry');
  const [inquiryPropertyName, setInquiryPropertyName] = useState<string | undefined>(undefined);

  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('zf_theme', theme);
    } catch {}
  }, [isDarkMode]);

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
      {/* Luxury Magnetic Cursor */}
      <LuxuryCursor />

      {/* Top Floating Liquid Crystal Navbar */}
      <Navbar
        locale={locale}
        onOpenInquiry={(title) => handleOpenInquiry(title)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
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
    </div>
  );
};

export default ClientAppShell;
