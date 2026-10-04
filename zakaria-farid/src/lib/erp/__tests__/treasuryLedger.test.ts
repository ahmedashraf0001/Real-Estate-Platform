import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTreasuryMovements,
  summarizeTreasury,
  getTreasuryPeriodRange,
  buildUpcomingDues,
} from '../treasuryLedger';
import { D } from '../math';
import { getAvailableCash } from '../canonicalMetrics';
import type { ERPJournalEntry, ERPContract, ERPInstallmentSchedule, ERPPropertyCostItem } from '../types';

type LineTuple = [string, number | string, number | string, Record<string, unknown>?];

function je(
  id: string,
  date: string,
  createdAt: string,
  description: string,
  lines: LineTuple[]
): ERPJournalEntry {
  return {
    entry_id: id,
    entry_number: id.toUpperCase(),
    entry_date: date,
    period_id: '2026-10',
    source_module: 'MANUAL',
    description,
    is_locked: false,
    created_by: 'test-user',
    created_at: createdAt,
    lines: lines.map((l, idx) => ({
      line_id: `${id}-l${idx + 1}`,
      entry_id: id,
      line_number: idx + 1,
      account_code: l[0],
      debit_amount: String(l[1]),
      credit_amount: String(l[2]),
      ...(l[3] || {}),
    })),
  } as unknown as ERPJournalEntry;
}

const contract = {
  contract_id: 'c1',
  contract_number: 'ZF-2026-9197',
  buyer_name: 'Verify Buyer',
} as unknown as ERPContract;

const e1 = je(
  'e1',
  '2026-10-04',
  '2026-10-04T11:19:00Z',
  'Installment collected via InstaPay',
  [
    ['102000', 450000, 0, { contract_id: 'c1' }],
    ['203000', 0, 450000, { contract_id: 'c1' }],
  ]
);

const e2 = je(
  'e2',
  '2026-10-04',
  '2026-10-04T11:23:00Z',
  'Apartment tax remittance settlement',
  [
    ['204000', 75000, 0],
    ['102000', 0, 75000],
  ]
);

const e3 = je(
  'e3',
  '2026-10-04',
  '2026-10-04T11:27:00Z',
  'Refund payout to customer Verify Buyer for rescinded contract ZF-2026-9197',
  [
    ['206200', 150000, 0],
    ['101000', 0, 150000],
  ]
);

const e4 = je(
  'e4',
  '2026-10-04',
  '2026-10-04T11:35:00Z',
  'مصروف موقع',
  [
    ['151000', 100000, 0],
    ['102000', 0, 100000],
  ]
);

const e5 = je(
  'e5',
  '2026-10-04',
  '2026-10-04T12:00:00Z',
  'Move to safe',
  [
    ['101000', 20000, 0],
    ['102000', 0, 20000],
  ]
);

const e6 = je(
  'e6',
  '2026-10-04',
  '2026-10-04T12:10:00Z',
  'Accrual only',
  [
    ['604000', 75000, 0],
    ['204000', 0, 75000],
  ]
);

const e7 = je(
  'e7',
  '2026-09-20',
  '2026-09-20T09:00:00Z',
  'Capital',
  [
    ['101000', 500000, 0],
    ['301000', 0, 500000],
  ]
);

const FX = [e1, e2, e3, e4, e5, e6, e7];
const contracts = [contract];

