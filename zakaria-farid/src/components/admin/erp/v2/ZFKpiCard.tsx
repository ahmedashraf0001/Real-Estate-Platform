'use client';

import React from 'react';
import { Info } from 'lucide-react';
import styles from './ZFWorkstationShell.module.css';

export type ZFKpiAccentColor = 'accent' | 'emerald' | 'amber' | 'slate' | 'rose' | 'blue' | 'teal' | 'gold' | 'purple';

export interface ZFKpiDelta {
  value: string | number;
  isPositive?: boolean;
  label?: string;
}

export interface ZFKpiExecutiveChart {
  type: 'spline' | 'bars';
  color: 'navy' | 'gold';
  data?: number[];
  months?: string[];
}

export interface ZFKpiCardProps {
  title: string;
  value: React.ReactNode | string | number | { toString: () => string; formatEGP?: (isAr?: boolean) => string };
  currency?: string;
  unitLabel?: string;
  icon?: React.ReactNode;
  accentColor?: ZFKpiAccentColor;
  actionButton?: React.ReactNode;
  executiveChart?: ZFKpiExecutiveChart;
  isFlagship?: boolean;
  variant?: 'standard' | 'flagship' | 'compact' | 'double-bezel';
  subtitleLabel?: string;
  subtitleValue?: React.ReactNode;
  progress?: number | string; // 0 to 100
  progressColor?: string;
  badge?: {
    text: string;
    variant?: 'positive' | 'warning' | 'neutral' | 'danger' | 'info' | 'gold';
  };
  delta?: ZFKpiDelta;
  sparkline?: React.ReactNode;
  sparklineData?: number[];
  sparklineColor?: string;
  showSparkline?: boolean;
  footerContent?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  tooltip?: string;
}

const parseMetricValue = (val: React.ReactNode | string | number | { toString: () => string; formatEGP?: (isAr?: boolean) => string }, explicitCurrency?: string) => {
  if (React.isValidElement(val)) {
    return {
      num: val,
      cur: explicitCurrency || '',
      isNegative: false
    };
  }
  if (typeof val === 'number') {
    const isNeg = val < 0;
    const absVal = Math.abs(Math.round(val));
    return {
      num: isNeg ? `- ${absVal.toLocaleString('en-US')}` : absVal.toLocaleString('en-US'),
      cur: explicitCurrency || '',
      isNegative: isNeg
    };
  }
  if (val && typeof (val as any).formatEGP === 'function') {
    const numVal = typeof (val as any).toNumber === 'function' ? (val as any).toNumber() : parseFloat(String(val));
    if (!isNaN(numVal)) {
      const isNeg = numVal < 0;
      const absVal = Math.abs(Math.round(numVal));
      return {
        num: isNeg ? `- ${absVal.toLocaleString('en-US')}` : absVal.toLocaleString('en-US'),
        cur: explicitCurrency || 'ج.م',
        isNegative: isNeg
      };
    }
  }
  let str = String(val ?? '').trim();
  let detectedCur = explicitCurrency || '';
  const curRegex = /(?:\s+|^)(ج\.م|EGP|USD|EUR|LE)(?:\s+|$)/i;
  const match = str.match(curRegex);
  if (match && match[1]) {
    if (!detectedCur) detectedCur = match[1];
    str = str.replace(curRegex, ' ').trim();
  }
  const isNeg = str.startsWith('-') || str.endsWith('-') || (str.startsWith('(') && str.endsWith(')'));
  let clean = str.replace(/[-()]/g, '').trim().replace(/\.\d{1,2}$/, '');
  return {
    num: isNeg ? `- ${clean}` : clean,
    cur: detectedCur,
    isNegative: isNeg
  };
};

const getBadgePillClass = (variant?: 'positive' | 'warning' | 'neutral' | 'danger' | 'info' | 'gold') => {
  switch (variant) {
    case 'positive':
      return styles.statusPillGreen;
    case 'warning':
      return styles.statusPillAmber;
    case 'danger':
      return styles.statusPillRed;
    case 'gold':
    case 'info':
      return styles.statusPillBlue;
    case 'neutral':
    default:
      return styles.statusPillNeutral;
  }
};

/**
 * ZFKpiGrid: Responsive 4-column container for discrete floating white stat cards
 */
export interface ZFKpiGridProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const ZFKpiGrid: React.FC<ZFKpiGridProps> = ({ children, className, style }) => {
  return (
    <div className={`${styles.discreteKpiGrid} ${className || ''}`} style={style}>
      {children}
    </div>
  );
};

