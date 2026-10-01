import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { D } from '@/lib/erp/math';

const cjsRequire = createRequire(import.meta.url);
try {
  cjsRequire.extensions['.css'] = (m: any) => { m.exports = {}; };
  cjsRequire.extensions['.module.css'] = (m: any) => { m.exports = {}; };
} catch (_) {}

let OperationsTopKpis: any;

describe('FIN-OS Daily Operations Top KPI Panel Suite (media_1790744509160.png)', () => {
  const tsxPath = path.resolve(process.cwd(), 'src/components/admin/erp/v2/views/operations/OperationsTopKpis.tsx');
  const cssPath = path.resolve(process.cwd(), 'src/components/admin/erp/v2/views/operations/OperationsTopKpis.module.css');
  const tsxSource = fs.readFileSync(tsxPath, 'utf8');
  const cssSource = fs.readFileSync(cssPath, 'utf8');

  before(async () => {
    const mod = await import('@/components/admin/erp/v2/views/operations/OperationsTopKpis');
    OperationsTopKpis = mod.OperationsTopKpis;
  });

  describe('1. Static Design & Styling Invariants', () => {
    it('enforces pure white panel background (#ffffff !important) and 1px #cbd5e1 border', () => {
      assert(cssSource.includes('#ffffff !important'), 'Outer panel and cards must use pure white #ffffff !important');
      assert(cssSource.includes('border: 1px solid #cbd5e1'), 'Must use 1px #cbd5e1 neutral border');
      assert(cssSource.includes('border-radius: 14px'), 'Outer panel must have 14px radius');
      assert(cssSource.includes('border-radius: 12px'), 'KPI cards must have 12px radius');
    });

    it('defines 4 discrete floating cards in a responsive CSS grid with container queries', () => {
      assert(cssSource.includes('grid-template-columns: repeat(4, minmax(0, 1fr))'), 'Desktop must render 4 discrete floating cards');
      assert(cssSource.includes('container-name: operationsTopKpis'), 'Middle section must declare container queries');
      assert(cssSource.includes('@container operationsTopKpis (max-width: 900px)'), 'Container query responsive stacking supported');
    });

    it('enforces tabular-nums across currency, metrics, and dates', () => {
      assert(cssSource.includes('font-variant-numeric: tabular-nums'), 'Tabular numerals are required for financial accuracy');
    });

    it('defines squircle icon styles for gold, green, amber, and orange semantic accents', () => {
      assert(cssSource.includes('.squircleGold'), 'Must define gold squircle badge');
      assert(cssSource.includes('.squircleGreen'), 'Must define green squircle badge');
      assert(cssSource.includes('.squircleAmber'), 'Must define amber squircle badge');
      assert(cssSource.includes('.squircleOrange'), 'Must define orange squircle badge');
    });

    it('defines progress bar fill tokens for gold (Safe) and slate (Banks)', () => {
      assert(cssSource.includes('.goldBarFill'), 'Gold progress bar for safe liquidity');
      assert(cssSource.includes('.slateBarFill'), 'Slate progress bar for bank liquidity');
    });
  });

  describe('2. Component Markup & Behavioral Invariants', () => {
    it('renders Header with title, subtitle, and action buttons', () => {
      const html = renderToStaticMarkup(
        React.createElement(OperationsTopKpis, {
          isAr: true,
          todayStr: '2026-09-30',
          todayMetrics: { count: 0, inflows: D(0), outflows: D(0), net: D(0) },
          onOpenReportModal: () => {},
          onExportExcel: () => {},
        })
      );

      // Title & Subtitle
      assert(html.includes('مكتب العمليات اليومية'), 'Must render title "مكتب العمليات اليومية"');
      assert(html.includes('0 حركة مسجلة اليوم · 30-09-2026'), 'Must render subtitle "0 حركة مسجلة اليوم · 30-09-2026"');

      // Buttons
      assert(html.includes('تقرير الخزينة'), 'Must render "تقرير الخزينة" button');
      assert(html.includes('تصدير ERP الشامل'), 'Must render "تصدير ERP الشامل" button');
    });

    it('renders Card 1 (الرصيد النقدي الحالي) with 471,147,918 ج.م, dots breakdown, and 42%/58% progress bars', () => {
      const html = renderToStaticMarkup(
        React.createElement(OperationsTopKpis, {
          isAr: true,
          liquidBalances: {
            totalLiquid: D(471147918),
            safeCash: D(197131251),
            bankCash: D(274016667),
          },
        })
      );

      // Card Title
      assert(html.includes('الرصيد النقدي الحالي'), 'Must render Card 1 title');

      // Main value
      assert(html.includes('471,147,918'), 'Must render total liquid value 471,147,918');

      // Breakdown with dots
      assert(html.includes('خزينة:'), 'Must render safe label in breakdown');
      assert(html.includes('197,131,251'), 'Must render safe amount 197,131,251');
      assert(html.includes('بنوك:'), 'Must render bank label in breakdown');
      assert(html.includes('274,016,667'), 'Must render bank amount 274,016,667');

      // Progress bars
      assert(html.includes('42%'), 'Must calculate 42% safe ratio');
      assert(html.includes('58%'), 'Must calculate 58% bank ratio');
    });

    it('renders Card 2 (صافي حركة اليوم) with 0 ج.م and 3 mini columns (الداخل, الخارج, الصافي)', () => {
      const html = renderToStaticMarkup(
        React.createElement(OperationsTopKpis, {
          isAr: true,
          todayMetrics: { count: 0, inflows: D(0), outflows: D(0), net: D(0) },
        })
      );

      assert(html.includes('صافي حركة اليوم'), 'Must render Card 2 title');
      assert(html.includes('لا توجد حركات اليوم'), 'Must render zero state subtitle');

      // 3 mini columns
      assert(html.includes('الداخل'), 'Must render Column 1 (الداخل)');
      assert(html.includes('الخارج'), 'Must render Column 2 (الخارج)');
      assert(html.includes('الصافي'), 'Must render Column 3 (الصافي)');
    });

    it('renders Card 3 (مقبوضات اليوم) with 0 ج.م, subtitle, and sparkline with "لا توجد مقبوضات اليوم"', () => {
      const html = renderToStaticMarkup(
        React.createElement(OperationsTopKpis, {
          isAr: true,
          todayMetrics: { count: 0, inflows: D(0), outflows: D(0), net: D(0) },
        })
      );

      assert(html.includes('مقبوضات اليوم'), 'Must render Card 3 title');
      assert(html.includes('جميع مصادر الإيراد'), 'Must render Card 3 subtitle');
      assert(html.includes('لا توجد مقبوضات اليوم'), 'Must render sparkline zero label');
    });

    it('renders Card 4 (مدفوعات اليوم) with 0 ج.م, subtitle, and sparkline with "لا توجد مدفوعات اليوم"', () => {
      const html = renderToStaticMarkup(
        React.createElement(OperationsTopKpis, {
          isAr: true,
          todayMetrics: { count: 0, inflows: D(0), outflows: D(0), net: D(0) },
        })
      );

      assert(html.includes('مدفوعات اليوم'), 'Must render Card 4 title');
      assert(html.includes('جميع أوجه الصرف'), 'Must render Card 4 subtitle');
      assert(html.includes('لا توجد مدفوعات اليوم'), 'Must render sparkline zero label');
    });

    it('dynamically reflects non-zero movements when transactions exist', () => {
      const html = renderToStaticMarkup(
        React.createElement(OperationsTopKpis, {
          isAr: true,
          todayMetrics: {
            count: 3,
            inflows: D(500000),
            outflows: D(120000),
            net: D(380000),
          },
          todayStr: '2026-09-30',
        })
      );

      assert(html.includes('3 حركة مسجلة اليوم · 30-09-2026'), 'Subtitle reflects count: 3');
      assert(html.includes('380,000'), 'Net reflects 380,000');
      assert(html.includes('500,000'), 'Inflows reflects 500,000');
      assert(html.includes('120,000'), 'Outflows reflects 120,000');
      assert(html.includes('الوارد يفوق المنصرف اليوم'), 'Subtitle explains net direction');
    });
  });
});
