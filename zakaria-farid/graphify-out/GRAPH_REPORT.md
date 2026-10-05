# Graph Report - zakaria-farid  (2026-10-05)

## Corpus Check
- 401 files · ~1,242,288 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 74 file(s) not represented in the graph (top: .css 52, .woff2 15, .example 1)

## Summary
- 2347 nodes · 7757 edges · 163 communities (111 shown, 52 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 91 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6324237b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- HandInstallmentsVaultView.tsx
- DailyOperationsView.tsx
- partnersEngine.ts
- PropertyAnalysisView.tsx
- Decimal
- Property
- ERPAccountingPeriod
- CostAdjustmentModal.tsx
- supabase/types.ts
- dependencies
- ContractRescissionsView.tsx
- ERPWorkstationShell.tsx
- ERPWorkstationProvider
- erp/types.ts
- ZFForm.tsx
- ZoneInspector.tsx
- ContractsRegistryView.tsx
- src/types.ts
- instances.ts
- ClientAppShell.tsx
- COAFileExplorer.tsx
- package.json
- ArchitecturalBlueprintInspector.tsx
- marketIntelligence.ts
- canonicalMetrics.ts
- ERPPartnerTransaction
- ZFQuickSearchModal.tsx
- CatalogView.tsx
- next
- ERPJournalEntry
- GeneralLedgerView.tsx
- analytics/page.tsx
- tabRedirectMap.ts
- CostPricingCalculator.tsx
- PropertyDetailView.tsx
- createClient
- AccountLedgerModal.tsx
- AdminPropertyForm.tsx
- LeadPipeline.tsx
- propertyCostEngine.ts
- queries.ts
- ConstructionPayablesView.tsx
- ZFKpiCard
- D
- CADBlueprintBuilder.tsx
- MapPicker.tsx
- react
- PropertiesAdminClient.tsx
- compilerOptions
- Production Deployment & Maintenance Runbook
- app/[locale]/layout.tsx
- seed.mjs
- ERPWorkstationContext.tsx
- Export Revamp: Excel + PDF + Decision Reports
- apply_full_sync.js
- propertyAdapter.ts
- Feature Specification: Egyptian Real Estate Construction Layering & Finishing System
- calcom/route.ts
- osFileIcons.test.ts
- puppeteer-core
- framer-motion
- ZFSkeletonLoader.tsx
- ContactView.tsx
- ledger.ts
- 4. Layout Architecture & Structural Patterns
- ZFFacts
- ZFModalShell
- RSVEngine
- lucide-react
- devDependencies
- take_full_screenshot.js
- lib/mapCache.ts
- ref_path
- @supabase/supabase-js
- ref_fs
- أجندة ومواعيد الأقساط وسندات القبض — UI and implementation handoff
- governance.ts
- verify_phase3_visuals.js
- searchUtils.ts
- ERPInstallmentSchedule
- ref_node_assert
- test_invariants.ts
- sync_all_views.js
- CODEX.md - Project Directives, Context & Architectural Invariants
- allowScripts
- CockpitView.tsx
- fin-os/layout.tsx
- alter_enum.mjs
- build_pristine_property_detail.js
- restore_clean_property_detail.js
- verify_uniformity.js
- ERPPDCRecord
- sync_property_view.js
- accentPalette.ts
- test_portfolio_interactions.js
- verify_scope_separation.js
- verify_stream_clicks.js
- README.md
- geocode/route.ts
- tailwind.config.ts
- AGENTS.md
- costAdjustmentsAndPayables.test.ts
- useERPWorkstation
- AdminERPHub.tsx
- math.ts
- src_components_admin_erp_v2_zfworkstationshell_module
- partnerAgingEngine.ts
- VersionTimeline.tsx
- ConstructionFeasibilityRouteView.tsx
- PartnersManagementRouteView.tsx
- ContractRescissionsRouteView.tsx
- ZFPageHeader.tsx
- getZoneBadge
- rsv.ts
- Handoff — ERP design polish & popup rebuild (2026-10-05)

## God Nodes (most connected - your core abstractions)
1. `D()` - 271 edges
2. `react` - 198 edges
3. `Decimal` - 141 edges
4. `Property` - 141 edges
5. `ERPContract` - 128 edges
6. `lucide-react` - 127 edges
7. `ERPJournalEntry` - 87 edges
8. `next` - 82 edges
9. `ERPPropertyCostItem` - 76 edges
10. `ERPInstallmentSchedule` - 68 edges

## Surprising Connections (you probably didn't know these)
- `N. Quick Shortcuts Operational Standards (`.quickShortcutsGrid`)` --references--> `NewChequeModal()`  [INFERRED]
  DESIGN_SYSTEM.md → src/components/admin/erp/NewChequeModal.tsx
- `11.A. Skill Orchestration Matrix by Architectural Component & Layer` --references--> `ERPApexChart()`  [INFERRED]
  DESIGN_SYSTEM.md → src/components/admin/erp/v2/charts/ERPApexChart.tsx
- `9.D. Runtime Injection & Persistence` --references--> `ERPApexChart()`  [INFERRED]
  DESIGN_SYSTEM.md → src/components/admin/erp/v2/charts/ERPApexChart.tsx
- `H. Canonical Slide-over Drawer Shell Pattern (`ZFDrawerShell`)` --references--> `ZFDrawerShell()`  [INFERRED]
  DESIGN_SYSTEM.md → src/components/admin/erp/v2/common/ZFDrawerShell.tsx
- `G. Canonical Modal Shell Pattern (`ZFModalShell`)` --references--> `ZFModalShell()`  [INFERRED]
  DESIGN_SYSTEM.md → src/components/admin/erp/v2/common/ZFModalShell.tsx

## Import Cycles
- None detected.

## Communities (163 total, 52 thin omitted)

### Community 0 - "HandInstallmentsVaultView.tsx"
Cohesion: 0.11
Nodes (41): formatNumberWithCommas(), HandInstallmentsVaultView(), InstallmentDetailDrawerProps, calculateProjectChartHeight(), formatAxisNumber(), formatMonthCategory(), formatProjectLabel(), InstallmentsAnalyticsCharts() (+33 more)

### Community 1 - "DailyOperationsView.tsx"
Cohesion: 0.07
Nodes (54): DailyOperationsPage(), Props, ZFSearchBar(), ZFSearchBarProps, DailyOperationsView(), displayDate(), fmt(), DailyOperationsRouteView() (+46 more)

### Community 2 - "partnersEngine.ts"
Cohesion: 0.16
Nodes (18): PRIMARY_DEVELOPER_NAME, aggregateProjectPartnershipCards, BuildingEquityBalanceReport, calculateProjectPartnershipCards, executeFullInternalBuyout(), executeFullSubstitution(), executePartialSale(), FullInternalBuyoutParams (+10 more)

### Community 3 - "PropertyAnalysisView.tsx"
Cohesion: 0.08
Nodes (40): exceljs, AnalysisPage(), Props, getContractStatusLabel(), getCostCategoryLabel(), getCostStatusLabel(), PropertyAnalysisDossier(), PropertyAnalysisSideWidgets() (+32 more)

### Community 4 - "Decimal"
Cohesion: 0.08
Nodes (8): MoneyCellProps, Decimal, PortfolioMacroAnalysis, PropertyCostBreakdown, TreasuryAccountSummary, TreasuryKindSummary, TreasurySummary, UpcomingDuesResult

### Community 5 - "Property"
Cohesion: 0.11
Nodes (39): AccountLedgerModalProps, PropertyFinancialMatrixProps, PropertyLifecycleAuditModalProps, CostAdjustmentModalProps, CostPayableSettlementModalProps, EditPropertyCostModalProps, HandoverExecutionModalProps, RSVAllocationModalProps (+31 more)

### Community 6 - "ERPAccountingPeriod"
Cohesion: 0.16
Nodes (12): NewContractWizardModalProps, RescissionSettlementModalProps, GeneralLedgerViewProps, ContractsEngine, GeneralLedgerEngine, minDecimal(), PartnersEngine, RescissionEngine (+4 more)

### Community 7 - "CostAdjustmentModal.tsx"
Cohesion: 0.24
Nodes (9): CostAdjustmentModal(), convertGroup(), hundreds, ones, onesFeminine, tafqeetEGP(), tafqeetNumber, teens (+1 more)

### Community 8 - "supabase/types.ts"
Cohesion: 0.06
Nodes (62): I. Dual-Tier Dropdown Standard (Native Select vs. ZFCustomSelect), PropertiesPage(), Props, getBadgeStyle(), ZFCustomSelect(), ZFCustomSelectItem, ZFCustomSelectProps, ZFCustomSelectSection (+54 more)

### Community 9 - "dependencies"
Cohesion: 0.04
Nodes (45): dependencies, agentation, apexcharts, browser-image-compression, @calcom/embed-react, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+37 more)

