'use client';

import React from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  FileSpreadsheet,
  Printer,
  Loader2,
  FilePlus,
  Plus,
  Scale,
  Building2,
  TrendingUp,
  MoreHorizontal
} from 'lucide-react';
import { ERPAccountingPeriod, ERPAccount } from '@/lib/erp/types';
import { Decimal } from '@/lib/erp/math';
import { resolveEffectivePeriod } from '@/lib/erp/ledger';
import { ZFWorkstationSideWidgets } from '../common/ZFWorkstationSideWidgets';
import { COAFileExplorer, COACategorySelection } from './COAFileExplorer';
import css from './GeneralLedgerView.module.css';

export interface GeneralLedgerSideWidgetsProps {
  activePeriod?: ERPAccountingPeriod;
  periods?: ERPAccountingPeriod[];
  selectedPeriod?: ERPAccountingPeriod;
  onSelectPeriod?: (period: ERPAccountingPeriod) => void;
  isAr?: boolean;
  isMutating?: boolean;
  trialBalanceReport: {
    sumDebits: Decimal;
    sumCredits: Decimal;
    isMovementsBalanced: boolean;
    isBalancesBalanced: boolean;
    rows?: unknown[];
  };
  // COA Hierarchy Tree
  accounts?: ERPAccount[];
  accountStats?: Record<string, { debits: Decimal; credits: Decimal; count: number }>;
  selectedCategoryInTree?: COACategorySelection | null;
  selectedAccountCode?: string | null;
  onSelectCategory?: (category: COACategorySelection | null) => void;
  onFilterInJournal?: (accountCode: string) => void;
  onSelectAccount?: (account: ERPAccount) => void;
  onTogglePeriodStatus: (targetPeriod?: ERPAccountingPeriod) => void | Promise<void>;
  onCloseFiscalYear?: (year: number) => void | Promise<void>;
  onFilterPeriodInJournal?: (period: ERPAccountingPeriod) => void;
  onExportExcel?: () => void | Promise<void>;
  isExportingExcel?: boolean;
  onPrintTrialBalance?: () => void;
  onNavigateTab?: (tab: 'journal' | 'coa' | 'trial_balance' | 'detailed_tb' | 'balance_sheet' | 'income_statement') => void;
  onOpenNewEntry?: () => void;
  onAddSubAccount?: () => void;
  standalone?: boolean;
}

export { resolveEffectivePeriod };

