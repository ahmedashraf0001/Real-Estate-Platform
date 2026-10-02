'use client';

import React, { useMemo } from 'react';
import {
  BarChart3,
  ArrowRight,
  Users,
  ArrowLeftRight,
  Coins,
  Landmark,
  Wallet,
  HardHat,
  BrickWall,
  Shield,
  Cog,
  ChevronRight,
  Eye,
  Plus
} from 'lucide-react';
import { D, Decimal } from '@/lib/erp/math';
import { formatNumberWithCommas } from '@/lib/erp/operationsStreamFilters';
import styles from './OperationsCashFlowMap.module.css';

const s = styles || {};

function cx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface OperationsCashFlowMetrics {
  inflows: {
    collections: Decimal | number | string;
    partnerInjections: Decimal | number | string;
    total?: Decimal | number | string;
  };
  outflows: {
    civilStructure: Decimal | number | string;
    finishesFacades: Decimal | number | string;
    permitsGovFees: Decimal | number | string;
    mepInfrastructure: Decimal | number | string;
    total?: Decimal | number | string;
  };
  netCashFlow?: Decimal | number | string;
}

export interface OperationsLiquidBalances {
  safeCash: Decimal | number | string;
  bankCash: Decimal | number | string;
  totalLiquid?: Decimal | number | string;
}

export interface OperationsCashFlowMapProps {
  isAr?: boolean;
  flowMetrics?: OperationsCashFlowMetrics;
  liquidBalances?: OperationsLiquidBalances;
  activeStreamFilter?: string | null;
  onSelectStream?: (streamId: string) => void;
  onViewAllTransactions?: () => void;
  onAddItem?: () => void;
  className?: string;
}

// Canonical baseline dataset from reference image media_1790744468759.png
const DEFAULT_INFLOW_COLLECTIONS = D(470197917);
const DEFAULT_INFLOW_PARTNERS = D(1000001);
const DEFAULT_BANK_CASH = D(274016667);
const DEFAULT_SAFE_CASH = D(197131251);
const DEFAULT_OUTFLOW_CIVIL = D(200000);
const DEFAULT_OUTFLOW_FINISHES = D(0);
const DEFAULT_OUTFLOW_PERMITS = D(0);
const DEFAULT_OUTFLOW_MEP = D(0);