### Community 10 - "ContractRescissionsView.tsx"
Cohesion: 0.23
Nodes (15): PropertyFinancialMatrix(), ZFPageHeader(), ApartmentTaxesView(), ContractRescissionsView(), CostAllocationSortOption, CostAllocationView(), ZFFilterDropdown, ZFFilterTab (+7 more)

### Community 11 - "ERPWorkstationShell.tsx"
Cohesion: 0.08
Nodes (32): A. The Shell Layout Architecture: Docked Edge-to-Edge Enterprise Workstation Architecture, ERPWorkstationShell(), MODULE_TITLES_AR, MODULE_TITLES_EN, SIDE_WIDGETS_CONFIG_AR, SIDE_WIDGETS_CONFIG_EN, PropertyLifecycleAuditModal(), getLocalToday() (+24 more)

### Community 12 - "ERPWorkstationProvider"
Cohesion: 0.13
Nodes (7): ERPWorkstationProvider(), ensureUUID(), formatEGP(), generateUUID(), isUUID(), ERPSupabaseService, isAuthError()

### Community 13 - "erp/types.ts"
Cohesion: 0.08
Nodes (37): AttributableCostsResult, DEFAULT_MARGIN_CONFIG, evaluateContractMarginExposure(), evaluatePortfolioMarginExposure(), getAttributableUnitCosts(), getEstimateAgeDays(), getLatestUnitEstimate(), resolveMarginConfig() (+29 more)

### Community 14 - "ZFForm.tsx"
Cohesion: 0.16
Nodes (25): NewChequeModal(), SUPPLEMENT_TYPES, SupplementType, ZFChoices(), ZFChoicesProps, ZFEffect(), ZFFact, ZFField() (+17 more)

