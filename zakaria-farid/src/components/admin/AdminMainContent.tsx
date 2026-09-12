'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import styles from '@/app/admin/admin.module.css';
import { AdminUniversalHeader } from './AdminUniversalHeader';
import { ZFQuickSearchModal } from './erp/ZFQuickSearchModal';

export function AdminMainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isErp = pathname.includes('/erp') || pathname.includes('/fin-os');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Omni-Search Keyboard Shortcut (⌘K / Ctrl+K) across admin suite
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to custom 'zf:open-search' event dispatched from anywhere
  useEffect(() => {
    const handleOpen = () => setIsSearchOpen(true);
    window.addEventListener('zf:open-search', handleOpen);
    return () => window.removeEventListener('zf:open-search', handleOpen);
  }, []);

  // Extract adminLocale from pathname (e.g. /admin/ar/properties -> 'ar')
  const pathParts = pathname.split('/');
  const adminIdx = pathParts.indexOf('admin');
  const adminLocale = (adminIdx !== -1 && pathParts[adminIdx + 1] && ['ar', 'en'].includes(pathParts[adminIdx + 1])) 
    ? pathParts[adminIdx + 1] 
    : 'ar';
  const isAr = adminLocale === 'ar';

  return (
    <div className={`${styles.adminMain} ${isErp ? styles.adminMainFullBleed : ''}`}>
      {!isErp && (
        <AdminUniversalHeader 
          adminLocale={adminLocale}
          onOpenSearch={() => setIsSearchOpen(true)}
        />
      )}
      <div className={`${styles.adminContainer} ${isErp ? styles.adminContainerFullBleed : ''}`}>
        {children}
      </div>

      <ZFQuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        isAr={isAr}
        adminLocale={adminLocale}
      />
    </div>
  );
}
