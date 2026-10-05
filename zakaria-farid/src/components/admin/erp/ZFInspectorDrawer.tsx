'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Landmark, 
  RotateCcw, 
  BookOpen, 
  TrendingUp, 
  CheckCircle2, 
  Calendar, 
  CreditCard, 
  Building, 
  Copy, 
  Check, 
  ShieldCheck, 
  Calculator, 
  Plus, 
  Printer, 
  Coins, 
  PieChart,
  Layers
} from 'lucide-react';
import { 
  ERPContract, 
  ERPInstallmentSchedule, 
  ERPContractAmendment, 
  ERPPDCRecord, 
  ERPRescissionRecord, 
  ERPJournalEntry, 
  ERPTaxRecord, 
  ERPCostAllocation 
} from '@/lib/erp/types';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import { D, Decimal } from '@/lib/erp/math';
import { localizeBuyerName, localizeJournalDescription } from '@/components/erp/JournalEntryPreview';
import { RSVEngine } from '@/lib/erp/rsv';
import { ZFModalShell } from './v2/common/ZFModalShell';
import styles from './v2/ZFWorkstationShell.module.css';
import dStyles from './ZFInspectorDrawer.module.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRecord = any;

export type InspectorPayload = 
  | { 
      type: 'contract'; 
      contract: ERPContract; 
      schedules: ERPInstallmentSchedule[]; 
      amendments?: ERPContractAmendment[]; 
      latestJournalEntry?: ERPJournalEntry;
      allJournalEntries?: ERPJournalEntry[];
    }
  | { 
      type: 'cheque'; 
      cheque: ERPPDCRecord;
      linkedContract?: ERPContract;
      linkedSchedule?: ERPInstallmentSchedule;
      clearingJournalEntry?: ERPJournalEntry;
    }
  | {
      type: 'tax';
      tax: ERPTaxRecord;
      linkedContract?: ERPContract;
      remittanceJournalEntry?: ERPJournalEntry;
    }
  | {
      type: 'rsv';
      allocation: ERPCostAllocation;
      linkedContracts?: ERPContract[];
    }
  | { type: 'rescission'; rescission: ERPRescissionRecord }
  | { 
      type: 'journal'; 
      entry?: ERPJournalEntry | LooseRecord; 
      journalEntry?: ERPJournalEntry | LooseRecord;
      amount?: string;
      title?: string;
      party?: string;
    };

export interface ZFInspectorDrawerProps {
  payload: InspectorPayload | null;
  onClose: () => void;
  isAr?: boolean;
  onPayInstallment?: (contract: ERPContract, schedule: ERPInstallmentSchedule) => void;
  onOpenEscalation?: (contract: ERPContract) => void;
  onOpenRescission?: (contract: ERPContract) => void;
  onOpenSupplement?: (contract: ERPContract) => void;
  onNavigateToTab?: (tab: string) => void;
  onToggleHandover?: (contract: ERPContract) => void;
  onOpenHandoverModal?: (contract: ERPContract) => void;
  onUpdateChequeStatus?: (chequeId: string, newStatus: 'In Safe' | 'Deposited' | 'Cleared' | 'Bounced') => void;
  onInspectContract?: (contract: ERPContract) => void;
  onRemitTax?: (taxId: string) => void;
  isMutating?: boolean;
  isOverModal?: boolean;
}

export type ZFInspectorModalProps = ZFInspectorDrawerProps;

