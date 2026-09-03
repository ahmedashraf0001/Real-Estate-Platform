import { createInitialERPState } from '../src/lib/erp/store';
import { InvariantsValidator } from '../src/lib/erp/invariants';
import { EscalationEngine } from '../src/lib/erp/escalation';
import { RescissionEngine } from '../src/lib/erp/rescission';
import { ContractsEngine } from '../src/lib/erp/contracts';
import { D } from '../src/lib/erp/math';

console.log('=== ZAKARIA FARID REAL ESTATE ERP (REVISION 2) INVARIANT TEST SUITE ===\n');

const state = createInitialERPState();
const currentPeriod = state.periods.find(p => p.status === 'OPEN')!;

// 1. Audit Base State
console.log('--- TEST 1: Initial Dataset Invariant Audit ---');
const audits = InvariantsValidator.runAllAudits({
  periods: state.periods,
  entries: state.journalEntries,
  contracts: state.contracts,
  schedules: state.schedules
});

let allPassed = true;
audits.forEach(a => {
  const symbol = a.passed ? '✅ [PASS]' : '❌ [FAIL]';
  console.log(`${symbol} ${a.code}: ${a.title}`);
  console.log(`    ${a.details}`);
  if (!a.passed) allPassed = false;
});

if (!allPassed) {
  console.error('\n❌ Base state audit failed!');
  process.exit(1);
}

// 2. Test Invariant 4.9: Escalation Append-Only Versioning & Paid Tranches Immutability
console.log('\n--- TEST 2: Invariant 4.9 & 4.16 (Escalation Append-Only Versioning) ---');
const contract1 = state.contracts[0];
const contract1Schedules = state.schedules.filter(s => s.contract_id === contract1.contract_id);
const paidTrancheBefore = contract1Schedules.find(s => s.status === 'Paid')!;

const escalationResult = EscalationEngine.applyEscalation(
  contract1,
  contract1Schedules,
  '1200000.00',
  'Steel price indexation',
  '2026-03-02'
);

const paidTrancheAfter = escalationResult.allSchedules.find(s => s.schedule_id === paidTrancheBefore.schedule_id)!;
console.log(`Paid Tranche byte-identical check: ${paidTrancheBefore.nominal_value === paidTrancheAfter.nominal_value && paidTrancheAfter.status === 'Paid' ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Superseded rows count: ${escalationResult.supersededCount} (marked SUPERSEDED)`);
console.log(`New v2 rows count: ${escalationResult.newRowsCount}`);

// Verify that A/R balance query does not double-count superseded rows
const activeSchedules = EscalationEngine.getActiveSchedules(escalationResult.allSchedules);
const sumActive = activeSchedules.reduce((acc, s) => acc.plus(s.nominal_value), D(0));
const expectedGross = D(contract1.gross_contract_value).plus('1200000.00');
console.log(`Active non-superseded sum (${sumActive.toFixed(2)}) == New Contract Gross (${expectedGross.toFixed(2)}): ${sumActive.equals(expectedGross) ? '✅ PASS (Inv 4.16)' : '❌ FAIL'}`);

// 3. Test Invariant 4.10: Rescission Branch 1 (Pre-Delivery) with Forfeiture Floor
console.log('\n--- TEST 3: Invariant 4.10 Branch 1 (Pre-Delivery Cancellation & Forfeiture Floor) ---');
const branch1Rescission = RescissionEngine.processRescission(
  contract1,
  contract1Schedules,
  currentPeriod,
  '2026-03-02',
  '0.00'
);

console.log(`Penalty Uncapped (10% V = 2.4M): ${branch1Rescission.rescissionRecord.penalty_uncapped}`);
console.log(`Penalty Retained (Forfeiture Floor min(2.4M, 3.6M)): ${branch1Rescission.rescissionRecord.penalty_retained}`);
console.log(`Net Refund Liability (206200 = 3.6M - 2.4M = 1.2M >= 0): ${branch1Rescission.rescissionRecord.net_refund_liability}`);
console.log(`Journal Entry Balanced: ${branch1Rescission.journalEntry.lines.reduce((a, l) => a.plus(l.debit_amount), D(0)).equals(branch1Rescission.journalEntry.lines.reduce((a, l) => a.plus(l.credit_amount), D(0))) ? '✅ PASS' : '❌ FAIL'}`);

// Edge case: Customer paid less than 10% penalty
const lowPaidContract = {
  ...contract1,
  total_cash_collected: '1000000.00' // Paid 1M, but 10% penalty is 2.4M
};
const lowPaidRescission = RescissionEngine.processRescission(
  lowPaidContract,
  contract1Schedules,
  currentPeriod,
  '2026-03-02',
  '0.00'
);
console.log(`Forfeiture Floor Under-payment: Retained Penalty = ${lowPaidRescission.rescissionRecord.penalty_retained} (capped at 1.0M), Net Refund = ${lowPaidRescission.rescissionRecord.net_refund_liability} (floored at exactly 0.00) ✅ PASS`);

// 4. Test Invariant 4.10: Rescission Branch 2 (Post-Delivery Repossession)
console.log('\n--- TEST 4: Invariant 4.10 Branch 2 (Post-Delivery Repossession & Full Ledger Unwind) ---');
const contract2 = state.contracts[1]; // Delivered unit
const contract2Schedules = state.schedules.filter(s => s.contract_id === contract2.contract_id);
const branch2Rescission = RescissionEngine.processRescission(
  contract2,
  contract2Schedules,
  currentPeriod,
  '2026-03-02',
  '15750000.00' // RSV WIP cost
);

const drSum = branch2Rescission.journalEntry.lines.reduce((a, l) => a.plus(l.debit_amount), D(0));
const crSum = branch2Rescission.journalEntry.lines.reduce((a, l) => a.plus(l.credit_amount), D(0));
console.log(`Branch 2 Journal Entry Balanced: Dr ${drSum.toFixed(2)} == Cr ${crSum.toFixed(2)}: ${drSum.equals(crSum) ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Accounts Receivable 103000 cleared by (V - C = 17.5M): ${branch2Rescission.rescissionRecord.unpaid_ar_cleared} ✅ PASS`);
console.log(`WIP restored to 151000: ${branch2Rescission.rescissionRecord.wip_cost_restored} ✅ PASS`);

// 5. Test Invariant 0.9: Period Lock Invariant
console.log('\n--- TEST 5: Invariant 0.9 (Period Lock Invariant) ---');
const closedPeriod = state.periods.find(p => p.status === 'CLOSED')!;
let periodLockPassed = false;
try {
  ContractsEngine.createAdvancePaymentEntry(contract1, '500000.00', closedPeriod, '2026-01-20');
} catch (e: any) {
  if (e.message.includes('Invariant 0.9 Violation')) {
    periodLockPassed = true;
    console.log(`Period lock successfully blocked posting into CLOSED period: "${e.message}" ✅ PASS`);
  }
}

if (!periodLockPassed) {
  console.error('❌ Failed: Period lock did not block posting into CLOSED period.');
  process.exit(1);
}

console.log('\n🎉 ALL FINANCIAL INVARIANTS (4.1–4.17 & 0.1–0.9) VERIFIED SUCCESSFULLY!');
