/**
 * Zakaria Farid Real Estate ERP — Sales Contracts & Installment Engine (Revision 2)
 * Enforces Invariant 4.3 (Tranche Rounding) & Invariant 4.17 (Handover Net Recognition Model B).
 */

import { D, Decimal, generateUUID } from './math';
import { 
  ERPAccountingPeriod, 
  ERPContract, 
  ERPInstallmentSchedule, 
  ERPJournalEntry 
} from './types';
import { GeneralLedgerEngine } from './ledger';

export class ContractsEngine {
  /**
   * Generate Installment Schedule with Invariant 4.3 (Remainder absorbed in final tranche).
   * @param contractId Contract ID
   * @param grossValue Total contract value (V)
   * @param downPaymentPercent Down payment percentage (e.g. 0.15 for 15%)
   * @param numberOfInstallments Number of subsequent tranches (e.g. 12 quarters)
   * @param startDate Contract start date (YYYY-MM-DD)
   * @param intervalMonths Interval between installments in months (e.g. 3)
   */
  static generateSchedule(
    contractId: string,
    grossValue: string | Decimal,
    downPaymentPercent: string | number | Decimal,
    numberOfInstallments: number,
    startDate: string,
    intervalMonths = 3
  ): ERPInstallmentSchedule[] {
    const totalV = D(grossValue);
    const dpPct = D(downPaymentPercent);
    const downPaymentAmount = totalV.times(dpPct);
    const remainingAmount = totalV.minus(downPaymentAmount);

    const schedules: ERPInstallmentSchedule[] = [];

    // Tranche 0: Down Payment
    schedules.push({
      schedule_id: generateUUID(),
      contract_id: contractId,
      tranche_number: 0,
      nominal_value: downPaymentAmount.toFixed(2),
      due_date: startDate,
      status: 'Pending',
      schedule_version: 1,
      amount_paid: '0.00'
    });

    if (numberOfInstallments <= 0) {
      return schedules;
    }

    // Invariant 4.3: Calculate base tranche and absorb rounding difference into the final period
    const baseTrancheAmount = remainingAmount.div(numberOfInstallments);
    let cumulativeAllocated = D(0);

    const baseDate = new Date(startDate);

    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + (i * intervalMonths));
      const dueDateStr = dueDate.toISOString().split('T')[0];

      let trancheValue: Decimal;
      if (i === numberOfInstallments) {
        // Final tranche absorbs any integer piastre rounding discrepancy
        trancheValue = remainingAmount.minus(cumulativeAllocated);
      } else {
        trancheValue = baseTrancheAmount;
        cumulativeAllocated = cumulativeAllocated.plus(baseTrancheAmount);
      }

