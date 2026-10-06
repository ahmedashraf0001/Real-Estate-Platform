'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { 
  AlertTriangle, 
  Compass, 
  X, 
  PanelRight, 
  PanelLeftClose, 
  PanelLeftOpen, 
  PanelRightClose, 
  PanelRightOpen, 
  SlidersHorizontal, 
  Zap, 
  LineChart, 
  BookOpen,
  HardHat,
  Calendar,
  Users,
  Calculator,
  Coins,
  Receipt,
  ArrowLeftRight,
  FileSignature
} from 'lucide-react';
import { getAvailableCash } from '@/lib/erp/canonicalMetrics';

import shellStyles from './v2/ZFWorkstationShell.module.css';
import '@/components/erp/erpTokens.css';

import { useERPWorkstation } from './context/ERPWorkstationContext';
import { ZFWorkstationHeader } from './v2/ZFWorkstationHeader';
import { ZFNavigationDock, ERPNavModule } from './ZFNavigationDock';
import { ZFERPLoadingWorkstation } from './v2/ZFERPLoadingWorkstation';
import { LockedPeriodBanner } from '@/components/erp/LockedPeriodBanner';

// Modals & Inspection Modals
import { ZFInspectorDrawer } from './ZFInspectorDrawer';
import { ZFQuickSearchModal } from './ZFQuickSearchModal';
import { ZFErpAcademyModal } from './ZFErpAcademyModal';
import { ZFErpGuidedTour } from './ZFErpGuidedTour';
import { ZFNotificationCenter } from './ZFNotificationCenter';
import { NewContractWizardModal } from './v2/modals/NewContractWizardModal';
import { ZFCollectInstallmentModal } from './v2/modals/ZFCollectInstallmentModal';
import { ContractEscalationModal } from './v2/modals/ContractEscalationModal';
import { RescissionSettlementModal } from './v2/modals/RescissionSettlementModal';
import { RSVAllocationModal } from './v2/modals/RSVAllocationModal';
import { HandoverExecutionModal } from './v2/modals/HandoverExecutionModal';
import { NewChequeModal } from './NewChequeModal';
import { ZFDirectExpenseModal } from './v2/modals/ZFDirectExpenseModal';
import { ZFCashTransferModal } from './v2/modals/ZFCashTransferModal';
import { PropertyLifecycleAuditModal } from './PropertyLifecycleAuditModal';
import { PartnerPayoutModal } from './v2/modals/PartnerPayoutModal';
import { NewPartnerProfileModal } from './v2/modals/NewPartnerProfileModal';
import { PartnerCapitalInjectionModal } from './v2/modals/PartnerCapitalInjectionModal';
import { PartnerDossierModal } from './v2/modals/PartnerDossierModal';

const MODULE_TITLES_AR: Record<string, string> = {
  dashboard: 'لوحة القيادة',
  cockpit: 'لوحة القيادة',
  operations: 'الخزينة والعمليات اليومية',
  properties: 'العقارات والوحدات',
  construction: 'تكاليف البناء ومستحقات المقاولين',
  calculator: 'حاسبة التكاليف والتسعير',
  contracts: 'عقود البيع',
  pdc: 'أجندة المستحقات',
  rescissions: 'فسخ العقود والتسويات',
  ledger: 'الحسابات ودفتر اليومية',
  'cost-allocation': 'توزيع تكاليف البناء',
  tax: 'الضرائب والرسوم والتراخيص',
  partners: 'الشركاء ورؤوس الأموال',
  analysis: 'تحليل العقارات',
};

const MODULE_TITLES_EN: Record<string, string> = {
  dashboard: 'Dashboard',
  cockpit: 'Dashboard',
  operations: 'Treasury & daily operations',
  properties: 'Properties & units',
  construction: 'Construction costs & contractor dues',
  calculator: 'Cost & pricing calculator',
  contracts: 'Sales contracts',
  pdc: 'Dues agenda',
  rescissions: 'Contract rescissions',
  ledger: 'Accounts & journal',
  'cost-allocation': 'Cost allocation',
  tax: 'Taxes, fees & permits',
  partners: 'Partners & capital',
  analysis: 'Property analysis',
};

const SIDE_WIDGETS_CONFIG_AR: Record<string, { title: string; badge?: string; icon: React.ComponentType<{ size?: number | string; strokeWidth?: number; className?: string }> }> = {
  dashboard: { title: 'مركز التنبيهات والأجندة المالية', badge: '', icon: SlidersHorizontal },
  cockpit: { title: 'مركز التنبيهات والأجندة المالية', badge: '', icon: SlidersHorizontal },
  operations: { title: 'العمليات السريعة والخزينة', badge: '', icon: Zap },
  'daily-operations': { title: 'العمليات السريعة والخزينة', badge: '', icon: Zap },
  analysis: { title: 'بيانات العقار والتحليل المالي', badge: '', icon: LineChart },
  ledger: { title: 'دليل الحسابات وأدوات اليومية', badge: '', icon: BookOpen },
  journal: { title: 'دليل الحسابات وأدوات اليومية', badge: '', icon: BookOpen },
  construction: { title: 'ملخص المقاولين ومصاريف البناء', badge: '', icon: HardHat },
  pdc: { title: 'أجندة الخزينة والتحليلات', badge: '', icon: Calendar },
  vault: { title: 'أجندة الخزينة والتحليلات', badge: '', icon: Calendar },
  partners: { title: 'إحصائيات الشركاء والعمليات السريعة', badge: '', icon: Users },
  partner: { title: 'إحصائيات الشركاء والعمليات السريعة', badge: '', icon: Users },
  calculator: { title: 'أدوات الجدوى وهيكلة التكاليف', badge: '', icon: Calculator },
  feasibility: { title: 'أدوات الجدوى وهيكلة التكاليف', badge: '', icon: Calculator },
};

const SIDE_WIDGETS_CONFIG_EN: Record<string, { title: string; badge?: string; icon: React.ComponentType<{ size?: number | string; strokeWidth?: number; className?: string }> }> = {
  dashboard: { title: 'Alerts & Financial Agenda', badge: '', icon: SlidersHorizontal },
  cockpit: { title: 'Alerts & Financial Agenda', badge: '', icon: SlidersHorizontal },
  operations: { title: 'Quick Operations & Treasury', badge: '', icon: Zap },
  'daily-operations': { title: 'Quick Operations & Treasury', badge: '', icon: Zap },
  analysis: { title: 'Property Data & Lifecycle', badge: '', icon: LineChart },
  ledger: { title: 'Chart of Accounts & Ledger Tools', badge: '', icon: BookOpen },
  journal: { title: 'Chart of Accounts & Ledger Tools', badge: '', icon: BookOpen },
  construction: { title: 'Contractors & Construction Summary', badge: '', icon: HardHat },
  pdc: { title: 'Vault Agenda & Analytics', badge: '', icon: Calendar },
  vault: { title: 'Vault Agenda & Analytics', badge: '', icon: Calendar },
  partners: { title: 'Partner Analytics & Quick Actions', badge: '', icon: Users },
  partner: { title: 'Partner Analytics & Quick Actions', badge: '', icon: Users },
  calculator: { title: 'Feasibility & Cost Structuring', badge: '', icon: Calculator },
  feasibility: { title: 'Feasibility & Cost Structuring', badge: '', icon: Calculator },
};

