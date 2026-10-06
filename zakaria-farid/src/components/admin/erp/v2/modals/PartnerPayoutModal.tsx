'use client';

import React, { useState, useMemo } from 'react';
import {
  Banknote,
  Wallet,
  Smartphone
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import {
  PartnerFinancialSummary,
  computeProjectPayoutPosition,
  resolvePartnerSharePct,
  isSamePartner
} from '@/lib/erp/partnersEngine';
import { Property } from '@/lib/supabase/types';
import type {
  ERPAccountingPeriod,
  ERPContract,
  ERPPartnerCommitment,
  ERPPartnerTransaction
} from '@/lib/erp/types';
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

type PayoutMethod = 'CASH_101000' | 'INSTAPAY_102000';

interface PartnerPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: PartnerFinancialSummary[];
  properties?: Property[];
  contracts?: ERPContract[];
  transactions?: ERPPartnerTransaction[];
  commitments?: ERPPartnerCommitment[];
  initialPartnerName?: string;
  initialPropertyId?: string;
  activePeriod?: ERPAccountingPeriod;
  periods?: ERPAccountingPeriod[];
  isAr?: boolean;
  isMutating?: boolean;
  /** Resolves false when nothing was recorded; the modal then stays open. */
  onConfirmPayout: (details: {
    partnerName: string;
    amount: string;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000';
    propertyId?: string;
    propertyTitle?: string;
    payoutDate: string;
    receiptRef: string;
    memo: string;
  }) => Promise<boolean | void>;
}

/**
 * Partner payout, one project at a time (user-confirmed 2026-10-06).
 * Unpaid capital commitments on the project are settled first from the partner's share;
 * only what is left can be paid in cash.
 */
