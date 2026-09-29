import { D, Decimal } from './math';
import { ERPContract, ERPInstallmentSchedule } from './types';
import { Property } from '@/lib/supabase/types';
import { getAccountsReceivable } from './canonicalMetrics';

export type ContractPaymentStatus = 'completed' | 'overdue' | 'active' | 'rescinded';

/**
 * Formats a number or Decimal with thousand separators and no unnecessary trailing zero decimals.
 */
export function formatCompactNumber(val?: string | number | ReturnType<typeof D> | Decimal | null): string {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : D(val).toNumber();
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US', {
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0
  });
}

/**
 * Classifies contract payment status dynamically from schedules.
 * - completed: collected >= gross_value
 * - overdue: has pending/defaulted tranche whose due_date < referenceDate
 * - rescinded: status === 'Rescinded'
 * - active: all other active deals in progress
 */
export function getContractPaymentStatus(
  contract: ERPContract,
  schedules: ERPInstallmentSchedule[],
  referenceDate?: string
): ContractPaymentStatus {
  if (contract.status === 'Rescinded') {
    return 'rescinded';
  }

  const gross = D(contract.gross_contract_value || '0');
  const collected = D(contract.total_cash_collected || '0');

  // Fully paid
  if (gross.gt(0) && collected.gte(gross)) {
    return 'completed';
  }

  // Check installment schedules
  const contractSchedules = schedules.filter(
    s => s.contract_id === contract.contract_id && s.status !== 'SUPERSEDED' && s.status !== 'Void'
  );

  const todayStr = referenceDate || new Date().toISOString().split('T')[0];

  const hasOverdue = contractSchedules.some(s => {
    if (s.status === 'Defaulted') return true;
    if (s.status === 'Pending' && s.due_date && s.due_date < todayStr) return true;
    return false;
  });

  if (hasOverdue) {
    return 'overdue';
  }

  return 'active';
}

export type UnitTypeKey = 'apartment' | 'duplex' | 'roof' | 'building' | 'garage';

/**
 * Resolves contract property metadata (project title, unit type, area, hero image).
 * Searches properties by property_id and building_units, falling back to smart unit_id heuristic.
 * Strictly aligned with AdminPropertyForm.tsx system types:
 * - Property Types: apartment (شقة), building (عمارة), garage (جراج)
 * - Subtypes: standard (عادية), duplex (دوبلكس), roof (روف عادي/بريميم), residential/mixed (عمارة)
 */
