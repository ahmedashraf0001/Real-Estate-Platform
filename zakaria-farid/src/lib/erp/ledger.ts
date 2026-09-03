/**
 * Zakaria Farid Real Estate ERP — General Ledger & Accounting Periods Engine
 * Enforces Invariant 4.1 (Double-Entry Balance) & Invariant 0.9 (Period Lock).
 */

import { D, Decimal, generateUUID, ensureUUID, isUUID } from './math';
import { 
  ERPAccount, 
  ERPAccountingPeriod, 
  ERPJournalEntry, 
  ERPJournalLine, 
  JournalSourceModule 
} from './types';

export const CANONICAL_COA: Record<string, ERPAccount> = {
  '101000': {
    account_code: '101000',
    account_name_en: 'Operating Cash Vault',
    account_name_ar: 'خزينة النقدية التشغيلية',
    account_type: 'ASSET',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'Petty cash & physical vault receipts'
  },
  '102000': {
    account_code: '102000',
    account_name_en: 'Bank Accounts (Operating)',
    account_name_ar: 'الحسابات البنكية التشغيلية',
    account_type: 'ASSET',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'Operating bank accounts'
  },
  '102100': {
    account_code: '102100',
    account_name_en: 'Maintenance Escrow Bank Account',
    account_name_ar: 'حساب بنكي وديعة الصيانة',
    account_type: 'ASSET',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'Restricted escrow trust funds (§14.C / 4.14)'
  },
  '103000': {
    account_code: '103000',
    account_name_en: 'Accounts Receivable (Buyers)',
    account_name_ar: 'مدينو عقود العملاء (A/R)',
    account_type: 'ASSET',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'Billed and delivered contract receivables (§14.D.12)'
  },
  '103200': {
    account_code: '103200',
    account_name_en: 'PDC Cheques in Safe',
    account_name_ar: 'شيكات مؤجلة الخزينة (PDC)',
    account_type: 'ASSET',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'Physical cheques in safe custody (§14.F)'
  },
  '103300': {
    account_code: '103300',
    account_name_en: 'Customer Tax Clearing Receivable',
    account_name_ar: 'وسيط ضرائب العملاء',
    account_type: 'ASSET',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'UNRESOLVED (OPEN_QUESTIONS Q4) — Do not post'
  },
  '150000': {
    account_code: '150000',
    account_name_en: 'WIP - Land Acquisition',
    account_name_ar: 'أعمال تحت التنفيذ - الأراضي',
    account_type: 'ASSET',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'Land cost capitalization'
  },
  '151000': {
    account_code: '151000',
    account_name_en: 'WIP - Direct Construction',
    account_name_ar: 'أعمال تحت التنفيذ - أعمال البناء',
    account_type: 'ASSET',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'Direct construction & structural works'
  },
  '152000': {
    account_code: '152000',
    account_name_en: 'WIP - MEP & Infrastructure',
    account_name_ar: 'أعمال تحت التنفيذ - الكهروميكانيك',
    account_type: 'ASSET',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'MEP, plumbing and utilities capitalization'
  },
  '153000': {
    account_code: '153000',
    account_name_en: 'WIP - Finishing & Interiors',
    account_name_ar: 'أعمال تحت التنفيذ - التشطيبات',
    account_type: 'ASSET',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'Bespoke marble & Egyptian luxury interiors'
  },
  '156000': {
    account_code: '156000',
    account_name_en: 'WIP - Capitalized Financing',
    account_name_ar: 'أعمال تحت التنفيذ - تكاليف التمويل المباشرة',
    account_type: 'ASSET',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'Borrowing costs capitalized during construction'
  },
  '201000': {
    account_code: '201000',
    account_name_en: 'Accounts Payable',
    account_name_ar: 'موردون ومقاولون (A/P)',
    account_type: 'LIABILITY',
    normal_balance: 'CREDIT',
    is_active: true,
    notes: 'Contractor and vendor trade payables'
  },
  '202000': {
    account_code: '202000',
    account_name_en: 'Bank Term Loans',
    account_name_ar: 'قروض بنكية طويلة الأجل',
    account_type: 'LIABILITY',
    normal_balance: 'CREDIT',
    is_active: true,
    notes: 'External project financing principal'
  },
  '202500': {
    account_code: '202500',
    account_name_en: 'Unamortized Financing Charges',
    account_name_ar: 'مصاريف تمويل غير مستهلكة',
    account_type: 'CONTRA_LIABILITY',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'Contra-liability loan discount (§14.E)'
  },
  '203000': {
    account_code: '203000',
    account_name_en: 'Deferred Contract Revenue',
    account_name_ar: 'إيرادات عقود مؤجلة (دفعات مقدمة)',
    account_type: 'LIABILITY',
    normal_balance: 'CREDIT',
    is_active: true,
    notes: 'Pre-handover customer advances and collections'
  },
  '206200': {
    account_code: '206200',
    account_name_en: 'Customer Refund Liability',
    account_name_ar: 'التزامات استرداد العملاء',
    account_type: 'LIABILITY',
    normal_balance: 'CREDIT',
    is_active: true,
    notes: 'Net refund liability on rescission (floored at 0)'
  },
  '207000': {
    account_code: '207000',
    account_name_en: 'Maintenance Escrow Trust Liability',
    account_name_ar: 'أمانات وديعة الصيانة',
    account_type: 'LIABILITY',
    normal_balance: 'CREDIT',
    is_active: true,
    notes: 'Homeowner maintenance fund obligation'
  },
  '301000': {
    account_code: '301000',
    account_name_en: 'Partner Capital',
    account_name_ar: 'رأس مال الشركاء',
    account_type: 'EQUITY',
    normal_balance: 'CREDIT',
    is_active: true,
    notes: 'Contributed partner equity (§14.B)'
  },
  '302000': {
    account_code: '302000',
    account_name_en: 'Retained Earnings',
    account_name_ar: 'أرباح مرحلة',
    account_type: 'EQUITY',
    normal_balance: 'CREDIT',
    is_active: true,
    notes: 'Accumulated business profits/losses'
  },
  '401000': {
    account_code: '401000',
    account_name_en: 'Realized Sales Revenue',
    account_name_ar: 'إيرادات المبيعات المحققة',
    account_type: 'REVENUE',
    normal_balance: 'CREDIT',
    is_active: true,
    notes: 'Recognized at physical handover (§14.D.12 Model B)'
  },
  '430100': {
    account_code: '430100',
    account_name_en: 'Cancellation Penalty Revenue',
    account_name_ar: 'إيرادات غرامات فسخ العقود',
    account_type: 'REVENUE',
    normal_balance: 'CREDIT',
    is_active: true,
    notes: 'Retained penalty on rescission (min 10% V, C)'
  },
  '440000': {
    account_code: '440000',
    account_name_en: 'Realized FX Gain/Loss',
    account_name_ar: 'أرباح/خسائر فروق عملة محققة',
    account_type: 'REVENUE',
    normal_balance: 'CREDIT',
    is_active: true,
    notes: 'Realized FX variances upon settlement (§14.M)'
  },
  '501000': {
    account_code: '501000',
    account_name_en: 'COGS - Palatial Villas',
    account_name_ar: 'تكلفة مبيعات - فيلات قصور',
    account_type: 'EXPENSE',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'Relieved from WIP via RSV at delivery'
  },
  '502000': {
    account_code: '502000',
    account_name_en: 'COGS - Nile Sky Penthouses',
    account_name_ar: 'تكلفة مبيعات - بنتهاوس النيل',
    account_type: 'EXPENSE',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'Relieved from WIP via RSV at delivery'
  },
  '503000': {
    account_code: '503000',
    account_name_en: 'COGS - Luxury Duplexes',
    account_name_ar: 'تكلفة مبيعات - دوبلكس فاخر',
    account_type: 'EXPENSE',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'Relieved from WIP via RSV at delivery'
  },
  '504000': {
    account_code: '504000',
    account_name_en: 'COGS - Royal Suites',
    account_name_ar: 'تكلفة مبيعات - أجنحة ملكية',
    account_type: 'EXPENSE',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'Relieved from WIP via RSV at delivery'
  },
  '601000': {
    account_code: '601000',
    account_name_en: 'Sales & Marketing Expenses',
    account_name_ar: 'مصروفات التسويق والمبيعات',
    account_type: 'EXPENSE',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'Brokerage commission & marketing'
  },
  '602000': {
    account_code: '602000',
    account_name_en: 'General & Administrative Expenses',
    account_name_ar: 'مصروفات عمومية وإدارية',
    account_type: 'EXPENSE',
    normal_balance: 'DEBIT',
    is_active: true,
    notes: 'Administrative overhead'
  }
};

