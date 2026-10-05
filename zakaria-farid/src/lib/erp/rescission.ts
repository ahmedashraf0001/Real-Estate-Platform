/**
 * Zakaria Farid Real Estate ERP — Contract Rescission & Repossession Engine (Revision 2)
 * Enforces Invariant 4.10 (Two-Branch Rescission arithmetic with Forfeiture Floor).
 */

import { D, Decimal, minDecimal, generateUUID } from './math';
import { 
  ERPAccountingPeriod, 
  ERPContract, 
  ERPCostAllocation,
  ERPInstallmentSchedule, 
  ERPJournalEntry, 
  ERPRescissionRecord 
} from './types';
import { Property } from '../supabase/types';
import { GeneralLedgerEngine } from './ledger';
import { getHandoverCOGS } from './canonicalMetrics';

export interface RescissionCostResolution {
  /** True when the rescission must reverse a unit cost (delivered contracts only). */
  needed: boolean;
  /** Unit cost to restore to WIP, or null when it is needed but not recorded. */
  amount: string | null;
  source: 'not-needed' | 'handover-entry' | 'rsv' | 'none';
  handoverEntry?: ERPJournalEntry;
}

/** The handover journal entry of a contract, if one was posted. */
export function findHandoverEntry(contract: ERPContract, journalEntries: ERPJournalEntry[] = []): ERPJournalEntry | undefined {
  return journalEntries.find(j =>
    j.entry_number === `JE-HANDOVER-${contract.contract_number}` ||
    (j.source_module === 'SALES' && j.source_entity_id === contract.contract_id && j.entry_number.startsWith('JE-HANDOVER'))
  );
}

/**
 * Unit cost a rescission must restore to WIP, from recorded data only (no assumed cost ratio).
 * Delivered: the handover entry's COGS, else the project's RSV allocation; otherwise not recorded.
 */
export function resolveRescissionCost(params: {
  contract: ERPContract;
  journalEntries?: ERPJournalEntry[];
  costAllocations?: ERPCostAllocation[];
  properties?: Property[];
}): RescissionCostResolution {
  const { contract } = params;
  if (contract.handover_status !== 'Delivered') {
    return { needed: false, amount: '0.00', source: 'not-needed' };
  }

  const handoverEntry = findHandoverEntry(contract, params.journalEntries);
  if (handoverEntry) {
    const cogsLine = handoverEntry.lines.find(l => D(l.debit_amount).gt(0) && l.account_code.startsWith('50'));
    const wipLine = handoverEntry.lines.find(l => D(l.credit_amount).gt(0) && l.account_code.startsWith('15'));
    const line = cogsLine ? cogsLine.debit_amount : wipLine?.credit_amount;
    if (line && D(line).gt(0)) {
      return { needed: true, amount: D(line).toFixed(2), source: 'handover-entry', handoverEntry };
    }
  }

  const property = (params.properties || []).find(p => p.id === contract.property_id || p.id === contract.unit_id);
  const cogs = getHandoverCOGS({
    contractValue: contract.gross_contract_value,
    costAllocations: params.costAllocations || [],
    property,
  });
  if (cogs.isAllocated && cogs.cogsAmount.gt(0)) {
    return { needed: true, amount: cogs.cogsFormatted, source: 'rsv', handoverEntry };
  }

  return { needed: true, amount: null, source: 'none', handoverEntry };
}

