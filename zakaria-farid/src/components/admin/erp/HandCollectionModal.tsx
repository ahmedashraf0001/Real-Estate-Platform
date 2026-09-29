'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Wallet, 
  X, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  Receipt, 
  Loader2,
  AlertCircle,
  ShieldCheck,
  Search,
  Check,
  Building2,
  Clock,
  User,
  ArrowRight,
  Filter,
  Zap,
  Lock,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule, ERPPDCRecord } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D, Decimal } from '@/lib/erp/math';
import { toast } from 'sonner';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { ZFPrintDocumentLayout } from './v2/common/ZFPrintDocumentLayout';
import { ZFModalShell } from './v2/common/ZFModalShell';

// Format number with thousands commas separating digits
function formatNumberWithCommas(val: Decimal | string | number | bigint | undefined | null): string {
  if (val === undefined || val === null) return '0.00';
  const d = val instanceof Decimal ? val : D(val);
  const parts = d.abs().toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${integerPart}.${parts[1]}`;
}

export interface InstallmentProgressionInfo {
  isDownPayment: boolean;
  trancheNumber: number;
  totalInstallments: number;
  paidCount: number;
  remainingCount: number;
  badgeText: string;
  shortBadge: string;
  remainingBadge: string;
  fullDescription: string;
}

// Calculate installment progression (e.g. 'قسط رقم X من إجمالي Y قسط' or 'دفعة مقدمة')
export function getInstallmentProgression(
  p: ERPPDCRecord, 
  schedulesList: ERPInstallmentSchedule[],
  contractsList: ERPContract[] = [],
  allItemsList: ERPPDCRecord[] = [],
  isAr: boolean = true
): InstallmentProgressionInfo {
  // 1. Contract Resolution
  const linkedContract = (contractsList || []).find(c => 
    c.contract_id === p.contract_id || 
    c.contract_number === p.contract_id ||
    (p.contract_id && c.contract_id && c.contract_id.toLowerCase() === p.contract_id.toLowerCase())
  );
  const effectiveContractId = linkedContract ? linkedContract.contract_id : p.contract_id;

  // 2. Schedules Extraction
  const contractSchedules = (schedulesList || [])
    .filter(s => (s.contract_id === effectiveContractId || (linkedContract && s.contract_id === linkedContract.contract_id)) && s.status !== 'SUPERSEDED' && s.status !== 'Void')
    .sort((a, b) => (a.tranche_number ?? 0) - (b.tranche_number ?? 0));

  // 3. Fallback PDCs for this contract
  const contractPDCs = (allItemsList || [])
    .filter(item => (item.contract_id === effectiveContractId || (linkedContract && item.contract_id === linkedContract.contract_id)) && item.status !== 'Void')
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  // 4. Calculate totalInstallments
  let totalInstallments = 1;
  if (contractSchedules.length > 0) {
    const nonZeroSchedules = contractSchedules.filter(s => (s.tranche_number ?? 0) > 0);
    totalInstallments = nonZeroSchedules.length > 0 ? nonZeroSchedules.length : contractSchedules.length;
  } else if (contractPDCs.length > 0) {
    totalInstallments = contractPDCs.length;
  }

  // 5. Determine trancheNumber
  let trancheNumber: number | null = null;

  // a. Match by schedule_id
  let matched = contractSchedules.find(s => p.schedule_id && s.schedule_id === p.schedule_id);

  // b. Match by due_date
  if (!matched && p.due_date) {
    matched = contractSchedules.find(s => s.due_date === p.due_date);
  }

  // c. Match by nominal_value
  if (!matched && p.nominal_value) {
    const matchingValues = contractSchedules.filter(s => s.nominal_value === p.nominal_value && (s.tranche_number ?? 0) > 0);
    if (matchingValues.length === 1) {
      matched = matchingValues[0];
    }
  }

  if (matched && matched.tranche_number !== undefined && matched.tranche_number !== null) {
    trancheNumber = matched.tranche_number;
  }

  // d. Match cheque numbers e.g. SND-8824-002, CHQ-1002, T2 via regex: /(?:-T|[-_/])0*(\d{1,3})$/i
  if (trancheNumber === null && p.cheque_number) {
    const m = p.cheque_number.match(/(?:-T|[-_/]T?|T)0*(\d{1,3})$/i) || p.cheque_number.match(/0*(\d{1,3})$/);
    if (m) {
      const parsed = parseInt(m[1], 10);
      if (!isNaN(parsed)) {
        trancheNumber = parsed;
      }
    }
  }

  // e. Fallback: Chronological inference (Strictly banned from falling into vague "سند استحقاق"!)
  if (trancheNumber === null) {
    if (contractSchedules.length > 0) {
      const nonZeroSchedules = contractSchedules
        .filter(s => (s.tranche_number ?? 0) > 0)
        .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
      const idx = nonZeroSchedules.findIndex(s => s.due_date >= p.due_date);
      trancheNumber = idx >= 0 ? nonZeroSchedules[idx].tranche_number : (nonZeroSchedules[nonZeroSchedules.length - 1]?.tranche_number || 1);
    } else if (contractPDCs.length > 0) {
      const idx = contractPDCs.findIndex(item => item.cheque_id === p.cheque_id);
      trancheNumber = idx >= 0 ? idx + 1 : 1;
    } else {
      trancheNumber = 1;
    }
  }

  if (trancheNumber > totalInstallments) {
    totalInstallments = trancheNumber;
  }

  // 6. Calculate paidCount and remainingCount
  const paidCount = contractSchedules.filter(s => s.status === 'Paid' && (s.tranche_number ?? 0) > 0).length || 
                    contractPDCs.filter(item => item.status === 'Cleared').length;
  const remainingCount = Math.max(0, totalInstallments - paidCount);

  // 7. Proper Arabic grammar formatting
  const nounRem = remainingCount === 1 ? 'قسط' : remainingCount === 2 ? 'قسطين' : remainingCount <= 10 ? 'أقساط' : 'قسط';

  if (trancheNumber === 0) {
    return {
      isDownPayment: true,
      trancheNumber: 0,
      totalInstallments,
      paidCount,
      remainingCount,
      badgeText: isAr 
        ? `دفعة مقدمة • متبقي ${totalInstallments} قسط` 
        : `Down Payment • ${totalInstallments} installments remaining`,
      shortBadge: isAr ? 'دفعة مقدمة' : 'Down Payment',
      remainingBadge: isAr ? `متبقي ${totalInstallments} قسط` : `${totalInstallments} remaining`,
      fullDescription: isAr 
        ? `دفعة مقدمة تعاقدية (متبقي ${totalInstallments} قسط للعميل)` 
        : `Contract Down Payment (${totalInstallments} installments remaining)`
    };
  }

  return {
    isDownPayment: false,
    trancheNumber,
    totalInstallments,
    paidCount,
    remainingCount,
    badgeText: isAr 
      ? `قسط ${trancheNumber} من ${totalInstallments} • متبقي ${remainingCount} ${nounRem}` 
      : `Installment ${trancheNumber} of ${totalInstallments} • ${remainingCount} remaining`,
    shortBadge: isAr 
      ? `قسط ${trancheNumber} من ${totalInstallments}` 
      : `Installment ${trancheNumber} of ${totalInstallments}`,
    remainingBadge: isAr 
      ? `متبقي ${remainingCount} قسط` 
      : `${remainingCount} remaining`,
    fullDescription: isAr 
      ? `قسط رقم ${trancheNumber} من إجمالي ${totalInstallments} قسط (متبقي ${remainingCount} قسط للعميل)` 
      : `Installment #${trancheNumber} of ${totalInstallments} (${remainingCount} installments remaining)`
  };
}

interface HandCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ERPPDCRecord | null;
  allItems?: ERPPDCRecord[];
  contracts?: ERPContract[];
  schedules?: ERPInstallmentSchedule[];
  properties?: Property[];
  linkedContract?: ERPContract;
  onConfirmCollection: (
    item: ERPPDCRecord, 
    receiptNo: string, 
    date: string, 
    amount: string, 
    notes: string,
    method?: 'CASH' | 'INSTAPAY'
  ) => Promise<void>;
  isMutating?: boolean;
  isAr?: boolean;
}

type FilterTab = 'pending' | 'overdue' | 'week' | 'all' | 'cleared';