### Community 15 - "ZoneInspector.tsx"
Cohesion: 0.06
Nodes (27): findZone(), InspectorStyles(), prettify(), STATUS_LABELS, statusLabel(), TIER_STYLES, tradeTemplateFor(), ZoneInspector() (+19 more)

### Community 16 - "ContractsRegistryView.tsx"
Cohesion: 0.19
Nodes (14): ContractsPage(), Props, useERPWorkstationContext(), ZFContractInspectionModal(), ContractsFilterStatus, ContractsRegistryView(), ContractsSort, ContractsRegistryRouteView() (+6 more)

### Community 17 - "src/types.ts"
Cohesion: 0.22
Nodes (9): PROPERTIES, STATS, TESTIMONIALS, VALUE_PROPS, FilterState, Neighborhood, PropertyVideo, Testimonial (+1 more)

### Community 18 - "instances.ts"
Cohesion: 0.08
Nodes (45): DEMO_PROPERTIES, seedDatabase(), supabase, addOptionalZone(), addTradeToZone(), ApartmentSubType, applyGlobalState(), applyGlobalStateToZone() (+37 more)

### Community 19 - "ClientAppShell.tsx"
Cohesion: 0.20
Nodes (12): ClientAppShell(), ClientAppShellProps, InquiryModal(), InquiryModalProps, LuxuryCursor(), Navbar(), NavbarProps, NavigationProgress() (+4 more)

### Community 20 - "COAFileExplorer.tsx"
Cohesion: 0.24
Nodes (12): AccountInspectorPanel(), COAFileExplorer(), getCategoryIcon(), getAccountSemanticIcon(), getAccountSemanticIconName(), getCategorySemanticIcon(), getCategorySemanticIconName(), SemanticIconOptions (+4 more)

### Community 21 - "package.json"
Cohesion: 0.05
Nodes (39): eslintConfig, name, private, scripts, build, dev, lint, opennext:build (+31 more)

### Community 22 - "ArchitecturalBlueprintInspector.tsx"
Cohesion: 0.07
Nodes (37): CADBlueprintBuilderProps, RoomListRowProps, BodyProps, ZoneInspectorProps, ArchitecturalBlueprintInspector(), ArchitecturalBlueprintInspectorProps, computeRoomTextLayout(), CURATED_ROOM_IMAGES (+29 more)

### Community 23 - "marketIntelligence.ts"
Cohesion: 0.12
Nodes (20): AdminSettingsPageProps, AboutPage(), Props, AboutView(), AboutViewProps, AdminPlatformSettingsProps, TabKey, MarketChart() (+12 more)

### Community 24 - "canonicalMetrics.ts"
Cohesion: 0.12
Nodes (25): 10.A. Canonical Metrics Table, AccountsReceivableOptions, AccountsReceivableResult, AvailableCashOptions, AvailableCashResult, CANONICAL_WIP_ACCOUNTS, CanonicalMetrics, ConstructionWIPOptions (+17 more)

### Community 25 - "ERPPartnerTransaction"
Cohesion: 0.15
Nodes (21): PartnerCapitalInjectionModalProps, PartnerDossierModalProps, PartnerPayoutModalProps, PartnerReallocationModalProps, PartnerDossierDrawerProps, PartnersAnalyticsChartsProps, PartnersDirectoryViewProps, PartnersProjectsViewProps (+13 more)

### Community 26 - "ZFQuickSearchModal.tsx"
Cohesion: 0.14
Nodes (17): DashboardGroupLayout(), LayoutProps, AdminLoginPage(), LoginForm(), onSubmit(), AdminMainContent(), AdminSidebar(), signOut() (+9 more)

### Community 27 - "CatalogView.tsx"
Cohesion: 0.12
Nodes (26): BEDROOM_FILTER_OPTIONS, cardsContainerVariants, CatalogView(), CatalogViewProps, PRICE_FILTER_OPTIONS, SORT_OPTIONS, SortOption, TYPE_FILTER_OPTIONS (+18 more)

### Community 28 - "next"
Cohesion: 0.09
Nodes (8): next, @supabase/ssr, EditPropertyPage(), Props, Props, Props, metadata, PageProps

### Community 29 - "ERPJournalEntry"
Cohesion: 0.41
Nodes (4): PayablesAndLoansSources, InvariantsValidator, ERPJournalEntry, InvariantValidationResult

### Community 30 - "GeneralLedgerView.tsx"
Cohesion: 0.13
Nodes (21): apexcharts, ERPApexChart(), ERPApexChartProps, ERPChartRuntime, ERPChartSeries, ERPTooltipContext, ERPLedgerAmount(), ERPLedgerAmountProps (+13 more)

### Community 31 - "analytics/page.tsx"
Cohesion: 0.10
Nodes (33): AnalyticsPage(), isStale(), Props, AdminLeadsPage(), Props, AdminDashboard(), computeLeadSlaMetrics(), formatTimeAgo() (+25 more)

### Community 32 - "tabRedirectMap.ts"
Cohesion: 0.20
Nodes (10): FinOSCockpitPage(), Props, FinOSRootPage(), Props, CockpitRouteView(), isSideWidgetsTab(), resolveTabRedirect(), TAB_REDIRECT_MAP (+2 more)

