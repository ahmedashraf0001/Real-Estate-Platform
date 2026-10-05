'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Wallet, 
  Smartphone, 
  Scale
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { 
  ERPContract, 
  ERPAccountingPeriod 
} from '@/lib/erp/types';
import { toLocalDateStr } from '@/lib/erp/treasuryLedger';
import { ContractsEngine } from '@/lib/erp/contracts';
import { 
  PartnerShareItem, 
  PRIMARY_DEVELOPER_NAME, 
  normalizePartnerSplits, 
  smartAddPartner, 
  smartRemovePartner, 
  autoBalanceShares 
} from '@/lib/erp/partnersDirectory';
import { D } from '@/lib/erp/math';
import { ZFCustomSelect, ZFCustomSelectSection } from '../common/ZFCustomSelect';
import { ZFModalShell } from '../common/ZFModalShell';
import { 
  ZFField, 
  ZFMoneyInput, 
  ZFChoices, 
  ZFFacts, 
  ZFEffect, 
  ZFFormFooter, 
  zfForm 
} from '../common/ZFForm';
import { 
  isPropertyAvailableForContract,
  isUnitSold,
  getAvailableUnitsForProperty,
  canSellWholeBuilding,
} from '@/lib/erp/propertiesPortfolioCalculations';
import shellStyles from '../ZFWorkstationShell.module.css';

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
  destinationTreasury?: 'SAFE_101000' | 'BANK_102000' | '101000' | '102000';
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
  const [firstPaymentDate, setFirstPaymentDate] = useState<string>(() => toLocalDateStr(new Date()));
  const [firstInstallmentDueDate, setFirstInstallmentDueDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return toLocalDateStr(d);
  });

  // Step 3: Equity Splits & Destination
  const [partnerSplits, setPartnerSplits] = useState<PartnerShareItem[]>(() => normalizePartnerSplits(null));
  const [selectedPartnerToAdd, setSelectedPartnerToAdd] = useState<string>('');
  const [customPartnerNameInput, setCustomPartnerNameInput] = useState<string>('');
  const [destinationTreasury, setDestinationTreasury] = useState<'101000' | '102000'>('101000');

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

      if (targetUnitId && !availableUnits.some(u => u.unit_id === targetUnitId)) {
        targetUnitId = '';
      }

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
      setNumInstallments(prop.completion_status === 'off_plan' ? '12' : '8');
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

  const prevIsOpenRef = useRef(false);
  const resetPropsRef = useRef({
    initialPropertyId,
    initialBuildingUnitId,
    initialBuyerName,
    initialBuyerPhone,
    initialBuyerEmail,
    initialLeadId,
    applyPropertySelection,
  });

  useEffect(() => {
    resetPropsRef.current = {
      initialPropertyId,
      initialBuildingUnitId,
      initialBuyerName,
      initialBuyerPhone,
      initialBuyerEmail,
      initialLeadId,
      applyPropertySelection,
    };
  });

  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      return;
    }
    if (!prevIsOpenRef.current) {
      const resetTimer = window.setTimeout(() => {
        prevIsOpenRef.current = true;
        const {
          initialLeadId: curLeadId,
          initialBuyerName: curBuyerName,
          initialBuyerPhone: curBuyerPhone,
          initialBuyerEmail: curBuyerEmail,
          initialPropertyId: curPropId,
          initialBuildingUnitId: curUnitId,
          applyPropertySelection: curApplySelection,
        } = resetPropsRef.current;

        setStep(1);
        setContractErrors({});
        if (curLeadId) {
          setLeadSelectionMode('EXISTING_LEAD');
          setSelectedLeadId(curLeadId);
        } else {
          setLeadSelectionMode('NEW_LEAD');
          setSelectedLeadId('');
        }
        setBuyerName(curBuyerName || '');
        setBuyerNationalId('');
        setBuyerPhone(curBuyerPhone || '');
        setBuyerEmail(curBuyerEmail || '');
        setPaymentPlanType('INSTALLMENTS');
        setDownPaymentInputPct('15');
        setDownPaymentAmountInput('');
        setInstallmentFrequency('QUARTERLY');
        setFirstPaymentDate(toLocalDateStr(new Date()));
        const d = new Date();
        d.setMonth(d.getMonth() + 3);
        setFirstInstallmentDueDate(toLocalDateStr(d));
        setDestinationTreasury('101000');

        if (curPropId) {
          curApplySelection(curPropId, curUnitId);
        } else {
          setSelectedPropertyId('');
          setSelectedBuildingUnitId('');
          setCustomUnitName('');
          setBasePriceInput('');
          setNumInstallments('8');
          setPartnerSplits(normalizePartnerSplits(null));
        }
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }
  }, [isOpen]);

  const basePrice = parseFloat(basePriceInput) || 0;
  const totalNominalValue = basePrice;

  const modalDpAmount = useMemo(() => {
    if (paymentPlanType === 'FULL_CASH') return totalNominalValue;
    if (downPaymentAmountInput !== '') {
      return Math.min(totalNominalValue, parseFloat(downPaymentAmountInput) || 0);
    }
    const pct = (parseFloat(downPaymentInputPct) || 15) / 100;
    return Math.round(totalNominalValue * pct);
  }, [paymentPlanType, totalNominalValue, downPaymentAmountInput, downPaymentInputPct]);

  const selectedProperty = useMemo(() => {
    return properties.find(p => p.id === selectedPropertyId);
  }, [properties, selectedPropertyId]);

  const canSellWhole = useMemo(() => {
    if (!selectedProperty) return false;
    return canSellWholeBuilding(selectedProperty, contracts);
  }, [selectedProperty, contracts]);

  const selectedBuildingUnit = useMemo(() => {
    if (!selectedProperty || !selectedBuildingUnitId) return null;
    return (selectedProperty.building_units || []).find(u => u.unit_id === selectedBuildingUnitId) || null;
  }, [selectedProperty, selectedBuildingUnitId]);

  const availableBuildingUnits = useMemo(() => {
    if (!selectedProperty || selectedProperty.type !== 'building' || !selectedProperty.building_units) return [];
    return getAvailableUnitsForProperty(selectedProperty, contracts);
  }, [selectedProperty, contracts]);

  const handleLeadChange = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setBuyerName(lead.name || '');
      setBuyerPhone(lead.phone || '');
      if (contractErrors.buyerName) setContractErrors(prev => ({ ...prev, buyerName: '' }));
    }
  };

  const previewSchedule = useMemo(() => {
    if (paymentPlanType === 'FULL_CASH') return [];
    const count = parseInt(numInstallments, 10) || 0;
    if (count <= 0) return [];

    const dpPct = totalNominalValue > 0 ? (modalDpAmount / totalNominalValue) : 0;
    const generated = ContractsEngine.generateSchedule(
      'preview',
      D(totalNominalValue),
      dpPct,
      count,
      firstPaymentDate,
      installmentFrequency,
      firstInstallmentDueDate
    );

    return generated.slice(1).map((s, idx) => ({
      index: idx + 1,
      dueDate: s.due_date,
      amount: parseFloat(s.nominal_value) || 0
    }));
  }, [paymentPlanType, numInstallments, totalNominalValue, modalDpAmount, installmentFrequency, firstInstallmentDueDate, firstPaymentDate]);

  const totalSplitsPct = useMemo(() => {
    return partnerSplits.reduce((sum, item) => sum + (parseFloat(item.sharePct.toString()) || 0), 0);
  }, [partnerSplits]);

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedPropertyId) {
      errs.property = isAr ? 'يرجى اختيار الوحدة العقارية' : 'Please select a property unit';
    } else if (selectedPropertyId === 'custom_unit' && !customUnitName.trim()) {
      errs.property = isAr ? 'يرجى إدخال اسم المشروع أو الوحدة المخصصة' : 'Custom unit name is required';
    } else if (selectedProperty && !isPropertyAvailableForContract(selectedProperty, contracts)) {
      errs.property = isAr ? 'هذا العقار مباع بالكامل وغير متاح للتعاقد' : 'This property is fully sold and unavailable';
    } else if (selectedProperty && selectedProperty.type === 'building' && !selectedBuildingUnitId && !canSellWholeBuilding(selectedProperty, contracts)) {
      errs.property = isAr ? 'يرجى اختيار شقة محددة، لا يمكن بيع العمارة بالكامل نظراً لوجود وحدات مباعة' : 'Please select an apartment; whole building sale is not allowed';
    } else if (selectedProperty && selectedProperty.type === 'building' && selectedBuildingUnitId) {
      const unitObj = selectedBuildingUnit || (selectedProperty.building_units || []).find(u => u.unit_id === selectedBuildingUnitId);
      if (unitObj && isUnitSold(selectedProperty, unitObj, contracts)) {
        errs.property = isAr ? 'هذه الشقة تم بيعها مسبقاً' : 'This unit is already sold';
      }
    }
    if (!buyerName.trim()) {
      errs.buyerName = isAr ? 'يرجى إدخال اسم المشتري' : 'Buyer name is required';
    }
    if (!buyerNationalId.trim() || buyerNationalId.trim().length < 8) {
      errs.buyerNationalId = isAr ? 'يرجى إدخال الرقم القومي أو جواز السفر (٨ خانات على الأقل)' : 'Valid National ID required (min 8 digits)';
    }
    setContractErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (totalNominalValue <= 0) {
      errs.price = isAr ? 'يرجى إدخال سعر تعاقدي أكبر من الصفر' : 'Valid contract price required';
    }
    if (modalDpAmount <= 0) {
      errs.downPayment = isAr ? 'يرجى تحديد دفعة مقدمة صحيحة' : 'Down payment must be greater than zero';
    }
    setContractErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Math.abs(totalSplitsPct - 100) > 0.01) {
      setContractErrors({ splits: isAr ? 'يجب أن يكون مجموع نسب الشركاء 100% بالضبط' : 'Partner shares must sum to exactly 100%' });
      return;
    }

    const isWholeBuilding = !selectedBuildingUnitId;
    if (isWholeBuilding && selectedProperty && selectedProperty.type === 'building' && !canSellWholeBuilding(selectedProperty, contracts)) {
      setContractErrors({ property: isAr ? 'لا يمكن بيع العمارة بالكامل نظراً لوجود وحدات مباعة مسبقاً' : 'Cannot sell whole building because units are sold' });
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

  const propertySections: ZFCustomSelectSection[] = useMemo(() => {
    const sectionsMap = new Map<string, ZFCustomSelectSection>();

    const getPropertySection = (p: Property): { id: string; titleAr: string; titleEn: string } => {
      const rawLoc = (p.location || '').trim();
      const districtAr = (p as any).district_ar?.trim();
      const districtEn = (p as any).district?.trim();
      const cityAr = (p as any).city_ar?.trim();
      const cityEn = (p as any).city?.trim();

      if (districtAr || districtEn) {
        const titleAr = districtAr || districtEn || rawLoc;
        const titleEn = districtEn || districtAr || rawLoc;
        const id = (districtEn || districtAr || 'district').toLowerCase().replace(/\s+/g, '_');
        return { id, titleAr, titleEn };
      }

      if (rawLoc) {
        const id = rawLoc.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/gi, '_');
        return { id, titleAr: rawLoc, titleEn: rawLoc };
      }

      if (cityAr || cityEn) {
        const titleAr = cityAr || cityEn;
        const titleEn = cityEn || cityAr;
        const id = (cityEn || cityAr).toLowerCase().replace(/\s+/g, '_');
        return { id, titleAr, titleEn };
      }

      return {
        id: 'general_portfolio',
        titleAr: 'محفظة العقارات العامة',
        titleEn: 'General Portfolio'
      };
    };

    properties.forEach(p => {
      if (!isPropertyAvailableForContract(p, contracts)) return;

      const secMeta = getPropertySection(p);
      if (!sectionsMap.has(secMeta.id)) {
        sectionsMap.set(secMeta.id, {
          sectionId: secMeta.id,
          titleAr: secMeta.titleAr,
          titleEn: secMeta.titleEn,
          items: []
        });
      }

      const availableUnits = getAvailableUnitsForProperty(p, contracts);
      const isBuilding = p.type === 'building';
      const availableUnitsCount = isBuilding ? availableUnits.length : (p.listing_status === 'sold' ? 0 : 1);
      const wholeBuildingSellable = canSellWholeBuilding(p, contracts);

      let unitLabel = '';
      if (isBuilding) {
        if (wholeBuildingSellable) {
          unitLabel = isAr ? ` (عمارة بالكامل - ${availableUnitsCount} شقة متاحة)` : ` (Whole Building - ${availableUnitsCount} units available)`;
        } else {
          unitLabel = isAr ? ` (${availableUnitsCount} شقة متاحة)` : ` (${availableUnitsCount} units available)`;
        }
      } else {
        unitLabel = isAr ? ' (وحدة مستقلة متاحة)' : ' (Independent Unit)';
      }

      sectionsMap.get(secMeta.id)!.items.push({
        value: p.id,
        labelAr: `${p.title_ar || p.title_en}${unitLabel}`,
        labelEn: `${p.title_en || p.title_ar}${unitLabel}`,
        sublabelAr: `${Number(p.price_egp || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ج.م`,
        sublabelEn: `${Number(p.price_egp || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} EGP`
      });
    });

    return Array.from(sectionsMap.values());
  }, [properties, contracts, isAr]);

  if (!isOpen) return null;

  const footer = (
    <ZFFormFooter>
      {step === 1 && (
        <>
          <button
            type="button"
            className={shellStyles.btnSecondary}
            onClick={handleModalClose}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            className={shellStyles.btnPrimary}
            onClick={() => {
              if (validateStep1()) setStep(2);
            }}
          >
            {isAr ? 'التالي: شروط السداد' : 'Next: Payment Terms'}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <button
            type="button"
            className={shellStyles.btnSecondary}
            onClick={() => setStep(1)}
          >
            {isAr ? 'السابق' : 'Back'}
          </button>
          <button
            type="button"
            className={shellStyles.btnGhost}
            onClick={handleModalClose}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            className={shellStyles.btnPrimary}
            onClick={() => {
              if (validateStep2()) setStep(3);
            }}
          >
            {isAr ? 'التالي: حصص الشركاء' : 'Next: Partner Splits'}
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <button
            type="button"
            className={shellStyles.btnSecondary}
            onClick={() => setStep(2)}
          >
            {isAr ? 'السابق' : 'Back'}
          </button>
          <button
            type="button"
            className={shellStyles.btnGhost}
            onClick={handleModalClose}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="submit"
            form="zf-new-contract-form"
            className={shellStyles.btnPrimary}
            disabled={isMutating || Math.abs(totalSplitsPct - 100) > 0.01}
          >
            {isMutating 
              ? (isAr ? 'جارٍ الاعتماد…' : 'Posting…') 
              : (isAr ? 'اعتماد وتوثيق العقد' : 'Execute Contract')}
          </button>
        </>
      )}
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={handleModalClose}
      isAr={isAr}
      title={isAr ? 'عقد بيع جديد' : 'New Sales Contract'}
      subtitle={isAr 
        ? 'ربط الوحدة العقارية وجدولة أقساط السداد وتحديد حصص الشركاء.' 
        : 'Link property unit, schedule installments, and set partner equity splits.'}
      icon={<Plus size={18} />}
      maxWidth="min(1100px, 94vw)"
      maxHeight="92vh"
      footer={footer}
    >
      <form id="zf-new-contract-form" className={zfForm.form} onSubmit={handleFinalSubmit}>
        {/* Step Navigation Bar */}
        <ZFChoices<'1' | '2' | '3'>
          value={String(step) as '1' | '2' | '3'}
          onChange={(val) => {
            const s = Number(val) as 1 | 2 | 3;
            if (s === 2 && !validateStep1()) return;
            if (s === 3) {
              if (!validateStep1()) { setStep(1); return; }
              if (!validateStep2()) { setStep(2); return; }
            }
            setStep(s);
          }}
          options={[
            { id: '1', label: isAr ? '١. أطراف التعاقد والوحدة' : '1. Unit & Buyer', sub: isAr ? 'الوحدة والمشتري' : 'Property & Buyer' },
            { id: '2', label: isAr ? '٢. الشروط وجدولة السداد' : '2. Payment Terms', sub: isAr ? 'السعر والمقدم والأقساط' : 'Price & Tranches' },
            { id: '3', label: isAr ? '٣. الشركاء والاعتماد' : '3. Equity & Posting', sub: isAr ? 'حصص التمويل والتوجيه' : 'Splits & Ledger' }
          ]}
        />

        {/* Global Error Banner */}
        {Object.keys(contractErrors).length > 0 && (
          <ZFEffect tone="danger">
            {Object.values(contractErrors).filter(Boolean).join(' • ')}
          </ZFEffect>
        )}

        {/* STEP 1: PROPERTY & BUYER */}
        {step === 1 && (
          <>
            <div className={zfForm.section}>
              <h4 className={zfForm.sectionTitle}>{isAr ? 'الوحدة العقارية موضوع التعاقد' : 'Target Property Unit'}</h4>
              
              <ZFField label={isAr ? 'العقار أو المشروع' : 'Property / Project'} required error={contractErrors.property}>
                <ZFCustomSelect 
                  value={selectedPropertyId}
                  onChange={(val: string) => handlePropertyChange(val)}
                  sections={propertySections}
                  placeholderAr="-- اختر الوحدة العقارية من الكتالوج --"
                  placeholderEn="-- Choose Property Unit from Catalog --"
                  isAr={isAr}
                  hasError={!!contractErrors.property}
                  errorMessage={contractErrors.property}
                  customAction={{
                    labelAr: '+ إدخال وحدة أو مشروع مخصص لزكريا فريد',
                    labelEn: '+ Custom Developer Project / Unit',
                    onClick: () => handlePropertyChange('custom_unit')
                  }}
                />
              </ZFField>

              {selectedPropertyId === 'custom_unit' && (
                <ZFField label={isAr ? 'اسم المشروع أو الوحدة المخصصة' : 'Custom Project / Unit Name'} required>
                  <input
                    type="text"
                    className={zfForm.control}
                    value={customUnitName}
                    onChange={e => setCustomUnitName(e.target.value)}
                    placeholder={isAr ? 'مثال: عمارة النرجس - شقة ٤' : 'e.g. Narjis Building - Apt 4'}
                    required
                  />
                </ZFField>
              )}

              {selectedProperty && selectedProperty.building_units && selectedProperty.building_units.length > 0 && (
                <ZFField label={isAr ? 'الشقة المحددة داخل العمارة' : 'Specific Apartment / Unit'} required={!canSellWhole}>
                  <select
                    className={zfForm.control}
                    value={selectedBuildingUnitId}
                    onChange={e => handleBuildingUnitChange(e.target.value)}
                  >
                    {canSellWhole && (
                      <option value="">{isAr ? 'بيع العمارة بالكامل (كافة الوحدات)' : 'Sell Whole Building (All Units)'}</option>
                    )}
                    {availableBuildingUnits.map(u => (
                      <option key={u.unit_id} value={u.unit_id}>
                        {`${u.unit_number} (الدور ${u.floor}) - ${Number(u.price_egp || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`}
                      </option>
                    ))}
                  </select>
                </ZFField>
              )}

              {selectedProperty && (
                <ZFFacts
                  items={[
                    { label: isAr ? 'الموقع' : 'Location', value: selectedProperty.location || '—' },
                    { label: isAr ? 'المساحة' : 'Area', value: `${selectedBuildingUnit?.area_sqm || selectedProperty.area_sqm || 0} م²` },
                    { label: isAr ? 'السعر الاسترشادي' : 'Catalog Price', value: `${Number(selectedBuildingUnit?.price_egp || selectedProperty.price_egp || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}` },
                    { label: isAr ? 'حالة البناء' : 'Status', value: selectedProperty.completion_status === 'ready' ? (isAr ? 'جاهز للتسليم' : 'Ready') : (isAr ? 'تحت الإنشاء' : 'Off-Plan') }
                  ]}
                />
              )}
            </div>

            <div className={zfForm.section}>
              <h4 className={zfForm.sectionTitle}>{isAr ? 'بيانات المشتري' : 'Buyer Details'}</h4>

              {leads.length > 0 && (
                <ZFChoices<'NEW_LEAD' | 'EXISTING_LEAD'>
                  value={leadSelectionMode}
                  onChange={setLeadSelectionMode}
                  options={[
                    { id: 'NEW_LEAD', label: isAr ? 'تسجيل عميل جديد' : 'New Client' },
                    { id: 'EXISTING_LEAD', label: isAr ? 'اختيار من قائمة العملاء' : 'Existing Lead' }
                  ]}
                />
              )}

              {leadSelectionMode === 'EXISTING_LEAD' && leads.length > 0 && (
                <ZFField label={isAr ? 'العميل المسجل' : 'Registered Client'}>
                  <select
                    className={zfForm.control}
                    value={selectedLeadId}
                    onChange={e => handleLeadChange(e.target.value)}
                  >
                    <option value="">{isAr ? '-- اختر العميل --' : '-- Choose Client --'}</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>
                        {`${l.name} • ${l.phone || l.email || ''}`}
                      </option>
                    ))}
                  </select>
                </ZFField>
              )}

              <div className={zfForm.row}>
                <ZFField label={isAr ? 'اسم المشتري' : 'Buyer Name'} required error={contractErrors.buyerName}>
                  <input
                    type="text"
                    className={zfForm.control}
                    placeholder={isAr ? 'الاسم بالكامل' : 'Full name'}
                    value={buyerName}
                    onChange={e => {
                      setBuyerName(e.target.value);
                      if (contractErrors.buyerName) setContractErrors(prev => ({ ...prev, buyerName: '' }));
                    }}
                    required
                  />
                </ZFField>
                <ZFField label={isAr ? 'الرقم القومي / جواز السفر' : 'National ID / Passport'} required error={contractErrors.buyerNationalId}>
                  <input
                    type="text"
                    className={`${zfForm.control} ${zfForm.mono}`}
                    placeholder="289XXXXXXXXXXXXX"
                    value={buyerNationalId}
                    onChange={e => {
                      setBuyerNationalId(e.target.value);
                      if (contractErrors.buyerNationalId) setContractErrors(prev => ({ ...prev, buyerNationalId: '' }));
                    }}
                    required
                  />
                </ZFField>
              </div>

              <div className={zfForm.row}>
                <ZFField label={isAr ? 'رقم الهاتف' : 'Phone'}>
                  <input
                    type="tel"
                    dir="ltr"
                    className={zfForm.control}
                    placeholder="010XXXXXXXX"
                    value={buyerPhone}
                    onChange={e => setBuyerPhone(e.target.value)}
                  />
                </ZFField>
                <ZFField label={isAr ? 'البريد الإلكتروني' : 'Email'}>
                  <input
                    type="email"
                    dir="ltr"
                    className={zfForm.control}
                    placeholder="client@example.com"
                    value={buyerEmail}
                    onChange={e => setBuyerEmail(e.target.value)}
                  />
                </ZFField>
              </div>
            </div>
          </>
        )}

        {/* STEP 2: PAYMENT TERMS */}
        {step === 2 && (
          <>
            <div className={zfForm.section}>
              <h4 className={zfForm.sectionTitle}>{isAr ? 'الشروط المالية ونظام السداد' : 'Payment Terms'}</h4>
              
              <div className={zfForm.row}>
                <ZFField label={isAr ? 'سعر البيع التعاقدي الإجمالي' : 'Gross Contract Price'} required error={contractErrors.price}>
                  <ZFMoneyInput
                    value={basePriceInput}
                    onChange={e => {
                      setBasePriceInput(e.target.value);
                      if (contractErrors.price) setContractErrors(prev => ({ ...prev, price: '' }));
                    }}
                    unit={isAr ? 'ج.م' : 'EGP'}
                    required
                  />
                </ZFField>
                <ZFField label={isAr ? 'نظام السداد' : 'Payment Plan Type'} required>
                  <ZFChoices<'INSTALLMENTS' | 'FULL_CASH'>
                    value={paymentPlanType}
                    onChange={setPaymentPlanType}
                    options={[
                      { id: 'INSTALLMENTS', label: isAr ? 'أقساط مجدولة' : 'Installments' },
                      { id: 'FULL_CASH', label: isAr ? 'سداد نقدي كامل' : 'Full Cash' }
                    ]}
                  />
                </ZFField>
              </div>

              {paymentPlanType === 'INSTALLMENTS' && (
                <>
                  <div className={zfForm.row}>
                    <ZFField label={isAr ? 'دفعة الحجز والمقدم' : 'Down Payment Amount'} required error={contractErrors.downPayment}>
                      <ZFMoneyInput
                        value={downPaymentAmountInput !== '' ? downPaymentAmountInput : modalDpAmount.toString()}
                        onChange={e => setDownPaymentAmountInput(e.target.value)}
                        unit={isAr ? 'ج.م' : 'EGP'}
                        required
                      />
                    </ZFField>
                    <ZFField label={isAr ? 'عدد الأقساط الدورية' : 'Number of Installments'} required>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        className={zfForm.control}
                        value={numInstallments}
                        onChange={e => setNumInstallments(e.target.value)}
                        required
                      />
                    </ZFField>
                  </div>

                  <div className={zfForm.row}>
                    <ZFField label={isAr ? 'دورية استحقاق الأقساط' : 'Installment Frequency'}>
                      <ZFChoices<'QUARTERLY' | 'MONTHLY' | 'SEMI_ANNUAL'>
                        value={installmentFrequency}
                        onChange={setInstallmentFrequency}
                        options={[
                          { id: 'QUARTERLY', label: isAr ? 'ربع سنوي' : 'Quarterly' },
                          { id: 'MONTHLY', label: isAr ? 'شهري' : 'Monthly' },
                          { id: 'SEMI_ANNUAL', label: isAr ? 'نصف سنوي' : 'Semi-Annual' }
                        ]}
                      />
                    </ZFField>
                    <ZFField label={isAr ? 'تاريخ توقيع العقد والدفعة الأولى' : 'Contract Date & First Payment'} required>
                      <input
                        type="date"
                        className={zfForm.control}
                        value={firstPaymentDate}
                        onChange={e => setFirstPaymentDate(e.target.value)}
                        required
                      />
                    </ZFField>
                  </div>

                  <ZFField label={isAr ? 'تاريخ استحقاق أول قسط دوري' : 'First Installment Due Date'} required>
                    <input
                      type="date"
                      className={zfForm.control}
                      value={firstInstallmentDueDate}
                      onChange={e => setFirstInstallmentDueDate(e.target.value)}
                      required
                    />
                  </ZFField>

                  {/* Schedule preview */}
                  {previewSchedule.length > 0 && (
                    <div className={zfForm.section}>
                      <h4 className={zfForm.sectionTitle}>
                        {isAr 
                          ? `جدول الدفعات والأقساط المتوقع (مقدم + ${previewSchedule.length} أقساط)` 
                          : `Projected Schedule (Deposit + ${previewSchedule.length} Installments)`}
                      </h4>
                      <div className={zfForm.form}>
                        <table className={zfForm.journalTable}>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                              <th className={zfForm.journalNum}>{isAr ? 'قيمة الدفعة' : 'Amount'}</th>
                              <th>{isAr ? 'البيان' : 'Description'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>#0</td>
                              <td>{firstPaymentDate}</td>
                              <td className={zfForm.journalNum}>
                                {Number(modalDpAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                              </td>
                              <td>{isAr ? 'دفعة الحجز والمقدم' : 'Down Payment'}</td>
                            </tr>
                            {previewSchedule.map(t => (
                              <tr key={t.index}>
                                <td>#{t.index}</td>
                                <td>{t.dueDate}</td>
                                <td className={zfForm.journalNum}>
                                  {Number(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                                </td>
                                <td>{isAr ? 'قسط دوري' : 'Installment'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* STEP 3: PARTNER SPLITS & DESTINATION */}
        {step === 3 && (
          <>
            <div className={zfForm.section}>
              <div className={zfForm.labelRow}>
                <h4 className={zfForm.sectionTitle}>{isAr ? 'توزيع حصص الشركاء' : 'Partner Equity Splits'}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={`${shellStyles.btnGhost} ${shellStyles.btnSm}`}
                    onClick={() => setPartnerSplits(autoBalanceShares(partnerSplits))}
                  >
                    <Scale size={13} />
                    {isAr ? 'موازنة النسب تلقائياً' : 'Auto Balance'}
                  </button>
                </div>
              </div>

              {/* Progress Visual Bar */}
              <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden', display: 'flex' }}>
                {partnerSplits.map((p, idx) => (
                  <div
                    key={p.partnerName}
                    style={{
                      width: `${Math.max(0, p.sharePct)}%`,
                      background: idx === 0 ? 'var(--erp-accent, #2563eb)' : idx === 1 ? '#0284c7' : '#15803d',
                      height: '100%'
                    }}
                    title={`${p.partnerName}: ${p.sharePct}%`}
                  />
                ))}
              </div>

              {/* Partner Rows */}
              <table className={zfForm.journalTable}>
                <thead>
                  <tr>
                    <th>{isAr ? 'الشريك' : 'Partner'}</th>
                    <th className={zfForm.journalNum}>{isAr ? 'الحصة %' : 'Share %'}</th>
                    <th className={zfForm.journalNum}>{isAr ? 'القيمة المقابلة' : 'Share Amount'}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {partnerSplits.map((item, idx) => (
                    <tr key={item.partnerName}>
                      <td><strong>{item.partnerName}</strong></td>
                      <td className={zfForm.journalNum}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          className={`${zfForm.control} ${zfForm.mono}`}
                          style={{ width: '80px', display: 'inline-block' }}
                          value={item.sharePct}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            const updated = partnerSplits.map((p, i) => i === idx ? { ...p, sharePct: val } : p);
                            setPartnerSplits(updated);
                          }}
                        />
                      </td>
                      <td className={zfForm.journalNum}>
                        {Number(totalNominalValue * (item.sharePct / 100)).toLocaleString('en-US', { maximumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {idx > 0 && (
                          <button
                            type="button"
                            className={shellStyles.btnGhost}
                            onClick={() => setPartnerSplits(smartRemovePartner(partnerSplits, idx))}
                          >
                            <Trash2 size={14} color="#dc2626" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Add Partner Form Row */}
              <div className={zfForm.row}>
                <ZFField label={isAr ? 'إضافة شريك من المسجلين' : 'Add Registered Partner'}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <select
                      className={zfForm.control}
                      value={selectedPartnerToAdd}
                      onChange={e => setSelectedPartnerToAdd(e.target.value)}
                    >
                      <option value="">{isAr ? '-- اختر شريكاً --' : '-- Select Partner --'}</option>
                      {unifiedPartners
                        .filter(p => !partnerSplits.some(ps => ps.partnerName === p.name))
                        .map(p => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      className={shellStyles.btnSecondary}
                      onClick={() => {
                        if (selectedPartnerToAdd) {
                          setPartnerSplits(smartAddPartner(partnerSplits, selectedPartnerToAdd, 10));
                          setSelectedPartnerToAdd('');
                        }
                      }}
                      disabled={!selectedPartnerToAdd}
                    >
                      {isAr ? 'إضافة' : 'Add'}
                    </button>
                  </div>
                </ZFField>

                <ZFField label={isAr ? 'أو إدخال اسم شريك جديد' : 'Or New Partner Name'}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      type="text"
                      className={zfForm.control}
                      placeholder={isAr ? 'اسم الشريك' : 'Partner name'}
                      value={customPartnerNameInput}
                      onChange={e => setCustomPartnerNameInput(e.target.value)}
                    />
                    <button
                      type="button"
                      className={shellStyles.btnSecondary}
                      onClick={() => {
                        if (customPartnerNameInput.trim()) {
                          setPartnerSplits(smartAddPartner(partnerSplits, customPartnerNameInput.trim(), 10));
                          setCustomPartnerNameInput('');
                        }
                      }}
                      disabled={!customPartnerNameInput.trim()}
                    >
                      {isAr ? 'إضافة' : 'Add'}
                    </button>
                  </div>
                </ZFField>
              </div>

              <ZFFacts
                items={[
                  {
                    label: isAr ? 'إجمالي الحصص الموزعة' : 'Total Allocated',
                    value: `${totalSplitsPct.toFixed(1)}%`,
                    tone: Math.abs(totalSplitsPct - 100) < 0.01 ? 'pos' : 'neg'
                  },
                  {
                    label: isAr ? 'المتبقي للتوزيع' : 'Remaining',
                    value: `${(100 - totalSplitsPct).toFixed(1)}%`
                  }
                ]}
              />
            </div>

            {/* Destination Treasury */}
            <div className={zfForm.section}>
              <h4 className={zfForm.sectionTitle}>{isAr ? 'الخزينة المستلمة للدفعة المقدمة' : 'Receiving Treasury'}</h4>
              <ZFChoices<'101000' | '102000'>
                value={destinationTreasury}
                onChange={setDestinationTreasury}
                options={[
                  {
                    id: '101000',
                    label: isAr ? 'الخزينة النقدية' : 'Cash Safe',
                    sub: isAr ? 'حساب الخزينة (١٠١٠٠٠)' : 'Safe (101000)',
                    icon: <Wallet size={16} />
                  },
                  {
                    id: '102000',
                    label: isAr ? 'حساب إنستاباي' : 'InstaPay',
                    sub: isAr ? 'حساب إنستاباي (١٠٢٠٠٠)' : 'InstaPay (102000)',
                    icon: <Smartphone size={16} />
                  }
                ]}
              />
            </div>

            {/* Deal Summary Facts */}
            <div className={zfForm.section}>
              <h4 className={zfForm.sectionTitle}>{isAr ? 'ملخص التعاقد النهائي' : 'Contract Summary'}</h4>
              <ZFFacts
                items={[
                  {
                    label: isAr ? 'الوحدة / المشروع' : 'Unit / Project',
                    value: selectedBuildingUnit 
                      ? `${selectedProperty?.title_ar || selectedProperty?.title_en} - ${selectedBuildingUnit.unit_number}`
                      : selectedProperty 
                        ? (selectedProperty.title_ar || selectedProperty.title_en)
                        : (customUnitName || '—')
                  },
                  { label: isAr ? 'المشتري' : 'Buyer', value: buyerName || '—' },
                  { label: isAr ? 'القيمة التعاقدية' : 'Gross Value', value: `${Number(totalNominalValue).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}` },
                  { label: isAr ? 'دفعة الحجز والمقدم' : 'Down Payment', value: `${Number(modalDpAmount).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`, tone: 'pos' },
                  { label: isAr ? 'تاريخ التوقيع' : 'Contract Date', value: firstPaymentDate }
                ]}
              />
            </div>

            <ZFEffect>
              {isAr 
                ? 'لا يتم تسجيل أي قيد دفتري حتى يتم تحصيل الدفعة المقدمة فعلياً وإثباتها.'
                : 'No ledger entry is posted until the down payment is actually received and recorded.'}
            </ZFEffect>
          </>
        )}
      </form>
    </ZFModalShell>
  );
};
