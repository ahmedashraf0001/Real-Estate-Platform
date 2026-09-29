/**
 * Zakaria Farid Real Estate ERP — Canonical Metrics Module
 *
 * Single Canonical Source of Truth for core financial and operational metrics.
 * Eliminates metric divergence across dashboards, workflows, and reporting views.
 *
 * Unified Metrics:
 * 1. Available Cash & Liquidity: Real trial balance for accounts 101000 (Safe) + 102000 (Bank)
 * 2. Portfolio Valuation: Active listings only (listing_status === 'active'), excluding sold/archived
 * 3. Lifetime Portfolio Volume: Comprehensive lifetime inventory volume across all statuses
 * 4. Construction WIP: Capital deployed net-of-adjustments (credit notes and supplements accounted for)
 * 5. Raw Construction Costs: Unadjusted base cost total for audit trail inspection
 * 6. Handover COGS: Approved RSV-factor-based unit cost relief without arbitrary fallbacks
 */

import { D, Decimal } from './math';
import {
  ERPJournalEntry,
  ERPPropertyCostItem,
  ERPCostAllocation,
  ERPContract,
  ERPPartnerTransaction,
  ERPPartnerCall,
  ERPTaxRecord,
} from './types';
import { calculateCostItemEffectiveTotals } from './propertyCostEngine';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Canonical double-entry Chart of Accounts codes representing Construction Work-in-Progress */
export const CANONICAL_WIP_ACCOUNTS = new Set<string>([
  '105000', // Projects Under Construction (Consolidated WIP)
  '150000', // WIP - Land Acquisition & Permits
  '151000', // WIP - Direct Construction & Structure
  '152000', // WIP - MEP & Infrastructure
  '153000', // WIP - Finishing & Interiors
]);

// ============================================================================
// 1. CASH & LIQUIDITY METRICS
// ============================================================================

export interface AvailableCashResult {
  /** Total true liquid cash across operating safe and bank accounts */
  totalCash: Decimal;
  /** Operating cash in hand / Main Safe (Account 101000) */
  safeCash: Decimal;
  /** Operating bank accounts & electronic clearing / Instapay (Account 102000) */
  bankCash: Decimal;
  /** Total liquid cash formatted with 2 decimal places */
  totalFormatted: string;
  /** Safe cash formatted with 2 decimal places */
  safeFormatted: string;
  /** Bank cash formatted with 2 decimal places */
  bankFormatted: string;
}

export interface AvailableCashOptions {
  /** Optional predicate to filter journal entries (e.g. by project or date range) */
  filter?: (entry: ERPJournalEntry) => boolean;
}

/**
 * Computes available operating cash and liquidity from double-entry journal entries.
 *
 * **Includes:**
 * - Account `101000`: Operating Cash Vault (Main Safe / كاش باليد). Debits increase, credits decrease.
 * - Account `102000`: Operating Bank Accounts & Electronic Clearing (الحسابات البنكية وإنستاباي).
 *
 * **Excludes:**
 * - Account `102100`: Maintenance Escrow Bank Account (restricted client escrow trust funds).
 * - Account `103000` / `103200`: Billed and uncollected contract receivables.
 * - Account `104000`: Post-dated cheques in safe custody (unrealized liquidity).
 * - Account `203000`: Customer advance booking liabilities (not an asset).
 *
 * **Edge cases handled:**
 * - Returns 0.00 when entries array is null, undefined, or empty.
 * - Accurately reflects overdrafts / net credit outflows as negative Decimals (never clamped to zero).
 * - Entries with missing, null, or non-cash account lines are safely ignored.
 */
export function getAvailableCash(
  journalEntries?: ERPJournalEntry[] | null,
  options?: AvailableCashOptions
): AvailableCashResult {
  let safeCash = D(0);
  let bankCash = D(0);

  if (journalEntries && Array.isArray(journalEntries) && journalEntries.length > 0) {
    for (const entry of journalEntries) {
      if (!entry) continue;

      if (options?.filter && !options.filter(entry)) {
        continue;
      }

      const lines = entry.lines || [];
      for (const line of lines) {
        if (!line) continue;
        const code = line.account_code;
        if (code === '101000') {
          const deb = D(line.debit_amount || '0');
          const cr = D(line.credit_amount || '0');
          safeCash = safeCash.plus(deb.minus(cr));
        } else if (code === '102000') {
          const deb = D(line.debit_amount || '0');
          const cr = D(line.credit_amount || '0');
          bankCash = bankCash.plus(deb.minus(cr));
        }
      }
    }
  }

  const totalCash = safeCash.plus(bankCash);

  return {
    totalCash,
    safeCash,
    bankCash,
    totalFormatted: totalCash.toFixed(2),
    safeFormatted: safeCash.toFixed(2),
    bankFormatted: bankCash.toFixed(2),
  };
}

// ============================================================================
// 2. PORTFOLIO VALUATION METRICS
// ============================================================================

export interface PropertyLike {
  id?: string;
  price_egp?: number | string | null;
  price?: number | string | null;
  listing_status?: string | null;
  is_archived?: boolean | null;
  [key: string]: any;
}

export interface PortfolioValuationOptions {
  /** Optional additional filter for properties (e.g. by district or type) */
  filter?: (property: any) => boolean;
}

