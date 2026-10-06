import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { D } from '../math';
import { PartnersEngine, computeProjectPayoutPosition, resolvePartnerSharePct } from '../partnersEngine';
import { PRIMARY_DEVELOPER_NAME } from '../partnersDirectory';
import type { ERPContract, ERPPartnerCommitment, ERPPartnerTransaction, ERPAccountingPeriod } from '../types';
import type { Property } from '@/lib/supabase/types';

const PARTNER = 'أشرف';

const building = {
  id: 'prop-a',
  type: 'building',
  title_ar: 'عمارة أ',
  price_egp: 10_000_000,
  partner_splits: [
    { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 50 },
    { partner_name: PARTNER, share_percentage: 50 }
  ]
} as unknown as Property;

const otherBuilding = { ...building, id: 'prop-b', title_ar: 'عمارة ب' } as unknown as Property;

const contract = (id: string, propertyId: string, gross: number, collected: number, status: ERPContract['status'] = 'Active') =>
  ({ contract_id: id, property_id: propertyId, unit_id: `${propertyId}-u`, gross_contract_value: String(gross), total_cash_collected: String(collected), status } as unknown as ERPContract);

const commitment = (id: string, propertyId: string, committed: number, paid: number, due: string, status: ERPPartnerCommitment['status'] = 'PENDING') =>
  ({ commitment_id: id, property_id: propertyId, partner_name: PARTNER, milestone_name: `دفعة ${id}`, committed_amount: String(committed), paid_amount: String(paid), due_date: due, status } as unknown as ERPPartnerCommitment);

const payout = (propertyId: string, amount: number, method: ERPPartnerTransaction['payment_method'] = 'CASH_101000') =>
  ({ id: `tx-${propertyId}-${amount}`, partner_name: PARTNER, type: 'PROFIT_DISTRIBUTION', amount: String(amount), property_id: propertyId, payment_method: method, date: '2026-10-01', status: 'COMPLETED', memo: '' } as unknown as ERPPartnerTransaction);

const period: ERPAccountingPeriod = { period_id: 'p-2026-10', fiscal_year: 2026, period_number: 10, start_date: '2026-10-01', end_date: '2026-10-31', status: 'OPEN' } as ERPAccountingPeriod;

