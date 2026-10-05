'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule, ERPAccountingPeriod } from '@/lib/erp/types';
import { RescissionEngine, resolveRescissionCost } from '@/lib/erp/rescission';
import { resolvePeriodForDate, CANONICAL_COA } from '@/lib/erp/ledger';
import { D, ratio } from '@/lib/erp/math';
import { ZFModalShell } from '../common/ZFModalShell';
import { 
  ZFField, 
  ZFChoices, 
  ZFFacts, 
  ZFEffect, 
  ZFJournalPeek, 
  ZFFormFooter, 
  ZFFormDone, 
  zfForm 
} from '../common/ZFForm';
import { useERPWorkstationContext } from '../../context/ERPWorkstationContext';
import shellStyles from '../ZFWorkstationShell.module.css';

export interface RescissionSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ERPContract | null;
  contracts?: ERPContract[];
  schedules: ERPInstallmentSchedule[];
  activePeriod: ERPAccountingPeriod;
  periods?: ERPAccountingPeriod[];
  onConfirmRescission: (details: {
    selectedBranch: 'Branch1_PreDelivery' | 'Branch2_PostDelivery';
    rescissionDate: string;
    targetContract?: ERPContract;
    penaltyRate?: number;
  }) => Promise<void>;
  isMutating?: boolean;
  isAr?: boolean;
}