export class RescissionEngine {
  /**
   * Execute Contract Rescission and Generate Exact Accounting Postings.
   * Enforces Invariant 4.10:
   * 
   * Penalty_uncapped = PenaltyRate * Gross Contract Value (V) [Default: 10%]
   * Penalty_retained = MIN(Penalty_uncapped, Total Cash Collected C)  [Forfeiture Floor]
   * Net Refund = C - Penalty_retained (always >= 0)
   * 
   * Precondition check:
   * - Branch 1 (Pre-Delivery): Handover has NOT occurred. Revenue unearned (203000).
   * - Branch 2 (Post-Delivery): Handover HAS occurred. Revenue recognized (401000).
   * 
   * @param penaltyRate Optional decimal fraction between 0.00 and 1.00 (e.g. 0.10 for 10%, 0.075 for 7.5%). Defaults to 0.10.
   */
  static processRescission(
    contract: ERPContract,
    schedules: ERPInstallmentSchedule[],
    period: ERPAccountingPeriod,
    rescissionDate: string,
    originalRsvCostAmount: string | Decimal = '0.00',
    cogsAccountCode = '501000',
    wipAccountCode = '151000',
    actor = 'CHIEF_FINANCIAL_OFFICER',
    originalHandoverEntry?: ERPJournalEntry,
    penaltyRate: number | string | Decimal = '0.10'
  ): {
    rescissionRecord: ERPRescissionRecord;
    journalEntry: ERPJournalEntry;
    updatedContract: ERPContract;
    updatedSchedules: ERPInstallmentSchedule[];
  } {
    const V = D(contract.gross_contract_value);
    const C = D(contract.total_cash_collected);

    // Validate and parse adjustable penalty rate (0.00 <= rate <= 1.00).
    // The rate stays text: a Decimal would round 0.075 to 0.08.
    const rateText = penaltyRate instanceof Decimal
      ? penaltyRate.toString()
      : String(penaltyRate !== undefined && penaltyRate !== null && String(penaltyRate).trim() !== '' ? penaltyRate : '0.10').trim();
    const rateNum = Number(rateText);
    if (Number.isNaN(rateNum)) {
      throw new Error(
        `ERP Invariant 4.10 Violation: Invalid penalty rate NaN. Must be between 0.00 and 1.00 (0% - 100%).`
      );
    }
    if (rateNum < 0 || rateNum > 1) {
      throw new Error(
        `ERP Invariant 4.10 Violation: Invalid penalty rate ${rateText}. Must be between 0.00 and 1.00 (0% - 100%).`
      );
    }
    const penaltyUncapped = V.times(rateText);

    // Forfeiture Floor: Retained penalty cannot exceed what customer actually paid
    const penaltyRetained = minDecimal(penaltyUncapped, C);
    const netRefund = C.minus(penaltyRetained);

    const penaltyPercentStr = `${D(100).times(rateText).toString()}%`;

    // Invariant 4.10 Assertion: Refund liability cannot be negative
    if (netRefund.isNegative()) {
      throw new Error(
        `ERP Invariant 4.10 Violation: Negative refund liability calculated (${netRefund.toFixed(2)}). Forfeiture floor rule failure.`
      );
    }

    const isPostDelivery = contract.handover_status === 'Delivered';
    const branch = isPostDelivery ? 'Post-Delivery' : 'Pre-Delivery';
    const rescissionId = generateUUID();

    let journalEntry: ERPJournalEntry;
    const unpaidArCleared = isPostDelivery ? V.minus(C) : D(0);

    let effectiveRsvCost = D(originalRsvCostAmount);
    let effectiveCogsAccount = cogsAccountCode;
    let effectiveWipAccount = wipAccountCode;

    // In Branch 2 (Post-Delivery), if the original handover journal entry is provided,
    // reverse the exact historical WIP asset account and COGS expense account/amounts.
    if (isPostDelivery && originalHandoverEntry && originalHandoverEntry.lines) {
      const cogsLine = originalHandoverEntry.lines.find(
        l => D(l.debit_amount).gt(0) && l.account_code.startsWith('50')
      );
      const wipLine = originalHandoverEntry.lines.find(
        l => D(l.credit_amount).gt(0) && l.account_code.startsWith('15')
      );

      if (cogsLine) {
        effectiveCogsAccount = cogsLine.account_code;
        effectiveRsvCost = D(cogsLine.debit_amount);
      }
      if (wipLine) {
        effectiveWipAccount = wipLine.account_code;
        if (!cogsLine) {
          effectiveRsvCost = D(wipLine.credit_amount);
        }
      }
    }

    if (isPostDelivery && !effectiveRsvCost.isPositive()) {
      throw new Error(
        'ERP Rescission Error: unit cost is not recorded; record and allocate costs before rescinding a delivered contract.'
      );
    }
    // A pre-delivery cancellation restores no cost.
    if (!isPostDelivery) {
      effectiveRsvCost = D(0);
    }

    if (!isPostDelivery) {
      // ==========================================
      // Branch 1: Pre-Delivery Cancellation
      // ==========================================
      // Dr 203000 Deferred Contract Revenue     (C)
      // Cr 430100 Cancellation Penalty Revenue  (Penalty_retained)
      // Cr 206200 Customer Refund Liability     (Net Refund, >= 0)
      journalEntry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-RESC-PRE-${contract.contract_number}`,
        entry_date: rescissionDate,
        period,
        description: `Contract Rescission & Cancellation (Branch 1 - Pre-Delivery) for ${contract.contract_number} (penalty ${penaltyPercentStr}, Forfeiture Floor Applied)`,
        source_module: 'RESCISSION',
        source_entity_id: contract.contract_id,
        created_by: actor,
        lines: [
          {
            account_code: '203000',
            debit_amount: C.toFixed(2),
            credit_amount: '0.00',
            contract_id: contract.contract_id,
            unit_id: contract.unit_id,
            memo: 'Clear collected advances from Deferred Revenue'
          },
          {
            account_code: '430100',
            debit_amount: '0.00',
            credit_amount: penaltyRetained.toFixed(2),
            contract_id: contract.contract_id,
            unit_id: contract.unit_id,
            memo: 'Recognize retained forfeiture penalty'
          },
          {
            account_code: '206200',
            debit_amount: '0.00',
            credit_amount: netRefund.toFixed(2),
            contract_id: contract.contract_id,
            unit_id: contract.unit_id,
            memo: 'Customer net refund liability payable'
          }
        ]
      });
    } else {
      // ==========================================
      // Branch 2: Post-Delivery Repossession
      // ==========================================
      // Dr 401000 Realized Sales Revenue        (V)
      // Cr 430100 Cancellation Penalty Revenue  (Penalty_retained)
      // Cr 206200 Customer Refund Liability     (Net Refund)
      // Cr 103000 Accounts Receivable           (V - C)
      // Dr 150000-156000 WIP                    (RSV_Cost restored to asset)
      // Cr 501000-504000 COGS                   (RSV_Cost reversed)
      journalEntry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-RESC-POST-${contract.contract_number}`,
        entry_date: rescissionDate,
        period,
        description: `Contract Rescission & Repossession (Branch 2 - Post-Delivery) for ${contract.contract_number} (penalty ${penaltyPercentStr}, Full Ledger Unwind)`,
        source_module: 'RESCISSION',
        source_entity_id: contract.contract_id,
        created_by: actor,
        lines: [
          {
            account_code: '401000',
            debit_amount: V.toFixed(2),
            credit_amount: '0.00',
            contract_id: contract.contract_id,
            unit_id: contract.unit_id,
            memo: 'Reverse Realized Sales Revenue in full'
          },
          {
            account_code: '430100',
            debit_amount: '0.00',
            credit_amount: penaltyRetained.toFixed(2),
            contract_id: contract.contract_id,
            unit_id: contract.unit_id,
            memo: 'Recognize retained cancellation penalty'
          },
          {
            account_code: '206200',
            debit_amount: '0.00',
            credit_amount: netRefund.toFixed(2),
            contract_id: contract.contract_id,
            unit_id: contract.unit_id,
            memo: 'Customer refund liability payable'
          },
          {
            account_code: '103000',
            debit_amount: '0.00',
            credit_amount: unpaidArCleared.toFixed(2),
            contract_id: contract.contract_id,
            unit_id: contract.unit_id,
            memo: 'Clear uncollected Accounts Receivable off balance sheet'
          },
          {
            account_code: effectiveWipAccount,
            debit_amount: effectiveRsvCost.toFixed(2),
            credit_amount: '0.00',
            contract_id: contract.contract_id,
            unit_id: contract.unit_id,
            memo: 'Restore unit cost basis to Construction WIP'
          },
          {
            account_code: effectiveCogsAccount,
            debit_amount: '0.00',
            credit_amount: effectiveRsvCost.toFixed(2),
            contract_id: contract.contract_id,
            unit_id: contract.unit_id,
            memo: 'Reverse Cost of Goods Sold'
          }
        ]
      });
    }

    // Transition all unbilled future schedule lineage rows (Pending and SUPERSEDED) to 'Void'
    const updatedSchedules = schedules.map(s => {
      if (s.status === 'Pending' || s.status === 'SUPERSEDED') {
        return {
          ...s,
          status: 'Void' as const
        };
      }
      return s;
    });

    const rescissionRecord: ERPRescissionRecord = {
      rescission_id: rescissionId,
      contract_id: contract.contract_id,
      branch,
      gross_contract_value: V.toFixed(2),
      total_cash_collected: C.toFixed(2),
      penalty_uncapped: penaltyUncapped.toFixed(2),
      penalty_retained: penaltyRetained.toFixed(2),
      net_refund_liability: netRefund.toFixed(2),
      unpaid_ar_cleared: unpaidArCleared.toFixed(2),
      wip_cost_restored: effectiveRsvCost.toFixed(2),
      unit_state: 'Under Rescission Audit',
      journal_entry_id: journalEntry.entry_id,
      created_at: new Date().toISOString()
    };

    const updatedContract: ERPContract = {
      ...contract,
      status: 'Rescinded'
    };

    return {
      rescissionRecord,
      journalEntry,
      updatedContract,
      updatedSchedules
    };
  }
}