/**
 * Filters and returns canonical active manageable properties.
 *
 * **Includes:**
 * - Properties with `listing_status === 'active'` and `is_archived !== true`.
 *
 * **Excludes:**
 * - Properties with status `'sold'`, `'under_offer'`, `'archived'`, or `is_archived === true`.
 */
export function getActiveProperties<T extends PropertyLike = PropertyLike>(
  properties?: T[] | readonly T[] | any[] | null,
  options?: PortfolioValuationOptions
): T[] {
  if (!properties || !Array.isArray(properties) || properties.length === 0) {
    return [];
  }

  const result: T[] = [];
  for (const p of properties) {
    if (!p) continue;

    const isArchived = p.is_archived === true || p.listing_status === 'archived';
    const isActive = p.listing_status === 'active' && !isArchived;

    if (!isActive) continue;

    if (options?.filter && !options.filter(p)) {
      continue;
    }

    result.push(p);
  }

  return result;
}

/**
 * Computes canonical portfolio valuation for currently active, manageable inventory.
 *
 * **Includes:**
 * - Properties with `listing_status === 'active'` and `is_archived !== true`.
 * - Price evaluated from `price_egp` (or legacy `price`).
 *
 * **Excludes:**
 * - Properties with status `'sold'`, `'under_offer'`, `'archived'`, or `is_archived === true`.
 * - Sold/archived units represent historical deal volume or retired catalog items,
 *   NOT active manageable inventory available for allocation or sale.
 *
 * **Edge cases handled:**
 * - Null, undefined, or empty arrays return Decimal 0.
 * - Missing or non-numeric prices default to 0 without throwing.
 * - Negative prices are clamped to 0.
 */
export function getPortfolioValuation(
  properties?: PropertyLike[] | readonly PropertyLike[] | any[] | null,
  options?: PortfolioValuationOptions
): Decimal {
  if (!properties || !Array.isArray(properties) || properties.length === 0) {
    return D(0);
  }

  const active = getActiveProperties(properties, options);
  let total = D(0);

  for (const p of active) {
    const rawPrice = p.price_egp !== undefined && p.price_egp !== null ? p.price_egp : p.price;
    const numPrice = D(rawPrice || 0);
    if (numPrice.isPositive()) {
      total = total.plus(numPrice);
    }
  }

  return total;
}

/**
 * Computes the lifetime cumulative deal and catalog volume across ALL statuses.
 *
 * **Includes:**
 * - All properties regardless of `listing_status` (active, sold, under_offer, archived).
 *
 * **Distinct from `getPortfolioValuation()`:**
 * - Use this function ONLY when reporting all-time catalog throughput or historical
 *   aggregate property valuation. Never blend lifetime deal volume with active inventory!
 */
export function getLifetimePortfolioVolume(
  properties?: PropertyLike[] | readonly PropertyLike[] | any[] | null,
  options?: PortfolioValuationOptions
): Decimal {
  if (!properties || !Array.isArray(properties) || properties.length === 0) {
    return D(0);
  }

  let total = D(0);

  for (const p of properties) {
    if (!p) continue;

    if (options?.filter && !options.filter(p)) {
      continue;
    }

    const rawPrice = p.price_egp !== undefined && p.price_egp !== null ? p.price_egp : p.price;
    const numPrice = D(rawPrice || 0);
    if (numPrice.isPositive()) {
      total = total.plus(numPrice);
    }
  }

  return total;
}

// ============================================================================
// 3. CONSTRUCTION WORK-IN-PROGRESS (WIP) METRICS
// ============================================================================

export interface ConstructionWIPOptions {
  /** Optional filter for cost items or allocations (e.g. by project or date) */
  filter?: (item: any) => boolean;
}

export interface ConstructionWIPSources {
  /** Tier 1: Audited, committee-approved RSV milestone snapshots */
  costAllocations?: Array<ERPCostAllocation | any> | readonly ERPCostAllocation[] | null;
  /** Tier 2: Real-time itemized site expenditures net of credit notes and adjustments */
  propertyCosts?: Array<ERPPropertyCostItem | any> | readonly ERPPropertyCostItem[] | null;
  /** Tier 3: General Ledger trial balance double-entry movements on WIP accounts */
  journalEntries?: Array<ERPJournalEntry | any> | readonly ERPJournalEntry[] | null;
}

