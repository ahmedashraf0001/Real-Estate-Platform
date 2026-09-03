'use client';

import React, { useState, useMemo } from 'react';
import { 
  CalendarCheck, 
  Landmark, 
  FileText, 
  ShieldAlert, 
  Clock, 
  ArrowUpRight, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign, 
  AlertTriangle,
  ChevronRight,
  Filter
} from 'lucide-react';
import { 
  ERPPDCRecord, 
  ERPContract, 
  ERPInstallmentSchedule, 
  ERPMakerCheckerRequest, 
  ERPTaxRecord 
} from '@/lib/erp/types';
import { D } from '@/lib/erp/math';

interface DashboardDailyActionLedgerProps {
  pdcRecords: ERPPDCRecord[];
  contracts: ERPContract[];
  schedules: ERPInstallmentSchedule[];
  makerCheckerRequests: ERPMakerCheckerRequest[];
  taxRecords: ERPTaxRecord[];
  onInspectCheque: (cheque: ERPPDCRecord) => void;
  onInspectContract: (contract: ERPContract) => void;
  onInspectTax: (tax: ERPTaxRecord) => void;
  onNavigateToModule?: (module: string) => void;
  isAr?: boolean;
}

interface ActionLedgerItem {
  id: string;
  type: 'cheque' | 'installment' | 'approval' | 'tax';
  title: string;
  subtitle: string;
  amount: string;
  statusText: string;
  isOverdue: boolean;
  actionLabel: string;
  onAction: () => void;
  originalEntity: any;
}

