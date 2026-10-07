# Handoff: partner payouts, debt offset, final pricing (2026-10-07)

Branch `feat/erp-partner-logic` (repo root `Real-Estate-Platform`, app in `zakaria-farid/`), cut from `fix/property-slug-decode` @ `8abee52`. **Nothing pushed, no PR.**

## Read first
- Rules (source of truth): `PROJECT_SPEC.md` → "Partner payouts and final pricing (2026-10-06)".
- How-to: `zakaria-farid/.claude/skills/erp-partner-payout-pricing/SKILL.md` (pointer in root `AGENTS.md` §7).
- Memory `erp-ui-redesign-rejected`: **keep the existing FIN-OS layout and style.** Change UI only where a feature needs it. Approve any page, widget or button removal item by item.

## Commits on this branch
| Commit | What |
|---|---|
| `9df51cd` | Rules + skill + AGENTS.md pointer |
| `37c3551` | Stage 1: payout is per project; unpaid commitments are offset first (Dr 303000 / Cr 301000, `DEBT_OFFSET` partner transactions, commitment `paid_amount` raised oldest-first); modal resets on open and stays open on failure; card payouts scoped to their project |
| `1d77992` | Stage 2: `getDistributionReadyProjects` + `DistributionReadyPanel` at the top of the partners page (sold + fully collected) |
| `9deb79f` | Stage 3: `record_property_price` RPC flow, price history, calculator "إنهاء الإنشاء واعتماد السعر النهائي" for off_plan, no more silent save failures |
| `5c61322` | Recorded property cost is net of cost adjustments everywhere |
| `14b9bf5` | Mobile: phone drawer closes on pick; wizard step labels (cherry-picked by user from `7369676`) |
| `c1eb234` | Collections share = collected cash × split % (contracts store `cash_share` 0.00, so it was always 0) |
| `c494766` | Side rail alert = unpaid capital commitments only (user-confirmed) |
| `999a962` | Calculator marks units with a live contract as contracted (placeholder units are all "available") |
| `TBD` | fin-b1-cost-journals + fin-b1b-audit-fixes: balanced journals for cost edits/adjustments/deletes; reject refunds > net cost, retain current adjustments/installments/paid amounts, allow clearing editable optional fields, reject any changed adjustment history; R2 ordering/rollback/validation covered; reviewer: tsc 0, 20/20 targeted tests, npm test 785 total / 778 pass / 7 baseline fail (exit 1) |
| `TBD` | fin-b2-units-persist: persist returned-id building units; retain same-count edits and reject contracted rebuilds; exact legacy odd counts; shared contracts query/normalization; block pending/failed lead wizard before first effect; localized unit labels; reviewer takeover after agy fix1, 22/22 task tests, tsc exit 0, npm test exit 1 (808 total / 801 pass / 7 baseline fail), 14 viewed fixture screenshots at 1280/390; no live DB mutation or commit |
| `TBD` | fin-b2b-audit-fixes: stored-row edit guard and ignored client unit fields; reject contracted type changes; normalize legacy contract labels; retain last-unit piastres; agy fix1 restores listing-versus-contract metrics and removes duplicate availability exports; reviewer PASS, no takeover, 28/28 task tests, tsc exit 0, npm test exit 1 (814 total / 807 pass / 7 exact baseline fail); no UI changes, DB access or commit |

| `TBD` | fin-b4-price-basis: full project sales value versus net adjusted cost; live contract-value portfolio sales; whole-building card price; reviewer takeover after stopped agy fix1, 5/5 task tests, build exit 0, tsc exit 0, npm test exit 1 (821 total / 814 pass / 7 exact baseline fail), 10 viewed fixture screenshots at 1280/390; no commit |

