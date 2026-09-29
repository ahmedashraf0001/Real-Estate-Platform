/**
 * Zakaria Farid Real Estate ERP — Commercial Sale Models & Margin Exposure Engine
 *
 * Implements strict business model distinction:
 * 1. CASH_ON_DELIVERY (على المفتاح): Completed inventory sold at market price; zero off-plan cost risk.
 * 2. OFF_PLAN_INSTALLMENTS (البيع تحت الإنشاء بالتقسيط): Sold early against cost estimates;
 *    subject to inflation, material price escalation, and margin erosion during delivery cycle.
 *
 * Invariants Enforced:
 * - Read-only risk signals: NEVER automatically modifies contracted customer dues or price.
 * - Negative signal distinction: CLEAR separation between 'REVIEW_REQUIRED' and 'LOSS_EXPOSURE'.
 * - Default to UNKNOWN: Missing or stale estimates (>90 days) or unclassified models default to 'UNKNOWN', NEVER 'HEALTHY'.
 * - Zero Synthetic Data: Evaluates actual incurred site costs only (excluding synthetic baselines).
 * - Transparent cost attribution: Auditable share of common and land costs attributed to individual units.
 */

import { D, Decimal } from './math';
import {
  ERPContract,
  ERPPropertyCostItem,
  ERPUnitEstimate,
  MarginExposureConfig,
  MarginExposureResult,
  MarginExposureSignal,
  PortfolioMarginExposureSummary,
  SaleModel,
} from './types';
import { calculateCostItemEffectiveTotals } from './propertyCostEngine';
import { Property } from '@/lib/supabase/types';

export const DEFAULT_MARGIN_CONFIG: Required<MarginExposureConfig> = {
  reviewThresholdPercent: 20, // Warning threshold if margin drops below 20%
  staleEstimateDaysThreshold: 90, // Estimates older than 90 days are considered stale
};

/**
 * Resolves margin exposure configuration by checking (in precedence order):
 * 1. Explicitly provided options argument
 * 2. Browser localStorage ('zf_erp_margin_config') if running client-side
 * 3. Environment variables NEXT_PUBLIC_ERP_MARGIN_REVIEW_THRESHOLD / NEXT_PUBLIC_ERP_ESTIMATE_STALE_DAYS
 * 4. DEFAULT_MARGIN_CONFIG defaults (reviewThresholdPercent: 20, staleEstimateDaysThreshold: 90)
 */
export function resolveMarginConfig(options?: MarginExposureConfig): Required<MarginExposureConfig> {
  let storageConfig: Partial<MarginExposureConfig> = {};
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('zf_erp_margin_config');
      if (stored) {
        storageConfig = JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors safely
    }
  }

  const envThreshold =
    typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ERP_MARGIN_REVIEW_THRESHOLD
      ? Number(process.env.NEXT_PUBLIC_ERP_MARGIN_REVIEW_THRESHOLD)
      : undefined;

  const envStaleDays =
    typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ERP_ESTIMATE_STALE_DAYS
      ? Number(process.env.NEXT_PUBLIC_ERP_ESTIMATE_STALE_DAYS)
      : undefined;

  const reviewThresholdPercent =
    options?.reviewThresholdPercent ??
    storageConfig.reviewThresholdPercent ??
    (envThreshold !== undefined && !isNaN(envThreshold)
      ? envThreshold
      : DEFAULT_MARGIN_CONFIG.reviewThresholdPercent);

  const staleEstimateDaysThreshold =
    options?.staleEstimateDaysThreshold ??
    storageConfig.staleEstimateDaysThreshold ??
    (envStaleDays !== undefined && !isNaN(envStaleDays)
      ? envStaleDays
      : DEFAULT_MARGIN_CONFIG.staleEstimateDaysThreshold);

  return {
    reviewThresholdPercent,
    staleEstimateDaysThreshold,
  };
}

/**
 * Saves margin exposure configuration in browser localStorage, allowing
 * operators to tune review thresholds and stale-days rules dynamically without code changes.
 */
export function setBrowserMarginConfig(config: Partial<MarginExposureConfig>): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const current = resolveMarginConfig();
      const updated = { ...current, ...config };
      window.localStorage.setItem('zf_erp_margin_config', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save zf_erp_margin_config to localStorage:', e);
    }
  }
}

/**
 * Calculates the age of an estimate in days relative to an as-of date.
 */
