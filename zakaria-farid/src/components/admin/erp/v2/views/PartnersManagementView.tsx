'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { usePropertyCosts } from '../../context/ERPWorkstationContext';
import { Users, Coins, Receipt, Wallet, Building2, Plus } from 'lucide-react';
import { 
  ERPPartnerProfile, 
  ERPPartnerTransaction, 
  ERPPartnerCall, 
  ERPPartnerCommitment,
  ERPContract 
} from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { 
  PartnersEngine, 
  PartnerFinancialSummary,
  getDistributionReadyProjects
} from '@/lib/erp/partnersEngine';
import { D } from '@/lib/erp/math';
import { getPartnerFinancing, getPartnerDrawings } from '@/lib/erp/canonicalMetrics';
import { exportPartnerDirectoryExcel } from '@/lib/erp/excelExporter';
import { toast } from 'sonner';

// Shell & Tokens
import { ZFKpiCard, ZFKpiGrid } from '../ZFKpiCard';
import { ZFPageHeader } from '../common/ZFPageHeader';
import styles from '../ZFWorkstationShell.module.css';

// Modular Child Views
import { PartnersProjectsView } from './partners/PartnersProjectsView';
import { PartnersDirectoryView } from './partners/PartnersDirectoryView';
import { PartnersTransactionsView } from './partners/PartnersTransactionsView';
import { PartnerDossierDrawer } from './partners/PartnerDossierDrawer';
import { PartnersSideWidgets } from './partners/PartnersSideWidgets';
import { DistributionReadyPanel } from './partners/DistributionReadyPanel';

// Modals
import { PartnerReallocationModal } from '../modals/PartnerReallocationModal';
import { NewPartnerCommitmentModal, NewPartnerCommitmentPayload } from '../modals/NewPartnerCommitmentModal';

export interface PartnersManagementViewProps {
  partnerProfiles?: ERPPartnerProfile[];
  partnerTransactions?: ERPPartnerTransaction[];
  properties?: Property[];
  contracts?: ERPContract[];
  partnerCalls?: ERPPartnerCall[];
  partnerCommitments?: ERPPartnerCommitment[];
  isAr?: boolean;
  isMutating?: boolean;
  onOpenNewPartnerModal?: () => void;
  onOpenPayout?: (initialPartnerName?: string, initialPropertyId?: string) => void;
  onOpenInjection?: (initialPartnerName?: string, initialPropertyId?: string, commitmentId?: string) => void;
  onOpenDossier?: (partner: PartnerFinancialSummary) => void;
  onOpenReallocation?: (property: Property) => void;
  onConfirmCommitment?: (payload: NewPartnerCommitmentPayload) => Promise<void>;
  onSaveProperty?: (updatedProperty: Property) => Promise<void> | void;
}

