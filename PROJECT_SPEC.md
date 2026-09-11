# Project Spec: Zakaria Farid Real Estate ERP & Platform (v2.0.0)

## What This Is
Enterprise Real Estate Management & Financial Operating System (FIN-OS) for **Zakaria Farid Real Estate Development & Investment** (مؤسسة زكريا فريد للتطوير والاستثمار العقاري - منيا القمح، محافظة الشرقية).
The platform combines a public-facing property showcase with a comprehensive back-office ERP managing off-plan sales contracts, multi-year installment schedules, PDC cheques, statutory double-entry accounting (General Ledger & Chart of Accounts), project construction WIP expenses, and partner/financier equity allocations.

---

## Core Entities & Classifications

- **`erp_journal_entries` & `erp_journal_lines`**: `[append-only]`
  Double-entry immutable records. Every entry enforces $\Sigma \text{Debits} == \Sigma \text{Credits}$ to the exact piastre (0.00 Delta). No financial rows may be updated or deleted once posted.
  *Provenance*: `[code-evidence + confirmed]`.

- **`erp_installment_schedules`**: `[append-only / versioned]`
  Schedule tranches for contract installments. Enforces column-level immutability triggers (financial columns locked, direct DELETE prohibited). Cost escalation increments `schedule_version` and marks unpaid tranches as `SUPERSEDED`, while paid tranches remain strictly locked.
  *Provenance*: `[code-evidence + confirmed]`.

- **`erp_contracts`**: `[irreversible-if-wrong / state-machine]`
  Sales contracts between the developer and buyers. Governs unit allocation, pricing, down payment, installment plan, delivery status, escalation adjustments, and rescissions.
  *Provenance*: `[code-evidence + confirmed]`.

- **`erp_pdc_records`**: `[irreversible-if-wrong / status-transition-only]`
  Post-Dated Cheques and receipts tracking installments through physical safe custody, bank deposit, clearance, or bounce reversal.
  *Provenance*: `[code-evidence + confirmed]`.

- **`properties` & `units`**: `[mutable / catalog]`
  Residential and commercial buildings, apartment floorplans, square meter areas, pricing, completion progress (POC), and sales statuses (`available`, `reserved`, `sold`).
  *Provenance*: `[code-evidence + confirmed]`.

- **`erp_property_costs` (WIP)**: `[append-only / capitalized]`
  Construction site expenses, materials, municipal permits, and engineering fees capitalized into Account 150000 (WIP) and recovered across units via the RSV cost allocation engine.
  *Provenance*: `[code-evidence + confirmed]`.

- **`erp_partner_profiles` & `erp_partner_transactions`**: `[derived-computed / irreversible-distributions]`
  Project co-investor equity profiles enforcing exact 100% equity ratio per property. Profit payout distributions debit partner distributions (303000) and credit treasury only after verifying available cash balance.
  *Provenance*: `[code-evidence + confirmed]`.

- **`leads`**: `[mutable / least-privilege]`
  Prospective buyer inquiries and viewing bookings. Anon access strictly limited to `INSERT` only to prevent PII exposure.
  *Provenance*: `[code-evidence + confirmed]`.

- **`Simulation & Ergonomics Registry`**: `[derived-computed / audit]`
  Automated journey simulation results, calculation stress audits, and UI ergonomics ranking records.
  *Provenance*: `[user-confirmed]`.

---

## Hard Invariants (Statutory & Accounting Safety Rules)

1. **`INV-0.5`: Zero Floating-Point Currency Math** `[code-evidence + confirmed]`
   All currency computations (EGP/piastres) must strictly use integer-scaled BigInt `Decimal` (`src/lib/erp/math.ts`). Floating point operations (`parseFloat`, `Number(val)`, `Math.round`, raw `/`) on monetary amounts are strictly prohibited.
2. **`INV-4.1`: Double-Entry Journal Balance** `[code-evidence + confirmed]`
   Every journal entry must satisfy $\Sigma \text{Debits} == \Sigma \text{Credits}$ to the exact cent/piastre. Unbalanced entries are rejected at the domain engine and database level.
