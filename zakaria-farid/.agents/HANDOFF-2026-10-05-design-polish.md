# Handoff — ERP design polish & popup rebuild (2026-10-05)

Branch `feat/ops-treasury-revamp` (repo root `Real-Estate-Platform`, app in `zakaria-farid/`). Nothing pushed.
**Rollback point:** `6e36e8f` (backup taken before the design work; saved in memory `design-polish-backup`).
Earlier same-branch work (treasury/ops revamp, InstaPay=102000, collect popup, transfer) ends at `99c28d8`.

## Working agreement (unchanged)
- Claude = planner/reviewer/committer; Antigravity (agy) implements via
  `node "$HOME/.claude/skills/agy-delegate/scripts/relay.mjs" --brief .agents/briefs/<id>.txt --cd . --dangerously-skip-permissions --print-timeout <N>m`
  (run with Bash `run_in_background`). Briefs > ~30 KB: stub `.txt` that says "read `<id>.body.txt`".
- Max 2 agy runs in parallel. "(no final message captured)" → grep the run's `agy.log` in `%TEMP%/delegate-relay/<run>/` for 429/503 before re-dispatching.
- Lessons log: `~/.claude/skills/agy-lessons/SKILL.md` (now L1–L17; L17 = quota exhaustion mid-batch + JE account names via `CANONICAL_COA`).
- Graphify-first search; caveman replies; commit only verified work; gates: `npx tsc --noEmit`, `npx tsx --test src/lib/erp/__tests__/*.test.ts` (baseline **712 pass / 7 fail**, all 7 pre-existing).
- Dev preview: `.claude/launch.json` → `zakaria-dev` on port 51101. **If the Browser pane is hidden, timers are throttled and the ERP loading screen looks stuck for minutes — not a bug.** Check readiness with `document.querySelectorAll('h1')`, not `main h1`. After deleting files, a stale Turbopack cache can serve old modules: stop server, `rm -rf .next/dev .next/cache`, restart.

## What was done (23 commits, `08ce4b1` → `ad410d8`)
**Design system foundation**
- Codemod: ~830 hardcoded blue/gold accent literals → `--erp-accent*` / `--admin-accent*` tokens (`color-mix` for tints). Chart series stay hex.
- `v2/common/ZFPageHeader.tsx` (+css): `ZFPageHeader`, `ZFPanel`, `ZFSegmented`. Shell CSS buttons: `btnPrimary/btnSecondary/btnDanger/btnGhost/btnSm` (34px).
- `v2/common/ZFForm.tsx` (+css): popup form kit — `ZFField, ZFMoneyInput (step any), ZFChoices, ZFFacts, ZFEffect, ZFJournalPeek, ZFFormFooter, ZFFormDone, zfForm`.
- `ZFModalShell` polished (square icon, borderless close, tinted footer, floating shadow).
- `DESIGN_SYSTEM.md` §4.D + §9 updated. Page/top-bar/tab titles unified (no "cheques").

**Palette shared ERP + Admin**: `src/lib/theme/accentPalette.ts` (`useAccentPreset`, storage key `fin_os_accent_preset_v1`, cross-tab sync), presets gained dark-mode values + `onAccent`; `AdminAccentBridge` + `AdminPaletteMenu` in admin header; `--admin-on-accent` used for text on accent.

**Pages**: all 14 FIN-OS pages on `ZFPageHeader` + standard buttons; no gradients/badges/breadcrumbs. Properties KPI row → standard `ZFKpiGrid` (removed fake 32k–65k gauge).

**Calculator** rebuilt (`v2/views/calculator/CostPricingCalculator.tsx`, math in `src/lib/erp/pricingCalculator.ts` + tests): user-confirmed "cost floor vs market" pricing + simplified feasibility. Layout: header(save) → 4 KPIs → price panel (slider + inputs) → clickable scenario table → units table. Old `ConstructionCostCalculator` + `CalculatorSideWidgets` deleted.

**Popups** (all rebuilt on the form kit): partner funding/payout/new partner/reallocation/dossier(+drawer)/commitments; contractor bill vs site expense (one screen, different fields; site = cash/InstaPay only); contract wizard (kept 3 steps), installment due (`NewChequeModal`), escalation, rescission, handover, contract inspection, installment drawer; RSV, cost adjustment, edit cost, contractor payment, allocation drawer; account ledger, inspector, lifecycle, map.
- Removed: purchase orders (user decision), `HandCollectionModal`, `CashCollectionReceiptModal`, `PartnerOperationsModal`, cheque inspector branch + `handleInspectCheque`/`onInspectCheque`/`onUpdateChequeStatus`, bank payment option in UI.
- Bugs fixed: ledger rows labelled from entry accounts (was "handover"/"installment" by memo regex); RSV pre-filled fake 100M/45%; partner dossier opened twice; lifecycle double currency; calculator overlapping labels + break-even "+1".

**Decisions recorded in `PROJECT_SPEC.md` [user-confirmed]**: calculator pricing model + feasibility scope; purchase orders removed; (earlier) InstaPay = 102000, no cheques, cash-basis.

## Open / next
1. **Visual check not done** (pane hidden): new calculator layout on screen; popups never opened in browser: escalation, handover, cost adjustment, inspector (no test records reach them).
2. Uncommitted: `graphify-out/*` churn and `.agents/briefs/pop-k3-costs.txt`, `pop-k4-ledger.txt` (hint edits) — safe to commit or discard.
3. ERP loading screen gates on timer-driven progress (`v2/ZFERPLoadingWorkstation.tsx` setTimeouts) — roadmap item "ERP loading page redesign".
4. Remaining roadmap from before: Phase 2 visual items (admin CRM, custom palettes, non-Arabic titles), Phase 2.5 export audit, 7 pre-existing failing tests (separate task), wipe test data before handover (contract ZF-2026-4386, transfer TRF-20261005-B99EBC, payout, "InstaPay expense test" cost item), push/PR when user asks.
5. Admin theme was restored to dark; palette currently `deep_bordeaux` (user's choice).
