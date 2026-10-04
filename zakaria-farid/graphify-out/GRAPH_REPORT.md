# Graph Report - zakaria-farid  (2026-10-04)

## Corpus Check
- 396 files · ~1,287,231 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 65 file(s) not represented in the graph (top: .css 43, .woff2 15, .example 1)

## Summary
- 2285 nodes · 7533 edges · 147 communities (103 shown, 44 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `11401325`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ERPPartnerTransaction
- DailyOperationsView.tsx
- PropertyAnalysisView.tsx
- propertyCostEngine.ts
- HandInstallmentsVaultView.tsx
- ERPContract
- PropertiesPortfolioView.tsx
- instances.ts
- Decimal
- InvariantsValidator
- ref_node_assert
- dependencies
- ERPWorkstationProvider
- ERPAccountingPeriod
- partnersEngine.ts
- ContactView.tsx
- Property
- ZoneInspector.tsx
- ArchitecturalBlueprintInspector.tsx
- CADBlueprintBuilder.tsx
- lib/mapCache.ts
- package.json
- erp/types.ts
- next
- analytics/page.tsx
- framer-motion
- FIN-OS Design System Specification (v2.0)
- createClient
- app/[locale]/layout.tsx
- AdminPropertyForm.tsx
- ERPWorkstationShell.tsx
- ledger.ts
- 4. Layout Architecture & Structural Patterns
- GeneralLedgerView.tsx
- @supabase/supabase-js
- CatalogView.tsx
- AdminPropertyForm
- useERPWorkstation
- lucide-react
- ZFModalShell
- PartnersManagementView.tsx
- src_components_admin_erp_v2_zfworkstationshell_module
- server.ts
- LeadPipeline.tsx
- ZFKpiCard
- queries.ts
- templates.ts
- MapPicker.tsx
- leads/route.ts
- (dashboard-pages)/page.tsx
- compilerOptions
- Production Deployment & Maintenance Runbook
- seed.mjs
- PropertiesAdminClient.tsx
- ZFWorkstationSideWidgets.tsx
- marketIntelligence.ts
- PropertyCompareClient.tsx
- apply_full_sync.js
- math.ts
- HandoverExecutionModal.tsx
- D
- Feature Specification: Egyptian Real Estate Construction Layering & Finishing System
- canonicalMetrics.ts
- ConstructionCostCalculator.tsx
- operationsStreamFilters.ts
- test_priority_triggers.js
- react
- ZFSkeletonLoader.tsx
- fin-os/layout.tsx
- devDependencies
- take_full_screenshot.js
- ref_path
- ref_fs
- ERPWorkstationContext.tsx
- partnerAgingEngine.ts
- أجندة ومواعيد الأقساط وسندات القبض — UI and implementation handoff
- verify_phase3_visuals.js
- notificationEngine.ts
- partnersDirectory.ts
- sync_all_views.js
- CODEX.md - Project Directives, Context & Architectural Invariants
- allowScripts
- scripts
- osFileIcons.test.ts
- PropertyDetailView.tsx
- alter_enum.mjs
- build_pristine_property_detail.js
- restore_clean_property_detail.js
- verify_uniformity.js
- NewContractWizardModal.tsx
- sync_property_view.js
- src/types.ts
- ZFPaletteCustomizer
- verify_stream_clicks.js
- README.md
- tailwind.config.ts
- AGENTS.md
- CockpitDualCharts.tsx
- 3. Spacing, Geometry & Shadows
- 9. Curated Accent Palette Customization System (FIN-OS Exclusive)
- supabase/types.ts
- integrate_blueprint_inspector.js
- ZFCollectInstallmentModal.tsx
- pdcLifecyclePersistence.test.ts
- verify_operations_flow.js
- rsv.ts
- applyGlobalState

## God Nodes (most connected - your core abstractions)
1. `D()` - 278 edges
2. `react` - 198 edges
3. `Property` - 148 edges
4. `Decimal` - 144 edges
5. `ERPContract` - 134 edges
6. `lucide-react` - 130 edges
7. `ERPJournalEntry` - 89 edges
8. `next` - 83 edges
9. `ERPPropertyCostItem` - 74 edges
10. `ERPInstallmentSchedule` - 73 edges

## Surprising Connections (you probably didn't know these)
- `11.A. Skill Orchestration Matrix by Architectural Component & Layer` --references--> `ERPApexChart()`  [INFERRED]
  DESIGN_SYSTEM.md → src/components/admin/erp/v2/charts/ERPApexChart.tsx
- `9.D. Runtime Injection & Persistence` --references--> `ERPApexChart()`  [INFERRED]
  DESIGN_SYSTEM.md → src/components/admin/erp/v2/charts/ERPApexChart.tsx
- `I. Dual-Tier Dropdown Standard (Native Select vs. ZFCustomSelect)` --references--> `ZFCustomSelect()`  [INFERRED]
  DESIGN_SYSTEM.md → src/components/admin/erp/v2/common/ZFCustomSelect.tsx
- `H. Canonical Slide-over Drawer Shell Pattern (`ZFDrawerShell`)` --references--> `ZFDrawerShell()`  [INFERRED]
  DESIGN_SYSTEM.md → src/components/admin/erp/v2/common/ZFDrawerShell.tsx
- `G. Canonical Modal Shell Pattern (`ZFModalShell`)` --references--> `ZFModalShell()`  [INFERRED]
  DESIGN_SYSTEM.md → src/components/admin/erp/v2/common/ZFModalShell.tsx

## Import Cycles
- None detected.

## Communities (147 total, 44 thin omitted)

### Community 0 - "ERPPartnerTransaction"
Cohesion: 0.20
Nodes (19): PartnerCapitalInjectionModalProps, PartnerDossierModalProps, PartnerOperationsModalProps, PartnerPayoutModalProps, PartnerReallocationModalProps, PartnerDossierDrawerProps, PartnersAnalyticsCharts(), PartnersAnalyticsChartsProps (+11 more)

### Community 1 - "DailyOperationsView.tsx"
Cohesion: 0.10
Nodes (34): ZFSearchBar(), DailyOperationsView(), displayDate(), fmt(), formatTime12h(), contract, contracts, e1 (+26 more)

### Community 2 - "PropertyAnalysisView.tsx"
Cohesion: 0.08
Nodes (40): exceljs, AnalysisPage(), Props, getContractStatusLabel(), getCostCategoryLabel(), getCostStatusLabel(), PropertyAnalysisDossier(), PropertyAnalysisSideWidgets() (+32 more)

### Community 3 - "propertyCostEngine.ts"
Cohesion: 0.10
Nodes (27): CHRONOLOGICAL_PHASES, PropertyLifecycleAuditModal(), PropertyLifecycleAuditModalProps, EditPropertyCostModal(), EditPropertyCostModalProps, addCostAdjustment(), buildConstructionExpenseJournalLines(), BuiltPropertySellingPriceCalculation (+19 more)

### Community 4 - "HandInstallmentsVaultView.tsx"
Cohesion: 0.09
Nodes (46): PDCPage(), Props, CostPayableSettlementModalProps, formatNumberWithCommas(), HandInstallmentsVaultView(), InstallmentDetailDrawer(), InstallmentDetailDrawerProps, calculateProjectChartHeight() (+38 more)

### Community 5 - "ERPContract"
Cohesion: 0.09
Nodes (60): 1. Business model and source of truth, AccountLedgerModalProps, ERPWorkstationContextValue, HandCollectionModalProps, NewChequeModalProps, AnimatedCounter(), AnimatedCounterProps, CashCollectionReceiptModalProps (+52 more)

### Community 6 - "PropertiesPortfolioView.tsx"
Cohesion: 0.16
Nodes (16): PropertiesPage(), Props, getCuratedProjectImage(), ProjectShowcaseCard(), ProjectShowcaseCardProps, PropertiesInventoryKpis(), UnitsFloorMatrixTable(), getPropertyTypeLabel() (+8 more)

### Community 7 - "instances.ts"
Cohesion: 0.08
Nodes (42): DEMO_PROPERTIES, seedDatabase(), supabase, ZoneInspectorBody(), sumExcept(), walk(), addCustomZone(), addOptionalZone() (+34 more)

### Community 8 - "Decimal"
Cohesion: 0.05
Nodes (17): ZFCashTransferModalProps, GeneralLedgerMindmapProps, BalanceSheetAnalyticsViewProps, IncomeStatementAnalyticsViewProps, PropertiesInventoryKpisProps, MoneyCellProps, ApprovalRule, GovernanceEngine (+9 more)

### Community 10 - "ref_node_assert"
Cohesion: 0.14
Nodes (10): react-dom, cjsRequire, cjsRequire, cjsRequire, cjsRequire, cjsRequire, cjsRequire, scanDir() (+2 more)

### Community 11 - "dependencies"
Cohesion: 0.04
Nodes (45): dependencies, agentation, apexcharts, browser-image-compression, @calcom/embed-react, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+37 more)