### Community 33 - "CostPricingCalculator.tsx"
Cohesion: 0.14
Nodes (26): D. Top-of-Page Anatomy & Quick Actions Policy, ZFPanel(), ZFSegmented(), CATEGORY_LABELS, clamp(), CostPricingCalculator(), fmt(), n() (+18 more)

### Community 34 - "PropertyDetailView.tsx"
Cohesion: 0.21
Nodes (14): @calcom/embed-react, cardVariants, DISTRICT_AR_MAP, getArabicDistrict(), KNOWN_AR_TITLES, PropertyCard(), PropertyCardProps, TYPE_AR_MAP (+6 more)

### Community 35 - "createClient"
Cohesion: 0.21
Nodes (16): deletePropertyPermanently(), getAdminClient(), sanitizePropertyPayload(), saveProperty(), toggleArchiveProperty(), uploadMediaFile(), VALID_PROPERTY_COLUMNS, GET() (+8 more)

### Community 36 - "AccountLedgerModal.tsx"
Cohesion: 0.17
Nodes (15): ACCOUNT_EXPLANATIONS, AccountLedgerModal(), ParsedTransaction, renderBadgeIcon(), GeneralLedgerMindmap(), formatEgp(), LooseRecord, ZFInspectorDrawer() (+7 more)

### Community 37 - "AdminPropertyForm.tsx"
Cohesion: 0.07
Nodes (37): browser-image-compression, @hookform/resolvers, react-dropzone, react-hook-form, @tiptap/extension-placeholder, @tiptap/react, @tiptap/starter-kit, NewPropertyPage() (+29 more)

### Community 38 - "LeadPipeline.tsx"
Cohesion: 0.18
Nodes (24): createLead(), deleteLeadPermanently(), getAdminClient(), normalizeString(), toggleArchiveLead(), updateLeadDetails(), updateLeadStage(), POST() (+16 more)

### Community 39 - "propertyCostEngine.ts"
Cohesion: 0.12
Nodes (20): CHRONOLOGICAL_PHASES, buildConstructionExpenseJournalLines(), BuiltPropertySellingPriceCalculation, calculateBuiltPropertySellingPrice(), CategoryMeta, ConstructionExpenseJournalLine, ConstructionExpensePaymentSource, CostItemEffectiveTotals (+12 more)

### Community 40 - "queries.ts"
Cohesion: 0.14
Nodes (14): ComparePage(), Props, generateStaticParams(), locales, sitemap(), createProperty(), deleteProperty(), ensureSpecLayers() (+6 more)

### Community 41 - "ConstructionPayablesView.tsx"
Cohesion: 0.16
Nodes (15): ConstructionPage(), Props, ConstructionPayablesView(), formatCompactEGP(), formatIntegerEGP(), ConstructionPayablesRouteView(), getConstructionCostSection(), getConstructionPayablesTelemetry() (+7 more)

### Community 42 - "ZFKpiCard"
Cohesion: 0.15
Nodes (17): getSparklinePalette(), ZFKpiAccentColor, ZFKpiWaveSparkline(), ZFKpiWaveSparklineProps, PropertiesInventoryKpis(), PropertiesInventoryKpisProps, CockpitExecutiveChart(), DEFAULT_COCKPIT_MONTHS (+9 more)

### Community 43 - "D"
Cohesion: 0.32
Nodes (14): NewPartnerCommitmentPayload, PartnerDossierDrawer(), PartnersAnalyticsCharts(), PartnersDirectoryView(), PartnersProjectsView(), PartnersSideWidgets(), PartnersTransactionsView(), PartnersManagementView() (+6 more)

### Community 44 - "CADBlueprintBuilder.tsx"
Cohesion: 0.08
Nodes (34): ADAPTIVE_WIZARD_DEFAULTS, AdaptiveWizardAnswers, CADBlueprintBuilder(), flatZones(), leaves(), rec(), relabel(), removeRecursive() (+26 more)

### Community 45 - "MapPicker.tsx"
Cohesion: 0.17
Nodes (14): react-leaflet, EGYPT_PRESET_LOCATIONS, MapEvents(), MapEventsProps, MapMode, MapPicker(), MapPickerProps, MapResizer() (+6 more)

### Community 46 - "react"
Cohesion: 0.12
Nodes (7): react, LedgerPage(), Props, ZFErpBreadcrumbProps, GeneralLedgerRouteView(), LegalVerificationTagProps, OpenQuestionFlagProps

### Community 47 - "PropertiesAdminClient.tsx"
Cohesion: 0.19
Nodes (10): AdminPropertiesPage(), Props, PropertiesAdminClient(), PropertiesAdminClientProps, PropertyCompareClientProps, formatNumber(), formatPrice(), formatPriceParts() (+2 more)

### Community 48 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 49 - "Production Deployment & Maintenance Runbook"
Cohesion: 0.11
Nodes (17): 1.1 GitHub Connection, 1.2 Build Configuration, 1.3 Compatibility Flags (CRITICAL — do not skip), 4.1 Trigger Deploy, 4.2 Post-Deploy Smoke Test (run on the real production URL), Pre-Deployment Gate (must all be ✅ before deploying), Production Deployment & Maintenance Runbook, Scope Boundary (communicate to Zakaria at handover) (+9 more)

