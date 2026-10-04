# Project Spec: Zakaria Farid Real Estate ERP & Platform (v3.0.0)

## What This Is
Enterprise Real Estate Management & Financial Operating System (FIN-OS) for **Zakaria Farid Real Estate Development & Investment** (مؤسسة زكريا فريد للتطوير والاستثمار العقاري - منيا القمح، محافظة الشرقية).
The platform combines a public-facing property showcase with a comprehensive back-office ERP managing off-plan sales contracts, multi-year installment schedules, PDC cheques, statutory double-entry accounting (General Ledger & Chart of Accounts), project construction WIP expenses, partner/financier equity allocations, construction payables prioritization, and centralized operational notification alerts.

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

- **`erp_property_costs` (WIP & Payables)**: `[append-only / capitalized]`
  Construction site expenses, materials, municipal permits, and contractor claims capitalized into Account 150000 (WIP) or recorded as Accounts Payable (201000). Recovered across units via the RSV cost allocation engine and prioritized via 4-tier settlement queues.
  *Provenance*: `[code-evidence + confirmed]`.

- **`erp_partner_profiles` & `erp_partner_transactions`**: `[derived-computed / irreversible-distributions]`
  Project co-investor equity profiles enforcing exact 100% equity ratio per property. Profit payout distributions debit partner distributions (303000) and credit treasury only after verifying available cash balance.
  *Provenance*: `[code-evidence + confirmed]`.

- **`leads`**: `[mutable / least-privilege]`
  Prospective buyer inquiries and viewing bookings. Anon access strictly limited to `INSERT` only to prevent PII exposure.
  *Provenance*: `[code-evidence + confirmed]`.

- **`canonicalMetrics`**: `[derived-computed / single-source-of-truth]`
  Unified business metric module (`src/lib/erp/canonicalMetrics.ts`) providing authoritative calculations for `getAvailableCash` (accounts 101000/102000 net of all disbursements), `getPortfolioValuation` (active listings only), `getConstructionWIP` (approved net-of-adjustments WIP), and `getHandoverCOGS` (cost allocation engine without guessing).
  *Provenance*: `[code-evidence + confirmed]`.

- **`erp_notifications` & `notificationEngine`**: `[derived-computed / reactive]`
  Centralized system notification engine (`src/lib/erp/notificationEngine.ts`) synthesizing real-time operational alerts from PDC maturity, installment delinquency, contractor due dates, and treasury balance thresholds without unverified static state.
  *Provenance*: `[code-evidence + confirmed]`.

- **`Simulation & Ergonomics Registry`**: `[derived-computed / audit]`
  Automated journey simulation results, calculation stress audits, and UI ergonomics ranking records.
  *Provenance*: `[user-confirmed]`.

---

## Hard Invariants (Statutory, Accounting & Architectural Safety Rules)

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
6. **`INV-4.17`: Model B Handover Net Recognition** `[code-evidence + confirmed]`
   Full revenue is recognized upon physical apartment delivery and cleared from deferred revenue (`203000`). Pre-handover collections remain in deferred liabilities.
7. **`INV-14.B`: 100% Partner Equity & Cash-Gated Distributions** `[code-evidence + confirmed]`
   Partner equity allocations across a project must sum to exactly 100.00%. Profit distributions require positive verified cash balance in treasury (`101000`/`102000`) before posting.
8. **`INV-FOUNDER-PERMANENCE`: Mandatory Founder Equity Retention** `[code-evidence + confirmed]`
   Founder Zakaria Farid must remain an active partner in all project buildings; 100% internal buyout or complete substitution of the founder is unconditionally rejected.
9. **`INV-0.9`: Accounting Period Lock** `[code-evidence + confirmed]`
   Journal entries posted to closed accounting periods are unconditionally rejected.
10. **`INV-SIM`: Automated Workflow Audit & Ergonomics Ranking Protocol** `[user-confirmed]`
    Every major workflow must undergo automated simulated testing and ergonomics evaluation, categorizing user actions into: `Easy`, `Moderate/Hard`, `Incomprehensible`, `Erroneous`, or `Currently Impossible`.
