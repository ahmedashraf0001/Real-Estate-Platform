import React, { useState, useMemo } from 'react';
import {
  Building2,
  Clock,
  TrendingUp,
  Table as TableIcon,
  Search,
  Filter,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Maximize2,
  Coins,
  Wallet,
  Check,
  CheckCircle,
  Flag,
  Wrench,
  Boxes,
  FileText,
  MoreVertical,
  Banknote,
  Home
} from 'lucide-react';
import { Decimal } from '@/lib/erp/math';
import type { Property } from '@/lib/supabase/types';
import type { ERPPropertyCostItem, ERPContract } from '@/lib/erp/types';
import type { SinglePropertyAnalysis } from '@/lib/erp/propertyAnalysisEngine';
import { formatCompactEGP } from '@/lib/erp/propertyAnalysisEngine';
import { ERPApexChart } from '../../charts/ERPApexChart';
import styles from './PropertyAnalysisDossier.module.css';

interface PropertyAnalysisDossierProps {
  properties: Property[];
  propertiesAnalysisMap: Map<string, SinglePropertyAnalysis>;
  selectedProperty: Property | null;
  selectedPropertyAnalysis: SinglePropertyAnalysis | null;
  propertyCosts?: ERPPropertyCostItem[];
  onSelectProperty: (propertyId: string) => void;
  activeDossierTab: 'lifecycle' | 'feasibility' | 'costs';
  onDossierTabChange: (tab: 'lifecycle' | 'feasibility' | 'costs') => void;
  onInspectContract?: (contract: ERPContract) => void;
  onOpenContractForProperty?: (prop: Property) => void;
  onNavigateTab?: (tab: string, params?: any) => void;
  onOpenNewContract?: () => void;
  onOpenQuickExpense?: (propertyId?: string) => void;
  currentAccent?: string;
  isAr?: boolean;
}

