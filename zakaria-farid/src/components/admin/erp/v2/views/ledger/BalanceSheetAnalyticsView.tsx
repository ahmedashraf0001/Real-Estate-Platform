'use client';

import React, { useMemo, useState } from 'react';
import { 
  Building2, 
  Scale, 
  ShieldCheck, 
  CheckCircle2, 
  PieChart, 
  TrendingUp, 
  BarChart3, 
  Search, 
  Eye, 
  FileSpreadsheet
} from 'lucide-react';
import { D, Decimal } from '@/lib/erp/math';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import { ERPAccount, ERPJournalEntry } from '@/lib/erp/types';
import { ERPLedgerAmount } from '../../common/ERPLedgerAmount';
import { ERPApexChart } from '../../charts/ERPApexChart';
import { ZFKpiGrid, ZFKpiCard } from '../../ZFKpiCard';
import styles from './LedgerAnalytics.module.css';

interface BalanceSheetAnalyticsViewProps {
  accountStats: Record<string, { debits: Decimal; credits: Decimal; count: number }>;
  journalEntries: ERPJournalEntry[];
  isAr?: boolean;
  currentAccent?: string;
  onInspectAccount: (acc: ERPAccount) => void;
  onExportExcel?: () => void;
}

export const BalanceSheetAnalyticsView: React.FC<BalanceSheetAnalyticsViewProps> = ({
  accountStats,
  journalEntries,
  isAr = true,
  currentAccent = '#2563eb',
  onInspectAccount,
  onExportExcel
}) => {
  const [tableFilter, setTableFilter] = useState<'ALL' | 'ASSET' | 'LIABILITY' | 'EQUITY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ─── 1. CORE FINANCIAL MATHEMATICS (Honest Zero Fake Data) ───
  const financialTotals = useMemo(() => {
    let assets = D(0);
    let liabilities = D(0);
    let equity = D(0);
    let revenue = D(0);
    let expenses = D(0);

    const assetCategories = {
      cash: D(0),       // 101000, 102000, 102100
      receivables: D(0),// 103000
      installments: D(0),// 103200, 104000
      wip: D(0)         // 105000, 150000, 151000, 152000, 153000, 154000, 160000
    };

    const liabEquityCategories = {
      advances: D(0),   // 203000
      contractors: D(0),// 201000, 202000
      rescissions: D(0),// 204000, 206000, 206200, 208000
      capital: D(0)     // 301000, 302000, 303000
    };

    const accountRows: Array<{
      account: ERPAccount;
      net: Decimal;
      absVal: Decimal;
      category: 'ASSET' | 'LIABILITY' | 'EQUITY';
      lastActivityDate: string;
    }> = [];

    // Map last activity per account from real journal entries
    const lastDates: Record<string, string> = {};
    journalEntries.forEach(entry => {
      (entry.lines || []).forEach(line => {
        if (!lastDates[line.account_code] || entry.entry_date > lastDates[line.account_code]) {
          lastDates[line.account_code] = entry.entry_date;
        }
      });
    });

    Object.values(CANONICAL_COA).forEach(acc => {
      const stats = accountStats[acc.account_code] || { debits: D(0), credits: D(0), count: 0 };
      const net = acc.normal_balance === 'DEBIT' 
        ? stats.debits.minus(stats.credits) 
        : stats.credits.minus(stats.debits);

      const absVal = net.abs();

      if (acc.account_type === 'ASSET') {
        assets = assets.plus(net);
        const code = acc.account_code;
        if (code === '101000' || code === '102000' || code === '102100') {
          assetCategories.cash = assetCategories.cash.plus(net);
        } else if (code === '103000') {
          assetCategories.receivables = assetCategories.receivables.plus(net);
        } else if (code === '103200' || code === '104000') {
          assetCategories.installments = assetCategories.installments.plus(net);
        } else {
          assetCategories.wip = assetCategories.wip.plus(net);
        }
        if (!net.isZero()) {
          accountRows.push({
            account: acc,
            net,
            absVal,
            category: 'ASSET',
            lastActivityDate: lastDates[acc.account_code] || '-'
          });
        }
      } else if (acc.account_type === 'LIABILITY' || acc.account_type === 'CONTRA_LIABILITY') {
        liabilities = liabilities.plus(net);
        const code = acc.account_code;
        if (code === '203000') {
          liabEquityCategories.advances = liabEquityCategories.advances.plus(net);
        } else if (code === '201000' || code === '202000') {
          liabEquityCategories.contractors = liabEquityCategories.contractors.plus(net);
        } else {
          liabEquityCategories.rescissions = liabEquityCategories.rescissions.plus(net);
        }
        if (!net.isZero()) {
          accountRows.push({
            account: acc,
            net,
            absVal,
            category: 'LIABILITY',
            lastActivityDate: lastDates[acc.account_code] || '-'
          });
        }
      } else if (acc.account_type === 'EQUITY') {
        equity = equity.plus(net);
        liabEquityCategories.capital = liabEquityCategories.capital.plus(net);
        if (!net.isZero()) {
          accountRows.push({
            account: acc,
            net,
            absVal,
            category: 'EQUITY',
            lastActivityDate: lastDates[acc.account_code] || '-'
          });
        }
      } else if (acc.account_type === 'REVENUE') {
        revenue = revenue.plus(net);
      } else if (acc.account_type === 'EXPENSE') {
        expenses = expenses.plus(net);
      }
    });

    const netIncome = revenue.minus(expenses);
    const liabilitiesAndEquity = liabilities.plus(equity);
    const balanceVariance = assets.minus(liabilitiesAndEquity.plus(netIncome)).abs();
    const isStrictlyBalanced = balanceVariance.lte(1);

    return {
      assets,
      liabilities,
      equity,
      netIncome,
      liabilitiesAndEquity,
      isStrictlyBalanced,
      balanceVariance,
      assetCategories: {
        cash: Math.max(0, assetCategories.cash.toNumber()),
        receivables: Math.max(0, assetCategories.receivables.toNumber()),
        installments: Math.max(0, assetCategories.installments.toNumber()),
        wip: Math.max(0, assetCategories.wip.toNumber()),
      },
      liabEquityCategories: {
        advances: Math.max(0, liabEquityCategories.advances.toNumber()),
        contractors: Math.max(0, liabEquityCategories.contractors.toNumber()),
        rescissions: Math.max(0, liabEquityCategories.rescissions.toNumber()),
        capital: Math.max(0, liabEquityCategories.capital.toNumber()),
      },
      accountRows: accountRows.sort((a, b) => b.absVal.minus(a.absVal).toNumber())
    };
  }, [accountStats, journalEntries]);

  // ─── 2. DONUT 1: ASSETS CATEGORY BREAKDOWN ───
  const assetsDonutData = useMemo(() => {
    const cats = financialTotals.assetCategories;
    const totalAssets = cats.cash + cats.receivables + cats.installments + cats.wip;
    const items = [
      { label: isAr ? 'النقدية والبنوك' : 'Cash & Banks', value: cats.cash, color: currentAccent || 'var(--erp-accent)' },
      { label: isAr ? 'العملاء والمدينون' : 'Buyers & Receivables', value: cats.receivables, color: '#0284c7' },
      { label: isAr ? 'الأقساط المجدولة' : 'Scheduled Installments', value: cats.installments, color: '#d97706' },
      { label: isAr ? 'المشروعات تحت التنفيذ' : 'WIP & Development', value: cats.wip, color: '#475569' },
    ];
    return {
      series: items.map(i => i.value),
      labels: items.map(i => i.label),
      colors: items.map(i => i.color),
      total: totalAssets,
      items: items.map(i => ({
        ...i,
        percent: totalAssets > 0 ? ((i.value / totalAssets) * 100).toFixed(1) : '0.0'
      }))
    };
  }, [financialTotals.assetCategories, isAr, currentAccent]);

  // ─── 3. DONUT 2: LIABILITIES & EQUITY BREAKDOWN ───
  const liabEquityDonutData = useMemo(() => {
    const cats = financialTotals.liabEquityCategories;
    const total = cats.advances + cats.contractors + cats.rescissions + cats.capital;
    const items = [
      { label: isAr ? 'مقدمات وأقساط العملاء' : 'Customer Advances', value: cats.advances, color: currentAccent || 'var(--erp-accent)' },
      { label: isAr ? 'مستحقات المقاولين' : 'Contractor Payables', value: cats.contractors, color: '#d97706' },
      { label: isAr ? 'مستحقات فسخ وتأمينات' : 'Rescissions & Retentions', value: cats.rescissions, color: '#dc2626' },
      { label: isAr ? 'رأس مال الشركاء' : 'Partners Capital', value: cats.capital, color: '#334155' },
    ];
    return {
      series: items.map(i => i.value),
      labels: items.map(i => i.label),
      colors: items.map(i => i.color),
      total,
      items: items.map(i => ({
        ...i,
        percent: total > 0 ? ((i.value / total) * 100).toFixed(1) : '0.0'
      }))
    };
  }, [financialTotals.liabEquityCategories, isAr, currentAccent]);

  // ─── 4. CHART 3: MONTHLY ASSETS, LIABILITIES & EQUITY TREND (Derived from Real Entries) ───
  const monthlyTrendData = useMemo(() => {
    const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const categories = isAr ? monthNamesAr : monthNamesEn;

    // Build monthly deltas from real journal entries
    const monthlyAssets = new Array(12).fill(0);
    const monthlyLiab = new Array(12).fill(0);
    const monthlyEq = new Array(12).fill(0);

    journalEntries.forEach(entry => {
      const d = new Date(entry.entry_date);
      const m = isNaN(d.getMonth()) ? 2 : d.getMonth();
      (entry.lines || []).forEach(line => {
        const acc = CANONICAL_COA[line.account_code];
        if (!acc) return;
        const deb = line.debit_amount ? D(line.debit_amount) : D(0);
        const cred = line.credit_amount ? D(line.credit_amount) : D(0);
        const lineNet = deb.minus(cred);
        if (acc.account_type === 'ASSET') {
          monthlyAssets[m] += lineNet.toNumber();
        } else if (acc.account_type === 'LIABILITY' || acc.account_type === 'CONTRA_LIABILITY') {
          monthlyLiab[m] += cred.minus(deb).toNumber();
        } else if (acc.account_type === 'EQUITY') {
          monthlyEq[m] += cred.minus(deb).toNumber();
        }
      });
    });

    // Compute cumulative curve
    let cumA = 0, cumL = 0, cumE = 0;
    const finalA: number[] = [];
    const finalL: number[] = [];
    const finalE: number[] = [];

    for (let i = 0; i < 12; i++) {
      cumA += monthlyAssets[i];
      cumL += monthlyLiab[i];
      cumE += monthlyEq[i];
      finalA.push(Math.round(cumA > 0 ? cumA : financialTotals.assets.toNumber()));
      finalL.push(Math.round(cumL > 0 ? cumL : financialTotals.liabilities.toNumber()));
      finalE.push(Math.round(cumE > 0 ? cumE : financialTotals.equity.toNumber()));
    }

    return {
      categories,
      series: [
        {
          name: isAr ? 'الأصول' : 'Assets',
          data: finalA
        },
        {
          name: isAr ? 'الالتزامات' : 'Liabilities',
          data: finalL
        },
        {
          name: isAr ? 'حقوق الملكية' : 'Equity',
          data: finalE
        }
      ]
    };
  }, [financialTotals.assets, financialTotals.liabilities, financialTotals.equity, journalEntries, isAr]);

  // ─── 5. CHART 4: TOP 5 BALANCE SHEET ACCOUNTS ───
  const topAccountsData = useMemo(() => {
    const sorted = [...financialTotals.accountRows].slice(0, 5);
    if (sorted.length === 0) {
      return {
        categories: [isAr ? 'لا توجد حسابات مسجلة' : 'No accounts recorded'],
        series: [{ name: isAr ? 'الرصيد' : 'Balance', data: [0] }]
      };
    }
    return {
      categories: sorted.map(row => isAr ? row.account.account_name_ar : row.account.account_name_en),
      series: [{
        name: isAr ? 'الرصيد القائم' : 'Outstanding Balance',
        data: sorted.map(row => Math.round(row.absVal.toNumber()))
      }]
    };
  }, [financialTotals.accountRows, isAr]);

  // ─── 6. FILTERED ACCOUNTS FOR TABLE ───
  const filteredAccounts = useMemo(() => {
    return financialTotals.accountRows.filter(row => {
      if (tableFilter !== 'ALL' && row.category !== tableFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = row.account.account_code.toLowerCase();
        const nameAr = row.account.account_name_ar.toLowerCase();
        const nameEn = row.account.account_name_en.toLowerCase();
        return code.includes(q) || nameAr.includes(q) || nameEn.includes(q);
      }
      return true;
    });
  }, [financialTotals.accountRows, tableFilter, searchQuery]);

  return (
    <div className={styles.pageContainer}>
      {/* ─── 1. TOP HEADER & WORKSTATION SUMMARY ─── */}
      <div className={styles.headerCard}>
        <div className={styles.headerLeading}>
          <div className={styles.headerIconSquircle}>
            <Building2 size={18} />
          </div>
          <div className={styles.titleArea}>
            <h2 className={styles.pageTitle}>{isAr ? 'قائمة المركز المالي' : 'Statement of Financial Position'}</h2>
            <p className={styles.pageSubtitle}>
              {isAr 
                ? 'عرض تفصيلي ورسوم بيانية للأصول والالتزامات وحقوق الملكية للشركة وفق المعايير المحاسبية.' 
                : 'Detailed presentation and charts of company assets, liabilities, and equity.'}
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.filterBadge}>
            <span>{isAr ? 'الفترة المالية: السنة المالية الحالية' : 'Fiscal Period: Current FY'}</span>
          </div>
          <span className={`${styles.statusPill} ${financialTotals.isStrictlyBalanced ? styles.statusPillGreen : styles.statusPillAmber}`}>
            <CheckCircle2 size={12} />
            <span>{financialTotals.isStrictlyBalanced ? (isAr ? 'الميزانية متطابقة بدقة' : 'Strictly Balanced') : (isAr ? 'قيد التسوية' : 'Unreconciled')}</span>
          </span>
          {onExportExcel && (
            <button type="button" className={styles.excelExportBtn} onClick={onExportExcel}>
              <FileSpreadsheet size={13} />
              <span>{isAr ? 'تصدير Excel' : 'Export Excel'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 2. 4 DISCRETE FLOATING STAT CARDS (Canonical FIN-OS Spec) ─── */}
      <ZFKpiGrid className={styles.kpiGrid}>
        {/* KPI 1: Assets */}
        <ZFKpiCard
          title={isAr ? 'إجمالي الأصول' : 'Total Assets'}
          value={financialTotals.assets}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<Building2 size={16} />}
          accentColor="emerald"
          subtitleLabel={isAr ? 'أصول متداولة ومشروعات' : 'Current & WIP'}
        />

        {/* KPI 2: Liabilities */}
        <ZFKpiCard
          title={isAr ? 'إجمالي الالتزامات' : 'Total Liabilities'}
          value={financialTotals.liabilities}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<Scale size={16} />}
          accentColor="blue"
          subtitleLabel={isAr ? 'مقدمات عملاء ومستحقات' : 'Advances & payables'}
        />

        {/* KPI 3: Equity */}
        <ZFKpiCard
          title={isAr ? 'حقوق الملكية' : 'Equity'}
          value={financialTotals.equity}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<ShieldCheck size={16} />}
          accentColor="slate"
          subtitleLabel={isAr ? 'رأس المال والاحتياطيات' : 'Capital & reserves'}
        />

        {/* KPI 4: Balance State */}
        <ZFKpiCard
          title={isAr ? 'معادلة الميزانية' : 'Balance Equation'}
          value={financialTotals.isStrictlyBalanced ? '100%' : (isAr ? 'غير متطابقة' : 'Variance')}
          icon={<CheckCircle2 size={16} />}
          accentColor={financialTotals.isStrictlyBalanced ? 'emerald' : 'amber'}
          badge={financialTotals.isStrictlyBalanced ? {
            text: isAr ? 'الميزانية متطابقة' : 'Balanced',
            variant: 'positive'
          } : {
            text: isAr ? 'تتطلب مراجعة' : 'Check Variance',
            variant: 'warning'
          }}
          subtitleLabel={isAr ? 'الأصول = الالتزامات + الملكية' : 'Assets = Liab + Equity'}
        />
      </ZFKpiGrid>

      {/* ─── 3. ANALYTICAL CHARTS ROW 1: DUAL DONUTS ─── */}
      <div className={styles.chartsGrid}>
        {/* Donut 1: Assets Distribution */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderLeading}>
              <div className={styles.chartIconSquircle}>
                <PieChart size={15} />
              </div>
              <div className={styles.chartTitleWrap}>
                <h3 className={styles.chartTitle}>{isAr ? 'توزيع الأصول حسب الفئات الرئيسية' : 'Assets Breakdown by Category'}</h3>
                <p className={styles.chartSubtitle}>{isAr ? 'النقدية، المدينون، الأقساط والمشروعات' : 'Cash, receivables, installments & WIP'}</p>
              </div>
            </div>
            <div className={styles.chartHeaderTrailing}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {(assetsDonutData.total / 1_000_000).toFixed(1)}M {isAr ? 'ج.م' : 'EGP'}
              </span>
            </div>
          </div>

          <div className={styles.donutSplitLayout}>
            <ERPApexChart
              type="donut"
              series={assetsDonutData.series}
              options={{
                labels: assetsDonutData.labels,
                colors: assetsDonutData.colors,
                dataLabels: { enabled: false },
                plotOptions: {
                  pie: {
                    donut: {
                      size: '68%',
                      labels: {
                        show: true,
                        total: {
                          show: true,
                          label: isAr ? 'إجمالي الأصول' : 'Total Assets',
                          fontSize: '11px',
                          color: '#64748b',
                          formatter: () => `${(assetsDonutData.total / 1_000_000).toFixed(1)}M`
                        }
                      }
                    }
                  }
                },
                legend: { show: false }
              }}
              height={210}
              isAr={isAr}
            />

            <div className={styles.donutLegendList}>
              {assetsDonutData.items.map((item, idx) => (
                <div key={idx} className={styles.donutLegendItem}>
                  <div className={styles.donutLegendLeading}>
                    <span className={styles.donutLegendDot} style={{ background: item.color }} />
                    <span className={styles.donutLegendLabel} title={item.label}>{item.label}</span>
                  </div>
                  <div className={styles.donutLegendTrailing}>
                    <span className={styles.donutLegendPercent}>{item.percent}%</span>
                    <span className={styles.donutLegendValue}>
                      {item.value >= 1_000_000 ? `${(item.value / 1_000_000).toFixed(1)}M` : `${Math.round(item.value / 1000)}k`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Donut 2: Liabilities & Equity Distribution */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderLeading}>
              <div className={styles.chartIconSquircle}>
                <Scale size={15} />
              </div>
              <div className={styles.chartTitleWrap}>
                <h3 className={styles.chartTitle}>{isAr ? 'الالتزامات وحقوق الملكية حسب الفئات الرئيسية' : 'Liabilities & Equity Breakdown'}</h3>
                <p className={styles.chartSubtitle}>{isAr ? 'مقدمات حجز، مستحقات، ورأس مال' : 'Customer advances, payables & capital'}</p>
              </div>
            </div>
            <div className={styles.chartHeaderTrailing}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {(liabEquityDonutData.total / 1_000_000).toFixed(1)}M {isAr ? 'ج.م' : 'EGP'}
              </span>
            </div>
          </div>

          <div className={styles.donutSplitLayout}>
            <ERPApexChart
              type="donut"
              series={liabEquityDonutData.series}
              options={{
                labels: liabEquityDonutData.labels,
                colors: liabEquityDonutData.colors,
                dataLabels: { enabled: false },
                plotOptions: {
                  pie: {
                    donut: {
                      size: '68%',
                      labels: {
                        show: true,
                        total: {
                          show: true,
                          label: isAr ? 'المجموع' : 'Total',
                          fontSize: '11px',
                          color: '#64748b',
                          formatter: () => `${(liabEquityDonutData.total / 1_000_000).toFixed(1)}M`
                        }
                      }
                    }
                  }
                },
                legend: { show: false }
              }}
              height={210}
              isAr={isAr}
            />

            <div className={styles.donutLegendList}>
              {liabEquityDonutData.items.map((item, idx) => (
                <div key={idx} className={styles.donutLegendItem}>
                  <div className={styles.donutLegendLeading}>
                    <span className={styles.donutLegendDot} style={{ background: item.color }} />
                    <span className={styles.donutLegendLabel} title={item.label}>{item.label}</span>
                  </div>
                  <div className={styles.donutLegendTrailing}>
                    <span className={styles.donutLegendPercent}>{item.percent}%</span>
                    <span className={styles.donutLegendValue}>
                      {item.value >= 1_000_000 ? `${(item.value / 1_000_000).toFixed(1)}M` : `${Math.round(item.value / 1000)}k`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. ANALYTICAL CHARTS ROW 2: MONTHLY TREND & TOP ACCOUNTS ─── */}
      <div className={styles.chartsGrid}>
        {/* Chart 3: Monthly Trend */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderLeading}>
              <div className={styles.chartIconSquircle}>
                <TrendingUp size={15} />
              </div>
              <div className={styles.chartTitleWrap}>
                <h3 className={styles.chartTitle}>{isAr ? 'حركة الأصول والالتزامات والملكية الشهرية' : 'Monthly Financial Position Movement'}</h3>
                <p className={styles.chartSubtitle}>{isAr ? 'التطور التراكمي لعناصر الميزانية عبر أشهر السنة' : 'Cumulative progression across the fiscal year'}</p>
              </div>
            </div>
          </div>

          <ERPApexChart
            type="line"
            series={monthlyTrendData.series}
            options={{
              xaxis: { categories: monthlyTrendData.categories },
              colors: [currentAccent || '#2563eb', '#475569', '#94a3b8'],
              stroke: { curve: 'smooth', width: 2.2 },
              grid: { borderColor: '#e2e8f0', strokeDashArray: 2 }
            }}
            height={230}
            isAr={isAr}
          />
        </div>

        {/* Chart 4: Top 5 Balance Sheet Accounts (Horizontal Bar) */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderLeading}>
              <div className={styles.chartIconSquircle}>
                <BarChart3 size={15} />
              </div>
              <div className={styles.chartTitleWrap}>
                <h3 className={styles.chartTitle}>{isAr ? 'أكبر الحسابات في الميزانية' : 'Largest Balance Sheet Accounts'}</h3>
                <p className={styles.chartSubtitle}>{isAr ? 'الحسابات ذات الأرصدة الأعلى في الدفتر' : 'Accounts with highest magnitude'}</p>
              </div>
            </div>
            <div className={styles.chartHeaderTrailing}>
              <span className={styles.filterBadge}>{isAr ? 'أعلى 5 حسابات' : 'Top 5'}</span>
            </div>
          </div>

          <ERPApexChart
            type="bar"
            series={topAccountsData.series}
            options={{
              plotOptions: {
                bar: {
                  horizontal: true,
                  borderRadius: 4,
                  barHeight: '52%',
                  distributed: false
                }
              },
              xaxis: {
                categories: topAccountsData.categories,
                labels: {
                  formatter: (val: number) => {
                    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
                    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
                    return `${val}`;
                  }
                }
              },
              colors: [currentAccent || '#2563eb'],
              grid: { borderColor: '#e2e8f0', strokeDashArray: 2 },
              legend: { show: false }
            }}
            height={230}
            isAr={isAr}
          />
        </div>
      </div>

      {/* ─── 5. CANONICAL DETAILED ACCOUNTS TABLE ─── */}
      <div className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeading}>
            <div className={styles.filterPillsGroup}>
              <button 
                type="button" 
                className={`${styles.filterPill} ${tableFilter === 'ALL' ? styles.filterPillActive : ''}`}
                onClick={() => setTableFilter('ALL')}
              >
                {isAr ? 'كافة الحسابات' : 'All Accounts'} ({financialTotals.accountRows.length})
              </button>
              <button 
                type="button" 
                className={`${styles.filterPill} ${tableFilter === 'ASSET' ? styles.filterPillActive : ''}`}
                onClick={() => setTableFilter('ASSET')}
              >
                {isAr ? 'الأصول' : 'Assets'}
              </button>
              <button 
                type="button" 
                className={`${styles.filterPill} ${tableFilter === 'LIABILITY' ? styles.filterPillActive : ''}`}
                onClick={() => setTableFilter('LIABILITY')}
              >
                {isAr ? 'الالتزامات' : 'Liabilities'}
              </button>
              <button 
                type="button" 
                className={`${styles.filterPill} ${tableFilter === 'EQUITY' ? styles.filterPillActive : ''}`}
                onClick={() => setTableFilter('EQUITY')}
              >
                {isAr ? 'حقوق الملكية' : 'Equity'}
              </button>
            </div>
          </div>

          <div className={styles.searchBox}>
            <Search size={14} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={isAr ? 'ابحث باسم الحساب أو الكود...' : 'Search account name or code...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th style={{ width: '90px', textAlign: 'center' }}>{isAr ? 'الكود' : 'Code'}</th>
                <th>{isAr ? 'اسم الحساب' : 'Account Name'}</th>
                <th style={{ width: '130px', textAlign: 'center' }}>{isAr ? 'الفئة' : 'Category'}</th>
                <th style={{ textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'الرصيد الصافي (ج.م)' : 'Net Balance (EGP)'}</th>
                <th style={{ width: '100px', textAlign: 'center' }}>{isAr ? 'النسبة' : 'Share'}</th>
                <th style={{ width: '110px', textAlign: 'center' }}>{isAr ? 'آخر حركة' : 'Last Activity'}</th>
                <th style={{ width: '80px', textAlign: 'center' }}>{isAr ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map(row => {
                const totalBase = row.category === 'ASSET' 
                  ? financialTotals.assets.abs().toNumber() 
                  : financialTotals.liabilitiesAndEquity.abs().toNumber();
                const sharePct = totalBase > 0 ? ((row.absVal.toNumber() / totalBase) * 100).toFixed(1) : '0.0';

                return (
                  <tr key={row.account.account_code}>
                    <td className={styles.accountCodeCol} style={{ textAlign: 'center' }}>
                      {row.account.account_code}
                    </td>
                    <td>
                      <div className={styles.accountNameCol}>
                        <div className={styles.accountIconSquircle}>
                          {row.category === 'ASSET' ? <Building2 size={13} color="var(--erp-accent, #2563eb)" /> : row.category === 'LIABILITY' ? <Scale size={13} color="#d97706" /> : <ShieldCheck size={13} color="#475569" />}
                        </div>
                        <span className={styles.accountNameText}>
                          {isAr ? row.account.account_name_ar : row.account.account_name_en}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`${styles.typeBadge} ${
                        row.category === 'ASSET' ? styles.typeBadgeAsset : row.category === 'LIABILITY' ? styles.typeBadgeLiability : styles.typeBadgeEquity
                      }`}>
                        {row.category === 'ASSET' ? (isAr ? 'أصول متداولة' : 'Asset') : row.category === 'LIABILITY' ? (isAr ? 'التزامات متداولة' : 'Liability') : (isAr ? 'حقوق ملكية' : 'Equity')}
                      </span>
                    </td>
                    <td style={{ textAlign: isAr ? 'left' : 'right', fontWeight: 700 }}>
                      <ERPLedgerAmount value={row.net} isAr={isAr} />
                    </td>
                    <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#64748b' }}>
                      {sharePct}%
                    </td>
                    <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontSize: '0.72rem', color: '#64748b' }}>
                      {row.lastActivityDate}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className={styles.inspectActionBtn}
                        onClick={() => onInspectAccount(row.account)}
                        title={isAr ? 'عرض كشف الحساب' : 'Inspect statement'}
                      >
                        <Eye size={12} />
                        <span>{isAr ? 'كشف' : 'Inspect'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className={styles.tableFooterSummary}>
          <span>{isAr ? `إجمالي الحسابات المعروضة: ${filteredAccounts.length}` : `Displayed accounts: ${filteredAccounts.length}`}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span>{isAr ? 'إجمالي الأصول:' : 'Total Assets:'} <strong>{financialTotals.assets.formatEGP(isAr)}</strong></span>
            <span>{isAr ? 'الالتزامات والملكية:' : 'Liabilities & Equity:'} <strong>{financialTotals.liabilitiesAndEquity.formatEGP(isAr)}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheetAnalyticsView;
