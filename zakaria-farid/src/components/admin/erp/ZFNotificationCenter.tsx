'use client';

import React, { useState } from 'react';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Trash2, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Landmark, 
  FileText, 
  ShieldCheck, 
  Layers, 
  ArrowUpRight,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { ERPNotification, ERPNotificationSeverity } from '@/lib/erp/types';
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
  isAr = false
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'cheque' | 'approval'>('all');

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;
  const criticalCount = notifications.filter(n => n.severity === 'critical').length;
  const chequeCount = notifications.filter(n => n.category === 'cheque').length;
  const approvalCount = notifications.filter(n => n.category === 'approval').length;

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'critical') return n.severity === 'critical';
    if (activeFilter === 'cheque') return n.category === 'cheque';
    if (activeFilter === 'approval') return n.category === 'approval';
    return true;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cheque':
        return <Landmark size={14} />;
      case 'approval':
        return <ShieldAlert size={14} />;
      case 'contract':
        return <FileText size={14} />;
      case 'tax':
        return <ShieldCheck size={14} />;
      case 'period':
        return <Layers size={14} />;
      default:
        return <Bell size={14} />;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return isAr ? 'اليوم' : 'Today';
      if (diffDays === 1) return isAr ? 'أمس' : 'Yesterday';
      if (diffDays > 1 && diffDays < 30) return isAr ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {/* Dimmed Backdrop */}
      <div 
        className={styles.backdrop}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Flyout Panel */}
      <div 
        dir={isAr ? 'rtl' : 'ltr'}
        className={`${styles.panel} ${isAr ? styles.panelRtl : styles.panelLtr}`}
        role="dialog"
        aria-label={isAr ? 'مركز الإشعارات والتنبيهات' : 'Notifications & Alerts'}
      >
        {/* Drawer Header */}
        <div className={styles.header}>
          <div className={styles.headerBrand}>
            <div className={styles.bellIconWrap}>
              <Bell size={16} />
            </div>
            <div>
              <div className={styles.headerTitleRow}>
                <h3 className={styles.headerTitle}>
                  {isAr ? 'مركز الإشعارات والتنبيهات' : 'Notifications & Alerts'}
                </h3>
                {unreadCount > 0 && (
                  <span className={styles.unreadBadge}>
                    {unreadCount} {isAr ? 'جديد' : 'new'}
                  </span>
                )}
              </div>
              <span className={styles.headerSubtitle}>
                {isAr ? 'الرقابة المالية اللحظية ورصد الاستحقاقات' : 'Real-time financial invariant telemetry'}
              </span>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className={styles.closeBtn}
            title={isAr ? 'إغلاق' : 'Close'}
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X size={15} />
          </button>
        </div>

        {/* Filter Segmented Controller */}
        <div className={styles.filterBar}>
          {[
            { id: 'all', labelAr: 'الكل', labelEn: 'All', count: notifications.length },
            { id: 'critical', labelAr: 'عاجل وحرج', labelEn: 'Critical', count: criticalCount, color: '#ef4444' },
            { id: 'cheque', labelAr: 'أقساط مستحقة', labelEn: 'Hand Dues', count: chequeCount },
            { id: 'approval', labelAr: 'موافقات', labelEn: 'Approvals', count: approvalCount }
          ].map(tab => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as any)}
                className={`${styles.filterBtn} ${isActive ? styles.filterBtnActive : ''}`}
              >
                <span>{isAr ? tab.labelAr : tab.labelEn}</span>
                <span 
                  className={`${styles.filterCountBadge} ${isActive ? styles.filterCountBadgeActive : ''}`}
                  style={tab.color && !isActive ? { color: tab.color } : undefined}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Notifications Scrollable List */}
        <div className={styles.listContainer}>
          {filteredNotifications.length === 0 ? (
            /* Empty State: Reassuring Golden Emblem */
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
                  : 'No overdue cheques, pending authorizations, or invariant alerts require attention right now.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map(item => {
              const isUnread = !item.read;

              const sevClass = item.severity === 'critical' 
                ? styles.sevCritical 
                : (item.severity === 'warning' 
                    ? styles.sevWarning 
                    : (item.severity === 'success' ? styles.sevSuccess : styles.sevInfo));

              const pillClass = item.severity === 'critical' 
                ? styles.pillCritical 
                : (item.severity === 'warning' 
                    ? styles.pillWarning 
                    : (item.severity === 'success' ? styles.pillSuccess : styles.pillInfo));

              const iconColor = item.severity === 'critical' 
                ? '#ef4444' 
                : (item.severity === 'warning' 
                    ? '#d97706' 
                    : (item.severity === 'success' ? '#10b981' : '#3b82f6'));

              return (
                <div
                  key={item.id}
                  className={`${styles.notifCard} ${isUnread ? styles.cardUnread : styles.cardRead} ${sevClass}`}
                  onClick={() => {
                    if (isUnread) onMarkRead(item.id);
                  }}
                >
                  {/* Top Line: Category Icon + Title + Severity Pill + Dismiss Button */}
                  <div className={styles.cardTopLine}>
                    <div className={styles.categoryGroup}>
                      <div className={styles.categoryIconBox} style={{ color: iconColor }}>
                        {getCategoryIcon(item.category)}
                      </div>
                      <span className={`${styles.cardTitle} ${!isUnread ? styles.cardTitleRead : ''}`}>
                        {isAr ? item.titleAr : item.titleEn}
                      </span>
                    </div>

                    <div className={styles.actionsGroup}>
                      <span className={pillClass}>
                        {item.severity === 'critical' 
                          ? (isAr ? 'عاجل' : 'Critical') 
                          : (item.severity === 'warning' 
                              ? (isAr ? 'تنبيه' : 'Warning') 
                              : (item.severity === 'success' ? (isAr ? 'مكتمل' : 'Success') : (isAr ? 'إشعار' : 'Info')))}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismiss(item.id);
                        }}
                        title={isAr ? 'إخفاء التنبيه' : 'Dismiss'}
                        className={styles.dismissBtn}
                        aria-label={isAr ? 'إخفاء التنبيه' : 'Dismiss'}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Body Description */}
                  <p className={styles.cardMessage}>
                    {isAr ? item.messageAr : item.messageEn}
                  </p>

                  {/* Footer Line: Timestamp + Direct Action Button */}
                  <div className={styles.cardBottomLine}>
                    <div className={styles.timeInfo}>
                      <Clock size={11} />
                      <span>{formatRelativeTime(item.createdAt)}</span>
                    </div>

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
                        <span>{isAr ? (item.actionLabelAr || 'اتخاذ إجراء') : (item.actionLabelEn || 'Take Action')}</span>
                        <ArrowUpRight size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer Actions */}
        {notifications.length > 0 && (
          <div className={styles.footer}>
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
              className={styles.markAllBtn}
            >
              <CheckCheck size={14} />
              <span>{isAr ? 'تحديد الكل كمقروء' : 'Mark all as read'}</span>
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
        )}
      </div>
    </>
  );
};
