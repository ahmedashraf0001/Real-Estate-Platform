'use client';

import React, { useState, useMemo } from 'react';
import { 
  RotateCcw, 
  PlusCircle, 
  MinusCircle, 
  Wallet,
  Smartphone
} from 'lucide-react';
import { D, Decimal } from '@/lib/erp/math';
import { ERPPropertyCostItem, CostAdjustmentType, ERPPropertyCostAdjustment } from '@/lib/erp/types';
import { calculateCostItemEffectiveTotals } from '@/lib/erp/propertyCostEngine';
import { Property } from '@/lib/supabase/types';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { toast } from 'sonner';
import { ZFModalShell } from '../common/ZFModalShell';
import {
  ZFField,
  ZFMoneyInput,
  ZFChoices,
  ZFFacts,
  ZFEffect,
  ZFFormFooter,
  zfForm
} from '../common/ZFForm';
import shellStyles from '../ZFWorkstationShell.module.css';

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
  }, [amount, adjustmentType, currentTotals]);

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
            ? `${adjustmentType === 'REFUND_OVERPAYMENT' ? 'استرداد نقدي بالخصم' : 'ملحق سداد مكمل'}: ${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} ج.م`
            : `Adjustment amount: ${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} EGP`,
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

  const footer = (
    <ZFFormFooter>
      <button
        type="button"
        className={shellStyles.btnSecondary}
        onClick={onClose}
      >
        {isAr ? 'إلغاء' : 'Cancel'}
      </button>
      <button
        type="submit"
        form="zf-cost-adj-form"
        className={shellStyles.btnPrimary}
        disabled={isSubmitting}
      >
        {isSubmitting ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'تسجيل التسوية' : 'Record adjustment')}
      </button>
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      isAr={isAr}
      maxWidth="640px"
      icon={<RotateCcw size={18} />}
      title={isAr ? 'تسوية بند تكلفة' : 'Cost Adjustment'}
      subtitle={
        isAr
          ? 'تسوية محاسبية لحالات دفع مبالغ بالزيادة واستردادها أو سداد مكمل.'
          : 'Document refunds or supplemental payments without mutating original records.'
      }
      footer={footer}
    >
      <form id="zf-cost-adj-form" className={zfForm.form} onSubmit={handleSubmit}>
        {/* 1. Base Item Context */}
        <ZFFacts
          items={[
            {
              label: isAr ? 'المشروع' : 'Project',
              value: property ? (isAr ? property.title_ar || property.title_en : property.title_en || property.title_ar) : (isAr ? 'مشروع عقاري' : 'Project')
            },
            {
              label: isAr ? 'البند' : 'Cost item',
              value: isAr ? costItem.item_name_ar : (costItem.item_name_en || costItem.item_name_ar)
            },
            {
              label: isAr ? 'التكلفة الأصلية' : 'Base cost',
              value: Number(costItem.total_cost_egp).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP')
            },
            ...(costItem.supplier_contractor ? [
              {
                label: isAr ? 'المورد / المقاول' : 'Supplier',
                value: costItem.supplier_contractor
              }
            ] : [])
          ]}
        />

        {/* 2. Adjustment Type Choices */}
        <ZFField label={isAr ? 'نوع التسوية' : 'Adjustment type'}>
          <ZFChoices<CostAdjustmentType>
            value={adjustmentType}
            onChange={setAdjustmentType}
            options={[
              {
                id: 'REFUND_OVERPAYMENT',
                label: isAr ? 'استرداد نقدي' : 'Overpayment refund',
                sub: isAr ? 'يقلل التكلفة ويزيد الخزينة' : 'Reduces cost, returns cash',
                icon: <MinusCircle size={16} />
              },
              {
                id: 'SUPPLEMENT_UNDERPAYMENT',
                label: isAr ? 'ملحق سداد' : 'Supplemental payment',
                sub: isAr ? 'يزيد التكلفة ويصرف من الخزينة' : 'Increases cost, extra cash paid',
                icon: <PlusCircle size={16} />
              }
            ]}
          />
        </ZFField>

        {/* 3. Amount */}
        <ZFField
          label={isAr ? 'مبلغ التسوية' : 'Adjustment amount'}
          required
          hint={amount && parseFloat(amount) > 0 ? tafqeetEGP(amount) : undefined}
        >
          <ZFMoneyInput
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />
        </ZFField>

        {/* 4. Payment Method */}
        <ZFField label={isAr ? 'طريقة الاسترداد / الصرف' : 'Payment method'}>
          <ZFChoices<'CASH_101000' | 'INSTAPAY_102000'>
            value={paymentMethod === 'BANK_102000' ? 'CASH_101000' : paymentMethod}
            onChange={setPaymentMethod}
            options={[
              {
                id: 'CASH_101000',
                label: isAr ? 'نقداً' : 'Cash',
                sub: isAr ? 'الخزينة' : 'Safe',
                icon: <Wallet size={16} />
              },
              {
                id: 'INSTAPAY_102000',
                label: isAr ? 'إنستاباي' : 'InstaPay',
                sub: isAr ? 'حساب إنستاباي' : 'InstaPay',
                icon: <Smartphone size={16} />
              }
            ]}
          />
        </ZFField>

        {/* 5. Row: Reference & Reason */}
        <div className={zfForm.row}>
          <ZFField label={isAr ? 'رقم الإيصال / المرجع' : 'Reference / invoice'}>
            <input
              type="text"
              className={zfForm.control}
              value={referenceInvoice}
              onChange={e => setReferenceInvoice(e.target.value)}
              placeholder={isAr ? 'اختياري' : 'Optional'}
            />
          </ZFField>
          <ZFField label={isAr ? 'السبب' : 'Reason'} required>
            <input
              type="text"
              className={zfForm.control}
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={isAr ? 'سبب التسوية' : 'Reason for adjustment'}
            />
          </ZFField>
        </div>

        {/* 6. Impact facts */}
        <ZFFacts
          items={[
            {
              label: isAr ? 'الصافي الحالي' : 'Current net',
              value: Number(currentTotals.netEffectiveCost).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP')
            },
            {
              label: isAr ? 'الصافي بعد التسوية' : 'New effective net',
              value: Number(previewNewTotals.net).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP'),
              tone: previewNewTotals.isReduction ? 'pos' : 'neg'
            }
          ]}
        />

        {/* 7. Effect */}
        <ZFEffect tone="info">
          {isAr
            ? `سيتم ${adjustmentType === 'REFUND_OVERPAYMENT' ? 'استرداد' : 'صرف'} مبلغ ${Number(amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ج.م عبر ${paymentMethod === 'CASH_101000' ? 'الخزينة' : 'إنستاباي'} وتعديل صافي البند إلى ${Number(previewNewTotals.net).toLocaleString('en-US', { maximumFractionDigits: 2 })} ج.م.`
            : `Will ${adjustmentType === 'REFUND_OVERPAYMENT' ? 'refund' : 'pay'} ${Number(amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} EGP via ${paymentMethod === 'CASH_101000' ? 'Safe' : 'InstaPay'}, updating net cost to ${Number(previewNewTotals.net).toLocaleString('en-US', { maximumFractionDigits: 2 })} EGP.`}
        </ZFEffect>
      </form>
    </ZFModalShell>
  );
};
