'use client';
/* eslint-disable react-hooks/purity */

import React, { useState } from 'react';
import {
  UserPlus,
  Wallet,
  Smartphone
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { ZFModalShell } from '../common/ZFModalShell';
import {
  ZFField,
  ZFMoneyInput,
  ZFChoices,
  ZFFormFooter,
  zfForm
} from '../common/ZFForm';
import shellStyles from '../ZFWorkstationShell.module.css';

export interface NewPartnerSubmitPayload {
  name: string;
  role: 'equity_partner' | 'land_partner' | 'silent_financier';
  phone: string;
  email?: string;
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
  // Details
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<'equity_partner' | 'land_partner' | 'silent_financier'>('equity_partner');
  const [phone, setPhone] = useState<string>('');
  const [nationalId, setNationalId] = useState<string>('');

  // Payout Details
  const [payoutMethod, setPayoutMethod] = useState<'INSTAPAY' | 'BANK' | 'CASH'>('INSTAPAY');
  const [instapayHandle, setInstapayHandle] = useState<string>('');
  const [bankName] = useState<string>('');
  const [iban] = useState<string>('');

  // Project Allocation & Share
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [sharePct, setSharePct] = useState<string>('25');

  // Initial Capital Deposit (Optional)
  const [includeInitialDeposit, setIncludeInitialDeposit] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000'>('CASH_101000');
  const [depositDate, setDepositDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [depositReceiptRef, setDepositReceiptRef] = useState<string>(`REC-CAP-${Date.now().toString().slice(-6)}`);

  // Notes
  const [notes, setNotes] = useState<string>('');

  const isNameDuplicate = existingPartnerNames.some(
    existing => existing.trim().toLowerCase() === name.trim().toLowerCase()
  );

  const numShare = parseFloat(sharePct) || 0;
  const numDeposit = parseFloat(depositAmount) || 0;

  const isValid = 
    name.trim().length >= 3 &&
    phone.trim().length >= 7 &&
    !isNameDuplicate &&
    (!includeInitialDeposit || numDeposit > 0) &&
    (payoutMethod !== 'INSTAPAY' || instapayHandle.trim().length > 0) &&
    (payoutMethod !== 'BANK' || (bankName.trim().length > 0 && iban.trim().length > 0));

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

  const footer = (
    <ZFFormFooter>
      <button type="button" className={shellStyles.btnSecondary} onClick={onClose}>
        {isAr ? 'إلغاء' : 'Cancel'}
      </button>
      <button
        type="submit"
        form="zf-partner-form"
        className={shellStyles.btnPrimary}
        disabled={!isValid || isMutating}
      >
        {isMutating ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'حفظ الشريك' : 'Save partner')}
      </button>
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'شريك جديد' : 'New partner'}
      subtitle={
        isAr
          ? 'بيانات الشريك وطريقة صرف أرباحه. يمكنك تسجيل أول إيداع له الآن أو لاحقاً.'
          : 'Partner details and how profit is paid. Record a first deposit now or later.'
      }
      icon={<UserPlus size={18} />}
      isAr={isAr}
      maxWidth="640px"
      footer={footer}
    >
      <form id="zf-partner-form" className={zfForm.form} onSubmit={handleSubmit}>
        {/* Section 1: Details */}
        <div className={zfForm.section}>
          <h4 className={zfForm.sectionTitle}>{isAr ? 'البيانات' : 'Details'}</h4>
          <div className={zfForm.row}>
            <ZFField
              label={isAr ? 'الاسم' : 'Name'}
              required
              error={isNameDuplicate ? (isAr ? 'هذا الاسم مسجل بالفعل كشريك' : 'Name already registered') : undefined}
            >
              <input
                type="text"
                className={zfForm.control}
                placeholder={isAr ? 'الاسم بالكامل' : 'Full name'}
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                required
              />
            </ZFField>
            <ZFField label={isAr ? 'الهاتف' : 'Phone'} required>
              <input
                type="tel"
                className={zfForm.control}
                dir="ltr"
                placeholder="010XXXXXXXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </ZFField>
          </div>

          <div className={zfForm.row}>
            <ZFField label={isAr ? 'الرقم القومي أو السجل التجاري' : 'National ID or CR'}>
              <input
                type="text"
                className={`${zfForm.control} ${zfForm.mono}`}
                placeholder="289XXXXXXXXXXXXX"
                value={nationalId}
                onChange={e => setNationalId(e.target.value)}
              />
            </ZFField>
            <div />
          </div>

          <ZFField label={isAr ? 'نوع الشراكة' : 'Partnership type'}>
            <ZFChoices
              value={role}
              onChange={setRole}
              options={[
                {
                  id: 'equity_partner',
                  label: isAr ? 'شريك بحصة' : 'Equity partner',
                  sub: isAr ? 'يموّل ويأخذ نسبة من الربح' : 'Funds and takes a profit share'
                },
                {
                  id: 'land_partner',
                  label: isAr ? 'شريك بالأرض' : 'Land partner',
                  sub: isAr ? 'يقدم الأرض مقابل حصة' : 'Brings the land for a share'
                },
                {
                  id: 'silent_financier',
                  label: isAr ? 'ممول' : 'Financier',
                  sub: isAr ? 'يموّل بعائد دون إدارة' : 'Funds for a return, no management role'
                }
              ]}
            />
          </ZFField>
        </div>

        {/* Section 2: Project & share */}
        <div className={zfForm.section}>
          <h4 className={zfForm.sectionTitle}>{isAr ? 'المشروع والحصة' : 'Project & share'}</h4>
          <div className={zfForm.row}>
            <ZFField label={isAr ? 'المشروع' : 'Project'}>
              <select
                className={zfForm.control}
                value={selectedPropertyId}
                onChange={e => setSelectedPropertyId(e.target.value)}
              >
                <option value="">{isAr ? 'بدون مشروع الآن' : 'No project yet'}</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar)}
                  </option>
                ))}
              </select>
            </ZFField>
            <ZFField label={isAr ? 'نسبة الحصة' : 'Share %'}>
              <input
                type="number"
                min={0}
                max={100}
                step="any"
                className={zfForm.control}
                value={sharePct}
                onChange={e => setSharePct(e.target.value)}
              />
            </ZFField>
          </div>
        </div>

        {/* Section 3: Profit payout */}
        <div className={zfForm.section}>
          <h4 className={zfForm.sectionTitle}>{isAr ? 'صرف الأرباح' : 'Profit payout'}</h4>
          <ZFChoices<'INSTAPAY' | 'CASH'>
            value={payoutMethod === 'BANK' ? 'INSTAPAY' : payoutMethod}
            onChange={setPayoutMethod}
            options={[
              {
                id: 'INSTAPAY',
                label: isAr ? 'إنستاباي' : 'InstaPay',
                sub: isAr ? 'تحويل لحسابه' : 'Transfer to their account',
                icon: <Smartphone size={16} />
              },
              {
                id: 'CASH',
                label: isAr ? 'نقداً' : 'Cash',
                sub: isAr ? 'استلام من الخزينة' : 'Collected from the safe',
                icon: <Wallet size={16} />
              }
            ]}
          />
          {payoutMethod === 'INSTAPAY' && (
            <ZFField label={isAr ? 'عنوان إنستاباي أو رقم الموبايل' : 'InstaPay address or mobile'} required>
              <input
                type="text"
                className={zfForm.control}
                dir="ltr"
                placeholder="name@instapay"
                value={instapayHandle}
                onChange={e => setInstapayHandle(e.target.value)}
                required
              />
            </ZFField>
          )}
        </div>

        {/* Section 4: First deposit */}
        <div className={zfForm.section}>
          <h4 className={zfForm.sectionTitle}>{isAr ? 'أول إيداع' : 'First deposit'}</h4>
          <label className={zfForm.labelRow}>
            <span className={zfForm.label}>
              <input
                type="checkbox"
                checked={includeInitialDeposit}
                onChange={e => setIncludeInitialDeposit(e.target.checked)}
              />{' '}
              {isAr ? 'تسجيل أول إيداع الآن' : 'Record a first deposit now'}
            </span>
          </label>
          {includeInitialDeposit && (
            <>
              <div className={zfForm.row}>
                <ZFField label={isAr ? 'المبلغ' : 'Amount'} required>
                  <ZFMoneyInput
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    unit={isAr ? 'ج.م' : 'EGP'}
                    required
                  />
                </ZFField>
                <ZFField label={isAr ? 'التاريخ' : 'Date'} required>
                  <input
                    type="date"
                    className={zfForm.control}
                    value={depositDate}
                    onChange={e => setDepositDate(e.target.value)}
                    required
                  />
                </ZFField>
              </div>
              <ZFField label={isAr ? 'طريقة الاستلام' : 'Received by'}>
                <ZFChoices<'CASH_101000' | 'INSTAPAY_102000'>
                  value={depositPaymentMethod === 'BANK_102000' ? 'CASH_101000' : depositPaymentMethod}
                  onChange={setDepositPaymentMethod}
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
              <ZFField label={isAr ? 'رقم الإيصال' : 'Receipt no.'}>
                <input
                  type="text"
                  className={`${zfForm.control} ${zfForm.mono}`}
                  value={depositReceiptRef}
                  onChange={e => setDepositReceiptRef(e.target.value)}
                />
              </ZFField>
            </>
          )}
        </div>

        {/* Notes */}
        <ZFField label={isAr ? 'ملاحظات' : 'Notes'}>
          <textarea
            className={zfForm.control}
            rows={2}
            placeholder={isAr ? 'اختياري' : 'Optional'}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </ZFField>
      </form>
    </ZFModalShell>
  );
};
