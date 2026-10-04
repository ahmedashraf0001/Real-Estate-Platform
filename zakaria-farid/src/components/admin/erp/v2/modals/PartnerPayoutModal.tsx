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
  ArrowRight,
  Receipt, 
  Scale, 
  Smartphone,
  Crown,
  AlertTriangle
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { PartnerFinancialSummary } from '@/lib/erp/partnersEngine';
import { Property } from '@/lib/supabase/types';
import type { ERPAccountingPeriod } from '@/lib/erp/types';
import { resolvePeriodForDate } from '@/lib/erp/ledger';
import { ZFCustomSelect, ZFCustomSelectItem } from '../common/ZFCustomSelect';
import { ZFModalShell } from '../common/ZFModalShell';
import { PRIMARY_DEVELOPER_NAME } from '@/lib/erp/partnersDirectory';
import styles from '../ZFWorkstationShell.module.css';

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
        sublabelAr: isOwner ? `مالك المنظومة • رصيد مستحق: ${balanceNum.toLocaleString()} ج.م` : `${p.roleTitleAr} • هاتف: ${p.phone || '—'}`,
        sublabelEn: isOwner ? `System Owner • Balance: ${balanceNum.toLocaleString()} EGP` : `${p.roleTitleAr} • Phone: ${p.phone || '—'}`,
        price: balanceNum,
        badge: isOwner ? (isAr ? 'المالك' : 'Owner') : (balanceNum > 0 ? (isAr ? 'مستحق له أرباح' : 'Due Payout') : (isAr ? 'رصيد مسوى' : 'Settled')),
        badgeBg: isOwner ? '#eff6ff' : (balanceNum > 0 ? 'rgba(21, 128, 61, 0.08)' : 'rgba(100, 116, 139, 0.08)'),
        badgeTextColor: isOwner ? '#2563eb' : (balanceNum > 0 ? '#15803d' : '#64748b'),
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
        labelAr: isAr ? 'توزيع عام من أرباح الشركة' : 'General Company Profit Distribution',
        labelEn: 'General Company Profit Distribution',
        sublabelAr: isAr ? 'أرباح عامة غير مخصصة لمشروع بعينه' : 'General profit unallocated to a specific project',
        sublabelEn: 'General profit unallocated to a specific project',
        badge: isAr ? 'توزيع عام' : 'General',
        badgeBg: 'rgba(100, 116, 139, 0.08)',
        badgeTextColor: '#64748b',
        icon: Building2,
        iconBg: 'rgba(100, 116, 139, 0.08)',
        iconColor: '#64748b'
      },
      ...properties.map(p => ({
        value: p.id,
        labelAr: p.title_ar || p.title_en || '',
        labelEn: p.title_en || p.title_ar || '',
        sublabelAr: `${p.location || 'الشرقية'} • ${p.area_sqm || 0} م²`,
        sublabelEn: `${p.location || 'Sharkia'} • ${p.area_sqm || 0} sqm`,
        badge: p.completion_status === 'ready' ? (isAr ? 'جاهز' : 'Ready') : (isAr ? 'قيد التطوير' : 'In Progress'),
        badgeBg: p.completion_status === 'ready' ? 'rgba(21, 128, 61, 0.08)' : '#eff6ff',
        badgeTextColor: p.completion_status === 'ready' ? '#15803d' : '#2563eb',
        icon: Building2,
        iconBg: '#eff6ff',
        iconColor: '#2563eb'
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

  const isCash = paymentMethod === 'CASH_101000';
  const selectedAccountCode = isCash ? '101000' : '102000';
  const selectedAccountLabelAr = isCash ? 'الخزينة (101000)' : 'إنستاباي (102000)';
  const selectedAccountLabelEn = isCash ? 'Safe (101000)' : 'InstaPay (102000)';

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'صرف دفعة أرباح وتسديد مستحقات شريك' : 'Partner Profit Payout & Settlement'}
      subtitle={isAr ? `إنشاء قيد يومية متوازن آلياً (مدين حـ/303000 أرباح الشركاء - دائن حـ/${selectedAccountCode} ${selectedAccountLabelAr})` : `Audited double-entry journal posting for partner distribution (${selectedAccountLabelEn})`}
      icon={<Receipt size={18} />}
      isAr={isAr}
      maxWidth="680px"
      maxHeight="90vh"
      bodyStyle={{ padding: 0 }}
    >

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.25rem 1.5rem', gap: '1.15rem' }}>
          
          {/* 1. PARTNER IDENTIFICATION: LOCKED TO SPECIFIC PARTNER OR SELECTION */}
          {isLockedToPartner ? (
            /* LOCKED EXECUTIVE PARTNER CARD */
            <div style={{
              background: isOwner 
                ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(184, 144, 62, 0.04) 100%)' 
                : 'linear-gradient(135deg, rgba(184, 144, 62, 0.08) 0%, rgba(184, 144, 62, 0.02) 100%)',
              border: isOwner ? '1.5px solid rgba(212, 175, 55, 0.45)' : '1.5px solid rgba(184, 144, 62, 0.35)',
              borderRadius: '12px',
              padding: '0.85rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(184, 144, 62, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: isOwner 
                    ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.35), rgba(180, 130, 30, 0.15))' 
                    : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  color: isOwner ? '#b4821e' : '#d4af37',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  border: isOwner ? '1px solid rgba(212, 175, 55, 0.5)' : '1px solid rgba(212, 175, 55, 0.3)'
                }}>
                  {isOwner ? (
                    <Crown size={20} color="#fbbf24" />
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
                        background: 'rgba(184, 144, 62, 0.18)',
                        color: '#946f23',
                        border: '1px solid rgba(184, 144, 62, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <Crown size={11} color="#946f23" />
                        {isAr ? 'المالك' : 'Owner'}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.45rem',
                        borderRadius: '4px',
                        background: '#f1f5f9',
                        color: '#475569'
                      }}>
                        {currentPartner?.roleTitleAr || (isAr ? 'شريك مساهم' : 'Partner')}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                    {isAr 
                      ? 'صرف الأرباح موجه ومقفل لهذا الشريك مباشرة' 
                      : 'Profit payout locked to this partner'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#047857', fontSize: '0.75rem', fontWeight: 800 }}>
                <ShieldCheck size={16} color="#047857" />
                <span>{isAr ? 'شريك معتمد' : 'Verified'}</span>
              </div>
            </div>
          ) : (
            /* GENERAL MODE: SELECT EXISTING PARTNER */
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {isAr ? 'اختار الشريك أو الممول المستحق للدفعة:' : 'Select Partner / Investor:'}
              </label>
              <ZFCustomSelect<string>
                value={selectedPartnerName}
                onChange={(val) => setSelectedPartnerName(val)}
                items={partnerSelectItems}
                placeholderAr="-- اضغط لاختيار الشريك المستحق --"
                placeholderEn="-- Select Partner / Investor --"
                isAr={isAr}
                searchable={true}
              />
            </div>
          )}

          {/* CURRENT PARTNER FINANCIAL BRIEF CARD */}
          {currentPartner && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.85rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.6rem'
            }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                  {isAr ? 'رأس المال المودع:' : 'Contributed Capital:'}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  <MoneyCell amount={currentPartner.totalContributedCapital} isAr={isAr} />
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                  {isAr ? 'نصيبه من التحصيلات:' : 'Collections Share:'}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1d4ed8' }}>
                  <MoneyCell amount={currentPartner.totalCollectionsShare} isAr={isAr} />
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                  {isAr ? 'أرباح مسددة سابقاً:' : 'Already Paid Out:'}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#701a75' }}>
                  <MoneyCell amount={currentPartner.totalDistributionsPaid} isAr={isAr} />
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#15803d', display: 'block', fontWeight: 700 }}>
                  {isAr ? 'صافي الرصيد القائم:' : 'Net Due Balance:'}
                </span>
                <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#15803d' }}>
                  <MoneyCell amount={currentPartner.netCurrentBalance} isAr={isAr} />
                </span>
              </div>
            </div>
          )}

          {/* AMOUNT & PROJECT ALLOCATION */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {isAr ? 'مبلغ الدفعة المراد صرفها (ج.م) *' : 'Payout Amount (EGP) *'}
              </label>
              <input
                type="number"
                min="1"
                step="500"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1.5px solid #15803d',
                  borderRadius: '8px',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  color: '#15803d'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {isAr ? 'المشروع المرتبط بالدفعة (اختياري):' : 'Linked Project (Optional):'}
              </label>
              <ZFCustomSelect<string>
                value={selectedPropertyId}
                onChange={(val) => setSelectedPropertyId(val)}
                items={propertySelectItems}
                placeholderAr="-- توزيع عام من أرباح الشركة --"
                placeholderEn="-- General Company Profit Distribution --"
                isAr={isAr}
                searchable={true}
              />
            </div>
          </div>

          {/* PAYMENT METHOD SELECTION */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                {isAr ? 'طريقة الصرف والسداد:' : 'Disbursement Method:'}
              </label>
              <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#946f23', background: 'rgba(184, 144, 62, 0.08)', padding: '0.12rem 0.45rem', borderRadius: '5px' }}>
                {isAr ? `الحساب: ${selectedAccountLabelAr}` : `Account: ${selectedAccountLabelEn}`}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setPaymentMethod('INSTAPAY_102000')}
                style={{
                  background: paymentMethod === 'INSTAPAY_102000' ? 'rgba(4, 120, 87, 0.08)' : '#ffffff',
                  border: paymentMethod === 'INSTAPAY_102000' ? '1.5px solid #047857' : '1px solid #cbd5e1',
                  borderRadius: '9px',
                  padding: '0.7rem',
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Smartphone size={18} color={paymentMethod === 'INSTAPAY_102000' ? '#047857' : '#64748b'} />
                <div>
                  <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: paymentMethod === 'INSTAPAY_102000' ? '#047857' : '#0f172a' }}>
                    {isAr ? 'تحويل إنستاباي فوري' : 'Instant InstaPay Transfer'}
                  </span>
                  <span style={{ fontSize: '0.67rem', color: '#64748b' }}>
                    {isAr ? 'تحويل إنستاباي (102000)' : 'InstaPay transfer (102000)'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CASH_101000')}
                style={{
                  background: paymentMethod === 'CASH_101000' ? 'rgba(184, 144, 62, 0.08)' : '#ffffff',
                  border: paymentMethod === 'CASH_101000' ? '1.5px solid #946f23' : '1px solid #cbd5e1',
                  borderRadius: '9px',
                  padding: '0.7rem',
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Wallet size={18} color={paymentMethod === 'CASH_101000' ? '#946f23' : '#64748b'} />
                <div>
                  <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: paymentMethod === 'CASH_101000' ? '#946f23' : '#0f172a' }}>
                    {isAr ? 'كاش نقدي باليد' : 'Cash in Hand'}
                  </span>
                  <span style={{ fontSize: '0.67rem', color: '#64748b' }}>
                    {isAr ? 'نقدي بالخزينة (101000)' : 'Cash — Safe (101000)'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* DATE & RECEIPT REF */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                {isAr ? 'تاريخ الصرف والقيد:' : 'Disbursement Date:'}
              </label>
              <input
                type="date"
                value={payoutDate}
                onChange={(e) => setPayoutDate(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.8rem',
                  color: '#0f172a'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                {isAr ? 'رقم الإشعار أو إيصال الصرف:' : 'Receipt / Reference Code:'}
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
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.8rem',
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
                  {isAr ? 'الفترة المحاسبية لتاريخ الصرف مقفلة' : 'Fiscal period is locked'}
                </strong>
                <span style={{ fontSize: '0.73rem', color: '#b91c1c' }}>
                  {isAr
                    ? `تاريخ الصرف يقع في الفترة (${targetPeriod.fiscal_year}-M${targetPeriod.period_number}) وهي مقفلة بموجب المعيار Invariant 0.9. يُرجى فتح الفترة أولاً.`
                    : `Disbursement date falls in period (${targetPeriod.fiscal_year}-M${targetPeriod.period_number}) which is locked per Invariant 0.9.`}
                </span>
              </div>
            </div>
          )}

          {/* NOTES / MEMO */}
          <div>
            <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
              {isAr ? 'البيان والملاحظات:' : 'Memo / Notes:'}
            </label>
            <input
              type="text"
              placeholder={isAr ? 'مثال: صرف دفعة أرباح مرحلية عن الربع الأول' : 'Optional memo description'}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.45rem 0.65rem',
                fontSize: '0.8rem',
                color: '#0f172a'
              }}
            />
          </div>

          {/* BALANCED JOURNAL ENTRY LIVE PREVIEW */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.03)',
            border: '1px dashed #cbd5e1',
            borderRadius: '10px',
            padding: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Scale size={14} color="#946f23" />
                <span>{isAr ? 'المعاينة اللحظية لقيد اليومية المتوازن (INV-4.1):' : 'Balanced Journal Entry Preview:'}</span>
              </span>
              <span style={{ fontSize: '0.67rem', color: '#15803d', fontWeight: 700 }}>
                {isAr ? '✓ القيد متوازن بالمليم (0.00 Delta)' : '✓ Zero Variance'}
              </span>
            </div>

            <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '380px', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ textAlign: isAr ? 'right' : 'left', padding: '0.3rem 0.4rem' }}>{isAr ? 'الحساب' : 'Account'}</th>
                    <th style={{ textAlign: isAr ? 'left' : 'right', padding: '0.3rem 0.4rem' }}>{isAr ? 'مدين' : 'Debit'}</th>
                    <th style={{ textAlign: isAr ? 'left' : 'right', padding: '0.3rem 0.4rem' }}>{isAr ? 'دائن' : 'Credit'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.35rem 0.4rem', fontWeight: 700, color: '#0f172a' }}>
                      303000 — {isAr ? 'توزيعات أرباح ومسحوبات الشركاء' : 'Partner Distributions'}
                    </td>
                    <td style={{ padding: '0.35rem 0.4rem', textAlign: isAr ? 'left' : 'right', fontWeight: 800, color: '#15803d' }}>
                      {numAmount > 0 ? numAmount.toLocaleString() : '0.00'} ج.م
                    </td>
                    <td style={{ padding: '0.35rem 0.4rem', textAlign: isAr ? 'left' : 'right', color: '#94a3b8' }}>
                      0.00
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.35rem 0.4rem', fontWeight: 700, color: '#0f172a' }}>
                      {selectedAccountCode} — {isAr ? selectedAccountLabelAr : selectedAccountLabelEn}
                    </td>
                    <td style={{ padding: '0.35rem 0.4rem', textAlign: isAr ? 'left' : 'right', color: '#94a3b8' }}>
                      0.00
                    </td>
                    <td style={{ padding: '0.35rem 0.4rem', textAlign: isAr ? 'left' : 'right', fontWeight: 800, color: '#0f172a' }}>
                      {numAmount > 0 ? numAmount.toLocaleString() : '0.00'} ج.م
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.55rem 1rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!isAmountValid || isMutating || isTargetPeriodLocked}
              style={{
                background: isAmountValid && !isMutating && !isTargetPeriodLocked ? 'linear-gradient(135deg, #15803d 0%, #166534 100%)' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 1.25rem',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#ffffff',
                cursor: isAmountValid && !isMutating && !isTargetPeriodLocked ? 'pointer' : 'not-allowed',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: isAmountValid && !isTargetPeriodLocked ? '0 4px 12px rgba(21, 128, 61, 0.25)' : 'none'
              }}
            >
              {isMutating ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>{isAr ? 'جارٍ الاعتماد والترحيل...' : 'Posting...'}</span>
                </>
              ) : isTargetPeriodLocked ? (
                <>
                  <AlertTriangle size={16} />
                  <span>{isAr ? `الفترة المحاسبية مقفلة (M${targetPeriod?.period_number ?? ''})` : `Period Locked (M${targetPeriod?.period_number ?? ''})`}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{isAr ? 'اعتماد وصرف الدفعة وترحيل القيد' : 'Confirm Payout & Post JE'}</span>
                </>
              )}
            </button>
          </div>
        </form>
    </ZFModalShell>
  );
};