export class GeneralLedgerEngine {
  /**
   * Validate and Post a Journal Entry.
   * Enforces:
   * 1. Invariant 4.1: Sum(Debits) === Sum(Credits) exactly.
   * 2. Invariant 0.9: Target accounting period must be OPEN (never LOCKED or CLOSED).
   * 3. Prohibitions: No posting to unresolved accounts (103300) without sign-off.
   */
  static validateAndCreateEntry(
    params: {
      entry_id?: string;
      entry_number: string;
      entry_date: string;
      period: ERPAccountingPeriod;
      description: string;
      source_module: JournalSourceModule;
      source_entity_id?: string;
      created_by: string;
      lines: Array<{
        account_code: string;
        debit_amount: string | number | Decimal;
        credit_amount: string | number | Decimal;
        unit_id?: string;
        contract_id?: string;
        partner_id?: string;
        memo?: string;
      }>;
    }
  ): ERPJournalEntry {
    // 1. Period Lock Invariant (0.9)
    if (params.period.status !== 'OPEN') {
      throw new Error(
        `ERP Invariant 0.9 Violation: Cannot post journal entry into ${params.period.status} fiscal period (Period ${params.period.period_number}/${params.period.fiscal_year}).`
      );
    }

    if (!params.lines || params.lines.length < 2) {
      throw new Error('ERP Invariant 4.1 Error: Journal entry must contain at least 2 lines for double-entry.');
    }

    let totalDebits = D(0);
    let totalCredits = D(0);

    const validatedLines: ERPJournalLine[] = [];
    const entryId = ensureUUID(params.entry_id);

    params.lines.forEach((l, index) => {
      const dr = D(l.debit_amount);
      const cr = D(l.credit_amount);

      if (dr.isNegative() || cr.isNegative()) {
        throw new Error(`ERP Invariant 4.2 Error: Negative line amounts are prohibited (Line ${index + 1}).`);
      }

      if (dr.isPositive() && cr.isPositive()) {
        throw new Error(`ERP Line Error: A single journal line cannot have both Debit and Credit amounts (Line ${index + 1}).`);
      }

      // Prohibit posting to 103300 (Spec Section 3 & OPEN_QUESTIONS Q4)
      if (l.account_code === '103300') {
        throw new Error('ERP Spec Violation: 103300 Customer Tax Clearing Receivable is UNRESOLVED per OPEN_QUESTIONS Q4. Postings are blocked.');
      }

      // Check account validity in COA
      if (!CANONICAL_COA[l.account_code]) {
        throw new Error(`ERP Error: Account code ${l.account_code} does not exist in Canonical Chart of Accounts.`);
      }

      totalDebits = totalDebits.plus(dr);
      totalCredits = totalCredits.plus(cr);

      validatedLines.push({
        line_id: generateUUID(),
        entry_id: entryId,
        line_number: index + 1,
        account_code: l.account_code,
        debit_amount: dr.toFixed(2),
        credit_amount: cr.toFixed(2),
        unit_id: l.unit_id,
        contract_id: l.contract_id && isUUID(l.contract_id) ? l.contract_id : undefined,
        partner_id: l.partner_id && isUUID(l.partner_id) ? l.partner_id : undefined,
        memo: l.memo
      });
    });

    // Invariant 4.1 Check: Double-entry must balance to the exact piastre
    if (!totalDebits.equals(totalCredits)) {
      throw new Error(
        `ERP Invariant 4.1 Violation: Unbalanced journal entry. Total Debits (${totalDebits.toFixed(2)}) != Total Credits (${totalCredits.toFixed(2)}). Delta: ${totalDebits.minus(totalCredits).toFixed(2)}`
      );
    }

    return {
      entry_id: entryId,
      entry_number: params.entry_number,
      entry_date: params.entry_date,
      period_id: params.period.period_id,
      description: params.description,
      source_module: params.source_module,
      source_entity_id: params.source_entity_id,
      created_by: params.created_by,
      created_at: new Date().toISOString(),
      is_locked: false,
      lines: validatedLines
    };
  }

