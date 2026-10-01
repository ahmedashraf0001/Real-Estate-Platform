import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPContract } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';

export const PROJECTS_PER_ROW = 3;

export interface FlatInventoryUnit {
  id: string;
  propertyId: string;
  projectTitle: string;
  unitType: string;
  unitNumber: string;
  floor?: number;
  areaSqm: number;
  totalPrice: number;
  downPayment: number;
  monthlyInstallment: number;
  status: 'available' | 'reserved' | 'contracted';
  location: string;
  property: Property;
  buildingUnit?: BuildingUnitItem;
}

export interface FloorGroup {
  floorKey: string;
  floorLabel: string;
  floorNumber?: number;
  order: number;
  units: {
    unit: FlatInventoryUnit;
    globalIndex: number;
  }[];
  totalUnits: number;
  availableUnits: number;
  contractedUnits: number;
  reservedUnits: number;
}

/**
 * Categorize a unit into a canonical floor group:
 * - Roof / Penthouse (الرووف / البنتهاوس)
 * - Ground Floor (الدور الأرضي)
 * - 1st Floor (الدور الأول)
 * - 2nd Floor (الدور الثاني)
 * - Typical Floor (الدور المتكرر)
 * - Basement (البدروم)
 * - Various (أدوار متفرقة)
 */
export function categorizeFloor(
  floor?: number | string | null,
  unitNumber?: string,
  unitType?: string,
  isAr: boolean = true
): { key: string; label: string; order: number; floorNumber?: number } {
  const numLower = (unitNumber || '').toLowerCase();
  const typeLower = (unitType || '').toLowerCase();
  const floorStr = typeof floor === 'string' ? floor.toLowerCase() : '';

  // 1. Roof / Penthouse
  if (
    typeLower.includes('بنتهاوس') ||
    typeLower.includes('penthouse') ||
    typeLower.includes('روف') ||
    typeLower.includes('رووف') ||
    numLower.includes('روف') ||
    numLower.includes('رووف') ||
    numLower.includes('roof') ||
    numLower.includes('بنتهاوس') ||
    numLower.includes('penthouse') ||
    floorStr.includes('roof') ||
    floorStr.includes('روف') ||
    floorStr.includes('رووف') ||
    floorStr.includes('penthouse') ||
    floorStr.includes('بنتهاوس')
  ) {
    const parsedFloor = typeof floor === 'number' ? floor : (!isNaN(Number(floor)) ? Number(floor) : undefined);
    return {
      key: 'roof',
      label: isAr ? 'الرووف / البنتهاوس' : 'Roof / Penthouse',
      order: 900 + (parsedFloor ?? 0),
      floorNumber: parsedFloor,
    };
  }

  // 2. Explicit Floor Numbers
  const numFloor = typeof floor === 'number' ? floor : (floor !== undefined && floor !== null && floor !== '' && !isNaN(Number(floor)) ? Number(floor) : null);
  if (numFloor !== null) {
    if (numFloor === 0) {
      return {
        key: 'ground',
        label: isAr ? 'الدور الأرضي' : 'Ground Floor',
        order: 0,
        floorNumber: 0,
      };
    }
    if (numFloor === 1) {
      return {
        key: 'first',
        label: isAr ? 'الدور الأول' : '1st Floor',
        order: 1,
        floorNumber: 1,
      };
    }
    if (numFloor === 2) {
      return {
        key: 'second',
        label: isAr ? 'الدور الثاني' : '2nd Floor',
        order: 2,
        floorNumber: 2,
      };
    }
    if (numFloor === 3) {
      return {
        key: 'third',
        label: isAr ? 'الدور الثالث' : '3rd Floor',
        order: 3,
        floorNumber: 3,
      };
    }
    if (numFloor >= 4) {
      return {
        key: `typical-${numFloor}`,
        label: isAr ? `الدور المتكرر (${numFloor})` : `Typical Floor (${numFloor})`,
        order: numFloor,
        floorNumber: numFloor,
      };
    }
    if (numFloor < 0) {
      return {
        key: `basement-${Math.abs(numFloor)}`,
        label: isAr ? `البدروم (${numFloor})` : `Basement (${numFloor})`,
        order: numFloor,
        floorNumber: numFloor,
      };
    }
  }

  // 3. Text Inference from Unit Number if floor number was null
  if (numLower.includes('أرضي') || numLower.includes('ارضي') || numLower.includes('ground')) {
    return {
      key: 'ground',
      label: isAr ? 'الدور الأرضي' : 'Ground Floor',
      order: 0,
      floorNumber: 0,
    };
  }
  if (numLower.includes('الأول') || numLower.includes('الاول') || numLower.includes('1st')) {
    return {
      key: 'first',
      label: isAr ? 'الدور الأول' : '1st Floor',
      order: 1,
      floorNumber: 1,
    };
  }
  if (numLower.includes('الثاني') || numLower.includes('2nd')) {
    return {
      key: 'second',
      label: isAr ? 'الدور الثاني' : '2nd Floor',
      order: 2,
      floorNumber: 2,
    };
  }
  if (numLower.includes('الثالث') || numLower.includes('3rd')) {
    return {
      key: 'third',
      label: isAr ? 'الدور الثالث' : '3rd Floor',
      order: 3,
      floorNumber: 3,
    };
  }
  if (numLower.includes('الرابع') || numLower.includes('4th')) {
    return {
      key: 'typical-4',
      label: isAr ? 'الدور المتكرر (4)' : 'Typical Floor (4)',
      order: 4,
      floorNumber: 4,
    };
  }
  if (numLower.includes('متكرر') || typeLower.includes('متكرر') || numLower.includes('typical')) {
    return {
      key: 'typical',
      label: isAr ? 'الدور المتكرر' : 'Typical Floor',
      order: 10,
      floorNumber: undefined,
    };
  }
  if (numLower.includes('بدروم') || numLower.includes('basement')) {
    return {
      key: 'basement-1',
      label: isAr ? 'البدروم' : 'Basement',
      order: -1,
      floorNumber: -1,
    };
  }

  return {
    key: 'various',
    label: isAr ? 'أدوار متفرقة' : 'Various Floors',
    order: 500,
    floorNumber: undefined,
  };
}

