'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wallet, 
  X, 
  Check, 
  CheckCircle2,
  FileText, 
  ShieldCheck, 
  Loader2,
  Clock,
  Search,
  Building2,
  Plus,
  Calendar,
  DollarSign,
  Receipt,
  Sparkles,
  Hammer,
  Compass,
  ScrollText,
  Zap,
  ArrowRight,
  Filter,
  Lock,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { D } from '@/lib/erp/math';
import { toast } from 'sonner';
import { localizeBuyerName } from '@/components/erp/JournalEntryPreview';

export type SupplementType = 
  | 'extra_finishing' 
  | 'architectural_alterations' 
  | 'transfer_admin_fees' 
  | 'contract_annex' 
  | 'emergency_due';

export interface SupplementData {
  contractId: string;
  supplementType: SupplementType;
  supplementReasonAr: string;
  amount: string;
  dueDate: string;
  receiptNumber: string;
  notes: string;
}

export interface NewChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: ERPContract[];
  schedules: ERPInstallmentSchedule[];
  properties?: Property[];
  initialContractId?: string | null;
  onSaveSupplement?: (data: SupplementData) => Promise<void>;
  // Backwards compatibility with previous signature
  onSaveCheque?: (itemData: {
    contractId: string;
    scheduleId?: string;
    chequeNumber: string;
    bankName: string;
    drawerName: string;
    nominalValue: string;
    dueDate: string;
  }) => Promise<void>;
  onInspectContract?: (contract: ERPContract) => void;
  isMutating?: boolean;
  isAr?: boolean;
}

const SUPPLEMENT_TYPES = [
  {
    id: 'extra_finishing' as SupplementType,
    labelAr: 'تشطيبات وديكورات إضافية',
    labelEn: 'Extra Finishing & Decor',
    descAr: 'أعمال تشطيب وديكور وتجهيزات خاصة متفق عليها لاحقاً',
    descEn: 'Post-contract luxury interior & finishings upgrade',
    icon: Hammer,
    color: '#15803d',
    bgColor: 'rgba(21, 128, 61, 0.05)',
    borderColor: 'rgba(21, 128, 61, 0.22)'
  },
  {
    id: 'architectural_alterations' as SupplementType,
    labelAr: 'تعديلات معمارية وإنشائية',
    labelEn: 'Architectural Alterations',
    descAr: 'تعديل حوائط داخلية، فتح مساحات، أو تعديل تمديدات',
    descEn: 'Internal layout modification or MEP adjustments',
    icon: Compass,
    color: '#334155',
    bgColor: 'rgba(51, 65, 85, 0.05)',
    borderColor: 'rgba(51, 65, 85, 0.22)'
  },
  {
    id: 'transfer_admin_fees' as SupplementType,
    labelAr: 'رسوم تنازل ومصاريف إدارية',
    labelEn: 'Assignment & Admin Fees',
    descAr: 'رسوم نقل ملكية، توثيق ملحق، أو مصاريف إدارية معتمدة',
    descEn: 'Unit assignment fee or legal documentation charges',
    icon: ScrollText,
    color: '#946f23',
    bgColor: 'rgba(184, 144, 62, 0.06)',
    borderColor: 'rgba(184, 144, 62, 0.25)'
  },
  {
    id: 'contract_annex' as SupplementType,
    labelAr: 'ملحق تعاقدي / دفعة مكملة',
    labelEn: 'Contract Annex / Tranche',
    descAr: 'ملحق اتفاق مالي مكمل لأصل العقد لزيادة الدفعات',
    descEn: 'Official contract addendum adding scheduled tranches',
    icon: FileText,
    color: '#854d0e',
    bgColor: 'rgba(133, 77, 14, 0.05)',
    borderColor: 'rgba(133, 77, 14, 0.22)'
  },
  {
    id: 'emergency_due' as SupplementType,
    labelAr: 'دفعة أو بند استحقاق طارئ',
    labelEn: 'Emergency Due / Misc',
    descAr: 'أي مستحق مالي إضافي أو تسوية خاصة متفق عليها',
    descEn: 'Miscellaneous custom due agreed upon with client',
    icon: Zap,
    color: '#991b1b',
    bgColor: 'rgba(153, 27, 27, 0.05)',
    borderColor: 'rgba(153, 27, 27, 0.22)'
  }
];