const getIconSquircleStyle = (accent?: ZFKpiAccentColor): React.CSSProperties => {
  const base: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: 7,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  switch (accent) {
    case 'emerald':
      return {
        ...base,
        background: '#ecfdf5',
        color: '#059669',
        border: '1px solid rgba(5, 150, 105, 0.18)',
      };
    case 'amber':
      return {
        ...base,
        background: '#fffbeb',
        color: '#d97706',
        border: '1px solid rgba(217, 119, 6, 0.18)',
      };
    case 'slate':
      return {
        ...base,
        background: '#f1f5f9',
        color: '#475569',
        border: '1px solid rgba(71, 85, 105, 0.15)',
      };
    case 'rose':
      return {
        ...base,
        background: '#fef2f2',
        color: '#e11d48',
        border: '1px solid rgba(225, 29, 72, 0.18)',
      };
    case 'teal':
      return {
        ...base,
        background: '#f0fdfa',
        color: '#0d9488',
        border: '1px solid rgba(13, 148, 136, 0.18)',
      };
    case 'gold':
      return {
        ...base,
        background: '#fdf8ee',
        color: 'var(--erp-accent, #b48c36)',
        border: '1px solid rgba(180, 140, 54, 0.22)',
      };
    case 'purple':
      return {
        ...base,
        background: '#f5f3ff',
        color: '#7c3aed',
        border: '1px solid rgba(124, 58, 237, 0.18)',
      };
    case 'blue':
    case 'accent':
    default:
      return {
        ...base,
        background: 'var(--erp-accent-subtle, #eff6ff)',
        color: 'var(--erp-accent, #2563eb)',
        border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.15))',
      };
  }
};

const DEFAULT_COCKPIT_MONTHS = ['أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر'];