/**
 * Group a list of building units by floor with aggregated counts
 */
export function groupUnitsByFloor(
  units: { unit: FlatInventoryUnit; globalIndex: number }[],
  isAr: boolean = true
): FloorGroup[] {
  const map = new Map<string, FloorGroup>();

  units.forEach(({ unit, globalIndex }) => {
    const floorInfo = categorizeFloor(unit.floor, unit.unitNumber, unit.unitType, isAr);
    let group = map.get(floorInfo.key);
    if (!group) {
      group = {
        floorKey: floorInfo.key,
        floorLabel: floorInfo.label,
        floorNumber: floorInfo.floorNumber,
        order: floorInfo.order,
        units: [],
        totalUnits: 0,
        availableUnits: 0,
        contractedUnits: 0,
        reservedUnits: 0,
      };
      map.set(floorInfo.key, group);
    }

    group.units.push({ unit, globalIndex });
    group.totalUnits += 1;
    if (unit.status === 'contracted') {
      group.contractedUnits += 1;
    } else if (unit.status === 'reserved') {
      group.reservedUnits += 1;
    } else {
      group.availableUnits += 1;
    }
  });

  return Array.from(map.values()).sort((a, b) => a.order - b.order);
}

/**
 * Analytics Data Aggregations for the 5 reference charts from media_1790462050457.jpg
 */
export interface AnalyticsBreakdown {
  statusBreakdown: {
    contracted: number;
    available: number;
    reserved: number;
    total: number;
    contractedPct: number;
    availablePct: number;
    reservedPct: number;
  };
  projectStacks: Array<{
    propertyId: string;
    projectTitle: string;
    contracted: number;
    available: number;
    reserved: number;
    total: number;
  }>;
  unitTypesDistribution: Array<{
    typeKey: string;
    label: string;
    count: number;
    pct: number;
    color: string;
  }>;
  areaHistogram: Array<{
    bracketKey: string;
    label: string;
    count: number;
    pct: number;
  }>;
  averagePricePerType: Array<{
    typeKey: string;
    label: string;
    avgPricePerSqm: number;
    avgUnitPrice: number;
    count: number;
    iconType: string;
  }>;
}

