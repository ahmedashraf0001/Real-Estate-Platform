'use client';

import React from 'react';
import { 
  Clock, 
  Calendar, 
  ChevronLeft, 
  CreditCard, 
  User, 
  TrendingUp, 
  Coins, 
  FileText, 
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';
import type { 
  CashMovementTransaction, 
  UpcomingDueItem, 
  UpcomingDuesSummary 
} from '@/lib/erp/operationsStreamFilters';
import { formatNumberWithCommas } from '@/lib/erp/operationsStreamFilters';
import type { ERPPDCRecord, ERPPropertyCostItem, ERPPayableInstallment } from '@/lib/erp/types';
import css from './OperationsSideWidgets.module.css';

export interface OperationsSideWidgetsProps {
  recentTransactions?: CashMovementTransaction[];
  upcomingDues?: UpcomingDuesSummary;
  isAr?: boolean;
  onViewAllTransactions?: () => void;
  onViewAllUpcomingDues?: () => void;
  onInspectTransaction?: (tx: CashMovementTransaction) => void;
  onInspectDueItem?: (item: UpcomingDueItem) => void;
  onCollectItem?: (pdc: ERPPDCRecord) => void;
  onInspectCheque?: (pdc: ERPPDCRecord) => void;
  onRecordPayablePayment?: (cost: ERPPropertyCostItem, installment: ERPPayableInstallment) => void;
  onUpdatePropertyCostItem?: (cost: ERPPropertyCostItem) => void;
  onOpenExpenseModal?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const OperationsSideWidgets: React.FC<OperationsSideWidgetsProps> = ({
  recentTransactions = [],
  upcomingDues = { items: [], totalIn: { eq: () => true, gt: () => false, isNegative: () => false, toNumber: () => 0, abs: () => ({ toNumber: () => 0 }) } as any, totalOut: { eq: () => true, gt: () => false, isNegative: () => false, toNumber: () => 0, abs: () => ({ toNumber: () => 0 }) } as any, totalCount: 0 },
  isAr = true,
  onViewAllTransactions,
  onViewAllUpcomingDues,
  onInspectTransaction,
  onInspectDueItem,
  onCollectItem,
  onInspectCheque,
  onRecordPayablePayment,
  onUpdatePropertyCostItem,
  onOpenExpenseModal,
  onNavigateToTab
}) => {
  // 1. Slices top 5 recent operations
  const displayedRecent = recentTransactions.slice(0, 5);
  // 2. Slices top 4 upcoming dues
  const displayedUpcoming = upcomingDues.items.slice(0, 4);

  // Fallback / default click handler for due items
  const handleDueClick = (item: UpcomingDueItem) => {
    if (onInspectDueItem) {
      onInspectDueItem(item);
      return;
    }
    if (item.rawPdc) {
      if (item.direction === 'IN' && onCollectItem) {
        onCollectItem(item.rawPdc);
      } else if (onInspectCheque) {
        onInspectCheque(item.rawPdc);
      } else if (onCollectItem) {
        onCollectItem(item.rawPdc);
      }
    } else if (item.rawInstallment && item.rawCost) {
      if (onRecordPayablePayment) {
        onRecordPayablePayment(item.rawCost, item.rawInstallment);
      } else if (onUpdatePropertyCostItem) {
        onUpdatePropertyCostItem(item.rawCost);
      } else if (onOpenExpenseModal) {
        onOpenExpenseModal();
      }
    }
  };

  return (
    <div className={css.widgetsContainer}>
      {/* ─── TOP WIDGET: أحدث العمليات (RECENT TRANSACTIONS) ─── */}
      <section className={css.recentFeedCard} aria-labelledby="zf-recent-ops-title">
        {/* Header */}
        <div className={css.recentFeedHeader}>
          <div className={css.recentFeedTitleWrap}>
            <div className={css.goldSquircle} aria-hidden="true">
              <Clock size={19} color="#b48c36" />
            </div>
            <div className={css.headerTexts}>
              <h3 id="zf-recent-ops-title" className={css.recentFeedTitle}>
                {isAr ? 'أحدث العمليات' : 'Recent Operations'}
              </h3>
              <span className={css.cardSubtitle}>
                {displayedRecent.length > 0
                  ? isAr
                    ? `${displayedRecent.length} عمليات حديثة`
                    : `${displayedRecent.length} recent operations`
                  : isAr
                    ? '0 عمليات حديثة'
                    : '0 recent operations'}
              </span>
            </div>
          </div>

          <button
            type="button"
            className={css.recentFeedViewAll}
            onClick={onViewAllTransactions}
            aria-label={isAr ? 'عرض كل العمليات' : 'View all operations'}
          >
            <span>{isAr ? 'عرض الكل' : 'View All'}</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* List of Recent Rows */}
        <div className={css.recentFeedList}>
          {displayedRecent.length === 0 ? (
            <div className={css.recentFeedEmpty}>
              <Clock size={20} color="#94a3b8" />
              <span>{isAr ? 'لا توجد حركات مسجلة مؤخراً' : 'No recent operations recorded'}</span>
            </div>
          ) : (
            displayedRecent.map((tx) => {
              const isInflow = tx.direction === 'IN';
              const isOutflow = tx.direction === 'OUT';

              // Determine whether this transaction is a cheque or client collection
              const isCheque = Boolean(
                tx.rawPdc || 
                tx.typeLabelAr?.includes('شيك') || 
                tx.typeLabelEn?.toLowerCase().includes('cheque') ||
                tx.description?.includes('شيك')
              );

              // Status pill text
              let pillLabel = isAr ? tx.typeLabelAr : tx.typeLabelEn;
              if (isCheque) {
                pillLabel = isAr ? 'قسط محصل' : 'Collected Installment';
              } else if (isInflow) {
                pillLabel = isAr ? 'تحصيل عميل' : 'Client Collection';
              }

              const timeDisplay = tx.timeStr ? tx.timeStr.slice(0, 5) : '11:00';

              return (
                <div
                  key={`recent-tx-${tx.id}`}
                  className={css.recentFeedItem}
                  onClick={() => onInspectTransaction?.(tx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onInspectTransaction?.(tx);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${tx.counterparty || tx.description} - ${formatNumberWithCommas(tx.amount.abs())} ${isAr ? 'ج.م' : 'EGP'}`}
                >
                  {/* Leading (Right in RTL): Squircle + Party & Status Pill */}
                  <div className={css.recentFeedLeading}>
                    <div className={css.itemSquircleGreen} aria-hidden="true">
                      {isCheque ? <Coins size={17} color="#16a34a" /> : <User size={17} color="#16a34a" />}
                    </div>

                    <div className={css.recentFeedInfo}>
                      <span className={css.recentFeedParty} title={tx.counterparty || tx.description}>
                        {tx.counterparty || tx.description || (isAr ? 'معاملة مالية' : 'Movement')}
                      </span>
                      <div className={css.recentFeedMeta}>
                        <span className={css.statusPillGreen}>
                          {pillLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Trailing (Left in RTL): Amount + Date/Time with Clock Icon + Squircle Arrow Button */}
                  <div className={css.recentFeedTrailing}>
                    <div className={css.trailingTextGroup}>
                      <span className={`${css.recentFeedAmount} ${isOutflow ? css.amountOut : ''}`}>
                        {isInflow ? '+ ' : isOutflow ? '- ' : ''}
                        {formatNumberWithCommas(tx.amount.abs())}{' '}
                        <span className={css.currencySuffix}>{isAr ? 'ج.م' : 'EGP'}</span>
                      </span>
                      <span dir="ltr" className={css.recentFeedDate}>
                        {tx.date} {timeDisplay} <Clock size={11} color="#64748b" />
                      </span>
                    </div>

                    <div className={css.arrowButton} aria-hidden="true">
                      <ArrowUpRight size={15} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ─── BOTTOM WIDGET: استحقاقات وتحصيلات قادمة (UPCOMING MATURING DUES) ─── */}
      <section className={css.upcomingDuesCard} aria-labelledby="zf-upcoming-dues-title">
        {/* Header */}
        <div className={css.upcomingDuesHeader}>
          <div className={css.upcomingDuesTitleWrap}>
            <div className={css.goldSquircle} aria-hidden="true">
              <Calendar size={19} color="#b48c36" />
            </div>
            <div className={css.headerTexts}>
              <h3 id="zf-upcoming-dues-title" className={css.upcomingDuesTitle}>
                {isAr ? 'استحقاقات وتحصيلات قادمة' : 'Upcoming Dues & Collections'}
              </h3>
              <div className={css.subtitleWithBadge}>
                <span className={css.amberBadge}>
                  {isAr ? `${upcomingDues.totalCount} مستحق` : `${upcomingDues.totalCount} Dues`}
                </span>
                <span className={css.cardSubtitle}>
                  {isAr ? 'مستحقات خلال 7 أيام قادمة' : 'Dues in next 7 days'}
                </span>
              </div>
            </div>
          </div>

          <div className={css.headerTrailing}>
            <button
              type="button"
              className={css.upcomingDuesViewAll}
              onClick={() => {
                if (onViewAllUpcomingDues) onViewAllUpcomingDues();
                else onNavigateToTab?.('pdc');
              }}
              aria-label={isAr ? 'عرض كل المستحقات' : 'View all upcoming dues'}
            >
              <span>{isAr ? 'عرض الكل' : 'View All'}</span>
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        {/* Top Dual Summary Cards */}
        <div className={css.upcomingDuesSummary}>
          {/* Right half (in RTL): تحصيلات متوقعة */}
          <div className={css.summaryHalf}>
            <div className={css.summaryTexts}>
              <span className={css.summaryLabel}>
                {isAr ? 'تحصيلات متوقعة' : 'Expected In'}
              </span>
              <span className={css.summaryValueGreen}>
                {formatNumberWithCommas(upcomingDues.totalIn)} {isAr ? 'ج.م' : 'EGP'}
              </span>
            </div>
            <div className={css.summarySquircleGreen} aria-hidden="true">
              <TrendingUp size={18} color="#16a34a" />
            </div>
          </div>

          {/* Center hairline vertical divider */}
          <div className={css.summaryHairline} aria-hidden="true" />

          {/* Left half (in RTL): مدفوعات مستحقة */}
          <div className={css.summaryHalf}>
            <div className={css.summaryTexts}>
              <span className={css.summaryLabel}>
                {isAr ? 'مدفوعات مستحقة' : 'Payables Due'}
              </span>
              <span className={css.summaryValueNeutral}>
                {formatNumberWithCommas(upcomingDues.totalOut)} {isAr ? 'ج.م' : 'EGP'}
              </span>
            </div>
            <div className={css.summarySquircleNeutral} aria-hidden="true">
              <Coins size={18} color="#475569" />
            </div>
          </div>
        </div>

        {/* List of Upcoming Dues Rows */}
        <div className={css.upcomingDuesList}>
          {displayedUpcoming.length === 0 ? (
            <div className={css.upcomingDueEmpty}>
              <CheckCircle2 size={20} color="#16a34a" />
              <span>
                {isAr
                  ? 'لا توجد أقساط أو مستحقات مجدولة للفترة القادمة'
                  : 'No upcoming installments or dues scheduled'}
              </span>
            </div>
          ) : (
            displayedUpcoming.map((item) => {
              const isIn = item.direction === 'IN';
              const pillLabel = isAr ? item.typeLabelAr || 'قسط محصل' : item.typeLabelEn || 'Collected Installment';

              return (
                <div
                  key={`due-item-${item.id}`}
                  className={css.upcomingDueItem}
                  onClick={() => handleDueClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleDueClick(item);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${item.party} - ${formatNumberWithCommas(item.amount)} ${isAr ? 'ج.م' : 'EGP'}`}
                >
                  {/* Leading (Right in RTL): Blue Squircle with FileText + Client Name & Soft Blue Pill */}
                  <div className={css.upcomingDueLeading}>
                    <div className={css.itemSquircleBlue} aria-hidden="true">
                      <FileText size={17} color="#2563eb" />
                    </div>

                    <div className={css.upcomingDueInfo}>
                      <span className={css.upcomingDueParty} title={item.party}>
                        {item.party}
                      </span>
                      <div className={css.upcomingDueMeta}>
                        <span className={css.statusPillBlue}>
                          {pillLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Trailing (Left in RTL): Amount + Due Date with Clock Icon + Squircle Arrow Button */}
                  <div className={css.upcomingDueTrailing}>
                    <div className={css.trailingTextGroup}>
                      <span className={`${css.upcomingDueAmount} ${!isIn ? css.amountOut : ''}`}>
                        {isIn ? '+ ' : '- '}
                        {formatNumberWithCommas(item.amount)}{' '}
                        <span className={css.currencySuffix}>{isAr ? 'ج.م' : 'EGP'}</span>
                      </span>
                      <span dir="ltr" className={css.upcomingDueDate}>
                        {item.dueDate} <Clock size={11} color="#64748b" />
                      </span>
                    </div>

                    <div className={css.arrowButton} aria-hidden="true">
                      <ArrowUpRight size={15} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default OperationsSideWidgets;
