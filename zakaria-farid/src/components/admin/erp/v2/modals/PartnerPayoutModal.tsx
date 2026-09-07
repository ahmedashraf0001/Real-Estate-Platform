'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Wallet, 
  Landmark, 
  ShieldCheck, 
  Calendar, 
  FileText,
  User,
  Building2,
  ArrowRight,
  Receipt,
  Scale
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { PartnerFinancialSummary } from '@/lib/erp/partnersEngine';
import { Property } from '@/lib/supabase/types';
import styles from '../ZFWorkstationShell.module.css';

interface PartnerPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: PartnerFinancialSummary[];
  properties?: Property[];
  initialPartnerName?: string;
  isAr?: boolean;
  isMutating?: boolean;
  onConfirmPayout: (details: {
    partnerName: string;
    amount: string;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000';
    propertyId?: string;
    propertyTitle?: string;
    payoutDate: string;
    receiptRef: string;
    memo: string;
  }) => Promise<void>;
}

export const PartnerPayoutModal: React.FC<PartnerPayoutModalProps> = ({
  isOpen,
  onClose,
  partners,
  properties = [],
  initialPartnerName,
  isAr = true,
  isMutating = false,
  onConfirmPayout
}) => {
  const [selectedPartnerName, setSelectedPartnerName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000'>('BANK_102000');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [payoutDate, setPayoutDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receiptRef, setReceiptRef] = useState<string>(`PAY-${Date.now().toString().slice(-6)}`);
  const [memo, setMemo] = useState<string>('');

  useEffect(() => {
    if (initialPartnerName) {
      setSelectedPartnerName(initialPartnerName);
    } else if (partners.length > 0 && !selectedPartnerName) {
      setSelectedPartnerName(partners[0].partnerName);
    }
  }, [initialPartnerName, partners, selectedPartnerName]);

  if (!isOpen) return null;

  const currentPartner = partners.find(p => p.partnerName === selectedPartnerName) || partners[0];
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const numAmount = parseFloat(amount) || 0;
  const isAmountValid = numAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerName || !isAmountValid || isMutating) return;

    await onConfirmPayout({
      partnerName: selectedPartnerName,
      amount: D(numAmount).toFixed(2),
      paymentMethod,
      propertyId: selectedPropertyId || undefined,
      propertyTitle: selectedProperty ? (selectedProperty.title_ar || selectedProperty.title_en) : undefined,
      payoutDate,
      receiptRef,
      memo: memo || `صرف دفعة أرباح للشريك: ${selectedPartnerName}`
    });

    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
        direction: isAr ? 'rtl' : 'ltr'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* HEADER */}
        <div 
          style={{
            padding: '1.2rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div 
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(21, 128, 61, 0.1)',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Receipt size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'صرف دفعة أرباح وتسديد مستحقات شريك' : 'Partner Profit Payout & Settlement'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
                {isAr ? 'إنشاء قيد يومية متوازن آلياً (مدين حـ/303000 - دائن حـ/101000 أو 102000)' : 'Audited double-entry journal posting for partner distribution'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '8px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.25rem 1.5rem', gap: '1.15rem' }}>
          
          {/* PARTNER SELECTOR */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              {isAr ? 'اختار الشريك أو الممول المستحق للدفعة:' : 'Select Partner / Investor:'}
            </label>
            <select
              value={selectedPartnerName}
              onChange={(e) => setSelectedPartnerName(e.target.value)}
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.55rem 0.75rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#0f172a'
              }}
            >
              {partners.map(p => (
                <option key={p.partnerName} value={p.partnerName}>
                  {p.partnerName} ({p.roleTitleAr}) — رصيد مستحق: {D(p.netCurrentBalance).toNumber().toLocaleString()} ج.م
                </option>
              ))}
            </select>
          </div>

          {/* CURRENT PARTNER FINANCIAL BRIEF CARD */}
          {currentPartner && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.85rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.6rem'
            }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                  {isAr ? 'رأس المال المودع:' : 'Contributed Capital:'}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  <MoneyCell amount={currentPartner.totalContributedCapital} isAr={isAr} />
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                  {isAr ? 'نصيبه من التحصيلات:' : 'Collections Share:'}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1d4ed8' }}>
                  <MoneyCell amount={currentPartner.totalCollectionsShare} isAr={isAr} />
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                  {isAr ? 'أرباح مسددة سابقاً:' : 'Already Paid Out:'}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#701a75' }}>
                  <MoneyCell amount={currentPartner.totalDistributionsPaid} isAr={isAr} />
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#15803d', display: 'block', fontWeight: 700 }}>
                  {isAr ? 'صافي الرصيد القائم:' : 'Net Due Balance:'}
                </span>
                <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#15803d' }}>
                  <MoneyCell amount={currentPartner.netCurrentBalance} isAr={isAr} />
                </span>
              </div>
            </div>
          )}

          {/* AMOUNT & PROJECT ALLOCATION */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {isAr ? 'مبلغ الدفعة المراد صرفها (ج.م) *' : 'Payout Amount (EGP) *'}
              </label>
              <input
                type="number"
                min="1"
                step="500"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1.5px solid #15803d',
                  borderRadius: '8px',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  color: '#15803d'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {isAr ? 'المشروع المرتبط بالدفعة (اختياري):' : 'Linked Project (Optional):'}
              </label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.82rem',
                  color: '#0f172a'
                }}
              >
                <option value="">{isAr ? '-- توزيع عام من أرباح الشركة --' : '-- General Company Profit Distribution --'}</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {isAr ? p.title_ar : p.title_en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PAYMENT METHOD SELECTION */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              {isAr ? 'طريقة وخزينة الصرف (حساب الخروج):' : 'Disbursement Source Account:'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setPaymentMethod('BANK_102000')}
                style={{
                  background: paymentMethod === 'BANK_102000' || paymentMethod === 'INSTAPAY_102000' ? 'rgba(29, 78, 216, 0.08)' : '#ffffff',
                  border: paymentMethod === 'BANK_102000' || paymentMethod === 'INSTAPAY_102000' ? '1.5px solid #1d4ed8' : '1px solid #cbd5e1',
                  borderRadius: '9px',
                  padding: '0.7rem',
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Landmark size={18} color={paymentMethod === 'BANK_102000' ? '#1d4ed8' : '#64748b'} />
                <div>
                  <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: paymentMethod === 'BANK_102000' ? '#1d4ed8' : '#0f172a' }}>
                    {isAr ? 'البنك / إنستاباي (102000)' : 'Bank / InstaPay (102000)'}
                  </span>
                  <span style={{ fontSize: '0.67rem', color: '#64748b' }}>
                    {isAr ? 'تحويل بنكي أو فوري لحساب الشريك' : 'Electronic transfer'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CASH_101000')}
                style={{
                  background: paymentMethod === 'CASH_101000' ? 'rgba(184, 144, 62, 0.08)' : '#ffffff',
                  border: paymentMethod === 'CASH_101000' ? '1.5px solid #946f23' : '1px solid #cbd5e1',
                  borderRadius: '9px',
                  padding: '0.7rem',
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Wallet size={18} color={paymentMethod === 'CASH_101000' ? '#946f23' : '#64748b'} />
                <div>
                  <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: paymentMethod === 'CASH_101000' ? '#946f23' : '#0f172a' }}>
                    {isAr ? 'خزينة النقدية الرئيسية (101000)' : 'Main Cash Vault (101000)'}
                  </span>
                  <span style={{ fontSize: '0.67rem', color: '#64748b' }}>
                    {isAr ? 'صرف كاش يدوي بإيصال استلام' : 'Cash vault disbursement'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* DATE & RECEIPT REF */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                {isAr ? 'تاريخ الصرف والقيد:' : 'Disbursement Date:'}
              </label>
              <input
                type="date"
                value={payoutDate}
                onChange={(e) => setPayoutDate(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.8rem',
                  color: '#0f172a'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                {isAr ? 'رقم الإشعار أو إيصال الصرف:' : 'Receipt / Reference Code:'}
              </label>
              <input
                type="text"
                value={receiptRef}
                onChange={(e) => setReceiptRef(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.8rem',
                  color: '#0f172a'
                }}
              />
            </div>
          </div>

          {/* NOTES / MEMO */}
          <div>
            <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
              {isAr ? 'البيان والملاحظات:' : 'Memo / Notes:'}
            </label>
            <input
              type="text"
              placeholder={isAr ? 'مثال: صرف دفعة أرباح مرحلية عن الربع الأول' : 'Optional memo description'}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.45rem 0.65rem',
                fontSize: '0.8rem',
                color: '#0f172a'
              }}
            />
          </div>

          {/* BALANCED JOURNAL ENTRY LIVE PREVIEW */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.03)',
            border: '1px dashed #cbd5e1',
            borderRadius: '10px',
            padding: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Scale size={14} color="#946f23" />
                <span>{isAr ? 'المعاينة اللحظية لقيد اليومية المتوازن (INV-4.1):' : 'Balanced Journal Entry Preview:'}</span>
              </span>
              <span style={{ fontSize: '0.67rem', color: '#15803d', fontWeight: 700 }}>
                {isAr ? '✓ القيد متوازن بالمليم (0.00 Delta)' : '✓ Zero Variance'}
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ textAlign: isAr ? 'right' : 'left', padding: '0.3rem 0.4rem' }}>{isAr ? 'الحساب' : 'Account'}</th>
                  <th style={{ textAlign: isAr ? 'left' : 'right', padding: '0.3rem 0.4rem' }}>{isAr ? 'مدين (له فلوس)' : 'Debit'}</th>
                  <th style={{ textAlign: isAr ? 'left' : 'right', padding: '0.3rem 0.4rem' }}>{isAr ? 'دائن (عليه فلوس)' : 'Credit'}</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.35rem 0.4rem', fontWeight: 700, color: '#0f172a' }}>
                    303000 — {isAr ? 'توزيعات أرباح ومسحوبات الشركاء' : 'Partner Distributions'}
                  </td>
                  <td style={{ padding: '0.35rem 0.4rem', textAlign: isAr ? 'left' : 'right', fontWeight: 800, color: '#15803d' }}>
                    {numAmount > 0 ? numAmount.toLocaleString() : '0.00'} ج.م
                  </td>
                  <td style={{ padding: '0.35rem 0.4rem', textAlign: isAr ? 'left' : 'right', color: '#94a3b8' }}>
                    0.00
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.35rem 0.4rem', fontWeight: 700, color: '#0f172a' }}>
                    {paymentMethod === 'CASH_101000' ? '101000 — خزينة النقدية الرئيسية' : '102000 — البنك التشغيلي (إنستاباي)'}
                  </td>
                  <td style={{ padding: '0.35rem 0.4rem', textAlign: isAr ? 'left' : 'right', color: '#94a3b8' }}>
                    0.00
                  </td>
                  <td style={{ padding: '0.35rem 0.4rem', textAlign: isAr ? 'left' : 'right', fontWeight: 800, color: '#0f172a' }}>
                    {numAmount > 0 ? numAmount.toLocaleString() : '0.00'} ج.م
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* FOOTER ACTIONS */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.55rem 1rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!isAmountValid || isMutating}
              style={{
                background: isAmountValid && !isMutating ? 'linear-gradient(135deg, #15803d 0%, #166534 100%)' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 1.25rem',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#ffffff',
                cursor: isAmountValid && !isMutating ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: isAmountValid ? '0 4px 12px rgba(21, 128, 61, 0.25)' : 'none'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{isMutating ? (isAr ? 'جارٍ الاعتماد والترحيل...' : 'Posting...') : (isAr ? 'اعتماد وصرف الدفعة وترحيل القيد' : 'Confirm Payout & Post JE')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
