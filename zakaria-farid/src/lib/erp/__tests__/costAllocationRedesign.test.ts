import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RSVEngine, ERPCostAllocation } from '../rsv';
import { ERPContract } from '../types';
import { Property } from '../../supabase/types';
import { D } from '../math';

describe('Cost Allocation & RSV Factor Engine Suite', () => {
  // Mock property and contracts
  const mockProperty: Property = {
    id: 'prop-nile-1',
    title_ar: 'أبراج النيل بلازا',
    title_en: 'Nile Plaza Towers',
    slug: 'nile-plaza',
    created_at: '2025-01-01',
    updated_at: '2025-01-01'
  } as unknown as Property;

  const mockContracts: ERPContract[] = [
    {
      contract_id: 'cnt-101',
      contract_number: 'CNT-NP-101',
      unit_id: 'أبراج النيل بلازا - شقة 101',
      property_id: 'prop-nile-1',
      buyer_name: 'أحمد محمود',
      gross_contract_value: '5000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2025-02-01',
      handover_status: 'Delivered',
      handover_date: '2025-08-15',
      total_cash_collected: '5000000.00',
      status: 'Active'
    },
    {
      contract_id: 'cnt-102',
      contract_number: 'CNT-NP-102',
      unit_id: 'أبراج النيل بلازا - شقة 102',
      property_id: 'prop-nile-1',
      buyer_name: 'سارة إبراهيم',
      gross_contract_value: '6000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2025-03-01',
      handover_status: 'Pending',
      total_cash_collected: '3000000.00',
      status: 'Active'
    }
  ];

  describe('1. RSV Factor Calculation Formulas & Decimal Precision', () => {
    it('calculates allocation factor with fixed 4 decimal precision', () => {
      const wip = '45000000.00';
      const sales = '100000000.00';
      const alloc = RSVEngine.calculateAllocation('أبراج النيل بلازا', wip, sales);

      assert.strictEqual(alloc.project_name, 'أبراج النيل بلازا');
      assert.strictEqual(alloc.total_incurred_wip, '45000000.00');
      assert.strictEqual(alloc.total_sales_value, '100000000.00');
      assert.strictEqual(alloc.rsv_factor, '0.4500');
      assert.ok(alloc.allocation_id && alloc.allocation_id.length > 0);
      assert.ok(alloc.calculated_at && !isNaN(new Date(alloc.calculated_at).getTime()));
    });

    it('preserves precision consistent with Decimal cents precision', () => {
      // 10M / 30M = 0.33 (in Decimal cents) -> fixed to 0.3300
      const alloc = RSVEngine.calculateAllocation('كمبوند الواحة', '10000000.00', '30000000.00');
      assert.strictEqual(alloc.rsv_factor, '0.3300');
    });

    it('correctly calculates factor for exact round ratios', () => {
      // 2.5M / 5M = 0.5000
      const alloc = RSVEngine.calculateAllocation('برج النخيل', '2500000.00', '5000000.00');
      assert.strictEqual(alloc.rsv_factor, '0.5000');
    });
  });

  describe('2. Gross Margin & Unit COGS Relief Calculations', () => {
    it('computes unit COGS accurately from unit sales value and RSV factor', () => {
      // Unit value 8,000,000 with 0.4500 factor -> 3,600,000.00
      const cogs = RSVEngine.computeUnitCOGS('8000000.00', '0.4500');
      assert.strictEqual(cogs.toFixed(2), '3600000.00');

      const allocatedCost = RSVEngine.computeUnitAllocatedCost('8000000.00', '0.4500');
      assert.strictEqual(allocatedCost.toFixed(2), '3600000.00');
    });

    it('computes gross margin ratio and percentage', () => {
      // Factor 0.4500 -> Margin ratio 0.5500, Margin % 55.00%
      const marginRatio = RSVEngine.computeGrossMargin('0.4500');
      assert.strictEqual(marginRatio.toFixed(4), '0.5500');

      const marginPct = RSVEngine.computeGrossMarginPct('0.4500');
      assert.strictEqual(marginPct, '55.00%');
    });

    it('computes gross profit amount for a unit', () => {
      // 8,000,000 - 3,600,000 = 4,400,000.00
      const profit = RSVEngine.computeGrossMarginAmount('8000000.00', '0.4500');
      assert.strictEqual(profit.toFixed(2), '4400000.00');
    });
  });

  describe('3. Allocation Boundaries & Edge Cases', () => {
    it('rejects zero total project sales value', () => {
      assert.throws(() => {
        RSVEngine.calculateAllocation('مشروع غير مكتمل', '500000.00', '0.00');
      }, /Total project sales value must be greater than zero/);
    });

    it('rejects negative total project sales value', () => {
      assert.throws(() => {
        RSVEngine.calculateAllocation('مشروع غير مكتمل', '500000.00', '-100000.00');
      }, /Total project sales value must be greater than zero/);
    });

    it('rejects negative incurred construction WIP', () => {
      assert.throws(() => {
        RSVEngine.calculateAllocation('مشروع غير مكتمل', '-500000.00', '10000000.00');
      }, /Total incurred construction WIP cannot be negative/);
    });

    it('handles zero incurred WIP gracefully with 0.0000 factor and 100% margin', () => {
      const alloc = RSVEngine.calculateAllocation('مشروع أراضي فقط', '0.00', '20000000.00');
      assert.strictEqual(alloc.rsv_factor, '0.0000');
      const cogs = RSVEngine.computeUnitCOGS('5000000.00', alloc.rsv_factor);
      assert.strictEqual(cogs.toFixed(2), '0.00');
      const marginPct = RSVEngine.computeGrossMarginPct(alloc.rsv_factor);
      assert.strictEqual(marginPct, '100.00%');
    });

    it('handles break-even project where WIP equals Sales Value', () => {
      const alloc = RSVEngine.calculateAllocation('مشروع بدون هامش', '10000000.00', '10000000.00');
      assert.strictEqual(alloc.rsv_factor, '1.0000');
      const cogs = RSVEngine.computeUnitCOGS('2000000.00', alloc.rsv_factor);
      assert.strictEqual(cogs.toFixed(2), '2000000.00');
      const profit = RSVEngine.computeGrossMarginAmount('2000000.00', alloc.rsv_factor);
      assert.strictEqual(profit.toFixed(2), '0.00');
      const marginPct = RSVEngine.computeGrossMarginPct(alloc.rsv_factor);
      assert.strictEqual(marginPct, '0.00%');
    });

    it('handles loss projects (WIP exceeds sales) without crashing', () => {
      const alloc = RSVEngine.calculateAllocation('مشروع خسارة تكاليف', '60000000.00', '50000000.00');
      assert.strictEqual(alloc.rsv_factor, '1.2000');
      const margin = RSVEngine.computeGrossMargin(alloc.rsv_factor);
      assert.strictEqual(margin.toFixed(4), '-0.2000');
      const marginPct = RSVEngine.computeGrossMarginPct(alloc.rsv_factor);
      assert.strictEqual(marginPct, '-20.00%');
    });
  });

  describe('4. Balanced IFRS 15 COGS & Handover Journal Entry Generation', () => {
    it('generates a balanced double-entry journal impact with accounts 501000 and 150000', () => {
      const journalImpact = RSVEngine.generateCOGSJournalEntryImpact({
        projectName: 'أبراج النيل بلازا',
        unitIdentifier: 'شقة 101',
        unitContractValue: '5000000.00',
        rsvFactor: '0.4500'
      });

      assert.strictEqual(journalImpact.source_module, 'WIP_ALLOCATION');
      assert.strictEqual(journalImpact.project_name, 'أبراج النيل بلازا');
      assert.strictEqual(journalImpact.unit_identifier, 'شقة 101');
      assert.strictEqual(journalImpact.unit_contract_value, '5000000.00');
      assert.strictEqual(journalImpact.allocated_cogs, '2250000.00'); // 5M * 0.45 = 2.25M
      assert.strictEqual(journalImpact.gross_profit, '2750000.00');   // 5M - 2.25M = 2.75M
      assert.strictEqual(journalImpact.gross_margin_pct, '55.00%');
      assert.strictEqual(journalImpact.is_balanced, true);

      // Verify the 4 double-entry lines
      assert.strictEqual(journalImpact.lines.length, 4);

      // Line 1: Dr 501000 (COGS)
      const cogsDebit = journalImpact.lines.find(l => l.account_code === '501000');
      assert.ok(cogsDebit);
      assert.strictEqual(cogsDebit.debit_amount, '2250000.00');
      assert.strictEqual(cogsDebit.credit_amount, '0.00');

      // Line 2: Cr 150000 (Construction WIP Relief)
      const wipCredit = journalImpact.lines.find(l => l.account_code === '150000');
      assert.ok(wipCredit);
      assert.strictEqual(wipCredit.debit_amount, '0.00');
      assert.strictEqual(wipCredit.credit_amount, '2250000.00');

      // Line 3: Dr 203000 (Deferred Revenue)
      const revDebit = journalImpact.lines.find(l => l.account_code === '203000');
      assert.ok(revDebit);
      assert.strictEqual(revDebit.debit_amount, '5000000.00');
      assert.strictEqual(revDebit.credit_amount, '0.00');

      // Line 4: Cr 401000 (Realized Revenue)
      const revCredit = journalImpact.lines.find(l => l.account_code === '401000');
      assert.ok(revCredit);
      assert.strictEqual(revCredit.debit_amount, '0.00');
      assert.strictEqual(revCredit.credit_amount, '5000000.00');

      // Invariant: Total Debits == Total Credits
      assert.strictEqual(journalImpact.total_debits, '7250000.00');
      assert.strictEqual(journalImpact.total_credits, '7250000.00');
    });
  });

  describe('5. Unit-by-Unit Allocated Cost Distribution', () => {
    it('maps real contracts into unit allocated costs with handover status', () => {
      const alloc: ERPCostAllocation = {
        allocation_id: 'alloc-1',
        project_name: 'أبراج النيل بلازا',
        total_incurred_wip: '22500000.00',
        total_sales_value: '50000000.00',
        rsv_factor: '0.4500',
        calculated_at: '2025-01-01T00:00:00Z'
      };

      const units = RSVEngine.calculateProjectUnitsBreakdown(alloc, mockContracts, mockProperty);

      assert.strictEqual(units.length, 2);
      // Unit 101: 5M * 0.45 = 2.25M allocated cost, Delivered
      assert.strictEqual(units[0].unit_sales_value, '5000000.00');
      assert.strictEqual(units[0].allocated_cost, '2250000.00');
      assert.strictEqual(units[0].gross_margin, '2750000.00');
      assert.strictEqual(units[0].handover_status, 'Delivered');

      // Unit 102: 6M * 0.45 = 2.70M allocated cost, Pending
      assert.strictEqual(units[1].unit_sales_value, '6000000.00');
      assert.strictEqual(units[1].allocated_cost, '2700000.00');
      assert.strictEqual(units[1].gross_margin, '3300000.00');
      assert.strictEqual(units[1].handover_status, 'Pending');
    });

    it('strictly isolates contracts to their own property and excludes other properties and rescinded contracts', () => {
      const alloc: ERPCostAllocation = {
        allocation_id: 'alloc-1',
        project_name: 'أبراج النيل بلازا',
        total_incurred_wip: '22500000.00',
        total_sales_value: '50000000.00',
        rsv_factor: '0.4500',
        calculated_at: '2025-01-01T00:00:00Z'
      };

      const mixedContracts: ERPContract[] = [
        ...mockContracts,
        // Contract for a totally different property (must be excluded)
        {
          contract_id: 'cnt-other-201',
          contract_number: 'CNT-OTHER-201',
          unit_id: 'كمبوند الروضة - فيلا 12',
          property_id: 'prop-rawda-99',
          buyer_name: 'عميل أجنبي',
          gross_contract_value: '15000000.00',
          total_cash_collected: '0.00',
          currency: 'EGP',
          exchange_rate: '1.0000',
          contract_date: '2025-04-01',
          handover_status: 'Pending',
          status: 'Active'
        },
        // Rescinded contract for Nile Plaza (must be excluded from active WIP relief)
        {
          contract_id: 'cnt-rescinded-103',
          contract_number: 'CNT-NP-103',
          unit_id: 'أبراج النيل بلازا - شقة 103',
          property_id: 'prop-nile-1',
          buyer_name: 'عقد ملغي',
          gross_contract_value: '4000000.00',
          total_cash_collected: '0.00',
          currency: 'EGP',
          exchange_rate: '1.0000',
          contract_date: '2025-01-10',
          handover_status: 'Pending',
          status: 'Rescinded'
        }
      ];

      const units = RSVEngine.calculateProjectUnitsBreakdown(alloc, mixedContracts, mockProperty);

      // Only the 2 active Nile Plaza contracts must be included
      assert.strictEqual(units.length, 2);
      assert.strictEqual(units[0].unit_id, 'أبراج النيل بلازا - شقة 101');
      assert.strictEqual(units[1].unit_id, 'أبراج النيل بلازا - شقة 102');
      assert.ok(!units.some(u => u.unit_id.includes('كمبوند الروضة')));
      assert.ok(!units.some(u => u.buyer_name === 'عقد ملغي'));
    });

    it('maps real property building_units when no direct ratified contracts exist', () => {
      const propWithUnits: Property = {
        id: 'prop-building-1',
        title_ar: 'عمارة المهندسين الفاخرة',
        title_en: 'Mohandessin Luxury Building',
        slug: 'mohandessin-bldg',
        building_units: [
          {
            unit_id: 'unit-m-1',
            unit_number: 'شقة 1 أ',
            floor: 1,
            area_sqm: 180,
            bedrooms: 3,
            bathrooms: 2,
            price_egp: 4500000,
            status: 'available'
          },
          {
            unit_id: 'unit-m-2',
            unit_number: 'شقة 2 ب',
            floor: 2,
            area_sqm: 220,
            bedrooms: 4,
            bathrooms: 3,
            price_egp: 5500000,
            status: 'contracted',
            buyer_name: 'محمود كمال'
          }
        ]
      } as unknown as Property;

      const alloc: ERPCostAllocation = {
        allocation_id: 'alloc-bldg',
        project_name: 'عمارة المهندسين الفاخرة',
        total_incurred_wip: '4000000.00',
        total_sales_value: '10000000.00',
        rsv_factor: '0.4000',
        calculated_at: '2025-01-01T00:00:00Z'
      };

      const units = RSVEngine.calculateProjectUnitsBreakdown(alloc, [], propWithUnits);

      assert.strictEqual(units.length, 2);
      assert.strictEqual(units[0].unit_id, 'unit-m-1');
      assert.strictEqual(units[0].unit_sales_value, '4500000.00');
      assert.strictEqual(units[0].allocated_cost, '1800000.00'); // 4.5M * 0.40
      assert.strictEqual(units[0].gross_margin, '2700000.00');

      assert.strictEqual(units[1].unit_id, 'unit-m-2');
      assert.strictEqual(units[1].unit_sales_value, '5500000.00');
      assert.strictEqual(units[1].allocated_cost, '2200000.00'); // 5.5M * 0.40
      assert.strictEqual(units[1].gross_margin, '3300000.00');
      assert.strictEqual(units[1].buyer_name, 'محمود كمال');
    });

    it('returns empty array when project has zero total sales and no contracts', () => {
      const alloc: ERPCostAllocation = {
        allocation_id: 'alloc-zero',
        project_name: 'مشروع خالي بدون مبيعات',
        total_incurred_wip: '0.00',
        total_sales_value: '0.00',
        rsv_factor: '0.0000',
        calculated_at: '2025-01-01T00:00:00Z'
      };

      const units = RSVEngine.calculateProjectUnitsBreakdown(alloc, []);
      assert.strictEqual(units.length, 0);
    });

    it('sanitizes negative gross contract values to 0.00 preventing negative COGS', () => {
      const corruptContracts: ERPContract[] = [
        {
          contract_id: 'cnt-neg',
          contract_number: 'CNT-NEG-1',
          unit_id: 'شقة 99',
          property_id: 'prop-nile-1',
          buyer_name: 'عميل بقيمة سالبة',
          gross_contract_value: '-500000.00',
          total_cash_collected: '0.00',
          currency: 'EGP',
          exchange_rate: '1.0000',
          contract_date: '2025-01-01',
          handover_status: 'Pending',
          status: 'Active'
        }
      ];

      const alloc: ERPCostAllocation = {
        allocation_id: 'alloc-1',
        project_name: 'أبراج النيل بلازا',
        total_incurred_wip: '20000000.00',
        total_sales_value: '50000000.00',
        rsv_factor: '0.4000',
        calculated_at: '2025-01-01T00:00:00Z'
      };

      const units = RSVEngine.calculateProjectUnitsBreakdown(alloc, corruptContracts, mockProperty);
      assert.strictEqual(units.length, 1);
      assert.strictEqual(units[0].unit_sales_value, '0.00');
      assert.strictEqual(units[0].allocated_cost, '0.00');
      assert.strictEqual(units[0].gross_margin, '0.00');
    });

    it('generates standard architectural floor plan units when no contracts exist', () => {
      const alloc: ERPCostAllocation = {
        allocation_id: 'alloc-2',
        project_name: 'مشروع جديد قيد التخطيط',
        total_incurred_wip: '40000000.00',
        total_sales_value: '100000000.00',
        rsv_factor: '0.4000',
        calculated_at: '2025-01-01T00:00:00Z'
      };

      const units = RSVEngine.calculateProjectUnitsBreakdown(alloc, []);
      assert.ok(units.length > 0);

      // Verify each unit has allocated cost, margin, and pending status
      units.forEach(u => {
        assert.ok(D(u.unit_sales_value).gt(0));
        assert.ok(D(u.allocated_cost).gt(0));
        assert.ok(D(u.gross_margin).gt(0));
        assert.strictEqual(u.handover_status, 'Pending');
      });
    });
  });

  describe('6. Portfolio Aggregation & Macro KPIs', () => {
    it('aggregates weighted RSV factor and total margins across multiple project allocations', () => {
      const allocations: ERPCostAllocation[] = [
        {
          allocation_id: 'alloc-1',
          project_name: 'مشروع أ',
          total_incurred_wip: '40000000.00',
          total_sales_value: '100000000.00', // factor 0.4000
          rsv_factor: '0.4000',
          calculated_at: '2025-01-01T00:00:00Z'
        },
        {
          allocation_id: 'alloc-2',
          project_name: 'مشروع ب',
          total_incurred_wip: '50000000.00',
          total_sales_value: '100000000.00', // factor 0.5000
          rsv_factor: '0.5000',
          calculated_at: '2025-01-01T00:00:00Z'
        }
      ];

      const kpis = RSVEngine.calculatePortfolioAllocationKPIs(allocations);

      assert.strictEqual(kpis.totalWip.toFixed(2), '90000000.00');
      assert.strictEqual(kpis.totalSales.toFixed(2), '200000000.00');
      assert.strictEqual(kpis.avgRsvFactor.toFixed(4), '0.4500'); // 90M / 200M = 0.4500
      assert.strictEqual(kpis.avgRsvPct, '45.00%');
      assert.strictEqual(kpis.avgGrossMarginPct, '55.00%');
      assert.strictEqual(kpis.totalGrossMarginValue.toFixed(2), '110000000.00');
      assert.strictEqual(kpis.count, 2);
    });

    it('returns honest zero-state when allocations list is empty', () => {
      const kpis = RSVEngine.calculatePortfolioAllocationKPIs([]);
      assert.strictEqual(kpis.totalWip.toFixed(2), '0.00');
      assert.strictEqual(kpis.totalSales.toFixed(2), '0.00');
      assert.strictEqual(kpis.avgRsvFactor.toFixed(4), '0.0000');
      assert.strictEqual(kpis.avgRsvPct, '0.00%');
      // Zero fake data: 0 sales yields 0.00% margin, never false 100.00%
      assert.strictEqual(kpis.avgGrossMarginPct, '0.00%');
      assert.strictEqual(kpis.totalGrossMarginValue.toFixed(2), '0.00');
      assert.strictEqual(kpis.count, 0);
    });

    it('safely handles journal impact with negative or zero unit values', () => {
      const impact = RSVEngine.generateCOGSJournalEntryImpact({
        projectName: 'مشروع اختبار أمان',
        unitIdentifier: 'وحدة اختبار',
        unitContractValue: '-1000000.00',
        rsvFactor: '0.4000'
      });

      assert.strictEqual(impact.unit_contract_value, '0.00');
      assert.strictEqual(impact.allocated_cogs, '0.00');
      assert.strictEqual(impact.gross_profit, '0.00');
      assert.strictEqual(impact.is_balanced, true);
      impact.lines.forEach(l => {
        assert.ok(!l.debit_amount.startsWith('-'));
        assert.ok(!l.credit_amount.startsWith('-'));
      });
    });
  });
});