export function ERPWorkstationShell({ children }: { children: React.ReactNode }) {
  const erp = useERPWorkstation();
  const pathname = usePathname() || '';
  const stageRef = useRef<HTMLElement | null>(null);
  const cash = useMemo(() => getAvailableCash(erp.data.journalEntries), [erp.data.journalEntries]);

  // Auto-scroll stage to top on pathname changes
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.scrollTop = 0;
    }
  }, [pathname]);

  // Auto-route legacy collectingPDCItem callers to modern collectRequest modal
  useEffect(() => {
    if (!erp.collectingPDCItem) return;
    const item = erp.collectingPDCItem;
    const rawSched = item.schedule_id || (item.cheque_id?.startsWith('SCH-') ? item.cheque_id : undefined);
    const scheduleId = rawSched ? rawSched.replace(/^SCH-/, '') : undefined;
    erp.openCollect({
      contractId: item.contract_id,
      scheduleId,
    });
    erp.setCollectingPDCItem(null);
  }, [erp.collectingPDCItem, erp.openCollect, erp.setCollectingPDCItem]);

  // Splitter and side widgets resizable & collapsible states
  const [sidebarWidth, setSidebarWidth] = useState<number>(260);
  const [sideWidgetsWidth, setSideWidgetsWidth] = useState<number>(350);
  const [isSideWidgetsMinimized, setIsSideWidgetsMinimized] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const [isDraggingSidebar, setIsDraggingSidebar] = useState<boolean>(false);
  const [isDraggingSideWidgets, setIsDraggingSideWidgets] = useState<boolean>(false);

  const sidebarWidthRef = useRef<number>(sidebarWidth);
  const sideWidgetsWidthRef = useRef<number>(sideWidgetsWidth);
  const isSideWidgetsMinimizedRef = useRef<boolean>(isSideWidgetsMinimized);
  const isDockCollapsedRef = useRef<boolean>(erp.isDockCollapsed);
  const handleToggleDockRef = useRef<() => void>(erp.handleToggleDock);

  // Synchronize refs in effect to strictly comply with React 19 concurrent render rules
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
    sideWidgetsWidthRef.current = sideWidgetsWidth;
    isSideWidgetsMinimizedRef.current = isSideWidgetsMinimized;
    isDockCollapsedRef.current = erp.isDockCollapsed;
    handleToggleDockRef.current = erp.handleToggleDock;
  }, [sidebarWidth, sideWidgetsWidth, isSideWidgetsMinimized, erp.isDockCollapsed, erp.handleToggleDock]);

  /**
   * triggerLayoutReflow
   * Triggers an immediate reflow after React commits DOM updates (via RAF)
   * and a second reflow after CSS width transitions finish (at 220ms),
   * guaranteeing that ApexCharts and middle-stage container queries measure exact dimensions.
   */
  const triggerLayoutReflow = useCallback(() => {
    if (typeof window === 'undefined') return;
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 220);
    });
  }, []);

  // Sync state from localStorage on initial client mount without layout animation glitch
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      try {
        if (typeof window !== 'undefined') {
          let changed = false;
          const savedSidebar = localStorage.getItem('fin_os_sidebar_width');
          if (savedSidebar) {
            const parsed = parseInt(savedSidebar, 10);
            if (!isNaN(parsed) && parsed >= 200 && parsed <= 420 && parsed !== 260) {
              setSidebarWidth(parsed);
              changed = true;
            }
          }

          const savedWidgets = localStorage.getItem('fin_os_side_widgets_width');
          if (savedWidgets) {
            const parsed = parseInt(savedWidgets, 10);
            if (!isNaN(parsed) && parsed >= 260 && parsed <= 560 && parsed !== 350) {
              setSideWidgetsWidth(parsed);
              changed = true;
            }
          }

          const savedMinimized = localStorage.getItem('fin_os_side_widgets_minimized');
          if (savedMinimized !== null) {
            const isMin = savedMinimized === 'true';
            if (isMin) {
              setIsSideWidgetsMinimized(true);
              changed = true;
            }
          }

          if (changed) {
            triggerLayoutReflow();
          }
        }
      } catch {
        // Safe fallback if localStorage is restricted
      }
      setIsHydrated(true);
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [triggerLayoutReflow]);

  const handleToggleMinimizeSideWidgets = useCallback(() => {
    setIsSideWidgetsMinimized((prev) => {
      const next = !prev;
      isSideWidgetsMinimizedRef.current = next;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('fin_os_side_widgets_minimized', String(next));
          triggerLayoutReflow();
        }
      } catch {
        // Safe fallback
      }
      return next;
    });
  }, [triggerLayoutReflow]);

  // 1. Sidebar drag-to-resize handler with bounds [200, 420] and snap-collapse below 140px
  const handleSidebarResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const targetEl = e.currentTarget as HTMLElement;
    try {
      targetEl.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore if setPointerCapture unsupported
    }

    const startX = e.clientX;
    const isStartedCollapsed = isDockCollapsedRef.current;
    const startWidth = isStartedCollapsed ? 68 : sidebarWidthRef.current;
    let localCollapsed = isStartedCollapsed;
    const isRtl = erp.isAr;
    setIsDraggingSidebar(true);

    let rafId: number | null = null;
    let latestClientX = startX;

    const applyResize = () => {
      rafId = null;
      // In RTL (sidebar docked to right window edge): moving left towards center increases sidebar width
      // In LTR (sidebar docked to left window edge): moving right towards center increases sidebar width
      const delta = isRtl ? (startX - latestClientX) : (latestClientX - startX);

      if (isStartedCollapsed) {
        // Dragging to expand from collapsed dock (width: 68)
        // Threshold: 140px (delta = 72px from 68)
        if (delta < 72) {
          if (!localCollapsed) {
            localCollapsed = true;
            handleToggleDockRef.current();
          }
        } else {
          // Immediately seamlessly widen from 200px without dead zone
          const targetWidth = 200 + (delta - 72);
          const clamped = Math.min(420, Math.max(200, targetWidth));
          setSidebarWidth(clamped);
          sidebarWidthRef.current = clamped;
          if (localCollapsed) {
            localCollapsed = false;
            handleToggleDockRef.current();
          }
        }
      } else {
        // Dragging from expanded state
        const targetWidth = startWidth + delta;
        if (targetWidth < 140) {
          if (!localCollapsed) {
            localCollapsed = true;
            handleToggleDockRef.current();
          }
        } else {
          const clamped = Math.min(420, Math.max(200, targetWidth));
          setSidebarWidth(clamped);
          sidebarWidthRef.current = clamped;
          if (localCollapsed) {
            localCollapsed = false;
            handleToggleDockRef.current();
          }
        }
      }
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      latestClientX = moveEvent.clientX;
      if (rafId === null) {
        rafId = window.requestAnimationFrame(applyResize);
      }
    };

    const cleanUp = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
        applyResize();
      }
      setIsDraggingSidebar(false);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('fin_os_sidebar_width', String(sidebarWidthRef.current));
          triggerLayoutReflow();
        }
      } catch {
        // Safe fallback
      }
      window.removeEventListener('pointermove', onPointerMove, { capture: true });
      window.removeEventListener('pointerup', cleanUp, { capture: true });
      window.removeEventListener('pointercancel', cleanUp, { capture: true });
      window.removeEventListener('blur', cleanUp);
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('cursor');
      try {
        targetEl.releasePointerCapture?.(e.pointerId);
      } catch {
        // Ignore
      }
    };

    document.body.style.setProperty('user-select', 'none');
    document.body.style.setProperty('cursor', 'col-resize');
    window.addEventListener('pointermove', onPointerMove, { capture: true });
    window.addEventListener('pointerup', cleanUp, { capture: true });
    window.addEventListener('pointercancel', cleanUp, { capture: true });
    window.addEventListener('blur', cleanUp);
  }, [erp.isAr, triggerLayoutReflow]);

  // 2. Side widgets drag-to-resize handler with bounds [260, 560] and expand from minimized (44px)
  const handleSideWidgetsResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const targetEl = e.currentTarget as HTMLElement;
    try {
      targetEl.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }

    const startX = e.clientX;
    const isStartedMinimized = isSideWidgetsMinimizedRef.current;
    const startWidth = isStartedMinimized ? 44 : sideWidgetsWidthRef.current;
    let localMinimized = isStartedMinimized;
    const isRtl = erp.isAr;
    setIsDraggingSideWidgets(true);

    let rafId: number | null = null;
    let latestClientX = startX;

    const applyResize = () => {
      rafId = null;
      // In RTL (side rail docked to left window edge): moving right towards center increases rail width
      // In LTR (side rail docked to right window edge): moving left towards center increases rail width
      const delta = isRtl ? (latestClientX - startX) : (startX - latestClientX);

      if (isStartedMinimized) {
        // Dragging to expand from 44px minimized strip
        // Threshold: 40px mouse movement towards center
        if (delta < 40) {
          if (!localMinimized) {
            localMinimized = true;
            setIsSideWidgetsMinimized(true);
            isSideWidgetsMinimizedRef.current = true;
          }
        } else {
          // Immediately unminimize and seamlessly scale up from 260px without dead zone
          const targetWidth = 260 + (delta - 40);
          const clamped = Math.min(560, Math.max(260, targetWidth));
          setSideWidgetsWidth(clamped);
          sideWidgetsWidthRef.current = clamped;
          if (localMinimized) {
            localMinimized = false;
            setIsSideWidgetsMinimized(false);
            isSideWidgetsMinimizedRef.current = false;
          }
        }
      } else {
        const targetWidth = startWidth + delta;
        const clamped = Math.min(560, Math.max(260, targetWidth));
        setSideWidgetsWidth(clamped);
        sideWidgetsWidthRef.current = clamped;
      }
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      latestClientX = moveEvent.clientX;
      if (rafId === null) {
        rafId = window.requestAnimationFrame(applyResize);
      }
    };

    const cleanUp = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
        applyResize();
      }
      setIsDraggingSideWidgets(false);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('fin_os_side_widgets_width', String(sideWidgetsWidthRef.current));
          localStorage.setItem('fin_os_side_widgets_minimized', String(isSideWidgetsMinimizedRef.current));
          triggerLayoutReflow();
        }
      } catch {
        // Safe fallback
      }
      window.removeEventListener('pointermove', onPointerMove, { capture: true });
      window.removeEventListener('pointerup', cleanUp, { capture: true });
      window.removeEventListener('pointercancel', cleanUp, { capture: true });
      window.removeEventListener('blur', cleanUp);
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('cursor');
      try {
        targetEl.releasePointerCapture?.(e.pointerId);
      } catch {
        // Ignore
      }
    };

    document.body.style.setProperty('user-select', 'none');
    document.body.style.setProperty('cursor', 'col-resize');
    window.addEventListener('pointermove', onPointerMove, { capture: true });
    window.addEventListener('pointerup', cleanUp, { capture: true });
    window.addEventListener('pointercancel', cleanUp, { capture: true });
    window.addEventListener('blur', cleanUp);
  }, [erp.isAr, triggerLayoutReflow]);

  const handleSidebarKeyDown = (e: React.KeyboardEvent) => {
    let delta = 0;
    const step = e.shiftKey ? 20 : 10;
    if (e.key === 'ArrowLeft') delta = erp.isAr ? step : -step;
    else if (e.key === 'ArrowRight') delta = erp.isAr ? -step : step;
    else if (e.key === 'Home') {
      e.preventDefault();
      if (!isDockCollapsedRef.current) {
        handleToggleDockRef.current();
        triggerLayoutReflow();
      }
      return;
    } else if (e.key === 'End') {
      e.preventDefault();
      setSidebarWidth(420);
      sidebarWidthRef.current = 420;
      if (isDockCollapsedRef.current) handleToggleDockRef.current();
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('fin_os_sidebar_width', '420');
          triggerLayoutReflow();
        }
      } catch {}
      return;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggleDockRef.current();
      triggerLayoutReflow();
      return;
    } else {
      return;
    }

    e.preventDefault();

    // If currently collapsed:
    if (isDockCollapsedRef.current) {
      if (delta > 0) {
        handleToggleDockRef.current();
        const initial = Math.max(200, sidebarWidthRef.current);
        setSidebarWidth(initial);
        sidebarWidthRef.current = initial;
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('fin_os_sidebar_width', String(initial));
            triggerLayoutReflow();
          }
        } catch {}
      }
      return;
    }

    // Currently expanded:
    if (sidebarWidthRef.current <= 200 && delta < 0) {
      // At minimum boundary and narrowing further -> snap to collapse
      handleToggleDockRef.current();
      triggerLayoutReflow();
      return;
    }

    const targetWidth = sidebarWidthRef.current + delta;
    if (targetWidth < 140) {
      handleToggleDockRef.current();
      triggerLayoutReflow();
    } else {
      const clamped = Math.min(420, Math.max(200, targetWidth));
      setSidebarWidth(clamped);
      sidebarWidthRef.current = clamped;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('fin_os_sidebar_width', String(clamped));
          triggerLayoutReflow();
        }
      } catch {}
    }
  };

  const handleSideWidgetsKeyDown = (e: React.KeyboardEvent) => {
    let delta = 0;
    const step = e.shiftKey ? 20 : 10;
    if (e.key === 'ArrowRight') delta = erp.isAr ? step : -step;
    else if (e.key === 'ArrowLeft') delta = erp.isAr ? -step : step;
    else if (e.key === 'Home') {
      e.preventDefault();
      setSideWidgetsWidth(260);
      sideWidgetsWidthRef.current = 260;
      if (isSideWidgetsMinimizedRef.current) {
        setIsSideWidgetsMinimized(false);
        isSideWidgetsMinimizedRef.current = false;
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('fin_os_side_widgets_minimized', 'false');
          }
        } catch {}
      }
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('fin_os_side_widgets_width', '260');
          triggerLayoutReflow();
        }
      } catch {}
      return;
    } else if (e.key === 'End') {
      e.preventDefault();
      setSideWidgetsWidth(560);
      sideWidgetsWidthRef.current = 560;
      if (isSideWidgetsMinimizedRef.current) {
        setIsSideWidgetsMinimized(false);
        isSideWidgetsMinimizedRef.current = false;
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('fin_os_side_widgets_minimized', 'false');
          }
        } catch {}
      }
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('fin_os_side_widgets_width', '560');
          triggerLayoutReflow();
        }
      } catch {}
      return;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggleMinimizeSideWidgets();
      return;
    } else {
      return;
    }

    e.preventDefault();

    // If currently minimized:
    if (isSideWidgetsMinimizedRef.current) {
      if (delta > 0) {
        // Widening towards center un-minimizes to 260px or previous width
        setIsSideWidgetsMinimized(false);
        isSideWidgetsMinimizedRef.current = false;
        const initial = Math.max(260, sideWidgetsWidthRef.current);
        setSideWidgetsWidth(initial);
        sideWidgetsWidthRef.current = initial;
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('fin_os_side_widgets_minimized', 'false');
            localStorage.setItem('fin_os_side_widgets_width', String(initial));
            triggerLayoutReflow();
          }
        } catch {}
      }
      return;
    }

    const clamped = Math.min(560, Math.max(260, sideWidgetsWidthRef.current + delta));
    setSideWidgetsWidth(clamped);
    sideWidgetsWidthRef.current = clamped;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('fin_os_side_widgets_width', String(clamped));
        triggerLayoutReflow();
      }
    } catch {}
  };

  const handleSidebarSplitterDoubleClick = useCallback(() => {
    if (isDockCollapsedRef.current) {
      handleToggleDockRef.current();
      setSidebarWidth(260);
      sidebarWidthRef.current = 260;
    } else if (sidebarWidthRef.current === 260) {
      handleToggleDockRef.current();
    } else {
      setSidebarWidth(260);
      sidebarWidthRef.current = 260;
    }
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('fin_os_sidebar_width', '260');
        triggerLayoutReflow();
      }
    } catch {}
  }, [triggerLayoutReflow]);

  const handleSideWidgetsSplitterDoubleClick = useCallback(() => {
    if (isSideWidgetsMinimizedRef.current) {
      setIsSideWidgetsMinimized(false);
      isSideWidgetsMinimizedRef.current = false;
      const target = Math.max(260, sideWidgetsWidthRef.current || 350);
      setSideWidgetsWidth(target);
      sideWidgetsWidthRef.current = target;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('fin_os_side_widgets_minimized', 'false');
          localStorage.setItem('fin_os_side_widgets_width', String(target));
          triggerLayoutReflow();
        }
      } catch {}
    } else if (sideWidgetsWidthRef.current === 350) {
      handleToggleMinimizeSideWidgets();
    } else {
      setSideWidgetsWidth(350);
      sideWidgetsWidthRef.current = 350;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('fin_os_side_widgets_width', '350');
          triggerLayoutReflow();
        }
      } catch {}
    }
  }, [handleToggleMinimizeSideWidgets, triggerLayoutReflow]);

  if (erp.isLoading) {
    return <ZFERPLoadingWorkstation isAr={erp.isAr} />;
  }

  const moduleTitle = erp.isAr
    ? (MODULE_TITLES_AR[erp.activeTab] || 'لوحة القيادة')
    : (MODULE_TITLES_EN[erp.activeTab] || 'Dashboard');

  const sideWidgetsConfig = erp.isAr
    ? (SIDE_WIDGETS_CONFIG_AR[erp.activeTab] || { title: 'لوحة الأدوات والودجات', badge: '', icon: PanelRight })
    : (SIDE_WIDGETS_CONFIG_EN[erp.activeTab] || { title: 'Side Companion Widgets', badge: '', icon: PanelRight });
  const SideWidgetsIcon = sideWidgetsConfig.icon;

  return (
    <div 
      className={`${shellStyles.shell} ${erp.isAr ? shellStyles.rtl : ''}`} 
      dir={erp.isAr ? 'rtl' : 'ltr'}
      data-erp-workstation="true"
      data-erp-workstation-root="true"
      style={{
        '--erp-bg-canvas': '#f8fafc',
        '--erp-border': '#cbd5e1',
        '--erp-accent': erp.activePreset?.accent || '#2563eb',
        '--erp-accent-hover': erp.activePreset?.hover || '#1d4ed8',
        '--erp-accent-subtle': erp.activePreset?.subtle || '#eff6ff',
        '--erp-accent-tint': erp.activePreset?.tint || 'rgba(37, 99, 235, 0.08)',
        '--zf2-gold': erp.activePreset?.accent || '#2563eb',
        '--zf2-gold-light': erp.activePreset?.hover || '#1d4ed8',
        '--zf2-gold-dark': erp.activePreset?.hover || '#1d4ed8',
        '--zf2-gold-dim': erp.activePreset?.subtle || '#eff6ff',
        '--zf2-gold-wash': erp.activePreset?.tint || 'rgba(37, 99, 235, 0.08)',
        '--zf2-accent-primary': erp.activePreset?.accent || '#2563eb',
        '--ops-accent': erp.activePreset?.accent || '#2563eb',
        '--ops-accent-hover': erp.activePreset?.hover || '#1d4ed8',
        '--ops-accent-soft': erp.activePreset?.subtle || '#eff6ff',
        '--ops-accent-subtle': erp.activePreset?.subtle || '#eff6ff',
      } as React.CSSProperties}
    >
      {/* 1. Full-Height Sidebar Navigation Dock (Extends to the very top) */}
      <ZFNavigationDock 
        activeModule={erp.activeTab === 'dashboard' ? 'cockpit' : (erp.activeTab as ERPNavModule)}
        onSelectModule={(mod) => {
          erp.navigateToTab(mod);
        }}
        urgentDuesCount={erp.urgentDuesCount}
        overdueAPCount={erp.overdueAPCount}
        contractsCount={erp.data.contracts.length}
        pdcSafeCount={erp.data.pdcRecords.filter(p => p.status === 'In Safe').length}
        propertiesCount={erp.data.properties.length}
        isAr={erp.isAr}
        onOpenAcademy={() => erp.setIsGuidedTourActive(true)}
        isCollapsed={erp.isDockCollapsed}
        isMobileOpen={erp.isMobileDockOpen}
        onCloseMobile={() => erp.setIsMobileDockOpen(false)}
        onToggleDock={erp.handleToggleDock}
        quickMenu={[
          { key: 'collect', labelAr: 'تحصيل قسط', labelEn: 'Collect installment', icon: <Coins size={15} />, onSelect: () => erp.openCollect({}) },
          { key: 'expense', labelAr: 'مصروف أو فاتورة', labelEn: 'Expense or bill', icon: <Receipt size={15} />, onSelect: () => erp.setShowProjectExpenseModal(true) },
          { key: 'transfer', labelAr: 'تحويل بين الخزينة وإنستاباي', labelEn: 'Safe ⇄ InstaPay transfer', icon: <ArrowLeftRight size={15} />, onSelect: () => erp.setShowCashTransferModal(true) },
          { key: 'contract', labelAr: 'عقد بيع جديد', labelEn: 'New sales contract', icon: <FileSignature size={15} />, onSelect: () => erp.handleOpenGenericNewContract() }
        ]}
        width={sidebarWidth}
        isResizing={!isHydrated || isDraggingSidebar}
      />

      {/* 1b. Interactive Drag-to-Resize Splitter for Sidebar */}
      <div 
        role="separator"
        aria-orientation="vertical"
        aria-label={erp.isAr ? 'فاصل تغيير عرض القائمة الجانبية' : 'Resize sidebar'}
        aria-valuenow={erp.isDockCollapsed ? 68 : sidebarWidth}
        aria-valuemin={erp.isDockCollapsed ? 68 : 200}
        aria-valuemax={420}
        tabIndex={0}
        className={`${shellStyles.splitter} ${shellStyles.sidebarSplitter} ${isDraggingSidebar ? shellStyles.splitterActive : ''}`}
        onPointerDown={handleSidebarResizeStart}
        onKeyDown={handleSidebarKeyDown}
        onDoubleClick={handleSidebarSplitterDoubleClick}
      >
        <div className={shellStyles.splitterLine} />
      </div>

      {/* Mobile Drawer Backdrop */}
      {erp.isMobileDockOpen && (
        <div 
          className={shellStyles.mobileBackdrop} 
          onClick={() => erp.setIsMobileDockOpen(false)} 
          aria-hidden="true"
        />
      )}

      {/* 2. Workspace Viewport / Column */}
      <div className={shellStyles.workspaceColumn}>
        <div className={shellStyles.workspaceRow}>
          {/* Middle Subpage Container (Distinct Bounded Box) */}
          <section 
            className={`${shellStyles.middleSection} ${!erp.hasSideWidgets ? shellStyles.middleSectionFullWidth : ''}`}
            style={(!isHydrated || isDraggingSidebar || isDraggingSideWidgets) ? { transition: 'none' } : undefined}
            aria-label={erp.isAr ? 'القسم الأوسط ومحتوى الصفحة' : 'Middle Subpage Section'}
          >
            {/* Top Navbar strictly inside the Middle Section */}
            <ZFWorkstationHeader 
              activePeriod={erp.activePeriod}
              isAr={erp.isAr}
              currency={erp.currency}
              onToggleCurrency={erp.toggleCurrency}
              onOpenQuickSearch={() => erp.setShowQuickSearch(true)}
              onRefreshData={erp.loadLiveData}
              isMutating={erp.isMutating}
              currentUser={erp.currentUser}
              onSignOut={erp.handleSignOut}
              unreadNotificationsCount={erp.unreadNotificationsCount}
              hasCriticalAlerts={erp.hasCriticalAlerts}
              onOpenNotifications={() => erp.setShowNotificationCenter(true)}
              onOpenAcademy={() => erp.setIsGuidedTourActive(true)}
              onToggleDock={erp.handleToggleDock}
              onToggleMobileDock={() => erp.setIsMobileDockOpen(prev => !prev)}
              moduleTitle={moduleTitle}
            />

            {/* Schema Migration Advisory Banner */}
            {!erp.data.isSchemaMigrated && (
              <div style={{
                background: '#fffbeb',
                borderBottom: '1px solid #fde68a',
                padding: '0.65rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
                color: '#b45309',
                zIndex: 15
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <AlertTriangle size={16} color="#b45309" style={{ flexShrink: 0 }} />
                  <span>
                    {erp.isAr 
                       ? 'تنبيه قاعدة البيانات: جداول المحاسبة المالية (erp_accounting_periods وغيرها) لم تُنشأ بعد في قاعدة بيانات Supabase. يرجى تشغيل ملف الترحيل 006_erp_financial_engine.sql في Supabase SQL Editor لتفعيل الحفظ الدائم بالسحابة. يعمل النظام حالياً بنمط المعاينة التفاعلي المباشر.'
                      : 'Database Notice: ERP accounting tables are not yet deployed in your Supabase database. Run 006_erp_financial_engine.sql in Supabase SQL Editor to enable persistent cloud storage. Operating in interactive live mode.'}
                  </span>
                </div>
                {/* design-lint: allow R20 warning migration badge */}
                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.72rem', background: '#fef3c7', color: '#78350f', border: '1px solid #fcd34d', padding: '0.2rem 0.5rem', borderRadius: '4px', flexShrink: 0, fontWeight: 700 }}>
                  supabase/migrations/006_erp_financial_engine.sql
                </span>
              </div>
            )}

            {/* Main Workstation Subpage Stage */}
            <main className={shellStyles.stage} ref={stageRef} data-erp-stage="true">
              <div className={shellStyles.stageContainer}>
                {/* Proactive Period Lock Banner (Invariant 0.9) */}
                <LockedPeriodBanner 
                  period={erp.activePeriod} 
                  isAr={erp.isAr} 
                  onUnlockPeriod={(periodId) => erp.handleTogglePeriodStatus(periodId, 'OPEN')}
                  isMutating={erp.isMutating}
                />

                {/* Semantic Sub-route Views */}
                {children}
              </div>
            </main>
          </section>

          {/* Side Widgets Container (Flexible / Page-dependent on trailing edge) */}
          {erp.hasSideWidgets && (
            <>
              {/* Interactive Drag-to-Resize Splitter for Side Widgets Rail */}
              <div 
                role="separator"
                aria-orientation="vertical"
                aria-label={erp.isAr ? 'فاصل تغيير عرض لوحة الودجات' : 'Resize side widgets rail'}
                aria-valuenow={isSideWidgetsMinimized ? 44 : sideWidgetsWidth}
                aria-valuemin={isSideWidgetsMinimized ? 44 : 260}
                aria-valuemax={560}
                tabIndex={0}
                className={`${shellStyles.splitter} ${shellStyles.sideWidgetsSplitter} ${isDraggingSideWidgets ? shellStyles.splitterActive : ''}`}
                onPointerDown={handleSideWidgetsResizeStart}
                onKeyDown={handleSideWidgetsKeyDown}
                onDoubleClick={handleSideWidgetsSplitterDoubleClick}
              >
                <div className={shellStyles.splitterLine} />
              </div>

              <aside 
                id="zf-workstation-side-widgets" 
                className={`${shellStyles.sideWidgetsContainer} ${isSideWidgetsMinimized ? shellStyles.sideWidgetsMinimized : ''}`}
                style={{
                  ...(isSideWidgetsMinimized 
                    ? { width: '44px', minWidth: '44px', maxWidth: '44px' } 
                    : { width: `${sideWidgetsWidth}px`, minWidth: `${sideWidgetsWidth}px`, maxWidth: `${sideWidgetsWidth}px` }),
                  ...((!isHydrated || isDraggingSideWidgets || isDraggingSidebar) ? { transition: 'none' } : {})
                }}
                data-erp-side-widgets="true"
                data-minimized={isSideWidgetsMinimized}
                aria-label={erp.isAr ? 'لوحة الأدوات والبطاقات الجانبية' : 'Side Companion Widgets'}
              >
                {/* Minimized 44px Docked Edge Strip (Kept in DOM with display: none/flex to preserve portal targets) */}
                <div 
                  className={shellStyles.sideWidgetsMinimizedStrip}
                  style={{ display: isSideWidgetsMinimized ? 'flex' : 'none' }}
                >
                  <div className={shellStyles.sideWidgetsMinimizedTop}>
                    <button
                      type="button"
                      className={shellStyles.sideWidgetsRestoreBtn}
                      onClick={handleToggleMinimizeSideWidgets}
                      aria-label={erp.isAr ? 'توسيع اللوحة الجانبية' : 'Expand side widgets rail'}
                      title={erp.isAr ? 'توسيع اللوحة الجانبية' : 'Expand side widgets rail'}
                    >
                      {erp.isAr ? <PanelLeftOpen size={16} /> : <PanelRightOpen size={16} />}
                    </button>

                    <div 
                      id="zf-side-widgets-minimized-icon"
                      className={shellStyles.sideWidgetsMinimizedIcon}
                      title={sideWidgetsConfig.title}
                    >
                      <span id="zf-side-widgets-default-minimized-icon" className={shellStyles.defaultSideWidgetsIcon}>
                        <SideWidgetsIcon size={16} strokeWidth={1.8} />
                      </span>
                    </div>
                  </div>

                  <div 
                    className={shellStyles.sideWidgetsMinimizedTitleWrap}
                    onClick={handleToggleMinimizeSideWidgets}
                    role="button"
                    tabIndex={0}
                    title={sideWidgetsConfig.title}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleMinimizeSideWidgets(); }}
                  >
                    <span id="zf-side-widgets-minimized-title" className={shellStyles.sideWidgetsMinimizedTitle}>
                      {sideWidgetsConfig.title}
                    </span>
                  </div>
                </div>

                {/* Normal Header and Body (Hidden via display: none when minimized to preserve portal DOM target) */}
                <div style={{ display: isSideWidgetsMinimized ? 'none' : 'flex', flexDirection: 'column', height: '100%', width: '100%', minWidth: 0, overflow: 'hidden' }}>
                  {/* Top Header Bar strictly flush with Middle Section header & Sidebar header (52px) */}
                  <header className={shellStyles.sideWidgetsHeader} dir={erp.isAr ? 'rtl' : 'ltr'}>
                    <div className={shellStyles.sideWidgetsHeaderLeft}>
                      <div className={shellStyles.breadcrumbBox}>
                        <span id="zf-side-widgets-header-icon" className={shellStyles.sideWidgetsIcon}>
                          <span id="zf-side-widgets-default-icon" className={shellStyles.defaultSideWidgetsIcon}>
                            <SideWidgetsIcon size={17} strokeWidth={1.8} />
                          </span>
                        </span>
                        <span className={shellStyles.breadcrumbDivider}>/</span>
                        <h2 id="zf-side-widgets-header-title" className={shellStyles.sideWidgetsHeaderTitle}>
                          {sideWidgetsConfig.title}
                        </h2>
                      </div>
                    </div>

                    <div className={shellStyles.sideWidgetsHeaderRight}>
                      <div 
                        id="zf-side-widgets-header-badge" 
                        className={shellStyles.sideWidgetsLiveBadge}
                        style={{ display: sideWidgetsConfig.badge ? 'inline-flex' : 'none' }}
                      >
                        <span className={shellStyles.sideWidgetsPulseDot} />
                        <span id="zf-side-widgets-header-badge-text">{sideWidgetsConfig.badge || ''}</span>
                      </div>

                      <button
                        type="button"
                        className={shellStyles.sideWidgetsMinimizeBtn}
                        onClick={handleToggleMinimizeSideWidgets}
                        aria-label={erp.isAr ? 'تصغير اللوحة الجانبية' : 'Minimize side widgets rail'}
                        title={erp.isAr ? 'تصغير اللوحة الجانبية' : 'Minimize side widgets rail'}
                      >
                        {erp.isAr ? <PanelLeftClose size={15} /> : <PanelRightClose size={15} />}
                      </button>
                    </div>
                  </header>

                  {/* Scrollable Body Container */}
                  <div className={shellStyles.sideWidgetsBody}>
                    <div id="zf-side-widgets-slot" className={shellStyles.sideWidgetsContent} />
                  </div>
                </div>
              </aside>
            </>
          )}
        </div>
      </div>

      {/* 3. SLIDE-OVER DETAIL INSPECTOR DRAWER */}
      <ZFInspectorDrawer 
        payload={erp.inspectorPayload}
        onClose={() => {
          erp.setInspectorPayload(null);
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            let hasQueryParam = false;
            ['inspect', 'contractId', 'chequeId', 'taxId', 'rescissionId'].forEach(param => {
              if (url.searchParams.has(param)) {
                url.searchParams.delete(param);
                hasQueryParam = true;
              }
            });
            if (hasQueryParam) {
              window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
            }
          }
        }}
        isOverModal={!!(erp.showNewPDCModal || erp.showRSVModal || erp.showProjectExpenseModal || erp.collectingPDCItem || erp.showEscalationModal || erp.showRescissionModal || erp.auditModalProperty || erp.showHandoverModal || erp.collectRequest)}
        onPayInstallment={(c, sch) => erp.openCollect({ contractId: c.contract_id, scheduleId: sch.schedule_id })}
        onOpenEscalation={(c) => {
          erp.setShowEscalationModal(c);
          erp.setEscalationDelta('1500000.00');
        }}
        onOpenRescission={(c) => {
          erp.setShowRescissionModal(c);
          erp.setSelectedBranch(c.handover_status === 'Delivered' ? 'Branch2_PostDelivery' : 'Branch1_PreDelivery');
          erp.setRescissionStep(0);
        }}
        onOpenHandoverModal={(c) => erp.setShowHandoverModal(c)}
        onOpenSupplement={(c) => {
          erp.setSupplementInitialContractId(c.contract_id);
          erp.setShowNewPDCModal(true);
        }}
        onNavigateToTab={(tab) => erp.navigateToTab(tab)}
        onToggleHandover={erp.handleToggleContractHandover}
        onInspectContract={erp.handleInspectContract}
        onRemitTax={erp.handleRemitTax}
        isMutating={erp.isMutating}
      />

      {/* 4. COMMAND PALETTE MODAL (⌘K) */}
      <ZFQuickSearchModal 
        isOpen={erp.showQuickSearch}
        onClose={() => erp.setShowQuickSearch(false)}
        contracts={erp.data.contracts}
        cheques={erp.data.pdcRecords}
        properties={erp.data.properties}
        leads={erp.data.leads}
        partners={erp.partnerProfiles}
        rescissions={erp.data.rescissions}
        taxRecords={erp.data.taxRecords}
        onSelectModule={(mod) => erp.navigateToTab(mod)}
        onSelectContract={(c) => erp.handleInspectContract(c)}
        onOpenAcademy={() => erp.setIsGuidedTourActive(true)}
        onStartGuidedTour={() => erp.setIsGuidedTourActive(true)}
        isAr={erp.isAr}
        adminLocale={erp.locale}
      />

      {/* 4.25 FIN-OS MASTER ACADEMY (FALLBACK WRAPPER TO LIVE WALKTHROUGH) */}
      <ZFErpAcademyModal 
        isOpen={erp.isAcademyOpen && !erp.isGuidedTourActive}
        onClose={() => erp.setIsAcademyOpen(false)}
        onStartGuidedTour={() => erp.setIsGuidedTourActive(true)}
        onNavigateToModule={(mod) => erp.navigateToTab(mod, false)}
        isAr={erp.isAr}
      />

      {/* 4.35 INTERACTIVE ON-SCREEN GUIDED SPOTLIGHT TOUR & WALKTHROUGH */}
      <ZFErpGuidedTour 
        isActive={erp.isGuidedTourActive}
        onComplete={() => { erp.setIsGuidedTourActive(false); erp.setIsAcademyOpen(false); }}
        onSkip={() => { erp.setIsGuidedTourActive(false); erp.setIsAcademyOpen(false); }}
        onNavigateToModule={(mod) => erp.navigateToTab(mod, false)}
        isAr={erp.isAr}
      />

      {/* 4.5 EXECUTIVE NOTIFICATION & ALERT CENTER */}
      <ZFNotificationCenter 
        isOpen={erp.showNotificationCenter}
        onClose={() => erp.setShowNotificationCenter(false)}
        notifications={erp.liveNotifications}
        onMarkRead={erp.handleMarkNotificationRead}
        onMarkAllRead={erp.handleMarkAllNotificationsRead}
        onDismiss={erp.handleDismissNotification}
        onClearAll={erp.handleClearAllNotifications}
        onNavigateAction={erp.handleNotificationAction}
        isAr={erp.isAr}
      />

      {/* 5. DEDICATED TRANSACTION & ACTION WORKFLOW MODALS */}
      <NewContractWizardModal 
        isOpen={erp.showNewContractModal}
        onClose={() => { 
          erp.setShowNewContractModal(false); 
          erp.setContractWizardStep(1); 
          erp.setSelectedPropertyId('');
          erp.setSelectedBuildingUnitId(undefined);
          erp.setSelectedBuildingUnitNumber(undefined);
          if (typeof window !== 'undefined' && window.location.search.includes('action=')) {
            const url = new URL(window.location.href);
            url.searchParams.delete('action');
            url.searchParams.delete('propertyId');
            url.searchParams.delete('unitId');
            window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
          }
        }}
        initialPropertyId={erp.selectedPropertyId}
        initialBuildingUnitId={erp.selectedBuildingUnitId}
        properties={erp.data.properties}
        contracts={erp.data.contracts}
        leads={erp.data.leads}
        activePeriod={erp.activePeriod}
        unifiedPartners={erp.unifiedPartners}
        isMutating={erp.isMutating}
        isAr={erp.isAr}
        onContractCreated={async (payload) => {
          erp.setSelectedPropertyId(payload.propertyId);
          erp.setSelectedBuildingUnitId(payload.buildingUnitId || undefined);
          erp.setSelectedBuildingUnitNumber(payload.buildingUnitNumber || undefined);
          erp.setIsWholeBuildingContract(payload.isWholeBuildingContract ?? !payload.buildingUnitId);
          erp.setCustomUnitName(payload.customUnitName || '');
          erp.setBuyerName(payload.buyerName);
          erp.setBuyerNationalId(payload.buyerNationalId);
          erp.setBuyerPhone(payload.buyerPhone);
          erp.setBuyerEmail(payload.buyerEmail);
          erp.setBasePriceInput(payload.basePrice.toString());
          erp.setApartmentTaxInput((payload.taxAmount || '0.00').toString());
          erp.setApartmentTaxDesc(payload.taxNotes || '');
          erp.setCustomPrice(payload.totalNominalValue.toString());
          erp.setPaymentPlanType(payload.paymentPlanType);
          erp.setNumInstallments(payload.numInstallments.toString());
          erp.setFirstPaymentDate(payload.firstPaymentDate);
          erp.setPartnerSplits(payload.partnerSplits);
          erp.setCashRoutingAccount(payload.destinationTreasury === 'BANK_102000' || payload.destinationTreasury === '102000' ? '102000' : '101000');
          if (payload.leadId) erp.setSelectedLeadId(payload.leadId);
          if (payload.leadSelectionMode) erp.setLeadSelectionMode(payload.leadSelectionMode);
          
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
          await erp.handleCreateRealContract(fakeEvent, payload);
        }}
      />

      {/* CUSTOMER INSTALLMENT COLLECTION MODAL */}
      <ZFCollectInstallmentModal
        isOpen={!!erp.collectRequest}
        onClose={() => erp.setCollectRequest(null)}
        isAr={erp.isAr}
        isMutating={erp.isMutating}
        contracts={erp.data.contracts}
        schedules={erp.data.schedules}
        properties={erp.data.properties}
        initialContractId={erp.collectRequest?.contractId}
        initialScheduleId={erp.collectRequest?.scheduleId}
        onConfirm={erp.handleConfirmHandCollection}
      />

      {/* ESCALATION MODAL */}
      <ContractEscalationModal 
        isOpen={!!erp.showEscalationModal}
        onClose={() => erp.setShowEscalationModal(null)}
        contract={erp.showEscalationModal}
        contracts={erp.data.contracts}
        isAr={erp.isAr}
        isMutating={erp.isMutating}
        onConfirmEscalation={async (delta, reason, targetContract) => {
          erp.setEscalationDelta(delta);
          erp.setEscalationReason(reason);
          await erp.handleExecuteEscalation(targetContract, delta, reason);
        }}
      />

      {/* RESCISSION MODAL */}
      <RescissionSettlementModal 
        isOpen={!!erp.showRescissionModal}
        onClose={() => {
          erp.setShowRescissionModal(null);
          if (typeof window !== 'undefined' && window.location.search.includes('action=')) {
            const url = new URL(window.location.href);
            url.searchParams.delete('action');
            url.searchParams.delete('contractId');
            window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
          }
        }}
        contract={erp.showRescissionModal}
        contracts={erp.data.contracts}
        schedules={erp.data.schedules}
        activePeriod={erp.activePeriod}
        periods={erp.data.periods}
        isAr={erp.isAr}
        isMutating={erp.isMutating}
        onConfirmRescission={async ({ selectedBranch, rescissionDate: rDate, targetContract, penaltyRate }) => {
          erp.setSelectedBranch(selectedBranch);
          erp.setRescissionDate(rDate);
          await erp.handleExecuteRescission(targetContract, penaltyRate);
        }}
      />

      {/* RSV ALLOCATION MODAL */}
      <RSVAllocationModal 
        isOpen={erp.showRSVModal}
        onClose={() => erp.setShowRSVModal(false)}
        properties={erp.data.properties}
        propertyCosts={erp.data.propertyCosts}
        isAr={erp.isAr}
        isMutating={erp.isMutating}
        onSaveAllocation={async ({ projectName, salesValue, wipAmount }) => {
          erp.setRsvProjectName(projectName);
          erp.setRsvSalesValue(salesValue);
          erp.setRsvWipAmount(wipAmount);
          const fakeEvt = { preventDefault: () => {} } as React.FormEvent;
          await erp.handleCreateRSVAllocation(fakeEvt, { projectName, salesValue, wipAmount });
        }}
      />

      {/* HANDOVER EXECUTION & MODEL B REVENUE RECOGNITION MODAL */}
      <HandoverExecutionModal
        isOpen={!!erp.showHandoverModal}
        onClose={() => erp.setShowHandoverModal(null)}
        contract={erp.showHandoverModal}
        properties={erp.data.properties}
        activePeriod={erp.activePeriod}
        periods={erp.data.periods}
        costAllocations={erp.data.costAllocations}
        onConfirmHandover={erp.handleConfirmHandover}
        isMutating={erp.isMutating}
        isAr={erp.isAr}
      />

      {/* RECORD NEW INSTALLMENT DUE / CONTRACT SUPPLEMENT MODAL */}
      <NewChequeModal 
        isOpen={erp.showNewPDCModal}
        onClose={() => {
          erp.setShowNewPDCModal(false);
          erp.setSupplementInitialContractId(null);
        }}
        contracts={erp.data.contracts}
        schedules={erp.data.schedules}
        properties={erp.data.properties}
        initialContractId={erp.supplementInitialContractId}
        onSaveSupplement={erp.handleSaveContractSupplement}
        onSaveCheque={erp.handleSaveNewCheque}
        onInspectContract={erp.handleInspectContract}
        isMutating={erp.isMutating}
        isAr={erp.isAr}
      />


      {/* CANONICAL PROJECT BILL & EXPENSE MODAL */}
      <ZFDirectExpenseModal
        isOpen={erp.showProjectExpenseModal}
        initialPropertyId={erp.projectExpensePropertyId}
        onClose={() => {
          erp.setShowProjectExpenseModal(false);
          erp.setProjectExpensePropertyId(undefined);
          if (typeof window !== 'undefined' && window.location.search.includes('action=')) {
            const url = new URL(window.location.href);
            url.searchParams.delete('action');
            window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
          }
        }}
        activePeriod={erp.activePeriod}
        periods={erp.data.periods}
        properties={erp.data.properties}
        onSaveEntry={erp.handleSaveProjectExpense}
        isAr={erp.isAr}
      />

      {/* CASH TRANSFER MODAL */}
      <ZFCashTransferModal
        isOpen={erp.showCashTransferModal}
        onClose={() => erp.setShowCashTransferModal(false)}
        isAr={erp.isAr}
        isMutating={erp.isMutating}
        safeBalance={cash.safeCash}
        instapayBalance={cash.bankCash}
        onConfirm={erp.handleInternalTransfer}
      />

      {/* PROPERTY LIFECYCLE AUDIT & MATERIAL LOGS MODAL */}
      {erp.auditModalProperty && (
        <PropertyLifecycleAuditModal 
          property={erp.auditModalProperty}
          properties={erp.data.properties}
          allCosts={erp.data.propertyCosts}
          isAr={erp.isAr}
          onClose={() => erp.setAuditModalProperty(null)}
          onAddCostItem={erp.handleAddPropertyCostItem}
          onDeleteCostItem={erp.handleDeletePropertyCostItem}
          onOpenCalculatorForProperty={(propId) => {
            erp.setAuditModalProperty(null);
            erp.setCalculatorPropertyId(propId);
            erp.navigateToTab(propId ? `calculator?propertyId=${encodeURIComponent(propId)}` : 'calculator');
          }}
        />
      )}

      {/* PARTNER PROFIT PAYOUT MODAL */}
      {/* Mounted only while open so every opening starts from a clean form */}
      {erp.showPartnerPayoutModal && (
        <PartnerPayoutModal
          isOpen
          onClose={() => {
            erp.setShowPartnerPayoutModal(false);
            erp.setPayoutInitialPartner(undefined);
            erp.setPayoutInitialPropertyId(undefined);
          }}
          partners={erp.partnerSummaries}
          properties={erp.data.properties}
          contracts={erp.data.contracts}
          transactions={erp.partnerTransactions}
          commitments={erp.data.partnerCommitments}
          initialPartnerName={erp.payoutInitialPartner}
          initialPropertyId={erp.payoutInitialPropertyId}
          activePeriod={erp.activePeriod}
          periods={erp.data.periods}
          isAr={erp.isAr}
          isMutating={erp.isMutating}
          onConfirmPayout={erp.handleConfirmPartnerPayout}
        />
      )}

      {/* DEDICATED STATUTORY PARTNER ONBOARDING MODAL */}
      <NewPartnerProfileModal
        isOpen={erp.showNewPartnerModal}
        onClose={() => erp.setShowNewPartnerModal(false)}
        properties={erp.data.properties}
        existingPartnerNames={erp.partnerProfiles.map(p => p.name)}
        isAr={erp.isAr}
        isMutating={erp.isMutating}
        onSubmit={async (profileData) => {
          await erp.handleRegisterNewPartner(profileData);
          erp.setShowNewPartnerModal(false);
        }}
      />

      {/* PARTNER CAPITAL INJECTION MODAL */}
      <PartnerCapitalInjectionModal 
        isOpen={erp.showPartnerInjectionModal}
        onClose={() => {
          erp.setShowPartnerInjectionModal(false);
          erp.setInjectionInitialPartner(undefined);
          erp.setInjectionInitialPropertyId(undefined);
          erp.setInjectionInitialCommitmentId(undefined);
        }}
        initialPartnerName={erp.injectionInitialPartner}
        initialPropertyId={erp.injectionInitialPropertyId}
        initialCommitmentId={erp.injectionInitialCommitmentId}
        partnerCommitments={erp.data.partnerCommitments}
        partners={erp.partnerSummaries}
        properties={erp.data.properties}
        transactions={erp.partnerTransactions}
        activePeriod={erp.activePeriod}
        periods={erp.data.periods}
        isAr={erp.isAr}
        isMutating={erp.isMutating}
        onOpenNewPartnerModal={() => erp.setShowNewPartnerModal(true)}
        onConfirmInjection={async (details) => {
          await erp.handleConfirmPartnerInjection(details);
          erp.setShowPartnerInjectionModal(false);
          erp.setInjectionInitialPartner(undefined);
          erp.setInjectionInitialPropertyId(undefined);
          erp.setInjectionInitialCommitmentId(undefined);
        }}
      />

      {/* PARTNER DOSSIER & STATEMENT MODAL */}
      <PartnerDossierModal 
        isOpen={!!erp.dossierTargetPartner}
        onClose={() => erp.setDossierTargetPartner(null)}
        partner={erp.dossierTargetPartner}
        transactions={erp.partnerTransactions}
        isAr={erp.isAr}
        onOpenPayout={(name) => {
          erp.setDossierTargetPartner(null);
          erp.setPayoutInitialPartner(name);
          erp.setShowPartnerPayoutModal(true);
        }}
        onOpenInjection={(name) => {
          erp.setDossierTargetPartner(null);
          erp.setInjectionInitialPartner(name);
          erp.setShowPartnerInjectionModal(true);
        }}
      />

    </div>
  );
}

export default ERPWorkstationShell;
