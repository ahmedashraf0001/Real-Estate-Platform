'use client';
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity */

import React, { useState, useEffect, useMemo } from 'react';
import {
  HandCoins,
  Wallet,
  Smartphone,
  Plus,
  Scale,
  ShieldCheck
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import { PartnerFinancialSummary } from '@/lib/erp/partnersEngine';
import { Property } from '@/lib/supabase/types';
import { ERPPartnerTransaction, ERPAccountingPeriod, ERPPartnerCommitment } from '@/lib/erp/types';
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
  ZFFormDone,
  zfForm
} from '../common/ZFForm';
import shellStyles from '../ZFWorkstationShell.module.css';
import { PRIMARY_DEVELOPER_NAME } from '@/lib/erp/partnersDirectory';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { ZFPrintDocumentLayout } from '../common/ZFPrintDocumentLayout';
import styles from './PartnerCapitalInjectionModal.module.css';

interface PartnerCapitalInjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: PartnerFinancialSummary[];
  initialPartnerName?: string;
  initialPropertyId?: string;
  initialCommitmentId?: string;
  partnerCommitments?: ERPPartnerCommitment[];
  properties?: Property[];
  transactions?: ERPPartnerTransaction[];
  activePeriod?: ERPAccountingPeriod;
  periods?: ERPAccountingPeriod[];
  isAr?: boolean;
  isMutating?: boolean;
  onOpenNewPartnerModal?: () => void;
  onConfirmInjection: (details: {
    partnerName: string;
    amount: string;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000';
    propertyId?: string;
    propertyTitle?: string;
    commitmentId?: string;
    injectionDate: string;
    receiptRef: string;
    memo: string;
  }) => Promise<void>;
}

