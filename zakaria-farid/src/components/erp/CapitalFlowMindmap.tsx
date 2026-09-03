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
  Maximize2, 
  Minimize2, 
  Filter, 
  FileText, 
  Info,
  ChevronRight,
  Layers,
  Sparkles,
  PieChart as PieIcon
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import { ERPCostAllocation, ERPPartnerCall, ERPTaxRecord } from '@/lib/erp/types';

interface CapitalFlowMindmapProps {
  isAr: boolean;
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

export const CapitalFlowMindmap: React.FC<CapitalFlowMindmapProps> = ({
  isAr,
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'inflows' | 'outflows' | 'net'>('all');
  const [connections, setConnections] = useState<Array<{
    fromId: string;
    toId: string;
    path: string;
    color: string;
    isInbound: boolean;
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
      .plus(totalInjectedCapital)
      .plus(totalSafePDCs);
  }, [totalCollectedCash, totalInjectedCapital, totalSafePDCs]);

  const totalOutflowVolume = useMemo(() => {
    return D(totalWipIncurred).plus(totalTaxes);
  }, [totalWipIncurred, totalTaxes]);

  const netOperatingLiquidity = useMemo(() => {
    return D(kpis.cashBank);
  }, [kpis.cashBank]);

  const formatCleanWholeNumber = (val: string | number) => {
    const n = D(val).toFixed(0);
    return n.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Node definitions
  const inflowNodes: FlowNode[] = useMemo(() => [
    {
      id: 'inflow-sales',
      titleAr: 'متحصلات عقود البيع',
      titleEn: 'Sales Collections',
      subtitleAr: 'مقدمات وأقساط محصلة فعلياً',
      subtitleEn: 'Down payments & cleared tranches',
      amount: totalCollectedCash,
      category: 'inflow',
      icon: DollarSign,
      accentColor: '#10b981',
      gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.04) 100%)',
      percentage: totalInflowVolume.isZero() ? 0 : Math.round(D(totalCollectedCash).div(totalInflowVolume).times(100).toNumber()),
      tagAr: 'سيولة نقدية مباشرة',
      tagEn: 'Direct Cash Inflow'
    },
    {
      id: 'inflow-pdc',
      titleAr: 'شيكات الخزينة (PDC)',
      titleEn: 'PDC Cheques in Safe',
      subtitleAr: 'أوراق قبض مستحقة الصرف',
      subtitleEn: 'Undeposited client cheques',
      amount: totalSafePDCs,
      category: 'inflow',
      icon: Landmark,
      accentColor: '#4fd1c5',
      gradient: 'linear-gradient(135deg, rgba(79, 209, 197, 0.18) 0%, rgba(79, 209, 197, 0.04) 100%)',
      percentage: totalInflowVolume.isZero() ? 0 : Math.round(D(totalSafePDCs).div(totalInflowVolume).times(100).toNumber()),
      tagAr: 'أوراق قبض بالحيازة',
      tagEn: 'Receivables in Safe'
    },
    {
      id: 'inflow-equity',
      titleAr: 'مساهمات رؤوس أموال الشركاء',
      titleEn: 'Partner Injected Equity',
      subtitleAr: 'تمويل مباشر للمشروعات والتطوير',
      subtitleEn: 'Capital calls & equity injected',
      amount: totalInjectedCapital,
      category: 'inflow',
      icon: Users,
      accentColor: '#d4af37',
      gradient: 'linear-gradient(135deg, rgba(212, 175, 55, 0.18) 0%, rgba(212, 175, 55, 0.04) 100%)',
      percentage: totalInflowVolume.isZero() ? 0 : Math.round(D(totalInjectedCapital).div(totalInflowVolume).times(100).toNumber()),
      tagAr: 'رأس مال مساهم',
      tagEn: 'Contributed Equity'
    },
    {
      id: 'inflow-backlog',
      titleAr: 'أقساط مستقبلية قيد التحصيل',
      titleEn: 'Receivables Backlog',
      subtitleAr: 'أقساط تعاقدية مؤجلة الاستحقاق',
      subtitleEn: 'Unbilled contract receivables',
      amount: deferredBacklog,
      category: 'inflow',
      icon: Clock,
      accentColor: '#818cf8',
      gradient: 'linear-gradient(135deg, rgba(129, 140, 248, 0.18) 0%, rgba(129, 140, 248, 0.04) 100%)',
      percentage: undefined,
      tagAr: 'مستحقات تعاقدية مؤجلة',
      tagEn: 'Deferred Contract Value'
    }
  ], [totalCollectedCash, totalSafePDCs, totalInjectedCapital, deferredBacklog, totalInflowVolume]);