### Community 50 - "app/[locale]/layout.tsx"
Cohesion: 0.12
Nodes (16): nextConfig, withNextIntl, lenis, next-intl, LocaleLayout(), Props, LenisProvider(), raf() (+8 more)

### Community 51 - "seed.mjs"
Cohesion: 0.20
Nodes (15): AMENITIES_MAP, APARTMENT_AMENITIES, buildApartmentZones(), buildBuildingZones(), buildDuplexZones(), buildGarageZones(), BUILDING_AMENITIES, __dirname (+7 more)

### Community 52 - "ERPWorkstationContext.tsx"
Cohesion: 0.11
Nodes (19): FinOSLocaleLayout(), LayoutProps, CollectRequest, ERPWorkstationContext, TAB_TITLES_AR, TAB_TITLES_EN, SupplementData, NewPartnerSubmitPayload (+11 more)

### Community 53 - "Export Revamp: Excel + PDF + Decision Reports"
Cohesion: 0.29
Nodes (6): Current state (verified), Export Revamp: Excel + PDF + Decision Reports, Gates, Phases, Reports (phase 1, all four), Target architecture: `src/lib/erp/reports/`

### Community 54 - "apply_full_sync.js"
Cohesion: 0.12
Nodes (13): aboutCode, catalogCode, contactCode, footerCode, fs, homeCode, maintCode, mapCode (+5 more)

### Community 55 - "propertyAdapter.ts"
Cohesion: 0.19
Nodes (15): HomePage(), Props, PropertiesPage(), Props, generateMetadata(), PropertyDetailPage(), Props, getPublicSupabase() (+7 more)

### Community 56 - "Feature Specification: Egyptian Real Estate Construction Layering & Finishing System"
Cohesion: 0.13
Nodes (14): 1. Overview & Objective, 1. Red Brick / طوب أحمر, 2. Semi-Finished / نص تشطيب (محارة وحلوق), 2. Supported Property Types & Structure, 3. Egyptian Finishing Levels & Automation, 3. Fully Finished / تشطيب كامل (سوبر لوكس), 4. Technical Data Schema, 5. User Workflows (+6 more)

### Community 57 - "calcom/route.ts"
Cohesion: 0.43
Nodes (5): fieldValue(), getServiceClient(), POST(), runtime, verifySignature()

### Community 58 - "osFileIcons.test.ts"
Cohesion: 0.52
Nodes (5): OSFileIcon(), OSFileIconProps, OSFolderActiveIcon(), OSFolderIcon(), OSFolderOpenIcon()

### Community 59 - "puppeteer-core"
Cohesion: 0.14
Nodes (8): puppeteer-core, PAGES_TO_CAPTURE, fs, path, puppeteer, fs, path, puppeteer

### Community 60 - "framer-motion"
Cohesion: 0.12
Nodes (13): framer-motion, ADVISORY_PILLARS, PATRON_REVIEWS, SovereignAdvisorySectionProps, getStatsItems(), RollingNumber(), STATS_ITEMS, StatsSection() (+5 more)

### Community 61 - "ZFSkeletonLoader.tsx"
Cohesion: 0.32
Nodes (11): AdminLoading(), GlobalSkeletonStyles(), useSkeletonTheme(), ZFSkeletonCards(), ZFSkeletonCardsProps, ZFSkeletonDashboard(), ZFSkeletonDashboardProps, ZFSkeletonShimmer() (+3 more)

### Community 62 - "ContactView.tsx"
Cohesion: 0.32
Nodes (8): ContactPage(), Props, ContactView(), Footer(), FooterProps, usePlatformSettings(), cleanPhoneNumber(), formatDisplayPhoneNumber()

### Community 63 - "ledger.ts"
Cohesion: 0.22
Nodes (13): AccountInspectorPanelProps, COACategorySelection, COAFileExplorerProps, ACCOUNT_MERCHANT_GUIDE, GeneralLedgerMindmapProps, GeneralLedgerSideWidgets(), GeneralLedgerSideWidgetsProps, BalanceSheetAnalyticsViewProps (+5 more)

### Community 64 - "4. Layout Architecture & Structural Patterns"
Cohesion: 0.06
Nodes (36): 10.B. Operating Cash Suite Getter, 10. Client Operating Cash & Balance Sheet Metrics Specification, 11.A. Skill Orchestration Matrix by Architectural Component & Layer, 11. AI Agent Operating Protocol & Skill Orchestration Matrix, 11.B. The 4-Gate Execution Protocol, 1. Color Palette & Roles, 2. Typography Standards, 3. Spacing, Geometry & Shadows (+28 more)

### Community 65 - "ZFFacts"
Cohesion: 0.29
Nodes (11): ZFFacts(), ZFJournalPeek(), ZFModalShellProps, ContractEscalationModal(), ContractEscalationModalProps, HandoverExecutionModal(), PartnerPayoutModal(), RescissionSettlementModal() (+3 more)

### Community 66 - "ZFModalShell"
Cohesion: 0.30
Nodes (7): 4. Components and behaviors, ZFModalShell(), ZFPrintDocumentLayout(), ZFPrintDocumentLayoutProps, PartnerCapitalInjectionModal(), PartnerDossierModal(), exportPartnerDossierExcel()

### Community 68 - "lucide-react"
Cohesion: 0.22
Nodes (9): lucide-react, ZFDrawerShell(), ZFDrawerShellProps, zfForm, CostAllocationDetailDrawer(), ZFNotificationCenter(), ZFNotificationCenterProps, filterNotificationsByTab() (+1 more)

