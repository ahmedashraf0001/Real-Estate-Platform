'use client';

import React, { useState, useMemo } from 'react';
import { Property } from '@/lib/supabase/types';
import { 
  ERPPropertyCostItem, 
  PropertyCostCategory, 
  PropertyLifecyclePhase 
} from '@/lib/erp/types';
import { 
  PROPERTY_COST_CATEGORIES, 
  calculatePropertyAuditMetrics 
} from '@/lib/erp/propertyCostEngine';
import { D, formatEGP, generateUUID } from '@/lib/erp/math';
import { 
  X, 
  Layers, 
  Plus, 
  Trash2, 
  FileText, 
  Building2, 
  ArrowRight, 
  Calendar, 
  HardHat, 
  ShieldCheck, 
  Calculator,
  Search,
  DollarSign,
  Hammer,
  Paintbrush,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ZFModalShell } from './v2/common/ZFModalShell';
import styles from './PropertyLifecycleAuditModal.module.css';

export interface PropertyLifecycleAuditModalProps {
  property: Property | null;
  properties?: Property[];
  allCosts: ERPPropertyCostItem[];
  isAr: boolean;
  onClose: () => void;
  onAddCostItem: (item: ERPPropertyCostItem) => Promise<void>;
  onDeleteCostItem: (itemId: string) => Promise<void>;
  onOpenCalculatorForProperty: (propertyId: string) => void;
}

// Chronological 6-Phase Construction Pipeline
const CHRONOLOGICAL_PHASES: {
  key: PropertyLifecyclePhase;
  stepNum: string;
  nameAr: string;
  nameEn: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  { key: 'planning_permits', stepNum: '١', nameAr: 'التراخيص والتخطيط', nameEn: 'Planning & Permits', icon: FileText, color: 'var(--erp-accent-hover)', bgColor: 'rgba(30, 64, 175, 0.08)', borderColor: 'rgba(30, 64, 175, 0.25)' },
  { key: 'excavation_foundation', stepNum: '٢', nameAr: 'الأساسات والحفر', nameEn: 'Excavation & Footings', icon: Layers, color: '#b45309', bgColor: 'rgba(180, 83, 9, 0.08)', borderColor: 'rgba(180, 83, 9, 0.25)' },
  { key: 'structural_skeleton', stepNum: '٣', nameAr: 'الهيكل والخرسانات', nameEn: 'Structural Skeleton', icon: Building2, color: '#c2410c', bgColor: 'rgba(194, 65, 12, 0.08)', borderColor: 'rgba(194, 65, 12, 0.25)' },
  { key: 'masonry_roughing', stepNum: '٤', nameAr: 'المباني والتأسيس', nameEn: 'Masonry & MEP', icon: Hammer, color: 'var(--erp-accent)', bgColor: 'rgba(184, 144, 62, 0.08)', borderColor: 'rgba(184, 144, 62, 0.25)' },
  { key: 'finishing_interiors', stepNum: '٥', nameAr: 'التشطيبات والديكور', nameEn: 'Finishing & Cladding', icon: Paintbrush, color: '#701a75', bgColor: 'rgba(112, 26, 117, 0.08)', borderColor: 'rgba(112, 26, 117, 0.25)' },
  { key: 'final_inspection_handover', stepNum: '٦', nameAr: 'الجاهزية للتسليم', nameEn: 'Handover & Commissioning', icon: ShieldCheck, color: '#047857', bgColor: 'rgba(4, 120, 87, 0.08)', borderColor: 'rgba(4, 120, 87, 0.25)' },
];

