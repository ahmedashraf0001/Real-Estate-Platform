'use client';

import React from 'react';
import { 
  Clock, 
  Calendar, 
  ChevronLeft, 
  TrendingUp, 
  Coins, 
  FileText, 
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';
import type { 
  UpcomingDueItem, 
  UpcomingDuesSummary 
} from '@/lib/erp/operationsStreamFilters';
import { formatNumberWithCommas } from '@/lib/erp/operationsStreamFilters';
import type { ERPPDCRecord, ERPPropertyCostItem, ERPPayableInstallment } from '@/lib/erp/types';
import css from './OperationsSideWidgets.module.css';

export interface OperationsSideWidgetsProps {
  upcomingDues?: UpcomingDuesSummary;
  isAr?: boolean;
  onViewAllUpcomingDues?: () => void;
  onInspectDueItem?: (item: UpcomingDueItem) => void;
  onCollectItem?: (pdc: ERPPDCRecord) => void;
  onInspectCheque?: (pdc: ERPPDCRecord) => void;
  onRecordPayablePayment?: (cost: ERPPropertyCostItem, installment: ERPPayableInstallment) => void;
  onUpdatePropertyCostItem?: (cost: ERPPropertyCostItem) => void;
  onOpenExpenseModal?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const OperationsSideWidgets: React.FC<OperationsSideWidgetsProps> = ({
  upcomingDues = { items: [], totalIn: { eq: () => true, gt: () => false, isNegative: () => false, toNumber: () => 0, abs: () => ({ toNumber: () => 0 }) } as any, totalOut: { eq: () => true, gt: () => false, isNegative: () => false, toNumber: () => 0, abs: () => ({ toNumber: () => 0 }) } as any, totalCount: 0 },
  isAr = true,
  onViewAllUpcomingDues,
  onInspectDueItem,
  onCollectItem,
  onInspectCheque,
  onRecordPayablePayment,
  onUpdatePropertyCostItem,
  onOpenExpenseModal,
  onNavigateToTab
}) => {
  // 1. Slices top 4 upcoming dues
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
                  {upcomingDues.totalOut && !upcomingDues.totalOut.eq(0)
                    ? (isAr ? `${upcomingDues.totalCount} مستحق والتزام` : `${upcomingDues.totalCount} Dues & Payables`)
                    : (isAr ? `${upcomingDues.totalCount} مستحق` : `${upcomingDues.totalCount} Dues`)}
                </span>
                <span className={css.cardSubtitle}>
                  {isAr ? 'الاستحقاقات والتحصيلات خلال الفترة القادمة' : 'Dues & collections in upcoming period'}
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
                  ? 'لا توجد شيكات أو مستحقات مجدولة للفترة القادمة'
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
