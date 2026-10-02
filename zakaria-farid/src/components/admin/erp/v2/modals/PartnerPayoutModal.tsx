'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Wallet,
  Building2,
  Receipt,
  Smartphone,
  Crown,
  Users,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import { PartnerFinancialSummary } from '@/lib/erp/partnersEngine';
import { Property } from '@/lib/supabase/types';
import type { ERPAccountingPeriod } from '@/lib/erp/types';
import { resolvePeriodForDate } from '@/lib/erp/ledger';
import { ZFCustomSelect, ZFCustomSelectItem } from '../common/ZFCustomSelect';
import { ZFModalShell } from '../common/ZFModalShell';
import p from '../common/ZFModalPrimitives.module.css';
import { localizeBuyerName } from '@/components/erp/JournalEntryPreview';
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

  const partnerSelectItems = useMemo<ZFCustomSelectItem<string>[]>(() => {
    return partners.map(p => {
      const balanceNum = D(p.netCurrentBalance).toNumber();
      const isOwner = p.isPermanent || p.partnerName === PRIMARY_DEVELOPER_NAME || p.partnerName.includes('زكريا فريد');
      return {
        value: p.partnerName,
        labelAr: isOwner ? `${p.partnerName} (المالك والمطور الرئيسي)` : p.partnerName,
        labelEn: isOwner ? `${p.partnerName} (Owner & Primary Developer)` : p.partnerName,
        sublabelAr: isOwner ? `مالك المنظومة • رصيد مستحق: ${D(p.netCurrentBalance || 0).formatEGP(true)}` : `${p.roleTitleAr} • هاتف: ${p.phone || 'غير مُدخل'}`,
        sublabelEn: isOwner ? `System Owner • Balance: ${D(p.netCurrentBalance || 0).formatEGP(false)}` : `${p.roleTitleAr} • Phone: ${p.phone || 'not entered'}`,
        price: balanceNum,
        badge: isOwner ? (isAr ? 'المالك' : 'Owner') : (balanceNum > 0 ? (isAr ? 'مستحق له أرباح' : 'Due Payout') : (isAr ? 'رصيد مسوى' : 'Settled')),
        badgeBg: balanceNum > 0 && !isOwner ? '#f0fdf4' : '#ffffff',
        badgeTextColor: balanceNum > 0 && !isOwner ? '#15803d' : '#475569',
        icon: isOwner ? Crown : Users,
        iconBg: '#f1f5f9',
        iconColor: '#64748b'
      };
    });
  }, [partners, isAr]);

  const propertySelectItems = useMemo<ZFCustomSelectItem<string>[]>(() => {
    return [
      {
        value: '',
        labelAr: isAr ? 'توزيع عام من أرباح الشركة' : 'General Company Profit Distribution',
        labelEn: 'General Company Profit Distribution',
        sublabelAr: isAr ? 'أرباح عامة غير مخصصة لمشروع بعينه' : 'General profit unallocated to a specific project',
        sublabelEn: 'General profit unallocated to a specific project',
        badge: isAr ? 'توزيع عام' : 'General',
        badgeBg: '#ffffff',
        badgeTextColor: '#475569',
        icon: Building2,
        iconBg: '#f1f5f9',
        iconColor: '#64748b'
      },
      ...properties.map(p => ({
        value: p.id,
        labelAr: p.title_ar || p.title_en || '',
        labelEn: p.title_en || p.title_ar || '',
        sublabelAr: `${p.location || 'الموقع غير مُدخل'} • ${p.area_sqm || 0} م²`,
        sublabelEn: `${p.location || 'Location not entered'} • ${p.area_sqm || 0} sqm`,
        badge: p.completion_status === 'ready' ? (isAr ? 'جاهز' : 'Ready') : (isAr ? 'قيد التطوير' : 'In Progress'),
        badgeBg: p.completion_status === 'ready' ? '#f0fdf4' : '#fffbeb',
        badgeTextColor: p.completion_status === 'ready' ? '#15803d' : '#b45309',
        icon: Building2,
        iconBg: '#f1f5f9',
        iconColor: '#64748b'
      }))
    ];
  }, [properties, isAr]);

  const targetPeriod = useMemo(() => {
    return resolvePeriodForDate(payoutDate, periods || (activePeriod ? [activePeriod] : []), activePeriod);
  }, [payoutDate, periods, activePeriod]);

  const effectivePartnerName = (isLockedToPartner ? initialPartnerName!.trim() : selectedPartnerName) || '';
  const currentPartner = partners.find(p => p.partnerName === effectivePartnerName) || partners.find(p => p.partnerName === selectedPartnerName) || partners[0];
  const isOwner = Boolean(
    effectivePartnerName === PRIMARY_DEVELOPER_NAME ||
    effectivePartnerName.includes('زكريا فريد') ||
    currentPartner?.isPermanent
  );
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const numAmount = parseFloat(amount) || 0;
  const isAmountValid = numAmount > 0;
  const isTargetPeriodLocked = targetPeriod ? targetPeriod.status !== 'OPEN' : false;

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
      memo: memo || `صرف دفعة أرباح للشريك: ${effectivePartnerName}`
    });

    onClose();
  };

  const partnerDisplayName = isAr ? localizeBuyerName(effectivePartnerName) : effectivePartnerName;

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'صرف دفعة أرباح وتسديد مستحقات شريك' : 'Partner Profit Payout & Settlement'}
      subtitle={isAr ? 'قيد متوازن: مدين 303000 أرباح الشركاء · دائن 101000 الخزينة الرئيسية' : 'Balanced entry: Dr 303000 Partner Distributions · Cr 101000 Main Treasury'}
      icon={<Receipt size={16} />}
      isAr={isAr}
      maxWidth="680px"
      maxHeight="90vh"
      footer={
        <>
          <button
            type="submit"
            form="partner-payout-form"
            className={p.primaryButton}
            disabled={!isAmountValid || isMutating || isTargetPeriodLocked}
          >
            {isMutating ? (
              <><Loader2 size={14} className={p.spin} /><span>{isAr ? 'جارٍ الاعتماد والترحيل...' : 'Posting...'}</span></>
            ) : isTargetPeriodLocked ? (
              <><AlertTriangle size={14} /><span>{isAr ? `الفترة المحاسبية مقفلة (M${targetPeriod?.period_number ?? ''})` : `Period Locked (M${targetPeriod?.period_number ?? ''})`}</span></>
            ) : (
              <><CheckCircle2 size={14} /><span>{isAr ? 'اعتماد وصرف الدفعة وترحيل القيد' : 'Confirm Payout & Post JE'}</span></>
            )}
          </button>
          <button type="button" className={p.secondaryButton} onClick={onClose} disabled={isMutating}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
        </>
      }
    >
      <form id="partner-payout-form" onSubmit={handleSubmit}>
        {/* Partner */}
        <section className={p.section}>
          <h4 className={p.sectionTitle}>{isAr ? 'الشريك المستحق' : 'Partner'}</h4>
          {isLockedToPartner ? (
            <div className={p.sectionHeader}>
              <div className={p.identity}>
                <span className={p.thumbFallback}>{isOwner ? <Crown size={18} /> : <Users size={18} />}</span>
                <div className={p.identityText}>
                  <h4 className={p.identityTitle}><bdi>{partnerDisplayName || (isAr ? 'غير مُدخل' : 'Not entered')}</bdi></h4>
                  <p className={p.hint}>{isAr ? 'صرف الأرباح مقفل لهذا الشريك مباشرة' : 'Profit payout locked to this partner'}</p>
                </div>
              </div>
              <span className={isOwner ? `${p.pill} ${p.pillAccent}` : p.pill}>
                {isOwner ? (isAr ? 'المالك' : 'Owner') : (currentPartner?.roleTitleAr || (isAr ? 'شريك مساهم' : 'Partner'))}
              </span>
            </div>
          ) : (
            <div className={p.field}>
              <label className={p.label}>{isAr ? 'اختر الشريك أو الممول المستحق' : 'Select Partner / Investor'}</label>
              <ZFCustomSelect<string>
                value={selectedPartnerName}
                onChange={(val) => setSelectedPartnerName(val)}
                items={partnerSelectItems}
                placeholderAr="اختر الشريك المستحق"
                placeholderEn="Select partner / investor"
                isAr={isAr}
                searchable={true}
              />
            </div>
          )}

          {currentPartner && (
            <dl className={p.metaList}>
              <div className={p.metaRow}>
                <dt className={p.metaKey}>{isAr ? 'رأس المال المودع' : 'Contributed Capital'}</dt>
                <dd className={p.metaValue}><bdi>{D(currentPartner.totalContributedCapital || '0').formatEGP(isAr)}</bdi></dd>
              </div>
              <div className={p.metaRow}>
                <dt className={p.metaKey}>{isAr ? 'نصيبه من التحصيلات' : 'Collections Share'}</dt>
                <dd className={p.metaValue}><bdi>{D(currentPartner.totalCollectionsShare || '0').formatEGP(isAr)}</bdi></dd>
              </div>
              <div className={p.metaRow}>
                <dt className={p.metaKey}>{isAr ? 'أرباح مسددة سابقاً' : 'Already Paid Out'}</dt>
                <dd className={p.metaValue}><bdi>{D(currentPartner.totalDistributionsPaid || '0').formatEGP(isAr)}</bdi></dd>
              </div>
              <div className={p.metaRow}>
                <dt className={p.metaKey}>{isAr ? 'صافي الرصيد القائم' : 'Net Due Balance'}</dt>
                <dd className={`${p.metaValue} ${p.metaValueSuccess}`}><bdi>{D(currentPartner.netCurrentBalance || '0').formatEGP(isAr)}</bdi></dd>
              </div>
            </dl>
          )}
        </section>

        {/* Amount & project */}
        <section className={p.section}>
          <h4 className={p.sectionTitle}>{isAr ? 'المبلغ والمشروع' : 'Amount & Project'}</h4>
          <div className={p.fieldGrid}>
            <div className={p.field}>
              <label className={p.label} htmlFor="po-amount">{isAr ? 'مبلغ الدفعة المراد صرفها *' : 'Payout Amount *'}</label>
              <div className={p.affixWrap}>
                <input
                  id="po-amount"
                  type="number"
                  min="1"
                  step="500"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className={`${p.input} ${p.inputLarge} ${p.numeric}`}
                />
                <span className={p.affix}>{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>
            <div className={p.field}>
              <label className={p.label}>{isAr ? 'المشروع المرتبط بالدفعة (اختياري)' : 'Linked Project (Optional)'}</label>
              <ZFCustomSelect<string>
                value={selectedPropertyId}
                onChange={(val) => setSelectedPropertyId(val)}
                items={propertySelectItems}
                placeholderAr="توزيع عام من أرباح الشركة"
                placeholderEn="General company profit distribution"
                isAr={isAr}
                searchable={true}
              />
            </div>
          </div>
        </section>

        {/* Method */}
        <section className={p.section}>
          <div className={p.sectionHeader}>
            <h4 className={p.sectionTitle}>{isAr ? 'طريقة الصرف' : 'Disbursement Method'}</h4>
            <span className={p.pill}>{isAr ? 'المصدر: الخزينة الرئيسية 101000' : 'Source: Main Treasury 101000'}</span>
          </div>
          <div className={p.choiceGrid} role="radiogroup">
            <button
              type="button"
              role="radio"
              aria-checked={paymentMethod === 'CASH_101000'}
              onClick={() => setPaymentMethod('CASH_101000')}
              className={paymentMethod === 'CASH_101000' ? `${p.choice} ${p.choiceSelected}` : p.choice}
            >
              <span className={p.choiceIcon}><Wallet size={16} /></span>
              <span className={p.choiceText}>
                <span className={p.choiceTitle}>{isAr ? 'كاش نقدي باليد' : 'Cash in Hand'}</span>
                <span className={p.choiceDesc}>{isAr ? 'صرف نقدية فعلية من الخزينة الرئيسية' : 'Cash disbursement from main safe'}</span>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={paymentMethod === 'INSTAPAY_102000'}
              onClick={() => setPaymentMethod('INSTAPAY_102000')}
              className={paymentMethod === 'INSTAPAY_102000' ? `${p.choice} ${p.choiceSelected}` : p.choice}
            >
              <span className={p.choiceIcon}><Smartphone size={16} /></span>
              <span className={p.choiceText}>
                <span className={p.choiceTitle}>{isAr ? 'تحويل إنستاباي فوري' : 'Instant InstaPay Transfer'}</span>
                <span className={p.choiceDesc}>{isAr ? 'صرف إلكتروني من الخزينة لحساب الشريك' : 'Digital transfer from treasury'}</span>
              </span>
            </button>
          </div>
        </section>

        {/* Date, reference, memo */}
        <section className={p.section}>
          <h4 className={p.sectionTitle}>{isAr ? 'بيانات القيد' : 'Entry Details'}</h4>
          {isTargetPeriodLocked && targetPeriod && (
            <div className={`${p.notice} ${p.noticeDanger}`} role="alert">
              <AlertTriangle size={16} className={p.noticeIconDanger} />
              <div>
                <p className={p.noticeTitle}>{isAr ? 'الفترة المحاسبية لتاريخ الصرف مقفلة' : 'Fiscal period is locked'}</p>
                <p className={p.noticeBody}>
                  {isAr
                    ? `تاريخ الصرف يقع في الفترة (${targetPeriod.fiscal_year}-M${targetPeriod.period_number}) وهي مقفلة. افتح الفترة أولاً أو غيّر التاريخ.`
                    : `The date falls in period (${targetPeriod.fiscal_year}-M${targetPeriod.period_number}), which is locked. Reopen it or change the date.`}
                </p>
              </div>
            </div>
          )}
          <div className={p.fieldGrid}>
            <div className={p.field}>
              <label className={p.label} htmlFor="po-date">{isAr ? 'تاريخ الصرف والقيد' : 'Disbursement Date'}</label>
              <input
                id="po-date"
                type="date"
                value={payoutDate}
                onChange={(e) => setPayoutDate(e.target.value)}
                className={`${p.input} ${p.numeric}`}
              />
            </div>
            <div className={p.field}>
              <label className={p.label} htmlFor="po-ref">{isAr ? 'رقم الإشعار أو إيصال الصرف' : 'Receipt / Reference Code'}</label>
              <input
                id="po-ref"
                type="text"
                value={receiptRef}
                onChange={(e) => setReceiptRef(e.target.value)}
                className={`${p.input} ${p.numeric}`}
              />
            </div>
            <div className={`${p.field} ${p.fieldFull}`}>
              <label className={p.label} htmlFor="po-memo">{isAr ? 'البيان والملاحظات' : 'Memo / Notes'}</label>
              <input
                id="po-memo"
                type="text"
                placeholder={isAr ? 'مثال: صرف دفعة أرباح مرحلية عن الربع الأول' : 'Optional memo description'}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className={p.input}
              />
            </div>
          </div>
        </section>

        {/* Journal preview */}
        <section className={p.section}>
          <div className={p.sectionHeader}>
            <h4 className={p.sectionTitle}>{isAr ? 'معاينة قيد اليومية' : 'Journal Entry Preview'}</h4>
            <span className={`${p.pill} ${p.pillSuccess}`}>{isAr ? 'متوازن' : 'Balanced'}</span>
          </div>
          <div className={p.tableWrap}>
            <table className={p.table}>
              <thead>
                <tr>
                  <th>{isAr ? 'الحساب' : 'Account'}</th>
                  <th className={p.cellEnd}>{isAr ? 'مدين' : 'Debit'}</th>
                  <th className={p.cellEnd}>{isAr ? 'دائن' : 'Credit'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={p.cellStrong}>
                    <bdi>303000</bdi> · {isAr ? 'توزيعات أرباح ومسحوبات الشركاء' : 'Partner Distributions'}
                  </td>
                  <td className={`${p.cellEnd} ${p.cellStrong}`}><bdi>{D(numAmount).formatEGP(isAr)}</bdi></td>
                  <td className={`${p.cellEnd} ${p.cellMuted}`}><bdi>{D(0).formatEGP(isAr)}</bdi></td>
                </tr>
                <tr>
                  <td className={p.cellStrong}>
                    {paymentMethod === 'BANK_102000'
                      ? <><bdi>102000</bdi> · {isAr ? 'حساب البنك التجاري' : 'Commercial Bank Account'}</>
                      : paymentMethod === 'INSTAPAY_102000'
                      ? <><bdi>101000</bdi> · {isAr ? 'الخزينة الرئيسية (إنستاباي)' : 'Main Treasury (InstaPay)'}</>
                      : <><bdi>101000</bdi> · {isAr ? 'خزينة النقدية الرئيسية (كاش)' : 'Main Cash Safe (Cash)'}</>}
                  </td>
                  <td className={`${p.cellEnd} ${p.cellMuted}`}><bdi>{D(0).formatEGP(isAr)}</bdi></td>
                  <td className={`${p.cellEnd} ${p.cellStrong}`}><bdi>{D(numAmount).formatEGP(isAr)}</bdi></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </form>
    </ZFModalShell>
  );
};
