'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Loader2,
  Building2,
  CheckCircle2,
  Users,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Wallet,
  Landmark,
  AlertCircle
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
import { ZFModalShell } from '../common/ZFModalShell';
import { 
  isPropertyAvailableForContract,
  isUnitSold,
  isBuildingFullySold,
  getAvailableUnitsForProperty,
  canSellWholeBuilding,
  getPropertyInventorySummary,
} from '@/lib/erp/propertiesPortfolioCalculations';
import p from '../common/ZFModalPrimitives.module.css';

export interface NewContractWizardPayload {
  propertyId: string;
  buildingUnitId?: string;
  buildingUnitNumber?: string;
  isWholeBuildingContract?: boolean;
  customUnitName?: string;
  leadId?: string;
  leadSelectionMode?: 'EXISTING_LEAD' | 'NEW_LEAD';
  buyerName: string;
  buyerNationalId: string;
  buyerPhone: string;
  buyerEmail: string;
  basePrice: number | string;
  taxAmount?: string;
  taxNotes?: string;
  totalNominalValue: number | string;
  downPaymentAmount: number | string;
  paymentPlanType: 'FULL_CASH' | 'UPFRONT_HANDOVER' | 'INSTALLMENTS';
  numInstallments: number;
  installmentFrequency: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL';
  firstPaymentDate: string;
  firstInstallmentDueDate?: string;
  partnerSplits: PartnerShareItem[];
  destinationTreasury: 'SAFE_101000' | 'BANK_102000' | '101000' | '102000';
}

interface NewContractWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPropertyId?: string;
  initialBuildingUnitId?: string;
  initialBuyerName?: string;
  initialBuyerPhone?: string;
  initialBuyerEmail?: string;
  initialLeadId?: string;
  properties: Property[];
  contracts: ERPContract[];
  leads?: any[];
  activePeriod: ERPAccountingPeriod;
  unifiedPartners: Array<{ name: string; role: string }>;
  isMutating?: boolean;
  isAr?: boolean;
  onContractCreated: (contractData: NewContractWizardPayload) => Promise<void>;
}