/**
 * Computes canonical Construction Work-in-Progress (WIP) net of adjustments.
 *
 * ### Tiered Data-Availability Fallback Architecture:
 * When computing WIP across ERP views (e.g. `AdminERPHub` and `GeneralLedgerView`),
 * callers evaluate sources in a tiered hierarchy:
 * ```ts
 * const wip = getConstructionWIP({
 *   costAllocations: dataset.costAllocations,
 *   propertyCosts: dataset.propertyCosts,
 *   journalEntries: journalEntries
 * });
 * ```
 *
 * ### Can these three data sources genuinely diverge?
 * **YES, they can and frequently do diverge by architectural design and timing:**
 * 1. **Managerial Milestone Snapshot vs. Real-Time Operational Costs (`costAllocations` vs. `propertyCosts`):**
 *    - `ERPCostAllocation` (`total_incurred_wip`) represents an **audited, committee-approved snapshot**
 *      established at a project review milestone to set the Relative Sales Value (RSV) factor.
 *      It remains static until the next formal allocation review.
 *    - `ERPPropertyCostItem` (`erp_property_costs`) tracks daily site-level invoices, contractor claims,
 *      materials, and adjustments in real-time. As work continues between milestone reviews,
 *      operational site expenditures will outpace the older static allocation snapshot.
 * 2. **Financial Accounting Adjustments vs. Site Invoices (`journalEntries` vs. `propertyCosts`):**
 *    - `ERPJournalEntry` records full General Ledger movements on WIP accounts (`105000`, `150000`–`153000`).
 *    - Journal WIP includes non-invoice accounting transactions such as **post-delivery rescissions**
 *      (which debit WIP and credit COGS to restore repossessed unit cost basis to the balance sheet),
 *      inter-project WIP transfers, year-end accruals, or interest capitalizations that do NOT exist
 *      as physical supplier invoices in `erp_property_costs`.
 * 3. **Audit & Review Workflow:**
 *    - Site items in `erp_property_costs` may be in `pending_audit` status before being posted as
 *      journal vouchers, or petty cash expenses may be posted to the GL before being broken down
 *      into itemized bills of quantities.
 *
 * **Conclusion:** The fallback is an intentional **data-availability hierarchy across operational layers**
 * (Approved Management Budget → Site Operational Invoices → General Ledger Trial Balance), NOT an assumption
 * of mathematical identity. Screens calling this function with different sources will reflect the metric
 * appropriate to that operational layer.
 *
 * **Includes:**
 * - Actual net capital deployed in project construction.
 * - For `ERPPropertyCostItem[]`: Each item's base cost PLUS supplemental underpayment
 *   adjustments (`SUPPLEMENT_UNDERPAYMENT`) MINUS contractor credit notes / refunds
 *   (`REFUND_OVERPAYMENT`).
 * - For `ERPCostAllocation[]`: Sum of approved `total_incurred_wip`.
 * - For `ERPJournalEntry[]`: Net double-entry WIP debit balance across canonical WIP accounts
 *   (`105000`, `150000`, `151000`, `152000`, `153000`), computing Debits minus Credits.
 *
 * **Excludes:**
 * - Refunded overpayments and supplier credit notes (these are no longer tied up in WIP).
 * - Administrative notes (`ADMIN_NOTE`), which document audits without adjusting balance.
 * - Non-WIP accounts (Operating Cash, Escrow, Customer Advances, Equity).
 *
 * **Edge cases handled:**
 * - An item whose refunds exceed base cost is clamped to a net effective cost of 0.00.
 * - Null/empty inputs return Decimal 0.
 * - Missing adjustment arrays fall back safely to base cost.
 * - Numeric and string `total_incurred_wip` handled seamlessly.
 */
export function getConstructionWIP(
  itemsOrSources?: Array<ERPPropertyCostItem | ERPCostAllocation | ERPJournalEntry | any> | ConstructionWIPSources | null,
  options?: ConstructionWIPOptions
): Decimal {
  if (!itemsOrSources) {
    return D(0);
  }

  // Multi-source tiered fallback resolution:
  // Tier 1: Cost Allocations -> Tier 2: Property Costs -> Tier 3: Journal Entries
  if (!Array.isArray(itemsOrSources)) {
    const { costAllocations, propertyCosts, journalEntries } = itemsOrSources;
    if (costAllocations && costAllocations.length > 0) {
      return getConstructionWIP(costAllocations as any[], options);
    }
    if (propertyCosts && propertyCosts.length > 0) {
      return getConstructionWIP(propertyCosts as any[], options);
    }
    if (journalEntries && journalEntries.length > 0) {
      return getConstructionWIP(journalEntries as any[], options);
    }
    return D(0);
  }

  const items = itemsOrSources;
  if (items.length === 0) {
    return D(0);
  }

  let totalNetWIP = D(0);

  for (const item of items) {
    if (!item) continue;

    if (options?.filter && !options.filter(item)) {
      continue;
    }

    // Case 1: ERPJournalEntry (double-entry ledger movements)
    if ('lines' in item && Array.isArray(item.lines)) {
      for (const line of item.lines) {
        if (!line) continue;
        if (CANONICAL_WIP_ACCOUNTS.has(line.account_code)) {
          const deb = D(line.debit_amount || '0');
          const cr = D(line.credit_amount || '0');
          totalNetWIP = totalNetWIP.plus(deb.minus(cr));
        }
      }
      continue;
    }

    // Case 2: ERPCostAllocation record (approved project allocations)
    if ('total_incurred_wip' in item && item.total_incurred_wip !== undefined && item.total_incurred_wip !== null) {
      totalNetWIP = totalNetWIP.plus(D(item.total_incurred_wip || '0'));
      continue;
    }

    // Case 3: ERPPropertyCostItem (itemized site expenses with adjustments)
    if ('adjustments' in item || 'category' in item || 'total_cost_egp' in item || 'total_amount' in item) {
      const totals = calculateCostItemEffectiveTotals(item as ERPPropertyCostItem);
      totalNetWIP = totalNetWIP.plus(D(totals.netEffectiveCost));
      continue;
    }

    // Case 4: Generic direct amount field fallback
    const directAmt = D(item.amount || item.cost || 0);
    if (directAmt.isPositive()) {
      totalNetWIP = totalNetWIP.plus(directAmt);
    }
  }

  return totalNetWIP;
}

