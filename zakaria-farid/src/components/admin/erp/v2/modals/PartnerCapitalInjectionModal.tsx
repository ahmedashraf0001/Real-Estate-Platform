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
  Crown
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import { PartnerFinancialSummary } from '@/lib/erp/partnersEngine';
import { Property } from '@/lib/supabase/types';
import { ZFCustomSelect, ZFCustomSelectItem } from '../common/ZFCustomSelect';
import { PRIMARY_DEVELOPER_NAME } from '@/lib/erp/partnersDirectory';

interface PartnerCapitalInjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: PartnerFinancialSummary[];
  initialPartnerName?: string;
  properties?: Property[];
  isAr?: boolean;
  isMutating?: boolean;
  onOpenNewPartnerModal?: () => void;
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

export const PartnerCapitalInjectionModal: React.FC<PartnerCapitalInjectionModalProps> = ({
  isOpen,
  onClose,
  partners,
  initialPartnerName,
  properties = [],
  isAr = true,
  isMutating = false,
  onOpenNewPartnerModal,
  onConfirmInjection
}) => {
  const isLockedToPartner = Boolean(initialPartnerName && initialPartnerName.trim());
  const [selectedPartnerName, setSelectedPartnerName] = useState<string>(initialPartnerName?.trim() || (partners[0]?.partnerName || ''));
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000'>('CASH_101000');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [injectionDate, setInjectionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receiptRef, setReceiptRef] = useState<string>(`REC-CAP-${Date.now().toString().slice(-6)}`);
  const [memo, setMemo] = useState<string>('');

  useEffect(() => {
    if (initialPartnerName && initialPartnerName.trim()) {
      setSelectedPartnerName(initialPartnerName.trim());
    } else if (partners.length > 0 && !selectedPartnerName) {
      setSelectedPartnerName(partners[0].partnerName);
    }
  }, [partners, selectedPartnerName, initialPartnerName]);

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
        badgeBg: isOwner ? 'rgba(184, 144, 62, 0.18)' : 'rgba(148, 111, 35, 0.08)',
        badgeTextColor: '#946f23',
        icon: isOwner ? Crown : Users,
        iconBg: isOwner ? 'rgba(184, 144, 62, 0.15)' : 'rgba(148, 111, 35, 0.1)',
        iconColor: '#946f23'
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
      ...properties.map(p => ({
        value: p.id,
        labelAr: p.title_ar || p.title_en || '',
        labelEn: p.title_en || p.title_ar || '',
        sublabelAr: `${p.location || 'الشرقية'} • ${p.area_sqm || 0} م²`,
        sublabelEn: `${p.location || 'Sharkia'} • ${p.area_sqm || 0} sqm`,
        badge: p.completion_status === 'ready' ? (isAr ? 'جاهز' : 'Ready') : (isAr ? 'قيد التطوير' : 'In Progress'),
        badgeBg: p.completion_status === 'ready' ? 'rgba(21, 128, 61, 0.08)' : 'rgba(148, 111, 35, 0.08)',
        badgeTextColor: p.completion_status === 'ready' ? '#15803d' : '#946f23',
        icon: Building2,
        iconBg: 'rgba(148, 111, 35, 0.1)',
        iconColor: '#946f23'
      }))
    ];
  }, [properties, isAr]);

  if (!isOpen) return null;

  const effectivePartnerName = (isLockedToPartner ? initialPartnerName!.trim() : selectedPartnerName) || '';
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const matchedExistingPartner = partners.find(p => p.partnerName === effectivePartnerName);
  const isOwner = Boolean(
    effectivePartnerName === PRIMARY_DEVELOPER_NAME ||
    effectivePartnerName.includes('زكريا فريد') ||
    matchedExistingPartner?.isPermanent
  );

  const numAmount = parseFloat(amount) || 0;
  const isValid = effectivePartnerName.length > 0 && numAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isMutating) return;

    await onConfirmInjection({
      partnerName: effectivePartnerName,
      amount: D(numAmount).toFixed(2),
      paymentMethod,
      propertyId: selectedPropertyId || undefined,
      propertyTitle: selectedProperty ? (selectedProperty.title_ar || selectedProperty.title_en) : undefined,
      injectionDate,
      receiptRef,
      memo: memo || `إيداع مساهمة رأس مال جديدة من الشريك: ${effectivePartnerName}`
    });

    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
        direction: isAr ? 'rtl' : 'ltr'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* HEADER */}
        <div 
          style={{
            padding: '1.2rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div 
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #b8903e 0%, #946f23 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(184, 144, 62, 0.25)'
              }}
            >
              <Coins size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'إثبات ضخ مساهمة رأس مال' : 'Capital Contribution Injection'}
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  background: 'rgba(184, 144, 62, 0.12)',
                  color: '#946f23',
                  border: '1px solid rgba(184, 144, 62, 0.25)'
                }}>
                  {isAr ? 'حـ/ 301000 رأس مال' : 'GL 301000 Equity'}
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                {isAr 
                  ? 'إثبات قيد إيداع بالخزينة أو البنك وتحديث حصة الشريك وصافي مستحقاته بالمليم' 
                  : 'Balanced immutable double-entry injection into company cash or bank'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* FORM */}
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
            /* GENERAL MODE: SELECT EXISTING PARTNER + LINK TO DEDICATED ONBOARDING MODAL */
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
                      color: '#946f23',
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

          {/* 2. AMOUNT & PROJECT ALLOCATION */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {isAr ? 'مبلغ المساهمة المودع (ج.م) *' : 'Injected Capital Amount (EGP) *'}
              </label>
              <input
                type="number"
                min="1"
                step="5000"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1.5px solid #946f23',
                  borderRadius: '8px',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  color: '#946f23'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {isAr ? 'المشروع المستهدف بالتمويل والشراكة:' : 'Target Project:'}
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

          {/* 3. PAYMENT DESTINATION */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              {isAr ? 'جهة استلام وتوريد الفلوس:' : 'Receiving Treasury / Account:'}
            </label>
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
                <span>{isAr ? 'خزينة النقدية (101000)' : 'Cash Safe (101000)'}</span>
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
                <span>{isAr ? 'إنستاباي فوري (102000)' : 'InstaPay (102000)'}</span>
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
                {isAr ? 'رقم إشعار / مرجع التوريد:' : 'Receipt Ref:'}
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
              <Scale size={14} color="#946f23" />
              <span>{isAr ? 'معاينة القيد المحاسبي المتوازن بالمليم:' : 'Balanced Double-Entry Preview:'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857', fontWeight: 700, marginBottom: '0.2rem' }}>
              <span>
                {paymentMethod === 'CASH_101000' 
                  ? (isAr ? 'من حـ/ 101000 (الخزينة النقدية الرئيسية)' : 'Dr 101000 Cash Safe')
                  : (isAr ? 'من حـ/ 102000 (حسابات البنوك والتحويلات)' : 'Dr 102000 Bank Accounts')}
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
              disabled={!isValid || isMutating}
              style={{
                padding: '0.55rem 1.45rem',
                borderRadius: '8px',
                border: 'none',
                background: !isValid || isMutating ? '#94a3b8' : 'linear-gradient(135deg, #b8903e 0%, #946f23 100%)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: !isValid || isMutating ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: !isValid || isMutating ? 'none' : '0 4px 12px rgba(184, 144, 62, 0.3)'
              }}
            >
              <CheckCircle2 size={16} />
              <span>
                {isMutating 
                  ? (isAr ? 'جاري ترحيل القيد...' : 'Posting...') 
                  : (isAr ? 'اعتماد المساهمة وترحيل القيد' : 'Commit & Post to GL')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
