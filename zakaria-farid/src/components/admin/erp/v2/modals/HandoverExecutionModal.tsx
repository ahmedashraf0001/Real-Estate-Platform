'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useMemo } from 'react';
import { KeyRound } from 'lucide-react';
import { ERPContract, ERPAccountingPeriod, ERPJournalEntry, ERPCostAllocation } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D, Decimal } from '@/lib/erp/math';
import { ContractsEngine } from '@/lib/erp/contracts';
import { resolvePeriodForDate, CANONICAL_COA } from '@/lib/erp/ledger';
import { getHandoverCOGS } from '@/lib/erp/canonicalMetrics';
import { ZFModalShell } from '../common/ZFModalShell';
import { 
  ZFField, 
  ZFMoneyInput, 
  ZFFacts, 
  ZFEffect, 
  ZFJournalPeek, 
  ZFFormFooter, 
  zfForm 
} from '../common/ZFForm';
import shellStyles from '../ZFWorkstationShell.module.css';

export interface HandoverExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ERPContract | null;
  properties?: Property[];
  activePeriod: ERPAccountingPeriod;
  periods?: ERPAccountingPeriod[];
  costAllocations?: ERPCostAllocation[];
  onConfirmHandover: (contract: ERPContract, handoverDate: string, rsvWipCost: Decimal | string) => Promise<void>;
  isMutating?: boolean;
  isAr?: boolean;
}