/**
 * Computes raw unadjusted construction expenditure before credit notes or adjustments.
 *
 * **Use Case:**
 * - Audit-trail inspection and gross contractor billing comparisons ONLY.
 * - Never use this as the current active project WIP balance.
 */
export function getRawConstructionCosts(
  items?: ERPPropertyCostItem[] | null,
  options?: ConstructionWIPOptions
): Decimal {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return D(0);
  }

  let totalRaw = D(0);

  for (const item of items) {
    if (!item) continue;

    if (options?.filter && !options.filter(item)) {
      continue;
    }

    const baseCost = D(item.total_cost_egp || item.total_amount || 0);
    if (baseCost.isPositive()) {
      totalRaw = totalRaw.plus(baseCost);
    }
  }

  return totalRaw;
}

// ============================================================================
// 4. HANDOVER COGS METRICS
// ============================================================================

export interface HandoverCOGSResult {
  /** The calculated COGS amount if an approved factor exists, or Decimal 0 */
  cogsAmount: Decimal;
  /** Whether an approved RSV factor was successfully found and applied */
  isAllocated: boolean;
  /** The RSV factor applied (0 if unallocated) */
  rsvFactor: Decimal;
  /** Formatted string with 2 decimal places e.g. "2100000.00", or "" if unallocated */
  cogsFormatted: string;
}

export interface HandoverCOGSParams {
  /** Contract gross value */
  contractValue: string | number | Decimal;
  /** List of approved project cost allocations */
  costAllocations?: ERPCostAllocation[] | null;
  /** Linked property for project matching */
  property?: { title_ar?: string; title_en?: string; id?: string; location?: string } | null;
  /** Explicit project name to match against allocations */
  projectName?: string;
  /** Direct RSV factor override if already resolved */
  rsvFactor?: string | number | Decimal | null;
}

/**
 * Computes unit Cost of Goods Sold (COGS) to relieve from WIP upon physical handover.
 *
 * **Formula:**
 * `Unit COGS = Unit Contract Value * Approved Project RSV Factor`
 *
 * **Policy:**
 * - The arbitrary 45% default fallback is strictly prohibited.
 * - When no approved RSV factor exists for the project, returns `isAllocated: false`
 *   and `cogsFormatted: ""` so the calling UI requires explicit CFO allocation approval
 *   or manual cost input.
 *
 * **Edge cases handled:**
 * - Zero or negative contract values return zero COGS.
 * - Non-positive or missing RSV factors return `isAllocated: false`.
 * - Robust title matching supports Arabic and English project names.
 */
export function getHandoverCOGS(
  paramsOrContractValue: HandoverCOGSParams | string | number | Decimal,
  rsvFactorParam?: string | number | Decimal | null
): HandoverCOGSResult {
  let contractValue: Decimal;
  let resolvedFactor: Decimal = D(0);
  let isAllocated = false;

  if (
    typeof paramsOrContractValue === 'object' &&
    !(paramsOrContractValue instanceof Decimal) &&
    'contractValue' in paramsOrContractValue
  ) {
    // Parameter object invocation
    const p = paramsOrContractValue as HandoverCOGSParams;
    contractValue = D(p.contractValue || 0);

    if (p.rsvFactor !== undefined && p.rsvFactor !== null && p.rsvFactor !== '') {
      const f = D(p.rsvFactor);
      if (f.gt(0)) {
        resolvedFactor = f;
        isAllocated = true;
      }
    } else if (p.costAllocations && Array.isArray(p.costAllocations) && p.costAllocations.length > 0) {
      const prop = p.property;
      const targetProjName = (p.projectName || '').toLowerCase();

      const matchingAlloc = p.costAllocations.find((ca) => {
        if (!ca || !ca.rsv_factor) return false;

        // Match by explicit project name
        if (targetProjName && ca.project_name && ca.project_name.toLowerCase() === targetProjName) {
          return true;
        }

        // Match by property titles
        if (prop && ca.project_name) {
          const caName = ca.project_name.toLowerCase();
          const arTitle = (prop.title_ar || '').toLowerCase();
          const enTitle = (prop.title_en || '').toLowerCase();
          if (arTitle.includes(caName) || enTitle.includes(caName) || caName.includes(arTitle) || caName.includes(enTitle)) {
            return true;
          }
        }

        // Match by property ID if present on allocation
        if (prop && (ca as any).property_id && (ca as any).property_id === prop.id) {
          return true;
        }

        return false;
      });

      if (matchingAlloc && matchingAlloc.rsv_factor && parseFloat(matchingAlloc.rsv_factor) > 0) {
        resolvedFactor = D(matchingAlloc.rsv_factor);
        isAllocated = true;
      }
    }
  } else {
    // Positional invocation (contractValue, rsvFactor)
    contractValue = D(paramsOrContractValue || 0);
    if (rsvFactorParam !== undefined && rsvFactorParam !== null && rsvFactorParam !== '') {
      const f = D(rsvFactorParam);
      if (f.gt(0)) {
        resolvedFactor = f;
        isAllocated = true;
      }
    }
  }

  if (!isAllocated || contractValue.isZero() || contractValue.isNegative()) {
    return {
      cogsAmount: D(0),
      isAllocated: false,
      rsvFactor: resolvedFactor,
      cogsFormatted: '',
    };
  }

  const cogsAmount = contractValue.times(resolvedFactor);

  return {
    cogsAmount,
    isAllocated: true,
    rsvFactor: resolvedFactor,
    cogsFormatted: cogsAmount.toFixed(2),
  };
}

