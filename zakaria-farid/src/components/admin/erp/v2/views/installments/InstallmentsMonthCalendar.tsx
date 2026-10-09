'use client';

import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { UnifiedAgendaRow, getCalendarDayBuckets } from '@/lib/erp/agendaRows';
import { formatYMD, getLocalTodayStr } from '@/lib/erp/installmentsVaultProjection';

interface InstallmentsMonthCalendarProps {
  rows: UnifiedAgendaRow[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  isAr?: boolean;
  onInspectItem?: (id: string) => void;
}

const ARABIC_DAYS_SAT_TO_FRI = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];
const ENGLISH_DAYS_SAT_TO_FRI = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];
const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatNoDecimals(amount: any): string {
  const num = typeof amount === 'number' ? amount : (amount?.toNumber ? amount.toNumber() : parseFloat(String(amount) || '0'));
  if (isNaN(num)) return '0';
  return Math.round(num).toLocaleString('en-US');
}

export const InstallmentsMonthCalendar: React.FC<InstallmentsMonthCalendarProps> = ({
  rows,
  selectedDate,
  onSelectDate,
  isAr = true,
  onInspectItem
}) => {
  const todayStr = useMemo(() => getLocalTodayStr(), []);
  const [mode, setMode] = useState<'month' | 'week'>('month');

  // Month navigation: view year and month
  const [viewDate, setViewDate] = useState<Date>(() => {
    const [y, m] = todayStr.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  // Pre-index rows by dueDate for fast lookup
  const rowsByDate = useMemo(() => {
    const map = new Map<string, UnifiedAgendaRow[]>();
    for (const r of rows) {
      if (!r.dueDate) continue;
      const list = map.get(r.dueDate) || [];
      list.push(r);
      map.set(r.dueDate, list);
    }
    return map;
  }, [rows]);

  // Compute month grid days (Sat..Fri, RTL)
  const monthDays = useMemo(() => {
    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    const firstDayDow = new Date(viewYear, viewMonth, 1).getDay();
    // Saturday is column 0: (dow + 1) % 7
    const leadingDaysCount = (firstDayDow + 1) % 7;

    const prevMonthLastDate = new Date(viewYear, viewMonth, 0).getDate();
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;

    for (let i = leadingDaysCount - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDate - i;
      const dateStr = formatYMD(prevYear, prevMonth, dayNum);
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
      });
    }

    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const dateStr = formatYMD(viewYear, viewMonth, dayNum);
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
      });
    }

    const trailingCount = (7 - (days.length % 7)) % 7;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;

    for (let dayNum = 1; dayNum <= trailingCount; dayNum++) {
      const dateStr = formatYMD(nextYear, nextMonth, dayNum);
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
      });
    }

    return days;
  }, [viewYear, viewMonth, todayStr, selectedDate]);

  // Compute single week days (Sat..Fri) around selectedDate or todayStr
  const weekDays = useMemo(() => {
    const anchorStr = selectedDate || todayStr;
    const [y, m, d] = anchorStr.split('-').map(Number);
    const anchorDate = new Date(y, m - 1, d);
    const dow = anchorDate.getDay();
    const satOffset = (dow + 1) % 7;

    const satDate = new Date(anchorDate);
    satDate.setDate(anchorDate.getDate() - satOffset);

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const cur = new Date(satDate);
      cur.setDate(satDate.getDate() + i);
      const dateStr = formatYMD(cur.getFullYear(), cur.getMonth(), cur.getDate());
      days.push({
        dateStr,
        dayNum: cur.getDate(),
        isCurrentMonth: cur.getMonth() === viewMonth,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
      });
    }

    return days;
  }, [selectedDate, todayStr, viewMonth]);

  const displayedDays = mode === 'month' ? monthDays : weekDays;

  // Active day details for the bottom list
  const activeDetailDate = selectedDate || todayStr;
  const activeDayBucket = useMemo(() => {
    const dayRows = rowsByDate.get(activeDetailDate) || [];
    return getCalendarDayBuckets(dayRows, activeDetailDate, todayStr);
  }, [rowsByDate, activeDetailDate, todayStr]);

  const monthLabel = isAr
    ? `${ARABIC_MONTHS[viewMonth]} ${viewYear}`
    : `${ENGLISH_MONTHS[viewMonth]} ${viewYear}`;

  const dayHeaders = isAr ? ARABIC_DAYS_SAT_TO_FRI : ENGLISH_DAYS_SAT_TO_FRI;

  return (
    <div style={{
      background: 'var(--erp-bg-panel)',
      borderRadius: '10px',
      fontSize: '12px',
      color: 'var(--erp-text-body)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {/* 1. Header: Title + Mode Toggle (أسبوع / شهر) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: 'var(--erp-accent-subtle)',
            color: 'var(--erp-accent)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700
          }}>
            ▦
          </span>
          <b style={{ color: 'var(--erp-text-title)', fontSize: '0.82rem' }}>
            {isAr ? 'تقويم المستحقات' : 'Dues Calendar'}
          </b>
        </div>

        {/* Week / Month Segmented Switch */}
        <div style={{
          display: 'inline-flex',
          border: '1px solid var(--erp-border)',
          borderRadius: '7px',
          overflow: 'hidden',
          background: 'var(--erp-bg-panel)'
        }}>
          <button
            type="button"
            onClick={() => setMode('week')}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              border: 'none',
              background: mode === 'week' ? 'var(--erp-accent-subtle)' : 'transparent',
              color: mode === 'week' ? 'var(--erp-accent)' : 'var(--erp-text-muted)',
              fontWeight: mode === 'week' ? 700 : 500,
              cursor: 'pointer'
            }}
          >
            {isAr ? 'أسبوع' : 'Week'}
          </button>
          <button
            type="button"
            onClick={() => setMode('month')}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              border: 'none',
              borderInlineStart: '1px solid var(--erp-card-border)',
              background: mode === 'month' ? 'var(--erp-accent-subtle)' : 'transparent',
              color: mode === 'month' ? 'var(--erp-accent)' : 'var(--erp-text-muted)',
              fontWeight: mode === 'month' ? 700 : 500,
              cursor: 'pointer'
            }}
          >
            {isAr ? 'شهر' : 'Month'}
          </button>
        </div>
      </div>

      {/* 2. Month Nav: ‹ Month Year › */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '2px 0'
      }}>
        <button
          type="button"
          onClick={handlePrevMonth}
          aria-label={isAr ? 'الشهر السابق' : 'Previous Month'}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--erp-text-muted)',
            cursor: 'pointer',
            padding: '2px 4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {isAr ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>

        <b style={{ color: 'var(--erp-text-title)', fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>
          {monthLabel}
        </b>

        <button
          type="button"
          onClick={handleNextMonth}
          aria-label={isAr ? 'الشهر التالي' : 'Next Month'}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--erp-text-muted)',
            cursor: 'pointer',
            padding: '2px 4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {isAr ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>

      {/* 3. Grid: Sat..Fri */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px',
        textAlign: 'center',
        fontSize: '11px'
      }}>
        {dayHeaders.map(dayName => (
          <div
            key={dayName}
            style={{
              color: 'var(--erp-text-subtle)',
              fontSize: '10px',
              padding: '3px 0',
              fontWeight: 600
            }}
          >
            {dayName}
          </div>
        ))}

        {displayedDays.map(cell => {
          const dayItems = rowsByDate.get(cell.dateStr) || [];
          const bucket = getCalendarDayBuckets(dayItems, cell.dateStr, todayStr);

          let cellBg = 'transparent';
          if (cell.isSelected) cellBg = 'var(--erp-accent-subtle)';

          let cellBorder = '1px solid transparent';
          if (cell.isToday) cellBorder = '1px solid var(--erp-accent)';
          if (cell.isSelected) cellBorder = '1px solid var(--erp-accent)';

          let textColor = cell.isCurrentMonth ? 'var(--erp-text-title)' : 'var(--erp-border)';
          if (cell.isToday) textColor = 'var(--erp-accent)';

          return (
            <button
              type="button"
              key={cell.dateStr}
              onClick={() => onSelectDate(cell.dateStr === selectedDate ? null : cell.dateStr)}
              style={{
                background: cellBg,
                border: cellBorder,
                borderRadius: '6px',
                padding: '4px 0 6px',
                position: 'relative',
                color: textColor,
                cursor: 'pointer',
                fontWeight: cell.isToday || cell.isSelected ? 700 : 500,
                fontVariantNumeric: 'tabular-nums',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                minHeight: '34px'
              }}
            >
              <span>{cell.dayNum}</span>

              {/* Up to 3 Dots: incoming (success), outgoing (danger), overdue (amber) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                minHeight: '4px'
              }}>
                {bucket.dots.map(dot => {
                  let bg = 'var(--erp-success)';
                  if (dot === 'out') bg = 'var(--erp-danger)';
                  if (dot === 'late') bg = 'var(--erp-warning)';

                  return (
                    <span
                      key={dot}
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: bg,
                        display: 'block'
                      }}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {/* 4. Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '11px',
        color: 'var(--erp-text-muted)',
        padding: '4px 0',
        borderBottom: '1px solid var(--erp-border-subtle)'
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--erp-success)' }} />
          <span>{isAr ? 'وارد' : 'In'}</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--erp-danger)' }} />
          <span>{isAr ? 'صادر' : 'Out'}</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--erp-warning)' }} />
          <span>{isAr ? 'متأخر' : 'Late'}</span>
        </span>
      </div>

      {/* 5. Day Dues List & Day Net */}
      <div style={{ paddingTop: '4px' }}>
        <div style={{
          fontSize: '11.5px',
          fontWeight: 700,
          color: 'var(--erp-text-title)',
          marginBottom: '6px',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {activeDetailDate === todayStr 
            ? (isAr ? `اليوم (${activeDetailDate})` : `Today (${activeDetailDate})`)
            : (isAr ? `تاريخ (${activeDetailDate})` : `Date (${activeDetailDate})`)}
        </div>

        {activeDayBucket.items.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {activeDayBucket.items.map(item => {
                const isInflow = item.direction === 'in';
                const sign = isInflow ? '+' : '−';
                const color = isInflow ? 'var(--erp-success)' : 'var(--erp-danger)';
                const arrow = isInflow ? '↓' : '↑';
                const shortDesc = item.description || (item.direction === 'out' ? item.costCategoryLabel : '');

                return (
                  <div
                    key={item.id}
                    onClick={isInflow && onInspectItem ? () => onInspectItem(item.id) : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 6px',
                      borderRadius: '6px',
                      background: 'var(--erp-bg-panel)',
                      border: '1px solid var(--erp-border-subtle)',
                      fontSize: '11.5px',
                      cursor: isInflow && onInspectItem ? 'pointer' : 'default'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, marginInlineEnd: '6px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--erp-text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span>{arrow} </span>
                        <span>{item.party}</span>
                      </div>
                      {shortDesc && (
                        <div style={{ fontSize: '10px', color: 'var(--erp-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {shortDesc}
                        </div>
                      )}
                    </div>

                    <b style={{
                      color,
                      fontSize: '11.5px',
                      fontVariantNumeric: 'tabular-nums',
                      direction: 'ltr',
                      unicodeBidi: 'isolate',
                      whiteSpace: 'nowrap'
                    }}>
                      {sign}{formatNoDecimals(item.remaining)}
                    </b>
                  </div>
                );
              })}
            </div>

            {/* Day Net */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '6px',
              borderTop: '1px solid var(--erp-card-border)',
              fontSize: '11.5px'
            }}>
              <span style={{ color: 'var(--erp-text-muted)', fontWeight: 600 }}>
                {isAr ? 'صافي اليوم' : 'Day Net'}
              </span>
              <b style={{
                color: activeDayBucket.dayNet.gte(0) ? 'var(--erp-success)' : 'var(--erp-danger)',
                fontVariantNumeric: 'tabular-nums',
                direction: 'ltr',
                unicodeBidi: 'isolate'
              }}>
                {activeDayBucket.dayNet.gte(0) ? '+' : '−'}{formatNoDecimals(activeDayBucket.dayNet.abs())}
              </b>
            </div>
          </div>
        ) : (
          <div style={{
            fontSize: '11.5px',
            color: 'var(--erp-text-subtle)',
            padding: '8px 0',
            textAlign: 'center'
          }}>
            {isAr ? 'لا توجد مستحقات في هذا اليوم' : 'No dues scheduled for this date'}
          </div>
        )}
      </div>
    </div>
  );
};
