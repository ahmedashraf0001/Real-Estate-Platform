import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('DailyOperationsView Source & Architecture Invariants', () => {
  const viewPath = path.join(process.cwd(), 'src/components/admin/erp/v2/views/DailyOperationsView.tsx');
  const cssPath = path.join(process.cwd(), 'src/components/admin/erp/v2/views/DailyOperationsView.module.css');
  const opsDir = path.join(process.cwd(), 'src/components/admin/erp/v2/views/operations');

  const viewSource = fs.readFileSync(viewPath, 'utf8');
  const cssSource = fs.readFileSync(cssPath, 'utf8');

  it('1. view source does NOT contain any banned legacy demo or dead code strings', () => {
    const banned = [
      '197131251',
      '471147918',
      'OperationsTopKpis',
      'OperationsCashFlowMap',
      'rawPdc',
      'paid_amount_egp',
      'ZFModalShell',
      '{false &&'
    ];
    for (const b of banned) {
      assert.strictEqual(
        viewSource.includes(b),
        false,
        `DailyOperationsView.tsx must NOT contain '${b}'`
      );
    }
  });

  it('2. view source contains treasury ledger and side widget primitives', () => {
    assert.ok(viewSource.includes('buildTreasuryMovements('), 'Must contain buildTreasuryMovements(');
    assert.ok(viewSource.includes('summarizeTreasury('), 'Must contain summarizeTreasury(');
    assert.ok(viewSource.includes('ZFWorkstationSideWidgets'), 'Must contain ZFWorkstationSideWidgets');
  });

  it('3. view source has no hex colors', () => {
    const hexPattern = /#[0-9a-fA-F]{3,8}\b/;
    assert.strictEqual(
      hexPattern.test(viewSource),
      false,
      'DailyOperationsView.tsx must not contain any hex colors'
    );
  });

  it('4. CSS module has no hex color, no gradient, no box-shadow', () => {
    const hexPattern = /#[0-9a-fA-F]{3,8}\b/;
    assert.strictEqual(
      hexPattern.test(cssSource),
      false,
      'DailyOperationsView.module.css must not contain any hex colors'
    );
    assert.strictEqual(
      cssSource.toLowerCase().includes('gradient'),
      false,
      'DailyOperationsView.module.css must not contain gradient'
    );
    assert.strictEqual(
      cssSource.toLowerCase().includes('box-shadow'),
      false,
      'DailyOperationsView.module.css must not contain box-shadow'
    );
  });

  it('5. operations/ directory has no OperationsTopKpis.tsx and no OperationsCashFlowMap.tsx', () => {
    const topKpisPath = path.join(opsDir, 'OperationsTopKpis.tsx');
    const cashFlowMapPath = path.join(opsDir, 'OperationsCashFlowMap.tsx');

    assert.strictEqual(
      fs.existsSync(topKpisPath),
      false,
      'OperationsTopKpis.tsx must not exist in operations/ directory'
    );
    assert.strictEqual(
      fs.existsSync(cashFlowMapPath),
      false,
      'OperationsCashFlowMap.tsx must not exist in operations/ directory'
    );
  });

  it('6. view source does NOT contain OperationsSideWidgets, computeUpcomingDues( (call), شيكات, شيك', () => {
    assert.strictEqual(
      viewSource.includes('OperationsSideWidgets'),
      false,
      'DailyOperationsView.tsx must NOT contain OperationsSideWidgets'
    );
    assert.strictEqual(
      viewSource.includes('computeUpcomingDues('),
      false,
      'DailyOperationsView.tsx must NOT contain computeUpcomingDues('
    );
    assert.strictEqual(
      viewSource.includes('شيكات'),
      false,
      'DailyOperationsView.tsx must NOT contain شيكات'
    );
    assert.strictEqual(
      viewSource.includes('شيك'),
      false,
      'DailyOperationsView.tsx must NOT contain شيك'
    );
  });

  it('7. view source contains buildUpcomingDues( and onNavigateToTab(\'pdc\')', () => {
    assert.ok(
      viewSource.includes('buildUpcomingDues('),
      'DailyOperationsView.tsx must contain buildUpcomingDues('
    );
    assert.ok(
      viewSource.includes("onNavigateToTab('pdc')"),
      'DailyOperationsView.tsx must contain onNavigateToTab(\'pdc\')'
    );
  });

  it('8. OperationsSideWidgets.tsx does not exist', () => {
    const sideWidgetsPath = path.join(opsDir, 'OperationsSideWidgets.tsx');
    assert.strictEqual(
      fs.existsSync(sideWidgetsPath),
      false,
      'OperationsSideWidgets.tsx must not exist'
    );
  });
});