export const GeneralLedgerSideWidgets: React.FC<GeneralLedgerSideWidgetsProps> = ({
  activePeriod,
  periods,
  selectedPeriod: externalSelectedPeriod,
  onSelectPeriod,
  isAr = true,
  isMutating = false,
  trialBalanceReport,
  accounts,
  accountStats,
  selectedCategoryInTree,
  selectedAccountCode,
  onSelectCategory,
  onFilterInJournal,
  onSelectAccount,
  onFilterPeriodInJournal,
  onTogglePeriodStatus,
  onCloseFiscalYear,
  onExportExcel,
  isExportingExcel = false,
  onPrintTrialBalance,
  onNavigateTab,
  onOpenNewEntry,
  onAddSubAccount,
  standalone,
}) => {
  const [prevActivePeriodId, setPrevActivePeriodId] = React.useState(activePeriod?.period_id);
  const [userSelectedPeriodId, setUserSelectedPeriodId] = React.useState<string | null>(null);
  const [periodMenuOpen, setPeriodMenuOpen] = React.useState(false);

  if (activePeriod?.period_id !== prevActivePeriodId) {
    setPrevActivePeriodId(activePeriod?.period_id);
    setUserSelectedPeriodId(null);
  }

  const effectivePeriod = React.useMemo(() => {
    return resolveEffectivePeriod({
      selectedPeriod: externalSelectedPeriod,
      periods,
      userSelectedPeriodId,
      activePeriod
    });
  }, [externalSelectedPeriod, periods, userSelectedPeriodId, activePeriod]);

  const isPeriodLocked = effectivePeriod ? (effectivePeriod.status === 'LOCKED' || effectivePeriod.status === 'CLOSED') : false;
  const isPeriodClosed = effectivePeriod?.status === 'CLOSED';
  const isBalanced = trialBalanceReport.isMovementsBalanced;
  const variance = trialBalanceReport.sumDebits.minus(trialBalanceReport.sumCredits);

  return (
    <ZFWorkstationSideWidgets
      title={isAr ? 'الرقابة المحاسبية وهيكل الحسابات' : 'Ledger Controls & Hierarchy'}
      badge={isAr ? 'مباشر' : 'LIVE'}
      icon={<ShieldCheck size={17} strokeWidth={1.8} />}
      standalone={standalone}
    >
      <div className={css.sideWidgetsWrap} dir={isAr ? 'rtl' : 'ltr'}>
        {/* ─── 1. CHART OF ACCOUNTS HIERARCHY (هيكل الحسابات) — TOP-MOST WIDGET ─── */}
        <div className={css.sideWidgetCard} data-testid="side-widget-coa-tree" style={{ padding: '0.75rem 0.85rem' }}>
          <COAFileExplorer
            accounts={accounts}
            accountStats={accountStats}
            isAr={isAr}
            mode="compact"
            selectedCategoryId={selectedCategoryInTree?.id}
            selectedAccountCode={selectedAccountCode}
            onSelectCategory={onSelectCategory}
            onSelectAccount={onSelectAccount}
            onFilterInJournal={onFilterInJournal}
          />
        </div>

        {/* ─── 2. QUICK ACTIONS & EXPORT HUB (الإجراءات السريعة والتصدير) ─── */}
        <div className={css.sideWidgetCard} data-testid="side-widget-quick-actions" data-action-hub="quick-actions">
          <div className={css.sideWidgetHeader}>
            <div className={css.sideWidgetTitleWrap}>
              <div className={css.iconSquircle} style={{ background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)' }}>
                <FileSpreadsheet size={15} />
              </div>
              <h4 className={css.sideWidgetTitle}>
                {isAr ? 'الإجراءات السريعة والتصدير' : 'Quick Actions & Export'}
              </h4>
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b' }}>
              {isAr ? 'فوري' : 'Instant'}
            </span>
          </div>

          <div className={css.sideWidgetBody}>
            {/* Direct Quick Actions & Export Triggers */}
            <div className={css.sideWidgetExportGrid}>
              <button
                type="button"
                className={css.sideWidgetExportBtn}
                onClick={onOpenNewEntry}
                title={isAr ? 'تسجيل قيد يومية جديد' : 'Record new journal entry'}
              >
                <div className={css.sideWidgetExportIconWrap}>
                  <FilePlus size={16} />
                </div>
                <div className={css.sideWidgetExportContent}>
                  <span className={css.sideWidgetExportTitle}>
                    {isAr ? '+ قيد يومية جديد' : '+ New Journal Entry'}
                  </span>
                  <span className={css.sideWidgetExportSub}>
                    {isAr ? 'تسجيل حركة أو قيد يومية' : 'Create new journal transaction'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                className={css.sideWidgetExportBtn}
                onClick={onAddSubAccount}
                title={isAr ? 'إضافة حساب فرعي جديد' : 'Add new sub-account'}
              >
                <div className={css.sideWidgetExportIconWrap}>
                  <Plus size={16} />
                </div>
                <div className={css.sideWidgetExportContent}>
                  <span className={css.sideWidgetExportTitle}>
                    {isAr ? '+ إضافة حساب فرعي' : '+ Add Sub-Account'}
                  </span>
                  <span className={css.sideWidgetExportSub}>
                    {isAr ? 'إدراج حساب جديد بالدليل' : 'Create account in COA'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                className={css.sideWidgetExportBtn}
                onClick={onExportExcel}
                disabled={isExportingExcel}
                title={isAr ? 'تصدير الدفتر إلى ملف Excel شامل' : 'Export ledger to Excel'}
              >
                <div className={css.sideWidgetExportIconWrap}>
                  {isExportingExcel ? <Loader2 size={16} className={css.spinningIcon} /> : <FileSpreadsheet size={16} />}
                </div>
                <div className={css.sideWidgetExportContent}>
                  <span className={css.sideWidgetExportTitle}>
                    {isExportingExcel ? (isAr ? 'جارٍ التصدير...' : 'Exporting...') : (isAr ? 'تصدير الدفتر Excel' : 'Export Excel')}
                  </span>
                  <span className={css.sideWidgetExportSub}>
                    {isAr ? 'دليل الحسابات وسجل القيود' : 'COA & Journal register'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                className={css.sideWidgetExportBtn}
                onClick={onPrintTrialBalance}
                title={isAr ? 'طباعة ميزان المراجعة بتنسيق A4' : 'Print trial balance'}
              >
                <div className={css.sideWidgetExportIconWrap}>
                  <Printer size={16} />
                </div>
                <div className={css.sideWidgetExportContent}>
                  <span className={css.sideWidgetExportTitle}>
                    {isAr ? 'طباعة الميزان' : 'Print Statement'}
                  </span>
                  <span className={css.sideWidgetExportSub}>
                    {isAr ? 'تنسيق رسمي A4 معتمد' : 'A4 audit document'}
                  </span>
                </div>
              </button>
            </div>

            {/* Direct 1-Click Links to Core Financial Statements */}
            {onNavigateTab && (
              <div className={css.sideWidgetStatementsGroup}>
                <span className={css.sideWidgetStatementsHeader}>
                  {isAr ? 'القوائم والتقارير الختامية:' : 'Financial Statements:'}
                </span>
                <div className={css.sideWidgetStatementsChips}>
                  <button
                    type="button"
                    className={css.statementChip}
                    onClick={() => onNavigateTab('detailed_tb')}
                    title={isAr ? 'عرض ميزان المراجعة التفصيلي' : 'View Detailed Trial Balance'}
                  >
                    <Scale size={13} color="var(--erp-accent, #2563eb)" />
                    <span>{isAr ? 'ميزان تفصيلي' : 'Detailed TB'}</span>
                  </button>
                  <button
                    type="button"
                    className={css.statementChip}
                    onClick={() => onNavigateTab('balance_sheet')}
                    title={isAr ? 'عرض قائمة المركز المالي' : 'View Balance Sheet'}
                  >
                    <Building2 size={13} color="#059669" />
                    <span>{isAr ? 'المركز المالي' : 'Balance Sheet'}</span>
                  </button>
                  <button
                    type="button"
                    className={css.statementChip}
                    onClick={() => onNavigateTab('income_statement')}
                    title={isAr ? 'عرض قائمة الأرباح والخسائر' : 'View Income Statement'}
                  >
                    <TrendingUp size={13} color="#16a34a" />
                    <span>{isAr ? 'الأرباح والخسائر' : 'Income Statement'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── 3. FISCAL PERIOD & BALANCE WIDGET (الفترة والتوازن) ─── */}
        <div className={css.sideWidgetCard} data-testid="side-widget-period-balance">
          <div className={css.sideWidgetHeader}>
            <div className={css.sideWidgetTitleWrap}>
              <div
                className={css.iconSquircle}
                style={{
                  background: 'var(--erp-accent-subtle)',
                  color: 'var(--erp-accent)',
                  border: '1px solid var(--erp-accent-tint)'
                }}
              >
                <ShieldCheck size={15} />
              </div>
              <h4 className={css.sideWidgetTitle}>
                {isAr ? 'الفترة والتوازن' : 'Period & Balance'}
              </h4>
            </div>

            {/* Small "⋯" action menu for close-period & close-year */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setPeriodMenuOpen(!periodMenuOpen)}
                aria-label={isAr ? 'خيارات إقفال الفترة والسنة' : 'Period & Year Actions'}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--erp-border)',
                  borderRadius: '6px',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--erp-text-muted)'
                }}
              >
                <MoreHorizontal size={15} />
              </button>
              {periodMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    ...(isAr ? { left: 0 } : { right: 0 }),
                    zIndex: 50,
                    marginTop: '4px',
                    minWidth: '190px',
                    background: 'var(--erp-bg-panel)',
                    border: '1px solid var(--erp-border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px color-mix(in srgb, var(--erp-text-title) 8%, transparent)',
                    padding: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodMenuOpen(false);
                      if (effectivePeriod) onTogglePeriodStatus(effectivePeriod);
                    }}
                    disabled={isMutating || !effectivePeriod}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '7px 10px',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: 'var(--erp-text-body)',
                      cursor: 'pointer',
                      textAlign: isAr ? 'right' : 'left'
                    }}
                  >
                    {isPeriodLocked ? <Unlock size={13} color="var(--erp-accent)" /> : <Lock size={13} color="var(--erp-text-muted)" />}
                    <span>
                      {isPeriodLocked
                        ? (isAr ? 'إعادة فتح الفترة المحاسبية' : 'Reopen Fiscal Period')
                        : (isAr ? 'إقفال الفترة المحاسبية' : 'Lock Fiscal Period')}
                    </span>
                  </button>
                  {onCloseFiscalYear && effectivePeriod?.fiscal_year && (
                    <button
                      type="button"
                      onClick={() => {
                        setPeriodMenuOpen(false);
                        onCloseFiscalYear(effectivePeriod.fiscal_year);
                      }}
                      disabled={isMutating}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '7px 10px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'var(--erp-danger)',
                        cursor: 'pointer',
                        textAlign: isAr ? 'right' : 'left'
                      }}
                    >
                      <Lock size={13} color="var(--erp-danger)" />
                      <span>
                        {isAr
                          ? `إغلاق السنة المالية ${effectivePeriod.fiscal_year}`
                          : `Close Fiscal Year ${effectivePeriod.fiscal_year}`}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={css.sideWidgetBody}>
            {/* Row 1: Period selector + open/closed pill + balance pill on the same row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {periods && periods.length > 0 ? (
                <select
                  id="zf-period-select"
                  aria-label={isAr ? 'اختيار الفترة المحاسبية' : 'Select Accounting Period'}
                  className={css.sideWidgetPeriodSelect}
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid var(--erp-border)',
                    background: 'var(--erp-bg-panel)',
                    color: 'var(--erp-text-title)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    width: 'auto',
                    flexShrink: 0
                  }}
                  value={effectivePeriod?.period_id || ''}
                  onChange={(e) => {
                    const targetId = e.target.value;
                    setUserSelectedPeriodId(targetId);
                    const found = periods.find(p => p.period_id === targetId);
                    if (found) {
                      if (onSelectPeriod) onSelectPeriod(found);
                      if (onFilterPeriodInJournal) onFilterPeriodInJournal(found);
                    }
                  }}
                >
                  {periods.map(p => (
                    <option key={p.period_id} value={p.period_id}>
                      {p.fiscal_year} / {String(p.period_number).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--erp-text-title)' }}>
                  {effectivePeriod ? `${effectivePeriod.fiscal_year} / ${String(effectivePeriod.period_number).padStart(2, '0')}` : '—'}
                </span>
              )}

              <span className={`${css.statusPill} ${isPeriodLocked ? css.statusPillNeutral : css.statusPillBlue}`}>
                {isPeriodClosed ? (isAr ? 'مغلقة' : 'Closed') : isPeriodLocked ? (isAr ? 'مقفلة' : 'Locked') : (isAr ? 'مفتوحة' : 'Open')}
              </span>

              <div style={{ flex: 1 }} />

              <span className={`${css.statusPill} ${isBalanced ? css.statusPillGreen : css.statusPillRed}`}>
                {isBalanced
                  ? (isAr ? 'متوازن 0.00' : 'Balanced 0.00')
                  : (isAr
                      ? `غير متوازن ${variance.abs().toNumber().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `Unbalanced ${variance.abs().toNumber().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
              </span>
            </div>

            {/* Row 2: One muted row "مدين <total> · دائن <total>" */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.73rem',
                color: 'var(--erp-text-muted)',
                marginTop: '4px',
                paddingTop: '2px'
              }}
            >
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {isAr ? 'مدين ' : 'Debit '}
                <strong style={{ color: 'var(--erp-text-body)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {trialBalanceReport.sumDebits.toNumber().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </span>
              <span style={{ color: 'var(--erp-border)' }}>·</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {isAr ? 'دائن ' : 'Credit '}
                <strong style={{ color: 'var(--erp-text-body)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {trialBalanceReport.sumCredits.toNumber().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </ZFWorkstationSideWidgets>
  );
};

export default GeneralLedgerSideWidgets;
