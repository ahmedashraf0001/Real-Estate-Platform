'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Landmark, 
  FileText, 
  ShieldCheck, 
  Clock, 
  ArrowUpRight, 
  DollarSign, 
  Layers, 
  List, 
  Grid, 
  CheckCircle2, 
  AlertCircle,
  X,
  Sparkles
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
  taxRecords: ERPTaxRecord[];
  onInspectCheque: (cheque: ERPPDCRecord) => void;
  onInspectContract: (contract: ERPContract) => void;
  onInspectTax: (tax: ERPTaxRecord) => void;
  isAr?: boolean;
  theme?: 'dark' | 'light';
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'cheque' | 'installment' | 'tax';
  title: string;
  subtitle: string;
  amount: string;
  status: string;
  isOverdue: boolean;
  rawEntity: any;
}

export const DashboardFinancialCalendar: React.FC<DashboardFinancialCalendarProps> = ({
  pdcRecords,
  contracts,
  schedules,
  taxRecords,
  onInspectCheque,
  onInspectContract,
  onInspectTax,
  isAr = false,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(() => new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'cheque' | 'installment' | 'tax'>('all');

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

  // Map all financial events across the system
  const allEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. PDC Cheques
    pdcRecords.forEach(pdc => {
      if (!pdc.due_date) return;
      const d = new Date(pdc.due_date);
      d.setHours(0, 0, 0, 0);
      const isOverdue = pdc.status === 'In Safe' && d < today;

      events.push({
        id: `cheque_${pdc.cheque_id}`,
        date: pdc.due_date,
        type: 'cheque',
        title: isAr ? `شيك #${pdc.cheque_number}` : `Cheque #${pdc.cheque_number}`,
        subtitle: `${pdc.bank_name} · ${pdc.drawer_name}`,
        amount: pdc.nominal_value,
        status: pdc.status,
        isOverdue,
        rawEntity: pdc
      });
    });

    // 2. Contract Installment Schedules
    schedules.forEach(schedule => {
      if (!schedule.due_date) return;
      const contract = contracts.find(c => c.contract_id === schedule.contract_id);
      if (contract && contract.status === 'Rescinded') return;

      const d = new Date(schedule.due_date);
      d.setHours(0, 0, 0, 0);
      const isOverdue = schedule.status === 'Pending' && d < today;

      const contractNum = contract ? contract.contract_number : 'N/A';
      const buyerName = contract ? contract.buyer_name : '';

      events.push({
        id: `schedule_${schedule.schedule_id}`,
        date: schedule.due_date,
        type: 'installment',
        title: isAr ? `قسط عقد ${contractNum}` : `Tranche ${schedule.tranche_number}`,
        subtitle: buyerName,
        amount: schedule.nominal_value,
        status: schedule.status,
        isOverdue,
        rawEntity: { schedule, contract }
      });
    });

    // 3. Tax Records
    taxRecords.forEach(tax => {
      const dateStr = tax.created_at ? tax.created_at.split('T')[0] : '';
      if (!dateStr) return;

      events.push({
        id: `tax_${tax.tax_id}`,
        date: dateStr,
        type: 'tax',
        title: tax.tax_type,
        subtitle: isAr ? 'مستحق لمصلحة الضرائب' : 'ETA Liability',
        amount: tax.tax_amount,
        status: tax.remittance_status,
        isOverdue: false,
        rawEntity: tax
      });
    });

    return events;
  }, [pdcRecords, schedules, contracts, taxRecords, isAr]);

  // Filter events for the current displayed month
  const monthEvents = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return allEvents.filter(e => {
      if (!e.date.startsWith(prefix)) return false;
      if (filterType === 'all') return true;
      return e.type === filterType;
    });
  }, [allEvents, currentYear, currentMonth, filterType]);

  // Aggregate stats for the current month
  const monthStats = useMemo(() => {
    const chequesInMonth = monthEvents.filter(e => e.type === 'cheque');
    const installmentsInMonth = monthEvents.filter(e => e.type === 'installment');

    const totalChequesValue = chequesInMonth.reduce((acc, c) => acc.plus(c.amount || 0), D(0));
    const totalInstallmentsValue = installmentsInMonth.reduce((acc, i) => acc.plus(i.amount || 0), D(0));
    const totalProjectedInflow = totalChequesValue.plus(totalInstallmentsValue);

    const clearedChequesCount = chequesInMonth.filter(c => c.status === 'Cleared').length;

    return {
      totalProjectedInflow: totalProjectedInflow.toFixed(2),
      totalChequesValue: totalChequesValue.toFixed(2),
      chequesCount: chequesInMonth.length,
      clearedChequesCount,
      totalInstallmentsValue: totalInstallmentsValue.toFixed(2),
      installmentsCount: installmentsInMonth.length
    };
  }, [monthEvents]);

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

  // Selected Day Events
  const selectedDayEvents = useMemo(() => {
    if (!selectedDayStr) return [];
    return allEvents.filter(e => e.date === selectedDayStr);
  }, [allEvents, selectedDayStr]);

  // Calendar Grid Days Calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const totalDaysInMonth = lastDayOfMonth.getDate();
    
    // In Arabic (Egypt/Middle East), week starts on Saturday (Day 6 of standard JS Date)
    // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
    let startDayOfWeek = firstDayOfMonth.getDay(); 
    // Shift so Saturday is index 0:
    // Saturday (6) -> 0
    // Sunday (0) -> 1
    // Monday (1) -> 2, etc.
    const startOffset = isAr ? (startDayOfWeek + 1) % 7 : startDayOfWeek;

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: CalendarEvent[];
      totalAmount: string;
    }> = [];

    // Days from current month
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
      background: isLight 
        ? '#ffffff' 
        : 'linear-gradient(180deg, rgba(16, 22, 36, 0.85) 0%, rgba(10, 14, 24, 0.95) 100%)',
      border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
      borderTop: isLight ? '3px solid #b48512' : '3px solid #d4af37',
      borderRadius: '16px',
      padding: '1.35rem 1.5rem',
      boxShadow: isLight ? '0 4px 20px rgba(15, 23, 42, 0.06)' : '0 8px 30px rgba(0, 0, 0, 0.5)',
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
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff' }}>
              {isAr ? 'التقويم المالي وجدول استحقاق الشيكات' : 'Monthly Financial & Cheque Maturity Calendar'}
            </h3>
            <span style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8' }}>
              {isAr ? 'خريطة زمنية متكاملة لجميع استحقاقات الشيكات وتدفقات الأقساط الشهرية' : 'Comprehensive timeline of cheque maturities and installment cashflows'}
            </span>
          </div>
        </div>

        {/* Center: Month Switcher Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          background: isLight ? '#f1f5f9' : 'rgba(0, 0, 0, 0.45)',
          padding: '0.25rem 0.45rem',
          borderRadius: '10px',
          border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)'
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
            fontSize: '0.86rem',
            fontWeight: 800,
            color: isLight ? '#0f172a' : '#ffffff',
            minWidth: '135px',
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
          background: isLight ? '#f1f5f9' : 'rgba(0, 0, 0, 0.4)',
          padding: '0.2rem',
          borderRadius: '8px',
          border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)'
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
              border: viewMode === 'grid' 
                ? (isLight ? '1px solid rgba(180, 133, 18, 0.4)' : '1px solid rgba(212, 175, 55, 0.4)') 
                : '1px solid transparent',
              background: viewMode === 'grid' 
                ? (isLight ? 'rgba(180, 133, 18, 0.16)' : 'rgba(212, 175, 55, 0.18)') 
                : 'transparent',
              color: viewMode === 'grid' ? (isLight ? '#0f172a' : '#ffffff') : (isLight ? '#64748b' : '#94a3b8'),
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
              border: viewMode === 'timeline' 
                ? (isLight ? '1px solid rgba(180, 133, 18, 0.4)' : '1px solid rgba(212, 175, 55, 0.4)') 
                : '1px solid transparent',
              background: viewMode === 'timeline' 
                ? (isLight ? 'rgba(180, 133, 18, 0.16)' : 'rgba(212, 175, 55, 0.18)') 
                : 'transparent',
              color: viewMode === 'timeline' ? (isLight ? '#0f172a' : '#ffffff') : (isLight ? '#64748b' : '#94a3b8'),
              cursor: 'pointer'
            }}
          >
            <List size={13} />
            <span>{isAr ? 'الأجندة المتتالية' : 'Timeline'}</span>
          </button>
        </div>
      </div>

      {/* Monthly Summary Telemetry Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.75rem'
      }}>
        {/* Tile 1: Projected Month Inflow */}
        <div style={{
          background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.35)',
          border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '10px',
          padding: '0.75rem 0.95rem'
        }}>
          <span style={{ fontSize: '0.68rem', color: isLight ? '#b48512' : '#e2c974', fontWeight: 700, display: 'block' }}>
            {isAr ? 'إجمالي التدفقات المتوقعة للشهر' : 'Projected Inflows'}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff', fontFamily: 'monospace' }}>
              {formatMoney(monthStats.totalProjectedInflow)}
            </span>
            <span style={{ fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8' }}>{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
        </div>

        {/* Tile 2: Cheques in Safe this month */}
        <div style={{
          background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.35)',
          border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '0.75rem 0.95rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 700 }}>
              {isAr ? 'شيكات تستحق هذا الشهر' : 'PDCs Due This Month'}
            </span>
            <span style={{ fontSize: '0.65rem', color: isLight ? '#b48512' : '#e2c974', fontWeight: 800 }}>
              {monthStats.chequesCount} {isAr ? 'شيك' : 'cheques'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: isLight ? '#0f172a' : '#cbd5e1', fontFamily: 'monospace' }}>
              {formatMoney(monthStats.totalChequesValue)}
            </span>
            <span style={{ fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8' }}>{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
        </div>

        {/* Tile 3: Installments scheduled */}
        <div style={{
          background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.35)',
          border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '0.75rem 0.95rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 700 }}>
              {isAr ? 'أقساط مجدولة للتحصيل' : 'Installments Scheduled'}
            </span>
            <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 800 }}>
              {monthStats.installmentsCount} {isAr ? 'قسط' : 'tranches'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: isLight ? '#0f172a' : '#cbd5e1', fontFamily: 'monospace' }}>
              {formatMoney(monthStats.totalInstallmentsValue)}
            </span>
            <span style={{ fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8' }}>{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
        </div>
      </div>

      {/* Filter Category Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all', labelAr: 'كل الاستحقاقات', labelEn: 'All Events' },
          { id: 'cheque', labelAr: 'شيكات مؤجلة (PDC)', labelEn: 'PDC Cheques', color: '#d4af37' },
          { id: 'installment', labelAr: 'أقساط تعاقدية', labelEn: 'Installments', color: '#10b981' },
          { id: 'tax', labelAr: 'استحقاقات ضرائب', labelEn: 'Tax Liabilities', color: '#3b82f6' }
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
                border: isActive 
                  ? (isLight ? '1px solid rgba(180, 133, 18, 0.45)' : '1px solid rgba(212, 175, 55, 0.45)') 
                  : (isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.08)'),
                background: isActive 
                  ? (isLight ? 'rgba(180, 133, 18, 0.15)' : 'rgba(212, 175, 55, 0.15)') 
                  : (isLight ? '#f1f5f9' : 'rgba(0, 0, 0, 0.3)'),
                color: isActive ? (isLight ? '#b48512' : '#ffffff') : (isLight ? '#475569' : '#94a3b8'),
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
            background: isLight ? '#ffffff' : 'rgba(10, 14, 22, 0.9)',
            border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {/* Week Days Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.5)',
              borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
              padding: '0.55rem 0',
              textAlign: 'center'
            }}>
              {weekDayHeaders.map((dayName, idx) => (
                <span key={idx} style={{ fontSize: '0.74rem', fontWeight: 800, color: isLight ? '#475569' : '#94a3b8' }}>
                  {dayName}
                </span>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '1px',
              background: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.06)'
            }}>
              {/* Blank offset padding cells */}
              {Array.from({ length: calendarDays.startOffset }).map((_, idx) => (
                <div key={`blank_${idx}`} style={{ background: isLight ? '#f8fafc' : 'rgba(8, 11, 18, 0.95)', minHeight: '90px' }} />
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
                        ? (isLight ? 'rgba(180, 133, 18, 0.12)' : 'linear-gradient(145deg, rgba(212, 175, 55, 0.16) 0%, rgba(14, 18, 28, 0.98) 100%)') 
                        : (dayObj.isToday ? (isLight ? 'rgba(180, 133, 18, 0.08)' : 'rgba(212, 175, 55, 0.05)') : (isLight ? '#ffffff' : 'rgba(10, 14, 22, 0.98)')),
                      border: isSelected ? (isLight ? '1.5px solid #b48512' : '1.5px solid #d4af37') : '1px solid transparent',
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
                      if (!isSelected) e.currentTarget.style.background = isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = dayObj.isToday ? (isLight ? 'rgba(180, 133, 18, 0.08)' : 'rgba(212, 175, 55, 0.05)') : (isLight ? '#ffffff' : 'rgba(10, 14, 22, 0.98)');
                      }
                    }}
                  >
                    {/* Day Number Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: dayObj.isToday ? 900 : 700,
                        color: dayObj.isToday ? (isLight ? '#b48512' : '#d4af37') : (hasEvents ? (isLight ? '#0f172a' : '#ffffff') : '#64748b'),
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
                            background: ev.type === 'cheque' 
                              ? (ev.isOverdue ? 'rgba(239, 68, 68, 0.25)' : 'rgba(212, 175, 55, 0.2)') 
                              : (ev.type === 'installment' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'),
                            color: ev.type === 'cheque' 
                              ? (ev.isOverdue ? '#fca5a5' : '#e2c974') 
                              : (ev.type === 'installment' ? '#6ee7b7' : '#93c5fd'),
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
              background: isLight 
                ? '#ffffff' 
                : 'linear-gradient(145deg, rgba(20, 26, 42, 0.95) 0%, rgba(12, 16, 26, 0.98) 100%)',
              border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '12px',
              padding: '1.15rem 1.35rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              boxShadow: isLight ? '0 4px 20px rgba(15, 23, 42, 0.08)' : '0 4px 20px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.07)', paddingBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} color={isLight ? '#b48512' : '#d4af37'} />
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff' }}>
                    {isAr ? `جدول استحقاقات يوم: ${selectedDayStr}` : `Schedule for: ${selectedDayStr}`}
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
                    {selectedDayEvents.length} {isAr ? 'عنصر' : 'items'}
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
                  {isAr ? 'لا توجد شيكات أو أقساط مستحقة في هذا اليوم المختار.' : 'No cheques or installment dues on this selected date.'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.65rem' }}>
                  {selectedDayEvents.map(ev => (
                    <div
                      key={ev.id}
                      style={{
                        background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.4)',
                        border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '9px',
                        padding: '0.75rem 0.95rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          {ev.type === 'cheque' && <Landmark size={14} color={isLight ? '#b48512' : '#e2c974'} />}
                          {ev.type === 'installment' && <FileText size={14} color="#6ee7b7" />}
                          {ev.type === 'tax' && <ShieldCheck size={14} color="#93c5fd" />}
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff' }}>
                            {ev.title}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#94a3b8' }}>
                          {ev.status}
                        </span>
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
                        borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.04)'
                      }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff', fontFamily: 'monospace' }}>
                          {formatMoney(ev.amount)} {isAr ? 'ج.م' : 'EGP'}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            if (ev.type === 'cheque') onInspectCheque(ev.rawEntity);
                            else if (ev.type === 'installment') ev.rawEntity.contract && onInspectContract(ev.rawEntity.contract);
                            else if (ev.type === 'tax') onInspectTax(ev.rawEntity);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            background: 'rgba(212, 175, 55, 0.12)',
                            border: '1px solid rgba(212, 175, 55, 0.35)',
                            color: '#e2c974',
                            padding: '0.22rem 0.5rem',
                            borderRadius: '5px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <span>{isAr ? 'فحص ومعاينة' : 'Inspect'}</span>
                          <ArrowUpRight size={11} />
                        </button>
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
              {isAr ? 'لا توجد استحقاقات مالية مجدولة في هذا الشهر.' : 'No financial dues scheduled in this month.'}
            </div>
          ) : (
            monthEvents.map(ev => (
              <div
                key={ev.id}
                style={{
                  background: isLight ? '#ffffff' : 'rgba(12, 16, 25, 0.8)',
                  border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderInlineStart: ev.type === 'cheque' 
                    ? (isLight ? '3px solid #b48512' : '3px solid #d4af37') 
                    : (ev.type === 'installment' ? '3px solid #10b981' : '3px solid #3b82f6'),
                  borderRadius: '10px',
                  padding: '0.85rem 1.15rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  boxShadow: isLight ? '0 2px 8px rgba(15, 23, 42, 0.05)' : '0 2px 8px rgba(0, 0, 0, 0.3)'
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
                    background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.04)',
                    border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <span style={{ fontSize: '0.62rem', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 600 }}>
                      {ev.date.split('-')[1]}/{ev.date.split('-')[0].slice(2)}
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff', fontFamily: 'monospace' }}>
                      {ev.date.split('-')[2]}
                    </span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff' }}>
                        {ev.title}
                      </span>
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '0.08rem 0.35rem',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: '#94a3b8'
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

                  <button
                    type="button"
                    onClick={() => {
                      if (ev.type === 'cheque') onInspectCheque(ev.rawEntity);
                      else if (ev.type === 'installment') ev.rawEntity.contract && onInspectContract(ev.rawEntity.contract);
                      else if (ev.type === 'tax') onInspectTax(ev.rawEntity);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'rgba(212, 175, 55, 0.12)',
                      border: '1px solid rgba(212, 175, 55, 0.35)',
                      color: '#e2c974',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <span>{isAr ? 'فحص' : 'Inspect'}</span>
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
