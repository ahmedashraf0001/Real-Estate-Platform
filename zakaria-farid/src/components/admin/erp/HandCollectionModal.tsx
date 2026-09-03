'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  X, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  Receipt, 
  Loader2,
  AlertCircle,
  Printer,
  ShieldCheck
} from 'lucide-react';
import { ERPContract, ERPPDCRecord } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';

interface HandCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ERPPDCRecord | null;
  linkedContract?: ERPContract;
  onConfirmCollection: (
    item: ERPPDCRecord, 
    receiptNo: string, 
    date: string, 
    amount: string, 
    notes: string
  ) => Promise<void>;
  isMutating?: boolean;
  isAr?: boolean;
}

export const HandCollectionModal: React.FC<HandCollectionModalProps> = ({
  isOpen,
  onClose,
  item,
  linkedContract,
  onConfirmCollection,
  isMutating = false,
  isAr = true
}) => {
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [collectionDate, setCollectionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [collectedAmount, setCollectedAmount] = useState<string>('');
  const [collectionNotes, setCollectionNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && item) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const cleanCode = (item.cheque_number || '').replace(/[^0-9]/g, '').slice(-4) || randomSuffix.toString();
      setReceiptNo(`RCP-${new Date().getFullYear()}-${cleanCode}`);
      setCollectionDate(new Date().toISOString().split('T')[0]);
      setCollectedAmount(D(item.nominal_value || '0').toFixed(2));
      setCollectionNotes(isAr ? 'تم استلام الدفعة نقدياً باليد بمقر الشركة' : 'Direct cash installment collected by hand');
      setError('');
    }
  }, [isOpen, item, isAr]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptNo.trim()) {
      setError(isAr ? 'يرجى إدخال رقم إيصال الاستلام النقدي' : 'Receipt voucher number is required');
      return;
    }
    const amt = parseFloat(collectedAmount);
    if (!amt || amt <= 0) {
      setError(isAr ? 'يرجى إدخال مبلغ صحيح للاستلام' : 'Please enter a valid collection amount');
      return;
    }

    try {
      await onConfirmCollection(item, receiptNo.trim(), collectionDate, collectedAmount, collectionNotes.trim());
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const nominalVal = D(item.nominal_value || '0');

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem',
      direction: isAr ? 'rtl' : 'ltr'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '580px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fafaf9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669'
            }}>
              <Wallet size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'إجراء تحصيل القسط / البند نقداً باليد' : 'Hand Installment Collection Process'}
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                {isAr 
                  ? 'إثبات استلام النقدية وتوريدها للخزينة الرئيسية [101000] وقيد اليومية.'
                  : 'Record cash received by hand into safe [101000] and balanced ledger posting.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#64748b',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body & Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
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

          {/* Target Item Details Voucher Preview */}
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fefdfa 100%)',
            border: '1.5px solid rgba(184, 144, 62, 0.3)',
            borderRadius: '14px',
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            boxShadow: '0 2px 8px rgba(184, 144, 62, 0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShieldCheck size={14} color="#946f23" />
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#946f23' }}>
                  {isAr ? 'زكريا فريد للتطوير العقاري • إيصال تحصيل نقدية' : 'ZF REAL ESTATE • CASH VOUCHER'}
                </span>
              </div>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.72rem', color: '#64748b' }}>
                #{item.cheque_id.slice(0, 10)}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.75rem',
              fontSize: '0.76rem'
            }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>{isAr ? 'العميل الملتزم بالسداد:' : 'Client:'}</span>
                <strong style={{ color: '#0f172a', fontSize: '0.86rem' }}>{item.drawer_name}</strong>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>{isAr ? 'العقد والوحدة:' : 'Contract & Unit:'}</span>
                <span style={{ color: '#946f23', fontWeight: 700 }}>
                  {linkedContract ? `#${linkedContract.contract_number} (${linkedContract.unit_id})` : `#${item.contract_id.slice(0, 8)}`}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>{isAr ? 'تاريخ الاستحقاق الدفتري:' : 'Due Date:'}</span>
                <span style={{ color: '#334155', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{item.due_date}</span>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>{isAr ? 'قيمة القسط المطلوبة:' : 'Due Amount:'}</span>
                <span style={{ color: '#15803d', fontWeight: 800, fontSize: '0.95rem' }}>{nominalVal.formatEGP(isAr)}</span>
              </div>
            </div>
          </div>

          {/* Form Inputs Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Actual Collection Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: '#334155', marginBottom: '0.35rem', fontWeight: 700 }}>
                <Calendar size={13} style={{ display: 'inline', marginLeft: isAr ? '0.35rem' : 0, marginRight: isAr ? 0 : '0.35rem' }} />
                {isAr ? 'تاريخ الاستلام الفعلي باليد *' : 'Actual Cash Receipt Date *'}
              </label>
              <input 
                type="date"
                required
                value={collectionDate}
                onChange={e => setCollectionDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#0f172a',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Receipt Voucher Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: '#334155', marginBottom: '0.35rem', fontWeight: 700 }}>
                <Receipt size={13} style={{ display: 'inline', marginLeft: isAr ? '0.35rem' : 0, marginRight: isAr ? 0 : '0.35rem' }} />
                {isAr ? 'رقم إيصال الاستلام النقدي *' : 'Receipt Voucher # *'}
              </label>
              <input 
                type="text"
                required
                value={receiptNo}
                onChange={e => setReceiptNo(e.target.value)}
                placeholder="RCP-2026-XXXX"
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#0f172a',
                  fontSize: '0.82rem',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 700,
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Amount Paid Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', color: '#334155', marginBottom: '0.35rem', fontWeight: 700 }}>
              {isAr ? 'المبلغ المستلم نقداً (ج.م) *' : 'Amount Received in Cash (EGP) *'}
            </label>
            <input 
              type="number"
              step="0.01"
              required
              value={collectedAmount}
              onChange={e => setCollectedAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: '#ffffff',
                border: '1.5px solid #059669',
                borderRadius: '8px',
                color: '#059669',
                fontSize: '1.15rem',
                fontWeight: 900,
                outline: 'none'
              }}
            />
          </div>

          {/* Notes Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', color: '#334155', marginBottom: '0.35rem', fontWeight: 700 }}>
              <FileText size={13} style={{ display: 'inline', marginLeft: isAr ? '0.35rem' : 0, marginRight: isAr ? 0 : '0.35rem' }} />
              {isAr ? 'ملاحظات التحصيل / جهة الاستلام' : 'Collection Notes'}
            </label>
            <input 
              type="text"
              value={collectionNotes}
              onChange={e => setCollectionNotes(e.target.value)}
              placeholder={isAr ? 'سداد نقدي باليد بالخزينة' : 'Cash in safe'}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#0f172a',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Automated Accounting Posting Strip */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '10px',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.73rem',
            color: '#065f46'
          }}>
            <CheckCircle2 size={15} color="#059669" />
            <span>
              {isAr 
                ? 'التوجيه المحاسبي: مدين حـ/ الخزينة الرئيسية (101000) • دائن حـ/ أوراق القبض (103200).'
                : 'GL Impact: Dr Safe (101000) • Cr Notes Receivable (103200).'}
            </span>
          </div>

          {/* Modal Footer Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '1.25rem',
            marginTop: '0.25rem'
          }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '0.55rem 0.95rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer'
              }}
            >
              <Printer size={14} />
              <span>{isAr ? 'طباعة سند القبض' : 'Print Voucher'}</span>
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: isMutating ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
                }}
              >
                {isMutating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>{isAr ? 'تأكيد التحصيل والتوريد للخزينة' : 'Confirm Cash Collection'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
