import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPropertyStatement, buildClientStatement, buildPartnerStatement } from '../statements/builders';
import { statementHtml } from '../statements/statementHtml';
import { D } from '../math';
import type { Property } from '../../supabase/types';
import type { ERPContract, ERPPropertyCostItem, ERPInstallmentSchedule, ERPJournalEntry, ERPPartnerCommitment, ERPPartnerTransaction } from '../types';

const issuedAt = new Date('2026-10-08T14:32:00');
const property: Property = {
  id: '13c805ff-property', slug: 'yasmin', title_ar: 'عمارة الياسمين', title_en: 'Yasmin',
  description_ar: '', description_en: '', price_egp: 7500, area_sqm: 1000, bedrooms: 0, bathrooms: 0,
  type: 'building', location: '12 ش النصر، المعادي', latitude: null, longitude: null,
  completion_status: 'off_plan', listing_status: 'active', is_featured: false, created_at: '2026-01-10',
  construction_completed_at: '2026-08-20', price_finalized_at: '2026-08-20',
  partner_splits: [{ partner_name: 'محمود رشاد', share_percentage: 30 }, { partner_name: 'سعيد منير', share_percentage: 20 }],
  building_units: ['1-أ', '1-ب', '2-أ', '2-ب', '3-أ', '3-ب', '4-أ', '4-ب'].map((number, i) => ({
    unit_id: number, unit_number: number, floor: Math.floor(i / 2) + 1, area_sqm: i % 2 ? 120 : 140,
    bedrooms: 2, bathrooms: 1, price_egp: i % 2 ? 900000 : 1050000, status: i < 5 ? 'contracted' : 'available',
  })),
};
const costs: ERPPropertyCostItem[] = [
  ['خرسانة وهيكل', '1200000', '80000', '1000000', 'شركة النور للمقاولات'], ['تشطيبات', '650000', '-30000', '620000', 'مؤسسة الأمل'],
  ['كهرباء وسباكة', '310000', '0', '150000', 'الفنية الحديثة'], ['تراخيص ورسوم', '90000', '0', '90000', 'حي المعادي'],
].map(([name, base, adjustment, paid, contractor], i) => ({
  item_id: `cost-${i}`, property_id: property.id, category: 'civil_structure', phase: 'structural_skeleton',
  item_name_ar: name, item_name_en: name, quantity: 1, unit: 'بند', unit_cost_egp: base,
  total_cost_egp: base, supplier_contractor: contractor, logged_date: '2026-02-01', logged_by: 'admin', status: 'verified',
  payment_term: 'FULL_DEFERRED', paid_amount_egp: paid, linked_account_code: '201000',
  adjustments: adjustment === '0' ? [] : [{ adjustment_id: `adj-${i}`, parent_item_id: `cost-${i}`,
    adjustment_type: adjustment.startsWith('-') ? 'REFUND_OVERPAYMENT' : 'SUPPLEMENT_UNDERPAYMENT',
    amount_egp: adjustment.replace('-', ''), reason: 'تعديل', created_at: '2026-07-01', logged_by: 'admin' }],
}));
const contract: ERPContract = {
  contract_id: 'client41-contract', contract_number: 'ZF-C-0041', property_id: property.id, unit_id: '2-أ',
  buyer_name: 'كريم عادل', buyer_national_id: '28901234567014', buyer_phone: '01001234482',
  gross_contract_value: '1080000', total_cash_collected: '300000', currency: 'EGP', exchange_rate: '1',
  contract_date: '2026-03-01', handover_status: 'Pending', status: 'Active', payment_plan_type: 'INSTALLMENTS',
};
const contracts: ERPContract[] = [contract, ...[
  ['1-أ', '1050000', '600000', 'أحمد سامي', 'ZF-C-0037'], ['1-ب', '900000', '900000', 'منى خالد', 'ZF-C-0038'],
  ['2-ب', '920000', '460000', 'هالة يوسف', 'ZF-C-0044'], ['3-أ', '1100000', '220000', 'عمر فاروق', 'ZF-C-0049'],
].map(([id, gross, paid, buyer, number]) => ({ ...contract, contract_id: id, contract_number: number, unit_id: id, buyer_name: buyer,
  gross_contract_value: gross, total_cash_collected: paid }))];
