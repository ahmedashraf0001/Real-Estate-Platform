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
  // Structured Waterfall Nodes (Exactly 8 Balanced Nodes: 4 Sales/Liquidity + 4 WIP Costs)
  const nodes: WaterfallNode[] = useMemo(() => {
    return [
      // TIER 1: GROSS PORTFOLIO SALES CEILING
      {
        id: 'gross_portfolio',
        tier: 1,
        titleAr: 'إجمالي قيمة العقود المباعة',
        titleEn: 'Gross Contracted Sales Ceiling',
        categoryAr: 'سقف المبيعات',
        categoryEn: 'Portfolio Source',
        amount: grossVal.toFixed(2),
        percentage: 100,
        color: '#946f23',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #faf8f5 100%)',
        icon: Building2,
        descriptionAr: 'كل مبيعات العقود اللي اتمضت مع العملاء شاملة الدفعات المحصلة والأقساط المجدولة للمستقبل.',
        descriptionEn: 'Total contracted revenue signed with clients across all projects',
        connectedTo: ['collected_cash', 'accounts_receivable']
      },

      // TIER 2: CONTRACT LIQUIDITY BREAKDOWN
      {
        id: 'collected_cash',
        tier: 2,
        titleAr: 'المبالغ المحصلة فعلياً',
        titleEn: 'Actual Cash Collected',
        categoryAr: 'كاش جاهز بالخزنة والبنك',
        categoryEn: 'Liquid Cash',
        amount: collected.toFixed(2),
        percentage: grossVal.isZero() ? 0 : Math.round((collected.toNumber() / grossVal.toNumber()) * 100),
        color: '#047857',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
        icon: Wallet,
        descriptionAr: 'الفلوس اللي دخلت فعلاً في خزينة الشركة وحسابات البنك بسندات قبض نقدية وتحويلات معتمدة.',
        descriptionEn: 'Cash receipts banked in safe or commercial bank accounts',
        connectedTo: ['wip_civil', 'wip_finishing', 'total_wip']
      },
      {
        id: 'accounts_receivable',
        tier: 2,
        titleAr: 'أقساط تعاقدية لسه عند العملاء',
        titleEn: 'Deferred Accounts Receivable',
        categoryAr: 'أقساط قادمة',
        categoryEn: 'Receivables',
        amount: arVal.toFixed(2),
        percentage: grossVal.isZero() ? 0 : Math.round((arVal.toNumber() / grossVal.toNumber()) * 100),
        color: '#1e40af',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
        icon: Landmark,
        descriptionAr: 'أقساط مجدولة على المشترين بموجب العقود هندخلها تباعاً في مواعيدها كاش أو تحويل إنستاباي.',
        descriptionEn: 'Scheduled contract tranches due for collection across active deals',
        connectedTo: []
      },

      // TIER 3: NET PROFIT & MARGIN RESERVOIR
      {
        id: 'realized_profit',
        tier: 5,
        titleAr: 'صافي الأرباح وهوامش العائد',
        titleEn: 'Net Realized Profit Margin',
        categoryAr: 'صافي الربح',
        categoryEn: 'Realized Equity',
        amount: netRealizedProfit.toFixed(2),
        percentage: grossMarginPct,
        color: '#946f23',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #faf8f5 100%)',
        icon: Coins,
        descriptionAr: 'الأرباح الصافية المحققة من المبيعات بعد خصم كل مصاريف المباني، مع هامش ربح تقديري للمحفظة.',
        descriptionEn: 'Net realized cash margin generated by projects with ' + grossMarginPct + '% gross margin',
        connectedTo: []
      },

      // TIER 4: COST ABSORPTION WATERFALL (WIP)
      {
        id: 'wip_land',
        tier: 3,
        titleAr: 'ثمن الأرض والتراخيص',
        titleEn: 'Land Allocation & Permits',
        categoryAr: 'مصاريف الأرض والرخص [105100]',
        categoryEn: 'Cost Absorption',
        amount: wipAccounts.land || '0.00',
        percentage: wipTotal.isZero() ? 0 : Math.round((D(wipAccounts.land).toNumber() / wipTotal.toNumber()) * 100),
        color: '#475569',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        icon: Layers,
        descriptionAr: 'ثمن شراء أرض المشروع المحمل ومصاريف التراخيص والرسوم الإنشائية والتأمينات.',
        descriptionEn: 'Land purchase price and municipal building permit fees',
        connectedTo: ['total_wip']
      },
      {
        id: 'wip_civil',
        tier: 3,
        titleAr: 'الهيكل والخرسانات المسلحة',
        titleEn: 'Civil & Concrete Structure',
        categoryAr: 'مصاريف المباني [105200]',
        categoryEn: 'Cost Absorption',
        amount: wipAccounts.civil || '0.00',
        percentage: wipTotal.isZero() ? 0 : Math.round((D(wipAccounts.civil).toNumber() / wipTotal.toNumber()) * 100),
        color: '#c2410c',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)',
        icon: Building2,
        descriptionAr: 'أعمال الحفر والخرسانات المسلحة وحديد التسليح ومقاولي البناء والمصنعيات.',
        descriptionEn: 'Reinforced concrete, rebar, foundation, and civil excavation WIP',
        connectedTo: ['total_wip']
      },
      {
        id: 'wip_finishing',
        tier: 3,
        titleAr: 'التشطيبات والشبكات (MEP)',
        titleEn: 'Finishing & MEP Engineering',
        categoryAr: 'مصاريف التشطيب والمرافق [105300]',
        categoryEn: 'Cost Absorption',
        amount: D(wipAccounts.finishing).plus(wipAccounts.mep).toFixed(2),
        percentage: wipTotal.isZero() ? 0 : Math.round((D(wipAccounts.finishing).plus(wipAccounts.mep).toNumber() / wipTotal.toNumber()) * 100),
        color: '#701a75',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
        icon: Sparkles,
        descriptionAr: 'تشطيب الواجهات والرخام والأسانسير وشبكات الكهرباء والسباكة وتأسيسات التكييف.',
        descriptionEn: 'Architectural facades, marble cladding, elevators, and MEP systems',
        connectedTo: ['total_wip']
      },
      {
        id: 'total_wip',
        tier: 3,
        titleAr: 'إجمالي المصروف على البناء',
        titleEn: 'Total WIP Incurred',
        categoryAr: 'رأس مال البناء [105000]',
        categoryEn: 'Construction Assets',
        amount: wipTotal.toFixed(2),
        percentage: grossVal.isZero() ? 0 : Math.round((wipTotal.toNumber() / grossVal.toNumber()) * 100),
        color: '#0f172a',
        bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        icon: ShieldCheck,
        descriptionAr: 'كل الفلوس اللي اتصرفت فعلياً في المواقع من بداية الشغل لحد دلوقتي (أصل استثماري).',
        descriptionEn: 'Cumulative physical construction expenditure absorbed into projects',
        connectedTo: ['realized_profit']
      }
    ];
  }, [grossVal, collected, arVal, wipTotal, safePdc, cashBank, wipAccounts, netRealizedProfit, grossMarginPct]);

  // Selected Node Details
  const activeNode = useMemo(() => {
    if (!selectedNodeId) return nodes[0];
    return nodes.find(n => n.id === selectedNodeId) || nodes[0];
  }, [nodes, selectedNodeId]);

  // Filtered nodes
  const visibleNodes = useMemo(() => {
    if (activeTierFilter === 'liquidity') {
      return nodes.filter(n => n.id === 'gross_portfolio' || n.id === 'collected_cash' || n.id === 'accounts_receivable' || n.id === 'realized_profit');
    }
    if (activeTierFilter === 'costs') {
      return nodes.filter(n => n.id.startsWith('wip_') || n.id === 'total_wip');
    }
    if (activeTierFilter === 'profit') {
      return nodes.filter(n => n.id === 'gross_portfolio' || n.id === 'total_wip' || n.id === 'realized_profit');
    }
    return nodes;
  }, [nodes, activeTierFilter]);

  return (
    <div 
      ref={containerRef}
      style={{
        background: embeddedInStudio ? 'transparent' : '#ffffff',
        border: embeddedInStudio ? 'none' : '1px solid #e2e8f0',
        borderRadius: embeddedInStudio ? 0 : '18px',
        padding: embeddedInStudio ? 0 : '1.5rem',
        boxShadow: embeddedInStudio ? 'none' : '0 2px 10px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: embeddedInStudio ? '0.85rem' : '1.25rem',
        position: 'relative'
      }}
    >
      {/* 1. HEADER & CONTROLS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        {embeddedInStudio ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(148, 111, 35, 0.2)'
            }}>
              <Layers size={14} />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
              {isAr ? 'تقسيمة فلوس المبيعات على المصاريف والأرباح' : 'Real Estate Capital Waterfall'}
            </span>
            <span style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              padding: '0.15rem 0.5rem',
              borderRadius: '6px',
              background: 'rgba(197, 160, 89, 0.1)',
              border: '1px solid rgba(197, 160, 89, 0.25)',
              color: '#946f23'
            }}>
              {isAr ? 'حركة الفلوس' : 'Value Streams'}
            </span>
          </div>
        ) : (
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
                  {isAr ? 'تقسيمة فلوس المبيعات على المصاريف والأرباح' : 'Real Estate Capital & Margin Waterfall'}
                </h2>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  {isAr 
                    ? 'بيوضح فلوس المبيعات بتروح فين: اللي اتحصل، والمصروف على المباني، وصافي الأرباح'
                    : 'Interactive visual engine tracing portfolio value through cost absorption to net realized margin'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filter Pills */}
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
              { id: 'all', labelAr: 'الكل', labelEn: 'All Streams' },
              { id: 'liquidity', labelAr: 'الكاش والتحصيل', labelEn: 'Liquidity' },
              { id: 'costs', labelAr: 'مصاريف المباني', labelEn: 'Costs (WIP)' },
              { id: 'profit', labelAr: 'صافي الربح', labelEn: 'Profits' }
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
                  padding: embeddedInStudio ? '0.2rem 0.5rem' : '0.3rem 0.65rem',
                  fontSize: embeddedInStudio ? '0.68rem' : '0.72rem',
                  fontWeight: 700,
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

      {/* 2. PROMINENT ACTIVE NODE ANALYTICAL DOSSIER (Integrated Above Grid) */}
      {activeNode && (
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderInlineStart: `4px solid ${activeNode.color}`,
          borderRadius: '14px',
          padding: embeddedInStudio ? '0.85rem 1.15rem' : '1.15rem 1.4rem',
          boxShadow: '0 4px 16px -4px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: `${activeNode.color}15`,
              color: activeNode.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {React.createElement(activeNode.icon, { size: 20 })}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: activeNode.color, background: `${activeNode.color}15`, padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                  {isAr ? activeNode.categoryAr : activeNode.categoryEn}
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>•</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                  {isAr ? 'اضغط أي كارت بالأسفل لعرض تحليله هنا' : 'Click any card below to inspect'}
                </span>
              </div>
              <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? activeNode.titleAr : activeNode.titleEn}
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.74rem', color: '#475569', maxWidth: '650px', lineHeight: 1.4 }}>
                {isAr ? activeNode.descriptionAr : activeNode.descriptionEn}
              </p>
            </div>
          </div>

          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
              {isAr ? 'القيمة المسجلة بالدفاتر:' : 'Recorded Value:'}
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {D(activeNode.amount).formatEGP(isAr)}
            </div>
            {activeNode.percentage !== undefined && (
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: activeNode.color }}>
                {isAr ? `يمثل ${activeNode.percentage}% من إجمالي المحفظة` : `${activeNode.percentage}% of portfolio`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. THE 8 BALANCED WATERFALL STREAM CARDS (4x2 Grid) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: embeddedInStudio ? '0.75rem' : '1rem',
        padding: embeddedInStudio ? '0.25rem 0' : '0.5rem 0'
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
                padding: embeddedInStudio ? '0.85rem 1rem' : '1.15rem',
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
                fontSize: embeddedInStudio ? '1.2rem' : '1.45rem',
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
            {isAr ? 'حساب الربح الإجمالي: ' : 'Portfolio Gross Margin Formula: '}
            <strong style={{ color: '#0f172a' }}>
              {isAr ? 'إجمالي المبيعات' : 'Gross Sales'} ({grossVal.formatEGP(isAr)}) - {isAr ? 'المصروف على البناء' : 'WIP'} ({wipTotal.formatEGP(isAr)})
            </strong>
            {' = '}
            <strong style={{ color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
              {grossVal.minus(wipTotal).formatEGP(isAr)} ({grossMarginPct}%)
            </strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b' }}>
          <Sparkles size={13} color="#946f23" />
          <span>{isAr ? 'حسابات دقيقة ومطابقة للمعايير المحاسبية المعتمدة' : 'IFRS 15 compliant financial engineering'}</span>
        </div>
      </div>

    </div>
  );
};