### Community 69 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, eslint-config-next, @opennextjs/cloudflare, playwright, puppeteer-core, @types/leaflet, @types/node (+3 more)

### Community 70 - "take_full_screenshot.js"
Cohesion: 0.18
Nodes (8): { execSync }, fs, fullScreenshotPath, path, { execSync }, fs, path, screenshotPath

### Community 71 - "lib/mapCache.ts"
Cohesion: 0.20
Nodes (9): leaflet, MapPage(), Props, MapView(), MapViewProps, createCachedTileLayer(), getTileUrlsForLocation(), latLngToTileXY() (+1 more)

### Community 72 - "ref_path"
Cohesion: 0.20
Nodes (7): files, fs, path, content, fs, path, targetFile

### Community 73 - "@supabase/supabase-js"
Cohesion: 0.20
Nodes (10): @opennextjs/cloudflare, @supabase/supabase-js, getAdminClient(), isValidPhone(), isValidUUID(), POST(), RawLeadSchema, stripHtml() (+2 more)

### Community 74 - "ref_fs"
Cohesion: 0.20
Nodes (6): fs, path, puppeteer, fs, path, targetFile

### Community 75 - "أجندة ومواعيد الأقساط وسندات القبض — UI and implementation handoff"
Cohesion: 0.22
Nodes (8): 2. Operator questions, answered in order, 3. Default page composition (desktop) — calendar first, 5. Data projection and metric definitions — never double count, 6. Charts and calendar — visible, truthful analysis, 7. States, motion and copy, 8. Implementation sequence for Gemini (each slice reviewed before the next), 9. Out of scope without separate business approval, أجندة ومواعيد الأقساط وسندات القبض — UI and implementation handoff

### Community 76 - "governance.ts"
Cohesion: 0.33
Nodes (3): ApprovalRule, GovernanceEngine, MAKER_CHECKER_RULES

### Community 77 - "verify_phase3_visuals.js"
Cohesion: 0.22
Nodes (7): playwright, { chromium }, fs, path, ROUTES, SCREENSHOT_DIR, VIEWPORTS

### Community 78 - "searchUtils.ts"
Cohesion: 0.36
Nodes (7): GET(), LOCATION_TRANSLATIONS, matchesSmartQuery(), normalizeArabicText(), ParsedSearchQuery, parseSmartQuery(), PROPERTY_TYPE_MAP

### Community 79 - "ERPInstallmentSchedule"
Cohesion: 0.13
Nodes (13): 1. Business model and source of truth, NewChequeModalProps, ZFCollectInstallmentModalProps, VersionTimelineProps, EscalationEngine, BASE_CONTRACT, BASE_PDC, BASE_SCHEDULE (+5 more)

### Community 80 - "ref_node_assert"
Cohesion: 0.15
Nodes (8): react-dom, cjsRequire, cjsRequire, cjsRequire, cjsRequire, cjsRequire, scanDir(), MockElement

### Community 81 - "test_invariants.ts"
Cohesion: 0.13
Nodes (14): activeSchedules, audits, branch1Rescission, branch2Rescission, contract1Schedules, contract2Schedules, crSum, drSum (+6 more)

### Community 82 - "sync_all_views.js"
Cohesion: 0.25
Nodes (5): fs, NEW_UI, NEXT_APP, path, syncMap

### Community 83 - "CODEX.md - Project Directives, Context & Architectural Invariants"
Cohesion: 0.29
Nodes (6): 1. Quick Orientation & Tech Stack, 2. Human Taste & Learned Negative Constraints (STRICT), 3. Codebase Navigation: Graphify-First, 4. Verification Directives, 5. Skills & Resources, CODEX.md - Project Directives, Context & Architectural Invariants

### Community 84 - "allowScripts"
Cohesion: 0.29
Nodes (7): allowScripts, esbuild@0.25.4, esbuild@0.28.1, @parcel/watcher@2.6.0, @swc/core@1.15.47, unrs-resolver@1.12.2, workerd@1.20260801.1

### Community 85 - "CockpitView.tsx"
Cohesion: 0.23
Nodes (11): AnimatedCounter(), AnimatedCounterProps, enhanceCardsInSlot(), ZFWidgetCard(), ZFWidgetCardProps, ZFWorkstationSideWidgets(), ZFWorkstationSideWidgetsProps, CockpitView() (+3 more)

### Community 86 - "fin-os/layout.tsx"
Cohesion: 0.18
Nodes (8): J. Enterprise Toast Notification Standard (`ZFToaster`), agentation, metadata, FinOSLayout(), metadata, erpToast, ZFToaster(), ZFToasterProps

### Community 88 - "build_pristine_property_detail.js"
Cohesion: 0.33
Nodes (5): content, fs, newUiFile, path, targetFile

### Community 89 - "restore_clean_property_detail.js"
Cohesion: 0.33
Nodes (5): content, fs, newUiFile, path, targetFile

### Community 90 - "verify_uniformity.js"
Cohesion: 0.33
Nodes (4): fs, path, puppeteer, VIEWPORTS

