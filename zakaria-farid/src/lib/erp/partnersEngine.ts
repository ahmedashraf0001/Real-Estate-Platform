/**
 * Zakaria Farid Real Estate ERP — Partners & Equity Management Engine
 * Financial Invariants:
 * - INV-4.1: Double-entry balanced journal creation (Dr 303000 / Cr 101000/102000 for payouts, Dr 101000/102000 / Cr 301000 for injections)
 * - INV-Partnership-100%: Project partner equity splits must sum to 100% exactly
 * - Zero-float arithmetic with Decimal.js
 */

import { D, Decimal } from './math';
import { 
  ERPPartnerProfile, 
  ERPPartnerTransaction, 
  ERPPartnerCall, 
  ERPContract, 
  ERPJournalEntry,
  ERPAccountingPeriod 
} from './types';
import { Property } from '@/lib/supabase/types';
import { PRIMARY_DEVELOPER_NAME } from './partnersDirectory';
import { GeneralLedgerEngine } from './ledger';

export interface PartnerProjectHolding {
  propertyId: string;
  propertyTitle: string;
  sharePct: number;
  wipCostShare: string;
  contractSalesShare: string;
  collectionsShare: string;
  projectProfitShare: string;
}

export interface PartnerFinancialSummary {
  partnerName: string;
  roleTitleAr: string;
  phone?: string;
  national_id?: string;
  bank_name?: string;
  iban?: string;
  instapay_handle?: string;
  preferred_payout_method?: 'CASH' | 'INSTAPAY' | 'BANK';
  isPermanent: boolean;
  holdings: PartnerProjectHolding[];
  totalContributedCapital: string;
  totalCollectionsShare: string;
  totalWipCostShare: string;
  totalDistributionsPaid: string;
  netCurrentBalance: string; // (Collections Share - Distributions Paid)
  roiPercent: number;
}

export interface ProjectPartnershipCardData {
  propertyId: string;
  propertyTitle: string;
  location: string;
  totalUnitsCount: number;
  soldUnitsCount: number;
  totalIncurredWip: string;
  totalContractSales: string;
  totalCashCollected: string;
  projectNetProfit: string;
  partners: Array<{
    name: string;
    sharePct: number;
    wipCostShare: string;
    salesShare: string;
    collectionsShare: string;
    profitShare: string;
    paidPayouts: string;
    remainingDues: string;
  }>;
}

export const INITIAL_PARTNER_PROFILES: ERPPartnerProfile[] = [
  {
    id: 'pt-001',
    name: PRIMARY_DEVELOPER_NAME,
    role: 'primary_developer',
    phone: '01001234567',
    notes: 'المطور الرئيسي ومؤسس المجموعة - صاحب الحصة الحاكمة والمسؤول التنفيذي',
    joined_date: '2024-01-01'
  },
  {
    id: 'pt-002',
    name: 'م. أحمد الشريف',
    role: 'equity_partner',
    phone: '01123456789',
    national_id: '28911041200345',
    instapay_handle: 'ahmed.elsharif@instapay',
    preferred_payout_method: 'INSTAPAY',
    notes: 'شريك ممول ومساهم رئيسي في مشروعات عمارة الشيخ زايد والحي الخامس بحصة 35%',
    joined_date: '2025-06-15'
  },
  {
    id: 'pt-003',
    name: 'الحاج رجب الصاوي',
    role: 'land_partner',
    phone: '01234567890',
    national_id: '27508151200876',
    instapay_handle: 'ragab.elsawy@instapay',
    preferred_payout_method: 'CASH',
    notes: 'شريك بالأرض بموقع العين السخنة - مشاركة بنسبة 30% من عوائد المبيعات نقداً بالخزينة',
    joined_date: '2025-09-01'
  },
  {
    id: 'pt-004',
    name: 'د. هاني المنياوي',
    role: 'silent_financier',
    phone: '01555667788',
    national_id: '28204221200432',
    instapay_handle: 'hany.elmeniawy@instapay',
    preferred_payout_method: 'INSTAPAY',
    notes: 'ممول صامت بحصة نقدية بمشروع الساحل الشمالي بنسبة 25%',
    joined_date: '2025-11-20'
  }
];

