'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Wallet, 
  Landmark, 
  ShieldCheck, 
  Calendar, 
  FileText,
  User,
  Building2,
  Scale,
  PlusCircle,
  Coins,
  Phone,
  CreditCard,
  Percent
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import { PartnerFinancialSummary } from '@/lib/erp/partnersEngine';
import { Property } from '@/lib/supabase/types';

interface PartnerCapitalInjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: PartnerFinancialSummary[];
  initialPartnerName?: string;
  properties?: Property[];
  isAr?: boolean;
  isMutating?: boolean;
  onConfirmInjection: (details: {
    partnerName: string;
    amount: string;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000';
    propertyId?: string;
    propertyTitle?: string;
    injectionDate: string;
    receiptRef: string;
    memo: string;
    role?: 'equity_partner' | 'land_partner' | 'silent_financier';
    phone?: string;
    nationalId?: string;
    projectSharePct?: number;
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
  onConfirmInjection
}) => {
  const isLockedToPartner = Boolean(initialPartnerName);
  const [partnerMode, setPartnerMode] = useState<'existing' | 'new'>('existing');
  const [selectedPartnerName, setSelectedPartnerName] = useState<string>('');
  
  // Extended New Partner Profile Fields
  const [newPartnerName, setNewPartnerName] = useState<string>('');
  const [newPartnerRole, setNewPartnerRole] = useState<'equity_partner' | 'land_partner' | 'silent_financier'>('equity_partner');
  const [newPartnerPhone, setNewPartnerPhone] = useState<string>('');
  const [newPartnerNationalId, setNewPartnerNationalId] = useState<string>('');
  const [projectSharePct, setProjectSharePct] = useState<string>('25');

  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000'>('BANK_102000');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [injectionDate, setInjectionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receiptRef, setReceiptRef] = useState<string>(`REC-CAP-${Date.now().toString().slice(-6)}`);
  const [memo, setMemo] = useState<string>('');

  useEffect(() => {
    if (initialPartnerName) {
      setSelectedPartnerName(initialPartnerName);
      setPartnerMode('existing');
    } else if (partners.length > 0 && !selectedPartnerName) {
      setSelectedPartnerName(partners[0].partnerName);
    }
  }, [partners, selectedPartnerName, initialPartnerName]);

  if (!isOpen) return null;

  const effectivePartnerName = isLockedToPartner 
    ? initialPartnerName! 
    : (partnerMode === 'existing' ? selectedPartnerName : newPartnerName.trim());
    
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const matchedExistingPartner = partners.find(p => p.partnerName === effectivePartnerName);

  const numAmount = parseFloat(amount) || 0;
  const isValid = effectivePartnerName.length > 0 && numAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isMutating) return;

    const shareNum = parseFloat(projectSharePct) || 0;

    await onConfirmInjection({
      partnerName: effectivePartnerName,
      amount: D(numAmount).toFixed(2),
      paymentMethod,
      propertyId: selectedPropertyId || undefined,
      propertyTitle: selectedProperty ? (selectedProperty.title_ar || selectedProperty.title_en) : undefined,
      injectionDate,
      receiptRef,
      memo: memo || `إيداع مساهمة رأس مال جديدة من الشريك: ${effectivePartnerName}`,
      role: partnerMode === 'new' ? newPartnerRole : undefined,
      phone: partnerMode === 'new' ? newPartnerPhone.trim() || undefined : undefined,
      nationalId: partnerMode === 'new' ? newPartnerNationalId.trim() || undefined : undefined,
      projectSharePct: (partnerMode === 'new' && selectedPropertyId && shareNum > 0) ? shareNum : undefined
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
              background: 'linear-gradient(135deg, rgba(184, 144, 62, 0.08) 0%, rgba(184, 144, 62, 0.02) 100%)',
              border: '1.5px solid rgba(184, 144, 62, 0.35)',
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
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  color: '#d4af37',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  border: '1px solid rgba(212, 175, 55, 0.3)'
                }}>
                  {(initialPartnerName || '').charAt(0)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                      {initialPartnerName}
                    </span>
                    {matchedExistingPartner && (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.45rem',
                        borderRadius: '4px',
                        background: '#f1f5f9',
                        color: '#475569'
                      }}>
                        {matchedExistingPartner.roleTitleAr}
                      </span>
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
                <ShieldCheck size={16} />
                <span>{isAr ? 'شريك معتمد' : 'Verified'}</span>
              </div>
            </div>
          ) : (
            /* GENERAL MODE: TOGGLE BETWEEN EXISTING OR NEW PARTNER */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{
                display: 'flex',
                background: '#f1f5f9',
                borderRadius: '8px',
                padding: '0.25rem',
                gap: '0.25rem'
              }}>
                <button
                  type="button"
                  onClick={() => setPartnerMode('existing')}
                  style={{
                    flex: 1,
                    padding: '0.45rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: partnerMode === 'existing' ? '#ffffff' : 'transparent',
                    color: partnerMode === 'existing' ? '#0f172a' : '#64748b',
                    fontWeight: partnerMode === 'existing' ? 800 : 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    boxShadow: partnerMode === 'existing' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  {isAr ? 'شريك مسجل بالنظام' : 'Existing Partner'}
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerMode('new')}
                  style={{
                    flex: 1,
                    padding: '0.45rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: partnerMode === 'new' ? '#ffffff' : 'transparent',
                    color: partnerMode === 'new' ? '#0f172a' : '#64748b',
                    fontWeight: partnerMode === 'new' ? 800 : 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    boxShadow: partnerMode === 'new' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  {isAr ? '+ شريك / ممول استثماري جديد' : '+ New Partner / Financier'}
                </button>
              </div>

              {partnerMode === 'existing' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    {isAr ? 'اختار الشريك المساهم:' : 'Select Partner:'}
                  </label>
                  <select
                    value={selectedPartnerName}
                    onChange={(e) => setSelectedPartnerName(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {partners.map(p => (
                      <option key={p.partnerName} value={p.partnerName}>
                        {p.partnerName} ({p.roleTitleAr})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* EXTENDED PROFILE FOR NEW PARTNER */
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                        {isAr ? 'اسم الشريك أو الممول بالكامل *' : 'Full Name *'}
                      </label>
                      <input
                        type="text"
                        placeholder={isAr ? 'مثال: م. سمير عبد الرازق' : 'Partner full name'}
                        value={newPartnerName}
                        onChange={(e) => setNewPartnerName(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '0.45rem 0.65rem',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#0f172a'
                        }}
                        required={partnerMode === 'new'}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                        {isAr ? 'صفة الشراكة ودور الممول *' : 'Partnership Role *'}
                      </label>
                      <select
                        value={newPartnerRole}
                        onChange={(e) => setNewPartnerRole(e.target.value as any)}
                        style={{
                          width: '100%',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '0.45rem 0.65rem',
                          fontSize: '0.82rem',
                          color: '#0f172a'
                        }}
                      >
                        <option value="equity_partner">{isAr ? 'شريك ممول بالمشروع (Equity Partner)' : 'Equity Partner'}</option>
                        <option value="land_partner">{isAr ? 'شريك مساهم بالأرض (Land Partner)' : 'Land Partner'}</option>
                        <option value="silent_financier">{isAr ? 'ممول صامت بنسبة أرباح (Silent Financier)' : 'Silent Financier'}</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                        {isAr ? 'رقم الهاتف / الواتساب' : 'Phone / WhatsApp'}
                      </label>
                      <input
                        type="tel"
                        placeholder="01012345678"
                        value={newPartnerPhone}
                        onChange={(e) => setNewPartnerPhone(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '0.45rem 0.65rem',
                          fontSize: '0.82rem',
                          color: '#0f172a',
                          direction: 'ltr'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                        {isAr ? 'الرقم القومي / السجل التجاري' : 'National ID / Tax ID'}
                      </label>
                      <input
                        type="text"
                        placeholder="29012345678901"
                        value={newPartnerNationalId}
                        onChange={(e) => setNewPartnerNationalId(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '0.45rem 0.65rem',
                          fontSize: '0.82rem',
                          color: '#0f172a',
                          direction: 'ltr'
                        }}
                      />
                    </div>
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
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.82rem',
                  color: '#0f172a'
                }}
              >
                <option value="">{isAr ? '-- رأس مال عام لمحفظة الشركة --' : '-- General Portfolio Capital --'}</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title_ar || p.title_en} ({p.location || 'الشرقية'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* If new partner and property is selected, show equity share % */}
          {partnerMode === 'new' && selectedPropertyId && (
            <div style={{
              background: 'rgba(184, 144, 62, 0.06)',
              border: '1px solid rgba(184, 144, 62, 0.25)',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#946f23' }}>
                  {isAr ? 'نسبة حصة الشريك في هذا العقار (%)' : 'Property Equity Share %'}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  {isAr ? 'سيتم تعديل حصة زكريا فريد تلقائياً ليظل المجموع 100%' : 'Auto-balanced with Zakaria Farid'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={projectSharePct}
                  onChange={(e) => setProjectSharePct(e.target.value)}
                  style={{
                    width: '70px',
                    textAlign: 'center',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    padding: '0.35rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1'
                  }}
                />
                <span style={{ fontWeight: 800, color: '#946f23' }}>%</span>
              </div>
            </div>
          )}

          {/* 3. PAYMENT DESTINATION */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              {isAr ? 'جهة استلام وتوريد الفلوس:' : 'Receiving Treasury / Account:'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setPaymentMethod('BANK_102000')}
                style={{
                  padding: '0.6rem 0.5rem',
                  borderRadius: '8px',
                  border: paymentMethod === 'BANK_102000' ? '2px solid #1d4ed8' : '1px solid #e2e8f0',
                  background: paymentMethod === 'BANK_102000' ? 'rgba(29, 78, 216, 0.05)' : '#ffffff',
                  color: paymentMethod === 'BANK_102000' ? '#1d4ed8' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Landmark size={18} />
                <span>{isAr ? 'البنك (102000)' : 'Bank'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('INSTAPAY_102000')}
                style={{
                  padding: '0.6rem 0.5rem',
                  borderRadius: '8px',
                  border: paymentMethod === 'INSTAPAY_102000' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                  background: paymentMethod === 'INSTAPAY_102000' ? 'rgba(124, 58, 237, 0.05)' : '#ffffff',
                  color: paymentMethod === 'INSTAPAY_102000' ? '#7c3aed' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Coins size={18} />
                <span>{isAr ? 'إنستاباي (102000)' : 'InstaPay'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CASH_101000')}
                style={{
                  padding: '0.6rem 0.5rem',
                  borderRadius: '8px',
                  border: paymentMethod === 'CASH_101000' ? '2px solid #059669' : '1px solid #e2e8f0',
                  background: paymentMethod === 'CASH_101000' ? 'rgba(5, 150, 105, 0.05)' : '#ffffff',
                  color: paymentMethod === 'CASH_101000' ? '#059669' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Wallet size={18} />
                <span>{isAr ? 'الخزينة كاش (101000)' : 'Cash Safe'}</span>
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
