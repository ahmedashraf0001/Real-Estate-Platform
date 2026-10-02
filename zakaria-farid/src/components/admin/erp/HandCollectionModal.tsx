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
import { localizeBuyerName } from '@/components/erp/JournalEntryPreview';
import p from './v2/common/ZFModalPrimitives.module.css';

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
      items: ERPPDCRecord[];
    }[] = [
      {
        id: 'overdue',
        title: isAr ? 'أقساط متأخرة واجبة التحصيل فوراً' : 'Urgent Overdue Installments',
        badgeText: isAr ? 'متأخر' : 'Overdue',
        items: []
      },
      {
        id: 'today',
        title: isAr ? 'أقساط تستحق اليوم' : 'Due Today',
        badgeText: isAr ? 'اليوم' : 'Today',
        items: []
      },
      {
        id: 'week',
        title: isAr ? 'أقساط تستحق خلال هذا الأسبوع' : 'Due Within 7 Days',
        badgeText: isAr ? 'خلال أسبوع' : 'This Week',
        items: []
      },
      {
        id: 'upcoming',
        title: isAr ? 'أقساط مجدولة قادمة' : 'Upcoming Scheduled Dues',
        badgeText: isAr ? 'مجدول' : 'Scheduled',
        items: []
      },
      {
        id: 'cleared',
        title: isAr ? 'أقساط محصلة ومثبتة دفترياً' : 'Cleared & Received Installments',
        badgeText: isAr ? 'محصل' : 'Cleared',
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
  const getDueBadge = (dueDate: string, status: string): { label: string; tone: string } => {
    if (status === 'Cleared') {
      return { label: isAr ? 'تم التحصيل' : 'Cleared', tone: p.pillMuted };
    }
    if (status === 'Deposited') {
      return { label: isAr ? 'بانتظار التحصيل البنكي' : 'Pending Bank Clearance', tone: p.pillAccent };
    }
    if (dueDate < todayStr) {
      const diff = Math.round((new Date(todayStr).getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
      return { label: isAr ? `متأخر ${diff} يوم` : `Overdue ${diff}d`, tone: p.pillDanger };
    }
    if (dueDate === todayStr) {
      return { label: isAr ? 'يستحق اليوم' : 'Due Today', tone: p.pillWarning };
    }
    return { label: isAr ? 'مجدول' : 'Scheduled', tone: '' };
  };

  const filterTabs: { id: FilterTab; labelAr: string; labelEn: string; count: number }[] = [
    { id: 'pending', labelAr: 'المعلقة', labelEn: 'Pending', count: tabCounts.pending },
    { id: 'overdue', labelAr: 'متأخرة', labelEn: 'Overdue', count: tabCounts.overdue },
    { id: 'week', labelAr: 'خلال أسبوع', labelEn: 'This Week', count: tabCounts.week },
    { id: 'all', labelAr: 'الكل', labelEn: 'All', count: tabCounts.all },
    { id: 'cleared', labelAr: 'المحصلة', labelEn: 'Cleared', count: tabCounts.cleared },
  ];

  if (!isOpen) return null;

  return (
    <>
      <ZFModalShell
        isOpen={isOpen}
        onClose={onClose}
        isAr={isAr}
        title={isAr ? 'تحصيل الأقساط (نقداً باليد أو إنستاباي)' : 'Installment Collection (Cash or InstaPay)'}
        subtitle={isAr
          ? 'اختر القسط لإثبات الاستلام وتوليد الإيصال وقيد اليومية فوراً'
          : 'Select an installment to record collection and post the GL entry'}
        icon={<Wallet size={16} />}
        maxWidth="1080px"
        maxHeight="min(880px, 94vh)"
        bodyStyle={{ padding: 0, display: 'flex', minHeight: 0 }}
        footer={
          selectedItem ? (
            <>
              {isCleared ? (
                <span className={p.lockedState}>
                  <CheckCircle2 size={14} />
                  <span>{isAr ? 'تم التحصيل مسبقاً (سند مقفل)' : 'Already Cleared (Locked)'}</span>
                </span>
              ) : (
                <button type="submit" form="hand-collection-form" className={p.primaryButton} disabled={isMutating || isVoid}>
                  {isMutating ? <Loader2 size={14} className={p.spin} /> : <CheckCircle2 size={14} />}
                  <span>
                    {paymentMethod === 'INSTAPAY'
                      ? (isAr ? 'تأكيد استلام تحويل إنستاباي' : 'Confirm InstaPay Receipt')
                      : (isAr ? 'تأكيد التحصيل والتوريد للخزينة' : 'Confirm Cash Collection')}
                  </span>
                </button>
              )}
              <button type="button" className={p.secondaryButton} onClick={onClose}>
                {isAr ? 'إغلاق' : 'Close'}
              </button>
              <button type="button" className={`${p.secondaryButton} ${p.footerEnd}`} onClick={() => setShowPrintPreview(true)}>
                <FileText size={14} />
                <span>{isAr ? 'معاينة سند القبض' : 'Preview Voucher'}</span>
              </button>
            </>
          ) : (
            <button type="button" className={p.secondaryButton} onClick={onClose}>
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          )
        }
      >
        <div className={p.split}>
          {/* Installments list */}
          <aside className={p.listPane}>
            <div className={p.listHeader}>
              <div className={p.searchWrap}>
                <Search size={14} className={p.searchIcon} aria-hidden />
                <input
                  type="text"
                  className={p.input}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث باسم العميل، الوحدة، العقد...' : 'Search client, unit, contract...'}
                  aria-label={isAr ? 'بحث في الأقساط' : 'Search installments'}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className={p.searchClear}
                    onClick={() => setSearchQuery('')}
                    aria-label={isAr ? 'مسح البحث' : 'Clear search'}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <div className={p.segmentScroll}>
                <div className={p.segmented} role="tablist">
                  {filterTabs.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={filterTab === t.id}
                      onClick={() => setFilterTab(t.id)}
                      className={filterTab === t.id ? `${p.segment} ${p.segmentActive}` : p.segment}
                    >
                      <span>{isAr ? t.labelAr : t.labelEn}</span>
                      <span className={p.segmentCount}>{t.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={p.listSummary}>
              <span>{isAr ? `${filteredItems.length} قسط` : `${filteredItems.length} installments`}</span>
              <bdi className={p.listItemAmount}>{D(filteredSum).formatEGP(isAr)}</bdi>
            </div>

            <div className={p.listBody}>
              {filteredItems.length === 0 ? (
                <div className={p.emptyState}>
                  <Filter size={28} className={p.emptyStateIcon} aria-hidden />
                  <span>{isAr ? 'لا توجد أقساط مطابقة للبحث أو الفلتر' : 'No installments match the filter'}</span>
                </div>
              ) : (
                prioritizedSections.map(section => (
                  <div key={section.id}>
                    <div className={p.listGroupHeader}>
                      <span>{section.title} · {section.items.length}</span>
                      <bdi className={p.listGroupTotal}>{D(section.subtotal).formatEGP(isAr)}</bdi>
                    </div>
                    {section.items.map(it => {
                      const isSelected = selectedItem?.cheque_id === it.cheque_id;
                      const linkedC = contracts.find(c => c.contract_id === it.contract_id);
                      const badge = getDueBadge(it.due_date, it.status);
                      const itemProgression = getInstallmentProgression(it, schedules, contracts, allItems, isAr);
                      const rowClass = [p.listItem, isSelected ? p.listItemSelected : '', it.status === 'Cleared' && !isSelected ? p.listItemMuted : ''].filter(Boolean).join(' ');
                      return (
                        <button
                          key={it.cheque_id}
                          type="button"
                          onClick={() => setSelectedItem(it)}
                          aria-pressed={isSelected}
                          className={rowClass}
                        >
                          <span className={p.listItemTop}>
                            <bdi className={p.listItemTitle}>{it.drawer_name ? (isAr ? localizeBuyerName(it.drawer_name) : it.drawer_name) : (isAr ? 'العميل غير مُدخل' : 'Client not entered')}</bdi>
                            <span className={badge.tone ? `${p.pill} ${badge.tone}` : p.pill}>{badge.label}</span>
                          </span>
                          <span className={p.listItemMeta}>
                            <bdi>
                              #{linkedC?.contract_number || it.contract_id.slice(0, 8)} · {linkedC?.unit_id || (isAr ? 'الوحدة غير مُدخلة' : 'Unit not entered')}
                            </bdi>
                            <span>{itemProgression.badgeText}</span>
                          </span>
                          <span className={p.listItemMeta}>
                            <bdi className={p.numeric}>{it.due_date}</bdi>
                            <bdi className={p.listItemAmount}>{D(it.nominal_value || '0').formatEGP(isAr)}</bdi>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Detail */}
          <div className={p.detailPane}>
            {!selectedItem ? (
              <div className={p.emptyState}>
                <Receipt size={32} className={p.emptyStateIcon} aria-hidden />
                <span>{isAr ? 'اختر قسطاً من القائمة لعرض بياناته وإجراء التحصيل' : 'Select an installment from the list to record payment'}</span>
              </div>
            ) : (
              <form id="hand-collection-form" onSubmit={handleSubmit}>
                {error && (
                  <section className={p.section}>
                    <div className={`${p.notice} ${p.noticeDanger}`} role="alert">
                      <AlertCircle size={16} className={p.noticeIconDanger} />
                      <p className={p.noticeBody}>{error}</p>
                    </div>
                  </section>
                )}

                {isCleared && (
                  <section className={p.section}>
                    <div className={`${p.notice} ${p.noticeSuccess}`} role="status">
                      <CheckCircle2 size={16} className={p.noticeIconSuccess} />
                      <div>
                        <p className={p.noticeTitle}>{isAr ? 'تم استلام وتوريد هذا القسط مسبقاً (سند مقفل)' : 'Installment already collected (locked voucher)'}</p>
                        <p className={p.noticeBody}>
                          <bdi className={p.numeric}>
                            {isAr ? 'تاريخ التحصيل: ' : 'Cleared: '}{selectedItem.cleared_date || selectedItem.due_date}
                          </bdi>
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                {/* Installment summary */}
                <section className={p.section}>
                  <div className={p.sectionHeader}>
                    <div className={p.identity}>
                      {propertyImageUrl ? (
                        <img src={propertyImageUrl} alt={propertyTitle} className={p.thumb} />
                      ) : (
                        <span className={p.thumbFallback}><Building2 size={20} /></span>
                      )}
                      <div className={p.identityText}>
                        <h4 className={p.identityTitle}><bdi>{propertyTitle}</bdi></h4>
                        <p className={p.metaLine}>
                          <bdi>{currentContract?.unit_id || (isAr ? 'الوحدة غير مُدخلة' : 'Unit not entered')}</bdi>
                          <span className={p.metaDot}>·</span>
                          <bdi className={p.numeric}>#{currentContract?.contract_number || selectedItem.contract_id.slice(0, 8)}</bdi>
                        </p>
                      </div>
                    </div>
                    <div className={p.figure}>
                      <span className={p.figureLabel}>{isAr ? 'المبلغ المطلوب' : 'Due Amount'}</span>
                      <bdi className={p.figureValue}>{nominalVal.formatEGP(isAr)}</bdi>
                    </div>
                  </div>
                  <dl className={p.metaList}>
                    <div className={p.metaRow}>
                      <dt className={p.metaKey}>{isAr ? 'العميل' : 'Client'}</dt>
                      <dd className={selectedItem.drawer_name ? p.metaValue : `${p.metaValue} ${p.emptyValue}`}>
                        {selectedItem.drawer_name ? <bdi>{isAr ? localizeBuyerName(selectedItem.drawer_name) : selectedItem.drawer_name}</bdi> : (isAr ? 'غير مُدخل' : 'Not entered')}
                      </dd>
                    </div>
                    <div className={p.metaRow}>
                      <dt className={p.metaKey}>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</dt>
                      <dd className={p.metaValue}><bdi>{selectedItem.due_date}</bdi></dd>
                    </div>
                    <div className={p.metaRow}>
                      <dt className={p.metaKey}>{isAr ? 'موقع القسط' : 'Installment Position'}</dt>
                      <dd className={p.metaValue}>
                        {!selectedProgression
                          ? (isAr ? 'سند استحقاق' : 'Scheduled Due')
                          : selectedProgression.isDownPayment
                            ? (isAr ? 'دفعة حجز ومقدم تعاقدي' : 'Contract Down Payment')
                            : (isAr
                                ? `قسط ${selectedProgression.trancheNumber} من ${selectedProgression.totalInstallments}`
                                : `Installment ${selectedProgression.trancheNumber} of ${selectedProgression.totalInstallments}`)}
                      </dd>
                    </div>
                    <div className={p.metaRow}>
                      <dt className={p.metaKey}>{isAr ? 'الموقف التعاقدي' : 'Contract Status'}</dt>
                      <dd className={p.metaValue}>
                        {selectedProgression
                          ? (isAr
                              ? `متبقي ${selectedProgression.remainingCount} · مسدد ${selectedProgression.paidCount}`
                              : `${selectedProgression.remainingCount} remaining · ${selectedProgression.paidCount} settled`)
                          : (isAr ? 'غير مُدخل' : 'Not entered')}
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* Collection method */}
                <section className={p.section}>
                  <h4 className={p.sectionTitle}>{isAr ? 'طريقة التحصيل (الخزينة الرئيسية 101000)' : 'Collection Method (Main Treasury 101000)'}</h4>
                  <div className={p.choiceGrid} role="radiogroup">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === 'CASH'}
                      disabled={isReadOnly}
                      onClick={() => handlePaymentMethodChange('CASH')}
                      className={paymentMethod === 'CASH' ? `${p.choice} ${p.choiceSelected}` : p.choice}
                    >
                      <span className={p.choiceIcon}><Wallet size={16} /></span>
                      <span className={p.choiceText}>
                        <span className={p.choiceTitle}>{isAr ? 'سداد نقدي بالخزينة' : 'Cash in Safe'}</span>
                        <span className={p.choiceDesc}>{isAr ? 'استلام نقدي باليد بمقر الشركة' : 'Collected by hand at the office'}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === 'INSTAPAY'}
                      disabled={isReadOnly}
                      onClick={() => handlePaymentMethodChange('INSTAPAY')}
                      className={paymentMethod === 'INSTAPAY' ? `${p.choice} ${p.choiceSelected}` : p.choice}
                    >
                      <span className={p.choiceIcon}><Zap size={16} /></span>
                      <span className={p.choiceText}>
                        <span className={p.choiceTitle}>{isAr ? 'تحويل فوري إنستاباي' : 'Instant InstaPay Transfer'}</span>
                        <span className={p.choiceDesc}>{isAr ? 'إيداع فوري في حساب الشركة' : 'Instant deposit to company account'}</span>
                      </span>
                    </button>
                  </div>
                </section>

                {/* Receipt details */}
                <section className={p.section}>
                  <h4 className={p.sectionTitle}>{isAr ? 'بيانات الاستلام' : 'Receipt Details'}</h4>
                  <div className={p.fieldGrid}>
                    <div className={`${p.field} ${p.fieldFull}`}>
                      <label className={p.label} htmlFor="hc-amount">
                        {paymentMethod === 'INSTAPAY'
                          ? (isAr ? 'المبلغ المحول عبر إنستاباي *' : 'Amount Received via InstaPay *')
                          : (isAr ? 'المبلغ المستلم نقداً *' : 'Amount Received in Cash *')}
                      </label>
                      <div className={p.affixWrap}>
                        <input
                          id="hc-amount"
                          type="number"
                          step="0.01"
                          required
                          disabled={isReadOnly}
                          value={collectedAmount}
                          onChange={e => setCollectedAmount(e.target.value)}
                          className={`${p.input} ${p.inputLarge} ${p.numeric}`}
                        />
                        <span className={p.affix}>{isAr ? 'ج.م' : 'EGP'}</span>
                      </div>
                      {collectedAmount && parseFloat(collectedAmount) > 0 && (
                        <p className={p.hint}>{tafqeetEGP(collectedAmount)}</p>
                      )}
                    </div>
                    <div className={p.field}>
                      <label className={p.label} htmlFor="hc-date">{isAr ? 'تاريخ الاستلام الفعلي *' : 'Actual Receipt Date *'}</label>
                      <input
                        id="hc-date"
                        type="date"
                        required
                        disabled={isReadOnly}
                        value={collectionDate}
                        onChange={e => setCollectionDate(e.target.value)}
                        className={`${p.input} ${p.numeric}`}
                      />
                    </div>
                    <div className={p.field}>
                      <div className={p.labelRow}>
                        <label className={p.label} htmlFor="hc-receipt">
                          {paymentMethod === 'INSTAPAY'
                            ? (isAr ? 'رقم مرجع التحويل' : 'InstaPay Ref #')
                            : (isAr ? 'رقم إيصال الاستلام' : 'Receipt Voucher #')}
                        </label>
                        <span className={p.pill}><ShieldCheck size={10} />{isAr ? 'تلقائي' : 'Auto'}</span>
                      </div>
                      <input
                        id="hc-receipt"
                        type="text"
                        required
                        readOnly={true}
                        value={receiptNo}
                        className={`${p.input} ${p.inputReadonly} ${p.numeric}`}
                      />
                    </div>
                    <div className={`${p.field} ${p.fieldFull}`}>
                      <label className={p.label} htmlFor="hc-notes">{isAr ? 'ملاحظات التحصيل' : 'Collection Notes'}</label>
                      <input
                        id="hc-notes"
                        type="text"
                        disabled={isReadOnly}
                        value={collectionNotes}
                        onChange={e => setCollectionNotes(e.target.value)}
                        placeholder={paymentMethod === 'INSTAPAY' ? (isAr ? 'تحويل إنستاباي' : 'InstaPay transfer') : (isAr ? 'سداد نقدي باليد بالخزينة' : 'Cash in safe')}
                        className={p.input}
                      />
                    </div>
                  </div>
                </section>
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
