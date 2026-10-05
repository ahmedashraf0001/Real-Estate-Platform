'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  Wallet, 
  Smartphone 
} from 'lucide-react';
import { D, generateUUID } from '@/lib/erp/math';
import { ERPPropertyCostItem, ERPPayableInstallment } from '@/lib/erp/types';
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
  ZFFormDone,
  zfForm
} from '../common/ZFForm';
import shellStyles from '../ZFWorkstationShell.module.css';
import { getConstructionSettlementOpeningBalance, getConstructionSettlementOpeningBalance as calculateCostItemEffectiveTotals } from '@/lib/erp/canonicalMetrics';
import { recordPayableInstallmentPayment } from '@/lib/erp/propertyCostEngine';

export interface CostPayableSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  costItem?: ERPPropertyCostItem | null;
  installment?: ERPPayableInstallment | null;
  property?: Property | null;
  availableCosts?: ERPPropertyCostItem[];
  properties?: Property[];
  defaultPaymentMethod?: 'CASH_101000' | 'INSTAPAY_102000';
  isAr?: boolean;
  onConfirmPayment: (
    updatedItem: ERPPropertyCostItem,
    installmentId: string,
    amountPaid: string,
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000'
  ) => Promise<void> | void;
}

export const CostPayableSettlementModal: React.FC<CostPayableSettlementModalProps> = ({
  isOpen,
  onClose,
  costItem,
  installment,
  property,
  availableCosts = [],
  properties = [],
  defaultPaymentMethod = 'CASH_101000',
  isAr = true,
  onConfirmPayment
}) => {
  // Pending candidate costs (with remaining balance > 0)
  const pendingCosts = useMemo(() => {
    return availableCosts.filter(c => {
      const { remainingAmount } = calculateCostItemEffectiveTotals(c);
      return D(remainingAmount).gt(0);
    });
  }, [availableCosts]);

  // Selected Cost Item ID (supports picking from availableCosts if costItem is not fixed)
  const [selectedCostId, setSelectedCostId] = useState<string>('');

  useEffect(() => {
    if (costItem) {
      setSelectedCostId(costItem.item_id || costItem.id || '');
    } else if (pendingCosts.length > 0 && !selectedCostId) {
      setSelectedCostId(pendingCosts[0].item_id || pendingCosts[0].id || '');
    }
  }, [costItem, pendingCosts, selectedCostId]);

  // Determine active cost item
  const activeCost = useMemo(() => {
    if (costItem) return costItem;
    return pendingCosts.find(c => (c.item_id || c.id) === selectedCostId) || null;
  }, [costItem, pendingCosts, selectedCostId]);

  // Determine active property
  const activeProperty = useMemo(() => {
    if (property) return property;
    if (!activeCost) return null;
    return properties.find(p => p.id === activeCost.property_id) || null;
  }, [property, activeCost, properties]);

  // Pending installments for the active cost item
  const pendingInstallments = useMemo(() => {
    if (!activeCost?.payable_installments) return [];
    return activeCost.payable_installments.filter(i => i.status !== 'PAID');
  }, [activeCost]);

  // Selected Installment ID
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>('');

  useEffect(() => {
    if (installment) {
      setSelectedInstallmentId(installment.installment_id);
    } else if (pendingInstallments.length > 0) {
      setSelectedInstallmentId(pendingInstallments[0].installment_id);
    } else {
      setSelectedInstallmentId('DIRECT_SETTLEMENT');
    }
  }, [installment, pendingInstallments, activeCost]);

  // Determine active installment
  const activeInstallment: ERPPayableInstallment | null = useMemo(() => {
    if (!activeCost) return null;
    if (installment) return installment;

    if (selectedInstallmentId && selectedInstallmentId !== 'DIRECT_SETTLEMENT') {
      const found = activeCost.payable_installments?.find(i => i.installment_id === selectedInstallmentId);
      if (found) return found;
    }

    const { remainingAmount } = calculateCostItemEffectiveTotals(activeCost);
    return {
      installment_id: generateUUID(),
      cost_item_id: activeCost.item_id || activeCost.id || '',
      installment_number: (activeCost.payable_installments?.length || 0) + 1,
      title_ar: isAr ? 'سداد مستحقات مباشرة' : 'Direct settlement',
      title_en: 'Direct settlement',
      due_date: activeCost.due_date || new Date().toISOString().split('T')[0],
      amount_egp: remainingAmount,
      paid_amount_egp: '0.00',
      status: 'PENDING' as const
    };
  }, [activeCost, installment, selectedInstallmentId, isAr]);

  // Form Fields
  const [amountToPay, setAmountToPay] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH_101000' | 'INSTAPAY_102000'>(defaultPaymentMethod);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [paymentId, setPaymentId] = useState(() => generateUUID());
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync paymentMethod with defaultPaymentMethod whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod(defaultPaymentMethod);
      setPaymentId(generateUUID());
    }
  }, [isOpen, defaultPaymentMethod]);

  // Compute remaining balance on selected tranche / cost
  const remainingOnTranche = useMemo(() => {
    if (!activeCost) return D(0);
    if (!activeInstallment) {
      const { remainingAmount } = calculateCostItemEffectiveTotals(activeCost);
      return D(remainingAmount);
    }
    const instAmt = D(activeInstallment.amount_egp || 0);
    const instPaid = D(activeInstallment.paid_amount_egp || 0);
    const trancheRem = instAmt.minus(instPaid);
    if (trancheRem.gt(0)) return trancheRem;
    
    // Fallback: if tranche remaining is 0 but costItem has pending remaining balance
    const costRem = D(getConstructionSettlementOpeningBalance(activeCost).remainingAmount);
    return costRem.gt(0) ? costRem : D(0);
  }, [activeInstallment, activeCost]);

  useEffect(() => {
    if (remainingOnTranche.gt(0)) {
      setAmountToPay(remainingOnTranche.toFixed(2));
    }
  }, [remainingOnTranche]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCost || !activeInstallment) {
      toast.error(isAr ? 'يرجى اختيار مقاول ومستخلص صحيح' : 'Please select a valid contractor claim');
      return;
    }

    const numAmt = parseFloat(amountToPay);
    if (isNaN(numAmt) || numAmt <= 0) {
      toast.error(isAr ? 'يرجى إدخال مبلغ سداد صحيح' : 'Please enter a valid amount');
      return;
    }

    if (D(amountToPay).gt(remainingOnTranche)) {
      toast.error(
        isAr 
          ? `المبلغ المدخل (${amountToPay} ج.م) يتجاوز المتبقي من هذا المستحق (${remainingOnTranche.toFixed(2)} ج.م)` 
          : 'Amount exceeds tranche remaining'
      );
      return;
    }

    const formattedNotes = notes.trim();

    setIsSubmitting(true);
    try {
      const updatedItem = recordPayableInstallmentPayment(
        activeCost,
        activeInstallment.installment_id,
        amountToPay,
        paymentMethod,
        paymentDate,
        formattedNotes,
        { ...activeInstallment, payment_id: paymentId, treasury_account_code: paymentMethod === 'CASH_101000' ? '101000' : '102000' }
      );

      const targetTranche = updatedItem.payable_installments?.find(i => i.installment_id === activeInstallment.installment_id)
        || updatedItem.payable_installments?.[updatedItem.payable_installments.length - 1];
      const trancheStatus = targetTranche?.status || 'PAID';

      await onConfirmPayment(updatedItem, activeInstallment.installment_id, amountToPay, paymentMethod);

      const contractorLabel = activeCost.supplier_contractor || (isAr ? 'المقاول' : 'Contractor');
      toast.success(
        isAr 
          ? `تم تسجيل سداد مستحقات المقاول بنجاح (${contractorLabel})`
          : 'Contractor payment recorded successfully',
        {
          description: isAr
            ? `المبلغ: ${Number(amountToPay).toLocaleString('en-US', { maximumFractionDigits: 2 })} ج.م • الحالة: ${trancheStatus === 'PAID' ? 'مسدد بالكامل' : 'مسدد جزئياً'}`
            : `Amount: ${Number(amountToPay).toLocaleString('en-US', { maximumFractionDigits: 2 })} EGP`,
          duration: 4500
        }
      );

      onClose();
    } catch (err) {
      console.error(err);
      toast.error(isAr ? 'حدث خطأ أثناء تسجيل السداد' : 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isGeneralMode = !costItem;
  const isAllPaid = isGeneralMode && pendingCosts.length === 0;

  const footer = isAllPaid ? (
    <ZFFormFooter>
      <button
        type="button"
        className={shellStyles.btnPrimary}
        onClick={onClose}
      >
        {isAr ? 'إغلاق' : 'Close'}
      </button>
    </ZFFormFooter>
  ) : (
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
        form="zf-payable-settle-form"
        className={shellStyles.btnPrimary}
        disabled={isSubmitting}
      >
        {isSubmitting
          ? (isAr ? 'جارٍ السداد…' : 'Processing…')
          : (isAr ? 'تأكيد وصرف المبلغ' : 'Confirm payment')}
      </button>
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      isAr={isAr}
      maxWidth="640px"
      icon={<CreditCard size={18} />}
      title={isAr ? 'سداد مستحقات المقاولين' : 'Settle Contractor Payables'}
      subtitle={
        isAr
          ? 'صرف وسداد مستحقات المقاولين نقداً أو عبر إنستاباي.'
          : 'Disburse and settle contractor payables in cash or via InstaPay.'
      }
      footer={footer}
    >
      {isAllPaid ? (
        <ZFFormDone
          title={isAr ? 'جميع مستحقات المقاولين مسددة' : 'All Contractor Liabilities Paid'}
          text={
            isAr
              ? 'لا توجد فواتير أو مستخلصات مفتوحة بحاجة لسداد حالياً.'
              : 'There are no open contractor claims requiring settlement at this time.'
          }
        />
      ) : (
        <form id="zf-payable-settle-form" className={zfForm.form} onSubmit={handleSubmit}>
          {/* 1. Target contractor selector if in general mode */}
          {isGeneralMode && (
            <ZFField label={isAr ? 'المقاول والمستخلص المستهدف' : 'Target contractor & claim'} required>
              <select
                className={zfForm.control}
                value={selectedCostId}
                onChange={(e) => setSelectedCostId(e.target.value)}
                required
              >
                {pendingCosts.map(c => {
                  const { remainingAmount } = calculateCostItemEffectiveTotals(c);
                  const pTitle = properties.find(p => p.id === c.property_id);
                  const projName = pTitle ? (isAr ? pTitle.title_ar : pTitle.title_en) : '';
                  return (
                    <option key={c.item_id || c.id} value={c.item_id || c.id}>
                      {c.supplier_contractor || (isAr ? 'مقاول موقع' : 'Contractor')} • {c.item_name_ar} {projName ? `(${projName})` : ''} — [المتبقي: {Number(remainingAmount).toLocaleString('en-US', { maximumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}]
                    </option>
                  );
                })}
              </select>
            </ZFField>
          )}

          {/* 2. Tranche / Installment selector */}
          {activeCost && pendingInstallments.length > 0 && !installment && (
            <ZFField label={isAr ? 'الدفعة أو القسط المطلوب سداده' : 'Payment milestone / tranche'}>
              <select
                className={zfForm.control}
                value={selectedInstallmentId}
                onChange={(e) => setSelectedInstallmentId(e.target.value)}
              >
                {pendingInstallments.map((inst, idx) => {
                  const rem = D(inst.amount_egp).minus(inst.paid_amount_egp || 0);
                  return (
                    <option key={inst.installment_id} value={inst.installment_id}>
                      {inst.title_ar || `${isAr ? 'الدفعة' : 'Tranche'} ${idx + 1}`} ({inst.due_date}) — [المتبقي: {Number(rem.toNumber()).toLocaleString('en-US', { maximumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}]
                    </option>
                  );
                })}
                <option value="DIRECT_SETTLEMENT">
                  {isAr ? 'سداد مباشر من أصل المستحق (كامل المتبقي)' : 'Direct settlement on total balance'}
                </option>
              </select>
            </ZFField>
          )}

          {/* 3. Active claim facts */}
          {activeCost && activeInstallment && (
            <ZFFacts
              items={[
                {
                  label: isAr ? 'المقاول' : 'Contractor',
                  value: activeCost.supplier_contractor || (isAr ? 'شركة مقاولات' : 'Contractor')
                },
                {
                  label: isAr ? 'المشروع' : 'Project',
                  value: activeProperty ? (isAr ? activeProperty.title_ar || activeProperty.title_en : activeProperty.title_en || activeProperty.title_ar) : (isAr ? 'مشروع عقاري' : 'Project')
                },
                {
                  label: isAr ? 'إجمالي المستحق' : 'Total due',
                  value: Number(activeInstallment.amount_egp || activeCost.total_cost_egp).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP')
                },
                {
                  label: isAr ? 'المسدد سابقاً' : 'Paid so far',
                  value: Number(activeInstallment.paid_amount_egp || activeCost.paid_amount_egp || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP')
                },
                {
                  label: isAr ? 'المتبقي غير المسدد' : 'Remaining due',
                  value: Number(remainingOnTranche.toNumber()).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP'),
                  tone: 'neg'
                }
              ]}
            />
          )}

          {/* 4. Amount to pay */}
          <ZFField
            label={isAr ? 'المبلغ المراد سداده' : 'Amount to pay'}
            required
            aside={
              <button
                type="button"
                className={shellStyles.btnGhost}
                onClick={() => setAmountToPay(remainingOnTranche.toFixed(2))}
              >
                {isAr ? 'سداد كامل المتبقي' : 'Pay full remaining'}
              </button>
            }
            hint={amountToPay && parseFloat(amountToPay) > 0 ? tafqeetEGP(amountToPay) : undefined}
          >
            <ZFMoneyInput
              value={amountToPay}
              onChange={(e) => setAmountToPay(e.target.value)}
              required
              max={remainingOnTranche.toNumber()}
            />
          </ZFField>

          {/* 5. Payment method choices */}
          <ZFField label={isAr ? 'طريقة الصرف' : 'Disbursement method'}>
            <ZFChoices<'CASH_101000' | 'INSTAPAY_102000'>
              value={paymentMethod}
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

          {/* 6. Date & Notes */}
          <div className={zfForm.row}>
            <ZFField label={isAr ? 'تاريخ الصرف' : 'Payment date'} required>
              <input
                type="date"
                className={zfForm.control}
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </ZFField>
            <ZFField label={isAr ? 'ملاحظات إيصال الصرف' : 'Voucher notes'}>
              <input
                type="text"
                className={zfForm.control}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isAr ? 'اختياري' : 'Optional'}
              />
            </ZFField>
          </div>

          {/* 7. Effect */}
          <ZFEffect tone="info">
            {isAr
              ? `سيُصرف مبلغ ${Number(amountToPay || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ج.م من ${paymentMethod === 'CASH_101000' ? 'الخزينة' : 'حساب إنستاباي'} لصالح ${activeCost?.supplier_contractor || 'المقاول'}، وتخفيض رصيد المستحقات.`
              : `Will disburse ${Number(amountToPay || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} EGP from ${paymentMethod === 'CASH_101000' ? 'the safe' : 'InstaPay'} to ${activeCost?.supplier_contractor || 'contractor'}, reducing payable balance.`}
          </ZFEffect>
        </form>
      )}
    </ZFModalShell>
  );
};
