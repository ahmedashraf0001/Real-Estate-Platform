# SIM admin lifecycle audit, 2026-10-07 (WORKFLOW_AUDIT)

Status: PARTIAL. Real UI + real Supabase DB (project lybkeycbiposjkjkyjlh). All writes via UI, DB reads only.
No source file was changed. The pre-existing property c1f6671b, contract ZF-2026-0001 and the payout dialog were read only.

## Steps

| # | Step | Route | Category |
|---|------|-------|----------|
| 1a | Add property (building, off_plan, 600 m2, 6,000,000, 2 partners 60/40) | /admin/ar/properties/new | Moderate/Hard (صعب) |
| 1b | Property visible in ERP + public site | /fin-os/ar/properties, /ar/properties/sim-lifecycle-test-building-0a48pm | Easy (سهل) (public list page /ar/properties rendered empty text; detail OK) |
| 2 | CAD (wizard in step 3 of add form + dashboard "مخطط CAD" comparison) | /admin/.../new?step=3, /fin-os/ar | Erroneous (خاطئ) |
| 3a | Cost items x3 with contractors, 7 installments on one | /fin-os/ar/construction | Easy (سهل) |
| 3b | Partial payment to contractor (123,456.78) | construction row dialog | Easy (سهل) |
| 3c | Edit cost 500,000 to 480,000 (within 24h) | construction row dialog | Erroneous (خاطئ) (ledger not updated) |
| 3d | Cost adjustment (refund/supplement) | EditPropertyCostModal | Currently Impossible (لا يمكن تنفيذه) (only reachable after 24h lock) |
| 3e | Capital injection (SIM partner 500,000.55 cash) | /fin-os/ar/partners | Easy (سهل) |
| 3f | Partial capital commitment + side rail check | partners | Currently Impossible (لا يمكن تنفيذه) (no UI entry point) |
| 3g | Calculator on property | /fin-os/ar/calculator | Moderate/Hard (صعب) (virtual 6 units, mismatch vs CAD) |
| 4 | Public inquiry form, lead in CRM | /ar/properties/<slug>, /admin/ar/leads | Easy (سهل) |
| 5a | Pipeline stage moves, notes/tags | /admin/ar/leads | Easy (سهل) |
| 5b | Assign lead / schedule visit | /admin/ar/leads | Currently Impossible (لا يمكن تنفيذه) (no such controls) |
| 6 | Contract on a unit with 7-installment plan | /fin-os/ar/contracts wizard | Moderate/Hard (صعب) (lead wizard shows 0 units, contracts wizard shows 6) |
| 7a | Collect down payment (cash) + installment 1 (InstaPay) | /fin-os/ar/vault (pdc) | Easy (سهل) |
| 7b | Pay contractor from collected cash | construction | Easy (سهل) |
| 8 | Partners cards, collections share, ready-to-distribute panel | /fin-os/ar/partners | Easy (سهل) |
| 9 | Dashboard KPIs, trial balance, periods | /fin-os/ar, SQL | Moderate/Hard (صعب) (stale/gross KPIs, transient wrong values on load) |

Counts by table rows (19 rows): Easy 9, Moderate/Hard 5, Incomprehensible 0, Erroneous 2, Currently Impossible 3.

## Bugs, ranked

### B1 (money / data integrity) Editing a cost item does not update the ledger
- Repro: construction, SIM مقاول مباني (500,000, GL posted JE-WIP-935AC196), edit amount to 480,000 within the 24h window, save.
- Evidence: erp_property_costs total/net = 480,000, remaining 356,543.22. GL unchanged: account 151000 debit still 500,000 for that entry, 201000 credit 500,000. SIM costs net sum 1,780,001.00 vs GL WIP debits 1,800,001.00 (gap 20,000). 201000 net -1,576,544.22 vs sub-ledger remaining payables 1,556,544.22.
- Knock-on: dashboard "التزامات قادمة" = 1,800,001 (gross, stale, not net of 223,456.78 paid); vault agenda "المدفوعات" total 6,700,001 vs 6,680,001 real; urgent dues 526,543.22 vs 506,543.22.
- Suspect: src/lib/erp/supabaseService.ts:1594 `updatePropertyCostItem` only updates erp_property_costs, posts no correcting journal. Caller ERPWorkstationContext.tsx:4073.

