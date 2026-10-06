/**
 * Zakaria Farid Real Estate ERP — Partners & Equity Management Engine
 * Financial Invariants:
 * - INV-4.1: Double-entry balanced journal creation (Dr 303000 / Cr 101000/102000 for payouts, Dr 101000/102000 / Cr 301000 for injections)
 * - INV-Partnership-100%: Project partner equity splits must sum to 100% exactly
 * - Zero-float arithmetic with Decimal.js
 */

import { D, Decimal } from './math';
import { 
  ERPPartnerProfile, 
  PartnerRole,
  ERPPartnerTransaction, 
  ERPPartnerCall, 
  ERPPartnerCommitment,
  ERPContract, 
  ERPJournalEntry,
  ERPAccountingPeriod,
  BuildingOwnershipLogEntry,
  OwnershipActionType,
  DynamicBuildingCapitalInfo,
  ERPPropertyCostItem
} from './types';
import { Property } from '@/lib/supabase/types';
import { PRIMARY_DEVELOPER_NAME } from './partnersDirectory';
import { GeneralLedgerEngine, buildCalendarMonthPeriod } from './ledger';
import { calculatePropertyAuditMetrics } from './propertyCostEngine';

/** Costs actually recorded for a property (user-confirmed basis for partner capital and cost shares). */
export function recordedPropertyCost(property: Property, propertyCosts: ERPPropertyCostItem[] = []): Decimal {
  return D(calculatePropertyAuditMetrics(property.id, property.area_sqm || 0, propertyCosts).totalLoggedCost);
}

export interface PartnerProjectHolding {
  propertyId: string;
  propertyTitle: string;
  sharePct: number;
  wipCostShare: string;
  contractSalesShare: string;
  collectionsShare: string;
  projectProfitShare: string;
}

export interface PartnerFinancialSummary {
  partnerName: string;
  role?: PartnerRole;
  roleTitleAr: string;
  phone?: string;
  national_id?: string;
  bank_name?: string;
  iban?: string;
  instapay_handle?: string;
  preferred_payout_method?: 'CASH' | 'INSTAPAY' | 'BANK';
  isPermanent: boolean;
  joined_date?: string;
  holdings: PartnerProjectHolding[];
  totalContributedCapital: string;
  totalCollectionsShare: string;
  totalWipCostShare: string;
  totalDistributionsPaid: string;
  netCurrentBalance: string; // (Collections Share - Distributions Paid)
  totalArrears?: string;
  lastActivityDate?: string;
  investmentShareLabel?: string;
  roiPercent: number;
}

export interface ProjectPartnershipCardData {
  propertyId: string;
  propertyTitle: string;
  location: string;
  totalUnitsCount: number;
  soldUnitsCount: number;
  totalIncurredWip: string;
  totalContractSales: string;
  totalCashCollected: string;
  projectNetProfit: string;
  partners: Array<{
    name: string;
    sharePct: number;
    wipCostShare: string;
    salesShare: string;
    collectionsShare: string;
    profitShare: string;
    paidPayouts: string;
    remainingDues: string;
  }>;
}

export const INITIAL_PARTNER_PROFILES: ERPPartnerProfile[] = [
  {
    id: 'pt-001',
    name: PRIMARY_DEVELOPER_NAME,
    role: 'primary_developer',
    phone: '01001234567',
    notes: 'المطور الرئيسي ومؤسس المجموعة - صاحب الحصة الحاكمة والمسؤول التنفيذي',
    joined_date: '2024-01-01'
  },
  {
    id: 'pt-002',
    name: 'م. أحمد الشريف',
    role: 'equity_partner',
    phone: '01123456789',
    national_id: '28911041200345',
    instapay_handle: 'ahmed.elsharif@instapay',
    preferred_payout_method: 'INSTAPAY',
    notes: 'شريك ممول ومساهم رئيسي في مشروعات عمارة الشيخ زايد والحي الخامس بحصة 35%',
    joined_date: '2025-06-15'
  },
  {
    id: 'pt-003',
    name: 'الحاج رجب الصاوي',
    role: 'land_partner',
    phone: '01234567890',
    national_id: '27508151200876',
    instapay_handle: 'ragab.elsawy@instapay',
    preferred_payout_method: 'CASH',
    notes: 'شريك بالأرض بموقع العين السخنة - مشاركة بنسبة 30% من عوائد المبيعات نقداً بالخزينة',
    joined_date: '2025-09-01'
  },
  {
    id: 'pt-004',
    name: 'د. هاني المنياوي',
    role: 'silent_financier',
    phone: '01555667788',
    national_id: '28204221200432',
    instapay_handle: 'hany.elmeniawy@instapay',
    preferred_payout_method: 'INSTAPAY',
    notes: 'ممول صامت بحصة نقدية بمشروع الساحل الشمالي بنسبة 25%',
    joined_date: '2025-11-20'
  }
];

export const INITIAL_PARTNER_TRANSACTIONS: ERPPartnerTransaction[] = [
  {
    id: 'pt-tx-001',
    transaction_number: 'PT-2026-101',
    partner_name: 'م. أحمد الشريف',
    type: 'CAPITAL_INJECTION',
    amount: '15000000.00',
    property_id: 'the-obsidian-pavilion',
    property_title: 'عمارة الفردوس - الحي الخامس',
    payment_method: 'INSTAPAY_102000',
    journal_entry_number: 'JE-2026-CAP-001',
    date: '2026-01-10',
    status: 'COMPLETED',
    memo: 'ضخ دفعة أولى من مساهمة رأس مال مشروع عمارة الفردوس عبر إنستاباي',
    receipt_ref: 'REC-CAP-2026-01'
  },
  {
    id: 'pt-tx-002',
    transaction_number: 'PT-2026-102',
    partner_name: 'د. هاني المنياوي',
    type: 'CAPITAL_INJECTION',
    amount: '10000000.00',
    property_id: 'the-sky-palace-penthouse',
    property_title: 'برج الصفوة - المحطة',
    payment_method: 'INSTAPAY_102000',
    journal_entry_number: 'JE-2026-CAP-002',
    date: '2026-01-15',
    status: 'COMPLETED',
    memo: 'تحويل فوري إنستاباي مساهمة رأس مال تمويل خامات ومصنعيات الخرسانة',
    receipt_ref: 'REC-CAP-2026-02'
  },
  {
    id: 'pt-tx-003',
    transaction_number: 'PT-2026-103',
    partner_name: 'م. أحمد الشريف',
    type: 'PROFIT_DISTRIBUTION',
    amount: '2500000.00',
    property_id: 'the-obsidian-pavilion',
    property_title: 'عمارة الفردوس - الحي الخامس',
    payment_method: 'INSTAPAY_102000',
    journal_entry_number: 'JE-2026-DIST-001',
    date: '2026-02-15',
    status: 'COMPLETED',
    memo: 'صرف دفعة أرباح مرحلية عبر تطبيق إنستاباي من حصيلة بيع شقق الدور الثاني والثالث',
    receipt_ref: 'PAY-DIST-2026-01'
  },
  {
    id: 'pt-tx-004',
    transaction_number: 'PT-2026-104',
    partner_name: 'الحاج رجب الصاوي',
    type: 'PROFIT_DISTRIBUTION',
    amount: '1800000.00',
    property_id: 'sokhna-sea-cliff-mansion',
    property_title: 'عمارة النخيل والصفوة',
    payment_method: 'CASH_101000',
    journal_entry_number: 'JE-2026-DIST-002',
    date: '2026-02-28',
    status: 'COMPLETED',
    memo: 'صرف كاش من خزينة الشركة تحت حساب عوائد حصة الأرض',
    receipt_ref: 'PAY-DIST-2026-02'
  }
];