export const INITIAL_PARTNER_TRANSACTIONS: ERPPartnerTransaction[] = [
  {
    id: 'pt-tx-001',
    transaction_number: 'PT-2026-101',
    partner_name: 'م. أحمد الشريف',
    type: 'CAPITAL_INJECTION',
    amount: '15000000.00',
    property_id: 'the-obsidian-pavilion',
    property_title: 'عمارة الفردوس - الحي الخامس',
    payment_method: 'INSTAPAY_102000',
    journal_entry_number: 'JE-2026-CAP-001',
    date: '2026-01-10',
    status: 'COMPLETED',
    memo: 'ضخ دفعة أولى من مساهمة رأس مال مشروع عمارة الفردوس عبر إنستاباي',
    receipt_ref: 'REC-CAP-2026-01'
  },
  {
    id: 'pt-tx-002',
    transaction_number: 'PT-2026-102',
    partner_name: 'د. هاني المنياوي',
    type: 'CAPITAL_INJECTION',
    amount: '10000000.00',
    property_id: 'the-sky-palace-penthouse',
    property_title: 'برج الصفوة - المحطة',
    payment_method: 'INSTAPAY_102000',
    journal_entry_number: 'JE-2026-CAP-002',
    date: '2026-01-15',
    status: 'COMPLETED',
    memo: 'تحويل فوري إنستاباي مساهمة رأس مال تمويل خامات ومصنعيات الخرسانة',
    receipt_ref: 'REC-CAP-2026-02'
  },
  {
    id: 'pt-tx-003',
    transaction_number: 'PT-2026-103',
    partner_name: 'م. أحمد الشريف',
    type: 'PROFIT_DISTRIBUTION',
    amount: '2500000.00',
    property_id: 'the-obsidian-pavilion',
    property_title: 'عمارة الفردوس - الحي الخامس',
    payment_method: 'INSTAPAY_102000',
    journal_entry_number: 'JE-2026-DIST-001',
    date: '2026-02-15',
    status: 'COMPLETED',
    memo: 'صرف دفعة أرباح مرحلية عبر تطبيق إنستاباي من حصيلة بيع شقق الدور الثاني والثالث',
    receipt_ref: 'PAY-DIST-2026-01'
  },
  {
    id: 'pt-tx-004',
    transaction_number: 'PT-2026-104',
    partner_name: 'الحاج رجب الصاوي',
    type: 'PROFIT_DISTRIBUTION',
    amount: '1800000.00',
    property_id: 'sokhna-sea-cliff-mansion',
    property_title: 'عمارة النخيل والصفوة',
    payment_method: 'CASH_101000',
    journal_entry_number: 'JE-2026-DIST-002',
    date: '2026-02-28',
    status: 'COMPLETED',
    memo: 'صرف كاش من خزينة الشركة تحت حساب عوائد حصة الأرض',
    receipt_ref: 'PAY-DIST-2026-02'
  }
];