// ============================================================================
// 5. CLIENT OPERATING CASH & BALANCE SHEET METRICS
// ============================================================================

export interface AccountsReceivableResult {
  /** Outstanding contract receivables (A/R) */
  totalAR: Decimal;
  /** Formatted A/R string */
  totalARFormatted: string;
  /** Number of active contracts with outstanding balances */
  activeContractsCount: number;
}

export interface AccountsReceivableOptions {
  filter?: (contract: ERPContract) => boolean;
}

/**
 * Computes canonical Accounts Receivable (A/R) from customer contracts.
 * Formula: Sum of (gross_contract_value - total_cash_collected) for active, non-rescinded contracts.
 */
export function getAccountsReceivable(
  contracts?: ERPContract[] | null,
  options?: AccountsReceivableOptions
): AccountsReceivableResult {
  let totalAR = D(0);
  let activeContractsCount = 0;

  if (contracts && Array.isArray(contracts) && contracts.length > 0) {
    for (const c of contracts) {
      if (!c || c.status === 'Rescinded') continue;
      if (options?.filter && !options.filter(c)) continue;

      const gross = D(c.gross_contract_value || 0);
      const collected = D(c.total_cash_collected || 0);
      const diff = gross.minus(collected);
      if (diff.isPositive()) {
        totalAR = totalAR.plus(diff);
      }
      activeContractsCount++;
    }
  }

  return {
    totalAR,
    totalARFormatted: totalAR.toFixed(2),
    activeContractsCount,
  };
}

export interface PartnerFinancingSources {
  partnerCalls?: ERPPartnerCall[] | null;
  partnerTransactions?: ERPPartnerTransaction[] | null;
  journalEntries?: ERPJournalEntry[] | null;
}

export interface PartnerFinancingResult {
  /** Contributed partner capital / equity injections (Account 301000) */
  totalFinancing: Decimal;
  /** Formatted partner financing string */
  totalFinancingFormatted: string;
}

/**
 * Computes canonical Partner Financing / Contributed Capital.
 * Evaluates sources:
 * - Partner Capital Injections from partnerTransactions (type === 'CAPITAL_INJECTION')
 * - Partner Calls with status === 'Funded' or paid_amount
 * - Double-entry movements on Account 301000 (Credits minus Debits)
 */
export function getPartnerFinancing(
  sources?: PartnerFinancingSources | ERPPartnerTransaction[] | ERPPartnerCall[] | null
): PartnerFinancingResult {
  let totalFinancing = D(0);

  if (!sources) {
    return { totalFinancing: D(0), totalFinancingFormatted: '0.00' };
  }

  if (Array.isArray(sources)) {
    for (const item of sources) {
      if (!item) continue;
      // ERPPartnerTransaction
      if ('type' in item && item.type === 'CAPITAL_INJECTION') {
        totalFinancing = totalFinancing.plus(D(item.amount || 0));
      } else if ('call_amount' in item) {
        // ERPPartnerCall
        const paid = D(item.paid_amount || (item.status === 'Funded' ? item.call_amount : 0));
        totalFinancing = totalFinancing.plus(paid);
      }
    }
    return {
      totalFinancing,
      totalFinancingFormatted: totalFinancing.toFixed(2),
    };
  }

  // Object with multiple source arrays
  const { partnerTransactions, partnerCalls, journalEntries } = sources;

  if (partnerTransactions && partnerTransactions.length > 0) {
    for (const tx of partnerTransactions) {
      if (tx && tx.type === 'CAPITAL_INJECTION') {
        totalFinancing = totalFinancing.plus(D(tx.amount || 0));
      }
    }
  } else if (partnerCalls && partnerCalls.length > 0) {
    for (const call of partnerCalls) {
      if (call) {
        const paid = D(call.paid_amount || (call.status === 'Funded' ? call.call_amount : 0));
        totalFinancing = totalFinancing.plus(paid);
      }
    }
  } else if (journalEntries && journalEntries.length > 0) {
    for (const entry of journalEntries) {
      if (!entry || !entry.lines) continue;
      for (const line of entry.lines) {
        if (line.account_code === '301000') {
          const deb = D(line.debit_amount || 0);
          const cr = D(line.credit_amount || 0);
          totalFinancing = totalFinancing.plus(cr.minus(deb));
        }
      }
    }
  }

  return {
    totalFinancing,
    totalFinancingFormatted: totalFinancing.toFixed(2),
  };
}

export interface PartnerDrawingsSources {
  partnerTransactions?: ERPPartnerTransaction[] | null;
  journalEntries?: ERPJournalEntry[] | null;
}

export interface PartnerDrawingsResult {
  /** Partner profit drawings and distributions paid (Account 303000) */
  totalDrawings: Decimal;
  /** Formatted drawings string */
  totalDrawingsFormatted: string;
}