export const DashboardDailyActionLedger: React.FC<DashboardDailyActionLedgerProps> = ({
  pdcRecords,
  contracts,
  schedules,
  makerCheckerRequests,
  taxRecords,
  onInspectCheque,
  onInspectContract,
  onInspectTax,
  onNavigateToModule,
  isAr = false
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'cheque' | 'installment' | 'approval'>('all');

  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const todayFormatted = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [isAr]);

  const formatMoney = (val: string | number) => {
    return D(val).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Build items that are either due TODAY or OVERDUE
  const ledgerItems = useMemo<ActionLedgerItem[]>(() => {
    const items: ActionLedgerItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Cheques in Safe (Due Today or Overdue)
    pdcRecords.forEach(pdc => {
      if (pdc.status !== 'In Safe') return;
      const dueDate = new Date(pdc.due_date);
      dueDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        items.push({
          id: `cheque_today_${pdc.cheque_id}`,
          type: 'cheque',
          title: isAr ? `شيك مستحق التحصيل باليد اليوم #${pdc.cheque_number}` : `Cheque Due for Hand Collection Today #${pdc.cheque_number}`,
          subtitle: `${pdc.bank_name} · ${isAr ? 'الساحب:' : 'Drawer:'} ${pdc.drawer_name}`,
          amount: pdc.nominal_value,
          statusText: isAr ? 'لم يتم التحصيل (يستحق اليوم)' : 'Due Today',
          isOverdue: false,
          actionLabel: isAr ? 'تحصيل باليد' : 'Collect by Hand',
          onAction: () => onInspectCheque(pdc),
          originalEntity: pdc
        });
      } else if (diffDays > 0) {
        items.push({
          id: `cheque_overdue_${pdc.cheque_id}`,
          type: 'cheque',
          title: isAr ? `شيك متأخر التحصيل باليد #${pdc.cheque_number}` : `Overdue Cheque #${pdc.cheque_number}`,
          subtitle: `${pdc.bank_name} · ${isAr ? 'تأخير' : 'Delayed'} ${diffDays} ${isAr ? 'يوم' : 'days'} (${pdc.due_date})`,
          amount: pdc.nominal_value,
          statusText: isAr ? `لم يتم التحصيل (متأخر ${diffDays} يوم)` : `${diffDays}d overdue`,
          isOverdue: true,
          actionLabel: isAr ? 'تحصيل باليد' : 'Collect by Hand',
          onAction: () => onInspectCheque(pdc),
          originalEntity: pdc
        });
      }
    });

    // 2. Installment Schedules (Due Today or Overdue)
    schedules.forEach(schedule => {
      if (schedule.status !== 'Pending') return;
      const dueDate = new Date(schedule.due_date);
      dueDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const contract = contracts.find(c => c.contract_id === schedule.contract_id);
      if (contract && contract.status === 'Rescinded') return;

      const contractNum = contract ? contract.contract_number : 'N/A';
      const buyerName = contract ? contract.buyer_name : (isAr ? 'العميل' : 'Buyer');
      const unitId = contract ? contract.unit_id : '';

      if (diffDays === 0) {
        items.push({
          id: `schedule_today_${schedule.schedule_id}`,
          type: 'installment',
          title: isAr ? `قسط مستحق التحصيل باليد اليوم (قسط ${schedule.tranche_number})` : `Installment Due for Hand Collection (Tranche ${schedule.tranche_number})`,
          subtitle: `${isAr ? 'عقد' : 'Contract'} ${contractNum} · ${unitId} · ${buyerName}`,
          amount: schedule.nominal_value,
          statusText: isAr ? 'لم يتم التحصيل (يستحق اليوم)' : 'Due Today',
          isOverdue: false,
          actionLabel: isAr ? 'تحصيل باليد' : 'Collect by Hand',
          onAction: () => contract && onInspectContract(contract),
          originalEntity: schedule
        });
      } else if (diffDays > 0) {
        items.push({
          id: `schedule_overdue_${schedule.schedule_id}`,
          type: 'installment',
          title: isAr ? `قسط متأخر لم يتم تحصيله (قسط ${schedule.tranche_number})` : `Overdue Tranche #${schedule.tranche_number}`,
          subtitle: `${isAr ? 'عقد' : 'Contract'} ${contractNum} · ${unitId} · ${buyerName} (${isAr ? 'متأخر' : 'late'} ${diffDays}d)`,
          amount: schedule.nominal_value,
          statusText: isAr ? `لم يتم التحصيل (متأخر ${diffDays} يوم)` : `${diffDays}d late`,
          isOverdue: true,
          actionLabel: isAr ? 'تحصيل باليد' : 'Collect by Hand',
          onAction: () => contract && onInspectContract(contract),
          originalEntity: schedule
        });
      }
    });

    // 3. Maker-Checker Pending Dual Authorizations
    makerCheckerRequests.forEach(req => {
      if (req.status !== 'Pending') return;
      items.push({
        id: `maker_checker_${req.request_id}`,
        type: 'approval',
        title: isAr ? `طلب اعتماد رقابي معلق: ${req.mutation_type}` : `Pending Authorization: ${req.mutation_type}`,
        subtitle: `${isAr ? 'مقدم من:' : 'Requested by:'} ${req.requested_by} · ${req.request_id}`,
        amount: req.amount || '0.00',
        statusText: isAr ? 'بانتظار الاعتماد' : 'Pending Sign-off',
        isOverdue: true,
        actionLabel: isAr ? 'اعتماد ومراجعة' : 'Review & Approve',
        onAction: () => onNavigateToModule?.('rescissions'),
        originalEntity: req
      });
    });

    // Sort: Overdue & Critical first, then by amount descending
    return items.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return parseFloat(b.amount || '0') - parseFloat(a.amount || '0');
    });
  }, [pdcRecords, contracts, schedules, makerCheckerRequests, isAr, onInspectCheque, onInspectContract, onNavigateToModule]);

  // Aggregate Metrics for Today's Header
  const totalInflowsToday = useMemo(() => {
    return ledgerItems
      .filter(item => !item.isOverdue && (item.type === 'cheque' || item.type === 'installment'))
      .reduce((acc, item) => acc.plus(item.amount || 0), D(0))
      .toFixed(2);
  }, [ledgerItems]);

  const totalOverdueAmount = useMemo(() => {
    return ledgerItems
      .filter(item => item.isOverdue && (item.type === 'cheque' || item.type === 'installment'))
      .reduce((acc, item) => acc.plus(item.amount || 0), D(0))
      .toFixed(2);
  }, [ledgerItems]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return ledgerItems;
    return ledgerItems.filter(item => item.type === activeFilter);
  }, [ledgerItems, activeFilter]);

  const chequeCount = ledgerItems.filter(i => i.type === 'cheque').length;
  const installmentCount = ledgerItems.filter(i => i.type === 'installment').length;
  const approvalCount = ledgerItems.filter(i => i.type === 'approval').length;

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(16, 22, 36, 0.85) 0%, rgba(10, 14, 24, 0.95) 100%)',
      border: '1px solid rgba(212, 175, 55, 0.3)',
      borderTop: '3px solid #d4af37',
      borderRadius: '16px',
      padding: '1.35rem 1.5rem',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(212, 175, 55, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Ambience Glow */}
      <div style={{
        position: 'absolute',
        top: -60,
        [isAr ? 'left' : 'right']: -60,
        width: 180,
        height: 180,
        background: 'radial-gradient(circle, rgba(212, 175, 55, 0.12) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Top Header Strip: Title + Date + Live Counters */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        paddingBottom: '1.1rem'
      }}>
        {/* Title Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.08) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d4af37',
            boxShadow: '0 0 16px rgba(212, 175, 55, 0.2)'
          }}>
            <CalendarCheck size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.01em' }}>
                {isAr ? 'أجندة اليوم التنفيذية والاستحقاقات المالية' : 'Today’s Executive Financial Action Ledger'}
              </h3>
              {ledgerItems.length > 0 && (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '0.12rem 0.5rem',
                  borderRadius: '999px',
                  background: ledgerItems.some(i => i.isOverdue) ? 'rgba(239, 68, 68, 0.2)' : 'rgba(212, 175, 55, 0.2)',
                  color: ledgerItems.some(i => i.isOverdue) ? '#f87171' : '#e2c974',
                  border: ledgerItems.some(i => i.isOverdue) ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(212, 175, 55, 0.4)',
                  fontFamily: 'monospace'
                }}>
                  {ledgerItems.length} {isAr ? 'استحقاق' : 'actions'}
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {todayFormatted} · {isAr ? 'رصد لحظي للشيكات والأقساط المستحقة والرقابة المزدوجة' : 'Real-time tracking of cheques, dues, and approvals'}
            </span>
          </div>
        </div>

        {/* Telemetry Metric Cards */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Tile 1: Cash Inflows Today */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '9px',
            padding: '0.45rem 0.85rem',
            display: 'flex',
            flexDirection: 'column',
            minWidth: '135px'
          }}>
            <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>
              {isAr ? 'تحصيلات مستحقة اليوم' : 'Due Today'}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                {formatMoney(totalInflowsToday)}
              </span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{isAr ? 'ج.م' : 'EGP'}</span>
            </div>
          </div>

          {/* Tile 2: Overdue Arrears */}
          {parseFloat(totalOverdueAmount) > 0 && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '9px',
              padding: '0.45rem 0.85rem',
              display: 'flex',
              flexDirection: 'column',
              minWidth: '135px'
            }}>
              <span style={{ fontSize: '0.65rem', color: '#f87171', fontWeight: 700 }}>
                {isAr ? 'متأخرات تتطلب التدخل' : 'Overdue Arrears'}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fca5a5', fontFamily: 'monospace' }}>
                  {formatMoney(totalOverdueAmount)}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all', labelAr: 'كل مهام اليوم', labelEn: 'All Actions', count: ledgerItems.length },
          { id: 'cheque', labelAr: 'شيكات الخزينة', labelEn: 'Cheques', count: chequeCount },
          { id: 'installment', labelAr: 'أقساط العملاء', labelEn: 'Installments', count: installmentCount },
          { id: 'approval', labelAr: 'موافقات معلقة', labelEn: 'Approvals', count: approvalCount }
        ].map(tab => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 700,
                border: isActive ? '1px solid rgba(212, 175, 55, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isActive 
                  ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.06) 100%)' 
                  : 'rgba(0, 0, 0, 0.25)',
                color: isActive ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{isAr ? tab.labelAr : tab.labelEn}</span>
              <span style={{
                fontSize: '0.64rem',
                padding: '0.05rem 0.35rem',
                borderRadius: '4px',
                background: isActive ? 'rgba(212, 175, 55, 0.35)' : 'rgba(255, 255, 255, 0.06)',
                color: isActive ? '#ffffff' : '#64748b',
                fontFamily: 'monospace'
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ledger Items Grid / List */}
      {filteredItems.length === 0 ? (
        /* Empty State */
        <div style={{
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.65rem',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '12px',
          border: '1px dashed rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981'
          }}>
            <CheckCircle2 size={24} />
          </div>
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff' }}>
            {isAr ? 'جميع استحقاقات اليوم مستوفاة ومحصلة' : 'All Daily Obligations Fully Met'}
          </span>
          <span style={{ fontSize: '0.74rem', color: '#64748b', maxWidth: '340px' }}>
            {isAr 
              ? 'الخزينة متطابقة ولا توجد شيكات أو أقساط متأخرة تتطلب التدخل الفوري لليوم.'
              : 'Vault is balanced and no overdue cheques or customer instalments require immediate recovery today.'}
          </span>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '0.85rem'
        }}>
          {filteredItems.map(item => {
            return (
              <div
                key={item.id}
                style={{
                  background: item.isOverdue 
                    ? 'linear-gradient(145deg, rgba(28, 16, 20, 0.75) 0%, rgba(16, 12, 18, 0.95) 100%)' 
                    : 'linear-gradient(145deg, rgba(20, 26, 42, 0.75) 0%, rgba(12, 16, 26, 0.95) 100%)',
                  border: item.isOverdue 
                    ? '1px solid rgba(239, 68, 68, 0.35)' 
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  borderInlineStart: item.isOverdue 
                    ? '3.5px solid #ef4444' 
                    : '3.5px solid #d4af37',
                  borderRadius: '12px',
                  padding: '1rem 1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease'
                }}
              >
                {/* Header: Icon + Title + Status Pill */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '7px',
                      background: item.isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(212, 175, 55, 0.15)',
                      border: item.isOverdue ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(212, 175, 55, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: item.isOverdue ? '#f87171' : '#e2c974',
                      flexShrink: 0
                    }}>
                      {item.type === 'cheque' && <Landmark size={14} />}
                      {item.type === 'installment' && <FileText size={14} />}
                      {item.type === 'approval' && <ShieldAlert size={14} />}
                    </div>
                    <span style={{
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: '#ffffff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {item.title}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    padding: '0.12rem 0.45rem',
                    borderRadius: '4px',
                    background: item.isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: item.isOverdue ? '#fca5a5' : '#34d399',
                    border: item.isOverdue ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
                    flexShrink: 0
                  }}>
                    {item.statusText}
                  </span>
                </div>

                {/* Subtitle */}
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4 }}>
                  {item.subtitle}
                </div>

                {/* Amount + Action Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.45rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  marginTop: '0.2rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                      {formatMoney(item.amount)}
                    </span>
                    <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={item.onAction}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: item.isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(212, 175, 55, 0.15)',
                      border: item.isOverdue ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(212, 175, 55, 0.4)',
                      color: item.isOverdue ? '#fca5a5' : '#e2c974',
                      padding: '0.3rem 0.65rem',
                      borderRadius: '7px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = item.isOverdue ? 'rgba(239, 68, 68, 0.3)' : 'rgba(212, 175, 55, 0.28)';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = item.isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(212, 175, 55, 0.15)';
                      e.currentTarget.style.color = item.isOverdue ? '#fca5a5' : '#e2c974';
                    }}
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