export interface FullInternalBuyoutParams {
  property: Property;
  fromPartnerName: string;
  toPartnerName: string;
  effectiveDate: string;
  transferValueEgp?: string;
  notes?: string;
}

export interface PartialSaleParams {
  property: Property;
  fromPartnerName: string;
  toPartnerName: string;
  soldSharePct: number;
  effectiveDate: string;
  transferValueEgp?: string;
  notes?: string;
}

export interface FullSubstitutionParams {
  property: Property;
  fromPartnerName: string;
  toPartnerName: string;
  effectiveDate: string;
  transferValueEgp?: string;
  transferArrears: boolean;
  transferredArrearsEgp?: string;
  notes?: string;
}

/**
 * Normalizes partner splits on a property so that the founder has an explicit entry
 * and active splits sum up cleanly.
 */
export function normalizePropertySplits(property: Property): Array<{
  partner_name: string;
  share_percentage: number;
  partnerName?: string;
  sharePct?: number;
  is_archived?: boolean;
}> {
  const rawSplits = (property.partner_splits as any[]) || [];
  const normalized = rawSplits.map(s => {
    const pName = (s.partner_name || s.partnerName || '').trim();
    const pct = Number(s.share_percentage ?? s.sharePct ?? 0) || 0;
    return {
      partner_name: pName,
      share_percentage: pct,
      partnerName: pName,
      sharePct: pct,
      is_archived: Boolean(s.is_archived)
    };
  });

  const hasFounder = normalized.some(s => 
    !s.is_archived && (s.partner_name === PRIMARY_DEVELOPER_NAME || s.partner_name.includes('زكريا فريد'))
  );

  if (!hasFounder) {
    const othersPct = normalized
      .filter(s => !s.is_archived && s.partner_name !== PRIMARY_DEVELOPER_NAME && !s.partner_name.includes('زكريا فريد'))
      .reduce((sum, s) => sum + s.share_percentage, 0);
    const founderPct = Math.max(0, 100 - othersPct);
    normalized.unshift({
      partner_name: PRIMARY_DEVELOPER_NAME,
      share_percentage: founderPct,
      partnerName: PRIMARY_DEVELOPER_NAME,
      sharePct: founderPct,
      is_archived: false
    });
  }

  return normalized;
}

/**
 * Computes partner capital owed and arrears for a building (user-confirmed 2026-10-05).
 * Rule: everyone matches the highest contributor, in proportion to their share.
 * - paid_i = sum(CAPITAL_INJECTION transactions of partner i on this property)
 * - totalCapital = max over active partners with share > 0 of (paid_i / (share_i / 100))
 * - required_i = totalCapital * (share_i / 100); arrears_i = max(0, required_i - paid_i)
 * Example: Zakaria 50% pays 1,000,000 -> total 2,000,000 -> a 50% partner owes 1,000,000.
 * `impliedTotalCapitalEgp` carries totalCapital. `_propertyCosts` is kept for call-site compatibility.
 */
export function computeDynamicBuildingCapital(
  property: Property,
  transactions: ERPPartnerTransaction[] = [],
  _propertyCosts: ERPPropertyCostItem[] = []
): DynamicBuildingCapitalInfo {
  const propTitle = property.title_ar || property.title_en || 'مشروع عقاري';
  const normalizedSplits = normalizePropertySplits(property);
  const activeSplits = normalizedSplits.filter(s => !s.is_archived);
  const isFounderName = (name: string) => name === PRIMARY_DEVELOPER_NAME || name.includes(PRIMARY_DEVELOPER_NAME);

  // 1. Identify founder split
  const founderSplit = activeSplits.find(s => isFounderName(s.partner_name));
  const founderSharePct = founderSplit ? founderSplit.share_percentage : 0;

  // 2. Capital paid by each active partner into this building
  const paidBy = (partnerName: string, isFounder: boolean) => transactions
    .filter(t =>
      (isFounder ? isFounderName(t.partner_name) : t.partner_name === partnerName) &&
      t.property_id === property.id &&
      t.type === 'CAPITAL_INJECTION'
    )
    .reduce((sum, t) => sum.plus(t.amount || 0), D(0));

  const rows = activeSplits.map(split => {
    const isFounder = isFounderName(split.partner_name);
    return { split, isFounder, paid: paidBy(split.partner_name, isFounder) };
  });
  const founderInjected = rows.find(r => r.isFounder)?.paid ?? D(0);

  // 3. Total building capital implied by the highest contributor (paid / share)
  let impliedTotalCapital = D(0);
  let leaderIndex = -1;
  rows.forEach((r, idx) => {
    if (r.split.share_percentage <= 0 || !r.paid.isPositive()) return;
    const implied = r.paid.timesRatio(100, r.split.share_percentage);
    if (implied.gt(impliedTotalCapital)) {
      impliedTotalCapital = implied;
      leaderIndex = idx;
    }
  });

  // 4. Per-partner calculation
  const partnerStatuses: DynamicBuildingCapitalInfo['partnerStatuses'] = [];

  rows.forEach((r, idx) => {
    const sharePct = r.split.share_percentage;
    // The leader's requirement is exactly what they paid (no piastre drift from rounding the total).
    const required = idx === leaderIndex ? r.paid : impliedTotalCapital.timesRatio(sharePct, 100);
    const arrears = required.gt(r.paid) ? required.minus(r.paid) : D(0);

    partnerStatuses.push({
      partnerName: r.split.partner_name,
      sharePct,
      requiredContributionEgp: required.toFixed(2),
      paidContributionEgp: r.paid.toFixed(2),
      arrearsEgp: arrears.toFixed(2),
      hasArrears: arrears.gt(0),
      isFounder: r.isFounder
    });
  });

  // Total actual injected across all partners on this building
  const totalActualInjected = transactions
    .filter(t => t.property_id === property.id && t.type === 'CAPITAL_INJECTION')
    .reduce((sum, t) => sum.plus(t.amount || 0), D(0));

  const fundingRatioPct = impliedTotalCapital.gt(0)
    ? Number(totalActualInjected.times(100).div(impliedTotalCapital).toFixed(2))
    : 0;

  return {
    propertyId: property.id,
    propertyTitle: propTitle,
    targetBudgetEgp: property.target_budget_egp,
    founderInjectedEgp: founderInjected.toFixed(2),
    founderSharePct,
    impliedTotalCapitalEgp: impliedTotalCapital.toFixed(2),
    totalActualInjectedEgp: totalActualInjected.toFixed(2),
    fundingRatioPct,
    partnerStatuses
  };
}