export const RescissionSettlementModal: React.FC<RescissionSettlementModalProps> = ({
  isOpen,
  onClose,
  contract,
  contracts = [],
  schedules,
  activePeriod,
  periods,
  onConfirmRescission,
  isMutating = false,
  isAr = true
}) => {
  const erp = useERPWorkstationContext?.();
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<'Branch1_PreDelivery' | 'Branch2_PostDelivery'>('Branch1_PreDelivery');
  const [rescissionDate, setRescissionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [penaltyRatePercent, setPenaltyRatePercent] = useState<number>(10);
  const [rescissionSuccess, setRescissionSuccess] = useState<{
    contractNumber: string;
    buyer: string;
    unitId: string;
    penaltyRetained: string;
    netRefundLiability: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (contract && contract.contract_id) {
        setSelectedContractId(contract.contract_id);
      } else if (contracts.length > 0 && (!selectedContractId || !contracts.some(c => c.contract_id === selectedContractId))) {
        setSelectedContractId(contracts[0].contract_id);
      }
      setRescissionDate(new Date().toISOString().split('T')[0]);
      setPenaltyRatePercent(10);
      setRescissionSuccess(null);
    }
  }, [isOpen, contract, contracts]);

  const contractList = useMemo(() => {
    const list = contracts.length > 0 ? contracts : (contract ? [contract] : []);
    return list.filter(c => c.status !== 'Rescinded');
  }, [contracts, contract]);

  const activeContract = useMemo(() => {
    if (contractList.length > 0) {
      return contractList.find(c => c.contract_id === selectedContractId) || contract || contractList[0];
    }
    return contract;
  }, [contractList, selectedContractId, contract]);

  const contractSchedules = useMemo(() => {
    if (!activeContract) return [];
    return schedules.filter(s => s.contract_id === activeContract.contract_id);
  }, [schedules, activeContract]);

  const targetPeriod = useMemo(() => {
    return resolvePeriodForDate(rescissionDate, periods || [activePeriod], activePeriod);
  }, [rescissionDate, periods, activePeriod]);
  const isTargetPeriodLocked = targetPeriod.status !== 'OPEN';

  // Fraction as exact text: D(7.5).div(100) would round 7.5% to 8%.
  const penaltyRateFraction = useMemo(() => {
    const val = Number(penaltyRatePercent);
    if (isNaN(val) || val < 0) return '0';
    if (val > 100) return '1';
    return ratio(val, 100, 6);
  }, [penaltyRatePercent]);

  // The branch follows the contract's real delivery status (the engine decides by it too).
  useEffect(() => {
    if (isOpen && activeContract) {
      setSelectedBranch(activeContract.handover_status === 'Delivered' ? 'Branch2_PostDelivery' : 'Branch1_PreDelivery');
    }
  }, [isOpen, activeContract]);

  // Unit cost from recorded data only (handover entry or RSV allocation) — never an assumed ratio.
  const costResolution = useMemo(() => {
    if (!activeContract) return null;
    return resolveRescissionCost({
      contract: activeContract,
      journalEntries: erp?.data.journalEntries,
      costAllocations: erp?.data.costAllocations,
      properties: erp?.data.properties,
    });
  }, [activeContract, erp?.data.journalEntries, erp?.data.costAllocations, erp?.data.properties]);
  const isCostMissing = Boolean(costResolution?.needed && costResolution.amount === null);

  const computed = useMemo(() => {
    if (!activeContract || !targetPeriod || !costResolution || isCostMissing) return null;
    try {
      const calculationPeriod: ERPAccountingPeriod = targetPeriod.status === 'OPEN'
        ? targetPeriod
        : { ...targetPeriod, status: 'OPEN' };
      return RescissionEngine.processRescission(
        activeContract,
        contractSchedules,
        calculationPeriod,
        rescissionDate,
        costResolution.amount ?? '0.00',
        '501000',
        '151000',
        'CFO_FARID',
        costResolution.handoverEntry,
        penaltyRateFraction
      );
    } catch (err) {
      console.warn('Rescission preview computation error:', err);
      return null;
    }
  }, [activeContract, contractSchedules, targetPeriod, rescissionDate, penaltyRateFraction, costResolution, isCostMissing]);

  if (!isOpen || !activeContract) return null;

  const preview = computed ? {
    grossContractValue: computed.rescissionRecord.gross_contract_value,
    totalCashCollected: computed.rescissionRecord.total_cash_collected,
    penaltyRetained: computed.rescissionRecord.penalty_retained,
    netRefundLiability: computed.rescissionRecord.net_refund_liability,
    journalEntry: computed.journalEntry
  } : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!computed || isTargetPeriodLocked || isMutating) return;

    const rateNum = Number(penaltyRateFraction);
    erp?.setRescissionPenaltyRate?.(rateNum);
    await onConfirmRescission({
      selectedBranch,
      rescissionDate,
      targetContract: activeContract,
      penaltyRate: rateNum
    });

    setRescissionSuccess({
      contractNumber: activeContract.contract_number,
      buyer: activeContract.buyer_name,
      unitId: activeContract.unit_id,
      penaltyRetained: computed.rescissionRecord.penalty_retained,
      netRefundLiability: computed.rescissionRecord.net_refund_liability
    });
  };

  const handleModalClose = () => {
    setRescissionSuccess(null);
    onClose();
  };

  const footer = rescissionSuccess ? (
    <ZFFormFooter>
      <button
        type="button"
        className={shellStyles.btnPrimary}
        onClick={handleModalClose}
      >
        {isAr ? 'إغلاق' : 'Close'}
      </button>
    </ZFFormFooter>
  ) : (
    <ZFFormFooter>
      <button
        type="button"
        className={shellStyles.btnSecondary}
        onClick={handleModalClose}
      >
        {isAr ? 'إلغاء' : 'Cancel'}
      </button>
      <button
        type="submit"
        form="zf-rescission-form"
        className={shellStyles.btnDanger}
        disabled={isMutating || isTargetPeriodLocked || !computed}
      >
        {isMutating 
          ? (isAr ? 'جارٍ الفسخ…' : 'Saving…') 
          : (isAr ? 'تأكيد فسخ العقد' : 'Confirm Rescission')}
      </button>
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={handleModalClose}
      title={isAr ? 'فسخ العقد' : 'Contract Rescission'}
      subtitle={isAr 
        ? 'احتساب غرامة الفسخ ورد المستحق وإلغاء الأقساط المستقبلية.' 
        : 'Calculate penalty, net refund liability, and cancel pending installments.'}
      icon={<RotateCcw size={18} />}
      maxWidth="640px"
      isAr={isAr}
      footer={footer}
    >
      {rescissionSuccess ? (
        <ZFFormDone
          title={isAr ? 'تم فسخ العقد بنجاح' : 'Contract Rescinded'}
          text={`${activeContract.buyer_name} • ${isAr ? 'عقد #' : 'Contract #'}${rescissionSuccess.contractNumber}`}
        >
          <div className={zfForm.section}>
            <ZFFacts
              items={[
                {
                  label: isAr ? 'الغرامة المحتجزة' : 'Penalty Retained',
                  value: `${Number(rescissionSuccess.penaltyRetained).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`
                },
                {
                  label: isAr ? 'المستحق رده للعميل' : 'Net Refund Liability',
                  value: `${Number(rescissionSuccess.netRefundLiability).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`,
                  tone: D(rescissionSuccess.netRefundLiability).gt(0) ? 'neg' : undefined
                }
              ]}
            />
          </div>
        </ZFFormDone>
      ) : (
        <form id="zf-rescission-form" className={zfForm.form} onSubmit={handleSubmit}>
          {/* 1. Contract Selection if multiple */}
          {contractList.length > 1 && (
            <ZFField label={isAr ? 'العقد المراد فسخه' : 'Contract to Rescind'} required>
              <select
                className={zfForm.control}
                value={selectedContractId}
                onChange={e => setSelectedContractId(e.target.value)}
              >
                {contractList.map(c => (
                  <option key={c.contract_id} value={c.contract_id}>
                    {`${c.contract_number} • ${c.buyer_name} • ${c.unit_id}`}
                  </option>
                ))}
              </select>
            </ZFField>
          )}

          {isCostMissing && (
            <ZFEffect tone="danger">
              {isAr
                ? 'تكلفة الوحدة غير مسجلة. سجّل التكاليف ووزّعها قبل فسخ عقد تم تسليمه.'
                : 'Unit cost is not recorded. Record and allocate costs before rescinding a delivered contract.'}
            </ZFEffect>
          )}

          {/* 2. Contract Facts */}
          {preview && (
            <div className={zfForm.section}>
              <h4 className={zfForm.sectionTitle}>{isAr ? 'بيانات العقد والمدفوعات' : 'Contract & Payments'}</h4>
              <ZFFacts
                items={[
                  { label: isAr ? 'العميل' : 'Client', value: activeContract.buyer_name },
                  { label: isAr ? 'الوحدة' : 'Unit', value: activeContract.unit_id },
                  { label: isAr ? 'القيمة الإجمالية' : 'Gross Value', value: `${Number(preview.grossContractValue).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}` },
                  { label: isAr ? 'المحصل بالخزينة' : 'Collected', value: `${Number(preview.totalCashCollected).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`, tone: 'pos' },
                  { label: isAr ? 'الغرامة المحتجزة' : 'Penalty Retained', value: `${Number(preview.penaltyRetained).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}` },
                  { label: isAr ? 'المستحق رده للعميل' : 'Refund Liability', value: `${Number(preview.netRefundLiability).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`, tone: D(preview.netRefundLiability).gt(0) ? 'neg' : undefined }
                ]}
              />
            </div>
          )}

          {/* 3. Inputs */}
          <div className={zfForm.section}>
            <h4 className={zfForm.sectionTitle}>{isAr ? 'شروط وتاريخ الفسخ' : 'Rescission Terms'}</h4>
            <div className={zfForm.row}>
              <ZFField label={isAr ? 'تاريخ الفسخ' : 'Rescission Date'} required>
                <input
                  type="date"
                  className={zfForm.control}
                  value={rescissionDate}
                  onChange={e => setRescissionDate(e.target.value)}
                  required
                />
              </ZFField>
              <ZFField label={isAr ? 'نسبة الغرامة %' : 'Penalty Rate %'} required>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  className={zfForm.control}
                  value={penaltyRatePercent}
                  onChange={e => setPenaltyRatePercent(Number(e.target.value))}
                  required
                />
              </ZFField>
            </div>

            <ZFField label={isAr ? 'مرحلة التسليم' : 'Delivery Stage'}>
              <ZFChoices<'Branch1_PreDelivery' | 'Branch2_PostDelivery'>
                value={selectedBranch}
                onChange={setSelectedBranch}
                options={[
                  {
                    id: 'Branch1_PreDelivery',
                    label: isAr ? 'فسخ قبل التسليم' : 'Pre-Delivery',
                    sub: isAr ? 'الوحدة لم تُسلَم' : 'Unit not yet delivered'
                  },
                  {
                    id: 'Branch2_PostDelivery',
                    label: isAr ? 'فسخ بعد التسليم' : 'Post-Delivery',
                    sub: isAr ? 'تم استلام الوحدة سابقاً' : 'Unit was previously delivered'
                  }
                ]}
              />
            </ZFField>
          </div>

          {/* 4. Effect */}
          {isTargetPeriodLocked ? (
            <ZFEffect tone="danger">
              {isAr
                ? 'الفترة المحاسبية لهذا التاريخ مقفلة. اختر تاريخاً آخر.'
                : 'The accounting period for this date is closed. Pick another date.'}
            </ZFEffect>
          ) : (
            <ZFEffect tone="warn">
              {isAr
                ? 'سيتم فسخ العقد وتثبيت الغرامة وإثبات التزام رد المستحق للعميل وإلغاء الأقساط غير المحصلة.'
                : 'Contract will be rescinded, penalty retained, refund liability recorded, and pending installments cancelled.'}
            </ZFEffect>
          )}

          {/* 5. Journal Peek */}
          {preview?.journalEntry?.lines && preview.journalEntry.lines.length > 0 && (
            <ZFJournalPeek
              isAr={isAr}
              lines={preview.journalEntry.lines.map(l => ({
                code: l.account_code,
                name: (isAr ? CANONICAL_COA[l.account_code]?.account_name_ar : CANONICAL_COA[l.account_code]?.account_name_en) || l.memo || '',
                debit: l.debit_amount,
                credit: l.credit_amount
              }))}
            />
          )}
        </form>
      )}
    </ZFModalShell>
  );
};
