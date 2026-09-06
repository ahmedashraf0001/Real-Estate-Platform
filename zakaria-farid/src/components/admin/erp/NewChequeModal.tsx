'use client';

import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  X, 
  Check, 
  FileText, 
  ShieldCheck, 
  Loader2,
  Clock
} from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule } from '@/lib/erp/types';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { D } from '@/lib/erp/math';
import { ZFCustomSelect, ZFCustomSelectSection, ZFCustomSelectItem } from './v2/common/ZFCustomSelect';
import { toast } from 'sonner';

interface NewChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: ERPContract[];
  schedules: ERPInstallmentSchedule[];
  onSaveCheque: (itemData: {
    contractId: string;
    scheduleId?: string;
    chequeNumber: string;
    bankName: string;
    drawerName: string;
    nominalValue: string;
    dueDate: string;
  }) => Promise<void>;
  isMutating?: boolean;
  isAr?: boolean;
}

export const NewChequeModal: React.FC<NewChequeModalProps> = ({
  isOpen,
  onClose,
  contracts,
  schedules,
  onSaveCheque,
  isMutating = false,
  isAr = true
}) => {
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [itemCode, setItemCode] = useState<string>(() => `DUE-${Math.floor(10000 + Math.random() * 90000)}`);
  const [drawerName, setDrawerName] = useState<string>('');
  const [nominalValue, setNominalValue] = useState<string>('250000');
  const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [collectionTiming, setCollectionTiming] = useState<'intime' | 'later'>('later');

  // Derive active contract and payer name without cascading setState in effects
  const effectiveContractId = selectedContractId || (contracts.length > 0 ? contracts[0].contract_id : '');
  const activeContract = useMemo(() => {
    return contracts.find(c => c.contract_id === effectiveContractId);
  }, [contracts, effectiveContractId]);

  const effectiveDrawerName = drawerName !== '' ? drawerName : (activeContract?.buyer_name || '');

  // Pending Schedules for selected contract
  const pendingContractSchedules = useMemo(() => {
    if (!effectiveContractId) return [];
    return schedules
      .filter(s => s.contract_id === effectiveContractId && s.status === 'Pending')
      .sort((a, b) => a.tranche_number - b.tranche_number);
  }, [schedules, effectiveContractId]);

  // Tafqeet in Arabic
  const tafqeetText = useMemo(() => {
    return tafqeetEGP(nominalValue || '0');
  }, [nominalValue]);

  const formatMoney = (val: string | number) => {
    return D(val).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Handle contract change
  const handleContractSelect = (contractId: string) => {
    setSelectedContractId(contractId);
    const ct = contracts.find(c => c.contract_id === contractId);
    if (ct) {
      setDrawerName(ct.buyer_name || '');
      const ctSchedules = schedules.filter(s => s.contract_id === contractId && s.status === 'Pending');
      if (ctSchedules.length > 0) {
        const firstTranche = ctSchedules[0];
        setSelectedScheduleId(firstTranche.schedule_id);
        setNominalValue(D(firstTranche.nominal_value).toString());
        setDueDate(firstTranche.due_date);
      } else {
        setSelectedScheduleId('');
      }
    }
  };

  // Handle schedule tranche click
  const handleSelectSchedule = (schedule: ERPInstallmentSchedule) => {
    setSelectedScheduleId(schedule.schedule_id);
    setNominalValue(D(schedule.nominal_value).toString());
    setDueDate(schedule.due_date);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveContractId) {
      toast.error(isAr ? 'يرجى اختيار العقد المرتبط' : 'Please select a contract');
      return;
    }
    if (!itemCode.trim()) {
      toast.error(isAr ? 'يرجى إدخال كود البند / رقم الإيصال' : 'Item code is required');
      return;
    }
    if (!effectiveDrawerName.trim()) {
      toast.error(isAr ? 'يرجى إدخال اسم العميل الملتزم بالسداد' : 'Payer name is required');
      return;
    }
    const val = parseFloat(nominalValue);
    if (isNaN(val) || val <= 0) {
      toast.error(isAr ? 'يرجى إدخال قيمة صحيحة للبند' : 'Invalid value');
      return;
    }

    await onSaveCheque({
      contractId: effectiveContractId,
      scheduleId: selectedScheduleId || undefined,
      chequeNumber: itemCode.trim(),
      bankName: isAr ? 'الخزينة الرئيسية (نقداً باليد - 101000)' : 'Main Safe (Cash by Hand - 101000)',
      drawerName: effectiveDrawerName.trim(),
      nominalValue: D(nominalValue).toFixed(2),
      dueDate
    });

    onClose();
  };

  // Sectioned Contracts for Custom Dropdown
  const contractSections: ZFCustomSelectSection[] = useMemo(() => {
    const activeItems: ZFCustomSelectItem[] = [];
    const deliveredItems: ZFCustomSelectItem[] = [];

    (contracts || []).forEach(c => {
      const item: ZFCustomSelectItem = {
        value: c.contract_id,
        labelAr: `عقد #${c.contract_number} — ${c.buyer_name}`,
        labelEn: `Contract #${c.contract_number} — ${c.buyer_name}`,
        sublabelAr: `الوحدة: ${c.unit_id} • إجمالي العقد: ${D(c.gross_contract_value).formatEGP(true)}`,
        sublabelEn: `Unit: ${c.unit_id} • Gross: ${D(c.gross_contract_value).formatEGP(false)}`,
        price: c.gross_contract_value,
        badge: c.handover_status === 'Delivered' ? (isAr ? 'مُسلَم' : 'Delivered') : (isAr ? 'قيد السداد' : 'Active'),
        badgeColor: c.handover_status === 'Delivered' ? '#dcfce7' : '#fef9c3',
        icon: FileText
      };

      if (c.handover_status === 'Delivered') {
        deliveredItems.push(item);
      } else {
        activeItems.push(item);
      }
    });

    const res: ZFCustomSelectSection[] = [];
    if (activeItems.length > 0) {
      res.push({
        sectionId: 'active',
        titleAr: 'عقود بيع جارية قيد سداد الأقساط',
        titleEn: 'Active Contracts Under Installments',
        icon: FileText,
        items: activeItems
      });
    }
    if (deliveredItems.length > 0) {
      res.push({
        sectionId: 'delivered',
        titleAr: 'عقود تم تسليم وحداتها',
        titleEn: 'Delivered Unit Contracts',
        icon: FileText,
        items: deliveredItems
      });
    }
    return res;
  }, [contracts, isAr]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div 
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '740px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.18)',
          overflow: 'hidden',
          direction: isAr ? 'rtl' : 'ltr'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.15rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fafaf9',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.22) 0%, rgba(212, 175, 55, 0.08) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#946f23'
            }}>
              <Wallet size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'تسجيل بند قسط واستحقاق نقدي جديد' : 'Record New Hand Installment Due'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
                {isAr 
                  ? 'إثبات قسط أو دفعة تعاقدية مستحقة التحصيل نقداً باليد (سواء مسددة في حينها أو لاحقاً).' 
                  : 'Record a cash installment due by hand (collected in-time or scheduled for later).'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#64748b',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Form wrapping Scrollable Body & Pinned Footer */}
        <form 
          id="new-hand-installment-form"
          onSubmit={handleSubmit} 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            flex: 1, 
            minHeight: 0, 
            overflow: 'hidden' 
          }}
        >
          {/* Modal Scrollable Body */}
          <div 
            className="custom-thin-scrollbar"
            style={{
              padding: '1.25rem 1.5rem',
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.15rem'
            }}
          >
            {/* 1. REFINED COMPACT VOUCHER PREVIEW CARD */}
            <div style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #faf8f5 100%)',
              border: '1.5px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '14px',
              padding: '0.9rem 1.25rem',
              position: 'relative',
              boxShadow: '0 2px 10px rgba(212, 175, 55, 0.08)',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              {/* Voucher Watermark */}
              <div style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.03,
                backgroundImage: 'radial-gradient(rgba(212, 175, 55, 0.8) 1px, transparent 1px)',
                backgroundSize: '8px 8px',
                pointerEvents: 'none'
              }} />

              {/* Voucher Header Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.55rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Wallet size={15} color="#d4af37" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a' }}>
                    {isAr ? 'الخزينة الرئيسية (تحصيل نقدي باليد - 101000)' : 'Main Cash Safe [101000]'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    color: '#946f23',
                    background: '#fefce8',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '5px',
                    border: '1px solid #fef08a'
                  }}>
                    {itemCode || 'DUE-00000'}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{isAr ? 'تاريخ الاستحقاق:' : 'Due Date:'}</span>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {dueDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle Row: Pay to the Order of & Amount */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', margin: '0.65rem 0' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block', marginBottom: '0.15rem' }}>
                    {isAr ? 'العميل الملتزم بالسداد نقدياً:' : 'Payer / Client Name:'}
                  </span>
                  <span style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                    {effectiveDrawerName || (isAr ? 'اسم العميل الملتزم' : 'Client Name')}
                  </span>
                </div>

                {/* Amount Box */}
                <div style={{
                  background: '#f8fafc',
                  border: '1.5px solid rgba(212, 175, 55, 0.4)',
                  borderRadius: '10px',
                  padding: '0.45rem 0.95rem',
                  textAlign: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '0.62rem', color: '#946f23', display: 'block', fontWeight: 800 }}>
                    {isAr ? 'قيمة القسط المطلوبة' : 'INSTALLMENT VALUE'}
                  </span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#059669', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(nominalValue || '0')}
                    <span style={{ fontSize: '0.68rem', color: '#64748b', marginInlineStart: '0.25rem' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                  </span>
                </div>
              </div>

              {/* Bottom Row: Tafqeet & Safe Custody Tag */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                borderTop: '1px dashed rgba(212, 175, 55, 0.25)',
                paddingTop: '0.5rem'
              }}>
                <div style={{ flex: 1, fontSize: '0.72rem', color: '#334155' }}>
                  <span style={{ color: '#64748b', marginInlineEnd: '0.35rem' }}>
                    {isAr ? 'فقط وقدره:' : 'Sum of:'}
                  </span>
                  <strong style={{ color: '#946f23', fontWeight: 800 }}>{tafqeetText}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    color: collectionTiming === 'intime' ? '#15803d' : '#0369a1',
                    background: collectionTiming === 'intime' ? '#f0fdf4' : '#f0f9ff',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '999px',
                    border: collectionTiming === 'intime' ? '1px solid #bbf7d0' : '1px solid #bae6fd'
                  }}>
                    {collectionTiming === 'intime' ? (
                      <>
                        <Check size={11} />
                        <span>{isAr ? 'مسدد فوراً بالخزينة' : 'In-time Hand Collection'}</span>
                      </>
                    ) : (
                      <>
                        <Clock size={11} />
                        <span>{isAr ? 'مستحق لاحقاً باليد' : 'Due Later on Schedule'}</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* STEP 1: CONTRACT & TRANCHE SELECTION */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                {isAr ? '١. العقد والوحدة المرتبطة:' : '1. Linked Contract & Unit:'}
              </label>

              <ZFCustomSelect 
                value={effectiveContractId}
                onChange={(val) => handleContractSelect(val)}
                sections={contractSections}
                placeholderAr="-- اختر العقد التعاقدي المعتمد --"
                placeholderEn="-- Select Sales Contract --"
                isAr={isAr}
              />
            </div>

            {/* Tranche Buttons (if available) - Now in a compact, scrollable grid! */}
            {pendingContractSchedules.length > 0 && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                    {isAr ? 'أقساط مجدولة غير مسددة في العقد:' : 'Unpaid Scheduled Tranches:'}
                  </span>
                  <span style={{ fontSize: '0.66rem', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                    {pendingContractSchedules.length} {isAr ? 'قسط متبقي' : 'tranches'}
                  </span>
                </div>

                <div 
                  className="custom-thin-scrollbar"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                    gap: '0.45rem',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    padding: '0.15rem 0.15rem 0.15rem 0'
                  }}
                >
                  {pendingContractSchedules.map(sch => {
                    const isSelected = selectedScheduleId === sch.schedule_id;
                    return (
                      <button
                        key={sch.schedule_id}
                        type="button"
                        onClick={() => handleSelectSchedule(sch)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.4rem',
                          padding: '0.4rem 0.65rem',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          border: isSelected ? '1.5px solid #946f23' : '1px solid #cbd5e1',
                          background: isSelected ? '#fffbeb' : '#ffffff',
                          color: isSelected ? '#946f23' : '#475569',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {isSelected && <Check size={12} color="#d4af37" />}
                          <span>{isAr ? `قسط ${sch.tranche_number}` : `Tranche ${sch.tranche_number}`}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span style={{ fontVariantNumeric: 'tabular-nums', color: isSelected ? '#946f23' : '#0f172a', fontWeight: 800 }}>
                            {formatMoney(sch.nominal_value)}
                          </span>
                          <span style={{ fontSize: '0.62rem', color: '#64748b' }}>({sch.due_date})</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: TIMING & ROUTING */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                {isAr ? '٢. توقيت الاستلام وطريقة السداد نقداً:' : '2. Collection Timing & Cash Route:'}
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.5rem' }}>
                <div
                  onClick={() => setCollectionTiming('later')}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: collectionTiming === 'later' ? '1.5px solid #946f23' : '1px solid #e2e8f0',
                    background: collectionTiming === 'later' ? '#fffbeb' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Clock size={16} color="#946f23" />
                  <div>
                    <strong style={{ fontSize: '0.78rem', color: '#0f172a', display: 'block' }}>
                      {isAr ? 'مستحق لاحقاً باليد' : 'Due Later on Schedule'}
                    </strong>
                    <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                      {isAr ? 'يُحصّل في موعد استحقاقه' : 'Scheduled future collection'}
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setCollectionTiming('intime')}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: collectionTiming === 'intime' ? '1.5px solid #15803d' : '1px solid #e2e8f0',
                    background: collectionTiming === 'intime' ? '#f0fdf4' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Check size={16} color="#15803d" />
                  <div>
                    <strong style={{ fontSize: '0.78rem', color: '#0f172a', display: 'block' }}>
                      {isAr ? 'مسدد فوراً في حينه' : 'Collected In-Time'}
                    </strong>
                    <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                      {isAr ? 'استلام فوري بالخزينة' : 'Direct cash on signing'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fixed Safe routing info */}
              <div style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.74rem',
                color: '#15803d',
                fontWeight: 700
              }}>
                <Wallet size={14} />
                <span>{isAr ? 'جهة التحصيل: الخزينة الرئيسية [101000] — استلام نقدي مباشر بدون أي وسائط بنكية' : 'Destination: Main Safe [101000] - Direct Cash Hand Collection'}</span>
              </div>
            </div>

            {/* STEP 3: DETAILS (CODE, DRAWER, AMOUNT, DUE DATE) - Balanced 2x2 Grid */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                {isAr ? '٣. تفاصيل وبيانات القسط:' : '3. Installment Due Details:'}
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                {/* 1. Item Code */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    {isAr ? 'كود / رقم البند الدفتري:' : 'Item Code #:'}
                  </label>
                  <input
                    type="text"
                    value={itemCode}
                    onChange={e => setItemCode(e.target.value)}
                    placeholder="DUE-54321"
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.82rem',
                      color: '#0f172a',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                    required
                  />
                </div>

                {/* 2. Due Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    {isAr ? 'تاريخ الاستحقاق الدفتري:' : 'Due Date:'}
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.82rem',
                      color: '#0f172a'
                    }}
                    required
                  />
                </div>

                {/* 3. Drawer Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    {isAr ? 'العميل الملتزم بالسداد:' : 'Payer Name:'}
                  </label>
                  <input
                    type="text"
                    value={effectiveDrawerName}
                    onChange={e => setDrawerName(e.target.value)}
                    placeholder={isAr ? 'اسم العميل' : 'Client Name'}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.82rem',
                      color: '#0f172a'
                    }}
                    required
                  />
                </div>

                {/* 4. Nominal Value */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    {isAr ? 'قيمة القسط المطلوبة (ج.م):' : 'Installment Value (EGP):'}
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={nominalValue}
                    onChange={e => setNominalValue(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1.5px solid rgba(16, 185, 129, 0.45)',
                      borderRadius: '8px',
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: '#059669',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PINNED MODAL ACTIONS FOOTER (Always 100% visible, never cut off!) */}
          <div style={{
            flexShrink: 0,
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            background: '#fafaf9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.74rem', color: '#64748b' }}>
              <ShieldCheck size={16} color="#15803d" />
              <span>{isAr ? 'تسجيل دفتري معتمد وموثق محاسبياً' : 'Audited & immutably verified'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#64748b',
                  padding: '0.55rem 1.15rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                type="submit"
                form="new-hand-installment-form"
                disabled={isMutating}
                style={{
                  background: 'linear-gradient(135deg, #d4af37 0%, #b8972e 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#07080b',
                  padding: '0.55rem 1.45rem',
                  fontSize: '0.84rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: isMutating ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 16px rgba(212, 175, 55, 0.25)',
                  opacity: isMutating ? 0.6 : 1
                }}
              >
                {isMutating ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                <span>{isAr ? 'حفظ وتوثيق بند القسط' : 'Save Installment Due'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