export interface BuildingEquityBalanceReport {
  isBalanced: boolean;
  totalActiveSharePct: number;
  deviationPct: number;
  activePartnersCount: number;
  splits: Array<{ partner_name: string; share_percentage: number; is_archived?: boolean }>;
}

/**
 * Checks whether active partner equity shares in a building property strictly balance to 100%.
 * Detects any imbalance, over-allocation, or deficit.
 */
export function checkBuildingEquityBalance(property: Property): BuildingEquityBalanceReport {
  const normalized = normalizePropertySplits(property);
  const activeSplits = normalized.filter(s => !s.is_archived);
  const totalDec = activeSplits.reduce((sum, s) => sum.plus(s.share_percentage || 0), D(0));
  const total = totalDec.toNumber();
  const deviation = totalDec.minus(100).toNumber();
  const isBalanced = totalDec.equals(100);

  return {
    isBalanced,
    totalActiveSharePct: total,
    deviationPct: deviation,
    activePartnersCount: activeSplits.length,
    splits: activeSplits
  };
}

/**
 * Workflow 1: Full Internal Buyout (البيع الكامل لشريك قائم)
 * Full exit of a partner with 100% transfer of their share to another existing partner.
 * Seller is archived; total active shares strictly equal 100%.
 */
export function executeFullInternalBuyout(params: FullInternalBuyoutParams): Property {
  const { property, fromPartnerName, toPartnerName, effectiveDate, transferValueEgp, notes } = params;

  if (property.type !== 'building') {
    throw new Error('Partnership reallocation is only supported for building properties (type === "building")');
  }

  const isFounder = (name: string) => name.trim() === PRIMARY_DEVELOPER_NAME || name.trim().includes('زكريا فريد');
  if (isFounder(fromPartnerName)) {
    throw new Error('Founder Zakaria Farid cannot be bought out or removed from building ownership');
  }

  if (fromPartnerName.trim() === toPartnerName.trim()) {
    throw new Error('Buyer and seller partner cannot be the same person');
  }

  const splits = normalizePropertySplits(property);
  const sellerSplit = splits.find(s => s.partner_name === fromPartnerName.trim() && !s.is_archived);
  if (!sellerSplit || sellerSplit.share_percentage <= 0) {
    throw new Error(`Active partner "${fromPartnerName}" not found in building or has zero share`);
  }

  const buyerSplit = splits.find(s => s.partner_name === toPartnerName.trim() && !s.is_archived);
  if (!buyerSplit) {
    throw new Error(`Buyer partner "${toPartnerName}" is not an active partner in this building. Full internal buyout must be to an existing partner.`);
  }

  const transferredShare = sellerSplit.share_percentage;

  // Add share to buyer
  buyerSplit.share_percentage = Number(D(buyerSplit.share_percentage).plus(transferredShare).toNumber());
  buyerSplit.sharePct = buyerSplit.share_percentage;

  // Archive seller
  sellerSplit.is_archived = true;
  sellerSplit.share_percentage = 0;
  sellerSplit.sharePct = 0;

  // Invariant verification: sum of active shares must be 100%
  const totalActive = splits
    .filter(s => !s.is_archived)
    .reduce((sum, s) => sum.plus(s.share_percentage), D(0));

  if (!totalActive.equals(100)) {
    throw new Error(`Equity split invariant failed: Total active shares must equal 100% (calculated: ${totalActive.toString()}%)`);
  }

  const logEntry: BuildingOwnershipLogEntry = {
    log_id: `LOG-BUYOUT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    property_id: property.id,
    action_type: 'FULL_INTERNAL_BUYOUT',
    from_partner_name: fromPartnerName.trim(),
    to_partner_name: toPartnerName.trim(),
    transferred_share_pct: transferredShare,
    effective_date: effectiveDate,
    transfer_value_egp: transferValueEgp,
    transferred_arrears_flag: false,
    notes,
    created_at: new Date().toISOString()
  };

  return {
    ...property,
    partner_splits: splits,
    ownership_history: [logEntry, ...(property.ownership_history || [])]
  };
}

/**
 * Workflow 2: Partial Sale (البيع الجزئي لحصة)
 * Deduct a fraction of the seller's share and credit it to a current or new partner.
 */
export function executePartialSale(params: PartialSaleParams): Property {
  const { property, fromPartnerName, toPartnerName, soldSharePct, effectiveDate, transferValueEgp, notes } = params;

  if (property.type !== 'building') {
    throw new Error('Partnership reallocation is only supported for building properties (type === "building")');
  }

  if (fromPartnerName.trim() === toPartnerName.trim()) {
    throw new Error('Buyer and seller partner cannot be the same person');
  }

  if (D(soldSharePct).lte(0)) {
    throw new Error('Sold share percentage must be greater than 0%');
  }

  const splits = normalizePropertySplits(property);
  const sellerSplit = splits.find(s => s.partner_name === fromPartnerName.trim() && !s.is_archived);
  if (!sellerSplit || sellerSplit.share_percentage <= 0) {
    throw new Error(`Active partner "${fromPartnerName}" not found in building or has zero share`);
  }

  if (D(soldSharePct).gte(sellerSplit.share_percentage)) {
    throw new Error(`Percentage to transfer (${soldSharePct}%) must be strictly less than seller's current share (${sellerSplit.share_percentage}%). Use full buyout or full substitution instead.`);
  }

  // Deduct from seller
  sellerSplit.share_percentage = Number(D(sellerSplit.share_percentage).minus(soldSharePct).toNumber());
  sellerSplit.sharePct = sellerSplit.share_percentage;

  // Add to buyer
  const buyerSplit = splits.find(s => s.partner_name === toPartnerName.trim());
  if (buyerSplit) {
    buyerSplit.is_archived = false;
    buyerSplit.share_percentage = Number(D(buyerSplit.share_percentage || 0).plus(soldSharePct).toNumber());
    buyerSplit.sharePct = buyerSplit.share_percentage;
  } else {
    splits.push({
      partner_name: toPartnerName.trim(),
      share_percentage: Number(soldSharePct),
      partnerName: toPartnerName.trim(),
      sharePct: Number(soldSharePct),
      is_archived: false
    });
  }

  // Invariant verification: sum of active shares must be 100%
  const totalActive = splits
    .filter(s => !s.is_archived)
    .reduce((sum, s) => sum.plus(s.share_percentage), D(0));

  if (!totalActive.equals(100)) {
    throw new Error(`Equity split invariant failed: Total active shares must equal 100% (calculated: ${totalActive.toString()}%)`);
  }

  const logEntry: BuildingOwnershipLogEntry = {
    log_id: `LOG-PARTIAL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    property_id: property.id,
    action_type: 'PARTIAL_SALE',
    from_partner_name: fromPartnerName.trim(),
    to_partner_name: toPartnerName.trim(),
    transferred_share_pct: Number(soldSharePct),
    effective_date: effectiveDate,
    transfer_value_egp: transferValueEgp,
    transferred_arrears_flag: false,
    notes,
    created_at: new Date().toISOString()
  };

  return {
    ...property,
    partner_splits: splits,
    ownership_history: [logEntry, ...(property.ownership_history || [])]
  };
}

/**
 * Workflow 3: Full Substitution (إحلال كامل لطرف جديد)
 * Exits partner in full, archives them, admits new partner with 100% of their share,
 * and records whether past arrears were transferred or assumed.
 */
export function executeFullSubstitution(params: FullSubstitutionParams): Property {
  const { property, fromPartnerName, toPartnerName, effectiveDate, transferValueEgp, transferArrears, transferredArrearsEgp, notes } = params;

  if (property.type !== 'building') {
    throw new Error('Partnership reallocation is only supported for building properties (type === "building")');
  }

  if (!fromPartnerName || !toPartnerName) {
    throw new Error('Both exiting and incoming partner names are required');
  }

  const isFounder = (name?: string) => Boolean(name && (name.trim() === PRIMARY_DEVELOPER_NAME || name.trim().includes('زكريا فريد')));
  if (isFounder(fromPartnerName)) {
    throw new Error('Founder Zakaria Farid cannot be substituted or removed');
  }

  if (fromPartnerName.trim() === toPartnerName.trim()) {
    throw new Error('Incoming and exiting partner cannot be the same person');
  }

  const splits = normalizePropertySplits(property);
  const sellerSplit = splits.find(s => s.partner_name === fromPartnerName.trim() && !s.is_archived);
  if (!sellerSplit || sellerSplit.share_percentage <= 0) {
    throw new Error(`Active partner "${fromPartnerName}" not found in building or has zero share`);
  }

  // Incoming partner must NOT already be an active partner with equity > 0
  const activeIncoming = splits.find(s => s.partner_name === toPartnerName.trim() && !s.is_archived && (s.share_percentage || 0) > 0);
  if (activeIncoming) {
    throw new Error(`Incoming partner "${toPartnerName}" is already an active partner. Use full internal buyout instead.`);
  }

  const transferredShare = sellerSplit.share_percentage;

  // Archive exiting partner
  sellerSplit.is_archived = true;
  sellerSplit.share_percentage = 0;
  sellerSplit.sharePct = 0;

  // Add or update incoming partner
  const buyerSplit = splits.find(s => s.partner_name === toPartnerName.trim());
  if (buyerSplit) {
    buyerSplit.is_archived = false;
    buyerSplit.share_percentage = Number(D(buyerSplit.share_percentage || 0).plus(transferredShare).toNumber());
    buyerSplit.sharePct = buyerSplit.share_percentage;
  } else {
    splits.push({
      partner_name: toPartnerName.trim(),
      share_percentage: transferredShare,
      partnerName: toPartnerName.trim(),
      sharePct: transferredShare,
      is_archived: false
    });
  }

  // Invariant verification: sum of active shares must be 100%
  const totalActive = splits
    .filter(s => !s.is_archived)
    .reduce((sum, s) => sum.plus(s.share_percentage), D(0));

  if (!totalActive.equals(100)) {
    throw new Error(`Equity split invariant failed: Total active shares must equal 100% (calculated: ${totalActive.toString()}%)`);
  }

  const logEntry: BuildingOwnershipLogEntry = {
    log_id: `LOG-SUB-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    property_id: property.id,
    action_type: 'FULL_SUBSTITUTION',
    from_partner_name: fromPartnerName.trim(),
    to_partner_name: toPartnerName.trim(),
    transferred_share_pct: transferredShare,
    effective_date: effectiveDate,
    transfer_value_egp: transferValueEgp,
    transferred_arrears_flag: transferArrears,
    transferred_arrears_egp: transferArrears ? (transferredArrearsEgp || '0.00') : undefined,
    notes,
    created_at: new Date().toISOString()
  };

  return {
    ...property,
    partner_splits: splits,
    ownership_history: [logEntry, ...(property.ownership_history || [])]
  };
}

