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
import { D, formatEGP } from '@/lib/erp/math';
import { 
  calculatePropertyAuditMetrics,
  calculateBuiltPropertySellingPrice,
  PROPERTY_COST_CATEGORIES
} from '@/lib/erp/propertyCostEngine';

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
    labelAr: 'طوب أحمر وعظم (Core & Shell)',
    labelEn: 'Core & Shell / Red Brick',
    descAr: 'هيكل خرساني مسلّح ومباني طوب أحمر وحلوق خشب بدون تشطيب داخلي'
  },
  semi_finished: {
    costPerSqm: 4500,
    labelAr: 'نصف تشطيب (Semi-Finished) — الأكثر طلباً',
    labelEn: 'Semi-Finished (Standard)',
    descAr: 'محارة أسمنتية كاملة، حلوق خشبية، تأسيس كهرباء وعلب، وتمديدات مواسير سباكة'
  },
  lux: {
    costPerSqm: 7500,
    labelAr: 'تشطيب لوكس (Lux Finished)',
    labelEn: 'Lux Finished',
    descAr: 'أرضيات سيراميك فرز أول، دهانات بلاستيك جوتن، أطقم صحي، وشبابيك ألوميتال'
  },
  super_lux: {
    costPerSqm: 10500,
    labelAr: 'تشطيب سوبر لوكس (Super Lux)',
    labelEn: 'Super Lux Finished',
    descAr: 'أرضيات بورسلين، أسقف ساقطة وجبسوم بورد ليد، دهانات كمبيوتر، وقطاعات جامبو'
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
      [isAr ? 'تقرير تسعير العقار القائم المبني استناداً لتكاليف البناء الفعلية' : 'Built Property Pricing Analysis Report'],
      [isAr ? 'شركة زكريا فريد للتطوير العقاري — نظام FIN-OS' : 'Zakaria Farid Real Estate Developments — FIN-OS'],
      [isAr ? 'تاريخ التقرير:' : 'Report Date:', new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')],
      [],
      [isAr ? 'بيانات العقار الأساسية' : 'Property Dossier'],
      [isAr ? 'اسم العقار' : 'Property Title', isAr ? selectedProperty.title_ar : selectedProperty.title_en],
      [isAr ? 'الموقع' : 'Location', selectedProperty.location],
      [isAr ? 'المساحة المبنية الإجمالية (م²)' : 'Built-up Area (sqm)', selectedProperty.area_sqm],
      [isAr ? 'سعر القائمة الحالي بالكتالوج (ج.م)' : 'Current Catalog List Price (EGP)', selectedProperty.price_egp],
      [],
      [isAr ? 'أولاً: التكاليف المنفقة الفعلية الموثقة (Audit Logs)' : '1. Actual Incurred Logged Costs'],
      [isAr ? 'إجمالي التكلفة المنفقة المسجلة (ج.م)' : 'Total Incurred Capital (EGP)', parseFloat(builtPricing.totalLoggedCost)],
      [isAr ? 'تكلفة المتر المنفذة الفعلية (ج.م/م²)' : 'Actual Cost per Sqm (EGP/m²)', parseFloat(builtPricing.costPerSqm)],
      [isAr ? 'عدد بنود ومواد البناء المعتمدة' : 'Audited Ledger Items Count', propertyAudit.itemsCount],
      [],
      [isAr ? 'ثانياً: مؤشرات السوق والربح المستهدف' : '2. Market Benchmark & Profit Targets'],
      [isAr ? 'سعر المتر الحالي في السوق (ج.م/م²)' : 'Current Market Meter Price (EGP/m²)', marketMeterPrice],
      [isAr ? 'القيمة السوقية المرجعية للعقار (ج.م)' : 'Benchmark Market Value (EGP)', parseFloat(builtPricing.marketBenchmarkValue)],
      [isAr ? 'طريقة احتساب الربح' : 'Profit Mode', profitMode === 'PERCENTAGE' ? `${targetProfitPercent}% هامش على التكلفة` : 'مبلغ مقطوع'],
      [isAr ? 'مبلغ الربح المستهدف (ج.م)' : 'Target Profit Money (EGP)', parseFloat(builtPricing.targetProfitMoney)],
      [],
      [isAr ? 'ثالثاً: نتائج التسعير التقديري المعتمدة' : '3. Final Estimated Selling Price Results'],
      [isAr ? 'سعر البيع التقديري المقترح (ج.م)' : 'Estimated Selling Price (EGP)', parseFloat(builtPricing.estimatedSellingPrice)],
      [isAr ? 'سعر البيع التقديري للمتر المربع (ج.م/م²)' : 'Estimated Selling Price per Sqm (EGP/m²)', parseFloat(builtPricing.estimatedSellingPricePerSqm)],
      [isAr ? 'الفارق عن سعر السوق الحالي' : 'Variance vs Current Market Price', `${builtPricing.marketVariancePct}%`],
      [isAr ? 'هامش الربح الإجمالي (Gross Margin %)' : 'Gross Margin %', `${builtPricing.grossMarginPct}%`],
      [isAr ? 'العائد على التكلفة المنفقة (ROI on Cost %)' : 'Return on Incurred Cost %', `${builtPricing.returnOnCostPct}%`]
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 38 }, { wch: 28 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, isAr ? 'تسعير العقار القائم' : 'Built Pricing');
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
      [isAr ? 'دراسة الجدوى وحاسبة تكاليف التشييد التقديرية' : 'Construction Feasibility & Cost Estimation'],
      [isAr ? 'شركة زكريا فريد للتطوير العقاري' : 'Zakaria Farid Real Estate Developments'],
      [isAr ? 'تاريخ الحساب:' : 'Calculation Date:', new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')],
      [],
      [isAr ? 'المواصفات الفنية والمساحات' : 'Technical Specifications'],
      [isAr ? 'المساحة المبنية الإجمالية (م²)' : 'Built-up Area (sqm)', builtUpAreaSqm],
      [isAr ? 'مساحة الأرض (م²)' : 'Land Area (sqm)', landAreaSqm],
      [isAr ? 'عدد الأدوار' : 'Number of Floors', floorsCount],
      [isAr ? 'مستوى التشطيب المختار' : 'Finishing Tier', FINISHING_TIER_COSTS[finishingTier].labelAr],
      [],
      [isAr ? 'تقديرات المواد والإنشاءات' : 'Material & Structural Estimates', isAr ? 'الكمية' : 'Quantity', isAr ? 'التكلفة الإجمالية (ج.م)' : 'Total Cost (EGP)'],
      [isAr ? 'حديد التسليح المقدر' : 'Steel Rebar', `${feasibilityCalculations.steelTons} طن`, feasibilityCalculations.totalSteelCost],
      [isAr ? 'خرسانة مسلحة جاهزة' : 'Ready-mix Concrete', `${feasibilityCalculations.concreteVolumeM3} م³`, feasibilityCalculations.totalConcreteCost],
      [isAr ? 'أجور مصنعيات الهيكل' : 'Skeleton Labor', `${builtUpAreaSqm} م²`, feasibilityCalculations.totalLaborCost],
      [isAr ? 'إجمالي تكلفة العظم والخرسانات' : 'Total Skeleton Cost', '', feasibilityCalculations.skeletonTotal],
      [isAr ? 'التأسيس والكهروميكانيك (MEP)' : 'MEP & Utilities', '', feasibilityCalculations.totalMepCost],
      [isAr ? 'أعمال التشطيبات المعمارية' : 'Architectural Finishing', '', feasibilityCalculations.totalFinishingCost],
      [isAr ? 'المصاعد والواجهات وتنسيق الموقع' : 'Elevator, Facade & Landscape', '', feasibilityCalculations.elevatorCost + feasibilityCalculations.facadeAndLandscapeCost],
      [isAr ? 'إجمالي تكلفة البناء والتشييد (WIP)' : 'Total Construction Cost (WIP)', '', feasibilityCalculations.totalConstructionWip],
      [isAr ? 'تكلفة الأرض المخصصة' : 'Allocated Land Cost', '', feasibilityCalculations.totalLandCost],
      [isAr ? 'إجمالي الاستثمار والتكلفة الكلية' : 'Grand Total Investment', '', feasibilityCalculations.grandProjectCost],
      [],
      [isAr ? 'المؤشرات المالية وهامش الربح' : 'Financial Indicators & Margins'],
      [isAr ? 'تكلفة المتر الإجمالية (ج.م/م²)' : 'Total Cost / sqm', feasibilityCalculations.grandCostPerSqm],
      [isAr ? 'سعر البيع المستهدف للمتر (ج.م/م²)' : 'Target Sale Price / sqm', targetSalePricePerSqm],
      [isAr ? 'إجمالي المبيعات المتوقعة' : 'Projected Sales Revenue', feasibilityCalculations.projectedGrossRevenue],
      [isAr ? 'صافي أرباح المطور المتوقعة' : 'Projected Net Developer Profit', feasibilityCalculations.projectedNetProfit],
      [isAr ? 'العائد على الاستثمار (ROI %)' : 'Return on Investment (ROI %)', `${feasibilityCalculations.developerMarginPercent}%`]
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 }, { wch: 22 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, isAr ? 'دراسة الجدوى التقديرية' : 'Feasibility Study');
    XLSX.writeFile(wb, `دراسة_جدوى_بناء_${builtUpAreaSqm}متر_${Date.now()}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', direction: isAr ? 'rtl' : 'ltr' }}>
      
      {/* Top Banner & Mode Toggle */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
            color: '#ffffff',
            padding: '0.85rem',
            borderRadius: '12px',
            boxShadow: '0 4px 14px rgba(197, 160, 89, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Calculator size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                {isAr ? 'حاسبة تسعير العقارات وتكاليف التشييد الميدانية' : 'Property Pricing & Construction Cost Engine'}
              </h2>
              <span style={{
                background: 'rgba(184, 144, 62, 0.08)',
                color: '#946f23',
                border: '1px solid rgba(184, 144, 62, 0.25)',
                padding: '0.15rem 0.55rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800
              }}>
                {calculatorMode === 'BUILT_PROPERTY_PRICING' 
                  ? (isAr ? 'سجل التدقيق الفعلي' : 'Actual Lifecycle Audit') 
                  : (isAr ? 'معايير السوق المصري' : 'Egypt Market Rates')}
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              {calculatorMode === 'BUILT_PROPERTY_PRICING'
                ? (isAr 
                    ? 'تسعير العقار القائم استناداً لسجل تكاليف ومواد البناء المنفقة + سعر المتر الحالي بالسوق + هامش الربح المستهدف' 
                    : 'Estimate selling price for an already built property based on accumulated cost logs + market meter rate + profit')
                : (isAr 
                    ? 'حساب أطنان الحديد وحجوم الخرسانات ومستويات التشطيب وحساب هوامش الربح للمطور العقاري' 
                    : 'Structural engineering estimations, steel tonnage, concrete volume, and developer feasibility')}
            </p>
          </div>
        </div>

        {/* Dual Mode Switcher & Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '3px',
            display: 'flex',
            gap: '3px'
          }}>
            <button
              onClick={() => setCalculatorMode('BUILT_PROPERTY_PRICING')}
              style={{
                background: calculatorMode === 'BUILT_PROPERTY_PRICING' 
                  ? '#0f172a' 
                  : 'transparent',
                color: calculatorMode === 'BUILT_PROPERTY_PRICING' ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 0.9rem',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: calculatorMode === 'BUILT_PROPERTY_PRICING' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <ShieldCheck size={14} />
              <span>{isAr ? 'تسعير العقار القائم الفعلي' : 'Built Property Pricing'}</span>
            </button>

            <button
              onClick={() => setCalculatorMode('FEASIBILITY_ESTIMATOR')}
              style={{
                background: calculatorMode === 'FEASIBILITY_ESTIMATOR' 
                  ? '#0f172a' 
                  : 'transparent',
                color: calculatorMode === 'FEASIBILITY_ESTIMATOR' ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 0.9rem',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: calculatorMode === 'FEASIBILITY_ESTIMATOR' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <Hammer size={14} />
              <span>{isAr ? 'دراسة الجدوى والتقدير المسبق' : 'Feasibility Estimator'}</span>
            </button>
          </div>

          <button
            onClick={calculatorMode === 'BUILT_PROPERTY_PRICING' ? handleExportBuiltPricingExcel : handleExportFeasibilityExcel}
            style={{
              background: '#ffffff',
              color: '#15803d',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '10px',
              padding: '0.55rem 1rem',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease'
            }}
          >
            <FileSpreadsheet size={15} />
            <span>{isAr ? 'تصدير التحليل Excel' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: ACTUAL BUILT PROPERTY PRICING                                     */}
      {/* ========================================================================= */}
      {calculatorMode === 'BUILT_PROPERTY_PRICING' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          
          {/* LEFT COLUMN: Property Selector, Logged Audit Summary & Parameters */}
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
            {/* Step 1: Select Built Property */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#946f23', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Building2 size={16} />
                  <span>{isAr ? '1. اختيار العقار القائم المبني بالنظام' : '1. Select Built Property'}</span>
                </label>
                {selectedProperty && onOpenAuditForProperty && (
                  <button
                    onClick={() => onOpenAuditForProperty(selectedProperty)}
                    style={{
                      background: 'rgba(184, 144, 62, 0.08)',
                      border: '1px solid rgba(184, 144, 62, 0.25)',
                      color: '#946f23',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <FileText size={12} />
                    <span>{isAr ? 'فتح سجل التدقيق الكامل' : 'Open Audit Dossier'}</span>
                  </button>
                )}
              </div>

              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  color: '#0f172a',
                  fontSize: '0.85rem',
                  padding: '0.7rem 0.85rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {isAr ? p.title_ar : p.title_en} — ({p.area_sqm} م² • {p.location})
                  </option>
                ))}
              </select>
            </div>

            {/* Collected Audit Summary Card */}
            <div style={{
              background: 'linear-gradient(135deg, #fefdfa 0%, #f8f9fa 100%)',
              border: '1px solid rgba(184, 144, 62, 0.25)',
              borderRadius: '12px',
              padding: '1.1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldCheck size={14} color="#946f23" />
                  <span>{isAr ? 'إجمالي التكاليف المنفقة الفعلية الموثقة' : 'Audited Incurred Capital'}</span>
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '999px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#15803d',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontWeight: 700
                }}>
                  {propertyAudit.itemsCount} {isAr ? 'بند معتمد' : 'audited items'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                  {formatEGP(propertyAudit.totalLoggedCost)}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#946f23', fontWeight: 800 }}>ج.م</span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '0.65rem',
                fontSize: '0.74rem'
              }}>
                <div>
                  <span style={{ color: '#64748b' }}>{isAr ? 'تكلفة المتر المنفذة الفعلية:' : 'Actual Cost / Sqm:'}</span>
                  <div style={{ color: '#2563eb', fontWeight: 800, marginTop: '0.15rem' }}>
                    {formatEGP(propertyAudit.costPerSqm)} ج.م/م²
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>{isAr ? 'المساحة المبنية الإجمالية:' : 'Total Built-up Area:'}</span>
                  <div style={{ color: '#0f172a', fontWeight: 800, marginTop: '0.15rem' }}>
                    {selectedProperty?.area_sqm || 200} م²
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Current Market Meter Price Input */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Coins size={15} color="#946f23" />
                  <span>{isAr ? '2. سعر المتر الحالي في السوق (ج.م / م²)' : '2. Current Market Meter Price (EGP/m²)'}</span>
                </label>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
                  {formatEGP(marketMeterPrice)} ج.م
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
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  color: '#0f172a',
                  fontSize: '0.85rem',
                  padding: '0.65rem 0.85rem',
                  outline: 'none'
                }}
              />
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{isAr ? 'القيمة السوقية المرجعية للعقار:' : 'Benchmark Market Value:'}</span>
                <strong style={{ color: '#946f23' }}>{formatEGP(builtPricing.marketBenchmarkValue)} ج.م</strong>
              </div>
            </div>

            {/* Step 3: Target Profit Money */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <TrendingUp size={15} color="#15803d" />
                <span>{isAr ? '3. هامش ومبلغ الربح المطلوب (Profit Money)' : '3. Target Profit Money'}</span>
              </label>

              {/* Toggle Percentage vs Fixed Amount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setProfitMode('PERCENTAGE')}
                  style={{
                    background: profitMode === 'PERCENTAGE' ? 'rgba(16, 185, 129, 0.1)' : '#f8fafc',
                    border: `1px solid ${profitMode === 'PERCENTAGE' ? '#10b981' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    padding: '0.5rem',
                    color: profitMode === 'PERCENTAGE' ? '#15803d' : '#64748b',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Percent size={13} />
                  <span>{isAr ? 'نسبة مئوية من التكلفة' : 'Percentage on Cost'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProfitMode('FIXED_AMOUNT')}
                  style={{
                    background: profitMode === 'FIXED_AMOUNT' ? 'rgba(16, 185, 129, 0.1)' : '#f8fafc',
                    border: `1px solid ${profitMode === 'FIXED_AMOUNT' ? '#10b981' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    padding: '0.5rem',
                    color: profitMode === 'FIXED_AMOUNT' ? '#15803d' : '#64748b',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <DollarSign size={13} />
                  <span>{isAr ? 'مبلغ ربح مقطوع كاش' : 'Fixed Cash Amount'}</span>
                </button>
              </div>

              {profitMode === 'PERCENTAGE' ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{isAr ? 'نسبة هامش الربح المستهدف:' : 'Profit Margin %:'}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#15803d' }}>{targetProfitPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={targetProfitPercent}
                    onChange={(e) => setTargetProfitPercent(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#10b981' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', marginTop: '0.5rem' }}>
                    {[20, 25, 30, 35, 40, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setTargetProfitPercent(pct)}
                        style={{
                          flex: 1,
                          padding: '0.3rem 0',
                          borderRadius: '6px',
                          background: targetProfitPercent === pct ? '#10b981' : '#f1f5f9',
                          color: targetProfitPercent === pct ? '#ffffff' : '#475569',
                          border: `1px solid ${targetProfitPercent === pct ? '#10b981' : '#e2e8f0'}`,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
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
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      color: '#0f172a',
                      fontSize: '0.85rem',
                      padding: '0.65rem 0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              )}

              <div style={{
                marginTop: '0.65rem',
                padding: '0.65rem 0.85rem',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.78rem'
              }}>
                <span style={{ color: '#475569' }}>{isAr ? 'صافي مبلغ الربح المحسوب:' : 'Calculated Net Profit:'}</span>
                <strong style={{ color: '#15803d', fontSize: '0.9rem' }}>
                  +{formatEGP(builtPricing.targetProfitMoney)} ج.م
                </strong>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: The Final Estimated Selling Price & Financial Decision Engine */}
          <div style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fefdfa 100%)',
            border: '1px solid rgba(184, 144, 62, 0.35)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px -4px rgba(184, 144, 62, 0.1)'
          }}>
            {/* Grand Result Hero Header */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#946f23', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {isAr ? 'سعر البيع التقديري المقترح للعقار القائم' : 'Estimated Built Property Selling Price'}
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '999px',
                  background: 'rgba(184, 144, 62, 0.1)',
                  color: '#946f23',
                  border: '1px solid rgba(184, 144, 62, 0.25)',
                  fontWeight: 800
                }}>
                  {isAr ? 'التكاليف الفعلية + الربح' : 'Costs + Target Profit'}
                </span>
              </div>

              {/* Main Big Number */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.5rem 0' }}>
                <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {formatEGP(builtPricing.estimatedSellingPrice)}
                </span>
                <span style={{ fontSize: '1.1rem', color: '#946f23', fontWeight: 800 }}>ج.م</span>
              </div>

              {/* Price Per Sqm Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.8rem',
                  color: '#334155',
                  fontWeight: 700
                }}>
                  <span>{isAr ? 'سعر المتر التقديري:' : 'Est. Price / Sqm:'}</span>
                  <strong style={{ color: '#946f23' }}>{formatEGP(builtPricing.estimatedSellingPricePerSqm)} ج.م/م²</strong>
                </div>

                {/* Market Variance Pill */}
                {parseFloat(builtPricing.marketVariancePct) >= 0 ? (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '8px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.76rem',
                    color: '#15803d',
                    fontWeight: 800
                  }}>
                    <ArrowUpRight size={14} />
                    <span>+{builtPricing.marketVariancePct}% {isAr ? 'أعلى من متوسط السوق' : 'above market rate'}</span>
                  </div>
                ) : (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: '8px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.76rem',
                    color: '#2563eb',
                    fontWeight: 800
                  }}>
                    <ArrowDownRight size={14} />
                    <span>{builtPricing.marketVariancePct}% {isAr ? 'تسعير تنافسي سريع' : 'competitive pricing'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Breakdown Equation Box */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                {isAr ? 'معادلة التسعير المطبقة وفقاً لطلب المطور:' : 'Applied Real Estate Pricing Formula:'}
              </div>

              {/* Row 1: Actual Costs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#475569' }}>{isAr ? 'إجمالي المنصرف الفعلي المسجل (C):' : 'Total Incurred Cost (C):'}</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{formatEGP(builtPricing.totalLoggedCost)} ج.م</span>
              </div>

              {/* Row 2: Target Profit Money */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#15803d' }}>{isAr ? 'مبلغ الربح المستهدف المضاف (P):' : 'Target Profit Money (P):'}</span>
                <span style={{ fontWeight: 800, color: '#15803d' }}>+{formatEGP(builtPricing.targetProfitMoney)} ج.م</span>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: '#e2e8f0' }} />

              {/* Row 3: Sum */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800 }}>
                <span style={{ color: '#946f23' }}>{isAr ? 'سعر البيع الإجمالي التقديري:' : 'Total Selling Price:'}</span>
                <span style={{ color: '#946f23' }}>{formatEGP(builtPricing.estimatedSellingPrice)} ج.م</span>
              </div>
            </div>

            {/* Key Profitability KPIs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem'
            }}>
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.85rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                  {isAr ? 'هامش الربح الإجمالي (Margin %):' : 'Gross Margin %:'}
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803d' }}>
                  {builtPricing.grossMarginPct}%
                </span>
              </div>

              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.85rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                  {isAr ? 'العائد على التكلفة (ROI %):' : 'Return on Cost %:'}
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#946f23' }}>
                  {builtPricing.returnOnCostPct}%
                </span>
              </div>
            </div>

            {/* Existing Catalog Price Comparison */}
            {selectedProperty && (
              <div style={{
                padding: '0.75rem 0.95rem',
                borderRadius: '10px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>{isAr ? 'سعر القائمة الحالي في الكتالوج:' : 'Current Catalog Price:'}</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{formatEGP(selectedProperty.price_egp)} ج.م</span>
                </div>
                <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                  <span style={{ color: '#64748b', display: 'block' }}>{isAr ? 'الفارق مع السعر التقديري:' : 'Variance vs Estimated:'}</span>
                  <span style={{
                    fontWeight: 800,
                    color: D(builtPricing.estimatedSellingPrice).gte(selectedProperty.price_egp || 0) ? '#15803d' : '#dc2626'
                  }}>
                    {D(builtPricing.estimatedSellingPrice).minus(selectedProperty.price_egp || 0).gt(0) ? '+' : ''}
                    {formatEGP(D(builtPricing.estimatedSellingPrice).minus(selectedProperty.price_egp || 0).toFixed(2))} ج.م
                  </span>
                </div>
              </div>
            )}

            {/* Commit / Update Selling Price CTA */}
            {onUpdateSellingPrice && selectedProperty && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
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
                    padding: '0.85rem',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: isUpdatingPrice ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 14px rgba(197, 160, 89, 0.35)',
                    transition: 'all 0.2s ease',
                    opacity: isUpdatingPrice ? 0.7 : 1
                  }}
                >
                  {priceUpdateSuccess ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>{isAr ? 'تم تحديث السعر في الكتالوج بنجاح!' : 'Catalog Price Updated!'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>
                        {isUpdatingPrice 
                          ? (isAr ? 'جاري الحفظ بالكتالوج...' : 'Saving...') 
                          : (isAr ? 'اعتماد وحفظ السعر التقديري في كتالوج العقارات' : 'Save & Update Property Catalog Price')}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

          </div>

          {/* BUILDING WHOLE VS INDIVIDUAL APARTMENTS STUDIO */}
          {isSelectedBuilding && buildingUnitsPricing && (
            <div style={{
              gridColumn: '1 / -1',
              background: '#ffffff',
              border: '1px solid rgba(184, 144, 62, 0.3)',
              borderRadius: '16px',
              padding: '1.35rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
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
                      {isAr ? 'استوديو تسعير وحدات وشقق العمارة (Wholesale vs Retail Units)' : 'Building Wholesale vs Retail Units Pricing Studio'}
                    </h4>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {isAr ? 'توزيع التكلفة الإجمالية المنفقة على شقق العمارة واحتساب أرباح التجزئة' : 'Apportion total incurred construction costs across individual apartments'}
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
                    {isAr ? '🏢 بيع العمارة بالكامل' : 'Whole Building'}
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
                    {isAr ? '🚪 بيع شقق منفصلة' : 'Individual Units'}
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
                    {buildingUnitsPricing.totalUnits} {isAr ? 'شقق سكنية' : 'Apartments'}
                  </span>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                    {isAr ? 'إجمالي إيرادات بيع الشقق (تجزئة):' : 'Total Retail Revenue:'}
                  </span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#946f23' }}>
                    {formatEGP(buildingUnitsPricing.totalRetailRevenue)} ج.م
                  </span>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                    {isAr ? 'الفارق والربح الإضافي للتجزئة:' : 'Retail Profit Uplift:'}
                  </span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#15803d' }}>
                    +{formatEGP(buildingUnitsPricing.retailVsWholeUplift)} ج.م (+{buildingUnitsPricing.retailVsWholeUpliftPct}%)
                  </span>
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
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'نصيب البناء العام' : 'General Cost'}</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'ضرائب ورسوم البناء للشقة' : 'Unit Taxes/Fees'}</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'إجمالي تكلفة الشقة' : 'Total Unit Cost'}</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'سعر البيع المقترح' : 'Suggested Price'}</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'سعر المتر' : 'Price / m²'}</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'الهامش' : 'Margin'}</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildingUnitsPricing.units.map((u, idx) => (
                      <tr key={u.unit_id || idx} style={{ borderTop: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800, color: '#0f172a' }}>{u.unit_number}</td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#475569' }}>{isAr ? `الدور ${u.floor}` : `Floor ${u.floor}`}</td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#475569' }}>{u.area_sqm} م²</td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#d97706', fontWeight: 700 }}>{formatEGP(u.apportionedCost)} ج.م</td>
                        <td style={{ padding: '0.65rem 0.85rem', color: u.unitTaxesPaid > 0 ? '#946f23' : '#64748b', fontWeight: 700 }}>
                          {u.unitTaxesPaid > 0 ? `${formatEGP(u.unitTaxesPaid)} ج.م` : (isAr ? '٠ ج.م' : '0 EGP')}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#0f172a', fontWeight: 800 }}>{formatEGP(u.totalApartmentCost)} ج.م</td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#946f23', fontWeight: 900 }}>{formatEGP(u.suggestedPrice)} ج.م</td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>{formatEGP(u.pricePerSqm)} ج.م</td>
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
                            {u.status === 'contracted' ? (isAr ? 'مُتعاقد عليها' : 'Contracted') : (isAr ? 'متاحة للبيع' : 'Available')}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          
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
                <span>{isAr ? 'معايير العقار ومواصفات البناء' : 'Building Specs & Parameters'}</span>
              </span>
            </div>

            {/* Quick Property Selector */}
            {properties.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '0.35rem', fontWeight: 700 }}>
                  {isAr ? 'تحميل بيانات عقار من الكتالوج (اختياري):' : 'Pre-fill from Existing Property:'}
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
                  <option value="">{isAr ? '-- إدخال مواصفات حرة جديدة --' : '-- Custom Specifications --'}</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {isAr ? p.title_ar : p.title_en} ({p.area_sqm} م²)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Built-up Area & Floors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '0.35rem', fontWeight: 700 }}>
                  {isAr ? 'المساحة المبنية الإجمالية (م²):' : 'Built-up Area (sqm):'}
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
                  {isAr ? 'عدد الأدوار المتكررة:' : 'Floors Count:'}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
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
                {isAr ? 'مستوى التشطيب المعماري المطلوب:' : 'Finishing Quality Tier:'}
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
                {isAr ? 'أسعار الخامات في السوق المصري (قابلة للتعديل):' : 'Egyptian Market Material Rates:'}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>
                    {isAr ? 'طن حديد التسليح (ج.م):' : 'Steel / Ton (EGP):'}
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
                    {isAr ? 'م³ خرسانة جاهزة (ج.م):' : 'Concrete / m³ (EGP):'}
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
                {isAr ? 'سعر البيع المستهدف للمتر (ج.م/م²):' : 'Target Selling Price / sqm:'}
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
                <span>{isAr ? 'المؤشرات الهندسية والمالية التقديرية' : 'Engineering Quantities & Financial Feasibility'}</span>
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
                {isAr ? 'حجوم الخامات الأساسية المقدرة:' : 'Estimated Structural Materials:'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>{isAr ? 'أطنان حديد التسليح (B500D):' : 'Steel Rebar:'}</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>
                  {feasibilityCalculations.steelTons} {isAr ? 'طن' : 'Tons'} ({formatEGP(feasibilityCalculations.totalSteelCost)} ج.م)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>{isAr ? 'خرسانة مسلحة رتبة C35:' : 'Ready-mix Concrete C35:'}</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>
                  {feasibilityCalculations.concreteVolumeM3} {isAr ? 'م³' : 'm³'} ({formatEGP(feasibilityCalculations.totalConcreteCost)} ج.م)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>{isAr ? 'أجور مصنعيات الهيكل الإنشائي:' : 'Skeleton Labor:'}</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{formatEGP(feasibilityCalculations.totalLaborCost)} ج.م</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>{isAr ? 'تأسيس الكهروميكانيك (MEP):' : 'MEP Infrastructure:'}</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{formatEGP(feasibilityCalculations.totalMepCost)} ج.م</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>{isAr ? 'التشطيبات المعمارية المختارة:' : 'Architectural Finishing:'}</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{formatEGP(feasibilityCalculations.totalFinishingCost)} ج.م</span>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800 }}>
                <span style={{ color: '#946f23' }}>{isAr ? 'إجمالي تكلفة البناء والتشييد (WIP):' : 'Total Construction (WIP):'}</span>
                <span style={{ color: '#946f23' }}>{formatEGP(feasibilityCalculations.totalConstructionWip)} ج.م</span>
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
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                  {formatEGP(feasibilityCalculations.grandCostPerSqm)} ج.م
                </span>
              </div>

              <div style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '10px',
                padding: '0.85rem'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#15803d', display: 'block', fontWeight: 700 }}>
                  {isAr ? 'العائد على الاستثمار المتوقع (ROI):' : 'Developer ROI %:'}
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
                  {isAr ? 'إجمالي المبيعات المستهدفة:' : 'Projected Sales:'}
                </span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>
                  {formatEGP(feasibilityCalculations.projectedGrossRevenue)} ج.م
                </span>
              </div>

              <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                <span style={{ color: '#15803d', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>
                  {isAr ? 'صافي الربح المتوقع للمطور:' : 'Projected Net Profit:'}
                </span>
                <span style={{ fontWeight: 900, color: '#15803d', fontSize: '0.95rem' }}>
                  +{formatEGP(feasibilityCalculations.projectedNetProfit)} ج.م
                </span>
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
                <span>{isAr ? 'اعتماد هذه الحسابات كميزانية تقديرية للعقار المحدد بالدفاتر' : 'Commit as Approved WIP Budget Ceiling for Property'}</span>
              </button>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
