---
name: financial-core
description: >-
  Work-routing track for statutory double-entry accounting, fixed-point math,
  revenue recognition, canonical metrics, and financial invariant enforcement.
  Enforces dual-gated verification before and after modifications.
---

# Track: FINANCIAL_CORE (Mathematical Engine & Statutory Accounting)

## Assigned Role: Financial Calculation Engineer
- **Delegation**: Must be invoked via Antigravity `invoke_subagent` with `TypeName: "self"`, `Role: "Financial Calculation Engineer"`, and strictly `Model: "flash"`. The `pro` model is strictly forbidden.
- **Scoping**: Edit domain logic in `src/lib/erp/`, execute verification suite `npm test` and `npx tsc --noEmit`.

## Hard Invariants Enforced
- **`INV-0.5`**: All monetary amounts in EGP must strictly use BigInt `Decimal` (`src/lib/erp/math.ts`). Banned: `parseFloat`, `Number(val)`, `Math.round`, native `/`.
- **`INV-4.1`**: Double-entry balance: $\Sigma \text{Debits} == \Sigma \text{Credits}$ to the exact piastre (0.00 Delta).
- **`INV-4.9`**: Cost escalation leaves Paid tranches untouched and increments `schedule_version`.
- **`INV-4.17`**: Handover Model B Net Recognition clears unearned advances (`203000`) and receivable (`103000`) to revenue (`401000`).
- **`INV-4.10`**: Rescission penalty is configurable; customer is liable for the full penalty even if paid < penalty.
- **`INV-14.B`**: 100% partner equity check and treasury cash availability verification before dividend payout.
- **`INV-FOUNDER-PERMANENCE`**: Founder permanence rule: Mr. Zakaria Farid must remain an active partner in every project building.
- **`INV-0.9`**: Closed accounting periods unconditionally reject new or mutating entries.
- **`INV-COST-ATOMIC`**: Atomic dual-write to journal entries and `erp_property_costs` for site expenses.
- **`INV-NO-SYNTHETIC-DATA`**: Zero hardcoded multipliers or static placeholder charts in executive dashboards.
- **`INV-NO-COGS-GUESSING`**: Block handover calculation if unit cost allocation is missing; no arbitrary defaults.
- **`INV-TRUE-LIQUID-CASH`**: Available cash reflects verified trial balance of accounts 101000 and 102000 net of all disbursements.

## Verification Command
```bash
npm test && npx tsc --noEmit
```
