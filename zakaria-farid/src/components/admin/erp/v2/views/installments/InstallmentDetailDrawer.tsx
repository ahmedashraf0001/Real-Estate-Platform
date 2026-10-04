'use client';

import React, { useState } from 'react';
import { 
  Wallet, 
  Printer, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  Layers, 
  ShieldCheck, 
  CreditCard,
  Send,
  Loader2,
  Calendar,
  FileCheck
} from 'lucide-react';
import { ProjectedVaultItem, getDistinctiveUnit } from '@/lib/erp/installmentsVaultProjection';
import { ERPPDCRecord } from '@/lib/erp/types';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { D } from '@/lib/erp/math';
import { ZFModalShell } from '../../common/ZFModalShell';
import styles from '../../ZFWorkstationShell.module.css';

interface InstallmentDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: ProjectedVaultItem | null;
  isAr?: boolean;
  isMutating?: boolean;
  onCollect: (item: ProjectedVaultItem) => void;
  onStatusChange?: (chequeId: string, newStatus: 'In Safe' | 'Deposited' | 'Cleared' | 'Bounced') => Promise<void>;
  onBounce?: (pdc: ERPPDCRecord) => Promise<void> | void;
  onPrintReceipt: (item: ProjectedVaultItem) => void;
  onPrintDueNotice: (item: ProjectedVaultItem) => void;
}

