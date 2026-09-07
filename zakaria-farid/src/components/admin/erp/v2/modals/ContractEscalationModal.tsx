'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  X, 
  Loader2, 
  FileText, 
  Building2, 
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Search,
  User,
  Check,
  Sparkles
} from 'lucide-react';
import { ERPContract } from '@/lib/erp/types';
import { D, formatEGP } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';

export interface ContractEscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ERPContract | null;
  contracts?: ERPContract[];
  onConfirmEscalation: (deltaAmount: string, reason: string, targetContract?: ERPContract) => Promise<void>;
  isMutating?: boolean;
  isAr?: boolean;
}

export const ContractEscalationModal: React.FC<ContractEscalationModalProps> = ({
  isOpen,
  onClose,
  contract,
  contracts = [],
  onConfirmEscalation,
  isMutating = false,
  isAr = true
}) => {
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [delta, setDelta] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Auto-initialize selected contract
  useEffect(() => {
    if (isOpen) {
      if (contract && contract.contract_id) {
        setSelectedContractId(contract.contract_id);
      } else if (contracts.length > 0 && (!selectedContractId || !contracts.some(c => c.contract_id === selectedContractId))) {
        setSelectedContractId(contracts[0].contract_id);
      }
      setDelta('');
      setReason('');
      setError('');
      setSearchQuery('');
    }
  }, [isOpen, contract, contracts]);

  // Determine active contract
  const activeContract = useMemo(() => {
    if (contracts.length > 0) {
      return contracts.find(c => c.contract_id === selectedContractId) || contract || contracts[0];
    }
    return contract;
  }, [contracts, selectedContractId, contract]);

  // Master list of contracts
  const contractList = useMemo(() => {
    if (contracts.length > 0) return contracts;
    return contract ? [contract] : [];
  }, [contracts, contract]);

  const filteredContracts = useMemo(() => {
    return contractList.filter(c => {
      if (statusFilter === 'active' && c.handover_status === 'Delivered') return false;
      if (statusFilter === 'delivered' && c.handover_status !== 'Delivered') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (c.buyer_name || '').toLowerCase().includes(q);
        const matchNo = (c.contract_number || '').toLowerCase().includes(q);
        const matchUnit = (c.unit_id || '').toLowerCase().includes(q);
        return matchName || matchNo || matchUnit;
      }
      return true;
    });
  }, [contractList, statusFilter, searchQuery]);

  if (!isOpen || !activeContract) return null;

  const currentGross = D(activeContract.gross_contract_value || '0');
  const deltaNum = parseFloat(delta) || 0;
  const newGross = currentGross.plus(deltaNum);
  const totalPaid = D(activeContract.total_cash_collected || '0');
  const remainingBal = currentGross.minus(totalPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delta || deltaNum <= 0) {
      setError(isAr ? 'يرجى إدخال قيمة زيادة صالحة أكبر من الصفر' : 'Please enter a valid escalation amount');
      return;
    }
    if (!reason.trim()) {
      setError(isAr ? 'يرجى كتابة المبرر الهندسي أو السعري للتعديل' : 'Please provide the escalation rationale');
      return;
    }

    try {
      await onConfirmEscalation(delta.trim(), reason.trim(), activeContract);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
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
          maxWidth: '1100px',
          height: 'min(820px, 94vh)',
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
          padding: '1.1rem 1.75rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(184, 144, 62, 0.18) 0%, rgba(184, 144, 62, 0.06) 100%)',
              border: '1px solid rgba(184, 144, 62, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#946f23',
              flexShrink: 0
            }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'تصعيد وتعديل قيمة العقد (Delta V - ملحق تعاقدي)' : 'Contract Value Escalation (Delta V - Addendum)'}
                </h3>
                <span style={{
                  background: 'rgba(184, 144, 62, 0.12)',
                  color: '#946f23',
                  border: '1px solid rgba(184, 144, 62, 0.25)',
                  padding: '0.18rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  {isAr ? 'إصدار ثانٍ موثق' : 'Append-Only v2'}
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                {isAr 
                  ? 'إثبات الزيادة السعرية أو فروق التشطيب وتعديل القيمة الإجمالية مع ترحيل قيد تسوية للإيراد المؤجل (٢٠٢٠٠٠).' 
                  : 'Record contract price adjustments and generate revised installment schedules without affecting paid dues.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              color: '#64748b',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            2. TWO-SIDED MASTER-DETAIL GRID
            ══════════════════════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '390px 1fr',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}>

          {/* ──────────────────────────────────────────────────────────────────
              SIDE 1 (MASTER): SEARCHABLE LIST OF CONTRACTS
              ────────────────────────────────────────────────────────────────── */}
          <div style={{
            background: '#f8fafc',
            borderLeft: isAr ? '1px solid #e2e8f0' : 'none',
            borderRight: isAr ? 'none' : '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Search and Filters Header */}
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

              {/* Status Tabs */}
              <div style={{ display: 'flex', gap: '0.35rem', background: '#e2e8f0', padding: '0.2rem', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  style={{
                    flex: 1,
                    padding: '0.35rem',
                    fontSize: '0.72rem',
                    fontWeight: statusFilter === 'all' ? 700 : 500,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: statusFilter === 'all' ? '#ffffff' : 'transparent',
                    color: statusFilter === 'all' ? '#0f172a' : '#64748b',
                    boxShadow: statusFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  {isAr ? 'الكل' : 'All'} ({contractList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  style={{
                    flex: 1,
                    padding: '0.35rem',
                    fontSize: '0.72rem',
                    fontWeight: statusFilter === 'active' ? 700 : 500,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: statusFilter === 'active' ? '#ffffff' : 'transparent',
                    color: statusFilter === 'active' ? '#0f172a' : '#64748b',
                    boxShadow: statusFilter === 'active' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  {isAr ? 'ساري' : 'Active'}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('delivered')}
                  style={{
                    flex: 1,
                    padding: '0.35rem',
                    fontSize: '0.72rem',
                    fontWeight: statusFilter === 'delivered' ? 700 : 500,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: statusFilter === 'delivered' ? '#ffffff' : 'transparent',
                    color: statusFilter === 'delivered' ? '#0f172a' : '#64748b',
                    boxShadow: statusFilter === 'delivered' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  {isAr ? 'تم التسليم' : 'Delivered'}
                </button>
              </div>
            </div>

            {/* Scrollable List of Contracts */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredContracts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                  {isAr ? 'لا توجد عقود مطابقة للبحث' : 'No matching contracts found'}
                </div>
              ) : (
                filteredContracts.map((c) => {
                  const isSelected = c.contract_id === activeContract.contract_id;
                  const grossVal = D(c.gross_contract_value || '0');

                  return (
                    <div
                      key={c.contract_id}
                      onClick={() => setSelectedContractId(c.contract_id)}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '12px',
                        border: isSelected ? '1.5px solid #b8903e' : '1px solid #e2e8f0',
                        background: '#ffffff',
                        boxShadow: isSelected 
                          ? '0 4px 12px rgba(184, 144, 62, 0.12), 0 0 0 1px rgba(184, 144, 62, 0.25)' 
                          : '0 1px 3px rgba(0,0,0,0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                        position: 'relative'
                      }}
                    >
                      {/* Top row: Client Name & Status Badge */}
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
                          background: c.handover_status !== 'Delivered' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                          color: c.handover_status !== 'Delivered' ? '#059669' : '#2563eb',
                          border: `1px solid ${c.handover_status !== 'Delivered' ? 'rgba(5, 150, 105, 0.2)' : 'rgba(37, 99, 235, 0.2)'}`,
                          flexShrink: 0
                        }}>
                          {c.handover_status !== 'Delivered' ? (isAr ? 'ساري' : 'Active') : (isAr ? 'تم التسليم' : 'Delivered')}
                        </span>
                      </div>

                      {/* Middle row: Unit ID & Contract Number */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.74rem', color: '#64748b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Building2 size={12} />
                          {c.unit_id}
                        </span>
                        <span>•</span>
                        <span>{c.contract_number}</span>
                      </div>

                      {/* Bottom row: Gross Contract Value */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #f1f5f9', paddingTop: '0.35rem', marginTop: '0.15rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {isAr ? 'القيمة الحالية:' : 'Gross Value:'}
                        </span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {formatEGP(grossVal.toString())} ج.م
                        </span>
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
              SIDE 2 (DETAIL): ESCALATION FORM & REAL-TIME IMPACT
              ────────────────────────────────────────────────────────────────── */}
          <div style={{
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}>
            <form onSubmit={handleSubmit} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', boxSizing: 'border-box' }}>
              
              {/* Error Banner */}
              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  color: '#dc2626',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Active Contract Dossier HUD */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1rem 1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem'
              }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', marginBottom: '0.2rem' }}>
                    {isAr ? 'القيمة التعاقدية الحالية (V):' : 'Current Gross Value (V):'}
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 900 }}>
                    <MoneyCell amount={activeContract.gross_contract_value} isAr={isAr} />
                  </strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', marginBottom: '0.2rem' }}>
                    {isAr ? 'المحصل نقداً بالخزينة (C):' : 'Cash Collected (C):'}
                  </span>
                  <strong style={{ color: '#059669', fontSize: '1.05rem', fontWeight: 900 }}>
                    <MoneyCell amount={activeContract.total_cash_collected || '0'} isAr={isAr} />
                  </strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', marginBottom: '0.2rem' }}>
                    {isAr ? 'المتبقي أقساط مستحقة:' : 'Outstanding Dues:'}
                  </span>
                  <strong style={{ color: '#b8903e', fontSize: '1.05rem', fontWeight: 900 }}>
                    <MoneyCell amount={remainingBal.toString()} isAr={isAr} />
                  </strong>
                </div>
              </div>

              {/* Escalation Delta Input */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <TrendingUp size={15} color="#946f23" />
                  <span>{isAr ? 'قيمة الزيادة المعتمدة للعقد (Delta V بالجنيه المصري) *' : 'Escalation Amount (Delta V in EGP) *'}</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number"
                    step="1000"
                    required
                    value={delta}
                    onChange={e => setDelta(e.target.value)}
                    placeholder={isAr ? 'مثال: 500000' : 'e.g. 500000'}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border: '1.5px solid #946f23',
                      background: '#fffdfa',
                      color: '#946f23',
                      fontSize: '1.15rem',
                      fontWeight: 900,
                      outline: 'none',
                      fontVariantNumeric: 'tabular-nums',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    [isAr ? 'left' : 'right']: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#946f23'
                  }}>
                    ج.م
                  </span>
                </div>
              </div>

              {/* Rationale Input */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem', display: 'block' }}>
                  {isAr ? 'مبرر التعديل الهندسي / السعري المعتمد *' : 'Engineering / Material Rationale *'}
                </label>
                <input 
                  type="text"
                  required
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={isAr ? 'مثال: تعديل مواصفات التشطيب وإضافة تشطيب ألترا سوبر لوكس وتعديلات معمارية' : 'e.g. Finishing specs upgrade and layout modifications'}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Projected Impact Preview Card */}
              {deltaNum > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(184, 144, 62, 0.08) 0%, rgba(184, 144, 62, 0.02) 100%)',
                  border: '1px solid rgba(184, 144, 62, 0.3)',
                  borderRadius: '14px',
                  padding: '1.1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Sparkles size={16} color="#946f23" />
                      <span style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 700 }}>
                        {isAr ? 'القيمة الإجمالية الجديدة بعد التصعيد:' : 'New Gross Contract Value:'}
                      </span>
                    </div>
                    <strong style={{ color: '#946f23', fontSize: '1.2rem', fontWeight: 900 }}>
                      <MoneyCell amount={newGross.toString()} isAr={isAr} highlight />
                    </strong>
                  </div>
                  
                  <div style={{ borderTop: '1px dashed rgba(184, 144, 62, 0.25)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>{isAr ? 'الزيادة الصافية المضافة:' : 'Net Delta Added:'}</span>
                    <span style={{ fontWeight: 800, color: '#059669' }}>+{formatEGP(deltaNum.toString())} ج.م</span>
                  </div>

                  <span style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4 }}>
                    {isAr 
                      ? '• سيتم ترحيل قيد تسوية دفتري للإيراد المؤجل (٢٠٢٠٠٠) وإصدار جدول أقساط معدل للأقساط المتبقية فقط دون المساس بما سُدد.' 
                      : '• An adjusting journal entry will be posted to deferred revenue (202000) and pending installments rescheduled.'}
                  </span>
                </div>
              )}

              {/* Statutory Notice */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                fontSize: '0.74rem',
                color: '#64748b',
                lineHeight: 1.45
              }}>
                <ShieldCheck size={16} color="#946f23" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <span>
                  {isAr
                    ? 'حوكمة العقود المالية: تعديل العقد لا يحذف النسخة السابقة وإنما يسجل كملحق تعاقدي رسمي (Amendment v2) مثبت بالدفاتر المحاسبية ومتاح للطباعة والمراجعة القانونية.'
                    : 'Statutory compliance: Modifications are registered as immutable append-only v2 amendments preserving historical audit trails.'}
                </span>
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
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isMutating}
                  style={{
                    background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.6rem 1.6rem',
                    borderRadius: '10px',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: isMutating ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 14px rgba(148, 111, 35, 0.3)'
                  }}
                >
                  {isMutating ? <Loader2 size={15} className="animate-spin" /> : <TrendingUp size={15} />}
                  <span>{isAr ? 'اعتماد التعديل والإصدار الثاني' : 'Commit & Save v2'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