### Community 12 - "ERPWorkstationProvider"
Cohesion: 0.12
Nodes (8): FinOSLocaleLayout(), LayoutProps, ERPWorkstationProvider(), ensureUUID(), generateUUID(), isUUID(), ERPSupabaseService, isAuthError()

### Community 13 - "ERPAccountingPeriod"
Cohesion: 0.09
Nodes (24): activeSchedules, audits, branch1Rescission, branch2Rescission, contract1Schedules, contract2Schedules, crSum, drSum (+16 more)

### Community 14 - "partnersEngine.ts"
Cohesion: 0.23
Nodes (17): PartnerReallocationModal(), ReallocationMode, aggregateProjectPartnershipCards, BuildingEquityBalanceReport, calculateProjectPartnershipCards, checkBuildingEquityBalance(), computeDynamicBuildingCapital(), executeFullInternalBuyout() (+9 more)

### Community 15 - "ContactView.tsx"
Cohesion: 0.19
Nodes (12): AboutPage(), Props, ContactPage(), Props, AboutView(), AboutViewProps, ContactView(), Footer() (+4 more)

### Community 16 - "Property"
Cohesion: 0.16
Nodes (18): ConstructionCostCalculatorProps, PropertyFinancialMatrixProps, NewContractWizardModalProps, RSVAllocationModalProps, CalculatorSideWidgetsProps, ConstructionFeasibilityViewProps, PropertiesAnalyticsView(), PropertiesAnalyticsViewProps (+10 more)

