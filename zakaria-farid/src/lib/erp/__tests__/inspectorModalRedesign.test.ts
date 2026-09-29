import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { 
  ERPContract, 
  ERPInstallmentSchedule, 
  ERPPDCRecord, 
  ERPTaxRecord, 
  ERPCostAllocation, 
  ERPRescissionRecord, 
  ERPJournalEntry 
} from '@/lib/erp/types';
import { CANONICAL_COA } from '@/lib/erp/ledger';

// Register .css and .module.css handlers for node:test SSR
const cjsRequire = createRequire(import.meta.url);
cjsRequire.extensions['.css'] = (m: any) => { m.exports = {}; };
cjsRequire.extensions['.module.css'] = (m: any) => { m.exports = {}; };

describe('FIN-OS Operations Inspection Modal Redesign Suite (§4-Tier Modal Architecture)', () => {
  let ZFInspectorDrawer: any;
  let ZFInspectorModal: any;

  before(async () => {
    const mod = await import('@/components/admin/erp/ZFInspectorDrawer');
    ZFInspectorDrawer = mod.ZFInspectorDrawer;
    ZFInspectorModal = mod.ZFInspectorModal;
  });

  // Sample Mock Data
  const sampleContract: ERPContract = {
    contract_id: 'cnt-zkf-2026-101',
    contract_number: 'ZKF-2026-101',
    unit_id: 'APT-402',
    property_id: 'prop-tower-a',
    buyer_name: 'Eng. Mahmoud El-Sayed',
    buyer_phone: '01012345678',
    gross_contract_value: '5000000.00',
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2026-01-15',
    handover_date: '2026-12-31',
    handover_status: 'Pending',
    total_cash_collected: '2000000.00',
    status: 'Active',
    payment_plan_type: 'INSTALLMENTS'
  };

  const sampleSchedules: ERPInstallmentSchedule[] = [
    {
      schedule_id: 'sch-0',
      contract_id: 'cnt-zkf-2026-101',
      tranche_number: 0,
      nominal_value: '1000000.00',
      due_date: '2026-01-15',
      paid_date: '2026-01-15',
      status: 'Paid',
      schedule_version: 1,
      amount_paid: '1000000.00'
    },
    {
      schedule_id: 'sch-1',
      contract_id: 'cnt-zkf-2026-101',
      tranche_number: 1,
      nominal_value: '1000000.00',
      due_date: '2026-04-15',
      paid_date: '2026-04-10',
      status: 'Paid',
      schedule_version: 1,
      amount_paid: '1000000.00'
    },
    {
      schedule_id: 'sch-2',
      contract_id: 'cnt-zkf-2026-101',
      tranche_number: 2,
      nominal_value: '1000000.00',
      due_date: '2027-07-15',
      status: 'Pending',
      schedule_version: 1,
      amount_paid: '0.00'
    },
    {
      schedule_id: 'sch-3',
      contract_id: 'cnt-zkf-2026-101',
      tranche_number: 3,
      nominal_value: '2000000.00',
      due_date: '2027-10-15',
      status: 'Pending',
      schedule_version: 1,
      amount_paid: '0.00'
    }
  ];

  const sampleCheque: ERPPDCRecord = {
    cheque_id: 'chq-9901',
    contract_id: 'cnt-zkf-2026-101',
    cheque_number: 'CHQ-882910',
    bank_name: 'CIB Egypt',
    drawer_name: 'Mahmoud El-Sayed',
    nominal_value: '1000000.00',
    due_date: '2026-07-15',
    status: 'In Safe'
  };

  const sampleTax: ERPTaxRecord = {
    tax_id: 'tax-rec-401',
    contract_id: 'cnt-zkf-2026-101',
    tax_type: 'Disposal 2.5% Case A',
    taxable_base: '5000000.00',
    tax_rate: '0.025',
    tax_amount: '125000.00',
    remittance_status: 'Pending',
    created_at: '2026-01-20T10:00:00Z'
  };

  const sampleAllocation: ERPCostAllocation = {
    allocation_id: 'alloc-2026-01',
    project_name: 'برج الأندلس ريزيدنس',
    total_incurred_wip: '28000000.00',
    total_sales_value: '50000000.00',
    rsv_factor: '0.560000',
    calculated_at: '2026-03-01T08:00:00Z'
  };

  const sampleRescission: ERPRescissionRecord = {
    rescission_id: 'resc-zkf-55',
    contract_id: 'cnt-zkf-2026-101',
    branch: 'Pre-Delivery',
    gross_contract_value: '5000000.00',
    total_cash_collected: '2000000.00',
    penalty_uncapped: '500000.00',
    penalty_retained: '500000.00',
    net_refund_liability: '1500000.00',
    unpaid_ar_cleared: '3000000.00',
    wip_cost_restored: '0.00',
    unit_state: 'Available',
    created_at: '2026-06-01T12:00:00Z'
  };

  const sampleJournalEntry: ERPJournalEntry = {
    entry_id: 'je-2026-880',
    entry_number: 'JE-2026-880',
    entry_date: '2026-04-10',
    period_id: 'period-2026-04',
    description: 'تحصيل القسط رقم 1 كاش باليد - عقد رقم ZKF-2026-101',
    source_module: 'PDC',
    created_by: 'FIN-OS Automated System',
    created_at: '2026-04-10T11:00:00Z',
    is_locked: true,
    lines: [
      {
        line_id: 'l1',
        entry_id: 'je-2026-880',
        line_number: 1,
        account_code: '101000',
        debit_amount: '1000000.00',
        credit_amount: '0.00'
      },
      {
        line_id: 'l2',
        entry_id: 'je-2026-880',
        line_number: 2,
        account_code: '104000',
        debit_amount: '0.00',
        credit_amount: '1000000.00'
      }
    ]
  };

  describe('1. Centered Modal Architecture & Exports Verification', () => {
    it('exports ZFInspectorDrawer and ZFInspectorModal alias', () => {
      assert.ok(ZFInspectorDrawer, 'ZFInspectorDrawer must be defined');
      assert.ok(ZFInspectorModal, 'ZFInspectorModal alias must be defined');
      assert.strictEqual(ZFInspectorDrawer, ZFInspectorModal, 'ZFInspectorModal must equal ZFInspectorDrawer');
    });

    it('renders centered modal with role="dialog", aria-modal="true", and maxWidth="850px"', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFInspectorDrawer, {
          payload: {
            type: 'contract',
            contract: sampleContract,
            schedules: sampleSchedules
          },
          onClose: () => {},
          isAr: true
        })
      );

      assert.ok(html.includes('role="dialog"'), 'Must contain role="dialog"');
      assert.ok(html.includes('aria-modal="true"'), 'Must contain aria-modal="true"');
      assert.ok(html.includes('850px'), 'Modal card must enforce maxWidth="850px"');
      assert.ok(html.includes('dir="rtl"'), 'Modal must respect RTL directive');
    });

    it('does not render anything when payload is null', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFInspectorDrawer, {
          payload: null,
          onClose: () => {},
          isAr: true
        })
      );
      assert.strictEqual(html, '', 'Must render empty markup when payload is null');
    });

    it('purges legacy slide-over drawer wrapper artifacts', () => {
      const filePath = path.resolve(process.cwd(), 'src/components/admin/erp/ZFInspectorDrawer.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.ok(!content.includes('ZFDrawerShell'), 'Must NOT contain legacy ZFDrawerShell');
      assert.ok(content.includes('ZFModalShell'), 'Must contain modern ZFModalShell');
    });
  });

  describe('2. Contract Inspection Modal Canonical 4-Tier Blueprint', () => {
    it('renders Tier 1: Top Identity Ribbon with squircle icon, reference badge, and localized buyer', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFInspectorDrawer, {
          payload: {
            type: 'contract',
            contract: sampleContract,
            schedules: sampleSchedules
          },
          onClose: () => {},
          isAr: true
        })
      );

      assert.ok(html.includes('#ZKF-2026-101'), 'Must include contract reference badge');
      assert.ok(html.includes('محمود السيد'), 'Must localize buyer name to Arabic');
      assert.ok(html.includes('APT-402'), 'Must include unit code');
      assert.ok(html.includes('سارٍ ومنتظم'), 'Must render active status pill');
    });

    it('renders Tier 2: Executive 4-Metric Strip with tabular numbers and EGP currency', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFInspectorDrawer, {
          payload: {
            type: 'contract',
            contract: sampleContract,
            schedules: sampleSchedules
          },
          onClose: () => {},
          isAr: true
        })
      );

      assert.ok(html.includes('إجمالي قيمة التعاقد'), 'Metric 1 label present');
      assert.ok(html.includes('5,000,000.00 ج.م'), 'Metric 1 value formatted');
      assert.ok(html.includes('المحصل نقداً بالخزينة'), 'Metric 2 label present');
      assert.ok(html.includes('2,000,000.00 ج.م'), 'Metric 2 value formatted');
      assert.ok(html.includes('المتبقي كأقساط مجدولة'), 'Metric 3 label present');
      assert.ok(html.includes('3,000,000.00 ج.م'), 'Metric 3 value formatted');
      assert.ok(html.includes('موعد التسليم المقرر'), 'Metric 4 label present');
      assert.ok(html.includes('2026-12-31'), 'Metric 4 date formatted');
    });

    it('renders Tier 3: 2-Column Body (Right Specifications + Left Interactive Tranches)', () => {
      let paidInstallmentTriggered = false;
      const html = renderToStaticMarkup(
        React.createElement(ZFInspectorDrawer, {
          payload: {
            type: 'contract',
            contract: sampleContract,
            schedules: sampleSchedules
          },
          onClose: () => {},
          onPayInstallment: () => { paidInstallmentTriggered = true; },
          isAr: true
        })
      );

      // Right Column
      assert.ok(html.includes('بيانات التعاقد والوحدة'), 'Right column header present');
      assert.ok(html.includes('01012345678'), 'Buyer phone present');
      assert.ok(html.includes('أقساط مجدولة'), 'Payment plan localized');

      // Left Column
      assert.ok(html.includes('جدول الأقساط والتحصيل'), 'Left column header present');
      assert.ok(html.includes('قسط #2'), 'Tranche 2 present');
      assert.ok(html.includes('قسط #3'), 'Tranche 3 present');
      assert.ok(html.includes('تحصيل'), 'Inline collection action present for pending tranches');
    });

    it('renders Tier 4: Action Footer Toolbar with zero dead buttons', () => {
      let escalationOpened = false;
      let rescissionOpened = false;
      let supplementOpened = false;
      let closed = false;

      const html = renderToStaticMarkup(
        React.createElement(ZFInspectorDrawer, {
          payload: {
            type: 'contract',
            contract: sampleContract,
            schedules: sampleSchedules
          },
          onClose: () => { closed = true; },
          onOpenEscalation: () => { escalationOpened = true; },
          onOpenRescission: () => { rescissionOpened = true; },
          onOpenSupplement: () => { supplementOpened = true; },
          onPayInstallment: () => {},
          isAr: true
        })
      );

      assert.ok(html.includes('تحصيل القسط #2'), 'Primary collect due action button present');
      assert.ok(html.includes('طلب زيادة سعر'), 'Escalation secondary action button present');
      assert.ok(html.includes('فسخ العقد'), 'Rescission danger action button present');
      assert.ok(html.includes('إضافة ملحق'), 'Supplement action button present');
      assert.ok(html.includes('طباعة كشف الحساب'), 'Print action button present');
      assert.ok(html.includes('إغلاق الفاحص'), 'Close button present');
    });
  });

  describe('3. Cheque & PDC Instrument Inspection Blueprint', () => {
    it('renders 4-tier cheque layout with clearing status and bank settlement', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFInspectorDrawer, {
          payload: {
            type: 'cheque',
            cheque: sampleCheque,
            linkedContract: sampleContract
          },
          onClose: () => {},
          onUpdateChequeStatus: () => {},
          onInspectContract: () => {},
          isAr: true
        })
      );

      // Identity Ribbon
      assert.ok(html.includes('#CHQ-882910'), 'Cheque reference number present');
      assert.ok(html.includes('CIB Egypt'), 'Drawee bank present');
      assert.ok(html.includes('في عهدة الخزينة'), 'Cheque status pill present');

      // 4-Metric Strip
      assert.ok(html.includes('القيمة الاسمية للشيك'), 'Nominal value label present');
      assert.ok(html.includes('1,000,000.00 ج.م'), 'Cheque value formatted');
      assert.ok(html.includes('تاريخ الاستحقاق'), 'Maturity label present');
      assert.ok(html.includes('2026-07-15'), 'Maturity date present');

      // Left Column Clearing Workflow
      assert.ok(html.includes('مسار التحصيل والقيد المحاسبي'), 'Workflow title present');
      assert.ok(html.includes('101000 الخزينة الموحدة'), 'Debit 101000 safe account present');
      assert.ok(html.includes('105000 أوراق القبض'), 'Credit 105000 notes receivable present');

      // Actions Footer
      assert.ok(html.includes('إيداع برسم التحصيل البنكي'), 'Deposit at bank action present');
      assert.ok(html.includes('تسجيل تحصيل فوري بالخزينة'), 'Instant safe settlement action present');
      assert.ok(html.includes('فتح ملف العقد'), 'Linked contract jump button present');
    });
  });

  describe('4. Tax Record Inspection Blueprint', () => {
    it('renders 4-tier tax layout with ETA authority, rates, and remittance workflow', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFInspectorDrawer, {
          payload: {
            type: 'tax',
            tax: sampleTax,
            linkedContract: sampleContract
          },
          onClose: () => {},
          onRemitTax: () => {},
          isAr: true
        })
      );

      // Identity Ribbon
      assert.ok(html.includes('#tax-rec-40'), 'Tax record ID badge present');
      assert.ok(html.includes('مصلحة الضرائب المصرية (ETA)'), 'ETA authority present');
      assert.ok(html.includes('مستحق التوريد'), 'Pending remittance pill present');

      // 4-Metric Strip
      assert.ok(html.includes('الوعاء الضريبي الخاضع'), 'Taxable base label present');
      assert.ok(html.includes('5,000,000.00 ج.م'), 'Taxable base value present');
      assert.ok(html.includes('النسبة الضريبية المقررة'), 'Tax rate label present');
      assert.ok(html.includes('2.5%'), '2.5% rate present');
      assert.ok(html.includes('قيمة الضريبة المستحقة'), 'Tax due label present');
      assert.ok(html.includes('125,000.00 ج.م'), 'Tax amount present');

      // Double-Entry Remittance
      assert.ok(html.includes('Dr 205000 مصلحة الضرائب - التزامات وخصم'), 'Statutory liability account present');
      assert.ok(html.includes('سداد وتوريد للمصلحة (ETA)'), 'Remit action button present');
    });
  });

  describe('5. Relative Sales Value (RSV) Allocation Blueprint', () => {
    it('renders 4-tier RSV layout with cost breakdown, factor, and simulator', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFInspectorDrawer, {
          payload: {
            type: 'rsv',
            allocation: sampleAllocation
          },
          onClose: () => {},
          onNavigateToTab: () => {},
          isAr: true
        })
      );

      // Identity Ribbon
      assert.ok(html.includes('برج الأندلس ريزيدنس'), 'Project name present');
      assert.ok(html.includes('معتمد وموثق بدفتر اليومية'), 'Audited status pill present');

      // 4-Metric Strip
      assert.ok(html.includes('إجمالي المبيعات التعاقدية'), 'Total sales label present');
      assert.ok(html.includes('50,000,000.00 ج.م'), 'Sales value present');
      assert.ok(html.includes('إجمالي تكاليف التنفيذ (WIP)'), 'WIP label present');
      assert.ok(html.includes('28,000,000.00 ج.م'), 'WIP value present');
      assert.ok(html.includes('56.00%'), 'RSV Factor percentage present');
      assert.ok(html.includes('44.00%'), 'Expected gross margin percentage present');

      // Simulator & Accounts
      assert.ok(html.includes('150000 Construction WIP'), 'Relieved WIP account present');
      assert.ok(html.includes('501000 Cost of Goods Sold'), 'Relieved COGS account present');
      assert.ok(html.includes('محاكي تكلفة وأرباح الوحدة'), 'Unit simulator section present');
    });
  });

  describe('6. Rescission Settlement Blueprint', () => {
    it('renders 4-tier rescission layout with 10% penalty math and refund liability', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFInspectorDrawer, {
          payload: {
            type: 'rescission',
            rescission: sampleRescission
          },
          onClose: () => {},
          onNavigateToTab: () => {},
          isAr: true
        })
      );

      // Identity Ribbon
      assert.ok(html.includes('#resc-zkf'), 'Rescission ID badge present');
      assert.ok(html.includes('فسخ قبل التسليم (مسار ١)'), 'Branch 1 status pill present');

      // 4-Metric Strip
      assert.ok(html.includes('إجمالي ثمن الشقة الأصلي بالعقد'), 'Original gross value label present');
      assert.ok(html.includes('5,000,000.00 ج.م'), 'Original value present');
      assert.ok(html.includes('إجمالي المحصل نقداً'), 'Cash collected label present');
      assert.ok(html.includes('2,000,000.00 ج.م'), 'Cash collected value present');
      assert.ok(html.includes('الغرامة المحتجزة (10%)'), 'Penalty retained label present');
      assert.ok(html.includes('500,000.00 ج.م'), '10% penalty retained value present');
      assert.ok(html.includes('صافي التزام الرد للعميل'), 'Net refund liability label present');
      assert.ok(html.includes('1,500,000.00 ج.م'), 'Net refund value present');

      // Financial Equation
      assert.ok(html.includes('معادلة التسوية المالية للفسخ'), 'Equation section present');
      assert.ok(html.includes('402000 أرباح وغرامات الفسخ التعاقدي'), 'Forfeiture account present');
      assert.ok(html.includes('206200 التزامات رد مبالغ العملاء'), 'Refund account present');
    });
  });

  describe('7. Double-Entry Journal Entry Blueprint', () => {
    it('renders clean double-entry ledger table with balanced totals', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFInspectorDrawer, {
          payload: {
            type: 'journal',
            entry: sampleJournalEntry
          },
          onClose: () => {},
          onNavigateToTab: () => {},
          isAr: true
        })
      );

      // Identity Ribbon
      assert.ok(html.includes('#JE-2026-880'), 'Entry number present');
      assert.ok(html.includes('مقفل ومعتمد بالدفتر'), 'Posted & audited pill present');

      // 4-Metric Strip
      assert.ok(html.includes('إجمالي الجانب المدين (Debit)'), 'Debit label present');
      assert.ok(html.includes('1,000,000.00 ج.م'), 'Debit total formatted');
      assert.ok(html.includes('إجمالي الجانب الدائن (Credit)'), 'Credit label present');
      assert.ok(html.includes('1,000,000.00 ج.م'), 'Credit total formatted');
      assert.ok(html.includes('متوازن ٠.٠٠'), 'Balance status present');

      // Double-Entry Ledger Lines
      assert.ok(html.includes('101000'), 'Account code 101000 present');
      assert.ok(html.includes('خزينة النقدية الرئيسية'), 'Account name 101000 present from CANONICAL_COA');
      assert.ok(html.includes('104000'), 'Account code 104000 present');
      assert.ok(html.includes('أوراق قبض'), 'Account name 104000 present');

      // Footer
      assert.ok(html.includes('الانتقال إلى دفتر الأستاذ العام'), 'Ledger jump action button present');
      assert.ok(html.includes('طباعة سند القيد'), 'Print journal voucher action button present');
    });
  });

  describe('8. Zero Dead Buttons & Safe Fallbacks', () => {
    it('gracefully handles missing optional callbacks without throwing errors', () => {
      assert.doesNotThrow(() => {
        renderToStaticMarkup(
          React.createElement(ZFInspectorDrawer, {
            payload: {
              type: 'contract',
              contract: sampleContract,
              schedules: sampleSchedules
            },
            onClose: () => {}
            // All other callbacks omitted
          })
        );
      });
    });

    it('gracefully renders journal inspection when entry is passed as journalEntry in payload', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFInspectorDrawer, {
          payload: {
            type: 'journal',
            journalEntry: sampleJournalEntry
          },
          onClose: () => {},
          isAr: true
        })
      );

      assert.ok(html.includes('#JE-2026-880'), 'Correctly resolves entry from journalEntry property');
    });

    it('gracefully renders journal inspection with fallback shape when rawEntry was undefined', () => {
      const fallbackEntry = {
        entry_number: 'TX-FALLBACK-101',
        description: 'دفعة تحصيل بدون قيد أصلي',
        posting_date: '2026-09-29',
        lines: []
      };

      let html = '';
      assert.doesNotThrow(() => {
        html = renderToStaticMarkup(
          React.createElement(ZFInspectorDrawer, {
            payload: {
              type: 'journal',
              entry: fallbackEntry as any,
              journalEntry: fallbackEntry as any,
              amount: '50000.00',
              title: 'دفعة تحصيل بدون قيد أصلي',
              party: 'عميل نقدي'
            },
            onClose: () => {},
            isAr: true
          })
        );
      });

      assert.ok(html.includes('#TX-FALLBACK-101'), 'Must render entry number from fallback shape');
      assert.ok(html.includes('دفعة تحصيل بدون قيد أصلي'), 'Must render description from fallback shape');
      assert.ok(html.includes('عميل نقدي'), 'Must render counterparty');
    });

    it('gracefully renders journal inspection when entry is completely undefined without throwing TypeError', () => {
      let html = '';
      assert.doesNotThrow(() => {
        html = renderToStaticMarkup(
          React.createElement(ZFInspectorDrawer, {
            payload: {
              type: 'journal',
              amount: '1250.00',
              title: 'حركة يومية سريعة'
            },
            onClose: () => {},
            isAr: true
          })
        );
      });

      assert.ok(html.includes('#JE-AUTO'), 'Must fallback to #JE-AUTO when entry is undefined');
      assert.ok(html.includes('حركة يومية سريعة'), 'Must render fallback title');
    });
  });

  describe('9. FIN-OS ERP Design System Invariants & CSS Classes', () => {
    it('verifies that ZFWorkstationShell.module.css includes all inspect classes', () => {
      const cssPath = path.resolve(process.cwd(), 'src/components/admin/erp/v2/ZFWorkstationShell.module.css');
      const css = fs.readFileSync(cssPath, 'utf-8');

      assert.ok(css.includes('.inspectModalShell'), 'Must contain .inspectModalShell');
      assert.ok(css.includes('.inspectIdentityRibbon'), 'Must contain .inspectIdentityRibbon');
      assert.ok(css.includes('.inspectSquircleIcon'), 'Must contain .inspectSquircleIcon');
      assert.ok(css.includes('.inspectCodeBadge'), 'Must contain .inspectCodeBadge');
      assert.ok(css.includes('.inspectMetricsGrid'), 'Must contain .inspectMetricsGrid');
      assert.ok(css.includes('.inspectMetricCard'), 'Must contain .inspectMetricCard');
      assert.ok(css.includes('.inspectBodyColumns'), 'Must contain .inspectBodyColumns');
      assert.ok(css.includes('.inspectColumn'), 'Must contain .inspectColumn');
      assert.ok(css.includes('.inspectInstallmentsList'), 'Must contain .inspectInstallmentsList');
      assert.ok(css.includes('.inspectActionFooter'), 'Must contain .inspectActionFooter');
    });
  });
});
