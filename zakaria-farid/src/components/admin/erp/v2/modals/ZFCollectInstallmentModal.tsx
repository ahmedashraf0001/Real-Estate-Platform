'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Coins } from 'lucide-react';
import { ZFModalShell } from '../common/ZFModalShell';
import shellStyles from '../ZFWorkstationShell.module.css';
import css from './ZFCollectInstallmentModal.module.css';
import { formatNumberWithCommas } from '@/lib/erp/operationsStreamFilters';
import { D } from '@/lib/erp/math';
import type { ERPContract, ERPInstallmentSchedule, ERPPDCRecord } from '@/lib/erp/types';
import type { Property } from '@/lib/supabase/types';

export interface ZFCollectInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAr: boolean;
  isMutating: boolean;
  contracts: ERPContract[];
  schedules: ERPInstallmentSchedule[];
  properties: Property[];
  initialContractId?: string;
  initialScheduleId?: string;
  onConfirm: (
    item: ERPPDCRecord,
    receiptNo: string,
    date: string,
    amount: string,
    notes: string,
    method: 'CASH' | 'INSTAPAY'
  ) => Promise<void>;
}

const isScheduleOutstanding = (s: ERPInstallmentSchedule) => {
  return (
    ['Pending', 'Partially Paid', 'Defaulted'].includes(s.status) &&
    D(s.nominal_value || 0).minus(D(s.amount_paid || 0)).gt(0)
  );
};

const getLocalTodayDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDDMMYYYY = (iso: string) => {
  if (!iso) return '';
  const clean = iso.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return clean;
};

