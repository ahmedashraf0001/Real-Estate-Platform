'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, CreditCard, FileText, Landmark, Printer, Smartphone, User, Wallet } from 'lucide-react';
import type { ERPContract, ERPInstallmentSchedule, ERPAccountingPeriod } from '@/lib/erp/types';
import { D, Decimal } from '@/lib/erp/math';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { resolvePeriodForDate } from '@/lib/erp/ledger';
import { ZFPrintDocumentLayout } from '../common/ZFPrintDocumentLayout';
import { ZFModalShell } from '../common/ZFModalShell';
import css from './CashCollectionReceiptModal.module.css';

type Treasury = 'SAFE_101000' | 'BANK_102000';
type PaymentMethod = 'CASH' | 'INSTAPAY';

interface CashCollectionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract?: ERPContract | null;
  schedule?: ERPInstallmentSchedule | null;
  activePeriod?: ERPAccountingPeriod;
  periods?: ERPAccountingPeriod[];
  isAr?: boolean;
  isMutating?: boolean;
  onConfirmCollection: (details: {
    receiptDate: string;
    destinationTreasury?: Treasury;
    paymentMethod?: PaymentMethod;
    notes: string;
  }) => Promise<void>;
}

interface ConfirmedReceipt {
  date: string;
  treasury: Treasury;
  paymentMethod: PaymentMethod;
  notes: string;
}

