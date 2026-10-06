---
name: erp-partner-payout-pricing
description: Implements the FIN-OS partner payout rules (per-project share, automatic capital-debt offset, ready-to-distribute alert) and final pricing for under-construction properties. Use when touching partner payouts, partner capital commitments, profit distribution, the calculator's price save, or property price history.
---

# Partner payouts and final pricing

The rules are in `PROJECT_SPEC.md` → "Partner payouts and final pricing (2026-10-06)". That section is the source of truth; this skill is the *how*. Paths below are relative to `zakaria-farid/src/`.

## Ground rules

- **Edit in place with minimal hunks.** Keep every existing export, the existing modal layout and the existing page design (the user rejected a UI redesign). A diff of hundreds of lines in `ERPWorkstationContext.tsx` for this work means something went wrong.
- Money math uses `D()` from `lib/erp/math.ts`; ratios via `.timesRatio(pct, 100)`; round once with `.toFixed(2)`.
- Accounts: 303000 partner distributions, 301000 partner capital, 101000 safe (cash), 102000 InstaPay. Journal entries go into the period containing their date (`resolveAndEnsurePeriodForDate`).
- Reference implementation (logic is right, UI parts were rejected): branch `feat/erp-partner-payout-offset`, commits `40cbcfd` (payout + offset), `df9b9b3` (ready-to-distribute), `f26632b` (final price). Reuse the engine and handler code; leave its page/modal restyling out.

## 1. Payout position (engine, pure)

In `lib/erp/partnersEngine.ts`, add next to the existing helpers:

- `isSamePartner(recorded, partnerName)`: founder name variants match `PRIMARY_DEVELOPER_NAME` via `includes`; others by exact trimmed name.
- `resolvePartnerSharePct(property, partnerName)`: share from `partner_splits` (non-archived); the founder gets 100 − the others.
- `partnerCollectionsShareOnProperty(property, partnerName, contracts)`: live (non-`Rescinded`) contracts matched on `property_id || unit_id`, honouring contract-level `partner_splits` (`cash_share`, else `share_percentage` × `total_cash_collected`).
- `computeProjectPayoutPosition({ partnerName, property, contracts, transactions, commitments })` returns:
  - `collectionsShare`
  - `paidOut`: `PROFIT_DISTRIBUTION` + `CAPITAL_RETURN` for this property only
  - `commitmentDebt`: Σ(committed − paid) of non-`CANCELLED`/`PAID` commitments for this partner and property
  - `grossAvailable = collectionsShare − paidOut`
  - `offsetNow = min(max(grossAvailable, 0), commitmentDebt)`
  - `cashAvailable = max(grossAvailable, 0) − offsetNow`
  - `debtAfter = commitmentDebt − offsetNow`
  - `offsetAllocations[]`: per commitment, oldest `due_date` first

Also fix `getProjectPartnershipCards`: payouts count only when `t.property_id === prop.id` (an unassigned payout must not count against every project).

## 2. Journal entry

Extend `PartnersEngine.createPayoutJournalEntry` with optional `debtOffsetAmount`. Lines: Dr 303000 = cash + offset; Cr 301000 = offset (when > 0); Cr 101000/102000 = cash (when > 0). One balanced entry.

## 3. Payout handler

`handleConfirmPartnerPayout` in `components/admin/erp/context/ERPWorkstationContext.tsx`:

1. Require `propertyId`; recompute the position from current state, never trust the modal's numbers.
2. Refuse when cash and offset are both 0, or when debt exists and cash > `cashAvailable`. Check the cash account balance against the cash part only.
3. Post the entry, then persist partner transactions:
   - cash part: `PROFIT_DISTRIBUTION`, routing 101000/102000;
   - offset part: one `PROFIT_DISTRIBUTION` with `payment_method: 'DEBT_OFFSET'`, plus one `CAPITAL_INJECTION` per allocation with its `commitment_id`, routing `'DEBT_OFFSET'`. `ERPSupabaseService.persistPartnerTransaction` then raises the commitment's `paid_amount`/status itself.
4. Update local `partnerTransactions`, `journalEntries` and `partnerCommitments`; return `true`. On failure toast the error and return `false`.

Supporting edits: add `'DEBT_OFFSET'` to `ERPPartnerTransaction.payment_method`; map `routing_account === 'DEBT_OFFSET'` back in `loadPartnerTransactions`; label it "خصم من الأرباح" wherever payment methods are shown.

## 4. Payout modal

Keep `v2/modals/PartnerPayoutModal.tsx`'s look. Functional changes only:
- Project is required (drop "توزيع عام"); list the partner's projects.
- Facts come from `computeProjectPayoutPosition`: share, paid before, capital debt, available in cash.
- Amount = cash. Show the offset and any `debtAfter` as `ZFEffect` notes; block cash above `cashAvailable` when debt exists.
- Close only when `onConfirmPayout` resolves to something other than `false`. Mount the modal only while open (`{show && <PartnerPayoutModal …/>}`) so each opening starts clean.

## 5. Ready-to-distribute alert

`getDistributionReadyProjects({ properties, contracts, transactions, commitments })`: a property qualifies when it has live contracts, Σ`total_cash_collected` ≥ Σ`gross_contract_value` > 0, it is sold (`listing_status === 'sold'` or every `building_units[].status === 'contracted'`), and at least one partner has `grossAvailable > 0`. Show it on the partners page in the existing style, with a per-partner "صرف" that opens the payout modal locked to partner + property (`setPayoutInitialPropertyId`).

## 6. Final price (off_plan only)

The database side is **already applied** (migration `supabase/migrations/20261006090000_property_price_history.sql`, on the reference branch):
- `properties.construction_completed_at`, `properties.price_finalized_at`
- `erp_property_price_history` (stage `initial` | `revised` | `final`), an AFTER INSERT trigger that logs the initial price, and the backfill.
- RPC `record_property_price(p_property_id, p_price_egp, p_finalize, p_unit_prices jsonb, p_cost_basis_egp, p_note)`. With `p_finalize`: off_plan only, once; sets `completion_status = 'ready'`, both timestamps, reprices `available` units from `p_unit_prices`, and logs a `final` row.

Code side:
- Replace `ERPSupabaseService.updatePropertySellingPrice` (it swallows errors) with `recordPropertyPrice`, which throws; the handler shows an error toast and returns `false`, never a false success.
- In the calculator, an off_plan property without `price_finalized_at` shows its price as "السعر المبدئي" and gets a "إنهاء الإنشاء واعتماد السعر النهائي" action behind a confirm (actual cost, initial price, final price, units affected). Block it when no cost is recorded. Unit prices: `priceUnitsAtRate(units, chosenPerSqm)` for `available` units only.

## Done when

- `cd zakaria-farid && npx tsc --noEmit` is clean.
- Engine tests (node:test, `npx tsx --test src/lib/erp/__tests__/<file>.test.ts`) cover: share > debt, share < debt (leftover stays), no debt, two commitments oldest-first, other projects ignored, earlier offsets counted as paid out, founder remainder share, entry balanced in all three shapes, and ready / not-ready projects. The reference branch has these in `partnerPayoutOffset.test.ts`.
- `npm test` shows no new failures. The baseline has 7 old failures (construction mock data, COA mapping, cockpit sparkline/agenda, vault view).
- The UI looks the same as before apart from the fields these rules need.
