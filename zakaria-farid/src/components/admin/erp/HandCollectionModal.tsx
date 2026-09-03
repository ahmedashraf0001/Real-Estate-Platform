'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  X, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  DollarSign, 
  Receipt, 
  Loader2,
  AlertCircle
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

  const nominalVal = D(item.nominal_value || '0');

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem',
      direction: isAr ? 'rtl' : 'ltr'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #0d121f 0%, #060911 100%)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 35px rgba(16, 185, 129, 0.15)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(16, 185, 129, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.1) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399'
            }}>
              <Wallet size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                {isAr ? 'إجراء تحصيل القسط / البند نقداً باليد' : 'Hand Installment Collection Process'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
                {isAr 
                  ? 'إثبات استلام النقدية باليد وتوريدها للخزينة الرئيسية [101000] وقيد اليومية.'
                  : 'Record cash received by hand into safe [101000] and balanced ledger posting.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#94a3b8',
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
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              color: '#fca5a5',
              fontSize: '0.76rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Target Item Details Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.75rem',
            fontSize: '0.78rem'
          }}>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block' }}>{isAr ? 'العميل الملتزم بالسداد:' : 'Client:'}</span>
              <strong style={{ color: '#f8fafc', fontSize: '0.85rem' }}>{item.drawer_name}</strong>
            </div>

            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block' }}>{isAr ? 'العقد والوحدة:' : 'Contract & Unit:'}</span>
              <span style={{ color: 'var(--zf-gold, #d4af37)', fontWeight: 700 }}>
                {linkedContract ? `#${linkedContract.contract_number} (${linkedContract.unit_id})` : `#${item.contract_id.slice(0, 8)}`}
              </span>
            </div>

            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block' }}>{isAr ? 'تاريخ الاستحقاق الدفتري:' : 'Due Date:'}</span>
              <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{item.due_date}</span>
            </div>

            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block' }}>{isAr ? 'قيمة القسط المطلوبة:' : 'Due Amount:'}</span>
              <span style={{ color: '#38bdf8', fontWeight: 800 }}>{nominalVal.formatEGP(isAr)}</span>
            </div>
          </div>

          {/* Form Inputs Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            {/* Actual Collection Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 700 }}>
                <Calendar size={12} style={{ display: 'inline', marginLeft: isAr ? '0.35rem' : 0, marginRight: isAr ? 0 : '0.35rem' }} />
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
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.82rem'
                }}
              />
            </div>

            {/* Receipt Voucher Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 700 }}>
                <Receipt size={12} style={{ display: 'inline', marginLeft: isAr ? '0.35rem' : 0, marginRight: isAr ? 0 : '0.35rem' }} />
                {isAr ? 'رقم إيصال الاستلام النقدي *' : 'Receipt Voucher # *'}
              </label>
              <input 
                type="text"
                required
                value={receiptNo}
                onChange={e => setReceiptNo(e.target.value)}
                placeholder="RCP-2026-0042"
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: 'var(--zf-gold, #d4af37)',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>

          {/* Amount Paid */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: '#34d399', marginBottom: '0.35rem', fontWeight: 700 }}>
              <DollarSign size={12} style={{ display: 'inline', marginLeft: isAr ? '0.35rem' : 0, marginRight: isAr ? 0 : '0.35rem' }} />
              {isAr ? 'المبلغ المستلم نقدياً بالخزينة (ج.م) *' : 'Cash Amount Received in Safe (EGP) *'}
            </label>
            <input 
              type="number"
              step="100"
              required
              value={collectedAmount}
              onChange={e => setCollectedAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '8px',
                color: '#34d399',
                fontSize: '1.1rem',
                fontWeight: 900
              }}
            />
          </div>

          {/* Routing Target (Fixed to Main Safe - Hand Collection) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
              {isAr ? 'حساب التوريد والخزينة المستلمة:' : 'Receiving Treasury Safe:'}
            </label>
            <div style={{
              padding: '0.55rem 0.75rem',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#cbd5e1',
              fontSize: '0.78rem'
            }}>
              <Wallet size={15} color="#34d399" />
              <span>
                {isAr ? '[١٠١٠٠٠] الخزينة الرئيسية (استلام نقدي باليد - بدون أي ربط بنكي)' : '[101000] Main Cash Safe (Direct Cash by Hand)'}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
              {isAr ? 'ملاحظات وبيان الاستلام باليد:' : 'Receipt Notes:'}
            </label>
            <input 
              type="text"
              value={collectionNotes}
              onChange={e => setCollectionNotes(e.target.value)}
              placeholder={isAr ? 'مثال: تم الاستلام نقدياً باليد بمقر الشركة' : 'e.g. Received cash at office'}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.8rem'
              }}
            />
          </div>

          {/* Modal Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isMutating}
              style={{
                padding: '0.55rem 1.65rem',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                opacity: isMutating ? 0.6 : 1
              }}
            >
              {isMutating ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              <span>{isAr ? 'تأكيد التحصيل باليد والتوريد للخزينة' : 'Confirm Cash Collection to Safe'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
