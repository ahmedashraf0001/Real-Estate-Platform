'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  X, 
  Loader2, 
  Building2, 
  PieChart, 
  ShieldCheck,
  TrendingUp,
  Percent
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
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
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [salesValue, setSalesValue] = useState<string>('100000000');
  const [wipAmount, setWipAmount] = useState<string>('45000000');

  useEffect(() => {
    if (isOpen) {
      setSelectedPropertyId('');
      setProjectName('');
      setSalesValue('100000000');
      setWipAmount('45000000');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const wip = parseFloat(wipAmount) || 0;
  const sales = parseFloat(salesValue) || 0;
  const factor = sales > 0 ? (wip / sales) : 0;
  const factorPct = (factor * 100).toFixed(2);
  const grossMarginPct = sales > 0 ? (100 - factor * 100).toFixed(2) : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      alert(isAr ? 'يرجى إدخال اسم المشروع' : 'Please enter project name');
      return;
    }
    if (sales <= 0 || wip <= 0) {
      alert(isAr ? 'يرجى إدخال قيم موجبة لسقف المبيعات وتكلفة الإنشاء' : 'Values must be greater than zero');
      return;
    }

    await onSaveAllocation({
      projectName: projectName.trim(),
      salesValue,
      wipAmount,
      propertyId: selectedPropertyId || undefined
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
                {isAr ? 'معالج احتساب وتوزيع تكلفة المبيعات (RSV Engine)' : 'Relative Sales Value (RSV) Allocation Wizard'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {isAr ? 'احتساب نسبة رسملة تكاليف الإنشاء (WIP 105000) طبقاً لمعيار IFRS 15' : 'IFRS 15 relative sales value COGS capitalization factor'}
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
          
          {/* Portfolio Property Auto-fill Selector */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem'
          }}>
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building2 size={14} color="#946f23" />
              <span>{isAr ? 'اختيار عقار من المحفظة للملء التلقائي (اختياري):' : 'Select from Portfolio to Auto-fill (Optional):'}</span>
            </label>
            <select
              value={selectedPropertyId}
              onChange={e => {
                const propId = e.target.value;
                setSelectedPropertyId(propId);
                if (propId) {
                  const prop = properties.find(p => p.id === propId);
                  if (prop) {
                    const pTitle = isAr ? (prop.title_ar || prop.title_en) : (prop.title_en || prop.title_ar);
                    setProjectName(pTitle);
                    const sVal = (prop.price_egp || 100000000).toString();
                    setSalesValue(sVal);
                    setWipAmount(Math.round((prop.price_egp || 100000000) * 0.45).toString());
                  }
                }
              }}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              <option value="">{isAr ? '-- اختر عقار من قاعدة البيانات أو اكتب يدوياً بالأسفل --' : '-- Choose property to auto-fill or enter manually --'}</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar)} ({D(p.price_egp || 0).formatEGP(isAr)})
                </option>
              ))}
            </select>
          </div>

          {/* Project Name */}
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
              {isAr ? 'اسم المشروع / المرحلة الإنشائية *' : 'Project Name / Phase *'}
            </label>
            <input 
              type="text"
              required
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder={isAr ? 'مثال: مشروع بالاشيال فيلاز & نايل هورايزونز' : 'e.g. Palatial Villas & Nile Horizons'}
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

          {/* Sales Value & Incurred WIP Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Projected Total Sales Value Ceiling */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                  {isAr ? 'سقف المبيعات المقدر (Sales) *' : 'Sales Value Ceiling *'}
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
                  {isAr ? 'تكاليف الإنشاء المتكبدة (WIP) *' : 'Incurred Construction WIP *'}
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

          {/* Quick Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{isAr ? 'نسب تكلفة سريعة:' : 'Quick Presets:'}</span>
            {[
              { pct: 0.35, labelAr: '٣٥٪ تشطيب', labelEn: '35% Finishing' },
              { pct: 0.45, labelAr: '٤٥٪ قياسي', labelEn: '45% Standard' },
              { pct: 0.55, labelAr: '٥٥٪ إنشاء شامل', labelEn: '55% Full Structure' }
            ].map(preset => (
              <button
                key={preset.pct}
                type="button"
                onClick={() => {
                  const s = parseFloat(salesValue) || 100000000;
                  setWipAmount(Math.round(s * preset.pct).toString());
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                {isAr ? preset.labelAr : preset.labelEn}
              </button>
            ))}
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
              <span>{isAr ? 'معادلة الاحتساب:' : 'Formula:'}</span>
              <strong style={{ color: '#0f172a' }}>
                RSV = WIP ({D(wip).formatEGP(isAr)}) ÷ Sales ({D(sales).formatEGP(isAr)})
              </strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                  {isAr ? 'معامل الرسملة (RSV Factor):' : 'Calculated RSV Factor:'}
                </span>
                <strong style={{ fontSize: '1.4rem', color: '#946f23', fontVariantNumeric: 'tabular-nums', display: 'block', marginTop: '0.15rem' }}>
                  {factor.toFixed(4)}
                </strong>
                <span style={{ fontSize: '0.72rem', color: '#946f23', fontWeight: 700 }}>
                  ({factorPct}% {isAr ? 'نسبة تكلفة الإنشاء' : 'cost ratio'})
                </span>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: isAr ? 'left' : 'right' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                  {isAr ? 'هامش الربح الإجمالي المقدر:' : 'Projected Gross Margin:'}
                </span>
                <strong style={{ fontSize: '1.4rem', color: '#15803d', fontVariantNumeric: 'tabular-nums', display: 'block', marginTop: '0.15rem' }}>
                  {grossMarginPct}%
                </strong>
                <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700 }}>
                  ({isAr ? 'عائد التعاقد' : 'profit margin'})
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${Math.min(parseFloat(factorPct) || 0, 100)}%`, background: '#946f23', height: '100%' }} />
              <div style={{ flex: 1, background: '#15803d', height: '100%' }} />
            </div>

            {/* Explanatory text */}
            <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.45, borderTop: '1px dashed #e2e8f0', paddingTop: '0.5rem' }}>
              {isAr 
                ? `الأثر بالدفاتر: عند تسليم وحدة بقيمة 5,000,000 ج.م، سيتم تحويل ${(5000000 * factor).toLocaleString()} ج.م من حساب تكاليف الإنشاء (WIP 105000) إلى تكلفة المبيعات (COGS 501000).`
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
              <span>{isAr ? 'اعتماد معامل الرسملة وحفظه' : 'Commit & Save Allocation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
