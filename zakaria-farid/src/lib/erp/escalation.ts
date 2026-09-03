/**
 * Zakaria Farid Real Estate ERP — Cost Escalation & Contract Amendment Engine (Revision 2)
 * Enforces Invariant 4.9 (Paid Tranches Untouched & Delta V Lineage) and Invariant 4.16 (Superseded Exclusion).
 */

import { D, Decimal, generateUUID } from './math';
import { 
  ERPContract, 
  ERPContractAmendment, 
  ERPInstallmentSchedule 
} from './types';

export class EscalationEngine {
  /**
   * Apply Cost Escalation (Delta V) to an existing contract schedule.
   * Enforces Invariant 4.9:
   * 1. Paid and Partially Paid tranches are NEVER modified, superseded, or touched.
   * 2. Only active unpaid tranches (status = 'Pending') are marked as 'SUPERSEDED'.
   * 3. New tranches at schedule_version + 1 are generated for the unpaid balance + Delta V.
   * 4. Remainder integer piastre rounding is absorbed into the final active tranche.
   * 5. Σ(New Tranches) - Σ(Old Tranches) == Delta V exactly.
   */
  static applyEscalation(
    contract: ERPContract,
    currentSchedules: ERPInstallmentSchedule[],
    deltaV: string | Decimal,
    reason: string,
    effectiveDate: string,
    approvedBy?: string
  ): {
    amendment: ERPContractAmendment;
    updatedContract: ERPContract;
    allSchedules: ERPInstallmentSchedule[]; // Contains historic superseded rows + new active rows
    supersededCount: number;
    newRowsCount: number;
  } {
    const delta = D(deltaV);
    if (delta.isZero() || delta.isNegative()) {
      throw new Error('ERP Escalation Error: Delta V must be a positive amount.');
    }

    // Identify active unpaid tranches
    // Active means: highest version for that tranche, status === 'Pending'
    const activeUnpaidTranches = currentSchedules.filter(
      s => s.status === 'Pending'
    );

    if (activeUnpaidTranches.length === 0) {
      throw new Error('ERP Escalation Error: No unpaid tranches available to absorb cost escalation.');
    }

    const highestVersion = Math.max(...currentSchedules.map(s => s.schedule_version || 1));
    const nextVersion = highestVersion + 1;
    const amendmentId = generateUUID();

    const amendment: ERPContractAmendment = {
      amendment_id: amendmentId,
      contract_id: contract.contract_id,
      delta_v: delta.toFixed(2),
      reason,
      effective_date: effectiveDate,
      new_version: nextVersion,
      approved_by: approvedBy || 'COMMERCIAL_DIRECTOR',
      created_at: new Date().toISOString()
    };

    // Calculate distribution of Delta V across unpaid tranches
    const count = activeUnpaidTranches.length;
    const baseDeltaPerTranche = delta.div(count);
    let cumulativeDeltaAllocated = D(0);

    const newTranches: ERPInstallmentSchedule[] = [];
    const modifiedSchedules: ERPInstallmentSchedule[] = currentSchedules.map(s => {
      // If it's one of the active unpaid tranches, transition status to SUPERSEDED
      if (s.status === 'Pending') {
        return {
          ...s,
          status: 'SUPERSEDED' as const
        };
      }
      // Paid / Partially Paid / Void rows remain untouched
      return s;
    });

    activeUnpaidTranches.forEach((oldTranche, idx) => {
      let trancheDelta: Decimal;
      if (idx === count - 1) {
        // Last tranche absorbs rounding discrepancy
        trancheDelta = delta.minus(cumulativeDeltaAllocated);
      } else {
        trancheDelta = baseDeltaPerTranche;
        cumulativeDeltaAllocated = cumulativeDeltaAllocated.plus(baseDeltaPerTranche);
      }

      const newNominal = D(oldTranche.nominal_value).plus(trancheDelta);

      newTranches.push({
        schedule_id: generateUUID(),
        contract_id: contract.contract_id,
        tranche_number: oldTranche.tranche_number,
        nominal_value: newNominal.toFixed(2),
        due_date: oldTranche.due_date,
        status: 'Pending',
        schedule_version: nextVersion,
        amendment_id: amendmentId,
        supersedes_schedule_id: oldTranche.schedule_id,
        amount_paid: '0.00'
      });
    });

    // Invariant 4.9 Check:
    // Σ(new unpaid tranches) - Σ(old unpaid tranches) == Delta V
    const sumNew = newTranches.reduce((acc, t) => acc.plus(t.nominal_value), D(0));
    const sumOld = activeUnpaidTranches.reduce((acc, t) => acc.plus(t.nominal_value), D(0));
    const calculatedDelta = sumNew.minus(sumOld);

    if (!calculatedDelta.equals(delta)) {
      throw new Error(
        `ERP Invariant 4.9 Violation: Sum(New Tranches) - Sum(Old Tranches) [${calculatedDelta.toFixed(2)}] != Delta V [${delta.toFixed(2)}].`
      );
    }

    const updatedContract: ERPContract = {
      ...contract,
      gross_contract_value: D(contract.gross_contract_value).plus(delta).toFixed(2)
    };

    return {
      amendment,
      updatedContract,
      allSchedules: [...modifiedSchedules, ...newTranches],
      supersededCount: activeUnpaidTranches.length,
      newRowsCount: newTranches.length
    };
  }

  /**
   * Filter and aggregate active schedules for reporting/balance queries.
   * Enforces Invariant 4.16: Excludes rows with status === 'SUPERSEDED' and resolves
   * to exactly one active row per tranche lineage (plus all Paid/Partially Paid rows).
   */
  static getActiveSchedules(schedules: ERPInstallmentSchedule[]): ERPInstallmentSchedule[] {
    return schedules.filter(s => s.status !== 'SUPERSEDED');
  }

  /**
   * Compute total outstanding receivables for a contract.
   */
  static getOutstandingBalance(schedules: ERPInstallmentSchedule[]): Decimal {
    const active = this.getActiveSchedules(schedules);
    return active
      .filter(s => s.status === 'Pending' || s.status === 'Partially Paid')
      .reduce((acc, s) => {
        const nominal = D(s.nominal_value);
        const paid = D(s.amount_paid || '0.00');
        return acc.plus(nominal.minus(paid));
      }, D(0));
  }
}
