/**
 * Zakaria Farid Real Estate ERP — Partner Capital Commitments & Milestone Aging Engine
 * Financial Invariants:
 * - Deterministic, zero-float arithmetic with Decimal.js
 * - Purely informational status tracking; zero automated penalty, dilution, or unit reassignment
 * - Honest zero-states (0, 0.00 ج.م)
 */

import { D, Decimal } from './math';
import { ERPPartnerCommitment, PartnerCommitmentStatus } from './types';

export type PartnerAgingBucket = 'CURRENT' | 'DAYS_1_30' | 'DAYS_31_60' | 'DAYS_60_PLUS';

export interface EvaluatedPartnerCommitment {
  commitment: ERPPartnerCommitment;
  committedAmount: Decimal;
  paidAmount: Decimal;
  unpaidBalance: Decimal;
  daysOverdue: number;
  effectiveStatus: PartnerCommitmentStatus;
  agingBucket: PartnerAgingBucket;
  isOverdue: boolean;
  isDueSoon: boolean; // due within 7 days
}

export interface AgingBucketSummary {
  bucket: PartnerAgingBucket;
  labelAr: string;
  labelEn: string;
  count: number;
  totalAmount: Decimal;
  totalAmountFormatted: string;
}

export interface PartnerAgingSummary {
  asOfDate: string;
  totalCommitmentsCount: number;
  openCommitmentsCount: number;
  overdueCommitmentsCount: number;
  totalCommitted: Decimal;
  totalPaid: Decimal;
  totalOutstanding: Decimal;
  totalOverdue: Decimal;
  totalCommittedFormatted: string;
  totalPaidFormatted: string;
  totalOutstandingFormatted: string;
  totalOverdueFormatted: string;
  agingBuckets: {
    current: AgingBucketSummary;
    days1_30: AgingBucketSummary;
    days31_60: AgingBucketSummary;
    days60Plus: AgingBucketSummary;
  };
  byPartner: Record<string, {
    partnerName: string;
    totalCommitted: Decimal;
    totalPaid: Decimal;
    totalOutstanding: Decimal;
    totalOverdue: Decimal;
    overdueCount: number;
    commitments: EvaluatedPartnerCommitment[];
  }>;
  byProperty: Record<string, {
    propertyId: string;
    totalCommitted: Decimal;
    totalPaid: Decimal;
    totalOutstanding: Decimal;
    totalOverdue: Decimal;
    overdueCount: number;
    commitments: EvaluatedPartnerCommitment[];
  }>;
  evaluatedCommitments: EvaluatedPartnerCommitment[];
}

/**
 * Evaluates a single partner commitment against an evaluation date.
 */
export function evaluatePartnerCommitment(
  commitment: ERPPartnerCommitment,
  asOfDateStr?: string
): EvaluatedPartnerCommitment {
  const asOf = asOfDateStr ? new Date(asOfDateStr) : new Date();
  asOf.setHours(0, 0, 0, 0);

  const dueDate = new Date(commitment.due_date);
  dueDate.setHours(0, 0, 0, 0);

  const committed = D(commitment.committed_amount || 0);
  const paid = D(commitment.paid_amount || 0);
  const unpaid = committed.gt(paid) ? committed.minus(paid) : D(0);

  const isCancelled = commitment.status === 'CANCELLED';
  const isPaid = unpaid.isZero() && committed.gt(0);

  const diffMs = asOf.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const isOverdue = !isCancelled && !isPaid && diffDays > 0;
  const daysOverdue = isOverdue ? diffDays : 0;

  // Due soon: not overdue, not paid, but due in <= 7 days
  const isDueSoon = !isCancelled && !isPaid && !isOverdue && diffDays >= -7;

  let effectiveStatus: PartnerCommitmentStatus;
  if (isCancelled) {
    effectiveStatus = 'CANCELLED';
  } else if (isPaid) {
    effectiveStatus = 'PAID';
  } else if (isOverdue) {
    effectiveStatus = 'OVERDUE';
  } else if (paid.gt(0)) {
    effectiveStatus = 'PARTIALLY_PAID';
  } else {
    effectiveStatus = 'PENDING';
  }

  let agingBucket: PartnerAgingBucket;
  if (!isOverdue) {
    agingBucket = 'CURRENT';
  } else if (daysOverdue <= 30) {
    agingBucket = 'DAYS_1_30';
  } else if (daysOverdue <= 60) {
    agingBucket = 'DAYS_31_60';
  } else {
    agingBucket = 'DAYS_60_PLUS';
  }

  return {
    commitment,
    committedAmount: committed,
    paidAmount: paid,
    unpaidBalance: unpaid,
    daysOverdue,
    effectiveStatus,
    agingBucket,
    isOverdue,
    isDueSoon
  };
}

/**
 * Calculates portfolio-wide aging report across all partner commitments.
 */
