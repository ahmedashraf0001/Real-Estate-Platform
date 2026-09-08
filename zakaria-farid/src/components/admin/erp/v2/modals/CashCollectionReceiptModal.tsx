'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Check,
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
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { ZFPrintDocumentLayout } from '../common/ZFPrintDocumentLayout';
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
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);
  const [confirmedVoucher, setConfirmedVoucher] = useState<{
    voucherCode: string;
    amount: string;
    date: string;
    treasury: string;
    buyer: string;
    unit: string;
    notes?: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setConfirmedVoucher(null);
    }
  }, [isOpen]);

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
    setConfirmedVoucher({
      voucherCode,
      amount,
      date: receiptDate,
      treasury: destinationTreasury,
      buyer: buyerName,
      unit: unitId ? `${unitId} (#${contractNumber})` : `#${contractNumber}`,
      notes
    });
  };

  const voucherBody = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', direction: isAr ? 'rtl' : 'ltr' }}>
      {/* 1. Hero Amount Box with Tafqeet */}
      <div style={{
        border: '2px solid #0f172a',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', display: 'block' }}>
            {isAr ? 'المبلغ المستلم والمثبت دفترياً:' : 'Received & Posted Amount:'}
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums', marginTop: '0.2rem' }}>
            {D(amount).formatEGP(isAr)}
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b8903e', marginTop: '0.35rem' }}>
            {tafqeetEGP(amount)}
          </div>
        </div>
        <div style={{ textAlign: isAr ? 'left' : 'right' }}>
          <span style={{
            display: 'inline-block',
            background: '#0f172a',
            color: '#ffffff',
            padding: '0.4rem 0.85rem',
            borderRadius: '6px',
            fontSize: '0.82rem',
            fontWeight: 800
          }}>
            {isAr ? `القسط / الدفعة #${trancheNumber}` : `Tranche #${trancheNumber}`}
          </span>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.4rem' }}>
            {destinationTreasury === 'SAFE_101000' 
              ? (isAr ? 'نقداً بالخزينة الرئيسية (101000)' : 'Cash Safe 101000') 
              : (isAr ? 'تحويل بنكي / إنستاباي (102000)' : 'Bank/InstaPay 102000')}
          </div>
        </div>
      </div>

      {/* 2. Client & Contract Metadata Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, width: '25%', color: '#334155' }}>
              {isAr ? 'اسم العميل / المستلم منه:' : 'Client / Payer:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 900, width: '35%', color: '#0f172a' }}>
              {buyerName}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, width: '20%', color: '#334155' }}>
              {isAr ? 'رقم العقد والوحدة:' : 'Contract & Unit:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, width: '20%', color: '#0f172a' }}>
              {unitId} (#{contractNumber})
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#334155' }}>
              {isAr ? 'جهة الإيداع والتوريد:' : 'Deposit Treasury:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
              {destinationTreasury === 'SAFE_101000' 
                ? (isAr ? 'خـزينة الشركة النقدية الرئيسية (كود 101000)' : 'Corporate Cash Safe (101000)')
                : (isAr ? 'حـساب البنك التجاري والإنستاباي (كود 102000)' : 'Commercial Bank & InstaPay (102000)')}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#334155' }}>
              {isAr ? 'تاريخ الاستحقاق:' : 'Due Date:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
              {schedule?.due_date || cheque?.due_date || receiptDate}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#334155' }}>
              {isAr ? 'إجمالي قيمة التعاقد:' : 'Contract Gross:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>
              {grossContract.formatEGP(isAr)}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#334155' }}>
              {isAr ? 'المتبقي بعد هذا السداد:' : 'Remaining Balance:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#b45309' }}>
              {remainingDue.formatEGP(isAr)}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#334155' }}>
              {isAr ? 'البيان وملاحظات السداد:' : 'Memo & Description:'}
            </td>
            <td colSpan={3} style={{ padding: '0.75rem 1rem', color: '#475569' }}>
              {notes || (isAr ? `سداد القسط رقم ${trancheNumber} المستحق عن الوحدة ${unitId} بموجب العقد رقم ${contractNumber}` : `Payment of tranche #${trancheNumber} for unit ${unitId}`)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 3. Accounting Debit/Credit Summary */}
      <div style={{
        background: '#f1f5f9',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        fontSize: '0.76rem',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>
          <strong>{isAr ? 'طرف القيد المدين: ' : 'Dr: '}</strong>
          {destinationTreasury === 'SAFE_101000' 
            ? (isAr ? 'حـ/ الخزينة الرئيسية (101000)' : 'Cash Safe (101000)')
            : (isAr ? 'حـ/ البنك والتحويلات (102000)' : 'Bank Account (102000)')}
        </span>
        <span>
          <strong>{isAr ? 'طرف القيد الدائن: ' : 'Cr: '}</strong>
          {isAr ? 'حـ/ الإيرادات التعاقدية المؤجلة (206100) — التزام حتى التسليم' : 'Deferred Revenue (206100)'}
        </span>
      </div>
    </div>
  );

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
                {confirmedVoucher 
                  ? (isAr ? 'سند قبض نقدية رسمي معتمد' : 'Confirmed Cash Receipt Voucher')
                  : (isAr ? 'سند قبض نقدية رسمي وتحصيل دفعة' : 'Official Cash Receipt & Collection Voucher')}
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {confirmedVoucher
                  ? (isAr ? 'تم ترحيل القيد دفترياً بنجاح ويمكن طباعة أو معاينة السند' : 'GL entry posted successfully. Ready for print or preview.')
                  : (isAr ? 'إثبات تحصيل فوري مع الترحيل الآلي لدفتر الأستاذ العام' : 'Instant collection with automated GL ledger posting')}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setConfirmedVoucher(null);
              onClose();
            }}
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

        {confirmedVoucher ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* Scrollable Receipt Body */}
            <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
              
              {/* Emerald Success Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.09) 0%, rgba(4, 120, 87, 0.04) 100%)',
                border: '1.5px solid #059669',
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                boxShadow: '0 4px 16px rgba(5, 150, 105, 0.08)'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#059669',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                }}>
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#065f46' }}>
                    {isAr ? 'تم تأكيد التحصيل وترحيل القيد الدفتري بنجاح' : 'Collection Successfully Posted to GL'}
                  </h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>
                    {isAr 
                      ? 'تم تسجيل السند رسمياً في سجلات الخزينة وترحيل القيد المحاسبي المتوازن إلى دفتر الأستاذ العام' 
                      : 'Receipt recorded in treasury ledger and double-entry transaction posted to GL'}
                  </p>
                </div>
              </div>

              {/* Official Receipt Card */}
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #fffdf8 100%)',
                border: '1.5px solid rgba(184, 144, 62, 0.35)',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 8px 24px rgba(184, 144, 62, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}>
                {/* Header Strip */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={18} color="#946f23" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#946f23', letterSpacing: '0.02em' }}>
                      {isAr ? 'سند قبض رسمي معتمد • مؤسسة زكريا فريد' : 'OFFICIAL RECEIPT VOUCHER • ZF REAL ESTATE'}
                    </span>
                  </div>
                  <span style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    color: '#946f23',
                    background: 'rgba(184, 144, 62, 0.12)',
                    border: '1px solid rgba(184, 144, 62, 0.25)',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '6px'
                  }}>
                    #{confirmedVoucher.voucherCode}
                  </span>
                </div>

                {/* Amount Box */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1.5px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '12px',
                  padding: '1.15rem 1.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 700, display: 'block' }}>
                      {isAr ? 'المبلغ المحصل والمثبت دفترياً:' : 'Collected Amount:'}
                    </span>
                    <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums', marginTop: '0.2rem' }}>
                      {D(confirmedVoucher.amount).formatEGP(isAr)}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#b8903e', marginTop: '0.35rem' }}>
                      {tafqeetEGP(confirmedVoucher.amount)}
                    </div>
                  </div>
                  <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#0f172a',
                      color: '#ffffff',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 800
                    }}>
                      <Check size={14} color="#10b981" />
                      <span>{isAr ? 'سند معتمد' : 'Verified'}</span>
                    </span>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                      {confirmedVoucher.date}
                    </div>
                  </div>
                </div>

                {/* Voucher Attributes Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.85rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1rem'
                }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                      {isAr ? 'اسم العميل / المستلم منه:' : 'Client / Payer:'}
                    </span>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800, marginTop: '0.15rem', display: 'block' }}>
                      {confirmedVoucher.buyer}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                      {isAr ? 'رقم الوحدة والعقد:' : 'Unit & Contract:'}
                    </span>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800, marginTop: '0.15rem', display: 'block' }}>
                      {confirmedVoucher.unit}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                      {isAr ? 'الخزينة المودع بها:' : 'Destination Treasury:'}
                    </span>
                    <strong style={{ fontSize: '0.84rem', color: '#059669', fontWeight: 800, marginTop: '0.15rem', display: 'block' }}>
                      {confirmedVoucher.treasury === 'SAFE_101000' 
                        ? (isAr ? 'حـ/ الخزينة الرئيسية 101000 (نقداً باليد)' : 'Main Safe 101000 (Cash by Hand)')
                        : (isAr ? 'حـ/ البنك وإنستاباي 102000' : 'Bank / InstaPay 102000')}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                      {isAr ? 'أثر القيد في الأستاذ العام:' : 'GL Impact:'}
                    </span>
                    <strong style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 700, marginTop: '0.15rem', display: 'block' }}>
                      {isAr 
                        ? (confirmedVoucher.treasury === 'SAFE_101000' ? 'مدين: 101000 • دائن: 206100' : 'مدين: 102000 • دائن: 206100')
                        : (confirmedVoucher.treasury === 'SAFE_101000' ? 'Dr: 101000 • Cr: 206100' : 'Dr: 102000 • Cr: 206100')}
                    </strong>
                  </div>
                </div>

                {confirmedVoucher.notes && (
                  <div style={{ fontSize: '0.74rem', color: '#64748b', background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                    <span style={{ fontWeight: 700 }}>{isAr ? 'ملاحظات: ' : 'Notes: '}</span>
                    <span>{confirmedVoucher.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Confirmed View Footer */}
            <div style={{
              padding: '1rem 1.75rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#fafaf9'
            }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handlePrint}
                  style={{
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
                  }}
                >
                  <Printer size={15} />
                  <span>{isAr ? 'طباعة سند القبض الفوري' : 'Print Official Receipt'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintPreview(true)}
                  style={{
                    background: 'rgba(184, 144, 62, 0.08)',
                    border: '1px solid rgba(184, 144, 62, 0.25)',
                    color: '#946f23',
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer'
                  }}
                >
                  <FileText size={15} />
                  <span>{isAr ? 'معاينة السند الكامل' : 'Preview Voucher'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setConfirmedVoucher(null);
                  onClose();
                }}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)'
                }}
              >
                {isAr ? 'تم / إغلاق النافذة' : 'Done / Close'}
              </button>
            </div>
          </div>
        ) : (
          <>
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
                    <span>{isAr ? 'نقداً بالخزينة 101000' : 'Cash in Safe 101000'}</span>
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
                    <Landmark size={12} color={destinationTreasury === 'BANK_102000' ? '#1e40af' : '#64748b'} />
                    <span>{isAr ? 'تحويل إنستاباي / بنك 102000' : 'InstaPay / Bank 102000'}</span>
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
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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

            <button
              type="button"
              onClick={() => setShowPrintPreview(true)}
              style={{
                background: 'rgba(184, 144, 62, 0.08)',
                border: '1px solid rgba(184, 144, 62, 0.25)',
                color: '#946f23',
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
              <FileText size={14} />
              <span>{isAr ? 'معاينة السند المعتمد' : 'Preview Document'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setConfirmedVoucher(null);
                  onClose();
                }}
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
        </>
      )}
      </div>

      {/* Screen Preview Modal */}
      {showPrintPreview && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            overflowY: 'auto'
          }}
          onClick={() => setShowPrintPreview(false)}
        >
          <div 
            style={{ 
              maxWidth: '850px', 
              width: '100%', 
              maxHeight: '94vh', 
              overflowY: 'auto',
              borderRadius: '12px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <ZFPrintDocumentLayout
              documentTitle={isAr ? 'سند قبض نقدية رسمي' : 'Official Cash Receipt Voucher'}
              documentSubtitle={destinationTreasury === 'SAFE_101000' 
                ? (isAr ? 'إيداع نقدي بخزينة الشركة الرئيسية (حساب 101000)' : 'Cash Safe Deposit (101000)')
                : (isAr ? 'تحويل فوري بحساب الشركة بالبنك / إنستاباي (حساب 102000)' : 'Bank / InstaPay Transfer (102000)')
              }
              voucherCode={voucherCode}
              date={receiptDate}
              onClose={() => setShowPrintPreview(false)}
              isAr={isAr}
            >
              {voucherBody}
            </ZFPrintDocumentLayout>
          </div>
        </div>
      )}

      {/* Hidden print container: rendered for @media print */}
      <div className="zf-print-only">
        <ZFPrintDocumentLayout
          documentTitle={isAr ? 'سند قبض نقدية رسمي' : 'Official Cash Receipt Voucher'}
          documentSubtitle={destinationTreasury === 'SAFE_101000' 
            ? (isAr ? 'إيداع نقدي بخزينة الشركة الرئيسية (حساب 101000)' : 'Cash Safe Deposit (101000)')
            : (isAr ? 'تحويل فوري بحساب الشركة بالبنك / إنستاباي (حساب 102000)' : 'Bank / InstaPay Transfer (102000)')
          }
          voucherCode={voucherCode}
          date={receiptDate}
          isAr={isAr}
        >
          {voucherBody}
        </ZFPrintDocumentLayout>
      </div>
    </div>
  );
};
