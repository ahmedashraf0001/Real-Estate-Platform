'use client';

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
  Banknote,
  Home,
  Layers,
  FileCheck
} from 'lucide-react';
import { Decimal } from '@/lib/erp/math';
import type { Property } from '@/lib/supabase/types';
import type { ERPPropertyCostItem, ERPContract } from '@/lib/erp/types';
import type { SinglePropertyAnalysis } from '@/lib/erp/propertyAnalysisEngine';
import { formatCompactEGP } from '@/lib/erp/propertyAnalysisEngine';
import { ERPApexChart } from '../../charts/ERPApexChart';
import shellStyles from '../../ZFWorkstationShell.module.css';
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

export function getCostCategoryLabel(cat: string, isAr: boolean): string {
  if (!isAr) return cat;
  switch (cat) {
    case 'land_allocation':
      return 'حصة الأرض والتخصيص';
    case 'civil_structure':
      return 'الهيكل الخرساني والحديد';
    case 'labor_subcontractor':
      return 'مصنعيات ومقاولات باطن';
    case 'mep_infrastructure':
      return 'شبكات الكهروميكانيك';
    case 'finishing_interior':
      return 'تشطيبات وديكور داخلي';
    case 'site_facade':
      return 'واجهات ومداخل الموقع';
    case 'permits_engineering':
      return 'تراخيص واستشارات هندسية';
    case 'taxes_fees':
      return 'ضرائب ورسوم حكومية';
    default:
      return 'مصروفات موقع عامة';
  }
}

export function getCostStatusLabel(status: string, isAr: boolean): string {
  if (!isAr) return status;
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'approved':
      return 'معتمد';
    case 'pending':
      return 'قيد المراجعة';
    case 'draft':
      return 'مسودة';
    case 'allocated':
      return 'مخصص';
    case 'paid':
      return 'مسدد';
    case 'partially_paid':
    case 'partially paid':
      return 'مسدد جزئياً';
    case 'logged':
      return 'مسجل';
    default:
      return status;
  }
}

