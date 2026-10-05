import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { ERPContract, ERPInstallmentSchedule, ERPPDCRecord } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';

// Register .css and .module.css handlers so Node.js doesn't fail on CSS module imports
const cjsRequire = createRequire(import.meta.url);
cjsRequire.extensions['.css'] = (m: any) => { m.exports = {}; };
cjsRequire.extensions['.module.css'] = (m: any) => { m.exports = {}; };

describe('HandInstallmentsVaultView Overview Row & Shell Contracts', () => {
  let HandInstallmentsVaultView: any;

  before(async () => {
    const mod = await import('@/components/admin/erp/v2/views/HandInstallmentsVaultView');
    HandInstallmentsVaultView = mod.HandInstallmentsVaultView;
  });

  const mockProperties: Property[] = [
    {
      id: 'prop-privado',
      title_ar: 'شقة رووف كاملة مع السطح – مدينتي بريفادو',
      title_en: 'Madinaty Privado Roof Suite & Sky Slab',
      slug: 'privado-roof',
      created_at: '2026-01-01',
      updated_at: '2026-01-01'
    } as unknown as Property
  ];

  const mockContracts: ERPContract[] = [
    {
      contract_id: 'cnt-1',
      contract_number: 'ZF-2026-2452',
      property_id: 'prop-privado',
      buyer_name: 'Tarek Abdel-Rahman',
      unit_id: 'شقة رووف كاملة مع السطح – مدينتي بريفادو', // Identical to property title
      gross_contract_value: '2500000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-01-15',
      handover_status: 'Pending',
      total_cash_collected: '500000.00',
      status: 'Active'
    },
    {
      contract_id: 'cnt-2',
      contract_number: 'ZF-2026-9999',
      property_id: 'prop-privado',
      buyer_name: 'Dr. Sarah Smith',
      unit_id: 'شقة رووف كاملة مع السطح – مدينتي بريفادو - وحدة 104', // Suffix distinctive unit
      gross_contract_value: '3000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-02-01',
      handover_status: 'Pending',
      total_cash_collected: '600000.00',
      status: 'Active'
    }
  ];

  const mockSchedules: ERPInstallmentSchedule[] = [
    {
      schedule_id: 'sch-1',
      contract_id: 'cnt-1',
      schedule_version: 1,
      tranche_number: 1,
      nominal_value: '75000.00',
      due_date: '2026-04-01',
      amount_paid: '0.00',
      status: 'Pending'
    },
    {
      schedule_id: 'sch-2',
      contract_id: 'cnt-2',
      schedule_version: 1,
      tranche_number: 2,
      nominal_value: '90000.00',
      due_date: '2026-04-15',
      amount_paid: '0.00',
      status: 'Pending'
    }
  ];

  const mockPdcs: ERPPDCRecord[] = [
    {
      cheque_id: 'pdc-1',
      schedule_id: 'sch-1',
      contract_id: 'cnt-1',
      cheque_number: 'CHQ-20262452-001',
      bank_name: 'CIB',
      drawer_name: 'Tarek Abdel-Rahman',
      nominal_value: '75000.00',
      due_date: '2026-04-01',
      status: 'In Safe'
    }
  ];

  it('1. Table Overview Row: Omits contract number from buyer column and instrument number from tranche column', () => {
    const html = renderToStaticMarkup(
      React.createElement(HandInstallmentsVaultView, {
        pdcRecords: mockPdcs,
        contracts: mockContracts,
        schedules: mockSchedules,
        properties: mockProperties,
        isAr: true,
        onCollectItem: () => {},
        onOpenNewCheque: () => {}
      })
    );

    // Extract table tbody rows
    const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
    assert.ok(tbodyMatch, 'Table tbody must be rendered');
    const tbodyHtml = tbodyMatch[1];

    // Buyer column must NOT contain contract number subtitle in table overview row
    assert.ok(
      !tbodyHtml.includes('عقد #ZF-2026-2452'),
      'Overview row buyer cell must NOT render عقد #ZF-2026-2452'
    );
    assert.ok(
      !tbodyHtml.includes('Contract #ZF-2026-2452'),
      'Overview row buyer cell must NOT render Contract #ZF-2026-2452'
    );

    // Tranche column must NOT contain instrument number subtitle in table overview row
    assert.ok(
      !tbodyHtml.includes('#CHQ-20262452-001'),
      'Overview row tranche cell must NOT render #CHQ-20262452-001'
    );
  });

  it('2. Table Overview Row: Deduplicates matching project title and unit identifier', () => {
    const html = renderToStaticMarkup(
      React.createElement(HandInstallmentsVaultView, {
        pdcRecords: mockPdcs,
        contracts: mockContracts,
        schedules: mockSchedules,
        properties: mockProperties,
        isAr: true,
        onCollectItem: () => {},
        onOpenNewCheque: () => {}
      })
    );

    const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
    assert.ok(tbodyMatch, 'Table tbody must be rendered');
    const tbodyHtml = tbodyMatch[1];

    // For cnt-1 where unit_id === projectTitle, the title should only be rendered once in the td
    // Find the row for Tarek Abdel-Rahman
    const rows = tbodyHtml.split(/<tr[^>]*>/).filter(Boolean);
    const tarekRow = rows.find(r => r.includes('Tarek Abdel-Rahman'));
    assert.ok(tarekRow, 'Row for Tarek Abdel-Rahman must exist');

    const titleOccurrences = (tarekRow.match(/شقة رووف كاملة مع السطح – مدينتي بريفادو/g) || []).length;
    assert.strictEqual(
      titleOccurrences,
      1,
      'Project title must only be rendered ONCE when unit_id is identical to project title'
    );

    // For cnt-2 where unit_id has distinctive suffix, distinctive suffix "وحدة 104" is rendered
    const sarahRow = rows.find(r => r.includes('Dr. Sarah Smith'));
    assert.ok(sarahRow, 'Row for Dr. Sarah Smith must exist');
    assert.ok(
      sarahRow.includes('وحدة 104'),
      'Distinctive unit suffix must be rendered when different from project title'
    );
  });

  it('3. Discrete KPI Cards: Renders executive metrics with embedded wave sparklines', () => {
    const html = renderToStaticMarkup(
      React.createElement(HandInstallmentsVaultView, {
        pdcRecords: mockPdcs,
        contracts: mockContracts,
        schedules: mockSchedules,
        properties: mockProperties,
        isAr: true,
        onCollectItem: () => {},
        onOpenNewCheque: () => {}
      })
    );

    // Verify wave sparkline linear gradients are rendered in the KPI cards
    assert.ok(
      html.includes('sparkline-grad-'),
      'HandInstallmentsVaultView KPI cards must render embedded wave sparkline SVG gradients'
    );

    // Verify all 4 discrete cards titles are rendered
    assert.ok(html.includes('المقبوضات الواردة'), 'Card 1 title must exist');
    assert.ok(html.includes('المدفوعات والالتزامات'), 'Card 2 title must exist');
    assert.ok(html.includes('صافي التدفق المتوقع'), 'Card 3 title must exist');
    assert.ok(html.includes('الاستحقاقات العاجلة'), 'Card 4 title must exist');

    // Verify subtitles are rendered
    assert.ok(html.includes('المحصل'), 'Card 1 subtitle label must exist');
    assert.ok(html.includes('المسدد'), 'Card 2 subtitle label must exist');
    assert.ok(html.includes('الفارق'), 'Card 3 subtitle label must exist');
    assert.ok(html.includes('الحالات العاجلة'), 'Card 4 subtitle label must exist');
  });
});

