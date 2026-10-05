'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useMemo, useEffect } from 'react';
import { Wallet, Hammer, Compass, ScrollText, FileText, Zap } from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { toast } from 'sonner';
import { localizeBuyerName } from '@/components/erp/JournalEntryPreview';
import { ZFModalShell } from './v2/common/ZFModalShell';
import { 
  ZFField, 
  ZFMoneyInput, 
  ZFChoices, 
  ZFFacts, 
  ZFEffect, 
  ZFJournalPeek, 
  ZFFormFooter, 
  ZFFormDone, 
  zfForm 
} from './v2/common/ZFForm';
import shellStyles from './v2/ZFWorkstationShell.module.css';

export type SupplementType = 
  | 'extra_finishing' 
  | 'architectural_alterations' 
  | 'transfer_admin_fees' 
  | 'contract_annex' 
  | 'emergency_due';

export interface SupplementData {
  contractId: string;
  supplementType: SupplementType;
  supplementReasonAr: string;
  amount: string;
  dueDate: string;
  receiptNumber: string;
  notes: string;
}

export interface NewChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: ERPContract[];
  schedules: ERPInstallmentSchedule[];
  properties?: Property[];
  initialContractId?: string | null;
  onSaveSupplement?: (data: SupplementData) => Promise<void>;
  // Backwards compatibility with previous signature
  onSaveCheque?: (itemData: {
    contractId: string;
    scheduleId?: string;
    chequeNumber: string;
    bankName: string;
    drawerName: string;
    nominalValue: string;
    dueDate: string;
  }) => Promise<void>;
  onInspectContract?: (contract: ERPContract) => void;
  isMutating?: boolean;
  isAr?: boolean;
}

const SUPPLEMENT_TYPES = [
  {
    id: 'extra_finishing' as SupplementType,
    labelAr: 'تشطيبات وديكورات إضافية',
    labelEn: 'Extra Finishing & Decor',
    icon: <Hammer size={16} />
  },
  {
    id: 'architectural_alterations' as SupplementType,
    labelAr: 'تعديلات معمارية وإنشائية',
    labelEn: 'Architectural Alterations',
    icon: <Compass size={16} />
  },
  {
    id: 'transfer_admin_fees' as SupplementType,
    labelAr: 'رسوم ومصاريف إدارية',
    labelEn: 'Admin Fees',
    icon: <ScrollText size={16} />
  },
  {
    id: 'contract_annex' as SupplementType,
    labelAr: 'ملحق تعاقدي مكمل',
    labelEn: 'Contract Annex',
    icon: <FileText size={16} />
  },
  {
    id: 'emergency_due' as SupplementType,
    labelAr: 'بند استحقاق طارئ',
    labelEn: 'Emergency Due',
    icon: <Zap size={16} />
  }
];

