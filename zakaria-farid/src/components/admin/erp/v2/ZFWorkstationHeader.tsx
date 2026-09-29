'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { 
  Home, 
  Bell, 
  Menu,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { ERPAccountingPeriod } from '@/lib/erp/types';
import styles from './ZFWorkstationShell.module.css';
import { ZFPaletteCustomizer } from './common/ZFPaletteCustomizer';

export interface ZFWorkstationHeaderProps {
  activePeriod?: ERPAccountingPeriod;
  isAr?: boolean;
  currency?: 'EGP' | 'USD';
  onToggleCurrency?: () => void;
  onOpenQuickSearch?: () => void;
  onRefreshData?: () => void;
  onExportExcel?: () => void;
  isMutating?: boolean;
  realtimeStatus?: 'connected' | 'syncing' | 'reconnecting' | 'disconnected';
  lastSyncTime?: Date | null;
  currentUser?: { email?: string } | null;
  onSignOut?: () => void;
  unreadNotificationsCount?: number;
  hasCriticalAlerts?: boolean;
  onOpenNotifications?: () => void;
  onOpenAcademy?: () => void;
  isDockCollapsed?: boolean;
  onToggleDock?: () => void;
  onToggleMobileDock?: () => void;
  moduleTitle?: string;
  onOpenMessages?: () => void;
}

export const ZFWorkstationHeader: React.FC<ZFWorkstationHeaderProps> = ({
  isAr = true,
  unreadNotificationsCount = 0,
  hasCriticalAlerts = false,
  onOpenNotifications,
  onToggleDock,
  onToggleMobileDock,
  moduleTitle,
  onOpenMessages,
}) => {
  const pageTitle = moduleTitle || (isAr ? 'لوحة القيادة والعمليات المالية' : 'Executive Cockpit & Financial Operations');

  const currentDateFormatted = useMemo(() => {
    try {
      const now = new Date();
      return now.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return isAr ? '١٦ سبتمبر ٢٠٢٦' : 'Sep 16, 2026';
    }
  }, [isAr]);

  const handleMessagesClick = () => {
    if (onOpenMessages) {
      onOpenMessages();
    } else {
      toast.info(
        isAr 
          ? 'مركز المحادثات: لا توجد رسائل أو استفسارات غير مقروءة حالياً'
          : 'Communication Desk: No unread messages or active client chats'
      );
    }
  };

  return (
    <header className={styles.header} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Leading edge: Mobile toggle + Home icon + Slash + Breadcrumb page title */}
      <div className={styles.headerLeft}>
        {(onToggleMobileDock || onToggleDock) && (
          <button
            type="button"
            className={styles.mobileMenuBtn}
            onClick={onToggleMobileDock || onToggleDock}
            aria-label={isAr ? 'فتح القائمة' : 'Toggle Menu'}
          >
            <Menu size={18} />
          </button>
        )}

        <div className={styles.breadcrumbBox}>
          <Link
            href={`/fin-os/${isAr ? 'ar' : 'en'}`}
            className={styles.homeLink}
            title={isAr ? 'لوحة القيادة المالية' : 'Executive Cockpit'}
          >
            <Home size={17} strokeWidth={1.8} />
          </Link>
          <span className={styles.breadcrumbDivider}>/</span>
          <h1 className={styles.headerTitle}>
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* 2. Trailing edge: Date telemetry + Divider + Palette + Bell + Chat (matching media_1789555039362.png) */}
      <div className={styles.headerRight}>
        <div className={styles.headerDateBox}>
          <span className={styles.headerDateText}>{currentDateFormatted}</span>
        </div>

        <div className={styles.headerDivider} />

        {/* FIN-OS Curated Accent Palette Customizer */}
        <ZFPaletteCustomizer isAr={isAr} />

        {/* Notifications Icon Button */}
        <button
          type="button"
          className={styles.topIconBtn}
          onClick={onOpenNotifications}
          title={isAr ? 'مركز الإشعارات والتنبيهات' : 'Notifications'}
          aria-label={isAr ? 'الإشعارات' : 'Notifications'}
        >
          <Bell size={19} strokeWidth={1.75} />
          {unreadNotificationsCount > 0 && (
            <span
              className={styles.topBellBadge}
              style={{
                background: hasCriticalAlerts ? '#dc2626' : 'var(--erp-accent, #2563eb)',
              }}
            >
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Messages / Communication Desk Icon Button (media_1789555039362.png) */}
        <button
          type="button"
          className={styles.topIconBtn}
          onClick={handleMessagesClick}
          title={isAr ? 'مركز المحادثات والرسائل' : 'Messages & Chat'}
          aria-label={isAr ? 'المحادثات' : 'Messages'}
        >
          <MessageSquare size={18} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
};

export default ZFWorkstationHeader;