### Community 17 - "ZoneInspector.tsx"
Cohesion: 0.06
Nodes (20): CADBlueprintBuilderProps, BodyProps, findZone(), InspectorStyles(), prettify(), STATUS_LABELS, statusLabel(), TIER_STYLES (+12 more)

### Community 18 - "ArchitecturalBlueprintInspector.tsx"
Cohesion: 0.08
Nodes (30): ArchitecturalBlueprintInspector(), computeRoomTextLayout(), CURATED_ROOM_IMAGES, DEFAULT_TRADE_SPECS, FLOOR_NAME_MAP_AR, formatFloorLabel(), isArabicText(), KNOWN_TEMPLATE_AR_LABELS (+22 more)

### Community 19 - "CADBlueprintBuilder.tsx"
Cohesion: 0.08
Nodes (33): ADAPTIVE_WIZARD_DEFAULTS, AdaptiveWizardAnswers, CADBlueprintBuilder(), flatZones(), leaves(), rec(), relabel(), removeRecursive() (+25 more)

### Community 20 - "lib/mapCache.ts"
Cohesion: 0.18
Nodes (10): leaflet, MapPage(), Props, FLY_DESTINATIONS, MapSection(), MapSectionProps, MapView(), createCachedTileLayer() (+2 more)

### Community 21 - "package.json"
Cohesion: 0.06
Nodes (31): eslintConfig, name, private, version, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, embla-carousel-react (+23 more)

### Community 22 - "erp/types.ts"
Cohesion: 0.08
Nodes (38): AttributableCostsResult, DEFAULT_MARGIN_CONFIG, evaluateContractMarginExposure(), evaluatePortfolioMarginExposure(), getAttributableUnitCosts(), getEstimateAgeDays(), getLatestUnitEstimate(), resolveMarginConfig() (+30 more)

### Community 23 - "next"
Cohesion: 0.09
Nodes (13): next, Props, Props, metadata, PageProps, ClientAppShell(), ClientAppShellProps, LuxuryCursor() (+5 more)

### Community 24 - "analytics/page.tsx"
Cohesion: 0.15
Nodes (22): AnalyticsPage(), isStale(), Props, DistrictDemandMatrix(), DistrictDemandMatrixProps, ExecutiveAdvisoryFeed(), ExecutiveAdvisoryFeedProps, LeadVelocityQueue() (+14 more)

### Community 25 - "framer-motion"
Cohesion: 0.12
Nodes (13): framer-motion, ADVISORY_PILLARS, PATRON_REVIEWS, SovereignAdvisorySectionProps, getStatsItems(), RollingNumber(), STATS_ITEMS, StatsSection() (+5 more)

### Community 26 - "FIN-OS Design System Specification (v2.0)"
Cohesion: 0.17
Nodes (11): 10.B. Operating Cash Suite Getter, 10. Client Operating Cash & Balance Sheet Metrics Specification, 11.A. Skill Orchestration Matrix by Architectural Component & Layer, 11. AI Agent Operating Protocol & Skill Orchestration Matrix, 11.B. The 4-Gate Execution Protocol, 2. Typography Standards, 5. ApexCharts Theming Standards, 6. RTL & Localization Rules (+3 more)

### Community 27 - "createClient"
Cohesion: 0.15
Nodes (15): DashboardGroupLayout(), LayoutProps, AdminLoginPage(), LoginForm(), onSubmit(), AdminMainContent(), AdminSidebar(), signOut() (+7 more)

### Community 28 - "app/[locale]/layout.tsx"
Cohesion: 0.12
Nodes (16): nextConfig, withNextIntl, lenis, next-intl, LocaleLayout(), Props, LenisProvider(), raf() (+8 more)

### Community 29 - "AdminPropertyForm.tsx"
Cohesion: 0.10
Nodes (20): browser-image-compression, @hookform/resolvers, react-dropzone, react-hook-form, @tiptap/extension-placeholder, @tiptap/react, @tiptap/starter-kit, AdminPropertyFormProps (+12 more)

### Community 30 - "ERPWorkstationShell.tsx"
Cohesion: 0.10
Nodes (21): A. The Shell Layout Architecture: Docked Edge-to-Edge Enterprise Workstation Architecture, MODULE_TITLES_AR, MODULE_TITLES_EN, SIDE_WIDGETS_CONFIG_AR, SIDE_WIDGETS_CONFIG_EN, ZFWorkstationHeader(), ZFErpAcademyModal(), ZFErpAcademyModalProps (+13 more)

### Community 31 - "ledger.ts"
Cohesion: 0.18
Nodes (21): AccountInspectorPanel(), AccountInspectorPanelProps, COACategorySelection, COAFileExplorer(), COAFileExplorerProps, getCategoryIcon(), GeneralLedgerSideWidgets(), GeneralLedgerSideWidgetsProps (+13 more)

