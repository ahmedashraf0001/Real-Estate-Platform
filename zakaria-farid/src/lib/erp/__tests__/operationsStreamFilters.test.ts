import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { D } from '../math';
import {
  type CashMovementTransaction,
  matchesIn0,
  matchesIn1,
  matchesIn2,
  matchesIn3,
  matchesOut0,
  matchesOut1,
  matchesOut2,
  matchesOut3,
  matchesStreamFilter,
  getStreamFilterLabel
} from '../operationsStreamFilters';

// Helper to construct a base transaction for testing
function makeTx(partial: Partial<CashMovementTransaction> = {}): CashMovementTransaction {
  return {
    id: 'tx-test-1',
    date: '2026-09-19',
    timeStr: '10:30',
    fullDateTimeStr: '2026-09-19T10:30:00Z',
    type: 'EXPENSE',
    typeLabelAr: 'مصروف',
    typeLabelEn: 'Expense',
    description: 'Test transaction',
    counterparty: 'Test Party',
    accountLabel: 'Test Account',
    accountCode: '101000',
    amount: D(1000),
    direction: 'OUT',
    status: 'COMPLETED',
    statusLabelAr: 'مكتمل',
    statusLabelEn: 'Completed',
    category: 'expense',
    ...partial
  };
}

describe('FIN-OS Operations Stream Filters & Mindmap Matchers', () => {
  describe('Inflow Matchers (2-Stream Real Model)', () => {
    it('matchesIn1 matches partner capital injections and drawings settlements', () => {
      const partnerByType = makeTx({ direction: 'IN', type: 'PARTNER' });
      assert.strictEqual(matchesIn1(partnerByType), true);

      const partnerByAccount = makeTx({
        direction: 'IN',
        category: 'other',
        accountCode: '301000',
        description: 'إيداع حصة'
      });
      assert.strictEqual(matchesIn1(partnerByAccount), true);

      const partnerByDescShare = makeTx({
        direction: 'IN',
        category: 'other',
        description: 'دفعة من الشريك زكريا'
      });
      assert.strictEqual(matchesIn1(partnerByDescShare), true);

      const partnerByDescCapital = makeTx({
        direction: 'IN',
        category: 'other',
        description: 'زيادة رأس مال المشروع'
      });
      assert.strictEqual(matchesIn1(partnerByDescCapital), true);

      // Must reject if direction is OUT
      const partnerOut = makeTx({ direction: 'OUT', type: 'PARTNER' });
      assert.strictEqual(matchesIn1(partnerOut), false);
    });

    it('matchesIn0 matches customer installment collections and unit down payments', () => {
      const collByType = makeTx({ direction: 'IN', type: 'COLLECTION' });
      assert.strictEqual(matchesIn0(collByType), true);

      const collByCategory = makeTx({ direction: 'IN', category: 'collection' });
      assert.strictEqual(matchesIn0(collByCategory), true);

      const collByDesc = makeTx({ direction: 'IN', description: 'قسط حجز شقة 402' });
      assert.strictEqual(matchesIn0(collByDesc), true);

      // Must reject if direction is OUT
      const collOut = makeTx({ direction: 'OUT', type: 'COLLECTION' });
      assert.strictEqual(matchesIn0(collOut), false);
    });

    it('matchesIn2 and matchesIn3 act as safe deprecated fallbacks', () => {
      const collTx = makeTx({ direction: 'IN', type: 'COLLECTION' });
      assert.strictEqual(matchesIn3(collTx), false);

      const partnerTx = makeTx({ direction: 'IN', type: 'PARTNER' });
      assert.strictEqual(matchesIn3(partnerTx), false);
    });

    it('enforces exact partition of any IN transaction into exactly one inflow stream (in-0 or in-1)', () => {
      const sampleInflows: CashMovementTransaction[] = [
        makeTx({ direction: 'IN', type: 'COLLECTION' }),
        makeTx({ direction: 'IN', type: 'PARTNER' }),
        makeTx({ direction: 'IN', accountCode: '301000', description: 'زيادة رأس مال' }),
        makeTx({ direction: 'IN', category: 'collection', description: 'قسط عميل شقة 203' }),
        makeTx({ direction: 'IN', category: 'other', description: 'دفعة من الشريك زكريا' }),
        makeTx({ direction: 'IN', type: 'COLLECTION', description: 'تحصيل شيك بنكي' }),
        makeTx({ direction: 'IN', type: 'TRANSFER', description: 'تحويل بنكي من عميل' })
      ];

      for (const tx of sampleInflows) {
        const matches = [
          matchesIn0(tx),
          matchesIn1(tx)
        ].filter(Boolean);

        assert.strictEqual(
          matches.length,
          1,
          `Transaction "${tx.description}" must match exactly one inflow stream, but matched ${matches.length}`
        );
      }
    });
  });

  describe('Outflow Matchers (4 Real Construction Pillars)', () => {
    it('matchesOut0 matches civil structure, concrete, steel, and structure labor', () => {
      const civilCost = makeTx({
        direction: 'OUT',
        rawCost: { category: 'civil_structure' } as any
      });
      assert.strictEqual(matchesOut0(civilCost), true);

      const laborCost = makeTx({
        direction: 'OUT',
        rawCost: { category: 'labor_subcontractor' } as any
      });
      assert.strictEqual(matchesOut0(laborCost), true);

      const matHadeed = makeTx({ direction: 'OUT', description: 'توريد حديد تسليح عز للموقع' });
      assert.strictEqual(matchesOut0(matHadeed), true);

      const matAsmant = makeTx({ direction: 'OUT', description: 'شراء أسمنت بورتلاندي' });
      assert.strictEqual(matchesOut0(matAsmant), true);

      const concreteCasting = makeTx({ direction: 'OUT', description: 'صب خرسانة جاهزة لسقف الدور الأول' });
      assert.strictEqual(matchesOut0(concreteCasting), true);

      const structureBone = makeTx({ direction: 'OUT', description: 'بناء عظم ومصنعيات هيكل' });
      assert.strictEqual(matchesOut0(structureBone), true);

      // Foundation waterproofing is part of civil structure despite containing "عزل"
      const foundationInsulation = makeTx({
        direction: 'OUT',
        rawCost: { category: 'civil_structure' } as any,
        description: 'عزل مائي بمستحلب بيتوميني وممبرين مقوى 4 مم للأساسات وسرداب الجراج'
      });
      assert.strictEqual(matchesOut0(foundationInsulation), true);
      assert.strictEqual(matchesOut2(foundationInsulation), false);

      // Must reject if direction is IN
      const inStructure = makeTx({ direction: 'IN', description: 'توريد حديد' });
      assert.strictEqual(matchesOut0(inStructure), false);
    });

    it('matchesOut1 matches finishes and facade works', () => {
      const finishCost = makeTx({
        direction: 'OUT',
        rawCost: { category: 'finishing_interior' } as any
      });
      assert.strictEqual(matchesOut1(finishCost), true);

      const facadeCost = makeTx({
        direction: 'OUT',
        rawCost: { category: 'site_facade' } as any
      });
      assert.strictEqual(matchesOut1(facadeCost), true);

      const marbleDesc = makeTx({ direction: 'OUT', description: 'توريد رخام مداخل ومصاعد' });
      assert.strictEqual(matchesOut1(marbleDesc), true);

      const alumitalDesc = makeTx({ direction: 'OUT', description: 'تركيب ألوميتال شبابيك وواجهات' });
      assert.strictEqual(matchesOut1(alumitalDesc), true);

      const ceramicDesc = makeTx({ direction: 'OUT', description: 'توريد سيراميك وبورسلين أرضيات' });
      assert.strictEqual(matchesOut1(ceramicDesc), true);

      const elevatorDesc = makeTx({ direction: 'OUT', description: 'دفعة تركيب مصاعد العمارة' });
      assert.strictEqual(matchesOut1(elevatorDesc), true);

      // Must reject if direction is IN
      const inFinish = makeTx({ direction: 'IN', description: 'رخام مداخل' });
      assert.strictEqual(matchesOut1(inFinish), false);
    });

    it('matchesOut2 matches MEP, electromechanical, plumbing, and insulation', () => {
      const mepCost = makeTx({
        direction: 'OUT',
        rawCost: { category: 'mep_infrastructure' } as any
      });
      assert.strictEqual(matchesOut2(mepCost), true);

      const plumbingDesc = makeTx({ direction: 'OUT', description: 'تأسيس شبكات سباكة وصرف صحي' });
      assert.strictEqual(matchesOut2(plumbingDesc), true);

      const electricDesc = makeTx({ direction: 'OUT', description: 'تمديد كابلات كهرباء ولوحات توزيع' });
      assert.strictEqual(matchesOut2(electricDesc), true);

      const insulationDesc = makeTx({ direction: 'OUT', description: 'أعمال عزل مائي وحراري للأسطح' });
      assert.strictEqual(matchesOut2(insulationDesc), true);

      const mepDesc = makeTx({ direction: 'OUT', description: 'أعمال كهروميكانيك متكاملة للمبنى' });
      assert.strictEqual(matchesOut2(mepDesc), true);

      // Must reject if direction is IN
      const inMep = makeTx({ direction: 'IN', description: 'شبكات سباكة' });
      assert.strictEqual(matchesOut2(inMep), false);
    });

    it('matchesOut3 matches permits, engineering dues, taxes, and government authority fees', () => {
      const permitsCost = makeTx({
        direction: 'OUT',
        rawCost: { category: 'permits_engineering' } as any
      });
      assert.strictEqual(matchesOut3(permitsCost), true);

      const taxesCost = makeTx({
        direction: 'OUT',
        rawCost: { category: 'taxes_fees' } as any
      });
      assert.strictEqual(matchesOut3(taxesCost), true);

      const account204 = makeTx({ direction: 'OUT', accountCode: '204000' });
      assert.strictEqual(matchesOut3(account204), true);

      const account150 = makeTx({ direction: 'OUT', accountCode: '150100' });
      assert.strictEqual(matchesOut3(account150), true);

      const taxDesc = makeTx({ direction: 'OUT', description: 'سداد ضرائب قيمة مضافة' });
      assert.strictEqual(matchesOut3(taxDesc), true);

      const permitDesc = makeTx({ direction: 'OUT', description: 'رسوم تراخيص بناء مجمعة' });
      assert.strictEqual(matchesOut3(permitDesc), true);

      const cityAuthDesc = makeTx({ direction: 'OUT', description: 'سداد رسوم جهاز المدينة وتصاريح الحفر' });
      assert.strictEqual(matchesOut3(cityAuthDesc), true);

      // Must reject if direction is IN
      const inTax = makeTx({ direction: 'IN', accountCode: '204000' });
      assert.strictEqual(matchesOut3(inTax), false);
    });

    it('enforces exact partition of any OUT transaction into exactly one of 4 construction streams (0, 1, 2, 3)', () => {
      const sampleOutflows: CashMovementTransaction[] = [
        makeTx({ direction: 'OUT', description: 'شراء حديد تسليح عز' }),
        makeTx({ direction: 'OUT', description: 'سداد ضرائب عقارية وتصاريح' }),
        makeTx({ direction: 'OUT', description: 'مستخلص مقاول تشطيب الواجهات' }),
        makeTx({ direction: 'OUT', description: 'تأسيس شبكات سباكة الموقع' }),
        makeTx({ direction: 'OUT', rawCost: { category: 'civil_structure' } as any }),
        makeTx({ direction: 'OUT', rawCost: { category: 'labor_subcontractor' } as any }),
        makeTx({ direction: 'OUT', rawCost: { category: 'finishing_interior' } as any }),
        makeTx({ direction: 'OUT', rawCost: { category: 'site_facade' } as any }),
        makeTx({ direction: 'OUT', rawCost: { category: 'mep_infrastructure' } as any }),
        makeTx({ direction: 'OUT', rawCost: { category: 'permits_engineering' } as any }),
        makeTx({ direction: 'OUT', rawCost: { category: 'taxes_fees' } as any }),
        makeTx({ direction: 'OUT', accountCode: '204000', description: 'رسوم حكومية' }),
        makeTx({ direction: 'OUT', description: 'دفعة تركيب مصاعد وسيراميك' }),
        makeTx({ direction: 'OUT', description: 'أعمال عزل مائي' }),
        makeTx({ direction: 'OUT', description: 'صب خرسانة ومصنعيات' }),
        makeTx({ direction: 'OUT', description: 'سداد رسوم جهاز المدينة' })
      ];

      for (const tx of sampleOutflows) {
        const matches = [
          matchesOut0(tx),
          matchesOut1(tx),
          matchesOut2(tx),
          matchesOut3(tx)
        ].filter(Boolean);

        assert.strictEqual(
          matches.length,
          1,
          `Transaction "${tx.description}" must match exactly one outflow stream, but matched ${matches.length}`
        );
      }
    });
  });

  describe('matchesStreamFilter Master Dispatcher', () => {
    const inTx = makeTx({ direction: 'IN', type: 'COLLECTION' });
    const outTx = makeTx({ direction: 'OUT', description: 'صب خرسانة مسلحة' });

    it('returns true when streamId is null or empty', () => {
      assert.strictEqual(matchesStreamFilter(inTx, null), true);
      assert.strictEqual(matchesStreamFilter(outTx, null), true);
      assert.strictEqual(matchesStreamFilter(inTx, ''), true);
    });

    it('handles in-total correctly', () => {
      assert.strictEqual(matchesStreamFilter(inTx, 'in-total'), true);
      assert.strictEqual(matchesStreamFilter(outTx, 'in-total'), false);
    });

    it('handles out-total correctly', () => {
      assert.strictEqual(matchesStreamFilter(outTx, 'out-total'), true);
      assert.strictEqual(matchesStreamFilter(inTx, 'out-total'), false);
    });

    it('routes specific stream IDs to correct matcher', () => {
      assert.strictEqual(matchesStreamFilter(inTx, 'in-0'), true);
      assert.strictEqual(matchesStreamFilter(inTx, 'in-1'), false);
      assert.strictEqual(matchesStreamFilter(outTx, 'out-0'), true);
      assert.strictEqual(matchesStreamFilter(outTx, 'out-1'), false);
    });

    it('returns true for unknown stream IDs without crashing', () => {
      assert.strictEqual(matchesStreamFilter(inTx, 'unknown-stream'), true);
      assert.strictEqual(matchesStreamFilter(outTx, 'invalid-id'), true);
    });
  });

  describe('getStreamFilterLabel Locale Provider', () => {
    it('returns empty string for null, empty, or unknown stream IDs', () => {
      assert.strictEqual(getStreamFilterLabel(null), '');
      assert.strictEqual(getStreamFilterLabel(''), '');
      assert.strictEqual(getStreamFilterLabel('non-existent'), '');
    });

    it('provides accurate Arabic labels for all inflow and outflow streams', () => {
      assert.strictEqual(getStreamFilterLabel('in-0', true), 'أقساط ومقدمات العملاء');
      assert.strictEqual(getStreamFilterLabel('in-1', true), 'تمويل وسيولة الشركاء');
      assert.strictEqual(getStreamFilterLabel('in-2', true), 'متحصلات أخرى');
      assert.strictEqual(getStreamFilterLabel('in-3', true), 'إعادة تمويل / قروض');
      assert.strictEqual(getStreamFilterLabel('in-total', true), 'إجمالي التدفقات الداخلة');
      assert.strictEqual(getStreamFilterLabel('out-0', true), 'خرسانات وبناء عظم');
      assert.strictEqual(getStreamFilterLabel('out-1', true), 'تشطيبات وواجهات');
      assert.strictEqual(getStreamFilterLabel('out-2', true), 'تأسيس وكهروميكانيك');
      assert.strictEqual(getStreamFilterLabel('out-3', true), 'تراخيص ورسوم حكومية');
      assert.strictEqual(getStreamFilterLabel('out-total', true), 'إجمالي التدفقات الخارجة');
    });

    it('provides accurate English labels for all inflow and outflow streams', () => {
      assert.strictEqual(getStreamFilterLabel('in-0', false), 'Client Installments & Collections');
      assert.strictEqual(getStreamFilterLabel('in-1', false), 'Partner Capital & Funding');
      assert.strictEqual(getStreamFilterLabel('in-2', false), 'Other Misc Receipts');
      assert.strictEqual(getStreamFilterLabel('in-3', false), 'Loans & Financing');
      assert.strictEqual(getStreamFilterLabel('in-total', false), 'Total Inflows');
      assert.strictEqual(getStreamFilterLabel('out-0', false), 'Civil Structure & Concrete');
      assert.strictEqual(getStreamFilterLabel('out-1', false), 'Finishes & Facades');
      assert.strictEqual(getStreamFilterLabel('out-2', false), 'MEP & Infrastructure');
      assert.strictEqual(getStreamFilterLabel('out-3', false), 'Permits & Government Fees');
      assert.strictEqual(getStreamFilterLabel('out-total', false), 'Total Outflows');
    });
  });

  describe('DailyOperations Real Data Contract', () => {
    it('does not create mock outflows and only counts explicitly paid property costs', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const viewPath = path.resolve(process.cwd(), 'src/components/admin/erp/v2/views/DailyOperationsView.tsx');
      const content = fs.readFileSync(viewPath, 'utf8');

      assert.strictEqual(content.includes('generateMockPropertyCosts'), false);
      assert.ok(content.includes('const effectivePropertyCosts = propertyCosts;'));
      assert.ok(content.includes("const costAmount = D(cost.paid_amount_egp ?? '0');"));
      assert.ok(content.includes('if (costAmount.lte(0)) return;'));
      assert.strictEqual(content.includes('cost.net_effective_cost_egp || cost.total_cost_egp'), false);
    });

    it('keeps the daily stream KPIs tied to real transactions without fallback chart points', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const viewPath = path.resolve(process.cwd(), 'src/components/admin/erp/v2/views/DailyOperationsView.tsx');
      const content = fs.readFileSync(viewPath, 'utf8');

      assert.ok(content.includes('const todayMetrics = useMemo('));
      assert.ok(content.includes("if (tx.date !== todayStr) return;"));
      assert.ok(content.includes('net: inflows.minus(outflows)'));
      assert.strictEqual(content.includes('showSparkline={true}'), false);
    });
  });
});