describe('Treasury Ledger: Cash Book & Operations', () => {
  it('1. buildTreasuryMovements(FX) length 6 (e6 skipped); first element id e5 (newest), last e7', () => {
    const movs = buildTreasuryMovements(FX, contracts, true);
    assert.equal(movs.length, 6);
    assert.equal(movs[0].id, 'e5');
    assert.equal(movs[movs.length - 1].id, 'e7');
  });

  it('2. kinds: e1 customer_collection IN 102000; e2 tax_remittance OUT; e3 customer_refund OUT 101000; e4 site_expense OUT; e5 internal_transfer TRANSFER account 101000 fromAccount 102000 amount 20000 signedAmount 0; e7 partner_injection IN', () => {
    const movs = buildTreasuryMovements(FX, contracts, true);
    const mById = new Map(movs.map((m) => [m.id, m]));

    const m1 = mById.get('e1')!;
    assert.equal(m1.kind, 'customer_collection');
    assert.equal(m1.direction, 'IN');
    assert.equal(m1.account, '102000');

    const m2 = mById.get('e2')!;
    assert.equal(m2.kind, 'tax_remittance');
    assert.equal(m2.direction, 'OUT');

    const m3 = mById.get('e3')!;
    assert.equal(m3.kind, 'customer_refund');
    assert.equal(m3.direction, 'OUT');
    assert.equal(m3.account, '101000');

    const m4 = mById.get('e4')!;
    assert.equal(m4.kind, 'site_expense');
    assert.equal(m4.direction, 'OUT');

    const m5 = mById.get('e5')!;
    assert.equal(m5.kind, 'internal_transfer');
    assert.equal(m5.direction, 'TRANSFER');
    assert.equal(m5.account, '101000');
    assert.equal(m5.fromAccount, '102000');
    assert.ok(m5.amount.eq(20000));
    assert.ok(m5.signedAmount.eq(0));

    const m7 = mById.get('e7')!;
    assert.equal(m7.kind, 'partner_injection');
    assert.equal(m7.direction, 'IN');
  });

  it('3. balanceAfter: e7 500000, e1 950000, e2 875000, e3 725000, e4 625000, e5 625000', () => {
    const movs = buildTreasuryMovements(FX, contracts, true);
    const mById = new Map(movs.map((m) => [m.id, m]));

    assert.ok(mById.get('e7')!.balanceAfter.eq(500000));
    assert.ok(mById.get('e1')!.balanceAfter.eq(950000));
    assert.ok(mById.get('e2')!.balanceAfter.eq(875000));
    assert.ok(mById.get('e3')!.balanceAfter.eq(725000));
    assert.ok(mById.get('e4')!.balanceAfter.eq(625000));
    assert.ok(mById.get('e5')!.balanceAfter.eq(625000));
  });

  it('4. isAr=true: e1.description === "تحصيل من عميل — عقد ZF-2026-9197", e1.counterparty "Verify Buyer"; e4.description === "مصروف موقع"; e3.contract?.contract_id === "c1" (description substring match); e2.counterparty "مصلحة الضرائب". isAr=false: e2.description === "Apartment tax remittance settlement"', () => {
    const movsAr = buildTreasuryMovements(FX, contracts, true);
    const mByIdAr = new Map(movsAr.map((m) => [m.id, m]));

    const m1 = mByIdAr.get('e1')!;
    assert.equal(m1.description, 'تحصيل من عميل — عقد ZF-2026-9197');
    assert.equal(m1.counterparty, 'Verify Buyer');

    const m4 = mByIdAr.get('e4')!;
    assert.equal(m4.description, 'مصروف موقع');

    const m3 = mByIdAr.get('e3')!;
    assert.equal(m3.contract?.contract_id, 'c1');

    const m2 = mByIdAr.get('e2')!;
    assert.equal(m2.counterparty, 'مصلحة الضرائب');

    const movsEn = buildTreasuryMovements(FX, contracts, false);
    const m2En = movsEn.find((m) => m.id === 'e2')!;
    assert.equal(m2En.description, 'Apartment tax remittance settlement');
  });

  it('5. summarizeTreasury(all, "all", "2026-10-04"): TOTAL closing 625000 and equals getAvailableCash(FX).totalCash; 101000 closing 370000; 102000 closing 255000; inflow 950000, outflow 325000, net 625000, count 6', () => {
    const movs = buildTreasuryMovements(FX, contracts, true);
    const sumAll = summarizeTreasury(movs, 'all', '2026-10-04');
    const availCash = getAvailableCash(FX);

    const totAcc = sumAll.accounts.find((a) => a.code === 'TOTAL')!;
    const a101 = sumAll.accounts.find((a) => a.code === '101000')!;
    const a102 = sumAll.accounts.find((a) => a.code === '102000')!;

    assert.ok(totAcc.closing.eq(625000));
    assert.ok(totAcc.closing.eq(availCash.totalCash));
    assert.ok(a101.closing.eq(370000));
    assert.ok(a102.closing.eq(255000));
    assert.ok(sumAll.inflow.eq(950000));
    assert.ok(sumAll.outflow.eq(325000));
    assert.ok(sumAll.net.eq(625000));
    assert.equal(sumAll.count, 6);
  });

  it('6. summarizeTreasury(all, "today", "2026-10-04"): TOTAL opening 500000, inflow 450000, outflow 325000, closing 625000; 101000 opening 500000 inflow 20000 outflow 150000 closing 370000; count 5; byKind order', () => {
    const movs = buildTreasuryMovements(FX, contracts, true);
    const sumToday = summarizeTreasury(movs, 'today', '2026-10-04');

    const totToday = sumToday.accounts.find((a) => a.code === 'TOTAL')!;
    const a101Today = sumToday.accounts.find((a) => a.code === '101000')!;

    assert.ok(totToday.opening.eq(500000));
    assert.ok(totToday.inflow.eq(450000));
    assert.ok(totToday.outflow.eq(325000));
    assert.ok(totToday.closing.eq(625000));

    assert.ok(a101Today.opening.eq(500000));
    assert.ok(a101Today.inflow.eq(20000));
    assert.ok(a101Today.outflow.eq(150000));
    assert.ok(a101Today.closing.eq(370000));

    assert.equal(sumToday.count, 5);

    assert.equal(sumToday.byKind.length, 5);
    assert.equal(sumToday.byKind[0].kind, 'customer_collection');
    assert.equal(sumToday.byKind[0].direction, 'IN');
    assert.equal(sumToday.byKind[0].share, 100);

    assert.equal(sumToday.byKind[1].kind, 'customer_refund');
    assert.equal(sumToday.byKind[1].direction, 'OUT');
    assert.equal(sumToday.byKind[1].share, 46.2);

    assert.equal(sumToday.byKind[2].kind, 'site_expense');
    assert.equal(sumToday.byKind[2].direction, 'OUT');
    assert.equal(sumToday.byKind[2].share, 30.8);

    assert.equal(sumToday.byKind[3].kind, 'tax_remittance');
    assert.equal(sumToday.byKind[3].direction, 'OUT');
    assert.equal(sumToday.byKind[3].share, 23.1);

    assert.equal(sumToday.byKind[4].kind, 'internal_transfer');
    assert.equal(sumToday.byKind[4].direction, 'TRANSFER');
    assert.equal(sumToday.byKind[4].share, null);
  });

  it('7. getTreasuryPeriodRange("7d","2026-10-04") -> {from "2026-09-28", to "2026-10-04"}; ("month","2026-10-04") -> from "2026-10-01"; ("7d","2026-03-03") -> from "2026-02-25"', () => {
    const r7d = getTreasuryPeriodRange('7d', '2026-10-04');
    assert.deepEqual(r7d, { from: '2026-09-28', to: '2026-10-04' });

    const rMonth = getTreasuryPeriodRange('month', '2026-10-04');
    assert.equal(rMonth.from, '2026-10-01');
    assert.equal(rMonth.to, '2026-10-04');

    const r7dFeb = getTreasuryPeriodRange('7d', '2026-03-03');
    assert.equal(r7dFeb.from, '2026-02-25');
    assert.equal(r7dFeb.to, '2026-03-03');
  });

  it('8. Empty/null input: buildTreasuryMovements(null, null, true) -> []; summarizeTreasury([], "all", "2026-10-04") TOTAL closing equals D(0), byKind []', () => {
    const emptyMovs = buildTreasuryMovements(null, null, true);
    assert.deepEqual(emptyMovs, []);

    const emptySum = summarizeTreasury([], 'all', '2026-10-04');
    const emptyTotal = emptySum.accounts.find((a) => a.code === 'TOTAL')!;
    assert.ok(emptyTotal.closing.eq(D(0)));
    assert.deepEqual(emptySum.byKind, []);
  });

  it('9. Inputs not mutated: JSON.stringify(FX) before === after', () => {
    const beforeStr = JSON.stringify(FX);
    const movs = buildTreasuryMovements(FX, contracts, true);
    buildTreasuryMovements(FX, contracts, false);
    summarizeTreasury(movs, 'today', '2026-10-04');
    summarizeTreasury(movs, 'all', '2026-10-04');
    const afterStr = JSON.stringify(FX);
    assert.equal(beforeStr, afterStr);
  });
});

