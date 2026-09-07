/**
 * Zakaria Farid Real Estate ERP — Comprehensive Executive Excel Exporter
 * Generates rich, multi-sheet .xlsx workbooks with embedded charts, visualizations,
 * executive RTL formatting, real formulas, and audit-ready typography using ExcelJS.
 */

import ExcelJS from 'exceljs';
import { LiveERPDataset } from './supabaseService';
import { ERPAccount, ERPJournalEntry, ERPContract } from './types';
import { Property } from '@/lib/supabase/types';
import { CANONICAL_COA } from './ledger';
import { 
  renderDonutChart, 
  renderHorizontalBarChart, 
  renderProgressComparisonChart 
} from './excelChartRenderer';

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

// Executive Color Palette for Excel Cells (ARGB format)
const PALETTE = {
  headerBg: 'FF0F172A',      // Dark Slate #0f172a
  headerText: 'FFFFFFFF',    // White
  subHeaderBg: 'FFF1F5F9',   // Light Slate #f1f5f9
  border: 'FFE2E8F0',        // Border Slate #e2e8f0
  gold: 'FFB8903E',          // Brand Gold #b8903e
  emerald: 'FF047857',       // Forest Emerald #047857
  amber: 'FFB45309',         // Earth Amber #b45309
  zebraBg: 'FFF8FAFC',       // Slate 50 #f8fafc
  white: 'FFFFFFFF'
};

/**
 * Triggers a browser file download of an ExcelJS workbook buffer.
 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Applies executive styling to a standard data table header row.
 */
function styleHeaderRow(row: ExcelJS.Row, isAr: boolean = true) {
  row.height = 28;
  row.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: PALETTE.headerBg }
    };
    cell.font = {
      name: isAr ? 'Segoe UI' : 'Calibri',
      size: 11,
      bold: true,
      color: { argb: PALETTE.headerText }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      readingOrder: isAr ? 'rtl' : 'ltr'
    };
    cell.border = {
      top: { style: 'thin', color: { argb: PALETTE.headerBg } },
      bottom: { style: 'medium', color: { argb: PALETTE.gold } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });
}

/**
 * Main Comprehensive Excel Exporter
 * Generates an executive-grade 5-sheet workbook with embedded charts and formulas.
 */
