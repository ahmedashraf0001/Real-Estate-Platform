---
name: financial-core
description: >-
  Work-routing track for statutory double-entry accounting, fixed-point math,
  revenue recognition, and financial invariant enforcement in Zakaria Farid Real Estate ERP.
  Enforces dual-gated verification before and after modifications.
---

# Track: FINANCIAL_CORE (Mathematical Engine & Statutory Accounting)

## Assigned Role: Financial Calculation Engineer
- **Model Tier**: `pro`
- **Scoping**: Edit domain logic in `src/lib/erp/`, execute verification suite `npm test` and `npx tsc --noEmit`.

## Hard Invariants Enforced
- **`INV-0.5`**: All monetary amounts in EGP must strictly use BigInt `Decimal` (`src/lib/erp/math.ts`). Banned: `parseFloat`, `Number(val)`, `Math.round`, native `/`.
- **`INV-4.1`**: Double-entry balance: $\Sigma \text{Debits} == \Sigma \text{Credits}$ to the exact piastre (0.00 Delta).
- **`INV-4.9`**: Cost escalation leaves Paid tranches untouched and increments `schedule_version`.
- **`INV-4.17`**: Handover Model B Net Recognition clears unearned advances (`203000`) and receivable (`103000`) to revenue (`401000`).
- **`INV-4.10`**: Rescission penalty is configurable; customer is liable for the full penalty even if paid < penalty.
- **`INV-14.B`**: 100% partner equity check and treasury cash availability verification before dividend payout.
- **`INV-0.9`**: Closed accounting periods unconditionally reject new or mutating entries.

## Verification Command
```bash
npm test && npx tsc --noEmit
```
