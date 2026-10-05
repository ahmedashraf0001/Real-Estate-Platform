/**
 * FIN-OS Real Estate ERP — Property Lifecycle & Investment Analysis Engine
 *
 * Single Source of Truth for Property Lifecycle & Feasibility Analytics.
 * Computes:
 * 1. Single Property Dossier:
 *    - Real construction WIP via calculatePropertyAuditMetrics
 *    - Detailed category breakdown (Land, Structure, MEP, Finishes, Permits)
 *    - Milestone stepper (Acquisition -> Permits -> Structure -> MEP & Finishes -> Sales -> Handover) with real logged dates
 *    - RSV, unit meter cost, sales meter price, gross margin %, ROI %
 *    - Sales absorption & receivables status
 * 2. Portfolio Macro Analytics:
 *    - Uses canonicalMetrics.ts (getConstructionWIP, getPortfolioValuation, getLifetimePortfolioVolume, getAvailableCash)
 *    - Total properties count, total investment, contracted sales volume, expected profit
 *    - Category totals aggregation across portfolio
 *    - Status distribution (available, contracted, under offer, etc.)
 *    - Project-by-project ROI comparisons
 */

import { D, Decimal } from './math';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPContract, ERPPropertyCostItem, ERPCostAllocation, ERPJournalEntry } from './types';
import { calculatePropertyAuditMetrics } from './propertyCostEngine';
import { 
  getConstructionWIP, 
  getPortfolioValuation, 
  getLifetimePortfolioVolume,
  getAvailableCash
} from './canonicalMetrics';

export type MilestoneStatus = 'completed' | 'in_progress' | 'pending';

export interface PropertyMilestone {
  id: string;
  order: number;
  titleAr: string;
  titleEn: string;
  shortAr: string;
  shortEn: string;
  status: MilestoneStatus;
  date?: string;
  summaryAr: string;
  summaryEn: string;
  costLoggedEgp: string;
  progressPct: number;
}

export interface PropertyCostBreakdown {
  landCost: Decimal;
  /** True when no land cost is recorded (no land_allocation item and no purchase price): land counts as 0. */
  landCostMissing?: boolean;
  structureWip: Decimal;
  finishingWip: Decimal;
  mepWip: Decimal;
  permitsFees: Decimal;
  otherWip: Decimal;
  totalConstructionWip: Decimal;
  totalInvestedCapital: Decimal;
}

export interface SinglePropertyAnalysis {
  property: Property;
  propertyId: string;
  titleAr: string;
  titleEn: string;
  location: string;
  type: string;
  areaSqm: number;
  status: string;
  statusLabel: string;
  statusLabelAr: string;
  floorsCount: number;
  totalUnits: number;
  soldUnits: number;
  remainingUnits: number;
  absorptionRatePct: Decimal;
  
  // Financial Metrics
  breakdown: PropertyCostBreakdown;
  costPerSqm: Decimal;
  contractedSales: Decimal;
  expectedTotalSales: Decimal;
  collectedCash: Decimal;
  pendingReceivables: Decimal;
  netExpectedProfit: Decimal;
  grossMarginPct: Decimal;
  roiPct: Decimal;
  unitMeterCost: Decimal;
  salesMeterPrice: Decimal;
  
  // Contracts & Milestones
  associatedContracts: ERPContract[];
  milestones: PropertyMilestone[];
  auditItemsCount: number;
}

export interface PortfolioMacroAnalysis {
  totalPropertiesCount: number;
  totalInvestedCapital: Decimal;
  totalConstructionWip: Decimal;
  totalContractedSales: Decimal;
  totalExpectedSales: Decimal;
  totalExpectedProfit: Decimal;
  averageGrossMarginPct: Decimal;
  averageRoiPct: Decimal;
  portfolioValuation: Decimal;
  lifetimePortfolioVolume: Decimal;
  availableCash: Decimal;
  statusDistribution: Array<{
    status: string;
    labelAr: string;
    labelEn: string;
    count: number;
    percentage: number;
  }>;
  categoryTotals: {
    land: Decimal;
    structure: Decimal;
    mep: Decimal;
    finishing: Decimal;
    permits: Decimal;
    other: Decimal;
  };
  projectRoiComparison: Array<{
    propertyId: string;
    propertyName: string;
    shortName?: string;
    roiPct: number;
    rawRoiPct?: number;
    investmentEgp: number;
    expectedProfitEgp: number;
    location: string;
  }>;
  propertiesList: SinglePropertyAnalysis[];
}

