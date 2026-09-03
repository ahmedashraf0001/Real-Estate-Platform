/**
 * Zakaria Farid Real Estate ERP — Comprehensive Arabic Excel Exporter
 * Generates formatted multi-sheet .xlsx workbooks aligned with the client's reporting model.
 */

import * as XLSX from 'xlsx';
import { LiveERPDataset } from './supabaseService';

export interface ExportFinancialMetrics {
  cashBalance: string;
  accountsReceivable: string;
  totalWipIncurred: string;
  totalAssets: string;
  totalLiabilities: string;
  collectedSales: string;
  grossContractValue: string;
  partnerFunding: string;
}

export function exportComprehensiveArabicExcel(
  data: LiveERPDataset,
  metrics: ExportFinancialMetrics,
  isAr: boolean = true
): void {
  const wb = XLSX.utils.book_new();

  // ──────────────────────────────────────────────────────────────────────────
  // SHEET 1: دفتر اليومية العامة (General Ledger Journal)
  // ──────────────────────────────────────────────────────────────────────────
  const journalRows: (string | number)[][] = [
    [isAr ? 'شركة زكريا فريد للتطوير العقاري - دفتر اليومية العامة' : 'Zakaria Farid Real Estate - General Ledger'],
    [isAr ? 'تاريخ استخراج التقرير:' : 'Export Date:', new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')],
    [],
    [
      isAr ? 'م' : '#',
      isAr ? 'التاريخ' : 'Date',
      isAr ? 'رقم القيد' : 'Entry Number',
      isAr ? 'الوحدة / المصدر' : 'Module',
      isAr ? 'البيان' : 'Description',
      isAr ? 'كود الحساب' : 'Account Code',
      isAr ? 'اسم الحساب / البند' : 'Account Title',
      isAr ? 'مدين (ج.م)' : 'Debit (EGP)',
      isAr ? 'دائن (ج.م)' : 'Credit (EGP)',
      isAr ? 'الحالة' : 'Status'
    ]
  ];

  let counter = 1;
  data.journalEntries.forEach(entry => {
    entry.lines.forEach(line => {
      journalRows.push([
        counter++,
        entry.entry_date,
        entry.entry_number,
        entry.source_module,
        line.memo || entry.description,
        line.account_code,
        line.account_code, // Account title
        parseFloat(line.debit_amount) || 0,
        parseFloat(line.credit_amount) || 0,
        entry.is_locked ? (isAr ? 'محصن / فترة مقفلة' : 'Locked') : (isAr ? 'مرحل / نشط' : 'Posted')
      ]);
    });
  });

  const wsJournal = XLSX.utils.aoa_to_sheet(journalRows);
  
  // Set Column Widths for readability
  wsJournal['!cols'] = [
    { wch: 6 },  // #
    { wch: 12 }, // Date
    { wch: 22 }, // Entry Number
    { wch: 18 }, // Source Module
    { wch: 35 }, // Description
    { wch: 12 }, // Account Code
    { wch: 25 }, // Account Title
    { wch: 16 }, // Debit
    { wch: 16 }, // Credit
    { wch: 16 }  // Status
  ];

  XLSX.utils.book_append_sheet(wb, wsJournal, isAr ? 'دفتر اليومية العامة' : 'General Ledger');

  // ──────────────────────────────────────────────────────────────────────────
  // SHEET 2: التقرير المالي والتشغيلي التنفيذي (Executive Balance & Operating Summary)
  // ──────────────────────────────────────────────────────────────────────────
  const summaryRows: (string | number)[][] = [
    [isAr ? 'شركة زكريا فريد للتطوير العقاري - التقرير المالي والتشغيلي التنفيذي' : 'Zakaria Farid Real Estate - Executive Financial Summary'],
    [isAr ? 'تاريخ التقرير:' : 'Report Date:', new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')],
    [],
    [
      isAr ? 'البند المحاسبي والتشغيلي' : 'Financial Item',
      isAr ? 'القيمة (ج.م)' : 'Amount (EGP)',
      isAr ? 'ملاحظات وتوجيهات المركز المالي' : 'Audit Notes'
    ],
    [
      isAr ? 'السيولة النقدية المتاحة (خزينة وبنوك)' : 'Net Available Cash (Safe & Banks)',
      parseFloat(metrics.cashBalance) || 0,
      isAr ? 'حسابات النقدية التشغيلية (101000 + 102000)' : 'Operating Cash Accounts'
    ],
    [
      isAr ? 'أقساط العملاء وعقود البيع المستحقة (A/R)' : 'Accounts Receivable (A/R)',
      parseFloat(metrics.accountsReceivable) || 0,
      isAr ? 'الأقساط التعاقدية غير المحصلة بعد' : 'Pending Tranche Schedules'
    ],
    [
      isAr ? 'مصروفات وتكاليف البناء والتشييد المنفذة (WIP)' : 'Construction WIP Incurred',
      parseFloat(metrics.totalWipIncurred) || 0,
      isAr ? 'أعمال تحت التنفيذ بمواقع المشاريع (151000)' : 'Work in Progress Assets'
    ],
    [
      isAr ? 'إجمالي أصول التشغيل المباشرة' : 'Total Direct Operating Assets',
      parseFloat(metrics.totalAssets) || 0,
      isAr ? 'النقدية + الأقساط + المباني قيد التنفيذ' : 'Cash + Receivables + WIP'
    ],
    [
      isAr ? 'إجمالي ديون والتزامات الشركة' : 'Total Outstanding Liabilities',
      parseFloat(metrics.totalLiabilities) || 0,
      isAr ? 'مستحقات الموردين + التزامات الاسترداد' : 'Accounts Payable & Refund Liabilities'
    ],
    [
      isAr ? 'المبيعات المحصلة كاش' : 'Cash Sales Collected',
      parseFloat(metrics.collectedSales) || 0,
      isAr ? 'دفعات الحجز والتعاقدات المقبوضة فعلياً' : 'Cash Collections into Operating Account'
    ],
    [
      isAr ? 'إجمالي قيمة التعاقدات والمبيعات الكلية' : 'Gross Contract Sales Value',
      parseFloat(metrics.grossContractValue) || 0,
      isAr ? 'المحصل كاش + المتبقي كأقساط على المشترين' : 'Total Contracted Value'
    ],
    [
      isAr ? 'تمويل ورأس مال الشركاء المضخوخ' : 'Contributed Partner Capital',
      parseFloat(metrics.partnerFunding) || 0,
      isAr ? 'حصص ورؤوس أموال زكريا فريد والشركاء (310000)' : 'Partner Equity Contributions'
    ]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 40 }, // Financial Item
    { wch: 22 }, // Amount
    { wch: 45 }  // Notes
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, isAr ? 'التقرير المالي التنفيذي' : 'Executive Summary');

  // ──────────────────────────────────────────────────────────────────────────
  // SHEET 3: عقود المبيعات والأقساط (Contracts & Installments)
  // ──────────────────────────────────────────────────────────────────────────
  const contractRows: (string | number)[][] = [
    [isAr ? 'عقود بيع الوحدات وجدولة الأقساط' : 'Property Sale Contracts & Installments'],
    [isAr ? 'تاريخ الاستخراج:' : 'Date:', new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')],
    [],
    [
      isAr ? 'رقم العقد' : 'Contract #',
      isAr ? 'اسم العميل' : 'Buyer Name',
      isAr ? 'قيمة العقد الإجمالية (ج.م)' : 'Gross Value (EGP)',
      isAr ? 'المحصل كاش (ج.م)' : 'Collected Cash',
      isAr ? 'المتبقي كأقساط (ج.م)' : 'Remaining A/R',
      isAr ? 'حالة الاستلام' : 'Handover Status',
      isAr ? 'حالة العقد' : 'Contract Status'
    ]
  ];

  data.contracts.forEach(c => {
    const gross = parseFloat(c.gross_contract_value) || 0;
    const collected = parseFloat(c.total_cash_collected) || 0;
    const remaining = Math.max(0, gross - collected);
    contractRows.push([
      c.contract_number,
      c.buyer_name,
      gross,
      collected,
      remaining,
      c.handover_status,
      c.status
    ]);
  });

  const wsContracts = XLSX.utils.aoa_to_sheet(contractRows);
  wsContracts['!cols'] = [
    { wch: 18 },
    { wch: 25 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 }
  ];

  XLSX.utils.book_append_sheet(wb, wsContracts, isAr ? 'سجل المبيعات والعقود' : 'Contracts & Sales');

  // ──────────────────────────────────────────────────────────────────────────
  // Download the File
  // ──────────────────────────────────────────────────────────────────────────
  const fileName = isAr
    ? `التقرير_المالي_الشامل_زكريا_فريد_${Date.now()}.xlsx`
    : `ZF_Financial_Comprehensive_Report_${Date.now()}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
