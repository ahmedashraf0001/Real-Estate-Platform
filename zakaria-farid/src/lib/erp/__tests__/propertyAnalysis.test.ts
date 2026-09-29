import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculateSinglePropertyAnalysis, 
  calculatePortfolioMacroAnalysis,
  getContractsForProperty,
  formatCompactEGP
} from '../propertyAnalysisEngine';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPContract, ERPPropertyCostItem, ERPJournalEntry } from '../types';
import { D } from '../math';

describe('Property Lifecycle & Investment Analysis Engine Suite', () => {
  // Mock Property Data
  const mockApartment: Property = {
    id: 'prop-apt-01',
    slug: 'prop-apt-01',
    title_ar: 'شقة نرجس ريزيدنس',
    title_en: 'Nargis Residence Apt',
    description_ar: 'شقة فاخرة',
    description_en: 'Luxury Apartment',
    price_egp: 4000000,
    bedrooms: 3,
    bathrooms: 2,
    area_sqm: 200,
    type: 'apartment',
    location: 'التجمع الخامس',
    latitude: 30.0,
    longitude: 31.0,
    completion_status: 'off_plan',
    listing_status: 'active',
    is_featured: true,
    created_at: '2026-01-15T10:00:00Z',
    total_units_count: 1
  };

  const mockBuildingUnits: BuildingUnitItem[] = [
    {
      unit_id: 'unit-101',
      unit_number: 'شقة 101',
      floor: 1,
      area_sqm: 150,
      bedrooms: 3,
      bathrooms: 2,
      price_egp: 2500000,
      status: 'contracted',
      contract_id: 'ct-01'
    },
    {
      unit_id: 'unit-102',
      unit_number: 'شقة 102',
      floor: 1,
      area_sqm: 150,
      bedrooms: 3,
      bathrooms: 2,
      price_egp: 2500000,
      status: 'available'
    },
    {
      unit_id: 'unit-201',
      unit_number: 'شقة 201',
      floor: 2,
      area_sqm: 180,
      bedrooms: 4,
      bathrooms: 3,
      price_egp: 3000000,
      status: 'contracted',
      contract_id: 'ct-02'
    },
    {
      unit_id: 'unit-202',
      unit_number: 'شقة 202',
      floor: 2,
      area_sqm: 180,
      bedrooms: 4,
      bathrooms: 3,
      price_egp: 3000000,
      status: 'available'
    }
  ];

  const mockBuilding: Property = {
    id: 'prop-bldg-01',
    slug: 'prop-bldg-01',
    title_ar: 'عمارة الياسمين الراقية',
    title_en: 'Yasmine Prime Building',
    description_ar: 'عمارة سكنية متكاملة 4 وحدات',
    description_en: '4-Unit Prime Residential Building',
    price_egp: 11000000,
    bedrooms: 14,
    bathrooms: 10,
    area_sqm: 660,
    type: 'building',
    location: 'الياسمين، القاهرة الجديدة',
    latitude: 30.05,
    longitude: 31.05,
    completion_status: 'off_plan',
    listing_status: 'active',
    is_featured: true,
    created_at: '2026-02-01T10:00:00Z',
    building_units: mockBuildingUnits,
    total_units_count: 4
  };

  const mockCosts: ERPPropertyCostItem[] = [
    // Land Allocation
    {
      item_id: 'c-01',
      id: 'c-01',
      property_id: 'prop-bldg-01',
      category: 'land_allocation',
      phase: 'planning_permits',
      item_name_ar: 'حصة الأرض المحملة للمشروع',
      item_name_en: 'Land Allocation',
      quantity: 1,
      unit: 'مقطوعية',
      unit_cost_egp: '2000000.00',
      total_cost_egp: '2000000.00',
      logged_date: '2026-02-05',
      logged_by: 'ENGINEER',
      status: 'verified',
      supplier_contractor: 'شركة الاستصلاح والتعمير',
      created_at: '2026-02-05T10:00:00Z'
    },
    // Permits & Fees
    {
      item_id: 'c-02',
      id: 'c-02',
      property_id: 'prop-bldg-01',
      category: 'permits_engineering',
      phase: 'planning_permits',
      item_name_ar: 'رسوم تراخيص جهاز المدينة ومخططات هندسية',
      item_name_en: 'City Permits & Drawings',
      quantity: 1,
      unit: 'مقطوعية',
      unit_cost_egp: '300000.00',
      total_cost_egp: '300000.00',
      logged_date: '2026-02-10',
      logged_by: 'ENGINEER',
      status: 'verified',
      supplier_contractor: 'المكتب الهندسي الاستشاري',
      created_at: '2026-02-10T10:00:00Z'
    },
    {
      item_id: 'c-03',
      id: 'c-03',
      property_id: 'prop-bldg-01',
      category: 'taxes_fees',
      phase: 'planning_permits',
      item_name_ar: 'ضرائب ورسوم تحسين',
      item_name_en: 'Taxes & Betterment Levies',
      quantity: 1,
      unit: 'مقطوعية',
      unit_cost_egp: '100000.00',
      total_cost_egp: '100000.00',
      logged_date: '2026-02-12',
      logged_by: 'ENGINEER',
      status: 'verified',
      supplier_contractor: 'الضرائب العقارية',
      created_at: '2026-02-12T10:00:00Z'
    },
    // Structure: Civil + Labor
    {
      item_id: 'c-04',
      id: 'c-04',
      property_id: 'prop-bldg-01',
      category: 'civil_structure',
      phase: 'structural_skeleton',
      item_name_ar: 'توريد حديد عز وخرسانة جاهزة سيمكس',
      item_name_en: 'Steel and Ready-mix Concrete',
      quantity: 1,
      unit: 'مقطوعية',
      unit_cost_egp: '2500000.00',
      total_cost_egp: '2500000.00',
      logged_date: '2026-03-01',
      logged_by: 'ENGINEER',
      status: 'verified',
      supplier_contractor: 'شركة سيمكس للخرسانة',
      created_at: '2026-03-01T10:00:00Z'
    },
    {
      item_id: 'c-05',
      id: 'c-05',
      property_id: 'prop-bldg-01',
      category: 'labor_subcontractor',
      phase: 'structural_skeleton',
      item_name_ar: 'مصنعيات نجارة وحدادة وصب الأساسات والأعمدة',
      item_name_en: 'Structural Skeleton Labor',
      quantity: 1,
      unit: 'مقطوعية',
      unit_cost_egp: '500000.00',
      total_cost_egp: '500000.00',
      logged_date: '2026-03-15',
      logged_by: 'ENGINEER',
      status: 'verified',
      supplier_contractor: 'مقاول مصنعيات الهيكل',
      created_at: '2026-03-15T10:00:00Z'
    },
    // MEP
    {
      item_id: 'c-06',
      id: 'c-06',
      property_id: 'prop-bldg-01',
      category: 'mep_infrastructure',
      phase: 'masonry_roughing',
      item_name_ar: 'تأسيس شبكات الصرف والتغذية وكابلات السويدي',
      item_name_en: 'MEP Infrastructure Roughing',
      quantity: 1,
      unit: 'مقطوعية',
      unit_cost_egp: '600000.00',
      total_cost_egp: '600000.00',
      logged_date: '2026-04-01',
      logged_by: 'ENGINEER',
      status: 'verified',
      supplier_contractor: 'مقاولات الكهروميكانيك',
      created_at: '2026-04-01T10:00:00Z'
    },
    // Finishing & Facade
    {
      item_id: 'c-07',
      id: 'c-07',
      property_id: 'prop-bldg-01',
      category: 'finishing_interior',
      phase: 'finishing_interiors',
      item_name_ar: 'محارة وأعمال دهانات داخلية',
      item_name_en: 'Plaster and Interior Paints',
      quantity: 1,
      unit: 'مقطوعية',
      unit_cost_egp: '400000.00',
      total_cost_egp: '400000.00',
      logged_date: '2026-05-01',
      logged_by: 'ENGINEER',
      status: 'verified',
      supplier_contractor: 'مقاول تشطيبات',
      created_at: '2026-05-01T10:00:00Z'
    },
    {
      item_id: 'c-08',
      id: 'c-08',
      property_id: 'prop-bldg-01',
      category: 'site_facade',
      phase: 'finishing_interiors',
      item_name_ar: 'تشطيب واجهات حجر هاشمي ودرابزينات',
      item_name_en: 'Façade Stones and Balustrades',
      quantity: 1,
      unit: 'مقطوعية',
      unit_cost_egp: '300000.00',
      total_cost_egp: '300000.00',
      logged_date: '2026-05-15',
      logged_by: 'ENGINEER',
      status: 'verified',
      supplier_contractor: 'مقاول واجهات',
      created_at: '2026-05-15T10:00:00Z'
    }
  ];

  const mockContracts: ERPContract[] = [
    {
      contract_id: 'ct-01',
      contract_number: 'CNT-2026-001',
      unit_id: 'unit-101',
      property_id: 'prop-bldg-01',
      buyer_name: 'محمد أحمد إبراهيم',
      gross_contract_value: '2500000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-03-01',
      handover_status: 'Pending',
      total_cash_collected: '1500000.00',
      status: 'Active'
    },
    {
      contract_id: 'ct-02',
      contract_number: 'CNT-2026-002',
      unit_id: 'unit-201',
      property_id: 'prop-bldg-01',
      buyer_name: 'سارة مصطفى كمال',
      gross_contract_value: '3000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-03-10',
      handover_status: 'Pending',
      total_cash_collected: '1000000.00',
      status: 'Active'
    }
  ];

  const mockJournalEntries: ERPJournalEntry[] = [
    {
      entry_id: 'je-01',
      entry_number: 'JV-2026-001',
      entry_date: '2026-02-01',
      period_id: '2026-Q1',
      description: 'Opening Cash in Safe',
      source_module: 'MANUAL',
      created_by: 'ADMIN',
      is_locked: false,
      created_at: '2026-02-01T08:00:00Z',
      lines: [
        {
          line_id: 'line-1',
          entry_id: 'je-01',
          line_number: 1,
          account_code: '101000',
          debit_amount: '5000000.00',
          credit_amount: '0.00'
        },
        {
          line_id: 'line-2',
          entry_id: 'je-01',
          line_number: 2,
          account_code: '301000',
          debit_amount: '0.00',
          credit_amount: '5000000.00'
        }
      ]
    }
  ];

  describe('1. Single Property Math Derivation', () => {
    it('accurately computes total invested capital and category breakdowns without double counting land', () => {
      const analysis = calculateSinglePropertyAnalysis({
        property: mockBuilding,
        propertyCosts: mockCosts,
        contracts: mockContracts
      });

      // Land cost = 2,000,000
      assert.strictEqual(analysis.breakdown.landCost.toFixed(2), '2000000.00');

      // Structure = 2.5M + 500K = 3,000,000
      assert.strictEqual(analysis.breakdown.structureWip.toFixed(2), '3000000.00');

      // Finishing = 400K + 300K = 700,000
      assert.strictEqual(analysis.breakdown.finishingWip.toFixed(2), '700000.00');

      // MEP = 600,000
      assert.strictEqual(analysis.breakdown.mepWip.toFixed(2), '600000.00');

      // Permits = 300K + 100K = 400,000
      assert.strictEqual(analysis.breakdown.permitsFees.toFixed(2), '400000.00');

      // Total Construction WIP (excluding land to prevent double-counting):
      // 3.0M + 700K + 600K + 400K = 4,700,000.00
      assert.strictEqual(analysis.breakdown.totalConstructionWip.toFixed(2), '4700000.00');

      // Total Invested Capital = Land (2M) + Construction WIP (4.7M) = 6,700,000.00
      assert.strictEqual(analysis.breakdown.totalInvestedCapital.toFixed(2), '6700000.00');
    });

    it('accurately derives sales absorption, cash collection, and pending A/R', () => {
      const analysis = calculateSinglePropertyAnalysis({
        property: mockBuilding,
        propertyCosts: mockCosts,
        contracts: mockContracts
      });

      // Units: 4 total, 2 contracted (101, 201), 2 available
      assert.strictEqual(analysis.totalUnits, 4);
      assert.strictEqual(analysis.soldUnits, 2);
      assert.strictEqual(analysis.remainingUnits, 2);
      assert.strictEqual(analysis.absorptionRatePct.toFixed(1), '50.0');

      // Contracted sales: 2.5M + 3.0M = 5.5M
      assert.strictEqual(analysis.contractedSales.toFixed(2), '5500000.00');

      // Cash collected: 1.5M + 1.0M = 2.5M
      assert.strictEqual(analysis.collectedCash.toFixed(2), '2500000.00');

      // Pending A/R: 5.5M - 2.5M = 3.0M
      assert.strictEqual(analysis.pendingReceivables.toFixed(2), '3000000.00');
    });

    it('accurately calculates expected total sales, net profit, gross margin %, and ROI % with correct mathematical basis', () => {
      const analysis = calculateSinglePropertyAnalysis({
        property: mockBuilding,
        propertyCosts: mockCosts,
        contracts: mockContracts
      });

      // Expected total sales = 2.5M + 2.5M + 3M + 3M = 11,000,000 EGP
      assert.strictEqual(analysis.expectedTotalSales.toFixed(2), '11000000.00');

      // Total investment = Land (2M) + Construction WIP (4.7M) = 6,700,000 EGP
      assert.strictEqual(analysis.breakdown.totalInvestedCapital.toFixed(2), '6700000.00');

      // Net expected profit = 11,000,000 - 6,700,000 = 4,300,000 EGP
      assert.strictEqual(analysis.netExpectedProfit.toFixed(2), '4300000.00');

      // Gross Margin % = (4,300,000 / 11,000,000) * 100 = 39.0909...% -> 39.09%
      assert.strictEqual(analysis.grossMarginPct.toFixed(2), '39.09');

      // ROI % = (4,300,000 / 6,700,000) * 100 = 64.179...% -> 64.18%
      assert.strictEqual(analysis.roiPct.toFixed(2), '64.18');

      // Unit meter cost = 6,700,000 / 660 sqm = 10,151.52 EGP/sqm
      assert.strictEqual(analysis.unitMeterCost.toFixed(2), '10151.52');

      // Sales meter price = 11,000,000 / 660 sqm = 16,666.67 EGP/sqm
      assert.strictEqual(analysis.salesMeterPrice.toFixed(2), '16666.67');
    });
  });

  describe('2. Milestone Stepper Ordering & Integrity', () => {
    it('contains strictly 6 ordered milestones from Acquisition to Handover with real dates', () => {
      const analysis = calculateSinglePropertyAnalysis({
        property: mockBuilding,
        propertyCosts: mockCosts,
        contracts: mockContracts
      });

      assert.strictEqual(analysis.milestones.length, 6);

      // Verify strict sequential ordering 1..6
      analysis.milestones.forEach((m, idx) => {
        assert.strictEqual(m.order, idx + 1);
      });

      assert.strictEqual(analysis.milestones[0].id, 'm1_acquisition');
      assert.strictEqual(analysis.milestones[1].id, 'm2_permits');
      assert.strictEqual(analysis.milestones[2].id, 'm3_structural');
      assert.strictEqual(analysis.milestones[3].id, 'm4_finishes');
      assert.strictEqual(analysis.milestones[4].id, 'm5_sales');
      assert.strictEqual(analysis.milestones[5].id, 'm6_handover');

      // Verify milestone real dates derived from cost logs & contracts
      assert.strictEqual(analysis.milestones[0].date, '2026-02-01'); // property created_at
      assert.strictEqual(analysis.milestones[1].date, '2026-02-12'); // latest permits/fees date (c-03)
      assert.strictEqual(analysis.milestones[2].date, '2026-03-15'); // latest structure date (c-05)
      assert.strictEqual(analysis.milestones[3].date, '2026-05-15'); // latest finishes date (c-08)
      assert.strictEqual(analysis.milestones[4].date, '2026-03-10'); // latest contract date (ct-02)
    });

    it('dynamically reflects milestone statuses based on logged costs and sales', () => {
      const analysis = calculateSinglePropertyAnalysis({
        property: mockBuilding,
        propertyCosts: mockCosts,
        contracts: mockContracts
      });

      // Acquisition is completed
      assert.strictEqual(analysis.milestones[0].status, 'completed');

      // Permits completed because later costs (structure and finishes) exist
      assert.strictEqual(analysis.milestones[1].status, 'completed');

      // Structural skeleton completed because finishing works are logged
      assert.strictEqual(analysis.milestones[2].status, 'completed');

      // Finishes in progress
      assert.strictEqual(analysis.milestones[3].status, 'in_progress');

      // Sales in progress (2 out of 4 sold)
      assert.strictEqual(analysis.milestones[4].status, 'in_progress');

      // Handover pending
      assert.strictEqual(analysis.milestones[5].status, 'pending');
    });

    it('enforces strict real estate sequential dependency chain across milestones', () => {
      // 1. When structural skeleton is in-progress (finishes not done), finishes milestone MUST remain pending
      const propStructuralOnly: Property = {
        ...mockApartment,
        id: 'prop-struc-only',
        total_units_count: 2,
        completion_status: 'off_plan'
      };
      const structureCostOnly: ERPPropertyCostItem[] = [
        {
          item_id: 'c-struc-1',
          property_id: 'prop-struc-only',
          category: 'civil_structure',
          phase: 'structural_skeleton',
          item_name_ar: 'هيكل إنشائي وخرسانات',
          item_name_en: 'Structural Skeleton',
          quantity: 1,
          unit: 'مقطوعية',
          unit_cost_egp: '800000.00',
          total_cost_egp: '800000.00',
          logged_date: '2026-03-01',
          logged_by: 'ENG',
          status: 'verified'
        }
      ];

      const offPlanContract: ERPContract = {
        ...mockContracts[0],
        contract_id: 'ct-offplan-1',
        status: 'Active',
        handover_status: 'Pending',
        property_id: 'prop-struc-only'
      };

      const analysisStructural = calculateSinglePropertyAnalysis({
        property: propStructuralOnly,
        propertyCosts: structureCostOnly,
        contracts: [offPlanContract]
      });

      // m1 (Acquisition) is completed as foundation
      assert.strictEqual(analysisStructural.milestones[0].status, 'completed');
      // m3 (Structural skeleton) is in progress
      assert.strictEqual(analysisStructural.milestones[2].status, 'in_progress');
      // m4 (Finishes) MUST remain pending because m3 is not completed yet!
      assert.strictEqual(analysisStructural.milestones[3].status, 'pending');
      // m5 (Sales) can launch off-plan independently of finishes!
      assert.strictEqual(analysisStructural.milestones[4].status, 'in_progress');
      // m6 (Handover) MUST remain pending because finishes are not completed
      assert.strictEqual(analysisStructural.milestones[5].status, 'pending');

      // 2. Ready completion_status with delivered contracts satisfies construction and handover prerequisites
      const readyProp: Property = {
        ...mockBuilding,
        id: 'prop-ready',
        completion_status: 'ready'
      };
      const deliveredContract: ERPContract = {
        ...mockContracts[0],
        contract_id: 'ct-deliv-1',
        status: 'Active',
        handover_status: 'Delivered',
        property_id: 'prop-ready'
      };

      const analysisReady = calculateSinglePropertyAnalysis({
        property: readyProp,
        propertyCosts: mockCosts,
        contracts: [deliveredContract]
      });

      // Ready property has acquisition, permits, structure, and finishes completed
      assert.strictEqual(analysisReady.milestones[0].status, 'completed');
      assert.strictEqual(analysisReady.milestones[1].status, 'completed');
      assert.strictEqual(analysisReady.milestones[2].status, 'completed');
      assert.strictEqual(analysisReady.milestones[3].status, 'completed');
      // And handover completed because m4 is completed and contract delivery is verified
      assert.strictEqual(analysisReady.milestones[5].status, 'completed');
    });

    it('keeps permits pending for a brand new property with no costs and marks in_progress only when permit fees are logged', () => {
      // 1. Brand new property with no costs: permits and later milestones MUST be pending
      const propNew: Property = {
        ...mockApartment,
        id: 'prop-brand-new',
        completion_status: 'off_plan',
        price_egp: 3000000
      };

      const analysisNew = calculateSinglePropertyAnalysis({
        property: propNew,
        propertyCosts: [],
        contracts: []
      });

      assert.strictEqual(analysisNew.milestones[0].status, 'completed'); // Acquisition foundational
      assert.strictEqual(analysisNew.milestones[1].status, 'pending');   // Permits pending (no costs yet)
      assert.strictEqual(analysisNew.milestones[2].status, 'pending');   // Structure pending
      assert.strictEqual(analysisNew.milestones[3].status, 'pending');   // Finishes pending
      assert.strictEqual(analysisNew.milestones[4].status, 'pending');   // Sales pending
      assert.strictEqual(analysisNew.milestones[5].status, 'pending');   // Handover pending

      // 2. Property with only permits fees logged: permits becomes in_progress
      const permitCostsOnly: ERPPropertyCostItem[] = [
        {
          item_id: 'c-pm-1',
          property_id: 'prop-brand-new',
          category: 'permits_engineering',
          phase: 'planning_permits',
          item_name_ar: 'جسات تربة ورسوم نقابة المهندسين',
          item_name_en: 'Soil Tests & Engineering Syndicate Fees',
          quantity: 1,
          unit: 'مقطوعية',
          unit_cost_egp: '150000.00',
          total_cost_egp: '150000.00',
          logged_date: '2026-02-01',
          logged_by: 'ENG',
          status: 'verified'
        }
      ];

      const analysisWithPermits = calculateSinglePropertyAnalysis({
        property: propNew,
        propertyCosts: permitCostsOnly,
        contracts: []
      });

      assert.strictEqual(analysisWithPermits.milestones[0].status, 'completed');
      assert.strictEqual(analysisWithPermits.milestones[1].status, 'in_progress'); // Permits now in progress!
      assert.strictEqual(analysisWithPermits.milestones[2].status, 'pending');     // Structure still pending
      assert.strictEqual(analysisWithPermits.milestones[3].status, 'pending');     // Finishes still pending
    });
  });

  describe('3. Zero-State Integrity & Edge Cases', () => {
    it('gracefully handles empty properties array without throwing', () => {
      const macro = calculatePortfolioMacroAnalysis({
        properties: [],
        propertyCosts: [],
        contracts: []
      });

      assert.strictEqual(macro.totalPropertiesCount, 0);
      assert.strictEqual(macro.totalInvestedCapital.toFixed(2), '0.00');
      assert.strictEqual(macro.totalConstructionWip.toFixed(2), '0.00');
      assert.strictEqual(macro.totalContractedSales.toFixed(2), '0.00');
      assert.strictEqual(macro.totalExpectedProfit.toFixed(2), '0.00');
      assert.strictEqual(macro.averageGrossMarginPct.toFixed(2), '0.00');
      assert.strictEqual(macro.averageRoiPct.toFixed(2), '0.00');
      assert.strictEqual(macro.portfolioValuation.toFixed(2), '0.00');
      assert.strictEqual(macro.lifetimePortfolioVolume.toFixed(2), '0.00');
      assert.strictEqual(macro.availableCash.toFixed(2), '0.00');
      assert.strictEqual(macro.statusDistribution.length, 0);
      assert.strictEqual(macro.projectRoiComparison.length, 0);
      assert.strictEqual(macro.propertiesList.length, 0);
    });

    it('safely handles property with zero area and zero costs without division by zero', () => {
      const zeroProp: Property = {
        ...mockApartment,
        area_sqm: 0,
        price_egp: 0
      };

      const analysis = calculateSinglePropertyAnalysis({
        property: zeroProp,
        propertyCosts: [],
        contracts: []
      });

      assert.strictEqual(analysis.costPerSqm.toFixed(2), '0.00');
      assert.strictEqual(analysis.unitMeterCost.toFixed(2), '0.00');
      assert.strictEqual(analysis.salesMeterPrice.toFixed(2), '0.00');
      assert.strictEqual(analysis.grossMarginPct.toFixed(2), '0.00');
      assert.strictEqual(analysis.roiPct.toFixed(2), '0.00');
      assert.strictEqual(analysis.absorptionRatePct.toFixed(2), '0.00');
    });

    it('safely handles rescinded contracts without counting them towards sales', () => {
      const rescindedContract: ERPContract = {
        ...mockContracts[0],
        contract_id: 'ct-rescinded',
        status: 'Rescinded',
        gross_contract_value: '5000000.00',
        total_cash_collected: '1000000.00'
      };

      const analysis = calculateSinglePropertyAnalysis({
        property: mockApartment,
        propertyCosts: [],
        contracts: [rescindedContract]
      });

      // Rescinded contract must NOT be counted
      assert.strictEqual(analysis.contractedSales.toFixed(2), '0.00');
      assert.strictEqual(analysis.collectedCash.toFixed(2), '0.00');
      assert.strictEqual(analysis.pendingReceivables.toFixed(2), '0.00');
    });
  });

  describe('4. Portfolio Macro Aggregations & Canonical Metrics Integration', () => {
    it('aggregates portfolio-wide metrics and category breakdowns using canonical metrics', () => {
      const macro = calculatePortfolioMacroAnalysis({
        properties: [mockBuilding, mockApartment],
        propertyCosts: mockCosts,
        contracts: mockContracts,
        journalEntries: mockJournalEntries
      });

      assert.strictEqual(macro.totalPropertiesCount, 2);
      
      // Building sales (11M) + Apartment sales (4M) = 15,000,000
      assert.strictEqual(macro.totalExpectedSales.toFixed(2), '15000000.00');

      // Total contracted sales from contracts (5.5M)
      assert.strictEqual(macro.totalContractedSales.toFixed(2), '5500000.00');

      // Building investment (6.7M) + Apartment investment (0M) = 6,700,000
      assert.strictEqual(macro.totalInvestedCapital.toFixed(2), '6700000.00');

      // Total Construction WIP = 4,700,000
      assert.strictEqual(macro.totalConstructionWip.toFixed(2), '4700000.00');

      // Expected profit: 15M - 6.7M = 8,300,000
      assert.strictEqual(macro.totalExpectedProfit.toFixed(2), '8300000.00');

      // Canonical metrics integration:
      // Both properties are active -> valuation = 11M + 4M = 15,000,000
      assert.strictEqual(macro.portfolioValuation.toFixed(2), '15000000.00');
      assert.strictEqual(macro.lifetimePortfolioVolume.toFixed(2), '15000000.00');

      // Cash from journal entries: 5,000,000 in Account 101000
      assert.strictEqual(macro.availableCash.toFixed(2), '5000000.00');

      // Category totals:
      assert.strictEqual(macro.categoryTotals.land.toFixed(2), '2000000.00');
      assert.strictEqual(macro.categoryTotals.structure.toFixed(2), '3000000.00');
      assert.strictEqual(macro.categoryTotals.finishing.toFixed(2), '700000.00');
      assert.strictEqual(macro.categoryTotals.mep.toFixed(2), '600000.00');
      assert.strictEqual(macro.categoryTotals.permits.toFixed(2), '400000.00');

      // Project ROI list is sorted by ROI descending
      assert.ok(macro.projectRoiComparison.length >= 2);
      assert.ok(macro.projectRoiComparison[0].roiPct >= macro.projectRoiComparison[1].roiPct);
    });
  });

  describe('5. Formatting & Compact EGP Helper', () => {
    it('formats numbers and Decimals to compact EGP and English labels', () => {
      assert.strictEqual(formatCompactEGP(1500000, true), '1.5M ج.م');
      assert.strictEqual(formatCompactEGP(1500000, false), '1.5M EGP');
      assert.strictEqual(formatCompactEGP(2500000000, true), '2.5B ج.م');
      assert.strictEqual(formatCompactEGP(75000, true), '75.0K ج.م');
      assert.strictEqual(formatCompactEGP(500, true), '500 ج.م');
      assert.strictEqual(formatCompactEGP(D(3200000), true), '3.2M ج.م');
    });
  });
});