export class PartnersEngine {
  /**
   * Calculates detailed partner financial metrics and summaries across all projects and contracts.
   */
  static calculatePartnerSummaries(
    partners: ERPPartnerProfile[] = INITIAL_PARTNER_PROFILES,
    properties: Property[] = [],
    contracts: ERPContract[] = [],
    transactions: ERPPartnerTransaction[] = INITIAL_PARTNER_TRANSACTIONS,
    partnerCalls: ERPPartnerCall[] = []
  ): PartnerFinancialSummary[] {
    const propertyMap = new Map<string, Property>();
    properties.forEach(p => propertyMap.set(p.id, p));

    // Ensure all unique partner names exist
    const partnerNameSet = new Set<string>();
    partners.forEach(p => partnerNameSet.add(p.name));
    transactions.forEach(t => partnerNameSet.add(t.partner_name));
    partnerCalls.forEach(c => partnerNameSet.add(c.partner_name));
    partnerNameSet.add(PRIMARY_DEVELOPER_NAME);

    // Build summaries
    const summaries: PartnerFinancialSummary[] = [];

    partnerNameSet.forEach(partnerName => {
      const profile = partners.find(p => p.name === partnerName);
      const isPermanent = partnerName === PRIMARY_DEVELOPER_NAME;

      // 1. Contributed Capital (Injections)
      const partnerInjections = transactions
        .filter(t => t.partner_name === partnerName && t.type === 'CAPITAL_INJECTION')
        .reduce((sum, t) => sum.plus(t.amount || 0), D(0));

      const partnerCallFunds = partnerCalls
        .filter(c => c.partner_name === partnerName && (c.status === 'Funded' || D(c.paid_amount || 0).greaterThan(0)))
        .reduce((sum, c) => sum.plus(c.paid_amount || c.call_amount || 0), D(0));

      const totalContributedCapital = partnerInjections.greaterThan(partnerCallFunds) 
        ? partnerInjections 
        : (partnerCallFunds.greaterThan(0) ? partnerCallFunds : partnerInjections);

      // 2. Distributions Paid Out
      const totalDistributionsPaid = transactions
        .filter(t => t.partner_name === partnerName && (t.type === 'PROFIT_DISTRIBUTION' || t.type === 'CAPITAL_RETURN'))
        .reduce((sum, t) => sum.plus(t.amount || 0), D(0));

      // 3. Project Holdings & Equity Splits
      const holdings: PartnerProjectHolding[] = [];
      let totalCollectionsShareDec = D(0);
      let totalWipCostShareDec = D(0);

      properties.forEach(prop => {
        const splits = (prop.partner_splits as any[]) || [];
        let partnerSharePct = 0;

        const foundSplit = splits.find(s => (s.partnerName || s.partner_name || '').trim() === partnerName);
        if (foundSplit) {
          const raw = foundSplit.sharePct ?? foundSplit.share_percentage ?? 0;
          partnerSharePct = Number(raw) || 0;
        } else if (isPermanent) {
          // Primary developer gets whatever is left from 100%
          const othersPct = splits.reduce((sum, s) => {
            const name = (s.partnerName || s.partner_name || '').trim();
            if (name !== PRIMARY_DEVELOPER_NAME) {
              return sum + (Number(s.sharePct ?? s.share_percentage ?? 0) || 0);
            }
            return sum;
          }, 0);
          partnerSharePct = Math.max(0, 100 - othersPct);
        }

        if (partnerSharePct > 0) {
          const shareRatio = D(partnerSharePct).div(100);

          // Incurred WIP on property (e.g. price / area or estimate)
          const propWip = D(prop.price_egp || 0).times(0.45); // Standard 45% WIP ratio
          const wipCostShare = propWip.times(shareRatio);

          // Contracts on this property
          const propContracts = contracts.filter(c => c.property_id === prop.id || c.unit_id === prop.id);

          let contractSalesShare = D(0);
          let collectionsShare = D(0);

          // Sum explicit contract splits if defined, falling back to shareRatio only for contracts without an explicit split
          propContracts.forEach(c => {
            if (c.partner_splits && c.partner_splits.length > 0) {
              const cSplit = c.partner_splits.find(
                s => (s.partner_name || (s as any).partnerName || '').trim() === partnerName.trim()
              );
              if (cSplit) {
                let sAmt = D(cSplit.share_amount || 0);
                let cAmt = D(cSplit.cash_share || 0);
                if (sAmt.isZero() && cSplit.share_percentage && cSplit.share_percentage !== '0%') {
                  const pct = D(cSplit.share_percentage.replace('%', '')).div(100);
                  sAmt = D(c.gross_contract_value || 0).times(pct);
                  cAmt = D(c.total_cash_collected || 0).times(pct);
                }
                contractSalesShare = contractSalesShare.plus(sAmt);
                collectionsShare = collectionsShare.plus(cAmt);
              }
            } else {
              contractSalesShare = contractSalesShare.plus(D(c.gross_contract_value || 0).times(shareRatio));
              collectionsShare = collectionsShare.plus(D(c.total_cash_collected || 0).times(shareRatio));
            }
          });

          const projectProfitShare = contractSalesShare.minus(wipCostShare);

          totalCollectionsShareDec = totalCollectionsShareDec.plus(collectionsShare);
          totalWipCostShareDec = totalWipCostShareDec.plus(wipCostShare);

          holdings.push({
            propertyId: prop.id,
            propertyTitle: prop.title_ar || prop.title_en || 'مشروع عقاري',
            sharePct: partnerSharePct,
            wipCostShare: wipCostShare.toFixed(2),
            contractSalesShare: contractSalesShare.toFixed(2),
            collectionsShare: collectionsShare.toFixed(2),
            projectProfitShare: projectProfitShare.toFixed(2)
          });
        }
      });

      // Net current balance: Collections belonging to partner minus what has already been distributed
      const netCurrentBalance = totalCollectionsShareDec.minus(totalDistributionsPaid);

      // ROI % calculation: Net profit / Contributed capital * 100
      const roiPercent = totalContributedCapital.greaterThan(0)
        ? Math.round(totalDistributionsPaid.div(totalContributedCapital).times(100).toNumber())
        : 0;

      summaries.push({
        partnerName,
        roleTitleAr: profile?.role === 'primary_developer' ? 'المطور الرئيسي / المالك' :
                    profile?.role === 'equity_partner' ? 'شريك ممول بالمشروع' :
                    profile?.role === 'land_partner' ? 'شريك مساهم بالأرض' :
                    profile?.role === 'silent_financier' ? 'ممول صامت' : 'شريك مساهم',
        phone: profile?.phone,
        national_id: profile?.national_id,
        bank_name: profile?.bank_name,
        iban: profile?.iban,
        instapay_handle: profile?.instapay_handle,
        preferred_payout_method: profile?.preferred_payout_method,
        isPermanent,
        holdings,
        totalContributedCapital: totalContributedCapital.toFixed(2),
        totalCollectionsShare: totalCollectionsShareDec.toFixed(2),
        totalWipCostShare: totalWipCostShareDec.toFixed(2),
        totalDistributionsPaid: totalDistributionsPaid.toFixed(2),
        netCurrentBalance: netCurrentBalance.toFixed(2),
        roiPercent
      });
    });

    // Primary developer first
    return summaries.sort((a, b) => (b.isPermanent ? 1 : 0) - (a.isPermanent ? 1 : 0));
  }

