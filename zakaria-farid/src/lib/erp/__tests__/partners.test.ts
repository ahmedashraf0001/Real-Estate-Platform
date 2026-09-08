import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PartnersEngine } from '../partnersEngine';
import { InvariantsValidator } from '../invariants';
import { ERPPartnerProfile, ERPPartnerTransaction } from '../types';
import { Property } from '@/lib/supabase/types';
import { D } from '../math';

describe('Partners & Project Financiers Financial Engine (§14.B & INV-4.1)', () => {

  it('INV-4.1: Partner Profit Payout creates a balanced journal entry (Dr 303000 / Cr 101000 or 102000)', () => {
    const payoutJe = PartnersEngine.createPayoutJournalEntry({
      partnerName: 'م. أحمد الشريف',
      amount: '500000.00',
      paymentMethod: 'CASH_101000',
      propertyTitle: 'عمارة الفردوس',
      receiptRef: 'PAY-TEST-001',
      currentPeriod: 'prd-2026-03',
      loggedBy: 'CHIEF_ACCOUNTANT'
    });

    // Check balance with InvariantsValidator
    const balanceCheck = InvariantsValidator.verifyDoubleEntryBalance([payoutJe]);
    assert.strictEqual(balanceCheck.passed, true, 'Payout JE must be strictly balanced');

    // Check accounts: Debit 303000, Credit 101000
    const debitLine = payoutJe.lines.find(l => l.account_code === '303000');
    const creditLine = payoutJe.lines.find(l => l.account_code === '101000');

    assert.ok(debitLine, 'Must debit account 303000 (Partner Profit Distributions)');
    assert.strictEqual(debitLine.debit_amount, '500000.00');
    assert.strictEqual(debitLine.credit_amount, '0.00');

    assert.ok(creditLine, 'Must credit account 101000 (Cash Vault)');
    assert.strictEqual(creditLine.debit_amount, '0.00');
    assert.strictEqual(creditLine.credit_amount, '500000.00');
  });

  it('INV-4.1: Partner Capital Injection creates a balanced journal entry (Dr 102000 / Cr 301000)', () => {
    const injectionJe = PartnersEngine.createCapitalInjectionJournalEntry({
      partnerName: 'د. هاني المنياوي',
      amount: '2000000.00',
      paymentMethod: 'INSTAPAY_102000',
      propertyTitle: 'برج الصفوة',
      receiptRef: 'REC-TEST-001',
      currentPeriod: 'prd-2026-03',
      loggedBy: 'CHIEF_ACCOUNTANT'
    });

    // Check balance
    const balanceCheck = InvariantsValidator.verifyDoubleEntryBalance([injectionJe]);
    assert.strictEqual(balanceCheck.passed, true, 'Capital injection JE must be strictly balanced');

    // Check accounts: Debit 102000, Credit 301000
    const debitLine = injectionJe.lines.find(l => l.account_code === '102000');
    const creditLine = injectionJe.lines.find(l => l.account_code === '301000');

    assert.ok(debitLine, 'Must debit account 102000 (Operating Bank / InstaPay)');
    assert.strictEqual(debitLine.debit_amount, '2000000.00');
    assert.strictEqual(debitLine.credit_amount, '0.00');

    assert.ok(creditLine, 'Must credit account 301000 (Partner Capital)');
    assert.strictEqual(creditLine.debit_amount, '0.00');
    assert.strictEqual(creditLine.credit_amount, '2000000.00');
  });

  it('INV-Partnership-100%: Aggregates project partnership cards and enforces 100% equity check', () => {
    const mockProperty: Property = {
      id: 'prop-test-1',
      title_ar: 'عمارة النخيل',
      title_en: 'Palm Mansion',
      location: 'منيا القمح',
      price_egp: 20000000,
      total_units_count: 8,
      partner_splits: [
        { partnerName: 'م. أحمد الشريف', sharePct: 35 },
        { partnerName: 'الحاج رجب الصاوي', sharePct: 25 }
      ]
    } as any;

    const cards = PartnersEngine.getProjectPartnershipCards([mockProperty], [], []);
    assert.strictEqual(cards.length, 1);

    const card = cards[0];
    assert.strictEqual(card.propertyId, 'prop-test-1');

    // Sum of partner shares must equal 100%
    const totalSplitPct = card.partners.reduce((sum, p) => sum + p.sharePct, 0);
    assert.strictEqual(totalSplitPct, 100, 'Primary developer must hold the balancing share (40%)');

    const primaryPartner = card.partners.find(p => p.name === 'زكريا فريد');
    assert.ok(primaryPartner, 'Primary developer must exist in the partners list');
    assert.strictEqual(primaryPartner.sharePct, 40, 'Zakaria Farid gets 100 - (35 + 25) = 40%');
  });

  it('Zero-float partner balances: Collections share minus distributions paid equals net balance', () => {
    const mockProfiles: ERPPartnerProfile[] = [
      {
        id: 'pt-1',
        name: 'م. أحمد الشريف',
        role: 'equity_partner',
        joined_date: '2025-01-01'
      }
    ];

    const mockTransactions: ERPPartnerTransaction[] = [
      {
        id: 'tx-1',
        transaction_number: 'PT-2026-001',
        partner_name: 'م. أحمد الشريف',
        type: 'CAPITAL_INJECTION',
        amount: '1000000.00',
        payment_method: 'BANK_102000',
        date: '2026-01-01',
        memo: 'ضخ رأس مال مبدئي',
        status: 'COMPLETED'
      },
      {
        id: 'tx-2',
        transaction_number: 'PT-2026-002',
        partner_name: 'م. أحمد الشريف',
        type: 'PROFIT_DISTRIBUTION',
        amount: '350000.00',
        payment_method: 'BANK_102000',
        date: '2026-02-01',
        memo: 'توزيع دفعة أرباح',
        status: 'COMPLETED'
      }
    ];

    const summaries = PartnersEngine.calculatePartnerSummaries(mockProfiles, [], [], mockTransactions, []);
    const sharifSummary = summaries.find(s => s.partnerName === 'م. أحمد الشريف');

    assert.ok(sharifSummary, 'Sharif summary must be calculated');
    assert.strictEqual(sharifSummary.totalContributedCapital, '1000000.00');
    assert.strictEqual(sharifSummary.totalDistributionsPaid, '350000.00');
    // Net balance = Collections share (0) - Distributions paid (350000) = -350000.00
    assert.strictEqual(sharifSummary.netCurrentBalance, '-350000.00');
  });

  it('Double-counting fix: Explicit contract splits take precedence and are not added twice', () => {
    const mockProfiles: ERPPartnerProfile[] = [
      {
        id: 'pt-1',
        name: 'م. أحمد الشريف',
        role: 'equity_partner',
        joined_date: '2025-01-01'
      }
    ];

    const mockProperty: Property = {
      id: 'prop-test-2',
      title_ar: 'عمارة الياسمين',
      title_en: 'Jasmine Mansion',
      location: 'منيا القمح',
      price_egp: 10000000,
      total_units_count: 4,
      partner_splits: [
        { partnerName: 'م. أحمد الشريف', sharePct: 40 }
      ]
    } as any;

    const mockContracts: any[] = [
      // Contract 1: explicit partner splits (40% = 800,000 sales, 400,000 cash)
      {
        contract_id: 'cnt-1',
        contract_number: 'ZF-2026-1001',
        unit_id: 'U-01',
        property_id: 'prop-test-2',
        buyer_name: 'Buyer A',
        gross_contract_value: '2000000.00',
        total_cash_collected: '1000000.00',
        currency: 'EGP',
        exchange_rate: '1.0000',
        handover_status: 'Pending',
        status: 'Active',
        contract_date: '2026-01-01',
        partner_splits: [
          {
            partner_name: 'م. أحمد الشريف',
            share_percentage: '40%',
            share_amount: '800000.00',
            cash_share: '400000.00'
          },
          {
            partner_name: 'زكريا فريد',
            share_percentage: '60%',
            share_amount: '1200000.00',
            cash_share: '600000.00'
          }
        ]
      },
      // Contract 2: no explicit splits (falls back to 40% = 1,200,000 sales, 600,000 cash)
      {
        contract_id: 'cnt-2',
        contract_number: 'ZF-2026-1002',
        unit_id: 'U-02',
        property_id: 'prop-test-2',
        buyer_name: 'Buyer B',
        gross_contract_value: '3000000.00',
        total_cash_collected: '1500000.00',
        currency: 'EGP',
        exchange_rate: '1.0000',
        handover_status: 'Pending',
        status: 'Active',
        contract_date: '2026-02-01'
      }
    ];

    const summaries = PartnersEngine.calculatePartnerSummaries(
      mockProfiles,
      [mockProperty],
      mockContracts,
      [],
      []
    );

    const sharifSummary = summaries.find(s => s.partnerName === 'م. أحمد الشريف');
    assert.ok(sharifSummary, 'Sharif summary must be calculated');

    const holding = sharifSummary.holdings.find(h => h.propertyId === 'prop-test-2');
    assert.ok(holding, 'Holding must be found for property');

    // Expected contractSalesShare: 800,000 + (40% * 3,000,000 = 1,200,000) = 2,000,000.00
    // Previously with double-counting bug: 40% * 5,000,000 (2,000,000) + 800,000 = 2,800,000.00
    assert.strictEqual(holding.contractSalesShare, '2000000.00', 'Sales share must NOT double count explicit splits');

    // Expected collectionsShare: 400,000 + (40% * 1,500,000 = 600,000) = 1,000,000.00
    // Previously with double-counting bug: 40% * 2,500,000 (1,000,000) + 400,000 = 1,400,000.00
    assert.strictEqual(holding.collectionsShare, '1000000.00', 'Collections share must NOT double count explicit splits');

    // Also assert getProjectPartnershipCards / aggregateProjectPartnershipCards matches
    const cards = PartnersEngine.getProjectPartnershipCards([mockProperty], mockContracts, []);
    const sharifCard = cards[0].partners.find(p => p.name === 'م. أحمد الشريف');
    assert.ok(sharifCard, 'Sharif card must be present');
    assert.strictEqual(sharifCard.salesShare, '2000000.00', 'Project card salesShare must match explicit splits');
    assert.strictEqual(sharifCard.collectionsShare, '1000000.00', 'Project card collectionsShare must match explicit splits');

    // Verify aggregateProjectPartnershipCards alias
    const aliasCards = PartnersEngine.aggregateProjectPartnershipCards([mockProperty], mockContracts, []);
    assert.strictEqual(aliasCards[0].partners.find(p => p.name === 'م. أحمد الشريف')?.salesShare, '2000000.00');
  });

  it('Explicit 0% split: Partner with 0% explicit split on a contract receives strictly 0.00 EGP', () => {
    const mockProfiles: ERPPartnerProfile[] = [
      {
        id: 'pt-1',
        name: 'م. أحمد الشريف',
        role: 'equity_partner',
        joined_date: '2025-01-01'
      }
    ];

    const mockProperty: Property = {
      id: 'prop-zero-split',
      title_ar: 'مشروع الحصة الصفرية',
      title_en: 'Zero Split Project',
      location: 'منيا القمح',
      price_egp: 5000000,
      total_units_count: 2,
      partner_splits: [
        { partnerName: 'م. أحمد الشريف', sharePct: 30 }
      ]
    } as any;

    const mockContracts: any[] = [
      {
        contract_id: 'cnt-zero',
        contract_number: 'ZF-2026-ZERO',
        unit_id: 'U-ZERO',
        property_id: 'prop-zero-split',
        buyer_name: 'Zero Buyer',
        gross_contract_value: '2000000.00',
        total_cash_collected: '1000000.00',
        currency: 'EGP',
        exchange_rate: '1.0000',
        handover_status: 'Pending',
        status: 'Active',
        contract_date: '2026-03-01',
        partner_splits: [
          {
            partner_name: 'م. أحمد الشريف',
            share_percentage: '0%',
            share_amount: '0.00',
            cash_share: '0.00'
          },
          {
            partner_name: 'زكريا فريد',
            share_percentage: '100%',
            share_amount: '2000000.00',
            cash_share: '1000000.00'
          }
        ]
      }
    ];

    const summaries = PartnersEngine.calculatePartnerSummaries(
      mockProfiles,
      [mockProperty],
      mockContracts,
      [],
      []
    );

    const sharif = summaries.find(s => s.partnerName === 'م. أحمد الشريف');
    assert.ok(sharif);
    const holding = sharif.holdings.find(h => h.propertyId === 'prop-zero-split');
    assert.ok(holding);
    assert.strictEqual(holding.contractSalesShare, '0.00', '0% explicit split must yield exactly 0.00 sales share');
    assert.strictEqual(holding.collectionsShare, '0.00', '0% explicit split must yield exactly 0.00 collections share');

    const cards = PartnersEngine.getProjectPartnershipCards([mockProperty], mockContracts, []);
    const sharifCard = cards[0].partners.find(p => p.name === 'م. أحمد الشريف');
    assert.strictEqual(sharifCard?.salesShare, '0.00');
    assert.strictEqual(sharifCard?.collectionsShare, '0.00');
  });
});