  /**
   * Compute Account Balances & Trial Balance from active Journal Entries.
   */
  static calculateTrialBalance(entries: ERPJournalEntry[]): Record<string, {
    account: ERPAccount;
    total_debit: string;
    total_credit: string;
    net_balance: string;
  }> {
    const balances: Record<string, {
      account: ERPAccount;
      debit: Decimal;
      credit: Decimal;
    }> = {};

    Object.keys(CANONICAL_COA).forEach(code => {
      balances[code] = {
        account: CANONICAL_COA[code],
        debit: D(0),
        credit: D(0)
      };
    });

    entries.forEach(entry => {
      entry.lines.forEach(line => {
        if (!balances[line.account_code]) {
          balances[line.account_code] = {
            account: CANONICAL_COA[line.account_code] || {
              account_code: line.account_code,
              account_name_en: 'Custom Account',
              account_name_ar: 'حساب مخصص',
              account_type: 'ASSET',
              normal_balance: 'DEBIT',
              is_active: true
            },
            debit: D(0),
            credit: D(0)
          };
        }
        balances[line.account_code].debit = balances[line.account_code].debit.plus(line.debit_amount);
        balances[line.account_code].credit = balances[line.account_code].credit.plus(line.credit_amount);
      });
    });

    const result: Record<string, {
      account: ERPAccount;
      total_debit: string;
      total_credit: string;
      net_balance: string;
    }> = {};

    Object.keys(balances).forEach(code => {
      const b = balances[code];
      const net = b.account.normal_balance === 'DEBIT' 
        ? b.debit.minus(b.credit) 
        : b.credit.minus(b.debit);

      result[code] = {
        account: b.account,
        total_debit: b.debit.toFixed(2),
        total_credit: b.credit.toFixed(2),
        net_balance: net.toFixed(2)
      };
    });

    return result;
  }
}
