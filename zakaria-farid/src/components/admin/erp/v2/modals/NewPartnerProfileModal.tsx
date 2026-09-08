'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  UserPlus, 
  User, 
  Users,
  Phone, 
  CreditCard, 
  Landmark, 
  Building2, 
  Percent, 
  Coins, 
  ShieldCheck, 
  Calendar, 
  FileText,
  CheckCircle2,
  Wallet,
  AlertCircle,
  Smartphone,
  Banknote
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { PRIMARY_DEVELOPER_NAME } from '@/lib/erp/partnersDirectory';
import { ZFCustomSelect, ZFCustomSelectItem } from '../common/ZFCustomSelect';

export interface NewPartnerSubmitPayload {
  name: string;
  role: 'equity_partner' | 'land_partner' | 'silent_financier';
  phone: string;
  nationalId?: string;
  preferredPayoutMethod: 'INSTAPAY' | 'BANK' | 'CASH';
  instapayHandle?: string;
  bankName?: string;
  iban?: string;
  propertyId?: string;
  propertyTitle?: string;
  sharePercentage?: number;
  initialDeposit?: {
    amount: string;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000';
    receiptRef: string;
    date: string;
  };
  notes?: string;
}

interface NewPartnerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties?: Property[];
  existingPartnerNames?: string[];
  isAr?: boolean;
  isMutating?: boolean;
  onSubmit: (payload: NewPartnerSubmitPayload) => Promise<void>;
}