export function getContractMeta(
  contract: ERPContract,
  properties: Property[] = [],
  isAr: boolean = true
): {
  project: string;
  unitTypeKey: UnitTypeKey;
  unitTypeLabel: string;
  area: number;
  heroImage: string;
} {
  const prop = properties.find(p => 
    p.id === contract.property_id ||
    p.building_units?.some(u => u.unit_id === contract.unit_id || u.unit_number === contract.unit_id)
  );

  const unitItem = prop?.building_units?.find(
    u => u.unit_id === contract.unit_id || u.unit_number === contract.unit_id
  );

  const rawUnitId = (contract.unit_id || '').toLowerCase();
  const rawPropType = (prop?.type || (prop as any)?.propertyType || '').toLowerCase();
  const rawSubtype = ((prop as any)?.subtype || '').toLowerCase();
  const rawUnitDesc = ((unitItem?.unit_number || '') + ' ' + (unitItem?.status || '')).toLowerCase();

  let unitTypeKey: UnitTypeKey = 'apartment';
  let unitTypeLabelAr = 'شقة سكنية';
  let unitTypeLabelEn = 'Apartment';
  let defaultArea = 160;

  // 1. Garage / Parking Spot (جراج)
  if (
    rawPropType === 'garage' ||
    rawPropType.includes('جراج') ||
    rawUnitId.includes('garage') ||
    rawUnitId.includes('جراج') ||
    rawUnitId.includes('parking') ||
    rawUnitId.includes('comm') ||
    rawUnitId.includes('shop') ||
    rawUnitId.includes('محل') ||
    rawUnitId.includes('تجاري')
  ) {
    unitTypeKey = 'garage';
    unitTypeLabelAr = 'جراج وموقف';
    unitTypeLabelEn = 'Garage & Parking';
    defaultArea = 35;
  }
  // 2. Whole Building (عمارة كاملة)
  else if (
    rawPropType === 'building' ||
    rawPropType.includes('عمارة') ||
    rawUnitId.includes('bld') ||
    rawUnitId.includes('عمارة') ||
    rawUnitId.includes('block') ||
    rawUnitId.includes('tower') ||
    rawUnitId.includes('برج')
  ) {
    unitTypeKey = 'building';
    unitTypeLabelAr = 'عمارة كاملة';
    unitTypeLabelEn = 'Full Building';
    defaultArea = 1250;
  }
  // 3. Roof Apartment (روف عادي / روف بريميم)
  else if (
    rawSubtype.includes('roof') ||
    rawUnitId.includes('roof') ||
    rawUnitId.includes('روف') ||
    rawUnitId.includes('penthouse') ||
    rawUnitDesc.includes('roof') ||
    rawUnitDesc.includes('روف') ||
    rawUnitDesc.includes('بنتهاوس')
  ) {
    unitTypeKey = 'roof';
    unitTypeLabelAr = 'شقة روف';
    unitTypeLabelEn = 'Roof Apartment';
    defaultArea = 180;
  }
  // 4. Duplex (دوبلكس)
  else if (
    rawSubtype === 'duplex' ||
    rawUnitId.includes('duplex') ||
    rawUnitId.includes('دوبلكس') ||
    rawUnitDesc.includes('duplex') ||
    rawUnitDesc.includes('دوبلكس')
  ) {
    unitTypeKey = 'duplex';
    unitTypeLabelAr = 'دوبلكس';
    unitTypeLabelEn = 'Duplex';
    defaultArea = 220;
  }
  // 5. Standard Apartment (شقة سكنية عادية)
  else {
    unitTypeKey = 'apartment';
    unitTypeLabelAr = 'شقة سكنية';
    unitTypeLabelEn = 'Apartment';
    defaultArea = 160;
  }

  const area = unitItem?.area_sqm || prop?.area_sqm || defaultArea;

  const project = isAr 
    ? (prop?.title_ar || prop?.title_en || (unitTypeKey === 'building' ? 'عمارة الياسمين ريزيدنس' : unitTypeKey === 'roof' ? 'برج الأندلس بكورنيش بحر مويس' : 'مشروع زكريا فريد السكني'))
    : (prop?.title_en || prop?.title_ar || 'Zakaria Farid Residential Project');

  let heroImage = prop?.property_images?.[0]?.url;
  if (!heroImage) {
    if (unitTypeKey === 'building') {
      heroImage = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80';
    } else if (unitTypeKey === 'roof') {
      heroImage = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80';
    } else if (unitTypeKey === 'duplex') {
      heroImage = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
    } else if (unitTypeKey === 'garage') {
      heroImage = 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80';
    } else {
      heroImage = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80';
    }
  }

  return {
    project,
    unitTypeKey,
    unitTypeLabel: isAr ? unitTypeLabelAr : unitTypeLabelEn,
    area,
    heroImage
  };
}

/**
 * Calculates unit types breakdown for the sales distribution donut chart.
 * Based on authentic AdminPropertyForm types: apartment, duplex, roof, building, garage.
 */
export function calculateUnitTypesBreakdown(
  contracts: ERPContract[],
  properties: Property[] = [],
  isAr: boolean = true
) {
  const counts: Record<UnitTypeKey, number> = {
    apartment: 0,
    duplex: 0,
    roof: 0,
    building: 0,
    garage: 0
  };

  let totalActive = 0;
  contracts.forEach(c => {
    if (c.status === 'Rescinded') return;
    totalActive++;
    const meta = getContractMeta(c, properties, isAr);
    counts[meta.unitTypeKey] = (counts[meta.unitTypeKey] || 0) + 1;
  });

  const config: Array<{
    key: UnitTypeKey;
    labelAr: string;
    labelEn: string;
    color: string;
  }> = [
    { key: 'apartment', labelAr: 'شقق سكنية', labelEn: 'Apartments', color: 'var(--erp-accent, #2563eb)' },
    { key: 'duplex', labelAr: 'دوبلكس', labelEn: 'Duplexes', color: '#0d9488' },
    { key: 'roof', labelAr: 'شقق روف', labelEn: 'Roof Units', color: '#8b5cf6' },
    { key: 'building', labelAr: 'عمارات ومباني', labelEn: 'Buildings', color: '#f59e0b' },
    { key: 'garage', labelAr: 'جراجات ومواقف', labelEn: 'Garages', color: '#06b6d4' }
  ];

  return config.map(item => {
    const count = counts[item.key] || 0;
    const percentage = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;
    return {
      key: item.key,
      label: isAr ? item.labelAr : item.labelEn,
      count,
      percentage,
      color: item.color
    };
  });
}
