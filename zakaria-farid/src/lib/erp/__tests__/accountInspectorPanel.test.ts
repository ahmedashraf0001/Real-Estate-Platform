import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import { D, Decimal } from '@/lib/erp/math';
import { ERPAccount, NormalBalance } from '@/lib/erp/types';

// Register .css and .module.css handlers
const cjsRequire = createRequire(import.meta.url);
cjsRequire.extensions['.css'] = (m: any) => { m.exports = {}; };
cjsRequire.extensions['.module.css'] = (m: any) => { m.exports = {}; };

const computeNet = (balance: NormalBalance, debits: Decimal, credits: Decimal): Decimal =>
  balance === 'DEBIT' ? debits.minus(credits) : credits.minus(debits);

describe('Account Inspector Domain Suite', () => {
  let AccountInspectorPanel: any;
  let COAFileExplorer: any;

  before(async () => {
    const mod1 = await import('@/components/admin/erp/v2/views/AccountInspectorPanel');
    AccountInspectorPanel = mod1.AccountInspectorPanel;
    const mod2 = await import('@/components/admin/erp/v2/views/COAFileExplorer');
    COAFileExplorer = mod2.COAFileExplorer;
  });

  it('computes correct net balance for debit-normal asset accounts', () => {
    const acc = CANONICAL_COA['101000']; // Cash in Safe (DEBIT normal)
    assert.equal(acc.normal_balance, 'DEBIT');

    const stats = { debits: D(500000), credits: D(120000), count: 5 };
    const net = computeNet(acc.normal_balance, stats.debits, stats.credits);

    assert.equal(net.toNumber(), 380000);
    assert.equal(net.formatEGP(true), '380,000.00 ج.م');
  });

  it('computes correct net balance for credit-normal liability and revenue accounts', () => {
    const apAcc = CANONICAL_COA['201000']; // Accounts Payable (CREDIT normal)
    assert.equal(apAcc.normal_balance, 'CREDIT');

    const stats = { debits: D(100000), credits: D(450000), count: 8 };
    const net = computeNet(apAcc.normal_balance, stats.debits, stats.credits);

    assert.equal(net.toNumber(), 350000);
    assert.equal(net.formatEGP(true), '350,000.00 ج.م');
  });

  it('classifies account code hierarchy levels accurately', () => {
    const getLevelText = (code: string, isAr = true) => {
      if (code.length === 1) return isAr ? 'المستوى الأول (رئيسي)' : 'Level 1 (Root)';
      if (code.length === 2) return isAr ? 'المستوى الثاني (مجموعة)' : 'Level 2 (Group)';
      return isAr ? 'المستوى الثالث (حساب تحليلي)' : 'Level 3 (Analytical Account)';
    };

    assert.equal(getLevelText('1', true), 'المستوى الأول (رئيسي)');
    assert.equal(getLevelText('11', true), 'المستوى الثاني (مجموعة)');
    assert.equal(getLevelText('101000', true), 'المستوى الثالث (حساب تحليلي)');
  });

  it('AccountInspectorPanel: renders streamlined layout and purges dead buttons', () => {
    const acc = CANONICAL_COA['101000'];
    const html = renderToStaticMarkup(
      React.createElement(AccountInspectorPanel, {
        selectedAccount: acc,
        isAr: true,
        accountStats: {
          '101000': { debits: D(500000), credits: D(120000), count: 5 }
        },
        onOpenLedgerModal: () => {},
        onFilterInJournal: () => {},
        onClose: () => {}
      })
    );

    // Verify presence of functional buttons
    assert.ok(html.includes('كشف الحساب التفصيلي'), 'Must contain detailed statement button');
    assert.ok(html.includes('عرض الحركات في اليومية'), 'Must contain view in journal button');
    assert.ok(html.includes('إغلاق المعاينة'), 'Must contain close button');

    // Verify elimination of non-functional dead buttons
    assert.ok(!html.includes('حساب جديد'), 'Must NOT contain dead new account button');
    assert.ok(!html.includes('حساب فرعي'), 'Must NOT contain dead sub-account button');
    assert.ok(!html.includes('أرشفة'), 'Must NOT contain dead archive button');
    assert.ok(!html.includes('نقل'), 'Must NOT contain dead move button');
  });

  it('COAFileExplorer: renders account items with clean name and omits raw code in visible label', () => {
    const html = renderToStaticMarkup(
      React.createElement(COAFileExplorer, {
        isAr: true,
        selectedAccountCode: '101000',
        accountStats: {
          '101000': { debits: D(0), credits: D(0), count: 0 }
        }
      })
    );

    // Account name should be present
    assert.ok(html.includes('خزينة النقدية الرئيسية (كاش باليد)'), 'Account name must be present in tree');

    // In the tree row, treeAccountCode is omitted
    assert.ok(!html.includes('treeAccountCode'), 'treeAccountCode class must NOT be rendered in tree row');
  });

  it('AccountInspectorPanel: renders semantic category icon when category is selected without account', () => {
    const html = renderToStaticMarkup(
      React.createElement(AccountInspectorPanel, {
        isAr: true,
        selectedCategory: {
          id: 'cat_1',
          code: '1',
          title: 'الأصول',
          accountCodes: ['101000', '102000']
        },
        accountStats: {},
        onClose: () => {}
      })
    );

    assert.ok(html.includes('الأصول'), 'Must show category title');
    assert.ok(html.includes('lucide-building-2') || html.includes('lucide-building'), 'Must render semantic category icon (Building2/Building) instead of fallback Layers');
    assert.ok(!html.includes('lucide-layers'), 'Must NOT fall back to Layers for category 1');
  });
});
