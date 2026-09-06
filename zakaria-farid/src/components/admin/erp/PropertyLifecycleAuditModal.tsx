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
  ChevronDown
} from 'lucide-react';
import styles from './PropertyLifecycleAuditModal.module.css';

interface PropertyLifecycleAuditModalProps {
  property: Property | null;
  allCosts: ERPPropertyCostItem[];
  isAr: boolean;
  onClose: () => void;
  onAddCostItem: (item: ERPPropertyCostItem) => Promise<void>;
  onDeleteCostItem: (itemId: string) => Promise<void>;
  onOpenCalculatorForProperty: (propertyId: string) => void;
}

export function PropertyLifecycleAuditModal({
  property,
  allCosts,
  isAr,
  onClose,
  onAddCostItem,
  onDeleteCostItem,
  onOpenCalculatorForProperty
}: PropertyLifecycleAuditModalProps) {
  if (!property) return null;

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Calculate Metrics for this property
  const metrics = useMemo(() => {
    return calculatePropertyAuditMetrics(property.id, property.area_sqm || 200, allCosts);
  }, [property.id, property.area_sqm, allCosts]);

  // Filtered items
  const filteredItems = useMemo(() => {
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
  }, [metrics.propertyCosts, selectedPhaseFilter, selectedCategoryFilter, searchQuery]);

  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemNameAr.trim() || !newUnitCost) return;

    setIsSubmitting(true);
    try {
      const qty = parseFloat(newQuantity) || 1;
      const unitCost = D(newUnitCost).toFixed(2);
      const totalCost = D(qty).times(unitCost).toFixed(2);

      const targetUnit = newSelectedUnitId !== 'all' 
        ? property.building_units?.find(u => u.unit_id === newSelectedUnitId)
        : undefined;

      const newItem: ERPPropertyCostItem = {
        item_id: generateUUID(),
        property_id: property.id,
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

  // Professional SVG Icons mapping (Replaces cheap emojis)
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
                  {isAr ? 'سجل التدقيق الشامل لبنود التكاليف ومواد البناء' : 'Property Lifecycle Cost & Material Audit'}
                </h2>
                <span className={styles.verifiedBadge}>
                  <CheckCircle2 size={12} />
                  <span>{isAr ? 'دورة حياة موثقة' : 'Full Lifecycle Audited'}</span>
                </span>
              </div>
              <div className={styles.propertyMeta}>
                <span className={styles.propertyMetaStrong}>
                  {isAr ? property.title_ar : property.title_en}
                </span>
                <span>•</span>
                <span>{property.area_sqm} م²</span>
                <span>•</span>
                <span>{property.location}</span>
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              onClick={() => {
                onClose();
                onOpenCalculatorForProperty(property.id);
              }}
              className={styles.calcBtn}
            >
              <Calculator size={16} />
              <span>{isAr ? 'حاسبة تسعير العقار القائم' : 'Built Property Pricing Calculator'}</span>
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

        {/* Scrollable Body */}
        <div className={styles.scrollBody}>
          
          {/* Executive KPI Pods */}
          <div className={styles.kpiGrid}>
            {/* Total Incurred Capital */}
            <div className={`${styles.kpiCard} ${styles.kpiCardGold}`}>
              <div className={styles.kpiLabel} style={{ color: '#946f23' }}>
                <DollarSign size={14} />
                <span>{isAr ? 'إجمالي المنصرف الفعلي المسجل' : 'Total Incurred Logged Cost'}</span>
              </div>
              <div className={styles.kpiValue}>
                {formatEGP(metrics.totalLoggedCost)} <span className={styles.kpiValueUnit}>ج.م</span>
              </div>
              <div className={styles.kpiSub}>
                {isAr ? 'إجمالي الأموال المنفقة على بنود هذا العقار' : 'Accumulated expenditure on property'}
              </div>
            </div>

            {/* Actual Cost per Sqm */}
            <div className={`${styles.kpiCard} ${styles.kpiCardBlue}`}>
              <div className={styles.kpiLabel} style={{ color: '#2563eb' }}>
                <Building2 size={14} />
                <span>{isAr ? 'تكلفة المتر الفعلي المنفذة' : 'Actual Cost Per Sqm'}</span>
              </div>
              <div className={styles.kpiValue}>
                {formatEGP(metrics.costPerSqm)} <span className={styles.kpiValueUnit}>ج.م/م²</span>
              </div>
              <div className={styles.kpiSub}>
                {isAr ? `على مساحة إجمالية ${property.area_sqm} متر مربع` : `Based on ${property.area_sqm} m² built-up area`}
              </div>
            </div>

            {/* Audited Items Count */}
            <div className={`${styles.kpiCard} ${styles.kpiCardGreen}`}>
              <div className={styles.kpiLabel} style={{ color: '#059669' }}>
                <ShieldCheck size={14} />
                <span>{isAr ? 'البنود المعتمدة في الدفاتر' : 'Audited Ledger Items'}</span>
              </div>
              <div className={styles.kpiValue}>
                {metrics.itemsCount} <span className={styles.kpiValueUnit}>{isAr ? 'بند موثق' : 'items'}</span>
              </div>
              <div className={styles.kpiSub}>
                {isAr ? 'مستندة لفواتير ومستخلصات رسمية' : 'Backed by invoices and site audits'}
              </div>
            </div>

            {/* Catalog Benchmark Ratio */}
            <div className={`${styles.kpiCard} ${styles.kpiCardPurple}`}>
              <div className={styles.kpiLabel} style={{ color: '#7c3aed' }}>
                <Layers size={14} />
                <span>{isAr ? 'سعر القائمة في الكتالوج' : 'Catalog List Price'}</span>
              </div>
              <div className={styles.kpiValue}>
                {formatEGP(property.price_egp)} <span className={styles.kpiValueUnit}>ج.م</span>
              </div>
              <div className={styles.kpiSub}>
                {isAr ? (
                  <>نسبة التكلفة للبيع: <strong style={{ color: '#946f23' }}>{D(metrics.totalLoggedCost).dividedBy(property.price_egp || 1).times(100).toFixed(1)}%</strong></>
                ) : (
                  <>Cost-to-List Ratio: <strong style={{ color: '#946f23' }}>{D(metrics.totalLoggedCost).dividedBy(property.price_egp || 1).times(100).toFixed(1)}%</strong></>
                )}
              </div>
            </div>
          </div>

          {/* Lifecycle Milestones Stepper */}
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <span>{isAr ? 'مراحل دورة حياة التشييد' : 'Construction Lifecycle Milestones'}</span>
                <span className={styles.sectionSub}>
                  ({isAr ? 'اضغط لتصفية البنود حسب المرحلة' : 'click stage to filter'})
                </span>
              </div>
              {selectedPhaseFilter !== 'all' && (
                <button
                  onClick={() => setSelectedPhaseFilter('all')}
                  className={styles.clearFilterBtn}
                >
                  {isAr ? 'عرض جميع المراحل' : 'Show All Phases'}
                </button>
              )}
            </div>

            <div className={styles.stepperGrid}>
              {PROPERTY_LIFECYCLE_PHASES.map((phase) => {
                const phaseData = metrics.byPhase[phase.key];
                const isSelected = selectedPhaseFilter === phase.key;
                const hasCosts = !!phaseData && D(phaseData.total).gt(0);

                return (
                  <button
                    key={phase.key}
                    onClick={() => setSelectedPhaseFilter(isSelected ? 'all' : phase.key)}
                    className={`${styles.stepperCard} ${isSelected ? styles.stepperCardActive : ''}`}
                  >
                    <div className={styles.stepperTop}>
                      <div className={`${styles.stageIconBox} ${isSelected ? styles.stageIconBoxActive : ''}`}>
                        {getPhaseIcon(phase.key, 15)}
                      </div>
                      <CheckCircle2 size={13} color={hasCosts ? '#10b981' : '#94a3b8'} />
                    </div>
                    <div className={styles.stageName}>
                      {isAr ? phase.shortAr : phase.nameEn}
                    </div>
                    <div className={styles.stageAmount}>
                      {hasCosts ? `${formatEGP(phaseData.total)} ج.م` : '—'}
                    </div>
                    <div className={styles.stageCount}>
                      {phaseData?.count || 0} {isAr ? 'بند مسجل' : 'items'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spending Distribution by Category */}
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <span>{isAr ? 'توزيع التكلفة حسب تصنيف المادة' : 'Cost Breakdown by Material Category'}</span>
              </div>
              {selectedCategoryFilter !== 'all' && (
                <button
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={styles.clearFilterBtn}
                >
                  {isAr ? 'إلغاء تصفية التصنيف' : 'Clear Category Filter'}
                </button>
              )}
            </div>

            {/* Visual Multi-color Progress Bar */}
            <div className={styles.catProgressBar}>
              {PROPERTY_COST_CATEGORIES.map((cat) => {
                const catData = metrics.byCategory[cat.key];
                if (!catData || D(catData.total).isZero()) return null;
                const pct = D(catData.total).dividedBy(metrics.totalLoggedCost || 1).times(100).toNumber();

                return (
                  <div
                    key={cat.key}
                    style={{
                      width: `${pct}%`,
                      background: cat.color,
                      height: '100%',
                      transition: 'width 0.3s ease'
                    }}
                    title={`${isAr ? cat.nameAr : cat.nameEn}: ${pct.toFixed(1)}%`}
                  />
                );
              })}
            </div>

            {/* Chips */}
            <div className={styles.catChipsWrap}>
              {PROPERTY_COST_CATEGORIES.map((cat) => {
                const catData = metrics.byCategory[cat.key];
                const hasCosts = !!catData && D(catData.total).gt(0);
                const isSelected = selectedCategoryFilter === cat.key;
                const pct = hasCosts 
                  ? D(catData.total).dividedBy(metrics.totalLoggedCost || 1).times(100).toFixed(1) 
                  : '0';

                return (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategoryFilter(isSelected ? 'all' : cat.key)}
                    className={styles.catChip}
                    style={{
                      borderColor: isSelected ? cat.color : undefined,
                      background: isSelected ? cat.badgeBg : undefined
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                    <span className={styles.catChipName}>
                      {isAr ? cat.nameAr : cat.nameEn}
                    </span>
                    {hasCosts && (
                      <span className={styles.catChipAmount} style={{ color: cat.color }}>
                        {formatEGP(catData.total)} ج.م ({pct}%)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audited Line Items List & Toolbar */}
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
                  <span>{showAddForm ? (isAr ? 'إلغاء الإضافة' : 'Cancel') : (isAr ? 'إضافة بند تكلفة / مادة جديد' : 'Log New Material / Cost Item')}</span>
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
                  <span>{isAr ? 'تسجيل بند مالي / مادة بناء جديدة في سجل العقار' : 'Log New Construction / Material Item'}</span>
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
                      {isAr ? 'التصنيف والمجال *' : 'Category *'}
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
                  {property.building_units && property.building_units.length > 0 && (
                    <div>
                      <label className={styles.formLabel} style={{ color: '#0284c7' }}>
                        {isAr ? 'تحميل البند على (شقة محددة أم كامل العقار) *' : 'Cost Allocation (Unit / General) *'}
                      </label>
                      <select
                        value={newSelectedUnitId}
                        onChange={(e) => setNewSelectedUnitId(e.target.value)}
                        className={styles.formSelect}
                        style={{ borderColor: 'rgba(2, 132, 199, 0.4)', color: '#0284c7', fontWeight: 700 }}
                      >
                        <option value="all">{isAr ? 'تكلفة عامة مشتركة (توزع بالنسب على كافة الشقق)' : 'General Shared Building Cost (Apportioned)'}</option>
                        {property.building_units.map(u => (
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
                      {isAr ? 'مرحلة التشييد *' : 'Lifecycle Phase *'}
                    </label>
                    <select
                      value={newPhase}
                      onChange={(e) => setNewPhase(e.target.value as PropertyLifecyclePhase)}
                      className={styles.formSelect}
                    >
                      {PROPERTY_LIFECYCLE_PHASES.map(p => (
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
                      placeholder="INV-2025-XXXX"
                      className={styles.formInput}
                    />
                  </div>

                  {/* Quantity & Unit */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label className={styles.formLabel}>
                        {isAr ? 'الكمية *' : 'Quantity *'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(e.target.value)}
                        className={styles.formInput}
                      />
                    </div>
                    <div style={{ width: '100px' }}>
                      <label className={styles.formLabel}>
                        {isAr ? 'الوحدة' : 'Unit'}
                      </label>
                      <input
                        type="text"
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                        placeholder="طن / م³ / م²"
                        className={styles.formInput}
                      />
                    </div>
                  </div>

                  {/* Unit Cost */}
                  <div>
                    <label className={styles.formLabel}>
                      {isAr ? 'سعر الوحدة (ج.م) *' : 'Unit Cost (EGP) *'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newUnitCost}
                      onChange={(e) => setNewUnitCost(e.target.value)}
                      placeholder="41500"
                      className={styles.formInput}
                    />
                  </div>

                  {/* Computed Total Cost */}
                  <div>
                    <label className={styles.formLabel}>
                      {isAr ? 'إجمالي التكلفة المحسوبة' : 'Calculated Total'}
                    </label>
                    <div className={styles.calcTotalBox}>
                      <span>{formatEGP(D(parseFloat(newQuantity) || 1).times(D(newUnitCost || 0)).toFixed(2))}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>ج.م</span>
                    </div>
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
                    {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ وتوثيق البند' : 'Confirm & Log Item')}
                  </button>
                </div>
              </form>
            )}

            {/* Dense Audit Table */}
            <div className={styles.tableBox}>
              <div className={styles.tableWrapper}>
                <table className={styles.table} style={{ textAlign: isAr ? 'right' : 'left' }}>
                  <thead>
                    <tr>
                      <th className={styles.th}>{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className={styles.th}>{isAr ? 'المرحلة والتصنيف' : 'Phase & Category'}</th>
                      <th className={styles.th}>{isAr ? 'بيان البند والمواد' : 'Item Description'}</th>
                      <th className={styles.th}>{isAr ? 'المورد / الفاتورة' : 'Supplier / Invoice'}</th>
                      <th className={styles.th}>{isAr ? 'الكمية' : 'Qty'}</th>
                      <th className={styles.th}>{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                      <th className={styles.th}>{isAr ? 'إجمالي التكلفة' : 'Total Cost'}</th>
                      <th className={styles.th}>{isAr ? 'الحالة' : 'Status'}</th>
                      <th className={styles.th} style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                          {isAr ? 'لا توجد بنود تطابق معايير البحث والتصفية' : 'No items match the selected filter'}
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const catMeta = getCategoryMeta(item.category);
                        const phaseMeta = getPhaseMeta(item.phase);

                        return (
                          <tr key={item.item_id} className={styles.tr}>
                            {/* Date */}
                            <td className={styles.td} style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Calendar size={13} color="#94a3b8" />
                                <span>{item.logged_date}</span>
                              </div>
                            </td>

                            {/* Phase & Category */}
                            <td className={styles.td}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <span style={{
                                  display: 'inline-block',
                                  fontSize: '0.7rem',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  background: catMeta.badgeBg,
                                  color: catMeta.color,
                                  border: `1px solid ${catMeta.badgeBorder}`,
                                  fontWeight: 700,
                                  width: 'fit-content'
                                }}>
                                  {isAr ? catMeta.nameAr : catMeta.nameEn}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                  {isAr ? phaseMeta.shortAr : phaseMeta.nameEn}
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
                            <td className={styles.td} style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                              {formatEGP(item.unit_cost_egp)} ج.م
                            </td>

                            {/* Total Cost */}
                            <td className={styles.td} style={{ whiteSpace: 'nowrap' }}>
                              <span className={styles.costHighlight}>
                                {formatEGP(item.total_cost_egp)} <span style={{ fontSize: '0.72rem', color: '#64748b' }}>ج.م</span>
                              </span>
                            </td>

                            {/* Status */}
                            <td className={styles.td} style={{ whiteSpace: 'nowrap' }}>
                              <span style={{
                                fontSize: '0.68rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '999px',
                                background: item.status === 'capitalized' 
                                  ? 'rgba(16, 185, 129, 0.12)' 
                                  : 'rgba(59, 130, 246, 0.12)',
                                color: item.status === 'capitalized' ? '#047857' : '#1d4ed8',
                                border: `1px solid ${item.status === 'capitalized' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
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
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <div className={styles.footerSummary}>
            {isAr ? (
              <>إجمالي التكلفة المنفقة الموثقة: <strong className={styles.footerSummaryHighlight}>{formatEGP(metrics.totalLoggedCost)} ج.م</strong> عبر {metrics.itemsCount} بنداً معتمداً</>
            ) : (
              <>Total audited expenditure: <strong className={styles.footerSummaryHighlight}>{formatEGP(metrics.totalLoggedCost)} EGP</strong> across {metrics.itemsCount} items</>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => {
                onClose();
                onOpenCalculatorForProperty(property.id);
              }}
              className={styles.calcBtn}
            >
              <Calculator size={16} />
              <span>{isAr ? 'الانتقال إلى حاسبة تسعير العقار القائم' : 'Proceed to Selling Price Calculator'}</span>
              <ArrowRight size={14} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