11. **`INV-SEC-RLS`: Row-Level Security & Anon Isolation** `[code-evidence + confirmed]`
    All 16 core ERP tables must enforce PostgreSQL Row-Level Security with anon access completely revoked. Public anon access is restricted exclusively to `INSERT`-only on `public.leads` with strict server-side phone number validation. Service role key access is restricted strictly to server context.
12. **`INV-COST-ATOMIC`: Atomic Dual-Write for Site Expenses** `[near-miss-derived]`
    Logging an expense (via Quick Actions, vouchers, or direct entry) must write to both `erp_journal_entries` and `erp_property_costs` atomically in a single transaction; partial or orphaned writes are strictly prohibited.
13. **`INV-NO-SYNTHETIC-DATA`: Zero Fabricated Multipliers in Dashboards** `[near-miss-derived]`
    All dashboard KPIs, charts, period aggregations, and delta labels must derive from verified database queries; hardcoded multipliers (e.g. $\times 2.85$, $\times 11.4$) and static mock arrays are strictly banned.
14. **`INV-NO-COGS-GUESSING`: Handover Cost Allocation Mandatory** `[near-miss-derived]`
    Handover execution must strictly verify approved unit cost allocations before posting COGS; arbitrary fallback percentages (e.g. 45% default) are strictly blocked.
15. **`INV-TRUE-LIQUID-CASH`: Available Cash Derivation** `[near-miss-derived]`
    Available cash must reflect the verified trial balance of liquid accounts (`101000` Cash & `102000` Banks) net of all operating and capital outflows; gross collection sums are strictly prohibited from masquerading as cash.
16. **`INV-DUAL-TIER-DROPDOWN`: Dual-Tier Dropdown Architecture** `[user-confirmed]`
    Simple static filter dropdowns (period/project filters) remain native `<select>` elements styled with `.filterSelect` and design tokens; searchable and entity-picker dropdowns must use `ZFCustomSelect`.
17. **`INV-CURATED-PALETTES`: Curated Palette Customization** `[user-confirmed]`
    Theme customization is scoped to FIN-OS and restricted to 8 hand-precomputed enterprise presets (all $\ge 5.17:1$ WCAG AA contrast). Arbitrary/freeform color pickers are strictly prohibited.
18. **`INV-FINOS-DESIGN-SYSTEM`: FIN-OS ERP Strict Design System Invariants** `[code-evidence + confirmed]`
    All FIN-OS views (`src/app/fin-os/*`, `src/components/admin/erp/*`) must strictly adhere to the unified pure white triptych layout (`#ffffff !important;` panels on `#f1f5f9` slate canvas). Strictly bans tinted/pastel card fills (`bg-red-50`, `bg-emerald-50`). High-level metrics must render as 4 discrete floating white stat cards (`.discreteKpiCard`) with semantic Lucide squircles. Bounded navbar inside middle container only. Mandatory `tabular-nums` numeric formatting. Prohibition of `100vw` in RTL (`width: 100%; max-width: 100vw; min-width: 0;`). Zero fake static fallback data.
19. **`INV-AP-PRIORITY-SORT`: AP 4-Tier Deterministic Priority Sorting & Full-Row Inspection** `[code-evidence + confirmed]`
    Construction payables must deterministically rank claims into 4 operational tiers: Tier 1 (Overdue backlog), Tier 2 (Upcoming scheduled tranches), Tier 3 (Unscheduled claims), and Tier 4 (Settled/closed). Full-row click target (`.canonicalRow`) triggers inspection and tranche settlement via `ZFDrawerShell`; per-row repetitive action buttons and detached trampoline pickers are strictly prohibited.

---

## Catastrophic Failure Modes

- **Silent Currency Drift**: Floating point arithmetic causing fractional piastre variances, unbalancing the General Ledger.
- **Unbalanced Journal Commit**: Corrupting double-entry ledger balance via asymmetric line amounts.
- **Dropped Expense Capitalization**: Recording cash outflow without logging to `erp_property_costs`, distorting project feasibility.
- **Mutating Historical Payments**: Overwriting historical installment payment records when material costs rise.
- **Negative Refund Liability on Rescission**: Calculation errors generating inverted refund balances upon contract cancellation.
- **Unchecked Partner Over-Distribution**: Distributing profits exceeding available liquid cash reserves, bouncing operating checks.
- **Fabricated Cockpit Reporting**: Hardcoded multipliers misleading executive liquidity decisions.
- **Unprioritized Contractor Default**: Unscheduled or overdue contractor claims missed due to random sorting, leading to construction site halts.
- **Visual Design System Regression**: Banned pastel/tinted card washes or broken RTL scrollbar gutter pushes compromising enterprise ergonomics.