const schedules: ERPInstallmentSchedule[] = [
  ['2026-03-01', '216000', '216000'], ['2026-06-01', '108000', '84000'],
  ['2026-09-01', '108000', '0'], ...['2026-12-01', '2027-03-01', '2027-06-01', '2027-09-01', '2027-12-01', '2028-03-01'].map(date => [date, '108000', '0']),
].map(([due, value, paid], i) => ({ schedule_id: `sch-${i}`, contract_id: contract.contract_id,
  tranche_number: i, due_date: due, nominal_value: value, amount_paid: paid,
  status: i === 0 ? 'Paid' : i === 1 ? 'Partially Paid' : 'Pending', schedule_version: 1 }));
const commitments: ERPPartnerCommitment[] = [{ commitment_id: 'cap-1', property_id: property.id,
  partner_name: 'محمود رشاد', milestone_name: 'رأس مال', committed_amount: '700000', paid_amount: '600000',
  due_date: '2026-06-30', status: 'PARTIALLY_PAID' },
  { commitment_id: 'cap-2', property_id: property.id, partner_name: 'زكريا فريد', milestone_name: 'رأس مال', committed_amount: '300000', paid_amount: '300000', due_date: '2026-06-30', status: 'PAID' },
  { commitment_id: 'cap-3', property_id: property.id, partner_name: 'سعيد منير', milestone_name: 'رأس مال', committed_amount: '160000', paid_amount: '160000', due_date: '2026-06-30', status: 'PAID' }];
const transactions: ERPPartnerTransaction[] = [{ id: 'po-1', transaction_number: 'PO-0004',
  partner_name: 'محمود رشاد', type: 'PROFIT_DISTRIBUTION', amount: '300000', property_id: property.id,
  payment_method: 'CASH_101000', journal_entry_number: 'JE-2026-0701', date: '2026-07-20', status: 'COMPLETED', memo: 'صرف أرباح' }];
const data = { properties: [property], propertyCosts: costs, contracts, schedules, journalEntries: [] as ERPJournalEntry[],
  partnerCommitments: commitments, partnerTransactions: transactions };
const partner = { id: 'a91f02c4-partner', name: 'محمود رشاد', national_id: '27501234567233' };