export class PartnersEngine {
  /**
   * Calculates detailed partner financial metrics and summaries across all projects and contracts.
   */
  static calculatePartnerSummaries(
    partners: ERPPartnerProfile[] = [],
    properties: Property[] = [],
    contracts: ERPContract[] = [],
    transactions: ERPPartnerTransaction[] = [],
    partnerCalls: ERPPartnerCall[] = [],
    propertyCosts: ERPPropertyCostItem[] = []
  ): PartnerFinancialSummary[] {
    const propertyMap = new Map<string, Property>();
    properties.forEach(p => propertyMap.set(p.id, p));

    // Ensure all unique partner names exist
    const partnerNameSet = new Set<string>();
    partners.forEach(p => partnerNameSet.add(p.name));
    transactions.forEach(t => partnerNameSet.add(t.partner_name));
    partnerCalls.forEach(c => partnerNameSet.add(c.partner_name));
    // Partners named only in a building's equity splits (no profile or transaction yet) are still partners.
    properties.forEach(p => {
      ((p.partner_splits as any[]) || []).forEach(s => {
        const name = (s?.partner_name || s?.partnerName || '').trim();
        // Founder name variants collapse into PRIMARY_DEVELOPER_NAME (added below).
        if (name && !s?.is_archived && !name.includes(PRIMARY_DEVELOPER_NAME)) partnerNameSet.add(name);
      });
    });
    partnerNameSet.add(PRIMARY_DEVELOPER_NAME);

    // Build summaries
    const summaries: PartnerFinancialSummary[] = [];

    partnerNameSet.forEach(partnerName => {
      const profile = partners.find(p => p.name === partnerName);
      const isPermanent = partnerName === PRIMARY_DEVELOPER_NAME;

      // 1. Contributed Capital (Injections)
      const partnerInjections = transactions
        .filter(t => t.partner_name === partnerName && t.type === 'CAPITAL_INJECTION')
        .reduce((sum, t) => sum.plus(t.amount || 0), D(0));

      const partnerCallFunds = partnerCalls
        .filter(c => c.partner_name === partnerName && (c.status === 'Funded' || D(c.paid_amount || 0).greaterThan(0)))
        .reduce((sum, c) => sum.plus(c.paid_amount || c.call_amount || 0), D(0));

      const totalContributedCapital = partnerInjections.greaterThan(partnerCallFunds) 
        ? partnerInjections 
        : (partnerCallFunds.greaterThan(0) ? partnerCallFunds : partnerInjections);

      // 2. Distributions Paid Out
      const totalDistributionsPaid = transactions
        .filter(t => t.partner_name === partnerName && (t.type === 'PROFIT_DISTRIBUTION' || t.type === 'CAPITAL_RETURN'))
        .reduce((sum, t) => sum.plus(t.amount || 0), D(0));

      // 3. Project Holdings & Equity Splits (Building-Only Scope)
      const holdings: PartnerProjectHolding[] = [];
      let totalCollectionsShareDec = D(0);
      let totalWipCostShareDec = D(0);

      const buildingProperties = properties.filter(p => p.type === 'building');

      buildingProperties.forEach(prop => {
        const rawSplits = (prop.partner_splits as any[]) || [];
        const splits = rawSplits.filter(s => !s.is_archived);
        let partnerSharePct = 0;

        const foundSplit = splits.find(s => (s.partnerName || s.partner_name || '').trim() === partnerName);
        if (foundSplit) {
          const raw = foundSplit.sharePct ?? foundSplit.share_percentage ?? 0;
          partnerSharePct = Number(raw) || 0;
        } else if (isPermanent) {
          // Primary developer gets whatever is left from 100%
          const othersPct = splits.reduce((sum, s) => {
            const name = (s.partnerName || s.partner_name || '').trim();
            if (name !== PRIMARY_DEVELOPER_NAME && !name.includes('زكريا فريد')) {
              return sum + (Number(s.sharePct ?? s.share_percentage ?? 0) || 0);
            }
            return sum;
          }, 0);
          partnerSharePct = Math.max(0, 100 - othersPct);
        }

        if (partnerSharePct > 0) {
          // Cost actually recorded on the property (no assumed cost ratio)
          const wipCostShare = recordedPropertyCost(prop, propertyCosts).timesRatio(partnerSharePct, 100);

          // Live contracts on this property (rescinded contracts carry no sales or collections share)
          const propContracts = contracts.filter(c => (c.property_id === prop.id || c.unit_id === prop.id) && c.status !== 'Rescinded');

          let contractSalesShare = D(0);
          let collectionsShare = D(0);

          // Sum explicit contract splits if defined, falling back to shareRatio only for contracts without an explicit split
          propContracts.forEach(c => {
            if (c.partner_splits && c.partner_splits.length > 0) {
              const cSplit = c.partner_splits.find(
                s => (s.partner_name || (s as any).partnerName || '').trim() === partnerName.trim()
              );
              if (cSplit) {
                let sAmt = D(cSplit.share_amount || 0);
                let cAmt = D(cSplit.cash_share || 0);
                if (sAmt.isZero() && cSplit.share_percentage && cSplit.share_percentage !== '0%') {
                  const pct = cSplit.share_percentage.replace('%', '').trim();
                  sAmt = D(c.gross_contract_value || 0).timesRatio(pct, 100);
                  cAmt = D(c.total_cash_collected || 0).timesRatio(pct, 100);
                }
                contractSalesShare = contractSalesShare.plus(sAmt);
                collectionsShare = collectionsShare.plus(cAmt);
              }
            } else {
              contractSalesShare = contractSalesShare.plus(D(c.gross_contract_value || 0).timesRatio(partnerSharePct, 100));
              collectionsShare = collectionsShare.plus(D(c.total_cash_collected || 0).timesRatio(partnerSharePct, 100));
            }
          });

          const projectProfitShare = contractSalesShare.minus(wipCostShare);

          totalCollectionsShareDec = totalCollectionsShareDec.plus(collectionsShare);
          totalWipCostShareDec = totalWipCostShareDec.plus(wipCostShare);

          holdings.push({
            propertyId: prop.id,
            propertyTitle: prop.title_ar || prop.title_en || 'مشروع عقاري',
            sharePct: partnerSharePct,
            wipCostShare: wipCostShare.toFixed(2),
            contractSalesShare: contractSalesShare.toFixed(2),
            collectionsShare: collectionsShare.toFixed(2),
            projectProfitShare: projectProfitShare.toFixed(2)
          });
        }
      });

      // Net current balance: Collections belonging to partner minus what has already been distributed
      const netCurrentBalance = totalCollectionsShareDec.minus(totalDistributionsPaid);

      // Total arrears across all buildings
      let totalArrearsDec = D(0);
      buildingProperties.forEach(prop => {
        const cap = computeDynamicBuildingCapital(prop, transactions, propertyCosts);
        const status = cap.partnerStatuses.find(s => s.partnerName === partnerName);
        if (status && status.hasArrears) {
          totalArrearsDec = totalArrearsDec.plus(status.arrearsEgp);
        }
      });

      // Last activity date
      const partnerTxs = transactions.filter(t => t.partner_name === partnerName);
      let lastActivityDate = profile?.joined_date;
      if (partnerTxs.length > 0) {
        const sortedDates = partnerTxs
          .map(t => t.date)
          .filter(Boolean)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        if (sortedDates.length > 0) {
          lastActivityDate = sortedDates[0];
        }
      }

      // Investment share summary label
      let investmentShareLabel = '—';
      if (holdings.length === 1) {
        investmentShareLabel = `${holdings[0].sharePct}%`;
      } else if (holdings.length > 1) {
        investmentShareLabel = holdings.map(h => `${h.sharePct}%`).join(' / ');
      }

      // ROI % calculation: Net profit / Contributed capital * 100
      const roiPercent = totalContributedCapital.greaterThan(0)
        ? Math.round(totalDistributionsPaid.times(100).div(totalContributedCapital).toNumber())
        : 0;

      summaries.push({
        partnerName,
        role: profile?.role || (isPermanent ? 'primary_developer' : 'equity_partner'),
        roleTitleAr: profile?.role === 'primary_developer' ? 'المطور الرئيسي / المالك' :
                    profile?.role === 'equity_partner' ? 'شريك ممول بالمشروع' :
                    profile?.role === 'land_partner' ? 'شريك مساهم بالأرض' :
                    profile?.role === 'silent_financier' ? 'ممول صامت' : 'شريك مساهم',
        phone: profile?.phone,
        national_id: profile?.national_id,
        bank_name: profile?.bank_name,
        iban: profile?.iban,
        instapay_handle: profile?.instapay_handle,
        preferred_payout_method: profile?.preferred_payout_method,
        isPermanent,
        joined_date: profile?.joined_date,
        holdings,
        totalContributedCapital: totalContributedCapital.toFixed(2),
        totalCollectionsShare: totalCollectionsShareDec.toFixed(2),
        totalWipCostShare: totalWipCostShareDec.toFixed(2),
        totalDistributionsPaid: totalDistributionsPaid.toFixed(2),
        netCurrentBalance: netCurrentBalance.toFixed(2),
        totalArrears: totalArrearsDec.toFixed(2),
        lastActivityDate,
        investmentShareLabel,
        roiPercent
      });
    });

    // Primary developer first
    return summaries.sort((a, b) => (b.isPermanent ? 1 : 0) - (a.isPermanent ? 1 : 0));
  }

