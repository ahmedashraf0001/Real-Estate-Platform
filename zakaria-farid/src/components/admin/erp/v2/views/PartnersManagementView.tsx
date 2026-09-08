'use client';

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Coins, 
  Receipt, 
  Wallet, 
  Landmark, 
  Building2, 
  ShieldCheck, 
  Plus, 
  Phone, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Filter,
  Eye,
  Crown
} from 'lucide-react';
import { 
  ERPPartnerProfile, 
  ERPPartnerTransaction, 
  ERPPartnerCall, 
  ERPContract 
} from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { 
  PartnersEngine, 
  PartnerFinancialSummary, 
  ProjectPartnershipCardData,
  INITIAL_PARTNER_PROFILES,
  INITIAL_PARTNER_TRANSACTIONS
} from '@/lib/erp/partnersEngine';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { ZFKpiCard } from '../ZFKpiCard';
import { ZFFilterToolbar, ZFFilterTab, ZFFilterDropdown, ZFSortOption } from '../ZFFilterToolbar';
import { ZFPagination } from '../ZFPagination';
import styles from '../ZFWorkstationShell.module.css';

export interface PartnersManagementViewProps {
  partnerProfiles?: ERPPartnerProfile[];
  partnerTransactions?: ERPPartnerTransaction[];
  properties?: Property[];
  contracts?: ERPContract[];
  partnerCalls?: ERPPartnerCall[];
  isAr?: boolean;
  isMutating?: boolean;
  onOpenNewPartnerModal?: () => void;
  onOpenPayout: (initialPartnerName?: string) => void;
  onOpenInjection: (initialPartnerName?: string) => void;
  onOpenDossier: (partner: PartnerFinancialSummary) => void;
}