export const CockpitExecutiveChart: React.FC<ZFKpiExecutiveChart> = ({
  type,
  color,
  data,
  months = DEFAULT_COCKPIT_MONTHS,
}) => {
  const chartHeight = 44;
  const isNavy = color === 'navy';
  const primaryColor = isNavy ? '#334155' : 'var(--erp-accent, #b48c36)';

  if (type === 'spline') {
    const rawData = data && data.length >= 6 ? data : (isNavy ? [0.35, 0.48, 0.42, 0.58, 0.60, 0.72] : [0.38, 0.54, 0.50, 0.65, 0.62, 0.78]);
    const width = 280;
    const height = chartHeight;
    const padX = 14;
    const padY = 6;
    const stepX = (width - padX * 2) / (rawData.length - 1);

    const points = rawData.map((val, i) => ({
      x: padX + i * stepX,
      y: height - padY - val * (height - padY * 2),
    }));

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
    const gradId = `execGrad-${isNavy ? 'navy' : 'gold'}`;

    return (
      <div style={{ width: '100%', marginTop: 'auto', paddingTop: '0.35rem' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: `${chartHeight}px`, overflow: 'visible', display: 'block' }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isNavy ? '#334155' : '#b48c36'} stopOpacity={isNavy ? 0.22 : 0.28} />
              <stop offset="100%" stopColor={isNavy ? '#334155' : '#b48c36'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#${gradId})`} />
          <path d={pathD} fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((pt, idx) => (
            <g key={idx}>
              <circle cx={pt.x} cy={pt.y} r="3" fill={primaryColor} />
              {isNavy && <circle cx={pt.x} cy={pt.y} r="1.2" fill="#ffffff" />}
            </g>
          ))}
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', marginTop: '4px', direction: 'ltr' }}>
          {months.map((m, i) => (
            <span key={i} style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>
              {m}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Vertical Bars
  const rawBars = data && data.length >= 6 ? data : (isNavy ? [22, 28, 42, 54, 66, 82] : [20, 32, 26, 44, 52, 68]);
  return (
    <div style={{ width: '100%', marginTop: 'auto', paddingTop: '0.35rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: `${chartHeight}px`, padding: '0 8px', direction: 'ltr' }}>
        {rawBars.map((val, idx) => {
          const isLast = idx === rawBars.length - 1;
          const barColor = isNavy
            ? (isLast ? '#334155' : idx >= 2 ? '#94a3b8' : '#cbd5e1')
            : (isLast ? 'var(--erp-accent, #b48c36)' : '#f3ecd8');
          const pctHeight = Math.min(100, Math.max(15, val));
          return (
            <div
              key={idx}
              style={{
                width: '14px',
                height: `${pctHeight}%`,
                background: barColor,
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.3s ease',
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', marginTop: '4px', direction: 'ltr' }}>
        {months.map((m, i) => (
          <span key={i} style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>
            {m}
          </span>
        ))}
      </div>
    </div>
  );
};

export { ZFKpiWaveSparkline } from './common/ZFKpiWaveSparkline';
export type { ZFKpiWaveSparklineProps } from './common/ZFKpiWaveSparkline';
import { ZFKpiWaveSparkline } from './common/ZFKpiWaveSparkline';

/**
 * ZFKpiCard: Canonical Enterprise Discrete Floating Stat Card
 * Crisp pure white panel, 1px structural border (#e2e8f0), muted label + (i),
 * large bold tabular KPI, plain delta line or embedded sparkline.
 */
export const ZFKpiCard: React.FC<ZFKpiCardProps> = ({
  title,
  value,
  currency,
  unitLabel,
  icon,
  accentColor = 'accent',
  isFlagship = false,
  variant = 'standard',
  subtitleLabel,
  subtitleValue,
  progress,
  progressColor,
  badge,
  delta,
  sparkline,
  sparklineData,
  sparklineColor,
  showSparkline,
  actionButton,
  executiveChart,
  footerContent,
  onClick,
  className,
  style,
  tooltip
}) => {
  const { num, cur } = parseMetricValue(value, currency);
  const cleanCur = (cur || '').trim();
  const cleanUnit = (unitLabel || '').trim();
  const showCur = Boolean(cleanCur && (!cleanUnit || !cleanUnit.includes(cleanCur)));
  const showUnit = Boolean(cleanUnit);

  // Compact horizontal strip rendering
  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        title={tooltip}
        className={`${styles.discreteKpiCard || ''} ${className || ''}`.trim()}
        style={{
          padding: '0.85rem 1rem',
          minHeight: 'auto',
          cursor: onClick ? 'pointer' : 'default',
          ...style
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
            {icon && (
              <div style={getIconSquircleStyle(accentColor)}>
                {icon}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b' }}>
                  {title}
                </span>
                {badge && (
                  <span className={`${styles.statusPill} ${getBadgePillClass(badge.variant)}`}>
                    {badge.text}
                  </span>
                )}
              </div>
              {subtitleLabel && (
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                  {subtitleLabel}: <strong style={{ color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{subtitleValue}</strong>
                </div>
              )}
            </div>
          </div>

          <div dir="ltr" style={{ textAlign: 'end', display: 'inline-flex', alignItems: 'baseline', gap: '0.35rem', flexShrink: 0, direction: 'ltr', unicodeBidi: 'isolate' }}>
            <span
              dir="ltr"
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#0f172a',
                fontVariantNumeric: 'tabular-nums',
                direction: 'ltr',
                unicodeBidi: 'isolate'
              }}
            >
              {num}
            </span>
            {showCur && (
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', direction: 'rtl', unicodeBidi: 'isolate' }}>
                {cleanCur}
              </span>
            )}
            {showUnit && (
              <span style={{ fontSize: cleanCur ? '0.70rem' : '0.74rem', fontWeight: 600, color: '#64748b' }}>
                {cleanUnit}
              </span>
            )}
          </div>
        </div>

        {/* Optional Micro Progress Bar */}
        {(() => {
          const numProg = typeof progress === 'string' ? parseFloat(progress) : progress;
          return typeof numProg === 'number' && !isNaN(numProg) ? (
            <div style={{ width: '100%', height: 4, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden', marginTop: '0.5rem' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(0, numProg))}%`,
                  background: progressColor || 'var(--erp-accent, #2563eb)',
                  borderRadius: 999,
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          ) : null;
        })()}
      </div>
    );
  }

  // Standard Discrete Floating Stat Card
  return (
    <div
      onClick={onClick}
      title={tooltip}
      className={`${styles.discreteKpiCard || ''} ${className || ''}`.trim()}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
    >
      {/* 1. TOP HEADER: TITLE & INFO ICON / SQUIRCLE */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        {actionButton ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
              {icon && (
                <div style={getIconSquircleStyle(accentColor)}>
                  {icon}
                </div>
              )}
              <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title}
              </span>
            </div>
            {actionButton}
          </>
        ) : (
          <>
            <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>
              {title}
            </span>

            {icon ? (
              <div style={getIconSquircleStyle(accentColor)}>
                {icon}
              </div>
            ) : (
              <Info size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
            )}
          </>
        )}
      </div>

      {/* 2. PRIMARY VALUE: BIG BOLD TABULAR KPI + CURRENCY (FULL WIDTH, ZERO TRUNCATION) */}
      <div dir="ltr" style={{ margin: '0.4rem 0 0.2rem 0', display: 'flex', alignItems: 'baseline', gap: '0.35rem', direction: 'ltr', unicodeBidi: 'isolate' }}>
        <span
          dir="ltr"
          style={{
            fontSize: 'clamp(1.25rem, 1.4vw, 1.45rem)',
            fontWeight: 700,
            color: '#0f172a',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            whiteSpace: 'nowrap',
            direction: 'ltr',
            unicodeBidi: 'isolate',
            display: 'inline-block'
          }}
        >
          {num}
        </span>
        {showCur && (
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', direction: 'rtl', unicodeBidi: 'isolate' }}>
            {cleanCur}
          </span>
        )}
        {showUnit && (
          <span style={{ fontSize: cleanCur ? '0.78rem' : '0.82rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
            {cleanUnit}
          </span>
        )}
      </div>

      {/* 2.2 DELTA TREND INDICATOR ROW */}
      {delta && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 0 0.35rem 0', flexWrap: 'nowrap' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: delta.isPositive ? '#16a34a' : delta.isPositive === false ? '#dc2626' : '#64748b',
              background: delta.isPositive ? '#f0fdf4' : delta.isPositive === false ? '#fef2f2' : '#f8fafc',
              border: `1px solid ${delta.isPositive ? 'rgba(22, 163, 74, 0.2)' : delta.isPositive === false ? 'rgba(220, 38, 38, 0.2)' : '#e2e8f0'}`,
              borderRadius: '999px',
              padding: '0.12rem 0.45rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            {delta.isPositive ? '▲' : delta.isPositive === false ? '▼' : ''} {delta.value} {executiveChart && delta.isPositive ? '▲' : ''}
          </span>
          {delta.label && (
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {delta.label}
            </span>
          )}
        </div>
      )}

      {/* 2.3 EXECUTIVE SUBTITLE / BREAKDOWN ROW */}
      {executiveChart && (subtitleLabel || subtitleValue) && (
        <div style={{ fontSize: '0.72rem', color: '#64748b', margin: '0 0 0.35rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subtitleLabel && <span>{subtitleLabel}{subtitleValue ? ': ' : ''}</span>}
          {subtitleValue && <strong style={{ color: '#334155', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{subtitleValue}</strong>}
        </div>
      )}

      {/* 2.4 EXECUTIVE EMBEDDED MONTHLY CHART */}
      {executiveChart && (
        <CockpitExecutiveChart {...executiveChart} />
      )}

      {/* 2.5 EMBEDDED WAVE SPARKLINE (Rendered when time-series data is provided or showSparkline is true) */}
      {!executiveChart && (showSparkline || Boolean(sparklineData && sparklineData.length >= 2)) && !sparkline && (
        <div style={{ height: 32, margin: '0.15rem 0 0.25rem 0', width: '100%', overflow: 'hidden' }}>
          <ZFKpiWaveSparkline
            data={sparklineData && sparklineData.length >= 2 ? sparklineData : [0, 0, 0, 0, 0, 0]}
            accentColor={accentColor}
            customColor={sparklineColor}
            trend={delta?.isPositive ? 'up' : delta?.isPositive === false ? 'down' : 'neutral'}
            height={32}
          />
        </div>
      )}

      {/* 3. OPTIONAL MICRO-PROGRESS BAR */}
      {(() => {
        const numProg = typeof progress === 'string' ? parseFloat(progress) : progress;
        return typeof numProg === 'number' && !isNaN(numProg) ? (
          <div style={{ width: '100%', height: 4, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden', marginBottom: '0.4rem' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, numProg))}%`,
                background: progressColor || 'var(--erp-accent, #2563eb)',
                borderRadius: 999,
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        ) : null;
      })()}

      {/* 4. FOOTER: DELTA LINE, SPARKLINE, SUBTITLE, BADGE, OR CUSTOM FOOTER CONTENT */}
      {footerContent ? (
        <div style={{ marginTop: 'auto', paddingTop: '0.35rem' }}>
          {footerContent}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.35rem' }}>
          {!executiveChart && (subtitleLabel || subtitleValue) ? (
            <span style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {subtitleLabel && <span>{subtitleLabel}{subtitleValue ? ': ' : ''}</span>}
              {subtitleValue && <strong style={{ color: '#334155', fontVariantNumeric: 'tabular-nums' }}>{subtitleValue}</strong>}
            </span>
          ) : (
            <span />
          )}

          {sparkline ? (
            <div style={{ flexShrink: 0 }}>{sparkline}</div>
          ) : badge ? (
            <span className={`${styles.statusPill} ${getBadgePillClass(badge.variant)}`}>
              {badge.text}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
};
