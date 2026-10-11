# Codebase cleanup (2026-10-09) - PAUSED

User approved all 4 groups [user-confirmed 2026-10-09]. Paused before any removal (user: bigger problem first).
Do it only when no Codex/agy run is editing the tree. After: tsc, npm test (7 known baseline fails), OpenNext build.

Rescan: `cd zakaria-farid && node ../.agents/scripts/unused-files.cjs .` (UNUSED = nothing imports it; TEST-ONLY = only tests import it).

## 1. Dead source (23 files, ~7.8k lines; nothing imports them)
src/components/admin/erp/v2/views/GeneralLedgerMindmap.tsx (1647), src/components/admin/erp/PropertyFinancialMatrix.tsx (1266),
src/components/admin/erp/ZFSubprogram.module.css (966), src/components/admin/erp/AdminERPHub.tsx + .module.css (731),
src/components/admin/erp/v2/views/installments/InstallmentsCalendarStrip.tsx (646), src/app/[locale]/about/about.module.css (502),
src/styles/index.css (404), src/components/property/PropertyCard.module.css (346), src/data/properties.ts (261, old demo data),
src/app/[locale]/contact/contact.module.css (194), src/components/erp/VersionTimeline.tsx (162), src/lib/erp/governance.ts (147),
src/components/admin/erp/v2/erpTokensV2.module.css (124), src/components/erp/BranchDecisionCard.tsx (107),
src/components/admin/erp/v2/common/AnimatedCounter.tsx (99), src/components/erp/OpenQuestionFlag.tsx (92),
src/components/erp/LegalVerificationTag.tsx (39), src/components/admin/erp/v2/common/ZFErpBreadcrumb.tsx (38),
src/app/[locale]/home.module.css (14), src/components/admin/erp/ZFNavigationDock.module.css (3), src/utils/mapCache.ts (2).
Before deleting: rescan, and grep each path in __tests__ (some tests read source files by path).
TEST-ONLY (not approved for removal, decide separately): lib/erp/store.ts, marginExposureEngine.ts, invariants.ts, v2/views/AccountInspectorPanel.tsx, v2/common/OSFileIcons.tsx.

## 2. Unused npm packages (20, no import anywhere in zakaria-farid)
@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities; @radix-ui/react-{accordion,checkbox,dialog,dropdown-menu,label,popover,select,separator,slider,switch,tabs,toast};
@tiptap/pm; embla-carousel-react; react-apexcharts; recharts; xlsx (known CVEs). Keep @types/*.
Check peer deps (e.g. @tiptap/* needs @tiptap/pm) with `npm ls` before uninstalling.

## 3. Repo clutter
- Untrack + gitignore: zakaria-farid/graphify-out (69 MB tracked, incl. dated snapshots 2026-08-29/09-03/09-04), zakaria-farid/.wrangler/state.
- One-off app-root scripts: zakaria-farid/apply_full_sync.js, fix_leaflet_ssr.js, sync_all_views.js, sync_property_view.js.
- One-off scripts/: restore_clean_property_detail.js, update_property_detail.js, build_pristine_property_detail.js, integrate_blueprint_inspector.js, verify_*.js, test_contracts_filters.js, test_portfolio_interactions.js, test_priority_triggers.js, take_screenshot.js, take_full_screenshot.js, alter_enum.mjs (check package.json scripts first; keep seed*, take_website_screenshots.ts, site-*-capture, repair-building-blueprint.ts).
- Move to docs/archive/: root dashboardoverhaul.md, designchanges.md, fulluiredesign.md, heroplan.md, layeringsystemplan.md, propertydetailsplan.md, specdesignimplemnetation.md, zakaria-farid-plan-addendum.md, master-qa-security-deployment-audit-plan.md.

## 4. Branches and worktrees
Merged into origin/main, delete local: claude/interesting-herschel-d56b35, feat/admin-erp-palette, feat/erp-partner-logic, feat/site-polish, fix/erp-p0, fix/erp-p1, fix/erp-remove-mock-fallbacks, fix/property-slug-decode, hotfix/prod-property-500.
Merged, delete remote: feat/admin-erp-palette, feat/cad-composer-and-viewing-scheduling, feat/erp-partner-logic, feat/ops-treasury-revamp, feat/site-polish, fix/erp-p1, fix/property-slug-decode, hotfix/prod-property-500.
Also delete fix/erp-open-items (local + remote; its work is in PR #15 as ecb1d52 + cf7a63d).
Unmerged, keep: feat/erp-calc-atomic-reprice (PR #15), feat/erp-partner-payout-offset, feat/ops-treasury-revamp (local), origin/feat/erp-modal-overhaul (ask).
Worktrees to remove: ../REP-hotfix, ../REP-site, ../REP-open, %TEMP%/site-prod-500-main, .claude/worktrees/interesting-herschel-d56b35.