  /**
   * Aggregates project-level partnership cards with 100% equity checks.
   */
  /**
   * Aggregates project-level partnership cards with 100% equity checks.
   * Scoped strictly to building properties (type === 'building').
   */
  static getProjectPartnershipCards(
    properties: Property[] = [],
    contracts: ERPContract[] = [],
    transactions: ERPPartnerTransaction[] = [],
    propertyCosts: ERPPropertyCostItem[] = []
  ): ProjectPartnershipCardData[] {
    const buildingProperties = properties.filter(p => p.type === 'building');
    return buildingProperties.map(prop => {
      const propContracts = contracts.filter(c => (c.property_id === prop.id || c.unit_id === prop.id) && c.status !== 'Rescinded');
      const totalContractSales = propContracts.reduce((sum, c) => sum.plus(c.gross_contract_value || 0), D(0));
      const totalCashCollected = propContracts.reduce((sum, c) => sum.plus(c.total_cash_collected || 0), D(0));
      const totalIncurredWip = recordedPropertyCost(prop, propertyCosts);
      const projectNetProfit = totalContractSales.minus(totalIncurredWip);

      const rawSplits = (prop.partner_splits as any[]) || [];
      const splits = rawSplits.filter(s => !s.is_archived);
      const othersSum = splits.reduce((sum, s) => {
        const name = (s.partnerName || s.partner_name || '').trim();
        if (name !== PRIMARY_DEVELOPER_NAME && !name.includes('زكريا فريد')) {
          return sum + (Number(s.sharePct ?? s.share_percentage ?? 0) || 0);
        }
        return sum;
      }, 0);

      const explicitFounderSplit = splits.find(s => {
        const name = (s.partnerName || s.partner_name || '').trim();
        return name === PRIMARY_DEVELOPER_NAME || name.includes('زكريا فريد');
      });

      const primaryShare = explicitFounderSplit
        ? (Number(explicitFounderSplit.sharePct ?? explicitFounderSplit.share_percentage ?? 0) || 0)
        : Math.max(0, 100 - othersSum);

      const partnersList: Array<{
        name: string;
        sharePct: number;
        wipCostShare: string;
        salesShare: string;
        collectionsShare: string;
        profitShare: string;
        paidPayouts: string;
        remainingDues: string;
      }> = [];

      // Helper to calculate partner sales and collection shares honoring contract-level splits
      const computePartnerShares = (name: string, sharePct: number) => {
        let salesShare = D(0);
        let colShare = D(0);
        propContracts.forEach(c => {
          if (c.partner_splits && c.partner_splits.length > 0) {
            const cSplit = c.partner_splits.find(
              s => (s.partner_name || (s as any).partnerName || '').trim() === name.trim()
            );
            if (cSplit) {
              let sAmt = D(cSplit.share_amount || 0);
              let cAmt = D(cSplit.cash_share || 0);
              if (sAmt.isZero() && cSplit.share_percentage && cSplit.share_percentage !== '0%') {
                const pct = cSplit.share_percentage.replace('%', '').trim();
                sAmt = D(c.gross_contract_value || 0).timesRatio(pct, 100);
                cAmt = D(c.total_cash_collected || 0).timesRatio(pct, 100);
              }
              salesShare = salesShare.plus(sAmt);
              colShare = colShare.plus(cAmt);
            }
          } else {
            salesShare = salesShare.plus(D(c.gross_contract_value || 0).timesRatio(sharePct, 100));
            colShare = colShare.plus(D(c.total_cash_collected || 0).timesRatio(sharePct, 100));
          }
        });
        return { salesShare, colShare };
      };

      // Primary developer
      const primPayouts = transactions
        .filter(t => (t.partner_name === PRIMARY_DEVELOPER_NAME || t.partner_name.includes('زكريا فريد')) && t.property_id === prop.id && t.type === 'PROFIT_DISTRIBUTION')
        .reduce((sum, t) => sum.plus(t.amount || 0), D(0));

      const { salesShare: primSales, colShare: primCollections } = computePartnerShares(PRIMARY_DEVELOPER_NAME, primaryShare);
      const primWipCost = totalIncurredWip.timesRatio(primaryShare, 100);
      const primProfit = primSales.minus(primWipCost);
      partnersList.push({
        name: PRIMARY_DEVELOPER_NAME,
        sharePct: primaryShare,
        wipCostShare: primWipCost.toFixed(2),
        salesShare: primSales.toFixed(2),
        collectionsShare: primCollections.toFixed(2),
        profitShare: primProfit.toFixed(2),
        paidPayouts: primPayouts.toFixed(2),
        remainingDues: primCollections.minus(primPayouts).toFixed(2)
      });

      // Other partners
      splits.forEach(s => {
        const name = (s.partnerName || s.partner_name || '').trim();
        if (name && name !== PRIMARY_DEVELOPER_NAME && !name.includes('زكريا فريد')) {
          const pct = Number(s.sharePct ?? s.share_percentage ?? 0) || 0;
          const payouts = transactions
            .filter(t => t.partner_name === name && t.property_id === prop.id && t.type === 'PROFIT_DISTRIBUTION')
            .reduce((sum, t) => sum.plus(t.amount || 0), D(0));

          const { salesShare: partnerSales, colShare } = computePartnerShares(name, pct);
          const wipCost = totalIncurredWip.timesRatio(pct, 100);
          const profit = partnerSales.minus(wipCost);
          partnersList.push({
            name,
            sharePct: pct,
            wipCostShare: wipCost.toFixed(2),
            salesShare: partnerSales.toFixed(2),
            collectionsShare: colShare.toFixed(2),
            profitShare: profit.toFixed(2),
            paidPayouts: payouts.toFixed(2),
            remainingDues: colShare.minus(payouts).toFixed(2)
          });
        }
      });

      return {
        propertyId: prop.id,
        propertyTitle: prop.title_ar || prop.title_en || 'مشروع عقاري',
        location: prop.location || '',
        totalUnitsCount: prop.total_units_count || prop.building_units?.length || 0,
        soldUnitsCount: propContracts.length,
        totalIncurredWip: totalIncurredWip.toFixed(2),
        totalContractSales: totalContractSales.toFixed(2),
        totalCashCollected: totalCashCollected.toFixed(2),
        projectNetProfit: projectNetProfit.toFixed(2),
        partners: partnersList
      };
    });
  }

