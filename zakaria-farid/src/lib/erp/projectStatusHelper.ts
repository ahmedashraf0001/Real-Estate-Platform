import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPContract, ERPPropertyCostItem } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';

export interface ProjectStatusMetrics {
  totalUnits: number;
  contractedUnits: number;
  isContracted: boolean;
  statusTextAr: string;
  statusTextEn: string;
  statusPillClass: string;
  hasConstructionData: boolean;
  constructionProgressPct: number | null;
  progressDisplayAr: string;
  progressDisplayEn: string;
}

/**
 * Computes canonical project status, contracted sales count, and real construction progress.
 * Invariant: Never assume 100% or "Completed" if there is no real construction telemetry.
 * Invariant: Contracted units count non-rescinded contracts (standalone apartment = 1 unit).
 */
export function computeProjectStatusMetrics(
  property: Property,
  contracts: ERPContract[] = [],
  propertyCosts: ERPPropertyCostItem[] = []
): ProjectStatusMetrics {
  const bUnits: BuildingUnitItem[] = property.building_units || [];
  const isMultiUnit = bUnits.length > 0;
  
  // Non-rescinded contracts only
  const activeContracts = contracts.filter(c => c.status !== 'Rescinded');

  let totalUnits = 0;
  let contractedUnits = 0;

  if (isMultiUnit) {
    totalUnits = bUnits.length;
    // Check whole building sale
    const isWholeSold = activeContracts.some(c => 
      c.is_whole_building_sale && (
        c.property_id === property.id ||
        (c.unit_id && (c.unit_id === property.title_ar || c.unit_id === property.title_en || c.unit_id === property.id))
      )
    );

    if (isWholeSold) {
      contractedUnits = totalUnits;
    } else {
      bUnits.forEach(u => {
        if (u.status === 'contracted') {
          contractedUnits++;
          return;
        }
        const hasContract = activeContracts.some(c => {
          if (c.building_unit_id && c.building_unit_id === u.unit_id) return true;
          const isPropMatch = (c.property_id && c.property_id === property.id) ||
            (c.unit_id && (c.unit_id === property.title_ar || c.unit_id === property.title_en || c.unit_id === property.id));
          if (isPropMatch) {
            if (c.building_unit_number && c.building_unit_number === u.unit_number) return true;
            if (c.unit_id && (c.unit_id.trim() === u.unit_number.trim() || c.unit_id.trim() === u.unit_id.trim())) return true;
          }
          return false;
        });
        if (hasContract) {
          contractedUnits++;
        }
      });
    }
  } else {
    // Standalone unit (apartment, villa, etc.) = 1 unit
    totalUnits = property.total_units_count && property.total_units_count > 1 ? property.total_units_count : 1;
    const isSoldOrContracted = property.listing_status === 'sold' || activeContracts.some(c => 
      (c.property_id && c.property_id === property.id) ||
      (c.unit_id && (c.unit_id === property.id || c.unit_id === property.title_ar || c.unit_id === property.title_en)) ||
      (c.building_unit_id && c.building_unit_id === property.id)
    );
    contractedUnits = isSoldOrContracted ? totalUnits : 0;
  }

  const isFullyContracted = totalUnits > 0 && contractedUnits >= totalUnits;
  const isPartiallyContracted = contractedUnits > 0 && contractedUnits < totalUnits;

  // Real construction progress data
  let hasConstructionData = false;
  let constructionProgressPct: number | null = null;

  if (typeof property.completion_percentage === 'number' && !isNaN(property.completion_percentage)) {
    hasConstructionData = true;
    constructionProgressPct = Math.round(Math.max(0, Math.min(100, property.completion_percentage)));
  } else {
    // Check recorded costs vs budget
    const costsForProp = propertyCosts.filter(c => c.property_id === property.id);
    const totalRecordedCosts = costsForProp.reduce(
      (sum, item) => sum.plus(item.total_cost_egp || item.total_amount || 0),
      D(0)
    ).toNumber();

    const budget = (property as any).construction_budget || (property as any).budget_egp || (property as any).target_cost || 0;
    if (budget > 0 && totalRecordedCosts > 0) {
      hasConstructionData = true;
      constructionProgressPct = Math.round(Math.max(0, Math.min(100, (totalRecordedCosts / budget) * 100)));
    }
    // Note: NEVER default to 100% just because completion_status is ready or no data exists!
  }

  const progressDisplayAr = hasConstructionData && constructionProgressPct !== null
    ? `${constructionProgressPct}%`
    : '—';
  const progressDisplayEn = hasConstructionData && constructionProgressPct !== null
    ? `${constructionProgressPct}%`
    : '—';

  // Status label must follow listing/contract state (e.g. "Sold"/"Contracted" when it has an active contract), not "Completed" by default.
  let statusTextAr = 'متاح للبيع';
  let statusTextEn = 'Available';
  let statusPillClass = 'statusPillNeutral';

  if (isFullyContracted) {
    statusTextAr = 'متعاقد عليه';
    statusTextEn = 'Contracted';
    statusPillClass = 'statusPillGreen';
  } else if (isPartiallyContracted) {
    statusTextAr = `مبيع جزئياً (${contractedUnits}/${totalUnits})`;
    statusTextEn = `Partially Sold (${contractedUnits}/${totalUnits})`;
    statusPillClass = 'statusPillBlue';
  } else if (property.listing_status === 'sold') {
    statusTextAr = 'تم البيع';
    statusTextEn = 'Sold';
    statusPillClass = 'statusPillGreen';
  } else if (property.listing_status === 'under_offer') {
    statusTextAr = 'محجوز';
    statusTextEn = 'Reserved';
    statusPillClass = 'statusPillAmber';
  } else if (hasConstructionData && constructionProgressPct !== null) {
    if (constructionProgressPct >= 100) {
      statusTextAr = 'جاهز للتسليم';
      statusTextEn = 'Ready';
      statusPillClass = 'statusPillGreen';
    } else {
      statusTextAr = 'قيد الإنشاء';
      statusTextEn = 'Under Construction';
      statusPillClass = 'statusPillAmber';
    }
  } else {
    statusTextAr = 'متاح للبيع';
    statusTextEn = 'Available';
    statusPillClass = 'statusPillNeutral';
  }

  return {
    totalUnits,
    contractedUnits,
    isContracted: isFullyContracted || isPartiallyContracted,
    statusTextAr,
    statusTextEn,
    statusPillClass,
    hasConstructionData,
    constructionProgressPct,
    progressDisplayAr,
    progressDisplayEn,
  };
}