test('property mockup totals use net adjustments and equal cost and sales rows', () => {
  const model = buildPropertyStatement(property, data, issuedAt);
  assert.deepEqual([model.totals.netCost, model.totals.costPaid, model.totals.costOwed], ['2300000.00', '1860000.00', '440000.00']);
  assert.deepEqual([model.totals.sales, model.totals.collected, model.totals.remaining], ['5050000.00', '2480000.00', '2570000.00']);
  assert.equal(model.costRows.reduce((sum, row) => sum.plus(row.netEffectiveCost), D(0)).toFixed(2), model.totals.netCost);
  assert.equal(model.costRows.reduce((sum, row) => sum.plus(row.paidAmount), D(0)).toFixed(2), model.totals.costPaid);
  assert.equal(model.costRows.reduce((sum, row) => sum.plus(row.remainingAmount), D(0)).toFixed(2), model.totals.costOwed);
  assert.equal(model.salesRows.reduce((sum, row) => sum.plus(row.price), D(0)).toFixed(2), model.totals.sales);
});
test('client mockup totals and calendar overdue days on 2026-10-08', () => {
  const model = buildClientStatement(contract, data, issuedAt);
  assert.deepEqual(model.totals, { price: '1080000.00', paid: '300000.00', remaining: '780000.00', overdue: '132000.00' });
  assert.deepEqual(model.installmentRows.filter(row => row.overdueDays > 0).map(row => row.overdueDays), [129, 37]);
  assert.equal(model.installmentRows.reduce((sum, row) => sum.plus(row.paid), D(0)).toFixed(2), model.totals.paid);
  assert.equal(model.installmentRows.reduce((sum, row) => sum.plus(row.amount), D(0)).toFixed(2), model.totals.price);
});
test('callout amounts follow the table convention: whole pounds without .00', () => {
  const client = buildClientStatement(contract, data, issuedAt);
  assert.match(client.callouts[0], /مبلغ متأخر 132,000 ج\.م /);
  const partnerModel = buildPartnerStatement(partner, data, issuedAt);
  assert.ok(partnerModel.callouts.every(text => !/\.00 ج\.م/.test(text)), partnerModel.callouts.join(' | '));
  assert.match(partnerModel.callouts.join(' '), /744,000 ج\.م/);
});
test('partner mockup available 744000 - 300000 - 100000 = 344000, sums project rows', () => {
  const model = buildPartnerStatement(partner, data, issuedAt);
  assert.deepEqual([model.totals.collectionsShare, model.totals.paidOut, model.totals.commitmentDebt, model.totals.cashAvailable], ['744000.00', '300000.00', '100000.00', '344000.00']);
  assert.equal(model.projectRows.reduce((sum, row) => sum.plus(row.cashAvailable), D(0)).toFixed(2), model.totals.cashAvailable);
});
test('renderer escapes user strings, masks identifiers, and emits standalone RTL A4', () => {
  const model = buildClientStatement({ ...contract, buyer_name: '<b>x</b>' }, data, issuedAt);
  const html = statementHtml(model, 'http://localhost:3000');
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'));
  assert.ok(!html.includes('<b>x</b>'));
  assert.ok(html.includes('dir="rtl"'));
  assert.ok(html.includes('ST-C-20261008-1432-client41'));
  assert.ok(html.includes('2890•••••••014'));
  assert.ok(html.includes('0100••••482'));
  assert.ok(html.includes('27.8%'));
  assert.ok(!html.includes(contract.buyer_national_id!));
  assert.ok(!html.includes('undefined') && !html.includes('NaN'));
  assert.ok(html.includes('http://localhost:3000/fonts/thmanyahsans-Regular.woff2'));
  assert.ok(html.includes('size:A4;margin:0'));
});
test('property GL mismatch renders real scoped difference, untraceable balances omitted', () => {
  const entry: ERPJournalEntry = { entry_id: 'je1', entry_number: 'JE-WIP-1', entry_date: '2026-02-01',
    period_id: 'p', description: 'تكلفة', source_module: 'WIP_ALLOCATION', source_entity_id: property.id,
    created_by: 'admin', created_at: '2026-02-01', is_locked: true,
    lines: [{ line_id: 'l1', entry_id: 'je1', line_number: 1, account_code: '151000', debit_amount: '2320000', credit_amount: '0' }] };
  const model = buildPropertyStatement(property, { ...data, journalEntries: [entry] }, issuedAt);
  assert.equal(model.reconciliation[0].difference, '20000.00');
  const html = statementHtml(model, 'http://localhost:3000');
  assert.ok(html.includes('غير مطابق') && html.includes('20,000'));
  assert.equal(buildPropertyStatement(property, data, issuedAt).reconciliation.length, 0);
});
test('receipts use linked cash journal lines, never schedules or bank-transit entries as receipts', () => {
  const entry: ERPJournalEntry = { entry_id: 'r1', entry_number: 'JE-RCP-1', entry_date: '2026-03-01',
    period_id: 'p', description: 'قبض', source_module: 'SALES', source_entity_id: schedules[0].schedule_id,
    created_by: 'admin', created_at: '2026-03-01', is_locked: true, lines: [
      { line_id: 'a', entry_id: 'r1', line_number: 1, account_code: '101000', debit_amount: '216000', credit_amount: '0', contract_id: contract.contract_id },
      { line_id: 'b', entry_id: 'r1', line_number: 2, account_code: '203000', debit_amount: '0', credit_amount: '216000', contract_id: contract.contract_id },
    ] };
  const model = buildClientStatement(contract, { ...data, journalEntries: [entry] }, issuedAt);
  assert.equal(model.receiptRows.length, 1);
  assert.equal(model.receiptRows[0].amount, '216000.00');
  assert.equal(model.receiptRows[0].journal, 'JE-RCP-1');
  assert.equal(buildClientStatement(contract, data, issuedAt).receiptRows.length, 0);
});
test('missing identity hidden, empty sections muted, cancelled and superseded rows excluded', () => {
  const model = buildClientStatement({ ...contract, buyer_national_id: undefined, buyer_phone: undefined },
    { ...data, schedules: [{ ...schedules[1], status: 'SUPERSEDED' }, { ...schedules[2], status: 'Void' }] }, issuedAt);
  const html = statementHtml(model, 'http://localhost:3000');
  assert.ok(!html.includes('الرقم القومي') && !html.includes('الهاتف'));
  assert.equal(model.installmentRows.length, 0);
  assert.ok(html.includes('لا توجد أقساط مسجلة') && !html.includes('<tbody></tbody>'));
});
test('pending and unassigned payouts do not reduce per-project cash, debt shortfall stays recorded', () => {
  const model = buildPartnerStatement(partner, { ...data, contracts: [{ ...contract, total_cash_collected: '100000' }],
    partnerTransactions: [{ ...transactions[0], status: 'PENDING' }, { ...transactions[0], property_id: undefined }] }, issuedAt);
  assert.equal(model.totals.paidOut, '0.00');
  assert.equal(model.totals.cashAvailable, '0.00');
  assert.equal(model.projectRows[0].debtAfter, '70000.00');
});
test('production property-source journals retain title-tagged lines and cost entry references', () => {
  const entry: ERPJournalEntry = { entry_id: 'wip', entry_number: 'JE-WIP-COST-0', entry_date: '2026-02-01',
    period_id: 'p', description: 'تكلفة', source_module: 'WIP_ALLOCATION', source_entity_id: property.id,
    created_by: 'admin', created_at: '2026-02-01', is_locked: true,
    lines: [{ line_id: 'l', entry_id: 'wip', line_number: 1, account_code: '151000', debit_amount: '2300000', credit_amount: '0', unit_id: property.title_ar }] };
  const model = buildPropertyStatement(property, { ...data, journalEntries: [entry] }, issuedAt);
  assert.equal(model.reconciliation[0].difference, '0.00');
  assert.equal(model.costRows[0].journal, 'JE-WIP-COST-0');
  assert.ok(statementHtml(model, 'http://localhost:3000').includes('JE-WIP-COST-0'));
});
test('delivered WIP is not compared with lifetime costs, unrelated property entries excluded', () => {
  const entry: ERPJournalEntry = { entry_id: 'foreign', entry_number: 'JE-FOREIGN', entry_date: '2026-02-01',
    period_id: 'p', description: 'تكلفة', source_module: 'WIP_ALLOCATION', source_entity_id: 'other-property',
    created_by: 'admin', created_at: '2026-02-01', is_locked: true,
    lines: [{ line_id: 'l', entry_id: 'foreign', line_number: 1, account_code: '151000', debit_amount: '2300000', credit_amount: '0' }] };
  assert.equal(buildPropertyStatement(property, { ...data, journalEntries: [entry] }, issuedAt).reconciliation.length, 0);
  const model = buildPropertyStatement(property, { ...data, contracts: [{ ...contract, handover_status: 'Delivered' }], journalEntries: [{ ...entry, source_entity_id: property.id }] }, issuedAt);
  assert.equal(model.reconciliation.length, 0);
});
test('recorded unit area appears in property sales table', () => {
  const linked: Property = { ...property, building_units: [{ unit_id: 'unit-a', unit_number: '2-أ', floor: 2, area_sqm: 140, bedrooms: 2, bathrooms: 1, price_egp: 1080000, status: 'contracted' }] };
  const linkedContract = { ...contract, building_unit_id: 'unit-a' };
  const model = buildPropertyStatement(linked, { ...data, properties: [linked], contracts: [linkedContract] }, issuedAt);
  assert.equal(model.salesRows[0].area, '140');
  assert.ok(statementHtml(model, 'http://localhost:3000').includes('م²'));
});

