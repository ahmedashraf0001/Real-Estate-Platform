'use client';

import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Printer, 
  Wallet, 
  Landmark, 
  ShieldCheck, 
  Calendar, 
  FileText,
  User,
  Building,
  ArrowRight
} from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule, ERPPDCRecord } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import styles from '../ZFWorkstationShell.module.css';

interface CashCollectionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract?: ERPContract | null;
  schedule?: ERPInstallmentSchedule | null;
  cheque?: ERPPDCRecord | null;
  isAr?: boolean;
  isMutating?: boolean;
  onConfirmCollection: (details: {
    receiptDate: string;
    destinationTreasury: 'SAFE_101000' | 'BANK_102000';
    notes: string;
  }) => Promise<void>;
}

export const CashCollectionReceiptModal: React.FC<CashCollectionReceiptModalProps> = ({
  isOpen,
  onClose,
  contract,
  schedule,
  cheque,
  isAr = true,
  isMutating = false,
  onConfirmCollection
}) => {
  const [receiptDate, setReceiptDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [destinationTreasury, setDestinationTreasury] = useState<'SAFE_101000' | 'BANK_102000'>('SAFE_101000');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  // Derive amount, buyer, and unit
  const amount = schedule ? schedule.nominal_value : (cheque ? cheque.nominal_value : '0');
  const trancheNumber = schedule ? schedule.tranche_number : (cheque ? cheque.cheque_number : '1');
  const buyerName = contract?.buyer_name || cheque?.drawer_name || (isAr ? 'عميل التعاقد' : 'Client');
  const unitId = contract?.unit_id || (isAr ? 'وحدة عقارية' : 'Unit');
  const contractNumber = contract?.contract_number || '—';

  // Calculate remaining balance after this collection
  const grossContract = D(contract?.gross_contract_value || '0');
  const currentCollected = D(contract?.total_cash_collected || '0');
  const afterPaymentCollected = currentCollected.plus(amount);
  const remainingDue = grossContract.minus(afterPaymentCollected).isNegative() 
    ? D(0) 
    : grossContract.minus(afterPaymentCollected);

  const voucherCode = `REC-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirmCollection({
      receiptDate,
      destinationTreasury,
      notes
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.modalContent} 
        style={{ 
          maxWidth: '680px', 
          width: '95vw', 
          maxHeight: '94vh',
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
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Wallet size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'سند قبض نقدية رسمي وتحصيل دفعة' : 'Official Cash Receipt & Collection Voucher'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {isAr ? 'إثبات تحصيل فوري مع الترحيل الآلي لدفتر الأستاذ العام' : 'Instant collection with automated GL ledger posting'}
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

        {/* Modal Scrollable Body */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* 1. Official Receipt Voucher Preview Box */}
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fefdfa 100%)',
            border: '1.5px solid rgba(184, 144, 62, 0.35)',
            borderRadius: '16px',
            padding: '1.25rem',
            boxShadow: '0 4px 16px rgba(184, 144, 62, 0.08)',
            position: 'relative'
          }}>
            {/* Voucher Watermark & Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <ShieldCheck size={16} color="#946f23" />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#946f23', letterSpacing: '0.02em' }}>
                  {isAr ? 'مؤسسة زكريا فريد للتطوير العقاري • قسم الخزينة والتحصيل' : 'ZF REAL ESTATE • TREASURY & COLLECTIONS'}
                </span>
              </div>
              <span style={{
                fontVariantNumeric: 'tabular-nums',
                fontSize: '0.74rem',
                fontWeight: 800,
                color: '#946f23',
                background: 'rgba(184, 144, 62, 0.1)',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px'
              }}>
                {voucherCode}
              </span>
            </div>

            {/* Collected Amount Headline */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 700, display: 'block' }}>
                  {isAr ? 'المبلغ المطلوب تحصيله الآن:' : 'Amount to Collect Now:'}
                </span>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#059669', letterSpacing: '-0.02em', marginTop: '0.2rem' }}>
                  <MoneyCell amount={amount} isAr={isAr} highlight />
                </div>
              </div>
              <span style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#059669',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 800,
                border: '1px solid rgba(16, 185, 129, 0.25)'
              }}>
                {isAr ? `القسط / الدفعة #${trancheNumber}` : `Tranche #${trancheNumber}`}
              </span>
            </div>

            {/* Contract & Buyer Metadata Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              fontSize: '0.76rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.85rem'
            }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>
                  {isAr ? 'المشتري / المستأجر:' : 'Client / Buyer:'}
                </span>
                <strong style={{ color: '#0f172a' }}>{buyerName}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>
                  {isAr ? 'الوحدة والعقد:' : 'Unit & Contract:'}
                </span>
                <strong style={{ color: '#0f172a' }}>{unitId} (#{contractNumber})</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>
                  {isAr ? 'الرصيد المتبقي بعد السداد:' : 'Remaining Balance After Payment:'}
                </span>
                <strong style={{ color: '#d97706' }}><MoneyCell amount={remainingDue.toString()} isAr={isAr} /></strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>
                  {isAr ? 'تاريخ استحقاق القسط:' : 'Due Date:'}
                </span>
                <strong style={{ color: '#0f172a' }}>{schedule?.due_date || cheque?.due_date || receiptDate}</strong>
              </div>
            </div>
          </div>

          {/* 2. Form Inputs: Destination Treasury & Receipt Date */}
          <form onSubmit={handleSubmit} id="cash-collection-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Receipt Date */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                  {isAr ? 'تاريخ التحصيل الفعلي:' : 'Actual Receipt Date:'}
                </label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={e => setReceiptDate(e.target.value)}
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
                  required
                />
              </div>

              {/* Destination Treasury */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                  {isAr ? 'جهة الإيداع المحاسبية:' : 'Deposit Treasury Account:'}
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.4rem',
                  background: '#f1f5f9',
                  padding: '0.2rem',
                  borderRadius: '8px'
                }}>
                  <button
                    type="button"
                    onClick={() => setDestinationTreasury('SAFE_101000')}
                    style={{
                      padding: '0.45rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: destinationTreasury === 'SAFE_101000' ? '#ffffff' : 'transparent',
                      color: destinationTreasury === 'SAFE_101000' ? '#0f172a' : '#64748b',
                      boxShadow: destinationTreasury === 'SAFE_101000' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Wallet size={12} color={destinationTreasury === 'SAFE_101000' ? '#059669' : '#64748b'} />
                    <span>{isAr ? 'خزينة رئيسية 101000' : 'Safe 101000'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDestinationTreasury('BANK_102000')}
                    style={{
                      padding: '0.45rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: destinationTreasury === 'BANK_102000' ? '#ffffff' : 'transparent',
                      color: destinationTreasury === 'BANK_102000' ? '#0f172a' : '#64748b',
                      boxShadow: destinationTreasury === 'BANK_102000' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Landmark size={12} color={destinationTreasury === 'BANK_102000' ? '#946f23' : '#64748b'} />
                    <span>{isAr ? 'بنك تجاري 102000' : 'Bank 102000'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Notes Input */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                {isAr ? 'ملاحظات التحصيل وسند القبض (اختياري):' : 'Collection Notes / Memo:'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={isAr ? 'مثال: سداد نقدي باليد بمقر الشركة / تحويل بنكي على حساب CIB' : 'e.g. Cash in safe / direct wire transfer'}
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

            {/* 3. Accounting Posting Simulation Banner */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.74rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={15} color="#059669" />
                <span style={{ color: '#475569' }}>
                  {isAr ? 'القيد الدفتري الآلي: ' : 'Automated Posting: '}
                  <strong style={{ color: '#0f172a' }}>
                    {destinationTreasury === 'SAFE_101000' ? 'مدين: حـ/ الخزينة الرئيسية (101000)' : 'مدين: حـ/ البنك التجاري (102000)'}
                  </strong>
                  {' — '}
                  <strong style={{ color: '#0f172a' }}>
                    {isAr ? 'دائن: حـ/ الإيرادات التعاقدية المؤجلة (206100)' : 'Credit: Deferred Revenue (206100)'}
                  </strong>
                </span>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fafaf9'
        }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
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
                padding: '0.55rem 1.1rem',
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
              form="cash-collection-form"
              disabled={isMutating}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
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
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
              }}
            >
              <CheckCircle2 size={14} />
              <span>{isAr ? 'اعتماد التحصيل والترحيل للأستاذ' : 'Commit & Post to GL'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
