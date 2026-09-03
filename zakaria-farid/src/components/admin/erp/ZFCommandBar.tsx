'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Lock, 
  Unlock, 
  Search, 
  Maximize2, 
  Minimize2, 
  RefreshCw,
  Coins,
  ArrowLeft,
  FileSpreadsheet,
  ShieldCheck,
  LogOut,
  Bell,
  BookOpen
} from 'lucide-react';
import { ERPAccountingPeriod } from '@/lib/erp/types';
import styles from './ZFSubprogram.module.css';

interface ZFCommandBarProps {
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

export const ZFCommandBar: React.FC<ZFCommandBarProps> = ({
  activePeriod,
  isAr = false,
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
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isLocked = activePeriod?.status === 'LOCKED' || activePeriod?.status === 'CLOSED';

  return (
    <header className={styles.commandBar} data-tour="command-bar">
      {/* 1. LEFT: Brand & Context */}
      <div className={styles.brandArea}>
        <Link 
          href={`/admin/${isAr ? 'ar' : 'en'}`} 
          className={styles.adminHomeLink}
          title={isAr ? 'العودة إلى لوحة الإدارة الرئيسية' : 'Return to Admin Dashboard'}
        >
          <ArrowLeft size={13} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
          <span>{isAr ? 'لوحة الإدارة' : 'Admin'}</span>
        </Link>

        <div className={styles.brandBadge}>
          <div className={styles.brandLogo}>ZF</div>
          <div className={styles.brandInfo}>
            <div className={styles.brandTitle}>
              <span>FIN-OS</span>
              <span className={styles.versionBadge}>v2.4</span>
            </div>
            <span className={styles.brandSubtitle}>
              {isAr ? 'المنظومة المالية والمحاسبية' : 'Financial Operating System'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. CENTER: Global Command Palette Anchor (Linear / Spotlight style) */}
      <div className={styles.commandCenter}>
        <button 
          type="button"
          className={styles.omniSearchBar}
          onClick={onOpenQuickSearch}
          title={isAr ? 'بحث سريع في العقود، الأقساط والقيود والأوامر المالية (⌘K)' : 'Search contracts, dues, ledger, or actions... (⌘K)'}
        >
          <div className={styles.searchInnerLeft}>
            <Search size={14} className={styles.searchIcon} />
            <span className={styles.searchPlaceholder}>
              {isAr ? 'بحث سريع في العقود، الأقساط باليد، القيود والأوامر المالية...' : 'Search contracts, hand dues, ledger entries, or commands...'}
            </span>
          </div>
          <kbd className={styles.kbdKey}>⌘K</kbd>
        </button>
      </div>

      {/* 3. RIGHT: Telemetry Capsule + Utility Actions + Admin Session */}
      <div className={styles.commandActions}>
        {/* Unified Telemetry Capsule (Period + Live Pulse + Cairo Clock) */}
        <div className={styles.telemetryCapsule}>
          <span 
            className={styles.pulseDot} 
            title={isAr ? 'متصل بقاعدة البيانات مباشرة (PostgreSQL Live)' : 'Live PostgreSQL Connected'} 
          />
          
          {activePeriod && (
            <span 
              className={styles.telemetryPeriod} 
              title={isLocked 
                ? (isAr ? `الفترة ${activePeriod.fiscal_year}/${activePeriod.period_number}: مقيدة ومحمية` : `Period ${activePeriod.fiscal_year}/${activePeriod.period_number}: Locked`) 
                : (isAr ? `الفترة ${activePeriod.fiscal_year}/${activePeriod.period_number}: مفتوحة للقيد` : `Period ${activePeriod.fiscal_year}/${activePeriod.period_number}: Open`)}
            >
              {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
              <span>{activePeriod.fiscal_year}/{activePeriod.period_number}</span>
            </span>
          )}

          <span className={styles.telemetryDivider} />

          <span 
            className={styles.telemetryClock} 
            title={isAr ? 'توقيت القاهرة (EGY)' : 'Cairo Local Time'}
          >
            {cairoTime || '00:00:00'}
          </span>
        </div>

        {/* Segmented Utility Cluster */}
        <div className={styles.utilityCluster}>
          {/* Excel Export Button */}
          {onExportExcel && (
            <button 
              type="button"
              onClick={onExportExcel}
              title={isAr ? 'تصدير تقارير المحاسبة إلى Excel بالعربي' : 'Export Comprehensive Excel Reports'}
              className={styles.excelExportBtn}
            >
              <FileSpreadsheet size={13} />
              <span>Excel</span>
            </button>
          )}

          {/* Currency Toggle */}
          <button 
            type="button"
            className={styles.clusterBtn} 
            onClick={onToggleCurrency} 
            title={isAr ? 'تبديل عملة العرض (جنيه / دولار)' : 'Toggle Currency (EGP/USD)'}
          >
            <Coins size={12} color="var(--zf-gold, #d4af37)" />
            <span>{currency}</span>
          </button>

          {/* Live Refresh Button */}
          <button 
            type="button"
            className={styles.clusterBtnIcon} 
            onClick={onRefreshData} 
            disabled={isMutating} 
            title={isAr ? 'تحديث البيانات الحية' : 'Refresh Live Dataset'}
          >
            <RefreshCw size={13} className={isMutating ? 'animate-spin' : ''} />
          </button>

          {/* Notification Center Bell Trigger */}
          {onOpenNotifications && (
            <button
              type="button"
              className={styles.clusterBtnIcon}
              onClick={onOpenNotifications}
              title={isAr ? 'مركز الإشعارات والتنبيهات المالية' : 'Notification & Alert Center'}
              style={{ position: 'relative' }}
            >
              <Bell size={13} color={hasCriticalAlerts ? '#f87171' : (unreadNotificationsCount > 0 ? '#e2c974' : undefined)} />
              {unreadNotificationsCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  [isAr ? 'left' : 'right']: '-3px',
                  width: '13px',
                  height: '13px',
                  borderRadius: '50%',
                  background: hasCriticalAlerts ? '#ef4444' : '#d4af37',
                  color: hasCriticalAlerts ? '#ffffff' : '#000000',
                  fontSize: '0.56rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: hasCriticalAlerts ? '0 0 8px #ef4444' : '0 0 6px rgba(212, 175, 55, 0.6)',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* ERP Academy & Tutorial Trigger */}
          {onOpenAcademy && (
            <button
              type="button"
              className={styles.clusterBtnIcon}
              onClick={onOpenAcademy}
              title={isAr ? 'دليل المنظومة وجولة التدريب (ERP Academy & Tour)' : 'ERP Academy & Tutorial Guide'}
              style={{ color: '#e2c974' }}
            >
              <BookOpen size={13} />
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button 
            type="button"
            className={styles.clusterBtnIcon} 
            onClick={toggleFullscreen} 
            title={isFullscreen ? (isAr ? 'إنهاء ملء الشاشة' : 'Exit Fullscreen') : (isAr ? 'ملء الشاشة' : 'Fullscreen')}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>

        {/* Authenticated Admin Badge & Sign Out */}
        {currentUser && (
          <div className={styles.userProfileCluster}>
            <div 
              className={styles.userBadge} 
              title={currentUser.email || 'Authenticated Admin'}
            >
              <div className={styles.userAvatar}>
                <ShieldCheck size={12} />
              </div>
              <span className={styles.userEmail}>
                {currentUser.email ? currentUser.email.split('@')[0] : (isAr ? 'مسؤول معتمد' : 'Admin')}
              </span>
            </div>

            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                title={isAr ? 'تسجيل الخروج وإنهاء الجلسة' : 'Sign Out'}
                className={styles.signOutBtn}
              >
                <LogOut size={12} />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
