/**
 * Zakaria Farid Real Estate ERP — Relative Sales Value (RSV) & WIP Allocation Engine
 * Enforces Spec §14.C.7 (WIP Cost Relief at Handover) and IFRS 15 Revenue & Cost Recognition.
 */

import { D, Decimal, generateUUID, ratio } from './math';
import { ERPCostAllocation, ERPContract } from './types';
import { Property } from '../supabase/types';

export type { ERPCostAllocation };

export interface ProjectUnitAllocationItem {
  unit_id: string;
  unit_title: string;
  buyer_name?: string;
  unit_sales_value: string;
  allocated_cost: string;
  gross_margin: string;
  gross_margin_pct: string;
  handover_status: 'Delivered' | 'Pending';
  handover_date?: string;
}

export interface COGSJournalLine {
  account_code: string;
  account_name_ar: string;
  account_name_en: string;
  debit_amount: string;
  credit_amount: string;
  memo: string;
}

export interface COGSJournalEntryImpact {
  entry_id: string;
  source_module: 'WIP_ALLOCATION';
  project_name: string;
  unit_identifier: string;
  entry_date: string;
  unit_contract_value: string;
  allocated_cogs: string;
  rsv_factor: string;
  gross_profit: string;
  gross_margin_pct: string;
  lines: COGSJournalLine[];
  total_debits: string;
  total_credits: string;
  is_balanced: boolean;
}

export interface PortfolioAllocationKPIs {
  totalWip: Decimal;
  totalSales: Decimal;
  avgRsvFactor: Decimal;
  avgRsvPct: string;
  avgGrossMarginPct: string;
  totalGrossMarginValue: Decimal;
  count: number;
}

/** A factor as plain text so multiplication keeps every digit. */
function factorText(f: string | Decimal): string {
  return f instanceof Decimal ? f.toString() : String(f);
}

export class RSVEngine {
  /**
   * Compute Relative Sales Value (RSV) allocation factor:
   * RSV Factor = Total Incurred Construction WIP / Total Project Sales Value
   */
  static calculateAllocation(
    projectName: string,
    totalIncurredWIP: string | Decimal,
    totalProjectSalesValue: string | Decimal
  ): ERPCostAllocation {
    const wip = D(totalIncurredWIP);
    const sales = D(totalProjectSalesValue);

    if (sales.isZero() || sales.isNegative()) {
      throw new Error('ERP RSV Error: Total project sales value must be greater than zero.');
    }

    if (wip.isNegative()) {
      throw new Error('ERP RSV Error: Total incurred construction WIP cannot be negative.');
    }

    // Factor kept as a 6-decimal string: a Decimal would round it to 2 decimals.
    const factorRatio = ratio(wip, sales, 6);

    return {
      allocation_id: generateUUID(),
      project_name: projectName,
      total_incurred_wip: wip.toFixed(2),
      total_sales_value: sales.toFixed(2),
      rsv_factor: factorRatio,
      calculated_at: new Date().toISOString()
    };
  }

  /**
   * Calculate Unit COGS Cost to relieve upon Physical Handover:
   * Unit COGS = Unit Contract Value * RSV Factor
   */
  static computeUnitCOGS(
    unitContractValue: string | Decimal,
    rsvFactor: string | Decimal
  ): Decimal {
    const v = D(unitContractValue);
    const f = factorText(rsvFactor);
    if (v.isNegative() || Number(f) < 0) return D(0);
    return v.times(f);
  }

  /**
   * Compute Unit Allocated Cost (synonym for computeUnitCOGS with explicit naming)
   */
  static computeUnitAllocatedCost(
    unitSalesValue: string | Decimal,
    rsvFactor: string | Decimal
  ): Decimal {
    return this.computeUnitCOGS(unitSalesValue, rsvFactor);
  }

  /**
   * Compute Gross Margin Ratio (1 - RSV Factor)
   */
  static computeGrossMargin(rsvFactor: string | Decimal): Decimal {
    const f = D(rsvFactor);
    return D(1).minus(f);
  }

  /**
   * Compute Gross Margin Percentage formatted string
   */
  static computeGrossMarginPct(rsvFactor: string | Decimal): string {
    // 100 - 100 x factor, exact to 2 decimals (no pre-rounded factor).
    return `${D(100).minus(D(100).times(factorText(rsvFactor))).toFixed(2)}%`;
  }

