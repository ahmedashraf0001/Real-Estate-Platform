/**
 * Zakaria Farid Real Estate ERP — Construction & Selling Price Valuation Engine
 * Dual-Mode Enterprise Workstation:
 * 1. ACTUAL BUILT PROPERTY PRICING:
 *    Calculates verified selling price from audited incurred ledger costs, market benchmark, and target profit margin.
 * 2. PRE-CONSTRUCTION FEASIBILITY:
 *    Structural quantities (steel, concrete), MEP, finishing tiers, and financial ROI models.
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  Hammer, 
  HardHat,
  FileSpreadsheet, 
  CheckCircle2,
  TrendingUp,
  Layers,
  ShieldCheck,
  Building2,
  Building,
  FileText,
  Coins,
  SlidersHorizontal,
  PieChart,
  Search,
  MapPin,
  Info,
  DoorOpen,
  Plus,
  Printer,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { exportFeasibilityExcel } from '@/lib/erp/excelExporter';
import { ZFPrintDocumentLayout } from './v2/common/ZFPrintDocumentLayout';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPPropertyCostItem } from '@/lib/erp/types';
import { D, Decimal } from '@/lib/erp/math';
import { ZFCustomSelect, ZFCustomSelectItem } from './v2/common/ZFCustomSelect';
import { 
  calculatePropertyAuditMetrics,
  calculateBuiltPropertySellingPrice,
  PROPERTY_COST_CATEGORIES
} from '@/lib/erp/propertyCostEngine';
import { ZFErpBreadcrumb } from './v2/common/ZFErpBreadcrumb';
import { ZFKpiCard, ZFKpiGrid } from './v2/ZFKpiCard';
import { ERPApexChart } from './v2/charts/ERPApexChart';
import { CalculatorSideWidgets } from './v2/views/CalculatorSideWidgets';
import shellStyles from './v2/ZFWorkstationShell.module.css';
import styles from './ConstructionCostCalculator.module.css';

export interface ConstructionCostCalculatorProps {
  properties: Property[];
  propertyCosts?: ERPPropertyCostItem[];
  onApplyBudgetToProperty?: (propertyId: string, budgetAmount: string) => void;
  onUpdateSellingPrice?: (propertyId: string, newPriceEgp: number) => Promise<void>;
  onOpenAuditForProperty?: (property: Property) => void;
  onOpenContractForProperty?: (property: Property, unit?: BuildingUnitItem) => void;
  onNavigateToTab?: (tab: string) => void;
  initialPropertyId?: string;
  isAr: boolean;
}

export type CalculatorMode = 'BUILT_PROPERTY_PRICING' | 'FEASIBILITY_ESTIMATOR';

export type PropertyConstructionType = 
  | 'apartment_standard' 
  | 'apartment_duplex' 
  | 'apartment_roof' 
  | 'building' 
  | 'garage';

export type FinishingTier = 'core_and_shell' | 'semi_finished' | 'lux' | 'super_lux' | 'custom';

export const FINISHING_TIER_COSTS: Record<FinishingTier, { costPerSqm: number; labelAr: string; labelEn: string; descAr: string }> = {
  core_and_shell: {
    costPerSqm: 2800,
    labelAr: 'طوب أحمر وعظم (Core & Shell)',
    labelEn: 'Core & Shell / Red Brick',
    descAr: 'خرسانة مسلحة ومباني طوب أحمر وحلوق خشب من غير أي تشطيب داخلي'
  },
  semi_finished: {
    costPerSqm: 4500,
    labelAr: 'نصف تشطيب (Semi-Finished)',
    labelEn: 'Semi-Finished (Standard)',
    descAr: 'محارة كاملة وحلوق خشب وتأسيس كهرباء وعلب ومواسير السباكة'
  },
  lux: {
    costPerSqm: 7500,
    labelAr: 'تشطيب لوكس جاهز على السكن',
    labelEn: 'Lux Finished',
    descAr: 'سيراميك فرز أول ودهانات جوتن وأطقم حمامات ومطابخ وشبابيك ألوميتال'
  },
  super_lux: {
    costPerSqm: 10500,
    labelAr: 'تشطيب سوبر لوكس عالي',
    labelEn: 'Super Lux Finished',
    descAr: 'بورسلين وجبسوم بورد وإضاءة ليد مخفية ودهانات كمبيوتر وشبابيك جامبو'
  },
  custom: {
    costPerSqm: 6500,
    labelAr: 'تشطيب مخصص يدوي (Custom)',
    labelEn: 'Custom Finishing (Manual)',
    descAr: 'تحديد تكلفة المتر يدوياً حسب بنود ومواصفات التشطيب المتفق عليها'
  }
};

export const ConstructionCostCalculator: React.FC<ConstructionCostCalculatorProps> = ({
  properties,
  propertyCosts = [],
  onUpdateSellingPrice,
  onOpenAuditForProperty,
  onOpenContractForProperty,
  onNavigateToTab,
  initialPropertyId,
  isAr
}) => {
  // Format monetary value with strict tabular numbers and LTR numeral isolation
  const renderMoney = (
    val: number | string | Decimal | bigint,
    unitSuffix?: string,
    options?: {
      color?: string;
      size?: string;
      weight?: number | string;
    }
  ) => {
    const d = D(val || 0);
    const isNegative = d.isNegative();
    const absD = d.abs();
    const parts = absD.toFixed(2).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formattedNum = `${isNegative ? '-' : ''}${intPart}.${parts[1]}`;
    const currencySymbol = isAr ? 'ج.م' : 'EGP';
    const suffix = unitSuffix ? `${currencySymbol}/${unitSuffix}` : currencySymbol;

    return (
      <span
        dir="ltr"
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          whiteSpace: 'nowrap',
          gap: '0.28rem',
          fontVariantNumeric: 'tabular-nums',
          unicodeBidi: 'isolate',
          color: options?.color,
          fontSize: options?.size,
          fontWeight: options?.weight || 'inherit'
        }}
      >
        <span style={{ fontWeight: 'inherit', letterSpacing: '-0.01em' }}>{formattedNum}</span>
        <span
          style={{
            fontSize: '0.72em',
            fontWeight: 700,
            opacity: 0.85,
            letterSpacing: 'normal'
          }}
        >
          {suffix}
        </span>
      </span>
    );
  };

  const formatCompactMoney = (val: number | string | Decimal | bigint, isArLocale: boolean = isAr) => {
    const d = D(val || 0);
    const num = d.toNumber();
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 1_000_000) {
      const m = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '');
      return isArLocale ? `${sign}${m} مليون ج.م` : `${sign}${m}M EGP`;
    }
    if (abs >= 10_000) {
      const k = (abs / 1_000).toFixed(0);
      return isArLocale ? `${sign}${k} ألف ج.م` : `${sign}${k}K EGP`;
    }
    return isArLocale ? `${sign}${Math.round(abs).toLocaleString('en-US')} ج.م` : `${sign}${Math.round(abs).toLocaleString('en-US')} EGP`;
  };

  const formatUnitName = (name?: string) => {
    const raw = (name || '').trim();
    if (!raw) return isAr ? 'شقة' : 'Unit';
    if (isAr) {
      return raw.startsWith('شقة') ? raw : `شقة ${raw}`;
    }
    return raw.toLowerCase().startsWith('unit') ? raw : `Unit ${raw}`;
  };

  // Main Mode Toggle: Default to 'BUILT_PROPERTY_PRICING'
  const [calculatorMode, setCalculatorMode] = useState<CalculatorMode>('BUILT_PROPERTY_PRICING');

  // Selected Property for Pricing & Feasibility
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropertyId || (properties[0]?.id || ''));

  useEffect(() => {
    if (initialPropertyId) {
      setSelectedPropertyId(initialPropertyId);
      setCalculatorMode('BUILT_PROPERTY_PRICING');
    }
  }, [initialPropertyId]);

  const selectedProperty = useMemo(() => {
    return properties.find(p => p.id === selectedPropertyId) || properties[0] || null;
  }, [properties, selectedPropertyId]);

  // =========================================================================
  // MODE 1: ACTUAL BUILT PROPERTY PRICING STATE & LOGIC
  // =========================================================================
  const [marketMeterPrice, setMarketMeterPrice] = useState<number>(38000);
  const [profitMode, setProfitMode] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [targetProfitPercent, setTargetProfitPercent] = useState<number>(35);
  const [targetProfitCashAmount, setTargetProfitCashAmount] = useState<string>('3000000');

  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [priceUpdateSuccess, setPriceUpdateSuccess] = useState(false);

  const [pricingScope, setPricingScope] = useState<'whole' | 'apartment'>('whole');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const isSelectedBuilding = useMemo(() => {
    if (!selectedProperty) return false;
    const title = (selectedProperty.title_ar || selectedProperty.title_en || '').toLowerCase();
    return selectedProperty.type === 'building' || title.includes('عمارة') || title.includes('building');
  }, [selectedProperty]);

  useEffect(() => {
    if (selectedProperty) {
      const area = selectedProperty.area_sqm || 200;
      const listPrice = selectedProperty.price_egp || 0;
      if (area > 0 && listPrice > 0) {
        setMarketMeterPrice(Math.round(listPrice / area));
      }
      if (selectedProperty.building_units && selectedProperty.building_units.length > 0) {
        setSelectedUnitId(selectedProperty.building_units[0].unit_id);
      } else {
        setSelectedUnitId(null);
        setPricingScope('whole');
      }
    }
  }, [selectedProperty]);

  const propertyAudit = useMemo(() => {
    if (!selectedProperty) {
      return { totalLoggedCost: '0.00', costPerSqm: '0.00', itemsCount: 0, byCategory: {}, byPhase: {}, propertyCosts: [] };
    }
    return calculatePropertyAuditMetrics(
      selectedProperty.id,
      selectedProperty.area_sqm || 200,
      propertyCosts
    );
  }, [selectedProperty, propertyCosts]);

  const builtPricing = useMemo(() => {
    const area = selectedProperty?.area_sqm || 200;
    return calculateBuiltPropertySellingPrice({
      totalLoggedCost: propertyAudit.totalLoggedCost,
      builtUpAreaSqm: area,
      currentMarketMeterPrice: marketMeterPrice,
      profitMode,
      profitPercentage: targetProfitPercent,
      profitFixedAmount: targetProfitCashAmount
    });
  }, [
    propertyAudit.totalLoggedCost,
    selectedProperty?.area_sqm,
    marketMeterPrice,
    profitMode,
    targetProfitPercent,
    targetProfitCashAmount
  ]);

  const buildingUnitsPricing = useMemo(() => {
    if (!selectedProperty || !isSelectedBuilding) return null;
    const units = selectedProperty.building_units || [];
    const totalUnits = units.length > 0 ? units.length : 6;
    const totalBuildingArea = selectedProperty.area_sqm || 1200;
    const totalLoggedCostNum = parseFloat(propertyAudit.totalLoggedCost) || 0;

    const propCosts = propertyCosts.filter(c => c.property_id === selectedProperty.id);
    const unitCostsMap = new Map<string, number>();
    let generalLoggedCost = 0;

    propCosts.forEach(c => {
      const amt = parseFloat(c.total_cost_egp || '0');
      if (c.building_unit_id) {
        unitCostsMap.set(c.building_unit_id, (unitCostsMap.get(c.building_unit_id) || 0) + amt);
      } else {
        generalLoggedCost += amt;
      }
    });

    if (generalLoggedCost === 0 && unitCostsMap.size === 0) {
      generalLoggedCost = totalLoggedCostNum;
    }

    const calculatedUnits = units.map((u) => {
      const uArea = u.area_sqm || Math.round(totalBuildingArea / totalUnits);
      const areaRatio = totalBuildingArea > 0 ? (uArea / totalBuildingArea) : (1 / totalUnits);
      const apportionedGeneralCost = Math.round(generalLoggedCost * areaRatio);
      
      const unitTaxesPaid = unitCostsMap.get(u.unit_id) || (u.tax_amount_egp || 0);
      const totalApartmentCost = apportionedGeneralCost + unitTaxesPaid;

      const targetProfit = profitMode === 'PERCENTAGE'
        ? (totalApartmentCost * (targetProfitPercent / 100))
        : (parseFloat(targetProfitCashAmount || '0') / totalUnits);
      
      const floorMultiplier = (u.floor >= 2 && u.floor <= 3) ? 1.05 : 1.0;
      const suggestedPrice = Math.round((totalApartmentCost + targetProfit) * floorMultiplier);
      const pricePerSqm = uArea > 0 ? Math.round(suggestedPrice / uArea) : 0;
      const grossMargin = suggestedPrice > 0 ? (((suggestedPrice - totalApartmentCost) / suggestedPrice) * 100).toFixed(1) : '0';

      return {
        ...u,
        apportionedCost: apportionedGeneralCost,
        unitTaxesPaid,
        totalApartmentCost,
        suggestedPrice,
        pricePerSqm,
        grossMargin
      };
    });

    const totalRetailRevenue = calculatedUnits.reduce((acc, u) => acc + u.suggestedPrice, 0);
    const totalTaxes = calculatedUnits.reduce((acc, u) => acc + (u.unitTaxesPaid || 0), 0);
    const wholeBuildingRevenue = Math.round(parseFloat(builtPricing.estimatedSellingPrice) || 0);
    const retailVsWholeUplift = totalRetailRevenue - wholeBuildingRevenue;
    const retailVsWholeUpliftPct = wholeBuildingRevenue > 0 ? ((retailVsWholeUplift / wholeBuildingRevenue) * 100).toFixed(1) : '0';

    return {
      units: calculatedUnits,
      totalUnits,
      totalRetailRevenue,
      totalTaxes,
      wholeBuildingRevenue,
      retailVsWholeUplift,
      retailVsWholeUpliftPct
    };
  }, [
    selectedProperty,
    isSelectedBuilding,
    propertyAudit.totalLoggedCost,
    propertyCosts,
    profitMode,
    targetProfitPercent,
    targetProfitCashAmount,
    builtPricing.estimatedSellingPrice
  ]);

  const activeUnit = useMemo(() => {
    if (!buildingUnitsPricing?.units || pricingScope !== 'apartment') return null;
    const found = buildingUnitsPricing.units.find(u => u.unit_id === selectedUnitId);
    return found || buildingUnitsPricing.units[0] || null;
  }, [buildingUnitsPricing, pricingScope, selectedUnitId]);

  const propertySelectItems = useMemo<ZFCustomSelectItem<string>[]>(() => {
    return properties.map(p => {
      const area = p.area_sqm || 0;
      const isReady = p.completion_status === 'ready';
      const statusLabelAr = isReady ? 'جاهز للتسليم' : 'قيد التطوير';
      const statusLabelEn = isReady ? 'Ready' : 'Under Development';

      return {
        value: p.id,
        labelAr: p.title_ar || p.title_en || 'مشروع بدون اسم',
        labelEn: p.title_en || p.title_ar || 'Untitled Property',
        sublabelAr: `${area} م² • ${p.location || (isAr ? 'الشرقية' : 'Sharkia')} • ${statusLabelAr}`,
        sublabelEn: `${area} sqm • ${p.location || 'Sharkia'} • ${statusLabelEn}`,
        badge: isAr ? statusLabelAr : statusLabelEn,
        badgeColor: isReady ? '#16a34a' : 'var(--erp-accent, #2563eb)',
        badgeBg: isReady ? '#ecfdf5' : 'var(--erp-accent-subtle, #eff6ff)',
        badgeTextColor: isReady ? '#16a34a' : 'var(--erp-accent, #2563eb)',
        icon: Building2,
        iconColor: 'var(--erp-accent, #2563eb)',
        iconBg: 'var(--erp-accent-subtle, #eff6ff)'
      };
    });
  }, [properties, isAr]);

  const costComposition = useMemo(() => {
    const totalNum = parseFloat(propertyAudit.totalLoggedCost) || 0;
    if (totalNum === 0) return [];
    
    return PROPERTY_COST_CATEGORIES.map(cat => {
      const catTotal = parseFloat(propertyAudit.byCategory[cat.key]?.total || '0');
      const pct = totalNum > 0 ? (catTotal / totalNum) * 100 : 0;
      return {
        ...cat,
        amount: catTotal,
        pct: pct.toFixed(1),
        rawPct: pct
      };
    }).filter(c => c.amount > 0);
  }, [propertyAudit]);

  const [unitSearchQuery, setUnitSearchQuery] = useState<string>('');
  const [unitStatusFilter, setUnitStatusFilter] = useState<'all' | 'available' | 'contracted'>('all');

  const filteredBuildingUnits = useMemo(() => {
    if (!buildingUnitsPricing?.units) return [];
    return buildingUnitsPricing.units.filter(u => {
      if (unitStatusFilter !== 'all') {
        if (unitStatusFilter === 'available' && u.status === 'contracted') return false;
        if (unitStatusFilter === 'contracted' && u.status !== 'contracted') return false;
      }
      if (unitSearchQuery.trim()) {
        const q = unitSearchQuery.toLowerCase().trim();
        const numMatch = (u.unit_number || '').toLowerCase().includes(q);
        const floorMatch = (u.floor?.toString() || '').includes(q);
        if (!numMatch && !floorMatch) return false;
      }
      return true;
    });
  }, [buildingUnitsPricing, unitStatusFilter, unitSearchQuery]);

  const handleApplyUpdatedSellingPrice = async () => {
    if (!selectedProperty || !onUpdateSellingPrice) return;
    setIsUpdatingPrice(true);
    try {
      const newPrice = Math.round(parseFloat(builtPricing.estimatedSellingPrice));
      await onUpdateSellingPrice(selectedProperty.id, newPrice);
      setPriceUpdateSuccess(true);
      toast.success(isAr ? 'تم اعتماد وحفظ السعر بالكتالوج بنجاح' : 'Price updated in catalog');
      setTimeout(() => setPriceUpdateSuccess(false), 4000);
    } catch (e) {
      console.error('Failed to update property price:', e);
      toast.error(isAr ? 'حدث خطأ أثناء حفظ السعر' : 'Failed to save price');
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const handleExportBuiltPricingExcel = async () => {
    if (!selectedProperty) return;
    try {
      setIsExportingExcel(true);
      const totalLogged = parseFloat(builtPricing.totalLoggedCost) || 0;
      const estimatedPrice = parseFloat(builtPricing.estimatedSellingPrice) || 0;
      const profit = parseFloat(builtPricing.targetProfitMoney) || 0;

      await exportFeasibilityExcel({
        title: isAr ? selectedProperty.title_ar : selectedProperty.title_en,
        builtUpAreaSqm: selectedProperty.area_sqm || 0,
        landAreaSqm: Math.round((selectedProperty.area_sqm || 0) / 4),
        landPricePerSqm: marketMeterPrice || 12000,
        floorsCount: 5,
        finishingTierName: isAr ? 'تشطيب فعلي مسجل بالدفاتر' : 'Actual Incurred Logged',
        categories: costComposition.map(c => ({
          name: isAr ? c.nameAr : c.nameEn,
          ratePerSqm: selectedProperty.area_sqm ? Math.round(c.amount / selectedProperty.area_sqm) : 0,
          totalCost: c.amount,
          pct: parseFloat(c.pct) || 0
        })),
        totalConstructionCost: totalLogged,
        totalProjectCost: totalLogged,
        estimatedRevenue: estimatedPrice,
        projectedProfit: profit,
        roiPct: parseFloat(builtPricing.returnOnCostPct) || 0
      }, isAr);

      toast.success(isAr ? 'تم تصدير دراسة تسعير العقار بنجاح إلى Excel' : 'Pricing study exported to Excel');
    } catch (e) {
      toast.error(isAr ? 'حدث خطأ أثناء تصدير الملف' : 'Export failed');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // =========================================================================
  // MODE 2: PRE-CONSTRUCTION FEASIBILITY STATE & LOGIC
  // =========================================================================
  const [builtUpAreaSqm, setBuiltUpAreaSqm] = useState<number>(160);
  const [floorsCount, setFloorsCount] = useState<number>(5);
  const [landAreaSqm, setLandAreaSqm] = useState<number>(300);
  const [landPricePerSqm, setLandPricePerSqm] = useState<number>(12000);
  const [finishingTier, setFinishingTier] = useState<FinishingTier>('semi_finished');
  const [customFinishingCostPerSqm, setCustomFinishingCostPerSqm] = useState<number>(6500);

  const [steelPricePerTon, setSteelPricePerTon] = useState<number>(41500);
  const [concretePricePerM3, setConcretePricePerM3] = useState<number>(1750);
  const [laborCostPerSqm, setLaborCostPerSqm] = useState<number>(1000);
  const [mepCostPerSqm, setMepCostPerSqm] = useState<number>(2200);
  const [facadeCostPerSqm, setFacadeCostPerSqm] = useState<number>(1200);
  const [includeElevator, setIncludeElevator] = useState<boolean>(true);
  const [elevatorCost, setElevatorCost] = useState<number>(450000);
  const [permitsCostPerSqm, setPermitsCostPerSqm] = useState<number>(650);
  const [taxesFeesCostPerSqm, setTaxesFeesCostPerSqm] = useState<number>(450);
  const [targetSalePricePerSqm, setTargetSalePricePerSqm] = useState<number>(26000);

  const feasibilityCalculations = useMemo(() => {
    const area = Math.max(1, builtUpAreaSqm);

    const steelTons = (area * 0.11);
    const totalSteelCost = steelTons * steelPricePerTon;
    const concreteVolumeM3 = (area * 0.42);
    const totalConcreteCost = concreteVolumeM3 * concretePricePerM3;
    const totalCivilStructureCost = totalSteelCost + totalConcreteCost;
    const civilStructureCostPerSqm = totalCivilStructureCost / area;

    const totalLaborCost = area * laborCostPerSqm;
    const laborCostPerSqmEffective = laborCostPerSqm;

    const totalMepCost = area * mepCostPerSqm;
    const mepCostPerSqmEffective = mepCostPerSqm;

    const effectiveFinishingCostPerSqm = finishingTier === 'custom' 
      ? customFinishingCostPerSqm 
      : FINISHING_TIER_COSTS[finishingTier].costPerSqm;
    const totalFinishingCost = area * effectiveFinishingCostPerSqm;

    const effectiveElevatorCost = (includeElevator && floorsCount >= 2) ? elevatorCost : 0;
    const totalFacadeLandscapeCost = area * facadeCostPerSqm;
    const totalSiteFacadeCost = totalFacadeLandscapeCost + effectiveElevatorCost;
    const siteFacadeCostPerSqm = totalSiteFacadeCost / area;

    const totalPermitsCost = area * permitsCostPerSqm;
    const permitsCostPerSqmEffective = permitsCostPerSqm;

    const totalTaxesFeesCost = area * taxesFeesCostPerSqm;
    const taxesFeesCostPerSqmEffective = taxesFeesCostPerSqm;

    const totalConstructionWip = 
      totalCivilStructureCost + 
      totalLaborCost + 
      totalMepCost + 
      totalFinishingCost + 
      totalSiteFacadeCost + 
      totalPermitsCost + 
      totalTaxesFeesCost;
    const constructionCostPerSqm = totalConstructionWip / area;

    const totalLandCost = landAreaSqm * landPricePerSqm;
    const landCostPerBuiltSqm = totalLandCost / area;

    const grandProjectCost = totalConstructionWip + totalLandCost;
    const grandCostPerSqm = grandProjectCost / area;

    const projectedGrossRevenue = area * targetSalePricePerSqm;
    const projectedNetProfit = projectedGrossRevenue - grandProjectCost;
    const developerMarginPercent = grandProjectCost > 0 
      ? (projectedNetProfit / grandProjectCost) * 100 
      : 0;

    const categoryBreakdown = [
      {
        key: 'civil_structure',
        nameAr: 'خرسانات وهيكل إنشائي',
        nameEn: 'Civil & Structure',
        total: totalCivilStructureCost,
        costPerSqm: civilStructureCostPerSqm,
        percentOfTotal: grandProjectCost > 0 ? (totalCivilStructureCost / grandProjectCost) * 100 : 0
      },
      {
        key: 'labor_subcontractor',
        nameAr: 'مصنعيات ومقاول باطن',
        nameEn: 'Labor & Subcontractor',
        total: totalLaborCost,
        costPerSqm: laborCostPerSqmEffective,
        percentOfTotal: grandProjectCost > 0 ? (totalLaborCost / grandProjectCost) * 100 : 0
      },
      {
        key: 'mep_infrastructure',
        nameAr: 'كهروميكانيك وتأسيسات',
        nameEn: 'MEP Infrastructure',
        total: totalMepCost,
        costPerSqm: mepCostPerSqmEffective,
        percentOfTotal: grandProjectCost > 0 ? (totalMepCost / grandProjectCost) * 100 : 0
      },
      {
        key: 'finishing_interior',
        nameAr: `تشطيبات معمارية (${finishingTier === 'custom' ? 'مخصص يدوي' : FINISHING_TIER_COSTS[finishingTier].labelAr})`,
        nameEn: 'Finishing & Interiors',
        total: totalFinishingCost,
        costPerSqm: effectiveFinishingCostPerSqm,
        percentOfTotal: grandProjectCost > 0 ? (totalFinishingCost / grandProjectCost) * 100 : 0
      },
      {
        key: 'site_facade',
        nameAr: 'واجهات ومداخل ومصاعد',
        nameEn: 'Façade & Vertical Access',
        total: totalSiteFacadeCost,
        costPerSqm: siteFacadeCostPerSqm,
        percentOfTotal: grandProjectCost > 0 ? (totalSiteFacadeCost / grandProjectCost) * 100 : 0
      },
      {
        key: 'permits_engineering',
        nameAr: 'تراخيص واستشارات هندسية',
        nameEn: 'Permits & Engineering',
        total: totalPermitsCost,
        costPerSqm: permitsCostPerSqmEffective,
        percentOfTotal: grandProjectCost > 0 ? (totalPermitsCost / grandProjectCost) * 100 : 0
      },
      {
        key: 'taxes_fees',
        nameAr: 'ضرائب ورسوم إنشائية',
        nameEn: 'Taxes, Levies & Insurance',
        total: totalTaxesFeesCost,
        costPerSqm: taxesFeesCostPerSqmEffective,
        percentOfTotal: grandProjectCost > 0 ? (totalTaxesFeesCost / grandProjectCost) * 100 : 0
      },
      {
        key: 'land_allocation',
        nameAr: 'حصة وتكلفة الأرض المحملة',
        nameEn: 'Land Cost Allocation',
        total: totalLandCost,
        costPerSqm: landCostPerBuiltSqm,
        percentOfTotal: grandProjectCost > 0 ? (totalLandCost / grandProjectCost) * 100 : 0
      }
    ];

    return {
      steelTons: Math.round(steelTons * 10) / 10,
      totalSteelCost,
      concreteVolumeM3: Math.round(concreteVolumeM3),
      totalConcreteCost,
      totalCivilStructureCost,
      totalLaborCost,
      totalMepCost,
      effectiveFinishingCostPerSqm,
      totalFinishingCost,
      effectiveElevatorCost,
      totalFacadeLandscapeCost,
      totalSiteFacadeCost,
      totalPermitsCost,
      totalTaxesFeesCost,
      totalConstructionWip,
      constructionCostPerSqm: Math.round(constructionCostPerSqm),
      totalLandCost,
      landCostPerBuiltSqm: Math.round(landCostPerBuiltSqm),
      grandProjectCost,
      grandCostPerSqm: Math.round(grandCostPerSqm),
      projectedGrossRevenue,
      projectedNetProfit,
      developerMarginPercent: Math.round(developerMarginPercent * 10) / 10,
      categoryBreakdown
    };
  }, [
    builtUpAreaSqm,
    floorsCount,
    landAreaSqm,
    landPricePerSqm,
    finishingTier,
    customFinishingCostPerSqm,
    steelPricePerTon,
    concretePricePerM3,
    laborCostPerSqm,
    mepCostPerSqm,
    facadeCostPerSqm,
    includeElevator,
    elevatorCost,
    permitsCostPerSqm,
    taxesFeesCostPerSqm,
    targetSalePricePerSqm
  ]);

  const handleExportFeasibilityExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportFeasibilityExcel({
        title: isAr 
          ? `مشروع جديد مساحة ${builtUpAreaSqm} م² (${floorsCount} أدوار)` 
          : `New Project ${builtUpAreaSqm} sqm (${floorsCount} Floors)`,
        builtUpAreaSqm,
        landAreaSqm,
        landPricePerSqm,
        floorsCount,
        finishingTierName: finishingTier === 'custom' 
          ? `مخصص (${customFinishingCostPerSqm} ج.م/م²)` 
          : (isAr ? FINISHING_TIER_COSTS[finishingTier].labelAr : FINISHING_TIER_COSTS[finishingTier].labelEn),
        categories: feasibilityCalculations.categoryBreakdown.map(c => ({
          name: isAr ? c.nameAr : c.nameEn,
          ratePerSqm: c.costPerSqm,
          totalCost: c.total,
          pct: c.percentOfTotal
        })),
        totalConstructionCost: feasibilityCalculations.totalConstructionWip,
        totalProjectCost: feasibilityCalculations.grandProjectCost,
        estimatedRevenue: feasibilityCalculations.projectedGrossRevenue,
        projectedProfit: feasibilityCalculations.projectedNetProfit,
        roiPct: feasibilityCalculations.developerMarginPercent
      }, isAr);

      toast.success(isAr ? 'تم تصدير دراسة جدوى المشروع بنجاح إلى Excel' : 'Feasibility study exported to Excel');
    } catch (e) {
      toast.error(isAr ? 'حدث خطأ أثناء تصدير الملف' : 'Export failed');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // ApexCharts Blueprint Cartesian Grid Configuration
  const builtPricingChartOptions: ApexCharts.ApexOptions = useMemo(() => ({
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: 'inherit',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 500
      }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '52%',
        borderRadius: 4
      }
    },
    colors: ['var(--erp-accent, #2563eb)'],
    xaxis: {
      categories: costComposition.map(c => isAr ? c.nameAr : c.nameEn),
      labels: {
        style: { colors: '#64748b', fontSize: '11px', fontFamily: 'inherit' },
        formatter: (val: string) => {
          const n = parseFloat(val);
          if (isNaN(n)) return val;
          return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}k` : `${n}`;
        }
      }
    },
    yaxis: {
      labels: {
        style: { colors: '#334155', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit' }
      }
    },
    grid: {
      borderColor: '#e2e8f0',
      strokeDashArray: 2,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } }
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val: number) => `${val.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`
      }
    },
    dataLabels: {
      enabled: false
    }
  }), [costComposition, isAr]);

  const feasibilityChartOptions: ApexCharts.ApexOptions = useMemo(() => ({
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: 'inherit',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 500
      }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '55%',
        borderRadius: 4
      }
    },
    colors: ['var(--erp-accent, #2563eb)'],
    xaxis: {
      categories: feasibilityCalculations.categoryBreakdown.map(c => isAr ? c.nameAr : c.nameEn),
      labels: {
        style: { colors: '#64748b', fontSize: '11px', fontFamily: 'inherit' },
        formatter: (val: string) => {
          const n = parseFloat(val);
          if (isNaN(n)) return val;
          return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}k` : `${n}`;
        }
      }
    },
    yaxis: {
      labels: {
        style: { colors: '#334155', fontSize: '11px', fontWeight: 600, fontFamily: 'inherit' }
      }
    },
    grid: {
      borderColor: '#e2e8f0',
      strokeDashArray: 2,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } }
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val: number) => `${val.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`
      }
    },
    dataLabels: {
      enabled: false
    }
  }), [feasibilityCalculations, isAr]);

  const printableFeasibilityBody = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', direction: isAr ? 'rtl' : 'ltr' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', background: '#fafbfc' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{isAr ? 'إجمالي تكلفة المشروع' : 'Total Project Cost'}</div>
          <strong style={{ fontSize: '1.15rem', color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
            {D(feasibilityCalculations.grandProjectCost).formatEGP(isAr)}
          </strong>
        </div>
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', background: '#fafbfc' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{isAr ? 'المبيعات التقديرية' : 'Estimated Revenue'}</div>
          <strong style={{ fontSize: '1.15rem', color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
            {D(feasibilityCalculations.projectedGrossRevenue).formatEGP(isAr)}
          </strong>
        </div>
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', background: '#fafbfc' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{isAr ? 'صافي الربح المتوقع' : 'Net Profit'}</div>
          <strong style={{ fontSize: '1.15rem', color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
            {D(feasibilityCalculations.projectedNetProfit).formatEGP(isAr)}
          </strong>
        </div>
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', background: '#fafbfc' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{isAr ? 'العائد على الاستثمار' : 'ROI'}</div>
          <strong style={{ fontSize: '1.15rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            {feasibilityCalculations.developerMarginPercent}%
          </strong>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.calculatorContainer} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 0. DOCKED CANONICAL SIDE WIDGETS (PORTAL INTO #zf-side-widgets-slot) */}
      <CalculatorSideWidgets
        calculatorMode={calculatorMode}
        selectedProperty={selectedProperty}
        pricingScope={pricingScope}
        activeUnit={activeUnit}
        totalIncurredCost={pricingScope === 'apartment' && activeUnit ? activeUnit.totalApartmentCost : propertyAudit.totalLoggedCost}
        costPerSqm={pricingScope === 'apartment' && activeUnit ? Math.round(activeUnit.totalApartmentCost / (activeUnit.area_sqm || 1)) : propertyAudit.costPerSqm}
        builtUpArea={pricingScope === 'apartment' && activeUnit ? activeUnit.area_sqm : (selectedProperty?.area_sqm || 0)}
        suggestedSellingPrice={pricingScope === 'apartment' && activeUnit ? activeUnit.suggestedPrice : builtPricing.estimatedSellingPrice}
        sellingPricePerSqm={pricingScope === 'apartment' && activeUnit ? activeUnit.pricePerSqm : Math.round(parseFloat(builtPricing.estimatedSellingPricePerSqm) || 0)}
        grossMarginPct={pricingScope === 'apartment' && activeUnit ? activeUnit.grossMargin : builtPricing.grossMarginPct}
        returnOnCostPct={pricingScope === 'apartment' && activeUnit ? (activeUnit.totalApartmentCost > 0 ? (((activeUnit.suggestedPrice - activeUnit.totalApartmentCost) / activeUnit.totalApartmentCost) * 100).toFixed(1) : '0.0') : builtPricing.returnOnCostPct}
        targetProfitAmount={pricingScope === 'apartment' && activeUnit ? (activeUnit.suggestedPrice - activeUnit.totalApartmentCost) : builtPricing.targetProfitMoney}
        feasibilityData={{
          grandProjectCost: feasibilityCalculations.grandProjectCost,
          grandCostPerSqm: feasibilityCalculations.grandCostPerSqm,
          projectedGrossRevenue: feasibilityCalculations.projectedGrossRevenue,
          projectedNetProfit: feasibilityCalculations.projectedNetProfit,
          developerMarginPercent: feasibilityCalculations.developerMarginPercent,
          roiPercent: feasibilityCalculations.developerMarginPercent,
          totalLandCost: feasibilityCalculations.totalLandCost,
          totalConstructionCost: feasibilityCalculations.totalConstructionWip,
        }}
        onExportExcel={calculatorMode === 'BUILT_PROPERTY_PRICING' ? handleExportBuiltPricingExcel : handleExportFeasibilityExcel}
        isExportingExcel={isExportingExcel}
        onPrint={handlePrint}
        onPreview={() => setShowPrintPreview(true)}
        onSaveCatalogPrice={onUpdateSellingPrice && selectedProperty ? handleApplyUpdatedSellingPrice : undefined}
        isUpdatingPrice={isUpdatingPrice}
        priceUpdateSuccess={priceUpdateSuccess}
        onOpenAudit={onOpenAuditForProperty && selectedProperty ? () => onOpenAuditForProperty(selectedProperty) : undefined}
        onOpenContract={onOpenContractForProperty && selectedProperty && activeUnit ? () => onOpenContractForProperty(selectedProperty, activeUnit) : undefined}
        onNavigateToTab={onNavigateToTab}
        isAr={isAr}
      />

      {/* 1. TOP STAGE HEADER & CONTROLS */}
      <div className={styles.stageHeaderPanel}>
        <div className={styles.headerTopRow}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIconSquircle}>
              <Calculator size={18} />
            </div>
            <div className={styles.titleArea}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <ZFErpBreadcrumb 
                  sectionTitle={isAr ? 'حاسبة التكاليف والجدوى والتسعير' : 'Cost & Feasibility Engine'} 
                  icon={<Calculator size={13} color="var(--erp-accent, #2563eb)" />} 
                />
                <span className={`${shellStyles.statusPill} ${shellStyles.statusPillBlue}`}>
                  {calculatorMode === 'BUILT_PROPERTY_PRICING'
                    ? (isAr ? 'تسعير على التكاليف الفعلية' : 'Actual Audit Basis')
                    : (isAr ? 'دراسة جدوى تقديرية' : 'Feasibility Estimator')}
                </span>
              </div>
              <h1 className={styles.mainTitle}>
                {isAr ? 'حاسبة تكاليف البناء والتسعير الاستثماري' : 'Construction Cost & Property Valuation Engine'}
              </h1>
              <p className={styles.subtitle}>
                {calculatorMode === 'BUILT_PROPERTY_PRICING'
                  ? (isAr 
                      ? 'تسعير الأصول العقارية والوحدات السكنية استناداً إلى التكاليف الفعلية المعتمدة ومؤشرات السوق وهامش الربح المستهدف.' 
                      : 'Determine optimal asset valuation from audited incurred ledger costs, market benchmark rates, and target margins.')
                  : (isAr 
                      ? 'دراسة جدوى تقديرية لكميات حديد التسليح والخرسانة ومواصفات التشطيب وتدفقات السيولة قبل بدء التنفيذ.' 
                      : 'Pre-construction feasibility analysis for structural quantities, MEP, finishing tiers, and financial returns.')}
              </p>
            </div>
          </div>

          {/* Mode Switcher & Enterprise Action Buttons */}
          <div className={styles.headerActionsGroup}>
            <div className={styles.modeSwitcher}>
              <button
                type="button"
                className={`${styles.modeTab} ${calculatorMode === 'BUILT_PROPERTY_PRICING' ? styles.modeTabActive : ''}`}
                onClick={() => setCalculatorMode('BUILT_PROPERTY_PRICING')}
              >
                <ShieldCheck size={14} />
                <span>{isAr ? 'تسعير عقار مبني (مصاريف فعلية)' : 'Built Property Pricing'}</span>
              </button>
              <button
                type="button"
                className={`${styles.modeTab} ${calculatorMode === 'FEASIBILITY_ESTIMATOR' ? styles.modeTabActive : ''}`}
                onClick={() => setCalculatorMode('FEASIBILITY_ESTIMATOR')}
              >
                <Hammer size={14} />
                <span>{isAr ? 'دراسة جدوى تقديرية' : 'Feasibility Estimator'}</span>
              </button>
            </div>

            <button
              type="button"
              className={styles.actionButtonExcel}
              onClick={calculatorMode === 'BUILT_PROPERTY_PRICING' ? handleExportBuiltPricingExcel : handleExportFeasibilityExcel}
              disabled={isExportingExcel}
              title={isAr ? 'تصدير الدراسة بالكامل إلى Excel' : 'Export Study to Excel'}
            >
              <FileSpreadsheet size={14} />
              <span>{isExportingExcel ? (isAr ? 'جاري التصدير...' : 'Exporting...') : (isAr ? 'تصدير شيت Excel' : 'Export')}</span>
            </button>

            <button
              type="button"
              className={styles.actionButton}
              onClick={handlePrint}
              title={isAr ? 'طباعة الدراسة المعتمدة' : 'Print Study'}
            >
              <Printer size={14} />
              <span>{isAr ? 'طباعة' : 'Print'}</span>
            </button>

            <button
              type="button"
              className={styles.actionButton}
              onClick={() => setShowPrintPreview(true)}
              title={isAr ? 'معاينة المستند الرسمي قبل الطباعة' : 'Preview Document'}
            >
              <FileText size={14} color="var(--erp-accent, #2563eb)" />
              <span>{isAr ? 'معاينة' : 'Preview'}</span>
            </button>
          </div>
        </div>

        {/* Target Property Selector & Scope Toggle Bar */}
        {calculatorMode === 'BUILT_PROPERTY_PRICING' && (
          <div className={styles.targetPropertyBar}>
            <div className={styles.propertyControlsRow}>
              <div>
                <label className={styles.inputLabel}>
                  {isAr ? 'العقار أو المشروع المستهدف:' : 'Target Property:'}
                </label>
                <ZFCustomSelect<string>
                  value={selectedPropertyId}
                  onChange={(val) => setSelectedPropertyId(val)}
                  items={propertySelectItems}
                  placeholderAr="اختر العمارة أو المشروع..."
                  placeholderEn="Select Property..."
                  isAr={isAr}
                />
              </div>

              {selectedProperty && (
                <div className={styles.propertyMetaTags}>
                  <div className={styles.metaBadge}>
                    <span style={{ color: '#64748b' }}>{isAr ? 'المساحة المبنية:' : 'Built Area:'}</span>
                    <strong style={{ color: '#0f172a' }}>{selectedProperty.area_sqm} م²</strong>
                  </div>

                  <div className={styles.metaBadge}>
                    <MapPin size={13} color="#64748b" />
                    <strong style={{ color: '#0f172a' }}>{selectedProperty.location || (isAr ? 'الشرقية' : 'Sharkia')}</strong>
                  </div>

                  <div className={styles.metaBadgeGreen}>
                    <CheckCircle2 size={13} color="#15803d" />
                    <span>{propertyAudit.itemsCount} {isAr ? 'بند وفاتورة معتمدة' : 'audited cost items'}</span>
                  </div>

                  {onOpenAuditForProperty && (
                    <button
                      type="button"
                      onClick={() => onOpenAuditForProperty(selectedProperty)}
                      className={styles.actionButton}
                    >
                      <FileText size={14} color="var(--erp-accent, #2563eb)" />
                      <span>{isAr ? 'عرض دفتر المصاريف' : 'Open Audit Dossier'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Scope Selection: Entire Building vs Specific Unit */}
            {isSelectedBuilding && buildingUnitsPricing && buildingUnitsPricing.units.length > 0 && (
              <div className={styles.scopeSelectorContainer}>
                <div className={styles.scopeHeader}>
                  <span className={styles.scopeTitle}>
                    <SlidersHorizontal size={14} color="var(--erp-accent, #2563eb)" />
                    <span>{isAr ? 'نطاق الحساب والتسعير المستهدف:' : 'Pricing Scope Target:'}</span>
                  </span>

                  <div className={styles.scopeSegmentedControl}>
                    <button
                      type="button"
                      className={`${styles.scopeSegmentBtn} ${pricingScope === 'whole' ? styles.scopeSegmentBtnActive : ''}`}
                      onClick={() => {
                        setPricingScope('whole');
                      }}
                    >
                      <Building size={13} />
                      <span>{isAr ? 'العمارة بالكامل (بيع كلي)' : 'Entire Building (Wholesale)'}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.scopeSegmentBtn} ${pricingScope === 'apartment' ? styles.scopeSegmentBtnActive : ''}`}
                      onClick={() => {
                        setPricingScope('apartment');
                        if (!selectedUnitId && buildingUnitsPricing.units.length > 0) {
                          setSelectedUnitId(buildingUnitsPricing.units[0].unit_id);
                        }
                      }}
                    >
                      <DoorOpen size={13} />
                      <span>{isAr ? 'تسعير شقة محددة بالعمارة' : 'Specific Apartment'}</span>
                    </button>
                  </div>
                </div>

                {/* Individual Apartment Chips */}
                {pricingScope === 'apartment' && (
                  <div className={styles.unitsChipsRow}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, flexShrink: 0 }}>
                      {isAr ? 'اختر الشقة للمعاينة:' : 'Select Apartment:'}
                    </span>
                    {buildingUnitsPricing.units.map(u => {
                      const isSelected = activeUnit?.unit_id === u.unit_id;
                      const isContracted = u.status === 'contracted';
                      return (
                        <button
                          key={u.unit_id}
                          type="button"
                          onClick={() => setSelectedUnitId(u.unit_id)}
                          className={`${styles.unitChip} ${isSelected ? styles.unitChipActive : ''}`}
                        >
                          <DoorOpen size={12} />
                          <span>{formatUnitName(u.unit_number)}</span>
                          <span style={{ fontSize: '0.68rem', opacity: isSelected ? 0.9 : 0.65 }}>
                            ({u.area_sqm} م² • {isAr ? `دور ${u.floor}` : `F${u.floor}`})
                          </span>
                          {isContracted && (
                            <span style={{
                              fontSize: '0.62rem',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                              background: isSelected ? 'rgba(255,255,255,0.25)' : '#ecfdf5',
                              color: isSelected ? '#ffffff' : '#15803d',
                              fontWeight: 800
                            }}>
                              {isAr ? 'متباعة' : 'Sold'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. 4 DISCRETE FLOATING STAT CARDS */}
      <ZFKpiGrid>
        {calculatorMode === 'BUILT_PROPERTY_PRICING' ? (
          <>
            <ZFKpiCard
              title={isAr ? 'إجمالي التكلفة الرأسمالية المحملة' : 'Total Capitalized Incurred Cost'}
              value={pricingScope === 'apartment' && activeUnit ? activeUnit.totalApartmentCost : propertyAudit.totalLoggedCost}
              currency="ج.م"
              icon={<HardHat size={16} />}
              accentColor="accent"
              subtitleLabel={isAr ? 'قاعدة التكلفة' : 'Cost Basis'}
              subtitleValue={pricingScope === 'apartment' && activeUnit ? (isAr ? `نصيب ${formatUnitName(activeUnit.unit_number)}` : formatUnitName(activeUnit.unit_number)) : (isAr ? `${propertyAudit.itemsCount} بند معتمد` : `${propertyAudit.itemsCount} Items`)}
              tooltip={isAr ? 'إجمالي المصروفات الرأسمالية المحملة على حساب هذا العقار بالدفاتر' : 'Audited capital expenses incurred on this property'}
            />
            <ZFKpiCard
              title={isAr ? 'متوسط تكلفة المتر المربع' : 'Cost per Square Meter'}
              value={pricingScope === 'apartment' && activeUnit ? Math.round(activeUnit.totalApartmentCost / (activeUnit.area_sqm || 1)) : propertyAudit.costPerSqm}
              currency="ج.م"
              unitLabel="م²"
              icon={<Layers size={16} />}
              accentColor="slate"
              subtitleLabel={isAr ? 'المساحة المبنية' : 'Built Area'}
              subtitleValue={`${pricingScope === 'apartment' && activeUnit ? activeUnit.area_sqm : (selectedProperty?.area_sqm || 0)} م²`}
              tooltip={isAr ? 'متوسط تكلفة المتر المربع الفعلي بناءً على المساحة المبنية' : 'Actual cost per sqm based on built-up area'}
            />
            <ZFKpiCard
              title={isAr ? 'القيمة البيعية المقترحة' : 'Suggested Selling Price'}
              value={pricingScope === 'apartment' && activeUnit ? activeUnit.suggestedPrice : builtPricing.estimatedSellingPrice}
              currency="ج.م"
              icon={<Coins size={16} />}
              accentColor="emerald"
              subtitleLabel={isAr ? 'سعر بيع المتر' : 'Price / sqm'}
              subtitleValue={`${(pricingScope === 'apartment' && activeUnit ? activeUnit.pricePerSqm : Math.round(parseFloat(builtPricing.estimatedSellingPricePerSqm) || 0)).toLocaleString('en-US')} ج.م`}
              tooltip={isAr ? 'سعر البيع الموصى به لتحقيق هامش الربح المستهدف' : 'Recommended selling price to achieve target profit margin'}
            />
            <ZFKpiCard
              title={isAr ? 'هامش الربح والعائد المتوقع' : 'Target Margin & Return'}
              value={`${pricingScope === 'apartment' && activeUnit ? activeUnit.grossMargin : builtPricing.grossMarginPct}%`}
              icon={<TrendingUp size={16} />}
              accentColor="accent"
              subtitleLabel={isAr ? 'العائد على التكلفة' : 'Return on Cost'}
              subtitleValue={`${pricingScope === 'apartment' && activeUnit ? (activeUnit.totalApartmentCost > 0 ? (((activeUnit.suggestedPrice - activeUnit.totalApartmentCost) / activeUnit.totalApartmentCost) * 100).toFixed(1) : '0.0') : builtPricing.returnOnCostPct}%`}
              tooltip={isAr ? 'نسبة هامش الربح الإجمالي والعائد على التكلفة الاستثمارية' : 'Gross profit margin and return on invested capital'}
            />
          </>
        ) : (
          <>
            <ZFKpiCard
              title={isAr ? 'إجمالي تكلفة واستثمار المشروع' : 'Total Project Investment'}
              value={feasibilityCalculations.grandProjectCost}
              currency="ج.م"
              icon={<HardHat size={16} />}
              accentColor="accent"
              subtitleLabel={isAr ? 'مكونات التكلفة' : 'Cost Breakdown'}
              subtitleValue={isAr ? `أرض (${(feasibilityCalculations.totalLandCost).toLocaleString('en-US')} ج.م) + مباني` : 'Land + Construction'}
              tooltip={isAr ? 'إجمالي التكاليف الاستثمارية التقديرية (أرض + مباني وهيكل وتشطيبات)' : 'Estimated total project investment including land and construction'}
            />
            <ZFKpiCard
              title={isAr ? 'إجمالي تكلفة المتر المبني' : 'Total Cost per Built Sqm'}
              value={feasibilityCalculations.grandCostPerSqm}
              currency="ج.م"
              unitLabel="م²"
              icon={<Layers size={16} />}
              accentColor="slate"
              subtitleLabel={isAr ? 'مباني / أرض' : 'WIP / Land'}
              subtitleValue={`${feasibilityCalculations.constructionCostPerSqm.toLocaleString('en-US')} / ${feasibilityCalculations.landCostPerBuiltSqm.toLocaleString('en-US')} ج.م`}
              tooltip={isAr ? 'إجمالي تكلفة المتر المربع المبني شاملاً نصيب الأرض والتشطيب' : 'Total cost per built-up sqm including land share'}
            />
            <ZFKpiCard
              title={isAr ? 'إجمالي الإيرادات المتوقعة' : 'Projected Gross Revenue'}
              value={feasibilityCalculations.projectedGrossRevenue}
              currency="ج.م"
              icon={<Coins size={16} />}
              accentColor="emerald"
              subtitleLabel={isAr ? 'سعر المتر المستهدف' : 'Target Price / sqm'}
              subtitleValue={`${targetSalePricePerSqm.toLocaleString('en-US')} ج.م`}
              tooltip={isAr ? 'إجمالي المبيعات المتوقعة بسعر المتر المستهدف' : 'Gross projected sales revenue at target sale price'}
            />
            <ZFKpiCard
              title={isAr ? 'هامش الأرباح وصافي العائد' : 'Projected Profit Margin & ROI'}
              value={`${feasibilityCalculations.developerMarginPercent}%`}
              icon={<TrendingUp size={16} />}
              accentColor="accent"
              subtitleLabel={isAr ? 'صافي الربح التقديري' : 'Net Profit'}
              subtitleValue={formatCompactMoney(feasibilityCalculations.projectedNetProfit, isAr)}
              tooltip={isAr ? 'نسبة العائد على الاستثمار وصافي الأرباح التقديرية' : 'Projected ROI and net profit'}
            />
          </>
        )}
      </ZFKpiGrid>

      {/* 3. WORKSTATION STAGE: MODE 1 (ACTUAL BUILT PRICING) */}
      {calculatorMode === 'BUILT_PROPERTY_PRICING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* THE 3-PILLAR EXECUTIVE WORKSPACE GRID */}
          <div className={styles.pillarsGrid}>
            
            {/* PILLAR 1: ACTUAL COST BASIS */}
            <div className={styles.pillarCard}>
              <div className={styles.pillarHeader}>
                <div className={styles.pillarTitleGroup}>
                  <ShieldCheck size={16} color="var(--erp-accent, #2563eb)" />
                  <span className={styles.pillarTitle}>
                    {pricingScope === 'apartment' && activeUnit
                      ? (isAr ? `1. نصيب ${formatUnitName(activeUnit.unit_number)} من التكاليف` : `1. Unit ${activeUnit.unit_number} Cost Basis`)
                      : (isAr ? '1. قاعدة التكلفة الفعلية المعتمدة' : '1. Incurred Cost Basis')}
                  </span>
                </div>
                {pricingScope === 'apartment' && activeUnit && (
                  <span className={`${shellStyles.statusPill} ${shellStyles.statusPillBlue}`}>
                    {isAr ? `الدور ${activeUnit.floor}` : `Floor ${activeUnit.floor}`}
                  </span>
                )}
              </div>

              {/* Incurred Cost Hero Box */}
              <div className={styles.pillarHeroBox}>
                <span className={styles.pillarHeroLabel}>
                  {pricingScope === 'apartment' && activeUnit
                    ? (isAr ? 'إجمالي تكلفة الشقة الفعلية المحملة:' : 'Total Apportioned Unit Cost:')
                    : (isAr ? 'إجمالي التكلفة الرأسمالية المحملة:' : 'Total Audited Incurred Capital:')}
                </span>
                <div>
                  {renderMoney(
                    pricingScope === 'apartment' && activeUnit ? activeUnit.totalApartmentCost : propertyAudit.totalLoggedCost,
                    undefined,
                    { size: '1.5rem', weight: 800, color: '#0f172a' }
                  )}
                </div>
              </div>

              {/* Metric Subgrid: Cost / Sqm & Area */}
              <div className={styles.pillarSubGrid}>
                <div className={styles.pillarSubCard}>
                  <span className={styles.pillarSubLabel}>
                    {pricingScope === 'apartment' && activeUnit ? (isAr ? 'تكلفة متر الشقة:' : 'Unit Cost / Sqm:') : (isAr ? 'تكلفة متر المباني الفعلي:' : 'Actual Cost / Sqm:')}
                  </span>
                  <div className={styles.pillarSubValue}>
                    {renderMoney(
                      pricingScope === 'apartment' && activeUnit
                        ? Math.round(activeUnit.totalApartmentCost / (activeUnit.area_sqm || 1))
                        : propertyAudit.costPerSqm,
                      'م²'
                    )}
                  </div>
                </div>

                <div className={styles.pillarSubCard}>
                  <span className={styles.pillarSubLabel}>
                    {pricingScope === 'apartment' && activeUnit ? (isAr ? 'مساحة الشقة:' : 'Unit Area:') : (isAr ? 'مساحة المباني:' : 'Built Area:')}
                  </span>
                  <div className={styles.pillarSubValue}>
                    {pricingScope === 'apartment' && activeUnit ? activeUnit.area_sqm : (selectedProperty?.area_sqm || 0)} م²
                  </div>
                </div>
              </div>

              {/* Expense Apportionment Breakdown */}
              {pricingScope === 'apartment' && activeUnit ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                    {isAr ? 'تفاصيل تحميل التكلفة على الشقة:' : 'Unit Cost Apportionment:'}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ color: '#475569' }}>{isAr ? 'نصيبها من مباني وهيكل العمارة:' : 'Building WIP Share:'}</span>
                    <strong style={{ color: '#0f172a' }}>{renderMoney(activeUnit.apportionedCost)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ color: '#475569' }}>{isAr ? 'رسوم وتراخيص خاصة بالشقة:' : 'Unit Specific Fees:'}</span>
                    <strong style={{ color: '#0f172a' }}>{renderMoney(activeUnit.unitTaxesPaid)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ color: '#475569' }}>{isAr ? 'نسبة المساحة من إجمالي العمارة:' : 'Area Ratio:'}</span>
                    <span style={{ fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                      {((activeUnit.area_sqm / (selectedProperty?.area_sqm || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                    {isAr ? 'أبرز بنود التكلفة المسجلة:' : 'Top Recorded Cost Categories:'}
                  </span>
                  {PROPERTY_COST_CATEGORIES.slice(0, 4).map(cat => {
                    const val = propertyAudit.byCategory[cat.key]?.total || '0.00';
                    return (
                      <div key={cat.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                        <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--erp-accent, #2563eb)' }} />
                          {isAr ? cat.nameAr : cat.nameEn}
                        </span>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {formatCompactMoney(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PILLAR 2: PRICING LEVERS & TARGET MARGIN */}
            <div className={styles.pillarCard}>
              <div className={styles.pillarHeader}>
                <div className={styles.pillarTitleGroup}>
                  <TrendingUp size={16} color="var(--erp-accent, #2563eb)" />
                  <span className={styles.pillarTitle}>
                    {isAr ? '2. محددات التسعير وهامش الربح' : '2. Pricing Levers & Margin'}
                  </span>
                </div>
              </div>

              {/* Lever 1: Market Benchmark Price */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className={styles.inputLabel}>
                    {isAr ? 'سعر المتر الاسترشادي بالسوق:' : 'Market Benchmark / Sqm:'}
                  </label>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--erp-accent, #2563eb)' }}>
                    {renderMoney(marketMeterPrice, 'م²')}
                  </span>
                </div>
                <input
                  type="number"
                  min="5000"
                  step="500"
                  value={marketMeterPrice}
                  onChange={(e) => setMarketMeterPrice(Math.max(1, parseFloat(e.target.value) || 0))}
                  className={styles.formInput}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                  <span>
                    {pricingScope === 'apartment' && activeUnit
                      ? (isAr ? `قيمة الشقة (${activeUnit.area_sqm} م²) بسعر السوق:` : 'Unit Market Benchmark:')
                      : (isAr ? 'قيمة العقار بأسعار السوق:' : 'Market Benchmark Value:')}
                  </span>
                  <strong style={{ color: '#0f172a' }}>
                    {renderMoney(
                      pricingScope === 'apartment' && activeUnit
                        ? (activeUnit.area_sqm * marketMeterPrice)
                        : builtPricing.marketBenchmarkValue
                    )}
                  </strong>
                </div>
              </div>

              {/* Lever 2: Target Profit Mode */}
              <div>
                <label className={styles.inputLabel}>
                  {isAr ? 'هامش الربح المستهدف:' : 'Target Profit Target:'}
                </label>

                {/* Profit Mode Switcher */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.35rem',
                  background: '#f1f5f9',
                  padding: '3px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '0.5rem'
                }}>
                  <button
                    type="button"
                    onClick={() => setProfitMode('PERCENTAGE')}
                    style={{
                      background: profitMode === 'PERCENTAGE' ? '#ffffff' : 'transparent',
                      color: profitMode === 'PERCENTAGE' ? '#16a34a' : '#64748b',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.4rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {isAr ? 'نسبة مئوية %' : 'Percentage %'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfitMode('FIXED_AMOUNT')}
                    style={{
                      background: profitMode === 'FIXED_AMOUNT' ? '#ffffff' : 'transparent',
                      color: profitMode === 'FIXED_AMOUNT' ? '#16a34a' : '#64748b',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.4rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {isAr ? 'مبلغ مقطوع (ج.م)' : 'Fixed Cash'}
                  </button>
                </div>

                {profitMode === 'PERCENTAGE' ? (
                  <div>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={targetProfitPercent}
                      onChange={(e) => setTargetProfitPercent(Math.max(1, parseFloat(e.target.value) || 0))}
                      className={styles.formInput}
                    />
                    <div className={styles.profitPresetGroup}>
                      {[20, 25, 30, 35, 40].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setTargetProfitPercent(pct)}
                          className={`${styles.presetBtn} ${targetProfitPercent === pct ? styles.presetBtnActive : ''}`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="number"
                      step="50000"
                      value={targetProfitCashAmount}
                      onChange={(e) => setTargetProfitCashAmount(e.target.value)}
                      placeholder="3000000"
                      className={styles.formInput}
                    />
                  </div>
                )}

                {/* Profit Strip */}
                <div className={styles.profitStrip}>
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>
                    {pricingScope === 'apartment' && activeUnit
                      ? (isAr ? `مكسب شقة (${activeUnit.unit_number}):` : 'Unit Target Profit:')
                      : (isAr ? 'مبلغ الربح المضاف:' : 'Target Profit (P):')}
                  </span>
                  <div>
                    <span style={{ color: '#16a34a', fontWeight: 800, marginInlineEnd: '0.15rem' }}>+</span>
                    {renderMoney(
                      pricingScope === 'apartment' && activeUnit
                        ? (activeUnit.suggestedPrice - activeUnit.totalApartmentCost)
                        : builtPricing.targetProfitMoney,
                      undefined,
                      { color: '#16a34a', weight: 800, size: '0.85rem' }
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* PILLAR 3: VALUATION RECOMMENDATION */}
            <div className={styles.pillarCard}>
              <div className={styles.pillarHeader}>
                <div className={styles.pillarTitleGroup}>
                  <Coins size={16} color="var(--erp-accent, #2563eb)" />
                  <span className={styles.pillarTitle}>
                    {pricingScope === 'apartment' && activeUnit
                      ? (isAr ? `3. سعر بيع ${formatUnitName(activeUnit.unit_number)}` : `3. Unit ${activeUnit.unit_number} Price`)
                      : (isAr ? '3. القيمة البيعية الاسترشادية' : '3. Valuation Recommendation')}
                  </span>
                </div>
                <span className={`${shellStyles.statusPill} ${shellStyles.statusPillBlue}`}>
                  {pricingScope === 'apartment' && activeUnit ? (isAr ? `دور ${activeUnit.floor}` : `Floor ${activeUnit.floor}`) : (isAr ? 'التكلفة + الربح' : 'Cost + Margin')}
                </span>
              </div>

              {/* Recommended Selling Price Hero Box */}
              <div className={styles.pillarHeroBox}>
                <span className={styles.pillarHeroLabel}>
                  {pricingScope === 'apartment' && activeUnit
                    ? (isAr ? `سعر البيع المقترح لـ ${formatUnitName(activeUnit.unit_number)}:` : `Unit ${activeUnit.unit_number} Suggested Price:`)
                    : (isAr ? 'سعر البيع المقترح للعقار بالكامل:' : 'Recommended Selling Price:')}
                </span>
                <div>
                  {renderMoney(
                    pricingScope === 'apartment' && activeUnit ? activeUnit.suggestedPrice : builtPricing.estimatedSellingPrice,
                    undefined,
                    { size: '1.5rem', weight: 800, color: '#0f172a' }
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <span>{pricingScope === 'apartment' && activeUnit ? (isAr ? 'سعر متر الشقة:' : 'Unit Price / m²:') : (isAr ? 'سعر بيع المتر المقترح:' : 'Price / Sqm:')}</span>
                  <strong style={{ color: '#0f172a' }}>
                    {renderMoney(
                      pricingScope === 'apartment' && activeUnit ? activeUnit.pricePerSqm : builtPricing.estimatedSellingPricePerSqm,
                      'م²'
                    )}
                  </strong>
                </div>
              </div>

              {/* Profitability KPIs Subgrid */}
              <div className={styles.pillarSubGrid}>
                <div className={styles.pillarSubCard}>
                  <span className={styles.pillarSubLabel}>
                    {isAr ? 'نسبة صافي الربح:' : 'Gross Margin:'}
                  </span>
                  <div className={styles.pillarSubValue}>
                    {pricingScope === 'apartment' && activeUnit ? activeUnit.grossMargin : builtPricing.grossMarginPct}%
                  </div>
                </div>

                <div className={styles.pillarSubCard}>
                  <span className={styles.pillarSubLabel}>
                    {isAr ? 'العائد على التكلفة:' : 'Return on Cost:'}
                  </span>
                  <div className={styles.pillarSubValue}>
                    {pricingScope === 'apartment' && activeUnit
                      ? (activeUnit.totalApartmentCost > 0 
                          ? (((activeUnit.suggestedPrice - activeUnit.totalApartmentCost) / activeUnit.totalApartmentCost) * 100).toFixed(1)
                          : '0.0')
                      : builtPricing.returnOnCostPct}%
                  </div>
                </div>
              </div>

              {/* Primary Action Buttons */}
              {pricingScope === 'apartment' && activeUnit ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
                  {activeUnit.status === 'contracted' ? (
                    <div style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      background: '#ecfdf5',
                      border: '1px solid #16a34a',
                      color: '#15803d',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}>
                      <CheckCircle2 size={16} />
                      <span>{isAr ? `${formatUnitName(activeUnit.unit_number)} تم التعاقد وبيعها بالفعل` : `Unit ${activeUnit.unit_number} contracted`}</span>
                    </div>
                  ) : onOpenContractForProperty ? (
                    <button
                      type="button"
                      onClick={() => onOpenContractForProperty(selectedProperty, activeUnit)}
                      className={styles.btnPrimaryGreen}
                    >
                      <Plus size={16} />
                      <span>{isAr ? `+ تحرير عقد بيع لـ ${formatUnitName(activeUnit.unit_number)}` : `Create Contract for Unit ${activeUnit.unit_number}`}</span>
                    </button>
                  ) : null}
                </div>
              ) : (
                onUpdateSellingPrice && selectedProperty && (
                  <button
                    type="button"
                    onClick={handleApplyUpdatedSellingPrice}
                    disabled={isUpdatingPrice}
                    className={priceUpdateSuccess ? styles.btnPrimaryGreen : styles.btnPrimaryAccent}
                  >
                    {priceUpdateSuccess ? (
                      <>
                        <CheckCircle2 size={15} />
                        <span>{isAr ? 'تم اعتماد وحفظ السعر بنجاح' : 'Price Updated'}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={15} />
                        <span>
                          {isUpdatingPrice
                            ? (isAr ? 'جاري الحفظ...' : 'Saving...')
                            : (isAr ? 'اعتماد وحفظ السعر بالكتالوج' : 'Update Catalog Price')}
                        </span>
                      </>
                    )}
                  </button>
                )
              )}
            </div>

          </div>

          {/* CAD CARTESIAN CHART VISUALIZATION DECK */}
          <div className={styles.chartDeckCard}>
            <div className={styles.chartDeckHeader}>
              <div className={styles.chartDeckTitleArea}>
                <PieChart size={16} color="var(--erp-accent, #2563eb)" />
                <span className={styles.chartDeckTitle}>
                  {isAr ? 'مخطط تشريح التكاليف الرأسمالية (CAD Cartesian Blueprint)' : 'Capital Cost Composition Blueprint'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {isAr ? 'إجمالي التكاليف المسجلة:' : 'Total Logged Cost:'}
                </span>
                <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                  {renderMoney(propertyAudit.totalLoggedCost)}
                </strong>
              </div>
            </div>

            {costComposition.length > 0 ? (
              <ERPApexChart
                type="bar"
                height={260}
                isAr={isAr}
                series={[
                  {
                    name: isAr ? 'التكلفة بالجنيه' : 'Cost (EGP)',
                    data: costComposition.map(c => Math.round(c.amount))
                  }
                ]}
                options={builtPricingChartOptions}
              />
            ) : (
              <div className={styles.chartEmptyState}>
                <Info size={22} color="#94a3b8" />
                <strong style={{ color: '#0f172a' }}>
                  {isAr ? 'لا توجد فواتير أو مصاريف مسجلة حتى الآن لهذا المشروع' : 'No cost items recorded yet'}
                </strong>
                <span>
                  {isAr 
                    ? 'المصاريف الفعلية المسجلة بالدفاتر ستظهر هنا فور إدراجها بالقياس الديكارتي' 
                    : 'Audited ledger costs will appear here in the Cartesian blueprint grid'}
                </span>
              </div>
            )}
          </div>

          {/* CANONICAL TABLE CARD FOR BUILDING UNITS STUDIO */}
          {isSelectedBuilding && buildingUnitsPricing && (
            <div className={styles.tableSectionCard}>
              <div className={styles.tableControlsHeader}>
                <div className={styles.tableTitleArea}>
                  <Building2 size={16} color="var(--erp-accent, #2563eb)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                    {isAr ? 'جدول تسعير وحدات وشقق العمارة بالتفصيل' : 'Building Units Pricing Studio'}
                  </span>
                  <span className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`}>
                    {filteredBuildingUnits.length} {isAr ? 'وحدة' : 'units'}
                  </span>
                </div>

                <div className={styles.tableFilterControls}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder={isAr ? 'بحث برقم الشقة أو الدور...' : 'Search unit or floor...'}
                      value={unitSearchQuery}
                      onChange={(e) => setUnitSearchQuery(e.target.value)}
                      className={styles.tableFilterInput}
                    />
                    <Search size={13} color="#94a3b8" style={{ position: 'absolute', insetInlineEnd: '8px', top: '10px' }} />
                  </div>

                  <select
                    value={unitStatusFilter}
                    onChange={(e) => setUnitStatusFilter(e.target.value as any)}
                    className={styles.tableFilterSelect}
                  >
                    <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
                    <option value="available">{isAr ? 'متاح للبيع' : 'Available'}</option>
                    <option value="contracted">{isAr ? 'تم التعاقد' : 'Contracted'}</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className={styles.unitsTable}>
                  <thead className={styles.unitsThead}>
                    <tr>
                      <th className={styles.unitsTh}>{isAr ? 'رقم الشقة' : 'Unit No'}</th>
                      <th className={styles.unitsTh}>{isAr ? 'الدور' : 'Floor'}</th>
                      <th className={styles.unitsTh}>{isAr ? 'المساحة' : 'Area'}</th>
                      <th className={styles.unitsTh}>{isAr ? 'التكلفة المحملة' : 'Allocated Cost'}</th>
                      <th className={styles.unitsTh}>{isAr ? 'سعر البيع المقترح' : 'Suggested Price'}</th>
                      <th className={styles.unitsTh}>{isAr ? 'سعر المتر' : 'Price / Sqm'}</th>
                      <th className={styles.unitsTh}>{isAr ? 'هامش الربح' : 'Margin'}</th>
                      <th className={styles.unitsTh}>{isAr ? 'الحالة' : 'Status'}</th>
                      <th className={styles.unitsTh}>{isAr ? 'إجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBuildingUnits.map(u => {
                      const isSelected = activeUnit?.unit_id === u.unit_id;
                      const isContracted = u.status === 'contracted';

                      return (
                        <tr
                          key={u.unit_id}
                          className={`${styles.unitsRow} ${isSelected ? styles.unitsRowActive : ''}`}
                          onClick={() => {
                            setSelectedUnitId(u.unit_id);
                            setPricingScope('apartment');
                          }}
                        >
                          <td className={styles.unitsTdBold}>
                            {formatUnitName(u.unit_number)}
                          </td>
                          <td className={styles.unitsTd}>
                            {isAr ? `الدور ${u.floor}` : `Floor ${u.floor}`}
                          </td>
                          <td className={styles.unitsTdBold}>
                            {u.area_sqm} م²
                          </td>
                          <td className={styles.unitsTdMoney}>
                            {renderMoney(u.totalApartmentCost)}
                          </td>
                          <td className={styles.unitsTdMoney}>
                            {renderMoney(u.suggestedPrice)}
                          </td>
                          <td className={styles.unitsTdMoney}>
                            {renderMoney(u.pricePerSqm, 'م²')}
                          </td>
                          <td className={styles.unitsTdBold} style={{ color: '#16a34a' }}>
                            {u.grossMargin}%
                          </td>
                          <td className={styles.unitsTd}>
                            <span className={`${shellStyles.statusPill} ${isContracted ? shellStyles.statusPillGreen : shellStyles.statusPillBlue}`}>
                              {isContracted ? (isAr ? 'تم التعاقد' : 'Contracted') : (isAr ? 'متاح للبيع' : 'Available')}
                            </span>
                          </td>
                          <td className={styles.unitsTd}>
                            {isContracted ? (
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{isAr ? 'معتمد' : 'Approved'}</span>
                            ) : onOpenContractForProperty ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenContractForProperty(selectedProperty, u);
                                }}
                                style={{
                                  background: 'var(--erp-accent-subtle, #eff6ff)',
                                  color: 'var(--erp-accent, #2563eb)',
                                  border: '1px solid var(--erp-border, #cbd5e1)',
                                  borderRadius: '6px',
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {isAr ? 'تحرير عقد' : 'Contract'}
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className={styles.tableFooter}>
                <span>
                  {isAr ? `إجمالي وحدات العمارة: ${buildingUnitsPricing.units.length} وحدة` : `Total Units: ${buildingUnitsPricing.units.length}`}
                </span>
                <span>
                  {isAr ? `إجمالي القيمة البيعية التقديرية: ` : `Total Gross Sales: `}
                  <strong>{renderMoney(buildingUnitsPricing.totalRetailRevenue)}</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. WORKSTATION STAGE: MODE 2 (FEASIBILITY ESTIMATOR) */}
      {calculatorMode === 'FEASIBILITY_ESTIMATOR' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: '1.25rem' }}>
          {/* Input Parameters Panel */}
          <div className={styles.pillarCard}>
            <div className={styles.pillarHeader}>
              <div className={styles.pillarTitleGroup}>
                <Hammer size={16} color="var(--erp-accent, #2563eb)" />
                <span className={styles.pillarTitle}>
                  {isAr ? 'مواصفات المشروع والبنود التقديرية المباشرة' : 'Project Specs & Cost Elements'}
                </span>
              </div>
              <span className={`${shellStyles.statusPill} ${shellStyles.statusPillBlue}`}>
                {isAr ? 'دراسة تقديرية' : 'Feasibility'}
              </span>
            </div>

            {/* General Specs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>
                {isAr ? '1. المساحات والأرض:' : '1. Areas & Land:'}
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className={styles.inputLabel}>
                    {isAr ? 'إجمالي المساحة المبنية (م²):' : 'Built-up Area (sqm):'}
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="50000"
                    value={builtUpAreaSqm}
                    onChange={(e) => setBuiltUpAreaSqm(Math.max(1, parseFloat(e.target.value) || 0))}
                    className={styles.formInput}
                  />
                </div>

                <div>
                  <label className={styles.inputLabel}>
                    {isAr ? 'عدد الأدوار:' : 'Floors Count:'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={floorsCount}
                    onChange={(e) => setFloorsCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className={styles.formInput}
                  />
                </div>

                <div>
                  <label className={styles.inputLabel}>
                    {isAr ? 'مساحة الأرض (م²):' : 'Land Area (sqm):'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={landAreaSqm}
                    onChange={(e) => setLandAreaSqm(Math.max(0, parseFloat(e.target.value) || 0))}
                    className={styles.formInput}
                  />
                </div>

                <div>
                  <label className={styles.inputLabel}>
                    {isAr ? 'سعر متر الأرض (ج.م):' : 'Land Price / sqm:'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={landPricePerSqm}
                    onChange={(e) => setLandPricePerSqm(Math.max(0, parseFloat(e.target.value) || 0))}
                    className={styles.formInput}
                  />
                </div>
              </div>
            </div>

            {/* Materials & Finishing */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>
                {isAr ? '2. الخامات والهيكل والتشطيب:' : '2. Materials & Finishing:'}
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className={styles.inputLabel}>
                    {isAr ? 'سعر طن الحديد (ج.م):' : 'Steel Price / ton:'}
                  </label>
                  <input
                    type="number"
                    value={steelPricePerTon}
                    onChange={(e) => setSteelPricePerTon(Math.max(0, parseFloat(e.target.value) || 0))}
                    className={styles.formInput}
                  />
                </div>

                <div>
                  <label className={styles.inputLabel}>
                    {isAr ? 'سعر متر الخرسانة (ج.م):' : 'Concrete / m³:'}
                  </label>
                  <input
                    type="number"
                    value={concretePricePerM3}
                    onChange={(e) => setConcretePricePerM3(Math.max(0, parseFloat(e.target.value) || 0))}
                    className={styles.formInput}
                  />
                </div>

                <div>
                  <label className={styles.inputLabel}>
                    {isAr ? 'مستوى التشطيب:' : 'Finishing Tier:'}
                  </label>
                  <select
                    value={finishingTier}
                    onChange={(e) => setFinishingTier(e.target.value as FinishingTier)}
                    className={styles.tableFilterSelect}
                    style={{ width: '100%', height: '36px' }}
                  >
                    {Object.entries(FINISHING_TIER_COSTS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {isAr ? v.labelAr : v.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={styles.inputLabel}>
                    {isAr ? 'سعر البيع المستهدف للمتر:' : 'Target Sale Price / sqm:'}
                  </label>
                  <input
                    type="number"
                    value={targetSalePricePerSqm}
                    onChange={(e) => setTargetSalePricePerSqm(Math.max(0, parseFloat(e.target.value) || 0))}
                    className={styles.formInput}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Feasibility Chart Panel */}
          <div className={styles.chartDeckCard}>
            <div className={styles.chartDeckHeader}>
              <div className={styles.chartDeckTitleArea}>
                <BarChart3 size={16} color="var(--erp-accent, #2563eb)" />
                <span className={styles.chartDeckTitle}>
                  {isAr ? 'توزيع بنود دراسة الجدوى التقديرية (CAD Cartesian Blueprint)' : 'Feasibility Cost Breakdown Blueprint'}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                {renderMoney(feasibilityCalculations.grandProjectCost)}
              </div>
            </div>

            <ERPApexChart
              type="bar"
              height={320}
              isAr={isAr}
              series={[
                {
                  name: isAr ? 'التكلفة التقديرية (ج.م)' : 'Estimated Cost (EGP)',
                  data: feasibilityCalculations.categoryBreakdown.map(c => Math.round(c.total))
                }
              ]}
              options={feasibilityChartOptions}
            />

            {/* Feasibility Projections Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
              <div className={styles.pillarSubCard}>
                <span className={styles.pillarSubLabel}>{isAr ? 'إجمالي الإيرادات:' : 'Gross Sales:'}</span>
                <div className={styles.pillarSubValue}>{formatCompactMoney(feasibilityCalculations.projectedGrossRevenue, isAr)}</div>
              </div>
              <div className={styles.pillarSubCard}>
                <span className={styles.pillarSubLabel}>{isAr ? 'صافي الأرباح:' : 'Net Profit:'}</span>
                <div className={styles.pillarSubValue} style={{ color: '#16a34a' }}>{formatCompactMoney(feasibilityCalculations.projectedNetProfit, isAr)}</div>
              </div>
              <div className={styles.pillarSubCard}>
                <span className={styles.pillarSubLabel}>{isAr ? 'هامش الربح (ROI):' : 'ROI %:'}</span>
                <div className={styles.pillarSubValue} style={{ color: 'var(--erp-accent, #2563eb)' }}>{feasibilityCalculations.developerMarginPercent}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Print Layout Preview Modal */}
      {showPrintPreview && (
        <ZFPrintDocumentLayout
          documentTitle={isAr ? 'دراسة الجدوى والتسعير المعتمدة' : 'Official Valuation & Feasibility Dossier'}
          documentSubtitle={calculatorMode === 'BUILT_PROPERTY_PRICING' ? (isAr ? selectedProperty?.title_ar : selectedProperty?.title_en) : (isAr ? `مشروع مساحة ${builtUpAreaSqm} م²` : `Project ${builtUpAreaSqm} sqm`)}
          voucherCode={`CALC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`}
          date={new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
          isAr={isAr}
          onClose={() => setShowPrintPreview(false)}
        >
          {printableFeasibilityBody}
        </ZFPrintDocumentLayout>
      )}
    </div>
  );
};

export default ConstructionCostCalculator;
