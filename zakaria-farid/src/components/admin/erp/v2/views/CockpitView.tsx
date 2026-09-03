'use client';

import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  Building2, 
  FileText, 
  Plus, 
  Calendar, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Landmark,
  ShieldCheck,
  CreditCard
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
  onOpenQuickTransaction: () => void;
  onInspectContract: (contract: ERPContract) => void;
  onInspectCheque: (cheque: ERPPDCRecord) => void;
  onCollectItem: (item: ERPPDCRecord) => void;
  onOpenNewCheque: () => void;
  onOpenNewContract: () => void;
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
      .slice(0, 6);
  }, [pdcRecords]);

  // 3. Recent Verified Journal Entries (last 5)
  const recentEntries = useMemo(() => {
    return [...journalEntries]
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 5);
  }, [journalEntries]);

  return (
    <div className={styles.stageContainer}>
      {/* SECTION 1: STAGE HEADER & QUICK ACTIONS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {isAr ? 'لوحة القيادة والتحكم المالي' : 'Executive Financial Cockpit'}
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
              {isAr ? 'الموقف المالي التنفيذي' : 'Executive Position'}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
            {isAr 
              ? 'مراقبة حية للسيولة، أوراق القبض، الأصول تحت التنفيذ، والتدفقات الرأسمالية'
              : 'Real-time liquidity, receivables, construction WIP, and capital flow'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className={styles.btnPrimary} 
            onClick={onOpenQuickTransaction}
          >
            <Plus size={14} />
            <span>{isAr ? 'قيد مصروف / حركة سريعة' : 'Record Expense'}</span>
          </button>

          <button 
            type="button" 
            className={styles.btnSecondary} 
            onClick={onOpenNewCheque}
          >
            <Wallet size={14} color="#946f23" />
            <span>{isAr ? 'إيداع شيك جديد' : 'New Cheque'}</span>
          </button>

          <button 
            type="button" 
            className={styles.btnSecondary} 
            onClick={onOpenNewContract}
          >
            <FileText size={14} color="#946f23" />
            <span>{isAr ? 'إنشاء عقد بيع' : 'New Contract'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: THE 4 CALM EXECUTIVE FINANCIAL CARDS (Apple / Mercury Elegance) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {/* Card 1: Available Liquidity */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--zf2-text-muted, #64748b)' }}>
              {isAr ? 'السيولة النقدية المتاحة' : 'Available Liquidity'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#15803d', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.25rem 0' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--zf2-text-primary, #0f172a)', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {D(kpis.cashBank).formatEGP(isAr)}
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--zf2-text-muted, #64748b)', borderTop: '1px solid var(--zf2-border-subtle, #f1f5f9)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'شيكات في الخزينة' : 'In-Safe Cheques'}</span>
            <strong style={{ color: 'var(--zf2-text-primary, #0f172a)', fontVariantNumeric: 'tabular-nums' }}>{D(totalSafePDCs).formatEGP(isAr)}</strong>
          </div>
        </div>

        {/* Card 2: Accounts Receivable */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--zf2-text-muted, #64748b)' }}>
              {isAr ? 'مستحقات وأقساط العملاء' : 'Customer Receivables'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.25rem 0' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--zf2-text-primary, #0f172a)', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {D(kpis.accountsReceivable).formatEGP(isAr)}
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--zf2-text-muted, #64748b)', borderTop: '1px solid var(--zf2-border-subtle, #f1f5f9)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'عقود بيع جارية' : 'Active Contracts'}</span>
            <strong style={{ color: 'var(--zf2-text-primary, #0f172a)', fontVariantNumeric: 'tabular-nums' }}>{contracts.length} {isAr ? 'عقد' : 'deals'}</strong>
          </div>
        </div>

        {/* Card 3: Construction Assets (WIP) */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--zf2-text-muted, #64748b)' }}>
              {isAr ? 'أصول ومشاريع تحت التنفيذ' : 'WIP Project Assets'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#946f23', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.25rem 0' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--zf2-text-primary, #0f172a)', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {D(totalWipIncurred).formatEGP(isAr)}
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--zf2-text-muted, #64748b)', borderTop: '1px solid var(--zf2-border-subtle, #f1f5f9)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'الخرسانات والتشطيب' : 'Civil & Finishing'}</span>
            <strong style={{ color: 'var(--zf2-text-primary, #0f172a)', fontVariantNumeric: 'tabular-nums' }}>
              {D(wipAccounts.civil).plus(wipAccounts.finishing).formatEGP(isAr)}
            </strong>
          </div>
        </div>

        {/* Card 4: Contracted Sales & Pipeline — Premier Gold Accent */}
        <div className={styles.card} style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #fefdfa 100%)',
          border: '1px solid rgba(184, 144, 62, 0.35)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 4px 16px -4px rgba(184, 144, 62, 0.12)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#946f23' }}>
              {isAr ? 'إجمالي المبيعات التعاقدية' : 'Contracted Sales Deals'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#946f23', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.25rem 0' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {D(totalGrossContractValue).formatEGP(isAr)}
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', borderTop: '1px solid rgba(184, 144, 62, 0.18)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'نسبة التحصيل الفعلي' : 'Collection Rate'}</span>
            <strong style={{ color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>{collectionRate}%</strong>
          </div>
        </div>
      </div>

      {/* SECTION 3: THE BELOVED CAPITAL FLOW MINDMAP (خريطة التدفقات المالية وتوزيعات رأس المال) */}
      <div style={{ width: '100%' }}>
        <CapitalFlowMindmap
          isAr={isAr}
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

      {/* SECTION 3.4: REAL ESTATE CAPITAL & MARGIN WATERFALL MATRIX (خريطة شلال القيمة) */}
      <div style={{ width: '100%' }}>
        <RealEstateValueWaterfall 
          isAr={isAr}
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

      {/* SECTION 3.75: CASH FLOW FORECAST & 6-MONTH INFLOW TIMELINE */}
      <div style={{ width: '100%' }}>
        <CashFlowForecastChart
          contracts={contracts}
          schedules={schedules}
          pdcRecords={pdcRecords}
          currentCashBalance={parseFloat(kpis.cashBank || '0')}
          isAr={isAr}
          onInspectContract={onInspectContract}
        />
      </div>

      {/* SECTION 4: OPERATIONAL SPLIT (URGENT DUES & RECENT VERIFIED LEDGER ENTRIES) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
        {/* Column A: Urgent Dues & Hand Collections */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                <Clock size={16} color="#f59e0b" />
                <span>{isAr ? 'التحصيلات والالتزامات العاجلة (خلال 7 أيام)' : 'Urgent Collections & Dues'}</span>
              </h3>
              <p className={styles.cardSubtitle}>
                {isAr ? 'شيكات وأقساط باليد مستحقة الصرف والإيداع الفوري' : 'Cheques and installments due for collection'}
              </p>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '6px', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
              {urgentCollections.length} {isAr ? 'بنود' : 'items'}
            </span>
          </div>

          {urgentCollections.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
              <CheckCircle2 size={24} color="#10b981" style={{ margin: '0 auto 0.5rem auto', opacity: 0.8 }} />
              <div>{isAr ? 'المحفظة منتظمة بالكامل — لا توجد أقساط متأخرة أو شيكات مستحقة حالياً' : 'Portfolio is clean — No pending dues in the next 7 days'}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {urgentCollections.map((item) => {
                const linkedContract = contracts.find(c => c.contract_id === item.contract_id);
                return (
                  <div 
                    key={item.cheque_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 0.95rem',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      gap: '0.75rem',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                          {item.drawer_name || linkedContract?.buyer_name || (isAr ? 'عميل' : 'Client')}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                          {item.cheque_number ? `#${item.cheque_number}` : (linkedContract?.contract_number || '')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Calendar size={11} />
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{item.due_date}</span>
                        <span>•</span>
                        <span>{item.bank_name || (isAr ? 'خزينة الشركة' : 'Treasury')}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
                      <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
                          {D(item.nominal_value).formatEGP(isAr)}
                        </div>
                        <StatusBadge domain="cheque" status={item.status} isAr={isAr} />
                      </div>

                      <button
                        type="button"
                        onClick={() => onCollectItem(item)}
                        style={{
                          background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
                          color: '#ffffff',
                          padding: '0.38rem 0.85rem',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(148, 111, 35, 0.2)'
                        }}
                      >
                        {isAr ? 'تحصيل' : 'Collect'}
                      </button>
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
                <span>{isAr ? 'آخر القيود المحاسبية المقيدة' : 'Recent Verified Journal Entries'}</span>
              </h3>
              <p className={styles.cardSubtitle}>
                {isAr ? 'تأكيد التوازن المالي المزدوج للقيود المرحلة بالدفاتر' : 'Verified double-entry transactions posted to GL'}
              </p>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#15803d', background: '#f0fdf4', border: '1px solid rgba(22, 163, 74, 0.25)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
              {isAr ? 'قيد متوازن' : 'Balanced'}
            </span>
          </div>

          {recentEntries.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
              <div>{isAr ? 'لا توجد قيود مسجلة حتى الآن' : 'No journal entries recorded yet'}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentEntries.map((entry) => {
                const totalDebit = (entry.lines || []).reduce((sum, l) => sum.plus(l.debit_amount || '0'), D(0));

                return (
                  <div 
                    key={entry.entry_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 0.95rem',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      gap: '0.75rem',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
                          {entry.entry_number}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                          {entry.entry_date}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {localizeJournalDescription(entry.description, isAr)}
                      </div>
                    </div>

                    <div style={{ textAlign: isAr ? 'left' : 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {totalDebit.formatEGP(isAr)}
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#15803d', fontWeight: 700 }}>
                        {isAr ? 'مرحل ومحمي' : 'Immutable'}
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