function formatEgp(val: string | number | Decimal | undefined | null, isAr: boolean): string {
  if (val === undefined || val === null) return `0.00 ${isAr ? 'ج.م' : 'EGP'}`;
  const d = val instanceof Decimal ? val : D(val);
  const parts = d.abs().toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${d.isNegative() ? '-' : ''}${integerPart}.${parts[1]} ${isAr ? 'ج.م' : 'EGP'}`;
}

export const ZFInspectorDrawer: React.FC<ZFInspectorDrawerProps> = ({
  payload,
  onClose,
  isAr = true,
  onPayInstallment,
  onOpenEscalation,
  onOpenRescission,
  onOpenSupplement,
  onNavigateToTab,
  onToggleHandover,
  onOpenHandoverModal,
  onUpdateChequeStatus,
  onInspectContract,
  onRemitTax,
  isMutating = false,
  isOverModal = false
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [simulatedUnitValue, setSimulatedUnitValue] = useState<string>('5000000');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!payload) return null;

  const handleCopy = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ---------------------------------------------------------------------------
  // 1. CONTRACT INSPECTION
  // ---------------------------------------------------------------------------
  if (payload.type === 'contract') {
    const contract = payload.contract;
    const grossValue = D(contract.gross_contract_value || '0');
    const cashCollected = D(contract.total_cash_collected || '0');
    const remainingAR = Decimal.max(0, grossValue.minus(cashCollected));
    const activeSchedules = (payload.schedules || [])
      .filter(s => s.status !== 'SUPERSEDED' && s.status !== 'Void')
      .sort((a, b) => a.tranche_number - b.tranche_number || a.due_date.localeCompare(b.due_date));
    const pendingSchedules = activeSchedules.filter(s => s.status !== 'Paid');
    const nextPending = pendingSchedules[0];
    const isFullyCollected = grossValue.gt(0) && cashCollected.gte(grossValue);
    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = pendingSchedules.some(s => s.status === 'Defaulted' || s.due_date < todayStr);

    const statusPillClass = contract.status === 'Rescinded' 
      ? styles.statusPillNeutral 
      : isFullyCollected 
        ? styles.statusPillGreen 
        : isOverdue 
          ? styles.statusPillRed 
          : styles.statusPillBlue;

    const statusPillText = contract.status === 'Rescinded'
      ? (isAr ? 'عقد مفسوخ' : 'Rescinded')
      : isFullyCollected
        ? (isAr ? 'مكتمل السداد' : 'Paid in Full')
        : isOverdue
          ? (isAr ? 'متأخرات سداد' : 'Overdue')
          : (isAr ? 'سارٍ ومنتظم' : 'Active');

    const progressPct = grossValue.gt(0) 
      ? Math.min(100, cashCollected.div(grossValue).times(100).toNumber()).toFixed(1)
      : '0.0';

    const handoverDate = contract.handover_date || '—';

    return (
      <ZFModalShell
        isOpen={Boolean(payload)}
        onClose={onClose}
        isAr={isAr}
        maxWidth="850px"
        maxHeight="90vh"
        zIndex={isOverModal ? 10001 : 1000}
        icon={<FileText size={18} />}
        title={isAr ? 'فحص وتدقيق العقد المالي' : 'Contract Audit Inspection'}
        subtitle={isAr ? 'منظومة التدقيق والرقابة المالية FIN-OS' : 'FIN-OS Financial Audit & Verification'}
        footer={
          <div className={styles.inspectActionFooter}>
            <div className={styles.inspectActionGroup}>
              {contract.status === 'Active' && nextPending && onPayInstallment && (
                <button
                  type="button"
                  className={styles.inspectBtnPrimary}
                  onClick={() => onPayInstallment(contract, nextPending)}
                  disabled={isMutating}
                >
                  <CreditCard size={14} />
                  <span>
                    {isAr 
                      ? `تحصيل ${nextPending.tranche_number === 0 ? 'المقدم' : `القسط #${nextPending.tranche_number}`} (${formatEgp(nextPending.nominal_value, isAr)})` 
                      : `Collect Due (${formatEgp(nextPending.nominal_value, isAr)})`}
                  </span>
                </button>
              )}

              {contract.status === 'Rescinded' && onNavigateToTab && (
                <button
                  type="button"
                  className={styles.inspectBtnPrimary}
                  onClick={() => {
                    onClose();
                    onNavigateToTab('rescissions');
                  }}
                >
                  <RotateCcw size={14} />
                  <span>{isAr ? 'الانتقال إلى سجل فسخ العقود' : 'Go to Rescissions'}</span>
                </button>
              )}

              {contract.status === 'Active' && onOpenEscalation && (
                <button
                  type="button"
                  className={styles.inspectBtnSecondary}
                  onClick={() => onOpenEscalation(contract)}
                  disabled={isMutating}
                >
                  <TrendingUp size={14} color="var(--erp-accent)" />
                  <span>{isAr ? 'طلب زيادة سعر' : 'Escalation'}</span>
                </button>
              )}

              {contract.status === 'Active' && onOpenRescission && (
                <button
                  type="button"
                  className={styles.inspectBtnDanger}
                  onClick={() => onOpenRescission(contract)}
                  disabled={isMutating}
                >
                  <RotateCcw size={14} />
                  <span>{isAr ? 'فسخ العقد' : 'Rescind'}</span>
                </button>
              )}

              {contract.status === 'Active' && onOpenSupplement && (
                <button
                  type="button"
                  className={styles.inspectBtnSecondary}
                  onClick={() => onOpenSupplement(contract)}
                  disabled={isMutating}
                >
                  <Plus size={14} />
                  <span>{isAr ? 'إضافة ملحق' : 'Supplement'}</span>
                </button>
              )}

              <button
                type="button"
                className={styles.inspectBtnSecondary}
                onClick={() => typeof window !== 'undefined' && window.print()}
              >
                <Printer size={14} />
                <span>{isAr ? 'طباعة كشف الحساب' : 'Print Statement'}</span>
              </button>
            </div>

            <button type="button" className={styles.inspectBtnSecondary} onClick={onClose}>
              <span>{isAr ? 'إغلاق الفاحص' : 'Close'}</span>
            </button>
          </div>
        }
      >
        <div className={styles.inspectModalShell}>
          {/* Tier 1: Top Identity Ribbon */}
          <div className={styles.inspectIdentityRibbon}>
            <div className={styles.inspectIdentityLeft}>
              <div className={styles.inspectSquircleIcon}>
                <FileText size={16} />
              </div>
              <span className={styles.inspectCodeBadge}>
                #{contract.contract_number}
              </span>
              <button
                type="button"
                className={styles.inspectCopyBtn}
                onClick={() => handleCopy(contract.contract_number)}
                title={isAr ? 'نسخ رقم العقد' : 'Copy contract number'}
              >
                {copiedCode === contract.contract_number ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                <span>{copiedCode === contract.contract_number ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
              </button>
              <span className={styles.inspectIdentityTitle}>
                {localizeBuyerName(contract.buyer_name)} • {contract.unit_id}
              </span>
            </div>
            <div className={styles.inspectIdentityRight}>
              <span className={`${styles.statusPill} ${statusPillClass}`}>
                {statusPillText}
              </span>
            </div>
          </div>

          {/* Tier 2: Executive 4-Metric Strip */}
          <div className={styles.inspectMetricsGrid}>
            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'إجمالي قيمة التعاقد' : 'Total Contract Value'}
              </span>
              <span className={styles.inspectMetricValue}>
                {formatEgp(grossValue, isAr)}
              </span>
              <span className={styles.inspectMetricSub}>
                {isAr ? 'القيمة الإجمالية بالعقد' : 'Gross nominal price'}
              </span>
            </div>

            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'المحصل نقداً بالخزينة' : 'Total Cash Collected'}
              </span>
              <span className={`${styles.inspectMetricValue} ${dStyles.textGreen}`}>
                {formatEgp(cashCollected, isAr)}
              </span>
              <span className={styles.inspectMetricSub}>
                {progressPct}% {isAr ? 'نسبة التحصيل' : 'collected'}
              </span>
            </div>

            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'المتبقي كأقساط مجدولة' : 'Remaining Receivables'}
              </span>
              <span className={`${styles.inspectMetricValue} ${isFullyCollected ? dStyles.textGreen : dStyles.textAmber}`}>
                {formatEgp(remainingAR, isAr)}
              </span>
              <span className={styles.inspectMetricSub}>
                {pendingSchedules.length} {isAr ? 'أقساط متبقية' : 'tranches left'}
              </span>
            </div>

            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'موعد التسليم المقرر' : 'Handover Date'}
              </span>
              <span className={styles.inspectMetricValue}>
                {handoverDate}
              </span>
              <span className={styles.inspectMetricSub}>
                {nextPending 
                  ? (isAr ? `الاستحقاق القادم: ${nextPending.due_date}` : `Next due: ${nextPending.due_date}`)
                  : (contract.handover_status === 'Delivered' 
                    ? (isAr ? 'تم الاستلام الفعلي ✓' : 'Delivered') 
                    : (isAr ? 'قيد التنفيذ والتشطيب' : 'Pending Handover'))}
              </span>
            </div>
          </div>

          {/* Tier 3: 2-Column Body */}
          <div className={styles.inspectBodyColumns}>
            {/* Right Column: Core Specifications & Audit Metadata */}
            <div className={styles.inspectColumn}>
              <div className={styles.inspectColHeader}>
                <span className={styles.inspectColTitle}>
                  <Building size={15} />
                  <span>{isAr ? 'بيانات التعاقد والوحدة' : 'Contract & Unit Specifications'}</span>
                </span>
              </div>

              <div className={styles.inspectFactsList}>
                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'الوحدة والعقار' : 'Unit ID'}</span>
                  <span className={styles.inspectFactVal}>{contract.unit_id}</span>
                </div>

                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'مركز التكلفة / المشروع' : 'Project / Cost Center'}</span>
                  <span className={styles.inspectFactVal}>
                    {contract.property_id || (contract.unit_id.includes('-') ? contract.unit_id.split('-')[0] : 'المشروع الرئيسي')}
                  </span>
                </div>

                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'هاتف العميل' : 'Phone'}</span>
                  <span className={styles.inspectFactVal} dir="ltr">{contract.buyer_phone || '—'}</span>
                </div>

                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'نظام السداد' : 'Payment Plan'}</span>
                  <span className={styles.inspectFactVal}>
                    {contract.payment_plan_type === 'FULL_CASH' 
                      ? (isAr ? 'سداد نقدي كامل' : 'Full Cash') 
                      : (isAr ? 'أقساط مجدولة' : 'Installments')}
                  </span>
                </div>

                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'تاريخ التوقيع' : 'Signed Date'}</span>
                  <span className={styles.inspectFactVal}>{contract.contract_date}</span>
                </div>

                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'حالة الاستلام' : 'Handover Status'}</span>
                  <span className={styles.inspectFactVal}>
                    {contract.handover_status === 'Delivered' 
                      ? (isAr ? 'تم التسليم' : 'Delivered') 
                      : (isAr ? 'لم يسلم بعد' : 'Pending')}
                  </span>
                </div>

                <div className={styles.inspectFactItemWide}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'العملة وسعر الصرف' : 'Currency & Exchange'}</span>
                  <span className={styles.inspectFactVal}>
                    {contract.currency || 'EGP'} ({contract.exchange_rate || '1.0000'})
                  </span>
                </div>

                {contract.status === 'Active' && (onOpenHandoverModal || onToggleHandover) && (
                  <div className={`${styles.inspectFactItemWide} ${dStyles.factItemMargin}`}>
                    <button
                      type="button"
                      onClick={() => {
                        if (contract.handover_status === 'Pending' && onOpenHandoverModal) {
                          onOpenHandoverModal(contract);
                        } else if (onToggleHandover) {
                          onToggleHandover(contract);
                        }
                      }}
                      disabled={isMutating}
                      className={`${styles.inspectBtnSecondary} ${dStyles.btnFullWidth}`}
                    >
                      <RotateCcw size={13} />
                      <span>
                        {contract.handover_status === 'Delivered' 
                          ? (isAr ? 'تعديل محضر الاستلام' : 'Modify Handover') 
                          : (isAr ? 'تسجيل محضر استلام الشقة للعميل' : 'Record Handover')}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Left Column: Interactive Schedules / Tranches */}
            <div className={styles.inspectColumn}>
              <div className={styles.inspectColHeader}>
                <span className={styles.inspectColTitle}>
                  <Calendar size={15} />
                  <span>{isAr ? 'جدول الأقساط والتحصيل' : 'Installment Schedule'}</span>
                </span>
                <span className={dStyles.colHeaderExtra}>
                  {activeSchedules.length} {isAr ? 'دفعة مسجلة' : 'tranches'}
                </span>
              </div>

              <div className={styles.inspectInstallmentsList}>
                {activeSchedules.map(sch => {
                  const isPaid = sch.status === 'Paid';
                  const isSchOverdue = !isPaid && (sch.status === 'Defaulted' || sch.due_date < todayStr);
                  const trancheTitle = sch.tranche_number === 0 
                    ? (isAr ? 'دفعة مقدم الحجز' : 'Down Payment') 
                    : (isAr ? `قسط #${sch.tranche_number}` : `Tranche #${sch.tranche_number}`);

                  return (
                    <div key={sch.schedule_id} className={styles.inspectInstallmentCard}>
                      <div className={dStyles.itemCardStack}>
                        <div className={dStyles.wipPoolLeft}>
                          <strong className={dStyles.textDark}>{trancheTitle}</strong>
                          <span className={`${styles.statusPill} ${isPaid ? styles.statusPillGreen : isSchOverdue ? styles.statusPillRed : styles.statusPillAmber} ${dStyles.pillSm}`}>
                            {isPaid ? (isAr ? 'مدفوع' : 'Paid') : isSchOverdue ? (isAr ? 'متأخر' : 'Overdue') : (isAr ? 'مستحق' : 'Due')}
                          </span>
                        </div>
                        <span className={dStyles.itemCardSub}>
                          {isAr ? 'استحقاق: ' : 'Due: '} {sch.due_date}
                        </span>
                      </div>

                      <div className={dStyles.itemCardActions}>
                        <span className={dStyles.wipPoolAmount}>
                          {formatEgp(sch.nominal_value, isAr)}
                        </span>
                        {!isPaid && onPayInstallment && (
                          <button
                            type="button"
                            className={styles.inspectInlineBtn}
                            onClick={() => onPayInstallment(contract, sch)}
                            disabled={isMutating}
                            title={isAr ? 'تحصيل هذا القسط' : 'Collect tranche'}
                          >
                            <Coins size={12} />
                            <span>{isAr ? 'تحصيل' : 'Collect'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </ZFModalShell>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. CHEQUE INSPECTION
  // ---------------------------------------------------------------------------
  if (payload.type === 'cheque') {
    const cheque = payload.cheque;
    const isCleared = cheque.status === 'Cleared';
    const isDeposited = cheque.status === 'Deposited';
    const isBounced = cheque.status === 'Bounced';
    const todayStr = new Date().toISOString().split('T')[0];
    const isPastDue = !isCleared && cheque.due_date < todayStr;
    const bankName = cheque.bank_name || ((cheque as LooseRecord).drawee_bank as string | undefined) || (isAr ? 'البنك التجاري' : 'Commercial Bank');
    const depositDate = cheque.deposited_date || ((cheque as LooseRecord).deposit_date as string | undefined) || '—';

    const statusPillClass = isCleared 
      ? styles.statusPillGreen 
      : isDeposited 
        ? styles.statusPillBlue 
        : isBounced 
          ? styles.statusPillRed 
          : styles.statusPillAmber;

    const statusPillText = isCleared
      ? (isAr ? 'تم التحصيل بالخزينة (101000)' : 'Cleared in 101000')
      : isDeposited
        ? (isAr ? 'مودع برسم التحصيل البنكي' : 'Deposited at Bank')
        : isBounced
          ? (isAr ? 'شيك مرتد' : 'Bounced')
          : (isAr ? 'في عهدة الخزينة' : 'In Safe Custody');

    return (
      <ZFModalShell
        isOpen={Boolean(payload)}
        onClose={onClose}
        isAr={isAr}
        maxWidth="850px"
        maxHeight="90vh"
        zIndex={isOverModal ? 10001 : 1000}
        icon={<Landmark size={18} />}
        title={isAr ? 'فحص شيك وسند استحقاق' : 'Cheque & PDC Inspection'}
        subtitle={isAr ? 'منظومة مقاصة الشيكات البنكية وحساب 105000' : 'PDC Clearing & Account 105000 Workflow'}
        footer={
          <div className={styles.inspectActionFooter}>
            <div className={styles.inspectActionGroup}>
              {cheque.status === 'In Safe' && onUpdateChequeStatus && (
                <button
                  type="button"
                  className={styles.inspectBtnPrimary}
                  onClick={() => onUpdateChequeStatus(cheque.cheque_id, 'Deposited')}
                  disabled={isMutating}
                >
                  <Landmark size={14} />
                  <span>{isAr ? 'إيداع برسم التحصيل البنكي' : 'Deposit at Bank'}</span>
                </button>
              )}

              {cheque.status === 'Deposited' && onUpdateChequeStatus && (
                <button
                  type="button"
                  className={styles.inspectBtnPrimary}
                  onClick={() => onUpdateChequeStatus(cheque.cheque_id, 'Cleared')}
                  disabled={isMutating}
                >
                  <CheckCircle2 size={14} />
                  <span>{isAr ? 'تأكيد الصرف والتحصيل البنكي' : 'Confirm Bank Clearance'}</span>
                </button>
              )}

              {!isCleared && onUpdateChequeStatus && (
                <button
                  type="button"
                  className={styles.inspectBtnSecondary}
                  onClick={() => onUpdateChequeStatus(cheque.cheque_id, 'Cleared')}
                  disabled={isMutating}
                >
                  <Coins size={14} />
                  <span>{isAr ? 'تسجيل تحصيل فوري بالخزينة (كاش / إنستاباي)' : 'Mark Cleared to Safe'}</span>
                </button>
              )}

              {cheque.status === 'Deposited' && onUpdateChequeStatus && (
                <button
                  type="button"
                  className={styles.inspectBtnDanger}
                  onClick={() => onUpdateChequeStatus(cheque.cheque_id, 'Bounced')}
                  disabled={isMutating}
                >
                  <RotateCcw size={14} />
                  <span>{isAr ? 'إثبات ارتداد الشيك' : 'Record Bounce'}</span>
                </button>
              )}

              {payload.linkedContract && onInspectContract && (
                <button
                  type="button"
                  className={styles.inspectBtnSecondary}
                  onClick={() => onInspectContract(payload.linkedContract!)}
                >
                  <FileText size={14} color="var(--erp-accent)" />
                  <span>{isAr ? 'فتح ملف العقد' : 'View Contract'}</span>
                </button>
              )}

              <button
                type="button"
                className={styles.inspectBtnSecondary}
                onClick={() => typeof window !== 'undefined' && window.print()}
              >
                <Printer size={14} />
                <span>{isAr ? 'طباعة إيصال الشيك' : 'Print Receipt'}</span>
              </button>
            </div>

            <button type="button" className={styles.inspectBtnSecondary} onClick={onClose}>
              <span>{isAr ? 'إغلاق الفاحص' : 'Close'}</span>
            </button>
          </div>
        }
      >
        <div className={styles.inspectModalShell}>
          {/* Tier 1: Top Identity Ribbon */}
          <div className={styles.inspectIdentityRibbon}>
            <div className={styles.inspectIdentityLeft}>
              <div className={styles.inspectSquircleIcon}>
                <Landmark size={16} />
              </div>
              <span className={styles.inspectCodeBadge}>
                #{cheque.cheque_number}
              </span>
              <button
                type="button"
                className={styles.inspectCopyBtn}
                onClick={() => handleCopy(cheque.cheque_number)}
                title={isAr ? 'نسخ رقم الشيك' : 'Copy cheque number'}
              >
                {copiedCode === cheque.cheque_number ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                <span>{copiedCode === cheque.cheque_number ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
              </button>
              <span className={styles.inspectIdentityTitle}>
                {cheque.drawer_name} • {bankName}
              </span>
            </div>
            <div className={styles.inspectIdentityRight}>
              <span className={`${styles.statusPill} ${statusPillClass}`}>
                {statusPillText}
              </span>
            </div>
          </div>

          {/* Tier 2: Executive 4-Metric Strip */}
          <div className={styles.inspectMetricsGrid}>
            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'القيمة الاسمية للشيك' : 'Nominal Cheque Value'}
              </span>
              <span className={styles.inspectMetricValue}>
                {formatEgp(cheque.nominal_value, isAr)}
              </span>
              <span className={styles.inspectMetricSub}>
                {isAr ? 'المبلغ المستحق السداد' : 'Full face value'}
              </span>
            </div>

            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'المبلغ المحصل فعلياً' : 'Collected Amount'}
              </span>
              <span className={`${styles.inspectMetricValue} ${isCleared ? dStyles.textGreen : dStyles.textMuted}`}>
                {formatEgp(isCleared ? cheque.nominal_value : '0.00', isAr)}
              </span>
              <span className={styles.inspectMetricSub}>
                {isCleared ? (isAr ? 'مقيد بالخزينة (101000)' : 'Credited to 101000') : (isAr ? 'معلق قيد التحصيل' : 'Pending clearing')}
              </span>
            </div>

            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'الرصيد المعلق' : 'Outstanding Balance'}
              </span>
              <span className={`${styles.inspectMetricValue} ${isCleared ? dStyles.textGreen : dStyles.textAmber}`}>
                {formatEgp(isCleared ? '0.00' : cheque.nominal_value, isAr)}
              </span>
              <span className={styles.inspectMetricSub}>
                {isCleared ? (isAr ? 'مسدد بالكامل ✓' : 'Zero balance') : (isAr ? 'مستحق السداد' : 'Outstanding')}
              </span>
            </div>

            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'تاريخ الاستحقاق' : 'Maturity Due Date'}
              </span>
              <span className={styles.inspectMetricValue}>
                {cheque.due_date}
              </span>
              <span className={styles.inspectMetricSub}>
                {isPastDue ? (isAr ? 'استحقاق منقضٍ' : 'Past due date') : (isAr ? 'استحقاق مجدول' : 'Scheduled date')}
              </span>
            </div>
          </div>

          {/* Tier 3: 2-Column Body */}
          <div className={styles.inspectBodyColumns}>
            {/* Right Column: Core Specifications & Audit Metadata */}
            <div className={styles.inspectColumn}>
              <div className={styles.inspectColHeader}>
                <span className={styles.inspectColTitle}>
                  <Landmark size={15} />
                  <span>{isAr ? 'بيانات الشيك والساحب' : 'Cheque & Drawer Details'}</span>
                </span>
              </div>

              <div className={styles.inspectFactsList}>
                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'البنك المسحوب عليه' : 'Drawee Bank'}</span>
                  <span className={styles.inspectFactVal}>{bankName}</span>
                </div>

                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'فرع البنك / رقم الحساب' : 'Branch / Account'}</span>
                  <span className={styles.inspectFactVal}>{((cheque as LooseRecord).bank_branch as string | undefined) || (isAr ? 'الفرع الرئيسي' : 'Main Branch')}</span>
                </div>

                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'تاريخ استلام الشيك' : 'Received Date'}</span>
                  <span className={styles.inspectFactVal}>{(cheque as { received_date?: string }).received_date || '—'}</span>
                </div>

                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'تاريخ الإيداع بالبنك' : 'Deposit Date'}</span>
                  <span className={styles.inspectFactVal}>{depositDate}</span>
                </div>

                <div className={styles.inspectFactItemWide}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'حساب التوجيه المحاسبي' : 'Routing Account'}</span>
                  <span className={styles.inspectFactVal}>
                    {isCleared ? '101000 - الخزينة الرئيسية / 102000 الحساب البنكي' : '105000 - أوراق القبض (Notes Receivable)'}
                  </span>
                </div>

                <div className={styles.inspectFactItemWide}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'البيان والغرض' : 'Memo / Purpose'}</span>
                  <span className={styles.inspectFactVal}>
                    {((cheque as LooseRecord).notes as string | undefined) || ((cheque as LooseRecord).memo as string | undefined) || (isAr ? 'سند تحصيل قسط تعاقد معتمد' : 'Contract installment payment instrument')}
                  </span>
                </div>

                {payload.linkedContract && (
                  <div className={styles.inspectFactItemWide}>
                    <span className={styles.inspectFactLabel}>{isAr ? 'العقد والوحدة المرتبطة' : 'Linked Contract'}</span>
                    <div className={dStyles.rowBetweenMargin}>
                      <span className={styles.inspectFactVal}>
                        #{payload.linkedContract.contract_number} ({payload.linkedContract.unit_id})
                      </span>
                      {onInspectContract && (
                        <button
                          type="button"
                          className={styles.inspectBtnSecondary}
                          onClick={() => onInspectContract(payload.linkedContract!)}
                          
                        >
                          {isAr ? 'فتح العقد' : 'View'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Left Column: Settlement Lifecycle & Accounting Ledger */}
            <div className={styles.inspectColumn}>
              <div className={styles.inspectColHeader}>
                <span className={styles.inspectColTitle}>
                  <CheckCircle2 size={15} />
                  <span>{isAr ? 'مسار التحصيل والقيد المحاسبي' : 'Clearing Workflow & Ledger'}</span>
                </span>
                <span className={dStyles.colHeaderExtra}>
                  حساب 101000
                </span>
              </div>

              <div className={dStyles.stackTight}>
                {/* Visual Lifecycle Stepper */}
                <div className={dStyles.stepperRow}>
                  <div className={dStyles.stepNode}>
                    <span className={`${dStyles.stepPoint} ${dStyles.stepPointActive}`} />
                    <span className={`${dStyles.stepLabel} ${dStyles.stepLabelMuted}`}>{isAr ? 'في الخزينة' : 'In Safe'}</span>
                  </div>
                  <div className={`${dStyles.stepConnector} ${isDeposited || isCleared ? dStyles.stepConnectorActive : dStyles.stepConnectorInactive}`} />
                  <div className={dStyles.stepNode}>
                    <span className={`${dStyles.stepPoint} ${isDeposited || isCleared ? dStyles.stepPointActive : dStyles.stepPointInactive}`} />
                    <span className={`${dStyles.stepLabel} ${dStyles.stepLabelMuted}`}>{isAr ? 'مودع بالبنك' : 'Deposited'}</span>
                  </div>
                  <div className={`${dStyles.stepConnector} ${isCleared ? dStyles.stepConnectorSuccess : dStyles.stepConnectorInactive}`} />
                  <div className={dStyles.stepNode}>
                    <span className={`${dStyles.stepPoint} ${isCleared ? dStyles.stepPointSuccess : isBounced ? dStyles.stepPointDanger : dStyles.stepPointInactive}`} />
                    <span className={`${dStyles.stepLabel} ${isCleared ? dStyles.stepLabelSuccess : isBounced ? dStyles.stepLabelDanger : dStyles.stepLabelMuted}`}>
                      {isCleared ? (isAr ? 'تم الصرف ✓' : 'Cleared') : isBounced ? (isAr ? 'مرتد ✗' : 'Bounced') : (isAr ? 'المقاصة' : 'Settlement')}
                    </span>
                  </div>
                </div>

                <div className={dStyles.infoCard}>
                  <div className={dStyles.infoCardTitle}>
                    {isAr ? 'الأثر المحاسبي المعتمد (Double-Entry Ledger)' : 'Accounting Impact'}
                  </div>
                  <div className={dStyles.infoCardRow}>
                    <span>Dr 101000 الخزينة الموحدة / 102000 البنك التجاري</span>
                    <strong>{formatEgp(cheque.nominal_value, isAr)}</strong>
                  </div>
                  <div className={dStyles.infoCardRowMuted}>
                    <span>Cr 105000 أوراق القبض (Notes Receivable)</span>
                    <strong>{formatEgp(cheque.nominal_value, isAr)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ZFModalShell>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. TAX INSPECTION
  // ---------------------------------------------------------------------------
  if (payload.type === 'tax') {
    const tax = payload.tax;
    const isRemitted = tax.remittance_status === 'Remitted to ETA';
    const ratePct = (Number(tax.tax_rate) * 100).toFixed(1);
    const dueDate = ((tax as LooseRecord).due_date as string | undefined) || tax.created_at?.split('T')[0] || '—';
    const remittedAt = (tax as LooseRecord).remitted_at as string | undefined;
    const taxPeriod = ((tax as LooseRecord).tax_period as string | undefined) || '2026';
    const remittanceRef = ((tax as LooseRecord).remittance_reference as string | undefined) || (remittedAt ? `ETA-${tax.tax_id.slice(0, 6)}` : '—');

    return (
      <ZFModalShell
        isOpen={Boolean(payload)}
        onClose={onClose}
        isAr={isAr}
        maxWidth="850px"
        maxHeight="90vh"
        zIndex={isOverModal ? 10001 : 1000}
        icon={<ShieldCheck size={18} />}
        title={isAr ? 'فحص السجل الضريبي والتوريد' : 'Tax Record Inspection'}
        subtitle={isAr ? 'الامتثال الضريبي والتوريد لمصلحة الضرائب المصرية' : 'Egyptian Tax Authority (ETA) Statutory Compliance'}
        footer={
          <div className={styles.inspectActionFooter}>
            <div className={styles.inspectActionGroup}>
              {!isRemitted && onRemitTax && (
                <button
                  type="button"
                  className={styles.inspectBtnPrimary}
                  onClick={() => onRemitTax(tax.tax_id)}
                  disabled={isMutating}
                >
                  <Landmark size={14} />
                  <span>{isAr ? 'سداد وتوريد للمصلحة (ETA)' : 'Remit to ETA'}</span>
                </button>
              )}

              {isRemitted && (
                <span className={`${styles.statusPill} ${styles.statusPillGreen}`}>
                  <CheckCircle2 size={13} />
                  <span>{isAr ? 'تم السداد والتوريد للمصلحة' : 'Remitted to ETA'}</span>
                </span>
              )}

              {payload.linkedContract && onInspectContract && (
                <button
                  type="button"
                  className={styles.inspectBtnSecondary}
                  onClick={() => onInspectContract(payload.linkedContract!)}
                >
                  <FileText size={14} color="var(--erp-accent)" />
                  <span>{isAr ? 'فتح ملف العقد' : 'View Contract'}</span>
                </button>
              )}

              <button
                type="button"
                className={styles.inspectBtnSecondary}
                onClick={() => typeof window !== 'undefined' && window.print()}
              >
                <Printer size={14} />
                <span>{isAr ? 'طباعة إشعار التوريد' : 'Print Tax Notice'}</span>
              </button>
            </div>

            <button type="button" className={styles.inspectBtnSecondary} onClick={onClose}>
              <span>{isAr ? 'إغلاق الفاحص' : 'Close'}</span>
            </button>
          </div>
        }
      >
        <div className={styles.inspectModalShell}>
          {/* Tier 1: Top Identity Ribbon */}
          <div className={styles.inspectIdentityRibbon}>
            <div className={styles.inspectIdentityLeft}>
              <div className={`${styles.inspectSquircleIcon} ${dStyles.squircleGreen}`}>
                <ShieldCheck size={16} />
              </div>
              <span className={styles.inspectCodeBadge}>
                #{tax.tax_id.slice(0, 10)}
              </span>
              <button
                type="button"
                className={styles.inspectCopyBtn}
                onClick={() => handleCopy(tax.tax_id)}
                title={isAr ? 'نسخ كود السجل' : 'Copy tax ID'}
              >
                {copiedCode === tax.tax_id ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                <span>{copiedCode === tax.tax_id ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
              </button>
              <span className={styles.inspectIdentityTitle}>
                {isAr ? 'مصلحة الضرائب المصرية (ETA)' : 'Egyptian Tax Authority'} • {tax.tax_type}
              </span>
            </div>
            <div className={styles.inspectIdentityRight}>
              <span className={`${styles.statusPill} ${isRemitted ? styles.statusPillGreen : styles.statusPillAmber}`}>
                {isRemitted ? (isAr ? 'تم التوريد للمصلحة' : 'Remitted to ETA') : (isAr ? 'مستحق التوريد' : 'Pending Remittance')}
              </span>
            </div>
          </div>

          {/* Tier 2: Executive 4-Metric Strip */}
          <div className={styles.inspectMetricsGrid}>
            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'الوعاء الضريبي الخاضع' : 'Taxable Base Amount'}
              </span>
              <span className={styles.inspectMetricValue}>
                {formatEgp(tax.taxable_base, isAr)}
              </span>
              <span className={styles.inspectMetricSub}>
                {isAr ? 'أساس احتساب الضريبة' : 'Contract taxable base'}
              </span>
            </div>

            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'النسبة الضريبية المقررة' : 'Applicable Tax Rate'}
              </span>
              <span className={styles.inspectMetricValue}>
                {ratePct}%
              </span>
              <span className={styles.inspectMetricSub}>
                {isAr ? 'بموجب القانون الضريبي' : 'Egyptian tax code rate'}
              </span>
            </div>

            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'قيمة الضريبة المستحقة' : 'Tax Amount Due'}
              </span>
              <span className={`${styles.inspectMetricValue} ${isRemitted ? dStyles.textGreen : dStyles.textAmber}`}>
                {formatEgp(tax.tax_amount, isAr)}
              </span>
              <span className={styles.inspectMetricSub}>
                {isRemitted ? (isAr ? 'تم السداد بالكامل ✓' : 'Paid in full') : (isAr ? 'مستحق التوريد للمصلحة' : 'Due for remittance')}
              </span>
            </div>

            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'تاريخ الاستحقاق والتوريد' : 'Remittance Due Date'}
              </span>
              <span className={styles.inspectMetricValue}>
                {dueDate}
              </span>
              <span className={styles.inspectMetricSub}>
                {remittedAt 
                  ? (isAr ? `تاريخ التوريد: ${remittedAt.split('T')[0]}` : `Remitted: ${remittedAt.split('T')[0]}`) 
                  : (isAr ? 'خلال 30 يوماً من التعاقد' : 'Within 30 days')}
              </span>
            </div>
          </div>

          {/* Tier 3: 2-Column Body */}
          <div className={styles.inspectBodyColumns}>
            {/* Right Column: Specifications & Audit Metadata */}
            <div className={styles.inspectColumn}>
              <div className={styles.inspectColHeader}>
                <span className={styles.inspectColTitle}>
                  <ShieldCheck size={15} />
                  <span>{isAr ? 'بيانات التكليف الضريبي' : 'Tax Filing Specifications'}</span>
                </span>
              </div>

              <div className={styles.inspectFactsList}>
                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'الجهة المستحقة' : 'Authority'}</span>
                  <span className={styles.inspectFactVal}>{isAr ? 'مصلحة الضرائب المصرية' : 'Egyptian Tax Authority'}</span>
                </div>

                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'نوع الضريبة' : 'Tax Type'}</span>
                  <span className={styles.inspectFactVal}>{tax.tax_type}</span>
                </div>

                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'الفترة الضريبية' : 'Tax Period'}</span>
                  <span className={styles.inspectFactVal}>{taxPeriod}</span>
                </div>

                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'حالة التوريد' : 'Remittance Status'}</span>
                  <span className={styles.inspectFactVal}>{tax.remittance_status}</span>
                </div>

                <div className={styles.inspectFactItemWide}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'مرجع إشعار التوريد' : 'Remittance Ref'}</span>
                  <span className={styles.inspectFactVal}>
                    {remittanceRef}
                  </span>
                </div>

                {payload.linkedContract && (
                  <div className={styles.inspectFactItemWide}>
                    <span className={styles.inspectFactLabel}>{isAr ? 'العقد المرتبط' : 'Linked Contract'}</span>
                    <div className={dStyles.rowBetweenMargin}>
                      <span className={styles.inspectFactVal}>
                        #{payload.linkedContract.contract_number} ({payload.linkedContract.unit_id})
                      </span>
                      {onInspectContract && (
                        <button
                          type="button"
                          className={styles.inspectBtnSecondary}
                          onClick={() => onInspectContract(payload.linkedContract!)}
                          
                        >
                          {isAr ? 'فتح العقد' : 'View'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Left Column: Accounting Impact & Remittance Schedule */}
            <div className={styles.inspectColumn}>
              <div className={styles.inspectColHeader}>
                <span className={styles.inspectColTitle}>
                  <BookOpen size={15} />
                  <span>{isAr ? 'الأثر المالي وقيد التوريد' : 'Double-Entry Remittance Impact'}</span>
                </span>
                <span className={dStyles.colHeaderExtra}>
                  حساب 205000
                </span>
              </div>

              <div className={dStyles.stackTight}>
                <div className={dStyles.infoCard}>
                  <div className={dStyles.infoCardTitle}>
                    {isAr ? 'القيد المحاسبي المعتمد للتوريد' : 'Statutory Remittance Entry'}
                  </div>
                  <div className={dStyles.infoCardRow}>
                    <span>Dr 205000 مصلحة الضرائب - التزامات وخصم</span>
                    <strong>{formatEgp(tax.tax_amount, isAr)}</strong>
                  </div>
                  <div className={dStyles.infoCardRowMuted}>
                    <span>Cr 101000 الخزينة الموحدة / 102000 الحساب البنكي</span>
                    <strong>{formatEgp(tax.tax_amount, isAr)}</strong>
                  </div>
                </div>

                <div className={dStyles.infoCardHelp}>
                  {isAr 
                    ? 'يتم توريد الضريبة إلى مصلحة الضرائب المصرية بموجب إشعار الخصم والإضافة المعتمد وحساب رقم 205000.'
                    : 'Tax liabilities are remitted to the ETA under statutory withholding and remittance regulations via Account 205000.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ZFModalShell>
    );
  }

  // ---------------------------------------------------------------------------
  // 4. RSV ALLOCATION INSPECTION
  // ---------------------------------------------------------------------------
  if (payload.type === 'rsv') {
    const alloc = payload.allocation;
    const rsvFactorNum = Number(alloc.rsv_factor || '0');
    const rsvPct = (rsvFactorNum * 100).toFixed(2);
    const grossMarginPct = ((1 - rsvFactorNum) * 100).toFixed(2);
    const simVal = D(simulatedUnitValue || '0');
    const simCOGS = RSVEngine.computeUnitCOGS(simVal, alloc.rsv_factor || '0');
    const simProfit = simVal.minus(simCOGS);
    const totalWipD = D(alloc.total_incurred_wip || '0');

    // Canonical WIP Cost Breakdown Categories (§14.C.7)
    const wipCategories = [
      {
        nameAr: 'أعمال الهيكل والخرسانات',
        nameEn: 'Civil & Structural Works',
        ratio: 0.45,
        code: '150000-01'
      },
      {
        nameAr: 'أعمال التشطيبات والكهروميكانيك',
        nameEn: 'Finishing & MEP Engineering',
        ratio: 0.35,
        code: '150000-02'
      },
      {
        nameAr: 'توريدات مواد وخامات البناء',
        nameEn: 'Building Materials Procurement',
        ratio: 0.15,
        code: '150000-03'
      },
      {
        nameAr: 'التراخيص والإشراف الهندسي',
        nameEn: 'Supervision & Permits',
        ratio: 0.05,
        code: '150000-04'
      }
    ];

    const linkedContractsList = payload.linkedContracts || [];

    return (
      <ZFModalShell
        isOpen={Boolean(payload)}
        onClose={onClose}
        isAr={isAr}
        maxWidth="850px"
        maxHeight="90vh"
        zIndex={isOverModal ? 10001 : 1000}
        icon={<Calculator size={18} />}
        title={isAr ? 'فحص توزيع تكاليف المباني (RSV)' : 'Relative Sales Value Audit'}
        subtitle={isAr ? 'معيار IFRS 15 / معيار المحاسبة المصري 48 لاستنزال التكاليف' : 'IFRS 15 / EAS 48 Cost Allocation & Relief Standard'}
        footer={
          <div className={styles.inspectActionFooter}>
            <div className={styles.inspectActionGroup}>
              <button
                type="button"
                className={styles.inspectBtnPrimary}
                onClick={() => typeof window !== 'undefined' && window.print()}
              >
                <Printer size={14} />
                <span>{isAr ? 'طباعة مصفوفة توزيع التكاليف' : 'Print Allocation Matrix'}</span>
              </button>

              {onNavigateToTab && (
                <button
                  type="button"
                  className={styles.inspectBtnSecondary}
                  onClick={() => {
                    onClose();
                    onNavigateToTab('properties');
                  }}
                >
                  <Building size={14} />
                  <span>{isAr ? 'الانتقال إلى سجل المشاريع' : 'View Projects'}</span>
                </button>
              )}
            </div>

            <button type="button" className={styles.inspectBtnSecondary} onClick={onClose}>
              <span>{isAr ? 'إغلاق الفاحص' : 'Close'}</span>
            </button>
          </div>
        }
      >
        <div className={styles.inspectModalShell}>
          {/* Tier 1: Top Identity Ribbon */}
          <div className={styles.inspectIdentityRibbon}>
            <div className={styles.inspectIdentityLeft}>
              <div className={styles.inspectSquircleIcon}>
                <Calculator size={16} />
              </div>
              <span className={styles.inspectCodeBadge}>
                #{alloc.allocation_id.slice(0, 10)}
              </span>
              <button
                type="button"
                className={styles.inspectCopyBtn}
                onClick={() => handleCopy(alloc.allocation_id)}
                title={isAr ? 'نسخ كود التوزيع' : 'Copy allocation ID'}
              >
                {copiedCode === alloc.allocation_id ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                <span>{copiedCode === alloc.allocation_id ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
              </button>
              <span className={styles.inspectIdentityTitle}>
                {alloc.project_name} • {isAr ? 'توزيع تكاليف المباني (RSV)' : 'Relative Sales Value Model'}
              </span>
            </div>
            <div className={styles.inspectIdentityRight}>
              <span className={`${styles.statusPill} ${styles.statusPillGreen}`}>
                {isAr ? 'معتمد وموثق بدفتر اليومية' : 'Audited & Locked'}
              </span>
            </div>
          </div>

          {/* Tier 2: Executive 4-Metric Strip */}
          <div className={styles.inspectMetricsGrid}>
            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'إجمالي المبيعات التعاقدية' : 'Total Sales Value'}
              </span>
              <span className={styles.inspectMetricValue}>
                {formatEgp(alloc.total_sales_value, isAr)}
              </span>
              <span className={styles.inspectMetricSub}>
                {isAr ? 'مبيعات المشروع الإجمالية' : 'Total project revenue'}
              </span>
            </div>

            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'إجمالي تكاليف التنفيذ (WIP)' : 'Total Incurred WIP'}
              </span>
              <span className={styles.inspectMetricValue}>
                {formatEgp(alloc.total_incurred_wip, isAr)}
              </span>
              <span className={styles.inspectMetricSub}>
                {isAr ? 'تكاليف الإنشاءات المحملة' : 'Capitalized WIP'}
              </span>
            </div>

            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'معامل التكلفة (RSV Factor)' : 'RSV Cost Ratio'}
              </span>
              <span className={`${styles.inspectMetricValue} ${dStyles.textAccent}`}>
                {rsvPct}%
              </span>
              <span className={styles.inspectMetricSub}>
                {isAr ? 'نسبة تكلفة الوحدة من البيع' : 'Cost-to-sales ratio'}
              </span>
            </div>

            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'هامش الربح الإجمالي المتوقع' : 'Expected Gross Margin'}
              </span>
              <span className={`${styles.inspectMetricValue} ${dStyles.textGreen}`}>
                {grossMarginPct}%
              </span>
              <span className={styles.inspectMetricSub}>
                {isAr ? 'صافي هامش المشروع' : 'Net project margin'}
              </span>
            </div>
          </div>

          {/* Tier 3: 2-Column Body */}
          <div className={styles.inspectBodyColumns}>
            {/* Right Column: Core Specifications & Audit Metadata */}
            <div className={styles.inspectColumn}>
              <div className={styles.inspectColHeader}>
                <span className={styles.inspectColTitle}>
                  <Calculator size={15} />
                  <span>{isAr ? 'معايير التوزيع المحاسبي' : 'Allocation Methodology & Standards'}</span>
                </span>
              </div>

              <div className={styles.inspectFactsList}>
                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'المشروع' : 'Project'}</span>
                  <span className={styles.inspectFactVal}>{alloc.project_name}</span>
                </div>

                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'طريقة التوزيع' : 'Method'}</span>
                  <span className={styles.inspectFactVal}>Relative Sales Value (RSV)</span>
                </div>

                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'المعيار المحاسبي' : 'Standard'}</span>
                  <span className={styles.inspectFactVal}>EAS 48 / IFRS 15</span>
                </div>

                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'تاريخ الحساب' : 'Calculated At'}</span>
                  <span className={styles.inspectFactVal}>
                    {new Date(alloc.calculated_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                  </span>
                </div>

                <div className={styles.inspectFactItemWide}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'حساب تخفيض قيد التنفيذ' : 'Relieved WIP Account'}</span>
                  <span className={styles.inspectFactVal}>150000 Construction WIP (مشروعات تحت التنفيذ - أعمال ومواد بناء)</span>
                </div>

                <div className={styles.inspectFactItemWide}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'حساب تكلفة المبيعات' : 'Relieved COGS Account'}</span>
                  <span className={styles.inspectFactVal}>501000 Cost of Goods Sold (تكلفة مبيعات الوحدات المسلمة)</span>
                </div>

                <div className={styles.inspectFactItemWide}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'حساب الإيراد المحقق' : 'Realized Revenue Account'}</span>
                  <span className={styles.inspectFactVal}>401000 Realized Property Sales Revenue (إيرادات مبيعات عقارية محققة)</span>
                </div>
              </div>
            </div>

            {/* Left Column: WIP Cost Breakdown by Category & Absorption Allocation */}
            <div className={styles.inspectColumn}>
              <div className={styles.inspectColHeader}>
                <span className={styles.inspectColTitle}>
                  <PieChart size={15} />
                  <span>{isAr ? 'تصنيف تكاليف التنفيذ وامتصاص التكلفة' : 'WIP Breakdown & Absorption Allocation'}</span>
                </span>
                <span className={dStyles.colHeaderExtra}>
                  حـ/ 150000
                </span>
              </div>

              <div className={dStyles.stackTight}>
                {/* 1. WIP Cost Breakdown by Category */}
                <div>
                  <div className={dStyles.wipPoolTitle}>
                    {isAr ? 'توزيع بنود تكلفة التنفيذ (Capitalized WIP Breakdown):' : 'Capitalized WIP Cost Pools:'}
                  </div>
                  <div className={dStyles.wipPoolList}>
                    {wipCategories.map((cat, idx) => {
                      const catAmount = totalWipD.times(cat.ratio);
                      return (
                        <div key={idx} className={dStyles.wipPoolCard}>
                          <div className={dStyles.wipPoolLeft}>
                            <span className={dStyles.wipPoolDot} />
                            <span className={dStyles.wipPoolName}>{isAr ? cat.nameAr : cat.nameEn}</span>
                            <span className={dStyles.wipPoolRatio}>({cat.ratio * 100}%)</span>
                          </div>
                          <span className={dStyles.wipPoolAmount}>
                            {formatEgp(catAmount, isAr)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Absorption Allocation Unit Table (if linked contracts available) */}
                {linkedContractsList.length > 0 && (
                  <div>
                    <div className={dStyles.simRowHighlight}>
                      <Layers size={13} color="var(--erp-accent, #2563eb)" />
                      <span>{isAr ? 'امتصاص التكلفة للوحدات المربوطة:' : 'Absorption Allocation to Units:'}</span>
                    </div>
                    <div className={dStyles.wipScrollArea}>
                      <table className={dStyles.table}>
                        <thead>
                          <tr>
                            <th className={dStyles.th}>{isAr ? 'الوحدة' : 'Unit'}</th>
                            <th className={dStyles.thNum}>{isAr ? 'سعر البيع' : 'Sale Value'}</th>
                            <th className={dStyles.thNum}>{isAr ? 'التكلفة (COGS)' : 'Allocated COGS'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {linkedContractsList.map((c, idx) => {
                            const unitCOGS = RSVEngine.computeUnitCOGS(c.gross_contract_value, alloc.rsv_factor || '0');
                            return (
                              <tr key={c.contract_id || idx} className={dStyles.tr}>
                                <td className={dStyles.td}>{c.unit_id}</td>
                                <td className={dStyles.tdNum}>
                                  {formatEgp(c.gross_contract_value, isAr)}
                                </td>
                                <td className={`${dStyles.tdNum} ${dStyles.textAccent}`}>
                                  {formatEgp(unitCOGS, isAr)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. Unit Simulator */}
                <div className={dStyles.simStack}>
                  <label htmlFor="sim-unit-val" className={dStyles.simUnitValLabel}>
                    {isAr ? 'محاكي تكلفة وأرباح الوحدة المقترحة (ج.م):' : 'Unit Profitability Simulator (EGP):'}
                  </label>
                  <input
                    id="sim-unit-val"
                    type="number"
                    value={simulatedUnitValue}
                    onChange={(e) => setSimulatedUnitValue(e.target.value)}
                    className={dStyles.simInput}
                  />

                  <div className={dStyles.simBox}>
                    <div className={dStyles.simLine}>
                      <span>{isAr ? 'تكلفة الاستنزال المقدرة (Dr 501000 COGS):' : 'Relieved Cost (COGS):'}</span>
                      <strong className={dStyles.textDark}>{formatEgp(simCOGS, isAr)}</strong>
                    </div>
                    <div className={dStyles.simLineSuccess}>
                      <span>{isAr ? 'صافي هامش الربح المحقق:' : 'Derived Net Margin:'}</span>
                      <strong className={dStyles.textGreen}>{formatEgp(simProfit, isAr)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ZFModalShell>
    );
  }

  // ---------------------------------------------------------------------------
  // 5. RESCISSION INSPECTION
  // ---------------------------------------------------------------------------
  if (payload.type === 'rescission') {
    const resc = payload.rescission;
    const isBranch1 = resc.branch === 'Pre-Delivery';
    const unitId = ((resc as LooseRecord).unit_id as string | undefined) || resc.contract_id;
    const buyerName = ((resc as LooseRecord).buyer_name as string | undefined) || (isAr ? 'ملف تسوية فسخ تعاقد' : 'Contract Rescission');

    return (
      <ZFModalShell
        isOpen={Boolean(payload)}
        onClose={onClose}
        isAr={isAr}
        maxWidth="850px"
        maxHeight="90vh"
        zIndex={isOverModal ? 10001 : 1000}
        icon={<RotateCcw size={18} />}
        title={isAr ? 'فحص وتدقيق تسوية فسخ العقد' : 'Contract Rescission Audit'}
        subtitle={isAr ? 'تسوية فسخ تعاقد وحساب التزام الرد للعميل' : 'Contract Rescission & Customer Refund Liability Settlement'}
        footer={
          <div className={styles.inspectActionFooter}>
            <div className={styles.inspectActionGroup}>
              {onNavigateToTab && (
                <button
                  type="button"
                  className={styles.inspectBtnPrimary}
                  onClick={() => {
                    onClose();
                    onNavigateToTab('rescissions');
                  }}
                >
                  <RotateCcw size={14} />
                  <span>{isAr ? 'الانتقال إلى سجل فسخ العقود' : 'Go to Rescissions Registry'}</span>
                </button>
              )}

              <button
                type="button"
                className={styles.inspectBtnSecondary}
                onClick={() => typeof window !== 'undefined' && window.print()}
              >
                <Printer size={14} />
                <span>{isAr ? 'طباعة مخالصة الفسخ' : 'Print Rescission Settlement'}</span>
              </button>
            </div>

            <button type="button" className={styles.inspectBtnSecondary} onClick={onClose}>
              <span>{isAr ? 'إغلاق الفاحص' : 'Close'}</span>
            </button>
          </div>
        }
      >
        <div className={styles.inspectModalShell}>
          {/* Tier 1: Top Identity Ribbon */}
          <div className={styles.inspectIdentityRibbon}>
            <div className={styles.inspectIdentityLeft}>
              <div className={`${styles.inspectSquircleIcon} ${dStyles.squircleRed}`}>
                <RotateCcw size={16} />
              </div>
              <span className={styles.inspectCodeBadge}>
                #{resc.rescission_id.slice(0, 8)}
              </span>
              <button
                type="button"
                className={styles.inspectCopyBtn}
                onClick={() => handleCopy(resc.rescission_id)}
                title={isAr ? 'نسخ كود الفسخ' : 'Copy rescission ID'}
              >
                {copiedCode === resc.rescission_id ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                <span>{copiedCode === resc.rescission_id ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
              </button>
              <span className={styles.inspectIdentityTitle}>
                {buyerName} • {unitId}
              </span>
            </div>
            <div className={styles.inspectIdentityRight}>
              <span className={`${styles.statusPill} ${isBranch1 ? styles.statusPillAmber : styles.statusPillRed}`}>
                {isBranch1 ? (isAr ? 'فسخ قبل التسليم (مسار ١)' : 'Branch 1') : (isAr ? 'استرداد بعد التسليم (مسار ٢)' : 'Branch 2')}
              </span>
            </div>
          </div>

          {/* Tier 2: Executive 4-Metric Strip */}
          <div className={styles.inspectMetricsGrid}>
            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'إجمالي ثمن الشقة الأصلي بالعقد' : 'Original Gross Value'}
              </span>
              <span className={styles.inspectMetricValue}>
                {formatEgp(resc.gross_contract_value, isAr)}
              </span>
              <span className={styles.inspectMetricSub}>
                {isAr ? 'سعر التعاقد قبل الفسخ' : 'Original contract price'}
              </span>
            </div>

            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'إجمالي المحصل نقداً' : 'Total Cash Collected'}
              </span>
              <span className={styles.inspectMetricValue}>
                {formatEgp(resc.total_cash_collected, isAr)}
              </span>
              <span className={styles.inspectMetricSub}>
                {isAr ? 'مقبوضات سابقة بالخزينة' : 'Collected into safe'}
              </span>
            </div>

            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'الغرامة المحتجزة (10%)' : 'Retained Penalty (10%)'}
              </span>
              <span className={`${styles.inspectMetricValue} ${dStyles.textGreen}`}>
                {formatEgp(resc.penalty_retained, isAr)}
              </span>
              <span className={styles.inspectMetricSub}>
                {isAr ? 'أرباح تعويض فسخ (402000)' : 'Forfeiture income'}
              </span>
            </div>

            <div className={styles.inspectMetricCard}>
              <span className={styles.inspectMetricLabel}>
                {isAr ? 'صافي التزام الرد للعميل' : 'Net Refund Liability'}
              </span>
              <span className={`${styles.inspectMetricValue} ${dStyles.textRed}`}>
                {formatEgp(resc.net_refund_liability, isAr)}
              </span>
              <span className={styles.inspectMetricSub}>
                {isAr ? 'مستحق الصرف (حساب 206200)' : 'Customer refund liability'}
              </span>
            </div>
          </div>

          {/* Tier 3: 2-Column Body */}
          <div className={styles.inspectBodyColumns}>
            {/* Right Column: Specifications & Audit Metadata */}
            <div className={styles.inspectColumn}>
              <div className={styles.inspectColHeader}>
                <span className={styles.inspectColTitle}>
                  <RotateCcw size={15} />
                  <span>{isAr ? 'بيانات الفسخ والمسار المحاسبي' : 'Rescission Specifications & Branch'}</span>
                </span>
              </div>

              <div className={styles.inspectFactsList}>
                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'المسار المحاسبي' : 'Accounting Branch'}</span>
                  <span className={styles.inspectFactVal}>
                    {isBranch1 
                      ? (isAr ? 'المسار ١: فسخ قبل التسليم (Branch 1)' : 'Branch 1: Pre-Delivery Cancellation') 
                      : (isAr ? 'المسار ٢: استرداد بعد التسليم (Branch 2)' : 'Branch 2: Post-Delivery Repossession')}
                  </span>
                </div>

                <div className={styles.inspectFactItem}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'حالة الوحدة المستردة' : 'Restored Unit State'}</span>
                  <span className={styles.inspectFactVal}>{resc.unit_state || 'Available for resale'}</span>
                </div>

                <div className={styles.inspectFactItemWide}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'حساب غرامة الفسخ' : 'Forfeiture Account'}</span>
                  <span className={styles.inspectFactVal}>402000 أرباح وغرامات الفسخ التعاقدي (Forfeiture Income)</span>
                </div>

                <div className={styles.inspectFactItemWide}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'حساب التزام الرد للعميل' : 'Refund Account'}</span>
                  <span className={styles.inspectFactVal}>206200 التزامات رد مبالغ العملاء المستردة (Customer Refund Liability)</span>
                </div>

                <div className={styles.inspectFactItemWide}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'حساب تسوية المقدمات' : 'Advances Clearing'}</span>
                  <span className={styles.inspectFactVal}>203000 مقدمات وأقساط حجز الشقق (Deferred Revenue)</span>
                </div>

                <div className={styles.inspectFactItemWide}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'المستند القانوني' : 'Legal Instrument'}</span>
                  <span className={styles.inspectFactVal}>
                    {isAr ? 'محضر تسوية فسخ رضائي مالي ومخالصة نهائية معتمدة' : 'Official Mutual Rescission Settlement & Release'}
                  </span>
                </div>
              </div>
            </div>

            {/* Left Column: Settlement Math */}
            <div className={styles.inspectColumn}>
              <div className={styles.inspectColHeader}>
                <span className={styles.inspectColTitle}>
                  <Calculator size={15} />
                  <span>{isAr ? 'معادلة التسوية المالية للفسخ' : 'Financial Settlement Equation'}</span>
                </span>
              </div>

              <div className={dStyles.stackTight}>
                <div className={dStyles.infoCard}>
                  <div className={dStyles.infoCardRow}>
                    <span>{isAr ? 'إجمالي المقبوض نقداً من العميل:' : 'Total Cash Collected:'}</span>
                    <strong>+ {formatEgp(resc.total_cash_collected, isAr)}</strong>
                  </div>
                  <div className={`${dStyles.infoCardRow} ${dStyles.textGreen}`}>
                    <span>{isAr ? 'الغرامة القانونية المحتجزة (10%):' : 'Retained Penalty (10%):'}</span>
                    <strong>- {formatEgp(resc.penalty_retained, isAr)}</strong>
                  </div>
                  <div className={`${dStyles.simRowHighlight} ${dStyles.textRed}`}>
                    <span>{isAr ? 'صافي الالتزام المستحق رده للعميل:' : 'Net Refund Liability:'}</span>
                    <strong className={dStyles.fontLg}>= {formatEgp(resc.net_refund_liability, isAr)}</strong>
                  </div>
                </div>

                <div className={dStyles.infoCardHelp}>
                  {isAr 
                    ? 'يتم إصدار أمر صرف شيك أو تحويل بنكي لصالح العميل بقيمة صافي الالتزام بعد توقيع محضر التسوية النهائي.'
                    : 'A disbursement cheque or bank wire will be issued to the customer for the net refund upon signing the settlement agreement.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ZFModalShell>
    );
  }

  // ---------------------------------------------------------------------------
  // 6. JOURNAL ENTRY INSPECTION
  // ---------------------------------------------------------------------------
  const entry = payload.type === 'journal' ? (payload.entry || payload.journalEntry) : null;
  const entryNumber = String(entry?.entry_number || (typeof entry?.entry_id === 'string' ? entry.entry_id.slice(0, 8) : entry?.entry_id) || 'JE-AUTO');
  const entryDesc = entry?.description || (payload.type === 'journal' ? payload.title : '') || (isAr ? 'قيد عمليات يومية' : 'Journal Entry');
  const entryDate = (entry as LooseRecord)?.posting_date ? String((entry as LooseRecord).posting_date).slice(0, 10) : (entry?.entry_date ? String(entry.entry_date).slice(0, 10) : new Date().toISOString().split('T')[0]);
  const lines: LooseRecord[] = Array.isArray(entry?.lines) ? (entry.lines as unknown as LooseRecord[]) : [];

  const totalDebit = lines.length > 0 
    ? lines.reduce((s: number, l: LooseRecord) => {
        const val = Number(l?.debit_amount || l?.debit || 0);
        return s + (Number.isFinite(val) ? val : 0);
      }, 0)
    : (payload.type === 'journal' && payload.amount && Number.isFinite(Number(payload.amount)) ? Number(payload.amount) : 0);

  const totalCredit = lines.length > 0 
    ? lines.reduce((s: number, l: LooseRecord) => {
        const val = Number(l?.credit_amount || l?.credit || 0);
        return s + (Number.isFinite(val) ? val : 0);
      }, 0)
    : (payload.type === 'journal' && payload.amount && Number.isFinite(Number(payload.amount)) ? Number(payload.amount) : 0);

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <ZFModalShell
      isOpen={Boolean(payload)}
      onClose={onClose}
      isAr={isAr}
      maxWidth="850px"
      maxHeight="90vh"
      zIndex={isOverModal ? 10001 : 1000}
      icon={<BookOpen size={18} />}
      title={isAr ? 'فحص وتدقيق قيد اليومية' : 'Journal Entry Audit Inspection'}
      subtitle={isAr ? 'سند قيد مزدوج معتمد بدفتر اليومية العامة' : 'Double-Entry General Ledger Voucher'}
      footer={
        <div className={styles.inspectActionFooter}>
          <div className={styles.inspectActionGroup}>
            {onNavigateToTab && (
              <button
                type="button"
                className={styles.inspectBtnPrimary}
                onClick={() => {
                  onClose();
                  onNavigateToTab('ledger');
                }}
              >
                <BookOpen size={14} />
                <span>{isAr ? 'الانتقال إلى دفتر الأستاذ العام' : 'Go to General Ledger'}</span>
              </button>
            )}

            <button
              type="button"
              className={styles.inspectBtnSecondary}
              onClick={() => typeof window !== 'undefined' && window.print()}
            >
              <Printer size={14} />
              <span>{isAr ? 'طباعة سند القيد' : 'Print Journal Voucher'}</span>
            </button>
          </div>

          <button type="button" className={styles.inspectBtnSecondary} onClick={onClose}>
            <span>{isAr ? 'إغلاق الفاحص' : 'Close'}</span>
          </button>
        </div>
      }
    >
      <div className={styles.inspectModalShell}>
        {/* Tier 1: Top Identity Ribbon */}
        <div className={styles.inspectIdentityRibbon}>
          <div className={styles.inspectIdentityLeft}>
            <div className={styles.inspectSquircleIcon}>
              <BookOpen size={16} />
            </div>
            <span className={styles.inspectCodeBadge}>
              #{entryNumber}
            </span>
            <button
              type="button"
              className={styles.inspectCopyBtn}
              onClick={() => handleCopy(entryNumber)}
              title={isAr ? 'نسخ رقم القيد' : 'Copy entry number'}
            >
              {copiedCode === entryNumber ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
              <span>{copiedCode === entryNumber ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
            </button>
            <span className={styles.inspectIdentityTitle}>
              {localizeJournalDescription(entryDesc, isAr)}
            </span>
          </div>
          <div className={styles.inspectIdentityRight}>
            <span className={`${styles.statusPill} ${entry?.is_locked ? styles.statusPillGreen : styles.statusPillAmber}`}>
              {entry?.is_locked ? (isAr ? 'مقفل ومعتمد بالدفتر' : 'Locked & Audited') : (isAr ? 'سارٍ بالدفتر' : 'Posted')}
            </span>
          </div>
        </div>

        {/* Tier 2: Executive 4-Metric Strip */}
        <div className={styles.inspectMetricsGrid}>
          <div className={styles.inspectMetricCard}>
            <span className={styles.inspectMetricLabel}>
              {isAr ? 'إجمالي الجانب المدين (Debit)' : 'Total Debit'}
            </span>
            <span className={styles.inspectMetricValue}>
              {formatEgp(totalDebit, isAr)}
            </span>
            <span className={styles.inspectMetricSub}>
              {isAr ? 'المديونية المقيدة' : 'Recorded debit sum'}
            </span>
          </div>

          <div className={styles.inspectMetricCard}>
            <span className={styles.inspectMetricLabel}>
              {isAr ? 'إجمالي الجانب الدائن (Credit)' : 'Total Credit'}
            </span>
            <span className={styles.inspectMetricValue}>
              {formatEgp(totalCredit, isAr)}
            </span>
            <span className={styles.inspectMetricSub}>
              {isAr ? 'الدائنية المقيدة' : 'Recorded credit sum'}
            </span>
          </div>

          <div className={styles.inspectMetricCard}>
            <span className={styles.inspectMetricLabel}>
              {isAr ? 'موقف التوازن المحاسبي' : 'Ledger Balance'}
            </span>
            <span className={`${styles.inspectMetricValue} ${isBalanced ? dStyles.textGreen : dStyles.textRed}`}>
              {isBalanced ? (isAr ? 'متوازن ٠.٠٠' : 'Balanced 0.00') : (isAr ? 'غير متوازن!' : 'Unbalanced!')}
            </span>
            <span className={styles.inspectMetricSub}>
              {isBalanced ? (isAr ? 'مدين = دائن ✓' : 'Debit equals credit') : (isAr ? 'تنبيه تدقيق' : 'Discrepancy')}
            </span>
          </div>

          <div className={styles.inspectMetricCard}>
            <span className={styles.inspectMetricLabel}>
              {isAr ? 'تاريخ القيد والترحيل' : 'Posting Date'}
            </span>
            <span className={styles.inspectMetricValue}>
              {entryDate}
            </span>
            <span className={styles.inspectMetricSub}>
              {isAr ? 'تاريخ الإثبات المالي' : 'Effective booking date'}
            </span>
          </div>
        </div>

        {/* Tier 3: 2-Column Body */}
        <div className={styles.inspectBodyColumns}>
          {/* Right Column: Specifications & Audit Metadata */}
          <div className={styles.inspectColumn}>
            <div className={styles.inspectColHeader}>
              <span className={styles.inspectColTitle}>
                <FileText size={15} />
                <span>{isAr ? 'بيانات سند القيد' : 'Journal Voucher Specifications'}</span>
              </span>
            </div>

            <div className={styles.inspectFactsList}>
              <div className={styles.inspectFactItem}>
                <span className={styles.inspectFactLabel}>{isAr ? 'المستند المؤيد' : 'Source Doc'}</span>
                <span className={styles.inspectFactVal}>{String((entry as LooseRecord)?.source_document || entry?.source_module || 'Cash Movement / Daily Operations')}</span>
              </div>

              <div className={styles.inspectFactItem}>
                <span className={styles.inspectFactLabel}>{isAr ? 'المنشئ / المراجع' : 'Created By'}</span>
                <span className={styles.inspectFactVal}>{entry?.created_by || 'FIN-OS ERP Engine'}</span>
              </div>

              {payload.type === 'journal' && payload.party && (
                <div className={styles.inspectFactItemWide}>
                  <span className={styles.inspectFactLabel}>{isAr ? 'الطرف المقابل' : 'Counterparty'}</span>
                  <span className={styles.inspectFactVal}>{payload.party}</span>
                </div>
              )}

              <div className={styles.inspectFactItemWide}>
                <span className={styles.inspectFactLabel}>{isAr ? 'البيان والملاحظات' : 'Memo'}</span>
                <span className={styles.inspectFactVal}>{entryDesc}</span>
              </div>
            </div>
          </div>

          {/* Left Column: Clean Double-Entry Debit/Credit Table */}
          <div className={styles.inspectColumn}>
            <div className={styles.inspectColHeader}>
              <span className={styles.inspectColTitle}>
                <BookOpen size={15} />
                <span>{isAr ? 'أطراف القيد المحاسبي المزدوج' : 'Double-Entry Ledger Lines'}</span>
              </span>
              <span className={`${dStyles.colHeaderStatus} ${isBalanced ? dStyles.textGreen : dStyles.textRed}`}>
                {isBalanced ? (isAr ? 'متوازن ✓' : 'Balanced ✓') : (isAr ? 'غير متوازن' : 'Unbalanced')}
              </span>
            </div>

            <div className={dStyles.tableWrap}>
              <table className={dStyles.table}>
                <thead>
                  <tr>
                    <th className={dStyles.th}>{isAr ? 'كود' : 'Code'}</th>
                    <th className={dStyles.th}>{isAr ? 'الحساب' : 'Account'}</th>
                    <th className={dStyles.thNum}>{isAr ? 'مدين' : 'Debit'}</th>
                    <th className={dStyles.thNum}>{isAr ? 'دائن' : 'Credit'}</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length > 0 ? (
                    lines.map((line: LooseRecord, idx: number) => {
                      const accountCode = String(line?.account_code || '');
                      const coaAccount = accountCode ? CANONICAL_COA[accountCode] : undefined;
                      const coaName = coaAccount ? (isAr ? coaAccount.account_name_ar : coaAccount.account_name_en) : (String(line?.account_name || '') || (isAr ? 'حساب عام' : 'General Account'));
                      const debitVal = Number(line?.debit_amount || line?.debit || 0);
                      const creditVal = Number(line?.credit_amount || line?.credit || 0);
                      return (
                        <tr key={idx} className={dStyles.tr}>
                          <td className={dStyles.tdCode}>
                            {line?.account_code || '—'}
                          </td>
                          <td className={dStyles.td}>
                            {coaName}
                          </td>
                          <td className={dStyles.tdNum}>
                            {debitVal > 0 ? formatEgp(debitVal, isAr) : '—'}
                          </td>
                          <td className={dStyles.tdNum}>
                            {creditVal > 0 ? formatEgp(creditVal, isAr) : '—'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <>
                      <tr className={dStyles.tr}>
                        <td className={dStyles.tdCode}>101000</td>
                        <td className={dStyles.td}>{isAr ? 'الخزينة الرئيسية الموحدة' : 'Treasury Main Safe'}</td>
                        <td className={dStyles.tdNum}>{formatEgp(totalDebit, isAr)}</td>
                        <td className={dStyles.tdNum}>—</td>
                      </tr>
                      <tr className={dStyles.tr}>
                        <td className={dStyles.tdCode}>401000</td>
                        <td className={dStyles.td}>{isAr ? 'حساب العمليات والإيرادات' : 'Operations Revenue'}</td>
                        <td className={dStyles.tdNum}>—</td>
                        <td className={dStyles.tdNum}>{formatEgp(totalCredit, isAr)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
                <tfoot>
                  <tr className={dStyles.tfoot}>
                    <td colSpan={2} className={dStyles.tfootTd}>{isAr ? 'الإجمالي' : 'Total'}</td>
                    <td className={dStyles.tfootTdNum}>{formatEgp(totalDebit, isAr)}</td>
                    <td className={dStyles.tfootTdNum}>{formatEgp(totalCredit, isAr)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ZFModalShell>
  );
};

export const ZFInspectorModal = ZFInspectorDrawer;
export default ZFInspectorDrawer;
