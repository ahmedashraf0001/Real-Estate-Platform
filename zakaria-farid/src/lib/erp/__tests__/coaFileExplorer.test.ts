import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { HIERARCHY_STRUCTURE } from '@/lib/erp/coaHierarchy';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import {
  getAccountSemanticIconName,
  getAccountSemanticIcon,
  getCategorySemanticIconName
} from '@/lib/erp/accountSemanticIcons';

const cjsRequire = createRequire(import.meta.url);
try {
  cjsRequire.extensions['.css'] = (m: any) => { m.exports = {}; };
  cjsRequire.extensions['.module.css'] = (m: any) => { m.exports = {}; };
} catch (_) {}

describe('COAFileExplorer Hierarchy Suite', () => {
  let COAFileExplorer: any;

  before(async () => {
    const mod = await import('@/components/admin/erp/v2/views/COAFileExplorer');
    COAFileExplorer = mod.COAFileExplorer;
  });

  it('contains all 5 canonical root categories matching FIN-OS ledger spec', () => {
    assert.equal(HIERARCHY_STRUCTURE.length, 5);
    const codes = HIERARCHY_STRUCTURE.map(c => c.code);
    assert.deepEqual(codes, ['1', '2', '3', '4', '5']);
  });

  it('maps all subcategories to valid accounts in CANONICAL_COA', () => {
    HIERARCHY_STRUCTURE.forEach(cat => {
      cat.subcategories.forEach(sub => {
        assert.ok(sub.accountCodes.length > 0, `Subcategory ${sub.code} must have at least one account`);
        sub.accountCodes.forEach(code => {
          assert.ok(CANONICAL_COA[code], `Account code ${code} in subcategory ${sub.code} must exist in CANONICAL_COA`);
        });
      });
    });
  });

  it('accurately resolves category matches for search queries', () => {
    const query = 'نقدية';
    const cat1 = HIERARCHY_STRUCTURE[0]; // Assets
    const sub11 = cat1.subcategories[0]; // Cash & Current Assets

    const hasMatch = sub11.accountCodes.some(code => {
      const acc = CANONICAL_COA[code];
      return acc && acc.account_name_ar.includes(query);
    });

    assert.ok(hasMatch, 'Should find matching account for query "نقدية"');
  });

  it('resolves semantic icon names for all 5 root categories', () => {
    assert.equal(getCategorySemanticIconName('1'), 'Building2', 'Category 1 must map to Building2');
    assert.equal(getCategorySemanticIconName('2'), 'Scale', 'Category 2 must map to Scale');
    assert.equal(getCategorySemanticIconName('3'), 'Award', 'Category 3 must map to Award');
    assert.equal(getCategorySemanticIconName('4'), 'TrendingUp', 'Category 4 must map to TrendingUp');
    assert.equal(getCategorySemanticIconName('5'), 'Receipt', 'Category 5 must map to Receipt');
  });

  it('resolves semantic icon names for domain-specific account prefixes', () => {
    assert.equal(getAccountSemanticIconName('101000'), 'Wallet', '101 cash in safe -> Wallet');
    assert.equal(getAccountSemanticIconName('102000'), 'Landmark', '102 banks -> Landmark');
    assert.equal(getAccountSemanticIconName('103000'), 'Users', '103 receivables -> Users');
    assert.equal(getAccountSemanticIconName('104000'), 'HandCoins', '104 advances -> HandCoins');
    assert.equal(getAccountSemanticIconName('105000'), 'Boxes', '105 inventory -> Boxes');
    assert.equal(getAccountSemanticIconName('106000'), 'Building', '106 projects under construction -> Building');
    assert.equal(getAccountSemanticIconName('107000'), 'Building', '107 fixed assets -> Building');
    assert.equal(getAccountSemanticIconName('150000'), 'HardHat', '15 construction -> HardHat');
    assert.equal(getAccountSemanticIconName('201000'), 'Truck', '201 suppliers -> Truck');
    assert.equal(getAccountSemanticIconName('202000'), 'Briefcase', '202 loans / subcontractors -> Briefcase');
    assert.equal(getAccountSemanticIconName('204000'), 'Percent', '204 real estate disposition taxes -> Percent');
    assert.equal(getAccountSemanticIconName('205000'), 'Percent', '205 taxes -> Percent');
    assert.equal(getAccountSemanticIconName('206200'), 'HandCoins', '206 customer refund liability -> HandCoins');
    assert.equal(getAccountSemanticIconName('207000'), 'ShieldCheck', '207 escrow trust liability -> ShieldCheck');
    assert.equal(getAccountSemanticIconName('301000'), 'PiggyBank', '301 capital -> PiggyBank');
    assert.equal(getAccountSemanticIconName('302000'), 'ShieldCheck', '302 retained earnings -> ShieldCheck');
    assert.equal(getAccountSemanticIconName('401000'), 'Home', '401 property sales -> Home');
    assert.equal(getAccountSemanticIconName('402000'), 'Coins', '402 other revenue -> Coins (must not be shadowed by 40 prefix)');
    assert.equal(getAccountSemanticIconName('403000'), 'TrendingUp', '403 general revenue -> TrendingUp (must not be shadowed by 40 prefix)');
    assert.equal(getAccountSemanticIconName('430100'), 'Coins', '430 cancellation penalty revenue -> Coins');
    assert.equal(getAccountSemanticIconName('440000'), 'TrendingUp', '440 FX gain/loss -> TrendingUp');
    assert.equal(getAccountSemanticIconName('501000'), 'Wrench', '501 cost of sales -> Wrench');
    assert.equal(getAccountSemanticIconName('502000'), 'FileMinus', '502 operating expenses -> FileMinus');
    assert.equal(getAccountSemanticIconName('503000'), 'Wrench', '503 COGS duplexes -> Wrench');
    assert.equal(getAccountSemanticIconName('504000'), 'Wrench', '504 COGS suites -> Wrench');
    assert.equal(getAccountSemanticIconName('601000'), 'Megaphone', '601 marketing -> Megaphone');
    assert.equal(getAccountSemanticIconName('602000'), 'Briefcase', '602 G&A -> Briefcase');
    assert.equal(getAccountSemanticIconName('603000'), 'Truck', '603 site administration -> Truck');
    assert.equal(getAccountSemanticIconName('999999'), 'Layers', 'Unknown prefix -> fallback Layers');
  });

  it('renders valid SVG elements for all semantic icons without falling back to Layers', () => {
    const testCodes = ['601000', '602000', '603000', '204000', '206200', '207000', '402000'];
    testCodes.forEach(code => {
      const el = getAccountSemanticIcon(code);
      const html = renderToStaticMarkup(el);
      assert.ok(html.includes('<svg'), `Code ${code} must render an SVG element`);
      assert.ok(!html.includes('lucide-layers'), `Code ${code} must not fall back to Layers`);
    });
  });

  it('renders COAFileExplorer with semantic icons and zero folder icon artifacts', () => {
    const html = renderToStaticMarkup(
      React.createElement(COAFileExplorer, {
        isAr: true,
        selectedAccountCode: '101000',
        accountStats: {}
      })
    );

    // Verify folder icons are purged
    assert.ok(!html.includes('lucide-folder'), 'Must NOT render any lucide folder icons');
    assert.ok(!html.includes('FolderTree'), 'Must NOT render FolderTree');
    assert.ok(!html.includes('FolderPlus'), 'Must NOT render FolderPlus');

    // Verify semantic header icon and title
    assert.ok(html.includes('هيكل الحسابات'), 'Header must state "هيكل الحسابات"');
    assert.ok(html.includes('lucide-layers'), 'Header icon must be Layers (lucide-layers)');

    // Verify category icons exist
    assert.ok(html.includes('lucide-building-2') || html.includes('lucide-building'), 'Category icons must be present');
    assert.ok(html.includes('lucide-scale'), 'Liabilities icon (lucide-scale) must be present');
  });

  it('renders semantic account and category icons in crisp squircle containers per R4, R10 and better-ui R4', () => {
    const html = renderToStaticMarkup(
      React.createElement(COAFileExplorer, {
        isAr: true,
        selectedAccountCode: '101000',
        accountStats: {}
      })
    );

    // Verify squircle container styles (border, border-radius, background)
    assert.ok(html.includes('border-radius:7px') || html.includes('border-radius:6px'), 'Category squircle must use concentric border-radius');
    assert.ok(html.includes('var(--erp-accent-subtle'), 'Squircle container must consume var(--erp-accent-subtle)');
    assert.ok(html.includes('var(--erp-accent-tint'), 'Squircle container must consume var(--erp-accent-tint)');
    assert.ok(html.includes('border-radius:5px'), 'Account squircle container must use 5px radius');
  });
});
