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
  FileSpreadsheet
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
}

export const ZFCommandBar: React.FC<ZFCommandBarProps> = ({
  activePeriod,
  isAr = false,
  currency,
  onToggleCurrency,
  onOpenQuickSearch,
  onRefreshData,
  onExportExcel,
  isMutating = false
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
    <header className={styles.commandBar}>
      {/* Brand & Subprogram Identifier */}
      <div className={styles.brandArea}>
        <Link 
          href={`/admin/${isAr ? 'ar' : 'en'}`} 
          className={styles.exitAdminBtn}
          title={isAr ? 'العودة إلى لوحة الإدارة الرئيسية' : 'Return to Admin Dashboard'}
        >
          <ArrowLeft size={14} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
          <span>{isAr ? 'لوحة الإدارة' : 'Admin'}</span>
        </Link>
        <div className={styles.brandLogo}>ZF</div>
        <div className={styles.brandText}>
          <div className={styles.brandTitle}>
            <span>{isAr ? 'نظام زكريا فريد للمالية التنفيذية' : 'ZF Financial Studio'}</span>
            <span className={styles.osBadge}>FIN-OS v2.4</span>
          </div>
          <span className={styles.brandSub}>
            {isAr ? 'منظومة المحاسبة العقارية المتكاملة ومطابقة المعايير' : 'Enterprise Real Estate Financial Operating System'}
          </span>
        </div>
      </div>

      {/* Central Telemetry: Period Status + Cairo Clock + Realtime Engine */}
      <div className={styles.commandCenter}>
        {/* Accounting Period Status Pill */}
        {activePeriod && (
          <div 
            className={styles.statusPill}
            style={{
              borderColor: isLocked ? 'rgba(185, 140, 255, 0.4)' : 'rgba(79, 209, 197, 0.4)',
              background: isLocked ? 'rgba(185, 140, 255, 0.08)' : 'rgba(79, 209, 197, 0.08)',
              color: isLocked ? '#b98cff' : '#4fd1c5'
            }}
          >
            {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
            <span>
              {isAr 
                ? `الفترة ${activePeriod.fiscal_year}/${activePeriod.period_number}: ${isLocked ? 'مقيدة ومحمية' : 'مفتوحة للقيد'}`
                : `Period ${activePeriod.period_number}/${activePeriod.fiscal_year}: ${activePeriod.status}`}
            </span>
          </div>
        )}

        {/* Cairo Time Clock */}
        <div className={styles.statusPill}>
          <span style={{ color: 'var(--zf-text-muted, #6b7086)', fontSize: '0.7rem' }}>
            {isAr ? 'توقيت القاهرة:' : 'Cairo (EGY):'}
          </span>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--zf-gold, #d4af37)', letterSpacing: '0.05em' }}>
            {cairoTime || '00:00:00'}
          </span>
        </div>

        {/* Realtime PostgreSQL Pulse */}
        <div className={styles.statusPill}>
          <span className={styles.pulseDot} />
          <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
            {isAr ? 'متصل بقاعدة البيانات' : 'Supabase Live'}
          </span>
        </div>
      </div>

      {/* Action Triggers: Quick Search, Currency Toggle, Refresh, Fullscreen */}
      <div className={styles.commandActions}>
        {/* Quick Search Palette Trigger (⌘K) */}
        <button className={styles.searchTrigger} onClick={onOpenQuickSearch} title="Open Command Palette (Ctrl+K)">
          <Search size={14} />
          <span>{isAr ? 'بحث سريع وأوامر...' : 'Quick Action...'}</span>
          <span className={styles.kbdKey}>⌘K</span>
        </button>

        {/* Arabic Excel Export */}
        {onExportExcel && (
          <button 
            onClick={onExportExcel}
            title={isAr ? 'تصدير تقارير Excel بالعربي' : 'Export Comprehensive Excel'}
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '8px',
              padding: '0 0.75rem',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)'
            }}
          >
            <FileSpreadsheet size={14} />
            <span>{isAr ? 'تصدير Excel' : 'Export Excel'}</span>
          </button>
        )}

        {/* Dual Currency Switcher */}
        <button 
          className={styles.utilBtn} 
          onClick={onToggleCurrency} 
          title={isAr ? 'تبديل العملة (جنيه / دولار)' : 'Toggle Display Currency (EGP/USD)'}
          style={{ width: 'auto', padding: '0 0.6rem', gap: '0.35rem', fontWeight: 800, fontSize: '0.75rem' }}
        >
          <Coins size={13} color="var(--zf-gold, #d4af37)" />
          <span>{currency}</span>
        </button>

        {/* Live Refresh Button */}
        <button 
          className={styles.utilBtn} 
          onClick={onRefreshData} 
          disabled={isMutating} 
          title={isAr ? 'تحديث البيانات الحية' : 'Refresh Live Dataset'}
        >
          <RefreshCw size={14} className={isMutating ? 'animate-spin' : ''} />
        </button>

        {/* Fullscreen Workstation Toggle */}
        <button 
          className={styles.utilBtn} 
          onClick={toggleFullscreen} 
          title={isAr ? 'شاشة كاملة' : 'Toggle Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
    </header>
  );
};
