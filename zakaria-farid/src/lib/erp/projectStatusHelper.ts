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
            const uNorm = normalizeUnitNumber(u.unit_number);
            const cNumNorm = normalizeUnitNumber(c.building_unit_number);
            if (cNumNorm && uNorm && cNumNorm.toLowerCase() === uNorm.toLowerCase()) return true;
            if (c.building_unit_number && c.building_unit_number === u.unit_number) return true;
            const cUnitIdNorm = normalizeUnitNumber(c.unit_id);
            if (cUnitIdNorm && uNorm && cUnitIdNorm.toLowerCase() === uNorm.toLowerCase()) return true;
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

/**
 * Builds canonical floor-major building units with exact integer-split prices.
 * Invariant: Last unit absorbs integer remainder so sum of unit prices equals priceEgp exactly.
 */
export function buildBuildingUnits(params: {
  propertyId: string;
  totalFloors: number;
  unitsPerFloor: number;
  areaSqm: number;
  priceEgp: number;
}): BuildingUnitItem[] {
  const { propertyId, totalFloors, unitsPerFloor, areaSqm, priceEgp } = params;
  const count = totalFloors * unitsPerFloor;
  if (count <= 0) return [];

  const totalDec = D(priceEgp);
  const totalCents = totalDec.toCents();
  const totalEgpBig = totalCents / BigInt(100);
  const countBig = BigInt(count);
  const baseUnitEgpBig = countBig > BigInt(0) ? totalEgpBig / countBig : BigInt(0);
  const baseUnitPrice = Number(baseUnitEgpBig);
  const lastUnitPrice = count > 1
    ? totalDec.minus(D(baseUnitPrice).times(count - 1)).toNumber()
    : totalDec.toNumber();
  const unitArea = count > 0 ? Math.round(areaSqm / count) : 0;

  const units: BuildingUnitItem[] = [];
  let n = 1;
  for (let floor = 1; floor <= totalFloors && n <= count; floor++) {
    for (let u = 0; u < unitsPerFloor && n <= count; u++) {
      const letter = String.fromCharCode(65 + u);
      const isLast = n === count;
      const unitPrice = isLast ? lastUnitPrice : baseUnitPrice;
      units.push({
        unit_id: `${propertyId}-apt-${n}`,
        unit_number: `${floor}${letter}`,
        floor,
        area_sqm: unitArea,
        bedrooms: 3,
        bathrooms: 2,
        price_egp: unitPrice,
        status: 'available',
      });
      n++;
    }
  }

  return units;
}

/**
 * Normalizes unit numbers by stripping 'شقة ' / 'Apt ' prefix and ' - الدور N' / ' - Floor N' suffix, then trimming.
 */
export function normalizeUnitNumber(raw: string | undefined | null): string {
  if (!raw) return '';
  return String(raw)
    .replace(/^(?:شقة|وحدة|Apt|Unit)\s*/i, '')
    .replace(/\s*-\s*(?:الدور|Floor).*$/i, '')
    .trim();
}

/**
 * Strips apartment/unit prefixes and floor suffixes from raw unit number strings.
 * e.g. "شقة 1A - الدور 1" -> "1A", "شقة 1A" -> "1A", "Apt 2B" -> "2B", "1A" -> "1A".
 */
export function cleanUnitNumber(raw: string | undefined | null): string {
  if (!raw) return '';
  const str = String(raw).trim();
  const aptMatch = str.match(/^(?:.*?-)?(?:apt|unit)-(\d+)$/i);
  if (aptMatch) {
    return aptMatch[1];
  }
  return normalizeUnitNumber(str);
}

/**
 * Formats a localized unit display label.
 * Avoids doubled prefixes if passed a legacy string like "شقة 1A - الدور 1".
 * e.g. "1A" -> "شقة 1A" (Ar) / "Apt 1A" (En)
 * e.g. "فيلا 3" -> "فيلا 3" (preserved)
 */
export function formatUnitDisplayName(raw: string | undefined | null, isAr: boolean = true): string {
  if (!raw) return '';
  const str = String(raw).trim();
  if (/^(?:فيلا|بنتهاوس|دوبلكس|محل|مكتب|villa|penthouse|duplex)/i.test(str)) {
    return str;
  }
  const clean = cleanUnitNumber(str);
  if (!clean) return str;
  return isAr ? `شقة ${clean}` : `Apt ${clean}`;
}

/**
 * Formats a localized unit label with floor context where appropriate.
 * If floor is omitted, attempts to parse floor from the string or omits floor suffix.
 * e.g. "1A", 1 -> "شقة 1A - الدور 1" (Ar) / "Apt 1A - Floor 1" (En)
 * e.g. "شقة 1A - الدور 1", 1 -> "شقة 1A - الدور 1" (Ar) / "Apt 1A - Floor 1" (En)
 */