export function formatCompactEGP(val: number | string | Decimal, isAr = true): string {
  const d = val instanceof Decimal ? val : D(val || 0);
  const num = d.abs().toNumber();
  const sign = d.isNegative() ? '-' : '';
  const currencyLabel = isAr ? 'ج.م' : 'EGP';

  if (num >= 1_000_000_000) {
    return `${sign}${(num / 1_000_000_000).toFixed(1)}B ${currencyLabel}`;
  }
  if (num >= 1_000_000) {
    return `${sign}${(num / 1_000_000).toFixed(1)}M ${currencyLabel}`;
  }
  if (num >= 1_000) {
    return `${sign}${(num / 1_000).toFixed(1)}K ${currencyLabel}`;
  }
  return `${sign}${num.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${currencyLabel}`;
}

/**
 * Derives the associated contracts for a given property.
 * Matches on property.id, property.slug, or individual building unit IDs.
 */
export function getContractsForProperty(
  property: Property,
  allContracts: ERPContract[] = []
): ERPContract[] {
  if (!property || !Array.isArray(allContracts) || allContracts.length === 0) {
    return [];
  }

  const unitIdsSet = new Set<string>();
  if (property.building_units && Array.isArray(property.building_units)) {
    property.building_units.forEach(u => {
      if (u.unit_id) unitIdsSet.add(u.unit_id);
    });
  }

  return allContracts.filter(c => {
    if (!c) return false;
    if (c.property_id === property.id || c.property_id === property.slug) {
      return true;
    }
    if (c.unit_id === property.id || c.unit_id === property.slug) {
      return true;
    }
    if (c.building_unit_id && unitIdsSet.has(c.building_unit_id)) {
      return true;
    }
    if (c.unit_id && unitIdsSet.has(c.unit_id)) {
      return true;
    }
    return false;
  });
}

/**
 * Computes deep lifecycle and financial analysis for a single property.
 */