---

## Tech Stack & Tooling

- **Application Runtime**: Next.js 15 (App Router, Server Actions), React 19, TypeScript 5.
- **Styling & UI**: Tailwind CSS, Radix UI primitives, Lucide icons, Framer Motion, Sonner toasts (`ZFToaster`), ApexCharts wrapped via `ERPApexChart`.
- **Design System**: FIN-OS Executive Design System (v3.0) — Discrete floating white cards, 1px `#cbd5e1` / `#e2e8f0` borders, `#2563eb` primary accent, 8 curated contrast-safe presets, pure white triptych columns, `tabular-nums` numeric invariant.
- **Database & Auth**: Supabase PostgreSQL, `@supabase/ssr`, RLS policies, custom DDL migration triggers.
- **Numeric Engine**: BigInt-based fixed-point `Decimal` (`src/lib/erp/math.ts`).
- **Test Suite**: Node.js test runner via `npx tsx --test src/lib/erp/__tests__/**/*.test.ts` (`npm test`: 244 tests across 66 suites).
- **Typechecker**: `npx tsc --noEmit`.
- **AST Knowledge Graph**: `graphify` (AST-derived knowledge graph at `Real-Estate-Platform/graphify-out/`).
- **Platform**: Cloudflare Workers / OpenNext (`@opennextjs/cloudflare`).

---

## Repeating Change Categories (Tracks)

1. **`WORKFLOW_AUDIT`**: End-to-end user journey simulation, branching stress-tests, UX fluidity & ergonomics ranking.
2. **`FINANCIAL_CORE`**: Double-entry ledger, fixed-point math, statutory recognition, accounting invariants, canonical metrics, notification engine, contractor payables priority engine.
3. **`SURFACE_UI`**: FIN-OS workstation views, public property catalog, responsive styling, RTL localization, shared primitives (`ZFModalShell`, `ZFDrawerShell`, `ZFSearchBar`, `ZFCustomSelect`, `ZFToaster`, `ERPApexChart`).
4. **`DATABASE_SCHEMA`**: Supabase migrations, RLS policies, trigger immutability, performance indexes.

---

## Deferred / Future Scope

- **Admin Shell Redesign**: The administrative shell chrome (`src/components/admin/AdminSidebar.tsx` and `AdminUniversalHeader.tsx`) is explicitly deferred pending a dedicated independent design review; `SURFACE_UI` must not modify the Admin shell.
- **Operational Modal Deduplication**: Consolidation of parallel modal implementations (`CashCollectionReceiptModal` vs `HandCollectionModal`, and `PartnerOperationsModal` vs standalone modals) is reserved for a future gated work order.
- **Installment Revenue Recognition Migration**: Gradual transition from Model B Handover Recognition to installment-proportional revenue recognition is queued for future financial core iteration.

## Decisions — 2026-10-04 (E2E P1 round)
- [user-confirmed] Public website demo/fallback listings (`FALLBACK_PROPERTIES`) are removed; empty DB shows honest empty states.
- [user-confirmed] Contract rescission penalty is user-adjustable per rescission (default 10%), not hardcoded.
- [user-confirmed] Taxes (incl. 2.5% disposal tax) are entered and recorded manually by the user; no automatic tax generation.
- [user-confirmed] Accounting basis is unified cash-basis: GL is the single source of truth for financial figures; schedule-based dues are shown as off-ledger "scheduled collections", never as accrual receivables.
- [user-confirmed] Tax remittance goes through the accrued disposition tax liability (204000): recording a tax accrues it to 204000; remitting clears 204000 against cash.
- [user-confirmed] Accounting periods are created automatically for any new year/month as needed; the user can also manually close a fiscal year.
- [user-confirmed] There are NO cheques. Payments are either direct cash or InstaPay transfer. Money is recorded only when actually received (no post-dated cheque records, no auto-generated PDCs).
- [user-confirmed] The down payment is NOT auto-collected when a contract is created; it stays pending until actually received and recorded.
