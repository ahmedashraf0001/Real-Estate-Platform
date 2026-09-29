import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { 
  ZFKpiWaveSparkline, 
  getSparklinePalette 
} from '@/components/admin/erp/v2/common/ZFKpiWaveSparkline';

describe('ZFKpiWaveSparkline Component Suite', () => {
  it('maps accent colors to correct stroke and fill palettes', () => {
    const emerald = getSparklinePalette('emerald');
    assert.equal(emerald.stroke, '#059669');
    assert.equal(emerald.fill, '#10b981');

    const blue = getSparklinePalette('blue');
    assert.equal(blue.stroke, '#2563eb');
    assert.equal(blue.fill, '#3b82f6');

    const purple = getSparklinePalette('purple');
    assert.equal(purple.stroke, '#7c3aed');
    assert.equal(purple.fill, '#8b5cf6');

    const rose = getSparklinePalette('rose');
    assert.equal(rose.stroke, '#e11d48');
    assert.equal(rose.fill, '#f43f5e');

    const teal = getSparklinePalette('teal');
    assert.equal(teal.stroke, '#0d9488');
    assert.equal(teal.fill, '#14b8a6');

    const accent = getSparklinePalette('accent');
    assert.equal(accent.stroke, 'var(--erp-accent, #2563eb)');
    assert.equal(accent.fill, 'var(--erp-accent, #2563eb)');

    const defaultPal = getSparklinePalette();
    assert.equal(defaultPal.stroke, 'var(--erp-accent, #2563eb)');
    assert.equal(defaultPal.fill, 'var(--erp-accent, #2563eb)');
  });

  it('renders ZFKpiWaveSparkline with valid smooth SVG bezier curve and area gradient', () => {
    const html = renderToStaticMarkup(
      React.createElement(ZFKpiWaveSparkline, {
        data: [10, 20, 15, 30, 25, 40],
        accentColor: 'emerald'
      })
    );
    assert.ok(html.includes('<svg'), 'Should render an SVG element');
    assert.ok(html.includes('<path'), 'Should render at least one path');
    assert.ok(html.includes('linearGradient'), 'Should include linearGradient def');
    assert.ok(html.includes('stroke="#059669"'), 'Should use emerald stroke');
  });

  it('renders synthetic upward wave when trend is up without data', () => {
    const html = renderToStaticMarkup(
      React.createElement(ZFKpiWaveSparkline, {
        trend: 'up',
        accentColor: 'teal'
      })
    );
    assert.ok(html.includes('<svg'), 'Should render SVG element');
    assert.ok(html.includes('stroke="#0d9488"'), 'Should use teal stroke');
  });

  it('renders synthetic downward wave when trend is down without data', () => {
    const html = renderToStaticMarkup(
      React.createElement(ZFKpiWaveSparkline, {
        trend: 'down',
        accentColor: 'rose'
      })
    );
    assert.ok(html.includes('<svg'), 'Should render SVG element');
    assert.ok(html.includes('stroke="#e11d48"'), 'Should use rose stroke');
  });

  it('renders SVG with dynamic CSS variable stroke and fill when accentColor is accent', () => {
    const html = renderToStaticMarkup(
      React.createElement(ZFKpiWaveSparkline, {
        accentColor: 'accent'
      })
    );
    assert.ok(html.includes('stroke="var(--erp-accent, #2563eb)"'), 'Stroke should use var(--erp-accent)');
    assert.ok(html.includes('stop-color="var(--erp-accent, #2563eb)"') || html.includes('stopColor="var(--erp-accent, #2563eb)"') || html.includes('var(--erp-accent, #2563eb)'), 'Gradient stop should use var(--erp-accent)');
  });
});

import fs from 'node:fs';
import path from 'node:path';