### Community 91 - "ERPPDCRecord"
Cohesion: 0.37
Nodes (11): ERPWorkstationContextValue, CockpitViewProps, AlertEvaluationParams, evaluateFinancialAlerts(), NotificationTabGroup, ERPStoreState, LiveERPDataset, ERPMakerCheckerRequest (+3 more)

### Community 94 - "sync_property_view.js"
Cohesion: 0.33
Nodes (5): content, destPath, fs, path, srcPath

### Community 96 - "accentPalette.ts"
Cohesion: 0.14
Nodes (23): What was done (23 commits, `08ce4b1` → `ad410d8`), 9.A. No Open Color Picker Invariant, 9.B. Curated Presets & Precomputed Tokens, 9.C. Permanent Semantic Status Lock, 9. Curated Accent Palette Customization System (FIN-OS + Admin), 9.D. Runtime Injection & Persistence, AdminAccentBridge(), AdminPaletteMenu() (+15 more)

### Community 97 - "test_portfolio_interactions.js"
Cohesion: 0.40
Nodes (3): fs, path, puppeteer

### Community 98 - "verify_scope_separation.js"
Cohesion: 0.40
Nodes (3): fs, path, puppeteer

### Community 99 - "verify_stream_clicks.js"
Cohesion: 0.40
Nodes (3): fs, path, puppeteer

### Community 100 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 101 - "geocode/route.ts"
Cohesion: 0.47
Nodes (5): extractCoordsFromUrl(), GeocodeResult, POST(), resolveGoogleMapsUrl(), runtime

### Community 144 - "costAdjustmentsAndPayables.test.ts"
Cohesion: 0.26
Nodes (9): checkOrphanedJournalCosts(), findOrphanedWipEntries(), OrphanedCostAuditResult, OrphanedCostEntry, addCostAdjustment(), calculateCostItemEffectiveTotals(), isItemWithinGracePeriod(), recordPayableInstallmentPayment() (+1 more)

### Community 145 - "useERPWorkstation"
Cohesion: 0.16
Nodes (10): CostAllocationPage(), Props, PDCPage(), Props, Props, TaxPage(), useERPWorkstation(), ApartmentTaxesRouteView() (+2 more)

### Community 149 - "AdminERPHub.tsx"
Cohesion: 0.26
Nodes (7): FinOSLoading(), FinOSLocaleLoading(), AdminERPHub(), AdminERPHubProps, ERPWorkspaceTab, ZFERPLoadingWorkstation(), ZFERPLoadingWorkstationProps

### Community 150 - "math.ts"
Cohesion: 0.20
Nodes (8): RFC-4122, B_FIFTY, B_HUNDRED, B_ONE, B_TWO, B_ZERO, cjsRequire, NormalBalance

### Community 151 - "src_components_admin_erp_v2_zfworkstationshell_module"
Cohesion: 0.25
Nodes (5): sonner, ZFChoiceOption, ACCOUNT_NAMES, StrictPaymentMethod, ZFWorkstationHeaderProps

### Community 152 - "partnerAgingEngine.ts"
Cohesion: 0.39
Nodes (7): AgingBucketSummary, calculatePartnerAgingReport(), EvaluatedPartnerCommitment, evaluatePartnerCommitment(), PartnerAgingBucket, PartnerAgingSummary, PartnerCommitmentStatus

### Community 153 - "VersionTimeline.tsx"
Cohesion: 0.32
Nodes (4): BadgeDomain, StatusBadge(), StatusBadgeProps, VersionTimeline()

### Community 154 - "ConstructionFeasibilityRouteView.tsx"
Cohesion: 0.43
Nodes (4): CalculatorPage(), Props, ConstructionFeasibilityView(), ConstructionFeasibilityRouteView()

### Community 155 - "PartnersManagementRouteView.tsx"
Cohesion: 0.47
Nodes (3): PartnersPage(), Props, PartnersManagementRouteView()

### Community 156 - "ContractRescissionsRouteView.tsx"
Cohesion: 0.47
Nodes (3): Props, RescissionsPage(), ContractRescissionsRouteView()

### Community 157 - "ZFPageHeader.tsx"
Cohesion: 0.33
Nodes (4): ZFPageHeaderProps, ZFPanelProps, ZFSegmentedProps, ZFSegmentOption

### Community 158 - "getZoneBadge"
Cohesion: 0.53
Nodes (5): PropertyCompareClient(), getGalleryPhotos(), getSpecInsights(), getZoneBadge(), getZoneTemplateLabels()

### Community 160 - "rsv.ts"
Cohesion: 0.40
Nodes (4): COGSJournalEntryImpact, COGSJournalLine, PortfolioAllocationKPIs, ProjectUnitAllocationItem

### Community 161 - "Handoff — ERP design polish & popup rebuild (2026-10-05)"
Cohesion: 0.50
Nodes (3): Handoff — ERP design polish & popup rebuild (2026-10-05), Open / next, Working agreement (unchanged)

