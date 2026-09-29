'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ZFDrawerShellProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  headerExtra?: React.ReactNode;
  customHeader?: React.ReactNode;
  subheader?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  isAr?: boolean;
  className?: string;
  panelStyle?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  footerStyle?: React.CSSProperties;
  zIndex?: number;
  closeOnBackdropClick?: boolean;
}

export const ZFDrawerShell: React.FC<ZFDrawerShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  headerExtra,
  customHeader,
  subheader,
  children,
  footer,
  maxWidth = '460px',
  isAr = true,
  className = '',
  panelStyle = {},
  bodyStyle = {},
  headerStyle = {},
  footerStyle = {},
  zIndex = 1010,
  closeOnBackdropClick = true,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes zfDrawerOverlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zfDrawerSlideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes zfDrawerSlideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* Dimmed Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.35)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex,
          animation: 'zfDrawerOverlayFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Slide-over Flyout Panel */}
      <div
        role="dialog"
        aria-modal="true"
        dir={isAr ? 'rtl' : 'ltr'}
        className={className}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          ...(isAr
            ? { left: 0, borderRight: '1px solid var(--erp-border, #cbd5e1)', animation: 'zfDrawerSlideInLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1)' }
            : { right: 0, borderLeft: '1px solid var(--erp-border, #cbd5e1)', animation: 'zfDrawerSlideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)' }),
          width: '100%',
          maxWidth: `min(92vw, ${maxWidth})`,
          height: '100vh',
          background: '#ffffff',
          boxShadow: isAr
            ? '10px 0 35px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.05)'
            : '-10px 0 35px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.05)',
          zIndex: zIndex + 1,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden',
          ...panelStyle,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: customHeader or Compact Canonical Header */}
        {customHeader ? (
          customHeader
        ) : (
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--erp-border, #cbd5e1)',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexShrink: 0,
              boxSizing: 'border-box',
              ...headerStyle,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
              {icon && (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--erp-accent-subtle, #eff6ff)',
                    color: 'var(--erp-accent, #2563eb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {title && (
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.3,
                      }}
                    >
                      {title}
                    </h3>
                  )}
                  {headerExtra}
                </div>
                {subtitle && (
                  <div
                    style={{
                      fontSize: '0.74rem',
                      color: '#64748b',
                      marginTop: '2px',
                      lineHeight: 1.35,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {subtitle}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={isAr ? 'إغلاق' : 'Close'}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid transparent',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Optional Subheader (e.g. filter bar or tabs) */}
        {subheader && (
          <div style={{ flexShrink: 0, boxSizing: 'border-box' }}>
            {subheader}
          </div>
        )}

        {/* Scrollable Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            boxSizing: 'border-box',
            ...bodyStyle,
          }}
        >
          {children}
        </div>

        {/* Optional Sticky Footer */}
        {footer && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderTop: '1px solid var(--erp-border, #cbd5e1)',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.65rem',
              flexShrink: 0,
              boxSizing: 'border-box',
              ...footerStyle,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );
};
