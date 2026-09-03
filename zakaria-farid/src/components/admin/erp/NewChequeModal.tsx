'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wallet, 
  X, 
  Check, 
  Calendar, 
  FileText, 
  DollarSign, 
  ShieldCheck, 
  Loader2,
  Building2,
  Receipt,
  Clock
} from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule } from '@/lib/erp/types';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { D } from '@/lib/erp/math';
import { ZFCustomSelect, ZFCustomSelectSection, ZFCustomSelectItem } from './v2/common/ZFCustomSelect';

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
  const [itemCode, setItemCode] = useState<string>('');
  const [drawerName, setDrawerName] = useState<string>('');
  const [nominalValue, setNominalValue] = useState<string>('250000');
  const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [collectionTiming, setCollectionTiming] = useState<'intime' | 'later'>('later');
  const [contractSearchQuery, setContractSearchQuery] = useState<string>('');

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      if (contracts.length > 0 && !selectedContractId) {
        const firstContract = contracts[0];
        setSelectedContractId(firstContract.contract_id);
        setDrawerName(firstContract.buyer_name || '');
      }
      if (!itemCode) {
        const randomNum = Math.floor(10000 + Math.random() * 90000);
        setItemCode(`DUE-${randomNum}`);
      }
    }
  }, [isOpen, contracts, selectedContractId, itemCode]);

  // Active Contract
  const activeContract = useMemo(() => {
    return contracts.find(c => c.contract_id === selectedContractId);
  }, [contracts, selectedContractId]);

  // Pending Schedules for selected contract
  const pendingContractSchedules = useMemo(() => {
    if (!selectedContractId) return [];
    return schedules
      .filter(s => s.contract_id === selectedContractId && s.status === 'Pending')
      .sort((a, b) => a.tranche_number - b.tranche_number);
  }, [schedules, selectedContractId]);

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
    if (!selectedContractId) {
      alert(isAr ? 'يرجى اختيار العقد المرتبط' : 'Please select a contract');
      return;
    }
    if (!itemCode.trim()) {
      alert(isAr ? 'يرجى إدخال كود البند / رقم الإيصال' : 'Item code is required');
      return;
    }
    if (!drawerName.trim()) {
      alert(isAr ? 'يرجى إدخال اسم العميل الملتزم بالسداد' : 'Payer name is required');
      return;
    }
    const val = parseFloat(nominalValue);
    if (isNaN(val) || val <= 0) {
      alert(isAr ? 'يرجى إدخال قيمة صحيحة للبند' : 'Invalid value');
      return;
    }

    await onSaveCheque({
      contractId: selectedContractId,
      scheduleId: selectedScheduleId || undefined,
      chequeNumber: itemCode.trim(),
      bankName: isAr ? 'الخزينة الرئيسية (نقداً باليد - 101000)' : 'Main Safe (Cash by Hand - 101000)',
      drawerName: drawerName.trim(),
      nominalValue: D(nominalValue).toFixed(2),
      dueDate
    });

    onClose();
  };

  if (!isOpen) return null;

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
          maxWidth: '720px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          direction: isAr ? 'rtl' : 'ltr'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fafaf9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.08) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#946f23'
            }}>
              <Wallet size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'تسجيل بند قسط واستحقاق نقدي جديد' : 'Record New Hand Installment Due'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
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

        {/* Modal Scrollable Body */}
        <div style={{
          padding: '1.25rem 1.5rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          {/* 1. REALISTIC HAND INSTALLMENT VOUCHER PREVIEW CARD */}
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fefdfa 100%)',
            border: '1.5px solid rgba(184, 144, 62, 0.35)',
            borderRadius: '12px',
            padding: '1.15rem 1.35rem',
            position: 'relative',
            boxShadow: '0 4px 16px rgba(184, 144, 62, 0.08)',
            overflow: 'hidden'
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wallet size={16} color="#d4af37" />
                <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.02em' }}>
                  {isAr ? 'الخزينة الرئيسية (تحصيل نقدي باليد - 101000)' : 'Main Cash Safe [101000]'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#946f23',
                  background: '#ffffff',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(212, 175, 55, 0.3)'
                }}>
                  {itemCode || 'DUE-00000'}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{isAr ? 'تاريخ الاستحقاق:' : 'Due Date:'}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {dueDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Middle Row: Pay to the Order of & Amount */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', margin: '0.85rem 0' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginBottom: '0.15rem' }}>
                  {isAr ? 'العميل الملتزم بالسداد نقدياً:' : 'Payer / Client Name:'}
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                  {drawerName || (isAr ? 'اسم العميل الملتزم' : 'Client Name')}
                </span>
              </div>

              {/* Amount Box */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.55)',
                border: '1.5px solid rgba(212, 175, 55, 0.4)',
                borderRadius: '8px',
                padding: '0.55rem 1rem',
                textAlign: 'center',
                minWidth: '180px'
              }}>
                <span style={{ fontSize: '0.62rem', color: '#d4af37', display: 'block', fontWeight: 800 }}>
                  {isAr ? 'قيمة القسط المطلوبة (ج.م)' : 'INSTALLMENT DUE VALUE (EGP)'}
                </span>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#34d399', letterSpacing: '-0.02em' }}>
                  {formatMoney(nominalValue || '0')}
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
              paddingTop: '0.65rem'
            }}>
              <div style={{ flex: 1, fontSize: '0.72rem', color: '#334155', fontStyle: 'italic' }}>
                <span style={{ color: '#64748b', marginLeft: '0.35rem', fontStyle: 'normal' }}>
                  {isAr ? 'فقط وقدره:' : 'Sum of:'}
                </span>
                <strong style={{ color: '#e2c974' }}>{tafqeetText}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: collectionTiming === 'intime' ? '#34d399' : '#38bdf8',
                  background: collectionTiming === 'intime' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  border: collectionTiming === 'intime' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(56, 189, 248, 0.35)'
                }}>
                  {collectionTiming === 'intime' ? (
                    <>
                      <Check size={11} />
                      <span>{isAr ? 'تحصيل فوري في حينه' : 'In-time Hand Collection'}</span>
                    </>
                  ) : (
                    <>
                      <Clock size={11} />
                      <span>{isAr ? 'قسط مستحق لاحقاً باليد' : 'Due Later on Schedule'}</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 2. FORM CONFIGURATION */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* STEP 1: CONTRACT & TRANCHE SELECTION */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                {isAr ? '١. العقد والوحدة المرتبطة:' : '1. Linked Contract & Unit:'}
              </label>

              <ZFCustomSelect 
                value={selectedContractId}
                onChange={(val) => handleContractSelect(val)}
                sections={contractSections}
                placeholderAr="-- اختر العقد التعاقدي المعتمد --"
                placeholderEn="-- Select Sales Contract --"
                isAr={isAr}
              />
            </div>

            {/* Tranche Buttons (if available) */}
            {pendingContractSchedules.length > 0 && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>
                  {isAr ? 'أقساط مجدولة غير مسددة في العقد:' : 'Unpaid Scheduled Tranches:'}
                </span>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
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
                          gap: '0.4rem',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '7px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          border: isSelected ? '1.5px solid #946f23' : '1px solid #cbd5e1',
                          background: isSelected ? 'rgba(184, 144, 62, 0.12)' : '#ffffff',
                          color: isSelected ? '#946f23' : '#475569',
                          cursor: 'pointer'
                        }}
                      >
                        {isSelected && <Check size={12} color="#d4af37" />}
                        <span>{isAr ? `قسط ${sch.tranche_number}` : `Tranche ${sch.tranche_number}`}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: isSelected ? '#946f23' : '#64748b' }}>
                          {formatMoney(sch.nominal_value)} {isAr ? 'ج.م' : ''}
                        </span>
                        <span style={{ fontSize: '0.64rem', color: '#64748b' }}>({sch.due_date})</span>
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
                    borderRadius: '8px',
                    border: collectionTiming === 'later' ? '1.5px solid #946f23' : '1px solid #e2e8f0',
                    background: collectionTiming === 'later' ? '#fffbeb' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
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
                    borderRadius: '8px',
                    border: collectionTiming === 'intime' ? '1.5px solid #15803d' : '1px solid #e2e8f0',
                    background: collectionTiming === 'intime' ? '#f0fdf4' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
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
                padding: '0.5rem 0.75rem',
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

            {/* STEP 3: DETAILS (CODE, DRAWER, AMOUNT, DUE DATE) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
              {/* Item Code */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
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

              {/* Drawer Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'العميل الملتزم بالسداد:' : 'Payer Name:'}
                </label>
                <input
                  type="text"
                  value={drawerName}
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

              {/* Nominal Value */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
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
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    color: '#34d399'
                  }}
                  required
                />
              </div>

              {/* Due Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
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
            </div>

            {/* Modal Actions Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              paddingTop: '0.85rem',
              borderTop: '1px solid #e2e8f0'
            }}>
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
                  cursor: 'pointer'
                }}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                type="submit"
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
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)',
                  opacity: isMutating ? 0.6 : 1
                }}
              >
                {isMutating ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                <span>{isAr ? 'حفظ وتوثيق بند القسط' : 'Save Installment Due'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