export const NewContractWizardModal: React.FC<NewContractWizardModalProps> = ({
  isOpen,
  onClose,
  initialPropertyId,
  initialBuildingUnitId,
  initialBuyerName,
  initialBuyerPhone,
  initialBuyerEmail,
  initialLeadId,
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

  // Handle Property & Unit Selection logic
  const applyPropertySelection = React.useCallback((id: string, unitId?: string) => {
    setSelectedPropertyId(id);
    setContractErrors(prev => prev.property ? { ...prev, property: '' } : prev);

    if (id === 'custom_unit') {
      setSelectedBuildingUnitId('');
      setBasePriceInput('');
      setCustomUnitName('');
      setNumInstallments('8');
      setPartnerSplits(normalizePartnerSplits(null));
      return;
    }

    const prop = properties.find(p => p.id === id);
    if (prop) {
      const canSellWhole = canSellWholeBuilding(prop, contracts);
      const availableUnits = getAvailableUnitsForProperty(prop, contracts);
      let targetUnitId = unitId || '';

      // If requested unit is sold, do not keep it selected
      if (targetUnitId && !availableUnits.some(u => u.unit_id === targetUnitId)) {
        targetUnitId = '';
      }

      // If whole building cannot be sold (constituent units already sold) and no specific unit is selected,
      // default targetUnitId to first available unit
      if (!targetUnitId && !canSellWhole && availableUnits.length > 0) {
        targetUnitId = availableUnits[0].unit_id;
      }

      setSelectedBuildingUnitId(targetUnitId);

      if (targetUnitId && prop.building_units) {
        const unit = prop.building_units.find(u => u.unit_id === targetUnitId);
        if (unit) {
          setBasePriceInput((unit.price_egp || 0).toString());
        } else {
          setBasePriceInput((prop.price_egp || 0).toString());
        }
      } else {
        setBasePriceInput((prop.price_egp || 0).toString());
      }
      setNumInstallments(prop.completion_status === 'off_plan' ? '12' : '6');
      if (prop.partner_splits && prop.partner_splits.length > 0) {
        setPartnerSplits(normalizePartnerSplits(prop.partner_splits));
      } else {
        setPartnerSplits(normalizePartnerSplits(null));
      }
    }
  }, [properties, contracts]);

  const handlePropertyChange = (id: string) => {
    applyPropertySelection(id, '');
  };

  const handleBuildingUnitChange = (unitId: string) => {
    setSelectedBuildingUnitId(unitId);
    const prop = properties.find(p => p.id === selectedPropertyId);
    if (!prop) return;
    if (unitId) {
      const unit = (prop.building_units || []).find(u => u.unit_id === unitId);
      if (unit) {
        setBasePriceInput((unit.price_egp || 0).toString());
      }
    } else {
      setBasePriceInput((prop.price_egp || 0).toString());
    }
  };

  const prevIsOpenRef = React.useRef(false);

  // Reset state on modal open with pre-selected property/unit support
  // Uses prevIsOpenRef so background store sync while modal is open DOES NOT reset form draft state
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setStep(1);
      setContractErrors({});
      if (initialLeadId) {
        setLeadSelectionMode('EXISTING_LEAD');
        setSelectedLeadId(initialLeadId);
      } else {
        setLeadSelectionMode('NEW_LEAD');
        setSelectedLeadId('');
      }
      setBuyerName(initialBuyerName || '');
      setBuyerNationalId('');
      setBuyerPhone(initialBuyerPhone || '');
      setBuyerEmail(initialBuyerEmail || '');
      setPaymentPlanType('INSTALLMENTS');
      setDownPaymentInputPct('15');
      setDownPaymentAmountInput('');
      setInstallmentFrequency('QUARTERLY');
      setFirstPaymentDate(new Date().toISOString().split('T')[0]);
      const d = new Date();
      d.setMonth(d.getMonth() + 3);
      setFirstInstallmentDueDate(d.toISOString().split('T')[0]);
      setDestinationTreasury('SAFE_101000');

      if (initialPropertyId) {
        applyPropertySelection(initialPropertyId, initialBuildingUnitId);
      } else {
        setSelectedPropertyId('');
        setSelectedBuildingUnitId('');
        setCustomUnitName('');
        setBasePriceInput('');
        setNumInstallments('8');
        setPartnerSplits(normalizePartnerSplits(null));
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialPropertyId, initialBuildingUnitId, initialBuyerName, initialBuyerPhone, initialBuyerEmail, initialLeadId, applyPropertySelection]);

  // Derived Pricing
  const basePrice = parseFloat(basePriceInput) || 0;
  const totalNominalValue = basePrice;

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

  // Check if whole building can be sold (0 units sold)
  const canSellWhole = useMemo(() => {
    if (!selectedProperty) return false;
    return canSellWholeBuilding(selectedProperty, contracts);
  }, [selectedProperty, contracts]);

  // Selected building unit (if specific apartment selected)
  const selectedBuildingUnit = useMemo(() => {
    if (!selectedProperty || !selectedBuildingUnitId) return null;
    return (selectedProperty.building_units || []).find(u => u.unit_id === selectedBuildingUnitId) || null;
  }, [selectedProperty, selectedBuildingUnitId]);

  // Available building units (strictly exclude sold apartments)
  const availableBuildingUnits = useMemo(() => {
    if (!selectedProperty || selectedProperty.type !== 'building' || !selectedProperty.building_units) return [];
    return getAvailableUnitsForProperty(selectedProperty, contracts);
  }, [selectedProperty, contracts]);

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
    } else if (selectedProperty && !isPropertyAvailableForContract(selectedProperty, contracts)) {
      errs.property = isAr ? 'هذا العقار مباع بالكامل وغير متاح للتعاقد' : 'This property is fully sold and unavailable for contract';
    } else if (selectedProperty && selectedProperty.type === 'building' && !selectedBuildingUnitId && !canSellWholeBuilding(selectedProperty, contracts)) {
      errs.property = isAr ? 'يرجى اختيار شقة محددة، لا يمكن بيع العمارة بالكامل نظراً لوجود وحدات مباعة' : 'Please select an apartment; whole building sale is not allowed as units are sold';
    } else if (selectedProperty && selectedProperty.type === 'building' && selectedBuildingUnitId) {
      const unitObj = selectedBuildingUnit || (selectedProperty.building_units || []).find(u => u.unit_id === selectedBuildingUnitId);
      if (unitObj && isUnitSold(selectedProperty, unitObj, contracts)) {
        errs.property = isAr ? 'هذه الشقة تم بيعها مسبقاً، يرجى اختيار شقة متاحة' : 'This unit is already sold, please select an available unit';
      }
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

    const isWholeBuilding = !selectedBuildingUnitId;
    if (isWholeBuilding && selectedProperty && selectedProperty.type === 'building' && !canSellWholeBuilding(selectedProperty, contracts)) {
      setContractErrors({ property: isAr ? 'لا يمكن بيع العمارة بالكامل نظراً لوجود وحدات مباعة مسبقاً' : 'Cannot sell whole building because constituent units are already sold' });
      setStep(1);
      return;
    }

    const payload: NewContractWizardPayload = {
      propertyId: selectedPropertyId,
      buildingUnitId: selectedBuildingUnitId || undefined,
      buildingUnitNumber: selectedBuildingUnit?.unit_number || undefined,
      isWholeBuildingContract: !selectedBuildingUnitId,
      customUnitName: selectedPropertyId === 'custom_unit' ? customUnitName.trim() : undefined,
      leadId: selectedLeadId || undefined,
      leadSelectionMode,
      buyerName: buyerName.trim(),
      buyerNationalId: buyerNationalId.trim(),
      buyerPhone: buyerPhone.trim(),
      buyerEmail: buyerEmail.trim(),
      basePrice,
      taxAmount: '0.00',
      taxNotes: '',
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
    prevIsOpenRef.current = false;
  };

  const handleModalClose = () => {
    prevIsOpenRef.current = false;
    onClose();
  };

  // Sectioned Properties for Custom Dropdown (strictly filters out fully sold properties)
  const propertySections: ZFCustomSelectSection[] = useMemo(() => {
    const zayedItems: ZFCustomSelectItem[] = [];
    const cairoItems: ZFCustomSelectItem[] = [];
    const coastItems: ZFCustomSelectItem[] = [];
    const otherItems: ZFCustomSelectItem[] = [];

    (properties || []).forEach(p => {
      // 1. Strictly filter out fully sold properties (Item 6 & 7)
      const isAvailable = isPropertyAvailableForContract(p, contracts);
      if (!isAvailable) {
        return;
      }

      const summary = getPropertyInventorySummary(p, contracts);
      const loc = (p.location || '').toLowerCase();
      const title = ((p.title_ar || '') + ' ' + (p.title_en || '')).toLowerCase();

      let sublabelAr = `${p.location || (isAr ? 'الموقع مسجل' : 'Registered Location')}${p.area_sqm ? ` • ${p.area_sqm} م²` : ''}`;
      let sublabelEn = `${p.location || 'Location'}${p.area_sqm ? ` • ${p.area_sqm} m²` : ''}`;
      let badge = isAr ? 'متاح للتعاقد' : 'Available';
      let badgeBg = '#f0fdf4';
      let badgeTextColor = '#15803d';

      if (summary.isMultiUnit) {
        sublabelAr += ` • ${isAr ? `المتبقي: ${summary.availableUnits} من أصل ${summary.totalUnits} وحدة` : `${summary.availableUnits} of ${summary.totalUnits} units available`}`;
        sublabelEn += ` • ${summary.availableUnits} of ${summary.totalUnits} units available`;
        badge = isAr ? `المتبقي ${summary.availableUnits} من ${summary.totalUnits}` : `${summary.availableUnits}/${summary.totalUnits} avail`;
        badgeBg = '#ffffff';
        badgeTextColor = '#334155';
      }

      const item: ZFCustomSelectItem = {
        value: p.id,
        labelAr: p.title_ar,
        labelEn: p.title_en,
        sublabelAr,
        sublabelEn,
        price: p.price_egp,
        badge,
        badgeBg,
        badgeTextColor,
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
  }, [properties, contracts, selectedPropertyId, isAr]);

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

  const splitsBalanced = Math.abs(totalSplitsPct - 100) <= 0.01;
  const goToStep = (target: 1 | 2 | 3) => {
    if (target >= 2 && !validateStep1()) { setStep(1); return; }
    if (target === 3 && !validateStep2()) { setStep(2); return; }
    setStep(target);
  };
  const wizardSteps: { s: 1 | 2 | 3; titleAr: string; titleEn: string }[] = [
    { s: 1, titleAr: 'الوحدة والمشتري', titleEn: 'Unit & Buyer' },
    { s: 2, titleAr: 'الشروط وجدولة السداد', titleEn: 'Payment Terms' },
    { s: 3, titleAr: 'الشركاء والاعتماد', titleEn: 'Partners & Posting' },
  ];
  const targetLabel = selectedBuildingUnit
    ? `${selectedProperty?.title_ar || selectedProperty?.title_en || ''} · ${selectedBuildingUnit.unit_number}`
    : selectedProperty
      ? (selectedProperty.title_ar || selectedProperty.title_en)
      : customUnitName;
  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const NextIcon = isAr ? ArrowLeft : ArrowRight;
  const notEntered = isAr ? 'غير مُدخل' : 'Not entered';

  if (!isOpen) return null;

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={handleModalClose}
      isAr={isAr}
      title={isAr ? 'تحرير عقد بيع عقاري جديد' : 'New Real Estate Sales Contract'}
      subtitle={isAr ? 'ربط الوحدة، جدولة السداد، حصص الشركاء، والترحيل للدفاتر' : 'Unit, payment schedule, partner splits and ledger posting'}
      icon={<Plus size={16} />}
      maxWidth="900px"
      maxHeight="92vh"
      footer={
        <>
          {step < 3 ? (
            <button type="button" className={p.primaryButton} onClick={() => goToStep((step + 1) as 2 | 3)}>
              <span>{step === 1 ? (isAr ? 'التالي: الشروط المالية' : 'Next: Payment Terms') : (isAr ? 'التالي: الشركاء والاعتماد' : 'Next: Partners')}</span>
              <NextIcon size={14} />
            </button>
          ) : (
            <button type="submit" form="new-contract-form" className={p.primaryButton} disabled={isMutating || !splitsBalanced}>
              {isMutating ? <Loader2 size={14} className={p.spin} /> : <CheckCircle2 size={14} />}
              <span>{isAr ? 'اعتماد العقد وترحيل الدفعة' : 'Execute Contract & Post'}</span>
            </button>
          )}
          {step > 1 && (
            <button type="button" className={p.secondaryButton} onClick={() => setStep((step - 1) as 1 | 2)}>
              <BackIcon size={14} />
              <span>{isAr ? 'السابق' : 'Back'}</span>
            </button>
          )}
          <button type="button" className={`${p.secondaryButton} ${p.footerEnd}`} onClick={handleModalClose}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
        </>
      }
    >
      <form id="new-contract-form" onSubmit={handleFinalSubmit}>
        <section className={p.section}>
          <ol className={p.steps} aria-label={isAr ? 'خطوات العقد' : 'Contract steps'}>
            {wizardSteps.map((item, i) => {
              const cls = [p.step, step === item.s ? p.stepActive : '', step > item.s ? p.stepDone : ''].filter(Boolean).join(' ');
              return (
                <React.Fragment key={item.s}>
                  {i > 0 && <li className={p.stepSep} aria-hidden />}
                  <li>
                    <button type="button" className={cls} aria-current={step === item.s ? 'step' : undefined} onClick={() => goToStep(item.s)}>
                      <span className={p.stepNum}>{step > item.s ? <CheckCircle2 size={12} /> : item.s}</span>
                      <span className={p.stepLabel}>{isAr ? item.titleAr : item.titleEn}</span>
                    </button>
                  </li>
                </React.Fragment>
              );
            })}
          </ol>
        </section>

        {step === 1 && (
          <>
            <section className={p.section}>
              <h4 className={p.sectionTitle}>{isAr ? 'الوحدة العقارية موضوع التعاقد' : 'Contract Property Unit'}</h4>
              <ZFCustomSelect
                value={selectedPropertyId}
                onChange={(val: string) => handlePropertyChange(val)}
                sections={propertySections}
                placeholderAr="اختر الوحدة العقارية من الكتالوج"
                placeholderEn="Choose a property unit from the catalog"
                isAr={isAr}
                hasError={!!contractErrors.property}
                errorMessage={contractErrors.property}
                customAction={{
                  labelAr: 'إدخال وحدة أو مشروع مخصص',
                  labelEn: 'Custom project / unit',
                  onClick: () => handlePropertyChange('custom_unit')
                }}
              />

              {selectedProperty && selectedProperty.building_units && selectedProperty.building_units.length > 0 && (
                <div className={p.field}>
                  <div className={p.labelRow}>
                    <label className={p.label} htmlFor="ncw-unit">{isAr ? 'الشقة أو العمارة بالكامل' : 'Apartment or Whole Building'}</label>
                    {selectedBuildingUnitId ? (
                      <span className={`${p.pill} ${p.pillSuccess}`}><bdi>{isAr ? `شقة ${selectedBuildingUnit?.unit_number || ''}` : `Apt ${selectedBuildingUnit?.unit_number || ''}`}</bdi></span>
                    ) : (
                      <span className={canSellWhole ? p.pill : `${p.pill} ${p.pillWarning}`}>
                        {canSellWhole ? (isAr ? 'بيع العمارة بالكامل' : 'Whole Building Sale') : (isAr ? 'بيع العمارة بالكامل غير متاح' : 'Whole building unavailable')}
                      </span>
                    )}
                  </div>
                  <select
                    id="ncw-unit"
                    className={p.input}
                    value={selectedBuildingUnitId || (canSellWhole ? 'whole' : '')}
                    onChange={e => handleBuildingUnitChange(e.target.value === 'whole' ? '' : e.target.value)}
                  >
                    {canSellWhole ? (
                      <option value="whole">{isAr ? 'بيع العمارة بالكامل (لا توجد وحدات مباعة)' : 'Whole building sale (0 units sold)'}</option>
                    ) : (
                      <option value="" disabled>{isAr ? 'اختر شقة متاحة (توجد وحدات مباعة)' : 'Choose an available apartment (units already sold)'}</option>
                    )}
                    {availableBuildingUnits.map(u => (
                      <option key={u.unit_id} value={u.unit_id}>
                        {u.unit_number} · {isAr ? `الدور ${u.floor}` : `Floor ${u.floor}`} · {u.area_sqm} {isAr ? 'م²' : 'm²'} · {D(u.price_egp).formatEGP(isAr)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedPropertyId === 'custom_unit' && (
                <div className={p.field}>
                  <label className={p.label} htmlFor="ncw-custom">{isAr ? 'اسم المشروع / الوحدة المخصصة *' : 'Custom Unit Name *'}</label>
                  <input
                    id="ncw-custom"
                    type="text"
                    className={p.input}
                    value={customUnitName}
                    onChange={e => setCustomUnitName(e.target.value)}
                    placeholder={isAr ? 'مثال: فيلا A12 - حي النرجس' : 'e.g. Villa A12 - New Cairo'}
                    required
                  />
                </div>
              )}

              {selectedProperty && (
                <dl className={p.metaList}>
                  <div className={p.metaRow}>
                    <dt className={p.metaKey}>{isAr ? 'الموضوع' : 'Target'}</dt>
                    <dd className={p.metaValue}>
                      <bdi>
                        {selectedBuildingUnit
                          ? `${isAr ? 'شقة' : 'Apartment'} ${selectedBuildingUnit.unit_number}`
                          : selectedProperty.type === 'building'
                            ? (isAr ? 'عمارة بالكامل' : 'Entire Building')
                            : selectedProperty.type}
                      </bdi>
                    </dd>
                  </div>
                  <div className={p.metaRow}>
                    <dt className={p.metaKey}>{isAr ? 'المساحة الصافية' : 'Net Area'}</dt>
                    <dd className={(selectedBuildingUnit?.area_sqm || selectedProperty.area_sqm) ? p.metaValue : `${p.metaValue} ${p.emptyValue}`}>
                      <bdi>
                        {selectedBuildingUnit
                          ? `${selectedBuildingUnit.area_sqm} م² · ${isAr ? 'الدور' : 'Floor'} ${selectedBuildingUnit.floor}`
                          : selectedProperty.area_sqm ? `${selectedProperty.area_sqm} م²` : notEntered}
                      </bdi>
                    </dd>
                  </div>
                  <div className={p.metaRow}>
                    <dt className={p.metaKey}>{isAr ? 'سعر الكتالوج' : 'Catalog Price'}</dt>
                    <dd className={p.metaValue}>
                      <bdi>{D((selectedBuildingUnit ? selectedBuildingUnit.price_egp : selectedProperty.price_egp) || 0).formatEGP(isAr)}</bdi>
                    </dd>
                  </div>
                </dl>
              )}
            </section>

            <section className={p.section}>
              <div className={p.sectionHeader}>
                <h4 className={p.sectionTitle}>{isAr ? 'بيانات المشتري' : 'Buyer Identity'}</h4>
                <div className={p.segmented} role="tablist">
                  <button type="button" role="tab" aria-selected={leadSelectionMode === 'NEW_LEAD'}
                    className={leadSelectionMode === 'NEW_LEAD' ? `${p.segment} ${p.segmentActive}` : p.segment}
                    onClick={() => setLeadSelectionMode('NEW_LEAD')}>
                    {isAr ? 'عميل جديد' : 'New Buyer'}
                  </button>
                  <button type="button" role="tab" aria-selected={leadSelectionMode === 'EXISTING_LEAD'}
                    className={leadSelectionMode === 'EXISTING_LEAD' ? `${p.segment} ${p.segmentActive}` : p.segment}
                    onClick={() => setLeadSelectionMode('EXISTING_LEAD')}>
                    {isAr ? 'عميل مسجل' : 'Existing Lead'}
                  </button>
                </div>
              </div>
              {leadSelectionMode === 'EXISTING_LEAD' && (
                <ZFCustomSelect
                  value={selectedLeadId}
                  onChange={(val: string) => handleLeadChange(val)}
                  items={leadItems}
                  placeholderAr="اختر العميل من قاعدة العملاء المسجلين"
                  placeholderEn="Choose a registered CRM lead"
                  isAr={isAr}
                />
              )}
              <div className={p.fieldGrid}>
                <div className={p.field}>
                  <label className={p.label} htmlFor="ncw-name">{isAr ? 'الاسم القانوني الكامل *' : 'Full Legal Name *'}</label>
                  <input id="ncw-name" type="text" required className={p.input} value={buyerName}
                    onChange={e => setBuyerName(e.target.value)}
                    placeholder={isAr ? 'مثال: م. أحمد عبد الرحمن الشرقاوي' : 'e.g. Ahmed Abdelrahman'} />
                  {contractErrors.buyerName && <span className={p.errorText}>{contractErrors.buyerName}</span>}
                </div>
                <div className={p.field}>
                  <label className={p.label} htmlFor="ncw-nid">{isAr ? 'الرقم القومي / جواز السفر *' : 'National ID / Passport *'}</label>
                  <input id="ncw-nid" type="text" required className={`${p.input} ${p.numeric}`} value={buyerNationalId}
                    onChange={e => setBuyerNationalId(e.target.value)} placeholder="29401010102555" dir="ltr" />
                  {contractErrors.buyerNationalId && <span className={p.errorText}>{contractErrors.buyerNationalId}</span>}
                </div>
                <div className={p.field}>
                  <label className={p.label} htmlFor="ncw-phone">{isAr ? 'رقم الهاتف المحمول' : 'Mobile Phone'}</label>
                  <input id="ncw-phone" type="tel" className={`${p.input} ${p.numeric}`} value={buyerPhone}
                    onChange={e => setBuyerPhone(e.target.value)} placeholder="010XXXXXXXX" dir="ltr" />
                </div>
                <div className={p.field}>
                  <label className={p.label} htmlFor="ncw-email">{isAr ? 'البريد الإلكتروني' : 'Email Address'}</label>
                  <input id="ncw-email" type="email" className={p.input} value={buyerEmail}
                    onChange={e => setBuyerEmail(e.target.value)} placeholder="client@domain.com" dir="ltr" />
                </div>
              </div>
            </section>
          </>
        )}

        {step === 2 && (
          <>
            <section className={p.section}>
              <h4 className={p.sectionTitle}>{isAr ? 'السعر' : 'Price'}</h4>
              <div className={p.fieldGrid}>
                <div className={p.field}>
                  <label className={p.label} htmlFor="ncw-price">{isAr ? 'سعر الوحدة الأساسي *' : 'Base Unit Price *'}</label>
                  <div className={p.affixWrap}>
                    <input id="ncw-price" type="number" step="1000" required className={`${p.input} ${p.numeric}`}
                      value={basePriceInput} onChange={e => setBasePriceInput(e.target.value)} />
                    <span className={p.affix}>{isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                  {contractErrors.price && <span className={p.errorText}>{contractErrors.price}</span>}
                </div>
                <div className={p.figure}>
                  <span className={p.figureLabel}>{isAr ? 'إجمالي قيمة العقد' : 'Gross Contract Value'}</span>
                  <bdi className={p.figureValue}>{D(totalNominalValue).formatEGP(isAr)}</bdi>
                </div>
              </div>
            </section>

            <section className={p.section}>
              <h4 className={p.sectionTitle}>{isAr ? 'المقدم والأقساط' : 'Down Payment & Installments'}</h4>
              <div className={`${p.fieldGrid} ${p.fieldGrid3}`}>
                <div className={p.field}>
                  <label className={p.label} htmlFor="ncw-dp-pct">{isAr ? 'نسبة المقدم ٪' : 'Down Payment %'}</label>
                  <input id="ncw-dp-pct" type="number" min="5" max="100" className={`${p.input} ${p.numeric}`}
                    value={downPaymentInputPct}
                    onChange={e => { setDownPaymentInputPct(e.target.value); setDownPaymentAmountInput(''); }} />
                  <div className={p.chipRow}>
                    {[10, 15, 20, 25, 30].map(pct => (
                      <button key={pct} type="button"
                        className={downPaymentAmountInput === '' && downPaymentInputPct === pct.toString() ? `${p.chip} ${p.chipActive}` : p.chip}
                        onClick={() => { setDownPaymentInputPct(pct.toString()); setDownPaymentAmountInput(''); }}>
                        <bdi className={p.numeric}>{pct}%</bdi>
                      </button>
                    ))}
                  </div>
                </div>
                <div className={p.field}>
                  <label className={p.label} htmlFor="ncw-dp-amt">{isAr ? 'دفعة الحجز والمقدم (الدفعة 0)' : 'Down Payment (Tranche 0)'}</label>
                  <div className={p.affixWrap}>
                    <input id="ncw-dp-amt" type="number" step="1000" className={`${p.input} ${p.numeric}`}
                      value={modalDpAmount}
                      onChange={e => {
                        setDownPaymentAmountInput(e.target.value);
                        if (totalNominalValue > 0) {
                          setDownPaymentInputPct(((parseFloat(e.target.value) || 0) / totalNominalValue * 100).toFixed(1));
                        }
                      }} />
                    <span className={p.affix}>{isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                  <p className={p.hint}>{isAr ? 'تُسدد فوراً عند التعاقد.' : 'Paid on signing.'}</p>
                  {contractErrors.downPayment && <span className={p.errorText}>{contractErrors.downPayment}</span>}
                </div>
                <div className={p.field}>
                  <label className={p.label} htmlFor="ncw-count">{isAr ? 'عدد الأقساط' : 'Number of Installments'}</label>
                  <select id="ncw-count" className={p.input} value={numInstallments} onChange={e => setNumInstallments(e.target.value)}>
                    <option value="4">4 {isAr ? 'أقساط' : 'tranches'}</option>
                    <option value="8">8 {isAr ? 'أقساط (سنتان ربع سنوي)' : 'tranches (2 yrs)'}</option>
                    <option value="12">12 {isAr ? 'قسطاً (٣ سنوات ربع سنوي)' : 'tranches (3 yrs)'}</option>
                    <option value="16">16 {isAr ? 'قسطاً (٤ سنوات ربع سنوي)' : 'tranches (4 yrs)'}</option>
                    <option value="20">20 {isAr ? 'قسطاً (٥ سنوات ربع سنوي)' : 'tranches (5 yrs)'}</option>
                    <option value="24">24 {isAr ? 'قسطاً (سنتان شهرياً)' : 'tranches (2 yrs monthly)'}</option>
                  </select>
                </div>
                <div className={p.field}>
                  <label className={p.label} htmlFor="ncw-freq">{isAr ? 'تكرار السداد' : 'Payment Frequency'}</label>
                  <select id="ncw-freq" className={p.input} value={installmentFrequency} onChange={e => setInstallmentFrequency(e.target.value as any)}>
                    <option value="MONTHLY">{isAr ? 'شهري' : 'Monthly'}</option>
                    <option value="QUARTERLY">{isAr ? 'ربع سنوي (كل ٣ أشهر)' : 'Quarterly'}</option>
                    <option value="SEMI_ANNUAL">{isAr ? 'نصف سنوي (كل ٦ أشهر)' : 'Semi-Annual'}</option>
                  </select>
                </div>
                <div className={p.field}>
                  <label className={p.label} htmlFor="ncw-dp-date">{isAr ? 'تاريخ سداد المقدم' : 'Down Payment Date'}</label>
                  <input id="ncw-dp-date" type="date" className={`${p.input} ${p.numeric}`} value={firstPaymentDate} onChange={e => setFirstPaymentDate(e.target.value)} />
                </div>
                <div className={p.field}>
                  <label className={p.label} htmlFor="ncw-first-due">{isAr ? 'استحقاق أول قسط' : 'First Tranche Due'}</label>
                  <input id="ncw-first-due" type="date" className={`${p.input} ${p.numeric}`} value={firstInstallmentDueDate} onChange={e => setFirstInstallmentDueDate(e.target.value)} />
                </div>
              </div>
            </section>

            {previewSchedule.length > 0 && (
              <section className={p.section}>
                <div className={p.sectionHeader}>
                  <h4 className={p.sectionTitle}>{isAr ? `معاينة الجدول (المقدم + ${previewSchedule.length} أقساط)` : `Schedule preview (Tranche 0 + ${previewSchedule.length})`}</h4>
                  <bdi className={`${p.hint} ${p.numeric}`}>{isAr ? 'القسط ' : 'Per tranche '}{D(previewSchedule[0]?.amount || 0).formatEGP(isAr)}</bdi>
                </div>
                <div className={`${p.tableWrap} ${p.tableScroll}`}>
                  <table className={p.table}>
                    <thead>
                      <tr><th scope="col">#</th><th scope="col">{isAr ? 'الاستحقاق' : 'Due Date'}</th><th scope="col">{isAr ? 'القيمة' : 'Amount'}</th><th scope="col">{isAr ? 'البيان' : 'Description'}</th></tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><bdi>0</bdi></td>
                        <td><bdi>{firstPaymentDate || notEntered}</bdi></td>
                        <td><bdi>{D(modalDpAmount).formatEGP(isAr)}</bdi></td>
                        <td><span className={`${p.pill} ${p.pillSuccess}`}>{isAr ? 'المقدم عند التعاقد' : 'Paid on signing'}</span></td>
                      </tr>
                      {previewSchedule.slice(0, 10).map(t => (
                        <tr key={t.index}>
                          <td><bdi>{t.index}</bdi></td>
                          <td><bdi>{t.dueDate}</bdi></td>
                          <td><bdi>{D(t.amount).formatEGP(isAr)}</bdi></td>
                          <td>{isAr ? 'قسط مجدول' : 'Scheduled'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <section className={p.section}>
              <div className={p.sectionHeader}>
                <h4 className={p.sectionTitle}>{isAr ? 'حصص الشركاء في التمويل' : 'Partner Equity Splits'}</h4>
                <span className={splitsBalanced ? `${p.pill} ${p.pillSuccess}` : `${p.pill} ${p.pillDanger}`}>
                  <bdi className={p.numeric}>{isAr ? 'الإجمالي ' : 'Total '}{totalSplitsPct.toFixed(1)}%</bdi>
                </span>
              </div>
              <div className={p.ratioBar} aria-hidden>
                {partnerSplits.map(item => (
                  <div key={item.partnerName} className={p.ratioSegment} style={{ width: `${Math.max(0, item.sharePct)}%` }} title={`${item.partnerName}: ${item.sharePct}%`} />
                ))}
              </div>
              <div>
                {partnerSplits.map((item, idx) => (
                  <div key={item.partnerName} className={p.shareRow}>
                    <bdi className={p.shareName}>{item.partnerName}</bdi>
                    <bdi className={p.shareAmount}>{D(totalNominalValue * (item.sharePct / 100)).formatEGP(isAr)}</bdi>
                    <div className={p.affixWrap}>
                      <input type="number" min="0" max="100" className={`${p.input} ${p.numeric}`}
                        aria-label={isAr ? `حصة ${item.partnerName}` : `${item.partnerName} share`}
                        value={item.sharePct}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setPartnerSplits(partnerSplits.map((ps, i) => i === idx ? { ...ps, sharePct: val } : ps));
                        }} />
                      <span className={p.affix}>%</span>
                    </div>
                    {idx > 0 ? (
                      <button type="button" className={p.iconButton} aria-label={isAr ? `حذف ${item.partnerName}` : `Remove ${item.partnerName}`}
                        onClick={() => setPartnerSplits(smartRemovePartner(partnerSplits, idx))}>
                        <Trash2 size={14} />
                      </button>
                    ) : <span aria-hidden />}
                  </div>
                ))}
              </div>
              {contractErrors.splits && (
                <div className={`${p.notice} ${p.noticeDanger}`} role="alert">
                  <AlertCircle size={16} className={p.noticeIconDanger} />
                  <p className={p.noticeBody}>{contractErrors.splits}</p>
                </div>
              )}
            </section>

            <section className={p.section}>
              <h4 className={p.sectionTitle}>{isAr ? 'خزينة استلام المقدم' : 'Down Payment Treasury'}</h4>
              <div className={p.choiceGrid} role="radiogroup">
                <button type="button" role="radio" aria-checked={destinationTreasury === 'SAFE_101000'}
                  className={destinationTreasury === 'SAFE_101000' ? `${p.choice} ${p.choiceSelected}` : p.choice}
                  onClick={() => setDestinationTreasury('SAFE_101000')}>
                  <span className={p.choiceIcon}><Wallet size={16} /></span>
                  <span className={p.choiceText}>
                    <span className={p.choiceTitle}>{isAr ? 'الخزينة الرئيسية' : 'Main Safe'}</span>
                    <bdi className={`${p.choiceDesc} ${p.numeric}`}>101000</bdi>
                  </span>
                </button>
                <button type="button" role="radio" aria-checked={destinationTreasury === 'BANK_102000'}
                  className={destinationTreasury === 'BANK_102000' ? `${p.choice} ${p.choiceSelected}` : p.choice}
                  onClick={() => setDestinationTreasury('BANK_102000')}>
                  <span className={p.choiceIcon}><Landmark size={16} /></span>
                  <span className={p.choiceText}>
                    <span className={p.choiceTitle}>{isAr ? 'الحساب البنكي' : 'Commercial Bank'}</span>
                    <bdi className={`${p.choiceDesc} ${p.numeric}`}>102000</bdi>
                  </span>
                </button>
              </div>
            </section>

            <section className={p.section}>
              <h4 className={p.sectionTitle}>{isAr ? 'ملخص الصفقة' : 'Deal Summary'}</h4>
              <dl className={p.metaList}>
                <div className={p.metaRow}>
                  <dt className={p.metaKey}><Building2 size={12} aria-hidden /> {isAr ? 'الوحدة / المشروع' : 'Unit / Project'}</dt>
                  <dd className={targetLabel ? p.metaValue : `${p.metaValue} ${p.emptyValue}`}><bdi>{targetLabel || notEntered}</bdi></dd>
                </div>
                <div className={p.metaRow}>
                  <dt className={p.metaKey}><Users size={12} aria-hidden /> {isAr ? 'المشتري' : 'Buyer'}</dt>
                  <dd className={buyerName ? p.metaValue : `${p.metaValue} ${p.emptyValue}`}><bdi>{buyerName || notEntered}</bdi></dd>
                </div>
                <div className={p.metaRow}>
                  <dt className={p.metaKey}>{isAr ? 'القيمة التعاقدية' : 'Gross Value'}</dt>
                  <dd className={p.metaValue}><bdi>{D(totalNominalValue).formatEGP(isAr)}</bdi></dd>
                </div>
                <div className={p.metaRow}>
                  <dt className={p.metaKey}>{isAr ? 'دفعة الحجز والمقدم' : 'Down Payment (Tranche 0)'}</dt>
                  <dd className={p.metaValue}><bdi>{D(modalDpAmount).formatEGP(isAr)}</bdi></dd>
                </div>
                <div className={p.metaRow}>
                  <dt className={p.metaKey}>{isAr ? 'تاريخ التوقيع' : 'Contract Date'}</dt>
                  <dd className={firstPaymentDate ? p.metaValue : `${p.metaValue} ${p.emptyValue}`}><bdi>{firstPaymentDate || notEntered}</bdi></dd>
                </div>
              </dl>
              <p className={`${p.hint} ${p.numeric}`}>
                <bdi>
                  {isAr
                    ? `القيد: مدين ${destinationTreasury === 'SAFE_101000' ? '101000 خزينة' : '102000 بنك'} ${D(modalDpAmount).formatEGP(isAr)} · دائن 203000 إيرادات مؤجلة ${D(modalDpAmount).formatEGP(isAr)}`
                    : `Entry: Dr ${destinationTreasury === 'SAFE_101000' ? '101000 Safe' : '102000 Bank'} ${D(modalDpAmount).formatEGP(isAr)} · Cr 203000 Deferred Revenue ${D(modalDpAmount).formatEGP(isAr)}`}
                </bdi>
              </p>
            </section>
          </>
        )}
      </form>
    </ZFModalShell>
  );
};
