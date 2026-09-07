'use client';

import React from 'react';
import { FileCheck2, AlertCircle } from 'lucide-react';
import styles from './JournalEntryPreview.module.css';
import { ERPJournalEntry } from '@/lib/erp/types';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import { D } from '@/lib/erp/math';

interface JournalEntryPreviewProps {
  entry: ERPJournalEntry;
  isDraft?: boolean;
  isAr?: boolean;
}

// Helper to convert English titles and common customer names to friendly Arabic
export const localizeBuyerName = (str: string): string => {
  if (!str) return str;
  let out = str
    .replace(/\bEng\.\s*/gi, 'م. ')
    .replace(/\bDr\.\s*/gi, 'د. ')
    .replace(/\bMr\.\s*/gi, 'أ. ')
    .replace(/\bMrs\.\s*/gi, 'أ. ')
    .replace(/\bEng\b/gi, 'م.')
    .replace(/\bDr\b/gi, 'د.');

  const names: Record<string, string> = {
    'Mahmoud El-Sayed': 'محمود السيد',
    'Karim Hassan': 'كريم حسن',
    'Karim El-Mansouri': 'كريم المنصوري',
    'Ahmed Mostafa': 'أحمد مصطفى',
    'Mohamed Ali': 'محمد علي',
    'Tamer Hosny': 'تامر حسني',
    'Sherif Amer': 'شريف عامر',
    'Youssef Farouk': 'يوسف فاروق',
    'Omar Khaled': 'عمر خالد',
    'Mona Zaki': 'منى زكي',
    'Tarek Abdel-Rahman': 'طارق عبد الرحمن',
    'Tarek Abdel Rahman': 'طارق عبد الرحمن',
    'Hossam Othman': 'حسام عثمان',
    'Hossam El-Din Othman': 'حسام الدين عثمان',
    'Wael Azmy': 'وائل عزمي',
    'Mahmoud Taha': 'محمود طه',
    'Mona Al-Sawy': 'منى الصاوي',
    'Youssef Badr & Partners': 'يوسف بدر وشركاه'
  };

  Object.entries(names).forEach(([en, ar]) => {
    out = out.replace(new RegExp(en, 'gi'), ar);
  });

  return out;
};

