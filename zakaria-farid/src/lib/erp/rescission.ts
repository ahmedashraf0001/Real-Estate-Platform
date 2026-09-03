/**
 * Zakaria Farid Real Estate ERP — Contract Rescission & Repossession Engine (Revision 2)
 * Enforces Invariant 4.10 (Two-Branch Rescission arithmetic with Forfeiture Floor).
 */

import { D, minDecimal, generateUUID } from './math';
import { 
  ERPAccountingPeriod, 
  ERPContract, 
  ERPInstallmentSchedule, 
  ERPJournalEntry, 
  ERPRescissionRecord 
} from './types';
import { GeneralLedgerEngine } from './ledger';

export class RescissionEngine {
  /**
   * Execute Contract Rescission and Generate Exact Accounting Postings.
   * Enforces Invariant 4.10:
   * 
   * Penalty_uncapped = 10% * Gross Contract Value (V)
   * Penalty_retained = MIN(Penalty_uncapped, Total Cash Collected C)  [Forfeiture Floor]
   * Net Refund = C - Penalty_retained (always >= 0)
   * 
   * Precondition check:
   * - Branch 1 (Pre-Delivery): Handover has NOT occurred. Revenue unearned (203000).
   * - Branch 2 (Post-Delivery): Handover HAS occurred. Revenue recognized (401000).
   */
  static processRescission(
    contract: ERPContract,
    schedules: ERPInstallmentSchedule[],
    period: ERPAccountingPeriod,
    rescissionDate: string,
    originalRsvCostAmount = '0.00',
    cogsAccountCode = '501000',
    wipAccountCode = '151000',
    actor = 'CHIEF_FINANCIAL_OFFICER'
  ): {
    rescissionRecord: ERPRescissionRecord;
    journalEntry: ERPJournalEntry;
    updatedContract: ERPContract;
    updatedSchedules: ERPInstallmentSchedule[];
  } {
    const V = D(contract.gross_contract_value);
    const C = D(contract.total_cash_collected);

    // 10% statutory/contract penalty
    const penaltyRate = D('0.10');
    const penaltyUncapped = V.times(penaltyRate);

    // Forfeiture Floor: Retained penalty cannot exceed what customer actually paid
    const penaltyRetained = minDecimal(penaltyUncapped, C);
    const netRefund = C.minus(penaltyRetained);

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
    const rsvCost = D(originalRsvCostAmount);

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
        description: `Contract Rescission & Cancellation (Branch 1 - Pre-Delivery) for ${contract.contract_number} (Forfeiture Floor Applied)`,
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
        description: `Contract Rescission & Repossession (Branch 2 - Post-Delivery) for ${contract.contract_number} (Full Ledger Unwind)`,
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
            account_code: wipAccountCode,
            debit_amount: rsvCost.toFixed(2),
            credit_amount: '0.00',
            contract_id: contract.contract_id,
            unit_id: contract.unit_id,
            memo: 'Restore unit cost basis to Construction WIP'
          },
          {
            account_code: cogsAccountCode,
            debit_amount: '0.00',
            credit_amount: rsvCost.toFixed(2),
            contract_id: contract.contract_id,
            unit_id: contract.unit_id,
            memo: 'Reverse Cost of Goods Sold'
          }
        ]
      });
    }

    // Transition all unbilled/unpaid schedules to 'Void'
    const updatedSchedules = schedules.map(s => {
      if (s.status === 'Pending') {
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
      wip_cost_restored: rsvCost.toFixed(2),
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