export const NewChequeModal: React.FC<NewChequeModalProps> = ({
  isOpen,
  onClose,
  contracts = [],
  schedules = [],
  initialContractId = null,
  onSaveSupplement,
  onSaveCheque,
  isMutating = false,
  isAr = true
}) => {
  const isContractClosed = (c: ERPContract) => {
    if (c.status === 'Completed' || c.status === 'Rescinded') return true;
    if (c.handover_status === 'Delivered') return true;
    const pendingSchedules = schedules.filter(
      s => s.contract_id === c.contract_id && (s.status === 'Pending' || s.status === 'Defaulted' || s.status === 'Partially Paid')
    );
    const collected = D(c.total_cash_collected || '0');
    const gross = D(c.gross_contract_value || '0');
    if (pendingSchedules.length === 0 && collected.gte(gross) && gross.gt(0)) {
      return true;
    }
    return false;
  };

  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [supplementType, setSupplementType] = useState<SupplementType>('extra_finishing');
  const [amount, setAmount] = useState<string>('150000');
  const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [supplementSuccess, setSupplementSuccess] = useState<{
    contractNumber: string;
    buyer: string;
    unit: string;
    amount: string;
    type: string;
    dueDate: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSupplementSuccess(null);
      if (initialContractId && contracts.some(c => c.contract_id === initialContractId)) {
        setSelectedContractId(initialContractId);
      } else if (contracts.length > 0 && (!selectedContractId || !contracts.some(c => c.contract_id === selectedContractId))) {
        const firstActive = contracts.find(c => !isContractClosed(c)) || contracts[0];
        setSelectedContractId(firstActive.contract_id);
      }
    } else {
      setSupplementSuccess(null);
    }
  }, [isOpen, initialContractId, contracts, schedules]);

  const activeContract = useMemo(() => {
    return contracts.find(c => c.contract_id === selectedContractId) || contracts[0] || null;
  }, [contracts, selectedContractId]);

  const activeContractSchedules = useMemo(() => {
    if (!activeContract) return [];
    return schedules
      .filter(s => s.contract_id === activeContract.contract_id && s.status !== 'Void')
      .sort((a, b) => a.tranche_number - b.tranche_number);
  }, [schedules, activeContract]);

  const nextTrancheNumber = useMemo(() => {
    if (activeContractSchedules.length === 0) return 1;
    const maxNum = Math.max(...activeContractSchedules.map(s => s.tranche_number));
    return maxNum + 1;
  }, [activeContractSchedules]);

  useEffect(() => {
    if (activeContract) {
      const codeDigits = (activeContract.contract_number || '001').replace(/\D/g, '') || '101';
      const typeCode = supplementType === 'extra_finishing' ? 'FIN' 
        : supplementType === 'architectural_alterations' ? 'ARC'
        : supplementType === 'transfer_admin_fees' ? 'ADM'
        : supplementType === 'contract_annex' ? 'ANNEX'
        : 'DUE';
      setReceiptNumber(`SUP-${typeCode}-${codeDigits}-${String(nextTrancheNumber).padStart(2, '0')}`);
    }
  }, [activeContract, supplementType, nextTrancheNumber]);

  const activeContractRemaining = useMemo(() => {
    if (!activeContract) return D(0);
    const gross = D(activeContract.gross_contract_value || '0');
    const collected = D(activeContract.total_cash_collected || '0');
    const rem = gross.minus(collected);
    return rem.gt(0) ? rem : D(0);
  }, [activeContract]);

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContract) {
      toast.error(isAr ? 'يرجى اختيار العقد المرتبط' : 'Please select a contract');
      return;
    }
    if (isContractClosed(activeContract)) {
      toast.error(isAr ? 'عفوًا، لا يمكن إضافة التزامات مالية لعقد مقفل بالكامل' : 'Cannot add supplement to closed contract');
      return;
    }
    if (numAmount <= 0) {
      toast.error(isAr ? 'يرجى إدخال مبلغ صحيح للدفعة الإضافية' : 'Invalid supplement amount');
      return;
    }
    if (!dueDate) {
      toast.error(isAr ? 'يرجى تحديد تاريخ استحقاق الدفعة' : 'Please select a due date');
      return;
    }

    const typeConfig = SUPPLEMENT_TYPES.find(t => t.id === supplementType);
    const reasonTitle = isAr ? (typeConfig?.labelAr || 'ملحق تعاقدي') : (typeConfig?.labelEn || 'Contract Supplement');
    const fullNotes = customNotes.trim()
      ? `[${reasonTitle}]: ${customNotes.trim()}`
      : `[${reasonTitle}]: ملحق تعاقدي معتمد للوحدة ${activeContract.unit_id}`;

    const successPayload = {
      contractNumber: activeContract.contract_number,
      buyer: isAr ? localizeBuyerName(activeContract.buyer_name) : activeContract.buyer_name,
      unit: activeContract.unit_id,
      amount: D(numAmount).toFixed(2),
      type: reasonTitle,
      dueDate
    };

    if (onSaveSupplement) {
      await onSaveSupplement({
        contractId: activeContract.contract_id,
        supplementType,
        supplementReasonAr: reasonTitle,
        amount: D(numAmount).toFixed(2),
        dueDate,
        receiptNumber: receiptNumber.trim() || `SUP-${Date.now().toString().slice(-4)}`,
        notes: fullNotes
      });
    } else if (onSaveCheque) {
      await onSaveCheque({
        contractId: activeContract.contract_id,
        chequeNumber: receiptNumber.trim() || `SUP-${Date.now().toString().slice(-4)}`,
        bankName: isAr ? 'الخزينة الرئيسية (أمانات نقداً باليد - 101000)' : 'Main Safe (Cash by Hand - 101000)',
        drawerName: activeContract.buyer_name,
        nominalValue: D(numAmount).toFixed(2),
        dueDate
      });
    }

    setSupplementSuccess(successPayload);
  };

  const handleModalClose = () => {
    setSupplementSuccess(null);
    onClose();
  };

  const footer = supplementSuccess ? (
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
        form="zf-cheque-form"
        className={shellStyles.btnPrimary}
        disabled={isMutating || numAmount <= 0 || !dueDate}
      >
        {isMutating 
          ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') 
          : (isAr ? 'حفظ الملحق' : 'Save Supplement')}
      </button>
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={handleModalClose}
      title={isAr ? 'ملحق تعاقدي جديد' : 'New Contract Supplement'}
      subtitle={isAr 
        ? 'إضافة قسط أو التزام مالي جديد لأصل العقد وجدول السداد.' 
        : 'Add an extra tranche or obligation to contract value and schedule.'}
      icon={<Wallet size={18} />}
      maxWidth="640px"
      isAr={isAr}
      footer={footer}
    >
      {supplementSuccess ? (
        <ZFFormDone
          title={isAr ? 'تم تسجيل الملحق بنجاح' : 'Supplement Recorded'}
          text={`${Number(supplementSuccess.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'} — عقد #${supplementSuccess.contractNumber}`}
        >
          <div className={zfForm.section}>
            <ZFFacts
              items={[
                { label: isAr ? 'العميل' : 'Client', value: supplementSuccess.buyer },
                { label: isAr ? 'الوحدة' : 'Unit', value: supplementSuccess.unit },
                { label: isAr ? 'النوع' : 'Type', value: supplementSuccess.type },
                { label: isAr ? 'تاريخ الاستحقاق' : 'Due Date', value: supplementSuccess.dueDate }
              ]}
            />
          </div>
        </ZFFormDone>
      ) : (
        <form id="zf-cheque-form" className={zfForm.form} onSubmit={handleSubmit}>
          {/* 1. Contract selection */}
          <ZFField label={isAr ? 'العقد المرتبط' : 'Linked Contract'} required>
            <select
              className={zfForm.control}
              value={selectedContractId}
              onChange={e => setSelectedContractId(e.target.value)}
            >
              {contracts.filter(c => c.status !== 'Rescinded').map(c => {
                const closed = isContractClosed(c);
                return (
                  <option key={c.contract_id} value={c.contract_id}>
                    {`${c.contract_number} • ${c.buyer_name} • ${c.unit_id}${closed ? (isAr ? ' (مغلق)' : ' (Closed)') : ''}`}
                  </option>
                );
              })}
            </select>
          </ZFField>

          {/* 2. Contract facts */}
          {activeContract && (
            <div className={zfForm.section}>
              <h4 className={zfForm.sectionTitle}>{isAr ? 'بيانات العقد' : 'Contract Summary'}</h4>
              <ZFFacts
                items={[
                  { label: isAr ? 'العميل' : 'Client', value: activeContract.buyer_name },
                  { label: isAr ? 'الوحدة' : 'Unit', value: activeContract.unit_id },
                  { label: isAr ? 'القيمة الحالية' : 'Current Gross Value', value: `${Number(activeContract.gross_contract_value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}` },
                  { label: isAr ? 'المتبقي تحصيله' : 'Remaining to Collect', value: `${Number(activeContractRemaining.toNumber()).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}` }
                ]}
              />
            </div>
          )}

          {/* 3. Supplement Type choices */}
          <div className={zfForm.section}>
            <h4 className={zfForm.sectionTitle}>{isAr ? 'نوع الملحق التعاقدي' : 'Supplement Type'}</h4>
            <ZFChoices<SupplementType>
              value={supplementType}
              onChange={setSupplementType}
              options={SUPPLEMENT_TYPES.map(t => ({
                id: t.id,
                label: isAr ? t.labelAr : t.labelEn,
                icon: t.icon
              }))}
            />
          </div>

          {/* 4. Row: Amount & Due Date */}
          <div className={zfForm.section}>
            <h4 className={zfForm.sectionTitle}>{isAr ? 'القيمة والموعد' : 'Amount & Schedule'}</h4>
            <div className={zfForm.row}>
              <ZFField label={isAr ? 'مبلغ الدفعة الإضافية' : 'Supplement Amount'} required>
                <ZFMoneyInput
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  unit={isAr ? 'ج.م' : 'EGP'}
                  autoFocus
                  required
                />
              </ZFField>
              <ZFField label={isAr ? 'تاريخ الاستحقاق' : 'Due Date'} required>
                <input
                  type="date"
                  className={zfForm.control}
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  required
                />
              </ZFField>
            </div>

            {/* Row: Receipt number & Notes */}
            <div className={zfForm.row}>
              <ZFField label={isAr ? 'رقم السند / الإيصال' : 'Note / Receipt #'}>
                <input
                  type="text"
                  className={`${zfForm.control} ${zfForm.mono}`}
                  value={receiptNumber}
                  onChange={e => setReceiptNumber(e.target.value)}
                />
              </ZFField>
              <ZFField label={isAr ? 'ملاحظات' : 'Notes'}>
                <input
                  type="text"
                  className={zfForm.control}
                  value={customNotes}
                  onChange={e => setCustomNotes(e.target.value)}
                  placeholder={isAr ? 'اختياري' : 'Optional'}
                />
              </ZFField>
            </div>
          </div>

          {/* 5. Effect */}
          <ZFEffect>
            {isAr 
              ? 'سيُضاف قسط جديد إلى جدول سداد العقد ويزداد إجمالي قيمة العقد بمقدار المبلغ المحدد.' 
              : 'A new tranche will be appended to the schedule and increase total contract gross value.'}
          </ZFEffect>

          {/* 6. Journal Peek */}
          {numAmount > 0 && activeContract && (
            <ZFJournalPeek
              isAr={isAr}
              lines={[
                {
                  code: '103000',
                  name: isAr ? `أقساط العملاء التعاقدية - ${activeContract.buyer_name}` : `Contract Receivables - ${activeContract.buyer_name}`,
                  debit: numAmount
                },
                {
                  code: '202000',
                  name: isAr ? 'إيراد تعاقدي مؤجل للوحدات' : 'Deferred Unit Contract Revenue',
                  credit: numAmount
                }
              ]}
            />
          )}
        </form>
      )}
    </ZFModalShell>
  );
};