export const NewChequeModal: React.FC<NewChequeModalProps> = ({
  isOpen,
  onClose,
  contracts = [],
  schedules = [],
  properties = [],
  initialContractId = null,
  onSaveSupplement,
  onSaveCheque,
  onInspectContract,
  isMutating = false,
  isAr = true
}) => {
  // Check if contract has finished installments and is closed / delivered
  const isContractClosed = (c: ERPContract) => {
    if (c.status === 'Completed' || c.status === 'Rescinded') return true;
    if (c.handover_status === 'Delivered') return true;
    const pendingSchedules = schedules.filter(
      s => s.contract_id === c.contract_id && (s.status === 'Pending' || s.status === 'Defaulted' || s.status === 'Partially Paid')
    );
    const collected = D(c.total_cash_collected || '0');
    const gross = D(c.gross_contract_value || '0');
    if (pendingSchedules.length === 0 && collected.gte(gross) && gross.gt(0)) {
      return true;
    }
    return false;
  };

  // Selected contract state (defaults to active contracts that are pending payment)
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [contractSearchQuery, setContractSearchQuery] = useState<string>('');
  const [contractFilter, setContractFilter] = useState<'active' | 'closed' | 'all'>('active');

  // Supplement Form state
  const [supplementType, setSupplementType] = useState<SupplementType>('extra_finishing');
  const [amount, setAmount] = useState<string>('150000');
  const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [supplementSuccess, setSupplementSuccess] = useState<{
    contractNumber: string;
    buyer: string;
    unit: string;
    amount: string;
    type: string;
    dueDate: string;
  } | null>(null);

  // Auto-initialize selected contract when opening modal (prefer active contracts)
  useEffect(() => {
    if (isOpen) {
      setSupplementSuccess(null);
      if (initialContractId && contracts.some(c => c.contract_id === initialContractId)) {
        setSelectedContractId(initialContractId);
      } else if (contracts.length > 0 && (!selectedContractId || !contracts.some(c => c.contract_id === selectedContractId))) {
        const firstActive = contracts.find(c => !isContractClosed(c)) || contracts[0];
        setSelectedContractId(firstActive.contract_id);
      }
    } else {
      setSupplementSuccess(null);
    }
  }, [isOpen, initialContractId, contracts, schedules]);

  // The active contract
  const activeContract = useMemo(() => {
    return contracts.find(c => c.contract_id === selectedContractId) || contracts[0] || null;
  }, [contracts, selectedContractId]);

  // Existing tranches for active contract
  const activeContractSchedules = useMemo(() => {
    if (!activeContract) return [];
    return schedules
      .filter(s => s.contract_id === activeContract.contract_id && s.status !== 'Void')
      .sort((a, b) => a.tranche_number - b.tranche_number);
  }, [schedules, activeContract]);

  // Next tranche number
  const nextTrancheNumber = useMemo(() => {
    if (activeContractSchedules.length === 0) return 1;
    const maxNum = Math.max(...activeContractSchedules.map(s => s.tranche_number));
    return maxNum + 1;
  }, [activeContractSchedules]);

  // Auto-generate receipt/code when contract or supplement type changes
  useEffect(() => {
    if (activeContract) {
      const codeDigits = (activeContract.contract_number || '001').replace(/\D/g, '') || '101';
      const typeCode = supplementType === 'extra_finishing' ? 'FIN' 
        : supplementType === 'architectural_alterations' ? 'ARC'
        : supplementType === 'transfer_admin_fees' ? 'ADM'
        : supplementType === 'contract_annex' ? 'ANNEX'
        : 'DUE';
      setReceiptNumber(`SUP-${typeCode}-${codeDigits}-${String(nextTrancheNumber).padStart(2, '0')}`);
    }
  }, [activeContract, supplementType, nextTrancheNumber]);

  // Tafqeet in Arabic
  const tafqeetText = useMemo(() => {
    return tafqeetEGP(amount || '0');
  }, [amount]);

  // Financial impact calculation
  const currentGross = activeContract ? D(activeContract.gross_contract_value || '0') : D(0);
  const addAmount = useMemo(() => {
    try {
      const val = parseFloat(amount);
      return isNaN(val) || val <= 0 ? D(0) : D(amount);
    } catch {
      return D(0);
    }
  }, [amount]);
  const newGross = useMemo(() => currentGross.plus(addAmount), [currentGross, addAmount]);

  // Active vs Closed contract counts
  const contractCounts = useMemo(() => {
    const valid = contracts.filter(c => c.status !== 'Rescinded');
    const active = valid.filter(c => !isContractClosed(c)).length;
    const closed = valid.filter(c => isContractClosed(c)).length;
    return {
      all: valid.length,
      active,
      closed
    };
  }, [contracts, schedules]);

  // Active contract remaining balance to be collected
  const activeContractRemaining = useMemo(() => {
    if (!activeContract) return D(0);
    const gross = D(activeContract.gross_contract_value || '0');
    const collected = D(activeContract.total_cash_collected || '0');
    const rem = gross.minus(collected);
    return rem.gt(0) ? rem : D(0);
  }, [activeContract]);

  // Whether active contract is closed / delivered
  const activeContractIsClosed = useMemo(() => {
    return activeContract ? isContractClosed(activeContract) : false;
  }, [activeContract, schedules]);

  // Filtered contracts list for Master Column
  const filteredContracts = useMemo(() => {
    let list = contracts.filter(c => c.status !== 'Rescinded');
    if (contractFilter === 'active') {
      list = list.filter(c => !isContractClosed(c));
    } else if (contractFilter === 'closed') {
      list = list.filter(c => isContractClosed(c));
    }

    if (contractSearchQuery.trim()) {
      const q = contractSearchQuery.trim().toLowerCase();
      list = list.filter(c => 
        (c.buyer_name || '').toLowerCase().includes(q) ||
        (c.contract_number || '').toLowerCase().includes(q) ||
        (c.unit_id || '').toLowerCase().includes(q) ||
        (c.buyer_national_id || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [contracts, contractFilter, contractSearchQuery, schedules]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContract) {
      toast.error(isAr ? 'يرجى اختيار العقد المرتبط' : 'Please select a contract');
      return;
    }
    if (isContractClosed(activeContract)) {
      toast.error(isAr ? 'عفوًا، لا يمكن إضافة التزامات أو ملاحق مالية لعقد مُسلَم ومقفل بالكامل' : 'Cannot add supplement to closed contract');
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast.error(isAr ? 'يرجى إدخال مبلغ صحيح للدفعة الإضافية' : 'Invalid supplement amount');
      return;
    }
    if (!dueDate) {
      toast.error(isAr ? 'يرجى تحديد تاريخ استحقاق الدفعة' : 'Please select a due date');
      return;
    }

    const typeConfig = SUPPLEMENT_TYPES.find(t => t.id === supplementType);
    const reasonTitle = isAr ? (typeConfig?.labelAr || 'ملحق تعاقدي') : (typeConfig?.labelEn || 'Contract Supplement');
    const fullNotes = customNotes.trim()
      ? `[${reasonTitle}]: ${customNotes.trim()}`
      : `[${reasonTitle}]: ملحق تعاقدي معتمد للوحدة ${activeContract.unit_id}`;

    const successPayload = {
      contractNumber: activeContract.contract_number,
      buyer: isAr ? localizeBuyerName(activeContract.buyer_name) : activeContract.buyer_name,
      unit: activeContract.unit_id,
      amount: D(amount).toFixed(2),
      type: reasonTitle,
      dueDate
    };

    if (onSaveSupplement) {
      await onSaveSupplement({
        contractId: activeContract.contract_id,
        supplementType,
        supplementReasonAr: reasonTitle,
        amount: D(amount).toFixed(2),
        dueDate,
        receiptNumber: receiptNumber.trim() || `SUP-${Date.now().toString().slice(-4)}`,
        notes: fullNotes
      });
    } else if (onSaveCheque) {
      await onSaveCheque({
        contractId: activeContract.contract_id,
        chequeNumber: receiptNumber.trim() || `SUP-${Date.now().toString().slice(-4)}`,
        bankName: isAr ? 'الخزينة الرئيسية (أمانات نقداً باليد - 101000)' : 'Main Safe (Cash by Hand - 101000)',
        drawerName: activeContract.buyer_name,
        nominalValue: D(amount).toFixed(2),
        dueDate
      });
    }

    setSupplementSuccess(successPayload);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)',
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
          maxWidth: '1200px',
          height: 'min(880px, 94vh)',
          boxShadow: '0 25px 65px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* ══════════════════════════════════════════════════════════════════════════
            1. MODAL TOP HEADER BAR
            ══════════════════════════════════════════════════════════════════════════ */}
        <div style={{
          padding: '1.25rem 2rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(184, 144, 62, 0.18) 0%, rgba(184, 144, 62, 0.06) 100%)',
              border: '1px solid rgba(184, 144, 62, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#946f23',
              flexShrink: 0
            }}>
              <Plus size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                  {isAr ? 'إضافة ملحق أو دفعة إضافية للعقد' : 'Add Contract Supplement / Extra Tranche'}
                </h3>
                <span style={{
                  background: 'rgba(184, 144, 62, 0.1)',
                  color: '#946f23',
                  border: '1px solid rgba(184, 144, 62, 0.25)',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap'
                }}>
                  {isAr ? 'تشطيبات • تعديلات • مبالغ طارئة' : 'Finishing • Alterations • Annex'}
                </span>
              </div>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
                {isAr 
                  ? 'إثبات قسط أو التزام مالي جديد يضاف لأصل العقد وجدول السداد مع حوكمة الخزينة (١٠١٠٠٠) وبدون المساس بالأقساط المسددة.' 
                  : 'Append an extra tranche to contract gross value and installment schedule without altering cleared dues.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSupplementSuccess(null);
              onClose();
            }}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              color: '#64748b',
              width: '36px',
              height: '36px',
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
          gridTemplateColumns: '430px 1fr',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
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
            {/* Search and Filters Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder={isAr ? 'بحث بالعميل، كود العقد، أو الوحدة...' : 'Search client, contract or unit...'}
                  value={contractSearchQuery}
                  onChange={(e) => setContractSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: isAr ? '0.55rem 2.2rem 0.55rem 0.85rem' : '0.55rem 0.85rem 0.55rem 2.2rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.82rem',
                    outline: 'none'
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
              <div style={{ display: 'flex', gap: '0.35rem', background: '#e2e8f0', padding: '0.25rem', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => setContractFilter('active')}
                  style={{
                    flex: 1,
                    padding: '0.4rem 0.3rem',
                    fontSize: '0.72rem',
                    fontWeight: contractFilter === 'active' ? 800 : 600,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: contractFilter === 'active' ? '#ffffff' : 'transparent',
                    color: contractFilter === 'active' ? '#0f172a' : '#64748b',
                    boxShadow: contractFilter === 'active' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span>{isAr ? 'قيد السداد' : 'Active'}</span>
                  <span style={{ 
                    fontSize: '0.65rem', 
                    padding: '0.05rem 0.35rem', 
                    borderRadius: '999px', 
                    background: contractFilter === 'active' ? '#f1f5f9' : '#cbd5e1',
                    color: contractFilter === 'active' ? '#0f172a' : '#475569' 
                  }}>
                    {contractCounts.active}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setContractFilter('closed')}
                  style={{
                    flex: 1,
                    padding: '0.4rem 0.3rem',
                    fontSize: '0.72rem',
                    fontWeight: contractFilter === 'closed' ? 800 : 600,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: contractFilter === 'closed' ? '#ffffff' : 'transparent',
                    color: contractFilter === 'closed' ? '#0f172a' : '#64748b',
                    boxShadow: contractFilter === 'closed' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span>{isAr ? 'خالص ومُسلَم' : 'Settled'}</span>
                  <span style={{ 
                    fontSize: '0.65rem', 
                    padding: '0.05rem 0.35rem', 
                    borderRadius: '999px', 
                    background: contractFilter === 'closed' ? '#f1f5f9' : '#cbd5e1',
                    color: contractFilter === 'closed' ? '#0f172a' : '#475569' 
                  }}>
                    {contractCounts.closed}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setContractFilter('all')}
                  style={{
                    flex: 1,
                    padding: '0.4rem 0.3rem',
                    fontSize: '0.72rem',
                    fontWeight: contractFilter === 'all' ? 800 : 600,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: contractFilter === 'all' ? '#ffffff' : 'transparent',
                    color: contractFilter === 'all' ? '#0f172a' : '#64748b',
                    boxShadow: contractFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span>{isAr ? 'الكل' : 'All'}</span>
                  <span style={{ 
                    fontSize: '0.65rem', 
                    padding: '0.05rem 0.35rem', 
                    borderRadius: '999px', 
                    background: contractFilter === 'all' ? '#f1f5f9' : '#cbd5e1',
                    color: contractFilter === 'all' ? '#0f172a' : '#475569' 
                  }}>
                    {contractCounts.all}
                  </span>
                </button>
              </div>
            </div>

            {/* Contracts Scrollable List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {filteredContracts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                  {isAr ? 'لا توجد عقود مطابقة للبحث' : 'No contracts matched'}
                </div>
              ) : (
                filteredContracts.map((c) => {
                  const isSelected = c.contract_id === activeContract?.contract_id;
                  const cSchedules = schedules.filter(s => s.contract_id === c.contract_id && (s.status === 'Pending' || s.status === 'Partially Paid' || s.status === 'Defaulted'));
                  const isClosed = isContractClosed(c);
                  const buyerDisplayName = isAr ? localizeBuyerName(c.buyer_name) : c.buyer_name;
                  const prop = properties?.find(p => p.id === c.property_id || (c.unit_id && (p.title_ar === c.unit_id || p.title_en === c.unit_id)));
                  const propertyDisplayTitle = prop ? (isAr ? prop.title_ar : prop.title_en) : (c.unit_id || (isAr ? 'وحدة سكنية' : 'Unit'));

                  return (
                    <div
                      key={c.contract_id}
                      onClick={() => setSelectedContractId(c.contract_id)}
                      style={{
                        padding: '0.9rem 1rem',
                        borderRadius: '14px',
                        border: isSelected 
                          ? '1.5px solid #946f23' 
                          : '1px solid #e2e8f0',
                        background: isSelected 
                          ? 'linear-gradient(135deg, #fdfbf7 0%, #ffffff 100%)' 
                          : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: isSelected 
                          ? '0 6px 16px -2px rgba(184, 144, 62, 0.14), 0 0 0 1px rgba(184, 144, 62, 0.15)' 
                          : '0 1px 3px rgba(15, 23, 42, 0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.55rem',
                        position: 'relative',
                        opacity: isClosed && !isSelected ? 0.82 : 1
                      }}
                    >
                      {/* 1. Header Row: Monospace Contract # badge + Status pill & Details Action */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flexShrink: 0 }}>
                          <span style={{
                            fontFamily: 'monospace, tabular-nums',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: isSelected ? '#946f23' : '#475569',
                            background: isSelected ? 'rgba(184, 144, 62, 0.1)' : '#f8fafc',
                            border: `1px solid ${isSelected ? 'rgba(184, 144, 62, 0.3)' : '#e2e8f0'}`,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap',
                            direction: 'ltr'
                          }}>
                            #{c.contract_number}
                          </span>
                          {isSelected && (
                            <span style={{
                              fontSize: '0.64rem',
                              fontWeight: 800,
                              color: '#946f23',
                              background: 'rgba(184, 144, 62, 0.14)',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              whiteSpace: 'nowrap'
                            }}>
                              <Check size={10} /> {isAr ? 'محدد' : 'Selected'}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                          {isClosed ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              fontSize: '0.66rem',
                              color: '#64748b',
                              fontWeight: 700,
                              background: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '5px',
                              whiteSpace: 'nowrap'
                            }}>
                              <Lock size={10} /> {isAr ? 'خالص ومُسلَم' : 'Settled'}
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '0.66rem',
                              color: '#15803d',
                              fontWeight: 700,
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '5px',
                              whiteSpace: 'nowrap'
                            }}>
                              {isAr ? 'قيد السداد' : 'Active'}
                            </span>
                          )}

                          {onInspectContract && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onInspectContract(c);
                              }}
                              title={isAr ? 'عرض ملف وتفاصيل العقد في الشريط الجانبي' : 'View Contract Dossier'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#334155',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <ExternalLink size={10} color="#946f23" />
                              <span>{isAr ? 'تفاصيل' : 'Details'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 2. Middle Row: Buyer Legal Name & Property / Unit */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                        <div style={{
                          fontWeight: 800,
                          fontSize: '0.94rem',
                          color: '#0f172a',
                          lineHeight: 1.3,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {buyerDisplayName}
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.74rem',
                          color: '#64748b',
                          overflow: 'hidden'
                        }}>
                          <Building2 size={12} color="#946f23" style={{ flexShrink: 0 }} />
                          <span style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {propertyDisplayTitle}
                          </span>
                        </div>
                      </div>

                      {/* 3. Bottom Row: Gross Value & Remaining Tranches */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.72rem',
                        color: '#64748b',
                        borderTop: '1px dashed #f1f5f9',
                        paddingTop: '0.45rem',
                        marginTop: '0.1rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                          <span>{isAr ? 'إجمالي العقد:' : 'Gross:'}</span>
                          <strong style={{
                            color: '#0f172a',
                            fontWeight: 800,
                            fontSize: '0.84rem',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            {D(c.gross_contract_value).formatEGP(isAr)}
                          </strong>
                        </div>

                        <div>
                          {isClosed ? (
                            <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.68rem' }}>
                              {isAr ? 'مُسدد بالكامل' : 'Fully Settled'}
                            </span>
                          ) : (
                            <span style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '5px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: '#334155',
                              whiteSpace: 'nowrap'
                            }}>
                              {cSchedules.length} {isAr ? 'أقساط متبقية' : 'tranches left'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────────────
              SIDE 2 (DETAIL): SUPPLEMENT ADDITION FORM & FINANCIAL IMPACT
              ────────────────────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            background: '#ffffff'
          }}>
            {supplementSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '2rem', gap: '1.5rem', justifyContent: 'center' }}>
                {/* Success Card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(184, 144, 62, 0.06) 100%)',
                  border: '1.5px solid #059669',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.15rem',
                  boxShadow: '0 4px 16px rgba(5, 150, 105, 0.08)'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #059669 0%, #b8903e 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                  }}>
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#065f46' }}>
                      {isAr ? 'تمت إضافة الملحق المالي بنجاح وإدراجه في جدول الأقساط' : 'Supplement Added Successfully'}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>
                      {isAr 
                        ? 'تم تحديث القيمة الإجمالية للعقد وتوليد استحقاق حافظة الشيكات والأمانات' 
                        : 'Contract gross value updated and installment tranche added to schedule'}
                    </p>
                  </div>
                </div>

                {/* Details Summary Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #fffdf8 100%)',
                  border: '1.5px solid rgba(184, 144, 62, 0.35)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 8px 24px rgba(184, 144, 62, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem'
                }}>
                  {/* Amount Headline */}
                  <div style={{
                    background: 'rgba(184, 144, 62, 0.08)',
                    border: '1px solid rgba(184, 144, 62, 0.25)',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#785210', fontWeight: 700, display: 'block' }}>
                        {isAr ? 'قيمة الملحق المالي المضاف:' : 'Added Supplement Amount:'}
                      </span>
                      <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums', marginTop: '0.2rem' }}>
                        {D(supplementSuccess.amount).formatEGP(isAr)}
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b8903e', marginTop: '0.3rem' }}>
                        {tafqeetEGP(supplementSuccess.amount)}
                      </div>
                    </div>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#0f172a',
                      color: '#ffffff',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 800
                    }}>
                      <Check size={14} color="#10b981" />
                      <span>{supplementSuccess.type}</span>
                    </span>
                  </div>

                  {/* Summary Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.85rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                        {isAr ? 'العميل المستفيد:' : 'Client / Buyer:'}
                      </span>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800, marginTop: '0.15rem', display: 'block' }}>
                        {supplementSuccess.buyer}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                        {isAr ? 'رقم العقد والوحدة:' : 'Contract & Unit:'}
                      </span>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800, marginTop: '0.15rem', display: 'block' }}>
                        {supplementSuccess.unit} (#{supplementSuccess.contractNumber})
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                        {isAr ? 'نوع وبند الملحق:' : 'Supplement Type:'}
                      </span>
                      <strong style={{ fontSize: '0.84rem', color: '#946f23', fontWeight: 800, marginTop: '0.15rem', display: 'block' }}>
                        {supplementSuccess.type}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                        {isAr ? 'تاريخ الاستحقاق المعتمد:' : 'Due Date:'}
                      </span>
                      <strong style={{ fontSize: '0.84rem', color: '#059669', fontWeight: 800, marginTop: '0.15rem', display: 'block' }}>
                        {supplementSuccess.dueDate}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSupplementSuccess(null);
                      setAmount('150000');
                      setCustomNotes('');
                      setReceiptNumber('');
                    }}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #b8903e',
                      color: '#946f23',
                      padding: '0.65rem 1.25rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    <Plus size={15} />
                    <span>{isAr ? '+ إضافة دفعة أو ملحق آخر لنفس العقد / عقد آخر' : '+ Add Another Supplement'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSupplementSuccess(null);
                      onClose();
                    }}
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.65rem 1.45rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)'
                    }}
                  >
                    {isAr ? 'تم / إغلاق النافذة' : 'Done / Close'}
                  </button>
                </div>
              </div>
            ) : activeContract ? (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '1.5rem', gap: '1.25rem' }}>
                
                {/* 1. Active Contract Hero Strip */}
                <div style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  {/* Top Bar: Buyer + Unit + Dossier details button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0f172a',
                        flexShrink: 0
                      }}>
                        <Building2 size={22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                            {isAr ? localizeBuyerName(activeContract.buyer_name) : activeContract.buyer_name}
                          </h4>
                          <span style={{ fontSize: '0.74rem', padding: '0.15rem 0.5rem', borderRadius: '6px', background: '#e2e8f0', color: '#334155', fontWeight: 700 }}>
                            {activeContract.unit_id}
                          </span>
                          {activeContractIsClosed ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.72rem',
                              padding: '0.15rem 0.55rem',
                              borderRadius: '6px',
                              background: '#fef2f2',
                              color: '#991b1b',
                              border: '1px solid #fecaca',
                              fontWeight: 700
                            }}>
                              <Lock size={11} /> {isAr ? 'خالص ومُسلَم' : 'Settled & Delivered'}
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.72rem',
                              padding: '0.15rem 0.55rem',
                              borderRadius: '6px',
                              background: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              fontWeight: 700
                            }}>
                              <Check size={11} /> {isAr ? 'قيد السداد' : 'Active'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.25rem' }}>
                          {isAr ? 'عقد بيع رقم:' : 'Contract #:'} <strong style={{ color: '#0f172a' }}>{activeContract.contract_number}</strong>
                          {activeContract.buyer_national_id && (
                            <> • {isAr ? 'الرقم القومي:' : 'NID:'} {activeContract.buyer_national_id}</>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Prominent link to contract dossier */}
                    {onInspectContract && (
                      <button
                        type="button"
                        onClick={() => onInspectContract(activeContract)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '0.5rem 0.95rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#0f172a',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <ExternalLink size={13} color="#946f23" />
                        <span>{isAr ? 'عرض ملف وتفاصيل العقد' : 'View Contract Details'}</span>
                      </button>
                    )}
                  </div>

                  {/* 3 Metrics Boxes */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '0.75rem',
                    background: '#f8fafc',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{isAr ? 'إجمالي العقد الحالي' : 'Current Gross'}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '0.1rem' }}>
                        {D(activeContract.gross_contract_value).formatEGP(isAr)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{isAr ? 'المسدد بالخزينة' : 'Collected Cash'}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#15803d', marginTop: '0.1rem' }}>
                        {D(activeContract.total_cash_collected || '0').formatEGP(isAr)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{isAr ? 'المتبقي بالأقساط' : 'Remaining Balance'}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: activeContractRemaining.gt(0) ? '#946f23' : '#64748b', marginTop: '0.1rem' }}>
                        {activeContractRemaining.formatEGP(isAr)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Closed Contract Governance Warning Banner */}
                {activeContractIsClosed && (
                  <div style={{
                    padding: '1rem 1.25rem',
                    borderRadius: '14px',
                    background: '#fff1f2',
                    border: '1.5px solid #fecdd3',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem'
                  }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '0.1rem'
                    }}>
                      <Lock size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#991b1b' }}>
                        {isAr ? 'هذا العقد خالص الأقساط ومقفل محاسبياً — لا يمكن إضافة دفعات إضافية' : 'Contract Fully Settled — Additions Blocked'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#b91c1c', marginTop: '0.25rem', lineHeight: 1.5 }}>
                        {isAr 
                          ? 'تم سداد كامل التزامات هذا العقد وتم تسليم الوحدة أو إقفال أقساطها بالكامل. وفقاً لقواعد الحوكمة المحاسبية بالشركة، لا يجوز إضافة أقساط أو ملاحق جديدة على عقد مقفل منعاً لتضارب الذمم والأرصدة. يمكنك الضغط على "عرض ملف وتفاصيل العقد" لمعاينة السجل بالكامل.'
                          : 'All scheduled installments have been settled and the unit is handed over. Per ERP accounting governance, additions are locked.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Disabled Fieldset when closed */}
                <fieldset 
                  disabled={activeContractIsClosed}
                  style={{
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                    opacity: activeContractIsClosed ? 0.45 : 1,
                    pointerEvents: activeContractIsClosed ? 'none' : 'auto'
                  }}
                >
                  {/* 2. Supplement Type Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.55rem' }}>
                      {isAr ? 'نوع الملحق أو سبب الدفعة الإضافية' : 'Supplement Category / Reason'}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem' }}>
                      {SUPPLEMENT_TYPES.map((type) => {
                        const isSelected = supplementType === type.id;
                        const Icon = type.icon;
                        return (
                          <div
                            key={type.id}
                            onClick={() => setSupplementType(type.id)}
                            style={{
                              padding: '0.75rem 0.85rem',
                              borderRadius: '12px',
                              border: isSelected ? `2px solid ${type.color}` : '1px solid #e2e8f0',
                              background: isSelected ? type.bgColor : '#ffffff',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.3rem',
                              boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: type.color, fontWeight: 800, fontSize: '0.82rem' }}>
                                <Icon size={16} />
                                <span>{isAr ? type.labelAr : type.labelEn}</span>
                              </div>
                              {isSelected && <Check size={14} color={type.color} />}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.35 }}>
                              {isAr ? type.descAr : type.descEn}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Amount & Tafqeet */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                        {isAr ? 'قيمة الدفعة أو الملحق (بالجنيه المصري)' : 'Supplement Value (EGP)'}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          step="any"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          style={{
                            width: '100%',
                            padding: isAr ? '0.65rem 0.85rem 0.65rem 3.5rem' : '0.65rem 3.5rem 0.65rem 0.85rem',
                            borderRadius: '10px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '1.15rem',
                            fontWeight: 800,
                            color: '#0f172a',
                            outline: 'none',
                            background: '#ffffff'
                          }}
                        />
                        <span style={{
                          position: 'absolute',
                          [isAr ? 'left' : 'right']: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#64748b'
                        }}>
                          {isAr ? 'ج.م' : 'EGP'}
                        </span>
                      </div>

                      {/* Tafqeet Pill */}
                      <div style={{
                        marginTop: '0.45rem',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '8px',
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        color: '#92400e',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}>
                        <Sparkles size={13} style={{ flexShrink: 0 }} />
                        <span>{tafqeetText}</span>
                      </div>
                    </div>

                    {/* Due Date & Presets */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                        {isAr ? 'تاريخ استحقاق القسط الإضافي' : 'Tranche Due Date'}
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '10px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          outline: 'none',
                          background: '#ffffff'
                        }}
                      />

                      {/* Quick Date Presets */}
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.45rem' }}>
                        <button
                          type="button"
                          onClick={() => setDueDate(new Date().toISOString().split('T')[0])}
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: '#475569',
                            cursor: 'pointer'
                          }}
                        >
                          {isAr ? 'اليوم' : 'Today'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 30);
                            setDueDate(d.toISOString().split('T')[0]);
                          }}
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: '#475569',
                            cursor: 'pointer'
                          }}
                        >
                          {isAr ? 'بعد شهر' : '+30 Days'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 90);
                            setDueDate(d.toISOString().split('T')[0]);
                          }}
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: '#475569',
                            cursor: 'pointer'
                          }}
                        >
                          {isAr ? 'بعد ٣ أشهر' : '+90 Days'}
                        </button>
                        {activeContract.handover_date && (
                          <button
                            type="button"
                            onClick={() => setDueDate(activeContract.handover_date!)}
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              border: '1px solid #bbf7d0',
                              background: '#f0fdf4',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: '#15803d',
                              cursor: 'pointer'
                            }}
                          >
                            {isAr ? 'مع الاستلام' : 'Handover'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. Voucher Code & Statement Notes */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                        {isAr ? 'رقم السند / إيصال الملحق' : 'Voucher / Receipt Code'}
                      </label>
                      <input
                        type="text"
                        value={receiptNumber}
                        onChange={(e) => setReceiptNumber(e.target.value)}
                        placeholder="SUP-001-01"
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          outline: 'none',
                          background: '#f8fafc'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                        {isAr ? 'تفاصيل وبنود الاتفاق (ملاحظات تدقيق)' : 'Detailed Statement / Audit Notes'}
                      </label>
                      <input
                        type="text"
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder={isAr ? 'مثال: بند رخام مستورد، تعديل إضافي للكهرباء والتكييف...' : 'e.g. Italian marble upgrade, additional HVAC piping...'}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.86rem',
                          outline: 'none',
                          background: '#ffffff'
                        }}
                      />
                    </div>
                  </div>

                  {/* 5. Financial Impact Preview Card */}
                  <div style={{
                    padding: '1rem 1.25rem',
                    borderRadius: '14px',
                    background: '#fdf8ef',
                    border: '1px solid rgba(184, 144, 62, 0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#946f23', fontWeight: 800, fontSize: '0.84rem' }}>
                        <ShieldCheck size={16} />
                        <span>{isAr ? 'معاينة الأثر المالي على العقد والخزينة' : 'Financial Impact & Safe Portfolio Preview'}</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#946f23', fontWeight: 700 }}>
                        Zero-Float Verified
                      </span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '0.75rem',
                      background: '#ffffff',
                      padding: '0.85rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(184, 144, 62, 0.2)'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{isAr ? 'إجمالي العقد بعد الإضافة' : 'New Gross Contract'}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '0.1rem' }}>
                          {newGross.formatEGP(isAr)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>
                          +{addAmount.formatEGP(isAr)}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{isAr ? 'القسط الجديد في الجدول' : 'New Schedule Tranche'}</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginTop: '0.1rem' }}>
                          {isAr ? `قسط إضافي رقم #${nextTrancheNumber}` : `Extra Tranche #${nextTrancheNumber}`}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          {isAr ? 'استحقاق:' : 'Due:'} {dueDate}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{isAr ? 'محفظة الأمانات بالخزينة' : 'Safe Portfolio Entry'}</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#946f23', marginTop: '0.1rem' }}>
                          {isAr ? 'أمانات نقدية [١٠١٠٠٠]' : 'In Safe [101000]'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          {isAr ? 'جاهز للتحصيل باليد أو إنستاباي' : 'Ready for collection'}
                        </div>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* 6. Form Actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: 'auto',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #e2e8f0'
                }}>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isMutating}
                    style={{
                      padding: '0.65rem 1.25rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    disabled={isMutating || addAmount.lte(0) || activeContractIsClosed}
                    style={{
                      padding: '0.65rem 1.6rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: activeContractIsClosed
                        ? '#cbd5e1'
                        : 'linear-gradient(135deg, #b8903e 0%, #946f23 100%)',
                      color: activeContractIsClosed ? '#64748b' : '#ffffff',
                      fontSize: '0.86rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: isMutating || addAmount.lte(0) || activeContractIsClosed ? 'not-allowed' : 'pointer',
                      opacity: isMutating || addAmount.lte(0) || activeContractIsClosed ? 0.65 : 1,
                      boxShadow: activeContractIsClosed ? 'none' : '0 4px 14px rgba(184, 144, 62, 0.3)'
                    }}
                  >
                    {activeContractIsClosed ? (
                      <>
                        <Lock size={16} />
                        <span>{isAr ? 'غير متاح: العقد خالص ومقفل محاسبياً' : 'Locked: Contract Settled'}</span>
                      </>
                    ) : isMutating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>{isAr ? 'جاري الحفظ والتسجيل...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>{isAr ? 'تثبيت وإضافة الملحق للعقد' : 'Append Supplement to Contract'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
                <FileText size={42} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <h4 style={{ margin: 0, fontSize: '1rem', color: '#475569' }}>
                  {isAr ? 'يرجى اختيار عقد من القائمة لإضافة الملحق' : 'Please select a contract to add supplement'}
                </h4>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// Also export as ContractSupplementModal for clean naming
export const ContractSupplementModal = NewChequeModal;
