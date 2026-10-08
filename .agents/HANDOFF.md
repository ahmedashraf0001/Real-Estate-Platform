# Handoff: 2026-10-07 (partner payouts + admin-lifecycle audit fixes, PR open)

## State
- Branch `feat/erp-partner-logic`, pushed. PR into `main`: https://github.com/ahmedashraf0001/Real-Estate-Platform/pull/12. It is bound to the Code session, and CI was pending at bind time.
- The branch was cut from `fix/property-slug-decode` @ `8abee52`, which is NOT merged into `main`. The PR therefore also carries that branch's 67 commits.
- The repo root is `Real-Estate-Platform`; the app is in `zakaria-farid/`. The Supabase project ref is `lybkeycbiposjkjkyjlh` (not production; testing on the real DB is allowed).
- Gates at head `7175234`: `cd zakaria-farid && npx tsc --noEmit` is clean. `npm test`: 825 tests, 818 pass, 7 fail. The 7 failures are pre-existing:
  - constructionModernization:85
  - constructionPayablesRedesign:18 and :117 (mock data)
  - generalLedgerView:231 (COA 604000)
  - handInstallmentsVaultTableContracts:175
  - sideWidgetsDesignContract:191 and :786

### Commits this session (on top of 9df51cd/37c3551/1d77992/9deb79f)
| Commit | What |
|---|---|
| `5c61322` | Recorded property cost is net of cost adjustments everywhere |
| `14b9bf5` | Phone drawer and wizard steps (cherry-picked by the user) |
| `c1eb234` | Partner collections share = collected cash × split % (`cash_share` is always 0.00 in contracts) |
| `c494766` | Partners side rail shows unpaid capital commitments only |
| `999a962` | Calculator treats units with a live contract as contracted |
| `0da87eb`, `3bc3bca` | Docs: audit report and the user-confirmed journal rules |
| `ff0ac03` | Cost edit/adjustment/delete post ledger corrections, with rollback and stale-data guards |
| `cc1edfc` | Real building units are saved; one shared contract query for both wizards; guarded unit rebuilds |
| `f889ee4` | `calculateProjectSalesValue`: KPIs compare full sales value with net cost |
| `7175234` | Small UI fixes, plus the "التزام رأس مال جديد" rail button |

### Verified on the real DB
- Ready-to-distribute panel: 1,041,666.50 per partner on the Gouna building.
- Final price recorded: Gouna is `ready` at 12,499,900, with a `final` history row (cost 4,900,000).
- Properties KPIs: contracted sales 3,083,334; building prices 6M and 12.5M; net cost 6,680,001.
- SIM test data, created by the audit agent with ids in the audit report: property `d88de225-…`, lead, contract ZF-2026-0002, collections, contractor payments.

## Read first
- Rules: `PROJECT_SPEC.md` → "Partner payouts and final pricing". Every `[user-confirmed 2026-10-07]` line is binding.
- Skill: `zakaria-farid/.claude/skills/erp-partner-payout-pricing/SKILL.md`.
- Audit: `zakaria-farid/.agents/audits/SIM-2026-10-07-admin-lifecycle.md`, bugs B1–B10.
- Older handoff with the per-task detail: `zakaria-farid/.agents/HANDOFF-2026-10-07-partner-payout-pricing.md`.
- Pipeline: `.agents/dispatch3.sh`, `.agents/briefs/_agy-header.txt` / `_review-header.txt` (filled in for this repo), `.agents/queue.txt`. Run logs are in `.agents/runs/` (gitignored).

## User decisions (do not re-ask)
- Keep the FIN-OS layout and style. Any page, widget or button removal needs approval item by item.
- Do not re-apply migration `20261006090000`.
- Cost edit inside 24h posts the difference only (WIP vs 201000).
- Refund/supplement posts the adjustment amount.
- Delete posts a reversal and is blocked when paid > 0.
- Inside 24h, corrections are edits. The adjustment button appears only after the window closes (B7 dropped).
- B6: one "التزام رأس مال جديد" button in the partners rail (done).
- PR base is `main`. Commit only verified work. Ask before any push or PR that is not already authorized.
- Run `bash .agents/scripts/sync_graph.sh` from the repo root after each commit.

