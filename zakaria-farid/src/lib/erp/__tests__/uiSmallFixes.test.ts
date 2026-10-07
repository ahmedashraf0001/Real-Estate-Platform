import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { generatePayableInstallmentSchedule } from '../propertyCostEngine';
import * as partnersEngine from '../partnersEngine';

test('construction monthly schedule preserves local date-only due dates in Africa/Cairo', () => {
  const previousTZ = process.env.TZ;
  process.env.TZ = 'Africa/Cairo';
  try {
    const schedule = generatePayableInstallmentSchedule({
      costItemId: 'date-regression', totalAmount: '900.00', downPayment: '0.00',
      numberOfInstallments: 3, firstDueDate: '2026-11-06', frequencyMonths: 1,
    });
    assert.deepEqual(schedule.map(i => i.due_date), ['2026-11-06', '2026-12-06', '2027-01-06']);
  } finally {
    if (previousTZ === undefined) delete process.env.TZ;
    else process.env.TZ = previousTZ;
  }
});

test('project partner total counts trimmed distinct names across two projects', () => {
  const properties = [
    { partner_splits: [{ partner_name: ' Founder ', share_percentage: 50 }, { partner_name: 'Partner A', share_percentage: 50 }] },
    { partner_splits: [{ partner_name: 'Founder', share_percentage: 50 }, { partner_name: ' Partner B ', share_percentage: 50 }] },
  ];
  assert.equal(partnersEngine.countDistinctProjectPartners(properties), 3);
  assert.equal(partnersEngine.countDistinctProjectPartners([]), 0);
  assert.equal(partnersEngine.countDistinctProjectPartners([{ partner_splits: [{ partner_name: ' ', share_percentage: 100 }] }]), 0);
});

