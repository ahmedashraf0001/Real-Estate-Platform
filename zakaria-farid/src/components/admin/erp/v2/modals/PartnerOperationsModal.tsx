'use client';
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Receipt, 
  Coins, 
  Wallet, 
  Smartphone, 
  FileText, 
  FileSpreadsheet, 
  Printer, 
  Plus,
  Building2,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { PartnerFinancialSummary } from '@/lib/erp/partnersEngine';
import { ERPPartnerTransaction, ERPContract, ERPPartnerProfile } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { exportPartnerDossierExcel } from '@/lib/erp/excelExporter';
import { toast } from 'sonner';
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
import styles from './PartnerOperationsModal.module.css';
import { PRIMARY_DEVELOPER_NAME } from '@/lib/erp/partnersDirectory';

export interface PartnerOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: PartnerFinancialSummary[];
  partnerProfiles?: ERPPartnerProfile[];
  partnerTransactions?: ERPPartnerTransaction[];
  properties?: Property[];
  contracts?: ERPContract[];
  initialPartnerName?: string;
  isAr?: boolean;
  isMutating?: boolean;
  onOpenNewPartnerModal?: () => void;
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
  onConfirmInjection: (details: {
    partnerName: string;
    amount: string;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000';
    propertyId?: string;
    propertyTitle?: string;
    injectionDate: string;
    receiptRef: string;
    memo: string;
  }) => Promise<void>;
}

