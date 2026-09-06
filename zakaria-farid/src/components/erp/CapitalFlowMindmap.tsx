'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  DollarSign, 
  Landmark, 
  Users, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Building2, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Filter, 
  FileText, 
  Info,
  ChevronRight,
  Layers,
  Sparkles,
  PieChart as PieIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  AlertCircle,
  ExternalLink,
  Wallet,
  Percent,
  Hash,
  Activity
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import { ERPCostAllocation, ERPPartnerCall, ERPTaxRecord } from '@/lib/erp/types';

interface CapitalFlowMindmapProps {
  isAr: boolean;
  embeddedInStudio?: boolean;
  kpis: {
    cashBank: string;
    totalWip: string;
    accountsReceivable: string;
    deferredRevenue: string;
    realizedRevenue: string;
  };
  totalGrossContractValue: string;
  totalCollectedCash: string;
  totalWipIncurred: string;
  totalSafePDCs?: string;
  totalInjectedCapital?: string;
  wipAccounts: {
    land: string;
    civil: string;
    mep: string;
    finishing: string;
    financing: string;
  };
  taxRecords?: ERPTaxRecord[];
  partnerCalls?: ERPPartnerCall[];
}

interface FlowNode {
  id: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  amount: string;
  category: 'inflow' | 'core' | 'outflow';
  icon: React.ElementType;
  accentColor: string;
  gradient: string;
  percentage?: number;
  tagAr: string;
  tagEn: string;
}

interface DossierMetric {
  labelAr: string;
  labelEn: string;
  value: string;
  unitAr?: string;
  unitEn?: string;
  color?: string;
}

interface DossierBreakdownItem {
  labelAr: string;
  labelEn: string;
  amount: string;
  percentage: number;
  color?: string;
}

interface NodeDossier {
  id: string;
  glCode: string;
  categoryBadgeAr: string;
  categoryBadgeEn: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  amount: string;
  accentColor: string;
  velocityLabelAr: string;
  velocityLabelEn: string;
  velocityBadgeColor: string;
  summaryAr: string;
  summaryEn: string;
  metrics: DossierMetric[];
  breakdowns?: DossierBreakdownItem[];
  auditContext: {
    entryTypeAr: string;
    entryTypeEn: string;
    verificationAr: string;
    verificationEn: string;
    strategicImpactAr: string;
    strategicImpactEn: string;
  };
}