  /**
   * Aliases for getProjectPartnershipCards matching spec nomenclature.
   */
  static calculateProjectPartnershipCards = PartnersEngine.getProjectPartnershipCards;
  static aggregateProjectPartnershipCards = PartnersEngine.getProjectPartnershipCards;

  /**
   * Static methods for dynamic capital matching and reallocation workflows.
   */
  static computeDynamicBuildingCapital = computeDynamicBuildingCapital;
  static executeFullInternalBuyout = executeFullInternalBuyout;
  static executePartialSale = executePartialSale;
  static executeFullSubstitution = executeFullSubstitution;
  static normalizePropertySplits = normalizePropertySplits;
  static checkBuildingEquityBalance = checkBuildingEquityBalance;

  /**
   * Creates a balanced double-entry journal entry for a partner profit payout / dividend (INV-4.1).
   * Debit: 303000 (Partner Profit Distributions & Withdrawals) = cash amount + debt offset
   * Credit: 301000 (Partner Capital) = debt offset, when the payout first settles unpaid capital commitments
   * Credit: 101000 (Cash Vault) or 102000 (InstaPay) = cash amount, when any cash is paid
   */
  static createPayoutJournalEntry(params: {
    partnerName: string;
    /** Cash paid out. */
    amount: string | number;
    /** Unpaid capital settled from the partner's share (non-cash). */
    debtOffsetAmount?: string | number;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000' | 'CASH' | 'INSTAPAY' | 'INSTAPAY_101000';
    propertyTitle?: string;
    receiptRef?: string;
    date?: string;
    currentPeriod: ERPAccountingPeriod | string;
    loggedBy?: string;
    routingAccount?: '101000' | '102000';
  }): ERPJournalEntry {
    const amt = D(params.amount).toFixed(2);
    const offset = D(params.debtOffsetAmount || 0);
    const creditAccount = params.routingAccount
      ? params.routingAccount
      : ((params.paymentMethod === 'CASH_101000' || params.paymentMethod === 'CASH') ? '101000' : '102000');
    const isInstaPay = String(params.paymentMethod).includes('INSTAPAY');
    const paymentLabel = creditAccount === '101000'
      ? 'الخزينة (101000)'
      : (isInstaPay ? 'إنستاباي (102000)' : 'حساب البنك التجاري (102000)');
    const ref = params.receiptRef || `PAY-${Date.now().toString().slice(-6)}`;
    const entryDate = params.date || new Date().toISOString().split('T')[0];
    const year = parseInt(entryDate.split('-')[0], 10) || new Date().getFullYear();

    const periodObj: ERPAccountingPeriod = typeof params.currentPeriod === 'object' && params.currentPeriod !== null
      ? params.currentPeriod
      : buildCalendarMonthPeriod(entryDate); // the entry date's own month, never a whole-year stand-in

    return GeneralLedgerEngine.validateAndCreateEntry({
      entry_number: `JE-${year}-DIST-${Math.floor(1000 + Math.random() * 9000)}`,
      entry_date: entryDate,
      period: periodObj,
      description: `صرف دفعة أرباح للشريك: ${params.partnerName}${params.propertyTitle ? ' من مشروع ' + params.propertyTitle : ''}${offset.gt(0) ? ' مع خصم مديونية ضخ رأس المال' : ''} [سند رقم: ${ref}]`,
      source_module: 'CAPITAL_CALL',
      created_by: params.loggedBy || 'SYSTEM_CHIEF_ACCOUNTANT',
      lines: [
        {
          account_code: '303000',
          debit_amount: D(amt).plus(offset).toFixed(2),
          credit_amount: '0.00',
          memo: `توزيعات أرباح ومسحوبات الشريك: ${params.partnerName}`
        },
        ...(offset.gt(0) ? [{
          account_code: '301000',
          debit_amount: '0.00',
          credit_amount: offset.toFixed(2),
          memo: `سداد مديونية ضخ رأس مال الشريك ${params.partnerName} خصماً من أرباحه`
        }] : []),
        ...(D(amt).gt(0) ? [{
          account_code: creditAccount,
          debit_amount: '0.00',
          credit_amount: amt,
          memo: `سداد أرباح من ${paymentLabel} - إشعار رقم #${ref}`
        }] : [])
      ]
    });
  }

