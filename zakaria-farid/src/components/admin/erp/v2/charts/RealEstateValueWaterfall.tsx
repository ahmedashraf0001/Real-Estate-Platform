'use client';

import React, { useState, useMemo, useRef } from 'react';
import { 
  Layers, 
  TrendingUp, 
  DollarSign, 
  Building2, 
  Landmark, 
  ShieldCheck, 
  PieChart as PieIcon,
  Maximize2,
  Minimize2,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Info,
  Sparkles,
  Clock,
  ChevronRight,
  Coins,
  CheckCircle2,
  Wallet
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import { ERPContract, ERPPDCRecord, ERPTaxRecord, ERPPartnerCall } from '@/lib/erp/types';

interface RealEstateValueWaterfallProps {
  isAr?: boolean;
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

interface WaterfallNode {
  id: string;
  tier: 1 | 2 | 3 | 4 | 5;
  titleAr: string;
  titleEn: string;
  categoryAr: string;
  categoryEn: string;
  amount: string;
  percentage?: number;
  color: string;
  bgGradient: string;
  icon: React.ElementType;
  descriptionAr: string;
  descriptionEn: string;
  connectedTo?: string[];
}

export const RealEstateValueWaterfall: React.FC<RealEstateValueWaterfallProps> = ({
  isAr = true,
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTierFilter, setActiveTierFilter] = useState<'all' | 'liquidity' | 'costs' | 'profit'>('all');

  // Math Calculations
  const grossVal = D(totalGrossContractValue);
  const collected = D(totalCollectedCash);
  const arVal = D(kpis.accountsReceivable);
  const wipTotal = D(totalWipIncurred);
  const safePdc = D(totalSafePDCs);
  const cashBank = D(kpis.cashBank);
  const deferredRev = D(kpis.deferredRevenue);
  const realizedRev = D(kpis.realizedRevenue);

  // Taxes
  const totalTaxes = useMemo(() => {
    return taxRecords.reduce((acc, r) => acc.plus(r.tax_amount || '0'), D(0)).toFixed(2);
  }, [taxRecords]);

  // Projected Net Realized Gross Profit (Realized Revenue - Total WIP Incurred)
  const netRealizedProfit = useMemo(() => {
    const p = realizedRev.minus(wipTotal);
    return p.isNegative() ? D(0) : p;
  }, [realizedRev, wipTotal]);

  // Gross Profit Margin Percentage
  const grossMarginPct = useMemo(() => {
    if (grossVal.isZero()) return 0;
    const margin = grossVal.minus(wipTotal);
    return Math.max(0, Math.round((margin.toNumber() / grossVal.toNumber()) * 100));
  }, [grossVal, wipTotal]);

  // Structured Waterfall Nodes
  const nodes: WaterfallNode[] = useMemo(() => {
    return [
      // TIER 1: GROSS PORTFOLIO SALES CEILING
      {
        id: 'gross_portfolio',
        tier: 1,
        titleAr: 'إجمالي القيمة التعاقدية للمبيعات',
        titleEn: 'Gross Contracted Sales Ceiling',
        categoryAr: 'منبع القيمة الكلية',
        categoryEn: 'Portfolio Source',
        amount: grossVal.toFixed(2),
        percentage: 100,
        color: '#c5a059',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #fefdfa 100%)',
        icon: Building2,
        descriptionAr: 'القيمة الإجمالية لكافة عقود البيع المبرمة مع العملاء متضمنة الدفعات والمستحقات المجدولة',
        descriptionEn: 'Total contracted revenue signed with clients across all projects',
        connectedTo: ['collected_cash', 'safe_pdcs', 'accounts_receivable']
      },

      // TIER 2: CONTRACT LIQUIDITY BREAKDOWN
      {
        id: 'collected_cash',
        tier: 2,
        titleAr: 'السيولة النقدية المحصلة فعلياً',
        titleEn: 'Actual Cash Collected',
        categoryAr: 'السيولة الحاضرة',
        categoryEn: 'Liquid Cash',
        amount: collected.toFixed(2),
        percentage: grossVal.isZero() ? 0 : Math.round((collected.toNumber() / grossVal.toNumber()) * 100),
        color: '#15803d',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
        icon: Wallet,
        descriptionAr: 'الأموال التي تم توريدها واستلامها في حسابات البنوك والخزينة الرئيسية وسُجلت بالدفاتر',
        descriptionEn: 'Cash receipts banked in safe or commercial bank accounts',
        connectedTo: ['wip_civil', 'wip_mep', 'wip_finishing', 'realized_profit']
      },
      {
        id: 'safe_pdcs',
        tier: 2,
        titleAr: 'شيكات وأوراق قبض بالخزينة',
        titleEn: 'In-Safe PDCs & Cheques',
        categoryAr: 'سيولة مستقبلية مضمونة',
        categoryEn: 'Secured Paper',
        amount: safePdc.toFixed(2),
        percentage: grossVal.isZero() ? 0 : Math.round((safePdc.toNumber() / grossVal.toNumber()) * 100),
        color: '#946f23',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #fefdfa 100%)',
        icon: Coins,
        descriptionAr: 'أوراق تجارية محفوظة بخزينة الشركة برسم التحصيل وتستحق في مواعيدها المحددة',
        descriptionEn: 'Commercial post-dated cheques locked in the treasury vault',
        connectedTo: ['accounts_receivable']
      },
      {
        id: 'accounts_receivable',
        tier: 2,
        titleAr: 'أقساط مؤجلة في ذمم العملاء',
        titleEn: 'Deferred Accounts Receivable',
        categoryAr: 'مستحقات مجدولة',
        categoryEn: 'Receivables',
        amount: arVal.toFixed(2),
        percentage: grossVal.isZero() ? 0 : Math.round((arVal.toNumber() / grossVal.toNumber()) * 100),
        color: '#946f23',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #fffdfa 100%)',
        icon: Landmark,
        descriptionAr: 'أقساط تعاقدية مستحقة السداد تباعاً طبقاً لجداول الدفعات عبر السنوات القادمة',
        descriptionEn: 'Scheduled installments due from purchasers across future years',
        connectedTo: ['deferred_revenue']
      },

      // TIER 3: COST ABSORPTION WATERFALL (WIP)
      {
        id: 'wip_land',
        tier: 3,
        titleAr: 'حصة الأرض والتراخيص',
        titleEn: 'Land Allocation & Permits',
        categoryAr: 'امتصاص التكلفة [105100]',
        categoryEn: 'Cost Absorption',
        amount: wipAccounts.land || '0.00',
        percentage: wipTotal.isZero() ? 0 : Math.round((D(wipAccounts.land).toNumber() / wipTotal.toNumber()) * 100),
        color: '#b45309',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
        icon: Layers,
        descriptionAr: 'تكاليف شراء الأرض، الرسوم المساحية، وتراخيص البناء المقيدة بحسابات الأصول الجارية',
        descriptionEn: 'Land purchase price and municipal building permit fees',
        connectedTo: ['total_wip']
      },
      {
        id: 'wip_civil',
        tier: 3,
        titleAr: 'الهيكل الخرساني والإنشاءات',
        titleEn: 'Civil & Concrete Structure',
        categoryAr: 'امتصاص التكلفة [105200]',
        categoryEn: 'Cost Absorption',
        amount: wipAccounts.civil || '0.00',
        percentage: wipTotal.isZero() ? 0 : Math.round((D(wipAccounts.civil).toNumber() / wipTotal.toNumber()) * 100),
        color: '#ea580c',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)',
        icon: Building2,
        descriptionAr: 'مصروفات الحفر، الإحلال، الخرسانات المسلحة، حديد التسليح، ومقاولي الباطن الإنشائيين',
        descriptionEn: 'Reinforced concrete, rebar, foundation, and civil excavation WIP',
        connectedTo: ['total_wip']
      },
      {
        id: 'wip_finishing',
        tier: 3,
        titleAr: 'التشطيبات والكهروميكانيك',
        titleEn: 'Finishing & MEP Engineering',
        categoryAr: 'امتصاص التكلفة [105300]',
        categoryEn: 'Cost Absorption',
        amount: D(wipAccounts.finishing).plus(wipAccounts.mep).toFixed(2),
        percentage: wipTotal.isZero() ? 0 : Math.round((D(wipAccounts.finishing).plus(wipAccounts.mep).toNumber() / wipTotal.toNumber()) * 100),
        color: '#b8903e',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #fefcf8 100%)',
        icon: Sparkles,
        descriptionAr: 'الواجهات الخارجية المعمارية، الرخام، المصاعد، والأعمال الكهربائية والصحية',
        descriptionEn: 'Architectural facades, marble cladding, elevators, and MEP systems',
        connectedTo: ['total_wip']
      },
      {
        id: 'total_wip',
        tier: 3,
        titleAr: 'إجمالي تكلفة البناء المنفذة (WIP)',
        titleEn: 'Total WIP Incurred',
        categoryAr: 'أصول قيد التنفيذ [105000]',
        categoryEn: 'Construction Assets',
        amount: wipTotal.toFixed(2),
        percentage: grossVal.isZero() ? 0 : Math.round((wipTotal.toNumber() / grossVal.toNumber()) * 100),
        color: '#0f172a',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        icon: ShieldCheck,
        descriptionAr: 'إجمالي المبالغ المنفقة فعلياً على أرض الواقع في تطوير وبناء العقارات حتى اللحظة',
        descriptionEn: 'Cumulative physical construction expenditure absorbed into projects',
        connectedTo: ['realized_revenue', 'realized_profit']
      },

      // TIER 4: IFRS 15 REVENUE SIPHON
      {
        id: 'realized_revenue',
        tier: 4,
        titleAr: 'إيرادات معترف بها (IFRS 15)',
        titleEn: 'Recognized Revenue (IFRS 15)',
        categoryAr: 'اعتراف بنسبة الإنجاز [401000]',
        categoryEn: 'Realized Revenue',
        amount: realizedRev.toFixed(2),
        percentage: grossVal.isZero() ? 0 : Math.round((realizedRev.toNumber() / grossVal.toNumber()) * 100),
        color: '#15803d',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)',
        icon: TrendingUp,
        descriptionAr: 'الإيرادات التي استوفت شروط معيار IFRS 15 طبقاً لنسبة التنفيذ المعماري المنتهية',
        descriptionEn: 'Revenue earned and recognized based on physical construction milestones',
        connectedTo: ['realized_profit']
      },
      {
        id: 'deferred_revenue',
        tier: 4,
        titleAr: 'إيرادات مؤجلة غير مكتسبة',
        titleEn: 'Unearned Deferred Revenue',
        categoryAr: 'التزام عقدي مؤجل [206100]',
        categoryEn: 'Deferred Backlog',
        amount: deferredRev.toFixed(2),
        percentage: grossVal.isZero() ? 0 : Math.round((deferredRev.toNumber() / grossVal.toNumber()) * 100),
        color: '#64748b',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        icon: Clock,
        descriptionAr: 'إيرادات تعاقدية مؤجلة لا تعترف بها دفاتر الشركة كربح إلا مع إتمام مراحل التسليم',
        descriptionEn: 'Unearned deferred revenue held on the balance sheet until delivery',
        connectedTo: []
      },

      // TIER 5: NET PROFIT & EQUITY RESERVOIR
      {
        id: 'realized_profit',
        tier: 5,
        titleAr: 'صافي الهامش الربحي المحقق',
        titleEn: 'Net Realized Profit Margin',
        categoryAr: 'حوض الأرباح الصافية',
        categoryEn: 'Realized Equity',
        amount: netRealizedProfit.toFixed(2),
        percentage: grossMarginPct,
        color: '#946f23',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #fefdfa 100%)',
        icon: Coins,
        descriptionAr: 'فائض الربح المحقق والمحرر بعد اقتطاع كافة تكاليف البناء المنفذة بنسبة هامش إجمالي ' + grossMarginPct + '%',
        descriptionEn: 'Net realized cash margin generated by projects with ' + grossMarginPct + '% gross margin',
        connectedTo: []
      }
    ];
  }, [grossVal, collected, arVal, wipTotal, safePdc, cashBank, deferredRev, realizedRev, wipAccounts, netRealizedProfit, grossMarginPct]);

  // Selected Node Details
  const activeNode = useMemo(() => {
    if (!selectedNodeId) return nodes[0];
    return nodes.find(n => n.id === selectedNodeId) || nodes[0];
  }, [nodes, selectedNodeId]);

  // Filtered nodes
  const visibleNodes = useMemo(() => {
    if (activeTierFilter === 'liquidity') {
      return nodes.filter(n => n.tier === 1 || n.tier === 2 || n.id === 'realized_profit');
    }
    if (activeTierFilter === 'costs') {
      return nodes.filter(n => n.tier === 1 || n.tier === 3);
    }
    if (activeTierFilter === 'profit') {
      return nodes.filter(n => n.tier === 1 || n.tier === 4 || n.tier === 5);
    }
    return nodes;
  }, [nodes, activeTierFilter]);

  return (
    <div 
      ref={containerRef}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: isFullscreen ? '2rem' : '1.5rem',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : undefined,
        left: isFullscreen ? 0 : undefined,
        right: isFullscreen ? 0 : undefined,
        bottom: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9999 : undefined,
        overflowY: isFullscreen ? 'auto' : undefined
      }}
    >
      {/* 1. HEADER & CONTROLS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(148, 111, 35, 0.25)'
            }}>
              <Layers size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                {isAr ? 'خريطة شلال القيمة وتفكيك الهامش العقاري (Value Waterfall)' : 'Real Estate Capital & Margin Waterfall'}
              </h2>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {isAr 
                  ? 'مخطط بياني تفاعلي يفكك دورة حياة رأس المال: من القيمة البيعية، مروراً بامتصاص التكاليف، وصولاً للهامش الصافي'
                  : 'Interactive visual engine tracing portfolio value through cost absorption to net realized margin'}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Pills & Fullscreen Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.2rem',
            display: 'flex',
            gap: '0.2rem'
          }}>
            {[
              { id: 'all', labelAr: 'كافة المسارات', labelEn: 'All Streams' },
              { id: 'liquidity', labelAr: 'مسار السيولة', labelEn: 'Liquidity' },
              { id: 'costs', labelAr: 'مسار التكاليف', labelEn: 'Costs (WIP)' },
              { id: 'profit', labelAr: 'مسار الأرباح', labelEn: 'Profits' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveTierFilter(f.id as any)}
                style={{
                  background: activeTierFilter === f.id ? '#0f172a' : 'transparent',
                  color: activeTierFilter === f.id ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.3rem 0.65rem',
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

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
            title={isFullscreen ? (isAr ? 'تصغير' : 'Exit Fullscreen') : (isAr ? 'ملء الشاشة' : 'Fullscreen')}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* 2. THE 5-TIER WATERFALL INTERACTIVE SCHEMATIC */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        padding: '0.5rem 0'
      }}>
        {visibleNodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const NodeIcon = node.icon;

          return (
            <div
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              style={{
                background: node.bgGradient,
                border: `1.5px solid ${isSelected ? node.color : 'rgba(226, 232, 240, 0.9)'}`,
                borderRadius: '14px',
                padding: '1.15rem',
                cursor: 'pointer',
                boxShadow: isSelected 
                  ? `0 6px 20px -3px ${node.color}30` 
                  : '0 1px 3px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                position: 'relative',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {/* Category & Tier Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  color: node.color,
                  background: `${node.color}15`,
                  border: `1px solid ${node.color}30`,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '5px'
                }}>
                  {isAr ? node.categoryAr : node.categoryEn}
                </span>

                {node.percentage !== undefined && (
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: node.color, fontVariantNumeric: 'tabular-nums' }}>
                    {node.percentage}%
                  </span>
                )}
              </div>

              {/* Title & Icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: `${node.color}15`,
                  color: node.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <NodeIcon size={16} />
                </div>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                  {isAr ? node.titleAr : node.titleEn}
                </h4>
              </div>

              {/* Amount Display */}
              <div style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                marginTop: 'auto'
              }}>
                {D(node.amount).formatEGP(isAr)}
              </div>

              {/* Description Snippet */}
              <p style={{
                fontSize: '0.68rem',
                color: '#64748b',
                margin: 0,
                lineHeight: 1.35,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {isAr ? node.descriptionAr : node.descriptionEn}
              </p>

              {/* Selection Indicator bar */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '10%',
                  right: '10%',
                  height: '3px',
                  background: node.color,
                  borderRadius: '3px 3px 0 0'
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* 3. ACTIVE NODE ANALYTICAL DOSSIER DRAWER */}
      {activeNode && (
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fefdfa 100%)',
          border: '1.5px solid rgba(184, 144, 62, 0.35)',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 4px 16px rgba(184, 144, 62, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: `${activeNode.color}15`,
              color: activeNode.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {React.createElement(activeNode.icon, { size: 22 })}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: activeNode.color, background: `${activeNode.color}15`, padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                  {isAr ? activeNode.categoryAr : activeNode.categoryEn}
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>•</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                  {isAr ? 'المرحلة رقم ' : 'Tier '}{activeNode.tier}
                </span>
              </div>
              <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                {isAr ? activeNode.titleAr : activeNode.titleEn}
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.74rem', color: '#475569', maxWidth: '650px', lineHeight: 1.4 }}>
                {isAr ? activeNode.descriptionAr : activeNode.descriptionEn}
              </p>
            </div>
          </div>

          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
              {isAr ? 'القيمة المسجلة حالياً:' : 'Recorded Value:'}
            </span>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: activeNode.color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {D(activeNode.amount).formatEGP(isAr)}
            </div>
            {activeNode.percentage !== undefined && (
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>
                {isAr ? `تمثل ${activeNode.percentage}% من المنبع الكلي` : `${activeNode.percentage}% of gross ceiling`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. EXECUTIVE MARGIN & WATERFALL METRIC SUMMARY FOOTER */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        fontSize: '0.74rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <ShieldCheck size={16} color="#946f23" />
          <span style={{ color: '#475569' }}>
            {isAr ? 'معادلة الربح الإجمالي للمحفظة: ' : 'Portfolio Gross Margin Formula: '}
            <strong style={{ color: '#0f172a' }}>
              {isAr ? 'إجمالي المبيعات التعاقدية' : 'Gross Sales'} ({grossVal.formatEGP(isAr)}) - {isAr ? 'تكاليف الإنشاء المنفذة' : 'WIP'} ({wipTotal.formatEGP(isAr)})
            </strong>
            {' = '}
            <strong style={{ color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
              {grossVal.minus(wipTotal).formatEGP(isAr)} ({grossMarginPct}%)
            </strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b' }}>
          <Sparkles size={13} color="#946f23" />
          <span>{isAr ? 'حسابات مطابقة لمعايير IFRS 15 المحاسبية' : 'IFRS 15 compliant financial engineering'}</span>
        </div>
      </div>

    </div>
  );
};