export const NewPartnerProfileModal: React.FC<NewPartnerProfileModalProps> = ({
  isOpen,
  onClose,
  properties = [],
  existingPartnerNames = [],
  isAr = true,
  isMutating = false,
  onSubmit
}) => {
  // Step 1: Personal Profile
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<'equity_partner' | 'land_partner' | 'silent_financier'>('equity_partner');
  const [phone, setPhone] = useState<string>('');
  const [nationalId, setNationalId] = useState<string>('');

  // Step 2: Payout Details
  const [payoutMethod, setPayoutMethod] = useState<'INSTAPAY' | 'BANK' | 'CASH'>('INSTAPAY');
  const [instapayHandle, setInstapayHandle] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [iban, setIban] = useState<string>('');

  // Step 3: Project Allocation
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [sharePct, setSharePct] = useState<string>('25');

  // Step 4: Initial Capital Deposit (Optional)
  const [includeInitialDeposit, setIncludeInitialDeposit] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000'>('CASH_101000');
  const [depositDate, setDepositDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [depositReceiptRef, setDepositReceiptRef] = useState<string>(`REC-CAP-${Date.now().toString().slice(-6)}`);

  // Notes
  const [notes, setNotes] = useState<string>('');

  const roleSelectItems = useMemo<ZFCustomSelectItem<string>[]>(() => [
    {
      value: 'equity_partner',
      labelAr: 'شريك ممول بالمشروع (حصة رأسمال وأرباح)',
      labelEn: 'Project Equity Partner',
      sublabelAr: 'مساهمة مالية مقابل حصة في أرباح المشروع',
      sublabelEn: 'Capital injection for equity profit share',
      badge: isAr ? 'رأس مال وأرباح' : 'Equity',
      badgeBg: 'rgba(148, 111, 35, 0.08)',
      badgeTextColor: '#946f23',
      icon: Users,
      iconBg: 'rgba(148, 111, 35, 0.1)',
      iconColor: '#946f23'
    },
    {
      value: 'silent_financier',
      labelAr: 'ممول صامت (عوائد استثمارية دورية)',
      labelEn: 'Silent Financier',
      sublabelAr: 'تمويل مالي دون تدخل في الإدارة',
      sublabelEn: 'Financial backing without management',
      badge: isAr ? 'عوائد دورية' : 'Financier',
      badgeBg: 'rgba(29, 78, 216, 0.08)',
      badgeTextColor: '#1d4ed8',
      icon: Coins,
      iconBg: 'rgba(29, 78, 216, 0.1)',
      iconColor: '#1d4ed8'
    },
    {
      value: 'land_partner',
      labelAr: 'شريك مساهم بالأرض (حصة من المبيعات)',
      labelEn: 'Land / Ground Partner',
      sublabelAr: 'تقديم قطعة أرض مقابل نسبة من الوحدات أو الإيرادات',
      sublabelEn: 'Land plot for sales or units share',
      badge: isAr ? 'شريك بالأرض' : 'Land',
      badgeBg: 'rgba(4, 120, 87, 0.08)',
      badgeTextColor: '#047857',
      icon: Building2,
      iconBg: 'rgba(4, 120, 87, 0.1)',
      iconColor: '#047857'
    }
  ], [isAr]);

  const propertySelectItems = useMemo<ZFCustomSelectItem<string>[]>(() => [
    {
      value: '',
      labelAr: isAr ? '-- بدون ربط بمشروع محدد حالياً (ممول عام) --' : '-- No specific project (General Financier) --',
      labelEn: '-- No specific project (General Financier) --',
      sublabelAr: isAr ? 'ممول للمحفظة العامة دون تخصيص لعمارة' : 'General portfolio investor',
      sublabelEn: 'General portfolio investor',
      badge: isAr ? 'عام' : 'General',
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
  ], [properties, isAr]);

  const depositMethodItems = useMemo<ZFCustomSelectItem<'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000'>[]>(() => [
    {
      value: 'CASH_101000',
      labelAr: 'الخزينة الرئيسية (101000) - كاش باليد',
      labelEn: 'Main Cash Safe (101000) - Cash in Hand',
      sublabelAr: 'استلام نقدية فعلية بالخزينة',
      sublabelEn: 'Physical cash received into main vault',
      badge: isAr ? 'خزينة كاش' : 'Cash',
      badgeBg: 'rgba(21, 128, 61, 0.08)',
      badgeTextColor: '#15803d',
      icon: Banknote,
      iconBg: 'rgba(21, 128, 61, 0.1)',
      iconColor: '#15803d'
    },
    {
      value: 'INSTAPAY_102000',
      labelAr: 'إنستاباي فوري (102000) - تحويل فوري',
      labelEn: 'InstaPay (102000) - Instant Transfer',
      sublabelAr: 'تحويل إلكتروني فوري بحساب إنستاباي',
      sublabelEn: 'Instant transfer via InstaPay',
      badge: isAr ? 'إنستاباي' : 'InstaPay',
      badgeBg: 'rgba(112, 26, 117, 0.08)',
      badgeTextColor: '#701a75',
      icon: Smartphone,
      iconBg: 'rgba(112, 26, 117, 0.1)',
      iconColor: '#701a75'
    }
  ], [isAr]);

  if (!isOpen) return null;

  const isNameDuplicate = existingPartnerNames.some(
    existing => existing.trim().toLowerCase() === name.trim().toLowerCase()
  );

  const numShare = parseFloat(sharePct) || 0;
  const numDeposit = parseFloat(depositAmount) || 0;

  const isValid = 
    name.trim().length >= 3 &&
    phone.trim().length >= 7 &&
    !isNameDuplicate &&
    (!includeInitialDeposit || numDeposit > 0);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isMutating) return;

    await onSubmit({
      name: name.trim(),
      role,
      phone: phone.trim(),
      nationalId: nationalId.trim() || undefined,
      preferredPayoutMethod: payoutMethod,
      instapayHandle: instapayHandle.trim() || undefined,
      bankName: bankName.trim() || undefined,
      iban: iban.trim() || undefined,
      propertyId: selectedPropertyId || undefined,
      propertyTitle: selectedProperty ? (selectedProperty.title_ar || selectedProperty.title_en) : undefined,
      sharePercentage: (selectedPropertyId && numShare > 0) ? numShare : undefined,
      initialDeposit: includeInitialDeposit && numDeposit > 0 ? {
        amount: D(numDeposit).toFixed(2),
        paymentMethod: depositPaymentMethod,
        receiptRef: depositReceiptRef,
        date: depositDate
      } : undefined,
      notes: notes.trim() || undefined
    });

    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
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
          maxWidth: '720px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* MODAL HEADER */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div 
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #b8903e 0%, #946f23 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(184, 144, 62, 0.25)'
              }}
            >
              <UserPlus size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'تسجيل وتوثيق شريك / ممول جديد' : 'Register New Partner / Financier'}
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
                  {isAr ? 'ملف استثماري موثق' : 'Verified Partner Profile'}
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                {isAr 
                  ? 'تسجيل بيانات الشريك، حسابات تحويل الأرباح، وربطه بمشاريع الشركة ونسب الشراكة' 
                  : 'Onboard a project partner, bank payout details, and portfolio equity allocation'}
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

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.25rem 1.5rem', gap: '1.25rem' }}>

          {/* SECTION 1: PERSONAL & IDENTITY DETAILS */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#0f172a', fontWeight: 800, fontSize: '0.85rem' }}>
              <User size={16} color="#946f23" />
              <span>{isAr ? '1. البيانات الشخصية والتعريفية للشريك' : '1. Personal & Identity Details'}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'اسم الشريك أو الممول بالكامل *' : 'Full Partner Name *'}
                </label>
                <input 
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: م. أحمد كمال الشريف' : 'e.g. Eng. Ahmed Kamal'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: isNameDuplicate ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    color: '#0f172a',
                    outline: 'none',
                    background: '#ffffff'
                  }}
                />
                {isNameDuplicate && (
                  <span style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '0.25rem', display: 'block' }}>
                    {isAr ? '⚠️ هذا الاسم مسجل بالفعل كشريك بالمنظومة' : 'Partner name already exists'}
                  </span>
                )}
              </div>

              {/* Partner Role */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'صفة وطبيعة الشراكة *' : 'Partner Role *'}
                </label>
                <ZFCustomSelect<string>
                  value={role}
                  onChange={(val) => setRole(val as any)}
                  items={roleSelectItems}
                  placeholderAr="-- اختار صفة الشراكة --"
                  placeholderEn="-- Select Partner Role --"
                  isAr={isAr}
                  searchable={false}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {/* Phone */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'رقم الهاتف والواتساب *' : 'Phone & WhatsApp *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="tel"
                    required
                    placeholder="010XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    dir="ltr"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                  <Phone size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              {/* National ID / CR */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'الرقم القومي أو السجل التجاري (اختياري)' : 'National ID / Tax ID (Optional)'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text"
                    placeholder="289XXXXXXXXXXXXX"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    dir="ltr"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                  <CreditCard size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PAYOUT & BANKING DETAILS */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#0f172a', fontWeight: 800, fontSize: '0.85rem' }}>
              <Landmark size={16} color="#1d4ed8" />
              <span>{isAr ? '2. بيانات تحويل وصرف الأرباح والمستحقات' : '2. Payout & Dividend Transfer Channels'}</span>
            </div>

            {/* Payout method toggle */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {isAr ? 'وسيلة التحويل المعتمدة لصرف الأرباح' : 'Preferred Payout Channel'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setPayoutMethod('INSTAPAY')}
                  style={{
                    padding: '0.55rem',
                    borderRadius: '8px',
                    border: payoutMethod === 'INSTAPAY' ? '1.5px solid #047857' : '1px solid #e2e8f0',
                    background: payoutMethod === 'INSTAPAY' ? 'rgba(4, 120, 87, 0.08)' : '#f8fafc',
                    color: payoutMethod === 'INSTAPAY' ? '#047857' : '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  ⚡ {isAr ? 'إنستاباي فوري (IPA)' : 'InstaPay'}
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutMethod('CASH')}
                  style={{
                    padding: '0.55rem',
                    borderRadius: '8px',
                    border: payoutMethod === 'CASH' ? '1.5px solid #b8903e' : '1px solid #e2e8f0',
                    background: payoutMethod === 'CASH' ? 'rgba(184, 144, 62, 0.08)' : '#f8fafc',
                    color: payoutMethod === 'CASH' ? '#946f23' : '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  💵 {isAr ? 'نقداً من الخزينة' : 'Cash Safe'}
                </button>
              </div>
            </div>

            {payoutMethod === 'INSTAPAY' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'عنوان إنستاباي (IPA) أو رقم الموبايل المسجل *' : 'InstaPay Address (IPA) or Mobile *'}
                </label>
                <input 
                  type="text"
                  placeholder="name@instapay أو 010XXXXXXXX"
                  value={instapayHandle}
                  onChange={(e) => setInstapayHandle(e.target.value)}
                  dir="ltr"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>
            ) : (
              <div style={{
                fontSize: '0.73rem',
                color: '#64748b',
                background: '#f8fafc',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px dashed #cbd5e1',
                lineHeight: 1.4
              }}>
                {isAr 
                  ? '✓ يتم صرف وتوزيعات الأرباح نقداً باليد من خزينة الشركة الرئيسية بموجب سند صرف رسمي.' 
                  : '✓ Dividends will be disbursed in cash from the company safe.'}
              </div>
            )}
          </div>

          {/* SECTION 3: PROJECT ALLOCATION & EQUITY SHARE */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#0f172a', fontWeight: 800, fontSize: '0.85rem' }}>
              <Building2 size={16} color="#047857" />
              <span>{isAr ? '3. ربط الشريك بالمشروع وتخصيص نسبة الشراكة' : '3. Project Allocation & Equity Share'}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '0.75rem' }}>
              {/* Target Property */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'المشروع أو العمارة المراد تخصيص حصة بها' : 'Target Portfolio Property'}
                </label>
                <ZFCustomSelect<string>
                  value={selectedPropertyId}
                  onChange={(val) => setSelectedPropertyId(val)}
                  items={propertySelectItems}
                  placeholderAr="-- بدون ربط بمشروع محدد حالياً --"
                  placeholderEn="-- No specific project --"
                  isAr={isAr}
                  searchable={true}
                />
              </div>

              {/* Share Percentage */}
              {selectedPropertyId && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    {isAr ? 'نسبة الشراكة / الأرباح بالمشروع (%)' : 'Equity Share (%)'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="number"
                      min="1"
                      max="90"
                      step="1"
                      value={sharePct}
                      onChange={(e) => setSharePct(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem 0.55rem 2rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        outline: 'none'
                      }}
                    />
                    <Percent size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>
              )}
            </div>

            {selectedPropertyId && (
              <div style={{
                background: 'rgba(184, 144, 62, 0.08)',
                border: '1px solid rgba(184, 144, 62, 0.25)',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.74rem',
                color: '#854d0e',
                lineHeight: 1.5
              }}>
                ℹ️ {isAr 
                  ? `سيتم خصم نسبة (${numShare}%) تلقائياً من حصة المطور الرئيسي (${PRIMARY_DEVELOPER_NAME}) ليظل مجموع حصص الشركاء في المشروع 100% بالضبط وفق معايير الحوكمة المالية.`
                  : `This ${numShare}% will be deducted from ${PRIMARY_DEVELOPER_NAME}'s developer share, keeping total property equity at exactly 100%.`}
              </div>
            )}
          </div>

          {/* SECTION 4: INITIAL CAPITAL DEPOSIT (OPTIONAL) */}
          <div style={{
            background: includeInitialDeposit ? '#f8fafc' : '#ffffff',
            border: includeInitialDeposit ? '1.5px solid #10b981' : '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            transition: 'all 0.15s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#0f172a', fontWeight: 800, fontSize: '0.85rem' }}>
                <Coins size={16} color="#047857" />
                <span>{isAr ? '4. تسجيل إيداع رأس مال مبدئي (اختياري)' : '4. Initial Capital Contribution (Optional)'}</span>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800, color: '#047857' }}>
                <input 
                  type="checkbox"
                  checked={includeInitialDeposit}
                  onChange={(e) => setIncludeInitialDeposit(e.target.checked)}
                  style={{ accentColor: '#047857', width: '16px', height: '16px' }}
                />
                <span>{isAr ? 'إيداع مبلغ نقدي الآن' : 'Deposit funds now'}</span>
              </label>
            </div>

            {includeInitialDeposit && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                  {/* Amount */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {isAr ? 'مبلغ الإيداع (جنيه مصري) *' : 'Deposit Amount (EGP) *'}
                    </label>
                    <input 
                      type="number"
                      required={includeInitialDeposit}
                      min="1000"
                      placeholder="مثال: 5000000"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {isAr ? 'طريقة الاستلام والقيد المحاسبي *' : 'Payment Account *'}
                    </label>
                    <ZFCustomSelect<'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000'>
                      value={depositPaymentMethod}
                      onChange={(val) => setDepositPaymentMethod(val)}
                      items={depositMethodItems}
                      placeholderAr="-- اختار طريقة الاستلام --"
                      placeholderEn="-- Select Payment Method --"
                      isAr={isAr}
                      searchable={false}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  {/* Date */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {isAr ? 'تاريخ استلام المساهمة' : 'Deposit Date'}
                    </label>
                    <input 
                      type="date"
                      value={depositDate}
                      onChange={(e) => setDepositDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        color: '#0f172a',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Receipt Ref */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      {isAr ? 'رقم الإيصال / مرجع المعاملة' : 'Receipt / Ref #'}
                    </label>
                    <input 
                      type="text"
                      value={depositReceiptRef}
                      onChange={(e) => setDepositReceiptRef(e.target.value)}
                      placeholder={isAr ? 'مثال: REC-2026-088' : 'e.g. REC-2026-088'}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        color: '#0f172a',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{
                  fontSize: '0.72rem',
                  color: '#047857',
                  background: 'rgba(4, 120, 87, 0.08)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  fontWeight: 600
                }}>
                  ✓ سيتم ترحيل قيد يومية متوازن تلقائياً: (مدين: الخزينة/إنستاباي 101000/102000 | دائن: رأس مال الشركاء 301000).
                </div>
              </div>
            )}
          </div>

          {/* NOTES */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              {isAr ? 'ملاحظات وبنود تعاقدية إضافية' : 'Notes & Contractual Terms'}
            </label>
            <textarea 
              rows={2}
              placeholder={isAr ? 'اكتب أي بنود خاصة بالاتفاق أو شروط السداد...' : 'Enter any special clauses...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                color: '#0f172a',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          {/* MODAL FOOTER */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.82rem',
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
                padding: '0.65rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: isValid && !isMutating 
                  ? 'linear-gradient(135deg, #b8903e 0%, #946f23 100%)' 
                  : '#cbd5e1',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: isValid && !isMutating ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: isValid && !isMutating ? '0 4px 12px rgba(184, 144, 62, 0.3)' : 'none'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{isMutating ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'توثيق واعتماد الشريك الجديد' : 'Save & Register Partner')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
