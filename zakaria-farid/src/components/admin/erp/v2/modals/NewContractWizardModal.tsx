'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Trash2,
  Wallet,
  Smartphone,
  Scale,
  Check,
  ChevronDown,
  Banknote,
  CalendarClock,
  FileSignature
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
import { cleanUnitNumber } from '@/lib/erp/projectStatusHelper';
import shellStyles from '../ZFWorkstationShell.module.css';
import w from './NewContractWizardModal.module.css';

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
  isLoadingContracts?: boolean;
  contractsError?: string | null;
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
  isLoadingContracts = false,
  contractsError,
  leads = [],
  unifiedPartners,
  isMutating = false,
  isAr = true,
  onContractCreated
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [contractErrors, setContractErrors] = useState<Record<string, string>>({});
  const isContractsPending = isLoadingContracts === true;
  const hasContractsError = Boolean(contractsError);
  const isContractsBlocked = isContractsPending || hasContractsError;

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
      const availableUnits = isContractsBlocked ? [] : getAvailableUnitsForProperty(prop, contracts);
      let targetUnitId = unitId || '';

      if (isContractsBlocked) {
        targetUnitId = '';
      } else {
        if (targetUnitId && !availableUnits.some(u => u.unit_id === targetUnitId)) {
          targetUnitId = '';
        }

        if (!targetUnitId && !canSellWhole && availableUnits.length > 0) {
          targetUnitId = availableUnits[0].unit_id;
        }
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
  }, [properties, contracts, isContractsBlocked]);

  const handlePropertyChange = (id: string) => {
    if (isContractsBlocked) return;
    applyPropertySelection(id, '');
  };

  const handleBuildingUnitChange = (unitId: string) => {
    if (isContractsBlocked) return;
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
    if (isContractsBlocked) return [];
    if (!selectedProperty || selectedProperty.type !== 'building' || !selectedProperty.building_units) return [];
    return getAvailableUnitsForProperty(selectedProperty, contracts);
  }, [selectedProperty, contracts, isContractsBlocked]);

  useEffect(() => {
    if (isContractsBlocked) {
      if (selectedBuildingUnitId) setSelectedBuildingUnitId('');
      return;
    }
    if (!selectedProperty || selectedProperty.type !== 'building') return;
    if (selectedBuildingUnitId && !availableBuildingUnits.some(u => u.unit_id === selectedBuildingUnitId)) {
      const nextUnitId = availableBuildingUnits[0]?.unit_id || '';
      setSelectedBuildingUnitId(nextUnitId);
      if (nextUnitId) {
        const u = selectedProperty.building_units?.find(unit => unit.unit_id === nextUnitId);
        if (u) setBasePriceInput((u.price_egp || 0).toString());
      }
    } else if (!selectedBuildingUnitId && !canSellWhole && availableBuildingUnits.length > 0) {
      const nextUnitId = availableBuildingUnits[0]?.unit_id || '';
      setSelectedBuildingUnitId(nextUnitId);
      if (nextUnitId) {
        const u = selectedProperty.building_units?.find(unit => unit.unit_id === nextUnitId);
        if (u) setBasePriceInput((u.price_egp || 0).toString());
      }
    }
  }, [selectedProperty, availableBuildingUnits, selectedBuildingUnitId, canSellWhole, isContractsBlocked]);

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

    if (modalDpAmount > totalNominalValue) return [];
    const generated = ContractsEngine.generateSchedule(
      'preview',
      D(totalNominalValue),
      { amount: String(modalDpAmount || 0) },
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
    if (isContractsBlocked) {
      errs.property = contractsError
        ? (isAr ? `تعذر تحميل بيانات العقود: ${contractsError}` : `Failed to load contracts: ${contractsError}`)
        : (isAr ? 'جاري التحقق من العقود والوحدات المتاحة...' : 'Loading contracts data, please wait...');
      setContractErrors(errs);
      return false;
    }
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
    if (isContractsBlocked) {
      setContractErrors({
        property: contractsError
          ? (isAr ? `تعذر تحميل بيانات العقود: ${contractsError}` : `Failed to load contracts: ${contractsError}`)
          : (isAr ? 'جاري التحقق من العقود والوحدات المتاحة...' : 'Loading contracts data, please wait...')
      });
      setStep(1);
      return;
    }
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
    if (isContractsBlocked) return [];
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
  }, [properties, contracts, isAr, isContractsBlocked]);

  if (!isOpen) return null;

  const unit = isAr ? 'ج.م' : 'EGP';
  const fmt = (v: number | string) =>
    Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const remainingAfterDp = Math.max(0, totalNominalValue - modalDpAmount);
  const dpPctOfPrice = totalNominalValue > 0 ? (modalDpAmount / totalNominalValue) * 100 : 0;
  const splitsBalanced = Math.abs(totalSplitsPct - 100) <= 0.01;
  const partnerColors = ['var(--erp-accent, #2563eb)', '#0ea5e9', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899'];
  const availablePartnerNames = unifiedPartners
    .map(p => p.name)
    .filter(name => !partnerSplits.some(ps => ps.partnerName === name));

  const addPartner = () => {
    const name = customPartnerNameInput.trim();
    if (!name || partnerSplits.some(ps => ps.partnerName === name)) return;
    setPartnerSplits(smartAddPartner(partnerSplits, name, 10));
    setCustomPartnerNameInput('');
  };

  const goToStep = (s: 1 | 2 | 3) => {
    if (isContractsBlocked) {
      setContractErrors({
        property: contractsError
          ? (isAr ? `تعذر تحميل بيانات العقود: ${contractsError}` : `Failed to load contracts: ${contractsError}`)
          : (isAr ? 'جاري التحقق من العقود والوحدات المتاحة...' : 'Loading contracts data, please wait...')
      });
      return;
    }
    if (s > 1 && step === 1 && !validateStep1()) return;
    if (s === 3 && step <= 2) {
      if (!validateStep1()) { setStep(1); return; }
      if (!validateStep2()) { setStep(2); return; }
    }
    setStep(s);
  };

  const steps: Array<{ id: 1 | 2 | 3; label: string; sub: string }> = [
    { id: 1, label: isAr ? 'الوحدة والمشتري' : 'Unit & buyer', sub: isAr ? 'ماذا يُباع ولمن' : 'What is sold, to whom' },
    { id: 2, label: isAr ? 'السعر والسداد' : 'Price & payment', sub: isAr ? 'المقدم والأقساط' : 'Down payment, installments' },
    { id: 3, label: isAr ? 'الشركاء والاعتماد' : 'Partners & confirm', sub: isAr ? 'الحصص والخزينة' : 'Shares, treasury' }
  ];

  // Errors already shown under their own field are not repeated in the banner.
  const bannerErrors = [
    contractErrors.splits,
    contractsError ? (isAr ? `تعذر تحميل بيانات العقود: ${contractsError}` : `Failed to load contracts data: ${contractsError}`) : null
  ].filter(Boolean);

  const footer = (
    <ZFFormFooter aside={isAr ? `الخطوة ${step} من 3` : `Step ${step} of 3`}>
      <button type="button" className={shellStyles.btnGhost} onClick={handleModalClose}>
        {isAr ? 'إلغاء' : 'Cancel'}
      </button>
      {step > 1 && (
        <button
          type="button"
          className={shellStyles.btnSecondary}
          onClick={() => setStep((step - 1) as 1 | 2)}
        >
          {isAr ? 'السابق' : 'Back'}
        </button>
      )}
      {/* Distinct keys: React must not reuse the Next button as the submit button, or the same click submits. */}
      {step < 3 ? (
        <button key="next" type="button" className={shellStyles.btnPrimary} disabled={isContractsBlocked} onClick={() => goToStep((step + 1) as 2 | 3)}>
          {isAr ? 'التالي' : 'Next'}
        </button>
      ) : (
        <button
          key="submit"
          type="submit"
          form="zf-new-contract-form"
          className={shellStyles.btnPrimary}
          disabled={isMutating || !splitsBalanced || isContractsBlocked}
        >
          {isMutating ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'اعتماد العقد' : 'Create contract')}
        </button>
      )}
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={handleModalClose}
      isAr={isAr}
      title={isAr ? 'عقد بيع جديد' : 'New sales contract'}
      subtitle={isAr
        ? 'اختر الوحدة والمشتري، ثم السعر وطريقة السداد، ثم حصص الشركاء.'
        : 'Pick the unit and buyer, then price and payment, then partner shares.'}
      icon={<FileSignature size={18} />}
      maxWidth="780px"
      maxHeight="92vh"
      footer={footer}
    >
      <form id="zf-new-contract-form" className={zfForm.form} onSubmit={handleFinalSubmit}>
        <ol className={w.stepper} aria-label={isAr ? 'خطوات العقد' : 'Contract steps'}>
          {steps.map((s, i) => (
            <li
              key={s.id}
              className={`${w.step}${s.id === step ? ` ${w.stepActive}` : ''}${s.id < step ? ` ${w.stepDone}` : ''}`}
            >
              <button
                type="button"
                className={w.stepBtn}
                onClick={() => goToStep(s.id)}
                aria-current={s.id === step ? 'step' : undefined}
              >
                <span className={w.stepDot}>{s.id < step ? <Check size={14} strokeWidth={3} /> : s.id}</span>
                <span className={w.stepTexts}>
                  <span className={w.stepLabel}>{s.label}</span>
                  <span className={w.stepSub}>{s.sub}</span>
                </span>
              </button>
              {i < steps.length - 1 && <span className={w.stepLine} aria-hidden="true" />}
            </li>
          ))}
        </ol>

        {bannerErrors.length > 0 && <ZFEffect tone="danger">{bannerErrors.join(' • ')}</ZFEffect>}

        {/* STEP 1: PROPERTY & BUYER */}
        {step === 1 && (
          <>
            <div className={zfForm.section}>
              <h4 className={zfForm.sectionTitle}>{isAr ? 'الوحدة' : 'Unit'}</h4>

              <ZFField label={isAr ? 'العقار أو المشروع' : 'Property or project'} required error={contractErrors.property}>
                <ZFCustomSelect
                  value={selectedPropertyId}
                  onChange={(val: string) => handlePropertyChange(val)}
                  sections={propertySections}
                  placeholderAr="اختر من العقارات المتاحة"
                  placeholderEn="Choose an available property"
                  isAr={isAr}
                  disabled={isContractsBlocked}
                  hasError={!!contractErrors.property}
                  customAction={{
                    labelAr: '+ وحدة غير موجودة في الكتالوج',
                    labelEn: '+ Unit not in the catalog',
                    onClick: () => handlePropertyChange('custom_unit')
                  }}
                />
              </ZFField>

              {selectedPropertyId === 'custom_unit' && (
                <ZFField label={isAr ? 'اسم الوحدة' : 'Unit name'} required>
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
                <ZFField
                  label={isAr ? 'الشقة' : 'Apartment'}
                  required={!canSellWhole}
                  hint={isContractsPending
                    ? (isAr ? 'جاري التحقق من العقود والوحدات المتاحة...' : 'Checking contracts and available units...')
                    : hasContractsError
                    ? (isAr ? `تعذر تحميل بيانات العقود: ${contractsError}` : `Failed to load contracts: ${contractsError}`)
                    : (isAr
                      ? `${availableBuildingUnits.length} شقة متاحة في هذه العمارة`
                      : `${availableBuildingUnits.length} apartments available in this building`)}
                >
                  <select
                    className={zfForm.control}
                    value={selectedBuildingUnitId}
                    onChange={e => handleBuildingUnitChange(e.target.value)}
                    disabled={isContractsBlocked}
                  >
                    {canSellWhole && (
                      <option value="">{isAr ? 'العمارة بالكامل' : 'Whole building'}</option>
                    )}
                    {availableBuildingUnits.map(u => {
                      const displayUnitNumber = cleanUnitNumber(u.unit_number) || u.unit_number;
                      return (
                        <option key={u.unit_id} value={u.unit_id}>
                          {isAr
                            ? `شقة ${displayUnitNumber} • الدور ${u.floor} • ${fmt(u.price_egp || 0)} ج.م`
                            : `Apt ${displayUnitNumber} • Floor ${u.floor} • ${fmt(u.price_egp || 0)} EGP`}
                        </option>
                      );
                    })}
                  </select>
                </ZFField>
              )}

              {selectedProperty && (
                <ZFFacts
                  items={[
                    { label: isAr ? 'الموقع' : 'Location', value: selectedProperty.location || '—' },
                    { label: isAr ? 'المساحة' : 'Area', value: `${selectedBuildingUnit?.area_sqm || selectedProperty.area_sqm || 0} m²` },
                    { label: isAr ? 'سعر الكتالوج' : 'Catalog price', value: `${fmt(selectedBuildingUnit?.price_egp || selectedProperty.price_egp || 0)} ${unit}` },
                    { label: isAr ? 'الحالة' : 'Status', value: selectedProperty.completion_status === 'ready' ? (isAr ? 'جاهز للتسليم' : 'Ready') : (isAr ? 'تحت الإنشاء' : 'Off-plan') }
                  ]}
                />
              )}
            </div>

            <div className={zfForm.section}>
              <div className={w.sectionHead}>
                <h4 className={zfForm.sectionTitle}>{isAr ? 'المشتري' : 'Buyer'}</h4>
                {leads.length > 0 && (
                  <div className={w.segment} role="radiogroup" aria-label={isAr ? 'مصدر المشتري' : 'Buyer source'}>
                    {([
                      ['NEW_LEAD', isAr ? 'عميل جديد' : 'New client'],
                      ['EXISTING_LEAD', isAr ? 'من العملاء' : 'From leads']
                    ] as const).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={leadSelectionMode === id}
                        className={`${w.segmentBtn}${leadSelectionMode === id ? ` ${w.segmentBtnActive}` : ''}`}
                        onClick={() => setLeadSelectionMode(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {leadSelectionMode === 'EXISTING_LEAD' && leads.length > 0 && (
                <ZFField label={isAr ? 'العميل' : 'Client'}>
                  <select
                    className={zfForm.control}
                    value={selectedLeadId}
                    onChange={e => handleLeadChange(e.target.value)}
                  >
                    <option value="">{isAr ? 'اختر العميل' : 'Choose a client'}</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>
                        {`${l.name} • ${l.phone || l.email || ''}`}
                      </option>
                    ))}
                  </select>
                </ZFField>
              )}

              <div className={zfForm.row}>
                <ZFField label={isAr ? 'الاسم بالكامل' : 'Full name'} required error={contractErrors.buyerName}>
                  <input
                    type="text"
                    className={`${zfForm.control}${contractErrors.buyerName ? ` ${zfForm.controlInvalid}` : ''}`}
                    value={buyerName}
                    onChange={e => {
                      setBuyerName(e.target.value);
                      if (contractErrors.buyerName) setContractErrors(prev => ({ ...prev, buyerName: '' }));
                    }}
                    required
                  />
                </ZFField>
                <ZFField label={isAr ? 'الرقم القومي أو جواز السفر' : 'National ID or passport'} required error={contractErrors.buyerNationalId}>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={`${zfForm.control} ${zfForm.mono}${contractErrors.buyerNationalId ? ` ${zfForm.controlInvalid}` : ''}`}
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
                    placeholder="01XXXXXXXXX"
                    value={buyerPhone}
                    onChange={e => setBuyerPhone(e.target.value)}
                  />
                </ZFField>
                <ZFField label={isAr ? 'البريد الإلكتروني' : 'Email'} hint={isAr ? 'اختياري' : 'Optional'}>
                  <input
                    type="email"
                    dir="ltr"
                    className={zfForm.control}
                    value={buyerEmail}
                    onChange={e => setBuyerEmail(e.target.value)}
                  />
                </ZFField>
              </div>
            </div>
          </>
        )}

        {/* STEP 2: PRICE & PAYMENT */}
        {step === 2 && (
          <>
            <div className={zfForm.section}>
              <ZFChoices<'INSTALLMENTS' | 'FULL_CASH'>
                value={paymentPlanType}
                onChange={setPaymentPlanType}
                ariaLabel={isAr ? 'طريقة السداد' : 'Payment plan'}
                options={[
                  {
                    id: 'INSTALLMENTS',
                    label: isAr ? 'مقدم وأقساط' : 'Down payment + installments',
                    sub: isAr ? 'جدول سداد على فترات' : 'Paid over a schedule',
                    icon: <CalendarClock size={16} />
                  },
                  {
                    id: 'FULL_CASH',
                    label: isAr ? 'كاش بالكامل' : 'Full cash',
                    sub: isAr ? 'المبلغ كله عند التعاقد' : 'Whole amount at signing',
                    icon: <Banknote size={16} />
                  }
                ]}
              />

              <div className={zfForm.row}>
                <ZFField label={isAr ? 'سعر البيع' : 'Sale price'} required error={contractErrors.price}>
                  <ZFMoneyInput
                    value={basePriceInput}
                    onChange={e => {
                      setBasePriceInput(e.target.value);
                      if (contractErrors.price) setContractErrors(prev => ({ ...prev, price: '' }));
                    }}
                    unit={unit}
                    invalid={!!contractErrors.price}
                    required
                  />
                </ZFField>
                <ZFField label={isAr ? 'تاريخ التعاقد' : 'Contract date'} required>
                  <input
                    type="date"
                    className={zfForm.control}
                    value={firstPaymentDate}
                    onChange={e => setFirstPaymentDate(e.target.value)}
                    required
                  />
                </ZFField>
              </div>
            </div>

            {paymentPlanType === 'INSTALLMENTS' && (
              <div className={zfForm.section}>
                <h4 className={zfForm.sectionTitle}>{isAr ? 'المقدم والأقساط' : 'Down payment and installments'}</h4>

                <ZFField
                  label={isAr ? 'المقدم' : 'Down payment'}
                  required
                  error={contractErrors.downPayment}
                  aside={
                    <span className={w.chips}>
                      {['10', '15', '20', '25', '30'].map(p => {
                        const active = downPaymentAmountInput === '' && downPaymentInputPct === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            className={`${w.chip}${active ? ` ${w.chipActive}` : ''}`}
                            onClick={() => {
                              setDownPaymentInputPct(p);
                              setDownPaymentAmountInput('');
                              if (contractErrors.downPayment) setContractErrors(prev => ({ ...prev, downPayment: '' }));
                            }}
                          >
                            {p}%
                          </button>
                        );
                      })}
                    </span>
                  }
                >
                  <ZFMoneyInput
                    value={downPaymentAmountInput !== '' ? downPaymentAmountInput : modalDpAmount.toString()}
                    onChange={e => {
                      setDownPaymentAmountInput(e.target.value);
                      if (contractErrors.downPayment) setContractErrors(prev => ({ ...prev, downPayment: '' }));
                    }}
                    unit={unit}
                    invalid={!!contractErrors.downPayment}
                    required
                  />
                </ZFField>

                <div className={zfForm.row3}>
                  <ZFField label={isAr ? 'عدد الأقساط' : 'Installments'} required>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      className={`${zfForm.control} ${zfForm.mono}`}
                      value={numInstallments}
                      onChange={e => setNumInstallments(e.target.value)}
                      required
                    />
                  </ZFField>
                  <ZFField label={isAr ? 'كل' : 'Every'}>
                    <select
                      className={zfForm.control}
                      value={installmentFrequency}
                      onChange={e => setInstallmentFrequency(e.target.value as 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL')}
                    >
                      <option value="MONTHLY">{isAr ? 'شهر' : 'Month'}</option>
                      <option value="QUARTERLY">{isAr ? '٣ شهور' : '3 months'}</option>
                      <option value="SEMI_ANNUAL">{isAr ? '٦ شهور' : '6 months'}</option>
                    </select>
                  </ZFField>
                  <ZFField label={isAr ? 'أول قسط' : 'First installment'} required>
                    <input
                      type="date"
                      className={zfForm.control}
                      value={firstInstallmentDueDate}
                      onChange={e => setFirstInstallmentDueDate(e.target.value)}
                      required
                    />
                  </ZFField>
                </div>
              </div>
            )}

            <div className={w.totals}>
              <div className={w.total}>
                <span className={w.totalLabel}>{isAr ? 'سعر البيع' : 'Sale price'}</span>
                <span className={w.totalValue}>{fmt(totalNominalValue)}<span className={w.totalUnit}>{unit}</span></span>
              </div>
              <div className={w.total}>
                <span className={w.totalLabel}>
                  {paymentPlanType === 'FULL_CASH'
                    ? (isAr ? 'يُدفع عند التعاقد' : 'Paid at signing')
                    : (isAr ? `المقدم (${dpPctOfPrice.toFixed(1)}%)` : `Down payment (${dpPctOfPrice.toFixed(1)}%)`)}
                </span>
                <span className={w.totalValue}>{fmt(modalDpAmount)}<span className={w.totalUnit}>{unit}</span></span>
              </div>
              <div className={w.total}>
                <span className={w.totalLabel}>{isAr ? 'الباقي على أقساط' : 'Left for installments'}</span>
                <span className={w.totalValue}>{fmt(remainingAfterDp)}<span className={w.totalUnit}>{unit}</span></span>
              </div>
              <div className={`${w.total} ${w.totalAccent}`}>
                <span className={w.totalLabel}>
                  {previewSchedule.length > 0
                    ? (isAr ? `القسط × ${previewSchedule.length}` : `Installment × ${previewSchedule.length}`)
                    : (isAr ? 'القسط' : 'Installment')}
                </span>
                <span className={w.totalValue}>
                  {previewSchedule.length > 0 ? fmt(previewSchedule[0].amount) : '—'}
                  {previewSchedule.length > 0 && <span className={w.totalUnit}>{unit}</span>}
                </span>
              </div>
            </div>

            {paymentPlanType === 'INSTALLMENTS' && previewSchedule.length > 0 && (
              <details className={w.schedule}>
                <summary>
                  <span>
                    {isAr
                      ? `جدول السداد: مقدم + ${previewSchedule.length} قسط`
                      : `Schedule: down payment + ${previewSchedule.length} installments`}
                  </span>
                  <ChevronDown size={15} className={w.scheduleChevron} aria-hidden="true" />
                </summary>
                <div className={w.scheduleBody}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{isAr ? 'الاستحقاق' : 'Due'}</th>
                        <th>{isAr ? 'البيان' : 'Item'}</th>
                        <th className={w.num}>{isAr ? 'المبلغ' : 'Amount'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className={w.rowFirst}>
                        <td>0</td>
                        <td className={w.date}>{firstPaymentDate}</td>
                        <td>{isAr ? 'المقدم' : 'Down payment'}</td>
                        <td className={w.num}>{fmt(modalDpAmount)} {unit}</td>
                      </tr>
                      {previewSchedule.map(t => (
                        <tr key={t.index}>
                          <td>{t.index}</td>
                          <td className={w.date}>{t.dueDate}</td>
                          <td>{isAr ? `قسط ${t.index}` : `Installment ${t.index}`}</td>
                          <td className={w.num}>{fmt(t.amount)} {unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </>
        )}

        {/* STEP 3: PARTNER SPLITS & CONFIRM */}
        {step === 3 && (
          <>
            <div className={zfForm.section}>
              <div className={w.sectionHead}>
                <h4 className={zfForm.sectionTitle}>{isAr ? 'حصص الشركاء في هذا البيع' : 'Partner shares in this sale'}</h4>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`${w.badge} ${splitsBalanced ? w.badgeOk : w.badgeBad}`}>
                    {isAr ? `المجموع ${totalSplitsPct.toFixed(1)}%` : `Total ${totalSplitsPct.toFixed(1)}%`}
                  </span>
                  {!splitsBalanced && (
                    <button
                      type="button"
                      className={`${shellStyles.btnGhost} ${shellStyles.btnSm}`}
                      onClick={() => setPartnerSplits(autoBalanceShares(partnerSplits))}
                    >
                      <Scale size={13} />
                      {isAr ? 'وزّع لـ 100%' : 'Balance to 100%'}
                    </button>
                  )}
                </span>
              </div>

              <div className={w.shareBar} aria-hidden="true">
                {partnerSplits.map((p, idx) => (
                  <span
                    key={p.partnerName}
                    style={{ width: `${Math.max(0, p.sharePct)}%`, background: partnerColors[idx % partnerColors.length] }}
                  />
                ))}
              </div>

              <div className={w.partners}>
                {partnerSplits.map((item, idx) => (
                  <div key={item.partnerName} className={w.partner}>
                    <span className={w.partnerName}>
                      <span className={w.partnerDot} style={{ background: partnerColors[idx % partnerColors.length] }} />
                      <span>{item.partnerName}</span>
                      {item.partnerName === PRIMARY_DEVELOPER_NAME && (
                        <span className={w.partnerTag}>{isAr ? 'المطور' : 'Developer'}</span>
                      )}
                    </span>
                    <span className={w.pctWrap}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        aria-label={isAr ? `حصة ${item.partnerName}` : `${item.partnerName} share`}
                        className={`${zfForm.control} ${zfForm.mono}`}
                        value={item.sharePct}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setPartnerSplits(partnerSplits.map((p, i) => i === idx ? { ...p, sharePct: val } : p));
                          if (contractErrors.splits) setContractErrors(prev => ({ ...prev, splits: '' }));
                        }}
                      />
                      <span className={w.pctUnit}>%</span>
                    </span>
                    <span className={w.partnerAmount}>
                      {fmt(D(totalNominalValue).timesRatio(item.sharePct || 0, 100).toFixed(2))} {unit}
                    </span>
                    {idx > 0 ? (
                      <button
                        type="button"
                        className={w.iconBtn}
                        aria-label={isAr ? `حذف ${item.partnerName}` : `Remove ${item.partnerName}`}
                        onClick={() => setPartnerSplits(smartRemovePartner(partnerSplits, idx))}
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : <span />}
                  </div>
                ))}
              </div>

              <ZFField
                label={isAr ? 'إضافة شريك' : 'Add a partner'}
                hint={isAr ? 'اختر من الشركاء المسجلين أو اكتب اسماً جديداً.' : 'Pick a registered partner or type a new name.'}
              >
                <div className={w.addRow}>
                  <input
                    type="text"
                    list="zf-contract-partner-names"
                    className={zfForm.control}
                    placeholder={isAr ? 'اسم الشريك' : 'Partner name'}
                    value={customPartnerNameInput}
                    onChange={e => setCustomPartnerNameInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addPartner(); }
                    }}
                  />
                  <datalist id="zf-contract-partner-names">
                    {availablePartnerNames.map(name => <option key={name} value={name} />)}
                  </datalist>
                  <button
                    type="button"
                    className={shellStyles.btnSecondary}
                    onClick={addPartner}
                    disabled={!customPartnerNameInput.trim()}
                  >
                    <Plus size={14} />
                    {isAr ? 'إضافة' : 'Add'}
                  </button>
                </div>
              </ZFField>
            </div>

            {paymentPlanType === 'FULL_CASH' || modalDpAmount > 0 ? (
              <div className={zfForm.section}>
                <h4 className={zfForm.sectionTitle}>
                  {paymentPlanType === 'FULL_CASH'
                    ? (isAr ? 'يُستلم المبلغ في' : 'Payment goes to')
                    : (isAr ? 'يُستلم المقدم في' : 'Down payment goes to')}
                </h4>
                <ZFChoices<'101000' | '102000'>
                  value={destinationTreasury}
                  onChange={setDestinationTreasury}
                  options={[
                    { id: '101000', label: isAr ? 'الخزينة (نقدي)' : 'Safe (cash)', sub: '101000', icon: <Wallet size={16} /> },
                    { id: '102000', label: isAr ? 'إنستاباي' : 'InstaPay', sub: '102000', icon: <Smartphone size={16} /> }
                  ]}
                />
              </div>
            ) : null}

            <div className={zfForm.section}>
              <h4 className={zfForm.sectionTitle}>{isAr ? 'مراجعة قبل الاعتماد' : 'Review'}</h4>
              <ZFFacts
                items={[
                  {
                    label: isAr ? 'الوحدة' : 'Unit',
                    value: selectedBuildingUnit
                      ? `${selectedProperty?.title_ar || selectedProperty?.title_en} - ${isAr ? 'شقة ' : 'Apt '}${cleanUnitNumber(selectedBuildingUnit.unit_number) || selectedBuildingUnit.unit_number}`
                      : selectedProperty
                        ? (selectedProperty.title_ar || selectedProperty.title_en)
                        : (customUnitName || '—')
                  },
                  { label: isAr ? 'المشتري' : 'Buyer', value: buyerName || '—' },
                  { label: isAr ? 'سعر البيع' : 'Sale price', value: `${fmt(totalNominalValue)} ${unit}` },
                  {
                    label: paymentPlanType === 'FULL_CASH' ? (isAr ? 'كاش بالكامل' : 'Full cash') : (isAr ? 'المقدم' : 'Down payment'),
                    value: `${fmt(modalDpAmount)} ${unit}`,
                    tone: 'pos'
                  },
                  { label: isAr ? 'تاريخ التعاقد' : 'Contract date', value: firstPaymentDate }
                ]}
              />
              <ZFEffect>
                {isAr
                  ? 'يُحفظ العقد وجدول الأقساط الآن. لا يُسجل أي قيد في الدفاتر حتى يُحصَّل المقدم فعلياً.'
                  : 'The contract and its schedule are saved now. Nothing is posted to the ledger until the down payment is actually collected.'}
              </ZFEffect>
            </div>
          </>
        )}
      </form>
    </ZFModalShell>
  );
};
