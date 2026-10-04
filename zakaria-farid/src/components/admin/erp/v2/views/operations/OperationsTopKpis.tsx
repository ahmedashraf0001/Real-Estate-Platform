/**
 * FIN-OS Daily Operations Top KPI Row
 *
 * Header (title, count · date, report/export actions) followed by 4 discrete
 * floating white cards (.discreteKpiGrid > .discreteKpiCard):
 *   1. الرصيد النقدي الحالي  - total liquid + safe/bank split (real props only)
 *   2. صافي حركة اليوم       - signed net, direction icon, movement count
 *   3. مقبوضات اليوم         - today's inflows
 *   4. مدفوعات اليوم         - today's outflows
 *
 * Every number is derived from props; missing data renders an honest zero.
 * Direction is communicated with an explicit +/- sign and a Lucide icon.
 * Nothing truncates: labels and breakdown rows wrap cleanly.
 */

'use client';

import React, { useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowDown,
  BarChart3,
  FileText
} from 'lucide-react';
import { Decimal } from '@/lib/erp/math';
import styles from './OperationsTopKpis.module.css';

export interface OperationsTopKpisProps {
  isAr?: boolean;
  liquidBalances?: {
    totalLiquid?: Decimal | number | string;
    safeCash?: Decimal | number | string;
    bankCash?: Decimal | number | string;
  };
  todayMetrics?: {
    count?: number;
    inflows?: Decimal | number | string;
    outflows?: Decimal | number | string;
    net?: Decimal | number | string;
  };
  todayStr?: string;
  onOpenReportModal?: () => void;
  onExportExcel?: () => void;
  onTodayKpiClick?: (stream: 'in-total' | 'out-total' | null) => void;
  onViewAllTransactions?: () => void;
  activeStreamFilter?: string | null;
}

// Sparkline bar heights for visual cadence
const SPARKLINE_BARS = [6, 16, 10, 13, 12, 11, 8, 11, 8, 9, 8, 9, 9, 10, 13, 11, 15, 16, 20, 11, 13];

function toNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof (val as { toNumber?: unknown }).toNumber === 'function') {
    const n = (val as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : 0;
  }
  const parsed = parseFloat(String(val).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatEgp(num: number): string {
  return Math.round(Math.abs(num)).toLocaleString('en-US');
}

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
  }
  return dateStr;
}