## Resume point (2026-10-08 evening)
- Branch feat/erp-partner-logic, PR #12. All work below is pushed.
- Done today: sim-area-field-bug closed (not reproduced; test 50c4dc5), unit-area-split 6441fc6, pdf-reports a94a82b (Codex), ui-pdc-one-table 99b0be5+cd8a1b9, ui-ledger-widgets 3995622, ui-calculator-repricing 1116d34 (agy only, Claude-checked).
- Codex is PAUSED by the user. agy runs via `bash .agents/agy-impl.sh <id>` (agy only, no review). When Codex is back: have it review 99b0be5..1116d34 (PDC, ledger, calculator) with SENSITIVE audit on 1116d34 (money path).
- Open follow-ups:
  - Calculator non-final save writes unit prices in a second client update after record_property_price (not atomic; history row units_repriced=0). Proper fix: migration extending the RPC to apply p_unit_prices in the revised branch (needs user OK, DATABASE_SCHEMA track).
  - PDC unified table: value/remaining/action columns sit behind horizontal scroll at 1440px (action column 337px).
  - Calculator sticky bar wraps at narrow widths.
  - PDF statements: verify a real-data render in the browser (only fixtures were rendered). Client overdue callout shows "132,000.00" with decimals.
  - manual-checks (payout post needs user click; cost-edit JE; 2x2 building units).
- Dev server zakaria-dev (port 51101) belongs to another chat; the browser pane can still open http://localhost:51101/fin-os/ar/... directly.
- Decisions recorded today in PROJECT_SPEC.md [user-confirmed 2026-10-08]: unit area split, card area line, repricing = sum of units, UI removals list.

## Next (older)
1. Watch CI on PR #12. Offer Auto-fix if it fails. Never enable auto-merge unless asked.
2. Manual checks the tool could not do (the user does these, or the next session in the browser pane at http://localhost:51101, server "zakaria-dev"):
   - Post a partner payout from the ready panel. The classifier blocked the confirm click for Claude. Then check that the journal balances (Dr 303000 / Cr cash).
   - Edit a fresh cost item's amount, then check `JE-WIP-EDIT-…` (Dr/Cr WIP vs 201000) and that GL WIP = sub-ledger.
   - Create a building with 2 floors × 2 units, then check that DB `building_units` has 4 rows and both contract wizards show 4 available.
3. Open items waiting for a user decision:
   - The hardcoded contractor tax id "492-810-332".
   - Vault KPI deltas that look hardcoded ("▲ 68%", "▲ 73%").
4. Small follow-ups found but not fixed:
   - Phone partner-share rows are cramped.
   - Project cards show one unit's area ("المساحات").
   - The default final price loses 100 EGP to per-m² rounding.
   - The contractor settlement journal uses `source_module MANUAL_ADJUSTMENT`.
   - `partner_id` is NULL on capital-injection lines.
   - The CRM has no lead assignment and no visit scheduling (B8).
   - The existing B1 ledger gap of 20,000 on SIM data stays (no backfill was done).

## Pipeline notes
- agy shares one machine with another project (`E:/center system`). While that project runs, agy times out (90m). In that case, let Codex implement directly: `.agents/runs/ui-small-fixes/run.sh` is the pattern.
- Codex usage limits stop dispatches with exit 3. Resume the review on the same thread (`--session <threadId>`). The pattern is `.agents/runs/fin-b2-units-persist/resume.sh`.
- The SENSITIVE audit caught real money issues every time. Keep `SENSITIVE=1` for money tasks.
- Codex runs graphify inside `zakaria-farid/`, which dirties `zakaria-farid/graphify-out`. Run `git checkout -- zakaria-farid/graphify-out` before committing.
