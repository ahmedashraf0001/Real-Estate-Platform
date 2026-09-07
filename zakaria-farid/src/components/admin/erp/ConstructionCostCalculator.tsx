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
  Building,
  Home,
  FileText,
  Percent,
  Coins,
  SlidersHorizontal,
  Scale,
  PieChart,
  Search,
  Check,
  Filter,
  MapPin,
  Info,
  Clock,
  CheckSquare,
  DoorOpen,
  Plus,
  Printer
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
import styles from './v2/ZFWorkstationShell.module.css';

export interface ConstructionCostCalculatorProps {
  properties: Property[];
  propertyCosts?: ERPPropertyCostItem[];
  onApplyBudgetToProperty?: (propertyId: string, budgetAmount: string) => void;
  onUpdateSellingPrice?: (propertyId: string, newPriceEgp: number) => Promise<void>;
  onOpenAuditForProperty?: (property: Property) => void;
  onOpenContractForProperty?: (property: Property, unit?: BuildingUnitItem) => void;
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
  onApplyBudgetToProperty,
  onUpdateSellingPrice,
  onOpenAuditForProperty,
  onOpenContractForProperty,
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

  // Compact currency formatter for space-constrained UI elements (abbreviating millions and thousands in clean Egyptian Arabic)
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

  // Pricing Scope: Entire Property/Building vs Specific Individual Apartment
  const [pricingScope, setPricingScope] = useState<'whole' | 'apartment'>('whole');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  // Building Wholesale vs Retail Units Pricing Mode (in Strategy Studio)
  const [buildingPricingMode, setBuildingPricingMode] = useState<'whole' | 'units'>('whole');

  const isSelectedBuilding = useMemo(() => {
    if (!selectedProperty) return false;
    const title = (selectedProperty.title_ar || selectedProperty.title_en || '').toLowerCase();
    return selectedProperty.type === 'building' || title.includes('عمارة') || title.includes('building');
  }, [selectedProperty]);

  // Sync market meter price and unit selection when property changes
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

      const targetProfit = profitMode === 'PERCENTAGE'
        ? (totalApartmentCost * (targetProfitPercent / 100))
        : (parseFloat(targetProfitCashAmount || '0') / totalUnits);
      
      // Commercial retail adjustment: floors 2, 3 get +5% prime floor premium, ground/roof get standard
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

  // Active unit pricing when specific individual apartment scope is selected
  const activeUnit = useMemo(() => {
    if (!buildingUnitsPricing?.units || pricingScope !== 'apartment') return null;
    const found = buildingUnitsPricing.units.find(u => u.unit_id === selectedUnitId);
    return found || buildingUnitsPricing.units[0] || null;
  }, [buildingUnitsPricing, pricingScope, selectedUnitId]);