  /**
   * Creates a balanced double-entry journal entry for a partner capital injection (INV-4.1).
   * Debit: 101000 (Operating Treasury Safe) or 102000 (Commercial Bank)
   * Credit: 301000 (Partner Capital)
   */
  static createCapitalInjectionJournalEntry(params: {
    partnerName: string;
    amount: string | number;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000' | 'CASH' | 'INSTAPAY' | 'INSTAPAY_101000';
    propertyTitle?: string;
    receiptRef?: string;
    date?: string;
    currentPeriod: ERPAccountingPeriod | string;
    loggedBy?: string;
    routingAccount?: '101000' | '102000';
  }): ERPJournalEntry {
    const amt = D(params.amount).toFixed(2);
    const debitAccount = params.routingAccount
      ? params.routingAccount
      : ((params.paymentMethod === 'CASH_101000' || params.paymentMethod === 'CASH') ? '101000' : '102000');
    const isInstaPay = String(params.paymentMethod).includes('INSTAPAY');
    const paymentLabel = debitAccount === '101000'
      ? 'الخزينة (101000)'
      : (isInstaPay ? 'إنستاباي (102000)' : 'حساب البنك التجاري (102000)');
    const ref = params.receiptRef || `REC-${Date.now().toString().slice(-6)}`;
    const entryDate = params.date || new Date().toISOString().split('T')[0];
    const year = parseInt(entryDate.split('-')[0], 10) || new Date().getFullYear();

    const periodObj: ERPAccountingPeriod = typeof params.currentPeriod === 'object' && params.currentPeriod !== null
      ? params.currentPeriod
      : buildCalendarMonthPeriod(entryDate); // the entry date's own month, never a whole-year stand-in

    return GeneralLedgerEngine.validateAndCreateEntry({
      entry_number: `JE-${year}-CAP-${Math.floor(1000 + Math.random() * 9000)}`,
      entry_date: entryDate,
      period: periodObj,
      description: `إيداع مساهمة رأس مال جديدة من الشريك: ${params.partnerName}${params.propertyTitle ? ' لمشروع ' + params.propertyTitle : ''} [إيصال رقم: ${ref}]`,
      source_module: 'CAPITAL_CALL',
      created_by: params.loggedBy || 'SYSTEM_CHIEF_ACCOUNTANT',
      lines: [
        {
          account_code: debitAccount,
          debit_amount: amt,
          credit_amount: '0.00',
          memo: `إيداع نقدي بحساب ${paymentLabel} لزيادة رأس مال الشريك: ${params.partnerName}`
        },
        {
          account_code: '301000',
          debit_amount: '0.00',
          credit_amount: amt,
          memo: `إثبات زيادة رأس مال وحصة الشريك: ${params.partnerName}`
        }
      ]
    });
  }
}

/** True when a recorded name belongs to the given partner (founder name variants collapse into PRIMARY_DEVELOPER_NAME). */
export function isSamePartner(recordedName: string | undefined, partnerName: string): boolean {
  const name = (recordedName || '').trim();
  if (partnerName === PRIMARY_DEVELOPER_NAME) return name.includes(PRIMARY_DEVELOPER_NAME);
  return name === partnerName.trim();
}

/** A partner's equity share % on one property. The founder gets whatever the other active partners leave from 100%. */
export function resolvePartnerSharePct(property: Property, partnerName: string): number {
  const splits = ((property.partner_splits as any[]) || []).filter(s => !s?.is_archived);
  const found = splits.find(s => isSamePartner(s.partnerName || s.partner_name, partnerName));
  if (found) return Number(found.sharePct ?? found.share_percentage ?? 0) || 0;
  if (partnerName !== PRIMARY_DEVELOPER_NAME) return 0;
  const othersPct = splits.reduce((sum, s) => {
    const name = s.partnerName || s.partner_name;
    return isSamePartner(name, PRIMARY_DEVELOPER_NAME) ? sum : sum + (Number(s.sharePct ?? s.share_percentage ?? 0) || 0);
  }, 0);
  return Math.max(0, 100 - othersPct);
}

/** The partner's share of cash collected on a property's live contracts, honouring contract-level splits. */
export function partnerCollectionsShareOnProperty(
  property: Property,
  partnerName: string,
  contracts: ERPContract[]
): Decimal {
  const sharePct = resolvePartnerSharePct(property, partnerName);
  return contracts
    .filter(c => (c.property_id === property.id || c.unit_id === property.id) && c.status !== 'Rescinded')
    .reduce((sum, c) => {
      if (c.partner_splits && c.partner_splits.length > 0) {
        const cSplit = c.partner_splits.find(s => isSamePartner(s.partner_name || (s as any).partnerName, partnerName));
        if (!cSplit) return sum;
        let cAmt = D(cSplit.cash_share || 0);
        if (D(cSplit.share_amount || 0).isZero() && cSplit.share_percentage && cSplit.share_percentage !== '0%') {
          cAmt = D(c.total_cash_collected || 0).timesRatio(cSplit.share_percentage.replace('%', '').trim(), 100);
        }
        return sum.plus(cAmt);
      }
      return sum.plus(D(c.total_cash_collected || 0).timesRatio(sharePct, 100));
    }, D(0));
}

