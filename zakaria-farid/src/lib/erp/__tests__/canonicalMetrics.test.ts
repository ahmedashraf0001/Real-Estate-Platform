import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAvailableCash,
  getActiveProperties,
  getPortfolioValuation,
  getLifetimePortfolioVolume,
  getConstructionWIP,
  getRawConstructionCosts,
  getHandoverCOGS,
  CanonicalMetrics,
  CANONICAL_WIP_ACCOUNTS,
} from '../canonicalMetrics';
import { D } from '../math';
import {
  ERPJournalEntry,
  ERPPropertyCostItem,
  ERPCostAllocation,
} from '../types';

describe('Canonical Metrics Engine: Single Source of Truth', () => {
  // ==========================================================================
  // 1. CASH & LIQUIDITY METRICS (getAvailableCash)
  // ==========================================================================
  describe('Metric 1: getAvailableCash()', () => {
    it('returns zero balances when journal entries array is empty or undefined', () => {
      const resEmpty = getAvailableCash([]);
      assert.equal(resEmpty.totalCash.toFixed(2), '0.00');
      assert.equal(resEmpty.safeCash.toFixed(2), '0.00');
      assert.equal(resEmpty.bankCash.toFixed(2), '0.00');
      assert.equal(resEmpty.totalFormatted, '0.00');

      const resNull = getAvailableCash(null);
      assert.equal(resNull.totalCash.toFixed(2), '0.00');

      const resUndef = getAvailableCash(undefined);
      assert.equal(resUndef.totalCash.toFixed(2), '0.00');
    });

    it('aggregates net liquid cash strictly from accounts 101000 and 102000', () => {
      const entries: ERPJournalEntry[] = [
        // Entry 1: Down payment received in Safe (Dr 101000: 500,000 / Cr 203000: 500,000)
        {
          entry_id: 'je-01',
          entry_number: 'JE-001',
          entry_date: '2026-09-01',
          period_id: '2026-09',
          source_module: 'SALES',
          description: 'Down payment collection',
          is_locked: false,
          created_by: 'TEST',
          created_at: new Date().toISOString(),
          lines: [
            { line_id: 'l1', entry_id: 'je-01', line_number: 1, account_code: '101000', debit_amount: '500000.00', credit_amount: '0.00' },
            { line_id: 'l2', entry_id: 'je-01', line_number: 2, account_code: '203000', debit_amount: '0.00', credit_amount: '500000.00' },
          ],
        },
        // Entry 2: Bank transfer received (Dr 102000: 800,000 / Cr 203000: 800,000)
        {
          entry_id: 'je-02',
          entry_number: 'JE-002',
          entry_date: '2026-09-02',
          period_id: '2026-09',
          source_module: 'SALES',
          description: 'Bank transfer tranche',
          is_locked: false,
          created_by: 'TEST',
          created_at: new Date().toISOString(),
          lines: [
            { line_id: 'l3', entry_id: 'je-02', line_number: 1, account_code: '102000', debit_amount: '800000.00', credit_amount: '0.00' },
            { line_id: 'l4', entry_id: 'je-02', line_number: 2, account_code: '203000', debit_amount: '0.00', credit_amount: '800000.00' },
          ],
        },
        // Entry 3: Concrete contractor payment from Safe (Dr 151000: 200,000 / Cr 101000: 200,000)
        {
          entry_id: 'je-03',
          entry_number: 'JE-003',
          entry_date: '2026-09-05',
          period_id: '2026-09',
          source_module: 'WIP_ALLOCATION',
          description: 'Concrete contractor payment',
          is_locked: false,
          created_by: 'TEST',
          created_at: new Date().toISOString(),
          lines: [
            { line_id: 'l5', entry_id: 'je-03', line_number: 1, account_code: '151000', debit_amount: '200000.00', credit_amount: '0.00' },
            { line_id: 'l6', entry_id: 'je-03', line_number: 2, account_code: '101000', debit_amount: '0.00', credit_amount: '200000.00' },
          ],
        },
        // Entry 4: Escrow trust deposit (Dr 102100: 100,000 / Cr 204000: 100,000) -> MUST BE EXCLUDED
        {
          entry_id: 'je-04',
          entry_number: 'JE-004',
          entry_date: '2026-09-06',
          period_id: '2026-09',
          source_module: 'MANUAL',
          description: 'Maintenance escrow deposit',
          is_locked: false,
          created_by: 'TEST',
          created_at: new Date().toISOString(),
          lines: [
            { line_id: 'l7', entry_id: 'je-04', line_number: 1, account_code: '102100', debit_amount: '100000.00', credit_amount: '0.00' },
            { line_id: 'l8', entry_id: 'je-04', line_number: 2, account_code: '204000', debit_amount: '0.00', credit_amount: '100000.00' },
          ],
        },
      ];

      const res = getAvailableCash(entries);
      // Safe: 500,000 - 200,000 = 300,000
      assert.equal(res.safeCash.toFixed(2), '300000.00');
      assert.equal(res.safeFormatted, '300000.00');
      // Bank: 800,000
      assert.equal(res.bankCash.toFixed(2), '800000.00');
      assert.equal(res.bankFormatted, '800000.00');
      // Total liquid: 300,000 + 800,000 = 1,100,000 (Account 102100 escrow excluded)
      assert.equal(res.totalCash.toFixed(2), '1100000.00');
      assert.equal(res.totalFormatted, '1100000.00');
    });

    it('correctly handles negative bank/safe cash balances (overdrafts) without clamping to zero', () => {
      const entries: ERPJournalEntry[] = [
        {
          entry_id: 'je-overdraft',
          entry_number: 'JE-OD',
          entry_date: '2026-09-07',
          period_id: '2026-09',
          source_module: 'MANUAL',
          description: 'Emergency supplier transfer with facility',
          is_locked: false,
          created_by: 'TEST',
          created_at: new Date().toISOString(),
          lines: [
            { line_id: 'l1', entry_id: 'je-od', line_number: 1, account_code: '152000', debit_amount: '250000.00', credit_amount: '0.00' },
            { line_id: 'l2', entry_id: 'je-od', line_number: 2, account_code: '102000', debit_amount: '0.00', credit_amount: '250000.00' },
          ],
        },
      ];

      const res = getAvailableCash(entries);
      assert.equal(res.bankCash.toFixed(2), '-250000.00');
      assert.equal(res.safeCash.toFixed(2), '0.00');
      assert.equal(res.totalCash.toFixed(2), '-250000.00');
      assert.equal(res.totalCash.isNegative(), true);
    });

    it('supports custom predicate filtering (e.g. by project source entity)', () => {
      const entries: ERPJournalEntry[] = [
        {
          entry_id: 'je-proj-a',
          entry_number: 'JE-PA',
          entry_date: '2026-09-01',
          period_id: '2026-09',
          source_module: 'SALES',
          source_entity_id: 'proj-zayed',
          description: 'Zayed collection',
          is_locked: false,
          created_by: 'TEST',
          created_at: new Date().toISOString(),
          lines: [
            { line_id: 'l1', entry_id: 'je-pa', line_number: 1, account_code: '101000', debit_amount: '400000.00', credit_amount: '0.00' },
            { line_id: 'l2', entry_id: 'je-pa', line_number: 2, account_code: '203000', debit_amount: '0.00', credit_amount: '400000.00' },
          ],
        },
        {
          entry_id: 'je-proj-b',
          entry_number: 'JE-PB',
          entry_date: '2026-09-02',
          period_id: '2026-09',
          source_module: 'SALES',
          source_entity_id: 'proj-sahel',
          description: 'Sahel collection',
          is_locked: false,
          created_by: 'TEST',
          created_at: new Date().toISOString(),
          lines: [
            { line_id: 'l3', entry_id: 'je-pb', line_number: 1, account_code: '101000', debit_amount: '600000.00', credit_amount: '0.00' },
            { line_id: 'l4', entry_id: 'je-pb', line_number: 2, account_code: '203000', debit_amount: '0.00', credit_amount: '600000.00' },
          ],
        },
      ];

      const zayedCash = getAvailableCash(entries, {
        filter: (e) => e.source_entity_id === 'proj-zayed',
      });
      assert.equal(zayedCash.totalCash.toFixed(2), '400000.00');

      const sahelCash = getAvailableCash(entries, {
        filter: (e) => e.source_entity_id === 'proj-sahel',
      });
      assert.equal(sahelCash.totalCash.toFixed(2), '600000.00');
    });

    it('handles sparse arrays with null and undefined elements gracefully', () => {
      const entries: (ERPJournalEntry | null | undefined)[] = [
        null,
        undefined,
        {
          entry_id: 'je-sparse',
          entry_number: 'JE-SPARSE',
          entry_date: '2026-09-01',
          period_id: '2026-09',
          source_module: 'SALES',
          description: 'Sparse collection',
          is_locked: false,
          created_by: 'TEST',
          created_at: new Date().toISOString(),
          lines: [
            null as any,
            { line_id: 'l1', entry_id: 'je-sparse', line_number: 1, account_code: '101000', debit_amount: '150000.00', credit_amount: '0.00' },
            undefined as any,
          ],
        },
      ];

      const res = getAvailableCash(entries as any);
      assert.equal(res.safeCash.toFixed(2), '150000.00');
      assert.equal(res.totalCash.toFixed(2), '150000.00');
    });
  });

  // ==========================================================================
  // 2. PORTFOLIO VALUATION METRICS (getPortfolioValuation vs getLifetimePortfolioVolume)
  // ==========================================================================
  describe('Metric 2: Portfolio Valuation & Lifetime Volume', () => {
    const mockProperties = [
      { id: 'p1', title_en: 'Palatial Villa Zayed', price_egp: 35000000, listing_status: 'active', is_archived: false },
      { id: 'p2', title_en: 'Nile Penthouse', price_egp: 25000000, listing_status: 'active', is_archived: false },
      { id: 'p3', title_en: 'North Coast Chalet', price_egp: 15000000, listing_status: 'sold', is_archived: false },
      { id: 'p4', title_en: 'Allegria Twinhouse', price_egp: 18000000, listing_status: 'under_offer', is_archived: false },
      { id: 'p5', title_en: 'Old Catalog Mansion', price_egp: 50000000, listing_status: 'archived', is_archived: true },
      { id: 'p6', title_en: 'Mismatched Active But Archived', price_egp: 20000000, listing_status: 'active', is_archived: true },
      { id: 'p7', title_en: 'Zero Price Active Estate', price_egp: 0, listing_status: 'active', is_archived: false },
      { id: 'p8', title_en: 'String Price Estate', price_egp: '12000000', listing_status: 'active', is_archived: false },
    ];

    it('getPortfolioValuation() includes ONLY active and non-archived listings', () => {
      const activeValuation = getPortfolioValuation(mockProperties);
      // Active:
      // p1: 35,000,000
      // p2: 25,000,000
      // p7: 0
      // p8: 12,000,000
      // Sum = 72,000,000
      // p3 (sold), p4 (under_offer), p5 (archived), p6 (is_archived: true) are EXCLUDED!
      assert.equal(activeValuation.toFixed(2), '72000000.00');
      assert.equal(activeValuation.toNumber(), 72000000);
    });

    it('getLifetimePortfolioVolume() includes ALL catalog assets regardless of status', () => {
      const lifetimeVolume = getLifetimePortfolioVolume(mockProperties);
      // All properties summed:
      // 35M + 25M + 15M + 18M + 50M + 20M + 0 + 12M = 175,000,000
      assert.equal(lifetimeVolume.toFixed(2), '175000000.00');
      assert.equal(lifetimeVolume.toNumber(), 175000000);
      assert.notEqual(
        lifetimeVolume.toNumber(),
        getPortfolioValuation(mockProperties).toNumber(),
        'Lifetime volume must never silently equal active portfolio valuation when sold/archived assets exist'
      );
    });

    it('handles empty, null, or corrupt property lists safely', () => {
      assert.equal(getPortfolioValuation([]).toNumber(), 0);
      assert.equal(getPortfolioValuation(null).toNumber(), 0);
      assert.equal(getPortfolioValuation(undefined).toNumber(), 0);
      assert.equal(getPortfolioValuation([{ price_egp: -5000000, listing_status: 'active' }]).toNumber(), 0);
    });

    it('getActiveProperties() returns strictly active and non-archived items', () => {
      const active = getActiveProperties(mockProperties);
      assert.equal(active.length, 4);
      const ids = active.map((p) => p.id);
      assert.deepEqual(ids, ['p1', 'p2', 'p7', 'p8']);
    });

    it('correctly handles comma-separated price strings and decimals without zeroing', () => {
      const propsWithCommas = [
        { id: 'pc1', title_en: 'Villa Comma', price_egp: '15,500,000.50', listing_status: 'active', is_archived: false },
        { id: 'pc2', title_en: 'Chalet Comma', price_egp: '4,500,000.00', listing_status: 'active', is_archived: false },
      ];
      const val = getPortfolioValuation(propsWithCommas);
      assert.equal(val.toFixed(2), '20000000.50');
      assert.equal(val.toNumber(), 20000000.5);
    });
  });

  // ==========================================================================
  // 3. CONSTRUCTION WORK-IN-PROGRESS (getConstructionWIP vs getRawConstructionCosts)
  // ==========================================================================
  describe('Metric 3: Construction WIP Net-of-Adjustments', () => {
    const costItems: ERPPropertyCostItem[] = [
      // Item 1: Steel rebar supply - Base 1,000,000 with 50,000 refund credit note (Net: 950,000)
      {
        item_id: 'c1',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        item_name_ar: 'حديد تسليح',
        item_name_en: 'Steel Rebar',
        quantity: 25,
        unit: 'طن',
        unit_cost_egp: '40000.00',
        total_cost_egp: '1000000.00',
        logged_date: '2026-09-01',
        logged_by: 'ENG',
        status: 'verified',
        adjustments: [
          {
            adjustment_id: 'adj-1',
            parent_item_id: 'c1',
            adjustment_type: 'REFUND_OVERPAYMENT',
            amount_egp: '50000.00',
            reason: 'Credit note for return',
            logged_by: 'CFO',
            created_at: '2026-09-02',
          },
        ],
      },
      // Item 2: Excavation - Base 300,000 with 40,000 supplement (Net: 340,000)
      {
        item_id: 'c2',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'excavation_foundation',
        item_name_ar: 'أعمال الحفر',
        item_name_en: 'Excavation',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '300000.00',
        total_cost_egp: '300000.00',
        logged_date: '2026-09-03',
        logged_by: 'ENG',
        status: 'verified',
        adjustments: [
          {
            adjustment_id: 'adj-2',
            parent_item_id: 'c2',
            adjustment_type: 'SUPPLEMENT_UNDERPAYMENT',
            amount_egp: '40000.00',
            reason: 'Additional rock excavation',
            logged_by: 'CFO',
            created_at: '2026-09-04',
          },
        ],
      },
      // Item 3: Unadjusted electrical supply - Base 200,000 (Net: 200,000)
      {
        item_id: 'c3',
        property_id: 'prop-2',
        category: 'mep_infrastructure',
        phase: 'masonry_roughing',
        item_name_ar: 'تأسيس كهرباء',
        item_name_en: 'Electrical Rough-in',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '200000.00',
        total_cost_egp: '200000.00',
        logged_date: '2026-09-05',
        logged_by: 'ENG',
        status: 'verified',
      },
    ];

    it('getConstructionWIP() computes net capital deployed after credit notes & supplements', () => {
      const netWIP = getConstructionWIP(costItems);
      // Item 1: 1,000,000 - 50,000 = 950,000
      // Item 2: 300,000 + 40,000 = 340,000
      // Item 3: 200,000
      // Total net WIP = 950,000 + 340,000 + 200,000 = 1,490,000
      assert.equal(netWIP.toFixed(2), '1490000.00');
    });

    it('getRawConstructionCosts() returns unadjusted base table total', () => {
      const rawWIP = getRawConstructionCosts(costItems);
      // Item 1: 1,000,000
      // Item 2: 300,000
      // Item 3: 200,000
      // Total raw = 1,500,000
      assert.equal(rawWIP.toFixed(2), '1500000.00');
      assert.notEqual(
        rawWIP.toNumber(),
        getConstructionWIP(costItems).toNumber(),
        'Raw costs must not equal net WIP when adjustments exist'
      );
    });

    it('clamps net effective cost to 0.00 if refunds exceed base cost', () => {
      const overRefundedItem: ERPPropertyCostItem = {
        item_id: 'c-error',
        property_id: 'prop-1',
        category: 'site_facade',
        phase: 'finishing_interiors',
        item_name_ar: 'بند خاطئ ملغى بالكامل',
        item_name_en: 'Erroneous Cancelled Item',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '100000.00',
        total_cost_egp: '100000.00',
        logged_date: '2026-09-01',
        logged_by: 'ENG',
        status: 'verified',
        adjustments: [
          {
            adjustment_id: 'adj-over',
            parent_item_id: 'c-error',
            adjustment_type: 'REFUND_OVERPAYMENT',
            amount_egp: '120000.00', // 120,000 refund > 100,000 base
            reason: 'Excess refund test',
            logged_by: 'CFO',
            created_at: '2026-09-02',
          },
        ],
      };

      const netWIP = getConstructionWIP([overRefundedItem]);
      assert.equal(netWIP.toFixed(2), '0.00');
      assert.equal(netWIP.toNumber(), 0);
    });

    it('aggregates total_incurred_wip from approved ERPCostAllocation records', () => {
      const allocations: ERPCostAllocation[] = [
        {
          allocation_id: 'ca-1',
          project_name: 'Zayed Heights',
          total_incurred_wip: '45000000.00',
          total_sales_value: '100000000.00',
          rsv_factor: '0.4500',
          calculated_at: '2026-09-01',
        },
        {
          allocation_id: 'ca-2',
          project_name: 'Sahel Azure',
          total_incurred_wip: '32000000.00',
          total_sales_value: '80000000.00',
          rsv_factor: '0.4000',
          calculated_at: '2026-09-01',
        },
      ];

      const allocWIP = getConstructionWIP(allocations);
      assert.equal(allocWIP.toFixed(2), '77000000.00');
    });

    it('aggregates double-entry WIP from ERPJournalEntry[] across canonical accounts (105000, 150000, 151000, 152000, 153000)', () => {
      const journalEntries: ERPJournalEntry[] = [
        {
          entry_id: 'je-wip-1',
          entry_number: 'JE-W1',
          entry_date: '2026-09-01',
          period_id: '2026-09',
          source_module: 'WIP_ALLOCATION',
          description: 'Direct construction & structural works',
          is_locked: false,
          created_by: 'TEST',
          created_at: new Date().toISOString(),
          lines: [
            { line_id: 'l1', entry_id: 'je-wip-1', line_number: 1, account_code: '151000', debit_amount: '2000000.00', credit_amount: '0.00' },
            { line_id: 'l2', entry_id: 'je-wip-1', line_number: 2, account_code: '102000', debit_amount: '0.00', credit_amount: '2000000.00' },
          ],
        },
        {
          entry_id: 'je-wip-2',
          entry_number: 'JE-W2',
          entry_date: '2026-09-02',
          period_id: '2026-09',
          source_module: 'WIP_ALLOCATION',
          description: 'MEP Infrastructure and Finishing',
          is_locked: false,
          created_by: 'TEST',
          created_at: new Date().toISOString(),
          lines: [
            { line_id: 'l3', entry_id: 'je-wip-2', line_number: 1, account_code: '152000', debit_amount: '800000.00', credit_amount: '0.00' },
            { line_id: 'l4', entry_id: 'je-wip-2', line_number: 2, account_code: '153000', debit_amount: '500000.00', credit_amount: '0.00' },
            { line_id: 'l5', entry_id: 'je-wip-2', line_number: 3, account_code: '102000', debit_amount: '0.00', credit_amount: '1300000.00' },
          ],
        },
        // Adjusting entry: Contractor credit note / refund (Cr 151000: 100,000)
        {
          entry_id: 'je-wip-3',
          entry_number: 'JE-W3',
          entry_date: '2026-09-03',
          period_id: '2026-09',
          source_module: 'MANUAL',
          description: 'Contractor credit note adjustment',
          is_locked: false,
          created_by: 'TEST',
          created_at: new Date().toISOString(),
          lines: [
            { line_id: 'l6', entry_id: 'je-wip-3', line_number: 1, account_code: '102000', debit_amount: '100000.00', credit_amount: '0.00' },
            { line_id: 'l7', entry_id: 'je-wip-3', line_number: 2, account_code: '151000', debit_amount: '0.00', credit_amount: '100000.00' },
          ],
        },
      ];

      // Net WIP: 2,000,000 (151000) + 800,000 (152000) + 500,000 (153000) - 100,000 (151000 Cr) = 3,200,000
      const wip = getConstructionWIP(journalEntries);
      assert.equal(wip.toFixed(2), '3200000.00');
    });

    it('supports ERPCostAllocation with numeric total_incurred_wip', () => {
      const numericAllocations = [
        {
          allocation_id: 'ca-num-1',
          project_name: 'Numeric Project',
          total_incurred_wip: 25000000 as any,
          rsv_factor: '0.4000',
        },
      ];
      const wip = getConstructionWIP(numericAllocations as any);
      assert.equal(wip.toFixed(2), '25000000.00');
    });

    it('resolves multi-source bundles according to canonical tiered hierarchy (Allocations -> Costs -> Journal)', () => {
      const mockAlloc = [
        {
          allocation_id: 'ca-1',
          project_name: 'Project Alpha',
          total_incurred_wip: '10000000.00',
          total_sales_value: '25000000.00',
          rsv_factor: '0.4000',
          calculated_at: '2026-09-01',
        },
      ];
      const mockCosts = [
        {
          item_id: 'pc-1',
          property_id: 'prop-1',
          category: 'civil_structure',
          item_name: 'Concrete',
          total_cost_egp: 8000000,
          adjustments: [],
        },
      ];
      const mockJournal = [
        {
          entry_id: 'je-1',
          lines: [
            { line_id: 'l1', account_code: '151000', debit_amount: '6000000.00', credit_amount: '0.00' },
          ],
        },
      ];

      // 1. All 3 sources present: Tier 1 (Allocations) MUST take precedence
      const tier1Result = getConstructionWIP({
        costAllocations: mockAlloc as any,
        propertyCosts: mockCosts as any,
        journalEntries: mockJournal as any,
      });
      assert.equal(tier1Result.toFixed(2), '10000000.00');

      // 2. Cost Allocations missing/empty: Tier 2 (Property Costs) MUST take precedence over Journal
      const tier2Result = getConstructionWIP({
        costAllocations: [],
        propertyCosts: mockCosts as any,
        journalEntries: mockJournal as any,
      });
      assert.equal(tier2Result.toFixed(2), '8000000.00');

      // 3. Allocations and Property Costs missing: Tier 3 (Journal Entries) is evaluated
      const tier3Result = getConstructionWIP({
        costAllocations: null,
        propertyCosts: [],
        journalEntries: mockJournal as any,
      });
      assert.equal(tier3Result.toFixed(2), '6000000.00');

      // 4. All sources empty: falls back to 0.00
      const emptyResult = getConstructionWIP({
        costAllocations: [],
        propertyCosts: [],
        journalEntries: [],
      });
      assert.equal(emptyResult.toFixed(2), '0.00');
    });
  });

  // ==========================================================================
  // 4. HANDOVER COGS METRICS (getHandoverCOGS)
  // ==========================================================================
  describe('Metric 4: Handover COGS & Fallback Removal', () => {
    const mockAllocations: ERPCostAllocation[] = [
      {
        allocation_id: 'ca-zayed',
        project_name: 'أوبسيديان زايد',
        total_incurred_wip: '42000000.00',
        total_sales_value: '100000000.00',
        rsv_factor: '0.4200',
        calculated_at: '2026-09-01',
      },
    ];

    it('calculates COGS accurately using approved RSV factor (Unit Value * Factor)', () => {
      // Contract value: 6,000,000 with 0.4200 RSV factor -> 2,520,000 COGS
      const res = getHandoverCOGS('6000000.00', '0.4200');
      assert.equal(res.isAllocated, true);
      assert.equal(res.cogsAmount.toFixed(2), '2520000.00');
      assert.equal(res.cogsFormatted, '2520000.00');
      assert.equal(res.rsvFactor.toFixed(4), '0.4200');
    });

    it('matches project name and property titles against approved allocations', () => {
      const property = {
        id: 'prop-obsidian',
        title_ar: 'برج أوبسيديان زايد الفاخر',
        title_en: 'Obsidian Zayed Luxury Tower',
      };

      const res = getHandoverCOGS({
        contractValue: '10000000.00',
        costAllocations: mockAllocations,
        property,
      });

      assert.equal(res.isAllocated, true);
      assert.equal(res.cogsAmount.toFixed(2), '4200000.00');
      assert.equal(res.cogsFormatted, '4200000.00');
    });

    it('STRICTLY PROHIBITS arbitrary 45% default when allocation is missing', () => {
      const propertyWithoutAllocation = {
        id: 'prop-unknown',
        title_ar: 'كمبوند النرجس ريزيدنس',
        title_en: 'Narges Residence Compound',
      };

      const res = getHandoverCOGS({
        contractValue: '8000000.00',
        costAllocations: mockAllocations, // Does not match Narges
        property: propertyWithoutAllocation,
      });

      // Must NOT be 8,000,000 * 0.45 = 3,600,000!
      assert.equal(res.isAllocated, false);
      assert.equal(res.cogsAmount.toNumber(), 0);
      assert.equal(res.cogsFormatted, '');
      assert.notEqual(res.cogsAmount.toNumber(), 3600000);
    });

    it('handles zero or negative contract values safely', () => {
      const resZero = getHandoverCOGS('0.00', '0.4200');
      assert.equal(resZero.isAllocated, false);
      assert.equal(resZero.cogsAmount.toNumber(), 0);
      assert.equal(resZero.cogsFormatted, '');

      const resNeg = getHandoverCOGS('-500000.00', '0.4200');
      assert.equal(resNeg.isAllocated, false);
      assert.equal(resNeg.cogsAmount.toNumber(), 0);
    });
  });

  // ==========================================================================
  // 5. COMPOSITE EXPORT (CanonicalMetrics)
  // ==========================================================================
  describe('CanonicalMetrics composite export', () => {
    it('exposes all canonical metric functions and constants under the CanonicalMetrics namespace', () => {
      assert.equal(typeof CanonicalMetrics.getAvailableCash, 'function');
      assert.equal(typeof CanonicalMetrics.getActiveProperties, 'function');
      assert.equal(typeof CanonicalMetrics.getPortfolioValuation, 'function');
      assert.equal(typeof CanonicalMetrics.getLifetimePortfolioVolume, 'function');
      assert.equal(typeof CanonicalMetrics.getConstructionWIP, 'function');
      assert.equal(typeof CanonicalMetrics.getRawConstructionCosts, 'function');
      assert.equal(typeof CanonicalMetrics.getHandoverCOGS, 'function');
      assert.equal(typeof CanonicalMetrics.getAccountsReceivable, 'function');
      assert.equal(typeof CanonicalMetrics.getPartnerFinancing, 'function');
      assert.equal(typeof CanonicalMetrics.getPartnerDrawings, 'function');
      assert.equal(typeof CanonicalMetrics.getPayablesAndLoans, 'function');
      assert.equal(typeof CanonicalMetrics.getOperatingAssets, 'function');
      assert.equal(typeof CanonicalMetrics.getOperatingCashMetrics, 'function');
      assert.ok(CanonicalMetrics.CANONICAL_WIP_ACCOUNTS instanceof Set);
      assert.equal(CanonicalMetrics.CANONICAL_WIP_ACCOUNTS.has('151000'), true);
    });
  });

  // ==========================================================================
  // 6. CLIENT OPERATING CASH & BALANCE SHEET METRICS
  // ==========================================================================
  describe('Metric 6: Operating Cash Metrics & Operating Assets Formula', () => {
    it('computes Accounts Receivable (A/R) accurately from active contracts, excluding rescissions', () => {
      const mockContracts: any[] = [
        {
          contract_id: 'c1',
          status: 'Active',
          gross_contract_value: '5000000.00',
          total_cash_collected: '2000000.00',
        },
        {
          contract_id: 'c2',
          status: 'Completed',
          gross_contract_value: '3000000.00',
          total_cash_collected: '1000000.00',
        },
        {
          contract_id: 'c3',
          status: 'Rescinded', // Void contract
          gross_contract_value: '4000000.00',
          total_cash_collected: '500000.00',
        },
        {
          contract_id: 'c4',
          status: 'Active',
          gross_contract_value: '1500000.00',
          total_cash_collected: '1500000.00', // Fully paid
        },
      ];

      const res = CanonicalMetrics.getAccountsReceivable(mockContracts);
      // c1: 5,000,000 - 2,000,000 = 3,000,000
      // c2: 3,000,000 - 1,000,000 = 2,000,000
      // c3: Rescinded -> 0
      // c4: 1,500,000 - 1,500,000 = 0
      // Total AR = 5,000,000.00
      assert.equal(res.totalAR.toFixed(2), '5000000.00');
      assert.equal(res.totalARFormatted, '5000000.00');
      assert.equal(res.activeContractsCount, 3);
    });

    it('computes Partner Financing and Partner Drawings accurately', () => {
      const transactions: any[] = [
        { id: 't1', type: 'CAPITAL_INJECTION', amount: '10000000.00' },
        { id: 't2', type: 'CAPITAL_INJECTION', amount: '5000000.00' },
        { id: 't3', type: 'PROFIT_DISTRIBUTION', amount: '1500000.00' },
        { id: 't4', type: 'PROFIT_DISTRIBUTION', amount: '800000.00' },
      ];

      const financing = CanonicalMetrics.getPartnerFinancing(transactions);
      assert.equal(financing.totalFinancing.toFixed(2), '15000000.00');
      assert.equal(financing.totalFinancingFormatted, '15000000.00');

      const drawings = CanonicalMetrics.getPartnerDrawings(transactions);
      assert.equal(drawings.totalDrawings.toFixed(2), '2300000.00');
      assert.equal(drawings.totalDrawingsFormatted, '2300000.00');
    });

    it('computes Payables & Loans from contractor installments and tax records', () => {
      const costs: any[] = [
        {
          id: 'cost-1',
          payable_installments: [
            { installment_id: 'i1', amount_egp: '600000.00', paid_amount_egp: '200000.00', status: 'PENDING' },
            { installment_id: 'i2', amount_egp: '400000.00', paid_amount_egp: '400000.00', status: 'PAID' },
          ],
        },
      ];
      const taxes: any[] = [
        { id: 'tax-1', tax_amount: '150000.00', remittance_status: 'Pending' },
        { id: 'tax-2', tax_amount: '50000.00', remittance_status: 'Remitted' },
      ];

      const payables = CanonicalMetrics.getPayablesAndLoans({
        propertyCosts: costs,
        taxRecords: taxes,
      });

      // Contractor: 600k - 200k = 400k
      // Taxes: 150k
      // Total Payables: 550k
      assert.equal(payables.contractorPayables.toFixed(2), '400000.00');
      assert.equal(payables.taxLiabilities.toFixed(2), '150000.00');
      assert.equal(payables.totalPayables.toFixed(2), '550000.00');
      assert.equal(payables.totalPayablesFormatted, '550000.00');
    });

    it('strictly enforces client formula: Operating Assets = Cash + A/R + WIP', () => {
      const direct = CanonicalMetrics.getOperatingAssets({
        cash: '2500000.00',
        accountsReceivable: '5000000.00',
        constructionWIP: '7500000.00',
      });

      // 2,500,000 + 5,000,000 + 7,500,000 = 15,000,000.00
      assert.equal(direct.totalOperatingAssets.toFixed(2), '15000000.00');
      assert.equal(direct.totalOperatingAssetsFormatted, '15000000.00');
      assert.equal(direct.breakdown.cashFormatted, '2500000.00');
      assert.equal(direct.breakdown.accountsReceivableFormatted, '5000000.00');
      assert.equal(direct.breakdown.constructionWIPFormatted, '7500000.00');
    });

    it('computes full suite in getOperatingCashMetrics()', () => {
      const suite = CanonicalMetrics.getOperatingCashMetrics({
        journalEntries: [
          {
            entry_id: 'je-1',
            entry_number: 'JE-1',
            entry_date: '2026-09-01',
            period_id: '2026-09',
            source_module: 'SALES',
            description: 'Safe cash entry',
            is_locked: false,
            created_by: 'TEST',
            created_at: new Date().toISOString(),
            lines: [
              { line_id: 'l1', entry_id: 'je-1', line_number: 1, account_code: '101000', debit_amount: '1000000.00', credit_amount: '0.00' },
            ],
          },
        ],
        contracts: [
          {
            contract_id: 'c1',
            status: 'Active',
            gross_contract_value: '4000000.00',
            total_cash_collected: '1000000.00',
          } as any,
        ],
        costAllocations: [
          {
            id: 'alloc-1',
            total_incurred_wip: '2000000.00',
          } as any,
        ],
      });

      // Cash: 1,000,000.00
      // AR: 3,000,000.00
      // WIP: 2,000,000.00
      // Operating Assets: 1M + 3M + 2M = 6,000,000.00
      assert.equal(suite.netCash.totalFormatted, '1000000.00');
      assert.equal(suite.accountsReceivable.totalARFormatted, '3000000.00');
      assert.equal(suite.constructionWIPFormatted, '2000000.00');
      assert.equal(suite.operatingAssets.totalOperatingAssetsFormatted, '6000000.00');
    });
  });
});
