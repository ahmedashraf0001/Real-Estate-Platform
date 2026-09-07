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
import { D, formatEGP, generateUUID } from '@/lib/erp/math';
import { 
  X, 
  Layers, 
  Plus, 
  Trash2, 
  FileText, 
  CheckCircle2, 
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
  Sparkles,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
  User,
  AlertCircle
} from 'lucide-react';
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
  { key: 'planning_permits', stepNum: '١', nameAr: 'التراخيص والتخطيط', nameEn: 'Planning & Permits', icon: FileText, color: '#1e40af', bgColor: 'rgba(30, 64, 175, 0.08)', borderColor: 'rgba(30, 64, 175, 0.25)' },
  { key: 'excavation_foundation', stepNum: '٢', nameAr: 'الأساسات والحفر', nameEn: 'Excavation & Footings', icon: Layers, color: '#b45309', bgColor: 'rgba(180, 83, 9, 0.08)', borderColor: 'rgba(180, 83, 9, 0.25)' },
  { key: 'structural_skeleton', stepNum: '٣', nameAr: 'الهيكل والخرسانات', nameEn: 'Structural Skeleton', icon: Building2, color: '#c2410c', bgColor: 'rgba(194, 65, 12, 0.08)', borderColor: 'rgba(194, 65, 12, 0.25)' },
  { key: 'masonry_roughing', stepNum: '٤', nameAr: 'المباني والتأسيس', nameEn: 'Masonry & MEP', icon: Hammer, color: '#946f23', bgColor: 'rgba(184, 144, 62, 0.08)', borderColor: 'rgba(184, 144, 62, 0.25)' },
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

  return (
    <div 
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className={styles.modalDialog}>
        {/* Top Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerBrand}>
            <div className={styles.headerIcon}>
              <HardHat size={22} />
            </div>
            <div>
              <div className={styles.headerTitleWrap}>
                <h2 className={styles.headerTitle}>
                  {isAr ? 'حساب مصاريف وتكاليف العمارة' : 'Property Cost & Lifecycle Audit'}
                </h2>
                <span className={styles.verifiedBadge}>
                  <CheckCircle2 size={12} />
                  <span>{isAr ? 'شامل كل مراحل البناء' : 'Full Lifecycle Audited'}</span>
                </span>
              </div>
              <div className={styles.propertyMeta}>
                <span className={styles.propertyMetaStrong}>
                  {isAr ? (activeProperty.title_ar || activeProperty.title_en) : (activeProperty.title_en || activeProperty.title_ar)}
                </span>
                <span>•</span>
                <span>{activeProperty.area_sqm} م²</span>
                <span>•</span>
                <span>{activeProperty.location}</span>
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              onClick={() => {
                onClose();
                onOpenCalculatorForProperty(activeProperty.id);
              }}
              className={styles.calcBtn}
            >
              <Calculator size={16} />
              <span>{isAr ? 'افتح حاسبة التسعير للعمارة دي' : 'Built Property Pricing Calculator'}</span>
            </button>

            <button
              onClick={onClose}
              className={styles.closeBtn}
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            TWO-SIDED MASTER-DETAIL BODY
            ══════════════════════════════════════════════════════════════════════════ */}
        <div className={styles.modalBodyGrid}>

          {/* ──────────────────────────────────────────────────────────────────
              SIDE 1 (MASTER): SEARCHABLE LIST OF PROPERTIES
              ────────────────────────────────────────────────────────────────── */}
          <div className={styles.masterSidebar}>
            {/* Search Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder={isAr ? 'بحث بالعقار أو الموقع...' : 'Search property or location...'}
                  value={propSearchQuery}
                  onChange={(e) => setPropSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: isAr ? '0.55rem 2.2rem 0.55rem 0.85rem' : '0.55rem 0.85rem 0.55rem 2.2rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <Search size={15} style={{
                  position: 'absolute',
                  [isAr ? 'right' : 'left']: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8'
                }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                <span style={{ fontWeight: 700 }}>{isAr ? 'عقارات المحفظة:' : 'Portfolio Properties:'}</span>
                <span style={{
                  background: '#e2e8f0',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '10px',
                  fontWeight: 800,
                  color: '#334155'
                }}>
                  {filteredProperties.length} {isAr ? 'عقار' : 'properties'}
                </span>
              </div>
            </div>

            {/* Scrollable List of Properties */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredProperties.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
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
                      onClick={() => setSelectedPropertyId(p.id)}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '12px',
                        border: isSelected ? '1.5px solid #b8903e' : '1px solid #e2e8f0',
                        background: '#ffffff',
                        boxShadow: isSelected 
                          ? '0 4px 12px rgba(184, 144, 62, 0.12), 0 0 0 1px rgba(184, 144, 62, 0.25)' 
                          : '0 1px 3px rgba(0,0,0,0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                        position: 'relative'
                      }}
                    >
                      {/* Top Row: Title & Completion Status */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                          <Building2 size={14} color="#946f23" style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar)}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          padding: '0.12rem 0.5rem',
                          borderRadius: '12px',
                          background: isReady ? 'rgba(5, 150, 105, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                          color: isReady ? '#059669' : '#d97706',
                          border: `1px solid ${isReady ? 'rgba(5, 150, 105, 0.2)' : 'rgba(217, 119, 6, 0.2)'}`,
                          flexShrink: 0
                        }}>
                          {isReady ? (isAr ? 'جاهز للتسليم' : 'Ready') : (isAr ? 'قيد الإنشاء' : 'In Progress')}
                        </span>
                      </div>

                      {/* Area & Location */}
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {p.area_sqm} م² • {p.location || 'الشرقية'}
                      </div>

                      {/* WIP Cost Footprint */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #f1f5f9', paddingTop: '0.35rem', marginTop: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {isAr ? 'المنصرف الفعلي:' : 'WIP Incurred:'}
                        </span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
                          {formatEGP(wipTotal)} ج.م
                        </span>
                      </div>

                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          [isAr ? 'left' : 'right']: '0.6rem',
                          top: '0.6rem',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#946f23',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────────────
              SIDE 2 (DETAIL): AUDIT BREAKDOWN, PIPELINE STEPPER, CATEGORIES & TABLE
              ────────────────────────────────────────────────────────────────── */}
          <div className={styles.scrollBody}>
            
            {/* Executive KPI Pods (Egyptian Arabic Copy) */}
            <div className={styles.kpiGrid}>
              {/* Total Incurred Capital */}
              <div className={`${styles.kpiCard} ${styles.kpiCardGold}`}>
                <div className={styles.kpiLabel} style={{ color: '#946f23' }}>
                  <div className={styles.kpiIconBadge} style={{ background: 'rgba(184, 144, 62, 0.12)', color: '#946f23' }}>
                    <DollarSign size={14} />
                  </div>
                  <span>{isAr ? 'إجمالي اللي اتصرف ع العمارة' : 'Total Incurred Logged Cost'}</span>
                </div>
                <div className={styles.kpiValue} style={{ color: '#0f172a' }}>
                  {formatEGP(metrics.totalLoggedCost)} <span className={styles.kpiValueUnit} style={{ color: '#946f23', fontWeight: 800 }}>ج.م</span>
                </div>
                <div className={styles.kpiSub}>
                  {isAr ? 'إجمالي الفلوس اللي ادفعت على العمارة دي' : 'Accumulated expenditure on property'}
                </div>
              </div>

              {/* Actual Cost per Sqm */}
              <div className={`${styles.kpiCard} ${styles.kpiCardNavy}`}>
                <div className={styles.kpiLabel} style={{ color: '#1d4ed8' }}>
                  <div className={styles.kpiIconBadge} style={{ background: 'rgba(29, 78, 216, 0.1)', color: '#1d4ed8' }}>
                    <Building2 size={14} />
                  </div>
                  <span>{isAr ? 'تكلفة المتر الفعلي للمباني' : 'Actual Cost Per Sqm'}</span>
                </div>
                <div className={styles.kpiValue} style={{ color: '#0f172a' }}>
                  {formatEGP(metrics.costPerSqm)} <span className={styles.kpiValueUnit} style={{ color: '#1d4ed8', fontWeight: 800 }}>ج.م/م²</span>
                </div>
                <div className={styles.kpiSub}>
                  {isAr ? `على مساحة إجمالية ${activeProperty.area_sqm} متر مربع` : `Based on ${activeProperty.area_sqm} m² built-up area`}
                </div>
              </div>

              {/* Audited Items Count */}
              <div className={`${styles.kpiCard} ${styles.kpiCardEmerald}`}>
                <div className={styles.kpiLabel} style={{ color: '#047857' }}>
                  <div className={styles.kpiIconBadge} style={{ background: 'rgba(4, 120, 87, 0.1)', color: '#047857' }}>
                    <ShieldCheck size={14} />
                  </div>
                  <span>{isAr ? 'الفواتير والبنود المتسجلة' : 'Audited Invoices & Items'}</span>
                </div>
                <div className={styles.kpiValue} style={{ color: '#047857' }}>
                  {metrics.itemsCount} <span className={styles.kpiValueUnit} style={{ color: '#047857', fontWeight: 700 }}>{isAr ? 'بند موثق' : 'items'}</span>
                </div>
                <div className={styles.kpiSub}>
                  {isAr ? 'مستندة لفواتير ومستخلصات رسمية' : 'Backed by invoices and site audits'}
                </div>
              </div>

              {/* Catalog Benchmark Ratio */}
              <div className={`${styles.kpiCard} ${styles.kpiCardIndigo}`}>
                <div className={styles.kpiLabel} style={{ color: '#4338ca' }}>
                  <div className={styles.kpiIconBadge} style={{ background: 'rgba(67, 56, 202, 0.1)', color: '#4338ca' }}>
                    <Layers size={14} />
                  </div>
                  <span>{isAr ? 'إجمالي سعر بيع الشقق' : 'Catalog List Price'}</span>
                </div>
                <div className={styles.kpiValue} style={{ color: '#0f172a' }}>
                  {formatEGP(activeProperty.price_egp)} <span className={styles.kpiValueUnit}>ج.م</span>
                </div>
                <div className={styles.kpiSub}>
                  {isAr ? (
                    <>نسبة المصاريف من سعر البيع: <strong style={{ color: '#946f23', fontWeight: 800 }}>{D(metrics.totalLoggedCost).dividedBy(activeProperty.price_egp || 1).times(100).toFixed(1)}%</strong></>
                  ) : (
                    <>Cost-to-List Ratio: <strong style={{ color: '#946f23', fontWeight: 800 }}>{D(metrics.totalLoggedCost).dividedBy(activeProperty.price_egp || 1).times(100).toFixed(1)}%</strong></>
                  )}
                </div>
              </div>
            </div>

            {/* 1. Chronological Construction Pipeline / Stepper */}
            <div className={styles.sectionBox}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                  <HardHat size={16} color="#946f23" />
                  <span>{isAr ? 'مراحل البناء والتنفيذ' : 'Construction Lifecycle Pipeline'}</span>
                  <span className={styles.sectionSub}>
                    ({isAr ? 'دوس على أي مرحلة عشان تشوف بنودها وفواتيرها' : 'click stage to filter'})
                  </span>
                </div>
                {selectedPhaseFilter !== 'all' && (
                  <button
                    onClick={() => {
                      setSelectedPhaseFilter('all');
                      setSelectedCategoryFilter('all');
                    }}
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
                      onClick={() => {
                        setSelectedPhaseFilter(isSelected ? 'all' : phase.key);
                        setSelectedCategoryFilter('all');
                      }}
                      className={`${styles.pipelineCard} ${isSelected ? styles.pipelineCardActive : ''}`}
                      style={isSelected ? {
                        border: `2px solid ${phase.color}`,
                        boxShadow: `0 4px 14px ${phase.borderColor}, 0 0 0 1px ${phase.color}`,
                        background: '#ffffff'
                      } : undefined}
                    >
                      {/* Step Number Badge & Icon */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: isSelected ? phase.color : phase.bgColor,
                          color: isSelected ? '#ffffff' : phase.color,
                          border: `1px solid ${isSelected ? phase.color : phase.borderColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.74rem',
                          fontWeight: 800
                        }}>
                          {phase.stepNum}
                        </div>

                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: phase.bgColor,
                          color: phase.color,
                          border: `1px solid ${phase.borderColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <IconComponent size={14} />
                        </div>
                      </div>

                      {/* Phase Name */}
                      <div style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        marginTop: '0.15rem'
                      }}>
                        {isAr ? phase.nameAr : phase.nameEn}
                      </div>

                      {/* Spending Amount */}
                      <div style={{
                        fontSize: '0.82rem',
                        fontWeight: 900,
                        color: hasCosts ? phase.color : '#94a3b8',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {hasCosts ? `${formatEGP(phaseData.total)} ج.م` : '—'}
                      </div>

                      {/* Item Count */}
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {phaseData?.count || 0} {isAr ? 'بند مسجل' : 'items'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Spending Distribution by Category (Clean Structured Grid) */}
            <div className={styles.sectionBox}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                  <Layers size={16} color="#946f23" />
                  <span>{isAr ? 'توزيع المصاريف حسب نوع الشغل والخامات' : 'Cost Breakdown by Material Category'}</span>
                  {selectedPhaseFilter !== 'all' ? (
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.55rem',
                      borderRadius: '6px',
                      background: CHRONOLOGICAL_PHASES.find(p => p.key === selectedPhaseFilter)?.bgColor || 'rgba(184, 144, 62, 0.08)',
                      color: CHRONOLOGICAL_PHASES.find(p => p.key === selectedPhaseFilter)?.color || '#946f23',
                      border: `1px solid ${CHRONOLOGICAL_PHASES.find(p => p.key === selectedPhaseFilter)?.borderColor || 'rgba(184, 144, 62, 0.25)'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      <span>
                        {isAr 
                          ? `خاص بمرحلة: ${CHRONOLOGICAL_PHASES.find(p => p.key === selectedPhaseFilter)?.nameAr}` 
                          : `Phase: ${CHRONOLOGICAL_PHASES.find(p => p.key === selectedPhaseFilter)?.nameEn}`}
                      </span>
                      <span>•</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatEGP(activeCategoryBreakdown.totalBase)} ج.م
                      </span>
                    </span>
                  ) : (
                    <span className={styles.sectionSub}>
                      ({isAr ? 'شامل كل مراحل البناء' : 'All Phases Combined'})
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {selectedCategoryFilter !== 'all' && (
                    <button
                      onClick={() => setSelectedCategoryFilter('all')}
                      className={styles.clearFilterBtn}
                    >
                      {isAr ? 'إلغاء تصفية التصنيف' : 'Clear Category Filter'}
                    </button>
                  )}
                  {selectedPhaseFilter !== 'all' && (
                    <button
                      onClick={() => {
                        setSelectedPhaseFilter('all');
                        setSelectedCategoryFilter('all');
                      }}
                      className={styles.clearFilterBtn}
                      style={{ background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' }}
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
                        setSelectedCategoryFilter(isSelected ? 'all' : cat.key);
                      }}
                      className={`${styles.categoryCard} ${isSelected ? styles.categoryCardActive : ''}`}
                      style={{
                        ...(isSelected ? {
                          border: `2px solid ${cat.color}`,
                          boxShadow: `0 0 0 2px ${cat.badgeBorder}`,
                          background: '#ffffff'
                        } : {}),
                        opacity: (!hasCosts && selectedPhaseFilter !== 'all') ? 0.45 : 1,
                        cursor: isClickable ? 'pointer' : 'default',
                        transition: 'all 0.2s ease'
                      }}
                      title={
                        !hasCosts && selectedPhaseFilter !== 'all' 
                          ? (isAr ? 'لا توجد مصاريف لهذا البند في هذه المرحلة' : 'No expenses for this category in selected phase')
                          : undefined
                      }
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: hasCosts ? cat.color : '#cbd5e1', 
                            flexShrink: 0 
                          }} />
                          <span style={{ 
                            fontSize: '0.78rem', 
                            fontWeight: 700, 
                            color: hasCosts ? '#1e293b' : '#64748b' 
                          }}>
                            {isAr ? cat.nameAr : cat.nameEn}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.12rem 0.5rem',
                          borderRadius: '6px',
                          background: hasCosts ? cat.badgeBg : '#f1f5f9',
                          color: hasCosts ? cat.color : '#94a3b8',
                          border: `1px solid ${hasCosts ? cat.badgeBorder : '#e2e8f0'}`,
                          fontVariantNumeric: 'tabular-nums'
                        }}>
                          {pct}%
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.1rem' }}>
                        <span style={{ 
                          fontSize: '0.82rem', 
                          fontWeight: 800, 
                          color: hasCosts ? cat.color : '#94a3b8', 
                          fontVariantNumeric: 'tabular-nums' 
                        }}>
                          {hasCosts ? `${formatEGP(catData.total)} ج.م` : '—'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          {catData?.count || 0} {isAr ? 'فواتير' : 'invoices'}
                        </span>
                      </div>

                      {/* Percentage Progress Bar */}
                      <div style={{ height: '4px', borderRadius: '4px', background: '#f1f5f9', overflow: 'hidden', marginTop: '0.15rem' }}>
                        <div style={{ 
                          width: `${pct}%`, 
                          height: '100%', 
                          background: hasCosts ? cat.color : '#cbd5e1', 
                          borderRadius: '4px', 
                          transition: 'width 0.3s ease' 
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Audited Line Items List & Toolbar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className={styles.toolbar}>
                <div className={styles.searchInputWrap}>
                  <Search 
                    size={15} 
                    className={styles.searchIcon} 
                    style={{ [isAr ? 'right' : 'left']: '12px' }} 
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isAr ? 'بحث في اسم البند، المورد، أو رقم الفاتورة...' : 'Search items, suppliers, invoices...'}
                    className={styles.searchInput}
                    style={{
                      [isAr ? 'paddingRight' : 'paddingLeft']: '2.2rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span className={styles.itemCountBadge}>
                    {isAr ? `${filteredItems.length} بند معروض` : `${filteredItems.length} items`}
                  </span>

                  <button
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
                    <div style={{ gridColumn: '1 / -1' }}>
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

              {/* Dense Audit Table with Expanded Columns & Visual Badges */}
              <div className={styles.tableBox}>
                <div className={styles.tableWrapper}>
                  <table className={styles.table} style={{ textAlign: isAr ? 'right' : 'left' }}>
                    <thead>
                      <tr>
                        <th className={styles.th} style={{ minWidth: '95px' }}>{isAr ? 'التاريخ' : 'Date'}</th>
                        <th className={styles.th} style={{ minWidth: '185px' }}>{isAr ? 'المرحلة والتصنيف' : 'Phase & Category'}</th>
                        <th className={styles.th} style={{ minWidth: '250px' }}>{isAr ? 'بيان البند والمواد' : 'Item Description'}</th>
                        <th className={styles.th} style={{ minWidth: '140px' }}>{isAr ? 'المورد / الفاتورة' : 'Supplier / Invoice'}</th>
                        <th className={styles.th} style={{ minWidth: '85px' }}>{isAr ? 'الكمية' : 'Qty'}</th>
                        <th className={styles.th} style={{ minWidth: '100px' }}>{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                        <th className={styles.th} style={{ minWidth: '115px' }}>{isAr ? 'إجمالي التكلفة' : 'Total Cost'}</th>
                        <th className={styles.th} style={{ minWidth: '85px' }}>{isAr ? 'الحالة' : 'Status'}</th>
                        <th className={styles.th} style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
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
                              <td className={styles.td} style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <Calendar size={13} color="#94a3b8" />
                                  <span>{item.logged_date}</span>
                                </div>
                              </td>

                              {/* Phase & Category: Distinct Visual Badges */}
                              <td className={styles.td}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  {/* Phase Pill with Icon */}
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    fontSize: '0.68rem',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '6px',
                                    background: phaseMeta.bgColor,
                                    color: phaseMeta.color,
                                    border: `1px solid ${phaseMeta.borderColor}`,
                                    fontWeight: 800,
                                    width: 'fit-content'
                                  }}>
                                    <PhaseIcon size={12} />
                                    <span>{isAr ? phaseMeta.nameAr : phaseMeta.nameEn}</span>
                                  </span>

                                  {/* Category Badge */}
                                  <span style={{
                                    display: 'inline-block',
                                    fontSize: '0.68rem',
                                    padding: '0.12rem 0.45rem',
                                    borderRadius: '4px',
                                    background: catMeta.badgeBg,
                                    color: catMeta.color,
                                    border: `1px solid ${catMeta.badgeBorder}`,
                                    fontWeight: 700,
                                    width: 'fit-content'
                                  }}>
                                    {isAr ? catMeta.nameAr : catMeta.nameEn}
                                  </span>
                                </div>
                              </td>

                              {/* Description */}
                              <td className={styles.td} style={{ maxWidth: '340px' }}>
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
                                <div style={{ fontWeight: 600, color: '#334155' }}>{item.supplier_contractor || '—'}</div>
                                {item.invoice_ref && (
                                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                    {item.invoice_ref}
                                  </div>
                                )}
                              </td>

                              {/* Quantity */}
                              <td className={styles.td} style={{ color: '#475569', whiteSpace: 'nowrap' }}>
                                {item.quantity} {item.unit}
                              </td>

                              {/* Unit Cost */}
                              <td className={styles.td} style={{ color: '#64748b', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                {formatEGP(item.unit_cost_egp)} ج.م
                              </td>

                              {/* Total Cost */}
                              <td className={styles.td} style={{ fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                {formatEGP(item.total_cost_egp)} ج.م
                              </td>

                              {/* Status */}
                              <td className={styles.td} style={{ whiteSpace: 'nowrap' }}>
                                <span style={{
                                  fontSize: '0.68rem',
                                  padding: '0.18rem 0.55rem',
                                  borderRadius: '999px',
                                  background: item.status === 'capitalized' 
                                    ? 'rgba(4, 120, 87, 0.08)' 
                                    : 'rgba(15, 23, 42, 0.05)',
                                  color: item.status === 'capitalized' ? '#047857' : '#334155',
                                  border: `1px solid ${item.status === 'capitalized' ? 'rgba(4, 120, 87, 0.2)' : 'rgba(15, 23, 42, 0.12)'}`,
                                  fontWeight: 700
                                }}>
                                  {item.status === 'capitalized' ? (isAr ? 'مرسمل بالأصول' : 'Capitalized') : (isAr ? 'معتمد وموثق' : 'Verified')}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className={styles.td} style={{ textAlign: 'center' }}>
                                <button
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
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {isAr 
                        ? `عرض ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} من أصل ${filteredItems.length} بند`
                        : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of ${filteredItems.length} items`}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={styles.pageBtn}
                      >
                        {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                        <span>{isAr ? 'السابق' : 'Previous'}</span>
                      </button>

                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', padding: '0 0.4rem' }}>
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

        {/* Footer */}
        <div className={styles.modalFooter}>
          <div className={styles.footerSummary}>
            {isAr ? (
              <>إجمالي المصاريف الموثقة للعمارة: <strong className={styles.footerSummaryHighlight}>{formatEGP(metrics.totalLoggedCost)} ج.م</strong> عبر {metrics.itemsCount} بنداً معتمداً</>
            ) : (
              <>Total audited expenditure: <strong className={styles.footerSummaryHighlight}>{formatEGP(metrics.totalLoggedCost)} EGP</strong> across {metrics.itemsCount} items</>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => {
                onClose();
                onOpenCalculatorForProperty(activeProperty.id);
              }}
              className={styles.calcBtn}
            >
              <Calculator size={16} />
              <span>{isAr ? 'افتح حاسبة التسعير للعمارة دي' : 'Proceed to Selling Price Calculator'}</span>
              <ArrowRight size={14} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
