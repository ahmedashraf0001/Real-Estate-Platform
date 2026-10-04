'use client';

import React from 'react';
import {
  Calendar,
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
  TrendingUp
} from 'lucide-react';
import { ERPAccountingPeriod, ERPAccount } from '@/lib/erp/types';
import { Decimal } from '@/lib/erp/math';
import { resolveEffectivePeriod, CANONICAL_COA } from '@/lib/erp/ledger';
import { ZFWorkstationSideWidgets } from '../common/ZFWorkstationSideWidgets';
import { ERPLedgerAmount } from '../common/ERPLedgerAmount';
import { COAFileExplorer, COACategorySelection } from './COAFileExplorer';
import { AccountInspectorPanel } from './AccountInspectorPanel';
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
  totalEntriesCount: number;
  periodEntriesCount?: number;
  availableCash?: { totalCash: Decimal };
  // COA Hierarchy Tree
  accounts?: ERPAccount[];
  accountStats?: Record<string, { debits: Decimal; credits: Decimal; count: number }>;
  selectedCategoryInTree?: COACategorySelection | null;
  selectedAccountCode?: string | null;
  onSelectCategory?: (category: COACategorySelection | null) => void;
  onFilterInJournal?: (accountCode: string) => void;
  onSelectAccount?: (account: ERPAccount) => void;
  // Selected account for inspector
  selectedAccount?: ERPAccount | null;
  selectedAccountId?: string | null;
  selectedAccountStats?: { debits: Decimal; credits: Decimal; count: number };
  lastMovementDate?: string;
  onTogglePeriodStatus: (targetPeriod?: ERPAccountingPeriod) => void | Promise<void>;
  onCloseFiscalYear?: (year: number) => void | Promise<void>;
  onFilterPeriodInJournal?: (period: ERPAccountingPeriod) => void;
  onExportExcel?: () => void | Promise<void>;
  isExportingExcel?: boolean;
  onPrintTrialBalance?: () => void;
  onNavigateTab?: (tab: 'journal' | 'coa' | 'trial_balance' | 'detailed_tb' | 'balance_sheet' | 'income_statement') => void;
  onInspectAccount?: (account: ERPAccount) => void;
  onFilterUnpostedEntries?: () => void;
  onFilterLiquidAccounts?: () => void;
  onCloseInspector?: () => void;
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
  totalEntriesCount,
  periodEntriesCount,
  accounts,
  accountStats,
  selectedCategoryInTree,
  selectedAccountCode,
  onSelectCategory,
  onFilterInJournal,
  onSelectAccount,
  selectedAccount,
  selectedAccountId,
  lastMovementDate,
  onInspectAccount,
  onFilterPeriodInJournal,
  onTogglePeriodStatus,
  onCloseFiscalYear,
  onExportExcel,
  isExportingExcel = false,
  onPrintTrialBalance,
  onNavigateTab,
  onCloseInspector,
  onOpenNewEntry,
  onAddSubAccount,
  standalone,
}) => {
  const [prevActivePeriodId, setPrevActivePeriodId] = React.useState(activePeriod?.period_id);
  const [userSelectedPeriodId, setUserSelectedPeriodId] = React.useState<string | null>(null);

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

  const effectiveSelectedAccount =
    selectedAccount ||
    (selectedAccountId
      ? (accounts ? accounts.find(a => a.account_code === selectedAccountId) : null) || CANONICAL_COA[selectedAccountId] || null
      : null) ||
    (selectedAccountCode
      ? (accounts ? accounts.find(a => a.account_code === selectedAccountCode) : null) || CANONICAL_COA[selectedAccountCode] || null
      : null);
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

        {/* ─── 2. CONTEXTUAL ACCOUNT INSPECTOR (When Account Selected) ─── */}
        {effectiveSelectedAccount && (
          <div className={css.sideWidgetCard} data-testid="side-widget-account-inspector" style={{ padding: '0.75rem 0.85rem' }}>
            <AccountInspectorPanel
              selectedAccount={effectiveSelectedAccount}
              selectedCategory={selectedCategoryInTree}
              accountStats={accountStats}
              lastMovementDate={lastMovementDate}
              isAr={isAr}
              onOpenLedgerModal={onInspectAccount}
              onFilterInJournal={onFilterInJournal}
              onClose={onCloseInspector}
            />
          </div>
        )}

        {/* ─── 3. QUICK ACTIONS & EXPORT HUB (الإجراءات السريعة والتصدير) ─── */}
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

        {/* ─── 3. FISCAL PERIOD & CONTROL WIDGET (Modern FIN-OS Pure White Card) ─── */}
        <div className={css.sideWidgetCard} data-testid="side-widget-period">
          <div className={css.sideWidgetHeader}>
            <div className={css.sideWidgetTitleWrap}>
              <div
                className={css.iconSquircle}
                style={{
                  background: 'var(--erp-accent-subtle, #eff6ff)',
                  color: 'var(--erp-accent, #2563eb)',
                  border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.15))'
                }}
              >
                {isPeriodLocked ? <Lock size={15} /> : <Calendar size={15} />}
              </div>
              <h4 className={css.sideWidgetTitle}>
                {isAr ? 'الفترة المحاسبية والرقابة' : 'Fiscal Period & Control'}
              </h4>
            </div>
            <span className={`${css.statusPill} ${isPeriodLocked ? css.statusPillNeutral : css.statusPillGreen}`}>
              {isPeriodLocked ? <Lock size={11} /> : <Unlock size={11} />}
              {isPeriodClosed ? (isAr ? 'الفترة مغلقة' : 'Closed') : isPeriodLocked ? (isAr ? 'الفترة مقفلة' : 'Locked') : (isAr ? 'الفترة مفتوحة' : 'Open')}
            </span>
          </div>

          <div className={css.sideWidgetBody}>
            {/* Period Selector Dropdown */}
            {periods && periods.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label htmlFor="zf-period-select" style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>
                  {isAr ? 'اختيار الفترة المالية:' : 'Select Fiscal Period:'}
                </label>
                <select
                  id="zf-period-select"
                  aria-label={isAr ? 'اختيار الفترة المحاسبية' : 'Select Accounting Period'}
                  className={css.sideWidgetPeriodSelect}
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
                      {p.fiscal_year} / {String(p.period_number).padStart(2, '0')} — {
                        p.status === 'LOCKED' ? (isAr ? 'مقفل' : 'LOCKED') :
                        p.status === 'CLOSED' ? (isAr ? 'مغلق' : 'CLOSED') :
                        (isAr ? 'مفتوح' : 'OPEN')
                      }
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Compact Telemetry Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                padding: '0.5rem',
                background: '#fafbfc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                  {isAr ? 'السنة / الشهر:' : 'Year / Month:'}
                </span>
                <strong style={{ fontSize: '0.78rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                  {effectivePeriod ? `${effectivePeriod.fiscal_year}/${String(effectivePeriod.period_number).padStart(2, '0')}` : '—'}
                </strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                  {isAr ? 'قيود الفترة:' : 'Entries:'}
                </span>
                <strong style={{ fontSize: '0.78rem', color: 'var(--erp-accent, #2563eb)', fontVariantNumeric: 'tabular-nums' }}>
                  {typeof periodEntriesCount === 'number' ? periodEntriesCount : totalEntriesCount} {isAr ? 'قيد' : 'entries'}
                </strong>
              </div>
            </div>

            {effectivePeriod?.start_date && effectivePeriod?.end_date && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.71rem', color: '#64748b', padding: '0 0.15rem' }}>
                <span>{isAr ? 'النطاق الزمني:' : 'Date Range:'}</span>
                <span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#334155', unicodeBidi: 'isolate' }}>
                  {effectivePeriod.start_date} → {effectivePeriod.end_date}
                </span>
              </div>
            )}

            <button
              type="button"
              className={isPeriodLocked ? css.sideWidgetOutlineBtn : css.sideWidgetPrimaryActionBtn}
              onClick={() => effectivePeriod && onTogglePeriodStatus(effectivePeriod)}
              disabled={isMutating || !effectivePeriod}
              aria-label={isPeriodLocked ? (isAr ? 'إعادة فتح الفترة' : 'Reopen period') : (isAr ? 'إقفال الفترة المحاسبية' : 'Lock fiscal period')}
              style={{ marginTop: '0.2rem' }}
            >
              {isMutating ? (
                <>
                  <Loader2 size={13} className={css.spinningIcon} />
                  <span>{isAr ? 'جارٍ التحديث...' : 'Updating...'}</span>
                </>
              ) : isPeriodLocked ? (
                <>
                  <Unlock size={14} />
                  <span>{isAr ? 'إعادة فتح الفترة المحاسبية' : 'Reopen Fiscal Period'}</span>
                </>
              ) : (
                <>
                  <Lock size={14} />
                  <span>{isAr ? 'إقفال الفترة المحاسبية' : 'Lock Fiscal Period'}</span>
                </>
              )}
            </button>
            {onCloseFiscalYear && effectivePeriod?.fiscal_year && (
              <button
                type="button"
                className={css.sideWidgetOutlineBtn}
                onClick={() => onCloseFiscalYear(effectivePeriod.fiscal_year)}
                disabled={isMutating}
                style={{ marginTop: '0.35rem' }}
              >
                <Lock size={14} />
                <span>{isAr ? `إغلاق السنة المالية ${effectivePeriod.fiscal_year}` : `Close Fiscal Year ${effectivePeriod.fiscal_year}`}</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── 4. AUDIT & BALANCE INVARIANT TELEMETRY (Consuming ERP Color Palette) ─── */}
        <div className={css.sideWidgetCard} data-testid="side-widget-audit">
          <div className={css.sideWidgetHeader}>
            <div className={css.sideWidgetTitleWrap}>
              <div
                className={css.iconSquircle}
                style={{
                  background: 'var(--erp-accent-subtle, #eff6ff)',
                  color: 'var(--erp-accent, #2563eb)',
                  border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.15))'
                }}
              >
                <ShieldCheck size={15} />
              </div>
              <h4 className={css.sideWidgetTitle}>
                {isAr ? 'التدقيق والتوازن المالي' : 'Audit & Invariant'}
              </h4>
            </div>
            <span className={`${css.statusPill} ${isBalanced ? css.statusPillGreen : css.statusPillRed}`}>
              {isBalanced ? (isAr ? 'مطابق 0.00' : 'Balanced') : (isAr ? 'يوجد فارق!' : 'Unbalanced')}
            </span>
          </div>

          <div className={css.sideWidgetBody}>
            {/* Live Movement Telemetry with Palette */}
            <div
              className={css.sideWidgetTelemetryBox}
              style={{
                background: '#ffffff',
                border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.18))'
              }}
            >
              <div className={css.sideWidgetTelemetryRow} style={{ fontVariantNumeric: 'tabular-nums' }}>
                <span className={css.sideWidgetTelemetryLabel} style={{ color: 'var(--erp-text-muted, #64748b)' }}>
                  {isAr ? 'إجمالي المدين:' : 'Total Debits:'}
                </span>
                <ERPLedgerAmount value={trialBalanceReport.sumDebits} isAr={isAr} />
              </div>
              <div className={css.sideWidgetTelemetryRow} style={{ fontVariantNumeric: 'tabular-nums' }}>
                <span className={css.sideWidgetTelemetryLabel} style={{ color: 'var(--erp-text-muted, #64748b)' }}>
                  {isAr ? 'إجمالي الدائن:' : 'Total Credits:'}
                </span>
                <ERPLedgerAmount value={trialBalanceReport.sumCredits} isAr={isAr} />
              </div>
              <div
                className={css.sideWidgetTelemetryRow}
                style={{
                  borderTop: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.15))',
                  paddingTop: '0.4rem',
                  marginTop: '0.2rem',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                <span className={css.sideWidgetTelemetryLabel} style={{ fontWeight: 700, color: '#0f172a' }}>
                  {isAr ? 'فارق التوازن (Delta):' : 'Variance (Delta):'}
                </span>
                <ERPLedgerAmount
                  value={variance}
                  isAr={isAr}
                  color={isBalanced ? '#16a34a' : '#dc2626'}
                  style={{ fontWeight: 800 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ZFWorkstationSideWidgets>
  );
};

export default GeneralLedgerSideWidgets;