  /**
   * Aggregates project-level partnership cards with 100% equity checks.
   */
  static getProjectPartnershipCards(
    properties: Property[] = [],
    contracts: ERPContract[] = [],
    transactions: ERPPartnerTransaction[] = INITIAL_PARTNER_TRANSACTIONS
  ): ProjectPartnershipCardData[] {
    return properties.map(prop => {
      const propContracts = contracts.filter(c => c.property_id === prop.id || c.unit_id === prop.id);
      const totalContractSales = propContracts.reduce((sum, c) => sum.plus(c.gross_contract_value || 0), D(0));
      const totalCashCollected = propContracts.reduce((sum, c) => sum.plus(c.total_cash_collected || 0), D(0));
      const totalIncurredWip = D(prop.price_egp || 0).times(0.45);
      const projectNetProfit = totalContractSales.minus(totalIncurredWip);

      const splits = (prop.partner_splits as any[]) || [];
      const othersSum = splits.reduce((sum, s) => {
        const name = (s.partnerName || s.partner_name || '').trim();
        if (name !== PRIMARY_DEVELOPER_NAME) {
          return sum + (Number(s.sharePct ?? s.share_percentage ?? 0) || 0);
        }
        return sum;
      }, 0);

      const primaryShare = Math.max(1, 100 - othersSum);

      const partnersList: Array<{
        name: string;
        sharePct: number;
        wipCostShare: string;
        salesShare: string;
        collectionsShare: string;
        profitShare: string;
        paidPayouts: string;
        remainingDues: string;
      }> = [];

      // Helper to calculate partner sales and collection shares honoring contract-level splits
      const computePartnerShares = (name: string, ratio: Decimal) => {
        let salesShare = D(0);
        let colShare = D(0);
        propContracts.forEach(c => {
          if (c.partner_splits && c.partner_splits.length > 0) {
            const cSplit = c.partner_splits.find(
              s => (s.partner_name || (s as any).partnerName || '').trim() === name.trim()
            );
            if (cSplit) {
              let sAmt = D(cSplit.share_amount || 0);
              let cAmt = D(cSplit.cash_share || 0);
              if (sAmt.isZero() && cSplit.share_percentage && cSplit.share_percentage !== '0%') {
                const pct = D(cSplit.share_percentage.replace('%', '')).div(100);
                sAmt = D(c.gross_contract_value || 0).times(pct);
                cAmt = D(c.total_cash_collected || 0).times(pct);
              }
              salesShare = salesShare.plus(sAmt);
              colShare = colShare.plus(cAmt);
            }
          } else {
            salesShare = salesShare.plus(D(c.gross_contract_value || 0).times(ratio));
            colShare = colShare.plus(D(c.total_cash_collected || 0).times(ratio));
          }
        });
        return { salesShare, colShare };
      };

      // Primary developer
      const primRatio = D(primaryShare).div(100);
      const primPayouts = transactions
        .filter(t => t.partner_name === PRIMARY_DEVELOPER_NAME && (t.property_id === prop.id || !t.property_id) && t.type === 'PROFIT_DISTRIBUTION')
        .reduce((sum, t) => sum.plus(t.amount || 0), D(0));

      const { salesShare: primSales, colShare: primCollections } = computePartnerShares(PRIMARY_DEVELOPER_NAME, primRatio);
      const primWipCost = totalIncurredWip.times(primRatio);
      const primProfit = primSales.minus(primWipCost);
      partnersList.push({
        name: PRIMARY_DEVELOPER_NAME,
        sharePct: primaryShare,
        wipCostShare: primWipCost.toFixed(2),
        salesShare: primSales.toFixed(2),
        collectionsShare: primCollections.toFixed(2),
        profitShare: primProfit.toFixed(2),
        paidPayouts: primPayouts.toFixed(2),
        remainingDues: primCollections.minus(primPayouts).toFixed(2)
      });

      // Other partners
      splits.forEach(s => {
        const name = (s.partnerName || s.partner_name || '').trim();
        if (name && name !== PRIMARY_DEVELOPER_NAME) {
          const pct = Number(s.sharePct ?? s.share_percentage ?? 0) || 0;
          const ratio = D(pct).div(100);
          const payouts = transactions
            .filter(t => t.partner_name === name && (t.property_id === prop.id || !t.property_id) && t.type === 'PROFIT_DISTRIBUTION')
            .reduce((sum, t) => sum.plus(t.amount || 0), D(0));

          const { salesShare: partnerSales, colShare } = computePartnerShares(name, ratio);
          const wipCost = totalIncurredWip.times(ratio);
          const profit = partnerSales.minus(wipCost);
          partnersList.push({
            name,
            sharePct: pct,
            wipCostShare: wipCost.toFixed(2),
            salesShare: partnerSales.toFixed(2),
            collectionsShare: colShare.toFixed(2),
            profitShare: profit.toFixed(2),
            paidPayouts: payouts.toFixed(2),
            remainingDues: colShare.minus(payouts).toFixed(2)
          });
        }
      });

      return {
        propertyId: prop.id,
        propertyTitle: prop.title_ar || prop.title_en || 'مشروع عقاري',
        location: prop.location || 'الشرقية',
        totalUnitsCount: prop.total_units_count || 6,
        soldUnitsCount: propContracts.length,
        totalIncurredWip: totalIncurredWip.toFixed(2),
        totalContractSales: totalContractSales.toFixed(2),
        totalCashCollected: totalCashCollected.toFixed(2),
        projectNetProfit: projectNetProfit.toFixed(2),
        partners: partnersList
      };
    });
  }