export const ZFCollectInstallmentModal: React.FC<ZFCollectInstallmentModalProps> = ({
  isOpen,
  onClose,
  isAr,
  isMutating,
  contracts,
  schedules,
  properties,
  initialContractId,
  initialScheduleId,
  onConfirm
}) => {
  const eligibleContracts = useMemo(() => {
    return (contracts || [])
      .filter(
        c =>
          c.status === 'Active' &&
          (schedules || []).some(s => s.contract_id === c.contract_id && isScheduleOutstanding(s))
      )
      .sort((a, b) => (a.contract_number || '').localeCompare(b.contract_number || ''));
  }, [contracts, schedules]);

  const getContractLabel = useCallback(
    (c: ERPContract) => {
      const property = (properties || []).find(p => p.id === c.property_id);
      const title = property
        ? isAr
          ? property.title_ar
          : property.title_en || property.title_ar
        : '';
      return `${c.contract_number} — ${c.buyer_name}` + (title ? ` — ${title}` : '');
    },
    [properties, isAr]
  );

  const getDuesForContract = useCallback(
    (cid: string) => {
      if (!cid) return [];
      return (schedules || [])
        .filter(s => s.contract_id === cid && isScheduleOutstanding(s))
        .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
    },
    [schedules]
  );

  const initialResolvedContractId = useMemo(() => {
    if (initialContractId && eligibleContracts.some(c => c.contract_id === initialContractId)) {
      return initialContractId;
    }
    return eligibleContracts.length === 1 ? eligibleContracts[0].contract_id : '';
  }, [initialContractId, eligibleContracts]);

  const initialResolvedDues = useMemo(() => {
    return initialResolvedContractId ? getDuesForContract(initialResolvedContractId) : [];
  }, [initialResolvedContractId, getDuesForContract]);

  const initialResolvedSchedule = useMemo(() => {
    if (initialScheduleId) {
      const matched = initialResolvedDues.find(s => s.schedule_id === initialScheduleId);
      if (matched) return matched;
    }
    return initialResolvedDues.length > 0 ? initialResolvedDues[0] : null;
  }, [initialScheduleId, initialResolvedDues]);

  const [contractId, setContractId] = useState<string>(initialResolvedContractId);
  const [scheduleId, setScheduleId] = useState<string>(initialResolvedSchedule?.schedule_id ?? '');
  const [amount, setAmount] = useState<string>(() => {
    if (initialResolvedSchedule) {
      const rem = D(initialResolvedSchedule.nominal_value || 0).minus(
        D(initialResolvedSchedule.amount_paid || 0)
      );
      return rem.toFixed(2);
    }
    return '';
  });
  const [method, setMethod] = useState<'CASH' | 'INSTAPAY'>('CASH');
  const [date, setDate] = useState<string>(getLocalTodayDate);
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const dues = useMemo(() => {
    return getDuesForContract(contractId);
  }, [contractId, getDuesForContract]);

  const filteredContracts = useMemo(() => {
    if (!search.trim()) return eligibleContracts;
    const q = search.trim().toLowerCase();
    return eligibleContracts.filter(c => getContractLabel(c).toLowerCase().includes(q));
  }, [eligibleContracts, search, getContractLabel]);

  // Reset state on modal open
  // Reset only when the popup opens; data refreshes while open must not wipe user input.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;

    /* eslint-disable react-hooks/set-state-in-effect */
    const targetContractId =
      initialContractId && eligibleContracts.some(c => c.contract_id === initialContractId)
        ? initialContractId
        : eligibleContracts.length === 1
        ? eligibleContracts[0].contract_id
        : '';

    const contractDues = targetContractId ? getDuesForContract(targetContractId) : [];
    const targetSchedule =
      (initialScheduleId && contractDues.find(s => s.schedule_id === initialScheduleId)) ||
      (contractDues.length > 0 ? contractDues[0] : null);

    const targetScheduleId = targetSchedule ? targetSchedule.schedule_id : '';
    const rem = targetSchedule
      ? D(targetSchedule.nominal_value || 0).minus(D(targetSchedule.amount_paid || 0))
      : D(0);
    const targetAmount = targetSchedule ? rem.toFixed(2) : '';

    setContractId(targetContractId);
    setScheduleId(targetScheduleId);
    setAmount(targetAmount);
    setMethod('CASH');
    setDate(getLocalTodayDate());
    setReceiptNo('');
    setNotes('');
    setSearch('');
    setError('');
    setIsSubmitting(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, initialContractId, initialScheduleId, eligibleContracts, getDuesForContract]);

  const handleContractChange = (newCid: string) => {
    setContractId(newCid);
    const contractDues = getDuesForContract(newCid);
    const firstDue = contractDues[0] || null;
    const newSid = firstDue ? firstDue.schedule_id : '';
    setScheduleId(newSid);
    const rem = firstDue
      ? D(firstDue.nominal_value || 0).minus(D(firstDue.amount_paid || 0))
      : D(0);
    setAmount(firstDue ? rem.toFixed(2) : '');
    setError('');
  };

  const handleScheduleChange = (newSid: string) => {
    setScheduleId(newSid);
    const chosen = dues.find(s => s.schedule_id === newSid);
    const rem = chosen ? D(chosen.nominal_value || 0).minus(D(chosen.amount_paid || 0)) : D(0);
    setAmount(chosen ? rem.toFixed(2) : '');
    setError('');
  };

  const handleSubmit = async () => {
    if (!contractId || !scheduleId) {
      setError(isAr ? 'اختر العقد والقسط' : 'Select a contract and installment');
      return;
    }

    const chosenContract = (contracts || []).find(c => c.contract_id === contractId);
    const chosenSchedule = (schedules || []).find(s => s.schedule_id === scheduleId);

    if (!chosenContract || !chosenSchedule) {
      setError(isAr ? 'اختر العقد والقسط' : 'Select a contract and installment');
      return;
    }

    const remaining = D(chosenSchedule.nominal_value || 0).minus(
      D(chosenSchedule.amount_paid || 0)
    );
    const parsedAmount = D(amount || 0);

    if (parsedAmount.lte(0) || parsedAmount.gt(remaining)) {
      setError(
        isAr
          ? 'المبلغ يجب أن يكون أكبر من صفر ولا يتجاوز المتبقي'
          : 'Amount must be > 0 and not exceed the remaining balance'
      );
      return;
    }

    if (!date || !date.trim()) {
      setError(isAr ? 'تاريخ الاستلام مطلوب' : 'Date received is required');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const cleanDate = date.trim();
      const receipt =
        receiptNo.trim() ||
        `RC-${cleanDate.replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const item: ERPPDCRecord = {
        cheque_id: `SCH-${chosenSchedule.schedule_id}`,
        contract_id: chosenContract.contract_id,
        schedule_id: chosenSchedule.schedule_id,
        cheque_number: '',
        bank_name: '',
        drawer_name: chosenContract.buyer_name,
        nominal_value: remaining.toFixed(2),
        due_date: chosenSchedule.due_date,
        status: 'In Safe'
      };

      await onConfirm(item, receipt, cleanDate, parsedAmount.toFixed(2), notes.trim(), method);
      onClose();
    } catch (err) {
      console.error('Failed to confirm collection:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayStr = useMemo(() => getLocalTodayDate(), []);

  const footer = (
    <>
      <button
        type="button"
        className={shellStyles.btnSecondary}
        onClick={onClose}
      >
        {isAr ? 'إلغاء' : 'Cancel'}
      </button>
      <button
        type="button"
        className={shellStyles.btnPrimary}
        onClick={handleSubmit}
        disabled={isMutating || isSubmitting || eligibleContracts.length === 0}
      >
        {isAr ? 'تسجيل التحصيل' : 'Record collection'}
      </button>
    </>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      isAr={isAr}
      title={isAr ? 'تحصيل قسط من عميل' : 'Collect customer installment'}
      subtitle={
        isAr
          ? 'اختر العقد ثم القسط. يُسجل المبلغ فور استلامه نقداً أو بإنستاباي.'
          : 'Pick the contract, then the installment. Money is recorded when received, by cash or InstaPay.'
      }
      icon={<Coins size={16} />}
      maxWidth="560px"
      footer={footer}
    >
      <form
        className={css.form}
        onSubmit={e => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {eligibleContracts.length === 0 ? (
          <div className={css.empty}>
            {isAr ? 'لا توجد عقود نشطة عليها أقساط مستحقة.' : 'No active contracts have installments due.'}
          </div>
        ) : (<>
        {/* 1. Field: Contract */}
        <div className={css.field}>
          <label className={css.label}>{isAr ? 'العقد' : 'Contract'}</label>
          {eligibleContracts.length === 0 ? (
            <div className={css.empty}>
              {isAr
                ? 'لا توجد عقود نشطة عليها أقساط مستحقة.'
                : 'No active contracts have installments due.'}
            </div>
          ) : (
            <>
              <input
                className={css.search}
                placeholder={isAr ? 'بحث برقم العقد أو اسم العميل' : 'Search contract # or customer'}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select
                className={css.select}
                value={contractId}
                onChange={e => handleContractChange(e.target.value)}
              >
                <option value="">{isAr ? '— اختر العقد —' : '— Select contract —'}</option>
                {filteredContracts.map(c => (
                  <option key={c.contract_id} value={c.contract_id}>
                    {getContractLabel(c)}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* 2. Field: Installment (only when contractId) */}
        {contractId && dues.length > 0 && (
          <div className={css.field}>
            <label className={css.label}>{isAr ? 'القسط' : 'Installment'}</label>
            <div role="radiogroup" className={css.dueList}>
              {dues.map(s => {
                const selected = s.schedule_id === scheduleId;
                const remaining = D(s.nominal_value || 0).minus(D(s.amount_paid || 0));
                const paid = D(s.amount_paid || 0);
                const cleanDueDate = s.due_date ? s.due_date.split('T')[0] : '';
                const overdue = cleanDueDate ? cleanDueDate < todayStr : false;

                return (
                  <label
                    key={s.schedule_id}
                    className={`${css.dueRow} ${selected ? css.dueRowActive : ''}`}
                  >
                    <input
                      type="radio"
                      name="due"
                      value={s.schedule_id}
                      checked={selected}
                      onChange={() => handleScheduleChange(s.schedule_id)}
                    />
                    <span className={css.dueMain}>
                      {s.tranche_number === 0
                        ? isAr
                          ? 'دفعة المقدم'
                          : 'Down payment'
                        : isAr
                        ? `القسط ${s.tranche_number}`
                        : `Installment ${s.tranche_number}`}
                    </span>
                    <span className={css.dueMeta}>
                      {formatDDMMYYYY(cleanDueDate)}
                      {overdue && (
                        <span className={`${shellStyles.statusPill} ${shellStyles.statusPillRed}`}>
                          {isAr ? 'متأخر' : 'Overdue'}
                        </span>
                      )}
                      {paid.gt(0) && (
                        <span>
                          {isAr
                            ? `مدفوع ${formatNumberWithCommas(paid)}`
                            : `paid ${formatNumberWithCommas(paid)}`}
                        </span>
                      )}
                    </span>
                    <span className={css.dueAmt}>
                      {formatNumberWithCommas(remaining)} {isAr ? 'ج.م' : 'EGP'}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Row: Amount received & Date received */}
        <div className={css.row}>
          <div className={css.field}>
            <label className={css.label}>{isAr ? 'المبلغ المحصل' : 'Amount received'}</label>
            <input
              inputMode="decimal"
              className={css.input}
              value={amount}
              onChange={e => {
                setAmount(e.target.value);
                setError('');
              }}
            />
          </div>
          <div className={css.field}>
            <label className={css.label}>{isAr ? 'تاريخ الاستلام' : 'Date received'}</label>
            <input
              type="date"
              className={css.input}
              value={date}
              onChange={e => {
                setDate(e.target.value);
                setError('');
              }}
            />
          </div>
        </div>

        {/* 4. Field: Method */}
        <div className={css.field}>
          <label className={css.label}>{isAr ? 'طريقة الاستلام' : 'Method'}</label>
          <div className={css.segGroup}>
            <button
              type="button"
              className={`${css.seg} ${method === 'CASH' ? css.segActive : ''}`}
              aria-pressed={method === 'CASH'}
              onClick={() => setMethod('CASH')}
            >
              {isAr ? 'نقدي — الخزينة (101000)' : 'Cash — Safe (101000)'}
            </button>
            <button
              type="button"
              className={`${css.seg} ${method === 'INSTAPAY' ? css.segActive : ''}`}
              aria-pressed={method === 'INSTAPAY'}
              onClick={() => setMethod('INSTAPAY')}
            >
              {isAr ? 'إنستاباي (102000)' : 'InstaPay (102000)'}
            </button>
          </div>
        </div>

        {/* 5. Row: Receipt # & Notes */}
        <div className={css.row}>
          <div className={css.field}>
            <label className={css.label}>
              {isAr ? 'رقم الإيصال (اختياري)' : 'Receipt # (optional)'}
            </label>
            <input
              className={css.input}
              value={receiptNo}
              onChange={e => setReceiptNo(e.target.value)}
            />
          </div>
          <div className={css.field}>
            <label className={css.label}>{isAr ? 'ملاحظات' : 'Notes'}</label>
            <input
              className={css.input}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* 6. Inline error */}
        {error && <p className={css.error}>{error}</p>}
              </>)}
      </form>
    </ZFModalShell>
  );
};

export default ZFCollectInstallmentModal;
