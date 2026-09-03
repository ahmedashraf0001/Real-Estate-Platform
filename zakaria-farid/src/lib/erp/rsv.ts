/**
 * Zakaria Farid Real Estate ERP — Relative Sales Value (RSV) & WIP Allocation Engine
 * Enforces Spec §14.C.7 (WIP Cost Relief at Handover).
 */

import { D, Decimal, generateUUID } from './math';
import { ERPCostAllocation } from './types';

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

    // Ratio calculated with fixed precision
    const factorRatio = wip.div(sales);

    return {
      allocation_id: generateUUID(),
      project_name: projectName,
      total_incurred_wip: wip.toFixed(2),
      total_sales_value: sales.toFixed(2),
      rsv_factor: factorRatio.toFixed(4),
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
    const f = D(rsvFactor);
    return v.times(f);
  }
}