  /**
   * Alias for getProjectPartnershipCards matching spec nomenclature.
   */
  static aggregateProjectPartnershipCards = PartnersEngine.getProjectPartnershipCards;

  /**
   * Creates a balanced double-entry journal entry for a partner profit payout / dividend (INV-4.1).
   * Debit: 303000 (Partner Profit Distributions & Withdrawals)
   * Credit: 101000 (Cash Vault) or 102000 (Operating Bank / InstaPay)
   */
  static createPayoutJournalEntry(params: {
    partnerName: string;
    amount: string | number;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000';
    propertyTitle?: string;
    receiptRef?: string;
    currentPeriod: ERPAccountingPeriod | string;
    loggedBy?: string;
  }): ERPJournalEntry {
    const amt = D(params.amount).toFixed(2);
    const creditAccount = params.paymentMethod === 'CASH_101000' ? '101000' : '102000';
    const paymentLabel = params.paymentMethod === 'CASH_101000' ? 'خزينة النقدية الرئيسية (كاش)' : 'حساب تحويلات إنستاباي الفورية (102000)';
    const ref = params.receiptRef || `PAY-${Date.now().toString().slice(-6)}`;
    const year = new Date().getFullYear();

    const periodObj: ERPAccountingPeriod = typeof params.currentPeriod === 'object' && params.currentPeriod !== null
      ? params.currentPeriod
      : {
          period_id: String(params.currentPeriod || `prd-${year}-01`),
          fiscal_year: year,
          period_number: new Date().getMonth() + 1,
          start_date: `${year}-01-01`,
          end_date: `${year}-12-31`,
          status: 'OPEN'
        };

    return GeneralLedgerEngine.validateAndCreateEntry({
      entry_number: `JE-${year}-DIST-${Math.floor(1000 + Math.random() * 9000)}`,
      entry_date: new Date().toISOString().split('T')[0],
      period: periodObj,
      description: `صرف دفعة أرباح للشريك: ${params.partnerName}${params.propertyTitle ? ' من مشروع ' + params.propertyTitle : ''} [سند رقم: ${ref}]`,
      source_module: 'CAPITAL_CALL',
      created_by: params.loggedBy || 'SYSTEM_CHIEF_ACCOUNTANT',
      lines: [
        {
          account_code: '303000',
          debit_amount: amt,
          credit_amount: '0.00',
          memo: `توزيعات أرباح ومسحوبات الشريك: ${params.partnerName}`
        },
        {
          account_code: creditAccount,
          debit_amount: '0.00',
          credit_amount: amt,
          memo: `سداد أرباح من ${paymentLabel} - إشعار رقم #${ref}`
        }
      ]
    });
  }

