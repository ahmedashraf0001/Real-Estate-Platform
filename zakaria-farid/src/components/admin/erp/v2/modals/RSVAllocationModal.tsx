'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  X, 
  Loader2, 
  Building2, 
  PieChart, 
  FolderPlus
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { ZFCustomSelect, ZFCustomSelectItem } from '../common/ZFCustomSelect';
import styles from '../ZFWorkstationShell.module.css';

interface RSVAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  onSaveAllocation: (allocation: {
    projectName: string;
    salesValue: string;
    wipAmount: string;
    propertyId?: string;
  }) => Promise<void>;
  isMutating?: boolean;
  isAr?: boolean;
}

export const RSVAllocationModal: React.FC<RSVAllocationModalProps> = ({
  isOpen,
  onClose,
  properties,
  onSaveAllocation,
  isMutating = false,
  isAr = true
}) => {
  const [selectionMode, setSelectionMode] = useState<'portfolio' | 'custom'>('portfolio');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [salesValue, setSalesValue] = useState<string>('100000000');
  const [wipAmount, setWipAmount] = useState<string>('45000000');

  useEffect(() => {
    if (isOpen) {
      setSelectionMode('portfolio');
      setSelectedPropertyId('');
      setProjectName('');
      setSalesValue('100000000');
      setWipAmount('45000000');
    }
  }, [isOpen]);

  const wip = parseFloat(wipAmount) || 0;
  const sales = parseFloat(salesValue) || 0;
  const factor = sales > 0 ? (wip / sales) : 0;
  const factorPct = (factor * 100).toFixed(2);
  const grossMarginPct = sales > 0 ? (100 - factor * 100).toFixed(2) : '0.00';

  const selectedProp = useMemo(() => {
    return properties.find(p => p.id === selectedPropertyId);
  }, [properties, selectedPropertyId]);

  const propertySelectItems = useMemo<ZFCustomSelectItem<string>[]>(() => {
    return properties.map(p => ({
      value: p.id,
      labelAr: p.title_ar || p.title_en || '',
      labelEn: p.title_en || p.title_ar || '',
      sublabelAr: `${p.area_sqm} م² • ${p.location || 'الشرقية'}`,
      sublabelEn: `${p.area_sqm} m² • ${p.location || 'Sharqia'}`,
      price: p.price_egp,
      icon: Building2,
      badge: p.completion_status === 'ready' ? (isAr ? 'جاهز' : 'Ready') : (isAr ? 'قيد التطوير' : 'In Progress'),
      badgeColor: p.completion_status === 'ready' ? '#059669' : '#d97706'
    }));
  }, [properties, isAr]);

  if (!isOpen) return null;

  const handleSelectProperty = (propId: string) => {
    setSelectedPropertyId(propId);
    if (propId) {
      const prop = properties.find(p => p.id === propId);
      if (prop) {
        const pTitle = isAr ? (prop.title_ar || prop.title_en) : (prop.title_en || prop.title_ar);
        setProjectName(pTitle || '');
        const sVal = (prop.price_egp || 100000000).toString();
        setSalesValue(sVal);
        setWipAmount(Math.round((prop.price_egp || 100000000) * 0.45).toString());
      }
    } else {
      setProjectName('');
    }
  };

  const handleModeChange = (mode: 'portfolio' | 'custom') => {
    setSelectionMode(mode);
    if (mode === 'custom') {
      setSelectedPropertyId('');
      if (projectName && properties.some(p => (p.title_ar === projectName || p.title_en === projectName))) {
        setProjectName('');
      }
    } else {
      if (!selectedPropertyId) {
        setProjectName('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectionMode === 'portfolio' && !selectedPropertyId) {
      alert(isAr ? 'يرجى اختيار العمارة أو المشروع المستهدف من القائمة' : 'Please select a property from the portfolio');
      return;
    }
    if (!projectName.trim()) {
      alert(isAr ? 'اكتب اسم العمارة أو المشروع الأول' : 'Please enter project name');
      return;
    }
    if (sales <= 0 || wip <= 0) {
      alert(isAr ? 'لازم تكتب مبالغ أكبر من الصفر لسعر البيع ومصاريف البناء' : 'Values must be greater than zero');
      return;
    }

    await onSaveAllocation({
      projectName: projectName.trim(),
      salesValue,
      wipAmount,
      propertyId: selectionMode === 'portfolio' ? (selectedPropertyId || undefined) : undefined
    });
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.modalContent}
        style={{
          maxWidth: '680px',
          width: '95vw',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fafaf9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(184, 144, 62, 0.12)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PieChart size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'حساب أرباح ونسبة إنجاز المشروع' : 'Relative Sales Value (RSV) Allocation Wizard'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {isAr ? 'توزيع مصاريف المباني لمعرفة نصيب كل شقة وصافي مكسب المكتب عند التسليم' : 'IFRS 15 relative sales value COGS capitalization factor'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {/* Mode Switcher: Portfolio vs Custom Project */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.35rem',
            background: '#f1f5f9',
            padding: '0.3rem',
            borderRadius: '10px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={() => handleModeChange('portfolio')}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                background: selectionMode === 'portfolio' ? '#ffffff' : 'transparent',
                color: selectionMode === 'portfolio' ? '#0f172a' : '#64748b',
                fontWeight: selectionMode === 'portfolio' ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                boxShadow: selectionMode === 'portfolio' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Building2 size={15} color={selectionMode === 'portfolio' ? '#946f23' : '#64748b'} />
              <span>{isAr ? 'من مشاريع ومحفظة الشركة' : 'From Company Portfolio'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('custom')}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                background: selectionMode === 'custom' ? '#ffffff' : 'transparent',
                color: selectionMode === 'custom' ? '#0f172a' : '#64748b',
                fontWeight: selectionMode === 'custom' ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                boxShadow: selectionMode === 'custom' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <FolderPlus size={15} color={selectionMode === 'custom' ? '#946f23' : '#64748b'} />
              <span>{isAr ? 'مشروع أو دراسة جديدة يدوياً' : 'New / Custom Project'}</span>
            </button>
          </div>

          {/* Mode A: Portfolio Selector */}
          {selectionMode === 'portfolio' ? (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Building2 size={14} color="#946f23" />
                <span>{isAr ? 'العمارة أو المشروع المستهدف *' : 'Target Property / Project *'}</span>
              </label>
              <ZFCustomSelect<string>
                value={selectedPropertyId}
                onChange={handleSelectProperty}
                items={propertySelectItems}
                placeholderAr="-- اضغط لاختيار المشروع أو العمارة من المحفظة --"
                placeholderEn="-- Choose property from portfolio --"
                isAr={isAr}
                searchable={true}
              />

              {/* Sleek Mini Property Summary Banner */}
              {selectedProp && (
                <div style={{
                  marginTop: '0.35rem',
                  padding: '0.5rem 0.75rem',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  fontSize: '0.74rem',
                  color: '#334155'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>
                      {isAr ? (selectedProp.title_ar || selectedProp.title_en) : (selectedProp.title_en || selectedProp.title_ar)}
                    </span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{selectedProp.area_sqm} م²</span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span>{selectedProp.location || (isAr ? 'الشرقية' : 'Sharqia')}</span>
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.18rem 0.55rem',
                    borderRadius: '999px',
                    background: selectedProp.completion_status === 'ready' ? '#dcfce7' : '#fef3c7',
                    color: selectedProp.completion_status === 'ready' ? '#15803d' : '#b45309',
                    border: `1px solid ${selectedProp.completion_status === 'ready' ? '#bbf7d0' : '#fde68a'}`
                  }}>
                    {selectedProp.completion_status === 'ready' ? (isAr ? 'جاهز للتسليم' : 'Ready') : (isAr ? 'قيد التطوير' : 'In Progress')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Mode B: Custom Project Name Input */
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FolderPlus size={14} color="#946f23" />
                <span>{isAr ? 'اسم العمارة أو المشروع *' : 'Project Name / Phase *'}</span>
              </label>
              <input 
                type="text"
                required
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder={isAr ? 'اكتب اسم المشروع أو دراسة الجدوى (مثال: عمارة الفردوس - الحي الخامس)' : 'e.g. Palatial Villas & Nile Horizons'}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Sales Value & Incurred WIP Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Projected Total Sales Value Ceiling */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                  {isAr ? 'إجمالي سعر بيع كل شقق العمارة (المبيعات المتوقعة) *' : 'Sales Value Ceiling *'}
                </label>
                <span style={{ fontSize: '0.72rem', color: '#946f23', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                  {D(salesValue || 0).formatEGP(isAr)}
                </span>
              </div>
              <input 
                type="number"
                step="100000"
                required
                value={salesValue}
                onChange={e => setSalesValue(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Incurred Construction WIP */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                  {isAr ? 'إجمالي مصاريف المباني والخامات المتوقعة للعمارة *' : 'Incurred Construction WIP *'}
                </label>
                <span style={{ fontSize: '0.72rem', color: '#946f23', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                  {D(wipAmount || 0).formatEGP(isAr)}
                </span>
              </div>
              <input 
                type="number"
                step="100000"
                required
                value={wipAmount}
                onChange={e => setWipAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Live Calculation Result Card */}
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fefdfa 100%)',
            border: '1.5px solid rgba(184, 144, 62, 0.35)',
            borderRadius: '14px',
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            boxShadow: '0 2px 8px rgba(184, 144, 62, 0.06)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: '#64748b',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              fontVariantNumeric: 'tabular-nums'
            }}>
              <span>{isAr ? 'الحسبة ببساطة:' : 'Formula:'}</span>
              <strong style={{ color: '#0f172a' }}>
                {isAr 
                  ? `مصاريف المباني (${D(wip).formatEGP(isAr)}) ÷ إجمالي سعر البيع (${D(sales).formatEGP(isAr)}) = ${factorPct}%`
                  : `RSV = WIP (${D(wip).formatEGP(isAr)}) ÷ Sales (${D(sales).formatEGP(isAr)}) = ${factorPct}%`}
              </strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                  {isAr ? 'نسبة تكلفة المباني من سعر البيع:' : 'Calculated Construction Ratio:'}
                </span>
                <strong style={{ fontSize: '1.4rem', color: '#946f23', fontVariantNumeric: 'tabular-nums', display: 'block', marginTop: '0.15rem' }}>
                  {factorPct}%
                </strong>
                <span style={{ fontSize: '0.72rem', color: '#946f23', fontWeight: 700 }}>
                  {isAr ? '(من ثمن الشقة رايح مباني وخامات)' : '(cost of sales ratio)'}
                </span>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: isAr ? 'left' : 'right' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                  {isAr ? 'مكسبنا الصافي من بيع الشقق:' : 'Projected Gross Margin:'}
                </span>
                <strong style={{ fontSize: '1.4rem', color: '#15803d', fontVariantNumeric: 'tabular-nums', display: 'block', marginTop: '0.15rem' }}>
                  {grossMarginPct}%
                </strong>
                <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700 }}>
                  {isAr ? '(من ثمن الشقة داخل مكسب صافي للمكتب)' : '(net office profit margin)'}
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${Math.min(parseFloat(factorPct) || 0, 100)}%`, background: '#946f23', height: '100%' }} />
              <div style={{ flex: 1, background: '#15803d', height: '100%' }} />
            </div>

            {/* Explanatory text in simple Egyptian Arabic */}
            <div style={{ fontSize: '0.74rem', color: '#334155', lineHeight: 1.55, borderTop: '1px dashed #e2e8f0', paddingTop: '0.6rem' }}>
              {isAr 
                ? `💡 يعني إيه النتيجة دي ببساطة؟ لو بعت شقة بـ 5,000,000 ج.م وسلّمتها للعميل، النظام هيعتبر تلقائياً إن تكلفة مباني الشقة دي حوالي ${(5000000 * factor).toLocaleString()} ج.م، والباقي ${(5000000 * (1 - factor)).toLocaleString()} ج.م ينزل مكسب صافي حقيقي يدخل خزينة وأرباح المكتب فوراً.`
                : `Ledger Impact: Delivering a 5,000,000 EGP unit will relieve ${(5000000 * factor).toLocaleString()} EGP from WIP (105000) into COGS (501000).`}
            </div>
          </div>

          {/* Modal Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '1rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#64748b',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isMutating}
              style={{
                background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1.35rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: isMutating ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 8px rgba(148, 111, 35, 0.25)'
              }}
            >
              {isMutating ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
              <span>{isAr ? 'حفظ النسبة وتطبيقها على المشروع' : 'Commit & Save Allocation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
