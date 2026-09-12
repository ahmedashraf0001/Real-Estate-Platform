'use client';

import React from 'react';
import styles from './ZFWorkstationShell.module.css';

export type ZFKpiAccentColor = 'gold' | 'emerald' | 'amber' | 'slate' | 'rose' | 'blue';

export interface ZFKpiCardProps {
  title: string;
  value: string | number | { toString: () => string; formatEGP?: (isAr?: boolean) => string };
  currency?: string;
  unitLabel?: string;
  icon?: React.ReactNode;
  accentColor?: ZFKpiAccentColor;
  isFlagship?: boolean;
  variant?: 'standard' | 'flagship' | 'compact' | 'double-bezel';
  subtitleLabel?: string;
  subtitleValue?: React.ReactNode;
  progress?: number | string; // 0 to 100
  progressColor?: string;
  badge?: {
    text: string;
    variant?: 'positive' | 'warning' | 'neutral' | 'gold' | 'danger';
  };
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  tooltip?: string;
}

const ACCENT_THEMES: Record<ZFKpiAccentColor, { bg: string; border: string; icon: string; text: string; valueColor?: string }> = {
  gold: {
    bg: 'rgba(197, 160, 89, 0.09)',
    border: 'rgba(197, 160, 89, 0.28)',
    icon: '#946f23',
    text: '#854d0e',
    valueColor: '#946f23'
  },
  emerald: {
    bg: 'rgba(4, 120, 87, 0.08)',
    border: 'rgba(4, 120, 87, 0.22)',
    icon: '#047857',
    text: '#065f46',
    valueColor: '#047857'
  },
  amber: {
    bg: 'rgba(180, 83, 9, 0.06)',
    border: 'rgba(180, 83, 9, 0.18)',
    icon: '#b45309',
    text: '#92400e',
    valueColor: '#b45309'
  },
  slate: {
    bg: 'rgba(51, 65, 85, 0.05)',
    border: 'rgba(51, 65, 85, 0.15)',
    icon: '#475569',
    text: '#334155',
    valueColor: '#0f172a'
  },
  rose: {
    bg: 'rgba(159, 18, 57, 0.05)',
    border: 'rgba(159, 18, 57, 0.18)',
    icon: '#9f1239',
    text: '#881337',
    valueColor: '#9f1239'
  },
  blue: {
    bg: 'rgba(30, 58, 138, 0.05)',
    border: 'rgba(30, 58, 138, 0.18)',
    icon: '#1e40af',
    text: '#1e3a8a',
    valueColor: '#1e40af'
  }
};

const parseMetricValue = (val: string | number | { toString: () => string; formatEGP?: (isAr?: boolean) => string }, explicitCurrency?: string) => {
  if (typeof val === 'number') {
    return {
      num: val.toLocaleString('en-US'),
      cur: explicitCurrency || ''
    };
  }
  if (val && typeof (val as any).formatEGP === 'function') {
    return parseMetricValue((val as any).formatEGP(true), explicitCurrency);
  }
  const str = String(val).trim();
  // Match number with trailing currency (ج.م, EGP, USD, etc.)
  const match = str.match(/^(.*?)(?:\s+(ج\.م|EGP|USD|EUR|LE))?$/i);
  if (match && match[2]) {
    return {
      num: match[1].trim(),
      cur: explicitCurrency || match[2]
    };
  }
  return {
    num: str,
    cur: explicitCurrency || ''
  };
};