export function getContractStatusLabel(status: string, isAr: boolean): string {
  if (!isAr) return status;
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'active':
      return 'ساري';
    case 'pending':
      return 'قيد المراجعة';
    case 'completed':
      return 'مكتمل';
    case 'cancelled':
    case 'rescinded':
      return 'مفسوخ';
    default:
      return status;
  }
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
  currentAccent = 'var(--erp-accent, #2563eb)',
  isAr = true
}) => {
  // Costs Filter & Pagination State
  const [costCategoryFilter, setCostCategoryFilter] = useState('ALL');
  const [costStatusFilter, setCostStatusFilter] = useState('ALL');
  const [costSearchQuery, setCostSearchQuery] = useState('');
  const [costCurrentPage, setCostCurrentPage] = useState(1);
  const [costPageSize] = useState(8);

  // Tab 3: Costs list for selected property
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

  // Waterfall Chart Options & Series for Tab 2
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
      isAr ? 'القيمة البيعية (RSV)' : 'Total Sales (RSV)',
      isAr ? 'رأس المال المستثمر' : 'Invested Capital',
      isAr ? 'صافي الربح المتوقع' : 'Net Expected Profit',
      isAr ? 'النقدية المحصلة' : 'Collected Cash',
      isAr ? 'الأقساط المستحقة (A/R)' : 'Receivables (A/R)'
    ];

    const data = [
      rsv,
      -invested,
      npv,
      cash,
      ar
    ];

    const colors = [
      'var(--erp-accent, #2563eb)',
      '#e05252',
      '#16a34a',
      '#0ea5e9',
      '#f59e0b'
    ];

    const options: any = {
      chart: {
        type: 'bar',
        toolbar: { show: false },
        fontFamily: 'inherit'
      },
      plotOptions: {
        bar: {
          columnWidth: '42%',
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
          if (absVal >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
          if (absVal >= 1000) return `${(val / 1000).toFixed(0)}K`;
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
  }, [selectedPropertyAnalysis, isAr]);

  if (!selectedProperty || !selectedPropertyAnalysis) {
    return (
      <div className={styles.dossierContainer} dir={isAr ? 'rtl' : 'ltr'}>
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
          {isAr ? 'برجاء اختيار عقار لعرض ملف دورة الحياة ودراسة الجدوى' : 'Please select a property to view lifecycle dossier'}
        </div>
      </div>
    );
  }

  const totalUnits = selectedPropertyAnalysis.totalUnits || 1;
  const soldUnits = selectedPropertyAnalysis.soldUnits;
  const contractingRatePct = totalUnits > 0 ? (soldUnits / totalUnits) * 100 : 0;

  // Breakdown items for construction WIP progress
  const totalCap = selectedPropertyAnalysis.breakdown.totalInvestedCapital.toNumber();
  const constructionCategories = [
    {
      name: isAr ? 'الهيكل الخرساني والحديد' : 'Concrete & Structure',
      amount: selectedPropertyAnalysis.breakdown.structureWip.toNumber(),
      pct: totalCap > 0 ? Math.round((selectedPropertyAnalysis.breakdown.structureWip.toNumber() / totalCap) * 100) : 0,
      color: 'var(--erp-accent, #2563eb)'
    },
    {
      name: isAr ? 'شبكات الكهروميكانيك والمرافق' : 'MEP Infrastructure',
      amount: selectedPropertyAnalysis.breakdown.mepWip.toNumber(),
      pct: totalCap > 0 ? Math.round((selectedPropertyAnalysis.breakdown.mepWip.toNumber() / totalCap) * 100) : 0,
      color: '#0ea5e9'
    },
    {
      name: isAr ? 'التشطيبات المعمارية والواجهات' : 'Finishes & Facades',
      amount: selectedPropertyAnalysis.breakdown.finishingWip.toNumber(),
      pct: totalCap > 0 ? Math.round((selectedPropertyAnalysis.breakdown.finishingWip.toNumber() / totalCap) * 100) : 0,
      color: '#10b981'
    },
    {
      name: isAr ? 'التراخيص الهندسية والرسوم' : 'Permits & Regulatory',
      amount: selectedPropertyAnalysis.breakdown.permitsFees.toNumber(),
      pct: totalCap > 0 ? Math.round((selectedPropertyAnalysis.breakdown.permitsFees.toNumber() / totalCap) * 100) : 0,
      color: '#f59e0b'
    }
  ];

  return (
    <div className={styles.dossierContainer} id="property-dossier-section" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. TOP HEADER WITH UNDERLINE TABS */}
      <div className={styles.dossierHeader}>
        <div className={styles.dossierTitleWrap}>
          <div className={styles.dossierTitleIconSquircle}>
            <Clock size={15} />
          </div>
          <h3 className={styles.dossierTitle}>
            {isAr ? 'ملف العقار ودورة الحياة والجدوى' : 'Property Lifecycle & Feasibility Dossier'}
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
            <span>{isAr ? 'الجدوى المالية وعقود المبيعات' : 'Feasibility & Sales Contracts'}</span>
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
              {selectedPropertyCostList.length}
            </span>
          </button>
        </div>
      </div>

      {/* 2. TAB 1: دورة الحياة والبيانات الهندسية (Full width, no redundant project rail) */}
      {activeDossierTab === 'lifecycle' && (
        <div className={styles.dossierMainStage}>
          {/* 1. Property Hero Card with Engineering Metadata */}
          <div className={styles.heroCard}>
            {selectedProperty.property_images?.[0]?.url ? (
              <img
                src={selectedProperty.property_images[0].url}
                alt={selectedProperty.title_ar || selectedProperty.title_en || ''}
                className={styles.heroImage}
              />
            ) : (
              <div className={styles.heroImagePlaceholder}>
                <Building2 size={32} />
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
                  <span className={`${shellStyles.statusPill} ${shellStyles.statusPillGreen}`}>
                    {selectedPropertyAnalysis.statusLabel}
                  </span>
                </div>

                <div className={styles.heroLocation}>
                  <MapPin size={13} />
                  <span>{selectedProperty.location || (isAr ? 'غير محدد' : 'N/A')}</span>
                </div>

                <p className={styles.heroDescription}>
                  {selectedProperty.description_ar ||
                    selectedProperty.description_en ||
                    (isAr
                      ? `مشروع سكني متكامل يتضمن ${selectedPropertyAnalysis.totalUnits} وحدات سكنية بمواصفات هندسية عالية وتشطيبات فاخرة.`
                      : `Premium residential development featuring ${selectedPropertyAnalysis.totalUnits} luxury units.`)}
                </p>
              </div>

              {/* Engineering Specs Grid (Zero Duplicate Financial Metrics) */}
              <div className={styles.engineeringSpecsGrid}>
                <div className={styles.specBox}>
                  <div>
                    <div className={styles.specLabel}>{isAr ? 'المساحة الإجمالية' : 'Gross Area'}</div>
                    <div className={styles.specValue}>{selectedPropertyAnalysis.areaSqm.toLocaleString()} م²</div>
                  </div>
                  <div className={styles.specIcon}>
                    <Maximize2 size={16} />
                  </div>
                </div>

                <div className={styles.specBox}>
                  <div>
                    <div className={styles.specLabel}>{isAr ? 'إجمالي الوحدات' : 'Total Units'}</div>
                    <div className={styles.specValue}>{selectedPropertyAnalysis.totalUnits} {isAr ? 'وحدة' : 'units'}</div>
                  </div>
                  <div className={styles.specIcon}>
                    <Building2 size={16} />
                  </div>
                </div>

                <div className={styles.specBox}>
                  <div>
                    <div className={styles.specLabel}>{isAr ? 'نوع العقار' : 'Property Type'}</div>
                    <div className={styles.specValue}>
                      {selectedProperty.type === 'building' ? (isAr ? 'عمارة كاملة' : 'Building') :
                       selectedProperty.type === 'villa' ? (isAr ? 'فيلا مستقلة' : 'Villa') :
                       selectedProperty.type === 'duplex' ? (isAr ? 'دوبلكس' : 'Duplex') :
                       (isAr ? 'شقة سكنية' : 'Apartment')}
                    </div>
                  </div>
                  <div className={styles.specIcon}>
                    <Boxes size={16} />
                  </div>
                </div>

                <div className={styles.specBox}>
                  <div>
                    <div className={styles.specLabel}>{isAr ? 'رخصة البناء' : 'Building Permit'}</div>
                    <div className={styles.specValue}>{isAr ? 'معتمدة ومسجلة' : 'Approved'}</div>
                  </div>
                  <div className={styles.specIcon}>
                    <FileCheck size={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Project Lifecycle Milestones Stepper */}
          <div className={styles.timelineCard}>
            <div className={styles.timelineHeader}>
              <div className={styles.timelineTitleWrap}>
                <div className={styles.dossierTitleIconSquircle}>
                  <Clock size={15} />
                </div>
                <h4 className={styles.timelineTitle}>
                  {isAr ? 'مراحل دورة حياة المشروع والاعتمادات الإنشائية' : 'Project Lifecycle Milestones'}
                </h4>
              </div>
            </div>

            <div className={styles.horizontalTimelineTrack}>
              <div className={styles.timelineConnectorLine} />

              {(selectedPropertyAnalysis.milestones || []).map((step, sIdx) => {
                const isStepCompleted = step.status === 'completed';
                const isStepActive = step.status === 'in_progress';

                return (
                  <div key={step.id || sIdx} className={styles.timelineStepItem}>
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
                    <span className={styles.timelineStepTitle}>
                      {isAr ? (step.shortAr || step.titleAr) : (step.shortEn || step.titleEn)}
                    </span>
                    <span className={styles.timelineStepDate}>
                      {step.date || '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Construction & Execution Progress Breakdown */}
          <div className={styles.dossierSectionCard}>
            <div className={styles.sectionCardHeader}>
              <div className={styles.sectionCardTitleWrap}>
                <div className={styles.dossierTitleIconSquircle}>
                  <Wrench size={15} />
                </div>
                <span className={styles.sectionCardTitle}>
                  {isAr ? 'توزيع مراحل التنفيذ الإنشائي والمصروفات الفعلية' : 'Construction Execution & WIP Distribution'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem' }}>
              {constructionCategories.map((cat, idx) => (
                <div key={idx} className={styles.specBox} style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{cat.name}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: cat.color }}>{cat.pct}%</span>
                  </div>
                  <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                    <div style={{ width: `${cat.pct}%`, height: '100%', backgroundColor: cat.color, borderRadius: '9999px' }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                    {formatCompactEGP(cat.amount, isAr)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: الجدوى المالية وعقود المبيعات */}
      {activeDossierTab === 'feasibility' && (
        <div className={styles.feasibilityContainer}>
          {/* Waterfall Financial Feasibility Chart */}
          <div className={styles.dossierSectionCard}>
            <div className={styles.sectionCardHeader}>
              <div className={styles.sectionCardTitleWrap}>
                <div className={styles.dossierTitleIconSquircle}>
                  <TrendingUp size={15} />
                </div>
                <div>
                  <span className={styles.sectionCardTitle}>
                    {isAr ? 'هيكل الجدوى المالية وتوزيع التدفقات النقدية' : 'Financial Feasibility Structure'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    {isAr
                      ? 'مقارنة القيمة البيعية المستهدفة برأس المال والأرباح والمحصل الفعلي'
                      : 'Comparison of target sales, invested capital, net margins, and cash collection'}
                  </span>
                </div>
              </div>
            </div>

            <ERPApexChart
              type="bar"
              series={waterfallChartData.series}
              options={waterfallChartData.options}
              height={280}
              isAr={isAr}
              primaryColor="var(--erp-accent, #2563eb)"
            />
          </div>

          {/* Registered Sales Contracts Table */}
          <div className={styles.contractsTableCard}>
            <div className={styles.contractsTableHeader}>
              <div className={styles.contractsTableTitleWrap}>
                <div className={styles.dossierTitleIconSquircle}>
                  <FileText size={15} />
                </div>
                <h4 className={styles.contractsTableTitle}>
                  {isAr ? 'عقود البيع المبرمة والمسجلة على هذا العقار' : 'Registered Sales Contracts on Property'}
                </h4>
              </div>
              <span className={styles.tabBadge}>
                {selectedPropertyAnalysis.associatedContracts.length} {isAr ? 'عقد رسمي' : 'contracts'}
              </span>
            </div>

            {selectedPropertyAnalysis.associatedContracts.length > 0 ? (
              <table className={styles.contractsTable}>
                <thead>
                  <tr>
                    <th className={styles.contractsTh}>{isAr ? 'رقم العقد' : 'Contract #'}</th>
                    <th className={styles.contractsTh}>{isAr ? 'اسم العميل' : 'Client Name'}</th>
                    <th className={styles.contractsTh}>{isAr ? 'الوحدة' : 'Unit'}</th>
                    <th className={styles.contractsTh}>{isAr ? 'إجمالي العقد' : 'Contract Value'}</th>
                    <th className={styles.contractsTh}>{isAr ? 'المحصل نقداً' : 'Collected'}</th>
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

                    const statusText = getContractStatusLabel(c.status || 'Active', isAr);

                    return (
                      <tr
                        key={c.contract_id}
                        className={styles.contractsRow}
                        onClick={handleInspect}
                      >
                        <td className={styles.contractsTd} style={{ fontWeight: 700 }}>
                          {c.contract_number || c.contract_id.slice(0, 8)}
                        </td>
                        <td className={styles.contractsTd} style={{ fontWeight: 600 }}>
                          {c.buyer_name || (isAr ? 'عميل معتمد' : 'Verified Buyer')}
                        </td>
                        <td className={styles.contractsTd}>
                          {c.building_unit_number || c.unit_id || (isAr ? 'وحدة سكنية' : 'Unit')}
                        </td>
                        <td className={styles.contractsTd} style={{ fontWeight: 800 }}>
                          {formatCompactEGP(c.gross_contract_value, isAr)}
                        </td>
                        <td className={styles.contractsTd} style={{ fontWeight: 800, color: '#16a34a' }}>
                          {formatCompactEGP(c.total_cash_collected, isAr)}
                        </td>
                        <td className={styles.contractsTd}>
                          <span className={`${shellStyles.statusPill} ${c.status === 'Active' ? shellStyles.statusPillGreen : shellStyles.statusPillNeutral}`}>
                            {statusText}
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
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Header & Filter Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div className={styles.dossierTitleIconSquircle}>
                <Coins size={15} />
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Category Filter */}
              <select
                value={costCategoryFilter}
                onChange={(e) => {
                  setCostCategoryFilter(e.target.value);
                  setCostCurrentPage(1);
                }}
                style={{
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155'
                }}
              >
                <option value="ALL">{isAr ? 'كافة التصنيفات' : 'All Categories'}</option>
                <option value="civil_structure">{isAr ? 'الهيكل الخرساني والحديد' : 'Civil & Structure'}</option>
                <option value="mep_infrastructure">{isAr ? 'شبكات الكهروميكانيك' : 'MEP Infrastructure'}</option>
                <option value="finishing_interior">{isAr ? 'تشطيبات وديكور داخلي' : 'Finishing'}</option>
                <option value="permits_engineering">{isAr ? 'تراخيص واستشارات' : 'Permits'}</option>
                <option value="land_allocation">{isAr ? 'حصة الأرض والتخصيص' : 'Land'}</option>
              </select>

              {/* Status Filter */}
              <select
                value={costStatusFilter}
                onChange={(e) => {
                  setCostStatusFilter(e.target.value);
                  setCostCurrentPage(1);
                }}
                style={{
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155'
                }}
              >
                <option value="ALL">{isAr ? 'كافة الحالات' : 'All Statuses'}</option>
                <option value="Approved">{isAr ? 'معتمد' : 'Approved'}</option>
                <option value="Pending">{isAr ? 'قيد المراجعة' : 'Pending'}</option>
                <option value="Paid">{isAr ? 'مسدد' : 'Paid'}</option>
              </select>

              {/* Quick Expense Action Button */}
              <button
                type="button"
                className={styles.addCostBtn}
                onClick={() => {
                  if (onOpenQuickExpense && selectedProperty) {
                    onOpenQuickExpense(selectedProperty.id);
                  } else if (onOpenQuickExpense) {
                    onOpenQuickExpense();
                  }
                }}
              >
                <Plus size={14} />
                <span>{isAr ? 'إضافة مصروف' : 'Add Expense'}</span>
              </button>
            </div>
          </div>

          {/* Costs Table */}
          <div className={styles.contractsTableCard}>
            {filteredCostItems.length > 0 ? (
              <>
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
                    {paginatedCostItems.map((item, idx) => {
                      const categoryLabel = getCostCategoryLabel(item.category || '', isAr);
                      const statusLabel = getCostStatusLabel(item.status || '', isAr);
                      const isApproved = (item.status || '').toLowerCase() === 'approved';

                      return (
                        <tr key={item.item_id || item.id || idx} className={styles.contractsRow}>
                          <td className={styles.contractsTd} style={{ color: '#64748b' }}>
                            {item.logged_date || (item.created_at ? item.created_at.slice(0, 10) : '—')}
                          </td>
                          <td className={styles.contractsTd}>
                            <span
                              style={{
                                fontSize: '0.70rem',
                                fontWeight: 600,
                                padding: '0.12rem 0.45rem',
                                borderRadius: '4px',
                                background: '#f1f5f9',
                                color: '#475569'
                              }}
                            >
                              {categoryLabel}
                            </span>
                          </td>
                          <td className={styles.contractsTd} style={{ fontWeight: 600 }}>
                            {isAr ? item.item_name_ar : (item.item_name_en || item.item_name_ar)}
                          </td>
                          <td className={styles.contractsTd} style={{ color: '#475569' }}>
                            {item.supplier_contractor || '—'}
                          </td>
                          <td className={styles.contractsTd} style={{ fontWeight: 800 }}>
                            {formatCompactEGP(item.total_cost_egp, isAr)}
                          </td>
                          <td className={styles.contractsTd}>
                            <span className={`${shellStyles.statusPill} ${isApproved ? shellStyles.statusPillGreen : shellStyles.statusPillAmber}`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Numeric Pagination */}
                {totalCostPages > 1 && (
                  <div className={styles.paginationRow}>
                    <span>
                      {isAr 
                        ? `صفحة ${costCurrentPage} من ${totalCostPages}`
                        : `Page ${costCurrentPage} of ${totalCostPages}`}
                    </span>
                    <div className={styles.paginationBtnGroup}>
                      <button
                        type="button"
                        className={styles.paginationBtn}
                        onClick={() => setCostCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={costCurrentPage === 1}
                      >
                        {isAr ? '>' : '<'}
                      </button>
                      {Array.from({ length: totalCostPages }, (_, i) => i + 1).map((pg) => (
                        <button
                          key={pg}
                          type="button"
                          className={`${styles.paginationBtn} ${costCurrentPage === pg ? styles.paginationBtnActive : ''}`}
                          onClick={() => setCostCurrentPage(pg)}
                        >
                          {pg}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={styles.paginationBtn}
                        onClick={() => setCostCurrentPage(prev => Math.min(totalCostPages, prev + 1))}
                        disabled={costCurrentPage === totalCostPages}
                      >
                        {isAr ? '<' : '>'}
                      </button>
                    </div>
                  </div>
                )}
              </>
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