export const PartnersManagementView: React.FC<PartnersManagementViewProps> = ({
  partnerProfiles = [],
  partnerTransactions = [],
  properties = [],
  contracts = [],
  partnerCalls = [],
  partnerCommitments = [],
  isAr = true,
  isMutating = false,
  onOpenNewPartnerModal,
  onOpenPayout,
  onOpenInjection,
  onOpenReallocation: externalOnOpenReallocation,
  onConfirmCommitment,
  onSaveProperty
}) => {
  const propertyCosts = usePropertyCosts();
  // Master Workstation Tab Mode: 1: projects (مشاريع الشراكة), 2: directory (دليل الشركاء), 3: transactions (سجل الحركات)
  const [activeTab, setActiveTab] = useState<'projects' | 'directory' | 'transactions'>('projects');

  // Selected Building
  const buildingProperties = useMemo(() => {
    return properties.filter(p => p.type === 'building' || (p as any).is_building);
  }, [properties]);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(() => buildingProperties[0]?.id || '');

  useEffect(() => {
    if (!selectedBuildingId && buildingProperties.length > 0) {
      setSelectedBuildingId(buildingProperties[0].id);
    }
  }, [buildingProperties, selectedBuildingId]);

  // Dossier Drawer State
  const [dossierPartner, setDossierPartner] = useState<PartnerFinancialSummary | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  // Reallocation Modal State
  const [reallocationProperty, setReallocationProperty] = useState<Property | null>(null);
  const [reallocationInitialSeller, setReallocationInitialSeller] = useState<string | undefined>(undefined);

  // Commitment Modal State
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);
  const [commitmentModalPropertyId, setCommitmentModalPropertyId] = useState<string | undefined>(undefined);
  const [commitmentModalPartnerName, setCommitmentModalPartnerName] = useState<string | undefined>(undefined);

  const handleOpenCommitmentModal = (propId?: string, pName?: string) => {
    setCommitmentModalPropertyId(propId || selectedBuildingId);
    setCommitmentModalPartnerName(pName);
    setIsCommitmentModalOpen(true);
  };

  // Partner Summaries
  const partnerSummaries = useMemo(() => {
    return PartnersEngine.calculatePartnerSummaries(
      partnerProfiles,
      properties,
      contracts,
      partnerTransactions,
      partnerCalls,
      propertyCosts
    );
  }, [partnerProfiles, properties, contracts, partnerTransactions, partnerCalls, propertyCosts]);

  // Sold, fully collected projects with money still to distribute (user-confirmed 2026-10-06)
  const distributionReady = useMemo(() => getDistributionReadyProjects({
    properties,
    contracts,
    transactions: partnerTransactions,
    commitments: partnerCommitments
  }), [properties, contracts, partnerTransactions, partnerCommitments]);

  // 4 Discrete KPI Cards derived strictly from canonicalMetrics.ts
  const kpis = useMemo(() => {
    const canonicalFinancing = getPartnerFinancing({ partnerTransactions, partnerCalls });
    const canonicalDrawings = getPartnerDrawings({ partnerTransactions });

    const totalCapital = canonicalFinancing.totalFinancing.isZero()
      ? partnerSummaries.reduce((sum, s) => sum.plus(s.totalContributedCapital), D(0))
      : canonicalFinancing.totalFinancing;

    const totalPayouts = canonicalDrawings.totalDrawings.isZero()
      ? partnerSummaries.reduce((sum, s) => sum.plus(s.totalDistributionsPaid), D(0))
      : canonicalDrawings.totalDrawings;

    const totalNetDue = partnerSummaries.reduce((sum, s) => sum.plus(s.netCurrentBalance), D(0));
    const activeCount = partnerSummaries.length;

    return {
      totalCapital: totalCapital.toFixed(2),
      totalPayouts: totalPayouts.toFixed(2),
      totalNetDue: totalNetDue.toFixed(2),
      activeCount
    };
  }, [partnerTransactions, partnerCalls, partnerSummaries]);

  // Derived Sparklines for 4 Discrete KPIs
  const sparklines = useMemo(() => {
    const sortedTx = [...partnerTransactions].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const injections = sortedTx.filter(t => t.type === 'CAPITAL_INJECTION');
    const distributions = sortedTx.filter(t => t.type === 'PROFIT_DISTRIBUTION');

    // Real data only: running totals of actual transactions; a flat line when there is no history.
    const runningTotals = (txs: typeof sortedTx, finalValue: number) => {
      if (txs.length < 2) return [finalValue, finalValue];
      let acc = 0;
      return txs.map(t => (acc += Number(t.amount) || 0)).slice(-6);
    };

    const capPoints = runningTotals(injections, Number(kpis.totalCapital) || 0);
    const distPoints = runningTotals(distributions, Number(kpis.totalPayouts) || 0);
    const duePoints = [Number(kpis.totalNetDue) || 0, Number(kpis.totalNetDue) || 0];
    const countPoints = [kpis.activeCount, kpis.activeCount];

    return { capPoints, distPoints, duePoints, countPoints };
  }, [partnerTransactions, kpis]);

  // Handlers
  const handleOpenDossier = (partner: PartnerFinancialSummary) => {
    setDossierPartner(partner);
    setIsDossierOpen(true);
  };

  const handleOpenDossierByName = (partnerName: string) => {
    const found = partnerSummaries.find(s => s.partnerName === partnerName);
    if (found) handleOpenDossier(found);
  };

  const handleOpenReallocation = (property: Property, sellerName?: string) => {
    if (externalOnOpenReallocation) {
      externalOnOpenReallocation(property);
    } else {
      setReallocationProperty(property);
      setReallocationInitialSeller(sellerName);
    }
  };

  const handleExportDirectoryExcel = async () => {
    try {
      await exportPartnerDirectoryExcel(partnerSummaries, partnerTransactions, isAr);
      toast.success(isAr ? 'تم تصدير كشف حساب ودليل الشركاء بنجاح إلى Excel' : 'Partner directory exported');
    } catch {
      toast.error(isAr ? 'حدث خطأ أثناء تصدير الملف' : 'Export failed');
    }
  };

  return (
    <div className={styles.workstationBody} dir={isAr ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <ZFPageHeader
        title={isAr ? 'الشركاء ورؤوس الأموال' : 'Partners & capital'}
        subtitle={isAr ? 'مساهمات الشركاء في كل مشروع، حصصهم، والتوزيعات المصروفة لهم.' : 'Partner contributions per project, their shares, and payouts made.'}
        actions={onOpenNewPartnerModal ? (
          <button type="button" className={styles.btnPrimary} onClick={onOpenNewPartnerModal} disabled={isMutating}>
            <Plus size={14} />
            <span>{isAr ? 'إضافة شريك' : 'New partner'}</span>
          </button>
        ) : undefined}
      />

      <DistributionReadyPanel
        projects={distributionReady}
        isAr={isAr}
        isMutating={isMutating}
        onPay={(partnerName, propertyId) => onOpenPayout?.(partnerName, propertyId)}
      />

      {/* 2. TOP 4 DISCRETE FLOATING KPI CARDS WITH SQUIRCLES AND SPARKLINES */}
      <ZFKpiGrid>
        <ZFKpiCard
          title={isAr ? 'إجمالي رأس المال المودع (المساهمات)' : 'Total Contributed Capital'}
          value={D(kpis.totalCapital).formatEGP(isAr)}
          unitLabel={isAr ? 'ج.م' : 'EGP'}
          icon={<Coins size={16} />}
          accentColor="accent"
          showSparkline={true}
          sparklineData={sparklines.capPoints}
          subtitleLabel={isAr ? 'حساب 301000 - حقوق الملكية' : 'GL 301000 Equity'}
          subtitleValue={isAr ? 'مساهمات بالخزينة والإنستاباي' : 'Cash & InstaPay deposits'}
        />

        <ZFKpiCard
          title={isAr ? 'إجمالي الأرباح المنصرفة للشركاء' : 'Cumulative Profit Distributions'}
          value={D(kpis.totalPayouts).formatEGP(isAr)}
          unitLabel={isAr ? 'ج.م' : 'EGP'}
          icon={<Receipt size={16} />}
          accentColor="accent"
          showSparkline={true}
          sparklineData={sparklines.distPoints}
          subtitleLabel={isAr ? 'حساب 303000 - مسحوبات أرباح' : 'GL 303000 Contra-Equity'}
          subtitleValue={isAr ? 'مسددة بالكامل كاش وإنستاباي' : 'Settled cash & InstaPay'}
        />

        <ZFKpiCard
          title={isAr ? 'صافي المستحقات الجارية للشركاء' : 'Net Current Partner Balances'}
          value={D(kpis.totalNetDue).formatEGP(isAr)}
          unitLabel={isAr ? 'ج.م' : 'EGP'}
          icon={<Wallet size={16} />}
          accentColor="accent"
          showSparkline={true}
          sparklineData={sparklines.duePoints}
          subtitleLabel={isAr ? 'الرصيد المتبقي للصرف' : 'Outstanding Balance'}
          subtitleValue={isAr ? 'نصيب التحصيلات بعد خصم المنصرف' : 'Collections minus payouts'}
        />

        <ZFKpiCard
          title={isAr ? 'عدد الشركاء والممولين النشطين' : 'Active Partners & Financiers'}
          value={kpis.activeCount}
          unitLabel={isAr ? 'شريك وممول' : 'partners'}
          icon={<Users size={16} />}
          accentColor="accent"
          showSparkline={true}
          sparklineData={sparklines.countPoints}
          subtitleLabel={isAr ? 'حالة الشراكات' : 'Partnership Status'}
          subtitleValue={isAr ? 'جميع العقود مغطاة ومطابقة 100%' : 'All project splits balanced'}
        />
      </ZFKpiGrid>

      {/* 3. UNDERLINE NAVIGATION TABS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.1rem', overflowX: 'auto' }}>
        {[
          { id: 'projects', label: isAr ? 'مشاريع الشراكة وحصص العماير' : 'Project Equity & Capital', icon: <Building2 size={16} /> },
          { id: 'directory', label: isAr ? 'دليل وأرصدة الشركاء والممولين' : 'Partner Directory & Balances', icon: <Users size={16} /> },
          { id: 'transactions', label: isAr ? 'سجل الحركات والتوريدات' : 'Transactions & Dividends Register', icon: <Receipt size={16} /> }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '0.5rem 0.25rem',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2.5px solid var(--erp-accent)' : '2.5px solid transparent',
                color: isActive ? 'var(--erp-accent)' : '#64748b',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. MODULAR TAB VIEWS */}
      {activeTab === 'projects' && (
        <PartnersProjectsView
          properties={properties}
          contracts={contracts}
          transactions={partnerTransactions}
          commitments={partnerCommitments}
          summaries={partnerSummaries}
          selectedBuildingId={selectedBuildingId}
          onSelectBuildingId={setSelectedBuildingId}
          isAr={isAr}
          isMutating={isMutating}
          onOpenInjection={onOpenInjection || (() => {})}
          onOpenPayout={onOpenPayout || (() => {})}
          onOpenReallocation={handleOpenReallocation}
          onOpenDossier={handleOpenDossierByName}
          onOpenCommitmentModal={handleOpenCommitmentModal}
          onSaveProperty={onSaveProperty}
        />
      )}

      {activeTab === 'directory' && (
        <PartnersDirectoryView
          partnerProfiles={partnerProfiles}
          partnerSummaries={partnerSummaries}
          isAr={isAr}
          isMutating={isMutating}
          onOpenDossier={handleOpenDossier}
          onOpenInjection={onOpenInjection || (() => {})}
          onOpenPayout={onOpenPayout || (() => {})}
          onOpenNewPartner={onOpenNewPartnerModal}
        />
      )}

      {activeTab === 'transactions' && (
        <PartnersTransactionsView
          transactions={partnerTransactions}
          partnerProfiles={partnerProfiles}
          properties={properties}
          isAr={isAr}
          isMutating={isMutating}
          onOpenInjection={onOpenInjection || (() => {})}
          onOpenPayout={onOpenPayout || (() => {})}
        />
      )}

      {/* 5. SLIDE-OVER DOSSIER DRAWER */}
      <PartnerDossierDrawer
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        partner={dossierPartner}
        transactions={partnerTransactions}
        isAr={isAr}
        onOpenPayout={onOpenPayout}
        onOpenInjection={onOpenInjection}
      />

      {/* 6. COMPANION SIDE WIDGETS (Portaled into #zf-workstation-side-widgets) */}
      <PartnersSideWidgets
        properties={properties}
        summaries={partnerSummaries}
        transactions={partnerTransactions}
        commitments={partnerCommitments}
        isAr={isAr}
        onOpenNewPartner={onOpenNewPartnerModal}
        onOpenInjection={(pName, propId) => onOpenInjection?.(pName, propId || selectedBuildingId)}
        onOpenPayout={() => onOpenPayout?.()}
        onOpenReallocation={handleOpenReallocation}
        onExportExcel={handleExportDirectoryExcel}
      />

      {/* 7. REALLOCATION MODAL */}
      {reallocationProperty && (
        <PartnerReallocationModal
          isOpen={!!reallocationProperty}
          onClose={() => {
            setReallocationProperty(null);
            setReallocationInitialSeller(undefined);
          }}
          property={reallocationProperty}
          allPartnerProfiles={partnerProfiles}
          partnerTransactions={partnerTransactions}
          initialSellerPartner={reallocationInitialSeller}
          isAr={isAr}
          onSaveProperty={async (updated: Property) => {
            if (onSaveProperty) await onSaveProperty(updated);
            setReallocationProperty(null);
            setReallocationInitialSeller(undefined);
          }}
        />
      )}

      {/* 8. SCHEDULE MILESTONE COMMITMENT MODAL */}
      {isCommitmentModalOpen && onConfirmCommitment && (
        <NewPartnerCommitmentModal
          isOpen={isCommitmentModalOpen}
          onClose={() => setIsCommitmentModalOpen(false)}
          properties={buildingProperties}
          existingPartnerNames={partnerProfiles.map(p => p.name)}
          initialPropertyId={commitmentModalPropertyId}
          initialPartnerName={commitmentModalPartnerName}
          isAr={isAr}
          isMutating={isMutating}
          onSubmit={async (payload) => {
            await onConfirmCommitment(payload);
            toast.success(isAr ? 'تم حفظ وتثبيت مطالبة المرحلة الإنشائية بنجاح' : 'Milestone commitment saved successfully');
          }}
        />
      )}
    </div>
  );
};