### Community 32 - "4. Layout Architecture & Structural Patterns"
Cohesion: 0.17
Nodes (12): 4. Layout Architecture & Structural Patterns, C. Sidebar (ZFNavigationDock) Pattern, D. Top-of-Page Anatomy & Quick Actions Policy, F. Canonical Data Table Pattern & Navigation Tabs (`media_1789554942416.png` Blueprint), G. Canonical Modal Shell Pattern (`ZFModalShell`), H. Canonical Slide-over Drawer Shell Pattern (`ZFDrawerShell`), I. Dual-Tier Dropdown Standard (Native Select vs. ZFCustomSelect), K. Action Launchpad Card Pattern (+4 more)

### Community 33 - "GeneralLedgerView.tsx"
Cohesion: 0.21
Nodes (16): apexcharts, ConstructionCostCalculator(), ERPApexChart(), ERPApexChartProps, ERPChartRuntime, ERPChartSeries, ERPTooltipContext, ERPLedgerAmount() (+8 more)

### Community 34 - "@supabase/supabase-js"
Cohesion: 0.21
Nodes (10): @supabase/supabase-js, checkOrphanedJournalCosts(), findOrphanedWipEntries(), OrphanedCostAuditResult, OrphanedCostEntry, fieldValue(), getServiceClient(), POST() (+2 more)

### Community 35 - "CatalogView.tsx"
Cohesion: 0.10
Nodes (34): BEDROOM_FILTER_OPTIONS, cardsContainerVariants, CatalogView(), CatalogViewProps, PRICE_FILTER_OPTIONS, SORT_OPTIONS, SortOption, TYPE_FILTER_OPTIONS (+26 more)

### Community 36 - "AdminPropertyForm"
Cohesion: 0.15
Nodes (12): NewPropertyPage(), Props, AdminPropertyForm(), applyPriceMagnitude(), handleAddViewTag(), handlePriceChange(), onSubmit(), parsePriceDraft() (+4 more)

### Community 37 - "useERPWorkstation"
Cohesion: 0.07
Nodes (31): CalculatorPage(), Props, ConstructionPage(), Props, ContractsPage(), Props, LedgerPage(), Props (+23 more)

### Community 38 - "lucide-react"
Cohesion: 0.09
Nodes (27): lucide-react, CostAllocationPage(), Props, Props, TaxPage(), PropertyFinancialMatrix(), ZFErpBreadcrumb(), ZFErpBreadcrumbProps (+19 more)

### Community 39 - "ZFModalShell"
Cohesion: 0.10
Nodes (35): ERPWorkstationShell(), ContractSupplementModal, NewChequeModal(), SUPPLEMENT_TYPES, SupplementType, getBadgeStyle(), ZFCustomSelect(), ZFCustomSelectItem (+27 more)

### Community 40 - "PartnersManagementView.tsx"
Cohesion: 0.21
Nodes (11): PartnersPage(), Props, NewPartnerCommitmentModal(), NewPartnerCommitmentModalProps, NewPartnerCommitmentPayload, QUICK_MILESTONE_TEMPLATES, PartnerDossierDrawer(), PartnersDirectoryView() (+3 more)

### Community 41 - "src_components_admin_erp_v2_zfworkstationshell_module"
Cohesion: 0.21
Nodes (5): ZFDrawerShell(), ZFDrawerShellProps, CostAllocationDetailDrawer(), ZFNotificationCenter(), RSVEngine

### Community 42 - "server.ts"
Cohesion: 0.19
Nodes (10): @supabase/ssr, EditPropertyPage(), Props, GET(), LOCATION_TRANSLATIONS, matchesSmartQuery(), normalizeArabicText(), ParsedSearchQuery (+2 more)

### Community 43 - "LeadPipeline.tsx"
Cohesion: 0.16
Nodes (26): createLead(), deleteLeadPermanently(), getAdminClient(), normalizeString(), toggleArchiveLead(), updateLeadDetails(), updateLeadStage(), POST() (+18 more)

### Community 44 - "ZFKpiCard"
Cohesion: 0.16
Nodes (16): 8. Explicit "Don't Repeat This" Invariants, getSparklinePalette(), ZFKpiAccentColor, ZFKpiWaveSparkline(), ZFKpiWaveSparklineProps, CockpitExecutiveChart(), DEFAULT_COCKPIT_MONTHS, getBadgePillClass() (+8 more)

### Community 45 - "queries.ts"
Cohesion: 0.12
Nodes (24): HomePage(), Props, ComparePage(), Props, PropertiesPage(), Props, generateMetadata(), generateStaticParams() (+16 more)

### Community 46 - "templates.ts"
Cohesion: 0.13
Nodes (13): SMART_ZONE_SUGGESTIONS, ZONE_CATEGORY_BUCKETS, ZoneCategoryBucket, ATTRIBUTE_TEMPLATES, AttributeTemplate, PROPERTY_TYPE_LABELS, PropertyTypeId, TRADE_TEMPLATES (+5 more)

### Community 47 - "MapPicker.tsx"
Cohesion: 0.14
Nodes (17): react-leaflet, DynamicMapPicker(), DynamicMapPickerProps, MapPicker, EGYPT_PRESET_LOCATIONS, MapEvents(), MapEventsProps, MapMode (+9 more)