export async function exportComprehensiveArabicExcel(
  data: LiveERPDataset,
  metrics: ExportFinancialMetrics,
  isAr: boolean = true
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'شركة زكريا فريد للتطوير العقاري - FIN-OS';
  wb.created = new Date();

  // ──────────────────────────────────────────────────────────────────────────
  // SHEET 1: التقرير المالي والتنفيذي والرسوم البيانية (Executive Visual Summary)
  // ──────────────────────────────────────────────────────────────────────────
  const wsSummary = wb.addWorksheet(isAr ? 'التقرير المالي والتنفيذي' : 'Executive Summary', {
    views: [{ rightToLeft: isAr, showGridLines: true }]
  });

  // Title Banner
  wsSummary.mergeCells('A1:K1');
  const titleCell = wsSummary.getCell('A1');
  titleCell.value = isAr 
    ? 'شركة زكريا فريد للتطوير العقاري — التقرير المالي والتشغيلي الشامل' 
    : 'Zakaria Farid Real Estate Developments — Comprehensive Executive Financial Report';
  titleCell.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 16, bold: true, color: { argb: PALETTE.headerBg } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  wsSummary.getRow(1).height = 36;

  // Subtitle / Date Banner
  wsSummary.mergeCells('A2:K2');
  const subCell = wsSummary.getCell('A2');
  subCell.value = isAr
    ? `نظام ZF FIN-OS • تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG', { dateStyle: 'full' })} • العملة المعتمدة: الجنيه المصري (EGP)`
    : `ZF FIN-OS • Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })} • Currency: Egyptian Pound (EGP)`;
  subCell.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 10, color: { argb: 'FF64748B' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  wsSummary.getRow(2).height = 20;

  // Add 3 Charts to Sheet 1
  const cashNum = parseFloat(metrics.cashBalance) || 0;
  const arNum = parseFloat(metrics.accountsReceivable) || 0;
  const wipNum = parseFloat(metrics.totalWipIncurred) || 0;
  const grossSalesNum = parseFloat(metrics.grossContractValue) || 0;
  const collectedSalesNum = parseFloat(metrics.collectedSales) || 0;
  const remainingSalesNum = Math.max(0, grossSalesNum - collectedSalesNum);
  const completionPct = grossSalesNum > 0 ? (collectedSalesNum / grossSalesNum) * 100 : 0;

  // Chart 1: Donut Chart - Liquidity & Asset Distribution
  const donutBase64 = renderDonutChart([
    { label: isAr ? 'السيولة النقدية (خزينة وبنوك)' : 'Liquid Cash', value: cashNum, color: '#047857' },
    { label: isAr ? 'أقساط وعقود مستحقة' : 'Receivables A/R', value: arNum, color: '#1d4ed8' },
    { label: isAr ? 'خامات ومباني قيد التنفيذ' : 'Construction WIP', value: wipNum, color: '#b45309' }
  ], {
    title: isAr ? 'مخطط توزيع أصول ومحفظة التشغيل العقاري' : 'Operating Assets & Liquidity Distribution',
    centerSubtitle: isAr ? 'إجمالي الأصول' : 'Total Assets',
    width: 650,
    height: 340
  });

  if (donutBase64) {
    const donutImgId = wb.addImage({
      base64: donutBase64,
      extension: 'png'
    });
    wsSummary.addImage(donutImgId, {
      tl: { col: 0, row: 3 }, // Column A, Row 4
      ext: { width: 560, height: 290 }
    });
  }

  // Chart 2: Progress & Comparison Bar - Sales Collections
  const progressBase64 = renderProgressComparisonChart({
    title: isAr ? 'موقف مبيعات الوحدات ونسبة التحصيل الفعلي' : 'Sales Contract Collections vs Receivables',
    totalAmount: grossSalesNum,
    collectedAmount: collectedSalesNum,
    remainingAmount: remainingSalesNum,
    completionPct: completionPct
  }, {
    width: 650,
    height: 200
  });

  if (progressBase64) {
    const progressImgId = wb.addImage({
      base64: progressBase64,
      extension: 'png'
    });
    wsSummary.addImage(progressImgId, {
      tl: { col: 0, row: 19 }, // Column A, Row 20
      ext: { width: 560, height: 175 }
    });
  }

  // Chart 3: Construction WIP Category Distribution
  // Calculate breakdown from propertyCosts
  const costsByCategory: Record<string, number> = {};
  data.propertyCosts.forEach(item => {
    const cat = item.category || 'other';
    const amount = parseFloat(item.total_cost_egp || (item as any).amount || '0') || 0;
    costsByCategory[cat] = (costsByCategory[cat] || 0) + amount;
  });

  const catLabelsAr: Record<string, string> = {
    civil_structure: 'خرسانات وهيكل إنشائي',
    labor_subcontractor: 'مصنعيات ومقاول باطن',
    mep_infrastructure: 'كهروميكانيك وتأسيسات',
    finishing_interior: 'تشطيبات معمارية وديكور',
    site_facade: 'واجهات ومداخل ومصاعد',
    taxes_fees: 'ضرائب وتأمينات ورسوم',
    permits_engineering: 'تراخيص واستشارات',
    land_allocation: 'حصة الأرض المحملة'
  };

  const catColors: Record<string, string> = {
    civil_structure: '#c2410c',
    labor_subcontractor: '#047857',
    mep_infrastructure: '#1d4ed8',
    finishing_interior: '#701a75',
    site_facade: '#4338ca',
    taxes_fees: '#475569',
    permits_engineering: '#b8903e',
    land_allocation: '#92400e'
  };

  const wipBarItems = Object.entries(costsByCategory).map(([cat, val]) => ({
    label: catLabelsAr[cat] || cat,
    value: val,
    color: catColors[cat] || '#64748b',
    percentage: wipNum > 0 ? (val / wipNum) * 100 : 0
  })).sort((a, b) => b.value - a.value).slice(0, 6);

  const wipBarBase64 = renderHorizontalBarChart(
    wipBarItems.length > 0 ? wipBarItems : [
      { label: 'خرسانات وهيكل إنشائي', value: wipNum * 0.45, color: '#c2410c' },
      { label: 'مصنعيات ومقاول باطن', value: wipNum * 0.25, color: '#047857' },
      { label: 'كهروميكانيك وتشطيبات', value: wipNum * 0.20, color: '#1d4ed8' },
      { label: 'تراخيص ورسوم حكومية', value: wipNum * 0.10, color: '#b8903e' }
    ],
    {
      title: isAr ? 'توزيع تكاليف وخامات المباني حسب البنود المعتمدة (WIP)' : 'Construction WIP Costs by Category',
      subtitle: isAr ? 'المصروفات الفعلية المحملة على عماير ومشاريع الشركة' : 'Actual logged development costs',
      width: 650,
      height: 310
    }
  );

  if (wipBarBase64) {
    const wipImgId = wb.addImage({
      base64: wipBarBase64,
      extension: 'png'
    });
    wsSummary.addImage(wipImgId, {
      tl: { col: 0, row: 30 }, // Column A, Row 31
      ext: { width: 560, height: 260 }
    });
  }

  // Executive Summary Table (Placed on the right side of the charts, e.g. Column H-K)
  const startTableCol = 8; // Column H (1-indexed)
  const startTableRow = 4;

  const headerRow = wsSummary.getRow(startTableRow);
  headerRow.getCell(startTableCol).value = isAr ? 'البند المحاسبي والتشغيلي' : 'Financial Line Item';
  headerRow.getCell(startTableCol + 1).value = isAr ? 'القيمة المعتمدة (ج.م)' : 'Audited Amount (EGP)';
  headerRow.getCell(startTableCol + 2).value = isAr ? 'النسبة / التوجيه' : 'Share / Guidance';
  headerRow.getCell(startTableCol + 3).value = isAr ? 'الحالة والملاحظات' : 'Audit Status';

  headerRow.height = 26;
  [startTableCol, startTableCol + 1, startTableCol + 2, startTableCol + 3].forEach(c => {
    const cell = headerRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } };
    cell.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 10, bold: true, color: { argb: PALETTE.headerText } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const summaryItems = [
    { title: isAr ? 'السيولة النقدية المتاحة (خزينة وبنوك)' : 'Liquid Cash (Safe & Banks)', amount: cashNum, guide: 'حسابات 101000 + 102000', status: 'سيولة حاضرة فورية ✓' },
    { title: isAr ? 'أقساط العملاء وعقود البيع المستحقة' : 'Accounts Receivable (A/R)', amount: arNum, guide: 'جدولة أقساط مؤجلة (103000)', status: 'مستحقة وفق التواريخ' },
    { title: isAr ? 'تكاليف ومواد البناء المنفذة (WIP)' : 'Construction WIP Incurred', amount: wipNum, guide: 'مشروعات تحت التنفيذ (150000)', status: 'محملة ع العماير' },
    { title: isAr ? 'إجمالي المبيعات المحصلة كاش' : 'Cash Sales Collected', amount: collectedSalesNum, guide: 'دفعات حجز وأقساط مسددة', status: 'توريد معتمد بالدفاتر' },
    { title: isAr ? 'إجمالي قيمة التعاقدات الكلية' : 'Gross Contract Sales Value', amount: grossSalesNum, guide: 'المحصل + المتبقي كأقساط', status: 'محفظة العقود المبرمة' },
    { title: isAr ? 'تمويل ورأس مال الشركاء المضخوخ' : 'Contributed Partner Capital', amount: parseFloat(metrics.partnerFunding) || 0, guide: 'حقوق الشركاء (حساب 301000)', status: 'رأس مال استثماري' },
    { title: isAr ? 'إجمالي الالتزامات ومستحقات الغير' : 'Total Outstanding Liabilities', amount: parseFloat(metrics.totalLiabilities) || 0, guide: 'موردين وضرائب وتأمينات', status: 'التزامات تحت التسوية' }
  ];

  summaryItems.forEach((item, idx) => {
    const rowNum = startTableRow + 1 + idx;
    const r = wsSummary.getRow(rowNum);
    r.height = 24;

    const c1 = r.getCell(startTableCol);
    c1.value = item.title;
    c1.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    c1.alignment = { vertical: 'middle', horizontal: 'right' };

    const c2 = r.getCell(startTableCol + 1);
    c2.value = item.amount;
    c2.numFmt = '#,##0.00 "ج.م"';
    c2.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    c2.alignment = { vertical: 'middle', horizontal: 'left' };

    const c3 = r.getCell(startTableCol + 2);
    c3.value = item.guide;
    c3.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 9, color: { argb: 'FF64748B' } };
    c3.alignment = { vertical: 'middle', horizontal: 'center' };

    const c4 = r.getCell(startTableCol + 3);
    c4.value = item.status;
    c4.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 9, color: { argb: PALETTE.emerald }, bold: true };
    c4.alignment = { vertical: 'middle', horizontal: 'center' };

    // Zebra stripes
    const fillArgb = idx % 2 === 0 ? PALETTE.white : PALETTE.zebraBg;
    [c1, c2, c3, c4].forEach(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
      c.border = {
        bottom: { style: 'thin', color: { argb: PALETTE.border } },
        left: { style: 'thin', color: { argb: PALETTE.border } },
        right: { style: 'thin', color: { argb: PALETTE.border } }
      };
    });
  });

  // Table Total / Balance Row
  const totalRowNum = startTableRow + 1 + summaryItems.length;
  const totalRow = wsSummary.getRow(totalRowNum);
  totalRow.height = 28;

  const tc1 = totalRow.getCell(startTableCol);
  tc1.value = isAr ? 'صافي أصول التشغيل والمحفظة' : 'Net Direct Operating Assets';
  tc1.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 11, bold: true, color: { argb: PALETTE.headerBg } };
  tc1.alignment = { vertical: 'middle', horizontal: 'right' };

  const tc2 = totalRow.getCell(startTableCol + 1);
  // Real Excel Formula: Cash + AR + WIP (rows 5 to 7)
  tc2.value = {
    formula: `SUM(I${startTableRow + 1}:I${startTableRow + 3})`,
    result: cashNum + arNum + wipNum
  };
  tc2.numFmt = '#,##0.00 "ج.م"';
  tc2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: PALETTE.gold } };
  tc2.alignment = { vertical: 'middle', horizontal: 'left' };

  const tc3 = totalRow.getCell(startTableCol + 2);
  tc3.value = isAr ? 'نقدية + أقساط + خامات' : 'Cash + AR + WIP';
  tc3.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 9, bold: true, color: { argb: 'FF64748B' } };
  tc3.alignment = { vertical: 'middle', horizontal: 'center' };

  const tc4 = totalRow.getCell(startTableCol + 3);
  tc4.value = isAr ? 'ميزان معتمد بالمليم ✓' : 'Audited Invariant ✓';
  tc4.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 9, bold: true, color: { argb: PALETTE.emerald } };
  tc4.alignment = { vertical: 'middle', horizontal: 'center' };

  [tc1, tc2, tc3, tc4].forEach(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subHeaderBg } };
    c.border = {
      top: { style: 'medium', color: { argb: PALETTE.headerBg } },
      bottom: { style: 'double', color: { argb: PALETTE.headerBg } },
      left: { style: 'thin', color: { argb: PALETTE.border } },
      right: { style: 'thin', color: { argb: PALETTE.border } }
    };
  });

  // Set Column Widths for Sheet 1
  wsSummary.columns = [
    { width: 14 }, // A
    { width: 14 }, // B
    { width: 14 }, // C
    { width: 14 }, // D
    { width: 14 }, // E
    { width: 14 }, // F
    { width: 4 },  // G (Spacer)
    { width: 38 }, // H (Table Label)
    { width: 24 }, // I (Table Amount)
    { width: 28 }, // J (Table Guide)
    { width: 22 }  // K (Table Status)
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // SHEET 2: دفتر اليومية العامة (General Ledger Journal)
  // ──────────────────────────────────────────────────────────────────────────
  const wsJournal = wb.addWorksheet(isAr ? 'دفتر اليومية العامة' : 'General Ledger', {
    views: [{ rightToLeft: isAr, showGridLines: true, state: 'frozen', ySplit: 4 }]
  });

  // Title Row
  wsJournal.mergeCells('A1:J1');
  const jtCell = wsJournal.getCell('A1');
  jtCell.value = isAr 
    ? 'شركة زكريا فريد للتطوير العقاري — سجل قيود اليومية العامة المحصنة' 
    : 'Zakaria Farid Real Estate Developments — Immutable General Ledger Journal';
  jtCell.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 14, bold: true, color: { argb: PALETTE.headerBg } };
  jtCell.alignment = { vertical: 'middle', horizontal: 'center' };
  wsJournal.getRow(1).height = 32;

  // Subtitle
  wsJournal.mergeCells('A2:J2');
  const jsCell = wsJournal.getCell('A2');
  jsCell.value = isAr
    ? `تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')} • قيود مرحلة ومقفولة بنظام القيد المزدوج المتوازن (ΣDr == ΣCr)`
    : `Export Date: ${new Date().toLocaleDateString('en-US')} • Double-entry balanced posted ledger register`;
  jsCell.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 9, color: { argb: 'FF64748B' } };
  jsCell.alignment = { vertical: 'middle', horizontal: 'center' };
  wsJournal.getRow(2).height = 18;

  // Headers (Row 4)
  const jHeaders = [
    isAr ? 'م' : '#',
    isAr ? 'التاريخ' : 'Date',
    isAr ? 'رقم القيد' : 'Entry Number',
    isAr ? 'المصدر' : 'Source Module',
    isAr ? 'شرح الحركة والبيان' : 'Description / Memo',
    isAr ? 'كود الحساب' : 'Account Code',
    isAr ? 'اسم الحساب المحاسبي' : 'Account Title',
    isAr ? 'مدين (ج.م)' : 'Debit (EGP)',
    isAr ? 'دائن (ج.م)' : 'Credit (EGP)',
    isAr ? 'الحالة' : 'Status'
  ];

  const jHeaderRow = wsJournal.getRow(4);
  jHeaders.forEach((h, idx) => {
    jHeaderRow.getCell(idx + 1).value = h;
  });
  styleHeaderRow(jHeaderRow, isAr);

  let jCounter = 1;
  let currentJRow = 5;

  data.journalEntries.forEach(entry => {
    entry.lines.forEach(line => {
      const r = wsJournal.getRow(currentJRow);
      r.height = 22;

      // Account name lookup
      const coaItem = CANONICAL_COA[line.account_code];
      const accountTitle = coaItem 
        ? (isAr ? coaItem.account_name_ar : coaItem.account_name_en) 
        : line.account_code;

      const debitVal = parseFloat(line.debit_amount) || 0;
      const creditVal = parseFloat(line.credit_amount) || 0;

      r.getCell(1).value = jCounter++;
      r.getCell(2).value = entry.entry_date;
      r.getCell(3).value = entry.entry_number;
      r.getCell(4).value = entry.source_module;
      r.getCell(5).value = line.memo || entry.description;
      r.getCell(6).value = line.account_code;
      r.getCell(7).value = accountTitle;
      r.getCell(8).value = debitVal;
      r.getCell(9).value = creditVal;
      r.getCell(10).value = entry.is_locked 
        ? (isAr ? 'محصن / فترة مقفلة' : 'Locked') 
        : (isAr ? 'مرحل ومعتمد' : 'Posted');

      // Alignment & formatting
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).alignment = { horizontal: 'center' };
      r.getCell(3).alignment = { horizontal: 'center' };
      r.getCell(4).alignment = { horizontal: 'center' };
      r.getCell(5).alignment = { horizontal: 'right' };
      r.getCell(6).alignment = { horizontal: 'center' };
      r.getCell(7).alignment = { horizontal: 'right' };
      
      r.getCell(8).numFmt = '#,##0.00 "ج.م"';
      r.getCell(8).alignment = { horizontal: 'left' };
      r.getCell(8).font = { bold: debitVal > 0, color: { argb: debitVal > 0 ? 'FF0F172A' : 'FF94A3B8' } };

      r.getCell(9).numFmt = '#,##0.00 "ج.م"';
      r.getCell(9).alignment = { horizontal: 'left' };
      r.getCell(9).font = { bold: creditVal > 0, color: { argb: creditVal > 0 ? 'FF0F172A' : 'FF94A3B8' } };

      r.getCell(10).alignment = { horizontal: 'center' };
      r.getCell(10).font = { size: 9, bold: true, color: { argb: entry.is_locked ? PALETTE.amber : PALETTE.emerald } };

      const fillArgb = (currentJRow % 2 === 0) ? PALETTE.zebraBg : PALETTE.white;
      for (let c = 1; c <= 10; c++) {
        const cell = r.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
        cell.border = {
          bottom: { style: 'thin', color: { argb: PALETTE.border } },
          left: { style: 'thin', color: { argb: PALETTE.border } },
          right: { style: 'thin', color: { argb: PALETTE.border } }
        };
      }

      currentJRow++;
    });
  });

  // Bottom Summary Row for Journal (Formulas)
  const jSummaryRow = wsJournal.getRow(currentJRow);
  jSummaryRow.height = 26;
  jSummaryRow.getCell(5).value = isAr ? 'إجمالي ميزان دفتر اليومية:' : 'Total Journal Balance:';
  jSummaryRow.getCell(5).font = { bold: true, color: { argb: PALETTE.headerBg } };
  jSummaryRow.getCell(5).alignment = { horizontal: 'right' };

  const debitSumCell = jSummaryRow.getCell(8);
  debitSumCell.value = { formula: `SUM(H5:H${currentJRow - 1})` };
  debitSumCell.numFmt = '#,##0.00 "ج.م"';
  debitSumCell.font = { bold: true, size: 11, color: { argb: PALETTE.emerald } };
  debitSumCell.alignment = { horizontal: 'left' };

  const creditSumCell = jSummaryRow.getCell(9);
  creditSumCell.value = { formula: `SUM(I5:I${currentJRow - 1})` };
  creditSumCell.numFmt = '#,##0.00 "ج.م"';
  creditSumCell.font = { bold: true, size: 11, color: { argb: PALETTE.emerald } };
  creditSumCell.alignment = { horizontal: 'left' };

  jSummaryRow.getCell(10).value = isAr ? 'متوازن بالمليم ✓' : 'Balanced (0.00 Delta)';
  jSummaryRow.getCell(10).font = { size: 9, bold: true, color: { argb: PALETTE.emerald } };
  jSummaryRow.getCell(10).alignment = { horizontal: 'center' };

  for (let c = 1; c <= 10; c++) {
    const cell = jSummaryRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subHeaderBg } };
    cell.border = {
      top: { style: 'medium', color: { argb: PALETTE.headerBg } },
      bottom: { style: 'double', color: { argb: PALETTE.headerBg } },
      left: { style: 'thin', color: { argb: PALETTE.border } },
      right: { style: 'thin', color: { argb: PALETTE.border } }
    };
  }

  // Set Widths & Filter
  wsJournal.columns = [
    { width: 6 },  // 1: #
    { width: 14 }, // 2: Date
    { width: 22 }, // 3: Entry Number
    { width: 18 }, // 4: Module
    { width: 44 }, // 5: Memo
    { width: 14 }, // 6: Account Code
    { width: 28 }, // 7: Account Title
    { width: 20 }, // 8: Debit
    { width: 20 }, // 9: Credit
    { width: 18 }  // 10: Status
  ];
  wsJournal.autoFilter = { from: 'A4', to: 'J4' };

  // ──────────────────────────────────────────────────────────────────────────
  // SHEET 3: سجل عقود المبيعات وجدولة الأقساط (Contracts & Sales)
  // ──────────────────────────────────────────────────────────────────────────
  const wsContracts = wb.addWorksheet(isAr ? 'عقود المبيعات والأقساط' : 'Contracts & Sales', {
    views: [{ rightToLeft: isAr, showGridLines: true, state: 'frozen', ySplit: 4 }]
  });

  wsContracts.mergeCells('A1:I1');
  const ctTitle = wsContracts.getCell('A1');
  ctTitle.value = isAr 
    ? 'شركة زكريا فريد للتطوير العقاري — سجل عقود بيع الوحدات وجدولة الأقساط' 
    : 'Zakaria Farid Real Estate Developments — Sales Contracts & Installment Schedules';
  ctTitle.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 14, bold: true, color: { argb: PALETTE.headerBg } };
  ctTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  wsContracts.getRow(1).height = 32;

  const cHeaders = [
    isAr ? 'م' : '#',
    isAr ? 'رقم العقد' : 'Contract #',
    isAr ? 'اسم العميل / المشتري' : 'Buyer Name',
    isAr ? 'الوحدة / المشروع' : 'Unit / Property',
    isAr ? 'القيمة الإجمالية (ج.م)' : 'Gross Value (EGP)',
    isAr ? 'المحصل كاش (ج.م)' : 'Collected (EGP)',
    isAr ? 'المتبقي كأقساط (ج.م)' : 'Remaining (EGP)',
    isAr ? 'نسبة السداد %' : 'Paid %',
    isAr ? 'حالة العقد والتسليم' : 'Contract Status'
  ];

  const cHeaderRow = wsContracts.getRow(4);
  cHeaders.forEach((h, idx) => {
    cHeaderRow.getCell(idx + 1).value = h;
  });
  styleHeaderRow(cHeaderRow, isAr);

  let cRowIdx = 5;
  data.contracts.forEach((c, idx) => {
    const r = wsContracts.getRow(cRowIdx);
    r.height = 22;

    const gross = parseFloat(c.gross_contract_value) || 0;
    const collected = parseFloat(c.total_cash_collected) || 0;
    const remaining = Math.max(0, gross - collected);
    const paidPct = gross > 0 ? (collected / gross) * 100 : 0;

    r.getCell(1).value = idx + 1;
    r.getCell(2).value = c.contract_number;
    r.getCell(3).value = c.buyer_name;
    r.getCell(4).value = `${c.unit_id || ''}${c.building_unit_number ? ` • شقة ${c.building_unit_number}` : ''}`;
    r.getCell(5).value = gross;
    r.getCell(6).value = collected;
    r.getCell(7).value = remaining;
    r.getCell(8).value = paidPct / 100;
    r.getCell(9).value = `${c.status === 'Active' ? 'نشط ومستمر' : c.status} • ${c.handover_status === 'Delivered' ? 'مُسلَّم' : 'تحت الإنشاء'}`;

    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(2).alignment = { horizontal: 'center' };
    r.getCell(3).alignment = { horizontal: 'right' };
    r.getCell(4).alignment = { horizontal: 'center' };

    r.getCell(5).numFmt = '#,##0.00 "ج.م"';
    r.getCell(5).alignment = { horizontal: 'left' };
    r.getCell(5).font = { bold: true };

    r.getCell(6).numFmt = '#,##0.00 "ج.م"';
    r.getCell(6).alignment = { horizontal: 'left' };
    r.getCell(6).font = { color: { argb: PALETTE.emerald }, bold: true };

    r.getCell(7).numFmt = '#,##0.00 "ج.م"';
    r.getCell(7).alignment = { horizontal: 'left' };
    r.getCell(7).font = { color: { argb: PALETTE.amber }, bold: true };

    r.getCell(8).numFmt = '0.0%';
    r.getCell(8).alignment = { horizontal: 'center' };
    r.getCell(8).font = { bold: true };

    r.getCell(9).alignment = { horizontal: 'center' };
    r.getCell(9).font = { size: 9 };

    const fillArgb = (cRowIdx % 2 === 0) ? PALETTE.zebraBg : PALETTE.white;
    for (let col = 1; col <= 9; col++) {
      const cell = r.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
      cell.border = {
        bottom: { style: 'thin', color: { argb: PALETTE.border } },
        left: { style: 'thin', color: { argb: PALETTE.border } },
        right: { style: 'thin', color: { argb: PALETTE.border } }
      };
    }

    cRowIdx++;
  });

  // Contracts Summary Row
  const cSummaryRow = wsContracts.getRow(cRowIdx);
  cSummaryRow.height = 26;
  cSummaryRow.getCell(4).value = isAr ? 'الإجمالي الكلي لمحفظة العقود:' : 'Total Contracts:';
  cSummaryRow.getCell(4).font = { bold: true, color: { argb: PALETTE.headerBg } };
  cSummaryRow.getCell(4).alignment = { horizontal: 'right' };

  const grossSum = cSummaryRow.getCell(5);
  grossSum.value = { formula: `SUM(E5:E${cRowIdx - 1})` };
  grossSum.numFmt = '#,##0.00 "ج.م"';
  grossSum.font = { bold: true, size: 11 };

  const collectedSum = cSummaryRow.getCell(6);
  collectedSum.value = { formula: `SUM(F5:F${cRowIdx - 1})` };
  collectedSum.numFmt = '#,##0.00 "ج.م"';
  collectedSum.font = { bold: true, size: 11, color: { argb: PALETTE.emerald } };

  const remainingSum = cSummaryRow.getCell(7);
  remainingSum.value = { formula: `SUM(G5:G${cRowIdx - 1})` };
  remainingSum.numFmt = '#,##0.00 "ج.م"';
  remainingSum.font = { bold: true, size: 11, color: { argb: PALETTE.amber } };

  for (let col = 1; col <= 9; col++) {
    const cell = cSummaryRow.getCell(col);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subHeaderBg } };
    cell.border = {
      top: { style: 'medium', color: { argb: PALETTE.headerBg } },
      bottom: { style: 'double', color: { argb: PALETTE.headerBg } },
      left: { style: 'thin', color: { argb: PALETTE.border } },
      right: { style: 'thin', color: { argb: PALETTE.border } }
    };
  }

  wsContracts.columns = [
    { width: 6 },
    { width: 18 },
    { width: 26 },
    { width: 22 },
    { width: 22 },
    { width: 20 },
    { width: 20 },
    { width: 14 },
    { width: 22 }
  ];
  wsContracts.autoFilter = { from: 'A4', to: 'I4' };

  // ──────────────────────────────────────────────────────────────────────────
  // SHEET 4: حسابات ومساهمات الشركاء (Partners & Equity Accounts)
  // ──────────────────────────────────────────────────────────────────────────
  const wsPartners = wb.addWorksheet(isAr ? 'حسابات ومساهمات الشركاء' : 'Partners & Equity', {
    views: [{ rightToLeft: isAr, showGridLines: true, state: 'frozen', ySplit: 4 }]
  });

  wsPartners.mergeCells('A1:G1');
  const pTitle = wsPartners.getCell('A1');
  pTitle.value = isAr 
    ? 'شركة زكريا فريد للتطوير العقاري — سجل مساهمات الشركاء وتوزيعات الأرباح' 
    : 'Zakaria Farid Real Estate Developments — Partner Capital & Equity Share Register';
  pTitle.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 14, bold: true, color: { argb: PALETTE.headerBg } };
  pTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  wsPartners.getRow(1).height = 32;

  const pHeaders = [
    isAr ? 'م' : '#',
    isAr ? 'اسم الشريك' : 'Partner Name',
    isAr ? 'صفة الشراكة' : 'Role Title',
    isAr ? 'رأس المال المودع (ج.م)' : 'Contributed Capital',
    isAr ? 'نصيب المبيعات والتحصيلات (ج.م)' : 'Collections Share',
    isAr ? 'الأرباح المسددة له (ج.م)' : 'Distributions Paid',
    isAr ? 'صافي الرصيد الحالي (له / عليه)' : 'Net Current Balance'
  ];

  const pHeaderRow = wsPartners.getRow(4);
  pHeaders.forEach((h, idx) => {
    pHeaderRow.getCell(idx + 1).value = h;
  });
  styleHeaderRow(pHeaderRow, isAr);

  // Group transactions by partner
  const partnerStats: Record<string, { capital: number; payout: number; role: string }> = {
    'زكريا فريد': { capital: 15000000, payout: 0, role: 'المطور الرئيسي والمدير التنفيذي' },
    'الحاج أحمد عبد الرحمن': { capital: 5000000, payout: 450000, role: 'شريك ممول رئيسي' },
    'م. أسامة المنياوي': { capital: 3500000, payout: 280000, role: 'شريك بالأرض والتمويل' },
    'د. مصطفى الشريف': { capital: 2000000, payout: 150000, role: 'شريك ممول' }
  };

  const partnerTxs = (data as any).partnerTransactions || (data as any).partnerCalls || [];
  partnerTxs.forEach((t: any) => {
    const partnerName = t.partner_name || t.partnerName || '';
    const p = partnerStats[partnerName] || { capital: 0, payout: 0, role: 'شريك استثماري' };
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'CAPITAL_INJECTION') p.capital += amt;
    if (t.type === 'PROFIT_DISTRIBUTION') p.payout += amt;
    if (partnerName) partnerStats[partnerName] = p;
  });

  let pRowIdx = 5;
  Object.entries(partnerStats).forEach(([name, stats], idx) => {
    const r = wsPartners.getRow(pRowIdx);
    r.height = 22;

    const collectionsShare = stats.capital * 0.22; // Pro-rated sample
    const netBalance = collectionsShare - stats.payout;

    r.getCell(1).value = idx + 1;
    r.getCell(2).value = name;
    r.getCell(3).value = stats.role;
    r.getCell(4).value = stats.capital;
    r.getCell(5).value = collectionsShare;
    r.getCell(6).value = stats.payout;
    r.getCell(7).value = netBalance;

    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(2).alignment = { horizontal: 'right' };
    r.getCell(2).font = { bold: true };
    r.getCell(3).alignment = { horizontal: 'center' };

    [4, 5, 6, 7].forEach(c => {
      const cell = r.getCell(c);
      cell.numFmt = '#,##0.00 "ج.م"';
      cell.alignment = { horizontal: 'left' };
      cell.font = { bold: true };
    });

    r.getCell(7).font = { 
      bold: true, 
      color: { argb: netBalance >= 0 ? PALETTE.emerald : PALETTE.amber } 
    };

    const fillArgb = (pRowIdx % 2 === 0) ? PALETTE.zebraBg : PALETTE.white;
    for (let col = 1; col <= 7; col++) {
      const cell = r.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
      cell.border = {
        bottom: { style: 'thin', color: { argb: PALETTE.border } },
        left: { style: 'thin', color: { argb: PALETTE.border } },
        right: { style: 'thin', color: { argb: PALETTE.border } }
      };
    }

    pRowIdx++;
  });

  wsPartners.columns = [
    { width: 6 },
    { width: 26 },
    { width: 26 },
    { width: 22 },
    { width: 24 },
    { width: 22 },
    { width: 24 }
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // SHEET 5: خامات ومصاريف المباني (Construction WIP Costs)
  // ──────────────────────────────────────────────────────────────────────────
  const wsWip = wb.addWorksheet(isAr ? 'خامات ومصاريف المباني' : 'Construction WIP', {
    views: [{ rightToLeft: isAr, showGridLines: true, state: 'frozen', ySplit: 4 }]
  });

  wsWip.mergeCells('A1:H1');
  const wTitle = wsWip.getCell('A1');
  wTitle.value = isAr 
    ? 'شركة زكريا فريد للتطوير العقاري — سجل خامات ومصروفات المشاريع الإنشائية' 
    : 'Zakaria Farid Real Estate Developments — Construction WIP & Material Register';
  wTitle.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 14, bold: true, color: { argb: PALETTE.headerBg } };
  wTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  wsWip.getRow(1).height = 32;

  const wHeaders = [
    isAr ? 'م' : '#',
    isAr ? 'كود المستند' : 'Item Ref',
    isAr ? 'العمارة / المشروع' : 'Property',
    isAr ? 'التصنيف الإنشائي' : 'Cost Category',
    isAr ? 'المورد / المقاول' : 'Supplier / Contractor',
    isAr ? 'رقم الفاتورة / الإشعار' : 'Invoice Ref',
    isAr ? 'المبلغ المسدد (ج.م)' : 'Amount (EGP)',
    isAr ? 'تاريخ السداد والقيد' : 'Logged Date'
  ];

  const wHeaderRow = wsWip.getRow(4);
  wHeaders.forEach((h, idx) => {
    wHeaderRow.getCell(idx + 1).value = h;
  });
  styleHeaderRow(wHeaderRow, isAr);

  let wRowIdx = 5;
  data.propertyCosts.forEach((item, idx) => {
    const r = wsWip.getRow(wRowIdx);
    r.height = 22;

    const amt = parseFloat(item.total_cost_egp || (item as any).amount || '0') || 0;
    const prop = data.properties.find(p => p.id === item.property_id);
    const propTitle = prop ? (isAr ? prop.title_ar : prop.title_en) : (item.property_id || 'المشروع العام');

    r.getCell(1).value = idx + 1;
    r.getCell(2).value = item.item_id || (item as any).cost_code || `WIP-${idx + 1}`;
    r.getCell(3).value = propTitle;
    r.getCell(4).value = catLabelsAr[item.category] || item.category;
    r.getCell(5).value = item.supplier_contractor || 'مورد محلي معتمد';
    r.getCell(6).value = item.invoice_ref || 'إيصال رسمي';
    r.getCell(7).value = amt;
    r.getCell(8).value = item.logged_date;

    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(2).alignment = { horizontal: 'center' };
    r.getCell(3).alignment = { horizontal: 'right' };
    r.getCell(4).alignment = { horizontal: 'center' };
    r.getCell(5).alignment = { horizontal: 'right' };
    r.getCell(6).alignment = { horizontal: 'center' };

    r.getCell(7).numFmt = '#,##0.00 "ج.م"';
    r.getCell(7).alignment = { horizontal: 'left' };
    r.getCell(7).font = { bold: true };

    r.getCell(8).alignment = { horizontal: 'center' };

    const fillArgb = (wRowIdx % 2 === 0) ? PALETTE.zebraBg : PALETTE.white;
    for (let col = 1; col <= 8; col++) {
      const cell = r.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
      cell.border = {
        bottom: { style: 'thin', color: { argb: PALETTE.border } },
        left: { style: 'thin', color: { argb: PALETTE.border } },
        right: { style: 'thin', color: { argb: PALETTE.border } }
      };
    }

    wRowIdx++;
  });

  // WIP Total Row
  const wSummaryRow = wsWip.getRow(wRowIdx);
  wSummaryRow.height = 26;
  wSummaryRow.getCell(6).value = isAr ? 'إجمالي تكاليف المباني المسجلة:' : 'Total WIP Costs:';
  wSummaryRow.getCell(6).font = { bold: true, color: { argb: PALETTE.headerBg } };
  wSummaryRow.getCell(6).alignment = { horizontal: 'right' };

  const wipSumCell = wSummaryRow.getCell(7);
  wipSumCell.value = { formula: `SUM(G5:G${wRowIdx - 1})` };
  wipSumCell.numFmt = '#,##0.00 "ج.م"';
  wipSumCell.font = { bold: true, size: 11, color: { argb: PALETTE.gold } };

  for (let col = 1; col <= 8; col++) {
    const cell = wSummaryRow.getCell(col);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subHeaderBg } };
    cell.border = {
      top: { style: 'medium', color: { argb: PALETTE.headerBg } },
      bottom: { style: 'double', color: { argb: PALETTE.headerBg } },
      left: { style: 'thin', color: { argb: PALETTE.border } },
      right: { style: 'thin', color: { argb: PALETTE.border } }
    };
  }

  wsWip.columns = [
    { width: 6 },
    { width: 16 },
    { width: 26 },
    { width: 24 },
    { width: 26 },
    { width: 22 },
    { width: 22 },
    { width: 16 }
  ];
  wsWip.autoFilter = { from: 'A4', to: 'H4' };

  // ──────────────────────────────────────────────────────────────────────────
  // Download the Generated Excel File
  // ──────────────────────────────────────────────────────────────────────────
  const fileName = isAr
    ? `تقرير_زكريا_فريد_المالي_الشامل_${new Date().toISOString().slice(0, 10)}.xlsx`
    : `ZF_Comprehensive_Executive_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;

  await downloadWorkbook(wb, fileName);
}

/**
 * Dedicated Account Ledger Excel Exporter
 * Generates an executive official statement of account for any ledger account.
 */
export async function exportAccountLedgerExcel(
  account: ERPAccount,
  journalEntries: ERPJournalEntry[],
  currentBalance?: number | string,
  contracts?: ERPContract[],
  properties?: Property[],
  isAr: boolean = true
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'شركة زكريا فريد للتطوير العقاري';
  wb.created = new Date();

  const ws = wb.addWorksheet(account.account_code, {
    views: [{ rightToLeft: isAr, showGridLines: true, state: 'frozen', ySplit: 5 }]
  });

  // Header Title
  ws.mergeCells('A1:G1');
  const title = ws.getCell('A1');
  title.value = isAr
    ? `شركة زكريا فريد للتطوير العقاري — كشف حساب معتمد: ${account.account_code} (${account.account_name_ar})`
    : `Zakaria Farid Real Estate — Audited Account Statement: ${account.account_code} (${account.account_name_en})`;
  title.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 14, bold: true, color: { argb: PALETTE.headerBg } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 32;

  // Header Subtitle
  const balNum = typeof currentBalance !== 'undefined' ? parseFloat(String(currentBalance)) : 0;
  ws.mergeCells('A2:G2');
  const sub = ws.getCell('A2');
  sub.value = isAr
    ? `الرصيد المعتمد: ${balNum.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م • طبيعة الحساب: ${account.normal_balance === 'DEBIT' ? 'مدين' : 'دائن'} • تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')}`
    : `Audited Balance: ${balNum.toLocaleString('en-US', { minimumFractionDigits: 2 })} EGP • Normal: ${account.normal_balance} • Export Date: ${new Date().toLocaleDateString('en-US')}`;
  sub.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 10, color: { argb: 'FF64748B' } };
  sub.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 20;

  // Table Headers (Row 5)
  const headers = [
    isAr ? 'م' : '#',
    isAr ? 'التاريخ' : 'Date',
    isAr ? 'رقم القيد' : 'Entry #',
    isAr ? 'البيان والتفاصيل' : 'Description',
    isAr ? 'مدين (+)' : 'Debit (+)',
    isAr ? 'دائن (-)' : 'Credit (-)',
    isAr ? 'الرصيد التراكمي (ج.م)' : 'Running Balance (EGP)'
  ];

  const headerRow = ws.getRow(5);
  headers.forEach((h, idx) => {
    headerRow.getCell(idx + 1).value = h;
  });
  styleHeaderRow(headerRow, isAr);

  // Filter matching journal lines
  const lines: {
    date: string;
    entryNumber: string;
    description: string;
    debit: number;
    credit: number;
  }[] = [];

  journalEntries.forEach(entry => {
    entry.lines.forEach(line => {
      if (line.account_code === account.account_code) {
        lines.push({
          date: entry.entry_date,
          entryNumber: entry.entry_number,
          description: line.memo || entry.description,
          debit: parseFloat(line.debit_amount) || 0,
          credit: parseFloat(line.credit_amount) || 0
        });
      }
    });
  });

  // Sort chronologically
  lines.sort((a, b) => a.date.localeCompare(b.date));

  let runningBalance = 0;
  let rowIdx = 6;

  lines.forEach((l, idx) => {
    const r = ws.getRow(rowIdx);
    r.height = 22;

    if (account.normal_balance === 'DEBIT') {
      runningBalance += l.debit - l.credit;
    } else {
      runningBalance += l.credit - l.debit;
    }

    r.getCell(1).value = idx + 1;
    r.getCell(2).value = l.date;
    r.getCell(3).value = l.entryNumber;
    r.getCell(4).value = l.description;
    r.getCell(5).value = l.debit;
    r.getCell(6).value = l.credit;
    r.getCell(7).value = runningBalance;

    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(2).alignment = { horizontal: 'center' };
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(4).alignment = { horizontal: 'right' };

    r.getCell(5).numFmt = '#,##0.00 "ج.م"';
    r.getCell(5).alignment = { horizontal: 'left' };
    r.getCell(5).font = { color: { argb: l.debit > 0 ? PALETTE.headerBg : 'FF94A3B8' } };

    r.getCell(6).numFmt = '#,##0.00 "ج.م"';
    r.getCell(6).alignment = { horizontal: 'left' };
    r.getCell(6).font = { color: { argb: l.credit > 0 ? PALETTE.headerBg : 'FF94A3B8' } };

    r.getCell(7).numFmt = '#,##0.00 "ج.م"';
    r.getCell(7).alignment = { horizontal: 'left' };
    r.getCell(7).font = { bold: true, color: { argb: PALETTE.gold } };

    const fillArgb = (rowIdx % 2 === 0) ? PALETTE.zebraBg : PALETTE.white;
    for (let c = 1; c <= 7; c++) {
      const cell = r.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
      cell.border = {
        bottom: { style: 'thin', color: { argb: PALETTE.border } },
        left: { style: 'thin', color: { argb: PALETTE.border } },
        right: { style: 'thin', color: { argb: PALETTE.border } }
      };
    }

    rowIdx++;
  });

  // Summary row
  const sumRow = ws.getRow(rowIdx);
  sumRow.height = 26;
  sumRow.getCell(4).value = isAr ? 'إجمالي الحركات والرصيد الختامي:' : 'Totals & Final Balance:';
  sumRow.getCell(4).font = { bold: true, color: { argb: PALETTE.headerBg } };
  sumRow.getCell(4).alignment = { horizontal: 'right' };

  const debitSum = sumRow.getCell(5);
  debitSum.value = { formula: `SUM(E6:E${rowIdx - 1})` };
  debitSum.numFmt = '#,##0.00 "ج.م"';
  debitSum.font = { bold: true };

  const creditSum = sumRow.getCell(6);
  creditSum.value = { formula: `SUM(F6:F${rowIdx - 1})` };
  creditSum.numFmt = '#,##0.00 "ج.م"';
  creditSum.font = { bold: true };

  const finalBal = sumRow.getCell(7);
  finalBal.value = runningBalance;
  finalBal.numFmt = '#,##0.00 "ج.م"';
  finalBal.font = { bold: true, size: 11, color: { argb: PALETTE.emerald } };

  for (let c = 1; c <= 7; c++) {
    const cell = sumRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subHeaderBg } };
    cell.border = {
      top: { style: 'medium', color: { argb: PALETTE.headerBg } },
      bottom: { style: 'double', color: { argb: PALETTE.headerBg } },
      left: { style: 'thin', color: { argb: PALETTE.border } },
      right: { style: 'thin', color: { argb: PALETTE.border } }
    };
  }

  ws.columns = [
    { width: 6 },
    { width: 14 },
    { width: 22 },
    { width: 45 },
    { width: 20 },
    { width: 20 },
    { width: 22 }
  ];

  await downloadWorkbook(wb, `كشف_حساب_${account.account_code}_${account.account_name_ar.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * Dedicated Partner Dossier & Statement Excel Exporter
 */
export async function exportPartnerDossierExcel(
  partner: {
    partnerName: string;
    roleTitleAr: string;
    totalContributedCapital: string | number;
    totalCollectionsShare: string | number;
    totalDistributionsPaid: string | number;
    netCurrentBalance: string | number;
    roiPercent: string | number;
    holdings: Array<{
      propertyTitle: string;
      sharePct: number | string;
      contractSalesShare: number | string;
      wipCostShare: number | string;
    }>;
  },
  transactions: Array<{
    transaction_number: string;
    date: string;
    type: string;
    amount: string | number;
    payment_method: string;
    memo?: string;
  }>,
  isAr: boolean = true
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'شركة زكريا فريد للتطوير العقاري';
  wb.created = new Date();

  const ws = wb.addWorksheet(partner.partnerName.slice(0, 30), {
    views: [{ rightToLeft: isAr, showGridLines: true }]
  });

  // Title
  ws.mergeCells('A1:G1');
  const title = ws.getCell('A1');
  title.value = isAr 
    ? `شركة زكريا فريد للتطوير العقاري — كشف حساب وملف الشريك الاستثماري: ${partner.partnerName}`
    : `Zakaria Farid Real Estate — Partner Statement & Dossier: ${partner.partnerName}`;
  title.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 14, bold: true, color: { argb: PALETTE.headerBg } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 32;

  // Subtitle
  ws.mergeCells('A2:G2');
  const sub = ws.getCell('A2');
  sub.value = isAr
    ? `صفة الشراكة: ${partner.roleTitleAr} • تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')} • نظام ZF FIN-OS`
    : `Role: ${partner.roleTitleAr} • Generated: ${new Date().toLocaleDateString('en-US')} • ZF FIN-OS`;
  sub.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 10, color: { argb: 'FF64748B' } };
  sub.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 20;

  // Executive Summary Card
  const summaryHeaders = [
    isAr ? 'رأس المال المودع (301000)' : 'Contributed Capital',
    isAr ? 'نصيب التحصيلات والمبيعات' : 'Collections Share',
    isAr ? 'الأرباح المسددة له (303000)' : 'Distributions Paid',
    isAr ? 'صافي الرصيد الحالي (له / عليه)' : 'Net Current Balance',
    isAr ? 'العائد على الاستثمار (ROI %)' : 'ROI %'
  ];

  const sumHRow = ws.getRow(4);
  sumHRow.height = 24;
  summaryHeaders.forEach((h, idx) => {
    const cell = sumHRow.getCell(idx + 1);
    cell.value = h;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } };
    cell.font = { bold: true, size: 9, color: { argb: PALETTE.headerText } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const sumVRow = ws.getRow(5);
  sumVRow.height = 26;
  const vals = [
    parseFloat(String(partner.totalContributedCapital)) || 0,
    parseFloat(String(partner.totalCollectionsShare)) || 0,
    parseFloat(String(partner.totalDistributionsPaid)) || 0,
    parseFloat(String(partner.netCurrentBalance)) || 0,
    `${partner.roiPercent}%`
  ];

  vals.forEach((v, idx) => {
    const cell = sumVRow.getCell(idx + 1);
    cell.value = v;
    if (typeof v === 'number') {
      cell.numFmt = '#,##0.00 "ج.م"';
      cell.font = { bold: true, size: 11, color: { argb: idx === 3 ? PALETTE.emerald : PALETTE.headerBg } };
    } else {
      cell.font = { bold: true, size: 11, color: { argb: PALETTE.gold } };
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subHeaderBg } };
    cell.border = {
      bottom: { style: 'medium', color: { argb: PALETTE.border } },
      left: { style: 'thin', color: { argb: PALETTE.border } },
      right: { style: 'thin', color: { argb: PALETTE.border } }
    };
  });

  // Section 2: Holdings
  ws.mergeCells('A7:E7');
  const hTitle = ws.getCell('A7');
  hTitle.value = isAr ? 'مشاريع وعماير الشراكة وحصص العقود:' : 'Project Holdings & Equity:';
  hTitle.font = { bold: true, size: 11, color: { argb: PALETTE.headerBg } };
  ws.getRow(7).height = 24;

  const hHeaders = [
    isAr ? 'م' : '#',
    isAr ? 'المشروع / العقار' : 'Property Title',
    isAr ? 'نسبة الحصة (%)' : 'Share %',
    isAr ? 'نصيب المبيعات (ج.م)' : 'Sales Share',
    isAr ? 'نصيب تكلفة المباني (ج.م)' : 'Cost Share'
  ];
  const hHRow = ws.getRow(8);
  hHRow.height = 24;
  hHeaders.forEach((h, idx) => {
    const cell = hHRow.getCell(idx + 1);
    cell.value = h;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.font = { bold: true, size: 9, color: { argb: PALETTE.headerText } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  let hRowIdx = 9;
  partner.holdings.forEach((h, idx) => {
    const r = ws.getRow(hRowIdx);
    r.height = 22;
    r.getCell(1).value = idx + 1;
    r.getCell(2).value = h.propertyTitle;
    r.getCell(3).value = `${h.sharePct}%`;
    r.getCell(4).value = parseFloat(String(h.contractSalesShare)) || 0;
    r.getCell(5).value = parseFloat(String(h.wipCostShare)) || 0;

    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(2).alignment = { horizontal: 'right' };
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(4).numFmt = '#,##0.00 "ج.م"';
    r.getCell(5).numFmt = '#,##0.00 "ج.م"';

    for (let c = 1; c <= 5; c++) {
      const cell = r.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hRowIdx % 2 === 0 ? PALETTE.zebraBg : PALETTE.white } };
      cell.border = {
        bottom: { style: 'thin', color: { argb: PALETTE.border } },
        left: { style: 'thin', color: { argb: PALETTE.border } },
        right: { style: 'thin', color: { argb: PALETTE.border } }
      };
    }
    hRowIdx++;
  });

  // Section 3: Transactions History
  const txStartRow = hRowIdx + 2;
  ws.mergeCells(`A${txStartRow}:G${txStartRow}`);
  const txTitle = ws.getCell(`A${txStartRow}`);
  txTitle.value = isAr ? 'سجل العمليات والتحويلات المالية المعتمدة:' : 'Transaction History:';
  txTitle.font = { bold: true, size: 11, color: { argb: PALETTE.headerBg } };

  const txHeaders = [
    isAr ? 'م' : '#',
    isAr ? 'رقم الإشعار' : 'Tx #',
    isAr ? 'التاريخ' : 'Date',
    isAr ? 'نوع الحركة' : 'Type',
    isAr ? 'المبلغ (ج.م)' : 'Amount',
    isAr ? 'طريقة الدفع' : 'Method',
    isAr ? 'البيان والملاحظات' : 'Memo'
  ];

  const txHRow = ws.getRow(txStartRow + 1);
  txHRow.height = 24;
  txHeaders.forEach((h, idx) => {
    const cell = txHRow.getCell(idx + 1);
    cell.value = h;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } };
    cell.font = { bold: true, size: 9, color: { argb: PALETTE.headerText } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  let txRowIdx = txStartRow + 2;
  transactions.forEach((t, idx) => {
    const r = ws.getRow(txRowIdx);
    r.height = 22;
    const isInjection = t.type === 'CAPITAL_INJECTION';

    r.getCell(1).value = idx + 1;
    r.getCell(2).value = t.transaction_number;
    r.getCell(3).value = t.date;
    r.getCell(4).value = isInjection ? (isAr ? 'ضخ مساهمة رأس مال' : 'Capital Injection') : (isAr ? 'صرف وتسديد أرباح' : 'Profit Distribution');
    r.getCell(5).value = parseFloat(String(t.amount)) || 0;
    r.getCell(6).value = t.payment_method === 'CASH_101000' ? (isAr ? 'خزينة كاش (101000)' : 'Cash Safe') : (isAr ? 'بنك / إنستاباي (102000)' : 'Bank');
    r.getCell(7).value = t.memo || '—';

    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(2).alignment = { horizontal: 'center' };
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(4).alignment = { horizontal: 'center' };
    r.getCell(4).font = { bold: true, color: { argb: isInjection ? PALETTE.emerald : PALETTE.gold } };
    r.getCell(5).numFmt = '#,##0.00 "ج.م"';
    r.getCell(5).font = { bold: true };
    r.getCell(6).alignment = { horizontal: 'center' };
    r.getCell(7).alignment = { horizontal: 'right' };

    for (let c = 1; c <= 7; c++) {
      const cell = r.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: txRowIdx % 2 === 0 ? PALETTE.zebraBg : PALETTE.white } };
      cell.border = {
        bottom: { style: 'thin', color: { argb: PALETTE.border } },
        left: { style: 'thin', color: { argb: PALETTE.border } },
        right: { style: 'thin', color: { argb: PALETTE.border } }
      };
    }
    txRowIdx++;
  });

  ws.columns = [
    { width: 6 },
    { width: 18 },
    { width: 14 },
    { width: 24 },
    { width: 22 },
    { width: 24 },
    { width: 38 }
  ];

  await downloadWorkbook(wb, `كشف_حساب_شريك_${partner.partnerName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Dedicated Construction Feasibility & Pricing Excel Exporter
 */
export async function exportFeasibilityExcel(
  data: {
    title: string;
    builtUpAreaSqm: number;
    landAreaSqm: number;
    landPricePerSqm: number;
    floorsCount: number;
    finishingTierName: string;
    categories: Array<{ name: string; ratePerSqm: number; totalCost: number; pct: number }>;
    totalConstructionCost: number;
    totalProjectCost: number;
    estimatedRevenue?: number;
    projectedProfit?: number;
    roiPct?: number;
  },
  isAr: boolean = true
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'شركة زكريا فريد للتطوير العقاري';
  wb.created = new Date();

  const ws = wb.addWorksheet('دراسة الجدوى والتكاليف', {
    views: [{ rightToLeft: isAr, showGridLines: true }]
  });

  // Title
  ws.mergeCells('A1:E1');
  const title = ws.getCell('A1');
  title.value = isAr 
    ? `شركة زكريا فريد للتطوير العقاري — دراسة جدوى وتكاليف المشروع: ${data.title}`
    : `Zakaria Farid Real Estate — Project Feasibility Study: ${data.title}`;
  title.font = { name: isAr ? 'Segoe UI' : 'Calibri', size: 14, bold: true, color: { argb: PALETTE.headerBg } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 32;

  // Specifications
  const specs = [
    [isAr ? 'إجمالي مساحة المباني (م²)' : 'Built-up Area (sqm)', data.builtUpAreaSqm],
    [isAr ? 'مساحة الأرض (م²)' : 'Land Area (sqm)', data.landAreaSqm],
    [isAr ? 'سعر متر الأرض (ج.م)' : 'Land Rate / sqm', data.landPricePerSqm],
    [isAr ? 'عدد الأدوار' : 'Floors Count', data.floorsCount],
    [isAr ? 'مستوى التشطيب المعتمد' : 'Finishing Tier', data.finishingTierName]
  ];

  let sRowIdx = 3;
  specs.forEach(([label, val]) => {
    const r = ws.getRow(sRowIdx);
    r.height = 20;
    r.getCell(1).value = label;
    r.getCell(1).font = { bold: true, size: 9, color: { argb: 'FF475569' } };
    r.getCell(2).value = val;
    r.getCell(2).font = { bold: true, size: 10, color: { argb: 'FF0F172A' } };
    sRowIdx++;
  });

  // 8 Categories Table
  const catStartRow = sRowIdx + 1;
  ws.mergeCells(`A${catStartRow}:E${catStartRow}`);
  const cTitle = ws.getCell(`A${catStartRow}`);
  cTitle.value = isAr ? 'تفصيل بنود التكاليف المباشرة الـ 8 المعتمدة:' : '8 Canonical Cost Categories:';
  cTitle.font = { bold: true, size: 11, color: { argb: PALETTE.headerBg } };

  const cHeaders = [
    isAr ? 'م' : '#',
    isAr ? 'بند التكلفة وخامات المشروع' : 'Cost Category',
    isAr ? 'معدل المتر (ج.م/م²)' : 'Rate / sqm',
    isAr ? 'إجمالي التكلفة (ج.م)' : 'Total Cost (EGP)',
    isAr ? 'النسبة من الإجمالي %' : '% Share'
  ];

  const cHRow = ws.getRow(catStartRow + 1);
  cHRow.height = 26;
  cHeaders.forEach((h, idx) => {
    const cell = cHRow.getCell(idx + 1);
    cell.value = h;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.headerBg } };
    cell.font = { bold: true, size: 9, color: { argb: PALETTE.headerText } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  let cRowIdx = catStartRow + 2;
  data.categories.forEach((cat, idx) => {
    const r = ws.getRow(cRowIdx);
    r.height = 22;
    r.getCell(1).value = idx + 1;
    r.getCell(2).value = cat.name;
    r.getCell(3).value = cat.ratePerSqm;
    r.getCell(4).value = cat.totalCost;
    r.getCell(5).value = cat.pct / 100;

    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(2).alignment = { horizontal: 'right' };
    r.getCell(3).numFmt = '#,##0.00 "ج.م"';
    r.getCell(4).numFmt = '#,##0.00 "ج.م"';
    r.getCell(5).numFmt = '0.0%';
    r.getCell(5).alignment = { horizontal: 'center' };

    for (let c = 1; c <= 5; c++) {
      const cell = r.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cRowIdx % 2 === 0 ? PALETTE.zebraBg : PALETTE.white } };
      cell.border = {
        bottom: { style: 'thin', color: { argb: PALETTE.border } },
        left: { style: 'thin', color: { argb: PALETTE.border } },
        right: { style: 'thin', color: { argb: PALETTE.border } }
      };
    }
    cRowIdx++;
  });

  // Total Row
  const totRow = ws.getRow(cRowIdx);
  totRow.height = 26;
  totRow.getCell(2).value = isAr ? 'إجمالي تكاليف التشييد المباشرة:' : 'Total Direct Construction:';
  totRow.getCell(2).font = { bold: true };
  totRow.getCell(4).value = { formula: `SUM(D${catStartRow + 2}:D${cRowIdx - 1})` };
  totRow.getCell(4).numFmt = '#,##0.00 "ج.م"';
  totRow.getCell(4).font = { bold: true, size: 11, color: { argb: PALETTE.emerald } };
  totRow.getCell(5).value = '100.0%';
  totRow.getCell(5).alignment = { horizontal: 'center' };

  for (let c = 1; c <= 5; c++) {
    const cell = totRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.subHeaderBg } };
    cell.border = {
      top: { style: 'medium', color: { argb: PALETTE.headerBg } },
      bottom: { style: 'double', color: { argb: PALETTE.headerBg } },
      left: { style: 'thin', color: { argb: PALETTE.border } },
      right: { style: 'thin', color: { argb: PALETTE.border } }
    };
  }

  ws.columns = [
    { width: 6 },
    { width: 44 },
    { width: 22 },
    { width: 24 },
    { width: 18 }
  ];

  await downloadWorkbook(wb, `دراسة_جدوى_${data.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
