'use client';

import React from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  ExternalLink,
  Layers,
  X
} from 'lucide-react';
import { ERPAccount } from '@/lib/erp/types';
import { Decimal, D } from '@/lib/erp/math';
import { getAccountSemanticIcon, getCategorySemanticIcon } from '@/lib/erp/accountSemanticIcons';
import { COACategorySelection } from './COAFileExplorer';
import { HIERARCHY_STRUCTURE } from '@/lib/erp/coaHierarchy';
import css from './GeneralLedgerView.module.css';

export interface AccountInspectorPanelProps {
  selectedAccount?: ERPAccount | null;
  selectedCategory?: COACategorySelection | null;
  accountStats?: Record<string, { debits: Decimal; credits: Decimal; count: number }>;
  lastMovementDate?: string;
  isAr?: boolean;
  onOpenLedgerModal?: (account: ERPAccount) => void;
  onFilterInJournal?: (accountCode: string) => void;
  onClose?: () => void;
  // Kept for backward compatibility
  onNewAccount?: () => void;
  onNewSubfolder?: () => void;
  onMoveAccount?: () => void;
  onArchiveAccount?: () => void;
  onDeleteAccount?: () => void;
  className?: string;
}

export const AccountInspectorPanel: React.FC<AccountInspectorPanelProps> = ({
  selectedAccount,
  selectedCategory,
  accountStats,
  lastMovementDate,
  isAr = true,
  onOpenLedgerModal,
  onFilterInJournal,
  onClose,
  className
}) => {
  const account = selectedAccount;
  const isCategoryView = !account && Boolean(selectedCategory);

  const stats = account && accountStats ? (accountStats[account.account_code] || { debits: D(0), credits: D(0), count: 0 }) : { debits: D(0), credits: D(0), count: 0 };
  const netBalance = account
    ? (account.normal_balance === 'DEBIT' ? stats.debits.minus(stats.credits) : stats.credits.minus(stats.debits))
    : D(0);

  // Derive parent account / hierarchy info
  const parentInfo = React.useMemo(() => {
    if (!account) return null;
    for (const cat of HIERARCHY_STRUCTURE) {
      for (const sub of cat.subcategories) {
        if (sub.accountCodes.includes(account.account_code)) {
          return {
            parentCode: sub.code,
            parentTitle: isAr ? `${sub.code} - ${sub.titleAr}` : `${sub.code} - ${sub.titleEn}`,
            rootTitle: isAr ? `${cat.code} - ${cat.titleAr}` : `${cat.code} - ${cat.titleEn}`
          };
        }
      }
      if (cat.code === account.account_code.slice(0, 1)) {
        return {
          parentCode: cat.code,
          parentTitle: isAr ? `${cat.code} - ${cat.titleAr}` : `${cat.code} - ${cat.titleEn}`,
          rootTitle: isAr ? `${cat.code} - ${cat.titleAr}` : `${cat.code} - ${cat.titleEn}`
        };
      }
    }
    return null;
  }, [account, isAr]);

  const code = account ? account.account_code : selectedCategory ? selectedCategory.code : '—';
  const name = account ? (isAr ? account.account_name_ar : account.account_name_en) : selectedCategory ? selectedCategory.title : (isAr ? 'حدد حساباً للمعاينة' : 'Select an Account');
  const levelText = code.length === 1 
    ? (isAr ? 'المستوى 1 (رئيسي)' : 'Level 1 (Root)')
    : code.length === 2 
    ? (isAr ? 'المستوى 2 (مجموعة)' : 'Level 2 (Group)')
    : (isAr ? 'المستوى 3 (تحليلي)' : 'Level 3 (Analytical)');

  return (
    <div className={`${css.inspectorCardClean} ${className || ''}`} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Header with Close Button */}
      <div className={css.inspectorHeaderClean}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
          <div className={css.inspectorIconSquircleClean}>
            {account ? (
              getAccountSemanticIcon(account, { size: 16 })
            ) : selectedCategory ? (
              getCategorySemanticIcon(selectedCategory.code, false, 16)
            ) : (
              <Layers size={16} />
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <span className={css.inspectorCodeBadge}>{code}</span>
              <span className={`${css.statusPill} ${css.statusPillGreen}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                {isAr ? 'نشط' : 'Active'}
              </span>
            </div>
            <h3 className={css.inspectorTitleClean} title={name}>
              {name}
            </h3>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title={isAr ? 'إغلاق المعاينة' : 'Close Inspector'}
            className={css.closeInspectorBtn}
            aria-label={isAr ? 'إغلاق المعاينة' : 'Close Inspector'}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 2. Executive Hero Balance Box */}
      <div className={css.inspectorHeroBalanceBoxClean}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b' }}>
            {isAr ? 'الرصيد الحالي' : 'Current Balance'}
          </span>
          <span className={`${css.statusPill} ${account?.normal_balance === 'DEBIT' ? css.statusPillBlue : css.statusPillAmber}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
            {account ? (account.normal_balance === 'DEBIT' ? (isAr ? 'طبيعة مدينة' : 'Debit') : (isAr ? 'طبيعة دائنة' : 'Credit')) : '—'}
          </span>
        </div>
        <div
          style={{
            fontSize: '1.2rem',
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            color: netBalance.isNegative() ? '#dc2626' : '#0f172a',
            letterSpacing: '-0.02em',
            marginBottom: '0.45rem'
          }}
        >
          {Math.round(netBalance.toNumber()).toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'}
        </div>

        {/* Compact Debits vs Credits */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.3rem 0.45rem' }}>
            <span style={{ fontSize: '0.64rem', color: 'var(--erp-accent-hover)', fontWeight: 600, display: 'block' }}>
              {isAr ? 'إجمالي المدين' : 'Total Debits'}
            </span>
            <strong style={{ fontSize: '0.74rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(stats.debits.toNumber()).toLocaleString('en-US')}
            </strong>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.3rem 0.45rem' }}>
            <span style={{ fontSize: '0.64rem', color: '#b45309', fontWeight: 600, display: 'block' }}>
              {isAr ? 'إجمالي الدائن' : 'Total Credits'}
            </span>
            <strong style={{ fontSize: '0.74rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(stats.credits.toNumber()).toLocaleString('en-US')}
            </strong>
          </div>
        </div>
      </div>

      {/* 3. Compact Key Metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
        <div className={css.inspectorSpecCellClean}>
          <span className={css.inspectorSpecLabel}>{isAr ? 'المستوى' : 'Level'}</span>
          <span className={css.inspectorSpecValue} title={levelText}>{levelText}</span>
        </div>
        <div className={css.inspectorSpecCellClean}>
          <span className={css.inspectorSpecLabel}>{isAr ? 'الحساب الأب' : 'Parent'}</span>
          <span className={css.inspectorSpecValue} title={parentInfo?.parentTitle || '—'}>
            {parentInfo ? parentInfo.parentTitle : '—'}
          </span>
        </div>
        <div className={css.inspectorSpecCellClean}>
          <span className={css.inspectorSpecLabel}>{isAr ? 'القيود والحركات' : 'Entries'}</span>
          <span className={css.inspectorSpecValue} style={{ color: 'var(--erp-accent, #2563eb)' }}>
            {stats.count} {isAr ? 'حركة مسجلة' : 'entries'}
          </span>
        </div>
        <div className={css.inspectorSpecCellClean}>
          <span className={css.inspectorSpecLabel}>{isAr ? 'آخر حركة' : 'Last Movement'}</span>
          <span className={css.inspectorSpecValue}>{lastMovementDate || '—'}</span>
        </div>
      </div>

      {/* 4. Action Buttons (Strictly Functional - Zero Dead Buttons) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
        {account && (
          <button
            type="button"
            className={css.inspectorPrimaryBtnClean}
            onClick={() => onOpenLedgerModal?.(account)}
            title={isAr ? 'فتح كشف الحساب التفصيلي وتصدير الحركات' : 'Open detailed account statement'}
          >
            <FileSpreadsheet size={14} />
            <span>{isAr ? 'كشف الحساب التفصيلي' : 'Detailed Statement'}</span>
            <ExternalLink size={12} style={{ marginInlineStart: 'auto', opacity: 0.7 }} />
          </button>
        )}
        {account && (
          <button
            type="button"
            className={css.inspectorSecondaryBtnClean}
            onClick={() => onFilterInJournal?.(account.account_code)}
            title={isAr ? 'تصفية واستعراض كافة القيود في دفتر اليومية' : 'Filter entries in general journal'}
          >
            <FileText size={14} />
            <span>{isAr ? 'عرض الحركات في اليومية' : 'View in Journal'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default AccountInspectorPanel;