### Community 48 - "leads/route.ts"
Cohesion: 0.21
Nodes (10): @opennextjs/cloudflare, zod, getAdminClient(), isValidPhone(), isValidUUID(), POST(), RawLeadSchema, stripHtml() (+2 more)

### Community 49 - "(dashboard-pages)/page.tsx"
Cohesion: 0.20
Nodes (11): AdminLeadsPage(), Props, AdminDashboard(), computeLeadSlaMetrics(), formatTimeAgo(), LeadSlaMetrics, Props, STAGE_CONFIG (+3 more)

### Community 50 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 51 - "Production Deployment & Maintenance Runbook"
Cohesion: 0.11
Nodes (17): 1.1 GitHub Connection, 1.2 Build Configuration, 1.3 Compatibility Flags (CRITICAL — do not skip), 4.1 Trigger Deploy, 4.2 Post-Deploy Smoke Test (run on the real production URL), Pre-Deployment Gate (must all be ✅ before deploying), Production Deployment & Maintenance Runbook, Scope Boundary (communicate to Zakaria at handover) (+9 more)

### Community 52 - "seed.mjs"
Cohesion: 0.20
Nodes (15): AMENITIES_MAP, APARTMENT_AMENITIES, buildApartmentZones(), buildBuildingZones(), buildDuplexZones(), buildGarageZones(), BUILDING_AMENITIES, __dirname (+7 more)

### Community 53 - "PropertiesAdminClient.tsx"
Cohesion: 0.15
Nodes (19): deletePropertyPermanently(), getAdminClient(), sanitizePropertyPayload(), saveProperty(), toggleArchiveProperty(), uploadMediaFile(), VALID_PROPERTY_COLUMNS, AdminPropertiesPage() (+11 more)

### Community 54 - "ZFWorkstationSideWidgets.tsx"
Cohesion: 0.27
Nodes (9): enhanceCardsInSlot(), ZFWidgetCard(), ZFWidgetCardProps, ZFWorkstationSideWidgets(), ZFWorkstationSideWidgetsProps, CalculatorSideWidgets(), PartnersSideWidgets(), PropertiesSideWidgets() (+1 more)

### Community 55 - "marketIntelligence.ts"
Cohesion: 0.16
Nodes (16): AdminSettingsPageProps, AdminPlatformSettingsProps, TabKey, MarketChart(), MarketChartProps, DEFAULT_ABOUT_SETTINGS, DEFAULT_CONTACT_SETTINGS, DEFAULT_HOME_SETTINGS (+8 more)

### Community 56 - "PropertyCompareClient.tsx"
Cohesion: 0.25
Nodes (10): PropertyCompareClient(), getGalleryPhotos(), getSpecInsights(), PropertyCompareClientProps, getZoneBadge(), getZoneTemplateLabels(), formatNumber(), formatPrice() (+2 more)

### Community 57 - "apply_full_sync.js"
Cohesion: 0.12
Nodes (13): aboutCode, catalogCode, contactCode, footerCode, fs, homeCode, maintCode, mapCode (+5 more)

### Community 58 - "math.ts"
Cohesion: 0.13
Nodes (19): RFC-4122, ACCOUNT_EXPLANATIONS, AccountLedgerModal(), ParsedTransaction, renderBadgeIcon(), ACCOUNT_MERCHANT_GUIDE, GeneralLedgerMindmap(), ZFInspectorDrawer() (+11 more)

### Community 59 - "HandoverExecutionModal.tsx"
Cohesion: 0.30
Nodes (8): ContractEscalationModal(), HandoverExecutionModal(), RescissionSettlementModal(), BranchDecisionCard(), LegalVerificationTag(), LegalVerificationTagProps, MoneyCell(), formatEGP()

### Community 60 - "D"
Cohesion: 0.18
Nodes (24): ConstructionPurchaseOrderModal(), CostAdjustmentModal(), CostAdjustmentModalProps, CostPayableSettlementModal(), ConstructionPayablesView(), formatCompactEGP(), formatIntegerEGP(), formatEgp() (+16 more)

### Community 61 - "Feature Specification: Egyptian Real Estate Construction Layering & Finishing System"
Cohesion: 0.13
Nodes (14): 1. Overview & Objective, 1. Red Brick / طوب أحمر, 2. Semi-Finished / نص تشطيب (محارة وحلوق), 2. Supported Property Types & Structure, 3. Egyptian Finishing Levels & Automation, 3. Fully Finished / تشطيب كامل (سوبر لوكس), 4. Technical Data Schema, 5. User Workflows (+6 more)

### Community 62 - "canonicalMetrics.ts"
Cohesion: 0.11
Nodes (28): 10.A. Canonical Metrics Table, AccountsReceivableOptions, AccountsReceivableResult, AvailableCashOptions, AvailableCashResult, CANONICAL_WIP_ACCOUNTS, CanonicalMetrics, ConstructionWIPOptions (+20 more)

