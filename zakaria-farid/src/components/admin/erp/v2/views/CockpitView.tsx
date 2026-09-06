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
  Compass
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
  onOpenNewContract
}) => {
  // Executive Analytical Lens Switcher State ('mindmap' | 'forecast' | 'waterfall')
  const [activeStudioLens, setActiveStudioLens] = useState<'mindmap' | 'forecast' | 'waterfall'>('mindmap');

  // 1. Calculate collection progress percentage
  const collectionRate = useMemo(() => {
    const gross = D(totalGrossContractValue);
    if (gross.isZero()) return '0';
    return D(totalCollectedCash).div(gross).times(100).toFixed(1);
  }, [totalGrossContractValue, totalCollectedCash]);

  // 2. Upcoming / Overdue Actionable Dues (next 7 days or overdue)
  const urgentCollections = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const next7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    return pdcRecords
      .filter(p => p.status !== 'Cleared' && p.status !== 'Void')
      .filter(p => p.due_date <= next7Days)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 12);
  }, [pdcRecords]);

  // 3. Recent Verified Journal Entries (last 15 for scrollable inspection)
  const recentEntries = useMemo(() => {
    return [...journalEntries]
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 15);
  }, [journalEntries]);

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

      {/* SECTION 2: ASYMMETRIC FINANCIAL BENTO (Executive Command Archetype) */}
      <div className={styles.asymmetricBentoGrid}>
        {/* Left / Hero Card (Flagship Liquidity & Financial Command) */}
        <ZFKpiCard
          variant="double-bezel"
          isFlagship={true}
          title={isAr ? 'الكاش الجاهز (البنك والخزنة)' : 'Available Liquidity & Financial Command'}
          value={D(kpis.cashBank).formatEGP(isAr)}
          icon={<Wallet size={20} />}
          accentColor="gold"
          progress={collectionRate}
          progressColor="#b8903e"
          badge={{ text: isAr ? 'كاش جاهز للاستخدام' : 'Ready & In-Safe', variant: 'gold' }}
          subtitleLabel={isAr ? 'نسبة اللي حَصّلناه من المبيعات' : 'Collected Sales Ratio'}
          subtitleValue={`${collectionRate}% (${D(totalCollectedCash).formatEGP(isAr)})`}
          tooltip={isAr 
            ? 'الكاش الجاهز: ده كل قرش حقيقي دخل جيب الشركة لحد دلوقتي (مقدمات كاش + أقساط ادفعت + سندات قبض نقدية). بيزيد بالتحصيل وبيقل بالصرف على المشاريع والمقاولين.'
            : 'Available Cash: Total liquid funds collected to date across cash safe and commercial bank accounts.'}
        />

        {/* Right Stack: 3 Compact Telemetry Instruments */}
        <div className={styles.telemetryStack}>
          <ZFKpiCard
            variant="compact"
            title={isAr ? 'أقساط لسه عند العملاء' : 'Customer Receivables'}
            value={D(kpis.accountsReceivable).formatEGP(isAr)}
            icon={<Clock size={16} />}
            accentColor="amber"
            subtitleLabel={isAr ? 'عقود بيع شغالة' : 'Active Contracts'}
            subtitleValue={`${contracts.length} ${isAr ? 'عقد' : 'deals'}`}
            tooltip={isAr
              ? 'أقساط عند العملاء: كل الفلوس اللي لينا بره في ذمة المشترين (أقساط لسه ميعادها مجاش + متأخرات). بتقل فوراً كل ما العميل يدفع وتتنقل للكاش الجاهز.'
              : 'Customer Receivables: Remaining contractual balance owed by buyers across all active deals.'}
          />

          <ZFKpiCard
            variant="compact"
            title={isAr ? 'المصروف على المباني والتشطيب' : 'WIP Project Assets'}
            value={D(totalWipIncurred).formatEGP(isAr)}
            icon={<Building2 size={16} />}
            accentColor="slate"
            subtitleLabel={isAr ? 'خرسانة وتشطيبات' : 'Civil & Finishing'}
            subtitleValue={D(wipAccounts.civil).plus(wipAccounts.finishing).formatEGP(isAr)}
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
            subtitleLabel={isAr ? 'أقساط لسه عند العملاء' : 'Remaining Receivables'}
            subtitleValue={D(kpis.accountsReceivable).formatEGP(isAr)}
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

      {/* SECTION 4: OPERATIONAL SPLIT (URGENT DUES & RECENT VERIFIED LEDGER ENTRIES - SCROLLABLE & COMPACT) */}
      <div className={styles.splitGrid} style={{ marginBottom: '3.5rem' }}>
        {/* Column A: Urgent Dues & Hand Collections */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                <Clock size={16} color="#f59e0b" />
                <span>{isAr ? 'أقساط ميعادها جه للتحصيل (خلال أسبوع)' : 'Urgent Collections & Dues'}</span>
              </h3>
              <p className={styles.cardSubtitle}>
                {isAr ? 'أقساط تعاقدية مستحقة للتحصيل نقداً باليد أو تحويل' : 'Installments due for collection'}
              </p>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '6px', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
              {urgentCollections.length} {isAr ? 'بنود' : 'items'}
            </span>
          </div>

          {urgentCollections.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
              <CheckCircle2 size={24} color="#10b981" style={{ margin: '0 auto 0.5rem auto', opacity: 0.8 }} />
              <div>{isAr ? 'كله تمام ومفيش أقساط مستحقة خلال الأسبوع ده' : 'Portfolio is clean — No pending dues in the next 7 days'}</div>
            </div>
          ) : (
            <div className={styles.cockpitScrollableList}>
              {urgentCollections.map((item) => {
                const linkedContract = contracts.find(c => c.contract_id === item.contract_id);
                return (
                  <div 
                    key={item.cheque_id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                      padding: '0.85rem 1.05rem',
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '12px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Top Tier: Buyer / Drawer Name & Nominal Value */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div 
                          dir="auto"
                          style={{
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            unicodeBidi: 'plaintext'
                          }}
                        >
                          {item.drawer_name || linkedContract?.buyer_name || (isAr ? 'عميل مسجل' : 'Client')}
                        </div>
                        <div style={{
                          fontSize: '0.7rem',
                          color: '#64748b',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 600,
                          marginTop: '0.15rem'
                        }}>
                          {item.cheque_number ? `#${item.cheque_number}` : (linkedContract?.contract_number || (isAr ? 'سند استحقاق' : 'Voucher'))}
                        </div>
                      </div>

                      <div style={{ textAlign: isAr ? 'left' : 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: '1.02rem',
                          fontWeight: 900,
                          color: '#946f23',
                          fontVariantNumeric: 'tabular-nums',
                          letterSpacing: '-0.02em',
                          whiteSpace: 'nowrap'
                        }}>
                          {D(item.nominal_value).formatEGP(isAr)}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Tier: Context Details & Action CTA */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid #e2e8f0',
                      gap: '0.65rem',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{
                        fontSize: '0.72rem',
                        color: '#64748b',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        flexWrap: 'nowrap',
                        whiteSpace: 'nowrap'
                      }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={12} color="#94a3b8" />
                          <span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, unicodeBidi: 'isolate' }}>
                            {item.due_date}
                          </span>
                        </span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ fontWeight: 500, color: '#475569' }}>
                          {item.bank_name || (isAr ? 'خزنة الشركة' : 'Treasury')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginInlineStart: 'auto' }}>
                        <StatusBadge domain="cheque" status={item.status} isAr={isAr} />

                        <button
                          type="button"
                          onClick={() => onCollectItem(item)}
                          style={{
                            background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
                            color: '#ffffff',
                            padding: '0.32rem 0.8rem',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(148, 111, 35, 0.2)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.08)'}
                          onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                        >
                          <Receipt size={12} />
                          <span>{isAr ? 'تحصيل' : 'Collect'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Column B: Recent Verified Ledger Entries */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                <ShieldCheck size={16} color="#15803d" />
                <span>{isAr ? 'آخر الحركات المتسجلة في الحسابات' : 'Recent Verified Journal Entries'}</span>
              </h3>
              <p className={styles.cardSubtitle}>
                {isAr ? 'كل الحركات متسجلة ومضبوطة بالدفاتر' : 'Verified double-entry transactions posted to GL'}
              </p>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#15803d', background: '#f0fdf4', border: '1px solid rgba(22, 163, 74, 0.25)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
              {isAr ? 'حسابات مضبوطة' : 'Balanced'}
            </span>
          </div>

          {recentEntries.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
              <div>{isAr ? 'مفيش حركات متسجلة لسه' : 'No journal entries recorded yet'}</div>
            </div>
          ) : (
            <div className={styles.cockpitScrollableList}>
              {recentEntries.map((entry) => {
                const totalDebit = (entry.lines || []).reduce((sum, l) => sum.plus(l.debit_amount || '0'), D(0));

                return (
                  <div 
                    key={entry.entry_id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.55rem',
                      padding: '0.85rem 1.05rem',
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '12px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Top Tier: Description & Debit Amount */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {localizeJournalDescription(entry.description, isAr)}
                        </div>
                        <div style={{
                          fontSize: '0.7rem',
                          color: '#946f23',
                          fontWeight: 800,
                          fontVariantNumeric: 'tabular-nums',
                          marginTop: '0.15rem'
                        }}>
                          {entry.entry_number}
                        </div>
                      </div>

                      <div style={{ textAlign: isAr ? 'left' : 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: '0.98rem',
                          fontWeight: 900,
                          color: '#0f172a',
                          fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap'
                        }}>
                          {totalDebit.formatEGP(isAr)}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Tier: Date & Immutable Status */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '0.45rem',
                      borderTop: '1px solid #e2e8f0',
                      fontSize: '0.7rem',
                      gap: '0.5rem'
                    }}>
                      <span dir="ltr" style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums', fontWeight: 600, unicodeBidi: 'isolate' }}>
                        {entry.entry_date}
                      </span>
                      <span style={{
                        fontSize: '0.66rem',
                        color: '#15803d',
                        background: '#f0fdf4',
                        border: '1px solid rgba(22, 163, 74, 0.25)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <ShieldCheck size={11} />
                        <span>{isAr ? 'متسجل ومعتمد' : 'Immutable'}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
