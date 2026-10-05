import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';

// Register .css and .module.css handlers for node:test SSR
const cjsRequire = createRequire(import.meta.url);
cjsRequire.extensions['.css'] = (m: any) => { m.exports = {}; };
cjsRequire.extensions['.module.css'] = (m: any) => { m.exports = {}; };

describe('ZFCollectInstallmentModal Source & Architecture Invariants', () => {
  const shellPath = path.join(process.cwd(), 'src/components/admin/erp/ERPWorkstationShell.tsx');
  const dailyOpsRoutePath = path.join(process.cwd(), 'src/components/admin/erp/views/DailyOperationsRouteView.tsx');
  const cockpitRoutePath = path.join(process.cwd(), 'src/components/admin/erp/views/CockpitRouteView.tsx');
  const cockpitViewPath = path.join(process.cwd(), 'src/components/admin/erp/v2/views/CockpitView.tsx');
  const handVaultRoutePath = path.join(process.cwd(), 'src/components/admin/erp/views/HandInstallmentsVaultRouteView.tsx');
  const contextPath = path.join(process.cwd(), 'src/components/admin/erp/context/ERPWorkstationContext.tsx');
  const modalCssPath = path.join(process.cwd(), 'src/components/admin/erp/v2/modals/ZFCollectInstallmentModal.module.css');

  const shellSource = fs.readFileSync(shellPath, 'utf8');
  const dailyOpsRouteSource = fs.readFileSync(dailyOpsRoutePath, 'utf8');
  const cockpitRouteSource = fs.readFileSync(cockpitRoutePath, 'utf8');
  const cockpitViewSource = fs.readFileSync(cockpitViewPath, 'utf8');
  const handVaultRouteSource = fs.readFileSync(handVaultRoutePath, 'utf8');
  const contextSource = fs.readFileSync(contextPath, 'utf8');
  const modalCssSource = fs.readFileSync(modalCssPath, 'utf8');

  it('1. ERPWorkstationShell.tsx does not contain <CashCollectionReceiptModal nor <HandCollectionModal; contains <ZFCollectInstallmentModal', () => {
    assert.strictEqual(
      shellSource.includes('<CashCollectionReceiptModal'),
      false,
      'ERPWorkstationShell.tsx must NOT contain <CashCollectionReceiptModal'
    );
    assert.strictEqual(
      shellSource.includes('<HandCollectionModal'),
      false,
      'ERPWorkstationShell.tsx must NOT contain <HandCollectionModal'
    );
    assert.strictEqual(
      shellSource.includes('<ZFCollectInstallmentModal'),
      true,
      'ERPWorkstationShell.tsx must contain <ZFCollectInstallmentModal'
    );
  });

  it('2. DailyOperationsRouteView.tsx and CockpitRouteView.tsx do not contain pdcRecords.find(; both contain openCollect(', () => {
    assert.strictEqual(
      dailyOpsRouteSource.includes('pdcRecords.find('),
      false,
      'DailyOperationsRouteView.tsx must NOT contain pdcRecords.find('
    );
    assert.strictEqual(
      cockpitRouteSource.includes('pdcRecords.find('),
      false,
      'CockpitRouteView.tsx must NOT contain pdcRecords.find('
    );
    assert.strictEqual(
      dailyOpsRouteSource.includes('openCollect('),
      true,
      'DailyOperationsRouteView.tsx must contain openCollect('
    );
    assert.strictEqual(
      cockpitRouteSource.includes('openCollect('),
      true,
      'CockpitRouteView.tsx must contain openCollect('
    );
  });

  it('3. CockpitView.tsx does not contain قيد يومية يدوي nor سند صرف / شيك', () => {
    assert.strictEqual(
      cockpitViewSource.includes('قيد يومية يدوي'),
      false,
      'CockpitView.tsx must NOT contain قيد يومية يدوي'
    );
    assert.strictEqual(
      cockpitViewSource.includes('سند صرف / شيك'),
      false,
      'CockpitView.tsx must NOT contain سند صرف / شيك'
    );
  });

  it('4. HandInstallmentsVaultRouteView.tsx does not contain contracts[0]', () => {
    assert.strictEqual(
      handVaultRouteSource.includes('contracts[0]'),
      false,
      'HandInstallmentsVaultRouteView.tsx must NOT contain contracts[0]'
    );
  });

  it('5. ERPWorkstationContext.tsx does not contain data.properties[0] || null', () => {
    assert.strictEqual(
      contextSource.includes('data.properties[0] || null'),
      false,
      'ERPWorkstationContext.tsx must NOT contain data.properties[0] || null'
    );
  });

  it('6. ZFCollectInstallmentModal.module.css has no hex color, no gradient, no box-shadow', () => {
    const hexPattern = /#[0-9a-fA-F]{3,8}\b/;
    assert.strictEqual(
      hexPattern.test(modalCssSource),
      false,
      'ZFCollectInstallmentModal.module.css must not contain hex colors'
    );
    assert.strictEqual(
      modalCssSource.toLowerCase().includes('gradient'),
      false,
      'ZFCollectInstallmentModal.module.css must not contain gradient'
    );
    assert.strictEqual(
      modalCssSource.toLowerCase().includes('box-shadow'),
      false,
      'ZFCollectInstallmentModal.module.css must not contain box-shadow'
    );
  });

  it('7. renderToStaticMarkup of ZFCollectInstallmentModal contains contract number and installment label', async () => {
    const { ZFCollectInstallmentModal } = await import('@/components/admin/erp/v2/modals/ZFCollectInstallmentModal');

    const mockContract = {
      contract_id: 'c1',
      contract_number: 'ZF-1',
      buyer_name: 'A',
      status: 'Active',
      property_id: 'p1'
    } as any;

    const mockSchedule = {
      schedule_id: 's0',
      contract_id: 'c1',
      tranche_number: 0,
      due_date: '2026-01-01',
      nominal_value: '1000',
      amount_paid: '0',
      status: 'Pending'
    } as any;

    const mockProperty = {
      id: 'p1',
      title_ar: 'مشروع الأندلس',
      title_en: 'Al-Andalus Project'
    } as any;

    const markup = renderToStaticMarkup(
      React.createElement(ZFCollectInstallmentModal, {
        isOpen: true,
        onClose: () => {},
        isAr: true,
        isMutating: false,
        contracts: [mockContract],
        schedules: [mockSchedule],
        properties: [mockProperty],
        initialContractId: 'c1',
        initialScheduleId: 's0',
        onConfirm: async () => {}
      })
    );

    assert.ok(markup.includes('ZF-1'), `Static markup must contain contract number 'ZF-1'`);
    assert.ok(markup.includes('دفعة المقدم'), `Static markup must contain down payment label 'دفعة المقدم'`);
  });
});