### Community 63 - "ConstructionCostCalculator.tsx"
Cohesion: 0.12
Nodes (18): 4. Components and behaviors, sonner, CalculatorMode, FINISHING_TIER_COSTS, FinishingTier, PropertyConstructionType, useERPWorkstationContext(), FilterTab (+10 more)

### Community 64 - "operationsStreamFilters.ts"
Cohesion: 0.32
Nodes (15): buildTransactionInspectionPayload(), computeUpcomingDues(), formatEGPInteger(), getStreamFilterLabel(), matchesIn0(), matchesIn1(), matchesIn2(), matchesIn3() (+7 more)

### Community 65 - "test_priority_triggers.js"
Cohesion: 0.40
Nodes (3): fs, path, puppeteer

### Community 66 - "react"
Cohesion: 0.11
Nodes (10): react, FinOSLoading(), FinOSLocaleLoading(), Props, RescissionsPage(), ZFSearchBarProps, ZFERPLoadingWorkstation(), ZFERPLoadingWorkstationProps (+2 more)

### Community 67 - "ZFSkeletonLoader.tsx"
Cohesion: 0.19
Nodes (16): AdminLoading(), extractCoordsFromUrl(), GeocodeResult, POST(), resolveGoogleMapsUrl(), runtime, GlobalSkeletonStyles(), useSkeletonTheme() (+8 more)

### Community 68 - "fin-os/layout.tsx"
Cohesion: 0.18
Nodes (8): J. Enterprise Toast Notification Standard (`ZFToaster`), agentation, metadata, FinOSLayout(), metadata, erpToast, ZFToaster(), ZFToasterProps

### Community 69 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, eslint-config-next, @opennextjs/cloudflare, playwright, puppeteer-core, @types/leaflet, @types/node (+3 more)

### Community 70 - "take_full_screenshot.js"
Cohesion: 0.18
Nodes (8): { execSync }, fs, fullScreenshotPath, path, { execSync }, fs, path, screenshotPath

### Community 71 - "ref_path"
Cohesion: 0.22
Nodes (6): files, fs, path, fs, path, targetFile

### Community 72 - "ref_fs"
Cohesion: 0.11
Nodes (11): puppeteer-core, PAGES_TO_CAPTURE, fs, path, puppeteer, fs, path, puppeteer (+3 more)

### Community 73 - "ERPWorkstationContext.tsx"
Cohesion: 0.09
Nodes (29): FinOSRootPage(), Props, AdminERPHub(), AdminERPHubProps, CollectRequest, ERPWorkspaceTab, ERPWorkstationContext, TAB_TITLES_AR (+21 more)

### Community 74 - "partnerAgingEngine.ts"
Cohesion: 0.39
Nodes (7): AgingBucketSummary, calculatePartnerAgingReport(), EvaluatedPartnerCommitment, evaluatePartnerCommitment(), PartnerAgingBucket, PartnerAgingSummary, PartnerCommitmentStatus

### Community 75 - "أجندة ومواعيد الأقساط وسندات القبض — UI and implementation handoff"
Cohesion: 0.22
Nodes (8): 2. Operator questions, answered in order, 3. Default page composition (desktop) — calendar first, 5. Data projection and metric definitions — never double count, 6. Charts and calendar — visible, truthful analysis, 7. States, motion and copy, 8. Implementation sequence for Gemini (each slice reviewed before the next), 9. Out of scope without separate business approval, أجندة ومواعيد الأقساط وسندات القبض — UI and implementation handoff

### Community 76 - "verify_phase3_visuals.js"
Cohesion: 0.22
Nodes (7): playwright, { chromium }, fs, path, ROUTES, SCREENSHOT_DIR, VIEWPORTS

### Community 77 - "notificationEngine.ts"
Cohesion: 0.26
Nodes (10): ZFNotificationCenterProps, evaluateFinancialAlerts(), filterNotificationsByTab(), getPersistedNotificationState(), NotificationTabGroup, persistClearAll(), persistMarkAllRead(), persistNotificationDismiss() (+2 more)

### Community 78 - "partnersDirectory.ts"
Cohesion: 0.20
Nodes (10): NewContractWizardPayload, autoBalanceShares(), getRegisteredPartners(), getUnifiedPartnersDirectory(), INITIAL_REGISTERED_PARTNERS, PartnerShareItem, saveRegisteredPartner(), smartAddPartner() (+2 more)

### Community 79 - "sync_all_views.js"
Cohesion: 0.25
Nodes (5): fs, NEW_UI, NEXT_APP, path, syncMap

### Community 80 - "CODEX.md - Project Directives, Context & Architectural Invariants"
Cohesion: 0.29
Nodes (6): 1. Quick Orientation & Tech Stack, 2. Human Taste & Learned Negative Constraints (STRICT), 3. Codebase Navigation: Graphify-First, 4. Verification Directives, 5. Skills & Resources, CODEX.md - Project Directives, Context & Architectural Invariants

### Community 81 - "allowScripts"
Cohesion: 0.29
Nodes (7): allowScripts, esbuild@0.25.4, esbuild@0.28.1, @parcel/watcher@2.6.0, @swc/core@1.15.47, unrs-resolver@1.12.2, workerd@1.20260801.1

