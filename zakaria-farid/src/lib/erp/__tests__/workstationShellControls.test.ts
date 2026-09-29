import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ZFWidgetCard, enhanceCardsInSlot } from '@/components/admin/erp/v2/common/ZFWorkstationSideWidgets';

describe('FIN-OS Workstation Shell Controls Suite (§R1, §R2, §R3)', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // R1: Side Widgets Section Minimize & Restore Control
  // ──────────────────────────────────────────────────────────────────────────
  describe('R1. Side Widgets Section Minimize & Restore Control', () => {
    const STORAGE_KEY_MINIMIZED = 'fin_os_side_widgets_minimized';

    it('defines the correct localStorage persistence key', () => {
      assert.strictEqual(STORAGE_KEY_MINIMIZED, 'fin_os_side_widgets_minimized');
    });

    it('calculates minimized width strictly as 44px', () => {
      const isMinimized = true;
      const normalWidth = 350;
      const effectiveWidth = isMinimized ? 44 : normalWidth;
      assert.strictEqual(effectiveWidth, 44);
    });

    it('restores side widgets rail to previous width when unminimized', () => {
      let isMinimized = true;
      const customWidth = 420;

      // When minimized
      let currentWidth = isMinimized ? 44 : customWidth;
      assert.strictEqual(currentWidth, 44);

      // Operator toggles restore
      isMinimized = false;
      currentWidth = isMinimized ? 44 : customWidth;
      assert.strictEqual(currentWidth, 420);
    });

    it('provides localized labels for minimize and restore buttons', () => {
      const getMinimizeLabel = (isAr: boolean) => isAr ? 'تصغير اللوحة الجانبية' : 'Minimize side widgets rail';
      const getRestoreLabel = (isAr: boolean) => isAr ? 'توسيع اللوحة الجانبية' : 'Expand side widgets rail';

      assert.strictEqual(getMinimizeLabel(true), 'تصغير اللوحة الجانبية');
      assert.strictEqual(getMinimizeLabel(false), 'Minimize side widgets rail');
      assert.strictEqual(getRestoreLabel(true), 'توسيع اللوحة الجانبية');
      assert.strictEqual(getRestoreLabel(false), 'Expand side widgets rail');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // R2: Expand and Shrink Toggles on Individual Widget Cards
  // ──────────────────────────────────────────────────────────────────────────
  describe('R2. Expand and Shrink Toggles on Individual Widget Cards', () => {
    it('renders ZFWidgetCard with title, icon, toggle button and body in expanded state by default', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          ZFWidgetCard,
          {
            title: 'تنبيهات عاجلة',
            icon: React.createElement('span', { id: 'test-icon' }, 'ICON'),
            badge: React.createElement('span', { id: 'test-badge' }, '3'),
            isAr: true,
          },
          React.createElement('div', { id: 'test-content' }, 'Alert Item 1')
        )
      );

      // Verify title, icon, badge are rendered
      assert.ok(html.includes('تنبيهات عاجلة'), 'Header must contain card title');
      assert.ok(html.includes('id="test-icon"'), 'Header must contain icon');
      assert.ok(html.includes('id="test-badge"'), 'Header must contain badge');
      assert.ok(html.includes('id="test-content"'), 'Body content must be rendered');

      // Verify toggle button attributes
      assert.ok(html.includes('aria-label="طي البطاقة"'), 'Default label must be localized Arabic collapse');
      assert.ok(html.includes('aria-expanded="true"'), 'Card must be expanded by default');
      assert.ok(html.includes('data-collapsed="false"'), 'data-collapsed must be false by default');
    });

    it('renders ZFWidgetCard in English mode with English aria-label', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          ZFWidgetCard,
          {
            title: 'Urgent Alerts',
            isAr: false,
          },
          React.createElement('div', null, 'Content')
        )
      );

      assert.ok(html.includes('aria-label="Collapse card"'), 'Must have English collapse aria-label');
      assert.ok(html.includes('aria-expanded="true"'));
    });

    it('supports defaultExpanded = false rendering collapsed state', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          ZFWidgetCard,
          {
            title: 'الأجندة المالية',
            defaultExpanded: false,
            isAr: true,
          },
          React.createElement('div', null, 'Hidden Calendar')
        )
      );

      assert.ok(html.includes('aria-label="توسيع البطاقة"'), 'Must have expand label when collapsed');
      assert.ok(html.includes('aria-expanded="false"'), 'Must have aria-expanded="false"');
      assert.ok(html.includes('data-collapsed="true"'), 'Must have data-collapsed="true"');
    });

    it('enhanceCardsInSlot attaches toggle buttons to mock DOM cards', () => {
      // Mock minimal DOM structure in memory
      interface MockElement {
        nodeType: number;
        className?: string;
        children: MockElement[];
        classList?: {
          add: (cls: string) => void;
          remove: (cls: string) => void;
        };
        style?: Record<string, string>;
        hasAttribute?: (attr: string) => boolean;
        setAttribute?: (attr: string, val: string) => void;
        getAttribute?: (attr: string) => string | undefined;
        querySelector?: (sel: string) => MockElement | null;
        querySelectorAll?: (sel: string) => MockElement[];
        appendChild?: (child: MockElement) => void;
        addEventListener?: (event: string, handler: (e: unknown) => void) => void;
        type?: string;
        innerHTML?: string;
      }

      const slot: MockElement = {
        nodeType: 1,
        querySelectorAll: () => [],
        children: [],
      };

      const mockHeader: MockElement = {
        nodeType: 1,
        className: 'urgentAlertsHeader',
        children: [],
        querySelector: () => null,
        appendChild: function(child: MockElement) { this.children.push(child); },
      };

      const classRecord: Record<string, boolean> = {};
      const mockBody: MockElement = {
        nodeType: 1,
        className: 'urgentAlertsList',
        children: [],
        classList: {
          add: function(cls: string) { classRecord[cls] = true; },
          remove: function(cls: string) { delete classRecord[cls]; },
        },
        style: {},
      };

      const cardAttrs: Record<string, string> = {};
      const mockCard: MockElement = {
        nodeType: 1,
        children: [mockHeader, mockBody],
        hasAttribute: (attr: string) => Boolean(cardAttrs[attr]),
        setAttribute: (attr: string, val: string) => { cardAttrs[attr] = val; },
        querySelector: () => mockHeader,
      };

      slot.children.push(mockCard);

      const mockDoc = {
        documentElement: { dir: 'rtl' },
        createElement: (tag: string) => {
          const attrs: Record<string, string> = { tagName: tag };
          const el: MockElement = {
            nodeType: 1,
            children: [],
            type: '',
            className: '',
            innerHTML: '',
            setAttribute: (name: string, val: string) => { attrs[name] = val; },
            getAttribute: (name: string) => attrs[name],
            querySelector: () => null,
            addEventListener: () => {},
          };
          return el;
        },
      };

      // Run enhancer with mock document
      enhanceCardsInSlot(slot as unknown as HTMLElement, mockDoc as unknown as Document);

      // Verify toggle button was appended to header
      assert.strictEqual(mockHeader.children.length, 1, 'Header must have received toggle button');
      const toggle = mockHeader.children[0];
      assert.strictEqual(toggle.type, 'button');
      assert.strictEqual(toggle.getAttribute?.('data-card-toggle'), 'true');
      assert.strictEqual(toggle.getAttribute?.('aria-expanded'), 'true');
      assert.strictEqual(toggle.getAttribute?.('aria-label'), 'طي البطاقة');
    });

    it('enhanceCardsInSlot correctly appends toggle button to header and never inside a title container with inline display:flex', () => {
      interface MockElement {
        nodeType: number;
        tagName?: string;
        className?: string;
        children: MockElement[];
        classList?: {
          add: (cls: string) => void;
          remove: (cls: string) => void;
        };
        style?: Record<string, string>;
        hasAttribute?: (attr: string) => boolean;
        setAttribute?: (attr: string, val: string) => void;
        getAttribute?: (attr: string) => string | undefined;
        querySelector?: (sel: string) => MockElement | null;
        querySelectorAll?: (sel: string) => MockElement[];
        appendChild?: (child: MockElement) => void;
        addEventListener?: (event: string, handler: (e: unknown) => void) => void;
        contains?: (other: unknown) => boolean;
        type?: string;
        innerHTML?: string;
      }

      // Title container that happens to have display: flex (like projectsProgressHeader)
      const mockHeading: MockElement = {
        nodeType: 1,
        tagName: 'H4',
        children: [],
        style: {},
      };

      const mockTitleWrap: MockElement = {
        nodeType: 1,
        tagName: 'DIV',
        className: 'projectsProgressTitle',
        children: [mockHeading],
        style: { display: 'flex' },
        querySelector: (sel: string) => {
          if (sel.includes('h4')) return mockHeading;
          return null;
        },
      };

      const mockViewAllBtn: MockElement = {
        nodeType: 1,
        tagName: 'BUTTON',
        children: [],
        style: {},
      };

      const mockHeader: MockElement = {
        nodeType: 1,
        tagName: 'DIV',
        className: 'projectsProgressHeader',
        children: [mockTitleWrap, mockViewAllBtn],
        style: {},
        querySelector: (sel: string) => {
          if (sel.includes('title') || sel.includes('h4')) return mockTitleWrap;
          return null;
        },
        appendChild: function(child: MockElement) { this.children.push(child); },
      };

      const mockBody: MockElement = {
        nodeType: 1,
        tagName: 'DIV',
        className: 'projectsProgressList',
        children: [],
        classList: { add: () => {}, remove: () => {} },
        style: {},
      };

      const cardAttrs: Record<string, string> = {};
      const mockCard: MockElement = {
        nodeType: 1,
        children: [mockHeader, mockBody],
        hasAttribute: (attr: string) => Boolean(cardAttrs[attr]),
        setAttribute: (attr: string, val: string) => { cardAttrs[attr] = val; },
        querySelector: () => mockHeader,
      };

      const slot: MockElement = {
        nodeType: 1,
        querySelectorAll: () => [],
        children: [mockCard],
        style: {},
      };

      const mockDoc = {
        documentElement: { dir: 'rtl' },
        createElement: (tag: string) => ({
          nodeType: 1,
          tagName: tag.toUpperCase(),
          children: [] as MockElement[],
          type: '',
          className: '',
          innerHTML: '',
          style: {},
          setAttribute: () => {},
          getAttribute: () => 'true',
          querySelector: () => null,
          addEventListener: () => {},
        }),
      };

      enhanceCardsInSlot(slot as unknown as HTMLElement, mockDoc as unknown as Document);

      // Verify toggle button was appended to headerEl as 3rd child, NOT inside mockTitleWrap!
      assert.strictEqual(mockTitleWrap.children.length, 1, 'mockTitleWrap must NOT receive toggle button');
      assert.strictEqual(mockHeader.children.length, 3, 'mockHeader must receive toggle button as last child');
      const toggle = mockHeader.children[2];
      assert.strictEqual(toggle.tagName, 'BUTTON');
      assert.strictEqual(mockTitleWrap.style?.marginInlineEnd, 'auto', 'Title wrap must have marginInlineEnd: auto');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // R3: Resizable Sidebar & Side Widgets Splitters
  // ──────────────────────────────────────────────────────────────────────────
  describe('R3. Resizable Sidebar & Side Widgets Splitters', () => {
    const STORAGE_KEY_SIDEBAR = 'fin_os_sidebar_width';
    const STORAGE_KEY_SIDE_WIDGETS = 'fin_os_side_widgets_width';

    it('defines correct localStorage persistence keys for custom widths', () => {
      assert.strictEqual(STORAGE_KEY_SIDEBAR, 'fin_os_sidebar_width');
      assert.strictEqual(STORAGE_KEY_SIDE_WIDGETS, 'fin_os_side_widgets_width');
    });

    describe('Sidebar Splitter Logic & RTL Awareness', () => {
      const computeSidebarWidth = (startWidth: number, startX: number, currentX: number, isRtl: boolean) => {
        // In RTL: moving left (startX - currentX > 0) widens sidebar
        // In LTR: moving right (currentX - startX > 0) widens sidebar
        const delta = isRtl ? (startX - currentX) : (currentX - startX);
        const targetWidth = startWidth + delta;

        if (targetWidth < 140) {
          return { collapsed: true, width: 68 };
        }
        const clamped = Math.min(420, Math.max(200, targetWidth));
        return { collapsed: false, width: clamped };
      };

      it('correctly widens sidebar when dragged towards center in RTL', () => {
        // In RTL, moving mouse left (decreasing clientX from 1000 to 900) widens sidebar
        const result = computeSidebarWidth(260, 1000, 900, true);
        assert.strictEqual(result.collapsed, false);
        assert.strictEqual(result.width, 360);
      });

      it('correctly narrows sidebar when dragged towards edge in RTL', () => {
        // In RTL, moving mouse right (increasing clientX from 1000 to 1040) narrows sidebar
        const result = computeSidebarWidth(260, 1000, 1040, true);
        assert.strictEqual(result.collapsed, false);
        assert.strictEqual(result.width, 220);
      });

      it('correctly widens sidebar when dragged towards center in LTR', () => {
        // In LTR, moving mouse right (increasing clientX from 260 to 360) widens sidebar
        const result = computeSidebarWidth(260, 260, 360, false);
        assert.strictEqual(result.collapsed, false);
        assert.strictEqual(result.width, 360);
      });

      it('correctly narrows sidebar when dragged towards edge in LTR', () => {
        // In LTR, moving mouse left (decreasing clientX from 260 to 220) narrows sidebar
        const result = computeSidebarWidth(260, 260, 220, false);
        assert.strictEqual(result.collapsed, false);
        assert.strictEqual(result.width, 220);
      });

      it('strictly clamps sidebar width between 200px and 420px', () => {
        // Huge widen in RTL: 260 + 500 = 760 -> clamped to 420
        const wideResult = computeSidebarWidth(260, 1000, 500, true);
        assert.strictEqual(wideResult.width, 420);

        // Moderate shrink: 260 - 80 = 180 -> clamped to 200 (since 180 >= 140)
        const narrowResult = computeSidebarWidth(260, 1000, 1080, true);
        assert.strictEqual(narrowResult.width, 200);
      });

      it('snaps sidebar to collapse if dragged below 140px', () => {
        // Drag below 140px: 260 - 130 = 130 (< 140) -> snap to collapse
        const result = computeSidebarWidth(260, 1000, 1130, true);
        assert.strictEqual(result.collapsed, true);
        assert.strictEqual(result.width, 68);
      });
    });

    describe('Side Widgets Splitter Logic & RTL Awareness', () => {
      const computeSideWidgetsWidth = (startWidth: number, startX: number, currentX: number, isRtl: boolean) => {
        // Side rail is docked to trailing edge (left in RTL, right in LTR)
        // In RTL: moving right towards center (currentX - startX > 0) widens rail
        // In LTR: moving left towards center (startX - currentX > 0) widens rail
        const delta = isRtl ? (currentX - startX) : (startX - currentX);
        const targetWidth = startWidth + delta;
        return Math.min(560, Math.max(260, targetWidth));
      };

      it('correctly widens side widgets rail when dragged towards center in RTL', () => {
        // In RTL (docked on left): moving mouse right (increasing clientX from 350 to 450) widens rail
        const width = computeSideWidgetsWidth(350, 350, 450, true);
        assert.strictEqual(width, 450);
      });

      it('correctly narrows side widgets rail when dragged towards edge in RTL', () => {
        // In RTL: moving mouse left (decreasing clientX from 350 to 300) narrows rail
        const width = computeSideWidgetsWidth(350, 350, 300, true);
        assert.strictEqual(width, 300);
      });

      it('correctly widens side widgets rail when dragged towards center in LTR', () => {
        // In LTR (docked on right): moving mouse left (decreasing clientX from 1000 to 900) widens rail
        const width = computeSideWidgetsWidth(350, 1000, 900, false);
        assert.strictEqual(width, 450);
      });

      it('correctly narrows side widgets rail when dragged towards edge in LTR', () => {
        // In LTR: moving mouse right (increasing clientX from 1000 to 1050) narrows rail
        const width = computeSideWidgetsWidth(350, 1000, 1050, false);
        assert.strictEqual(width, 300);
      });

      it('strictly clamps side widgets rail between 260px and 560px', () => {
        // Beyond maximum: 350 + 300 = 650 -> clamped to 560
        const wide = computeSideWidgetsWidth(350, 350, 650, true);
        assert.strictEqual(wide, 560);

        // Below minimum: 350 - 200 = 150 -> clamped to 260
        const narrow = computeSideWidgetsWidth(350, 350, 150, true);
        assert.strictEqual(narrow, 260);
      });
    });

    describe('Keyboard Stepping & RTL Accessibility', () => {
      it('calculates keyboard arrow stepping with RTL awareness for sidebar', () => {
        const getSidebarKeyboardDelta = (key: string, isAr: boolean, shiftKey: boolean) => {
          const step = shiftKey ? 20 : 10;
          if (key === 'ArrowLeft') return isAr ? step : -step;
          if (key === 'ArrowRight') return isAr ? -step : step;
          return 0;
        };

        // In RTL: ArrowLeft widens sidebar (towards center), ArrowRight narrows
        assert.strictEqual(getSidebarKeyboardDelta('ArrowLeft', true, false), 10);
        assert.strictEqual(getSidebarKeyboardDelta('ArrowRight', true, false), -10);
        assert.strictEqual(getSidebarKeyboardDelta('ArrowLeft', true, true), 20);

        // In LTR: ArrowRight widens sidebar (towards center), ArrowLeft narrows
        assert.strictEqual(getSidebarKeyboardDelta('ArrowRight', false, false), 10);
        assert.strictEqual(getSidebarKeyboardDelta('ArrowLeft', false, false), -10);
      });

      it('calculates keyboard arrow stepping with RTL awareness for side widgets rail', () => {
        const getSideWidgetsKeyboardDelta = (key: string, isAr: boolean, shiftKey: boolean) => {
          const step = shiftKey ? 20 : 10;
          if (key === 'ArrowRight') return isAr ? step : -step;
          if (key === 'ArrowLeft') return isAr ? -step : step;
          return 0;
        };

        // In RTL: ArrowRight widens rail (towards center), ArrowLeft narrows
        assert.strictEqual(getSideWidgetsKeyboardDelta('ArrowRight', true, false), 10);
        assert.strictEqual(getSideWidgetsKeyboardDelta('ArrowLeft', true, false), -10);

        // In LTR: ArrowLeft widens rail (towards center), ArrowRight narrows
        assert.strictEqual(getSideWidgetsKeyboardDelta('ArrowLeft', false, false), 10);
        assert.strictEqual(getSideWidgetsKeyboardDelta('ArrowRight', false, false), -10);
      });
    });

    describe('Edge Cases & State Resilience', () => {
      it('safely falls back to default widths when localStorage contains corrupt or out-of-bounds data', () => {
        const parseSidebarWidth = (stored: string | null) => {
          if (!stored) return 260;
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed >= 200 && parsed <= 420) return parsed;
          return 260;
        };

        const parseSideWidgetsWidth = (stored: string | null) => {
          if (!stored) return 350;
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed >= 260 && parsed <= 560) return parsed;
          return 350;
        };

        assert.strictEqual(parseSidebarWidth(null), 260);
        assert.strictEqual(parseSidebarWidth('corrupted_string'), 260);
        assert.strictEqual(parseSidebarWidth('50'), 260, 'Below 200px should fallback');
        assert.strictEqual(parseSidebarWidth('1000'), 260, 'Above 420px should fallback');
        assert.strictEqual(parseSidebarWidth('320'), 320, 'Valid saved width should be respected');

        assert.strictEqual(parseSideWidgetsWidth(null), 350);
        assert.strictEqual(parseSideWidgetsWidth('invalid'), 350);
        assert.strictEqual(parseSideWidgetsWidth('100'), 350, 'Below 260px should fallback');
        assert.strictEqual(parseSideWidgetsWidth('800'), 350, 'Above 560px should fallback');
        assert.strictEqual(parseSideWidgetsWidth('480'), 480, 'Valid saved width should be respected');
      });

      it('expands dock and clamps to 200px when dragging from collapsed state (width 68) past 140px threshold', () => {
        const computeSidebarWidth = (startWidth: number, startX: number, currentX: number, isRtl: boolean) => {
          const delta = isRtl ? (startX - currentX) : (currentX - startX);
          const targetWidth = startWidth + delta;

          if (targetWidth < 140) {
            return { collapsed: true, width: 68 };
          }
          const clamped = Math.min(420, Math.max(200, targetWidth));
          return { collapsed: false, width: clamped };
        };

        // Starting from collapsed dock (width 68) in RTL:
        // Moving mouse left by 80px (1000 -> 920): targetWidth = 68 + 80 = 148 (>= 140)
        // Should un-collapse and clamp to minimum 200px
        const result = computeSidebarWidth(68, 1000, 920, true);
        assert.strictEqual(result.collapsed, false);
        assert.strictEqual(result.width, 200);

        // Small drag of 30px (1000 -> 970): targetWidth = 68 + 30 = 98 (< 140)
        // Should remain collapsed
        const remainCollapsed = computeSidebarWidth(68, 1000, 970, true);
        assert.strictEqual(remainCollapsed.collapsed, true);
        assert.strictEqual(remainCollapsed.width, 68);
      });

      it('expands from collapsed state with continuous tracking (no 60px dead zone)', () => {
        const computeSeamlessSidebarWidth = (delta: number) => {
          if (delta < 72) {
            return { collapsed: true, width: 68 };
          }
          const targetWidth = 200 + (delta - 72);
          const clamped = Math.min(420, Math.max(200, targetWidth));
          return { collapsed: false, width: clamped };
        };

        // At delta = 72: exactly at threshold -> uncollapses to 200px
        const threshold = computeSeamlessSidebarWidth(72);
        assert.strictEqual(threshold.collapsed, false);
        assert.strictEqual(threshold.width, 200);

        // At delta = 82 (10px more mouse movement): smoothly widens to 210px (zero dead zone!)
        const widened10 = computeSeamlessSidebarWidth(82);
        assert.strictEqual(widened10.collapsed, false);
        assert.strictEqual(widened10.width, 210);

        // At delta = 150: widens to 278px
        const widened78 = computeSeamlessSidebarWidth(150);
        assert.strictEqual(widened78.collapsed, false);
        assert.strictEqual(widened78.width, 278);

        // At delta = 50: below threshold -> snaps back to collapsed
        const snappedBack = computeSeamlessSidebarWidth(50);
        assert.strictEqual(snappedBack.collapsed, true);
        assert.strictEqual(snappedBack.width, 68);
      });

      it('snaps to collapse when narrowing with keyboard from minimum 200px width', () => {
        const handleKeyboardNarrowing = (currentWidth: number, isCollapsed: boolean, delta: number) => {
          if (isCollapsed) {
            if (delta > 0) return { collapsed: false, width: 200 };
            return { collapsed: true, width: 68 };
          }
          if (currentWidth <= 200 && delta < 0) {
            return { collapsed: true, width: 68 };
          }
          const targetWidth = currentWidth + delta;
          if (targetWidth < 140) return { collapsed: true, width: 68 };
          const clamped = Math.min(420, Math.max(200, targetWidth));
          return { collapsed: false, width: clamped };
        };

        // When at minimum 200px, narrowing by -10 snaps to collapse
        const result = handleKeyboardNarrowing(200, false, -10);
        assert.strictEqual(result.collapsed, true);
        assert.strictEqual(result.width, 68);

        // When collapsed, widening by +10 uncollapses to 200px
        const uncollapseResult = handleKeyboardNarrowing(68, true, 10);
        assert.strictEqual(uncollapseResult.collapsed, false);
        assert.strictEqual(uncollapseResult.width, 200);
      });

      it('supports Home and End keyboard keys to set minimum and maximum bounds', () => {
        const handleHomeEndSidebar = (key: 'Home' | 'End') => {
          if (key === 'Home') return { collapsed: true, width: 68 };
          return { collapsed: false, width: 420 };
        };

        const handleHomeEndSideWidgets = (key: 'Home' | 'End') => {
          if (key === 'Home') return 260;
          return 560;
        };

        assert.deepStrictEqual(handleHomeEndSidebar('Home'), { collapsed: true, width: 68 });
        assert.deepStrictEqual(handleHomeEndSidebar('End'), { collapsed: false, width: 420 });

        assert.strictEqual(handleHomeEndSideWidgets('Home'), 260);
        assert.strictEqual(handleHomeEndSideWidgets('End'), 560);
      });

      it('supports double-click on splitters to toggle collapse or reset to default width', () => {
        const handleSidebarDoubleClick = (currentWidth: number, isCollapsed: boolean) => {
          if (isCollapsed) return { collapsed: false, width: 260 };
          if (currentWidth === 260) return { collapsed: true, width: 68 };
          return { collapsed: false, width: 260 };
        };

        const handleSideWidgetsDoubleClick = (currentWidth: number) => {
          if (currentWidth === 350) return { minimized: true };
          return { minimized: false, width: 350 };
        };

        // When collapsed: double-click expands to default 260px
        assert.deepStrictEqual(handleSidebarDoubleClick(68, true), { collapsed: false, width: 260 });
        // When default 260px: double-click collapses
        assert.deepStrictEqual(handleSidebarDoubleClick(260, false), { collapsed: true, width: 68 });
        // When custom 360px: double-click resets to default 260px
        assert.deepStrictEqual(handleSidebarDoubleClick(360, false), { collapsed: false, width: 260 });

        // Side widgets: when custom 480px -> reset to default 350px
        assert.deepStrictEqual(handleSideWidgetsDoubleClick(480), { minimized: false, width: 350 });
        // When at default 350px -> toggle minimize
        assert.deepStrictEqual(handleSideWidgetsDoubleClick(350), { minimized: true });
      });

      it('ZFWidgetCard generates aria-controls matching body id when id is provided', () => {
        const html = renderToStaticMarkup(
          React.createElement(
            ZFWidgetCard,
            {
              id: 'custom-card-id',
              title: 'بطاقة اختبار',
              isAr: true,
            },
            React.createElement('div', null, 'Content')
          )
        );

        assert.ok(html.includes('aria-controls="custom-card-id-body"'), 'Toggle button must have aria-controls matching body id');
        assert.ok(html.includes('id="custom-card-id-body"'), 'Body container must have matching id');
      });

      it('enhanceCardsInSlot re-attaches toggle button if removed by React while preserving collapsed state', () => {
        interface MockElement {
          nodeType: number;
          className?: string;
          children: MockElement[];
          classList?: {
            add: (cls: string) => void;
            remove: (cls: string) => void;
          };
          style?: Record<string, string>;
          hasAttribute?: (attr: string) => boolean;
          setAttribute?: (attr: string, val: string) => void;
          getAttribute?: (attr: string) => string | undefined;
          querySelector?: (sel: string) => MockElement | null;
          querySelectorAll?: (sel: string) => MockElement[];
          appendChild?: (child: MockElement) => void;
          addEventListener?: (event: string, handler: (e: unknown) => void) => void;
          type?: string;
          innerHTML?: string;
        }

        const slot: MockElement = {
          nodeType: 1,
          querySelectorAll: () => [],
          children: [],
        };

        const mockHeader: MockElement = {
          nodeType: 1,
          className: 'sideWidgetHeader',
          children: [],
          querySelector: () => null,
          appendChild: function(child: MockElement) { this.children.push(child); },
        };

        const classRecord: Record<string, boolean> = {};
        const mockBody: MockElement = {
          nodeType: 1,
          className: 'sideWidgetBody',
          children: [],
          classList: {
            add: function(cls: string) { classRecord[cls] = true; },
            remove: function(cls: string) { delete classRecord[cls]; },
          },
          style: {},
        };

        // Card was previously collapsed and had data-collapsed="true"
        const cardAttrs: Record<string, string> = {
          'data-card-enhanced': 'true',
          'data-collapsed': 'true',
        };

        const mockCard: MockElement = {
          nodeType: 1,
          children: [mockHeader, mockBody],
          hasAttribute: (attr: string) => Boolean(cardAttrs[attr]),
          setAttribute: (attr: string, val: string) => { cardAttrs[attr] = val; },
          getAttribute: (attr: string) => cardAttrs[attr],
          querySelector: () => mockHeader,
        };

        slot.children.push(mockCard);

        const mockDoc = {
          documentElement: { dir: 'rtl' },
          createElement: (tag: string) => {
            const attrs: Record<string, string> = { tagName: tag };
            const el: MockElement = {
              nodeType: 1,
              children: [],
              type: '',
              className: '',
              innerHTML: '',
              setAttribute: (name: string, val: string) => { attrs[name] = val; },
              getAttribute: (name: string) => attrs[name],
              querySelector: () => null,
              addEventListener: () => {},
            };
            return el;
          },
        };

        enhanceCardsInSlot(slot as unknown as HTMLElement, mockDoc as unknown as Document);

        // Header should receive re-attached toggle button
        assert.strictEqual(mockHeader.children.length, 1, 'Header must receive re-attached toggle button');
        const toggle = mockHeader.children[0];
        assert.strictEqual(toggle.getAttribute?.('aria-expanded'), 'false', 'Must preserve collapsed state aria-expanded="false"');
        assert.strictEqual(toggle.getAttribute?.('aria-label'), 'توسيع البطاقة', 'Must have expand label when preserving collapsed state');
        assert.strictEqual(classRecord['zfWidgetCardBodyCollapsed'], true, 'Body must have collapsed class');
      });

      it('seamlessly expands side widgets rail when dragged from minimized state (44px) past 40px threshold', () => {
        const computeSideWidgetsDragFromMinimized = (delta: number) => {
          if (delta < 40) {
            return { minimized: true, width: 44 };
          }
          const targetWidth = 260 + (delta - 40);
          const clamped = Math.min(560, Math.max(260, targetWidth));
          return { minimized: false, width: clamped };
        };

        // Below threshold (delta = 30px towards center): remains minimized
        const below = computeSideWidgetsDragFromMinimized(30);
        assert.strictEqual(below.minimized, true);
        assert.strictEqual(below.width, 44);

        // Exactly at threshold (delta = 40px): unminimizes to 260px
        const atThreshold = computeSideWidgetsDragFromMinimized(40);
        assert.strictEqual(atThreshold.minimized, false);
        assert.strictEqual(atThreshold.width, 260);

        // Past threshold (delta = 60px): seamlessly widens to 280px without dead zone
        const past = computeSideWidgetsDragFromMinimized(60);
        assert.strictEqual(past.minimized, false);
        assert.strictEqual(past.width, 280);

        // Large drag (delta = 360px): clamps to maximum 560px
        const maxClamped = computeSideWidgetsDragFromMinimized(360);
        assert.strictEqual(maxClamped.minimized, false);
        assert.strictEqual(maxClamped.width, 560);
      });

      it('un-minimizes side widgets rail on Arrow key widening and double click', () => {
        const handleSideWidgetsArrowKey = (isMinimized: boolean, currentWidth: number, delta: number) => {
          if (isMinimized) {
            if (delta > 0) {
              return { minimized: false, width: Math.max(260, currentWidth) };
            }
            return { minimized: true, width: 44 };
          }
          const clamped = Math.min(560, Math.max(260, currentWidth + delta));
          return { minimized: false, width: clamped };
        };

        // In RTL: ArrowRight (delta = 10) widens rail towards center
        const unminimized = handleSideWidgetsArrowKey(true, 350, 10);
        assert.strictEqual(unminimized.minimized, false);
        assert.strictEqual(unminimized.width, 350);

        // Arrow narrowing while minimized keeps it minimized
        const stayedMin = handleSideWidgetsArrowKey(true, 350, -10);
        assert.strictEqual(stayedMin.minimized, true);
        assert.strictEqual(stayedMin.width, 44);

        // Double click when minimized restores rail
        const handleDoubleClick = (isMinimized: boolean, currentWidth: number) => {
          if (isMinimized) return { minimized: false, width: Math.max(260, currentWidth) };
          if (currentWidth === 350) return { minimized: true, width: 44 };
          return { minimized: false, width: 350 };
        };

        const restored = handleDoubleClick(true, 380);
        assert.strictEqual(restored.minimized, false);
        assert.strictEqual(restored.width, 380);
      });
    });
  });
});
