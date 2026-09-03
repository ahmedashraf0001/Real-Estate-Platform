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
  RotateCcw, 
  Layers, 
  ArrowUpRight,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { ERPNotification, ERPNotificationSeverity } from '@/lib/erp/types';

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

  const getSeverityIcon = (sev: ERPNotificationSeverity) => {
    switch (sev) {
      case 'critical':
        return <AlertOctagon size={15} color="#ef4444" />;
      case 'warning':
        return <AlertTriangle size={15} color="#f59e0b" />;
      case 'info':
        return <Info size={15} color="#3b82f6" />;
      case 'success':
        return <CheckCircle2 size={15} color="#10b981" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cheque':
        return <Landmark size={15} />;
      case 'approval':
        return <ShieldAlert size={15} />;
      case 'contract':
        return <FileText size={15} />;
      case 'tax':
        return <ShieldCheck size={15} />;
      case 'period':
        return <Layers size={15} />;
      default:
        return <Bell size={15} />;
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
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 998,
          transition: 'opacity 0.2s ease'
        }}
      />

      {/* Slide-over Flyout Panel */}
      <div 
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed',
          top: 0,
          [isAr ? 'left' : 'right']: 0,
          width: '100%',
          maxWidth: '440px',
          height: '100vh',
          background: 'linear-gradient(180deg, rgba(14, 18, 28, 0.99) 0%, rgba(8, 11, 18, 0.99) 100%)',
          borderInlineStart: '1px solid rgba(212, 175, 55, 0.25)',
          boxShadow: '0 0 50px rgba(0, 0, 0, 0.8), -10px 0 30px rgba(0, 0, 0, 0.5)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden',
          animation: 'slideInFlyout 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <style>{`
          @keyframes slideInFlyout {
            from { transform: ${isAr ? 'translateX(-100%)' : 'translateX(100%)'}; }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* Drawer Header */}
        <div style={{
          padding: '1.25rem 1.35rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.08) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d4af37'
            }}>
              <Bell size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                  {isAr ? 'مركز الإشعارات والتنبيهات' : 'Notifications & Alerts'}
                </h3>
                {unreadCount > 0 && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {unreadCount} {isAr ? 'جديد' : 'new'}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {isAr ? 'الرقابة المالية اللحظية ورصد الاستحقاقات' : 'Real-time financial invariant telemetry'}
              </span>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
              borderRadius: '7px',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Filter Segmented Controller */}
        <div style={{
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          gap: '0.35rem',
          background: 'rgba(0, 0, 0, 0.2)',
          flexWrap: 'wrap',
          flexShrink: 0
        }}>
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.32rem 0.65rem',
                  borderRadius: '7px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  border: isActive ? '1px solid rgba(212, 175, 55, 0.35)' : '1px solid transparent',
                  background: isActive ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: isActive ? '#f8fafc' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{isAr ? tab.labelAr : tab.labelEn}</span>
                <span style={{
                  fontSize: '0.62rem',
                  padding: '0.05rem 0.35rem',
                  borderRadius: '4px',
                  background: isActive ? 'rgba(212, 175, 55, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                  color: tab.color || (isActive ? '#ffffff' : '#64748b'),
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Notifications Scrollable List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {filteredNotifications.length === 0 ? (
            /* Empty State: Reassuring Golden Emblem */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              gap: '0.85rem'
            }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                background: 'rgba(212, 175, 55, 0.08)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d4af37',
                boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)'
              }}>
                <ShieldCheck size={28} />
              </div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#ffffff' }}>
                {isAr ? 'المنظومة منضبطة تماماً' : 'All Systems Clear'}
              </h4>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', maxWidth: '280px', lineHeight: 1.5 }}>
                {isAr 
                  ? 'لا توجد استحقاقات متأخرة أو تنبيهات معلقة تتطلب التدخل الفوري في الوقت الحالي.'
                  : 'No overdue cheques, pending authorizations, or invariant alerts require attention right now.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map(item => {
              const isUnread = !item.read;

              return (
                <div
                  key={item.id}
                  style={{
                    background: isUnread 
                      ? 'linear-gradient(145deg, rgba(20, 26, 40, 0.95) 0%, rgba(13, 17, 27, 0.98) 100%)' 
                      : 'rgba(12, 16, 25, 0.65)',
                    border: isUnread 
                      ? (item.severity === 'critical' 
                          ? '1px solid rgba(239, 68, 68, 0.35)' 
                          : '1px solid rgba(212, 175, 55, 0.3)')
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    borderInlineStart: item.severity === 'critical'
                      ? '3.5px solid #ef4444'
                      : (item.severity === 'warning' ? '3.5px solid #f59e0b' : '3.5px solid #3b82f6'),
                    borderRadius: '11px',
                    padding: '0.95rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.55rem',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    boxShadow: isUnread ? '0 4px 16px rgba(0, 0, 0, 0.4)' : 'none'
                  }}
                  onClick={() => {
                    if (isUnread) onMarkRead(item.id);
                  }}
                >
                  {/* Top Line: Category Icon + Title + Severity Pill + Dismiss Button */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: item.severity === 'critical' ? '#f87171' : (item.severity === 'warning' ? '#fcd34d' : '#60a5fa'),
                        flexShrink: 0
                      }}>
                        {getCategoryIcon(item.category)}
                      </div>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: isUnread ? '#ffffff' : '#cbd5e1',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {isAr ? item.titleAr : item.titleEn}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '0.08rem 0.4rem',
                        borderRadius: '4px',
                        background: item.severity === 'critical' 
                          ? 'rgba(239, 68, 68, 0.15)' 
                          : (item.severity === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)'),
                        color: item.severity === 'critical' 
                          ? '#f87171' 
                          : (item.severity === 'warning' ? '#fcd34d' : '#93c5fd'),
                        border: item.severity === 'critical'
                          ? '1px solid rgba(239, 68, 68, 0.3)'
                          : (item.severity === 'warning' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)')
                      }}>
                        {item.severity === 'critical' ? (isAr ? 'عاجل' : 'Critical') : (item.severity === 'warning' ? (isAr ? 'تنبيه' : 'Warning') : (isAr ? 'إشعار' : 'Info'))}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismiss(item.id);
                        }}
                        title={isAr ? 'إخفاء التنبيه' : 'Dismiss'}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '0.2rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                        onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Body Description */}
                  <p style={{
                    margin: 0,
                    fontSize: '0.72rem',
                    color: '#94a3b8',
                    lineHeight: 1.5
                  }}>
                    {isAr ? item.messageAr : item.messageEn}
                  </p>

                  {/* Footer Line: Timestamp + Direct Action Button */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '0.2rem',
                    paddingTop: '0.45rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.64rem', color: '#64748b' }}>
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
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'rgba(212, 175, 55, 0.12)',
                          border: '1px solid rgba(212, 175, 55, 0.35)',
                          color: '#e2c974',
                          padding: '0.22rem 0.55rem',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(212, 175, 55, 0.25)';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(212, 175, 55, 0.12)';
                          e.currentTarget.style.color = '#e2c974';
                        }}
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
          <div style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'transparent',
                border: 'none',
                color: unreadCount > 0 ? '#94a3b8' : '#475569',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: unreadCount > 0 ? 'pointer' : 'default',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={e => {
                if (unreadCount > 0) e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={e => {
                if (unreadCount > 0) e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <CheckCheck size={14} />
              <span>{isAr ? 'تحديد الكل كمقروء' : 'Mark all as read'}</span>
            </button>

            <button
              type="button"
              onClick={onClearAll}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
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
