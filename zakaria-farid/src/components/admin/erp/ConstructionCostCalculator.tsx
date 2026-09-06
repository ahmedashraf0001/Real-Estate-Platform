/**
 * Zakaria Farid Real Estate ERP — Construction & Selling Price Calculator
 * Dual-Mode Engine:
 * 1. ACTUAL BUILT PROPERTY PRICING:
 *    Calculates estimated selling price of an already built property based on:
 *    All collected lifecycle audit logs + Current market meter price + Target profit money.
 * 2. PRE-CONSTRUCTION FEASIBILITY:
 *    Structural steel tonnage, ready-mix concrete volume, MEP, and finishing tiers.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  Hammer, 
  FileSpreadsheet, 
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Layers,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Building2,
  FileText,
  Percent,
  Coins
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Property } from '@/lib/supabase/types';
import { ERPPropertyCostItem } from '@/lib/erp/types';
import { D, Decimal } from '@/lib/erp/math';
import { 
  calculatePropertyAuditMetrics,
  calculateBuiltPropertySellingPrice,
  PROPERTY_COST_CATEGORIES
} from '@/lib/erp/propertyCostEngine';
import styles from './v2/ZFWorkstationShell.module.css';

export interface ConstructionCostCalculatorProps {
  properties: Property[];
  propertyCosts?: ERPPropertyCostItem[];
  onApplyBudgetToProperty?: (propertyId: string, budgetAmount: string) => void;
  onUpdateSellingPrice?: (propertyId: string, newPriceEgp: number) => Promise<void>;
  onOpenAuditForProperty?: (property: Property) => void;
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

export type FinishingTier = 'core_and_shell' | 'semi_finished' | 'lux' | 'super_lux';

export const FINISHING_TIER_COSTS: Record<FinishingTier, { costPerSqm: number; labelAr: string; labelEn: string; descAr: string }> = {
  core_and_shell: {
    costPerSqm: 2800,
    labelAr: 'طوب أحمر وعضم (Core & Shell)',
    labelEn: 'Core & Shell / Red Brick',
    descAr: 'خرسانة مسلحة ومباني طوب أحمر وحلوق خشب من غير أي تشطيب داخلي'
  },
  semi_finished: {
    costPerSqm: 4500,
    labelAr: 'نص تشطيب (Semi-Finished) — الأكثر طلباً',
    labelEn: 'Semi-Finished (Standard)',
    descAr: 'محارة كاملة، حلوق خشب، تأسيس كهرباء وعلب، ومواسير السباكة'
  },
  lux: {
    costPerSqm: 7500,
    labelAr: 'تشطيب لوكس جاهز على السكن',
    labelEn: 'Lux Finished',
    descAr: 'سيراميك فرز أول، دهانات جوتن، أطقم حمامات ومطابخ، وشبابيك ألوميتال'
  },
  super_lux: {
    costPerSqm: 10500,
    labelAr: 'تشطيب سوبر لوكس عالي',
    labelEn: 'Super Lux Finished',
    descAr: 'بورسلين، جبسوم بورد وإضاءة ليد مخفية، دهانات كمبيوتر، وشبابيك جامبو'
  }
};

export const ConstructionCostCalculator: React.FC<ConstructionCostCalculatorProps> = ({
  properties,
  propertyCosts = [],
  onApplyBudgetToProperty,
  onUpdateSellingPrice,
  onOpenAuditForProperty,
  initialPropertyId,
  isAr
}) => {
  // Dedicated single-currency fluid formatter (guarantees zero duplicate EGP ج.م and zero orphan wrapping)
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

  const formatMoneyText = (val: number | string | Decimal | bigint, unitSuffix?: string) => {
    const d = D(val || 0);
    const isNegative = d.isNegative();
    const absD = d.abs();
    const parts = absD.toFixed(2).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const currencySymbol = isAr ? 'ج.م' : 'EGP';
    const suffix = unitSuffix ? `${currencySymbol}/${unitSuffix}` : currencySymbol;
    return `${isNegative ? '-' : ''}${intPart}.${parts[1]} ${suffix}`;
  };

  // Main Mode Toggle: Default to 'BUILT_PROPERTY_PRICING' as requested by user
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
  // 1. Current Market Meter Price (ج.م / م²)
  const [marketMeterPrice, setMarketMeterPrice] = useState<number>(38000);

  // 2. Profit Mode: Percentage on Cost vs Fixed Cash Money
  const [profitMode, setProfitMode] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [targetProfitPercent, setTargetProfitPercent] = useState<number>(35); // 35% default
  const [targetProfitCashAmount, setTargetProfitCashAmount] = useState<string>('3000000');

  // Updating or Committing State
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [priceUpdateSuccess, setPriceUpdateSuccess] = useState(false);

  // Building Wholesale vs Retail Units Pricing Mode
  const [buildingPricingMode, setBuildingPricingMode] = useState<'whole' | 'units'>('whole');

  const isSelectedBuilding = useMemo(() => {
    if (!selectedProperty) return false;
    const title = (selectedProperty.title_ar || selectedProperty.title_en || '').toLowerCase();
    return selectedProperty.type === 'building' || title.includes('عمارة') || title.includes('building');
  }, [selectedProperty]);

  // Sync market meter price when property changes
  useEffect(() => {
    if (selectedProperty) {
      const area = selectedProperty.area_sqm || 200;
      const listPrice = selectedProperty.price_egp || 0;
      if (area > 0 && listPrice > 0) {
        setMarketMeterPrice(Math.round(listPrice / area));
      }
    }
  }, [selectedProperty]);

  // Audit Metrics for the selected property from collected logs
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

  // Built Property Selling Price Calculation
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

    // Filter costs for this property
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

    const calculatedUnits = units.map((u, idx) => {
      const uArea = u.area_sqm || Math.round(totalBuildingArea / totalUnits);
      const areaRatio = totalBuildingArea > 0 ? (uArea / totalBuildingArea) : (1 / totalUnits);
      const apportionedGeneralCost = Math.round(generalLoggedCost * areaRatio);
      
      // Unit taxes & specific costs paid during construction (بند تكلفة مسدد أثناء البناء)
      const unitTaxesPaid = unitCostsMap.get(u.unit_id) || (u.tax_amount_egp || 0);
      const totalApartmentCost = apportionedGeneralCost + unitTaxesPaid;

      const benchmarkVal = uArea * marketMeterPrice;
      const targetProfit = profitMode === 'PERCENTAGE'
        ? (totalApartmentCost * (targetProfitPercent / 100))
        : (parseFloat(targetProfitCashAmount || '0') / totalUnits);
      
      const suggestedPrice = Math.round(totalApartmentCost + benchmarkVal + targetProfit);
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
    marketMeterPrice,
    profitMode,
    targetProfitPercent,
    targetProfitCashAmount,
    builtPricing.estimatedSellingPrice
  ]);

  const handleApplyUpdatedSellingPrice = async () => {
    if (!selectedProperty || !onUpdateSellingPrice) return;
    setIsUpdatingPrice(true);
    try {
      const newPrice = Math.round(parseFloat(builtPricing.estimatedSellingPrice));
      await onUpdateSellingPrice(selectedProperty.id, newPrice);
      setPriceUpdateSuccess(true);
      setTimeout(() => setPriceUpdateSuccess(false), 4000);
    } catch (e) {
      console.error('Failed to update property price:', e);
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  // Export Built Pricing Excel
  const handleExportBuiltPricingExcel = () => {
    if (!selectedProperty) return;
    const wb = XLSX.utils.book_new();
    const rows = [
      [isAr ? 'تقرير تسعير العقار بناءً على مصاريف المباني الفعلية' : 'Built Property Pricing Analysis Report'],
      [isAr ? 'شركة زكريا فريد للتطوير العقاري — نظام FIN-OS' : 'Zakaria Farid Real Estate Developments — FIN-OS'],
      [isAr ? 'تاريخ التقرير:' : 'Report Date:', new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')],
      [],
      [isAr ? 'بيانات العقار' : 'Property Dossier'],
      [isAr ? 'اسم العقار / المشروع' : 'Property Title', isAr ? selectedProperty.title_ar : selectedProperty.title_en],
      [isAr ? 'الموقع' : 'Location', selectedProperty.location],
      [isAr ? 'إجمالي مساحة المباني (م²)' : 'Built-up Area (sqm)', selectedProperty.area_sqm],
      [isAr ? 'السعر الحالي في الكتالوج (ج.م)' : 'Current Catalog List Price (EGP)', selectedProperty.price_egp],
      [],
      [isAr ? 'أولاً: مصاريف المباني اللي اتصرفت فعلياً' : '1. Actual Incurred Logged Costs'],
      [isAr ? 'إجمالي الفلوس المصروفة (ج.م)' : 'Total Incurred Capital (EGP)', parseFloat(builtPricing.totalLoggedCost)],
      [isAr ? 'تكلفة متر المباني الفعلي (ج.م/م²)' : 'Actual Cost per Sqm (EGP/m²)', parseFloat(builtPricing.costPerSqm)],
      [isAr ? 'عدد فواتير ومصاريف المباني المسجلة' : 'Audited Ledger Items Count', propertyAudit.itemsCount],
      [],
      [isAr ? 'ثانياً: أسعار السوق والربح المطلوب' : '2. Market Benchmark & Profit Targets'],
      [isAr ? 'سعر المتر الحالي في السوق (ج.م/م²)' : 'Current Market Meter Price (EGP/m²)', marketMeterPrice],
      [isAr ? 'قيمة العقار بأسعار السوق اليومين دول (ج.م)' : 'Benchmark Market Value (EGP)', parseFloat(builtPricing.marketBenchmarkValue)],
      [isAr ? 'طريقة حساب الربح' : 'Profit Mode', profitMode === 'PERCENTAGE' ? `${targetProfitPercent}% نسبة فوق التكلفة` : 'مبلغ كاش مقطوع'],
      [isAr ? 'مبلغ الربح المطلوب (ج.م)' : 'Target Profit Money (EGP)', parseFloat(builtPricing.targetProfitMoney)],
      [],
      [isAr ? 'ثالثاً: سعر البيع المقترح النهائي' : '3. Final Estimated Selling Price Results'],
      [isAr ? 'سعر بيع العقار المقترح (ج.م)' : 'Estimated Selling Price (EGP)', parseFloat(builtPricing.estimatedSellingPrice)],
      [isAr ? 'سعر بيع المتر المقترح (ج.م/م²)' : 'Estimated Selling Price per Sqm (EGP/m²)', parseFloat(builtPricing.estimatedSellingPricePerSqm)],
      [isAr ? 'الفرق عن سعر السوق الحالي' : 'Variance vs Current Market Price', `${builtPricing.marketVariancePct}%`],
      [isAr ? 'نسبة صافي الربح (%):' : 'Gross Margin %', `${builtPricing.grossMarginPct}%`],
      [isAr ? 'العائد على المصاريف (ROI %):' : 'Return on Incurred Cost %', `${builtPricing.returnOnCostPct}%`]
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 38 }, { wch: 28 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, isAr ? 'تسعير العقار' : 'Built Pricing');
    XLSX.writeFile(wb, `تسعير_عقار_${selectedProperty.title_ar?.replace(/\s+/g, '_') || 'وحدة'}_${Date.now()}.xlsx`);
  };

  // =========================================================================
  // MODE 2: PRE-CONSTRUCTION FEASIBILITY STATE & LOGIC (Structural Engine)
  // =========================================================================
  const [constructionType, setConstructionType] = useState<PropertyConstructionType>('apartment_standard');
  const [builtUpAreaSqm, setBuiltUpAreaSqm] = useState<number>(160);
  const [floorsCount, setFloorsCount] = useState<number>(5);
  const [landAreaSqm, setLandAreaSqm] = useState<number>(300);
  const [landPricePerSqm, setLandPricePerSqm] = useState<number>(12000);
  const [finishingTier, setFinishingTier] = useState<FinishingTier>('semi_finished');
  
  // Market Material Prices
  const [steelPricePerTon, setSteelPricePerTon] = useState<number>(41500);
  const [concretePricePerM3, setConcretePricePerM3] = useState<number>(1750);
  const laborCostPerSqm = 1000;
  const [targetSalePricePerSqm, setTargetSalePricePerSqm] = useState<number>(26000);

  // Sync feasibility inputs when property selected
  const handleSelectPropertyForFeasibility = (propId: string) => {
    setSelectedPropertyId(propId);
    if (!propId) return;
    const prop = properties.find(p => p.id === propId);
    if (prop) {
      if (prop.area_sqm) setBuiltUpAreaSqm(prop.area_sqm);
      if (prop.price_egp && prop.area_sqm) {
        setTargetSalePricePerSqm(Math.round(prop.price_egp / prop.area_sqm));
      }
      const title = (prop.title_ar || prop.title_en || '').toLowerCase();
      if (prop.type === 'building') {
        setConstructionType('building');
        setFloorsCount(5);
      } else if (prop.type === 'garage') {
        setConstructionType('garage');
        setFloorsCount(1);
      } else if (title.includes('دوبلكس') || title.includes('duplex')) {
        setConstructionType('apartment_duplex');
        setFloorsCount(2);
      } else if (title.includes('روف') || title.includes('رووف') || title.includes('roof')) {
        setConstructionType('apartment_roof');
        setFloorsCount(1);
      } else {
        setConstructionType('apartment_standard');
        setFloorsCount(1);
      }
    }
  };

  const feasibilityCalculations = useMemo(() => {
    const area = Math.max(1, builtUpAreaSqm);
    const steelTons = (area * 0.11);
    const totalSteelCost = steelTons * steelPricePerTon;
    const concreteVolumeM3 = (area * 0.42);
    const totalConcreteCost = concreteVolumeM3 * concretePricePerM3;
    const totalLaborCost = area * laborCostPerSqm;
    const skeletonTotal = totalSteelCost + totalConcreteCost + totalLaborCost;
    const mepCostPerSqm = 2200;
    const totalMepCost = area * mepCostPerSqm;
    const finishingUnitCost = FINISHING_TIER_COSTS[finishingTier].costPerSqm;
    const totalFinishingCost = area * finishingUnitCost;
    const hasElevator = (floorsCount >= 4 || constructionType === 'building') && constructionType !== 'garage';
    const elevatorCost = hasElevator ? 450000 : 0;
    const facadeAndLandscapeCost = area * 1200;
    const totalConstructionWip = skeletonTotal + totalMepCost + totalFinishingCost + elevatorCost + facadeAndLandscapeCost;
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

    return {
      steelTons: Math.round(steelTons * 10) / 10,
      totalSteelCost,
      concreteVolumeM3: Math.round(concreteVolumeM3),
      totalConcreteCost,
      totalLaborCost,
      skeletonTotal,
      totalMepCost,
      totalFinishingCost,
      elevatorCost,
      facadeAndLandscapeCost,
      totalConstructionWip,
      constructionCostPerSqm: Math.round(constructionCostPerSqm),
      totalLandCost,
      landCostPerBuiltSqm: Math.round(landCostPerBuiltSqm),
      grandProjectCost,
      grandCostPerSqm: Math.round(grandCostPerSqm),
      projectedGrossRevenue,
      projectedNetProfit,
      developerMarginPercent: Math.round(developerMarginPercent * 10) / 10
    };
  }, [
    builtUpAreaSqm, 
    floorsCount, 
    landAreaSqm, 
    landPricePerSqm, 
    finishingTier, 
    steelPricePerTon, 
    concretePricePerM3, 
    laborCostPerSqm, 
    targetSalePricePerSqm, 
    constructionType
  ]);

  const handleExportFeasibilityExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      [isAr ? 'حسبة ودراسة تكلفة المباني الجديدة' : 'Construction Feasibility & Cost Estimation'],
      [isAr ? 'شركة زكريا فريد للتطوير العقاري' : 'Zakaria Farid Real Estate Developments'],
      [isAr ? 'تاريخ الحساب:' : 'Calculation Date:', new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')],
      [],
      [isAr ? 'المواصفات والمساحات' : 'Technical Specifications'],
      [isAr ? 'إجمالي مساحة المباني (م²)' : 'Built-up Area (sqm)', builtUpAreaSqm],
      [isAr ? 'مساحة الأرض (م²)' : 'Land Area (sqm)', landAreaSqm],
      [isAr ? 'عدد الأدوار' : 'Number of Floors', floorsCount],
      [isAr ? 'نوع التشطيب المطلوب' : 'Finishing Tier', FINISHING_TIER_COSTS[finishingTier].labelAr],
      [],
      [isAr ? 'حسبة الخامات والمباني' : 'Material & Structural Estimates', isAr ? 'الكمية' : 'Quantity', isAr ? 'إجمالي التكلفة (ج.م)' : 'Total Cost (EGP)'],
      [isAr ? 'حديد التسليح المقدر' : 'Steel Rebar', `${feasibilityCalculations.steelTons} طن`, feasibilityCalculations.totalSteelCost],
      [isAr ? 'خرسانة مسلحة جاهزة' : 'Ready-mix Concrete', `${feasibilityCalculations.concreteVolumeM3} م³`, feasibilityCalculations.totalConcreteCost],
      [isAr ? 'مصنعيات وأجور البنا والصب' : 'Skeleton Labor', `${builtUpAreaSqm} م²`, feasibilityCalculations.totalLaborCost],
      [isAr ? 'إجمالي الخرسانات والمباني (العضم)' : 'Total Skeleton Cost', '', feasibilityCalculations.skeletonTotal],
      [isAr ? 'تأسيس الكهرباء والسباكة' : 'MEP & Utilities', '', feasibilityCalculations.totalMepCost],
      [isAr ? 'مصاريف التشطيبات' : 'Architectural Finishing', '', feasibilityCalculations.totalFinishingCost],
      [isAr ? 'الأسانسير والواجهات والمداخل' : 'Elevator, Facade & Landscape', '', feasibilityCalculations.elevatorCost + feasibilityCalculations.facadeAndLandscapeCost],
      [isAr ? 'إجمالي تكلفة المباني والإنشاءات' : 'Total Construction Cost (WIP)', '', feasibilityCalculations.totalConstructionWip],
      [isAr ? 'تكلفة الأرض' : 'Allocated Land Cost', '', feasibilityCalculations.totalLandCost],
      [isAr ? 'إجمالي تكلفة المشروع كله (أرض + مباني)' : 'Grand Total Investment', '', feasibilityCalculations.grandProjectCost],
      [],
      [isAr ? 'الأرباح وحسبة المتر' : 'Financial Indicators & Margins'],
      [isAr ? 'تكلفة المتر الإجمالية (أرض + مباني)' : 'Total Cost / sqm', feasibilityCalculations.grandCostPerSqm],
      [isAr ? 'سعر بيع المتر المستهدف (ج.م/م²)' : 'Target Sale Price / sqm', targetSalePricePerSqm],
      [isAr ? 'إجمالي المبيعات المتوقعة' : 'Projected Sales Revenue', feasibilityCalculations.projectedGrossRevenue],
      [isAr ? 'صافي الربح المتوقع' : 'Projected Net Developer Profit', feasibilityCalculations.projectedNetProfit],
      [isAr ? 'العائد على الاستثمار (ROI %)' : 'Return on Investment (ROI %)', `${feasibilityCalculations.developerMarginPercent}%`]
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 }, { wch: 22 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, isAr ? 'دراسة تكلفة المشروع' : 'Feasibility Study');
    XLSX.writeFile(wb, `دراسة_جدوى_بناء_${builtUpAreaSqm}متر_${Date.now()}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', direction: isAr ? 'rtl' : 'ltr' }}>
      
      {/* 1. TOP STAGE HEADER & MODE SWITCHER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.15rem 1.4rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(184, 144, 62, 0.1)',
            border: '1px solid rgba(184, 144, 62, 0.25)',
            color: '#946f23',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Calculator size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                {isAr ? 'حاسبة مصاريف المباني وتسعير الشقق والعماير' : 'Property Pricing & Construction Cost Engine'}
              </h2>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.18rem 0.55rem',
                borderRadius: '6px',
                background: 'rgba(184, 144, 62, 0.09)',
                border: '1px solid rgba(184, 144, 62, 0.28)',
                color: '#946f23'
              }}>
                {calculatorMode === 'BUILT_PROPERTY_PRICING' 
                  ? (isAr ? 'تسعير على المصاريف الفعلية' : 'Actual Audit Basis') 
                  : (isAr ? 'تقدير تكلفة وأرباح مشروع جديد' : 'Market Feasibility')}
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              {calculatorMode === 'BUILT_PROPERTY_PRICING'
                ? (isAr 
                    ? 'تسعير الشقق والعماير بناءً على مصاريف المباني اللي اتصرفت فعلياً + سعر السوق النهاردة + مكسبك المطلوب' 
                    : 'Determine optimal selling price from verified incurred ledger costs + market benchmark + target profit')
                : (isAr 
                    ? 'حسبة تقديرية لكميات الحديد والخرسانة ومصاريف التشطيب والأرباح المتوقعة قبل ما تبدأ المشروع' 
                    : 'Estimate structural steel, ready-mix concrete, finishing tiers, and development ROI')}
            </p>
          </div>
        </div>

        {/* Mode Switcher & Excel Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '9px',
            padding: '3px'
          }}>
            <button
              type="button"
              onClick={() => setCalculatorMode('BUILT_PROPERTY_PRICING')}
              style={{
                background: calculatorMode === 'BUILT_PROPERTY_PRICING' ? '#ffffff' : 'transparent',
                color: calculatorMode === 'BUILT_PROPERTY_PRICING' ? '#946f23' : '#64748b',
                border: 'none',
                borderRadius: '7px',
                padding: '0.45rem 0.9rem',
                fontSize: '0.76rem',
                fontWeight: calculatorMode === 'BUILT_PROPERTY_PRICING' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: calculatorMode === 'BUILT_PROPERTY_PRICING' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <ShieldCheck size={14} color={calculatorMode === 'BUILT_PROPERTY_PRICING' ? '#946f23' : '#64748b'} />
              <span>{isAr ? 'تسعير عقار مبني (مصاريف فعلية)' : 'Built Property Pricing'}</span>
            </button>

            <button
              type="button"
              onClick={() => setCalculatorMode('FEASIBILITY_ESTIMATOR')}
              style={{
                background: calculatorMode === 'FEASIBILITY_ESTIMATOR' ? '#ffffff' : 'transparent',
                color: calculatorMode === 'FEASIBILITY_ESTIMATOR' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '7px',
                padding: '0.45rem 0.9rem',
                fontSize: '0.76rem',
                fontWeight: calculatorMode === 'FEASIBILITY_ESTIMATOR' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: calculatorMode === 'FEASIBILITY_ESTIMATOR' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Hammer size={14} color={calculatorMode === 'FEASIBILITY_ESTIMATOR' ? '#0f172a' : '#64748b'} />
              <span>{isAr ? 'حسبة تكلفة مشروع جديد' : 'Feasibility Estimator'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={calculatorMode === 'BUILT_PROPERTY_PRICING' ? handleExportBuiltPricingExcel : handleExportFeasibilityExcel}
            style={{
              background: '#ffffff',
              color: '#15803d',
              border: '1px solid rgba(22, 163, 74, 0.3)',
              borderRadius: '9px',
              padding: '0.45rem 0.85rem',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease'
            }}
          >
            <FileSpreadsheet size={15} color="#15803d" />
            <span>{isAr ? 'تصدير شيت Excel' : 'Export'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: ACTUAL BUILT PROPERTY PRICING                                     */}
      {/* ========================================================================= */}
      {calculatorMode === 'BUILT_PROPERTY_PRICING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* 2. PROPERTY DOSSIER SELECTION BAR */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.15rem 1.35rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={16} color="#946f23" />
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'اختيار العمارة أو الشقة' : 'Select Target Property'}
                </span>
              </div>

              {selectedProperty && onOpenAuditForProperty && (
                <button
                  type="button"
                  onClick={() => onOpenAuditForProperty(selectedProperty)}
                  style={{
                    background: 'rgba(184, 144, 62, 0.08)',
                    border: '1px solid rgba(184, 144, 62, 0.25)',
                    color: '#946f23',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <FileText size={13} />
                  <span>{isAr ? 'عرض فواتير ومصاريف العقار' : 'Open Cost Audit Dossier'}</span>
                </button>
              )}
            </div>

            {/* Clean BiDi-isolated Property Dropdown & Telemetry */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 340px' }}>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    background: '#f8fafc',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {isAr ? p.title_ar : p.title_en} — ({p.area_sqm} م² / {p.location})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProperty && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <div style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    padding: '0.35rem 0.7rem',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <span style={{ color: '#64748b' }}>{isAr ? 'مساحة المباني:' : 'Built Area:'}</span>
                    <strong style={{ color: '#0f172a' }}>{selectedProperty.area_sqm} م²</strong>
                  </div>

                  <div style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    padding: '0.35rem 0.7rem',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <span style={{ color: '#64748b' }}>{isAr ? 'الموقع:' : 'Location:'}</span>
                    <strong style={{ color: '#0f172a' }}>{selectedProperty.location}</strong>
                  </div>

                  <div style={{
                    background: 'rgba(22, 163, 74, 0.08)',
                    border: '1px solid rgba(22, 163, 74, 0.25)',
                    padding: '0.35rem 0.7rem',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    color: '#15803d',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <CheckCircle2 size={13} />
                    <span>{propertyAudit.itemsCount} {isAr ? 'فاتورة وبند مسجل' : 'verified items'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. THE 3-PILLAR EXECUTIVE WORKSPACE GRID */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '1.25rem',
            alignItems: 'stretch'
          }}>
            
            {/* PILLAR 1: ACTUAL COST BASIS */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.35rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                paddingBottom: '0.65rem',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <ShieldCheck size={16} color="#946f23" />
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? '1. كل اللي اتصرف فعلياً على العقار' : '1. Incurred Capital Basis (C)'}
                </span>
              </div>

              {/* Hero Total Incurred Capital */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                  {isAr ? 'إجمالي الفلوس اللي اتصرفت:' : 'Total Audited Incurred Capital:'}
                </span>
                <div>
                  {renderMoney(propertyAudit.totalLoggedCost, undefined, { size: '1.65rem', weight: 900, color: '#0f172a' })}
                </div>
              </div>

              {/* Metric Grid: Cost / Sqm & Area */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div style={{
                  background: 'rgba(37, 99, 235, 0.05)',
                  border: '1px solid rgba(37, 99, 235, 0.18)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem'
                }}>
                  <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 700, display: 'block' }}>
                    {isAr ? 'تكلفة متر المباني الفعلي:' : 'Actual Cost / Sqm:'}
                  </span>
                  <div style={{ marginTop: '0.2rem' }}>
                    {renderMoney(propertyAudit.costPerSqm, 'م²', { color: '#2563eb', weight: 800, size: '0.92rem' })}
                  </div>
                </div>

                <div style={{
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem'
                }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    {isAr ? 'مساحة المباني:' : 'Built Area:'}
                  </span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
                    {selectedProperty?.area_sqm || 200} م²
                  </div>
                </div>
              </div>

              {/* Expense Categories Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                  {isAr ? 'توزيع المصاريف على البنود:' : 'Category Breakdown:'}
                </span>
                {PROPERTY_COST_CATEGORIES.slice(0, 4).map(cat => {
                  const val = propertyAudit.byCategory[cat.key]?.total || '0.00';
                  return (
                    <div key={cat.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                      <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color }} />
                        {isAr ? cat.nameAr : cat.nameEn}
                      </span>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {renderMoney(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PILLAR 2: PRICING LEVERS & TARGET PROFIT */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.35rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                paddingBottom: '0.65rem',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <TrendingUp size={16} color="#946f23" />
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? '2. أسعار السوق والمكسب اللي عاوزه' : '2. Pricing Levers & Margin'}
                </span>
              </div>

              {/* Lever 1: Current Market Benchmark Price */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                    {isAr ? 'سعر المتر في السوق النهاردة:' : 'Market Benchmark / Sqm:'}
                  </label>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#946f23' }}>
                    {renderMoney(marketMeterPrice, 'م²')}
                  </span>
                </div>
                <input
                  type="number"
                  min="5000"
                  step="500"
                  value={marketMeterPrice}
                  onChange={(e) => setMarketMeterPrice(Math.max(1, parseFloat(e.target.value) || 0))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                  <span>{isAr ? 'قيمة العقار بأسعار السوق:' : 'Market Benchmark Value:'}</span>
                  <strong style={{ color: '#0f172a' }}>{renderMoney(builtPricing.marketBenchmarkValue)}</strong>
                </div>
              </div>

              {/* Lever 2: Target Profit Mode */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                    {isAr ? 'مكسبك المطلوب في العقار:' : 'Target Profit Target:'}
                  </label>
                </div>

                {/* Segmented Profit Switcher */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.35rem',
                  background: '#f1f5f9',
                  padding: '3px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '0.65rem'
                }}>
                  <button
                    type="button"
                    onClick={() => setProfitMode('PERCENTAGE')}
                    style={{
                      background: profitMode === 'PERCENTAGE' ? '#ffffff' : 'transparent',
                      color: profitMode === 'PERCENTAGE' ? '#15803d' : '#64748b',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.4rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: profitMode === 'PERCENTAGE' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Percent size={12} />
                    <span>{isAr ? 'نسبة فوق التكلفة' : 'Margin %'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProfitMode('FIXED_AMOUNT')}
                    style={{
                      background: profitMode === 'FIXED_AMOUNT' ? '#ffffff' : 'transparent',
                      color: profitMode === 'FIXED_AMOUNT' ? '#15803d' : '#64748b',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.4rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: profitMode === 'FIXED_AMOUNT' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <DollarSign size={12} />
                    <span>{isAr ? 'مبلغ كاش مقطوع' : 'Fixed Cash'}</span>
                  </button>
                </div>

                {profitMode === 'PERCENTAGE' ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{isAr ? 'نسبة المكسب:' : 'Margin Rate:'}</span>
                      <strong style={{ fontSize: '0.88rem', color: '#15803d' }}>{targetProfitPercent}%</strong>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="1"
                      value={targetProfitPercent}
                      onChange={(e) => setTargetProfitPercent(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.35rem', marginTop: '0.4rem' }}>
                      {[20, 25, 30, 35, 40, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setTargetProfitPercent(pct)}
                          style={{
                            flex: 1,
                            padding: '0.25rem 0',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: targetProfitPercent === pct ? '1px solid #10b981' : '1px solid #e2e8f0',
                            background: targetProfitPercent === pct ? '#10b981' : '#f8fafc',
                            color: targetProfitPercent === pct ? '#ffffff' : '#475569',
                            transition: 'all 0.15s ease'
                          }}
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
                      placeholder="مثال: 3000000"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}

                {/* Calculated Net Profit Strip */}
                <div style={{
                  marginTop: '0.65rem',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(22, 163, 74, 0.06)',
                  border: '1px solid rgba(22, 163, 74, 0.2)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.76rem'
                }}>
                  <span style={{ color: '#15803d', fontWeight: 700 }}>
                    {isAr ? 'مبلغ المكسب المضاف:' : 'Target Profit (P):'}
                  </span>
                  <div>
                    <span style={{ color: '#15803d', fontWeight: 800, marginInlineEnd: '0.15rem' }}>+</span>
                    {renderMoney(builtPricing.targetProfitMoney, undefined, { color: '#15803d', weight: 800, size: '0.9rem' })}
                  </div>
                </div>
              </div>
            </div>

            {/* PILLAR 3: STRATEGIC VALUATION & DECISION */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid rgba(184, 144, 62, 0.4)',
              borderRadius: '16px',
              padding: '1.35rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 4px 18px rgba(184, 144, 62, 0.08)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.65rem',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Coins size={16} color="#946f23" />
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                    {isAr ? '3. سعر البيع المقترح النهائي' : '3. Valuation Recommendation'}
                  </span>
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  background: 'rgba(184, 144, 62, 0.1)',
                  color: '#946f23'
                }}>
                  {isAr ? 'التكلفة + المكسب' : 'Cost + Profit'}
                </span>
              </div>

              {/* Hero Big Selling Price */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(254, 253, 250, 0.9) 0%, rgba(248, 249, 250, 0.95) 100%)',
                border: '1px solid rgba(184, 144, 62, 0.22)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <span style={{ fontSize: '0.72rem', color: '#946f23', fontWeight: 700, textTransform: 'uppercase' }}>
                  {isAr ? 'سعر البيع المقترح للعقار كله:' : 'Recommended Selling Price:'}
                </span>
                <div>
                  {renderMoney(builtPricing.estimatedSellingPrice, undefined, { size: 'clamp(1.75rem, 2vw, 2.25rem)', weight: 900, color: '#0f172a' })}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <span>{isAr ? 'سعر بيع المتر المقترح:' : 'Price / Sqm:'}</span>
                  <strong style={{ color: '#946f23' }}>{renderMoney(builtPricing.estimatedSellingPricePerSqm, 'م²')}</strong>
                </div>
              </div>

              {/* Profitability KPIs Split (2-Column Bento) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div style={{
                  background: 'rgba(22, 163, 74, 0.05)',
                  border: '1px solid rgba(22, 163, 74, 0.2)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem'
                }}>
                  <span style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 700, display: 'block' }}>
                    {isAr ? 'نسبة صافي الربح:' : 'Gross Margin:'}
                  </span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#15803d', marginTop: '0.2rem', fontVariantNumeric: 'tabular-nums' }}>
                    {builtPricing.grossMarginPct}%
                  </div>
                </div>

                <div style={{
                  background: 'rgba(184, 144, 62, 0.06)',
                  border: '1px solid rgba(184, 144, 62, 0.22)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem'
                }}>
                  <span style={{ fontSize: '0.68rem', color: '#946f23', fontWeight: 700, display: 'block' }}>
                    {isAr ? 'العائد على الفلوس المصروفة:' : 'Return on Cost:'}
                  </span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#946f23', marginTop: '0.2rem', fontVariantNumeric: 'tabular-nums' }}>
                    {builtPricing.returnOnCostPct}%
                  </div>
                </div>
              </div>

              {/* Market Intelligence Context */}
              {selectedProperty && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  fontSize: '0.74rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>{isAr ? 'السعر المعروض حالياً بالكتالوج:' : 'Current Catalog Price:'}</span>
                    <strong style={{ color: '#0f172a' }}>{renderMoney(selectedProperty.price_egp)}</strong>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#15803d', lineHeight: 1.4, marginTop: '0.2rem' }}>
                    {isAr 
                      ? `💡 السعر ده (المصاريف + مكسبك) بيديك ميزة تنافسية وفرق ${builtPricing.marketVariancePct}% عن أسعار السوق اليومين دول.`
                      : `💡 Cost-plus price provides a competitive ceiling buffer of ${builtPricing.marketVariancePct}%.`}
                  </div>
                </div>
              )}

              {/* Commit / Save Price Button */}
              {onUpdateSellingPrice && selectedProperty && (
                <button
                  type="button"
                  onClick={handleApplyUpdatedSellingPrice}
                  disabled={isUpdatingPrice}
                  style={{
                    background: priceUpdateSuccess
                      ? 'linear-gradient(135deg, #15803d 0%, #166534 100%)'
                      : 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: isUpdatingPrice ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 3px 12px rgba(197, 160, 89, 0.3)',
                    marginTop: 'auto',
                    transition: 'all 0.2s ease',
                    opacity: isUpdatingPrice ? 0.7 : 1
                  }}
                >
                  {priceUpdateSuccess ? (
                    <>
                      <CheckCircle2 size={15} />
                      <span>{isAr ? 'اتحفظ السعر الجديد واعتمدناه!' : 'Price Updated!'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>
                        {isUpdatingPrice
                          ? (isAr ? 'بنحفظ السعر...' : 'Saving...')
                          : (isAr ? 'اعتماد وحفظ السعر في الكتالوج' : 'Update Catalog Price')}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>

          {/* 4. BUILDING WHOLE VS INDIVIDUAL APARTMENTS STUDIO */}
          {isSelectedBuilding && buildingUnitsPricing && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.35rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    background: 'rgba(184, 144, 62, 0.1)',
                    color: '#946f23',
                    padding: '0.5rem',
                    borderRadius: '10px'
                  }}>
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                      {isAr ? 'مقارنة بيع العمارة كاملة كاش ولا بيع شقق لوحدها' : 'Building Wholesale vs Retail Units Pricing Studio'}
                    </h4>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {isAr ? 'توزيع تكلفة المباني على كل شقة ومعرفة الربح الزيادة لو بيعنا الشقق فردانية' : 'Apportion total incurred construction costs across individual apartments'}
                    </span>
                  </div>
                </div>

                {/* Mode switcher */}
                <div style={{
                  display: 'flex',
                  background: '#f1f5f9',
                  padding: '0.25rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  gap: '0.35rem'
                }}>
                  <button
                    type="button"
                    onClick={() => setBuildingPricingMode('whole')}
                    style={{
                      background: buildingPricingMode === 'whole' ? '#ffffff' : 'transparent',
                      color: buildingPricingMode === 'whole' ? '#946f23' : '#64748b',
                      border: buildingPricingMode === 'whole' ? '1px solid rgba(184, 144, 62, 0.3)' : '1px solid transparent',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: buildingPricingMode === 'whole' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    {isAr ? '🏢 بيع العمارة شروة واحدة' : 'Whole Building'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuildingPricingMode('units')}
                    style={{
                      background: buildingPricingMode === 'units' ? '#ffffff' : 'transparent',
                      color: buildingPricingMode === 'units' ? '#946f23' : '#64748b',
                      border: buildingPricingMode === 'units' ? '1px solid rgba(184, 144, 62, 0.3)' : '1px solid transparent',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: buildingPricingMode === 'units' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    {isAr ? '🚪 بيع شقق فردانية' : 'Individual Units'}
                  </button>
                </div>
              </div>

              {/* Key Comparison KPIs */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem'
              }}>
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                    {isAr ? 'عدد شقق العمارة:' : 'Total Building Units:'}
                  </span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    {buildingUnitsPricing.totalUnits} {isAr ? 'شقة' : 'Apartments'}
                  </span>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                    {isAr ? 'إجمالي المبيعات لو بعنا الشقق فردانية:' : 'Total Retail Revenue:'}
                  </span>
                  <div style={{ marginTop: '0.15rem' }}>
                    {renderMoney(buildingUnitsPricing.totalRetailRevenue, undefined, { color: '#b8903e', size: '1.1rem', weight: 900 })}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                    {isAr ? 'الربح الزيادة من بيع الشقق فردانية:' : 'Retail Profit Uplift:'}
                  </span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                    <span style={{ color: '#15803d', fontWeight: 900 }}>+</span>
                    {renderMoney(buildingUnitsPricing.retailVsWholeUplift, undefined, { color: '#15803d', size: '1.1rem', weight: 900 })}
                    <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 800 }}>
                      (+{buildingUnitsPricing.retailVsWholeUpliftPct}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Units List Table */}
              <div style={{
                overflowX: 'auto',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#475569', textAlign: isAr ? 'right' : 'left' }}>
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'رقم / كود الشقة' : 'Unit Code'}</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'الدور' : 'Floor'}</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'المساحة' : 'Area'}</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'نصيبها من مصاريف المباني' : 'General Cost'}</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'الضرائب والرسوم' : 'Unit Taxes/Fees'}</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'إجمالي تكلفة الشقة' : 'Total Unit Cost'}</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'سعر البيع المقترح' : 'Suggested Price'}</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'سعر المتر' : 'Price / m²'}</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'نسبة الربح' : 'Margin'}</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildingUnitsPricing.units.map((u, idx) => (
                      <tr key={u.unit_id || idx} style={{ borderTop: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>{u.unit_number}</td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#475569' }}>{isAr ? `الدور ${u.floor}` : `Floor ${u.floor}`}</td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#475569' }}>{u.area_sqm} م²</td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>{renderMoney(u.apportionedCost, undefined, { color: '#d97706', weight: 700 })}</td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          {u.unitTaxesPaid > 0 ? renderMoney(u.unitTaxesPaid, undefined, { color: '#b8903e', weight: 700 }) : <span style={{ color: '#64748b' }}>{isAr ? '٠ ج.م' : '0 EGP'}</span>}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>{renderMoney(u.totalApartmentCost, undefined, { weight: 800 })}</td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>{renderMoney(u.suggestedPrice, undefined, { color: '#b8903e', weight: 900 })}</td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>{renderMoney(u.pricePerSqm, 'م²', { color: '#64748b', weight: 700 })}</td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#15803d', fontWeight: 700 }}>{u.grossMargin}%</td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: u.status === 'contracted' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(184, 144, 62, 0.1)',
                            color: u.status === 'contracted' ? '#15803d' : '#946f23',
                            border: u.status === 'contracted' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(184, 144, 62, 0.25)'
                          }}>
                            {u.status === 'contracted' ? (isAr ? 'متباعة / متعاقد عليها' : 'Contracted') : (isAr ? 'جاهزة للبيع' : 'Available')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: PRE-CONSTRUCTION FEASIBILITY ESTIMATOR                             */}
      {/* ========================================================================= */}
      {calculatorMode === 'FEASIBILITY_ESTIMATOR' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1.5rem' }}>
          
          {/* INPUT PARAMETERS CARD */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.35rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.15rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#946f23', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Hammer size={16} />
                <span>{isAr ? 'مواصفات ومساحة المشروع الجديد' : 'Building Specs & Parameters'}</span>
              </span>
            </div>

            {/* Quick Property Selector */}
            {properties.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '0.35rem', fontWeight: 700 }}>
                  {isAr ? 'اختيار مشروع مسجل عندنا (اختياري):' : 'Pre-fill from Existing Property:'}
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => handleSelectPropertyForFeasibility(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '0.8rem',
                    padding: '0.55rem 0.75rem'
                  }}
                >
                  <option value="">{isAr ? '-- إدخال مواصفات مشروع جديد --' : '-- Custom Specifications --'}</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {isAr ? p.title_ar : p.title_en} ({p.area_sqm} م²)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Built-up Area & Floors */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '0.35rem', fontWeight: 700 }}>
                  {isAr ? 'إجمالي مساحة المباني (م²):' : 'Built-up Area (sqm):'}
                </label>
                <input
                  type="number"
                  min="20"
                  max="10000"
                  value={builtUpAreaSqm}
                  onChange={(e) => setBuiltUpAreaSqm(Math.max(1, parseFloat(e.target.value) || 0))}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '0.85rem',
                    padding: '0.55rem 0.75rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '0.35rem', fontWeight: 700 }}>
                  {isAr ? 'عدد الأدوار:' : 'Floors Count:'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={floorsCount}
                  onChange={(e) => setFloorsCount(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '0.85rem',
                    padding: '0.55rem 0.75rem'
                  }}
                />
              </div>
            </div>

            {/* Land Area & Land Price */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '0.35rem', fontWeight: 700 }}>
                  {isAr ? 'مساحة الأرض (م²):' : 'Land Area (sqm):'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={landAreaSqm}
                  onChange={(e) => setLandAreaSqm(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '0.85rem',
                    padding: '0.55rem 0.75rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '0.35rem', fontWeight: 700 }}>
                  {isAr ? 'سعر متر الأرض (ج.م):' : 'Land Cost / sqm:'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={landPricePerSqm}
                  onChange={(e) => setLandPricePerSqm(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '0.85rem',
                    padding: '0.55rem 0.75rem'
                  }}
                />
              </div>
            </div>

            {/* Finishing Tier Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '0.35rem', fontWeight: 700 }}>
                {isAr ? 'مستوى التشطيب المطلوب:' : 'Finishing Quality Tier:'}
              </label>
              <select
                value={finishingTier}
                onChange={(e) => setFinishingTier(e.target.value as FinishingTier)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#0f172a',
                  fontSize: '0.8rem',
                  padding: '0.55rem 0.75rem'
                }}
              >
                {(Object.keys(FINISHING_TIER_COSTS) as FinishingTier[]).map((tier) => (
                  <option key={tier} value={tier}>
                    {isAr ? FINISHING_TIER_COSTS[tier].labelAr : FINISHING_TIER_COSTS[tier].labelEn} ({FINISHING_TIER_COSTS[tier].costPerSqm} ج.م/م²)
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                {FINISHING_TIER_COSTS[finishingTier].descAr}
              </div>
            </div>

            {/* Market Prices Override: Steel & Concrete */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#946f23' }}>
                {isAr ? 'أسعار خامات البناء في السوق النهاردة (تقدر تعدلها):' : 'Egyptian Market Material Rates:'}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>
                    {isAr ? 'سعر طن الحديد (ج.م):' : 'Steel / Ton (EGP):'}
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={steelPricePerTon}
                    onChange={(e) => setSteelPricePerTon(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#0f172a',
                      fontSize: '0.78rem',
                      padding: '0.4rem 0.6rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>
                    {isAr ? 'سعر متر الخرسانة الجاهزة (ج.م):' : 'Concrete / m³ (EGP):'}
                  </label>
                  <input
                    type="number"
                    step="50"
                    value={concretePricePerM3}
                    onChange={(e) => setConcretePricePerM3(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#0f172a',
                      fontSize: '0.78rem',
                      padding: '0.4rem 0.6rem'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Target Sale Price per Sqm */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '0.35rem', fontWeight: 700 }}>
                {isAr ? 'سعر بيع المتر المستهدف (ج.م/م²):' : 'Target Selling Price / sqm:'}
              </label>
              <input
                type="number"
                step="500"
                value={targetSalePricePerSqm}
                onChange={(e) => setTargetSalePricePerSqm(Math.max(1, parseFloat(e.target.value) || 0))}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid rgba(184, 144, 62, 0.4)',
                  borderRadius: '8px',
                  color: '#946f23',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  padding: '0.55rem 0.75rem'
                }}
              />
            </div>
          </div>

          {/* REAL-TIME FEASIBILITY RESULTS CARD */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.35rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#946f23', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <TrendingUp size={16} />
                <span>{isAr ? 'حسبة الخامات وتكاليف المشروع والأرباح' : 'Engineering Quantities & Financial Feasibility'}</span>
              </span>
            </div>

            {/* Engineering Material Quantities Breakdown */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                {isAr ? 'الكميات التقديرية للخامات والمباني:' : 'Estimated Structural Materials:'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>{isAr ? 'حديد التسليح:' : 'Steel Rebar:'}</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{feasibilityCalculations.steelTons} {isAr ? 'طن' : 'Tons'}</span>
                  <span style={{ color: '#64748b' }}>(</span>
                  {renderMoney(feasibilityCalculations.totalSteelCost, undefined, { weight: 800 })}
                  <span style={{ color: '#64748b' }}>)</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>{isAr ? 'خرسانة مسلحة جاهزة:' : 'Ready-mix Concrete C35:'}</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{feasibilityCalculations.concreteVolumeM3} {isAr ? 'م³' : 'm³'}</span>
                  <span style={{ color: '#64748b' }}>(</span>
                  {renderMoney(feasibilityCalculations.totalConcreteCost, undefined, { weight: 800 })}
                  <span style={{ color: '#64748b' }}>)</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>{isAr ? 'مصنعيات الخرسانة والمباني:' : 'Skeleton Labor:'}</span>
                <div>
                  {renderMoney(feasibilityCalculations.totalLaborCost, undefined, { weight: 800 })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>{isAr ? 'تأسيس السباكة والكهرباء:' : 'MEP Infrastructure:'}</span>
                <div>
                  {renderMoney(feasibilityCalculations.totalMepCost, undefined, { weight: 800 })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>{isAr ? 'تكلفة التشطيبات:' : 'Architectural Finishing:'}</span>
                <div>
                  {renderMoney(feasibilityCalculations.totalFinishingCost, undefined, { weight: 800 })}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', fontWeight: 800 }}>
                <span style={{ color: '#b8903e' }}>{isAr ? 'إجمالي تكلفة المباني والإنشاءات:' : 'Total Construction (WIP):'}</span>
                <div>
                  {renderMoney(feasibilityCalculations.totalConstructionWip, undefined, { color: '#b8903e', weight: 800 })}
                </div>
              </div>
            </div>

            {/* Feasibility Financial Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem'
            }}>
              <div style={{
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '10px',
                padding: '0.85rem'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#2563eb', display: 'block', fontWeight: 700 }}>
                  {isAr ? 'تكلفة المتر الكلية (مباني + أرض):' : 'Grand Cost / sqm:'}
                </span>
                <div style={{ marginTop: '0.15rem' }}>
                  {renderMoney(feasibilityCalculations.grandCostPerSqm, 'م²', { size: '1.2rem', weight: 900 })}
                </div>
              </div>

              <div style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '10px',
                padding: '0.85rem'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#15803d', display: 'block', fontWeight: 700 }}>
                  {isAr ? 'العائد المتوقع على الاستثمار (ROI):' : 'Developer ROI %:'}
                </span>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#15803d' }}>
                  {feasibilityCalculations.developerMarginPercent}%
                </span>
              </div>
            </div>

            {/* Net Profit & Sales */}
            <div style={{
              padding: '0.85rem',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8rem'
            }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                  {isAr ? 'إجمالي المبيعات المتوقعة:' : 'Projected Sales:'}
                </span>
                <div style={{ marginTop: '0.15rem' }}>
                  {renderMoney(feasibilityCalculations.projectedGrossRevenue, undefined, { weight: 800 })}
                </div>
              </div>

              <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                <span style={{ color: '#15803d', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>
                  {isAr ? 'صافي الأرباح المتوقعة:' : 'Projected Net Profit:'}
                </span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', marginTop: '0.15rem' }}>
                  <span style={{ color: '#15803d', fontWeight: 900 }}>+</span>
                  {renderMoney(feasibilityCalculations.projectedNetProfit, undefined, { color: '#15803d', size: '0.95rem', weight: 900 })}
                </div>
              </div>
            </div>

            {/* Commit Budget Ceiling CTA */}
            {selectedPropertyId && onApplyBudgetToProperty && (
              <button
                type="button"
                onClick={() => onApplyBudgetToProperty(selectedPropertyId, feasibilityCalculations.totalConstructionWip.toString())}
                style={{
                  background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 14px rgba(197, 160, 89, 0.35)',
                  transition: 'all 0.2s ease',
                  marginTop: 'auto'
                }}
              >
                <CheckCircle2 size={15} />
                <span>{isAr ? 'اعتماد الحسبة دي كميزانية مباني للعقار' : 'Commit as Approved WIP Budget Ceiling for Property'}</span>
              </button>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
