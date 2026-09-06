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
  Filter
} from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule, ERPPDCRecord } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { toast } from 'sonner';

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
    notes: string
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
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [collectionDate, setCollectionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [collectedAmount, setCollectedAmount] = useState<string>('');
  const [collectionNotes, setCollectionNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const nextWeekStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  // Combined full list of items (incorporating item if not in allItems)
  const masterList = useMemo(() => {
    if (!allItems || allItems.length === 0) {
      return item ? [item] : [];
    }
    if (item && !allItems.some(p => p.cheque_id === item.cheque_id)) {
      return [item, ...allItems];
    }
    return allItems;
  }, [allItems, item]);

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

  // Sync form inputs whenever selectedItem changes
  useEffect(() => {
    if (selectedItem) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const cleanCode = (selectedItem.cheque_number || '').replace(/[^0-9]/g, '').slice(-4) || randomSuffix.toString();
      setReceiptNo(`RCP-${new Date().getFullYear()}-${cleanCode}`);
      setCollectionDate(new Date().toISOString().split('T')[0]);
      setCollectedAmount(D(selectedItem.nominal_value || '0').toFixed(2));
      setCollectionNotes(isAr ? 'تم استلام الدفعة نقدياً باليد بمقر الشركة' : 'Direct cash installment collected by hand');
      setError('');
    }
  }, [selectedItem, isAr]);

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      const msg = isAr ? 'يرجى اختيار قسط من القائمة أولاً' : 'Please select an installment first';
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
      await onConfirmCollection(selectedItem, receiptNo.trim(), collectionDate, collectedAmount, collectionNotes.trim());
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
        label: isAr ? 'قيد التحصيل بالبنك' : 'In Transit',
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
      label: isAr ? 'في الخزينة' : 'In Safe',
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
        maxWidth: '1120px',
        height: 'min(820px, 94vh)',
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
                  {isAr ? 'إجراء تحصيل القسط / البند نقداً باليد' : 'Hand Cash Collection & Receipt Studio'}
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
                  {isAr ? 'الخزينة الرئيسية [101000]' : 'Main Safe [101000]'}
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                {isAr 
                  ? 'اختر القسط المطلوب من القائمة الجانبية لإثبات استلام النقدية وتوليد إيصال الاستلام وقيد اليومية فوراً.'
                  : 'Select any pending installment from the side agenda to record cash receipt and post balanced GL entry.'}
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
          gridTemplateColumns: '400px 1fr',
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
              gap: '0.35rem',
              padding: '0.55rem 0.85rem',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              overflowX: 'auto'
            }}>
              <button
                type="button"
                onClick={() => setFilterTab('pending')}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.73rem',
                  fontWeight: filterTab === 'pending' ? 800 : 600,
                  background: filterTab === 'pending' ? '#0f172a' : '#ffffff',
                  color: filterTab === 'pending' ? '#ffffff' : '#64748b',
                  border: filterTab === 'pending' ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{isAr ? 'المعلقة' : 'Pending'}</span>
                <span style={{
                  background: filterTab === 'pending' ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '10px',
                  fontSize: '0.66rem'
                }}>
                  {tabCounts.pending}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('overdue')}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.73rem',
                  fontWeight: filterTab === 'overdue' ? 800 : 600,
                  background: filterTab === 'overdue' ? '#dc2626' : '#ffffff',
                  color: filterTab === 'overdue' ? '#ffffff' : '#dc2626',
                  border: filterTab === 'overdue' ? '1px solid #dc2626' : '1px solid rgba(239, 68, 68, 0.25)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{isAr ? 'متأخرة' : 'Overdue'}</span>
                {tabCounts.overdue > 0 && (
                  <span style={{
                    background: filterTab === 'overdue' ? 'rgba(255,255,255,0.25)' : 'rgba(239, 68, 68, 0.1)',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '10px',
                    fontSize: '0.66rem'
                  }}>
                    {tabCounts.overdue}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('week')}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.73rem',
                  fontWeight: filterTab === 'week' ? 800 : 600,
                  background: filterTab === 'week' ? '#946f23' : '#ffffff',
                  color: filterTab === 'week' ? '#ffffff' : '#64748b',
                  border: filterTab === 'week' ? '1px solid #946f23' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{isAr ? 'خلال أسبوع' : 'This Week'}</span>
                <span style={{
                  background: filterTab === 'week' ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '10px',
                  fontSize: '0.66rem'
                }}>
                  {tabCounts.week}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('all')}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.73rem',
                  fontWeight: filterTab === 'all' ? 800 : 600,
                  background: filterTab === 'all' ? '#334155' : '#ffffff',
                  color: filterTab === 'all' ? '#ffffff' : '#64748b',
                  border: filterTab === 'all' ? '1px solid #334155' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{isAr ? 'الكل' : 'All'}</span>
                <span style={{
                  background: filterTab === 'all' ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '10px',
                  fontSize: '0.66rem'
                }}>
                  {tabCounts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('cleared')}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.73rem',
                  fontWeight: filterTab === 'cleared' ? 800 : 600,
                  background: filterTab === 'cleared' ? '#059669' : '#ffffff',
                  color: filterTab === 'cleared' ? '#ffffff' : '#059669',
                  border: filterTab === 'cleared' ? '1px solid #059669' : '1px solid rgba(16, 185, 129, 0.25)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{isAr ? 'المحصلة' : 'Cleared'}</span>
                <span style={{
                  background: filterTab === 'cleared' ? 'rgba(255,255,255,0.2)' : 'rgba(16, 185, 129, 0.1)',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '10px',
                  fontSize: '0.66rem'
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
                filteredItems.map(p => {
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
                        background: isSelected ? 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)' : '#ffffff',
                        border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                        boxShadow: isSelected ? '0 4px 14px rgba(5, 150, 105, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease',
                        position: 'relative'
                      }}
                    >
                      {/* Top Row: Client Name + Due Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <User size={13} color="#64748b" />
                          <strong style={{ fontSize: '0.82rem', color: isSelected ? '#065f46' : '#0f172a' }}>
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
                          {isAr ? `سند #${p.cheque_number}` : `Voucher #${p.cheque_number}`}
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
                          color: isSelected ? '#059669' : '#0f172a',
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
                          background: '#059669',
                          color: '#ffffff',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '8px',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
                        }}>
                          <Check size={10} />
                          <span>{isAr ? 'محدد للتحصيل' : 'Active Selection'}</span>
                        </div>
                      )}
                    </div>
                  );
                })
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
              <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                
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

                {/* Target Item Details Voucher Preview */}
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #fefdfa 100%)',
                  border: '1.5px solid rgba(184, 144, 62, 0.3)',
                  borderRadius: '14px',
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  boxShadow: '0 2px 8px rgba(184, 144, 62, 0.06)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <ShieldCheck size={14} color="#946f23" />
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#946f23' }}>
                        {isAr ? 'زكريا فريد للتطوير العقاري • إيصال تحصيل نقدية' : 'ZF REAL ESTATE • CASH VOUCHER'}
                      </span>
                    </div>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.72rem', color: '#64748b' }}>
                      #{selectedItem.cheque_id.slice(0, 10)}
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.85rem',
                    fontSize: '0.76rem'
                  }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>{isAr ? 'العميل الملتزم بالسداد:' : 'Client:'}</span>
                      <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>{selectedItem.drawer_name}</strong>
                    </div>

                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>{isAr ? 'العقد والوحدة:' : 'Contract & Unit:'}</span>
                      <span style={{ color: '#946f23', fontWeight: 700 }}>
                        {currentContract ? `#${currentContract.contract_number} (${currentContract.unit_id})` : `#${selectedItem.contract_id.slice(0, 8)}`}
                      </span>
                    </div>

                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>{isAr ? 'تاريخ الاستحقاق الدفتري:' : 'Due Date:'}</span>
                      <span style={{ color: '#334155', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{selectedItem.due_date}</span>
                    </div>

                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>{isAr ? 'قيمة القسط المطلوبة:' : 'Due Amount:'}</span>
                      <span style={{ color: '#15803d', fontWeight: 800, fontSize: '0.95rem' }}>{nominalVal.formatEGP(isAr)}</span>
                    </div>
                  </div>
                </div>

                {/* Form Inputs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Actual Collection Date */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#334155', marginBottom: '0.35rem', fontWeight: 700 }}>
                      <Calendar size={13} style={{ display: 'inline', marginLeft: isAr ? '0.35rem' : 0, marginRight: isAr ? 0 : '0.35rem' }} />
                      {isAr ? 'تاريخ الاستلام الفعلي باليد *' : 'Actual Cash Receipt Date *'}
                    </label>
                    <input 
                      type="date"
                      required
                      value={collectionDate}
                      onChange={e => setCollectionDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: '#0f172a',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Receipt Voucher Number */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: '#334155', marginBottom: '0.35rem', fontWeight: 700 }}>
                      <Receipt size={13} style={{ display: 'inline', marginLeft: isAr ? '0.35rem' : 0, marginRight: isAr ? 0 : '0.35rem' }} />
                      {isAr ? 'رقم إيصال الاستلام النقدي *' : 'Receipt Voucher # *'}
                    </label>
                    <input 
                      type="text"
                      required
                      value={receiptNo}
                      onChange={e => setReceiptNo(e.target.value)}
                      placeholder="RCP-2026-XXXX"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: '#0f172a',
                        fontSize: '0.82rem',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 700,
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Amount Paid Field */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#334155', marginBottom: '0.35rem', fontWeight: 700 }}>
                    {isAr ? 'المبلغ المستلم نقداً (ج.م) *' : 'Amount Received in Cash (EGP) *'}
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    value={collectedAmount}
                    onChange={e => setCollectedAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      background: '#ffffff',
                      border: '1.5px solid #059669',
                      borderRadius: '8px',
                      color: '#059669',
                      fontSize: '1.15rem',
                      fontWeight: 900,
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Notes Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#334155', marginBottom: '0.35rem', fontWeight: 700 }}>
                    <FileText size={13} style={{ display: 'inline', marginLeft: isAr ? '0.35rem' : 0, marginRight: isAr ? 0 : '0.35rem' }} />
                    {isAr ? 'ملاحظات التحصيل / جهة الاستلام' : 'Collection Notes'}
                  </label>
                  <input 
                    type="text"
                    value={collectionNotes}
                    onChange={e => setCollectionNotes(e.target.value)}
                    placeholder={isAr ? 'سداد نقدي باليد بالخزينة' : 'Cash in safe'}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#0f172a',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Automated Accounting Posting Strip */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.73rem',
                  color: '#065f46'
                }}>
                  <CheckCircle2 size={15} color="#059669" />
                  <span>
                    {isAr 
                      ? 'التوجيه المحاسبي: مدين حـ/ الخزينة الرئيسية (101000) • دائن حـ/ أوراق القبض (103200).'
                      : 'GL Impact: Dr Safe (101000) • Cr Notes Receivable (103200).'}
                  </span>
                </div>

                {/* Modal Footer Buttons */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '1.25rem',
                  marginTop: '0.25rem'
                }}>
                  <button
                    type="button"
                    onClick={handlePrint}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      padding: '0.55rem 0.95rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
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

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#64748b',
                        padding: '0.55rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>

                    <button
                      type="submit"
                      disabled={isMutating}
                      style={{
                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.55rem 1.25rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: isMutating ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
                      }}
                    >
                      {isMutating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      <span>{isAr ? 'تأكيد التحصيل والتوريد للخزينة' : 'Confirm Cash Collection'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
