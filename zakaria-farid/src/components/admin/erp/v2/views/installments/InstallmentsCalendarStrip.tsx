'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw
} from 'lucide-react';
import { 
  ProjectedVaultItem,
  formatYMD,
  toLocalDateStr,
  getLocalTodayStr
} from '@/lib/erp/installmentsVaultProjection';
import { D } from '@/lib/erp/math';

interface InstallmentsCalendarStripProps {
  items: ProjectedVaultItem[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  isAr?: boolean;
  borderless?: boolean;
}

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ENGLISH_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];
const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const InstallmentsCalendarStrip: React.FC<InstallmentsCalendarStripProps> = ({
  items,
  selectedDate,
  onSelectDate,
  isAr = true,
  borderless = false
}) => {
  // Calendar mode: 'strip' (7-day week) vs 'month' (full month grid)
  const [calendarMode, setCalendarMode] = useState<'strip' | 'month'>('strip');

  // Stable reference today date in local timezone
  const [todayStr] = useState<string>(() => getLocalTodayStr());

  // Current viewed year/month (defaults to current date)
  const [viewDate, setViewDate] = useState<Date>(() => new Date());

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Aggregate items by due date (YYYY-MM-DD)
  const duesByDate = useMemo(() => {
    const map = new Map<string, {
      count: number;
      total: number;
      hasOverdue: boolean;
      hasDue: boolean;
      hasDeposited: boolean;
      hasCleared: boolean;
      items: ProjectedVaultItem[];
    }>();

    for (const item of items) {
      const d = item.dueDate;
      if (!d) continue;
      const prev = map.get(d) || {
        count: 0,
        total: 0,
        hasOverdue: false,
        hasDue: false,
        hasDeposited: false,
        hasCleared: false,
        items: []
      };

      prev.count += 1;
      prev.total += D(item.nominalValue || '0').toNumber();
      if (item.status === 'overdue') prev.hasOverdue = true;
      if (item.status === 'due_today' || item.status === 'upcoming') prev.hasDue = true;
      if (item.status === 'deposited') prev.hasDeposited = true;
      if (item.status === 'cleared') prev.hasCleared = true;
      prev.items.push(item);

      map.set(d, prev);
    }

    return map;
  }, [items]);

  // Compute 7 days for the strip mode based on viewDate
  const stripDays = useMemo(() => {
    const days: { dateStr: string; dayNum: number; dayName: string; isToday: boolean }[] = [];
    const base = new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate());
    // Align to start of week (Sunday)
    const dayOfWeek = base.getDay();
    base.setDate(base.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const dateStr = toLocalDateStr(d);
      days.push({
        dateStr,
        dayNum: d.getDate(),
        dayName: isAr ? ARABIC_DAYS[d.getDay()] : ENGLISH_DAYS[d.getDay()],
        isToday: dateStr === todayStr
      });
    }

    return days;
  }, [viewDate, todayStr, isAr]);

  // Compute all days in the full month
  const monthDays = useMemo(() => {
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay();
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const dateStr = formatYMD(currentYear, currentMonth - 1, dayNum);
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateStr = formatYMD(currentYear, currentMonth, i);
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // Trailing days padding to complete grid rows
    const remainder = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainder; i++) {
      const dateStr = formatYMD(currentYear, currentMonth + 1, i);
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    return days;
  }, [currentYear, currentMonth, todayStr]);

  const handlePrev = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      if (calendarMode === 'strip') {
        d.setDate(d.getDate() - 7);
      } else {
        d.setMonth(d.getMonth() - 1);
      }
      return d;
    });
  };

  const handleNext = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      if (calendarMode === 'strip') {
        d.setDate(d.getDate() + 7);
      } else {
        d.setMonth(d.getMonth() + 1);
      }
      return d;
    });
  };

  const handleGoToday = () => {
    setViewDate(new Date());
    onSelectDate(todayStr);
  };

  const monthLabel = isAr 
    ? `${ARABIC_MONTHS[currentMonth]} ${currentYear}`
    : `${ENGLISH_MONTHS[currentMonth]} ${currentYear}`;

  return (
    <div style={{
      background: borderless ? 'transparent' : '#ffffff',
      border: borderless ? 'none' : '1px solid #cbd5e1',
      borderRadius: borderless ? '0' : '12px',
      padding: borderless ? '0.2rem 0' : '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
      boxShadow: 'none',
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box'
    }}>
      {/* 1. TOP CONTROLS BAR: Mode Toggle & Navigation */}
      <div style={{
        display: 'flex',
        flexDirection: borderless ? 'column' : 'row',
        alignItems: borderless ? 'stretch' : 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.45rem',
        width: '100%'
      }}>
        {/* Leading: Month Title and Navigation Arrows */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: borderless ? '100%' : 'auto',
          gap: '0.35rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            {/* Previous Period */}
            <button
              type="button"
              onClick={handlePrev}
              title={isAr ? 'الفترة السابقة' : 'Previous period'}
              aria-label={isAr ? 'الفترة السابقة' : 'Previous period'}
              style={{
                width: borderless ? '24px' : '28px',
                height: borderless ? '24px' : '28px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <span style={{
              fontSize: borderless ? '0.82rem' : '0.92rem',
              fontWeight: 800,
              color: '#0f172a',
              minWidth: borderless ? '105px' : '130px',
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap'
            }}>
              {monthLabel}
            </span>

            {/* Next Period */}
            <button
              type="button"
              onClick={handleNext}
              title={isAr ? 'الفترة التالية' : 'Next period'}
              aria-label={isAr ? 'الفترة التالية' : 'Next period'}
              style={{
                width: borderless ? '24px' : '28px',
                height: borderless ? '24px' : '28px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>

          {/* Mode Switcher on top row when borderless */}
          {borderless && (
            <div style={{
              display: 'inline-flex',
              padding: '2px',
              background: '#f1f5f9',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              flexShrink: 0
            }}>
              <button
                type="button"
                onClick={() => setCalendarMode('strip')}
                style={{
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  border: 'none',
                  background: calendarMode === 'strip' ? '#ffffff' : 'transparent',
                  color: calendarMode === 'strip' ? '#0f172a' : '#64748b',
                  fontWeight: calendarMode === 'strip' ? 800 : 600,
                  fontSize: '0.70rem',
                  cursor: 'pointer',
                  boxShadow: calendarMode === 'strip' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {isAr ? 'أسبوع' : 'Week'}
              </button>
              <button
                type="button"
                onClick={() => setCalendarMode('month')}
                style={{
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  border: 'none',
                  background: calendarMode === 'month' ? '#ffffff' : 'transparent',
                  color: calendarMode === 'month' ? '#0f172a' : '#64748b',
                  fontWeight: calendarMode === 'month' ? 800 : 600,
                  fontSize: '0.70rem',
                  cursor: 'pointer',
                  boxShadow: calendarMode === 'month' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {isAr ? 'شهر' : 'Month'}
              </button>
            </div>
          )}
        </div>

        {/* Sub-row: Today Jump & Filter Clear */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: borderless ? 'space-between' : 'flex-start',
          gap: '0.35rem',
          width: borderless ? '100%' : 'auto'
        }}>
          <button
            type="button"
            onClick={handleGoToday}
            style={{
              padding: borderless ? '0.2rem 0.55rem' : '0.28rem 0.65rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: 'var(--erp-accent, #2563eb)',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isAr ? 'اليوم' : 'Today'}
          </button>

          {selectedDate && (
            <button
              type="button"
              onClick={() => onSelectDate(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: borderless ? '0.2rem 0.55rem' : '0.28rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid rgba(220, 38, 38, 0.25)',
                background: 'rgba(220, 38, 38, 0.05)',
                color: '#dc2626',
                fontSize: '0.70rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={11} />
              <span>{isAr ? `تصفية: ${selectedDate} (إلغاء)` : `Filtered: ${selectedDate} (Clear)`}</span>
            </button>
          )}

          {!borderless && (
            /* Mode Switcher when in standalone wide mode */
            <div style={{
              display: 'inline-flex',
              padding: '2px',
              background: '#f1f5f9',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginInlineStart: 'auto'
            }}>
              <button
                type="button"
                onClick={() => setCalendarMode('strip')}
                style={{
                  padding: '0.3rem 0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: calendarMode === 'strip' ? '#ffffff' : 'transparent',
                  color: calendarMode === 'strip' ? '#0f172a' : '#64748b',
                  fontWeight: calendarMode === 'strip' ? 800 : 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  boxShadow: calendarMode === 'strip' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {isAr ? 'أسبوع' : 'Week'}
              </button>
              <button
                type="button"
                onClick={() => setCalendarMode('month')}
                style={{
                  padding: '0.3rem 0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: calendarMode === 'month' ? '#ffffff' : 'transparent',
                  color: calendarMode === 'month' ? '#0f172a' : '#64748b',
                  fontWeight: calendarMode === 'month' ? 800 : 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  boxShadow: calendarMode === 'month' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {isAr ? 'شهر' : 'Month'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. CALENDAR BODY: WEEK STRIP MODE */}
      {calendarMode === 'strip' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: '0.3rem',
          width: '100%'
        }}>
          {stripDays.map((day) => {
            const data = duesByDate.get(day.dateStr);
            const isSelected = selectedDate === day.dateStr;

            return (
              <div
                key={day.dateStr}
                onClick={() => onSelectDate(isSelected ? null : day.dateStr)}
                role="button"
                tabIndex={0}
                style={{
                  background: isSelected ? 'var(--erp-accent-subtle, #eff6ff)' : '#f8fafc',
                  border: isSelected 
                    ? '1.5px solid var(--erp-accent, #2563eb)' 
                    : day.isToday 
                      ? '1px solid var(--erp-accent, #2563eb)' 
                      : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.45rem 0.2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.15rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  minWidth: 0
                }}
              >
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                  {day.dayName}
                </span>

                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  background: day.isToday ? 'var(--erp-accent, #2563eb)' : 'transparent',
                  color: day.isToday ? '#ffffff' : '#0f172a'
                }}>
                  {day.dayNum}
                </div>

                {/* Day Telemetry Indicators */}
                {data && data.count > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%', marginTop: '0.15rem' }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: data.hasOverdue ? '#dc2626' : '#0f172a',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%'
                    }}>
                      {data.total >= 1000 ? `${(data.total / 1000).toFixed(0)}k` : data.total} {isAr ? 'ج.م' : ''}
                    </span>

                    {/* Status micro-indicators */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {data.hasOverdue && (
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#dc2626' }} title={isAr ? 'متأخرات' : 'Overdue'} />
                      )}
                      {data.hasDue && (
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#d97706' }} title={isAr ? 'مستحق' : 'Due'} />
                      )}
                      {data.hasDeposited && (
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2563eb' }} title={isAr ? 'مودع' : 'Deposited'} />
                      )}
                      {data.hasCleared && (
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a' }} title={isAr ? 'محصل' : 'Cleared'} />
                      )}
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.66rem', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>—</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. CALENDAR BODY: FULL MONTH GRID MODE */}
      {calendarMode === 'month' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
          {/* Day of week headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: '0.35rem',
            textAlign: 'center',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#64748b',
            paddingBottom: '0.25rem'
          }}>
            {(isAr ? ARABIC_DAYS : ENGLISH_DAYS).map(d => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Month days grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: '0.35rem',
            width: '100%'
          }}>
            {monthDays.map((day) => {
              const data = duesByDate.get(day.dateStr);
              const isSelected = selectedDate === day.dateStr;

              return (
                <div
                  key={day.dateStr}
                  onClick={() => onSelectDate(isSelected ? null : day.dateStr)}
                  role="button"
                  tabIndex={0}
                  style={{
                    background: isSelected 
                      ? 'var(--erp-accent-subtle, #eff6ff)' 
                      : day.isCurrentMonth ? '#f8fafc' : '#ffffff',
                    border: isSelected 
                      ? '1.5px solid var(--erp-accent, #2563eb)' 
                      : day.isToday 
                        ? '1px solid var(--erp-accent, #2563eb)' 
                        : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.45rem 0.35rem',
                    minHeight: '52px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    opacity: day.isCurrentMonth ? 1 : 0.45
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '0.76rem',
                      fontWeight: day.isToday || isSelected ? 800 : 600,
                      color: day.isToday ? 'var(--erp-accent, #2563eb)' : '#0f172a',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {day.dayNum}
                    </span>

                    {data && data.count > 0 && (
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '1px 4px',
                        borderRadius: '4px',
                        background: data.hasOverdue ? '#fef2f2' : '#f1f5f9',
                        color: data.hasOverdue ? '#dc2626' : '#475569',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {data.count}
                      </span>
                    )}
                  </div>

                  {data && data.count > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                      <span style={{
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        color: data.hasOverdue ? '#dc2626' : '#475569',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {data.total >= 1000 ? `${(data.total / 1000).toFixed(0)}k` : data.total}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {data.hasOverdue && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#dc2626' }} />}
                        {data.hasDue && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#d97706' }} />}
                        {data.hasDeposited && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#2563eb' }} />}
                        {data.hasCleared && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#16a34a' }} />}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
