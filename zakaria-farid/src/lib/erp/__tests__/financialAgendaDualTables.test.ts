import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { ERPPropertyCostItem, ERPPayableInstallment, ERPContract, ERPInstallmentSchedule } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import {
  buildProjectedOutflowItems,
  calculateFinancialAgendaKPIs,
  sortInflowItems,
  sortOutflowItems,
  ProjectedOutflowItem
} from '@/lib/erp/financialAgendaProjection';
import { ProjectedVaultItem } from '@/lib/erp/installmentsVaultProjection';
import { D } from '@/lib/erp/math';

// Register .css and .module.css handlers for Node.js test environment
const cjsRequire = createRequire(import.meta.url);
cjsRequire.extensions['.css'] = (m: any) => { m.exports = {}; };
cjsRequire.extensions['.module.css'] = (m: any) => { m.exports = {}; };

describe('Financial Agenda Dual Tables & Zero-Cheque Architecture', () => {
  let HandInstallmentsVaultView: any;

  before(async () => {
    const mod = await import('@/components/admin/erp/v2/views/HandInstallmentsVaultView');
    HandInstallmentsVaultView = mod.HandInstallmentsVaultView;
  });

  const mockProperties: Property[] = [
    {
      id: 'prop-101',
      title_ar: 'برج النرجس التجمع الخامس',
      title_en: 'Narcissus Tower New Cairo',
      slug: 'narcissus-tower',
      created_at: '2026-01-01',
      updated_at: '2026-01-01'
    } as unknown as Property,
    {
      id: 'prop-102',
      title_ar: 'فيلا الياسمين زايد',
      title_en: 'Jasmine Villa Zayed',
      slug: 'jasmine-villa',
      created_at: '2026-01-01',
      updated_at: '2026-01-01'
    } as unknown as Property
  ];

  const mockCostItems: ERPPropertyCostItem[] = [
    {
      item_id: 'cost-1',
      id: 'cost-1',
      property_id: 'prop-101',
      supplier_contractor: 'شركة المقاولات الحديثة',
      category: 'civil_structure',
      phase: 'structural_skeleton',
      item_name_ar: 'خرسانة مسلحة للأعمدة',
      item_name_en: 'Reinforced Concrete Columns',
      total_cost_egp: '500000.00',
      paid_amount_egp: '200000.00',
      remaining_amount_egp: '300000.00',
      due_date: '2026-04-10',
      payable_installments: [
        {
          installment_id: 'p-inst-1',
          cost_item_id: 'cost-1',
          installment_number: 1,
          due_date: '2026-03-01',
          amount_egp: '100000.00',
          paid_amount_egp: '100000.00',
          status: 'PAID',
          payment_method: 'CASH_101000',
          title_ar: 'الدفعة المقدمة للخرسانة'
        },
        {
          installment_id: 'p-inst-2',
          cost_item_id: 'cost-1',
          installment_number: 2,
          due_date: '2026-04-01',
          amount_egp: '200000.00',
          paid_amount_egp: '100000.00',
          status: 'PARTIALLY_PAID',
          payment_method: 'INSTAPAY_102000',
          title_ar: 'مستخلص صب سقف الدور الأول'
        },
        {
          installment_id: 'p-inst-3',
          cost_item_id: 'cost-1',
          installment_number: 3,
          due_date: '2026-04-20',
          amount_egp: '200000.00',
          paid_amount_egp: '0.00',
          status: 'PENDING',
          payment_method: 'CASH_101000',
          title_ar: 'مستخلص صب سقف الدور الثاني'
        }
      ]
    },
    {
      item_id: 'cost-2',
      id: 'cost-2',
      property_id: 'prop-102',
      supplier_contractor: 'مؤسسة السويدي للكابلات',
      category: 'mep_infrastructure',
      phase: 'masonry_roughing',
      item_name_ar: 'توريد كابلات كهربائية رئيسية',
      item_name_en: 'Main Electrical Cables',
      total_cost_egp: '150000.00',
      paid_amount_egp: '50000.00',
      remaining_amount_egp: '100000.00',
      due_date: '2026-03-25',
      payable_installments: []
    }
  ] as unknown as ERPPropertyCostItem[];

  it('1. buildProjectedOutflowItems accurately projects installments and single cost items with strictly Cash or InstaPay', () => {
    const referenceDate = '2026-04-01';
    const outflows = buildProjectedOutflowItems(mockCostItems, mockProperties, { isAr: true, referenceDate });

    assert.strictEqual(outflows.length, 4, 'Should project exactly 4 outflow items');

    const item1 = outflows.find(i => i.id === 'p-inst-1');
    assert.ok(item1, 'p-inst-1 must be projected');
    assert.strictEqual(item1.status, 'paid');
    assert.strictEqual(item1.projectTitle, 'برج النرجس التجمع الخامس');
    assert.strictEqual(item1.beneficiary, 'شركة المقاولات الحديثة');
    assert.strictEqual(item1.paymentMethod, 'CASH');

    const item2 = outflows.find(i => i.id === 'p-inst-2');
    assert.ok(item2, 'p-inst-2 must be projected');
    assert.strictEqual(item2.status, 'due_today');
    assert.strictEqual(item2.paymentMethod, 'INSTAPAY');
    assert.strictEqual(item2.remainingAmount, '100000.00');

    const item3 = outflows.find(i => i.id === 'p-inst-3');
    assert.ok(item3, 'p-inst-3 must be projected');
    assert.strictEqual(item3.status, 'upcoming');
    assert.strictEqual(item3.remainingAmount, '200000.00');

    const item4 = outflows.find(i => i.costItemId === 'cost-2');
    assert.ok(item4, 'cost-2 must be projected');
    assert.strictEqual(item4.status, 'overdue');
    assert.strictEqual(item4.beneficiary, 'مؤسسة السويدي للكابلات');
    assert.strictEqual(item4.projectTitle, 'فيلا الياسمين زايد');
    assert.strictEqual(item4.remainingAmount, '100000.00');

    outflows.forEach(outflow => {
      assert.ok(
        outflow.paymentMethod === 'CASH' || outflow.paymentMethod === 'INSTAPAY',
        `Payment method must strictly be CASH or INSTAPAY, got ${outflow.paymentMethod}`
      );
    });
  });

  it('2. calculateFinancialAgendaKPIs correctly aggregates Inflows, Outflows, Net Cashflow, and Urgent items', () => {
    const referenceDate = '2026-04-01';
    const outflows = buildProjectedOutflowItems(mockCostItems, mockProperties, { isAr: true, referenceDate });

    const mockInflows: ProjectedVaultItem[] = [
      {
        id: 'inflow-1',
        kind: 'schedule_due',
        contractId: 'cnt-1',
        contractNumber: 'ZF-1',
        buyerName: 'أحمد محمود',
        unitId: 'وحدة 204',
        projectTitle: 'برج النرجس التجمع الخامس',
        nominalValue: '300000.00',
        remainingAmount: '0.00',
        amountPaid: '300000.00',
        dueDate: '2026-03-15',
        status: 'cleared',
        isDownPayment: false,
        description: 'دفعة 1',
        instrumentNumber: 'SND-1',
        bankName: 'خزينة المركز الرئيسي',
        paymentMethod: 'CASH'
      },
      {
        id: 'inflow-2',
        kind: 'schedule_due',
        contractId: 'cnt-1',
        contractNumber: 'ZF-1',
        buyerName: 'أحمد محمود',
        unitId: 'وحدة 204',
        projectTitle: 'برج النرجس التجمع الخامس',
        nominalValue: '200000.00',
        remainingAmount: '200000.00',
        amountPaid: '0.00',
        dueDate: '2026-03-20',
        status: 'overdue',
        isDownPayment: false,
        description: 'دفعة 2',
        instrumentNumber: 'SND-2',
        bankName: 'إنستاباي',
        paymentMethod: 'INSTAPAY'
      },
      {
        id: 'inflow-3',
        kind: 'schedule_due',
        contractId: 'cnt-2',
        contractNumber: 'ZF-2',
        buyerName: 'سارة إبراهيم',
        unitId: 'فيلا 5',
        projectTitle: 'فيلا الياسمين زايد',
        nominalValue: '150000.00',
        remainingAmount: '150000.00',
        amountPaid: '0.00',
        dueDate: '2026-04-01',
        status: 'due_today',
        isDownPayment: false,
        description: 'دفعة 1',
        instrumentNumber: 'SND-3',
        bankName: 'خزينة المركز الرئيسي',
        paymentMethod: 'CASH'
      }
    ];

    const kpis = calculateFinancialAgendaKPIs(mockInflows, outflows, referenceDate);

    assert.strictEqual(kpis.inflowsTotal.toFixed(2), '650000.00');
    assert.strictEqual(kpis.inflowsCount, 3);
    assert.strictEqual(kpis.inflowsCleared.toFixed(2), '300000.00');
    assert.strictEqual(kpis.inflowsOverdue.toFixed(2), '200000.00');
    assert.strictEqual(kpis.inflowsDueToday.toFixed(2), '150000.00');

    assert.strictEqual(kpis.outflowsTotal.toFixed(2), '650000.00');
    assert.strictEqual(kpis.outflowsCount, 4);
    assert.strictEqual(kpis.outflowsPaid.toFixed(2), '100000.00');

    assert.strictEqual(kpis.netProjectedCashflow.toFixed(2), '0.00');
    assert.strictEqual(kpis.urgentCount, 4);
    assert.strictEqual(kpis.urgentSum.toFixed(2), '550000.00');
  });

  it('3. Multi-criteria column sorters sort correctly for both inflows and outflows', () => {
    const referenceDate = '2026-04-01';
    const outflows = buildProjectedOutflowItems(mockCostItems, mockProperties, { isAr: true, referenceDate });

    const byDueDateAsc = sortOutflowItems(outflows, 'due_date_asc');
    assert.strictEqual(byDueDateAsc[0].dueDate <= byDueDateAsc[1].dueDate, true);

    const byRemDesc = sortOutflowItems(outflows, 'remaining_desc');
    assert.ok(D(byRemDesc[0].remainingAmount).gte(D(byRemDesc[1].remainingAmount)));

    const byBeneficiary = sortOutflowItems(outflows, 'counterparty_asc', true);
    assert.strictEqual(byBeneficiary.length, 4);

    const byPriority = sortOutflowItems(outflows, 'priority');
    assert.strictEqual(byPriority[0].status, 'overdue');
    assert.strictEqual(byPriority[1].status, 'due_today');
    assert.strictEqual(byPriority[byPriority.length - 1].status, 'paid');
  });

  it('4. Dual Tables View Contract: Renders Inflows and Outflows tables, and completely eliminates bank cheque terms', () => {
    const mockContracts: ERPContract[] = [
      {
        contract_id: 'cnt-1',
        contract_number: 'ZF-2026-101',
        property_id: 'prop-101',
        buyer_name: 'أحمد محمود',
        unit_id: 'وحدة 204',
        gross_contract_value: '650000.00',
        currency: 'EGP',
        exchange_rate: '1.0000',
        contract_date: '2026-01-15',
        handover_status: 'Pending',
        total_cash_collected: '300000.00',
        status: 'Active'
      }
    ];

    const mockSchedules: ERPInstallmentSchedule[] = [
      {
        schedule_id: 'sch-1',
        contract_id: 'cnt-1',
        schedule_version: 1,
        tranche_number: 1,
        nominal_value: '150000.00',
        due_date: '2026-04-01',
        amount_paid: '0.00',
        status: 'Pending'
      }
    ];

    const html = renderToStaticMarkup(
      React.createElement(HandInstallmentsVaultView, {
        pdcRecords: [],
        contracts: mockContracts,
        schedules: mockSchedules,
        properties: mockProperties,
        propertyCosts: mockCostItems,
        isAr: true,
        onCollectItem: () => {},
        onRecordPayablePayment: () => {}
      })
    );

    assert.ok(
      html.includes('أجندة التعاملات المالية والاستحقاقات (تدفقات الخزينة)'),
      'Module title must reflect Financial Transactions & Dues Agenda'
    );

    assert.ok(
      html.includes('1. المقبوضات والتحصيلات الواردة (أقساط العملاء)'),
      'Table 1 (Inflows) header must be rendered'
    );

    assert.ok(
      html.includes('2. المدفوعات والالتزامات الصادرة (مستحقات المقاولين والموردين والمصروفات)'),
      'Table 2 (Outflows) header must be rendered'
    );

    assert.ok(html.includes('عرض الجدولين معاً'), 'Both tables pill must exist');
    assert.ok(html.includes('المقبوضات والتحصيلات فقط'), 'Inflows only pill must exist');
    assert.ok(html.includes('المدفوعات والالتزامات فقط'), 'Outflows only pill must exist');

    const bannedTerms = [
      'شيك بنكي',
      'إيداع بالبنك',
      'ارتداد الشيك',
      'محفظة الشيكات',
      'دفتر الشيكات',
      'مودع بالبنك',
      'تحصيل بنكي'
    ];

    for (const term of bannedTerms) {
      assert.ok(
        !html.includes(term),
        `Banned cheque/banking term "${term}" must NOT appear in the rendered HandInstallmentsVaultView`
      );
    }

    assert.ok(
      html.includes('كاش') || html.includes('إنستاباي'),
      'Rendered view must display Cash and/or InstaPay payment indicators'
    );
    assert.ok(
      html.includes('سداد (كاش / إنستاباي)'),
      'Outflows table must provide Settle via Cash / InstaPay action button'
    );
  });
});
