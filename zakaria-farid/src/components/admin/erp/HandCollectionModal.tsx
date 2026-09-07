'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  X, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  Receipt, 
  Loader2,
  AlertCircle,
  Printer,
  ShieldCheck,
  Search,
  Check,
  Building2,
  Clock,
  User,
  ArrowRight,
  Filter,
  Zap
} from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule, ERPPDCRecord } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { toast } from 'sonner';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { ZFPrintDocumentLayout } from './v2/common/ZFPrintDocumentLayout';

interface HandCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ERPPDCRecord | null;
  allItems?: ERPPDCRecord[];
  contracts?: ERPContract[];
  schedules?: ERPInstallmentSchedule[];
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
    const existingTrancheKeys = new Set((allItems || []).map(p => `${p.contract_id}-${p.due_date}`));

    const combined: ERPPDCRecord[] = [...(allItems || [])];

    if (item && !existingPdcIds.has(item.cheque_id)) {
      combined.unshift(item);
      existingPdcIds.add(item.cheque_id);
    }

    // Auto-synthesize any pending schedules not yet in pdcRecords
    (schedules || []).forEach(s => {
      if (s.status === 'Paid') return;
      const key = `${s.contract_id}-${s.due_date}`;
      const syntheticId = `SND-${s.contract_id.replace(/[^0-9]/g, '')}-T${s.tranche_number}`;
      if (!existingPdcIds.has(syntheticId) && !existingTrancheKeys.has(key)) {
        const linkedC = contracts.find(c => c.contract_id === s.contract_id);
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
        existingTrancheKeys.add(key);
      }
    });

    return combined;
  }, [allItems, item, schedules, contracts, isAr]);

  // Sync selectedItem on modal open or item prop change
  useEffect(() => {
    if (isOpen) {
      if (item) {
        setSelectedItem(item);
      } else if (masterList.length > 0) {
        // Default to first pending or overdue item
        const defaultTarget = masterList.find(p => p.status !== 'Cleared' && p.due_date < todayStr)
          || masterList.find(p => p.status !== 'Cleared')
          || masterList[0];
        setSelectedItem(defaultTarget || null);
      }
    }
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
          ? (isAr ? 'تحويل فوري عبر إنستاباي بحساب البنك' : 'Instant transfer via InstaPay')
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
            ? (isAr ? 'تحويل فوري عبر إنستاباي بحساب البنك' : 'Instant transfer via InstaPay')
            : (isAr ? 'تم استلام الدفعة نقدياً باليد بمقر الشركة' : 'Direct cash installment collected by hand')
      );
      setError('');
    }
  }, [selectedItem, paymentMethod, isAr]);

  // Contract linked to the currently selected item
  const currentContract = useMemo(() => {
    if (!selectedItem) return linkedContract;
    return contracts.find(c => c.contract_id === selectedItem.contract_id) || linkedContract;
  }, [selectedItem, contracts, linkedContract]);

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
        badgeBg: 'rgba(239, 68, 68, 0.08)',
        badgeColor: '#dc2626',
        badgeBorder: 'rgba(239, 68, 68, 0.22)',
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
        badgeBg: 'rgba(184, 144, 62, 0.08)',
        badgeColor: '#946f23',
        badgeBorder: 'rgba(184, 144, 62, 0.22)',
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
        badgeBg: 'rgba(16, 185, 129, 0.08)',
        badgeColor: '#059669',
        badgeBorder: 'rgba(16, 185, 129, 0.22)',
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
      onClose();
    } catch (err: unknown) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error(isAr ? 'فشلت عملية التحصيل' : 'Collection failed', { description: msg });
    }
  };

  const handlePrint = () => {
    toast.info(isAr ? 'جاري تجهيز سند القبض للطباعة...' : 'Preparing receipt voucher for printing...');
    window.print();
  };

  const nominalVal = selectedItem ? D(selectedItem.nominal_value || '0') : D(0);

  const voucherAmount = collectedAmount || (selectedItem ? selectedItem.nominal_value : '0');
  const voucherBuyer = selectedItem?.drawer_name || linkedContract?.buyer_name || (isAr ? 'العميل المتعاقد' : 'Client');
  const voucherUnit = linkedContract?.unit_id || (isAr ? 'وحدة عقارية' : 'Unit');
  const voucherContractNo = linkedContract?.contract_number || selectedItem?.contract_id || '—';
  const effectiveVoucherCode = receiptNo || selectedItem?.cheque_number || `SND-${Date.now().toString().slice(-6)}`;

  const voucherBody = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', direction: isAr ? 'rtl' : 'ltr' }}>
      {/* 1. Amount Box */}
      <div style={{
        border: '2px solid #0f172a',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', display: 'block' }}>
            {isAr ? 'المبلغ المسدد والمثبت رسمياً:' : 'Paid & Confirmed Amount:'}
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums', marginTop: '0.2rem' }}>
            {D(voucherAmount).formatEGP(isAr)}
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b8903e', marginTop: '0.35rem' }}>
            {tafqeetEGP(voucherAmount)}
          </div>
        </div>
        <div style={{ textAlign: isAr ? 'left' : 'right' }}>
          <span style={{
            display: 'inline-block',
            background: paymentMethod === 'INSTAPAY' ? '#0284c7' : '#059669',
            color: '#ffffff',
            padding: '0.4rem 0.85rem',
            borderRadius: '6px',
            fontSize: '0.82rem',
            fontWeight: 800
          }}>
            {paymentMethod === 'INSTAPAY' ? (isAr ? 'تحويل فوري إنستاباي' : 'InstaPay Transfer') : (isAr ? 'سداد نقدي بالخزينة' : 'Cash in Hand')}
          </span>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.4rem' }}>
            {paymentMethod === 'INSTAPAY' 
              ? (isAr ? 'حسابات البنوك والإنستاباي (102000)' : 'Corporate Bank (102000)') 
              : (isAr ? 'الخزينة النقدية الرئيسية (101000)' : 'Corporate Cash Safe (101000)')}
          </div>
        </div>
      </div>

      {/* 2. Metadata Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, width: '25%', color: '#334155' }}>
              {isAr ? 'اسم العميل / المستلم منه:' : 'Payer Name:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 900, width: '35%', color: '#0f172a' }}>
              {voucherBuyer}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, width: '20%', color: '#334155' }}>
              {isAr ? 'الوحدة والعقد:' : 'Unit & Contract:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, width: '20%', color: '#0f172a' }}>
              {voucherUnit} (#{voucherContractNo})
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#334155' }}>
              {isAr ? 'رقم السند / الشيك / الإيصال:' : 'Voucher / Instrument #:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
              {effectiveVoucherCode}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#334155' }}>
              {isAr ? 'تاريخ الاستحقاق التعاقدي:' : 'Contract Due Date:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
              {selectedItem?.due_date || collectionDate}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#334155' }}>
              {isAr ? 'طريقة التحصيل والاستلام:' : 'Payment Channel:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
              {paymentMethod === 'INSTAPAY' 
                ? (isAr ? 'تحويل إلكتروني فوري عبر تطبيق إنستاباي' : 'Electronic instant transfer via InstaPay') 
                : (isAr ? 'توريد نقدي فوري بالخزينة بمقر الشركة' : 'Direct cash receipt in safe')}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#334155' }}>
              {isAr ? 'تاريخ السداد الفعلي:' : 'Payment Date:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#059669' }}>
              {collectionDate}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#334155' }}>
              {isAr ? 'البيان والملاحظات:' : 'Notes / Memo:'}
            </td>
            <td colSpan={3} style={{ padding: '0.75rem 1rem', color: '#475569' }}>
              {collectionNotes || (isAr ? `سداد قسط مستحق عن الوحدة ${voucherUnit} بموجب العقد رقم ${voucherContractNo}` : `Payment for unit ${voucherUnit}`)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 3. Posting summary */}
      <div style={{
        background: '#f1f5f9',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        fontSize: '0.76rem',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>
          <strong>{isAr ? 'طرف القيد المدين: ' : 'Dr: '}</strong>
          {paymentMethod === 'INSTAPAY' ? (isAr ? 'حـ/ البنك والتحويلات (102000)' : 'Bank (102000)') : (isAr ? 'حـ/ الخزينة النقدية الرئيسية (101000)' : 'Cash Safe (101000)')}
        </span>
        <span>
          <strong>{isAr ? 'طرف القيد الدائن: ' : 'Cr: '}</strong>
          {isAr ? 'حـ/ أوراق وقبض الخزينة (103200) وحـ/ الإيرادات المؤجلة (206100)' : 'Installments Receivable (103200) / Deferred Revenue (206100)'}
        </span>
      </div>
    </div>
  );

  // Helper for due badge styling
  const getDueBadge = (dueDate: string, status: string) => {
    if (status === 'Cleared') {
      return {
        label: isAr ? 'تم التحصيل' : 'Cleared',
        bg: 'rgba(16, 185, 129, 0.1)',
        color: '#059669',
        border: 'rgba(16, 185, 129, 0.25)'
      };
    }
    if (status === 'Deposited') {
      return {
        label: isAr ? 'بانتظار إنستاباي' : 'InstaPay Expected',
        bg: 'rgba(56, 189, 248, 0.1)',
        color: '#0284c7',
        border: 'rgba(56, 189, 248, 0.25)'
      };
    }
    if (dueDate < todayStr) {
      const diff = Math.round((new Date(todayStr).getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
      return {
        label: isAr ? `متأخر (${diff} يوم)` : `Overdue (${diff}d)`,
        bg: 'rgba(239, 68, 68, 0.1)',
        color: '#dc2626',
        border: 'rgba(239, 68, 68, 0.25)'
      };
    }
    if (dueDate === todayStr) {
      return {
        label: isAr ? 'يستحق اليوم' : 'Due Today',
        bg: 'rgba(245, 158, 11, 0.12)',
        color: '#d97706',
        border: 'rgba(245, 158, 11, 0.28)'
      };
    }
    return {
      label: isAr ? 'في الخزينة / مستحق' : 'In Safe / Due',
      bg: 'rgba(184, 144, 62, 0.1)',
      color: '#946f23',
      border: 'rgba(184, 144, 62, 0.25)'
    };
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.55)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.25rem',
      direction: isAr ? 'rtl' : 'ltr'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '1180px',
        height: 'min(860px, 92vh)',
        boxShadow: '0 25px 65px -15px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* ══════════════════════════════════════════════════════════════════════════
            1. MODAL TOP HEADER BAR
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
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)'
            }}>
              <Wallet size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                  {isAr ? 'إجراء تحصيل الأقساط (نقداً باليد أو إنستاباي)' : 'Installment Collection Studio (Cash or InstaPay)'}
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
                  {isAr ? 'الخزينة [101000] • إنستاباي [102000]' : 'Safe [101000] • InstaPay [102000]'}
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                {isAr 
                  ? 'اختر القسط المطلوب لإثبات الاستلام (نقداً بالخزينة أو عبر تحويل إنستاباي) وتوليد الإيصال وقيد اليومية فوراً.'
                  : 'Select any installment to record collection (cash in safe or InstaPay) and post balanced GL entry.'}
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
          gridTemplateColumns: '435px 1fr',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}>

          {/* ──────────────────────────────────────────────────────────────────
              SIDE 1 (MASTER): LIST OF ALL INSTALLMENTS & AGENDA
              ────────────────────────────────────────────────────────────────── */}
          <div style={{
            background: '#f8fafc',
            borderLeft: isAr ? '1px solid #e2e8f0' : 'none',
            borderRight: isAr ? 'none' : '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}>
            
            {/* Search Input Box */}
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
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
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    color: '#0f172a',
                    outline: 'none',
                    fontWeight: 600
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
              gap: '0.25rem',
              padding: '0.45rem 0.65rem',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              overflowX: 'auto',
              scrollbarWidth: 'none'
            }}>
              <button
                type="button"
                onClick={() => setFilterTab('pending')}
                style={{
                  padding: '0.24rem 0.45rem',
                  borderRadius: '8px',
                  fontSize: '0.71rem',
                  fontWeight: filterTab === 'pending' ? 800 : 600,
                  background: filterTab === 'pending' ? '#0f172a' : '#ffffff',
                  color: filterTab === 'pending' ? '#ffffff' : '#64748b',
                  border: filterTab === 'pending' ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <span>{isAr ? 'المعلقة' : 'Pending'}</span>
                <span style={{
                  background: filterTab === 'pending' ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                  padding: '0.06rem 0.3rem',
                  borderRadius: '10px',
                  fontSize: '0.64rem'
                }}>
                  {tabCounts.pending}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('overdue')}
                style={{
                  padding: '0.24rem 0.45rem',
                  borderRadius: '8px',
                  fontSize: '0.71rem',
                  fontWeight: filterTab === 'overdue' ? 800 : 600,
                  background: filterTab === 'overdue' ? '#dc2626' : '#ffffff',
                  color: filterTab === 'overdue' ? '#ffffff' : '#dc2626',
                  border: filterTab === 'overdue' ? '1px solid #dc2626' : '1px solid rgba(239, 68, 68, 0.25)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <span>{isAr ? 'متأخرة' : 'Overdue'}</span>
                {tabCounts.overdue > 0 && (
                  <span style={{
                    background: filterTab === 'overdue' ? 'rgba(255,255,255,0.25)' : 'rgba(239, 68, 68, 0.1)',
                    padding: '0.06rem 0.3rem',
                    borderRadius: '10px',
                    fontSize: '0.64rem'
                  }}>
                    {tabCounts.overdue}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('week')}
                style={{
                  padding: '0.24rem 0.45rem',
                  borderRadius: '8px',
                  fontSize: '0.71rem',
                  fontWeight: filterTab === 'week' ? 800 : 600,
                  background: filterTab === 'week' ? '#946f23' : '#ffffff',
                  color: filterTab === 'week' ? '#ffffff' : '#64748b',
                  border: filterTab === 'week' ? '1px solid #946f23' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <span>{isAr ? 'خلال أسبوع' : 'This Week'}</span>
                <span style={{
                  background: filterTab === 'week' ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                  padding: '0.06rem 0.3rem',
                  borderRadius: '10px',
                  fontSize: '0.64rem'
                }}>
                  {tabCounts.week}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('all')}
                style={{
                  padding: '0.24rem 0.45rem',
                  borderRadius: '8px',
                  fontSize: '0.71rem',
                  fontWeight: filterTab === 'all' ? 800 : 600,
                  background: filterTab === 'all' ? '#334155' : '#ffffff',
                  color: filterTab === 'all' ? '#ffffff' : '#64748b',
                  border: filterTab === 'all' ? '1px solid #334155' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <span>{isAr ? 'الكل' : 'All'}</span>
                <span style={{
                  background: filterTab === 'all' ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                  padding: '0.06rem 0.3rem',
                  borderRadius: '10px',
                  fontSize: '0.64rem'
                }}>
                  {tabCounts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('cleared')}
                style={{
                  padding: '0.24rem 0.45rem',
                  borderRadius: '8px',
                  fontSize: '0.71rem',
                  fontWeight: filterTab === 'cleared' ? 800 : 600,
                  background: filterTab === 'cleared' ? '#059669' : '#ffffff',
                  color: filterTab === 'cleared' ? '#ffffff' : '#059669',
                  border: filterTab === 'cleared' ? '1px solid #059669' : '1px solid rgba(16, 185, 129, 0.25)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <span>{isAr ? 'المحصلة' : 'Cleared'}</span>
                <span style={{
                  background: filterTab === 'cleared' ? 'rgba(255,255,255,0.2)' : 'rgba(16, 185, 129, 0.1)',
                  padding: '0.06rem 0.3rem',
                  borderRadius: '10px',
                  fontSize: '0.64rem'
                }}>
                  {tabCounts.cleared}
                </span>
              </button>
            </div>

            {/* List Summary Bar */}
            <div style={{
              padding: '0.45rem 1rem',
              background: '#f1f5f9',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.7rem',
              color: '#64748b'
            }}>
              <span>
                {isAr ? `المعروض: ${filteredItems.length} قسط` : `Showing: ${filteredItems.length} installments`}
              </span>
              <span style={{ fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {filteredSum.formatEGP(isAr)}
              </span>
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
                  <Filter size={24} color="#cbd5e1" />
                  <span>{isAr ? 'لا توجد أقساط مطابقة للبحث أو الفلتر المحدد.' : 'No installments match the search filter.'}</span>
                </div>
              ) : (
                prioritizedSections.map(section => (
                  <div key={section.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    {/* Priority Section Sticky Header */}
                    <div style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.75rem',
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
                      <span style={{
                        fontWeight: 800,
                        color: section.badgeColor,
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '0.72rem'
                      }}>
                        {section.subtotal.formatEGP(isAr)}
                      </span>
                    </div>

                    {/* Section Cards */}
                    {section.items.map(p => {
                      const isSelected = selectedItem?.cheque_id === p.cheque_id;
                      const linkedC = contracts.find(c => c.contract_id === p.contract_id);
                      const badge = getDueBadge(p.due_date, p.status);
                      const pNominal = D(p.nominal_value || '0');

                      return (
                        <div
                          key={p.cheque_id}
                          onClick={() => setSelectedItem(p)}
                          style={{
                            padding: '0.85rem',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            background: isSelected ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' : '#ffffff',
                            border: isSelected ? '2px solid #0f172a' : '1px solid #e2e8f0',
                            boxShadow: isSelected ? '0 4px 14px rgba(15, 23, 42, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                            transition: 'all 0.15s ease',
                            position: 'relative'
                          }}
                        >
                          {/* Top Row: Client Name + Due Badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <User size={13} color="#64748b" />
                              <strong style={{ fontSize: '0.82rem', color: isSelected ? '#0f172a' : '#1e293b' }}>
                                {p.drawer_name}
                              </strong>
                            </div>

                            <span style={{
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '12px',
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              whiteSpace: 'nowrap'
                            }}>
                              {badge.label}
                            </span>
                          </div>

                          {/* Middle Row: Contract / Unit Details */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.72rem',
                            color: '#64748b',
                            marginBottom: '0.45rem'
                          }}>
                            <Building2 size={12} color="#946f23" />
                            <span style={{ color: '#946f23', fontWeight: 600 }}>
                              {linkedC ? `#${linkedC.contract_number} (${linkedC.unit_id})` : `#${p.contract_id.slice(0, 8)}`}
                            </span>
                            <span>•</span>
                            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {isAr ? `قسط #${p.cheque_number.replace(/^(CHQ|SND)-/, '')}` : `Installment #${p.cheque_number.replace(/^(CHQ|SND)-/, '')}`}
                            </span>
                          </div>

                          {/* Bottom Row: Due Date + Nominal Amount */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTop: '1px solid #f1f5f9',
                            paddingTop: '0.45rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#64748b' }}>
                              <Clock size={11} />
                              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.due_date}</span>
                            </div>

                            <div style={{
                              fontSize: '0.86rem',
                              fontWeight: 900,
                              color: isSelected ? '#0f172a' : '#334155',
                              fontVariantNumeric: 'tabular-nums'
                            }}>
                              {pNominal.formatEGP(isAr)}
                            </div>
                          </div>

                          {/* Selected Ribbon Badge */}
                          {isSelected && (
                            <div style={{
                              position: 'absolute',
                              top: '-6px',
                              [isAr ? 'left' : 'right']: '12px',
                              background: '#0f172a',
                              color: '#ffffff',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '8px',
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.25)'
                            }}>
                              <Check size={10} />
                              <span>{p.status === 'Cleared' ? (isAr ? 'معاينة السند المحصل' : 'Viewing Cleared') : (isAr ? 'محدد للتحصيل' : 'Active Selection')}</span>
                            </div>
                          )}
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
                  background: 'rgba(184, 144, 62, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#946f23',
                  marginBottom: '1rem'
                }}>
                  <ArrowRight size={28} />
                </div>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
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
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      color: '#dc2626',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Target Item Details Voucher Preview - Rich Gold Accent Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #fffdf8 0%, #fbf6ec 100%)',
                    border: '1.5px solid #d4af37',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 18px -2px rgba(184, 144, 62, 0.16), 0 1px 3px rgba(0, 0, 0, 0.04)'
                  }}>
                    {/* Top Voucher Ribbon / Banner */}
                    <div style={{
                      padding: '0.65rem 1rem',
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(184, 144, 62, 0.1) 100%)',
                      borderBottom: '1.5px solid rgba(212, 175, 55, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #d4af37 0%, #b8903e 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          boxShadow: '0 2px 5px rgba(184, 144, 62, 0.3)'
                        }}>
                          <ShieldCheck size={14} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#785210', letterSpacing: '0.01em' }}>
                          {isAr ? 'زكريا فريد للتطوير العقاري • إيصال تحصيل نقدية' : 'ZF REAL ESTATE • CASH VOUCHER'}
                        </span>
                      </div>

                      <span style={{
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: '#ffffff',
                        color: '#785210',
                        padding: '0.12rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(212, 175, 55, 0.4)',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                      }}>
                        #{selectedItem.cheque_id.slice(0, 10)}
                      </span>
                    </div>

                    {isCleared && (
                      <div style={{
                        padding: '0.45rem 1rem',
                        background: 'rgba(16, 185, 129, 0.1)',
                        borderBottom: '1.5px solid rgba(16, 185, 129, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.74rem',
                        color: '#065f46',
                        fontWeight: 800
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CheckCircle2 size={15} color="#059669" />
                          <span>{isAr ? 'تم استلام وتوريد هذا القسط للخزينة مسبقاً (سند مقفل)' : 'Installment already collected & cleared into safe (Locked Voucher)'}</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                          {isAr ? `تاريخ التحصيل: ${selectedItem.cleared_date || selectedItem.due_date}` : `Cleared: ${selectedItem.cleared_date || selectedItem.due_date}`}
                        </span>
                      </div>
                    )}

                    {/* Voucher Body Details Grid */}
                    <div style={{
                      padding: '0.85rem 1rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.75rem',
                      fontSize: '0.76rem'
                    }}>
                      <div>
                        <span style={{ color: '#785210', fontSize: '0.68rem', fontWeight: 700, display: 'block', marginBottom: '0.15rem' }}>
                          {isAr ? 'العميل الملتزم بالسداد:' : 'Client:'}
                        </span>
                        <strong style={{ color: '#0f172a', fontSize: '0.9rem', fontWeight: 800 }}>
                          {selectedItem.drawer_name}
                        </strong>
                      </div>

                      <div>
                        <span style={{ color: '#785210', fontSize: '0.68rem', fontWeight: 700, display: 'block', marginBottom: '0.15rem' }}>
                          {isAr ? 'العقد والوحدة:' : 'Contract & Unit:'}
                        </span>
                        <span style={{ color: '#946f23', fontWeight: 800, fontSize: '0.8rem' }}>
                          {currentContract ? `#${currentContract.contract_number} (${currentContract.unit_id})` : `#${selectedItem.contract_id.slice(0, 8)}`}
                        </span>
                      </div>

                      <div>
                        <span style={{ color: '#785210', fontSize: '0.68rem', fontWeight: 700, display: 'block', marginBottom: '0.15rem' }}>
                          {isAr ? 'تاريخ الاستحقاق الدفتري:' : 'Due Date:'}
                        </span>
                        <span style={{ color: '#334155', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '0.82rem' }}>
                          {selectedItem.due_date}
                        </span>
                      </div>

                      <div>
                        <span style={{ color: '#785210', fontSize: '0.68rem', fontWeight: 700, display: 'block', marginBottom: '0.15rem' }}>
                          {isAr ? 'قيمة القسط المطلوبة:' : 'Due Amount:'}
                        </span>
                        <span style={{ color: '#047857', fontWeight: 900, fontSize: '1.02rem', fontVariantNumeric: 'tabular-nums' }}>
                          {nominalVal.formatEGP(isAr)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selector Toggle */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.74rem', color: '#334155', fontWeight: 700 }}>
                      {isAr ? 'طريقة التحصيل والاستلام *' : 'Collection Method *'}
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.65rem',
                      background: '#f8fafc',
                      padding: '0.35rem',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => handlePaymentMethodChange('CASH')}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: paymentMethod === 'CASH' ? '2px solid #0f172a' : '1px solid #e2e8f0',
                          background: paymentMethod === 'CASH' ? 'rgba(15, 23, 42, 0.05)' : '#ffffff',
                          color: paymentMethod === 'CASH' ? '#0f172a' : '#64748b',
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
                        <Wallet size={16} color={paymentMethod === 'CASH' ? '#0f172a' : '#64748b'} />
                        <span>{isAr ? 'نقداً باليد (الخزينة 101000)' : 'Cash in Hand (Safe 101000)'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => handlePaymentMethodChange('INSTAPAY')}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: paymentMethod === 'INSTAPAY' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                          background: paymentMethod === 'INSTAPAY' ? 'rgba(2, 132, 199, 0.08)' : '#ffffff',
                          color: paymentMethod === 'INSTAPAY' ? '#0369a1' : '#64748b',
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
                        <span>{isAr ? 'تحويل فوري إنستاباي (102000)' : 'InstaPay Instant (102000)'}</span>
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
                          background: isReadOnly ? '#f8fafc' : '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          color: isReadOnly ? '#475569' : '#0f172a',
                          fontSize: '0.82rem',
                          outline: 'none',
                          cursor: isReadOnly ? 'not-allowed' : 'text'
                        }}
                      />
                    </div>

                    {/* Receipt Voucher Number */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: '#334155', marginBottom: '0.3rem', fontWeight: 700 }}>
                        <Receipt size={13} style={{ display: 'inline', marginLeft: isAr ? '0.35rem' : 0, marginRight: isAr ? 0 : '0.35rem' }} />
                        {paymentMethod === 'INSTAPAY'
                          ? (isAr ? 'رقم مرجع تحويل إنستاباي *' : 'InstaPay Ref # *')
                          : (isAr ? 'رقم إيصال الاستلام النقدي *' : 'Receipt Voucher # *')}
                      </label>
                      <input 
                        type="text"
                        required
                        disabled={isReadOnly}
                        value={receiptNo}
                        onChange={e => setReceiptNo(e.target.value)}
                        placeholder={paymentMethod === 'INSTAPAY' ? 'IP-2026-XXXX' : 'RCP-2026-XXXX'}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          background: isReadOnly ? '#f8fafc' : '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          color: isReadOnly ? '#475569' : '#0f172a',
                          fontSize: '0.82rem',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                          outline: 'none',
                          cursor: isReadOnly ? 'not-allowed' : 'text'
                        }}
                      />
                    </div>
                  </div>

                  {/* Amount Paid Field */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: '#334155', marginBottom: '0.3rem', fontWeight: 700 }}>
                      {paymentMethod === 'INSTAPAY'
                        ? (isAr ? 'المبلغ المحول عبر إنستاباي (ج.م) *' : 'Amount Received via InstaPay (EGP) *')
                        : (isAr ? 'المبلغ المستلم نقداً (ج.م) *' : 'Amount Received in Cash (EGP) *')}
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      disabled={isReadOnly}
                      value={collectedAmount}
                      onChange={e => setCollectedAmount(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.85rem',
                        background: isReadOnly ? '#f8fafc' : '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '8px',
                        color: '#0f172a',
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                        outline: 'none',
                        boxSizing: 'border-box',
                        cursor: isReadOnly ? 'not-allowed' : 'text',
                        transition: 'border-color 0.15s ease'
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#0f172a'}
                      onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                    />
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
                        background: isReadOnly ? '#f8fafc' : '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: isReadOnly ? '#475569' : '#0f172a',
                        fontSize: '0.78rem',
                        outline: 'none',
                        cursor: isReadOnly ? 'not-allowed' : 'text'
                      }}
                    />
                  </div>

                  {/* Automated Accounting Posting Strip */}
                  <div style={{
                    background: isCleared ? 'rgba(16, 185, 129, 0.08)' : (paymentMethod === 'INSTAPAY' ? 'rgba(2, 132, 199, 0.08)' : 'rgba(16, 185, 129, 0.05)'),
                    border: isCleared ? '1px solid rgba(16, 185, 129, 0.2)' : (paymentMethod === 'INSTAPAY' ? '1px solid rgba(2, 132, 199, 0.25)' : '1px solid rgba(16, 185, 129, 0.2)'),
                    borderRadius: '10px',
                    padding: '0.55rem 0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.72rem',
                    color: paymentMethod === 'INSTAPAY' && !isCleared ? '#0369a1' : '#065f46',
                    fontWeight: isCleared ? 700 : 500
                  }}>
                    <CheckCircle2 size={15} color={paymentMethod === 'INSTAPAY' && !isCleared ? '#0284c7' : '#059669'} />
                    <span>
                      {isCleared 
                        ? (isAr 
                            ? 'الحالة المحاسبية: مُثبت دفترياً ومُرحّل بالكامل مع تسوية أوراق القبض (103200).' 
                            : 'GL Status: Cleared & settled against Notes Receivable (103200).')
                        : paymentMethod === 'INSTAPAY'
                          ? (isAr 
                              ? 'التوجيه المحاسبي: مدين حـ/ بنك المعاملات والتحويلات الفورية (102000) • دائن حـ/ أوراق القبض (103200).'
                              : 'GL Impact: Dr Instant Bank (102000) • Cr Notes Receivable (103200).')
                          : (isAr 
                              ? 'التوجيه المحاسبي: مدين حـ/ الخزينة الرئيسية (101000) • دائن حـ/ أوراق القبض (103200).'
                              : 'GL Impact: Dr Safe (101000) • Cr Notes Receivable (103200).')}
                    </span>
                  </div>
                </div>

                {/* Modal Footer Buttons */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '0.85rem',
                  marginTop: 'auto'
                }}>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handlePrint}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        padding: '0.5rem 0.9rem',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Printer size={14} />
                      <span>{isAr ? 'طباعة سند القبض' : 'Print Voucher'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPrintPreview(true)}
                      style={{
                        background: 'rgba(184, 144, 62, 0.08)',
                        border: '1px solid rgba(184, 144, 62, 0.25)',
                        color: '#946f23',
                        padding: '0.5rem 0.85rem',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        cursor: 'pointer'
                      }}
                    >
                      <FileText size={14} />
                      <span>{isAr ? 'معاينة السند' : 'Preview'}</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#64748b',
                        padding: '0.5rem 0.95rem',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isCleared ? (isAr ? 'إغلاق المعاينة' : 'Close') : (isAr ? 'إلغاء' : 'Cancel')}
                    </button>

                    {isCleared ? (
                      <div
                        style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#059669',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          padding: '0.5rem 1.1rem',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          userSelect: 'none'
                        }}
                      >
                        <CheckCircle2 size={14} color="#059669" />
                        <span>{isAr ? 'تم التحصيل مسبقاً (سند مقفل)' : 'Already Cleared (Locked)'}</span>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={isMutating}
                        style={{
                          background: paymentMethod === 'INSTAPAY'
                            ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                            : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.5rem 1.2rem',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: isMutating ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          boxShadow: paymentMethod === 'INSTAPAY'
                            ? '0 2px 8px rgba(2, 132, 199, 0.3)'
                            : '0 2px 8px rgba(5, 150, 105, 0.3)'
                        }}
                      >
                        {isMutating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
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
      </div>

      {/* Screen Preview Modal */}
      {showPrintPreview && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
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
              borderRadius: '12px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <ZFPrintDocumentLayout
              documentTitle={paymentMethod === 'INSTAPAY' ? (isAr ? 'إشعار استلام تحويل إنستاباي' : 'InstaPay Receipt Voucher') : (isAr ? 'سند قبض نقدية رسمي' : 'Official Cash Receipt Voucher')}
              documentSubtitle={paymentMethod === 'INSTAPAY' 
                ? (isAr ? 'إيداع بنكي فوري - حساب الشركة (102000)' : 'Corporate Bank Deposit (102000)')
                : (isAr ? 'توريد نقدي فوري بخزينة الشركة الرئيسية (101000)' : 'Cash Safe Deposit (101000)')
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
            ? (isAr ? 'إيداع بنكي فوري - حساب الشركة (102000)' : 'Corporate Bank Deposit (102000)')
            : (isAr ? 'توريد نقدي فوري بخزينة الشركة الرئيسية (101000)' : 'Cash Safe Deposit (101000)')
          }
          voucherCode={effectiveVoucherCode}
          date={collectionDate}
          isAr={isAr}
        >
          {voucherBody}
        </ZFPrintDocumentLayout>
      </div>
    </div>
  );
};