export const PartnerCapitalInjectionModal: React.FC<PartnerCapitalInjectionModalProps> = ({
  isOpen,
  onClose,
  partners,
  initialPartnerName,
  initialPropertyId,
  initialCommitmentId,
  partnerCommitments = [],
  properties = [],
  activePeriod,
  periods,
  isAr = true,
  isMutating = false,
  onOpenNewPartnerModal,
  onConfirmInjection
}) => {
  const isLockedToPartner = Boolean(initialPartnerName && initialPartnerName.trim());
  const [selectedPartnerName, setSelectedPartnerName] = useState<string>(initialPartnerName?.trim() || (partners[0]?.partnerName || ''));
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string>(initialCommitmentId || '');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000'>('CASH_101000');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropertyId || '');
  const [injectionDate, setInjectionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receiptRef, setReceiptRef] = useState<string>(`CAP-REC-${Date.now().toString().slice(-6)}`);
  const [memo, setMemo] = useState<string>('');

  useEffect(() => {
    if (initialPropertyId) {
      setSelectedPropertyId(initialPropertyId);
    }
  }, [initialPropertyId]);

  useEffect(() => {
    if (initialCommitmentId) {
      setSelectedCommitmentId(initialCommitmentId);
    }
  }, [initialCommitmentId]);

  // Confirmation voucher state for print preview modal
  const [confirmedVoucher, setConfirmedVoucher] = useState<{
    voucherCode: string;
    partnerName: string;
    nationalId?: string;
    phone?: string;
    propertyTitle: string;
    commitmentMilestone?: string;
    amount: string;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000';
    date: string;
    memo: string;
  } | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);

  useEffect(() => {
    if (initialPartnerName && initialPartnerName.trim()) {
      setSelectedPartnerName(initialPartnerName.trim());
    } else if (partners.length > 0 && !selectedPartnerName) {
      setSelectedPartnerName(partners[0].partnerName);
    }
  }, [partners, selectedPartnerName, initialPartnerName]);

  // Restrict properties to buildings only (Building-Only Scope)
  const buildingProperties = useMemo(() => {
    return properties.filter(p => p.type === 'building');
  }, [properties]);

  const effectivePartnerName = (isLockedToPartner ? initialPartnerName!.trim() : selectedPartnerName) || '';
  const selectedBuilding = buildingProperties.find(p => p.id === selectedPropertyId);
  const matchedExistingPartner = partners.find(p => p.partnerName === effectivePartnerName);

  // Active/open partner commitments available for linking
  const candidateCommitments = useMemo(() => {
    if (!partnerCommitments || partnerCommitments.length === 0) return [];
    return partnerCommitments.filter(c => {
      if (c.status === 'CANCELLED' || c.status === 'PAID') return false;
      const unpaid = D(c.committed_amount || 0).minus(c.paid_amount || 0);
      if (unpaid.lte(0)) return false;

      // Filter by selected partner if set
      if (effectivePartnerName && c.partner_name !== effectivePartnerName) return false;

      // Filter by selected property if set
      if (selectedPropertyId && c.property_id !== selectedPropertyId) return false;

      return true;
    });
  }, [partnerCommitments, effectivePartnerName, selectedPropertyId]);

  const selectedCommitment = useMemo(() => {
    if (!selectedCommitmentId) return null;
    return partnerCommitments.find(c => c.commitment_id === selectedCommitmentId) || null;
  }, [selectedCommitmentId, partnerCommitments]);

  const handleCommitmentChange = (commId: string) => {
    setSelectedCommitmentId(commId);
    if (!commId) return;
    const targetCommitment = partnerCommitments.find(c => c.commitment_id === commId);
    if (targetCommitment) {
      if (!isLockedToPartner && targetCommitment.partner_name) {
        setSelectedPartnerName(targetCommitment.partner_name);
      }
      if (targetCommitment.property_id) {
        setSelectedPropertyId(targetCommitment.property_id);
      }
      const unpaid = D(targetCommitment.committed_amount || 0).minus(targetCommitment.paid_amount || 0);
      if (unpaid.gt(0)) {
        setAmount(unpaid.toFixed(2));
      }
      setMemo(isAr 
        ? `سداد طلب مساهمة مرحلية: ${targetCommitment.milestone_name} (${targetCommitment.partner_name})`
        : `Milestone contribution payment: ${targetCommitment.milestone_name} (${targetCommitment.partner_name})`
      );
    }
  };

  useEffect(() => {
    if (initialCommitmentId && partnerCommitments.length > 0) {
      const targetCommitment = partnerCommitments.find(c => c.commitment_id === initialCommitmentId);
      if (targetCommitment) {
        setSelectedCommitmentId(targetCommitment.commitment_id);
        if (!selectedPartnerName && targetCommitment.partner_name) {
          setSelectedPartnerName(targetCommitment.partner_name);
        }
        if (targetCommitment.property_id) {
          setSelectedPropertyId(targetCommitment.property_id);
        }
        const unpaid = D(targetCommitment.committed_amount || 0).minus(targetCommitment.paid_amount || 0);
        if (unpaid.gt(0)) {
          setAmount(unpaid.toFixed(2));
        }
        setMemo(isAr 
          ? `سداد طلب مساهمة مرحلية: ${targetCommitment.milestone_name} (${targetCommitment.partner_name})`
          : `Milestone contribution payment: ${targetCommitment.milestone_name} (${targetCommitment.partner_name})`
        );
      }
    }
  }, [initialCommitmentId, partnerCommitments, isAr, selectedPartnerName]);

  const targetPeriod = useMemo(() => {
    return resolvePeriodForDate(injectionDate, periods || (activePeriod ? [activePeriod] : []), activePeriod);
  }, [injectionDate, periods, activePeriod]);
  const isTargetPeriodLocked = targetPeriod ? targetPeriod.status !== 'OPEN' : false;

  const numAmount = parseFloat(amount) || 0;
  const isCash = paymentMethod === 'CASH_101000';
  const selectedAccountCode = isCash ? '101000' : '102000';
  const isValid = effectivePartnerName.length > 0 && numAmount > 0 && !isTargetPeriodLocked;

  const moneyFormatted = `${Number(numAmount).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`;

  const handleCloseEntirely = () => {
    setShowPrintPreview(false);
    setConfirmedVoucher(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isMutating || isTargetPeriodLocked) return;

    const voucherCode = receiptRef.startsWith('CAP-REC-') ? receiptRef : `CAP-REC-${Date.now().toString().slice(-4)}`;
    const propertyTitle = selectedBuilding 
      ? (selectedBuilding.title_ar || selectedBuilding.title_en) 
      : (isAr ? 'محفظة المشروعات العامة' : 'General Projects Portfolio');

    await onConfirmInjection({
      partnerName: effectivePartnerName,
      amount: D(numAmount).toFixed(2),
      paymentMethod,
      propertyId: selectedPropertyId || undefined,
      propertyTitle: selectedBuilding ? (selectedBuilding.title_ar || selectedBuilding.title_en) : undefined,
      commitmentId: selectedCommitmentId || undefined,
      injectionDate,
      receiptRef: voucherCode,
      memo: memo || (selectedCommitment 
        ? `سداد طلب مساهمة: ${selectedCommitment.milestone_name}` 
        : `إيداع مساهمة رأس مال جديدة من الشريك: ${effectivePartnerName}`)
    });

    setConfirmedVoucher({
      voucherCode,
      partnerName: effectivePartnerName,
      nationalId: matchedExistingPartner?.national_id,
      phone: matchedExistingPartner?.phone,
      propertyTitle,
      commitmentMilestone: selectedCommitment?.milestone_name,
      amount: D(numAmount).toFixed(2),
      paymentMethod,
      date: injectionDate,
      memo: memo || `إيداع مساهمة رأس مال جديدة من الشريك: ${effectivePartnerName}`
    });
  };

  // Printable Official Capital Injection Voucher Content
  const printableVoucherBody = confirmedVoucher && (
    <div className={styles.voucherContainer} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Voucher Header Banner */}
      <div className={styles.voucherHeaderBanner}>
        <div>
          <div className={styles.voucherBadgeRow}>
            <span className={styles.voucherBadge}>
              {isAr ? 'سند توريد رسمي معتمد' : 'OFFICIAL VOUCHER'}
            </span>
            <span className={styles.voucherCodeText}>
              #{confirmedVoucher.voucherCode}
            </span>
          </div>
          <h2 className={styles.voucherTitle}>
            {isAr ? 'سند توريد وقبض مساهمة رأس مال' : 'Capital Contribution Supply Voucher'}
          </h2>
          <p className={styles.voucherSubtitle}>
            {isAr 
              ? 'مؤسسة زكريا فريد للاستثمار والتطوير العقاري • إدارة الشراكات والمساهمات الرأسمالية' 
              : 'Zakaria Farid Real Estate • Equity & Capital Management'}
          </p>
        </div>

        <div className={styles.voucherDateBlock}>
          <div className={styles.voucherDateLabel}>{isAr ? 'تاريخ التوريد:' : 'Date:'}</div>
          <div className={styles.voucherDateVal}>{confirmedVoucher.date}</div>
          <div className={styles.voucherPostedBadge}>
            {isAr ? '✓ قيد مرحل بالأستاذ العام' : '✓ Posted to General Ledger'}
          </div>
        </div>
      </div>

      {/* Amount Showcase Box */}
      <div className={styles.amountShowcaseBox}>
        <div>
          <span className={styles.amountLabel}>
            {isAr ? 'المبلغ المورد والمقيد في حساب رأس المال:' : 'Injected Capital Amount:'}
          </span>
          <div className={styles.amountValue}>
            {D(confirmedVoucher.amount).formatEGP(isAr)}
          </div>
          <div className={styles.amountTafqeet}>
            {isAr ? `فقط وقدره: ${tafqeetEGP(confirmedVoucher.amount)} لا غير` : tafqeetEGP(confirmedVoucher.amount)}
          </div>
        </div>

        <div className={styles.voucherDateBlock}>
          <span className={styles.shieldBadge}>
            <ShieldCheck size={16} color="#10b981" />
            <span>{isAr ? 'معتمد ومحمي' : 'Audited & Verified'}</span>
          </span>
        </div>
      </div>

      {/* Attributes Grid */}
      <div className={styles.attributesGrid}>
        <div>
          <span className={styles.attrLabel}>
            {isAr ? 'الشريك المساهم / المورد:' : 'Contributing Partner:'}
          </span>
          <strong className={styles.attrStrong}>
            {confirmedVoucher.partnerName}
          </strong>
          {confirmedVoucher.nationalId && (
            <span className={styles.attrSub}>
              {isAr ? `رقم قومي: ${confirmedVoucher.nationalId}` : `ID: ${confirmedVoucher.nationalId}`}
            </span>
          )}
          {confirmedVoucher.phone && (
            <span className={styles.attrSub}>
              {isAr ? `هاتف: ${confirmedVoucher.phone}` : `Phone: ${confirmedVoucher.phone}`}
            </span>
          )}
        </div>

        <div>
          <span className={styles.attrLabel}>
            {isAr ? 'مشروع العمارة المخصص له التمويل:' : 'Allocated Building Project:'}
          </span>
          <strong className={styles.attrAccent}>
            {confirmedVoucher.propertyTitle}
          </strong>
          <span className={styles.attrSub}>
            {isAr ? 'حساب الاستثمار وتطوير البناء' : 'Building Capital Asset Account'}
          </span>
        </div>

        <div>
          <span className={styles.attrLabel}>
            {isAr ? 'الخزينة أو الحساب المستلم:' : 'Receiving Treasury / Account:'}
          </span>
          <strong className={styles.attrGreen}>
            {confirmedVoucher.paymentMethod === 'CASH_101000'
              ? (isAr ? 'الخزينة (101000)' : 'Safe (101000)')
              : (isAr ? 'إنستاباي (102000)' : 'InstaPay (102000)')}
          </strong>
        </div>

        <div>
          <span className={styles.attrLabel}>
            {isAr ? 'البيان والميمو المحاسبي:' : 'Journal Memo:'}
          </span>
          <div className={styles.attrMemo}>
            {confirmedVoucher.memo}
          </div>
          {confirmedVoucher.commitmentMilestone && (
            <div className={styles.attrMilestone}>
              {isAr ? `✓ مرتبط بطلب مساهمة إنشائي: ${confirmedVoucher.commitmentMilestone}` : `✓ Linked to milestone call: ${confirmedVoucher.commitmentMilestone}`}
            </div>
          )}
        </div>
      </div>

      {/* Double-Entry Journal Audit Ribbon */}
      <div className={styles.journalRibbon}>
        <div className={styles.journalRibbonTitle}>
          <Scale size={16} color="var(--erp-accent)" />
          <span>{isAr ? 'شريط القيد المحاسبي المزدوج المعتمد:' : 'Balanced GL Journal Entry Ribbon:'}</span>
        </div>

        <div className={styles.journalRibbonRowDr}>
          <span>
            {confirmedVoucher.paymentMethod === 'CASH_101000'
              ? (isAr ? 'من حـ/ 101000 (الخزينة)' : 'Dr 101000 Safe')
              : (isAr ? 'من حـ/ 102000 (إنستاباي)' : 'Dr 102000 InstaPay')}
          </span>
          <span>{D(confirmedVoucher.amount).formatEGP(true)} ({isAr ? 'مدين' : 'Debit'})</span>
        </div>

        <div className={styles.journalRibbonRowCr}>
          <span>
            {isAr 
              ? `إلى حـ/ 301000 (رأس مال الشريك - ${confirmedVoucher.partnerName})` 
              : `Cr 301000 Partner Capital (${confirmedVoucher.partnerName})`}
          </span>
          <span>{D(confirmedVoucher.amount).formatEGP(true)} ({isAr ? 'دائن' : 'Credit'})</span>
        </div>
      </div>

      {/* Official Signatures & Seal Section */}
      <div className={styles.signaturesGrid}>
        <div className={styles.sigCol}>
          <span className={styles.sigLabel}>
            {isAr ? 'توقيع الشريك المورد' : 'Contributing Partner Signature'}
          </span>
          <div className={styles.sigLine}>
            {confirmedVoucher.partnerName}
          </div>
        </div>

        <div className={styles.sigCol}>
          <span className={styles.sigLabel}>
            {isAr ? 'توقيع أمين الخزينة / المحاسب' : 'Cashier / Accountant Signature'}
          </span>
          <div className={styles.sigLine}>
            {isAr ? 'أمين الخزينة المعتمد' : 'Chief Accountant'}
          </div>
        </div>

        <div className={styles.sigCol}>
          <span className={styles.stampLabel}>
            {isAr ? 'ختم واعتماد الإدارة المالية' : 'Official Financial Stamp'}
          </span>
          <div className={styles.stampCircle}>
            {isAr ? 'مؤسسة زكريا فريد\nمعتمد مالياً' : 'ZF ERP\nVERIFIED'}
          </div>
        </div>
      </div>
    </div>
  );

  const footer = confirmedVoucher ? (
    <ZFFormFooter>
      <button
        type="button"
        className={shellStyles.btnSecondary}
        onClick={() => setShowPrintPreview(true)}
      >
        {isAr ? 'طباعة الإيصال' : 'Print receipt'}
      </button>
      <button
        type="button"
        className={shellStyles.btnPrimary}
        onClick={handleCloseEntirely}
      >
        {isAr ? 'إغلاق' : 'Close'}
      </button>
    </ZFFormFooter>
  ) : (
    <ZFFormFooter>
      <button type="button" className={shellStyles.btnSecondary} onClick={onClose}>
        {isAr ? 'إلغاء' : 'Cancel'}
      </button>
      <button
        type="submit"
        form="zf-injection-form"
        className={shellStyles.btnPrimary}
        disabled={!isValid || isMutating || isTargetPeriodLocked}
      >
        {isMutating ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'تأكيد التمويل' : 'Confirm funding')}
      </button>
    </ZFFormFooter>
  );

  return (
    <>
      <ZFModalShell
        isOpen={isOpen}
        onClose={onClose}
        title={isAr ? 'تمويل من شريك' : 'Partner funding'}
        subtitle={
          isAr
            ? 'إيداع مبلغ من شريك في رأس مال الشركة أو في مشروع محدد.'
            : 'Record money a partner puts into the company or a specific project.'
        }
        icon={<HandCoins size={18} />}
        isAr={isAr}
        maxWidth="640px"
        footer={footer}
      >
        {confirmedVoucher ? (
          <ZFFormDone
            title={isAr ? 'تم تسجيل التمويل' : 'Funding recorded'}
            text={`${Number(confirmedVoucher.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'} — ${confirmedVoucher.partnerName}`}
          />
        ) : (
          <form id="zf-injection-form" className={zfForm.form} onSubmit={handleSubmit}>
            {/* 1. Partner */}
            <ZFField
              label={isAr ? 'الشريك' : 'Partner'}
              required
              aside={
                onOpenNewPartnerModal ? (
                  <button
                    type="button"
                    className={`${shellStyles.btnGhost} ${shellStyles.btnSm}`}
                    onClick={onOpenNewPartnerModal}
                  >
                    <Plus size={13} />
                    {isAr ? 'شريك جديد' : 'New partner'}
                  </button>
                ) : undefined
              }
            >
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
            {matchedExistingPartner && (
              <ZFFacts
                items={[
                  {
                    label: isAr ? 'رأس المال المودع' : 'Capital paid in',
                    value: `${Number(matchedExistingPartner.totalContributedCapital).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`
                  },
                  {
                    label: isAr ? 'أرباح مصروفة' : 'Payouts made',
                    value: `${Number(matchedExistingPartner.totalDistributionsPaid).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`
                  },
                  {
                    label: isAr ? 'الرصيد الحالي' : 'Current balance',
                    value: `${Number(matchedExistingPartner.netCurrentBalance).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`,
                    tone: D(matchedExistingPartner.netCurrentBalance).lt(0) ? 'neg' : D(matchedExistingPartner.netCurrentBalance).gt(0) ? 'pos' : undefined
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
                  value={injectionDate}
                  onChange={e => setInjectionDate(e.target.value)}
                  required
                />
              </ZFField>
            </div>

            {/* 4. Project */}
            <ZFField
              label={isAr ? 'المشروع' : 'Project'}
              hint={isAr ? 'اختر مشروعاً إذا كان التمويل لعمارة بعينها.' : 'Pick a project if the money is for a specific building.'}
            >
              <select
                className={zfForm.control}
                value={selectedPropertyId}
                onChange={e => setSelectedPropertyId(e.target.value)}
              >
                <option value="">{isAr ? 'رأس مال الشركة العام' : 'General company capital'}</option>
                {buildingProperties.map(p => (
                  <option key={p.id} value={p.id}>
                    {isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar)}
                  </option>
                ))}
              </select>
            </ZFField>

            {/* 5. Linked Commitment */}
            {candidateCommitments.length > 0 && (
              <ZFField label={isAr ? 'الالتزام المرتبط' : 'Linked commitment'}>
                <select
                  className={zfForm.control}
                  value={selectedCommitmentId}
                  onChange={e => handleCommitmentChange(e.target.value)}
                >
                  <option value="">{isAr ? 'بدون' : 'None'}</option>
                  {candidateCommitments.map(c => {
                    const unpaid = D(c.committed_amount || 0).minus(c.paid_amount || 0);
                    const unpaidFormatted = Number(unpaid.toNumber()).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP');
                    return (
                      <option key={c.commitment_id} value={c.commitment_id}>
                        {`${c.milestone_name} • ${isAr ? 'متبقي: ' : 'Due: '}${unpaidFormatted}`}
                      </option>
                    );
                  })}
                </select>
              </ZFField>
            )}

            {/* 6. Payment method */}
            <ZFField label={isAr ? 'طريقة الاستلام' : 'Received by'}>
              <ZFChoices<'CASH_101000' | 'INSTAPAY_102000'>
                value={paymentMethod === 'BANK_102000' ? 'CASH_101000' : paymentMethod}
                onChange={setPaymentMethod}
                options={[
                  {
                    id: 'CASH_101000',
                    label: isAr ? 'نقداً' : 'Cash',
                    sub: isAr ? 'يدخل الخزينة' : 'Into the safe',
                    icon: <Wallet size={16} />
                  },
                  {
                    id: 'INSTAPAY_102000',
                    label: isAr ? 'إنستاباي' : 'InstaPay',
                    sub: isAr ? 'يدخل حساب إنستاباي' : 'Into InstaPay',
                    icon: <Smartphone size={16} />
                  }
                ]}
              />
            </ZFField>

            {/* 7. Row: Receipt Ref & Notes */}
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

            {/* 8. Effect */}
            {isTargetPeriodLocked ? (
              <ZFEffect tone="danger">
                {isAr
                  ? 'الفترة المحاسبية لهذا التاريخ مقفلة. اختر تاريخاً آخر.'
                  : 'The accounting period for this date is closed. Pick another date.'}
              </ZFEffect>
            ) : numAmount > 0 ? (
              <ZFEffect>
                {isAr ? (
                  <>
                    سيُضاف <strong>{moneyFormatted}</strong> إلى {paymentMethod === 'CASH_101000' ? 'الخزينة' : 'حساب إنستاباي'} ويُسجل كمساهمة لـ <strong>{effectivePartnerName}</strong>{selectedBuilding ? <> في <strong>{selectedBuilding.title_ar || selectedBuilding.title_en}</strong></> : null}.
                  </>
                ) : (
                  <>
                    <strong>{moneyFormatted}</strong> goes into {paymentMethod === 'CASH_101000' ? 'the safe' : 'InstaPay'} and is recorded as <strong>{effectivePartnerName}</strong>&apos;s contribution{selectedBuilding ? <> to <strong>{selectedBuilding.title_en || selectedBuilding.title_ar}</strong></> : null}.
                  </>
                )}
              </ZFEffect>
            ) : (
              <ZFEffect>
                {isAr ? 'أدخل المبلغ لمعرفة ما سيُسجل.' : 'Enter an amount to see what will be recorded.'}
              </ZFEffect>
            )}

            {/* 9. Journal peek */}
            {numAmount > 0 && (
              <ZFJournalPeek
                isAr={isAr}
                lines={[
                  {
                    code: selectedAccountCode,
                    name: isAr ? (selectedAccountCode === '101000' ? 'الخزينة' : 'إنستاباي') : (selectedAccountCode === '101000' ? 'Safe' : 'InstaPay'),
                    debit: numAmount
                  },
                  {
                    code: '301000',
                    name: isAr ? `رأس مال الشركاء - ${effectivePartnerName || 'الشريك'}` : `Partner Capital - ${effectivePartnerName || 'Partner'}`,
                    credit: numAmount
                  }
                ]}
              />
            )}
          </form>
        )}
      </ZFModalShell>

      {/* MODAL PRINT PREVIEW OVERLAY */}
      {showPrintPreview && confirmedVoucher && (
        <div 
          className={styles.printOverlay}
          onClick={handleCloseEntirely}
        >
          <div 
            className={styles.printCard}
            onClick={e => e.stopPropagation()}
          >
            <ZFPrintDocumentLayout
              documentTitle={isAr ? 'سند توريد وقبض مساهمة رأس مال' : 'Capital Contribution Supply Voucher'}
              documentSubtitle={isAr 
                ? `مشروع: ${confirmedVoucher.propertyTitle} • الشريك: ${confirmedVoucher.partnerName}` 
                : `Project: ${confirmedVoucher.propertyTitle} • Partner: ${confirmedVoucher.partnerName}`}
              voucherCode={confirmedVoucher.voucherCode}
              date={confirmedVoucher.date}
              onClose={handleCloseEntirely}
              isAr={isAr}
            >
              {printableVoucherBody}
            </ZFPrintDocumentLayout>
          </div>
        </div>
      )}

      {/* HIDDEN PRINT-ONLY CONTAINER */}
      {confirmedVoucher && (
        <div className="zf-print-only">
          <ZFPrintDocumentLayout
            documentTitle={isAr ? 'سند توريد وقبض مساهمة رأس مال' : 'Capital Contribution Supply Voucher'}
            documentSubtitle={isAr 
              ? `مشروع: ${confirmedVoucher.propertyTitle} • الشريك: ${confirmedVoucher.partnerName}` 
              : `Project: ${confirmedVoucher.propertyTitle} • Partner: ${confirmedVoucher.partnerName}`}
            voucherCode={confirmedVoucher.voucherCode}
            date={confirmedVoucher.date}
            isAr={isAr}
          >
            {printableVoucherBody}
          </ZFPrintDocumentLayout>
        </div>
      )}
    </>
  );
};