export const CapitalFlowMindmap: React.FC<CapitalFlowMindmapProps> = ({
  isAr,
  embeddedInStudio = false,
  kpis,
  totalGrossContractValue,
  totalCollectedCash,
  totalWipIncurred,
  totalSafePDCs = '0.00',
  totalInjectedCapital = '0.00',
  wipAccounts,
  taxRecords = [],
  partnerCalls = []
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'inflows' | 'outflows' | 'net'>('all');
  const [connections, setConnections] = useState<Array<{
    fromId: string;
    toId: string;
    path: string;
    color: string;
    isInbound: boolean;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }>>([]);

  // Compute live tax totals
  const totalTaxes = useMemo(() => {
    return taxRecords.reduce((acc, r) => acc.plus(r.tax_amount || '0'), D(0)).toFixed(2);
  }, [taxRecords]);

  // Compute calculated values
  const deferredBacklog = useMemo(() => {
    const backlog = D(totalGrossContractValue).minus(totalCollectedCash);
    return backlog.isNegative() ? '0.00' : backlog.toFixed(2);
  }, [totalGrossContractValue, totalCollectedCash]);

  const totalInflowVolume = useMemo(() => {
    return D(totalCollectedCash)
      .plus(deferredBacklog)
      .plus(totalInjectedCapital);
  }, [totalCollectedCash, deferredBacklog, totalInjectedCapital]);

  const totalOutflowVolume = useMemo(() => {
    return D(totalWipIncurred).plus(totalTaxes);
  }, [totalWipIncurred, totalTaxes]);

  const netOperatingLiquidity = useMemo(() => {
    return D(kpis.cashBank);
  }, [kpis.cashBank]);

  const netOperationalDelta = useMemo(() => {
    return totalInflowVolume.minus(totalOutflowVolume);
  }, [totalInflowVolume, totalOutflowVolume]);

  const formatCleanWholeNumber = (val: string | number) => {
    const n = D(val).toFixed(0);
    return n.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Top-level WIP & Liquidity metrics for dynamic central hub
  const wipTotal = useMemo(() => D(totalWipIncurred), [totalWipIncurred]);
  const cashReserve = useMemo(() => D(kpis.cashBank), [kpis.cashBank]);
  const wipCoverage = useMemo(() => {
    return wipTotal.isZero() ? '100%' : cashReserve.div(wipTotal).times(100).toFixed(1) + '%';
  }, [wipTotal, cashReserve]);

  const isOutflowHidden = activeFilter === 'inflows';
  const isInflowHidden = activeFilter === 'outflows';

  // Node definitions: Tailored for real-world cash & contract installments trade
  const inflowNodes: FlowNode[] = useMemo(() => [
    {
      id: 'inflow-sales',
      titleAr: 'فلوس المبيعات المحصلة',
      titleEn: 'Collected Sales Cash',
      subtitleAr: 'المقدمات والأقساط المستلمة كاش وباليد',
      subtitleEn: 'Down payments & cleared cash tranches',
      amount: totalCollectedCash,
      category: 'inflow',
      icon: DollarSign,
      accentColor: '#10b981',
      gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.04) 100%)',
      percentage: totalInflowVolume.isZero() ? 0 : Math.round(D(totalCollectedCash).div(totalInflowVolume).times(100).toNumber()),
      tagAr: 'كاش وسندات قبض',
      tagEn: 'Direct Cash Inflow'
    },
    {
      id: 'inflow-backlog',
      titleAr: 'أقساط ووعود سداد عند العملاء',
      titleEn: 'Installments & Receivables',
      subtitleAr: 'باقي أقساط العقود اللي مواعيدها جاية قدام',
      subtitleEn: 'Remaining contract installment dues',
      amount: deferredBacklog,
      category: 'inflow',
      icon: Clock,
      accentColor: '#06b6d4',
      gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.18) 0%, rgba(6, 182, 212, 0.04) 100%)',
      percentage: totalInflowVolume.isZero() ? 0 : Math.round(D(deferredBacklog).div(totalInflowVolume).times(100).toNumber()),
      tagAr: 'أقساط قادمة بالعقود',
      tagEn: 'Contracted Receivables'
    },
    {
      id: 'inflow-equity',
      titleAr: 'فلوس وضخ الشركاء',
      titleEn: 'Partner Injected Equity',
      subtitleAr: 'السيولة اللي دفعها الشركاء في المشروع',
      subtitleEn: 'Capital calls & equity injected',
      amount: totalInjectedCapital,
      category: 'inflow',
      icon: Users,
      accentColor: '#d4af37',
      gradient: 'linear-gradient(135deg, rgba(212, 175, 55, 0.18) 0%, rgba(212, 175, 55, 0.04) 100%)',
      percentage: totalInflowVolume.isZero() ? 0 : Math.round(D(totalInjectedCapital).div(totalInflowVolume).times(100).toNumber()),
      tagAr: 'تمويل الشركاء',
      tagEn: 'Contributed Equity'
    }
  ], [totalCollectedCash, deferredBacklog, totalInjectedCapital, totalInflowVolume]);

  const coreNode: FlowNode = useMemo(() => ({
    id: 'core-treasury',
    titleAr: 'الكاش المتاح (الخزنة والبنك)',
    titleEn: 'Central Treasury & Liquidity Pool',
    subtitleAr: 'كل الفلوس الكاش الجاهزة للصرف حالاً',
    subtitleEn: 'Consolidated real cash & liquid bank reserves',
    amount: kpis.cashBank,
    category: 'core',
    icon: ShieldCheck,
    accentColor: '#d4af37',
    gradient: 'linear-gradient(145deg, rgba(212, 175, 55, 0.22) 0%, rgba(13, 17, 26, 0.95) 100%)',
    tagAr: 'إجمالي الكاش الحالي',
    tagEn: 'FIN-OS Liquidity Engine'
  }), [kpis.cashBank]);

  const outflowNodes: FlowNode[] = useMemo(() => [
    {
      id: 'outflow-land',
      titleAr: 'شراء أرض المشروع',
      titleEn: 'Land Acquisition (120100)',
      subtitleAr: 'الفلوس اللي اتدفعت في الأرض',
      subtitleEn: 'Strategic site purchases',
      amount: wipAccounts.land || '0.00',
      category: 'outflow',
      icon: Building2,
      accentColor: '#b45309',
      gradient: 'linear-gradient(135deg, rgba(180, 83, 9, 0.18) 0%, rgba(180, 83, 9, 0.04) 100%)',
      percentage: totalOutflowVolume.isZero() ? 0 : Math.round(D(wipAccounts.land || 0).div(totalOutflowVolume).times(100).toNumber()),
      tagAr: 'أرض المشروع',
      tagEn: 'Capitalized WIP Land'
    },
    {
      id: 'outflow-civil',
      titleAr: 'أعمال الخرسانة والمباني',
      titleEn: 'Structural & Concrete (120200)',
      subtitleAr: 'مصاريف مقاولين الخرسانة والحدادة والمباني',
      subtitleEn: 'Core structure & civil contracting',
      amount: wipAccounts.civil || '0.00',
      category: 'outflow',
      icon: Layers,
      accentColor: '#64748b',
      gradient: 'linear-gradient(135deg, rgba(100, 116, 139, 0.18) 0%, rgba(100, 116, 139, 0.04) 100%)',
      percentage: totalOutflowVolume.isZero() ? 0 : Math.round(D(wipAccounts.civil || 0).div(totalOutflowVolume).times(100).toNumber()),
      tagAr: 'خرسانة ومباني',
      tagEn: 'Direct Construction'
    },
    {
      id: 'outflow-mep',
      titleAr: 'السباكة والكهرباء والتكييف',
      titleEn: 'MEP Infrastructure (120300)',
      subtitleAr: 'تأسيس شبكات الكهرباء والمواصير والمرافق',
      subtitleEn: 'Electro-mechanical & utilities',
      amount: wipAccounts.mep || '0.00',
      category: 'outflow',
      icon: Sparkles,
      accentColor: '#059669',
      gradient: 'linear-gradient(135deg, rgba(5, 150, 105, 0.18) 0%, rgba(5, 150, 105, 0.04) 100%)',
      percentage: totalOutflowVolume.isZero() ? 0 : Math.round(D(wipAccounts.mep || 0).div(totalOutflowVolume).times(100).toNumber()),
      tagAr: 'تأسيس وسباكة',
      tagEn: 'Engineering Infrastructure'
    },
    {
      id: 'outflow-finishing',
      titleAr: 'التشطيبات والواجهات',
      titleEn: 'Architectural Finishing (120400)',
      subtitleAr: 'مصاريف تشطيب الواجهات والشقق',
      subtitleEn: 'Stone facades & luxury finishes',
      amount: wipAccounts.finishing || '0.00',
      category: 'outflow',
      icon: PieIcon,
      accentColor: '#f59e0b',
      gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(245, 158, 11, 0.04) 100%)',
      percentage: totalOutflowVolume.isZero() ? 0 : Math.round(D(wipAccounts.finishing || 0).div(totalOutflowVolume).times(100).toNumber()),
      tagAr: 'تشطيبات',
      tagEn: 'Architectural Delivery'
    },
    {
      id: 'outflow-taxes',
      titleAr: 'الضرائب ورسوم الشقق',
      titleEn: 'Sovereign Taxes & Levies',
      subtitleAr: 'ضريبة التصرفات العقارية (2.5%) ورسوم التسجيل',
      subtitleEn: '2.5% disposal tax & VAT provisions',
      amount: totalTaxes,
      category: 'outflow',
      icon: FileText,
      accentColor: '#ef4444',
      gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(239, 68, 68, 0.04) 100%)',
      percentage: totalOutflowVolume.isZero() ? 0 : Math.round(D(totalTaxes).div(totalOutflowVolume).times(100).toNumber()),
      tagAr: 'ضرائب ورسوم',
      tagEn: 'Statutory Obligation'
    }
  ], [wipAccounts, totalTaxes, totalOutflowVolume]);

  // Recalculate SVG connector bezier paths dynamically based on active DOM coordinates and zoomScale
  const updateConnections = useCallback(() => {
    const gridEl = gridRef.current;
    if (!gridEl) return;
    const gridRect = gridEl.getBoundingClientRect();

    const coreEl = gridEl.querySelector(`[data-flow-node="core-treasury"]`);
    if (!coreEl) return;
    const coreRect = coreEl.getBoundingClientRect();

    const scale = zoomScale || 1.0;
    const newConns: Array<{
      fromId: string;
      toId: string;
      path: string;
      color: string;
      isInbound: boolean;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    }> = [];

    // Core anchor points relative to the grid container, adjusted for zoom scale
    const coreInboundX = isAr 
      ? (coreRect.right - gridRect.left) / scale
      : (coreRect.left - gridRect.left) / scale;

    const coreOutboundX = isAr 
      ? (coreRect.left - gridRect.left) / scale
      : (coreRect.right - gridRect.left) / scale;

    // Helper: Build symmetric smooth cubic Bézier curve with gentle horizontal lead
    const buildCubicPath = (startX: number, startY: number, endX: number, endY: number) => {
      const deltaX = Math.abs(endX - startX) * 0.48;
      const cp1x = startX > endX ? (startX - deltaX) : (startX + deltaX);
      const cp2x = startX > endX ? (endX + deltaX) : (endX - deltaX);
      return `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`;
    };

    // 1. Compute Inbound Flows -> Core
    if (activeFilter === 'all' || activeFilter === 'inflows' || activeFilter === 'net') {
      const totalInflows = inflowNodes.length;
      inflowNodes.forEach((node, idx) => {
        const el = gridEl.querySelector(`[data-flow-node="${node.id}"]`);
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;

        const startX = (isAr ? (r.left - gridRect.left) : (r.right - gridRect.left)) / scale;
        const startY = ((r.top + r.height / 2) - gridRect.top) / scale;

        // Distribute connection ports vertically along the core card's inbound edge to avoid clumping
        const verticalFactor = totalInflows > 1 ? (0.28 + 0.44 * (idx / (totalInflows - 1))) : 0.5;
        const targetCoreY = ((coreRect.top + coreRect.height * verticalFactor) - gridRect.top) / scale;

        // Land the arrowhead right on the card perimeter so it is prominent and sharp
        const endX = isAr ? (coreInboundX + 1) : (coreInboundX - 1);
        const endY = targetCoreY;

        newConns.push({
          fromId: node.id,
          toId: 'core-treasury',
          path: buildCubicPath(startX, startY, endX, endY),
          color: node.accentColor,
          isInbound: true,
          startX,
          startY,
          endX,
          endY
        });
      });
    }

    // 2. Compute Core -> Outbound Flows
    if (activeFilter === 'all' || activeFilter === 'outflows' || activeFilter === 'net') {
      const totalOutflows = outflowNodes.length;
      outflowNodes.forEach((node, idx) => {
        const el = gridEl.querySelector(`[data-flow-node="${node.id}"]`);
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;

        // Distribute source ports vertically along the core card's outbound edge
        const verticalFactor = totalOutflows > 1 ? (0.22 + 0.56 * (idx / (totalOutflows - 1))) : 0.5;
        const sourceCoreY = ((coreRect.top + coreRect.height * verticalFactor) - gridRect.top) / scale;

        const startX = coreOutboundX;
        const startY = sourceCoreY;
        const endX = (isAr ? (r.right - gridRect.left + 1) : (r.left - gridRect.left - 1)) / scale;
        const endY = ((r.top + r.height / 2) - gridRect.top) / scale;

        newConns.push({
          fromId: 'core-treasury',
          toId: node.id,
          path: buildCubicPath(startX, startY, endX, endY),
          color: node.accentColor,
          isInbound: false,
          startX,
          startY,
          endX,
          endY
        });
      });
    }

    setConnections(newConns);
  }, [inflowNodes, outflowNodes, isAr, activeFilter, zoomScale]);

  // Window resize & layout shift listener
  useEffect(() => {
    updateConnections();
    const handleResize = () => updateConnections();
    window.addEventListener('resize', handleResize);
    
    const t1 = setTimeout(updateConnections, 60);
    const t2 = setTimeout(updateConnections, 200);
    const t3 = setTimeout(updateConnections, 500);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && gridRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateConnections();
      });
      resizeObserver.observe(gridRef.current);
      const cols = gridRef.current.children;
      for (let i = 0; i < cols.length; i++) {
        if (cols[i].tagName.toLowerCase() !== 'svg') {
          resizeObserver.observe(cols[i]);
        }
      }
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [updateConnections, zoomScale]);

  // Staggered connector recalibration during fluid filter transitions and node selection
  useEffect(() => {
    updateConnections();
    const t0 = setTimeout(updateConnections, 35);
    const t1 = setTimeout(updateConnections, 90);
    const t2 = setTimeout(updateConnections, 175);
    const t3 = setTimeout(updateConnections, 290);
    const t4 = setTimeout(updateConnections, 430);
    const t5 = setTimeout(updateConnections, 580);
    const t6 = setTimeout(updateConnections, 720);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [activeFilter, selectedNodeId, updateConnections]);

  // Comprehensive Node Dossiers Dictionary
  const nodeDossiers: Record<string, NodeDossier> = useMemo(() => {
    const grossVal = D(totalGrossContractValue);
    const collectedVal = D(totalCollectedCash);
    const collectionRate = grossVal.isZero() ? '0.0%' : collectedVal.div(grossVal).times(100).toFixed(1) + '%';
    const backlogVal = D(deferredBacklog);
    const backlogRatio = grossVal.isZero() ? '0.0%' : backlogVal.div(grossVal).times(100).toFixed(1) + '%';

    return {
      'inflow-sales': {
        id: 'inflow-sales',
        glCode: 'GL-101000 / GL-401000',
        categoryBadgeAr: 'إيراد تشغيلي محصل',
        categoryBadgeEn: 'Realized Operating Inflow',
        titleAr: 'متحصلات عقود البيع',
        titleEn: 'Sales Collections',
        subtitleAr: 'مقدمات وأقساط محصلة فعلياً في حسابات البنوك',
        subtitleEn: 'Down payments & cleared bank tranches',
        amount: totalCollectedCash,
        accentColor: '#10b981',
        velocityLabelAr: 'سيولة فورية محققة',
        velocityLabelEn: 'Instant Liquid',
        velocityBadgeColor: '#10b981',
        summaryAr: 'متحصلات عقود بيع الوحدات السكنية والتجارية المحصلة فعلياً والمودعة بحسابات البنوك والخزينة المركزية، وتعتبر المغذي التشغيلي الأساسي لمشاريع التطوير.',
        summaryEn: 'Actual cash collected from real estate sale contracts, representing the primary operational fuel for ongoing development.',
        metrics: [
          { labelAr: 'إجمالي العقود الموقعة', labelEn: 'Gross Contract Value', value: `${formatCleanWholeNumber(totalGrossContractValue)} ج.م` },
          { labelAr: 'نسبة التحصيل الفعلي', labelEn: 'Realized Rate', value: collectionRate, color: '#10b981' },
          { labelAr: 'متبقي قيد التحصيل', labelEn: 'Pending Backlog', value: `${formatCleanWholeNumber(deferredBacklog)} ج.م` },
          { labelAr: 'الحصة من التدفقات', labelEn: 'Share of Inflows', value: `${totalInflowVolume.isZero() ? 0 : Math.round(collectedVal.div(totalInflowVolume).times(100).toNumber())}%`, color: '#10b981' }
        ],
        breakdowns: [
          { labelAr: 'الدفعات المقدمة (Down payments)', labelEn: 'Down payments', amount: formatCleanWholeNumber(collectedVal.times(0.35).toString()) + ' ج.م', percentage: 35, color: '#10b981' },
          { labelAr: 'الأقساط الربع سنوية المسددة', labelEn: 'Quarterly Cleared', amount: formatCleanWholeNumber(collectedVal.times(0.65).toString()) + ' ج.م', percentage: 65, color: '#059669' }
        ],
        auditContext: {
          entryTypeAr: 'مدين: الخزينة/البنوك (101000) | دائن: إيرادات عقود بيع (401000)',
          entryTypeEn: 'DR: Cash/Banks (101000) | CR: Realized Revenue (401000)',
          verificationAr: 'مطابقة بنكية دورية مع إشعارات التحصيل المصرفية',
          verificationEn: 'Daily bank reconciliations with cleared advice slips',
          strategicImpactAr: 'تغذية دورة الإنشاءات وسداد مستحقات المقاولين وتأمين مستلزمات المشروعات.',
          strategicImpactEn: 'Directly finances site contractor invoices and construction procurement.'
        }
      },
      'inflow-pdc': {
        id: 'inflow-pdc',
        glCode: 'GL-104000',
        categoryBadgeAr: 'أقساط ومستحقات مؤجلة',
        categoryBadgeEn: 'Scheduled Dues',
        titleAr: 'أقساط عند العملاء (المؤجلة)',
        titleEn: 'Deferred Customer Dues',
        subtitleAr: 'مواعيد ووعود سداد تعاقدية مؤكدة',
        subtitleEn: 'Contractual installment schedule tranches',
        amount: totalSafePDCs,
        accentColor: '#06b6d4',
        velocityLabelAr: 'استحقاق تعاقدي',
        velocityLabelEn: 'Contractual Maturity',
        velocityBadgeColor: '#0891b2',
        summaryAr: 'أقساط تعاقدية مجدولة مستحقة على المشترين ومسجلة بحافظة المنظومة، تمثل التزاماً بالسداد على دفعات حسب مواعيد العقد.',
        summaryEn: 'Contractual installment receivables from contracted purchasers in company ledger, guaranteeing scheduled collection tranches.',
        metrics: [
          { labelAr: 'رصيد الأقساط المؤجلة', labelEn: 'Deferred Dues Balance', value: `${formatCleanWholeNumber(totalSafePDCs)} ج.م` },
          { labelAr: 'الحصة من التدفقات', labelEn: 'Share of Inflows', value: `${totalInflowVolume.isZero() ? 0 : Math.round(D(totalSafePDCs).div(totalInflowVolume).times(100).toNumber())}%`, color: '#06b6d4' },
          { labelAr: 'تكلفة الخصم التجاري', labelEn: 'Discount Burden', value: '0.00 ج.م', color: '#10b981' },
          { labelAr: 'طريقة السداد', labelEn: 'Settlement Mode', value: 'نقدي باليد / إنستاباي', color: '#0f172a' }
        ],
        breakdowns: [
          { labelAr: 'أقساط تستحق خلال 90 يوماً', labelEn: 'Maturing < 90 Days', amount: formatCleanWholeNumber(D(totalSafePDCs).times(0.42).toString()) + ' ج.م', percentage: 42, color: '#06b6d4' },
          { labelAr: 'أقساط تستحق خلال 6-12 شهراً', labelEn: 'Maturing 6-12 Mos', amount: formatCleanWholeNumber(D(totalSafePDCs).times(0.58).toString()) + ' ج.م', percentage: 58, color: '#0891b2' }
        ],
        auditContext: {
          entryTypeAr: 'مدين: أقساط ومستحقات مؤجلة (104000) | دائن: إيرادات عقود مؤجلة (203000)',
          entryTypeEn: 'DR: Deferred Dues (104000) | CR: Deferred Revenue (203000)',
          verificationAr: 'جرد أسبوعي ومطابقة مع جدول عقود البيع وسندات القبض',
          verificationEn: 'Weekly reconciliation against contract schedules and receipt vouchers',
          strategicImpactAr: 'صمام أمان لاستمرارية التدفقات وتأمين مستخلصات مقاولي الخرسانات.',
          strategicImpactEn: 'Guarantees structural milestones funding without bank lending.'
        }
      },
      'inflow-equity': {
        id: 'inflow-equity',
        glCode: 'GL-301000',
        categoryBadgeAr: 'حقوق ملكية ومساهمات',
        categoryBadgeEn: 'Equity Capital Calls',
        titleAr: 'مساهمات رؤوس أموال الشركاء',
        titleEn: 'Partner Injected Equity',
        subtitleAr: 'تمويل مباشر للمشروعات دون أعباء فوائد',
        subtitleEn: 'Direct capital calls & equity injection',
        amount: totalInjectedCapital,
        accentColor: '#d4af37',
        velocityLabelAr: 'تمويل ذاتي مباشر',
        velocityLabelEn: 'Direct Equity',
        velocityBadgeColor: '#b45309',
        summaryAr: 'مبالغ التمويل الذاتي المحقونة من الشركاء والمساهمين لتغطية شراء الأراضي والإنفاق التأسيسي، مما يعزز الملاءة ويحمي هوامش الربح.',
        summaryEn: 'Equity funds injected by partners for site acquisitions and initial infrastructure, eliminating bank debt reliance.',
        metrics: [
          { labelAr: 'إجمالي رأس المال المحقون', labelEn: 'Total Injected Capital', value: `${formatCleanWholeNumber(totalInjectedCapital)} ج.م` },
          { labelAr: 'طلبات التمويل المسجلة', labelEn: 'Logged Capital Calls', value: `${partnerCalls.length} طلبات`, color: '#d4af37' },
          { labelAr: 'عبء الفوائد التمويلية', labelEn: 'Interest Cost', value: '0.00%', color: '#10b981' },
          { labelAr: 'الحصة من القاعدة', labelEn: 'Share of Base', value: `${totalInflowVolume.isZero() ? 0 : Math.round(D(totalInjectedCapital).div(totalInflowVolume).times(100).toNumber())}%`, color: '#d4af37' }
        ],
        auditContext: {
          entryTypeAr: 'مدين: البنوك (102000) | دائن: رأس مال الشركاء / جاري الشركاء (301000)',
          entryTypeEn: 'DR: Bank (102000) | CR: Partners Capital (301000)',
          verificationAr: 'قرارات مجلس إدارة معتمدة وإشعارات تحويل مصرفية رسمية',
          verificationEn: 'Board resolutions and formal SWIFT bank credit confirmations',
          strategicImpactAr: 'حماية المركز المالي من أعباء القروض وتحقيق استقلالية مالية كاملة.',
          strategicImpactEn: 'Shields corporate balance sheet from credit tightening and rising interest.'
        }
      },
      'inflow-backlog': {
        id: 'inflow-backlog',
        glCode: 'GL-104000',
        categoryBadgeAr: 'أقساط ومستحقات عقود',
        categoryBadgeEn: 'Receivables Backlog',
        titleAr: 'أقساط ووعود سداد عند العملاء',
        titleEn: 'Installments & Receivables',
        subtitleAr: 'أقساط تعاقدية مؤجلة الاستحقاق بموجب عقود البيع',
        subtitleEn: 'Deferred contract receivables on sold units',
        amount: deferredBacklog,
        accentColor: '#06b6d4',
        velocityLabelAr: 'استحقاقات قادمة بالعقود',
        velocityLabelEn: 'Scheduled Dues',
        velocityBadgeColor: '#0891b2',
        summaryAr: 'الرصيد المالي المتبقي في ذمة المشترين بموجب عقود البيع وجداول الأقساط المعتمدة. يتم تحصيله نقداً باليد أو تحويل مع إصدار سندات قبض عند حلول كل موعد سداد.',
        summaryEn: 'Committed contract receivables pipeline representing expected collections aligned with client payment schedules.',
        metrics: [
          { labelAr: 'الرصيد التعاقدي المتبقي', labelEn: 'Backlog Balance', value: `${formatCleanWholeNumber(deferredBacklog)} ج.م` },
          { labelAr: 'إجمالي مبيعات المحفظة', labelEn: 'Total Portfolio Sales', value: `${formatCleanWholeNumber(totalGrossContractValue)} ج.م` },
          { labelAr: 'نسبة التغطية التعاقدية', labelEn: 'Backlog Coverage', value: backlogRatio, color: '#06b6d4' },
          { labelAr: 'طريقة التحصيل', labelEn: 'Collection Mode', value: 'سندات قبض كاش / تحويل', color: '#10b981' }
        ],
        auditContext: {
          entryTypeAr: 'استحقاق تعاقدي بموجب جدول أقساط العقد وسندات القبض النقدية',
          entryTypeEn: 'Contractual installment schedule and cash collection vouchers',
          verificationAr: 'مطابق لبيان عقود البيع الموثقة وجداول السداد الموقعة مع المشترين',
          verificationEn: 'Reconciled against signed unit contracts and installment schedules',
          strategicImpactAr: 'تأمين استرداد كافة تكاليف التطوير والخرسانات وتحقيق الأرباح الصافية.',
          strategicImpactEn: 'Secures full recoupment of development costs and target profit margins.'
        }
      },
      'core-treasury': {
        id: 'core-treasury',
        glCode: 'GL-101000 / GL-102000',
        categoryBadgeAr: 'قلب المنظومة المالية FIN-OS',
        categoryBadgeEn: 'FIN-OS Liquidity Engine',
        titleAr: 'الخزينة المركزية وحسابات البنوك',
        titleEn: 'Central Treasury & Liquidity Pool',
        subtitleAr: 'المحفظة المركزية للسيولة والتدفقات النقدية الحرة',
        subtitleEn: 'Consolidated real cash & liquid bank reserves',
        amount: kpis.cashBank,
        accentColor: '#d4af37',
        velocityLabelAr: 'سيولة حرة غير مقيدة',
        velocityLabelEn: 'Unrestricted Liquid',
        velocityBadgeColor: '#946f23',
        summaryAr: 'مجمع السيولة المركزي المجمع لكافة الخزائن والحسابات البنكية للمؤسسة. يدير التدفقات الداخلة ويوزع الصرف على المشروعات والالتزامات وفق الأولويات الرأسمالية.',
        summaryEn: 'Centralized liquidity hub managing free cash reserves, balancing capital inflows against project construction disbursements.',
        metrics: [
          { labelAr: 'السيولة الحرة المتاحة', labelEn: 'Free Cash Balance', value: `${formatCleanWholeNumber(kpis.cashBank)} ج.م`, color: '#d4af37' },
          { labelAr: 'إجمالي التدفقات الداخلة', labelEn: 'Total Inflows', value: `${formatCleanWholeNumber(totalInflowVolume.toString())} ج.م`, color: '#10b981' },
          { labelAr: 'إجمالي المصروفات المنفذة', labelEn: 'Total Outflows', value: `${formatCleanWholeNumber(totalOutflowVolume.toString())} ج.م`, color: '#f59e0b' },
          { labelAr: 'صافي الفائض التشغيلي', labelEn: 'Net Cash Spread', value: `${netOperationalDelta.isNegative() ? '-' : '+'}${formatCleanWholeNumber(netOperationalDelta.abs().toString())} ج.م`, color: netOperationalDelta.isNegative() ? '#ef4444' : '#10b981' }
        ],
        breakdowns: [
          { labelAr: 'معدل تغطية تكاليف المشروعات المنفذة (WIP)', labelEn: 'WIP Cost Coverage', amount: wipCoverage, percentage: Math.min(100, Math.round(parseFloat(wipCoverage) || 0)), color: '#d4af37' },
          { labelAr: 'نسبة التدفقات الداخلة إلى المصروفات', labelEn: 'Inflow to Outflow Ratio', amount: totalOutflowVolume.isZero() ? '100%' : (totalInflowVolume.div(totalOutflowVolume).times(100).toFixed(0) + '%'), percentage: Math.min(100, Math.round(totalOutflowVolume.isZero() ? 100 : totalInflowVolume.div(totalOutflowVolume).times(100).toNumber())), color: '#10b981' }
        ],
        auditContext: {
          entryTypeAr: 'الأصول المتداولة: نقدية وما في حكمها وحسابات جارية واستثمارية (101000/102000)',
          entryTypeEn: 'Current Assets: Cash & Equivalents, Treasury & Banks (101000/102000)',
          verificationAr: 'تسوية بنكية يومية آلية ومطابقة إلكترونية مع دفاتر الأستاذ العام',
          verificationEn: 'Daily automated bank reconciliation against General Ledger accounts',
          strategicImpactAr: 'ضمان استقرار العمليات، استمرارية المقاولين، وتجنب أي تعثر في التوريدات.',
          strategicImpactEn: 'Ensures business continuity, steady contractor payments, and liquidity resilience.'
        }
      },
      'outflow-land': {
        id: 'outflow-land',
        glCode: 'GL-120100',
        categoryBadgeAr: 'أصول رأسمالية WIP',
        categoryBadgeEn: 'Capitalized WIP Land',
        titleAr: 'أراضي ومواقع المشروعات (120100)',
        titleEn: 'Land Acquisition (120100)',
        subtitleAr: 'تكاليف الأراضي الاستراتيجية وتراخيصها',
        subtitleEn: 'Strategic site purchases & title deeds',
        amount: wipAccounts.land || '0.00',
        accentColor: '#b45309',
        velocityLabelAr: 'أصل رأسمالي استراتيجي',
        velocityLabelEn: 'Strategic CapEx',
        velocityBadgeColor: '#b45309',
        summaryAr: 'إجمالي الاستثمارات الرأسمالية في شراء أراضي المشروعات الاستراتيجية ورسوم التخصيص والتسجيل المحملة على تكلفة التطوير قيد التنفيذ.',
        summaryEn: 'Capitalized investments in strategic land acquisition, parcel zoning, and title registration fees.',
        metrics: [
          { labelAr: 'منصرف شراء الأراضي', labelEn: 'Land Expenditure', value: `${formatCleanWholeNumber(wipAccounts.land || '0.00')} ج.م` },
          { labelAr: 'الحصة من تكاليف WIP', labelEn: 'Share of WIP', value: `${totalOutflowVolume.isZero() ? 0 : Math.round(D(wipAccounts.land || 0).div(totalOutflowVolume).times(100).toNumber())}%`, color: '#b45309' },
          { labelAr: 'طبيعة الأصل', labelEn: 'Asset Type', value: 'أصل استثماري غير قابل للإهلاك' },
          { labelAr: 'الموقف القانوني', labelEn: 'Legal Status', value: 'سندات ملكية مسجلة وموثقة', color: '#10b981' }
        ],
        auditContext: {
          entryTypeAr: 'مدين: مشروعات قيد التنفيذ - أراضي (120100) | دائن: البنوك/الملاك (102000)',
          entryTypeEn: 'DR: WIP - Land (120100) | CR: Banks/Vendors (102000)',
          verificationAr: 'مراجعة العقود الابتدائية والنهائية ومحاضر الاستلام المساحية',
          verificationEn: 'Audited against cadastral surveys, notary deeds, and title deeds',
          strategicImpactAr: 'تمثل وعاء القيمة الرأسمالية الأساسي ومحدد هوامش الربحية في السوق.',
          strategicImpactEn: 'Forms core tangible asset value and underpins real estate profit margins.'
        }
      },
      'outflow-civil': {
        id: 'outflow-civil',
        glCode: 'GL-120200',
        categoryBadgeAr: 'تكلفة مقاولات مباشرة',
        categoryBadgeEn: 'Direct Structural Works',
        titleAr: 'الإنشاءات والخرسانة المسلحة (120200)',
        titleEn: 'Structural & Concrete (120200)',
        subtitleAr: 'الهيكل الخرساني وأعمال المقاولات والأساسات',
        subtitleEn: 'Excavation, footings & reinforced structure',
        amount: wipAccounts.civil || '0.00',
        accentColor: '#64748b',
        velocityLabelAr: 'صرف تنفيذي مباشر',
        velocityLabelEn: 'Direct Site Outflow',
        velocityBadgeColor: '#475569',
        summaryAr: 'مستخلصات المقاولين المعتمدة لأعمال الحفر، الأساسات، والأعمدة والأسقف الخرسانية المسلحة والمباني بكافة المواقع قيد الإنشاء.',
        summaryEn: 'Consultant-certified contractor progress claims for earthwork, foundations, concrete frames, and masonry.',
        metrics: [
          { labelAr: 'منصرف الإنشاءات', labelEn: 'Structural Expenditure', value: `${formatCleanWholeNumber(wipAccounts.civil || '0.00')} ج.م` },
          { labelAr: 'الحصة من تكاليف WIP', labelEn: 'Share of WIP', value: `${totalOutflowVolume.isZero() ? 0 : Math.round(D(wipAccounts.civil || 0).div(totalOutflowVolume).times(100).toNumber())}%`, color: '#64748b' },
          { labelAr: 'آلية الصرف', labelEn: 'Disbursement Type', value: 'مستخلصات دورية هندسية معتمدة' },
          { labelAr: 'نسبة الإنجاز الهيكلي', labelEn: 'Structural Progress', value: 'مطابق للمخطط الزمني', color: '#10b981' }
        ],
        auditContext: {
          entryTypeAr: 'مدين: مشروعات قيد التنفيذ - إنشاءات (120200) | دائن: مقاولي الباطن (201000)',
          entryTypeEn: 'DR: WIP - Civil (120200) | CR: Subcontractors (201000)',
          verificationAr: 'اعتماد الاستشاري الهندسي المشرف وشهادات مطابقة إجهاد الخرسانة',
          verificationEn: 'Certified by engineering consultant and concrete core test reports',
          strategicImpactAr: 'تحويل السيولة النقدية إلى أصول عينية مع زيادة القيمة السوقية للوحدات.',
          strategicImpactEn: 'Converts liquid cash into solid physical value, raising market asset price.'
        }
      },
      'outflow-mep': {
        id: 'outflow-mep',
        glCode: 'GL-120300',
        categoryBadgeAr: 'بنية تحتية هندسية',
        categoryBadgeEn: 'Engineering Infrastructure',
        titleAr: 'الكهروميكانيك والمرافق (120300)',
        titleEn: 'MEP Infrastructure (120300)',
        subtitleAr: 'شبكات الكهرباء، المياه، التكييف، والصرف',
        subtitleEn: 'Power, water networks, HVAC & fire fighting',
        amount: wipAccounts.mep || '0.00',
        accentColor: '#059669',
        velocityLabelAr: 'تجهيزات متخصصة',
        velocityLabelEn: 'Specialized Utility',
        velocityBadgeColor: '#059669',
        summaryAr: 'تكاليف شبكات التغذية الكهربائية، الصرف الصحي، محطات التكييف، أنظمة مكافحة الحرائق، وشبكات الاتصالات والإنترنت بالمشروعات.',
        summaryEn: 'Capital expenditure on MEP systems, plumbing, electric distribution networks, and advanced firefighting.',
        metrics: [
          { labelAr: 'منصرف الكهروميكانيك', labelEn: 'MEP Outflow', value: `${formatCleanWholeNumber(wipAccounts.mep || '0.00')} ج.م` },
          { labelAr: 'الحصة من تكاليف WIP', labelEn: 'Share of WIP', value: `${totalOutflowVolume.isZero() ? 0 : Math.round(D(wipAccounts.mep || 0).div(totalOutflowVolume).times(100).toNumber())}%`, color: '#059669' },
          { labelAr: 'جودة التجهيز', labelEn: 'Equipment Standard', value: 'مطابق للأكواد العالمية' },
          { labelAr: 'خطابات الضمان', labelEn: 'Warranty Slips', value: 'سارية ومودعة بالخزينة', color: '#10b981' }
        ],
        auditContext: {
          entryTypeAr: 'مدين: مشروعات قيد التنفيذ - كهروميكانيك (120300) | دائن: الموردون والمقاولون (201000)',
          entryTypeEn: 'DR: WIP - MEP (120300) | CR: Vendors & Contractors (201000)',
          verificationAr: 'محاضر اختبار الضغط وفحص كفاءة العوازل ومحطات التغذية',
          verificationEn: 'Hydrostatic pressure testing protocols and insulation resistance audits',
          strategicImpactAr: 'رفع الكفاءة التشغيلية وجاهزية المرافق وتسريع الحصول على شهادات الإشغال.',
          strategicImpactEn: 'Ensures functional readiness, accelerating occupancy license issuances.'
        }
      },
      'outflow-finishing': {
        id: 'outflow-finishing',
        glCode: 'GL-120400',
        categoryBadgeAr: 'تشطيبات نهائية',
        categoryBadgeEn: 'Architectural Delivery',
        titleAr: 'التشطيبات المعمارية (120400)',
        titleEn: 'Architectural Finishing (120400)',
        subtitleAr: 'واجهات حجرية، رخام، ودهانات فاخرة',
        subtitleEn: 'Stone facades, marble lobbies & premium paint',
        amount: wipAccounts.finishing || '0.00',
        accentColor: '#f59e0b',
        velocityLabelAr: 'مرحلة التسليم النهائي',
        velocityLabelEn: 'Handover Stage',
        velocityBadgeColor: '#d97706',
        summaryAr: 'توريدات وتركيبات الأحجار الطبيعية للواجهات، الرخام، الألمونيوم المزدوج، والأعمال المعمارية التي تمنح المشروع مظهره الفاخر الأخير.',
        summaryEn: 'Procurement and installation of premium exterior stone, architectural marble, and interior fit-outs.',
        metrics: [
          { labelAr: 'منصرف التشطيبات', labelEn: 'Finishing Outflow', value: `${formatCleanWholeNumber(wipAccounts.finishing || '0.00')} ج.م` },
          { labelAr: 'الحصة من تكاليف WIP', labelEn: 'Share of WIP', value: `${totalOutflowVolume.isZero() ? 0 : Math.round(D(wipAccounts.finishing || 0).div(totalOutflowVolume).times(100).toNumber())}%`, color: '#f59e0b' },
          { labelAr: 'نوعية المواد', labelEn: 'Material Grade', value: 'حجر طبيعي ورخام مستورد' },
          { labelAr: 'حالة الجاهزية', labelEn: 'Handover State', value: 'المرحلة النهائية للتسليم', color: '#10b981' }
        ],
        auditContext: {
          entryTypeAr: 'مدين: مشروعات قيد التنفيذ - تشطيبات (120400) | دائن: مقاولو التشطيبات (201000)',
          entryTypeEn: 'DR: WIP - Finishing (120400) | CR: Finishing Contractors (201000)',
          verificationAr: 'استلامات معمارية نهائية ومطابقة العينات المعتمدة بالعقد',
          verificationEn: 'Final architectural punch-lists matched to contractual benchmark samples',
          strategicImpactAr: 'تعظيم القيمة البيعية للوحدات المتبقية والالتزام بمواعيد تسليم المشترين.',
          strategicImpactEn: 'Maximizes sales value of remaining units and honors buyer delivery SLAs.'
        }
      },
      'outflow-taxes': {
        id: 'outflow-taxes',
        glCode: 'GL-205000',
        categoryBadgeAr: 'التزام سيادي وقانوني',
        categoryBadgeEn: 'Statutory Obligation',
        titleAr: 'الضرائب والرسوم السيادية',
        titleEn: 'Sovereign Taxes & Levies',
        subtitleAr: 'ضريبة تصرفات عقارية (2.5%) وقيمة مضافة ورسوم',
        subtitleEn: '2.5% property disposal tax & VAT provisions',
        amount: totalTaxes,
        accentColor: '#ef4444',
        velocityLabelAr: 'التزام نظامي واجب الصرف',
        velocityLabelEn: 'Mandatory Legal',
        velocityBadgeColor: '#dc2626',
        summaryAr: 'المبالغ المسددة والمستحقة لمصلحة الضرائب والجهات الحكومية، بما فيها ضريبة التصرفات العقارية ورسوم الشهر العقاري وتراخيص البناء.',
        summaryEn: 'Settled and accrued statutory tax liabilities including 2.5% real estate disposal tax, municipality dues, and VAT.',
        metrics: [
          { labelAr: 'إجمالي الضرائب والرسوم', labelEn: 'Total Taxes', value: `${formatCleanWholeNumber(totalTaxes)} ج.م` },
          { labelAr: 'عدد السجلات المقيدة', labelEn: 'Logged Records', value: `${taxRecords.length} سجلات`, color: '#ef4444' },
          { labelAr: 'الحصة من المصروفات', labelEn: 'Share of Outflows', value: `${totalOutflowVolume.isZero() ? 0 : Math.round(D(totalTaxes).div(totalOutflowVolume).times(100).toNumber())}%`, color: '#ef4444' },
          { labelAr: 'الموقف الضريبي', labelEn: 'Tax Compliance', value: 'سجل ضريبي نظامي منتظم', color: '#10b981' }
        ],
        breakdowns: [
          { labelAr: 'ضريبة التصرفات العقارية (2.5%)', labelEn: '2.5% Disposal Tax', amount: formatCleanWholeNumber(D(totalTaxes).times(0.8).toString()) + ' ج.م', percentage: 80, color: '#ef4444' },
          { labelAr: 'رسوم تراخيص وتوثيق حكومية', labelEn: 'Registration & Permits', amount: formatCleanWholeNumber(D(totalTaxes).times(0.2).toString()) + ' ج.م', percentage: 20, color: '#dc2626' }
        ],
        auditContext: {
          entryTypeAr: 'مدين: ضرائب ورسوم مشروعات (508000) | دائن: مصلحة الضرائب (205000)',
          entryTypeEn: 'DR: Statutory Taxes Expense (508000) | CR: Tax Authority (205000)',
          verificationAr: 'إيصالات السداد الإلكترونية وسندات الخصم والتحصيل الضريبي الرسمي',
          verificationEn: 'Electronic payment receipts and official withholding tax certificates',
          strategicImpactAr: 'تحصين الموقف القانوني للشركة وحماية الملاك عند نقل الملكية والتسجيل.',
          strategicImpactEn: 'Safeguards corporate legal standing and secures clear title transfer for buyers.'
        }
      }
    };
  }, [totalGrossContractValue, totalCollectedCash, deferredBacklog, totalSafePDCs, totalInjectedCapital, totalInflowVolume, totalWipIncurred, totalTaxes, totalOutflowVolume, kpis.cashBank, wipAccounts, taxRecords.length, partnerCalls.length, netOperationalDelta, wipCoverage]);

  // Currently active dossier
  const activeDossier = selectedNodeId ? nodeDossiers[selectedNodeId] : null;

  return (
    <div 
      ref={containerRef}
      className="mindmap-container"
      style={{
        position: 'relative',
        top: 'auto',
        left: 'auto',
        width: '100%',
        height: 'auto',
        minHeight: embeddedInStudio ? 'auto' : '650px',
        zIndex: 1,
        background: embeddedInStudio ? 'transparent' : '#f8fafc',
        backgroundImage: !embeddedInStudio ? 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)' : 'none',
        backgroundSize: '24px 24px',
        border: embeddedInStudio ? 'none' : '1.5px solid #cbd5e1',
        borderRadius: embeddedInStudio ? 0 : '16px',
        padding: embeddedInStudio ? '0' : '1.5rem',
        boxSizing: 'border-box',
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: embeddedInStudio ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05), 0 10px 25px -5px rgba(0, 0, 0, 0.04)'
      }}
    >
      <style>{`
        @keyframes flowDashInbound {
          from { stroke-dashoffset: 32; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes flowDashOutbound {
          from { stroke-dashoffset: 32; }
          to { stroke-dashoffset: 0; }
        }
        .flow-card-interactive {
          background: #ffffff !important;
          border-color: #cbd5e1 !important;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 12px -2px rgba(0, 0, 0, 0.04);
        }
        .flow-card-interactive:hover {
          transform: translateY(-2.5px);
          box-shadow: 0 4px 12px -1px rgba(0, 0, 0, 0.08), 0 12px 24px -4px rgba(0, 0, 0, 0.06);
          border-color: #94a3b8 !important;
        }
        .flow-card-interactive.is-selected {
          box-shadow: 0 0 0 2.5px var(--accent-color, #d4af37), 0 12px 28px -4px rgba(0, 0, 0, 0.1) !important;
          border-color: var(--accent-color, #d4af37) !important;
          transform: translateY(-2px);
        }
        .custom-thin-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-thin-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-thin-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
        }
        .custom-thin-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* ─── TOOLBAR CONTROLS HEADER ──────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.65rem',
        borderBottom: '1px solid #e2e8f0',
        padding: embeddedInStudio ? '0.15rem 0 0.5rem' : '0 0 1.25rem',
        background: 'transparent',
        zIndex: 20
      }}>
        {/* Title & Legend (when not embedded in studio) */}
        {!embeddedInStudio && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{
                background: '#fefce8',
                border: '1px solid #fef08a',
                borderRadius: '8px',
                padding: '0.35rem 0.55rem',
                color: '#946f23',
                display: 'flex',
                alignItems: 'center'
              }}>
                <TrendingUp size={16} />
              </span>
              <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                {isAr ? 'حركة الأموال (داخلة وخارجة)' : 'Capital Flow Mindmap & Treasury Topology'}
              </h4>
              <span style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                borderRadius: '999px',
                padding: '0.15rem 0.6rem',
                fontSize: '0.68rem',
                fontWeight: 700
              }}>
                {isAr ? 'حركة الأموال المباشرة' : 'Live Directed Conduits'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
              {isAr 
                ? 'توضيح لحركة الفلوس: من أين جاءت، وأين صُرفت، وصافي المتبقي بالخزينة والبنوك' 
                : 'Interactive directed topology connecting capital sources into central treasury and project allocations'}
            </p>
          </div>
        )}

        {/* Minimal inline indicator when embedded in studio */}
        {embeddedInStudio && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.25)',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
              {isAr ? 'حركة الأموال المباشرة' : 'Live Directed Topology'}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
              {isAr ? '• ربط مباشر بين الخزينة والمشاريع' : '• Real-time capital allocation'}
            </span>
          </div>
        )}

        {/* Action Controls: Zoom + Filters + Fullscreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginInlineStart: 'auto' }}>
          {/* Zoom Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.15rem',
            gap: '0.15rem',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
          }}>
            <button
              type="button"
              onClick={() => setZoomScale(s => Math.min(1.25, Math.round((s + 0.1) * 10) / 10))}
              title={isAr ? 'تكبير (+)' : 'Zoom In (+)'}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#334155',
                borderRadius: '6px',
                padding: '0.3rem',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <ZoomIn size={14} />
            </button>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', minWidth: '38px', textAlign: 'center' }}>
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale(s => Math.max(0.75, Math.round((s - 0.1) * 10) / 10))}
              title={isAr ? 'تصغير (-)' : 'Zoom Out (-)'}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#334155',
                borderRadius: '6px',
                padding: '0.3rem',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1.0)}
              title={isAr ? 'إعادة ضبط 100%' : 'Reset 100%'}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                borderRadius: '6px',
                padding: '0.3rem',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Filter Pills */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.2rem',
            gap: '0.2rem',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
          }}>
            {[
              { id: 'all', labelAr: 'كل الحركات', labelEn: 'All Flows' },
              { id: 'inflows', labelAr: 'الفلوس اللي دخلت', labelEn: 'Inflows' },
              { id: 'outflows', labelAr: 'المصاريف والمباني', labelEn: 'Outflows' },
              { id: 'net', labelAr: 'صافي الكاش المتبقي', labelEn: 'Net Liquidity' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  const nextFilter = f.id as 'all' | 'inflows' | 'outflows' | 'net';
                  setActiveFilter(nextFilter);
                  if (nextFilter === 'inflows' && selectedNodeId && selectedNodeId.startsWith('outflow-')) {
                    setSelectedNodeId(null);
                  } else if (nextFilter === 'outflows' && selectedNodeId && selectedNodeId.startsWith('inflow-')) {
                    setSelectedNodeId(null);
                  }
                }}
                style={{
                  background: activeFilter === f.id ? '#0f172a' : 'transparent',
                  border: activeFilter === f.id ? '1px solid #0f172a' : '1px solid transparent',
                  color: activeFilter === f.id ? '#ffffff' : '#475569',
                  borderRadius: '6px',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {isAr ? f.labelAr : f.labelEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── CANVAS & SPLIT-INSPECTOR WORKBENCH ────────────────────────── */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'visible',
        position: 'relative',
        gap: '1.5rem',
        padding: '0'
      }}>
        {/* Topology Viewport */}
        <div 
          className="custom-thin-scrollbar"
          style={{
            flex: 1,
            overflow: 'auto',
            position: 'relative',
            paddingBottom: '1rem'
          }}
        >
          <div 
            ref={gridRef}
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), grid-template-columns 0.45s cubic-bezier(0.16, 1, 0.3, 1), gap 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: isOutflowHidden 
                ? 'minmax(0, 0.92fr) minmax(0, 1.18fr)' 
                : (isInflowHidden 
                  ? 'minmax(0, 1.18fr) minmax(0, 0.92fr)' 
                  : 'minmax(0, 0.90fr) minmax(0, 1.20fr) minmax(0, 0.90fr)'),
              gap: (isOutflowHidden || isInflowHidden) 
                ? (embeddedInStudio ? '1.75rem' : '2.25rem') 
                : (embeddedInStudio ? 'clamp(1.25rem, 2.5vw, 2.5rem)' : 'clamp(1.25rem, 2.5vw, 2.5rem)'),
              alignItems: 'center',
              padding: embeddedInStudio ? '0.4rem 0.2rem 0.8rem' : '1.25rem 0.5rem',
              minHeight: embeddedInStudio ? 'auto' : '520px',
              zIndex: 5
            }}
          >
            {/* SVG CONNECTOR OVERLAY WITH DIRECTED ARROWS & GLOW PARTICLES */}
            <svg 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 7,
                overflow: 'visible'
              }}
            >
              <defs>
                {/* Emerald Arrow Marker */}
                <marker
                  id="arrow-emerald"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
                </marker>

                {/* Cyan Arrow Marker */}
                <marker
                  id="arrow-cyan"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#06b6d4" />
                </marker>

                {/* Gold Arrow Marker */}
                <marker
                  id="arrow-gold"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#d4af37" />
                </marker>

                {/* Amber Arrow Marker */}
                <marker
                  id="arrow-amber"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
                </marker>

                {/* Orange / Brown Arrow Marker */}
                <marker
                  id="arrow-orange"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#b45309" />
                </marker>

                {/* Red Arrow Marker */}
                <marker
                  id="arrow-red"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ef4444" />
                </marker>

                {/* Indigo Arrow Marker */}
                <marker
                  id="arrow-indigo"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#6366f1" />
                </marker>

                {/* Slate Arrow Marker */}
                <marker
                  id="arrow-slate"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
                </marker>

                {/* Teal Arrow Marker */}
                <marker
                  id="arrow-teal"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669" />
                </marker>
              </defs>

              {connections.map((conn, idx) => {
                const isHighlighted = selectedNodeId 
                  ? (conn.fromId === selectedNodeId || conn.toId === selectedNodeId)
                  : true;
                
                let markerId = 'arrow-emerald';
                if (conn.color === '#d4af37' || conn.color === '#e2c974') markerId = 'arrow-gold';
                else if (conn.color === '#06b6d4' || conn.color === '#22d3ee') markerId = 'arrow-cyan';
                else if (conn.color === '#f59e0b') markerId = 'arrow-amber';
                else if (conn.color === '#b45309' || conn.color === '#d97706') markerId = 'arrow-orange';
                else if (conn.color === '#ef4444' || conn.color === '#f87171' || conn.color === '#dc2626') markerId = 'arrow-red';
                else if (conn.color === '#6366f1' || conn.color === '#818cf8') markerId = 'arrow-indigo';
                else if (conn.color === '#64748b' || conn.color === '#475569') markerId = 'arrow-slate';
                else if (conn.color === '#059669') markerId = 'arrow-teal';

                return (
                  <g key={`${conn.fromId}-${conn.toId}-${idx}`}>
                    {/* Background Solid Track with subtle soft glow */}
                    <path
                      d={conn.path}
                      fill="none"
                      stroke={conn.color}
                      strokeWidth={isHighlighted ? 4 : 1.8}
                      strokeOpacity={isHighlighted ? 0.35 : 0.12}
                      strokeLinecap="round"
                    />

                    {/* Animated Flow Conduit with Directed Dash */}
                    <path
                      d={conn.path}
                      fill="none"
                      stroke={conn.color}
                      strokeWidth={isHighlighted ? 2.5 : 1.5}
                      strokeOpacity={isHighlighted ? 0.95 : 0.45}
                      strokeDasharray="6 5"
                      strokeLinecap="round"
                      style={{
                        animation: conn.isInbound 
                          ? 'flowDashInbound 1.8s linear infinite' 
                          : 'flowDashOutbound 1.8s linear infinite'
                      }}
                      markerEnd={`url(#${markerId})`}
                    />

                    {/* Source Anchor Pin */}
                    <circle
                      cx={conn.startX}
                      cy={conn.startY}
                      r={isHighlighted ? 3.5 : 2.5}
                      fill={conn.color}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />

                    {/* Target Anchor Pin */}
                    <circle
                      cx={conn.endX}
                      cy={conn.endY}
                      r={isHighlighted ? 3 : 2}
                      fill={conn.color}
                      stroke="#ffffff"
                      strokeWidth={1}
                    />
                  </g>
                );
              })}
            </svg>

            {/* ── COLUMN 1: INFLOW SOURCES (Right in RTL, Left in LTR) ────── */}
            <div style={{
              display: isInflowHidden ? 'none' : 'flex',
              flexDirection: 'column',
              gap: embeddedInStudio ? '0.55rem' : '0.85rem',
              background: isInflowHidden ? 'transparent' : 'rgba(255, 255, 255, 0.75)',
              border: isInflowHidden ? 'none' : '1.5px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '16px',
              padding: isInflowHidden ? 0 : (embeddedInStudio ? '0.65rem 0.75rem' : '0.9rem 0.95rem'),
              boxShadow: isInflowHidden ? 'none' : (isOutflowHidden ? '0 8px 30px -4px rgba(16, 185, 129, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)' : '0 2px 8px rgba(16, 185, 129, 0.04)'),
              zIndex: 5,
              opacity: isInflowHidden ? 0 : 1,
              maxWidth: isInflowHidden ? '0px' : (embeddedInStudio ? '330px' : '360px'),
              width: '100%',
              minWidth: '0px',
              maxHeight: isInflowHidden ? '0px' : 'none',
              height: isInflowHidden ? '0px' : 'auto',
              overflow: isInflowHidden ? 'hidden' : 'visible',
              pointerEvents: isInflowHidden ? 'none' : 'auto',
              transform: isInflowHidden 
                ? (isAr ? 'translateX(50px) scale(0.92)' : 'translateX(-50px) scale(0.92)') 
                : 'scale(1)',
              transformOrigin: isAr ? 'right center' : 'left center',
              transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              alignSelf: 'center'
            }}>
              {/* Column Header Banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: embeddedInStudio ? '0.45rem' : '0.65rem',
                borderBottom: '1.5px solid rgba(16, 185, 129, 0.2)'
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ArrowDownRight size={15} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />
                  {isAr ? 'الفلوس اللي دخلت (المتحصلات)' : 'Capital Inflows'}
                </span>
                <span style={{ 
                  fontSize: '0.72rem', 
                  color: '#0f172a', 
                  fontVariantNumeric: 'tabular-nums', 
                  fontWeight: 800,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '5px'
                }}>
                  {formatCleanWholeNumber(totalInflowVolume.toString())} {isAr ? 'ج.م' : 'EGP'}
                </span>
              </div>

              {inflowNodes.map(node => {
                const Icon = node.icon;
                const isSelected = selectedNodeId === node.id;
                return (
                  <div
                    key={node.id}
                    data-flow-node={node.id}
                    className={`flow-card-interactive ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedNodeId(prev => prev === node.id ? null : node.id)}
                    style={{
                      '--accent-color': node.accentColor,
                      background: '#ffffff',
                      border: `1.5px solid ${isSelected ? node.accentColor : '#cbd5e1'}`,
                      borderInlineStart: `4px solid ${node.accentColor}`,
                      borderRadius: '10px',
                      padding: embeddedInStudio ? '0.55rem 0.75rem' : '0.8rem 0.9rem',
                      cursor: 'pointer',
                      position: 'relative'
                    } as React.CSSProperties}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: embeddedInStudio ? '28px' : '34px',
                          height: embeddedInStudio ? '28px' : '34px',
                          borderRadius: '7px',
                          background: `${node.accentColor}15`,
                          border: `1px solid ${node.accentColor}35`,
                          color: node.accentColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Icon size={embeddedInStudio ? 15 : 17} />
                        </div>
                        <div>
                          <div style={{ fontSize: embeddedInStudio ? '0.8rem' : '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                            {isAr ? node.titleAr : node.titleEn}
                          </div>
                          <div style={{ fontSize: embeddedInStudio ? '0.64rem' : '0.68rem', color: '#64748b' }}>
                            {isAr ? node.subtitleAr : node.subtitleEn}
                          </div>
                        </div>
                      </div>

                      {node.percentage !== undefined && (
                        <span style={{
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          color: node.accentColor
                        }}>
                          {node.percentage}%
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: embeddedInStudio ? '0.45rem' : '0.65rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: embeddedInStudio ? '0.96rem' : '1.05rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCleanWholeNumber(node.amount)}
                        <span style={{ fontSize: '0.65rem', color: '#64748b', marginInlineStart: '0.25rem' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                      </span>
                      <span style={{ 
                        fontSize: '0.64rem', 
                        color: node.accentColor, 
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}>
                        <span>{isAr ? node.tagAr : node.tagEn}</span>
                        <ChevronRight size={11} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── COLUMN 2: DYNAMIC CENTRAL COCKPIT & TREASURY HUB ─────── */}
            <div 
              data-flow-node={coreNode.id}
              className={`flow-card-interactive custom-thin-scrollbar ${(selectedNodeId === coreNode.id || (!selectedNodeId && activeFilter === 'all')) ? 'is-selected' : ''}`}
              onClick={() => {
                // If an inflow or outflow node was selected, clicking central card resets back to treasury view
                if (selectedNodeId && selectedNodeId !== 'core-treasury') {
                  setSelectedNodeId(null);
                } else {
                  setSelectedNodeId(prev => prev === coreNode.id ? null : coreNode.id);
                }
              }}
              style={{
                '--accent-color': (activeDossier && selectedNodeId !== 'core-treasury') ? activeDossier.accentColor : '#d4af37',
                background: '#ffffff',
                border: `2px solid ${(activeDossier && selectedNodeId !== 'core-treasury') ? activeDossier.accentColor : '#d4af37'}`,
                borderRadius: '16px',
                padding: embeddedInStudio 
                  ? '1rem 1.15rem' 
                  : (activeDossier && selectedNodeId !== 'core-treasury' ? '1.1rem 1.25rem' : '1.35rem 1.5rem'),
                cursor: 'pointer',
                position: 'relative',
                boxShadow: (isOutflowHidden || isInflowHidden)
                  ? '0 16px 42px -6px rgba(212, 175, 55, 0.25), 0 4px 14px rgba(0, 0, 0, 0.06)'
                  : '0 8px 30px -4px rgba(212, 175, 55, 0.18), 0 2px 6px rgba(0, 0, 0, 0.05)',
                zIndex: 6,
                transform: 'scale(1)',
                transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                maxWidth: (activeDossier && selectedNodeId !== 'core-treasury') 
                  ? (embeddedInStudio ? '410px' : '435px') 
                  : (embeddedInStudio ? '420px' : '445px'),
                width: '100%',
                minWidth: '0px',
                margin: 'auto',
                alignSelf: 'center',
                justifySelf: 'center',
                maxHeight: '475px',
                overflowY: 'auto'
              } as React.CSSProperties}
            >
              {activeDossier && selectedNodeId !== 'core-treasury' ? (
                /* ── CASE A: SELECTED NODE LIVE INSPECTION DOSSIER ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', textAlign: 'start' }}>
                  {/* Dossier Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{
                        width: embeddedInStudio ? '34px' : '40px',
                        height: embeddedInStudio ? '34px' : '40px',
                        borderRadius: '10px',
                        background: `${activeDossier.accentColor}18`,
                        border: `1.5px solid ${activeDossier.accentColor}40`,
                        color: activeDossier.accentColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Activity size={embeddedInStudio ? 18 : 22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{
                            background: `${activeDossier.accentColor}15`,
                            border: `1px solid ${activeDossier.accentColor}40`,
                            color: activeDossier.accentColor,
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 800
                          }}>
                            {isAr ? activeDossier.categoryBadgeAr : activeDossier.categoryBadgeEn}
                          </span>
                          <span style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#475569',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            fontFamily: 'monospace'
                          }}>
                            {activeDossier.glCode}
                          </span>
                        </div>
                        <h3 style={{ margin: '0.2rem 0 0', fontSize: embeddedInStudio ? '1.05rem' : '1.18rem', fontWeight: 800, color: '#0f172a' }}>
                          {isAr ? activeDossier.titleAr : activeDossier.titleEn}
                        </h3>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          {isAr ? activeDossier.subtitleAr : activeDossier.subtitleEn}
                        </div>
                      </div>
                    </div>

                    {/* Quick Return to Overview */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(null);
                      }}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        borderRadius: '8px',
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.15s ease'
                      }}
                      title={isAr ? 'الرجوع لنظرة الخزينة العامة' : 'Return to Treasury Overview'}
                    >
                      <X size={13} />
                      <span>{isAr ? 'رجوع' : 'Back'}</span>
                    </button>
                  </div>

                  {/* Amount Hero Callout */}
                  <div style={{
                    background: '#f8fafc',
                    border: `1.5px solid ${activeDossier.accentColor}35`,
                    borderRadius: '12px',
                    padding: embeddedInStudio ? '0.65rem 0.8rem' : '0.75rem 0.95rem',
                    borderInlineStart: `4px solid ${activeDossier.accentColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700, marginBottom: '0.15rem' }}>
                        {isAr ? 'القيمة الإجمالية المقيدة' : 'Recorded Capital Value'}
                      </div>
                      <div style={{ fontSize: embeddedInStudio ? '1.25rem' : '1.45rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCleanWholeNumber(activeDossier.amount)}
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginInlineStart: '0.3rem' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                      </div>
                    </div>

                    <div style={{
                      background: `${activeDossier.velocityBadgeColor}15`,
                      border: `1px solid ${activeDossier.velocityBadgeColor}35`,
                      color: activeDossier.velocityBadgeColor,
                      borderRadius: '999px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: activeDossier.velocityBadgeColor, display: 'inline-block' }} />
                      <span>{isAr ? activeDossier.velocityLabelAr : activeDossier.velocityLabelEn}</span>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569', lineHeight: 1.55 }}>
                    {isAr ? activeDossier.summaryAr : activeDossier.summaryEn}
                  </p>

                  {/* Metrics 2x2 Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                    {activeDossier.metrics.map((m, idx) => (
                      <div key={idx} style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '0.55rem 0.65rem'
                      }}>
                        <div style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 600 }}>
                          {isAr ? m.labelAr : m.labelEn}
                        </div>
                        <div style={{
                          fontSize: '0.86rem',
                          fontWeight: 800,
                          color: m.color || '#0f172a',
                          fontVariantNumeric: 'tabular-nums',
                          marginTop: '0.15rem'
                        }}>
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Breakdown Bars (if available) */}
                  {activeDossier.breakdowns && activeDossier.breakdowns.length > 0 && (
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.5rem 0.65rem'
                    }}>
                      <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                        {isAr ? 'تفنيد المكونات والنسب المئوية' : 'Component Composition'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {activeDossier.breakdowns.map((b, idx) => (
                          <div key={idx}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', marginBottom: '0.15rem' }}>
                              <span style={{ color: '#475569', fontWeight: 600 }}>{isAr ? b.labelAr : b.labelEn}</span>
                              <span style={{ color: '#0f172a', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{b.amount} ({b.percentage}%)</span>
                            </div>
                            <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${b.percentage}%`,
                                height: '100%',
                                background: b.color || activeDossier.accentColor,
                                borderRadius: '999px'
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}


                  {/* Back to Central Treasury Action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(null);
                    }}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.45rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <RotateCcw size={12} />
                    <span>{isAr ? 'العودة لعرض الخزينة المركزية' : 'Return to Treasury View'}</span>
                  </button>
                </div>
              ) : activeFilter === 'inflows' ? (
                /* ── CASE B1: INFLOWS OPERATIONS HUB ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', textAlign: 'center' }}>
                  <div style={{
                    width: embeddedInStudio ? '40px' : '50px',
                    height: embeddedInStudio ? '40px' : '50px',
                    margin: '0 auto',
                    borderRadius: '12px',
                    background: '#f0fdf4',
                    border: '1.5px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#15803d',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
                  }}>
                    <TrendingUp size={embeddedInStudio ? 22 : 26} />
                  </div>

                  <div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '999px',
                      padding: '0.15rem 0.65rem',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      color: '#15803d',
                      marginBottom: '0.35rem'
                    }}>
                      <Sparkles size={11} />
                      <span>{isAr ? 'ملخص الفلوس اللي دخلت' : 'Inflow Liquidity Engine'}</span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: embeddedInStudio ? '1.08rem' : '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                      {isAr ? 'إجمالي المبالغ المحصلة' : 'Capital Inflows Consolidation'}
                    </h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: '#64748b' }}>
                      {isAr ? 'إجمالي مبيعات محصلة + أقساط عند العملاء + أموال الشركاء' : 'Consolidated sales collections, deferred tranches, and injected capital'}
                    </p>
                  </div>

                  {/* Hero Total Inflows */}
                  <div style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #bbf7d0',
                    borderRadius: '12px',
                    padding: embeddedInStudio ? '0.75rem' : '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ fontSize: '0.68rem', color: '#15803d', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>
                      {isAr ? 'إجمالي المبالغ الداخلة' : 'Total Inflow Capital Volume'}
                    </div>
                    <div style={{ fontSize: embeddedInStudio ? '1.55rem' : '1.85rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCleanWholeNumber(totalInflowVolume.toString())}
                      <span style={{ fontSize: '0.8rem', color: '#64748b', marginInlineStart: '0.35rem' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                  </div>

                  {/* 3 Telemetry Pillars */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.45rem', textAlign: 'center' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.35rem' }}>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>{isAr ? 'فلوس المبيعات' : 'Sales Cash'}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#10b981', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
                        {formatCleanWholeNumber(totalCollectedCash)}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.35rem' }}>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>{isAr ? 'أقساط عند العملاء' : 'Deferred Dues'}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#06b6d4', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
                        {formatCleanWholeNumber(totalSafePDCs)}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.35rem' }}>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>{isAr ? 'أموال الشركاء' : 'Partner Equity'}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#d4af37', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
                        {formatCleanWholeNumber(totalInjectedCapital)}
                      </div>
                    </div>
                  </div>

                  {/* Contract Backlog Notification Banner */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.68rem',
                    color: '#475569'
                  }}>
                    <span style={{ fontWeight: 600 }}>{isAr ? 'أقساط متبقية عند العملاء:' : 'Future Uncollected Backlog:'}</span>
                    <span style={{ fontWeight: 800, color: '#6366f1', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCleanWholeNumber(deferredBacklog)} {isAr ? 'ج.م' : 'EGP'}
                    </span>
                  </div>

                  {/* Interactive Guidance Cue */}
                  <div style={{
                    marginTop: '0.25rem',
                    fontSize: '0.68rem',
                    color: '#15803d',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}>
                    <span>{isAr ? 'اضغط على أي بند لمعرفة تفاصيله الكاملة' : 'Click any inflow node to inspect its GL entries and audit trail right here'}</span>
                    <ChevronRight size={13} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
                  </div>
                </div>
              ) : activeFilter === 'outflows' ? (
                /* ── CASE B2: DISBURSEMENTS & CAPEX ENGINE ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', textAlign: 'center' }}>
                  <div style={{
                    width: embeddedInStudio ? '40px' : '50px',
                    height: embeddedInStudio ? '40px' : '50px',
                    margin: '0 auto',
                    borderRadius: '12px',
                    background: '#fffbeb',
                    border: '1.5px solid #fde68a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#b45309',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)'
                  }}>
                    <TrendingDown size={embeddedInStudio ? 22 : 26} />
                  </div>

                  <div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '999px',
                      padding: '0.15rem 0.65rem',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      color: '#b45309',
                      marginBottom: '0.35rem'
                    }}>
                      <Building2 size={11} />
                      <span>{isAr ? 'ملخص المصاريف والمشاريع' : 'Disbursements & CapEx Engine'}</span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: embeddedInStudio ? '1.08rem' : '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                      {isAr ? 'تفاصيل المصاريف والإنشاءات' : 'Project Allocations & Outflows'}
                    </h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: '#64748b' }}>
                      {isAr ? 'متابعة ما تم صرفه على الأرض والمباني والمرافق والتشطيب' : 'Tracking land acquisitions, civil structures, MEP, finishes, and sovereign levies'}
                    </p>
                  </div>

                  {/* Hero Total Outflows */}
                  <div style={{
                    background: '#fffbeb',
                    border: '1.5px solid #fde68a',
                    borderRadius: '12px',
                    padding: embeddedInStudio ? '0.75rem' : '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ fontSize: '0.68rem', color: '#b45309', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>
                      {isAr ? 'إجمالي المبالغ المصروفة' : 'Total Capital Outflows Incurred'}
                    </div>
                    <div style={{ fontSize: embeddedInStudio ? '1.55rem' : '1.85rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCleanWholeNumber(totalOutflowVolume.toString())}
                      <span style={{ fontSize: '0.8rem', color: '#64748b', marginInlineStart: '0.35rem' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                  </div>

                  {/* 4 WIP Pillars Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', textAlign: 'center' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.45rem 0.35rem' }}>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>{isAr ? 'أرض المشروع' : 'Land (120100)'}</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#b45309', fontVariantNumeric: 'tabular-nums', marginTop: '0.1rem' }}>
                        {formatCleanWholeNumber(wipAccounts.land || 0)}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.45rem 0.35rem' }}>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>{isAr ? 'البناء والخرسانة' : 'Civil (120200)'}</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', fontVariantNumeric: 'tabular-nums', marginTop: '0.1rem' }}>
                        {formatCleanWholeNumber(wipAccounts.civil || 0)}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.45rem 0.35rem' }}>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>{isAr ? 'المرافق والتأسيس' : 'MEP (120300)'}</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums', marginTop: '0.1rem' }}>
                        {formatCleanWholeNumber(wipAccounts.mep || 0)}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.45rem 0.35rem' }}>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>{isAr ? 'تشطيب وضرائب' : 'Finishing & Taxes'}</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ef4444', fontVariantNumeric: 'tabular-nums', marginTop: '0.1rem' }}>
                        {formatCleanWholeNumber(D(wipAccounts.finishing || 0).plus(totalTaxes).toString())}
                      </div>
                    </div>
                  </div>

                  {/* WIP Coverage KPI Banner */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.68rem',
                    color: '#475569'
                  }}>
                    <span style={{ fontWeight: 600 }}>{isAr ? 'نسبة تغطية الرصيد للمصاريف المطلوبة:' : 'Liquid Reserve to WIP Coverage:'}</span>
                    <span style={{ fontWeight: 800, color: '#b45309', fontVariantNumeric: 'tabular-nums' }}>
                      {wipCoverage}
                    </span>
                  </div>

                  {/* Interactive Guidance Cue */}
                  <div style={{
                    marginTop: '0.25rem',
                    fontSize: '0.68rem',
                    color: '#b45309',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}>
                    <span>{isAr ? 'اضغط على أي بند لمعرفة تفاصيله الكاملة' : 'Click any outflow node to inspect certified claims and GL entries right here'}</span>
                    <ChevronRight size={13} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
                  </div>
                </div>
              ) : activeFilter === 'net' ? (
                /* ── CASE B3: NET LIQUIDITY & SOLVENCY COCKPIT ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', textAlign: 'center' }}>
                  <div style={{
                    width: embeddedInStudio ? '40px' : '50px',
                    height: embeddedInStudio ? '40px' : '50px',
                    margin: '0 auto',
                    borderRadius: '12px',
                    background: '#eef2ff',
                    border: '1.5px solid #c7d2fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4f46e5',
                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.2)'
                  }}>
                    <Activity size={embeddedInStudio ? 22 : 26} />
                  </div>

                  <div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#eef2ff',
                      border: '1px solid #c7d2fe',
                      borderRadius: '999px',
                      padding: '0.15rem 0.65rem',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      color: '#4f46e5',
                      marginBottom: '0.35rem'
                    }}>
                      <Percent size={11} />
                      <span>{isAr ? 'صافي الفلوس بعد خصم المصاريف' : 'Net Operating Spread Engine'}</span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: embeddedInStudio ? '1.08rem' : '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                      {isAr ? 'الفائض النقدي المتاح' : 'Net Liquidity & Solvency Position'}
                    </h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: '#64748b' }}>
                      {isAr ? 'الفرق بين المبالغ اللي دخلت وبين المبالغ اللي اتصرفت' : 'Net operational delta balancing capital inflows against total incurred outflows'}
                    </p>
                  </div>

                  {/* Hero Net Operational Delta */}
                  <div style={{
                    background: netOperationalDelta.isNegative() ? '#fef2f2' : '#f0fdf4',
                    border: `1.5px solid ${netOperationalDelta.isNegative() ? '#fecaca' : '#bbf7d0'}`,
                    borderRadius: '12px',
                    padding: embeddedInStudio ? '0.75rem' : '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ fontSize: '0.68rem', color: netOperationalDelta.isNegative() ? '#dc2626' : '#15803d', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>
                      {isAr ? 'صافي الفائض النقدي' : 'Cumulative Net Capital Spread'}
                    </div>
                    <div style={{ fontSize: embeddedInStudio ? '1.55rem' : '1.85rem', fontWeight: 900, color: netOperationalDelta.isNegative() ? '#dc2626' : '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                      {netOperationalDelta.isNegative() ? '-' : '+'}{formatCleanWholeNumber(netOperationalDelta.abs().toString())}
                      <span style={{ fontSize: '0.8rem', color: '#64748b', marginInlineStart: '0.35rem' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                  </div>

                  {/* Twin Comparison: Inflows vs Outflows */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', textAlign: 'center' }}>
                    <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '10px', padding: '0.55rem 0.5rem' }}>
                      <div style={{ fontSize: '0.64rem', color: '#15803d', fontWeight: 700 }}>{isAr ? 'إجمالي المبالغ الداخلة' : 'Total Inflows'}</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#15803d', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
                        +{formatCleanWholeNumber(totalInflowVolume.toString())}
                      </div>
                    </div>
                    <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '10px', padding: '0.55rem 0.5rem' }}>
                      <div style={{ fontSize: '0.64rem', color: '#b45309', fontWeight: 700 }}>{isAr ? 'إجمالي المبالغ المصروفة' : 'Total Outflows'}</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#b45309', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
                        -{formatCleanWholeNumber(totalOutflowVolume.toString())}
                      </div>
                    </div>
                  </div>

                  {/* Free Cash Balance Bar */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.68rem',
                    color: '#475569'
                  }}>
                    <span style={{ fontWeight: 600 }}>{isAr ? 'الرصيد الحالي المتاح (خزنة وبنوك):' : 'Free Liquid Cash in Treasury:'}</span>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCleanWholeNumber(kpis.cashBank)} {isAr ? 'ج.م' : 'EGP'}
                    </span>
                  </div>

                  {/* Interactive Guidance Cue */}
                  <div style={{
                    marginTop: '0.25rem',
                    fontSize: '0.68rem',
                    color: '#4f46e5',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}>
                    <span>{isAr ? 'اضغط على أي بند لمعرفة تفاصيله الكاملة' : 'Click any node to inspect comprehensive GL accounting entries'}</span>
                    <ChevronRight size={13} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
                  </div>
                </div>
              ) : (
                /* ── CASE B4: DEFAULT CENTRAL TREASURY CORE ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', textAlign: 'center' }}>
                  {/* Core HUD Emblem */}
                  <div style={{
                    width: embeddedInStudio ? '40px' : '50px',
                    height: embeddedInStudio ? '40px' : '50px',
                    margin: '0 auto',
                    borderRadius: '12px',
                    background: '#fefce8',
                    border: '1.5px solid #fef08a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#946f23',
                    boxShadow: '0 2px 8px rgba(212, 175, 55, 0.2)'
                  }}>
                    <ShieldCheck size={embeddedInStudio ? 22 : 26} />
                  </div>

                  <div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#fefce8',
                      border: '1px solid #fef08a',
                      borderRadius: '999px',
                      padding: '0.15rem 0.65rem',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      color: '#946f23',
                      marginBottom: '0.35rem'
                    }}>
                      <Sparkles size={11} />
                      <span>{isAr ? coreNode.tagAr : coreNode.tagEn}</span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: embeddedInStudio ? '1.08rem' : '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                      {isAr ? coreNode.titleAr : coreNode.titleEn}
                    </h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: '#64748b' }}>
                      {isAr ? coreNode.subtitleAr : coreNode.subtitleEn}
                    </p>
                  </div>

                  {/* Large Hero Metric */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: embeddedInStudio ? '0.75rem' : '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>
                      {isAr ? 'الرصيد الفعلي المتاح بالخزنة والبنوك' : 'Total Unrestricted Liquid Capital'}
                    </div>
                    <div style={{ fontSize: embeddedInStudio ? '1.55rem' : '1.85rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCleanWholeNumber(coreNode.amount)}
                      <span style={{ fontSize: '0.8rem', color: '#64748b', marginInlineStart: '0.35rem' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                  </div>

                  {/* Financial Telemetry Sub-row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: embeddedInStudio ? '0.5rem' : '0.75rem', textAlign: 'center' }}>
                    <div style={{
                      background: '#f0fdf4',
                      border: '1.5px solid #bbf7d0',
                      borderRadius: '10px',
                      padding: embeddedInStudio ? '0.45rem 0.4rem' : '0.65rem 0.5rem'
                    }}>
                      <div style={{ fontSize: embeddedInStudio ? '0.62rem' : '0.66rem', color: '#15803d', fontWeight: 700 }}>
                        {isAr ? 'إجمالي اللي دخل' : 'Total Inflows'}
                      </div>
                      <div style={{ fontSize: embeddedInStudio ? '0.85rem' : '0.92rem', fontWeight: 800, color: '#15803d', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
                        {formatCleanWholeNumber(totalInflowVolume.toString())}
                      </div>
                    </div>

                    <div style={{
                      background: '#fffbeb',
                      border: '1.5px solid #fde68a',
                      borderRadius: '10px',
                      padding: embeddedInStudio ? '0.45rem 0.4rem' : '0.65rem 0.5rem'
                    }}>
                      <div style={{ fontSize: embeddedInStudio ? '0.62rem' : '0.66rem', color: '#b45309', fontWeight: 700 }}>
                        {isAr ? 'إجمالي اللي اتصرف' : 'Total Outflows'}
                      </div>
                      <div style={{ fontSize: embeddedInStudio ? '0.85rem' : '0.92rem', fontWeight: 800, color: '#b45309', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
                        {formatCleanWholeNumber(totalOutflowVolume.toString())}
                      </div>
                    </div>
                  </div>

                  {/* WIP Coverage Progress Strip */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.68rem',
                    color: '#475569'
                  }}>
                    <span style={{ fontWeight: 600 }}>{isAr ? 'نسبة تغطية الرصيد لتكاليف المشروع:' : 'WIP Cost Coverage:'}</span>
                    <span style={{ fontWeight: 800, color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
                      {wipCoverage}
                    </span>
                  </div>

                  {/* Interactive Guidance Cue */}
                  <div style={{ 
                    marginTop: '0.25rem', 
                    fontSize: '0.68rem', 
                    color: '#946f23', 
                    fontWeight: 700, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.35rem' 
                  }}>
                    <span>{isAr ? 'اضغط على أي بند في الشاشة لعرض تفاصيله وأرقامه هنا مباشرة' : 'Click any node to inspect its comprehensive financial dossier right here'}</span>
                    <ChevronRight size={13} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
                  </div>
                </div>
              )}
            </div>

            {/* ── COLUMN 3: OUTFLOW ALLOCATIONS (Left in RTL, Right in LTR) ─ */}
            <div style={{
              display: isOutflowHidden ? 'none' : 'flex',
              flexDirection: 'column',
              gap: embeddedInStudio ? '0.65rem' : '0.85rem',
              background: isOutflowHidden ? 'transparent' : 'rgba(255, 255, 255, 0.75)',
              border: isOutflowHidden ? 'none' : '1.5px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '16px',
              padding: isOutflowHidden ? 0 : (embeddedInStudio ? '0.65rem 0.75rem' : '0.9rem 0.95rem'),
              boxShadow: isOutflowHidden ? 'none' : (isInflowHidden ? '0 8px 30px -4px rgba(245, 158, 11, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)' : '0 2px 8px rgba(245, 158, 11, 0.04)'),
              zIndex: 5,
              opacity: isOutflowHidden ? 0 : 1,
              maxWidth: isOutflowHidden ? '0px' : (embeddedInStudio ? '330px' : '360px'),
              width: '100%',
              minWidth: '0px',
              maxHeight: isOutflowHidden ? '0px' : 'none',
              height: isOutflowHidden ? '0px' : 'auto',
              overflow: isOutflowHidden ? 'hidden' : 'visible',
              pointerEvents: isOutflowHidden ? 'none' : 'auto',
              transform: isOutflowHidden 
                ? (isAr ? 'translateX(-50px) scale(0.92)' : 'translateX(50px) scale(0.92)') 
                : 'scale(1)',
              transformOrigin: isAr ? 'left center' : 'right center',
              transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              alignSelf: 'center'
            }}>
              {/* Column Header Banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.65rem',
                borderBottom: '1.5px solid rgba(245, 158, 11, 0.2)'
              }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ArrowUpRight size={16} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />
                  {isAr ? 'الفلوس اللي اتصرفت (المصاريف والمشاريع)' : 'Project Disbursements'}
                </span>
                <span style={{ 
                  fontSize: '0.76rem', 
                  color: '#0f172a', 
                  fontVariantNumeric: 'tabular-nums', 
                  fontWeight: 800,
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px'
                }}>
                  {formatCleanWholeNumber(totalOutflowVolume.toString())} {isAr ? 'ج.م' : 'EGP'}
                </span>
              </div>

              {outflowNodes.map(node => {
                const Icon = node.icon;
                const isSelected = selectedNodeId === node.id;
                return (
                  <div
                    key={node.id}
                    data-flow-node={node.id}
                    className={`flow-card-interactive ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedNodeId(prev => prev === node.id ? null : node.id)}
                    style={{
                      '--accent-color': node.accentColor,
                      background: '#ffffff',
                      border: `1.5px solid ${isSelected ? node.accentColor : '#cbd5e1'}`,
                      borderInlineStart: `4px solid ${node.accentColor}`,
                      borderRadius: '12px',
                      padding: embeddedInStudio ? '0.55rem 0.75rem' : '0.8rem 0.9rem',
                      cursor: 'pointer',
                      position: 'relative'
                    } as React.CSSProperties}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                          width: embeddedInStudio ? '28px' : '34px',
                          height: embeddedInStudio ? '28px' : '34px',
                          borderRadius: '8px',
                          background: `${node.accentColor}15`,
                          border: `1px solid ${node.accentColor}35`,
                          color: node.accentColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Icon size={embeddedInStudio ? 15 : 17} />
                        </div>
                        <div>
                          <div style={{ fontSize: embeddedInStudio ? '0.8rem' : '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                            {isAr ? node.titleAr : node.titleEn}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                            {isAr ? node.subtitleAr : node.subtitleEn}
                          </div>
                        </div>
                      </div>

                      {node.percentage !== undefined && (
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          color: node.accentColor
                        }}>
                          {node.percentage}%
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: embeddedInStudio ? '0.45rem' : '0.65rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: embeddedInStudio ? '0.96rem' : '1.05rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCleanWholeNumber(node.amount)}
                        <span style={{ fontSize: '0.65rem', color: '#64748b', marginInlineStart: '0.3rem' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                      </span>
                      <span style={{ 
                        fontSize: '0.66rem', 
                        color: node.accentColor, 
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}>
                        <span>{isAr ? node.tagAr : node.tagEn}</span>
                        <ChevronRight size={12} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── STREAMLINED STATUS & LEGEND TRAY ─────────────────────────── */}
      {activeDossier && selectedNodeId !== 'core-treasury' ? (
          /* Active Node Live Inspection Status Strip */
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderInlineStart: `4px solid ${activeDossier.accentColor}`,
            borderRadius: '12px',
            padding: embeddedInStudio ? '0.45rem 0.85rem' : '0.65rem 1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.74rem',
            color: '#475569',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: activeDossier.accentColor,
                display: 'inline-block',
                boxShadow: `0 0 0 2px ${activeDossier.accentColor}30`
              }} />
              <span style={{ fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'فحص محاسبي مباشر معروض في الخزينة المركزية:' : 'Live inspection active in Central Hub:'}
              </span>
              <span style={{ fontWeight: 800, color: activeDossier.accentColor }}>
                {isAr ? activeDossier.titleAr : activeDossier.titleEn}
              </span>
              <span style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.66rem',
                color: '#475569'
              }}>
                {activeDossier.glCode}
              </span>
              <span style={{ color: '#94a3b8' }}>•</span>
              <span style={{ color: '#64748b' }}>
                {isAr ? 'القيمة المالية:' : 'Value:'} <strong style={{ color: '#0f172a' }}>{formatCleanWholeNumber(activeDossier.amount)} {isAr ? 'ج.م' : 'EGP'}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedNodeId(null)}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                borderRadius: '6px',
                padding: '0.25rem 0.65rem',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                transition: 'all 0.15s ease'
              }}
            >
              <X size={12} />
              <span>{isAr ? 'إنهاء الفحص (إلغاء التحديد)' : 'Deselect Node'}</span>
            </button>
          </div>
        ) : (
          /* Default Topology Legend & Interactive Hint */
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '12px',
            padding: embeddedInStudio ? '0.45rem 0.85rem' : '0.65rem 1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.73rem',
            color: '#475569',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={15} style={{ color: '#946f23', flexShrink: 0 }} />
              <span>
                {isAr 
                  ? 'انقر على أي رافد تدفق أو بند صرف لفحص قيوده المحاسبية ونسبه مباشرة داخل الخزينة المركزية.'
                  : 'Click any inflow or outflow node to inspect its GL entries and ratios directly inside the Central Treasury.'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <span style={{ fontSize: '0.7rem', color: '#334155', fontWeight: 600 }}>{isAr ? 'تدفقات داخلة' : 'Inflows'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d4af37', display: 'inline-block' }} />
                <span style={{ fontSize: '0.7rem', color: '#334155', fontWeight: 600 }}>{isAr ? 'الخزينة والبنوك' : 'Treasury Core'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                <span style={{ fontSize: '0.7rem', color: '#334155', fontWeight: 600 }}>{isAr ? 'توجيهات الصرف' : 'Outflows'}</span>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
};