export const PartnersManagementView: React.FC<PartnersManagementViewProps> = ({
  partnerProfiles = INITIAL_PARTNER_PROFILES,
  partnerTransactions = INITIAL_PARTNER_TRANSACTIONS,
  properties = [],
  contracts = [],
  partnerCalls = [],
  isAr = true,
  isMutating = false,
  onOpenNewPartnerModal,
  onOpenPayout,
  onOpenInjection,
  onOpenDossier
}) => {
  // Master Workstation Tab Mode:
  // 1: directory (دليل الشركاء والأرصدة)
  // 2: projects (مشاريع الشراكة وحصص العماير)
  // 3: transactions (سجل الحركات وتوزيعات الأرباح)
  const [activeTab, setActiveTab] = useState<'directory' | 'projects' | 'transactions'>('directory');

  // --------------------------------------------------------------------------
  // TAB 1: DIRECTORY & BALANCES STATE
  // --------------------------------------------------------------------------
  const [directorySearchQuery, setDirectorySearchQuery] = useState<string>('');
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState<string>('all');
  const [directorySortBy, setDirectorySortBy] = useState<string>('balance_desc');
  const [directoryViewMode, setDirectoryViewMode] = useState<'cards' | 'table'>('cards');

  // --------------------------------------------------------------------------
  // TAB 2: PROJECTS & EQUITY SPLITS STATE
  // --------------------------------------------------------------------------
  const [projectsSearchQuery, setProjectsSearchQuery] = useState<string>('');
  const [projectsPropertyFilter, setProjectsPropertyFilter] = useState<string>('all');

  // --------------------------------------------------------------------------
  // TAB 3: TRANSACTIONS & DIVIDENDS REGISTER STATE
  // --------------------------------------------------------------------------
  const [txSearchQuery, setTxSearchQuery] = useState<string>('');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all');
  const [txPaymentMethodFilter, setTxPaymentMethodFilter] = useState<string>('all');
  const [txPartnerFilter, setTxPartnerFilter] = useState<string>('all');
  const [txSortBy, setTxSortBy] = useState<string>('date_desc');
  const [txCurrentPage, setTxCurrentPage] = useState<number>(1);
  const [txPageSize, setTxPageSize] = useState<number>(10);

  // --------------------------------------------------------------------------
  // COMPUTATIONS VIA PARTNERS ENGINE
  // --------------------------------------------------------------------------
  const partnerSummaries = useMemo(() => {
    return PartnersEngine.calculatePartnerSummaries(
      partnerProfiles,
      properties,
      contracts,
      partnerTransactions,
      partnerCalls
    );
  }, [partnerProfiles, properties, contracts, partnerTransactions, partnerCalls]);

  const projectPartnershipCards = useMemo(() => {
    return PartnersEngine.getProjectPartnershipCards(
      properties,
      contracts,
      partnerTransactions
    );
  }, [properties, contracts, partnerTransactions]);

  // Executive Top KPI Aggregations
  const kpis = useMemo(() => {
    const totalCapital = partnerSummaries.reduce((sum, s) => sum.plus(s.totalContributedCapital), D(0));
    const totalPayouts = partnerSummaries.reduce((sum, s) => sum.plus(s.totalDistributionsPaid), D(0));
    const totalNetDue = partnerSummaries.reduce((sum, s) => sum.plus(s.netCurrentBalance), D(0));
    const activeCount = partnerSummaries.length;

    return {
      totalCapital: totalCapital.toFixed(2),
      totalPayouts: totalPayouts.toFixed(2),
      totalNetDue: totalNetDue.toFixed(2),
      activeCount
    };
  }, [partnerSummaries]);

  // --------------------------------------------------------------------------
  // TAB 1 FILTERING & SORTING
  // --------------------------------------------------------------------------
  const filteredSummaries = useMemo(() => {
    let list = [...partnerSummaries];

    if (directorySearchQuery.trim()) {
      const q = directorySearchQuery.toLowerCase();
      list = list.filter(p => 
        p.partnerName.toLowerCase().includes(q) ||
        p.roleTitleAr.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        p.holdings.some(h => h.propertyTitle.toLowerCase().includes(q))
      );
    }

    if (directoryRoleFilter !== 'all') {
      const profileMap = new Map(partnerProfiles.map(p => [p.name, p.role]));
      list = list.filter(p => profileMap.get(p.partnerName) === directoryRoleFilter);
    }

    // Sorting
    list.sort((a, b) => {
      switch (directorySortBy) {
        case 'balance_desc':
          return D(b.netCurrentBalance).minus(a.netCurrentBalance).toNumber();
        case 'balance_asc':
          return D(a.netCurrentBalance).minus(b.netCurrentBalance).toNumber();
        case 'capital_desc':
          return D(b.totalContributedCapital).minus(a.totalContributedCapital).toNumber();
        case 'payouts_desc':
          return D(b.totalDistributionsPaid).minus(a.totalDistributionsPaid).toNumber();
        case 'name_asc':
          return a.partnerName.localeCompare(b.partnerName, 'ar');
        default:
          return 0;
      }
    });

    return list;
  }, [partnerSummaries, directorySearchQuery, directoryRoleFilter, directorySortBy, partnerProfiles]);

  // --------------------------------------------------------------------------
  // TAB 2 FILTERING
  // --------------------------------------------------------------------------
  const filteredProjects = useMemo(() => {
    let list = [...projectPartnershipCards];

    if (projectsSearchQuery.trim()) {
      const q = projectsSearchQuery.toLowerCase();
      list = list.filter(p => 
        p.propertyTitle.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.partners.some(part => part.name.toLowerCase().includes(q))
      );
    }

    if (projectsPropertyFilter !== 'all') {
      list = list.filter(p => p.propertyId === projectsPropertyFilter);
    }

    return list;
  }, [projectPartnershipCards, projectsSearchQuery, projectsPropertyFilter]);

  // --------------------------------------------------------------------------
  // TAB 3 FILTERING & PAGINATION
  // --------------------------------------------------------------------------
  const filteredTransactions = useMemo(() => {
    let list = [...partnerTransactions];

    if (txSearchQuery.trim()) {
      const q = txSearchQuery.toLowerCase();
      list = list.filter(t => 
        t.transaction_number.toLowerCase().includes(q) ||
        t.partner_name.toLowerCase().includes(q) ||
        (t.property_title && t.property_title.toLowerCase().includes(q)) ||
        (t.memo && t.memo.toLowerCase().includes(q)) ||
        (t.receipt_ref && t.receipt_ref.toLowerCase().includes(q)) ||
        (t.journal_entry_number && t.journal_entry_number.toLowerCase().includes(q))
      );
    }

    if (txTypeFilter !== 'all') {
      list = list.filter(t => t.type === txTypeFilter);
    }

    if (txPaymentMethodFilter !== 'all') {
      list = list.filter(t => t.payment_method === txPaymentMethodFilter);
    }

    if (txPartnerFilter !== 'all') {
      list = list.filter(t => t.partner_name === txPartnerFilter);
    }

    // Sorting
    list.sort((a, b) => {
      if (txSortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (txSortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (txSortBy === 'amount_desc') return D(b.amount).minus(a.amount).toNumber();
      if (txSortBy === 'amount_asc') return D(a.amount).minus(b.amount).toNumber();
      return 0;
    });

    return list;
  }, [partnerTransactions, txSearchQuery, txTypeFilter, txPaymentMethodFilter, txPartnerFilter, txSortBy]);

  const txTotalPages = Math.ceil(filteredTransactions.length / txPageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (txCurrentPage - 1) * txPageSize;
    return filteredTransactions.slice(start, start + txPageSize);
  }, [filteredTransactions, txCurrentPage, txPageSize]);

  // Palette colors for stacked bar shares
  const PARTNER_COLORS = ['#946f23', '#1d4ed8', '#047857', '#701a75', '#c2410c', '#475569'];

  return (
    <div className={styles.stageContainer}>
      {/* 1. STAGE HEADER & QUICK ACTIONS */}
      <div className={styles.stageHeader}>
        <div className={styles.stageTitleArea}>
          <div className={styles.stageBreadcrumb}>
            <span>FIN-OS</span>
            <span>/</span>
            <span>{isAr ? 'الشركاء وممولو المشاريع' : 'Partners & Project Financiers'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className={styles.stageTitle}>
              {isAr ? 'إدارة الشركاء والممولين وتوزيعات الأرباح' : 'Partners, Project Equity & Profit Distributions'}
            </h1>
            <span style={{
              background: 'rgba(184, 144, 62, 0.08)',
              border: '1px solid rgba(184, 144, 62, 0.25)',
              color: '#946f23',
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {isAr ? 'حساب 301000 - رأس المال' : 'GL 301000 Partner Capital'}
            </span>
            <span style={{
              background: '#f0fdf4',
              border: '1px solid rgba(22, 163, 74, 0.25)',
              color: '#15803d',
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {isAr ? 'حساب 303000 - توزيعات الأرباح' : 'GL 303000 Distributions'}
            </span>
            <span style={{
              background: '#eff6ff',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              color: '#1d4ed8',
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {isAr ? 'ميزان حصص 100% متطابق' : '100% Balanced Splits'}
            </span>
          </div>

          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            {isAr 
              ? 'متابعة مساهمات الشركاء والممولين في عماير الشركة، وتوزيع حصص المبيعات والتحصيلات، وصرف دفعات الأرباح بقيود يومية مزدوجة متزنة بالمليم.'
              : 'Track partner equity contributions across project buildings, sales collection shares, and profit payouts with double-entry journal auditing.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className={styles.stageActions} style={{ display: 'flex', gap: '0.65rem' }}>
          {onOpenNewPartnerModal && (
            <button
              type="button"
              onClick={onOpenNewPartnerModal}
              disabled={isMutating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.1rem',
                borderRadius: '10px',
                background: '#0f172a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.82rem',
                border: '1px solid #1e293b',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)',
                cursor: isMutating ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus size={16} color="#d4af37" />
              <span>{isAr ? '+ تسجيل وتوثيق شريك جديد' : '+ Onboard Partner'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenInjection()}
            disabled={isMutating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.1rem',
              borderRadius: '10px',
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: '0.82rem',
              border: '1px solid #cbd5e1',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              cursor: isMutating ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Coins size={16} color="#946f23" />
            <span>{isAr ? '+ ضخ رأس مال' : '+ Inject Capital'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenPayout()}
            disabled={isMutating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.15rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #d4af37 0%, #b8903e 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.82rem',
              border: 'none',
              boxShadow: '0 2px 10px rgba(184, 144, 62, 0.25)',
              cursor: isMutating ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Receipt size={16} />
            <span>{isAr ? '+ صرف دفعة أرباح' : '+ Pay Profit Dividend'}</span>
          </button>
        </div>
      </div>

      {/* 2. TOP 4 EXECUTIVE KPI CARDS */}
      <div className={styles.asymmetricBentoGrid}>
        {/* Card 1: Contributed Capital (Account 301000) */}
        <ZFKpiCard
          variant="double-bezel"
          isFlagship={true}
          title={isAr ? 'إجمالي رأس المال المودع (المساهمات)' : 'Total Contributed Capital'}
          value={D(kpis.totalCapital).toString()}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<Coins size={20} />}
          accentColor="gold"
          progress={100}
          subtitleLabel={isAr ? 'حساب 301000 - حقوق الملكية' : 'GL 301000 Equity'}
          subtitleValue={isAr ? 'مساهمات بالخزينة والإنستاباي' : 'Cash & InstaPay deposits'}
        />

        {/* Card 2: Cumulative Profit Distributions (Account 303000) */}
        <ZFKpiCard
          variant="standard"
          title={isAr ? 'إجمالي الأرباح المنصرفة للشركاء' : 'Cumulative Profit Distributions'}
          value={D(kpis.totalPayouts).toString()}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<Receipt size={20} />}
          accentColor="emerald"
          subtitleLabel={isAr ? 'حساب 303000 - مسحوبات أرباح' : 'GL 303000 Contra-Equity'}
          subtitleValue={isAr ? 'مسددة بالكامل كاش وإنستاباي' : 'Settled cash & InstaPay'}
        />

        {/* Card 3: Net Current Partner Dues / Balances */}
        <ZFKpiCard
          variant="standard"
          title={isAr ? 'صافي المستحقات الجارية للشركاء' : 'Net Current Partner Balances'}
          value={D(kpis.totalNetDue).toString()}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<Wallet size={20} />}
          accentColor="blue"
          subtitleLabel={isAr ? 'الرصيد المتبقي للصرف' : 'Outstanding Balance'}
          subtitleValue={isAr ? 'نصيب التحصيلات بعد خصم المنصرف' : 'Collections minus payouts'}
        />

        {/* Card 4: Active Partners Count */}
        <ZFKpiCard
          variant="standard"
          title={isAr ? 'عدد الشركاء والممولين النشطين' : 'Active Partners & Financiers'}
          value={kpis.activeCount}
          unitLabel={isAr ? 'شريك وممول' : 'partners'}
          icon={<Users size={20} />}
          accentColor="slate"
          subtitleLabel={isAr ? 'حالة الشراكات' : 'Partnership Status'}
          subtitleValue={isAr ? 'جميع العقود مغطاة ومطابقة 100%' : 'All project splits balanced'}
        />
      </div>

      {/* 3. WORKSTATION TABS SEGMENTED BAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.85rem',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '0.75rem 1.15rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: '#f1f5f9',
          padding: '0.25rem',
          borderRadius: '10px',
          border: '1px solid #e2e8f0'
        }}>
          {/* Tab 1 */}
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            style={{
              padding: '0.45rem 1.15rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'directory' ? '#ffffff' : 'transparent',
              color: activeTab === 'directory' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'directory' ? 800 : 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: activeTab === 'directory' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Users size={15} color={activeTab === 'directory' ? '#946f23' : '#64748b'} />
            <span>{isAr ? 'دليل الشركاء والأرصدة' : 'Partner Directory & Balances'}</span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              background: activeTab === 'directory' ? 'rgba(184, 144, 62, 0.12)' : '#e2e8f0',
              color: activeTab === 'directory' ? '#946f23' : '#64748b'
            }}>
              {partnerSummaries.length}
            </span>
          </button>

          {/* Tab 2 */}
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            style={{
              padding: '0.45rem 1.15rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'projects' ? '#ffffff' : 'transparent',
              color: activeTab === 'projects' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'projects' ? 800 : 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: activeTab === 'projects' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Building2 size={15} color={activeTab === 'projects' ? '#946f23' : '#64748b'} />
            <span>{isAr ? 'مشاريع الشراكة وحصص العماير' : 'Project Equity Splits'}</span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              background: activeTab === 'projects' ? 'rgba(184, 144, 62, 0.12)' : '#e2e8f0',
              color: activeTab === 'projects' ? '#946f23' : '#64748b'
            }}>
              {projectPartnershipCards.length}
            </span>
          </button>

          {/* Tab 3 */}
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            style={{
              padding: '0.45rem 1.15rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'transactions' ? '#ffffff' : 'transparent',
              color: activeTab === 'transactions' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'transactions' ? 800 : 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: activeTab === 'transactions' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Receipt size={15} color={activeTab === 'transactions' ? '#946f23' : '#64748b'} />
            <span>{isAr ? 'سجل الحركات وتوزيعات الأرباح' : 'Transactions & Dividends Log'}</span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              background: activeTab === 'transactions' ? 'rgba(184, 144, 62, 0.12)' : '#e2e8f0',
              color: activeTab === 'transactions' ? '#946f23' : '#64748b'
            }}>
              {partnerTransactions.length}
            </span>
          </button>
        </div>

        <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ShieldCheck size={14} color="#15803d" />
          <span>
            {activeTab === 'directory' && (isAr ? 'أرصدة الشركاء محسوبة آلياً من كشف التحصيلات الفعلية' : 'Live partner balances tied to cash collections')}
            {activeTab === 'projects' && (isAr ? 'فحص تطابق الحصص: مجموع نسب أي عمارة = 100% تماماً' : '100% Equity balance invariant enforced')}
            {activeTab === 'transactions' && (isAr ? 'كل حركة مرتبطة بقيد يومية مزدوج معتمد ومحمي' : 'Every entry generates balanced journal audit trail')}
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: PARTNER DIRECTORY & BALANCES                                  */}
      {/* ==================================================================== */}
      {activeTab === 'directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filter Toolbar */}
          <ZFFilterToolbar
            searchQuery={directorySearchQuery}
            onSearchChange={setDirectorySearchQuery}
            searchPlaceholder={isAr ? 'بحث باسم الشريك، الصفة، الهاتف، أو اسم المشروع...' : 'Search partner name, role, phone, project...'}
            filters={[
              {
                id: 'role',
                value: directoryRoleFilter,
                onChange: setDirectoryRoleFilter,
                options: [
                  { value: 'all', label: isAr ? 'كل صفات الشراكة' : 'All Roles' },
                  { value: 'primary_developer', label: isAr ? 'المطور الرئيسي' : 'Primary Developer' },
                  { value: 'equity_partner', label: isAr ? 'شريك ممول' : 'Equity Partner' },
                  { value: 'land_partner', label: isAr ? 'شريك بالأرض' : 'Land Partner' },
                  { value: 'silent_financier', label: isAr ? 'ممول صامت' : 'Silent Financier' }
                ]
              }
            ]}
            sortBy={directorySortBy}
            onSortChange={setDirectorySortBy}
            sortOptions={[
              { value: 'balance_desc', label: isAr ? 'الرصيد المستحق (الأعلى)' : 'Highest Balance' },
              { value: 'balance_asc', label: isAr ? 'الرصيد المستحق (الأقل)' : 'Lowest Balance' },
              { value: 'capital_desc', label: isAr ? 'رأس المال المودع (الأعلى)' : 'Highest Capital' },
              { value: 'payouts_desc', label: isAr ? 'الأرباح المنصرفة (الأعلى)' : 'Highest Payouts' },
              { value: 'name_asc', label: isAr ? 'اسم الشريك (أ - ي)' : 'Name (A - Z)' }
            ]}
            viewMode={directoryViewMode}
            onViewModeChange={setDirectoryViewMode}
            activeFiltersCount={
              (directorySearchQuery ? 1 : 0) + 
              (directoryRoleFilter !== 'all' ? 1 : 0) + 
              (directorySortBy !== 'balance_desc' ? 1 : 0)
            }
            onResetFilters={() => {
              setDirectorySearchQuery('');
              setDirectoryRoleFilter('all');
              setDirectorySortBy('balance_desc');
            }}
            resetLabel={isAr ? 'إعادة ضبط' : 'Reset'}
          />

          {/* CARDS VIEW */}
          {directoryViewMode === 'cards' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '1.25rem'
            }}>
              {filteredSummaries.map((p) => {
                const isPrimary = p.isPermanent;
                const netDueDec = D(p.netCurrentBalance);
                const isDueToPartner = netDueDec.greaterThan(0);

                return (
                  <div
                    key={p.partnerName}
                    style={{
                      background: '#ffffff',
                      border: isPrimary ? '1.5px solid rgba(184, 144, 62, 0.4)' : '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      boxShadow: isPrimary ? '0 4px 18px rgba(184, 144, 62, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Top Accent Strip */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: isPrimary 
                        ? 'linear-gradient(90deg, #d4af37, #b8903e)' 
                        : 'linear-gradient(90deg, #3b82f6, #1d4ed8)'
                    }} />

                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          background: isPrimary ? 'rgba(184, 144, 62, 0.12)' : '#f1f5f9',
                          border: isPrimary ? '1px solid rgba(184, 144, 62, 0.3)' : '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isPrimary ? '#946f23' : '#334155',
                          fontWeight: 800,
                          fontSize: '1.1rem'
                        }}>
                          {isPrimary ? <Crown size={22} color="#946f23" /> : p.partnerName.slice(0, 1)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                              {p.partnerName}
                            </h3>
                            {isPrimary && (
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: 900,
                                background: 'linear-gradient(135deg, rgba(184, 144, 62, 0.22) 0%, rgba(184, 144, 62, 0.08) 100%)',
                                color: '#854d0e',
                                padding: '0.12rem 0.45rem',
                                borderRadius: '5px',
                                border: '1px solid rgba(184, 144, 62, 0.4)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}>
                                <Crown size={11} color="#946f23" />
                                <span>{isAr ? 'المالك' : 'Owner'}</span>
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: isPrimary ? '#946f23' : '#64748b', fontWeight: isPrimary ? 700 : 600 }}>
                            {isPrimary ? (isAr ? 'المطور الرئيسي • مالك المنظومة' : 'Owner & Primary Developer') : p.roleTitleAr}
                          </span>
                        </div>
                      </div>

                      {/* Phone or Quick Badge */}
                      {p.phone && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: '#f8fafc',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.72rem',
                          color: '#475569',
                          fontVariantNumeric: 'tabular-nums'
                        }}>
                          <Phone size={11} color="#64748b" />
                          <span dir="ltr">{p.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Holdings Tags */}
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                        {isAr ? 'المشاريع والعماير المشترك بها:' : 'Project Holdings & Equity:'}
                      </span>
                      {isPrimary ? (
                        /* Primary Developer Master Portfolio Badge */
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(184, 144, 62, 0.08) 0%, rgba(184, 144, 62, 0.02) 100%)',
                          border: '1px solid rgba(184, 144, 62, 0.3)',
                          borderRadius: '8px',
                          padding: '0.45rem 0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', fontWeight: 800, color: '#946f23' }}>
                            <Building2 size={14} />
                            <span>{isAr ? `كامل محفظة الشركة (${p.holdings.length} مشروعاً)` : `Entire Portfolio (${p.holdings.length} Projects)`}</span>
                          </div>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: '#0f172a',
                            background: '#ffffff',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(184, 144, 62, 0.25)'
                          }}>
                            {isAr ? 'الحصة الحاكمة 65% - 100%' : 'Majority 65%-100%'}
                          </span>
                        </div>
                      ) : p.holdings.length > 2 ? (
                        /* Compact View for Multiple Holdings */
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                          {p.holdings.slice(0, 2).map((h, hIdx) => (
                            <span
                              key={hIdx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                color: '#334155',
                                fontWeight: 700
                              }}
                            >
                              <Building2 size={11} color="#946f23" />
                              <span>{h.propertyTitle}</span>
                              <strong style={{ color: '#0f172a' }}>({h.sharePct}%)</strong>
                            </span>
                          ))}
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: '#946f23',
                            background: 'rgba(184, 144, 62, 0.08)',
                            border: '1px solid rgba(184, 144, 62, 0.25)',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '6px'
                          }}>
                            +{p.holdings.length - 2} {isAr ? 'مشاريع أخرى' : 'more'}
                          </span>
                        </div>
                      ) : p.holdings.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {p.holdings.map((h, hIdx) => (
                            <span
                              key={hIdx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                color: '#334155',
                                fontWeight: 700
                              }}
                            >
                              <Building2 size={11} color="#946f23" />
                              <span>{h.propertyTitle}</span>
                              <strong style={{ color: '#0f172a' }}>({h.sharePct}%)</strong>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {isAr ? 'مساهمة استثمارية عامة (غير مقيدة بمشروع)' : 'General portfolio contribution'}
                        </span>
                      )}
                    </div>

                    {/* Statutory / Payout Badges (National ID / Payout channel) */}
                    {(p.national_id || p.instapay_handle || p.iban) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                        {p.national_id && (
                          <span style={{
                            fontSize: '0.68rem',
                            color: '#475569',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            padding: '0.12rem 0.4rem',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            {isAr ? 'الرقم القومي: ' : 'ID: '}<strong style={{ color: '#0f172a' }} dir="ltr">{p.national_id}</strong>
                          </span>
                        )}
                        {p.instapay_handle && (
                          <span style={{
                            fontSize: '0.68rem',
                            color: '#701a75',
                            background: 'rgba(112, 26, 117, 0.05)',
                            border: '1px solid rgba(112, 26, 117, 0.2)',
                            borderRadius: '4px',
                            padding: '0.12rem 0.4rem'
                          }}>
                            {isAr ? 'إنستاباي: ' : 'InstaPay: '}<strong dir="ltr">{p.instapay_handle}</strong>
                          </span>
                        )}
                        {p.preferred_payout_method === 'CASH' && (
                          <span style={{
                            fontSize: '0.68rem',
                            color: '#15803d',
                            background: 'rgba(21, 128, 61, 0.05)',
                            border: '1px solid rgba(21, 128, 61, 0.2)',
                            borderRadius: '4px',
                            padding: '0.12rem 0.4rem'
                          }}>
                            {isAr ? 'صرف نقدي (خزينة)' : 'Cash Payout'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 4-Metric Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.65rem',
                      background: '#f8fafc',
                      padding: '0.85rem',
                      borderRadius: '12px',
                      border: '1px solid #f1f5f9'
                    }}>
                      {/* Metric 1 */}
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                          {isAr ? 'رأس المال المودع (301000)' : 'Contributed Capital'}
                        </span>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                          <MoneyCell amount={p.totalContributedCapital} isAr={isAr} />
                        </div>
                      </div>

                      {/* Metric 2 */}
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                          {isAr ? 'نصيبه من التحصيلات' : 'Collections Share'}
                        </span>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1d4ed8' }}>
                          <MoneyCell amount={p.totalCollectionsShare} isAr={isAr} />
                        </div>
                      </div>

                      {/* Metric 3 */}
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                          {isAr ? 'الأرباح المنصرفة (303000)' : 'Distributions Paid'}
                        </span>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#15803d' }}>
                          <MoneyCell amount={p.totalDistributionsPaid} isAr={isAr} />
                        </div>
                      </div>

                      {/* Metric 4: Net Balance */}
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                          {isAr ? 'صافي الرصيد المستحق' : 'Net Due Balance'}
                        </span>
                        <div style={{ 
                          fontWeight: 800, 
                          fontSize: '0.92rem', 
                          color: isDueToPartner ? '#15803d' : '#0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <MoneyCell amount={p.netCurrentBalance} isAr={isAr} />
                          {isDueToPartner && (
                            <span style={{
                              fontSize: '0.62rem',
                              background: '#dcfce7',
                              color: '#166534',
                              padding: '0.05rem 0.35rem',
                              borderRadius: '4px',
                              fontWeight: 800
                            }}>
                              {isAr ? 'له' : 'Due'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      marginTop: 'auto',
                      paddingTop: '0.45rem',
                      borderTop: '1px solid #f1f5f9'
                    }}>
                      <button
                        type="button"
                        onClick={() => onOpenPayout(p.partnerName)}
                        style={{
                          flex: 1,
                          padding: '0.45rem 0.65rem',
                          borderRadius: '8px',
                          background: 'rgba(21, 128, 61, 0.08)',
                          color: '#15803d',
                          border: '1px solid rgba(21, 128, 61, 0.25)',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Receipt size={13} />
                        <span>{isAr ? 'صرف أرباح' : 'Payout'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenInjection(p.partnerName)}
                        style={{
                          flex: 1,
                          padding: '0.45rem 0.65rem',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          color: '#334155',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Coins size={13} color="#946f23" />
                        <span>{isAr ? 'ضخ مساهمة' : 'Inject'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenDossier(p)}
                        style={{
                          padding: '0.45rem 0.75rem',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease'
                        }}
                        title={isAr ? 'كشف الحساب والملف' : 'Dossier & Statement'}
                      >
                        <Eye size={13} />
                        <span>{isAr ? 'الملف' : 'Dossier'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TABLE VIEW */}
          {directoryViewMode === 'table' && (
            <div className={styles.tableCard} style={{ overflowX: 'auto' }}>
              <table className={styles.executiveTable} style={{ minWidth: '1150px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>{isAr ? 'الشريك والصفة' : 'Partner & Role'}</th>
                    <th style={{ width: '16%' }}>{isAr ? 'بيانات الاتصال والصرف' : 'Contact & Payout'}</th>
                    <th style={{ width: '18%' }}>{isAr ? 'المشاريع والحصص' : 'Project Equity'}</th>
                    <th style={{ width: '12%', textAlign: 'left' }}>{isAr ? 'رأس المال (301000)' : 'Capital (301000)'}</th>
                    <th style={{ width: '11%', textAlign: 'left' }}>{isAr ? 'نصيب التحصيلات' : 'Collections'}</th>
                    <th style={{ width: '11%', textAlign: 'left' }}>{isAr ? 'الأرباح (303000)' : 'Payouts (303000)'}</th>
                    <th style={{ width: '14%', textAlign: 'left' }}>{isAr ? 'صافي الرصيد المستحق' : 'Net Balance'}</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSummaries.map((p) => {
                    const isPrimary = p.isPermanent;
                    const netDueDec = D(p.netCurrentBalance);
                    const isDue = netDueDec.greaterThan(0);

                    return (
                      <tr key={p.partnerName}>
                        {/* Name & Role */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: isPrimary ? 'rgba(184, 144, 62, 0.12)' : '#f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isPrimary ? '#946f23' : '#475569',
                              fontWeight: 800,
                              fontSize: '0.85rem'
                            }}>
                              {isPrimary ? <Crown size={18} color="#946f23" /> : p.partnerName.slice(0, 1)}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.86rem' }}>
                                  {p.partnerName}
                                </span>
                                {isPrimary && (
                                  <span style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 900,
                                    background: 'linear-gradient(135deg, rgba(184, 144, 62, 0.22) 0%, rgba(184, 144, 62, 0.08) 100%)',
                                    color: '#854d0e',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(184, 144, 62, 0.4)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem'
                                  }}>
                                    <Crown size={10} color="#946f23" />
                                    <span>{isAr ? 'المالك' : 'Owner'}</span>
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: isPrimary ? '#946f23' : '#64748b', fontWeight: isPrimary ? 700 : 500 }}>
                                {isPrimary ? (isAr ? 'المطور الرئيسي • مالك المنظومة' : 'Owner & Primary Developer') : p.roleTitleAr}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact & Payout Channel */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            {p.phone ? (
                              <div style={{ fontSize: '0.74rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Phone size={11} color="#64748b" />
                                <span dir="ltr">{p.phone}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>-</span>
                            )}
                            {p.instapay_handle && (
                              <div style={{ fontSize: '0.68rem', color: '#701a75', fontWeight: 700 }}>
                                {isAr ? 'إنستاباي: ' : 'IPA: '}<span dir="ltr">{p.instapay_handle}</span>
                              </div>
                            )}
                            {p.iban && (
                              <div style={{ fontSize: '0.68rem', color: '#1d4ed8', fontWeight: 600 }}>
                                {p.bank_name ? `${p.bank_name}: ` : 'IBAN: '}<span dir="ltr">...{p.iban.slice(-6)}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Holdings */}
                        <td>
                          {isPrimary ? (
                            <span style={{
                              background: 'rgba(184, 144, 62, 0.08)',
                              border: '1px solid rgba(184, 144, 62, 0.25)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: '#946f23',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}>
                              <Building2 size={12} />
                              <span>{isAr ? `كامل المحفظة (${p.holdings.length} مشروعاً)` : `All Portfolio (${p.holdings.length})`}</span>
                            </span>
                          ) : p.holdings.length > 2 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center' }}>
                              {p.holdings.slice(0, 2).map((h, i) => (
                                <span
                                  key={i}
                                  style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: '#334155'
                                  }}
                                >
                                  {h.propertyTitle} ({h.sharePct}%)
                                </span>
                              ))}
                              <span style={{
                                fontSize: '0.66rem',
                                fontWeight: 800,
                                color: '#946f23',
                                background: 'rgba(184, 144, 62, 0.08)',
                                padding: '0.15rem 0.35rem',
                                borderRadius: '4px'
                              }}>
                                +{p.holdings.length - 2}
                              </span>
                            </div>
                          ) : p.holdings.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {p.holdings.map((h, i) => (
                                <span
                                  key={i}
                                  style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: '#334155'
                                  }}
                                >
                                  {h.propertyTitle} ({h.sharePct}%)
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              {isAr ? 'مساهمة عامة' : 'General'}
                            </span>
                          )}
                        </td>

                        {/* Capital */}
                        <td style={{ textAlign: 'left', fontWeight: 800 }}>
                          <MoneyCell amount={p.totalContributedCapital} isAr={isAr} />
                        </td>

                        {/* Collections Share */}
                        <td style={{ textAlign: 'left', fontWeight: 800, color: '#1d4ed8' }}>
                          <MoneyCell amount={p.totalCollectionsShare} isAr={isAr} />
                        </td>

                        {/* Distributions */}
                        <td style={{ textAlign: 'left', fontWeight: 800, color: '#15803d' }}>
                          <MoneyCell amount={p.totalDistributionsPaid} isAr={isAr} />
                        </td>

                        {/* Net Due */}
                        <td style={{ textAlign: 'left', fontWeight: 800 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <MoneyCell amount={p.netCurrentBalance} isAr={isAr} />
                            {isDue && (
                              <span style={{
                                fontSize: '0.62rem',
                                background: '#dcfce7',
                                color: '#166534',
                                padding: '0.05rem 0.35rem',
                                borderRadius: '4px',
                                fontWeight: 800
                              }}>
                                {isAr ? 'له' : 'Due'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => onOpenInjection(p.partnerName)}
                              title={isAr ? 'ضخ مساهمة جديدة' : 'Inject Capital'}
                              style={{
                                background: '#fffbeb',
                                border: '1px solid #fde68a',
                                color: '#92400e',
                                borderRadius: '6px',
                                padding: '0.3rem 0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                            >
                              <Coins size={12} />
                              <span>{isAr ? 'ضخ' : 'Inject'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenPayout(p.partnerName)}
                              title={isAr ? 'صرف أرباح' : 'Payout'}
                              style={{
                                background: '#f0fdf4',
                                border: '1px solid #86efac',
                                color: '#15803d',
                                borderRadius: '6px',
                                padding: '0.3rem 0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                            >
                              <Receipt size={12} />
                              <span>{isAr ? 'صرف' : 'Pay'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenDossier(p)}
                              title={isAr ? 'عرض الملف وكشف الحساب' : 'View Dossier'}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                color: '#334155',
                                borderRadius: '6px',
                                padding: '0.3rem 0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                                fontWeight: 800
                              }}
                            >
                              <Eye size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: PROJECTS & EQUITY SPLITS                                      */}
      {/* ==================================================================== */}
      {activeTab === 'projects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Projects Search & Filter Toolbar */}
          <ZFFilterToolbar
            searchQuery={projectsSearchQuery}
            onSearchChange={setProjectsSearchQuery}
            searchPlaceholder={isAr ? 'بحث باسم المشروع أو الموقع أو الشريك المساهم...' : 'Search project, location, or partner...'}
            filters={[
              {
                id: 'property',
                value: projectsPropertyFilter,
                onChange: setProjectsPropertyFilter,
                options: [
                  { value: 'all', label: isAr ? 'كل المشاريع' : 'All Projects' },
                  ...properties.map(p => ({
                    value: p.id,
                    label: p.title_ar || p.title_en || 'مشروع'
                  }))
                ]
              }
            ]}
            activeFiltersCount={
              (projectsSearchQuery ? 1 : 0) + 
              (projectsPropertyFilter !== 'all' ? 1 : 0)
            }
            onResetFilters={() => {
              setProjectsSearchQuery('');
              setProjectsPropertyFilter('all');
            }}
            resetLabel={isAr ? 'إعادة ضبط' : 'Reset'}
          />

          {/* Project Partnership Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {filteredProjects.map((proj) => {
              // Calculate total equity check
              const totalSplitPct = proj.partners.reduce((sum, p) => sum + p.sharePct, 0);
              const isBalanced = totalSplitPct === 100;

              return (
                <div
                  key={proj.propertyId}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem'
                  }}
                >
                  {/* Building Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: 'rgba(184, 144, 62, 0.1)',
                          border: '1px solid rgba(184, 144, 62, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#946f23'
                        }}>
                          <Building2 size={20} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                            {proj.propertyTitle}
                          </h3>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            {proj.location} • {isAr ? `مباع ${proj.soldUnitsCount} من أصل ${proj.totalUnitsCount} وحدة` : `${proj.soldUnitsCount} of ${proj.totalUnitsCount} units sold`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isBalanced ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: '#f0fdf4',
                          border: '1px solid #86efac',
                          color: '#15803d',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 800
                        }}>
                          <CheckCircle2 size={14} />
                          <span>{isAr ? '100% نسبة الشراكة مكتملة ومطابقة' : '100% Equity Split Balanced'}</span>
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: '#fef2f2',
                          border: '1px solid #fca5a5',
                          color: '#dc2626',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 800
                        }}>
                          <AlertTriangle size={14} />
                          <span>{isAr ? `تنبيه: مجموع الحصص ${totalSplitPct}%` : `Alert: Splits sum to ${totalSplitPct}%`}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Project Financial Summary Ribbon */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '0.85rem',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '12px',
                    padding: '0.85rem 1.15rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                        {isAr ? 'تكلفة المباني المحملة (WIP)' : 'Incurred WIP Cost'}
                      </span>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                        <MoneyCell amount={proj.totalIncurredWip} isAr={isAr} />
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                        {isAr ? 'إجمالي المبيعات التعاقدية' : 'Total Contract Sales'}
                      </span>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                        <MoneyCell amount={proj.totalContractSales} isAr={isAr} />
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                        {isAr ? 'إجمالي الكاش المحصل' : 'Total Cash Collected'}
                      </span>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1d4ed8' }}>
                        <MoneyCell amount={proj.totalCashCollected} isAr={isAr} />
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                        {isAr ? 'صافي مكسب المشروع المتوقع' : 'Estimated Net Profit'}
                      </span>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#15803d' }}>
                        <MoneyCell amount={proj.projectNetProfit} isAr={isAr} />
                      </div>
                    </div>
                  </div>

                  {/* 100% Equity Stacked Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <span style={{ fontSize: '0.74rem', color: '#334155', fontWeight: 700 }}>
                        {isAr ? 'توزيع نسب الشراكة في ملكية وأرباح العمارة:' : 'Equity & Profit Allocation Bar:'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                        {proj.partners.length} {isAr ? 'شركاء ومساهمين' : 'partners'}
                      </span>
                    </div>

                    {/* Stacked Progress Bar */}
                    <div style={{
                      height: '14px',
                      background: '#e2e8f0',
                      borderRadius: '999px',
                      overflow: 'hidden',
                      display: 'flex',
                      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}>
                      {proj.partners.map((partner, pIdx) => {
                        const color = PARTNER_COLORS[pIdx % PARTNER_COLORS.length];
                        return (
                          <div
                            key={partner.name}
                            style={{
                              width: `${partner.sharePct}%`,
                              background: color,
                              height: '100%',
                              transition: 'width 0.3s ease'
                            }}
                            title={`${partner.name}: ${partner.sharePct}%`}
                          />
                        );
                      })}
                    </div>

                    {/* Partner Legend */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', marginTop: '0.65rem' }}>
                      {proj.partners.map((partner, pIdx) => {
                        const color = PARTNER_COLORS[pIdx % PARTNER_COLORS.length];
                        return (
                          <div key={partner.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                            <span style={{ color: '#334155', fontWeight: 700 }}>{partner.name}</span>
                            <strong style={{ color: color }}>({partner.sharePct}%)</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Embedded Project Partners Table */}
                  <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '10px' }}>
                    <table className={styles.executiveTable} style={{ minWidth: '950px' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '22%' }}>{isAr ? 'الشريك المساهم' : 'Partner'}</th>
                          <th style={{ width: '10%', textAlign: 'center' }}>{isAr ? 'النسبة' : 'Share %'}</th>
                          <th style={{ width: '13%', textAlign: 'left' }}>{isAr ? 'تكلفة المباني (WIP)' : 'WIP Cost Share'}</th>
                          <th style={{ width: '13%', textAlign: 'left' }}>{isAr ? 'المبيعات التعاقدية' : 'Sales Share'}</th>
                          <th style={{ width: '14%', textAlign: 'left' }}>{isAr ? 'الكاش المحصل' : 'Collected Cash'}</th>
                          <th style={{ width: '14%', textAlign: 'left' }}>{isAr ? 'المنصرف له' : 'Paid Out'}</th>
                          <th style={{ width: '14%', textAlign: 'left' }}>{isAr ? 'المتبقي له' : 'Net Dues'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proj.partners.map((pt) => {
                          const duesDec = D(pt.remainingDues);
                          const hasDues = duesDec.greaterThan(0);

                          return (
                            <tr key={pt.name}>
                              <td style={{ fontWeight: 800, color: '#0f172a' }}>
                                {pt.name}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 800, color: '#946f23' }}>
                                {pt.sharePct}%
                              </td>
                              <td style={{ textAlign: 'left', fontWeight: 700 }}>
                                <MoneyCell amount={pt.wipCostShare} isAr={isAr} />
                              </td>
                              <td style={{ textAlign: 'left', fontWeight: 700 }}>
                                <MoneyCell amount={pt.salesShare} isAr={isAr} />
                              </td>
                              <td style={{ textAlign: 'left', fontWeight: 700, color: '#1d4ed8' }}>
                                <MoneyCell amount={pt.collectionsShare} isAr={isAr} />
                              </td>
                              <td style={{ textAlign: 'left', fontWeight: 700, color: '#15803d' }}>
                                <MoneyCell amount={pt.paidPayouts} isAr={isAr} />
                              </td>
                              <td style={{ textAlign: 'left', fontWeight: 800 }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <MoneyCell amount={pt.remainingDues} isAr={isAr} />
                                  {hasDues && (
                                    <span style={{
                                      fontSize: '0.62rem',
                                      background: '#dcfce7',
                                      color: '#166534',
                                      padding: '0.05rem 0.35rem',
                                      borderRadius: '4px',
                                      fontWeight: 800
                                    }}>
                                      {isAr ? 'له' : 'Due'}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: TRANSACTIONS & DIVIDENDS REGISTER                             */}
      {/* ==================================================================== */}
      {activeTab === 'transactions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Transactions Filter Toolbar */}
          <ZFFilterToolbar
            searchQuery={txSearchQuery}
            onSearchChange={setTxSearchQuery}
            searchPlaceholder={isAr ? 'بحث برقم الحركة، اسم الشريك، المشروع، إيصال، أو رقم القيد...' : 'Search #PT, partner, project, receipt, or #JE...'}
            filters={[
              {
                id: 'type',
                value: txTypeFilter,
                onChange: setTxTypeFilter,
                options: [
                  { value: 'all', label: isAr ? 'كل أنواع الحركات' : 'All Types' },
                  { value: 'CAPITAL_INJECTION', label: isAr ? 'ضخ رأس مال (301000)' : 'Capital Injection' },
                  { value: 'PROFIT_DISTRIBUTION', label: isAr ? 'صرف أرباح (303000)' : 'Profit Distribution' }
                ]
              },
              {
                id: 'payment_method',
                value: txPaymentMethodFilter,
                onChange: setTxPaymentMethodFilter,
                options: [
                  { value: 'all', label: isAr ? 'كل وسائل السداد' : 'All Methods' },
                  { value: 'CASH_101000', label: isAr ? 'خزينة كاش (101000)' : 'Cash Vault (101000)' },
                  { value: 'INSTAPAY_102000', label: isAr ? 'إنستاباي فوري (102000)' : 'InstaPay (102000)' }
                ]
              },
              {
                id: 'partner',
                value: txPartnerFilter,
                onChange: setTxPartnerFilter,
                options: [
                  { value: 'all', label: isAr ? 'كل الشركاء' : 'All Partners' },
                  ...partnerSummaries.map(p => ({
                    value: p.partnerName,
                    label: p.partnerName
                  }))
                ]
              }
            ]}
            sortBy={txSortBy}
            onSortChange={setTxSortBy}
            sortOptions={[
              { value: 'date_desc', label: isAr ? 'التاريخ (الأحدث)' : 'Newest' },
              { value: 'date_asc', label: isAr ? 'التاريخ (الأقدم)' : 'Oldest' },
              { value: 'amount_desc', label: isAr ? 'المبلغ (الأعلى)' : 'Highest Amount' },
              { value: 'amount_asc', label: isAr ? 'المبلغ (الأقل)' : 'Lowest Amount' }
            ]}
            activeFiltersCount={
              (txSearchQuery ? 1 : 0) + 
              (txTypeFilter !== 'all' ? 1 : 0) + 
              (txPaymentMethodFilter !== 'all' ? 1 : 0) + 
              (txPartnerFilter !== 'all' ? 1 : 0) + 
              (txSortBy !== 'date_desc' ? 1 : 0)
            }
            onResetFilters={() => {
              setTxSearchQuery('');
              setTxTypeFilter('all');
              setTxPaymentMethodFilter('all');
              setTxPartnerFilter('all');
              setTxSortBy('date_desc');
              setTxCurrentPage(1);
            }}
            resetLabel={isAr ? 'إعادة ضبط' : 'Reset'}
          />

          {/* Transactions Table Card */}
          <div className={styles.tableCard} style={{ overflowX: 'auto' }}>
            <table className={styles.executiveTable} style={{ minWidth: '1100px' }}>
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>{isAr ? 'رقم الحركة' : 'Tx #' }</th>
                  <th style={{ width: '10%' }}>{isAr ? 'التاريخ' : 'Date'}</th>
                  <th style={{ width: '15%' }}>{isAr ? 'الشريك' : 'Partner'}</th>
                  <th style={{ width: '13%' }}>{isAr ? 'نوع الحركة' : 'Type'}</th>
                  <th style={{ width: '15%' }}>{isAr ? 'المشروع' : 'Project'}</th>
                  <th style={{ width: '13%' }}>{isAr ? 'طريقة السداد' : 'Payment Method'}</th>
                  <th style={{ width: '12%', textAlign: 'left' }}>{isAr ? 'المبلغ المسدد' : 'Amount'}</th>
                  <th style={{ width: '10%' }}>{isAr ? 'القيد المحاسبي' : 'Journal #'}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((tx) => {
                    const isInjection = tx.type === 'CAPITAL_INJECTION';

                    return (
                      <tr key={tx.id}>
                        {/* Tx Number */}
                        <td>
                          <span style={{
                            fontFamily: 'ui-monospace, monospace',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            color: '#0f172a'
                          }}>
                            {tx.transaction_number}
                          </span>
                        </td>

                        {/* Date */}
                        <td style={{ fontSize: '0.78rem', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                          {tx.date}
                        </td>

                        {/* Partner */}
                        <td style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.84rem' }}>
                          {tx.partner_name}
                        </td>

                        {/* Type */}
                        <td>
                          {isInjection ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              background: 'rgba(184, 144, 62, 0.1)',
                              border: '1px solid rgba(184, 144, 62, 0.25)',
                              color: '#946f23',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800
                            }}>
                              <ArrowUpRight size={13} />
                              <span>{isAr ? 'ضخ رأس مال' : 'Injection'}</span>
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              background: '#f0fdf4',
                              border: '1px solid #86efac',
                              color: '#15803d',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800
                            }}>
                              <ArrowDownLeft size={13} />
                              <span>{isAr ? 'صرف أرباح' : 'Dividend'}</span>
                            </span>
                          )}
                        </td>

                        {/* Project */}
                        <td style={{ fontSize: '0.8rem', color: '#334155' }}>
                          {tx.property_title || (isAr ? 'تمويل عام للشركة' : 'General')}
                        </td>

                        {/* Payment Method */}
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#475569',
                            background: '#f8fafc',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0'
                          }}>
                            {tx.payment_method === 'CASH_101000' && (isAr ? 'خزينة كاش (101000)' : 'Cash Vault')}
                            {tx.payment_method === 'INSTAPAY_102000' && (isAr ? 'إنستاباي فوري (102000)' : 'InstaPay (102000)')}
                          </span>
                        </td>

                        {/* Amount */}
                        <td style={{
                          textAlign: 'left',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          color: isInjection ? '#946f23' : '#15803d'
                        }}>
                          <MoneyCell amount={tx.amount} isAr={isAr} />
                        </td>

                        {/* Journal Entry Ref */}
                        <td>
                          {tx.journal_entry_number ? (
                            <span style={{
                              fontFamily: 'ui-monospace, monospace',
                              fontSize: '0.72rem',
                              color: '#64748b',
                              background: '#f1f5f9',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px'
                            }}>
                              {tx.journal_entry_number}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      {isAr ? 'لا توجد حركات مسجلة مطابقة للفلاتر' : 'No transactions match filters'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <ZFPagination
            currentPage={txCurrentPage}
            totalPages={txTotalPages}
            totalItems={filteredTransactions.length}
            pageSize={txPageSize}
            onPageChange={setTxCurrentPage}
            onPageSizeChange={(sz) => {
              setTxPageSize(sz);
              setTxCurrentPage(1);
            }}
            isAr={isAr}
            itemLabel={{ ar: 'حركة مالية', en: 'transactions' }}
          />
        </div>
      )}
    </div>
  );
};
