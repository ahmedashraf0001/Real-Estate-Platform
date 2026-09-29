import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TAB_REDIRECT_MAP, resolveTabRedirect, isSideWidgetsTab } from '../routing/tabRedirectMap';

describe('FIN-OS Tab Redirection & Backward Compatibility Suite', () => {
  it('maps all 12 core modules and legacy aliases correctly', () => {
    assert.strictEqual(TAB_REDIRECT_MAP.dashboard.path, '');
    assert.strictEqual(TAB_REDIRECT_MAP.cockpit.path, '');
    assert.strictEqual(TAB_REDIRECT_MAP.operations.path, 'operations');
    assert.strictEqual(TAB_REDIRECT_MAP.portfolio.path, 'properties');
    assert.strictEqual(TAB_REDIRECT_MAP.properties.path, 'properties');
    assert.strictEqual(TAB_REDIRECT_MAP.construction.path, 'construction');
    assert.strictEqual(TAB_REDIRECT_MAP.payables.path, 'construction');
    assert.strictEqual(TAB_REDIRECT_MAP.feasibility.path, 'calculator');
    assert.strictEqual(TAB_REDIRECT_MAP.calculator.path, 'calculator');
    assert.strictEqual(TAB_REDIRECT_MAP.contracts.path, 'contracts');
    assert.strictEqual(TAB_REDIRECT_MAP.registry.path, 'contracts');
    assert.strictEqual(TAB_REDIRECT_MAP.handover.path, 'contracts');
    assert.strictEqual(TAB_REDIRECT_MAP.handover.defaultSub, 'handover');
    assert.strictEqual(TAB_REDIRECT_MAP.pdc.path, 'pdc');
    assert.strictEqual(TAB_REDIRECT_MAP.vault.path, 'pdc');
    assert.strictEqual(TAB_REDIRECT_MAP.rescissions.path, 'rescissions');
    assert.strictEqual(TAB_REDIRECT_MAP.ledger.path, 'ledger');
    assert.strictEqual(TAB_REDIRECT_MAP.journal.path, 'ledger');
    assert.strictEqual(TAB_REDIRECT_MAP.journal.defaultSub, 'journal');
    assert.strictEqual(TAB_REDIRECT_MAP['cost-allocation'].path, 'cost-allocation');
    assert.strictEqual(TAB_REDIRECT_MAP.rsv.path, 'cost-allocation');
    assert.strictEqual(TAB_REDIRECT_MAP.tax.path, 'tax');
    assert.strictEqual(TAB_REDIRECT_MAP.taxes.path, 'tax');
    assert.strictEqual(TAB_REDIRECT_MAP.partners.path, 'partners');
  });

  it('resolves legacy ?tab= to clean sub-route path', () => {
    const result = resolveTabRedirect('ar', { tab: 'operations' });
    assert.strictEqual(result, '/fin-os/ar/operations');
  });

  it('resolves root cockpit ?tab=dashboard to /fin-os/en', () => {
    const result = resolveTabRedirect('en', { tab: 'dashboard' });
    assert.strictEqual(result, '/fin-os/en');
  });

  it('preserves query parameters while stripping tab', () => {
    const result = resolveTabRedirect('ar', {
      tab: 'contracts',
      contractId: 'cnt-101',
      action: 'inspect'
    });
    assert.ok(result);
    assert.ok(result.startsWith('/fin-os/ar/contracts?'));
    assert.ok(result.includes('contractId=cnt-101'));
    assert.ok(result.includes('action=inspect'));
    assert.ok(!result.includes('tab='));
  });

  it('handles array-based query parameters seamlessly', () => {
    const result = resolveTabRedirect('ar', {
      tab: 'pdc',
      status: ['pending', 'cleared']
    });
    assert.ok(result);
    assert.ok(result.startsWith('/fin-os/ar/pdc?'));
    assert.ok(result.includes('status=pending'));
    assert.ok(result.includes('status=cleared'));
  });

  it('injects default sub-tab when specified by mapping', () => {
    const result = resolveTabRedirect('ar', { tab: 'handover' });
    assert.strictEqual(result, '/fin-os/ar/contracts?sub=handover');
  });

  it('respects existing sub parameter if already provided in query', () => {
    const result = resolveTabRedirect('ar', { tab: 'handover', sub: 'custom' });
    assert.strictEqual(result, '/fin-os/ar/contracts?sub=custom');
  });

  it('is case-insensitive for legacy tab values', () => {
    const upper = resolveTabRedirect('ar', { tab: 'OPERATIONS' });
    const mixed = resolveTabRedirect('en', { tab: 'Cost-Allocation' });
    assert.strictEqual(upper, '/fin-os/ar/operations');
    assert.strictEqual(mixed, '/fin-os/en/cost-allocation');
  });

  it('handles array-based tab parameter seamlessly by picking the first tab', () => {
    const result = resolveTabRedirect('ar', { tab: ['contracts', 'operations'], action: 'new' });
    assert.strictEqual(result, '/fin-os/ar/contracts?action=new');
  });

  it('falls back to default ar locale when locale is empty or missing', () => {
    const result = resolveTabRedirect('', { tab: 'operations' });
    assert.strictEqual(result, '/fin-os/ar/operations');
  });

  it('resolves legacy aliases such as rsv, vault, ap, feasibility, and investors', () => {
    assert.strictEqual(resolveTabRedirect('ar', { tab: 'rsv' }), '/fin-os/ar/cost-allocation');
    assert.strictEqual(resolveTabRedirect('ar', { tab: 'vault' }), '/fin-os/ar/pdc');
    assert.strictEqual(resolveTabRedirect('ar', { tab: 'ap' }), '/fin-os/ar/construction');
    assert.strictEqual(resolveTabRedirect('ar', { tab: 'payables' }), '/fin-os/ar/construction');
    assert.strictEqual(resolveTabRedirect('ar', { tab: 'feasibility' }), '/fin-os/ar/calculator');
    assert.strictEqual(resolveTabRedirect('ar', { tab: 'investors' }), '/fin-os/ar/partners');
    assert.strictEqual(resolveTabRedirect('ar', { tab: 'taxes' }), '/fin-os/ar/tax');
    assert.strictEqual(resolveTabRedirect('ar', { tab: 'journal' }), '/fin-os/ar/ledger?sub=journal');
  });

  it('preserves complex query params including propertyId, action, and Arabic strings', () => {
    const result = resolveTabRedirect('ar', {
      tab: 'calculator',
      propertyId: 'PROP-999',
      unitName: 'شقة 4B الدور الثالث'
    });
    assert.ok(result);
    assert.ok(result.startsWith('/fin-os/ar/calculator?'));
    assert.ok(result.includes('propertyId=PROP-999'));
    assert.ok(decodeURIComponent(result.replace(/\+/g, ' ')).includes('شقة 4B الدور الثالث'));
  });

  it('preserves existing sub parameter when resolving journal alias', () => {
    const result = resolveTabRedirect('ar', {
      tab: 'journal',
      sub: 'coa'
    });
    assert.strictEqual(result, '/fin-os/ar/ledger?sub=coa');
  });

  it('returns null if tab parameter is missing or invalid', () => {
    assert.strictEqual(resolveTabRedirect('ar', {}), null);
    assert.strictEqual(resolveTabRedirect('ar', { tab: '' }), null);
    assert.strictEqual(resolveTabRedirect('ar', { tab: 'unknown_nonexistent_tab' }), null);
    // @ts-expect-error test non-string
    assert.strictEqual(resolveTabRedirect('ar', { tab: 123 }), null);
  });

  it('correctly identifies companion tabs that render the side widgets container', () => {
    assert.strictEqual(isSideWidgetsTab('dashboard'), true);
    assert.strictEqual(isSideWidgetsTab('cockpit'), true);
    assert.strictEqual(isSideWidgetsTab('operations'), true);
    assert.strictEqual(isSideWidgetsTab('daily-operations'), true);

    // Dense analytical views must return false (full-width)
    assert.strictEqual(isSideWidgetsTab('ledger'), false);
    assert.strictEqual(isSideWidgetsTab('cost-allocation'), false);
    assert.strictEqual(isSideWidgetsTab('properties'), false);
    assert.strictEqual(isSideWidgetsTab('construction'), false);
    assert.strictEqual(isSideWidgetsTab('calculator'), false);
    assert.strictEqual(isSideWidgetsTab('contracts'), false);
    assert.strictEqual(isSideWidgetsTab('pdc'), false);
    assert.strictEqual(isSideWidgetsTab('rescissions'), false);
    assert.strictEqual(isSideWidgetsTab('tax'), false);
    assert.strictEqual(isSideWidgetsTab('partners'), true);

    // Corner cases
    // @ts-expect-error test empty/null
    assert.strictEqual(isSideWidgetsTab(null), false);
    // @ts-expect-error test undefined
    assert.strictEqual(isSideWidgetsTab(undefined), false);
    assert.strictEqual(isSideWidgetsTab(''), false);
  });
});