export const PartnerPayoutModal: React.FC<PartnerPayoutModalProps> = ({
  isOpen,
  onClose,
  partners,
  properties = [],
  contracts = [],
  transactions = [],
  commitments = [],
  initialPartnerName,
  initialPropertyId,
  activePeriod,
  periods,
  isAr = true,
  isMutating = false,
  onConfirmPayout
}) => {
  const isLockedToPartner = Boolean(initialPartnerName && initialPartnerName.trim());
  const [selectedPartnerName, setSelectedPartnerName] = useState<string>(initialPartnerName?.trim() || partners[0]?.partnerName || '');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropertyId || '');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PayoutMethod>('CASH_101000');
  const [payoutDate, setPayoutDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [receiptRef, setReceiptRef] = useState<string>(() => `PAY-${Date.now().toString().slice(-6)}`);
  const [memo, setMemo] = useState<string>('');

  const partnerName = (isLockedToPartner ? initialPartnerName!.trim() : selectedPartnerName) || '';
  const money = (v: string | number) => `${Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`;

  // Projects this partner has a stake or a commitment in
  const partnerProperties = useMemo(() => properties.filter(p =>
    resolvePartnerSharePct(p, partnerName) > 0 ||
    commitments.some(c => c.property_id === p.id && isSamePartner(c.partner_name, partnerName))
  ), [properties, commitments, partnerName]);

  const propertyId = partnerProperties.some(p => p.id === selectedPropertyId)
    ? selectedPropertyId
    : (partnerProperties[0]?.id || '');
  const property = partnerProperties.find(p => p.id === propertyId);

  const position = useMemo(() => property
    ? computeProjectPayoutPosition({ partnerName, property, contracts, transactions, commitments })
    : null, [partnerName, property, contracts, transactions, commitments]);

  const targetPeriod = useMemo(
    () => resolvePeriodForDate(payoutDate, periods || (activePeriod ? [activePeriod] : []), activePeriod),
    [payoutDate, periods, activePeriod]
  );
  const isTargetPeriodLocked = targetPeriod ? targetPeriod.status !== 'OPEN' : false;

  const cash = D(parseFloat(amount) || 0);
  const offset = D(position?.offsetNow || 0);
  const cashAvailable = D(position?.cashAvailable || 0);
  const hasDebt = D(position?.commitmentDebt || 0).gt(0);
  const cashOverLimit = cash.gt(cashAvailable);
  const blocksOverLimit = cashOverLimit && hasDebt;
  const canSubmit = Boolean(partnerName && property) && (cash.gt(0) || offset.gt(0)) &&
    !blocksOverLimit && !isMutating && !isTargetPeriodLocked;

  const isCash = paymentMethod === 'CASH_101000';
  const cashAccountName = isCash ? (isAr ? 'الخزينة' : 'Safe') : (isAr ? 'إنستاباي' : 'InstaPay');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !property) return;
    const ok = await onConfirmPayout({
      partnerName,
      amount: cash.toFixed(2),
      paymentMethod,
      propertyId: property.id,
      propertyTitle: property.title_ar || property.title_en,
      payoutDate,
      receiptRef,
      memo: memo || (isAr ? `صرف أرباح للشريك: ${partnerName}` : `Partner payout: ${partnerName}`)
    });
    if (ok !== false) onClose();
  };

  const submitLabel = isMutating
    ? (isAr ? 'جارٍ الحفظ…' : 'Saving…')
    : (!cash.gt(0) && offset.gt(0))
      ? (isAr ? 'خصم المديونية من الأرباح' : 'Settle debt from profit')
      : (isAr ? 'تأكيد الصرف' : 'Confirm payout');

  const footer = (
    <ZFFormFooter>
      <button type="button" className={shellStyles.btnSecondary} onClick={onClose}>
        {isAr ? 'إلغاء' : 'Cancel'}
      </button>
      <button type="submit" form="zf-payout-form" className={shellStyles.btnPrimary} disabled={!canSubmit}>
        {submitLabel}
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
          ? 'يُصرف من نصيب الشريك في مشروع واحد. مديونية الضخ تُخصم أولاً.'
          : 'Paid from the partner\'s share in one project. Unpaid capital is settled first.'
      }
      icon={<Banknote size={18} />}
      isAr={isAr}
      maxWidth="640px"
      footer={footer}
    >
      <form id="zf-payout-form" className={zfForm.form} onSubmit={handleSubmit}>
        <div className={zfForm.row}>
          <ZFField label={isAr ? 'الشريك' : 'Partner'} required>
            <select
              className={zfForm.control}
              value={partnerName}
              onChange={e => { setSelectedPartnerName(e.target.value); setAmount(''); }}
              disabled={isLockedToPartner}
            >
              {partners.map(p => {
                const isOwner = p.isPermanent || p.partnerName === PRIMARY_DEVELOPER_NAME;
                return (
                  <option key={p.partnerName} value={p.partnerName}>
                    {p.partnerName}{isOwner ? (isAr ? ' — المالك' : ' — owner') : ''}
                  </option>
                );
              })}
            </select>
          </ZFField>
          <ZFField label={isAr ? 'المشروع' : 'Project'} required>
            <select
              className={zfForm.control}
              value={propertyId}
              onChange={e => { setSelectedPropertyId(e.target.value); setAmount(''); }}
              disabled={partnerProperties.length === 0}
            >
              {partnerProperties.length === 0 && (
                <option value="">{isAr ? 'لا يوجد مشروع للشريك' : 'No project for this partner'}</option>
              )}
              {partnerProperties.map(p => (
                <option key={p.id} value={p.id}>
                  {isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar)}
                </option>
              ))}
            </select>
          </ZFField>
        </div>

        {position && (
          <ZFFacts
            items={[
              { label: isAr ? 'نصيبه من التحصيلات' : 'Share of collections', value: money(position.collectionsShare) },
              { label: isAr ? 'صُرف له قبل كده' : 'Paid before', value: money(position.paidOut) },
              {
                label: isAr ? 'مديونية ضخ رأس المال' : 'Unpaid capital',
                value: money(position.commitmentDebt),
                tone: hasDebt ? 'neg' : undefined
              },
              {
                label: isAr ? 'المتاح نقداً' : 'Available in cash',
                value: money(position.cashAvailable),
                tone: cashAvailable.gt(0) ? 'pos' : undefined
              }
            ]}
          />
        )}

        <div className={zfForm.row}>
          <ZFField label={isAr ? 'المبلغ النقدي' : 'Cash amount'} required={!offset.gt(0)}>
            <ZFMoneyInput
              value={amount}
              onChange={e => setAmount(e.target.value)}
              unit={isAr ? 'ج.م' : 'EGP'}
              autoFocus
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

        <ZFField label={isAr ? 'طريقة الصرف' : 'Paid by'}>
          <ZFChoices<PayoutMethod>
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={[
              { id: 'CASH_101000', label: isAr ? 'نقداً' : 'Cash', sub: isAr ? 'من الخزينة' : 'From the safe', icon: <Wallet size={16} /> },
              { id: 'INSTAPAY_102000', label: isAr ? 'إنستاباي' : 'InstaPay', sub: isAr ? 'من حساب إنستاباي' : 'From InstaPay', icon: <Smartphone size={16} /> }
            ]}
          />
        </ZFField>

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

        {isTargetPeriodLocked && (
          <ZFEffect tone="danger">
            {isAr
              ? 'الفترة المحاسبية لهذا التاريخ مقفلة. اختر تاريخاً آخر.'
              : 'The accounting period for this date is closed. Pick another date.'}
          </ZFEffect>
        )}
        {offset.gt(0) && (
          <ZFEffect tone="warn">
            {isAr ? (
              <>هيتخصم <strong>{money(offset.toFixed(2))}</strong> من نصيبه لسداد مديونية الضخ أولاً.</>
            ) : (
              <><strong>{money(offset.toFixed(2))}</strong> of his share settles his unpaid capital first.</>
            )}
          </ZFEffect>
        )}
        {position && D(position.debtAfter).gt(0) && (
          <ZFEffect tone="danger">
            {isAr
              ? `نصيبه مش مكفي. هيفضل عليه ${money(position.debtAfter)} مديونية ضخ.`
              : `His share is not enough. ${money(position.debtAfter)} of unpaid capital stays on him.`}
          </ZFEffect>
        )}
        {cashOverLimit && (
          <ZFEffect tone={hasDebt ? 'danger' : 'warn'}>
            {hasDebt
              ? (isAr ? `أقصى مبلغ نقدي بعد خصم المديونية: ${money(cashAvailable.toFixed(2))}.` : `Maximum cash after the offset: ${money(cashAvailable.toFixed(2))}.`)
              : (isAr ? `المبلغ أكبر من المتاح (${money(cashAvailable.toFixed(2))}). رصيد الشريك هيبقى بالسالب.` : `Amount is more than the available ${money(cashAvailable.toFixed(2))}. The partner balance will go negative.`)}
          </ZFEffect>
        )}
        {cash.gt(0) && !blocksOverLimit && (
          <ZFEffect>
            {isAr ? (
              <>هيتصرف <strong>{money(cash.toFixed(2))}</strong> لـ <strong>{partnerName}</strong> من {cashAccountName}.</>
            ) : (
              <><strong>{money(cash.toFixed(2))}</strong> will be paid to <strong>{partnerName}</strong> from {cashAccountName}.</>
            )}
          </ZFEffect>
        )}
        {!position && (
          <ZFEffect>
            {isAr ? 'الشريك ده مالوش نصيب في أي مشروع.' : 'This partner has no stake in any project.'}
          </ZFEffect>
        )}

        {(cash.gt(0) || offset.gt(0)) && (
          <ZFJournalPeek
            isAr={isAr}
            lines={[
              { code: '303000', name: isAr ? 'توزيعات أرباح ومسحوبات الشركاء' : 'Partner Distributions', debit: cash.plus(offset).toNumber() },
              ...(offset.gt(0) ? [{ code: '301000', name: isAr ? 'رأس مال الشركاء' : 'Partner Capital', credit: offset.toNumber() }] : []),
              ...(cash.gt(0) ? [{ code: isCash ? '101000' : '102000', name: cashAccountName, credit: cash.toNumber() }] : [])
            ]}
          />
        )}
      </form>
    </ZFModalShell>
  );
};
