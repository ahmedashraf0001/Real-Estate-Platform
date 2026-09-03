'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  X, 
  Loader2, 
  Building2, 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ShieldCheck, 
  Users, 
  Trash2,
  ArrowRight,
  ArrowLeft,
  Coins,
  Percent,
  Wallet,
  Landmark
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { 
  ERPContract, 
  ERPInstallmentSchedule, 
  ERPAccountingPeriod 
} from '@/lib/erp/types';
import { 
  PartnerShareItem, 
  PRIMARY_DEVELOPER_NAME, 
  normalizePartnerSplits, 
  smartAddPartner, 
  smartRemovePartner, 
  autoBalanceShares 
} from '@/lib/erp/partnersDirectory';
import { D } from '@/lib/erp/math';
import { ZFCustomSelect, ZFCustomSelectSection, ZFCustomSelectItem } from '../common/ZFCustomSelect';
import { MoneyCell } from '@/components/erp/MoneyCell';
import styles from '../ZFWorkstationShell.module.css';

interface NewContractWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  contracts: ERPContract[];
  leads?: any[];
  activePeriod: ERPAccountingPeriod;
  unifiedPartners: Array<{ name: string; role: string }>;
  isMutating?: boolean;
  isAr?: boolean;
  onContractCreated: (contractData: any) => Promise<void>;
}