3. **`INV-0.6`: Schedule Immutability Trigger Contract** `[code-evidence + confirmed]`
   Direct `DELETE` on installment schedules is unconditionally blocked at the database trigger level. Core financial columns (`nominal_value`, `due_date`, `tranche_number`, `contract_id`) are permanently immutable.
4. **`INV-4.9`: Paid Tranches Untouched During Escalation** `[code-evidence + confirmed]`
   Cost escalation increments `schedule_version` and marks only unpaid tranches as `SUPERSEDED`. Paid and partially-paid tranches remain completely immutable.
5. **`INV-4.10`: Configurable Rescission Penalty & Forfeiture Floor** `[user-confirmed]`
   Rescission forfeiture floor ensures retained penalty cannot exceed cash actually collected (`minDecimal(penaltyUncapped, C)`), guaranteeing refund liability is never negative. The penalty rate is configurable by the Admin (default 10%).
6. **`INV-14.B`: 100% Partner Equity & Cash-Gated Distributions** `[code-evidence + confirmed]`
   Partner equity allocations across a project must sum to exactly 100.00%. Profit distributions require positive verified cash balance in treasury (`101000`/`102000`) before posting.
7. **`INV-0.9`: Accounting Period Lock** `[code-evidence + confirmed]`
   Journal entries posted to closed accounting periods are unconditionally rejected.
8. **`INV-SIM`: Automated Workflow Audit & Ergonomics Ranking Protocol** `[user-confirmed]`
   Every major workflow must undergo automated simulated testing and ergonomics evaluation, categorizing user actions into: `Easy`, `Moderate/Hard`, `Incomprehensible`, `Erroneous`, or `Currently Impossible`.

---

## Accounting Treatment & Business Evolution Note

- **Revenue Recognition (Installment-Based Proportional Recognition)** `[user-confirmed]`:
  The business owner explicitly requires that profits and revenues appear gradually with each installment collected across the contract lifecycle rather than freezing 100% of profit recognition until physical apartment handover. (The codebase currently contains Model B Handover Net Recognition logic in `contracts.ts` and `rescission.ts`, which is slated for gradual installment-method adaptation under the `FINANCIAL_CORE` track).

---

## Catastrophic Failure Modes

- **Silent Currency Drift**: Floating point arithmetic causing fractional piastre variances, unbalancing the General Ledger.
- **Premature / Distorted Profit Calculations**: Inaccurate installment revenue calculations leading to tax reporting discrepancies.
- **Mutating Historical Payments**: Overwriting historical installment payment records when material costs rise.
- **Negative Refund Liability on Rescission**: Calculation errors generating inverted refund balances upon contract cancellation.
- **Unchecked Partner Over-Distribution**: Distributing profits exceeding available liquid cash reserves, bouncing operating checks.
- **Broken User Journeys & Dead Ends**: Form submission failures, obscure error messages, or broken API links preventing users from finishing critical tasks.

---

## Tech Stack & Tooling

- **Application Runtime**: Next.js 16.3.0 (App Router), React 19.2.8, TypeScript 5.
- **Styling & UI**: Tailwind CSS, Radix UI primitives, Lucide icons, Framer Motion.
- **Database & Auth**: Supabase PostgreSQL, `@supabase/ssr`, RLS policies, custom DDL migration triggers.
- **Numeric Engine**: BigInt-based fixed-point `Decimal` (`src/lib/erp/math.ts`).
- **Test Suite**: Node.js test runner via `npx tsx --test src/lib/erp/__tests__/**/*.test.ts` (`npm test`).
- **Typechecker**: `npx tsc --noEmit`.
- **Platform**: Cloudflare Workers / OpenNext (`@opennextjs/cloudflare`).

---

## Repeating Change Categories (Tracks)

1. **`WORKFLOW_AUDIT`**: End-to-end user journey simulation, branching stress-tests, UX fluidity & ergonomics ranking.
2. **`FINANCIAL_CORE`**: Double-entry ledger, fixed-point math, statutory recognition, accounting invariants, calculation bug fixes.
3. **`SURFACE_UI`**: UI bug fixes, responsive Alabaster styling, Arabic RTL terminology, modal post-submission flows.
4. **`DATABASE_SCHEMA`**: Supabase migrations, RLS policies, trigger immutability, performance indexes.