describe('buildUpcomingDues', () => {
  const contracts = [
    { contract_id: 'c1', contract_number: 'ZF-1', buyer_name: 'A', status: 'Active' },
    { contract_id: 'c2', contract_number: 'ZF-2', buyer_name: 'B', status: 'Rescinded' },
  ] as unknown as ERPContract[];

  const schedules = [
    { schedule_id: 's0', contract_id: 'c1', tranche_number: 0, due_date: '2026-09-30', nominal_value: '100000', amount_paid: '0', status: 'Pending' },
    { schedule_id: 's1', contract_id: 'c1', tranche_number: 1, due_date: '2026-10-20', nominal_value: '50000', amount_paid: '20000', status: 'Partially Paid' },
    { schedule_id: 's2', contract_id: 'c1', tranche_number: 2, due_date: '2026-12-20', nominal_value: '50000', amount_paid: '0', status: 'Pending' },
    { schedule_id: 's3', contract_id: 'c1', tranche_number: 3, due_date: '2026-10-10', nominal_value: '50000', amount_paid: '50000', status: 'Paid' },
    { schedule_id: 's4', contract_id: 'c2', tranche_number: 1, due_date: '2026-10-10', nominal_value: '70000', amount_paid: '0', status: 'Pending' },
    { schedule_id: 's5', contract_id: 'c1', tranche_number: 4, due_date: '2026-10-12', nominal_value: '50000', amount_paid: '0', status: 'SUPERSEDED' },
  ] as unknown as ERPInstallmentSchedule[];

  const propertyCosts = [
    {
      item_id: 'k1',
      item_name_ar: 'أعمال خرسانة',
      supplier_contractor: 'Contractor X',
      payable_installments: [
        { installment_id: 'i1', title_ar: 'دفعة ١', due_date: '2026-10-15', amount_egp: '40000', paid_amount_egp: '0', status: 'PENDING' },
        { installment_id: 'i2', title_ar: 'دفعة ٢', due_date: '2026-10-01', amount_egp: '10000', paid_amount_egp: '10000', status: 'PAID' },
        { installment_id: 'i3', title_ar: 'دفعة ٣', due_date: '2026-10-02', amount_egp: '25000', paid_amount_egp: '5000', status: 'OVERDUE' },
      ],
    },
  ] as unknown as ERPPropertyCostItem[];

  it('1-4. filters, sorts and aggregates upcoming dues correctly (Arabic)', () => {
    const res = buildUpcomingDues({
      schedules,
      contracts,
      propertyCosts,
      todayStr: '2026-10-04',
      isAr: true,
    });

    // 1. items ids in order: ['sch-s0','pay-k1-i3','pay-k1-i1','sch-s1']
    assert.deepEqual(res.items.map(i => i.id), ['sch-s0', 'pay-k1-i3', 'pay-k1-i1', 'sch-s1']);

    // 2. sch-s0: direction IN, isOverdue true, amount 100000, title 'دفعة المقدم — ZF-1', party 'A'
    const s0 = res.items.find(i => i.id === 'sch-s0')!;
    assert.equal(s0.direction, 'IN');
    assert.equal(s0.isOverdue, true);
    assert.ok(s0.amount.eq(D(100000)));
    assert.equal(s0.title, 'دفعة المقدم — ZF-1');
    assert.equal(s0.party, 'A');

    // 3. sch-s1 amount 30000, title 'القسط 1 — ZF-1'; pay-k1-i3 amount 20000, isOverdue true, party 'Contractor X'
    const s1 = res.items.find(i => i.id === 'sch-s1')!;
    assert.ok(s1.amount.eq(D(30000)));
    assert.equal(s1.title, 'القسط 1 — ZF-1');

    const i3 = res.items.find(i => i.id === 'pay-k1-i3')!;
    assert.ok(i3.amount.eq(D(20000)));
    assert.equal(i3.isOverdue, true);
    assert.equal(i3.party, 'Contractor X');

    // 4. inTotal 130000, inCount 2, outTotal 60000, outCount 2, overdueCount 2, horizonEnd '2026-11-03'
    assert.ok(res.inTotal.eq(D(130000)));
    assert.equal(res.inCount, 2);
    assert.ok(res.outTotal.eq(D(60000)));
    assert.equal(res.outCount, 2);
    assert.equal(res.overdueCount, 2);
    assert.equal(res.horizonEnd, '2026-11-03');
  });

  it('5. isAr false: sch-s0 title "Down payment — ZF-1"', () => {
    const res = buildUpcomingDues({
      schedules,
      contracts,
      propertyCosts,
      todayStr: '2026-10-04',
      isAr: false,
    });
    const s0 = res.items.find(i => i.id === 'sch-s0')!;
    assert.equal(s0.title, 'Down payment — ZF-1');
  });

  it('6. empty: buildUpcomingDues({ todayStr:"2026-10-04", isAr:true }) -> items [], inTotal eq 0, overdueCount 0', () => {
    const res = buildUpcomingDues({ todayStr: '2026-10-04', isAr: true });
    assert.deepEqual(res.items, []);
    assert.ok(res.inTotal.eq(0));
    assert.equal(res.overdueCount, 0);
  });
});