### B2 (data integrity) Building units are never persisted; ERP invents 6 virtual units
- Evidence: after publish, properties.total_units_count = 1, building_units = [] while CAD generated 4 flats (2 floors x 2). ERP shows "6 units" (floors 1-3, A/B), priced area/6. Contract stored building_unit_id `d88de225-...-apt-1` (not a real row).
- Form fields "عدد الأدوار" / "وحدات لكل دور" are not saved: AdminPropertyForm.tsx:743-770 payload has no total_units_count/building_units; bedrooms=2 saved (public page shows "2 أجنحة" for a building).
- Suspect: src/lib/erp/supabaseService.ts:113 (`: 6` fallback), AdminPropertyForm.tsx payloadBase (~line 744).

### B3 (data consistency) Lead wizard vs contracts wizard disagree on units
- Lead drawer "تحويل إلى عقد" lists the SIM building as "0 شقة متاحة" (whole building only). /fin-os/ar/contracts lists "6 شقة متاحة" with units 1A..3B. Same property.
- Also the contracts wizard does not prefill email when picking a lead (lead wizard does). Unit labels read "شقة شقة 1A" (duplicate word).

### B4 (misleading KPIs) Per-unit price compared to whole-building cost
- Dashboard project comparison: SIM "بيع 1.0 م / تكلفة 1.8 م, margin -78.0%"; existing property -99.9%. Properties page shows price "1 مليون" for a 6,000,000 building. ERP maps price_egp to per-unit average.
- Properties page "قيمة المبيعات المتعاقد عليها" 3,083,317 uses catalog unit prices (1,000,000 + 2,083,317) instead of contract values (1,000,001 + 2,083,333 = 3,083,334). Suspect: PropertiesPortfolioView.tsx ~518-564.

### B5 Dashboard shows wrong numbers on first render, correct after refresh
- First paint: cash 4,641,375 (parts shown sum to 4,731,306), contracts 3,024,728, scheduled 714,724, payables 1,765,788. After data load: 4,731,305 / 3,083,334 / 728,572 / 1,800,001. Transient inconsistent values (Moderate).

### B6 Capital commitment cannot be created from the UI
- `onOpenCommitmentModal` is accepted by PartnersProjectsView.tsx:45/63 but never invoked. Quick actions in the rail offer only add partner / inject / payout / export. Spec step "commitment partly paid, side rail shows unpaid commitment" could not be tested. Suspect PartnersManagementView.tsx:105-108, :328, :406.

### B7 Cost adjustment unreachable for fresh items
- Adjustment modal opens only from EditPropertyCostModal when item is older than 24h (EditPropertyCostModal.tsx:70-71, 175-190). Combined with B1 the only edit path in the first 24h is the one that breaks the ledger.

### B8 Lead CRM missing features
- No assign-to-agent, no visit scheduling control, only stage buttons, tags and a notes textarea (LeadPipeline.tsx). Stage "visit" exists but has no date/time.

### B9 Add-property form UX (phone/narrow layout)
- "الخطوة التالية" button is clipped off-screen to the left (x -58..51); clicking its visible edge hits a different button (went back a step). Partner name input in the manual-partner row is cut off at the left edge. Needed JS click to move forward.
- Publishing without a map pin fails with no visible error (toast seen only after pin set: AdminPropertyForm.tsx:737 toast not observed; no inline message on step 4).
- CAD generated rooms total 1234 m2 vs declared 600 m2 (warning shown, publish allowed). Review step lists "2 غرف" for a building.
- Wizard step 1 form_input on `ref_23` label stale ("Apartment") after switching to building (cosmetic, a11y label).

### B10 Lower severity
- Contractor settlement journal uses source_module `MANUAL_ADJUSTMENT` (entry AP-7ee7d6b9-...) instead of an AP/payment module.
- erp_journal_lines.partner_id is NULL for partner capital injection lines (JE-2026-CAP-7810).
- erp_contracts.partner_splits[].cash_share stays "0.00" after collections (UI computes share live, so display is right).
- Installment due date shifted one day: form preview 2026-11-06, saved first tranche 2026-11-05 (timezone/UTC conversion), see construction cost c1729fd2.
- Raw enum shown in UI: phase "masonry_roughing" in the payable drawer. Hard-coded tax id "492-810-332 (مسجل ضريبياً)" shown for fake contractor.
- Console: React duplicate key `c1729fd2-92a4-4ab7-b0dc-b8ffc9ee5cfc` (item with installments rendered twice, ConstructionPayablesView.tsx ~1628 / 2365); React "mix shorthand borderColor/borderRightColor" warnings; repeated 401 resource errors (about 48), source not identified (likely dev tooling).
- Vault KPI deltas "▲ 68%", "▲ 73%" do not match shown ratios (1/9, 5/14), looks hard-coded. Partners "الإجمالي 4 شريك" double-counts a partner in two projects.
- Dashboard CAD tab chart has no readable values in text (visual only).