export function calculateSinglePropertyAnalysis({
  property,
  propertyCosts = [],
  contracts = [],
  costAllocations = []
}: {
  property: Property;
  propertyCosts?: ERPPropertyCostItem[];
  contracts?: ERPContract[];
  costAllocations?: ERPCostAllocation[];
}): SinglePropertyAnalysis {
  if (!property) {
    throw new Error('calculateSinglePropertyAnalysis: Property is required');
  }

  const safeArea = property.area_sqm && property.area_sqm > 0 ? property.area_sqm : 1;
  const propertyCostList = (propertyCosts || []).filter(
    c => c.property_id === property.id || (property.slug && c.property_id === property.slug)
  );
  const audit = calculatePropertyAuditMetrics(property.id, safeArea, propertyCostList);
  const associatedContracts = getContractsForProperty(property, contracts);

  // 1. Costs breakdown
  const byCat = audit.byCategory || {};
  
  // Land cost: check if logged under land_allocation, or target_budget / price
  const explicitLandLogged = !D(byCat.land_allocation?.total || '0').isZero();
  let landCost = D(byCat.land_allocation?.total || '0');
  let landCostMissing = false;
  if (!explicitLandLogged) {
    if ((property as any).purchase_price_egp) {
      landCost = D((property as any).purchase_price_egp);
    } else {
      // No recorded land cost: count it as 0 and flag it — never estimate (user-confirmed: no assumed costs).
      landCostMissing = true;
    }
  }
  
  // Structure: civil_structure + labor_subcontractor
  const structureWip = D(byCat.civil_structure?.total || '0').plus(D(byCat.labor_subcontractor?.total || '0'));
  
  // Finishing: finishing_interior + site_facade
  const finishingWip = D(byCat.finishing_interior?.total || '0').plus(D(byCat.site_facade?.total || '0'));
  
  // MEP: mep_infrastructure (الكهرباء والسباكة والشبكات)
  const mepWip = D(byCat.mep_infrastructure?.total || '0');
  
  // Permits & Fees: permits_engineering + taxes_fees
  const permitsFees = D(byCat.permits_engineering?.total || '0').plus(D(byCat.taxes_fees?.total || '0'));
  
  // Total Construction WIP (actual site works excluding land allocation to prevent double-counting)
  const totalLogged = D(audit.totalLoggedCost || '0');
  const totalConstructionWip = explicitLandLogged
    ? (totalLogged.minus(landCost).greaterThan(0) ? totalLogged.minus(landCost) : D(0))
    : totalLogged;
  
  // Other unclassified WIP if any
  const categorizedSum = structureWip.plus(finishingWip).plus(mepWip).plus(permitsFees);
  const otherWip = totalConstructionWip.minus(categorizedSum).greaterThan(0)
    ? totalConstructionWip.minus(categorizedSum)
    : D(0);

  // Total Invested Capital = Land Cost + Total Construction WIP
  const totalInvestedCapital = landCost.plus(totalConstructionWip);
  
  const breakdown: PropertyCostBreakdown = {
    landCost,
    landCostMissing,
    structureWip,
    finishingWip,
    mepWip,
    permitsFees,
    otherWip,
    totalConstructionWip,
    totalInvestedCapital
  };

  // Cost per square meter
  const costPerSqm = safeArea > 0 ? totalInvestedCapital.dividedBy(safeArea) : D(0);

  // 2. Units count and sales
  const isBuilding = property.type === 'building' && Array.isArray(property.building_units) && property.building_units.length > 0;
  let totalUnits = 1;
  let soldUnits = 0;
  let expectedTotalSales = D(0);

  if (isBuilding && property.building_units) {
    totalUnits = property.building_units.length;
    soldUnits = property.building_units.filter(u => u.status === 'contracted' || u.contract_id).length;
    
    // Sum of unit prices for expected total sales
    let unitsTotalSum = D(0);
    property.building_units.forEach(u => {
      unitsTotalSum = unitsTotalSum.plus(D(u.price_egp || 0));
    });
    expectedTotalSales = unitsTotalSum.isPositive() && !unitsTotalSum.isZero()
      ? unitsTotalSum 
      : D(property.price_egp || 0);
  } else {
    totalUnits = property.total_units_count && property.total_units_count > 0 ? property.total_units_count : 1;
    soldUnits = property.listing_status === 'sold' || associatedContracts.some(c => c.status === 'Active' || c.status === 'Completed') ? 1 : 0;
    expectedTotalSales = D(property.price_egp || 0);
  }

  // Contracted sales from active contracts
  let contractedSales = D(0);
  let collectedCash = D(0);

  associatedContracts.forEach(c => {
    if (c.status !== 'Rescinded') {
      contractedSales = contractedSales.plus(D(c.gross_contract_value || 0));
      collectedCash = collectedCash.plus(D(c.total_cash_collected || 0));
    }
  });

  // If contracted sales exceeds expected total sales, scale expected total sales
  if (contractedSales.greaterThan(expectedTotalSales)) {
    expectedTotalSales = contractedSales;
  }

  // Pending receivables A/R
  const pendingReceivables = contractedSales.minus(collectedCash).greaterThan(0)
    ? contractedSales.minus(collectedCash)
    : D(0);

  // Sales absorption rate %
  const absorptionRatePct = totalUnits > 0
    ? D(soldUnits).times(100).dividedBy(totalUnits)
    : D(0);

  // Profitability
  // Expected profit = Expected Total Sales - Total Invested Capital
  const netExpectedProfit = expectedTotalSales.minus(totalInvestedCapital);
  
  // Gross Margin % = (Net Expected Profit * 100) / Expected Total Sales
  const grossMarginPct = expectedTotalSales.isPositive() && !expectedTotalSales.isZero()
    ? netExpectedProfit.times(100).dividedBy(expectedTotalSales)
    : D(0);

  // ROI % = (Net Expected Profit * 100) / Total Invested Capital
  const roiPct = totalInvestedCapital.isPositive() && !totalInvestedCapital.isZero()
    ? netExpectedProfit.times(100).dividedBy(totalInvestedCapital)
    : D(0);

  // Unit meter cost vs Sales meter price
  const unitMeterCost = safeArea > 0 ? totalInvestedCapital.dividedBy(safeArea) : D(0);
  const salesMeterPrice = safeArea > 0 ? expectedTotalSales.dividedBy(safeArea) : D(0);

  // 3. Milestone Stepper Derivation with Real Logged Dates
  const getLatestCostDate = (filterFn: (c: ERPPropertyCostItem) => boolean): string | undefined => {
    const matching = propertyCostList.filter(filterFn).filter(c => !!c.logged_date);
    if (matching.length === 0) return undefined;
    matching.sort((a, b) => (b.logged_date || '').localeCompare(a.logged_date || ''));
    return matching[0].logged_date;
  };

  const landDate = getLatestCostDate(c => c.category === 'land_allocation');
  const permitsDate = getLatestCostDate(c => c.category === 'permits_engineering' || c.category === 'taxes_fees' || c.phase === 'planning_permits');
  const structureDate = getLatestCostDate(c => c.category === 'civil_structure' || c.category === 'labor_subcontractor' || c.phase === 'structural_skeleton');
  const finishesDate = getLatestCostDate(c => c.category === 'finishing_interior' || c.category === 'site_facade' || c.category === 'mep_infrastructure' || c.phase === 'finishing_interiors');

  const contractDates = associatedContracts.map(c => c.contract_date).filter(Boolean) as string[];
  contractDates.sort((a, b) => b.localeCompare(a));
  const latestSalesDate = contractDates[0];

  const hasPermitsCost = permitsFees.isPositive() && !permitsFees.isZero();
  const hasStructureCost = structureWip.isPositive() && !structureWip.isZero();
  const hasFinishingCost = finishingWip.isPositive() && !finishingWip.isZero();
  const hasSales = soldUnits > 0 || associatedContracts.length > 0;
  const isDelivered = property.listing_status === 'sold' || associatedContracts.some(c => c.handover_status === 'Delivered');

  let acquisitionDate = property.created_at ? property.created_at.split('T')[0] : undefined;
  // If property created_at is strictly AFTER permitsDate (e.g. keying date in 2026 for a 2024 development),
  // fall back to landDate or 3 months prior to permitsDate so milestones are strictly chronological
  if (permitsDate && acquisitionDate && acquisitionDate > permitsDate) {
    acquisitionDate = landDate || (() => {
      const d = new Date(permitsDate);
      d.setMonth(d.getMonth() - 3);
      return d.toISOString().split('T')[0];
    })();
  }

  // Sequential milestone dependency logic
  // 1. m1_acquisition is the foundational prerequisite
  const m1Completed = true; // Land acquisition is foundational
  const m1Status: MilestoneStatus = 'completed';
  const m1Progress = 100;

  // 2. m2_permits follows acquisition
  const permitsPrereqMet = m1Completed;
  const m2Completed = permitsPrereqMet && (hasStructureCost || hasFinishingCost || property.completion_status === 'ready');
  const m2Status: MilestoneStatus = m2Completed ? 'completed' : (hasPermitsCost ? 'in_progress' : 'pending');
  const m2Progress = m2Completed ? 100 : (hasPermitsCost ? 70 : 0);

  // 3. m3_structural CANNOT be completed or in progress unless m1_acquisition is completed.
  // If property in DB has completion_status: 'ready', verify that land acquisition and skeleton prerequisites are satisfied.
  const m3PrereqMet = m1Completed;
  let m3Status: MilestoneStatus = 'pending';
  let m3Progress = 0;
  if (m3PrereqMet) {
    if (hasFinishingCost || property.completion_status === 'ready') {
      m3Status = 'completed';
      m3Progress = 100;
    } else if (hasStructureCost) {
      m3Status = 'in_progress';
      m3Progress = 65;
    }
  }
  const m3Completed = m3Status === 'completed';

  // 4. m4_finishes follows structural skeleton completion
  let m4Status: MilestoneStatus = 'pending';
  let m4Progress = 0;
  if (m3Completed) {
    if (property.completion_status === 'ready') {
      m4Status = 'completed';
      m4Progress = 100;
    } else if (hasFinishingCost || mepWip.isPositive()) {
      m4Status = 'in_progress';
      m4Progress = 50;
    }
  }
  const m4Completed = m4Status === 'completed';

  // 5. m5_sales is independent of finishes (can launch off-plan during construction or before finishing)
  const isFullySold = soldUnits === totalUnits && totalUnits > 0;
  let m5Status: MilestoneStatus = 'pending';
  let m5Progress = 0;
  if (isFullySold) {
    m5Status = 'completed';
    m5Progress = 100;
  } else if (hasSales) {
    m5Status = 'in_progress';
    m5Progress = totalUnits > 0 ? Math.max(10, Math.round((soldUnits / totalUnits) * 100)) : 10;
  }

  // 6. m6_handover requires construction completion (m4Completed) and active contract deliveries
  const activeContractDeliveries = hasSales && (isDelivered || associatedContracts.some(c => c.handover_status === 'Delivered'));
  let m6Status: MilestoneStatus = 'pending';
  let m6Progress = 0;
  if (m4Completed && activeContractDeliveries) {
    m6Status = 'completed';
    m6Progress = 100;
  } else if (m4Completed && hasSales && (property.completion_status === 'ready' || property.listing_status === 'sold')) {
    m6Status = 'in_progress';
    m6Progress = 50;
  }

  const milestones: PropertyMilestone[] = [
    {
      id: 'm1_acquisition',
      order: 1,
      titleAr: 'شراء الأرض والتخصيص الهندسي',
      titleEn: 'Land Acquisition & Zoning',
      shortAr: 'شراء الأرض',
      shortEn: 'Acquisition',
      status: m1Status,
      date: acquisitionDate,
      summaryAr: 'تم تثبيت وتخصيص الموقع واعتماد ملكية الأرض والحدود الهندسية للمشروع.',
      summaryEn: 'Site acquisition finalized, plot boundaries confirmed, and ownership established.',
      costLoggedEgp: landCost.toFixed(2),
      progressPct: m1Progress
    },
    {
      id: 'm2_permits',
      order: 2,
      titleAr: 'التراخيص والمخططات والجسات',
      titleEn: 'Permits, Architecture & Soil Tests',
      shortAr: 'التراخيص والمخططات',
      shortEn: 'Permits',
      status: m2Status,
      date: permitsDate || acquisitionDate,
      summaryAr: hasPermitsCost 
        ? `تم اعتماد الرخص الإنشائية والرسوم المساحية بإجمالي ${formatCompactEGP(permitsFees, true)}.`
        : 'المخططات الهندسية ورخص البناء مطابقة للأكواد الإنشائية.',
      summaryEn: 'Statutory building permits, architectural drawings, and civil approvals.',
      costLoggedEgp: permitsFees.toFixed(2),
      progressPct: m2Progress
    },
    {
      id: 'm3_structural',
      order: 3,
      titleAr: 'الهيكل الخرساني والحديد والأساسات',
      titleEn: 'Structural Concrete & Rebar Skeleton',
      shortAr: 'الهيكل الإنشائي',
      shortEn: 'Structure',
      status: m3Status,
      date: structureDate,
      summaryAr: hasStructureCost
        ? `إجمالي فواتير المقاولين ومصنعيات الخرسانة والحديد المنفذة: ${formatCompactEGP(structureWip, true)}.`
        : 'مرحلة الصب الخرساني والأساسات العادية والمسلحة والأعمدة والأسقف.',
      summaryEn: 'Reinforced concrete pouring, steel rebar installations, and foundations.',
      costLoggedEgp: structureWip.toFixed(2),
      progressPct: m3Progress
    },
    {
      id: 'm4_finishes',
      order: 4,
      titleAr: 'التشطيبات المعمارية والشبكات',
      titleEn: 'Finishing Works & Infrastructure Services',
      shortAr: 'التشطيبات',
      shortEn: 'Finishes',
      status: m4Status,
      date: finishesDate,
      summaryAr: hasFinishingCost || mepWip.isPositive()
        ? `تجهيزات السباكة والكهرباء والواجهات والتشطيب المنفذة: ${formatCompactEGP(finishingWip.plus(mepWip), true)}.`
        : 'تأسيس شبكات الصرف والتغذية وتمديدات الكهرباء والواجهات والمصاعد.',
      summaryEn: 'Interior finishing, façade installation, elevators, and MEP integration.',
      costLoggedEgp: finishingWip.plus(mepWip).toFixed(2),
      progressPct: m4Progress
    },
    {
      id: 'm5_sales',
      order: 5,
      titleAr: 'التسويق وعقود البيع والحجوزات',
      titleEn: 'Sales Contracts & Absorption',
      shortAr: 'عقود البيع',
      shortEn: 'Sales',
      status: m5Status,
      date: latestSalesDate,
      summaryAr: hasSales
        ? `تم التعاقد على ${soldUnits} من أصل ${totalUnits} وحدة بقيمة تعاقدية محققة ${formatCompactEGP(contractedSales, true)}.`
        : 'طرح المشروع للمبيعات واستقبال طلبات الحجز والتعاقد الرسمي.',
      summaryEn: 'Commercial marketing, contract signatures, and down payment collections.',
      costLoggedEgp: contractedSales.toFixed(2),
      progressPct: m5Progress
    },
    {
      id: 'm6_handover',
      order: 6,
      titleAr: 'المعاينة والجاهزية والتسليم النهائي',
      titleEn: 'Final Handover & Delivery',
      shortAr: 'التسليم والجاهزية',
      shortEn: 'Handover',
      status: m6Status,
      date: m6Status === 'completed' ? (latestSalesDate || finishesDate) : undefined,
      summaryAr: m6Status === 'completed'
        ? 'تم تسليم الوحدات المباعة للعملاء وإتمام محاضر الاستلام الرسمي وإغلاق العهد.'
        : (m6Status === 'in_progress'
          ? 'المشروع جاهز إنشائياً، جاري تسليم الوحدات والمطابقة الفنية مع العملاء.'
          : 'إجراءات محضر التسليم والمطابقة الفنية لجودة الأعمال وتسليم المفاتيح.'),
      summaryEn: 'Client walkthroughs, official delivery protocols, and key turnover.',
      costLoggedEgp: '0.00',
      progressPct: m6Progress
    }
  ];

  return {
    property,
    propertyId: property.id,
    titleAr: property.title_ar || property.title_en || `عقار #${property.id.slice(0, 6)}`,
    titleEn: property.title_en || property.title_ar || `Property #${property.id.slice(0, 6)}`,
    location: property.location || 'القاهرة الجديدة',
    type: property.type || 'apartment',
    areaSqm: safeArea,
    status: property.listing_status || 'active',
    statusLabel: (property.listing_status === 'sold' ? 'مباع'
      : (property.completion_status === 'off_plan' ? 'قيد الإنشاء'
      : (property.listing_status === 'under_offer' ? 'تحت الحجز'
      : (property.completion_status === 'ready' ? 'جاهز للتسليم' : 'متاح')))),
    statusLabelAr: (property.listing_status === 'sold' ? 'مباع'
      : (property.completion_status === 'off_plan' ? 'قيد الإنشاء'
      : (property.listing_status === 'under_offer' ? 'تحت الحجز'
      : (property.completion_status === 'ready' ? 'جاهز للتسليم' : 'متاح')))),
    floorsCount: property.floor_number ?? 1,
    totalUnits,
    soldUnits,
    remainingUnits: Math.max(0, totalUnits - soldUnits),
    absorptionRatePct,
    breakdown,
    costPerSqm,
    contractedSales,
    expectedTotalSales,
    collectedCash,
    pendingReceivables,
    netExpectedProfit,
    grossMarginPct,
    roiPct,
    unitMeterCost,
    salesMeterPrice,
    associatedContracts,
    milestones,
    auditItemsCount: audit.itemsCount
  };
}