export const NewContractWizardModal: React.FC<NewContractWizardModalProps> = ({
  isOpen,
  onClose,
  properties,
  contracts,
  leads = [],
  activePeriod,
  unifiedPartners,
  isMutating = false,
  isAr = true,
  onContractCreated
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [contractErrors, setContractErrors] = useState<Record<string, string>>({});

  // Step 1: Unit & Buyer
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedBuildingUnitId, setSelectedBuildingUnitId] = useState<string>('');
  const [customUnitName, setCustomUnitName] = useState<string>('');
  const [leadSelectionMode, setLeadSelectionMode] = useState<'EXISTING_LEAD' | 'NEW_LEAD'>('NEW_LEAD');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerNationalId, setBuyerNationalId] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');

  // Step 2: Payment Terms
  const [basePriceInput, setBasePriceInput] = useState<string>('');
  const [apartmentTaxInput, setApartmentTaxInput] = useState<string>('0');
  const [apartmentTaxDesc, setApartmentTaxDesc] = useState<string>('');
  const [paymentPlanType, setPaymentPlanType] = useState<'INSTALLMENTS' | 'FULL_CASH'>('INSTALLMENTS');
  const [downPaymentInputPct, setDownPaymentInputPct] = useState<string>('15');
  const [downPaymentAmountInput, setDownPaymentAmountInput] = useState<string>('');
  const [numInstallments, setNumInstallments] = useState<string>('8');
  const [installmentFrequency, setInstallmentFrequency] = useState<'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL'>('QUARTERLY');
  const [firstPaymentDate, setFirstPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [firstInstallmentDueDate, setFirstInstallmentDueDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });

  // Step 3: Equity Splits & Destination
  const [partnerSplits, setPartnerSplits] = useState<PartnerShareItem[]>(() => normalizePartnerSplits(null));
  const [selectedPartnerToAdd, setSelectedPartnerToAdd] = useState<string>('');
  const [customPartnerNameInput, setCustomPartnerNameInput] = useState<string>('');
  const [destinationTreasury, setDestinationTreasury] = useState<'SAFE_101000' | 'BANK_102000'>('SAFE_101000');

  // Reset state on modal open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setContractErrors({});
      setSelectedPropertyId('');
      setSelectedBuildingUnitId('');
      setCustomUnitName('');
      setLeadSelectionMode('NEW_LEAD');
      setSelectedLeadId('');
      setBuyerName('');
      setBuyerNationalId('');
      setBuyerPhone('');
      setBuyerEmail('');
      setBasePriceInput('');
      setApartmentTaxInput('0');
      setApartmentTaxDesc('');
      setPaymentPlanType('INSTALLMENTS');
      setDownPaymentInputPct('15');
      setDownPaymentAmountInput('');
      setNumInstallments('8');
      setInstallmentFrequency('QUARTERLY');
      setFirstPaymentDate(new Date().toISOString().split('T')[0]);
      setPartnerSplits(normalizePartnerSplits(null));
      setDestinationTreasury('SAFE_101000');
    }
  }, [isOpen]);

  // Derived Pricing
  const basePrice = parseFloat(basePriceInput) || 0;
  const taxAmount = parseFloat(apartmentTaxInput) || 0;
  const totalNominalValue = basePrice + taxAmount;

  // Derived Down Payment
  const modalDpAmount = useMemo(() => {
    if (paymentPlanType === 'FULL_CASH') return totalNominalValue;
    if (downPaymentAmountInput !== '') {
      return Math.min(totalNominalValue, parseFloat(downPaymentAmountInput) || 0);
    }
    const pct = (parseFloat(downPaymentInputPct) || 15) / 100;
    return Math.round(totalNominalValue * pct);
  }, [paymentPlanType, totalNominalValue, downPaymentAmountInput, downPaymentInputPct]);

  // Selected Property Object
  const selectedProperty = useMemo(() => {
    return properties.find(p => p.id === selectedPropertyId);
  }, [properties, selectedPropertyId]);

  // Selected building unit (if whole building)
  const availableBuildingUnits = useMemo(() => {
    if (!selectedProperty || selectedProperty.type !== 'building') return [];
    return (selectedProperty.building_units || []).filter(u => u.status === 'available');
  }, [selectedProperty]);

  // Handle Property Selection
  const handlePropertyChange = (id: string) => {
    setSelectedPropertyId(id);
    setSelectedBuildingUnitId('');
    if (contractErrors.property) setContractErrors(prev => ({ ...prev, property: '' }));

    if (id === 'custom_unit') {
      setBasePriceInput('');
      setApartmentTaxInput('0');
      setApartmentTaxDesc('');
      setCustomUnitName('');
      setNumInstallments('8');
      setPartnerSplits(normalizePartnerSplits(null));
      return;
    }

    const prop = properties.find(p => p.id === id);
    if (prop) {
      const b = prop.price_egp || 0;
      const t = prop.tax_amount_egp || 0;
      setBasePriceInput(b.toString());
      setApartmentTaxInput(t.toString());
      setApartmentTaxDesc('');
      setNumInstallments(prop.completion_status === 'off_plan' ? '12' : '6');
      if (prop.partner_splits && prop.partner_splits.length > 0) {
        setPartnerSplits(normalizePartnerSplits(prop.partner_splits));
      } else {
        setPartnerSplits(normalizePartnerSplits(null));
      }
    }
  };

  // Handle Lead Selection
  const handleLeadChange = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setBuyerName(lead.name || '');
      setBuyerPhone(lead.phone || '');
      if (contractErrors.buyerName) setContractErrors(prev => ({ ...prev, buyerName: '' }));
    }
  };

  // Generate Tranche Schedule Preview
  const previewSchedule = useMemo(() => {
    if (paymentPlanType === 'FULL_CASH') return [];
    const count = parseInt(numInstallments) || 0;
    if (count <= 0) return [];

    const remainingToFinance = Math.max(0, totalNominalValue - modalDpAmount);
    const trancheVal = Math.round(remainingToFinance / count);
    const intervalMonths = installmentFrequency === 'MONTHLY' ? 1 : installmentFrequency === 'QUARTERLY' ? 3 : 6;

    const tranches = [];
    let currentDue = new Date(firstInstallmentDueDate || firstPaymentDate);

    for (let i = 1; i <= count; i++) {
      tranches.push({
        index: i,
        dueDate: currentDue.toISOString().split('T')[0],
        amount: trancheVal
      });
      const nextMonth = currentDue.getMonth() + intervalMonths;
      currentDue = new Date(currentDue.setMonth(nextMonth));
    }
    return tranches;
  }, [paymentPlanType, numInstallments, totalNominalValue, modalDpAmount, installmentFrequency, firstInstallmentDueDate, firstPaymentDate]);

  // Equity Splits total %
  const totalSplitsPct = useMemo(() => {
    return partnerSplits.reduce((sum, item) => sum + (parseFloat(item.sharePct.toString()) || 0), 0);
  }, [partnerSplits]);

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedPropertyId) {
      errs.property = isAr ? 'يرجى اختيار الوحدة العقارية' : 'Please select a property unit';
    } else if (selectedPropertyId === 'custom_unit' && !customUnitName.trim()) {
      errs.property = isAr ? 'يرجى إدخال اسم المشروع / الوحدة المخصصة' : 'Custom unit name is required';
    }
    if (!buyerName.trim()) {
      errs.buyerName = isAr ? 'يرجى إدخال اسم المشتري المثبت بالعقد' : 'Buyer name is required';
    }
    if (!buyerNationalId.trim() || buyerNationalId.trim().length < 8) {
      errs.buyerNationalId = isAr ? 'يرجى إدخال الرقم القومي / جواز السفر (٨ خانات على الأقل)' : 'Valid National ID required (min 8 digits)';
    }
    setContractErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (totalNominalValue <= 0) {
      errs.price = isAr ? 'يرجى إدخال سعر تعاقدي صحيح أكبر من الصفر' : 'Valid contract price required';
    }
    if (modalDpAmount <= 0) {
      errs.downPayment = isAr ? 'يرجى تحديد دفعة مقدمة صحيحة' : 'Down payment must be greater than zero';
    }
    setContractErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 3 Validation & Submit
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Math.abs(totalSplitsPct - 100) > 0.01) {
      setContractErrors({ splits: isAr ? 'يجب أن يكون مجموع نسب الشركاء 100% بالضبط' : 'Partner shares must sum to exactly 100%' });
      return;
    }

    const payload = {
      propertyId: selectedPropertyId,
      buildingUnitId: selectedBuildingUnitId || undefined,
      customUnitName: selectedPropertyId === 'custom_unit' ? customUnitName.trim() : undefined,
      buyerName: buyerName.trim(),
      buyerNationalId: buyerNationalId.trim(),
      buyerPhone: buyerPhone.trim(),
      buyerEmail: buyerEmail.trim(),
      basePrice,
      taxAmount,
      taxNotes: apartmentTaxDesc,
      totalNominalValue,
      downPaymentAmount: modalDpAmount,
      paymentPlanType,
      numInstallments: paymentPlanType === 'FULL_CASH' ? 0 : parseInt(numInstallments),
      installmentFrequency,
      firstPaymentDate,
      firstInstallmentDueDate,
      partnerSplits,
      destinationTreasury
    };

    await onContractCreated(payload);
  };

  // Sectioned Properties for Custom Dropdown
  const propertySections: ZFCustomSelectSection[] = useMemo(() => {
    const zayedItems: ZFCustomSelectItem[] = [];
    const cairoItems: ZFCustomSelectItem[] = [];
    const coastItems: ZFCustomSelectItem[] = [];
    const otherItems: ZFCustomSelectItem[] = [];

    (properties || []).forEach(p => {
      const loc = (p.location || '').toLowerCase();
      const title = ((p.title_ar || '') + ' ' + (p.title_en || '')).toLowerCase();

      const item: ZFCustomSelectItem = {
        value: p.id,
        labelAr: p.title_ar,
        labelEn: p.title_en,
        sublabelAr: `${p.location || (isAr ? 'الموقع مسجل' : 'Registered Location')}${p.area_sqm ? ` • ${p.area_sqm} م²` : ''}`,
        sublabelEn: `${p.location || 'Location'}${p.area_sqm ? ` • ${p.area_sqm} m²` : ''}`,
        price: p.price_egp,
        badge: p.listing_status === 'sold' ? (isAr ? 'مباع' : 'Sold') : (isAr ? 'متاح للتعاقد' : 'Available'),
        badgeColor: p.listing_status === 'sold' ? '#fee2e2' : '#dcfce7',
        icon: Building2
      };

      if (loc.includes('زايد') || loc.includes('أكتوبر') || loc.includes('zayed') || loc.includes('october') || title.includes('زايد')) {
        zayedItems.push(item);
      } else if (loc.includes('تجمع') || loc.includes('قاهرة') || loc.includes('cairo') || loc.includes('tagamoa') || title.includes('تجمع') || title.includes('نرجس') || title.includes('ياسمين')) {
        cairoItems.push(item);
      } else if (loc.includes('ساحل') || loc.includes('سخنة') || loc.includes('جونة') || loc.includes('coast') || loc.includes('sokhna') || loc.includes('red sea') || title.includes('ساحل') || title.includes('جونة') || title.includes('سخنة')) {
        coastItems.push(item);
      } else {
        otherItems.push(item);
      }
    });

    const res: ZFCustomSelectSection[] = [];
    if (zayedItems.length > 0) {
      res.push({
        sectionId: 'zayed',
        titleAr: 'مشروعات الشيخ زايد و 6 أكتوبر',
        titleEn: 'Sheikh Zayed & 6th of October Projects',
        icon: Building2,
        items: zayedItems
      });
    }
    if (cairoItems.length > 0) {
      res.push({
        sectionId: 'cairo',
        titleAr: 'مشروعات التجمع الخامس والقاهرة الجديدة',
        titleEn: 'New Cairo & Fifth Settlement Projects',
        icon: Building2,
        items: cairoItems
      });
    }
    if (coastItems.length > 0) {
      res.push({
        sectionId: 'coast',
        titleAr: 'مشروعات الساحل الشمالي والعين السخنة',
        titleEn: 'North Coast & Red Sea Resort Units',
        icon: Building2,
        items: coastItems
      });
    }
    if (otherItems.length > 0) {
      res.push({
        sectionId: 'other',
        titleAr: 'محفظة المشروعات والأصول العقارية',
        titleEn: 'Other Prime Properties Portfolio',
        icon: Building2,
        items: otherItems
      });
    }
    return res;
  }, [properties, isAr]);

  // Sectioned Leads for CRM Dropdown
  const leadItems: ZFCustomSelectItem[] = useMemo(() => {
    return (leads || []).map(lead => ({
      value: lead.id,
      labelAr: lead.name,
      labelEn: lead.name,
      sublabelAr: lead.phone ? `هاتف: ${lead.phone}` : (lead.email || ''),
      sublabelEn: lead.phone ? `Tel: ${lead.phone}` : (lead.email || ''),
      badge: isAr ? 'عميل مسجل' : 'Lead',
      icon: Users
    }));
  }, [leads, isAr]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.modalContent}
        style={{
          maxWidth: '880px',
          width: '95vw',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fafaf9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(184, 144, 62, 0.12)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Plus size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'تحرير وتوثيق عقد بيع عقاري جديد' : 'Execute Real Estate Sales Contract'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {isAr ? 'معالج مالي متكامل: ربط الوحدة، جدولة السداد، حصص الشركاء، والترحيل للدفاتر' : 'Executive deal workflow: Property specs, tranches, partner splits & ledger posting'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* 3-Step Wizard Navigation Ribbon */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          padding: '0.85rem 1.75rem',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0'
        }}>
          {[
            { s: 1, titleAr: '١. أطراف التعاقد والوحدة', titleEn: '1. Unit & Buyer', descAr: 'الوحدة العقارية وهوية المشتري' },
            { s: 2, titleAr: '٢. الشروط وجدولة السداد', titleEn: '2. Payment Terms', descAr: 'السعر والمقدم ونظام الأقساط' },
            { s: 3, titleAr: '٣. الشركاء والاعتماد', titleEn: '3. Equity & Final Posting', descAr: 'حصص التمويل والتوجيه المالي' }
          ].map(item => {
            const isActive = step === item.s;
            const isCompleted = step > item.s;
            return (
              <button
                key={item.s}
                type="button"
                onClick={() => {
                  if (item.s === 2 && !validateStep1()) return;
                  if (item.s === 3) {
                    if (!validateStep1()) { setStep(1); return; }
                    if (!validateStep2()) { setStep(2); return; }
                  }
                  setStep(item.s as 1 | 2 | 3);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '10px',
                  background: isActive ? '#ffffff' : isCompleted ? '#f1f5f9' : 'transparent',
                  border: isActive ? '1.5px solid #946f23' : isCompleted ? '1px solid #cbd5e1' : '1px solid transparent',
                  boxShadow: isActive ? '0 2px 6px rgba(148, 111, 35, 0.12)' : 'none',
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left'
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  flexShrink: 0,
                  background: isActive ? '#946f23' : isCompleted ? '#059669' : '#e2e8f0',
                  color: isActive || isCompleted ? '#ffffff' : '#64748b'
                }}>
                  {isCompleted ? '✓' : item.s}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isActive ? '#946f23' : '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {isAr ? item.titleAr : item.titleEn}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {item.descAr}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Wizard Body Form */}
        <form onSubmit={handleFinalSubmit} style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
          
          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STEP 1: PROPERTY & BUYER                                   */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Card 1: Property Unit Selection */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={16} color="#946f23" />
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                    {isAr ? 'الوحدة العقارية موضوع التعاقد:' : 'Contract Target Property Unit:'}
                  </h4>
                </div>

                <ZFCustomSelect 
                  value={selectedPropertyId}
                  onChange={(val: string) => handlePropertyChange(val)}
                  sections={propertySections}
                  placeholderAr="-- اختر الوحدة العقارية من الكتالوج المعتمد --"
                  placeholderEn="-- Choose Property Unit from Catalog --"
                  isAr={isAr}
                  hasError={!!contractErrors.property}
                  errorMessage={contractErrors.property}
                  customAction={{
                    labelAr: '+ إدخال وحدة / مشروع مخصص لزكريا فريد',
                    labelEn: '+ Custom Developer Project / Unit',
                    onClick: () => handlePropertyChange('custom_unit')
                  }}
                />

                {/* Custom Unit Input */}
                {selectedPropertyId === 'custom_unit' && (
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem', display: 'block' }}>
                      {isAr ? 'اسم المشروع / الوحدة المخصصة *' : 'Custom Unit Name *'}
                    </label>
                    <input
                      type="text"
                      value={customUnitName}
                      onChange={e => setCustomUnitName(e.target.value)}
                      placeholder={isAr ? 'مثال: فيلا A12 - حي النرجس التجمع الخامس' : 'e.g. Villa A12 - New Cairo'}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                      required
                    />
                  </div>
                )}

                {/* Property Preview Card */}
                {selectedProperty && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.75rem',
                    fontSize: '0.76rem'
                  }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>{isAr ? 'نوع العقار:' : 'Type:'}</span>
                      <strong style={{ color: '#0f172a' }}>{selectedProperty.type}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>{isAr ? 'المساحة الصافية:' : 'Net Area:'}</span>
                      <strong style={{ color: '#0f172a' }}>{selectedProperty.area_sqm || '—'} م²</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>{isAr ? 'السعر المقترح بالكتالوج:' : 'Catalog Price:'}</span>
                      <strong style={{ color: '#946f23' }}>{D(selectedProperty.price_egp || 0).formatEGP(isAr)}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Buyer & CRM Sync */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={16} color="#946f23" />
                    <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                      {isAr ? 'بيانات المشتري وهوية التعاقد:' : 'Buyer Identity & CRM Sync:'}
                    </h4>
                  </div>

                  {/* Toggle CRM lead vs new */}
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() => setLeadSelectionMode('NEW_LEAD')}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: leadSelectionMode === 'NEW_LEAD' ? 'rgba(184, 144, 62, 0.12)' : '#f1f5f9',
                        color: leadSelectionMode === 'NEW_LEAD' ? '#946f23' : '#64748b',
                        border: leadSelectionMode === 'NEW_LEAD' ? '1px solid #946f23' : '1px solid transparent'
                      }}
                    >
                      {isAr ? 'عميل جديد' : 'New Buyer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeadSelectionMode('EXISTING_LEAD')}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: leadSelectionMode === 'EXISTING_LEAD' ? 'rgba(184, 144, 62, 0.12)' : '#f1f5f9',
                        color: leadSelectionMode === 'EXISTING_LEAD' ? '#946f23' : '#64748b',
                        border: leadSelectionMode === 'EXISTING_LEAD' ? '1px solid #946f23' : '1px solid transparent'
                      }}
                    >
                      {isAr ? 'اختيار عميل مسجل' : 'Existing CRM Lead'}
                    </button>
                  </div>
                </div>

                {/* CRM Lead Selector */}
                {leadSelectionMode === 'EXISTING_LEAD' && (
                  <ZFCustomSelect 
                    value={selectedLeadId}
                    onChange={(val: string) => handleLeadChange(val)}
                    items={leadItems}
                    placeholderAr="-- اختر العميل من قاعدة بيانات العملاء المسجلين --"
                    placeholderEn="-- Choose Registered CRM Lead --"
                    isAr={isAr}
                  />
                )}

                {/* Buyer Fields Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem', display: 'block' }}>
                      {isAr ? 'الاسم القانوني الثلاثي / الرباعي *' : 'Full Legal Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerName}
                      onChange={e => setBuyerName(e.target.value)}
                      placeholder={isAr ? 'مثال: م. أحمد عبد الرحمن الشرقاوي' : 'e.g. John Doe'}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: contractErrors.buyerName ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    />
                    {contractErrors.buyerName && (
                      <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700 }}>{contractErrors.buyerName}</span>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem', display: 'block' }}>
                      {isAr ? 'الرقم القومي / جواز السفر *' : 'National ID / Passport *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerNationalId}
                      onChange={e => setBuyerNationalId(e.target.value)}
                      placeholder="29401010102555"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: contractErrors.buyerNationalId ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.82rem',
                        fontVariantNumeric: 'tabular-nums',
                        outline: 'none'
                      }}
                    />
                    {contractErrors.buyerNationalId && (
                      <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700 }}>{contractErrors.buyerNationalId}</span>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem', display: 'block' }}>
                      {isAr ? 'رقم الهاتف المحمول:' : 'Mobile Phone:'}
                    </label>
                    <input
                      type="tel"
                      value={buyerPhone}
                      onChange={e => setBuyerPhone(e.target.value)}
                      placeholder="010XXXXXXXX"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem', display: 'block' }}>
                      {isAr ? 'البريد الإلكتروني:' : 'Email Address:'}
                    </label>
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={e => setBuyerEmail(e.target.value)}
                      placeholder="client@domain.com"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Step 1 Navigation Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setStep(2);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.6rem 1.45rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 2px 8px rgba(148, 111, 35, 0.25)'
                  }}
                >
                  <span>{isAr ? 'المتابعة للشروط المالية وجدولة السداد' : 'Proceed to Payment Terms'}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STEP 2: PAYMENT TERMS & SCHEDULE GENERATOR                 */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Pricing breakdown */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.15rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem', display: 'block' }}>
                    {isAr ? 'سعر الوحدة الأساسي (ج.م) *' : 'Base Unit Price (EGP) *'}
                  </label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={basePriceInput}
                    onChange={e => setBasePriceInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem', display: 'block' }}>
                    {isAr ? 'رسوم وضرائب الوحدة (ج.م):' : 'Unit Taxes & Fees (EGP):'}
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={apartmentTaxInput}
                    onChange={e => setApartmentTaxInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{
                  background: 'rgba(184, 144, 62, 0.08)',
                  border: '1px solid rgba(184, 144, 62, 0.25)',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '0.7rem', color: '#946f23', fontWeight: 800 }}>
                    {isAr ? 'إجمالي قيمة العقد الاسمية (V):' : 'Gross Contract Value (V):'}
                  </span>
                  <strong style={{ fontSize: '1.25rem', color: '#946f23', fontWeight: 900 }}>
                    <MoneyCell amount={totalNominalValue.toString()} isAr={isAr} highlight />
                  </strong>
                </div>
              </div>

              {/* Down Payment & Tranche Count Controls */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  {/* Down payment % */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem', display: 'block' }}>
                      {isAr ? 'نسبة المقدم (٪):' : 'Down Payment %:'}
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      value={downPaymentInputPct}
                      onChange={e => {
                        setDownPaymentInputPct(e.target.value);
                        setDownPaymentAmountInput('');
                      }}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        outline: 'none'
                      }}
                    />
                    {/* Quick Preset Chips */}
                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                      {[10, 15, 20, 25, 30].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setDownPaymentInputPct(p.toString());
                            setDownPaymentAmountInput('');
                          }}
                          style={{
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: downPaymentInputPct === p.toString() ? '#946f23' : '#ffffff',
                            color: downPaymentInputPct === p.toString() ? '#ffffff' : '#334155',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Down payment cash amount */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem', display: 'block' }}>
                      {isAr ? 'قيمة الدفعة المقدمة (ج.م):' : 'Down Payment (EGP):'}
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={modalDpAmount}
                      onChange={e => {
                        setDownPaymentAmountInput(e.target.value);
                        if (totalNominalValue > 0) {
                          setDownPaymentInputPct(((parseFloat(e.target.value) || 0) / totalNominalValue * 100).toFixed(1));
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1.5px solid #059669',
                        background: '#ffffff',
                        color: '#059669',
                        fontSize: '0.95rem',
                        fontWeight: 900,
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Installment count */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem', display: 'block' }}>
                      {isAr ? 'عدد الأقساط الدورية:' : 'Number of Installments:'}
                    </label>
                    <select
                      value={numInstallments}
                      onChange={e => setNumInstallments(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    >
                      <option value="4">4 {isAr ? 'أقساط' : 'Tranches'}</option>
                      <option value="8">8 {isAr ? 'أقساط (سنتان ربع سنوي)' : 'Tranches (2 Yrs)'}</option>
                      <option value="12">12 {isAr ? 'قسطاً (٣ سنوات ربع سنوي)' : 'Tranches (3 Yrs)'}</option>
                      <option value="16">16 {isAr ? 'قسطاً (٤ سنوات ربع سنوي)' : 'Tranches (4 Yrs)'}</option>
                      <option value="20">20 {isAr ? 'قسطاً (٥ سنوات ربع سنوي)' : 'Tranches (5 Yrs)'}</option>
                      <option value="24">24 {isAr ? 'قسطاً (سنتان شهرياً)' : 'Tranches (2 Yrs Monthly)'}</option>
                    </select>
                  </div>
                </div>

                {/* Dates & Frequency */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem', display: 'block' }}>
                      {isAr ? 'تكرار سداد القسط:' : 'Payment Frequency:'}
                    </label>
                    <select
                      value={installmentFrequency}
                      onChange={e => setInstallmentFrequency(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    >
                      <option value="MONTHLY">{isAr ? 'شهري (كل شهر)' : 'Monthly'}</option>
                      <option value="QUARTERLY">{isAr ? 'ربع سنوي (كل ٣ أشهر)' : 'Quarterly (Every 3 Mo)'}</option>
                      <option value="SEMI_ANNUAL">{isAr ? 'نصف سنوي (كل ٦ أشهر)' : 'Semi-Annual (Every 6 Mo)'}</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem', display: 'block' }}>
                      {isAr ? 'تاريخ سداد المقدم:' : 'Down Payment Date:'}
                    </label>
                    <input
                      type="date"
                      value={firstPaymentDate}
                      onChange={e => setFirstPaymentDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem', display: 'block' }}>
                      {isAr ? 'تاريخ استحقاق أول قسط:' : 'First Tranche Due Date:'}
                    </label>
                    <input
                      type="date"
                      value={firstInstallmentDueDate}
                      onChange={e => setFirstInstallmentDueDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Tranche Preview Schedule Table */}
              {previewSchedule.length > 0 && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a' }}>
                      {isAr ? `معاينة جدول استحقاقات الأقساط (${previewSchedule.length} قسطاً):` : `Installments Schedule Preview (${previewSchedule.length} Tranches):`}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {isAr ? `قيمة القسط الدوري: ${D(previewSchedule[0]?.amount || 0).formatEGP(isAr)}` : `Per Tranche: ${D(previewSchedule[0]?.amount || 0).formatEGP(isAr)}`}
                    </span>
                  </div>

                  <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', textAlign: isAr ? 'right' : 'left' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', color: '#475569' }}>
                          <th style={{ padding: '0.4rem 0.6rem' }}>#</th>
                          <th style={{ padding: '0.4rem 0.6rem' }}>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                          <th style={{ padding: '0.4rem 0.6rem' }}>{isAr ? 'قيمة القسط' : 'Amount'}</th>
                          <th style={{ padding: '0.4rem 0.6rem' }}>{isAr ? 'الحالة الدفترية' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewSchedule.slice(0, 10).map(t => (
                          <tr key={t.index} style={{ borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
                            <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700 }}>{t.index}</td>
                            <td style={{ padding: '0.4rem 0.6rem', fontVariantNumeric: 'tabular-nums' }}>{t.dueDate}</td>
                            <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700, color: '#946f23' }}>{D(t.amount).formatEGP(isAr)}</td>
                            <td style={{ padding: '0.4rem 0.6rem', color: '#64748b' }}>{isAr ? 'مستحق باليد' : 'Pending Hand'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Step 2 Footer Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? '← السابق: الوحدة والمشتري' : '← Back: Property & Buyer'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (validateStep2()) setStep(3);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.6rem 1.45rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 2px 8px rgba(148, 111, 35, 0.25)'
                  }}
                >
                  <span>{isAr ? 'المتابعة لتوزيع الشركاء والاعتماد' : 'Proceed to Partner Splits'}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STEP 3: PARTNER SPLITS & FINAL COMMIT                       */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Partner Equity Allocation */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={16} color="#946f23" />
                    <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                      {isAr ? 'توزيع حصص التمويل ورأس المال بين الشركاء:' : 'Partner Equity & Capital Splits:'}
                    </h4>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{isAr ? 'إجمالي الحصص:' : 'Total Splits:'}</span>
                    <strong style={{
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: Math.abs(totalSplitsPct - 100) < 0.01 ? '#059669' : '#dc2626'
                    }}>
                      {totalSplitsPct.toFixed(1)}% {Math.abs(totalSplitsPct - 100) < 0.01 ? '✓' : '⚠️'}
                    </strong>
                  </div>
                </div>

                {/* Progress Visual Bar */}
                <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden', display: 'flex' }}>
                  {partnerSplits.map((p, idx) => (
                    <div
                      key={p.partnerName}
                      style={{
                        width: `${Math.max(0, p.sharePct)}%`,
                        background: idx === 0 ? '#946f23' : idx === 1 ? '#b8903e' : '#15803d',
                        height: '100%'
                      }}
                      title={`${p.partnerName}: ${p.sharePct}%`}
                    />
                  ))}
                </div>

                {/* Partner Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {partnerSplits.map((item, idx) => (
                    <div
                      key={item.partnerName}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.5fr 1fr auto',
                        gap: '0.6rem',
                        alignItems: 'center',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem'
                      }}
                    >
                      <strong style={{ fontSize: '0.78rem', color: '#0f172a' }}>{item.partnerName}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {D(totalNominalValue * (item.sharePct / 100)).formatEGP(isAr)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.sharePct}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            const updated = partnerSplits.map((p, i) => i === idx ? { ...p, sharePct: val } : p);
                            setPartnerSplits(updated);
                          }}
                          style={{
                            width: '55px',
                            padding: '0.25rem 0.4rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#0f172a',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textAlign: 'center'
                          }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>%</span>
                      </div>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => setPartnerSplits(smartRemovePartner(partnerSplits, idx))}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            padding: '0.2rem'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Destination Treasury Selector */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem', display: 'block' }}>
                    {isAr ? 'خزينة استلام وتوريد الدفعة المقدمة:' : 'Down Payment Destination Treasury:'}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setDestinationTreasury('SAFE_101000')}
                      style={{
                        padding: '0.55rem 0.85rem',
                        borderRadius: '8px',
                        border: destinationTreasury === 'SAFE_101000' ? '1.5px solid #059669' : '1px solid #cbd5e1',
                        background: destinationTreasury === 'SAFE_101000' ? 'rgba(16, 185, 129, 0.08)' : '#ffffff',
                        color: destinationTreasury === 'SAFE_101000' ? '#059669' : '#475569',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Wallet size={14} />
                      <span>{isAr ? 'خزينة المركز الرئيسي [101000]' : 'Main Safe [101000]'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDestinationTreasury('BANK_102000')}
                      style={{
                        padding: '0.55rem 0.85rem',
                        borderRadius: '8px',
                        border: destinationTreasury === 'BANK_102000' ? '1.5px solid #946f23' : '1px solid #cbd5e1',
                        background: destinationTreasury === 'BANK_102000' ? 'rgba(148, 111, 35, 0.08)' : '#ffffff',
                        color: destinationTreasury === 'BANK_102000' ? '#946f23' : '#475569',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Landmark size={14} />
                      <span>{isAr ? 'الحساب البنكي التجاري [102000]' : 'Commercial Bank [102000]'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Deal Summary & Automated Posting Confirmation */}
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #fefdfa 100%)',
                border: '1.5px solid rgba(184, 144, 62, 0.35)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                boxShadow: '0 2px 8px rgba(184, 144, 62, 0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#946f23' }}>
                    {isAr ? 'ملخص الصفقة والأثر الدفتري التلقائي بالدفاتر:' : 'Deal Summary & GL Impact:'}
                  </span>
                  <ShieldCheck size={16} color="#946f23" />
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.75rem',
                  fontSize: '0.74rem',
                  background: '#f8fafc',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px'
                }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>{isAr ? 'المشتري:' : 'Buyer:'}</span>
                    <strong style={{ color: '#0f172a' }}>{buyerName || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>{isAr ? 'القيمة التعاقدية:' : 'Gross Value:'}</span>
                    <strong style={{ color: '#946f23' }}>{D(totalNominalValue).formatEGP(isAr)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>{isAr ? 'الدفعة المقدمة:' : 'Down Payment:'}</span>
                    <strong style={{ color: '#059669' }}>{D(modalDpAmount).formatEGP(isAr)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>{isAr ? 'تاريخ التوقيع:' : 'Contract Date:'}</span>
                    <strong style={{ color: '#0f172a' }}>{firstPaymentDate}</strong>
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: '#065f46', background: 'rgba(16, 185, 129, 0.08)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                  {isAr 
                    ? `التوجيه المحاسبي اللحظي: مدين [${destinationTreasury === 'SAFE_101000' ? '101000 خزينة' : '102000 بنك'}] بمبلغ ${D(modalDpAmount).formatEGP(isAr)} • دائن [206100 إيرادات مؤجلة] بمبلغ ${D(modalDpAmount).formatEGP(isAr)}.`
                    : `Instant GL Posting: Dr [${destinationTreasury === 'SAFE_101000' ? '101000 Safe' : '102000 Bank'}] ${D(modalDpAmount).formatEGP(isAr)} • Cr [206100 Deferred Revenue] ${D(modalDpAmount).formatEGP(isAr)}.`}
                </div>
              </div>

              {/* Step 3 Footer Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? '← السابق: الشروط المالية' : '← Back: Payment Terms'}
                </button>

                <button
                  type="submit"
                  disabled={isMutating || Math.abs(totalSplitsPct - 100) > 0.01}
                  style={{
                    background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.65rem 1.65rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: isMutating ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 2px 10px rgba(148, 111, 35, 0.3)'
                  }}
                >
                  {isMutating ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  <span>{isAr ? 'اعتماد العقد وترحيل الدفعة للخزينة' : 'Execute Real Contract & Post'}</span>
                </button>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  );
};