  const coreNode: FlowNode = useMemo(() => ({
    id: 'core-treasury',
    titleAr: 'الخزينة المركزية وحسابات البنوك',
    titleEn: 'Central Treasury & Liquidity Pool',
    subtitleAr: 'المحفظة المركزية للسيولة والتدفقات النقدية الحرة',
    subtitleEn: 'Consolidated real cash & liquid bank reserves',
    amount: kpis.cashBank,
    category: 'core',
    icon: ShieldCheck,
    accentColor: '#e2c974',
    gradient: 'linear-gradient(145deg, rgba(226, 201, 116, 0.22) 0%, rgba(13, 17, 26, 0.95) 100%)',
    tagAr: 'قلب المنظومة المالية FIN-OS',
    tagEn: 'FIN-OS Liquidity Engine'
  }), [kpis.cashBank]);

  const outflowNodes: FlowNode[] = useMemo(() => [
    {
      id: 'outflow-land',
      titleAr: 'أراضي ومواقع المشروعات (120100)',
      titleEn: 'Land Acquisition (120100)',
      subtitleAr: 'تكاليف الأراضي الاستراتيجية',
      subtitleEn: 'Strategic site purchases',
      amount: wipAccounts.land || '0.00',
      category: 'outflow',
      icon: Building2,
      accentColor: '#d4af37',
      gradient: 'linear-gradient(135deg, rgba(212, 175, 55, 0.18) 0%, rgba(212, 175, 55, 0.04) 100%)',
      percentage: totalOutflowVolume.isZero() ? 0 : Math.round(D(wipAccounts.land || 0).div(totalOutflowVolume).times(100).toNumber()),
      tagAr: 'أصول رأسمالية WIP',
      tagEn: 'Capitalized WIP Land'
    },
    {
      id: 'outflow-civil',
      titleAr: 'الإنشاءات والخرسانة المسلحة (120200)',
      titleEn: 'Structural & Concrete (120200)',
      subtitleAr: 'الهيكل الخرساني وأعمال المقاولات',
      subtitleEn: 'Core structure & civil contracting',
      amount: wipAccounts.civil || '0.00',
      category: 'outflow',
      icon: Layers,
      accentColor: '#94a3b8',
      gradient: 'linear-gradient(135deg, rgba(148, 163, 184, 0.18) 0%, rgba(148, 163, 184, 0.04) 100%)',
      percentage: totalOutflowVolume.isZero() ? 0 : Math.round(D(wipAccounts.civil || 0).div(totalOutflowVolume).times(100).toNumber()),
      tagAr: 'تكلفة مقاولات مباشرة',
      tagEn: 'Direct Construction'
    },
    {
      id: 'outflow-mep',
      titleAr: 'الكهروميكانيك والمرافق (120300)',
      titleEn: 'MEP Infrastructure (120300)',
      subtitleAr: 'شبكات الكهرباء والمياه والتكييف',
      subtitleEn: 'Electro-mechanical & utilities',
      amount: wipAccounts.mep || '0.00',
      category: 'outflow',
      icon: Sparkles,
      accentColor: '#10b981',
      gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.04) 100%)',
      percentage: totalOutflowVolume.isZero() ? 0 : Math.round(D(wipAccounts.mep || 0).div(totalOutflowVolume).times(100).toNumber()),
      tagAr: 'بنية تحتية هندسية',
      tagEn: 'Engineering Infrastructure'
    },
    {
      id: 'outflow-finishing',
      titleAr: 'التشطيبات المعمارية (120400)',
      titleEn: 'Architectural Finishing (120400)',
      subtitleAr: 'واجهات حجرية وتشطيبات داخلية فاخرة',
      subtitleEn: 'Stone facades & luxury finishes',
      amount: wipAccounts.finishing || '0.00',
      category: 'outflow',
      icon: PieIcon,
      accentColor: '#f59e0b',
      gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(245, 158, 11, 0.04) 100%)',
      percentage: totalOutflowVolume.isZero() ? 0 : Math.round(D(wipAccounts.finishing || 0).div(totalOutflowVolume).times(100).toNumber()),
      tagAr: 'تشطيبات نهائية',
      tagEn: 'Architectural Delivery'
    },
    {
      id: 'outflow-taxes',
      titleAr: 'الضرائب والرسوم السيادية',
      titleEn: 'Sovereign Taxes & Levies',
      subtitleAr: 'ضريبة تصرفات عقارية وقيمة مضافة',
      subtitleEn: '2.5% disposal tax & VAT provisions',
      amount: totalTaxes,
      category: 'outflow',
      icon: FileText,
      accentColor: '#f87171',
      gradient: 'linear-gradient(135deg, rgba(248, 113, 113, 0.18) 0%, rgba(248, 113, 113, 0.04) 100%)',
      percentage: totalOutflowVolume.isZero() ? 0 : Math.round(D(totalTaxes).div(totalOutflowVolume).times(100).toNumber()),
      tagAr: 'التزام ضريبي مسدد ومستحق',
      tagEn: 'Statutory Obligation'
    }
  ], [wipAccounts, totalTaxes, totalOutflowVolume]);

  // Recalculate SVG connector bezier paths dynamically based on active DOM coordinates
  const updateConnections = useCallback(() => {
    const gridEl = gridRef.current || containerRef.current;
    if (!gridEl) return;
    const gridRect = gridEl.getBoundingClientRect();

    const coreEl = gridEl.querySelector(`[data-flow-node="core-treasury"]`);
    if (!coreEl) return;
    const coreRect = coreEl.getBoundingClientRect();

    const newConns: Array<{
      fromId: string;
      toId: string;
      path: string;
      color: string;
      isInbound: boolean;
    }> = [];

    // Core anchor points relative to the grid container
    // In RTL: Inflows on Right, Core in Middle, Outflows on Left.
    const coreInboundX = isAr 
      ? (coreRect.right - gridRect.left)
      : (coreRect.left - gridRect.left);
    const coreInboundY = (coreRect.top + coreRect.height / 2) - gridRect.top;

    const coreOutboundX = isAr 
      ? (coreRect.left - gridRect.left)
      : (coreRect.right - gridRect.left);
    const coreOutboundY = (coreRect.top + coreRect.height / 2) - gridRect.top;

    // Helper: Build symmetric smooth cubic Bézier curve
    const buildCubicPath = (startX: number, startY: number, endX: number, endY: number) => {
      const deltaX = Math.abs(endX - startX) * 0.45;
      const cp1x = startX > endX ? (startX - deltaX) : (startX + deltaX);
      const cp2x = startX > endX ? (endX + deltaX) : (endX - deltaX);
      return `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`;
    };

    // 1. Compute Inbound Flows -> Core
    if (activeFilter === 'all' || activeFilter === 'inflows' || activeFilter === 'net') {
      inflowNodes.forEach(node => {
        const el = gridEl.querySelector(`[data-flow-node="${node.id}"]`);
        if (!el) return;
        const r = el.getBoundingClientRect();

        // Source Anchor: Left edge in RTL (facing center), Right edge in LTR
        const startX = isAr ? (r.left - gridRect.left) : (r.right - gridRect.left);
        const startY = (r.top + r.height / 2) - gridRect.top;
        // Stop 3px outside core to let arrowhead render crisply
        const endX = isAr ? (coreInboundX + 3) : (coreInboundX - 3);
        const endY = coreInboundY;

        newConns.push({
          fromId: node.id,
          toId: 'core-treasury',
          path: buildCubicPath(startX, startY, endX, endY),
          color: node.accentColor,
          isInbound: true
        });
      });
    }

    // 2. Compute Core -> Outbound Flows
    if (activeFilter === 'all' || activeFilter === 'outflows' || activeFilter === 'net') {
      outflowNodes.forEach(node => {
        const el = gridEl.querySelector(`[data-flow-node="${node.id}"]`);
        if (!el) return;
        const r = el.getBoundingClientRect();

        // Target Anchor: Right edge in RTL (facing center), Left edge in LTR
        const startX = coreOutboundX;
        const startY = coreOutboundY;
        const endX = isAr ? (r.right - gridRect.left + 3) : (r.left - gridRect.left - 3);
        const endY = (r.top + r.height / 2) - gridRect.top;

        newConns.push({
          fromId: 'core-treasury',
          toId: node.id,
          path: buildCubicPath(startX, startY, endX, endY),
          color: node.accentColor,
          isInbound: false
        });
      });
    }

    setConnections(newConns);
  }, [inflowNodes, outflowNodes, isAr, activeFilter]);

  // Window resize & layout shift listener
  useEffect(() => {
    updateConnections();
    const handleResize = () => updateConnections();
    window.addEventListener('resize', handleResize);
    
    // Multiple staggered timeouts to ensure accurate bounding rect after layout settles
    const t1 = setTimeout(updateConnections, 50);
    const t2 = setTimeout(updateConnections, 150);
    const t3 = setTimeout(updateConnections, 400);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && gridRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateConnections();
      });
      resizeObserver.observe(gridRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [updateConnections, isFullscreen]);

  return (
    <div 
      ref={containerRef}
      style={{
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        width: isFullscreen ? '100vw' : '100%',
        height: isFullscreen ? '100vh' : 'auto',
        minHeight: isFullscreen ? '100vh' : '720px',
        zIndex: isFullscreen ? 9999 : 1,
        background: 'linear-gradient(145deg, #090b11 0%, #06080d 50%, #0c0f17 100%)',
        border: isFullscreen ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: isFullscreen ? 0 : '20px',
        padding: isFullscreen ? '2.5rem 3.5rem' : '1.75rem',
        boxSizing: 'border-box',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
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
        @keyframes coreGlowPulse {
          0%, 100% {
            box-shadow: 0 0 25px rgba(212, 175, 55, 0.25), inset 0 0 20px rgba(212, 175, 55, 0.1);
          }
          50% {
            box-shadow: 0 0 45px rgba(212, 175, 55, 0.5), inset 0 0 35px rgba(212, 175, 55, 0.2);
          }
        }
        .flow-card-interactive {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .flow-card-interactive:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
        }
      `}</style>

      {/* Mindmap Toolbar & Navigation Filter Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '1.25rem',
        zIndex: 10
      }}>
        {/* Title & Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '8px',
              padding: '0.35rem 0.55rem',
              color: '#d4af37',
              display: 'flex',
              alignItems: 'center'
            }}>
              <TrendingUp size={16} />
            </span>
            <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
              {isAr ? 'خريطة التدفقات المالية وتوزيعات رأس المال' : 'Capital Flow Mindmap & Treasury Topology'}
            </h4>
            <span style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10b981',
              borderRadius: '999px',
              padding: '0.15rem 0.6rem',
              fontSize: '0.68rem',
              fontWeight: 700
            }}>
              {isAr ? 'مسارات موجهة نشطة' : 'Live Directed Conduits'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8' }}>
            {isAr 
              ? 'مخطط شجري تفاعلي يربط مصادر الأموال الداخلة بالخزينة المركزية وتوجيهات الصرف على مشروعات التطوير والضرائب' 
              : 'Interactive directed topology connecting capital sources into central treasury and project allocations'}
          </p>
        </div>

        {/* Action Controls: Filters + Fullscreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Filter Pills */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '0.2rem',
            gap: '0.2rem'
          }}>
            {[
              { id: 'all', labelAr: 'جميع المسارات', labelEn: 'All Flows' },
              { id: 'inflows', labelAr: 'التدفقات الداخلة', labelEn: 'Inflows' },
              { id: 'outflows', labelAr: 'المصروفات والتوجيهات', labelEn: 'Outflows' },
              { id: 'net', labelAr: 'صافي السيولة', labelEn: 'Net Liquidity' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as any)}
                style={{
                  background: activeFilter === f.id ? 'rgba(212, 175, 55, 0.18)' : 'transparent',
                  border: activeFilter === f.id ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid transparent',
                  color: activeFilter === f.id ? '#e2c974' : '#94a3b8',
                  borderRadius: '7px',
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {isAr ? f.labelAr : f.labelEn}
              </button>
            ))}
          </div>

          {/* Fullscreen Canvas Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(prev => !prev)}
            title={isFullscreen ? (isAr ? 'إنهاء وضع ملء الشاشة' : 'Exit Fullscreen') : (isAr ? 'عرض خريطة التدفقات بملء الشاشة' : 'Expand Fullscreen')}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              borderRadius: '10px',
              padding: '0.5rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? (isAr ? 'تصغير' : 'Exit') : (isAr ? 'شاشة كاملة' : 'Fullscreen')}</span>
          </button>
        </div>
      </div>

      {/* Main Mindmap Canvas Area with Dynamic SVG Connectors */}
      <div 
        ref={gridRef}
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.2fr) minmax(280px, 1fr)',
          gap: '2.5rem',
          alignItems: 'center',
          padding: '1.5rem 0',
          minHeight: '580px',
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
            zIndex: 1,
            overflow: 'visible'
          }}
        >
          <defs>
            {/* Emerald Arrow Marker (Inbound) */}
            <marker
              id="arrow-emerald"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
            </marker>

            {/* Gold Arrow Marker (Inbound / Partner) */}
            <marker
              id="arrow-gold"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#d4af37" />
            </marker>

            {/* Amber Arrow Marker (Outbound WIP) */}
            <marker
              id="arrow-amber"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
            </marker>

            {/* Red Arrow Marker (Taxes) */}
            <marker
              id="arrow-red"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f87171" />
            </marker>

            {/* Indigo Arrow Marker */}
            <marker
              id="arrow-indigo"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#818cf8" />
            </marker>
          </defs>

          {connections.map((conn, idx) => {
            const isHighlighted = selectedNodeId 
              ? (conn.fromId === selectedNodeId || conn.toId === selectedNodeId)
              : true;
            
            let markerId = 'arrow-emerald';
            if (conn.color === '#d4af37' || conn.color === '#e2c974') markerId = 'arrow-gold';
            else if (conn.color === '#f59e0b') markerId = 'arrow-amber';
            else if (conn.color === '#f87171') markerId = 'arrow-red';
            else if (conn.color === '#818cf8') markerId = 'arrow-indigo';

            return (
              <g key={`${conn.fromId}-${conn.toId}-${idx}`}>
                {/* Background Shadow Conduit */}
                <path
                  d={conn.path}
                  fill="none"
                  stroke={conn.color}
                  strokeWidth={isHighlighted ? 3 : 1}
                  strokeOpacity={isHighlighted ? 0.45 : 0.1}
                  strokeLinecap="round"
                />

                {/* Animated Flow Conduit with Directed Dash */}
                <path
                  d={conn.path}
                  fill="none"
                  stroke={conn.color}
                  strokeWidth={isHighlighted ? 2.2 : 1}
                  strokeOpacity={isHighlighted ? 0.9 : 0.15}
                  strokeDasharray="6 6"
                  style={{
                    animation: conn.isInbound 
                      ? 'flowDashInbound 1.8s linear infinite' 
                      : 'flowDashOutbound 1.8s linear infinite'
                  }}
                  markerEnd={`url(#${markerId})`}
                />

                {/* Luminous Flow Particle Traveling Along Conduit */}
                {isHighlighted && (
                  <circle r="3" fill="#ffffff">
                    <animateMotion
                      dur={conn.isInbound ? '2.4s' : '2.8s'}
                      repeatCount="indefinite"
                      path={conn.path}
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* ── COLUMN 1: INFLOW SOURCES (Right in RTL, Left in LTR) ────────── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          zIndex: 5
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '0.4rem',
            borderBottom: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ArrowDownRight size={14} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />
              {isAr ? 'مصادر التدفقات الداخلة (Inflows)' : 'Capital Inflow Sources'}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', fontWeight: 700 }}>
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
                className="flow-card-interactive"
                onClick={() => setSelectedNodeId(prev => prev === node.id ? null : node.id)}
                style={{
                  background: 'rgba(13, 17, 26, 0.88)',
                  border: `1px solid ${isSelected ? node.accentColor : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '14px',
                  padding: '0.95rem 1.1rem',
                  cursor: 'pointer',
                  position: 'relative',
                  backdropFilter: 'blur(12px)',
                  boxShadow: isSelected ? `0 0 20px ${node.accentColor}33` : '0 4px 14px rgba(0,0,0,0.4)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: `${node.accentColor}18`,
                      border: `1px solid ${node.accentColor}35`,
                      color: node.accentColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff' }}>
                        {isAr ? node.titleAr : node.titleEn}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        {isAr ? node.subtitleAr : node.subtitleEn}
                      </div>
                    </div>
                  </div>

                  {node.percentage !== undefined && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      color: node.accentColor
                    }}>
                      {node.percentage}%
                    </span>
                  )}
                </div>

                <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                    {formatCleanWholeNumber(node.amount)}
                    <span style={{ fontSize: '0.68rem', color: '#64748b', marginInlineStart: '0.3rem' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                  </span>
                  <span style={{ fontSize: '0.64rem', color: node.accentColor, fontWeight: 700 }}>
                    {isAr ? node.tagAr : node.tagEn}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── COLUMN 2: CENTRAL TREASURY CORE (Center) ───────────────────── */}
        <div 
          data-flow-node={coreNode.id}
          className="flow-card-interactive"
          onClick={() => setSelectedNodeId(prev => prev === coreNode.id ? null : coreNode.id)}
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(212, 175, 55, 0.15) 0%, rgba(13, 17, 26, 0.95) 100%)',
            border: '1.5px solid rgba(212, 175, 55, 0.45)',
            borderRadius: '20px',
            padding: '1.75rem',
            textAlign: 'center',
            cursor: 'pointer',
            position: 'relative',
            backdropFilter: 'blur(20px)',
            animation: 'coreGlowPulse 4s ease-in-out infinite',
            zIndex: 6
          }}
        >
          {/* Core HUD Emblem */}
          <div style={{
            width: '54px',
            height: '54px',
            margin: '0 auto 1rem',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.08) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#e2c974',
            boxShadow: '0 0 25px rgba(212, 175, 55, 0.35)'
          }}>
            <ShieldCheck size={28} />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(212, 175, 55, 0.12)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '999px',
            padding: '0.2rem 0.75rem',
            fontSize: '0.68rem',
            fontWeight: 800,
            color: '#e2c974',
            marginBottom: '0.6rem'
          }}>
            <Sparkles size={12} />
            <span>{isAr ? coreNode.tagAr : coreNode.tagEn}</span>
          </div>

          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
            {isAr ? coreNode.titleAr : coreNode.titleEn}
          </h3>
          <p style={{ margin: '0.35rem 0 1.25rem', fontSize: '0.72rem', color: '#94a3b8' }}>
            {isAr ? coreNode.subtitleAr : coreNode.subtitleEn}
          </p>

          {/* Large Hero Metric */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>
              {isAr ? 'الرصيد النقدي الحر المتاح بالخزينة والبنوك' : 'Total Unrestricted Liquid Capital'}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace' }}>
              {formatCleanWholeNumber(coreNode.amount)}
              <span style={{ fontSize: '0.82rem', color: '#64748b', marginInlineStart: '0.35rem' }}>{isAr ? 'ج.م' : 'EGP'}</span>
            </div>
          </div>

          {/* Financial Telemetry Sub-row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', textAlign: 'center' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '10px',
              padding: '0.65rem 0.5rem'
            }}>
              <div style={{ fontSize: '0.66rem', color: '#6ee7b7', fontWeight: 700 }}>
                {isAr ? 'إجمالي التدفق الداخل' : 'Total Inflows'}
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                {formatCleanWholeNumber(totalInflowVolume.toString())}
              </div>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '10px',
              padding: '0.65rem 0.5rem'
            }}>
              <div style={{ fontSize: '0.66rem', color: '#fcd34d', fontWeight: 700 }}>
                {isAr ? 'إجمالي توجيهات الصرف' : 'Total Outflows'}
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                {formatCleanWholeNumber(totalOutflowVolume.toString())}
              </div>
            </div>
          </div>
        </div>

        {/* ── COLUMN 3: OUTFLOW ALLOCATIONS (Left in RTL, Right in LTR) ───── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          zIndex: 5
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '0.4rem',
            borderBottom: '1px solid rgba(245, 158, 11, 0.2)'
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ArrowUpRight size={14} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />
              {isAr ? 'توجيهات الصرف والمشاريع (Outflows)' : 'Project Allocations & Costs'}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', fontWeight: 700 }}>
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
                className="flow-card-interactive"
                onClick={() => setSelectedNodeId(prev => prev === node.id ? null : node.id)}
                style={{
                  background: 'rgba(13, 17, 26, 0.88)',
                  border: `1px solid ${isSelected ? node.accentColor : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '14px',
                  padding: '0.95rem 1.1rem',
                  cursor: 'pointer',
                  position: 'relative',
                  backdropFilter: 'blur(12px)',
                  boxShadow: isSelected ? `0 0 20px ${node.accentColor}33` : '0 4px 14px rgba(0,0,0,0.4)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: `${node.accentColor}18`,
                      border: `1px solid ${node.accentColor}35`,
                      color: node.accentColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff' }}>
                        {isAr ? node.titleAr : node.titleEn}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        {isAr ? node.subtitleAr : node.subtitleEn}
                      </div>
                    </div>
                  </div>

                  {node.percentage !== undefined && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      color: node.accentColor
                    }}>
                      {node.percentage}%
                    </span>
                  )}
                </div>

                <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                    {formatCleanWholeNumber(node.amount)}
                    <span style={{ fontSize: '0.68rem', color: '#64748b', marginInlineStart: '0.3rem' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                  </span>
                  <span style={{ fontSize: '0.64rem', color: node.accentColor, fontWeight: 700 }}>
                    {isAr ? node.tagAr : node.tagEn}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Inspector Drawer / Explanatory Bottom Strip */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '12px',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        fontSize: '0.74rem',
        color: '#94a3b8',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Info size={15} style={{ color: '#d4af37', flexShrink: 0 }} />
          <span>
            {isAr 
              ? 'تتحرك النبضات الضوئية على المسارات التفاعلية لتمثيل سرعة واتجاه السيولة الفعلية. انقر على أي بند لإضاءة المسار المتصل به حصرياً.'
              : 'Animated light pulses illustrate capital velocity and directed allocation. Click any node to focus on its connecting conduit.'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span>{isAr ? 'تدفقات داخلة (إيرادات ورؤوس أموال)' : 'Inflows (Revenue & Equity)'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            <span>{isAr ? 'توجيهات صرف (إنشاءات وضرائب)' : 'Outflows (WIP & Taxes)'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
