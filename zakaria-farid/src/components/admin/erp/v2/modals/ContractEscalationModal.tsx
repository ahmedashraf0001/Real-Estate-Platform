'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { ERPContract } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { ZFModalShell } from '../common/ZFModalShell';
import { 
  ZFField, 
  ZFMoneyInput, 
  ZFFacts, 
  ZFEffect, 
  ZFJournalPeek, 
  ZFFormFooter, 
  ZFFormDone, 
  zfForm 
} from '../common/ZFForm';
import shellStyles from '../ZFWorkstationShell.module.css';

export interface ContractEscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ERPContract | null;
  contracts?: ERPContract[];
  onConfirmEscalation: (deltaAmount: string, reason: string, targetContract?: ERPContract) => Promise<void>;
  isMutating?: boolean;
  isAr?: boolean;
}

export const ContractEscalationModal: React.FC<ContractEscalationModalProps> = ({
  isOpen,
  onClose,
  contract,
  contracts = [],
  onConfirmEscalation,
  isMutating = false,
  isAr = true
}) => {
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [delta, setDelta] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [escalationSuccess, setEscalationSuccess] = useState<{
    oldGross: string;
    newGross: string;
    delta: string;
    reason: string;
    contractNumber: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (contract && contract.contract_id) {
        setSelectedContractId(contract.contract_id);
      } else if (contracts.length > 0 && (!selectedContractId || !contracts.some(c => c.contract_id === selectedContractId))) {
        setSelectedContractId(contracts[0].contract_id);
      }
      setDelta('');
      setReason('');
      setError('');
      setEscalationSuccess(null);
    }
  }, [isOpen, contract, contracts]);

  const contractList = useMemo(() => {
    if (contracts.length > 0) return contracts;
    return contract ? [contract] : [];
  }, [contracts, contract]);

  const activeContract = useMemo(() => {
    if (contractList.length > 0) {
      return contractList.find(c => c.contract_id === selectedContractId) || contract || contractList[0];
    }
    return contract;
  }, [contractList, selectedContractId, contract]);

  if (!isOpen || !activeContract) return null;

  const currentGross = D(activeContract.gross_contract_value || '0');
  const deltaD = D(delta || '0');
  const newGross = currentGross.plus(deltaD);
  const totalPaid = D(activeContract.total_cash_collected || '0');
  const remainingBal = currentGross.minus(totalPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!delta || deltaD.lte(0)) {
      setError(isAr ? 'يرجى إدخال قيمة زيادة أكبر من الصفر' : 'Please enter an escalation amount greater than zero');
      return;
    }
    if (!reason.trim()) {
      setError(isAr ? 'يرجى كتابة سبب الزيادة أو التعديل' : 'Please provide the escalation rationale');
      return;
    }

    try {
      await onConfirmEscalation(delta.trim(), reason.trim(), activeContract);
      setEscalationSuccess({
        oldGross: currentGross.toFixed(2),
        newGross: newGross.toFixed(2),
        delta: delta.trim(),
        reason: reason.trim(),
        contractNumber: activeContract.contract_number
      });
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleModalClose = () => {
    setEscalationSuccess(null);
    onClose();
  };

  const footer = escalationSuccess ? (
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
        form="zf-escalation-form"
        className={shellStyles.btnPrimary}
        disabled={isMutating || deltaD.lte(0) || !reason.trim()}
      >
        {isMutating 
          ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') 
          : (isAr ? 'اعتماد الزيادة' : 'Confirm Escalation')}
      </button>
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={handleModalClose}
      title={isAr ? 'تعديل قيمة العقد' : 'Contract Value Escalation'}
      subtitle={isAr 
        ? 'إثبات الزيادة السعرية وتعديل القيمة الإجمالية للعقد.' 
        : 'Record price adjustments and update total contract value.'}
      icon={<TrendingUp size={18} />}
      maxWidth="640px"
      isAr={isAr}
      footer={footer}
    >
      {escalationSuccess ? (
        <ZFFormDone
          title={isAr ? 'تم اعتماد زيادة القيمة بنجاح' : 'Escalation Applied'}
          text={`${activeContract.buyer_name} • ${isAr ? 'عقد #' : 'Contract #'}${escalationSuccess.contractNumber}`}
        >
          <div className={zfForm.section}>
            <ZFFacts
              items={[
                {
                  label: isAr ? 'القيمة الأصلية للعقد' : 'Original Contract Value',
                  value: `${Number(escalationSuccess.oldGross).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`
                },
                {
                  label: isAr ? 'الزيادة المعتمدة (+)' : 'Escalation Added (+)',
                  value: `+${Number(escalationSuccess.delta).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`,
                  tone: 'pos'
                },
                {
                  label: isAr ? 'القيمة الإجمالية الجديدة' : 'New Gross Value',
                  value: `${Number(escalationSuccess.newGross).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`,
                  tone: 'pos'
                }
              ]}
            />
          </div>
        </ZFFormDone>
      ) : (
        <form id="zf-escalation-form" className={zfForm.form} onSubmit={handleSubmit}>
          {/* 1. Contract Selection if multiple */}
          {contractList.length > 1 && (
            <ZFField label={isAr ? 'العقد المراد تعديله' : 'Contract to Adjust'} required>
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

          {/* 2. Contract Facts */}
          <div className={zfForm.section}>
            <h4 className={zfForm.sectionTitle}>{isAr ? 'بيانات العقد الحالية' : 'Current Contract Status'}</h4>
            <ZFFacts
              items={[
                { label: isAr ? 'العميل' : 'Client', value: activeContract.buyer_name },
                { label: isAr ? 'الوحدة' : 'Unit', value: activeContract.unit_id },
                { label: isAr ? 'القيمة الحالية' : 'Current Gross Value', value: `${Number(currentGross.toNumber()).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}` },
                { label: isAr ? 'المحصل بالخزينة' : 'Collected', value: `${Number(totalPaid.toNumber()).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`, tone: 'pos' },
                { label: isAr ? 'المتبقي أقساط' : 'Outstanding Dues', value: `${Number(remainingBal.toNumber()).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}` }
              ]}
            />
          </div>

          {/* 3. Inputs */}
          <div className={zfForm.section}>
            <h4 className={zfForm.sectionTitle}>{isAr ? 'بيانات الزيادة المطلوبة' : 'Escalation Details'}</h4>
            <div className={zfForm.row}>
              <ZFField label={isAr ? 'قيمة الزيادة المعتمدة' : 'Escalation Amount'} required>
                <ZFMoneyInput
                  value={delta}
                  onChange={e => setDelta(e.target.value)}
                  unit={isAr ? 'ج.م' : 'EGP'}
                  autoFocus
                  required
                />
              </ZFField>
              <ZFField label={isAr ? 'سبب الزيادة أو التعديل' : 'Reason / Rationale'} required>
                <input
                  type="text"
                  className={zfForm.control}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={isAr ? 'مثال: تعديل مواصفات التشطيب' : 'e.g. Finishing specs upgrade'}
                  required
                />
              </ZFField>
            </div>
          </div>

          {/* 4. Error banner if any */}
          {error && (
            <ZFEffect tone="danger">
              {error}
            </ZFEffect>
          )}

          {/* 5. Effect */}
          <ZFEffect>
            {isAr 
              ? 'ستُزاد قيمة العقد الإجمالية وتُوزع الزيادة على الأقساط غير المسددة دون المساس بما سُدد.' 
              : 'Contract value will be escalated and the difference distributed over pending installments without altering paid dues.'}
          </ZFEffect>

          {/* 6. Journal Peek */}
          {deltaD.gt(0) && (
            <ZFJournalPeek
              isAr={isAr}
              lines={[
                {
                  code: '103000',
                  name: isAr ? `أقساط العملاء التعاقدية - ${activeContract.buyer_name}` : `Contract Receivables - ${activeContract.buyer_name}`,
                  debit: deltaD.toNumber()
                },
                {
                  code: '202000',
                  name: isAr ? 'إيراد تعاقدي مؤجل للوحدات' : 'Deferred Unit Contract Revenue',
                  credit: deltaD.toNumber()
                }
              ]}
            />
          )}
        </form>
      )}
    </ZFModalShell>
  );
};
