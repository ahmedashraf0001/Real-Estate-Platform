'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './ZFModalShell.module.css';

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
  if (typeof window !== 'undefined' && !mounted) return null;

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      dir={isAr ? 'rtl' : 'ltr'}
      className={styles.overlay}
      style={{ zIndex }}
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div
        className={`${styles.card} ${className}`}
        style={{
          maxWidth: `min(94vw, ${maxWidth})`,
          maxHeight,
          ...cardStyle,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Canonical Header (fixed 54px with visible 1px solid #cbd5e1 separating line) */}
        <div
          className={styles.header}
          style={headerStyle}
        >
          <div className={styles.headerLead}>
            {icon && (
              <div className={styles.headerIcon}>
                {icon}
              </div>
            )}
            <div className={styles.headerText}>
              <div className={styles.headerTitleRow}>
                <h3 className={styles.title}>
                  {title}
                </h3>
                {headerExtra}
              </div>
              {subtitle && (
                <div className={styles.subtitle}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            className={styles.closeBtn}
          >
            <X size={16} />
          </button>
        </div>

        {/* Canonical Scrollable Body */}
        <div
          className={styles.body}
          style={bodyStyle}
        >
          {children}
        </div>

        {/* Optional Sticky Footer Action Bar (with visible 1px solid #cbd5e1 separating line) */}
        {footer && (
          <div
            className={styles.footer}
            style={footerStyle}
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