/**
 * Computes canonical Partner Drawings / Profit Distributions Paid.
 * Evaluates sources:
 * - Partner Transactions with type === 'PROFIT_DISTRIBUTION'
 * - Double-entry movements on Account 303000 (Debits minus Credits)
 */
export function getPartnerDrawings(
  sources?: PartnerDrawingsSources | ERPPartnerTransaction[] | null
): PartnerDrawingsResult {
  let totalDrawings = D(0);

  if (!sources) {
    return { totalDrawings: D(0), totalDrawingsFormatted: '0.00' };
  }

  if (Array.isArray(sources)) {
    for (const tx of sources) {
      if (tx && tx.type === 'PROFIT_DISTRIBUTION') {
        totalDrawings = totalDrawings.plus(D(tx.amount || 0));
      }
    }
    return {
      totalDrawings,
      totalDrawingsFormatted: totalDrawings.toFixed(2),
    };
  }

  const { partnerTransactions, journalEntries } = sources;

  if (partnerTransactions && partnerTransactions.length > 0) {
    for (const tx of partnerTransactions) {
      if (tx && tx.type === 'PROFIT_DISTRIBUTION') {
        totalDrawings = totalDrawings.plus(D(tx.amount || 0));
      }
    }
  } else if (journalEntries && journalEntries.length > 0) {
    for (const entry of journalEntries) {
      if (!entry || !entry.lines) continue;
      for (const line of entry.lines) {
        if (line.account_code === '303000') {
          const deb = D(line.debit_amount || 0);
          const cr = D(line.credit_amount || 0);
          totalDrawings = totalDrawings.plus(deb.minus(cr));
        }
      }
    }
  }

  return {
    totalDrawings,
    totalDrawingsFormatted: totalDrawings.toFixed(2),
  };
}

export interface PayablesAndLoansSources {
  propertyCosts?: ERPPropertyCostItem[] | null;
  taxRecords?: ERPTaxRecord[] | null;
  journalEntries?: ERPJournalEntry[] | null;
}

export interface PayablesAndLoansResult {
  /** Total outstanding liabilities, payables, and debt obligations */
  totalPayables: Decimal;
  /** Unpaid contractor and supplier payables (Account 201000) */
  contractorPayables: Decimal;
  /** Pending tax and governmental liabilities */
  taxLiabilities: Decimal;
  /** Formatted total string */
  totalPayablesFormatted: string;
}

/**
 * Computes canonical Payables & Loans (A/P + Taxes + Notes Payable).
 */
export function getPayablesAndLoans(
  sources?: PayablesAndLoansSources | ERPPropertyCostItem[] | null
): PayablesAndLoansResult {
  let contractorPayables = D(0);
  let taxLiabilities = D(0);

  if (!sources) {
    return {
      totalPayables: D(0),
      contractorPayables: D(0),
      taxLiabilities: D(0),
      totalPayablesFormatted: '0.00',
    };
  }

  if (Array.isArray(sources)) {
    // Array of ERPPropertyCostItem
    for (const item of sources) {
      if (!item) continue;
      if (item.payable_installments && item.payable_installments.length > 0) {
        for (const inst of item.payable_installments) {
          if (inst.status !== 'PAID') {
            const amt = D(inst.amount_egp || 0);
            const paid = D(inst.paid_amount_egp || 0);
            const rem = amt.minus(paid);
            if (rem.isPositive()) {
              contractorPayables = contractorPayables.plus(rem);
            }
          }
        }
      } else if (item.linked_account_code === '201000') {
        const { netEffectiveCost } = calculateCostItemEffectiveTotals(item);
        const netDec = D(netEffectiveCost);
        const rem = netDec.minus(D(item.paid_amount_egp || 0));
        contractorPayables = contractorPayables.plus(rem.isPositive() ? rem : netDec);
      }
    }

    const totalPayables = contractorPayables.plus(taxLiabilities);
    return {
      totalPayables,
      contractorPayables,
      taxLiabilities,
      totalPayablesFormatted: totalPayables.toFixed(2),
    };
  }

  const { propertyCosts, taxRecords, journalEntries } = sources;

  if (propertyCosts && propertyCosts.length > 0) {
    for (const item of propertyCosts) {
      if (!item) continue;
      if (item.payable_installments && item.payable_installments.length > 0) {
        for (const inst of item.payable_installments) {
          if (inst.status !== 'PAID') {
            const amt = D(inst.amount_egp || 0);
            const paid = D(inst.paid_amount_egp || 0);
            const rem = amt.minus(paid);
            if (rem.isPositive()) {
              contractorPayables = contractorPayables.plus(rem);
            }
          }
        }
      } else if (item.linked_account_code === '201000') {
        const { netEffectiveCost } = calculateCostItemEffectiveTotals(item);
        const netDec = D(netEffectiveCost);
        const rem = netDec.minus(D(item.paid_amount_egp || 0));
        contractorPayables = contractorPayables.plus(rem.isPositive() ? rem : netDec);
      }
    }
  }

  if (taxRecords && taxRecords.length > 0) {
    for (const t of taxRecords) {
      if (t && t.remittance_status === 'Pending') {
        taxLiabilities = taxLiabilities.plus(D(t.tax_amount || 0));
      }
    }
  }

  if (contractorPayables.isZero() && taxLiabilities.isZero() && journalEntries && journalEntries.length > 0) {
    for (const entry of journalEntries) {
      if (!entry || !entry.lines) continue;
      for (const line of entry.lines) {
        const code = line.account_code;
        if (code === '201000' || code === '202000' || code === '204000') {
          const deb = D(line.debit_amount || 0);
          const cr = D(line.credit_amount || 0);
          contractorPayables = contractorPayables.plus(cr.minus(deb));
        }
      }
    }
  }

  const totalPayables = contractorPayables.plus(taxLiabilities);

  return {
    totalPayables,
    contractorPayables,
    taxLiabilities,
    totalPayablesFormatted: totalPayables.toFixed(2),
  };
}