export const InstallmentDetailDrawer: React.FC<InstallmentDetailDrawerProps> = ({
  isOpen,
  onClose,
  item,
  isAr = true,
  isMutating = false,
  onCollect,
  onStatusChange,
  onBounce,
  onPrintReceipt,
  onPrintDueNotice
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  if (!item) return null;

  const isCleared = item.status === 'cleared';
  const isDeposited = item.status === 'deposited';
  const isOverdue = item.status === 'overdue';
  const isBounced = item.status === 'bounced';
  const hasCheque = Boolean(item.chequeId);

  const getStatusBadge = () => {
    switch (item.status) {
      case 'cleared':
        return (
          <span className={`${styles.statusPill} ${styles.statusPillGreen}`}>
            <CheckCircle2 size={12} />
            <span>{isAr ? 'تم التحصيل والتسوية' : 'Settled & Cleared'}</span>
          </span>
        );
      case 'deposited':
        return (
          <span className={`${styles.statusPill} ${styles.statusPillBlue}`}>
            <Send size={12} />
            <span>{isAr ? 'مودع برسم التحصيل البنكي' : 'In Bank Clearing'}</span>
          </span>
        );
      case 'overdue':
        return (
          <span className={`${styles.statusPill} ${styles.statusPillRed}`}>
            <AlertCircle size={12} />
            <span>{isAr ? 'متأخرات واجبة التحصيل' : 'Critical Overdue'}</span>
          </span>
        );
      case 'due_today':
        return (
          <span className={`${styles.statusPill} ${styles.statusPillAmber}`}>
            <Clock size={12} />
            <span>{isAr ? 'مستحق السداد اليوم' : 'Due Today'}</span>
          </span>
        );
      case 'bounced':
        return (
          <span className={`${styles.statusPill} ${styles.statusPillRed}`}>
            <RotateCcw size={12} />
            <span>{isAr ? 'مرتد / متعثر بنكياً' : 'Bounced / Defaulted'}</span>
          </span>
        );
      default:
        return (
          <span className={`${styles.statusPill} ${styles.statusPillNeutral}`}>
            <Calendar size={12} />
            <span>{isAr ? 'مجدول في الخزينة' : 'Scheduled in Safe'}</span>
          </span>
        );
    }
  };

  const handleDepositAction = async () => {
    if (!item.chequeId || !onStatusChange) return;
    setActionLoading('deposit');
    try {
      await onStatusChange(item.chequeId, 'Deposited');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearAction = async () => {
    if (!item.chequeId || !onStatusChange) return;
    setActionLoading('clear');
    try {
      await onStatusChange(item.chequeId, 'Cleared');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBounceAction = async () => {
    const pdcEquivalent: ERPPDCRecord = item.linkedCheque || {
      cheque_id: item.chequeId || item.id,
      contract_id: item.contractId,
      schedule_id: item.scheduleId,
      cheque_number: item.instrumentNumber,
      bank_name: item.bankName,
      drawer_name: item.buyerName,
      nominal_value: item.nominalValue,
      due_date: item.dueDate,
      status: item.status === 'deposited' ? 'Deposited' : (item.rawPdcStatus || 'In Safe')
    };

    if (onBounce) {
      setActionLoading('bounce');
      try {
        await onBounce(pdcEquivalent);
      } finally {
        setActionLoading(null);
      }
    } else if (item.chequeId && onStatusChange) {
      setActionLoading('bounce');
      try {
        await onStatusChange(item.chequeId, 'Bounced');
      } finally {
        setActionLoading(null);
      }
    }
  };

  // Debit Account Label (Clean Human Domain Terminology - Zero Raw Bracketed Numbers)
  const getDebitLabel = () => {
    if (isCleared) {
      return isAr ? 'الخزينة النقدية الرئيسية (كاش / إنستاباي - 101000)' : 'Cash Safe & InstaPay Treasury (101000)';
    }
    return isAr ? 'أقساط الخزينة المستحقة التعاقدية' : 'Contractual Safe Dues Receivable';
  };

  // Credit Account Label (Clean Human Domain Terminology - Zero Raw Bracketed Numbers)
  const getCreditLabel = () => {
    if (isCleared) {
      return isAr ? 'أقساط العملاء التعاقدية (تسوية المستحق)' : 'Contractual Receivables (Settled)';
    }
    return isAr ? 'إيراد تعاقدي مؤجل للوحدة' : 'Deferred Unit Contract Revenue';
  };

  const distinctiveUnit = getDistinctiveUnit(item.projectTitle, item.unitId);
  const locationSubtitle = distinctiveUnit ? `${item.projectTitle} • ${distinctiveUnit}` : item.projectTitle;

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={item.buyerName}
      subtitle={`${locationSubtitle} • ${isAr ? 'عقد #' : 'Contract #'}${item.contractNumber}`}
      icon={<CreditCard size={17} />}
      headerExtra={getStatusBadge()}
      maxWidth="580px"
      isAr={isAr}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Truthful Document Print Trigger */}
            {isCleared ? (
              <button
                type="button"
                onClick={() => onPrintReceipt(item)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Printer size={13} color="var(--erp-accent, #2563eb)" />
                <span>{isAr ? 'طباعة سند القبض' : 'Print Receipt'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onPrintDueNotice(item)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileCheck size={13} color="var(--erp-accent, #2563eb)" />
                <span>{isAr ? 'طباعة إشعار استحقاق' : 'Print Due Notice'}</span>
              </button>
            )}

            {/* Single Primary Action in Footer */}
            {!isCleared && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCollect(item);
                }}
                disabled={isMutating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.5rem 1.15rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--erp-accent, #2563eb)',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Wallet size={14} />
                <span>{isAr ? 'تحصيل المستحق (كاش / إنستاباي)' : 'Collect Dues (Cash / InstaPay)'}</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
        {/* 1. FINANCIAL SUMMARY HERO */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'block' }}>
                {isCleared 
                  ? (isAr ? 'المبلغ المحصل والمسدد بالكامل:' : 'Settled Amount:') 
                  : (isAr ? 'المبلغ المطلوب سداده:' : 'Outstanding Amount Due:')}
              </span>
              <div style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: isCleared ? '#16a34a' : isOverdue ? '#dc2626' : '#0f172a',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
                marginTop: '0.15rem',
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.35rem'
              }}>
                <span>{D(isCleared ? item.amountPaid : (D(item.remainingAmount).gt(0) ? item.remainingAmount : item.nominalValue)).formatEGP(isAr)}</span>
              </div>
            </div>

            <div style={{ textAlign: isAr ? 'left' : 'right' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>
                {isAr ? 'القيمة الإجمالية للقسط:' : 'Nominal Face Value:'}
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {D(item.nominalValue).formatEGP(isAr)}
              </span>
            </div>
          </div>

          <div style={{
            fontSize: '0.78rem',
            color: '#475569',
            fontWeight: 600,
            borderTop: '1px solid #e2e8f0',
            paddingTop: '0.5rem',
            marginTop: '0.2rem'
          }}>
            {isAr ? `فقط وقدره: ${tafqeetEGP(item.nominalValue)} لا غير` : tafqeetEGP(item.nominalValue)}
          </div>
        </div>

        {/* 2. MATURITY & INSTRUMENT DETAILS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.75rem',
          padding: '0.25rem 0'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
              {isAr ? 'تاريخ الاستحقاق التعاقدي' : 'Due Date'}
            </span>
            <span style={{
              fontSize: '0.88rem',
              fontWeight: 700,
              color: isOverdue ? '#dc2626' : '#0f172a',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {item.dueDate}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
              {isAr ? 'نوع القسط / السند' : 'Tranche / Type'}
            </span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--erp-accent, #2563eb)' }}>
              {item.description}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
              {isAr ? 'رقم سند الاستحقاق' : 'Note #'}
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              #{item.instrumentNumber}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
              {isAr ? 'طريقة وقناة السداد' : 'Payment Method'}
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
              {item.bankName || (isAr ? 'كاش بالخزينة أو إنستاباي' : 'Cash Safe or InstaPay')}
            </span>
          </div>

          {item.depositedDate && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                {isAr ? 'تاريخ الإيداع بالبنك' : 'Deposited Date'}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--erp-accent)', fontVariantNumeric: 'tabular-nums' }}>
                {item.depositedDate}
              </span>
            </div>
          )}

          {item.clearedDate && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                {isAr ? 'تاريخ التحصيل والتسوية' : 'Settled Date'}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                {item.clearedDate}
              </span>
            </div>
          )}
        </div>

        {/* 3. LINKED CONTRACT & ASSET DOSSIER */}
        {item.linkedContract && (
          <div style={{
            borderTop: '1px solid #f1f5f9',
            paddingTop: '0.75rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{isAr ? 'رقم العقد' : 'Contract #'}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--erp-accent, #2563eb)' }}>#{item.linkedContract.contract_number}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{isAr ? 'الوحدة والمشروع' : 'Unit & Project'}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{item.projectTitle} • {item.unitId}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{isAr ? 'إجمالي قيمة العقد' : 'Gross Contract Value'}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {D(item.linkedContract.gross_contract_value).formatEGP(isAr)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{isAr ? 'إجمالي المحصل بالعقد' : 'Total Collected'}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                {D(item.linkedContract.total_cash_collected || '0').formatEGP(isAr)}
              </span>
            </div>
          </div>
        )}

        {/* 4. BALANCED DOUBLE-ENTRY GL POSTING (Zero Raw Bracketed Numbers) */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={14} color="var(--erp-accent, #2563eb)" />
              <span>{isAr ? 'التوجيه المحاسبي المعتمد' : 'Balanced GL Posting'}</span>
            </span>
            <span style={{
              fontSize: '0.66rem',
              fontWeight: 700,
              padding: '0.1rem 0.45rem',
              borderRadius: '4px',
              background: 'var(--erp-accent-subtle)',
              color: 'var(--erp-accent, #2563eb)'
            }}>
              {isAr ? 'قيد يومية متزن 100%' : 'Balanced Entry'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.74rem', paddingTop: '0.15rem' }}>
            <div>
              <span style={{ color: '#64748b', fontWeight: 600, display: 'block', fontSize: '0.68rem' }}>{isAr ? 'الطرف المدين (Dr):' : 'Debit Account (Dr):'}</span>
              <span style={{ color: '#0f172a', fontWeight: 700, marginTop: '0.1rem', display: 'block' }}>
                {getDebitLabel()}
              </span>
            </div>
            <div>
              <span style={{ color: '#64748b', fontWeight: 600, display: 'block', fontSize: '0.68rem' }}>{isAr ? 'الطرف الدائن (Cr):' : 'Credit Account (Cr):'}</span>
              <span style={{ color: '#0f172a', fontWeight: 700, marginTop: '0.1rem', display: 'block' }}>
                {getCreditLabel()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ZFModalShell>
  );
};
