'use client';

import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  Receipt, 
  Scale, 
  Percent, 
  BarChart3, 
  PieChart, 
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

interface IncomeStatementAnalyticsViewProps {
  accountStats: Record<string, { debits: Decimal; credits: Decimal; count: number }>;
  journalEntries: ERPJournalEntry[];
  isAr?: boolean;
  currentAccent?: string;
  onInspectAccount: (acc: ERPAccount) => void;
  onExportExcel?: () => void;
}

export const IncomeStatementAnalyticsView: React.FC<IncomeStatementAnalyticsViewProps> = ({
  accountStats,
  journalEntries,
  isAr = true,
  currentAccent = '#2563eb',
  onInspectAccount,
  onExportExcel
}) => {
  const [tableFilter, setTableFilter] = useState<'ALL' | 'REVENUE' | 'EXPENSE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ─── 1. CORE FINANCIAL MATHEMATICS (Honest Zero Fake Data) ───
  const financialTotals = useMemo(() => {
    let grossSales = D(0);     // 401000
    let rescissions = D(0);    // 430100
    let otherRevenue = D(0);   // 402000, 403000
    let totalRevenue = D(0);
    let totalExpenses = D(0);

    const expenseMap: Record<string, { account: ERPAccount; amount: Decimal; lastDate: string }> = {};
    const revenueMap: Record<string, { account: ERPAccount; amount: Decimal; lastDate: string }> = {};

    // Map last activity dates from real entries
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
      const code = acc.account_code;
      const lastDate = lastDates[code] || '-';

      if (acc.account_type === 'REVENUE') {
        const net = stats.credits.minus(stats.debits);
        if (code === '401000') {
          grossSales = grossSales.plus(net);
        } else if (code === '430100') {
          rescissions = rescissions.plus(net.abs());
        } else {
          otherRevenue = otherRevenue.plus(net);
        }
        totalRevenue = totalRevenue.plus(net);
        if (!net.isZero()) {
          revenueMap[code] = { account: acc, amount: net, lastDate };
        }
      } else if (acc.account_type === 'EXPENSE') {
        const net = stats.debits.minus(stats.credits);
        totalExpenses = totalExpenses.plus(net);
        if (!net.isZero()) {
          expenseMap[code] = { account: acc, amount: net, lastDate };
        }
      }
    });

    const netIncome = totalRevenue.minus(totalExpenses);
    const revenueNum = totalRevenue.toNumber();
    const marginPct = revenueNum > 0 ? ((netIncome.toNumber() / revenueNum) * 100).toFixed(1) : '0.0';

    const accountRows = [
      ...Object.values(revenueMap).map(item => ({
        ...item,
        type: 'REVENUE' as const,
        absVal: item.amount.abs()
      })),
      ...Object.values(expenseMap).map(item => ({
        ...item,
        type: 'EXPENSE' as const,
        absVal: item.amount.abs()
      }))
    ].sort((a, b) => b.absVal.minus(a.absVal).toNumber());

    return {
      grossSales,
      rescissions,
      netRevenue: totalRevenue,
      totalRevenue,
      totalExpenses,
      netIncome,
      marginPct,
      otherRevenue,
      revenueMap,
      expenseMap,
      accountRows
    };
  }, [accountStats, journalEntries]);

  // ─── 2. CHART 1: NET PROFIT FORMATION WATERFALL (Muted Enterprise Palette) ───
  const profitFormationData = useMemo(() => {
    const gross = Math.max(0, financialTotals.grossSales.toNumber());
    const resc = Math.max(0, financialTotals.rescissions.toNumber());
    const netRev = financialTotals.netRevenue.toNumber();
    const exp = Math.max(0, financialTotals.totalExpenses.toNumber());
    const profit = financialTotals.netIncome.toNumber();

    return {
      categories: [
        isAr ? 'مبيعات الوحدات' : 'Unit Sales',
        isAr ? 'أثر فسخ العقود' : 'Rescissions',
        isAr ? 'صافي الإيرادات' : 'Net Revenue',
        isAr ? 'المصروفات' : 'Expenses',
        isAr ? 'صافي الربح' : 'Net Profit'
      ],
      series: [{
        name: isAr ? 'القيمة' : 'Amount',
        data: [gross, -resc, netRev, -exp, profit]
      }],
      colors: [
        '#16a34a',                                // Unit Sales (Green)
        '#dc2626',                                // Rescissions (Red)
        currentAccent || '#2563eb',               // Net Revenue (Accent Blue)
        '#dc2626',                                // Expenses (Red)
        profit >= 0 ? (currentAccent || '#2563eb') : '#dc2626' // Net Profit (Accent or Red)
      ]
    };
  }, [financialTotals, isAr, currentAccent]);

  // ─── 3. CHART 2: REVENUE DISTRIBUTION DONUT ───
  const revenueDonutData = useMemo(() => {
    const gross = Math.max(0, financialTotals.grossSales.toNumber());
    const other = Math.max(0, financialTotals.otherRevenue.toNumber());
    const items = [
      { label: isAr ? 'مبيعات الشقق المحققة' : 'Delivered Apartment Sales', value: gross, color: currentAccent || 'var(--erp-accent)' },
      { label: isAr ? 'إيرادات التنازلات والعقود' : 'Contract Fees & Adjustments', value: other, color: '#0284c7' },
      { label: isAr ? 'إيرادات تشغيلية أخرى' : 'Other Operating Revenue', value: 0, color: '#64748b' }
    ].filter(i => i.value > 0);

    const total = items.reduce((acc, curr) => acc + curr.value, 0);

    // Fallback single slice if zero
    const safeItems = items.length > 0 ? items : [
      { label: isAr ? 'لا توجد إيرادات مسجلة' : 'No revenue recorded', value: 0, color: '#cbd5e1' }
    ];

    return {
      series: safeItems.map(i => i.value),
      labels: safeItems.map(i => i.label),
      colors: safeItems.map(i => i.color),
      total,
      items: safeItems.map(i => ({
        ...i,
        percent: total > 0 ? ((i.value / total) * 100).toFixed(1) : '0.0'
      }))
    };
  }, [financialTotals, isAr, currentAccent]);

  // ─── 4. CHART 3: TOP 5 EXPENSE ACCOUNTS (Horizontal Bar) ───
  const topExpensesData = useMemo(() => {
    const rawExpenses = Object.values(financialTotals.expenseMap);
    if (rawExpenses.length === 0) {
      return {
        categories: [isAr ? 'لا توجد مصروفات مسجلة' : 'No expenses recorded'],
        series: [{ name: isAr ? 'المصروف' : 'Expense', data: [0] }]
      };
    }
    const sorted = [...rawExpenses].sort((a, b) => b.amount.minus(a.amount).toNumber()).slice(0, 5);
    return {
      categories: sorted.map(i => isAr ? i.account.account_name_ar : i.account.account_name_en),
      series: [{
        name: isAr ? 'المصروف' : 'Expense',
        data: sorted.map(i => Math.round(i.amount.toNumber()))
      }]
    };
  }, [financialTotals.expenseMap, isAr]);

  // ─── 5. CHART 4: MONTHLY REVENUE & EXPENSES MOVEMENT (Real Entries) ───
  const monthlyTrendData = useMemo(() => {
    const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const categories = isAr ? monthNamesAr : monthNamesEn;

    const monthlyRev = new Array(12).fill(0);
    const monthlyExp = new Array(12).fill(0);

    journalEntries.forEach(entry => {
      const d = new Date(entry.entry_date);
      const m = isNaN(d.getMonth()) ? 2 : d.getMonth();
      (entry.lines || []).forEach(line => {
        const acc = CANONICAL_COA[line.account_code];
        if (!acc) return;
        const deb = line.debit_amount ? D(line.debit_amount) : D(0);
        const cred = line.credit_amount ? D(line.credit_amount) : D(0);
        if (acc.account_type === 'REVENUE') {
          const net = cred.minus(deb);
          monthlyRev[m] += net.toNumber();
        } else if (acc.account_type === 'EXPENSE') {
          const net = deb.minus(cred);
          monthlyExp[m] += net.toNumber();
        }
      });
    });

    const netProfitData = monthlyRev.map((r, i) => r - monthlyExp[i]);

    return {
      categories,
      series: [
        { name: isAr ? 'الإيرادات' : 'Revenue', data: monthlyRev.map(v => Math.round(v)) },
        { name: isAr ? 'المصروفات' : 'Expenses', data: monthlyExp.map(v => Math.round(v)) },
        { name: isAr ? 'صافي الربح' : 'Net Profit', data: netProfitData.map(v => Math.round(v)) }
      ]
    };
  }, [journalEntries, isAr]);

  // ─── 6. FILTERED ACCOUNTS FOR TABLE ───
  const filteredAccounts = useMemo(() => {
    return financialTotals.accountRows.filter(row => {
      if (tableFilter !== 'ALL' && row.type !== tableFilter) return false;
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
            <TrendingUp size={18} />
          </div>
          <div className={styles.titleArea}>
            <h2 className={styles.pageTitle}>{isAr ? 'قائمة الأرباح والخسائر' : 'Income Statement'}</h2>
            <p className={styles.pageSubtitle}>
              {isAr 
                ? 'تحليل متكامل وتفصيلي للإيرادات والتكاليف وهوامش الربحية المسجلة في دفتر الأستاذ.' 
                : 'Comprehensive analysis of revenues, costs, and profit margins recorded in ledger.'}
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.filterBadge}>
            <span>{isAr ? 'الفترة المالية: السنة المالية 2026' : 'Fiscal Period: FY 2026'}</span>
          </div>
          <span className={`${styles.statusPill} ${styles.statusPillNeutral}`}>
            <span>{isAr ? 'جميع الفترات المسجلة' : 'All recorded periods'}</span>
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
        {/* KPI 1: Total Revenue */}
        <ZFKpiCard
          title={isAr ? 'إجمالي الإيرادات' : 'Total Revenue'}
          value={financialTotals.totalRevenue}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<TrendingUp size={16} />}
          accentColor="emerald"
          subtitleLabel={isAr ? 'المبيعات والخدمات المحققة' : 'Realized sales & fees'}
        />

        {/* KPI 2: Total Costs & Expenses */}
        <ZFKpiCard
          title={isAr ? 'إجمالي المصروفات والتكاليف' : 'Total Expenses'}
          value={financialTotals.totalExpenses}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<Receipt size={16} />}
          accentColor="rose"
          subtitleLabel={isAr ? 'تكاليف ومصروفات تشغيلية' : 'Direct costs & OpEx'}
        />

        {/* KPI 3: Net Operating Income */}
        <ZFKpiCard
          title={isAr ? 'صافي نتيجة النشاط' : 'Net Operating Result'}
          value={financialTotals.netIncome}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<Scale size={16} />}
          accentColor={financialTotals.netIncome.gte(0) ? 'teal' : 'rose'}
          subtitleLabel={isAr ? 'قبل توزيع الأرباح والضرائب' : 'Pre-tax & distributions'}
        />

        {/* KPI 4: Margin */}
        <ZFKpiCard
          title={isAr ? 'هامش الربح الصافي' : 'Net Margin'}
          value={`${financialTotals.marginPct}%`}
          icon={<Percent size={16} />}
          accentColor="accent"
          subtitleLabel={isAr ? 'نسبة الصافي من الإيراد' : '% of Total Revenue'}
        />
      </ZFKpiGrid>

      {/* ─── 3. ANALYTICAL CHARTS ROW 1: PROFIT FORMATION & REVENUE BREAKDOWN ─── */}
      <div className={styles.chartsGrid}>
        {/* Chart 1: Profit Formation Waterfall */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderLeading}>
              <div className={styles.chartIconSquircle}>
                <BarChart3 size={15} />
              </div>
              <div className={styles.chartTitleWrap}>
                <h3 className={styles.chartTitle}>{isAr ? 'تحليل تكوين صافي الربح' : 'Net Profit Formation Analysis'}</h3>
                <p className={styles.chartSubtitle}>{isAr ? 'من إجمالي الإيرادات إلى صافي نتيجة النشاط' : 'Bridge from gross revenue to net income'}</p>
              </div>
            </div>
            <div className={styles.chartHeaderTrailing}>
              <span className={styles.filterBadge}>{isAr ? 'تسلسل تكوين القائمة' : 'Statement Flow'}</span>
            </div>
          </div>

          <ERPApexChart
            type="bar"
            series={profitFormationData.series}
            options={{
              plotOptions: {
                bar: {
                  columnWidth: '45%',
                  borderRadius: 4,
                  distributed: true
                }
              },
              xaxis: {
                categories: profitFormationData.categories,
                labels: {
                  rotate: -15,
                  style: { fontSize: '11px', fontWeight: 600 }
                }
              },
              yaxis: {
                labels: {
                  formatter: (val: number) => {
                    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
                    if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
                    return `${val}`;
                  }
                }
              },
              colors: profitFormationData.colors,
              grid: { borderColor: '#e2e8f0', strokeDashArray: 2 },
              legend: { show: false }
            }}
            height={230}
            isAr={isAr}
          />
        </div>

        {/* Chart 2: Revenue Distribution Donut */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderLeading}>
              <div className={styles.chartIconSquircle}>
                <PieChart size={15} />
              </div>
              <div className={styles.chartTitleWrap}>
                <h3 className={styles.chartTitle}>{isAr ? 'توزيع الإيرادات التفصيلية' : 'Revenue Detailed Breakdown'}</h3>
                <p className={styles.chartSubtitle}>{isAr ? 'المبيعات، التنازلات، والخدمات المسجلة' : 'Sales, assignment fees & services'}</p>
              </div>
            </div>
            <div className={styles.chartHeaderTrailing}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {(revenueDonutData.total / 1_000_000).toFixed(1)}M {isAr ? 'ج.م' : 'EGP'}
              </span>
            </div>
          </div>

          <div className={styles.donutSplitLayout}>
            <ERPApexChart
              type="donut"
              series={revenueDonutData.series}
              options={{
                labels: revenueDonutData.labels,
                colors: revenueDonutData.colors,
                dataLabels: { enabled: false },
                plotOptions: {
                  pie: {
                    donut: {
                      size: '68%',
                      labels: {
                        show: true,
                        total: {
                          show: true,
                          label: isAr ? 'إجمالي الإيرادات' : 'Total Revenue',
                          fontSize: '11px',
                          color: '#64748b',
                          formatter: () => `${(revenueDonutData.total / 1_000_000).toFixed(1)}M`
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
              {revenueDonutData.items.map((item, idx) => (
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

      {/* ─── 4. ANALYTICAL CHARTS ROW 2: TOP EXPENSES & MONTHLY MOVEMENT ─── */}
      <div className={styles.chartsGrid}>
        {/* Chart 3: Top Expense Drivers */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderLeading}>
              <div className={styles.chartIconSquircle}>
                <Receipt size={15} />
              </div>
              <div className={styles.chartTitleWrap}>
                <h3 className={styles.chartTitle}>{isAr ? 'أكبر حسابات المصروفات والتكاليف' : 'Top Expense Drivers'}</h3>
                <p className={styles.chartSubtitle}>{isAr ? 'الحسابات الخمسة الأكثر استنزافاً للإيراد' : 'Top 5 expense accounts by amount'}</p>
              </div>
            </div>
            <div className={styles.chartHeaderTrailing}>
              <span className={styles.filterBadge}>{isAr ? 'أعلى 5 تكاليف' : 'Top 5'}</span>
            </div>
          </div>

          <ERPApexChart
            type="bar"
            series={topExpensesData.series}
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
                categories: topExpensesData.categories,
                labels: {
                  formatter: (val: number) => {
                    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
                    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
                    return `${val}`;
                  }
                }
              },
              colors: ['#dc2626'],
              grid: { borderColor: '#e2e8f0', strokeDashArray: 2 },
              legend: { show: false }
            }}
            height={230}
            isAr={isAr}
          />
        </div>

        {/* Chart 4: Monthly Revenue vs Expenses Movement */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderLeading}>
              <div className={styles.chartIconSquircle}>
                <TrendingUp size={15} />
              </div>
              <div className={styles.chartTitleWrap}>
                <h3 className={styles.chartTitle}>{isAr ? 'حركة الإيرادات والمصروفات الشهرية' : 'Monthly Revenue vs Expenses'}</h3>
                <p className={styles.chartSubtitle}>{isAr ? 'تطور التدفقات الإيرادية والتكاليف عبر شهور السنة' : 'Monthly revenue and expense distribution'}</p>
              </div>
            </div>
          </div>

          <ERPApexChart
            type="line"
            series={monthlyTrendData.series}
            options={{
              xaxis: { categories: monthlyTrendData.categories },
              colors: ['#16a34a', '#dc2626', currentAccent || '#2563eb'],
              stroke: { curve: 'smooth', width: 2.2 },
              grid: { borderColor: '#e2e8f0', strokeDashArray: 2 }
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
                {isAr ? 'كافة بنود القائمة' : 'All Items'} ({financialTotals.accountRows.length})
              </button>
              <button 
                type="button" 
                className={`${styles.filterPill} ${tableFilter === 'REVENUE' ? styles.filterPillActive : ''}`}
                onClick={() => setTableFilter('REVENUE')}
              >
                {isAr ? 'الإيرادات' : 'Revenues'}
              </button>
              <button 
                type="button" 
                className={`${styles.filterPill} ${tableFilter === 'EXPENSE' ? styles.filterPillActive : ''}`}
                onClick={() => setTableFilter('EXPENSE')}
              >
                {isAr ? 'المصروفات' : 'Expenses'}
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
                <th style={{ width: '130px', textAlign: 'center' }}>{isAr ? 'النوع' : 'Type'}</th>
                <th style={{ textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'المبلغ (ج.م)' : 'Amount (EGP)'}</th>
                <th style={{ width: '100px', textAlign: 'center' }}>{isAr ? 'النسبة' : 'Share'}</th>
                <th style={{ width: '110px', textAlign: 'center' }}>{isAr ? 'آخر حركة' : 'Last Activity'}</th>
                <th style={{ width: '80px', textAlign: 'center' }}>{isAr ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    {isAr ? 'لا توجد حسابات مسجلة تطابق التصفية الحالية' : 'No accounts matching current filter'}
                  </td>
                </tr>
              ) : (
                filteredAccounts.map(row => {
                  const base = row.type === 'REVENUE' ? financialTotals.totalRevenue.abs().toNumber() : financialTotals.totalExpenses.abs().toNumber();
                  const sharePct = base > 0 ? ((row.absVal.toNumber() / base) * 100).toFixed(1) : '0.0';

                  return (
                    <tr key={row.account.account_code}>
                      <td className={styles.accountCodeCol} style={{ textAlign: 'center' }}>
                        {row.account.account_code}
                      </td>
                      <td>
                        <div className={styles.accountNameCol}>
                          <div className={styles.accountIconSquircle}>
                            {row.type === 'REVENUE' ? <TrendingUp size={13} color="#16a34a" /> : <Receipt size={13} color="#dc2626" />}
                          </div>
                          <span className={styles.accountNameText}>
                            {isAr ? row.account.account_name_ar : row.account.account_name_en}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`${styles.typeBadge} ${row.type === 'REVENUE' ? styles.typeBadgeRevenue : styles.typeBadgeExpense}`}>
                          {row.type === 'REVENUE' ? (isAr ? 'إيراد' : 'Revenue') : (isAr ? 'مصروف' : 'Expense')}
                        </span>
                      </td>
                      <td style={{ textAlign: isAr ? 'left' : 'right', fontWeight: 700 }}>
                        <ERPLedgerAmount value={row.amount} isAr={isAr} />
                      </td>
                      <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#64748b' }}>
                        {sharePct}%
                      </td>
                      <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontSize: '0.72rem', color: '#64748b' }}>
                        {row.lastDate}
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
                })
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.tableFooterSummary}>
          <span>{isAr ? `إجمالي البنود: ${filteredAccounts.length}` : `Total items: ${filteredAccounts.length}`}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span>{isAr ? 'صافي نتيجة النشاط:' : 'Net Operating Result:'} <strong style={{ color: financialTotals.netIncome.gte(0) ? '#16a34a' : '#dc2626' }}>{financialTotals.netIncome.formatEGP(isAr)}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeStatementAnalyticsView;
