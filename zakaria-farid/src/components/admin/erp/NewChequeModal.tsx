'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Search,
  Plus,
  Hammer,
  Compass,
  ScrollText,
  Zap,
  Lock,
  ExternalLink
} from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { D } from '@/lib/erp/math';
import { toast } from 'sonner';
import { localizeBuyerName } from '@/components/erp/JournalEntryPreview';
import { ZFModalShell } from './v2/common/ZFModalShell';
import p from './v2/common/ZFModalPrimitives.module.css';

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
    icon: Hammer
  },
  {
    id: 'architectural_alterations' as SupplementType,
    labelAr: 'تعديلات معمارية وإنشائية',
    labelEn: 'Architectural Alterations',
    descAr: 'تعديل حوائط داخلية، فتح مساحات، أو تعديل تمديدات',
    descEn: 'Internal layout modification or MEP adjustments',
    icon: Compass
  },
  {
    id: 'transfer_admin_fees' as SupplementType,
    labelAr: 'رسوم تنازل ومصاريف إدارية',
    labelEn: 'Assignment & Admin Fees',
    descAr: 'رسوم نقل ملكية، توثيق ملحق، أو مصاريف إدارية معتمدة',
    descEn: 'Unit assignment fee or legal documentation charges',
    icon: ScrollText
  },
  {
    id: 'contract_annex' as SupplementType,
    labelAr: 'ملحق تعاقدي / دفعة مكملة',
    labelEn: 'Contract Annex / Tranche',
    descAr: 'ملحق اتفاق مالي مكمل لأصل العقد لزيادة الدفعات',
    descEn: 'Official contract addendum adding scheduled tranches',
    icon: FileText
  },
  {
    id: 'emergency_due' as SupplementType,
    labelAr: 'دفعة أو بند استحقاق طارئ',
    labelEn: 'Emergency Due / Misc',
    descAr: 'أي مستحق مالي إضافي أو تسوية خاصة متفق عليها',
    descEn: 'Miscellaneous custom due agreed upon with client',
    icon: Zap
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

  const resetForAnother = () => {
    setSupplementSuccess(null);
    setAmount('150000');
    setCustomNotes('');
    setReceiptNumber('');
  };

  const setDueInDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleModalClose = () => {
    setSupplementSuccess(null);
    onClose();
  };

  const statusFilters: { id: 'active' | 'closed' | 'all'; labelAr: string; labelEn: string; count: number }[] = [
    { id: 'active', labelAr: 'قيد السداد', labelEn: 'Active', count: contractCounts.active },
    { id: 'closed', labelAr: 'خالص ومُسلَم', labelEn: 'Settled', count: contractCounts.closed },
    { id: 'all', labelAr: 'الكل', labelEn: 'All', count: contractCounts.all },
  ];

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={handleModalClose}
      title={isAr ? 'إضافة ملحق أو دفعة إضافية للعقد' : 'Add Contract Supplement / Extra Tranche'}
      subtitle={isAr
        ? 'قسط أو التزام مالي جديد يُضاف لأصل العقد وجدول السداد بدون المساس بالأقساط المسددة'
        : 'Append an extra tranche to contract gross value without altering cleared dues'}
      icon={<Plus size={16} />}
      isAr={isAr}
      maxWidth="1080px"
      maxHeight="min(880px, 94vh)"
      bodyStyle={{ padding: 0, display: 'flex', minHeight: 0 }}
      footer={
        supplementSuccess ? (
          <>
            <button type="button" className={p.primaryButton} onClick={handleModalClose}>
              <CheckCircle2 size={15} />
              <span>{isAr ? 'تم / إغلاق النافذة' : 'Done / Close'}</span>
            </button>
            <button type="button" className={p.secondaryButton} onClick={resetForAnother}>
              <Plus size={14} />
              <span>{isAr ? 'إضافة ملحق آخر' : 'Add Another Supplement'}</span>
            </button>
          </>
        ) : activeContract ? (
          <>
            <button
              type="submit"
              form="contract-supplement-form"
              className={p.primaryButton}
              disabled={isMutating || addAmount.lte(0) || activeContractIsClosed}
            >
              {activeContractIsClosed ? (
                <><Lock size={14} /><span>{isAr ? 'غير متاح: العقد خالص ومقفل' : 'Locked: Contract Settled'}</span></>
              ) : isMutating ? (
                <><Loader2 size={14} className={p.spin} /><span>{isAr ? 'جاري الحفظ...' : 'Saving...'}</span></>
              ) : (
                <><Check size={14} /><span>{isAr ? 'تثبيت وإضافة الملحق للعقد' : 'Append Supplement to Contract'}</span></>
              )}
            </button>
            <button type="button" className={p.secondaryButton} onClick={handleModalClose} disabled={isMutating}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </>
        ) : (
          <button type="button" className={p.secondaryButton} onClick={handleModalClose}>
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        )
      }
    >
      <div className={p.split}>
        {/* Contracts list */}
        <aside className={p.listPane}>
          <div className={p.listHeader}>
            <div className={p.searchWrap}>
              <Search size={14} className={p.searchIcon} aria-hidden />
              <input
                type="text"
                className={p.input}
                placeholder={isAr ? 'بحث بالعميل، كود العقد، أو الوحدة...' : 'Search client, contract or unit...'}
                value={contractSearchQuery}
                onChange={(e) => setContractSearchQuery(e.target.value)}
                aria-label={isAr ? 'بحث في العقود' : 'Search contracts'}
              />
            </div>
            <div className={`${p.segmented} ${p.segmentedFull}`} role="tablist">
              {statusFilters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={contractFilter === f.id}
                  onClick={() => setContractFilter(f.id)}
                  className={contractFilter === f.id ? `${p.segment} ${p.segmentActive}` : p.segment}
                >
                  <span>{isAr ? f.labelAr : f.labelEn}</span>
                  <span className={p.segmentCount}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={p.listBody}>
            {filteredContracts.length === 0 ? (
              <div className={p.emptyState}>
                <Search size={28} className={p.emptyStateIcon} aria-hidden />
                <span>{isAr ? 'لا توجد عقود مطابقة للبحث' : 'No contracts matched'}</span>
              </div>
            ) : (
              filteredContracts.map((c) => {
                const isSelected = c.contract_id === activeContract?.contract_id;
                const cSchedules = schedules.filter(s => s.contract_id === c.contract_id && (s.status === 'Pending' || s.status === 'Partially Paid' || s.status === 'Defaulted'));
                const isClosed = isContractClosed(c);
                const buyerDisplayName = isAr ? localizeBuyerName(c.buyer_name) : c.buyer_name;
                const prop = properties?.find(pr => pr.id === c.property_id || (c.unit_id && (pr.title_ar === c.unit_id || pr.title_en === c.unit_id)));
                const propertyDisplayTitle = prop ? (isAr ? prop.title_ar : prop.title_en) : (c.unit_id || (isAr ? 'وحدة سكنية' : 'Unit'));
                const rowClass = [p.listItem, isSelected ? p.listItemSelected : '', isClosed && !isSelected ? p.listItemMuted : ''].filter(Boolean).join(' ');
                return (
                  <button
                    key={c.contract_id}
                    type="button"
                    onClick={() => setSelectedContractId(c.contract_id)}
                    aria-pressed={isSelected}
                    className={rowClass}
                  >
                    <span className={p.listItemTop}>
                      <bdi className={p.listItemCode}>#{c.contract_number}</bdi>
                      {isClosed ? (
                        <span className={`${p.pill} ${p.pillMuted}`}><Lock size={10} />{isAr ? 'خالص ومُسلَم' : 'Settled'}</span>
                      ) : (
                        <span className={`${p.pill} ${p.pillSuccess}`}>{isAr ? 'قيد السداد' : 'Active'}</span>
                      )}
                    </span>
                    <bdi className={p.listItemTitle}>{buyerDisplayName}</bdi>
                    <span className={p.listItemMeta}>
                      <bdi>{propertyDisplayTitle}</bdi>
                      <bdi className={p.listItemAmount}>{D(c.gross_contract_value || '0').formatEGP(isAr)}</bdi>
                    </span>
                    <span className={p.listItemMeta}>
                      <span>
                        {isClosed
                          ? (isAr ? 'مُسدد بالكامل' : 'Fully settled')
                          : (isAr ? `${cSchedules.length} أقساط متبقية` : `${cSchedules.length} tranches left`)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Detail */}
        <div className={p.detailPane}>
          {supplementSuccess ? (
            <div>
              <section className={p.section}>
                <div className={`${p.notice} ${p.noticeSuccess}`} role="status">
                  <CheckCircle2 size={16} className={p.noticeIconSuccess} />
                  <div>
                    <p className={p.noticeTitle}>
                      {isAr ? 'تمت إضافة الملحق المالي وإدراجه في جدول الأقساط' : 'Supplement Added Successfully'}
                    </p>
                    <p className={p.noticeBody}>
                      {isAr
                        ? 'تم تحديث القيمة الإجمالية للعقد وإضافة قسط جديد لجدول السداد.'
                        : 'Contract gross value updated and installment tranche added to schedule.'}
                    </p>
                  </div>
                </div>
              </section>
              <section className={p.section}>
                <div className={p.figure}>
                  <span className={p.figureLabel}>{isAr ? 'قيمة الملحق المالي المضاف' : 'Added Supplement Amount'}</span>
                  <bdi className={p.figureValue}>{D(supplementSuccess.amount).formatEGP(isAr)}</bdi>
                  <span className={p.figureCaption}>{tafqeetEGP(supplementSuccess.amount)}</span>
                </div>
                <dl className={p.metaList}>
                  <div className={p.metaRow}>
                    <dt className={p.metaKey}>{isAr ? 'العميل' : 'Client / Buyer'}</dt>
                    <dd className={p.metaValue}><bdi>{supplementSuccess.buyer}</bdi></dd>
                  </div>
                  <div className={p.metaRow}>
                    <dt className={p.metaKey}>{isAr ? 'رقم العقد والوحدة' : 'Contract & Unit'}</dt>
                    <dd className={p.metaValue}><bdi>{supplementSuccess.unit} · #{supplementSuccess.contractNumber}</bdi></dd>
                  </div>
                  <div className={p.metaRow}>
                    <dt className={p.metaKey}>{isAr ? 'نوع الملحق' : 'Supplement Type'}</dt>
                    <dd className={p.metaValue}><bdi>{supplementSuccess.type}</bdi></dd>
                  </div>
                  <div className={p.metaRow}>
                    <dt className={p.metaKey}>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</dt>
                    <dd className={p.metaValue}><bdi>{supplementSuccess.dueDate}</bdi></dd>
                  </div>
                </dl>
              </section>
            </div>
          ) : activeContract ? (
            <form id="contract-supplement-form" onSubmit={handleSubmit}>
              {/* Contract summary */}
              <section className={p.section}>
                <div className={p.sectionHeader}>
                  <p className={p.metaLine}>
                    <bdi className={p.metaLineStrong}>
                      {isAr ? localizeBuyerName(activeContract.buyer_name) : activeContract.buyer_name}
                    </bdi>
                    <span className={p.metaDot}>·</span>
                    <bdi>{activeContract.unit_id || (isAr ? 'الوحدة غير مُدخلة' : 'Unit not entered')}</bdi>
                    <span className={p.metaDot}>·</span>
                    <bdi className={p.numeric}>#{activeContract.contract_number}</bdi>
                    {activeContract.buyer_national_id && (
                      <>
                        <span className={p.metaDot}>·</span>
                        <bdi className={p.numeric}>{isAr ? 'الرقم القومي ' : 'NID '}{activeContract.buyer_national_id}</bdi>
                      </>
                    )}
                  </p>
                  {activeContractIsClosed ? (
                    <span className={`${p.pill} ${p.pillMuted}`}><Lock size={10} />{isAr ? 'خالص ومُسلَم' : 'Settled & Delivered'}</span>
                  ) : (
                    <span className={`${p.pill} ${p.pillSuccess}`}>{isAr ? 'قيد السداد' : 'Active'}</span>
                  )}
                </div>
                <div className={`${p.figureGrid} ${p.figureGrid3}`}>
                  <div className={p.figure}>
                    <span className={p.figureLabel}>{isAr ? 'إجمالي العقد الحالي' : 'Current Gross'}</span>
                    <bdi className={`${p.figureValue} ${p.figureValueSm}`}>{D(activeContract.gross_contract_value || '0').formatEGP(isAr)}</bdi>
                  </div>
                  <div className={p.figure}>
                    <span className={p.figureLabel}>{isAr ? 'المسدد بالخزينة' : 'Collected Cash'}</span>
                    <bdi className={`${p.figureValue} ${p.figureValueSm} ${p.figureValueSuccess}`}>{D(activeContract.total_cash_collected || '0').formatEGP(isAr)}</bdi>
                  </div>
                  <div className={p.figure}>
                    <span className={p.figureLabel}>{isAr ? 'المتبقي بالأقساط' : 'Remaining Balance'}</span>
                    <bdi className={`${p.figureValue} ${p.figureValueSm}`}>{activeContractRemaining.formatEGP(isAr)}</bdi>
                  </div>
                </div>
                {onInspectContract && (
                  <button type="button" className={p.linkButton} onClick={() => onInspectContract(activeContract)}>
                    <ExternalLink size={12} />
                    <span>{isAr ? 'عرض ملف وتفاصيل العقد' : 'View Contract Details'}</span>
                  </button>
                )}
              </section>

              {activeContractIsClosed && (
                <section className={p.section}>
                  <div className={`${p.notice} ${p.noticeDanger}`} role="alert">
                    <Lock size={16} className={p.noticeIconDanger} />
                    <div>
                      <p className={p.noticeTitle}>
                        {isAr ? 'هذا العقد خالص ومقفل محاسبياً — لا يمكن إضافة دفعات' : 'Contract Fully Settled — Additions Blocked'}
                      </p>
                      <p className={p.noticeBody}>
                        {isAr
                          ? 'تم سداد كامل التزامات العقد وتسليم الوحدة. وفقاً لقواعد الحوكمة لا يجوز إضافة أقساط أو ملاحق على عقد مقفل.'
                          : 'All installments are settled and the unit is handed over. Per ERP governance, additions are locked.'}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <fieldset className={p.fieldset} disabled={activeContractIsClosed}>
                {/* Supplement type */}
                <section className={p.section}>
                  <h4 className={p.sectionTitle}>{isAr ? 'نوع الملحق أو سبب الدفعة' : 'Supplement Category / Reason'}</h4>
                  <div className={p.choiceGrid} role="radiogroup">
                    {SUPPLEMENT_TYPES.map((type) => {
                      const isSelected = supplementType === type.id;
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => setSupplementType(type.id)}
                          className={isSelected ? `${p.choice} ${p.choiceSelected}` : p.choice}
                        >
                          <span className={p.choiceIcon}><Icon size={16} /></span>
                          <span className={p.choiceText}>
                            <span className={p.choiceTitle}>{isAr ? type.labelAr : type.labelEn}</span>
                            <span className={p.choiceDesc}>{isAr ? type.descAr : type.descEn}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Amount, date, reference */}
                <section className={p.section}>
                  <h4 className={p.sectionTitle}>{isAr ? 'القيمة والاستحقاق' : 'Amount & Due Date'}</h4>
                  <div className={p.fieldGrid}>
                    <div className={p.field}>
                      <label className={p.label} htmlFor="sup-amount">{isAr ? 'قيمة الدفعة أو الملحق' : 'Supplement Value'}</label>
                      <div className={p.affixWrap}>
                        <input
                          id="sup-amount"
                          type="number"
                          step="any"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className={`${p.input} ${p.inputLarge} ${p.numeric}`}
                        />
                        <span className={p.affix}>{isAr ? 'ج.م' : 'EGP'}</span>
                      </div>
                      <p className={p.hint}>{tafqeetText}</p>
                    </div>
                    <div className={p.field}>
                      <label className={p.label} htmlFor="sup-due">{isAr ? 'تاريخ استحقاق القسط الإضافي' : 'Tranche Due Date'}</label>
                      <input
                        id="sup-due"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className={`${p.input} ${p.numeric}`}
                      />
                      <div className={p.chipRow}>
                        <button type="button" className={p.chip} onClick={() => setDueInDays(0)}>{isAr ? 'اليوم' : 'Today'}</button>
                        <button type="button" className={p.chip} onClick={() => setDueInDays(30)}>{isAr ? 'بعد شهر' : '+30 Days'}</button>
                        <button type="button" className={p.chip} onClick={() => setDueInDays(90)}>{isAr ? 'بعد ٣ أشهر' : '+90 Days'}</button>
                        {activeContract.handover_date && (
                          <button type="button" className={p.chip} onClick={() => setDueDate(activeContract.handover_date!)}>{isAr ? 'مع الاستلام' : 'Handover'}</button>
                        )}
                      </div>
                    </div>
                    <div className={p.field}>
                      <label className={p.label} htmlFor="sup-ref">{isAr ? 'رقم السند / إيصال الملحق' : 'Voucher / Receipt Code'}</label>
                      <input
                        id="sup-ref"
                        type="text"
                        value={receiptNumber}
                        onChange={(e) => setReceiptNumber(e.target.value)}
                        placeholder="SUP-001-01"
                        className={`${p.input} ${p.numeric}`}
                      />
                    </div>
                    <div className={p.field}>
                      <label className={p.label} htmlFor="sup-notes">{isAr ? 'تفاصيل وبنود الاتفاق' : 'Detailed Statement / Audit Notes'}</label>
                      <input
                        id="sup-notes"
                        type="text"
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder={isAr ? 'مثال: رخام مستورد، تعديل إضافي للكهرباء...' : 'e.g. Italian marble upgrade, additional HVAC piping...'}
                        className={p.input}
                      />
                    </div>
                  </div>
                </section>

                {/* Impact preview */}
                <section className={p.section}>
                  <h4 className={p.sectionTitle}>{isAr ? 'الأثر المالي على العقد' : 'Financial Impact Preview'}</h4>
                  <div className={`${p.figureGrid} ${p.figureGrid3}`}>
                    <div className={p.figure}>
                      <span className={p.figureLabel}>{isAr ? 'إجمالي العقد بعد الإضافة' : 'New Gross Contract'}</span>
                      <bdi className={`${p.figureValue} ${p.figureValueSm}`}>{newGross.formatEGP(isAr)}</bdi>
                      <bdi className={`${p.figureCaption} ${p.figureCaptionSuccess}`}>+{addAmount.formatEGP(isAr)}</bdi>
                    </div>
                    <div className={p.figure}>
                      <span className={p.figureLabel}>{isAr ? 'القسط الجديد في الجدول' : 'New Schedule Tranche'}</span>
                      <bdi className={`${p.figureValue} ${p.figureValueSm}`}>#{nextTrancheNumber}</bdi>
                      <bdi className={p.figureCaption}>{isAr ? 'استحقاق ' : 'Due '}{dueDate || (isAr ? 'غير مُدخل' : 'not entered')}</bdi>
                    </div>
                    <div className={p.figure}>
                      <span className={p.figureLabel}>{isAr ? 'حساب الخزينة' : 'Treasury Account'}</span>
                      <bdi className={`${p.figureValue} ${p.figureValueSm}`}>101000</bdi>
                      <span className={p.figureCaption}>{isAr ? 'جاهز للتحصيل باليد أو إنستاباي' : 'Ready for collection'}</span>
                    </div>
                  </div>
                </section>
              </fieldset>
            </form>
          ) : (
            <div className={p.emptyState}>
              <FileText size={32} className={p.emptyStateIcon} aria-hidden />
              <span>{isAr ? 'اختر عقداً من القائمة لإضافة الملحق' : 'Select a contract to add a supplement'}</span>
            </div>
          )}
        </div>
      </div>
    </ZFModalShell>
  );
};

// Also export as ContractSupplementModal for clean naming
export const ContractSupplementModal = NewChequeModal;