export function calculatePartnerAgingReport(
  commitments: ERPPartnerCommitment[] = [],
  asOfDateStr?: string
): PartnerAgingSummary {
  const asOf = asOfDateStr || new Date().toISOString().split('T')[0];

  let totalCommitted = D(0);
  let totalPaid = D(0);
  let totalOutstanding = D(0);
  let totalOverdue = D(0);
  let openCommitmentsCount = 0;
  let overdueCommitmentsCount = 0;

  let currentAmount = D(0);
  let currentCount = 0;
  let d1_30Amount = D(0);
  let d1_30Count = 0;
  let d31_60Amount = D(0);
  let d31_60Count = 0;
  let d60PlusAmount = D(0);
  let d60PlusCount = 0;

  const byPartner: PartnerAgingSummary['byPartner'] = {};
  const byProperty: PartnerAgingSummary['byProperty'] = {};
  const evaluatedCommitments: EvaluatedPartnerCommitment[] = [];

  for (const c of commitments) {
    const evaluated = evaluatePartnerCommitment(c, asOf);
    evaluatedCommitments.push(evaluated);

    if (evaluated.effectiveStatus === 'CANCELLED') {
      continue;
    }

    totalCommitted = totalCommitted.plus(evaluated.committedAmount);
    totalPaid = totalPaid.plus(evaluated.paidAmount);
    totalOutstanding = totalOutstanding.plus(evaluated.unpaidBalance);

    if (!evaluated.unpaidBalance.isZero()) {
      openCommitmentsCount++;
    }

    if (evaluated.isOverdue) {
      overdueCommitmentsCount++;
      totalOverdue = totalOverdue.plus(evaluated.unpaidBalance);
    }

    // Aging Buckets
    switch (evaluated.agingBucket) {
      case 'CURRENT':
        currentAmount = currentAmount.plus(evaluated.unpaidBalance);
        currentCount++;
        break;
      case 'DAYS_1_30':
        d1_30Amount = d1_30Amount.plus(evaluated.unpaidBalance);
        d1_30Count++;
        break;
      case 'DAYS_31_60':
        d31_60Amount = d31_60Amount.plus(evaluated.unpaidBalance);
        d31_60Count++;
        break;
      case 'DAYS_60_PLUS':
        d60PlusAmount = d60PlusAmount.plus(evaluated.unpaidBalance);
        d60PlusCount++;
        break;
    }

    // Aggregate by Partner
    const pName = c.partner_name;
    if (!byPartner[pName]) {
      byPartner[pName] = {
        partnerName: pName,
        totalCommitted: D(0),
        totalPaid: D(0),
        totalOutstanding: D(0),
        totalOverdue: D(0),
        overdueCount: 0,
        commitments: []
      };
    }
    byPartner[pName].totalCommitted = byPartner[pName].totalCommitted.plus(evaluated.committedAmount);
    byPartner[pName].totalPaid = byPartner[pName].totalPaid.plus(evaluated.paidAmount);
    byPartner[pName].totalOutstanding = byPartner[pName].totalOutstanding.plus(evaluated.unpaidBalance);
    if (evaluated.isOverdue) {
      byPartner[pName].totalOverdue = byPartner[pName].totalOverdue.plus(evaluated.unpaidBalance);
      byPartner[pName].overdueCount++;
    }
    byPartner[pName].commitments.push(evaluated);

    // Aggregate by Property
    const propId = c.property_id;
    if (!byProperty[propId]) {
      byProperty[propId] = {
        propertyId: propId,
        totalCommitted: D(0),
        totalPaid: D(0),
        totalOutstanding: D(0),
        totalOverdue: D(0),
        overdueCount: 0,
        commitments: []
      };
    }
    byProperty[propId].totalCommitted = byProperty[propId].totalCommitted.plus(evaluated.committedAmount);
    byProperty[propId].totalPaid = byProperty[propId].totalPaid.plus(evaluated.paidAmount);
    byProperty[propId].totalOutstanding = byProperty[propId].totalOutstanding.plus(evaluated.unpaidBalance);
    if (evaluated.isOverdue) {
      byProperty[propId].totalOverdue = byProperty[propId].totalOverdue.plus(evaluated.unpaidBalance);
      byProperty[propId].overdueCount++;
    }
    byProperty[propId].commitments.push(evaluated);
  }

  // Sort evaluated commitments: OVERDUE first (descending daysOverdue), then PENDING (ascending due_date)
  evaluatedCommitments.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    if (a.isOverdue && b.isOverdue) return b.daysOverdue - a.daysOverdue;
    return new Date(a.commitment.due_date).getTime() - new Date(b.commitment.due_date).getTime();
  });

  return {
    asOfDate: asOf,
    totalCommitmentsCount: commitments.length,
    openCommitmentsCount,
    overdueCommitmentsCount,
    totalCommitted,
    totalPaid,
    totalOutstanding,
    totalOverdue,
    totalCommittedFormatted: totalCommitted.toFixed(2),
    totalPaidFormatted: totalPaid.toFixed(2),
    totalOutstandingFormatted: totalOutstanding.toFixed(2),
    totalOverdueFormatted: totalOverdue.toFixed(2),
    agingBuckets: {
      current: {
        bucket: 'CURRENT',
        labelAr: 'جارية (غير مستحقة بعد)',
        labelEn: 'Current (Not Due)',
        count: currentCount,
        totalAmount: currentAmount,
        totalAmountFormatted: currentAmount.toFixed(2)
      },
      days1_30: {
        bucket: 'DAYS_1_30',
        labelAr: 'متأخرات 1-30 يوم',
        labelEn: '1-30 Days Overdue',
        count: d1_30Count,
        totalAmount: d1_30Amount,
        totalAmountFormatted: d1_30Amount.toFixed(2)
      },
      days31_60: {
        bucket: 'DAYS_31_60',
        labelAr: 'متأخرات 31-60 يوم',
        labelEn: '31-60 Days Overdue',
        count: d31_60Count,
        totalAmount: d31_60Amount,
        totalAmountFormatted: d31_60Amount.toFixed(2)
      },
      days60Plus: {
        bucket: 'DAYS_60_PLUS',
        labelAr: 'متأخرات أكثر من 60 يوماً',
        labelEn: '60+ Days Overdue',
        count: d60PlusCount,
        totalAmount: d60PlusAmount,
        totalAmountFormatted: d60PlusAmount.toFixed(2)
      }
    },
    byPartner,
    byProperty,
    evaluatedCommitments
  };
}
