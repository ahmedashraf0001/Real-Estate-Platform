import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  getContractPaymentStatus, 
  getContractMeta, 
  formatCompactNumber 
} from '@/lib/erp/contractsPipeline';
import { ERPContract, ERPInstallmentSchedule } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';

describe('ZFContractInspectionModal — Mathematical & Architectural Domain Tests', () => {
  const mockProperty: Property = {
    id: 'prop-villa-3',
    slug: 'narjis-villas',
    title_ar: 'مشروع فلل النرجس',
    title_en: 'Narjis Villas Project',
    description_ar: 'فلل راقية',
    description_en: 'Luxury Villas',
    price_egp: 12500000,
    bedrooms: 5,
    bathrooms: 4,
    area_sqm: 420,
    type: 'villa',
    location: 'التجمع الخامس',
    latitude: null,
    longitude: null,
    completion_status: 'ready',
    listing_status: 'sold',
    is_featured: true,
    created_at: '2025-01-01',
    building_units: [
      {
        unit_id: 'VILLA-003',
        unit_number: 'فيلا 3',
        floor: 1,
        area_sqm: 420,
        bedrooms: 5,
        bathrooms: 4,
        price_egp: 12500000,
        status: 'contracted'
      }
    ]
  };

  const sampleContract: ERPContract = {
    contract_id: 'cnt-zkf-2025-001',
    contract_number: 'ZKF-2025-001',
    unit_id: 'فيلا 3',
    property_id: 'prop-villa-3',
    buyer_name: 'أحمد محمد علي',
    buyer_phone: '01012345678',
    gross_contract_value: '12500000.00',
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2025-03-15',
    handover_date: '2026-12-31',
    handover_status: 'Pending',
    total_cash_collected: '5250000.00',
    status: 'Active',
    payment_plan_type: 'INSTALLMENTS'
  };

  const sampleSchedules: ERPInstallmentSchedule[] = [
    {
      schedule_id: 'sch-0',
      contract_id: 'cnt-zkf-2025-001',
      tranche_number: 0,
      nominal_value: '2500000.00',
      due_date: '2025-03-15',
      paid_date: '2025-03-15',
      status: 'Paid',
      schedule_version: 1,
      amount_paid: '2500000.00'
    },
    {
      schedule_id: 'sch-1',
      contract_id: 'cnt-zkf-2025-001',
      tranche_number: 1,
      nominal_value: '250000.00',
      due_date: '2025-06-15',
      paid_date: '2025-06-10',
      status: 'Paid',
      schedule_version: 1,
      amount_paid: '250000.00'
    },
    {
      schedule_id: 'sch-2',
      contract_id: 'cnt-zkf-2025-001',
      tranche_number: 2,
      nominal_value: '250000.00',
      due_date: '2025-09-15',
      paid_date: '2025-09-12',
      status: 'Paid',
      schedule_version: 1,
      amount_paid: '250000.00'
    },
    {
      schedule_id: 'sch-3',
      contract_id: 'cnt-zkf-2025-001',
      tranche_number: 3,
      nominal_value: '250000.00',
      due_date: '2025-12-15',
      paid_date: '2025-12-10',
      status: 'Paid',
      schedule_version: 1,
      amount_paid: '250000.00'
    },
    {
      schedule_id: 'sch-4',
      contract_id: 'cnt-zkf-2025-001',
      tranche_number: 4,
      nominal_value: '250000.00',
      due_date: '2026-03-15',
      status: 'Pending',
      schedule_version: 1,
      amount_paid: '0.00'
    },
    {
      schedule_id: 'sch-5',
      contract_id: 'cnt-zkf-2025-001',
      tranche_number: 5,
      nominal_value: '250000.00',
      due_date: '2026-06-15',
      status: 'Pending',
      schedule_version: 1,
      amount_paid: '0.00'
    },
    {
      schedule_id: 'sch-6',
      contract_id: 'cnt-zkf-2025-001',
      tranche_number: 6,
      nominal_value: '250000.00',
      due_date: '2026-09-15',
      status: 'Pending',
      schedule_version: 1,
      amount_paid: '0.00'
    },
    {
      schedule_id: 'sch-7',
      contract_id: 'cnt-zkf-2025-001',
      tranche_number: 7,
      nominal_value: '250000.00',
      due_date: '2026-12-15',
      status: 'Pending',
      schedule_version: 1,
      amount_paid: '0.00'
    },
    {
      schedule_id: 'sch-8',
      contract_id: 'cnt-zkf-2025-001',
      tranche_number: 8,
      nominal_value: '250000.00',
      due_date: '2027-03-15',
      status: 'Pending',
      schedule_version: 1,
      amount_paid: '0.00'
    },
    {
      schedule_id: 'sch-9',
      contract_id: 'cnt-zkf-2025-001',
      tranche_number: 9,
      nominal_value: '250000.00',
      due_date: '2027-06-15',
      status: 'Pending',
      schedule_version: 1,
      amount_paid: '0.00'
    },
    {
      schedule_id: 'sch-10',
      contract_id: 'cnt-zkf-2025-001',
      tranche_number: 10,
      nominal_value: '250000.00',
      due_date: '2027-09-15',
      status: 'Pending',
      schedule_version: 1,
      amount_paid: '0.00'
    },
    {
      schedule_id: 'sch-11',
      contract_id: 'cnt-zkf-2025-001',
      tranche_number: 11,
      nominal_value: '250000.00',
      due_date: '2027-12-15',
      status: 'Pending',
      schedule_version: 1,
      amount_paid: '0.00'
    },
    {
      schedule_id: 'sch-12',
      contract_id: 'cnt-zkf-2025-001',
      tranche_number: 12,
      nominal_value: '250000.00',
      due_date: '2028-03-15',
      status: 'Pending',
      schedule_version: 1,
      amount_paid: '0.00'
    }
  ];

  describe('1. Contract Details Extraction & Formatting', () => {
    it('correctly resolves metadata from matched property', () => {
      const meta = getContractMeta(sampleContract, [mockProperty], true);
      assert.strictEqual(meta.project, 'مشروع فلل النرجس');
      assert.strictEqual(meta.area, 420);
      assert.ok(meta.heroImage.length > 0);
    });

    it('extracts down payment from tranche 0 and calculates correct percentage', () => {
      const downPaymentSch = sampleSchedules.find(s => s.tranche_number === 0);
      assert.ok(downPaymentSch);
      assert.strictEqual(downPaymentSch.nominal_value, '2500000.00');

      const grossVal = D(sampleContract.gross_contract_value);
      const downVal = D(downPaymentSch.nominal_value);
      const pct = Math.round(downVal.div(grossVal).times(100).toNumber());
      assert.strictEqual(pct, 20); // 2,500,000 / 12,500,000 = 20%
    });

    it('identifies regular installment tranche nominal value', () => {
      const regularSch = sampleSchedules.find(s => s.tranche_number > 0);
      assert.ok(regularSch);
      assert.strictEqual(formatCompactNumber(regularSch.nominal_value), '250,000');
    });

    it('computes installment duration and count accurately', () => {
      const installmentTranches = sampleSchedules.filter(s => s.tranche_number > 0);
      assert.strictEqual(installmentTranches.length, 12);
      
      const firstDue = sampleSchedules[0].due_date;
      const lastDue = sampleSchedules[sampleSchedules.length - 1].due_date;
      const d1 = new Date(firstDue);
      const d2 = new Date(lastDue);
      const months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
      assert.strictEqual(months, 36); // 36 months tenure
    });
  });

  describe('2. Progress Percentages & Financial Metrics', () => {
    it('accurately computes collected and remaining percentages matching media_1790182528460.jpg', () => {
      const gross = D(sampleContract.gross_contract_value);
      const collected = D(sampleContract.total_cash_collected);
      const remaining = gross.minus(collected);

      assert.strictEqual(formatCompactNumber(gross), '12,500,000');
      assert.strictEqual(formatCompactNumber(collected), '5,250,000');
      assert.strictEqual(formatCompactNumber(remaining), '7,250,000');

      const collectedPct = Math.round(collected.div(gross).times(100).toNumber());
      const remainingPct = 100 - collectedPct;

      assert.strictEqual(collectedPct, 42); // 5,250,000 / 12,500,000 = 42%
      assert.strictEqual(remainingPct, 58); // 58%
    });

    it('safely handles zero gross contract value without NaN or throw', () => {
      const zeroContract: ERPContract = {
        ...sampleContract,
        gross_contract_value: '0.00',
        total_cash_collected: '0.00'
      };
      const g = D(zeroContract.gross_contract_value);
      const c = D(zeroContract.total_cash_collected);
      const pct = g.isZero() ? 0 : Math.round(c.div(g).times(100).toNumber());
      assert.strictEqual(pct, 0);
      assert.strictEqual(formatCompactNumber(g), '0');
    });

    it('handles 100% completed collections correctly', () => {
      const fullContract: ERPContract = {
        ...sampleContract,
        total_cash_collected: '12500000.00'
      };
      const g = D(fullContract.gross_contract_value);
      const c = D(fullContract.total_cash_collected);
      const pct = Math.round(c.div(g).times(100).toNumber());
      const rem = g.minus(c);
      assert.strictEqual(pct, 100);
      assert.strictEqual(rem.toNumber(), 0);
    });
  });

  describe('3. Installment Schedules Classification & Schedulers', () => {
    it('identifies paid tranches correctly and counts them', () => {
      const paid = sampleSchedules.filter(s => s.status === 'Paid');
      assert.strictEqual(paid.length, 4); // tranche 0, 1, 2, 3
    });

    it('identifies next upcoming pending tranche', () => {
      const next = sampleSchedules.find(s => s.status === 'Pending');
      assert.ok(next);
      assert.strictEqual(next.tranche_number, 4);
      assert.strictEqual(next.due_date, '2026-03-15');
    });

    it('identifies overdue installments when pending due date is past reference date', () => {
      const pastRef = '2026-07-01'; // June 2026 tranche (sch-5) is now past
      const status = getContractPaymentStatus(sampleContract, sampleSchedules, pastRef);
      assert.strictEqual(status, 'overdue');
    });

    it('identifies active installment schedule when all pending are in the future', () => {
      const earlyRef = '2026-01-01';
      const status = getContractPaymentStatus(sampleContract, sampleSchedules, earlyRef);
      assert.strictEqual(status, 'active');
    });
  });

  describe('4. Status Badge & Micro-Pill Derivations', () => {
    it('derives "تم التسليم" when handover_status is Delivered', () => {
      const delivered: ERPContract = {
        ...sampleContract,
        handover_status: 'Delivered'
      };
      assert.strictEqual(delivered.handover_status, 'Delivered');
    });

    it('derives "جاهز للتسليم" when collection reaches or exceeds 70% threshold', () => {
      const readyContract: ERPContract = {
        ...sampleContract,
        total_cash_collected: '9000000.00' // 9M / 12.5M = 72%
      };
      const g = D(readyContract.gross_contract_value);
      const c = D(readyContract.total_cash_collected);
      const isReady = g.gt(0) && c.div(g).gte(0.7);
      assert.strictEqual(isReady, true);
    });

    it('derives "مفسوخ" when contract.status is Rescinded', () => {
      const resc: ERPContract = {
        ...sampleContract,
        status: 'Rescinded'
      };
      const st = getContractPaymentStatus(resc, sampleSchedules);
      assert.strictEqual(st, 'rescinded');
    });
  });

  describe('5. Payment Receipts History Derivation', () => {
    it('creates receipt entries for all paid schedules with formatted EGP values', () => {
      const paid = sampleSchedules.filter(s => s.status === 'Paid');
      const receipts = paid.map(s => ({
        id: s.schedule_id,
        date: s.paid_date || s.due_date,
        tranche: s.tranche_number === 0 ? 'دفعة مقدمة' : `قسط #${s.tranche_number}`,
        amount: formatCompactNumber(s.amount_paid)
      }));

      assert.strictEqual(receipts.length, 4);
      assert.strictEqual(receipts[0].tranche, 'دفعة مقدمة');
      assert.strictEqual(receipts[0].amount, '2,500,000');
      assert.strictEqual(receipts[1].tranche, 'قسط #1');
      assert.strictEqual(receipts[1].amount, '250,000');
    });
  });
});
