'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  Wallet, 
  Landmark, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ArrowRight, 
  ShieldCheck, 
  Building2, 
  HardHat,
  Search,
  Check
} from 'lucide-react';
import { D, Decimal, generateUUID } from '@/lib/erp/math';
import { ERPPropertyCostItem, ERPPayableInstallment } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { toast } from 'sonner';
import { ZFModalShell } from '../common/ZFModalShell';
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
          ? `تم تسجيل سداد مستحقات المقاول بنجاح ✓ (${contractorLabel})`
          : 'Contractor payment recorded successfully',
        {
          description: isAr
            ? `المبلغ: ${D(amountToPay).formatEGP(true)} • الحالة: ${trancheStatus === 'PAID' ? 'مسدد بالكامل' : 'مسدد جزئياً'}`
            : `Amount: ${D(amountToPay).formatEGP(false)}`,
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

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      isAr={isAr}
      maxWidth="680px"
      icon={<CreditCard size={18} />}
      title={isAr ? 'سداد مستحقات المقاولين والموقع' : 'Settle Contractor & Site Payables'}
      subtitle={isAr ? 'كاش بالخزينة (101000) أو إنستاباي (102000)' : 'Cash — Safe (101000) or InstaPay (102000)'}
      bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* If general mode and no pending costs exist, display an honest empty state */}
      {isGeneralMode && pendingCosts.length === 0 ? (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#64748b' }}>
          <CheckCircle2 size={44} color="#059669" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem' }}>
            {isAr ? 'جميع مستحقات المقاولين مسددة بالكامل ✓' : 'All Contractor Liabilities Are Fully Paid ✓'}
          </h3>
          <p style={{ fontSize: '0.82rem', margin: 0 }}>
            {isAr 
              ? 'لا توجد فواتير أو مستخلصات مفتوحة بحاجة لسداد حالياً.'
              : 'There are no open contractor claims requiring settlement at this time.'}
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginTop: '1.5rem',
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          
          {/* 1. CONTRACTOR & INVOICE SELECTOR (When opened from header or general mode) */}
          {isGeneralMode && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                {isAr ? 'اختر المقاول والمستخلص / الفاتورة المستهدفة *' : 'Target Contractor & Claim *'}
              </label>
              <select
                value={selectedCostId}
                onChange={(e) => setSelectedCostId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  boxSizing: 'border-box'
                }}
              >
                {pendingCosts.map(c => {
                  const { remainingAmount } = calculateCostItemEffectiveTotals(c);
                  const pTitle = properties.find(p => p.id === c.property_id);
                  const projName = pTitle ? (isAr ? pTitle.title_ar : pTitle.title_en) : '';
                  return (
                    <option key={c.item_id || c.id} value={c.item_id || c.id}>
                      {c.supplier_contractor || (isAr ? 'مقاول موقع' : 'Contractor')} • {c.item_name_ar} {projName ? `(${projName})` : ''} — [المتبقي: {D(remainingAmount).formatEGP(isAr)}]
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* 2. TRANCHE / INSTALLMENT SELECTOR (If active cost has multiple installments) */}
          {activeCost && pendingInstallments.length > 0 && !installment && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                {isAr ? 'الدفعة أو القسط المطلوب سداده' : 'Payment Milestone / Tranche'}
              </label>
              <select
                value={selectedInstallmentId}
                onChange={(e) => setSelectedInstallmentId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  boxSizing: 'border-box'
                }}
              >
                {pendingInstallments.map((inst, idx) => {
                  const rem = D(inst.amount_egp).minus(inst.paid_amount_egp || 0);
                  return (
                    <option key={inst.installment_id} value={inst.installment_id}>
                      {inst.title_ar || `${isAr ? 'الدفعة' : 'Tranche'} ${idx + 1}`} (استحقاق: {inst.due_date}) — [المتبقي: {rem.formatEGP(isAr)}]
                    </option>
                  );
                })}
                <option value="DIRECT_SETTLEMENT">
                  {isAr ? 'سداد مباشر من أصل المستحق (كامل المتبقي)' : 'Direct Settlement on Total Balance'}
                </option>
              </select>
            </div>
          )}

          {/* 3. ACTIVE CLAIM SUMMARY CARD */}
          {activeCost && activeInstallment && (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 18px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HardHat size={14} color="var(--erp-accent, #2563eb)" />
                  {activeCost.supplier_contractor || (isAr ? 'شركة مقاولات' : 'Contractor')}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'var(--erp-accent-subtle, rgba(37, 99, 235, 0.08))',
                  color: 'var(--erp-accent, #2563eb)',
                  fontWeight: 700,
                  border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.25))'
                }}>
                  {activeProperty ? (isAr ? activeProperty.title_ar : activeProperty.title_en) : (isAr ? 'مشروع عقاري' : 'Project')}
                </span>
              </div>
              <strong style={{ fontSize: '0.95rem', color: '#0F172A', display: 'block', marginBottom: '10px' }}>
                {isAr ? activeCost.item_name_ar : (activeCost.item_name_en || activeCost.item_name_ar)}
                {activeCost.invoice_ref ? ` • (${activeCost.invoice_ref})` : ''}
              </strong>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.70rem', color: '#64748B', display: 'block' }}>{isAr ? 'إجمالي المستحق' : 'Total Due'}</span>
                  <strong style={{ fontSize: '0.90rem', color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                    {D(activeInstallment.amount_egp || activeCost.total_cost_egp).formatEGP(isAr)}
                  </strong>
                </div>
                <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.70rem', color: '#64748B', display: 'block' }}>{isAr ? 'المسدد سابقاً' : 'Paid So Far'}</span>
                  <strong style={{ fontSize: '0.90rem', color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                    {D(activeInstallment.paid_amount_egp || activeCost.paid_amount_egp || 0).formatEGP(isAr)}
                  </strong>
                </div>
                <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.70rem', color: '#64748B', display: 'block' }}>{isAr ? 'المتبقي غير المسدد' : 'Remaining Due'}</span>
                  <strong style={{ fontSize: '0.90rem', color: 'var(--erp-accent, #2563eb)', fontVariantNumeric: 'tabular-nums' }}>
                    {remainingOnTranche.formatEGP(isAr)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* 4. AMOUNT TO PAY WITH LIVE TAFQEET */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                {isAr ? 'المبلغ المراد سداده الآن (بالجنيه المصري) *' : 'Amount to Pay Now (EGP) *'}
              </label>
              <button
                type="button"
                onClick={() => setAmountToPay(remainingOnTranche.toFixed(2))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--erp-accent, #2563eb)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isAr ? 'سداد كامل المتبقي' : 'Pay Full Remaining'}
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remainingOnTranche.toNumber()}
                required
                value={amountToPay}
                onChange={(e) => setAmountToPay(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  paddingInlineEnd: '56px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: '#0F172A',
                  background: '#FFFFFF',
                  fontVariantNumeric: 'tabular-nums',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{
                position: 'absolute',
                top: '50%',
                insetInlineEnd: '14px',
                transform: 'translateY(-50%)',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#64748B'
              }}>
                {isAr ? 'ج.م' : 'EGP'}
              </span>
            </div>
            {amountToPay && parseFloat(amountToPay) > 0 && (
              <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--erp-accent, #2563eb)', fontWeight: 700 }}>
                {tafqeetEGP(amountToPay)}
              </p>
            )}
          </div>

          {/* 5. PAYMENT METHOD & PAYMENT DATE */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                {isAr ? 'طريقة الصرف والحساب المالي *' : 'Disbursement Method *'}
              </label>
              <select
                aria-label={isAr ? 'طريقة السداد' : 'Payment method'}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  boxSizing: 'border-box'
                }}
              >
                <option value="CASH_101000">{isAr ? 'نقدي — الخزينة (101000)' : 'Cash — Safe (101000)'}</option>
                <option value="INSTAPAY_102000">{isAr ? 'إنستاباي (102000)' : 'InstaPay (102000)'}</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                {isAr ? 'تاريخ التحرير / الصرف *' : 'Payment Date *'}
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* 7. VOUCHER NOTES */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {isAr ? 'ملاحظات إيصال الصرف' : 'Voucher Notes'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isAr ? 'مثال: سداد دفعة أعمال الموقع حسب مستخلص المهندس الاستشاري...' : 'Optional notes...'}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                color: '#0F172A',
                background: '#FFFFFF',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* ACTIONS FOOTER */}
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            justifyContent: 'flex-end', 
            paddingTop: '12px', 
            borderTop: '1px solid #e2e8f0', 
            marginTop: 'auto' 
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 22px',
                borderRadius: '8px',
                border: 'none',
                background: isSubmitting ? '#94a3b8' : 'var(--erp-accent, #2563eb)',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: isSubmitting ? 'none' : '0 2px 8px var(--erp-accent-tint, rgba(37, 99, 235, 0.25))',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={e => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = 'var(--erp-accent-hover, #1d4ed8)';
                }
              }}
              onMouseLeave={e => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = 'var(--erp-accent, #2563eb)';
                }
              }}
            >
              <CheckCircle2 size={15} />
              <span>
                {isSubmitting 
                  ? (isAr ? 'جارٍ السداد...' : 'Processing...') 
                  : (isAr ? 'تأكيد وصرف المبلغ' : 'Confirm & Post Payment')}
              </span>
            </button>
          </div>
        </form>
      )}
    </ZFModalShell>
  );
};