export function PropertyLifecycleAuditModal({
  property,
  properties = [],
  allCosts,
  isAr,
  onClose,
  onAddCostItem,
  onDeleteCostItem,
  onOpenCalculatorForProperty
}: PropertyLifecycleAuditModalProps) {
  // Master Property Selection
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => property?.id || (properties && properties[0]?.id) || '');
  const [propSearchQuery, setPropSearchQuery] = useState('');

  // Master list of properties
  const propertyList = useMemo(() => {
    if (properties.length > 0) return properties;
    return property ? [property] : [];
  }, [properties, property]);

  // Active property resolution
  const activeProperty = useMemo(() => {
    if (properties.length > 0) {
      return properties.find(p => p.id === selectedPropertyId) || property || properties[0];
    }
    return property;
  }, [properties, selectedPropertyId, property]);

  // Filtered properties for master list
  const filteredProperties = useMemo(() => {
    return propertyList.filter(p => {
      if (propSearchQuery.trim()) {
        const q = propSearchQuery.toLowerCase();
        const matchAr = (p.title_ar || '').toLowerCase().includes(q);
        const matchEn = (p.title_en || '').toLowerCase().includes(q);
        const matchLoc = (p.location || '').toLowerCase().includes(q);
        return matchAr || matchEn || matchLoc;
      }
      return true;
    });
  }, [propertyList, propSearchQuery]);

  // WIP spent sum map per property
  const propertyWipMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of propertyList) {
      const costs = allCosts.filter(c => c.property_id === p.id);
      const total = costs.reduce((acc, c) => acc.plus(c.total_cost_egp || '0'), D('0'));
      map.set(p.id, total.toFixed(2));
    }
    return map;
  }, [propertyList, allCosts]);

  // Filter & Search states for Line Items
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination State (8 items per page)
  const ITEMS_PER_PAGE = 8;
  const [currentPage, setCurrentPage] = useState(1);

  const handleSelectProperty = (id: string) => {
    setSelectedPropertyId(id);
    setSelectedPhaseFilter('all');
    setSelectedCategoryFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handlePhaseFilterChange = (phase: string) => {
    setSelectedPhaseFilter(phase);
    setSelectedCategoryFilter('all');
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (cat: string) => {
    setSelectedCategoryFilter(cat);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // New Item Form State
  const [newItemNameAr, setNewItemNameAr] = useState('');
  const [newItemNameEn, setNewItemNameEn] = useState('');
  const [newCategory, setNewCategory] = useState<PropertyCostCategory>('civil_structure');
  const [newPhase, setNewPhase] = useState<PropertyLifecyclePhase>('structural_skeleton');
  const [newSupplier, setNewSupplier] = useState('');
  const [newInvoiceRef, setNewInvoiceRef] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newUnit, setNewUnit] = useState('طن');
  const [newUnitCost, setNewUnitCost] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newSelectedUnitId, setNewSelectedUnitId] = useState<string>('all');

  // Calculate Metrics for the active property
  const metrics = useMemo(() => {
    if (!activeProperty) return null;
    return calculatePropertyAuditMetrics(activeProperty.id, activeProperty.area_sqm || 200, allCosts);
  }, [activeProperty, allCosts]);

  // Dynamic category breakdown reflecting the selected phase filter or whole building
  const activeCategoryBreakdown = useMemo(() => {
    if (!metrics) {
      return {
        byCategory: {} as { [key in PropertyCostCategory]?: { total: string; count: number } },
        totalBase: '0.00',
        itemCount: 0
      };
    }

    if (selectedPhaseFilter === 'all') {
      return {
        byCategory: metrics.byCategory,
        totalBase: metrics.totalLoggedCost,
        itemCount: metrics.itemsCount
      };
    }

    // Filter costs strictly for the currently selected phase
    const phaseCosts = metrics.propertyCosts.filter(c => c.phase === selectedPhaseFilter);
    const byCategory: { [key in PropertyCostCategory]?: { total: string; count: number } } = {};
    let phaseTotal = D(0);

    phaseCosts.forEach(item => {
      const cost = D(item.total_cost_egp || 0);
      phaseTotal = phaseTotal.plus(cost);

      if (!byCategory[item.category]) {
        byCategory[item.category] = { total: '0.00', count: 0 };
      }
      byCategory[item.category]!.total = D(byCategory[item.category]!.total).plus(cost).toFixed(2);
      byCategory[item.category]!.count += 1;
    });

    return {
      byCategory,
      totalBase: phaseTotal.toFixed(2),
      itemCount: phaseCosts.length
    };
  }, [metrics, selectedPhaseFilter]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!metrics) return [];
    return metrics.propertyCosts.filter(item => {
      if (selectedPhaseFilter !== 'all' && item.phase !== selectedPhaseFilter) {
        return false;
      }
      if (selectedCategoryFilter !== 'all' && item.category !== selectedCategoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAr = item.item_name_ar.toLowerCase().includes(q);
        const matchEn = item.item_name_en.toLowerCase().includes(q);
        const matchSupplier = (item.supplier_contractor || '').toLowerCase().includes(q);
        const matchInv = (item.invoice_ref || '').toLowerCase().includes(q);
        if (!matchAr && !matchEn && !matchSupplier && !matchInv) {
          return false;
        }
      }
      return true;
    });
  }, [metrics, selectedPhaseFilter, selectedCategoryFilter, searchQuery]);

  // Paginated items
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  if (!activeProperty || !metrics) return null;

  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemNameAr.trim() || !newUnitCost) return;

    setIsSubmitting(true);
    try {
      const qty = parseFloat(newQuantity) || 1;
      const unitCost = D(newUnitCost).toFixed(2);
      const totalCost = D(qty).times(unitCost).toFixed(2);

      const targetUnit = newSelectedUnitId !== 'all' 
        ? activeProperty.building_units?.find(u => u.unit_id === newSelectedUnitId)
        : undefined;

      const newItem: ERPPropertyCostItem = {
        item_id: generateUUID(),
        property_id: activeProperty.id,
        building_unit_id: targetUnit?.unit_id,
        unit_number: targetUnit?.unit_number,
        is_unit_specific: !!targetUnit,
        category: newCategory,
        phase: newPhase,
        item_name_ar: newItemNameAr.trim(),
        item_name_en: newItemNameEn.trim() || newItemNameAr.trim(),
        supplier_contractor: newSupplier.trim() || undefined,
        invoice_ref: newInvoiceRef.trim() || undefined,
        quantity: qty,
        unit: newUnit.trim() || 'مقطوعية',
        unit_cost_egp: unitCost,
        total_cost_egp: totalCost,
        logged_date: new Date().toISOString().split('T')[0],
        logged_by: 'المهندس المشرف - الإدارة المالية',
        linked_account_code: PROPERTY_COST_CATEGORIES.find(c => c.key === newCategory)?.accountCode || '151000',
        status: 'verified',
        notes: newNotes.trim() || undefined
      };

      await onAddCostItem(newItem);

      // Reset form
      setNewItemNameAr('');
      setNewItemNameEn('');
      setNewSupplier('');
      setNewInvoiceRef('');
      setNewQuantity('1');
      setNewUnitCost('');
      setNewNotes('');
      setNewSelectedUnitId('all');
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to add cost item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryMeta = (catKey: PropertyCostCategory) => {
    return PROPERTY_COST_CATEGORIES.find(c => c.key === catKey) || PROPERTY_COST_CATEGORIES[0];
  };

  return (
    <ZFModalShell
      isOpen={Boolean(activeProperty)}
      onClose={onClose}
      isAr={isAr}
      maxWidth="min(1280px, 96vw)"
      maxHeight="92vh"
      icon={<HardHat size={18} />}
      title={isAr ? 'تكاليف ومراحل العقار' : 'Property Cost Audit'}
      subtitle={isAr ? 'تدقيق تكاليف بنود التنفيذ ومراحل الإنشاء للعقار' : 'Audit property construction costs and lifecycle phases'}
      footer={
        <div className={styles.modalFooter}>
          <div className={styles.footerSummary}>
            {isAr ? (
              <>إجمالي المصاريف الموثقة للعمارة: <strong className={styles.footerSummaryHighlight}>{formatEGP(metrics.totalLoggedCost)}</strong> عبر {metrics.itemsCount} بنداً معتمداً</>
            ) : (
              <>Total audited expenditure: <strong className={styles.footerSummaryHighlight}>{formatEGP(metrics.totalLoggedCost)}</strong> across {metrics.itemsCount} items</>
            )}
          </div>

          <div className={styles.footerActions}>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCalculatorForProperty(activeProperty.id);
              }}
              className={styles.calcBtn}
            >
              <Calculator size={15} />
              <span>{isAr ? 'حاسبة التسعير' : 'Pricing Calculator'}</span>
              <ArrowRight size={13} className={isAr ? styles.rotate180 : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className={styles.formCancelBtn}
            >
              <span>{isAr ? 'إغلاق' : 'Close'}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className={styles.modalBodyGrid}>
        {/* SIDE 1 (MASTER): SEARCHABLE LIST OF PROPERTIES */}
        <div className={styles.masterSidebar}>
          {/* Search Header */}
          <div className={styles.masterSearchWrap}>
            <div className={styles.masterSearchInputWrap}>
              <input
                type="text"
                placeholder={isAr ? 'بحث بالعقار أو الموقع...' : 'Search property or location...'}
                value={propSearchQuery}
                onChange={(e) => setPropSearchQuery(e.target.value)}
                className={`${styles.masterSearchInput} ${isAr ? styles.masterSearchInputRtl : styles.masterSearchInputLtr}`}
              />
              <Search size={15} className={`${styles.masterSearchIcon} ${isAr ? styles.masterSearchIconRtl : styles.masterSearchIconLtr}`} />
            </div>

            <div className={styles.masterCountRow}>
              <span className={styles.masterCountTitle}>{isAr ? 'عقارات المحفظة:' : 'Portfolio Properties:'}</span>
              <span className={styles.masterCountBadge}>
                {filteredProperties.length} {isAr ? 'عقار' : 'properties'}
              </span>
            </div>
          </div>

          {/* Scrollable List of Properties */}
          <div className={styles.masterPropertyList}>
            {filteredProperties.length === 0 ? (
              <div className={styles.masterEmptyText}>
                {isAr ? 'لا توجد عقارات مطابقة' : 'No matching properties'}
              </div>
            ) : (
              filteredProperties.map((p) => {
                const isSelected = p.id === activeProperty.id;
                const wipTotal = propertyWipMap.get(p.id) || '0.00';
                const isReady = p.completion_status === 'ready';

                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProperty(p.id)}
                    className={`${styles.masterPropertyCard} ${isSelected ? styles.masterPropertyCardActive : ''}`}
                  >
                    {/* Top Row: Title & Completion Status */}
                    <div className={styles.masterPropertyTopRow}>
                      <div className={styles.masterPropertyTitleWrap}>
                        <Building2 size={14} className={styles.textAccent} />
                        <span className={styles.masterPropertyTitle}>
                          {isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar)}
                        </span>
                      </div>
                      <span className={isReady ? styles.masterStatusReady : styles.masterStatusProgress}>
                        {isReady ? (isAr ? 'جاهز للتسليم' : 'Ready') : (isAr ? 'قيد الإنشاء' : 'In Progress')}
                      </span>
                    </div>

                    {/* Area & Location */}
                    <div className={styles.masterPropertyMetaText}>
                      {p.area_sqm} م² • {p.location || 'الشرقية'}
                    </div>

                    {/* WIP Cost Footprint */}
                    <div className={styles.masterPropertyFootprint}>
                      <span className={styles.masterPropertyFootprintLabel}>
                        {isAr ? 'المنصرف الفعلي:' : 'WIP Incurred:'}
                      </span>
                      <span className={styles.masterPropertyFootprintVal}>
                        {formatEGP(wipTotal)}
                      </span>
                    </div>

                    {isSelected && (
                      <div className={`${styles.masterCheckBadge} ${isAr ? styles.masterCheckBadgeRtl : styles.masterCheckBadgeLtr}`}>
                        <Check size={11} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SIDE 2 (DETAIL): AUDIT BREAKDOWN, PIPELINE STEPPER, CATEGORIES & TABLE */}
        <div className={styles.scrollBody}>
          {/* Executive KPI Pods */}
          <div className={styles.kpiGrid}>
            {/* Total Incurred Capital */}
            <div className={`${styles.kpiCard} ${styles.kpiCardGold}`}>
              <div className={`${styles.kpiLabel} ${styles.textAccent}`}>
                <div className={`${styles.kpiIconBadge} ${styles.badgeAccent}`}>
                  <DollarSign size={14} />
                </div>
                <span>{isAr ? 'إجمالي المنصرف الفعلي' : 'Total Incurred Logged Cost'}</span>
              </div>
              <div className={`${styles.kpiValue} ${styles.textDark}`}>
                {formatEGP(metrics.totalLoggedCost)} <span className={`${styles.kpiValueUnit} ${styles.textAccent}`}>ج.م</span>
              </div>
              <div className={styles.kpiSub}>
                {isAr ? 'إجمالي المبالغ المنصرفة على هذا العقار' : 'Accumulated expenditure on property'}
              </div>
            </div>

            {/* Actual Cost per Sqm */}
            <div className={`${styles.kpiCard} ${styles.kpiCardNavy}`}>
              <div className={`${styles.kpiLabel} ${styles.textAccent}`}>
                <div className={`${styles.kpiIconBadge} ${styles.badgeBlue}`}>
                  <Building2 size={14} />
                </div>
                <span>{isAr ? 'تكلفة المتر الفعلي للمباني' : 'Actual Cost Per Sqm'}</span>
              </div>
              <div className={`${styles.kpiValue} ${styles.textDark}`}>
                {formatEGP(metrics.costPerSqm)} <span className={`${styles.kpiValueUnit} ${styles.textAccent}`}>ج.م/م²</span>
              </div>
              <div className={styles.kpiSub}>
                {isAr ? `على مساحة إجمالية ${activeProperty.area_sqm} متر مربع` : `Based on ${activeProperty.area_sqm} m² built-up area`}
              </div>
            </div>

            {/* Audited Items Count */}
            <div className={`${styles.kpiCard} ${styles.kpiCardEmerald}`}>
              <div className={`${styles.kpiLabel} ${styles.textGreen}`}>
                <div className={`${styles.kpiIconBadge} ${styles.badgeGreen}`}>
                  <ShieldCheck size={14} />
                </div>
                <span>{isAr ? 'الفواتير والبنود المتسجلة' : 'Audited Invoices & Items'}</span>
              </div>
              <div className={`${styles.kpiValue} ${styles.textGreen}`}>
                {metrics.itemsCount} <span className={`${styles.kpiValueUnit} ${styles.textGreen}`}>{isAr ? 'بند موثق' : 'items'}</span>
              </div>
              <div className={styles.kpiSub}>
                {isAr ? 'مستندة لفواتير ومستخلصات رسمية' : 'Backed by invoices and site audits'}
              </div>
            </div>

            {/* Catalog Benchmark Ratio */}
            <div className={`${styles.kpiCard} ${styles.kpiCardIndigo}`}>
              <div className={`${styles.kpiLabel} ${styles.badgePurple}`}>
                <div className={`${styles.kpiIconBadge} ${styles.badgePurple}`}>
                  <Layers size={14} />
                </div>
                <span>{isAr ? 'إجمالي سعر بيع الشقق' : 'Catalog List Price'}</span>
              </div>
              <div className={`${styles.kpiValue} ${styles.textDark}`}>
                {formatEGP(activeProperty.price_egp)} <span className={styles.kpiValueUnit}>ج.م</span>
              </div>
              <div className={styles.kpiSub}>
                {isAr ? (
                  <>نسبة المصاريف من سعر البيع: <strong className={styles.textAccent}>{D(metrics.totalLoggedCost).dividedBy(activeProperty.price_egp || 1).times(100).toFixed(1)}%</strong></>
                ) : (
                  <>Cost-to-List Ratio: <strong className={styles.textAccent}>{D(metrics.totalLoggedCost).dividedBy(activeProperty.price_egp || 1).times(100).toFixed(1)}%</strong></>
                )}
              </div>
            </div>
          </div>

          {/* 1. Chronological Construction Pipeline */}
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <HardHat size={16} className={styles.textAccent} />
                <span>{isAr ? 'مراحل البناء والتنفيذ' : 'Construction Lifecycle Pipeline'}</span>
                <span className={styles.sectionSub}>
                  ({isAr ? 'اختر مرحلة للتصفية' : 'click stage to filter'})
                </span>
              </div>
              {selectedPhaseFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => handlePhaseFilterChange('all')}
                  className={styles.clearFilterBtn}
                >
                  {isAr ? 'عرض كل المراحل' : 'Show All Phases'}
                </button>
              )}
            </div>

            <div className={styles.pipelineGrid}>
              {CHRONOLOGICAL_PHASES.map((phase) => {
                const phaseData = metrics.byPhase[phase.key];
                const isSelected = selectedPhaseFilter === phase.key;
                const hasCosts = !!phaseData && D(phaseData.total).gt(0);
                const IconComponent = phase.icon;

                return (
                  <button
                    key={phase.key}
                    type="button"
                    onClick={() => handlePhaseFilterChange(isSelected ? 'all' : phase.key)}
                    className={`${styles.pipelineCard} ${isSelected ? styles.pipelineCardActive : ''}`}
                  >
                    {/* Step Number Badge & Icon */}
                    <div className={styles.flexBetween}>
                      <div className={styles.phaseStepBadge}>
                        {phase.stepNum}
                      </div>
                      <div className={styles.phaseIconBadge}>
                        <IconComponent size={14} />
                      </div>
                    </div>

                    {/* Phase Name */}
                    <div className={styles.phaseName}>
                      {isAr ? phase.nameAr : phase.nameEn}
                    </div>

                    {/* Spending Amount */}
                    <div className={`${styles.phaseAmount} ${hasCosts ? styles.textDark : styles.textMuted}`}>
                      {hasCosts ? `${formatEGP(phaseData.total)}` : '—'}
                    </div>

                    {/* Item Count */}
                    <div className={styles.phaseItemsCount}>
                      {phaseData?.count || 0} {isAr ? 'بند مسجل' : 'items'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Spending Distribution by Category */}
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <Layers size={16} className={styles.textAccent} />
                <span>{isAr ? 'توزيع المصاريف حسب نوع الشغل والخامات' : 'Cost Breakdown by Material Category'}</span>
                {selectedPhaseFilter !== 'all' ? (
                  <span className={styles.catBadge}>
                    <span>
                      {isAr 
                        ? `خاص بمرحلة: ${CHRONOLOGICAL_PHASES.find(p => p.key === selectedPhaseFilter)?.nameAr}` 
                        : `Phase: ${CHRONOLOGICAL_PHASES.find(p => p.key === selectedPhaseFilter)?.nameEn}`}
                    </span>
                    <span>•</span>
                    <span>
                      {formatEGP(activeCategoryBreakdown.totalBase)}
                    </span>
                  </span>
                ) : (
                  <span className={styles.sectionSub}>
                    ({isAr ? 'شامل كل مراحل البناء' : 'All Phases Combined'})
                  </span>
                )}
              </div>

              <div className={styles.flexRowGap}>
                {selectedCategoryFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleCategoryFilterChange('all')}
                    className={styles.clearFilterBtn}
                  >
                    {isAr ? 'إلغاء تصفية التصنيف' : 'Clear Category Filter'}
                  </button>
                )}
                {selectedPhaseFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handlePhaseFilterChange('all')}
                    className={styles.clearFilterBtn}
                  >
                    {isAr ? 'عرض إجمالي كل المراحل' : 'Show All Phases'}
                  </button>
                )}
              </div>
            </div>

            {/* Structured Category Grid */}
            <div className={styles.categoryGrid}>
              {PROPERTY_COST_CATEGORIES.map((cat) => {
                const catData = activeCategoryBreakdown.byCategory[cat.key];
                const hasCosts = !!catData && D(catData.total).gt(0);
                const isSelected = selectedCategoryFilter === cat.key;
                const isClickable = hasCosts || selectedPhaseFilter === 'all';
                const pct = hasCosts && D(activeCategoryBreakdown.totalBase).gt(0)
                  ? D(catData.total).dividedBy(activeCategoryBreakdown.totalBase).times(100).toFixed(1) 
                  : '0';

                return (
                  <div
                    key={cat.key}
                    onClick={() => {
                      if (!isClickable && !isSelected) return;
                      handleCategoryFilterChange(isSelected ? 'all' : cat.key);
                    }}
                    className={`${styles.categoryCard} ${isSelected ? styles.categoryCardActive : ''}`}
                  >
                    <div className={styles.flexBetween}>
                      <div className={styles.flexRowGap}>
                        <span className={styles.catDot} />
                        <span className={styles.catTitle}>
                          {isAr ? cat.nameAr : cat.nameEn}
                        </span>
                      </div>
                      <span className={styles.catPctBadge}>
                        {pct}%
                      </span>
                    </div>

                    <div className={styles.flexBetween}>
                      <span className={styles.catAmount}>
                        {hasCosts ? `${formatEGP(catData.total)}` : '—'}
                      </span>
                      <span className={styles.catInvoicesCount}>
                        {catData?.count || 0} {isAr ? 'فواتير' : 'invoices'}
                      </span>
                    </div>

                    {/* Percentage Progress Bar */}
                    <div className={styles.catProgressTrack}>
                      <div 
                        className={styles.catProgressBar}
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Audited Line Items List & Toolbar */}
          <div className={styles.flexColGap}>
            <div className={styles.toolbar}>
              <div className={styles.searchInputWrap}>
                <Search 
                  size={15} 
                  className={`${styles.searchIcon} ${isAr ? styles.masterSearchIconRtl : styles.masterSearchIconLtr}`} 
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={isAr ? 'بحث في اسم البند، المورد، أو رقم الفاتورة...' : 'Search items, suppliers, invoices...'}
                  className={`${styles.searchInput} ${isAr ? styles.masterSearchInputRtl : styles.masterSearchInputLtr}`}
                />
              </div>

              <div className={styles.flexRowGap}>
                <span className={styles.itemCountBadge}>
                  {isAr ? `${filteredItems.length} بند معروض` : `${filteredItems.length} items`}
                </span>

                <button
                  type="button"
                  onClick={() => setShowAddForm(prev => !prev)}
                  className={`${styles.addBtn} ${showAddForm ? styles.addBtnCancel : ''}`}
                >
                  {showAddForm ? <X size={15} /> : <Plus size={15} />}
                  <span>{showAddForm ? (isAr ? 'إلغاء الإضافة' : 'Cancel') : (isAr ? 'تسجيل فاتورة أو خامات جديدة' : 'Log New Material / Cost Item')}</span>
                </button>
              </div>
            </div>

            {/* Inline Add Cost Form Drawer */}
            {showAddForm && (
              <form 
                onSubmit={handleAddNewItem}
                className={styles.addForm}
              >
                <div className={styles.formTitle}>
                  <Plus size={16} />
                  <span>{isAr ? 'تسجيل فاتورة أو خامات جديدة في حساب العمارة' : 'Log New Construction / Material Item'}</span>
                </div>

                <div className={styles.formGrid}>
                  {/* Name AR */}
                  <div>
                    <label className={styles.formLabel}>
                      {isAr ? 'اسم البند / المادة (عربي) *' : 'Item Name (Arabic) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={newItemNameAr}
                      onChange={(e) => setNewItemNameAr(e.target.value)}
                      placeholder={isAr ? 'مثال: توريد حديد عز تسليح 12 طن' : 'e.g. High-Tensile Steel Rebar'}
                      className={styles.formInput}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className={styles.formLabel}>
                      {isAr ? 'نوع الشغل والخامة *' : 'Category *'}
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as PropertyCostCategory)}
                      className={styles.formSelect}
                    >
                      {PROPERTY_COST_CATEGORIES.map(c => (
                        <option key={c.key} value={c.key}>{isAr ? c.nameAr : c.nameEn}</option>
                      ))}
                    </select>
                  </div>

                  {/* Unit Allocation */}
                  {activeProperty.building_units && activeProperty.building_units.length > 0 && (
                    <div>
                      <label className={styles.formLabel}>
                        {isAr ? 'تحميل البند على (شقة محددة أم كامل العمارة) *' : 'Cost Allocation (Unit / General) *'}
                      </label>
                      <select
                        value={newSelectedUnitId}
                        onChange={(e) => setNewSelectedUnitId(e.target.value)}
                        className={styles.formSelect}
                      >
                        <option value="all">{isAr ? 'تكلفة عامة مشتركة (توزع بالنسب على كافة الشقق)' : 'General Shared Building Cost (Apportioned)'}</option>
                        {activeProperty.building_units.map(u => (
                          <option key={u.unit_id} value={u.unit_id}>
                            {isAr ? `خاص بشقة ${u.unit_number} (الدور ${u.floor} - ${u.area_sqm} م²)` : `Specific to Unit ${u.unit_number} (Floor ${u.floor})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Phase */}
                  <div>
                    <label className={styles.formLabel}>
                      {isAr ? 'مرحلة التنفيذ *' : 'Lifecycle Phase *'}
                    </label>
                    <select
                      value={newPhase}
                      onChange={(e) => setNewPhase(e.target.value as PropertyLifecyclePhase)}
                      className={styles.formSelect}
                    >
                      {CHRONOLOGICAL_PHASES.map(p => (
                        <option key={p.key} value={p.key}>{isAr ? p.nameAr : p.nameEn}</option>
                      ))}
                    </select>
                  </div>

                  {/* Supplier / Contractor */}
                  <div>
                    <label className={styles.formLabel}>
                      {isAr ? 'المورد / المقاول المنفذ' : 'Supplier / Contractor'}
                    </label>
                    <input
                      type="text"
                      value={newSupplier}
                      onChange={(e) => setNewSupplier(e.target.value)}
                      placeholder={isAr ? 'مثال: شركة حديد عز للدخيلة' : 'e.g. Ezz Steel / Lafarge'}
                      className={styles.formInput}
                    />
                  </div>

                  {/* Invoice Ref */}
                  <div>
                    <label className={styles.formLabel}>
                      {isAr ? 'رقم الفاتورة / المستخلص' : 'Invoice Ref #'}
                    </label>
                    <input
                      type="text"
                      value={newInvoiceRef}
                      onChange={(e) => setNewInvoiceRef(e.target.value)}
                      placeholder={isAr ? 'INV-2026-004' : 'INV-2026-004'}
                      className={styles.formInput}
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className={styles.formLabel}>
                      {isAr ? 'الكمية *' : 'Quantity *'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      placeholder="1"
                      className={styles.formInput}
                    />
                  </div>

                  {/* Unit Measurement */}
                  <div>
                    <label className={styles.formLabel}>
                      {isAr ? 'وحدة القياس *' : 'Unit *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      placeholder={isAr ? 'طن / م³ / مقطوعية' : 'ton / m³ / lump-sum'}
                      className={styles.formInput}
                    />
                  </div>

                  {/* Unit Cost */}
                  <div>
                    <label className={styles.formLabel}>
                      {isAr ? 'سعر الوحدة بالجنيه *' : 'Unit Cost (EGP) *'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newUnitCost}
                      onChange={(e) => setNewUnitCost(e.target.value)}
                      placeholder="38000"
                      className={styles.formInput}
                    />
                  </div>

                  {/* Notes */}
                  <div className={styles.gridColSpanAll}>
                    <label className={styles.formLabel}>
                      {isAr ? 'ملاحظات هندسية / محاسبية إضافية' : 'Engineering / Ledger Notes'}
                    </label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder={isAr ? 'تم استلام وتفريغ الخامات بالموقع بمعرفة المهندس المشرف' : 'Material received and verified on-site'}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={styles.formFooterActions}>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className={styles.formCancelBtn}
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={styles.formSubmitBtn}
                  >
                    {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ وتوثيق الفاتورة' : 'Confirm & Log Item')}
                  </button>
                </div>
              </form>
            )}

            {/* Dense Audit Table */}
            <div className={styles.tableBox}>
              <div className={styles.tableWrapper}>
                <table className={`${styles.table} ${isAr ? styles.tableRtl : styles.tableLtr}`}>
                  <thead>
                    <tr>
                      <th className={`${styles.th} ${styles.colDate}`}>{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className={`${styles.th} ${styles.colPhaseCat}`}>{isAr ? 'المرحلة والتصنيف' : 'Phase & Category'}</th>
                      <th className={`${styles.th} ${styles.colDesc}`}>{isAr ? 'بيان البند والمواد' : 'Item Description'}</th>
                      <th className={`${styles.th} ${styles.colSupplier}`}>{isAr ? 'المورد / الفاتورة' : 'Supplier / Invoice'}</th>
                      <th className={`${styles.th} ${styles.colQty}`}>{isAr ? 'الكمية' : 'Qty'}</th>
                      <th className={`${styles.th} ${styles.colPrice}`}>{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                      <th className={`${styles.th} ${styles.colTotal}`}>{isAr ? 'إجمالي التكلفة' : 'Total Cost'}</th>
                      <th className={`${styles.th} ${styles.colStatus}`}>{isAr ? 'الحالة' : 'Status'}</th>
                      <th className={`${styles.th} ${styles.colAction}`}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className={styles.emptyTableCell}>
                          {isAr ? 'لا توجد بنود تطابق معايير البحث والتصفية' : 'No items match the selected filter'}
                        </td>
                      </tr>
                    ) : (
                      paginatedItems.map((item) => {
                        const catMeta = getCategoryMeta(item.category);
                        const phaseMeta = CHRONOLOGICAL_PHASES.find(p => p.key === item.phase) || CHRONOLOGICAL_PHASES[0];
                        const PhaseIcon = phaseMeta.icon;

                        return (
                          <tr key={item.item_id} className={styles.tr}>
                            {/* Date */}
                            <td className={`${styles.td} ${styles.cellDate}`}>
                              <div className={styles.cellDateWrap}>
                                <Calendar size={13} color="#94a3b8" />
                                <span>{item.logged_date}</span>
                              </div>
                            </td>

                            {/* Phase & Category: Distinct Visual Badges */}
                            <td className={styles.td}>
                              <div className={styles.flexColGap}>
                                {/* Phase Pill with Icon */}
                                <span className={styles.phasePill}>
                                  <PhaseIcon size={12} />
                                  <span>{isAr ? phaseMeta.nameAr : phaseMeta.nameEn}</span>
                                </span>

                                {/* Category Badge */}
                                <span className={styles.catBadge}>
                                  {isAr ? catMeta.nameAr : catMeta.nameEn}
                                </span>
                              </div>
                            </td>

                            {/* Description */}
                            <td className={`${styles.td} ${styles.colDesc}`}>
                              {item.unit_number && (
                                <span className={styles.unitBadge}>
                                  <Building2 size={11} />
                                  <span>{isAr ? `مخصص لشقة ${item.unit_number}` : `Unit ${item.unit_number}`}</span>
                                </span>
                              )}
                              <div className={styles.itemTitle}>
                                {isAr ? item.item_name_ar : item.item_name_en}
                              </div>
                              {item.notes && (
                                <div className={styles.itemNotes}>
                                  {item.notes}
                                </div>
                              )}
                            </td>

                            {/* Supplier / Invoice */}
                            <td className={styles.td}>
                              <div className={styles.textDark}>{item.supplier_contractor || '—'}</div>
                              {item.invoice_ref && (
                                <div className={styles.textMuted}>
                                  {item.invoice_ref}
                                </div>
                              )}
                            </td>

                            {/* Quantity */}
                            <td className={`${styles.td} ${styles.colQty}`}>
                              {item.quantity} {item.unit}
                            </td>

                            {/* Unit Cost */}
                            <td className={`${styles.td} ${styles.colPrice}`}>
                              {formatEGP(item.unit_cost_egp)}
                            </td>

                            {/* Total Cost */}
                            <td className={`${styles.td} ${styles.colTotal}`}>
                              {formatEGP(item.total_cost_egp)}
                            </td>

                            {/* Status */}
                            <td className={`${styles.td} ${styles.colStatus}`}>
                              <span className={item.status === 'capitalized' ? styles.pillCapitalized : styles.pillVerified}>
                                {item.status === 'capitalized' ? (isAr ? 'مرسمل بالأصول' : 'Capitalized') : (isAr ? 'معتمد وموثق' : 'Verified')}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className={`${styles.td} ${styles.colAction}`}>
                              <button
                                type="button"
                                onClick={() => onDeleteCostItem(item.item_id)}
                                title={isAr ? 'حذف البند' : 'Delete item'}
                                className={styles.trashBtn}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Sleek Pagination Bar */}
              {filteredItems.length > 0 && (
                <div className={styles.paginationRow}>
                  <span className={styles.textMuted}>
                    {isAr 
                      ? `عرض ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} من أصل ${filteredItems.length} بند`
                      : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of ${filteredItems.length} items`}
                  </span>

                  <div className={styles.flexRowGap}>
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={styles.pageBtn}
                    >
                      {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                      <span>{isAr ? 'السابق' : 'Previous'}</span>
                    </button>

                    <span className={styles.textDark}>
                      {currentPage} / {totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={styles.pageBtn}
                    >
                      <span>{isAr ? 'التالي' : 'Next'}</span>
                      {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ZFModalShell>
  );
}
