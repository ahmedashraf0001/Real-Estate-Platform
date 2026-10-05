'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { Decimal, D } from '@/lib/erp/math';
import { formatNumberWithCommas } from '@/lib/erp/operationsStreamFilters';
import { ZFModalShell } from '../common/ZFModalShell';
import shellStyles from '../ZFWorkstationShell.module.css';
import styles from './ZFCashTransferModal.module.css';

export interface ZFCashTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAr?: boolean;
  isMutating?: boolean;
  safeBalance: Decimal;
  instapayBalance: Decimal;
  onConfirm: (d: {
    from: '101000' | '102000';
    to: '101000' | '102000';
    amount: string;
    date: string;
    notes: string;
  }) => Promise<void>;
}

function getLocalToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const ZFCashTransferModal: React.FC<ZFCashTransferModalProps> = ({
  isOpen,
  onClose,
  isAr = true,
  isMutating = false,
  safeBalance,
  instapayBalance,
  onConfirm,
}) => {
  const [direction, setDirection] = useState<'SAFE_TO_INSTAPAY' | 'INSTAPAY_TO_SAFE'>('SAFE_TO_INSTAPAY');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalToday);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setDirection('SAFE_TO_INSTAPAY');
      setAmount('');
      setDate(getLocalToday());
      setNotes('');
      setError('');
      setIsSubmitting(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isOpen]);

  const from: '101000' | '102000' = direction === 'SAFE_TO_INSTAPAY' ? '101000' : '102000';
  const to: '101000' | '102000' = direction === 'SAFE_TO_INSTAPAY' ? '102000' : '101000';
  const sourceBalance = from === '101000' ? safeBalance : instapayBalance;
  const currency = isAr ? ' ج.م' : ' EGP';

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const amt = D(amount.trim() || '0');
    if (!amt.gt(0)) {
      setError(isAr ? 'أدخل مبلغاً أكبر من صفر' : 'Enter an amount above zero');
      return;
    }
    if (amt.gt(sourceBalance)) {
      setError(isAr ? 'المبلغ أكبر من رصيد الحساب المحوِّل' : 'Amount exceeds the sending account balance');
      return;
    }
    if (!date.trim()) {
      setError(isAr ? 'التاريخ مطلوب' : 'Date is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        from,
        to,
        amount: amt.toFixed(2),
        date: date.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [amount, date, from, isAr, notes, onClose, onConfirm, sourceBalance, to]);

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
        onClick={() => handleSubmit()}
        disabled={isMutating || isSubmitting}
      >
        {isAr ? 'تسجيل التحويل' : 'Record transfer'}
      </button>
    </>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      isAr={isAr}
      title={isAr ? 'تحويل بين الخزينة وإنستاباي' : 'Transfer between Safe and InstaPay'}
      subtitle={
        isAr
          ? 'يُسجل قيد واحد: مدين الحساب المستلم، دائن الحساب المحوِّل.'
          : 'Posts one entry: debit the receiving account, credit the sending account.'
      }
      icon={<ArrowLeftRight size={16} />}
      maxWidth="480px"
      footer={footer}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        {/* 1. Segmented */}
        <div className={styles.segGroup}>
          <button
            type="button"
            className={`${styles.seg} ${direction === 'SAFE_TO_INSTAPAY' ? styles.segActive : ''}`}
            aria-pressed={direction === 'SAFE_TO_INSTAPAY'}
            onClick={() => setDirection('SAFE_TO_INSTAPAY')}
          >
            {isAr ? 'من الخزينة إلى إنستاباي' : 'Safe → InstaPay'}
          </button>
          <button
            type="button"
            className={`${styles.seg} ${direction === 'INSTAPAY_TO_SAFE' ? styles.segActive : ''}`}
            aria-pressed={direction === 'INSTAPAY_TO_SAFE'}
            onClick={() => setDirection('INSTAPAY_TO_SAFE')}
          >
            {isAr ? 'من إنستاباي إلى الخزينة' : 'InstaPay → Safe'}
          </button>
        </div>

        {/* 2. Balances block */}
        <div className={styles.balances}>
          <div className={styles.balanceRow}>
            <span>{isAr ? 'رصيد الخزينة (101000)' : 'Safe (101000)'}</span>
            <span className={`${styles.balanceValue} ${safeBalance.isNegative() ? styles.negative : ''}`}>
              {formatNumberWithCommas(safeBalance)}{currency}
            </span>
          </div>
          <div className={styles.balanceRow}>
            <span>{isAr ? 'رصيد إنستاباي (102000)' : 'InstaPay (102000)'}</span>
            <span className={`${styles.balanceValue} ${instapayBalance.isNegative() ? styles.negative : ''}`}>
              {formatNumberWithCommas(instapayBalance)}{currency}
            </span>
          </div>
        </div>

        {/* 3. Row: amount + date */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>{isAr ? 'المبلغ' : 'Amount'}</label>
            <input
              type="text"
              inputMode="decimal"
              className={styles.input}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{isAr ? 'التاريخ' : 'Date'}</label>
            <input
              type="date"
              className={styles.input}
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* 4. Notes input */}
        <div className={styles.field}>
          <label className={styles.label}>{isAr ? 'ملاحظات (اختياري)' : 'Notes (optional)'}</label>
          <input
            type="text"
            className={styles.input}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* 5. Error */}
        {error ? <p className={styles.error}>{error}</p> : null}
      </form>
    </ZFModalShell>
  );
};
