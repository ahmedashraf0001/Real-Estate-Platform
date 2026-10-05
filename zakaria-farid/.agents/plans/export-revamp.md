# Export Revamp: Excel + PDF + Decision Reports

## Current state (verified)
- `src/lib/erp/excelExporter.ts`: 2323-line monolith, 6 exporters (comprehensive, ledger, partner dossier, partner directory, feasibility, property analysis). ExcelJS + hand-drawn canvas charts (`excelChartRenderer.ts`).
- PDF = `window.print()` through `ZFPrintDocumentLayout` (8+ call sites). No real PDF files. No Arabic font embedding.
- One ad-hoc CSV in `ConstructionPayablesView.tsx:882`.
- Data engines already exist: `canonicalMetrics`, `partnerAgingEngine`, `propertyAnalysisEngine`, `marginExposureEngine`, `treasuryLedger`, `installmentsVaultProjection`, `financialAgendaProjection`.

## Target architecture: `src/lib/erp/reports/`
1. `model/` : pure report builders. Input = `LiveERPDataset` + options. Output = `ReportModel` (title, as-of, sections: kpis, tables, charts, findings). No rendering here. Uses `Decimal` and canonical metrics only. Unit-tested.
2. `decisions/` : rule engine. `Finding { severity: critical|warn|info|ok, rule, evidence[], action }`. Thresholds in one `thresholds.ts` config, each tagged `[user-confirmed]` or `[default-pending]`.
3. `render/xlsx.ts` : ReportModel -> ExcelJS workbook (cover, executive summary, one sheet per table, findings sheet, native Excel charts where possible, frozen headers, number formats, RTL).
4. `render/pdf.ts` : ReportModel -> real PDF (pdfmake, embedded Thmanyah Arabic font from `public/fonts`, RTL, page header/footer, page numbers, charts as images). Lazy-loaded (dynamic import).
5. `ui/ExportMenu.tsx` : one shared control (Excel / PDF / both) replacing scattered buttons. Old `exportXxxExcel` become thin wrappers, then removed.

## Reports (phase 1, all four)
| Report | Sections | Decision rules (defaults, to confirm) |
| --- | --- | --- |
| Executive pack | KPIs, cash position, AR, payables, WIP, rev recognition, partner exposure | cash runway < N months; AR overdue share > X%; payables > cash |
| Property / feasibility | P&L, cost vs budget, ROI, break-even, milestones | margin < target; cost overrun > X%; sell/hold/reprice |
| Partners & aging | dossier, commitments, capital, aging buckets | 60+ bucket > X% of commitments; concentration > Y% |
| Ledger & treasury | GL, trial balance, cash flow, cheques/installments, contractor payables | debit != credit; cheques due 7d vs cash; bounced share |

## Phases
- P0: confirm thresholds (Halt-on-Ambiguity: financial rules).
- P1: model + decisions layer + tests (FINANCIAL_CORE, dual-gated).
- P2: xlsx renderer; port existing 6 exporters onto it.
- P3: pdf renderer + font + RTL verify.
- P4: ExportMenu, replace call sites, delete legacy, sync graph.

## Gates
`npx tsc --noEmit`, vitest on `reports/**`, debit=credit and totals tie-out test against canonicalMetrics, manual open of generated xlsx/pdf.
