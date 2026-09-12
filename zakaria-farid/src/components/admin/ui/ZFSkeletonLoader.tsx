'use client';

import React from 'react';

/* ==============================================================================
 * ZFSkeletonShimmer — Core Shimmer Wave Primitive
 * ============================================================================== */

export interface ZFSkeletonShimmerProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'rectangular' | 'circular' | 'rounded';
}

export const ZFSkeletonShimmer: React.FC<ZFSkeletonShimmerProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius,
  className = '',
  style = {},
  variant = 'rounded',
}) => {
  let computedRadius: string | number = '8px';
  if (borderRadius !== undefined) {
    computedRadius = borderRadius;
  } else if (variant === 'circular') {
    computedRadius = '9999px';
  } else if (variant === 'rectangular') {
    computedRadius = '0px';
  }

  return (
    <span
      className={`zf-skeleton-shimmer ${className}`}
      style={{
        display: 'block',
        width,
        height,
        borderRadius: computedRadius,
        flexShrink: 0,
        ...style,
      }}
    />
  );
};

/* ==============================================================================
 * Shared Skeleton Styles & Keyframes
 * ============================================================================== */

const GlobalSkeletonStyles: React.FC = () => (
  <style>{`
    @keyframes zfShimmerWave {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }

    .zf-skeleton-root {
      --zf-skel-base: #E2E8F0;
      --zf-skel-highlight: #F1F5F9;
      --zf-skel-card-bg: #FFFFFF;
      --zf-skel-card-border: #D8D2C4;
      --zf-skel-card-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03);
      --zf-skel-subtle: #F8FAFC;
      --zf-skel-gold: #946F23;
      --zf-skel-gold-glow: rgba(197, 160, 89, 0.12);
      width: 100%;
      box-sizing: border-box;
      font-family: var(--font-sans, 'ThmanyahSans', 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif);
    }

    /* Light Theme Specifics */
    [data-theme="light"] .zf-skeleton-root,
    html[data-theme="light"] .zf-skeleton-root,
    body[data-theme="light"] .zf-skeleton-root,
    .zf-skeleton-root.light {
      --zf-skel-base: #E2E8F0;
      --zf-skel-highlight: #F1F5F9;
      --zf-skel-card-bg: #FFFFFF;
      --zf-skel-card-border: #D8D2C4;
      --zf-skel-card-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03);
      --zf-skel-subtle: #F8FAFC;
      --zf-skel-gold: #946F23;
    }

    /* Dark Theme Specifics */
    [data-theme="dark"] .zf-skeleton-root,
    html[data-theme="dark"] .zf-skeleton-root,
    body[data-theme="dark"] .zf-skeleton-root,
    .zf-skeleton-root.dark {
      --zf-skel-base: rgba(255, 255, 255, 0.05);
      --zf-skel-highlight: rgba(255, 255, 255, 0.12);
      --zf-skel-card-bg: rgba(16, 20, 29, 0.85);
      --zf-skel-card-border: rgba(255, 255, 255, 0.08);
      --zf-skel-card-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      --zf-skel-subtle: rgba(255, 255, 255, 0.03);
      --zf-skel-gold: #C5A059;
    }

    .zf-skeleton-shimmer {
      background: linear-gradient(
        90deg,
        var(--zf-skel-base) 0%,
        var(--zf-skel-highlight) 50%,
        var(--zf-skel-base) 100%
      );
      background-size: 200% 100%;
      animation: zfShimmerWave 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
  `}</style>
);