export interface OperatingAssetsParams {
  cash: Decimal | number | string;
  accountsReceivable: Decimal | number | string;
  constructionWIP: Decimal | number | string;
}

export interface OperatingAssetsDataset {
  journalEntries?: ERPJournalEntry[] | null;
  contracts?: ERPContract[] | null;
  propertyCosts?: ERPPropertyCostItem[] | null;
  costAllocations?: ERPCostAllocation[] | null;
}

export interface OperatingAssetsResult {
  /** Grand Total Operating Assets: Cash + A/R + WIP */
  totalOperatingAssets: Decimal;
  /** Formatted Total Operating Assets */
  totalOperatingAssetsFormatted: string;
  /** Component breakdowns */
  breakdown: {
    cash: Decimal;
    cashFormatted: string;
    accountsReceivable: Decimal;
    accountsReceivableFormatted: string;
    constructionWIP: Decimal;
    constructionWIPFormatted: string;
  };
}

/**
 * Computes canonical Operating Assets according to the client formula:
 * `Operating Assets = Cash + A/R + WIP`
 *
 * Can be invoked either with direct metric values:
 * `getOperatingAssets({ cash, accountsReceivable, constructionWIP })`
 *
 * Or directly with live ERP datasets:
 * `getOperatingAssets({ journalEntries, contracts, propertyCosts, costAllocations })`
 */
export function getOperatingAssets(
  paramsOrDataset: OperatingAssetsParams | OperatingAssetsDataset
): OperatingAssetsResult {
  let cashDec: Decimal;
  let arDec: Decimal;
  let wipDec: Decimal;

  if ('cash' in paramsOrDataset) {
    cashDec = D(paramsOrDataset.cash || 0);
    arDec = D(paramsOrDataset.accountsReceivable || 0);
    wipDec = D(paramsOrDataset.constructionWIP || 0);
  } else {
    const cashRes = getAvailableCash(paramsOrDataset.journalEntries);
    const arRes = getAccountsReceivable(paramsOrDataset.contracts);
    const wip = getConstructionWIP({
      costAllocations: paramsOrDataset.costAllocations,
      propertyCosts: paramsOrDataset.propertyCosts,
      journalEntries: paramsOrDataset.journalEntries,
    });
    cashDec = cashRes.totalCash;
    arDec = arRes.totalAR;
    wipDec = wip;
  }

  const totalOperatingAssets = cashDec.plus(arDec).plus(wipDec);

  return {
    totalOperatingAssets,
    totalOperatingAssetsFormatted: totalOperatingAssets.toFixed(2),
    breakdown: {
      cash: cashDec,
      cashFormatted: cashDec.toFixed(2),
      accountsReceivable: arDec,
      accountsReceivableFormatted: arDec.toFixed(2),
      constructionWIP: wipDec,
      constructionWIPFormatted: wipDec.toFixed(2),
    },
  };
}

export interface OperatingCashMetricsDataset {
  journalEntries?: ERPJournalEntry[] | null;
  contracts?: ERPContract[] | null;
  propertyCosts?: ERPPropertyCostItem[] | null;
  costAllocations?: ERPCostAllocation[] | null;
  partnerCalls?: ERPPartnerCall[] | null;
  partnerTransactions?: ERPPartnerTransaction[] | null;
  taxRecords?: ERPTaxRecord[] | null;
}

export interface OperatingCashMetricsResult {
  netCash: AvailableCashResult;
  partnerFinancing: PartnerFinancingResult;
  partnerDrawings: PartnerDrawingsResult;
  accountsReceivable: AccountsReceivableResult;
  constructionWIP: Decimal;
  constructionWIPFormatted: string;
  payablesAndLoans: PayablesAndLoansResult;
  operatingAssets: OperatingAssetsResult;
}

/**
 * Unified getter for the client's complete suite of operating cash and balance sheet metrics.
 */
export function getOperatingCashMetrics(
  dataset: OperatingCashMetricsDataset
): OperatingCashMetricsResult {
  const netCash = getAvailableCash(dataset.journalEntries);
  const partnerFinancing = getPartnerFinancing({
    partnerTransactions: dataset.partnerTransactions,
    partnerCalls: dataset.partnerCalls,
    journalEntries: dataset.journalEntries,
  });
  const partnerDrawings = getPartnerDrawings({
    partnerTransactions: dataset.partnerTransactions,
    journalEntries: dataset.journalEntries,
  });
  const accountsReceivable = getAccountsReceivable(dataset.contracts);
  const constructionWIP = getConstructionWIP({
    costAllocations: dataset.costAllocations,
    propertyCosts: dataset.propertyCosts,
    journalEntries: dataset.journalEntries,
  });
  const payablesAndLoans = getPayablesAndLoans({
    propertyCosts: dataset.propertyCosts,
    taxRecords: dataset.taxRecords,
    journalEntries: dataset.journalEntries,
  });
  const operatingAssets = getOperatingAssets({
    cash: netCash.totalCash,
    accountsReceivable: accountsReceivable.totalAR,
    constructionWIP,
  });

  return {
    netCash,
    partnerFinancing,
    partnerDrawings,
    accountsReceivable,
    constructionWIP,
    constructionWIPFormatted: constructionWIP.toFixed(2),
    payablesAndLoans,
    operatingAssets,
  };
}

