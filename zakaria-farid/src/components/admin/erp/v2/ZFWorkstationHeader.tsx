'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Lock, 
  Unlock, 
  Search, 
  RefreshCw,
  ArrowLeft, 
  FileSpreadsheet, 
  LogOut, 
  Bell, 
  BookOpen, 
  UserCheck, 
  Sun, 
  Moon, 
  PanelLeftClose, 
  PanelLeftOpen
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { ERPAccountingPeriod } from '@/lib/erp/types';
import styles from './ZFWorkstationShell.module.css';

interface ZFWorkstationHeaderProps {
  activePeriod?: ERPAccountingPeriod;
  isAr?: boolean;
  currency?: 'EGP' | 'USD';
  onToggleCurrency?: () => void;
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
  isDockCollapsed?: boolean;
  onToggleDock?: () => void;
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
  onOpenAcademy,
  isDockCollapsed = false,
  onToggleDock
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
      {/* 1. LEFT: Brand Context & Navigation Back */}
      <div className={styles.headerBrand}>
        {onToggleDock && (
          <button
            type="button"
            className={styles.dockToggleBtn}
            onClick={onToggleDock}
            title={isDockCollapsed 
              ? (isAr ? 'توسيع القائمة الجانبية (شريط الأدوات)' : 'Expand Navigation Dock')
              : (isAr ? 'طي القائمة الجانبية (مساحة عمل واسعة)' : 'Collapse Navigation Dock')}
          >
            {isDockCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        )}

        <Link 
          href={`/admin/${isAr ? 'ar' : 'en'}`} 
          className={styles.adminReturnLink}
          title={isAr ? 'العودة إلى لوحة القيادة التنفيذية' : 'Return to Executive Dashboard'}
        >
          <ArrowLeft size={13} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
          <span>{isAr ? 'لوحة الإدارة' : 'Admin'}</span>
        </Link>

        {/* Official Al Zakaria Brand Logo from Main Website */}
        <div className={styles.brandLockup}>
          <Link 
            href={`/admin/${isAr ? 'ar' : 'en'}`} 
            className={styles.brandLink}
            title={isAr ? 'آل زكريا للعقارات الفاخرة' : 'Al Zakaria Luxury Estates'}
          >
            <BrandLogo size="sm" locale={isAr ? 'ar' : 'en'} />
          </Link>

          <span className={styles.brandDivider} />

          <div 
            className={styles.erpBadge} 
            title={isAr ? 'المنظومة المالية والمحاسبية FIN-OS الإصدار 2.4' : 'FIN-OS Financial Operating System v2.4'}
          >
            <span className={styles.erpLiveDot} />
            <span className={styles.erpBadgeText}>FIN-OS</span>
            <span className={styles.erpBadgeVersion}>v2.4</span>
          </div>
        </div>
      </div>

      {/* 2. CENTER: Focused Omni-Search (⌘K) */}
      <button 
        type="button"
        className={styles.searchAnchor}
        onClick={onOpenQuickSearch}
        title={isAr ? 'بحث سريع في العقود، الأقساط، وحركة الخزنة (⌘K)' : 'Quick search contracts, dues, ledger... (⌘K)'}
      >
        <div className={styles.searchIconText}>
          <Search size={14} style={{ color: '#64748b' }} />
          <span>
            {isAr ? 'دوّر في العقود، الأقساط، أو حركة الخزنة...' : 'Search contracts, dues, journal entries...'}
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
                ? (isAr ? `الفترة ${activePeriod.fiscal_year}/${activePeriod.period_number} مقفولة ومحمية` : `Period ${activePeriod.fiscal_year}/${activePeriod.period_number} Locked`)
                : (isAr ? `الفترة ${activePeriod.fiscal_year}/${activePeriod.period_number} مفتوحة لتسجيل العمليات` : `Period ${activePeriod.fiscal_year}/${activePeriod.period_number} Open`)}
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

        {/* Executive Excel Export Button */}
        {onExportExcel && (
          <button 
            type="button"
            className={styles.excelExportBtn}
            onClick={onExportExcel}
            title={isAr ? 'تنزيل تقرير إكسيل بكل الحسابات (.xlsx)' : 'Export Accounting Ledger & Reports to Excel (.xlsx)'}
          >
            <div className={styles.excelIconBox}>
              <FileSpreadsheet size={15} strokeWidth={2.2} />
            </div>
            <span className={styles.excelExportText}>
              {isAr ? 'تصدير التقارير' : 'Export Reports'}
            </span>
            <span className={styles.excelFormatPill}>XLSX</span>
          </button>
        )}

        {/* Data Refresh */}
        <button 
          type="button"
          className={styles.utilityBtn}
          onClick={onRefreshData}
          disabled={isMutating}
          title={isAr ? 'تحديث البيانات' : 'Refresh Data'}
        >
          <RefreshCw size={13} className={isMutating ? 'animate-spin' : ''} />
        </button>

        {/* Notification Bell */}
        {onOpenNotifications && (
          <button
            type="button"
            className={styles.utilityBtn}
            onClick={onOpenNotifications}
            title={isAr ? 'مركز التنبيهات والإشعارات' : 'Notification Center'}
            style={{ position: 'relative' }}
          >
            <Bell size={14} color={hasCriticalAlerts ? '#ef4444' : undefined} />
            {unreadNotificationsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '13px',
                height: '13px',
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
            title={isAr ? 'دليل واستخدام النظام' : 'Academy & Guide'}
          >
            <BookOpen size={14} color="#946f23" />
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
        >
          {theme === 'dark' ? (
            <Sun size={14} color="#f59e0b" />
          ) : (
            <Moon size={14} color="#64748b" />
          )}
        </button>

        {/* Authenticated Admin Badge */}
        {currentUser && (
          <div className={styles.userBadge} title={currentUser.email || 'Admin'}>
            <UserCheck size={13} color="#059669" />
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
            <LogOut size={13} />
          </button>
        )}
      </div>
    </header>
  );
};
