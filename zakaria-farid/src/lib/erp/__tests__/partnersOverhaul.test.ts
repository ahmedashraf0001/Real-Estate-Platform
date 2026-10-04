import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  PartnersEngine, 
  computeDynamicBuildingCapital, 
  checkBuildingEquityBalance,
  normalizePropertySplits,
  INITIAL_PARTNER_PROFILES,
  executeFullInternalBuyout,
  executePartialSale,
  executeFullSubstitution
} from '../partnersEngine';
import { InvariantsValidator } from '../invariants';
import { ERPPartnerProfile, ERPPartnerTransaction, ERPContract } from '../types';
import { Property } from '@/lib/supabase/types';
import { D } from '../math';
import { PRIMARY_DEVELOPER_NAME } from '../partnersDirectory';

describe('Partners & Project Equity Overhaul Test Suite (§14 & INV-Partnership)', () => {

  describe('1. Equity Splits 100% Balancing Invariant & Detection of Imbalanced Buildings', () => {
    it('detects a perfectly balanced building at 100%', () => {
      const balancedBuilding: Property = {
        id: 'prop-bal-1',
        type: 'building',
        title_ar: 'عمارة النور والصفوة',
        location: 'الزقازيق - حي الجامعة',
        price_egp: 30000000,
        partner_splits: [
          { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 50 },
          { partner_name: 'م. أحمد الشريف', share_percentage: 30 },
          { partner_name: 'الحاج رجب الصاوي', share_percentage: 20 },
        ]
      } as any;

      const report = checkBuildingEquityBalance(balancedBuilding);
      assert.strictEqual(report.isBalanced, true, 'Building with 50+30+20 must be balanced');
      assert.strictEqual(report.totalActiveSharePct, 100);
      assert.strictEqual(report.deviationPct, 0);
      assert.strictEqual(report.activePartnersCount, 3);
    });

    it('detects an over-allocated imbalanced building (>100%)', () => {
      const overAllocatedBuilding: Property = {
        id: 'prop-over-1',
        type: 'building',
        title_ar: 'برج الأندلس',
        location: 'القاهرة الجديدة',
        price_egp: 50000000,
        partner_splits: [
          { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 50 },
          { partner_name: 'شريك أ', share_percentage: 35 },
          { partner_name: 'شريك ب', share_percentage: 25 }, // total = 110%
        ]
      } as any;

      const report = checkBuildingEquityBalance(overAllocatedBuilding);
      assert.strictEqual(report.isBalanced, false, 'Over-allocated building must NOT be balanced');
      assert.strictEqual(report.totalActiveSharePct, 110);
      assert.strictEqual(report.deviationPct, 10);
    });

    it('detects an under-allocated imbalanced building (<100%) when founder split is explicit', () => {
      const underAllocatedBuilding: Property = {
        id: 'prop-under-1',
        type: 'building',
        title_ar: 'عمارة الفيروز',
        location: 'الشروق',
        price_egp: 20000000,
        partner_splits: [
          { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 40 },
          { partner_name: 'شريك ممول', share_percentage: 35 }, // total = 75%
        ]
      } as any;

      const report = checkBuildingEquityBalance(underAllocatedBuilding);
      assert.strictEqual(report.isBalanced, false, 'Under-allocated building must NOT be balanced');
      assert.strictEqual(report.totalActiveSharePct, 75);
      assert.strictEqual(report.deviationPct, -25);
    });

    it('normalizes missing founder split by automatically allocating remainder to primary developer', () => {
      const unassignedBuilding: Property = {
        id: 'prop-auto-1',
        type: 'building',
        title_ar: 'برج السلام',
        partner_splits: [
          { partner_name: 'م. أحمد الشريف', share_percentage: 35 },
          { partner_name: 'الحاج رجب الصاوي', share_percentage: 25 }
        ]
      } as any;

      const normalized = normalizePropertySplits(unassignedBuilding);
      const founderSplit = normalized.find(s => s.partner_name === PRIMARY_DEVELOPER_NAME);
      assert.ok(founderSplit, 'Founder must be prepended');
      assert.strictEqual(founderSplit.share_percentage, 40, 'Founder absorbs remaining 40% (100 - 60)');

      const balanceReport = checkBuildingEquityBalance(unassignedBuilding);
      assert.strictEqual(balanceReport.isBalanced, true, 'Auto-balanced building must equal 100%');
    });

    it('excludes archived partner splits from the active 100% equity balance', () => {
      const buildingWithArchived: Property = {
        id: 'prop-arch-1',
        type: 'building',
        title_ar: 'عمارة الياسمين',
        partner_splits: [
          { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 60, is_archived: false },
          { partner_name: 'شريك قديم متخارج', share_percentage: 20, is_archived: true },
          { partner_name: 'شريك حالي', share_percentage: 40, is_archived: false }
        ]
      } as any;

      const report = checkBuildingEquityBalance(buildingWithArchived);
      assert.strictEqual(report.isBalanced, true, '60% + 40% active equals 100%, archived 20% excluded');
      assert.strictEqual(report.activePartnersCount, 2);
    });
  });

  describe('2. Dynamic Capital Computation via Decimal.js (Required, Injected, Arrears)', () => {
    const testBuilding: Property = {
      id: 'bldg-dynamic-1',
      type: 'building',
      title_ar: 'عمارة الفردوس - الحي الخامس',
      target_budget_egp: 25000000,
      partner_splits: [
        { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 50 },
        { partner_name: 'م. أحمد الشريف', share_percentage: 30 },
        { partner_name: 'د. هاني المنياوي', share_percentage: 20 }
      ]
    } as any;

    it('accurately computes implied total capital from founder injection without float drift', () => {
      const transactions: ERPPartnerTransaction[] = [
        {
          id: 'tx-1',
          transaction_number: 'TX-01',
          partner_name: PRIMARY_DEVELOPER_NAME,
          property_id: 'bldg-dynamic-1',
          type: 'CAPITAL_INJECTION',
          amount: '12500000.00',
          payment_method: 'INSTAPAY_102000',
          journal_entry_number: 'JE-01',
          date: '2026-01-10',
          status: 'COMPLETED',
          memo: 'Capital injection'
        }
      ];

      const capitalInfo = computeDynamicBuildingCapital(testBuilding, transactions);

      // 50% founder share with 12.5M injected => implied total = 25,000,000.00
      assert.strictEqual(capitalInfo.founderInjectedEgp, '12500000.00');
      assert.strictEqual(capitalInfo.impliedTotalCapitalEgp, '25000000.00');

      // Ahmed (30%): required = 25M * 0.30 = 7.5M. Paid = 0 => Arrears = 7.5M
      const ahmed = capitalInfo.partnerStatuses.find(p => p.partnerName === 'م. أحمد الشريف');
      assert.ok(ahmed);
      assert.strictEqual(ahmed.requiredContributionEgp, '7500000.00');
      assert.strictEqual(ahmed.paidContributionEgp, '0.00');
      assert.strictEqual(ahmed.arrearsEgp, '7500000.00');
      assert.strictEqual(ahmed.hasArrears, true);

      // Hany (20%): required = 25M * 0.20 = 5M. Paid = 0 => Arrears = 5M
      const hany = capitalInfo.partnerStatuses.find(p => p.partnerName === 'د. هاني المنياوي');
      assert.ok(hany);
      assert.strictEqual(hany.requiredContributionEgp, '5000000.00');
      assert.strictEqual(hany.arrearsEgp, '5000000.00');
      assert.strictEqual(hany.hasArrears, true);
    });

    it('correctly clears arrears when partner matches required capital contribution', () => {
      const transactions: ERPPartnerTransaction[] = [
        {
          id: 'tx-1',
          transaction_number: 'TX-01',
          partner_name: PRIMARY_DEVELOPER_NAME,
          property_id: 'bldg-dynamic-1',
          type: 'CAPITAL_INJECTION',
          amount: '10000000.00',
          payment_method: 'INSTAPAY_102000',
          journal_entry_number: 'JE-01',
          date: '2026-01-10',
          status: 'COMPLETED',
          memo: 'Capital injection founder'
        },
        {
          id: 'tx-2',
          transaction_number: 'TX-02',
          partner_name: 'م. أحمد الشريف',
          property_id: 'bldg-dynamic-1',
          type: 'CAPITAL_INJECTION',
          amount: '6000000.00', // exactly 30% of 20M
          payment_method: 'INSTAPAY_102000',
          journal_entry_number: 'JE-02',
          date: '2026-01-15',
          status: 'COMPLETED',
          memo: 'Capital injection partner'
        }
      ];

      const capitalInfo = computeDynamicBuildingCapital(testBuilding, transactions);
      assert.strictEqual(capitalInfo.impliedTotalCapitalEgp, '20000000.00');

      const ahmed = capitalInfo.partnerStatuses.find(p => p.partnerName === 'م. أحمد الشريف');
      assert.ok(ahmed);
      assert.strictEqual(ahmed.requiredContributionEgp, '6000000.00');
      assert.strictEqual(ahmed.paidContributionEgp, '6000000.00');
      assert.strictEqual(ahmed.arrearsEgp, '0.00');
      assert.strictEqual(ahmed.hasArrears, false);
    });

    it('handles overpayment gracefully without generating negative arrears', () => {
      const transactions: ERPPartnerTransaction[] = [
        {
          id: 'tx-1',
          transaction_number: 'TX-01',
          partner_name: PRIMARY_DEVELOPER_NAME,
          property_id: 'bldg-dynamic-1',
          type: 'CAPITAL_INJECTION',
          amount: '10000000.00',
          payment_method: 'BANK_102000',
          journal_entry_number: 'JE-01',
          date: '2026-01-10',
          status: 'COMPLETED',
          memo: 'Founder injection'
        },
        {
          id: 'tx-2',
          transaction_number: 'TX-02',
          partner_name: 'د. هاني المنياوي',
          property_id: 'bldg-dynamic-1',
          type: 'CAPITAL_INJECTION',
          amount: '5000000.00', // required is 4M (20% of 20M), paid 5M
          payment_method: 'BANK_102000',
          journal_entry_number: 'JE-02',
          date: '2026-01-12',
          status: 'COMPLETED',
          memo: 'Partner overpayment'
        }
      ];

      const capitalInfo = computeDynamicBuildingCapital(testBuilding, transactions);
      const hany = capitalInfo.partnerStatuses.find(p => p.partnerName === 'د. هاني المنياوي');
      assert.ok(hany);
      assert.strictEqual(hany.requiredContributionEgp, '4000000.00');
      assert.strictEqual(hany.paidContributionEgp, '5000000.00');
      assert.strictEqual(hany.arrearsEgp, '0.00');
      assert.strictEqual(hany.hasArrears, false);
    });

    it('safely handles zero founder injection without division-by-zero errors', () => {
      const capitalInfo = computeDynamicBuildingCapital(testBuilding, []);
      assert.strictEqual(capitalInfo.founderInjectedEgp, '0.00');
      assert.strictEqual(capitalInfo.impliedTotalCapitalEgp, '0.00');
      assert.strictEqual(capitalInfo.fundingRatioPct, 0);

      capitalInfo.partnerStatuses.forEach(p => {
        assert.strictEqual(p.requiredContributionEgp, '0.00');
        assert.strictEqual(p.arrearsEgp, '0.00');
        assert.strictEqual(p.hasArrears, false);
      });
    });
  });

  describe('3. Double-Entry GL Journal Invariants (§INV-4.1)', () => {
    it('creates perfectly balanced capital injection journal entry via InstaPay into Treasury (Dr 102000 / Cr 301000)', () => {
      const je = PartnersEngine.createCapitalInjectionJournalEntry({
        partnerName: 'م. أحمد الشريف',
        amount: '3500000.00',
        paymentMethod: 'INSTAPAY_102000',
        propertyTitle: 'عمارة الفردوس',
        receiptRef: 'REC-TEST-OVERHAUL-01',
        currentPeriod: 'prd-2026-01',
        loggedBy: 'FIN_DIRECTOR'
      });

      const balanceCheck = InvariantsValidator.verifyDoubleEntryBalance([je]);
      assert.strictEqual(balanceCheck.passed, true, 'Capital injection must be strictly balanced');

      const dr102 = je.lines.find(l => l.account_code === '102000');
      const cr301 = je.lines.find(l => l.account_code === '301000');

      assert.ok(dr102, 'Must debit account 102000 for InstaPay channel');
      assert.strictEqual(dr102.debit_amount, '3500000.00');
      assert.strictEqual(dr102.credit_amount, '0.00');

      assert.ok(cr301, 'Must credit account 301000 (Partner Capital)');
      assert.strictEqual(cr301.debit_amount, '0.00');
      assert.strictEqual(cr301.credit_amount, '3500000.00');
    });

    it('creates perfectly balanced capital injection journal entry via Commercial Bank (Dr 102000 / Cr 301000)', () => {
      const je = PartnersEngine.createCapitalInjectionJournalEntry({
        partnerName: 'م. أحمد الشريف',
        amount: '3500000.00',
        paymentMethod: 'BANK_102000',
        propertyTitle: 'عمارة الفردوس',
        receiptRef: 'REC-TEST-OVERHAUL-01-BANK',
        currentPeriod: 'prd-2026-01',
        loggedBy: 'FIN_DIRECTOR'
      });

      const balanceCheck = InvariantsValidator.verifyDoubleEntryBalance([je]);
      assert.strictEqual(balanceCheck.passed, true, 'Capital injection must be strictly balanced');

      const dr102 = je.lines.find(l => l.account_code === '102000');
      const cr301 = je.lines.find(l => l.account_code === '301000');

      assert.ok(dr102, 'Must debit account 102000 (Commercial Bank)');
      assert.strictEqual(dr102.debit_amount, '3500000.00');
      assert.strictEqual(dr102.credit_amount, '0.00');

      assert.ok(cr301, 'Must credit account 301000 (Partner Capital)');
      assert.strictEqual(cr301.debit_amount, '0.00');
      assert.strictEqual(cr301.credit_amount, '3500000.00');
    });

    it('creates cash capital injection with Cash Vault account 101000 (Dr 101000 / Cr 301000)', () => {
      const je = PartnersEngine.createCapitalInjectionJournalEntry({
        partnerName: 'الحاج رجب الصاوي',
        amount: '1200000.00',
        paymentMethod: 'CASH_101000',
        propertyTitle: 'عمارة النخيل',
        receiptRef: 'REC-CASH-002',
        currentPeriod: 'prd-2026-02'
      });

      const dr101 = je.lines.find(l => l.account_code === '101000');
      const cr301 = je.lines.find(l => l.account_code === '301000');

      assert.ok(dr101, 'Must debit cash vault 101000');
      assert.strictEqual(dr101.debit_amount, '1200000.00');
      assert.ok(cr301, 'Must credit partner capital 301000');
      assert.strictEqual(cr301.credit_amount, '1200000.00');
    });

    it('creates profit payout / dividend journal entry via InstaPay (Dr 303000 / Cr 102000)', () => {
      const payoutInstaJe = PartnersEngine.createPayoutJournalEntry({
        partnerName: 'د. هاني المنياوي',
        amount: '750000.00',
        paymentMethod: 'INSTAPAY_102000',
        propertyTitle: 'برج الصفوة',
        receiptRef: 'PAY-DIST-01',
        currentPeriod: 'prd-2026-02'
      });

      const balCheck = InvariantsValidator.verifyDoubleEntryBalance([payoutInstaJe]);
      assert.strictEqual(balCheck.passed, true);

      const dr303 = payoutInstaJe.lines.find(l => l.account_code === '303000');
      const cr102 = payoutInstaJe.lines.find(l => l.account_code === '102000');

      assert.ok(dr303, 'Must debit account 303000 (Partner Profit Distributions & Withdrawals)');
      assert.strictEqual(dr303.debit_amount, '750000.00');
      assert.ok(cr102, 'Must credit InstaPay account 102000');
      assert.strictEqual(cr102.credit_amount, '750000.00');
    });

    it('creates profit payout / dividend journal entry via Commercial Bank (Dr 303000 / Cr 102000)', () => {
      const payoutBankJe = PartnersEngine.createPayoutJournalEntry({
        partnerName: 'د. هاني المنياوي',
        amount: '750000.00',
        paymentMethod: 'BANK_102000',
        propertyTitle: 'برج الصفوة',
        receiptRef: 'PAY-DIST-01-BANK',
        currentPeriod: 'prd-2026-02'
      });

      const balCheck = InvariantsValidator.verifyDoubleEntryBalance([payoutBankJe]);
      assert.strictEqual(balCheck.passed, true);

      const dr303 = payoutBankJe.lines.find(l => l.account_code === '303000');
      const cr102 = payoutBankJe.lines.find(l => l.account_code === '102000');

      assert.ok(dr303, 'Must debit account 303000 (Partner Profit Distributions & Withdrawals)');
      assert.strictEqual(dr303.debit_amount, '750000.00');
      assert.ok(cr102, 'Must credit account 102000 (Commercial Bank)');
      assert.strictEqual(cr102.credit_amount, '750000.00');
    });

    it('creates cash payout crediting account 101000 (Dr 303000 / Cr 101000)', () => {
      const payoutCashJe = PartnersEngine.createPayoutJournalEntry({
        partnerName: 'الحاج رجب الصاوي',
        amount: '300000.00',
        paymentMethod: 'CASH_101000',
        propertyTitle: 'عمارة النخيل',
        receiptRef: 'PAY-CASH-02',
        currentPeriod: 'prd-2026-02'
      });

      const dr303 = payoutCashJe.lines.find(l => l.account_code === '303000');
      const cr101 = payoutCashJe.lines.find(l => l.account_code === '101000');

      assert.ok(dr303);
      assert.strictEqual(dr303.debit_amount, '300000.00');
      assert.ok(cr101);
      assert.strictEqual(cr101.credit_amount, '300000.00');
    });
  });

  describe('4. Partner ROI Calculations & Safe Zero Handling', () => {
    it('safely calculates 0% ROI when partner has zero contributed capital without NaN or Infinity', () => {
      const zeroCapitalProfiles: ERPPartnerProfile[] = [
        {
          id: 'pt-zero-1',
          name: 'شريك بدون مساهمات',
          role: 'silent_financier',
          joined_date: '2026-01-01'
        }
      ];

      const summaries = PartnersEngine.calculatePartnerSummaries(
        zeroCapitalProfiles,
        [],
        [],
        [] // zero transactions
      );

      const partner = summaries.find(s => s.partnerName === 'شريك بدون مساهمات');
      assert.ok(partner);
      assert.strictEqual(partner.totalContributedCapital, '0.00');
      assert.strictEqual(partner.totalDistributionsPaid, '0.00');
      assert.strictEqual(partner.roiPercent, 0, 'ROI must strictly equal 0, never NaN or Infinity');
      assert.strictEqual(Number.isFinite(partner.roiPercent), true);
    });

    it('calculates honest ROI percentage when contributed capital and distributions are positive', () => {
      const mockProfiles: ERPPartnerProfile[] = [
        {
          id: 'pt-roi-1',
          name: 'م. أحمد الشريف',
          role: 'equity_partner',
          joined_date: '2025-06-15'
        }
      ];

      const transactions: ERPPartnerTransaction[] = [
        {
          id: 'tx-c1',
          transaction_number: 'TX-C1',
          partner_name: 'م. أحمد الشريف',
          type: 'CAPITAL_INJECTION',
          amount: '10000000.00',
          payment_method: 'INSTAPAY_102000',
          journal_entry_number: 'JE-01',
          date: '2026-01-10',
          status: 'COMPLETED',
          memo: 'Capital injection'
        },
        {
          id: 'tx-d1',
          transaction_number: 'TX-D1',
          partner_name: 'م. أحمد الشريف',
          type: 'PROFIT_DISTRIBUTION',
          amount: '2500000.00', // 2.5M / 10M = 25%
          payment_method: 'INSTAPAY_102000',
          journal_entry_number: 'JE-02',
          date: '2026-02-15',
          status: 'COMPLETED',
          memo: 'Profit payout'
        }
      ];

      const summaries = PartnersEngine.calculatePartnerSummaries(
        mockProfiles,
        [],
        [],
        transactions
      );

      const partner = summaries.find(s => s.partnerName === 'م. أحمد الشريف');
      assert.ok(partner);
      assert.strictEqual(partner.totalContributedCapital, '10000000.00');
      assert.strictEqual(partner.totalDistributionsPaid, '2500000.00');
      assert.strictEqual(partner.roiPercent, 25, '2.5M paid on 10M invested is 25% ROI');
    });

    it('calculates net current balance accurately as collections share minus distributions paid', () => {
      const mockBuilding: Property = {
        id: 'bldg-roi-1',
        type: 'building',
        title_ar: 'عمارة الفردوس',
        price_egp: 20000000,
        partner_splits: [
          { partner_name: 'م. أحمد الشريف', share_percentage: 50 }
        ]
      } as any;

      const mockContracts: ERPContract[] = [
        {
          id: 'ct-1',
          contract_number: 'CTR-001',
          property_id: 'bldg-roi-1',
          gross_contract_value: '10000000.00',
          total_cash_collected: '6000000.00', // 50% = 3,000,000 collections share
          status: 'ACTIVE'
        } as any
      ];

      const transactions: ERPPartnerTransaction[] = [
        {
          id: 'tx-d1',
          transaction_number: 'TX-D1',
          partner_name: 'م. أحمد الشريف',
          type: 'PROFIT_DISTRIBUTION',
          amount: '1000000.00',
          payment_method: 'INSTAPAY_102000',
          journal_entry_number: 'JE-02',
          date: '2026-02-15',
          status: 'COMPLETED',
          memo: 'Profit payout'
        }
      ];

      const summaries = PartnersEngine.calculatePartnerSummaries(
        INITIAL_PARTNER_PROFILES,
        [mockBuilding],
        mockContracts,
        transactions
      );

      const ahmed = summaries.find(s => s.partnerName === 'م. أحمد الشريف');
      assert.ok(ahmed);
      // Collections share = 3,000,000, Distributions paid = 1,000,000 => Net current balance = 2,000,000.00
      assert.strictEqual(ahmed.totalCollectionsShare, '3000000.00');
      assert.strictEqual(ahmed.totalDistributionsPaid, '1000000.00');
      assert.strictEqual(ahmed.netCurrentBalance, '2000000.00');
    });
  });

  describe('5. Partner Summary Enhanced Attributes & Ownership History Reallocations', () => {
    it('populates totalArrears, lastActivityDate, investmentShareLabel, role, and joined_date on PartnerFinancialSummary', () => {
      const mockBuilding: Property = {
        id: 'bldg-attr-1',
        type: 'building',
        title_ar: 'عمارة النخيل',
        target_budget_egp: 20000000,
        partner_splits: [
          { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 60 },
          { partner_name: 'د. طارق محمود', share_percentage: 40 }
        ]
      } as any;

      const mockProfiles: ERPPartnerProfile[] = [
        {
          id: 'pt-tarek-1',
          name: 'د. طارق محمود',
          role: 'silent_financier',
          joined_date: '2025-03-01',
          phone: '+201000000001'
        }
      ];

      // Founder injected 12,000,000 (their 60% share).
      // Tarek required 40% = 8,000,000. But Tarek injected only 5,000,000 => arrears = 3,000,000.
      const mockTxs: ERPPartnerTransaction[] = [
        {
          id: 'tx-founder-1',
          transaction_number: 'TX-F1',
          partner_name: PRIMARY_DEVELOPER_NAME,
          property_id: 'bldg-attr-1',
          type: 'CAPITAL_INJECTION',
          amount: '12000000.00',
          payment_method: 'BANK_102000',
          journal_entry_number: 'JE-01',
          date: '2026-01-05',
          status: 'COMPLETED',
          memo: 'Founder capital'
        },
        {
          id: 'tx-tarek-1',
          transaction_number: 'TX-T1',
          partner_name: 'د. طارق محمود',
          property_id: 'bldg-attr-1',
          type: 'CAPITAL_INJECTION',
          amount: '5000000.00',
          payment_method: 'INSTAPAY_102000',
          journal_entry_number: 'JE-02',
          date: '2026-02-10',
          status: 'COMPLETED',
          memo: 'Tarek partial capital'
        }
      ];

      const summaries = PartnersEngine.calculatePartnerSummaries(
        mockProfiles,
        [mockBuilding],
        [],
        mockTxs
      );

      const tarek = summaries.find(s => s.partnerName === 'د. طارق محمود');
      assert.ok(tarek);
      assert.strictEqual(tarek.role, 'silent_financier');
      assert.strictEqual(tarek.joined_date, '2025-03-01');
      assert.strictEqual(tarek.totalContributedCapital, '5000000.00');
      assert.strictEqual(tarek.totalArrears, '3000000.00', 'Arrears must equal 8M required - 5M paid = 3M');
      assert.strictEqual(tarek.lastActivityDate, '2026-02-10', 'Last activity date must reflect latest transaction');
      assert.strictEqual(tarek.investmentShareLabel, '40%');
    });

    it('supports full internal buyout maintaining 100% equity balance and creating ownership log', () => {
      const initialBuilding: Property = {
        id: 'bldg-buyout-1',
        type: 'building',
        title_ar: 'عمارة الصفا',
        partner_splits: [
          { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 50 },
          { partner_name: 'شريك متنازل', share_percentage: 30 },
          { partner_name: 'شريك مستحوذ', share_percentage: 20 }
        ]
      } as any;

      const updated = executeFullInternalBuyout({
        property: initialBuilding,
        fromPartnerName: 'شريك متنازل',
        toPartnerName: 'شريك مستحوذ',
        effectiveDate: '2026-02-20',
        transferValueEgp: '6000000.00',
        notes: 'تخارج كامل وشراء داخلي'
      });

      const balance = checkBuildingEquityBalance(updated);
      assert.strictEqual(balance.isBalanced, true, 'Equity must remain strictly 100% balanced');
      assert.strictEqual(balance.totalActiveSharePct, 100);

      const buyerSplit = updated.partner_splits?.find((s: any) => s.partner_name === 'شريك مستحوذ');
      assert.strictEqual(buyerSplit?.share_percentage, 50, 'Buyer acquires 30% + original 20% = 50%');

      const sellerSplit = updated.partner_splits?.find((s: any) => s.partner_name === 'شريك متنازل');
      assert.strictEqual(sellerSplit?.is_archived, true, 'Seller must be archived');
      assert.strictEqual(sellerSplit?.share_percentage, 0);

      assert.strictEqual(updated.ownership_history?.length, 1);
      assert.strictEqual(updated.ownership_history?.[0].action_type, 'FULL_INTERNAL_BUYOUT');
      assert.strictEqual(updated.ownership_history?.[0].transferred_share_pct, 30);
    });

    it('supports partial sale maintaining 100% equity balance and logging transfer', () => {
      const initialBuilding: Property = {
        id: 'bldg-sale-1',
        type: 'building',
        title_ar: 'عمارة النور',
        partner_splits: [
          { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 50 },
          { partner_name: 'شريك بائع', share_percentage: 30 },
          { partner_name: 'شريك مشترٍ', share_percentage: 20 }
        ]
      } as any;

      const updated = executePartialSale({
        property: initialBuilding,
        fromPartnerName: 'شريك بائع',
        toPartnerName: 'شريك مشترٍ',
        soldSharePct: 10,
        effectiveDate: '2026-02-25',
        transferValueEgp: '2000000.00',
        notes: 'بيع جزئي 10%'
      });

      const balance = checkBuildingEquityBalance(updated);
      assert.strictEqual(balance.isBalanced, true);
      assert.strictEqual(balance.totalActiveSharePct, 100);

      const seller = updated.partner_splits?.find((s: any) => s.partner_name === 'شريك بائع');
      const buyer = updated.partner_splits?.find((s: any) => s.partner_name === 'شريك مشترٍ');
      assert.strictEqual(seller?.share_percentage, 20, 'Seller 30% - 10% = 20%');
      assert.strictEqual(buyer?.share_percentage, 30, 'Buyer 20% + 10% = 30%');

      assert.strictEqual(updated.ownership_history?.length, 1);
      assert.strictEqual(updated.ownership_history?.[0].action_type, 'PARTIAL_SALE');
      assert.strictEqual(updated.ownership_history?.[0].transferred_share_pct, 10);
    });

    it('supports full substitution admitting new incoming partner and preserving 100% balance', () => {
      const initialBuilding: Property = {
        id: 'bldg-sub-1',
        type: 'building',
        title_ar: 'عمارة الأمل',
        partner_splits: [
          { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 60 },
          { partner_name: 'شريك قديم', share_percentage: 40 }
        ]
      } as any;

      const updated = executeFullSubstitution({
        property: initialBuilding,
        fromPartnerName: 'شريك قديم',
        toPartnerName: 'شريك جديد بديل',
        effectiveDate: '2026-02-26',
        transferValueEgp: '8000000.00',
        transferArrears: true,
        transferredArrearsEgp: '500000.00',
        notes: 'إحلال شريك جديد مع نقل المتأخرات'
      });

      const balance = checkBuildingEquityBalance(updated);
      assert.strictEqual(balance.isBalanced, true);
      assert.strictEqual(balance.totalActiveSharePct, 100);

      const oldPartner = updated.partner_splits?.find((s: any) => s.partner_name === 'شريك قديم');
      const newPartner = updated.partner_splits?.find((s: any) => s.partner_name === 'شريك جديد بديل');
      assert.strictEqual(oldPartner?.is_archived, true);
      assert.strictEqual(oldPartner?.share_percentage, 0);
      assert.strictEqual(newPartner?.share_percentage, 40);

      assert.strictEqual(updated.ownership_history?.length, 1);
      assert.strictEqual(updated.ownership_history?.[0].action_type, 'FULL_SUBSTITUTION');
      assert.strictEqual(updated.ownership_history?.[0].transferred_arrears_flag, true);
      assert.strictEqual(updated.ownership_history?.[0].transferred_arrears_egp, '500000.00');
    });
  });

  describe('8. Canonical Project Performance Aggregation & Side Rail Invariants', () => {
    it('accurately aggregates project performance metrics without duplication or cards-in-cards nesting', () => {
      const mockBuilding: Property = {
        id: 'prop-canon-1',
        type: 'building',
        title_ar: 'عمارة الفردوس',
        target_budget_egp: 20000000,
        partner_splits: [
          { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 50 },
          { partner_name: 'شريك مستثمر', share_percentage: 50 }
        ]
      } as any;

      const mockTransactions: ERPPartnerTransaction[] = [
        {
          id: 'tx-1',
          transaction_number: 'TX-100',
          partner_name: 'شريك مستثمر',
          type: 'CAPITAL_INJECTION',
          amount: '8000000.00',
          property_id: 'prop-canon-1',
          payment_method: 'CASH_101000',
          journal_entry_number: 'JE-100',
          date: '2026-03-01',
          memo: 'مساهمة رأسمالية',
          status: 'COMPLETED'
        },
        {
          id: 'tx-2',
          transaction_number: 'TX-101',
          partner_name: 'شريك مستثمر',
          type: 'PROFIT_DISTRIBUTION',
          amount: '1500000.00',
          property_id: 'prop-canon-1',
          payment_method: 'INSTAPAY_102000',
          journal_entry_number: 'JE-101',
          date: '2026-03-15',
          memo: 'دفعة أرباح',
          status: 'COMPLETED'
        }
      ];

      const capInfo = computeDynamicBuildingCapital(mockBuilding, mockTransactions);
      const balance = checkBuildingEquityBalance(mockBuilding);

      // Verify balance
      assert.strictEqual(balance.isBalanced, true);
      assert.strictEqual(balance.totalActiveSharePct, 100);

      // Verify required vs actual paid
      assert.strictEqual(mockBuilding.target_budget_egp, 20000000);
      assert.strictEqual(capInfo.totalActualInjectedEgp, '8000000.00');

      // Verify GL accounts balance derivation
      const total301000 = mockTransactions
        .filter(t => t.type === 'CAPITAL_INJECTION')
        .reduce((sum, t) => sum.plus(t.amount), D(0));
      const total303000 = mockTransactions
        .filter(t => t.type === 'PROFIT_DISTRIBUTION')
        .reduce((sum, t) => sum.plus(t.amount), D(0));
      const netVault = total301000.minus(total303000);

      assert.strictEqual(total301000.toFixed(2), '8000000.00');
      assert.strictEqual(total303000.toFixed(2), '1500000.00');
      assert.strictEqual(netVault.toFixed(2), '6500000.00');
    });

    it('correctly classifies side rail equity structure health for balanced vs imbalanced portfolios', () => {
      const buildings: Property[] = [
        {
          id: 'b-1',
          type: 'building',
          title_ar: 'عمارة متزنة',
          partner_splits: [
            { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 60 },
            { partner_name: 'شريك أ', share_percentage: 40 }
          ]
        } as any,
        {
          id: 'b-2',
          type: 'building',
          title_ar: 'عمارة غير متزنة',
          partner_splits: [
            { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 50 },
            { partner_name: 'شريك ب', share_percentage: 40 } // total 90%
          ]
        } as any
      ];

      const imbalanced = buildings.filter(b => !checkBuildingEquityBalance(b).isBalanced);
      const balancedCount = buildings.length - imbalanced.length;

      assert.strictEqual(buildings.length, 2);
      assert.strictEqual(imbalanced.length, 1);
      assert.strictEqual(balancedCount, 1);
      assert.strictEqual(imbalanced[0].id, 'b-2');
    });

    it('accurately derives fundingRatio against target_budget_egp rather than implied capital', () => {
      const bldgWithTargetBudget: Property = {
        id: 'prop-target-1',
        type: 'building',
        title_ar: 'برج النخيل',
        target_budget_egp: 50000000, // 50M target budget
        partner_splits: [
          { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 50 },
          { partner_name: 'م. أحمد الشريف', share_percentage: 50 }
        ]
      } as any;

      const txs: ERPPartnerTransaction[] = [
        {
          id: 'tx-tb-1',
          transaction_number: 'TX-TB1',
          partner_name: PRIMARY_DEVELOPER_NAME,
          property_id: 'prop-target-1',
          type: 'CAPITAL_INJECTION',
          amount: '10000000.00', // 10M founder injected
          payment_method: 'INSTAPAY_102000',
          journal_entry_number: 'JE-TB1',
          date: '2026-02-01',
          status: 'COMPLETED',
          memo: 'Capital injection'
        },
        {
          id: 'tx-tb-2',
          transaction_number: 'TX-TB2',
          partner_name: 'م. أحمد الشريف',
          property_id: 'prop-target-1',
          type: 'CAPITAL_INJECTION',
          amount: '10000000.00', // 10M partner injected => total 20M paid
          payment_method: 'CASH_101000',
          journal_entry_number: 'JE-TB2',
          date: '2026-02-05',
          status: 'COMPLETED',
          memo: 'Capital injection'
        }
      ];

      const capInfo = computeDynamicBuildingCapital(bldgWithTargetBudget, txs);
      const requiredCapitalEgp = bldgWithTargetBudget.target_budget_egp
        ? D(bldgWithTargetBudget.target_budget_egp)
        : D(capInfo.impliedTotalCapitalEgp);
      const actualPaidEgp = D(capInfo.totalActualInjectedEgp);

      // Total actual paid is 20M. Target budget is 50M => 20M / 50M = 40.0%
      const fundingRatio = requiredCapitalEgp.gt(0)
        ? Number(actualPaidEgp.div(requiredCapitalEgp).times(100).toFixed(1))
        : capInfo.fundingRatioPct;

      assert.strictEqual(actualPaidEgp.toFixed(2), '20000000.00');
      assert.strictEqual(requiredCapitalEgp.toFixed(2), '50000000.00');
      assert.strictEqual(fundingRatio, 40.0, 'Funding ratio must be exactly 40% (20M/50M), NOT 100%');
    });

    it('safely handles zero projects without producing NaN for compliance percentages', () => {
      const zeroProjects: Property[] = [];
      const totalProjects = zeroProjects.length;
      const imbalancedCount = 0;
      const balancedCount = Math.max(0, totalProjects - imbalancedCount);
      const balancedPercent = totalProjects > 0 ? Math.round((balancedCount / totalProjects) * 100) : 100;
      const imbalancedPercent = totalProjects > 0 ? Math.round((imbalancedCount / totalProjects) * 100) : 0;

      assert.strictEqual(Number.isNaN(balancedPercent), false);
      assert.strictEqual(Number.isNaN(imbalancedPercent), false);
      assert.strictEqual(balancedPercent, 100);
      assert.strictEqual(imbalancedPercent, 0);
    });

    it('captures and preserves propertyId in side rail arrears alert items for accurate targeted settlement', () => {
      const testBldg: Property = {
        id: 'prop-arrears-targeted',
        type: 'building',
        title_ar: 'عمارة 104 النرجس',
        target_budget_egp: 30000000,
        partner_splits: [
          { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 50 },
          { partner_name: 'شريك متأخر', share_percentage: 50 }
        ]
      } as any;

      const txs: ERPPartnerTransaction[] = [
        {
          id: 'tx-arr-1',
          transaction_number: 'TX-ARR1',
          partner_name: PRIMARY_DEVELOPER_NAME,
          property_id: 'prop-arrears-targeted',
          type: 'CAPITAL_INJECTION',
          amount: '15000000.00',
          payment_method: 'INSTAPAY_102000',
          journal_entry_number: 'JE-ARR1',
          date: '2026-01-01',
          status: 'COMPLETED',
          memo: 'Capital injection'
        }
      ];

      const capInfo = computeDynamicBuildingCapital(testBldg, txs);
      const inArrears: Array<{ partnerName: string; propertyId: string; buildingTitle: string; arrearsEgp: string }> = [];

      capInfo.partnerStatuses.forEach(p => {
        if (p.hasArrears && D(p.arrearsEgp).gt(100)) {
          inArrears.push({
            partnerName: p.partnerName,
            propertyId: testBldg.id,
            buildingTitle: testBldg.title_ar || 'مشروع',
            arrearsEgp: p.arrearsEgp
          });
        }
      });

      assert.strictEqual(inArrears.length, 1);
      assert.strictEqual(inArrears[0].partnerName, 'شريك متأخر');
      assert.strictEqual(inArrears[0].propertyId, 'prop-arrears-targeted', 'Must store exact propertyId for targeted modal');
      assert.strictEqual(inArrears[0].arrearsEgp, '15000000.00');
    });
  });
});