function useSkeletonTheme(): 'light' | 'dark' {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    const getTheme = (): 'light' | 'dark' => {
      if (typeof document === 'undefined') return 'light';
      const attr = document.documentElement.getAttribute('data-theme');
      if (attr === 'dark') return 'dark';
      if (attr === 'light') return 'light';
      const match = document.cookie.match(/(?:^|;\s*)zf_theme=([^;]*)/);
      if (match && match[1] === 'dark') return 'dark';
      return 'light';
    };

    setTheme(getTheme());

    const observer = new MutationObserver(() => {
      setTheme(getTheme());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}

/* ==============================================================================
 * ZFSkeletonTable — Luxury Layout-Preserving Table Page Skeleton
 * ============================================================================== */

export interface ZFSkeletonTableProps {
  isAr?: boolean;
  rowsCount?: number;
  className?: string;
}

export const ZFSkeletonTable: React.FC<ZFSkeletonTableProps> = ({
  isAr = true,
  rowsCount = 6,
  className = '',
}) => {
  const theme = useSkeletonTheme();
  return (
    <div
      className={`zf-skeleton-root ${theme} ${className}`}
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        width: '100%',
        minHeight: '70vh',
      }}
    >
      <GlobalSkeletonStyles />

      {/* ─── 1. Header & Executive Controls ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'var(--zf-skel-card-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '20px 24px',
          borderRadius: '16px',
          border: '1px solid var(--zf-skel-card-border)',
          boxShadow: 'var(--zf-skel-card-shadow)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Main Title Capsule */}
            <ZFSkeletonShimmer width="210px" height="26px" borderRadius="8px" />
            {/* Status Pill */}
            <ZFSkeletonShimmer width="100px" height="22px" borderRadius="9999px" />
            {/* Filter Tabs Capsule */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                background: 'var(--zf-skel-subtle)',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid var(--zf-skel-card-border)',
              }}
            >
              <ZFSkeletonShimmer width="88px" height="26px" borderRadius="6px" />
              <ZFSkeletonShimmer width="76px" height="26px" borderRadius="6px" />
            </div>
          </div>
          {/* Subtitle description */}
          <ZFSkeletonShimmer width="320px" height="13px" borderRadius="6px" />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ZFSkeletonShimmer width="110px" height="38px" borderRadius="10px" />
          <ZFSkeletonShimmer width="136px" height="38px" borderRadius="10px" />
        </div>
      </div>

      {/* ─── 2. Search & Multi-filter Bar ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          background: 'var(--zf-skel-card-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '12px 18px',
          borderRadius: '14px',
          border: '1px solid var(--zf-skel-card-border)',
          boxShadow: 'var(--zf-skel-card-shadow)',
        }}
      >
        {/* Search Input Skeleton */}
        <div style={{ flex: '1 1 280px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ZFSkeletonShimmer width="100%" height="38px" borderRadius="10px" />
        </div>
        {/* Dropdown Filter 1 */}
        <ZFSkeletonShimmer width="150px" height="38px" borderRadius="10px" />
        {/* Dropdown Filter 2 */}
        <ZFSkeletonShimmer width="140px" height="38px" borderRadius="10px" />
        {/* View Mode Toggle Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            background: 'var(--zf-skel-subtle)',
            padding: '3px',
            borderRadius: '9px',
            border: '1px solid var(--zf-skel-card-border)',
          }}
        >
          <ZFSkeletonShimmer width="32px" height="32px" borderRadius="7px" />
          <ZFSkeletonShimmer width="32px" height="32px" borderRadius="7px" />
        </div>
      </div>

      {/* ─── 3. Luxury Executive Table Container ─── */}
      <div
        style={{
          background: 'var(--zf-skel-card-bg)',
          borderRadius: '16px',
          border: '1px solid var(--zf-skel-card-border)',
          boxShadow: 'var(--zf-skel-card-shadow)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Table Column Headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 2.2fr 1.1fr 1.2fr 1.1fr 1fr',
            alignItems: 'center',
            gap: '16px',
            padding: '14px 24px',
            background: 'var(--zf-skel-subtle)',
            borderBottom: '1px solid var(--zf-skel-card-border)',
          }}
        >
          <ZFSkeletonShimmer width="90px" height="12px" borderRadius="5px" />
          <ZFSkeletonShimmer width="140px" height="12px" borderRadius="5px" />
          <ZFSkeletonShimmer width="75px" height="12px" borderRadius="5px" />
          <ZFSkeletonShimmer width="95px" height="12px" borderRadius="5px" />
          <ZFSkeletonShimmer width="80px" height="12px" borderRadius="5px" />
          <div style={{ display: 'flex', justifyContent: isAr ? 'flex-start' : 'flex-end' }}>
            <ZFSkeletonShimmer width="60px" height="12px" borderRadius="5px" />
          </div>
        </div>

        {/* 6 Alternating Table Rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {Array.from({ length: rowsCount }).map((_, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 2.2fr 1.1fr 1.2fr 1.1fr 1fr',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 24px',
                borderBottom: idx === rowsCount - 1 ? 'none' : '1px solid var(--zf-skel-card-border)',
                background: idx % 2 === 1 ? 'var(--zf-skel-subtle)' : 'transparent',
                transition: 'background 0.2s ease',
              }}
            >
              {/* Col 1: Thumbnail / Icon + Code Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ZFSkeletonShimmer width="42px" height="42px" borderRadius="10px" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <ZFSkeletonShimmer width="64px" height="14px" borderRadius="5px" />
                  <ZFSkeletonShimmer width="44px" height="10px" borderRadius="4px" />
                </div>
              </div>

              {/* Col 2: Title & Subtitle lines */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <ZFSkeletonShimmer width={idx % 2 === 0 ? '78%' : '65%'} height="15px" borderRadius="5px" />
                <ZFSkeletonShimmer width={idx % 2 === 0 ? '45%' : '52%'} height="11px" borderRadius="4px" />
              </div>

              {/* Col 3: Status Badge Capsule */}
              <div>
                <ZFSkeletonShimmer width="86px" height="24px" borderRadius="9999px" />
              </div>

              {/* Col 4: Price / Financial Value */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <ZFSkeletonShimmer width="92px" height="16px" borderRadius="5px" />
                <ZFSkeletonShimmer width="46px" height="10px" borderRadius="4px" />
              </div>

              {/* Col 5: Category / Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <ZFSkeletonShimmer width="78px" height="13px" borderRadius="5px" />
                <ZFSkeletonShimmer width="54px" height="10px" borderRadius="4px" />
              </div>

              {/* Col 6: Actions Toolbar (3 buttons) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: isAr ? 'flex-start' : 'flex-end' }}>
                <ZFSkeletonShimmer width="28px" height="28px" borderRadius="7px" />
                <ZFSkeletonShimmer width="28px" height="28px" borderRadius="7px" />
                <ZFSkeletonShimmer width="28px" height="28px" borderRadius="7px" />
              </div>
            </div>
          ))}
        </div>

        {/* Table Footer / Pagination Skeleton */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            borderTop: '1px solid var(--zf-skel-card-border)',
            background: 'var(--zf-skel-subtle)',
          }}
        >
          <ZFSkeletonShimmer width="160px" height="13px" borderRadius="5px" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ZFSkeletonShimmer width="30px" height="30px" borderRadius="6px" />
            <ZFSkeletonShimmer width="30px" height="30px" borderRadius="6px" />
            <ZFSkeletonShimmer width="30px" height="30px" borderRadius="6px" />
            <ZFSkeletonShimmer width="30px" height="30px" borderRadius="6px" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==============================================================================
 * ZFSkeletonDashboard — Luxury Layout-Preserving Analytics & KPI Skeleton
 * ============================================================================== */

export interface ZFSkeletonDashboardProps {
  isAr?: boolean;
  className?: string;
}

export const ZFSkeletonDashboard: React.FC<ZFSkeletonDashboardProps> = ({
  isAr = true,
  className = '',
}) => {
  const theme = useSkeletonTheme();
  return (
    <div
      className={`zf-skeleton-root ${theme} ${className}`}
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        width: '100%',
        minHeight: '75vh',
      }}
    >
      <GlobalSkeletonStyles />

      {/* ─── 1. Analytics Hub Header ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'var(--zf-skel-card-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '20px 24px',
          borderRadius: '16px',
          border: '1px solid var(--zf-skel-card-border)',
          boxShadow: 'var(--zf-skel-card-shadow)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <ZFSkeletonShimmer width="240px" height="26px" borderRadius="8px" />
            <ZFSkeletonShimmer width="115px" height="22px" borderRadius="9999px" />
          </div>
          <ZFSkeletonShimmer width="380px" height="13px" borderRadius="6px" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ZFSkeletonShimmer width="130px" height="40px" borderRadius="10px" />
          <ZFSkeletonShimmer width="140px" height="40px" borderRadius="10px" />
        </div>
      </div>

      {/* ─── 2. Top 4 Analytical KPI Metric Highlights ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '14px',
        }}
      >
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--zf-skel-card-bg)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '14px',
              padding: '18px 20px',
              border: '1px solid var(--zf-skel-card-border)',
              boxShadow: 'var(--zf-skel-card-shadow)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              minHeight: '110px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <ZFSkeletonShimmer width="120px" height="12px" borderRadius="5px" />
              <ZFSkeletonShimmer width="28px" height="28px" borderRadius="8px" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <ZFSkeletonShimmer width="110px" height="26px" borderRadius="6px" />
              <ZFSkeletonShimmer width="140px" height="11px" borderRadius="4px" />
            </div>
          </div>
        ))}
      </div>

      {/* ─── 3. Strategic Executive Advisory Feed Skeleton ─── */}
      <div
        style={{
          background: 'var(--zf-skel-card-bg)',
          borderRadius: '16px',
          border: '1px solid var(--zf-skel-card-border)',
          boxShadow: 'var(--zf-skel-card-shadow)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <ZFSkeletonShimmer width="220px" height="20px" borderRadius="6px" />
          <ZFSkeletonShimmer width="90px" height="20px" borderRadius="9999px" />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
          }}
        >
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'var(--zf-skel-subtle)',
                border: '1px solid var(--zf-skel-card-border)',
                display: 'flex',
                gap: '12px',
              }}
            >
              <ZFSkeletonShimmer width="32px" height="32px" borderRadius="8px" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <ZFSkeletonShimmer width="70%" height="14px" borderRadius="5px" />
                <ZFSkeletonShimmer width="90%" height="11px" borderRadius="4px" />
                <ZFSkeletonShimmer width="45%" height="11px" borderRadius="4px" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 4. Split Grid: Major Chart Skeleton + Leaderboard ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '18px',
        }}
      >
        {/* Major Analytical Chart Skeleton */}
        <div
          style={{
            background: 'var(--zf-skel-card-bg)',
            borderRadius: '16px',
            border: '1px solid var(--zf-skel-card-border)',
            boxShadow: 'var(--zf-skel-card-shadow)',
            padding: '22px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <ZFSkeletonShimmer width="190px" height="18px" borderRadius="6px" />
            <div style={{ display: 'flex', gap: '6px' }}>
              <ZFSkeletonShimmer width="54px" height="26px" borderRadius="6px" />
              <ZFSkeletonShimmer width="54px" height="26px" borderRadius="6px" />
              <ZFSkeletonShimmer width="54px" height="26px" borderRadius="6px" />
            </div>
          </div>

          {/* Simulated Chart Bars */}
          <div
            style={{
              height: '240px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '16px 8px 0',
              borderBottom: '1px solid var(--zf-skel-card-border)',
            }}
          >
            {[45, 75, 55, 90, 65, 85, 70, 95, 60].map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  gap: '8px',
                }}
              >
                <ZFSkeletonShimmer width="100%" height={`${h}%`} borderRadius="6px 6px 0 0" />
                <ZFSkeletonShimmer width="60%" height="10px" borderRadius="3px" />
              </div>
            ))}
          </div>
        </div>

        {/* Secondary Engagement Matrix / Feed */}
        <div
          style={{
            background: 'var(--zf-skel-card-bg)',
            borderRadius: '16px',
            border: '1px solid var(--zf-skel-card-border)',
            boxShadow: 'var(--zf-skel-card-shadow)',
            padding: '22px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <ZFSkeletonShimmer width="170px" height="18px" borderRadius="6px" />
            <ZFSkeletonShimmer width="70px" height="22px" borderRadius="9999px" />
          </div>

          {/* 4 List rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'var(--zf-skel-subtle)',
                  border: '1px solid var(--zf-skel-card-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ZFSkeletonShimmer width="34px" height="34px" borderRadius="8px" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <ZFSkeletonShimmer width="130px" height="13px" borderRadius="5px" />
                    <ZFSkeletonShimmer width="80px" height="10px" borderRadius="4px" />
                  </div>
                </div>
                <ZFSkeletonShimmer width="54px" height="20px" borderRadius="9999px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==============================================================================
 * ZFSkeletonCards — Luxury Property Cards Grid Skeleton
 * ============================================================================== */

export interface ZFSkeletonCardsProps {
  isAr?: boolean;
  cardsCount?: number;
  className?: string;
}

export const ZFSkeletonCards: React.FC<ZFSkeletonCardsProps> = ({
  isAr = true,
  cardsCount = 6,
  className = '',
}) => {
  const theme = useSkeletonTheme();
  return (
    <div
      className={`zf-skeleton-root ${theme} ${className}`}
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        width: '100%',
        minHeight: '75vh',
      }}
    >
      <GlobalSkeletonStyles />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'var(--zf-skel-card-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '20px 24px',
          borderRadius: '16px',
          border: '1px solid var(--zf-skel-card-border)',
          boxShadow: 'var(--zf-skel-card-shadow)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <ZFSkeletonShimmer width="200px" height="26px" borderRadius="8px" />
          <ZFSkeletonShimmer width="290px" height="13px" borderRadius="6px" />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ZFSkeletonShimmer width="110px" height="38px" borderRadius="10px" />
          <ZFSkeletonShimmer width="130px" height="38px" borderRadius="10px" />
        </div>
      </div>

      {/* Grid of 6 Luxury Property Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {Array.from({ length: cardsCount }).map((_, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--zf-skel-card-bg)',
              borderRadius: '16px',
              border: '1px solid var(--zf-skel-card-border)',
              boxShadow: 'var(--zf-skel-card-shadow)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* 16:10 Photo Skeleton Area */}
            <div style={{ position: 'relative', width: '100%', height: '180px' }}>
              <ZFSkeletonShimmer width="100%" height="100%" borderRadius="0px" />
              {/* Corner Status Badge */}
              <div style={{ position: 'absolute', top: '12px', [isAr ? 'right' : 'left']: '12px' }}>
                <ZFSkeletonShimmer width="75px" height="24px" borderRadius="7px" />
              </div>
              {/* Bottom CAD Badge */}
              <div style={{ position: 'absolute', bottom: '10px', [isAr ? 'right' : 'left']: '12px' }}>
                <ZFSkeletonShimmer width="85px" height="20px" borderRadius="6px" />
              </div>
            </div>

            {/* Card Body */}
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <ZFSkeletonShimmer width="80%" height="18px" borderRadius="5px" />
                <ZFSkeletonShimmer width="55%" height="12px" borderRadius="4px" />
              </div>

              {/* Price Line */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <ZFSkeletonShimmer width="120px" height="22px" borderRadius="6px" />
                <ZFSkeletonShimmer width="36px" height="12px" borderRadius="4px" />
              </div>

              {/* Specs Box */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: 'var(--zf-skel-subtle)',
                  border: '1px solid var(--zf-skel-card-border)',
                }}
              >
                <ZFSkeletonShimmer width="100%" height="24px" borderRadius="4px" />
                <ZFSkeletonShimmer width="100%" height="24px" borderRadius="4px" />
                <ZFSkeletonShimmer width="100%" height="24px" borderRadius="4px" />
              </div>

              {/* Actions Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--zf-skel-card-border)',
                  paddingTop: '10px',
                }}
              >
                <div style={{ display: 'flex', gap: '6px' }}>
                  <ZFSkeletonShimmer width="60px" height="28px" borderRadius="7px" />
                  <ZFSkeletonShimmer width="60px" height="28px" borderRadius="7px" />
                </div>
                <ZFSkeletonShimmer width="28px" height="28px" borderRadius="7px" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ZFSkeletonTable;