describe('computeProjectPayoutPosition (user-confirmed 2026-10-06)', () => {
  it('share bigger than debt: the whole debt is offset, the rest is cash', () => {
    // 50% of 2,000,000 collected = 1,000,000 share; debt 300,000
    const pos = computeProjectPayoutPosition({
      partnerName: PARTNER,
      property: building,
      contracts: [contract('c1', 'prop-a', 2_000_000, 2_000_000)],
      commitments: [commitment('m1', 'prop-a', 500_000, 200_000, '2026-01-01')]
    });
    assert.equal(pos.collectionsShare, '1000000.00');
    assert.equal(pos.commitmentDebt, '300000.00');
    assert.equal(pos.offsetNow, '300000.00');
    assert.equal(pos.cashAvailable, '700000.00');
    assert.equal(pos.debtAfter, '0.00');
  });

  it('share smaller than debt: the share is offset, the rest stays as debt', () => {
    const pos = computeProjectPayoutPosition({
      partnerName: PARTNER,
      property: building,
      contracts: [contract('c1', 'prop-a', 400_000, 400_000)],
      commitments: [commitment('m1', 'prop-a', 500_000, 0, '2026-01-01')]
    });
    assert.equal(pos.collectionsShare, '200000.00');
    assert.equal(pos.offsetNow, '200000.00');
    assert.equal(pos.cashAvailable, '0.00');
    assert.equal(pos.debtAfter, '300000.00');
  });

  it('no debt: everything not yet paid is cash', () => {
    const pos = computeProjectPayoutPosition({
      partnerName: PARTNER,
      property: building,
      contracts: [contract('c1', 'prop-a', 1_000_000, 1_000_000)],
      transactions: [payout('prop-a', 100_000)]
    });
    assert.equal(pos.paidOut, '100000.00');
    assert.equal(pos.offsetNow, '0.00');
    assert.equal(pos.cashAvailable, '400000.00');
  });

  it('settles commitments oldest due date first', () => {
    const pos = computeProjectPayoutPosition({
      partnerName: PARTNER,
      property: building,
      contracts: [contract('c1', 'prop-a', 300_000, 300_000)],
      commitments: [
        commitment('late', 'prop-a', 200_000, 0, '2026-06-01'),
        commitment('early', 'prop-a', 100_000, 0, '2026-02-01')
      ]
    });
    assert.equal(pos.offsetNow, '150000.00');
    assert.deepEqual(pos.offsetAllocations.map(a => [a.commitmentId, a.amount]), [['early', '100000.00'], ['late', '50000.00']]);
  });

  it('ignores other projects, rescinded contracts, paid and cancelled commitments', () => {
    const pos = computeProjectPayoutPosition({
      partnerName: PARTNER,
      property: building,
      contracts: [
        contract('c1', 'prop-a', 1_000_000, 1_000_000),
        contract('c2', 'prop-a', 9_000_000, 9_000_000, 'Rescinded'),
        contract('c3', 'prop-b', 5_000_000, 5_000_000)
      ],
      transactions: [payout('prop-b', 250_000)],
      commitments: [
        commitment('b', 'prop-b', 900_000, 0, '2026-01-01'),
        commitment('paid', 'prop-a', 100_000, 100_000, '2026-01-01', 'PAID'),
        commitment('cancel', 'prop-a', 100_000, 0, '2026-01-01', 'CANCELLED')
      ]
    });
    assert.equal(pos.collectionsShare, '500000.00');
    assert.equal(pos.paidOut, '0.00');
    assert.equal(pos.commitmentDebt, '0.00');
    assert.equal(pos.cashAvailable, '500000.00');
  });

  it('counts earlier debt offsets as already paid out', () => {
    const pos = computeProjectPayoutPosition({
      partnerName: PARTNER,
      property: building,
      contracts: [contract('c1', 'prop-a', 1_000_000, 1_000_000)],
      transactions: [payout('prop-a', 200_000, 'DEBT_OFFSET')]
    });
    assert.equal(pos.paidOut, '200000.00');
    assert.equal(pos.cashAvailable, '300000.00');
  });

  it('founder gets what the other partners leave', () => {
    assert.equal(resolvePartnerSharePct(otherBuilding, PRIMARY_DEVELOPER_NAME), 50);
    const solo = { ...building, partner_splits: [] } as unknown as Property;
    assert.equal(resolvePartnerSharePct(solo, PRIMARY_DEVELOPER_NAME), 100);
    assert.equal(resolvePartnerSharePct(solo, PARTNER), 0);
  });
});

describe('createPayoutJournalEntry with a debt offset', () => {
  const balanced = (lines: { debit_amount: string; credit_amount: string }[]) => {
    const dr = lines.reduce((s, l) => s.plus(l.debit_amount), D(0));
    const cr = lines.reduce((s, l) => s.plus(l.credit_amount), D(0));
    assert.equal(dr.toFixed(2), cr.toFixed(2));
  };

  it('cash plus offset: Dr 303000 gross, Cr 301000 offset, Cr 101000 cash', () => {
    const entry = PartnersEngine.createPayoutJournalEntry({
      partnerName: PARTNER, amount: '700000', debtOffsetAmount: '300000',
      paymentMethod: 'CASH_101000', date: '2026-10-06', currentPeriod: period, routingAccount: '101000'
    });
    const byCode = Object.fromEntries(entry.lines.map(l => [l.account_code, l]));
    assert.equal(byCode['303000'].debit_amount, '1000000.00');
    assert.equal(byCode['301000'].credit_amount, '300000.00');
    assert.equal(byCode['101000'].credit_amount, '700000.00');
    balanced(entry.lines);
  });

  it('offset only: no cash line', () => {
    const entry = PartnersEngine.createPayoutJournalEntry({
      partnerName: PARTNER, amount: '0', debtOffsetAmount: '200000',
      paymentMethod: 'INSTAPAY_102000', date: '2026-10-06', currentPeriod: period, routingAccount: '102000'
    });
    assert.deepEqual(entry.lines.map(l => l.account_code).sort(), ['301000', '303000']);
    balanced(entry.lines);
  });

  it('cash only: unchanged two-line entry on InstaPay 102000', () => {
    const entry = PartnersEngine.createPayoutJournalEntry({
      partnerName: PARTNER, amount: '50000',
      paymentMethod: 'INSTAPAY_102000', date: '2026-10-06', currentPeriod: period, routingAccount: '102000'
    });
    assert.deepEqual(entry.lines.map(l => l.account_code).sort(), ['102000', '303000']);
    balanced(entry.lines);
  });
});
