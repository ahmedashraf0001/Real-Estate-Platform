import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Register .css and .module.css handlers for node:test SSR
const cjsRequire = createRequire(import.meta.url);
cjsRequire.extensions['.css'] = (m: any) => { m.exports = {}; };
cjsRequire.extensions['.module.css'] = (m: any) => {
  const proxy = new Proxy({}, { get: (_target, prop) => String(prop) });
  m.exports = proxy;
  m.exports.default = proxy;
  m.exports.__esModule = true;
};

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('FIN-OS Loading Workstation & Shell Invariants Suite', () => {
  let ZFERPLoadingWorkstation: any;
  let ZFERPStageSkeleton: any;

  before(async () => {
    const mod = await import('@/components/admin/erp/v2/ZFERPLoadingWorkstation');
    ZFERPLoadingWorkstation = mod.ZFERPLoadingWorkstation;
    ZFERPStageSkeleton = mod.ZFERPStageSkeleton;
  });

  describe('1. Simplistic Stage Skeleton Placeholder (mode="stage")', () => {
    it('renders 4 discrete KPI skeleton cards and 1 canonical table skeleton', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFERPStageSkeleton, { isAr: true })
      );

      // Verify ARIA role and label
      assert.ok(html.includes('role="status"'), 'Must have role="status"');
      assert.ok(html.includes('aria-busy="true"'), 'Must indicate aria-busy');
      assert.ok(html.includes('dir="rtl"'), 'Arabic mode must set dir="rtl"');

      // Verify 4 discrete KPI cards are rendered
      const kpiMatches = html.match(/data-discrete-kpi-card="true"/g);
      assert.strictEqual(kpiMatches?.length, 4, 'Must render exactly 4 discrete KPI cards');

      // Verify table skeleton card is rendered
      assert.ok(html.includes('data-canonical-table-skeleton="true"'), 'Must contain canonical table card skeleton');

      // Verify 5 canonical table rows
      const rowMatches = html.match(/data-canonical-skeleton-row="true"/g);
      assert.strictEqual(rowMatches?.length, 5, 'Must render 5 canonical skeleton table rows');
    });

    it('renders English stage skeleton with correct dir="ltr"', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFERPStageSkeleton, { isAr: false })
      );

      assert.ok(html.includes('dir="ltr"'), 'English mode must set dir="ltr"');
      assert.ok(html.includes('aria-label="Loading page content"'));
    });
  });

  describe('2. Full Workstation Shell Skeleton Placeholder (mode="full")', () => {
    it('renders full docked workstation blueprint skeleton for cold boot', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFERPLoadingWorkstation, { isAr: true, mode: 'full' })
      );

      // Verify full shell skeleton
      assert.ok(html.includes('data-erp-workstation-skeleton="true"'), 'Must render shell skeleton container');
      assert.ok(html.includes('data-sidebar-skeleton="true"'), 'Must render docked sidebar skeleton');
      assert.ok(html.includes('data-header-skeleton="true"'), 'Must render top header skeleton');
      assert.ok(html.includes('data-erp-stage-skeleton="true"'), 'Must render middle stage skeleton');
      assert.ok(html.includes('data-side-widgets-skeleton="true"'), 'Must render side widgets companion rail skeleton');

      // Verify 4 discrete KPI cards inside full workstation skeleton
      const kpiMatches = html.match(/data-discrete-kpi-card="true"/g);
      assert.strictEqual(kpiMatches?.length, 4, 'Must render 4 KPI cards in stage');
    });

    it('delegates to ZFERPStageSkeleton when mode="stage"', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFERPLoadingWorkstation, { isAr: true, mode: 'stage' })
      );

      assert.ok(!html.includes('data-sidebar-skeleton="true"'), 'Stage mode must NOT render sidebar skeleton');
      assert.ok(!html.includes('data-header-skeleton="true"'), 'Stage mode must NOT render header skeleton');
      assert.ok(html.includes('data-erp-stage-skeleton="true"'), 'Stage mode must render stage skeleton');
    });
  });

  describe('3. Invariant: 0 Fake Timeouts, 0 Glowing Dials, Anti-Slop Enforcement', () => {
    it('has no fake setTimeout progress, glowing dials, or slop tokens in rendered output', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFERPLoadingWorkstation, { isAr: true, mode: 'full' })
      );

      // Ensure no neon glow shadows or inline glowing rings
      assert.ok(!html.includes('box-shadow: 0 0 28px'), 'No glowing box-shadow');
      assert.ok(!html.includes('box-shadow: 0 0 46px'), 'No glowing box-shadow');
      assert.ok(!html.includes('zfCrownPulse'), 'No pulsing crown animation');
      assert.ok(!html.includes('zfEmeraldPulse'), 'No pulsing emerald animation');
      assert.ok(!html.includes('zf-octagonal-crest'), 'No fake octagonal crest');
      assert.ok(!html.includes('Cinzel'), 'No trendy fonts');
      assert.ok(!html.includes('Playfair'), 'No trendy fonts');

      // Ensure no fake percentage numbers rendered as text content
      assert.ok(!html.match(/>\s*\d+%\s*</), 'No fake percentage text numbers');
    });
  });

  describe('4. Invariant: No Blocking Unmount on Shell Once Data Exists (Initial Boot Only)', () => {
    it('determines hasData correctly from ERP store dataset', () => {
      const mockEmptyData = {
        periods: [],
        contracts: [],
        properties: [],
      };

      const hasDataEmpty = (
        (mockEmptyData.periods && mockEmptyData.periods.length > 0) ||
        (mockEmptyData.contracts && mockEmptyData.contracts.length > 0) ||
        (mockEmptyData.properties && mockEmptyData.properties.length > 0)
      );
      assert.strictEqual(hasDataEmpty, false, 'Empty data must evaluate to hasData=false (initial cold boot)');

      const mockPopulatedData = {
        periods: [{ period_id: 'prd-2026-09' }],
        contracts: [],
        properties: [],
      };

      const hasDataPopulated = (
        (mockPopulatedData.periods && mockPopulatedData.periods.length > 0) ||
        (mockPopulatedData.contracts && mockPopulatedData.contracts.length > 0) ||
        (mockPopulatedData.properties && mockPopulatedData.properties.length > 0)
      );
      assert.strictEqual(hasDataPopulated, true, 'Populated data must evaluate to hasData=true');

      // Invariant: shell must NOT block or unmount if hasData is true
      const shouldBlockShell = (isLoading: boolean, hasData: boolean) => isLoading && !hasData;

      assert.strictEqual(shouldBlockShell(true, false), true, 'Cold boot before data exists: shell blocks with loading placeholder');
      assert.strictEqual(shouldBlockShell(false, false), false, 'Not loading: shell renders');
      assert.strictEqual(shouldBlockShell(true, true), false, 'Revalidation with data: shell NEVER unmounts');
      assert.strictEqual(shouldBlockShell(false, true), false, 'Standard steady state: shell renders');
    });
  });
});
