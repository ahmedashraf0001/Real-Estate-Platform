import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PartnersEngine } from '../partnersEngine';
import { InvariantsValidator } from '../invariants';
import { D } from '../math';
import { prepareConstructionSettlement } from '../constructionSettlement';
import type { ERPPropertyCostItem } from '../types';

describe('Cash 101000 / InstaPay 102000 Payment Methods Architecture', () => {
  const testPeriod = {
    period_id: 'prd-2026-03',
    fiscal_year: 2026,
    period_number: 3,
    start_date: '2026-03-01',
    end_date: '2026-03-31',
    status: 'OPEN' as const
  };

  describe('1. Capital Injections: Cash 101000 / InstaPay 102000 (Cr 301000)', () => {
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
      assert.ok(debitLine.memo?.includes('الخزينة'), 'Debit memo must indicate safe channel');

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

      const debitLine = entry.lines.find(l => l.account_code === '101000');
      assert.ok(debitLine, 'InstaPay must debit account 101000 when routingAccount is explicitly specified');
      assert.strictEqual(debitLine.debit_amount, '800000.00');
      assert.ok(debitLine.memo?.includes('101000'), 'Debit memo must state account 101000');

      const creditLine = entry.lines.find(l => l.account_code === '301000');
      assert.ok(creditLine, 'Must credit Partner Capital 301000');
      assert.strictEqual(creditLine.credit_amount, '800000.00');
    });

    it('routes modern INSTAPAY method codes directly to 102000 by default', () => {
      const entryModern = PartnersEngine.createCapitalInjectionJournalEntry({
        partnerName: 'د. هاني المنياوي',
        amount: '350000.00',
        paymentMethod: 'INSTAPAY',
        propertyTitle: 'برج الأندلس',
        receiptRef: 'REC-IP-003',
        date: '2026-03-15',
        currentPeriod: testPeriod
      });

      const debitLine = entryModern.lines.find(l => l.account_code === '102000');
      assert.ok(debitLine, 'Modern INSTAPAY method must default to 102000 without requiring routingAccount');
      assert.strictEqual(debitLine.debit_amount, '350000.00');
    });
  });

  describe('2. Profit Payouts & Distributions: Cash 101000 / InstaPay 102000 (Dr 303000)', () => {
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
      assert.ok(credit101.memo?.includes('الخزينة'), 'Credit memo must indicate safe disbursement');
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

      assert.ok(credit101, 'Must credit Treasury 101000 when routingAccount is 101000');
      assert.strictEqual(credit101.credit_amount, '250000.00');
      assert.ok(credit101.memo?.includes('101000'), 'Credit memo must reference 101000');
    });

    it('disburses modern INSTAPAY method directly from 102000 by default', () => {
      const entryModern = PartnersEngine.createPayoutJournalEntry({
        partnerName: 'د. هاني المنياوي',
        amount: '90000.00',
        paymentMethod: 'INSTAPAY',
        propertyTitle: 'برج الأندلس',
        receiptRef: 'PAY-IP-103',
        date: '2026-03-22',
        currentPeriod: testPeriod
      });

      const credit102 = entryModern.lines.find(l => l.account_code === '102000');
      assert.ok(credit102, 'Modern INSTAPAY payout must credit 102000 by default');
      assert.strictEqual(credit102.credit_amount, '90000.00');
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

  describe('4. Explicit Cash 101000 / InstaPay 102000 Default Invariants', () => {
    it('a. PartnersEngine.createCapitalInjectionJournalEntry with paymentMethod INSTAPAY_102000 and no routingAccount -> debit line 102000', () => {
      const entry = PartnersEngine.createCapitalInjectionJournalEntry({
        partnerName: 'د. هاني المنياوي',
        amount: '600000.00',
        paymentMethod: 'INSTAPAY_102000',
        propertyTitle: 'برج الأندلس',
        receiptRef: 'REC-IP-004',
        date: '2026-03-28',
        currentPeriod: testPeriod
      });

      const debit102 = entry.lines.find(l => l.account_code === '102000');
      assert.ok(debit102, 'Must debit 102000 (InstaPay)');
      assert.strictEqual(debit102.debit_amount, '600000.00');
      assert.strictEqual(entry.lines.some(l => l.account_code === '101000'), false);
    });

    it('b. createPayoutJournalEntry INSTAPAY_102000 no routingAccount -> credit line 102000; CASH_101000 -> 101000', () => {
      const payoutInsta = PartnersEngine.createPayoutJournalEntry({
        partnerName: 'م. أحمد الشريف',
        amount: '150000.00',
        paymentMethod: 'INSTAPAY_102000',
        propertyTitle: 'برج الأندلس',
        receiptRef: 'PAY-IP-104',
        date: '2026-03-28',
        currentPeriod: testPeriod
      });
      const credit102 = payoutInsta.lines.find(l => l.account_code === '102000');
      assert.ok(credit102, 'InstaPay payout must credit 102000');
      assert.strictEqual(credit102.credit_amount, '150000.00');

      const payoutCash = PartnersEngine.createPayoutJournalEntry({
        partnerName: 'الحاج رجب الصاوي',
        amount: '80000.00',
        paymentMethod: 'CASH_101000',
        propertyTitle: 'عمارة النور والصفوة',
        receiptRef: 'PAY-CASH-102',
        date: '2026-03-28',
        currentPeriod: testPeriod
      });
      const credit101 = payoutCash.lines.find(l => l.account_code === '101000');
      assert.ok(credit101, 'Cash payout must credit 101000');
      assert.strictEqual(credit101.credit_amount, '80000.00');
    });

    it('c. prepareConstructionSettlement with installment.payment_method INSTAPAY_101000 -> journal credit 102000, updatedItem installment payment_method INSTAPAY_102000, treasury_account_code 102000, memo endsWith إنستاباي 102000', () => {
      const fixtureCost: ERPPropertyCostItem = {
        item_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        property_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        item_name_ar: 'خرسانة مسلحة',
        item_name_en: 'Reinforced Concrete',
        supplier_contractor: 'شركة المقاولات الحديثة',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '10000.00',
        total_cost_egp: '10000.00',
        logged_date: '2026-03-01',
        logged_by: 'test',
        status: 'verified',
        payment_term: 'FULL_DEFERRED',
        linked_account_code: '201000',
        paid_amount_egp: '2000.00',
        remaining_amount_egp: '8000.00',
        due_date: '2026-03-31',
        payable_installments: [
          {
            installment_id: 'inst-test-01',
            cost_item_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            installment_number: 1,
            title_ar: 'مستخلص رقم 1',
            due_date: '2026-03-25',
            amount_egp: '5000.00',
            paid_amount_egp: '2000.00',
            status: 'PARTIALLY_PAID'
          }
        ]
      };

      const updatedCost: ERPPropertyCostItem = {
        ...fixtureCost,
        paid_amount_egp: '5000.00',
        remaining_amount_egp: '5000.00',
        payable_installments: [
          {
            ...fixtureCost.payable_installments![0],
            paid_amount_egp: '5000.00',
            status: 'PAID',
            payment_date: '2026-03-26',
            payment_method: 'INSTAPAY_101000' as any
          }
        ]
      };

      const settlement = prepareConstructionSettlement(fixtureCost, updatedCost, testPeriod);
      assert.strictEqual(settlement.journal.lines[1].account_code, '102000', 'Credit line must be 102000');
      assert.strictEqual(settlement.journal.lines[1].credit_amount, '3000.00');
      assert.strictEqual(settlement.journal.source_module, 'CONSTRUCTION_SETTLEMENT', 'Contractor payments carry their own journal source');

      const updatedInst = settlement.updatedItem.payable_installments?.[0];
      assert.strictEqual(updatedInst?.payment_method, 'INSTAPAY_102000', 'Must normalize to INSTAPAY_102000');
      assert.strictEqual(updatedInst?.treasury_account_code, '102000', 'treasury_account_code must be 102000');
      assert.ok(settlement.journal.description.endsWith('إنستاباي 102000'), 'memo must end with إنستاباي 102000');
      assert.strictEqual(settlement.request.p_method, 'INSTAPAY_102000');
    });
  });
});
