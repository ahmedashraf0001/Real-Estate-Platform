'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Landmark, 
  RotateCcw, 
  BookOpen, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  CreditCard,
  User,
  Building,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  Layers,
  PieChart,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Calculator,
  Plus,
  Receipt
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
import { MoneyCell } from '@/components/erp/MoneyCell';
import { StatusBadge } from '@/components/erp/StatusBadge';
import { VersionTimeline } from '@/components/erp/VersionTimeline';
import { JournalEntryPreview } from '@/components/erp/JournalEntryPreview';
import { LegalVerificationTag } from '@/components/erp/LegalVerificationTag';
import { D } from '@/lib/erp/math';
import styles from './v2/ZFWorkstationShell.module.css';

export type InspectorPayload = 
  | { 
      type: 'contract'; 
      contract: ERPContract; 
      schedules: ERPInstallmentSchedule[]; 
      amendments: ERPContractAmendment[]; 
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
  | { type: 'journal'; entry: ERPJournalEntry };

interface ZFInspectorDrawerProps {
  payload: InspectorPayload | null;
  onClose: () => void;
  isAr?: boolean;
  onPayInstallment?: (contract: ERPContract, schedule: ERPInstallmentSchedule) => void;
  onOpenEscalation?: (contract: ERPContract) => void;
  onOpenRescission?: (contract: ERPContract) => void;
  onOpenSupplement?: (contract: ERPContract) => void;
  onNavigateToTab?: (tab: string) => void;
  onToggleHandover?: (contract: ERPContract) => void;
  onUpdateChequeStatus?: (chequeId: string, newStatus: 'In Safe' | 'Deposited' | 'Cleared' | 'Bounced') => void;
  onInspectContract?: (contract: ERPContract) => void;
  onRemitTax?: (taxId: string) => void;
  isMutating?: boolean;
  isOverModal?: boolean;
}

export const ZFInspectorDrawer: React.FC<ZFInspectorDrawerProps> = ({
  payload,
  onClose,
  isAr = false,
  onPayInstallment,
  onOpenEscalation,
  onOpenRescission,
  onOpenSupplement,
  onNavigateToTab,
  onToggleHandover,
  onUpdateChequeStatus,
  onInspectContract,
  onRemitTax,
  isMutating = false,
  isOverModal = false
}) => {
  const [activeContractTab, setActiveContractTab] = useState<'schedule' | 'dossier' | 'ledger'>('schedule');
  const [copiedContractNum, setCopiedContractNum] = useState(false);
  const [copiedChequeNum, setCopiedChequeNum] = useState(false);
  const [copiedTaxNum, setCopiedTaxNum] = useState(false);
  const [copiedRsvId, setCopiedRsvId] = useState(false);
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

  const handleCopyContractNumber = (num: string) => {
    navigator.clipboard?.writeText(num);
    setCopiedContractNum(true);
    setTimeout(() => setCopiedContractNum(false), 2000);
  };

  return (
    <>
      {/* Semi-transparent backdrop for focus and outside-click dismissal */}
      <div 
        className={styles.inspectorBackdrop} 
        onClick={onClose} 
        aria-hidden="true" 
        style={isOverModal ? { zIndex: 10001, top: 0, height: '100vh' } : undefined}
      />

      <div 
        className={styles.inspectorDrawer} 
        style={{ 
          transform: 'translateX(0)',
          ...(isOverModal ? { zIndex: 10002, top: 0, height: '100vh', maxHeight: '100vh' } : {})
        }} 
        role="dialog" 
        aria-modal="true"
      >
        {/* 1. TOP EXECUTIVE DRAWER HEADER */}
        <div className={styles.inspectorHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: payload.type === 'contract' 
                ? 'rgba(212, 175, 55, 0.12)' 
                : payload.type === 'cheque' 
                ? 'rgba(56, 189, 248, 0.12)' 
                : payload.type === 'rescission' 
                ? 'rgba(239, 68, 68, 0.12)' 
                : payload.type === 'rsv'
                ? 'rgba(184, 144, 62, 0.12)'
                : 'rgba(79, 209, 197, 0.12)',
              border: `1px solid ${
                payload.type === 'contract' 
                  ? 'rgba(212, 175, 55, 0.25)' 
                  : payload.type === 'cheque' 
                  ? 'rgba(56, 189, 248, 0.25)' 
                  : payload.type === 'rescission' 
                  ? 'rgba(239, 68, 68, 0.25)' 
                  : payload.type === 'rsv'
                  ? 'rgba(184, 144, 62, 0.25)'
                  : 'rgba(79, 209, 197, 0.25)'
              }`,
              flexShrink: 0
            }}>
              {payload.type === 'contract' && <FileText size={19} color="#946f23" />}
              {payload.type === 'cheque' && <Landmark size={19} color="#38bdf8" />}
              {payload.type === 'tax' && <ShieldCheck size={19} color="#10b981" />}
              {payload.type === 'rsv' && <Calculator size={19} color="#946f23" />}
              {payload.type === 'rescission' && <RotateCcw size={19} color="#f87171" />}
              {payload.type === 'journal' && <BookOpen size={19} color="#4fd1c5" />}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {payload.type === 'contract' && (
                    <>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'rgba(184, 144, 62, 0.1)',
                        border: '1px solid rgba(184, 144, 62, 0.28)',
                        padding: '0.15rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: '#946f23'
                      }}>
                        {isAr ? 'عقد بيع' : 'Contract'}
                      </span>
                      <span dir="ltr" style={{ unicodeBidi: 'isolate', fontFamily: 'monospace', color: '#0f172a', fontWeight: 800, fontSize: '0.98rem' }}>
                        #{payload.contract.contract_number}
                      </span>
                    </>
                  )}
                  {payload.type === 'cheque' && (
                    <>
                      <span>{isAr ? 'بند قسط واستحقاق باليد: ' : 'Hand Installment Due: '}</span>
                      <span dir="ltr" style={{ unicodeBidi: 'isolate', fontFamily: 'monospace' }}>#{payload.cheque.cheque_number}</span>
                    </>
                  )}
                  {payload.type === 'tax' && (
                    <>
                      <span>{isAr ? 'ملف ضريبي: ' : 'Tax File: '}</span>
                      <span dir="ltr" style={{ unicodeBidi: 'isolate', fontFamily: 'monospace' }}>#{payload.tax.tax_id.slice(0, 10)}</span>
                    </>
                  )}
                  {payload.type === 'rsv' && `${isAr ? 'تفاصيل تكلفة وأرباح: ' : 'Cost Allocation: '}${payload.allocation.project_name}`}
                  {payload.type === 'rescission' && (
                    <>
                      <span>{isAr ? 'سجل فسخ: ' : 'Rescission: '}</span>
                      <span dir="ltr" style={{ unicodeBidi: 'isolate', fontFamily: 'monospace' }}>#{payload.rescission.rescission_id.slice(0, 8)}</span>
                    </>
                  )}
                  {payload.type === 'journal' && (
                    <>
                      <span>{isAr ? 'قيد يومية: ' : 'Journal Entry: '}</span>
                      <span dir="ltr" style={{ unicodeBidi: 'isolate', fontFamily: 'monospace' }}>#{payload.entry.entry_number || payload.entry.entry_id.slice(0, 8)}</span>
                    </>
                  )}
                </h3>

              {payload.type === 'contract' && (
                <button
                  type="button"
                  onClick={() => handleCopyContractNumber(payload.contract.contract_number)}
                  title={isAr ? 'نسخ رقم العقد' : 'Copy contract number'}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '0.22rem 0.5rem',
                    color: copiedContractNum ? '#15803d' : '#475569',
                    fontSize: '0.72rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {copiedContractNum ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedContractNum ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                </button>
              )}

              {payload.type === 'cheque' && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(payload.cheque.cheque_number);
                    setCopiedChequeNum(true);
                    setTimeout(() => setCopiedChequeNum(false), 2000);
                  }}
                  title={isAr ? 'نسخ كود البند' : 'Copy item code'}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '0.2rem 0.45rem',
                    color: copiedChequeNum ? '#10b981' : '#a7acc0',
                    fontSize: '0.68rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {copiedChequeNum ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedChequeNum ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                </button>
              )}

              {payload.type === 'tax' && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(payload.tax.tax_id);
                    setCopiedTaxNum(true);
                    setTimeout(() => setCopiedTaxNum(false), 2000);
                  }}
                  title={isAr ? 'نسخ كود الضريبة' : 'Copy tax ID'}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '0.2rem 0.45rem',
                    color: copiedTaxNum ? '#10b981' : '#a7acc0',
                    fontSize: '0.68rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {copiedTaxNum ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedTaxNum ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                </button>
              )}

              {payload.type === 'rsv' && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(payload.allocation.allocation_id);
                    setCopiedRsvId(true);
                    setTimeout(() => setCopiedRsvId(false), 2000);
                  }}
                  title={isAr ? 'نسخ كود المعامل' : 'Copy allocation ID'}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '0.2rem 0.45rem',
                    color: copiedRsvId ? '#10b981' : '#a7acc0',
                    fontSize: '0.68rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {copiedRsvId ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedRsvId ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', fontSize: '0.74rem', color: '#64748b' }}>
              <span>{isAr ? 'فحص وتدقيق السجل المالي والتعاقدي' : 'Audit Inspector & Live Ledger'}</span>
              {payload.type === 'contract' && (
                <>
                  <span>•</span>
                  <span style={{ color: '#946f23', fontWeight: 700 }}>
                    {isAr ? 'إصدار' : 'Rev'} v{payload.schedules[0]?.schedule_version || 1}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          aria-label="Close"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            color: '#475569',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.color = '#475569';
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* 2. DRAWER CONTENT AREA */}
      <div className={styles.inspectorContent}>
        {/* ========================================================================= */}
        {/* CONTRACT INSPECTOR MODE                                                  */}
        {/* ========================================================================= */}
        {payload.type === 'contract' && (() => {
          const contract = payload.contract;
          const grossValue = D(contract.gross_contract_value || '0');
          const cashCollected = D(contract.total_cash_collected || '0');
          const remainingAR = grossValue.minus(cashCollected).isNegative() 
            ? '0.00' 
            : grossValue.minus(cashCollected).toFixed(2);
          
          const collectionProgress = grossValue.isZero() 
            ? 0 
            : Math.min(100, Math.max(0, cashCollected.div(grossValue).times(100).toNumber()));

          const isFullyCollected = cashCollected.greaterThanOrEqual(grossValue) && !grossValue.isZero();

          const activeSchedules = payload.schedules.filter(s => s.status !== 'SUPERSEDED');
          const paidSchedules = activeSchedules.filter(s => s.status === 'Paid');
          const pendingSchedules = activeSchedules.filter(s => s.status === 'Pending');

          const linkedEntries = payload.allJournalEntries && payload.allJournalEntries.length > 0
            ? payload.allJournalEntries
            : (payload.latestJournalEntry ? [payload.latestJournalEntry] : []);

          return (
            <>
              {/* ASSET BANNER */}
              <div style={{
                background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Building size={18} color="#946f23" />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {isAr ? 'العقار والوحدة المتعاقد عليها' : 'Contracted Asset & Unit'}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a', marginTop: '0.15rem' }}>
                      {contract.unit_id}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <StatusBadge domain="unit" status={contract.handover_status} isAr={isAr} />
                  {onToggleHandover && contract.status === 'Active' && (
                    <button
                      type="button"
                      onClick={() => onToggleHandover(contract)}
                      disabled={isMutating}
                      title={isAr 
                        ? (contract.handover_status === 'Delivered' ? 'إعادة الوحدة إلى قيد التنفيذ والتشطيب' : 'تسجيل محضر استلام الشقة للعميل') 
                        : (contract.handover_status === 'Delivered' ? 'Revert to Pending Handover' : 'Mark as Delivered')}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: '#946f23',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <RotateCcw size={10} />
                      <span>{isAr ? (contract.handover_status === 'Delivered' ? 'تعديل محضر الاستلام' : 'تسجيل محضر استلام الشقة') : 'Toggle Handover'}</span>
                    </button>
                  )}
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: contract.status === 'Active' ? '#f0fdf4' : '#fef2f2',
                    color: contract.status === 'Active' ? '#15803d' : '#dc2626',
                    border: `1px solid ${contract.status === 'Active' ? '#bbf7d0' : '#fecaca'}`
                  }}>
                    {contract.status === 'Active' ? (isAr ? 'نشط وسارٍ' : 'Active') : (isAr ? 'مفسوخ' : 'Rescinded')}
                  </span>
                </div>
              </div>

              {/* FINANCIAL PANORAMA: REAL ESTATE EQUATION */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#946f23', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <CreditCard size={15} />
                    <span>{isAr ? 'موقف فلوس العقد وسداد الأقساط' : 'Contract Financial Horizon'}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {isAr ? 'حسابات معتمدة ومسجلة بالدفاتر ✓' : 'Audited Ledger Position'}
                  </div>
                </div>

                {/* 3 Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.65rem' }}>
                  {/* Card 1: Gross Contract Value */}
                  <div style={{ background: '#f8fafc', padding: '0.75rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', minWidth: 0 }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isAr ? 'إجمالي ثمن الشقة المتفق عليه:' : 'Gross Value:'}
                    </div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                      <MoneyCell amount={contract.gross_contract_value} isAr={isAr} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isAr ? 'سعر البيع النهائي بالعقد' : 'Contract price'}
                    </div>
                  </div>

                  {/* Card 2: Cash Collected */}
                  <div style={{ background: 'rgba(22, 163, 74, 0.04)', padding: '0.75rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(22, 163, 74, 0.2)', minWidth: 0 }}>
                    <div style={{ fontSize: '0.68rem', color: '#15803d', marginBottom: '0.25rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isAr ? 'اللي العميل دفعه كاش لحد دلوقتي:' : 'Collected Cash:'}
                    </div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#15803d' }}>
                      <MoneyCell amount={contract.total_cash_collected} isAr={isAr} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#166534', marginTop: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isAr ? 'كاش دخل الخزنة وحسابات الشركة' : 'Collected into Bank & Safe'}
                    </div>
                  </div>

                  {/* Card 3: Remaining Receivables */}
                  <div style={{ 
                    background: isFullyCollected ? 'rgba(22, 163, 74, 0.04)' : 'rgba(217, 119, 6, 0.04)', 
                    padding: '0.75rem 0.85rem', 
                    borderRadius: '10px', 
                    border: `1px solid ${isFullyCollected ? 'rgba(22, 163, 74, 0.2)' : 'rgba(217, 119, 6, 0.25)'}`,
                    minWidth: 0
                  }}>
                    <div style={{ fontSize: '0.68rem', color: isFullyCollected ? '#15803d' : '#b45309', marginBottom: '0.25rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isAr ? 'الباقي على العميل كأقساط مجدولة:' : 'Remaining Receivables:'}
                    </div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: isFullyCollected ? '#15803d' : '#b45309' }}>
                      <MoneyCell amount={remainingAR} isAr={isAr} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: isFullyCollected ? '#15803d' : '#b45309', marginTop: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isFullyCollected 
                        ? (isAr ? 'مسدد بالكامل ✓' : 'Fully Settled') 
                        : (isAr ? `${pendingSchedules.length} أقساط متبقية` : `${pendingSchedules.length} tranches left`)}
                    </div>
                  </div>
                </div>

                {/* Collection Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: '#64748b' }}>
                      {isAr ? 'نسبة ما سدده العميل من إجمالي ثمن الشقة:' : 'Cash Collection Progress:'}
                    </span>
                    <span style={{ fontWeight: 800, color: isFullyCollected ? '#15803d' : '#946f23' }}>
                      {collectionProgress.toFixed(1)}% {isFullyCollected ? (isAr ? '(مسدد بالكامل ✓)' : '(100% Cleared)') : ''}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${collectionProgress}%`, 
                      height: '100%', 
                      background: isFullyCollected 
                        ? 'linear-gradient(90deg, #15803d, #10b981)' 
                        : 'linear-gradient(90deg, #c5a059, #15803d)',
                      borderRadius: '999px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              </div>

              {/* 3. SEGMENTED TAB SWITCHER */}
              <div style={{
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.25rem',
                display: 'flex',
                gap: '0.35rem'
              }}>
                <button
                  type="button"
                  onClick={() => setActiveContractTab('schedule')}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.5rem',
                    borderRadius: '7px',
                    border: activeContractTab === 'schedule' ? '1px solid rgba(184, 144, 62, 0.35)' : '1px solid transparent',
                    background: activeContractTab === 'schedule' ? '#ffffff' : 'transparent',
                    color: activeContractTab === 'schedule' ? '#946f23' : '#64748b',
                    fontWeight: activeContractTab === 'schedule' ? 700 : 600,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    boxShadow: activeContractTab === 'schedule' ? '0 1px 3px rgba(0, 0, 0, 0.05)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Calendar size={13} style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isAr ? 'الأقساط والتحصيل' : 'Schedules'}
                  </span>
                  <span style={{ 
                    fontSize: '0.65rem', 
                    padding: '0.08rem 0.4rem', 
                    borderRadius: '999px', 
                    background: activeContractTab === 'schedule' ? 'rgba(184, 144, 62, 0.15)' : '#e2e8f0',
                    color: activeContractTab === 'schedule' ? '#946f23' : '#475569',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0
                  }}>
                    {activeSchedules.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveContractTab('dossier')}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.5rem',
                    borderRadius: '7px',
                    border: activeContractTab === 'dossier' ? '1px solid rgba(184, 144, 62, 0.35)' : '1px solid transparent',
                    background: activeContractTab === 'dossier' ? '#ffffff' : 'transparent',
                    color: activeContractTab === 'dossier' ? '#946f23' : '#64748b',
                    fontWeight: activeContractTab === 'dossier' ? 700 : 600,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    boxShadow: activeContractTab === 'dossier' ? '0 1px 3px rgba(0, 0, 0, 0.05)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <User size={13} style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isAr ? 'بيانات العقد' : 'Dossier'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveContractTab('ledger')}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.5rem',
                    borderRadius: '7px',
                    border: activeContractTab === 'ledger' ? '1px solid rgba(184, 144, 62, 0.35)' : '1px solid transparent',
                    background: activeContractTab === 'ledger' ? '#ffffff' : 'transparent',
                    color: activeContractTab === 'ledger' ? '#946f23' : '#64748b',
                    fontWeight: activeContractTab === 'ledger' ? 700 : 600,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    boxShadow: activeContractTab === 'ledger' ? '0 1px 3px rgba(0, 0, 0, 0.05)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <BookOpen size={13} style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isAr ? 'القيود المحاسبية' : 'Ledger Entries'}
                  </span>
                  <span style={{ 
                    fontSize: '0.65rem', 
                    padding: '0.08rem 0.4rem', 
                    borderRadius: '999px', 
                    background: activeContractTab === 'ledger' ? 'rgba(184, 144, 62, 0.15)' : '#e2e8f0',
                    color: activeContractTab === 'ledger' ? '#946f23' : '#475569',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0
                  }}>
                    {linkedEntries.length}
                  </span>
                </button>
              </div>

              {/* 4. TAB 1: INSTALLMENT SCHEDULE & RECORDING */}
              {activeContractTab === 'schedule' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Summary Bar & Supplement Button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ padding: '0.22rem 0.6rem', borderRadius: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontWeight: 700 }}>
                        {paidSchedules.length} {isAr ? 'تم التحصيل' : 'Collected'}
                      </span>
                      <span style={{ padding: '0.22rem 0.6rem', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', fontWeight: 700 }}>
                        {pendingSchedules.length} {isAr ? 'لم يتم التحصيل' : 'Not Collected'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {onOpenSupplement && (
                        <button
                          type="button"
                          onClick={() => onOpenSupplement(payload.contract)}
                          disabled={isMutating || payload.contract.status !== 'Active'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.32rem 0.75rem',
                            borderRadius: '8px',
                            background: '#fdf8ef',
                            border: '1px solid rgba(184, 144, 62, 0.4)',
                            color: '#946f23',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: isMutating || payload.contract.status !== 'Active' ? 'not-allowed' : 'pointer',
                            opacity: isMutating || payload.contract.status !== 'Active' ? 0.6 : 1,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Plus size={13} />
                          <span>{isAr ? '+ إضافة ملحق أو دفعة' : '+ Add Supplement'}</span>
                        </button>
                      )}
                      <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                        {isAr ? `جدول الأقساط (تعديل رقم ${payload.schedules[0]?.schedule_version || 1})` : `Schedule Version: v${payload.schedules[0]?.schedule_version || 1}`}
                      </span>
                    </div>
                  </div>

                  {/* Tranches Stack */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {activeSchedules.map((sch) => {
                      const isPaid = sch.status === 'Paid';
                      const isVoid = sch.status === 'Void' || contract.status === 'Rescinded';
                      const isDownPayment = sch.tranche_number === 0;

                      return (
                        <div
                          key={sch.schedule_id}
                          style={{
                            background: isPaid ? '#f0fdf4' : isVoid ? '#fef2f2' : '#ffffff',
                            border: `1px solid ${isPaid ? '#bbf7d0' : isVoid ? '#fecaca' : '#e2e8f0'}`,
                            borderRadius: '10px',
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'nowrap',
                            gap: '0.75rem',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isPaid ? 'rgba(22, 163, 74, 0.12)' : isVoid ? 'rgba(239, 68, 68, 0.12)' : 'rgba(184, 144, 62, 0.1)',
                              color: isPaid ? '#15803d' : isVoid ? '#dc2626' : '#946f23',
                              border: `1px solid ${isPaid ? 'rgba(22, 163, 74, 0.25)' : isVoid ? 'rgba(239, 68, 68, 0.25)' : 'rgba(184, 144, 62, 0.25)'}`,
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              flexShrink: 0
                            }}>
                              {isDownPayment ? 'DP' : `#${sch.tranche_number}`}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div style={{ 
                                fontWeight: 700, 
                                fontSize: '0.88rem', 
                                color: isVoid && !isPaid ? '#946f23' : '#0f172a',
                                textDecoration: isVoid && !isPaid ? 'line-through' : 'none',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {isDownPayment 
                                  ? (isAr ? 'الدفعة المقدمة' : 'Down Payment') 
                                  : (isAr ? `قسط ربع سنوي #${sch.tranche_number}` : `Tranche #${sch.tranche_number}`)}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem', whiteSpace: 'nowrap' }}>
                                <Calendar size={11} color="#64748b" style={{ flexShrink: 0 }} />
                                <span>{isAr ? 'الاستحقاق:' : 'Due:'}</span>
                                <strong style={{ color: '#334155', fontWeight: 600 }}>{sch.due_date}</strong>
                                {sch.paid_date && (
                                  <>
                                    <span>•</span>
                                    <span style={{ color: '#15803d', fontWeight: 600 }}>{isAr ? 'سدد:' : 'Paid:'} {sch.paid_date}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                            <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                                <MoneyCell amount={sch.nominal_value} isAr={isAr} />
                              </div>
                              <div style={{ fontSize: '0.68rem', marginTop: '0.15rem', whiteSpace: 'nowrap' }}>
                                {isPaid ? (
                                  <span style={{ color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                    <CheckCircle2 size={11} /> {isAr ? 'تم التحصيل' : 'Collected'}
                                  </span>
                                ) : isVoid ? (
                                  <span style={{ color: '#dc2626', fontWeight: 600 }}>
                                    {isAr ? 'ملغى بالفسخ' : 'Void'}
                                  </span>
                                ) : (
                                  <span style={{ color: '#b45309', fontWeight: 700 }}>
                                    {isAr ? 'لم يتم التحصيل' : 'Not Collected'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {!isPaid && !isVoid && onPayInstallment && (
                              <button
                                onClick={() => onPayInstallment(contract, sch)}
                                disabled={isMutating}
                                style={{
                                  background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                                  border: '1px solid #14532d',
                                  color: '#ffffff',
                                  borderRadius: '6px',
                                  padding: '0.35rem 0.68rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 1px 3px rgba(21, 128, 61, 0.25)'
                                }}
                              >
                                <Receipt size={13} />
                                <span>{isAr ? 'تحصيل القسط (كاش / إنستاباي)' : 'Collect Installment (Cash / InstaPay)'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Version Timeline if Escalation occurred */}
                  {payload.amendments.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#946f23', marginBottom: '0.65rem' }}>
                        {isAr ? 'سجل تعديلات وزيادة سعر العقد:' : 'Escalation Version Timeline:'}
                      </div>
                      <VersionTimeline 
                        schedules={payload.schedules}
                        amendments={payload.amendments}
                        isAr={isAr}
                        onCollect={(s) => onPayInstallment && onPayInstallment(contract, s)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 5. TAB 2: CONTRACT & BUYER DOSSIER */}
              {activeContractTab === 'dossier' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Buyer Profile Card */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#946f23', fontWeight: 800, fontSize: '0.85rem' }}>
                      <User size={15} />
                      <span>{isAr ? 'بيانات العميل والمشتري' : 'Buyer & Purchaser Dossier'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.82rem' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>{isAr ? 'اسم العميل / المشتري:' : 'Buyer Name:'}</span>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
                          {contract.buyer_name || (isAr ? 'غير محدد' : 'Unspecified')}
                        </div>
                      </div>

                      <div>
                        <span style={{ color: '#64748b' }}>{isAr ? 'الرقم القومي / السجل:' : 'National / Tax ID:'}</span>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.2rem', fontVariantNumeric: 'tabular-nums' }}>
                          {contract.buyer_national_id || (isAr ? 'غير مسجل' : 'N/A')}
                        </div>
                      </div>

                      <div>
                        <span style={{ color: '#64748b' }}>{isAr ? 'الهاتف المسجل:' : 'Phone:'}</span>
                        <div style={{ color: '#0f172a', marginTop: '0.2rem', fontVariantNumeric: 'tabular-nums' }}>
                          {contract.buyer_phone || (isAr ? 'غير مسجل' : 'N/A')}
                        </div>
                      </div>

                      <div>
                        <span style={{ color: '#64748b' }}>{isAr ? 'البريد الإلكتروني:' : 'Email:'}</span>
                        <div style={{ color: '#0f172a', marginTop: '0.2rem' }}>
                          {contract.buyer_email || (isAr ? 'غير مسجل' : 'N/A')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contract & Delivery Specifications Card */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0284c7', fontWeight: 800, fontSize: '0.85rem' }}>
                      <Building size={15} />
                      <span>{isAr ? 'بيانات التعاقد وموقف استلام الشقة' : 'Contract & Delivery Specifications'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.82rem' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>{isAr ? 'تاريخ توقيع العقد:' : 'Signing Date:'}</span>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
                          {contract.contract_date}
                        </div>
                      </div>

                      <div>
                        <span style={{ color: '#64748b' }}>{isAr ? 'نظام السداد والتقسيط:' : 'Payment Plan:'}</span>
                        <div style={{ fontWeight: 700, color: '#946f23', marginTop: '0.2rem' }}>
                          {contract.payment_plan_type === 'FULL_CASH' 
                            ? (isAr ? 'سداد نقدي كامل (Full Cash)' : 'Full Cash') 
                            : contract.payment_plan_type === 'UPFRONT_HANDOVER' 
                            ? (isAr ? 'مقدم + دفعة استلام' : 'Upfront & Handover') 
                            : (isAr ? 'تقسيط ربع سنوي مجدول' : 'Installments')}
                        </div>
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: '#64748b' }}>{isAr ? 'الموقف القانوني والمحاسبي للتسليم:' : 'Revenue Recognition (IFRS 15):'}</span>
                        {contract.handover_status === 'Delivered' ? (
                          <div style={{ marginTop: '0.25rem', padding: '0.65rem 0.85rem', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', lineHeight: 1.45, fontSize: '0.78rem', fontWeight: 600 }}>
                            {isAr 
                              ? 'تم تحرير محضر استلام الشقة رسمياً للعميل، وتعتبر الوحدة مُسلمة بالكامل وقُيّد الإيراد بحساب المبيعات.'
                              : 'Physical Handover Completed. Under IFRS 15, Deferred Revenue (203000) was relieved and 100% Realized Revenue recognized in Sales (401000).'}
                          </div>
                        ) : (
                          <div style={{ marginTop: '0.25rem', padding: '0.65rem 0.85rem', borderRadius: '8px', background: '#fffbeb', border: '1px solid rgba(217, 119, 6, 0.3)', color: '#92400e', lineHeight: 1.45, fontSize: '0.78rem', fontWeight: 600 }}>
                            {isAr 
                              ? 'الوحدة قيد الإنشاء والتشطيب ولم تُسلّم للعميل بعد. كافة المبالغ المحصلة مقيدة كالتزام تعاقدي حتى تاريخ تحرير محضر الاستلام.'
                              : 'Asset under construction. Collections are credited to Contract Liability (203000 Deferred Revenue) until handover completion.'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Partner Share Splits Card */}
                  {contract.partner_splits && contract.partner_splits.length > 0 && (
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#7c3aed', fontWeight: 800, fontSize: '0.85rem' }}>
                        <PieChart size={15} />
                        <span>{isAr ? 'توزيع حصص الشركاء والمطور في العقد' : 'Partner Capital Allocation'}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {contract.partner_splits.map((p, idx) => (
                          <div 
                            key={idx}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              padding: '0.65rem 0.85rem',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.78rem'
                            }}
                          >
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{p.partner_name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ color: '#946f23', fontWeight: 800 }}>{p.share_percentage}%</span>
                              <span style={{ fontVariantNumeric: 'tabular-nums', color: '#0f172a', fontWeight: 700 }}>{p.share_amount} ج.م</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 6. TAB 3: IMMUTABLE JOURNAL ENTRIES */}
              {activeContractTab === 'ledger' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {isAr 
                      ? 'كافة قيود اليومية المحصنة المرتبطة بهذا العقد (دفعات مقدمة، سداد أقساط، ومحاضر تسليم):'
                      : 'All immutable double-entry journal postings registered for this contract:'}
                  </div>

                  {linkedEntries.length === 0 ? (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      background: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '12px',
                      color: '#64748b',
                      fontSize: '0.82rem'
                    }}>
                      {isAr ? 'لا توجد قيود مسجلة بالدفاتر بعد لهذا العقد.' : 'No journal entries linked to this contract yet.'}
                    </div>
                  ) : (
                    linkedEntries.map((entry) => (
                      <div key={entry.entry_id} style={{ marginBottom: '0.5rem' }}>
                        <JournalEntryPreview entry={entry} isDraft={false} isAr={isAr} />
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          );
        })()}

        {/* ========================================================================= */}
        {/* CHEQUE INSPECTOR MODE                                                    */}
        {/* ========================================================================= */}
        {payload.type === 'cheque' && (() => {
          const chq = payload.cheque;
          const contract = payload.linkedContract;
          const todayStr = new Date().toISOString().split('T')[0];
          const isOverdue = chq.status !== 'Cleared' && chq.due_date < todayStr;
          const isDueToday = chq.status !== 'Cleared' && chq.due_date === todayStr;
          const isMatured = chq.due_date <= todayStr;
          const step = chq.status === 'Cleared' 
            ? 3 
            : (isOverdue || isDueToday || isMatured || chq.status === 'Deposited') 
              ? 2 
              : 1;

          return (
            <>
              {/* 1. BANK CHEQUE EXECUTIVE VOUCHER BANNER */}
              <div style={{
                background: '#ffffff',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                borderRadius: '14px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                position: 'relative'
              }}>

                {/* Cheque Header: Monospace Cheque # + Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                  <span style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    color: '#946f23',
                    background: 'rgba(148, 111, 35, 0.08)',
                    border: '1px solid rgba(148, 111, 35, 0.3)',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}>
                    <Landmark size={14} color="#946f23" />
                    <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>#{chq.cheque_number}</span>
                  </span>
                  <StatusBadge domain="cheque" status={chq.status} isAr={isAr} />
                </div>

                {/* Amount in Framed Cheque Box */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '0.75rem 1.1rem',
                  borderRadius: '10px',
                  zIndex: 1
                }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                    {isAr ? 'قيمة القسط / البند المطلوب تحصيله' : 'Installment Due Amount'}
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    <MoneyCell amount={chq.nominal_value} isAr={isAr} highlight />
                  </div>
                </div>

                {/* Drawer & Maturity */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.76rem', zIndex: 1 }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>
                      {isAr ? 'الساحب (المشتري):' : 'Drawer / Customer:'}
                    </span>
                    <strong style={{ color: '#0f172a', fontSize: '0.88rem', display: 'block', marginTop: '0.15rem' }}>{chq.drawer_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>
                      {isAr ? 'تاريخ الاستحقاق:' : 'Due Date:'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                      <Calendar size={14} color="#64748b" />
                      <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontSize: '0.88rem' }}>
                        {chq.due_date}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Overdue / Due Alert */}
                {isOverdue && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '8px',
                    color: '#991b1b',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    zIndex: 1
                  }}>
                    <AlertTriangle size={15} color="#dc2626" />
                    <span>{isAr ? 'تنبيه: هذا القسط متأخر عن موعد استحقاقه ويحتاج تحصيل سريع (كاش أو إنستاباي)!' : 'Overdue for collection!'}</span>
                  </div>
                )}
                {isDueToday && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '8px',
                    color: '#92400e',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    zIndex: 1
                  }}>
                    <Clock size={15} color="#d97706" />
                    <span>{isAr ? 'يستحق التحصيل اليوم (كاش أو إنستاباي)!' : 'Due for collection today!'}</span>
                  </div>
                )}
              </div>

              {/* 2. LINKED SALES CONTRACT & PROPERTY UNIT CARD */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem 1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building size={16} color="#946f23" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                      {isAr ? 'العقد والوحدة العقارية المرتبطة' : 'Linked Contract & Unit'}
                    </span>
                  </div>
                  {contract && onInspectContract && (
                    <button
                      type="button"
                      onClick={() => onInspectContract(contract)}
                      style={{
                        background: 'rgba(212, 175, 55, 0.12)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        color: '#946f23',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <ArrowUpRight size={12} />
                      <span>{isAr ? 'فحص ملف العقد بالكامل' : 'Inspect Contract'}</span>
                    </button>
                  )}
                </div>

                {contract ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>{isAr ? 'رقم العقد:' : 'Contract #:'}</span>
                      <strong style={{ color: '#946f23', fontVariantNumeric: 'tabular-nums' }} dir="ltr">{contract.contract_number}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>{isAr ? 'الوحدة / المشروع:' : 'Unit / Project:'}</span>
                      <strong style={{ color: '#0f172a' }}>{contract.unit_id}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>{isAr ? 'الطرف المشتري:' : 'Buyer:'}</span>
                      <strong style={{ color: '#0f172a' }}>{contract.buyer_name}</strong>
                    </div>
                    {payload.linkedSchedule && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '0.4rem' }}>
                        <span style={{ color: '#64748b' }}>{isAr ? 'القسط المرتبط:' : 'Installment Tranche:'}</span>
                        <span style={{ color: '#2563eb', fontWeight: 800 }}>
                          {isAr ? `قسط #${payload.linkedSchedule.tranche_number}` : `Tranche #${payload.linkedSchedule.tranche_number}`} ({D(payload.linkedSchedule.nominal_value).formatEGP(isAr)})
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {isAr ? 'بند استحقاق وقسط مسجل بالعقد' : 'Contract installment due'}
                  </div>
                )}
              </div>

              {/* 3. VISUAL ACCOUNTING JOURNEY STEPPER */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={15} color="#0284c7" />
                  <span>{isAr ? 'مراحل ومتابعة سداد القسط:' : 'Installment Collection Lifecycle:'}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Step 1: In Safe */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: step > 1 ? '#dcfce7' : step === 1 ? '#fef3c7' : '#f1f5f9',
                      border: `1.5px solid ${step > 1 ? '#10b981' : step === 1 ? '#d97706' : '#cbd5e1'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: step > 1 ? '#15803d' : step === 1 ? '#92400e' : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      {step > 1 ? <Check size={13} /> : '١'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: step >= 1 ? '#0f172a' : '#64748b' }}>
                        {isAr ? 'إدراج وجدولة القسط بالعقد' : 'Contract Installment Scheduled'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: step >= 1 ? '#475569' : '#94a3b8', marginTop: '0.1rem' }}>
                        {isAr ? 'استحقاق آجل بانتظار موعد السداد' : 'Scheduled future hand installment'}
                      </div>
                    </div>
                    {step === 1 && (
                      <span style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontWeight: 700, flexShrink: 0 }}>
                        {isAr ? 'الحالة الحالية' : 'Current'}
                      </span>
                    )}
                  </div>

                  {/* Step 2: Deposited / Matured */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: step > 2 ? '#dcfce7' : step === 2 ? (isOverdue ? 'rgba(220, 38, 38, 0.08)' : isDueToday ? 'rgba(184, 144, 62, 0.12)' : '#dbeafe') : '#f1f5f9',
                      border: `1.5px solid ${step > 2 ? '#10b981' : step === 2 ? (isOverdue ? '#dc2626' : isDueToday ? '#946f23' : '#2563eb') : '#cbd5e1'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: step > 2 ? '#15803d' : step === 2 ? (isOverdue ? '#dc2626' : isDueToday ? '#946f23' : '#1e40af') : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      {step > 2 ? <Check size={13} /> : '٢'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: step >= 2 ? '#0f172a' : '#64748b' }}>
                        {isAr 
                          ? (isOverdue ? 'حلول موعد استحقاق القسط (متأخر)' : isDueToday ? 'حلول موعد استحقاق القسط (مستحق اليوم)' : 'حلول موعد استحقاق القسط') 
                          : 'Due for Hand Collection'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: step >= 2 ? '#475569' : '#94a3b8', marginTop: '0.1rem' }}>
                        {isAr ? 'التواصل مع العميل للتحصيل كاش أو تحويل إنستاباي' : 'Contact client for hand cash collection'}
                      </div>
                    </div>
                    {step === 2 && (
                      <span style={{ 
                        fontSize: '0.68rem', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '6px', 
                        background: isOverdue ? 'rgba(220, 38, 38, 0.08)' : isDueToday ? 'rgba(184, 144, 62, 0.12)' : '#dbeafe', 
                        color: isOverdue ? '#dc2626' : isDueToday ? '#946f23' : '#1e40af', 
                        border: `1px solid ${isOverdue ? 'rgba(220, 38, 38, 0.25)' : isDueToday ? 'rgba(184, 144, 62, 0.3)' : '#bfdbfe'}`, 
                        fontWeight: 700, 
                        flexShrink: 0 
                      }}>
                        {isAr ? (isOverdue ? 'متأخر واجب التحصيل' : isDueToday ? 'مستحق اليوم' : 'الحالة الحالية') : (isOverdue ? 'Overdue' : isDueToday ? 'Due Today' : 'Current')}
                      </span>
                    )}
                  </div>

                  {/* Step 3: Cleared */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: step >= 3 ? '#dcfce7' : '#f1f5f9',
                      border: `1.5px solid ${step >= 3 ? '#10b981' : '#cbd5e1'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: step >= 3 ? '#15803d' : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      {step >= 3 ? <Check size={13} /> : '٣'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: step >= 3 ? '#0f172a' : '#64748b' }}>
                        {isAr ? 'تم التحصيل وتوريد الفلوس بالخزينة (١٠١٠٠٠) أو البنك' : 'Collected by Hand into Safe (101000)'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: step >= 3 ? '#475569' : '#94a3b8', marginTop: '0.1rem' }}>
                        {chq.cleared_date 
                          ? (isAr ? `تم الاستلام والتوريد بالخزينة بتاريخ: ${chq.cleared_date}` : `Hand collected date: ${chq.cleared_date}`)
                          : (isAr ? 'استلام النقدية وتوريدها لحسابات الشركة' : 'Cash collected without bank link')}
                      </div>
                    </div>
                    {step === 3 && (
                      <span style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', fontWeight: 700, flexShrink: 0 }}>
                        {isAr ? 'تم التحصيل' : 'Collected'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. POSTED GENERAL LEDGER ENTRY PREVIEW */}
              {payload.clearingJournalEntry && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BookOpen size={14} color="#946f23" />
                    <span>{isAr ? 'قيد اليومية المسجل بالدفاتر المحاسبية:' : 'Posted General Ledger Entry:'}</span>
                  </div>
                  <JournalEntryPreview entry={payload.clearingJournalEntry} isDraft={false} isAr={isAr} />
                </div>
              )}
            </>
          );
        })()}

        {/* ========================================================================= */}
        {/* STATUTORY TAX INSPECTOR MODE                                             */}
        {/* ========================================================================= */}
        {payload.type === 'tax' && (() => {
          const t = payload.tax;
          const contract = payload.linkedContract;
          const isDisposal = t.tax_type.includes('Disposal');
          const isRemitted = t.remittance_status === 'Remitted to ETA';
          const ratePct = D(t.tax_rate).times(100).toFixed(1);

          return (
            <>
              {/* 1. OFFICIAL TAX ASSESSMENT VOUCHER CARD */}
              <div style={{
                background: '#ffffff',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '14px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                position: 'relative'
              }}>
                {/* Tax Header: Authority Badge + Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <div style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: '#059669'
                    }}>
                      <ShieldCheck size={14} />
                      <span>{isAr ? 'مصلحة الضرائب المصرية (ETA)' : 'Egyptian Tax Authority (ETA)'}</span>
                    </div>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    background: isRemitted ? '#dcfce7' : '#fef3c7',
                    border: `1px solid ${isRemitted ? '#bbf7d0' : '#fde68a'}`,
                    color: isRemitted ? '#15803d' : '#92400e',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    {isRemitted ? (
                      <>
                        <CheckCircle2 size={12} />
                        <span>{isAr ? 'تم التوريد للمصلحة' : 'Remitted to ETA'}</span>
                      </>
                    ) : (
                      <>
                        <Clock size={12} />
                        <span>{isAr ? 'قيد التوريد والسداد' : 'Pending Remittance'}</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Tax Type Title */}
                <div style={{ zIndex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {isAr 
                      ? (isDisposal 
                          ? 'ضريبة ورسوم محددة يدوياً للشقة (ضمن سعر التعاقد)' 
                          : t.tax_type)
                      : t.tax_type}
                  </h4>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.2rem' }}>
                    {isAr ? `تاريخ اعتماد الضريبة: ${t.created_at || 'معتمد بالدفاتر'}` : `Assessment Date: ${t.created_at}`}
                  </div>
                </div>

                {/* Tax Assessment Box */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '0.85rem 1.15rem',
                  borderRadius: '10px',
                  zIndex: 1
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                      {isAr ? 'قيمة الضريبة المضافة للشقة (يدوياً)' : 'Manual Apartment Tax'}
                    </span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#946f23', letterSpacing: '-0.02em', marginTop: '0.15rem' }}>
                      <MoneyCell amount={t.tax_amount} isAr={isAr} highlight />
                    </div>
                  </div>
                  <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                      {isAr ? 'النسبة المحسوبة' : 'Calculated Rate'}
                    </span>
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: '#946f23',
                      background: 'rgba(212, 175, 55, 0.12)',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      padding: '0.15rem 0.55rem',
                      borderRadius: '6px',
                      display: 'inline-block',
                      marginTop: '0.2rem'
                    }}>
                      {ratePct}%
                    </div>
                  </div>
                </div>

                {/* Taxable Base Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.76rem', zIndex: 1 }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>
                      {isAr ? 'سعر الشقة الأساسي (Base):' : 'Base Apartment Price:'}
                    </span>
                    <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>
                      <MoneyCell amount={t.taxable_base} isAr={isAr} />
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>
                      {isAr ? 'حساب الالتزام بالدليل المحاسبي:' : 'GL Liability Account:'}
                    </span>
                    <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontSize: '0.82rem' }}>
                      204000 - الضرائب والرسوم المستحقة
                    </strong>
                  </div>
                </div>
              </div>

              {/* 2. LINKED SALES CONTRACT & PROPERTY UNIT */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem 1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building size={16} color="#946f23" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                      {isAr ? 'العقد والوحدة العقارية محل التصرف' : 'Subject Contract & Real Estate Unit'}
                    </span>
                  </div>
                  {contract && onInspectContract && (
                    <button
                      type="button"
                      onClick={() => onInspectContract(contract)}
                      style={{
                        background: 'rgba(212, 175, 55, 0.12)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        color: '#946f23',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <ArrowUpRight size={12} />
                      <span>{isAr ? 'فحص ملف العقد بالكامل' : 'Inspect Contract'}</span>
                    </button>
                  )}
                </div>

                {contract ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>{isAr ? 'رقم العقد:' : 'Contract #:'}</span>
                      <strong style={{ color: '#946f23', fontVariantNumeric: 'tabular-nums' }} dir="ltr">{contract.contract_number}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>{isAr ? 'الوحدة / المشروع:' : 'Unit / Project:'}</span>
                      <strong style={{ color: '#0f172a' }}>{contract.unit_id}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>{isAr ? 'المشتري / المتصرف إليه:' : 'Buyer:'}</span>
                      <strong style={{ color: '#0f172a' }}>{contract.buyer_name}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '0.4rem' }}>
                      <span style={{ color: '#64748b' }}>{isAr ? 'إجمالي قيمة التعاقد (شامل الضريبة):' : 'Gross Contract Value:'}</span>
                      <span style={{ color: '#15803d', fontWeight: 800 }}>
                        <MoneyCell amount={contract.gross_contract_value} isAr={isAr} />
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {isAr ? 'ملف ضريبي مسجل مباشرة أو مرتبط بتوريدات مقاولين' : 'Supplier / Direct statutory tax assessment'}
                  </div>
                )}
              </div>

              {/* 3. FINANCIAL POLICY & ACCOUNTING RULES */}
              <div style={{
                background: 'rgba(56, 189, 248, 0.06)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.78rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontWeight: 800 }}>
                  <BookOpen size={14} />
                  <span>{isAr ? 'المحددات المالية والسياسة المحاسبية:' : 'Financial & Accounting Policy:'}</span>
                </div>
                <div style={{ color: '#475569', lineHeight: 1.55 }}>
                  {isAr 
                    ? 'تم تحديد هذه الضريبة والرسوم يدوياً للشقة من قبل الإدارة المالية، وتُحسب مباشرة ضمن إجمالي سعر بيع الوحدة وقيمة التعاقد. يتم تحصيلها باليد مع الدفعة المقدمة وأقساط العقد وتوريدها للخزينة الرئيسية (حساب 101000).'
                    : 'This tax/fee amount was set manually per apartment by the financial administration and is calculated directly into the gross unit selling price.'}
                </div>
              </div>

              {/* 4. POSTED GENERAL LEDGER ENTRY PREVIEW */}
              {payload.remittanceJournalEntry && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BookOpen size={14} color="#946f23" />
                    <span>{isAr ? 'قيد اليومية المسجل بالدفاتر المحاسبية للتوريد:' : 'Posted Tax Remittance GL Entry:'}</span>
                  </div>
                  <JournalEntryPreview entry={payload.remittanceJournalEntry} isDraft={false} isAr={isAr} />
                </div>
              )}
            </>
          );
        })()}

        {/* ========================================================================= */}
        {/* RSV / COST ALLOCATION INSPECTOR MODE                                     */}
        {/* ========================================================================= */}
        {payload.type === 'rsv' && (() => {
          const alloc = payload.allocation;
          const wip = D(alloc.total_incurred_wip || '0');
          const sales = D(alloc.total_sales_value || '0');
          const rsvFactor = D(alloc.rsv_factor || '0');
          const rsvPct = rsvFactor.times(100).toFixed(2);
          const grossMarginPct = D(1).minus(rsvFactor).times(100).toFixed(2);

          // Simulated Handover COGS
          const simVal = D(simulatedUnitValue || '0');
          const simCOGS = simVal.times(rsvFactor);
          const simProfit = simVal.minus(simCOGS);

          return (
            <>
              {/* 1. EXECUTIVE RSV FACTOR & MARGIN BANNER */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid rgba(184, 144, 62, 0.3)',
                borderRadius: '14px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: '0 2px 10px rgba(184, 144, 62, 0.05)',
                position: 'relative'
              }}>
                {/* Top Badge: Standard & Date */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                  <div style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '8px',
                    background: 'rgba(184, 144, 62, 0.08)',
                    border: '1px solid rgba(184, 144, 62, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: '#946f23'
                  }}>
                    <Calculator size={13} />
                    <span>{isAr ? 'توزيع مصاريف المباني وحساب الأرباح' : 'Cost Allocation & Unit Handover'}</span>
                  </div>

                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {new Date(alloc.calculated_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                  </span>
                </div>

                {/* Project Title */}
                <div style={{ zIndex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    {alloc.project_name}
                  </h4>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: '0.2rem' }}>
                    {isAr 
                      ? 'توزيع تكلفة المباني والخامات على كل شقة لتحديد صافي أرباح المكتب عند البيع والتسليم بدقة.' 
                      : 'Relative Sales Value ratio to relieve WIP into COGS upon Handover'}
                  </span>
                </div>

                {/* Main Factor & Margin Highlight Box */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.85rem',
                  zIndex: 1
                }}>
                  {/* Building Cost Ratio (Brand Gold) */}
                  <div style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #fefcf9 100%)',
                    border: '1.5px solid rgba(184, 144, 62, 0.3)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    boxShadow: '0 2px 8px rgba(184, 144, 62, 0.04)'
                  }}>
                    <span style={{ fontSize: '0.7rem', color: '#946f23', display: 'block', fontWeight: 800 }}>
                      {isAr ? 'نسبة تكلفة المباني من السعر:' : 'Building Cost Ratio:'}
                    </span>
                    <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#946f23', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
                      {rsvPct}%
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#946f23', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#946f23', display: 'inline-block' }} />
                      {isAr ? 'من ثمن الشقة مباني وخامات' : 'construction cost'}
                    </span>
                  </div>

                  {/* Profit Margin (Forest Jade) */}
                  <div style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f7fdf9 100%)',
                    border: '1.5px solid rgba(21, 128, 61, 0.3)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    boxShadow: '0 2px 8px rgba(21, 128, 61, 0.04)',
                    textAlign: isAr ? 'left' : 'right'
                  }}>
                    <span style={{ fontSize: '0.7rem', color: '#15803d', display: 'block', fontWeight: 800 }}>
                      {isAr ? 'مكسبنا الصافي المقدر:' : 'Net Profit Margin:'}
                    </span>
                    <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#15803d', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
                      {grossMarginPct}%
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#15803d', display: 'inline-block' }} />
                      {isAr ? 'صافي مكسب المكتب' : 'net profit margin'}
                    </span>
                  </div>
                </div>

                {/* Visual Proportional Split Bar (Brand Gold vs Forest Jade) */}
                <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: '#946f23', fontWeight: 800 }}>
                      {isAr ? `تكلفة المباني والخامات: ${rsvPct}%` : `WIP Cost: ${rsvPct}%`}
                    </span>
                    <span style={{ color: '#15803d', fontWeight: 800 }}>
                      {isAr ? `مكسبنا الصافي: ${grossMarginPct}%` : `Gross Margin: ${grossMarginPct}%`}
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '999px',
                    background: '#f1f5f9',
                    overflow: 'hidden',
                    display: 'flex'
                  }}>
                    <div style={{
                      width: `${Math.min(parseFloat(rsvPct) || 0, 100)}%`,
                      background: 'linear-gradient(90deg, #c5a059, #946f23)',
                      height: '100%',
                      transition: 'width 0.3s ease'
                    }} />
                    <div style={{
                      flex: 1,
                      background: 'linear-gradient(90deg, #15803d, #16a34a)',
                      height: '100%'
                    }} />
                  </div>
                </div>
              </div>

              {/* 2. COST POOL & SALES CEILING BREAKDOWN */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Building size={15} color="#946f23" />
                  <span>{isAr ? 'أصول التكاليف وسقف مبيعات المشروع:' : 'Project WIP & Sales Value Pool:'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.78rem' }}>
                  <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', fontWeight: 600 }}>
                      {isAr ? 'المصروف الفعلي على المباني:' : 'Incurred Construction WIP:'}
                    </span>
                    <strong style={{ color: '#946f23', fontSize: '1rem', marginTop: '0.2rem', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
                      {D(alloc.total_incurred_wip).formatEGP(isAr)}
                    </strong>
                    <span style={{ color: '#64748b', fontSize: '0.68rem' }}>
                      {isAr ? 'خامات ومقاولات ومصاريف إنشائية متكبدة' : 'Direct civil & MEP costs'}
                    </span>
                  </div>

                  <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', fontWeight: 600 }}>
                      {isAr ? 'إجمالي سعر بيع كل الشقق المتوقع:' : 'Projected Sales Ceiling:'}
                    </span>
                    <strong style={{ color: '#0f172a', fontSize: '1rem', marginTop: '0.2rem', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
                      {D(alloc.total_sales_value).formatEGP(isAr)}
                    </strong>
                    <span style={{ color: '#64748b', fontSize: '0.68rem' }}>
                      {isAr ? 'إجمالي القيمة البيعية لكل وحدات المشروع' : 'Total target sales denominator'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. INTERACTIVE HANDOVER COGS SIMULATOR */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#15803d', fontWeight: 800, fontSize: '0.78rem' }}>
                    <Calculator size={15} />
                    <span>{isAr ? 'محاكي تسليم الشقق وحساب الأرباح الفورية:' : 'Unit Handover Relief Simulator:'}</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {isAr ? 'احسب تكلفتك وصافي مكسبك' : 'Live Simulation'}
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#475569', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    {isAr ? 'افترض قيمة بيعية لوحدة يتم تسليمها للعميل (بالجنيه):' : 'Simulate unit contract value delivered to client (EGP):'}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      step="100000"
                      value={simulatedUnitValue}
                      onChange={(e) => setSimulatedUnitValue(e.target.value)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        color: '#0f172a',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        flex: 1,
                        outline: 'none'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      {[
                        { val: '3000000', labelAr: '٣ مليون', labelEn: '3M' },
                        { val: '5000000', labelAr: '٥ مليون', labelEn: '5M' },
                        { val: '10000000', labelAr: '١٠ مليون', labelEn: '10M' }
                      ].map(item => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setSimulatedUnitValue(item.val)}
                          style={{
                            background: simulatedUnitValue === item.val ? '#946f23' : '#ffffff',
                            border: `1.5px solid ${simulatedUnitValue === item.val ? '#946f23' : '#cbd5e1'}`,
                            color: simulatedUnitValue === item.val ? '#ffffff' : '#475569',
                            borderRadius: '8px',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: simulatedUnitValue === item.val ? '0 2px 6px rgba(184, 144, 62, 0.25)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isAr ? item.labelAr : item.labelEn}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Simulator Results */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem'
                }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#946f23', display: 'block', fontWeight: 800 }}>
                      {isAr ? 'تكلفة مباني الشقة المستنزلة:' : 'Relieved Construction Cost:'}
                    </span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#946f23', marginTop: '0.15rem', fontVariantNumeric: 'tabular-nums' }}>
                      {simCOGS.formatEGP(isAr)}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      {isAr ? `تتخصم تلقائياً من مصاريف المباني بنسبة ${rsvPct}%` : `Relieved from WIP ratio: ${rsvPct}%`}
                    </span>
                  </div>

                  <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                    <span style={{ fontSize: '0.68rem', color: '#15803d', display: 'block', fontWeight: 800 }}>
                      {isAr ? 'صافي مكسب المكتب المحقق:' : 'Recognized Gross Profit:'}
                    </span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803d', marginTop: '0.15rem', fontVariantNumeric: 'tabular-nums' }}>
                      {simProfit.formatEGP(isAr)}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 700 }}>
                      {isAr ? `ينزل فوراً كربح محقق بالدفاتر بنسبة ${grossMarginPct}%` : `Net Margin ratio: ${grossMarginPct}%`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. BALANCED GL JOURNAL ENTRY TEMPLATE */}
              <div style={{
                background: 'rgba(184, 144, 62, 0.04)',
                border: '1px solid rgba(184, 144, 62, 0.22)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#946f23', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <BookOpen size={14} />
                  <span>{isAr ? 'القيد المحاسبي المولد آلياً عند تسليم الشقة:' : 'Standard Handover Journal Entry:'}</span>
                </div>

                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                  fontSize: '0.74rem',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a' }}>
                    <span>{isAr ? 'من حـ/ تكلفة مباني الشقق المسلمة (501000)' : 'Dr 501000 (Cost of Sales)'}</span>
                    <strong style={{ color: '#946f23' }}>{simCOGS.formatEGP(isAr)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>{isAr ? 'إلى حـ/ مصاريف ومباني المشروعات تحت التنفيذ (105000)' : 'Cr 105000 (Construction WIP)'}</span>
                    <strong>{simCOGS.formatEGP(isAr)}</strong>
                  </div>
                  <div style={{ borderTop: '1px dashed #e2e8f0', marginTop: '0.2rem', paddingTop: '0.35rem', display: 'flex', justifyContent: 'space-between', color: '#0f172a' }}>
                    <span>{isAr ? 'من حـ/ مقدمات وأقساط حجز الشقق (203000)' : 'Dr 203000 (Deferred Revenue)'}</span>
                    <strong>{simVal.formatEGP(isAr)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                    <span>{isAr ? 'إلى حـ/ مبيعات الشقق المحققة (401000)' : 'Cr 401000 (Realized Revenue)'}</span>
                    <strong style={{ color: '#15803d' }}>{simVal.formatEGP(isAr)}</strong>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        {/* ========================================================================= */}
        {/* RESCISSION INSPECTOR MODE                                                */}
        {/* ========================================================================= */}
        {payload.type === 'rescission' && (
          <>
            <div className={styles.cardMetricsRow}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {isAr ? 'الغرامة المحتجزة (Forfeiture):' : 'Penalty Retained:'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MoneyCell amount={payload.rescission.penalty_retained} isAr={isAr} highlight />
                  <LegalVerificationTag label={isAr ? '١٠٪' : '10%'} isAr={isAr} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {isAr ? 'صافي رد العميل (206200):' : 'Net Refund (206200):'}
                </div>
                <MoneyCell amount={payload.rescission.net_refund_liability} isAr={isAr} highlight />
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '10px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div>
                <span style={{ color: '#64748b' }}>{isAr ? 'المسار المحاسبي:' : 'Branch:'} </span>
                <strong style={{ color: '#946f23' }}>
                  {payload.rescission.branch === 'Pre-Delivery' 
                    ? (isAr ? 'المسار ١: فسخ قبل التسليم (Branch 1)' : 'Branch 1: Pre-Delivery Cancellation')
                    : (isAr ? 'المسار ٢: استرداد بعد التسليم (Branch 2)' : 'Branch 2: Post-Delivery Repossession')}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>{isAr ? 'حالة الوحدة المستردة:' : 'Unit State:'} </span>
                <StatusBadge domain="unit" status={payload.rescission.unit_state} isAr={isAr} />
              </div>
              <div>
                <span style={{ color: '#64748b' }}>{isAr ? 'إجمالي ثمن الشقة الأصلي بالعقد:' : 'Original Gross Value:'} </span>
                <MoneyCell amount={payload.rescission.gross_contract_value} isAr={isAr} />
              </div>
              <div>
                <span style={{ color: '#64748b' }}>{isAr ? 'إجمالي ما سدده العميل نقدياً:' : 'Total Cash Collected:'} </span>
                <MoneyCell amount={payload.rescission.total_cash_collected} isAr={isAr} />
              </div>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* JOURNAL ENTRY INSPECTOR MODE                                             */}
        {/* ========================================================================= */}
        {payload.type === 'journal' && (
          <JournalEntryPreview entry={payload.entry} isDraft={false} isAr={isAr} />
        )}
      </div>

      {/* 3. ELEVATED CONTEXTUAL ACTION FOOTER */}
      <div className={styles.inspectorFooter}>
        {payload.type === 'contract' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button 
                type="button"
                className={styles.actionBtnSecondary} 
                onClick={() => onOpenEscalation && onOpenEscalation(payload.contract)}
                disabled={isMutating || payload.contract.status !== 'Active'}
                style={{
                  padding: '0.55rem 0.95rem',
                  fontSize: '0.78rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#334155'
                }}
              >
                <TrendingUp size={14} color="#946f23" />
                <span>{isAr ? 'طلب تعديل أو زيادة سعر العقد' : 'Request Escalation'}</span>
              </button>

              {payload.contract.status === 'Rescinded' ? (
                <button 
                  type="button"
                  className={styles.actionBtnPrimary}
                  style={{ 
                    background: 'rgba(184, 144, 62, 0.12)', 
                    border: '1px solid rgba(184, 144, 62, 0.3)', 
                    color: '#946f23',
                    padding: '0.55rem 0.95rem',
                    fontSize: '0.78rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    onClose();
                    onNavigateToTab && onNavigateToTab('rescissions');
                  }}
                >
                  <RotateCcw size={14} />
                  <span>{isAr ? 'الانتقال إلى سجل فسخ العقود' : 'Go to Rescissions Registry'}</span>
                </button>
              ) : (
                <button 
                  type="button"
                  style={{ 
                    background: '#fef2f2', 
                    border: '1px solid #fecaca', 
                    color: '#dc2626',
                    borderRadius: '8px',
                    padding: '0.55rem 0.95rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: isMutating || payload.contract.status !== 'Active' ? 'not-allowed' : 'pointer',
                    opacity: isMutating || payload.contract.status !== 'Active' ? 0.6 : 1,
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => onOpenRescission && onOpenRescission(payload.contract)}
                  disabled={isMutating || payload.contract.status !== 'Active'}
                >
                  <RotateCcw size={14} />
                  <span>{isAr ? 'فسخ العقد وتسوية المسترد' : 'Rescind Contract'}</span>
                </button>
              )}

              {onOpenSupplement && (
                <button 
                  type="button"
                  style={{ 
                    background: '#fdf8ef', 
                    border: '1px solid rgba(184, 144, 62, 0.4)', 
                    color: '#946f23',
                    borderRadius: '8px',
                    padding: '0.55rem 0.95rem',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: isMutating || payload.contract.status !== 'Active' ? 'not-allowed' : 'pointer',
                    opacity: isMutating || payload.contract.status !== 'Active' ? 0.6 : 1,
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => onOpenSupplement(payload.contract)}
                  disabled={isMutating || payload.contract.status !== 'Active'}
                >
                  <Plus size={14} />
                  <span>{isAr ? '+ إضافة ملحق أو دفعة جديدة' : '+ Add Supplement'}</span>
                </button>
              )}
            </div>

            <button 
              type="button"
              className={styles.actionBtnSecondary} 
              onClick={onClose}
              style={{ padding: '0.55rem 0.95rem', fontSize: '0.78rem' }}
            >
              <span>{isAr ? 'إغلاق الفاحص' : 'Close'}</span>
            </button>
          </div>
        )}

        {payload.type === 'cheque' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {payload.linkedContract && onInspectContract && (
                <button
                  type="button"
                  className={styles.actionBtnSecondary}
                  onClick={() => onInspectContract(payload.linkedContract!)}
                  style={{ fontSize: '0.78rem', padding: '0.55rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <FileText size={14} color="#946f23" />
                  <span>{isAr ? 'فتح ملف العقد' : 'View Contract'}</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {payload.cheque.status !== 'Cleared' ? (
                <button 
                  className={styles.actionBtnPrimary}
                  onClick={() => onUpdateChequeStatus && onUpdateChequeStatus(payload.cheque.cheque_id, 'Cleared')}
                  disabled={isMutating}
                  style={{
                    padding: '0.55rem 1.15rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                    border: '1px solid #15803d',
                    color: '#ffffff'
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>{isAr ? 'تسجيل تحصيل القسط (كاش / إنستاباي)' : 'Mark Collected'}</span>
                </button>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  background: '#f0fdf4',
                  color: '#15803d',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  border: '1px solid #bbf7d0'
                }}>
                  <CheckCircle2 size={14} />
                  <span>{isAr ? 'تم التحصيل ومقيد بالخزينة (١٠١٠٠٠)' : 'Collected in safe (101000)'}</span>
                </div>
              )}

              <button className={styles.actionBtnSecondary} onClick={onClose} style={{ fontSize: '0.78rem', padding: '0.55rem 0.85rem' }}>
                <span>{isAr ? 'إغلاق الفاحص' : 'Close'}</span>
              </button>
            </div>
          </div>
        )}

        {payload.type === 'tax' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {payload.linkedContract && onInspectContract && (
                <button
                  type="button"
                  className={styles.actionBtnSecondary}
                  onClick={() => onInspectContract(payload.linkedContract!)}
                  style={{ fontSize: '0.78rem', padding: '0.55rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <FileText size={14} color="#946f23" />
                  <span>{isAr ? 'فتح ملف العقد' : 'View Contract'}</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {payload.tax.remittance_status !== 'Remitted to ETA' && (
                <button 
                  className={styles.actionBtnPrimary}
                  onClick={() => onRemitTax && onRemitTax(payload.tax.tax_id)}
                  disabled={isMutating}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    padding: '0.55rem 0.95rem',
                    fontSize: '0.78rem'
                  }}
                >
                  <Landmark size={14} />
                  <span>{isAr ? 'سداد وتوريد للمصلحة' : 'Remit to ETA'}</span>
                </button>
              )}

              {payload.tax.remittance_status === 'Remitted to ETA' && (
                <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={15} />
                  <span>{isAr ? 'تم التوريد والسداد بالكامل' : 'Remitted to ETA'}</span>
                </span>
              )}

              <button className={styles.actionBtnSecondary} onClick={onClose} style={{ fontSize: '0.78rem', padding: '0.55rem 0.85rem' }}>
                <span>{isAr ? 'إغلاق الفاحص' : 'Close'}</span>
              </button>
            </div>
          </div>
        )}

        {payload.type === 'rsv' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
              {isAr ? 'حسابات معتمدة وموثقة بدفتر اليومية للشركة' : 'Audited and locked in company ledger'}
            </div>
            <button className={styles.actionBtnSecondary} onClick={onClose} style={{ fontSize: '0.78rem', padding: '0.55rem 0.95rem' }}>
              <span>{isAr ? 'إغلاق الفاحص' : 'Close'}</span>
            </button>
          </div>
        )}

        {payload.type !== 'contract' && payload.type !== 'cheque' && payload.type !== 'tax' && payload.type !== 'rsv' && (
          <button className={styles.actionBtnSecondary} onClick={onClose}>
            <span>{isAr ? 'إغلاق الفاحص' : 'Close Inspector'}</span>
          </button>
        )}
      </div>
    </div>
  </>
  );
};
