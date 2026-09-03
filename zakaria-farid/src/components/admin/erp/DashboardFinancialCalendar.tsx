'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Wallet,
  FileText, 
  Clock, 
  ArrowUpRight, 
  List, 
  Grid, 
  CheckCircle2, 
  AlertTriangle,
  X
} from 'lucide-react';
import { 
  ERPPDCRecord, 
  ERPContract, 
  ERPInstallmentSchedule, 
  ERPTaxRecord 
} from '@/lib/erp/types';
import { D } from '@/lib/erp/math';

interface DashboardFinancialCalendarProps {
  pdcRecords: ERPPDCRecord[];
  contracts: ERPContract[];
  schedules: ERPInstallmentSchedule[];
  taxRecords?: ERPTaxRecord[];
  onInspectCheque?: (cheque: ERPPDCRecord) => void;
  onInspectContract: (contract: ERPContract) => void;
  onInspectTax?: (tax: ERPTaxRecord) => void;
  onCollectItem?: (item: ERPPDCRecord) => void;
  isAr?: boolean;
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'installment';
  title: string;
  subtitle: string;
  amount: string;
  status: string;
  statusKey: 'cleared' | 'overdue' | 'due_today' | 'due_later';
  isOverdue: boolean;
  isCollected: boolean;
  rawEntity: { pdc?: ERPPDCRecord; schedule?: ERPInstallmentSchedule; contract?: ERPContract };
}