  // Property select items for ZFCustomSelect
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
        badgeColor: isReady ? '#15803d' : '#946f23',
        badgeBg: isReady ? 'rgba(21, 128, 61, 0.12)' : 'rgba(148, 111, 35, 0.12)',
        badgeTextColor: isReady ? '#15803d' : '#946f23',
        icon: Building2,
        iconColor: '#946f23',
        iconBg: 'rgba(184, 144, 62, 0.1)'
      };
    });
  }, [properties, isAr]);

  // Cost composition breakdown for multi-segment visual progress bar
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

  // Retail Units search and status filter state
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
      setTimeout(() => setPriceUpdateSuccess(false), 4000);
    } catch (e) {
      console.error('Failed to update property price:', e);
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Export Built Pricing Excel
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
  // MODE 2: PRE-CONSTRUCTION FEASIBILITY STATE & LOGIC (8 Canonical Categories)
  // =========================================================================
  const [constructionType, setConstructionType] = useState<PropertyConstructionType>('apartment_standard');
  const [builtUpAreaSqm, setBuiltUpAreaSqm] = useState<number>(160);
  const [floorsCount, setFloorsCount] = useState<number>(5);
  const [landAreaSqm, setLandAreaSqm] = useState<number>(300);
  const [landPricePerSqm, setLandPricePerSqm] = useState<number>(12000);
  const [finishingTier, setFinishingTier] = useState<FinishingTier>('semi_finished');
  const [customFinishingCostPerSqm, setCustomFinishingCostPerSqm] = useState<number>(6500);

  // Market Material Prices & Direct Category Rates (All 8 Canonical Categories)
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

    // 1. Civil Structure (خرسانات وهيكل إنشائي - حديد تسليح وخرسانة مسلحة)
    const steelTons = (area * 0.11);
    const totalSteelCost = steelTons * steelPricePerTon;
    const concreteVolumeM3 = (area * 0.42);
    const totalConcreteCost = concreteVolumeM3 * concretePricePerM3;
    const totalCivilStructureCost = totalSteelCost + totalConcreteCost;
    const civilStructureCostPerSqm = totalCivilStructureCost / area;

    // 2. Labor & Subcontractors (مصنعيات ومقاول باطن - بناء وصب وعظم)
    const totalLaborCost = area * laborCostPerSqm;
    const laborCostPerSqmEffective = laborCostPerSqm;

    // 3. MEP Infrastructure (كهروميكانيك وتأسيسات - سباكة وكهرباء وصواعد)
    const totalMepCost = area * mepCostPerSqm;
    const mepCostPerSqmEffective = mepCostPerSqm;

    // 4. Finishing & Interiors (تشطيبات معمارية وديكور)
    const effectiveFinishingCostPerSqm = finishingTier === 'custom' 
      ? customFinishingCostPerSqm 
      : FINISHING_TIER_COSTS[finishingTier].costPerSqm;
    const totalFinishingCost = area * effectiveFinishingCostPerSqm;

    // 5. Façade, Entrances & Elevator (واجهات ومداخل ومصاعد)
    const effectiveElevatorCost = (includeElevator && floorsCount >= 2) ? elevatorCost : 0;
    const totalFacadeLandscapeCost = area * facadeCostPerSqm;
    const totalSiteFacadeCost = totalFacadeLandscapeCost + effectiveElevatorCost;
    const siteFacadeCostPerSqm = totalSiteFacadeCost / area;

    // 6. Permits & Engineering (تراخيص ومخططات واستشارات هندسية وجسات)
    const totalPermitsCost = area * permitsCostPerSqm;
    const permitsCostPerSqmEffective = permitsCostPerSqm;

    // 7. Taxes & Levies (ضرائب ورسوم إنشائية وحكومية وتأمينات مقاولات)
    const totalTaxesFeesCost = area * taxesFeesCostPerSqm;
    const taxesFeesCostPerSqmEffective = taxesFeesCostPerSqm;

    // Total Construction WIP (إجمالي تكلفة المباني والإنشاءات - الـ 7 بنود الإنشائية)
    const totalConstructionWip = 
      totalCivilStructureCost + 
      totalLaborCost + 
      totalMepCost + 
      totalFinishingCost + 
      totalSiteFacadeCost + 
      totalPermitsCost + 
      totalTaxesFeesCost;
    const constructionCostPerSqm = totalConstructionWip / area;

    // 8. Land Cost Allocation (حصة وتكلفة الأرض المحملة)
    const totalLandCost = landAreaSqm * landPricePerSqm;
    const landCostPerBuiltSqm = totalLandCost / area;

    // Grand Total Investment (إجمالي استثمار وتكلفة المشروع بالكامل - أرض + مباني)
    const grandProjectCost = totalConstructionWip + totalLandCost;
    const grandCostPerSqm = grandProjectCost / area;

    // Projections & Margins
    const projectedGrossRevenue = area * targetSalePricePerSqm;
    const projectedNetProfit = projectedGrossRevenue - grandProjectCost;
    const developerMarginPercent = grandProjectCost > 0 
      ? (projectedNetProfit / grandProjectCost) * 100 
      : 0;

    // 8 Canonical Categories Breakdown for visual rendering
    const categoryBreakdown = [
      {
        key: 'civil_structure',
        nameAr: 'خرسانات وهيكل إنشائي (حديد وخراسانة)',
        nameEn: 'Civil & Structure',
        color: '#c2410c',
        total: totalCivilStructureCost,
        costPerSqm: civilStructureCostPerSqm,
        percentOfTotal: grandProjectCost > 0 ? (totalCivilStructureCost / grandProjectCost) * 100 : 0
      },
      {
        key: 'labor_subcontractor',
        nameAr: 'مصنعيات ومقاول باطن (بناء وصب)',
        nameEn: 'Labor & Subcontractor',
        color: '#047857',
        total: totalLaborCost,
        costPerSqm: laborCostPerSqmEffective,
        percentOfTotal: grandProjectCost > 0 ? (totalLaborCost / grandProjectCost) * 100 : 0
      },
      {
        key: 'mep_infrastructure',
        nameAr: 'كهروميكانيك وتأسيسات (سباكة وكهرباء)',
        nameEn: 'MEP Infrastructure',
        color: '#1d4ed8',
        total: totalMepCost,
        costPerSqm: mepCostPerSqmEffective,
        percentOfTotal: grandProjectCost > 0 ? (totalMepCost / grandProjectCost) * 100 : 0
      },
      {
        key: 'finishing_interior',
        nameAr: `تشطيبات معمارية وديكور (${finishingTier === 'custom' ? 'مخصص يدوي' : FINISHING_TIER_COSTS[finishingTier].labelAr})`,
        nameEn: 'Finishing & Interiors',
        color: '#701a75',
        total: totalFinishingCost,
        costPerSqm: effectiveFinishingCostPerSqm,
        percentOfTotal: grandProjectCost > 0 ? (totalFinishingCost / grandProjectCost) * 100 : 0
      },
      {
        key: 'site_facade',
        nameAr: 'واجهات ومداخل ومصاعد',
        nameEn: 'Façade & Vertical Access',
        color: '#4338ca',
        total: totalSiteFacadeCost,
        costPerSqm: siteFacadeCostPerSqm,
        percentOfTotal: grandProjectCost > 0 ? (totalSiteFacadeCost / grandProjectCost) * 100 : 0
      },
      {
        key: 'permits_engineering',
        nameAr: 'تراخيص ومخططات واستشارات هندسية',
        nameEn: 'Permits & Engineering',
        color: '#946f23',
        total: totalPermitsCost,
        costPerSqm: permitsCostPerSqmEffective,
        percentOfTotal: grandProjectCost > 0 ? (totalPermitsCost / grandProjectCost) * 100 : 0
      },
      {
        key: 'taxes_fees',
        nameAr: 'ضرائب ورسوم إنشائية وتأمينات مقاولات',
        nameEn: 'Taxes, Levies & Insurance',
        color: '#475569',
        total: totalTaxesFeesCost,
        costPerSqm: taxesFeesCostPerSqmEffective,
        percentOfTotal: grandProjectCost > 0 ? (totalTaxesFeesCost / grandProjectCost) * 100 : 0
      },
      {
        key: 'land_allocation',
        nameAr: 'حصة وتكلفة الأرض المحملة',
        nameEn: 'Land Cost Allocation',
        color: '#92400e',
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

      toast.success(isAr ? 'تم تصدير دراسة جدوى المشروع بنجاح إلى Excel مع المخططات' : 'Feasibility study exported to Excel');
    } catch (e) {
      toast.error(isAr ? 'حدث خطأ أثناء تصدير الملف' : 'Export failed');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const printableFeasibilityBody = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', direction: isAr ? 'rtl' : 'ltr' }}>
      {/* 1. KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.75rem',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '1rem',
        background: '#f8fafc'
      }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
            {isAr ? 'إجمالي استثمار وتكلفة المشروع' : 'Total Investment'}
          </span>
          <strong style={{ fontSize: '1.15rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            {D(feasibilityCalculations.grandProjectCost).formatEGP(isAr)}
          </strong>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
            {isAr ? 'تكلفة المتر الشاملة' : 'Cost per Built Sqm'}
          </span>
          <strong style={{ fontSize: '1.1rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            {D(feasibilityCalculations.grandCostPerSqm).formatEGP(isAr)}
          </strong>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
            {isAr ? 'إجمالي المبيعات المستهدفة' : 'Target Gross Revenue'}
          </span>
          <strong style={{ fontSize: '1.15rem', color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
            {D(feasibilityCalculations.projectedGrossRevenue).formatEGP(isAr)}
          </strong>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
            {isAr ? 'صافي الربح المتوقع (ROI)' : 'Net Profit (ROI %)'}
          </span>
          <strong style={{ fontSize: '1.15rem', color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
            {D(feasibilityCalculations.projectedNetProfit).formatEGP(isAr)} ({feasibilityCalculations.developerMarginPercent}%)
          </strong>
        </div>
      </div>

      {/* 2. Specs */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}>
        <tbody>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '0.6rem 0.85rem', fontWeight: 700, width: '25%' }}>{isAr ? 'مساحة المباني:' : 'Built-up Area:'}</td>
            <td style={{ padding: '0.6rem 0.85rem', fontWeight: 800 }}>{builtUpAreaSqm} م² ({floorsCount} أدوار)</td>
            <td style={{ padding: '0.6rem 0.85rem', fontWeight: 700, width: '25%' }}>{isAr ? 'مساحة الأرض وسعر المتر:' : 'Land Specs:'}</td>
            <td style={{ padding: '0.6rem 0.85rem', fontWeight: 800 }}>{landAreaSqm} م² @ {D(landPricePerSqm).formatEGP(isAr)}/م²</td>
          </tr>
          <tr>
            <td style={{ padding: '0.6rem 0.85rem', fontWeight: 700 }}>{isAr ? 'مستوى التشطيب:' : 'Finishing Tier:'}</td>
            <td style={{ padding: '0.6rem 0.85rem', color: '#946f23', fontWeight: 800 }}>
              {finishingTier === 'custom' ? `مخصص (${customFinishingCostPerSqm} ج.م/م²)` : FINISHING_TIER_COSTS[finishingTier].labelAr}
            </td>
            <td style={{ padding: '0.6rem 0.85rem', fontWeight: 700 }}>{isAr ? 'سعر بيع المتر المستهدف:' : 'Target Price / sqm:'}</td>
            <td style={{ padding: '0.6rem 0.85rem', color: '#059669', fontWeight: 800 }}>{D(targetSalePricePerSqm).formatEGP(isAr)}/م²</td>
          </tr>
        </tbody>
      </table>

      {/* 3. 8 Categories Breakdown */}
      <div>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
          {isAr ? 'تفصيل بنود التكاليف المباشرة الـ 8 المعتمدة' : '8 Canonical Cost Categories Breakdown'}
        </h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '0.5rem', textAlign: 'center', width: '5%' }}>#</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'بند التكلفة' : 'Cost Category'}</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', width: '22%' }}>{isAr ? 'معدل المتر (ج.م/م²)' : 'Rate / sqm'}</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', width: '25%' }}>{isAr ? 'إجمالي التكلفة (ج.م)' : 'Total Cost'}</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', width: '15%' }}>{isAr ? 'النسبة' : '% of Total'}</th>
            </tr>
          </thead>
          <tbody>
            {feasibilityCalculations.categoryBreakdown.map((c, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                <td style={{ padding: '0.5rem', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#0f172a' }}>{isAr ? c.nameAr : c.nameEn}</td>
                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#334155' }}>{D(c.costPerSqm).formatEGP(isAr)}</td>
                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{D(c.total).formatEGP(isAr)}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700, color: '#946f23' }}>{c.percentOfTotal.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f1f5f9', borderTop: '2px solid #0f172a', fontWeight: 800 }}>
              <td colSpan={2} style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'إجمالي تكلفة واستثمار المشروع بالكامل' : 'Grand Total Project Investment'}</td>
              <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>{D(feasibilityCalculations.grandCostPerSqm).formatEGP(isAr)}</td>
              <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#0f172a' }}>{D(feasibilityCalculations.grandProjectCost).formatEGP(isAr)}</td>
              <td style={{ padding: '0.65rem', textAlign: 'center' }}>100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  const printableBuiltPricingBody = selectedProperty ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', direction: isAr ? 'rtl' : 'ltr' }}>
      {/* 1. KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.75rem',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '1rem',
        background: '#f8fafc'
      }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
            {isAr ? 'إجمالي المصاريف المسجلة' : 'Total Incurred Costs'}
          </span>
          <strong style={{ fontSize: '1.15rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            {D(builtPricing.totalLoggedCost).formatEGP(isAr)}
          </strong>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
            {isAr ? 'تكلفة المتر الفعلي' : 'Actual Cost per Sqm'}
          </span>
          <strong style={{ fontSize: '1.1rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            {D(builtPricing.costPerSqm).formatEGP(isAr)}
          </strong>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
            {isAr ? 'سعر البيع المقترح' : 'Estimated Selling Price'}
          </span>
          <strong style={{ fontSize: '1.15rem', color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
            {D(builtPricing.estimatedSellingPrice).formatEGP(isAr)}
          </strong>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
            {isAr ? 'صافي المكسب المستهدف' : 'Target Profit (ROI %)'}
          </span>
          <strong style={{ fontSize: '1.15rem', color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
            {D(builtPricing.targetProfitMoney).formatEGP(isAr)} ({builtPricing.returnOnCostPct}%)
          </strong>
        </div>
      </div>

      {/* 2. Property Dossier */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}>
        <tbody>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '0.6rem 0.85rem', fontWeight: 700, width: '25%' }}>{isAr ? 'اسم العقار والمشروع:' : 'Property:'}</td>
            <td style={{ padding: '0.6rem 0.85rem', fontWeight: 800 }}>{isAr ? selectedProperty.title_ar : selectedProperty.title_en}</td>
            <td style={{ padding: '0.6rem 0.85rem', fontWeight: 700, width: '25%' }}>{isAr ? 'الموقع والمساحة:' : 'Location & Area:'}</td>
            <td style={{ padding: '0.6rem 0.85rem', fontWeight: 800 }}>{selectedProperty.location} • {selectedProperty.area_sqm} م²</td>
          </tr>
          <tr>
            <td style={{ padding: '0.6rem 0.85rem', fontWeight: 700 }}>{isAr ? 'سعر المتر في السوق اليومين دول:' : 'Market Benchmark:'}</td>
            <td style={{ padding: '0.6rem 0.85rem', fontWeight: 800, color: '#0284c7' }}>{D(marketMeterPrice).formatEGP(isAr)}/م²</td>
            <td style={{ padding: '0.6rem 0.85rem', fontWeight: 700 }}>{isAr ? 'سعر بيع المتر المقترح:' : 'Estimated Price / sqm:'}</td>
            <td style={{ padding: '0.6rem 0.85rem', fontWeight: 800, color: '#059669' }}>{D(builtPricing.estimatedSellingPricePerSqm).formatEGP(isAr)}/م²</td>
          </tr>
        </tbody>
      </table>

      {/* 3. Incurred Category Breakdown */}
      <div>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
          {isAr ? 'تفصيل مصاريف المباني المسجلة بدفاتر الشركة' : 'Incurred Cost Categories Breakdown'}
        </h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '0.5rem', textAlign: 'center', width: '5%' }}>#</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'بند المصروف' : 'Cost Category'}</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', width: '25%' }}>{isAr ? 'المبلغ المنصرف (ج.م)' : 'Incurred (EGP)'}</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', width: '15%' }}>{isAr ? 'النسبة' : '% of Total'}</th>
            </tr>
          </thead>
          <tbody>
            {costComposition.map((c, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                <td style={{ padding: '0.5rem', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#0f172a' }}>{isAr ? c.nameAr : c.nameEn}</td>
                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{D(c.amount).formatEGP(isAr)}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700, color: '#946f23' }}>{c.pct}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f1f5f9', borderTop: '2px solid #0f172a', fontWeight: 800 }}>
              <td colSpan={2} style={{ padding: '0.65rem 0.85rem' }}>{isAr ? 'إجمالي مصاريف المباني المسجلة' : 'Total Incurred Construction Costs'}</td>
              <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#0f172a' }}>{D(builtPricing.totalLoggedCost).formatEGP(isAr)}</td>
              <td style={{ padding: '0.65rem', textAlign: 'center' }}>100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  ) : null;

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
            disabled={isExportingExcel}
            style={{
              background: '#ffffff',
              color: '#15803d',
              border: '1px solid rgba(22, 163, 74, 0.3)',
              borderRadius: '9px',
              padding: '0.45rem 0.85rem',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: isExportingExcel ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease'
            }}
            title={isAr ? 'تصدير دراسة الجدوى والتسعير بالكامل إلى Excel' : 'Export Study to Excel'}
          >
            <FileSpreadsheet size={15} color="#15803d" />
            <span>{isExportingExcel ? (isAr ? 'جاري التصدير...' : 'Exporting...') : (isAr ? 'تصدير شيت Excel' : 'Export')}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '9px',
              padding: '0.45rem 0.85rem',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease'
            }}
            title={isAr ? 'طباعة دراسة الجدوى المعتمدة' : 'Print Study'}
          >
            <Printer size={15} />
            <span>{isAr ? 'طباعة الدراسة' : 'Print'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintPreview(true)}
            style={{
              background: 'rgba(184, 144, 62, 0.08)',
              color: '#946f23',
              border: '1px solid rgba(184, 144, 62, 0.25)',
              borderRadius: '9px',
              padding: '0.45rem 0.75rem',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
            title={isAr ? 'معاينة المستند الرسمي قبل الطباعة' : 'Preview Document'}
          >
            <FileText size={15} />
            <span>{isAr ? 'معاينة' : 'Preview'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: ACTUAL BUILT PROPERTY PRICING                                     */}
      {/* ========================================================================= */}
      {calculatorMode === 'BUILT_PROPERTY_PRICING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* 1. WORKFLOW ROADMAP BANNER */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '0.9rem 1.35rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(184, 144, 62, 0.1)',
                color: '#946f23',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <SlidersHorizontal size={16} />
              </div>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                  {isAr ? 'دليل تسعير العقار في ۳ خطوات متتالية:' : '3-Step Valuation Roadmap:'}
                </span>
                <span style={{ fontSize: '0.71rem', color: '#64748b' }}>
                  {isAr ? 'من واقع الفواتير الفعلية إلى تسعير الشقق واعتماد السعر' : 'From audited logged expenses to final apartment pricing and approval'}
                </span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              flexWrap: 'wrap'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '0.35rem 0.7rem',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}>
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#946f23',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.7rem'
                }}>1</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {isAr ? 'اختيار العقار وحصر المصاريف' : 'Select Property & Audit Costs'}
                </span>
              </div>

              <div style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>{isAr ? '←' : '→'}</div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '0.35rem 0.7rem',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}>
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#1d4ed8',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.7rem'
                }}>2</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {isAr ? 'تحديد سعر السوق ونسبة المكسب' : 'Set Benchmark & Target Margin'}
                </span>
              </div>

              <div style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>{isAr ? '←' : '→'}</div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '0.35rem 0.7rem',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}>
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#15803d',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.7rem'
                }}>3</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {isAr ? 'اعتماد السعر واختيار استراتيجية البيع' : 'Approve Price & Strategy'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. PROPERTY DOSSIER SELECTION BAR */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.25rem 1.4rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: 'rgba(184, 144, 62, 0.1)',
                  color: '#946f23',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Building2 size={16} />
                </div>
                <div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                    {isAr ? 'اختيار العمارة أو العقار المستهدف للتسعير' : 'Target Property for Valuation'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>
                    {isAr ? 'اختر المشروع لسحب جميع الفواتير والمصاريف الفعلية المحملة على حسابه' : 'Select property to ingest audited WIP invoices and expense history'}
                  </span>
                </div>
              </div>

              {selectedProperty && onOpenAuditForProperty && (
                <button
                  type="button"
                  onClick={() => onOpenAuditForProperty(selectedProperty)}
                  style={{
                    background: 'rgba(184, 144, 62, 0.08)',
                    border: '1px solid rgba(184, 144, 62, 0.28)',
                    color: '#946f23',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    padding: '0.45rem 0.85rem',
                    borderRadius: '9px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <FileText size={14} />
                  <span>{isAr ? 'عرض فواتير ومصاريف العقار بالتفصيل' : 'Open Incurred Cost Audit Dossier'}</span>
                </button>
              )}
            </div>

            {/* ZFCustomSelect Integration & Live Telemetry */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) auto', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  {isAr ? 'العمارة أو المشروع المستهدف:' : 'Target Property:'}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', paddingBottom: '2px' }}>
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '0.5rem 0.8rem',
                    borderRadius: '9px',
                    fontSize: '0.76rem',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <span style={{ color: '#64748b' }}>{isAr ? 'المساحة المبنية:' : 'Built Area:'}</span>
                    <strong style={{ color: '#0f172a' }}>{selectedProperty.area_sqm} م²</strong>
                  </div>

                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '0.5rem 0.8rem',
                    borderRadius: '9px',
                    fontSize: '0.76rem',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <MapPin size={13} color="#64748b" />
                    <strong style={{ color: '#0f172a' }}>{selectedProperty.location || (isAr ? 'الشرقية' : 'Sharkia')}</strong>
                  </div>

                  <div style={{
                    background: 'rgba(21, 128, 61, 0.08)',
                    border: '1px solid rgba(21, 128, 61, 0.25)',
                    padding: '0.5rem 0.8rem',
                    borderRadius: '9px',
                    fontSize: '0.76rem',
                    color: '#15803d',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <CheckCircle2 size={14} color="#15803d" />
                    <span>{propertyAudit.itemsCount} {isAr ? 'فاتورة وبند معتمد' : 'audited cost items'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Scope Selector: Whole Building vs Specific Apartment */}
            {isSelectedBuilding && buildingUnitsPricing && buildingUnitsPricing.units.length > 0 && (
              <div style={{
                marginTop: '1rem',
                padding: '0.85rem 1rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <SlidersHorizontal size={15} color="#946f23" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                      {isAr ? 'نطاق الحساب والتسعير المطلوب:' : 'Pricing Scope Target:'}
                    </span>
                  </div>

                  {/* Segmented Switch */}
                  <div style={{
                    display: 'inline-flex',
                    background: '#e2e8f0',
                    padding: '3px',
                    borderRadius: '8px',
                    gap: '3px'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setPricingScope('whole');
                        setBuildingPricingMode('whole');
                      }}
                      style={{
                        background: pricingScope === 'whole' ? '#ffffff' : 'transparent',
                        color: pricingScope === 'whole' ? '#946f23' : '#475569',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.74rem',
                        fontWeight: pricingScope === 'whole' ? 800 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: pricingScope === 'whole' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Building size={14} />
                      <span>{isAr ? 'العمارة بالكامل (شروة واحدة)' : 'Entire Building (Wholesale)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPricingScope('apartment');
                        setBuildingPricingMode('units');
                        if (!selectedUnitId && buildingUnitsPricing.units.length > 0) {
                          setSelectedUnitId(buildingUnitsPricing.units[0].unit_id);
                        }
                      }}
                      style={{
                        background: pricingScope === 'apartment' ? '#ffffff' : 'transparent',
                        color: pricingScope === 'apartment' ? '#946f23' : '#475569',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.74rem',
                        fontWeight: pricingScope === 'apartment' ? 800 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: pricingScope === 'apartment' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <DoorOpen size={14} />
                      <span>{isAr ? 'تسعير شقة محددة بالعمارة' : 'Specific Apartment'}</span>
                    </button>
                  </div>
                </div>

                {/* If apartment scope: Interactive horizontal scrollable apartment picker chips */}
                {pricingScope === 'apartment' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    overflowX: 'auto',
                    paddingTop: '0.2rem',
                    paddingBottom: '0.35rem'
                  }}>
                    <span style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 700, flexShrink: 0 }}>
                      {isAr ? 'اختر الشقة للمعاينة والتسعير:' : 'Select Apartment:'}
                    </span>
                    {buildingUnitsPricing.units.map(u => {
                      const isSelected = (activeUnit?.unit_id === u.unit_id);
                      const isContracted = u.status === 'contracted';
                      return (
                        <button
                          key={u.unit_id}
                          type="button"
                          onClick={() => setSelectedUnitId(u.unit_id)}
                          style={{
                            background: isSelected ? '#946f23' : '#ffffff',
                            color: isSelected ? '#ffffff' : '#0f172a',
                            border: isSelected ? '1.5px solid #946f23' : '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 2px 8px rgba(148, 111, 35, 0.28)' : 'none'
                          }}
                        >
                          <DoorOpen size={13} color={isSelected ? '#ffffff' : '#946f23'} />
                          <span>{isAr ? `شقة ${u.unit_number}` : `Unit ${u.unit_number}`}</span>
                          <span style={{
                            fontSize: '0.66rem',
                            opacity: isSelected ? 0.9 : 0.65
                          }}>
                            ({u.area_sqm} م² • {isAr ? `دور ${u.floor}` : `F${u.floor}`})
                          </span>
                          {isContracted && (
                            <span style={{
                              fontSize: '0.6rem',
                              padding: '0.05rem 0.3rem',
                              borderRadius: '4px',
                              background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(21, 128, 61, 0.1)',
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

          {/* 3. VISUALIZATION DECK: COST COMPOSITION & PRICE ANATOMY */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
            gap: '1.25rem'
          }}>
            {/* VISUALIZATION 1: CAPITAL COST COMPOSITION MULTI-SEGMENT BAR */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.25rem 1.35rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <PieChart size={16} color="#946f23" />
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                    {isAr ? 'مخطط تشريح مصاريف المبنى الإجمالية' : 'Incurred Cost Composition'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                  {renderMoney(propertyAudit.totalLoggedCost)}
                </div>
              </div>

              {costComposition.length > 0 ? (
                <>
                  {/* Multi-Segment Stacked Progress Bar */}
                  <div style={{
                    width: '100%',
                    height: '14px',
                    borderRadius: '7px',
                    background: '#f1f5f9',
                    overflow: 'hidden',
                    display: 'flex',
                    border: '1px solid #e2e8f0'
                  }}>
                    {costComposition.map((c) => (
                      <div
                        key={c.key}
                        title={`${isAr ? c.nameAr : c.nameEn}: ${c.pct}% (${renderMoney(c.amount)})`}
                        style={{
                          width: `${c.rawPct}%`,
                          background: c.color,
                          transition: 'width 0.4s ease'
                        }}
                      />
                    ))}
                  </div>

                  {/* Legend Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: '0.5rem',
                    marginTop: '0.35rem'
                  }}>
                    {costComposition.map((c) => (
                      <div
                        key={c.key}
                        title={`${isAr ? c.nameAr : c.nameEn}: ${renderMoney(c.amount)} (${c.pct}%)`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.4rem 0.6rem',
                          background: '#f8fafc',
                          border: '1px solid #f1f5f9',
                          borderRadius: '8px',
                          fontSize: '0.73rem',
                          gap: '0.4rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                          <span style={{ color: '#475569', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={isAr ? c.nameAr : c.nameEn}>
                            {isAr ? c.nameAr : c.nameEn}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                          <span style={{ fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }} title={formatMoneyText(c.amount)}>
                            {formatCompactMoney(c.amount)}
                          </span>
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            color: c.color,
                            background: `${c.color}15`,
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            border: `1px solid ${c.color}25`
                          }}>
                            {c.pct}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{
                  padding: '1.25rem',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  color: '#64748b',
                  fontSize: '0.78rem'
                }}>
                  <Info size={18} color="#946f23" style={{ marginBottom: '0.35rem' }} />
                  <div>{isAr ? 'لا توجد فواتير أو مصاريف مسجلة حتى الآن لهذا المشروع' : 'No audited cost items logged yet for this property'}</div>
                </div>
              )}
            </div>

            {/* VISUALIZATION 2: PRICE ANATOMY EQUATION & COMPETITIVENESS GAUGE */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.25rem 1.35rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Scale size={16} color="#15803d" />
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                    {pricingScope === 'apartment' && activeUnit
                      ? (isAr ? `معادلة تسعير الشقة (${activeUnit.unit_number}) وتنافسية السوق` : `Unit ${activeUnit.unit_number} Price Equation`)
                      : (isAr ? 'معادلة تسعير العقار وتنافسية السوق' : 'Price Equation & Market Competitiveness')}
                  </span>
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  background: 'rgba(21, 128, 61, 0.1)',
                  color: '#15803d'
                }}>
                  {pricingScope === 'apartment' && activeUnit ? (isAr ? `دور ${activeUnit.floor}` : `F${activeUnit.floor}`) : 'Cost-Plus Pricing'}
                </span>
              </div>

              {/* Connected Price Equation */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr auto 1.3fr',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '0.75rem 0.85rem'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    {pricingScope === 'apartment' && activeUnit
                      ? (isAr ? `تكلفة الشقة (${activeUnit.unit_number})` : `Unit Cost (C)`)
                      : (isAr ? 'المصاريف الفعلية (C)' : 'Incurred Cost (C)')}
                  </span>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block', marginTop: '0.15rem' }}>
                    {renderMoney(
                      pricingScope === 'apartment' && activeUnit
                        ? activeUnit.totalApartmentCost
                        : builtPricing.totalLoggedCost
                    )}
                  </strong>
                </div>

                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#946f23' }}>+</span>

                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    {pricingScope === 'apartment' && activeUnit
                      ? (isAr ? 'مكسب الشقة المستهدف' : 'Target Profit (P)')
                      : (isAr ? 'المكسب المطلوب (P)' : 'Target Profit (P)')}
                  </span>
                  <strong style={{ fontSize: '0.88rem', color: '#15803d', display: 'block', marginTop: '0.15rem' }}>
                    {renderMoney(
                      pricingScope === 'apartment' && activeUnit
                        ? (activeUnit.suggestedPrice - activeUnit.totalApartmentCost)
                        : builtPricing.targetProfitMoney
                    )}
                  </strong>
                </div>

                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#946f23' }}>=</span>

                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid rgba(184, 144, 62, 0.4)',
                  borderRadius: '8px',
                  padding: '0.45rem 0.6rem',
                  textAlign: 'center',
                  boxShadow: '0 2px 6px rgba(184, 144, 62, 0.1)'
                }}>
                  <span style={{ fontSize: '0.66rem', color: '#946f23', fontWeight: 800, display: 'block' }}>
                    {pricingScope === 'apartment' && activeUnit
                      ? (isAr ? `سعر بيع الشقة (${activeUnit.unit_number})` : `Unit ${activeUnit.unit_number} Price`)
                      : (isAr ? 'سعر البيع المقترح' : 'Estimated Selling Price')}
                  </span>
                  <strong style={{ fontSize: '0.98rem', color: '#0f172a', display: 'block', marginTop: '0.15rem' }}>
                    {renderMoney(
                      pricingScope === 'apartment' && activeUnit
                        ? activeUnit.suggestedPrice
                        : builtPricing.estimatedSellingPrice
                    )}
                  </strong>
                </div>
              </div>

              {/* Market Competitiveness Gauge */}
              {(() => {
                const unitMeterPrice = activeUnit && activeUnit.area_sqm > 0 ? (activeUnit.suggestedPrice / activeUnit.area_sqm) : 0;
                const variancePct = pricingScope === 'apartment' && activeUnit
                  ? (marketMeterPrice > 0 ? (((unitMeterPrice - marketMeterPrice) / marketMeterPrice) * 100).toFixed(1) : '0')
                  : builtPricing.marketVariancePct;
                const isCompetitive = parseFloat(variancePct) <= 0;

                return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    background: isCompetitive 
                      ? 'rgba(21, 128, 61, 0.06)' 
                      : 'rgba(184, 144, 62, 0.08)',
                    border: isCompetitive 
                      ? '1px solid rgba(21, 128, 61, 0.22)' 
                      : '1px solid rgba(184, 144, 62, 0.25)',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Info size={15} color={isCompetitive ? '#15803d' : '#946f23'} />
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>
                        {isAr ? 'مؤشر تنافسية سعر المتر مقابل السوق:' : 'Price vs Market Benchmark:'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{
                        fontWeight: 800,
                        color: isCompetitive ? '#15803d' : '#946f23',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {variancePct}%
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        padding: '0.12rem 0.45rem',
                        borderRadius: '4px',
                        fontWeight: 700,
                        background: isCompetitive ? '#15803d' : '#946f23',
                        color: '#ffffff'
                      }}>
                        {isCompetitive 
                          ? (isAr ? 'سعر منافس ومغري للشراء' : 'Competitive') 
                          : (isAr ? 'سعر أعلى من متوسط السوق' : 'Premium')}
                      </span>
                    </div>
                  </div>
                );
              })()}
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
                justifyContent: 'space-between',
                paddingBottom: '0.65rem',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <ShieldCheck size={16} color="#946f23" />
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                    {pricingScope === 'apartment' && activeUnit
                      ? (isAr ? `1. نصيب الشقة (${activeUnit.unit_number}) من المصاريف` : `1. Unit ${activeUnit.unit_number} Cost Basis`)
                      : (isAr ? '1. كل اللي اتصرف فعلياً على العقار' : '1. Incurred Capital Basis (C)')}
                  </span>
                </div>
                {pricingScope === 'apartment' && activeUnit && (
                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '4px',
                    background: 'rgba(148, 111, 35, 0.1)',
                    color: '#946f23'
                  }}>
                    {isAr ? `الدور ${activeUnit.floor}` : `Floor ${activeUnit.floor}`}
                  </span>
                )}
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
                  {pricingScope === 'apartment' && activeUnit
                    ? (isAr ? 'إجمالي تكلفة الشقة الفعلية المحملة:' : 'Total Apportioned Unit Cost:')
                    : (isAr ? 'إجمالي الفلوس اللي اتصرفت:' : 'Total Audited Incurred Capital:')}
                </span>
                <div>
                  {renderMoney(
                    pricingScope === 'apartment' && activeUnit ? activeUnit.totalApartmentCost : propertyAudit.totalLoggedCost,
                    undefined,
                    { size: '1.65rem', weight: 900, color: '#0f172a' }
                  )}
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
                    {pricingScope === 'apartment' && activeUnit ? (isAr ? 'تكلفة متر الشقة:' : 'Unit Cost / Sqm:') : (isAr ? 'تكلفة متر المباني الفعلي:' : 'Actual Cost / Sqm:')}
                  </span>
                  <div style={{ marginTop: '0.2rem' }}>
                    {renderMoney(
                      pricingScope === 'apartment' && activeUnit
                        ? Math.round(activeUnit.totalApartmentCost / (activeUnit.area_sqm || 1))
                        : propertyAudit.costPerSqm,
                      'م²',
                      { color: '#2563eb', weight: 800, size: '0.92rem' }
                    )}
                  </div>
                </div>

                <div style={{
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem'
                }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    {pricingScope === 'apartment' && activeUnit ? (isAr ? 'مساحة الشقة:' : 'Unit Area:') : (isAr ? 'مساحة المباني:' : 'Built Area:')}
                  </span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
                    {pricingScope === 'apartment' && activeUnit ? activeUnit.area_sqm : (selectedProperty?.area_sqm || 200)} م²
                  </div>
                </div>
              </div>

              {/* Expense Breakdown */}
              {pricingScope === 'apartment' && activeUnit ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                    {isAr ? 'تفاصيل تحميل التكلفة على الشقة:' : 'Unit Cost Apportionment:'}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                    <span style={{ color: '#475569' }}>{isAr ? 'نصيبها من مباني وهيكل العمارة:' : 'Building WIP Share:'}</span>
                    <strong style={{ color: '#0f172a' }}>{renderMoney(activeUnit.apportionedCost)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                    <span style={{ color: '#475569' }}>{isAr ? 'رسوم وتراخيص خاصة بالشقة:' : 'Unit Specific Fees:'}</span>
                    <strong style={{ color: '#946f23' }}>{renderMoney(activeUnit.unitTaxesPaid)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                    <span style={{ color: '#475569' }}>{isAr ? 'نسبة المساحة من إجمالي العمارة:' : 'Area Ratio:'}</span>
                    <span style={{ fontWeight: 700, color: '#15803d' }}>
                      {((activeUnit.area_sqm / (selectedProperty?.area_sqm || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ) : (
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
                          {formatCompactMoney(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
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
                    {pricingScope === 'apartment' && activeUnit
                      ? (isAr ? `مكسب الشقة (${activeUnit.unit_number}):` : 'Unit Target Profit:')
                      : (isAr ? 'مبلغ المكسب المضاف:' : 'Target Profit (P):')}
                  </span>
                  <div>
                    <span style={{ color: '#15803d', fontWeight: 800, marginInlineEnd: '0.15rem' }}>+</span>
                    {renderMoney(
                      pricingScope === 'apartment' && activeUnit
                        ? (activeUnit.suggestedPrice - activeUnit.totalApartmentCost)
                        : builtPricing.targetProfitMoney,
                      undefined,
                      { color: '#15803d', weight: 800, size: '0.9rem' }
                    )}
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
                    {pricingScope === 'apartment' && activeUnit
                      ? (isAr ? `3. سعر بيع الشقة المقترح (${activeUnit.unit_number})` : `3. Unit ${activeUnit.unit_number} Price`)
                      : (isAr ? '3. سعر البيع المقترح النهائي' : '3. Valuation Recommendation')}
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
                  {pricingScope === 'apartment' && activeUnit ? (isAr ? `شقة دور ${activeUnit.floor}` : `Floor ${activeUnit.floor}`) : (isAr ? 'التكلفة + المكسب' : 'Cost + Profit')}
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
                  {pricingScope === 'apartment' && activeUnit
                    ? (isAr ? `سعر البيع المقترح لشقة ${activeUnit.unit_number}:` : `Unit ${activeUnit.unit_number} Suggested Price:`)
                    : (isAr ? 'سعر البيع المقترح للعقار كله:' : 'Recommended Selling Price:')}
                </span>
                <div>
                  {renderMoney(
                    pricingScope === 'apartment' && activeUnit ? activeUnit.suggestedPrice : builtPricing.estimatedSellingPrice,
                    undefined,
                    { size: 'clamp(1.75rem, 2vw, 2.25rem)', weight: 900, color: '#0f172a' }
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <span>{pricingScope === 'apartment' && activeUnit ? (isAr ? 'سعر متر الشقة:' : 'Unit Price / m²:') : (isAr ? 'سعر بيع المتر المقترح:' : 'Price / Sqm:')}</span>
                  <strong style={{ color: '#946f23' }}>
                    {renderMoney(
                      pricingScope === 'apartment' && activeUnit ? activeUnit.pricePerSqm : builtPricing.estimatedSellingPricePerSqm,
                      'م²'
                    )}
                  </strong>
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
                    {pricingScope === 'apartment' && activeUnit ? activeUnit.grossMargin : builtPricing.grossMarginPct}%
                  </div>
                </div>

                <div style={{
                  background: 'rgba(184, 144, 62, 0.06)',
                  border: '1px solid rgba(184, 144, 62, 0.22)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem'
                }}>
                  <span style={{ fontSize: '0.68rem', color: '#946f23', fontWeight: 700, display: 'block' }}>
                    {isAr ? 'العائد على المصاريف:' : 'Return on Cost:'}
                  </span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#946f23', marginTop: '0.2rem', fontVariantNumeric: 'tabular-nums' }}>
                    {pricingScope === 'apartment' && activeUnit
                      ? (activeUnit.totalApartmentCost > 0 
                          ? (((activeUnit.suggestedPrice - activeUnit.totalApartmentCost) / activeUnit.totalApartmentCost) * 100).toFixed(1)
                          : '0.0')
                      : builtPricing.returnOnCostPct}%
                  </div>
                </div>
              </div>

              {/* Primary Action Button */}
              {pricingScope === 'apartment' && activeUnit ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
                  {activeUnit.status === 'contracted' ? (
                    <div style={{
                      padding: '0.75rem',
                      borderRadius: '10px',
                      background: 'rgba(21, 128, 61, 0.08)',
                      border: '1px solid rgba(21, 128, 61, 0.25)',
                      color: '#15803d',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}>
                      <CheckCircle2 size={16} />
                      <span>{isAr ? `الشقة (${activeUnit.unit_number}) تم التعاقد وبيعها بالفعل ✓` : `Unit ${activeUnit.unit_number} is already contracted`}</span>
                    </div>
                  ) : onOpenContractForProperty ? (
                    <button
                      type="button"
                      onClick={() => onOpenContractForProperty(selectedProperty, activeUnit)}
                      style={{
                        background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '0.8rem 1rem',
                        fontSize: '0.84rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 14px rgba(21, 128, 61, 0.28)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Plus size={16} />
                      <span>{isAr ? `+ تحرير عقد بيع لهذه الشقة (${activeUnit.unit_number})` : `Create Sales Contract for Unit ${activeUnit.unit_number}`}</span>
                    </button>
                  ) : null}
                </div>
              ) : (
                /* Whole Building Catalog Price Update Button */
                onUpdateSellingPrice && selectedProperty && (
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
                )
              )}
            </div>

          </div>

          {/* 4. BUILDING WHOLE VS INDIVIDUAL APARTMENTS STUDIO */}
          {isSelectedBuilding && buildingUnitsPricing && (() => {
            const availableUnitsCount = buildingUnitsPricing.units.filter(u => u.status !== 'contracted').length;
            const contractedUnitsCount = buildingUnitsPricing.units.filter(u => u.status === 'contracted').length;

            return (
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.35rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.15rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
              }}>
                {/* Header & Strategy Toggle */}
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
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                        {isAr ? 'استوديو استراتيجية التسعير: بيع العمارة شروة واحدة كاش مقابل بيع الشقق فردانية' : 'Commercial Strategy Studio: Whole Building vs. Retail Units'}
                      </h4>
                      <span style={{ fontSize: '0.73rem', color: '#64748b' }}>
                        {isAr ? 'قارن بين السيولة السريعة من بيع العمارة بالكامل لمستثمر، أو تعظيم الأرباح عبر بيع وتوزيع الشقق قطاعي' : 'Compare immediate wholesale investor liquidity vs. maximum gross margin from retail unit sales'}
                      </span>
                    </div>
                  </div>

                  {/* Mode switcher (Zero Emojis, Pure Lucide Icons) */}
                  <div style={{
                    display: 'flex',
                    background: '#f1f5f9',
                    padding: '0.25rem',
                    borderRadius: '9px',
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
                        borderRadius: '7px',
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.76rem',
                        fontWeight: buildingPricingMode === 'whole' ? 800 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: buildingPricingMode === 'whole' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Building size={15} color={buildingPricingMode === 'whole' ? '#946f23' : '#64748b'} />
                      <span>{isAr ? 'بيع العمارة شروة واحدة (جملة)' : 'Whole Building Sale'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBuildingPricingMode('units')}
                      style={{
                        background: buildingPricingMode === 'units' ? '#ffffff' : 'transparent',
                        color: buildingPricingMode === 'units' ? '#946f23' : '#64748b',
                        border: buildingPricingMode === 'units' ? '1px solid rgba(184, 144, 62, 0.3)' : '1px solid transparent',
                        borderRadius: '7px',
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.76rem',
                        fontWeight: buildingPricingMode === 'units' ? 800 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: buildingPricingMode === 'units' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Home size={15} color={buildingPricingMode === 'units' ? '#946f23' : '#64748b'} />
                      <span>{isAr ? 'تسعير الشقق فردانية (قطاعي)' : 'Individual Retail Units'}</span>
                    </button>
                  </div>
                </div>

                {/* DYNAMIC VIEW BASED ON SELECTED STRATEGY */}
                {buildingPricingMode === 'whole' ? (
                  /* ========================================================= */
                  /* A. WHOLESALE DEAL DOSSIER (بيع العمارة شروة واحدة)        */
                  /* ========================================================= */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Top Strategy Banner */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(254, 253, 250, 0.9) 0%, rgba(248, 250, 252, 0.95) 100%)',
                      border: '1.5px solid rgba(184, 144, 62, 0.28)',
                      borderRadius: '12px',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '6px',
                            background: 'rgba(184, 144, 62, 0.12)',
                            color: '#946f23'
                          }}>
                            {isAr ? 'صفقة بيع جملة لمستثمر واحد' : 'Wholesale Investor Deal'}
                          </span>
                          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            {selectedProperty.title_ar || selectedProperty.title_en} • {selectedProperty.area_sqm} م²
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#334155', fontWeight: 600, lineHeight: 1.4 }}>
                          {isAr 
                            ? 'بيع العمارة بالكامل بعقد استثماري موحد يُسدد دفعة واحدة أو بدفعات سريعة، مما يحقق للمطور سيولة نقدية فورية.' 
                            : 'Single investor transaction providing full immediate cash liquidity.'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleExportBuiltPricingExcel}
                        style={{
                          background: '#ffffff',
                          color: '#946f23',
                          border: '1px solid rgba(184, 144, 62, 0.35)',
                          borderRadius: '8px',
                          padding: '0.45rem 0.85rem',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                        }}
                      >
                        <FileSpreadsheet size={14} color="#946f23" />
                        <span>{isAr ? 'تصدير عرض سعر الشروة' : 'Export Wholesale Deal'}</span>
                      </button>
                    </div>

                    {/* 4 KPI Cards for Wholesale */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                      gap: '0.85rem'
                    }}>
                      <div style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                          {isAr ? 'إجمالي سعر بيع العمارة شروة:' : 'Total Wholesale Deal Price:'}
                        </span>
                        <div style={{ marginTop: '0.25rem' }}>
                          {renderMoney(builtPricing.estimatedSellingPrice, undefined, { color: '#0f172a', size: '1.3rem', weight: 900 })}
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                          {isAr ? 'سعر المتر جملة للمستثمر:' : 'Wholesale Price / Sqm:'}
                        </span>
                        <div style={{ marginTop: '0.25rem' }}>
                          {renderMoney(builtPricing.estimatedSellingPricePerSqm, 'م²', { color: '#946f23', size: '1.2rem', weight: 800 })}
                        </div>
                      </div>

                      <div style={{ background: 'rgba(21, 128, 61, 0.05)', padding: '0.9rem', borderRadius: '12px', border: '1px solid rgba(21, 128, 61, 0.2)' }}>
                        <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700, display: 'block' }}>
                          {isAr ? 'صافي الربح الفوري للمطور:' : 'Net Developer Profit:'}
                        </span>
                        <div style={{ marginTop: '0.25rem' }}>
                          {renderMoney(builtPricing.targetProfitMoney, undefined, { color: '#15803d', size: '1.2rem', weight: 900 })}
                          <span style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 700, marginInlineStart: '0.35rem' }}>
                            ({builtPricing.grossMarginPct}%)
                          </span>
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                          {isAr ? 'العائد على تكلفة البناء (ROC):' : 'Return on Cost:'}
                        </span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginTop: '0.25rem', fontVariantNumeric: 'tabular-nums' }}>
                          {builtPricing.returnOnCostPct}%
                        </div>
                      </div>
                    </div>

                    {/* Strategic Decision Matrix Bento */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
                      gap: '1rem'
                    }}>
                      {/* Advantages */}
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '1.1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                          <CheckCircle2 size={16} color="#15803d" />
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                            {isAr ? 'مزايا بيع العمارة شروة واحدة كاش:' : 'Advantages of Wholesale Deal:'}
                          </span>
                        </div>
                        <ul style={{ margin: 0, paddingInlineStart: '1.2rem', fontSize: '0.76rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.4rem', lineHeight: 1.45 }}>
                          <li>{isAr ? 'سيولة نقدية ضخمة وفورية بدون انتظار أقساط مجدولة على شهور وسنوات.' : 'Immediate full cash liquidity without waiting for multi-year payment tranches.'}</li>
                          <li>{isAr ? 'توفير مصاريف التسويق والعمولات ومقابل المعاينات لشقق متعددة.' : 'Zero marketing overhead and individual broker commission per apartment.'}</li>
                          <li>{isAr ? 'انعدام مخاطر تعثر المشترين في سداد الأقساط أو طلبات فسخ العقود واسترداد الأموال.' : 'Zero default risk or rescission settlement overhead.'}</li>
                          <li>{isAr ? 'قفل حسابات المشروع دفترياً وخروج رأس المال لدورة بناء جديدة.' : 'Fast cycle closure and capital reinvestment in new project.'}</li>
                        </ul>
                      </div>

                      {/* Trade-off Comparison */}
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '1.1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                          <Scale size={16} color="#946f23" />
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                            {isAr ? 'المقارنة مع بيع الشقق فردانية (قطاعي):' : 'Comparison vs Retail Apartment Sales:'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.45rem', lineHeight: 1.45 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: '#f8fafc', borderRadius: '6px' }}>
                            <span>{isAr ? 'إجمالي مبيعات الشقق قطاعي:' : 'Total Retail Units Revenue:'}</span>
                            <strong style={{ color: '#0f172a' }}>{renderMoney(buildingUnitsPricing.totalRetailRevenue)}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'rgba(21, 128, 61, 0.06)', borderRadius: '6px' }}>
                            <span style={{ color: '#15803d', fontWeight: 700 }}>{isAr ? 'فرق المكسب الزيادة ببيع الشقق:' : 'Retail Profit Uplift:'}</span>
                            <strong style={{ color: '#15803d' }}>+{renderMoney(buildingUnitsPricing.retailVsWholeUplift)} (+{buildingUnitsPricing.retailVsWholeUpliftPct}%)</strong>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Info size={14} color="#946f23" style={{ flexShrink: 0 }} />
                            <span>
                              {isAr 
                                ? `القرار الاستثماري: بيع الشروة الواحدة يُضحي بربح إضافي قدره ${buildingUnitsPricing.retailVsWholeUpliftPct}% مقابل راحة البال والسيولة الفورية وتفادي مخاطر السوق.`
                                : `Wholesale accepts a discount vs retail units in exchange for immediate full settlement.`}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ========================================================= */
                  /* B. RETAIL UNITS PRICING MATRIX (تسعير الشقق فردانية)      */
                  /* ========================================================= */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Top Uplift & Revenue Strip */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.75rem'
                    }}>
                      <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                          {isAr ? 'إجمالي عدد شقق العمارة:' : 'Total Building Units:'}
                        </span>
                        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem', display: 'block' }}>
                          {buildingUnitsPricing.totalUnits} {isAr ? 'شقة' : 'Apartments'}
                        </span>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                          {isAr ? 'إجمالي المبيعات لو بعنا الشقق فردانية:' : 'Total Retail Revenue:'}
                        </span>
                        <div style={{ marginTop: '0.2rem' }}>
                          {renderMoney(buildingUnitsPricing.totalRetailRevenue, undefined, { color: '#946f23', size: '1.15rem', weight: 900 })}
                        </div>
                      </div>

                      <div style={{ background: 'rgba(21, 128, 61, 0.05)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(21, 128, 61, 0.2)' }}>
                        <span style={{ fontSize: '0.7rem', color: '#15803d', display: 'block', fontWeight: 700 }}>
                          {isAr ? 'الربح الزيادة من بيع الشقق فردانية:' : 'Retail Profit Uplift:'}
                        </span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                          <span style={{ color: '#15803d', fontWeight: 900 }}>+</span>
                          {renderMoney(buildingUnitsPricing.retailVsWholeUplift, undefined, { color: '#15803d', size: '1.15rem', weight: 900 })}
                          <span style={{ fontSize: '0.76rem', color: '#15803d', fontWeight: 800 }}>
                            (+{buildingUnitsPricing.retailVsWholeUpliftPct}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Filter & Search Toolbar */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      background: '#f8fafc',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0'
                    }}>
                      {/* Search Box */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '0.4rem 0.7rem',
                        minWidth: '240px'
                      }}>
                        <Search size={14} color="#64748b" />
                        <input
                          type="text"
                          value={unitSearchQuery}
                          onChange={(e) => setUnitSearchQuery(e.target.value)}
                          placeholder={isAr ? 'ابحث برقم الشقة أو الدور...' : 'Search unit code or floor...'}
                          style={{
                            border: 'none',
                            outline: 'none',
                            fontSize: '0.76rem',
                            color: '#0f172a',
                            width: '100%',
                            background: 'transparent'
                          }}
                        />
                      </div>

                      {/* Status Filter Tabs */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => setUnitStatusFilter('all')}
                          style={{
                            background: unitStatusFilter === 'all' ? '#0f172a' : '#ffffff',
                            color: unitStatusFilter === 'all' ? '#ffffff' : '#64748b',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {isAr ? `كل الشقق (${buildingUnitsPricing.units.length})` : `All (${buildingUnitsPricing.units.length})`}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUnitStatusFilter('available')}
                          style={{
                            background: unitStatusFilter === 'available' ? '#946f23' : '#ffffff',
                            color: unitStatusFilter === 'available' ? '#ffffff' : '#64748b',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {isAr ? `المتاحة للبيع (${availableUnitsCount})` : `Available (${availableUnitsCount})`}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUnitStatusFilter('contracted')}
                          style={{
                            background: unitStatusFilter === 'contracted' ? '#15803d' : '#ffffff',
                            color: unitStatusFilter === 'contracted' ? '#ffffff' : '#64748b',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {isAr ? `المتعاقد عليها (${contractedUnitsCount})` : `Contracted (${contractedUnitsCount})`}
                        </button>
                      </div>
                    </div>

                    {/* Executive Alabaster Units Table */}
                    <div style={{
                      overflowX: 'auto',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', color: '#475569', textAlign: isAr ? 'right' : 'left', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '0.75rem 0.9rem', fontWeight: 800 }}>{isAr ? 'رقم / كود الشقة' : 'Unit Code'}</th>
                            <th style={{ padding: '0.75rem 0.9rem', fontWeight: 800 }}>{isAr ? 'الدور' : 'Floor'}</th>
                            <th style={{ padding: '0.75rem 0.9rem', fontWeight: 800 }}>{isAr ? 'المساحة' : 'Area'}</th>
                            <th style={{ padding: '0.75rem 0.9rem', fontWeight: 800 }}>{isAr ? 'نصيبها من مصاريف المبنى' : 'General Cost'}</th>
                            <th style={{ padding: '0.75rem 0.9rem', fontWeight: 800 }}>{isAr ? 'الرسوم والتراخيص المحملة' : 'Taxes & Fees'}</th>
                            <th style={{ padding: '0.75rem 0.9rem', fontWeight: 800 }}>{isAr ? 'إجمالي تكلفة الشقة (C)' : 'Total Unit Cost'}</th>
                            <th style={{ padding: '0.75rem 0.9rem', fontWeight: 800 }}>{isAr ? 'سعر البيع المقترح قطاعي' : 'Suggested Price'}</th>
                            <th style={{ padding: '0.75rem 0.9rem', fontWeight: 800 }}>{isAr ? 'سعر المتر قطاعي' : 'Price / m²'}</th>
                            <th style={{ padding: '0.75rem 0.9rem', fontWeight: 800 }}>{isAr ? 'هامش الربح' : 'Margin'}</th>
                            <th style={{ padding: '0.75rem 0.9rem', fontWeight: 800 }}>{isAr ? 'حالة الشقة' : 'Status'}</th>
                            <th style={{ padding: '0.75rem 0.9rem', fontWeight: 800, textAlign: 'center' }}>{isAr ? 'الإجراءات والتسعير' : 'Actions & Pricing'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBuildingUnits.length > 0 ? (
                            filteredBuildingUnits.map((u, idx) => (
                              <tr
                                key={u.unit_id || idx}
                                style={{
                                  borderTop: '1px solid #f1f5f9',
                                  background: (pricingScope === 'apartment' && activeUnit?.unit_id === u.unit_id) 
                                    ? 'rgba(148, 111, 35, 0.05)' 
                                    : (idx % 2 === 0 ? '#ffffff' : '#fafafa'),
                                  transition: 'background 0.12s ease'
                                }}
                              >
                                <td style={{ padding: '0.7rem 0.9rem', fontWeight: 800, color: '#0f172a' }}>
                                  {u.unit_number}
                                </td>
                                <td style={{ padding: '0.7rem 0.9rem', color: '#475569' }}>
                                  {isAr ? `الدور ${u.floor}` : `Floor ${u.floor}`}
                                </td>
                                <td style={{ padding: '0.7rem 0.9rem', color: '#475569', fontWeight: 700 }}>
                                  {u.area_sqm} م²
                                </td>
                                <td style={{ padding: '0.7rem 0.9rem' }}>
                                  {renderMoney(u.apportionedCost, undefined, { color: '#475569', weight: 700 })}
                                </td>
                                <td style={{ padding: '0.7rem 0.9rem' }}>
                                  {u.unitTaxesPaid > 0 ? (
                                    renderMoney(u.unitTaxesPaid, undefined, { color: '#946f23', weight: 700 })
                                  ) : (
                                    <span style={{ color: '#94a3b8' }}>{isAr ? '٠ ج.م' : '0 EGP'}</span>
                                  )}
                                </td>
                                <td style={{ padding: '0.7rem 0.9rem' }}>
                                  {renderMoney(u.totalApartmentCost, undefined, { weight: 800, color: '#0f172a' })}
                                </td>
                                <td style={{ padding: '0.7rem 0.9rem' }}>
                                  {renderMoney(u.suggestedPrice, undefined, { color: '#946f23', weight: 900 })}
                                </td>
                                <td style={{ padding: '0.7rem 0.9rem' }}>
                                  {renderMoney(u.pricePerSqm, 'م²', { color: '#64748b', weight: 700 })}
                                </td>
                                <td style={{ padding: '0.7rem 0.9rem', color: '#15803d', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                                  {u.grossMargin}%
                                </td>
                                <td style={{ padding: '0.7rem 0.9rem' }}>
                                  <span style={{
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    background: u.status === 'contracted' ? 'rgba(21, 128, 61, 0.08)' : 'rgba(184, 144, 62, 0.08)',
                                    color: u.status === 'contracted' ? '#15803d' : '#946f23',
                                    border: u.status === 'contracted' ? '1px solid rgba(21, 128, 61, 0.25)' : '1px solid rgba(184, 144, 62, 0.25)'
                                  }}>
                                    {u.status === 'contracted' ? (isAr ? 'متباعة / متعاقد عليها' : 'Contracted') : (isAr ? 'جاهزة للبيع' : 'Available')}
                                  </span>
                                </td>
                                <td style={{ padding: '0.6rem 0.9rem', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPricingScope('apartment');
                                        setSelectedUnitId(u.unit_id);
                                        window.scrollTo({ top: 380, behavior: 'smooth' });
                                      }}
                                      title={isAr ? 'تسعير هذه الشقة بالحاسبة أعلاه' : 'Price this unit in calculator above'}
                                      style={{
                                        background: (pricingScope === 'apartment' && activeUnit?.unit_id === u.unit_id) ? '#946f23' : '#f8fafc',
                                        color: (pricingScope === 'apartment' && activeUnit?.unit_id === u.unit_id) ? '#ffffff' : '#475569',
                                        border: (pricingScope === 'apartment' && activeUnit?.unit_id === u.unit_id) ? '1.5px solid #946f23' : '1px solid #cbd5e1',
                                        borderRadius: '7px',
                                        padding: '0.3rem 0.6rem',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        boxShadow: (pricingScope === 'apartment' && activeUnit?.unit_id === u.unit_id) ? '0 1px 4px rgba(148, 111, 35, 0.3)' : 'none',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      <Calculator size={13} />
                                      <span>{isAr ? 'تسعير بالحاسبة' : 'Price'}</span>
                                    </button>

                                    {u.status !== 'contracted' && onOpenContractForProperty && (
                                      <button
                                        type="button"
                                        onClick={() => onOpenContractForProperty(selectedProperty, u)}
                                        title={isAr ? `تحرير عقد بيع لشقة ${u.unit_number}` : `Create sales contract for unit ${u.unit_number}`}
                                        style={{
                                          background: 'rgba(21, 128, 61, 0.08)',
                                          color: '#15803d',
                                          border: '1px solid rgba(21, 128, 61, 0.25)',
                                          borderRadius: '7px',
                                          padding: '0.3rem 0.6rem',
                                          fontSize: '0.7rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.25rem',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        <Plus size={13} />
                                        <span>{isAr ? 'تحرير عقد' : 'Contract'}</span>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={11} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                <Info size={18} color="#946f23" style={{ marginBottom: '0.35rem' }} />
                                <div>{isAr ? 'لا توجد شقق مطابقة لنتيجة البحث أو الفلتر المحدد' : 'No units match current filter'}</div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: PRE-CONSTRUCTION FEASIBILITY ESTIMATOR                             */}
      {/* ========================================================================= */}
      {calculatorMode === 'FEASIBILITY_ESTIMATOR' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '1.5rem' }}>
          
          {/* INPUT PARAMETERS CARD */}
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
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#946f23', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Hammer size={16} />
                <span>{isAr ? 'مواصفات وتكاليف المشروع الجديد (8 بنود مباشرة)' : 'New Project Specifications & Direct 8-Category Costs'}</span>
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f8fafc', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                {isAr ? 'دراسة جدوى تقديرية' : 'Feasibility Study'}
              </span>
            </div>

            {/* SECTION 1: Built-up Area, Floors & Land */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155' }}>
                {isAr ? '1. المساحات والمواصفات العامة والأرض:' : '1. General Specs & Land Area:'}
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', color: '#475569', marginBottom: '0.3rem', fontWeight: 700 }}>
                    {isAr ? 'إجمالي مساحة المباني (م²):' : 'Built-up Area (sqm):'}
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="50000"
                    value={builtUpAreaSqm}
                    onChange={(e) => setBuiltUpAreaSqm(Math.max(1, parseFloat(e.target.value) || 0))}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#0f172a',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      padding: '0.5rem 0.75rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', color: '#475569', marginBottom: '0.3rem', fontWeight: 700 }}>
                    {isAr ? 'عدد الأدوار:' : 'Floors Count:'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={floorsCount}
                    onChange={(e) => setFloorsCount(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#0f172a',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      padding: '0.5rem 0.75rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', color: '#475569', marginBottom: '0.3rem', fontWeight: 700 }}>
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
                      fontWeight: 700,
                      padding: '0.5rem 0.75rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', color: '#475569', marginBottom: '0.3rem', fontWeight: 700 }}>
                    {isAr ? 'سعر متر الأرض (ج.م/م²):' : 'Land Price / sqm:'}
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
                      fontWeight: 700,
                      padding: '0.5rem 0.75rem'
                    }}
                  />
                </div>
              </div>

              {/* Land Allocation Summary Banner */}
              <div style={{
                background: 'rgba(146, 64, 14, 0.05)',
                border: '1px solid rgba(146, 64, 14, 0.2)',
                borderRadius: '8px',
                padding: '0.55rem 0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.73rem'
              }}>
                <span style={{ color: '#92400e', fontWeight: 700 }}>
                  {isAr ? 'البند 8: إجمالي تكلفة الأرض المحملة ع المبنى:' : 'Item 8: Total Land Allocation:'}
                </span>
                <span style={{ fontWeight: 800, color: '#92400e', direction: 'ltr' }}>
                  {formatCompactMoney(feasibilityCalculations.totalLandCost, isAr)} ({feasibilityCalculations.landCostPerBuiltSqm.toLocaleString()} {isAr ? 'ج.م/م² مباني' : 'EGP/sqm'})
                </span>
              </div>
            </div>

            {/* SECTION 2: Finishing Tier Selection & Custom */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155' }}>
                  {isAr ? '2. مستوى التشطيب المعماري والداخلي (البند 4):' : '2. Architectural Finishing Tier (Item 4):'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#701a75', fontWeight: 700 }}>
                  {feasibilityCalculations.effectiveFinishingCostPerSqm.toLocaleString()} {isAr ? 'ج.م/م²' : 'EGP/sqm'}
                </span>
              </div>

              {/* Finishing Presets Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: '0.5rem' }}>
                {(Object.keys(FINISHING_TIER_COSTS) as FinishingTier[]).map((tier) => {
                  const meta = FINISHING_TIER_COSTS[tier];
                  const isSelected = finishingTier === tier;
                  const displayCost = tier === 'custom' ? customFinishingCostPerSqm : meta.costPerSqm;
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setFinishingTier(tier)}
                      style={{
                        background: isSelected ? 'rgba(184, 144, 62, 0.08)' : '#ffffff',
                        border: isSelected ? '1.5px solid #946f23' : '1px solid #e2e8f0',
                        borderRadius: '9px',
                        padding: '0.6rem 0.5rem',
                        textAlign: isAr ? 'right' : 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        boxShadow: isSelected ? '0 2px 8px rgba(148, 111, 35, 0.15)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isSelected ? '#946f23' : '#0f172a' }}>
                          {tier === 'core_and_shell' ? (isAr ? 'طوب وعظم' : 'Core & Shell') :
                           tier === 'semi_finished' ? (isAr ? 'نص تشطيب' : 'Semi-Finished') :
                           tier === 'lux' ? (isAr ? 'تشطيب لوكس' : 'Lux') :
                           tier === 'super_lux' ? (isAr ? 'سوبر لوكس' : 'Super Lux') :
                           (isAr ? 'مخصص يدوي' : 'Custom')}
                        </span>
                        {isSelected && <Check size={12} color="#946f23" strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: isSelected ? '#946f23' : '#64748b', fontWeight: 700 }}>
                        {displayCost.toLocaleString()} {isAr ? 'ج.م/م²' : 'EGP'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Finishing Card - Revealed when custom is selected */}
              {finishingTier === 'custom' && (
                <div style={{
                  background: 'rgba(184, 144, 62, 0.04)',
                  border: '1.5px solid rgba(184, 144, 62, 0.35)',
                  borderRadius: '12px',
                  padding: '0.9rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  marginTop: '0.2rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Sparkles size={15} color="#946f23" />
                      <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#946f23' }}>
                        {isAr ? 'تحديد مواصفات وتكلفة التشطيب المخصص (Custom):' : 'Custom Finishing Specification & Rate:'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {isAr ? 'قابل للتعديل بحرية' : 'Fully Editable'}
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.71rem', color: '#475569', marginBottom: '0.3rem', fontWeight: 700 }}>
                      {isAr ? 'تكلفة تشطيب المتر المربع (ج.م/م²):' : 'Custom Finishing Cost / sqm (EGP):'}
                    </label>
                    <input
                      type="number"
                      min="500"
                      step="250"
                      value={customFinishingCostPerSqm}
                      onChange={(e) => setCustomFinishingCostPerSqm(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{
                        width: '100%',
                        background: '#ffffff',
                        border: '1.5px solid #946f23',
                        borderRadius: '8px',
                        color: '#0f172a',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        padding: '0.55rem 0.8rem',
                        boxShadow: '0 1px 3px rgba(148, 111, 35, 0.1)'
                      }}
                    />
                  </div>

                  {/* Quick Preset Buttons & Increments */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.66rem', color: '#64748b' }}>{isAr ? 'تعديل سريع:' : 'Quick Nudge:'}</span>
                      {[-1000, -500, 500, 1000].map((delta) => (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => setCustomFinishingCostPerSqm(prev => Math.max(500, prev + delta))}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '5px',
                            padding: '0.2rem 0.45rem',
                            fontSize: '0.67rem',
                            color: '#334155',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.66rem', color: '#64748b' }}>{isAr ? 'مستويات شائعة:' : 'Tiers:'}</span>
                      {[5500, 8500, 12000, 15000].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setCustomFinishingCostPerSqm(rate)}
                          style={{
                            background: customFinishingCostPerSqm === rate ? '#946f23' : '#ffffff',
                            color: customFinishingCostPerSqm === rate ? '#ffffff' : '#334155',
                            border: customFinishingCostPerSqm === rate ? '1px solid #946f23' : '1px solid #cbd5e1',
                            borderRadius: '5px',
                            padding: '0.2rem 0.45rem',
                            fontSize: '0.67rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {rate.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Total Badge for Custom Finishing */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid rgba(184, 144, 62, 0.25)',
                    borderRadius: '7px',
                    padding: '0.45rem 0.65rem',
                    fontSize: '0.71rem',
                    color: '#701a75',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span>{isAr ? 'إجمالي تكلفة التشطيب المخصص للعقار بالكامل:' : 'Total Custom Finishing for Project:'}</span>
                    <span style={{ fontWeight: 800 }}>
                      {formatCompactMoney(feasibilityCalculations.totalFinishingCost, isAr)} ({feasibilityCalculations.totalFinishingCost.toLocaleString()} {isAr ? 'ج.م' : 'EGP'})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: Direct 8 Canonical Cost Categories Inputs */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <SlidersHorizontal size={14} color="#946f23" />
                  <span>{isAr ? '3. تفصيل أسعار بنود التكاليف المباشرة المعتمدة:' : '3. Direct Canonical Cost Rates:'}</span>
                </span>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  {isAr ? 'معدلات قابلة للتعديل' : 'Adjustable'}
                </span>
              </div>

              {/* Item 1: Civil & Structure (Steel & Concrete) */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#c2410c', marginBottom: '0.45rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{isAr ? 'البند 1: خرسانات وهيكل إنشائي (حديد + خرسانة)' : 'Item 1: Civil & Structure'}</span>
                  <span>{formatCompactMoney(feasibilityCalculations.totalCivilStructureCost, isAr)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', marginBottom: '0.2rem' }}>
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
                        fontWeight: 700,
                        padding: '0.35rem 0.55rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', marginBottom: '0.2rem' }}>
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
                        fontWeight: 700,
                        padding: '0.35rem 0.55rem'
                      }}
                    />
                  </div>
                </div>
                <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '0.35rem' }}>
                  {isAr 
                    ? `تقديري: ${feasibilityCalculations.steelTons} طن حديد (${formatCompactMoney(feasibilityCalculations.totalSteelCost, isAr)}) + ${feasibilityCalculations.concreteVolumeM3} م³ خرسانة (${formatCompactMoney(feasibilityCalculations.totalConcreteCost, isAr)})`
                    : `Est: ${feasibilityCalculations.steelTons} tons steel + ${feasibilityCalculations.concreteVolumeM3} m³ concrete`}
                </div>
              </div>

              {/* Item 2 & 3: Labor & MEP */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.6rem' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#047857', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{isAr ? 'البند 2: مصنعيات ومقاول باطن' : 'Item 2: Labor'}</span>
                    <span>{formatCompactMoney(feasibilityCalculations.totalLaborCost, isAr)}</span>
                  </div>
                  <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', marginBottom: '0.2rem' }}>
                    {isAr ? 'أجور مصنعيات وصب (ج.م/م²):' : 'Labor Rate / sqm:'}
                  </label>
                  <input
                    type="number"
                    step="50"
                    value={laborCostPerSqm}
                    onChange={(e) => setLaborCostPerSqm(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#0f172a',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.55rem'
                    }}
                  />
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1d4ed8', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{isAr ? 'البند 3: كهروميكانيك وتأسيسات' : 'Item 3: MEP'}</span>
                    <span>{formatCompactMoney(feasibilityCalculations.totalMepCost, isAr)}</span>
                  </div>
                  <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', marginBottom: '0.2rem' }}>
                    {isAr ? 'سباكة وكهرباء للمتر (ج.م/م²):' : 'MEP Rate / sqm:'}
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={mepCostPerSqm}
                    onChange={(e) => setMepCostPerSqm(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#0f172a',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.55rem'
                    }}
                  />
                </div>
              </div>

              {/* Item 5: Facade & Elevator */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4338ca', marginBottom: '0.45rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{isAr ? 'البند 5: واجهات ومداخل ومصاعد' : 'Item 5: Façade & Vertical Access'}</span>
                  <span>{formatCompactMoney(feasibilityCalculations.totalSiteFacadeCost, isAr)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '0.6rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', marginBottom: '0.2rem' }}>
                      {isAr ? 'تشطيب الواجهات والمدخل (ج.م/م²):' : 'Façade Rate / sqm:'}
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={facadeCostPerSqm}
                      onChange={(e) => setFacadeCostPerSqm(parseFloat(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        color: '#0f172a',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '0.35rem 0.55rem'
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <label style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {isAr ? 'تكلفة الأسانسير (المصعد):' : 'Elevator Cost (EGP):'}
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', cursor: 'pointer', fontSize: '0.65rem', color: '#4338ca', fontWeight: 700 }}>
                        <input
                          type="checkbox"
                          checked={includeElevator}
                          onChange={(e) => setIncludeElevator(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{isAr ? 'مطلوب' : 'Include'}</span>
                      </label>
                    </div>
                    <input
                      type="number"
                      step="25000"
                      disabled={!includeElevator}
                      value={includeElevator ? elevatorCost : 0}
                      onChange={(e) => setElevatorCost(parseFloat(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        background: includeElevator ? '#ffffff' : '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        color: includeElevator ? '#0f172a' : '#94a3b8',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '0.35rem 0.55rem'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Item 6 & 7: Permits & Engineering + Taxes & Insurance */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.6rem' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#946f23', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{isAr ? 'البند 6: تراخيص واستشارات' : 'Item 6: Permits & Eng'}</span>
                    <span>{formatCompactMoney(feasibilityCalculations.totalPermitsCost, isAr)}</span>
                  </div>
                  <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', marginBottom: '0.2rem' }}>
                    {isAr ? 'رسومات وتراخيص (ج.م/م²):' : 'Permits Rate / sqm:'}
                  </label>
                  <input
                    type="number"
                    step="50"
                    value={permitsCostPerSqm}
                    onChange={(e) => setPermitsCostPerSqm(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#0f172a',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.55rem'
                    }}
                  />
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{isAr ? 'البند 7: ضرائب ورسوم وتأمينات' : 'Item 7: Taxes & Levies'}</span>
                    <span>{formatCompactMoney(feasibilityCalculations.totalTaxesFeesCost, isAr)}</span>
                  </div>
                  <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', marginBottom: '0.2rem' }}>
                    {isAr ? 'تأمينات مقاولات ورسوم (ج.م/م²):' : 'Insurance Rate / sqm:'}
                  </label>
                  <input
                    type="number"
                    step="50"
                    value={taxesFeesCostPerSqm}
                    onChange={(e) => setTaxesFeesCostPerSqm(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#0f172a',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.55rem'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: Target Sale Price per Sqm */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '0.35rem', fontWeight: 800 }}>
                {isAr ? '4. سعر بيع المتر المستهدف في السوق (ج.م/م²):' : '4. Target Selling Price / sqm:'}
              </label>
              <input
                type="number"
                step="500"
                value={targetSalePricePerSqm}
                onChange={(e) => setTargetSalePricePerSqm(Math.max(1, parseFloat(e.target.value) || 0))}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1.5px solid rgba(184, 144, 62, 0.4)',
                  borderRadius: '8px',
                  color: '#946f23',
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  padding: '0.55rem 0.75rem'
                }}
              />
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                {isAr ? `إجمالي المبيعات المتوقعة: ${formatCompactMoney(feasibilityCalculations.projectedGrossRevenue, isAr)}` : `Projected Sales: ${formatCompactMoney(feasibilityCalculations.projectedGrossRevenue, isAr)}`}
              </div>
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
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#946f23', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <TrendingUp size={16} />
                <span>{isAr ? 'نتائج دراسة الجدوى وتوزيع التكاليف الـ 8' : 'Feasibility Results & 8-Category Allocation'}</span>
              </span>
              <span style={{ fontSize: '0.7rem', color: '#15803d', background: 'rgba(21, 128, 61, 0.08)', border: '1px solid rgba(21, 128, 61, 0.25)', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 700 }}>
                {isAr ? 'محسوبة بالمليم' : 'Zero Variance'}
              </span>
            </div>

            {/* Top 4 KPI Summary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.75rem' }}>
              <div style={{
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '10px',
                padding: '0.85rem'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#2563eb', display: 'block', fontWeight: 700 }}>
                  {isAr ? 'تكلفة المتر الكلية (أرض + مباني):' : 'Grand Cost / sqm:'}
                </span>
                <div style={{ marginTop: '0.2rem' }}>
                  {renderMoney(feasibilityCalculations.grandCostPerSqm, 'م²', { size: '1.2rem', weight: 900 })}
                </div>
                <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                  {isAr ? `المباني: ${feasibilityCalculations.constructionCostPerSqm.toLocaleString()} | الأرض: ${feasibilityCalculations.landCostPerBuiltSqm.toLocaleString()}` : 'Construction + Land'}
                </span>
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
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803d', marginTop: '0.2rem' }}>
                  {feasibilityCalculations.developerMarginPercent}%
                </div>
                <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                  {isAr ? 'هامش الربح من إجمالي الاستثمار' : 'Margin on Total Investment'}
                </span>
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.85rem'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                  {isAr ? 'إجمالي مبيعات المشروع المتوقعة:' : 'Projected Sales:'}
                </span>
                <div style={{ marginTop: '0.2rem' }}>
                  {renderMoney(feasibilityCalculations.projectedGrossRevenue, undefined, { size: '1.05rem', weight: 800 })}
                </div>
                <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                  {builtUpAreaSqm} {isAr ? 'م² مباني للبيع' : 'sqm'}
                </span>
              </div>

              <div style={{
                background: 'rgba(21, 128, 61, 0.06)',
                border: '1px solid rgba(21, 128, 61, 0.25)',
                borderRadius: '10px',
                padding: '0.85rem'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#15803d', display: 'block', fontWeight: 800 }}>
                  {isAr ? 'صافي أرباح المطور المتوقعة:' : 'Projected Net Profit:'}
                </span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                  <span style={{ color: '#15803d', fontWeight: 900 }}>+</span>
                  {renderMoney(feasibilityCalculations.projectedNetProfit, undefined, { color: '#15803d', size: '1.05rem', weight: 900 })}
                </div>
                <span style={{ fontSize: '0.65rem', color: '#15803d', marginTop: '0.2rem', display: 'block', fontWeight: 600 }}>
                  {isAr ? 'بعد تغطية كافة المصاريف والأرض' : 'Net Developer Margin'}
                </span>
              </div>
            </div>

            {/* Visual Stacked Progress Bar (All 8 Categories) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>
                <span>{isAr ? 'توزيع بنود التكلفة الإجمالية (مخطط تشريح الاستثمار):' : '8 Categories Cost Distribution:'}</span>
                <span style={{ color: '#946f23', fontWeight: 800 }}>
                  {formatCompactMoney(feasibilityCalculations.grandProjectCost, isAr)}
                </span>
              </div>

              <div style={{
                height: '12px',
                borderRadius: '6px',
                overflow: 'hidden',
                display: 'flex',
                background: '#e2e8f0',
                border: '1px solid #cbd5e1'
              }}>
                {feasibilityCalculations.categoryBreakdown.map((cat) => {
                  if (cat.percentOfTotal <= 0) return null;
                  return (
                    <div
                      key={cat.key}
                      style={{
                        width: `${cat.percentOfTotal}%`,
                        background: cat.color,
                        height: '100%',
                        transition: 'width 0.3s ease'
                      }}
                      title={`${cat.nameAr}: ${cat.percentOfTotal.toFixed(1)}% (${formatCompactMoney(cat.total, isAr)})`}
                    />
                  );
                })}
              </div>
            </div>

            {/* 8-Category Detailed Breakdown Table */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                padding: '0.65rem 0.85rem',
                fontSize: '0.74rem',
                fontWeight: 800,
                color: '#334155',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{isAr ? 'تفصيل بنود التكاليف الـ 8 المعتمدة بالمشروع:' : 'Approved 8-Category Cost Breakdown:'}</span>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  {isAr ? 'تكلفة المتر والإجمالي' : 'Per Sqm & Total'}
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                  <thead>
                    <tr style={{ background: '#ffffff', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.68rem' }}>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'البند المعتمد' : 'Category'}</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'معدل المتر (ج.م/م²)' : 'Rate / sqm'}</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'إجمالي التكلفة' : 'Total (EGP)'}</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>{isAr ? 'النسبة' : '%'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feasibilityCalculations.categoryBreakdown.map((item, idx) => (
                      <tr 
                        key={item.key} 
                        style={{ 
                          borderBottom: idx === 6 ? '2px solid #cbd5e1' : '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? '#ffffff' : 'rgba(248, 250, 252, 0.5)'
                        }}
                      >
                        <td style={{ padding: '0.55rem 0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              {item.nameAr}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem', textAlign: isAr ? 'left' : 'right', fontWeight: 600, color: '#475569' }}>
                          {Math.round(item.costPerSqm).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem', textAlign: isAr ? 'left' : 'right', fontWeight: 800 }}>
                          {renderMoney(item.total, undefined, { weight: 800 })}
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.4rem',
                            borderRadius: '5px',
                            background: 'rgba(15, 23, 42, 0.05)',
                            color: '#334155'
                          }}>
                            {item.percentOfTotal.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Subtotal Construction WIP (Items 1-7) */}
                    <tr style={{ background: 'rgba(184, 144, 62, 0.06)', borderBottom: '1px solid rgba(184, 144, 62, 0.2)', fontWeight: 800 }}>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#946f23' }}>
                        {isAr ? 'إجمالي تكلفة المباني والإنشاءات (WIP - البنود 1 إلى 7):' : 'Total Construction WIP (Items 1-7):'}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: isAr ? 'left' : 'right', color: '#946f23' }}>
                        {feasibilityCalculations.constructionCostPerSqm.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: isAr ? 'left' : 'right' }}>
                        {renderMoney(feasibilityCalculations.totalConstructionWip, undefined, { color: '#946f23', weight: 900 })}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#946f23' }}>
                        {((feasibilityCalculations.totalConstructionWip / feasibilityCalculations.grandProjectCost) * 100).toFixed(1)}%
                      </td>
                    </tr>

                    {/* Grand Total Investment (WIP + Land) */}
                    <tr style={{ background: '#0f172a', color: '#ffffff', fontWeight: 900 }}>
                      <td style={{ padding: '0.75rem', color: '#ffffff' }}>
                        {isAr ? 'إجمالي استثمار وتكلفة المشروع بالكامل (أرض + مباني):' : 'Grand Total Investment (Land + WIP):'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: isAr ? 'left' : 'right', color: '#cbd5e1' }}>
                        {feasibilityCalculations.grandCostPerSqm.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: isAr ? 'left' : 'right' }}>
                        {renderMoney(feasibilityCalculations.grandProjectCost, undefined, { color: '#c5a059', size: '0.85rem', weight: 900 })}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: '#cbd5e1' }}>
                        100%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Estimated Structural Material Quantities */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.73rem'
            }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>
                  {isAr ? 'الكميات التقديرية للخامات الإنشائية:' : 'Estimated Structural Quantities:'}
                </span>
                <span style={{ fontWeight: 800, color: '#0f172a', marginTop: '0.15rem', display: 'block' }}>
                  {feasibilityCalculations.steelTons} {isAr ? 'طن حديد تسليح' : 'tons steel'} • {feasibilityCalculations.concreteVolumeM3} {isAr ? 'م³ خرسانة جاهزة C35' : 'm³ concrete'}
                </span>
              </div>
              <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>
                  {isAr ? 'إجمالي تكلفة الهيكل الإنشائي:' : 'Skeleton Total:'}
                </span>
                <span style={{ fontWeight: 800, color: '#c2410c' }}>
                  {formatCompactMoney(feasibilityCalculations.totalCivilStructureCost, isAr)}
                </span>
              </div>
            </div>

            {/* Export CTA Button */}
            <button
              type="button"
              onClick={handleExportFeasibilityExcel}
              style={{
                background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                border: 'none',
                color: '#ffffff',
                padding: '0.8rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                boxShadow: '0 4px 14px rgba(21, 128, 61, 0.25)',
                transition: 'all 0.2s ease',
                marginTop: 'auto'
              }}
            >
              <FileSpreadsheet size={16} />
              <span>{isExportingExcel ? (isAr ? 'جاري التصدير...' : 'Exporting...') : (isAr ? 'تصدير دراسة الجدوى إكسيل معتمد (شاملة الـ 8 بنود)' : 'Export Full Feasibility Excel (8 Categories)')}</span>
            </button>

          </div>

        </div>
      )}

      {/* Screen Preview Modal */}
      {showPrintPreview && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            overflowY: 'auto'
          }}
          onClick={() => setShowPrintPreview(false)}
        >
          <div 
            style={{ 
              maxWidth: '900px', 
              width: '100%', 
              maxHeight: '94vh', 
              overflowY: 'auto',
              borderRadius: '12px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <ZFPrintDocumentLayout
              documentTitle={calculatorMode === 'BUILT_PROPERTY_PRICING' 
                ? (isAr ? 'دراسة تسعير العقار وتكلفة المباني الفعلية' : 'Built Property Pricing Analysis')
                : (isAr ? 'دراسة جدوى وتكاليف مشروع إنشائي جديد' : 'New Project Feasibility Study')
              }
              documentSubtitle={calculatorMode === 'BUILT_PROPERTY_PRICING'
                ? (isAr ? `عقار: ${selectedProperty?.title_ar || 'وحدة'} (${selectedProperty?.area_sqm || 0} م²)` : `Property: ${selectedProperty?.title_en || 'Unit'}`)
                : (isAr ? `مشروع: مساحة مباني ${builtUpAreaSqm} م² (${floorsCount} أدوار)` : `New Project: ${builtUpAreaSqm} sqm (${floorsCount} floors)`)
              }
              voucherCode={calculatorMode === 'BUILT_PROPERTY_PRICING'
                ? `PRC-${(selectedProperty?.id || 'AUTO').slice(0, 8).toUpperCase()}-${new Date().getFullYear()}`
                : `FSB-${builtUpAreaSqm}M-${new Date().getFullYear()}`
              }
              date={new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
              onClose={() => setShowPrintPreview(false)}
              isAr={isAr}
            >
              {calculatorMode === 'BUILT_PROPERTY_PRICING' ? printableBuiltPricingBody : printableFeasibilityBody}
            </ZFPrintDocumentLayout>
          </div>
        </div>
      )}

      {/* Hidden print container: rendered for @media print */}
      <div className="zf-print-only">
        <ZFPrintDocumentLayout
          documentTitle={calculatorMode === 'BUILT_PROPERTY_PRICING' 
            ? (isAr ? 'دراسة تسعير العقار وتكلفة المباني الفعلية' : 'Built Property Pricing Analysis')
            : (isAr ? 'دراسة جدوى وتكاليف مشروع إنشائي جديد' : 'New Project Feasibility Study')
          }
          documentSubtitle={calculatorMode === 'BUILT_PROPERTY_PRICING'
            ? (isAr ? `عقار: ${selectedProperty?.title_ar || 'وحدة'} (${selectedProperty?.area_sqm || 0} م²)` : `Property: ${selectedProperty?.title_en || 'Unit'}`)
            : (isAr ? `مشروع: مساحة مباني ${builtUpAreaSqm} م² (${floorsCount} أدوار)` : `New Project: ${builtUpAreaSqm} sqm (${floorsCount} floors)`)
          }
          voucherCode={calculatorMode === 'BUILT_PROPERTY_PRICING'
            ? `PRC-${(selectedProperty?.id || 'AUTO').slice(0, 8).toUpperCase()}-${new Date().getFullYear()}`
            : `FSB-${builtUpAreaSqm}M-${new Date().getFullYear()}`
          }
          date={new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
          isAr={isAr}
        >
          {calculatorMode === 'BUILT_PROPERTY_PRICING' ? printableBuiltPricingBody : printableFeasibilityBody}
        </ZFPrintDocumentLayout>
      </div>

    </div>
  );
};
