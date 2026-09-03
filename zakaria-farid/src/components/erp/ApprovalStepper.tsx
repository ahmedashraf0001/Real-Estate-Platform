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
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        direction: isAr ? 'rtl' : 'ltr',
        textAlign: isAr ? 'right' : 'left',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#946f23', fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>
            {request.request_id}
          </span>
          <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            {displayTitle}
          </h4>
        </div>

        {reqAmount && (
          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
              {reqAmount.formatEGP()}
            </div>
            {requiresDual && (
              <span style={{ fontSize: '0.68rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: isAr ? 'flex-start' : 'flex-end', fontWeight: 700 }}>
                <AlertTriangle size={11} />
                <span>{isAr ? 'يتطلب توقيعاً ثنائياً (> ٥٠٠ ألف ج.م)' : 'Requires Dual Sign-off (>500k EGP)'}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Human-readable payload diff */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.85rem', borderRadius: '8px', fontSize: '0.8rem' }}>
        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 700 }}>
          {isAr ? 'بيانات المعاملة المالية وقيد التدقيق:' : 'Transaction Payload Summary:'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
          <div>
            <span style={{ color: '#64748b' }}>{isAr ? 'المُقدّم:' : 'Maker:'} </span>
            <strong style={{ color: '#0f172a' }}>{request.requested_by}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>{isAr ? 'تاريخ الطلب:' : 'Created:'} </span>
            <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{new Date(request.created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</strong>
          </div>
          {Object.entries(request.payload || {}).map(([k, v]) => (
            <div key={k}>
              <span style={{ color: '#64748b' }}>{isAr ? (PAYLOAD_KEYS_AR[k] || k) : k}: </span>
              <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{String(v)}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* 3-Step Stepper Line */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', gap: '0.5rem' }}>
        {/* Step 1: Maker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
          <div style={{ color: '#15803d' }}>
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#0f172a' }}>{isAr ? '١. تقديم المعاملة' : '1. Maker'}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{request.requested_by}</div>
          </div>
        </div>

        <div style={{ flex: 1, height: '2px', background: '#e2e8f0' }} />

        {/* Step 2: Primary Approver */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
          <div style={{ color: hasPrimary ? '#15803d' : '#b45309' }}>
            {hasPrimary ? <CheckCircle2 size={16} /> : <Clock size={16} />}
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#0f172a' }}>{isAr ? '٢. اعتماد أول' : '2. Primary'}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              {request.primary_approver || (isAr ? 'معلق' : 'Pending')}
            </div>
          </div>
        </div>

        {requiresDual && (
          <>
            <div style={{ flex: 1, height: '2px', background: '#e2e8f0' }} />

            {/* Step 3: Secondary Approver */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
              <div style={{ color: hasSecondary ? '#15803d' : '#b45309' }}>
                {hasSecondary ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>{isAr ? '٣. اعتماد ثانٍ' : '3. Secondary'}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {request.secondary_approver || (isAr ? 'مطلوب للمبالغ الكبيرة' : 'Required')}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action footer */}
      {!isApproved && onApprove && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
          <button
            onClick={() => onApprove(request.request_id)}
            disabled={disabled}
            style={{
              background: 'linear-gradient(135deg, #946f23 0%, #785818 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.55rem 1.15rem',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(148, 111, 35, 0.25)'
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
