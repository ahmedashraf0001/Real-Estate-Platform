'use client';

import React, { useState, useMemo } from 'react';
import { 
  RotateCcw, 
  PlusCircle, 
  MinusCircle, 
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { D, Decimal } from '@/lib/erp/math';
import { ERPPropertyCostItem, CostAdjustmentType, ERPPropertyCostAdjustment } from '@/lib/erp/types';
import { calculateCostItemEffectiveTotals } from '@/lib/erp/propertyCostEngine';
import { Property } from '@/lib/supabase/types';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { toast } from 'sonner';
import { ZFModalShell } from '../common/ZFModalShell';
import p from '../common/ZFModalPrimitives.module.css';

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

  if (!isOpen || !costItem) return null;

  const currentTotals = calculateCostItemEffectiveTotals(costItem);

  const previewNewTotals = useMemo(() => {
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
  }, [amount, adjustmentType, currentTotals.netEffectiveCost]);

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
      footer={
        <>
          <button
            type="submit"
            form="cost-adjustment-form"
            className={p.primaryButton}
            disabled={isSubmitting}
          >
            {isSubmitting 
              ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') 
              : (isAr ? 'اعتماد بند التسوية الفرعي' : 'Confirm Sub-Item Adjustment')}
          </button>
          <button
            type="button"
            className={p.secondaryButton}
            onClick={onClose}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
        </>
      }
    >
      <form id="cost-adjustment-form" onSubmit={handleSubmit}>
        {/* Base item */}
        <section className={p.section}>
          <div className={p.sectionHeader}>
            <h4 className={p.sectionTitle}>
              {isAr ? 'البند الأصلي المقفل' : 'Target Base Cost Item'}
            </h4>
            <span className={p.pill}>
              <bdi>{property ? (isAr ? property.title_ar : property.title_en) : (isAr ? 'مشروع عقاري' : 'Project')}</bdi>
            </span>
          </div>
          <dl className={p.metaList}>
            <div className={p.metaRow}>
              <dt className={p.metaKey}>{isAr ? 'اسم البند' : 'Item Name'}</dt>
              <dd className={p.metaValue}>
                <bdi>{isAr ? costItem.item_name_ar : (costItem.item_name_en || costItem.item_name_ar)}</bdi>
              </dd>
            </div>
            <div className={p.metaRow}>
              <dt className={p.metaKey}>{isAr ? 'القيمة المسجلة الأصلية' : 'Base Cost'}</dt>
              <dd className={p.metaValue}>
                <bdi>{D(costItem.total_cost_egp).formatEGP(isAr)}</bdi>
              </dd>
            </div>
            <div className={p.metaRow}>
              <dt className={p.metaKey}>{isAr ? 'المورد / المقاول' : 'Supplier'}</dt>
              <dd className={costItem.supplier_contractor ? p.metaValue : `${p.metaValue} ${p.emptyValue}`}>
                {costItem.supplier_contractor
                  ? <bdi>{costItem.supplier_contractor}</bdi>
                  : (isAr ? 'غير مُدخل' : 'Not entered')}
              </dd>
            </div>
          </dl>
        </section>

        {/* Adjustment type */}
        <section className={p.section}>
          <h4 className={p.sectionTitle}>
            {isAr ? 'نوع التسوية المحاسبية الفرعية' : 'Adjustment Type'}
          </h4>
          <div className={p.choiceGrid} role="radiogroup">
            <button
              type="button"
              role="radio"
              aria-checked={adjustmentType === 'REFUND_OVERPAYMENT'}
              onClick={() => setAdjustmentType('REFUND_OVERPAYMENT')}
              className={adjustmentType === 'REFUND_OVERPAYMENT' ? `${p.choice} ${p.choiceSelected}` : p.choice}
            >
              <span className={p.choiceIcon}><MinusCircle size={16} /></span>
              <span className={p.choiceText}>
                <span className={p.choiceTitle}>
                  {isAr ? 'استرداد نقدي (دفع زيادة بالخطأ)' : 'Overpayment Refund (Credit)'}
                </span>
                <span className={p.choiceDesc}>
                  {isAr ? 'يقلل تكلفة المشروع ويزيد الخزينة' : 'Reduces cost, returns cash'}
                </span>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={adjustmentType === 'SUPPLEMENT_UNDERPAYMENT'}
              onClick={() => setAdjustmentType('SUPPLEMENT_UNDERPAYMENT')}
              className={adjustmentType === 'SUPPLEMENT_UNDERPAYMENT' ? `${p.choice} ${p.choiceSelected}` : p.choice}
            >
              <span className={p.choiceIcon}><PlusCircle size={16} /></span>
              <span className={p.choiceText}>
                <span className={p.choiceTitle}>
                  {isAr ? 'ملحق سداد (دفع أقل من المستحق)' : 'Supplemental Underpayment'}
                </span>
                <span className={p.choiceDesc}>
                  {isAr ? 'يزيد تكلفة المشروع ويصرف من الخزينة' : 'Increases cost, extra cash paid'}
                </span>
              </span>
            </button>
          </div>
        </section>

        {/* Details */}
        <section className={p.section}>
          <h4 className={p.sectionTitle}>{isAr ? 'تفاصيل التسوية' : 'Adjustment Details'}</h4>
          <div className={p.fieldGrid}>
            <div className={`${p.field} ${p.fieldFull}`}>
              <label className={p.label} htmlFor="ca-amount">
                {isAr ? 'مبلغ التسوية' : 'Adjustment Amount'}
              </label>
              <div className={p.affixWrap}>
                <input
                  id="ca-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`${p.input} ${p.inputLarge} ${p.numeric}`}
                />
                <span className={p.affix}>{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
              {amount && parseFloat(amount) > 0 && (
                <p className={p.hint}>{tafqeetEGP(amount)}</p>
              )}
            </div>

            <div className={`${p.field} ${p.fieldFull}`}>
              <label className={p.label} htmlFor="ca-reason">
                {isAr ? 'سبب وملاحظات التسوية والتصحيح' : 'Reason & Accounting Note'}
              </label>
              <textarea
                id="ca-reason"
                required
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={isAr ? 'مثال: خطأ في احتساب وزن الحديد وتم استرداد الفارق، أو ملحق أعمال إضافية...' : 'Reason for adjustment...'}
                className={p.input}
              />
            </div>

            <div className={p.field}>
              <label className={p.label} htmlFor="ca-ref">
                {isAr ? 'رقم الإيصال / الفاتورة المرجعية' : 'Receipt / Invoice Ref'}
              </label>
              <input
                id="ca-ref"
                type="text"
                value={referenceInvoice}
                onChange={(e) => setReferenceInvoice(e.target.value)}
                placeholder={isAr ? 'مثال: INV-REC-2026' : 'e.g. REC-102'}
                className={p.input}
              />
            </div>
            <div className={p.field}>
              <label className={p.label} htmlFor="ca-method">
                {isAr ? 'طريقة الاسترداد / الصرف' : 'Settlement Method'}
              </label>
              <select
                id="ca-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className={p.input}
              >
                <option value="CASH_101000">{isAr ? 'كاش نقدي باليد (الخزينة 101000)' : 'Cash in Hand (Treasury 101000)'}</option>
                <option value="INSTAPAY_102000">{isAr ? 'تحويل إنستاباي فوري (الخزينة 101000)' : 'InstaPay Transfer (Treasury 101000)'}</option>
                <option value="BANK_102000">{isAr ? 'حساب بنكي تجاري (102000)' : 'Commercial Bank Account (102000)'}</option>
              </select>
            </div>
          </div>
        </section>

        {/* Impact preview */}
        <section className={p.section}>
          <h4 className={p.sectionTitle}>
            {isAr ? 'المعاينة المحاسبية اللحظية للصافي الفعلي' : 'Effective Impact Preview'}
          </h4>
          <div className={p.compare}>
            <div className={p.compareItem}>
              <span className={p.compareLabel}>{isAr ? 'الصافي الحالي للبند' : 'Current Net'}</span>
              <bdi className={p.compareValue}>{D(currentTotals.netEffectiveCost).formatEGP(isAr)}</bdi>
            </div>
            {isAr
              ? <ArrowLeft size={18} className={p.compareArrow} aria-hidden />
              : <ArrowRight size={18} className={p.compareArrow} aria-hidden />}
            <div className={p.compareItem}>
              <span className={p.compareLabel}>{isAr ? 'الصافي الفعلي الجديد بعد التسوية' : 'New Effective Net'}</span>
              <bdi className={p.compareValueStrong}>{D(previewNewTotals.net).formatEGP(isAr)}</bdi>
            </div>
          </div>
        </section>
      </form>
    </ZFModalShell>
  );
};
