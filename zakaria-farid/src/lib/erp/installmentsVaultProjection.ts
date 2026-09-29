import { ERPPDCRecord, ERPContract, ERPInstallmentSchedule, PDCStatus, InstallmentStatus } from './types';
import { Property } from '../supabase/types';
import { D, Decimal } from './math';

export type VaultItemStatus = 
  | 'overdue'       // Past due date and not settled/cleared
  | 'due_today'     // Due today and not settled/cleared
  | 'upcoming'      // Future due date and pending in safe/schedule
  | 'in_safe'       // Cheque physically in safe
  | 'deposited'     // Cheque deposited in bank transit (NOT liquid cash)
  | 'cleared'       // Collected and cleared into liquid bank/safe cash
  | 'bounced';      // Bounced or defaulted

export type VaultItemKind = 'cheque' | 'schedule_due' | 'consolidated';

export interface ProjectedVaultItem {
  id: string; // unique ID: pdc.cheque_id or `SCH-${schedule.schedule_id}`
  kind: VaultItemKind;
  scheduleId?: string;
  chequeId?: string;
  contractId: string;
  contractNumber: string;
  buyerName: string;
  unitId: string;
  propertyId?: string;
  projectTitle: string;
  trancheNumber?: number;
  isDownPayment: boolean;
  description: string;
  dueDate: string; // YYYY-MM-DD
  nominalValue: string;
  amountPaid: string;
  remainingAmount: string;
  status: VaultItemStatus;
  rawPdcStatus?: PDCStatus;
  rawInstallmentStatus?: InstallmentStatus;
  instrumentNumber: string; // cheque_number or synthetic note e.g. "SND-104-T2"
  bankName: string;
  paymentMethod?: 'CASH' | 'INSTAPAY' | string;
  depositedDate?: string;
  clearedDate?: string;
  paymentDate?: string;
  linkedContract?: ERPContract;
  linkedSchedule?: ERPInstallmentSchedule;
  linkedCheque?: ERPPDCRecord;
}

export interface VaultKPIs {
  totalCount: number;
  totalSum: Decimal;
  clearedCount: number;
  clearedSum: Decimal;
  overdueCount: number;
  overdueSum: Decimal;
  dueTodayCount: number;
  dueTodaySum: Decimal;
  dueWeekCount: number;
  dueWeekSum: Decimal;
  dueMonthCount: number;
  dueMonthSum: Decimal;
  depositedCount: number; // In bank clearing transit (NOT liquid cash)
  depositedSum: Decimal;
  bouncedCount: number;
  bouncedSum: Decimal;
  upcomingCount: number;
  upcomingSum: Decimal;
  collectionRate: number; // 0 - 100
}

export interface ProjectVaultOptions {
  referenceDate?: string; // YYYY-MM-DD
  isAr?: boolean;
}

/**
 * Normalizes any date string or ISO timestamp into YYYY-MM-DD.
 */
export function normalizeDateStr(rawDate?: string | null): string {
  if (!rawDate) return '';
  const trimmed = String(rawDate).trim();
  if (trimmed.includes('T')) {
    return trimmed.split('T')[0];
  }
  return trimmed;
}

/**
 * Formats year, 0-indexed month, and day into YYYY-MM-DD string without UTC timezone shift.
 */