export const CashCollectionReceiptModal: React.FC<CashCollectionReceiptModalProps> = ({
  isOpen, onClose, contract, schedule, activePeriod, periods, isAr = true, isMutating = false, onConfirmCollection
}) => {
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [destinationTreasury, setDestinationTreasury] = useState<Treasury>('SAFE_101000');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedReceipt | null>(null);

  useEffect(() => {
    if (isOpen) return;
    setConfirmed(null);
    setNotes('');
    setReceiptDate(new Date().toISOString().split('T')[0]);
    setDestinationTreasury('SAFE_101000');
    setPaymentMethod('CASH');
  }, [isOpen]);

  if (!isOpen || !contract || !schedule) return null;

  const amount = D(schedule.nominal_value || '0');
  const remaining = Decimal.max(0, D(contract.gross_contract_value || '0').minus(D(contract.total_cash_collected || '0')).minus(amount));
  const activeMethod = confirmed?.paymentMethod || paymentMethod;
  const treasuryLabel = isAr ? 'الخزينة التشغيلية الرئيسية (101000)' : 'Operating Treasury Safe (101000)';
  const methodLabel = activeMethod === 'INSTAPAY'
    ? (isAr ? 'تحويل إلكتروني فوري (إنستاباي)' : 'Instant Electronic Transfer (InstaPay)')
    : (isAr ? 'توريد كاش باليد' : 'Cash in Hand');
  const creditAccount = contract.handover_status === 'Delivered' ? '103000' : '203000';
  const money = (value: Decimal) => `${value.formatEGP(isAr)}`;

  const targetPeriod = useMemo(() => {
    return resolvePeriodForDate(receiptDate, periods || (activePeriod ? [activePeriod] : []), activePeriod);
  }, [receiptDate, periods, activePeriod]);
  const isTargetPeriodLocked = targetPeriod ? targetPeriod.status !== 'OPEN' : false;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || isMutating || !amount.gt(0) || isTargetPeriodLocked) return;
    setSubmitting(true);
    try {
      await onConfirmCollection({
        receiptDate,
        destinationTreasury: 'SAFE_101000',
        paymentMethod,
        notes: notes.trim()
      });
      setConfirmed({ date: receiptDate, treasury: 'SAFE_101000', paymentMethod, notes: notes.trim() });
    } catch {
      // The posting handler reports the error; keep the editable form open.
    } finally {
      setSubmitting(false);
    }
  };

  const printBody = confirmed && (
    <div className={css.printBody} dir={isAr ? 'rtl' : 'ltr'}>
      <h2>{isAr ? 'إيصال تحصيل قسط' : 'Installment collection receipt'}</h2>
      <p>{isAr ? 'رقم العقد' : 'Contract'}: {contract.contract_number} · {isAr ? 'القسط' : 'Tranche'}: {schedule.tranche_number}</p>
      <strong>{money(amount)}</strong>
      <p>{tafqeetEGP(amount.toFixed(2))}</p>
      <dl>
        <div><dt>{isAr ? 'المحصل من' : 'Received from'}</dt><dd>{contract.buyer_name}</dd></div>
        <div><dt>{isAr ? 'الوحدة' : 'Unit'}</dt><dd>{contract.unit_id}</dd></div>
        <div><dt>{isAr ? 'تاريخ التحصيل' : 'Receipt date'}</dt><dd>{confirmed.date}</dd></div>
        <div><dt>{isAr ? 'جهة الإيداع' : 'Deposited to'}</dt><dd>{treasuryLabel}</dd></div>
        <div><dt>{isAr ? 'طريقة التحصيل' : 'Payment method'}</dt><dd>{methodLabel}</dd></div>
        {confirmed.notes && <div><dt>{isAr ? 'ملاحظات' : 'Notes'}</dt><dd>{confirmed.notes}</dd></div>}
      </dl>
    </div>
  );

  return (
    <>
      <ZFModalShell isOpen={isOpen} onClose={onClose} isAr={isAr} maxWidth="760px" maxHeight="90vh"
        icon={<FileText size={17} />}
        title={confirmed ? (isAr ? 'تم تسجيل التحصيل' : 'Collection recorded') : (isAr ? 'تحصيل قسط' : 'Collect installment')}
        subtitle={`${isAr ? 'العقد' : 'Contract'} ${contract.contract_number} · ${isAr ? 'القسط' : 'Tranche'} ${schedule.tranche_number}`}
        bodyStyle={{ padding: 0 }}
        footer={<div className={css.footer}>
          {confirmed ? <>
            <span className={css.confirmedLabel}><CheckCircle2 size={16} />{isAr ? 'تم اعتماد التحصيل' : 'Collection confirmed'}</span>
            <button type="button" className={css.secondaryButton} onClick={onClose}>{isAr ? 'إغلاق' : 'Close'}</button>
            <button type="button" className={css.primaryButton} onClick={() => window.print()}><Printer size={15} />{isAr ? 'طباعة الإيصال' : 'Print receipt'}</button>
          </> : <>
            <span className={css.footerHint}>{isAr ? 'ستُسجل الحركة في الحساب المحدد عند الاعتماد.' : 'The collection posts to the selected account on confirmation.'}</span>
            <button type="button" className={css.secondaryButton} onClick={onClose} disabled={submitting || isMutating}>{isAr ? 'إلغاء' : 'Cancel'}</button>
            <button type="submit" form="cash-collection-form" className={css.primaryButton} disabled={submitting || isMutating || !amount.gt(0) || isTargetPeriodLocked}>
              {submitting || isMutating ? (
                <>{isAr ? 'جارٍ التسجيل…' : 'Recording…'}</>
              ) : isTargetPeriodLocked ? (
                <><AlertCircle size={15} />{isAr ? `الفترة مقفلة (M${targetPeriod?.period_number ?? ''})` : `Period Locked (M${targetPeriod?.period_number ?? ''})`}</>
              ) : (
                <><CheckCircle2 size={15} />{isAr ? 'اعتماد التحصيل' : 'Confirm collection'}</>
              )}
            </button>
          </>}
        </div>}>
        {confirmed ? (
          <div className={css.confirmedBody}>
            <div className={css.confirmationLine}><CheckCircle2 size={20} /><span>{isAr ? 'تم قيد الدفعة على العقد' : 'The installment was posted to the contract'}</span></div>
            {printBody}
          </div>
        ) : (
          <div className={css.body}>
            <section className={css.summary} aria-label={isAr ? 'بيانات التحصيل' : 'Collection details'}>
              <div className={css.amountRow}>
                <div><span>{isAr ? 'قيمة القسط المطلوب تحصيله' : 'Installment to collect'}</span><strong>{money(amount)}</strong></div>
                <span className={css.trancheLabel}>{schedule.tranche_number === 0 ? (isAr ? 'مقدم العقد' : 'Deposit') : (isAr ? `القسط ${schedule.tranche_number}` : `Tranche ${schedule.tranche_number}`)}</span>
              </div>
              <div className={css.summaryGrid}>
                <div><User size={14} /><span>{isAr ? 'العميل' : 'Client'}</span><strong>{contract.buyer_name}</strong></div>
                <div><FileText size={14} /><span>{isAr ? 'الوحدة' : 'Unit'}</span><strong>{contract.unit_id}</strong></div>
                <div><CalendarDays size={14} /><span>{isAr ? 'موعد القسط' : 'Due date'}</span><strong className={css.tabular}>{schedule.due_date || '—'}</strong></div>
                <div><Wallet size={14} /><span>{isAr ? 'المتبقي بعد التحصيل' : 'Balance after collection'}</span><strong className={css.tabular}>{money(remaining)}</strong></div>
              </div>
            </section>

            <form id="cash-collection-form" className={css.form} onSubmit={submit}>
              <div className={css.formHeader}><h4>{isAr ? 'تفاصيل الإيداع' : 'Deposit details'}</h4><span>{isAr ? 'اختر الحساب وتاريخ الاستلام الفعلي' : 'Choose account and actual receipt date'}</span></div>
              <label className={css.dateField} htmlFor="collection-receipt-date">
                {isAr ? 'تاريخ التحصيل' : 'Receipt date'}
                <input id="collection-receipt-date" name="receiptDate" type="date" required value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
              </label>
              {isTargetPeriodLocked && targetPeriod && (
                <div style={{
                  background: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  borderRadius: '10px',
                  padding: '0.75rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  color: '#991b1b',
                  fontSize: '0.8rem',
                  marginBottom: '0.75rem'
                }}>
                  <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.82rem' }}>
                      {isAr ? 'الفترة المحاسبية لتاريخ التحصيل مقفلة' : 'Fiscal period is locked'}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                      {isAr
                        ? `تاريخ التحصيل يقع في الفترة (${targetPeriod.fiscal_year}-M${targetPeriod.period_number}) وهي مقفلة بموجب المعيار Invariant 0.9. يُرجى فتح الفترة أو تغيير التاريخ.`
                        : `Receipt date falls in period (${targetPeriod.fiscal_year}-M${targetPeriod.period_number}) which is locked per Invariant 0.9.`}
                    </span>
                  </div>
                </div>
              )}
              <fieldset className={css.destinationField}>
                <legend>{isAr ? 'طريقة التحصيل (إيداع بالخزينة الرئيسية 101000)' : 'Collection method (Deposit to Main Treasury 101000)'}</legend>
                <label className={paymentMethod === 'CASH' ? css.destinationSelected : css.destination}>
                  <input type="radio" name="paymentMethod" value="CASH" checked={paymentMethod === 'CASH'} onChange={() => setPaymentMethod('CASH')} />
                  <Wallet size={17} />
                  <span><strong>{isAr ? 'كاش نقدي' : 'Cash in Hand'}</strong><small>{isAr ? 'توريد نقدي بالخزينة (101000)' : 'Vault Safe (101000)'}</small></span>
                </label>
                <label className={paymentMethod === 'INSTAPAY' ? css.destinationSelected : css.destination}>
                  <input type="radio" name="paymentMethod" value="INSTAPAY" checked={paymentMethod === 'INSTAPAY'} onChange={() => setPaymentMethod('INSTAPAY')} />
                  <Smartphone size={17} />
                  <span><strong>{isAr ? 'تحويل إنستاباي' : 'InstaPay Transfer'}</strong><small>{isAr ? 'تحويل فوري للخزينة (101000)' : 'Instant to Safe (101000)'}</small></span>
                </label>
              </fieldset>
              <label className={css.noteField} htmlFor="collection-receipt-notes">
                {isAr ? 'ملاحظات للسند' : 'Receipt notes'} <span>{isAr ? '(اختياري)' : '(optional)'}</span>
                <textarea id="collection-receipt-notes" name="notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder={isAr ? 'تفاصيل التحويل أو مرجع الإيداع…' : 'Transfer details or deposit reference…'} />
              </label>
              <div className={css.postingLine}>
                <CreditCard size={15} />
                <span>{isAr ? 'القيد عند الاعتماد' : 'Posting on confirmation'}</span>
                <strong>{isAr ? 'مدين' : 'Dr'} 101000 ({isAr ? 'الخزينة الرئيسية' : 'Main Treasury Safe'}) <span>·</span> {isAr ? 'دائن' : 'Cr'} {creditAccount}</strong>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  ({paymentMethod === 'INSTAPAY' ? (isAr ? 'عبر إنستاباي' : 'via InstaPay') : (isAr ? 'نقداً بالخزينة' : 'via Cash')})
                </span>
              </div>
            </form>
          </div>
        )}
      </ZFModalShell>
      {confirmed && (
        <div className="zf-print-only">
          <ZFPrintDocumentLayout
            documentTitle={isAr ? 'إيصال تحصيل قسط' : 'Installment collection receipt'}
            documentSubtitle={`${contract.contract_number} · ${confirmed.date}`}
            voucherCode={`${contract.contract_number} / ${schedule.tranche_number}`}
            date={confirmed.date}
            isAr={isAr}
          >
            {printBody}
          </ZFPrintDocumentLayout>
        </div>
      )}
    </>
  );
};