// Helper functions to translate standard English accounting descriptions & memos to simple Egyptian Arabic
export const localizeJournalDescription = (desc: string, isAr: boolean): string => {
  if (!isAr || !desc) return desc;

  let text = desc;

  // 1. Installment / tranche collections
  // Case A: Down payment / Tranche 0: "Installment #0 collected - Contract ZF-2026-2986"
  text = text.replace(/Installment\s*#0\s*(?:collected\s*(?:by\s*hand\s*)?[-–—]\s*)Contract\s*([A-Za-z0-9_-]+)/gi, 
    'تحصيل دفعة مقدم الحجز (قسط رقم 0) - عقد رقم $1');

  // Case B: Tranche N collected by hand: "Installment #3 collected by hand - Contract ZF-2026-4651"
  text = text.replace(/Installment\s*#(\d+)\s*collected\s*by\s*hand\s*[-–—]\s*Contract\s*([A-Za-z0-9_-]+)/gi, 
    'تحصيل القسط رقم $1 كاش باليد - عقد رقم $2');

  // Case C: General tranche: "Installment #3 collected - Contract ZF-2026-4651"
  text = text.replace(/Installment\s*#(\d+)\s*collected\s*[-–—]\s*Contract\s*([A-Za-z0-9_-]+)/gi, 
    'تحصيل القسط رقم $1 - عقد رقم $2');

  // Case D: Hand collection into Treasury Safe
  text = text.replace(/Installment\s*#([A-Za-z0-9_-]+)\s*collected\s*by\s*hand\s*into\s*Treasury\s*Safe/gi, 
    'توريد القسط رقم $1 كاش باليد في خزينة الشركة');

  // Case E: Safe clearance
  text = text.replace(/Installment\s*#([A-Za-z0-9_-]+)\s*cleared\s*from\s*Safe\s*custody/gi, 
    'صرف وتوريد القسط رقم $1 من عهدة الخزينة');

  // Case F: Generic installment collection
  text = text.replace(/Installment\s*#(\d+)\s*collected/gi, 'تحصيل القسط رقم $1');

  // 2. Advance Collections: "Advance Collection for Contract ZF-2026-2986 (Eng. Mahmoud El-Sayed)"
  text = text.replace(/Advance Collection for Contract\s*([A-Za-z0-9_-]+)\s*\((.*?)\)/gi, (match, contractNum, buyer) => {
    const cleanBuyer = localizeBuyerName(buyer);
    return `تحصيل الدفعة المقدمة لعقد البيع رقم ${contractNum} (${cleanBuyer})`;
  });

  text = text.replace(/Advance Collection for Contract\s*([A-Za-z0-9_-]+)/gi, 
    'تحصيل الدفعة المقدمة لعقد البيع رقم $1');

  // 3. Handover & Revenue Recognition
  text = text.replace(/(?:Physical\s+)?Handover\s*(?:Protocol\s*)?(?:&\s*Revenue\s*Recognition\s*)?(?:\(Model\s*B\)\s*)?for\s*Contract\s*([A-Za-z0-9_-]+)\s*\((.*?)\)/gi, (match, contractNum, buyer) => {
    const cleanBuyer = localizeBuyerName(buyer);
    return `محضر تسليم الشقة النهائي واعتراف بإيراد المبيعات للعقد ${contractNum} (${cleanBuyer})`;
  });

  text = text.replace(/(?:Physical\s+)?Handover\s*(?:Protocol\s*)?(?:&\s*Revenue\s*Recognition\s*)?(?:\(Model\s*B\)\s*)?for\s*Contract\s*([A-Za-z0-9_-]+)/gi, 
    'محضر تسليم الشقة واعتراف بإيراد المبيعات للعقد $1');

  // 4. Contract Rescissions: "Contract Rescission & Cancellation (Branch 1 - Pre-Delivery) for ZF-2026-8522 (Forfeiture Floor Applied)"
  text = text.replace(/Contract Rescission & Cancellation \(Branch 1 - Pre-Delivery\) for\s*([A-Za-z0-9_-]+)\s*\((.*?)\)/gi, (match, contractNum, extra) => {
    const localizedExtra = extra.includes('Forfeiture') 
      ? 'مع استقطاع نسبة الفسخ القانونية' 
      : localizeBuyerName(extra);
    return `فسخ وإلغاء التعاقد (قبل استلام الشقة) للعقد رقم ${contractNum} (${localizedExtra})`;
  });

  text = text.replace(/Contract Rescission & Repossession \(Branch 2 - Post-Delivery\) for\s*([A-Za-z0-9_-]+)\s*\((.*?)\)/gi, (match, contractNum, extra) => {
    const localizedExtra = extra.includes('Forfeiture') 
      ? 'مع استقطاع نسبة الفسخ القانونية' 
      : localizeBuyerName(extra);
    return `فسخ واسترداد الشقة (بعد الاستلام) للعقد رقم ${contractNum} (${localizedExtra})`;
  });

  text = text.replace(/Contract Rescission & Cancellation \(Branch 1 - Pre-Delivery\)/gi,
    'فسخ وإلغاء التعاقد (قبل استلام الشقة)');

  text = text.replace(/Contract Rescission & Repossession \(Branch 2 - Post-Delivery\)/gi,
    'فسخ واسترداد الشقة (بعد الاستلام)');

  // 5. Cleanup remaining English legal / accounting terms inside Arabic strings
  text = text.replace(/\(Forfeiture Floor Applied\)/gi, '(مع استقطاع نسبة الفسخ القانونية)');
  text = text.replace(/Forfeiture Floor Applied/gi, 'استقطاع نسبة الفسخ القانونية');
  text = text.replace(/\(Branch 1 - Pre-Delivery\)/gi, '(قبل استلام الشقة)');
  text = text.replace(/\(Branch 2 - Post-Delivery\)/gi, '(بعد تسليم الشقة)');

  // 6. Titles and names cleanup
  text = localizeBuyerName(text);

  // 7. General & Opening balances
  text = text.replace(/^Initial Opening Balance/gi, 'قيد الأرصدة الافتتاحية الأولية للشركة');
  text = text.replace(/^Quick Expense \/ Transaction/gi, 'مصروف ونثريات تشغيلية سريعة');
  text = text.replace(/Direct cash disbursement/gi, 'صرف نقدية مباشرة من الخزينة');
  text = text.replace(/Cash collection by hand into Treasury Safe for Contract/gi, 'توريد كاش باليد لخزينة الشركة للعقد');
  text = text.replace(/Cash collection by hand/gi, 'توريد كاش باليد');
  text = text.replace(/\bContract\b/gi, 'عقد');

  return text;
};

export const localizeJournalMemo = (memo: string | undefined, isAr: boolean): string | undefined => {
  if (!isAr || !memo) return memo;
  const map: Record<string, string> = {
    'Customer advance cash received': 'إيداع بنكي للدفعة المقدمة بحساب البنك',
    'Credit Deferred Contract Revenue': 'إثبات دفعة الحجز كالتزام تعاقدي حتى التسليم',
    'Cash collection into Operating Bank': 'إيداع بنكي مباشر بحساب البنك التشغيلي للشركة',
    'Clear Deferred Revenue': 'إقفال الإيرادات المؤجلة وتسويتها بالكامل',
    'Book Net Receivable': 'إثبات مديونية الأقساط المتبقية على العميل',
    'Recognize Gross Revenue': 'الاعتراف بإجمالي إيراد المبيعات المحقق بالكامل',
    'Cost relief from WIP': 'إثبات تكلفة المباني والإنشاءات للوحدة المباعة',
    'Relieve WIP cost to COGS': 'تسوية تكلفة المباني بعد تسليم الشقة',
    'Clear collected advances from Deferred Revenue': 'تسوية الدفعات المحصلة من الإيراد المؤجل',
    'Recognize retained forfeiture penalty': 'إثبات غرامة الفسخ المستقطعة كإيراد للشركة',
    'Customer net refund liability payable': 'إثبات التزام صافي المسترد المستحق للعميل',
    'Settlement of Customer Accounts Receivable': 'تسوية مديونية باقي ثمن الشقة على العميل',
    'Credit to Deferred Contract Revenue': 'إثبات دفعة الحجز كالتزام تعاقدي حتى التسليم',
    'Contractor Trade Payables': 'مستحقات وفواتير مقاولي الباطن والموردين',
    'WIP Direct Construction Cost': 'تكاليف مباني وخرسانات قيد التنفيذ بالموقع',
    'Clear uncollected Accounts Receivable off balance sheet': 'إسقاط باقي أقساط العقد غير المحصلة من الدفاتر'
  };
  
  if (map[memo]) return map[memo];

  let text = memo;
  text = text.replace(/Cash collection into Operating Bank for Contract\s*([A-Za-z0-9_-]+)/gi, 'إيداع بنكي مباشر بحساب البنك التشغيلي للشركة للعقد رقم $1');
  text = text.replace(/Cash collection into Operating Bank/gi, 'إيداع بنكي مباشر بحساب البنك التشغيلي للشركة');
  text = text.replace(/Customer advance cash received/gi, 'إيداع بنكي للدفعة المقدمة بحساب البنك');
  text = text.replace(/Credit Deferred Contract Revenue/gi, 'إثبات دفعة الحجز كالتزام تعاقدي حتى التسليم');
  text = text.replace(/Credit to Deferred Contract Revenue/gi, 'إثبات دفعة الحجز كالتزام تعاقدي حتى التسليم');
  text = text.replace(/Cash collection by hand into Treasury Safe for Contract\s*([A-Za-z0-9_-]+)/gi, 'توريد كاش باليد لخزينة الشركة للعقد رقم $1');
  text = text.replace(/Installment\s*#([A-Za-z0-9_-]+)\s*collected\s*by\s*hand\s*into\s*Treasury\s*Safe/gi, 'توريد القسط رقم $1 كاش باليد في خزينة الشركة');
  text = text.replace(/Installment\s*#([A-Za-z0-9_-]+)\s*cleared\s*from\s*Safe\s*custody/gi, 'صرف القسط رقم $1 من عهدة الخزينة');
  text = localizeBuyerName(text);
  
  return text;
};

export const JournalEntryPreview: React.FC<JournalEntryPreviewProps> = ({
  entry,
  isDraft = false,
  isAr = false
}) => {
  const totalDebit = entry.lines.reduce((acc, l) => acc.plus(l.debit_amount), D(0));
  const totalCredit = entry.lines.reduce((acc, l) => acc.plus(l.credit_amount), D(0));
  const isBalanced = totalDebit.equals(totalCredit);

  return (
    <div 
      className={`${styles.container} ${isDraft ? styles.unpostedDraft : styles.posted}`}
      style={{ direction: isAr ? 'rtl' : 'ltr', textAlign: isAr ? 'right' : 'left' }}
    >
      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {isDraft ? (
            <span className={styles.draftBadge}>
              <AlertCircle size={12} />
              <span>{isAr ? 'معاينة مسودة — لم يتم القيد بعد' : 'Preview — not yet posted'}</span>
            </span>
          ) : (
            <span className={styles.postedBadge}>
              <FileCheck2 size={12} />
              <span>{isAr ? 'قيد مرحل بالدفاتر' : 'Posted — Immutable'}</span>
            </span>
          )}
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            {entry.entry_number}
          </span>
        </div>

        <span style={{ fontSize: '0.75rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
          {entry.entry_date}
        </span>
      </div>

      {/* Description */}
      <div style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>
        {localizeJournalDescription(entry.description, isAr)}
      </div>

      {/* T-Account Table */}
      <table className={styles.tAccountTable}>
        <thead>
          <tr>
            <th style={{ textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'كود الحساب والاسم' : 'Account & Title'}</th>
            <th style={{ textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'مدين (له فلوس)' : 'Debit'}</th>
            <th style={{ textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'دائن (التزام عليه)' : 'Credit'}</th>
          </tr>
        </thead>
        <tbody>
          {entry.lines.map(line => {
            const acc = CANONICAL_COA[line.account_code];
            const accTitle = acc ? (isAr ? acc.account_name_ar : acc.account_name_en) : line.account_code;
            const hasDebit = D(line.debit_amount).isPositive();
            const hasCredit = D(line.credit_amount).isPositive();

            return (
              <tr key={line.line_id}>
                <td style={{ textAlign: isAr ? 'right' : 'left' }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: '#946f23', fontWeight: 800, marginInlineEnd: '0.45rem' }}>
                    {line.account_code}
                  </span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{accTitle}</span>
                  {line.memo && (
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {localizeJournalMemo(line.memo, isAr)}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: isAr ? 'left' : 'right', color: hasDebit ? '#0f172a' : '#94a3b8', fontWeight: hasDebit ? 700 : 400 }}>
                  {hasDebit ? D(line.debit_amount).formatEGP(isAr) : '—'}
                </td>
                <td style={{ textAlign: isAr ? 'left' : 'right', color: hasCredit ? '#15803d' : '#94a3b8', fontWeight: hasCredit ? 700 : 400 }}>
                  {hasCredit ? D(line.credit_amount).formatEGP(isAr) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer Totals */}
      <div className={styles.footerTotals}>
        <span style={{ color: isBalanced ? '#15803d' : '#dc2626', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          {isBalanced ? (isAr ? '✓ القيد متوازن تماماً بالمليم' : '✓ Balanced (0.00 Delta)') : (isAr ? '⚠ غير متوازن' : '⚠ Unbalanced')}
        </span>
        <div style={{ display: 'flex', gap: '1.5rem', fontVariantNumeric: 'tabular-nums' }}>
          <span>{isAr ? 'إجمالي المدين:' : 'Dr:'} {totalDebit.formatEGP(isAr)}</span>
          <span style={{ color: '#15803d' }}>{isAr ? 'إجمالي الدائن:' : 'Cr:'} {totalCredit.formatEGP(isAr)}</span>
        </div>
      </div>
    </div>
  );
};
