import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { D } from '../math';
import {
  type CashMovementTransaction,
  formatNumberWithCommas,
  formatEGPInteger,
  formatTime12h,
  computeUpcomingDues,
  buildTransactionInspectionPayload
} from '../operationsStreamFilters';
import { createInitialERPState } from '../store';
import { getAvailableCash } from '../canonicalMetrics';
import type { ERPPDCRecord, ERPPropertyCostItem } from '../types';

// Register .css and .module.css handlers for node:test SSR
const cjsRequire = createRequire(import.meta.url);
cjsRequire.extensions['.css'] = (m: any) => { m.exports = {}; };
cjsRequire.extensions['.module.css'] = (m: any) => { m.exports = {}; };

describe('Daily Operations & Cash Flow Workstation Revamp Suite', () => {
  describe('1. Integer Number Formatting (formatNumberWithCommas)', () => {
    it('formats zero without decimals or cents', () => {
      assert.strictEqual(formatNumberWithCommas(0), '0');
      assert.strictEqual(formatNumberWithCommas('0'), '0');
      assert.strictEqual(formatNumberWithCommas(D(0)), '0');
    });

    it('formats integers with thousands commas and zero cents', () => {
      assert.strictEqual(formatNumberWithCommas(1000), '1,000');
      assert.strictEqual(formatNumberWithCommas(3600000), '3,600,000');
      assert.strictEqual(formatNumberWithCommas('100000000'), '100,000,000');
      assert.strictEqual(formatNumberWithCommas(D(103600000)), '103,600,000');
    });

    it('rounds fractional numbers to nearest integer and removes cents completely', () => {
      assert.strictEqual(formatNumberWithCommas(1234.49), '1,234');
      assert.strictEqual(formatNumberWithCommas(1234.50), '1,235');
      assert.strictEqual(formatNumberWithCommas(3599999.99), '3,600,000');
      assert.strictEqual(formatNumberWithCommas(D('1234567.89')), '1,234,568');
    });

    it('formats negative values accurately with minus sign and commas', () => {
      assert.strictEqual(formatNumberWithCommas(-5000), '-5,000');
      assert.strictEqual(formatNumberWithCommas(D(-750000.4)), '-750,000');
      assert.strictEqual(formatNumberWithCommas(D(-750000.6)), '-750,001');
    });

    it('handles null, undefined, empty, and invalid inputs gracefully', () => {
      assert.strictEqual(formatNumberWithCommas(null as any), '0');
      assert.strictEqual(formatNumberWithCommas(undefined as any), '0');
      assert.strictEqual(formatNumberWithCommas(''), '0');
      assert.strictEqual(formatNumberWithCommas('invalid'), '0');
    });

    it('guarantees that output never contains a decimal dot', () => {
      const samples = [0, 0.00, 10.5, 3600000.75, -450.99, '12345.67'];
      for (const sample of samples) {
        const formatted = formatNumberWithCommas(sample);
        assert.strictEqual(formatted.includes('.'), false, `Output "${formatted}" must not contain decimal dot`);
      }
    });
  });

  describe('2. Currency Integer Formatting (formatEGPInteger)', () => {
    it('formats amounts in Arabic with ج.م suffix and zero cents', () => {
      assert.strictEqual(formatEGPInteger(D(3600000), true), '3,600,000 ج.م');
      assert.strictEqual(formatEGPInteger(D(100000000), true), '100,000,000 ج.م');
      assert.strictEqual(formatEGPInteger(0, true), '0 ج.م');
    });

    it('formats amounts in English with EGP suffix and zero cents', () => {
      assert.strictEqual(formatEGPInteger(D(3600000), false), '3,600,000 EGP');
      assert.strictEqual(formatEGPInteger(D(100000000), false), '100,000,000 EGP');
      assert.strictEqual(formatEGPInteger(0, false), '0 EGP');
    });

    it('rounds decimals before appending currency suffix', () => {
      assert.strictEqual(formatEGPInteger(D('3600000.49'), true), '3,600,000 ج.م');
      assert.strictEqual(formatEGPInteger(D('3600000.51'), true), '3,600,001 ج.م');
    });
  });

  describe('3. 12-Hour Time Conversion (formatTime12h)', () => {
    it('converts morning military times to 12-hour format with AM/ص', () => {
      assert.strictEqual(formatTime12h('09:05', true), '09:05 ص');
      assert.strictEqual(formatTime12h('09:05', false), '09:05 AM');
      assert.strictEqual(formatTime12h('11:00', true), '11:00 ص');
      assert.strictEqual(formatTime12h('11:00', false), '11:00 AM');
    });

    it('converts afternoon/evening military times to 12-hour format with PM/م', () => {
      assert.strictEqual(formatTime12h('14:30', true), '02:30 م');
      assert.strictEqual(formatTime12h('14:30', false), '02:30 PM');
      assert.strictEqual(formatTime12h('20:15', true), '08:15 م');
      assert.strictEqual(formatTime12h('20:15', false), '08:15 PM');
      assert.strictEqual(formatTime12h('23:59', true), '11:59 م');
      assert.strictEqual(formatTime12h('23:59', false), '11:59 PM');
    });

    it('handles noon (12:00) and midnight (00:00) edge cases accurately', () => {
      assert.strictEqual(formatTime12h('12:00', true), '12:00 م');
      assert.strictEqual(formatTime12h('12:00', false), '12:00 PM');
      assert.strictEqual(formatTime12h('00:00', true), '12:00 ص');
      assert.strictEqual(formatTime12h('00:00', false), '12:00 AM');
      assert.strictEqual(formatTime12h('00:30', true), '12:30 ص');
      assert.strictEqual(formatTime12h('00:30', false), '12:30 AM');
    });

    it('gracefully handles empty, missing, or malformed time strings', () => {
      assert.strictEqual(formatTime12h('', true), '');
      assert.strictEqual(formatTime12h(null as any, true), '');
      assert.strictEqual(formatTime12h(undefined as any, false), '');
      assert.strictEqual(formatTime12h('invalid-time', true), 'invalid-time');
    });
  });

  describe('4. Transaction Data Model & Operational Metadata', () => {
    it('supports reference_number and payment_method fields on CashMovementTransaction', () => {
      const tx: CashMovementTransaction = {
        id: 'tx-revamp-1',
        date: '2026-09-19',
        timeStr: '14:30',
        fullDateTimeStr: '2026-09-19T14:30:00Z',
        type: 'COLLECTION',
        typeLabelAr: 'تحصيل قسط',
        typeLabelEn: 'Collection',
        description: 'دفعة مقدمة - وحدة 101',
        counterparty: 'أحمد محمود',
        accountLabel: 'الخزينة الرئيسية (101000)',
        accountCode: '101000',
        reference_number: 'DP-REC-2026-001',
        payment_method: 'سداد نقدي',
        amount: D(3600000),
        direction: 'IN',
        status: 'COMPLETED',
        statusLabelAr: 'محصل',
        statusLabelEn: 'Collected',
        category: 'collection'
      };

      assert.strictEqual(tx.reference_number, 'DP-REC-2026-001');
      assert.strictEqual(tx.payment_method, 'سداد نقدي');
    });
  });

  describe('5. Double-Entry Treasury Cash Reconciliation in ERP Store', () => {
    it('correctly allocates contract down payment to Safe Vault (101000) eliminating zero balance', () => {
      const state = createInitialERPState();
      const cashReport = getAvailableCash(state.journalEntries);

      // Verify Safe Cash (101000) is positive and equals 3,600,000 EGP down payment
      assert.strictEqual(cashReport.safeCash.eq(D('3600000.00')), true, `Expected Safe Cash 3.6M, got ${cashReport.safeCash.toFixed(2)}`);

      // Verify Commercial Bank (102000) holds 100,000,000 EGP partner capital
      assert.strictEqual(cashReport.bankCash.eq(D('100000000.00')), true, `Expected Bank Cash 100M, got ${cashReport.bankCash.toFixed(2)}`);

      // Verify Total Available Liquid Cash equals sum of 101000 and 102000 (103,600,000 EGP)
      assert.strictEqual(cashReport.totalCash.eq(D('103600000.00')), true, `Expected Total Liquid 103.6M, got ${cashReport.totalCash.toFixed(2)}`);
    });
  });

  describe('7. Upcoming Maturing Dues & Collections Engine (computeUpcomingDues)', () => {
    it('handles null, undefined, and empty arrays gracefully', () => {
      const resNull = computeUpcomingDues(null, null, true, '2026-09-28');
      assert.strictEqual(resNull.items.length, 0);
      assert.strictEqual(resNull.totalCount, 0);
      assert.strictEqual(resNull.totalIn.eq(0), true);
      assert.strictEqual(resNull.totalOut.eq(0), true);

      const resEmpty = computeUpcomingDues([], [], false, '2026-09-28');
      assert.strictEqual(resEmpty.items.length, 0);
      assert.strictEqual(resEmpty.totalCount, 0);
    });

    it('filters out Cleared, Void, and Bounced PDCs while retaining In Safe and Deposited', () => {
      const mockPDCs: ERPPDCRecord[] = [
        {
          cheque_id: 'pdc-safe',
          contract_id: 'c-1',
          cheque_number: '1001',
          bank_name: 'CIB',
          drawer_name: 'عميل أ',
          nominal_value: '50000',
          due_date: '2026-10-01',
          status: 'In Safe'
        },
        {
          cheque_id: 'pdc-dep',
          contract_id: 'c-2',
          cheque_number: '1002',
          bank_name: 'NBE',
          drawer_name: 'عميل ب',
          nominal_value: '75000',
          due_date: '2026-10-02',
          status: 'Deposited'
        },
        {
          cheque_id: 'pdc-cleared',
          contract_id: 'c-3',
          cheque_number: '1003',
          bank_name: 'QNB',
          drawer_name: 'عميل ج',
          nominal_value: '60000',
          due_date: '2026-09-20',
          status: 'Cleared'
        },
        {
          cheque_id: 'pdc-void',
          contract_id: 'c-4',
          cheque_number: '1004',
          bank_name: 'Alex Bank',
          drawer_name: 'عميل د',
          nominal_value: '30000',
          due_date: '2026-09-22',
          status: 'Void'
        },
        {
          cheque_id: 'pdc-bounced',
          contract_id: 'c-5',
          cheque_number: '1005',
          bank_name: 'BM',
          drawer_name: 'عميل هـ',
          nominal_value: '40000',
          due_date: '2026-09-25',
          status: 'Bounced'
        }
      ];

      const res = computeUpcomingDues(mockPDCs, [], true, '2026-09-28');
      assert.strictEqual(res.totalCount, 2);
      assert.strictEqual(res.items.length, 2);
      assert.strictEqual(res.items.some(x => x.id === 'pdc-pdc-safe'), true);
      assert.strictEqual(res.items.some(x => x.id === 'pdc-pdc-dep'), true);
      assert.strictEqual(res.items.some(x => x.id === 'pdc-pdc-cleared'), false);
      assert.strictEqual(res.items.some(x => x.id === 'pdc-pdc-void'), false);
      assert.strictEqual(res.items.some(x => x.id === 'pdc-pdc-bounced'), false);
    });

    it('correctly flags PDC direction: IN for client receivables and OUT for supplier payables', () => {
      const mockPDCs: any[] = [
        {
          cheque_id: 'pdc-rec',
          contract_id: 'c-1',
          cheque_number: '2001',
          bank_name: 'CIB',
          drawer_name: 'شركة الاستثمار',
          nominal_value: '120000',
          due_date: '2026-10-05',
          status: 'In Safe'
        },
        {
          cheque_id: 'pdc-pay',
          contract_id: 'c-2',
          cheque_number: '2002',
          bank_name: 'CIB',
          drawer_name: 'مقاول الخرسانة',
          nominal_value: '80000',
          due_date: '2026-10-06',
          status: 'In Safe',
          type: 'Payable'
        }
      ];

      const res = computeUpcomingDues(mockPDCs, [], true, '2026-09-28');
      const inItem = res.items.find(x => x.id === 'pdc-pdc-rec');
      const outItem = res.items.find(x => x.id === 'pdc-pdc-pay');

      assert.strictEqual(inItem?.direction, 'IN');
      assert.strictEqual(inItem?.typeLabelAr, 'شيك وارد');
      assert.strictEqual(outItem?.direction, 'OUT');
      assert.strictEqual(outItem?.typeLabelAr, 'شيك صادر');
    });

    it('filters out contractor installments with status PAID or remaining balance <= 0', () => {
      const mockCosts = [
        {
          item_id: 'cost-1',
          property_id: 'prop-1',
          item_name_ar: 'بند حديد تسليح',
          category: 'civil_structure',
          payment_term: 'DOWN_PAYMENT_INSTALLMENTS',
          total_cost_egp: '300000',
          supplier_contractor: 'شركة حديد مصر',
          payable_installments: [
            {
              installment_id: 'inst-paid',
              cost_item_id: 'cost-1',
              installment_number: 1,
              title_ar: 'دفعة 1 مسددة بالكامل',
              amount_egp: '100000',
              paid_amount_egp: '100000',
              due_date: '2026-09-15',
              status: 'PAID'
            },
            {
              installment_id: 'inst-zero-rem',
              cost_item_id: 'cost-1',
              installment_number: 2,
              title_ar: 'دفعة مسددة بدون تحديث حالة',
              amount_egp: '100000',
              paid_amount_egp: '100000',
              due_date: '2026-09-20',
              status: 'PARTIALLY_PAID'
            },
            {
              installment_id: 'inst-overpaid',
              cost_item_id: 'cost-1',
              installment_number: 3,
              title_ar: 'دفعة بها زيادة سداد',
              amount_egp: '50000',
              paid_amount_egp: '52000',
              due_date: '2026-09-22',
              status: 'PENDING'
            },
            {
              installment_id: 'inst-valid',
              cost_item_id: 'cost-1',
              installment_number: 4,
              title_ar: 'دفعة مستحقة حقيقية',
              amount_egp: '50000',
              paid_amount_egp: '0',
              due_date: '2026-10-15',
              status: 'PENDING'
            }
          ]
        }
      ];

      const res = computeUpcomingDues([], mockCosts as any, true, '2026-09-28');
      assert.strictEqual(res.totalCount, 1);
      assert.strictEqual(res.items.length, 1);
      assert.strictEqual(res.items[0].id, 'inst-cost-1-inst-valid');
      assert.strictEqual(res.items[0].amount.eq(50000), true);
    });

    it('accurately calculates remaining balance for partially paid installments', () => {
      const mockCosts = [
        {
          item_id: 'cost-partial',
          property_id: 'prop-1',
          item_name_ar: 'أعمال سيراميك وتشطيب',
          category: 'finishing_interior',
          payment_term: 'DOWN_PAYMENT_INSTALLMENTS',
          total_cost_egp: '200000',
          supplier_contractor: 'مقاول تشطيبات',
          payable_installments: [
            {
              installment_id: 'inst-part',
              cost_item_id: 'cost-partial',
              installment_number: 1,
              title_ar: 'مستخلص تشطيب دور ثاني',
              amount_egp: '150000',
              paid_amount_egp: '45000',
              due_date: '2026-10-10',
              status: 'PENDING'
            }
          ]
        }
      ];

      const res = computeUpcomingDues([], mockCosts as any, true, '2026-09-28');
      assert.strictEqual(res.totalCount, 1);
      assert.strictEqual(res.items[0].amount.eq(105000), true, 'Remaining balance must be 150000 - 45000 = 105000');
    });

    it('sorts upcoming items by due date ascending and slices top 4 items for widget', () => {
      const mockPDCs: ERPPDCRecord[] = [
        { cheque_id: 'p-5', contract_id: 'c', cheque_number: '5', bank_name: 'B', drawer_name: 'D', nominal_value: '1000', due_date: '2026-10-05', status: 'In Safe' },
        { cheque_id: 'p-1', contract_id: 'c', cheque_number: '1', bank_name: 'B', drawer_name: 'D', nominal_value: '1000', due_date: '2026-09-29', status: 'In Safe' },
        { cheque_id: 'p-3', contract_id: 'c', cheque_number: '3', bank_name: 'B', drawer_name: 'D', nominal_value: '1000', due_date: '2026-10-01', status: 'In Safe' },
        { cheque_id: 'p-6', contract_id: 'c', cheque_number: '6', bank_name: 'B', drawer_name: 'D', nominal_value: '1000', due_date: '2026-10-10', status: 'In Safe' },
        { cheque_id: 'p-2', contract_id: 'c', cheque_number: '2', bank_name: 'B', drawer_name: 'D', nominal_value: '1000', due_date: '2026-09-30', status: 'In Safe' },
        { cheque_id: 'p-4', contract_id: 'c', cheque_number: '4', bank_name: 'B', drawer_name: 'D', nominal_value: '1000', due_date: '2026-10-02', status: 'In Safe' }
      ];

      const res = computeUpcomingDues(mockPDCs, [], true, '2026-09-28');
      assert.strictEqual(res.totalCount, 6, 'Total count must reflect all 6 eligible items');
      assert.strictEqual(res.items.length, 4, 'Widget items must slice top 4 earliest dues');
      assert.strictEqual(res.items[0].dueDate, '2026-09-29');
      assert.strictEqual(res.items[1].dueDate, '2026-09-30');
      assert.strictEqual(res.items[2].dueDate, '2026-10-01');
      assert.strictEqual(res.items[3].dueDate, '2026-10-02');
    });

    it('correctly sums totalIn and totalOut across all eligible upcoming dues', () => {
      const mockPDCs: any[] = [
        { cheque_id: 'in-1', contract_id: 'c', cheque_number: '1', bank_name: 'B', drawer_name: 'D', nominal_value: '300000', due_date: '2026-10-01', status: 'In Safe' },
        { cheque_id: 'in-2', contract_id: 'c', cheque_number: '2', bank_name: 'B', drawer_name: 'D', nominal_value: '200000', due_date: '2026-10-02', status: 'Deposited' },
        { cheque_id: 'out-1', contract_id: 'c', cheque_number: '3', bank_name: 'B', drawer_name: 'D', nominal_value: '150000', due_date: '2026-10-03', status: 'In Safe', type: 'Payable' }
      ];
      const mockCosts = [
        {
          item_id: 'cost-out',
          property_id: 'p-1',
          item_name_ar: 'أعمال خرسانة',
          category: 'civil_structure',
          payment_term: 'DOWN_PAYMENT_INSTALLMENTS',
          total_cost_egp: '100000',
          supplier_contractor: 'مقاول',
          payable_installments: [
            {
              installment_id: 'i-1',
              cost_item_id: 'cost-out',
              installment_number: 1,
              title_ar: 'دفعة',
              amount_egp: '50000',
              paid_amount_egp: '10000',
              due_date: '2026-10-04',
              status: 'PENDING'
            }
          ]
        }
      ];

      const res = computeUpcomingDues(mockPDCs, mockCosts as any, true, '2026-09-28');
      // Inflows: 300,000 + 200,000 = 500,000
      assert.strictEqual(res.totalIn.eq(500000), true, `Expected totalIn 500,000, got ${res.totalIn.toString()}`);
      // Outflows: 150,000 (payable PDC) + 40,000 (50k - 10k remaining) = 190,000
      assert.strictEqual(res.totalOut.eq(190000), true, `Expected totalOut 190,000, got ${res.totalOut.toString()}`);
    });
  });

  describe('8. Modal & Inspection Runtime Safety Invariants', () => {
    it('asserts PartnerPayoutModal.tsx has no hooks declared after any early return (if (!isOpen))', () => {
      const modalPath = path.resolve(process.cwd(), 'src/components/admin/erp/v2/modals/PartnerPayoutModal.tsx');
      const modalSource = fs.readFileSync(modalPath, 'utf8');

      // 1. Verify targetPeriod useMemo is declared
      const targetPeriodIndex = modalSource.indexOf('const targetPeriod = useMemo');
      assert.ok(targetPeriodIndex > 0, 'PartnerPayoutModal must declare targetPeriod useMemo');

      // 2. Ensure targetPeriod useMemo is declared before any return or early exit
      const earlyReturnMatch = modalSource.match(/if\s*\(!isOpen\)\s*return/);
      if (earlyReturnMatch) {
        const earlyReturnIndex = modalSource.indexOf(earlyReturnMatch[0]);
        assert.ok(
          targetPeriodIndex < earlyReturnIndex,
          'targetPeriod useMemo must be declared BEFORE any if (!isOpen) early return'
        );
      } else {
        // Pre-hook early return is eliminated completely because ZFModalShell manages isOpen internally
        const returnIndex = modalSource.indexOf('return (');
        assert.ok(targetPeriodIndex < returnIndex, 'targetPeriod useMemo must be declared before component JSX return');
      }

      // 3. Scan all hook invocations and ensure none appear after any early return
      const hookRegex = /\b(useState|useEffect|useMemo|useCallback)\b/g;
      let hookMatch: RegExpExecArray | null;
      const hookPositions: number[] = [];
      while ((hookMatch = hookRegex.exec(modalSource)) !== null) {
        hookPositions.push(hookMatch.index);
      }

      if (earlyReturnMatch) {
        const earlyReturnIndex = modalSource.indexOf(earlyReturnMatch[0]);
        for (const pos of hookPositions) {
          assert.ok(pos < earlyReturnIndex, 'No React hook can be declared after if (!isOpen) early return');
        }
      }

      // 4. Assert premature if (!isOpen) return null; does not exist before targetPeriod
      assert.strictEqual(
        modalSource.includes('if (!isOpen) return null;\n\n  const effectivePartnerName'),
        false,
        'Premature if (!isOpen) return null before effectivePartnerName must be removed'
      );
    });

    it('renders PartnerPayoutModal with isOpen=false and isOpen=true without hook order violation or DOM errors', async () => {
      const { PartnerPayoutModal } = await import('@/components/admin/erp/v2/modals/PartnerPayoutModal');

      const mockPartners = [
        {
          partnerName: 'مهندس زكريا فريد',
          roleTitleAr: 'المطور الرئيسي والمالك',
          roleTitleEn: 'Lead Developer & Owner',
          netCurrentBalance: '15000000',
          totalContributedCapital: '50000000',
          totalCollectionsShare: '30000000',
          totalDistributionsPaid: '15000000',
          isPermanent: true,
          phone: '01000000000'
        }
      ];

      // 1. Render closed (must execute all top-level hooks and return null via ZFModalShell)
      let htmlClosed = '';
      assert.doesNotThrow(() => {
        htmlClosed = renderToStaticMarkup(
          React.createElement(PartnerPayoutModal, {
            isOpen: false,
            onClose: () => {},
            partners: mockPartners as any,
            onConfirmPayout: async () => {}
          })
        );
      }, 'Rendering PartnerPayoutModal with isOpen=false must not throw');
      assert.strictEqual(htmlClosed, '', 'Closed modal must render empty string');

      // 2. Render open (must execute all identical hooks without violation and render modal markup)
      let htmlOpen = '';
      assert.doesNotThrow(() => {
        htmlOpen = renderToStaticMarkup(
          React.createElement(PartnerPayoutModal, {
            isOpen: true,
            onClose: () => {},
            partners: mockPartners as any,
            onConfirmPayout: async () => {}
          })
        );
      }, 'Rendering PartnerPayoutModal with isOpen=true must not throw');
      assert.ok(htmlOpen.length > 0, 'Open modal must render HTML content');
      assert.ok(htmlOpen.includes('مهندس زكريا فريد'), 'Must render partner name');

      // 3. Render open with empty partners list to verify boundary safety
      let htmlEmpty = '';
      assert.doesNotThrow(() => {
        htmlEmpty = renderToStaticMarkup(
          React.createElement(PartnerPayoutModal, {
            isOpen: true,
            onClose: () => {},
            partners: [] as any,
            onConfirmPayout: async () => {}
          })
        );
      }, 'Rendering PartnerPayoutModal with empty partners must not throw');
      assert.ok(htmlEmpty.length > 0, 'Open modal with empty partners must render safely');
    });

    it('safely builds inspection payload when amount is missing, zero, or negative', () => {
      // Missing amount
      const txMissingAmount: any = {
        id: 'TX-ZERO-AMT',
        date: '2026-09-29',
        type: 'TRANSFER',
        description: 'تحويل بنكي بدون مبلغ',
        counterparty: 'البنك التجاري',
        amount: undefined
      };
      const p1 = buildTransactionInspectionPayload(txMissingAmount);
      assert.strictEqual(p1.amount, '0.00', 'Missing amount must safely fallback to 0.00');

      // Zero amount
      const txZeroAmount: CashMovementTransaction = {
        id: 'TX-0',
        date: '2026-09-29',
        timeStr: '',
        fullDateTimeStr: '',
        type: 'COLLECTION',
        typeLabelAr: '',
        typeLabelEn: '',
        description: 'صفر',
        counterparty: '',
        accountLabel: '',
        accountCode: '',
        amount: D(0),
        direction: 'IN',
        status: 'COMPLETED',
        statusLabelAr: '',
        statusLabelEn: '',
        category: 'collection'
      };
      const p2 = buildTransactionInspectionPayload(txZeroAmount);
      assert.strictEqual(p2.amount, '0.00', 'Zero amount must be 0.00');

      // Negative amount (e.g. refund/withdrawal)
      const txNegativeAmount: CashMovementTransaction = {
        ...txZeroAmount,
        id: 'TX-NEG',
        amount: D(-4500.5)
      };
      const p3 = buildTransactionInspectionPayload(txNegativeAmount);
      assert.strictEqual(p3.amount, '4500.50', 'Negative amount must be converted to positive abs() string');
    });
  });
});