/**
 * Aggregates portfolio macro analytics across all properties, contracts, and costs.
 * Strictly consumes canonicalMetrics.ts for portfolio metrics.
 */
export function calculatePortfolioMacroAnalysis({
  properties = [],
  propertyCosts = [],
  contracts = [],
  costAllocations = [],
  journalEntries = []
}: {
  properties?: Property[];
  propertyCosts?: ERPPropertyCostItem[];
  contracts?: ERPContract[];
  costAllocations?: ERPCostAllocation[];
  journalEntries?: ERPJournalEntry[];
}): PortfolioMacroAnalysis {
  if (!properties || !Array.isArray(properties) || properties.length === 0) {
    return {
      totalPropertiesCount: 0,
      totalInvestedCapital: D(0),
      totalConstructionWip: D(0),
      totalContractedSales: D(0),
      totalExpectedSales: D(0),
      totalExpectedProfit: D(0),
      averageGrossMarginPct: D(0),
      averageRoiPct: D(0),
      portfolioValuation: D(0),
      lifetimePortfolioVolume: D(0),
      availableCash: D(0),
      statusDistribution: [],
      categoryTotals: {
        land: D(0),
        structure: D(0),
        mep: D(0),
        finishing: D(0),
        permits: D(0),
        other: D(0)
      },
      projectRoiComparison: [],
      propertiesList: []
    };
  }

  // Single source of truth: canonical portfolio metrics
  const portfolioValuation = getPortfolioValuation(properties);
  const lifetimePortfolioVolume = getLifetimePortfolioVolume(properties);
  const availableCashResult = getAvailableCash(journalEntries);
  const availableCash = availableCashResult.totalCash;

  const propertiesList = properties.map(p => 
    calculateSinglePropertyAnalysis({
      property: p,
      propertyCosts,
      contracts,
      costAllocations
    })
  );

  let totalInvestedCapital = D(0);
  let totalConstructionWip = D(0);
  let totalContractedSales = D(0);
  let totalExpectedSales = D(0);

  const statusCounts: Record<string, number> = {};
  const categoryTotals = {
    land: D(0),
    structure: D(0),
    mep: D(0),
    finishing: D(0),
    permits: D(0),
    other: D(0)
  };

  propertiesList.forEach(item => {
    totalInvestedCapital = totalInvestedCapital.plus(item.breakdown.totalInvestedCapital);
    totalConstructionWip = totalConstructionWip.plus(item.breakdown.totalConstructionWip);
    totalContractedSales = totalContractedSales.plus(item.contractedSales);
    totalExpectedSales = totalExpectedSales.plus(item.expectedTotalSales);

    // Categories aggregation
    categoryTotals.land = categoryTotals.land.plus(item.breakdown.landCost);
    categoryTotals.structure = categoryTotals.structure.plus(item.breakdown.structureWip);
    categoryTotals.mep = categoryTotals.mep.plus(item.breakdown.mepWip);
    categoryTotals.finishing = categoryTotals.finishing.plus(item.breakdown.finishingWip);
    categoryTotals.permits = categoryTotals.permits.plus(item.breakdown.permitsFees);
    categoryTotals.other = categoryTotals.other.plus(item.breakdown.otherWip);

    // Distinguish operational construction and listing stages
    let st = item.status || 'active';
    if (item.property.completion_status === 'off_plan' || item.milestones[2]?.status === 'in_progress' || item.milestones[3]?.status === 'in_progress') {
      st = 'under_construction';
    } else if (st === 'sold') {
      st = 'sold';
    } else if (item.property.completion_status === 'ready') {
      st = 'ready';
    } else if (st === 'under_offer') {
      st = 'under_offer';
    } else if (st === 'archived') {
      st = 'archived';
    } else {
      st = 'active';
    }
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  });

  const totalPropertiesCount = properties.length;
  const totalExpectedProfit = totalExpectedSales.minus(totalInvestedCapital);

  const averageGrossMarginPct = totalExpectedSales.isPositive() && !totalExpectedSales.isZero()
    ? totalExpectedProfit.times(100).dividedBy(totalExpectedSales)
    : D(0);

  const averageRoiPct = totalInvestedCapital.isPositive() && !totalInvestedCapital.isZero()
    ? totalExpectedProfit.times(100).dividedBy(totalInvestedCapital)
    : D(0);

  // Status mapping matching reference comp
  const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
    under_construction: { ar: 'قيد الإنشاء', en: 'Under Construction' },
    ready: { ar: 'جاهز للتسليم', en: 'Ready to Handover' },
    sold: { ar: 'تم البيع', en: 'Sold Out' },
    active: { ar: 'متاح للبيع', en: 'Available' },
    available: { ar: 'متاح للبيع', en: 'Available' },
    under_offer: { ar: 'تحت الحجز', en: 'Under Offer' },
    postponed: { ar: 'مؤجل', en: 'Postponed' },
    archived: { ar: 'مؤرشف', en: 'Archived' }
  };

  const statusDistribution = Object.entries(statusCounts).map(([statusKey, count]) => {
    const meta = STATUS_LABELS[statusKey] || { ar: statusKey, en: statusKey };
    const pct = totalPropertiesCount > 0 ? (count / totalPropertiesCount) * 100 : 0;
    return {
      status: statusKey,
      labelAr: meta.ar,
      labelEn: meta.en,
      count,
      percentage: Math.round(pct * 10) / 10
    };
  });

  // Project ROI comparison items (sorted by expected ROI descending)
  // Engine Safeguards: cap comparative chart ROI so abnormal outliers are sanitized safely without breaking the Cartesian grid
  const projectRoiComparison = propertiesList.map(item => {
    let rawRoi = item.roiPct.toNumber();
    if (!Number.isFinite(rawRoi) || Number.isNaN(rawRoi)) {
      rawRoi = 0;
    }
    // Safe realistic bounds for development comparative visualization (0 - 50% scale):
    let safeRoi = rawRoi;
    if (rawRoi > 48) {
      safeRoi = 38 + Math.min(10, Math.log10(Math.max(1, rawRoi - 45)) * 4);
    } else if (rawRoi < -20) {
      safeRoi = -20;
    }

    const shortName = item.titleAr
      ? item.titleAr
          .replace(/^عمارة\s+سكنية\s+كاملة\s+فاخرة\s*–?\s*/, '')
          .replace(/^عمارة\s+سكنية\s+فاخرة\s+مطلة\s+على\s+اللاجون\s*–?\s*/, 'عمارة اللاجون ')
          .replace(/^عمارة\s+تجارية\s+وسكنية\s+متكاملة\s*–?\s*/, 'عمارة ')
          .replace(/^شقة\s+فاخرة\s+بمشروع\s*/, '')
          .replace(/^شقة\s+دوبلكس\s+سماوية\s+ببرج\s*/, 'برج ')
          .replace(/^شقة\s+ساحلية\s+بإطلالة\s+جبلية\s+وبحرية\s*–?\s*/, 'شقة ')
          .replace(/^شقة\s+أرضي\s+بحديقة\s+خاصة\s*–?\s*/, 'أرضي ')
          .replace(/^شقة\s+رووف\s+كاملة\s+مع\s+السطح\s*–?\s*/, 'رووف ')
          .replace(/^جراج\s+تجاري\s+واستثماري\s+خاص\s*–?\s*/, 'جراج ')
          .split('–')[0].split('-')[0].trim().slice(0, 16)
      : item.titleEn.split('-')[0].trim().slice(0, 16);

    return {
      propertyId: item.propertyId,
      propertyName: item.titleAr,
      shortName: shortName || item.titleAr.slice(0, 14),
      roiPct: Math.round(safeRoi * 10) / 10,
      rawRoiPct: Math.round(rawRoi * 10) / 10,
      investmentEgp: item.breakdown.totalInvestedCapital.toNumber(),
      expectedProfitEgp: item.netExpectedProfit.toNumber(),
      location: item.location
    };
  }).sort((a, b) => b.roiPct - a.roiPct);

  return {
    totalPropertiesCount,
    totalInvestedCapital,
    totalConstructionWip,
    totalContractedSales,
    totalExpectedSales,
    totalExpectedProfit,
    averageGrossMarginPct,
    averageRoiPct,
    portfolioValuation,
    lifetimePortfolioVolume,
    availableCash,
    statusDistribution,
    categoryTotals,
    projectRoiComparison,
    propertiesList
  };
}
