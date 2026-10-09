'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ZFModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  isAr?: boolean;
  className?: string;
  cardStyle?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  footerStyle?: React.CSSProperties;
  closeOnBackdropClick?: boolean;
  zIndex?: number;
}

export const ZFModalShell: React.FC<ZFModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  headerExtra,
  children,
  footer,
  maxWidth = '680px',
  maxHeight = '90vh',
  isAr = true,
  className = '',
  cardStyle = {},
  bodyStyle = {},
  headerStyle = {},
  footerStyle = {},
  closeOnBackdropClick = true,
  zIndex = 1000,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // Escape while typing leaves the field (and closes its suggestions) instead of discarding the form.
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        target.blur();
        return;
      }
      onClose();
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
  if (typeof window !== 'undefined' && !mounted) return null;

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        zIndex,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        boxSizing: 'border-box',
        animation: 'zfModalOverlayFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <style>{`
        @keyframes zfModalOverlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zfModalCardScaleIn {
          from { opacity: 0; transform: scale(0.97) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div
        className={className}
        style={{
          width: '100%',
          maxWidth: `min(94vw, ${maxWidth})`,
          maxHeight,
          background: '#ffffff',
          border: '1px solid var(--erp-card-border, #e2e8f0)',
          borderRadius: '12px',
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.22)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
          animation: 'zfModalCardScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          ...cardStyle,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Canonical Header */}
        <div
          style={{
            padding: '0.95rem 1.25rem',
            borderBottom: '1px solid var(--erp-border-subtle, #f1f5f9)',
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
                <h3
                  style={{
                    margin: 0,
                    fontSize: '0.98rem',
                    fontWeight: 700,
                    color: 'var(--erp-text-title, #0f172a)',
                    lineHeight: 1.3,
                  }}
                >
                  {title}
                </h3>
                {headerExtra}
              </div>
              {subtitle && (
                <div
                  style={{
                    fontSize: '0.74rem',
                    color: '#64748b',
                    marginTop: '2px',
                    lineHeight: 1.35,
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
              width: '32px',
              height: '32px',
              borderRadius: '7px',
              border: 'none',
              background: 'transparent',
              color: 'var(--erp-text-muted, #64748b)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--erp-border-subtle, #f1f5f9)';
              e.currentTarget.style.color = 'var(--erp-text-title, #0f172a)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--erp-text-muted, #64748b)';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Canonical Scrollable Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '1.25rem 1.35rem',
            boxSizing: 'border-box',
            ...bodyStyle,
          }}
        >
          {children}
        </div>

        {/* Optional Sticky Footer Action Bar */}
        {footer && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderTop: '1px solid var(--erp-border-subtle, #f1f5f9)',
              background: 'var(--erp-bg-canvas, #f8fafc)',
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
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalNode, document.body)
    : modalNode;
};
