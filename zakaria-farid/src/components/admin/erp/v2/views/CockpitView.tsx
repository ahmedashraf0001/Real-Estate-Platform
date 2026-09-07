'use client';

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  Building2, 
  Calendar, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Landmark,
  ShieldCheck,
  CreditCard,
  Receipt,
  Network,
  Layers,
  Compass,
  Activity,
  BarChart3,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  ERPContract, 
  ERPPDCRecord, 
  ERPInstallmentSchedule, 
  ERPJournalEntry, 
  ERPTaxRecord, 
  ERPPartnerCall 
} from '@/lib/erp/types';
import { CapitalFlowMindmap } from '@/components/erp/CapitalFlowMindmap';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { StatusBadge } from '@/components/erp/StatusBadge';
import { localizeJournalDescription } from '@/components/erp/JournalEntryPreview';
import { D } from '@/lib/erp/math';
import { CashFlowForecastChart } from '../charts/CashFlowForecastChart';
import { RealEstateValueWaterfall } from '../charts/RealEstateValueWaterfall';
import { ZFKpiCard } from '../ZFKpiCard';
import styles from '../ZFWorkstationShell.module.css';

interface CockpitViewProps {
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
  contracts: ERPContract[];
  pdcRecords: ERPPDCRecord[];
  schedules: ERPInstallmentSchedule[];
  journalEntries: ERPJournalEntry[];
  taxRecords?: ERPTaxRecord[];
  partnerCalls?: ERPPartnerCall[];
  onOpenQuickTransaction?: () => void;
  onInspectContract: (contract: ERPContract) => void;
  onInspectCheque: (cheque: ERPPDCRecord) => void;
  onCollectItem: (item: ERPPDCRecord) => void;
  onOpenNewCheque?: () => void;
  onOpenNewContract?: () => void;
  onNavigateTab?: (tab: string, filterParams?: any) => void;
}

