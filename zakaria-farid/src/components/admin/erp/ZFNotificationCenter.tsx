'use client';

import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Trash2, 
  Landmark, 
  FileText, 
  ShieldCheck, 
  Layers, 
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Clock,
  HardHat,
  Receipt,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { ERPNotification } from '@/lib/erp/types';
import { 
  NotificationTabGroup, 
  filterNotificationsByTab 
} from '@/lib/erp/notificationEngine';
import { ZFDrawerShell } from './v2/common/ZFDrawerShell';
import styles from './ZFNotificationCenter.module.css';

interface ZFNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: ERPNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onNavigateAction: (targetModule: string, metadata?: Record<string, any>) => void;
  isAr?: boolean;
}

export const ZFNotificationCenter: React.FC<ZFNotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onClearAll,
  onNavigateAction,
  isAr = true
}) => {
  const [activeFilter, setActiveFilter] = useState<NotificationTabGroup>('all');

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // Tab counts matching media_1790179689349.png
  const tabCounts = useMemo(() => {
    return {
      all: notifications.length,
      alerts: notifications.filter(n => n.severity === 'critical' || n.category === 'approval' || n.category === 'tax').length,
      transactions: notifications.filter(n => n.category === 'expense' || n.category === 'transaction').length,
      schedules: notifications.filter(n => n.category === 'cheque' || n.category === 'contractor' || n.category === 'contract').length,
      system: notifications.filter(n => n.category === 'system' || n.category === 'period').length,
    };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return filterNotificationsByTab(notifications, activeFilter);
  }, [notifications, activeFilter]);

  if (!isOpen) return null;

  const getCategoryIcon = (category: string, severity: string) => {
    switch (category) {
      case 'contractor':
        return <HardHat size={16} />;
      case 'expense':
        return <Receipt size={16} />;
      case 'cheque':
        return <Landmark size={16} />;
      case 'approval':
        return <ShieldAlert size={16} />;
      case 'contract':
        return <FileText size={16} />;
      case 'tax':
        return <ShieldCheck size={16} />;
      case 'period':
        return <Layers size={16} />;
      default:
        if (severity === 'critical') return <AlertCircle size={16} />;
        if (severity === 'warning') return <AlertTriangle size={16} />;
        return <Bell size={16} />;
    }
  };

  const getCategoryIconClass = (category: string, severity: string) => {
    if (severity === 'critical') return styles.iconCritical;
    if (severity === 'warning') return styles.iconWarning;
    if (category === 'contractor') return styles.iconWarning;
    if (category === 'expense' || category === 'cheque') return styles.iconAccent;
    if (severity === 'success') return styles.iconSuccess;
    return styles.iconNeutral;
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return isAr ? 'الآن' : 'Just now';
      if (diffMins < 60) return isAr ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
      if (diffHours < 24) return isAr ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
      if (diffDays === 1) return isAr ? 'أمس' : 'Yesterday';
      if (diffDays > 1 && diffDays < 30) return isAr ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const tabsConfig: Array<{ id: NotificationTabGroup; labelAr: string; labelEn: string; count: number }> = [
    { id: 'all', labelAr: 'الكل', labelEn: 'All', count: tabCounts.all },
    { id: 'alerts', labelAr: 'تنبيهات', labelEn: 'Alerts', count: tabCounts.alerts },
    { id: 'transactions', labelAr: 'معاملات', labelEn: 'Transactions', count: tabCounts.transactions },
    { id: 'schedules', labelAr: 'مواعيد', labelEn: 'Schedules', count: tabCounts.schedules },
    { id: 'system', labelAr: 'النظام', labelEn: 'System', count: tabCounts.system },
  ];

  return (
    <ZFDrawerShell
      isOpen={isOpen}
      onClose={onClose}
      isAr={isAr}
      customHeader={
        <div className={styles.headerContainer}>
          <div className={styles.headerLeading}>
            <div className={styles.bellIconBox}>
              <Bell size={18} strokeWidth={2} />
            </div>
            <div className={styles.headerTextGroup}>
              <div className={styles.headerTitleRow}>
                <h3 className={styles.headerTitle}>
                  {isAr ? 'مركز الإشعارات' : 'Notification Center'}
                </h3>
                {unreadCount > 0 && (
                  <span className={styles.unreadBadge}>
                    {unreadCount} {isAr ? 'جديد' : 'new'}
                  </span>
                )}
              </div>
              <span className={styles.headerSubtitle}>
                {isAr ? 'الرقابة المالية والتشغيلية اللحظية' : 'Real-time operational & financial telemetry'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            className={styles.closeBtn}
          >
            <X size={17} />
          </button>
        </div>
      }
      subheader={
        <div className={styles.filterBar} role="tablist">
          {tabsConfig.map(tab => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(tab.id)}
                className={`${styles.filterBtn} ${isActive ? styles.filterBtnActive : ''}`}
              >
                <span>{isAr ? tab.labelAr : tab.labelEn}</span>
                <span className={`${styles.filterCountBadge} ${isActive ? styles.filterCountBadgeActive : ''}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      }
      footer={
        notifications.length > 0 ? (
          <div className={styles.footerContainer}>
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
              className={styles.markAllBtn}
            >
              <CheckCheck size={14} />
              <span>{isAr ? 'تحديد الكل كمقروء' : 'Mark all read'}</span>
            </button>

            <button
              type="button"
              onClick={onClearAll}
              className={styles.clearAllBtn}
            >
              <Trash2 size={13} />
              <span>{isAr ? 'مسح الكل' : 'Clear all'}</span>
            </button>
          </div>
        ) : undefined
      }
    >
      {/* Notifications Scrollable List */}
      <div className={styles.listContainer}>
        {filteredNotifications.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrap}>
              <ShieldCheck size={28} />
            </div>
            <h4 className={styles.emptyTitle}>
              {isAr ? 'المنظومة منضبطة تماماً' : 'All Systems Clear'}
            </h4>
            <p className={styles.emptyDesc}>
              {isAr 
                ? 'لا توجد استحقاقات متأخرة أو تنبيهات معلقة تتطلب التدخل الفوري في الوقت الحالي.'
                : 'No overdue dues, pending approvals, or invariant alerts require attention right now.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map(item => {
            const isUnread = !item.read;

            let cardUnreadClass = styles.cardUnread;
            let unreadDotClass = styles.unreadDot;
            if (item.severity === 'critical') {
              cardUnreadClass = styles.cardUnreadCritical;
              unreadDotClass = styles.unreadDotCritical;
            } else if (item.severity === 'warning') {
              cardUnreadClass = styles.cardUnreadWarning;
              unreadDotClass = styles.unreadDotWarning;
            }

            let pillClass = styles.pillNeutral;
            let pillText = isAr ? 'إشعار' : 'Info';
            if (item.severity === 'critical') {
              pillClass = styles.pillRed;
              pillText = isAr ? 'عاجل وحرج' : 'Critical';
            } else if (item.severity === 'warning') {
              pillClass = styles.pillAmber;
              pillText = isAr ? 'استحقاق' : 'Warning';
            } else if (item.category === 'expense' || item.category === 'transaction') {
              pillClass = styles.pillBlue;
              pillText = isAr ? 'معاملة' : 'Transaction';
            } else if (item.severity === 'success') {
              pillClass = styles.pillGreen;
              pillText = isAr ? 'مكتمل' : 'Success';
            }

            const iconClass = getCategoryIconClass(item.category, item.severity);

            return (
              <div
                key={item.id}
                className={`${styles.notifCard} ${isUnread ? cardUnreadClass : styles.cardRead}`}
                onClick={() => {
                  if (isUnread) onMarkRead(item.id);
                }}
                tabIndex={0}
                role="button"
              >
                {/* Top Line: Category Icon + Title + Unread Dot + Time + Dismiss */}
                <div className={styles.cardTopLine}>
                  <div className={styles.categoryGroup}>
                    <div className={`${styles.categoryIconBox} ${iconClass}`}>
                      {getCategoryIcon(item.category, item.severity)}
                    </div>
                    <div className={styles.cardTitleWrapper}>
                      <span className={`${styles.cardTitle} ${!isUnread ? styles.cardTitleRead : ''}`}>
                        {isAr ? item.titleAr : item.titleEn}
                      </span>
                      {isUnread && <span className={unreadDotClass} />}
                    </div>
                  </div>

                  <div className={styles.topTrailingGroup}>
                    <div className={styles.timeInfo}>
                      <Clock size={11} />
                      <span>{formatRelativeTime(item.createdAt)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(item.id);
                      }}
                      title={isAr ? 'إخفاء الإشعار' : 'Dismiss'}
                      className={styles.dismissBtn}
                      aria-label={isAr ? 'إخفاء الإشعار' : 'Dismiss'}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Body Message */}
                <p className={styles.cardMessage}>
                  {isAr ? item.messageAr : item.messageEn}
                </p>

                {/* Bottom Line: Category/Severity Pill + Quick Action */}
                <div className={styles.cardBottomLine}>
                  <span className={`${styles.statusPill} ${pillClass}`}>
                    {pillText}
                  </span>

                  {item.targetModule && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkRead(item.id);
                        onNavigateAction(item.targetModule!, item.metadata);
                        onClose();
                      }}
                      className={styles.takeActionBtn}
                    >
                      <span>{isAr ? (item.actionLabelAr || 'اتخاذ إجراء') : (item.actionLabelEn || 'Take action')}</span>
                      {isAr ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </ZFDrawerShell>
  );
};

export default ZFNotificationCenter;
