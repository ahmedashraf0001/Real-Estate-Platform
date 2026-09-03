'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Landmark, 
  X, 
  Plus, 
  Check, 
  Calendar, 
  FileText, 
  DollarSign, 
  ShieldCheck, 
  Sparkles, 
  Loader2,
  Building2,
  ChevronDown,
  Clock
} from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule, ERPPDCRecord } from '@/lib/erp/types';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { D } from '@/lib/erp/math';

interface NewChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: ERPContract[];
  schedules: ERPInstallmentSchedule[];
  onSaveCheque: (chequeData: {
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

const EGYPTIAN_BANKS = [
  { id: 'CIB', nameAr: 'البنك التجاري الدولي (CIB)', nameEn: 'Commercial International Bank (CIB)', code: 'CIB' },
  { id: 'NBE', nameAr: 'البنك الأهلي المصري (NBE)', nameEn: 'National Bank of Egypt (NBE)', code: 'NBE' },
  { id: 'BM', nameAr: 'بنك مصر (Banque Misr)', nameEn: 'Banque Misr', code: 'BM' },
  { id: 'QNB', nameAr: 'بنك قطر الوطني (QNB)', nameEn: 'QNB Alahli', code: 'QNB' },
  { id: 'ADIB', nameAr: 'مصرف أبوظبي الإسلامي (ADIB)', nameEn: 'ADIB Egypt', code: 'ADIB' },
  { id: 'ALEX', nameAr: 'بنك الإسكندرية (AlexBank)', nameEn: 'Bank of Alexandria', code: 'ALEX' },
  { id: 'HSBC', nameAr: 'إتش إس بي سي مصر (HSBC)', nameEn: 'HSBC Egypt', code: 'HSBC' },
  { id: 'FAISAL', nameAr: 'بنك فيصل الإسلامي', nameEn: 'Faisal Islamic Bank', code: 'FAISAL' },
  { id: 'OTHER', nameAr: 'بنك آخر...', nameEn: 'Other Bank...', code: 'OTHER' }
];

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
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>('CIB');
  const [customBankName, setCustomBankName] = useState<string>('');
  const [drawerName, setDrawerName] = useState<string>('');
  const [nominalValue, setNominalValue] = useState<string>('250000');
  const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [contractSearchQuery, setContractSearchQuery] = useState<string>('');

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      if (contracts.length > 0 && !selectedContractId) {
        const firstContract = contracts[0];
        setSelectedContractId(firstContract.contract_id);
        setDrawerName(firstContract.buyer_name || '');
      }
      if (!chequeNumber) {
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        setChequeNumber(`CHQ-${randomNum}`);
      }
    }
  }, [isOpen, contracts, selectedContractId, chequeNumber]);

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

  // Bank name resolution
  const resolvedBankName = useMemo(() => {
    if (selectedBankId === 'OTHER') {
      return customBankName.trim() || (isAr ? 'بنك تجاري معتمد' : 'Authorized Commercial Bank');
    }
    const b = EGYPTIAN_BANKS.find(item => item.id === selectedBankId);
    return b ? (isAr ? b.nameAr : b.nameEn) : 'CIB';
  }, [selectedBankId, customBankName, isAr]);

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

  const handleClearScheduleSelection = () => {
    setSelectedScheduleId('');
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId) {
      alert(isAr ? 'يرجى اختيار العقد المرتبط بالشيك' : 'Please select a linked contract');
      return;
    }
    if (!chequeNumber.trim()) {
      alert(isAr ? 'يرجى إدخال رقم الشيك' : 'Please enter cheque number');
      return;
    }
    if (!nominalValue || parseFloat(nominalValue) <= 0) {
      alert(isAr ? 'يرجى إدخال قيمة صحيحة للشيك' : 'Please enter a valid amount');
      return;
    }

    await onSaveCheque({
      contractId: selectedContractId,
      scheduleId: selectedScheduleId || undefined,
      chequeNumber: chequeNumber.trim(),
      bankName: resolvedBankName,
      drawerName: drawerName.trim() || (activeContract?.buyer_name || 'العميل'),
      nominalValue: D(nominalValue).toFixed(2),
      dueDate
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 5, 10, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #0e1320 0%, #080c14 100%)',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 35px rgba(212, 175, 55, 0.15)',
          overflow: 'hidden',
          direction: isAr ? 'rtl' : 'ltr'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0, 0, 0, 0.25)'
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
              color: '#d4af37'
            }}>
              <Landmark size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                {isAr ? 'استلام وتسجيل شيك بالخزينة' : 'Receive & Vault Client Cheque'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8' }}>
                {isAr 
                  ? 'إيداع شيك ورقي مستلم من العميل في خزينة الشركة لحين حلول تاريخ الاستحقاق والمقاصة البنكية.' 
                  : 'Register a physical client cheque in company safe custody until maturity and clearing.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#94a3b8',
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
          {/* 1. INTERACTIVE REALISTIC CHEQUE PREVIEW CARD */}
          <div style={{
            background: 'linear-gradient(135deg, #162032 0%, #0d1424 50%, #111a2c 100%)',
            border: '1.5px solid rgba(212, 175, 55, 0.45)',
            borderRadius: '12px',
            padding: '1.15rem 1.35rem',
            position: 'relative',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(212, 175, 55, 0.05)',
            overflow: 'hidden'
          }}>
            {/* Cheque Security Micro-Pattern Watermark */}
            <div style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.03,
              backgroundImage: 'radial-gradient(rgba(212, 175, 55, 0.8) 1px, transparent 1px)',
              backgroundSize: '8px 8px',
              pointerEvents: 'none'
            }} />

            {/* Cheque Header Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={16} color="#d4af37" />
                <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.02em' }}>
                  {resolvedBankName}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#e2c974',
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(212, 175, 55, 0.3)'
                }}>
                  {chequeNumber || 'CHQ-000000'}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{isAr ? 'تاريخ الاستحقاق:' : 'Date:'}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                    {dueDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Cheque Body Row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.85rem' }}>
              {/* Payee + Amount Box */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', flexShrink: 0 }}>
                    {isAr ? 'ادفعوا لأمر:' : 'Pay to the order of:'}
                  </span>
                  <span style={{
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    color: '#ffffff',
                    borderBottom: '1px dashed rgba(255, 255, 255, 0.25)',
                    paddingBottom: '0.15rem',
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {isAr ? 'شركة زكريا فريد للتطوير العقاري (ش.م.م)' : 'Zakaria Farid Real Estate Developments'}
                  </span>
                </div>

                {/* Amount in Box */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.65)',
                  border: '1.5px solid #d4af37',
                  borderRadius: '6px',
                  padding: '0.35rem 0.75rem',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.35rem',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '0.68rem', color: '#e2c974', fontWeight: 700 }}>{isAr ? 'مبلغ' : 'EGP'}</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace' }}>
                    {formatMoney(nominalValue || '0')}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{isAr ? 'ج.م' : ''}</span>
                </div>
              </div>

              {/* Tafqeet in Words */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', flexShrink: 0 }}>
                  {isAr ? 'مبلغ وقدره:' : 'The sum of:'}
                </span>
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#e2c974',
                  borderBottom: '1px dashed rgba(212, 175, 55, 0.3)',
                  paddingBottom: '0.15rem',
                  flex: 1
                }}>
                  {tafqeetText}
                </span>
              </div>

              {/* Drawer & Signature Line */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem', paddingTop: '0.45rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{isAr ? 'الساحب الملتزم:' : 'Drawer:'}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f1f5f9' }}>
                    {drawerName || (isAr ? 'اسم العميل' : 'Client Name')}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{isAr ? 'توقيع الساحب:' : 'Signature:'}</span>
                  <span style={{ fontFamily: 'cursive', fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    {drawerName || 'Signed'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Monospace MICR Band */}
            <div style={{
              marginTop: '0.75rem',
              paddingTop: '0.45rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'monospace',
              fontSize: '0.74rem',
              color: 'rgba(212, 175, 55, 0.55)',
              letterSpacing: '0.25em'
            }}>
              ⑈ 023 ⑉ 10456 ⑈ {chequeNumber.replace(/\D/g, '') || '789012'} ⑈ 25
            </div>
          </div>

          {/* FORM FIELDS */}
          <form id="newChequeForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {/* STEP 1: LINKED CONTRACT SELECTOR */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                {isAr ? '1. عقد البيع المرتبط بهذا الشيك:' : '1. Linked Sales Contract:'}
              </label>
              <select
                value={selectedContractId}
                onChange={e => handleContractSelect(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '9px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.82rem',
                  color: '#ffffff',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                required
              >
                <option value="">{isAr ? '-- اختر العقد المرتبط بالعميل --' : '-- Select Contract --'}</option>
                {contracts.map(c => (
                  <option key={c.contract_id} value={c.contract_id}>
                    {c.contract_number} — {c.buyer_name} ({c.unit_id})
                  </option>
                ))}
              </select>
            </div>

            {/* STEP 1.5: UPCOMING INSTALLMENT TRANCHES AUTOFILL */}
            {selectedContractId && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#e2c974', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={13} />
                    {isAr ? 'أقساط هذا العقد المتبقية (اختر لملء المبلغ والتاريخ تلقائياً):' : 'Pending Installments (Click to Auto-fill):'}
                  </span>
                  {selectedScheduleId && (
                    <button
                      type="button"
                      onClick={handleClearScheduleSelection}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      {isAr ? 'إلغاء الربط (مبلغ مخصص)' : 'Unlink (Custom Amount)'}
                    </button>
                  )}
                </div>

                {pendingContractSchedules.length === 0 ? (
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {isAr ? 'لا توجد أقساط معلقة مسجلة لهذا العقد — يمكنك إدخال المبلغ والتاريخ يدوياً.' : 'No pending tranches found for this contract.'}
                  </span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {pendingContractSchedules.map(sch => {
                      const isSelected = selectedScheduleId === sch.schedule_id;
                      return (
                        <button
                          key={sch.schedule_id}
                          type="button"
                          onClick={() => handleSelectSchedule(sch)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '7px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            border: isSelected ? '1.5px solid #d4af37' : '1px solid rgba(255, 255, 255, 0.1)',
                            background: isSelected ? 'rgba(212, 175, 55, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                            color: isSelected ? '#ffffff' : '#94a3b8',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSelected && <Check size={12} color="#d4af37" />}
                          <span>{isAr ? `قسط ${sch.tranche_number}` : `Tranche ${sch.tranche_number}`}</span>
                          <span style={{ fontFamily: 'monospace', color: isSelected ? '#e2c974' : '#cbd5e1' }}>
                            {formatMoney(sch.nominal_value)} {isAr ? 'ج.م' : ''}
                          </span>
                          <span style={{ fontSize: '0.64rem', color: '#64748b' }}>
                            ({sch.due_date})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: BANK SELECTION PILLS */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                {isAr ? '2. البنك المسحوب عليه الشيك:' : '2. Drawee Bank:'}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                {EGYPTIAN_BANKS.map(bank => {
                  const isActive = selectedBankId === bank.id;
                  return (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => setSelectedBankId(bank.id)}
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '7px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        border: isActive ? '1px solid rgba(212, 175, 55, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: isActive ? 'rgba(212, 175, 55, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                        color: isActive ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {isAr ? bank.nameAr : bank.nameEn}
                    </button>
                  );
                })}
              </div>

              {selectedBankId === 'OTHER' && (
                <input
                  type="text"
                  placeholder={isAr ? 'اكتب اسم البنك المسحوب عليه...' : 'Enter custom bank name...'}
                  value={customBankName}
                  onChange={e => setCustomBankName(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.8rem',
                    color: '#ffffff',
                    outline: 'none',
                    marginTop: '0.35rem',
                    boxSizing: 'border-box'
                  }}
                  required={selectedBankId === 'OTHER'}
                />
              )}
            </div>

            {/* STEP 3: CHEQUE DETAILS (NUMBER, DRAWER, AMOUNT, DUE DATE) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
              {/* Cheque # */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  {isAr ? 'رقم الشيك البنكي:' : 'Cheque Number:'}
                </label>
                <input
                  type="text"
                  value={chequeNumber}
                  onChange={e => setChequeNumber(e.target.value)}
                  placeholder="CHQ-789012"
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.82rem',
                    color: '#ffffff',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Drawer Legal Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  {isAr ? 'اسم الساحب (المشتري الموقع):' : 'Drawer Legal Name:'}
                </label>
                <input
                  type="text"
                  value={drawerName}
                  onChange={e => setDrawerName(e.target.value)}
                  placeholder={isAr ? 'اسم العميل المثبت بالشيك' : 'Drawer name'}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.82rem',
                    color: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Nominal Value */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  {isAr ? 'قيمة الشيك الاسمية (بالجنيه):' : 'Nominal Value (EGP):'}
                </label>
                <input
                  type="number"
                  step="100"
                  value={nominalValue}
                  onChange={e => setNominalValue(e.target.value)}
                  placeholder="250000"
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Due Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  {isAr ? 'تاريخ استحقاق الشيك:' : 'Maturity / Due Date:'}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.82rem',
                    color: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>
            </div>

            {/* Regulatory Safeguard Notice */}
            <div style={{
              background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '9px',
              padding: '0.75rem 0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontSize: '0.75rem',
              color: '#e2c974'
            }}>
              <ShieldCheck size={18} color="#d4af37" style={{ flexShrink: 0 }} />
              <span>
                {isAr 
                  ? 'سيتم تسجيل هذا الشيك بحالة [في الخزينة In Safe] كأوراق قبض تحت الحيازة. سيتولى محرك التنبيهات المالي إشعارك تلقائياً قبل 7 أيام من موعد حلول الصرف.' 
                  : 'This cheque will be held In Safe custody. FIN-OS alert engine will automatically trigger reminders 7 days prior to maturity.'}
              </span>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1.1rem 1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'transparent',
              color: '#94a3b8',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            type="submit"
            form="newChequeForm"
            disabled={isMutating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1.35rem',
              borderRadius: '8px',
              border: '1px solid rgba(212, 175, 55, 0.45)',
              background: 'linear-gradient(135deg, #d4af37 0%, #aa820a 100%)',
              color: '#07080b',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: isMutating ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)'
            }}
          >
            {isMutating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            <span>{isAr ? 'حفظ وإيداع الشيك بالخزينة' : 'Save & Vault Cheque'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
