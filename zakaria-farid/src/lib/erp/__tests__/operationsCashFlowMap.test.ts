import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { D } from '../math';

// Register .css and .module.css handlers for node:test SSR before dynamic import
const cjsRequire = createRequire(import.meta.url);
cjsRequire.extensions['.css'] = (m: any) => { m.exports = {}; };
cjsRequire.extensions['.module.css'] = (m: any) => { m.exports = {}; };

describe('OperationsCashFlowMap Standalone Component Suite (media_1790744468759.png)', () => {
  let OperationsCashFlowMap: any;

  before(async () => {
    const mod = await import('@/components/admin/erp/v2/views/operations/OperationsCashFlowMap');
    OperationsCashFlowMap = mod.OperationsCashFlowMap;
  });

  const tsxPath = path.resolve(
    process.cwd(),
    'src/components/admin/erp/v2/views/operations/OperationsCashFlowMap.tsx'
  );
  const cssPath = path.resolve(
    process.cwd(),
    'src/components/admin/erp/v2/views/operations/OperationsCashFlowMap.module.css'
  );
  const tsxSource = fs.readFileSync(tsxPath, 'utf8');
  const cssSource = fs.readFileSync(cssPath, 'utf8');

  describe('1. Static Code Analysis & FIN-OS ERP Invariants', () => {
    it('enforces pure white panel background and bans tinted surfaces', () => {
      assert.ok(
        cssSource.includes('background: #ffffff !important;'),
        'Outer container must enforce pure white panel background'
      );
      assert.strictEqual(
        cssSource.includes('bg-red-50'),
        false,
        'Pastel full card tints are banned'
      );
      assert.strictEqual(
        cssSource.includes('bg-emerald-50'),
        false,
        'Pastel full card tints are banned'
      );
    });

    it('enforces tabular numbers for currency and metrics', () => {
      assert.ok(
        cssSource.includes('font-variant-numeric: tabular-nums'),
        'CSS must declare font-variant-numeric: tabular-nums'
      );
    });

    it('preserves all required data-stream-id attributes for mindmap interactive filtering', () => {
      const requiredStreamIds = [
        'in-0',
        'in-1',
        'central-hub',
        'out-0',
        'out-1',
        'out-2',
        'out-3',
        'in-total',
        'out-total'
      ];
      for (const id of requiredStreamIds) {
        const pattern = `data-stream-id="${id}"`;
        assert.ok(tsxSource.includes(pattern), `OperationsCashFlowMap must contain ${pattern}`);
      }
    });

    it('includes all required Lucide icons from reference image', () => {
      const requiredIcons = [
        'BarChart3',
        'ArrowRight',
        'Users',
        'ArrowLeftRight',
        'Coins',
        'Landmark',
        'Wallet',
        'HardHat',
        'BrickWall',
        'Shield',
        'Cog',
        'ChevronRight',
        'Eye',
        'Plus'
      ];
      for (const icon of requiredIcons) {
        assert.ok(tsxSource.includes(icon), `TSX must import and use ${icon}`);
      }
    });
  });

  describe('2. Standalone Default Rendering (100% Exact Fidelity to media_1790744468759.png)', () => {
    it('renders the header title and subtitle verbatim', () => {
      const html = renderToStaticMarkup(React.createElement(OperationsCashFlowMap, { isAr: true }));
      assert.ok(html.includes('تدفق الأموال في المؤسسة'), 'Must contain header title');
      assert.ok(
        html.includes('توضح حركة النقد من مصادر الإيرادات إلى مصارف الإنفاق'),
        'Must contain header subtitle'
      );
    });

    it('renders exact Inflows upper column metrics and streams', () => {
      const html = renderToStaticMarkup(React.createElement(OperationsCashFlowMap, { isAr: true }));
      // Inflow Header
      assert.ok(html.includes('التدفقات الداخلة'), 'Must contain Inflow title');
      assert.ok(html.includes('مصادر الإيرادات والتمويل'), 'Must contain Inflow subtitle');
      assert.ok(html.includes('إجمالي التدفقات الداخلة'), 'Must contain Inflow label');
      assert.ok(html.includes('471,197,918'), 'Must contain total inflow amount');

      // Stream 1: Collections
      assert.ok(html.includes('أقساط ومقدمات العملاء'), 'Must contain Collections title');
      assert.ok(html.includes('أقساط ومقدمات جديد/إعادة بيع'), 'Must contain Collections subtitle');
      assert.ok(html.includes('470,197,917'), 'Must contain collections amount');

      // Stream 2: Partner Injections
      assert.ok(html.includes('تمويل وسيولة الشركاء'), 'Must contain Partner Funding title');
      assert.ok(html.includes('رأس المال وفتح تسهيلات'), 'Must contain Partner Funding subtitle');
      assert.ok(html.includes('1,000,001'), 'Must contain partner funding amount');
    });

    it('renders exact Available Liquidity center column with giant amount and 58%/42% split bar', () => {
      const html = renderToStaticMarkup(React.createElement(OperationsCashFlowMap, { isAr: true }));
      assert.ok(html.includes('السيولة المتاحة'), 'Must contain Available Liquidity title');
      assert.ok(html.includes('الخزينة والبنوك'), 'Must contain Treasury & Banks subtitle');
      assert.ok(html.includes('471,147,918'), 'Must contain giant liquid amount');

      // Split bar: 58% Banks & 42% Safe
      assert.ok(html.includes('58%'), 'Must contain 58% bank split label');
      assert.ok(html.includes('42%'), 'Must contain 42% safe split label');
      assert.ok(html.includes('بنوك'), 'Must contain Banks label');
      assert.ok(html.includes('274,016,667'), 'Must contain bank cash amount');
      assert.ok(html.includes('خزينة'), 'Must contain Treasury Safe label');
      assert.ok(html.includes('197,131,251'), 'Must contain safe cash amount');
    });

    it('renders exact Outflows upper column metrics and 4 stream cards', () => {
      const html = renderToStaticMarkup(React.createElement(OperationsCashFlowMap, { isAr: true }));
      // Outflows Header
      assert.ok(html.includes('التدفقات الخارجة'), 'Must contain Outflow title');
      assert.ok(html.includes('مصارف الإنفاق والمشاريع'), 'Must contain Outflow subtitle');
      assert.ok(html.includes('إجمالي التدفقات الخارجة'), 'Must contain Outflow label');
      assert.ok(html.includes('200,000'), 'Must contain total outflow amount');

      // Stream 1: Civil Structure
      assert.ok(html.includes('خرسانات وبناء عظم'), 'Must contain Civil Structure title');
      assert.ok(html.includes('حديد وأسمنت وهيكل'), 'Must contain Civil Structure subtitle');

      // Stream 2: Finishes & Facades
      assert.ok(html.includes('تشطيبات وواجهات'), 'Must contain Finishes title');
      assert.ok(html.includes('رخام ألوميتال ومصاعد'), 'Must contain Finishes subtitle');

      // Stream 3: Permits & Gov Fees
      assert.ok(html.includes('تراخيص ورسوم حكومية'), 'Must contain Permits title');
      assert.ok(html.includes('رخص بناء ومصاريف الجهاز'), 'Must contain Permits subtitle');

      // Stream 4: MEP Infrastructure
      assert.ok(html.includes('تأسيس وكهروميكانيك'), 'Must contain MEP title');
      assert.ok(html.includes('سباكة، كهرباء، ومغاز'), 'Must contain MEP subtitle');
    });

    it('renders the bottom visual flow ribbon with nodes and fluid connectors', () => {
      const html = renderToStaticMarkup(React.createElement(OperationsCashFlowMap, { isAr: true }));
      assert.ok(html.includes('إجمالي الداخل'), 'Must contain Ribbon Inflow node label');
      assert.ok(html.includes('إجمالي الخارج'), 'Must contain Ribbon Outflow node label');
      assert.ok(html.includes('greenRibbonGrad'), 'Must define green fluid ribbon gradient');
      assert.ok(html.includes('redRibbonGrad'), 'Must define red fluid ribbon gradient');
    });

    it('renders the dual footer buttons with eye and plus icons', () => {
      const html = renderToStaticMarkup(React.createElement(OperationsCashFlowMap, { isAr: true }));
      assert.ok(html.includes('عرض كل العمليات'), 'Must render View All movements button');
      assert.ok(html.includes('إضافة بند'), 'Must render Add Item button');
    });
  });

  describe('3. Dynamic Store Props Derivation & Honest Zero-States', () => {
    it('derives values directly when custom store props are passed', () => {
      const customFlow = {
        inflows: {
          collections: D(50000000),
          partnerInjections: D(10000000),
          total: D(60000000)
        },
        outflows: {
          civilStructure: D(5000000),
          finishesFacades: D(2000000),
          permitsGovFees: D(1000000),
          mepInfrastructure: D(500000),
          total: D(8500000)
        }
      };
      const customLiquid = {
        bankCash: D(40000000),
        safeCash: D(10000000),
        totalLiquid: D(50000000)
      };

      const html = renderToStaticMarkup(
        React.createElement(OperationsCashFlowMap, {
          isAr: true,
          flowMetrics: customFlow,
          liquidBalances: customLiquid
        })
      );

      assert.ok(html.includes('60,000,000'), 'Must render custom total inflows');
      assert.ok(html.includes('50,000,000'), 'Must render custom collections');
      assert.ok(html.includes('10,000,000'), 'Must render custom partner injections');
      assert.ok(html.includes('8,500,000'), 'Must render custom total outflows');
      assert.ok(html.includes('5,000,000'), 'Must render custom civil structure');
      assert.ok(html.includes('2,000,000'), 'Must render custom finishes');
      assert.ok(html.includes('80%'), 'Must calculate 80% bank split');
      assert.ok(html.includes('20%'), 'Must calculate 20% safe split');
    });

    it('renders honest zero states when store values are zero', () => {
      const zeroFlow = {
        inflows: {
          collections: D(0),
          partnerInjections: D(0),
          total: D(0)
        },
        outflows: {
          civilStructure: D(0),
          finishesFacades: D(0),
          permitsGovFees: D(0),
          mepInfrastructure: D(0),
          total: D(0)
        }
      };
      const zeroLiquid = {
        bankCash: D(0),
        safeCash: D(0),
        totalLiquid: D(0)
      };

      const html = renderToStaticMarkup(
        React.createElement(OperationsCashFlowMap, {
          isAr: true,
          flowMetrics: zeroFlow,
          liquidBalances: zeroLiquid
        })
      );

      // Verify honest 0 rendering without undefined, NaN, or decimals
      assert.ok(html.includes('>0<') || html.includes('0 ج.م'), 'Must render honest 0');
      assert.strictEqual(html.includes('NaN'), false, 'Must never render NaN');
      assert.strictEqual(html.includes('undefined'), false, 'Must never render undefined');
    });

    it('renders English labels when isAr is false', () => {
      const html = renderToStaticMarkup(React.createElement(OperationsCashFlowMap, { isAr: false }));
      assert.ok(html.includes('Institutional Cash Flow Map'));
      assert.ok(html.includes('Cash Inflows'));
      assert.ok(html.includes('Capital Outflows'));
      assert.ok(html.includes('Available Liquidity'));
      assert.ok(html.includes('EGP'));
    });
  });
});
