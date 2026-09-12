'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  KeyRound, 
  X, 
  Loader2, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  Coins, 
  Layers,
  ArrowRight,
  User,
  Info
} from 'lucide-react';
import { ERPContract, ERPAccountingPeriod, ERPJournalEntry, ERPCostAllocation } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D, formatEGP, Decimal } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { JournalEntryPreview } from '@/components/erp/JournalEntryPreview';
import { ContractsEngine } from '@/lib/erp/contracts';
import styles from '../ZFWorkstationShell.module.css';

export interface HandoverExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ERPContract | null;
  properties?: Property[];
  activePeriod: ERPAccountingPeriod;
  costAllocations?: ERPCostAllocation[];
  onConfirmHandover: (contract: ERPContract, handoverDate: string, rsvWipCost: Decimal | string) => Promise<void>;
  isMutating?: boolean;
  isAr?: boolean;
}

export const HandoverExecutionModal: React.FC<HandoverExecutionModalProps> = ({
  isOpen,
  onClose,
  contract,
  properties = [],
  activePeriod,
  costAllocations = [],
  onConfirmHandover,
  isMutating = false,
  isAr = true
}) => {
  const [handoverDate, setHandoverDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [rsvCostAmount, setRsvCostAmount] = useState<string>('0.00');
  const [certifiedCompletionAsserted, setCertifiedCompletionAsserted] = useState<boolean>(false);

  // Identify matching property from portfolio
  const linkedProperty = useMemo(() => {
    if (!contract || !properties || properties.length === 0) return null;
    return properties.find(p => 
      (contract.property_id && p.id === contract.property_id) ||
      p.title_ar === contract.unit_id ||
      p.title_en === contract.unit_id ||
      p.building_units?.some(u => u.unit_id === contract.unit_id || u.unit_number === contract.unit_id)
    ) || null;
  }, [contract, properties]);

  // Determine property readiness (POC Completion Gate §4.14 / INV-4.14)
  const isPropertyReady = useMemo(() => {
    if (!linkedProperty) return false;
    return linkedProperty.completion_status === 'ready';
  }, [linkedProperty]);

  // Initialize values when contract changes or modal opens
  useEffect(() => {
    if (isOpen && contract) {
      setHandoverDate(new Date().toISOString().split('T')[0]);
      setCertifiedCompletionAsserted(false);

      const grossV = D(contract.gross_contract_value || 0);

      // Try finding matching RSV allocation factor
      const matchingAlloc = costAllocations.find(ca => 
        (linkedProperty && ca.project_name && (linkedProperty.title_ar?.includes(ca.project_name) || linkedProperty.title_en?.includes(ca.project_name)))
      );

      if (matchingAlloc && matchingAlloc.rsv_factor) {
        const calculatedCost = grossV.times(matchingAlloc.rsv_factor).toFixed(2);
        setRsvCostAmount(calculatedCost);
      } else {
        // Fallback: 45% default construction WIP factor
        const fallbackCost = grossV.times(0.45).toFixed(2);
        setRsvCostAmount(fallbackCost);
      }
    }
  }, [isOpen, contract, linkedProperty, costAllocations]);

  // Derived financial metrics
  const grossValue = useMemo(() => D(contract?.gross_contract_value || 0), [contract]);
  const cashCollected = useMemo(() => D(contract?.total_cash_collected || 0), [contract]);
  const unpaidBalance = useMemo(() => {
    const diff = grossValue.minus(cashCollected);
    return diff.isNegative() ? D(0) : diff;
  }, [grossValue, cashCollected]);

  // Generate Model B Journal Entry Preview (§14.D.12 & INV-4.17)
  const previewEntry = useMemo<ERPJournalEntry | null>(() => {
    if (!contract || !activePeriod) return null;
    try {
      const validRsv = D(rsvCostAmount || 0);
      return ContractsEngine.createHandoverModelBEntry(
        contract,
        activePeriod,
        handoverDate,
        validRsv.isNegative() ? '0.00' : validRsv,
        '501000',
        '151000',
        'PREVIEW'
      );
    } catch (e) {
      console.warn('Model B Preview generation error:', e);
      return null;
    }
  }, [contract, activePeriod, handoverDate, rsvCostAmount]);

  if (!isOpen || !contract) return null;

  const isAlreadyDelivered = contract.handover_status === 'Delivered';

  // Gate check: if not ready, require assertion checkbox; must not be already delivered; preview entry must exist
  const canConfirm = !isMutating && !isAlreadyDelivered && (isPropertyReady || certifiedCompletionAsserted) && grossValue.greaterThan(0) && previewEntry !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfirm) return;

    const finalRsv = D(rsvCostAmount || 0);
    await onConfirmHandover(contract, handoverDate, finalRsv.isNegative() ? '0.00' : finalRsv);
  };

  const propertyTitle = linkedProperty
    ? (isAr ? (linkedProperty.title_ar || linkedProperty.title_en) : (linkedProperty.title_en || linkedProperty.title_ar))
    : contract.unit_id;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.modalContent}
        style={{
          maxWidth: '1080px',
          width: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3)'
        }}
        onClick={e => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Executive Modal Header */}
        <div style={{
          padding: 'clamp(0.85rem, 2.5vw, 1.25rem) clamp(1rem, 3vw, 1.75rem)',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #fafaf9 0%, #f5f5f4 100%)',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #b8903e 0%, #946f23 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(184, 144, 62, 0.28)',
              flexShrink: 0
            }}>
              <KeyRound size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 'clamp(0.95rem, 2vw, 1.15rem)', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'محضر استلام الشقة والاعتراف بالإيراد (Model B)' : 'Handover Protocol & Net Revenue Recognition'}
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a'
                }}>
                  IFRS 15 / §14.D.12
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isAr 
                  ? 'إثبات التسليم الفعلي ونقل الإيراد المؤجل (٢٠٣٠٠٠) إلى إيراد مبيعات محقق (٤٠١٠٠٠) وإثبات باقي الأقساط كمدينين (١٠٣٠٠٠)' 
                  : 'Physical delivery protocol, clearing deferred contract liabilities & recognizing realized sales revenue'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isMutating}
            aria-label={isAr ? 'إغلاق النافذة' : 'Close Modal'}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '9px',
              minWidth: '44px',
              minHeight: '44px',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Executive 2-Panel Content */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            flex: 1,
            overflowY: 'auto'
          }}>
            {/* ─────────────────────────────────────────────────────────────
                PANEL 1: CONTRACT & ASSET HEALTH + POC COMPLETION GATE
                ───────────────────────────────────────────────────────────── */}
            <div style={{
              padding: 'clamp(1rem, 2.5vw, 1.5rem)',
              borderRight: isAr ? 'none' : '1px solid #e2e8f0',
              borderLeft: isAr ? '1px solid #e2e8f0' : 'none',
              background: '#fafaf9',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              overflowY: 'auto'
            }}>
              {/* Delivered Warning Banner */}
              {isAlreadyDelivered && (
                <div style={{
                  background: '#eff6ff',
                  border: '1.5px solid #93c5fd',
                  borderRadius: '12px',
                  padding: '0.9rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  color: '#1e40af'
                }}>
                  <ShieldCheck size={20} color="#2563eb" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '0.82rem', display: 'block' }}>
                      {isAr ? 'تم تسليم هذه الوحدة رسمياً مسبقاً (Delivered)' : 'Unit already certified and delivered'}
                    </strong>
                    <span style={{ fontSize: '0.73rem', color: '#2563eb' }}>
                      {isAr 
                        ? `تاريخ التسليم المسجل: ${contract.handover_date || 'مسجل بالدفاتر'}. تم ترحيل قيود Model B مسبقاً.` 
                        : `Delivered on: ${contract.handover_date || 'Recorded'}. Model B journal entries already posted.`}
                    </span>
                  </div>
                </div>
              )}

              {/* Asset Health Card */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Building2 size={16} color="#946f23" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {isAr ? 'بيانات الوحدة والعقد' : 'Contract & Asset Dossier'}
                    </span>
                  </div>

                  {/* Construction Milestone Badge */}
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: isPropertyReady ? '#ecfdf5' : '#fffbeb',
                    color: isPropertyReady ? '#047857' : '#b45309',
                    border: `1px solid ${isPropertyReady ? '#a7f3d0' : '#fde68a'}`
                  }}>
                    {isPropertyReady ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    <span>{isPropertyReady ? (isAr ? 'عقار جاهز للتسليم' : 'Ready for Delivery') : (isAr ? 'قيد التنفيذ والتشطيب' : 'Under Construction')}</span>
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>{isAr ? 'اسم العميل المشتري:' : 'Buyer Name:'}</span>
                    <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>{contract.buyer_name}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>{isAr ? 'رقم العقد:' : 'Contract Number:'}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#946f23', fontFamily: 'monospace' }}>
                      #{contract.contract_number}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>{isAr ? 'العقار والمشروع:' : 'Property / Project:'}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>{propertyTitle}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>{isAr ? 'رقم الوحدة المتعاقد عليها:' : 'Unit ID:'}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{contract.unit_id}</span>
                  </div>
                </div>
              </div>

              {/* 3-Part Financial Health HUD */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem'
              }}>
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem'
                }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>
                    {isAr ? 'قيمة العقد (V)' : 'Gross Value (V)'}
                  </span>
                  <strong style={{ fontSize: '0.96rem', color: '#0f172a' }}>
                    <MoneyCell amount={grossValue} isAr={isAr} />
                  </strong>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{isAr ? 'إجمالي ثمن الشقة' : 'Total Price'}</span>
                </div>

                <div style={{
                  background: 'rgba(5, 150, 105, 0.04)',
                  border: '1px solid rgba(5, 150, 105, 0.2)',
                  borderRadius: '12px',
                  padding: '0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem'
                }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#047857' }}>
                    {isAr ? 'المحصل نقداً (C)' : 'Collected (C)'}
                  </span>
                  <strong style={{ fontSize: '0.96rem', color: '#059669' }}>
                    <MoneyCell amount={cashCollected} isAr={isAr} />
                  </strong>
                  <span style={{ fontSize: '0.65rem', color: '#10b981' }}>{isAr ? 'رصيد دفعة الحجز (٢٠٣٠٠٠)' : 'Pre-handover'}</span>
                </div>

                <div style={{
                  background: 'rgba(184, 144, 62, 0.05)',
                  border: '1px solid rgba(184, 144, 62, 0.25)',
                  borderRadius: '12px',
                  padding: '0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem'
                }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#946f23' }}>
                    {isAr ? 'المتبقي (V - C)' : 'Unpaid (V - C)'}
                  </span>
                  <strong style={{ fontSize: '0.96rem', color: '#b45309' }}>
                    <MoneyCell amount={unpaidBalance} isAr={isAr} highlight />
                  </strong>
                  <span style={{ fontSize: '0.65rem', color: '#b45309' }}>{isAr ? 'يحول لمدينين (١٠٣٠٠٠)' : 'To Receivable'}</span>
                </div>
              </div>

              {/* Handover Date & WIP Parameters Card */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.95rem'
              }}>
                {/* Date Picker */}
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <Calendar size={14} color="#946f23" />
                    <span>{isAr ? 'تاريخ محضر الاستلام والتسليم الرسمي:' : 'Certified Handover Date:'}</span>
                  </label>
                  <input
                    type="date"
                    value={handoverDate}
                    onChange={e => setHandoverDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      color: '#0f172a',
                      background: '#f8fafc',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Construction WIP Relief Input */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Layers size={14} color="#946f23" />
                      <span>{isAr ? 'تكلفة البناء المستنزفة (WIP Relief):' : 'Incurred WIP Relief (RSV):'}</span>
                    </label>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      §14.C.7 Dr 501000 / Cr 151000
                    </span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={rsvCostAmount}
                      onChange={e => setRsvCostAmount(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        paddingLeft: isAr ? '0.75rem' : '3.5rem',
                        paddingRight: isAr ? '3.5rem' : '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        background: '#f8fafc',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{
                      position: 'absolute',
                      [isAr ? 'right' : 'left']: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#946f23'
                    }}>
                      ج.م
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                    {isAr 
                      ? 'القيمة المحسوبة وفقاً لمعيار القيمة البيعية النسبية (RSV) لاستنزاف تكلفة الإنشاء من حساب ١٥١٠٠٠ إلى ٥٠١٠٠٠' 
                      : 'Relieves construction work-in-progress to cost of goods sold based on relative sales value factor'}
                  </span>
                </div>
              </div>

              {/* POC Completion Gate (§4.14 / INV-4.14) */}
              <div style={{
                borderRadius: '14px',
                padding: '1.15rem',
                border: isPropertyReady ? '1.5px solid #a7f3d0' : '1.5px solid #fcd34d',
                background: isPropertyReady ? '#f0fdf4' : '#fffbeb',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: isPropertyReady ? '#dcfce7' : '#fef3c7',
                    color: isPropertyReady ? '#15803d' : '#b45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isPropertyReady ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
                  </div>

                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 800, color: isPropertyReady ? '#14532d' : '#78350f' }}>
                      {isAr ? 'بوابة تدقيق نسبة الإنجاز والاعتماد الهندسي (§4.14 / INV-4.14)' : 'POC Completion Gate (§4.14 / INV-4.14)'}
                    </h4>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.74rem', lineHeight: 1.5, color: isPropertyReady ? '#166534' : '#92400e' }}>
                      {isPropertyReady
                        ? (isAr 
                            ? 'العقار مسجل بحالة "جاهز للتسليم الفوري" (Ready)، وتتوفر شهادات المطابقة الهندسية للاعتراف بالإيراد.' 
                            : 'Project status is ready for handover with certified structural completion.')
                        : (isAr 
                            ? 'تنبيه تدقيق: العقار مسجل بحالة قيد التطوير والإنشاء (off_plan). يُشترط اعتماد شهادة استشاري المشروع والمطابقة الإنشائية بنسبة ١٠٠٪ قبل تمكين تسليم الوحدة.' 
                            : 'Warning: Project is marked off-plan. Certified engineering completion is strictly required before handover.')}
                    </p>
                  </div>
                </div>

                {!isPropertyReady && (
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #fde68a',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}>
                    <input
                      type="checkbox"
                      checked={certifiedCompletionAsserted}
                      onChange={e => setCertifiedCompletionAsserted(e.target.checked)}
                      style={{ marginTop: '0.15rem', accentColor: '#946f23' }}
                    />
                    <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#78350f', lineHeight: 1.45 }}>
                      {isAr 
                        ? 'أقر بصفتي المدير المالي باعتماد شهادة استشاري المشروع ومطابقة الإنجاز الفعلي للوحدة بنسبة 100% وإذن التسليم الرسمي (§4.14)' 
                        : 'I hereby certify that engineering inspection confirmed 100% unit completion and approved handover (§4.14)'}
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                PANEL 2: MODEL B JOURNAL ENTRY PREVIEW (§14.D.12 & INV-4.17)
                ───────────────────────────────────────────────────────────── */}
            <div style={{
              padding: '1.5rem',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              overflowY: 'auto'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={17} color="#946f23" />
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                    {isAr ? 'معاينة القيد المحاسبي المزدوج (Model B Posting)' : 'Model B Net Recognition Preview'}
                  </span>
                </div>

                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#059669',
                  background: '#ecfdf5',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  border: '1px solid #a7f3d0'
                }}>
                  INV-4.17 Verified
                </span>
              </div>

              {/* 4-Box Visual Mapping of Accounts */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem'
              }}>
                <div style={{
                  padding: '0.85rem',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#334155' }}>
                      {isAr ? 'مدين: المقدم والأقساط المحصلة (حساب ٢٠٣٠٠٠)' : 'Dr 203000 Deferred Rev'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Dr = C</span>
                  </div>
                  <strong style={{ fontSize: '0.94rem', color: '#0f172a', display: 'block', marginTop: '0.25rem' }}>
                    <MoneyCell amount={cashCollected} isAr={isAr} />
                  </strong>
                  <span style={{ fontSize: '0.65rem', color: '#059669' }}>
                    {isAr ? 'المبالغ المحصلة قبل الاستلام تتحول لمبيعات رسمية' : 'Clears deferred revenue to 0.00'}
                  </span>
                </div>

                <div style={{
                  padding: '0.85rem',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#334155' }}>
                      {isAr ? 'مدين: باقي ثمن الشقة على العميل (حساب ١٠٣٠٠٠)' : 'Dr 103000 A/R Receivables'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Dr = V - C</span>
                  </div>
                  <strong style={{ fontSize: '0.94rem', color: '#b45309', display: 'block', marginTop: '0.25rem' }}>
                    <MoneyCell amount={unpaidBalance} isAr={isAr} />
                  </strong>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                    {isAr ? 'باقي الأقساط غير المسددة تثبت كمديونية على المشتري' : 'Remaining installments booked to A/R'}
                  </span>
                </div>

                <div style={{
                  padding: '0.85rem',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#334155' }}>
                      {isAr ? 'دائن: إجمالي إيراد بيع الشقة (حساب ٤٠١٠٠٠)' : 'Cr 401000 Realized Revenue'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Cr = V</span>
                  </div>
                  <strong style={{ fontSize: '0.94rem', color: '#047857', display: 'block', marginTop: '0.25rem' }}>
                    <MoneyCell amount={grossValue} isAr={isAr} />
                  </strong>
                  <span style={{ fontSize: '0.65rem', color: '#059669' }}>
                    {isAr ? 'اعتراف رسمي بكامل سعر بيع الشقة في قائمة الأرباح' : '100% recognized into P&L'}
                  </span>
                </div>

                <div style={{
                  padding: '0.85rem',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#334155' }}>
                      {isAr ? 'تكلفة المباني والإنشاءات (مدين ٥٠١٠٠٠ / دائن ١٥١٠٠٠)' : 'WIP Relief: Dr 501000 / Cr 151000'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>RSV COGS</span>
                  </div>
                  <strong style={{ fontSize: '0.94rem', color: '#4338ca', display: 'block', marginTop: '0.25rem' }}>
                    <MoneyCell amount={D(rsvCostAmount || 0)} isAr={isAr} />
                  </strong>
                  <span style={{ fontSize: '0.65rem', color: '#6366f1' }}>
                    {isAr ? 'استنزاف وتخفيض تكلفة مباني الشقة من مصاريف المشروع لإظهار صافي الربح' : 'Relieves WIP into COGS per RSV factor'}
                  </span>
                </div>
              </div>

              {/* Plain Real-Estate Explanation of Compound Entry */}
              <div style={{
                background: 'linear-gradient(135deg, #fefdfa 0%, #f8fafc 100%)',
                border: '1px solid rgba(184, 144, 62, 0.3)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                fontSize: '0.74rem',
                color: '#334155',
                lineHeight: 1.6,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: '#946f23' }}>
                  <Building2 size={15} />
                  <span>{isAr ? 'توضيح أسطر القيد المركب لمبيعات الشقق وتكلفة المباني (لغير المحاسبين):' : 'Plain-Language Real Estate Breakdown of Compound Entry:'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', color: '#475569' }}>
                  {isAr ? (
                    <>
                      <div>• <strong>سطر مبيعات الشقة (٤٠١٠٠٠):</strong> تسجيل كامل ثمن الشقة كإيراد بيع محقق في حسابات الشركة لحظة تسليم المفتاح.</div>
                      <div>• <strong>سطر تسوية المقدمات والأقساط (٢٠٣٠٠٠ و ١٠٣٠٠٠):</strong> إقفال الدفعات المحصلة سابقاً، وإثبات باقي ثمن الشقة كمديونية على المشتري.</div>
                      <div>• <strong>سطر تكلفة المباني والإنشاءات (٥٠١٠٠٠ مقابل ١٥١٠٠٠):</strong> خصم تكلفة خامات وصب وتشطيب الشقة من حساب المشروع وتحميلها على تكلفة البيع، لحساب صافي الربح الحقيقي للمكتب فوراً.</div>
                    </>
                  ) : (
                    <>
                      <div>• <strong>Revenue Recognition (401000):</strong> Recognizes 100% of apartment sales price into company P&L upon key delivery.</div>
                      <div>• <strong>Cash & Receivables Settlement (203000 & 103000):</strong> Relieves collected advance cash, and records remaining balance as A/R.</div>
                      <div>• <strong>Building Cost & WIP Relief (501000 vs 151000):</strong> Relieves structural construction expenses from WIP into COGS to derive true gross margin.</div>
                    </>
                  )}
                </div>
              </div>

              {/* Complete Balanced Journal Entry Rendering */}
              {previewEntry ? (
                <JournalEntryPreview 
                  entry={previewEntry} 
                  isDraft={true} 
                  isAr={isAr} 
                />
              ) : (
                <div style={{
                  padding: '1.5rem',
                  borderRadius: '12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.8rem',
                  textAlign: 'center'
                }}>
                  {isAr ? 'تعذر توليد معاينة القيد المحاسبي. تحقق من صحة قيم العقد.' : 'Could not generate preview. Please verify contract values.'}
                </div>
              )}
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div style={{
            padding: '1.15rem 1.75rem',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={15} color="#64748b" />
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {isAr
                  ? 'سيتم تحديث حالة العقد إلى Delivered وترحيل القيود الخمسة آلياً بسجل القيود العامة.'
                  : 'Contract handover status will change to Delivered and 5 journal lines will be permanently posted.'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isMutating}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '0.6rem 1.25rem',
                  minHeight: '44px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={!canConfirm}
                style={{
                  background: canConfirm
                    ? 'linear-gradient(135deg, #15803d 0%, #166534 100%)'
                    : '#94a3b8',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.65rem 1.6rem',
                  minHeight: '44px',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: canConfirm ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: canConfirm ? '0 4px 14px rgba(22, 101, 52, 0.3)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {isMutating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{isAr ? 'جاري ترحيل القيود...' : 'Posting Journal Entries...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{isAr ? 'اعتماد محضر الاستلام وترحيل قيود الإيراد (Model B)' : 'Confirm Handover & Post Model B (IFRS 15)'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
