import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PartnersEngine } from '../partnersEngine';
import { InvariantsValidator } from '../invariants';
import { D } from '../math';

describe('Unified Treasury Architecture: Cash & InstaPay Payment Methods (Account 101000)', () => {
  const testPeriod = {
    period_id: 'prd-2026-03',
    fiscal_year: 2026,
    period_number: 3,
    start_date: '2026-03-01',
    end_date: '2026-03-31',
    status: 'OPEN' as const
  };

  describe('1. Capital Injections: Unified Destination (Dr 101000 / Cr 301000)', () => {
    it('routes cash capital injection directly to treasury account 101000', () => {
      const entry = PartnersEngine.createCapitalInjectionJournalEntry({
        partnerName: 'الحاج رجب الصاوي',
        amount: '500000.00',
        paymentMethod: 'CASH_101000',
        propertyTitle: 'برج الأندلس',
        receiptRef: 'REC-CASH-001',
        date: '2026-03-10',
        currentPeriod: testPeriod
      });

      // Verify balance
      const balance = InvariantsValidator.verifyDoubleEntryBalance([entry]);
      assert.strictEqual(balance.passed, true, 'Capital injection journal entry must balance');

      // Verify lines
      const debitLine = entry.lines.find(l => l.account_code === '101000');
      const creditLine = entry.lines.find(l => l.account_code === '301000');

      assert.ok(debitLine, 'Must debit Treasury Safe 101000');
      assert.strictEqual(debitLine.debit_amount, '500000.00');
      assert.ok(debitLine.memo?.includes('101000'), 'Debit memo must reference 101000');
      assert.ok(debitLine.memo?.includes('كاش'), 'Debit memo must indicate cash channel');

      assert.ok(creditLine, 'Must credit Partner Capital 301000');
      assert.strictEqual(creditLine.credit_amount, '500000.00');
    });

    it('routes InstaPay capital injection to treasury account 101000 when routingAccount is specified', () => {
      const entry = PartnersEngine.createCapitalInjectionJournalEntry({
        partnerName: 'م. أحمد الشريف',
        amount: '800000.00',
        paymentMethod: 'INSTAPAY_102000',
        propertyTitle: 'عمارة النور والصفوة',
        receiptRef: 'REC-IP-002',
        date: '2026-03-12',
        currentPeriod: testPeriod,
        routingAccount: '101000'
      });

      // Verify balance
      const balance = InvariantsValidator.verifyDoubleEntryBalance([entry]);
      assert.strictEqual(balance.passed, true, 'InstaPay injection entry must balance');

      // Verify both Cash and InstaPay push money to the same place (101000)
      const debitLine = entry.lines.find(l => l.account_code === '101000');
      assert.ok(debitLine, 'InstaPay must debit unified treasury 101000 when routing to operating treasury');
      assert.strictEqual(debitLine.debit_amount, '800000.00');
      assert.ok(debitLine.memo?.includes('إنستاباي'), 'Debit memo must state InstaPay channel');
      assert.ok(debitLine.memo?.includes('الخزينة الرئيسية'), 'Debit memo must confirm receipt in main treasury');

      const creditLine = entry.lines.find(l => l.account_code === '301000');
      assert.ok(creditLine, 'Must credit Partner Capital 301000');
      assert.strictEqual(creditLine.credit_amount, '800000.00');
    });

    it('routes modern INSTAPAY / INSTAPAY_101000 method codes directly to 101000 by default', () => {
      const entryModern = PartnersEngine.createCapitalInjectionJournalEntry({
        partnerName: 'د. هاني المنياوي',
        amount: '350000.00',
        paymentMethod: 'INSTAPAY',
        propertyTitle: 'برج الأندلس',
        receiptRef: 'REC-IP-003',
        date: '2026-03-15',
        currentPeriod: testPeriod
      });

      const debitLine = entryModern.lines.find(l => l.account_code === '101000');
      assert.ok(debitLine, 'Modern INSTAPAY method must default to 101000 without requiring routingAccount');
      assert.strictEqual(debitLine.debit_amount, '350000.00');
    });
  });

  describe('2. Profit Payouts & Distributions: Unified Source (Dr 303000 / Cr 101000)', () => {
    it('disburses cash payout from treasury account 101000', () => {
      const entry = PartnersEngine.createPayoutJournalEntry({
        partnerName: 'الحاج رجب الصاوي',
        amount: '120000.00',
        paymentMethod: 'CASH_101000',
        propertyTitle: 'عمارة النور والصفوة',
        receiptRef: 'PAY-CASH-101',
        date: '2026-03-18',
        currentPeriod: testPeriod
      });

      const balance = InvariantsValidator.verifyDoubleEntryBalance([entry]);
      assert.strictEqual(balance.passed, true);

      const debit303 = entry.lines.find(l => l.account_code === '303000');
      const credit101 = entry.lines.find(l => l.account_code === '101000');

      assert.ok(debit303, 'Must debit 303000 Partner Distributions');
      assert.strictEqual(debit303.debit_amount, '120000.00');

      assert.ok(credit101, 'Must credit Treasury 101000');
      assert.strictEqual(credit101.credit_amount, '120000.00');
      assert.ok(credit101.memo?.includes('كاش'), 'Credit memo must indicate cash disbursement');
    });

    it('disburses InstaPay payout from treasury account 101000 when unified treasury routing is applied', () => {
      const entry = PartnersEngine.createPayoutJournalEntry({
        partnerName: 'م. أحمد الشريف',
        amount: '250000.00',
        paymentMethod: 'INSTAPAY_102000',
        propertyTitle: 'برج الأندلس',
        receiptRef: 'PAY-IP-102',
        date: '2026-03-20',
        currentPeriod: testPeriod,
        routingAccount: '101000'
      });

      const balance = InvariantsValidator.verifyDoubleEntryBalance([entry]);
      assert.strictEqual(balance.passed, true);

      const debit303 = entry.lines.find(l => l.account_code === '303000');
      const credit101 = entry.lines.find(l => l.account_code === '101000');

      assert.ok(debit303, 'Must debit 303000');
      assert.strictEqual(debit303.debit_amount, '250000.00');

      assert.ok(credit101, 'Must credit Treasury 101000 for InstaPay payout');
      assert.strictEqual(credit101.credit_amount, '250000.00');
      assert.ok(credit101.memo?.includes('إنستاباي'), 'Credit memo must state InstaPay channel');
      assert.ok(credit101.memo?.includes('الخزينة الرئيسية'), 'Credit memo must confirm disbursement from main treasury');
    });

    it('disburses modern INSTAPAY method directly from 101000 by default', () => {
      const entryModern = PartnersEngine.createPayoutJournalEntry({
        partnerName: 'د. هاني المنياوي',
        amount: '90000.00',
        paymentMethod: 'INSTAPAY',
        propertyTitle: 'برج الأندلس',
        receiptRef: 'PAY-IP-103',
        date: '2026-03-22',
        currentPeriod: testPeriod
      });

      const credit101 = entryModern.lines.find(l => l.account_code === '101000');
      assert.ok(credit101, 'Modern INSTAPAY payout must credit 101000 by default');
      assert.strictEqual(credit101.credit_amount, '90000.00');
    });
  });

  describe('3. Commercial Bank (102000) Isolation', () => {
    it('isolates commercial bank account 102000 for cheques and bank wires', () => {
      const bankEntry = PartnersEngine.createCapitalInjectionJournalEntry({
        partnerName: 'شركة النماء للاستثمار',
        amount: '2000000.00',
        paymentMethod: 'BANK_102000',
        propertyTitle: 'مشروع مجمع الخدمات',
        receiptRef: 'BANK-TR-001',
        date: '2026-03-25',
        currentPeriod: testPeriod,
        routingAccount: '102000'
      });

      const debit102 = bankEntry.lines.find(l => l.account_code === '102000');
      assert.ok(debit102, 'Commercial bank wire must touch 102000');
      assert.strictEqual(debit102.debit_amount, '2000000.00');
      assert.strictEqual(bankEntry.lines.some(l => l.account_code === '101000'), false, 'Bank wire must not touch safe 101000');
    });
  });
});
