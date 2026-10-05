'use client';

import React from 'react';
import { 
  Wallet, 
  Printer, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  CreditCard,
  Send,
  Calendar,
  FileCheck
} from 'lucide-react';
import { ProjectedVaultItem, getDistinctiveUnit } from '@/lib/erp/installmentsVaultProjection';
import { ERPPDCRecord } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { ZFModalShell } from '../../common/ZFModalShell';
import { ZFFacts, ZFJournalPeek, ZFFormFooter, zfForm } from '../../common/ZFForm';
import shellStyles from '../../ZFWorkstationShell.module.css';

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
  onPrintReceipt,
  onPrintDueNotice
}) => {
  if (!item) return null;

  const isCleared = item.status === 'cleared';
  const isOverdue = item.status === 'overdue';

  const getStatusBadge = () => {
    switch (item.status) {
      case 'cleared':
        return (
          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillGreen}`}>
            <CheckCircle2 size={12} />
            <span>{isAr ? 'تم التحصيل والتسوية' : 'Settled & Cleared'}</span>
          </span>
        );
      case 'deposited':
        return (
          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillBlue}`}>
            <Send size={12} />
            <span>{isAr ? 'مودع برسم التحصيل البنكي' : 'In Bank Clearing'}</span>
          </span>
        );
      case 'overdue':
        return (
          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillRed}`}>
            <AlertCircle size={12} />
            <span>{isAr ? 'متأخرات واجبة التحصيل' : 'Critical Overdue'}</span>
          </span>
        );
      case 'due_today':
        return (
          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillAmber}`}>
            <Clock size={12} />
            <span>{isAr ? 'مستحق السداد اليوم' : 'Due Today'}</span>
          </span>
        );
      case 'bounced':
        return (
          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillRed}`}>
            <RotateCcw size={12} />
            <span>{isAr ? 'مرتد / متعثر بنكياً' : 'Bounced / Defaulted'}</span>
          </span>
        );
      default:
        return (
          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`}>
            <Calendar size={12} />
            <span>{isAr ? 'مجدول في الخزينة' : 'Scheduled in Safe'}</span>
          </span>
        );
    }
  };

  const getDebitLabel = () => {
    if (isCleared) {
      return isAr ? 'الخزينة النقدية الرئيسية (كاش / إنستاباي - 101000)' : 'Cash Safe & InstaPay Treasury (101000)';
    }
    return isAr ? 'أقساط الخزينة المستحقة التعاقدية (103000)' : 'Contractual Safe Dues Receivable (103000)';
  };

  const getCreditLabel = () => {
    if (isCleared) {
      return isAr ? 'أقساط العملاء التعاقدية (103000)' : 'Contractual Receivables (103000)';
    }
    return isAr ? 'إيراد تعاقدي مؤجل للوحدة (202000)' : 'Deferred Unit Contract Revenue (202000)';
  };

  const distinctiveUnit = getDistinctiveUnit(item.projectTitle, item.unitId);
  const locationSubtitle = distinctiveUnit ? `${item.projectTitle} • ${distinctiveUnit}` : item.projectTitle;

  const dueAmount = isCleared
    ? item.amountPaid
    : (D(item.remainingAmount).gt(0) ? item.remainingAmount : item.nominalValue);

  const footer = (
    <ZFFormFooter>
      <button
        type="button"
        className={shellStyles.btnSecondary}
        onClick={onClose}
      >
        {isAr ? 'إغلاق' : 'Close'}
      </button>

      {isCleared ? (
        <button
          type="button"
          className={shellStyles.btnSecondary}
          onClick={() => onPrintReceipt(item)}
        >
          <Printer size={13} />
          <span>{isAr ? 'طباعة سند القبض' : 'Print Receipt'}</span>
        </button>
      ) : (
        <button
          type="button"
          className={shellStyles.btnSecondary}
          onClick={() => onPrintDueNotice(item)}
        >
          <FileCheck size={13} />
          <span>{isAr ? 'طباعة إشعار استحقاق' : 'Print Due Notice'}</span>
        </button>
      )}

      {!isCleared && (
        <button
          type="button"
          className={shellStyles.btnPrimary}
          onClick={() => {
            onClose();
            onCollect(item);
          }}
          disabled={isMutating}
        >
          <Wallet size={14} />
          <span>{isAr ? 'تحصيل المستحق' : 'Collect Dues'}</span>
        </button>
      )}
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'تفاصيل القسط' : 'Installment Details'}
      subtitle={`${item.buyerName} • ${locationSubtitle} • ${isAr ? 'عقد #' : 'Contract #'}${item.contractNumber}`}
      icon={<CreditCard size={17} />}
      headerExtra={getStatusBadge()}
      maxWidth="640px"
      isAr={isAr}
      footer={footer}
    >
      <div className={zfForm.form}>
        {/* 1. FINANCIAL SUMMARY */}
        <div className={zfForm.section}>
          <h4 className={zfForm.sectionTitle}>{isAr ? 'الموقف المالي للقسط' : 'Installment Financial Status'}</h4>
          <ZFFacts
            items={[
              {
                label: isCleared 
                  ? (isAr ? 'المبلغ المحصل والمسدد' : 'Settled Amount') 
                  : (isAr ? 'المبلغ المطلوب سداده' : 'Outstanding Amount Due'),
                value: `${Number(dueAmount).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`,
                tone: isCleared ? 'pos' : isOverdue ? 'neg' : undefined,
              },
              {
                label: isAr ? 'القيمة الإجمالية للقسط' : 'Nominal Face Value',
                value: `${Number(item.nominalValue).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`
              },
              {
                label: isAr ? 'تاريخ الاستحقاق' : 'Due Date',
                value: item.dueDate,
                tone: isOverdue ? 'neg' : undefined
              },
              {
                label: isAr ? 'النوع والسند' : 'Type & Note',
                value: `${item.description} #${item.instrumentNumber}`
              }
            ]}
          />
        </div>

        {/* 2. PAYMENT DETAILS */}
        <div className={zfForm.section}>
          <h4 className={zfForm.sectionTitle}>{isAr ? 'بيانات السداد' : 'Payment Details'}</h4>
          <ZFFacts
            items={[
              {
                label: isAr ? 'طريقة وقناة السداد' : 'Payment Method',
                value: item.bankName || (isAr ? 'كاش بالخزينة أو إنستاباي' : 'Cash Safe or InstaPay')
              },
              ...(item.depositedDate ? [{
                label: isAr ? 'تاريخ الإيداع بالبنك' : 'Deposited Date',
                value: item.depositedDate
              }] : []),
              ...(item.clearedDate ? [{
                label: isAr ? 'تاريخ التحصيل والتسوية' : 'Settled Date',
                value: item.clearedDate,
                tone: 'pos' as const
              }] : [])
            ]}
          />
        </div>

        {/* 3. LINKED CONTRACT & ASSET DOSSIER */}
        {item.linkedContract && (
          <div className={zfForm.section}>
            <h4 className={zfForm.sectionTitle}>{isAr ? 'بيانات العقد والوحدة' : 'Contract & Unit'}</h4>
            <ZFFacts
              items={[
                {
                  label: isAr ? 'رقم العقد' : 'Contract #',
                  value: `#${item.linkedContract.contract_number}`
                },
                {
                  label: isAr ? 'الوحدة والمشروع' : 'Unit & Project',
                  value: `${item.projectTitle} • ${item.unitId}`
                },
                {
                  label: isAr ? 'إجمالي قيمة العقد' : 'Gross Contract Value',
                  value: `${Number(item.linkedContract.gross_contract_value).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`
                },
                {
                  label: isAr ? 'إجمالي المحصل بالعقد' : 'Total Collected',
                  value: `${Number(item.linkedContract.total_cash_collected || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`,
                  tone: 'pos'
                }
              ]}
            />
          </div>
        )}

        {/* 4. BALANCED DOUBLE-ENTRY GL POSTING */}
        <div className={zfForm.section}>
          <h4 className={zfForm.sectionTitle}>{isAr ? 'التوجيه المحاسبي' : 'Accounting Posting'}</h4>
          <ZFJournalPeek
            isAr={isAr}
            lines={[
              {
                code: isCleared ? '101000' : '103000',
                name: getDebitLabel(),
                debit: Number(item.nominalValue)
              },
              {
                code: isCleared ? '103000' : '202000',
                name: getCreditLabel(),
                credit: Number(item.nominalValue)
              }
            ]}
          />
        </div>
      </div>
    </ZFModalShell>
  );
};