export const PartnerOperationsModal: React.FC<PartnerOperationsModalProps> = ({
  isOpen,
  onClose,
  partners = [],
  partnerProfiles = [],
  partnerTransactions = [],
  properties = [],
  initialPartnerName,
  isAr = true,
  isMutating = false,
  onOpenNewPartnerModal,
  onConfirmPayout,
  onConfirmInjection
}) => {
  const [selectedPartnerName, setSelectedPartnerName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'owner' | 'equity_partner' | 'land_partner' | 'silent_financier'>('all');
  const [activeTab, setActiveTab] = useState<'payout' | 'injection' | 'statement'>('payout');

  // Payout State
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [payoutMethod, setPayoutMethod] = useState<'CASH_101000' | 'INSTAPAY_102000'>('CASH_101000');
  const [payoutPropertyId, setPayoutPropertyId] = useState<string>('');
  const [payoutDate, setPayoutDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payoutReceiptRef, setPayoutReceiptRef] = useState<string>(`PAY-${Date.now().toString().slice(-6)}`);
  const [payoutMemo, setPayoutMemo] = useState<string>('');
  const [payoutError, setPayoutError] = useState<string>('');

  // Injection State
  const [injectionAmount, setInjectionAmount] = useState<string>('');
  const [injectionMethod, setInjectionMethod] = useState<'CASH_101000' | 'INSTAPAY_102000'>('CASH_101000');
  const [injectionPropertyId, setInjectionPropertyId] = useState<string>('');
  const [injectionDate, setInjectionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [injectionReceiptRef, setInjectionReceiptRef] = useState<string>(`CAP-REC-${Date.now().toString().slice(-6)}`);
  const [injectionMemo, setInjectionMemo] = useState<string>('');
  const [injectionError, setInjectionError] = useState<string>('');

  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (initialPartnerName && partners.some(p => p.partnerName === initialPartnerName)) {
        setSelectedPartnerName(initialPartnerName);
      } else if (partners.length > 0 && (!selectedPartnerName || !partners.some(p => p.partnerName === selectedPartnerName))) {
        setSelectedPartnerName(partners[0].partnerName);
      }
      setPayoutError('');
      setInjectionError('');
      setPayoutReceiptRef(`PAY-${Date.now().toString().slice(-6)}`);
      setInjectionReceiptRef(`CAP-REC-${Date.now().toString().slice(-6)}`);
    }
  }, [isOpen, initialPartnerName, partners, selectedPartnerName]);

  const activePartner = useMemo(() => {
    return partners.find(p => p.partnerName === selectedPartnerName) || partners[0] || null;
  }, [partners, selectedPartnerName]);

  const filteredPartners = useMemo(() => {
    const profileMap = new Map(partnerProfiles.map(p => [p.name, p.role]));
    return partners.filter(p => {
      const isOwner = p.isPermanent || p.partnerName === PRIMARY_DEVELOPER_NAME || p.partnerName.includes('زكريا فريد');
      if (roleFilter !== 'all') {
        if (roleFilter === 'owner') {
          if (!isOwner) return false;
        } else {
          const partnerRole = profileMap.get(p.partnerName);
          if (partnerRole) {
            if (partnerRole !== roleFilter) return false;
          } else {
            if (roleFilter === 'equity_partner' && !p.roleTitleAr.includes('مال')) return false;
            if (roleFilter === 'land_partner' && !p.roleTitleAr.includes('أرض')) return false;
            if (roleFilter === 'silent_financier' && !p.roleTitleAr.includes('صامت')) return false;
          }
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.partnerName || '').toLowerCase().includes(q);
        const matchPhone = (p.phone || '').toLowerCase().includes(q);
        const matchNationalId = (p.national_id || '').toLowerCase().includes(q);
        const matchHoldings = p.holdings.some(h => (h.propertyTitle || '').toLowerCase().includes(q));
        const matchOwnerKeyword = isOwner && (q.includes('مالك') || q.includes('owner') || q.includes('مطور'));
        return matchName || matchPhone || matchNationalId || matchHoldings || matchOwnerKeyword;
      }
      return true;
    }).sort((a, b) => {
      const aIsOwner = a.isPermanent || a.partnerName === PRIMARY_DEVELOPER_NAME || a.partnerName.includes('زكريا فريد');
      const bIsOwner = b.isPermanent || b.partnerName === PRIMARY_DEVELOPER_NAME || b.partnerName.includes('زكريا فريد');
      return (bIsOwner ? 1 : 0) - (aIsOwner ? 1 : 0);
    });
  }, [partners, roleFilter, searchQuery, partnerProfiles]);

  const currentPartnerTransactions = useMemo(() => {
    if (!activePartner) return [];
    return partnerTransactions.filter(t => t.partner_name === activePartner.partnerName);
  }, [partnerTransactions, activePartner]);

  if (!isOpen) return null;

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartner) return;
    const numAmount = parseFloat(payoutAmount) || 0;
    if (numAmount <= 0) {
      setPayoutError(isAr ? 'يرجى إدخال مبلغ صرف صحيح أكبر من الصفر' : 'Please enter a valid payout amount');
      return;
    }

    try {
      const selectedProp = properties.find(p => p.id === payoutPropertyId);
      await onConfirmPayout({
        partnerName: activePartner.partnerName,
        amount: D(numAmount).toFixed(2),
        paymentMethod: payoutMethod,
        propertyId: payoutPropertyId || undefined,
        propertyTitle: selectedProp ? (selectedProp.title_ar || selectedProp.title_en) : undefined,
        payoutDate,
        receiptRef: payoutReceiptRef,
        memo: payoutMemo.trim() || `صرف أرباح للشريك: ${activePartner.partnerName}`
      });
      setPayoutAmount('');
      setPayoutMemo('');
      setPayoutReceiptRef(`PAY-${Date.now().toString().slice(-6)}`);
      setPayoutError('');
      setActiveTab('statement');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPayoutError(msg);
    }
  };

  const handleInjectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartner) return;
    const numAmount = parseFloat(injectionAmount) || 0;
    if (numAmount <= 0) {
      setInjectionError(isAr ? 'يرجى إدخال مبلغ مساهمة صحيح أكبر من الصفر' : 'Please enter a valid capital injection amount');
      return;
    }

    try {
      const selectedProp = properties.find(p => p.id === injectionPropertyId);
      await onConfirmInjection({
        partnerName: activePartner.partnerName,
        amount: D(numAmount).toFixed(2),
        paymentMethod: injectionMethod,
        propertyId: injectionPropertyId || undefined,
        propertyTitle: selectedProp ? (selectedProp.title_ar || selectedProp.title_en) : undefined,
        injectionDate,
        receiptRef: injectionReceiptRef,
        memo: injectionMemo.trim() || `إيداع مساهمة رأس مال جديدة من الشريك: ${activePartner.partnerName}`
      });
      setInjectionAmount('');
      setInjectionMemo('');
      setInjectionReceiptRef(`CAP-REC-${Date.now().toString().slice(-6)}`);
      setInjectionError('');
      setActiveTab('statement');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setInjectionError(msg);
    }
  };

  const handleExportExcel = async () => {
    if (!activePartner) return;
    try {
      setIsExportingExcel(true);
      await exportPartnerDossierExcel(activePartner, currentPartnerTransactions, isAr);
      toast.success(isAr ? 'تم تصدير كشف حساب الشريك بنجاح إلى Excel' : 'Partner dossier exported to Excel');
    } catch {
      toast.error(isAr ? 'فشل تصدير كشف الحساب' : 'Export failed');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const payoutNum = parseFloat(payoutAmount) || 0;
  const injectionNum = parseFloat(injectionAmount) || 0;
  const payoutMoneyFormatted = `${Number(payoutNum).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`;
  const injectionMoneyFormatted = `${Number(injectionNum).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`;

  const selectedPayoutProp = properties.find(p => p.id === payoutPropertyId);
  const selectedInjectionProp = properties.find(p => p.id === injectionPropertyId);

  const footer = (
    <ZFFormFooter>
      <button type="button" className={shellStyles.btnSecondary} onClick={onClose}>
        {isAr ? 'إلغاء' : 'Cancel'}
      </button>

      {activeTab === 'payout' && (
        <button
          type="submit"
          form="zf-partner-ops-payout"
          className={shellStyles.btnPrimary}
          disabled={payoutNum <= 0 || isMutating || !activePartner}
        >
          {isMutating ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'تأكيد الصرف' : 'Confirm payout')}
        </button>
      )}

      {activeTab === 'injection' && (
        <button
          type="submit"
          form="zf-partner-ops-injection"
          className={shellStyles.btnPrimary}
          disabled={injectionNum <= 0 || isMutating || !activePartner}
        >
          {isMutating ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'تأكيد التمويل' : 'Confirm funding')}
        </button>
      )}

      {activeTab === 'statement' && (
        <button type="button" className={shellStyles.btnPrimary} onClick={onClose}>
          {isAr ? 'تم' : 'Done'}
        </button>
      )}
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'عمليات الشركاء' : 'Partner operations'}
      subtitle={
        isAr
          ? 'متابعة أرصدة الشركاء وصرف الأرباح وضخ مساهمات رأس المال.'
          : 'Track partner balances, payouts, and capital contributions.'
      }
      icon={<Users size={18} />}
      isAr={isAr}
      maxWidth="min(1100px, 94vw)"
      footer={footer}
    >
      <div className={styles.grid}>
        {/* SIDE 1: MASTER LIST */}
        <div className={styles.master}>
          <div className={styles.masterHeader}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث باسم الشريك أو المشروع…' : 'Search partners…'}
              className={zfForm.control}
            />

            <div className={styles.filterPills}>
              {[
                { id: 'all', label: isAr ? 'الكل' : 'All' },
                { id: 'owner', label: isAr ? 'المالك' : 'Owner' },
                { id: 'equity_partner', label: isAr ? 'شريك بالمال' : 'Equity' },
                { id: 'land_partner', label: isAr ? 'شريك بالأرض' : 'Land' },
                { id: 'silent_financier', label: isAr ? 'ممول صامت' : 'Silent' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRoleFilter(tab.id as typeof roleFilter)}
                  className={`${styles.filterPill}${roleFilter === tab.id ? ` ${styles.filterPillActive}` : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.masterList}>
            {filteredPartners.length === 0 ? (
              <div className={styles.emptyState}>
                {isAr ? 'لا يوجد شركاء مطابقون' : 'No matching partners'}
              </div>
            ) : (
              filteredPartners.map(p => {
                const isSelected = activePartner?.partnerName === p.partnerName;
                const isNeg = D(p.netCurrentBalance || 0).lt(0);

                return (
                  <button
                    key={p.partnerName}
                    type="button"
                    onClick={() => {
                      setSelectedPartnerName(p.partnerName);
                      setPayoutError('');
                      setInjectionError('');
                    }}
                    className={`${styles.partnerItem}${isSelected ? ` ${styles.partnerItemActive}` : ''}`}
                  >
                    <div className={styles.partnerItemHeader}>
                      <span className={styles.partnerItemName}>{p.partnerName}</span>
                      <span
                        className={`${styles.partnerItemBal}${
                          isNeg ? ` ${styles.partnerItemBalNeg}` : ''
                        }`}
                      >
                        {Number(p.netCurrentBalance).toLocaleString('en-US', { maximumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                      </span>
                    </div>
                    <span className={styles.partnerItemRole}>{p.roleTitleAr}</span>
                  </button>
                );
              })
            )}
          </div>

          {onOpenNewPartnerModal && (
            <div className={styles.masterFooter}>
              <button
                type="button"
                className={`${shellStyles.btnGhost} ${shellStyles.btnSm}`}
                onClick={() => {
                  onClose();
                  onOpenNewPartnerModal();
                }}
              >
                <Plus size={13} />
                <span>{isAr ? 'تسجيل شريك جديد' : 'New partner'}</span>
              </button>
            </div>
          )}
        </div>

        {/* SIDE 2: DETAIL WORKBENCH */}
        <div className={styles.detail}>
          {activePartner ? (
            <>
              {/* Partner Header */}
              <div className={styles.detailHeader}>
                <div>
                  <h4 className={styles.detailTitle}>{activePartner.partnerName}</h4>
                  <div className={styles.detailRole}>
                    {activePartner.roleTitleAr}
                    {activePartner.phone ? ` • ${activePartner.phone}` : ''}
                  </div>
                </div>

                {activePartner.holdings.length > 0 && (
                  <div className={styles.holdingsStrip}>
                    <span className={styles.holdingsLabel}>
                      {isAr ? 'المشاريع:' : 'Projects:'}
                    </span>
                    {activePartner.holdings.map((h, i) => (
                      <span key={i} className={styles.holdingChip}>
                        <Building2 size={12} />
                        <strong>{h.propertyTitle}</strong>
                        <span>({h.sharePct}%)</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Facts Strip */}
              <ZFFacts
                items={[
                  {
                    label: isAr ? 'رأس المال المودع' : 'Contributed capital',
                    value: `${Number(activePartner.totalContributedCapital).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`
                  },
                  {
                    label: isAr ? 'نصيبه من التحصيلات' : 'Collections share',
                    value: `${Number(activePartner.totalCollectionsShare).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`
                  },
                  {
                    label: isAr ? 'أرباح مصروفة' : 'Distributions paid',
                    value: `${Number(activePartner.totalDistributionsPaid).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`
                  },
                  {
                    label: isAr ? 'المتاح للصرف' : 'Available balance',
                    value: `${Number(activePartner.netCurrentBalance).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`,
                    tone: D(activePartner.netCurrentBalance).lt(0) ? 'neg' : D(activePartner.netCurrentBalance).gt(0) ? 'pos' : undefined
                  }
                ]}
              />

              {/* Tabs Switcher */}
              <div className={styles.tabs} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'payout'}
                  onClick={() => setActiveTab('payout')}
                  className={`${styles.tab}${activeTab === 'payout' ? ` ${styles.tabActive}` : ''}`}
                >
                  <Receipt size={15} />
                  <span>{isAr ? 'صرف أرباح' : 'Disburse payout'}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'injection'}
                  onClick={() => setActiveTab('injection')}
                  className={`${styles.tab}${activeTab === 'injection' ? ` ${styles.tabActive}` : ''}`}
                >
                  <Coins size={15} />
                  <span>{isAr ? 'ضخ رأس مال' : 'Inject capital'}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'statement'}
                  onClick={() => setActiveTab('statement')}
                  className={`${styles.tab}${activeTab === 'statement' ? ` ${styles.tabActive}` : ''}`}
                >
                  <FileText size={15} />
                  <span>{isAr ? 'سجل العمليات' : 'Transactions'}</span>
                </button>
              </div>

              {/* TAB 1: PAYOUT */}
              {activeTab === 'payout' && (
                <form id="zf-partner-ops-payout" className={zfForm.form} onSubmit={handlePayoutSubmit}>
                  {payoutError && <ZFEffect tone="danger">{payoutError}</ZFEffect>}

                  {/* Amount with Quick Fills */}
                  <ZFField
                    label={isAr ? 'مبلغ دفعة الأرباح' : 'Payout amount'}
                    required
                    aside={
                      <div className={styles.quickBtns}>
                        <button
                          type="button"
                          className={styles.quickBtn}
                          onClick={() => setPayoutAmount(activePartner.netCurrentBalance)}
                        >
                          {isAr ? 'كامل المستحق' : '100%'}
                        </button>
                        <button
                          type="button"
                          className={styles.quickBtn}
                          onClick={() => setPayoutAmount(D(activePartner.netCurrentBalance).times(0.5).toFixed(2))}
                        >
                          50%
                        </button>
                      </div>
                    }
                  >
                    <ZFMoneyInput
                      value={payoutAmount}
                      onChange={e => setPayoutAmount(e.target.value)}
                      unit={isAr ? 'ج.م' : 'EGP'}
                      placeholder="0.00"
                      required
                    />
                  </ZFField>

                  {/* Payment Method */}
                  <ZFField label={isAr ? 'طريقة الصرف' : 'Payout method'} required>
                    <ZFChoices<'CASH_101000' | 'INSTAPAY_102000'>
                      value={payoutMethod}
                      onChange={setPayoutMethod}
                      options={[
                        {
                          id: 'CASH_101000',
                          label: isAr ? 'نقداً بالخزينة' : 'Cash Safe',
                          sub: isAr ? 'حساب الخزينة (101000)' : 'Safe (101000)',
                          icon: <Wallet size={16} />
                        },
                        {
                          id: 'INSTAPAY_102000',
                          label: isAr ? 'إنستاباي' : 'InstaPay',
                          sub: isAr ? 'حساب إنستاباي (102000)' : 'InstaPay (102000)',
                          icon: <Smartphone size={16} />
                        }
                      ]}
                    />
                  </ZFField>

                  {/* Row: Property, Date, Receipt Ref */}
                  <div className={zfForm.row}>
                    <ZFField label={isAr ? 'المشروع (اختياري)' : 'Project'}>
                      <select
                        className={zfForm.control}
                        value={payoutPropertyId}
                        onChange={e => setPayoutPropertyId(e.target.value)}
                      >
                        <option value="">{isAr ? 'توزيع عام على كامل الأرباح' : 'General portfolio payout'}</option>
                        {properties.map(p => (
                          <option key={p.id} value={p.id}>
                            {isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar)}
                          </option>
                        ))}
                      </select>
                    </ZFField>

                    <ZFField label={isAr ? 'تاريخ الصرف' : 'Date'} required>
                      <input
                        type="date"
                        className={zfForm.control}
                        value={payoutDate}
                        onChange={e => setPayoutDate(e.target.value)}
                        required
                      />
                    </ZFField>
                  </div>

                  <ZFField label={isAr ? 'رقم سند الصرف' : 'Voucher no.'}>
                    <input
                      type="text"
                      className={`${zfForm.control} ${zfForm.mono}`}
                      value={payoutReceiptRef}
                      onChange={e => setPayoutReceiptRef(e.target.value)}
                    />
                  </ZFField>

                  <ZFField label={isAr ? 'البيان وملاحظات القيد' : 'Notes / Memo'}>
                    <input
                      type="text"
                      className={zfForm.control}
                      value={payoutMemo}
                      onChange={e => setPayoutMemo(e.target.value)}
                      placeholder={isAr ? `صرف دفعة أرباح للشريك: ${activePartner.partnerName}` : 'Optional memo…'}
                    />
                  </ZFField>

                  {/* Effect */}
                  {payoutNum > 0 ? (
                    <ZFEffect>
                      {isAr ? (
                        <>
                          سيُصرف <strong>{payoutMoneyFormatted}</strong> لـ <strong>{activePartner.partnerName}</strong> من {payoutMethod === 'CASH_101000' ? 'الخزينة' : 'حساب إنستاباي'}{selectedPayoutProp ? <> لمشروع <strong>{selectedPayoutProp.title_ar || selectedPayoutProp.title_en}</strong></> : null}.
                        </>
                      ) : (
                        <>
                          <strong>{payoutMoneyFormatted}</strong> will be paid to <strong>{activePartner.partnerName}</strong> from {payoutMethod === 'CASH_101000' ? 'Safe' : 'InstaPay'}.
                        </>
                      )}
                    </ZFEffect>
                  ) : (
                    <ZFEffect>
                      {isAr ? 'أدخل المبلغ لمعرفة ما سيُسجل في الأستاذ العام.' : 'Enter an amount to preview the journal entry.'}
                    </ZFEffect>
                  )}

                  {/* Journal Peek */}
                  {payoutNum > 0 && (
                    <ZFJournalPeek
                      isAr={isAr}
                      lines={[
                        {
                          code: '303000',
                          name: isAr ? 'أرباح ومسحوبات الشركاء' : 'Partner Drawings & Dividends',
                          debit: payoutNum
                        },
                        {
                          code: payoutMethod === 'CASH_101000' ? '101000' : '102000',
                          name: isAr ? (payoutMethod === 'CASH_101000' ? 'الخزينة' : 'إنستاباي') : (payoutMethod === 'CASH_101000' ? 'Safe' : 'InstaPay'),
                          credit: payoutNum
                        }
                      ]}
                    />
                  )}
                </form>
              )}

              {/* TAB 2: INJECTION */}
              {activeTab === 'injection' && (
                <form id="zf-partner-ops-injection" className={zfForm.form} onSubmit={handleInjectionSubmit}>
                  {injectionError && <ZFEffect tone="danger">{injectionError}</ZFEffect>}

                  {/* Amount */}
                  <ZFField label={isAr ? 'مبلغ مساهمة رأس المال' : 'Capital injection amount'} required>
                    <ZFMoneyInput
                      value={injectionAmount}
                      onChange={e => setInjectionAmount(e.target.value)}
                      unit={isAr ? 'ج.م' : 'EGP'}
                      placeholder="0.00"
                      required
                    />
                  </ZFField>

                  {/* Payment Method */}
                  <ZFField label={isAr ? 'طريقة الاستلام' : 'Deposit method'} required>
                    <ZFChoices<'CASH_101000' | 'INSTAPAY_102000'>
                      value={injectionMethod}
                      onChange={setInjectionMethod}
                      options={[
                        {
                          id: 'CASH_101000',
                          label: isAr ? 'نقداً بالخزينة' : 'Cash Safe',
                          sub: isAr ? 'حساب الخزينة (101000)' : 'Safe (101000)',
                          icon: <Wallet size={16} />
                        },
                        {
                          id: 'INSTAPAY_102000',
                          label: isAr ? 'إنستاباي' : 'InstaPay',
                          sub: isAr ? 'حساب إنستاباي (102000)' : 'InstaPay (102000)',
                          icon: <Smartphone size={16} />
                        }
                      ]}
                    />
                  </ZFField>

                  {/* Row: Property, Date */}
                  <div className={zfForm.row}>
                    <ZFField label={isAr ? 'المشروع (اختياري)' : 'Project'}>
                      <select
                        className={zfForm.control}
                        value={injectionPropertyId}
                        onChange={e => setInjectionPropertyId(e.target.value)}
                      >
                        <option value="">{isAr ? 'محفظة الشركة العامة' : 'Company general capital'}</option>
                        {properties.map(p => (
                          <option key={p.id} value={p.id}>
                            {isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar)}
                          </option>
                        ))}
                      </select>
                    </ZFField>

                    <ZFField label={isAr ? 'تاريخ التوريد' : 'Date'} required>
                      <input
                        type="date"
                        className={zfForm.control}
                        value={injectionDate}
                        onChange={e => setInjectionDate(e.target.value)}
                        required
                      />
                    </ZFField>
                  </div>

                  <ZFField label={isAr ? 'رقم إيصال التوريد' : 'Receipt no.'}>
                    <input
                      type="text"
                      className={`${zfForm.control} ${zfForm.mono}`}
                      value={injectionReceiptRef}
                      onChange={e => setInjectionReceiptRef(e.target.value)}
                    />
                  </ZFField>

                  <ZFField label={isAr ? 'البيان وملاحظات القيد' : 'Notes / Memo'}>
                    <input
                      type="text"
                      className={zfForm.control}
                      value={injectionMemo}
                      onChange={e => setInjectionMemo(e.target.value)}
                      placeholder={isAr ? `إيداع مساهمة رأس مال جديدة من الشريك: ${activePartner.partnerName}` : 'Optional memo…'}
                    />
                  </ZFField>

                  {/* Effect */}
                  {injectionNum > 0 ? (
                    <ZFEffect>
                      {isAr ? (
                        <>
                          سيُضاف <strong>{injectionMoneyFormatted}</strong> إلى {injectionMethod === 'CASH_101000' ? 'الخزينة' : 'حساب إنستاباي'} ويُسجل كمساهمة لـ <strong>{activePartner.partnerName}</strong>{selectedInjectionProp ? <> في <strong>{selectedInjectionProp.title_ar || selectedInjectionProp.title_en}</strong></> : null}.
                        </>
                      ) : (
                        <>
                          <strong>{injectionMoneyFormatted}</strong> will be deposited to {injectionMethod === 'CASH_101000' ? 'Safe' : 'InstaPay'} for <strong>{activePartner.partnerName}</strong>.
                        </>
                      )}
                    </ZFEffect>
                  ) : (
                    <ZFEffect>
                      {isAr ? 'أدخل المبلغ لمعرفة ما سيُسجل في الأستاذ العام.' : 'Enter an amount to preview the journal entry.'}
                    </ZFEffect>
                  )}

                  {/* Journal Peek */}
                  {injectionNum > 0 && (
                    <ZFJournalPeek
                      isAr={isAr}
                      lines={[
                        {
                          code: injectionMethod === 'CASH_101000' ? '101000' : '102000',
                          name: isAr ? (injectionMethod === 'CASH_101000' ? 'الخزينة' : 'إنستاباي') : (injectionMethod === 'CASH_101000' ? 'Safe' : 'InstaPay'),
                          debit: injectionNum
                        },
                        {
                          code: '301000',
                          name: isAr ? `رأس مال الشركاء - ${activePartner.partnerName}` : `Partner Capital - ${activePartner.partnerName}`,
                          credit: injectionNum
                        }
                      ]}
                    />
                  )}
                </form>
              )}

              {/* TAB 3: STATEMENT */}
              {activeTab === 'statement' && (
                <div className={zfForm.section}>
                  <div className={styles.statementHeader}>
                    <h4 className={zfForm.sectionTitle}>
                      {isAr ? 'سجل العمليات والتحويلات المالية' : 'Transaction history'}
                    </h4>
                    <div className={styles.statementActions}>
                      <button
                        type="button"
                        className={`${shellStyles.btnSecondary} ${shellStyles.btnSm}`}
                        onClick={handleExportExcel}
                        disabled={isExportingExcel}
                      >
                        <FileSpreadsheet size={13} />
                        <span>{isExportingExcel ? (isAr ? 'جارٍ التصدير…' : 'Exporting…') : 'Excel'}</span>
                      </button>
                      <button
                        type="button"
                        className={`${shellStyles.btnSecondary} ${shellStyles.btnSm}`}
                        onClick={() => window.print()}
                      >
                        <Printer size={13} />
                        <span>{isAr ? 'طباعة' : 'Print'}</span>
                      </button>
                    </div>
                  </div>

                  {currentPartnerTransactions.length === 0 ? (
                    <div className={styles.emptyState}>
                      {isAr ? 'لا توجد حركات مسجلة لهذا الشريك' : 'No transactions recorded'}
                    </div>
                  ) : (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>{isAr ? 'رقم الحركة' : 'Ref'}</th>
                            <th>{isAr ? 'التاريخ' : 'Date'}</th>
                            <th>{isAr ? 'النوع' : 'Type'}</th>
                            <th className={styles.cellNum}>{isAr ? 'المبلغ' : 'Amount'}</th>
                            <th>{isAr ? 'طريقة السداد' : 'Method'}</th>
                            <th>{isAr ? 'البيان' : 'Memo'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentPartnerTransactions.map(tx => {
                            const isInjection = tx.type === 'CAPITAL_INJECTION';
                            return (
                              <tr key={tx.id}>
                                <td><code>{tx.transaction_number}</code></td>
                                <td>{tx.date}</td>
                                <td>
                                  {isInjection ? (
                                    <span className={`${shellStyles.statusPill} ${shellStyles.statusPillGreen}`}>
                                      <ArrowDownLeft size={11} />
                                      {isAr ? 'ضخ رأس مال' : 'Injection'}
                                    </span>
                                  ) : (
                                    <span className={`${shellStyles.statusPill} ${shellStyles.statusPillAmber}`}>
                                      <ArrowUpRight size={11} />
                                      {isAr ? 'صرف أرباح' : 'Payout'}
                                    </span>
                                  )}
                                </td>
                                <td className={styles.cellNum}>
                                  <strong>{D(tx.amount).formatEGP(isAr)}</strong>
                                </td>
                                <td>
                                  {tx.payment_method === 'CASH_101000'
                                    ? (isAr ? 'خزينة نقداً' : 'Cash')
                                    : (isAr ? 'إنستاباي' : 'InstaPay')}
                                </td>
                                <td>{tx.memo || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              {isAr ? 'اختر شريكاً لبدء العمليات' : 'Select a partner to begin'}
            </div>
          )}
        </div>
      </div>
    </ZFModalShell>
  );
};