### Community 82 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, opennext:build, start, test

### Community 83 - "osFileIcons.test.ts"
Cohesion: 0.52
Nodes (5): OSFileIcon(), OSFileIconProps, OSFolderActiveIcon(), OSFolderIcon(), OSFolderOpenIcon()

### Community 84 - "PropertyDetailView.tsx"
Cohesion: 0.23
Nodes (12): @calcom/embed-react, InquiryModal(), InquiryModalProps, PropertyDetailView(), SanctumSatelliteMap(), ViewingScheduler(), ViewingSchedulerProps, adaptProperty() (+4 more)

### Community 86 - "build_pristine_property_detail.js"
Cohesion: 0.33
Nodes (5): content, fs, newUiFile, path, targetFile

### Community 87 - "restore_clean_property_detail.js"
Cohesion: 0.33
Nodes (5): content, fs, newUiFile, path, targetFile

### Community 88 - "verify_uniformity.js"
Cohesion: 0.33
Nodes (4): fs, path, puppeteer, VIEWPORTS

### Community 89 - "NewContractWizardModal.tsx"
Cohesion: 0.26
Nodes (19): NewContractWizardModal(), ERPPortfolioMapModal(), ERPPortfolioMapModalProps, normalizePartnerSplits(), smartRemovePartner(), calculateProjectCardMetrics(), canSellWholeBuilding(), getAvailableUnitsForProperty() (+11 more)

### Community 90 - "sync_property_view.js"
Cohesion: 0.33
Nodes (5): content, destPath, fs, path, srcPath

### Community 91 - "src/types.ts"
Cohesion: 0.22
Nodes (9): PROPERTIES, STATS, TESTIMONIALS, VALUE_PROPS, FilterState, Neighborhood, PropertyVideo, Testimonial (+1 more)

### Community 92 - "ZFPaletteCustomizer"
Cohesion: 0.22
Nodes (9): 1. Color Palette & Roles, A. Core Tokens, B. Borders & Dividers, B. Top Navbar Pattern, C. Typography Colors, D. Semantic Financial State & Status Micro-Pills, E. Discrete Floating Stat Cards Pattern (`ZFKpiCard` & `.discreteKpiGrid`), E. Dynamic Palette Customizer & Token Reactivity (+1 more)

### Community 93 - "verify_stream_clicks.js"
Cohesion: 0.40
Nodes (3): fs, path, puppeteer

### Community 94 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 136 - "CockpitDualCharts.tsx"
Cohesion: 0.29
Nodes (5): CashflowTimelineMonth, CockpitDualCharts(), CockpitDualChartsProps, ProjectComparisonItem, UnitScale

### Community 137 - "3. Spacing, Geometry & Shadows"
Cohesion: 0.40
Nodes (5): 3. Spacing, Geometry & Shadows, Border Radius Scale, RTL Whitespace Uniformity & 100vw Prohibition, Shadow Policy: Hairlines Over Shadows, Spacing Scale

### Community 138 - "9. Curated Accent Palette Customization System (FIN-OS Exclusive)"
Cohesion: 0.40
Nodes (5): 9.A. No Open Color Picker Invariant, 9.B. Curated Presets & Precomputed Tokens, 9.C. Permanent Semantic Status Lock, 9. Curated Accent Palette Customization System (FIN-OS Exclusive), 9.D. Runtime Injection & Persistence

### Community 139 - "supabase/types.ts"
Cohesion: 0.17
Nodes (11): BuildingOwnershipLogEntry, Booking, BookingStatus, BuildingSaleMode, CompletionStatus, ListingStatus, PropertyAmenity, PropertyImage (+3 more)

### Community 140 - "integrate_blueprint_inspector.js"
Cohesion: 0.40
Nodes (4): content, fs, path, targetFile

### Community 141 - "ZFCollectInstallmentModal.tsx"
Cohesion: 0.29
Nodes (7): getLocalToday(), ZFCashTransferModal(), formatDDMMYYYY(), getLocalTodayDate(), isScheduleOutstanding(), ZFCollectInstallmentModal(), formatNumberWithCommas()

### Community 142 - "pdcLifecyclePersistence.test.ts"
Cohesion: 0.29
Nodes (5): BASE_CONTRACT, BASE_PDC, BASE_SCHEDULE, CLOSED_PERIOD, TEST_PERIOD

### Community 143 - "verify_operations_flow.js"
Cohesion: 0.40
Nodes (3): fs, path, puppeteer

### Community 144 - "rsv.ts"
Cohesion: 0.40
Nodes (4): COGSJournalEntryImpact, COGSJournalLine, PortfolioAllocationKPIs, ProjectUnitAllocationItem

### Community 145 - "applyGlobalState"
Cohesion: 0.60
Nodes (5): applyGlobalState(), applyGlobalStateToZone(), buildTradeInstances(), getStatusForTrade(), getTradesForZone()

