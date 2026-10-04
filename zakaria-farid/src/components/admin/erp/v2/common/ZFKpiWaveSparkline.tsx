'use client';

import React from 'react';

export type ZFKpiAccentColor = 'accent' | 'emerald' | 'amber' | 'slate' | 'rose' | 'blue' | 'teal' | 'gold' | 'purple';

export interface ZFKpiWaveSparklineProps {
  data?: number[];
  accentColor?: ZFKpiAccentColor;
  customColor?: string;
  height?: number;
  width?: number | string;
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export const getSparklinePalette = (accent?: ZFKpiAccentColor, customColor?: string) => {
  if (customColor) {
    return { stroke: customColor, fill: customColor };
  }
  switch (accent) {
    case 'emerald':
      return { stroke: '#059669', fill: '#10b981' };
    case 'amber':
      return { stroke: '#d97706', fill: '#f59e0b' };
    case 'rose':
      return { stroke: '#e11d48', fill: '#f43f5e' };
    case 'teal':
      return { stroke: '#0d9488', fill: '#14b8a6' };
    case 'gold':
      return { stroke: '#ca8a04', fill: '#eab308' };
    case 'purple':
      return { stroke: '#7c3aed', fill: '#8b5cf6' };
    case 'slate':
      return { stroke: '#475569', fill: '#64748b' };
    case 'blue':
      return { stroke: 'var(--erp-accent)', fill: 'var(--erp-accent)' };
    case 'accent':
    default:
      return { stroke: 'var(--erp-accent, #2563eb)', fill: 'var(--erp-accent, #2563eb)' };
  }
};

/**
 * ZFKpiWaveSparkline: High-performance SVG wave sparkline with smooth cubic Bezier
 * spline curve and vertical linear gradient fill. Zero runtime lag, pixel-perfect.
 */
export const ZFKpiWaveSparkline: React.FC<ZFKpiWaveSparklineProps> = ({
  data,
  accentColor = 'accent',
  customColor,
  height = 34,
  width = '100%',
  className,
  trend = 'up',
}) => {
  const uniqueId = React.useId().replace(/:/g, '');
  const { stroke, fill } = getSparklinePalette(accentColor, customColor);

  const points = React.useMemo(() => {
    if (data && data.length >= 2) return data;
    if (trend === 'down') return [42, 38, 35, 36, 28, 26, 22, 16];
    if (trend === 'neutral') return [26, 28, 25, 29, 27, 28, 26, 27];
    return [16, 22, 19, 28, 25, 36, 32, 42]; // trend === 'up'
  }, [data, trend]);

  const pathData = React.useMemo(() => {
    const w = 180;
    const h = 40;
    const padY = 5;
    const padX = 2;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;

    const coords = points.map((val, idx) => {
      const x = padX + (idx / (points.length - 1)) * (w - 2 * padX);
      const y = h - padY - ((val - min) / range) * (h - 2 * padY);
      return { x, y };
    });

    let linePath = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[Math.max(0, i - 1)];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[Math.min(coords.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      linePath += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }

    const lastX = coords[coords.length - 1].x;
    const firstX = coords[0].x;
    const areaPath = `${linePath} L ${lastX.toFixed(1)},${h} L ${firstX.toFixed(1)},${h} Z`;

    return { linePath, areaPath, w, h };
  }, [points]);

  return (
    <svg
      viewBox={`0 0 ${pathData.w} ${pathData.h}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className ? `zf-kpi-wave-sparkline ${className}` : 'zf-kpi-wave-sparkline'}
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sparkline-grad-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.28" />
          <stop offset="65%" stopColor={fill} stopOpacity="0.08" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.00" />
        </linearGradient>
      </defs>
      <path d={pathData.areaPath} fill={`url(#sparkline-grad-${uniqueId})`} />
      <path d={pathData.linePath} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
