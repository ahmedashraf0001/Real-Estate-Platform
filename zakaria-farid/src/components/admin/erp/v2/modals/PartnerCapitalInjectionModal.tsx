'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  Wallet, 
  Landmark, 
  ShieldCheck, 
  Calendar, 
  FileText, 
  User, 
  Users, 
  Building2, 
  Scale, 
  PlusCircle, 
  Coins, 
  Phone, 
  CreditCard, 
  Percent, 
  Crown,
  Printer,
  AlertTriangle,
  Sparkles,
  Check,
  Target,
  Loader2
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import { 
  PartnerFinancialSummary, 
  computeDynamicBuildingCapital,
  INITIAL_PARTNER_TRANSACTIONS 
} from '@/lib/erp/partnersEngine';
import { Property } from '@/lib/supabase/types';
import { ERPPartnerTransaction, ERPAccountingPeriod, ERPPartnerCommitment } from '@/lib/erp/types';
import { resolvePeriodForDate } from '@/lib/erp/ledger';
import { ZFCustomSelect, ZFCustomSelectItem } from '../common/ZFCustomSelect';
import { ZFModalShell } from '../common/ZFModalShell';
import p from '../common/ZFModalPrimitives.module.css';
import { localizeBuyerName } from '@/components/erp/JournalEntryPreview';
import { PRIMARY_DEVELOPER_NAME } from '@/lib/erp/partnersDirectory';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { ZFPrintDocumentLayout } from '../common/ZFPrintDocumentLayout';

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
  transactions = INITIAL_PARTNER_TRANSACTIONS,
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

  const partnerSelectItems = useMemo<ZFCustomSelectItem<string>[]>(() => {
    return partners.map(p => {
      const balanceNum = D(p.netCurrentBalance).toNumber();
      const isOwner = p.isPermanent || p.partnerName === PRIMARY_DEVELOPER_NAME || p.partnerName.includes('زكريا فريد');
      return {
        value: p.partnerName,
        labelAr: isOwner ? `${p.partnerName} (المالك والمطور الرئيسي)` : p.partnerName,
        labelEn: isOwner ? `${p.partnerName} (Owner & Primary Developer)` : p.partnerName,
        sublabelAr: isOwner ? `مالك المنظومة • مساهمات سابقة: ${D(p.totalContributedCapital || 0).formatEGP(true)}` : `${p.roleTitleAr} • مساهمات سابقة: ${D(p.totalContributedCapital || 0).formatEGP(true)}`,
        sublabelEn: isOwner ? `System Owner • Capital: ${D(p.totalContributedCapital || 0).formatEGP(false)}` : `${p.roleTitleAr} • Capital: ${D(p.totalContributedCapital || 0).formatEGP(false)}`,
        price: balanceNum,
        badge: isOwner ? (isAr ? 'المالك' : 'Owner') : p.roleTitleAr,
        badgeBg: '#ffffff',
        badgeTextColor: '#475569',
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
        labelAr: isAr ? 'رأس مال عام لمحفظة الشركة' : 'General Portfolio Capital',
        labelEn: 'General Portfolio Capital',
        sublabelAr: isAr ? 'غير مخصص لعمارة محددة (تمويل عام)' : 'Unallocated to a specific property',
        sublabelEn: 'Unallocated to a specific property',
        badge: isAr ? 'محفظة عامة' : 'General',
        badgeBg: '#ffffff',
        badgeTextColor: '#475569',
        icon: Building2,
        iconBg: '#f1f5f9',
        iconColor: '#64748b'
      },
      ...buildingProperties.map(p => ({
        value: p.id,
        labelAr: p.title_ar || p.title_en || '',
        labelEn: p.title_en || p.title_ar || '',
        sublabelAr: `${p.location || 'الموقع غير مُدخل'} • ${p.area_sqm || 0} م²${p.target_budget_egp ? ` • ميزانية: ${D(p.target_budget_egp).formatEGP(true)}` : ''}`,
        sublabelEn: `${p.location || 'Location not entered'} • ${p.area_sqm || 0} sqm`,
        badge: p.completion_status === 'ready' ? (isAr ? 'جاهز' : 'Ready') : (isAr ? 'قيد التطوير' : 'In Progress'),
        badgeBg: p.completion_status === 'ready' ? '#f0fdf4' : '#fffbeb',
        badgeTextColor: p.completion_status === 'ready' ? '#15803d' : '#b45309',
        icon: Building2,
        iconBg: '#f1f5f9',
        iconColor: '#64748b'
      }))
    ];
  }, [buildingProperties, isAr]);

  const effectivePartnerName = (isLockedToPartner ? initialPartnerName!.trim() : selectedPartnerName) || '';
  const selectedBuilding = buildingProperties.find(p => p.id === selectedPropertyId);
  const matchedExistingPartner = partners.find(p => p.partnerName === effectivePartnerName);
  const isOwner = Boolean(
    effectivePartnerName === PRIMARY_DEVELOPER_NAME ||
    effectivePartnerName.includes('زكريا فريد') ||
    matchedExistingPartner?.isPermanent
  );

  // Dynamic building capital matching calculation
  const dynamicCapital = useMemo(() => {
    if (!selectedBuilding) return null;
    return computeDynamicBuildingCapital(selectedBuilding, transactions);
  }, [selectedBuilding, transactions]);

  const partnerCapitalStatus = useMemo(() => {
    if (!dynamicCapital) return null;
    return dynamicCapital.partnerStatuses.find(ps => ps.partnerName === effectivePartnerName);
  }, [dynamicCapital, effectivePartnerName]);

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

  const commitmentSelectItems = useMemo<ZFCustomSelectItem<string>[]>(() => {
    const items: ZFCustomSelectItem<string>[] = [
      {
        value: '',
        labelAr: isAr ? 'إيداع عام غير مرتبط بطلب مرحلي' : 'General capital injection (unlinked)',
        labelEn: 'General capital injection (unlinked)',
        sublabelAr: isAr ? 'يُقيد كرأس مال عام للشريك بالمشروع/الشركة' : 'Credited directly to partner equity balance',
        sublabelEn: 'Credited directly to partner equity balance',
        badge: isAr ? 'إيداع عام' : 'General',
        badgeBg: '#ffffff',
        badgeTextColor: '#475569',
        icon: Coins,
        iconBg: '#f1f5f9',
        iconColor: '#64748b'
      }
    ];

    for (const c of candidateCommitments) {
      const unpaid = D(c.committed_amount || 0).minus(c.paid_amount || 0);
      const isOverdue = c.status === 'OVERDUE' || (c.due_date && new Date(c.due_date) < new Date());
      items.push({
        value: c.commitment_id,
        labelAr: `${c.milestone_name} • متبقي: ${unpaid.formatEGP(true)}`,
        labelEn: `${c.milestone_name} • Due: ${unpaid.formatEGP(true)}`,
        sublabelAr: `${c.partner_name} • استحقاق: ${c.due_date || 'غير محدد'} • الإجمالي: ${D(c.committed_amount).formatEGP(true)}`,
        sublabelEn: `${c.partner_name} • Due: ${c.due_date || 'N/A'} • Total: ${D(c.committed_amount).formatEGP(true)}`,
        badge: isOverdue ? (isAr ? 'متأخر' : 'Overdue') : (isAr ? 'مستحق' : 'Due'),
        badgeBg: isOverdue ? '#fef2f2' : '#ffffff',
        badgeTextColor: isOverdue ? '#b91c1c' : '#475569',
        icon: isOverdue ? AlertTriangle : CheckCircle2,
        iconBg: '#f1f5f9',
        iconColor: isOverdue ? '#b91c1c' : '#64748b'
      });
    }

    return items;
  }, [candidateCommitments, isAr]);

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
  }, [initialCommitmentId, partnerCommitments, isAr]);

  const targetPeriod = useMemo(() => {
    return resolvePeriodForDate(injectionDate, periods || (activePeriod ? [activePeriod] : []), activePeriod);
  }, [injectionDate, periods, activePeriod]);
  const isTargetPeriodLocked = targetPeriod ? targetPeriod.status !== 'OPEN' : false;

  const numAmount = parseFloat(amount) || 0;
  const isValid = effectivePartnerName.length > 0 && numAmount > 0 && !isTargetPeriodLocked;

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

    setShowPrintPreview(true);
  };

  if (!isOpen) return null;

  // Printable Official Capital Injection Voucher Content
  const printableVoucherBody = confirmedVoucher && (
    <div style={{ padding: '1rem', color: '#0f172a', direction: isAr ? 'rtl' : 'ltr' }}>
      {/* Voucher Header Banner */}
      <div style={{
        background: '#eff6ff',
        border: '1.5px solid #bfdbfe',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 900,
              padding: '0.2rem 0.6rem',
              borderRadius: '6px'
            }}>
              {isAr ? 'سند توريد رسمي معتمد' : 'OFFICIAL VOUCHER'}
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
              #{confirmedVoucher.voucherCode}
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>
            {isAr ? 'سند توريد وقبض مساهمة رأس مال' : 'Capital Contribution Supply Voucher'}
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            {isAr 
              ? 'مؤسسة زكريا فريد للاستثمار والتطوير العقاري • إدارة الشراكات والمساهمات الرأسمالية' 
              : 'Zakaria Farid Real Estate • Equity & Capital Management'}
          </p>
        </div>

        <div style={{ textAlign: isAr ? 'left' : 'right' }}>
          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{isAr ? 'تاريخ التوريد:' : 'Date:'}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{confirmedVoucher.date}</div>
          <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 800, marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: isAr ? 'flex-end' : 'flex-start' }}>
            <Check size={13} strokeWidth={2.5} />
            <span>{isAr ? 'قيد مرحل بالأستاذ العام' : 'Posted to General Ledger'}</span>
          </div>
        </div>
      </div>

      {/* Amount Showcase Box */}
      <div style={{
        background: 'rgba(16, 185, 129, 0.06)',
        border: '2px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 800, display: 'block' }}>
            {isAr ? 'المبلغ المورد والمقيد في حساب رأس المال:' : 'Injected Capital Amount:'}
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums', marginTop: '0.2rem' }}>
            {D(confirmedVoucher.amount).formatEGP(isAr)}
          </div>
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#2563eb', marginTop: '0.4rem' }}>
            {isAr ? `فقط وقدره: ${tafqeetEGP(confirmedVoucher.amount)} لا غير` : tafqeetEGP(confirmedVoucher.amount)}
          </div>
        </div>

        <div style={{ textAlign: isAr ? 'left' : 'right' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: '#0f172a',
            color: '#ffffff',
            padding: '0.45rem 0.95rem',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 800
          }}>
            <ShieldCheck size={16} color="#10b981" />
            <span>{isAr ? 'معتمد ومحمي' : 'Audited & Verified'}</span>
          </span>
        </div>
      </div>

      {/* Attributes Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1.25rem'
      }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
            {isAr ? 'الشريك المساهم / المورد:' : 'Contributing Partner:'}
          </span>
          <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 800, marginTop: '0.2rem', display: 'block' }}>
            {confirmedVoucher.partnerName}
          </strong>
          {confirmedVoucher.nationalId && (
            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '0.15rem' }}>
              {isAr ? `رقم قومي: ${confirmedVoucher.nationalId}` : `ID: ${confirmedVoucher.nationalId}`}
            </span>
          )}
          {confirmedVoucher.phone && (
            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>
              {isAr ? `هاتف: ${confirmedVoucher.phone}` : `Phone: ${confirmedVoucher.phone}`}
            </span>
          )}
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
            {isAr ? 'مشروع العمارة المخصص له التمويل:' : 'Allocated Building Project:'}
          </span>
          <strong style={{ fontSize: '0.95rem', color: '#2563eb', fontWeight: 800, marginTop: '0.2rem', display: 'block' }}>
            {confirmedVoucher.propertyTitle}
          </strong>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '0.15rem' }}>
            {isAr ? 'حساب الاستثمار وتطوير البناء' : 'Building Capital Asset Account'}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
            {isAr ? 'الخزينة أو الحساب المستلم:' : 'Receiving Treasury / Account:'}
          </span>
          <strong style={{ fontSize: '0.9rem', color: '#059669', fontWeight: 800, marginTop: '0.2rem', display: 'block' }}>
            {confirmedVoucher.paymentMethod === 'BANK_102000'
              ? (isAr ? 'حـ/ 102000 - حساب البنك التجاري' : 'GL 102000 - Commercial Bank Account')
              : confirmedVoucher.paymentMethod === 'INSTAPAY_102000'
              ? (isAr ? 'حـ/ 101000 - الخزينة الرئيسية (تحويل إنستاباي فوري)' : 'GL 101000 - Main Treasury (InstaPay Transfer)')
              : (isAr ? 'حـ/ 101000 - الخزينة النقدية الرئيسية (كاش)' : 'GL 101000 - Main Cash Safe (Cash)')}
          </strong>
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
            {isAr ? 'البيان والميمو المحاسبي:' : 'Journal Memo:'}
          </span>
          <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.2rem' }}>
            {confirmedVoucher.memo}
          </div>
          {confirmedVoucher.commitmentMilestone && (
            <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: '#2563eb', fontWeight: 800 }}>
              {isAr ? `✓ مرتبط بطلب مساهمة إنشائي: ${confirmedVoucher.commitmentMilestone}` : `✓ Linked to milestone call: ${confirmedVoucher.commitmentMilestone}`}
            </div>
          )}
        </div>
      </div>

      {/* Double-Entry Journal Audit Ribbon */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #d4d4d8',
        borderRadius: '10px',
        padding: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.55rem', fontWeight: 800, color: '#0f172a', fontSize: '0.82rem' }}>
          <Scale size={16} color="#2563eb" />
          <span>{isAr ? 'شريط القيد المحاسبي المزدوج المعتمد (INV-4.1 Balanced Double-Entry):' : 'Balanced GL Journal Entry Ribbon:'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed #e2e8f0', color: '#059669', fontWeight: 800, fontSize: '0.8rem' }}>
          <span>
            {confirmedVoucher.paymentMethod === 'BANK_102000'
              ? (isAr ? 'من حـ/ 102000 (حساب البنك التجاري)' : 'Dr 102000 Operating Bank')
              : confirmedVoucher.paymentMethod === 'INSTAPAY_102000'
              ? (isAr ? 'من حـ/ 101000 (الخزينة الرئيسية - تحويل إنستاباي)' : 'Dr 101000 Main Treasury (InstaPay)')
              : (isAr ? 'من حـ/ 101000 (الخزينة النقدية الرئيسية - كاش)' : 'Dr 101000 Cash Safe (Cash)')}
          </span>
          <span>{D(confirmedVoucher.amount).formatEGP(true)} (مدين / Debit)</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', color: '#1d4ed8', fontWeight: 800, fontSize: '0.8rem' }}>
          <span>
            {isAr 
              ? `إلى حـ/ 301000 (رأس مال الشريك - ${confirmedVoucher.partnerName})` 
              : `Cr 301000 Partner Capital (${confirmedVoucher.partnerName})`}
          </span>
          <span>{D(confirmedVoucher.amount).formatEGP(true)} (دائن / Credit)</span>
        </div>
      </div>

      {/* Official Signatures & Seal Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.25rem',
        marginTop: '2rem',
        paddingTop: '1rem',
        borderTop: '1px solid #cbd5e1'
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '2.5rem' }}>
            {isAr ? 'توقيع الشريك المورد' : 'Contributing Partner Signature'}
          </span>
          <div style={{ borderTop: '1px solid #0f172a', width: '80%', margin: '0 auto', paddingTop: '0.3rem', fontSize: '0.75rem', fontWeight: 800 }}>
            {confirmedVoucher.partnerName}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '2.5rem' }}>
            {isAr ? 'توقيع أمين الخزينة / المحاسب' : 'Cashier / Accountant Signature'}
          </span>
          <div style={{ borderTop: '1px solid #0f172a', width: '80%', margin: '0 auto', paddingTop: '0.3rem', fontSize: '0.75rem', fontWeight: 800 }}>
            {isAr ? 'أمين الخزينة المعتمد' : 'Chief Accountant'}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '1.5rem' }}>
            {isAr ? 'ختم واعتماد الإدارة المالية' : 'Official Financial Stamp'}
          </span>
          <div style={{
            display: 'inline-block',
            border: '2px dashed #2563eb',
            borderRadius: '50%',
            width: '70px',
            height: '70px',
            padding: '8px',
            color: '#2563eb',
            fontSize: '0.62rem',
            fontWeight: 900,
            lineHeight: 1.2
          }}>
            {isAr ? 'مؤسسة زكريا فريد\nمعتمد مالياً' : 'ZF ERP\nVERIFIED'}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ZFModalShell
        isOpen={isOpen}
        onClose={onClose}
        title={isAr ? 'إثبات ضخ مساهمة رأس مال' : 'Capital Contribution Injection'}
        subtitle={isAr
          ? 'قيد إيداع بالخزينة أو البنك وتحديث حصة الشريك · حـ 301000 رأس مال'
          : 'Balanced deposit into cash or bank · GL 301000 Equity'}
        icon={<Coins size={16} />}
        isAr={isAr}
        maxWidth="680px"
        maxHeight="92vh"
        footer={
          <>
            <button
              type="submit"
              form="capital-injection-form"
              className={p.primaryButton}
              disabled={!isValid || isMutating || isTargetPeriodLocked}
            >
              {isMutating ? (
                <><Loader2 size={14} className={p.spin} /><span>{isAr ? 'جاري ترحيل القيد...' : 'Posting...'}</span></>
              ) : isTargetPeriodLocked ? (
                <><AlertTriangle size={14} /><span>{isAr ? `الفترة المحاسبية مقفلة (M${targetPeriod?.period_number ?? ''})` : `Period Locked (M${targetPeriod?.period_number ?? ''})`}</span></>
              ) : (
                <><CheckCircle2 size={14} /><span>{isAr ? 'اعتماد المساهمة وإصدار سند التوريد' : 'Commit & Generate Voucher'}</span></>
              )}
            </button>
            <button type="button" className={p.secondaryButton} onClick={onClose} disabled={isMutating}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </>
        }
      >
        <form id="capital-injection-form" onSubmit={handleSubmit}>
          {/* Partner */}
          <section className={p.section}>
            <div className={p.sectionHeader}>
              <h4 className={p.sectionTitle}>{isAr ? 'الشريك المساهم' : 'Contributing Partner'}</h4>
              {!isLockedToPartner && onOpenNewPartnerModal && (
                <button
                  type="button"
                  className={p.linkButton}
                  onClick={() => {
                    onClose();
                    onOpenNewPartnerModal();
                  }}
                >
                  <PlusCircle size={12} />
                  <span>{isAr ? 'تسجيل شريك جديد' : 'Onboard New Partner'}</span>
                </button>
              )}
            </div>
            {isLockedToPartner ? (
              <div className={p.sectionHeader}>
                <div className={p.identity}>
                  <span className={p.thumbFallback}>{isOwner ? <Crown size={18} /> : <Users size={18} />}</span>
                  <div className={p.identityText}>
                    <h4 className={p.identityTitle}>
                      <bdi>{effectivePartnerName ? (isAr ? localizeBuyerName(effectivePartnerName) : effectivePartnerName) : (isAr ? 'غير مُدخل' : 'Not entered')}</bdi>
                    </h4>
                    <p className={p.hint}>{isAr ? 'المساهمة مخصصة لهذا الشريك مباشرة' : 'Capital injection locked to this partner'}</p>
                  </div>
                </div>
                <span className={isOwner ? `${p.pill} ${p.pillAccent}` : p.pill}>
                  {isOwner ? (isAr ? 'المالك' : 'Owner') : (matchedExistingPartner?.roleTitleAr || (isAr ? 'شريك مساهم' : 'Partner'))}
                </span>
              </div>
            ) : (
              <div className={p.field}>
                <label className={p.label}>{isAr ? 'اختر الشريك / الممول المساهم *' : 'Select Contributing Partner *'}</label>
                <ZFCustomSelect<string>
                  value={selectedPartnerName}
                  onChange={(val) => setSelectedPartnerName(val)}
                  items={partnerSelectItems}
                  placeholderAr="اختر الشريك المسجل"
                  placeholderEn="Select registered partner"
                  isAr={isAr}
                  searchable={true}
                  customAction={onOpenNewPartnerModal ? {
                    labelAr: 'تسجيل شريك جديد',
                    labelEn: 'Onboard New Partner',
                    icon: PlusCircle,
                    onClick: onOpenNewPartnerModal
                  } : undefined}
                />
                {matchedExistingPartner && (
                  <p className={p.hint}>
                    {isAr ? 'الدور: ' : 'Role: '}{matchedExistingPartner.roleTitleAr || (isAr ? 'غير مُدخل' : 'Not entered')}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Milestone link */}
          {candidateCommitments.length > 0 && (
            <section className={p.section}>
              <div className={p.sectionHeader}>
                <h4 className={p.sectionTitle}>{isAr ? 'ربط بطلب مساهمة مرحلي (اختياري)' : 'Link to Milestone Call (Optional)'}</h4>
                {selectedCommitment && <span className={`${p.pill} ${p.pillSuccess}`}>{isAr ? 'مرتبط' : 'Linked'}</span>}
              </div>
              <ZFCustomSelect<string>
                value={selectedCommitmentId}
                onChange={handleCommitmentChange}
                items={commitmentSelectItems}
                placeholderAr="إيداع عام غير مرتبط بطلب مرحلي"
                placeholderEn="General injection (unlinked)"
                isAr={isAr}
                searchable={true}
              />
              {selectedCommitment && (
                <dl className={p.metaList}>
                  <div className={p.metaRow}>
                    <dt className={p.metaKey}>{isAr ? 'المطلوب بالمرحلة' : 'Committed'}</dt>
                    <dd className={p.metaValue}><bdi>{D(selectedCommitment.committed_amount || 0).formatEGP(isAr)}</bdi></dd>
                  </div>
                  <div className={p.metaRow}>
                    <dt className={p.metaKey}>{isAr ? 'المسدد سابقاً' : 'Paid'}</dt>
                    <dd className={p.metaValue}><bdi>{D(selectedCommitment.paid_amount || 0).formatEGP(isAr)}</bdi></dd>
                  </div>
                  <div className={p.metaRow}>
                    <dt className={p.metaKey}>{isAr ? 'المتبقي مطلوب سداده' : 'Remaining Due'}</dt>
                    <dd className={`${p.metaValue} ${p.textDanger}`}><bdi>{D(selectedCommitment.committed_amount || 0).minus(selectedCommitment.paid_amount || 0).formatEGP(isAr)}</bdi></dd>
                  </div>
                </dl>
              )}
            </section>
          )}

          {/* Amount & building */}
          <section className={p.section}>
            <h4 className={p.sectionTitle}>{isAr ? 'المبلغ والمشروع' : 'Amount & Building'}</h4>
            <div className={p.fieldGrid}>
              <div className={p.field}>
                <label className={p.label} htmlFor="ci-amount">{isAr ? 'مبلغ المساهمة المودع *' : 'Injected Capital Amount *'}</label>
                <div className={p.affixWrap}>
                  <input
                    id="ci-amount"
                    type="number"
                    min="1"
                    step="5000"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className={`${p.input} ${p.inputLarge} ${p.numeric}`}
                  />
                  <span className={p.affix}>{isAr ? 'ج.م' : 'EGP'}</span>
                </div>
                {numAmount > 0 && <p className={p.hint}>{tafqeetEGP(amount)}</p>}
              </div>
              <div className={p.field}>
                <label className={p.label}>{isAr ? 'العمارة المستهدفة (عمارات الشراكة)' : 'Target Building'}</label>
                <ZFCustomSelect<string>
                  value={selectedPropertyId}
                  onChange={(val) => setSelectedPropertyId(val)}
                  items={propertySelectItems}
                  placeholderAr="رأس مال عام لمحفظة الشركة"
                  placeholderEn="General portfolio capital"
                  isAr={isAr}
                  searchable={true}
                />
              </div>
            </div>
          </section>

          {/* Building capital position */}
          {selectedBuilding && partnerCapitalStatus && (
            <section className={p.section}>
              <div className={p.sectionHeader}>
                <h4 className={p.sectionTitle}>
                  {isAr ? 'موقف رأس المال: ' : 'Capital position: '}<bdi>{isAr ? (selectedBuilding.title_ar || selectedBuilding.title_en) : (selectedBuilding.title_en || selectedBuilding.title_ar)}</bdi>
                </h4>
                <span className={partnerCapitalStatus.hasArrears ? `${p.pill} ${p.pillDanger}` : `${p.pill} ${p.pillSuccess}`}>
                  {partnerCapitalStatus.hasArrears
                    ? (isAr ? 'متأخرات مستحقة' : 'Arrears Due')
                    : (isAr ? 'المساهمة متطابقة' : 'Up to Date')}
                </span>
              </div>
              <dl className={p.metaList}>
                <div className={p.metaRow}>
                  <dt className={p.metaKey}>{isAr ? 'المساهمة المطلوبة بالحصة' : 'Required Contribution'}</dt>
                  <dd className={p.metaValue}><bdi>{D(partnerCapitalStatus.requiredContributionEgp || '0').formatEGP(isAr)}</bdi></dd>
                </div>
                <div className={p.metaRow}>
                  <dt className={p.metaKey}>{isAr ? 'المسدد سابقاً بالمبنى' : 'Previously Paid'}</dt>
                  <dd className={p.metaValue}><bdi>{D(partnerCapitalStatus.paidContributionEgp || '0').formatEGP(isAr)}</bdi></dd>
                </div>
                <div className={p.metaRow}>
                  <dt className={p.metaKey}>{isAr ? 'المتأخرات بموجب ضخ المؤسس' : 'Founder-Matching Arrears'}</dt>
                  <dd className={partnerCapitalStatus.hasArrears ? `${p.metaValue} ${p.textDanger}` : p.metaValue}>
                    <bdi>{D(partnerCapitalStatus.arrearsEgp || '0').formatEGP(isAr)}</bdi>
                  </dd>
                </div>
                <div className={p.metaRow}>
                  <dt className={p.metaKey}>{isAr ? 'الميزانية التقديرية للمبنى' : 'Target Budget'}</dt>
                  <dd className={selectedBuilding.target_budget_egp ? p.metaValue : `${p.metaValue} ${p.emptyValue}`}>
                    {selectedBuilding.target_budget_egp
                      ? <bdi>{D(selectedBuilding.target_budget_egp).formatEGP(isAr)}</bdi>
                      : (isAr ? 'غير مُدخل' : 'Not entered')}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {/* Deposit method */}
          <section className={p.section}>
            <div className={p.sectionHeader}>
              <h4 className={p.sectionTitle}>{isAr ? 'طريقة الاستلام' : 'Deposit Method'}</h4>
              <span className={p.pill}>{isAr ? 'جهة الإيداع: الخزينة الرئيسية 101000' : 'Destination: Main Treasury 101000'}</span>
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
                  <span className={p.choiceDesc}>{isAr ? 'توريد بالخزينة (101000)' : 'Vault safe (101000)'}</span>
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={paymentMethod === 'INSTAPAY_102000'}
                onClick={() => setPaymentMethod('INSTAPAY_102000')}
                className={paymentMethod === 'INSTAPAY_102000' ? `${p.choice} ${p.choiceSelected}` : p.choice}
              >
                <span className={p.choiceIcon}><Coins size={16} /></span>
                <span className={p.choiceText}>
                  <span className={p.choiceTitle}>{isAr ? 'تحويل إنستاباي فوري' : 'Instant InstaPay'}</span>
                  <span className={p.choiceDesc}>{isAr ? 'تحويل للخزينة (101000)' : 'Transfer to safe (101000)'}</span>
                </span>
              </button>
            </div>
          </section>

          {/* Entry details */}
          <section className={p.section}>
            <h4 className={p.sectionTitle}>{isAr ? 'بيانات القيد' : 'Entry Details'}</h4>
            {isTargetPeriodLocked && targetPeriod && (
              <div className={`${p.notice} ${p.noticeDanger}`} role="alert">
                <AlertTriangle size={16} className={p.noticeIconDanger} />
                <div>
                  <p className={p.noticeTitle}>{isAr ? 'الفترة المحاسبية لتاريخ التوريد مقفلة' : 'Fiscal period is locked'}</p>
                  <p className={p.noticeBody}>
                    {isAr
                      ? `تاريخ التوريد يقع في الفترة (${targetPeriod.fiscal_year}-M${targetPeriod.period_number}) وهي مقفلة. افتح الفترة أولاً أو غيّر التاريخ.`
                      : `The date falls in period (${targetPeriod.fiscal_year}-M${targetPeriod.period_number}), which is locked. Reopen it or change the date.`}
                  </p>
                </div>
              </div>
            )}
            <div className={p.fieldGrid}>
              <div className={p.field}>
                <label className={p.label} htmlFor="ci-date">{isAr ? 'تاريخ التوريد والقيد' : 'Date'}</label>
                <input
                  id="ci-date"
                  type="date"
                  value={injectionDate}
                  onChange={(e) => setInjectionDate(e.target.value)}
                  className={`${p.input} ${p.numeric}`}
                />
              </div>
              <div className={p.field}>
                <label className={p.label} htmlFor="ci-ref">{isAr ? 'رقم إشعار / كود السند' : 'Receipt Code'}</label>
                <input
                  id="ci-ref"
                  type="text"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  className={`${p.input} ${p.numeric}`}
                />
              </div>
              <div className={`${p.field} ${p.fieldFull}`}>
                <label className={p.label} htmlFor="ci-memo">{isAr ? 'بيان القيد المحاسبي' : 'Journal Memo'}</label>
                <input
                  id="ci-memo"
                  type="text"
                  placeholder={isAr ? 'مساهمة رأس مال جديدة من الشريك' : 'Capital injection memo'}
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
                      {paymentMethod === 'BANK_102000'
                        ? <><bdi>102000</bdi> · {isAr ? 'حساب البنك التجاري' : 'Commercial Bank'}</>
                        : paymentMethod === 'INSTAPAY_102000'
                        ? <><bdi>101000</bdi> · {isAr ? 'الخزينة الرئيسية (إنستاباي)' : 'Main Treasury (InstaPay)'}</>
                        : <><bdi>101000</bdi> · {isAr ? 'الخزينة النقدية الرئيسية (كاش)' : 'Main Cash Safe (Cash)'}</>}
                    </td>
                    <td className={`${p.cellEnd} ${p.cellStrong}`}><bdi>{D(numAmount).formatEGP(isAr)}</bdi></td>
                    <td className={`${p.cellEnd} ${p.cellMuted}`}><bdi>{D(0).formatEGP(isAr)}</bdi></td>
                  </tr>
                  <tr>
                    <td className={p.cellStrong}>
                      <bdi>301000</bdi> · {isAr ? 'رأس مال الشركاء' : 'Partner Capital'}
                      {effectivePartnerName && <> · <bdi>{isAr ? localizeBuyerName(effectivePartnerName) : effectivePartnerName}</bdi></>}
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

      {/* MODAL PRINT PREVIEW OVERLAY */}
      {showPrintPreview && confirmedVoucher && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            backgroundColor: 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={handleCloseEntirely}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '850px',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: '12px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.35)'
            }} 
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