      schedules.push({
        schedule_id: generateUUID(),
        contract_id: contractId,
        tranche_number: i,
        nominal_value: trancheValue.toFixed(2),
        due_date: dueDateStr,
        status: 'Pending',
        schedule_version: 1,
        amount_paid: '0.00'
      });
    }

    // Assert Invariant: Sum of nominal values MUST exactly equal grossValue
    const sumNominal = schedules.reduce((acc, s) => acc.plus(s.nominal_value), D(0));
    if (!sumNominal.equals(totalV)) {
      throw new Error(
        `ERP Invariant 4.3 Assertion Failed: Tranche sum (${sumNominal.toFixed(2)}) != Gross Contract Value (${totalV.toFixed(2)}).`
      );
    }

    return schedules;
  }

  /**
   * Post Down Payment / Advance Collection (Pre-Handover).
   * Dr 101000/102000 (Cash/Bank)
   * Cr 203000 Deferred Contract Revenue
   */
  static createAdvancePaymentEntry(
    contract: ERPContract,
    amount: string | Decimal,
    period: ERPAccountingPeriod,
    entryDate: string,
    isVaultCash = false,
    actor = 'SYSTEM'
  ): ERPJournalEntry {
    const payment = D(amount);
    const cashAccount = isVaultCash ? '101000' : '102000';

    return GeneralLedgerEngine.validateAndCreateEntry({
      entry_number: `JE-PAY-${contract.contract_number}-${Date.now().toString().slice(-4)}`,
      entry_date: entryDate,
      period,
      description: `Advance Collection for Contract ${contract.contract_number} (${contract.buyer_name})`,
      source_module: 'SALES',
      source_entity_id: contract.contract_id,
      created_by: actor,
      lines: [
        {
          account_code: cashAccount,
          debit_amount: payment.toFixed(2),
          credit_amount: '0.00',
          contract_id: contract.contract_id,
          memo: 'Customer advance cash received'
        },
        {
          account_code: '203000',
          debit_amount: '0.00',
          credit_amount: payment.toFixed(2),
          contract_id: contract.contract_id,
          memo: 'Credit Deferred Contract Revenue'
        }
      ]
    });
  }

  /**
   * Post Physical Handover Protocol — Model B Net Recognition at Delivery.
   * Enforces Invariant 4.17 & Spec §14.D.12:
   * 
   * V = Gross Contract Value
   * C = Total Cash Collected Pre-Handover (203000 balance)
   * (V - C) = Remaining unpaid balance booked to 103000 A/R
   * 
   * Journal Posting:
   *   Dr 203000 Deferred Contract Revenue     == C
   *   Dr 103000 Accounts Receivable           == (V - C)
   *   Cr 401000 Realized Sales Revenue        == V
   *   Dr 501000-504000 COGS                   == RSV_Cost
   *   Cr 150000-156000 WIP                    == RSV_Cost
   */
  static createHandoverModelBEntry(
    contract: ERPContract,
    period: ERPAccountingPeriod,
    handoverDate: string,
    rsvCostAmount: string | Decimal,
    cogsAccountCode = '501000',
    wipAccountCode = '151000',
    actor = 'SYSTEM'
  ): ERPJournalEntry {
    const V = D(contract.gross_contract_value);
    const C = D(contract.total_cash_collected);
    const unpaidBalance = V.minus(C);
    const cogs = D(rsvCostAmount);

    if (C.greaterThan(V)) {
      throw new Error(`ERP Handover Error: Total cash collected (${C.toFixed(2)}) exceeds contract value (${V.toFixed(2)}).`);
    }

    return GeneralLedgerEngine.validateAndCreateEntry({
      entry_number: `JE-HANDOVER-${contract.contract_number}`,
      entry_date: handoverDate,
      period,
      description: `Physical Handover Protocol & Revenue Recognition (Model B) for Contract ${contract.contract_number} (Unit ${contract.unit_id})`,
      source_module: 'SALES',
      source_entity_id: contract.contract_id,
      created_by: actor,
      lines: [
        // 1. Clear Deferred Revenue (C)
        {
          account_code: '203000',
          debit_amount: C.toFixed(2),
          credit_amount: '0.00',
          contract_id: contract.contract_id,
          unit_id: contract.unit_id,
          memo: 'Clear Deferred Contract Revenue to 0.00'
        },
        // 2. Book Remaining Unpaid Balance to A/R (V - C)
        {
          account_code: '103000',
          debit_amount: unpaidBalance.toFixed(2),
          credit_amount: '0.00',
          contract_id: contract.contract_id,
          unit_id: contract.unit_id,
          memo: 'Book remaining unpaid tranches to Accounts Receivable'
        },
        // 3. Recognize Full Realized Revenue (V)
        {
          account_code: '401000',
          debit_amount: '0.00',
          credit_amount: V.toFixed(2),
          contract_id: contract.contract_id,
          unit_id: contract.unit_id,
          memo: 'Recognize 100% Realized Sales Revenue'
        },
        // 4. Relieve WIP to COGS via RSV
        {
          account_code: cogsAccountCode,
          debit_amount: cogs.toFixed(2),
          credit_amount: '0.00',
          contract_id: contract.contract_id,
          unit_id: contract.unit_id,
          memo: 'COGS recognized on delivery via Relative Sales Value'
        },
        {
          account_code: wipAccountCode,
          debit_amount: '0.00',
          credit_amount: cogs.toFixed(2),
          contract_id: contract.contract_id,
          unit_id: contract.unit_id,
          memo: 'WIP relief on physical handover'
        }
      ]
    });
  }

  /**
   * Post Post-Handover Installment Collection.
   * Directly credits 103000 Accounts Receivable (since 203000 was already cleared at handover).
   */
  static createPostHandoverCollectionEntry(
    contract: ERPContract,
    amount: string | Decimal,
    period: ERPAccountingPeriod,
    entryDate: string,
    isVaultCash = false,
    actor = 'SYSTEM'
  ): ERPJournalEntry {
    const payment = D(amount);
    const cashAccount = isVaultCash ? '101000' : '102000';

    return GeneralLedgerEngine.validateAndCreateEntry({
      entry_number: `JE-COLL-${contract.contract_number}-${Date.now().toString().slice(-4)}`,
      entry_date: entryDate,
      period,
      description: `Post-Handover Collection for Contract ${contract.contract_number}`,
      source_module: 'SALES',
      source_entity_id: contract.contract_id,
      created_by: actor,
      lines: [
        {
          account_code: cashAccount,
          debit_amount: payment.toFixed(2),
          credit_amount: '0.00',
          contract_id: contract.contract_id,
          memo: 'Cash received for post-handover installment'
        },
        {
          account_code: '103000',
          debit_amount: '0.00',
          credit_amount: payment.toFixed(2),
          contract_id: contract.contract_id,
          memo: 'Credit Accounts Receivable'
        }
      ]
    });
  }
}