export interface ProjectPayoutPosition {
  /** Partner's share of cash collected on the project. */
  collectionsShare: string;
  /** Profit already paid out to the partner from this project (cash and debt offsets). */
  paidOut: string;
  /** Unpaid registered capital commitments on this project. */
  commitmentDebt: string;
  /** collectionsShare − paidOut (may be negative after an overpayment). */
  grossAvailable: string;
  /** Debt that the next payout settles first, from the partner's share. */
  offsetNow: string;
  /** What can still be paid in cash after the offset. */
  cashAvailable: string;
  /** Debt left on the partner after the offset. */
  debtAfter: string;
  /** How offsetNow is spread over the commitments, oldest due date first. */
  offsetAllocations: Array<{ commitmentId: string; milestoneName: string; amount: string }>;
}

/**
 * Payout position of one partner on one project (user-confirmed 2026-10-06).
 * Available = collections share − payouts on this project − unpaid registered commitments on this project.
 * The debt is settled first from the share; if the share does not cover it, the rest stays as debt.
 */
export function computeProjectPayoutPosition(params: {
  partnerName: string;
  property: Property;
  contracts?: ERPContract[];
  transactions?: ERPPartnerTransaction[];
  commitments?: ERPPartnerCommitment[];
}): ProjectPayoutPosition {
  const { partnerName, property, contracts = [], transactions = [], commitments = [] } = params;

  const collectionsShare = partnerCollectionsShareOnProperty(property, partnerName, contracts);
  const paidOut = transactions
    .filter(t => isSamePartner(t.partner_name, partnerName) && t.property_id === property.id &&
      (t.type === 'PROFIT_DISTRIBUTION' || t.type === 'CAPITAL_RETURN'))
    .reduce((sum, t) => sum.plus(t.amount || 0), D(0));

  const openCommitments = commitments
    .filter(c => isSamePartner(c.partner_name, partnerName) && c.property_id === property.id &&
      c.status !== 'CANCELLED' && c.status !== 'PAID')
    .map(c => ({ c, unpaid: D(c.committed_amount || 0).minus(c.paid_amount || 0) }))
    .filter(x => x.unpaid.gt(0))
    .sort((a, b) => String(a.c.due_date || '').localeCompare(String(b.c.due_date || '')));
  const commitmentDebt = openCommitments.reduce((sum, x) => sum.plus(x.unpaid), D(0));

  const grossAvailable = collectionsShare.minus(paidOut);
  const positiveGross = grossAvailable.gt(0) ? grossAvailable : D(0);
  const offsetNow = positiveGross.lt(commitmentDebt) ? positiveGross : commitmentDebt;

  const offsetAllocations: ProjectPayoutPosition['offsetAllocations'] = [];
  let left = offsetNow;
  for (const { c, unpaid } of openCommitments) {
    if (!left.gt(0)) break;
    const take = left.lt(unpaid) ? left : unpaid;
    offsetAllocations.push({ commitmentId: c.commitment_id, milestoneName: c.milestone_name, amount: take.toFixed(2) });
    left = left.minus(take);
  }

  return {
    collectionsShare: collectionsShare.toFixed(2),
    paidOut: paidOut.toFixed(2),
    commitmentDebt: commitmentDebt.toFixed(2),
    grossAvailable: grossAvailable.toFixed(2),
    offsetNow: offsetNow.toFixed(2),
    cashAvailable: positiveGross.minus(offsetNow).toFixed(2),
    debtAfter: commitmentDebt.minus(offsetNow).toFixed(2),
    offsetAllocations
  };
}

export interface DistributionReadyProject {
  propertyId: string;
  propertyTitle: string;
  totalContractValue: string;
  totalCollected: string;
  partners: Array<{ partnerName: string; sharePct: number } & ProjectPayoutPosition>;
  /** Cash still to pay across the project's partners, after debt offsets. */
  totalCashToPay: string;
  /** Unpaid capital that the distribution settles. */
  totalOffset: string;
}

/**
 * Projects whose money can be distributed (user-confirmed 2026-10-06): the property is sold
 * (listing marked sold, or every building unit contracted) and the live contracts on it are fully collected.
 * Only partners with an undistributed share are listed; projects with nothing left to distribute are skipped.
 */
export function getDistributionReadyProjects(params: {
  properties: Property[];
  contracts: ERPContract[];
  transactions?: ERPPartnerTransaction[];
  commitments?: ERPPartnerCommitment[];
}): DistributionReadyProject[] {
  const { properties, contracts, transactions = [], commitments = [] } = params;
  const ready: DistributionReadyProject[] = [];

  properties.forEach(property => {
    const live = contracts.filter(c => (c.property_id === property.id || c.unit_id === property.id) && c.status !== 'Rescinded');
    if (live.length === 0) return;
    const gross = live.reduce((sum, c) => sum.plus(c.gross_contract_value || 0), D(0));
    const collected = live.reduce((sum, c) => sum.plus(c.total_cash_collected || 0), D(0));
    if (!gross.gt(0) || collected.lt(gross)) return;

    const units = property.building_units || [];
    const isSold = property.listing_status === 'sold' ||
      (units.length > 0 && units.every(u => u.status === 'contracted'));
    if (!isSold) return;

    const names = new Set<string>([PRIMARY_DEVELOPER_NAME]);
    ((property.partner_splits as any[]) || []).forEach(s => {
      const name = (s?.partner_name || s?.partnerName || '').trim();
      if (name && !s?.is_archived && !isSamePartner(name, PRIMARY_DEVELOPER_NAME)) names.add(name);
    });

    const partners: DistributionReadyProject['partners'] = [];
    names.forEach(partnerName => {
      const sharePct = resolvePartnerSharePct(property, partnerName);
      if (sharePct <= 0) return;
      const position = computeProjectPayoutPosition({ partnerName, property, contracts, transactions, commitments });
      if (!D(position.grossAvailable).gt(0)) return;
      partners.push({ partnerName, sharePct, ...position });
    });
    if (partners.length === 0) return;

    ready.push({
      propertyId: property.id,
      propertyTitle: property.title_ar || property.title_en || 'مشروع عقاري',
      totalContractValue: gross.toFixed(2),
      totalCollected: collected.toFixed(2),
      partners,
      totalCashToPay: partners.reduce((sum, p) => sum.plus(p.cashAvailable), D(0)).toFixed(2),
      totalOffset: partners.reduce((sum, p) => sum.plus(p.offsetNow), D(0)).toFixed(2)
    });
  });

  return ready;
}

export const calculateProjectPartnershipCards = PartnersEngine.getProjectPartnershipCards;
export const aggregateProjectPartnershipCards = PartnersEngine.getProjectPartnershipCards;