## Knowledge Gaps
- **645 isolated node(s):** `fs`, `path`, `NEW_UI`, `NEXT_APP`, `navbarCode` (+640 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 861 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **52 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `HandInstallmentsVaultView.tsx`, `DailyOperationsView.tsx`, `VersionTimeline.tsx`, `PropertyAnalysisView.tsx`, `Property`, `CostAdjustmentModal.tsx`, `supabase/types.ts`, `ContractRescissionsView.tsx`, `ERPWorkstationShell.tsx`, `ZFForm.tsx`, `ZoneInspector.tsx`, `ContractsRegistryView.tsx`, `useERPWorkstation`, `ClientAppShell.tsx`, `COAFileExplorer.tsx`, `package.json`, `AdminERPHub.tsx`, `marketIntelligence.ts`, `src_components_admin_erp_v2_zfworkstationshell_module`, `ERPPartnerTransaction`, `ConstructionFeasibilityRouteView.tsx`, `ZFQuickSearchModal.tsx`, `PartnersManagementRouteView.tsx`, `ContractRescissionsRouteView.tsx`, `GeneralLedgerView.tsx`, `analytics/page.tsx`, `ZFPageHeader.tsx`, `CostPricingCalculator.tsx`, `tabRedirectMap.ts`, `CatalogView.tsx`, `AccountLedgerModal.tsx`, `AdminPropertyForm.tsx`, `LeadPipeline.tsx`, `propertyCostEngine.ts`, `PropertyDetailView.tsx`, `ConstructionPayablesView.tsx`, `ZFKpiCard`, `D`, `CADBlueprintBuilder.tsx`, `MapPicker.tsx`, `PropertiesAdminClient.tsx`, `app/[locale]/layout.tsx`, `ERPWorkstationContext.tsx`, `osFileIcons.test.ts`, `framer-motion`, `ZFSkeletonLoader.tsx`, `ContactView.tsx`, `ledger.ts`, `ZFFacts`, `ZFModalShell`, `lucide-react`, `lib/mapCache.ts`, `ref_node_assert`, `CockpitView.tsx`, `fin-os/layout.tsx`, `accentPalette.ts`, `ArchitecturalBlueprintInspector.tsx`, `math.ts`?**
  _High betweenness centrality (0.253) - this node is a cross-community bridge._
- **Why does `D()` connect `D` to `HandInstallmentsVaultView.tsx`, `DailyOperationsView.tsx`, `partnersEngine.ts`, `PropertyAnalysisView.tsx`, `Property`, `ERPAccountingPeriod`, `CostAdjustmentModal.tsx`, `supabase/types.ts`, `ContractRescissionsView.tsx`, `ERPWorkstationShell.tsx`, `ERPWorkstationProvider`, `erp/types.ts`, `ZFForm.tsx`, `ContractsRegistryView.tsx`, `costAdjustmentsAndPayables.test.ts`, `COAFileExplorer.tsx`, `math.ts`, `src_components_admin_erp_v2_zfworkstationshell_module`, `canonicalMetrics.ts`, `ERPPartnerTransaction`, `VersionTimeline.tsx`, `partnerAgingEngine.ts`, `ERPJournalEntry`, `GeneralLedgerView.tsx`, `analytics/page.tsx`, `rsv.ts`, `CostPricingCalculator.tsx`, `AccountLedgerModal.tsx`, `LeadPipeline.tsx`, `propertyCostEngine.ts`, `ConstructionPayablesView.tsx`, `ERPWorkstationContext.tsx`, `ledger.ts`, `ZFFacts`, `ZFModalShell`, `RSVEngine`, `lucide-react`, `أجندة ومواعيد الأقساط وسندات القبض — UI and implementation handoff`, `governance.ts`, `ERPInstallmentSchedule`, `ref_node_assert`, `test_invariants.ts`, `CockpitView.tsx`, `ERPPDCRecord`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `lucide-react` to `HandInstallmentsVaultView.tsx`, `DailyOperationsView.tsx`, `PropertyAnalysisView.tsx`, `Property`, `CostAdjustmentModal.tsx`, `supabase/types.ts`, `ContractRescissionsView.tsx`, `ERPWorkstationShell.tsx`, `ZFForm.tsx`, `ZoneInspector.tsx`, `ContractsRegistryView.tsx`, `ClientAppShell.tsx`, `COAFileExplorer.tsx`, `package.json`, `AdminERPHub.tsx`, `marketIntelligence.ts`, `src_components_admin_erp_v2_zfworkstationshell_module`, `ERPPartnerTransaction`, `ZFQuickSearchModal.tsx`, `CatalogView.tsx`, `VersionTimeline.tsx`, `ArchitecturalBlueprintInspector.tsx`, `GeneralLedgerView.tsx`, `analytics/page.tsx`, `CostPricingCalculator.tsx`, `PropertyDetailView.tsx`, `AccountLedgerModal.tsx`, `AdminPropertyForm.tsx`, `LeadPipeline.tsx`, `propertyCostEngine.ts`, `ConstructionPayablesView.tsx`, `ZFKpiCard`, `D`, `CADBlueprintBuilder.tsx`, `MapPicker.tsx`, `react`, `PropertiesAdminClient.tsx`, `framer-motion`, `ContactView.tsx`, `ledger.ts`, `ZFFacts`, `ZFModalShell`, `lib/mapCache.ts`, `CockpitView.tsx`, `fin-os/layout.tsx`, `accentPalette.ts`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `NEW_UI` to the rest of the system?**
  _645 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HandInstallmentsVaultView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10857142857142857 - nodes in this community are weakly interconnected._
- **Should `DailyOperationsView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06586538461538462 - nodes in this community are weakly interconnected._
- **Should `PropertyAnalysisView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07706766917293233 - nodes in this community are weakly interconnected._