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
  Filter,
  DollarSign
} from 'lucide-react';

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

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 10, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '1240px',
          maxHeight: '92vh',
          background: 'linear-gradient(180deg, #0d121c 0%, #080c14 100%)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(212, 175, 55, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          direction: isAr ? 'rtl' : 'ltr'
        }}
      >
        {/* Top Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d4af37'
            }}>
              <HardHat size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  {isAr ? 'سجل التدقيق الشامل لبنود التكاليف ومواد البناء' : 'Property Lifecycle Cost & Material Audit'}
                </h2>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontWeight: 700
                }}>
                  {isAr ? 'دورة حياة كاملة موثقة' : 'Full Lifecycle Audited'}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                  {isAr ? property.title_ar : property.title_en}
                </span>
                <span>•</span>
                <span>{property.area_sqm} م²</span>
                <span>•</span>
                <span>{property.location}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => {
                onClose();
                onOpenCalculatorForProperty(property.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
                color: '#080c14',
                padding: '0.55rem 1rem',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(212, 175, 55, 0.3)'
              }}
            >
              <Calculator size={16} />
              <span>{isAr ? 'حاسبة تسعير العقار القائم' : 'Built Property Pricing Calculator'}</span>
            </button>

            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Executive KPI Pods */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem'
          }}>
            {/* Total Incurred Capital */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.02) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '14px',
              padding: '1.1rem'
            }}>
              <div style={{ fontSize: '0.78rem', color: '#d4af37', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <DollarSign size={14} />
                <span>{isAr ? 'إجمالي المنصرف الفعلي المسجل' : 'Total Incurred Logged Cost'}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc' }}>
                {formatEGP(metrics.totalLoggedCost)} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ج.م</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                {isAr ? 'إجمالي الأموال المنفقة على بنود هذا العقار' : 'Accumulated money thrown into property'}
              </div>
            </div>

            {/* Actual Cost per Sqm */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.02) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '14px',
              padding: '1.1rem'
            }}>
              <div style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Building2 size={14} />
                <span>{isAr ? 'تكلفة المتر الفعلي المنفذة' : 'Actual Cost Per Sqm'}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc' }}>
                {formatEGP(metrics.costPerSqm)} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ج.م/م²</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                {isAr ? `على مساحة إجمالية ${property.area_sqm} متر مربع` : `Based on ${property.area_sqm} m² built-up area`}
              </div>
            </div>

            {/* Audited Items Count */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '14px',
              padding: '1.1rem'
            }}>
              <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={14} />
                <span>{isAr ? 'البنود المعتمدة في الدفاتر' : 'Audited Ledger Items'}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc' }}>
                {metrics.itemsCount} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{isAr ? 'بند موثق' : 'items'}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                {isAr ? 'مستندة لفواتير ومستخلصات رسمية' : 'Backed by invoices and site audits'}
              </div>
            </div>

            {/* Catalog Benchmark Ratio */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '1.1rem'
            }}>
              <div style={{ fontSize: '0.78rem', color: '#a78bfa', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={14} />
                <span>{isAr ? 'سعر القائمة الحالي في الكتالوج' : 'Catalog List Price'}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc' }}>
                {formatEGP(property.price_egp)} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ج.م</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                {isAr ? (
                  <>نسبة التكلفة للبيع الحالي: <strong style={{ color: '#d4af37' }}>{D(metrics.totalLoggedCost).dividedBy(property.price_egp || 1).times(100).toFixed(1)}%</strong></>
                ) : (
                  <>Cost-to-List Ratio: <strong style={{ color: '#d4af37' }}>{D(metrics.totalLoggedCost).dividedBy(property.price_egp || 1).times(100).toFixed(1)}%</strong></>
                )}
              </div>
            </div>
          </div>

          {/* Lifecycle Milestones Stepper */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '16px',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{isAr ? 'مراحل دورة حياة العقار والتشييد' : 'Construction & Lifecycle Milestones'}</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>
                  ({isAr ? 'اضغط لتصفية البنود حسب المرحلة' : 'click stage to filter'})
                </span>
              </div>
              {selectedPhaseFilter !== 'all' && (
                <button
                  onClick={() => setSelectedPhaseFilter('all')}
                  style={{
                    fontSize: '0.75rem',
                    color: '#d4af37',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {isAr ? 'عرض جميع المراحل' : 'Show All Phases'}
                </button>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '0.75rem'
            }}>
              {PROPERTY_LIFECYCLE_PHASES.map((phase) => {
                const phaseData = metrics.byPhase[phase.key];
                const isSelected = selectedPhaseFilter === phase.key;
                const hasCosts = !!phaseData && D(phaseData.total).gt(0);

                return (
                  <button
                    key={phase.key}
                    onClick={() => setSelectedPhaseFilter(isSelected ? 'all' : phase.key)}
                    style={{
                      background: isSelected 
                        ? 'rgba(212, 175, 55, 0.15)' 
                        : hasCosts 
                          ? 'rgba(255, 255, 255, 0.03)' 
                          : 'rgba(255, 255, 255, 0.01)',
                      border: isSelected 
                        ? '1px solid rgba(212, 175, 55, 0.6)' 
                        : '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '0.85rem 0.75rem',
                      textAlign: isAr ? 'right' : 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '1.1rem' }}>{phase.icon}</span>
                      <CheckCircle2 size={14} color={hasCosts ? '#10b981' : '#64748b'} />
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isSelected ? '#d4af37' : '#e2e8f0' }}>
                      {isAr ? phase.shortAr : phase.nameEn}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: hasCosts ? '#f8fafc' : '#64748b' }}>
                      {hasCosts ? `${formatEGP(phaseData.total)} ج.م` : '—'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      {phaseData?.count || 0} {isAr ? 'بند مسجل' : 'items'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spending Distribution by Category */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '16px',
            padding: '1.25rem'
          }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.75rem' }}>
              {isAr ? 'توزيع التكلفة المنفقة حسب طبيعة البند (Category Breakdown)' : 'Cost Breakdown by Material Category'}
            </div>

            {/* Visual Multi-color Progress Bar */}
            <div style={{
              height: '12px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      background: isSelected ? cat.badgeBg : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isSelected ? cat.color : 'rgba(255, 255, 255, 0.08)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color }} />
                    <span style={{ fontSize: '0.78rem', color: isSelected ? '#f8fafc' : '#cbd5e1', fontWeight: 600 }}>
                      {isAr ? cat.nameAr : cat.nameEn}
                    </span>
                    {hasCosts && (
                      <span style={{ fontSize: '0.72rem', color: cat.color, fontWeight: 800 }}>
                        {formatEGP(catData.total)} ج.م ({pct}%)
                      </span>
                    )}
                  </button>
                );
              })}
              {selectedCategoryFilter !== 'all' && (
                <button
                  onClick={() => setSelectedCategoryFilter('all')}
                  style={{
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '0.4rem 0.5rem'
                  }}
                >
                  {isAr ? 'إلغاء التصفية' : 'Clear Filter'}
                </button>
              )}
            </div>
          </div>

          {/* Audited Line Items List & Toolbar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
                <div style={{
                  position: 'relative',
                  flex: 1
                }}>
                  <Search size={15} style={{ position: 'absolute', [isAr ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isAr ? 'بحث في اسم البند، المورد، أو رقم الفاتورة...' : 'Search items, suppliers, invoices...'}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      [isAr ? 'paddingRight' : 'paddingLeft']: '2.2rem',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {isAr ? `${filteredItems.length} بند معروض` : `${filteredItems.length} items`}
                </div>
              </div>

              <button
                onClick={() => setShowAddForm(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1rem',
                  borderRadius: '10px',
                  background: showAddForm ? 'rgba(239, 68, 68, 0.15)' : 'rgba(212, 175, 55, 0.15)',
                  border: `1px solid ${showAddForm ? 'rgba(239, 68, 68, 0.4)' : 'rgba(212, 175, 55, 0.4)'}`,
                  color: showAddForm ? '#f87171' : '#d4af37',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {showAddForm ? <X size={15} /> : <Plus size={15} />}
                <span>{showAddForm ? (isAr ? 'إلغاء الإضافة' : 'Cancel') : (isAr ? 'إضافة بند تكلفة / مادة جديد' : 'Log New Material / Cost Item')}</span>
              </button>
            </div>

            {/* Inline Add Cost Form Drawer */}
            {showAddForm && (
              <form 
                onSubmit={handleAddNewItem}
                style={{
                  background: 'rgba(212, 175, 55, 0.04)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  animation: 'fadeIn 0.2s ease-out'
                }}
              >
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#d4af37' }}>
                  {isAr ? 'تسجيل بند مالي / مادة بناء جديدة في سجل العقار' : 'Log New Construction / Material Item'}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '0.85rem'
                }}>
                  {/* Name AR */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                      {isAr ? 'اسم البند / المادة (عربي) *' : 'Item Name (Arabic) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={newItemNameAr}
                      onChange={(e) => setNewItemNameAr(e.target.value)}
                      placeholder={isAr ? 'مثال: توريد حديد عز تسليح 12 طن' : 'e.g. High-Tensile Steel Rebar'}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                      {isAr ? 'التصنيف والمجال *' : 'Category *'}
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as PropertyCostCategory)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        background: '#0d121c',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.82rem'
                      }}
                    >
                      {PROPERTY_COST_CATEGORIES.map(c => (
                        <option key={c.key} value={c.key}>{isAr ? c.nameAr : c.nameEn}</option>
                      ))}
                    </select>
                  </div>

                  {/* Unit Allocation */}
                  {property.building_units && property.building_units.length > 0 && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: '#38bdf8', marginBottom: '0.3rem', fontWeight: 700 }}>
                        {isAr ? 'تحميل البند على (شقة محددة أم كامل العقار) *' : 'Cost Allocation (Unit / General) *'}
                      </label>
                      <select
                        value={newSelectedUnitId}
                        onChange={(e) => setNewSelectedUnitId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          background: '#0d121c',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          borderRadius: '8px',
                          color: '#38bdf8',
                          fontSize: '0.82rem',
                          fontWeight: 700
                        }}
                      >
                        <option value="all">{isAr ? '🏢 تكلفة عامة مشتركة (توزع بالنسب على كافة الشقق)' : 'General Shared Building Cost (Apportioned)'}</option>
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
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                      {isAr ? 'مرحلة التشييد *' : 'Lifecycle Phase *'}
                    </label>
                    <select
                      value={newPhase}
                      onChange={(e) => setNewPhase(e.target.value as PropertyLifecyclePhase)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        background: '#0d121c',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.82rem'
                      }}
                    >
                      {PROPERTY_LIFECYCLE_PHASES.map(p => (
                        <option key={p.key} value={p.key}>{isAr ? p.nameAr : p.nameEn}</option>
                      ))}
                    </select>
                  </div>

                  {/* Supplier / Contractor */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                      {isAr ? 'المورد / المقاول المنفذ' : 'Supplier / Contractor'}
                    </label>
                    <input
                      type="text"
                      value={newSupplier}
                      onChange={(e) => setNewSupplier(e.target.value)}
                      placeholder={isAr ? 'مثال: شركة حديد عز للدخيلة' : 'e.g. Ezz Steel / Lafarge'}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  {/* Invoice Ref */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                      {isAr ? 'رقم الفاتورة / المستخلص' : 'Invoice Ref #'}
                    </label>
                    <input
                      type="text"
                      value={newInvoiceRef}
                      onChange={(e) => setNewInvoiceRef(e.target.value)}
                      placeholder="INV-2025-XXXX"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  {/* Quantity & Unit */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                        {isAr ? 'الكمية *' : 'Quantity *'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontSize: '0.82rem'
                        }}
                      />
                    </div>
                    <div style={{ width: '100px' }}>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                        {isAr ? 'الوحدة' : 'Unit'}
                      </label>
                      <input
                        type="text"
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                        placeholder="طن / م³ / م²"
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontSize: '0.82rem'
                        }}
                      />
                    </div>
                  </div>

                  {/* Unit Cost */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                      {isAr ? 'سعر الوحدة (ج.م) *' : 'Unit Cost (EGP) *'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newUnitCost}
                      onChange={(e) => setNewUnitCost(e.target.value)}
                      placeholder="41500"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  {/* Computed Total Cost */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>
                      {isAr ? 'إجمالي التكلفة المحسوبة' : 'Calculated Total'}
                    </label>
                    <div style={{
                      padding: '0.55rem 0.75rem',
                      background: 'rgba(212, 175, 55, 0.08)',
                      border: '1px solid rgba(212, 175, 55, 0.25)',
                      borderRadius: '8px',
                      color: '#d4af37',
                      fontSize: '0.9rem',
                      fontWeight: 800
                    }}>
                      {formatEGP(D(parseFloat(newQuantity) || 1).times(D(newUnitCost || 0)).toFixed(2))} ج.م
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    style={{
                      padding: '0.55rem 1.25rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '0.55rem 1.5rem',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
                      border: 'none',
                      color: '#080c14',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      opacity: isSubmitting ? 0.6 : 1
                    }}
                  >
                    {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ وتوثيق البند' : 'Confirm & Log Item')}
                  </button>
                </div>
              </form>
            )}

            {/* Dense Audit Table */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isAr ? 'right' : 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{isAr ? 'التاريخ' : 'Date'}</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{isAr ? 'المرحلة والتصنيف' : 'Phase & Category'}</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{isAr ? 'بيان البند والمواد' : 'Item Description'}</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{isAr ? 'المورد / الفاتورة' : 'Supplier / Invoice'}</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{isAr ? 'الكمية' : 'Qty'}</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{isAr ? 'إجمالي التكلفة' : 'Total Cost'}</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{isAr ? 'الحالة' : 'Status'}</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}></th>
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
                        <tr 
                          key={item.item_id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            transition: 'background 0.15s'
                          }}
                        >
                          {/* Date */}
                          <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Calendar size={13} color="#64748b" />
                              <span>{item.logged_date}</span>
                            </div>
                          </td>

                          {/* Phase & Category */}
                          <td style={{ padding: '0.75rem 1rem' }}>
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
                          <td style={{ padding: '0.75rem 1rem', maxWidth: '340px' }}>
                            {item.unit_number && (
                              <span style={{
                                fontSize: '0.66rem',
                                background: 'rgba(14, 165, 233, 0.15)',
                                color: '#38bdf8',
                                border: '1px solid rgba(14, 165, 233, 0.35)',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                fontWeight: 700,
                                display: 'inline-block',
                                marginBottom: '0.25rem'
                              }}>
                                {isAr ? `🏢 مخصص لشقة ${item.unit_number}` : `Unit ${item.unit_number}`}
                              </span>
                            )}
                            <div style={{ fontWeight: 600, color: '#f8fafc', lineHeight: 1.35 }}>
                              {isAr ? item.item_name_ar : item.item_name_en}
                            </div>
                            {item.notes && (
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                {item.notes}
                              </div>
                            )}
                          </td>

                          {/* Supplier / Invoice */}
                          <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                            <div style={{ fontWeight: 500 }}>{item.supplier_contractor || '—'}</div>
                            {item.invoice_ref && (
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                {item.invoice_ref}
                              </div>
                            )}
                          </td>

                          {/* Quantity */}
                          <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                            {item.quantity} {item.unit}
                          </td>

                          {/* Unit Cost */}
                          <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                            {formatEGP(item.unit_cost_egp)} ج.م
                          </td>

                          {/* Total Cost */}
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 800, color: '#d4af37', fontSize: '0.9rem' }}>
                              {formatEGP(item.total_cost_egp)} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ج.م</span>
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '999px',
                              background: item.status === 'capitalized' 
                                ? 'rgba(16, 185, 129, 0.12)' 
                                : 'rgba(59, 130, 246, 0.12)',
                              color: item.status === 'capitalized' ? '#10b981' : '#60a5fa',
                              border: `1px solid ${item.status === 'capitalized' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                              fontWeight: 700
                            }}>
                              {item.status === 'capitalized' ? (isAr ? 'مرسمل بالأصول' : 'Capitalized') : (isAr ? 'معتمد وموثق' : 'Verified')}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <button
                              onClick={() => onDeleteCostItem(item.item_id)}
                              title={isAr ? 'حذف البند' : 'Delete item'}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer',
                                padding: '0.3rem',
                                borderRadius: '4px',
                                transition: 'color 0.15s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
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

        {/* Footer */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            {isAr ? (
              <>إجمالي التكلفة المنفقة الموثقة: <strong style={{ color: '#d4af37' }}>{formatEGP(metrics.totalLoggedCost)} ج.م</strong> عبر {metrics.itemsCount} بنداً معتمداً</>
            ) : (
              <>Total audited expenditure: <strong style={{ color: '#d4af37' }}>{formatEGP(metrics.totalLoggedCost)} EGP</strong> across {metrics.itemsCount} items</>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => {
                onClose();
                onOpenCalculatorForProperty(property.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
                color: '#080c14',
                padding: '0.6rem 1.25rem',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(212, 175, 55, 0.3)'
              }}
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
