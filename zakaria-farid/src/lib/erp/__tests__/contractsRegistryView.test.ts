import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  getContractPaymentStatus, 
  getContractMeta, 
  calculateUnitTypesBreakdown,
  formatCompactNumber 
} from '@/lib/erp/contractsPipeline';
import { ERPContract, ERPInstallmentSchedule } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';

describe('Contracts Registry View — Canonical Logic & Status Tests', () => {
  const baseContract: ERPContract = {
    contract_id: 'test-contract-1',
    contract_number: 'CT-2026-001',
    unit_id: 'UNIT-APT-101',
    buyer_name: 'Ahmed Mostafa',
    gross_contract_value: '10000000.00',
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2026-01-01',
    handover_status: 'Pending',
    total_cash_collected: '2000000.00',
    status: 'Active'
  };

  const schedulePaid: ERPInstallmentSchedule = {
    schedule_id: 'sch-1',
    contract_id: 'test-contract-1',
    tranche_number: 0,
    nominal_value: '2000000.00',
    due_date: '2026-01-01',
    status: 'Paid',
    schedule_version: 1,
    amount_paid: '2000000.00'
  };

  const schedulePendingFuture: ERPInstallmentSchedule = {
    schedule_id: 'sch-2',
    contract_id: 'test-contract-1',
    tranche_number: 1,
    nominal_value: '2000000.00',
    due_date: '2026-12-31',
    status: 'Pending',
    schedule_version: 1,
    amount_paid: '0.00'
  };

  const schedulePendingPast: ERPInstallmentSchedule = {
    schedule_id: 'sch-3',
    contract_id: 'test-contract-1',
    tranche_number: 2,
    nominal_value: '2000000.00',
    due_date: '2026-01-15',
    status: 'Pending',
    schedule_version: 1,
    amount_paid: '0.00'
  };

  describe('1. Payment Status Classification', () => {
    it('should classify contract as "completed" when collected equals or exceeds gross value', () => {
      const fullContract: ERPContract = {
        ...baseContract,
        total_cash_collected: '10000000.00'
      };
      const status = getContractPaymentStatus(fullContract, [schedulePaid], '2026-06-01');
      assert.strictEqual(status, 'completed');
    });

    it('should classify contract as "overdue" when it has a pending installment whose due_date is in the past', () => {
      const status = getContractPaymentStatus(
        baseContract, 
        [schedulePaid, schedulePendingPast], 
        '2026-06-01'
      );
      assert.strictEqual(status, 'overdue');
    });

    it('should classify contract as "active" when installments are on time with no past due dates', () => {
      const status = getContractPaymentStatus(
        baseContract, 
        [schedulePaid, schedulePendingFuture], 
        '2026-06-01'
      );
      assert.strictEqual(status, 'active');
    });

    it('should classify contract as "rescinded" when status is Rescinded', () => {
      const rescindedContract: ERPContract = {
        ...baseContract,
        status: 'Rescinded'
      };
      const status = getContractPaymentStatus(rescindedContract, [], '2026-06-01');
      assert.strictEqual(status, 'rescinded');
    });
  });

  describe('2. Contract Property & Unit Metadata Resolution', () => {
    const mockProperty: Property = {
      id: 'prop-nile',
      slug: 'nile-towers',
      title_en: 'Nile Towers',
      title_ar: 'أبراج النيل بلازا',
      description_en: 'Luxury tower',
      description_ar: 'برج فاخر',
      price_egp: 25000000,
      bedrooms: 4,
      bathrooms: 4,
      area_sqm: 320,
      type: 'penthouse',
      location: 'Zamalek, Cairo',
      latitude: null,
      longitude: null,
      completion_status: 'ready',
      listing_status: 'active',
      is_featured: true,
      created_at: '2025-01-01T00:00:00Z',
      property_images: [
        { id: 'img-1', property_id: 'prop-nile', url: 'https://images.unsplash.com/test.jpg', alt_text_en: null, alt_text_ar: null, sort_order: 0 }
      ],
      building_units: [
        {
          unit_id: 'PENTHOUSE-202',
          unit_number: '202',
          floor: 20,
          area_sqm: 350,
          bedrooms: 4,
          bathrooms: 4,
          price_egp: 35000000,
          status: 'contracted'
        }
      ]
    };

    it('resolves project name and unit type correctly from linked building unit', () => {
      const c: ERPContract = {
        ...baseContract,
        property_id: 'prop-nile',
        unit_id: 'PENTHOUSE-202'
      };

      const metaAr = getContractMeta(c, [mockProperty], true);
      assert.strictEqual(metaAr.project, 'أبراج النيل بلازا');
      assert.strictEqual(metaAr.unitTypeKey, 'roof');
      assert.strictEqual(metaAr.unitTypeLabel, 'شقة روف');
      assert.strictEqual(metaAr.area, 350);
      assert.strictEqual(metaAr.heroImage, 'https://images.unsplash.com/test.jpg');

      const metaEn = getContractMeta(c, [mockProperty], false);
      assert.strictEqual(metaEn.project, 'Nile Towers');
      assert.strictEqual(metaEn.unitTypeKey, 'roof');
      assert.strictEqual(metaEn.unitTypeLabel, 'Roof Apartment');
    });

    it('falls back gracefully to inferring building type and realistic area from unit_id string', () => {
      const buildingContract: ERPContract = {
        ...baseContract,
        unit_id: 'BLD-YASMIN-BLOCK-A'
      };

      const meta = getContractMeta(buildingContract, [], true);
      assert.strictEqual(meta.unitTypeKey, 'building');
      assert.strictEqual(meta.unitTypeLabel, 'عمارة كاملة');
      assert.strictEqual(meta.area, 1250);
      assert.ok(meta.heroImage.length > 0);
    });

    it('infers garage and duplex types properly from unit_id', () => {
      const duplexContract: ERPContract = { ...baseContract, unit_id: 'DUPLEX-GARDEN-303' };
      const garageContract: ERPContract = { ...baseContract, unit_id: 'GARAGE-SHOP-01' };

      const duplexMeta = getContractMeta(duplexContract, [], true);
      assert.strictEqual(duplexMeta.unitTypeKey, 'duplex');
      assert.strictEqual(duplexMeta.unitTypeLabel, 'دوبلكس');
      assert.strictEqual(duplexMeta.area, 220);

      const garageMeta = getContractMeta(garageContract, [], true);
      assert.strictEqual(garageMeta.unitTypeKey, 'garage');
      assert.strictEqual(garageMeta.unitTypeLabel, 'جراج وموقف');
      assert.strictEqual(garageMeta.area, 35);
    });
  });

  describe('3. Unit Types Breakdown & Donut Chart Telemetry', () => {
    it('accurately calculates counts and percentage breakdown without NaN', () => {
      const contracts: ERPContract[] = [
        { ...baseContract, contract_id: 'c1', unit_id: 'APT-101' },
        { ...baseContract, contract_id: 'c2', unit_id: 'APT-102' },
        { ...baseContract, contract_id: 'c3', unit_id: 'DUPLEX-103' },
        { ...baseContract, contract_id: 'c4', unit_id: 'ROOF-104' },
      ];

      const breakdown = calculateUnitTypesBreakdown(contracts, [], true);
      assert.strictEqual(breakdown.length, 5);

      const apt = breakdown.find(b => b.key === 'apartment');
      const duplex = breakdown.find(b => b.key === 'duplex');
      const roof = breakdown.find(b => b.key === 'roof');

      assert.strictEqual(apt?.count, 2);
      assert.strictEqual(apt?.percentage, 50); // 2 out of 4 = 50%
      assert.strictEqual(duplex?.count, 1);
      assert.strictEqual(duplex?.percentage, 25);
      assert.strictEqual(roof?.count, 1);
      assert.strictEqual(roof?.percentage, 25);
    });

    it('gracefully handles empty contracts array without dividing by zero', () => {
      const breakdown = calculateUnitTypesBreakdown([], [], true);
      assert.strictEqual(breakdown.length, 5);
      breakdown.forEach(item => {
        assert.strictEqual(item.count, 0);
        assert.strictEqual(item.percentage, 0);
      });
    });

    it('excludes rescinded contracts from the active donut telemetry', () => {
      const contracts: ERPContract[] = [
        { ...baseContract, contract_id: 'c1', unit_id: 'APT-101', status: 'Active' },
        { ...baseContract, contract_id: 'c2', unit_id: 'ROOF-102', status: 'Rescinded' }
      ];

      const breakdown = calculateUnitTypesBreakdown(contracts, [], true);
      const roof = breakdown.find(b => b.key === 'roof');
      const apt = breakdown.find(b => b.key === 'apartment');

      assert.strictEqual(roof?.count, 0);
      assert.strictEqual(apt?.count, 1);
      assert.strictEqual(apt?.percentage, 100);
    });
  });

  describe('4. formatCompactNumber Currency & Numeric Formatting', () => {
    it('formats clean integers with thousand separators and no decimals', () => {
      assert.strictEqual(formatCompactNumber(10000000), '10,000,000');
      assert.strictEqual(formatCompactNumber(500), '500');
      assert.strictEqual(formatCompactNumber(0), '0');
    });

    it('formats Decimal class instances without .00 trailing decimals', () => {
      assert.strictEqual(formatCompactNumber(D('4500000.00')), '4,500,000');
      assert.strictEqual(formatCompactNumber(D('1200')), '1,200');
      assert.strictEqual(formatCompactNumber(D('0.00')), '0');
    });

    it('preserves fractional cents up to 2 decimal places when non-zero', () => {
      assert.strictEqual(formatCompactNumber(1250000.75), '1,250,000.75');
      assert.strictEqual(formatCompactNumber(D('3500.5')), '3,500.5');
    });

    it('safely handles string numbers and trims decimal zeros', () => {
      assert.strictEqual(formatCompactNumber('850000.00'), '850,000');
      assert.strictEqual(formatCompactNumber('24500.50'), '24,500.5');
    });

    it('handles falsy or empty inputs without throwing errors', () => {
      assert.strictEqual(formatCompactNumber(undefined), '0');
      assert.strictEqual(formatCompactNumber(null), '0');
      assert.strictEqual(formatCompactNumber(''), '0');
    });
  });

  describe('5. Status Counts & Segmented Tab Filtering Derivation', () => {
    const contracts: ERPContract[] = [
      {
        ...baseContract,
        contract_id: 'c1',
        contract_number: 'CT-1',
        gross_contract_value: '5000000',
        total_cash_collected: '5000000',
        status: 'Active'
      }, // completed
      {
        ...baseContract,
        contract_id: 'c2',
        contract_number: 'CT-2',
        gross_contract_value: '6000000',
        total_cash_collected: '2000000',
        status: 'Active'
      }, // overdue (via past due schedule)
      {
        ...baseContract,
        contract_id: 'c3',
        contract_number: 'CT-3',
        gross_contract_value: '8000000',
        total_cash_collected: '1000000',
        status: 'Active'
      }, // active (future schedule)
      {
        ...baseContract,
        contract_id: 'c4',
        contract_number: 'CT-4',
        gross_contract_value: '4000000',
        total_cash_collected: '500000',
        status: 'Rescinded'
      } // rescinded
    ];

    const testSchedules: ERPInstallmentSchedule[] = [
      // c1: fully paid
      { schedule_id: 's1', contract_id: 'c1', tranche_number: 1, nominal_value: '5000000', due_date: '2026-01-01', status: 'Paid', schedule_version: 1, amount_paid: '5000000' },
      // c2: has overdue schedule
      { schedule_id: 's2', contract_id: 'c2', tranche_number: 1, nominal_value: '4000000', due_date: '2026-01-15', status: 'Pending', schedule_version: 1, amount_paid: '0' },
      // c3: has future schedule
      { schedule_id: 's3', contract_id: 'c3', tranche_number: 1, nominal_value: '7000000', due_date: '2026-12-31', status: 'Pending', schedule_version: 1, amount_paid: '0' },
      // c4: rescinded
      { schedule_id: 's4', contract_id: 'c4', tranche_number: 1, nominal_value: '3500000', due_date: '2026-02-01', status: 'Void', schedule_version: 1, amount_paid: '0' }
    ];

    it('derives accurate tab count tallies matching contracts universe', () => {
      const refDate = '2026-06-01';
      const statusCounts = {
        all: contracts.length,
        active: 0,
        overdue: 0,
        completed: 0,
        rescinded: 0
      };

      contracts.forEach(c => {
        const s = getContractPaymentStatus(c, testSchedules, refDate);
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });

      assert.strictEqual(statusCounts.all, 4);
      assert.strictEqual(statusCounts.completed, 1);
      assert.strictEqual(statusCounts.overdue, 1);
      assert.strictEqual(statusCounts.active, 1);
      assert.strictEqual(statusCounts.rescinded, 1);

      // Verify that status buckets sum up exactly to all
      const bucketSum = statusCounts.completed + statusCounts.overdue + statusCounts.active + statusCounts.rescinded;
      assert.strictEqual(bucketSum, statusCounts.all);
    });
  });
});