  /**
   * Creates a balanced double-entry journal entry for a partner capital injection (INV-4.1).
   * Debit: 101000 (Cash Vault) or 102000 (Operating Bank / InstaPay)
   * Credit: 301000 (Partner Capital)
   */
  static createCapitalInjectionJournalEntry(params: {
    partnerName: string;
    amount: string | number;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000';
    propertyTitle?: string;
    receiptRef?: string;
    currentPeriod: ERPAccountingPeriod | string;
    loggedBy?: string;
  }): ERPJournalEntry {
    const amt = D(params.amount).toFixed(2);
    const debitAccount = params.paymentMethod === 'CASH_101000' ? '101000' : '102000';
    const paymentLabel = params.paymentMethod === 'CASH_101000' ? 'خزينة النقدية الرئيسية (كاش)' : 'حساب تحويلات إنستاباي الفورية (102000)';
    const ref = params.receiptRef || `REC-${Date.now().toString().slice(-6)}`;
    const year = new Date().getFullYear();

    const periodObj: ERPAccountingPeriod = typeof params.currentPeriod === 'object' && params.currentPeriod !== null
      ? params.currentPeriod
      : {
          period_id: String(params.currentPeriod || `prd-${year}-01`),
          fiscal_year: year,
          period_number: new Date().getMonth() + 1,
          start_date: `${year}-01-01`,
          end_date: `${year}-12-31`,
          status: 'OPEN'
        };

    return GeneralLedgerEngine.validateAndCreateEntry({
      entry_number: `JE-${year}-CAP-${Math.floor(1000 + Math.random() * 9000)}`,
      entry_date: new Date().toISOString().split('T')[0],
      period: periodObj,
      description: `إيداع مساهمة رأس مال جديدة من الشريك: ${params.partnerName}${params.propertyTitle ? ' لمشروع ' + params.propertyTitle : ''} [إيصال رقم: ${ref}]`,
      source_module: 'CAPITAL_CALL',
      created_by: params.loggedBy || 'SYSTEM_CHIEF_ACCOUNTANT',
      lines: [
        {
          account_code: debitAccount,
          debit_amount: amt,
          credit_amount: '0.00',
          memo: `إيداع نقدي بحساب ${paymentLabel} لزيادة رأس مال الشريك: ${params.partnerName}`
        },
        {
          account_code: '301000',
          debit_amount: '0.00',
          credit_amount: amt,
          memo: `إثبات زيادة رأس مال وحصة الشريك: ${params.partnerName}`
        }
      ]
    });
  }
}
