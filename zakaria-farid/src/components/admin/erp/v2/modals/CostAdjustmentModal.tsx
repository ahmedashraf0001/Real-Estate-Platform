'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  RotateCcw, 
  PlusCircle, 
  MinusCircle, 
  FileText, 
  AlertCircle, 
  Building2, 
  Scale, 
  Calendar, 
  ArrowRight,
  Sparkles,
  Wallet,
  Landmark,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { D, Decimal } from '@/lib/erp/math';
import { ERPPropertyCostItem, CostAdjustmentType, ERPPropertyCostAdjustment } from '@/lib/erp/types';
import { calculateCostItemEffectiveTotals } from '@/lib/erp/propertyCostEngine';
import { Property } from '@/lib/supabase/types';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { toast } from 'sonner';
import { ZFModalShell } from '../common/ZFModalShell';

interface CostAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  costItem: ERPPropertyCostItem | null;
  property?: Property | null;
  isAr?: boolean;
  onConfirmAdjustment: (updatedItem: ERPPropertyCostItem, adjustment: ERPPropertyCostAdjustment) => Promise<void> | void;
}

export const CostAdjustmentModal: React.FC<CostAdjustmentModalProps> = ({
  isOpen,
  onClose,
  costItem,
  property,
  isAr = true,
  onConfirmAdjustment
}) => {
  const [adjustmentType, setAdjustmentType] = useState<CostAdjustmentType>('REFUND_OVERPAYMENT');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [referenceInvoice, setReferenceInvoice] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000'>('CASH_101000');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const currentTotals = costItem ? calculateCostItemEffectiveTotals(costItem) : null;

  const previewNewTotals = useMemo(() => {
    if (!currentTotals) {
      return {
        delta: '0.00',
        net: '0.00',
        isReduction: false
      };
    }
    const numAmt = parseFloat(amount) || 0;
    const base = D(currentTotals.netEffectiveCost);
    if (adjustmentType === 'REFUND_OVERPAYMENT') {
      const net = Decimal.max(0, base.minus(numAmt));
      return {
        delta: `-${D(numAmt).toFixed(2)}`,
        net: net.toFixed(2),
        isReduction: true
      };
    } else if (adjustmentType === 'SUPPLEMENT_UNDERPAYMENT') {
      const net = base.plus(numAmt);
      return {
        delta: `+${D(numAmt).toFixed(2)}`,
        net: net.toFixed(2),
        isReduction: false
      };
    }
    return {
      delta: '0.00',
      net: base.toFixed(2),
      isReduction: false
    };
  }, [amount, adjustmentType, currentTotals?.netEffectiveCost]);

  if (!isOpen || !costItem || !currentTotals) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      toast.error(isAr ? 'يرجى إدخال مبلغ تسوية صحيح أكبر من الصفر' : 'Please enter a valid amount');
      return;
    }
    if (!reason.trim()) {
      toast.error(isAr ? 'يرجى كتابة سبب التسوية للتوثيق المحاسبي' : 'Please provide a reason');
      return;
    }

    setIsSubmitting(true);
    try {
      const newAdjustment: ERPPropertyCostAdjustment = {
        adjustment_id: `adj-${Date.now().toString().slice(-6)}`,
        parent_item_id: costItem.item_id,
        adjustment_type: adjustmentType,
        amount_egp: D(amount).toFixed(2),
        reason: reason.trim(),
        reference_invoice: referenceInvoice.trim() || undefined,
        payment_method: paymentMethod,
        created_at: new Date().toISOString(),
        logged_by: isAr ? 'المكتب المالي - قسم التسويات' : 'Financial Desk'
      };

      const existingAdjustments = costItem.adjustments || [];
      const updatedAdjustments = [...existingAdjustments, newAdjustment];

      const updatedItem: ERPPropertyCostItem = {
        ...costItem,
        adjustments: updatedAdjustments,
        net_effective_cost_egp: previewNewTotals.net,
        updated_at: new Date().toISOString()
      };

      await onConfirmAdjustment(updatedItem, newAdjustment);

      toast.success(
        isAr ? 'تم تسجيل بند التسوية الفرعي بنجاح' : 'Adjustment sub-item recorded successfully',
        {
          description: isAr
            ? `${adjustmentType === 'REFUND_OVERPAYMENT' ? 'استرداد نقدي بالخصم' : 'ملحق سداد مكمل'}: ${D(amount).formatEGP(true)}`
            : `Adjustment amount: ${D(amount).formatEGP(false)}`,
          duration: 4000
        }
      );

      setAmount('');
      setReason('');
      setReferenceInvoice('');
      onClose();
    } catch (err) {
      console.error('CostAdjustmentModal error:', err);
      toast.error(
        isAr ? 'حدث خطأ أثناء حفظ التسوية في قاعدة البيانات' : 'Failed to save adjustment to database',
        { description: err instanceof Error ? err.message : String(err) }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      isAr={isAr}
      maxWidth="680px"
      icon={<RotateCcw size={18} />}
      title={isAr ? 'إضافة بند تسوية وتصحيح فرعي للبند' : 'Add Cost Adjustment Sub-Item'}
      subtitle={isAr 
        ? 'تسوية محاسبية معتمدة لحالات دفع مبالغ بالزيادة واستردادها أو سداد مكمل' 
        : 'Document refunds or supplemental payments without mutating original records'}
      bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >

        {/* Content Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Base Item Context Card */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>
                {isAr ? 'البند الأصلي المقفل' : 'Target Base Cost Item'}
              </span>
              <span style={{
                fontSize: '0.75rem',
                padding: '3px 8px',
                borderRadius: '6px',
                background: '#E2E8F0',
                color: '#334155',
                fontWeight: 700
              }}>
                {property ? (isAr ? property.title_ar : property.title_en) : (isAr ? 'مشروع عقاري' : 'Project')}
              </span>
            </div>
            <strong style={{ fontSize: '1rem', color: '#0F172A', display: 'block', marginBottom: '8px' }}>
              {isAr ? costItem.item_name_ar : (costItem.item_name_en || costItem.item_name_ar)}
            </strong>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748B' }}>{isAr ? 'القيمة المسجلة الأصلية:' : 'Base Cost:'} </span>
                <strong style={{ color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                  {D(costItem.total_cost_egp).formatEGP(isAr)}
                </strong>
              </div>
              {costItem.supplier_contractor && (
                <div>
                  <span style={{ color: '#64748B' }}>{isAr ? 'المورد / المقاول:' : 'Supplier:'} </span>
                  <strong style={{ color: '#0F172A' }}>{costItem.supplier_contractor}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Adjustment Type Tabs */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              {isAr ? 'نوع التسوية المحاسبية الفرعية' : 'Adjustment Type'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setAdjustmentType('REFUND_OVERPAYMENT')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: adjustmentType === 'REFUND_OVERPAYMENT' ? '2px solid var(--erp-accent)' : '1px solid #e2e8f0',
                  background: adjustmentType === 'REFUND_OVERPAYMENT' ? 'var(--erp-accent-subtle)' : '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: adjustmentType === 'REFUND_OVERPAYMENT' ? 'var(--erp-accent)' : '#F1F5F9',
                  color: adjustmentType === 'REFUND_OVERPAYMENT' ? '#FFFFFF' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MinusCircle size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', display: 'block', color: '#0F172A' }}>
                    {isAr ? 'استرداد نقدي (دفع زيادة بالخطأ)' : 'Overpayment Refund (Credit)'}
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {isAr ? 'يقلل تكلفة المشروع ويزيد الخزينة' : 'Reduces cost, returns cash'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAdjustmentType('SUPPLEMENT_UNDERPAYMENT')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: adjustmentType === 'SUPPLEMENT_UNDERPAYMENT' ? '2px solid var(--erp-accent)' : '1px solid #e2e8f0',
                  background: adjustmentType === 'SUPPLEMENT_UNDERPAYMENT' ? 'var(--erp-accent-subtle)' : '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: adjustmentType === 'SUPPLEMENT_UNDERPAYMENT' ? 'var(--erp-accent)' : '#F1F5F9',
                  color: adjustmentType === 'SUPPLEMENT_UNDERPAYMENT' ? '#FFFFFF' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <PlusCircle size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', display: 'block', color: '#0F172A' }}>
                    {isAr ? 'ملحق سداد (دفع أقل من المستحق)' : 'Supplemental Underpayment'}
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {isAr ? 'يزيد تكلفة المشروع ويصرف من الخزينة' : 'Increases cost, extra cash paid'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {isAr ? 'مبلغ التسوية (بالجنيه المصري)' : 'Adjustment Amount (EGP)'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  paddingInlineEnd: '56px',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: '#0F172A',
                  background: '#FFFFFF',
                  fontVariantNumeric: 'tabular-nums'
                }}
              />
              <span style={{
                position: 'absolute',
                top: '50%',
                insetInlineEnd: '16px',
                transform: 'translateY(-50%)',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#64748b'
              }}>
                {isAr ? 'ج.م' : 'EGP'}
              </span>
            </div>
            {amount && parseFloat(amount) > 0 && (
              <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--erp-accent)', fontWeight: 700 }}>
                {tafqeetEGP(amount)}
              </p>
            )}
          </div>

          {/* Reason Input */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {isAr ? 'سبب وملاحظات التسوية والتصحيح' : 'Reason & Accounting Note'}
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isAr ? 'مثال: خطأ في احتساب وزن الحديد وتم استرداد الفارق، أو ملحق أعمال إضافية...' : 'Reason for adjustment...'}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.88rem',
                color: '#0F172A',
                background: '#FFFFFF',
                resize: 'none'
              }}
            />
          </div>

          {/* Reference Invoice & Payment Method */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '22px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                {isAr ? 'رقم الإيصال / الفاتورة المرجعية' : 'Receipt / Invoice Ref'}
              </label>
              <input
                type="text"
                value={referenceInvoice}
                onChange={(e) => setReferenceInvoice(e.target.value)}
                placeholder={isAr ? 'مثال: INV-REC-2026' : 'e.g. REC-102'}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  color: '#0F172A',
                  background: '#FFFFFF'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                {isAr ? 'طريقة الاسترداد / الصرف' : 'Settlement Method'}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  color: '#0F172A',
                  background: '#FFFFFF'
                }}
              >
                <option value="CASH_101000">{isAr ? 'كاش نقدي باليد (الخزينة 101000)' : 'Cash in Hand (Treasury 101000)'}</option>
                <option value="INSTAPAY_102000">{isAr ? 'تحويل إنستاباي فوري (الخزينة 101000)' : 'InstaPay Transfer (Treasury 101000)'}</option>
                <option value="BANK_102000">{isAr ? 'حساب بنكي تجاري (102000)' : 'Commercial Bank Account (102000)'}</option>
              </select>
            </div>
          </div>

          {/* Live Impact Preview Card */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px dashed color-mix(in srgb, var(--erp-accent) 45%, transparent)',
            borderRadius: '14px',
            padding: '16px 20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--erp-accent)' }}>
              <ShieldCheck size={18} />
              <strong style={{ fontSize: '0.88rem' }}>
                {isAr ? 'المعاينة المحاسبية اللحظية للصافي الفعلي' : 'Effective Impact Preview'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748B', display: 'block' }}>
                  {isAr ? 'الصافي الحالي للبند:' : 'Current Net:'}
                </span>
                <strong style={{ fontSize: '1rem', color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                  {D(currentTotals.netEffectiveCost).formatEGP(isAr)}
                </strong>
              </div>
              <ArrowRight size={18} style={{ color: 'var(--erp-accent)', transform: isAr ? 'rotate(180deg)' : 'none' }} />
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748B', display: 'block' }}>
                  {isAr ? 'الصافي الفعلي الجديد بعد التسوية:' : 'New Effective Net:'}
                </span>
                <strong style={{ 
                  fontSize: '1.2rem', 
                  color: '#0F172A', 
                  fontWeight: 900,
                  fontVariantNumeric: 'tabular-nums' 
                }}>
                  {D(previewNewTotals.net).formatEGP(isAr)}
                </strong>
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--erp-accent)',
                color: '#FFFFFF',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px color-mix(in srgb, var(--erp-accent) 25%, transparent)'
              }}
            >
              {isSubmitting 
                ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') 
                : (isAr ? 'اعتماد بند التسوية الفرعي' : 'Confirm Sub-Item Adjustment')}
            </button>
          </div>
        </form>
    </ZFModalShell>
  );
};
