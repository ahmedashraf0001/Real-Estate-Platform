'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Search, 
  Plus, 
  Sun, 
  Moon, 
  ExternalLink, 
  Languages, 
  LayoutDashboard,
  Building2
} from 'lucide-react';
import styles from './AdminUniversalHeader.module.css';

export interface AdminUniversalHeaderProps {
  adminLocale: string;
  onOpenSearch: () => void;
}

export const AdminUniversalHeader: React.FC<AdminUniversalHeaderProps> = ({
  adminLocale,
  onOpenSearch,
}) => {
  const pathname = usePathname() || '';
  const isAr = adminLocale === 'ar';
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // Sync theme with document & localStorage
  useEffect(() => {
    const resolveTheme = (): 'dark' | 'light' => {
      if (typeof document !== 'undefined') {
        const docTheme = document.documentElement.getAttribute('data-theme') as 'dark' | 'light' | null;
        if (docTheme === 'dark' || docTheme === 'light') return docTheme;
      }
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('zf_theme') as 'dark' | 'light' | null;
        if (saved === 'dark' || saved === 'light') return saved;
      }
      return 'light';
    };

    setTheme(resolveTheme());

    if (typeof document !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
            setTheme(resolveTheme());
          }
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
      return () => observer.disconnect();
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('zf_theme', next);
    document.cookie = `zf_theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
  };

  // Language toggle target URL
  const nextLang = isAr ? 'en' : 'ar';
  const togglePath = pathname.replace(`/admin/${adminLocale}`, `/admin/${nextLang}`);

  // Dynamic Breadcrumbs based on pathname
  const renderBreadcrumb = () => {
    const isDashboard = pathname === `/admin/${adminLocale}` || pathname === `/admin/${adminLocale}/`;
    const isAnalytics = pathname.includes('/analytics');
    const isPropertiesNew = pathname.includes('/properties/new');
    const isPropertiesEdit = pathname.includes('/properties/') && pathname.includes('/edit');
    const isPropertiesList = pathname.endsWith('/properties') || pathname.endsWith('/properties/');
    const isLeads = pathname.includes('/leads');
    const isSettings = pathname.includes('/settings');

    if (isDashboard) {
      return (
        <span className={styles.breadcrumbCurrent}>
          {isAr ? 'لوحة القيادة التنفيذية' : 'Executive Dashboard'}
        </span>
      );
    }

    if (isAnalytics) {
      return (
        <>
          <Link href={`/admin/${adminLocale}`} className={styles.breadcrumbRoot}>
            {isAr ? 'لوحة القيادة' : 'Dashboard'}
          </Link>
          <span className={styles.breadcrumbDivider}>/</span>
          <span className={styles.breadcrumbCurrent}>
            {isAr ? 'تحليلات السوق والذكاء العقاري' : 'Market Intelligence'}
          </span>
        </>
      );
    }

    if (isPropertiesNew) {
      return (
        <>
          <Link href={`/admin/${adminLocale}/properties`} className={styles.breadcrumbRoot}>
            {isAr ? 'محفظة العقارات' : 'Properties'}
          </Link>
          <span className={styles.breadcrumbDivider}>/</span>
          <span className={styles.breadcrumbCurrent}>
            {isAr ? 'إدراج صرح معماري جديد' : 'New Property Listing'}
          </span>
        </>
      );
    }

    if (isPropertiesEdit) {
      return (
        <>
          <Link href={`/admin/${adminLocale}/properties`} className={styles.breadcrumbRoot}>
            {isAr ? 'محفظة العقارات' : 'Properties'}
          </Link>
          <span className={styles.breadcrumbDivider}>/</span>
          <span className={styles.breadcrumbCurrent}>
            {isAr ? 'تعديل بيانات الصرح' : 'Edit Property'}
          </span>
        </>
      );
    }

    if (isPropertiesList) {
      return (
        <>
          <Link href={`/admin/${adminLocale}`} className={styles.breadcrumbRoot}>
            {isAr ? 'لوحة القيادة' : 'Dashboard'}
          </Link>
          <span className={styles.breadcrumbDivider}>/</span>
          <span className={styles.breadcrumbCurrent}>
            {isAr ? 'محفظة العقارات والمشاريع' : 'Properties Portfolio'}
          </span>
        </>
      );
    }

    if (isLeads) {
      return (
        <>
          <Link href={`/admin/${adminLocale}`} className={styles.breadcrumbRoot}>
            {isAr ? 'لوحة القيادة' : 'Dashboard'}
          </Link>
          <span className={styles.breadcrumbDivider}>/</span>
          <span className={styles.breadcrumbCurrent}>
            {isAr ? 'إدارة العملاء والمعاينات' : 'Client CRM & Pipeline'}
          </span>
        </>
      );
    }

    if (isSettings) {
      return (
        <>
          <Link href={`/admin/${adminLocale}`} className={styles.breadcrumbRoot}>
            {isAr ? 'لوحة القيادة' : 'Dashboard'}
          </Link>
          <span className={styles.breadcrumbDivider}>/</span>
          <span className={styles.breadcrumbCurrent}>
            {isAr ? 'إعدادات المنصة ورادار السوق' : 'Platform Settings'}
          </span>
        </>
      );
    }

    return (
      <span className={styles.breadcrumbCurrent}>
        {isAr ? 'لوحة الإدارة' : 'Admin Suite'}
      </span>
    );
  };

  return (
    <header className={styles.universalHeader} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Page Breadcrumb Context */}
      <div className={styles.breadcrumbBox}>
        {renderBreadcrumb()}
      </div>

      {/* 2. Central Omni-Search Trigger Anchor */}
      <button
        type="button"
        className={styles.searchAnchor}
        onClick={onOpenSearch}
        title={isAr ? 'البحث الشامل في المنظومة (⌘K)' : 'Universal Omni-Search (⌘K)'}
        aria-label={isAr ? 'البحث الشامل' : 'Omni-Search'}
      >
        <div className={styles.searchIconText}>
          <Search size={15} className={styles.searchIcon} />
          <span className={styles.searchText}>
            {isAr 
              ? 'البحث الشامل في المنظومة (عقارات، عملاء، عقود، خزينة، شركاء)...' 
              : 'Universal Omni-Search (Properties, Leads, Contracts, Treasury, Partners)...'}
          </span>
        </div>
        <kbd className={styles.kbd}>⌘K</kbd>
      </button>

      {/* 3. Quick Controls */}
      <div className={styles.quickControls}>
        <Link 
          href={`/admin/${adminLocale}/properties/new`} 
          className={styles.newPropBtn}
          title={isAr ? 'إدراج صرح معماري جديد' : 'New Property Listing'}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>{isAr ? '+ صرح جديد' : '+ New Property'}</span>
        </Link>

        <button
          type="button"
          className={styles.iconBtn}
          onClick={toggleTheme}
          title={isAr ? (theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي') : (theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode')}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <a
          href={`/${adminLocale}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.iconBtn}
          title={isAr ? 'معاينة المنصة الحية في نافذة جديدة' : 'Live Platform Preview'}
        >
          <ExternalLink size={14} />
          <span>{isAr ? 'معاينة المنصة' : 'Live View'}</span>
        </a>

        <Link
          href={togglePath}
          className={styles.iconBtn}
          title={isAr ? 'Switch to English' : 'التحويل للعربية'}
        >
          <Languages size={14} />
          <span>{isAr ? 'English' : 'العربية'}</span>
        </Link>
      </div>
    </header>
  );
};

export default AdminUniversalHeader;
