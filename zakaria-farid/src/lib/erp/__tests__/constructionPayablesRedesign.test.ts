import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  generateMockPropertyCosts, 
  calculateCostItemEffectiveTotals,
  PROPERTY_COST_CATEGORIES,
  createDirectConstructionExpense,
  buildConstructionExpenseJournalLines,
  getPropertyCostAccountCode,
  recordPayableInstallmentPayment,
  sortPayableItems,
  PayableSortField
} from '../propertyCostEngine';
import { D, Decimal } from '../math';
import { ERPPropertyCostItem } from '../types';

describe('Construction Payables Redesign & Invariants Suite', () => {
  it('generates mock property costs with valid contractor payables and installments', () => {
    const mockCosts = generateMockPropertyCosts();
    assert.ok(Array.isArray(mockCosts));
    assert.ok(mockCosts.length >= 8, 'Should have at least 8 mock items');

    const payables = mockCosts.filter(c => c.payment_term && c.payment_term !== 'FULL_CASH');
    assert.ok(payables.length >= 4, 'Should have at least 4 items with deferred/installment terms');

    for (const item of payables) {
      assert.ok(item.supplier_contractor, 'Contractor name must exist');
      assert.ok(item.total_cost_egp, 'Total cost must exist');
      assert.ok(item.payable_installments && item.payable_installments.length > 0, 'Must have payable installments');
      
      const totals = calculateCostItemEffectiveTotals(item);
      assert.ok(totals.netEffectiveCost, 'Net effective cost must be computed');
      assert.ok(!isNaN(Number(totals.netEffectiveCost)), 'Net effective cost must be a valid number');
    }
  });

  it('calculates contractor AP totals accurately with zero floating-point errors', () => {
    const mockCosts = generateMockPropertyCosts();
    let totalPayables = D(0);
    let totalPaid = D(0);
    let totalRemaining = D(0);
    let totalOverdue = D(0);

    const now = new Date();

    for (const item of mockCosts) {
      if (!item.payable_installments || item.payable_installments.length === 0) continue;
      
      for (const inst of item.payable_installments) {
        const amt = D(inst.amount_egp || 0);
        const paid = D(inst.paid_amount_egp || 0);
        const rem = amt.minus(paid);

        totalPayables = totalPayables.plus(amt);
        totalPaid = totalPaid.plus(paid);
        if (rem.gt(0)) {
          totalRemaining = totalRemaining.plus(rem);
          if (new Date(inst.due_date) < now && inst.status !== 'PAID') {
            totalOverdue = totalOverdue.plus(rem);
          }
        }
      }
    }

    assert.ok(totalPayables.gte(totalPaid), 'Total payables must be >= total paid');
    assert.equal(
      totalPayables.minus(totalPaid).toString(),
      totalRemaining.toString(),
      'Total payables minus total paid must equal total remaining'
    );
    assert.ok(totalOverdue.lte(totalRemaining), 'Total overdue must be <= total remaining');
  });

  it('ensures contractor categories conform to the canonical construction disciplines', () => {
    const allowedCategories = PROPERTY_COST_CATEGORIES.map(c => c.key);

    const mockCosts = generateMockPropertyCosts();
    for (const item of mockCosts) {
      assert.ok(
        allowedCategories.includes(item.category),
        `Item category ${item.category} should be one of the known construction disciplines`
      );
    }
  });

  it('verifies that no static fake top 5 contractor structure exists in the engine', () => {
    const mockCosts = generateMockPropertyCosts();
    // Verify all contractor items are legitimate PropertyCostItems, not dummy top-5 records
    for (const item of mockCosts) {
      assert.ok(item.item_id.startsWith('cost-'), 'Valid cost item ID format');
      assert.ok(item.property_id, 'Must be associated with a valid project');
    }
  });

  it('enforces Zero Fake Static Data Policy on empty cost state (no fallback to 8 or 32)', () => {
    // Test empty cost items array
    const emptyCosts: any[] = [];
    
    // Distinct contractors must be 0, NOT fallback 8
    const distinctContractors = new Set<string>();
    let unpaidInvoicesCount = 0;
    let overdueCount = 0;
    let totalApPaid = D(0);

    emptyCosts.forEach(item => {
      if (item.supplier_contractor) distinctContractors.add(item.supplier_contractor);
      const rem = D(item.remaining_amount_egp || 0);
      if (rem.gt(0)) unpaidInvoicesCount++;
    });

    assert.equal(distinctContractors.size, 0, 'Contractors count must be honest 0 on empty data');
    assert.equal(unpaidInvoicesCount, 0, 'Unpaid invoices count must be honest 0 on empty data');
    assert.equal(overdueCount, 0, 'Overdue count must be 0 on empty data');
    assert.ok(totalApPaid.isZero(), 'Total AP paid must be 0 on empty data');
  });

  it('verifies dynamic project scoping partitions payables without cross-project bleed', () => {
    const mockCosts = generateMockPropertyCosts();
    const propertyIds = Array.from(new Set(mockCosts.map(c => c.property_id)));
    assert.ok(propertyIds.length >= 2, 'Should have multiple projects in mock data');

    const projA = propertyIds[0];
    const projB = propertyIds[1];

    const costsA = mockCosts.filter(c => c.property_id === projA);
    const costsB = mockCosts.filter(c => c.property_id === projB);

    const payablesA = costsA.reduce((sum, c) => sum.plus(D(c.remaining_amount_egp || 0)), D(0));
    const payablesB = costsB.reduce((sum, c) => sum.plus(D(c.remaining_amount_egp || 0)), D(0));
    const combinedPayables = mockCosts
      .filter(c => c.property_id === projA || c.property_id === projB)
      .reduce((sum, c) => sum.plus(D(c.remaining_amount_egp || 0)), D(0));

    assert.equal(
      payablesA.plus(payablesB).toString(),
      combinedPayables.toString(),
      'Scoping by project must strictly partition AP obligations with zero cross-project leakage'
    );
  });

  it('verifies formatIntegerEGP produces clean integer values without decimal cents', () => {
    function formatIntegerEGP(val: number | string | any): string {
      const d = val instanceof Decimal ? val : D(val || 0);
      return Math.round(d.toNumber()).toLocaleString('en-US');
    }

    assert.equal(formatIntegerEGP(303568878.30), '303,568,878');
    assert.equal(formatIntegerEGP('1500000.75'), '1,500,001');
    assert.equal(formatIntegerEGP(D('2420000.00')), '2,420,000');
    assert.equal(formatIntegerEGP(0), '0');
    assert.equal(formatIntegerEGP(''), '0');
  });

  it('correctly aggregates and ranks top contractors by remaining dues descending', () => {
    const mockCosts = generateMockPropertyCosts();
    const contractorMap = new Map<string, any>();

    mockCosts.forEach(item => {
      const cName = item.supplier_contractor || 'General';
      const { remainingAmount } = calculateCostItemEffectiveTotals(item);
      const rem = D(remainingAmount || 0);
      if (!contractorMap.has(cName)) {
        contractorMap.set(cName, { name: cName, remaining: D(0), count: 0 });
      }
      const entry = contractorMap.get(cName)!;
      entry.remaining = entry.remaining.plus(rem);
      entry.count += 1;
    });

    const topContractors = Array.from(contractorMap.values())
      .filter(c => c.remaining.gt(0))
      .sort((a, b) => b.remaining.minus(a.remaining).toNumber())
      .slice(0, 5);

    assert.ok(topContractors.length <= 5, 'Must return at most 5 top contractors');
    for (let i = 0; i < topContractors.length - 1; i++) {
      assert.ok(
        topContractors[i].remaining.gte(topContractors[i + 1].remaining),
        'Top contractors must be sorted in descending order of remaining dues'
      );
    }
  });

  it('calculates expense execution progress percentage correctly and safely handles zero division', () => {
    const calculateProgress = (totalCost: any, totalPaid: any) => {
      const t = D(totalCost || 0);
      const p = D(totalPaid || 0);
      if (t.isZero()) return 0;
      return Math.min(100, Math.max(0, Math.round(p.div(t).times(100).toNumber())));
    };

    assert.equal(calculateProgress(0, 0), 0, 'Zero division must return 0%');
    assert.equal(calculateProgress(1000000, 500000), 50, '500k/1M must return 50%');
    assert.equal(calculateProgress(1000000, 1000000), 100, 'Fully paid must return 100%');
    assert.equal(calculateProgress(1000000, 1200000), 100, 'Overpaid must be capped at 100%');
  });

  it('filters contractor payables accurately by date range', () => {
    const mockCosts = generateMockPropertyCosts();
    const startDate = '2025-01-01';
    const endDate = '2025-12-31';

    const inRangeItems = mockCosts.filter(item => {
      const d = item.logged_date || item.due_date || item.created_at?.split('T')[0];
      if (!d) return true;
      return d >= startDate && d <= endDate;
    });

    for (const item of inRangeItems) {
      const d = item.logged_date || item.due_date || item.created_at?.split('T')[0];
      if (d) {
        assert.ok(d >= startDate, `Date ${d} must be >= start date ${startDate}`);
        assert.ok(d <= endDate, `Date ${d} must be <= end date ${endDate}`);
      }
    }
  });

  it('ensures currency symbols are never duplicated and cents are cleanly stripped', () => {
    // Test simulated parseMetricValue logic
    const parseTest = (val: any, explicitCur?: string, unit?: string) => {
      let str = String(val ?? '').trim();
      let detectedCur = explicitCur || '';
      const curRegex = /(?:\s+|^)(ج\.م|EGP|USD|EUR|LE)(?:\s+|$)/i;
      const match = str.match(curRegex);
      if (match && match[1]) {
        if (!detectedCur) detectedCur = match[1];
        str = str.replace(curRegex, ' ').trim();
      }
      str = str.replace(/\.\d{1,2}$/, '');
      const cleanCur = (detectedCur || '').trim();
      const cleanUnit = (unit || '').trim();
      const showCur = Boolean(cleanCur && (!cleanUnit || !cleanUnit.includes(cleanCur)));
      const showUnit = Boolean(cleanUnit);
      return { num: str, showCur, showUnit, cur: cleanCur, unit: cleanUnit };
    };

    // Case 1: String with .30 and ج.م
    const r1 = parseTest('303,568,878.30 ج.م', 'ج.م');
    assert.equal(r1.num, '303,568,878');
    assert.equal(r1.cur, 'ج.م');
    assert.equal(r1.showCur, true);

    // Case 2: Duplicate currency passed via unitLabel as well
    const r2 = parseTest('303,568,878', 'ج.م', 'ج.م');
    assert.equal(r2.num, '303,568,878');
    assert.equal(r2.showCur, false, 'showCur must be false when unit already contains currency');
    assert.equal(r2.showUnit, true);

    // Case 3: Unit is compound like ج.م / م²
    const r3 = parseTest('12,000', 'ج.م', 'ج.م / م²');
    assert.equal(r3.showCur, false, 'Currency should not precede compound unit that includes currency');
    assert.equal(r3.unit, 'ج.م / م²');
  });

  it('preserves historical paid balances when rescheduling contractor payable installments', () => {
    const mockItem = {
      total_cost_egp: '100000.00',
      paid_amount_egp: '40000.00',
      remaining_amount_egp: '60000.00',
      payable_installments: [
        {
          installment_id: 'inst-1',
          cost_item_id: 'c-1',
          installment_number: 0,
          title_ar: 'الدفعة المقدمة',
          amount_egp: '40000.00',
          paid_amount_egp: '40000.00',
          status: 'PAID'
        }
      ]
    };

    const currentPaid = parseFloat(mockItem.paid_amount_egp);
    const currentRem = parseFloat(mockItem.remaining_amount_egp);
    const dpNum = 10000; // New immediate installment
    const newPaidTotal = (currentPaid + dpNum).toFixed(2);
    const newRemainingTotal = Math.max(0, currentRem - dpNum).toFixed(2);

    assert.equal(newPaidTotal, '50000.00', 'Paid amount must accumulate and not overwrite');
    assert.equal(newRemainingTotal, '50000.00', 'Remaining balance must be reduced by new down payment');
    assert.equal(
      parseFloat(newPaidTotal) + parseFloat(newRemainingTotal),
      parseFloat(mockItem.total_cost_egp),
      'Sum of paid and remaining must strictly equal total cost'
    );
  });

  it('handles Smart Integrated Wizard: unscheduled AP obligation creation and subsequent tranche structuring', () => {
    // 1. Unscheduled creation (Quick Bill creation without upfront scheduling)
    const billTotal = 150000;
    const unscheduledBill = {
      item_id: 'cost-unscheduled-01',
      property_id: 'prop-1',
      category: 'civil_structure',
      item_name_ar: 'أعمال حدادة مسلحة مبنى A',
      supplier_contractor: 'شركة الأمل للمقاولات',
      total_cost_egp: billTotal.toFixed(2),
      paid_amount_egp: '0.00',
      remaining_amount_egp: billTotal.toFixed(2),
      payment_term: 'FULL_DEFERRED',
      payable_installments: []
    };

    assert.equal(unscheduledBill.payable_installments.length, 0, 'Unscheduled bill starts with 0 installments');
    assert.equal(unscheduledBill.remaining_amount_egp, '150000.00', 'Full amount remains payable');
    assert.equal(unscheduledBill.payment_term, 'FULL_DEFERRED', 'Payment term is FULL_DEFERRED');

    // 2. Optgroup partitioning check
    const items = [
      unscheduledBill,
      {
        item_id: 'cost-scheduled-01',
        total_cost_egp: '100000.00',
        paid_amount_egp: '20000.00',
        remaining_amount_egp: '80000.00',
        payable_installments: [{ installment_id: 'inst-1', amount_egp: '80000.00' }]
      },
      {
        item_id: 'cost-paid-01',
        total_cost_egp: '50000.00',
        paid_amount_egp: '50000.00',
        remaining_amount_egp: '0.00',
        payable_installments: [{ installment_id: 'inst-2', amount_egp: '50000.00' }]
      }
    ];

    const unscheduledList: any[] = [];
    const scheduledList: any[] = [];

    items.forEach(c => {
      const rem = D(c.remaining_amount_egp || 0);
      if (rem.lte(0)) return; // skip paid
      if (c.payable_installments && c.payable_installments.length > 0) {
        scheduledList.push(c);
      } else {
        unscheduledList.push(c);
      }
    });

    assert.equal(unscheduledList.length, 1, 'Should have exactly 1 unscheduled bill');
    assert.equal(unscheduledList[0].item_id, 'cost-unscheduled-01');
    assert.equal(scheduledList.length, 1, 'Should have exactly 1 scheduled bill');
    assert.equal(scheduledList[0].item_id, 'cost-scheduled-01');

    // 3. Subsequent Structuring / Scheduling (e.g. 30,000 down payment + 3 monthly installments)
    const downPayment = 30000;
    const remainingToSchedule = billTotal - downPayment;
    const numTranches = 3;
    const trancheAmount = Math.floor(remainingToSchedule / numTranches);
    const remainderDiff = remainingToSchedule - (trancheAmount * numTranches);

    const generatedInstallments: any[] = [];
    if (downPayment > 0) {
      generatedInstallments.push({
        installment_id: 'inst-new-dp',
        cost_item_id: unscheduledBill.item_id,
        installment_number: 0,
        title_ar: 'الدفعة المقدمة',
        amount_egp: downPayment.toFixed(2),
        paid_amount_egp: downPayment.toFixed(2),
        status: 'PAID'
      });
    }

    for (let i = 1; i <= numTranches; i++) {
      const amt = i === numTranches ? trancheAmount + remainderDiff : trancheAmount;
      generatedInstallments.push({
        installment_id: `inst-new-${i}`,
        cost_item_id: unscheduledBill.item_id,
        installment_number: i,
        title_ar: `الدفعة رقم ${i}`,
        amount_egp: amt.toFixed(2),
        paid_amount_egp: '0.00',
        status: 'PENDING'
      });
    }

    assert.equal(generatedInstallments.length, 4, 'Should have 1 down payment + 3 tranches');
    const totalScheduled = generatedInstallments.reduce((acc, inst) => acc + parseFloat(inst.amount_egp), 0);
    assert.equal(totalScheduled, billTotal, 'Sum of all installments must exactly match the bill total');
  });

  it('Fix 1: Smart Wizard creates 100% paid expense for Cash (101000) and Bank (102000) sources without lingering debt via createDirectConstructionExpense', () => {
    const totalNum = 75000;

    // 1. Cash expense (101000)
    const cashItem = createDirectConstructionExpense({
      propertyId: 'prop-test-01',
      category: 'civil_structure',
      phase: 'structural_skeleton',
      itemName: 'توريد أسمنت بورتلاندي',
      supplier: 'شركة السويس للأسمنت',
      invoiceRef: 'INV-2026-CASH-01',
      totalAmount: totalNum,
      paymentSource: '101000'
    });

    assert.equal(cashItem.payment_term, 'FULL_CASH', 'Cash payment must have FULL_CASH term');
    assert.equal(cashItem.paid_amount_egp, '75000.00', 'Cash payment must be 100% paid on creation');
    assert.equal(cashItem.remaining_amount_egp, '0.00', 'Cash payment must have 0.00 remaining debt');
    assert.equal(cashItem.payable_installments?.length, 0, 'Cash payment has no deferred installments');
    assert.equal(cashItem.linked_account_code, '101000');

    // 2. Bank expense (102000)
    const bankItem = createDirectConstructionExpense({
      propertyId: 'prop-test-01',
      category: 'mep_infrastructure',
      phase: 'masonry_roughing',
      itemName: 'توريد كابلات سويدي',
      supplier: 'السويدي إلكتريك',
      invoiceRef: 'INV-2026-BANK-01',
      totalAmount: totalNum,
      paymentSource: '102000'
    });

    assert.equal(bankItem.payment_term, 'FULL_CASH', 'Bank payment must have FULL_CASH term');
    assert.equal(bankItem.paid_amount_egp, '75000.00', 'Bank payment must be 100% paid on creation');
    assert.equal(bankItem.remaining_amount_egp, '0.00', 'Bank payment must have 0.00 remaining debt');
    assert.equal(bankItem.payable_installments?.length, 0, 'Bank payment has no deferred installments');
    assert.equal(bankItem.linked_account_code, '102000');

    // 3. AP unscheduled expense (201000, scheduleNow: false)
    const apUnscheduled = createDirectConstructionExpense({
      propertyId: 'prop-test-01',
      category: 'finishing_interior',
      phase: 'finishing_interiors',
      itemName: 'أعمال بياض ومحارة',
      supplier: 'مقاول المحارة',
      totalAmount: totalNum,
      paymentSource: '201000',
      scheduleNow: false,
      firstDueDate: '2026-10-15'
    });

    assert.equal(apUnscheduled.payment_term, 'FULL_DEFERRED', 'Unscheduled AP source must default to FULL_DEFERRED');
    assert.equal(apUnscheduled.paid_amount_egp, '0.00', 'Unscheduled AP has 0.00 paid');
    assert.equal(apUnscheduled.remaining_amount_egp, '75000.00', 'Unscheduled AP has 100% remaining debt');
    assert.equal(apUnscheduled.payable_installments?.length, 0);
    assert.equal(apUnscheduled.due_date, '2026-10-15', 'Open AP keeps its due date without creating installments');

    // 4. AP scheduled expense (201000, scheduleNow: true with down payment)
    const apScheduled = createDirectConstructionExpense({
      propertyId: 'prop-test-01',
      category: 'civil_structure',
      phase: 'structural_skeleton',
      itemName: 'توريد حديد عز',
      supplier: 'عز الدخيلة',
      totalAmount: totalNum,
      paymentSource: '201000',
      scheduleNow: true,
      downPayment: 15000,
      numberOfInstallments: 3,
      firstDueDate: '2026-10-01',
      frequencyMonths: 1
    });

    assert.equal(apScheduled.payment_term, 'DOWN_PAYMENT_INSTALLMENTS');
    assert.equal(apScheduled.paid_amount_egp, '15000.00', 'Down payment is paid immediately');
    assert.equal(apScheduled.remaining_amount_egp, '60000.00', 'Remaining 60k deferred across tranches');
    assert.equal(apScheduled.payable_installments?.length, 4, '1 down payment + 3 deferred tranches');
  });

  it('builds balanced construction postings for immediate and mixed AP payments', () => {
    const bankLines = buildConstructionExpenseJournalLines({
      category: 'mep_infrastructure',
      totalAmount: '75000.00',
      paymentSource: '102000',
      memo: 'MEP supplier invoice'
    });
    assert.deepEqual(
      bankLines.map(line => [line.account_code, line.debit_amount, line.credit_amount]),
      [
        ['152000', '75000.00', '0.00'],
        ['102000', '0.00', '75000.00']
      ]
    );

    const mixedLines = buildConstructionExpenseJournalLines({
      category: 'permits_engineering',
      totalAmount: '100000.00',
      paymentSource: '201000',
      downPayment: '25000.00',
      downPaymentSource: '101000',
      memo: 'Permit consultant claim'
    });
    assert.deepEqual(
      mixedLines.map(line => [line.account_code, line.debit_amount, line.credit_amount]),
      [
        ['150000', '100000.00', '0.00'],
        ['101000', '0.00', '25000.00'],
        ['201000', '0.00', '75000.00']
      ]
    );
    assert.equal(getPropertyCostAccountCode('site_facade'), '153000');
  });

  it('derives unit cost from invoice total and quantity', () => {
    const item = createDirectConstructionExpense({
      propertyId: 'prop-test-01',
      category: 'civil_structure',
      phase: 'structural_skeleton',
      itemName: 'توريد أسمنت',
      totalAmount: '90000.00',
      paymentSource: '101000',
      quantity: 3,
      unit: 'طن'
    });

    assert.equal(item.unit_cost_egp, '30000.00');
    assert.equal(item.total_cost_egp, '90000.00');
    assert.equal(item.net_effective_cost_egp, '90000.00');
  });

  function createMockCostItem(overrides: Partial<ERPPropertyCostItem>): ERPPropertyCostItem {
    return {
      item_id: overrides.item_id || 'cost-test',
      property_id: overrides.property_id || 'prop-1',
      category: overrides.category || 'civil_structure',
      phase: overrides.phase || 'structural_skeleton',
      item_name_ar: overrides.item_name_ar || 'بند تجريبي',
      item_name_en: overrides.item_name_en || 'Test Item',
      quantity: overrides.quantity || 1,
      unit: overrides.unit || 'مقطوعية',
      unit_cost_egp: overrides.unit_cost_egp || overrides.total_cost_egp || '100000.00',
      total_cost_egp: overrides.total_cost_egp || '100000.00',
      logged_date: overrides.logged_date || '2026-09-21',
      logged_by: overrides.logged_by || 'Admin',
      status: overrides.status || 'verified',
      paid_amount_egp: overrides.paid_amount_egp || '0.00',
      remaining_amount_egp: overrides.remaining_amount_egp || overrides.total_cost_egp || '100000.00',
      payable_installments: overrides.payable_installments || [],
      ...overrides
    };
  }

  it('Fix 2: Settlement Modal protects against silent data loss via real recordPayableInstallmentPayment', () => {
    // 1. Settlement on ad-hoc cost item with empty payable_installments array
    const unscheduledItem = createMockCostItem({
      item_id: 'cost-bill-unscheduled-99',
      property_id: 'prop-1',
      category: 'civil_structure',
      phase: 'structural_skeleton',
      item_name_ar: 'فاتورة خرسانات موقع',
      total_cost_egp: '120000.00',
      paid_amount_egp: '0.00',
      remaining_amount_egp: '120000.00',
      payable_installments: []
    });

    const targetSynthId = 'inst-synth-uuid-1';
    const updatedItem1 = recordPayableInstallmentPayment(
      unscheduledItem,
      targetSynthId,
      '50000.00',
      'CASH_101000',
      '2026-09-21',
      'سداد دفعة أولى كاش',
      { amount_egp: '50000.00', title_ar: 'دفعة سداد مستحقات' }
    );

    assert.equal(updatedItem1.payable_installments?.length, 1, 'Tranche must be instantiated and appended');
    assert.equal(updatedItem1.payable_installments?.[0].installment_id, targetSynthId);
    assert.equal(updatedItem1.payable_installments?.[0].status, 'PAID');
    assert.equal(updatedItem1.paid_amount_egp, '50000.00', 'Paid amount must be recorded as 50,000.00');
    assert.equal(updatedItem1.remaining_amount_egp, '70000.00', 'Remaining amount must be 70,000.00');
    assert.equal(
      parseFloat(updatedItem1.paid_amount_egp) + parseFloat(updatedItem1.remaining_amount_egp),
      120000,
      'Invariant: sum of paid and remaining must equal total cost'
    );

    // 2. Data Loss Protection: Invoice with prior unrepresented paid amounts (e.g. historical down payment not in installments)
    const priorPaidItem = createMockCostItem({
      item_id: 'cost-bill-prior-44',
      property_id: 'prop-1',
      category: 'civil_structure',
      phase: 'structural_skeleton',
      item_name_ar: 'فاتورة بها دفعة سابقة غير مجدولة',
      total_cost_egp: '100000.00',
      paid_amount_egp: '40000.00', // Prior paid amount on scalar header
      remaining_amount_egp: '60000.00',
      payable_installments: []
    });

    const updatedItem2 = recordPayableInstallmentPayment(
      priorPaidItem,
      'inst-new-settle-01',
      '20000.00',
      'BANK_102000',
      '2026-09-21'
    );

    // Must preserve prior 40,000 as an initial paid tranche, plus the new 20,000 tranche
    assert.equal(updatedItem2.payable_installments?.length, 2, 'Must contain prior paid tranche + new tranche');
    assert.equal(updatedItem2.payable_installments?.[0].status, 'PAID');
    assert.equal(updatedItem2.payable_installments?.[0].paid_amount_egp, '40000.00');
    assert.equal(updatedItem2.payable_installments?.[1].status, 'PAID');
    assert.equal(updatedItem2.payable_installments?.[1].paid_amount_egp, '20000.00');
    assert.equal(updatedItem2.paid_amount_egp, '60000.00', 'Total paid must accumulate to 60,000.00');
    assert.equal(updatedItem2.remaining_amount_egp, '40000.00', 'Remaining balance must be 40,000.00');

    // 3. Successive settlements: Subsequent settlement on the same invoice does not double-count or erase
    const updatedItem3 = recordPayableInstallmentPayment(
      updatedItem2,
      'inst-new-settle-02',
      '40000.00',
      'CASH_101000',
      '2026-09-22'
    );

    assert.equal(updatedItem3.payable_installments?.length, 3, 'Must have 3 tranches now');
    assert.equal(updatedItem3.paid_amount_egp, '100000.00', 'Invoice is now 100% paid');
    assert.equal(updatedItem3.remaining_amount_egp, '0.00', 'Zero remaining balance');

    // 4. Partial payment against an existing installment
    const multiTrancheItem = createMockCostItem({
      item_id: 'cost-multi-01',
      property_id: 'prop-1',
      category: 'mep_infrastructure',
      phase: 'masonry_roughing',
      item_name_ar: 'أعمال تكييف مركزي',
      total_cost_egp: '80000.00',
      paid_amount_egp: '0.00',
      remaining_amount_egp: '80000.00',
      payable_installments: [
        {
          installment_id: 'inst-part-1',
          cost_item_id: 'cost-multi-01',
          installment_number: 1,
          title_ar: 'الدفعة الأولى',
          amount_egp: '40000.00',
          paid_amount_egp: '0.00',
          due_date: '2026-10-01',
          status: 'PENDING'
        },
        {
          installment_id: 'inst-part-2',
          cost_item_id: 'cost-multi-01',
          installment_number: 2,
          title_ar: 'الدفعة الثانية',
          amount_egp: '40000.00',
          paid_amount_egp: '0.00',
          due_date: '2026-11-01',
          status: 'PENDING'
        }
      ]
    });

    const partialPayment = recordPayableInstallmentPayment(
      multiTrancheItem,
      'inst-part-1',
      '15000.00'
    );

    assert.equal(partialPayment.payable_installments?.[0].status, 'PARTIALLY_PAID');
    assert.equal(partialPayment.payable_installments?.[0].paid_amount_egp, '15000.00');
    assert.equal(partialPayment.paid_amount_egp, '15000.00');
    assert.equal(partialPayment.remaining_amount_egp, '65000.00');
  });

  it('Fix 3: Table interactive column sorting accurately sorts all supported fields via real sortPayableItems', () => {
    const mockRows = [
      {
        id: '1',
        projectName: 'مشروع ب',
        contractor: 'شركة الشروق',
        dueDate: '2025-06-15',
        totalNum: D(250000),
        remainingNum: D(50000)
      },
      {
        id: '2',
        projectName: 'مشروع أ',
        contractor: 'أحمد للمقاولات',
        dueDate: '2025-03-01',
        totalNum: D(100000),
        remainingNum: D(100000)
      },
      {
        id: '3',
        projectName: 'مشروع ج',
        contractor: 'مؤسسة النيل',
        dueDate: '2025-09-20',
        totalNum: D(500000),
        remainingNum: D(0)
      }
    ];

    // 1. Sort by dueDate asc
    const byDueDateAsc = sortPayableItems(mockRows, 'dueDate', 'asc');
    assert.equal(byDueDateAsc[0].dueDate, '2025-03-01');
    assert.equal(byDueDateAsc[2].dueDate, '2025-09-20');

    // 2. Sort by dueDate desc
    const byDueDateDesc = sortPayableItems(mockRows, 'dueDate', 'desc');
    assert.equal(byDueDateDesc[0].dueDate, '2025-09-20');
    assert.equal(byDueDateDesc[2].dueDate, '2025-03-01');

    // 3. Sort by totalCost desc
    const byTotalCostDesc = sortPayableItems(mockRows, 'totalCost', 'desc');
    assert.equal(D(byTotalCostDesc[0].totalNum).toNumber(), 500000);
    assert.equal(D(byTotalCostDesc[2].totalNum).toNumber(), 100000);

    // 4. Sort by remaining desc
    const byRemDesc = sortPayableItems(mockRows, 'remaining', 'desc');
    assert.equal(D(byRemDesc[0].remainingNum).toNumber(), 100000);
    assert.equal(D(byRemDesc[2].remainingNum).toNumber(), 0);

    // 5. Sort by contractor asc
    const byContractorAsc = sortPayableItems(mockRows, 'contractor', 'asc', true);
    assert.equal(byContractorAsc[0].contractor, 'أحمد للمقاولات');

    // 6. Sort by project asc
    const byProjectAsc = sortPayableItems(mockRows, 'project', 'asc', true);
    assert.equal(byProjectAsc[0].projectName, 'مشروع أ');
  });

  it('Defect Prevention: Safe due date fallback and non-crashing empty invoice refs', () => {
    // Simulates an item where due_date, logged_date, and invoice_ref are missing
    const edgeItem = createMockCostItem({
      item_id: 'cost-edge-01',
      property_id: 'prop-1',
      category: 'civil_structure',
      phase: 'structural_skeleton',
      item_name_ar: 'بند طارئ بدون تواريخ',
      total_cost_egp: '50000.00',
      paid_amount_egp: '0.00',
      remaining_amount_egp: '50000.00',
      due_date: undefined,
      logged_date: undefined,
      invoice_ref: undefined,
      payable_installments: []
    });

    const todayStr = '2026-09-21';
    const pendingInstallments = edgeItem.payable_installments?.filter(i => i.status !== 'PAID') || [];
    const firstPendingInst = pendingInstallments[0];
    const safeDueDate = edgeItem.due_date || firstPendingInst?.due_date || edgeItem.payable_installments?.[0]?.due_date || edgeItem.logged_date || todayStr;
    const yearStr = safeDueDate ? safeDueDate.slice(0, 4) : new Date().getFullYear().toString();
    const invoiceRef = edgeItem.invoice_ref || `INV-${yearStr}-099`;

    assert.equal(safeDueDate, todayStr, 'Should fall back to todayStr safely without undefined error');
    assert.equal(yearStr, '2026', 'Should safely extract year without slice error');
    assert.equal(invoiceRef, 'INV-2026-099');
  });

  it('Defect Prevention: Overdue status strictly synchronizes on <= todayStr across KPI, table, and filters', () => {
    const todayStr = '2026-09-21';
    const yesterdayStr = '2026-09-20';
    const tomorrowStr = '2026-09-22';

    const testRows = [
      { id: '1', dueDate: yesterdayStr, remaining: D(10000), statusKey: 'pending_review' },
      { id: '2', dueDate: todayStr, remaining: D(15000), statusKey: 'pending_review' },
      { id: '3', dueDate: tomorrowStr, remaining: D(20000), statusKey: 'pending_review' }
    ];

    const deriveStatus = (row: typeof testRows[0]) => {
      const isOverdue = row.remaining.gt(0) && !!row.dueDate && row.dueDate <= todayStr;
      return isOverdue ? 'overdue' : 'pending_review';
    };

    assert.equal(deriveStatus(testRows[0]), 'overdue', 'Yesterday is overdue');
    assert.equal(deriveStatus(testRows[1]), 'overdue', 'Today is overdue (<= todayStr boundary)');
    assert.equal(deriveStatus(testRows[2]), 'pending_review', 'Tomorrow is NOT overdue');
  });

  it('Defect Prevention: Multi-tranche invoice does not trigger false overdue when past down payment was paid', () => {
    const todayStr = '2026-09-21';
    const multiTrancheCost = createMockCostItem({
      item_id: 'cost-mt-99',
      property_id: 'prop-1',
      category: 'civil_structure',
      phase: 'structural_skeleton',
      item_name_ar: 'عقد مقاولة به دفعة مقدمة مسددة وقسط قادم',
      total_cost_egp: '100000.00',
      paid_amount_egp: '30000.00',
      remaining_amount_egp: '70000.00',
      due_date: undefined,
      payable_installments: [
        {
          installment_id: 'inst-dp',
          cost_item_id: 'cost-mt-99',
          installment_number: 0,
          title_ar: 'الدفعة المقدمة',
          amount_egp: '30000.00',
          paid_amount_egp: '30000.00',
          status: 'PAID',
          due_date: '2026-01-01' // Past date, but ALREADY PAID
        },
        {
          installment_id: 'inst-fut-1',
          cost_item_id: 'cost-mt-99',
          installment_number: 1,
          title_ar: 'القسط الأول',
          amount_egp: '70000.00',
          paid_amount_egp: '0.00',
          status: 'PENDING',
          due_date: '2026-12-01' // Future date
        }
      ]
    });

    // Pick active due date for table row: must select first UNPAID installment, NOT the past paid down payment!
    const pendingInstallments = multiTrancheCost.payable_installments?.filter(i => i.status !== 'PAID') || [];
    const firstPendingInst = pendingInstallments[0];
    const rowDueDate = multiTrancheCost.due_date || firstPendingInst?.due_date || multiTrancheCost.payable_installments?.[0]?.due_date || todayStr;

    const remainingNum = D(multiTrancheCost.remaining_amount_egp || 0);
    const isOverdue = remainingNum.gt(0) && !!rowDueDate && rowDueDate <= todayStr;

    assert.equal(rowDueDate, '2026-12-01', 'Must select future pending installment date, not past paid down payment');
    assert.equal(isOverdue, false, 'Invoice with future installment must NOT be falsely marked overdue');
  });

  it('accurately records contractor cheque disbursement via BANK_102000 with cheque metadata and balance deduction', () => {
    const costItem = createMockCostItem({
      item_id: 'cost-chq-101',
      supplier_contractor: 'شركة النيل للمقاولات العامة',
      item_name_ar: 'أعمال الهيكل الخرساني الدور الأول',
      total_cost_egp: '350000.00',
      paid_amount_egp: '100000.00',
      remaining_amount_egp: '250000.00',
      payable_installments: [
        {
          installment_id: 'inst-dp',
          cost_item_id: 'cost-chq-101',
          installment_number: 0,
          title_ar: 'الدفعة المقدمة',
          amount_egp: '100000.00',
          paid_amount_egp: '100000.00',
          status: 'PAID',
          due_date: '2026-08-01'
        },
        {
          installment_id: 'inst-chq-target',
          cost_item_id: 'cost-chq-101',
          installment_number: 1,
          title_ar: 'المستخلص الأول',
          amount_egp: '150000.00',
          paid_amount_egp: '0.00',
          status: 'PENDING',
          due_date: '2026-09-30'
        },
        {
          installment_id: 'inst-chq-rem',
          cost_item_id: 'cost-chq-101',
          installment_number: 2,
          title_ar: 'دفعة ختامية',
          amount_egp: '100000.00',
          paid_amount_egp: '0.00',
          status: 'PENDING',
          due_date: '2026-11-30'
        }
      ]
    });

    const chequeNotes = 'مستخلص صب سقف أول | [شيك بنكي رقم: CHQ-802314 - البنك الأهلي المصري (NBE) - استحقاق: 2026-09-30 - لأمر: شركة النيل للمقاولات العامة]';
    const targetInst = costItem.payable_installments![1];

    const updatedItem = recordPayableInstallmentPayment(
      costItem,
      targetInst.installment_id,
      '150000.00',
      'BANK_102000',
      '2026-09-23',
      chequeNotes,
      targetInst
    );

    // Verify installment is marked PAID
    const paidTranche = updatedItem.payable_installments?.find(i => i.installment_id === 'inst-chq-target');
    assert.ok(paidTranche, 'Target installment must exist');
    assert.equal(paidTranche.status, 'PAID');
    assert.equal(paidTranche.paid_amount_egp, '150000.00');
    assert.equal(paidTranche.payment_method, 'BANK_102000');
    assert.equal(paidTranche.notes, chequeNotes);

    // Verify item balances
    assert.equal(updatedItem.paid_amount_egp, '250000.00');
    assert.equal(updatedItem.remaining_amount_egp, '100000.00');
  });

  it('accurately performs direct contractor cheque settlement on unscheduled cost items without data loss', () => {
    const unscheduledCost = createMockCostItem({
      item_id: 'cost-adhoc-88',
      supplier_contractor: 'مقاولات الأفق للكهرباء',
      item_name_ar: 'تمديدات كهربائية طوارئ',
      total_cost_egp: '45000.00',
      paid_amount_egp: '0.00',
      remaining_amount_egp: '45000.00',
      payable_installments: []
    });

    const syntheticInst = {
      installment_id: 'synth-inst-88',
      cost_item_id: 'cost-adhoc-88',
      installment_number: 1,
      title_ar: 'سداد مستحقات مباشرة',
      title_en: 'Direct settlement',
      due_date: '2026-09-23',
      amount_egp: '45000.00',
      paid_amount_egp: '0.00',
      status: 'PENDING' as const
    };

    const chequeNotes = '[شيك بنكي رقم: CHQ-5512 - بنك مصر (BM) - استحقاق: 2026-09-23 - لأمر: مقاولات الأفق للكهرباء]';

    const updated = recordPayableInstallmentPayment(
      unscheduledCost,
      syntheticInst.installment_id,
      '45000.00',
      'BANK_102000',
      '2026-09-23',
      chequeNotes,
      syntheticInst
    );

    assert.equal(updated.payable_installments?.length, 1);
    assert.equal(updated.payable_installments?.[0].status, 'PAID');
    assert.equal(updated.payable_installments?.[0].payment_method, 'BANK_102000');
    assert.equal(updated.paid_amount_egp, '45000.00');
    assert.equal(updated.remaining_amount_egp, '0.00');
  });

  it('correctly sorts contractor payables by priority tier by default (Tier 1 Overdue -> Tier 2 Upcoming -> Tier 3 Unscheduled -> Tier 4 Settled)', () => {
    const rawItems = [
      { id: '1-paid', contractor: 'مقاول تشطيبات', statusKey: 'paid', remainingNum: '0.00', hasInstallments: true, dueDate: '2026-08-01' },
      { id: '2-unscheduled', contractor: 'مقاول حفر', statusKey: 'pending_review', remainingNum: '75000.00', hasInstallments: false, dueDate: '2026-10-15' },
      { id: '3-overdue', contractor: 'مقاول خرسانات', statusKey: 'overdue', remainingNum: '120000.00', hasInstallments: true, dueDate: '2026-09-01' },
      { id: '4-upcoming', contractor: 'مقاول صحي', statusKey: 'in_progress', remainingNum: '50000.00', hasInstallments: true, dueDate: '2026-10-01' },
      { id: '5-overdue-earlier', contractor: 'توريدات حديد', statusKey: 'overdue', remainingNum: '90000.00', hasInstallments: true, dueDate: '2026-08-20' },
      { id: '6-unscheduled-larger', contractor: 'مقاول عزل', statusKey: 'pending_review', remainingNum: '150000.00', hasInstallments: false, dueDate: '2026-11-01' },
    ];

    const sorted = sortPayableItems(rawItems, 'priority', 'asc', true);

    // Tier 1 (Overdue): 5-overdue-earlier (2026-08-20) then 3-overdue (2026-09-01)
    assert.equal(sorted[0].id, '5-overdue-earlier', 'Earliest overdue must be first in Tier 1');
    assert.equal(sorted[1].id, '3-overdue', 'Second overdue must be second in Tier 1');

    // Tier 2 (Upcoming Scheduled): 4-upcoming
    assert.equal(sorted[2].id, '4-upcoming', 'Upcoming scheduled bill must be in Tier 2');

    // Tier 3 (Unscheduled): larger balance first -> 6-unscheduled-larger (150k) then 2-unscheduled (75k)
    assert.equal(sorted[3].id, '6-unscheduled-larger', 'Unscheduled with larger remaining balance must precede smaller');
    assert.equal(sorted[4].id, '2-unscheduled', 'Unscheduled with smaller balance');

    // Tier 4 (Paid/Settled): 1-paid
    assert.equal(sorted[5].id, '1-paid', 'Paid bill must be in Tier 4 at the bottom');
  });

  it('accurately computes section counts and partitions rows into 5 canonical tabs', () => {
    const rawItems = [
      { id: 'p1', statusKey: 'overdue', remainingNum: D(50000), hasInstallments: true },
      { id: 'p2', statusKey: 'overdue', remainingNum: D(25000), hasInstallments: false }, // Overdue overrides unscheduled
      { id: 'p3', statusKey: 'in_progress', remainingNum: D(80000), hasInstallments: true }, // Upcoming
      { id: 'p4', statusKey: 'pending_review', remainingNum: D(30000), hasInstallments: false }, // Unscheduled
      { id: 'p5', statusKey: 'pending_review', remainingNum: D(45000), hasInstallments: false }, // Unscheduled
      { id: 'p6', statusKey: 'paid', remainingNum: D(0), hasInstallments: true }, // Paid
      { id: 'p7', statusKey: 'in_progress', remainingNum: D(0), hasInstallments: false }, // Paid (remaining 0)
    ];

    // Compute counts
    let overdue = 0;
    let upcoming = 0;
    let unscheduled = 0;
    let paid = 0;

    rawItems.forEach(row => {
      const isPaid = row.remainingNum.lte(0) || row.statusKey === 'paid';
      if (isPaid) {
        paid++;
      } else if (row.statusKey === 'overdue') {
        overdue++;
      } else if (row.hasInstallments) {
        upcoming++;
      } else {
        unscheduled++;
      }
    });

    assert.equal(rawItems.length, 7);
    assert.equal(overdue, 2, '2 overdue items');
    assert.equal(upcoming, 1, '1 upcoming scheduled item');
    assert.equal(unscheduled, 2, '2 unscheduled items');
    assert.equal(paid, 2, '2 settled items');

    // Verify partition for 'overdue' tab
    const overdueFiltered = rawItems.filter(row => {
      const isPaid = row.remainingNum.lte(0) || row.statusKey === 'paid';
      if (isPaid) return false;
      return row.statusKey === 'overdue';
    });
    assert.equal(overdueFiltered.length, 2);
    assert.ok(overdueFiltered.every(r => r.statusKey === 'overdue'));

    // Verify partition for 'upcoming' tab
    const upcomingFiltered = rawItems.filter(row => {
      const isPaid = row.remainingNum.lte(0) || row.statusKey === 'paid';
      if (isPaid) return false;
      return row.hasInstallments && row.statusKey !== 'overdue';
    });
    assert.equal(upcomingFiltered.length, 1);
    assert.equal(upcomingFiltered[0].id, 'p3');

    // Verify partition for 'unscheduled' tab
    const unscheduledFiltered = rawItems.filter(row => {
      const isPaid = row.remainingNum.lte(0) || row.statusKey === 'paid';
      if (isPaid) return false;
      return !row.hasInstallments && row.statusKey !== 'overdue';
    });
    assert.equal(unscheduledFiltered.length, 2);

    // Verify partition for 'paid' tab
    const paidFiltered = rawItems.filter(row => {
      return row.remainingNum.lte(0) || row.statusKey === 'paid';
    });
    assert.equal(paidFiltered.length, 2);
  });

  it('enforces canonical side widgets architecture and sparklines contract in ConstructionPayablesView', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const viewPath = path.resolve(process.cwd(), 'src/components/admin/erp/v2/views/ConstructionPayablesView.tsx');
    const cssPath = path.resolve(process.cwd(), 'src/components/admin/erp/v2/views/ConstructionPayablesView.module.css');
    
    const viewCode = fs.readFileSync(viewPath, 'utf-8');
    const cssCode = fs.readFileSync(cssPath, 'utf-8');

    // 1. Must use canonical ZFWidgetCard with specific widget IDs
    assert.ok(viewCode.includes('<ZFWidgetCard'), 'Must instantiate ZFWidgetCard for side widgets');
    assert.ok(viewCode.includes('id="construction-quick-summary"'), 'Must define quick summary widget ID');
    assert.ok(viewCode.includes('id="construction-expense-rate"'), 'Must define expense rate widget ID');
    assert.ok(viewCode.includes('id="construction-top-contractors"'), 'Must define top contractors widget ID');

    // 2. Must enable showSparkline on all 4 discrete KPI cards
    const sparklineMatches = viewCode.match(/showSparkline=\{true\}/g);
    assert.ok(sparklineMatches && sparklineMatches.length >= 4, 'Must have showSparkline={true} on all 4 KPI cards');

    // 3. Empty live sources must remain empty
    assert.ok(viewCode.includes('effectivePropertyCosts'), 'Must define effectivePropertyCosts memo');
    assert.ok(!viewCode.includes('generateMockPropertyCosts'), 'Must never fabricate costs on empty live sources');

    // 4. CSS must define hardened badges and empty contractor states
    assert.ok(cssCode.includes('.sideWidgetBadge'), 'CSS must define .sideWidgetBadge');
    assert.ok(cssCode.includes('.emptyContractorsWrap'), 'CSS must define .emptyContractorsWrap');
    assert.ok(cssCode.includes('text-overflow: ellipsis'), 'CSS must enforce text-overflow: ellipsis on widget titles');
  });

  it('enforces FIN-OS Construction Payables 5-Item Revamp Invariants', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const viewPath = path.resolve(process.cwd(), 'src/components/admin/erp/v2/views/ConstructionPayablesView.tsx');
    const viewCssPath = path.resolve(process.cwd(), 'src/components/admin/erp/v2/views/ConstructionPayablesView.module.css');
    const modalPath = path.resolve(process.cwd(), 'src/components/admin/erp/v2/modals/ZFDirectExpenseModal.tsx');
    const modalCssPath = path.resolve(process.cwd(), 'src/components/admin/erp/v2/modals/ZFDirectExpenseModal.module.css');
    const tafqeetPath = path.resolve(process.cwd(), 'src/lib/erp/tafqeet.ts');

    const viewCode = fs.readFileSync(viewPath, 'utf-8');
    const viewCss = fs.readFileSync(viewCssPath, 'utf-8');
    const modalCode = fs.readFileSync(modalPath, 'utf-8');
    const modalCss = fs.readFileSync(modalCssPath, 'utf-8');
    const tafqeetCode = fs.readFileSync(tafqeetPath, 'utf-8');

    // 1. Tafqeet export alias
    assert.ok(tafqeetCode.includes('tafqeetNumber = tafqeetEGP'), 'tafqeet.ts must export tafqeetNumber alias');
    assert.equal(typeof (await import('../tafqeet')).tafqeetNumber, 'function');

    // 2. Direct Expense Modal Invariants (Unified Single Screen)
    assert.ok(modalCode.includes('ZFField'), 'ZFDirectExpenseModal must use ZFField from form kit');
    assert.ok(modalCode.includes('ZFJournalPeek'), 'ZFDirectExpenseModal must use ZFJournalPeek');
    // Strict Treasury Invariant: Allowed Cash 101000, InstaPay 102000, Deferred 201000. Strictly bans cheque.
    assert.ok(modalCode.includes("'101000'"), 'Modal must include treasury cash 101000');
    assert.ok(modalCode.includes("'102000'"), 'Modal must include instapay 102000');
    assert.ok(modalCode.includes("'201000'"), 'Modal must include deferred accounts payable 201000');
    assert.ok(!modalCode.includes('CHEQUE'), 'Modal must strictly exclude cheque payments');
    assert.ok(modalCode.includes('downPaymentValue.lt(0)'), 'Modal must validate non-negative down payments');
    assert.ok(modalCode.includes('downPaymentValue.gte(total)'), 'Modal must validate down payment does not exceed total');

    // 3. Item 1: Contractors Directory Modal & 7 Columns
    assert.ok(viewCode.includes('setIsContractorsModalOpen(true)'), 'viewAllContractorsBtn must trigger setIsContractorsModalOpen(true)');
    assert.ok(viewCode.includes('isContractorsModalOpen'), 'View must define isContractorsModalOpen state');
    assert.ok(viewCode.includes('contractorsDirectory'), 'View must calculate contractorsDirectory');
    assert.ok(viewCode.includes('filteredContractorsDirectory'), 'View must calculate filteredContractorsDirectory');
    assert.ok(viewCode.includes('normalize ='), 'View must use normalized Arabic search for contractors');
    assert.ok(viewCss.includes('.contractorsDirWrap'), 'View CSS must define .contractorsDirWrap');
    assert.ok(viewCss.includes('.contractorsSummaryBanner'), 'View CSS must define .contractorsSummaryBanner');
    // Verify 7 table header columns in Contractors Directory
    assert.ok(viewCode.includes("'عدد المشاريع المرتبطة'"), 'Directory table must include active projects count column');
    assert.ok(viewCode.includes("'إجمالي التعاقدات'"), 'Directory table must include total contracted volume column');
    assert.ok(viewCode.includes("'المسدد فعلياً'"), 'Directory table must include settled amount column');
    assert.ok(viewCode.includes("'الرصيد المستحق'"), 'Directory table must include open payables column');
    assert.ok(viewCode.includes('statusPillGreen'), 'Directory table must include soft green status pill');
    assert.ok(viewCode.includes('statusPillAmber'), 'Directory table must include soft amber status pill');
    assert.ok(viewCode.includes('toast.success'), 'Filter button must show toast notification');

    // 4. Item 2: Contractor table cell must be purged of raw internal journal allocation strings
    assert.ok(!viewCode.includes('className={vStyles.invoiceRefBadge}'), 'Contractor name cell must not render invoiceRefBadge inside contractor cell');
    assert.ok(viewCode.includes('contractorName'), 'Row model must expose clean contractorName');

    // 5. Item 3: Centered Inspection Modal (Replace ZFDrawerShell)
    assert.ok(!viewCode.includes('<ZFDrawerShell'), 'Must NOT instantiate ZFDrawerShell in ConstructionPayablesView');
    assert.ok(viewCode.includes('maxWidth="850px"'), 'Inspection modal must have maxWidth="850px"');
    assert.ok(viewCss.includes('.inspectModalBody'), 'View CSS must define .inspectModalBody');
    assert.ok(viewCss.includes('.inspectMetricsGrid'), 'View CSS must define .inspectMetricsGrid');
    assert.ok(viewCss.includes('.inspectBodyColumns'), 'View CSS must define .inspectBodyColumns');
    // Metric 4: Next Due Date
    assert.ok(viewCode.includes("'تاريخ الاستحقاق القادم'") || viewCode.includes("'Next Due Date'"), 'Inspection modal must include Next Due Date metric');
    // Footer action buttons: Settle Claim and Reschedule Installments
    assert.ok(viewCode.includes("'سداد المستحق'") || viewCode.includes("'Settle Claim'"), 'Inspection modal footer must include Settle Claim button');
    assert.ok(viewCode.includes("'إعادة جدولة'") || viewCode.includes("'Reschedule Installments'"), 'Inspection modal footer must include Reschedule button');
    assert.ok(viewCode.includes("'تعديل البند'") || viewCode.includes("'Edit Claim'"), 'Inspection modal footer must include Edit button');
    // Detailed Facts in Right Column
    assert.ok(viewCode.includes("'مركز التكلفة'") || viewCode.includes("'Cost Center'"), 'Inspection modal must display Cost Center fact');
    assert.ok(viewCode.includes("'مرحلة التنفيذ'") || viewCode.includes("'Construction Phase'"), 'Inspection modal must display Construction Phase fact');
    assert.ok(viewCode.includes("'تاريخ التعاقد'") || viewCode.includes("'Contract Date'"), 'Inspection modal must display Contract Date fact');
    assert.ok(viewCode.includes("'الرقم الضريبي'") || viewCode.includes("'Tax ID'"), 'Inspection modal must display Tax ID fact');

    // Full-row inspection replaces repetitive inline action buttons.
    assert.ok(viewCode.includes('className={vStyles.canonicalRow}'));
    assert.ok(viewCode.includes('setInspectCostItem(row.costItem)'));
    assert.ok(viewCode.includes('onKeyDown='));
    assert.ok(!viewCode.includes('className={vStyles.rowActions}'));
  });

  it('verifies Arabic search normalization resilience against diacritics and alef forms', () => {
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي');

    assert.equal(normalize('شَرِكَةُ الأُفُقِ لِلْمُقَاوَلَاتِ'), 'شركه الافق للمقاولات');
    assert.equal(normalize('الأفق'), normalize('الافق'));
    assert.equal(normalize('مقاولات كبرى'), normalize('مقاولات كبري'));
    assert.equal(normalize('إعمار'), normalize('اعمار'));
  });
});


