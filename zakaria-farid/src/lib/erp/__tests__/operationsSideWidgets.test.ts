import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { D } from '@/lib/erp/math';
import type { CashMovementTransaction, UpcomingDuesSummary } from '@/lib/erp/operationsStreamFilters';

const cjsRequire = createRequire(import.meta.url);
try {
  cjsRequire.extensions['.css'] = (m: any) => { m.exports = {}; };
  cjsRequire.extensions['.module.css'] = (m: any) => { m.exports = {}; };
} catch (_) {}

let OperationsSideWidgets: any;

describe('FIN-OS Operations Side Rail Widgets Suite (media_1790744477358.jpg)', () => {
  const tsxPath = path.resolve(process.cwd(), 'src/components/admin/erp/v2/views/operations/OperationsSideWidgets.tsx');
  const cssPath = path.resolve(process.cwd(), 'src/components/admin/erp/v2/views/operations/OperationsSideWidgets.module.css');
  const tsxSource = fs.readFileSync(tsxPath, 'utf8');
  const cssSource = fs.readFileSync(cssPath, 'utf8');

  before(async () => {
    const mod = await import('@/components/admin/erp/v2/views/operations/OperationsSideWidgets');
    OperationsSideWidgets = mod.OperationsSideWidgets;
  });

  // Sample mock data matching the screenshot exactly
  const mockRecentTransactions: CashMovementTransaction[] = [
    {
      id: 'tx-1',
      date: '2027-09-03',
      timeStr: '11:00:00',
      fullDateTimeStr: '2027-09-03 11:00:00',
      type: 'COLLECTION',
      typeLabelAr: 'تحصيل شيك',
      typeLabelEn: 'Cheque Collection',
      description: 'تحصيل شيك رقم 10245',
      counterparty: 'Eng. Mahmoud El-Sayed',
      accountLabel: 'أوراق قبض',
      accountCode: '103000',
      amount: D(17200000),
      direction: 'IN',
      status: 'COMPLETED',
      statusLabelAr: 'مكتمل',
      statusLabelEn: 'Completed',
      category: 'collection',
      rawPdc: { cheque_id: 'c1' } as any
    },
    {
      id: 'tx-2',
      date: '2027-03-03',
      timeStr: '11:00:00',
      fullDateTimeStr: '2027-03-03 11:00:00',
      type: 'COLLECTION',
      typeLabelAr: 'تحصيل شيك',
      typeLabelEn: 'Cheque Collection',
      description: 'تحصيل شيك',
      counterparty: 'Dr. Karim Hassan',
      accountLabel: 'أوراق قبض',
      accountCode: '103000',
      amount: D(9883333),
      direction: 'IN',
      status: 'COMPLETED',
      statusLabelAr: 'مكتمل',
      statusLabelEn: 'Completed',
      category: 'collection',
      rawPdc: { cheque_id: 'c2' } as any
    },
    {
      id: 'tx-3',
      date: '2026-12-03',
      timeStr: '11:00:00',
      fullDateTimeStr: '2026-12-03 11:00:00',
      type: 'COLLECTION',
      typeLabelAr: 'تحصيل شيك',
      typeLabelEn: 'Cheque Collection',
      description: 'تحصيل شيك',
      counterparty: 'Dr. Karim Hassan',
      accountLabel: 'أوراق قبض',
      accountCode: '103000',
      amount: D(9883333),
      direction: 'IN',
      status: 'COMPLETED',
      statusLabelAr: 'مكتمل',
      statusLabelEn: 'Completed',
      category: 'collection',
      rawPdc: { cheque_id: 'c3' } as any
    },
    {
      id: 'tx-4',
      date: '2026-09-14',
      timeStr: '02:58:00',
      fullDateTimeStr: '2026-09-14 02:58:00',
      type: 'COLLECTION',
      typeLabelAr: 'تحصيل عميل',
      typeLabelEn: 'Client Collection',
      description: 'سند قبض نقدي',
      counterparty: 'Dr. Karim Hassan',
      accountLabel: 'عملاء وحجوزات',
      accountCode: '103000',
      amount: D(2337500),
      direction: 'IN',
      status: 'COMPLETED',
      statusLabelAr: 'مكتمل',
      statusLabelEn: 'Completed',
      category: 'collection'
    },
    {
      id: 'tx-5',
      date: '2026-09-14',
      timeStr: '02:58:00',
      fullDateTimeStr: '2026-09-14 02:58:00',
      type: 'COLLECTION',
      typeLabelAr: 'تحصيل عميل',
      typeLabelEn: 'Client Collection',
      description: 'سند قبض نقدي',
      counterparty: 'Eng. Mahmoud El-Sayed',
      accountLabel: 'عملاء وحجوزات',
      accountCode: '103000',
      amount: D(1912500),
      direction: 'IN',
      status: 'COMPLETED',
      statusLabelAr: 'مكتمل',
      statusLabelEn: 'Completed',
      category: 'collection'
    }
  ];

  const mockUpcomingDues: UpcomingDuesSummary = {
    totalCount: 58,
    totalIn: D(191572917),
    totalOut: D(0),
    items: [
      {
        id: 'due-1',
        title: 'شيك رقم 1102',
        party: 'Dr. Karim Hassan',
        dueDate: '2026-09-03',
        amount: D(2475000),
        direction: 'IN',
        typeLabelAr: 'شيك وارد',
        typeLabelEn: 'Incoming PDC',
        rawPdc: { cheque_id: 'p1' } as any
      },
      {
        id: 'due-2',
        title: 'شيك رقم 1103',
        party: 'Eng. Mahmoud El-Sayed',
        dueDate: '2026-12-03',
        amount: D(1912500),
        direction: 'IN',
        typeLabelAr: 'شيك وارد',
        typeLabelEn: 'Incoming PDC',
        rawPdc: { cheque_id: 'p2' } as any
      },
      {
        id: 'due-3',
        title: 'شيك رقم 1104',
        party: 'Dr. Karim Hassan',
        dueDate: '2026-12-03',
        amount: D(1522917),
        direction: 'IN',
        typeLabelAr: 'شيك وارد',
        typeLabelEn: 'Incoming PDC',
        rawPdc: { cheque_id: 'p3' } as any
      },
      {
        id: 'due-4',
        title: 'شيك رقم 1105',
        party: 'Eng. Mahmoud El-Sayed',
        dueDate: '2026-12-03',
        amount: D(1522917),
        direction: 'IN',
        typeLabelAr: 'شيك وارد',
        typeLabelEn: 'Incoming PDC',
        rawPdc: { cheque_id: 'p4' } as any
      }
    ]
  };

  describe('1. Static Design & Styling Contracts', () => {
    it('defines warm gold squircle badges (#fdf8ee fill and #b48c36 color)', () => {
      assert.ok(cssSource.includes('.goldSquircle'), 'CSS must define .goldSquircle');
      assert.ok(cssSource.includes('#fdf8ee'), 'CSS must use #fdf8ee background fill');
      assert.ok(cssSource.includes('#b48c36'), 'CSS must use #b48c36 icon color');
    });

    it('defines dual summary cards with vertical hairline divider', () => {
      assert.ok(cssSource.includes('.upcomingDuesSummary'), 'CSS must define .upcomingDuesSummary');
      assert.ok(cssSource.includes('.summaryHairline'), 'CSS must define .summaryHairline');
      assert.ok(cssSource.includes('.summaryValueGreen'), 'CSS must define .summaryValueGreen');
      assert.ok(cssSource.includes('.summaryValueNeutral'), 'CSS must define .summaryValueNeutral');
      assert.ok(cssSource.includes('.summarySquircleGreen'), 'CSS must define .summarySquircleGreen');
      assert.ok(cssSource.includes('.summarySquircleNeutral'), 'CSS must define .summarySquircleNeutral');
    });

    it('defines soft pastel micro-pills with 6px geometry', () => {
      assert.ok(cssSource.includes('.statusPillGreen'), 'CSS must define .statusPillGreen');
      assert.ok(cssSource.includes('.statusPillBlue'), 'CSS must define .statusPillBlue');
      assert.ok(cssSource.includes('.amberBadge'), 'CSS must define .amberBadge');
      assert.ok(cssSource.includes('#fef3c7'), 'Amber badge must use #fef3c7 background');
      assert.ok(cssSource.includes('#b45309'), 'Amber badge must use #b45309 text color');
    });

    it('defines squircle arrow action buttons with #f8fafc background and 1px border', () => {
      assert.ok(cssSource.includes('.arrowButton'), 'CSS must define .arrowButton');
      assert.ok(cssSource.includes('#f8fafc'), '.arrowButton must use #f8fafc background');
      assert.ok(cssSource.includes('#e2e8f0'), '.arrowButton must have #e2e8f0 border');
    });

    it('enforces clean two-column, two-row architecture for Side Widgets 2 & 3 without text overlap', () => {
      assert.ok(cssSource.includes('.recentFeedTrailing'), 'CSS must define .recentFeedTrailing');
      assert.ok(cssSource.includes('.upcomingDueTrailing'), 'CSS must define .upcomingDueTrailing');
      assert.ok(cssSource.includes('.recentFeedLeading'), 'CSS must define .recentFeedLeading');
      assert.ok(cssSource.includes('.upcomingDueLeading'), 'CSS must define .upcomingDueLeading');
      assert.ok(cssSource.includes('.recentFeedParty'), 'CSS must define .recentFeedParty');
      assert.ok(cssSource.includes('.upcomingDueParty'), 'CSS must define .upcomingDueParty');

      assert.ok(tsxSource.includes('dir="ltr" className={css.recentFeedDate}'), 'recentFeedDate must specify dir="ltr"');
      assert.ok(tsxSource.includes('dir="ltr" className={css.upcomingDueDate}'), 'upcomingDueDate must specify dir="ltr"');
    });
  });

  describe('2. Component Markup & Behavioral Invariants', () => {
    it('renders Widget 1 (أحدث العمليات) matching reference image media_1790744477358.jpg', () => {
      const html = renderToStaticMarkup(
        React.createElement(OperationsSideWidgets, {
          recentTransactions: mockRecentTransactions,
          upcomingDues: mockUpcomingDues,
          isAr: true
        })
      );

      // Title & Subtitle
      assert.ok(html.includes('أحدث العمليات'), 'Must render title أحدث العمليات');
      assert.ok(html.includes('5 عمليات حديثة'), 'Must render dynamic subtitle 5 عمليات حديثة');
      assert.ok(html.includes('عرض الكل'), 'Must render action عرض الكل');

      // Parties
      assert.ok(html.includes('Eng. Mahmoud El-Sayed'), 'Must render Eng. Mahmoud El-Sayed');
      assert.ok(html.includes('Dr. Karim Hassan'), 'Must render Dr. Karim Hassan');

      // Status pills
      assert.ok(html.includes('تحصيل شيك'), 'Must render pill تحصيل شيك');
      assert.ok(html.includes('تحصيل عميل'), 'Must render pill تحصيل عميل');

      // Amounts formatted with + and commas
      assert.ok(html.includes('+ 17,200,000'), 'Must render + 17,200,000');
      assert.ok(html.includes('+ 9,883,333'), 'Must render + 9,883,333');
      assert.ok(html.includes('+ 2,337,500'), 'Must render + 2,337,500');
      assert.ok(html.includes('+ 1,912,500'), 'Must render + 1,912,500');

      // Dates & Times
      assert.ok(html.includes('2027-09-03'), 'Must render 2027-09-03');
      assert.ok(html.includes('11:00'), 'Must render 11:00');
      assert.ok(html.includes('02:58'), 'Must render 02:58');
    });

    it('renders Widget 2 (استحقاقات وتحصيلات قادمة) matching reference image media_1790744477358.jpg', () => {
      const html = renderToStaticMarkup(
        React.createElement(OperationsSideWidgets, {
          recentTransactions: mockRecentTransactions,
          upcomingDues: mockUpcomingDues,
          isAr: true
        })
      );

      // Title & Subtitle & Amber Badge
      assert.ok(html.includes('استحقاقات وتحصيلات قادمة'), 'Must render title استحقاقات وتحصيلات قادمة');
      assert.ok(html.includes('الاستحقاقات والتحصيلات خلال الفترة القادمة'), 'Must render subtitle');
      assert.ok(html.includes('58 مستحق'), 'Must render amber badge 58 مستحق');

      // Dual Summary Cards
      assert.ok(html.includes('تحصيلات متوقعة'), 'Must render dual card label تحصيلات متوقعة');
      assert.ok(html.includes('191,572,917'), 'Must render expected in value 191,572,917');
      assert.ok(html.includes('مدفوعات مستحقة'), 'Must render dual card label مدفوعات مستحقة');

      // Upcoming Dues rows
      assert.ok(html.includes('شيك وارد'), 'Must render status pill شيك وارد');
      assert.ok(html.includes('+ 2,475,000'), 'Must render + 2,475,000');
      assert.ok(html.includes('+ 1,912,500'), 'Must render + 1,912,500');
      assert.ok(html.includes('+ 1,522,917'), 'Must render + 1,522,917');
      assert.ok(html.includes('2026-09-03'), 'Must render 2026-09-03');
      assert.ok(html.includes('2026-12-03'), 'Must render 2026-12-03');
    });

    it('renders honest empty zero-states without crashing when lists are empty', () => {
      const html = renderToStaticMarkup(
        React.createElement(OperationsSideWidgets, {
          recentTransactions: [],
          upcomingDues: { items: [], totalCount: 0, totalIn: D(0), totalOut: D(0) },
          isAr: true
        })
      );

      assert.ok(html.includes('لا توجد حركات مسجلة مؤخراً'), 'Must render honest zero-state for recent movements');
      assert.ok(html.includes('0 عمليات حديثة'), 'Must render 0 عمليات حديثة');
      assert.ok(html.includes('0 مستحق'), 'Must render 0 مستحق');
      assert.ok(html.includes('لا توجد شيكات أو مستحقات مجدولة للفترة القادمة'), 'Must render honest zero-state for dues');
    });
  });
});
