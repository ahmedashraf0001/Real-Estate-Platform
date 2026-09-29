---
trigger: always_on
description: Mandatory FIN-OS ERP Design System enforcement for all frontend UI, pages, and components.
---

## FIN-OS ERP Design System Enforcement

Before styling, refactoring, or creating any page, view, modal, table, or chart in FIN-OS (`src/app/fin-os/*`, `src/components/admin/erp/*`, or related admin surfaces):

1. **Consult Single Source of Truth**: Read and strictly adhere to `/home/lyr1csan/project/Real-Estate-Platform/zakaria-farid/DESIGN_SYSTEM.md` and load the skill `fin-os-erp-design` (`/home/lyr1csan/project/.agents/skills/fin-os-erp-design/SKILL.md`).
2. **Strict Invariants**:
   - **Discrete Floating Stat Cards**: Render high-level metrics as **4 discrete floating white cards** (`.discreteKpiCard` in `.discreteKpiGrid`) with 1px border (`#e2e8f0` / `#cbd5e1`) and 12px radius. **Monolithic cramped single-block KPI cards with hairline dividers are strictly banned.**
   - **Soft Pastel Micro-Pills**: Statuses in tables and drawers must use soft pastel micro-pills with 9999px geometry (`.statusPill` with `.statusPillGreen`, `.statusPillAmber`, `.statusPillRed`, `.statusPillBlue`, `.statusPillNeutral`). Saturated solid color blocks and naked unstyled text are both banned.
   - **Dual Tabs Architecture**: Underline tabs (`.tableTabsUnderline` with 2.5px bottom indicator) for primary section/entity switching; segmented pill bars (`.tableTabsSegmented`) for in-table category filtering.
   - **Data Tables**: Use full-row click targets (`.clickableTableRow`) for drawer inspection. No repetitive bulky per-row blue buttons.
   - **Colors & Canvas**: Soft cool neutral canvas (`#f1f5f9`), crisp floating pure white panels (`#ffffff`), single primary accent (`#2563eb`). Pure black (`#000`, `#000000`) is banned.
   - **CAD Cartesian ApexCharts**: Always wrap with `ERPApexChart` with full technical blueprint Cartesian grid (`xaxis.lines.show: true`, `yaxis.lines.show: true`, `borderColor: '#e2e8f0'`, `strokeDashArray: 2`).
   - **No Restyled Legacy Lookalikes**: Verify components are canonical primitives (`ZFKpiCard`, `ZFModalShell`, `ZFDrawerShell`, `ZFCustomSelect`), not old pre-overhaul components with accent applied.
   - **Accounting Math & RTL**: Tabular numbers mandatory (`font-variant-numeric: tabular-nums`). Zero accounting deviations from `canonicalMetrics.ts`. Strict Arabic/RTL (`dir="rtl"`).
