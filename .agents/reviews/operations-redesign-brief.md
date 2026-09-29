# Operations page pilot

Scope: `/fin-os/ar?tab=operations`, Arabic RTL and existing English equivalent. The user explicitly requests a new design system on this page before adopting it elsewhere. Existing financial logic, calculations, permissions, persisted data and transaction workflows remain authoritative.

## Current source audit

- `DailyOperationsView.tsx` repeats breadcrumb/title/description and a decorative ready badge, then daily metrics.
- The liquidity section repeats summary content in badges, bordered nested alert cards, and oversized headings.
- Ten actions in four vertical groups appear before the actual work queue (queue begins around line 2445). This makes common collections and lookup tasks require substantial scanning and scrolling.
- Six useful queue views already exist: dues, safe cheques, available properties, handovers, expenses and journal history. Retain these and their data calculations, search, filtering, sorting, pagination, and callbacks.
- The shared workstation uses a 100vw shell and several nested stage containers. User reports left overflow at x=-8. Check actual geometry before changing it; scope any shell adjustment to operations.
- Visual baseline: ThmanyahSans/Cairo/Plus Jakarta Sans, warm Alabaster canvas (#eae6dc), white surfaces, gold (#946f23), multiple semantic and decorative colors, 10-16px radii, gradients and shadows throughout.
- Browser inspection initially redirected to login; visual baseline is not yet verified.

## Proposed visual system

Reading: daily finance workspace, calm and practical. Design variance 3, motion intensity 2, visual density 5. Retain the Arabic font and brand mark. Use page-scoped CSS variables, neutral light canvas, flat white working surface, charcoal text and restrained gold primary actions. Dark mode must use the same hierarchy. Use 6px controls, 10px panels, no decorative gradients, no floating icon tiles or artificial live badges. Reserve red/amber for actual overdue/warning states.

## Proposed information hierarchy

1. Single short header, page title, date and compact primary recording action with clear transaction choices. Keep export as a quiet utility.
2. Flat daily summary row, with a compact disclosure for cash/bank and secondary metrics. Keep all existing computed values and clarify their time scope.
3. Main work queue visible in the initial desktop viewport, calm tab navigation, labeled search, contextual filters and sort. Consistent row columns: client/unit, due date/status, amount, inspect/collect.
4. Compact contextual attention panel or strip based on existing alerts, with existing callbacks. No repeated giant card groups.
5. Secondary tools via an accessible disclosure or menu. Preserve all ten existing actions, callback arguments, disabled states and financial modal guards.

## Verification

- Mandatory SURFACE_UI gate: `cd zakaria-farid && npx tsc --noEmit`. Track post-gate failures independently, ceiling 5.
- Browser check at 1920x964, 1366x768 and 390x844, Arabic RTL and English, light and dark. No body horizontal overflow, clipped controls or unreachable dropdowns.
- Exercise six queue tabs, search/reset, sort, pagination, action menu, opening/closing existing modals without creating transactions. Confirm unrelated ERP tab keeps its existing visual system.
- Run financial tests only if implementation touches financial logic (it should not).
- Sync graph and update checkpoint after implementation.

## Delegation resolution

[user-confirmed, 2026-09-12] User requested adapting the harness permanently for Codex. Use native Codex subagents with inherited model configuration; retain Flash policy only for Antigravity. Operations implementation is delegated to Executive UI/UX Engineer.

## Browser baseline

User signed in to the preview browser. At 1920x964 the workstation and main content both start at x=-8. The work queue heading is at y=1579.84, below the first viewport; the main scroll height is 2657. The screenshot confirms that nested alert panels and the ten-action launchpad occupy the first screen.