export function OperationsCashFlowMap({
  isAr = true,
  flowMetrics,
  liquidBalances,
  activeStreamFilter = null,
  onSelectStream,
  onViewAllTransactions,
  onAddItem,
  className = ''
}: OperationsCashFlowMapProps) {
  // Normalize and derive Inflow values
  const collections = useMemo(() => {
    if (flowMetrics?.inflows?.collections !== undefined) {
      return D(flowMetrics.inflows.collections);
    }
    return DEFAULT_INFLOW_COLLECTIONS;
  }, [flowMetrics?.inflows?.collections]);

  const partnerInjections = useMemo(() => {
    if (flowMetrics?.inflows?.partnerInjections !== undefined) {
      return D(flowMetrics.inflows.partnerInjections);
    }
    return DEFAULT_INFLOW_PARTNERS;
  }, [flowMetrics?.inflows?.partnerInjections]);

  const totalInflows = useMemo(() => {
    if (flowMetrics?.inflows?.total !== undefined) {
      return D(flowMetrics.inflows.total);
    }
    return collections.plus(partnerInjections);
  }, [flowMetrics?.inflows?.total, collections, partnerInjections]);

  // Normalize and derive Outflow values
  const civilStructure = useMemo(() => {
    if (flowMetrics?.outflows?.civilStructure !== undefined) {
      return D(flowMetrics.outflows.civilStructure);
    }
    return DEFAULT_OUTFLOW_CIVIL;
  }, [flowMetrics?.outflows?.civilStructure]);

  const finishesFacades = useMemo(() => {
    if (flowMetrics?.outflows?.finishesFacades !== undefined) {
      return D(flowMetrics.outflows.finishesFacades);
    }
    return DEFAULT_OUTFLOW_FINISHES;
  }, [flowMetrics?.outflows?.finishesFacades]);

  const permitsGovFees = useMemo(() => {
    if (flowMetrics?.outflows?.permitsGovFees !== undefined) {
      return D(flowMetrics.outflows.permitsGovFees);
    }
    return DEFAULT_OUTFLOW_PERMITS;
  }, [flowMetrics?.outflows?.permitsGovFees]);

  const mepInfrastructure = useMemo(() => {
    if (flowMetrics?.outflows?.mepInfrastructure !== undefined) {
      return D(flowMetrics.outflows.mepInfrastructure);
    }
    return DEFAULT_OUTFLOW_MEP;
  }, [flowMetrics?.outflows?.mepInfrastructure]);

  const totalOutflows = useMemo(() => {
    if (flowMetrics?.outflows?.total !== undefined) {
      return D(flowMetrics.outflows.total);
    }
    return civilStructure.plus(finishesFacades).plus(permitsGovFees).plus(mepInfrastructure);
  }, [flowMetrics?.outflows?.total, civilStructure, finishesFacades, permitsGovFees, mepInfrastructure]);

  // Normalize and derive Treasury & Bank Liquidity balances
  const bankCash = useMemo(() => {
    if (liquidBalances?.bankCash !== undefined) {
      return D(liquidBalances.bankCash);
    }
    return DEFAULT_BANK_CASH;
  }, [liquidBalances?.bankCash]);

  const safeCash = useMemo(() => {
    if (liquidBalances?.safeCash !== undefined) {
      return D(liquidBalances.safeCash);
    }
    return DEFAULT_SAFE_CASH;
  }, [liquidBalances?.safeCash]);

  const totalLiquid = useMemo(() => {
    if (liquidBalances?.totalLiquid !== undefined) {
      return D(liquidBalances.totalLiquid);
    }
    return bankCash.plus(safeCash);
  }, [liquidBalances?.totalLiquid, bankCash, safeCash]);

  // Derive split bar percentage allocation
  const { bankPct, safePct } = useMemo(() => {
    const bankVal = Math.max(0, bankCash.toNumber());
    const safeVal = Math.max(0, safeCash.toNumber());
    const sum = bankVal + safeVal;

    if (sum === 0) {
      return { bankPct: 50, safePct: 50 };
    }

    const calculatedBankPct = Math.round((bankVal / sum) * 100);
    const calculatedSafePct = 100 - calculatedBankPct;

    // Minimum visible segment threshold if both hold balances
    if (bankVal > 0 && calculatedBankPct < 5) {
      return { bankPct: 5, safePct: 95 };
    }
    if (safeVal > 0 && calculatedSafePct < 5) {
      return { bankPct: 95, safePct: 5 };
    }

    return { bankPct: calculatedBankPct, safePct: calculatedSafePct };
  }, [bankCash, safeCash]);

  const currencyLabel = isAr ? 'ج.م' : 'EGP';

  const handleStreamClick = (streamId: string) => {
    if (onSelectStream) {
      onSelectStream(streamId);
    }
  };

  return (
    <section
      className={cx(s.cashFlowCard, className)}
      aria-labelledby="operations-cash-flow-title"
      data-testid="operations-cash-flow-map"
    >
      {/* 1. Header Section (Top Right in RTL) */}
      <div className={s.cardHeader}>
        <div className={s.headerTexts}>
          <h2 id="operations-cash-flow-title" className={s.headerTitle}>
            {isAr ? 'تدفق الأموال في المؤسسة' : 'Institutional Cash Flow Map'}
          </h2>
          <p className={s.headerSubtitle}>
            {isAr
              ? 'توضح حركة النقد من مصادر الإيرادات إلى مصارف الإنفاق'
              : 'Live cash flow map from revenue sources to expenditure destinations'}
          </p>
        </div>
        <div className={s.headerIconSquircle} aria-hidden="true">
          <BarChart3 size={20} strokeWidth={2.2} />
        </div>
      </div>

      {/* 2. Upper 3-Column Workstation Grid */}
      <div className={s.upperWorkspaceGrid}>
        {/* COLUMN A (VISUAL LEFT): INFLOWS (التدفقات الداخلة) */}
        <div className={s.subColumn}>
          {/* Inflows Header Banner */}
          <div
            className={cx(s.columnBanner, activeStreamFilter === 'in-total' && s.columnBannerActive)}
            data-stream-id="in-total"
            onClick={() => handleStreamClick('in-total')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleStreamClick('in-total');
              }
            }}
            role="button"
            tabIndex={0}
            aria-pressed={activeStreamFilter === 'in-total'}
            title={isAr ? 'تصفية جميع التدفقات الداخلة' : 'Filter all cash inflows'}
          >
            <div className={s.bannerLeading}>
              <div className={s.bannerSquircleInflow} aria-hidden="true">
                <ArrowRight size={18} strokeWidth={2.2} />
              </div>
              <div className={s.bannerTitleBlock}>
                <span className={s.bannerTitle}>{isAr ? 'التدفقات الداخلة' : 'Cash Inflows'}</span>
                <span className={s.bannerSubtitle}>{isAr ? 'مصادر الإيرادات والتمويل' : 'Revenue & Funding'}</span>
              </div>
            </div>
            <div className={s.bannerTrailing}>
              <span className={s.bannerTotalLabel}>{isAr ? 'إجمالي التدفقات الداخلة' : 'Total Inflows'}</span>
              <span className={s.bannerTotalAmount}>
                {formatNumberWithCommas(totalInflows)} {currencyLabel}
              </span>
            </div>
          </div>

          {/* Inflows Stream Cards List */}
          <div className={s.streamCardsList}>
            {/* Stream 1: Collections */}
            <div
              className={cx(s.streamNodeCard, activeStreamFilter === 'in-0' && s.streamNodeCardActive)}
              data-stream-id="in-0"
              onClick={() => handleStreamClick('in-0')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleStreamClick('in-0');
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={activeStreamFilter === 'in-0'}
              title={isAr ? 'أقساط ومقدمات العملاء: تصفية السجل' : 'Client Collections: filter table'}
            >
              <div className={s.streamNodeLeading}>
                <ChevronRight size={16} className={s.streamChevron} aria-hidden="true" />
                <div className={s.streamIconSquircle} aria-hidden="true">
                  <Users size={17} />
                </div>
                <div className={s.streamTitleBlock}>
                  <span className={s.streamTitle}>{isAr ? 'أقساط ومقدمات العملاء' : 'Client Collections'}</span>
                  <span className={s.streamSubtitle}>{isAr ? 'أقساط ومقدمات جديد/إعادة بيع' : 'Installments & down payments'}</span>
                </div>
              </div>
              <div className={s.streamTrailing}>
                <span className={s.streamAmount}>{formatNumberWithCommas(collections)}</span>
                <span className={s.streamCurrency}>{currencyLabel}</span>
              </div>
            </div>

            {/* Stream 2: Partner Injections */}
            <div
              className={cx(s.streamNodeCard, activeStreamFilter === 'in-1' && s.streamNodeCardActive)}
              data-stream-id="in-1"
              onClick={() => handleStreamClick('in-1')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleStreamClick('in-1');
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={activeStreamFilter === 'in-1'}
              title={isAr ? 'تمويل وسيولة الشركاء: تصفية السجل' : 'Partner Funding: filter table'}
            >
              <div className={s.streamNodeLeading}>
                <ChevronRight size={16} className={s.streamChevron} aria-hidden="true" />
                <div className={s.streamIconSquircle} aria-hidden="true">
                  <ArrowLeftRight size={17} />
                </div>
                <div className={s.streamTitleBlock}>
                  <span className={s.streamTitle}>{isAr ? 'تمويل وسيولة الشركاء' : 'Partner Capital & Funding'}</span>
                  <span className={s.streamSubtitle}>{isAr ? 'رأس المال وفتح تسهيلات' : 'Contributed equity'}</span>
                </div>
              </div>
              <div className={s.streamTrailing}>
                <span className={s.streamAmount}>{formatNumberWithCommas(partnerInjections)}</span>
                <span className={s.streamCurrency}>{currencyLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN B (VISUAL CENTER): AVAILABLE LIQUIDITY (السيولة المتاحة) */}
        <div className={s.subColumn}>
          <div
            className={cx(s.centralCard, activeStreamFilter === 'central-hub' && s.centralCardActive)}
            data-stream-id="central-hub"
            onClick={() => handleStreamClick('central-hub')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleStreamClick('central-hub');
              }
            }}
            role="button"
            tabIndex={0}
            aria-pressed={activeStreamFilter === 'central-hub'}
            title={isAr ? 'السيولة المتاحة: الخزينة وإنستاباي (101000)' : 'Available Liquidity: Safe & InstaPay (101000)'}
          >
            <div className={s.centralTop}>
              <div className={s.centralCoinsSquircle} aria-hidden="true">
                <Coins size={22} strokeWidth={2} />
              </div>
              <span className={s.centralTitle}>{isAr ? 'السيولة المتاحة' : 'Available Liquidity'}</span>
              <span className={s.centralSubtitle}>{isAr ? 'الخزينة وإنستاباي (101000)' : 'Safe & InstaPay (101000)'}</span>
            </div>

            <div className={s.centralGiantAmountRow}>
              <span className={s.centralGiantAmount}>{formatNumberWithCommas(totalLiquid)}</span>
              <span className={s.centralCurrencyGold}>{currencyLabel}</span>
            </div>

            <div className={s.splitBarCard}>
              <div
                className={s.splitBarTrack}
                role="progressbar"
                aria-valuenow={bankPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={isAr ? 'نسبة توزيع السيولة بين إنستاباي والخزينة' : 'Liquidity split between InstaPay and Safe'}
              >
                <div
                  className={s.splitBarBank}
                  style={{ width: `${bankPct}%` }}
                  title={`${isAr ? 'إنستاباي' : 'InstaPay'}: ${bankPct}%`}
                >
                  {bankPct}%
                </div>
                <div
                  className={s.splitBarSafe}
                  style={{ width: `${safePct}%` }}
                  title={`${isAr ? 'خزينة' : 'Treasury'}: ${safePct}%`}
                >
                  {safePct}%
                </div>
              </div>

              <div className={s.splitBarLegendRow}>
                <div className={s.legendCol}>
                  <div className={s.legendHeader}>
                    <Landmark size={15} color="#1e3a5f" aria-hidden="true" />
                    <span className={s.legendLabel}>{isAr ? 'إنستاباي' : 'InstaPay'}</span>
                  </div>
                  <div className={s.legendValueRow}>
                    <bdi className={s.legendAmount}>{formatNumberWithCommas(bankCash)}</bdi>
                    <span className={s.legendCurrency}>{currencyLabel}</span>
                  </div>
                </div>

                <div className={s.legendCol}>
                  <div className={s.legendHeader}>
                    <Wallet size={15} color="#b8903e" aria-hidden="true" />
                    <span className={s.legendLabel}>{isAr ? 'خزينة' : 'Treasury'}</span>
                  </div>
                  <div className={s.legendValueRow}>
                    <bdi className={s.legendAmount}>{formatNumberWithCommas(safeCash)}</bdi>
                    <span className={s.legendCurrency}>{currencyLabel}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN C (VISUAL RIGHT): OUTFLOWS (التدفقات الخارجة) */}
        <div className={s.subColumn}>
          {/* Outflows Header Banner */}
          <div
            className={cx(s.columnBanner, activeStreamFilter === 'out-total' && s.columnBannerActive)}
            data-stream-id="out-total"
            onClick={() => handleStreamClick('out-total')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleStreamClick('out-total');
              }
            }}
            role="button"
            tabIndex={0}
            aria-pressed={activeStreamFilter === 'out-total'}
            title={isAr ? 'تصفية جميع التدفقات الخارجة' : 'Filter all capital outflows'}
          >
            <div className={s.bannerTrailing}>
              <span className={s.bannerTotalLabel}>{isAr ? 'إجمالي التدفقات الخارجة' : 'Total Outflows'}</span>
              <span className={s.bannerTotalAmount}>
                {formatNumberWithCommas(totalOutflows)} {currencyLabel}
              </span>
            </div>
            <div className={s.bannerLeading}>
              <div className={s.bannerTitleBlock}>
                <span className={s.bannerTitle}>{isAr ? 'التدفقات الخارجة' : 'Capital Outflows'}</span>
                <span className={s.bannerSubtitle}>{isAr ? 'مصارف الإنفاق والمشاريع' : 'Expenditure & Projects'}</span>
              </div>
              <div className={s.bannerSquircleOutflow} aria-hidden="true">
                <ArrowRight size={18} strokeWidth={2.2} />
              </div>
            </div>
          </div>

          {/* Outflows Stream Cards List */}
          <div className={s.streamCardsList}>
            {/* Outflow 1: Civil Structure */}
            <div
              className={cx(s.streamNodeCard, activeStreamFilter === 'out-0' && s.streamNodeCardActive)}
              data-stream-id="out-0"
              onClick={() => handleStreamClick('out-0')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleStreamClick('out-0');
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={activeStreamFilter === 'out-0'}
              title={isAr ? 'خرسانات وبناء عظم: تصفية السجل' : 'Civil Structure: filter table'}
            >
              <div className={s.streamTrailing} style={{ alignItems: 'flex-start' }}>
                <span className={s.streamAmount}>{formatNumberWithCommas(civilStructure)}</span>
                <span className={s.streamCurrency}>{currencyLabel}</span>
              </div>
              <div className={s.streamNodeLeading} style={{ justifyContent: 'flex-end' }}>
                <div className={s.streamTitleBlock} style={{ textAlign: 'right' }}>
                  <span className={s.streamTitle}>{isAr ? 'خرسانات وبناء عظم' : 'Civil Structure'}</span>
                  <span className={s.streamSubtitle}>{isAr ? 'حديد وأسمنت وهيكل' : 'Steel & structural frame'}</span>
                </div>
                <div className={s.streamIconSquircleGold} aria-hidden="true">
                  <HardHat size={16} />
                </div>
              </div>
              <ChevronRight size={16} className={s.streamChevron} style={{ order: -1 }} aria-hidden="true" />
            </div>

            {/* Outflow 2: Finishes & Facades */}
            <div
              className={cx(s.streamNodeCard, activeStreamFilter === 'out-1' && s.streamNodeCardActive)}
              data-stream-id="out-1"
              onClick={() => handleStreamClick('out-1')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleStreamClick('out-1');
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={activeStreamFilter === 'out-1'}
              title={isAr ? 'تشطيبات وواجهات: تصفية السجل' : 'Finishes & Facades: filter table'}
            >
              <div className={s.streamTrailing} style={{ alignItems: 'flex-start' }}>
                <span className={s.streamAmount}>{formatNumberWithCommas(finishesFacades)}</span>
                <span className={s.streamCurrency}>{currencyLabel}</span>
              </div>
              <div className={s.streamNodeLeading} style={{ justifyContent: 'flex-end' }}>
                <div className={s.streamTitleBlock} style={{ textAlign: 'right' }}>
                  <span className={s.streamTitle}>{isAr ? 'تشطيبات وواجهات' : 'Finishes & Facades'}</span>
                  <span className={s.streamSubtitle}>{isAr ? 'رخام ألوميتال ومصاعد' : 'Marble & facades'}</span>
                </div>
                <div className={s.streamIconSquircleGold} aria-hidden="true">
                  <BrickWall size={16} />
                </div>
              </div>
              <ChevronRight size={16} className={s.streamChevron} style={{ order: -1 }} aria-hidden="true" />
            </div>

            {/* Outflow 3: Permits & Government Dues */}
            <div
              className={cx(s.streamNodeCard, activeStreamFilter === 'out-3' && s.streamNodeCardActive)}
              data-stream-id="out-3"
              onClick={() => handleStreamClick('out-3')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleStreamClick('out-3');
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={activeStreamFilter === 'out-3'}
              title={isAr ? 'تراخيص ورسوم حكومية: تصفية السجل' : 'Permits & Government Fees: filter table'}
            >
              <div className={s.streamTrailing} style={{ alignItems: 'flex-start' }}>
                <span className={s.streamAmount}>{formatNumberWithCommas(permitsGovFees)}</span>
                <span className={s.streamCurrency}>{currencyLabel}</span>
              </div>
              <div className={s.streamNodeLeading} style={{ justifyContent: 'flex-end' }}>
                <div className={s.streamTitleBlock} style={{ textAlign: 'right' }}>
                  <span className={s.streamTitle}>{isAr ? 'تراخيص ورسوم حكومية' : 'Permits & Gov Fees'}</span>
                  <span className={s.streamSubtitle}>{isAr ? 'رخص بناء ومصاريف الجهاز' : 'Authority dues'}</span>
                </div>
                <div className={s.streamIconSquircleGold} aria-hidden="true">
                  <Shield size={16} />
                </div>
              </div>
              <ChevronRight size={16} className={s.streamChevron} style={{ order: -1 }} aria-hidden="true" />
            </div>

            {/* Outflow 4: MEP & Infrastructure */}
            <div
              className={cx(s.streamNodeCard, activeStreamFilter === 'out-2' && s.streamNodeCardActive)}
              data-stream-id="out-2"
              onClick={() => handleStreamClick('out-2')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleStreamClick('out-2');
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={activeStreamFilter === 'out-2'}
              title={isAr ? 'تأسيس وكهروميكانيك: تصفية السجل' : 'MEP Infrastructure: filter table'}
            >
              <div className={s.streamTrailing} style={{ alignItems: 'flex-start' }}>
                <span className={s.streamAmount}>{formatNumberWithCommas(mepInfrastructure)}</span>
                <span className={s.streamCurrency}>{currencyLabel}</span>
              </div>
              <div className={s.streamNodeLeading} style={{ justifyContent: 'flex-end' }}>
                <div className={s.streamTitleBlock} style={{ textAlign: 'right' }}>
                  <span className={s.streamTitle}>{isAr ? 'تأسيس وكهروميكانيك' : 'MEP Infrastructure'}</span>
                  <span className={s.streamSubtitle}>{isAr ? 'سباكة، كهرباء، ومغاز' : 'Plumbing & electrical'}</span>
                </div>
                <div className={s.streamIconSquircleGold} aria-hidden="true">
                  <Cog size={16} />
                </div>
              </div>
              <ChevronRight size={16} className={s.streamChevron} style={{ order: -1 }} aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Visual Flow Ribbon */}
      <div className={s.bottomFlowSection}>
        <div className={s.ribbonContainer}>
          {/* Left Inflow Node */}
          <div className={s.ribbonNodeInflow}>
            <span className={s.ribbonNodeLabelInflow}>{isAr ? 'إجمالي الداخل' : 'Total Inflow'}</span>
            <span className={s.ribbonNodeValue}>
              {formatNumberWithCommas(totalInflows)} {currencyLabel}
            </span>
          </div>

          {/* Green Flow Ribbon with Right Arrow */}
          <div className={s.flowConnector}>
            <svg
              className={s.flowConnectorSvg}
              viewBox="0 0 100 52"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="greenRibbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#fde68a" stopOpacity="0.65" />
                </linearGradient>
              </defs>
              <path
                d="M 0 5 C 35 12, 65 12, 100 5 L 100 47 C 65 40, 35 40, 0 47 Z"
                fill="url(#greenRibbonGrad)"
              />
            </svg>
            <div className={cx(s.flowChevronBadge, s.flowChevronBadgeGreen)} aria-hidden="true">
              <ChevronRight size={15} strokeWidth={2.5} />
            </div>
          </div>

          {/* Center Treasury Node */}
          <div className={s.ribbonNodeCenter}>
            <div className={s.ribbonCenterSquircle} aria-hidden="true">
              <Coins size={17} strokeWidth={2} />
            </div>
            <div className={s.ribbonCenterTexts}>
              <span className={s.ribbonCenterLabel}>{isAr ? 'السيولة المتاحة' : 'Available Liquidity'}</span>
              <span className={s.ribbonNodeValue}>
                {formatNumberWithCommas(totalLiquid)} {currencyLabel}
              </span>
            </div>
          </div>

          {/* Red Flow Ribbon with Right Arrow */}
          <div className={s.flowConnector}>
            <svg
              className={s.flowConnectorSvg}
              viewBox="0 0 100 52"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="redRibbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fde68a" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#fca5a5" stopOpacity="0.75" />
                </linearGradient>
              </defs>
              <path
                d="M 0 5 C 35 12, 65 12, 100 5 L 100 47 C 65 40, 35 40, 0 47 Z"
                fill="url(#redRibbonGrad)"
              />
            </svg>
            <div className={cx(s.flowChevronBadge, s.flowChevronBadgeRed)} aria-hidden="true">
              <ChevronRight size={15} strokeWidth={2.5} />
            </div>
          </div>

          {/* Right Outflow Node */}
          <div className={s.ribbonNodeOutflow}>
            <span className={s.ribbonNodeLabelOutflow}>{isAr ? 'إجمالي الخارج' : 'Total Outflow'}</span>
            <span className={s.ribbonNodeValue}>
              {formatNumberWithCommas(totalOutflows)} {currencyLabel}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Footer Buttons */}
      <div className={s.cardFooter}>
        <button
          type="button"
          className={s.viewAllButton}
          onClick={onViewAllTransactions}
          title={isAr ? 'عرض كل الحركات المالية المسجلة' : 'View all registered transactions'}
        >
          <Eye size={16} />
          <span>{isAr ? 'عرض كل العمليات' : 'View all movements'}</span>
        </button>

        <button
          type="button"
          className={s.addItemButton}
          onClick={onAddItem}
          title={isAr ? 'إضافة بند حركة جديدة' : 'Add new item'}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>{isAr ? 'إضافة بند' : 'Add Item'}</span>
        </button>
      </div>
    </section>
  );
}