## Knowledge Gaps
- **628 isolated node(s):** `fs`, `path`, `NEW_UI`, `NEXT_APP`, `navbarCode` (+623 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 824 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `ERPPartnerTransaction`, `DailyOperationsView.tsx`, `PropertyAnalysisView.tsx`, `propertyCostEngine.ts`, `HandInstallmentsVaultView.tsx`, `ERPContract`, `PropertiesPortfolioView.tsx`, `CockpitDualCharts.tsx`, `ref_node_assert`, `ERPWorkstationProvider`, `ZFCollectInstallmentModal.tsx`, `partnersEngine.ts`, `ContactView.tsx`, `Property`, `ZoneInspector.tsx`, `ArchitecturalBlueprintInspector.tsx`, `CADBlueprintBuilder.tsx`, `lib/mapCache.ts`, `package.json`, `next`, `analytics/page.tsx`, `framer-motion`, `createClient`, `app/[locale]/layout.tsx`, `AdminPropertyForm.tsx`, `ERPWorkstationShell.tsx`, `ledger.ts`, `GeneralLedgerView.tsx`, `CatalogView.tsx`, `useERPWorkstation`, `lucide-react`, `ZFModalShell`, `PartnersManagementView.tsx`, `src_components_admin_erp_v2_zfworkstationshell_module`, `LeadPipeline.tsx`, `ZFKpiCard`, `MapPicker.tsx`, `PropertiesAdminClient.tsx`, `ZFWorkstationSideWidgets.tsx`, `marketIntelligence.ts`, `PropertyCompareClient.tsx`, `math.ts`, `HandoverExecutionModal.tsx`, `D`, `ConstructionCostCalculator.tsx`, `ZFSkeletonLoader.tsx`, `fin-os/layout.tsx`, `ERPWorkstationContext.tsx`, `notificationEngine.ts`, `osFileIcons.test.ts`, `PropertyDetailView.tsx`, `NewContractWizardModal.tsx`?**
  _High betweenness centrality (0.247) - this node is a cross-community bridge._
- **Why does `D()` connect `D` to `ERPPartnerTransaction`, `DailyOperationsView.tsx`, `PropertyAnalysisView.tsx`, `propertyCostEngine.ts`, `HandInstallmentsVaultView.tsx`, `ERPContract`, `PropertiesPortfolioView.tsx`, `Decimal`, `InvariantsValidator`, `ref_node_assert`, `ERPWorkstationProvider`, `ERPAccountingPeriod`, `partnersEngine.ts`, `ZFCollectInstallmentModal.tsx`, `rsv.ts`, `erp/types.ts`, `analytics/page.tsx`, `ledger.ts`, `GeneralLedgerView.tsx`, `useERPWorkstation`, `lucide-react`, `ZFModalShell`, `PartnersManagementView.tsx`, `src_components_admin_erp_v2_zfworkstationshell_module`, `LeadPipeline.tsx`, `ZFWorkstationSideWidgets.tsx`, `math.ts`, `HandoverExecutionModal.tsx`, `canonicalMetrics.ts`, `ConstructionCostCalculator.tsx`, `operationsStreamFilters.ts`, `ref_fs`, `ERPWorkstationContext.tsx`, `partnerAgingEngine.ts`, `أجندة ومواعيد الأقساط وسندات القبض — UI and implementation handoff`, `notificationEngine.ts`, `NewContractWizardModal.tsx`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `lucide-react` to `ERPPartnerTransaction`, `DailyOperationsView.tsx`, `PropertyAnalysisView.tsx`, `propertyCostEngine.ts`, `HandInstallmentsVaultView.tsx`, `ERPContract`, `PropertiesPortfolioView.tsx`, `CockpitDualCharts.tsx`, `ZFCollectInstallmentModal.tsx`, `partnersEngine.ts`, `ContactView.tsx`, `Property`, `ZoneInspector.tsx`, `ArchitecturalBlueprintInspector.tsx`, `CADBlueprintBuilder.tsx`, `lib/mapCache.ts`, `package.json`, `next`, `analytics/page.tsx`, `framer-motion`, `createClient`, `AdminPropertyForm.tsx`, `ERPWorkstationShell.tsx`, `ledger.ts`, `GeneralLedgerView.tsx`, `CatalogView.tsx`, `useERPWorkstation`, `ZFModalShell`, `PartnersManagementView.tsx`, `src_components_admin_erp_v2_zfworkstationshell_module`, `LeadPipeline.tsx`, `ZFKpiCard`, `MapPicker.tsx`, `(dashboard-pages)/page.tsx`, `PropertiesAdminClient.tsx`, `ZFWorkstationSideWidgets.tsx`, `marketIntelligence.ts`, `PropertyCompareClient.tsx`, `math.ts`, `HandoverExecutionModal.tsx`, `D`, `ConstructionCostCalculator.tsx`, `react`, `fin-os/layout.tsx`, `ERPWorkstationContext.tsx`, `notificationEngine.ts`, `PropertyDetailView.tsx`, `NewContractWizardModal.tsx`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `NEW_UI` to the rest of the system?**
  _628 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `DailyOperationsView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09986504723346828 - nodes in this community are weakly interconnected._
- **Should `PropertyAnalysisView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07706766917293233 - nodes in this community are weakly interconnected._
- **Should `propertyCostEngine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10252100840336134 - nodes in this community are weakly interconnected._