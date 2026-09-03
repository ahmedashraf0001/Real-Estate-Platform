'use client';

import React from 'react';
import { ShieldCheck, UserCheck, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { ERPMakerCheckerRequest } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';

interface ApprovalStepperProps {
  request: ERPMakerCheckerRequest;
  onApprove?: (requestId: string) => void;
  isAr?: boolean;
  disabled?: boolean;
}

export const ApprovalStepper: React.FC<ApprovalStepperProps> = ({
  request,
  onApprove,
  isAr = false,
  disabled = false
}) => {
  const reqAmount = request.amount ? D(request.amount) : null;
  const requiresDual = reqAmount ? reqAmount.greaterThan('500000.00') : false;

  const hasPrimary = !!request.primary_approver;
  const hasSecondary = !!request.secondary_approver;
  const isApproved = request.status === 'Approved';

  const MUTATION_LABELS_AR: Record<string, string> = {
    CONTRACT_ESCALATION: 'تصعيد تكلفة عقد (تعديل القيمة)',
    RESCISSION_REFUND: 'صرف رد مالي ناتج عن فسخ عقد',
    PERIOD_LOCK: 'قفل نهائي لفترة مالية ومحاسبية',
    CAPITAL_CALL: 'إصدار طلب تمويل شركاء (Capital Call)',
    GENERAL_JOURNAL_POST: 'ترحيل قيد يومية استثنائي'
  };

  const PAYLOAD_KEYS_AR: Record<string, string> = {
    contract_id: 'كود العقد',
    contract_number: 'رقم العقد',
    unit_id: 'كود الوحدة',
    amount: 'المبلغ الإجمالي',
    delta_v: 'قيمة الزيادة (Delta V)',
    reason: 'مبرر التعديل',
    period_id: 'الفترة المالية',
    refund_amount: 'صافي المسترد للعميل',
    penalty_retained: 'الغرامة المحتجزة'
  };

  const displayTitle = isAr ? (MUTATION_LABELS_AR[request.mutation_type] || request.mutation_type) : request.mutation_type;

  return (
    <div 
      style={{
        background: 'var(--zf-bg-panel, #121622)',
        border: '1px solid var(--zf-border-hairline, rgba(212, 175, 55, 0.15))',
        borderRadius: '12px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        direction: isAr ? 'rtl' : 'ltr',
        textAlign: isAr ? 'right' : 'left'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--zf-gold, #d4af37)', fontFamily: 'monospace', fontWeight: 700 }}>
            {request.request_id}
          </span>
          <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
            {displayTitle}
          </h4>
        </div>

        {reqAmount && (
          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--zf-gold, #d4af37)', fontVariantNumeric: 'tabular-nums' }}>
              {reqAmount.formatEGP()}
            </div>
            {requiresDual && (
              <span style={{ fontSize: '0.68rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: isAr ? 'flex-start' : 'flex-end' }}>
                <AlertTriangle size={11} />
                <span>{isAr ? 'يتطلب توقيعاً ثنائياً (> ٥٠٠ ألف ج.م)' : 'Requires Dual Sign-off (>500k EGP)'}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Human-readable payload diff */}
      <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.8rem' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--zf-text-muted, #6b7086)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
          {isAr ? 'بيانات المعاملة المالية وقيد التدقيق:' : 'Transaction Payload Summary:'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
          <div>
            <span style={{ color: 'var(--zf-text-muted, #6b7086)' }}>{isAr ? 'المُقدّم:' : 'Maker:'} </span>
            <strong style={{ color: '#ffffff' }}>{request.requested_by}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--zf-text-muted, #6b7086)' }}>{isAr ? 'تاريخ الطلب:' : 'Created:'} </span>
            <strong style={{ color: '#ffffff' }}>{new Date(request.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</strong>
          </div>
          {Object.entries(request.payload || {}).map(([k, v]) => (
            <div key={k}>
              <span style={{ color: 'var(--zf-text-muted, #6b7086)' }}>{isAr ? (PAYLOAD_KEYS_AR[k] || k) : k}: </span>
              <strong style={{ color: '#ffffff' }}>{String(v)}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* 3-Step Stepper Line */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', gap: '0.5rem' }}>
        {/* Step 1: Maker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
          <div style={{ color: 'var(--zf-state-paid, #6fcf97)' }}>
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#ffffff' }}>{isAr ? '١. تقديم المعاملة' : '1. Maker'}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--zf-text-muted, #6b7086)' }}>{request.requested_by}</div>
          </div>
        </div>

        <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.1)' }} />

        {/* Step 2: Primary Approver */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
          <div style={{ color: hasPrimary ? 'var(--zf-state-paid, #6fcf97)' : 'var(--zf-state-pending, #f0c674)' }}>
            {hasPrimary ? <CheckCircle2 size={16} /> : <Clock size={16} />}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#ffffff' }}>{isAr ? '٢. اعتماد أول' : '2. Primary'}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--zf-text-muted, #6b7086)' }}>
              {request.primary_approver || (isAr ? 'معلق' : 'Pending')}
            </div>
          </div>
        </div>

        {requiresDual && (
          <>
            <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.1)' }} />

            {/* Step 3: Secondary Approver */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
              <div style={{ color: hasSecondary ? 'var(--zf-state-paid, #6fcf97)' : 'var(--zf-state-pending, #f0c674)' }}>
                {hasSecondary ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#ffffff' }}>{isAr ? '٣. اعتماد ثانٍ' : '3. Secondary'}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--zf-text-muted, #6b7086)' }}>
                  {request.secondary_approver || (isAr ? 'مطلوب للمبالغ الكبيرة' : 'Required')}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action footer */}
      {!isApproved && onApprove && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
          <button
            onClick={() => onApprove(request.request_id)}
            disabled={disabled}
            style={{
              background: 'linear-gradient(135deg, #d4af37, #b8860b)',
              color: '#0c0e14',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <UserCheck size={14} />
            <span>{isAr ? 'اعتماد المعاملة الآن' : 'Sign Off & Authorize'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