export function formatUnitWithFloor(
  raw: string | undefined | null,
  floor?: number | string | null,
  isAr: boolean = true
): string {
  if (!raw) return '';
  const str = String(raw).trim();
  if (/^(?:فيلا|بنتهاوس|دوبلكس|محل|مكتب|villa|penthouse|duplex)/i.test(str)) {
    return str;
  }
  const clean = cleanUnitNumber(str);
  let resolvedFloor = floor;
  if (resolvedFloor === undefined || resolvedFloor === null || resolvedFloor === '') {
    const floorMatch = str.match(/(?:الدور|Floor)\s*(\d+)/i);
    if (floorMatch) resolvedFloor = floorMatch[1];
  }

  if (resolvedFloor !== undefined && resolvedFloor !== null && resolvedFloor !== '') {
    return isAr ? `شقة ${clean} - الدور ${resolvedFloor}` : `Apt ${clean} - Floor ${resolvedFloor}`;
  }
  return isAr ? `شقة ${clean}` : `Apt ${clean}`;
}

/**
 * Normalizes property records for ERP and Contract Wizards, ensuring
 * building units and partner splits are properly instantiated.
 */
export function normalizeERPProperty(p: Property): Property {
  const isBuilding = p.type === 'building' || (p.title_ar || '').includes('عمارة') || (p.title_en || '').toLowerCase().includes('building');
  if (isBuilding) {
    const unitsCount = p.total_units_count && p.total_units_count > 1 ? p.total_units_count : 6;
    const saleMode = p.sale_mode || 'both_flexible';
    let units: BuildingUnitItem[] = (p.building_units as BuildingUnitItem[]) || [];
    if (!units || units.length === 0) {
      const partialFloor = unitsCount % 2 !== 0;
      const unitsPerFloor = partialFloor ? unitsCount : 2;
      const totalFloors = unitsCount / unitsPerFloor;
      units = buildBuildingUnits({
        propertyId: p.id,
        totalFloors,
        unitsPerFloor,
        areaSqm: p.area_sqm || 1200,
        priceEgp: p.price_egp || 35000000,
      });
      // Legacy odd inventories end with one apartment on the final floor.
      if (partialFloor) units = units.map((unit, index) => ({
        ...unit,
        floor: Math.floor(index / 2) + 1,
        unit_number: `${Math.floor(index / 2) + 1}${index % 2 === 0 ? 'A' : 'B'}`,
      }));
    }
    return {
      ...p,
      type: 'building' as const,
      sale_mode: saleMode,
      total_units_count: units.length,
      building_units: units,
      partner_splits: p.partner_splits && p.partner_splits.length > 0 ? p.partner_splits : (
        ((p.title_ar || '').includes('الشيخ زايد') || (p.title_ar || '').includes('النرجس') || (p.title_ar || '').includes('الفردوس') || (p.title_ar || '').includes('الأوبسيديان'))
          ? [{ partner_name: 'زكريا فريد', share_percentage: 65 }, { partner_name: 'م. أحمد الشريف', share_percentage: 35 }]
          : (((p.title_ar || '').includes('الساحل') || (p.title_ar || '').includes('هاسبيندا') || (p.title_ar || '').includes('هاسيندا') || (p.title_ar || '').includes('السماء') || (p.title_ar || '').includes('الصفوة'))
            ? [{ partner_name: 'زكريا فريد', share_percentage: 75 }, { partner_name: 'د. هاني المنياوي', share_percentage: 25 }]
            : (((p.title_ar || '').includes('السخنة') || (p.title_ar || '').includes('البحر الأحمر'))
              ? [{ partner_name: 'زكريا فريد', share_percentage: 70 }, { partner_name: 'الحاج رجب الصاوي', share_percentage: 30 }]
              : [{ partner_name: 'زكريا فريد', share_percentage: 100 }]
            )
          )
      )
    };
  }
  return {
    ...p,
    partner_splits: p.partner_splits && p.partner_splits.length > 0 ? p.partner_splits : (
      ((p.title_ar || '').includes('الشيخ زايد') || (p.title_ar || '').includes('النرجس') || (p.title_ar || '').includes('الفردوس') || (p.title_ar || '').includes('الأوبسيديان'))
        ? [{ partner_name: 'زكريا فريد', share_percentage: 65 }, { partner_name: 'م. أحمد الشريف', share_percentage: 35 }]
        : (((p.title_ar || '').includes('الساحل') || (p.title_ar || '').includes('هاسبيندا') || (p.title_ar || '').includes('هاسيندا') || (p.title_ar || '').includes('السماء') || (p.title_ar || '').includes('الصفوة'))
          ? [{ partner_name: 'زكريا فريد', share_percentage: 75 }, { partner_name: 'د. هاني المنياوي', share_percentage: 25 }]
          : (((p.title_ar || '').includes('السخنة') || (p.title_ar || '').includes('البحر الأحمر'))
            ? [{ partner_name: 'زكريا فريد', share_percentage: 70 }, { partner_name: 'الحاج رجب الصاوي', share_percentage: 30 }]
            : [{ partner_name: 'زكريا فريد', share_percentage: 100 }]
          )
        )
    )
  };
}
