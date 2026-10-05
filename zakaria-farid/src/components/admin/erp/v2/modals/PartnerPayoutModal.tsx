'use client';
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Banknote,
  Wallet,
  Smartphone
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import { PartnerFinancialSummary } from '@/lib/erp/partnersEngine';
import { Property } from '@/lib/supabase/types';
import type { ERPAccountingPeriod } from '@/lib/erp/types';
import { resolvePeriodForDate } from '@/lib/erp/ledger';
import { ZFModalShell } from '../common/ZFModalShell';
import {
  ZFField,
  ZFMoneyInput,
  ZFChoices,
  ZFFacts,
  ZFEffect,
  ZFJournalPeek,
  ZFFormFooter,
  zfForm
} from '../common/ZFForm';
import shellStyles from '../ZFWorkstationShell.module.css';
import { PRIMARY_DEVELOPER_NAME } from '@/lib/erp/partnersDirectory';

interface PartnerPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: PartnerFinancialSummary[];
  properties?: Property[];
  initialPartnerName?: string;
  activePeriod?: ERPAccountingPeriod;
  periods?: ERPAccountingPeriod[];
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
  activePeriod,
  periods,
  isAr = true,
  isMutating = false,
  onConfirmPayout
}) => {
  const isLockedToPartner = Boolean(initialPartnerName && initialPartnerName.trim());
  const [selectedPartnerName, setSelectedPartnerName] = useState<string>(initialPartnerName?.trim() || (partners[0]?.partnerName || ''));
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000'>('CASH_101000');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [payoutDate, setPayoutDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receiptRef, setReceiptRef] = useState<string>(`PAY-${Date.now().toString().slice(-6)}`);
  const [memo, setMemo] = useState<string>('');

  useEffect(() => {
    if (initialPartnerName && initialPartnerName.trim()) {
      setSelectedPartnerName(initialPartnerName.trim());
    } else if (partners.length > 0 && !selectedPartnerName) {
      setSelectedPartnerName(partners[0].partnerName);
    }
  }, [initialPartnerName, partners, selectedPartnerName]);

  const targetPeriod = useMemo(() => {
    return resolvePeriodForDate(payoutDate, periods || (activePeriod ? [activePeriod] : []), activePeriod);
  }, [payoutDate, periods, activePeriod]);

  const effectivePartnerName = (isLockedToPartner ? initialPartnerName!.trim() : selectedPartnerName) || '';
  const currentPartner = partners.find(p => p.partnerName === effectivePartnerName) || partners.find(p => p.partnerName === selectedPartnerName) || partners[0];
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const numAmount = parseFloat(amount) || 0;
  const isAmountValid = numAmount > 0;
  const isTargetPeriodLocked = targetPeriod ? targetPeriod.status !== 'OPEN' : false;

  const isCash = paymentMethod === 'CASH_101000';
  const selectedAccountCode = isCash ? '101000' : '102000';

  const moneyFormatted = `${Number(numAmount).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`;
  const netBalanceNum = currentPartner ? D(currentPartner.netCurrentBalance).toNumber() : 0;
  const availFormatted = `${Number(netBalanceNum).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectivePartnerName || !isAmountValid || isMutating || isTargetPeriodLocked) return;

    await onConfirmPayout({
      partnerName: effectivePartnerName,
      amount: D(numAmount).toFixed(2),
      paymentMethod,
      propertyId: selectedPropertyId || undefined,
      propertyTitle: selectedProperty ? (selectedProperty.title_ar || selectedProperty.title_en) : undefined,
      payoutDate,
      receiptRef,
      memo: memo || (isAr ? `صرف دفعة أرباح للشريك: ${effectivePartnerName}` : `Partner payout: ${effectivePartnerName}`)
    });

    onClose();
  };

  const footer = (
    <ZFFormFooter>
      <button type="button" className={shellStyles.btnSecondary} onClick={onClose}>
        {isAr ? 'إلغاء' : 'Cancel'}
      </button>
      <button
        type="submit"
        form="zf-payout-form"
        className={shellStyles.btnPrimary}
        disabled={!effectivePartnerName || !isAmountValid || isMutating || isTargetPeriodLocked}
      >
        {isMutating ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'تأكيد الصرف' : 'Confirm payout')}
      </button>
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'صرف أرباح لشريك' : 'Partner payout'}
      subtitle={
        isAr
          ? 'صرف مبلغ لشريك من أرباحه أو رصيده المستحق.'
          : 'Pay a partner from their profit share or balance.'
      }
      icon={<Banknote size={18} />}
      isAr={isAr}
      maxWidth="640px"
      footer={footer}
    >
      <form id="zf-payout-form" className={zfForm.form} onSubmit={handleSubmit}>
        {/* 1. Partner */}
        <ZFField label={isAr ? 'الشريك' : 'Partner'} required>
          <select
            className={zfForm.control}
            value={effectivePartnerName}
            onChange={e => setSelectedPartnerName(e.target.value)}
            disabled={isLockedToPartner}
          >
            {partners.map(p => {
              const isOwner = p.isPermanent || p.partnerName === PRIMARY_DEVELOPER_NAME || p.partnerName.includes('زكريا فريد');
              const suffix = isOwner ? (isAr ? ' — المالك' : ' — owner') : '';
              return (
                <option key={p.partnerName} value={p.partnerName}>
                  {p.partnerName}{suffix}
                </option>
              );
            })}
          </select>
        </ZFField>

        {/* 2. Facts */}
        {currentPartner && (
          <ZFFacts
            items={[
              {
                label: isAr ? 'نصيبه من التحصيلات' : 'Share of collections',
                value: `${Number(currentPartner.totalCollectionsShare).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`
              },
              {
                label: isAr ? 'أرباح مصروفة سابقاً' : 'Paid before',
                value: `${Number(currentPartner.totalDistributionsPaid).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`
              },
              {
                label: isAr ? 'المتاح للصرف' : 'Available',
                value: `${Number(currentPartner.netCurrentBalance).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`,
                tone: D(currentPartner.netCurrentBalance).lt(0) ? 'neg' : D(currentPartner.netCurrentBalance).gt(0) ? 'pos' : undefined
              }
            ]}
          />
        )}

        {/* 3. Row: Amount & Date */}
        <div className={zfForm.row}>
          <ZFField label={isAr ? 'المبلغ' : 'Amount'} required>
            <ZFMoneyInput
              value={amount}
              onChange={e => setAmount(e.target.value)}
              unit={isAr ? 'ج.م' : 'EGP'}
              autoFocus
              required
            />
          </ZFField>
          <ZFField label={isAr ? 'التاريخ' : 'Date'} required>
            <input
              type="date"
              className={zfForm.control}
              value={payoutDate}
              onChange={e => setPayoutDate(e.target.value)}
              required
            />
          </ZFField>
        </div>

        {/* 4. Project (optional) */}
        <ZFField label={isAr ? 'المشروع' : 'Project'}>
          <select
            className={zfForm.control}
            value={selectedPropertyId}
            onChange={e => setSelectedPropertyId(e.target.value)}
          >
            <option value="">{isAr ? 'توزيع عام' : 'General payout'}</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>
                {isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar)}
              </option>
            ))}
          </select>
        </ZFField>

        {/* 5. Paid by */}
        <ZFField label={isAr ? 'طريقة الصرف' : 'Paid by'}>
          <ZFChoices<'CASH_101000' | 'INSTAPAY_102000'>
            value={paymentMethod === 'BANK_102000' ? 'CASH_101000' : paymentMethod}
            onChange={setPaymentMethod}
            options={[
              {
                id: 'CASH_101000',
                label: isAr ? 'نقداً' : 'Cash',
                sub: isAr ? 'من الخزينة' : 'From the safe',
                icon: <Wallet size={16} />
              },
              {
                id: 'INSTAPAY_102000',
                label: isAr ? 'إنستاباي' : 'InstaPay',
                sub: isAr ? 'من حساب إنستاباي' : 'From InstaPay',
                icon: <Smartphone size={16} />
              }
            ]}
          />
        </ZFField>

        {/* 6. Row: Receipt Ref & Notes */}
        <div className={zfForm.row}>
          <ZFField label={isAr ? 'رقم الإيصال' : 'Receipt no.'}>
            <input
              type="text"
              className={`${zfForm.control} ${zfForm.mono}`}
              value={receiptRef}
              onChange={e => setReceiptRef(e.target.value)}
            />
          </ZFField>
          <ZFField label={isAr ? 'ملاحظات' : 'Notes'}>
            <input
              type="text"
              className={zfForm.control}
              placeholder={isAr ? 'اختياري' : 'Optional'}
              value={memo}
              onChange={e => setMemo(e.target.value)}
            />
          </ZFField>
        </div>

        {/* 7. Effects (render all that apply, in order) */}
        {isTargetPeriodLocked && (
          <ZFEffect tone="danger">
            {isAr
              ? 'الفترة المحاسبية لهذا التاريخ مقفلة. اختر تاريخاً آخر.'
              : 'The accounting period for this date is closed. Pick another date.'}
          </ZFEffect>
        )}
        {numAmount > Math.max(0, netBalanceNum) && (
          <ZFEffect tone="warn">
            {isAr
              ? `المبلغ أكبر من المتاح للصرف (${availFormatted}). سيصبح رصيد الشريك بالسالب.`
              : `Amount is more than the available ${availFormatted}. The partner balance will go negative.`}
          </ZFEffect>
        )}
        {numAmount > 0 ? (
          <ZFEffect>
            {isAr ? (
              <>
                سيُصرف <strong>{moneyFormatted}</strong> لـ <strong>{effectivePartnerName}</strong> من {isCash ? 'الخزينة' : 'حساب إنستاباي'}.
              </>
            ) : (
              <>
                <strong>{moneyFormatted}</strong> will be paid to <strong>{effectivePartnerName}</strong> from {isCash ? 'the safe' : 'InstaPay'}.
              </>
            )}
          </ZFEffect>
        ) : (
          <ZFEffect>
            {isAr ? 'أدخل المبلغ لمعرفة ما سيُسجل.' : 'Enter an amount to see what will be recorded.'}
          </ZFEffect>
        )}

        {/* 8. Journal peek */}
        {numAmount > 0 && (
          <ZFJournalPeek
            isAr={isAr}
            lines={[
              {
                code: '303000',
                name: isAr ? 'توزيعات أرباح ومسحوبات الشركاء' : 'Partner Distributions',
                debit: numAmount
              },
              {
                code: selectedAccountCode,
                name: isAr ? (selectedAccountCode === '101000' ? 'الخزينة' : 'إنستاباي') : (selectedAccountCode === '101000' ? 'Safe' : 'InstaPay'),
                credit: numAmount
              }
            ]}
          />
        )}
      </form>
    </ZFModalShell>
  );
};
