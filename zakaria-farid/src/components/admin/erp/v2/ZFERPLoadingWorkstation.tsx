'use client';

import React from 'react';
import styles from './ZFERPLoadingWorkstation.module.css';

// Safe class resolver: returns hashed CSS module class in browser, or class name in test/SSR
const c = (cls: string) => (styles && (styles as Record<string, string>)[cls]) ? (styles as Record<string, string>)[cls] : cls;

export interface ZFERPLoadingWorkstationProps {
  isAr?: boolean;
  className?: string;
  mode?: 'full' | 'stage';
}

/**
 * Simplistic Stage Skeleton Placeholder (Used for Tab Transitions & Subpage Loading)
 * Renders 4 discrete KPI cards + 1 canonical table skeleton.
 * Fits natively inside the Middle Subpage Container without taking over the shell.
 */
export const ZFERPStageSkeleton: React.FC<{ isAr?: boolean; className?: string }> = ({
  isAr = true,
  className = '',
}) => {
  return (
    <div
      className={`${c('stageWrapper')} ${isAr ? c('rtl') : ''} ${className}`}
      dir={isAr ? 'rtl' : 'ltr'}
      role="status"
      aria-busy="true"
      aria-label={isAr ? 'جاري تحميل محتوى الصفحة' : 'Loading page content'}
      data-erp-stage-skeleton="true"
    >
      {/* 1. Subpage Status Bar Skeleton */}
      <div className={c('subpageBannerSkeleton')}>
        <div className={c('skeletonBlock')} style={{ width: '180px', height: '14px' }} />
        <div className={c('skeletonBlock')} style={{ width: '90px', height: '14px' }} />
      </div>

      {/* 2. Four Discrete Floating KPI Cards */}
      <div className={c('kpiGrid')} data-discrete-kpi-grid="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`kpi-skeleton-${i}`} className={c('kpiCard')} data-discrete-kpi-card="true">
            <div className={c('kpiCardTop')}>
              <div className={`${c('kpiIconSquircle')} ${c('skeletonBlock')}`} />
              <div className={`${c('kpiPill')} ${c('skeletonBlock')}`} />
            </div>
            <div className={c('kpiCardBottom')}>
              <div className={`${c('kpiLabel')} ${c('skeletonBlock')}`} />
              <div className={`${c('kpiValue')} ${c('skeletonBlock')}`} />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Canonical Data Table Skeleton Card */}
      <div className={c('tableCard')} data-canonical-table-skeleton="true">
        {/* Table Toolbar */}
        <div className={c('tableToolbar')}>
          <div className={`${c('tableSearch')} ${c('skeletonBlock')}`} />
          <div className={c('tableFilters')}>
            <div className={`${c('tableFilterBtn')} ${c('skeletonBlock')}`} />
            <div className={`${c('tableFilterBtn')} ${c('skeletonBlock')}`} />
          </div>
        </div>

        {/* Table Header Row */}
        <div className={c('tableHeader')}>
          <div className={`${c('tableHeaderCell')} ${c('skeletonBlock')}`} style={{ width: '20%' }} />
          <div className={`${c('tableHeaderCell')} ${c('skeletonBlock')}`} style={{ width: '25%' }} />
          <div className={`${c('tableHeaderCell')} ${c('skeletonBlock')}`} style={{ width: '20%' }} />
          <div className={`${c('tableHeaderCell')} ${c('skeletonBlock')}`} style={{ width: '15%' }} />
          <div className={`${c('tableHeaderCell')} ${c('skeletonBlock')}`} style={{ width: '20%' }} />
        </div>

        {/* 5 Canonical Rows (~54px each) */}
        {Array.from({ length: 5 }).map((_, rowIdx) => (
          <div key={`row-skeleton-${rowIdx}`} className={c('tableRow')} data-canonical-skeleton-row="true">
            <div className={`${c('tableCell')} ${c('skeletonBlock')}`} style={{ width: '20%' }} />
            <div className={`${c('tableCell')} ${c('skeletonBlock')}`} style={{ width: '25%' }} />
            <div className={`${c('tableCell')} ${c('skeletonBlock')}`} style={{ width: '20%' }} />
            <div className={`${c('tableCell')} ${c('skeletonBlock')}`} style={{ width: '15%' }} />
            <div className={`${c('tableCell')} ${c('skeletonBlock')}`} style={{ width: '20%' }} />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Simplistic Enterprise Workstation Loading Screen (Revamped)
 * Mode 'stage': lightweight skeleton inside stage (no shell unmount, zero fixed overlays).
 * Mode 'full': full-viewport docked workstation blueprint skeleton (cold boot before initial data exists).
 * 0 fake timeouts, 0 glowing dials, 0 slop.
 */
export const ZFERPLoadingWorkstation: React.FC<ZFERPLoadingWorkstationProps> = ({
  isAr = true,
  className = '',
  mode = 'full',
}) => {
  if (mode === 'stage') {
    return <ZFERPStageSkeleton isAr={isAr} className={className} />;
  }

  return (
    <div
      className={`${c('shellSkeleton')} ${isAr ? c('rtl') : ''} ${className}`}
      dir={isAr ? 'rtl' : 'ltr'}
      role="status"
      aria-busy="true"
      aria-label={isAr ? 'جاري تشغيل منصة FIN-OS' : 'Initializing FIN-OS workstation'}
      data-erp-workstation-skeleton="true"
    >
      {/* 1. Docked Sidebar Navigation Dock Skeleton */}
      <aside className={c('sidebarSkeleton')} aria-hidden="true" data-sidebar-skeleton="true">
        <div className={c('sidebarHeader')}>
          <div className={`${c('sidebarSquircle')} ${c('skeletonBlock')}`} />
          <div className={`${c('sidebarTitle')} ${c('skeletonBlock')}`} />
        </div>

        <div className={c('sidebarNavList')}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`nav-skeleton-${i}`} className={c('sidebarNavItem')}>
              <div className={`${c('sidebarNavIcon')} ${c('skeletonBlock')}`} />
              <div className={`${c('sidebarNavLabel')} ${c('skeletonBlock')}`} />
            </div>
          ))}
        </div>

        <div className={c('sidebarFooter')}>
          <div className={`${c('sidebarSquircle')} ${c('skeletonBlock')}`} style={{ width: '24px', height: '24px' }} />
          <div className={c('skeletonBlock')} style={{ width: '80px', height: '12px' }} />
        </div>
      </aside>

      {/* 2. Workspace Column */}
      <div className={c('workspaceSkeleton')}>
        {/* Middle Subpage Section */}
        <section className={c('middleSkeleton')}>
          {/* Flush Header */}
          <header className={c('headerSkeleton')} aria-hidden="true" data-header-skeleton="true">
            <div className={c('headerBreadcrumb')}>
              <div className={c('skeletonBlock')} style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
              <div className={c('skeletonBlock')} style={{ width: '120px', height: '14px' }} />
            </div>
            <div className={c('headerActions')}>
              <div className={`${c('headerActionBtn')} ${c('skeletonBlock')}`} />
              <div className={`${c('headerActionBtn')} ${c('skeletonBlock')}`} />
            </div>
          </header>

          {/* Main Stage Skeleton */}
          <main className={c('stageSkeleton')}>
            <ZFERPStageSkeleton isAr={isAr} />
          </main>
        </section>

        {/* 3. Side Companion Widgets Rail Skeleton */}
        <aside className={c('sideWidgetsSkeleton')} aria-hidden="true" data-side-widgets-skeleton="true">
          <div className={c('sideWidgetsHeader')}>
            <div className={c('skeletonBlock')} style={{ width: '130px', height: '14px' }} />
            <div className={c('skeletonBlock')} style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
          </div>

          <div className={c('sideWidgetCard')}>
            <div className={c('skeletonBlock')} style={{ width: '100px', height: '12px' }} />
            <div className={c('skeletonBlock')} style={{ width: '100%', height: '40px' }} />
            <div className={c('skeletonBlock')} style={{ width: '100%', height: '40px' }} />
          </div>

          <div className={c('sideWidgetCard')}>
            <div className={c('skeletonBlock')} style={{ width: '120px', height: '12px' }} />
            <div className={c('skeletonBlock')} style={{ width: '100%', height: '70px' }} />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ZFERPLoadingWorkstation;
