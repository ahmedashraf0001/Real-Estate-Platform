'use client';

import React from 'react';
import { 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Clock, 
  GitBranch, 
  CircleSlash, 
  AlertTriangle, 
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import styles from './StatusBadge.module.css';

export type BadgeDomain = 'period' | 'installment' | 'cheque' | 'approval' | 'unit' | 'contract';

interface StatusBadgeProps {
  domain: BadgeDomain;
  status: string;
  isAr?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ domain, status, isAr = false }) => {
  const norm = status.trim();

  let styleClass = styles.statePending;
  let IconComponent = Clock;
  let label = norm;

  switch (domain) {
    case 'period':
      if (norm === 'OPEN') {
        styleClass = styles.stateOpen;
        IconComponent = Unlock;
        label = isAr ? 'مفتوحة' : 'OPEN';
      } else if (norm === 'LOCKED') {
        styleClass = styles.stateLocked;
        IconComponent = Lock;
        label = isAr ? 'مقفلة' : 'LOCKED';
      } else if (norm === 'CLOSED') {
        styleClass = styles.stateLocked;
        IconComponent = Lock;
        label = isAr ? 'مغلقة نهائياً' : 'CLOSED';
      }
      break;

    case 'installment':
      if (norm === 'Paid') {
        styleClass = styles.statePaid;
        IconComponent = CheckCircle2;
        label = isAr ? 'مسدد' : 'Paid';
      } else if (norm === 'Pending') {
        styleClass = styles.statePending;
        IconComponent = Clock;
        label = isAr ? 'قيد التحصيل' : 'Pending';
      } else if (norm === 'Partially Paid') {
        styleClass = styles.statePartial;
        IconComponent = Clock;
        label = isAr ? 'سداد جزئي' : 'Partially Paid';
      } else if (norm === 'Defaulted') {
        styleClass = styles.stateDefaulted;
        IconComponent = AlertTriangle;
        label = isAr ? 'متعثر (Defaulted)' : 'Defaulted';
      } else if (norm === 'SUPERSEDED') {
        styleClass = styles.stateSuperseded;
        IconComponent = GitBranch;
        label = isAr ? 'مستبدل (SUPERSEDED)' : 'SUPERSEDED';
      } else if (norm === 'Void') {
        styleClass = styles.stateVoid;
        IconComponent = CircleSlash;
        label = isAr ? 'لاغٍ (Void)' : 'Void';
      }
      break;

    case 'cheque':
      if (norm === 'In Safe') {
        styleClass = styles.stateOpen;
        IconComponent = ShieldCheck;
        label = isAr ? 'في الخزينة' : 'In Safe';
      } else if (norm === 'Deposited') {
        styleClass = styles.statePending;
        IconComponent = Clock;
        label = isAr ? 'مودع بالبنك' : 'Deposited';
      } else if (norm === 'Cleared') {
        styleClass = styles.statePaid;
        IconComponent = CheckCircle2;
        label = isAr ? 'تم الصرف' : 'Cleared';
      } else if (norm === 'Bounced') {
        styleClass = styles.stateDefaulted;
        IconComponent = AlertTriangle;
        label = isAr ? 'مرتد (مرفوض)' : 'Bounced';
      } else if (norm === 'Void') {
        styleClass = styles.stateVoid;
        IconComponent = CircleSlash;
        label = isAr ? 'لاغٍ' : 'Void';
      }
      break;

    case 'approval':
      if (norm === 'Approved') {
        styleClass = styles.statePaid;
        IconComponent = CheckCircle2;
        label = isAr ? 'معتمد' : 'Approved';
      } else if (norm === 'Pending') {
        styleClass = styles.statePending;
        IconComponent = Clock;
        label = isAr ? 'بانتظار الاعتماد' : 'Pending Approval';
      } else if (norm === 'Rejected') {
        styleClass = styles.stateDefaulted;
        IconComponent = AlertTriangle;
        label = isAr ? 'مرفوض' : 'Rejected';
      }
      break;

    case 'contract':
      if (norm === 'Active') {
        styleClass = styles.statePaid;
        IconComponent = CheckCircle2;
        label = isAr ? 'سارٍ' : 'Active';
      } else if (norm === 'Rescinded') {
        styleClass = styles.stateDefaulted;
        IconComponent = RotateCcw;
        label = isAr ? 'مفسوخ' : 'Rescinded';
      } else if (norm === 'Completed') {
        styleClass = styles.statePaid;
        IconComponent = CheckCircle2;
        label = isAr ? 'مكتمل' : 'Completed';
      }
      break;

    case 'unit':
      if (norm === 'Delivered') {
        styleClass = styles.statePaid;
        IconComponent = CheckCircle2;
        label = isAr ? 'تم التسليم' : 'Delivered';
      } else if (norm === 'Pending') {
        styleClass = styles.stateOpen;
        IconComponent = Clock;
        label = isAr ? 'قيد الإنشاء' : 'Under Construction';
      } else if (norm === 'Available') {
        styleClass = styles.stateOpen;
        IconComponent = CheckCircle2;
        label = isAr ? 'متاح للبيع' : 'Available';
      } else if (norm === 'Reserved') {
        styleClass = styles.statePending;
        IconComponent = Clock;
        label = isAr ? 'محجوز' : 'Reserved';
      } else if (norm === 'Sold') {
        styleClass = styles.statePaid;
        IconComponent = CheckCircle2;
        label = isAr ? 'مباع' : 'Sold';
      } else {
        styleClass = styles.statePartial;
        IconComponent = RotateCcw;
        label = norm;
      }
      break;
  }

  return (
    <span className={`${styles.badge} ${styleClass}`}>
      <IconComponent size={12} strokeWidth={2.5} />
      <span>{label}</span>
    </span>
  );
};
