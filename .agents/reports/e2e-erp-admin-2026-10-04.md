# E2E report: ERP + Admin, 2026-10-04

Setup: database emptied except the chart of accounts (29), accounting periods (12) and 2 admin logins. Backup at `.agents/db-backups/public-2026-10-04.json`. Run against the local dev server, logged in as admin, in English.

**Journeys run:** list a property → sign a sales contract → collect a partial installment → record an expense → check the ledger → public visitor inquiry → admin dashboard and CRM → rescind the contract.

**Already fixed on `fix/erp-remove-mock-fallbacks` (`d12563b`):** the ERP showed fake data whenever the DB was empty, and wrote fake rows back into it on every load. After the fix the cockpit reads 0 on an empty DB and nothing gets re-seeded.

---

## P0: money and data integrity

1. **A partial payment wipes out the rest of the installment.** I collected 300,000 of a 637,500 tranche. The tranche became `Paid`, its cheque `Cleared`, and the remaining 337,500 disappeared from receivables. The ledger posted 300k correctly, so the books and the schedule now disagree.
   - Seen in: cockpit Due Collections = 3,187,500, which should be 3,525,000.
   - The contract inspection panel shows "#1 637,500 Paid" next to "payment history 300,000".
   - The collection modal never says the payment is partial or how much stays outstanding.
2. **"Remaining" has two values.** The contracts registry and the inspection panel say 3,525,000 (gross minus collected). The cockpit and the collections agenda say 3,187,500 (from the schedule). Users will see different balances for the same contract.
3. **The installment-count selector doesn't drive the schedule.** The dropdown shows "4 Tranches" (options 4/8/12/16/20/24), but the preview and the saved contract both have 6 tranches. What the user selects isn't what gets saved.
4. **Cheques are created that the buyer never handed over.** On signing, 6 cheques are created as "In Safe" for every tranche. The plan says hand or cash collection, and the agenda shows "Cash in Hand". Cheque counts and treasury figures are inflated.
5. **Tranche 0 is marked Paid and posted to the Safe the moment the contract is executed.** There's no step to confirm the down payment was actually received.
6. **Three popups crash** with a React rules-of-hooks error. Each has a hook after an early `return null`:
   - `HandoverExecutionModal.tsx:134/137`: confirmed in the browser. Opening "Handover actions" shows the Next.js error overlay.
   - `CashCollectionReceiptModal.tsx:59/71`
   - `CostAdjustmentModal.tsx:53/57`
   - eslint `react-hooks/rules-of-hooks` flags these, but the repo has hundreds of lint errors, so nobody notices. Lint isn't a gate.
7. **The expense wizard resets itself mid-entry.** In `ZFDirectExpenseModal.tsx:131-141`, the reset-on-open effect depends on `underConstructionProperties`. Every background or realtime refresh creates a new array, so the wizard jumps back to step 1 within seconds and typed values vanish. `NewContractWizardModal.tsx:226` has the same risk (it depends on `applyPropertySelection`).
8. **Hardcoded fake data is still left in cockpit widgets:**
   - `CockpitView.tsx:856-888`: fake contractor payouts "Nile Contracting CON-114 780k" and "Al Ahram CON-089 1.25M" when there are no costs. These contradict the "Upcoming Payables 0" card.
   - `CockpitDualCharts.tsx:79-128`: Sales vs Capital Cost uses 6 invented projects (Lagoon View 95M, …), and the cash-flow forecast shows +223M / −135M.
   - Admin dashboard advisory: "Ras El Hekma +103.5% 5-year gain" appears with no data behind it.
   - Public site (home, catalog, map, property detail, `queries.ts`) still shows `FALLBACK_PROPERTIES` when the DB is empty. **Needs your decision.**

## P1: workflow and logic gaps

9. **A rescission creates a 525k refund liability (206200) but there's no way to pay it.** The page says "Due for refund" and stops there.
10. **After a rescission the buyer's CRM lead stays `closed_won`.**
11. **The 10% rescission penalty is fixed in code.** This is a legal and business term, so it should be configurable per contract. Needs your decision.
12. **No sales tax record is created at contract signing.** It used to be auto-generated on read, which I removed as fake data. Decide whether the 2.5% disposal tax should be created when the contract is signed.
13. **Receivables never reach the GL.** 103000 shows 0 with 3.5M outstanding. The books are effectively cash-basis (Dr Safe / Cr Deferred Revenue), while dashboards show accrual-style "due". This is a design decision, not a bug, but the ledger and the KPIs measure different things.
14. **The buyer's phone is dropped.** It's entered in the contract wizard, appears on the auto-created CRM lead, but shows "—" in the contract inspection.
15. **A sold unit still shows "Inquire for Acquisition"** on its public page.
16. **ERP Project Status says "Completed · 0/1 units contracted · 100% construction"** for a unit with an active contract and no construction data.
17. **A property can be published with no map pin** (latitude/longitude null) **and no photos.** It then can't appear on the public map.
18. **The floor-plan wizard ignores the declared area.** Declared 180 m², generated 82 m². It warns "98 m² unaccounted" but doesn't scale the rooms.
19. **After publishing, the publish footer stays active,** so a second click could create a duplicate listing.
20. **The admin type filter (Villas/Townhouses/Duplexes/Chalets) doesn't match the data model** (apartment/building/garage).
21. **The contract unit picker groups a Zamalek unit under "New Cairo & Fifth Settlement Projects".** The region grouping is wrong or hardcoded.
22. **The collections agenda's "Net Projected Flow" shows 4.5M,** the gross contract value. It should be the remaining receivables minus payables.
23. **The cockpit calendar opens on September 2026 (today is 4 Oct).** "View all upcoming dues (10)" when only 5 are pending.
24. **Admin "Response SLA 100%, all handled <12h"** while a new, untouched lead exists.
25. **The chart of accounts shows 34 accounts; the DB has 29.** Five are injected from code. Account 103300 is labelled "(Retired)" but marked Active. The CoA "Total" row adds debit and credit balances together (1.95M).
26. **The ledger groups the receipt entry under "Other"** instead of sales or collections.

## P2: UX, copy, i18n

27. **`/fin-os/en/*` renders `<html lang="ar" dir="rtl">`** (`src/app/fin-os/layout.tsx:30-31`). English pages come out mirrored (":Collection rate", right-aligned headers).
28. **English UI shows Arabic content:** the unit title in the contract summary, the amount-in-words, and duplicated currency ("4,500,000.00 EGP ج.م").
29. **An empty contracts registry says "No matching contracts — try changing filters"** instead of offering to create the first contract.
30. **Step 3 has two different entry UIs for the same choice:** a "Blueprint setup" prompt modal and an in-canvas onboarding.
31. **"Living & Reception — 2 Rooms" counts the corridor as a reception room.**
32. **The contract preview's due dates drift by a day** (07-03, 10-03); the saved dates are correct.
33. **Every ERP table is fetched 2–4 times per page load** (seen in network timing).
34. **Header button reads "+ + New Property".** On mobile the closed sidebar sticks out about 35px.

## Not covered this round
Partners and capital injection, construction payables and contractor payment end to end, purchase orders, tax remittance, period close, a building with multiple units, the Arabic locale pass, photo upload (the browser tool can't attach files).

## Test data left in DB
1 property (active again after the rescission), 1 rescinded contract with its schedules, cheques, journal entries and rescission record, and 2 leads. I can wipe it again on request.
