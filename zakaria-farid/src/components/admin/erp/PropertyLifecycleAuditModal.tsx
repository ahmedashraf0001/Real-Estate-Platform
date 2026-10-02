'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Property } from '@/lib/supabase/types';
import { 
  ERPPropertyCostItem, 
  PropertyCostCategory, 
  PropertyLifecyclePhase 
} from '@/lib/erp/types';
import { 
  PROPERTY_COST_CATEGORIES, 
  PROPERTY_LIFECYCLE_PHASES,
  calculatePropertyAuditMetrics 
} from '@/lib/erp/propertyCostEngine';
import { D, generateUUID } from '@/lib/erp/math';
import {
  Layers,
  Plus,
  X,
  FileText,
  Building2,
  HardHat,
  ShieldCheck,
  Calculator,
  Search,
  Hammer,
  Paintbrush,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { ZFModalShell } from './v2/common/ZFModalShell';
import p from './v2/common/ZFModalPrimitives.module.css';

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
}[] = [
  { key: 'planning_permits', stepNum: '١', nameAr: 'التراخيص والتخطيط', nameEn: 'Planning & Permits', icon: FileText },
  { key: 'excavation_foundation', stepNum: '٢', nameAr: 'الأساسات والحفر', nameEn: 'Excavation & Footings', icon: Layers },
  { key: 'structural_skeleton', stepNum: '٣', nameAr: 'الهيكل والخرسانات', nameEn: 'Structural Skeleton', icon: Building2 },
  { key: 'masonry_roughing', stepNum: '٤', nameAr: 'المباني والتأسيس', nameEn: 'Masonry & MEP', icon: Hammer },
  { key: 'finishing_interiors', stepNum: '٥', nameAr: 'التشطيبات والديكور', nameEn: 'Finishing & Cladding', icon: Paintbrush },
  { key: 'final_inspection_handover', stepNum: '٦', nameAr: 'الجاهزية للتسليم', nameEn: 'Handover & Commissioning', icon: ShieldCheck },
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
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [propSearchQuery, setPropSearchQuery] = useState('');

  // Auto-initialize selected property
  useEffect(() => {
    if (property && property.id) {
      setSelectedPropertyId(property.id);
    } else if (properties.length > 0 && (!selectedPropertyId || !properties.some(p => p.id === selectedPropertyId))) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [property, properties]);

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

  // Reset pagination on filter or property switch
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedPhaseFilter, selectedCategoryFilter, selectedPropertyId]);

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

  // Reset filters when switching properties in the master sidebar
  useEffect(() => {
    setSelectedPhaseFilter('all');
    setSelectedCategoryFilter('all');
    setSearchQuery('');
  }, [selectedPropertyId]);

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

  const getPhaseMeta = (phaseKey: PropertyLifecyclePhase) => {
    return PROPERTY_LIFECYCLE_PHASES.find(p => p.key === phaseKey) || PROPERTY_LIFECYCLE_PHASES[0];
  };

  // Professional SVG Icons mapping
  const getPhaseIcon = (phaseKey: PropertyLifecyclePhase, size = 15) => {
    switch (phaseKey) {
      case 'planning_permits':
        return <FileText size={size} />;
      case 'excavation_foundation':
        return <Layers size={size} />;
      case 'structural_skeleton':
        return <Building2 size={size} />;
      case 'masonry_roughing':
        return <Hammer size={size} />;
      case 'finishing_interiors':
        return <Paintbrush size={size} />;
      case 'final_inspection_handover':
        return <ShieldCheck size={size} />;
      default:
        return <HardHat size={size} />;
    }
  };

  const egp = (v: string | number) => D(v || 0).formatEGP(isAr);
  const titleOf = (prop: Property) => (isAr ? (prop.title_ar || prop.title_en) : (prop.title_en || prop.title_ar));
  const notEntered = isAr ? 'غير مُدخل' : 'Not entered';
  const costToList = D(activeProperty.price_egp || 0).gt(0)
    ? D(metrics.totalLoggedCost).dividedBy(activeProperty.price_egp).times(100).toFixed(1)
    : null;
  const openCalculator = () => {
    onClose();
    onOpenCalculatorForProperty(activeProperty.id);
  };
  const PrevIcon = isAr ? ChevronRight : ChevronLeft;
  const NextIcon = isAr ? ChevronLeft : ChevronRight;

  return (
    <ZFModalShell
      isOpen={true}
      onClose={onClose}
      isAr={isAr}
      maxWidth="1280px"
      maxHeight="min(900px, 94vh)"
      icon={<HardHat size={16} />}
      title={isAr ? 'حساب مصاريف وتكاليف العمارة' : 'Property Cost & Lifecycle Audit'}
      subtitle={
        <bdi>
          {titleOf(activeProperty)}
          {activeProperty.area_sqm ? ` · ${activeProperty.area_sqm} م²` : ''}
          {activeProperty.location ? ` · ${activeProperty.location}` : ''}
        </bdi>
      }
      bodyStyle={{ padding: 0, display: 'flex', minHeight: 0 }}
      footer={
        <>
          <button type="button" className={p.primaryButton} onClick={openCalculator}>
            <Calculator size={14} />
            <span>{isAr ? 'حاسبة التسعير لهذه العمارة' : 'Open Pricing Calculator'}</span>
          </button>
          <button type="button" className={p.secondaryButton} onClick={onClose}>
            {isAr ? 'إغلاق' : 'Close'}
          </button>
          <span className={p.footerHint}>
            <bdi className={p.numeric}>
              {isAr
                ? `إجمالي المصاريف الموثقة ${egp(metrics.totalLoggedCost)} · ${metrics.itemsCount} بند`
                : `Audited total ${egp(metrics.totalLoggedCost)} · ${metrics.itemsCount} items`}
            </bdi>
          </span>
        </>
      }
    >
      <div className={p.split}>
        {/* Properties list */}
        <aside className={p.listPane}>
          <div className={p.listHeader}>
            <div className={p.searchWrap}>
              <Search size={14} className={p.searchIcon} aria-hidden />
              <input
                type="text"
                className={p.input}
                placeholder={isAr ? 'بحث بالعقار أو الموقع...' : 'Search property or location...'}
                value={propSearchQuery}
                onChange={(e) => setPropSearchQuery(e.target.value)}
                aria-label={isAr ? 'بحث في العقارات' : 'Search properties'}
              />
            </div>
          </div>
          <div className={p.listSummary}>
            <span>{isAr ? 'عقارات المحفظة' : 'Portfolio properties'}</span>
            <bdi className={p.numeric}>{filteredProperties.length}</bdi>
          </div>
          <div className={p.listBody}>
            {filteredProperties.length === 0 ? (
              <div className={p.emptyState}>
                <Search size={28} className={p.emptyStateIcon} aria-hidden />
                <span>{isAr ? 'لا توجد عقارات مطابقة' : 'No matching properties'}</span>
              </div>
            ) : (
              filteredProperties.map((prop) => {
                const isSelected = prop.id === activeProperty.id;
                const isReady = prop.completion_status === 'ready';
                return (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() => setSelectedPropertyId(prop.id)}
                    aria-pressed={isSelected}
                    className={isSelected ? `${p.listItem} ${p.listItemSelected}` : p.listItem}
                  >
                    <span className={p.listItemTop}>
                      <bdi className={p.listItemTitle}>{titleOf(prop)}</bdi>
                      <span className={isReady ? `${p.pill} ${p.pillSuccess}` : `${p.pill} ${p.pillWarning}`}>
                        {isReady ? (isAr ? 'جاهز' : 'Ready') : (isAr ? 'قيد الإنشاء' : 'In Progress')}
                      </span>
                    </span>
                    <span className={p.listItemMeta}>
                      <bdi>{prop.location || (isAr ? 'الموقع غير مُدخل' : 'Location not entered')}{prop.area_sqm ? ` · ${prop.area_sqm} م²` : ''}</bdi>
                      <bdi className={p.listItemAmount}>{egp(propertyWipMap.get(prop.id) || '0')}</bdi>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Detail */}
        <div className={p.detailPane}>
          <section className={p.section}>
            <div className={`${p.figureGrid} ${p.figureGrid3}`}>
              <div className={p.figure}>
                <span className={p.figureLabel}>{isAr ? 'إجمالي المنصرف على العمارة' : 'Total Incurred Cost'}</span>
                <bdi className={p.figureValue}>{egp(metrics.totalLoggedCost)}</bdi>
                <span className={p.figureCaption}>{isAr ? `${metrics.itemsCount} بند موثق` : `${metrics.itemsCount} audited items`}</span>
              </div>
              <div className={p.figure}>
                <span className={p.figureLabel}>{isAr ? 'تكلفة المتر الفعلي' : 'Actual Cost per m²'}</span>
                <bdi className={`${p.figureValue} ${p.figureValueSm}`}>{egp(metrics.costPerSqm)}</bdi>
                <span className={p.figureCaption}>
                  {activeProperty.area_sqm
                    ? (isAr ? `على ${activeProperty.area_sqm} م²` : `Over ${activeProperty.area_sqm} m²`)
                    : (isAr ? 'المساحة غير مُدخلة (يُفترض 200 م²)' : 'Area not entered (200 m² assumed)')}
                </span>
              </div>
              <div className={p.figure}>
                <span className={p.figureLabel}>{isAr ? 'سعر البيع بالكتالوج' : 'Catalog List Price'}</span>
                <bdi className={`${p.figureValue} ${p.figureValueSm}`}>{egp(activeProperty.price_egp || 0)}</bdi>
                <bdi className={p.figureCaption}>
                  {costToList !== null
                    ? (isAr ? `المصاريف ${costToList}% من سعر البيع` : `Costs are ${costToList}% of list price`)
                    : notEntered}
                </bdi>
              </div>
            </div>
          </section>

          <section className={p.section}>
            <div className={p.sectionHeader}>
              <h4 className={p.sectionTitle}>{isAr ? 'مراحل البناء' : 'Construction Phases'}</h4>
              {selectedPhaseFilter !== 'all' && (
                <button type="button" className={p.linkButton} onClick={() => { setSelectedPhaseFilter('all'); setSelectedCategoryFilter('all'); }}>
                  {isAr ? 'عرض كل المراحل' : 'Show all phases'}
                </button>
              )}
            </div>
            <div role="radiogroup" aria-label={isAr ? 'تصفية حسب المرحلة' : 'Filter by phase'}>
              {CHRONOLOGICAL_PHASES.map((phase) => {
                const phaseData = metrics.byPhase[phase.key];
                const isSelected = selectedPhaseFilter === phase.key;
                const hasCosts = !!phaseData && D(phaseData.total).gt(0);
                const Icon = phase.icon;
                return (
                  <button
                    key={phase.key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={isSelected ? `${p.rowButton} ${p.rowButtonActive}` : p.rowButton}
                    onClick={() => { setSelectedPhaseFilter(isSelected ? 'all' : phase.key); setSelectedCategoryFilter('all'); }}
                  >
                    <span className={p.rowLead}>
                      <Icon size={14} aria-hidden />
                      <span>{phase.stepNum}. {isAr ? phase.nameAr : phase.nameEn}</span>
                    </span>
                    <span className={p.rowMeta}>
                      <span className={p.rowCount}>{isAr ? `${phaseData?.count || 0} بند` : `${phaseData?.count || 0} items`}</span>
                      <bdi>{hasCosts ? egp(phaseData.total) : egp(0)}</bdi>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={p.section}>
            <div className={p.sectionHeader}>
              <h4 className={p.sectionTitle}>
                {selectedPhaseFilter !== 'all'
                  ? (isAr
                      ? `التوزيع حسب نوع الشغل · ${CHRONOLOGICAL_PHASES.find(ph => ph.key === selectedPhaseFilter)?.nameAr}`
                      : `By category · ${CHRONOLOGICAL_PHASES.find(ph => ph.key === selectedPhaseFilter)?.nameEn}`)
                  : (isAr ? 'التوزيع حسب نوع الشغل والخامات' : 'Cost by Material Category')}
              </h4>
              {selectedCategoryFilter !== 'all' && (
                <button type="button" className={p.linkButton} onClick={() => setSelectedCategoryFilter('all')}>
                  {isAr ? 'إلغاء تصفية التصنيف' : 'Clear category filter'}
                </button>
              )}
            </div>
            <div role="radiogroup" aria-label={isAr ? 'تصفية حسب التصنيف' : 'Filter by category'}>
              {PROPERTY_COST_CATEGORIES.map((cat) => {
                const catData = activeCategoryBreakdown.byCategory[cat.key];
                const hasCosts = !!catData && D(catData.total).gt(0);
                const isSelected = selectedCategoryFilter === cat.key;
                const isClickable = hasCosts || selectedPhaseFilter === 'all';
                const pct = hasCosts && D(activeCategoryBreakdown.totalBase).gt(0)
                  ? D(catData.total).dividedBy(activeCategoryBreakdown.totalBase).times(100).toFixed(1)
                  : '0.0';
                return (
                  <button
                    key={cat.key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={!isClickable && !isSelected}
                    className={isSelected ? `${p.rowButton} ${p.rowButtonActive}` : p.rowButton}
                    onClick={() => setSelectedCategoryFilter(isSelected ? 'all' : cat.key)}
                  >
                    <span className={p.rowLead}>{isAr ? cat.nameAr : cat.nameEn}</span>
                    <span className={p.rowMeta}>
                      <span className={p.rowCount}>{pct}%</span>
                      <bdi>{hasCosts ? egp(catData.total) : egp(0)}</bdi>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={p.section}>
            <div className={p.sectionHeader}>
              <div className={p.searchWrap}>
                <Search size={14} className={p.searchIcon} aria-hidden />
                <input
                  type="text"
                  className={p.input}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث في البند، المورد، أو رقم الفاتورة...' : 'Search items, suppliers, invoices...'}
                  aria-label={isAr ? 'بحث في البنود' : 'Search line items'}
                />
              </div>
              <button type="button" className={showAddForm ? p.secondaryButton : p.primaryButton} onClick={() => setShowAddForm(prev => !prev)}>
                {showAddForm ? <X size={14} /> : <Plus size={14} />}
                <span>{showAddForm ? (isAr ? 'إلغاء الإضافة' : 'Cancel') : (isAr ? 'تسجيل فاتورة أو خامات' : 'Log Cost Item')}</span>
              </button>
            </div>

            {showAddForm && (
              <form id="lifecycle-add-item" onSubmit={handleAddNewItem}>
                <div className={p.fieldGrid}>
                  <div className={`${p.field} ${p.fieldFull}`}>
                    <label className={p.label} htmlFor="lc-name">{isAr ? 'اسم البند / المادة *' : 'Item Name (Arabic) *'}</label>
                    <input id="lc-name" type="text" required className={p.input} value={newItemNameAr}
                      onChange={(e) => setNewItemNameAr(e.target.value)}
                      placeholder={isAr ? 'مثال: توريد حديد تسليح 12 طن' : 'e.g. High-tensile steel rebar'} />
                  </div>
                  <div className={p.field}>
                    <label className={p.label} htmlFor="lc-cat">{isAr ? 'نوع الشغل والخامة *' : 'Category *'}</label>
                    <select id="lc-cat" className={p.input} value={newCategory} onChange={(e) => setNewCategory(e.target.value as PropertyCostCategory)}>
                      {PROPERTY_COST_CATEGORIES.map(c => (
                        <option key={c.key} value={c.key}>{isAr ? c.nameAr : c.nameEn}</option>
                      ))}
                    </select>
                  </div>
                  <div className={p.field}>
                    <label className={p.label} htmlFor="lc-phase">{isAr ? 'مرحلة التنفيذ *' : 'Lifecycle Phase *'}</label>
                    <select id="lc-phase" className={p.input} value={newPhase} onChange={(e) => setNewPhase(e.target.value as PropertyLifecyclePhase)}>
                      {CHRONOLOGICAL_PHASES.map(ph => (
                        <option key={ph.key} value={ph.key}>{isAr ? ph.nameAr : ph.nameEn}</option>
                      ))}
                    </select>
                  </div>
                  {activeProperty.building_units && activeProperty.building_units.length > 0 && (
                    <div className={`${p.field} ${p.fieldFull}`}>
                      <label className={p.label} htmlFor="lc-unit">{isAr ? 'تحميل البند على *' : 'Cost Allocation *'}</label>
                      <select id="lc-unit" className={p.input} value={newSelectedUnitId} onChange={(e) => setNewSelectedUnitId(e.target.value)}>
                        <option value="all">{isAr ? 'تكلفة عامة مشتركة (توزع على كل الشقق)' : 'Shared building cost (apportioned)'}</option>
                        {activeProperty.building_units.map(u => (
                          <option key={u.unit_id} value={u.unit_id}>
                            {isAr ? `شقة ${u.unit_number} · الدور ${u.floor} · ${u.area_sqm} م²` : `Unit ${u.unit_number} · Floor ${u.floor}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className={p.field}>
                    <label className={p.label} htmlFor="lc-supplier">{isAr ? 'المورد / المقاول' : 'Supplier / Contractor'}</label>
                    <input id="lc-supplier" type="text" className={p.input} value={newSupplier}
                      onChange={(e) => setNewSupplier(e.target.value)}
                      placeholder={isAr ? 'مثال: شركة حديد عز' : 'e.g. Ezz Steel'} />
                  </div>
                  <div className={p.field}>
                    <label className={p.label} htmlFor="lc-inv">{isAr ? 'رقم الفاتورة / المستخلص' : 'Invoice Ref'}</label>
                    <input id="lc-inv" type="text" className={`${p.input} ${p.numeric}`} value={newInvoiceRef}
                      onChange={(e) => setNewInvoiceRef(e.target.value)} placeholder="INV-2026-004" />
                  </div>
                  <div className={p.field}>
                    <label className={p.label} htmlFor="lc-qty">{isAr ? 'الكمية *' : 'Quantity *'}</label>
                    <input id="lc-qty" type="number" step="any" required className={`${p.input} ${p.numeric}`} value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)} placeholder="1" />
                  </div>
                  <div className={p.field}>
                    <label className={p.label} htmlFor="lc-uom">{isAr ? 'وحدة القياس *' : 'Unit *'}</label>
                    <input id="lc-uom" type="text" required className={p.input} value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)} placeholder={isAr ? 'طن / م³ / مقطوعية' : 'ton / m³ / lump-sum'} />
                  </div>
                  <div className={p.field}>
                    <label className={p.label} htmlFor="lc-cost">{isAr ? 'سعر الوحدة *' : 'Unit Cost *'}</label>
                    <div className={p.affixWrap}>
                      <input id="lc-cost" type="number" step="any" required className={`${p.input} ${p.numeric}`} value={newUnitCost}
                        onChange={(e) => setNewUnitCost(e.target.value)} placeholder="38000" />
                      <span className={p.affix}>{isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                  </div>
                  <div className={p.field}>
                    <span className={p.label}>{isAr ? 'الإجمالي' : 'Line Total'}</span>
                    <bdi className={`${p.figureValue} ${p.figureValueSm}`}>{egp(D(parseFloat(newQuantity) || 0).times(newUnitCost || 0).toFixed(2))}</bdi>
                  </div>
                  <div className={`${p.field} ${p.fieldFull}`}>
                    <label className={p.label} htmlFor="lc-notes">{isAr ? 'ملاحظات هندسية / محاسبية' : 'Engineering / Ledger Notes'}</label>
                    <input id="lc-notes" type="text" className={p.input} value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder={isAr ? 'تم استلام الخامات بالموقع بمعرفة المهندس المشرف' : 'Material received and verified on site'} />
                  </div>
                </div>
                <div className={p.chipRow}>
                  <button type="submit" className={p.primaryButton} disabled={isSubmitting}>
                    <Plus size={14} />
                    <span>{isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ وتوثيق الفاتورة' : 'Save Item')}</span>
                  </button>
                  <button type="button" className={p.secondaryButton} onClick={() => setShowAddForm(false)}>
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}

            <div className={p.tableWrap}>
              <table className={p.table}>
                <thead>
                  <tr>
                    <th scope="col">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th scope="col">{isAr ? 'البند' : 'Item'}</th>
                    <th scope="col">{isAr ? 'المرحلة / التصنيف' : 'Phase / Category'}</th>
                    <th scope="col">{isAr ? 'المورد / الفاتورة' : 'Supplier / Invoice'}</th>
                    <th scope="col">{isAr ? 'الكمية' : 'Qty'}</th>
                    <th scope="col">{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                    <th scope="col">{isAr ? 'الإجمالي' : 'Total'}</th>
                    <th scope="col">{isAr ? 'الحالة' : 'Status'}</th>
                    <th scope="col"><span className={p.srOnly}>{isAr ? 'إجراءات' : 'Actions'}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className={p.tableEmpty}>
                        {isAr ? 'لا توجد بنود تطابق البحث والتصفية. استخدم "تسجيل فاتورة" لإضافة أول بند.' : 'No items match the filter. Use "Log Cost Item" to add one.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => {
                      const catMeta = getCategoryMeta(item.category);
                      const phaseMeta = CHRONOLOGICAL_PHASES.find(ph => ph.key === item.phase) || CHRONOLOGICAL_PHASES[0];
                      return (
                        <tr key={item.item_id}>
                          <td><bdi>{item.logged_date}</bdi></td>
                          <td className={p.cellWrap}>
                            <bdi>{isAr ? item.item_name_ar : item.item_name_en}</bdi>
                            {item.unit_number && <span className={p.cellSub}>{isAr ? `مخصص لشقة ${item.unit_number}` : `Unit ${item.unit_number}`}</span>}
                            {item.notes && <span className={p.cellSub}>{item.notes}</span>}
                          </td>
                          <td>
                            {isAr ? phaseMeta.nameAr : phaseMeta.nameEn}
                            <span className={p.cellSub}>{isAr ? catMeta.nameAr : catMeta.nameEn}</span>
                          </td>
                          <td className={item.supplier_contractor ? undefined : p.emptyValue}>
                            <bdi>{item.supplier_contractor || notEntered}</bdi>
                            {item.invoice_ref && <span className={p.cellSub}><bdi>{item.invoice_ref}</bdi></span>}
                          </td>
                          <td><bdi>{item.quantity} {item.unit}</bdi></td>
                          <td><bdi>{egp(item.unit_cost_egp)}</bdi></td>
                          <td><strong><bdi>{egp(item.total_cost_egp)}</bdi></strong></td>
                          <td>
                            <span className={item.status === 'capitalized' ? `${p.pill} ${p.pillSuccess}` : p.pill}>
                              {item.status === 'capitalized' ? (isAr ? 'مرسمل بالأصول' : 'Capitalized') : (isAr ? 'معتمد' : 'Verified')}
                            </span>
                          </td>
                          <td>
                            <button type="button" className={p.iconButton} onClick={() => onDeleteCostItem(item.item_id)}
                              aria-label={isAr ? 'حذف البند' : 'Delete item'}>
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

            {filteredItems.length > 0 && (
              <div className={p.pager}>
                <bdi className={p.numeric}>
                  {isAr
                    ? `${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} من ${filteredItems.length} بند`
                    : `${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of ${filteredItems.length} items`}
                </bdi>
                <div className={p.pagerControls}>
                  <button type="button" className={p.iconButton} disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(pg => Math.max(1, pg - 1))} aria-label={isAr ? 'الصفحة السابقة' : 'Previous page'}>
                    <PrevIcon size={14} />
                  </button>
                  <bdi className={p.numeric}>{currentPage} / {totalPages}</bdi>
                  <button type="button" className={p.iconButton} disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(pg => Math.min(totalPages, pg + 1))} aria-label={isAr ? 'الصفحة التالية' : 'Next page'}>
                    <NextIcon size={14} />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </ZFModalShell>
  );
}
