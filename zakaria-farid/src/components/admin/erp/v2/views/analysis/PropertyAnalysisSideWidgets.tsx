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
  MapPin
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

  // Widget 1: Status Distribution Calculations
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

  // Widget 2: Filtered & Sorted Properties List
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

  return (
    <div className={styles.sideWidgetsContainer} dir={isAr ? 'rtl' : 'ltr'}>
      {/* WIDGET 1: توزيع حالة العقارات والوحدات (media_1790747012111.png) */}
      <div className={styles.widgetCard}>
        <div className={styles.widgetHeader}>
          <div className={styles.widgetTitleWrap}>
            <div className={styles.iconSquircleRed}>
              <PieChartIcon size={16} />
            </div>
            <h4 className={styles.widgetTitle}>
              {isAr ? 'توزيع حالة العقارات والوحدات' : 'Property & Units Distribution'}
            </h4>
          </div>
        </div>

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
            <Building2 size={24} />
          </div>
        </div>

        {/* Stacked Horizontal Bar */}
        <div className={styles.stackedBarWrap}>
          <div className={styles.stackedBarTrack}>
            {distribution.soldPct > 0 && (
              <div
                className={styles.barSegmentRed}
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
                <span className={styles.statusDotRed} />
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
      </div>

      {/* WIDGET 2: دليل المشروعات السريع (media_1790747016468.jpg) */}
      <div className={styles.widgetCard}>
        <div className={styles.widgetHeader}>
          <div className={styles.widgetTitleWrap}>
            <div className={styles.iconSquircleGold}>
              <Building2 size={16} />
            </div>
            <h4 className={styles.widgetTitle}>
              {isAr ? 'دليل المشروعات السريع' : 'Quick Projects Directory'}
            </h4>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className={styles.pillCountGold}>
              {filteredProperties.length} {isAr ? 'مشروع' : 'projects'}
            </span>
            <button
              type="button"
              className={styles.headerToggleBtn}
              onClick={() => setShowSortMenu((prev) => !prev)}
              aria-label="Toggle filter"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* Search & Sort Row */}
        <div className={styles.searchSortRow}>
          <div className={styles.directorySearchInputWrap}>
            <Search size={14} className={styles.directorySearchIcon} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث بالعقار أو الموقع ...' : 'Search property or location...'}
              className={styles.directorySearchInput}
            />
          </div>

          <div className={styles.sortDropdownWrap}>
            <button
              type="button"
              className={styles.sortSelectBtn}
              onClick={() => setShowSortMenu((prev) => !prev)}
            >
              <SlidersHorizontal size={12} />
              <span>
                {sortBy === 'performance'
                  ? isAr ? 'الأداء المالي' : 'Financial Perf'
                  : sortBy === 'cost'
                  ? isAr ? 'المنصرف' : 'Cost'
                  : sortBy === 'name'
                  ? isAr ? 'الاسم' : 'Name'
                  : isAr ? 'الأحدث' : 'Newest'}
              </span>
              <ChevronDown size={12} />
            </button>

            {showSortMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: isAr ? 0 : 'auto',
                  right: isAr ? 'auto' : 0,
                  marginTop: '4px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 20,
                  minWidth: '130px',
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
                      padding: '0.45rem 0.75rem',
                      textAlign: isAr ? 'right' : 'left',
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
            <div className={styles.iconSquircleGold}>
              <BarChart3 size={15} />
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
            <span>{isAr ? 'فتح النظرة الكلية' : 'Open Macro'}</span>
            {isAr ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
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
                  {/* Left Column (Actions & Spent) */}
                  <div className={styles.directoryCardActionCol}>
                    <div className={styles.directorySpentBlock}>
                      <span className={styles.directorySpentLabel}>
                        {isAr ? 'المنصرف المالي' : 'Incurred Cost'}
                      </span>
                      <span className={styles.directorySpentAmount}>
                        {formatCompactEGP(actualCost, isAr)}
                      </span>
                    </div>
                    <div className={styles.directoryArrowBtn}>
                      {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </div>
                  </div>

                  {/* Middle Column (Info) */}
                  <div className={styles.directoryCardInfo}>
                    <div className={styles.directoryTitleLine}>
                      {/* Status Pill */}
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          padding: '0.12rem 0.4rem',
                          borderRadius: '6px',
                          background: isSold
                            ? '#f1f5f9'
                            : isReady
                            ? '#ecfdf5'
                            : '#eff6ff',
                          color: isSold
                            ? '#475569'
                            : isReady
                            ? '#059669'
                            : '#0284c7',
                          border: `1px solid ${
                            isSold ? '#cbd5e1' : isReady ? '#a7f3d0' : '#bae6fd'
                          }`
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
                      <span
                        className={styles.directoryCardTitle}
                        title={isAr ? p.title_ar : p.title_en}
                      >
                        {isAr ? p.title_ar : p.title_en}
                      </span>
                    </div>

                    <div className={styles.directoryCardLocation}>
                      <MapPin size={11} />
                      <span>{p.location || (isAr ? 'غير محدد' : 'N/A')}</span>
                    </div>

                    <div className={styles.directoryCardUnits}>
                      <Building2 size={11} />
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {totalUnits} {isAr ? 'وحدات' : 'units'}
                      </span>
                    </div>
                  </div>

                  {/* Right Column (Thumbnail) */}
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={p.title_ar || p.title_en || ''}
                      className={styles.directoryCardThumb}
                    />
                  ) : (
                    <div
                      className={styles.directoryCardThumb}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8'
                      }}
                    >
                      <Building2 size={20} />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                color: '#64748b',
                fontSize: '0.8rem'
              }}
            >
              {isAr ? 'لا توجد مشاريع تطابق البحث' : 'No properties match search'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