export const ZFKpiCard: React.FC<ZFKpiCardProps> = ({
  title,
  value,
  currency,
  unitLabel,
  icon,
  accentColor = 'slate',
  isFlagship = false,
  variant = 'standard',
  subtitleLabel,
  subtitleValue,
  progress,
  progressColor,
  badge,
  onClick,
  className,
  style,
  tooltip
}) => {
  const accent = ACCENT_THEMES[accentColor] || ACCENT_THEMES.slate;
  const { num, cur } = parseMetricValue(value, currency);
  const effectiveFlagship = isFlagship || variant === 'flagship';

  // Compact horizontal strip rendering
  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        title={tooltip}
        className={`${styles.compactTelemetryCard} ${className || ''}`}
        style={{ cursor: onClick ? 'pointer' : 'default', ...style }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {icon && (
            <div
              className={styles.kpiIconSquircle}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: accent.bg,
                color: accent.icon,
                border: `1px solid ${accent.border}`
              }}
            >
              {icon}
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b' }}>
                {title}
              </span>
              {badge && (
                <span
                  className={styles.kpiBadge}
                  style={{
                    fontSize: '0.62rem',
                    padding: '0.1rem 0.38rem',
                    borderRadius: '5px',
                    background: badge.variant === 'positive' ? 'rgba(4, 120, 87, 0.08)' :
                      badge.variant === 'warning' ? 'rgba(180, 83, 9, 0.07)' :
                      badge.variant === 'danger' ? 'rgba(159, 18, 57, 0.06)' :
                      badge.variant === 'gold' ? 'rgba(197, 160, 89, 0.1)' : undefined,
                    color: badge.variant === 'positive' ? '#047857' :
                      badge.variant === 'warning' ? '#92400e' :
                      badge.variant === 'danger' ? '#9f1239' :
                      badge.variant === 'gold' ? '#946f23' : undefined,
                    borderColor: badge.variant === 'positive' ? 'rgba(4, 120, 87, 0.22)' :
                      badge.variant === 'warning' ? 'rgba(180, 83, 9, 0.2)' :
                      badge.variant === 'danger' ? 'rgba(159, 18, 57, 0.2)' :
                      badge.variant === 'gold' ? 'rgba(197, 160, 89, 0.3)' : undefined
                  }}
                >
                  {badge.text}
                </span>
              )}
            </div>
            {subtitleLabel && (
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                {subtitleLabel}: <strong style={{ color: '#475569' }}>{subtitleValue}</strong>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: accent.valueColor || '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            {num}
          </span>
          {cur && (
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#946f23' }}>
              {cur}
            </span>
          )}
          {unitLabel && (
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: accent.text }}>
              {unitLabel}
            </span>
          )}
        </div>
      </div>
    );
  }

  const cardContent = (
    <>
      {/* 1. TOP HEADER: TITLE & ACCENT ICON SQUIRCLE */}
      <div className={styles.kpiHeader}>
        <span className={`${styles.kpiLabel} ${effectiveFlagship ? styles.flagshipLabel : ''}`}>
          {title}
        </span>

        {icon && (
          <div
            className={styles.kpiIconSquircle}
            style={{
              background: effectiveFlagship ? 'rgba(184, 144, 62, 0.14)' : accent.bg,
              color: effectiveFlagship ? '#b8903e' : accent.icon,
              border: `1px solid ${effectiveFlagship ? 'rgba(184, 144, 62, 0.3)' : accent.border}`,
              boxShadow: effectiveFlagship ? '0 2px 6px rgba(184, 144, 62, 0.15)' : 'none'
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* 2. PRIMARY VALUE: SINGLE-LINE FLUID NUMBER & ATTACHED CURRENCY */}
      <div style={{ margin: '0.15rem 0 0.35rem 0' }}>
        <div
          className={styles.kpiValue}
          style={{
            fontSize: effectiveFlagship ? 'clamp(1.5rem, 2vw, 2.1rem)' : 'clamp(1.25rem, 1.55vw, 1.7rem)',
            whiteSpace: 'nowrap',
            flexWrap: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          <span style={{ whiteSpace: 'nowrap' }}>
            {num}
          </span>
          {cur && (
            <span className={styles.kpiCurrency} style={{ whiteSpace: 'nowrap' }}>
              {cur}
            </span>
          )}
          {unitLabel && (
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: accent.text || '#64748b',
                whiteSpace: 'nowrap'
              }}
            >
              {unitLabel}
            </span>
          )}
        </div>
      </div>

      {/* 3. OPTIONAL MICRO-PROGRESS BAR */}
      {(() => {
        const numProg = typeof progress === 'string' ? parseFloat(progress) : progress;
        return typeof numProg === 'number' && !isNaN(numProg) ? (
          <div className={styles.kpiProgressTrack}>
            <div
              className={styles.kpiProgressBar}
              style={{
                width: `${Math.min(100, Math.max(0, numProg))}%`,
                background: progressColor || (effectiveFlagship ? '#b8903e' : accent.icon)
              }}
            />
          </div>
        ) : null;
      })()}

      {/* 4. FOOTER: CONTEXT LABEL & VALUE OR BADGE */}
      {(subtitleLabel || subtitleValue || badge) && (
        <div className={`${styles.kpiFooter} ${effectiveFlagship ? styles.kpiFooterSubtle : ''}`}>
          {subtitleLabel && (
            <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {subtitleLabel}
            </span>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, marginInlineStart: 'auto' }}>
            {subtitleValue && (
              <strong
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 700,
                  color: effectiveFlagship ? '#b8903e' : 'inherit'
                }}
              >
                {subtitleValue}
              </strong>
            )}

            {badge && (
              <span
                className={styles.kpiBadge}
                style={{
                  background: badge.variant === 'positive' ? 'rgba(4, 120, 87, 0.08)' :
                    badge.variant === 'warning' ? 'rgba(180, 83, 9, 0.07)' :
                    badge.variant === 'danger' ? 'rgba(159, 18, 57, 0.06)' :
                    badge.variant === 'gold' ? 'rgba(197, 160, 89, 0.1)' : undefined,
                  color: badge.variant === 'positive' ? '#047857' :
                    badge.variant === 'warning' ? '#92400e' :
                    badge.variant === 'danger' ? '#9f1239' :
                    badge.variant === 'gold' ? '#946f23' : undefined,
                  borderColor: badge.variant === 'positive' ? 'rgba(4, 120, 87, 0.22)' :
                    badge.variant === 'warning' ? 'rgba(180, 83, 9, 0.2)' :
                    badge.variant === 'danger' ? 'rgba(159, 18, 57, 0.2)' :
                    badge.variant === 'gold' ? 'rgba(197, 160, 89, 0.3)' : undefined
                }}
              >
                {badge.text}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );

  if (variant === 'double-bezel') {
    return (
      <div
        onClick={onClick}
        title={tooltip}
        className={`${styles.doubleBezelCard} ${effectiveFlagship ? styles.flagshipCard : ''} ${className || ''}`}
        style={{ cursor: onClick ? 'pointer' : 'default', ...style }}
      >
        <div className={styles.doubleBezelInner}>
          {cardContent}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      title={tooltip}
      className={`${styles.kpiCard} ${effectiveFlagship ? styles.flagshipCard : ''} ${className || ''}`}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
    >
      {cardContent}
    </div>
  );
};