test('property sales retain each buyer and contract; latest unique journal plus count fits reserved columns', () => {
  const entries = ['2026-03-01', '2026-03-20', '2026-03-10'].map((date, i): ERPJournalEntry => ({
    entry_id: `sale-${i}`, entry_number: `JE-2026-00${i}`, entry_date: date, created_at: date,
    period_id: 'p', description: 'قبض', source_module: 'SALES', source_entity_id: contract.contract_id,
    created_by: 'admin', is_locked: true, lines: [],
  }));
  const model = buildPropertyStatement(property, { ...data, journalEntries: [...entries, entries[1]] }, issuedAt);
  const table = model.tables[1];
  assert.deepEqual(table.rows.map(row => row.cells.slice(1, 3)), contracts.map(c => [c.buyer_name, c.contract_number]));
  assert.equal(model.salesRows[0].journal, 'JE-2026-001 +2');
  const html = statementHtml(model, 'http://localhost:3000');
  assert.match(html, /<colgroup>/);
  assert.match(html, /class="ref nowrap"/);
  assert.match(html, /class="nowrap">كريم عادل/);
});

test('contractors come from each cost item; entirely absent contractor column is hidden', () => {
  const model = buildPropertyStatement(property, data, issuedAt);
  assert.deepEqual(model.tables[0].rows.map(row => row.cells[1]), costs.map(c => c.supplier_contractor));
  const missing = buildPropertyStatement(property, { ...data, propertyCosts: costs.map(c => ({ ...c, supplier_contractor: undefined })) }, issuedAt);
  assert.ok(!missing.tables[0].columns.some(column => column.label === 'المقاول'));
  assert.equal(missing.tables[0].rows[0].cells.length, missing.tables[0].columns.length);
  assert.equal(missing.tables[0].total![1], '2250000.00');
});