  /**
   * Compute Expected Gross Margin Amount for a given unit value:
   * Gross Margin = Unit Sales Value - Unit Allocated COGS
   */
  static computeGrossMarginAmount(
    unitSalesValue: string | Decimal,
    rsvFactor: string | Decimal
  ): Decimal {
    const v = D(unitSalesValue);
    const val = v.isNegative() ? D(0) : v;
    const cogs = this.computeUnitCOGS(val, rsvFactor);
    return val.minus(cogs);
  }

  /**
   * Generate balanced IFRS 15 COGS & Revenue Recognition Journal Entry Impact:
   * - Dr 501000 Cost of Sales (تكلفة مبيعات الوحدات المسلمة)
   * - Cr 150000 Construction WIP (مشروعات تحت التنفيذ - أعمال ومواد بناء)
   * - Dr 203000 Deferred Revenue / Customer Advances (مقدمات وأقساط حجز الشقق)
   * - Cr 401000 Realized Property Sales Revenue (إيرادات مبيعات عقارية محققة)
   */
  static generateCOGSJournalEntryImpact(params: {
    projectName: string;
    unitIdentifier: string;
    unitContractValue: string | Decimal;
    rsvFactor: string | Decimal;
    date?: string;
    entryId?: string;
  }): COGSJournalEntryImpact {
    const rawVal = D(params.unitContractValue);
    const unitVal = rawVal.isNegative() ? D(0) : rawVal;
    const rawFactor = factorText(params.rsvFactor);
    const factor = Number(rawFactor) < 0 ? '0' : rawFactor;
    const unitCogs = this.computeUnitCOGS(unitVal, factor);
    const grossProfit = unitVal.minus(unitCogs);
    const grossMarginPct = this.computeGrossMarginPct(factor);
    const entryDate = params.date || new Date().toISOString();
    const entryId = params.entryId || generateUUID();

    const unitValStr = unitVal.toFixed(2);
    const unitCogsStr = unitCogs.toFixed(2);

    const lines: COGSJournalLine[] = [
      {
        account_code: '501000',
        account_name_ar: 'تكلفة مبيعات الوحدات المسلمة (COGS)',
        account_name_en: 'Cost of Sales - Delivered Units',
        debit_amount: unitCogsStr,
        credit_amount: '0.00',
        memo: `استنزال تكلفة الوحدة (${params.unitIdentifier}) بمشروع ${params.projectName} بمعامل RSV ${factor}`
      },
      {
        account_code: '150000',
        account_name_ar: 'مشروعات تحت التنفيذ - أعمال ومواد بناء (Construction WIP)',
        account_name_en: 'Construction WIP - Civil & Materials',
        debit_amount: '0.00',
        credit_amount: unitCogsStr,
        memo: `تخفيض حساب أعمال ومواد البناء للوحدة (${params.unitIdentifier}) عند التسليم الفعلي`
      },
      {
        account_code: '203000',
        account_name_ar: 'مقدمات وأقساط حجز الشقق المؤجلة (Deferred Revenue)',
        account_name_en: 'Deferred Revenue - Customer Advances',
        debit_amount: unitValStr,
        credit_amount: '0.00',
        memo: `إلغاء الإيراد المؤجل وتحويله إلى إيراد محقق للوحدة (${params.unitIdentifier})`
      },
      {
        account_code: '401000',
        account_name_ar: 'إيرادات مبيعات عقارية محققة (Realized Revenue)',
        account_name_en: 'Realized Property Sales Revenue',
        debit_amount: '0.00',
        credit_amount: unitValStr,
        memo: `إثبات المبيعات العقارية المحققة للوحدة (${params.unitIdentifier}) بالتسليم الفعلي`
      }
    ];

    const totalDebits = D(unitCogsStr).plus(D(unitValStr)).toFixed(2);
    const totalCredits = D(unitCogsStr).plus(D(unitValStr)).toFixed(2);

    return {
      entry_id: entryId,
      source_module: 'WIP_ALLOCATION',
      project_name: params.projectName,
      unit_identifier: params.unitIdentifier,
      entry_date: entryDate,
      unit_contract_value: unitValStr,
      allocated_cogs: unitCogsStr,
      rsv_factor: factor,
      gross_profit: grossProfit.toFixed(2),
      gross_margin_pct: grossMarginPct,
      lines,
      total_debits: totalDebits,
      total_credits: totalCredits,
      is_balanced: totalDebits === totalCredits
    };
  }