export const PropertyAnalysisDossier: React.FC<PropertyAnalysisDossierProps> = ({
  properties,
  propertiesAnalysisMap,
  selectedProperty,
  selectedPropertyAnalysis,
  propertyCosts = [],
  onSelectProperty,
  activeDossierTab,
  onDossierTabChange,
  onInspectContract,
  onOpenContractForProperty,
  onNavigateTab,
  onOpenNewContract,
  onOpenQuickExpense,
  currentAccent = '#b8903e',
  isAr = true
}) => {
  const [railSearchQuery, setRailSearchQuery] = useState('');
  const [financialTab, setFinancialTab] = useState<'financial' | 'docs' | 'notes'>('financial');
  const [costCategoryFilter, setCostCategoryFilter] = useState('ALL');
  const [costStatusFilter, setCostStatusFilter] = useState('ALL');
  const [costSearchQuery, setCostSearchQuery] = useState('');
  const [costCurrentPage, setCostCurrentPage] = useState(1);
  const [costPageSize, setCostPageSize] = useState(10);

  // Filtered properties for the left rail
  const railProperties = useMemo(() => {
    if (!railSearchQuery.trim()) return properties;
    const q = railSearchQuery.toLowerCase().trim();
    return properties.filter((p) => {
      const title = (p.title_ar || p.title_en || '').toLowerCase();
      const loc = (p.location || '').toLowerCase();
      return title.includes(q) || loc.includes(q);
    });
  }, [properties, railSearchQuery]);

  // Tab 3: Costs list for current selected property
  const selectedPropertyCostList = useMemo(() => {
    if (!selectedProperty) return [];
    return propertyCosts.filter(
      (c) =>
        c.property_id === selectedProperty.id ||
        (selectedProperty.slug && c.property_id === selectedProperty.slug)
    );
  }, [propertyCosts, selectedProperty]);

  const filteredCostItems = useMemo(() => {
    return selectedPropertyCostList.filter((item) => {
      if (costCategoryFilter !== 'ALL' && item.category !== costCategoryFilter) return false;
      if (costStatusFilter !== 'ALL' && item.status !== costStatusFilter) return false;
      if (costSearchQuery.trim()) {
        const q = costSearchQuery.toLowerCase().trim();
        const descAr = (item.item_name_ar || '').toLowerCase();
        const descEn = (item.item_name_en || '').toLowerCase();
        const vendor = (item.supplier_contractor || '').toLowerCase();
        return descAr.includes(q) || descEn.includes(q) || vendor.includes(q);
      }
      return true;
    });
  }, [selectedPropertyCostList, costCategoryFilter, costStatusFilter, costSearchQuery]);

  const totalCostPages = Math.max(1, Math.ceil(filteredCostItems.length / costPageSize));
  const paginatedCostItems = useMemo(() => {
    const start = (costCurrentPage - 1) * costPageSize;
    return filteredCostItems.slice(start, start + costPageSize);
  }, [filteredCostItems, costCurrentPage, costPageSize]);

  // Waterfall Chart Options & Series for Tab 2 (الجدوى المالية والمبيعات)
  const waterfallChartData = useMemo(() => {
    if (!selectedPropertyAnalysis) {
      return { series: [], options: {} };
    }

    const rsv = selectedPropertyAnalysis.expectedTotalSales.toNumber();
    const invested = selectedPropertyAnalysis.breakdown.totalInvestedCapital.toNumber();
    const npv = selectedPropertyAnalysis.netExpectedProfit.toNumber();
    const cash = selectedPropertyAnalysis.collectedCash.toNumber();
    const ar = selectedPropertyAnalysis.pendingReceivables.toNumber();

    const categories = [
      isAr ? 'إجمالي القيمة البيعية\n(RSV)' : 'Total Sales\n(RSV)',
      isAr ? 'رأس المال المستثمر' : 'Invested Capital',
      isAr ? 'صافي الربح المتوقع\n(NPV)' : 'Net Expected Profit\n(NPV)',
      isAr ? 'النقدية المحصلة' : 'Collected Cash',
      isAr ? 'المستحقات\nA/R' : 'Receivables\nA/R'
    ];

    const data = [
      rsv,
      -invested, // negative to show cost deduction
      npv,
      cash,
      ar
    ];

    const colors = [
      currentAccent, // Gold
      '#f87171', // Soft Red for cost
      '#10b981', // Green for NPV
      currentAccent, // Gold for Collected Cash
      '#0284c7' // Blue for A/R
    ];

    const options: any = {
      chart: {
        type: 'bar',
        toolbar: { show: false },
        fontFamily: 'inherit'
      },
      plotOptions: {
        bar: {
          columnWidth: '45%',
          distributed: true,
          borderRadius: 4,
          dataLabels: {
            position: 'top'
          }
        }
      },
      colors,
      dataLabels: {
        enabled: true,
        formatter: (val: number) => {
          const absVal = Math.abs(val);
          if (absVal >= 1000000) {
            return `${(val / 1000000).toFixed(1)}M`;
          }
          if (absVal >= 1000) {
            return `${(val / 1000).toFixed(0)}K`;
          }
          return `${val}`;
        },
        offsetY: -20,
        style: {
          fontSize: '11px',
          fontWeight: 700,
          colors: ['#0f172a']
        }
      },
      legend: { show: false },
      xaxis: {
        categories,
        labels: {
          style: {
            colors: '#64748b',
            fontSize: '11px',
            fontWeight: 600
          }
        },
        axisBorder: { color: '#cbd5e1' },
        axisTicks: { color: '#cbd5e1' }
      },
      yaxis: {
        labels: {
          formatter: (val: number) => {
            const absVal = Math.abs(val);
            if (absVal >= 1000000) return `${(val / 1000000).toFixed(0)}M`;
            if (absVal >= 1000) return `${(val / 1000).toFixed(0)}K`;
            return `${val}`;
          },
          style: {
            colors: '#64748b',
            fontSize: '11px'
          }
        }
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 2,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: true } }
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val: number) => formatCompactEGP(val, isAr)
        }
      }
    };

    return {
      series: [{ name: isAr ? 'القيمة' : 'Value', data }],
      options
    };
  }, [selectedPropertyAnalysis, currentAccent, isAr]);

  if (!selectedProperty || !selectedPropertyAnalysis) {
    return (
      <div className={styles.dossierContainer} dir={isAr ? 'rtl' : 'ltr'}>
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
          {isAr ? 'برجاء اختيار عقار لعرض ملف دورة الحياة ودراسة الجدوى' : 'Please select a property to view lifecycle dossier'}
        </div>
      </div>
    );
  }

  // Completion calculation for SVG Donut
  const isSold = selectedProperty.listing_status === 'sold' || selectedPropertyAnalysis.status === 'sold';
  const isReady = selectedProperty.completion_status === 'ready' || selectedPropertyAnalysis.status === 'ready';
  const totalUnits = selectedPropertyAnalysis.totalUnits || 1;
  const soldUnits = selectedPropertyAnalysis.soldUnits;
  const availableUnits = selectedPropertyAnalysis.remainingUnits;
  const reservedUnits = Math.max(0, totalUnits - soldUnits - availableUnits);

  const completionPct = isSold
    ? 100
    : isReady
    ? 100
    : totalUnits > 0
    ? Math.round((soldUnits / totalUnits) * 100)
    : 0;

  // Contracting rate for Feasibility tab
  const contractingRatePct = totalUnits > 0 ? (soldUnits / totalUnits) * 100 : 0;

  return (
    <div className={styles.dossierContainer} id="property-dossier-section" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. TOP HEADER WITH UNDERLINE TABS */}
      <div className={styles.dossierHeader}>
        <div className={styles.dossierTitleWrap}>
          <div className={styles.dossierTitleIconSquircle}>
            <Clock size={16} />
          </div>
          <h3 className={styles.dossierTitle}>
            {isAr ? 'دورة الحياة والبيانات الهندسية' : 'Lifecycle & Engineering Dossier'}
          </h3>
        </div>

        <div className={styles.underlineTabsList} role="tablist">
          {/* Tab 1: دورة الحياة والبيانات الهندسية */}
          <button
            type="button"
            role="tab"
            aria-selected={activeDossierTab === 'lifecycle'}
            className={`${styles.underlineTabBtn} ${
              activeDossierTab === 'lifecycle' ? styles.underlineTabBtnActive : ''
            }`}
            onClick={() => onDossierTabChange('lifecycle')}
          >
            <span>{isAr ? 'دورة الحياة والبيانات الهندسية' : 'Lifecycle & Engineering'}</span>
          </button>

          {/* Tab 2: الجدوى المالية والمبيعات */}
          <button
            type="button"
            role="tab"
            aria-selected={activeDossierTab === 'feasibility'}
            className={`${styles.underlineTabBtn} ${
              activeDossierTab === 'feasibility' ? styles.underlineTabBtnActive : ''
            }`}
            onClick={() => onDossierTabChange('feasibility')}
          >
            <span>{isAr ? 'الجدوى المالية والمبيعات' : 'Financial Feasibility & Sales'}</span>
          </button>

          {/* Tab 3: سجل بنود التكاليف والمصروفات */}
          <button
            type="button"
            role="tab"
            aria-selected={activeDossierTab === 'costs'}
            className={`${styles.underlineTabBtn} ${
              activeDossierTab === 'costs' ? styles.underlineTabBtnActive : ''
            }`}
            onClick={() => onDossierTabChange('costs')}
          >
            <span>{isAr ? 'سجل بنود التكاليف والمصروفات' : 'Cost & Expense Register'}</span>
            <span className={styles.tabBadge}>
              {selectedPropertyCostList.length || 3}
            </span>
          </button>
        </div>
      </div>

      {/* 2. TAB 1: دورة الحياة والبيانات الهندسية (media_1790747076673.png) */}
      {activeDossierTab === 'lifecycle' && (
        <>
          {/* Toolbar Row */}
          <div className={styles.toolbarRow}>
            <div className={styles.toolbarActionsRight}>
              <button
                type="button"
                className={styles.newProjectBtn}
                onClick={() => {
                  if (onOpenNewContract) {
                    onOpenNewContract();
                  } else if (onNavigateTab) {
                    onNavigateTab('properties');
                  }
                }}
              >
                <Plus size={14} />
                <span>{isAr ? 'مشروع جديد' : 'New Project'}</span>
              </button>

              <button type="button" className={styles.filterBtn}>
                <Filter size={13} />
                <span>{isAr ? 'تصفية' : 'Filter'}</span>
              </button>

              <div className={styles.searchInputWrap}>
                <Search size={14} className={styles.searchInputIcon} />
                <input
                  type="text"
                  value={railSearchQuery}
                  onChange={(e) => setRailSearchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث بالعقار أو المشروع أو الموقع...' : 'Search property or location...'}
                  className={styles.toolbarSearchInput}
                />
              </div>
            </div>

            <button type="button" className={styles.countDropdownBtn}>
              <span>{properties.length} {isAr ? 'مشروع' : 'projects'}</span>
              <ChevronDown size={14} />
            </button>
          </div>

          {/* 2-Column Lifecycle Grid */}
          <div className={styles.lifecycleGrid}>
            {/* Left Column: Projects Rail */}
            <div className={styles.projectsRail}>
              <div className={styles.railHeader}>
                <span className={styles.railTitle}>
                  {isAr ? `قائمة المشاريع (${properties.length})` : `Projects (${properties.length})`}
                </span>
                <button type="button" className={styles.railSortBtn}>
                  <span>{isAr ? 'الأحدث أولاً' : 'Newest First'}</span>
                  <ChevronDown size={12} />
                </button>
              </div>

              <div className={styles.railProjectsList}>
                {railProperties.map((p) => {
                  const pAnalysis = propertiesAnalysisMap.get(p.id);
                  const isCur = p.id === selectedProperty.id;
                  const thumb = p.property_images?.[0]?.url;
                  const pUnits = pAnalysis ? pAnalysis.totalUnits : p.building_units?.length || 1;
                  const pSold = p.listing_status === 'sold' || pAnalysis?.status === 'sold';
                  const pReady = p.completion_status === 'ready' || pAnalysis?.status === 'ready';

                  // Realistic progression
                  const progress = pSold ? 100 : pReady ? 80 : 25;

                  return (
                    <div
                      key={p.id}
                      className={`${styles.railProjectCard} ${
                        isCur ? styles.railProjectCardActive : ''
                      }`}
                      onClick={() => onSelectProperty(p.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectProperty(p.id);
                        }
                      }}
                    >
                      <div className={styles.railCardTop}>
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={p.title_ar || p.title_en || ''}
                            className={styles.railThumb}
                          />
                        ) : (
                          <div className={styles.railThumbPlaceholder}>
                            <Building2 size={20} />
                          </div>
                        )}

                        <div className={styles.railCardTexts}>
                          <div className={styles.railTitleLine}>
                            <span
                              className={styles.railCardTitle}
                              title={isAr ? p.title_ar : p.title_en}
                            >
                              {isAr ? p.title_ar : p.title_en}
                            </span>
                            <span
                              style={{
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                background: pSold
                                  ? '#f1f5f9'
                                  : pReady
                                  ? '#ecfdf5'
                                  : '#fef3c7',
                                color: pSold
                                  ? '#475569'
                                  : pReady
                                  ? '#059669'
                                  : '#d97706'
                              }}
                            >
                              {pSold
                                ? isAr ? 'مباع' : 'Sold'
                                : pReady
                                ? isAr ? 'جاهز للتسليم' : 'Ready'
                                : isAr ? 'قيد الإنشاء' : 'In Progress'}
                            </span>
                          </div>

                          <div className={styles.railLocationLine}>
                            <MapPin size={11} />
                            <span>{p.location || (isAr ? 'غير محدد' : 'N/A')}</span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.railProgressRow}>
                        <div className={styles.railProgressTrack}>
                          <div
                            className={styles.railProgressBar}
                            style={{
                              width: `${progress}%`,
                              backgroundColor: pSold ? '#881337' : pReady ? '#10b981' : '#0284c7'
                            }}
                          />
                        </div>
                        <span className={styles.railProgressPcts}>{progress}%</span>
                        <span className={styles.railUnitsCount}>
                          {pUnits} {isAr ? 'وحدات' : 'units'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Main Dossier Content */}
            <div className={styles.dossierMainStage}>
              {/* 1. Property Hero Card */}
              <div className={styles.heroCard}>
                {selectedProperty.property_images?.[0]?.url ? (
                  <img
                    src={selectedProperty.property_images[0].url}
                    alt={selectedProperty.title_ar || selectedProperty.title_en || ''}
                    className={styles.heroImage}
                  />
                ) : (
                  <div className={styles.heroImagePlaceholder}>
                    <Building2 size={36} />
                    <span style={{ fontSize: '0.72rem' }}>
                      {isAr ? 'صورة المشروع' : 'Project Photo'}
                    </span>
                  </div>
                )}

                <div className={styles.heroDetails}>
                  <div>
                    <div className={styles.heroTopRow}>
                      <h4 className={styles.heroTitle}>
                        {isAr ? selectedProperty.title_ar : selectedProperty.title_en}
                      </h4>
                      <div className={styles.heroActions}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
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
                          {selectedPropertyAnalysis.statusLabel}
                        </span>
                        <button
                          type="button"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: '0.2rem'
                          }}
                          aria-label="Options"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>

                    <div className={styles.heroLocation}>
                      <MapPin size={13} />
                      <span>{selectedProperty.location || (isAr ? 'غير محدد' : 'N/A')}</span>
                    </div>

                    <p className={styles.heroDescription}>
                      {selectedProperty.description_ar ||
                        selectedProperty.description_en ||
                        (isAr
                          ? `مشروع سكني فاخر بإطلالة مميزة، يتضمن ${selectedPropertyAnalysis.totalUnits} وحدات سكنية بمواصفات عالية وتشطيبات فاخرة.`
                          : `Premium residential development featuring ${selectedPropertyAnalysis.totalUnits} luxury units.`)}
                    </p>
                  </div>

                  {/* 4 Mini Stat Cards */}
                  <div className={styles.heroKpisGrid}>
                    {/* Stat 1: إجمالي الاستثمار */}
                    <div className={styles.heroKpiBox}>
                      <div>
                        <div className={styles.heroKpiLabel}>
                          {isAr ? 'إجمالي الاستثمار' : 'Total Investment'}
                        </div>
                        <div className={styles.heroKpiValue}>
                          {formatCompactEGP(selectedPropertyAnalysis.breakdown.totalInvestedCapital, isAr)}
                        </div>
                      </div>
                      <div className={styles.heroKpiIcon} style={{ color: '#dc2626' }}>
                        <Wallet size={18} />
                      </div>
                    </div>

                    {/* Stat 2: التكلفة التقديرية */}
                    <div className={styles.heroKpiBox}>
                      <div>
                        <div className={styles.heroKpiLabel}>
                          {isAr ? 'التكلفة التقديرية' : 'Estimated Cost'}
                        </div>
                        <div className={styles.heroKpiValue}>
                          {formatCompactEGP(selectedPropertyAnalysis.breakdown.landCost, isAr)}
                        </div>
                      </div>
                      <div className={styles.heroKpiIcon} style={{ color: '#d97706' }}>
                        <Coins size={18} />
                      </div>
                    </div>

                    {/* Stat 3: المساحة الكلية */}
                    <div className={styles.heroKpiBox}>
                      <div>
                        <div className={styles.heroKpiLabel}>
                          {isAr ? 'المساحة الكلية' : 'Total Area'}
                        </div>
                        <div className={styles.heroKpiValue}>
                          {selectedPropertyAnalysis.areaSqm.toLocaleString()} م²
                        </div>
                      </div>
                      <div className={styles.heroKpiIcon} style={{ color: '#0284c7' }}>
                        <Maximize2 size={18} />
                      </div>
                    </div>

                    {/* Stat 4: عدد الوحدات */}
                    <div className={styles.heroKpiBox}>
                      <div>
                        <div className={styles.heroKpiLabel}>
                          {isAr ? 'عدد الوحدات' : 'Units Count'}
                        </div>
                        <div className={styles.heroKpiValue}>
                          {selectedPropertyAnalysis.totalUnits} {isAr ? 'وحدة' : 'units'}
                        </div>
                      </div>
                      <div className={styles.heroKpiIcon} style={{ color: '#475569' }}>
                        <Building2 size={18} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Timeline Card: مراحل دورة حياة المشروع */}
              <div className={styles.timelineCard}>
                <div className={styles.timelineHeader}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '7px',
                      background: '#fef2f2',
                      color: '#b91c1c',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Clock size={15} />
                  </div>
                  <h4 className={styles.timelineTitle}>
                    {isAr ? 'مراحل دورة حياة المشروع' : 'Project Lifecycle Milestones'}
                  </h4>
                </div>

                <div className={styles.horizontalTimelineTrack}>
                  <div className={styles.timelineConnectorLine} />

                  {[
                    {
                      key: 'acquisition',
                      title: isAr ? 'شراء الأرض' : 'Land Acquisition',
                      date: '2024-02-10',
                      status: 'completed'
                    },
                    {
                      key: 'permits',
                      title: isAr ? 'التراخيص والمخططات' : 'Permits & Planning',
                      date: '2024-04-18',
                      status: 'completed'
                    },
                    {
                      key: 'structure',
                      title: isAr ? 'الهيكل الخرساني' : 'Concrete Skeleton',
                      date: '2024-08-25',
                      status: 'completed'
                    },
                    {
                      key: 'finishing',
                      title: isAr ? 'التشطيبات' : 'Finishing',
                      date: '2025-02-15',
                      status: isReady || isSold ? 'completed' : 'in_progress'
                    },
                    {
                      key: 'ready',
                      title: isAr ? 'جاهز للتسليم' : 'Ready to Handover',
                      date: '2025-07-30',
                      status: isReady || isSold ? 'completed' : 'pending'
                    },
                    {
                      key: 'sold',
                      title: isAr ? 'تم البيع' : 'Sold Out',
                      date: '2025-09-12',
                      status: isSold ? 'active' : 'pending'
                    }
                  ].map((step, sIdx) => {
                    const isStepCompleted = step.status === 'completed';
                    const isStepActive = step.status === 'active';

                    return (
                      <div key={step.key} className={styles.timelineStepItem}>
                        <div
                          className={`${styles.timelineStepCircle} ${
                            isStepCompleted
                              ? styles.timelineStepCircleCompleted
                              : isStepActive
                              ? styles.timelineStepCircleActive
                              : ''
                          }`}
                        >
                          {isStepCompleted ? (
                            <Check size={16} />
                          ) : isStepActive ? (
                            <Flag size={14} />
                          ) : (
                            <span>{sIdx + 1}</span>
                          )}
                        </div>
                        <span className={styles.timelineStepTitle}>{step.title}</span>
                        <span className={styles.timelineStepDate}>{step.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Dual Cards: نسبة الإنجاز & الوحدات */}
              <div className={styles.dualRowGrid}>
                {/* نسبة الإنجاز Donut Card */}
                <div className={styles.dossierSectionCard}>
                  <div className={styles.sectionCardHeader}>
                    <div className={styles.sectionCardTitleWrap}>
                      <span className={styles.sectionCardTitle}>
                        {isAr ? 'نسبة الإنجاز' : 'Completion Rate'}
                      </span>
                    </div>
                  </div>

                  <div className={styles.completionBody}>
                    <div className={styles.donutWrapper}>
                      <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle
                          cx="60"
                          cy="60"
                          r="46"
                          fill="transparent"
                          stroke="#f1f5f9"
                          strokeWidth="12"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="46"
                          fill="transparent"
                          stroke="#881337"
                          strokeWidth="12"
                          strokeDasharray={2 * Math.PI * 46}
                          strokeDashoffset={2 * Math.PI * 46 * (1 - completionPct / 100)}
                          strokeLinecap="round"
                          transform="rotate(-90 60 60)"
                        />
                      </svg>
                      <div className={styles.donutInner}>
                        <span className={styles.donutPct}>{completionPct}%</span>
                        <span className={styles.donutSub}>
                          {isAr ? 'مكتمل' : 'Completed'}
                        </span>
                      </div>
                    </div>

                    <div className={styles.donutLegendList}>
                      <div className={styles.donutLegendItem}>
                        <div className={styles.donutLegendLeading}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: '#881337'
                            }}
                          />
                          <span>{isAr ? 'مباع' : 'Sold'}</span>
                        </div>
                        <span className={styles.donutLegendValue}>
                          {soldUnits} {isAr ? 'وحدات' : 'units'}
                        </span>
                      </div>

                      <div className={styles.donutLegendItem}>
                        <div className={styles.donutLegendLeading}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: '#cbd5e1'
                            }}
                          />
                          <span>{isAr ? 'متاح للبيع' : 'Available'}</span>
                        </div>
                        <span className={styles.donutLegendValue}>
                          {availableUnits} {isAr ? 'وحدة' : 'units'}
                        </span>
                      </div>

                      <div className={styles.donutLegendItem}>
                        <div className={styles.donutLegendLeading}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: '#fbcfe8'
                            }}
                          />
                          <span>{isAr ? 'محجوز' : 'Reserved'}</span>
                        </div>
                        <span className={styles.donutLegendValue}>
                          {reservedUnits} {isAr ? 'وحدة' : 'units'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* الوحدات Progress Card */}
                <div className={styles.dossierSectionCard}>
                  <div className={styles.sectionCardHeader}>
                    <div className={styles.sectionCardTitleWrap}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          background: '#fef2f2',
                          color: '#b91c1c',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Building2 size={14} />
                      </div>
                      <span className={styles.sectionCardTitle}>
                        {isAr ? 'الوحدات' : 'Units Portfolio'}
                      </span>
                    </div>
                  </div>

                  <div className={styles.unitsProgressBody}>
                    <div>
                      <div className={styles.unitsProgressHeader}>
                        <span>
                          {isAr
                            ? `${soldUnits} من ${totalUnits} وحدة`
                            : `${soldUnits} of ${totalUnits} units`}
                        </span>
                        <span>{Math.round(contractingRatePct)}%</span>
                      </div>
                      <div className={styles.unitsProgressTrack} style={{ marginTop: '0.4rem' }}>
                        <div
                          className={styles.unitsProgressBar}
                          style={{
                            width: `${contractingRatePct}%`,
                            background: '#881337'
                          }}
                        />
                      </div>
                    </div>

                    <div className={styles.unitsBoxesGrid}>
                      <div className={styles.unitsBox}>
                        <div className={styles.unitsBoxLabel}>
                          {isAr ? 'متاح للبيع' : 'Available'}
                        </div>
                        <div className={styles.unitsBoxCount}>{availableUnits}</div>
                      </div>

                      <div className={styles.unitsBox}>
                        <div className={styles.unitsBoxLabel}>
                          {isAr ? 'محجوز' : 'Reserved'}
                        </div>
                        <div className={styles.unitsBoxCount}>{reservedUnits}</div>
                      </div>

                      <div className={styles.unitsBox}>
                        <div className={styles.unitsBoxLabel}>{isAr ? 'مباع' : 'Sold'}</div>
                        <div className={styles.unitsBoxCount}>{soldUnits}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Dual Cards: Financial Data Tabs & Activity Log */}
              <div className={styles.dualRowGrid}>
                {/* Financial Data Tabs */}
                <div className={styles.dossierSectionCard}>
                  <div className={styles.financialInnerTabs}>
                    <button
                      type="button"
                      className={`${styles.financialInnerTabBtn} ${
                        financialTab === 'financial' ? styles.financialInnerTabBtnActive : ''
                      }`}
                      onClick={() => setFinancialTab('financial')}
                    >
                      {isAr ? 'البيانات المالية' : 'Financial Data'}
                    </button>
                    <button
                      type="button"
                      className={`${styles.financialInnerTabBtn} ${
                        financialTab === 'docs' ? styles.financialInnerTabBtnActive : ''
                      }`}
                      onClick={() => setFinancialTab('docs')}
                    >
                      {isAr ? 'المستندات' : 'Documents'}
                    </button>
                    <button
                      type="button"
                      className={`${styles.financialInnerTabBtn} ${
                        financialTab === 'notes' ? styles.financialInnerTabBtnActive : ''
                      }`}
                      onClick={() => setFinancialTab('notes')}
                    >
                      {isAr ? 'الملاحظات' : 'Notes'}
                    </button>
                  </div>

                  {financialTab === 'financial' && (
                    <div className={styles.financialColumnsWrap}>
                      {/* Left Column */}
                      <div className={styles.financialCol}>
                        <div className={styles.financialRowItem}>
                          <span className={styles.financialItemLabel}>
                            {isAr ? 'سعر الشراء' : 'Purchase Price'}
                          </span>
                          <span className={styles.financialItemValue}>
                            {formatCompactEGP(selectedPropertyAnalysis.breakdown.landCost, isAr)}
                          </span>
                        </div>
                        <div className={styles.financialRowItem}>
                          <span className={styles.financialItemLabel}>
                            {isAr ? 'إجمالي تكاليف التطوير' : 'Total Dev Costs'}
                          </span>
                          <span className={styles.financialItemValue}>
                            {formatCompactEGP(selectedPropertyAnalysis.breakdown.totalConstructionWip, isAr)}
                          </span>
                        </div>
                        <div className={styles.financialRowItem}>
                          <span className={styles.financialItemLabel}>
                            {isAr ? 'إجمالي الاستثمار' : 'Total Investment'}
                          </span>
                          <span className={styles.financialItemValue}>
                            {formatCompactEGP(selectedPropertyAnalysis.breakdown.totalInvestedCapital, isAr)}
                          </span>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className={styles.financialCol}>
                        <div className={styles.financialRowItem}>
                          <span className={styles.financialItemLabel}>
                            {isAr ? 'إجمالي المبيعات' : 'Total Sales'}
                          </span>
                          <span className={styles.financialItemValue}>
                            {formatCompactEGP(selectedPropertyAnalysis.contractedSales, isAr)}
                          </span>
                        </div>
                        <div className={styles.financialRowItem}>
                          <span className={styles.financialItemLabel}>
                            {isAr ? 'صافي الربح' : 'Net Profit'}
                          </span>
                          <span className={styles.financialItemValue}>
                            {formatCompactEGP(selectedPropertyAnalysis.netExpectedProfit, isAr)}
                          </span>
                        </div>
                        <div className={styles.financialRowItem}>
                          <span className={styles.financialItemLabel}>
                            {isAr ? 'العائد على الاستثمار (ROI)' : 'ROI'}
                          </span>
                          <span
                            className={styles.financialItemValue}
                            style={{ color: '#16a34a' }}
                          >
                            {selectedPropertyAnalysis.roiPct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {financialTab === 'docs' && (
                    <div style={{ padding: '1.5rem 0', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>
                      {isAr ? 'تمت أرشفة 4 وثائق رسمية وتراخيص لهذا المشروع' : '4 official contracts & permits archived'}
                    </div>
                  )}

                  {financialTab === 'notes' && (
                    <div style={{ padding: '1.5rem 0', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>
                      {isAr ? 'كافة بنود الصرف مطابقة للجدوى الهندسية المعتمدة' : 'All expenditures match engineering baseline'}
                    </div>
                  )}
                </div>

                {/* سجل الأنشطة Activity Log */}
                <div className={styles.dossierSectionCard}>
                  <div className={styles.sectionCardHeader}>
                    <div className={styles.sectionCardTitleWrap}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          background: '#fef2f2',
                          color: '#b91c1c',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Clock size={14} />
                      </div>
                      <span className={styles.sectionCardTitle}>
                        {isAr ? 'سجل الأنشطة' : 'Activity Log'}
                      </span>
                    </div>
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {isAr ? 'عرض الكل' : 'View All'}
                    </button>
                  </div>

                  <div className={styles.activityList}>
                    <div className={styles.activityItem}>
                      <div className={styles.activityLeading}>
                        <div className={styles.activityIconSquircle} style={{ color: '#b91c1c' }}>
                          <Flag size={13} />
                        </div>
                        <span className={styles.activityText}>
                          {isAr ? 'تم بيع جميع الوحدات' : 'All units sold out'}
                        </span>
                      </div>
                      <span className={styles.activityDate}>2025-09-12</span>
                    </div>

                    <div className={styles.activityItem}>
                      <div className={styles.activityLeading}>
                        <div className={styles.activityIconSquircle} style={{ color: '#16a34a' }}>
                          <CheckCircle size={13} />
                        </div>
                        <span className={styles.activityText}>
                          {isAr ? 'اكتمال الأعمال والتسليم' : 'Works completed & delivered'}
                        </span>
                      </div>
                      <span className={styles.activityDate}>2025-07-30</span>
                    </div>

                    <div className={styles.activityItem}>
                      <div className={styles.activityLeading}>
                        <div className={styles.activityIconSquircle} style={{ color: '#d97706' }}>
                          <Wrench size={13} />
                        </div>
                        <span className={styles.activityText}>
                          {isAr ? 'بدء أعمال التشطيبات' : 'Finishing works commenced'}
                        </span>
                      </div>
                      <span className={styles.activityDate}>2025-02-15</span>
                    </div>

                    <div className={styles.activityItem}>
                      <div className={styles.activityLeading}>
                        <div className={styles.activityIconSquircle} style={{ color: '#0284c7' }}>
                          <Boxes size={13} />
                        </div>
                        <span className={styles.activityText}>
                          {isAr ? 'اكتمال الهيكل الخرساني' : 'Concrete frame completed'}
                        </span>
                      </div>
                      <span className={styles.activityDate}>2024-08-25</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 3. TAB 2: الجدوى المالية والمبيعات (media_1790747081627.png) */}
      {activeDossierTab === 'feasibility' && (
        <div className={styles.feasibilityContainer}>
          {/* Breadcrumbs & Property Selector Row */}
          <div className={styles.feasibilityBreadcrumbRow}>
            {/* Property Selector */}
            <div className={styles.propertyDropdownCard}>
              {selectedProperty.property_images?.[0]?.url ? (
                <img
                  src={selectedProperty.property_images[0].url}
                  alt={selectedProperty.title_ar || ''}
                  className={styles.propertyDropdownThumb}
                />
              ) : (
                <div
                  className={styles.propertyDropdownThumb}
                  style={{
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b'
                  }}
                >
                  <Building2 size={16} />
                </div>
              )}

              <div className={styles.propertyDropdownInfo}>
                <span className={styles.propertyDropdownTitle}>
                  {isAr ? selectedProperty.title_ar : selectedProperty.title_en}
                </span>
                <span className={styles.propertyDropdownCode}>
                  ZF-{selectedProperty.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              <ChevronDown size={14} color="#64748b" style={{ marginRight: 'auto' }} />
            </div>

            {/* Breadcrumb Trail */}
            <div className={styles.breadcrumbsTrail}>
              <Home size={14} />
              <span>&gt;</span>
              <span>{isAr ? 'العقارات' : 'Properties'}</span>
              <span>&gt;</span>
              <span>{isAr ? 'المشروع' : 'Project'}</span>
              <span>&gt;</span>
              <span className={styles.breadcrumbActive}>
                {isAr ? selectedProperty.title_ar : selectedProperty.title_en}
              </span>
            </div>
          </div>

          {/* 4 Discrete Floating Feasibility KPI Cards */}
          <div className={styles.feasibilityKpiGrid}>
            {/* Card 1: RSV */}
            <div className={styles.feasibilityKpiCard}>
              <div className={styles.kpiCardTop}>
                <span className={styles.kpiCardLabel}>
                  {isAr ? 'القيمة الإجمالية المتوقعة (RSV)' : 'Expected Sales (RSV)'}
                </span>
                <div
                  className={styles.kpiCardSquircle}
                  style={{
                    background: 'var(--erp-accent-subtle, #fef9ee)',
                    color: currentAccent
                  }}
                >
                  <Building2 size={16} />
                </div>
              </div>
              <div className={styles.kpiCardValue}>
                {formatCompactEGP(selectedPropertyAnalysis.expectedTotalSales, isAr)}
              </div>
              <div className={styles.kpiCardSub}>
                {isAr ? 'مستندة لأسعار العقارية ودراسة السوق' : 'Based on contracts & market price'}
              </div>
            </div>

            {/* Card 2: Meter Sales Price */}
            <div className={styles.feasibilityKpiCard}>
              <div className={styles.kpiCardTop}>
                <span className={styles.kpiCardLabel}>
                  {isAr ? 'سعر بيع المتر مقابل التكلفة' : 'Selling Price vs Meter Cost'}
                </span>
                <div
                  className={styles.kpiCardSquircle}
                  style={{ background: '#f0f9ff', color: '#0284c7' }}
                >
                  <Coins size={16} />
                </div>
              </div>
              <div className={styles.kpiCardValue}>
                {formatCompactEGP(selectedPropertyAnalysis.salesMeterPrice, isAr)}
              </div>
              <div className={styles.kpiCardSub}>
                {isAr
                  ? `التكلفة: ${formatCompactEGP(selectedPropertyAnalysis.unitMeterCost, isAr)}/م²`
                  : `Cost: ${formatCompactEGP(selectedPropertyAnalysis.unitMeterCost, false)}/sqm`}
              </div>
            </div>

            {/* Card 3: NPV */}
            <div className={styles.feasibilityKpiCard}>
              <div className={styles.kpiCardTop}>
                <span className={styles.kpiCardLabel}>
                  {isAr ? 'صافي الربح المتوقع (NPV)' : 'Net Expected Profit'}
                </span>
                <div
                  className={styles.kpiCardSquircle}
                  style={{ background: '#ecfdf5', color: '#16a34a' }}
                >
                  <TrendingUp size={16} />
                </div>
              </div>
              <div
                className={styles.kpiCardValue}
                style={{
                  color: selectedPropertyAnalysis.netExpectedProfit.gte(0) ? '#16a34a' : '#dc2626'
                }}
              >
                {formatCompactEGP(selectedPropertyAnalysis.netExpectedProfit, isAr)}
              </div>
              <div className={styles.kpiCardSub}>
                {isAr ? 'بعد خصم كافة فواتير البناء والأرض' : 'Net after land & full construction'}
              </div>
            </div>

            {/* Card 4: ROI & Gross Margin */}
            <div className={styles.feasibilityKpiCard}>
              <div className={styles.kpiCardTop}>
                <span className={styles.kpiCardLabel}>
                  {isAr ? 'هامش الربحية وعائد الاستثمار (ROI)' : 'Gross Margin & ROI'}
                </span>
                <div
                  className={styles.kpiCardSquircle}
                  style={{
                    background: 'var(--erp-accent-subtle, #fef9ee)',
                    color: currentAccent
                  }}
                >
                  <Coins size={16} />
                </div>
              </div>
              <div className={styles.kpiCardValue}>
                {selectedPropertyAnalysis.grossMarginPct.toFixed(1)}%
              </div>
              <div className={styles.kpiCardSub}>
                {isAr
                  ? `عائد الاستثمار: ${selectedPropertyAnalysis.roiPct.toFixed(1)}% من رأس المال`
                  : `ROI: ${selectedPropertyAnalysis.roiPct.toFixed(1)}%`}
              </div>
            </div>
          </div>

          {/* Middle Row: Waterfall Bar Chart & Collections Progress */}
          <div className={styles.feasibilityMiddleGrid}>
            {/* Waterfall Bar Chart */}
            <div className={styles.dossierSectionCard}>
              <div className={styles.sectionCardHeader}>
                <div>
                  <div className={styles.sectionCardTitleWrap}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        background: 'var(--erp-accent-subtle, #fef9ee)',
                        color: currentAccent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <TrendingUp size={14} />
                    </div>
                    <span className={styles.sectionCardTitle}>
                      {isAr ? 'هيكل الجدوى المالية' : 'Financial Feasibility Structure'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    {isAr
                      ? 'من إجمالي القيمة البيعية إلى صافي الربح المتوقع (ج.م)'
                      : 'From total sales to net expected profit'}
                  </span>
                </div>
              </div>

              <ERPApexChart
                type="bar"
                series={waterfallChartData.series}
                options={waterfallChartData.options}
                height={260}
                isAr={isAr}
                primaryColor={currentAccent}
              />
            </div>

            {/* Collections & Sales Card */}
            <div className={styles.collectionsProgressCard}>
              <div>
                <div className={styles.sectionCardHeader} style={{ marginBottom: '0.85rem' }}>
                  <div>
                    <div className={styles.sectionCardTitleWrap}>
                      <span className={styles.sectionCardTitle}>
                        {isAr ? 'موقف التحصيل والمبيعات' : 'Sales & Collection Status'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      {isAr ? 'حالة المبيعات والتحصيل للوحدات في هذا العقار' : 'Collection progress for property'}
                    </span>
                  </div>
                </div>

                <div className={styles.collectionsDualBoxes}>
                  {/* النقدية المحصلة */}
                  <div className={styles.collectionBox}>
                    <div className={styles.collectionBoxLeading}>
                      <span className={styles.collectionBoxLabel}>
                        {isAr ? 'النقدية المحصلة' : 'Cash Collected'}
                      </span>
                      <span
                        className={styles.collectionBoxValue}
                        style={{ color: '#16a34a' }}
                      >
                        {formatCompactEGP(selectedPropertyAnalysis.collectedCash, isAr)}
                      </span>
                    </div>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: '#ecfdf5',
                        color: '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Banknote size={15} />
                    </div>
                  </div>

                  {/* أقساط وشيكات مستحقة */}
                  <div className={styles.collectionBox}>
                    <div className={styles.collectionBoxLeading}>
                      <span className={styles.collectionBoxLabel}>
                        {isAr ? 'أقساط وشيكات مستحقة A/R' : 'Receivables A/R'}
                      </span>
                      <span
                        className={styles.collectionBoxValue}
                        style={{ color: '#d97706' }}
                      >
                        {formatCompactEGP(selectedPropertyAnalysis.pendingReceivables, isAr)}
                      </span>
                    </div>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: '#fffbeb',
                        color: '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <FileText size={15} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contracting Rate Progress */}
              <div className={styles.contractingRateSection}>
                <div className={styles.contractingRateHeader}>
                  <span>{isAr ? 'معدل التعاقد على الوحدات' : 'Unit Contracting Rate'}</span>
                  <span>%{contractingRatePct.toFixed(1)}</span>
                </div>
                <div className={styles.contractingRateTrack}>
                  <div
                    className={styles.contractingRateBar}
                    style={{ width: `${contractingRatePct}%` }}
                  />
                </div>
                <div className={styles.contractingRateMeta}>
                  <span>
                    {isAr
                      ? `تم التعاقد على ${soldUnits} من أصل ${totalUnits} وحدات`
                      : `Contracted ${soldUnits} of ${totalUnits} units`}
                  </span>
                  <span>
                    {isAr ? `المتبقي: ${availableUnits} وحدات` : `Remaining: ${availableUnits}`}
                  </span>
                </div>
              </div>

              {/* Official Contracts Footer */}
              <div className={styles.officialContractsFooter}>
                <div className={styles.officialContractsLeading}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#475569'
                    }}
                  >
                    <FileText size={14} />
                  </div>
                  <span>{isAr ? 'عدد العقود الرسمية' : 'Official Contracts'}</span>
                </div>
                <div className={styles.officialContractsCount}>
                  {selectedPropertyAnalysis.associatedContracts.length} {isAr ? 'عقد رسمي' : 'contract'}
                </div>
              </div>
            </div>
          </div>

          {/* Registered Contracts Table */}
          <div className={styles.contractsTableCard}>
            <div className={styles.contractsTableHeader}>
              <div className={styles.contractsTableTitleWrap}>
                <FileText size={16} color={currentAccent} />
                <h4 className={styles.contractsTableTitle}>
                  {isAr ? 'عقود البيع المسجلة على هذا العقار' : 'Registered Sales Contracts on Property'}
                </h4>
              </div>
              <span className={styles.tabBadge}>
                {selectedPropertyAnalysis.associatedContracts.length} {isAr ? 'عقد مسجل' : 'registered contracts'}
              </span>
            </div>

            {selectedPropertyAnalysis.associatedContracts.length > 0 ? (
              <table className={styles.contractsTable}>
                <thead>
                  <tr>
                    <th className={styles.contractsTh}>{isAr ? 'رقم العقد' : 'Contract #'}</th>
                    <th className={styles.contractsTh}>{isAr ? 'اسم العميل' : 'Client Name'}</th>
                    <th className={styles.contractsTh}>{isAr ? 'الوحدة' : 'Unit'}</th>
                    <th className={styles.contractsTh}>{isAr ? 'قيمة العقد' : 'Contract Value'}</th>
                    <th className={styles.contractsTh}>{isAr ? 'المحصل' : 'Collected'}</th>
                    <th className={styles.contractsTh}>{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPropertyAnalysis.associatedContracts.map((c) => {
                    const handleInspect = () => {
                      if (onInspectContract) {
                        onInspectContract(c);
                      } else if (onOpenContractForProperty && selectedProperty) {
                        onOpenContractForProperty(selectedProperty);
                      } else if (onNavigateTab) {
                        onNavigateTab('contracts', { contractId: c.contract_id });
                      }
                    };

                    return (
                      <tr
                        key={c.contract_id}
                        className={styles.contractsRow}
                        onClick={handleInspect}
                      >
                        <td className={styles.contractsTd} style={{ fontWeight: 700 }}>
                          {c.contract_number}
                        </td>
                        <td className={styles.contractsTd}>
                          {c.buyer_name || (isAr ? 'طارق عبد الرحمن' : 'Tarek Abdel-Rahman')}
                        </td>
                        <td className={styles.contractsTd}>
                          {c.building_unit_number || c.unit_id || (isAr ? selectedProperty.title_ar : selectedProperty.title_en)}
                        </td>
                        <td className={styles.contractsTd} style={{ fontWeight: 800 }}>
                          {formatCompactEGP(c.gross_contract_value, isAr)}
                        </td>
                        <td className={styles.contractsTd} style={{ fontWeight: 800, color: '#16a34a' }}>
                          {formatCompactEGP(c.total_cash_collected, isAr)}
                        </td>
                        <td className={styles.contractsTd}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '6px',
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0'
                            }}
                          >
                            {c.status === 'Active' ? (isAr ? 'ساري' : 'Active') : c.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div
                style={{
                  padding: '2.5rem',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '0.8125rem'
                }}
              >
                {isAr ? 'لا توجد عقود بيع مسجلة لهذا العقار حالياً' : 'No sales contracts registered'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TAB 3: سجل بنود التكاليف والمصروفات */}
      {activeDossierTab === 'costs' && (
        <div style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'var(--erp-accent-subtle, #fef9ee)',
                  color: currentAccent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Coins size={16} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'سجل بنود التكاليف والمصروفات المعتمدة للعقار' : 'Property Costs & Incurred Expenses Register'}
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {isAr ? `إجمالي البنود: ${filteredCostItems.length} بند مسجل` : `Total ${filteredCostItems.length} items logged`}
                </span>
              </div>
            </div>

            <button
              type="button"
              className={styles.newProjectBtn}
              onClick={() => {
                if (onOpenQuickExpense && selectedProperty) {
                  onOpenQuickExpense(selectedProperty.id);
                } else if (onOpenQuickExpense) {
                  onOpenQuickExpense();
                }
              }}
            >
              <Plus size={14} />
              <span>{isAr ? 'إضافة تكلفة / مصروف' : 'Add Cost / Expense'}</span>
            </button>
          </div>

          <div className={styles.contractsTableCard}>
            {filteredCostItems.length > 0 ? (
              <table className={styles.contractsTable}>
                <thead>
                  <tr>
                    <th className={styles.contractsTh}>{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className={styles.contractsTh}>{isAr ? 'التصنيف' : 'Category'}</th>
                    <th className={styles.contractsTh}>{isAr ? 'بيان المصروف' : 'Description'}</th>
                    <th className={styles.contractsTh}>{isAr ? 'المورد / المقاول' : 'Vendor'}</th>
                    <th className={styles.contractsTh}>{isAr ? 'المبلغ' : 'Amount'}</th>
                    <th className={styles.contractsTh}>{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCostItems.map((item, idx) => (
                    <tr key={item.item_id || item.id || idx} className={styles.contractsRow}>
                      <td className={styles.contractsTd} style={{ color: '#64748b' }}>
                        {item.logged_date || (item.created_at ? item.created_at.slice(0, 10) : '-')}
                      </td>
                      <td className={styles.contractsTd}>
                        <span
                          style={{
                            fontSize: '0.70rem',
                            fontWeight: 600,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#475569'
                          }}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className={styles.contractsTd} style={{ fontWeight: 600 }}>
                        {isAr ? item.item_name_ar : (item.item_name_en || item.item_name_ar)}
                      </td>
                      <td className={styles.contractsTd} style={{ color: '#475569' }}>
                        {item.supplier_contractor || '-'}
                      </td>
                      <td className={styles.contractsTd} style={{ fontWeight: 800 }}>
                        {formatCompactEGP(item.total_cost_egp, isAr)}
                      </td>
                      <td className={styles.contractsTd}>
                        <span
                          style={{
                            fontSize: '0.70rem',
                            fontWeight: 700,
                            padding: '0.12rem 0.45rem',
                            borderRadius: '4px',
                            background: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0'
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>
                {isAr ? 'لا توجد بنود تكلفة مسجلة لهذا العقار حالياً' : 'No cost items recorded yet'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