export const HandoverExecutionModal: React.FC<HandoverExecutionModalProps> = ({
  isOpen,
  onClose,
  contract,
  properties = [],
  activePeriod,
  periods,
  costAllocations = [],
  onConfirmHandover,
  isMutating = false,
  isAr = true
}) => {
  const [handoverDate, setHandoverDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [rsvCostAmount, setRsvCostAmount] = useState<string>('0.00');
  const [certifiedCompletionAsserted, setCertifiedCompletionAsserted] = useState<boolean>(false);
  const [isCostAllocated, setIsCostAllocated] = useState<boolean>(false);

  // Identify matching property from portfolio
  const linkedProperty = useMemo(() => {
    if (!contract || !properties || properties.length === 0) return null;
    return properties.find(p => 
      (contract.property_id && p.id === contract.property_id) ||
      p.title_ar === contract.unit_id ||
      p.title_en === contract.unit_id ||
      p.building_units?.some(u => u.unit_id === contract.unit_id || u.unit_number === contract.unit_id)
    ) || null;
  }, [contract, properties]);

  // Determine property readiness (POC Completion Gate §4.14 / INV-4.14)
  const isPropertyReady = useMemo(() => {
    if (!linkedProperty) return false;
    return linkedProperty.completion_status === 'ready';
  }, [linkedProperty]);

  // Initialize values when contract changes or modal opens
  useEffect(() => {
    if (isOpen && contract) {
      setHandoverDate(new Date().toISOString().split('T')[0]);
      setCertifiedCompletionAsserted(false);

      // Canonical Handover COGS (RSV-based unit cost relief without arbitrary fallbacks)
      const { cogsFormatted, isAllocated } = getHandoverCOGS({
        contractValue: contract.gross_contract_value || 0,
        costAllocations,
        property: linkedProperty,
      });

      setRsvCostAmount(cogsFormatted);
      setIsCostAllocated(isAllocated);
    }
  }, [isOpen, contract, linkedProperty, costAllocations]);

  // Derived financial metrics
  const grossValue = useMemo(() => D(contract?.gross_contract_value || 0), [contract]);
  const cashCollected = useMemo(() => D(contract?.total_cash_collected || 0), [contract]);
  const unpaidBalance = useMemo(() => {
    const diff = grossValue.minus(cashCollected);
    return diff.isNegative() ? D(0) : diff;
  }, [grossValue, cashCollected]);

  const targetPeriod = useMemo(() => {
    return resolvePeriodForDate(handoverDate, periods || [activePeriod], activePeriod);
  }, [handoverDate, periods, activePeriod]);
  const isTargetPeriodLocked = targetPeriod.status !== 'OPEN';

  // Generate Model B Journal Entry Preview (§14.D.12 & INV-4.17)
  const previewEntry = useMemo<ERPJournalEntry | null>(() => {
    if (!contract || !targetPeriod) return null;
    try {
      const validRsv = D(rsvCostAmount || 0);
      if (validRsv.isZero() || validRsv.isNegative()) return null;
      const previewPeriod: ERPAccountingPeriod = targetPeriod.status === 'OPEN'
        ? targetPeriod
        : { ...targetPeriod, status: 'OPEN' };
      return ContractsEngine.createHandoverModelBEntry(
        contract,
        previewPeriod,
        handoverDate,
        validRsv,
        '501000',
        '151000',
        'PREVIEW'
      );
    } catch (e) {
      console.warn('Model B Preview generation error:', e);
      return null;
    }
  }, [contract, targetPeriod, handoverDate, rsvCostAmount]);

  const hasValidCost = useMemo(() => {
    try {
      return D(rsvCostAmount || '0').gt(0);
    } catch {
      return false;
    }
  }, [rsvCostAmount]);

  if (!isOpen || !contract) return null;

  const isAlreadyDelivered = contract.handover_status === 'Delivered';
  const canConfirm = !isMutating && !isAlreadyDelivered && hasValidCost && (isPropertyReady || certifiedCompletionAsserted) && grossValue.greaterThan(0) && previewEntry !== null && !isTargetPeriodLocked;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfirm) {
      if (!hasValidCost) {
        alert(
          isAr 
            ? 'يرجى إدخال تكلفة البناء المستنزفة (WIP Relief) يدوياً أكبر من الصفر لإتمام التسليم' 
            : 'Please enter a valid construction WIP relief amount greater than zero to proceed'
        );
      }
      return;
    }

    const finalRsv = D(rsvCostAmount || 0);
    await onConfirmHandover(contract, handoverDate, finalRsv.isNegative() ? '0.00' : finalRsv);
    onClose();
  };

  const propertyTitle = linkedProperty
    ? (isAr ? (linkedProperty.title_ar || linkedProperty.title_en) : (linkedProperty.title_en || linkedProperty.title_ar))
    : contract.unit_id;

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
        form="zf-handover-form"
        className={shellStyles.btnPrimary}
        disabled={!canConfirm || isMutating}
      >
        {isMutating 
          ? (isAr ? 'جارٍ التسليم…' : 'Saving…') 
          : (isAr ? 'تأكيد التسليم والترحيل' : 'Confirm Handover')}
      </button>
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      isAr={isAr}
      maxWidth="640px"
      icon={<KeyRound size={18} />}
      title={isAr ? 'تسليم وحدة' : 'Unit Handover'}
      subtitle={isAr 
        ? 'إثبات التسليم الفعلي ونقل الإيراد المؤجل إلى إيراد محقق.' 
        : 'Record physical delivery and recognize realized sales revenue.'}
      footer={footer}
    >
      <form id="zf-handover-form" className={zfForm.form} onSubmit={handleSubmit}>
        {/* Warnings */}
        {isAlreadyDelivered && (
          <ZFEffect tone="warn">
            {isAr 
              ? `تم تسليم هذه الوحدة رسمياً مسبقاً (${contract.handover_date || 'مسجل بالدفاتر'}).` 
              : `Unit already certified and delivered on ${contract.handover_date || 'recorded date'}.`}
          </ZFEffect>
        )}
        {isTargetPeriodLocked && (
          <ZFEffect tone="danger">
            {isAr
              ? 'الفترة المحاسبية لهذا التاريخ مقفلة. اختر تاريخاً آخر.'
              : 'The accounting period for this date is closed. Pick another date.'}
          </ZFEffect>
        )}

        {/* Section: Contract & Property Facts */}
        <div className={zfForm.section}>
          <h4 className={zfForm.sectionTitle}>{isAr ? 'بيانات الوحدة والعقد' : 'Unit & Contract Details'}</h4>
          <ZFFacts
            items={[
              { label: isAr ? 'الوحدة / المشروع' : 'Unit / Project', value: propertyTitle },
              { label: isAr ? 'المشتري' : 'Buyer', value: contract.buyer_name },
              { label: isAr ? 'القيمة التعاقدية' : 'Gross Value', value: `${Number(grossValue.toNumber()).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}` },
              { label: isAr ? 'المحصل بالخزينة' : 'Collected', value: `${Number(cashCollected.toNumber()).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`, tone: 'pos' },
              { label: isAr ? 'الأقساط المتبقية' : 'Remaining Dues', value: `${Number(unpaidBalance.toNumber()).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}` },
              { label: isAr ? 'حالة البناء' : 'Building Status', value: isPropertyReady ? (isAr ? 'جاهز للتسليم' : 'Ready') : (isAr ? 'قيد التنفيذ' : 'Under Construction') }
            ]}
          />
        </div>

        {/* Section: Execution Inputs */}
        <div className={zfForm.section}>
          <h4 className={zfForm.sectionTitle}>{isAr ? 'بيانات التسليم' : 'Handover Details'}</h4>
          <div className={zfForm.row}>
            <ZFField label={isAr ? 'تاريخ التسليم الفعلي' : 'Handover Date'} required>
              <input
                type="date"
                className={zfForm.control}
                value={handoverDate}
                onChange={e => setHandoverDate(e.target.value)}
                required
              />
            </ZFField>
            <ZFField
              label={isAr ? 'تكلفة البناء المستنزفة (WIP)' : 'Construction WIP Relief'}
              required
              hint={isCostAllocated ? (isAr ? 'محسوبة بنظام RSV المعتمد.' : 'Computed via RSV allocation.') : undefined}
            >
              <ZFMoneyInput
                value={rsvCostAmount}
                onChange={e => setRsvCostAmount(e.target.value)}
                unit={isAr ? 'ج.م' : 'EGP'}
                required
              />
            </ZFField>
          </div>

          {!isPropertyReady && (
            <label className={zfForm.labelRow}>
              <span className={zfForm.label}>
                <input
                  type="checkbox"
                  checked={certifiedCompletionAsserted}
                  onChange={e => setCertifiedCompletionAsserted(e.target.checked)}
                />{' '}
                {isAr ? 'إقرار اكتمال الأعمال الإنشائية وجاهزية الوحدة للتسليم' : 'Certify structural completion & unit readiness'}
              </span>
            </label>
          )}
        </div>

        {/* Section: Effect */}
        <ZFEffect>
          {isAr 
            ? 'سيتم إثبات تسليم الوحدة ونقل الإيراد المؤجل إلى إيراد مبيعات محقق وترحيل تكلفة البناء للأستاذ العام.' 
            : 'Unit delivery will be recorded, deferred revenue recognized as sales revenue, and construction cost relieved.'}
        </ZFEffect>

        {/* Section: Journal Peek */}
        {previewEntry && previewEntry.lines && previewEntry.lines.length > 0 && (
          <ZFJournalPeek
            isAr={isAr}
            lines={previewEntry.lines.map(l => ({
              code: l.account_code,
              name: (isAr ? CANONICAL_COA[l.account_code]?.account_name_ar : CANONICAL_COA[l.account_code]?.account_name_en) || l.memo || '',
              debit: l.debit_amount,
              credit: l.credit_amount
            }))}
          />
        )}
      </form>
    </ZFModalShell>
  );
};
