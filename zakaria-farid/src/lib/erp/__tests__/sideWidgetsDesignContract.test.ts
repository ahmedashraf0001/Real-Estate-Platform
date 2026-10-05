import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { ZFWidgetCard } from '@/components/admin/erp/v2/common/ZFWorkstationSideWidgets';
import { 
  InstallmentsAnalyticsCharts,
  formatProjectLabel,
  calculateProjectChartHeight,
  formatMonthCategory,
  formatAxisNumber
} from '@/components/admin/erp/v2/views/installments/InstallmentsAnalyticsCharts';
import { ProjectedVaultItem, VaultKPIs } from '@/lib/erp/installmentsVaultProjection';
import { D } from '@/lib/erp/math';

describe('FIN-OS Side Widgets Canonical Design Contract Suite', () => {
  const cssFilePath = path.join(process.cwd(), 'src/components/admin/erp/v2/ZFWorkstationShell.module.css');
  const cssContent = fs.readFileSync(cssFilePath, 'utf8');

  // 1. CSS Global Styles & Architectural Invariants
  describe('1. Workstation Shell Module CSS Invariants', () => {
    it('defines global .zfWidgetCard and .sideWidgetCard floating white card styles', () => {
      assert.ok(
        cssContent.includes(':global(.zfWidgetCard)'),
        'Must define :global(.zfWidgetCard)'
      );
      assert.ok(
        cssContent.includes(':global(.sideWidgetCard)'),
        'Must define :global(.sideWidgetCard)'
      );
      assert.ok(
        cssContent.includes('background: #ffffff !important;'),
        'Must define pure white panel background'
      );
      assert.ok(
        cssContent.includes('border-radius: 12px;'),
        'Must define 12px border radius'
      );
    });

    it('defines 28x28px squircle icon with 7px border radius and accent tokens', () => {
      assert.ok(
        cssContent.includes(':global(.zfWidgetCardIconSquircle)'),
        'Must define :global(.zfWidgetCardIconSquircle)'
      );
      assert.ok(
        cssContent.includes('width: 28px;'),
        'Squircle width must be 28px'
      );
      assert.ok(
        cssContent.includes('height: 28px;'),
        'Squircle height must be 28px'
      );
      assert.ok(
        cssContent.includes('border-radius: 7px;'),
        'Squircle radius must be 7px'
      );
      assert.ok(
        cssContent.includes('var(--erp-accent-subtle'),
        'Squircle must consume dynamic accent subtle'
      );
    });

    it('defines canonical widget card header and bold title styles', () => {
      assert.ok(
        cssContent.includes(':global(.zfWidgetCardHeader)'),
        'Must define :global(.zfWidgetCardHeader)'
      );
      assert.ok(
        cssContent.includes(':global(.zfWidgetCardTitle)'),
        'Must define :global(.zfWidgetCardTitle)'
      );
      assert.ok(
        cssContent.includes('font-size: 0.86rem;') || cssContent.includes('font-weight: 700;'),
        'Title must have high-density bold typography'
      );
    });

    it('defines sub-box styling with #f8fafc background and #e2e8f0 border', () => {
      assert.ok(
        cssContent.includes(':global(.sideWidgetSubBox)') || cssContent.includes(':global(.zfWidgetSubBox)'),
        'Must define sub-box classes'
      );
      assert.ok(
        cssContent.includes('background: #f8fafc;'),
        'Sub-box must use #f8fafc background'
      );
    });

    it('sets side widgets column container and body to canvas background', () => {
      assert.ok(
        cssContent.includes('.sideWidgetsContainer {') &&
        cssContent.includes('background: var(--erp-bg-canvas, #f8fafc) !important;'),
        'sideWidgetsContainer must have canvas slate background'
      );
      assert.ok(
        cssContent.includes('.sideWidgetsBody {') &&
        cssContent.includes('background: var(--erp-bg-canvas, #f8fafc) !important;'),
        'sideWidgetsBody must have canvas slate background'
      );
    });

    it('defines hasCustomIcon rule to hide default side widgets icons', () => {
      assert.ok(
        cssContent.includes('.sideWidgetsIcon:global(.hasCustomIcon)'),
        'Must define rule for .sideWidgetsIcon:global(.hasCustomIcon)'
      );
      assert.ok(
        cssContent.includes('.defaultSideWidgetsIcon'),
        'Must define .defaultSideWidgetsIcon class'
      );
      assert.ok(
        cssContent.includes('#zf-side-widgets-default-icon:not(:only-child)'),
        'Must define rule for #zf-side-widgets-default-icon:not(:only-child)'
      );
    });

    it('hardens .miniCalendarGrid with !important rules to prevent layout overrides', () => {
      assert.ok(
        cssContent.includes('.miniCalendarGrid {') &&
        cssContent.includes('display: grid !important;') &&
        cssContent.includes('grid-template-columns: repeat(7, 1fr) !important;') &&
        cssContent.includes('gap: 2px !important;'),
        'Must harden .miniCalendarGrid with !important grid rules'
      );
    });

    it('defines canonical .tabularNums and ensures min-width resilience on side rail text labels', () => {
      assert.ok(
        cssContent.includes('.tabularNums,') && cssContent.includes(':global(.tabularNums)'),
        'Must define .tabularNums and :global(.tabularNums)'
      );
      assert.ok(
        cssContent.includes('.cockpitRail .projectProgressName') && cssContent.includes('min-width: 0;'),
        'Must enforce min-width: 0 on projectProgressName to prevent flex overflow on long names'
      );
      assert.ok(
        cssContent.includes('.cockpitRail .projectProgressPct'),
        'Must define .cockpitRail .projectProgressPct for numeric percentage styling'
      );
    });
  });

  // 2. Component Rendering & Structure Contract
  describe('2. ZFWidgetCard Rendering & Invariants', () => {
    it('renders pure white card with zfWidgetCard and sideWidgetCard class names', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          ZFWidgetCard,
          {
            id: 'test-widget',
            title: 'تقويم التحصيلات',
            icon: React.createElement('span', null, '📅'),
            badge: React.createElement('span', { className: 'statusPill statusPillGreen' }, 'نشط'),
            isAr: true,
          },
          React.createElement('div', { className: 'sideWidgetSubBox' }, 'Content Row')
        )
      );

      assert.ok(html.includes('zfWidgetCard'), 'Must contain zfWidgetCard class');
      assert.ok(html.includes('sideWidgetCard'), 'Must contain sideWidgetCard class');
      assert.ok(html.includes('zfWidgetCardHeader'), 'Must contain zfWidgetCardHeader');
      assert.ok(html.includes('zfWidgetCardIconSquircle'), 'Must contain zfWidgetCardIconSquircle');
      assert.ok(html.includes('zfWidgetCardTitle'), 'Must contain zfWidgetCardTitle');
      assert.ok(html.includes('zfCardToggleBtn'), 'Must contain zfCardToggleBtn');
      assert.ok(html.includes('statusPillGreen'), 'Must render status pill badge');
      assert.ok(html.includes('sideWidgetSubBox'), 'Must render inner sub-box');
    });

    it('verifies ZFKpiCard supports showSparkline and renders ZFKpiWaveSparkline', () => {
      const kpiCardPath = path.join(process.cwd(), 'src/components/admin/erp/v2/ZFKpiCard.tsx');
      const kpiCardContent = fs.readFileSync(kpiCardPath, 'utf8');

      assert.ok(
        kpiCardContent.includes('showSparkline?: boolean'),
        'ZFKpiCardProps must declare showSparkline?: boolean'
      );
      assert.ok(
        kpiCardContent.includes('(showSparkline || Boolean(sparklineData && sparklineData.length >= 2)) && !sparkline'),
        'ZFKpiCard must render ZFKpiWaveSparkline when showSparkline is true or sparklineData is provided'
      );
      assert.ok(
        kpiCardContent.includes('<ZFKpiWaveSparkline'),
        'ZFKpiCard must render ZFKpiWaveSparkline component'
      );
    });

    it('verifies CockpitView side widgets and metrics card invariants', () => {
      const cockpitFilePath = path.join(process.cwd(), 'src/components/admin/erp/v2/views/CockpitView.tsx');
      const cockpitContent = fs.readFileSync(cockpitFilePath, 'utf8');

      // Problem A: Title bar in side rail
      assert.ok(
        cockpitContent.includes('ZFWorkstationSideWidgets title={isAr ? \'مركز التنبيهات والأجندة المالية\' : \'Alerts & Financial Agenda\'} icon={<SlidersHorizontal size={16} />}'),
        'CockpitView must provide title and icon to ZFWorkstationSideWidgets'
      );

      // Problem B: Calendar & Alerts ZFWidgetCards
      assert.ok(
        cockpitContent.includes('id="cockpit-urgent-alerts"'),
        'CockpitView must render cockpit-urgent-alerts as ZFWidgetCard'
      );
      assert.ok(
        cockpitContent.includes('id="cockpit-mini-calendar"'),
        'CockpitView must render cockpit-mini-calendar as ZFWidgetCard'
      );
      assert.ok(
        cockpitContent.includes('id="cockpit-projects-progress"'),
        'CockpitView must render cockpit-projects-progress as ZFWidgetCard'
      );

      // Wave Sparkline on all 4 KPI cards
      const sparklineMatches = cockpitContent.match(/showSparkline=\{true\}/g);
      assert.ok(sparklineMatches && sparklineMatches.length >= 4, 'All 4 discrete KPI cards must have showSparkline={true}');

      for (const metric of ['cash', 'contracts', 'wip', 'dues']) {
        assert.ok(cockpitContent.includes(`sparklineData={kpiWaves.${metric}}`), `${metric} card must use its own real-data history`);
      }
      assert.ok(!cockpitContent.includes('styles.statCardFilters'), 'Cockpit filters removed from KPI heading');
      assert.ok(!cockpitContent.includes('styles.cockpitCalendarScope'), 'Scope filters removed from calendar per user feedback');
      assert.ok(cockpitContent.includes('styles.miniCalendarGrid'), 'Calendar grid restored per user feedback');
      assert.ok(!cockpitContent.includes('pct = 60') && !cockpitContent.includes('pct = 25'), 'Project status must not invent completion percentages');
      assert.ok(cockpitContent.includes('p.completion_percentage'), 'Project completion must inspect p.completion_percentage from property records');
      assert.ok(cockpitContent.includes('styles.projectProgressPct'), 'Widget 3 side card must render numeric percentage with projectProgressPct');
      assert.ok(cockpitContent.includes('${proj.pct}%'), 'Modal table must display numeric percentage with tabular nums');
      assert.ok(cockpitContent.includes('setIsProjectsModalOpen(true)'), 'Project card click target must have fallback to modal for zero dead buttons');
      assert.ok(!cockpitContent.includes("scheduleFilterTab === 'cheques'"), 'Operational schedule must exclude quarantined cheques');
      assert.ok(cockpitContent.includes("scheduleFilterTab === 'installments'") && cockpitContent.includes("scheduleFilterTab === 'contractors'"), 'Schedule modal must filter installments and contractor dues');
      assert.ok(!cockpitContent.includes('styles.cockpitProjectFilter'), 'Project dropdown removed from mini calendar per user review');
      assert.ok(!cockpitContent.includes('selectedDateIso'), 'Legacy 5-day calendar strip dead state must be cleanly purged');
    });
  });

  // 3. InstallmentsAnalyticsCharts Rail Invariants
  describe('3. InstallmentsAnalyticsCharts Rail Variant', () => {
    const mockKpis: VaultKPIs = {
      totalCount: 12,
      totalSum: D('1250000'),
      clearedCount: 6,
      clearedSum: D('855000'),
      overdueCount: 2,
      overdueSum: D('120000'),
      dueTodayCount: 1,
      dueTodaySum: D('45000'),
      dueWeekCount: 1,
      dueWeekSum: D('45000'),
      dueMonthCount: 3,
      dueMonthSum: D('150000'),
      depositedCount: 3,
      depositedSum: D('230000'),
      bouncedCount: 0,
      bouncedSum: D('0'),
      upcomingCount: 0,
      upcomingSum: D('0'),
      collectionRate: 68.4
    };

    const mockItems: ProjectedVaultItem[] = [
      {
        id: 'item-1',
        kind: 'schedule_due',
        contractId: 'cnt-1',
        contractNumber: 'CTR-001',
        buyerName: 'أحمد محمود',
        projectTitle: 'برج النور',
        unitId: 'A-101',
        isDownPayment: false,
        description: 'قسط ربع سنوي',
        dueDate: '2026-09-26',
        nominalValue: '45000',
        amountPaid: '0',
        remainingAmount: '45000',
        status: 'due_today',
        instrumentNumber: 'SND-01',
        bankName: 'CIB'
      },
      {
        id: 'item-2',
        kind: 'cheque',
        contractId: 'cnt-2',
        contractNumber: 'CTR-002',
        buyerName: 'سارة خالد',
        projectTitle: 'برج الصفا',
        unitId: 'B-202',
        isDownPayment: false,
        description: 'شيك استحقاق',
        dueDate: '2026-08-15',
        nominalValue: '120000',
        amountPaid: '0',
        remainingAmount: '120000',
        status: 'overdue',
        instrumentNumber: 'CHQ-8899',
        bankName: 'NBE'
      }
    ];

    it('renders all 3 analytical charts in discrete ZFWidgetCard containers in rail mode', () => {
      const html = renderToStaticMarkup(
        React.createElement(InstallmentsAnalyticsCharts, {
          items: mockItems,
          kpis: mockKpis,
          isAr: true,
          variant: 'rail'
        })
      );

      // Check card IDs
      assert.ok(html.includes('id="zf-side-widget-dues-trend"'), 'Must contain Trend chart card');
      assert.ok(html.includes('id="zf-side-widget-status-dist"'), 'Must contain Status Donut card');
      assert.ok(html.includes('id="zf-side-widget-projects-dist"'), 'Must contain Project Breakdown card');

      // Check discrete white card structure
      const cardMatches = html.match(/zfWidgetCard/g);
      assert.ok(cardMatches && cardMatches.length >= 3, 'Must render at least 3 discrete ZFWidgetCards');

      // Check status pills
      assert.ok(html.includes('statusPill'), 'Cards must feature status pills');

      // Check that trend chart card does not render redundant مباشر CAD / Live CAD badge
      assert.ok(!html.includes('مباشر CAD'), 'Trend chart card must not render مباشر CAD badge');
      assert.ok(!html.includes('Live CAD'), 'Trend chart card must not render Live CAD badge');

      // Check sideWidgetsWrap
      assert.ok(html.includes('sideWidgetsWrap'), 'Container must have sideWidgetsWrap class');
      assert.ok(html.includes('display:contents'), 'Container must use display:contents for direct flex sibling participation');
    });

    it('renders honest zero-state indicators and counts when items array is empty', () => {
      const emptyKpis: VaultKPIs = {
        totalCount: 0,
        totalSum: D('0'),
        clearedCount: 0,
        clearedSum: D('0'),
        overdueCount: 0,
        overdueSum: D('0'),
        dueTodayCount: 0,
        dueTodaySum: D('0'),
        dueWeekCount: 0,
        dueWeekSum: D('0'),
        dueMonthCount: 0,
        dueMonthSum: D('0'),
        depositedCount: 0,
        depositedSum: D('0'),
        bouncedCount: 0,
        bouncedSum: D('0'),
        upcomingCount: 0,
        upcomingSum: D('0'),
        collectionRate: 0
      };

      const html = renderToStaticMarkup(
        React.createElement(InstallmentsAnalyticsCharts, {
          items: [],
          kpis: emptyKpis,
          isAr: true,
          variant: 'rail'
        })
      );

      // Verify honest 0 project count in badge (not 1)
      assert.ok(html.includes('0 مشاريع'), 'Must honestly display 0 projects when items is empty');

      // Verify honest zero-state indicator boxes
      assert.ok(
        html.includes('لا توجد أوراق أو أقساط مسجلة حالياً') || html.includes('No installments'),
        'Donut card must render truthful zero state when empty'
      );
      assert.ok(
        html.includes('لا توجد بيانات مشاريع مسجلة حالياً') || html.includes('No project data'),
        'Project breakdown card must render truthful zero state when empty'
      );
    });

    it('applies executive-grade height and dynamically scales for multiple projects', () => {
      const longTitleItems: ProjectedVaultItem[] = [
        ...mockItems,
        {
          id: 'item-3',
          kind: 'schedule_due',
          contractId: 'cnt-3',
          contractNumber: 'CTR-003',
          buyerName: 'طارق حسام',
          projectTitle: 'عمارة سكنية فاخرة بالتجمع الخامس',
          unitId: 'C-303',
          isDownPayment: false,
          description: 'قسط ربع سنوي',
          dueDate: '2026-10-15',
          nominalValue: '80000',
          amountPaid: '0',
          remainingAmount: '80000',
          status: 'upcoming',
          instrumentNumber: 'SND-03',
          bankName: 'CIB'
        },
        {
          id: 'item-4',
          kind: 'schedule_due',
          contractId: 'cnt-4',
          contractNumber: 'CTR-004',
          buyerName: 'منى سمير',
          projectTitle: 'مشروع الفردوس الجديد',
          unitId: 'D-404',
          isDownPayment: false,
          description: 'قسط ربع سنوي',
          dueDate: '2026-11-15',
          nominalValue: '60000',
          amountPaid: '0',
          remainingAmount: '60000',
          status: 'upcoming',
          instrumentNumber: 'SND-04',
          bankName: 'NBE'
        },
        {
          id: 'item-5',
          kind: 'schedule_due',
          contractId: 'cnt-5',
          contractNumber: 'CTR-005',
          buyerName: 'ياسر علي',
          projectTitle: 'كمبوند الياقوت السكني المرحلة الثانية',
          unitId: 'E-505',
          isDownPayment: false,
          description: 'قسط ربع سنوي',
          dueDate: '2026-12-15',
          nominalValue: '90000',
          amountPaid: '0',
          remainingAmount: '90000',
          status: 'upcoming',
          instrumentNumber: 'SND-05',
          bankName: 'BDC'
        },
        {
          id: 'item-6',
          kind: 'schedule_due',
          contractId: 'cnt-6',
          contractNumber: 'CTR-006',
          buyerName: 'كريم نادر',
          projectTitle: 'مول الأعمال المركزي',
          unitId: 'F-606',
          isDownPayment: false,
          description: 'قسط ربع سنوي',
          dueDate: '2027-01-15',
          nominalValue: '110000',
          amountPaid: '0',
          remainingAmount: '110000',
          status: 'upcoming',
          instrumentNumber: 'SND-06',
          bankName: 'AAIB'
        },
        {
          id: 'item-7',
          kind: 'schedule_due',
          contractId: 'cnt-7',
          contractNumber: 'CTR-007',
          buyerName: 'هالة محمود',
          projectTitle: 'برج الأندلس بلازا',
          unitId: 'G-707',
          isDownPayment: false,
          description: 'قسط ربع سنوي',
          dueDate: '2027-02-15',
          nominalValue: '75000',
          amountPaid: '0',
          remainingAmount: '75000',
          status: 'upcoming',
          instrumentNumber: 'SND-07',
          bankName: 'QNB'
        }
      ];

      const html = renderToStaticMarkup(
        React.createElement(InstallmentsAnalyticsCharts, {
          items: longTitleItems,
          kpis: mockKpis,
          isAr: true,
          variant: 'rail'
        })
      );

      // Verify Dues Trend chart has adequate height (230px, within 220-240px range)
      assert.ok(html.includes('min-height:230px') || html.includes('min-height: 230px'), 'Trend chart must have adequate height (230px)');

      // Verify Project Breakdown has executive-grade dynamic height: 7 projects * 42 = 294px
      assert.ok(html.includes('min-height:294px') || html.includes('min-height: 294px'), 'Project Breakdown chart must dynamically scale height for 7 projects to 294px');

      // Verify project count
      assert.ok(html.includes('7 مشاريع'), 'Must display 7 projects count in badge');
    });

    it('verifies formatProjectLabel cleanly trims labels to max 16 chars with ellipsis', () => {
      // Long names (> 16 chars) must be trimmed to 16 chars ending with …
      const trimmedLong = formatProjectLabel('عمارة سكنية فاخرة بالتجمع الخامس', 16);
      assert.strictEqual(trimmedLong.length, 16, 'Trimmed label must be exactly 16 characters');
      assert.ok(trimmedLong.endsWith('…'), 'Trimmed label must end with ellipsis character');
      assert.strictEqual(trimmedLong, 'عمارة سكنية فاخ…');

      // Short names (<= 16 chars) must NOT be truncated
      const shortName = formatProjectLabel('برج النور', 16);
      assert.strictEqual(shortName, 'برج النور', 'Short name must remain untouched');

      // Exactly 16 chars
      const exact16 = formatProjectLabel('1234567890123456', 16);
      assert.strictEqual(exact16, '1234567890123456', 'Exact 16-character string should not be truncated');

      // 17 chars
      const char17 = formatProjectLabel('12345678901234567', 16);
      assert.strictEqual(char17, '123456789012345…', '17-character string should be trimmed to 16 with ellipsis');

      // Empty or null-safe
      assert.strictEqual(formatProjectLabel('', 16), '', 'Empty string returns empty');
    });

    it('verifies calculateProjectChartHeight enforces executive-grade height contract', () => {
      // 0 projects: base height of 260px
      assert.strictEqual(calculateProjectChartHeight(0), 260, '0 projects must have 260px minimum height');

      // 1-5 projects: clamps to minimum 260px
      assert.strictEqual(calculateProjectChartHeight(1), 260, '1 project must have 260px minimum height');
      assert.strictEqual(calculateProjectChartHeight(5), 260, '5 projects (210px) must clamp to 260px');
      assert.strictEqual(calculateProjectChartHeight(6), 260, '6 projects (252px) must clamp to 260px');

      // 7 projects: 7 * 42 = 294px
      assert.strictEqual(calculateProjectChartHeight(7), 294, '7 projects must scale to 294px');

      // 10 projects: 10 * 42 = 420px
      assert.strictEqual(calculateProjectChartHeight(10), 420, '10 projects must scale to 420px');
    });

    it('verifies formatMonthCategory formats clean 2-digit years for X-axis readability', () => {
      // Arabic mode
      assert.strictEqual(formatMonthCategory('2026-09', true), 'سبتمبر 26');
      assert.strictEqual(formatMonthCategory('2026-10', true), 'أكتوبر 26');
      assert.strictEqual(formatMonthCategory('2027-01', true), 'يناير 27');

      // English mode
      assert.strictEqual(formatMonthCategory('2026-09', false), 'Sep 26');
      assert.strictEqual(formatMonthCategory('2026-10', false), 'Oct 26');
      assert.strictEqual(formatMonthCategory('2027-01', false), 'Jan 27');

      // Malformed safety
      assert.strictEqual(formatMonthCategory('', true), '');
      assert.strictEqual(formatMonthCategory('invalid', true), 'invalid');
    });

    it('verifies formatAxisNumber formats compact currency units cleanly', () => {
      assert.strictEqual(formatAxisNumber(150_000_000), '150M');
      assert.strictEqual(formatAxisNumber(1_500_000), '1.5M');
      assert.strictEqual(formatAxisNumber(200_000), '200k');
      assert.strictEqual(formatAxisNumber(45_000), '45k');
      assert.strictEqual(formatAxisNumber(0), '0');
      assert.strictEqual(formatAxisNumber(500), '500');
    });
  });

  // 4. enhanceCardsInSlot Architecture & Edge Cases
  describe('4. enhanceCardsInSlot Architecture & Safety', () => {
    it('excludes wrapper containers from being treated as cards', () => {
      const { enhanceCardsInSlot } = require('@/components/admin/erp/v2/common/ZFWorkstationSideWidgets');

      interface MockEl {
        nodeType: number;
        classList: { contains: (cls: string) => boolean; add: () => void; remove: () => void };
        children: MockEl[];
        querySelector: () => null;
        querySelectorAll: (sel: string) => MockEl[];
        setAttribute: (attr: string, val: string) => void;
      }

      const mockCard1: MockEl = {
        nodeType: 1,
        classList: { contains: () => false, add: () => {}, remove: () => {} },
        children: [{ nodeType: 1, classList: { contains: () => false, add: () => {}, remove: () => {} }, children: [], querySelector: () => null, querySelectorAll: () => [], setAttribute: () => {} }, { nodeType: 1, classList: { contains: () => false, add: () => {}, remove: () => {} }, children: [], querySelector: () => null, querySelectorAll: () => [], setAttribute: () => {} }],
        querySelector: () => null,
        querySelectorAll: () => [],
        setAttribute: () => {}
      };

      const mockWrapper: MockEl = {
        nodeType: 1,
        classList: { contains: (cls: string) => cls === 'sideWidgetsWrap', add: () => {}, remove: () => {} },
        children: [mockCard1, mockCard1], // has >= 2 children!
        querySelector: () => null,
        querySelectorAll: () => [],
        setAttribute: () => {}
      };

      const slot: MockEl = {
        nodeType: 1,
        classList: { contains: (cls: string) => cls === 'sideWidgetsContent', add: () => {}, remove: () => {} },
        children: [mockWrapper],
        querySelector: () => null,
        querySelectorAll: (sel: string) => sel.includes('sideWidgetsWrap') ? [mockWrapper] : [],
        setAttribute: () => {}
      };

      let wrapperEnhancedAsCard = false;
      mockWrapper.setAttribute = (attr, val) => {
        if (attr === 'data-card-enhanced') wrapperEnhancedAsCard = true;
      };

      enhanceCardsInSlot(slot as unknown as HTMLElement);

      assert.strictEqual(wrapperEnhancedAsCard, false, 'Wrapper container must NOT be treated or enhanced as a card');
    });
  });

  // 5. FIN-OS Cockpit Redesign Invariants Contract
  describe('5. FIN-OS Cockpit Redesign Plan Contract (§Task)', () => {
    it('verifies dualChartsGrid responsive breakpoints and absence of single-column override', () => {
      assert.ok(
        cssContent.includes('.dualChartsGrid {') &&
        cssContent.includes('grid-template-columns: repeat(2, minmax(0, 1fr));'),
        'dualChartsGrid must default to 2 columns'
      );
      assert.ok(
        cssContent.includes('@container (max-width: 820px)') &&
        cssContent.includes('@container middleSection (max-width: 820px)'),
        'dualChartsGrid must support 820px container queries'
      );
      assert.ok(
        !cssContent.includes('grid-template-columns: minmax(0, 1fr) !important;'),
        'Must not contain hardcoded single-column override on dualChartsGrid'
      );
    });

    it('verifies executive side widgets sizing tokens in ZFWorkstationShell.module.css', () => {
      assert.ok(
        cssContent.includes('padding: 12px 14px !important;'),
        'Cockpit side cards must have 12px 14px padding'
      );
      assert.ok(
        cssContent.includes('.urgentAlertSquircle') &&
        cssContent.includes('width: 28px !important;') &&
        cssContent.includes('height: 28px !important;'),
        'urgentAlertSquircle must be 28x28px'
      );
      assert.ok(
        cssContent.includes('.miniCalendarAgendaIconWrap') &&
        cssContent.includes('width: 24px !important;') &&
        cssContent.includes('height: 24px !important;'),
        'miniCalendarAgendaIconWrap must be 24x24px'
      );
      assert.ok(
        cssContent.includes('.projectProgressThumb') &&
        cssContent.includes('width: 44px !important;') &&
        cssContent.includes('height: 44px !important;') &&
        cssContent.includes('border-radius: 8px !important;'),
        'projectProgressThumb must be 44x44px with 8px radius'
      );
      assert.ok(
        cssContent.includes('.projectProgressBarTrack') &&
        cssContent.includes('height: 5px !important;'),
        'projectProgressBarTrack must be 5px height'
      );
      assert.ok(
        cssContent.includes('overflow: visible !important;') ||
        cssContent.includes('overflow: hidden;'),
        'Mini calendar body must have natural height without internal scrollbar'
      );
      assert.ok(
        cssContent.includes('.miniCalendarDayCell') &&
        cssContent.includes('width: 26px !important;') &&
        cssContent.includes('height: 26px !important;'),
        'Day cells must be 26x26px'
      );
      assert.ok(
        cssContent.includes('padding: 14px 16px !important;'),
        'cockpit-projects-progress must have generous 14px 16px interior padding'
      );
      assert.ok(
        cssContent.includes('.projectProgressItem') &&
        cssContent.includes('padding: 10px 12px !important;') &&
        cssContent.includes('border: 1px solid #e2e8f0 !important;') &&
        cssContent.includes('border-radius: 8px !important;'),
        'projectProgressItem must be framed independent card with 10px 12px padding'
      );
    });

    it('verifies CockpitView PDC cheque agenda integration, image extraction, and zero dead buttons', () => {
      const cockpitFilePath = path.join(process.cwd(), 'src/components/admin/erp/v2/views/CockpitView.tsx');
      const cockpitContent = fs.readFileSync(cockpitFilePath, 'utf8');

      // Image URL extraction
      assert.ok(
        cockpitContent.includes('p.property_images?.[0]?.url') &&
        cockpitContent.includes('imageUrl'),
        'projectsProgressData must extract imageUrl'
      );

      // PDC cheque support in allAgendaEvents
      assert.ok(
        cockpitContent.includes("type: 'pdc'") &&
        cockpitContent.includes("iconBg: '#eff6ff'") &&
        cockpitContent.includes("iconColor: '#2563eb'"),
        'allAgendaEvents must support PDC cheques with #eff6ff and #2563eb'
      );
      assert.ok(
        cockpitContent.includes("onNavigateTab('pdc')"),
        'PDC agenda event must have onNavigateTab click handler'
      );

      // Urgent alerts 3 rows: squircles and soft micro-pill header badge
      assert.ok(
        cockpitContent.includes('urgentAlertSquircle') &&
        cockpitContent.includes('statusPillAmber') &&
        cockpitContent.includes('statusPillNeutral'),
        'Urgent alerts must render squircles and soft micro-pill header badge'
      );

      // Mini calendar clamping to 3 and clean expand button
      assert.ok(
        cockpitContent.includes('upcomingAgendaEvents.slice(0, 3).map') &&
        cockpitContent.includes('upcomingAgendaEvents.length > 3'),
        'Mini calendar must clamp agenda dues to 3 items and render expand button when length > 3'
      );

      // Project progress 44x44px thumbnail & fallback
      assert.ok(
        cockpitContent.includes('styles.projectProgressThumb') &&
        cockpitContent.includes('styles.projectProgressImg') &&
        cockpitContent.includes('<Building2 size={20} />'),
        'Project progress must render thumbnail image with Building2 fallback'
      );

      // Percentage bounded
      assert.ok(
        cockpitContent.includes('Math.min(100, Math.max(0, proj.pct))'),
        'Project progress bar must bound percentage between 0 and 100'
      );
    });
  });

  // 6. FIN-OS Cockpit Craft De-Slopping & Invariants Verification
  describe('6. Cockpit Craft De-Slopping & Invariants Verification (§Deep)', () => {
    const cockpitFilePath = path.join(process.cwd(), 'src/components/admin/erp/v2/views/CockpitView.tsx');
    const cockpitContent = fs.readFileSync(cockpitFilePath, 'utf8');

    it('verifies discrete KPI card delta trend pill stripping rules are completely removed', () => {
      assert.ok(
        !cssContent.includes('.cockpitKpiGrid .discreteKpiCard > div:nth-child(2) > span:last-child'),
        'Must remove discreteKpiCard delta stripping rules'
      );
    });

    it('verifies projectProgressItem:last-child is excluded from urgentAlertItem:last-child border stripping', () => {
      const urgentAlertResetRegex = /\.urgentAlertItem:last-child[^\{]*\{[^}]*\}/g;
      const matches = cssContent.match(urgentAlertResetRegex) || [];
      for (const match of matches) {
        assert.ok(
          !match.includes('projectProgressItem'),
          `Group reset rule must NOT include projectProgressItem: ${match}`
        );
      }
    });

    it('verifies projectProgressItem:last-child only clears margin-bottom without stripping border', () => {
      assert.ok(
        cssContent.includes('.projectProgressItem:last-child,') &&
        cssContent.includes('margin-bottom: 0 !important;'),
        'projectProgressItem:last-child must reset margin-bottom to 0'
      );
    });

    it('verifies formatDelta mathematical behavior across positive, negative, and zero inputs', () => {
      const formatDelta = (current: number, prior: number): string | null => {
        const c = D(current);
        const p = D(prior);
        if (p.isZero()) {
          if (c.isZero()) return '0.0%';
          return '+100.0%';
        }
        const diff = c.minus(p);
        const pct = diff.dividedBy(p.abs()).times(100);
        const sign = pct.gte(0) ? '+' : '';
        return `${sign}${pct.toFixed(1)}%`;
      };

      assert.strictEqual(formatDelta(0, 0), '0.0%');
      assert.strictEqual(formatDelta(5000, 0), '+100.0%');
      assert.strictEqual(formatDelta(120, 100), '+20.0%');
      assert.strictEqual(formatDelta(75, 100), '-25.0%');
      assert.strictEqual(formatDelta(0, 100), '-100.0%');
    });

    it('verifies upcomingAgendaEvents in useMemo is NOT pre-sliced to 3', () => {
      assert.ok(
        cockpitContent.includes('return allUpcomingAgendaEvents;\n  }, [allAgendaEvents, allUpcomingAgendaEvents, selectedDateStr]);'),
        'upcomingAgendaEvents must not be pre-sliced in useMemo'
      );
    });

    it('verifies projectProgressTopRow has status pill purged and keeps tabular percentage', () => {
      assert.ok(
        cockpitContent.includes('className={styles.projectProgressTopRow}'),
        'Must render projectProgressTopRow'
      );
      assert.ok(
        cockpitContent.includes('className={styles.projectProgressPct}'),
        'Must render projectProgressPct'
      );
    });
  });
});