export function calculateAnalyticsBreakdown(
  units: FlatInventoryUnit[],
  properties: Property[],
  isAr: boolean = true
): AnalyticsBreakdown {
  const total = units.length || 0;

  // 1. Status Breakdown
  let contracted = 0;
  let available = 0;
  let reserved = 0;

  units.forEach(u => {
    if (u.status === 'contracted') contracted++;
    else if (u.status === 'reserved') reserved++;
    else available++;
  });

  const contractedPct = total > 0 ? Math.round((contracted / total) * 100) : 0;
  const availablePct = total > 0 ? Math.round((available / total) * 100) : 0;
  const reservedPct = total > 0 ? Math.max(0, 100 - contractedPct - availablePct) : 0;

  // 2. Units by Project Stacked
  const projectMap = new Map<string, {
    propertyId: string;
    projectTitle: string;
    contracted: number;
    available: number;
    reserved: number;
    total: number;
  }>();

  // Initialize with properties
  properties.forEach(p => {
    const title = (isAr ? p.title_ar : p.title_en) || p.title_ar || p.title_en || 'مشروع';
    projectMap.set(p.id, {
      propertyId: p.id,
      projectTitle: title,
      contracted: 0,
      available: 0,
      reserved: 0,
      total: 0,
    });
  });

  units.forEach(u => {
    let entry = projectMap.get(u.propertyId);
    if (!entry) {
      entry = {
        propertyId: u.propertyId,
        projectTitle: u.projectTitle,
        contracted: 0,
        available: 0,
        reserved: 0,
        total: 0,
      };
      projectMap.set(u.propertyId, entry);
    }
    entry.total++;
    if (u.status === 'contracted') entry.contracted++;
    else if (u.status === 'reserved') entry.reserved++;
    else entry.available++;
  });

  // Filter to active projects and sort by total units descending
  const projectStacks = Array.from(projectMap.values())
    .filter(p => p.total > 0)
    .sort((a, b) => b.total - a.total);

  // 3. Unit Types Distribution
  const typeMap = new Map<string, { count: number; label: string; color: string }>();
  const predefinedTypes: Record<string, { labelAr: string; labelEn: string; color: string }> = {
    apartment: { labelAr: 'شقق سكنية', labelEn: 'Apartments', color: '#6366f1' },
    duplex: { labelAr: 'دوبلكس', labelEn: 'Duplex', color: '#3b82f6' },
    penthouse: { labelAr: 'بنتهاوس', labelEn: 'Penthouse', color: '#06b6d4' },
    commercial: { labelAr: 'محلات تجارية', labelEn: 'Retail / Commercial', color: '#f97316' },
    office: { labelAr: 'مكاتب إدارية', labelEn: 'Offices', color: '#eab308' },
    villa: { labelAr: 'فيلات وقصور', labelEn: 'Villas', color: '#10b981' },
    other: { labelAr: 'وحدات أخرى', labelEn: 'Other Units', color: '#64748b' },
  };

  units.forEach(u => {
    const t = (u.unitType || '').toLowerCase();
    let key = 'other';
    if (t.includes('فيلا') || t.includes('villa') || t.includes('قصر')) key = 'villa';
    else if (t.includes('بنتهاوس') || t.includes('penthouse') || t.includes('روف') || t.includes('roof')) key = 'penthouse';
    else if (t.includes('دوبلكس') || t.includes('duplex')) key = 'duplex';
    else if (t.includes('محل') || t.includes('تجاري') || t.includes('shop') || t.includes('retail')) key = 'commercial';
    else if (t.includes('مكتب') || t.includes('office') || t.includes('إداري')) key = 'office';
    else if (t.includes('شقة') || t.includes('apartment')) key = 'apartment';

    const cur = typeMap.get(key) || {
      count: 0,
      label: isAr ? predefinedTypes[key].labelAr : predefinedTypes[key].labelEn,
      color: predefinedTypes[key].color,
    };
    cur.count++;
    typeMap.set(key, cur);
  });

  const unitTypesDistribution = Array.from(typeMap.entries())
    .map(([typeKey, data]) => ({
      typeKey,
      label: data.label,
      count: data.count,
      pct: total > 0 ? Math.round((data.count / total) * 100) : 0,
      color: data.color,
    }))
    .sort((a, b) => b.count - a.count);

  // 4. Area Histogram (<100, 100-150, 150-200, 200-300, >300 m²)
  const brackets = [
    { bracketKey: 'under_100', label: '< 100 م²', min: 0, max: 100 },
    { bracketKey: '100_150', label: '100 - 150 م²', min: 100, max: 150 },
    { bracketKey: '150_200', label: '150 - 200 م²', min: 150, max: 200 },
    { bracketKey: '200_300', label: '200 - 300 م²', min: 200, max: 300 },
    { bracketKey: 'over_300', label: '> 300 م²', min: 300, max: 999999 },
  ];

  const areaHistogram = brackets.map(b => {
    const count = units.filter(u => {
      const a = u.areaSqm || 0;
      if (b.bracketKey === 'under_100') return a < 100;
      if (b.bracketKey === 'over_300') return a >= 300;
      return a >= b.min && a < b.max;
    }).length;
    return {
      bracketKey: b.bracketKey,
      label: b.label,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  // 5. Average Price per m² & Unit Price by Type
  const priceStatsMap = new Map<string, {
    totalPrice: number;
    totalArea: number;
    count: number;
    label: string;
    iconType: string;
  }>();

  units.forEach(u => {
    const t = (u.unitType || '').toLowerCase();
    let key = 'other';
    let iconType = 'building';
    if (t.includes('فيلا') || t.includes('villa') || t.includes('قصر')) { key = 'villa'; iconType = 'home'; }
    else if (t.includes('بنتهاوس') || t.includes('penthouse') || t.includes('روف')) { key = 'penthouse'; iconType = 'building'; }
    else if (t.includes('دوبلكس') || t.includes('duplex')) { key = 'duplex'; iconType = 'layers'; }
    else if (t.includes('محل') || t.includes('تجاري')) { key = 'commercial'; iconType = 'shopping-bag'; }
    else if (t.includes('مكتب') || t.includes('office')) { key = 'office'; iconType = 'briefcase'; }
    else if (t.includes('شقة') || t.includes('apartment')) { key = 'apartment'; iconType = 'home'; }

    let stat = priceStatsMap.get(key);
    if (!stat) {
      stat = {
        totalPrice: 0,
        totalArea: 0,
        count: 0,
        label: isAr ? (predefinedTypes[key]?.labelAr || 'وحدات') : (predefinedTypes[key]?.labelEn || 'Units'),
        iconType,
      };
      priceStatsMap.set(key, stat);
    }
    stat.totalPrice += u.totalPrice;
    stat.totalArea += (u.areaSqm || 150);
    stat.count += 1;
  });

  const averagePricePerType = Array.from(priceStatsMap.entries())
    .filter(([_, s]) => s.count > 0 && s.totalArea > 0)
    .map(([typeKey, s]) => ({
      typeKey,
      label: s.label,
      avgPricePerSqm: Math.round(s.totalPrice / s.totalArea),
      avgUnitPrice: Math.round(s.totalPrice / s.count),
      count: s.count,
      iconType: s.iconType,
    }))
    .sort((a, b) => b.avgPricePerSqm - a.avgPricePerSqm);

  return {
    statusBreakdown: {
      contracted,
      available,
      reserved,
      total,
      contractedPct,
      availablePct,
      reservedPct,
    },
    projectStacks,
    unitTypesDistribution,
    areaHistogram,
    averagePricePerType,
  };
}

/**
 * Metric calculations for an individual project card
 */
export interface ProjectCardMetrics {
  minPrice: number;
  maxPrice: number;
  minArea: number;
  maxArea: number;
  avgPricePerSqm: number;
  totalUnitsCount: number;
  availableUnitsCount: number;
  contractedUnitsCount: number;
  completionPct: number;
  isContracted: boolean;
  isWholeSold: boolean;
}

export function calculateProjectCardMetrics(
  property: Property,
  contracts: ERPContract[] = []
): ProjectCardMetrics {
  const bUnits = property.building_units || [];
  const isBuilding = property.type === 'building' || (property.title_ar || '').includes('عمارة') || (property.title_en || '').toLowerCase().includes('building') || bUnits.length > 0;

  const isWholeSold = isWholeBuildingSold(property, contracts);
  const summary = getPropertyInventorySummary(property, contracts);
  const isContracted = summary.isFullySold;

  const totalUnitsCount = summary.totalUnits;
  const contractedUnitsCount = summary.contractedUnits;
  const availableUnitsCount = summary.availableUnits;

  // Completion percentage
  let completionPct = 65;
  if (typeof property.completion_percentage === 'number' && !isNaN(property.completion_percentage)) {
    completionPct = Math.max(0, Math.min(100, property.completion_percentage));
  } else if (property.completion_status === 'ready') {
    completionPct = 100;
  } else if (property.completion_status === 'off_plan') {
    completionPct = 35;
  } else if (isContracted) {
    completionPct = 85;
  }

  // Prices and Areas
  let minPrice = property.price_egp || 0;
  let maxPrice = property.price_egp || 0;
  let minArea = property.area_sqm || 150;
  let maxArea = property.area_sqm || 150;

  if (bUnits.length > 0) {
    const prices = bUnits.map(u => (u.price_egp || 0) + (u.tax_amount_egp || 0)).filter(p => p > 0);
    const areas = bUnits.map(u => u.area_sqm || 0).filter(a => a > 0);

    if (prices.length > 0) {
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
    }
    if (areas.length > 0) {
      minArea = Math.min(...areas);
      maxArea = Math.max(...areas);
    }
  }

  const avgPrice = (minPrice + maxPrice) / 2;
  const avgArea = (minArea + maxArea) / 2;
  const avgPricePerSqm = avgArea > 0 ? Math.round(avgPrice / avgArea) : 0;

  return {
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    avgPricePerSqm,
    totalUnitsCount,
    availableUnitsCount,
    contractedUnitsCount,
    completionPct,
    isContracted,
    isWholeSold,
  };
}

/**
 * 3-per-row Pagination Helper
 */
export function paginateProjects(
  projects: Property[],
  pageIndex: number,
  perPage: number = 3
): {
  totalPages: number;
  pageProjects: Property[];
  safePageIndex: number;
} {
  const totalPages = Math.max(1, Math.ceil(projects.length / perPage));
  const safePageIndex = Math.max(0, Math.min(pageIndex, totalPages - 1));
  const start = safePageIndex * perPage;
  const pageProjects = projects.slice(start, start + perPage);

  return {
    totalPages,
    pageProjects,
    safePageIndex,
  };
}

/**
 * Resolves realistic Egyptian geographic coordinates for properties.
 * Prioritizes explicitly stored latitude/longitude, then maps known regional clusters.
 */
export function getPropertyCoordinates(p: Property, index: number = 0): { lat: number; lng: number } {
  if (
    p.latitude != null && 
    p.longitude != null && 
    !isNaN(p.latitude) && 
    !isNaN(p.longitude) && 
    p.latitude !== 0 && 
    p.longitude !== 0
  ) {
    return { lat: p.latitude, lng: p.longitude };
  }

  const loc = (p.location || '').toLowerCase();
  const text = `${p.location || ''} ${p.title_ar || ''} ${p.title_en || ''}`.toLowerCase();

  // Helper matching location first, then full text
  const matchLoc = (...keywords: string[]) => keywords.some(k => loc.includes(k));
  const matchText = (...keywords: string[]) => keywords.some(k => text.includes(k));

  // 1. North Coast / Sahel / Hacienda / Alamein
  if (matchLoc('ساحل', 'coast', 'hacienda', 'هاسيندا', 'علمين', 'waters') || 
      matchText('ساحل', 'coast', 'hacienda', 'هاسيندا', 'علمين', 'waters')) {
    return { lat: 30.9333 + (index * 0.006), lng: 28.7500 + (index * 0.006) };
  }

  // 2. El Gouna / Hurghada / Red Sea
  if (matchLoc('جونة', 'gouna', 'الغردقة', 'hurghada', 'abu tig', 'أبو تيج') ||
      matchText('جونة', 'gouna', 'الغردقة', 'hurghada', 'abu tig', 'أبو تيج')) {
    return { lat: 27.3949 + (index * 0.005), lng: 33.6765 + (index * 0.005) };
  }

  // 3. Ain Sokhna / Monte Galala
  if (matchLoc('سخنة', 'sokhna', 'جلالة', 'galala') ||
      matchText('سخنة', 'sokhna', 'جلالة', 'galala')) {
    return { lat: 29.6010 + (index * 0.005), lng: 32.3380 + (index * 0.005) };
  }

  // 4. Sheikh Zayed / 6th October / West Cairo
  if (matchLoc('زايد', 'zayed', 'أكتوبر', 'october', 'bostan', 'البستان') ||
      matchText('زايد', 'zayed', 'أكتوبر', 'october', 'bostan', 'البستان')) {
    return { lat: 30.0520 + (index * 0.005), lng: 30.9830 + (index * 0.005) };
  }

  // 5. New Cairo / Tagamoa / Sodic East / Narges / Aurum
  if (matchLoc('قاهرة', 'cairo', 'تجمع', 'sodic', 'نرجس', 'narges', 'aurum', 'أوروم') ||
      matchText('قاهرة', 'cairo', 'تجمع', 'sodic', 'نرجس', 'narges', 'aurum', 'أوروم')) {
    return { lat: 30.0131 + (index * 0.005), lng: 31.4913 + (index * 0.005) };
  }

  // 6. New Administrative Capital
  if (matchLoc('عاصمة', 'capital') || matchText('عاصمة', 'capital')) {
    return { lat: 30.0167 + (index * 0.005), lng: 31.7500 + (index * 0.005) };
  }

  // 7. Madinaty / Shorouk
  if (matchLoc('مدينتي', 'madinaty', 'شروق') || matchText('مدينتي', 'madinaty', 'شروق')) {
    return { lat: 30.1250 + (index * 0.005), lng: 31.6250 + (index * 0.005) };
  }

  // Default Central Cairo with slight distribution offset
  return {
    lat: 30.0444 + ((index % 6) * 0.016),
    lng: 31.2357 + ((index % 6) * 0.016)
  };
}

export const SHOWCASE_DEFAULT_PAGE_SIZE = 12;

/**
 * Checks if an entire building was purchased as a whole.
 * A building is whole-sold if:
 * 1. A master contract exists (contract on the property without a specific building_unit_id,
 *    or explicitly marked is_whole_building_contract) and is not rescinded.
 * 2. OR property.listing_status === 'sold' when it has no constituent units or is marked sold as a single asset.
 */
export function isWholeBuildingSold(property: Property, contracts: ERPContract[] = []): boolean {
  const bUnits = property.building_units || [];

  const pContracts = contracts.filter(c => {
    if (c.status === 'Rescinded') return false;
    if (c.property_id && c.property_id === property.id) return true;
    if (c.unit_id) {
      const u = c.unit_id.trim();
      const ar = (property.title_ar || '').trim();
      const en = (property.title_en || '').trim();
      if (u === ar || u === en) return true;
      if (ar && u.startsWith(ar)) return true;
      if (en && u.startsWith(en)) return true;
    }
    return false;
  });

  const wholeBuildingContract = pContracts.find(c => {
    if (c.is_whole_building_sale) return true;
    if (c.building_unit_id || c.building_unit_number) return false;

    if (bUnits.length > 0) {
      const isConstituentUnitMatch = bUnits.some(u => {
        const uNum = (u.unit_number || '').trim();
        const uId = (u.unit_id || '').trim();
        const cUnit = (c.unit_id || '').trim();
        return (cUnit && (cUnit === uId || cUnit === uNum)) || (uNum && cUnit.includes(uNum));
      });
      if (isConstituentUnitMatch) return false;

      const cUnit = (c.unit_id || '').trim();
      const propAr = (property.title_ar || '').trim();
      const propEn = (property.title_en || '').trim();
      return cUnit === propAr || cUnit === propEn || cUnit === property.id || cUnit.includes('بالكامل') || cUnit.toLowerCase().includes('whole');
    }

    return true;
  });

  if (wholeBuildingContract) return true;

  if (bUnits.length === 0 && property.listing_status === 'sold') {
    return true;
  }

  return false;
}

/**
 * Checks if a specific constituent unit/apartment within a building is sold.
 */
export function isUnitSold(
  property: Property,
  unit: BuildingUnitItem,
  contracts: ERPContract[] = []
): boolean {
  if (isWholeBuildingSold(property, contracts)) return true;
  if (unit.status === 'contracted') return true;

  return contracts.some(c => {
    if (c.status === 'Rescinded') return false;
    if (c.building_unit_id && c.building_unit_id === unit.unit_id) return true;
    const isPropMatch = (c.property_id && c.property_id === property.id) ||
      (c.unit_id && (c.unit_id === property.title_ar || c.unit_id === property.title_en));
    if (isPropMatch) {
      if (c.building_unit_number && c.building_unit_number === unit.unit_number) return true;
      if (c.unit_id && (c.unit_id.trim() === unit.unit_number.trim() || c.unit_id.trim() === unit.unit_id.trim())) return true;
    }
    return false;
  });
}

/**
 * Checks if a building is fully sold.
 * In FIN-OS Portfolio & Contract Wizard:
 * A building property must ONLY be labeled as sold if:
 * 1. The entire building was purchased as a whole (master contract).
 * 2. OR ALL constituent apartments and units in that building are 100% sold.
 * If a building still has available units, it is NOT fully sold.
 */
export function isBuildingFullySold(property: Property, contracts: ERPContract[] = []): boolean {
  if (isWholeBuildingSold(property, contracts)) return true;

  const bUnits = property.building_units || [];
  if (bUnits.length === 0) {
    return property.listing_status === 'sold';
  }

  return bUnits.every(u => isUnitSold(property, u, contracts));
}

/**
 * Returns the list of constituent units that are still available for booking/contracting.
 */
export function getAvailableUnitsForProperty(
  property: Property,
  contracts: ERPContract[] = []
): BuildingUnitItem[] {
  if (isWholeBuildingSold(property, contracts)) return [];

  const bUnits = property.building_units || [];
  return bUnits.filter(u => !isUnitSold(property, u, contracts));
}

/**
 * Checks whether a property can still be selected for a new contract.
 * Standalone properties: available if not sold.
 * Buildings: available if NOT fully sold (i.e. has at least 1 available unit or whole building unsold).
 */
export function isPropertyAvailableForContract(
  property: Property,
  contracts: ERPContract[] = []
): boolean {
  const bUnits = property.building_units || [];
  const isBuilding = property.type === 'building' || (property.title_ar || '').includes('عمارة') || (property.title_en || '').toLowerCase().includes('building') || bUnits.length > 0;

  if (isBuilding) {
    return !isBuildingFullySold(property, contracts);
  }

  // Standalone property
  if (property.listing_status === 'sold') return false;
  return !contracts.some(c => {
    if (c.status === 'Rescinded') return false;
    return (c.property_id && c.property_id === property.id) ||
           (c.unit_id && (c.unit_id === property.title_ar || c.unit_id === property.title_en));
  });
}

/**
 * Checks whether the entire building can be sold as a single whole asset.
 * A whole building contract is ONLY permitted if ZERO constituent units have been sold.
 */
export function canSellWholeBuilding(
  property: Property,
  contracts: ERPContract[] = []
): boolean {
  if (isWholeBuildingSold(property, contracts)) return false;
  const bUnits = property.building_units || [];
  if (bUnits.length === 0) return isPropertyAvailableForContract(property, contracts);

  // If any unit is sold, whole building sale cannot occur
  const hasSoldUnits = bUnits.some(u => isUnitSold(property, u, contracts));
  return !hasSoldUnits;
}

/**
 * High-level inventory summary for a property
 */
export function getPropertyInventorySummary(
  property: Property,
  contracts: ERPContract[] = []
): {
  totalUnits: number;
  availableUnits: number;
  contractedUnits: number;
  isFullySold: boolean;
  canSellWholeBuilding: boolean;
  isMultiUnit: boolean;
} {
  const bUnits = property.building_units || [];
  const isBuilding = property.type === 'building' || (property.title_ar || '').includes('عمارة') || (property.title_en || '').toLowerCase().includes('building') || bUnits.length > 0;

  if (isBuilding && bUnits.length > 0) {
    const totalUnits = bUnits.length;
    const isWholeSold = isWholeBuildingSold(property, contracts);
    if (isWholeSold) {
      return {
        totalUnits,
        availableUnits: 0,
        contractedUnits: totalUnits,
        isFullySold: true,
        canSellWholeBuilding: false,
        isMultiUnit: true,
      };
    }
    const available = getAvailableUnitsForProperty(property, contracts);
    const availableUnits = available.length;
    const contractedUnits = totalUnits - availableUnits;
    const isFullySold = availableUnits === 0;
    const canSellWhole = canSellWholeBuilding(property, contracts);

    return {
      totalUnits,
      availableUnits,
      contractedUnits,
      isFullySold,
      canSellWholeBuilding: canSellWhole,
      isMultiUnit: true,
    };
  }

  const isSold = !isPropertyAvailableForContract(property, contracts);
  return {
    totalUnits: 1,
    availableUnits: isSold ? 0 : 1,
    contractedUnits: isSold ? 1 : 0,
    isFullySold: isSold,
    canSellWholeBuilding: !isSold,
    isMultiUnit: false,
  };
}

/**
 * Calculates unit availability stats for a property.
 */
export function getPropertyStats(property: Property, contracts: ERPContract[] = []): {
  total: number;
  contracted: number;
  available: number;
  isSoldOut: boolean;
} {
  const summary = getPropertyInventorySummary(property, contracts);
  return {
    total: summary.totalUnits,
    contracted: summary.contractedUnits,
    available: summary.availableUnits,
    isSoldOut: summary.isFullySold,
  };
}

/**
 * Curated project image resolver
 */
export function getCuratedProjectImage(property: Property, index: number = 0): string {
  if (property.property_images && property.property_images.length > 0 && property.property_images[0]?.url) {
    const rawUrl = property.property_images[0].url;
    if (rawUrl.startsWith('http') && !rawUrl.includes('supabase.co/storage/v1/object/public/properties/broken')) {
      return rawUrl;
    }
  }

  const title = ((property.title_ar || '') + ' ' + (property.title_en || '')).toLowerCase();
  if (title.includes('جونة') || title.includes('لاجون') || title.includes('gouna') || title.includes('lagoon')) {
    return 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=85';
  }
  if (title.includes('ساحل') || title.includes('ووترز') || title.includes('coast') || title.includes('waters')) {
    return 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85';
  }
  if (title.includes('سخنة') || title.includes('جبل') || title.includes('sokhna')) {
    return 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=85';
  }
  if (property.type === 'building' || title.includes('عمارة') || title.includes('building')) {
    const buildingImages = [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
    ];
    return buildingImages[index % buildingImages.length];
  }
  if (property.type === 'villa') {
    return 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85';
  }

  const fallbackPool = [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=85'
  ];
  return fallbackPool[index % fallbackPool.length];
}

/**
 * Robust classifier for property units and standalone properties.
 * Inspects unitType, property.type, type, property_type, and contextual architectural keywords.
 * Maps to canonical categories: duplex, villa, commercial, chalet, land, residential, other.
 */
export function classifyPropertyUnit(u: any): string {
  if (!u) return 'other';

  const rawType = (
    u.unitType ||
    u.unit_type ||
    u.property?.type ||
    u.property?.property_type ||
    u.type ||
    u.property_type ||
    ''
  ).toString().toLowerCase().trim();

  const titleText = (
    ((u.unitNumber || '') + ' ' +
    (u.unit_number || '') + ' ' +
    (u.projectTitle || '') + ' ' +
    (u.project_title || '') + ' ' +
    (u.title_ar || '') + ' ' +
    (u.title_en || '') + ' ' +
    (u.property?.title_ar || '') + ' ' +
    (u.property?.title_en || '') + ' ' +
    rawType)
  ).toLowerCase();

  // 1. Duplex / Penthouse / Sky Roof
  if (
    rawType === 'duplex' ||
    rawType === 'penthouse' ||
    rawType === 'roof' ||
    rawType === 'sky_slab' ||
    titleText.includes('دوبلكس') ||
    titleText.includes('duplex') ||
    titleText.includes('بنتهاوس') ||
    titleText.includes('penthouse') ||
    titleText.includes('روف') ||
    titleText.includes('رووف') ||
    titleText.includes('roof') ||
    titleText.includes('سماوية')
  ) {
    return 'duplex';
  }

  // 2. Villas, Mansions, Palaces & Townhouses
  if (
    rawType === 'villa' ||
    rawType === 'mansion' ||
    rawType === 'palace' ||
    rawType === 'townhouse' ||
    rawType === 'twin_house' ||
    rawType === 'twin' ||
    titleText.includes('فيلا') ||
    titleText.includes('villa') ||
    titleText.includes('قصر') ||
    titleText.includes('mansion') ||
    titleText.includes('palace') ||
    titleText.includes('تاون') ||
    titleText.includes('townhouse') ||
    titleText.includes('توين') ||
    titleText.includes('twin')
  ) {
    return 'villa';
  }

  // 3. Commercial, Offices, Garages & Retail
  if (
    rawType === 'commercial' ||
    rawType === 'office' ||
    rawType === 'garage' ||
    rawType === 'retail' ||
    rawType === 'parking' ||
    titleText.includes('تجاري') ||
    titleText.includes('commercial') ||
    titleText.includes('إداري') ||
    titleText.includes('اداري') ||
    titleText.includes('office') ||
    titleText.includes('مكتب') ||
    titleText.includes('جراج') ||
    titleText.includes('garage') ||
    titleText.includes('موقف') ||
    titleText.includes('parking') ||
    titleText.includes('محل') ||
    titleText.includes('shop') ||
    titleText.includes('retail') ||
    titleText.includes('مول') ||
    titleText.includes('mall')
  ) {
    return 'commercial';
  }

  // 4. Chalets & Coastal Cabins
  if (
    rawType === 'chalet' ||
    rawType === 'cabin' ||
    titleText.includes('شاليه') ||
    titleText.includes('chalet') ||
    titleText.includes('كابينة') ||
    titleText.includes('cabin')
  ) {
    return 'chalet';
  }

  // 5. Land & Plots
  const isLand =
    rawType === 'land' ||
    rawType === 'plot' ||
    titleText.includes('قطعة أرض') ||
    titleText.includes('قطعة ارض') ||
    titleText.includes('أراضي') ||
    titleText.includes('اراضي') ||
    titleText.includes('أرض فضاء') ||
    titleText.includes('ارض فضاء') ||
    /\b(land|plot)\b/i.test(titleText) ||
    ((/(^|\s)(أرض|ارض)(\s|$)/.test(titleText)) &&
      !titleText.includes('أرضي') &&
      !titleText.includes('ارضي') &&
      !titleText.includes('أرضيات') &&
      !titleText.includes('ارضيات'));

  if (isLand) {
    return 'land';
  }

  // 6. Residential Apartments & Residential Buildings
  if (
    rawType === 'apartment' ||
    rawType === 'building' ||
    rawType === 'residential' ||
    rawType === 'flat' ||
    titleText.includes('شقة') ||
    titleText.includes('شقق') ||
    titleText.includes('apartment') ||
    titleText.includes('flat') ||
    titleText.includes('سكنية') ||
    titleText.includes('residential') ||
    titleText.includes('عمارة') ||
    titleText.includes('building') ||
    titleText.includes('مبنى') ||
    titleText.includes('برج') ||
    titleText.includes('tower') ||
    titleText.includes('residence') ||
    titleText.includes('ريزيدنس')
  ) {
    return 'residential';
  }

  return 'other';
}