## Math audit

| Check | Result |
|---|---|
| Contractor installments 1,000,001.00 / 7 | 6 x 142,857.29 + 142,857.26 = 1,000,001.00 exact (last absorbs remainder) PASS |
| Customer plan 1,000,001 = 150,000 down + 7 x | 6 x 121,428.71 + 121,428.74 + 150,000 = 1,000,001.00 exact PASS. UI collect-modal rounds display to whole EGP (121,429) |
| Partner split on contract 60/40 of 1,000,001 | 600,000.60 + 400,000.40 = 1,000,001.00 PASS |
| Partners collections share on 271,428.71 | SIM 40% = 108,571.48, Zakaria 60% = 162,857.23 (+1,041,666.50 prior = 1,204,523.73) PASS |
| Partner capital 500,000.55 | journal 101000 Dr / 301000 Cr 500,000.55 PASS |
| Every journal entry balanced | query of entries with debit<>credit returns 0 rows PASS |
| Trial balance | total debit = total credit = 17,778,220.04 PASS |
| Periods | all OPEN, all 20 Oct-2026 entries in prd-2026-10, none without period PASS |
| Sub-ledger vs GL | FAIL by 20,000 (B1) |
| "Arrears" on Zakaria 750,000.83 | by design, rule in partnersEngine.ts:272-336 (match highest contributor), not a bug |
| Ready-to-distribute panel | lists only the fully-collected old property, not SIM PASS |
| Unit contracted | properties page: SIM "5 من 6 متاحة", other units untouched PASS |
| Lead after contract | stage closed_won automatically PASS |

Treasury after run: 101000 net 4,609,876.77, 102000 net 121,428.71.

## SIM records created

- Property: d88de225-f19b-4559-8741-cd022ef50058, slug sim-lifecycle-test-building-0a48pm, title "SIM عمارة اختبار دورة الحياة", partner_splits زكريا فريد 60 / SIM شريك تجريبي 40 (partner name stored only inside partner_splits; no erp_partner_profiles row created by the add form).
- Lead: 8fa44080-7b8b-4a9c-9fd7-1aa4038f758f "SIM عميل تجريبي" (01000000001, sim+1@example.com), stage closed_won.
- Cost items: c1729fd2-92a4-4ab7-b0dc-b8ffc9ee5cfc (SIM مقاول حفر وخرسانة, 1,000,001, 7 installments, JE-WIP-C1729FD2); SIM مقاول مباني (480,000 after edit, paid 123,456.78, JE-WIP-935AC196, payment entry AP-7ee7d6b9-145e-4db1-ba86-57525c189102); SIM مقاول تشطيبات (300,000, paid 100,000, JE-WIP-18597D3F, payment AP-dbfe5362-4aeb-49c6-b45c-9592f879ee0a). Item ids for the last two: query erp_property_costs where supplier_contractor like 'SIM%'.
- Partner transaction: 20620990-13e3-47ab-82f7-4eded26c0f37 (SIM شريك تجريبي, 500,000.55, JE-2026-CAP-7810).
- Contract: c30f233c-74b1-4ad8-b1fd-6205c6320ebc ZF-2026-0002 (SIM عميل تجريبي, national id 29990000000001, unit شقة 1A, 1,000,001, collected 271,428.71).
- Receipts: JE-RCP-RC-20261007-CR02 (150,000 cash), JE-IP-RC-20261007-152P (121,428.71 InstaPay).
- Installment schedule rows for the contract (tranches 0-7) and 7 payable installments on c1729fd2.

## Blocked / not done

- Cost adjustment (refund/supplement): BLOCKED (depends on 24h lock; cannot age an item without a DB write).
- Partial capital commitment and side-rail unpaid commitment check: BLOCKED (no UI entry point, B6).
- Lead assignment and visit scheduling: not available in UI (B8).
- Image upload skipped (file picker). Payment of a contractor installment (7-part schedule) not exercised.
- No tool permission denials occurred.