test('property lists all normalized partners and property-wide capital without other properties or cancelled commitments', () => {
  const model = buildPropertyStatement(property, { ...data, partnerCommitments: [...commitments,
    { ...commitments[0], property_id: 'other', committed_amount: '999999' },
    { ...commitments[0], status: 'CANCELLED', committed_amount: '999999' }] }, issuedAt);
  const names = model.identity.find(field => field.label === 'الشركاء')!.value!;
  assert.ok(names.includes('زكريا فريد 50%') && names.includes('محمود رشاد 30%') && names.includes('سعيد منير 20%'));
  assert.deepEqual([model.totals.capital, model.totals.capitalPaid, model.totals.capitalDebt], ['1160000.00', '1060000.00', '100000.00']);
});

test('five lifecycle stages show recorded events, distinguish construction cost date and hollow future milestones', () => {
  const model = buildPropertyStatement(property, data, issuedAt);
  assert.equal(model.timeline!.length, 5);
  assert.equal(model.timeline![1].date, '2026-02-01');
  assert.equal(model.timeline![3].date, '2026-08-20');
  const html = statementHtml(model, 'http://localhost:3000');
  assert.match(html, /أول تكلفة تنفيذ مسجلة/);
  assert.match(html, /class="fut"><b>التوزيع على الشركاء/);
  const unknown = buildPropertyStatement({ ...property, construction_completed_at: null, price_finalized_at: null }, { ...data, propertyCosts: [], contracts: [] }, issuedAt);
  assert.equal(unknown.timeline!.length, 5);
  assert.equal((statementHtml(unknown, 'http://localhost:3000').match(/class="fut"/g) || []).length, 4);
});