export function formatYMD(year: number, month: number, day: number): string {
  const d = new Date(year, month, day);
  if (year >= 0 && year < 100) {
    d.setFullYear(year);
  }
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

/**
 * Formats a Date object into local YYYY-MM-DD string without UTC offset distortion.
 */
export function toLocalDateStr(date: Date): string {
  return formatYMD(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Gets today's calendar date in local timezone as YYYY-MM-DD.
 */
export function getLocalTodayStr(): string {
  return toLocalDateStr(new Date());
}

/**
 * Builds a deduplicated, reconciled projection of installment schedules and instruments.
 * Invariants:
 * 1. An installment schedule without a cheque is projected as an active due.
 * 2. An installment with an associated PDC is consolidated into exactly ONE row (zero double counting).
 * 3. Matching priority: schedule_id first, then (contract_id, due_date) preferring identical nominal value.
 * 4. Banking boundary: Deposited cheques ('Deposited') are in bank clearing transit and NEVER counted as cleared liquid cash.
 * 5. Inactive, void, or superseded schedules and rescinded contracts are excluded.
 */
export function buildProjectedVaultItems(
  pdcRecords: ERPPDCRecord[] = [],
  schedules: ERPInstallmentSchedule[] = [],
  contracts: ERPContract[] = [],
  properties: Property[] = [],
  options: ProjectVaultOptions = {}
): ProjectedVaultItem[] {
  const isAr = options.isAr ?? true;
  const refDate = normalizeDateStr(options.referenceDate) || getLocalTodayStr();

  // Quick lookup maps
  const contractMap = new Map<string, ERPContract>();
  contracts.forEach(c => {
    contractMap.set(c.contract_id, c);
    if (c.contract_number) {
      contractMap.set(c.contract_number, c);
    }
  });

  const getCanonicalContractId = (rawId?: string): string => {
    if (!rawId) return '';
    const c = contractMap.get(rawId);
    return c ? c.contract_id : rawId;
  };

  const propertyMap = new Map<string, Property>();
  properties.forEach(p => {
    propertyMap.set(p.id, p);
  });

  const getProjectTitle = (propertyId?: string, fallback = ''): string => {
    if (!propertyId) return fallback || (isAr ? 'مشروع عقاري' : 'Real Estate Project');
    const prop = propertyMap.get(propertyId);
    if (!prop) return fallback || (isAr ? 'مشروع عقاري' : 'Real Estate Project');
    return isAr 
      ? (prop.title_ar || prop.title_en || fallback || 'مشروع عقاري')
      : (prop.title_en || prop.title_ar || fallback || 'Property');
  };

  // Filter out void / superseded schedules or rescinded contracts
  const validSchedules = schedules.filter(s => {
    if (s.status === 'Void' || s.status === 'SUPERSEDED') return false;
    const contract = contractMap.get(s.contract_id);
    if (contract && contract.status === 'Rescinded') {
      return false;
    }
    return true;
  });

  // Track matched PDCs
  const matchedPdcIds = new Set<string>();

  // Map PDCs by schedule_id
  const pdcByScheduleId = new Map<string, ERPPDCRecord>();
  pdcRecords.forEach(p => {
    if (p.schedule_id && p.status !== 'Void') {
      pdcByScheduleId.set(p.schedule_id, p);
    }
  });

  // Map PDCs by (canonical_contract_id, normalized_due_date)
  const pdcByContractAndDate = new Map<string, ERPPDCRecord[]>();
  pdcRecords.forEach(p => {
    if (p.status !== 'Void') {
      const canonicalCId = getCanonicalContractId(p.contract_id);
      const normalizedDueDate = normalizeDateStr(p.due_date);
      const key = `${canonicalCId}__${normalizedDueDate}`;
      const list = pdcByContractAndDate.get(key) || [];
      list.push(p);
      pdcByContractAndDate.set(key, list);
    }
  });

  const projectedItems: ProjectedVaultItem[] = [];

  // Helper to determine status based on PDC or Schedule
  const resolveStatus = (
    isCleared: boolean,
    isBounced: boolean,
    isDeposited: boolean,
    dueDate: string
  ): VaultItemStatus => {
    const normDue = normalizeDateStr(dueDate);
    if (isCleared) return 'cleared';
    if (isBounced) return 'bounced';
    if (isDeposited) return 'deposited';
    if (normDue < refDate) return 'overdue';
    if (normDue === refDate) return 'due_today';
    return 'upcoming';
  };

  // Helper to format tranche description
  const formatTrancheDesc = (trancheNum: number | undefined, isDown: boolean): string => {
    if (isDown || trancheNum === 0) {
      return isAr ? 'الدفعة المقدمة (تعاقد)' : 'Down Payment';
    }
    if (trancheNum !== undefined && trancheNum > 0) {
      return isAr ? `قسط دوري رقم (${trancheNum})` : `Installment #${trancheNum}`;
    }
    return isAr ? 'قسط تعاقدي دوري' : 'Installment Due';
  };

  // 1. Pre-match schedules to PDCs using 3-pass reconciliation:
  // Pass 1: Direct schedule_id link
  // Pass 2: Exact (contract, due_date, nominal_value)
  // Pass 3: Fallback (contract, due_date)
  const scheduleToPdcMap = new Map<string, ERPPDCRecord>();

  // Pass 1: Explicit schedule_id match
  for (const s of validSchedules) {
    const directPdc = pdcByScheduleId.get(s.schedule_id);
    if (directPdc && !matchedPdcIds.has(directPdc.cheque_id)) {
      scheduleToPdcMap.set(s.schedule_id, directPdc);
      matchedPdcIds.add(directPdc.cheque_id);
    }
  }

  // Pass 2: Exact (contract_id, due_date, nominal_value) match
  for (const s of validSchedules) {
    if (scheduleToPdcMap.has(s.schedule_id)) continue;
    const canonicalContractId = getCanonicalContractId(s.contract_id);
    const normalizedDueDate = normalizeDateStr(s.due_date);
    const dateKey = `${canonicalContractId}__${normalizedDueDate}`;
    const candidates = pdcByContractAndDate.get(dateKey) || [];
    const exactMatch = candidates.find(
      p => !matchedPdcIds.has(p.cheque_id) && D(p.nominal_value || '0').equals(D(s.nominal_value || '0'))
    );
    if (exactMatch) {
      scheduleToPdcMap.set(s.schedule_id, exactMatch);
      matchedPdcIds.add(exactMatch.cheque_id);
    }
  }

  // Pass 3: Fallback (contract_id, due_date) match for any remaining candidates
  for (const s of validSchedules) {
    if (scheduleToPdcMap.has(s.schedule_id)) continue;
    const canonicalContractId = getCanonicalContractId(s.contract_id);
    const normalizedDueDate = normalizeDateStr(s.due_date);
    const dateKey = `${canonicalContractId}__${normalizedDueDate}`;
    const candidates = pdcByContractAndDate.get(dateKey) || [];
    const anyMatch = candidates.find(p => !matchedPdcIds.has(p.cheque_id));
    if (anyMatch) {
      scheduleToPdcMap.set(s.schedule_id, anyMatch);
      matchedPdcIds.add(anyMatch.cheque_id);
    }
  }

  // 2. Process valid schedules into projected items
  for (const s of validSchedules) {
    const linkedContract = contractMap.get(s.contract_id);
    const buyerName = linkedContract?.buyer_name || (isAr ? 'عميل متعاقد' : 'Contracted Buyer');
    const unitId = linkedContract?.unit_id || (isAr ? 'وحدة عقارية' : 'Unit');
    const contractNumber = linkedContract?.contract_number || s.contract_id;
    const projectTitle = getProjectTitle(linkedContract?.property_id);
    const isDownPayment = s.tranche_number === 0;
    const desc = formatTrancheDesc(s.tranche_number, isDownPayment);

    const matchedPdc = scheduleToPdcMap.get(s.schedule_id);

    if (matchedPdc) {

      const isCleared = matchedPdc.status === 'Cleared' || s.status === 'Paid';
      const isBounced = matchedPdc.status === 'Bounced';
      const isDeposited = matchedPdc.status === 'Deposited';
      const nominalVal = matchedPdc.nominal_value || s.nominal_value;

      const paidVal = isCleared ? D(nominalVal).toFixed(2) : D(s.amount_paid || '0').toFixed(2);
      const remainingVal = isCleared ? '0.00' : Math.max(0, D(nominalVal).minus(D(s.amount_paid || '0')).toNumber()).toFixed(2);

      const status = resolveStatus(isCleared, isBounced, isDeposited, matchedPdc.due_date || s.due_date);

      projectedItems.push({
        id: matchedPdc.cheque_id,
        kind: 'consolidated',
        scheduleId: s.schedule_id,
        chequeId: matchedPdc.cheque_id,
        contractId: s.contract_id,
        contractNumber,
        buyerName: matchedPdc.drawer_name || buyerName,
        unitId,
        propertyId: linkedContract?.property_id,
        projectTitle,
        trancheNumber: s.tranche_number,
        isDownPayment,
        description: desc,
        dueDate: normalizeDateStr(matchedPdc.due_date || s.due_date),
        nominalValue: D(nominalVal).toFixed(2),
        amountPaid: paidVal,
        remainingAmount: remainingVal,
        status,
        rawPdcStatus: matchedPdc.status,
        rawInstallmentStatus: s.status,
        instrumentNumber: matchedPdc.cheque_number,
        bankName: (isAr ? 'كاش / إنستاباي' : 'Cash / InstaPay'),
        paymentMethod: (matchedPdc as any).payment_channel || (s as any).payment_method || 'CASH',
        depositedDate: normalizeDateStr(matchedPdc.deposited_date),
        clearedDate: normalizeDateStr(matchedPdc.cleared_date || s.paid_date),
        paymentDate: normalizeDateStr(matchedPdc.cleared_date || s.paid_date),
        linkedContract,
        linkedSchedule: s,
        linkedCheque: matchedPdc
      });
    } else {
      // SCHEDULE-ONLY ROW: Installment due without an associated cheque instrument
      const isCleared = s.status === 'Paid';
      const isBounced = s.status === 'Defaulted';
      const nominalVal = s.nominal_value;
      const remainingVal = isCleared ? '0.00' : Math.max(0, D(nominalVal).minus(D(s.amount_paid || '0')).toNumber()).toFixed(2);
      const paidVal = isCleared ? D(nominalVal).toFixed(2) : D(s.amount_paid || '0').toFixed(2);

      const status = resolveStatus(isCleared, isBounced, false, s.due_date);
      const syntheticCode = `SND-${s.contract_id.slice(-4)}-T${s.tranche_number}`;

      projectedItems.push({
        id: `SCH-${s.schedule_id}`,
        kind: 'schedule_due',
        scheduleId: s.schedule_id,
        contractId: s.contract_id,
        contractNumber,
        buyerName,
        unitId,
        propertyId: linkedContract?.property_id,
        projectTitle,
        trancheNumber: s.tranche_number,
        isDownPayment,
        description: desc,
        dueDate: normalizeDateStr(s.due_date),
        nominalValue: D(nominalVal).toFixed(2),
        amountPaid: paidVal,
        remainingAmount: remainingVal,
        status,
        rawInstallmentStatus: s.status,
        instrumentNumber: syntheticCode,
        bankName: isAr ? 'سند استحقاق نقدي بالخزينة' : 'Cash Safe Note',
        paymentMethod: (s as any).payment_method || 'CASH',
        clearedDate: normalizeDateStr(s.paid_date),
        paymentDate: normalizeDateStr(s.paid_date),
        linkedContract,
        linkedSchedule: s
      });
    }
  }

  // 2. Process remaining unmatched PDCs (instruments without linked schedule)
  for (const pdc of pdcRecords) {
    if (matchedPdcIds.has(pdc.cheque_id) || pdc.status === 'Void') continue;

    const canonicalContractId = getCanonicalContractId(pdc.contract_id);
    const linkedContract = contractMap.get(canonicalContractId) || contractMap.get(pdc.contract_id);
    
    // Exclude PDCs belonging to Rescinded contracts
    if (linkedContract && linkedContract.status === 'Rescinded') {
      continue;
    }

    const buyerName = pdc.drawer_name || linkedContract?.buyer_name || (isAr ? 'عميل متعاقد' : 'Contracted Buyer');
    const unitId = linkedContract?.unit_id || (isAr ? 'دفعة تعاقدية مباشرة' : 'Direct Installment');
    const contractNumber = linkedContract?.contract_number || pdc.contract_id;
    const projectTitle = getProjectTitle(linkedContract?.property_id);

    const isCleared = pdc.status === 'Cleared';
    const isBounced = pdc.status === 'Bounced';
    const isDeposited = pdc.status === 'Deposited';
    const nominalVal = pdc.nominal_value || '0.00';

    const remainingVal = isCleared ? '0.00' : D(nominalVal).toFixed(2);
    const paidVal = isCleared ? D(nominalVal).toFixed(2) : '0.00';

    const status = resolveStatus(isCleared, isBounced, isDeposited, pdc.due_date);

    projectedItems.push({
      id: pdc.cheque_id,
      kind: 'cheque',
      chequeId: pdc.cheque_id,
      contractId: pdc.contract_id,
      contractNumber,
      buyerName,
      unitId,
      propertyId: linkedContract?.property_id,
      projectTitle,
      isDownPayment: false,
      description: isAr ? 'دفعة تعاقدية مستقلة' : 'Standalone Contract Installment',
      dueDate: normalizeDateStr(pdc.due_date),
      nominalValue: D(nominalVal).toFixed(2),
      amountPaid: paidVal,
      remainingAmount: remainingVal,
      status,
      rawPdcStatus: pdc.status,
      instrumentNumber: pdc.cheque_number,
      bankName: (isAr ? 'كاش / إنستاباي' : 'Cash / InstaPay'),
      paymentMethod: (pdc as any).payment_channel || 'CASH',
      depositedDate: normalizeDateStr(pdc.deposited_date),
      clearedDate: normalizeDateStr(pdc.cleared_date),
      paymentDate: normalizeDateStr(pdc.cleared_date),
      linkedContract,
      linkedCheque: pdc
    });
  }

  return projectedItems;
}

/**
 * Computes consolidated, truthful KPIs from projected vault items.
 * Strictly enforces that deposited cheques (in bank clearing transit)
 * are NEVER counted as cleared liquid cash.
 */
export function calculateVaultKPIs(
  items: ProjectedVaultItem[],
  referenceDate?: string
): VaultKPIs {
  const refDate = normalizeDateStr(referenceDate) || getLocalTodayStr();
  
  // Calculate 7-day window using local date math
  const dateParts = refDate.split('-').map(Number);
  const refYear = dateParts[0] || new Date().getFullYear();
  const refMonth = (dateParts[1] || (new Date().getMonth() + 1)) - 1;
  const refDay = dateParts[2] || new Date().getDate();

  const weekObj = new Date(refYear, refMonth, refDay + 7);
  const weekDateStr = formatYMD(weekObj.getFullYear(), weekObj.getMonth(), weekObj.getDate());

  // Calculate current month bounds
  const currentYearMonth = refDate.substring(0, 7); // e.g. "2025-03"

  let totalSum = D(0);
  let clearedSum = D(0);
  let clearedCount = 0;
  let overdueSum = D(0);
  let overdueCount = 0;
  let dueTodaySum = D(0);
  let dueTodayCount = 0;
  let dueWeekSum = D(0);
  let dueWeekCount = 0;
  let dueMonthSum = D(0);
  let dueMonthCount = 0;
  let depositedSum = D(0);
  let depositedCount = 0;
  let bouncedSum = D(0);
  let bouncedCount = 0;
  let upcomingSum = D(0);
  let upcomingCount = 0;

  for (const item of items) {
    const nominal = D(item.nominalValue || '0');
    const remaining = D(item.remainingAmount || item.nominalValue || '0');
    const paid = D(item.amountPaid || '0');

    totalSum = totalSum.plus(nominal);

    if (item.status === 'cleared') {
      clearedSum = clearedSum.plus(paid.gt(0) ? paid : nominal);
      clearedCount++;
    } else if (paid.gt(0)) {
      // Partial payment already received as liquid cash
      clearedSum = clearedSum.plus(paid);
    }

    switch (item.status) {
      case 'cleared':
        break;

      case 'deposited':
        // Banking boundary: In transit, NOT counted towards liquid cash!
        depositedSum = depositedSum.plus(remaining);
        depositedCount++;
        break;

      case 'bounced':
        bouncedSum = bouncedSum.plus(remaining);
        bouncedCount++;
        break;

      case 'overdue':
        overdueSum = overdueSum.plus(remaining);
        overdueCount++;
        break;

      case 'due_today':
        dueTodaySum = dueTodaySum.plus(remaining);
        dueTodayCount++;
        break;

      case 'upcoming':
      case 'in_safe':
      default:
        upcomingSum = upcomingSum.plus(remaining);
        upcomingCount++;
        break;
    }

    // Check week window (active dues within next 7 days, excluding cleared/bounced)
    if (item.status !== 'cleared' && item.status !== 'bounced') {
      if (item.dueDate >= refDate && item.dueDate <= weekDateStr) {
        dueWeekSum = dueWeekSum.plus(remaining);
        dueWeekCount++;
      }
      if (item.dueDate.startsWith(currentYearMonth)) {
        dueMonthSum = dueMonthSum.plus(remaining);
        dueMonthCount++;
      }
    }
  }

  // Calculate collection rate: cleared vs total due potential
  const totalDuePotential = clearedSum.plus(overdueSum).plus(dueTodaySum).plus(depositedSum);
  const collectionRate = totalDuePotential.gt(0)
    ? parseFloat(clearedSum.dividedBy(totalDuePotential).times(100).toFixed(1))
    : 0;

  return {
    totalCount: items.length,
    totalSum,
    clearedCount,
    clearedSum,
    overdueCount,
    overdueSum,
    dueTodayCount,
    dueTodaySum,
    dueWeekCount,
    dueWeekSum,
    dueMonthCount,
    dueMonthSum,
    depositedCount,
    depositedSum,
    bouncedCount,
    bouncedSum,
    upcomingCount,
    upcomingSum,
    collectionRate
  };
}

/**
 * Normalizes text for comparison across dash types, Arabic orthography, and spacing.
 */
function normalizeForComparison(str: string): string {
  return (str || '')
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-') // normalize hyphens, en-dashes, em-dashes, minus
    .replace(/[\u064B-\u065F\u0670]/g, '')                     // strip Arabic tashkeel / diacritics
    .replace(/\u0640/g, '')                                     // strip tatweel / kashida
    .replace(/[أإآٱ]/g, 'ا')                                    // normalize alef variants
    .replace(/[ة]/g, 'ه')                                       // normalize taa marbouta
    .replace(/[ى]/g, 'ي')                                       // normalize alef maksura / yaa
    .replace(/\s+/g, ' ')                                       // normalize whitespace
    .trim()
    .toLowerCase();
}

/**
 * Deduplicates project title and unit identifier.
 * If unitId is empty, matches projectTitle, repeats projectTitle, or is a generic placeholder,
 * returns null or only the distinctive unit part.
 */
export function getDistinctiveUnit(projectTitle?: string, unitId?: string): string | null {
  if (!unitId) return null;
  const p = (projectTitle || '').trim();
  const u = unitId.trim();
  if (!u) return null;

  // Generic fallback placeholders in ERP when contract has no specific unit assigned
  const genericPlaceholders = [
    'وحدة عقارية', 'وحدة', 'unit', 'real estate unit',
    'شيك ضمان / دفعة مباشرة', 'direct note', 'شيك ضمان'
  ];
  if (genericPlaceholders.some(g => normalizeForComparison(u) === normalizeForComparison(g))) {
    return null;
  }

  if (!p) return u;

  const normP = normalizeForComparison(p);
  const normU = normalizeForComparison(u);

  // Exact or normalized equivalence
  if (normP === normU) return null;

  // If project title already captures unitId wholly
  if (normP.includes(normU)) return null;

  // 1. Direct substring stripping when unitId contains projectTitle verbatim
  if (u.toLowerCase().includes(p.toLowerCase())) {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const stripped = u
      .replace(new RegExp(escaped, 'gi'), '')
      .replace(/^[\s\-–—/•:،,.\[\]()]+|[\s\-–—/•:،,.\[\]()]+$/g, '')
      .trim();
    return stripped.length > 0 ? stripped : null;
  }

  // 2. Normalized match (handles dash variants, orthographic variants, and common delimiters)
  if (normU.includes(normP)) {
    const parts = u.split(/[\-–—•/:\[\]()]+/).map(x => x.trim()).filter(Boolean);
    const nonMatching = parts.filter(part => {
      const np = normalizeForComparison(part);
      return np !== normP && !normP.includes(np) && !np.includes(normP);
    });
    if (nonMatching.length > 0) {
      return nonMatching.join(' - ');
    }
    return null;
  }

  return u;
}
