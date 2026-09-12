'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, 
  X, 
  Loader2, 
  AlertCircle, 
  ShieldAlert, 
  ArrowRight, 
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  Search,
  User,
  Building2,
  Check,
  Scale
} from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule, ERPAccountingPeriod } from '@/lib/erp/types';
import { RescissionEngine } from '@/lib/erp/rescission';
import { D, formatEGP } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { LegalVerificationTag } from '@/components/erp/LegalVerificationTag';
import { BranchDecisionCard } from '@/components/erp/BranchDecisionCard';
import { JournalEntryPreview } from '@/components/erp/JournalEntryPreview';

export interface RescissionSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ERPContract | null;
  contracts?: ERPContract[];
  schedules: ERPInstallmentSchedule[];
  activePeriod: ERPAccountingPeriod;
  onConfirmRescission: (details: {
    selectedBranch: 'Branch1_PreDelivery' | 'Branch2_PostDelivery';
    rescissionDate: string;
    targetContract?: ERPContract;
  }) => Promise<void>;
  isMutating?: boolean;
  isAr?: boolean;
}

export const RescissionSettlementModal: React.FC<RescissionSettlementModalProps> = ({
  isOpen,
  onClose,
  contract,
  contracts = [],
  schedules,
  activePeriod,
  onConfirmRescission,
  isMutating = false,
  isAr = true
}) => {
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<'Branch1_PreDelivery' | 'Branch2_PostDelivery'>('Branch1_PreDelivery');
  const [rescissionDate, setRescissionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [rescissionSuccess, setRescissionSuccess] = useState<{
    contractNumber: string;
    buyer: string;
    unitId: string;
    penaltyRetained: string;
    netRefundLiability: string;
    totalCashCollected: string;
    grossContractValue: string;
    branch: 'Branch1_PreDelivery' | 'Branch2_PostDelivery';
    rescissionDate: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (contract && contract.contract_id) {
        setSelectedContractId(contract.contract_id);
      } else if (contracts.length > 0 && (!selectedContractId || !contracts.some(c => c.contract_id === selectedContractId))) {
        setSelectedContractId(contracts[0].contract_id);
      }
      setSelectedBranch('Branch1_PreDelivery');
      setRescissionDate(new Date().toISOString().split('T')[0]);
      setSearchQuery('');
      setRescissionSuccess(null);
    }
  }, [isOpen, contract, contracts]);

  // Master list of contracts eligible for rescission (non-rescinded)
  const contractList = useMemo(() => {
    if (contracts.length > 0) return contracts;
    return contract ? [contract] : [];
  }, [contracts, contract]);

  const filteredContracts = useMemo(() => {
    return contractList.filter(c => {
      if (c.status === 'Rescinded') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (c.buyer_name || '').toLowerCase().includes(q);
        const matchNo = (c.contract_number || '').toLowerCase().includes(q);
        const matchUnit = (c.unit_id || '').toLowerCase().includes(q);
        return matchName || matchNo || matchUnit;
      }
      return true;
    });
  }, [contractList, searchQuery]);

  // Active contract resolution
  const activeContract = useMemo(() => {
    if (contracts.length > 0) {
      return contracts.find(c => c.contract_id === selectedContractId) || contract || contracts[0];
    }
    return contract;
  }, [contracts, selectedContractId, contract]);

  // Contract schedules for this active contract
  const contractSchedules = useMemo(() => {
    if (!activeContract) return [];
    return schedules.filter(s => s.contract_id === activeContract.contract_id);
  }, [schedules, activeContract]);

  // Compute rescission metrics
  const computed = useMemo(() => {
    if (!activeContract) return null;
    return RescissionEngine.processRescission(
      activeContract,
      contractSchedules,
      activePeriod,
      rescissionDate,
      D(activeContract.gross_contract_value).times('0.45').toFixed(),
      '501000',
      '151000',
      'CFO_FARID'
    );
  }, [activeContract, contractSchedules, activePeriod, rescissionDate]);

  if (!isOpen || !activeContract || !computed) return null;

  const preview = {
    grossContractValue: computed.rescissionRecord.gross_contract_value,
    totalCashCollected: computed.rescissionRecord.total_cash_collected,
    penaltyRetained: computed.rescissionRecord.penalty_retained,
    netRefundLiability: computed.rescissionRecord.net_refund_liability,
    journalEntry: computed.journalEntry
  };

  const handleSubmit = async () => {
    await onConfirmRescission({
      selectedBranch,
      rescissionDate,
      targetContract: activeContract
    });
    setRescissionSuccess({
      contractNumber: activeContract.contract_number,
      buyer: activeContract.buyer_name,
      unitId: activeContract.unit_id,
      penaltyRetained: computed.rescissionRecord.penalty_retained,
      netRefundLiability: computed.rescissionRecord.net_refund_liability,
      totalCashCollected: computed.rescissionRecord.total_cash_collected,
      grossContractValue: computed.rescissionRecord.gross_contract_value,
      branch: selectedBranch,
      rescissionDate
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.25rem',
      direction: isAr ? 'rtl' : 'ltr'
    }}>
      <div 
        style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '1180px',
          maxHeight: '90vh',
          height: 'min(880px, 90vh)',
          boxShadow: '0 25px 65px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ══════════════════════════════════════════════════════════════════════════
            1. TOP HEADER BAR
            ══════════════════════════════════════════════════════════════════════════ */}
        <div style={{
          padding: 'clamp(0.85rem, 2vw, 1.1rem) clamp(1rem, 2.5vw, 1.75rem)',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              flexShrink: 0
            }}>
              <RotateCcw size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'معالج فسخ العقد وتطبيق حد حظر مطالبة العميل بعجز إضافي (Forfeiture Floor)' : 'Contract Rescission & Forfeiture Floor Settlement'}
                </h3>
                <span style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  padding: '0.18rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  {isAr ? 'حد حظر مطالبة العميل بعجز إضافي' : 'Statutory Floor Engine'}
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                {isAr 
                  ? 'احتساب غرامة الفسخ القانونية (١٠٪) مع تطبيق حد حظر مطالبة العميل بعجز إضافي (العميل لن يُطالب بأي مبالغ إضافية إذا كانت مدفوعاته أقل من الغرامة)، ورد المستحق وإلغاء الأقساط المستقبلية تلقائياً.' 
                  : 'Calculate statutory penalty retention with Forfeiture Floor protection (client is never billed for deficits if payments were less than penalty).'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              color: '#64748b',
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            2. TWO-SIDED MASTER-DETAIL GRID
            ══════════════════════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
          flex: 1,
          minHeight: 0,
          overflowY: 'auto'
        }}>

          {/* ──────────────────────────────────────────────────────────────────
              SIDE 1 (MASTER): SEARCHABLE LIST OF ACTIVE CONTRACTS
              ────────────────────────────────────────────────────────────────── */}
          <div style={{
            background: '#f8fafc',
            borderLeft: isAr ? '1px solid #e2e8f0' : 'none',
            borderRight: isAr ? 'none' : '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Search Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder={isAr ? 'بحث بالعميل، كود العقد، أو الوحدة...' : 'Search client, contract or unit...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: isAr ? '0.55rem 2.2rem 0.55rem 0.85rem' : '0.55rem 0.85rem 0.55rem 2.2rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <Search size={15} style={{
                  position: 'absolute',
                  [isAr ? 'right' : 'left']: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8'
                }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                <span style={{ fontWeight: 700 }}>{isAr ? 'العقود النشطة القابلة للتسوية:' : 'Eligible Contracts:'}</span>
                <span style={{
                  background: '#e2e8f0',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '10px',
                  fontWeight: 800,
                  color: '#334155'
                }}>
                  {filteredContracts.length} {isAr ? 'عقد' : 'contracts'}
                </span>
              </div>
            </div>

            {/* Scrollable List of Contracts */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredContracts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                  {isAr ? 'لا توجد عقود نشطة مطابقة للبحث' : 'No matching active contracts found'}
                </div>
              ) : (
                filteredContracts.map((c) => {
                  const isSelected = c.contract_id === activeContract.contract_id;
                  const paidVal = D(c.total_cash_collected || '0');
                  const grossVal = D(c.gross_contract_value || '0');

                  return (
                    <div
                      key={c.contract_id}
                      onClick={() => setSelectedContractId(c.contract_id)}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '12px',
                        border: isSelected ? '1.5px solid #946f23' : '1px solid #e2e8f0',
                        background: '#ffffff',
                        boxShadow: isSelected 
                          ? '0 4px 14px rgba(148, 111, 35, 0.12), 0 0 0 1px rgba(148, 111, 35, 0.22)' 
                          : '0 1px 3px rgba(0,0,0,0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                        position: 'relative'
                      }}
                    >
                      {/* Client Name & Unit ID */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                          <User size={14} color="#64748b" style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.buyer_name}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.12rem 0.5rem',
                          borderRadius: '12px',
                          background: '#f8fafc',
                          color: '#334155',
                          border: '1px solid #e2e8f0',
                          flexShrink: 0
                        }}>
                          {c.unit_id}
                        </span>
                      </div>

                      {/* Contract Number */}
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {c.contract_number}
                      </div>

                      {/* Financial Footprint: Paid vs Total */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.5rem',
                        borderTop: '1px dashed #f1f5f9',
                        paddingTop: '0.4rem',
                        marginTop: '0.15rem',
                        fontSize: '0.72rem'
                      }}>
                        <div>
                          <span style={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>
                            {isAr ? 'المسدد بالخزينة:' : 'Paid:'}
                          </span>
                          <strong style={{ color: '#059669', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                            {formatEGP(paidVal.toString())} ج.م
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>
                            {isAr ? 'إجمالي العقد:' : 'Gross:'}
                          </span>
                          <strong style={{ color: '#0f172a', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                            {formatEGP(grossVal.toString())} ج.م
                          </strong>
                        </div>
                      </div>

                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          [isAr ? 'left' : 'right']: '0.6rem',
                          top: '0.6rem',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#946f23',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────────────
              SIDE 2 (DETAIL): RESCISSION DECISION, COMPUTATIONS & JOURNAL ENTRY
              ────────────────────────────────────────────────────────────────── */}
          <div style={{
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: 'clamp(1rem, 2.5vw, 1.75rem)',
            gap: '1.25rem'
          }}>
            {rescissionSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
                {/* Success Banner */}
                <div style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                  border: '1.5px solid rgba(5, 150, 105, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 4px 16px rgba(5, 150, 105, 0.08)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#059669',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 10px rgba(5, 150, 105, 0.3)'
                  }}>
                    <CheckCircle2 size={26} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#065f46' }}>
                      {isAr ? 'تم اعتماد فسخ العقد وترحيل قيود الرد المالي بنجاح' : 'Contract Rescission Successfully Posted'}
                    </h4>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#047857' }}>
                      {isAr 
                        ? 'تم إلغاء كافة الأقساط المتبقية وتحديث قيد الاسترداد بالدفاتر المحاسبية وأصبحت الوحدة متاحة لإعادة البيع.'
                        : 'Future installment schedules voided, statutory penalty retained, and net refund liability credited to ledger.'}
                    </p>
                  </div>
                </div>

                {/* Settlement Confirmation Card */}
                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building2 size={16} color="#946f23" />
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{rescissionSuccess.buyer}</strong>
                      <span style={{ fontSize: '0.76rem', color: '#64748b' }}>({rescissionSuccess.contractNumber})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        background: 'rgba(5, 150, 105, 0.1)',
                        color: '#047857',
                        border: '1px solid rgba(5, 150, 105, 0.25)',
                        padding: '0.15rem 0.6rem',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: 800
                      }}>
                        {isAr ? `الوحدة ${rescissionSuccess.unitId} (متاحة للبيع)` : `Unit ${rescissionSuccess.unitId} (Available)`}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                        {rescissionSuccess.rescissionDate}
                      </span>
                    </div>
                  </div>

                  {/* Financial Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem'
                  }}>
                    <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>
                        {isAr ? 'قيمة العقد الأصلية:' : 'Gross Contract Value:'}
                      </span>
                      <strong style={{ color: '#0f172a', fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums' }}>
                        {formatEGP(rescissionSuccess.grossContractValue)} ج.م
                      </strong>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>
                        {isAr ? 'إجمالي المحصل بالخزينة:' : 'Total Cash Collected:'}
                      </span>
                      <strong style={{ color: '#0f172a', fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums' }}>
                        {formatEGP(rescissionSuccess.totalCashCollected)} ج.م
                      </strong>
                    </div>

                    <div style={{ background: 'rgba(184, 144, 62, 0.08)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(184, 144, 62, 0.25)' }}>
                      <span style={{ color: '#946f23', fontSize: '0.7rem', fontWeight: 800, display: 'block' }}>
                        {isAr ? 'غرامة الفسخ المحتجزة (حد حظر مطالبة العميل بعجز إضافي):' : 'Retained Penalty (Forfeiture Floor):'}
                      </span>
                      <strong style={{ color: '#946f23', fontSize: '1.05rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                        {formatEGP(rescissionSuccess.penaltyRetained)} ج.م
                      </strong>
                      <span style={{ fontSize: '0.65rem', color: '#946f23', display: 'block', marginTop: '0.2rem' }}>
                        {isAr ? 'تم تطبيق حد حظر مطالبة العميل بعجز إضافي (Forfeiture Floor)' : 'Forfeiture Floor rule applied'}
                      </span>
                    </div>

                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                      <span style={{ color: '#047857', fontSize: '0.7rem', fontWeight: 800, display: 'block' }}>
                        {isAr ? 'صافي رد العميل المستحق (حساب 206200):' : 'Net Refund Liability (206200):'}
                      </span>
                      <strong style={{ color: '#059669', fontSize: '1.05rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                        {formatEGP(rescissionSuccess.netRefundLiability)} ج.م
                      </strong>
                    </div>
                  </div>

                  {/* Statutory & Procedural Banner */}
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.76rem',
                    color: '#475569',
                    lineHeight: 1.55
                  }}>
                    {isAr ? (
                      <>
                        📌 <strong>الإجراء المحاسبي المكتمل:</strong> تم تطبيق حد حظر مطالبة العميل بعجز إضافي (Forfeiture Floor) بحيث لا يُطالب العميل بأي عجز إضافي إذا كانت مدفوعاته أقل من الغرامة. تم ترحيل صافي المبلغ المسترد إلى ذمة العميل بحساب الالتزامات (206200)، وإثبات غرامة الفسخ كإيراد استثنائي محتجز، مع تحرير الوحدة السكنية للبيع مجدداً.
                      </>
                    ) : (
                      <>
                        📌 <strong>Accounting Audit:</strong> Forfeiture Floor applied (client is never billed for deficits). Net refund credited to buyer liability account (206200), penalty retained as miscellaneous gain, and unit unlocked for new sales contracts.
                      </>
                    )}
                  </div>
                </div>

                {/* Anchored Footer Buttons */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.65rem',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '1.25rem',
                  marginTop: 'auto'
                }}>
                  <button
                    type="button"
                    onClick={() => setRescissionSuccess(null)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      padding: '0.6rem 1.25rem',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      minHeight: '44px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>{isAr ? 'معالجة عقد آخر' : 'Process Another Contract'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.6rem 1.6rem',
                      borderRadius: '10px',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      minHeight: '44px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{isAr ? 'تم / إغلاق النافذة' : 'Done / Close Window'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Active Contract Header Dossier Strip */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building2 size={16} color="#946f23" />
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                        {activeContract.buyer_name}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        ({activeContract.contract_number} • {activeContract.unit_id})
                      </span>
                    </div>
                  </div>

                  {/* Effective Rescission Date Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={13} />
                      <span>{isAr ? 'تاريخ الفسخ المعتمد:' : 'Effective Date:'}</span>
                    </label>
                    <input 
                      type="date"
                      value={rescissionDate}
                      onChange={e => setRescissionDate(e.target.value)}
                      style={{
                        padding: '0.4rem 0.65rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.78rem',
                        outline: 'none'
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Rescission Decision Cards (Branch 1 Pre-delivery vs Branch 2 Post-delivery) */}
                <BranchDecisionCard 
                  contract={activeContract}
                  selectedBranch={selectedBranch}
                  onSelectBranch={setSelectedBranch}
                  isAr={isAr}
                />

                {/* 4-Box Financial Split HUD */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1.15rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1rem'
                }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>
                      {isAr ? 'قيمة العقد الإجمالية (V):' : 'Gross Contract Value (V):'}
                    </span>
                    <strong style={{ color: '#0f172a', fontSize: '1rem' }}>
                      <MoneyCell amount={preview.grossContractValue} isAr={isAr} />
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>
                      {isAr ? 'المحصل نقداً حتى الآن (C):' : 'Total Cash Collected (C):'}
                    </span>
                    <strong style={{ color: '#0f172a', fontSize: '1rem' }}>
                      <MoneyCell amount={preview.totalCashCollected} isAr={isAr} />
                    </strong>
                  </div>

                  <div style={{
                    background: 'rgba(184, 144, 62, 0.08)',
                    border: '1px solid rgba(184, 144, 62, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ color: '#946f23', fontSize: '0.7rem', fontWeight: 800 }}>
                        {isAr ? 'غرامة الفسخ المحتجزة (حد حظر مطالبة العميل بعجز إضافي):' : 'Retained Penalty (Forfeiture Floor):'}
                      </span>
                      <LegalVerificationTag label={isAr ? 'حد أقصى ١٠٪' : '10% Floor'} isAr={isAr} />
                    </div>
                    <strong style={{ color: '#946f23', fontSize: '1.1rem', fontWeight: 900 }}>
                      <MoneyCell amount={preview.penaltyRetained} isAr={isAr} highlight />
                    </strong>
                    <span style={{ fontSize: '0.66rem', color: '#946f23', display: 'block', marginTop: '0.3rem', lineHeight: 1.4 }}>
                      {isAr 
                        ? '🛡️ حد حظر مطالبة العميل بعجز إضافي (Forfeiture Floor): العميل لن يُطالب بأي مبالغ إضافية إذا كانت مدفوعاته أقل من الغرامة.'
                        : 'Forfeiture Floor: Client will never be asked to pay additional deficits if payments were less than the penalty.'}
                    </span>
                  </div>

                  <div style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '10px',
                    padding: '0.75rem'
                  }}>
                    <span style={{ color: '#047857', fontSize: '0.7rem', fontWeight: 800, display: 'block', marginBottom: '0.2rem' }}>
                      {isAr ? 'صافي رد العميل المستحق (حساب 206200):' : 'Net Refund Liability (206200):'}
                    </span>
                    <strong style={{ color: '#059669', fontSize: '1.1rem', fontWeight: 900 }}>
                      <MoneyCell amount={preview.netRefundLiability} isAr={isAr} />
                    </strong>
                  </div>
                </div>

                {/* Journal Entry Preview */}
                <JournalEntryPreview entry={preview.journalEntry} isDraft={true} isAr={isAr} />

                {/* Anchored Footer Buttons */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.65rem',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '1.25rem',
                  marginTop: 'auto'
                }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#64748b',
                      padding: '0.6rem 1.25rem',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      minHeight: '44px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isMutating}
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.6rem 1.6rem',
                      borderRadius: '10px',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: isMutating ? 'not-allowed' : 'pointer',
                      minHeight: '44px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    {isMutating ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                    <span>{isAr ? 'تأكيد الفسخ وترحيل القيد بالدفاتر' : 'Confirm & Post Rescission Entry'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