export const HandCollectionModal: React.FC<HandCollectionModalProps> = ({
  isOpen,
  onClose,
  item,
  allItems = [],
  contracts = [],
  schedules = [],
  properties = [],
  linkedContract,
  onConfirmCollection,
  isMutating = false,
  isAr = true
}) => {
  // Currently active selected item in the modal
  const [selectedItem, setSelectedItem] = useState<ERPPDCRecord | null>(item);

  // Search & Filter state for the side agenda list
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<FilterTab>('pending');

  // Form state
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'INSTAPAY'>('CASH');
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [collectionDate, setCollectionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [collectedAmount, setCollectedAmount] = useState<string>('');
  const [collectionNotes, setCollectionNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const nextWeekStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  // Combined full list of items (incorporating item and auto-reconciling any pending schedules)
  const masterList = useMemo(() => {
    const existingPdcIds = new Set((allItems || []).map(p => p.cheque_id));
    (allItems || []).forEach(p => {
      if (p.schedule_id) existingPdcIds.add(p.schedule_id);
    });
    const existingTrancheKeys = new Set(
      (allItems || [])
        .filter(p => p.status !== 'Cleared' && p.status !== 'Void')
        .map(p => `${p.contract_id}-${p.due_date}`)
    );

    const combined: ERPPDCRecord[] = [...(allItems || [])];

    if (item && !existingPdcIds.has(item.cheque_id)) {
      combined.unshift(item);
      existingPdcIds.add(item.cheque_id);
      if (item.schedule_id) existingPdcIds.add(item.schedule_id);
    }

    // Auto-synthesize any pending schedules not yet in pdcRecords
    (schedules || []).forEach(s => {
      if (s.status === 'Paid' || s.status === 'Void' || s.status === 'SUPERSEDED') return;
      const linkedC = contracts.find(c => c.contract_id === s.contract_id);
      if (linkedC && linkedC.status !== 'Active') return;

      const key = `${s.contract_id}-${s.due_date}`;
      const syntheticId = s.schedule_id || `SND-${s.contract_id.replace(/[^0-9]/g, '')}-T${s.tranche_number}`;
      if (!existingPdcIds.has(syntheticId) && !existingPdcIds.has(s.schedule_id) && !existingTrancheKeys.has(key)) {
        combined.push({
          cheque_id: syntheticId,
          contract_id: s.contract_id,
          schedule_id: s.schedule_id,
          drawer_name: linkedC?.buyer_name || (isAr ? 'عميل متعاقد' : 'Contracted Buyer'),
          cheque_number: `SND-${s.contract_id.slice(-4)}-T${s.tranche_number}`,
          bank_name: isAr ? 'سند استحقاق نقدي بالخزينة' : 'Cash Safe Note',
          due_date: s.due_date,
          nominal_value: s.nominal_value,
          status: 'In Safe'
        });
        existingPdcIds.add(syntheticId);
        existingPdcIds.add(s.schedule_id);
        existingTrancheKeys.add(key);
      }
    });

    return combined;
  }, [allItems, item, schedules, contracts, isAr]);

  // Track open state and external item id to avoid resetting selectedItem during consecutive collections
  const prevIsOpenRef = useRef(false);
  const prevItemIdRef = useRef<string | null>(null);

  // Sync selectedItem on modal open or external item prop change
  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const currentItemId = item ? item.cheque_id : null;
    const itemChangedExternally = Boolean(currentItemId && currentItemId !== prevItemIdRef.current);

    if (isOpen) {
      if (isOpening || itemChangedExternally) {
        if (item) {
          setSelectedItem(item);
          prevItemIdRef.current = item.cheque_id;
        } else if (masterList.length > 0) {
          // Default to first pending or overdue item
          const defaultTarget = masterList.find(p => p.status !== 'Cleared' && p.due_date < todayStr)
            || masterList.find(p => p.status !== 'Cleared')
            || masterList[0];
          setSelectedItem(defaultTarget || null);
          prevItemIdRef.current = defaultTarget ? defaultTarget.cheque_id : null;
        }
      }
    } else {
      prevItemIdRef.current = null;
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, item, masterList, todayStr]);

  const handlePaymentMethodChange = (newMethod: 'CASH' | 'INSTAPAY') => {
    setPaymentMethod(newMethod);
    if (!selectedItem) return;
    const cleanCode = (selectedItem.cheque_number || '').replace(/[^0-9]/g, '').slice(-4) || '1001';
    const prefix = newMethod === 'INSTAPAY' ? 'IP' : 'RCP';
    setReceiptNo(`${prefix}-${new Date().getFullYear()}-${cleanCode}`);
    if (selectedItem.status !== 'Cleared') {
      setCollectionNotes(
        newMethod === 'INSTAPAY'
          ? (isAr ? 'تحويل فوري عبر إنستاباي بالخزينة الرئيسية (101000)' : 'Instant transfer via InstaPay into Main Treasury (101000)')
          : (isAr ? 'تم استلام الدفعة نقدياً باليد بمقر الشركة' : 'Direct cash installment collected by hand')
      );
    }
  };

  // Sync form inputs whenever selectedItem changes
  useEffect(() => {
    if (selectedItem) {
      const isItemCleared = selectedItem.status === 'Cleared';
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const cleanCode = (selectedItem.cheque_number || '').replace(/[^0-9]/g, '').slice(-4) || randomSuffix.toString();
      const prefix = paymentMethod === 'INSTAPAY' ? 'IP' : 'RCP';
      setReceiptNo(`${prefix}-${new Date().getFullYear()}-${cleanCode}`);
      setCollectionDate(selectedItem.cleared_date || new Date().toISOString().split('T')[0]);
      setCollectedAmount(D(selectedItem.nominal_value || '0').toFixed(2));
      setCollectionNotes(
        isItemCleared
          ? (isAr ? 'تم التحصيل والتوريد الفعلي مسبقاً' : 'Already collected and cleared')
          : paymentMethod === 'INSTAPAY'
            ? (isAr ? 'تحويل فوري عبر إنستاباي بالخزينة الرئيسية (101000)' : 'Instant transfer via InstaPay into Main Treasury (101000)')
            : (isAr ? 'تم استلام الدفعة نقدياً باليد بمقر الشركة' : 'Direct cash installment collected by hand')
      );
      setError('');
    }
  }, [selectedItem, paymentMethod, isAr]);

  // Contract linked to the currently selected item
  const currentContract = useMemo(() => {
    return (contracts || []).find(c => c.contract_id === selectedItem?.contract_id) || linkedContract || null;
  }, [selectedItem, contracts, linkedContract]);

  // Property linked to the contract
  const currentProperty = useMemo(() => {
    if (!currentContract?.property_id) return null;
    return (properties || []).find(p => p.id === currentContract.property_id) || null;
  }, [currentContract, properties]);

  // Primary or first sorted property image URL
  const propertyImageUrl = useMemo(() => {
    if (!currentProperty) return null;
    if (currentProperty.property_images && currentProperty.property_images.length > 0) {
      const sorted = [...currentProperty.property_images].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return sorted[0]?.url || null;
    }
    return null;
  }, [currentProperty]);

  // Property / Project title
  const propertyTitle = useMemo(() => {
    if (currentProperty) {
      return isAr 
        ? (currentProperty.title_ar || currentProperty.title_en || 'مشروع عقاري') 
        : (currentProperty.title_en || currentProperty.title_ar || 'Property');
    }
    return isAr ? 'مشروع عقاري' : 'Property';
  }, [currentProperty, isAr]);

  // Installment progression for currently selected item
  const selectedProgression = useMemo(() => {
    if (!selectedItem) return null;
    return getInstallmentProgression(selectedItem, schedules, contracts, allItems, isAr);
  }, [selectedItem, schedules, contracts, allItems, isAr]);

  // Filtered & sorted items for the side list
  const filteredItems = useMemo(() => {
    return masterList.filter(p => {
      // 1. Tab filter
      if (filterTab === 'pending') {
        if (p.status === 'Cleared' || p.status === 'Void') return false;
      } else if (filterTab === 'overdue') {
        if (p.status === 'Cleared' || p.status === 'Void' || p.due_date >= todayStr) return false;
      } else if (filterTab === 'week') {
        if (p.status === 'Cleared' || p.status === 'Void') return false;
        if (p.due_date < todayStr || p.due_date > nextWeekStr) return false;
      } else if (filterTab === 'cleared') {
        if (p.status !== 'Cleared') return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const drawerMatch = (p.drawer_name || '').toLowerCase().includes(q);
        const chequeMatch = (p.cheque_number || '').toLowerCase().includes(q);
        const bankMatch = (p.bank_name || '').toLowerCase().includes(q);
        
        const linkedC = contracts.find(c => c.contract_id === p.contract_id);
        const contractMatch = linkedC && (
          (linkedC.contract_number || '').toLowerCase().includes(q) ||
          (linkedC.unit_id || '').toLowerCase().includes(q) ||
          (linkedC.buyer_name || '').toLowerCase().includes(q)
        );

        if (!drawerMatch && !chequeMatch && !bankMatch && !contractMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Prioritize pending/overdue first, then by due date
      if (a.status === 'Cleared' && b.status !== 'Cleared') return 1;
      if (a.status !== 'Cleared' && b.status === 'Cleared') return -1;
      return (a.due_date || '').localeCompare(b.due_date || '');
    });
  }, [masterList, filterTab, searchQuery, todayStr, nextWeekStr, contracts]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      pending: masterList.filter(p => p.status !== 'Cleared' && p.status !== 'Void').length,
      overdue: masterList.filter(p => p.status !== 'Cleared' && p.status !== 'Void' && p.due_date < todayStr).length,
      week: masterList.filter(p => p.status !== 'Cleared' && p.status !== 'Void' && p.due_date >= todayStr && p.due_date <= nextWeekStr).length,
      all: masterList.length,
      cleared: masterList.filter(p => p.status === 'Cleared').length
    };
  }, [masterList, todayStr, nextWeekStr]);

  // Sum of currently filtered items
  const filteredSum = useMemo(() => {
    return filteredItems.reduce((acc, p) => acc.plus(p.nominal_value || '0'), D(0));
  }, [filteredItems]);

  // Group filtered items into distinct priority sections
  const prioritizedSections = useMemo(() => {
    const groups: {
      id: string;
      title: string;
      badgeText: string;
      badgeBg: string;
      badgeColor: string;
      badgeBorder: string;
      items: ERPPDCRecord[];
    }[] = [
      {
        id: 'overdue',
        title: isAr ? 'أقساط متأخرة واجبة التحصيل فوراً' : 'Urgent Overdue Installments',
        badgeText: isAr ? 'متأخر' : 'Overdue',
        badgeBg: 'rgba(153, 27, 27, 0.08)',
        badgeColor: '#991b1b',
        badgeBorder: 'rgba(153, 27, 27, 0.22)',
        items: []
      },
      {
        id: 'today',
        title: isAr ? 'أقساط تستحق اليوم' : 'Due Today',
        badgeText: isAr ? 'اليوم' : 'Today',
        badgeBg: 'rgba(245, 158, 11, 0.08)',
        badgeColor: '#d97706',
        badgeBorder: 'rgba(245, 158, 11, 0.25)',
        items: []
      },
      {
        id: 'week',
        title: isAr ? 'أقساط تستحق خلال هذا الأسبوع' : 'Due Within 7 Days',
        badgeText: isAr ? 'خلال أسبوع' : 'This Week',
        badgeBg: 'var(--erp-accent-subtle, #eff6ff)',
        badgeColor: 'var(--erp-accent, #2563eb)',
        badgeBorder: 'var(--erp-accent-tint, rgba(37, 99, 235, 0.25))',
        items: []
      },
      {
        id: 'upcoming',
        title: isAr ? 'أقساط مجدولة قادمة' : 'Upcoming Scheduled Dues',
        badgeText: isAr ? 'مجدول' : 'Scheduled',
        badgeBg: 'rgba(71, 85, 105, 0.06)',
        badgeColor: '#475569',
        badgeBorder: 'rgba(71, 85, 105, 0.18)',
        items: []
      },
      {
        id: 'cleared',
        title: isAr ? 'أقساط محصلة ومثبتة دفترياً' : 'Cleared & Received Installments',
        badgeText: isAr ? 'محصل' : 'Cleared',
        badgeBg: 'rgba(71, 85, 105, 0.08)',
        badgeColor: '#475569',
        badgeBorder: 'rgba(71, 85, 105, 0.25)',
        items: []
      }
    ];

    filteredItems.forEach(p => {
      if (p.status === 'Cleared') {
        groups[4].items.push(p);
      } else if (p.due_date < todayStr) {
        groups[0].items.push(p);
      } else if (p.due_date === todayStr) {
        groups[1].items.push(p);
      } else if (p.due_date <= nextWeekStr) {
        groups[2].items.push(p);
      } else {
        groups[3].items.push(p);
      }
    });

    return groups
      .map(g => ({
        ...g,
        subtotal: g.items.reduce((acc, it) => acc.plus(it.nominal_value || '0'), D(0))
      }))
      .filter(g => g.items.length > 0);
  }, [filteredItems, isAr, todayStr, nextWeekStr]);

  if (!isOpen) return null;

  const isCleared = selectedItem?.status === 'Cleared';
  const isVoid = selectedItem?.status === 'Void';
  const isReadOnly = isCleared || isVoid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      const msg = isAr ? 'يرجى اختيار قسط من القائمة أولاً' : 'Please select an installment first';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (isCleared) {
      const msg = isAr ? 'هذا القسط تم تحصيله وإثباته دفترياً مسبقاً ولا يمكن تكرار تحصيله.' : 'This installment has already been cleared.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!receiptNo.trim()) {
      const msg = isAr ? 'يرجى إدخال رقم إيصال الاستلام النقدي' : 'Receipt voucher number is required';
      setError(msg);
      toast.error(msg);
      return;
    }
    const amt = parseFloat(collectedAmount);
    if (!amt || amt <= 0) {
      const msg = isAr ? 'يرجى إدخال مبلغ صحيح للاستلام' : 'Please enter a valid collection amount';
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      await onConfirmCollection(
        selectedItem, 
        receiptNo.trim(), 
        collectionDate, 
        collectedAmount, 
        collectionNotes.trim(), 
        paymentMethod
      );

      // Search for the next pending installment for consecutive batch collections:
      // 1) Same client or contract
      // 2) Next pending in active filtered list
      // 3) Any pending in master list
      const nextTarget = 
        (selectedItem.contract_id ? masterList.find(p => p.cheque_id !== selectedItem.cheque_id && p.contract_id === selectedItem.contract_id && p.status !== 'Cleared') : undefined)
        || filteredItems.find(p => p.cheque_id !== selectedItem.cheque_id && p.status !== 'Cleared')
        || masterList.find(p => p.cheque_id !== selectedItem.cheque_id && p.status !== 'Cleared');

      if (nextTarget) {
        setSelectedItem(nextTarget);
        toast.success(
          isAr 
            ? `تم التحصيل والتوريد بنجاح! جاهز للقسط التالي: ${nextTarget.drawer_name}` 
            : `Collected successfully! Ready for next: ${nextTarget.drawer_name}`
        );
      } else {
        setSelectedItem(prev => prev ? { ...prev, status: 'Cleared' } : null);
        toast.success(
          isAr 
            ? 'تم إثبات تحصيل القسط وتوريده للخزينة بنجاح (اكتملت كافة الأقساط المعلقة)' 
            : 'Installment collected! All pending installments settled.'
        );
      }
    } catch (err: unknown) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error(isAr ? 'فشلت عملية التحصيل' : 'Collection failed', { description: msg });
    }
  };

  const nominalVal = selectedItem ? D(selectedItem.nominal_value || '0') : D(0);

  const voucherAmount = collectedAmount || (selectedItem ? selectedItem.nominal_value : '0');
  const voucherBuyer = selectedItem?.drawer_name || linkedContract?.buyer_name || (isAr ? 'العميل المتعاقد' : 'Client');
  const voucherUnit = linkedContract?.unit_id || (isAr ? 'وحدة عقارية' : 'Unit');
  const voucherContractNo = linkedContract?.contract_number || selectedItem?.contract_id || '—';
  const effectiveVoucherCode = receiptNo || selectedItem?.cheque_number || `SND-${Date.now().toString().slice(-6)}`;

  const voucherBody = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', direction: isAr ? 'rtl' : 'ltr' }}>
      {/* 1. Architectural Property Strip with High-Res Image */}
      <div style={{
        border: '1.5px solid var(--erp-border, #cbd5e1)',
        borderRadius: '12px',
        padding: '0.85rem 1.15rem',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, flex: 1 }}>
          {propertyImageUrl ? (
            <img
              src={propertyImageUrl}
              alt={propertyTitle}
              style={{
                width: '85px',
                height: '85px',
                borderRadius: '8px',
                objectFit: 'cover',
                border: '1.5px solid var(--erp-border, #cbd5e1)',
                flexShrink: 0
              }}
            />
          ) : (
            <div style={{
              width: '85px',
              height: '85px',
              borderRadius: '8px',
              background: '#F8FAFC',
              border: '1.5px solid var(--erp-border, #cbd5e1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--erp-accent, #2563eb)',
              flexShrink: 0
            }}>
              <Building2 size={32} />
              <span style={{ fontSize: '0.66rem', fontWeight: 800, marginTop: '0.25rem', color: '#64748b' }}>
                {isAr ? 'مشروع عقاري' : 'Property'}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: 'var(--erp-accent, #2563eb)',
                background: 'var(--erp-accent-subtle, #eff6ff)',
                border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.25))',
                padding: '0.15rem 0.55rem',
                borderRadius: '6px'
              }}>
                {isAr ? 'أصل عقاري معتمد' : 'Verified Real Estate Asset'}
              </span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0F172A' }}>
                {propertyTitle}
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.82rem', color: '#475569' }}>
              <span>
                <strong style={{ color: '#64748b' }}>{isAr ? 'الوحدة: ' : 'Unit: '}</strong>
                <span style={{ color: '#0F172A', fontWeight: 800 }}>{voucherUnit}</span>
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>
                <strong style={{ color: '#64748b' }}>{isAr ? 'رقم العقد: ' : 'Contract: '}</strong>
                <span style={{ color: 'var(--erp-accent, #2563eb)', fontWeight: 800 }}>#{voucherContractNo}</span>
              </span>
            </div>

            {selectedProgression && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: selectedProgression.isDownPayment ? 'rgba(56, 189, 248, 0.08)' : 'var(--erp-accent-subtle, #eff6ff)',
                border: selectedProgression.isDownPayment ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.25))',
                padding: '0.18rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: 800,
                color: selectedProgression.isDownPayment ? '#0284c7' : 'var(--erp-accent, #2563eb)',
                width: 'fit-content'
              }}>
                <Layers size={13} />
                <span>{selectedProgression.fullDescription}</span>
              </div>
            )}
          </div>
        </div>

        <div style={{
          textAlign: isAr ? 'left' : 'right',
          borderLeft: isAr ? 'none' : '1px solid #E2E8F0',
          borderRight: isAr ? '1px solid #E2E8F0' : 'none',
          paddingLeft: isAr ? 0 : '1.25rem',
          paddingRight: isAr ? '1.25rem' : 0,
          flexShrink: 0
        }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block' }}>
            {isAr ? 'المركز المالي للوحدة' : 'Unit Position'}
          </span>
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 900,
            color: '#0F172A',
            display: 'inline-block',
            marginTop: '0.2rem'
          }}>
            {isAr ? 'سند استحقاق مسدد' : 'Settled Installment'}
          </span>
        </div>
      </div>

      {/* 2. Amount Box with Digits, Tafqeet and Channel Badge */}
      <div style={{
        border: '1.5px solid var(--erp-border, #cbd5e1)',
        borderRadius: '12px',
        padding: '1.15rem 1.4rem',
        background: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', display: 'block' }}>
            {isAr ? 'المبلغ المسدد والمثبت رسمياً:' : 'Paid & Confirmed Amount:'}
          </span>
          <div style={{
            fontSize: '2rem',
            fontWeight: 900,
            color: '#0F172A',
            fontVariantNumeric: 'tabular-nums',
            marginTop: '0.2rem',
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.35rem'
          }}>
            <span>{formatNumberWithCommas(voucherAmount)}</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--erp-accent, #2563eb)' }}>{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--erp-accent, #2563eb)', marginTop: '0.35rem' }}>
            {isAr ? `فقط وقدره: ${tafqeetEGP(voucherAmount)} لا غير` : tafqeetEGP(voucherAmount)}
          </div>
        </div>

        <div style={{ textAlign: isAr ? 'left' : 'right', flexShrink: 0 }}>
          <span style={{
            display: 'inline-block',
            background: paymentMethod === 'INSTAPAY' ? '#0284c7' : 'var(--erp-accent, #2563eb)',
            color: '#ffffff',
            padding: '0.45rem 0.95rem',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 800
          }}>
            {paymentMethod === 'INSTAPAY' ? (isAr ? 'تحويل فوري إنستاباي' : 'InstaPay Transfer') : (isAr ? 'سداد نقدي بالخزينة' : 'Cash in Hand')}
          </span>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 600 }}>
            {isAr ? 'الخزينة التشغيلية الرئيسية (101000)' : 'Operating Treasury Safe (101000)'}
          </div>
        </div>
      </div>

      {/* 3. Official Certification Metadata Table */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        border: '1.5px solid var(--erp-border, #cbd5e1)',
        fontSize: '0.82rem',
        borderRadius: '10px',
        overflow: 'hidden'
      }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid var(--erp-border, #cbd5e1)', background: '#F8FAFC' }}>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, width: '20%', color: '#64748b' }}>
              {isAr ? 'اسم العميل / المستلم منه:' : 'Payer Name:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 900, width: '38%', color: '#0F172A' }}>
              {voucherBuyer}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, width: '18%', color: '#64748b' }}>
              {isAr ? 'رقم السند / الإيصال:' : 'Voucher #:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, width: '24%', color: '#0F172A' }}>
              {effectiveVoucherCode}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--erp-border, #cbd5e1)' }}>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#64748b' }}>
              {isAr ? 'العقار / المشروع:' : 'Property / Project:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#0F172A' }}>
              {propertyTitle}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#64748b' }}>
              {isAr ? 'الوحدة ورقم العقد:' : 'Unit & Contract:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', color: 'var(--erp-accent, #2563eb)', fontWeight: 800 }}>
              {voucherUnit} • {isAr ? 'عقد #' : 'Contract #'}{voucherContractNo}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--erp-border, #cbd5e1)', background: '#F8FAFC' }}>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#64748b' }}>
              {isAr ? 'موقع القسط بالخطة:' : 'Installment Progression:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', color: '#0F172A', fontWeight: 800 }}>
              {selectedProgression?.fullDescription || (isAr ? 'سند استحقاق دوري' : 'Periodic Due')}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#64748b' }}>
              {isAr ? 'تاريخ السداد الفعلي:' : 'Payment Date:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
              {collectionDate}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--erp-border, #cbd5e1)' }}>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#64748b' }}>
              {isAr ? 'طريقة التحصيل والاستلام:' : 'Payment Channel:'}
            </td>
            <td colSpan={3} style={{ padding: '0.75rem 1rem', color: '#0F172A', fontWeight: 600 }}>
              {paymentMethod === 'INSTAPAY' 
                ? (isAr ? 'تحويل إلكتروني فوري عبر تطبيق إنستاباي (إيداع بالخزينة الرئيسية 101000)' : 'Instant electronic transfer via InstaPay into Main Treasury 101000') 
                : (isAr ? 'توريد نقدي فوري بالخزينة الرئيسية بمقر الشركة (101000)' : 'Direct cash receipt into Main Treasury safe at corporate headquarters (101000)')}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#64748b' }}>
              {isAr ? 'البيان والملاحظات:' : 'Notes / Memo:'}
            </td>
            <td colSpan={3} style={{ padding: '0.75rem 1rem', color: '#475569' }}>
              {collectionNotes || (isAr 
                ? `سداد ${selectedProgression?.fullDescription || 'قسط مستحق'} عن الوحدة ${voucherUnit} بمشروع ${propertyTitle} بموجب العقد رقم ${voucherContractNo}` 
                : `Payment for unit ${voucherUnit} under contract ${voucherContractNo}`)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 4. Official Double-Entry Accounting Routing Strip */}
      <div style={{
        background: '#F8FAFC',
        border: '1.5px solid var(--erp-border, #cbd5e1)',
        borderRadius: '10px',
        padding: '0.85rem 1.15rem',
        fontSize: '0.78rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.45rem' }}>
          <span style={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={15} color="var(--erp-accent, #2563eb)" />
            <span>{isAr ? 'التوجيه المحاسبي الرسمي المعتمد (Double-Entry GL Posting)' : 'Official Balanced Double-Entry GL Posting'}</span>
          </span>
          <span style={{
            background: 'var(--erp-accent-subtle, #eff6ff)',
            color: 'var(--erp-accent, #2563eb)',
            border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.25))',
            padding: '0.12rem 0.55rem',
            borderRadius: '12px',
            fontSize: '0.68rem',
            fontWeight: 800
          }}>
            {isAr ? 'قيد يومية متزن 100%' : 'Balanced Journal Entry'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '0.2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>
              {isAr ? 'الطرف المدين (Dr):' : 'Debit Account (Dr):'}
            </span>
            <span style={{ color: '#0F172A', fontWeight: 800 }}>
              {paymentMethod === 'INSTAPAY' 
                ? (isAr ? 'الخزينة الرئيسية (تحويل إنستاباي 101000)' : 'Main Treasury (InstaPay 101000)')
                : (isAr ? 'الخزينة النقدية الرئيسية (كاش باليد 101000)' : 'Corporate Cash Safe (101000)')}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#0F172A', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              +{formatNumberWithCommas(voucherAmount)} {isAr ? 'ج.م' : 'EGP'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>
              {isAr ? 'الطرف الدائن (Cr):' : 'Credit Account (Cr):'}
            </span>
            <span style={{ color: '#0F172A', fontWeight: 800 }}>
              {isAr ? 'أوراق القبض والتسويات التعاقدية' : 'Contract Notes Receivable'}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--erp-accent, #2563eb)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              -{formatNumberWithCommas(voucherAmount)} {isAr ? 'ج.م' : 'EGP'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Helper for due badge styling
  const getDueBadge = (dueDate: string, status: string) => {
    if (status === 'Cleared') {
      return {
        label: isAr ? 'تم التحصيل' : 'Cleared',
        bg: 'rgba(71, 85, 105, 0.08)',
        color: '#475569',
        border: 'rgba(71, 85, 105, 0.25)'
      };
    }
    if (status === 'Deposited') {
      return {
        label: isAr ? 'بانتظار التحصيل البنكي' : 'Pending Bank Clearance',
        bg: 'rgba(56, 189, 248, 0.08)',
        color: '#0284c7',
        border: 'rgba(56, 189, 248, 0.25)'
      };
    }
    if (dueDate < todayStr) {
      const diff = Math.round((new Date(todayStr).getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
      return {
        label: isAr ? `متأخر (${diff} يوم)` : `Overdue (${diff}d)`,
        bg: 'rgba(153, 27, 27, 0.08)',
        color: '#991b1b',
        border: 'rgba(153, 27, 27, 0.22)'
      };
    }
    if (dueDate === todayStr) {
      return {
        label: isAr ? 'يستحق اليوم' : 'Due Today',
        bg: 'rgba(245, 158, 11, 0.08)',
        color: '#d97706',
        border: 'rgba(245, 158, 11, 0.25)'
      };
    }
    return {
      label: isAr ? 'في الخزينة' : 'In Safe',
      bg: 'var(--erp-accent-subtle, #eff6ff)',
      color: 'var(--erp-accent, #2563eb)',
      border: 'var(--erp-accent-tint, rgba(37, 99, 235, 0.25))'
    };
  };

  if (!isOpen) return null;

  return (
    <>
      <ZFModalShell
        isOpen={isOpen}
        onClose={onClose}
        isAr={isAr}
        title={isAr ? 'إجراء تحصيل الأقساط (نقداً باليد أو إنستاباي)' : 'Installment Collection Studio (Cash or InstaPay)'}
        subtitle={isAr 
          ? 'اختر القسط المطلوب لإثبات الاستلام (نقداً بالخزينة أو عبر تحويل إنستاباي) وتوليد الإيصال وقيد اليومية فوراً.'
          : 'Select any installment to record collection (cash in safe or InstaPay) and post balanced GL entry.'}
        icon={<Wallet size={18} />}
        headerExtra={
          <span style={{
            background: 'var(--erp-accent-subtle, #eff6ff)',
            color: 'var(--erp-accent, #2563eb)',
            border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.25))',
            padding: '0.2rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.74rem',
            fontWeight: 800
          }}>
            {isAr ? 'تحصيل خزينة أو إنستاباي' : 'Safe Cash or InstaPay Collection'}
          </span>
        }
        maxWidth="1040px"
        maxHeight="min(860px, 92vh)"
        bodyStyle={{
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: 'min(780px, 82vh)',
          overflow: 'hidden'
        }}
      >
        {/* ══════════════════════════════════════════════════════════════════════════
            2. TWO-SIDED MASTER-DETAIL GRID
            (Agenda list balanced at 390px and Form at 1fr)
            ══════════════════════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '390px 1fr',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}>

          {/* ──────────────────────────────────────────────────────────────────
              SIDE 1 (MASTER): LIST OF ALL INSTALLMENTS & AGENDA
              ────────────────────────────────────────────────────────────────── */}
          <div style={{
            background: '#F8FAFC',
            borderLeft: isAr ? '1px solid var(--erp-border, #cbd5e1)' : 'none',
            borderRight: isAr ? 'none' : '1px solid var(--erp-border, #cbd5e1)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}>
            
            {/* Search Input Box */}
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--erp-border, #cbd5e1)', background: '#ffffff' }}>
              <div style={{ position: 'relative' }}>
                <Search 
                  size={15} 
                  style={{ 
                    position: 'absolute', 
                    [isAr ? 'right' : 'left']: '0.75rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: '#94a3b8' 
                  }} 
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث باسم العميل، الوحدة، العقد...' : 'Search client, unit, receipt #...'}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    paddingRight: isAr ? '2.3rem' : '0.75rem',
                    paddingLeft: isAr ? '0.75rem' : '2.3rem',
                    background: '#F8FAFC',
                    border: '1px solid var(--erp-border, #cbd5e1)',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    color: '#1e293b',
                    outline: 'none',
                    fontWeight: 600,
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--erp-accent, #2563eb)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px var(--erp-accent-tint, rgba(37, 99, 235, 0.15))';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--erp-border, #cbd5e1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      [isAr ? 'left' : 'right']: '0.65rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filter Tabs */}
            <div style={{
              display: 'flex',
              gap: '0.4rem',
              padding: '0.5rem 0.75rem',
              borderBottom: '1px solid var(--erp-border, #cbd5e1)',
              background: '#ffffff',
              overflowX: 'auto',
              scrollbarWidth: 'thin',
              WebkitOverflowScrolling: 'touch',
              flexShrink: 0
            }}>
              {/* Pending Tab */}
              <button
                type="button"
                onClick={() => setFilterTab('pending')}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: filterTab === 'pending' ? 800 : 700,
                  background: filterTab === 'pending' ? 'var(--erp-accent-subtle, #eff6ff)' : '#ffffff',
                  color: filterTab === 'pending' ? 'var(--erp-accent, #2563eb)' : '#64748b',
                  border: filterTab === 'pending' ? '1.5px solid var(--erp-accent, #2563eb)' : '1px solid var(--erp-border, #cbd5e1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{isAr ? 'المعلقة' : 'Pending'}</span>
                <span style={{
                  background: filterTab === 'pending' ? 'var(--erp-accent-tint, rgba(37, 99, 235, 0.18))' : '#F8FAFC',
                  color: filterTab === 'pending' ? 'var(--erp-accent, #2563eb)' : '#64748b',
                  padding: '0.08rem 0.45rem',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  fontWeight: 800
                }}>
                  {tabCounts.pending}
                </span>
              </button>

              {/* Overdue Tab */}
              <button
                type="button"
                onClick={() => setFilterTab('overdue')}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: filterTab === 'overdue' ? 800 : 700,
                  background: filterTab === 'overdue' ? 'rgba(153, 27, 27, 0.1)' : '#ffffff',
                  color: '#991b1b',
                  border: filterTab === 'overdue' ? '1.5px solid #991b1b' : '1px solid rgba(153, 27, 27, 0.25)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{isAr ? 'متأخرة' : 'Overdue'}</span>
                {tabCounts.overdue > 0 && (
                  <span style={{
                    background: filterTab === 'overdue' ? 'rgba(153, 27, 27, 0.2)' : 'rgba(153, 27, 27, 0.08)',
                    color: '#991b1b',
                    padding: '0.08rem 0.45rem',
                    borderRadius: '10px',
                    fontSize: '0.68rem',
                    fontWeight: 800
                  }}>
                    {tabCounts.overdue}
                  </span>
                )}
              </button>

              {/* Week Tab */}
              <button
                type="button"
                onClick={() => setFilterTab('week')}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: filterTab === 'week' ? 800 : 700,
                  background: filterTab === 'week' ? 'var(--erp-accent-subtle, #eff6ff)' : '#ffffff',
                  color: filterTab === 'week' ? 'var(--erp-accent, #2563eb)' : '#64748b',
                  border: filterTab === 'week' ? '1.5px solid var(--erp-accent, #2563eb)' : '1px solid var(--erp-border, #cbd5e1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{isAr ? 'خلال أسبوع' : 'This Week'}</span>
                <span style={{
                  background: filterTab === 'week' ? 'var(--erp-accent-tint, rgba(37, 99, 235, 0.18))' : '#F8FAFC',
                  color: filterTab === 'week' ? 'var(--erp-accent, #2563eb)' : '#64748b',
                  padding: '0.08rem 0.45rem',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  fontWeight: 800
                }}>
                  {tabCounts.week}
                </span>
              </button>

              {/* All Tab */}
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: filterTab === 'all' ? 800 : 700,
                  background: filterTab === 'all' ? 'rgba(15, 23, 42, 0.08)' : '#ffffff',
                  color: filterTab === 'all' ? '#0F172A' : '#64748b',
                  border: filterTab === 'all' ? '1.5px solid #0F172A' : '1px solid var(--erp-border, #cbd5e1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{isAr ? 'الكل' : 'All'}</span>
                <span style={{
                  background: filterTab === 'all' ? 'rgba(15, 23, 42, 0.12)' : '#F8FAFC',
                  color: filterTab === 'all' ? '#0F172A' : '#64748b',
                  padding: '0.08rem 0.45rem',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  fontWeight: 800
                }}>
                  {tabCounts.all}
                </span>
              </button>

              {/* Cleared Tab */}
              <button
                type="button"
                onClick={() => setFilterTab('cleared')}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: filterTab === 'cleared' ? 800 : 700,
                  background: filterTab === 'cleared' ? 'rgba(71, 85, 105, 0.1)' : '#ffffff',
                  color: filterTab === 'cleared' ? '#1E293B' : '#64748b',
                  border: filterTab === 'cleared' ? '1.5px solid #1E293B' : '1px solid var(--erp-border, #cbd5e1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{isAr ? 'المحصلة' : 'Cleared'}</span>
                <span style={{
                  background: filterTab === 'cleared' ? 'rgba(71, 85, 105, 0.15)' : '#F8FAFC',
                  color: filterTab === 'cleared' ? '#1E293B' : '#64748b',
                  padding: '0.08rem 0.45rem',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  fontWeight: 800
                }}>
                  {tabCounts.cleared}
                </span>
              </button>
            </div>

            {/* List Summary Bar */}
            <div style={{
              padding: '0.5rem 1rem',
              background: '#F8FAFC',
              borderBottom: '1px solid var(--erp-border, #cbd5e1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.74rem',
              color: '#64748b'
            }}>
              <span>
                {isAr ? `المعروض: ${filteredItems.length} قسط` : `Showing: ${filteredItems.length} installments`}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontWeight: 800, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                  {formatNumberWithCommas(filteredSum)}
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--erp-accent, #2563eb)' }}>
                  {isAr ? 'ج.م' : 'EGP'}
                </span>
              </div>
            </div>

            {/* Scrollable Installment Cards List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem'
            }}>
              {filteredItems.length === 0 ? (
                <div style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '0.78rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Filter size={24} color="#94a3b8" />
                  <span>{isAr ? 'لا توجد أقساط مطابقة للبحث أو الفلتر المحدد.' : 'No installments match the search filter.'}</span>
                </div>
              ) : (
                prioritizedSections.map(section => (
                  <div key={section.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.65rem' }}>
                    {/* Priority Section Sticky Header */}
                    <div style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      background: section.badgeBg,
                      border: `1px solid ${section.badgeBorder}`,
                      backdropFilter: 'blur(8px)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ fontSize: '0.73rem', fontWeight: 800, color: section.badgeColor }}>
                          {section.title}
                        </span>
                        <span style={{
                          background: '#ffffff',
                          color: section.badgeColor,
                          fontWeight: 800,
                          fontSize: '0.65rem',
                          padding: '0.05rem 0.45rem',
                          borderRadius: '12px',
                          border: `1px solid ${section.badgeBorder}`
                        }}>
                          {section.items.length} {isAr ? 'قسط' : 'dues'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem' }}>
                        <span style={{
                          fontWeight: 800,
                          color: section.badgeColor,
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: '0.74rem'
                        }}>
                          {formatNumberWithCommas(section.subtotal)}
                        </span>
                        <span style={{ fontSize: '0.64rem', fontWeight: 800, color: section.badgeColor }}>
                          {isAr ? 'ج.م' : 'EGP'}
                        </span>
                      </div>
                    </div>

                    {/* Section Cards */}
                    {section.items.map(p => {
                      const isSelected = selectedItem?.cheque_id === p.cheque_id;
                      const linkedC = contracts.find(c => c.contract_id === p.contract_id);
                      const badge = getDueBadge(p.due_date, p.status);
                      const pNominal = D(p.nominal_value || '0');
                      const itemProgression = getInstallmentProgression(p, schedules, contracts, allItems, isAr);

                      return (
                        <div
                          key={p.cheque_id}
                          onClick={() => setSelectedItem(p)}
                          style={{
                            padding: '0.85rem 1rem',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            background: '#ffffff',
                            border: isSelected ? '2px solid var(--erp-accent, #2563eb)' : '1px solid var(--erp-border, #cbd5e1)',
                            boxShadow: isSelected 
                              ? '0 4px 14px var(--erp-accent-tint, rgba(37, 99, 235, 0.15)), 0 1px 3px rgba(0,0,0,0.03)' 
                              : '0 1px 3px rgba(0,0,0,0.02)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* Top Row: Client Name + Due Badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, flex: 1 }}>
                              <User size={14} color="#64748b" style={{ flexShrink: 0 }} />
                              <strong style={{
                                fontSize: '0.86rem',
                                color: '#0F172A',
                                fontWeight: 800,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {p.drawer_name}
                              </strong>
                            </div>

                            <span style={{
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.55rem',
                              borderRadius: '12px',
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              {badge.label}
                            </span>
                          </div>

                          {/* Middle Row: Contract / Unit Details & Progression Badge */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.45rem',
                            fontSize: '0.74rem',
                            marginBottom: '0.55rem',
                            minWidth: 0
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                              <Building2 size={13} color="var(--erp-accent, #2563eb)" style={{ flexShrink: 0 }} />
                              <span style={{ color: 'var(--erp-accent, #2563eb)', fontWeight: 700, flexShrink: 0 }}>
                                {isAr ? 'عقد #' : 'Contract #'}{linkedC?.contract_number || p.contract_id.slice(0, 8)}
                              </span>
                              <span style={{ color: '#94a3b8', flexShrink: 0 }}>•</span>
                              <span style={{
                                color: '#475569',
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                minWidth: 0
                              }}>
                                {linkedC?.unit_id || (isAr ? 'وحدة عقارية' : 'Unit')}
                              </span>
                            </div>

                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '0.12rem 0.45rem',
                              borderRadius: '6px',
                              background: itemProgression.isDownPayment ? 'rgba(56, 189, 248, 0.08)' : 'var(--erp-accent-subtle, #eff6ff)',
                              color: itemProgression.isDownPayment ? '#0284c7' : 'var(--erp-accent, #2563eb)',
                              border: itemProgression.isDownPayment ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.25))',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              flexShrink: 0
                            }}>
                              <Layers size={10} />
                              <span>{itemProgression.badgeText}</span>
                            </span>
                          </div>

                          {/* Bottom Row: Due Date + Nominal Amount */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTop: '1px solid #F1F5F9',
                            paddingTop: '0.45rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: '#64748b' }}>
                              <Clock size={12} color="#94a3b8" />
                              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{p.due_date}</span>
                            </div>

                            <div style={{
                              fontSize: '0.92rem',
                              fontWeight: 900,
                              color: '#0F172A',
                              fontVariantNumeric: 'tabular-nums',
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: '0.25rem'
                            }}>
                              <span>{formatNumberWithCommas(pNominal)}</span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--erp-accent, #2563eb)' }}>
                                {isAr ? 'ج.م' : 'EGP'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────────────
              SIDE 2 (DETAIL): THE OFFICIAL CASH VOUCHER & COLLECTION FORM
              ────────────────────────────────────────────────────────────────── */}
          <div style={{
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflowY: 'auto'
          }}>
            {!selectedItem ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '16px',
                  background: 'var(--erp-accent-subtle, #eff6ff)',
                  border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.25))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--erp-accent, #2563eb)',
                  marginBottom: '1rem'
                }}>
                  <ArrowRight size={28} />
                </div>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                  {isAr ? 'اختر قسطاً من القائمة الجانبية' : 'Select an installment from the list'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', maxWidth: '360px' }}>
                  {isAr 
                    ? 'انقر على أي قسط مستحق من أجندة الخزنة على اليمين لعرض بياناته وإجراء التحصيل النقدي.'
                    : 'Click any due installment on the side list to review voucher details and record payment.'}
                </p>
              </div>
            ) : (
              <form 
                onSubmit={handleSubmit} 
                style={{ 
                  padding: '1.25rem 1.65rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  flex: 1,
                  minHeight: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {error && (
                    <div style={{
                      background: 'rgba(153, 27, 27, 0.06)',
                      border: '1px solid rgba(153, 27, 27, 0.22)',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      color: '#991b1b',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────────
                      Target Item Details Voucher Preview
                      White Card with border
                      ──────────────────────────────────────────────────────── */}
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid var(--erp-border, #cbd5e1)',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {/* Header */}
                    <div style={{
                      padding: '0.65rem 1.15rem',
                      background: 'var(--erp-accent-subtle, #eff6ff)',
                      borderBottom: '1px solid var(--erp-border, #cbd5e1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          background: '#ffffff',
                          border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.25))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--erp-accent, #2563eb)'
                        }}>
                          <Receipt size={14} />
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                          {isAr ? 'بيانات القسط المحدد للتحصيل' : 'Selected Installment Collection Details'}
                        </span>
                      </div>

                      {isCleared && (
                        <div style={{
                          background: 'rgba(71, 85, 105, 0.08)',
                          border: '1px solid rgba(71, 85, 105, 0.25)',
                          borderRadius: '6px',
                          padding: '0.15rem 0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.68rem',
                          color: '#334155',
                          fontWeight: 800
                        }}>
                          <CheckCircle2 size={12} color="#334155" />
                          <span>{isAr ? 'تم التحصيل مسبقاً' : 'Cleared'}</span>
                        </div>
                      )}
                    </div>

                    {isCleared && (
                      <div style={{
                        padding: '0.45rem 1.15rem',
                        background: 'rgba(71, 85, 105, 0.06)',
                        borderBottom: '1px solid rgba(71, 85, 105, 0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.74rem',
                        color: '#334155',
                        fontWeight: 800
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CheckCircle2 size={14} color="#334155" />
                          <span>{isAr ? 'تم استلام وتوريد هذا القسط للخزينة مسبقاً (سند مقفل)' : 'Installment already collected & cleared into safe (Locked Voucher)'}</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                          {isAr ? `تاريخ التحصيل: ${selectedItem.cleared_date || selectedItem.due_date}` : `Cleared: ${selectedItem.cleared_date || selectedItem.due_date}`}
                        </span>
                      </div>
                    )}

                    {/* Luxury Property & Installment Progression Banner */}
                    <div style={{
                      padding: '0.85rem 1.15rem',
                      background: '#ffffff',
                      borderBottom: '1px solid var(--erp-border, #cbd5e1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: 1 }}>
                        {/* Property Image or Architectural Icon Fallback */}
                        {propertyImageUrl ? (
                          <img
                            src={propertyImageUrl}
                            alt={propertyTitle}
                            style={{
                              width: '68px',
                              height: '68px',
                              borderRadius: '10px',
                              objectFit: 'cover',
                              border: '1px solid var(--erp-border, #cbd5e1)',
                              flexShrink: 0,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '68px',
                            height: '68px',
                            borderRadius: '10px',
                            background: 'var(--erp-accent-subtle, #eff6ff)',
                            border: '1px solid var(--erp-border, #cbd5e1)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--erp-accent, #2563eb)',
                            flexShrink: 0
                          }}>
                            <Building2 size={26} />
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, marginTop: '0.2rem', color: '#64748b' }}>
                              {isAr ? 'عقار' : 'Property'}
                            </span>
                          </div>
                        )}

                        {/* Project / Unit / Contract / Progression Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <h4 style={{
                              margin: 0,
                              fontSize: '0.96rem',
                              fontWeight: 900,
                              color: '#0F172A',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {propertyTitle}
                            </h4>

                            {selectedProgression && (
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '0.15rem 0.55rem',
                                borderRadius: '6px',
                                background: selectedProgression.isDownPayment ? 'rgba(56, 189, 248, 0.1)' : 'var(--erp-accent-subtle, #eff6ff)',
                                color: selectedProgression.isDownPayment ? '#0284c7' : 'var(--erp-accent, #2563eb)',
                                border: selectedProgression.isDownPayment ? '1px solid rgba(56, 189, 248, 0.28)' : '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.28))',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}>
                                <Layers size={11} />
                                <span>{selectedProgression.fullDescription}</span>
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.76rem', color: '#475569' }}>
                            <span style={{ fontWeight: 800, color: '#0F172A' }}>
                              {isAr ? 'الوحدة: ' : 'Unit: '}{currentContract?.unit_id || (isAr ? 'وحدة عقارية' : 'Unit')}
                            </span>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span style={{ fontWeight: 700, color: 'var(--erp-accent, #2563eb)' }}>
                              {isAr ? 'عقد #: ' : 'Contract #: '}{currentContract?.contract_number || selectedItem.contract_id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Required Amount Display */}
                      <div style={{ textAlign: isAr ? 'left' : 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', display: 'block' }}>
                          {isAr ? 'المبلغ المطلوب:' : 'Due Amount:'}
                        </span>
                        <div style={{
                          fontSize: '1.45rem',
                          fontWeight: 900,
                          color: 'var(--erp-accent, #2563eb)',
                          fontVariantNumeric: 'tabular-nums',
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '0.25rem'
                        }}>
                          <span>{formatNumberWithCommas(nominalVal)}</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>
                            {isAr ? 'ج.م' : 'EGP'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Organized Details Grid */}
                    <div style={{
                      padding: '0.85rem 1.15rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.85rem',
                      fontSize: '0.76rem',
                      background: '#F8FAFC'
                    }}>
                      {/* Cell 1: Client Name */}
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                          {isAr ? 'العميل الملتزم:' : 'Committed Client:'}
                        </span>
                        <strong style={{ color: '#0F172A', fontSize: '0.88rem', fontWeight: 800, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedItem.drawer_name}
                        </strong>
                      </div>

                      {/* Cell 2: Due Date */}
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                          {isAr ? 'تاريخ الاستحقاق الدفتري:' : 'Due Date:'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0F172A', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '0.86rem' }}>
                          <Clock size={13} color="#94a3b8" />
                          <span>{selectedItem.due_date}</span>
                        </div>
                      </div>

                      {/* Cell 3: Progression Position */}
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                          {isAr ? 'تسلسل الدفعة بالأجندة:' : 'Schedule Sequence:'}
                        </span>
                        <span style={{ color: '#334155', fontWeight: 700, fontSize: '0.82rem', display: 'block' }}>
                          {selectedProgression?.badgeText || (isAr ? 'سند استحقاق' : 'Scheduled Due')}
                        </span>
                      </div>
                    </div>

                    {/* Dedicated Contractual & Installment Status Row */}
                    <div style={{
                      borderTop: '1px solid var(--erp-border, #cbd5e1)',
                      padding: '0.75rem 1.15rem',
                      background: '#ffffff',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.85rem',
                      fontSize: '0.76rem'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 700 }}>
                          {isAr ? 'بيان القسط وموقعه:' : 'Installment Position:'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Layers size={13} color="var(--erp-accent, #2563eb)" />
                          <strong style={{ color: '#0F172A', fontWeight: 800, fontSize: '0.82rem' }}>
                            {selectedProgression?.isDownPayment
                              ? (isAr ? 'دفعة حجز ومقدم تعاقدي' : 'Contract Down Payment')
                              : (isAr 
                                  ? `قسط رقم ${selectedProgression?.trancheNumber} من إجمالي ${selectedProgression?.totalInstallments} قسط` 
                                  : `Installment #${selectedProgression?.trancheNumber} of ${selectedProgression?.totalInstallments}`)}
                          </strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 700 }}>
                          {isAr ? 'الموقف التعاقدي للعميل:' : 'Client Contract Status:'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle2 size={13} color="var(--erp-accent, #2563eb)" />
                          <strong style={{ color: '#0F172A', fontWeight: 800, fontSize: '0.82rem' }}>
                            {isAr
                              ? `متبقي ${selectedProgression?.remainingCount} قسط (تم سداد ${selectedProgression?.paidCount} قسط مسبقاً)`
                              : `${selectedProgression?.remainingCount} remaining (${selectedProgression?.paidCount} settled previously)`}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selector Toggle */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.74rem', color: '#334155', fontWeight: 700 }}>
                      {isAr ? 'طريقة التحصيل (توريد للخزينة الرئيسية 101000) *' : 'Collection Method (Deposit to Main Treasury 101000) *'}
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.65rem',
                      background: '#F8FAFC',
                      padding: '0.35rem',
                      borderRadius: '10px',
                      border: '1px solid var(--erp-border, #cbd5e1)'
                    }}>
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => handlePaymentMethodChange('CASH')}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: paymentMethod === 'CASH' ? '2px solid var(--erp-accent, #2563eb)' : '1px solid var(--erp-border, #cbd5e1)',
                          background: paymentMethod === 'CASH' ? 'var(--erp-accent-subtle, #eff6ff)' : '#ffffff',
                          color: paymentMethod === 'CASH' ? 'var(--erp-accent, #2563eb)' : '#64748b',
                          fontWeight: paymentMethod === 'CASH' ? 800 : 600,
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.45rem',
                          cursor: isReadOnly ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Wallet size={16} color={paymentMethod === 'CASH' ? 'var(--erp-accent, #2563eb)' : '#64748b'} />
                        <span>{isAr ? 'سداد نقدي بالخزينة' : 'Cash in Safe'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => handlePaymentMethodChange('INSTAPAY')}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: paymentMethod === 'INSTAPAY' ? '2px solid #0284c7' : '1px solid var(--erp-border, #cbd5e1)',
                          background: paymentMethod === 'INSTAPAY' ? 'rgba(2, 132, 199, 0.08)' : '#ffffff',
                          color: paymentMethod === 'INSTAPAY' ? '#0284c7' : '#64748b',
                          fontWeight: paymentMethod === 'INSTAPAY' ? 800 : 600,
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.45rem',
                          cursor: isReadOnly ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Zap size={16} color={paymentMethod === 'INSTAPAY' ? '#0284c7' : '#64748b'} />
                        <span>{isAr ? 'تحويل فوري إنستاباي' : 'Instant InstaPay Transfer'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Form Inputs Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    {/* Actual Collection Date */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: '#334155', marginBottom: '0.3rem', fontWeight: 700 }}>
                        <Calendar size={13} style={{ display: 'inline', marginLeft: isAr ? '0.35rem' : 0, marginRight: isAr ? 0 : '0.35rem' }} />
                        {isAr ? 'تاريخ الاستلام الفعلي باليد *' : 'Actual Receipt Date *'}
                      </label>
                      <input 
                        type="date"
                        required
                        disabled={isReadOnly}
                        value={collectionDate}
                        onChange={e => setCollectionDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          background: isReadOnly ? '#F8FAFC' : '#ffffff',
                          border: '1px solid var(--erp-border, #cbd5e1)',
                          borderRadius: '8px',
                          color: isReadOnly ? '#475569' : '#0F172A',
                          fontSize: '0.82rem',
                          outline: 'none',
                          cursor: isReadOnly ? 'not-allowed' : 'text',
                          boxSizing: 'border-box',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                        }}
                        onFocus={e => {
                          e.currentTarget.style.borderColor = 'var(--erp-accent, #2563eb)';
                          e.currentTarget.style.boxShadow = '0 0 0 2px var(--erp-accent-tint, rgba(37, 99, 235, 0.15))';
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = 'var(--erp-border, #cbd5e1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    {/* Receipt Voucher Number (Auto-Generated Read-Only) */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <label style={{ fontSize: '0.74rem', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Receipt size={13} />
                          <span>
                            {paymentMethod === 'INSTAPAY'
                              ? (isAr ? 'رقم مرجع تحويل إنستاباي' : 'InstaPay Ref #')
                              : (isAr ? 'رقم إيصال الاستلام النقدي' : 'Receipt Voucher #')}
                          </span>
                        </label>
                        <span style={{
                          fontSize: '0.66rem',
                          color: 'var(--erp-accent, #2563eb)',
                          fontWeight: 700,
                          background: 'var(--erp-accent-subtle, #eff6ff)',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem'
                        }}>
                          <ShieldCheck size={11} />
                          <span>{isAr ? 'توليد تلقائي معتمد' : 'Auto-Generated'}</span>
                        </span>
                      </div>
                      <input 
                        type="text"
                        required
                        readOnly={true}
                        value={receiptNo}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          background: '#F8FAFC',
                          border: '1px solid var(--erp-border, #cbd5e1)',
                          borderRadius: '8px',
                          color: '#0F172A',
                          fontSize: '0.82rem',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                          outline: 'none',
                          cursor: 'default',
                          userSelect: 'all',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Amount Paid Field + Arabic Tafqeet */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#334155', marginBottom: '0.3rem', fontWeight: 700 }}>
                      {paymentMethod === 'INSTAPAY'
                        ? (isAr ? 'المبلغ المحول عبر إنستاباي (ج.م) *' : 'Amount Received via InstaPay (EGP) *')
                        : (isAr ? 'المبلغ المستلم نقداً (ج.م) *' : 'Amount Received in Cash (EGP) *')}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="number"
                        step="0.01"
                        required
                        disabled={isReadOnly}
                        value={collectedAmount}
                        onChange={e => setCollectedAmount(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.85rem',
                          paddingLeft: isAr ? '2.5rem' : '0.85rem',
                          paddingRight: isAr ? '0.85rem' : '2.5rem',
                          background: isReadOnly ? '#F8FAFC' : '#ffffff',
                          border: '1.5px solid var(--erp-border, #cbd5e1)',
                          borderRadius: '8px',
                          color: '#0F172A',
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          fontVariantNumeric: 'tabular-nums',
                          outline: 'none',
                          boxSizing: 'border-box',
                          cursor: isReadOnly ? 'not-allowed' : 'text',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                        }}
                        onFocus={e => {
                          e.currentTarget.style.borderColor = 'var(--erp-accent, #2563eb)';
                          e.currentTarget.style.boxShadow = '0 0 0 3px var(--erp-accent-tint, rgba(37, 99, 235, 0.15))';
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = 'var(--erp-border, #cbd5e1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                      <span style={{
                        position: 'absolute',
                        [isAr ? 'left' : 'right']: '0.85rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--erp-accent, #2563eb)',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        pointerEvents: 'none'
                      }}>
                        {isAr ? 'ج.م' : 'EGP'}
                      </span>
                    </div>
                    {collectedAmount && parseFloat(collectedAmount) > 0 && (
                      <div style={{
                        marginTop: '0.35rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: 'var(--erp-accent, #2563eb)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <span>{tafqeetEGP(collectedAmount)}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes Input */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#334155', marginBottom: '0.3rem', fontWeight: 700 }}>
                      <FileText size={13} style={{ display: 'inline', marginLeft: isAr ? '0.35rem' : 0, marginRight: isAr ? 0 : '0.35rem' }} />
                      {isAr ? 'ملاحظات التحصيل / جهة الاستلام' : 'Collection Notes'}
                    </label>
                    <input 
                      type="text"
                      disabled={isReadOnly}
                      value={collectionNotes}
                      onChange={e => setCollectionNotes(e.target.value)}
                      placeholder={paymentMethod === 'INSTAPAY' ? (isAr ? 'تحويل إنستاباي' : 'InstaPay transfer') : (isAr ? 'سداد نقدي باليد بالخزينة' : 'Cash in safe')}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        background: isReadOnly ? '#F8FAFC' : '#ffffff',
                        border: '1px solid var(--erp-border, #cbd5e1)',
                        borderRadius: '8px',
                        color: isReadOnly ? '#475569' : '#0F172A',
                        fontSize: '0.78rem',
                        outline: 'none',
                        cursor: isReadOnly ? 'not-allowed' : 'text',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                      }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = 'var(--erp-accent, #2563eb)';
                        e.currentTarget.style.boxShadow = '0 0 0 2px var(--erp-accent-tint, rgba(37, 99, 235, 0.15))';
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = 'var(--erp-border, #cbd5e1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                {/* Modal Footer Buttons */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--erp-border, #cbd5e1)',
                  paddingTop: '0.85rem',
                  marginTop: 'auto'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowPrintPreview(true)}
                    style={{
                      background: 'var(--erp-accent-subtle, #eff6ff)',
                      border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.25))',
                      color: 'var(--erp-accent, #2563eb)',
                      padding: '0.5rem 0.95rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--erp-accent-tint, rgba(37, 99, 235, 0.15))'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--erp-accent-subtle, #eff6ff)'}
                  >
                    <FileText size={15} />
                    <span>{isAr ? 'معاينة سند القبض للطباعة' : 'Preview Voucher to Print'}</span>
                  </button>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--erp-border, #cbd5e1)',
                        color: '#475569',
                        padding: '0.5rem 0.95rem',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                    >
                      {isAr ? 'إغلاق النافذة' : 'Close Window'}
                    </button>

                    {isCleared ? (
                      <div
                        style={{
                          background: 'rgba(71, 85, 105, 0.08)',
                          color: '#334155',
                          border: '1px solid rgba(71, 85, 105, 0.25)',
                          padding: '0.6rem 1.2rem',
                          borderRadius: '10px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          userSelect: 'none'
                        }}
                      >
                        <CheckCircle2 size={14} color="#334155" />
                        <span>{isAr ? 'تم التحصيل مسبقاً (سند مقفل)' : 'Already Cleared (Locked)'}</span>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={isMutating}
                        style={{
                          background: 'var(--erp-accent, #2563eb)',
                          color: '#ffffff',
                          border: '1px solid var(--erp-accent, #2563eb)',
                          padding: '0.65rem 1.4rem',
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          cursor: isMutating ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 2px 8px var(--erp-accent-tint, rgba(37, 99, 235, 0.25))',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          if (!isMutating) {
                            e.currentTarget.style.background = 'var(--erp-accent-hover, #1d4ed8)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isMutating) {
                            e.currentTarget.style.background = 'var(--erp-accent, #2563eb)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        {isMutating ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} color="#ffffff" />}
                        <span>
                          {paymentMethod === 'INSTAPAY'
                            ? (isAr ? 'تأكيد استلام تحويل إنستاباي' : 'Confirm InstaPay Receipt')
                            : (isAr ? 'تأكيد التحصيل والتوريد للخزينة' : 'Confirm Cash Collection')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </ZFModalShell>

      {/* Screen Preview Modal */}
      {showPrintPreview && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            overflowY: 'auto'
          }}
          onClick={() => setShowPrintPreview(false)}
        >
          <div 
            style={{ 
              maxWidth: '850px', 
              width: '100%', 
              maxHeight: '94vh', 
              overflowY: 'auto',
              borderRadius: '16px',
              border: '1px solid var(--erp-border, #cbd5e1)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <ZFPrintDocumentLayout
              documentTitle={paymentMethod === 'INSTAPAY' ? (isAr ? 'إشعار استلام تحويل إنستاباي' : 'InstaPay Receipt Voucher') : (isAr ? 'سند قبض نقدية رسمي' : 'Official Cash Receipt Voucher')}
              documentSubtitle={paymentMethod === 'INSTAPAY' 
                ? (isAr ? 'إيداع بنكي فوري - حساب الشركة' : 'Corporate Bank Deposit')
                : (isAr ? 'توريد نقدي فوري بخزينة الشركة الرئيسية' : 'Cash Safe Deposit')
              }
              voucherCode={effectiveVoucherCode}
              date={collectionDate}
              onClose={() => setShowPrintPreview(false)}
              isAr={isAr}
            >
              {voucherBody}
            </ZFPrintDocumentLayout>
          </div>
        </div>
      )}

      {/* Hidden print container: rendered for @media print */}
      <div className="zf-print-only">
        <ZFPrintDocumentLayout
          documentTitle={paymentMethod === 'INSTAPAY' ? (isAr ? 'إشعار استلام تحويل إنستاباي' : 'InstaPay Receipt Voucher') : (isAr ? 'سند قبض نقدية رسمي' : 'Official Cash Receipt Voucher')}
          documentSubtitle={paymentMethod === 'INSTAPAY' 
            ? (isAr ? 'إيداع بنكي فوري - حساب الشركة' : 'Corporate Bank Deposit')
            : (isAr ? 'توريد نقدي فوري بخزينة الشركة الرئيسية' : 'Cash Safe Deposit')
          }
          voucherCode={effectiveVoucherCode}
          date={collectionDate}
          isAr={isAr}
        >
          {voucherBody}
        </ZFPrintDocumentLayout>
      </div>
    </>
  );
};
