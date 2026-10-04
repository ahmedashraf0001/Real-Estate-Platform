'use client';

import React, { useState, useMemo } from 'react';
import {
  PieChart as PieChartIcon,
  Building2,
  Search,
  SlidersHorizontal,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { Decimal } from '@/lib/erp/math';
import type { Property } from '@/lib/supabase/types';
import type { SinglePropertyAnalysis } from '@/lib/erp/propertyAnalysisEngine';
import { formatCompactEGP } from '@/lib/erp/propertyAnalysisEngine';
import styles from './PropertyAnalysisSideWidgets.module.css';

interface PropertyAnalysisSideWidgetsProps {
  properties: Property[];
  propertiesAnalysisMap: Map<string, SinglePropertyAnalysis>;
  selectedPropertyId: string | null;
  onSelectProperty: (propertyId: string) => void;
  viewMode: 'portfolio' | 'property';
  onViewModeChange: (mode: 'portfolio' | 'property') => void;
  isAr?: boolean;
}

type SortOption = 'performance' | 'cost' | 'name' | 'newest';

export const PropertyAnalysisSideWidgets: React.FC<PropertyAnalysisSideWidgetsProps> = ({
  properties,
  propertiesAnalysisMap,
  selectedPropertyId,
  onSelectProperty,
  viewMode,
  onViewModeChange,
  isAr = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('performance');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showDirectory, setShowDirectory] = useState(true);
  const [showDistribution, setShowDistribution] = useState(true);

  // ──────────────────────────────────────────────────────────────────────────
  // PRIORITY 1: Operational & Feasibility Risk Alerts (تنبيهات ومخاطر الأداء)
  // ──────────────────────────────────────────────────────────────────────────
  const riskAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      propertyId: string;
      title: string;
      type: 'negative_profit' | 'low_absorption' | 'zero_sales';
      messageAr: string;
      messageEn: string;
      severity: 'red' | 'amber';
      badgeTextAr: string;
      badgeTextEn: string;
    }> = [];

    properties.forEach((p) => {
      const pAnalysis = propertiesAnalysisMap.get(p.id);
      if (!pAnalysis) return;
      const title = (isAr ? p.title_ar : p.title_en) || p.title_ar || p.title_en || (isAr ? 'مشروع عقاري' : 'Property');

      // 1. Deficit / Negative expected profit or negative ROI
      if (pAnalysis.netExpectedProfit.lt(0) || pAnalysis.roiPct.lt(0)) {
        alerts.push({
          id: `${p.id}-deficit`,
          propertyId: p.id,
          title,
          type: 'negative_profit',
          messageAr: `عجز أو صافي ربح تقديري سلبي (${formatCompactEGP(pAnalysis.netExpectedProfit, true)})`,
          messageEn: `Projected deficit (${formatCompactEGP(pAnalysis.netExpectedProfit, false)})`,
          severity: 'red',
          badgeTextAr: 'عجز متوقع',
          badgeTextEn: 'Deficit'
        });
      }
      // 2. Ready for delivery but low sales absorption (< 50% sold)
      else if (
        (p.completion_status === 'ready' || pAnalysis.status === 'ready') &&
        pAnalysis.totalUnits > 0 &&
        pAnalysis.absorptionRatePct.lt(50)
      ) {
        alerts.push({
          id: `${p.id}-stagnant`,
          propertyId: p.id,
          title,
          type: 'low_absorption',
          messageAr: `مشروع مكتمل بنسبة استيعاب ${pAnalysis.absorptionRatePct.toFixed(0)}% فقط (${pAnalysis.remainingUnits} وحدة شاغرة)`,
          messageEn: `Completed project with only ${pAnalysis.absorptionRatePct.toFixed(0)}% absorption (${pAnalysis.remainingUnits} vacant)`,
          severity: 'amber',
          badgeTextAr: 'ركود مخزون',
          badgeTextEn: 'Low Absorption'
        });
      }
      // 3. Significant capital invested (> 500k) with zero sales contracted
      else if (
        pAnalysis.breakdown.totalInvestedCapital.gt(500000) &&
        pAnalysis.soldUnits === 0 &&
        pAnalysis.totalUnits > 0
      ) {
        alerts.push({
          id: `${p.id}-no-sales`,
          propertyId: p.id,
          title,
          type: 'zero_sales',
          messageAr: `رأس مال منفق (${formatCompactEGP(pAnalysis.breakdown.totalInvestedCapital, true)}) دون عقود بيع مبرمة`,
          messageEn: `Incurred capital (${formatCompactEGP(pAnalysis.breakdown.totalInvestedCapital, false)}) with zero sales contracts`,
          severity: 'amber',
          badgeTextAr: 'صفر مبيعات',
          badgeTextEn: 'No Sales'
        });
      }
    });

    return alerts;
  }, [properties, propertiesAnalysisMap, isAr]);

  const hasAlerts = riskAlerts.length > 0;

  // ──────────────────────────────────────────────────────────────────────────
  // PRIORITY 2: Filtered & Sorted Properties List (دليل المشروعات السريع)
  // ──────────────────────────────────────────────────────────────────────────
  const filteredProperties = useMemo(() => {
    let list = properties.filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const title = (p.title_ar || p.title_en || '').toLowerCase();
      const location = (p.location || '').toLowerCase();
      return title.includes(q) || location.includes(q);
    });

    list.sort((a, b) => {
      const anA = propertiesAnalysisMap.get(a.id);
      const anB = propertiesAnalysisMap.get(b.id);

      if (sortBy === 'performance') {
        const roiA = anA?.roiPct.toNumber() || 0;
        const roiB = anB?.roiPct.toNumber() || 0;
        return roiB - roiA;
      }
      if (sortBy === 'cost') {
        const costA = anA?.breakdown.totalInvestedCapital.toNumber() || 0;
        const costB = anB?.breakdown.totalInvestedCapital.toNumber() || 0;
        return costB - costA;
      }
      if (sortBy === 'name') {
        const nameA = isAr ? a.title_ar : a.title_en;
        const nameB = isAr ? b.title_ar : b.title_en;
        return (nameA || '').localeCompare(nameB || '');
      }
      // newest
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    return list;
  }, [properties, propertiesAnalysisMap, searchQuery, sortBy, isAr]);

  // ──────────────────────────────────────────────────────────────────────────
  // PRIORITY 3: Status Distribution Calculations (توزيع حالة العقارات)
  // ──────────────────────────────────────────────────────────────────────────
  const distribution = useMemo(() => {
    let soldCount = 0;
    let constructionCount = 0;
    let readyCount = 0;

    properties.forEach((p) => {
      const pAnalysis = propertiesAnalysisMap.get(p.id);
      const isSold = p.listing_status === 'sold' || pAnalysis?.status === 'sold';
      const isReady = p.completion_status === 'ready' || pAnalysis?.status === 'ready';

      if (isSold) {
        soldCount++;
      } else if (isReady) {
        readyCount++;
      } else {
        constructionCount++;
      }
    });

    const total = properties.length;
    let soldPct = 0;
    let constructionPct = 0;
    let readyPct = 0;

    if (total > 0) {
      soldPct = Math.round((soldCount / total) * 100);
      constructionPct = Math.round((constructionCount / total) * 100);
      readyPct = Math.max(0, 100 - soldPct - constructionPct);
    }

    return {
      total,
      soldCount,
      soldPct,
      constructionCount,
      constructionPct,
      readyCount,
      readyPct
    };
  }, [properties, propertiesAnalysisMap]);

  return (
    <div className={styles.sideWidgetsContainer} dir={isAr ? 'rtl' : 'ltr'}>
      {/* ─── WIDGET 1 (PRIORITY 1: ALERTS / RISKS): تنبيهات ومخاطر الأداء ─── */}
      <div className={styles.widgetCard}>
        <div className={styles.widgetHeader}>
          <div className={styles.widgetTitleWrap}>
            <div className={styles.iconSquircle}>
              {hasAlerts ? (
                <AlertTriangle size={15} color="#d97706" />
              ) : (
                <ShieldCheck size={15} color="var(--erp-accent, #2563eb)" />
              )}
            </div>
            <h4 className={styles.widgetTitle}>
              {isAr ? 'تنبيهات ومخاطر الأداء' : 'Performance & Risk Alerts'}
            </h4>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {hasAlerts ? (
              <span className={styles.pillCountAmber}>
                {riskAlerts.length} {isAr ? 'تنبيه' : 'alerts'}
              </span>
            ) : (
              <span className={styles.pillCountGreen}>
                {isAr ? 'مستقر' : 'Stable'}
              </span>
            )}
            <button
              type="button"
              className={styles.headerToggleBtn}
              onClick={() => setShowAlerts((prev) => !prev)}
              aria-label={showAlerts ? (isAr ? 'طي البطاقة' : 'Collapse') : (isAr ? 'توسيع البطاقة' : 'Expand')}
            >
              <ChevronDown
                size={13}
                style={{
                  transform: showAlerts ? 'none' : 'rotate(180deg)',
                  transition: 'transform 150ms ease'
                }}
              />
            </button>
          </div>
        </div>

        {showAlerts && (
          <>
            {hasAlerts ? (
              <div className={styles.alertsList}>
                {riskAlerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    className={styles.alertItemCard}
                    onClick={() => {
                      onSelectProperty(alert.propertyId);
                      onViewModeChange('property');
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectProperty(alert.propertyId);
                        onViewModeChange('property');
                      }
                    }}
                  >
                    <div className={styles.alertItemLeading}>
                      <div
                        className={
                          alert.severity === 'red'
                            ? styles.alertItemIconRed
                            : styles.alertItemIconAmber
                        }
                      >
                        {alert.severity === 'red' ? (
                          <AlertTriangle size={13} />
                        ) : alert.type === 'low_absorption' ? (
                          <AlertCircle size={13} />
                        ) : (
                          <Clock size={13} />
                        )}
                      </div>
                      <div className={styles.alertItemContent}>
                        <div className={styles.alertItemTitleRow}>
                          <span className={styles.alertItemTitle} title={alert.title}>
                            {alert.title}
                          </span>
                          <span
                            className={
                              alert.severity === 'red'
                                ? styles.alertItemBadgeRed
                                : styles.alertItemBadgeAmber
                            }
                          >
                            {isAr ? alert.badgeTextAr : alert.badgeTextEn}
                          </span>
                        </div>
                        <span className={styles.alertItemDesc}>
                          {isAr ? alert.messageAr : alert.messageEn}
                        </span>
                      </div>
                    </div>
                    <div className={styles.alertItemAction}>
                      {isAr ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.stableAlertBox}>
                <ShieldCheck size={14} color="#059669" />
                <span>
                  {isAr
                    ? 'كافة مؤشرات المشروعات والجدوى مستقرة ضمن النطاق المالي المستهدف'
                    : 'All property feasibility & performance metrics are stable'}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── WIDGET 2 (PRIORITY 2: ACTIONABLE / KEY SUMMARY): دليل المشروعات السريع ─── */}
      <div className={styles.widgetCard}>
        <div className={styles.widgetHeader}>
          <div className={styles.widgetTitleWrap}>
            <div className={styles.iconSquircle}>
              <Building2 size={15} />
            </div>
            <h4 className={styles.widgetTitle}>
              {isAr ? 'دليل المشروعات السريع' : 'Quick Projects Directory'}
            </h4>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className={styles.pillCountNeutral}>
              {filteredProperties.length} {isAr ? 'مشروع' : 'projects'}
            </span>
            <button
              type="button"
              className={styles.headerToggleBtn}
              onClick={() => setShowSortMenu((prev) => !prev)}
              aria-label={isAr ? 'خيارات الترتيب' : 'Sort options'}
            >
              <ChevronDown size={13} />
            </button>
            <button
              type="button"
              className={styles.headerToggleBtn}
              onClick={() => setShowDirectory((prev) => !prev)}
              aria-label={showDirectory ? (isAr ? 'طي البطاقة' : 'Collapse') : (isAr ? 'توسيع البطاقة' : 'Expand')}
            >
              <ChevronDown
                size={13}
                style={{
                  transform: showDirectory ? 'none' : 'rotate(180deg)',
                  transition: 'transform 150ms ease'
                }}
              />
            </button>
          </div>
        </div>

        {showDirectory && (
          <>
            {/* Search & Sort Row */}
            <div className={styles.searchSortRow}>
              <div className={styles.directorySearchInputWrap}>
                <Search size={13} className={styles.directorySearchIcon} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث بالعقار أو الموقع...' : 'Search property or location...'}
                  className={styles.directorySearchInput}
                />
              </div>

              <div className={styles.sortDropdownWrap}>
                <button
                  type="button"
                  className={styles.sortSelectBtn}
                  onClick={() => setShowSortMenu((prev) => !prev)}
                >
                  <SlidersHorizontal size={11} />
                  <span>
                    {sortBy === 'performance'
                      ? isAr ? 'الأداء' : 'Perf'
                      : sortBy === 'cost'
                      ? isAr ? 'المنصرف' : 'Cost'
                      : sortBy === 'name'
                      ? isAr ? 'الاسم' : 'Name'
                      : isAr ? 'الأحدث' : 'Newest'}
                  </span>
                  <ChevronDown size={11} />
                </button>

                {showSortMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      insetInlineEnd: 0,
                      marginTop: '4px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(15,23,42,0.1)',
                      zIndex: 20,
                      minWidth: '120px',
                      overflow: 'hidden'
                    }}
                  >
                    {[
                      { key: 'performance', ar: 'الأداء المالي', en: 'Financial Perf' },
                      { key: 'cost', ar: 'المنصرف الفعلي', en: 'Incurred Cost' },
                      { key: 'name', ar: 'حسب الاسم', en: 'By Name' },
                      { key: 'newest', ar: 'الأحدث أولاً', en: 'Newest First' }
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        style={{
                          width: '100%',
                          padding: '0.4rem 0.65rem',
                          textAlign: 'start',
                          background: sortBy === opt.key ? '#f8fafc' : '#ffffff',
                          border: 'none',
                          fontSize: '0.72rem',
                          fontWeight: sortBy === opt.key ? 700 : 500,
                          color: sortBy === opt.key ? '#0f172a' : '#475569',
                          cursor: 'pointer',
                          display: 'block'
                        }}
                        onClick={() => {
                          setSortBy(opt.key as SortOption);
                          setShowSortMenu(false);
                        }}
                      >
                        {isAr ? opt.ar : opt.en}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* عرض النظرة الكلية للمحفظة Banner */}
            <div
              className={`${styles.overviewBannerCard} ${
                viewMode === 'portfolio' ? styles.directoryCardActive : ''
              }`}
              onClick={() => onViewModeChange('portfolio')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onViewModeChange('portfolio');
                }
              }}
            >
              <div className={styles.overviewBannerLeading}>
                <div className={styles.iconSquircle}>
                  <BarChart3 size={14} />
                </div>
                <div className={styles.overviewBannerTexts}>
                  <span className={styles.overviewBannerTitle}>
                    {isAr ? 'عرض النظرة الكلية للمحفظة' : 'Macro Portfolio Overview'}
                  </span>
                  <span className={styles.overviewBannerSub}>
                    {isAr ? 'التحليلات ومقارنة الاستثمارات' : 'Aggregate Benchmark & Feasibility'}
                  </span>
                </div>
              </div>
              <div className={styles.overviewBannerAction}>
                <span>{isAr ? 'فتح' : 'Open'}</span>
                {isAr ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
              </div>
            </div>

            {/* Directory Cards List */}
            <div className={styles.directoryCardsList}>
              {filteredProperties.length > 0 ? (
                filteredProperties.map((p) => {
                  const pAnalysis = propertiesAnalysisMap.get(p.id);
                  const isSelected = viewMode === 'property' && selectedPropertyId === p.id;
                  const totalUnits = pAnalysis ? pAnalysis.totalUnits : p.building_units?.length || 0;
                  const actualCost = pAnalysis
                    ? pAnalysis.breakdown.totalInvestedCapital
                    : new Decimal(0);

                  const isSold = p.listing_status === 'sold' || pAnalysis?.status === 'sold';
                  const isReady = p.completion_status === 'ready' || pAnalysis?.status === 'ready';
                  const isUnderOffer = p.listing_status === 'under_offer' || pAnalysis?.status === 'under_offer';

                  // Visual progression for the project card
                  const progressPct = isSold ? 100 : isReady ? 85 : 45;

                  const thumbUrl =
                    p.property_images && p.property_images.length > 0
                      ? p.property_images[0].url
                      : null;

                  return (
                    <div
                      key={p.id}
                      className={`${styles.directoryCard} ${
                        isSelected ? styles.directoryCardActive : ''
                      }`}
                      onClick={() => {
                        onSelectProperty(p.id);
                        onViewModeChange('property');
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectProperty(p.id);
                          onViewModeChange('property');
                        }
                      }}
                    >
                      <div className={styles.directoryCardTopRow}>
                        {/* Thumbnail */}
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={p.title_ar || p.title_en || ''}
                            className={styles.directoryCardThumb}
                          />
                        ) : (
                          <div className={styles.directoryCardThumbPlaceholder}>
                            <Building2 size={18} />
                          </div>
                        )}

                        {/* Info */}
                        <div className={styles.directoryCardInfo}>
                          <div className={styles.directoryTitleLine}>
                            <span
                              className={styles.directoryCardTitle}
                              title={isAr ? p.title_ar : p.title_en}
                            >
                              {isAr ? p.title_ar : p.title_en}
                            </span>
                            <span
                              style={{
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                padding: '0.1rem 0.35rem',
                                borderRadius: '6px',
                                background: isSold ? '#f1f5f9' : isReady ? '#ecfdf5' : '#eff6ff',
                                color: isSold ? '#475569' : isReady ? '#059669' : '#0284c7',
                                border: `1px solid ${isSold ? '#cbd5e1' : isReady ? '#a7f3d0' : '#bae6fd'}`,
                                flexShrink: 0
                              }}
                            >
                              {isSold
                                ? isAr ? 'مباع' : 'Sold'
                                : isReady
                                ? isAr ? 'جاهز' : 'Ready'
                                : isUnderOffer
                                ? isAr ? 'محجوز' : 'Reserved'
                                : isAr ? 'قيد الإنشاء' : 'In Progress'}
                            </span>
                          </div>

                          <div className={styles.directoryMetaLine}>
                            <div className={styles.directoryCardLocation}>
                              <MapPin size={10} />
                              <span>{p.location || (isAr ? 'غير محدد' : 'N/A')}</span>
                            </div>
                            <div className={styles.directoryCardUnits}>
                              <Building2 size={10} />
                              <span>{totalUnits} {isAr ? 'وحدة' : 'units'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Progress Row */}
                      <div className={styles.cardProgressRow}>
                        <div className={styles.cardProgressTrack}>
                          <div
                            className={styles.cardProgressBar}
                            style={{
                              width: `${progressPct}%`,
                              backgroundColor: isSold ? '#0284c7' : isReady ? '#10b981' : 'var(--erp-accent, #2563eb)'
                            }}
                          />
                        </div>
                        <span className={styles.cardProgressText}>{progressPct}%</span>
                      </div>

                      {/* Footer (Incurred Capital & Arrow) */}
                      <div className={styles.directoryCardFooter}>
                        <span className={styles.directorySpentLabel}>
                          {isAr ? 'المنصرف الرأسمالي:' : 'Capital Incurred:'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span className={styles.directorySpentAmount}>
                            {formatCompactEGP(actualCost, isAr)}
                          </span>
                          {isAr ? <ChevronLeft size={12} color="#64748b" /> : <ChevronRight size={12} color="#64748b" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2rem 1rem',
                    color: '#64748b',
                    fontSize: '0.78rem'
                  }}
                >
                  {isAr ? 'لا توجد مشاريع تطابق البحث' : 'No properties match search'}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── WIDGET 3 (PRIORITY 3: SUPPLEMENTARY / PROJECTION): توزيع حالة العقارات والوحدات ─── */}
      <div className={styles.widgetCard}>
        <div className={styles.widgetHeader}>
          <div className={styles.widgetTitleWrap}>
            <div className={styles.iconSquircle}>
              <PieChartIcon size={15} />
            </div>
            <h4 className={styles.widgetTitle}>
              {isAr ? 'توزيع حالة العقارات' : 'Property Distribution'}
            </h4>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className={styles.pillCountNeutral}>
              {distribution.total} {isAr ? 'عقار' : 'properties'}
            </span>
            <button
              type="button"
              className={styles.headerToggleBtn}
              onClick={() => setShowDistribution((prev) => !prev)}
              aria-label={showDistribution ? (isAr ? 'طي البطاقة' : 'Collapse') : (isAr ? 'توسيع البطاقة' : 'Expand')}
            >
              <ChevronDown
                size={13}
                style={{
                  transform: showDistribution ? 'none' : 'rotate(180deg)',
                  transition: 'transform 150ms ease'
                }}
              />
            </button>
          </div>
        </div>

        {showDistribution && (
          <>
            {/* Total Properties Summary Box */}
            <div className={styles.totalBox}>
              <div>
                <div className={styles.totalLabel}>
                  {isAr ? 'إجمالي العقارات' : 'Total Properties'}
                </div>
                <div className={styles.totalAmount}>
                  {distribution.total} {isAr ? 'عقار' : 'properties'}
                </div>
              </div>
              <div className={styles.totalIconBox}>
                <Building2 size={20} />
              </div>
            </div>

            {/* Stacked Horizontal Bar */}
            <div className={styles.stackedBarWrap}>
              <div className={styles.stackedBarTrack}>
                {distribution.soldPct > 0 && (
                  <div
                    className={styles.barSegmentSold}
                    style={{ width: `${distribution.soldPct}%` }}
                    title={`${isAr ? 'تم البيع' : 'Sold'}: ${distribution.soldPct}%`}
                  >
                    {distribution.soldPct}%
                  </div>
                )}
                {distribution.constructionPct > 0 && (
                  <div
                    className={styles.barSegmentBlue}
                    style={{ width: `${distribution.constructionPct}%` }}
                    title={`${isAr ? 'قيد الإنشاء' : 'Under Construction'}: ${distribution.constructionPct}%`}
                  >
                    {distribution.constructionPct}%
                  </div>
                )}
                {distribution.readyPct > 0 && (
                  <div
                    className={styles.barSegmentGreen}
                    style={{ width: `${distribution.readyPct}%` }}
                    title={`${isAr ? 'جاهز للتسليم' : 'Ready'}: ${distribution.readyPct}%`}
                  >
                    {distribution.readyPct}%
                  </div>
                )}
              </div>

              {/* Scale Ticks Row */}
              <div className={styles.scaleTicksRow}>
                <span className={styles.scaleTick}>0%</span>
                <span className={styles.scaleTick}>20%</span>
                <span className={styles.scaleTick}>40%</span>
                <span className={styles.scaleTick}>60%</span>
                <span className={styles.scaleTick}>80%</span>
                <span className={styles.scaleTick}>100%</span>
              </div>
            </div>

            {/* Distribution Table */}
            <table className={styles.distributionTable}>
              <thead>
                <tr>
                  <th className={styles.distTheadTh}>{isAr ? 'الحالة' : 'Status'}</th>
                  <th className={styles.distTheadTh}>{isAr ? 'العدد' : 'Count'}</th>
                  <th className={styles.distTheadTh}>{isAr ? 'النسبة' : 'Percentage'}</th>
                </tr>
              </thead>
              <tbody>
                <tr className={styles.distTr}>
                  <td className={styles.distTdStatus}>
                    <span className={styles.statusDotAccent} />
                    <span>{isAr ? 'تم البيع' : 'Sold Out'}</span>
                  </td>
                  <td className={styles.distTdCount}>{distribution.soldCount}</td>
                  <td className={styles.distTdPct}>{distribution.soldPct}%</td>
                </tr>
                <tr className={styles.distTr}>
                  <td className={styles.distTdStatus}>
                    <span className={styles.statusDotBlue} />
                    <span>{isAr ? 'قيد الإنشاء' : 'Under Construction'}</span>
                  </td>
                  <td className={styles.distTdCount}>{distribution.constructionCount}</td>
                  <td className={styles.distTdPct}>{distribution.constructionPct}%</td>
                </tr>
                <tr className={styles.distTr}>
                  <td className={styles.distTdStatus}>
                    <span className={styles.statusDotGreen} />
                    <span>{isAr ? 'جاهز للتسليم' : 'Ready to Handover'}</span>
                  </td>
                  <td className={styles.distTdCount}>{distribution.readyCount}</td>
                  <td className={styles.distTdPct}>{distribution.readyPct}%</td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};