| `TBD` | ui-small-fixes: mobile wizard controls, inline map-pin error, exact first-paint KPIs, deduplicated payables, localized phase, local installment dates, distinct partner total, commitment quick action; reviewer implemented directly, 2/2 task tests, build exit 0, tsc exit 0, npm test exit 1 (825 total / 818 pass / 7 exact baseline fail), 8 viewed fixture screenshots at 1280/390; no DB access or commit |
| `TBD` | fin-b9-floors-include-ground: ground floor excluded from saved units, residential floors clamped 1–14, edit hydration adds ground back; reviewer PASS, 0 agy fix rounds, no takeover, 4/4 task tests, build exit 0, tsc exit 0, npm test exit 1 (829 total / 822 pass / 7 exact baseline fail); protected UI screenshots and live DB manual check unverified; no commit |

## Verified on the real DB (2026-10-07, real session)
- Ready panel: both partners show 1,041,666.50 on the Gouna building.
- Final price: building is now `ready` at 12,499,900. A `final` history row was written with cost 4,900,000. The contract is unchanged. `units_repriced` = 0 because building units are not stored (`building_units = []`); the app builds 6 placeholder units in `supabaseService.ts`.
- Payout: not posted yet. The auto-mode classifier blocked the confirm click; the user has to click it.
- Known small issue: the default final price is round(price/area) × area = 12,499,900, so 100 EGP is lost to rounding.

Key code: `src/lib/erp/partnersEngine.ts` (`computeProjectPayoutPosition`, `getDistributionReadyProjects`, `createPayoutJournalEntry` with `debtOffsetAmount`), `handleConfirmPartnerPayout` / `handleUpdatePropertySellingPrice` in `components/admin/erp/context/ERPWorkstationContext.tsx`, tests `src/lib/erp/__tests__/partnerPayoutOffset.test.ts`.

## State
- **DB:** migration `supabase/migrations/20261006090000_property_price_history.sql` is **already applied** to Supabase by the user. Do not re-apply it.
- **Gates (passing):** `cd zakaria-farid && npx tsc --noEmit` is clean. `npm test` = 761 tests, 754 pass / 7 fail. All 7 failures are pre-existing (construction mock data, COA mapping, cockpit sparkline/agenda, vault view, side-widgets contract).
- **Not verified with real data:** the in-app browser had no login (dev bypass; RLS returns 401, so every figure showed 0). No real payout or final price was recorded. The ready-to-distribute panel is covered by tests only.

## Rejected / parked (do not redo without asking)
- Branch `feat/erp-partner-payout-offset`: the same 3 stages plus page merges (rescissions/allocation/tax into tabs, analysis removed), de-bloat and restyling (`83c2e10`…`7369676`). The user rejected the UI part. Kept for reference only.
- `git stash@{0}` `gemini-wo1-rejected-2026-10-06`: Gemini's stale-snapshot rewrite. It reverted user-confirmed fixes (45% WIP ratio, founder-only arrears, InstaPay on 101000) and broke the build. Lesson L22 in `~/.claude/skills/agy-lessons/SKILL.md`. Drop it once no longer needed.

## Next steps
1. User decides: push `feat/erp-partner-logic` + PR (base is probably `main` or `fix/property-slug-decode`; ask).
2. Verify end to end with a logged-in session:
   - Off-plan building with recorded costs → finalize → available units repriced, contracted ones unchanged, a `final` history row written.
   - Partner with a commitment + a fully collected sold project → banner appears → payout posts one balanced entry, and the commitment shows PAID or PARTIALLY_PAID.
3. Open items:
   - ~~The calculator cost basis ignores cost adjustments.~~ Done in `5c61322`: `calculatePropertyAuditMetrics` now uses the net cost after adjustments everywhere (user-confirmed 2026-10-07).
   - The partners side rail still shows the share-based "arrears" (2026-10-05 rule) next to the commitment debt used for offsets. Ask the user whether to keep both numbers.
4. After any commit: `bash .agents/scripts/sync_graph.sh`.

## Small mobile bugs found (fixed only on the rejected branch, in `7369676`)
- `ZFNavigationDock.tsx`: picking a "طلب جديد" menu item leaves the phone drawer open over the form; the drawer also opens icon-only when the desktop sidebar is collapsed.
- `NewContractWizardModal.module.css`: step labels overlap at 375px.

These are bug fixes, not a redesign. Offer to bring them over separately.
