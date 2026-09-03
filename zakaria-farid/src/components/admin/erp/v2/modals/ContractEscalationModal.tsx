'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  X, 
  Loader2, 
  FileText, 
  Building, 
  AlertCircle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { ERPContract } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import styles from '../ZFWorkstationShell.module.css';

interface ContractEscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ERPContract | null;
  onConfirmEscalation: (deltaAmount: string, reason: string) => Promise<void>;
  isMutating?: boolean;
  isAr?: boolean;
}

export const ContractEscalationModal: React.FC<ContractEscalationModalProps> = ({
  isOpen,
  onClose,
  contract,
  onConfirmEscalation,
  isMutating = false,
  isAr = true
}) => {
  const [delta, setDelta] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setDelta('');
      setReason('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !contract) return null;

  const currentGross = D(contract.gross_contract_value || '0');
  const deltaNum = parseFloat(delta) || 0;
  const newGross = currentGross.plus(deltaNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delta || deltaNum <= 0) {
      setError(isAr ? 'يرجى إدخال قيمة زيادة صالحة أكبر من الصفر' : 'Please enter a valid escalation amount');
      return;
    }
    if (!reason.trim()) {
      setError(isAr ? 'يرجى كتابة المبرر الهندسي أو السعري للتعديل' : 'Please provide the escalation rationale');
      return;
    }

    try {
      await onConfirmEscalation(delta.trim(), reason.trim());
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.modalContent}
        style={{
          maxWidth: '560px',
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
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
              background: 'rgba(184, 144, 62, 0.12)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'تصعيد قيمة العقد (تعديل Delta V - إصدار ثانٍ)' : 'Escalate Contract Value (Append-Only v2)'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {contract.contract_number} — {contract.unit_id}
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              color: '#dc2626',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Current Contract Dossier Strip */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            fontSize: '0.76rem'
          }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>
                {isAr ? 'القيمة التعاقدية الحالية (V):' : 'Current Contract Value (V):'}
              </span>
              <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>
                <MoneyCell amount={contract.gross_contract_value} isAr={isAr} />
              </strong>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>
                {isAr ? 'المحصل نقداً بالخزينة:' : 'Cash Collected:'}
              </span>
              <strong style={{ color: '#059669', fontSize: '0.95rem' }}>
                <MoneyCell amount={contract.total_cash_collected || '0'} isAr={isAr} />
              </strong>
            </div>
          </div>

          {/* Escalation Delta Input */}
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
              {isAr ? 'قيمة زيادة العقد (Delta V بالجنيه المصري) *' : 'Escalation Amount (Delta V in EGP) *'}
            </label>
            <input 
              type="number"
              step="1000"
              required
              value={delta}
              onChange={e => setDelta(e.target.value)}
              placeholder={isAr ? 'مثال: 500000' : 'e.g. 500000'}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1.5px solid #946f23',
                background: '#ffffff',
                color: '#946f23',
                fontSize: '1.1rem',
                fontWeight: 900,
                outline: 'none'
              }}
            />
          </div>

          {/* Rationale Input */}
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
              {isAr ? 'مبرر التعديل الهندسي / السعري المعتمد *' : 'Engineering / Material Rationale *'}
            </label>
            <input 
              type="text"
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={isAr ? 'مثال: تعديل مواصفات التشطيب وإضافة تشطيب ألترا سوبر لوكس' : 'e.g. Finishing specs upgrade'}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Projected Impact Preview Card */}
          {deltaNum > 0 && (
            <div style={{
              background: 'rgba(184, 144, 62, 0.05)',
              border: '1px solid rgba(184, 144, 62, 0.25)',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              fontSize: '0.76rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>{isAr ? 'القيمة الجديدة بعد اعتماد الملحق:' : 'New Gross Contract Value:'}</span>
                <strong style={{ color: '#946f23', fontSize: '1rem', fontWeight: 900 }}>
                  <MoneyCell amount={newGross.toString()} isAr={isAr} highlight />
                </strong>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {isAr ? 'سيتم ترحيل قيد تسوية للمؤجل وإصدار جدول أقساط جديد ملحق' : 'An adjusting entry will be posted and a new installment schedule generated'}
              </span>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '1.25rem',
            marginTop: '0.25rem'
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
              type="submit"
              disabled={isMutating}
              style={{
                background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
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
                boxShadow: '0 2px 8px rgba(148, 111, 35, 0.25)'
              }}
            >
              {isMutating ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
              <span>{isAr ? 'اعتماد التعديل والإصدار الثاني' : 'Commit & Save v2'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