  /**
   * Derive or compute unit-by-unit allocated costs for a project allocation.
   * Matches live ratified contracts or generates standard floor-plan distribution.
   */
  static calculateProjectUnitsBreakdown(
    allocation: ERPCostAllocation,
    contracts: ERPContract[] = [],
    property?: Property
  ): ProjectUnitAllocationItem[] {
    const factor = factorText(allocation.rsv_factor || '0');
    const safeFactor = Number(factor) < 0 ? '0' : factor;
    const projName = (allocation.project_name || '').toLowerCase().trim();

    // 1. Filter real contracts matching this project
    const matchedContracts = contracts.filter(c => {
      if (c.status === 'Rescinded') return false;
      if (property && c.property_id === property.id) return true;
      const uId = (c.unit_id || '').toLowerCase();
      if (!projName) return false;
      return uId.length > 0 && (uId.includes(projName) || projName.includes(uId));
    });

    if (matchedContracts.length > 0) {
      return matchedContracts.map(c => {
        const rawVal = D(c.gross_contract_value || '0');
        const val = rawVal.isNegative() ? D(0) : rawVal;
        const cogs = this.computeUnitCOGS(val, safeFactor);
        const margin = val.minus(cogs);
        const marginPct = val.isZero() ? '0.00%' : `${margin.times(100).div(val).toFixed(2)}%`;
        const isHandedOver = c.handover_status === 'Delivered';

        return {
          unit_id: c.unit_id || c.contract_number,
          unit_title: c.unit_id ? `${c.unit_id} - ${c.buyer_name}` : c.contract_number,
          buyer_name: c.buyer_name,
          unit_sales_value: val.toFixed(2),
          allocated_cost: cogs.toFixed(2),
          gross_margin: margin.toFixed(2),
          gross_margin_pct: marginPct,
          handover_status: isHandedOver ? 'Delivered' : 'Pending',
          handover_date: c.handover_date
        };
      });
    }

    // 2. If no direct contracts matched, but property has defined building_units, map real architectural units
    if (property?.building_units && property.building_units.length > 0) {
      return property.building_units.map(u => {
        const rawPrice = D(u.price_egp || 0);
        const unitVal = rawPrice.isNegative() ? D(0) : rawPrice;
        const cogs = this.computeUnitCOGS(unitVal, safeFactor);
        const margin = unitVal.minus(cogs);
        const marginPct = unitVal.isZero() ? '0.00%' : `${margin.times(100).div(unitVal).toFixed(2)}%`;

        return {
          unit_id: u.unit_id || u.unit_number,
          unit_title: u.unit_number ? `${u.unit_number}${u.area_sqm ? ` (${u.area_sqm} م²)` : ''}` : u.unit_id,
          buyer_name: u.buyer_name || (u.status === 'contracted' ? 'عميل متعاقد' : undefined),
          unit_sales_value: unitVal.toFixed(2),
          allocated_cost: cogs.toFixed(2),
          gross_margin: margin.toFixed(2),
          gross_margin_pct: marginPct,
          handover_status: 'Pending'
        };
      });
    }

    // 3. No contracts and no defined units: nothing to break down (never invent units).
    return [];
  }

  /**
   * Calculate aggregated portfolio allocation metrics across all project allocations
   */
  static calculatePortfolioAllocationKPIs(allocations: ERPCostAllocation[]): PortfolioAllocationKPIs {
    let totalWip = D(0);
    let totalSales = D(0);

    for (const ca of allocations) {
      totalWip = totalWip.plus(ca.total_incurred_wip || '0');
      totalSales = totalSales.plus(ca.total_sales_value || '0');
    }

    const avgRsvFactor = totalSales.isZero() ? D(0) : totalWip.div(totalSales);
    const avgRsvPctValue = totalSales.isZero() ? D(0) : totalWip.times(100).div(totalSales);
    const avgRsvPct = `${avgRsvPctValue.toFixed(2)}%`;
    // Honest zero-state: If portfolio sales are zero, gross margin percentage is 0.00%, never false 100.00%
    const avgGrossMarginPct = `${(totalSales.isZero() ? D(0) : D(100).minus(avgRsvPctValue)).toFixed(2)}%`;
    const totalGrossMarginValue = totalSales.minus(totalWip);

    return {
      totalWip,
      totalSales,
      avgRsvFactor,
      avgRsvPct,
      avgGrossMarginPct,
      totalGrossMarginValue,
      count: allocations.length
    };
  }
}