export const DashboardFinancialCalendar: React.FC<DashboardFinancialCalendarProps> = ({
  pdcRecords = [],
  contracts = [],
  schedules = [],
  onInspectCheque,
  onInspectContract,
  onCollectItem,
  isAr = false
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(() => new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'cleared' | 'due_later' | 'overdue'>('all');

  const formatMoney = (val: string | number) => {
    return D(val).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDayStr(now.toISOString().split('T')[0]);
  };

  const monthFormatted = useMemo(() => {
    return currentDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long'
    });
  }, [currentDate, isAr]);

  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Map only contract installment dues - Zero Cheques & Zero Taxes
  const allEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];
    const coveredScheduleIds = new Set<string>();

    // 1. Primary Source: PDC Records (tracks live hand collection status)
    pdcRecords.forEach(pdc => {
      if (!pdc.due_date) return;
      if (pdc.schedule_id) coveredScheduleIds.add(pdc.schedule_id);

      const contract = contracts.find(c => c.contract_id === pdc.contract_id);
      if (contract && contract.status === 'Rescinded') return;

      const isCollected = pdc.status === 'Cleared';
      const isOverdue = !isCollected && pdc.due_date < todayStr;
      const isDueToday = !isCollected && pdc.due_date === todayStr;

      const statusKey: 'cleared' | 'overdue' | 'due_today' | 'due_later' = isCollected
        ? 'cleared'
        : isOverdue
        ? 'overdue'
        : isDueToday
        ? 'due_today'
        : 'due_later';

      const statusLabel = isCollected
        ? (isAr ? 'تم التحصيل باليد (بالخزينة)' : 'Collected in Safe')
        : isOverdue
        ? (isAr ? 'متأخر عن موعد التحصيل' : 'Overdue')
        : isDueToday
        ? (isAr ? 'يستحق التحصيل اليوم' : 'Due Today')
        : (isAr ? 'مستحق لاحقاً باليد' : 'Due Later');

      const contractNum = contract ? `#${contract.contract_number}` : '';
      const unitText = contract?.unit_id ? ` · ${contract.unit_id}` : '';
      const buyerText = pdc.drawer_name || contract?.buyer_name || (isAr ? 'عميل' : 'Client');

      events.push({
        id: `pdc_${pdc.cheque_id}`,
        date: pdc.due_date,
        type: 'installment',
        title: isAr ? `قسط عقد ${contractNum}` : `Installment ${contractNum}`,
        subtitle: `${buyerText}${unitText}`,
        amount: pdc.nominal_value,
        status: statusLabel,
        statusKey,
        isOverdue,
        isCollected,
        rawEntity: { pdc, contract }
      });
    });

    // 2. Secondary Fallback: Contract Installment Schedules not covered by PDC records
    schedules.forEach(sched => {
      if (!sched.due_date || coveredScheduleIds.has(sched.schedule_id)) return;
      const contract = contracts.find(c => c.contract_id === sched.contract_id);
      if (contract && contract.status === 'Rescinded') return;

      const isCollected = sched.status === 'Paid';
      const isOverdue = !isCollected && sched.due_date < todayStr;
      const isDueToday = !isCollected && sched.due_date === todayStr;

      const statusKey: 'cleared' | 'overdue' | 'due_today' | 'due_later' = isCollected
        ? 'cleared'
        : isOverdue
        ? 'overdue'
        : isDueToday
        ? 'due_today'
        : 'due_later';

      const statusLabel = isCollected
        ? (isAr ? 'تم التحصيل باليد (بالخزينة)' : 'Collected in Safe')
        : isOverdue
        ? (isAr ? 'متأخر عن موعد التحصيل' : 'Overdue')
        : isDueToday
        ? (isAr ? 'يستحق التحصيل اليوم' : 'Due Today')
        : (isAr ? 'مستحق لاحقاً باليد' : 'Due Later');

      const contractNum = contract ? `#${contract.contract_number}` : '';
      const unitText = contract?.unit_id ? ` · ${contract.unit_id}` : '';
      const buyerText = contract?.buyer_name || (isAr ? 'عميل' : 'Client');

      events.push({
        id: `sched_${sched.schedule_id}`,
        date: sched.due_date,
        type: 'installment',
        title: isAr ? `قسط عقد ${contractNum} (دفعة ${sched.tranche_number})` : `Tranche ${sched.tranche_number} (${contractNum})`,
        subtitle: `${buyerText}${unitText}`,
        amount: sched.nominal_value,
        status: statusLabel,
        statusKey,
        isOverdue,
        isCollected,
        rawEntity: { schedule: sched, contract }
      });
    });

    return events;
  }, [pdcRecords, schedules, contracts, todayStr, isAr]);

  // Filter events for the current displayed month
  const monthEvents = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return allEvents.filter(e => {
      if (!e.date.startsWith(prefix)) return false;
      if (filterType === 'all') return true;
      if (filterType === 'cleared') return e.isCollected;
      if (filterType === 'overdue') return e.isOverdue;
      if (filterType === 'due_later') return !e.isCollected && !e.isOverdue;
      return true;
    });
  }, [allEvents, currentYear, currentMonth, filterType]);

  // Aggregate stats for the current month
  const monthStats = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const allCurrentMonthEvents = allEvents.filter(e => e.date.startsWith(prefix));

    const totalMonthValue = allCurrentMonthEvents.reduce((acc, e) => acc.plus(e.amount || 0), D(0));
    const collectedInMonth = allCurrentMonthEvents.filter(e => e.isCollected);
    const overdueInMonth = allCurrentMonthEvents.filter(e => e.isOverdue);
    const pendingInMonth = allCurrentMonthEvents.filter(e => !e.isCollected && !e.isOverdue);

    const collectedSum = collectedInMonth.reduce((acc, e) => acc.plus(e.amount || 0), D(0));
    const overdueSum = overdueInMonth.reduce((acc, e) => acc.plus(e.amount || 0), D(0));
    const pendingSum = pendingInMonth.reduce((acc, e) => acc.plus(e.amount || 0), D(0));

    return {
      totalMonthValue: totalMonthValue.toFixed(2),
      totalCount: allCurrentMonthEvents.length,
      collectedSum: collectedSum.toFixed(2),
      collectedCount: collectedInMonth.length,
      overdueSum: overdueSum.toFixed(2),
      overdueCount: overdueInMonth.length,
      pendingSum: pendingSum.toFixed(2),
      pendingCount: pendingInMonth.length
    };
  }, [allEvents, currentYear, currentMonth]);

  // Group month events by date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    monthEvents.forEach(event => {
      const existing = map.get(event.date) || [];
      existing.push(event);
      map.set(event.date, existing);
    });
    return map;
  }, [monthEvents]);

  // Selected Day Events (filter according to active category or all)
  const selectedDayEvents = useMemo(() => {
    if (!selectedDayStr) return [];
    return allEvents.filter(e => {
      if (e.date !== selectedDayStr) return false;
      if (filterType === 'all') return true;
      if (filterType === 'cleared') return e.isCollected;
      if (filterType === 'overdue') return e.isOverdue;
      if (filterType === 'due_later') return !e.isCollected && !e.isOverdue;
      return true;
    });
  }, [allEvents, selectedDayStr, filterType]);

  // Calendar Grid Days Calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const totalDaysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); 
    const startOffset = isAr ? (startDayOfWeek + 1) % 7 : startDayOfWeek;

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: CalendarEvent[];
      totalAmount: string;
    }> = [];

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = eventsByDate.get(dateStr) || [];
      const totalAmount = dayEvents.reduce((acc, e) => acc.plus(e.amount || 0), D(0)).toFixed(2);

      days.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        events: dayEvents,
        totalAmount
      });
    }

    return {
      startOffset,
      days
    };
  }, [currentYear, currentMonth, isAr, eventsByDate, todayStr]);

  const weekDayHeaders = useMemo(() => {
    if (isAr) {
      return ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    }
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }, [isAr]);

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(16, 22, 36, 0.85) 0%, rgba(10, 14, 24, 0.95) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderTop: '3px solid #d4af37',
      borderRadius: '16px',
      padding: '1.35rem 1.5rem',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem'
    }}>
      {/* Top Header: Title + Month Controls + View Switcher */}
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
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.22) 0%, rgba(212, 175, 55, 0.06) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d4af37'
          }}>
            <CalendarIcon size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
              {isAr ? 'التقويم المالي وجدول استحقاق الأقساط' : 'Monthly Financial & Installment Dues Calendar'}
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {isAr ? 'خريطة زمنية متكاملة لجميع استحقاقات وتدفقات الأقساط التعاقدية نقداً باليد' : 'Comprehensive timeline of contract installment dues and hand collections'}
            </span>
          </div>
        </div>

        {/* Center: Month Switcher Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          background: 'rgba(0, 0, 0, 0.45)',
          padding: '0.25rem 0.45rem',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
          >
            {isAr ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          <span style={{
            fontSize: '0.82rem',
            fontWeight: 800,
            color: '#ffffff',
            minWidth: '130px',
            textAlign: 'center',
            letterSpacing: '0.02em'
          }}>
            {monthFormatted}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
          >
            {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>

          <button
            type="button"
            onClick={handleJumpToToday}
            style={{
              background: 'rgba(212, 175, 55, 0.12)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              color: '#e2c974',
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: 'pointer',
              marginInlineStart: '0.25rem'
            }}
          >
            {isAr ? 'اليوم' : 'Today'}
          </button>
        </div>

        {/* Right: View Mode Toggle (Grid vs Timeline) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '0.2rem',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              border: viewMode === 'grid' ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid transparent',
              background: viewMode === 'grid' ? 'rgba(212, 175, 55, 0.18)' : 'transparent',
              color: viewMode === 'grid' ? '#ffffff' : '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <Grid size={13} />
            <span>{isAr ? 'شبكة التقويم' : 'Grid'}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              border: viewMode === 'timeline' ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid transparent',
              background: viewMode === 'timeline' ? 'rgba(212, 175, 55, 0.18)' : 'transparent',
              color: viewMode === 'timeline' ? '#ffffff' : '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <List size={13} />
            <span>{isAr ? 'الأجندة المتتالية' : 'Timeline'}</span>
          </button>
        </div>
      </div>

      {/* Monthly Hand Installments Telemetry Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.75rem'
      }}>
        {/* Tile 1: Total Projected Month Inflows */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '10px',
          padding: '0.75rem 0.95rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: '#e2c974', fontWeight: 700 }}>
              {isAr ? 'إجمالي أقساط الشهر المجدولة' : 'Projected Month Dues'}
            </span>
            <span style={{ fontSize: '0.65rem', color: '#e2c974', fontWeight: 800 }}>
              {monthStats.totalCount} {isAr ? 'قسط' : 'dues'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
              {formatMoney(monthStats.totalMonthValue)}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
        </div>

        {/* Tile 2: Collected in Safe */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '10px',
          padding: '0.75rem 0.95rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: '#6ee7b7', fontWeight: 700 }}>
              {isAr ? 'تم التحصيل باليد (بالخزينة)' : 'Collected by Hand'}
            </span>
            <span style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: 800 }}>
              {monthStats.collectedCount} {isAr ? 'محصل' : 'collected'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
              {formatMoney(monthStats.collectedSum)}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
        </div>

        {/* Tile 3: Due Later */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '10px',
          padding: '0.75rem 0.95rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: '#93c5fd', fontWeight: 700 }}>
              {isAr ? 'أقساط مستحقة لاحقاً باليد' : 'Due Later by Hand'}
            </span>
            <span style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 800 }}>
              {monthStats.pendingCount} {isAr ? 'قادم' : 'upcoming'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
              {formatMoney(monthStats.pendingSum)}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
        </div>

        {/* Tile 4: Overdue */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '10px',
          padding: '0.75rem 0.95rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: '#fca5a5', fontWeight: 700 }}>
              {isAr ? 'أقساط متأخرة عن موعدها' : 'Overdue Hand Dues'}
            </span>
            <span style={{ fontSize: '0.65rem', color: '#f87171', fontWeight: 800 }}>
              {monthStats.overdueCount} {isAr ? 'متأخر' : 'overdue'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171', fontFamily: 'monospace' }}>
              {formatMoney(monthStats.overdueSum)}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
        </div>
      </div>

      {/* Filter Category Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all', labelAr: 'كل الأقساط', labelEn: 'All Installments' },
          { id: 'cleared', labelAr: 'تم التحصيل باليد', labelEn: 'Collected', color: '#10b981' },
          { id: 'due_later', labelAr: 'مستحقة لاحقاً باليد', labelEn: 'Due Later', color: '#38bdf8' },
          { id: 'overdue', labelAr: 'متأخرة عن موعدها', labelEn: 'Overdue', color: '#ef4444' }
        ].map(chip => {
          const isActive = filterType === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilterType(chip.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.28rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                border: isActive ? '1px solid rgba(212, 175, 55, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isActive ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0, 0, 0, 0.3)',
                color: isActive ? '#ffffff' : '#94a3b8',
                cursor: 'pointer'
              }}
            >
              {chip.color && (
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: chip.color }} />
              )}
              <span>{isAr ? chip.labelAr : chip.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* VIEW 1: CALENDAR MATRIX GRID */}
      {viewMode === 'grid' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Calendar Grid Container */}
          <div style={{
            background: 'rgba(10, 14, 22, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {/* Week Days Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              background: 'rgba(0, 0, 0, 0.5)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '0.55rem 0',
              textAlign: 'center'
            }}>
              {weekDayHeaders.map((dayName, idx) => (
                <span key={idx} style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8' }}>
                  {dayName}
                </span>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '1px',
              background: 'rgba(255, 255, 255, 0.06)'
            }}>
              {/* Blank offset padding cells */}
              {Array.from({ length: calendarDays.startOffset }).map((_, idx) => (
                <div key={`blank_${idx}`} style={{ background: 'rgba(8, 11, 18, 0.95)', minHeight: '90px' }} />
              ))}

              {/* Month Day Cells */}
              {calendarDays.days.map(dayObj => {
                const isSelected = selectedDayStr === dayObj.dateStr;
                const hasEvents = dayObj.events.length > 0;

                return (
                  <div
                    key={dayObj.dateStr}
                    onClick={() => setSelectedDayStr(dayObj.dateStr)}
                    style={{
                      background: isSelected 
                        ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.16) 0%, rgba(14, 18, 28, 0.98) 100%)' 
                        : (dayObj.isToday ? 'rgba(212, 175, 55, 0.05)' : 'rgba(10, 14, 22, 0.98)'),
                      border: isSelected ? '1.5px solid #d4af37' : '1px solid transparent',
                      minHeight: '95px',
                      padding: '0.45rem 0.55rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = dayObj.isToday ? 'rgba(212, 175, 55, 0.05)' : 'rgba(10, 14, 22, 0.98)';
                      }
                    }}
                  >
                    {/* Day Number Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: dayObj.isToday ? 900 : 700,
                        color: dayObj.isToday ? '#d4af37' : (hasEvents ? '#ffffff' : '#64748b'),
                        fontFamily: 'monospace'
                      }}>
                        {dayObj.dayNumber}
                      </span>

                      {dayObj.isToday && (
                        <span style={{
                          fontSize: '0.58rem',
                          fontWeight: 800,
                          padding: '0.05rem 0.35rem',
                          borderRadius: '4px',
                          background: 'rgba(212, 175, 55, 0.25)',
                          color: '#e2c974',
                          border: '1px solid rgba(212, 175, 55, 0.4)'
                        }}>
                          {isAr ? 'اليوم' : 'Today'}
                        </span>
                      )}
                    </div>

                    {/* Day Event Badges */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.35rem' }}>
                      {dayObj.events.slice(0, 2).map((ev, evIdx) => (
                        <div
                          key={evIdx}
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '0.12rem 0.35rem',
                            borderRadius: '4px',
                            background: ev.isCollected
                              ? 'rgba(16, 185, 129, 0.2)'
                              : ev.isOverdue
                              ? 'rgba(239, 68, 68, 0.25)'
                              : 'rgba(56, 189, 248, 0.2)',
                            color: ev.isCollected
                              ? '#6ee7b7'
                              : ev.isOverdue
                              ? '#fca5a5'
                              : '#93c5fd',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={`${ev.title} (${formatMoney(ev.amount)} EGP)`}
                        >
                          {ev.title}
                        </div>
                      ))}

                      {dayObj.events.length > 2 && (
                        <span style={{ fontSize: '0.58rem', color: '#94a3b8', textAlign: 'center' }}>
                          +{dayObj.events.length - 2} {isAr ? 'أخرى' : 'more'}
                        </span>
                      )}
                    </div>

                    {/* Day Bottom Inflow Sum */}
                    {parseFloat(dayObj.totalAmount) > 0 ? (
                      <div style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        color: '#10b981',
                        fontFamily: 'monospace',
                        textAlign: isAr ? 'left' : 'right',
                        marginTop: '0.25rem'
                      }}>
                        +{formatMoney(dayObj.totalAmount)}
                      </div>
                    ) : (
                      <div style={{ height: '12px' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Detailed Schedule Drawer */}
          {selectedDayStr && (
            <div style={{
              background: 'linear-gradient(145deg, rgba(20, 26, 42, 0.95) 0%, rgba(12, 16, 26, 0.98) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '12px',
              padding: '1.15rem 1.35rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.07)', paddingBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} color="#d4af37" />
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#ffffff' }}>
                    {isAr ? `جدول استحقاقات أقساط يوم: ${selectedDayStr}` : `Installment Dues for: ${selectedDayStr}`}
                  </h4>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '4px',
                    background: 'rgba(212, 175, 55, 0.15)',
                    color: '#e2c974',
                    fontFamily: 'monospace'
                  }}>
                    {selectedDayEvents.length} {isAr ? 'أقساط' : 'dues'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDayStr(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', padding: '1.25rem 0' }}>
                  {isAr ? 'لا توجد أقساط تعاقدية مستحقة في هذا اليوم المختار.' : 'No contract installments due on this selected date.'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.65rem' }}>
                  {selectedDayEvents.map(ev => (
                    <div
                      key={ev.id}
                      style={{
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: ev.isCollected 
                          ? '1px solid rgba(16, 185, 129, 0.35)'
                          : ev.isOverdue 
                          ? '1px solid rgba(239, 68, 68, 0.4)' 
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '9px',
                        padding: '0.75rem 0.95rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <Wallet size={14} color="var(--zf-gold, #d4af37)" />
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff' }}>
                            {ev.title}
                          </span>
                        </div>
                        {ev.isCollected ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', fontWeight: 800, color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '0.12rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            <CheckCircle2 size={10} /> {isAr ? 'تم التحصيل باليد' : 'Collected'}
                          </span>
                        ) : ev.isOverdue ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', fontWeight: 800, color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', padding: '0.12rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            <AlertTriangle size={10} /> {isAr ? 'متأخر' : 'Overdue'}
                          </span>
                        ) : ev.statusKey === 'due_today' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', fontWeight: 800, color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '0.12rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                            <Clock size={10} /> {isAr ? 'يستحق اليوم' : 'Due Today'}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', fontWeight: 800, color: '#93c5fd', background: 'rgba(56, 189, 248, 0.15)', padding: '0.12rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                            <CalendarIcon size={10} /> {isAr ? 'مستحق لاحقاً' : 'Due Later'}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {ev.subtitle}
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '0.2rem',
                        paddingTop: '0.35rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.04)'
                      }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                          {formatMoney(ev.amount)} {isAr ? 'ج.م' : 'EGP'}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {!ev.isCollected && ev.rawEntity?.pdc && onCollectItem && (
                            <button
                              type="button"
                              onClick={() => onCollectItem(ev.rawEntity.pdc!)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.35) 100%)',
                                border: '1px solid rgba(16, 185, 129, 0.5)',
                                color: '#6ee7b7',
                                padding: '0.22rem 0.55rem',
                                borderRadius: '5px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              <Wallet size={11} />
                              <span>{isAr ? 'تحصيل نقداً باليد' : 'Collect Cash'}</span>
                            </button>
                          )}

                          {ev.rawEntity?.contract && (
                            <button
                              type="button"
                              onClick={() => onInspectContract(ev.rawEntity.contract!)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#cbd5e1',
                                padding: '0.22rem 0.45rem',
                                borderRadius: '5px',
                                fontSize: '0.66rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title={isAr ? 'معاينة ملف العقد' : 'Inspect Contract'}
                            >
                              <FileText size={11} />
                              <span>{isAr ? 'العقد' : 'Contract'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: TIMELINE AGENDA VIEW */}
      {viewMode === 'timeline' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxHeight: '480px',
          overflowY: 'auto',
          paddingInlineEnd: '0.35rem'
        }}>
          {monthEvents.length === 0 ? (
            <div style={{ fontSize: '0.82rem', color: '#64748b', textAlign: 'center', padding: '2rem 0' }}>
              {isAr ? 'لا توجد أقساط مجدولة في هذا الشهر.' : 'No installments scheduled in this month.'}
            </div>
          ) : (
            monthEvents.map(ev => (
              <div
                key={ev.id}
                style={{
                  background: 'rgba(12, 16, 25, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderInlineStart: ev.isCollected 
                    ? '3px solid #10b981' 
                    : (ev.isOverdue ? '3px solid #ef4444' : '3px solid #38bdf8'),
                  borderRadius: '10px',
                  padding: '0.85rem 1.15rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  {/* Date Badge */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '52px',
                    padding: '0.3rem 0.45rem',
                    borderRadius: '7px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>
                      {ev.date.split('-')[1]}/{ev.date.split('-')[0].slice(2)}
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                      {ev.date.split('-')[2]}
                    </span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff' }}>
                        {ev.title}
                      </span>
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '0.08rem 0.35rem',
                        borderRadius: '4px',
                        background: ev.isCollected ? 'rgba(16, 185, 129, 0.15)' : (ev.isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)'),
                        color: ev.isCollected ? '#34d399' : (ev.isOverdue ? '#f87171' : '#93c5fd')
                      }}>
                        {ev.status}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {ev.subtitle}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                      {formatMoney(ev.amount)}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {!ev.isCollected && ev.rawEntity?.pdc && onCollectItem && (
                      <button
                        type="button"
                        onClick={() => onCollectItem(ev.rawEntity.pdc!)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)',
                          border: '1px solid rgba(16, 185, 129, 0.45)',
                          color: '#6ee7b7',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        <Wallet size={12} />
                        <span>{isAr ? 'تحصيل باليد' : 'Collect'}</span>
                      </button>
                    )}

                    {ev.rawEntity?.contract && (
                      <button
                        type="button"
                        onClick={() => onInspectContract(ev.rawEntity.contract!)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#cbd5e1',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <span>{isAr ? 'العقد' : 'Contract'}</span>
                        <ArrowUpRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
