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

// Helper functions to translate standard English accounting descriptions & memos to Arabic
export const localizeJournalDescription = (desc: string, isAr: boolean): string => {
  if (!isAr || !desc) return desc;
  return desc
    .replace(/^Advance Collection for Contract (ZF-\d+-\d+) \((.*?)\)/i, 'تحصيل الدفعة المقدمة لعقد البيع رقم $1 ($2)')
    .replace(/^Handover & Revenue Recognition for Contract (ZF-\d+-\d+) \((.*?)\)/i, 'محضر تسليم نهائي واعتراف بالإيراد للعقد $1 ($2)')
    .replace(/^Contract Rescission & Cancellation \(Branch 1 - Pre-Delivery\) for (ZF-\d+-\d+) \((.*?)\)/i, 'فسخ وإلغاء التعاقد (الفرع 1 - قبل التسليم) للعقد $1 ($2)')
    .replace(/^Contract Rescission & Repossession \(Branch 2 - Post-Delivery\) for (ZF-\d+-\d+) \((.*?)\)/i, 'فسخ واسترداد حيازة (الفرع 2 - بعد التسليم) للعقد $1 ($2)')
    .replace(/^Initial Opening Balance/i, 'قيد الأرصدة الافتتاحية الأولية')
    .replace(/^Quick Expense \/ Transaction/i, 'مصروف / حركة تشغيلية سريعة');
};

export const localizeJournalMemo = (memo: string | undefined, isAr: boolean): string | undefined => {
  if (!isAr || !memo) return memo;
  const map: Record<string, string> = {
    'Customer advance cash received': 'إيداع نقدي للدفعة المقدمة من العميل بحساب البنك',
    'Credit Deferred Contract Revenue': 'إثبات إيراد تعاقدي مؤجل (التزام حتى التسليم)',
    'Clear Deferred Revenue': 'إقفال الإيرادات المؤجلة وتسويتها بالكامل',
    'Book Net Receivable': 'إثبات مديونية الأقساط المتبقية على العميل (A/R)',
    'Recognize Gross Revenue': 'الاعتراف بإجمالي إيراد المبيعات المحقق بالكامل',
    'Cost relief from WIP': 'إثبات تكلفة المبيعات المحققة للوحدة (COGS)',
    'Relieve WIP cost to COGS': 'تخفيض حساب الأعمال تحت التنفيذ بعد التسليم',
    'Clear collected advances from Deferred Revenue': 'تسوية الدفعات المحصلة من الإيراد المؤجل',
    'Recognize retained forfeiture penalty': 'إثبات غرامة الفسخ المستقطعة كإيراد للشركة',
    'Customer net refund liability payable': 'إثبات التزام صافي المسترد المستحق للعميل'
  };
  return map[memo] || memo;
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
            <th style={{ textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'مدين (Debit)' : 'Debit'}</th>
            <th style={{ textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'دائن (Credit)' : 'Credit'}</th>
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
          {isBalanced ? (isAr ? '✓ القيد متوازن تماماً (0.00)' : '✓ Balanced (0.00 Delta)') : (isAr ? '⚠ غير متوازن' : '⚠ Unbalanced')}
        </span>
        <div style={{ display: 'flex', gap: '1.5rem', fontVariantNumeric: 'tabular-nums' }}>
          <span>{isAr ? 'إجمالي المدين:' : 'Dr:'} {totalDebit.formatEGP(isAr)}</span>
          <span style={{ color: '#15803d' }}>{isAr ? 'إجمالي الدائن:' : 'Cr:'} {totalCredit.formatEGP(isAr)}</span>
        </div>
      </div>
    </div>
  );
};