// ============================================================================
// CANONICAL METRICS COMPOSITE EXPORT
// ============================================================================

export const CanonicalMetrics = {
  getAvailableCash,
  getActiveProperties,
  getPortfolioValuation,
  getLifetimePortfolioVolume,
  getConstructionWIP,
  getRawConstructionCosts,
  getHandoverCOGS,
  getAccountsReceivable,
  getPartnerFinancing,
  getPartnerDrawings,
  getPayablesAndLoans,
  getOperatingAssets,
  getOperatingCashMetrics,
  CANONICAL_WIP_ACCOUNTS,
};

/** Construction telemetry is a dated distribution of recorded costs, not a forecast. */
export function getConstructionPayablesTelemetry(costs: ERPPropertyCostItem[], asOfDate: string) {
  const buckets = new Map<string, { cost: Decimal; paid: Decimal; outstanding: Decimal }>();
  const aging = [D(0), D(0), D(0), D(0)]; // not due, 1–30, 31–60, 61+ days
  for (const item of costs) {
    const totals = getConstructionSettlementOpeningBalance(item);
    const month = item.logged_date?.slice(0, 7);
    if (month) {
      const bucket = buckets.get(month) || { cost: D(0), paid: D(0), outstanding: D(0) };
      bucket.cost = bucket.cost.plus(totals.netEffectiveCost);
      bucket.paid = bucket.paid.plus(totals.paidAmount);
      bucket.outstanding = bucket.outstanding.plus(totals.remainingAmount);
      buckets.set(month, bucket);
    }
    // Cap scheduled exposure at the actual effective liability, including refunds.
    let remaining = D(totals.remainingAmount);
    const dues = item.payable_installments?.length
      ? [...item.payable_installments].sort((a, b) => a.due_date.localeCompare(b.due_date))
        .map(inst => ({ date: inst.due_date, amount: Decimal.max(D(inst.amount_egp).minus(inst.paid_amount_egp || 0), 0) }))
      : [{ date: item.due_date || '', amount: remaining }];
    for (const due of dues) {
      const amount = Decimal.min(due.amount, remaining);
      if (!amount.gt(0)) continue;
      const days = due.date ? Math.floor((Date.parse(asOfDate) - Date.parse(due.date)) / 86400000) : 0;
      const index = days <= 0 || !Number.isFinite(days) ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : 3;
      aging[index] = aging[index].plus(amount);
      remaining = remaining.minus(amount);
    }
    // Unscheduled portions are current, rather than fabricated overdue tranches.
    aging[0] = aging[0].plus(Decimal.max(remaining, 0));
  }
  const observations = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, values]) => values);
  const series = (key: 'cost' | 'paid' | 'outstanding') => observations.length
    ? (observations.length === 1 ? [observations[0][key].toNumber(), observations[0][key].toNumber()] : observations.map(value => value[key].toNumber()))
    : [0, 0];
  return {
    totalCost: getConstructionWIP(costs),
    paid: costs.reduce((sum, item) => sum.plus(getConstructionSettlementOpeningBalance(item).paidAmount), D(0)),
    outstanding: costs.reduce((sum, item) => sum.plus(getConstructionSettlementOpeningBalance(item).remainingAmount), D(0)),
    // The existing source has no construction retention balance. Never infer a percentage.
    retentions: D(0),
    costSeries: series('cost'), paidSeries: series('paid'), outstandingSeries: series('outstanding'), retentionSeries: [0, 0],
    aging: aging.map(amount => amount.toNumber())
  };
}

/** Treasury-paid one-off costs belong to site expenses, even when a supplier is named. */
export function getConstructionCostSection(item: ERPPropertyCostItem): 'contractors' | 'site' {
  if (item.notes?.includes('[FIN_OS_SECTION:site]')) return 'site';
  if (item.notes?.includes('[FIN_OS_SECTION:contractors]')) return 'contractors';
  if (item.payment_term === 'FULL_DEFERRED' || item.payment_term === 'DOWN_PAYMENT_INSTALLMENTS' || item.linked_account_code === '201000' || item.category === 'labor_subcontractor') return 'contractors';
  return 'site';
}

/** Preserve historical paid opening balances not represented by a later schedule. */
export function getConstructionSettlementOpeningBalance(item: ERPPropertyCostItem) {
  const totals = calculateCostItemEffectiveTotals(item);
  const paid = D(totals.paidAmount).max(item.paid_amount_egp || 0);
  return { ...totals, paidAmount: paid.toFixed(2), remainingAmount: D(totals.netEffectiveCost).minus(paid).max(0).toFixed(2) };
}