describe('ZFKpiCard Consistency & Cockpit Polish Suite', () => {
  const kpiCardPath = path.join(process.cwd(), 'src/components/admin/erp/v2/ZFKpiCard.tsx');
  const kpiCardContent = fs.readFileSync(kpiCardPath, 'utf8');

  it('standardizes Primary Metric Row with dedicated full-width un-congested layout and dedicated delta trend row', () => {
    // 1. Primary row layout (un-congested, full width, baseline alignment, zero ellipsis truncation)
    assert.ok(
      kpiCardContent.includes("margin: '0.4rem 0 0.2rem 0', display: 'flex', alignItems: 'baseline', gap: '0.35rem'"),
      'Primary value row must have dedicated full-width layout with baseline alignment'
    );
    assert.ok(
      kpiCardContent.includes("fontSize: 'clamp(1.25rem, 1.4vw, 1.45rem)'"),
      'Primary value must use responsive clamp font size'
    );
    assert.ok(
      kpiCardContent.includes("fontVariantNumeric: 'tabular-nums'"),
      'Must enforce tabular nums on primary value'
    );
    assert.ok(
      kpiCardContent.includes("direction: 'ltr', unicodeBidi: 'isolate'"),
      'Primary value row must enforce isolated LTR numeric presentation'
    );

    // Primary value must not truncate with ellipsis
    const primaryValueSection = kpiCardContent.slice(
      kpiCardContent.indexOf('/* 2. PRIMARY VALUE'),
      kpiCardContent.indexOf('/* 2.2 DELTA')
    );
    assert.ok(
      !primaryValueSection.includes("textOverflow: 'ellipsis'"),
      'Primary value must NOT truncate with ellipsis in dedicated row'
    );

    // 2. Delta pill placement in dedicated sub-row beneath value
    assert.ok(
      kpiCardContent.includes("margin: '0 0 0.35rem 0', flexWrap: 'nowrap'"),
      'Delta trend row must be dedicated sub-row'
    );
    assert.ok(kpiCardContent.includes("flexShrink: 0"), 'Delta pill must have flexShrink: 0');
    assert.ok(kpiCardContent.includes("whiteSpace: 'nowrap'"), 'Delta pill must have whiteSpace nowrap');
    assert.ok(kpiCardContent.includes('delta.label'), 'Delta trend row must support optional label');

    // 3. Fixed 32px height sparkline container
    assert.ok(
      kpiCardContent.includes("height: 32, margin: '0.15rem 0 0.25rem 0', width: '100%', overflow: 'hidden'"),
      'Must render sparkline container with fixed 32px height'
    );
  });

  it('renders fallback baseline [0,0,0,0,0,0] when sparklineData is empty with showSparkline={true}', () => {
    assert.ok(kpiCardContent.includes('sparklineData && sparklineData.length >= 2 ? sparklineData : [0, 0, 0, 0, 0, 0]'), 'Must provide fallback baseline [0, 0, 0, 0, 0, 0]');
  });

  it('never renders delta pill in the footer', () => {
    // Footer zone must not include delta rendering
    const footerZone = kpiCardContent.slice(kpiCardContent.indexOf('/* 4. FOOTER'));
    assert.ok(!footerZone.includes('{delta &&'), 'Footer zone must not conditionally render delta pill');
    assert.ok(!footerZone.includes('delta.value'), 'Footer zone must not reference delta.value');
  });

  describe('ZFKpiCard Live Component Rendering & Edge Case Verification', () => {
    // Hook .css extensions in Node so CSS module imports in components do not throw
    if (typeof require !== 'undefined' && (require as any).extensions) {
      (require as any).extensions['.css'] = () => ({});
    }
    const { ZFKpiCard } = require('@/components/admin/erp/v2/ZFKpiCard');

    it('renders 8-9 digit financial values (325,150,000 ج.م) with dedicated full-width row and zero truncation', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFKpiCard, {
          title: 'السيولة النقدية المتاحة',
          value: 325150000,
          currency: 'ج.م',
          delta: {
            value: '+14.2%',
            isPositive: true,
            label: 'مقارنة بالفترة السابقة'
          },
          showSparkline: true,
          sparklineData: [20, 25, 30, 45, 40, 60]
        })
      );

      // Value row must have dedicated full-width flex container with LTR isolation
      assert.ok(html.includes('direction:ltr'), 'Must have direction:ltr');
      assert.ok(html.includes('unicode-bidi:isolate'), 'Must have unicode-bidi:isolate');
      assert.ok(html.includes('325,150,000'), 'Must render full formatted 9-digit number');
      assert.ok(html.includes('ج.م'), 'Must render currency');
      assert.ok(!html.includes('325,150,...'), 'Must never truncate with ellipsis');

      // Delta must render in dedicated sub-row beneath primary value
      assert.ok(html.includes('▲ +14.2%'), 'Must render positive trend glyph and delta');
      assert.ok(html.includes('color:#16a34a'), 'Positive delta must use emerald green');
      assert.ok(html.includes('background:#f0fdf4'), 'Positive delta must use subtle green background');
      assert.ok(html.includes('مقارنة بالفترة السابقة'), 'Must render delta label');

      // Sparkline container must be 32px height
      assert.ok(html.includes('height:32px'), 'Must render 32px sparkline container');
      assert.ok(html.includes('<svg'), 'Must render SVG sparkline');
    });

    it('renders negative delta (▼ -3.2%) with danger colors in dedicated sub-row', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFKpiCard, {
          title: 'المبيعات التعاقدية',
          value: 99675000,
          currency: 'ج.م',
          delta: {
            value: '-3.2%',
            isPositive: false,
            label: 'تراجع شهري'
          }
        })
      );

      assert.ok(html.includes('99,675,000'), 'Must render 8-digit number');
      assert.ok(html.includes('▼ -3.2%'), 'Must render negative trend glyph and delta');
      assert.ok(html.includes('color:#dc2626'), 'Negative delta must use danger red');
      assert.ok(html.includes('background:#fef2f2'), 'Negative delta must use subtle red background');
      assert.ok(html.includes('تراجع شهري'), 'Must render delta label');
    });

    it('renders neutral/flat delta (0.0%) without arrow glyph and neutral styling', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFKpiCard, {
          title: 'رأسمال الأعمال (WIP)',
          value: '45,200,000',
          currency: 'ج.م',
          delta: {
            value: '0.0%',
            isPositive: undefined,
            label: 'مستقر'
          }
        })
      );

      assert.ok(html.includes('45,200,000'), 'Must render metric value');
      assert.ok(!html.includes('▲'), 'Neutral delta must not render up arrow');
      assert.ok(!html.includes('▼'), 'Neutral delta must not render down arrow');
      assert.ok(html.includes('0.0%'), 'Must render delta value');
      assert.ok(html.includes('color:#64748b'), 'Neutral delta must use slate text');
      assert.ok(html.includes('background:#f8fafc'), 'Neutral delta must use canvas background');
    });

    it('omits delta sub-row entirely when delta prop is undefined', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFKpiCard, {
          title: 'التحصيلات المستحقة',
          value: 12000000,
          currency: 'ج.م',
          showSparkline: true
        })
      );

      assert.ok(html.includes('12,000,000'), 'Must render metric value');
      assert.ok(!html.includes('▲') && !html.includes('▼'), 'No delta arrow when delta undefined');
      assert.ok(!html.includes('border-radius:999px'), 'No delta pill when delta undefined');
      // Sparkline should still be rendered
      assert.ok(html.includes('height:32px'), 'Must render sparkline container');
    });

    it('handles 10-12 digit numbers and negative numbers without layout collapse', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFKpiCard, {
          title: 'إجمالي المحفظة العقارية',
          value: -1250000000,
          currency: 'ج.م',
          unitLabel: 'صافي'
        })
      );

      assert.ok(html.includes('- 1,250,000,000'), 'Must format 10-digit negative currency with LTR hyphen');
      assert.ok(html.includes('ج.م'), 'Must include currency');
      assert.ok(html.includes('صافي'), 'Must include unit label');
    });

    it('renders compact variant cleanly as horizontal telemetry strip', () => {
      const html = renderToStaticMarkup(
        React.createElement(ZFKpiCard, {
          variant: 'compact',
          title: 'تأمينات اجتماعية',
          value: '150,000 ج.م',
          subtitleLabel: 'الحالة',
          subtitleValue: 'معتمد'
        })
      );

      assert.ok(html.includes('150,000'), 'Must render compact value');
      assert.ok(html.includes('تأمينات اجتماعية'), 'Must render compact title');
      assert.ok(html.includes('معتمد'), 'Must render subtitle value');
      assert.ok(!html.includes('height:32px'), 'Compact card does not render wave sparkline');
    });
  });

  it('verifies CockpitView and CSS invariants', () => {
    const cockpitFilePath = path.join(process.cwd(), 'src/components/admin/erp/v2/views/CockpitView.tsx');
    const cockpitContent = fs.readFileSync(cockpitFilePath, 'utf8');
    const cssFilePath = path.join(process.cwd(), 'src/components/admin/erp/v2/ZFWorkstationShell.module.css');
    const cssContent = fs.readFileSync(cssFilePath, 'utf8');

    // 1. Badge removed from cockpit-mini-calendar
    const calendarWidgetMatch = cockpitContent.match(/id="cockpit-mini-calendar"[^>]*>/);
    assert.ok(calendarWidgetMatch, 'cockpit-mini-calendar must exist');
    assert.ok(!calendarWidgetMatch[0].includes('badge='), 'cockpit-mini-calendar must NOT have badge prop');

    // 2. Scope controls (period tabs & project select) removed from cockpit-mini-calendar
    const calendarWidgetSection = cockpitContent.slice(
      cockpitContent.indexOf('id="cockpit-mini-calendar"'),
      cockpitContent.indexOf('</ZFWidgetCard>', cockpitContent.indexOf('id="cockpit-mini-calendar"'))
    );
    assert.ok(!calendarWidgetSection.includes('cockpitCalendarScope'), 'cockpitCalendarScope must be removed from cockpit-mini-calendar');
    assert.ok(!calendarWidgetSection.includes('cockpitPeriodTabs'), 'cockpitPeriodTabs must be removed from cockpit-mini-calendar');
    assert.ok(!calendarWidgetSection.includes('cockpitProjectFilter'), 'cockpitProjectFilter must be removed from cockpit-mini-calendar');

    // 3. miniCalendarGrid and day cells restored
    assert.ok(calendarWidgetSection.includes('styles.miniCalendarGrid'), 'miniCalendarGrid must be restored inside cockpit-mini-calendar');
    assert.ok(calendarWidgetSection.includes('styles.miniCalendarDayHeader'), 'miniCalendarDayHeader must be present');
    assert.ok(calendarWidgetSection.includes('styles.miniCalendarDayCell'), 'miniCalendarDayCell must be present');
    assert.ok(calendarWidgetSection.includes('miniCalendarCells.map'), 'miniCalendarCells.map must render calendar day cells');
    assert.ok(calendarWidgetSection.includes('selectedCalendarDay'), 'selectedCalendarDay must be wired to mini calendar');
    assert.ok(calendarWidgetSection.includes('daysWithEvents'), 'daysWithEvents must be wired to mini calendar');
    assert.ok(calendarWidgetSection.includes('styles.miniCalendarEventDot'), 'miniCalendarEventDot must be rendered for event days');

    // 4. Clean agenda titles
    assert.ok(cockpitContent.includes('${isAr ? \'شيك آجل\' : \'PDC Cheque\'} - ${drawer}'), 'PDC cheques must format clean title');
    assert.ok(cockpitContent.includes('${trancheLabel} - ${clientName}'), 'Installments must format clean title');
    assert.ok(cockpitContent.includes('${itemName} - ${supplier}'), 'Contractor dues must format clean title');

    // 4. Progress bar fill consumes var(--erp-accent)
    assert.ok(cockpitContent.includes("backgroundColor: 'var(--erp-accent, #2563eb)'"), 'projectProgressBarFill must consume var(--erp-accent)');

    // 5. miniCalendarAgendaItem excluded from urgentAlertItem:last-child reset
    const urgentResetRegex = /\.urgentAlertItem:last-child[^\{]*\{[^}]*\}/g;
    const urgentMatches = cssContent.match(urgentResetRegex) || [];
    for (const match of urgentMatches) {
      assert.ok(!match.includes('miniCalendarAgendaItem'), 'urgentAlertItem:last-child must NOT include miniCalendarAgendaItem');
    }

    // 6. miniCalendarAgendaItem styled as discrete card
    assert.ok(cssContent.includes('.miniCalendarAgendaItem,') && cssContent.includes('.cockpitRail .miniCalendarAgendaItem {'), 'Must style miniCalendarAgendaItem');
    assert.ok(cssContent.includes('box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03) !important;'), 'Must have subtle card shadow');
  });

  it('correctly calculates mini calendar matrix for standard, leap year, and boundary month transitions', () => {
    function computeCalendarCells(year: number, month: number) {
      const firstDay = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysInPrevMonth = new Date(year, month, 0).getDate();
      const standardDay = firstDay.getDay();
      const startDayIndex = (standardDay + 1) % 7; // Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6

      const cells: { day: number; isCurrentMonth: boolean }[] = [];
      for (let i = startDayIndex - 1; i >= 0; i--) {
        cells.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
      }
      for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, isCurrentMonth: true });
      }
      const remaining = (7 - (cells.length % 7)) % 7;
      for (let d = 1; d <= remaining; d++) {
        cells.push({ day: d, isCurrentMonth: false });
      }
      return { daysInMonth, cells };
    }

    // 1. Leap Year February 2024 (29 days)
    const leapFeb = computeCalendarCells(2024, 1);
    assert.equal(leapFeb.daysInMonth, 29);
    assert.equal(leapFeb.cells.length % 7, 0, 'Total cells must be multiple of 7');
    assert.equal(leapFeb.cells.filter(c => c.isCurrentMonth).length, 29);

    // 2. Non-Leap Year February 2025 (28 days, starts on Saturday)
    const normFeb = computeCalendarCells(2025, 1);
    assert.equal(normFeb.daysInMonth, 28);
    assert.equal(normFeb.cells.length, 28, 'Starts on Saturday so exactly 28 cells');
    assert.equal(normFeb.cells.filter(c => c.isCurrentMonth).length, 28);

    // 3. Month rollover past boundaries (January -> December prev year, December -> January next year)
    const janDate = new Date(2026, 0, 1);
    const prevFromJan = new Date(janDate.getFullYear(), janDate.getMonth() - 1, 1);
    assert.equal(prevFromJan.getFullYear(), 2025);
    assert.equal(prevFromJan.getMonth(), 11);

    const decDate = new Date(2026, 11, 1);
    const nextFromDec = new Date(decDate.getFullYear(), decDate.getMonth() + 1, 1);
    assert.equal(nextFromDec.getFullYear(), 2027);
    assert.equal(nextFromDec.getMonth(), 0);
  });
});

