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
  Target
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import { 
  PartnerFinancialSummary, 
  computeDynamicBuildingCapital 
} from '@/lib/erp/partnersEngine';
import { Property } from '@/lib/supabase/types';
import { ERPPartnerTransaction, ERPAccountingPeriod, ERPPartnerCommitment } from '@/lib/erp/types';
import { resolvePeriodForDate } from '@/lib/erp/ledger';
import { ZFCustomSelect, ZFCustomSelectItem } from '../common/ZFCustomSelect';
import { ZFModalShell } from '../common/ZFModalShell';
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
  transactions = [],
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
        sublabelAr: isOwner ? `مالك المنظومة • مساهمات سابقة: ${D(p.totalContributedCapital).toNumber().toLocaleString()} ج.م` : `${p.roleTitleAr} • مساهمات سابقة: ${D(p.totalContributedCapital).toNumber().toLocaleString()} ج.م`,
        sublabelEn: isOwner ? `System Owner • Capital: ${D(p.totalContributedCapital).toNumber().toLocaleString()} EGP` : `${p.roleTitleAr} • Capital: ${D(p.totalContributedCapital).toNumber().toLocaleString()} EGP`,
        price: balanceNum,
        badge: isOwner ? (isAr ? 'المالك' : 'Owner') : p.roleTitleAr,
        badgeBg: isOwner ? '#eff6ff' : 'rgba(37, 99, 235, 0.08)',
        badgeTextColor: '#2563eb',
        icon: isOwner ? Crown : Users,
        iconBg: isOwner ? '#eff6ff' : 'rgba(37, 99, 235, 0.1)',
        iconColor: '#2563eb'
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
        badgeBg: 'rgba(100, 116, 139, 0.08)',
        badgeTextColor: '#64748b',
        icon: Building2,
        iconBg: 'rgba(100, 116, 139, 0.08)',
        iconColor: '#64748b'
      },
      ...buildingProperties.map(p => ({
        value: p.id,
        labelAr: p.title_ar || p.title_en || '',
        labelEn: p.title_en || p.title_ar || '',
        sublabelAr: `${p.location || 'الشرقية'} • ${p.area_sqm || 0} م²${p.target_budget_egp ? ` • ميزانية: ${D(p.target_budget_egp).formatEGP(true)}` : ''}`,
        sublabelEn: `${p.location || 'Sharkia'} • ${p.area_sqm || 0} sqm`,
        badge: p.completion_status === 'ready' ? (isAr ? 'جاهز' : 'Ready') : (isAr ? 'قيد التطوير' : 'In Progress'),
        badgeBg: p.completion_status === 'ready' ? 'rgba(21, 128, 61, 0.08)' : '#eff6ff',
        badgeTextColor: p.completion_status === 'ready' ? '#15803d' : '#2563eb',
        icon: Building2,
        iconBg: '#eff6ff',
        iconColor: '#2563eb'
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
        labelAr: isAr ? '-- إيداع عام / غير مرتبط بطلب مرحلي معين --' : '-- General Capital Injection (Unlinked) --',
        labelEn: '-- General Capital Injection (Unlinked) --',
        sublabelAr: isAr ? 'يُقيد كرأس مال عام للشريك بالمشروع/الشركة' : 'Credited directly to partner equity balance',
        sublabelEn: 'Credited directly to partner equity balance',
        badge: isAr ? 'إيداع عام' : 'General',
        badgeBg: 'rgba(100, 116, 139, 0.08)',
        badgeTextColor: '#64748b',
        icon: Coins,
        iconBg: 'rgba(100, 116, 139, 0.08)',
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
        badgeBg: isOverdue ? '#fee2e2' : '#eff6ff',
        badgeTextColor: isOverdue ? '#b91c1c' : '#2563eb',
        icon: isOverdue ? AlertTriangle : CheckCircle2,
        iconBg: isOverdue ? '#fee2e2' : '#eff6ff',
        iconColor: isOverdue ? '#dc2626' : '#2563eb'
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
  const isCash = paymentMethod === 'CASH_101000';
  const selectedAccountCode = isCash ? '101000' : '102000';
  const selectedAccountLabelAr = isCash ? 'الخزينة (101000)' : 'إنستاباي (102000)';
  const selectedAccountLabelEn = isCash ? 'Safe (101000)' : 'InstaPay (102000)';
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
          <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 800, marginTop: '0.2rem' }}>
            {isAr ? '✓ قيد مرحل بالأستاذ العام' : '✓ Posted to General Ledger'}
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
            {confirmedVoucher.paymentMethod === 'CASH_101000'
              ? (isAr ? 'حـ/ 101000 - الخزينة (101000)' : 'GL 101000 - Safe (101000)')
              : (isAr ? 'حـ/ 102000 - إنستاباي (102000)' : 'GL 102000 - InstaPay (102000)')}
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
            {confirmedVoucher.paymentMethod === 'CASH_101000'
              ? (isAr ? 'من حـ/ 101000 (الخزينة 101000)' : 'Dr 101000 Safe (101000)')
              : (isAr ? 'من حـ/ 102000 (إنستاباي 102000)' : 'Dr 102000 InstaPay (102000)')}
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
          ? 'إثبات قيد إيداع بالخزينة أو البنك وتحديث حصة الشريك وصافي مستحقاته بالمليم' 
          : 'Balanced immutable double-entry injection into company cash or bank'}
        icon={<Coins size={18} />}
        headerExtra={
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            background: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #bfdbfe'
          }}>
            {isAr ? 'حـ/ 301000 رأس مال' : 'GL 301000 Equity'}
          </span>
        }
        isAr={isAr}
        maxWidth="680px"
        maxHeight="92vh"
        bodyStyle={{ padding: 0 }}
      >

          {/* FORM */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.25rem 1.5rem', gap: '1.15rem' }}>
            
            {/* 1. PARTNER IDENTIFICATION */}
            {isLockedToPartner ? (
              <div style={{
                background: isOwner 
                  ? '#eff6ff' 
                  : '#f8fafc',
                border: isOwner ? '1.5px solid #bfdbfe' : '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '0.85rem 1.15rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: isOwner 
                      ? '#dbeafe' 
                      : '#f1f5f9',
                    color: isOwner ? '#2563eb' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    border: isOwner ? '1px solid #bfdbfe' : '1px solid #cbd5e1'
                  }}>
                    {isOwner ? (
                      <Crown size={20} color="#2563eb" />
                    ) : (
                      (effectivePartnerName || '').charAt(0)
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                        {effectivePartnerName}
                      </span>
                      {isOwner ? (
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <Crown size={11} color="#2563eb" />
                          {isAr ? 'المالك' : 'Owner'}
                        </span>
                      ) : (
                        matchedExistingPartner && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#475569'
                          }}>
                            {matchedExistingPartner.roleTitleAr || (isAr ? 'شريك مساهم' : 'Partner')}
                          </span>
                        )
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {isAr 
                        ? '✓ المساهمة المالية مقفولة ومخصصة لهذا الشريك مباشرة' 
                        : '✓ Capital injection locked to this partner'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#047857', fontSize: '0.75rem', fontWeight: 800 }}>
                  <ShieldCheck size={16} color="#047857" />
                  <span>{isAr ? 'شريك معتمد' : 'Verified'}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                    {isAr ? 'اختار الشريك / الممول المساهم *' : 'Select Contributing Partner *'}
                  </label>
                  {onOpenNewPartnerModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenNewPartnerModal();
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '6px'
                      }}
                    >
                      <PlusCircle size={14} />
                      <span>{isAr ? '+ تسجيل وتوثيق شريك جديد' : '+ Onboard New Partner'}</span>
                    </button>
                  )}
                </div>

                <ZFCustomSelect<string>
                  value={selectedPartnerName}
                  onChange={(val) => setSelectedPartnerName(val)}
                  items={partnerSelectItems}
                  placeholderAr="-- اضغط لاختيار الشريك المسجل --"
                  placeholderEn="-- Select Registered Partner --"
                  isAr={isAr}
                  searchable={true}
                  customAction={onOpenNewPartnerModal ? {
                    labelAr: '+ تسجيل وتوثيق شريك جديد',
                    labelEn: '+ Onboard New Partner',
                    icon: PlusCircle,
                    onClick: onOpenNewPartnerModal
                  } : undefined}
                />

                {matchedExistingPartner && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.72rem',
                    color: '#64748b',
                    background: '#f8fafc',
                    padding: '0.4rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <ShieldCheck size={14} color="#047857" />
                    <span>
                      {isAr 
                        ? `شريك معتمد: ${matchedExistingPartner.partnerName} • الدور: ${matchedExistingPartner.roleTitleAr}`
                        : `Verified Partner: ${matchedExistingPartner.partnerName} (${matchedExistingPartner.roleTitleAr})`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 1.5 MILESTONE CALL LINKAGE (OPTIONAL) */}
            {candidateCommitments.length > 0 && (
              <div style={{
                background: selectedCommitment ? 'rgba(37, 99, 235, 0.03)' : '#f8fafc',
                border: selectedCommitment ? '1.5px solid #bfdbfe' : '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.55rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', fontWeight: 800, color: '#1e293b' }}>
                    <Target size={15} color="#2563eb" />
                    <span>{isAr ? 'ربط السداد بطلب مساهمة إنشائي مرحلي (اختياري):' : 'Link to Milestone Call (Optional):'}</span>
                  </label>
                  {selectedCommitment && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe'
                    }}>
                      {isAr ? '✓ تم الربط وتحديد القيمة' : '✓ Linked'}
                    </span>
                  )}
                </div>

                <ZFCustomSelect<string>
                  value={selectedCommitmentId}
                  onChange={handleCommitmentChange}
                  items={commitmentSelectItems}
                  placeholderAr="-- إيداع عام / غير مرتبط بطلب مرحلي معين --"
                  placeholderEn="-- General Injection (Unlinked) --"
                  isAr={isAr}
                  searchable={true}
                />

                {selectedCommitment && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.5rem',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.72rem'
                  }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.66rem' }}>
                        {isAr ? 'المطلوب بالمرحلة:' : 'Committed:'}
                      </span>
                      <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.82rem' }}>
                        {D(selectedCommitment.committed_amount).formatEGP(true)}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.66rem' }}>
                        {isAr ? 'المسدد سابقاً:' : 'Paid:'}
                      </span>
                      <strong style={{ color: '#059669', fontWeight: 800, fontSize: '0.82rem' }}>
                        {D(selectedCommitment.paid_amount || 0).formatEGP(true)}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.66rem' }}>
                        {isAr ? 'المتبقي مطلوب سداده:' : 'Remaining Due:'}
                      </span>
                      <strong style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.82rem' }}>
                        {D(selectedCommitment.committed_amount || 0).minus(selectedCommitment.paid_amount || 0).formatEGP(true)}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. AMOUNT & PROJECT ALLOCATION */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'مبلغ المساهمة المودع (ج.م) *' : 'Injected Capital Amount (EGP) *'}
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1.5px solid #2563eb',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: 900,
                    color: '#0f172a'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'المشروع المستهدف (عمارات الشراكة حصراً):' : 'Target Building:'}
                </label>
                <ZFCustomSelect<string>
                  value={selectedPropertyId}
                  onChange={(val) => setSelectedPropertyId(val)}
                  items={propertySelectItems}
                  placeholderAr="-- رأس مال عام لمحفظة الشركة --"
                  placeholderEn="-- General Portfolio Capital --"
                  isAr={isAr}
                  searchable={true}
                />
              </div>
            </div>

            {/* DYNAMIC CAPITAL MATCHING STATUS CARD */}
            {selectedBuilding && partnerCapitalStatus && (
              <div style={{
                background: partnerCapitalStatus.hasArrears ? 'rgba(239, 68, 68, 0.04)' : 'rgba(16, 185, 129, 0.04)',
                border: partnerCapitalStatus.hasArrears ? '1.5px solid rgba(239, 68, 68, 0.25)' : '1.5px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '12px',
                padding: '0.95rem 1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Building2 size={16} color="#2563eb" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                      {isAr ? `الموقف المالي لرأس مال: ${selectedBuilding.title_ar || selectedBuilding.title_en}` : 'Building Capital Position'}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '4px',
                    background: partnerCapitalStatus.hasArrears ? '#fee2e2' : '#dcfce7',
                    color: partnerCapitalStatus.hasArrears ? '#b91c1c' : '#15803d'
                  }}>
                    {partnerCapitalStatus.hasArrears 
                      ? (isAr ? 'مطلوب سداد متأخرات بموجب ضخ المؤسس' : 'Arrears Due')
                      : (isAr ? 'موقف المساهمة متطابق' : 'Contribution Up to Date')}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                      {isAr ? 'المساهمة المطلوبة بالحصة:' : 'Required Contribution:'}
                    </span>
                    <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                      {D(partnerCapitalStatus.requiredContributionEgp).formatEGP(true)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                      {isAr ? 'المسدد سابقاً بالمبنى:' : 'Previously Paid:'}
                    </span>
                    <strong style={{ fontSize: '0.85rem', color: '#059669' }}>
                      {D(partnerCapitalStatus.paidContributionEgp).formatEGP(true)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                      {isAr ? 'المتأخرات بموجب ضخ المؤسس:' : 'Dynamic Arrears:'}
                    </span>
                    <strong style={{ fontSize: '0.85rem', color: partnerCapitalStatus.hasArrears ? '#dc2626' : '#059669' }}>
                      {D(partnerCapitalStatus.arrearsEgp).formatEGP(true)}
                    </strong>
                  </div>
                </div>

                {selectedBuilding.target_budget_egp && (
                  <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{isAr ? 'الميزانية التقديرية الاسترشادية للمبنى:' : 'Target Budget:'}</span>
                    <strong>{D(selectedBuilding.target_budget_egp).formatEGP(true)}</strong>
                  </div>
                )}
              </div>
            )}

            {/* 3. PAYMENT DESTINATION */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                  {isAr ? 'طريقة الاستلام والتوريد:' : 'Deposit Method:'}
                </label>
                <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#047857', background: 'rgba(4, 120, 87, 0.08)', padding: '0.12rem 0.45rem', borderRadius: '5px' }}>
                  {isAr ? `الحساب: ${selectedAccountLabelAr}` : `Account: ${selectedAccountLabelEn}`}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH_101000')}
                  style={{
                    padding: '0.7rem 0.5rem',
                    borderRadius: '8px',
                    border: paymentMethod === 'CASH_101000' ? '2px solid #059669' : '1px solid #e2e8f0',
                    background: paymentMethod === 'CASH_101000' ? 'rgba(5, 150, 105, 0.05)' : '#ffffff',
                    color: paymentMethod === 'CASH_101000' ? '#059669' : '#64748b',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Wallet size={20} />
                  <span>{isAr ? 'كاش نقدي باليد' : 'Cash in Hand'}</span>
                  <small style={{ fontSize: '0.65rem', fontWeight: 500, color: '#64748b' }}>
                    {isAr ? 'نقدي بالخزينة (101000)' : 'Cash — Safe (101000)'}
                  </small>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('INSTAPAY_102000')}
                  style={{
                    padding: '0.7rem 0.5rem',
                    borderRadius: '8px',
                    border: paymentMethod === 'INSTAPAY_102000' ? '2px solid #047857' : '1px solid #e2e8f0',
                    background: paymentMethod === 'INSTAPAY_102000' ? 'rgba(4, 120, 87, 0.05)' : '#ffffff',
                    color: paymentMethod === 'INSTAPAY_102000' ? '#047857' : '#64748b',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Coins size={20} />
                  <span>{isAr ? 'تحويل إنستاباي فوري' : 'Instant InstaPay'}</span>
                  <small style={{ fontSize: '0.65rem', fontWeight: 500, color: '#64748b' }}>
                    {isAr ? 'تحويل إنستاباي (102000)' : 'InstaPay transfer (102000)'}
                  </small>
                </button>
              </div>
            </div>

            {/* 4. METADATA: DATE & RECEIPT REF */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'تاريخ التوريد والقيد:' : 'Date:'}
                </label>
                <input
                  type="date"
                  value={injectionDate}
                  onChange={(e) => setInjectionDate(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.82rem',
                    color: '#0f172a'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'رقم إشعار / كود السند:' : 'Receipt Code:'}
                </label>
                <input
                  type="text"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.82rem',
                    fontFamily: 'monospace',
                    color: '#0f172a'
                  }}
                />
              </div>
            </div>

            {isTargetPeriodLocked && targetPeriod && (
              <div style={{
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                color: '#991b1b',
                fontSize: '0.78rem'
              }}>
                <AlertTriangle size={17} color="#dc2626" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.8rem' }}>
                    {isAr ? 'الفترة المحاسبية لتاريخ التوريد مقفلة' : 'Fiscal period is locked'}
                  </strong>
                  <span style={{ fontSize: '0.73rem', color: '#b91c1c' }}>
                    {isAr
                      ? `تاريخ التوريد يقع في الفترة (${targetPeriod.fiscal_year}-M${targetPeriod.period_number}) وهي مقفلة بموجب المعيار Invariant 0.9. يُرجى فتح الفترة أولاً.`
                      : `Injection date falls in period (${targetPeriod.fiscal_year}-M${targetPeriod.period_number}) which is locked per Invariant 0.9.`}
                  </span>
                </div>
              </div>
            )}

            {/* 5. MEMO */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {isAr ? 'شرح وبيان القيد المحاسبي:' : 'Journal Memo:'}
              </label>
              <input
                type="text"
                placeholder={isAr ? `مساهمة رأس مال جديدة من الشريك ${effectivePartnerName}` : 'Capital injection memo'}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.82rem',
                  color: '#0f172a'
                }}
              />
            </div>

            {/* 6. GL ENTRY PREVIEW */}
            <div style={{
              background: '#fafaf9',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              fontSize: '0.74rem'
            }}>
              <div style={{ fontWeight: 800, color: '#334155', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Scale size={14} color="#2563eb" />
                <span>{isAr ? 'معاينة القيد المحاسبي المتوازن بالمليم:' : 'Balanced Double-Entry Preview:'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857', fontWeight: 700, marginBottom: '0.2rem' }}>
                <span>
                  {selectedAccountCode === '101000'
                    ? (isAr ? 'من حـ/ 101000 (الخزينة 101000)' : 'Dr 101000 Safe (101000)')
                    : (isAr ? 'من حـ/ 102000 (إنستاباي 102000)' : 'Dr 102000 InstaPay (102000)')}
                </span>
                <span>{numAmount > 0 ? `${D(numAmount).formatEGP(true)} (مدين)` : '0.00'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1d4ed8', fontWeight: 700 }}>
                <span>
                  {isAr ? `إلى حـ/ 301000 (رأس مال الشركاء - ${effectivePartnerName || 'الشريك'})` : `Cr 301000 Partner Capital (${effectivePartnerName})`}
                </span>
                <span>{numAmount > 0 ? `${D(numAmount).formatEGP(true)} (دائن)` : '0.00'}</span>
              </div>
            </div>

            {/* FOOTER BUTTONS */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.65rem',
              marginTop: '0.5rem',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '1rem'
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={!isValid || isMutating || isTargetPeriodLocked}
                style={{
                  padding: '0.55rem 1.45rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: !isValid || isMutating || isTargetPeriodLocked ? '#94a3b8' : '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: !isValid || isMutating || isTargetPeriodLocked ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: !isValid || isMutating || isTargetPeriodLocked ? 'none' : '0 2px 8px rgba(37, 99, 235, 0.25)'
                }}
              >
                {isMutating ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{isAr ? 'جاري ترحيل القيد...' : 'Posting...'}</span>
                  </>
                ) : isTargetPeriodLocked ? (
                  <>
                    <AlertTriangle size={16} />
                    <span>{isAr ? `الفترة المحاسبية مقفلة (M${targetPeriod?.period_number ?? ''})` : `Period Locked (M${targetPeriod?.period_number ?? ''})`}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{isAr ? 'اعتماد المساهمة وإصدار سند التوريد' : 'Commit & Generate Voucher'}</span>
                  </>
                )}
              </button>
            </div>
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
