'use client';

import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  X, 
  Loader2, 
  AlertCircle, 
  ShieldAlert, 
  ArrowRight, 
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule, ERPAccountingPeriod } from '@/lib/erp/types';
import { RescissionEngine } from '@/lib/erp/rescission';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { LegalVerificationTag } from '@/components/erp/LegalVerificationTag';
import { BranchDecisionCard } from '@/components/erp/BranchDecisionCard';
import { JournalEntryPreview } from '@/components/erp/JournalEntryPreview';
import styles from '../ZFWorkstationShell.module.css';

interface RescissionSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ERPContract | null;
  schedules: ERPInstallmentSchedule[];
  activePeriod: ERPAccountingPeriod;
  onConfirmRescission: (details: {
    selectedBranch: 'Branch1_PreDelivery' | 'Branch2_PostDelivery';
    rescissionDate: string;
  }) => Promise<void>;
  isMutating?: boolean;
  isAr?: boolean;
}

export const RescissionSettlementModal: React.FC<RescissionSettlementModalProps> = ({
  isOpen,
  onClose,
  contract,
  schedules,
  activePeriod,
  onConfirmRescission,
  isMutating = false,
  isAr = true
}) => {
  const [step, setStep] = useState<0 | 1>(0);
  const [selectedBranch, setSelectedBranch] = useState<'Branch1_PreDelivery' | 'Branch2_PostDelivery'>('Branch1_PreDelivery');
  const [rescissionDate, setRescissionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setSelectedBranch('Branch1_PreDelivery');
      setRescissionDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!isOpen || !contract) return null;

  // Contract schedules for this contract
  const contractSchedules = schedules.filter(s => s.contract_id === contract.contract_id);

  // Compute rescission metrics
  const computed = RescissionEngine.processRescission(
    contract,
    contractSchedules,
    activePeriod,
    rescissionDate,
    D(contract.gross_contract_value).times('0.45').toFixed(),
    '501000',
    '151000',
    'CFO_FARID'
  );

  const preview = {
    grossContractValue: computed.rescissionRecord.gross_contract_value,
    totalCashCollected: computed.rescissionRecord.total_cash_collected,
    penaltyRetained: computed.rescissionRecord.penalty_retained,
    netRefundLiability: computed.rescissionRecord.net_refund_liability,
    journalEntry: computed.journalEntry
  };

  const handleSubmit = async () => {
    await onConfirmRescission({
      selectedBranch,
      rescissionDate
    });
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.modalContent}
        style={{
          maxWidth: '780px',
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fafaf9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RotateCcw size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'معالج فسخ العقد وتطبيق الحد الأدنى للاسترداد (Forfeiture Floor)' : 'Contract Rescission Wizard'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {contract.contract_number} — {contract.unit_id} ({contract.buyer_name})
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* STEP 0: Branch Decision & Date */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <BranchDecisionCard 
                contract={contract}
                selectedBranch={selectedBranch}
                onSelectBranch={setSelectedBranch}
                isAr={isAr}
              />

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                  {isAr ? 'تاريخ طلب الفسخ المعتمد:' : 'Effective Rescission Date:'}
                </label>
                <input 
                  type="date"
                  value={rescissionDate}
                  onChange={e => setRescissionDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '1rem'
              }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#64748b',
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1.35rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <span>{isAr ? 'متابعة للخطوة ١: احتساب الغرامة والرد' : 'Proceed to Step 1: Computations'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Financial Split & Journal Entry Preview */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* 3-Box Financial Split HUD */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.15rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem'
              }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>
                    {isAr ? 'قيمة العقد الإجمالية (V):' : 'Gross Contract Value (V):'}
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '1rem' }}>
                    <MoneyCell amount={preview.grossContractValue} isAr={isAr} />
                  </strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>
                    {isAr ? 'المحصل نقداً حتى الآن (C):' : 'Total Cash Collected (C):'}
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '1rem' }}>
                    <MoneyCell amount={preview.totalCashCollected} isAr={isAr} />
                  </strong>
                </div>

                <div style={{
                  background: 'rgba(184, 144, 62, 0.08)',
                  border: '1px solid rgba(184, 144, 62, 0.25)',
                  borderRadius: '10px',
                  padding: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ color: '#946f23', fontSize: '0.7rem', fontWeight: 800 }}>
                      {isAr ? 'غرامة الفسخ المحتجزة للشركة:' : 'Retained Penalty:'}
                    </span>
                    <LegalVerificationTag label={isAr ? 'غرامة ١٠٪' : '10% Penalty'} isAr={isAr} />
                  </div>
                  <strong style={{ color: '#946f23', fontSize: '1.1rem', fontWeight: 900 }}>
                    <MoneyCell amount={preview.penaltyRetained} isAr={isAr} highlight />
                  </strong>
                </div>

                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '10px',
                  padding: '0.75rem'
                }}>
                  <span style={{ color: '#047857', fontSize: '0.7rem', fontWeight: 800, display: 'block', marginBottom: '0.2rem' }}>
                    {isAr ? 'صافي رد العميل المستحق (206200):' : 'Net Refund Liability (206200):'}
                  </span>
                  <strong style={{ color: '#059669', fontSize: '1.1rem', fontWeight: 900 }}>
                    <MoneyCell amount={preview.netRefundLiability} isAr={isAr} />
                  </strong>
                </div>
              </div>

              {/* Journal Entry Preview */}
              <JournalEntryPreview entry={preview.journalEntry} isDraft={true} isAr={isAr} />

              {/* Step 1 Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '1rem'
              }}>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? '← رجوع لتحديد المسار' : '← Back to Step 0'}
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isMutating}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1.35rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: isMutating ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  {isMutating ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  <span>{isAr ? 'تأكيد الفسخ وترحيل القيد بالدفاتر' : 'Confirm & Post Rescission Entry'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
