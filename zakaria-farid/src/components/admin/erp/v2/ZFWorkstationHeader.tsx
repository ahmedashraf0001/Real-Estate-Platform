'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Lock, 
  Unlock, 
  Search, 
  RefreshCw,
  Coins,
  ArrowLeft,
  FileSpreadsheet,
  LogOut,
  Bell,
  BookOpen,
  UserCheck,
  Sun,
  Moon
} from 'lucide-react';
import { ERPAccountingPeriod } from '@/lib/erp/types';
import styles from './ZFWorkstationShell.module.css';

interface ZFWorkstationHeaderProps {
  activePeriod?: ERPAccountingPeriod;
  isAr?: boolean;
  currency: 'EGP' | 'USD';
  onToggleCurrency: () => void;
  onOpenQuickSearch: () => void;
  onRefreshData: () => void;
  onExportExcel?: () => void;
  isMutating?: boolean;
  currentUser?: { email?: string } | null;
  onSignOut?: () => void;
  unreadNotificationsCount?: number;
  hasCriticalAlerts?: boolean;
  onOpenNotifications?: () => void;
  onOpenAcademy?: () => void;
}

export const ZFWorkstationHeader: React.FC<ZFWorkstationHeaderProps> = ({
  activePeriod,
  isAr = true,
  currency,
  onToggleCurrency,
  onOpenQuickSearch,
  onRefreshData,
  onExportExcel,
  isMutating = false,
  currentUser,
  onSignOut,
  unreadNotificationsCount = 0,
  hasCriticalAlerts = false,
  onOpenNotifications,
  onOpenAcademy
}) => {
  const [cairoTime, setCairoTime] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('zf_theme') as 'dark' | 'light' | null;
    const active = saved || (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'light';
    setTheme(active);
    document.documentElement.setAttribute('data-theme', active);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('zf_theme', nextTheme);
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
        timeZone: 'Africa/Cairo',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setCairoTime(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isAr]);

  const isLocked = activePeriod?.status === 'LOCKED' || activePeriod?.status === 'CLOSED';

  return (
    <header className={styles.header}>
      {/* 1. LEFT: Brand Context & Navigation back */}
      <div className={styles.headerBrand}>
        <Link 
          href={`/admin/${isAr ? 'ar' : 'en'}`} 
          className={styles.adminReturnLink}
          title={isAr ? 'العودة إلى لوحة الإدارة العامة' : 'Return to Main Admin'}
        >
          <ArrowLeft size={13} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
          <span>{isAr ? 'لوحة الإدارة' : 'Admin'}</span>
        </Link>

        <div className={styles.brandPill}>
          <div className={styles.brandLogo}>ZF</div>
          <div className={styles.brandText}>
            <div className={styles.brandName}>
              <span>FIN-OS</span>
              <span className={styles.versionTag}>v2.4</span>
            </div>
            <span className={styles.brandSubtext}>
              {isAr ? 'المنظومة المالية والمحاسبية' : 'Financial Operating System'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. CENTER: Focused Omni-Search (⌘K) */}
      <button 
        type="button"
        className={styles.searchAnchor}
        onClick={onOpenQuickSearch}
        title={isAr ? 'بحث سريع في العقود، الأقساط، والقيود المحاسبية (⌘K)' : 'Quick search contracts, dues, ledger... (⌘K)'}
      >
        <div className={styles.searchIconText}>
          <Search size={14} style={{ color: '#64748b' }} />
          <span>
            {isAr ? 'بحث سريع في العقود، الأقساط باليد، والقيود المحاسبية...' : 'Search contracts, dues, journal entries...'}
          </span>
        </div>
        <kbd className={styles.kbd}>⌘K</kbd>
      </button>

      {/* 3. RIGHT: Clean Telemetry & Utilities */}
      <div className={styles.headerRight}>
        {/* Status Telemetry */}
        <div className={styles.telemetryBadge}>
          <span 
            className={styles.liveDot} 
            title={isAr ? 'قاعدة البيانات متصلة بنشاط' : 'PostgreSQL Connected'}
          />

          {activePeriod && (
            <span 
              className={styles.periodBadge}
              title={isLocked 
                ? (isAr ? `الفترة ${activePeriod.fiscal_year}/${activePeriod.period_number} مقفلة ومحمية` : `Period ${activePeriod.fiscal_year}/${activePeriod.period_number} Locked`)
                : (isAr ? `الفترة ${activePeriod.fiscal_year}/${activePeriod.period_number} مفتوحة للقيد` : `Period ${activePeriod.fiscal_year}/${activePeriod.period_number} Open`)}
            >
              {isLocked ? <Lock size={11} color="#8b5cf6" /> : <Unlock size={11} color="#10b981" />}
              <span className={styles.tabularNums}>{activePeriod.fiscal_year}/{activePeriod.period_number}</span>
            </span>
          )}

          <span className={styles.telemetrySep} />

          <span className={styles.clockText} title={isAr ? 'توقيت القاهرة' : 'Cairo Local Time'}>
            {cairoTime || '00:00:00'}
          </span>
        </div>

        {/* Excel Export */}
        {onExportExcel && (
          <button 
            type="button"
            className={styles.utilityBtn}
            onClick={onExportExcel}
            title={isAr ? 'تصدير التقارير المحاسبية إلى Excel' : 'Export Reports to Excel'}
          >
            <FileSpreadsheet size={13} color="#10b981" />
            <span>Excel</span>
          </button>
        )}

        {/* Currency Switcher */}
        <button 
          type="button"
          className={styles.utilityBtn}
          onClick={onToggleCurrency}
          title={isAr ? 'تبديل عملة العرض (جنيه / دولار)' : 'Toggle Currency'}
        >
          <Coins size={12} color="#c5a059" />
          <span>{currency}</span>
        </button>

        {/* Data Refresh */}
        <button 
          type="button"
          className={styles.utilityBtn}
          onClick={onRefreshData}
          disabled={isMutating}
          title={isAr ? 'تحديث البيانات الحية' : 'Refresh Data'}
          style={{ width: '28px', padding: 0 }}
        >
          <RefreshCw size={12} className={isMutating ? 'animate-spin' : ''} />
        </button>

        {/* Notification Bell */}
        {onOpenNotifications && (
          <button
            type="button"
            className={styles.utilityBtn}
            onClick={onOpenNotifications}
            title={isAr ? 'مركز التنبيهات' : 'Notifications'}
            style={{ width: '28px', padding: 0, position: 'relative' }}
          >
            <Bell size={13} color={hasCriticalAlerts ? '#ef4444' : undefined} />
            {unreadNotificationsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: hasCriticalAlerts ? '#ef4444' : '#c5a059',
                color: '#ffffff',
                fontSize: '0.55rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>
        )}

        {/* ERP Academy Trigger */}
        {onOpenAcademy && (
          <button
            type="button"
            className={styles.utilityBtn}
            onClick={onOpenAcademy}
            title={isAr ? 'دليل المنظومة والأكاديمية' : 'Academy & Guide'}
            style={{ width: '28px', padding: 0 }}
          >
            <BookOpen size={13} color="#c5a059" />
          </button>
        )}

        {/* Theme Toggle (Dark / Light) */}
        <button
          type="button"
          className={styles.utilityBtn}
          onClick={toggleTheme}
          title={isAr 
            ? (theme === 'dark' ? 'التبديل إلى النمط الفاتح (Light Mode)' : 'التبديل إلى النمط الداكن (Dark Mode)')
            : (theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode')}
          style={{ width: '28px', padding: 0 }}
        >
          {theme === 'dark' ? (
            <Sun size={13} color="#f59e0b" />
          ) : (
            <Moon size={13} color="#64748b" />
          )}
        </button>

        {/* Authenticated Admin Badge */}
        {currentUser && (
          <div className={styles.userBadge} title={currentUser.email || 'Admin'}>
            <UserCheck size={12} />
            <span className={styles.userEmail}>
              {currentUser.email ? currentUser.email.split('@')[0] : (isAr ? 'مسؤول' : 'Admin')}
            </span>
          </div>
        )}

        {/* Sign Out */}
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className={styles.logoutBtn}
            title={isAr ? 'تسجيل الخروج' : 'Sign Out'}
          >
            <LogOut size={12} />
          </button>
        )}
      </div>
    </header>
  );
};