export const OperationsTopKpis: React.FC<OperationsTopKpisProps> = ({
  isAr = true,
  liquidBalances,
  todayMetrics,
  todayStr,
  onOpenReportModal,
  onExportExcel,
  onTodayKpiClick,
  onViewAllTransactions,
  activeStreamFilter = null,
}) => {
  const currencyLabel = isAr ? 'ج.م' : 'EGP';
  const formattedDate = useMemo(() => formatDisplayDate(todayStr), [todayStr]);

  // Card 1: liquidity
  const safeCashNum = toNum(liquidBalances?.safeCash);
  const bankCashNum = toNum(liquidBalances?.bankCash);
  const totalLiquidNum =
    liquidBalances?.totalLiquid !== undefined ? toNum(liquidBalances.totalLiquid) : safeCashNum + bankCashNum;

  const splitBase = Math.max(0, safeCashNum) + Math.max(0, bankCashNum);
  const hasSplit = splitBase > 0;
  const safePct = hasSplit ? Math.round((Math.max(0, safeCashNum) / splitBase) * 100) : 0;
  const bankPct = hasSplit ? 100 - safePct : 0;

  // Cards 2-4: today's movement
  const countToday = todayMetrics?.count ?? 0;
  const inflowsNum = toNum(todayMetrics?.inflows);
  const outflowsNum = toNum(todayMetrics?.outflows);
  const netNum = todayMetrics?.net !== undefined ? toNum(todayMetrics.net) : inflowsNum - outflowsNum;
  const netSign = netNum > 0 ? '+' : netNum < 0 ? '−' : '';
  const NetIcon = netNum < 0 ? TrendingDown : TrendingUp;

  const netNote =
    countToday === 0
      ? isAr ? 'لا توجد حركات اليوم' : 'No movements today'
      : netNum > 0
        ? isAr ? 'الوارد يفوق المنصرف اليوم' : 'Inflows exceed outflows today'
        : netNum < 0
          ? isAr ? 'المنصرف يفوق الوارد اليوم' : 'Outflows exceed inflows today'
          : isAr ? 'الوارد يساوي المنصرف اليوم' : 'Inflows equal outflows today';

  const subtitle = isAr
    ? `${countToday} حركة مسجلة اليوم${formattedDate ? ` · ${formattedDate}` : ''}`
    : `${countToday} movements recorded today${formattedDate ? ` · ${formattedDate}` : ''}`;

  return (
    <div className={styles.kpiSection} dir={isAr ? 'rtl' : 'ltr'}>
      {/* ─── PANEL HEADER ─── */}
      <div className={styles.panelHeader}>
        <div className={styles.headerTitles}>
          <h2 className={styles.headerTitle}>{isAr ? 'مكتب العمليات اليومية' : 'Daily Operations Desk'}</h2>
          <p className={styles.headerSubtitle}>{subtitle}</p>
        </div>

        <div className={styles.headerControls}>
          <button
            type="button"
            className={styles.headerActionBtn}
            onClick={onOpenReportModal}
            title={isAr ? 'عرض وطباعة كشف التدفقات النقدية' : 'View cash flow report'}
          >
            <BarChart3 size={15} className={styles.btnIcon} aria-hidden="true" />
            <span>{isAr ? 'تقرير الخزينة' : 'Treasury Report'}</span>
          </button>

          {onExportExcel && (
            <button
              type="button"
              className={styles.headerActionBtn}
              onClick={onExportExcel}
              title={isAr ? 'تصدير ملف ERP الشامل' : 'Export full ERP workbook'}
            >
              <FileText size={15} className={styles.btnIcon} aria-hidden="true" />
              <span>{isAr ? 'تصدير ERP الشامل' : 'Export full ERP'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 4 DISCRETE FLOATING KPI CARDS ─── */}
      <div className={styles.discreteKpiGrid}>
        {/* ─── CARD 1: CURRENT CASH BALANCE ─── */}
        <div
          className={`${styles.discreteKpiCard} ${styles.kpiCard} ${onViewAllTransactions ? styles.kpiCardClickable : ''}`}
          onClick={onViewAllTransactions}
          onKeyDown={
            onViewAllTransactions
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onViewAllTransactions();
                  }
                }
              : undefined
          }
          role={onViewAllTransactions ? 'button' : undefined}
          tabIndex={onViewAllTransactions ? 0 : undefined}
          aria-label={isAr ? 'الرصيد النقدي الحالي: عرض كل العمليات' : 'Current cash balance: view all operations'}
        >
          <div className={styles.cardTopContent}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{isAr ? 'الرصيد النقدي الحالي' : 'Current Cash Balance'}</h3>
              <span className={`${styles.squircleIcon} ${styles.squircleGold}`} aria-hidden="true">
                <Wallet size={15} />
              </span>
            </div>

            <div className={styles.cardValueRow}>
              <bdi className={styles.cardValue}>{totalLiquidNum < 0 ? '−' : ''}{formatEgp(totalLiquidNum)}</bdi>
              <span className={styles.cardCurrency}>{currencyLabel}</span>
            </div>
          </div>

          <hr className={styles.hairlineDivider} />

          <div className={styles.dotRowContainer}>
            <div className={styles.dotRow}>
              <span className={styles.goldDot} aria-hidden="true" />
              <span className={styles.dotLabel}>{isAr ? 'خزينة:' : 'Safe:'}</span>
              <span className={styles.dotValue}>
                <bdi>{formatEgp(safeCashNum)}</bdi> {currencyLabel}
              </span>
            </div>
            <div className={styles.dotRow}>
              <span className={styles.slateDot} aria-hidden="true" />
              <span className={styles.dotLabel}>{isAr ? 'بنوك:' : 'Banks:'}</span>
              <span className={styles.dotValue}>
                <bdi>{formatEgp(bankCashNum)}</bdi> {currencyLabel}
              </span>
            </div>
          </div>

          <div className={styles.barContainer}>
            {/* Safe Cash Bar */}
            <div className={styles.barItem}>
              <span className={styles.barLabel}>{isAr ? 'خزينة' : 'Safe'}</span>
              <div className={styles.barTrackWrap}>
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.barFill} ${styles.goldBarFill}`}
                    style={{ width: `${safePct}%` }}
                  />
                </div>
                <span className={styles.barAmount}>
                  <bdi>{formatEgp(safeCashNum)} {currencyLabel}</bdi>
                </span>
              </div>
              <span className={styles.barPct}>{safePct}%</span>
            </div>

            {/* Bank Cash Bar */}
            <div className={styles.barItem}>
              <span className={styles.barLabel}>{isAr ? 'بنوك' : 'Banks'}</span>
              <div className={styles.barTrackWrap}>
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.barFill} ${styles.slateBarFill}`}
                    style={{ width: `${bankPct}%` }}
                  />
                </div>
                <span className={styles.barAmount}>
                  <bdi>{formatEgp(bankCashNum)} {currencyLabel}</bdi>
                </span>
              </div>
              <span className={styles.barPct}>{bankPct}%</span>
            </div>
          </div>
        </div>

        {/* ─── CARD 2: TODAY'S NET MOVEMENT ─── */}
        <div
          className={`${styles.discreteKpiCard} ${styles.kpiCard} ${onTodayKpiClick ? styles.kpiCardClickable : ''}`}
          onClick={onTodayKpiClick ? () => onTodayKpiClick(null) : undefined}
          onKeyDown={
            onTodayKpiClick
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onTodayKpiClick(null);
                  }
                }
              : undefined
          }
          role={onTodayKpiClick ? 'button' : undefined}
          tabIndex={onTodayKpiClick ? 0 : undefined}
          aria-label={isAr ? 'صافي حركة اليوم: عرض حركات اليوم' : "Today's net movement: show today's movements"}
        >
          <div className={styles.cardTopContent}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{isAr ? 'صافي حركة اليوم' : "Today's Net Movement"}</h3>
              <span className={`${styles.squircleIcon} ${styles.squircleGreen}`} aria-hidden="true">
                <NetIcon size={15} />
              </span>
            </div>

            <div className={styles.cardValueRow}>
              <bdi className={styles.cardValue}>{netSign}{formatEgp(netNum)}</bdi>
              <span className={styles.cardCurrency}>{currencyLabel}</span>
            </div>

            <p className={styles.cardSubtitleText}>{netNote}</p>
          </div>

          <hr className={styles.hairlineDivider} />

          <div className={styles.miniColsContainer}>
            {/* Col 1: Inflows (الداخل) */}
            <div className={styles.miniCol}>
              <span className={styles.miniColVal}><bdi>{formatEgp(inflowsNum)}</bdi></span>
              <span className={styles.miniColCurrency}>{currencyLabel}</span>
              <div className={styles.miniColIcon}>
                <ArrowUpRight size={13} className={styles.miniColGreenArrow} aria-hidden="true" />
              </div>
              <span className={styles.miniColLabel}>{isAr ? 'الداخل' : 'Inflows'}</span>
            </div>

            <div className={styles.miniColDivider} aria-hidden="true" />

            {/* Col 2: Outflows (الخارج) */}
            <div className={styles.miniCol}>
              <span className={styles.miniColVal}><bdi>{formatEgp(outflowsNum)}</bdi></span>
              <span className={styles.miniColCurrency}>{currencyLabel}</span>
              <div className={styles.miniColIcon}>
                <ArrowDown size={13} className={styles.miniColRedArrow} aria-hidden="true" />
              </div>
              <span className={styles.miniColLabel}>{isAr ? 'الخارج' : 'Outflows'}</span>
            </div>

            <div className={styles.miniColDivider} aria-hidden="true" />

            {/* Col 3: Net (الصافي) */}
            <div className={styles.miniCol}>
              <span className={styles.miniColVal}><bdi>{formatEgp(netNum)}</bdi></span>
              <span className={styles.miniColCurrency}>{currencyLabel}</span>
              <div className={styles.miniColIcon}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={styles.miniColEqualIcon} aria-hidden="true">
                  <path d="M2.5 5.5H11.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  <path d="M2.5 9.5H8.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </div>
              <span className={styles.miniColLabel}>{isAr ? 'الصافي' : 'Net'}</span>
            </div>
          </div>
        </div>

        {/* ─── CARD 3: TODAY'S INFLOWS ─── */}
        <div
          className={`${styles.discreteKpiCard} ${styles.kpiCard} ${onTodayKpiClick ? styles.kpiCardClickable : ''} ${
            activeStreamFilter === 'in-total' ? styles.kpiCardActive : ''
          }`}
          onClick={onTodayKpiClick ? () => onTodayKpiClick('in-total') : undefined}
          onKeyDown={
            onTodayKpiClick
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onTodayKpiClick('in-total');
                  }
                }
              : undefined
          }
          role={onTodayKpiClick ? 'button' : undefined}
          tabIndex={onTodayKpiClick ? 0 : undefined}
          aria-pressed={activeStreamFilter === 'in-total'}
          aria-label={isAr ? 'مقبوضات اليوم: تصفية السجل' : "Today's inflows: filter the log"}
        >
          <div className={styles.cardTopContent}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{isAr ? 'مقبوضات اليوم' : "Today's Inflows"}</h3>
              <span className={`${styles.squircleIcon} ${styles.squircleAmber}`} aria-hidden="true">
                <ArrowDownLeft size={15} />
              </span>
            </div>

            <div className={styles.cardValueRow}>
              <bdi className={styles.cardValue}>{inflowsNum > 0 ? '+' : ''}{formatEgp(inflowsNum)}</bdi>
              <span className={styles.cardCurrency}>{currencyLabel}</span>
            </div>

            <p className={styles.cardSubtitleText}>
              {isAr ? 'جميع مصادر الإيراد' : 'All revenue sources'}
            </p>
          </div>

          <hr className={styles.hairlineDivider} />

          <div className={styles.sparklineContainer}>
            <div className={styles.sparklineBars} aria-hidden="true">
              {SPARKLINE_BARS.map((height, idx) => (
                <span
                  key={idx}
                  className={styles.sparklineBar}
                  style={{
                    height: `${height}px`,
                    background: inflowsNum > 0 ? 'var(--erp-accent, #2563eb)' : '#cbd5e1'
                  }}
                />
              ))}
            </div>
            <span className={styles.sparklineLabel}>
              {inflowsNum > 0
                ? (isAr ? `${formatEgp(inflowsNum)} ${currencyLabel}` : `${formatEgp(inflowsNum)} ${currencyLabel}`)
                : (isAr ? 'لا توجد مقبوضات اليوم' : 'No inflows today')}
            </span>
          </div>
        </div>

        {/* ─── CARD 4: TODAY'S OUTFLOWS ─── */}
        <div
          className={`${styles.discreteKpiCard} ${styles.kpiCard} ${onTodayKpiClick ? styles.kpiCardClickable : ''} ${
            activeStreamFilter === 'out-total' ? styles.kpiCardActive : ''
          }`}
          onClick={onTodayKpiClick ? () => onTodayKpiClick('out-total') : undefined}
          onKeyDown={
            onTodayKpiClick
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onTodayKpiClick('out-total');
                  }
                }
              : undefined
          }
          role={onTodayKpiClick ? 'button' : undefined}
          tabIndex={onTodayKpiClick ? 0 : undefined}
          aria-label={isAr ? 'مدفوعات اليوم: تصفية السجل' : "Today's outflows: filter the log"}
        >
          <div className={styles.cardTopContent}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{isAr ? 'مدفوعات اليوم' : "Today's Outflows"}</h3>
              <span className={`${styles.squircleIcon} ${styles.squircleOrange}`} aria-hidden="true">
                <ArrowUpRight size={15} />
              </span>
            </div>

            <div className={styles.cardValueRow}>
              <bdi className={styles.cardValue}>{outflowsNum > 0 ? '−' : ''}{formatEgp(outflowsNum)}</bdi>
              <span className={styles.cardCurrency}>{currencyLabel}</span>
            </div>

            <p className={styles.cardSubtitleText}>
              {isAr ? 'جميع أوجه الصرف' : 'All expense categories'}
            </p>
          </div>

          <hr className={styles.hairlineDivider} />

          <div className={styles.sparklineContainer}>
            <div className={styles.sparklineBars} aria-hidden="true">
              {SPARKLINE_BARS.map((height, idx) => (
                <span
                  key={idx}
                  className={styles.sparklineBar}
                  style={{
                    height: `${height}px`,
                    background: outflowsNum > 0 ? '#ea580c' : '#cbd5e1'
                  }}
                />
              ))}
            </div>
            <span className={styles.sparklineLabel}>
              {outflowsNum > 0
                ? (isAr ? `${formatEgp(outflowsNum)} ${currencyLabel}` : `${formatEgp(outflowsNum)} ${currencyLabel}`)
                : (isAr ? 'لا توجد مدفوعات اليوم' : 'No outflows today')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsTopKpis;
