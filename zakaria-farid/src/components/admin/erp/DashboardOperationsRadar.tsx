'use client';

import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Landmark, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowUpRight, 
  FileText, 
  Calendar,
  Sparkles,
  Wallet
} from 'lucide-react';
import { ERPPDCRecord, ERPContract, ERPTaxRecord } from '@/lib/erp/types';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { D } from '@/lib/erp/math';

interface DashboardOperationsRadarProps {
  pdcRecords: ERPPDCRecord[];
  contracts: ERPContract[];
  taxRecords: ERPTaxRecord[];
  onInspectCheque: (cheque: ERPPDCRecord) => void;
  onInspectContract: (contract: ERPContract) => void;
  onInspectTax: (tax: ERPTaxRecord) => void;
  onRemitTax?: (taxId: string) => void;
  isAr: boolean;
}

export const DashboardOperationsRadar: React.FC<DashboardOperationsRadarProps> = ({
  pdcRecords,
  contracts,
  taxRecords,
  onInspectCheque,
  onInspectContract,
  onInspectTax,
  onRemitTax,
  isAr
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const next7DaysStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  // 1. Due / Maturing Cheques (Due now or in 7 days, not cleared)
  const dueCheques = pdcRecords.filter(p => 
    p.status !== 'Cleared' && p.status !== 'Bounced' && p.due_date <= next7DaysStr
  );
  const totalDueChequesAmount = dueCheques.reduce((acc, p) => acc.plus(p.nominal_value || '0'), D(0));

  // 2. Contracts needing attention (Pending handover or low collection progress)
  const pendingContracts = contracts.filter(c => 
    c.status !== 'Rescinded' && c.handover_status === 'Pending'
  );

  // 3. Pending ETA Statutory Taxes
  const pendingTaxes = taxRecords.filter(t => t.remittance_status !== 'Remitted to ETA');
  const totalPendingTaxAmount = pendingTaxes.reduce((acc, t) => acc.plus(t.tax_amount || '0'), D(0));

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      background: 'rgba(255, 255, 255, 0.015)',
      border: '1px solid rgba(255, 255, 255, 0.07)',
      borderRadius: '18px',
      padding: '1.25rem 1.4rem'
    }}>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(212, 175, 55, 0.15)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--zf-gold, #d4af37)'
          }}>
            <Sparkles size={16} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
              {isAr ? 'رادار العمليات والمهام العاجلة (Actionable Operations Radar)' : 'Actionable Operations Radar'}
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {isAr ? 'الملفات والاستحقاقات التي تتطلب قراراً مالياً أو إجراء فوري اليوم' : 'Priority items requiring CFO action or clearance'}
            </span>
          </div>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '0.25rem 0.6rem',
          borderRadius: '999px',
          fontSize: '0.72rem',
          fontWeight: 800,
          color: '#6ee7b7'
        }}>
          <CheckCircle2 size={12} />
          <span>{isAr ? 'مراقبة حية مستمرة' : 'Live Radar Active'}</span>
        </div>
      </div>

      {/* 3 Priority Operational Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1rem'
      }}>
        {/* Card 1: Due Safe Cheques */}
        <div style={{
          background: 'rgba(15, 20, 32, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '0.85rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#cbd5e1', fontWeight: 700, fontSize: '0.8rem' }}>
                <Wallet size={15} color="var(--zf-gold, #d4af37)" />
                <span>{isAr ? 'أقساط وبنود مستحقة التحصيل باليد' : 'Installments Due for Hand Collection'}</span>
              </div>
              <span style={{
                background: dueCheques.length > 0 ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: dueCheques.length > 0 ? 'var(--zf-gold, #d4af37)' : '#64748b',
                borderRadius: '6px',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                padding: '0.15rem 0.5rem',
                fontSize: '0.7rem',
                fontWeight: 700
              }}>
                {dueCheques.length} {isAr ? 'بند قسط' : 'dues'}
              </span>
            </div>

            <div style={{ marginTop: '0.6rem' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                {isAr ? 'إجمالي قيمة الأقساط المستحقة:' : 'Total due installments:'}
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
                {totalDueChequesAmount.formatEGP(isAr)}
              </div>
            </div>
          </div>

          {/* Cheques Micro-List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {dueCheques.slice(0, 2).map(ch => (
              <div
                key={ch.cheque_id}
                onClick={() => onInspectCheque(ch)}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'}
              >
                <div>
                  <strong style={{ color: '#f8fafc', display: 'block' }}>#{ch.cheque_number}</strong>
                  <span style={{ color: '#64748b', fontSize: '0.66rem' }}>{ch.drawer_name || (isAr ? 'سداد نقدي باليد' : 'Hand Cash')}</span>
                </div>
                <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                  <span style={{ color: '#f8fafc', fontWeight: 700 }}>{D(ch.nominal_value).formatEGP(isAr)}</span>
                  <span style={{ color: ch.due_date <= todayStr ? '#f87171' : '#cbd5e1', fontSize: '0.66rem', display: 'block' }}>
                    {ch.due_date <= todayStr ? (isAr ? 'يستحق التحصيل اليوم' : 'Due Today') : ch.due_date}
                  </span>
                </div>
              </div>
            ))}

            {dueCheques.length === 0 && (
              <div style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0' }}>
                <CheckCircle2 size={13} />
                <span>{isAr ? 'كافة الأقساط والبنود محصلة ومسددة' : 'All hand dues are clear'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Pending Handover Contracts */}
        <div style={{
          background: 'rgba(15, 20, 32, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '0.85rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#cbd5e1', fontWeight: 700, fontSize: '0.8rem' }}>
                <FileText size={15} color="#94a3b8" />
                <span>{isAr ? 'عقود قيد التنفيذ قبل التسليم' : 'Contracts Pending Delivery'}</span>
              </div>
              <span style={{
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '0.15rem 0.5rem',
                fontSize: '0.7rem',
                fontWeight: 700
              }}>
                {pendingContracts.length} {isAr ? 'عقد' : 'Active'}
              </span>
            </div>

            <div style={{ marginTop: '0.6rem' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                {isAr ? 'إيرادات مؤجلة مرتبطة بالتسليم (203000):' : 'Deferred revenue awaiting handover:'}
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
                {D(pendingContracts.reduce((acc, c) => acc.plus(c.total_cash_collected || '0'), D(0))).formatEGP(isAr)}
              </div>
            </div>
          </div>

          {/* Contracts Micro-List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {pendingContracts.slice(0, 2).map(ct => (
              <div
                key={ct.contract_id}
                onClick={() => onInspectContract(ct)}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'}
              >
                <div>
                  <strong style={{ color: '#f8fafc', display: 'block' }}>{ct.contract_number}</strong>
                  <span style={{ color: '#64748b', fontSize: '0.66rem' }}>{ct.buyer_name || 'العميل'}</span>
                </div>
                <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                  <span style={{ color: '#f8fafc', fontWeight: 700 }}>{D(ct.gross_contract_value).formatEGP(isAr)}</span>
                  <span style={{ color: '#94a3b8', fontSize: '0.66rem', display: 'block' }}>
                    {isAr ? 'قيد الإنشاء' : 'In Construction'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Pending Statutory Taxes */}
        <div style={{
          background: 'rgba(15, 20, 32, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '0.85rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#cbd5e1', fontWeight: 700, fontSize: '0.8rem' }}>
                <ShieldCheck size={15} color="#94a3b8" />
                <span>{isAr ? 'إقرارات ضريبية قيد التوريد للمصلحة' : 'ETA Taxes Pending Remittance'}</span>
              </div>
              <span style={{
                background: pendingTaxes.length > 0 ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                color: pendingTaxes.length > 0 ? '#f8fafc' : '#64748b',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '0.15rem 0.5rem',
                fontSize: '0.7rem',
                fontWeight: 700
              }}>
                {pendingTaxes.length} {isAr ? 'إقرار' : 'Due'}
              </span>
            </div>

            <div style={{ marginTop: '0.6rem' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                {isAr ? 'التزام ضريبي مستحق الدفع (204000):' : 'Tax authority liability:'}
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
                {totalPendingTaxAmount.formatEGP(isAr)}
              </div>
            </div>
          </div>

          {/* Taxes Micro-List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {pendingTaxes.slice(0, 2).map(tx => (
              <div
                key={tx.tax_id}
                onClick={() => onInspectTax(tx)}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'}
              >
                <div>
                  <strong style={{ color: '#f8fafc', display: 'block' }}>
                    {tx.tax_type.includes('Disposal') ? (isAr ? 'ضريبة مضافة للشقة (يدوياً)' : 'Manual Apartment Tax') : tx.tax_type}
                  </strong>
                  <span style={{ color: '#64748b', fontSize: '0.66rem' }}>#{tx.tax_id.slice(0, 8)}</span>
                </div>
                <div style={{ textAlign: isAr ? 'left' : 'right', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#f8fafc', fontWeight: 700 }}>{D(tx.tax_amount).formatEGP(isAr)}</span>
                  {onRemitTax && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemitTax(tx.tax_id);
                      }}
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#34d399',
                        borderRadius: '5px',
                        padding: '0.2rem 0.45rem',
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isAr ? 'توريد للمصلحة' : 'Remit'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {pendingTaxes.length === 0 && (
              <div style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0' }}>
                <CheckCircle2 size={13} />
                <span>{isAr ? 'كافة الالتزامات الضريبية مسددة بالكامل للمصلحة' : 'All taxes remitted to ETA'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