export const CockpitView: React.FC<CockpitViewProps> = ({
  isAr = true,
  kpis,
  totalGrossContractValue,
  totalCollectedCash,
  totalWipIncurred,
  totalSafePDCs = '0.00',
  totalInjectedCapital = '0.00',
  wipAccounts,
  contracts = [],
  pdcRecords = [],
  schedules = [],
  journalEntries = [],
  taxRecords = [],
  partnerCalls = [],
  onOpenQuickTransaction,
  onInspectContract,
  onInspectCheque,
  onCollectItem,
  onOpenNewCheque,
  onOpenNewContract,
  onNavigateTab
}) => {
  // Executive Analytical Lens Switcher State ('mindmap' | 'forecast' | 'waterfall')
  const [activeStudioLens, setActiveStudioLens] = useState<'mindmap' | 'forecast' | 'waterfall'>('mindmap');

  // 1. Calculate collection progress percentage
  const collectionRate = useMemo(() => {
    const gross = D(totalGrossContractValue);
    if (gross.isZero()) return '0';
    return D(totalCollectedCash).div(gross).times(100).toFixed(1);
  }, [totalGrossContractValue, totalCollectedCash]);

  // 2. Liquidity Spectrum Calculations
  const liquiditySpectrum = useMemo(() => {
    const cash = D(kpis.cashBank);
    const receivables = D(kpis.accountsReceivable);
    const total = cash.plus(receivables);
    if (total.isZero()) return { cashPct: 50, receivablesPct: 50 };
    const cashPct = Math.min(100, Math.max(0, cash.div(total).times(100).toNumber()));
    const receivablesPct = 100 - cashPct;
    return { cashPct, receivablesPct };
  }, [kpis.cashBank, kpis.accountsReceivable]);

  // 3. Performance Matrix Calculations
  const perfMetrics = useMemo(() => {
    const grossSales = D(totalGrossContractValue);
    const wipTotal = D(totalWipIncurred);
    const expectedGrossProfit = grossSales.minus(wipTotal);
    const grossMarginPct = grossSales.isZero() ? '0' : expectedGrossProfit.div(grossSales).times(100).toFixed(1);
    const avgDealSize = contracts.length > 0 ? grossSales.div(contracts.length) : D(0);

    const civilPlusFinishing = D(wipAccounts.civil).plus(wipAccounts.finishing);
    const civilFinishingPct = wipTotal.isZero() ? '0' : civilPlusFinishing.div(wipTotal).times(100).toFixed(0);

    const netOperatingSurplus = D(totalCollectedCash).minus(wipTotal);
    const liquidityCoverageRatio = wipTotal.isZero() ? '100' : D(totalCollectedCash).div(wipTotal).times(100).toFixed(0);

    return {
      grossSales,
      wipTotal,
      expectedGrossProfit,
      grossMarginPct,
      avgDealSize,
      civilPlusFinishing,
      civilFinishingPct,
      netOperatingSurplus,
      liquidityCoverageRatio
    };
  }, [totalGrossContractValue, totalWipIncurred, contracts.length, wipAccounts.civil, wipAccounts.finishing, totalCollectedCash]);

  return (
    <div className={styles.stageContainer} style={{ paddingBottom: '3rem' }}>
      {/* SECTION 1: STAGE HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingTop: '0.35rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {isAr ? 'نظرة عامة على الشغل والفلوس' : 'Executive Financial Cockpit'}
            </h1>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '0.18rem 0.55rem',
              borderRadius: '6px',
              background: 'rgba(184, 144, 62, 0.09)',
              border: '1px solid rgba(184, 144, 62, 0.28)',
              color: '#946f23'
            }}>
              {isAr ? 'موقف الكاش' : 'Executive Position'}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
            {isAr 
              ? 'متابعة فورية للكاش المتاح، أقساط العملاء، مصاريف المباني، وحركة الفلوس'
              : 'Real-time liquidity, receivables, construction WIP, and capital flow'}
          </p>
        </div>
      </div>

      {/* SECTION 2: ASYMMETRIC FINANCIAL BENTO WITH VISUAL SPECTRUM & METRIC METERS */}
      <div className={styles.asymmetricBentoGrid}>
        {/* Left / Hero Card (Flagship Liquidity & Multi-Segmented Spectrum) */}
        <ZFKpiCard
          variant="double-bezel"
          isFlagship={true}
          title={isAr ? 'الكاش الجاهز (البنك والخزنة)' : 'Available Liquidity & Financial Command'}
          value={D(kpis.cashBank).formatEGP(isAr)}
          icon={<Wallet size={20} />}
          accentColor="gold"
          progress={collectionRate}
          progressColor="#946f23"
          badge={{ text: isAr ? 'كاش جاهز للاستخدام' : 'Ready & In-Safe', variant: 'gold' }}
          subtitleLabel={isAr ? 'نسبة اللي حَصّلناه من المبيعات' : 'Collected Sales Ratio'}
          subtitleValue={
            <div style={{ width: '100%', marginTop: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#64748b', marginBottom: '0.35rem' }}>
                <span>{collectionRate}% ({D(totalCollectedCash).formatEGP(isAr)})</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{isAr ? 'طيف السيولة والمستحقات' : 'Liquidity Spectrum'}</span>
              </div>
              {/* Multi-Segmented Spectrum Bar */}
              <div style={{ height: '7px', width: '100%', background: '#e2e8f0', borderRadius: '4px', display: 'flex', overflow: 'hidden' }}>
                <div 
                  style={{ width: `${liquiditySpectrum.cashPct}%`, background: 'linear-gradient(90deg, #946f23, #c5a059)', transition: 'width 0.4s ease' }} 
                  title={isAr ? `كاش جاهز: ${D(kpis.cashBank).formatEGP(true)}` : 'Cash Safe/Bank'} 
                />
                <div 
                  style={{ width: `${liquiditySpectrum.receivablesPct}%`, background: 'linear-gradient(90deg, #1e40af, #3b82f6)', transition: 'width 0.4s ease' }} 
                  title={isAr ? `أقساط عند العملاء: ${D(kpis.accountsReceivable).formatEGP(true)}` : 'Receivables'} 
                />
              </div>
              <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.4rem', fontSize: '0.67rem', color: '#64748b' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#946f23' }} />
                  {isAr ? 'كاش بالخزنة والبنك' : 'Liquid'} ({Math.round(liquiditySpectrum.cashPct)}%)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#1e40af' }} />
                  {isAr ? 'أقساط عند المشترين' : 'Receivables'} ({Math.round(liquiditySpectrum.receivablesPct)}%)
                </span>
              </div>
            </div>
          }
          tooltip={isAr 
            ? 'الكاش الجاهز: ده كل قرش حقيقي دخل جيب الشركة لحد دلوقتي (مقدمات كاش + أقساط ادفعت + سندات قبض نقدية). بيزيد بالتحصيل وبيقل بالصرف على المشاريع والمقاولين.'
            : 'Available Cash: Total liquid funds collected to date across cash safe and commercial bank accounts.'}
        />

        {/* Right Stack: 3 Compact Telemetry Instruments with Visual Progress Meters */}
        <div className={styles.telemetryStack}>
          <ZFKpiCard
            variant="compact"
            title={isAr ? 'أقساط لسه عند العملاء' : 'Customer Receivables'}
            value={D(kpis.accountsReceivable).formatEGP(isAr)}
            icon={<Clock size={16} />}
            accentColor="blue"
            progress={parseFloat(collectionRate) > 100 ? 0 : 100 - parseFloat(collectionRate)}
            progressColor="#1e40af"
            subtitleLabel={isAr ? 'عقود بيع شغالة' : 'Active Contracts'}
            subtitleValue={`${contracts.length} ${isAr ? 'عقد بالمحفظة' : 'deals'}`}
            tooltip={isAr
              ? 'أقساط عند العملاء: كل الفلوس اللي لينا بره في ذمة المشترين (أقساط لسه ميعادها مجاش + متأخرات). بتقل فوراً كل ما العميل يدفع وتتنقل للكاش الجاهز.'
              : 'Customer Receivables: Remaining contractual balance owed by buyers across all active deals.'}
          />

          <ZFKpiCard
            variant="compact"
            title={isAr ? 'المصروف على المباني والتشطيب' : 'WIP Project Assets'}
            value={D(totalWipIncurred).formatEGP(isAr)}
            icon={<Building2 size={16} />}
            accentColor="amber"
            progress={perfMetrics.civilFinishingPct}
            progressColor="#b45309"
            subtitleLabel={isAr ? 'خرسانة وتشطيبات' : 'Civil & Finishing'}
            subtitleValue={`${perfMetrics.civilFinishingPct}% (${perfMetrics.civilPlusFinishing.formatEGP(isAr)})`}
            tooltip={isAr
              ? 'المصروف على المباني (WIP): كل اللي اتصرف على الأرض، الحفر، الخرسانات، تأسيس الكهرباء والسباكة والتشطيب. ده أصل استثماري ملك الشركة مش مصروف ضاع.'
              : 'WIP Project Assets: Total capital expenditure incurred on land, civil works, MEP, and luxury finishing.'}
          />

          <ZFKpiCard
            variant="compact"
            title={isAr ? 'إجمالي مبيعات العقود' : 'Gross Contracted Sales'}
            value={D(totalGrossContractValue).formatEGP(isAr)}
            icon={<TrendingUp size={16} />}
            accentColor="emerald"
            progress={collectionRate}
            progressColor="#047857"
            subtitleLabel={isAr ? 'المتحصل الفعلي' : 'Realized Portion'}
            subtitleValue={`${collectionRate}% (${D(totalCollectedCash).formatEGP(isAr)})`}
            tooltip={isAr
              ? 'إجمالي مبيعات العقود: مجموع فلوس كل العقود اللي اتباعت من أول ما بدأنا، سواء اتحصلت كاش أو لسه أقساط للمستقبل. المعادلة: (الكاش الجاهز + أقساط لسه عند العملاء).'
              : 'Gross Contracted Sales: Total nominal value of all active signed contracts. Formula: Cash Collected + Remaining Receivables.'}
          />
        </div>
      </div>

      {/* SECTION 3 (MAIN COMPONENT 2): EXECUTIVE ANALYTICAL LENS STUDIO (ستوديو التحليلات والتدفقات المالية المتقدمة) */}
      <div className={styles.studioDeckContainer}>
        {/* Studio Header & Tactile Lens Switcher */}
        <div className={styles.studioHeader}>
          <div className={styles.studioTitleBlock}>
            <div className={styles.studioIconBadge}>
              <Compass size={16} />
            </div>
            <div>
              <h3 className={styles.studioTitle}>
                {isAr ? 'حركة الفلوس والأرباح المتوقعة' : 'Executive Financial Analysis Studio'}
              </h3>
            </div>
          </div>

          {/* Segmented Lens Switcher */}
          <div className={styles.lensSegmentedControl}>
            <button 
              type="button"
              onClick={() => setActiveStudioLens('mindmap')} 
              className={activeStudioLens === 'mindmap' ? styles.lensBtnActive : styles.lensBtn}
            >
              <Network size={14} color={activeStudioLens === 'mindmap' ? '#946f23' : '#64748b'} />
              <span>{isAr ? 'خريطة الفلوس (داخلة وخارجة منين)' : 'Capital Flow Mindmap'}</span>
            </button>

            <button 
              type="button"
              onClick={() => setActiveStudioLens('forecast')} 
              className={activeStudioLens === 'forecast' ? styles.lensBtnActive : styles.lensBtn}
            >
              <TrendingUp size={14} color={activeStudioLens === 'forecast' ? '#946f23' : '#64748b'} />
              <span>{isAr ? 'توقعات الكاش (الـ 6 شهور الجاية)' : 'Cash Flow Forecast'}</span>
            </button>

            <button 
              type="button"
              onClick={() => setActiveStudioLens('waterfall')} 
              className={activeStudioLens === 'waterfall' ? styles.lensBtnActive : styles.lensBtn}
            >
              <Layers size={14} color={activeStudioLens === 'waterfall' ? '#946f23' : '#64748b'} />
              <span>{isAr ? 'تقسيمة المصاريف وصافي الأرباح' : 'Cost & Value Waterfall'}</span>
            </button>

          </div>
        </div>

        {/* Dynamic Studio Canvas */}
        <div className={styles.studioCanvas}>
          {activeStudioLens === 'mindmap' && (
            <div style={{ width: '100%' }}>
              <CapitalFlowMindmap
                isAr={isAr}
                embeddedInStudio={true}
                kpis={kpis}
                totalGrossContractValue={totalGrossContractValue}
                totalCollectedCash={totalCollectedCash}
                totalWipIncurred={totalWipIncurred}
                totalSafePDCs={totalSafePDCs}
                totalInjectedCapital={totalInjectedCapital}
                wipAccounts={wipAccounts}
                taxRecords={taxRecords}
                partnerCalls={partnerCalls}
              />
            </div>
          )}

          {activeStudioLens === 'forecast' && (
            <div style={{ width: '100%' }}>
              <CashFlowForecastChart
                contracts={contracts}
                schedules={schedules}
                pdcRecords={pdcRecords}
                currentCashBalance={parseFloat(kpis.cashBank || '0')}
                isAr={isAr}
                embeddedInStudio={true}
                onInspectContract={onInspectContract}
                onNavigateToMonth={(monthKey) => {
                  if (onNavigateTab) {
                    onNavigateTab('operations', { month: monthKey });
                  }
                }}
              />
            </div>
          )}

          {activeStudioLens === 'waterfall' && (
            <div style={{ width: '100%' }}>
              <RealEstateValueWaterfall 
                isAr={isAr}
                embeddedInStudio={true}
                kpis={kpis}
                totalGrossContractValue={totalGrossContractValue}
                totalCollectedCash={totalCollectedCash}
                totalWipIncurred={totalWipIncurred}
                totalSafePDCs={totalSafePDCs}
                totalInjectedCapital={totalInjectedCapital}
                wipAccounts={wipAccounts}
                taxRecords={taxRecords}
                partnerCalls={partnerCalls}
              />
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: EXECUTIVE BUSINESS-WIDE PERFORMANCE MATRIX (مصفوفة مؤشرات الأداء الشاملة للأعمال) */}
      <div style={{
        marginTop: '2.5rem',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.5rem 1.65rem',
        boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.05)'
      }}>
        {/* Section Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(148, 111, 35, 0.1)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Activity size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {isAr ? 'مصفوفة مؤشرات الأداء الشاملة للأعمال' : 'Executive Business-Wide Performance Matrix'}
              </h3>
              <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                {isAr 
                  ? 'تحليل استراتيجي متكامل يربط بين كفاءة الإنشاءات، سرعة التدفقات النقدية، وهوامش الربحية المحققة' 
                  : 'Holistic strategic telemetry linking construction efficiency, cash runway, and margins'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#047857',
              background: 'rgba(4, 120, 87, 0.08)',
              border: '1px solid rgba(4, 120, 87, 0.22)',
              padding: '0.25rem 0.65rem',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <Sparkles size={12} />
              <span>{isAr ? 'مؤشرات استراتيجية حية' : 'Live Strategic Ratios'}</span>
            </span>
          </div>
        </div>

        {/* 3 Strategic Pillars Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
          gap: '1.25rem'
        }}>
          {/* Pillar 1: Projects & Capital Absorption */}
          <div style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
            border: '1.5px solid #e2e8f0',
            borderTop: '4px solid #1e40af',
            borderRadius: '14px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(30, 64, 175, 0.1)', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={16} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                    {isAr ? 'قطاع المشروعات والإنشاءات' : 'Construction & Projects'}
                  </h4>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    {isAr ? 'امتصاص السيولة في المباني' : 'Capital absorption in WIP'}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#1e40af', background: 'rgba(30, 64, 175, 0.08)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                {isAr ? 'حساب 150000' : 'GL 150000'}
              </span>
            </div>

            {/* Hero Figure */}
            <div style={{ padding: '0.75rem', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>
                {isAr ? 'إجمالي المنفذ كرأسمال مباني (WIP):' : 'Total Capital Incurred:'}
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e40af', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
                {perfMetrics.wipTotal.formatEGP(isAr)}
              </div>
            </div>

            {/* Sub-metrics breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>{isAr ? 'خرسانات وهيكل مباني:' : 'Civil & Concrete:'}</span>
                <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{D(wipAccounts.civil).formatEGP(isAr)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>{isAr ? 'تشطيبات وواجهات معمارية:' : 'Finishing & Facades:'}</span>
                <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{D(wipAccounts.finishing).formatEGP(isAr)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>{isAr ? 'تأسيس شبكات ومرافق (MEP):' : 'MEP Infrastructure:'}</span>
                <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{D(wipAccounts.mep).formatEGP(isAr)}</strong>
              </div>
            </div>

            {/* Progress Meter */}
            <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', marginBottom: '0.35rem' }}>
                <span>{isAr ? 'نسبة الخرسانات والتشطيبات:' : 'Civil/Finish Ratio:'}</span>
                <strong style={{ color: '#1e40af' }}>{perfMetrics.civilFinishingPct}%</strong>
              </div>
              <div style={{ height: '5px', width: '100%', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${perfMetrics.civilFinishingPct}%`, background: '#1e40af', borderRadius: '3px' }} />
              </div>
            </div>

            {/* Direct CTA */}
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('properties')}
                style={{
                  width: '100%',
                  padding: '0.45rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#1e40af',
                  background: 'rgba(30, 64, 175, 0.05)',
                  border: '1px solid rgba(30, 64, 175, 0.2)',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(30, 64, 175, 0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(30, 64, 175, 0.05)'}
              >
                <span>{isAr ? 'معاينة المشاريع وتكلفة الشقق' : 'Inspect Portfolio & WIP'}</span>
                <span>↳</span>
              </button>
            )}
          </div>

          {/* Pillar 2: Liquidity Health & Cash Runway */}
          <div style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)',
            border: '1.5px solid #e2e8f0',
            borderTop: '4px solid #047857',
            borderRadius: '14px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(4, 120, 87, 0.1)', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={16} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                    {isAr ? 'قطاع السيولة والتدفقات النقدية' : 'Liquidity & Cash Flow'}
                  </h4>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    {isAr ? 'مدرج الأمان المالي وتغطية الصرف' : 'Cash runway & coverage'}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#047857', background: 'rgba(4, 120, 87, 0.08)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                {isAr ? 'فائض تشغيلي' : 'Cash Runway'}
              </span>
            </div>

            {/* Hero Figure */}
            <div style={{ padding: '0.75rem', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>
                {isAr ? 'صافي الفائض التشغيلي (المتحصل - المنصرف):' : 'Net Operating Cash Surplus:'}
              </span>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: 900,
                color: perfMetrics.netOperatingSurplus.isNegative() ? '#c2410c' : '#047857',
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                marginTop: '0.15rem'
              }}>
                {perfMetrics.netOperatingSurplus.isNegative() ? '-' : '+'}
                {perfMetrics.netOperatingSurplus.abs().formatEGP(isAr)}
              </div>
            </div>

            {/* Sub-metrics breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>{isAr ? 'إجمالي المتحصل نقدياً وبنك:' : 'Collected Cash:'}</span>
                <strong style={{ color: '#047857', fontVariantNumeric: 'tabular-nums' }}>{D(totalCollectedCash).formatEGP(isAr)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>{isAr ? 'نسبة تغطية السيولة للتكاليف:' : 'Liquidity Coverage Ratio:'}</span>
                <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{perfMetrics.liquidityCoverageRatio}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>{isAr ? 'أقساط مجدولة قيد التحصيل:' : 'Scheduled Receivables:'}</span>
                <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{D(totalSafePDCs).formatEGP(isAr)}</strong>
              </div>
            </div>

            {/* Progress Meter */}
            <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', marginBottom: '0.35rem' }}>
                <span>{isAr ? 'تغطية المتحصل لمنصرف المشاريع:' : 'Inflow-to-WIP Coverage:'}</span>
                <strong style={{ color: '#047857' }}>{perfMetrics.liquidityCoverageRatio}%</strong>
              </div>
              <div style={{ height: '5px', width: '100%', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, parseFloat(perfMetrics.liquidityCoverageRatio))}%`, background: '#047857', borderRadius: '3px' }} />
              </div>
            </div>

            {/* Direct CTA */}
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('operations')}
                style={{
                  width: '100%',
                  padding: '0.45rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#047857',
                  background: 'rgba(4, 120, 87, 0.05)',
                  border: '1px solid rgba(4, 120, 87, 0.2)',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(4, 120, 87, 0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(4, 120, 87, 0.05)'}
              >
                <span>{isAr ? 'إدارة حركة الخزنة والتحصيل' : 'Manage Treasury & Inflows'}</span>
                <span>↳</span>
              </button>
            )}
          </div>

          {/* Pillar 3: Profitability & Portfolio Margins */}
          <div style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #fefdfa 100%)',
            border: '1.5px solid #e2e8f0',
            borderTop: '4px solid #946f23',
            borderRadius: '14px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(148, 111, 35, 0.1)', color: '#946f23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                    {isAr ? 'قطاع الربحية والعوائد' : 'Profitability & Returns'}
                  </h4>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    {isAr ? 'العائد على التكلفة وهامش الربح' : 'Margin & Return on Cost'}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#946f23', background: 'rgba(148, 111, 35, 0.08)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                {isAr ? 'هامش تعاقدي' : 'Gross Spread'}
              </span>
            </div>

            {/* Hero Figure */}
            <div style={{ padding: '0.75rem', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>
                {isAr ? 'إجمالي هامش الربح المتوقع للمحفظة:' : 'Expected Gross Margin:'}
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#946f23', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
                {perfMetrics.expectedGrossProfit.formatEGP(isAr)}
              </div>
            </div>

            {/* Sub-metrics breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>{isAr ? 'نسبة هامش الربح الإجمالي:' : 'Gross Margin Ratio:'}</span>
                <strong style={{ color: '#047857', fontVariantNumeric: 'tabular-nums' }}>{perfMetrics.grossMarginPct}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>{isAr ? 'متوسط قيمة بيع الشقة:' : 'Average Deal Size:'}</span>
                <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{perfMetrics.avgDealSize.formatEGP(isAr)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>{isAr ? 'عدد العقود بالمحفظة:' : 'Active Signed Deals:'}</span>
                <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{contracts.length} {isAr ? 'عقود بيع' : 'deals'}</strong>
              </div>
            </div>

            {/* Progress Meter */}
            <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', marginBottom: '0.35rem' }}>
                <span>{isAr ? 'هامش الربح التعاقدي للمبيعات:' : 'Contractual Gross Margin:'}</span>
                <strong style={{ color: '#946f23' }}>{perfMetrics.grossMarginPct}%</strong>
              </div>
              <div style={{ height: '5px', width: '100%', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, parseFloat(perfMetrics.grossMarginPct))}%`, background: '#946f23', borderRadius: '3px' }} />
              </div>
            </div>

            {/* Direct CTA */}
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('contracts')}
                style={{
                  width: '100%',
                  padding: '0.45rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#946f23',
                  background: 'rgba(148, 111, 35, 0.05)',
                  border: '1px solid rgba(148, 111, 35, 0.2)',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(148, 111, 35, 0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(148, 111, 35, 0.05)'}
              >
                <span>{isAr ? 'سجل عقود البيع والأقساط' : 'Inspect Contracts & Sales'}</span>
                <span>↳</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