export function getEstimateAgeDays(asOfDateStr: string, referenceDateStr?: string): number {
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const estDate = new Date(asOfDateStr);
  const diffTime = refDate.getTime() - estDate.getTime();
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

/**
 * Retrieves the latest dated estimate-to-complete for a specific unit or building.
 * Prioritizes unit-level estimate; falls back to property-level estimate if unit-level is not found.
 */
export function getLatestUnitEstimate(
  propertyId: string,
  buildingUnitId?: string,
  estimates?: ERPUnitEstimate[] | null
): ERPUnitEstimate | null {
  if (!estimates || estimates.length === 0) return null;

  // Filter for matching property
  const propEstimates = estimates.filter(e => e.property_id === propertyId);
  if (propEstimates.length === 0) return null;

  // 1. Try to find exact unit match if buildingUnitId is provided
  if (buildingUnitId) {
    const unitMatches = propEstimates.filter(e => e.building_unit_id === buildingUnitId);
    if (unitMatches.length > 0) {
      // Sort newest as_of_date first
      return [...unitMatches].sort((a, b) => new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime())[0];
    }
  }

  // 2. Fall back to property-wide estimate (where building_unit_id is null or undefined)
  const propWideMatches = propEstimates.filter(e => !e.building_unit_id);
  if (propWideMatches.length > 0) {
    return [...propWideMatches].sort((a, b) => new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime())[0];
  }

  return null;
}

export interface AttributableCostsResult {
  directUnitCost: Decimal;
  commonAllocatedCost: Decimal;
  totalAttributableCost: Decimal;
  commonAllocationSharePercent: Decimal;
}

/**
 * Computes attributable actual incurred costs for a contracted unit, combining:
 * 1. Direct unit-level expenditures (invoices/materials assigned specifically to building_unit_id)
 * 2. Explicit auditable share of land/common costs (infrastructure, permits, structure without unit ID)
 *
 * Strictly ignores synthetic cost baselines.
 */
export function getAttributableUnitCosts(
  contract: ERPContract,
  propertyCosts?: ERPPropertyCostItem[] | null,
  property?: Property | null
): AttributableCostsResult {
  if (!propertyCosts || propertyCosts.length === 0 || !contract.property_id) {
    return {
      directUnitCost: D(0),
      commonAllocatedCost: D(0),
      totalAttributableCost: D(0),
      commonAllocationSharePercent: D(0),
    };
  }

  let directUnitCost = D(0);
  let propertyCommonCost = D(0);

  for (const item of propertyCosts) {
    if (!item || item.property_id !== contract.property_id) continue;

    // Zero fake data invariant: exclude any non-real or synthetic items
    if ((item as any).status === 'synthetic') continue;

    const totals = calculateCostItemEffectiveTotals(item);
    const netCost = D(totals.netEffectiveCost || 0);
    if (!netCost.isPositive()) continue;

    if (contract.building_unit_id && item.building_unit_id === contract.building_unit_id) {
      // Direct unit expenditure
      directUnitCost = directUnitCost.plus(netCost);
    } else if (!item.building_unit_id) {
      // Common building/property expenditure (land, permits, foundations, common areas)
      propertyCommonCost = propertyCommonCost.plus(netCost);
    }
  }

  // Determine common cost allocation share:
  // If whole building sale: 100% of common costs
  if (contract.is_whole_building_sale) {
    const total = directUnitCost.plus(propertyCommonCost);
    return {
      directUnitCost,
      commonAllocatedCost: propertyCommonCost,
      totalAttributableCost: total,
      commonAllocationSharePercent: D(100),
    };
  }

  // Pro-rata allocation based on unit area or total units count
  let commonAllocatedCost = D(0);
  let commonAllocationSharePercent = D(0);

  if (contract.building_unit_id && property?.building_units && Array.isArray(property.building_units)) {
    const units = property.building_units as any[];
    const targetUnit = units.find(u => u.unit_id === contract.building_unit_id);

    const totalBuildingArea = units.reduce((acc, u) => acc + (Number(u.area_sqm) || 0), 0);
    const unitArea = Number(targetUnit?.area_sqm) || 0;

    if (unitArea > 0 && totalBuildingArea > 0) {
      commonAllocatedCost = propertyCommonCost.times(unitArea).dividedBy(totalBuildingArea);
      commonAllocationSharePercent = D(unitArea).times(100).dividedBy(totalBuildingArea);
    } else if (units.length > 0) {
      commonAllocatedCost = propertyCommonCost.dividedBy(units.length);
      commonAllocationSharePercent = D(100).dividedBy(units.length);
    }
  } else if (property?.total_units_count && property.total_units_count > 0) {
    commonAllocatedCost = propertyCommonCost.dividedBy(property.total_units_count);
    commonAllocationSharePercent = D(100).dividedBy(property.total_units_count);
  } else {
    // Default to 100% if standalone unit / property not subdivided
    commonAllocatedCost = propertyCommonCost;
    commonAllocationSharePercent = D(100);
  }

  const totalAttributableCost = directUnitCost.plus(commonAllocatedCost);

  return {
    directUnitCost,
    commonAllocatedCost,
    totalAttributableCost,
    commonAllocationSharePercent,
  };
}

/**
 * Evaluates margin exposure for a single contract under the real estate developer model.
 *
 * Rules:
 * 1. UNCLASSIFIED historical contracts: Returns signal 'UNKNOWN'. Never assumes healthy.
 * 2. CASH_ON_DELIVERY (على المفتاح): Evaluates margin against completed costs; zero subsequent construction risk.
 * 3. OFF_PLAN_INSTALLMENTS (البيع تحت الإنشاء): Evaluates contracted value against
 *    attributable incurred cost + latest estimate-to-complete.
 *    - Missing estimate -> 'UNKNOWN'
 *    - Stale estimate (>90 days) -> 'UNKNOWN'
 *    - Projected margin < 0 -> 'LOSS_EXPOSURE'
 *    - Projected margin < review threshold (e.g. 20%) -> 'REVIEW_REQUIRED'
 *    - Projected margin >= review threshold -> 'HEALTHY'
 */
export function evaluateContractMarginExposure(
  contract: ERPContract,
  propertyCosts?: ERPPropertyCostItem[] | null,
  unitEstimates?: ERPUnitEstimate[] | null,
  property?: Property | null,
  options?: MarginExposureConfig & { referenceDate?: string }
): MarginExposureResult {
  const config = resolveMarginConfig(options);
  const grossContractValue = D(contract.gross_contract_value || 0);

  // Guard against Rescinded contracts: terminated contracts are excluded from active construction exposure
  if (contract.status === 'Rescinded') {
    return {
      contract_id: contract.contract_id,
      contract_number: contract.contract_number,
      sale_model: contract.sale_model || 'UNCLASSIFIED',
      gross_contract_value: grossContractValue.toFixed(2),
      attributable_incurred_cost: '0.00',
      direct_unit_cost: '0.00',
      common_allocated_cost: '0.00',
      forecast_cost_to_complete: '0.00',
      total_projected_cost: '0.00',
      projected_margin_amount: '0.00',
      projected_margin_percentage: '0.00',
      signal: 'UNKNOWN',
      is_estimate_stale: false,
      notes: 'Contract is rescinded/terminated. Excluded from active construction margin exposure.',
    };
  }

  // 1. Check sale model classification
  const saleModel: SaleModel | 'UNCLASSIFIED' = contract.sale_model || 'UNCLASSIFIED';

  if (saleModel === 'UNCLASSIFIED') {
    return {
      contract_id: contract.contract_id,
      contract_number: contract.contract_number,
      sale_model: 'UNCLASSIFIED',
      gross_contract_value: grossContractValue.toFixed(2),
      attributable_incurred_cost: '0.00',
      direct_unit_cost: '0.00',
      common_allocated_cost: '0.00',
      forecast_cost_to_complete: '0.00',
      total_projected_cost: '0.00',
      projected_margin_amount: '0.00',
      projected_margin_percentage: '0.00',
      signal: 'UNKNOWN',
      is_estimate_stale: false,
      notes: 'Historical contract unclassified. Commercial sale model not assigned.',
    };
  }

  // 2. Compute attributable incurred costs
  const { directUnitCost, commonAllocatedCost, totalAttributableCost } = getAttributableUnitCosts(
    contract,
    propertyCosts,
    property
  );

  // 3. For Cash on Delivery:
  // Units are completed before sale at market price. There is no off-plan construction cost escalation risk.
  if (saleModel === 'CASH_ON_DELIVERY') {
    const marginAmount = grossContractValue.minus(totalAttributableCost);
    const marginPct = grossContractValue.isPositive()
      ? marginAmount.times(100).dividedBy(grossContractValue)
      : D(0);

    const signal: MarginExposureSignal = marginAmount.isNegative()
      ? 'LOSS_EXPOSURE'
      : marginPct.lt(config.reviewThresholdPercent)
      ? 'REVIEW_REQUIRED'
      : 'HEALTHY';

    return {
      contract_id: contract.contract_id,
      contract_number: contract.contract_number,
      sale_model: 'CASH_ON_DELIVERY',
      gross_contract_value: grossContractValue.toFixed(2),
      attributable_incurred_cost: totalAttributableCost.toFixed(2),
      direct_unit_cost: directUnitCost.toFixed(2),
      common_allocated_cost: commonAllocatedCost.toFixed(2),
      forecast_cost_to_complete: '0.00',
      total_projected_cost: totalAttributableCost.toFixed(2),
      projected_margin_amount: marginAmount.toFixed(2),
      projected_margin_percentage: marginPct.toFixed(2),
      signal,
      is_estimate_stale: false,
      notes: 'Cash on Delivery (على المفتاح). Zero subsequent construction cost risk.',
    };
  }

  // 4. For Off-Plan Installments (البيع تحت الإنشاء بالتقسيط):
  const latestEstimate = getLatestUnitEstimate(
    contract.property_id || '',
    contract.building_unit_id,
    unitEstimates
  );

  // Requirement: Default to "risk unknown" on missing data, never "healthy"
  if (!latestEstimate) {
    return {
      contract_id: contract.contract_id,
      contract_number: contract.contract_number,
      sale_model: 'OFF_PLAN_INSTALLMENTS',
      gross_contract_value: grossContractValue.toFixed(2),
      attributable_incurred_cost: totalAttributableCost.toFixed(2),
      direct_unit_cost: directUnitCost.toFixed(2),
      common_allocated_cost: commonAllocatedCost.toFixed(2),
      forecast_cost_to_complete: '0.00',
      total_projected_cost: totalAttributableCost.toFixed(2),
      projected_margin_amount: '0.00',
      projected_margin_percentage: '0.00',
      signal: 'UNKNOWN',
      is_estimate_stale: false,
      notes: 'Missing estimate-to-complete. Off-plan margin exposure cannot be verified.',
    };
  }

  // Requirement: Default to "risk unknown" on stale data (>90 days), never "healthy"
  const ageDays = getEstimateAgeDays(latestEstimate.as_of_date, options?.referenceDate);
  const isStale = ageDays > config.staleEstimateDaysThreshold;

  const forecastCost = D(latestEstimate.forecast_cost_to_complete || 0);
  const totalProjectedCost = totalAttributableCost.plus(forecastCost);
  const projectedMargin = grossContractValue.minus(totalProjectedCost);
  const marginPct = grossContractValue.isPositive()
    ? projectedMargin.times(100).dividedBy(grossContractValue)
    : D(0);

  if (isStale) {
    return {
      contract_id: contract.contract_id,
      contract_number: contract.contract_number,
      sale_model: 'OFF_PLAN_INSTALLMENTS',
      gross_contract_value: grossContractValue.toFixed(2),
      attributable_incurred_cost: totalAttributableCost.toFixed(2),
      direct_unit_cost: directUnitCost.toFixed(2),
      common_allocated_cost: commonAllocatedCost.toFixed(2),
      forecast_cost_to_complete: forecastCost.toFixed(2),
      total_projected_cost: totalProjectedCost.toFixed(2),
      projected_margin_amount: projectedMargin.toFixed(2),
      projected_margin_percentage: marginPct.toFixed(2),
      signal: 'UNKNOWN',
      is_estimate_stale: true,
      estimate_as_of_date: latestEstimate.as_of_date,
      estimate_age_days: ageDays,
      notes: `Estimate-to-complete is stale (${ageDays} days old > ${config.staleEstimateDaysThreshold} days limit). Updated cost engineering audit required.`,
    };
  }

  // Active fresh estimate evaluation
  let signal: MarginExposureSignal;
  let notes: string;

  if (projectedMargin.isNegative()) {
    signal = 'LOSS_EXPOSURE';
    notes = `Negative projected margin (-${projectedMargin.abs().toFixed(2)} EGP). Project costs exceed contract price.`;
  } else if (marginPct.lt(config.reviewThresholdPercent)) {
    signal = 'REVIEW_REQUIRED';
    notes = `Projected margin (${marginPct.toFixed(1)}%) is below the ${config.reviewThresholdPercent}% target corridor.`;
  } else {
    signal = 'HEALTHY';
    notes = `Projected margin (${marginPct.toFixed(1)}%) healthy.`;
  }

  return {
    contract_id: contract.contract_id,
    contract_number: contract.contract_number,
    sale_model: 'OFF_PLAN_INSTALLMENTS',
    gross_contract_value: grossContractValue.toFixed(2),
    attributable_incurred_cost: totalAttributableCost.toFixed(2),
    direct_unit_cost: directUnitCost.toFixed(2),
    common_allocated_cost: commonAllocatedCost.toFixed(2),
    forecast_cost_to_complete: forecastCost.toFixed(2),
    total_projected_cost: totalProjectedCost.toFixed(2),
    projected_margin_amount: projectedMargin.toFixed(2),
    projected_margin_percentage: marginPct.toFixed(2),
    signal,
    is_estimate_stale: false,
    estimate_as_of_date: latestEstimate.as_of_date,
    estimate_age_days: ageDays,
    notes,
  };
}

export type { PortfolioMarginExposureSummary } from './types';

/**
 * Evaluates margin exposure across an entire portfolio of contracts.
 * Full audit reconciliation: explicitly accounts for submitted, active, and rescinded contracts.
 */
export function evaluatePortfolioMarginExposure(
  contracts?: ERPContract[] | null,
  propertyCosts?: ERPPropertyCostItem[] | null,
  unitEstimates?: ERPUnitEstimate[] | null,
  properties?: Property[] | null,
  options?: MarginExposureConfig & { referenceDate?: string }
): PortfolioMarginExposureSummary {
  const appliedConfig = resolveMarginConfig(options);
  const results: MarginExposureResult[] = [];
  let healthyCount = 0;
  let reviewRequiredCount = 0;
  let lossExposureCount = 0;
  let unknownCount = 0;
  let totalExposureLossAmount = D(0);
  let totalOffPlanContracts = 0;
  let totalCashOnDeliveryContracts = 0;
  let totalUnclassifiedContracts = 0;
  let rescindedContractsExcluded = 0;
  let activeContractsEvaluated = 0;
  const totalContractsSubmitted = contracts ? contracts.length : 0;

  if (contracts && Array.isArray(contracts)) {
    const propMap = new Map<string, Property>();
    if (properties) {
      properties.forEach(p => propMap.set(p.id, p));
    }

    for (const contract of contracts) {
      if (!contract) continue;

      // Rescinded contracts represent terminated commitments returned to inventory or settled.
      // They are explicitly accounted for and excluded from ongoing construction margin exposure.
      if (contract.status === 'Rescinded') {
        rescindedContractsExcluded++;
        continue;
      }

      activeContractsEvaluated++;
      const prop = contract.property_id ? propMap.get(contract.property_id) || null : null;
      const evaluation = evaluateContractMarginExposure(
        contract,
        propertyCosts,
        unitEstimates,
        prop,
        options
      );

      results.push(evaluation);

      if (evaluation.sale_model === 'OFF_PLAN_INSTALLMENTS') {
        totalOffPlanContracts++;
      } else if (evaluation.sale_model === 'CASH_ON_DELIVERY') {
        totalCashOnDeliveryContracts++;
      } else {
        totalUnclassifiedContracts++;
      }

      switch (evaluation.signal) {
        case 'HEALTHY':
          healthyCount++;
          break;
        case 'REVIEW_REQUIRED':
          reviewRequiredCount++;
          break;
        case 'LOSS_EXPOSURE':
          lossExposureCount++;
          const lossAmt = D(evaluation.projected_margin_amount);
          if (lossAmt.isNegative()) {
            totalExposureLossAmount = totalExposureLossAmount.plus(lossAmt.abs());
          }
          break;
        case 'UNKNOWN':
        default:
          unknownCount++;
          break;
      }
    }
  }

  return {
    totalContractsSubmitted,
    activeContractsEvaluated,
    rescindedContractsExcluded,
    totalOffPlanContracts,
    totalCashOnDeliveryContracts,
    totalUnclassifiedContracts,
    healthyCount,
    reviewRequiredCount,
    lossExposureCount,
    unknownCount,
    totalExposureLossAmount,
    appliedConfig,
    contracts: results,
  };
}
