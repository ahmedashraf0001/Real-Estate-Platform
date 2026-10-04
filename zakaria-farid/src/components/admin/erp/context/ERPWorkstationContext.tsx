'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

import { createClient } from '@/lib/supabase/client';
import { ERPSupabaseService, LiveERPDataset, isAuthError } from '@/lib/erp/supabaseService';
import { GeneralLedgerEngine, resolvePeriodForDate } from '@/lib/erp/ledger';
import { ContractsEngine } from '@/lib/erp/contracts';
import { EscalationEngine } from '@/lib/erp/escalation';
import { RescissionEngine } from '@/lib/erp/rescission';
import { RSVEngine } from '@/lib/erp/rsv';
import { getAvailableCash, getConstructionWIP } from '@/lib/erp/canonicalMetrics';
import { D, Decimal, generateUUID, isUUID, ensureUUID } from '@/lib/erp/math';
import { 
  ERPContract, 
  ERPInstallmentSchedule, 
  InstallmentStatus,
  ERPJournalEntry,
  ERPPDCRecord,
  ERPRescissionRecord,
  ERPTaxRecord,
  ERPCostAllocation,
  ERPPropertyCostItem,
  ERPConstructionPurchaseOrder,
  ERPPartnerProfile,
  ERPPartnerTransaction,
  ERPAccountingPeriod,
  ERPNotification
} from '@/lib/erp/types';
import {
  PartnerShareItem,
  PRIMARY_DEVELOPER_NAME,
  getUnifiedPartnersDirectory,
  normalizePartnerSplits,
  saveRegisteredPartner
} from '@/lib/erp/partnersDirectory';
import { exportComprehensiveArabicExcel } from '@/lib/erp/excelExporter';
import { localizeBuyerName } from '@/components/erp/JournalEntryPreview';
import { 
  PartnersEngine, 
  PartnerFinancialSummary 
} from '@/lib/erp/partnersEngine';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { useERPRealtimeSync } from '@/lib/erp/useERPRealtimeSync';
import { InspectorPayload } from '../ZFInspectorDrawer';
import { NewContractWizardPayload } from '../v2/modals/NewContractWizardModal';
import { SupplementData } from '../NewChequeModal';
import { NewPartnerSubmitPayload } from '../v2/modals/NewPartnerProfileModal';
import { 
  evaluateFinancialAlerts, 
  getPersistedNotificationState, 
  persistNotificationRead, 
  persistMarkAllRead, 
  persistNotificationDismiss, 
  persistClearAll
} from '@/lib/erp/notificationEngine';
import { TAB_REDIRECT_MAP, TABS_WITH_SIDE_WIDGETS, isSideWidgetsTab } from '@/lib/erp/routing/tabRedirectMap';
export { TABS_WITH_SIDE_WIDGETS, isSideWidgetsTab };
import { prepareConstructionSettlement } from '@/lib/erp/constructionSettlement';
import { 
  ERPPalettePreset, 
  ERP_PALETTE_PRESETS,
  DEFAULT_PALETTE_PRESET, 
  getPresetById, 
  FIN_OS_PALETTE_STORAGE_KEY 
} from '@/lib/erp/erpPalettePresets';

export type ERPWorkspaceTab = 
  | 'dashboard' 
  | 'operations' 
  | 'properties' 
  | 'construction'
  | 'calculator' 
  | 'ledger' 
  | 'contracts' 
  | 'pdc' 
  | 'rescissions' 
  | 'cost-allocation' 
  | 'tax'
  | 'analysis'
  | 'partners';

export const TAB_TITLES_AR: Record<ERPWorkspaceTab, string> = {
  dashboard: 'نظرة عامة على الشغل | FIN-OS',
  operations: 'حركة الخزنة والعمليات | FIN-OS',
  properties: 'المشاريع والشقق المعروضة | FIN-OS',
  construction: 'مصاريف البناء ومستحقات المقاولين | FIN-OS',
  calculator: 'حاسبة تكلفة المباني والأقساط | FIN-OS',
  analysis: 'تحليل العقارات ودورة الحياة والجدوى | FIN-OS',
  contracts: 'عقود البيع والعملاء | FIN-OS',
  pdc: 'أجندة ومواعيد الأقساط | FIN-OS',
  ledger: 'حسابات الشركة ودفتر اليومية | FIN-OS',
  'cost-allocation': 'توزيع مصاريف المباني على الشقق | FIN-OS',
  tax: 'ضرائب وتراخيص المشاريع | FIN-OS',
  rescissions: 'إلغاء العقود وترجيع الفلوس | FIN-OS',
  partners: 'الشركاء وممولو المشاريع | FIN-OS',
};

export const TAB_TITLES_EN: Record<ERPWorkspaceTab, string> = {
  dashboard: 'Executive Cockpit | FIN-OS',
  operations: 'Daily Desk & Cashier | FIN-OS',
  properties: 'Projects & Properties Portfolio | FIN-OS',
  construction: 'Construction WIP & Contractor Payables | FIN-OS',
  calculator: 'Construction Calculator & Feasibility | FIN-OS',
  analysis: 'Property Lifecycle & Feasibility Analysis | FIN-OS',
  contracts: 'Sales Contracts Registry | FIN-OS',
  pdc: 'Installment Dues & Hand Collections | FIN-OS',
  ledger: 'General Ledger & COA | FIN-OS',
  'cost-allocation': 'WIP Cost Allocation (RSV) | FIN-OS',
  tax: 'Project Statutory Taxes & Permits | FIN-OS',
  rescissions: 'Rescissions & Settlement | FIN-OS',
  partners: 'Partners & Financiers | FIN-OS',
};



export interface ERPWorkstationContextValue {
  // Locale & Base
  locale: string;
  isAr: boolean;
  activeTab: ERPWorkspaceTab;
  currency: 'EGP' | 'USD';
  setCurrency: React.Dispatch<React.SetStateAction<'EGP' | 'USD'>>;
  toggleCurrency: () => void;
  currentUser: any;
  handleSignOut: () => Promise<void>;

  // Shell Layout & Side Widgets Container
  hasSideWidgets: boolean;
  setHasSideWidgets: (val: boolean) => void;

  // Accent Palette Customization
  activePreset: ERPPalettePreset;
  selectPresetById: (id: string) => void;
  palettePresets: ERPPalettePreset[];

  // Data & Live Sync
  data: LiveERPDataset;
  setData: React.Dispatch<React.SetStateAction<LiveERPDataset>>;
  isLoading: boolean;
  isMutating: boolean;
  setIsMutating: (val: boolean) => void;
  loadLiveData: (isSilent?: boolean) => Promise<LiveERPDataset | null>;
  realtimeStatus: 'connected' | 'syncing' | 'reconnecting' | 'disconnected';
  lastSyncTime: Date | null;
  triggerManualSync: () => Promise<void>;

  // Derived Financial Telemetry
  activePeriod: ERPAccountingPeriod;
  urgentDuesCount: number;
  overdueAPCount: number;
  totalGrossContractValue: string;
  totalCollectedCash: string;
  totalWipIncurred: string;
  totalSafePDCs: string;
  totalInjectedCapital: string;
  wipAccounts: { land: string; civil: string; mep: string; finishing: string; financing: string };
  kpis: { cashBank: string; totalWip: string; accountsReceivable: string; deferredRevenue: string; realizedRevenue: string };
  deferredRevenue: string;
  realizedRevenue: string;
  trancheStats: { total: number; pending: number; paid: number; superseded: number; voidCount: number };
  totalTaxLiabilities: string;
  totalContributedCapital: string;
  totalRemainingAR: string;
  unifiedPartners: ReturnType<typeof getUnifiedPartnersDirectory>;
  partnerSummaries: PartnerFinancialSummary[];
  contractPortfolioKPIs: {
    totalGross: string;
    totalCollected: string;
    totalRemaining: string;
    overallProgress: number;
    activeCount: number;
    deliveredCount: number;
    pendingCount: number;
    rescindedCount: number;
    totalCount: number;
  };

  // Partners Data
  partnerProfiles: ERPPartnerProfile[];
  setPartnerProfiles: React.Dispatch<React.SetStateAction<ERPPartnerProfile[]>>;
  partnerTransactions: ERPPartnerTransaction[];
  setPartnerTransactions: React.Dispatch<React.SetStateAction<ERPPartnerTransaction[]>>;

  // Notifications
  liveNotifications: ERPNotification[];
  unreadNotificationsCount: number;
  hasCriticalAlerts: boolean;
  showNotificationCenter: boolean;
  setShowNotificationCenter: (open: boolean) => void;
  handleMarkNotificationRead: (id: string) => void;
  handleMarkAllNotificationsRead: () => void;
  handleDismissNotification: (id: string) => void;
  handleClearAllNotifications: () => void;
  handleNotificationAction: (targetModule: string, metadata?: Record<string, any>) => void;

  // Dock & Shell State
  isDockCollapsed: boolean;
  setIsDockCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileDockOpen: boolean;
  setIsMobileDockOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleToggleDock: () => void;
  navigateToTab: (target: string, pushHistory?: boolean) => void;

  // Modals & Inspection State
  inspectorPayload: InspectorPayload | null;
  setInspectorPayload: React.Dispatch<React.SetStateAction<InspectorPayload | null>>;
  handleInspectContract: (contract: ERPContract) => void;
  handleInspectCheque: (cheque: ERPPDCRecord) => void;
  handleInspectTax: (tax: ERPTaxRecord) => void;
  handleInspectRSV: (allocation: ERPCostAllocation) => void;
  handleInspectRescission: (rescission: ERPRescissionRecord) => void;

  showQuickSearch: boolean;
  setShowQuickSearch: (show: boolean) => void;
  isAcademyOpen: boolean;
  setIsAcademyOpen: (open: boolean) => void;
  isGuidedTourActive: boolean;
  setIsGuidedTourActive: (active: boolean) => void;
  showFirstTimeTourPrompt: boolean;
  setShowFirstTimeTourPrompt: (show: boolean) => void;

  showNewContractModal: boolean;
  setShowNewContractModal: (show: boolean) => void;
  selectedPropertyId: string;
  setSelectedPropertyId: (id: string) => void;
  selectedBuildingUnitId: string | undefined;
  setSelectedBuildingUnitId: (id: string | undefined) => void;
  selectedBuildingUnitNumber: string | undefined;
  setSelectedBuildingUnitNumber: (num: string | undefined) => void;
  isWholeBuildingContract: boolean;
  setIsWholeBuildingContract: (val: boolean) => void;

  customUnitName: string;
  setCustomUnitName: (val: string) => void;
  buyerName: string;
  setBuyerName: (val: string) => void;
  buyerNationalId: string;
  setBuyerNationalId: (val: string) => void;
  buyerPhone: string;
  setBuyerPhone: (val: string) => void;
  buyerEmail: string;
  setBuyerEmail: (val: string) => void;
  customPrice: string;
  setCustomPrice: (val: string) => void;
  basePriceInput: string;
  setBasePriceInput: (val: string) => void;
  apartmentTaxInput: string;
  setApartmentTaxInput: (val: string) => void;
  apartmentTaxDesc: string;
  setApartmentTaxDesc: (val: string) => void;
  paymentPlanType: 'FULL_CASH' | 'UPFRONT_HANDOVER' | 'INSTALLMENTS';
  setPaymentPlanType: (val: 'FULL_CASH' | 'UPFRONT_HANDOVER' | 'INSTALLMENTS') => void;
  downPaymentPct: string;
  setDownPaymentPct: (val: string) => void;
  numInstallments: string;
  setNumInstallments: (val: string) => void;
  firstPaymentDate: string;
  setFirstPaymentDate: (val: string) => void;
  cashRoutingAccount: '101000' | '102000';
  setCashRoutingAccount: (val: '101000' | '102000') => void;
  partnerSplits: PartnerShareItem[];
  setPartnerSplits: (splits: PartnerShareItem[]) => void;
  leadSelectionMode: 'EXISTING_LEAD' | 'NEW_LEAD';
  setLeadSelectionMode: (mode: 'EXISTING_LEAD' | 'NEW_LEAD') => void;
  selectedLeadId: string;
  setSelectedLeadId: (id: string) => void;
  contractWizardStep: 1 | 2 | 3;
  setContractWizardStep: (step: 1 | 2 | 3) => void;

  showPayModal: { contract: ERPContract; schedule: ERPInstallmentSchedule } | null;
  setShowPayModal: (val: { contract: ERPContract; schedule: ERPInstallmentSchedule } | null) => void;
  showEscalationModal: ERPContract | null;
  setShowEscalationModal: (c: ERPContract | null) => void;
  escalationDelta: string;
  setEscalationDelta: (val: string) => void;
  escalationReason: string;
  setEscalationReason: (val: string) => void;
  showRescissionModal: ERPContract | null;
  setShowRescissionModal: (c: ERPContract | null) => void;
  selectedBranch: 'Branch1_PreDelivery' | 'Branch2_PostDelivery';
  setSelectedBranch: (branch: 'Branch1_PreDelivery' | 'Branch2_PostDelivery') => void;
  rescissionStep: 0 | 1;
  setRescissionStep: (step: 0 | 1) => void;
  rescissionDate: string;
  setRescissionDate: (val: string) => void;

  showRSVModal: boolean;
  setShowRSVModal: (val: boolean) => void;
  rsvProjectName: string;
  setRsvProjectName: (val: string) => void;
  rsvWipAmount: string;
  setRsvWipAmount: (val: string) => void;
  rsvSalesValue: string;
  setRsvSalesValue: (val: string) => void;

  showHandoverModal: ERPContract | null;
  setShowHandoverModal: (c: ERPContract | null) => void;

  showNewPDCModal: boolean;
  setShowNewPDCModal: (val: boolean) => void;
  supplementInitialContractId: string | null;
  setSupplementInitialContractId: (val: string | null) => void;
  newPdcContractId: string;
  setNewPdcContractId: (val: string) => void;
  newPdcNumber: string;
  setNewPdcNumber: (val: string) => void;
  newPdcBank: string;
  setNewPdcBank: (val: string) => void;
  newPdcDrawer: string;
  setNewPdcDrawer: (val: string) => void;
  newPdcValue: string;
  setNewPdcValue: (val: string) => void;
  newPdcDueDate: string;
  setNewPdcDueDate: (val: string) => void;

  collectingPDCItem: ERPPDCRecord | null;
  setCollectingPDCItem: (item: ERPPDCRecord | null) => void;

  showProjectExpenseModal: boolean;
  setShowProjectExpenseModal: (val: boolean) => void;
  projectExpensePropertyId: string | undefined;
  setProjectExpensePropertyId: (id: string | undefined) => void;

  auditModalProperty: Property | null;
  setAuditModalProperty: (prop: Property | null) => void;
  selectedAuditPropertyId: string;
  setSelectedAuditPropertyId: (id: string) => void;
  showCostModal: boolean;
  setShowCostModal: (val: boolean) => void;

  calculatorPropertyId: string | undefined;
  setCalculatorPropertyId: (id: string | undefined) => void;

  showPartnerPayoutModal: boolean;
  setShowPartnerPayoutModal: (val: boolean) => void;
  payoutInitialPartner: string | undefined;
  setPayoutInitialPartner: (partner: string | undefined) => void;
  showPartnerInjectionModal: boolean;
  setShowPartnerInjectionModal: (val: boolean) => void;
  injectionInitialPartner: string | undefined;
  setInjectionInitialPartner: (partner: string | undefined) => void;
  injectionInitialPropertyId: string | undefined;
  setInjectionInitialPropertyId: (id: string | undefined) => void;
  injectionInitialCommitmentId: string | undefined;
  setInjectionInitialCommitmentId: (id: string | undefined) => void;
  showNewPartnerModal: boolean;
  setShowNewPartnerModal: (val: boolean) => void;
  showPartnerOperationsModal: boolean;
  setShowPartnerOperationsModal: (val: boolean) => void;
  dossierTargetPartner: PartnerFinancialSummary | null;
  setDossierTargetPartner: (partner: PartnerFinancialSummary | null) => void;

  // Mutation Handlers
  handleCreateRealContract: (e?: React.FormEvent, overridePayload?: NewContractWizardPayload) => Promise<void>;
  handleExecuteEscalation: (overrideContract?: ERPContract, deltaParam?: string, reasonParam?: string) => Promise<void>;
  handleExecuteRescission: (overrideContract?: ERPContract) => Promise<void>;
  handleCollectPayment: (details?: { receiptDate?: string; destinationTreasury?: 'SAFE_101000' | 'BANK_102000'; paymentMethod?: 'CASH' | 'INSTAPAY'; notes?: string }) => Promise<void>;
  handleConfirmHandover: (contract: ERPContract, handoverDate: string, rsvWipCost: Decimal | string) => Promise<void>;
  handleToggleContractHandover: (contract: ERPContract) => Promise<void>;
  handlePDCStatusChange: (chequeId: string, newStatus: 'In Safe' | 'Deposited' | 'Cleared' | 'Bounced') => Promise<void>;
  handleSaveContractSupplement: (supplementData: SupplementData) => Promise<void>;
  handleSaveNewCheque: (chequeData: { contractId: string; scheduleId?: string; chequeNumber: string; bankName: string; drawerName: string; nominalValue: string; dueDate: string }) => Promise<void>;
  handleCollectDuePDCsToday: () => Promise<void>;
  handleConfirmHandCollection: (item: ERPPDCRecord, receiptNo: string, date: string, amount: string, notes: string, method?: 'CASH' | 'INSTAPAY') => Promise<void>;
  handleConfirmBounceCheque: (item: ERPPDCRecord) => Promise<void>;
  handleTogglePeriodStatus: (periodId: string, newStatus: 'OPEN' | 'LOCKED' | 'CLOSED') => Promise<void>;
  handlePostMonthlyEntries: (periodId: string) => Promise<number>;
  handleCreateRSVAllocation: (e?: React.FormEvent, overrideData?: { projectName: string; salesValue: string; wipAmount: string }) => Promise<void>;
  handleRemitTax: (taxId: string) => Promise<void>;
  handleConfirmPartnerPayout: (details: { partnerName: string; amount: string; paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000'; propertyId?: string; propertyTitle?: string; payoutDate: string; receiptRef: string; memo: string }) => Promise<void>;
  handleConfirmPartnerInjection: (details: { partnerName: string; amount: string; paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000'; propertyId?: string; propertyTitle?: string; commitmentId?: string; injectionDate: string; receiptRef: string; memo: string; role?: 'equity_partner' | 'land_partner' | 'silent_financier'; phone?: string; nationalId?: string; projectSharePct?: number }) => Promise<void>;
  handleCreatePartnerCommitment: (payload: { propertyId: string; partnerName: string; milestoneName: string; milestonePhase?: string; committedAmount: string; dueDate: string; notes?: string }) => Promise<void>;
  handleRegisterNewPartner: (profileData: NewPartnerSubmitPayload) => Promise<void>;
  handleSaveProjectExpense: (entry: ERPJournalEntry, costItem: ERPPropertyCostItem) => Promise<void>;
  handleExportExcel: () => void;
  handleSaveProperty: (updatedProperty: Property) => Promise<void>;
  handleOpenContractForProperty: (prop: Property, unit?: BuildingUnitItem) => void;
  handleOpenGenericNewContract: () => void;
  handleUpdatePropertyUnitTax: (propertyId: string, unitId: string, taxAmount: number, taxDesc?: string) => Promise<void>;
  handleOpenCalculatorForProperty: (prop?: Property) => void;
  handleOpenAuditForProperty: (prop?: Property) => void;
  handleAddPropertyCostItem: (item: ERPPropertyCostItem) => Promise<void>;
  handleDeletePropertyCostItem: (itemId: string) => Promise<void>;
  handleUpdatePropertyCostItem: (item: ERPPropertyCostItem) => Promise<void>;
  handleAddCostAdjustment: (updatedItem: ERPPropertyCostItem) => Promise<void>;
  handleCreateConstructionPurchaseOrder: (order: ERPConstructionPurchaseOrder) => Promise<void>;
  handleRecordCostPayablePayment: (updatedItem: ERPPropertyCostItem) => Promise<void>;
  handleUpdatePropertySellingPrice: (propertyId: string, newPriceEgp: number) => Promise<void>;
}

const ERPWorkstationContext = createContext<ERPWorkstationContextValue | null>(null);

export function useERPWorkstation(): ERPWorkstationContextValue {
  const ctx = useContext(ERPWorkstationContext);
  if (!ctx) {
    throw new Error('useERPWorkstation must be used within an <ERPWorkstationProvider>');
  }
  return ctx;
}

export function ERPWorkstationProvider({
  locale,
  children
}: {
  locale: string;
  children: ReactNode;
}) {
  const isAr = locale === 'ar';
  const router = useRouter();
  const pathname = usePathname() || '';
  const supabase = useMemo(() => createClient(), []);

  const [currentUser, setCurrentUser] = useState<any>(null);

  // Accent Palette Customization State & Runtime Injection
  const [activePreset, setActivePreset] = useState<ERPPalettePreset>(DEFAULT_PALETTE_PRESET);

  // Read persisted preset on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem(FIN_OS_PALETTE_STORAGE_KEY);
      if (savedId) {
        const found = getPresetById(savedId);
        setActivePreset(found);
      }
    }
  }, []);

  // Helper to inject all theme tokens and legacy aliases onto document root (scoped to /fin-os)
  const applyPaletteTokens = useCallback((preset: ERPPalettePreset) => {
    if (typeof window === 'undefined' || !document.documentElement) return;
    const isFinOs = window.location.pathname.startsWith('/fin-os');
    if (!isFinOs) return;
    const s = document.documentElement.style;
    // Primary ERP variables
    s.setProperty('--erp-accent', preset.accent);
    s.setProperty('--erp-accent-hover', preset.hover);
    s.setProperty('--erp-accent-subtle', preset.subtle);
    s.setProperty('--erp-accent-tint', preset.tint);
    // Legacy v2 token aliases
    s.setProperty('--zf2-gold', preset.accent);
    s.setProperty('--zf2-gold-light', preset.hover);
    s.setProperty('--zf2-gold-dark', preset.hover);
    s.setProperty('--zf2-gold-dim', preset.subtle);
    s.setProperty('--zf2-gold-wash', preset.tint);
    s.setProperty('--zf2-accent-primary', preset.accent);
    // Operations token aliases
    s.setProperty('--ops-accent', preset.accent);
    s.setProperty('--ops-accent-hover', preset.hover);
    s.setProperty('--ops-accent-soft', preset.subtle);
    s.setProperty('--ops-accent-subtle', preset.subtle);
  }, []);

  // Inject CSS variables onto document root whenever activePreset changes (scoped to /fin-os)
  useEffect(() => {
    applyPaletteTokens(activePreset);
  }, [activePreset, applyPaletteTokens]);

  const selectPresetById = useCallback((id: string) => {
    const next = getPresetById(id);
    setActivePreset(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(FIN_OS_PALETTE_STORAGE_KEY, next.id);
      applyPaletteTokens(next);
    }
  }, [applyPaletteTokens]);

  // Authentication check & session refresh
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!user || userError) {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          let validUser = (!sessionError && session?.user) ? session.user : null;

          if (!validUser) {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData?.session?.user) {
              validUser = refreshData.session.user;
            }
          }

          if (!validUser) {
            if (process.env.NODE_ENV === 'development') {
              validUser = {
                id: 'dev-admin-user',
                email: 'admin@zakariafarid.com',
                user_metadata: { role: 'admin', full_name: 'فريد زكريا' },
                app_metadata: { role: 'admin' },
                aud: 'authenticated',
                created_at: new Date().toISOString()
              } as any;
            } else {
              if (typeof window !== 'undefined') {
                window.location.href = '/admin/login?next=' + encodeURIComponent(window.location.pathname + window.location.search);
              }
              return;
            }
          }

          if (isMounted) {
            setCurrentUser(validUser);
          }
        } else {
          if (isMounted) {
            setCurrentUser(user);
          }
        }
      } catch {
        if (process.env.NODE_ENV === 'development') {
          if (isMounted) {
            setCurrentUser({
              id: 'dev-admin-user',
              email: 'admin@zakariafarid.com',
              user_metadata: { role: 'admin', full_name: 'فريد زكريا' },
              app_metadata: { role: 'admin' },
              aud: 'authenticated',
              created_at: new Date().toISOString()
            } as any);
          }
        } else if (typeof window !== 'undefined') {
          window.location.href = '/admin/login?next=' + encodeURIComponent(window.location.pathname + window.location.search);
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT' || !session) {
        if (process.env.NODE_ENV !== 'development' && typeof window !== 'undefined') {
          window.location.href = '/admin/login';
        }
      } else if (session?.user) {
        setCurrentUser(session.user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/admin/login';
    } catch (err) {
      console.error('Sign out error:', err);
      window.location.href = '/admin/login';
    }
  }, [supabase]);

  // Master Live Database State
  const [data, setData] = useState<LiveERPDataset>(() => ({
    periods: [],
    contracts: [],
    schedules: [],
    journalEntries: [],
    pdcRecords: [],
    rescissions: [],
    amendments: [],
    costAllocations: [],
    taxRecords: [],
    partnerCalls: [],
    partnerCommitments: [],
    makerCheckerRequests: [],
    properties: [],
    leads: [],
    propertyCosts: [],
    isSchemaMigrated: true
  }));

  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  // Active Tab Derived from URL Pathname
  const activeTab = useMemo<ERPWorkspaceTab>(() => {
    const cleanPath = pathname.replace(new RegExp(`^/fin-os/${locale}`), '').replace(/\/$/, '');
    if (!cleanPath || cleanPath === '' || cleanPath.startsWith('/cockpit') || cleanPath.startsWith('/dashboard')) return 'dashboard';
    if (cleanPath.startsWith('/operations')) return 'operations';
    if (cleanPath.startsWith('/properties')) return 'properties';
    if (cleanPath.startsWith('/cost-allocation') || cleanPath.startsWith('/rsv')) return 'cost-allocation';
    if (cleanPath.startsWith('/construction')) return 'construction';
    if (cleanPath.startsWith('/calculator')) return 'calculator';
    if (cleanPath.startsWith('/contracts')) return 'contracts';
    if (cleanPath.startsWith('/rescissions')) return 'rescissions';
    if (cleanPath.startsWith('/pdc') || cleanPath.startsWith('/vault')) return 'pdc';
    if (cleanPath.startsWith('/partners')) return 'partners';
    if (cleanPath.startsWith('/ledger')) return 'ledger';
    if (cleanPath.startsWith('/tax')) return 'tax';
    if (cleanPath.startsWith('/analysis')) return 'analysis';
    return 'dashboard';
  }, [pathname, locale]);

  // Shell Layout: Side Widgets Container Presence
  const [hasCustomSideWidgets, setHasCustomSideWidgets] = useState<boolean | null>(null);

  useEffect(() => {
    // Reset custom override on tab transitions
    setHasCustomSideWidgets(null);
  }, [activeTab]);

  const hasSideWidgets = useMemo<boolean>(() => {
    if (hasCustomSideWidgets !== null) return hasCustomSideWidgets;
    return isSideWidgetsTab(activeTab);
  }, [hasCustomSideWidgets, activeTab]);

  const setHasSideWidgets = useCallback((val: boolean) => {
    setHasCustomSideWidgets(val);
  }, []);

  // Dock Collapsible State
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [isMobileDockOpen, setIsMobileDockOpen] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('zf_dock_collapsed');
    if (saved !== null) {
      setIsDockCollapsed(saved === 'true');
    } else if (typeof window !== 'undefined' && window.innerWidth < 1100) {
      setIsDockCollapsed(true);
    }
  }, []);

  const handleToggleDock = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setIsMobileDockOpen(prev => !prev);
    } else {
      setIsDockCollapsed(prev => {
        const next = !prev;
        localStorage.setItem('zf_dock_collapsed', String(next));
        return next;
      });
    }
  }, []);

  // Next.js App Router Navigation
  const navigateToTab = useCallback((target: string, pushHistory = true) => {
    if (!target) return;
    const [rawMod, rawQuery] = target.split('?');
    const lower = rawMod?.toLowerCase().trim() || '';
    const mapping = TAB_REDIRECT_MAP[lower];
    const subPath = mapping ? (mapping.path ? `/${mapping.path}` : '') : (lower === 'dashboard' || lower === 'cockpit' ? '' : `/${lower}`);
    const defaultSub = mapping?.defaultSub ? `sub=${mapping.defaultSub}` : '';
    const queryParts = [defaultSub, rawQuery].filter(Boolean);
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const targetUrl = `/fin-os/${locale}${subPath}${queryString}`;

    if (pushHistory) {
      router.push(targetUrl);
    } else {
      router.replace(targetUrl);
    }
  }, [locale, router]);

  // Currency
  const [currency, setCurrency] = useState<'EGP' | 'USD'>('EGP');
  const toggleCurrency = useCallback(() => {
    setCurrency(prev => prev === 'EGP' ? 'USD' : 'EGP');
  }, []);

  // Inspector & Modals States
  const [inspectorPayload, setInspectorPayload] = useState<InspectorPayload | null>(null);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [persistedNotificationState, setPersistedNotificationState] = useState<{ readIds: Set<string>; dismissedIds: Set<string> }>({
    readIds: new Set(),
    dismissedIds: new Set()
  });

  useEffect(() => {
    setPersistedNotificationState(getPersistedNotificationState());
  }, []);

  // Close inspector drawer on route change
  useEffect(() => {
    setInspectorPayload(null);
  }, [pathname]);

  // Global Keyboard Shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Partner Profiles & Transactions State
  const [partnerProfiles, setPartnerProfiles] = useState<ERPPartnerProfile[]>([]);
  const [partnerTransactions, setPartnerTransactions] = useState<ERPPartnerTransaction[]>([]);

  // Live Data Fetcher
  const loadLiveData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      const [dataset, liveProfiles, liveTransactions] = await Promise.all([
        ERPSupabaseService.fetchLiveERPData(supabase),
        ERPSupabaseService.loadPartnerProfiles(supabase),
        ERPSupabaseService.loadPartnerTransactions(supabase)
      ]);
      if (!currentUser && process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        try {
          const saved = JSON.parse(window.localStorage.getItem('fin_os_local_purchase_orders') || '[]');
          dataset.purchaseOrders = Array.isArray(saved) ? saved.filter(order => order.order_id && order.property_id && order.status === 'DRAFT') : [];
        } catch { dataset.purchaseOrders = []; }
      }
      setData(dataset);
      setPartnerProfiles(liveProfiles ?? []);
      setPartnerTransactions(liveTransactions ?? []);
      return dataset;
    } catch (err: any) {
      console.error('Failed to load ERP dataset from Supabase:', err);
      if (isAuthError(err)) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData?.session) {
            const [retryDataset, retryProfiles, retryTransactions] = await Promise.all([
              ERPSupabaseService.fetchLiveERPData(supabase),
              ERPSupabaseService.loadPartnerProfiles(supabase),
              ERPSupabaseService.loadPartnerTransactions(supabase)
            ]);
            setData(retryDataset);
            setPartnerProfiles(retryProfiles ?? []);
            setPartnerTransactions(retryTransactions ?? []);
            return retryDataset;
          }
        } catch (refreshErr) {
          console.error('Failed to refresh session on auth error:', refreshErr);
        }

        toast.error('انتهت صلاحية الجلسة، جاري إعادة توجيهك لتسجيل الدخول...');
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login';
        }
        return null;
      }
      return null;
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [supabase, currentUser]);

  // Real-Time WebSocket Sync Hook
  const {
    status: realtimeStatus,
    lastSyncTime,
    triggerManualSync
  } = useERPRealtimeSync({
    supabase,
    onSync: loadLiveData,
    debounceMs: 250,
    heartbeatIntervalMs: 20000,
    enabled: true
  });

  useEffect(() => {
    loadLiveData(false);
  }, [loadLiveData]);

  // Active Accounting Period
  const activePeriod = useMemo<ERPAccountingPeriod>(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    // 1. Current calendar month period if OPEN
    const todayPeriod = data.periods.find(p => p.start_date <= todayStr && todayStr <= p.end_date);
    if (todayPeriod && todayPeriod.status === 'OPEN') {
      return todayPeriod;
    }
    // 2. First OPEN period chronologically
    const openPeriod = data.periods.find(p => p.status === 'OPEN');
    if (openPeriod) return openPeriod;

    // 3. Current calendar period even if LOCKED/CLOSED (so lock UI applies to current month)
    if (todayPeriod) return todayPeriod;

    // 4. Fallback to last period in list
    return data.periods[data.periods.length - 1] || {
      period_id: 'prd-2026-09',
      fiscal_year: 2026,
      period_number: 9,
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      status: 'OPEN'
    };
  }, [data.periods]);

  // Handler: Toggle Accounting Period Status
  const handleTogglePeriodStatus = useCallback(async (periodId: string, newStatus: 'OPEN' | 'LOCKED' | 'CLOSED') => {
    setIsMutating(true);
    try {
      await ERPSupabaseService.persistPeriodStatus(supabase, periodId, newStatus, 'CFO_FARID');
      
      setData(prev => ({
        ...prev,
        periods: prev.periods.map(p => p.period_id === periodId ? {
          ...p,
          status: newStatus,
          locked_at: newStatus !== 'OPEN' ? new Date().toISOString() : undefined,
          locked_by: newStatus !== 'OPEN' ? 'CFO_FARID' : undefined
        } : p)
      }));

      await loadLiveData();

      toast.success(
        newStatus === 'OPEN'
          ? (isAr ? 'تم فتح الفترة المحاسبية لتسجيل القيود' : 'Accounting period opened')
          : (isAr ? 'تم قفل الفترة المحاسبية وحمايتها بموجب Invariant 0.9' : 'Accounting period locked'),
        { duration: 4000 }
      );
    } catch (err: unknown) {
      console.warn('Period toggle error:', err);
      toast.error(isAr ? 'فشل تغيير حالة الفترة المحاسبية' : 'Failed to update period status');
    } finally {
      setIsMutating(false);
    }
  }, [supabase, loadLiveData, isAr]);

  // Handler: Post Monthly Journal Entries for a Fiscal Period
  const handlePostMonthlyEntries = useCallback(async (periodId: string): Promise<number> => {
    setIsMutating(true);
    try {
      const postedCount = await ERPSupabaseService.postPeriodJournalEntries(supabase, periodId);
      
      setData(prev => ({
        ...prev,
        journalEntries: prev.journalEntries.map(e => 
          e.period_id === periodId ? { ...e, is_locked: true } : e
        )
      }));

      await loadLiveData(false);

      return postedCount;
    } catch (err: unknown) {
      console.error('Period entries posting error:', err);
      toast.error(isAr ? 'فشل ترحيل قيود الشهر' : 'Failed to post monthly entries');
      return 0;
    } finally {
      setIsMutating(false);
    }
  }, [supabase, loadLiveData, isAr]);

  // Helper: Guard active or target period status against Invariant 0.9 violations
  const ensureActivePeriodOpen = useCallback((actionName?: string, targetPeriod?: ERPAccountingPeriod): boolean => {
    const periodToCheck = targetPeriod || activePeriod;
    if (periodToCheck.status !== 'OPEN') {
      const actionText = actionName ? ` (${actionName})` : '';
      toast.error(
        isAr 
          ? `الفترة المحاسبية (${periodToCheck.fiscal_year}-M${periodToCheck.period_number}) ${periodToCheck.status === 'LOCKED' ? 'مقفلة' : 'مغلقة'} بموجب المعيار المحاسبي Invariant 0.9. يُحظر تسجيل أي قيد مالي جديد${actionText} داخل فترة غير مفتوحة.`
          : `Fiscal period (${periodToCheck.fiscal_year}-M${periodToCheck.period_number}) is ${periodToCheck.status}. Journal mutations are blocked per Invariant 0.9.`,
        {
          action: {
            label: isAr ? 'إلغاء قفل الفترة' : 'Unlock Period',
            onClick: () => handleTogglePeriodStatus(periodToCheck.period_id, 'OPEN')
          },
          duration: 8000
        }
      );
      return false;
    }
    return true;
  }, [activePeriod, isAr, handleTogglePeriodStatus]);

  // Urgent Dues Count for Dock Badge
  const urgentDuesCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const pdcDues = data.pdcRecords.filter(p => p.status !== 'Cleared' && p.status !== 'Void' && p.due_date <= todayStr);
    const orphanSchedDues = data.schedules.filter(s => 
      (s.status === 'Pending' || s.status === 'Partially Paid') && 
      s.due_date <= todayStr && 
      !data.pdcRecords.some(p => p.schedule_id === s.schedule_id)
    );
    return pdcDues.length + orphanSchedDues.length;
  }, [data.pdcRecords, data.schedules]);

  // Overdue AP Count for Dock Badge
  const overdueAPCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let count = 0;
    data.propertyCosts.forEach(item => {
      if (item.payable_installments && item.payable_installments.length > 0) {
        item.payable_installments.forEach(inst => {
          if (inst.status !== 'PAID' && inst.due_date && inst.due_date <= todayStr) {
            count++;
          }
        });
      }
    });
    return count;
  }, [data.propertyCosts]);

  // Slide-over Inspectors Handlers
  const handleInspectContract = useCallback((contract: ERPContract) => {
    const contractSchedules = data.schedules.filter(s => s.contract_id === contract.contract_id);
    const contractAmendments = data.amendments.filter(a => a.contract_id === contract.contract_id);
    const linkedEntries = data.journalEntries.filter(j => 
      j.source_entity_id === contract.contract_id || 
      (contract.contract_number && j.description && j.description.includes(contract.contract_number))
    );
    const latestJournalEntry = linkedEntries[0] || data.journalEntries.find(j => j.source_entity_id === contract.contract_id);
    setInspectorPayload({
      type: 'contract',
      contract,
      schedules: contractSchedules,
      amendments: contractAmendments,
      latestJournalEntry,
      allJournalEntries: linkedEntries
    });
  }, [data.schedules, data.amendments, data.journalEntries]);

  const handleInspectCheque = useCallback((cheque: ERPPDCRecord) => {
    const linkedContract = data.contracts.find(c => c.contract_id === cheque.contract_id);
    const linkedSchedule = data.schedules.find(s => s.schedule_id === cheque.schedule_id);
    const clearingJournalEntry = data.journalEntries.find(j => 
      j.source_entity_id === cheque.cheque_id || 
      (cheque.cheque_number && j.description && j.description.includes(cheque.cheque_number))
    );
    setInspectorPayload({
      type: 'cheque',
      cheque,
      linkedContract,
      linkedSchedule,
      clearingJournalEntry
    });
  }, [data.contracts, data.schedules, data.journalEntries]);

  const handleInspectTax = useCallback((tax: ERPTaxRecord) => {
    const linkedContract = data.contracts.find(c => c.contract_id === tax.contract_id);
    const remittanceJournalEntry = data.journalEntries.find(j => 
      j.source_entity_id === tax.tax_id || 
      (j.description && j.description.includes(tax.tax_id))
    );
    setInspectorPayload({
      type: 'tax',
      tax,
      linkedContract,
      remittanceJournalEntry
    });
  }, [data.contracts, data.journalEntries]);

  const handleInspectRSV = useCallback((allocation: ERPCostAllocation) => {
    const linkedContracts = data.contracts.filter(c => 
      (c.unit_id && c.unit_id.toLowerCase().includes(allocation.project_name.toLowerCase())) ||
      (allocation.project_name && allocation.project_name.toLowerCase().includes(c.unit_id ? c.unit_id.toLowerCase() : ''))
    );
    setInspectorPayload({
      type: 'rsv',
      allocation,
      linkedContracts
    });
  }, [data.contracts]);

  const handleInspectRescission = useCallback((rescission: ERPRescissionRecord) => {
    setInspectorPayload({
      type: 'rescission',
      rescission
    });
  }, []);

  // Notifications Handlers
  const liveNotifications = useMemo(() => {
    return evaluateFinancialAlerts({
      pdcRecords: data.pdcRecords,
      contracts: data.contracts,
      schedules: data.schedules,
      makerCheckerRequests: data.makerCheckerRequests,
      taxRecords: data.taxRecords,
      propertyCosts: data.propertyCosts,
      activePeriod: activePeriod,
      readIds: persistedNotificationState.readIds,
      dismissedIds: persistedNotificationState.dismissedIds
    });
  }, [data.pdcRecords, data.contracts, data.schedules, data.makerCheckerRequests, data.taxRecords, data.propertyCosts, activePeriod, persistedNotificationState]);

  const unreadNotificationsCount = useMemo(() => {
    return liveNotifications.filter(n => !n.read).length;
  }, [liveNotifications]);

  const hasCriticalAlerts = useMemo(() => {
    return liveNotifications.some(n => n.severity === 'critical' && !n.read);
  }, [liveNotifications]);

  const handleMarkNotificationRead = useCallback((id: string) => {
    persistNotificationRead(id);
    setPersistedNotificationState(prev => {
      const nextRead = new Set(prev.readIds);
      nextRead.add(id);
      return { ...prev, readIds: nextRead };
    });
  }, []);

  const handleMarkAllNotificationsRead = useCallback(() => {
    const ids = liveNotifications.map(n => n.id);
    persistMarkAllRead(ids);
    setPersistedNotificationState(prev => {
      const nextRead = new Set(prev.readIds);
      ids.forEach(id => nextRead.add(id));
      return { ...prev, readIds: nextRead };
    });
  }, [liveNotifications]);

  const handleDismissNotification = useCallback((id: string) => {
    persistNotificationDismiss(id);
    setPersistedNotificationState(prev => {
      const nextDismissed = new Set(prev.dismissedIds);
      nextDismissed.add(id);
      return { ...prev, dismissedIds: nextDismissed };
    });
  }, []);

  const handleClearAllNotifications = useCallback(() => {
    const ids = liveNotifications.map(n => n.id);
    persistClearAll(ids);
    setPersistedNotificationState(prev => {
      const nextDismissed = new Set(prev.dismissedIds);
      ids.forEach(id => nextDismissed.add(id));
      return { ...prev, dismissedIds: nextDismissed };
    });
  }, [liveNotifications]);

  const handleNotificationAction = useCallback((targetModule: string, metadata?: Record<string, any>) => {
    let queryParam = '';
    if (targetModule === 'pdc' && metadata?.chequeId) {
      queryParam = `inspect=${encodeURIComponent(metadata.chequeId)}`;
    } else if (targetModule === 'contracts' && metadata?.contractId) {
      queryParam = `inspect=${encodeURIComponent(metadata.contractId)}`;
    } else if (targetModule === 'tax' && metadata?.taxId) {
      queryParam = `inspect=${encodeURIComponent(metadata.taxId)}`;
    } else if (targetModule === 'rescissions' && metadata?.rescissionId) {
      queryParam = `inspect=${encodeURIComponent(metadata.rescissionId)}`;
    } else if (metadata?.propertyId) {
      queryParam = `propertyId=${encodeURIComponent(metadata.propertyId)}`;
    } else if (metadata?.allocationId) {
      queryParam = `inspect=${encodeURIComponent(metadata.allocationId)}`;
    }

    const lower = targetModule?.toLowerCase().trim() || '';
    const mapping = TAB_REDIRECT_MAP[lower];
    const subPath = mapping ? (mapping.path ? `/${mapping.path}` : '') : (lower === 'dashboard' || lower === 'cockpit' ? '' : `/${lower}`);
    const defaultSub = mapping?.defaultSub ? `sub=${mapping.defaultSub}` : '';
    const combinedQuery = [defaultSub, queryParam].filter(Boolean).join('&');
    const queryString = combinedQuery ? `?${combinedQuery}` : '';

    router.push(`/fin-os/${locale}${subPath}${queryString}`);
    setShowNotificationCenter(false);
  }, [locale, router]);

  // Academy & Guided Tour
  const [isAcademyOpen, setIsAcademyOpen] = useState(false);
  const [isGuidedTourActive, setIsGuidedTourActive] = useState(false);
  const [showFirstTimeTourPrompt, setShowFirstTimeTourPrompt] = useState(false);

  // Modal State Declarations
  const [showNewContractModal, setShowNewContractModal] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedBuildingUnitId, setSelectedBuildingUnitId] = useState<string | undefined>(undefined);
  const [selectedBuildingUnitNumber, setSelectedBuildingUnitNumber] = useState<string | undefined>(undefined);
  const [isWholeBuildingContract, setIsWholeBuildingContract] = useState(false);
  const [customUnitName, setCustomUnitName] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerNationalId, setBuyerNationalId] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [basePriceInput, setBasePriceInput] = useState('');
  const [apartmentTaxInput, setApartmentTaxInput] = useState('0');
  const [apartmentTaxDesc, setApartmentTaxDesc] = useState('');
  const [paymentPlanType, setPaymentPlanType] = useState<'FULL_CASH' | 'UPFRONT_HANDOVER' | 'INSTALLMENTS'>('INSTALLMENTS');
  const [downPaymentPct, setDownPaymentPct] = useState('0.15');
  const [numInstallments, setNumInstallments] = useState('8');
  const [firstPaymentDate, setFirstPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashRoutingAccount, setCashRoutingAccount] = useState<'101000' | '102000'>('101000');
  const [partnerSplits, setPartnerSplits] = useState<PartnerShareItem[]>(() => normalizePartnerSplits(null));
  const [leadSelectionMode, setLeadSelectionMode] = useState<'EXISTING_LEAD' | 'NEW_LEAD'>('EXISTING_LEAD');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [contractWizardStep, setContractWizardStep] = useState<1 | 2 | 3>(1);

  const [showPayModal, setShowPayModal] = useState<{ contract: ERPContract; schedule: ERPInstallmentSchedule } | null>(null);
  const [showEscalationModal, setShowEscalationModal] = useState<ERPContract | null>(null);
  const [escalationDelta, setEscalationDelta] = useState('1500000.00');
  const [escalationReason, setEscalationReason] = useState('Engineering & material cost index adjustment');
  const [showRescissionModal, setShowRescissionModal] = useState<ERPContract | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<'Branch1_PreDelivery' | 'Branch2_PostDelivery'>('Branch1_PreDelivery');
  const [rescissionStep, setRescissionStep] = useState<0 | 1>(0);
  const [rescissionDate, setRescissionDate] = useState(new Date().toISOString().split('T')[0]);

  const [showRSVModal, setShowRSVModal] = useState<boolean>(false);
  const [rsvProjectName, setRsvProjectName] = useState<string>('مشروع بالاشيال فيلاز & نايل هورايزونز');
  const [rsvWipAmount, setRsvWipAmount] = useState<string>('45000000');
  const [rsvSalesValue, setRsvSalesValue] = useState<string>('100000000');

  const [showHandoverModal, setShowHandoverModal] = useState<ERPContract | null>(null);

  const [showNewPDCModal, setShowNewPDCModal] = useState(false);
  const [supplementInitialContractId, setSupplementInitialContractId] = useState<string | null>(null);
  const [newPdcContractId, setNewPdcContractId] = useState('');
  const [newPdcNumber, setNewPdcNumber] = useState('');
  const [newPdcBank, setNewPdcBank] = useState('');
  const [newPdcDrawer, setNewPdcDrawer] = useState('');
  const [newPdcValue, setNewPdcValue] = useState('');
  const [newPdcDueDate, setNewPdcDueDate] = useState(new Date().toISOString().split('T')[0]);

  const [collectingPDCItem, setCollectingPDCItem] = useState<ERPPDCRecord | null>(null);
  const [showProjectExpenseModal, setShowProjectExpenseModal] = useState<boolean>(false);
  const [projectExpensePropertyId, setProjectExpensePropertyId] = useState<string | undefined>(undefined);

  const [auditModalProperty, setAuditModalProperty] = useState<Property | null>(null);
  const [selectedAuditPropertyId, setSelectedAuditPropertyId] = useState<string>('');
  const [showCostModal, setShowCostModal] = useState<boolean>(false);

  useEffect(() => {
    if (showCostModal) {
      const p = (selectedAuditPropertyId ? data.properties.find(prop => prop.id === selectedAuditPropertyId) : null) || data.properties[0] || null;
      setAuditModalProperty(p);
      setShowCostModal(false);
    }
  }, [showCostModal, selectedAuditPropertyId, data.properties]);

  const [calculatorPropertyId, setCalculatorPropertyId] = useState<string | undefined>(undefined);

  const [showPartnerPayoutModal, setShowPartnerPayoutModal] = useState<boolean>(false);
  const [payoutInitialPartner, setPayoutInitialPartner] = useState<string | undefined>(undefined);
  const [showPartnerInjectionModal, setShowPartnerInjectionModal] = useState<boolean>(false);
  const [injectionInitialPartner, setInjectionInitialPartner] = useState<string | undefined>(undefined);
  const [injectionInitialPropertyId, setInjectionInitialPropertyId] = useState<string | undefined>(undefined);
  const [injectionInitialCommitmentId, setInjectionInitialCommitmentId] = useState<string | undefined>(undefined);
  const [showNewPartnerModal, setShowNewPartnerModal] = useState<boolean>(false);
  const [showPartnerOperationsModal, setShowPartnerOperationsModal] = useState<boolean>(false);
  const [dossierTargetPartner, setDossierTargetPartner] = useState<PartnerFinancialSummary | null>(null);

  // Financial Telemetry Derivations
  const totalGrossContractValue = useMemo(() => {
    return data.contracts.reduce((acc, c) => acc.plus(c.gross_contract_value), D(0)).toFixed(2);
  }, [data.contracts]);

  const totalCollectedCash = useMemo(() => {
    return data.contracts.reduce((acc, c) => acc.plus(c.total_cash_collected), D(0)).toFixed(2);
  }, [data.contracts]);

  const totalWipIncurred = useMemo(() => {
    return getConstructionWIP({
      costAllocations: data.costAllocations,
      propertyCosts: data.propertyCosts,
      journalEntries: data.journalEntries,
    }).toFixed(2);
  }, [data.costAllocations, data.propertyCosts, data.journalEntries]);

  const totalSafePDCs = useMemo(() => {
    return data.pdcRecords
      .filter(p => p.status === 'In Safe')
      .reduce((acc, p) => acc.plus(p.nominal_value || '0'), D(0))
      .toFixed(2);
  }, [data.pdcRecords]);

  const totalInjectedCapital = useMemo(() => {
    return data.partnerCalls
      .reduce((acc, c) => acc.plus(c.paid_amount || c.call_amount || '0'), D(0))
      .toFixed(2);
  }, [data.partnerCalls]);

  const deferredRevenue = useMemo(() => {
    return data.contracts
      .filter(c => c.handover_status !== 'Delivered')
      .reduce((acc, c) => acc.plus(c.total_cash_collected), D(0))
      .toFixed(2);
  }, [data.contracts]);

  const realizedRevenue = useMemo(() => {
    return data.contracts
      .filter(c => c.handover_status === 'Delivered')
      .reduce((acc, c) => acc.plus(c.gross_contract_value), D(0))
      .toFixed(2);
  }, [data.contracts]);

  const trancheStats = useMemo(() => {
    let pending = 0;
    let paid = 0;
    let superseded = 0;
    let voidCount = 0;
    data.schedules.forEach(s => {
      if (s.status === 'Pending' || s.status === 'Partially Paid') pending++;
      else if (s.status === 'Paid') paid++;
      else if (s.status === 'SUPERSEDED') superseded++;
      else if (s.status === 'Void') voidCount++;
    });
    return { total: data.schedules.length, pending, paid, superseded, voidCount };
  }, [data.schedules]);

  const kpis = useMemo(() => {
    const { totalFormatted: trueLiquidCash } = getAvailableCash(data.journalEntries);
    return {
      cashBank: trueLiquidCash,
      totalWip: totalWipIncurred,
      accountsReceivable: D(totalGrossContractValue).minus(totalCollectedCash).toFixed(2),
      deferredRevenue: deferredRevenue,
      realizedRevenue: realizedRevenue
    };
  }, [data.journalEntries, totalWipIncurred, totalGrossContractValue, totalCollectedCash, deferredRevenue, realizedRevenue]);

  const wipAccounts = useMemo(() => {
    const total = D(totalWipIncurred);
    return {
      land: total.times('0.40').toFixed(2),
      civil: total.times('0.30').toFixed(2),
      mep: total.times('0.15').toFixed(2),
      finishing: total.times('0.10').toFixed(2),
      financing: total.times('0.05').toFixed(2)
    };
  }, [totalWipIncurred]);

  const totalTaxLiabilities = useMemo(() => {
    return data.taxRecords
      .filter(t => t.remittance_status === 'Pending')
      .reduce((acc, t) => acc.plus(t.tax_amount || 0), D(0))
      .toFixed(2);
  }, [data.taxRecords]);

  const totalContributedCapital = useMemo(() => {
    return data.partnerCalls.reduce((acc, p) => acc.plus(p.paid_amount || (p.status === 'Funded' ? p.call_amount : 0)), D(0)).toFixed(2);
  }, [data.partnerCalls]);

  const totalRemainingAR = useMemo(() => {
    return D(totalGrossContractValue).minus(totalCollectedCash).toFixed(2);
  }, [totalGrossContractValue, totalCollectedCash]);

  const unifiedPartners = useMemo(() => {
    return getUnifiedPartnersDirectory(data.partnerCalls, data.properties, data.contracts);
  }, [data.partnerCalls, data.properties, data.contracts]);

  const partnerSummaries = useMemo(() => {
    return PartnersEngine.calculatePartnerSummaries(
      partnerProfiles,
      data.properties,
      data.contracts,
      partnerTransactions,
      data.partnerCalls
    );
  }, [partnerProfiles, data.properties, data.contracts, partnerTransactions, data.partnerCalls]);

  const contractPortfolioKPIs = useMemo(() => {
    let totalGross = D(0);
    let totalCollected = D(0);
    let activeCount = 0;
    let deliveredCount = 0;
    let pendingCount = 0;
    let rescindedCount = 0;

    data.contracts.forEach(c => {
      if (c.status === 'Rescinded') {
        rescindedCount++;
        return;
      }
      totalGross = totalGross.plus(c.gross_contract_value || '0');
      totalCollected = totalCollected.plus(c.total_cash_collected || '0');
      activeCount++;
      if (c.handover_status === 'Delivered') deliveredCount++;
      if (c.handover_status === 'Pending') pendingCount++;
    });

    const totalRemaining = totalGross.minus(totalCollected).isNegative() 
      ? '0.00' 
      : totalGross.minus(totalCollected).toFixed(2);
    const overallProgress = totalGross.isZero() 
      ? 0 
      : Math.min(100, Math.max(0, totalCollected.div(totalGross).times(100).toNumber()));

    return {
      totalGross: totalGross.toFixed(2),
      totalCollected: totalCollected.toFixed(2),
      totalRemaining,
      overallProgress,
      activeCount,
      deliveredCount,
      pendingCount,
      rescindedCount,
      totalCount: activeCount
    };
  }, [data.contracts]);

  // MUTATION HANDLERS
  const handleSaveProperty = useCallback(async (updatedProperty: Property) => {
    setData(prev => ({
      ...prev,
      properties: prev.properties.map(p => p.id === updatedProperty.id ? updatedProperty : p)
    }));
    try {
      await ERPSupabaseService.updatePropertyPartnership(supabase, updatedProperty.id, {
        partner_splits: updatedProperty.partner_splits,
        ownership_history: updatedProperty.ownership_history,
        target_budget_egp: updatedProperty.target_budget_egp
      });
    } catch (err) {
      console.warn('Silent fallback on updatePropertyPartnership:', err);
    }
  }, [supabase]);

  // Handler: Create Real Contract
  const handleCreateRealContract = useCallback(async (
    e?: React.FormEvent,
    overridePayload?: NewContractWizardPayload
  ) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    const targetPropertyId = overridePayload ? overridePayload.propertyId : selectedPropertyId;
    const targetBuildingUnitId = overridePayload ? overridePayload.buildingUnitId : selectedBuildingUnitId;
    const targetBuildingUnitNumber = overridePayload ? overridePayload.buildingUnitNumber : selectedBuildingUnitNumber;
    const targetIsWholeBuildingContract = overridePayload 
      ? (overridePayload.isWholeBuildingContract ?? !overridePayload.buildingUnitId) 
      : isWholeBuildingContract;
    const targetCustomUnitName = overridePayload ? (overridePayload.customUnitName || '') : customUnitName;
    const targetBuyerName = overridePayload ? overridePayload.buyerName : buyerName;
    const targetBuyerNationalId = overridePayload ? overridePayload.buyerNationalId : buyerNationalId;
    const targetBuyerPhone = overridePayload ? overridePayload.buyerPhone : buyerPhone;
    const targetBuyerEmail = overridePayload ? overridePayload.buyerEmail : buyerEmail;
    const targetBasePrice = overridePayload ? overridePayload.basePrice.toString() : basePriceInput;
    const targetTaxAmount = overridePayload ? (overridePayload.taxAmount || '0.00') : apartmentTaxInput;
    const targetTaxNotes = overridePayload ? (overridePayload.taxNotes || '') : apartmentTaxDesc;
    const targetTotalNominalValue = overridePayload ? overridePayload.totalNominalValue.toString() : customPrice;
    const targetDpAmount = overridePayload ? overridePayload.downPaymentAmount : 0;
    const targetPaymentPlanType = overridePayload ? overridePayload.paymentPlanType : paymentPlanType;
    const targetNumInstallments = overridePayload ? overridePayload.numInstallments.toString() : numInstallments;
    const targetFirstPaymentDate = overridePayload ? overridePayload.firstPaymentDate : firstPaymentDate;
    const targetFirstInstallmentDueDate = overridePayload ? overridePayload.firstInstallmentDueDate : undefined;
    const targetInstallmentFrequency = overridePayload ? overridePayload.installmentFrequency : 'QUARTERLY';
    const targetPartnerSplits = overridePayload ? overridePayload.partnerSplits : partnerSplits;
    const targetDestinationTreasury = overridePayload ? overridePayload.destinationTreasury : cashRoutingAccount;
    const targetLeadId = overridePayload ? overridePayload.leadId : selectedLeadId;
    const targetLeadSelectionMode = overridePayload ? (overridePayload.leadSelectionMode || 'NEW_LEAD') : leadSelectionMode;

    const isCustom = targetPropertyId === 'custom_unit';
    const prop = !isCustom ? data.properties.find(p => p.id === targetPropertyId) : null;

    if (!isCustom && prop) {
      const isBuilding = prop.type === 'building' || (prop.title_ar || '').includes('عمارة') || (prop.title_en || '').toLowerCase().includes('building');
      
      if (isBuilding) {
        const wholeContract = data.contracts.find(c => 
          (c.property_id === prop.id || c.unit_id === prop.title_ar || c.unit_id === prop.title_en) && 
          (c.status === 'Active' || c.status === 'Completed') &&
          (c.is_whole_building_sale || !c.building_unit_id)
        );
        if (wholeContract || prop.listing_status === 'sold') {
          alert(isAr 
            ? `عفواً! هذه العمارة تم بيعها بالكامل بموجب العقد (${wholeContract?.contract_number || 'مسجل'}) باسم (${wholeContract?.buyer_name || 'المشتري'}). لا يمكن بيع أي شقة منفصلة منها.`
            : `This building is already sold entirely under contract ${wholeContract?.contract_number || ''}. No individual apartments can be sold.`
          );
          return;
        }

        if (!targetIsWholeBuildingContract && targetBuildingUnitId) {
          const targetUnit = (prop.building_units || []).find(u => u.unit_id === targetBuildingUnitId);
          if (targetUnit && targetUnit.status === 'contracted') {
            alert(isAr 
              ? `عفواً! هذه الشقة (${targetUnit.unit_number}) بالعمارة متعاقد عليها بالفعل بموجب عقد سابق.`
              : `This apartment (${targetUnit.unit_number}) is already contracted under a previous contract.`
            );
            return;
          }
        }
      } else {
        const existingContract = data.contracts.find(c => 
          (c.property_id === prop.id || c.unit_id === prop.title_ar || c.unit_id === prop.title_en) && 
          (c.status === 'Active' || c.status === 'Completed') &&
          (c.is_whole_building_sale || !c.building_unit_id)
        );
        if (existingContract) {
          alert(isAr 
            ? `عفواً! هذا العقار متعاقد عليه بالكامل بالفعل بموجب العقد (${existingContract.contract_number}) باسم (${existingContract.buyer_name}). لا يمكن تحرير عقد بيع مكرر لنفس العقار إلا بعد فسخ العقد السابق أولاً.`
            : `This property is already sold under active contract ${existingContract.contract_number} for ${existingContract.buyer_name}.`
          );
          return;
        }
      }
    }

    const targetPeriod = resolvePeriodForDate(targetFirstPaymentDate, data.periods, activePeriod);
    if (!ensureActivePeriodOpen(isAr ? 'تحرير عقد بيع جديد' : 'New Contract', targetPeriod)) return;

    setIsMutating(true);
    try {
      const contractValue = targetTotalNominalValue ? D(targetTotalNominalValue).toFixed(2) : (prop ? D(prop.price_egp).toFixed(2) : '0.00');
      const contractNumber = `ZF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const dpDec = D(targetDpAmount ?? 0);
      let effectiveDpPct: Decimal | string = downPaymentPct;
      if (D(contractValue).gt(0) && dpDec.gte(0)) {
        effectiveDpPct = dpDec.div(D(contractValue));
      }
      let effectiveNumInstallments = parseInt(targetNumInstallments, 10);
      if (isNaN(effectiveNumInstallments) || effectiveNumInstallments < 0) {
        effectiveNumInstallments = 0;
      }
      let intervalMonths: number | string = targetInstallmentFrequency;

      if (targetPaymentPlanType === 'FULL_CASH') {
        effectiveDpPct = '1.00';
        effectiveNumInstallments = 0;
      } else if (targetPaymentPlanType === 'UPFRONT_HANDOVER') {
        effectiveNumInstallments = 1;
        intervalMonths = 12;
      }

      const contractId = generateUUID();

      const schedules = ContractsEngine.generateSchedule(
        contractId,
        contractValue,
        effectiveDpPct,
        effectiveNumInstallments,
        targetFirstPaymentDate,
        intervalMonths,
        targetFirstInstallmentDueDate
      );
      const dpSchedule = schedules[0];
      const dpAmount = dpSchedule ? dpSchedule.nominal_value : '0.00';

      if (dpSchedule && D(dpAmount).gt(0)) {
        dpSchedule.status = 'Paid';
        dpSchedule.amount_paid = dpAmount;
        dpSchedule.paid_date = targetFirstPaymentDate;
      }

      let cumulativeSplitShare = D(0);
      let cumulativeCashShare = D(0);
      const calculatedSplits = targetPartnerSplits.map((p, idx) => {
        const isLast = idx === targetPartnerSplits.length - 1;
        const pct = D(p.sharePct || 0).div(100);
        let sAmount: Decimal;
        let cAmount: Decimal;
        if (isLast && targetPartnerSplits.length > 1) {
          sAmount = D(contractValue).minus(cumulativeSplitShare);
          cAmount = D(dpAmount).minus(cumulativeCashShare);
        } else {
          sAmount = D(contractValue).times(pct);
          cAmount = D(dpAmount).times(pct);
          cumulativeSplitShare = cumulativeSplitShare.plus(sAmount);
          cumulativeCashShare = cumulativeCashShare.plus(cAmount);
        }
        return {
          partner_name: p.partnerName,
          share_percentage: `${p.sharePct}%`,
          share_amount: sAmount.toFixed(2),
          cash_share: cAmount.toFixed(2)
        };
      });

      let finalLeadId = targetLeadId;
      if (targetLeadSelectionMode === 'NEW_LEAD' && targetBuyerName) {
        finalLeadId = await ERPSupabaseService.registerLeadFromContract(supabase, {
          name: targetBuyerName,
          phone: targetBuyerPhone,
          email: targetBuyerEmail,
          property_id: (isCustom || !prop?.id || !isUUID(prop.id)) ? undefined : prop.id,
          contractNumber: contractNumber
        });
      }

      const isBuilding = prop?.type === 'building' || (prop?.title_ar || '').includes('عمارة') || (prop?.title_en || '').toLowerCase().includes('building');
      let finalUnitId = isCustom ? targetCustomUnitName : (prop?.title_ar || prop?.title_en || 'Unit');
      if (isBuilding && !targetIsWholeBuildingContract && targetBuildingUnitNumber) {
        finalUnitId = `${finalUnitId} - ${targetBuildingUnitNumber}`;
      }

      const isVaultCash = (targetDestinationTreasury === '101000' || targetDestinationTreasury === 'SAFE_101000');

      const contract: ERPContract = {
        contract_id: contractId,
        contract_number: contractNumber,
        unit_id: finalUnitId.slice(0, 50),
        property_id: (isCustom || !prop?.id || !isUUID(prop.id)) ? undefined : prop.id,
        lead_id: (finalLeadId && isUUID(finalLeadId)) ? finalLeadId : undefined,
        buyer_name: targetBuyerName,
        buyer_phone: targetBuyerPhone || undefined,
        buyer_email: targetBuyerEmail || undefined,
        buyer_national_id: targetBuyerNationalId,
        base_price: targetBasePrice ? D(targetBasePrice).toFixed(2) : (prop ? D(prop.price_egp).toFixed(2) : contractValue),
        tax_amount: targetTaxAmount ? D(targetTaxAmount).toFixed(2) : '0.00',
        gross_contract_value: contractValue,
        currency: 'EGP',
        exchange_rate: '1.0000',
        contract_date: targetFirstPaymentDate,
        handover_status: (targetPaymentPlanType === 'FULL_CASH' && prop?.completion_status === 'ready') ? 'Delivered' : 'Pending',
        total_cash_collected: D(dpAmount).gt(0) ? dpAmount : '0.00',
        status: 'Active',
        payment_plan_type: targetPaymentPlanType,
        partner_splits: calculatedSplits,
        is_whole_building_sale: isBuilding ? targetIsWholeBuildingContract : undefined,
        building_unit_id: isBuilding && !targetIsWholeBuildingContract ? targetBuildingUnitId : undefined,
        building_unit_number: isBuilding && !targetIsWholeBuildingContract ? targetBuildingUnitNumber : undefined
      };

      const dpEntry = D(dpAmount).gt(0)
        ? ContractsEngine.createAdvancePaymentEntry(
            contract,
            dpAmount,
            targetPeriod,
            targetFirstPaymentDate,
            isVaultCash
          )
        : undefined;

      await ERPSupabaseService.persistNewContract(supabase, contract, schedules, dpEntry);

      if (isBuilding && !targetIsWholeBuildingContract && targetBuildingUnitId && prop?.id) {
        await ERPSupabaseService.updateBuildingUnitStatus(
          supabase,
          prop.id,
          targetBuildingUnitId,
          'contracted',
          contractId,
          contractNumber,
          targetBuyerName
        );
        await ERPSupabaseService.updateBuildingUnitTax(
          supabase,
          prop.id,
          targetBuildingUnitId,
          parseFloat(targetTaxAmount) || 0,
          targetTaxNotes || (isAr ? 'ضريبة ورسوم محددة يدوياً للشقة' : 'Manual Apartment Tax')
        );
      }

      setShowNewContractModal(false);
      setContractWizardStep(1);
      setSelectedPropertyId('');
      setSelectedLeadId('');
      setBuyerName('');
      setBuyerPhone('');
      setBuyerEmail('');
      setBuyerNationalId('');
      setCustomPrice('');
      setBasePriceInput('');
      setApartmentTaxInput('0');
      setApartmentTaxDesc('');
      setIsWholeBuildingContract(false);
      setSelectedBuildingUnitId(undefined);
      setSelectedBuildingUnitNumber(undefined);
      await loadLiveData();

      const localizedBuyer = isAr ? localizeBuyerName(targetBuyerName) : targetBuyerName;

      toast.success(
        isAr ? `تم تحرير وحفظ العقد بنجاح` : `Contract created successfully`,
        {
          description: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(184, 144, 62, 0.1)',
                  color: '#946f23',
                  border: '1px solid rgba(184, 144, 62, 0.22)',
                  padding: '0.12rem 0.55rem',
                  borderRadius: '6px',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {D(contractValue).formatEGP(isAr)}
                </span>
                <span style={{
                  background: '#f8fafc',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  padding: '0.12rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  fontFamily: 'monospace'
                }}>
                  #{contractNumber}
                </span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <span>{isAr ? 'العميل:' : 'Client:'}</span>
                <strong style={{ color: '#0f172a', fontWeight: 800 }}>{localizedBuyer}</strong>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span>{isAr ? 'تم توليد جدول الأقساط وقيد اليومية' : 'Schedules & GL generated'}</span>
              </div>
            </div>
          ),
          duration: 5000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      toast.error(isAr ? 'فشل تحرير العقد' : 'Contract creation failed', { description: msg });
    } finally {
      setIsMutating(false);
    }
  }, [
    selectedPropertyId,
    selectedBuildingUnitId,
    selectedBuildingUnitNumber,
    isWholeBuildingContract,
    customUnitName,
    buyerName,
    buyerNationalId,
    buyerPhone,
    buyerEmail,
    basePriceInput,
    apartmentTaxInput,
    apartmentTaxDesc,
    customPrice,
    paymentPlanType,
    numInstallments,
    firstPaymentDate,
    partnerSplits,
    cashRoutingAccount,
    selectedLeadId,
    leadSelectionMode,
    downPaymentPct,
    data.properties,
    data.contracts,
    isAr,
    supabase,
    activePeriod,
    loadLiveData
  ]);

  // Handler: Execute Escalation
  const handleExecuteEscalation = useCallback(async (
    overrideContract?: ERPContract, 
    deltaParam?: string, 
    reasonParam?: string
  ) => {
    const contract = overrideContract || showEscalationModal;
    if (!contract) return;
    const delta = deltaParam ?? escalationDelta;
    const reason = reasonParam ?? escalationReason;

    const todayStr = new Date().toISOString().split('T')[0];
    const targetPeriod = resolvePeriodForDate(todayStr, data.periods, activePeriod);

    if (contract.handover_status === 'Delivered' && !ensureActivePeriodOpen(isAr ? 'تعديل أسعار العقد' : 'Price Escalation', targetPeriod)) {
      return;
    }

    setIsMutating(true);
    try {
      const contractSchedules = data.schedules.filter(s => s.contract_id === contract.contract_id);

      const result = EscalationEngine.applyEscalation(
        contract,
        contractSchedules,
        delta,
        reason,
        todayStr,
        'CFO_FARID'
      );

      const supersededIds = contractSchedules.filter(s => s.status === 'Pending').map(s => s.schedule_id);
      const newSchedules = result.allSchedules.filter(s => s.status === 'Pending');

      await ERPSupabaseService.persistEscalation(
        supabase,
        contract.contract_id,
        result.amendment,
        result.updatedContract.gross_contract_value,
        supersededIds,
        newSchedules
      );

      let adjustingEntry: ERPJournalEntry | undefined;
      if (contract.handover_status === 'Delivered') {
        const deltaD = D(delta);
        adjustingEntry = GeneralLedgerEngine.validateAndCreateEntry({
          entry_number: `JE-ADJ-ESC-${contract.contract_number}-${result.amendment.new_version}`,
          entry_date: todayStr,
          period: targetPeriod,
          description: `Contract Price Escalation Adjustment (Post-Handover) for ${contract.contract_number} (Delta V: ${deltaD.toFixed(2)})`,
          source_module: 'ESCALATION',
          source_entity_id: contract.contract_id,
          created_by: 'CFO_FARID',
          lines: [
            {
              account_code: '103000',
              debit_amount: deltaD.toFixed(2),
              credit_amount: '0.00',
              contract_id: contract.contract_id,
              unit_id: contract.unit_id,
              memo: `Incremental Accounts Receivable from Escalation Amendment v${result.amendment.new_version}`
            },
            {
              account_code: '401000',
              debit_amount: '0.00',
              credit_amount: deltaD.toFixed(2),
              contract_id: contract.contract_id,
              unit_id: contract.unit_id,
              memo: `Incremental Realized Sales Revenue from Escalation Amendment v${result.amendment.new_version}`
            }
          ]
        });
        await ERPSupabaseService.persistJournalEntry(supabase, adjustingEntry);
      }

      setData(prev => ({
        ...prev,
        contracts: prev.contracts.map(c => 
          c.contract_id === contract.contract_id ? result.updatedContract : c
        ),
        schedules: [
          ...prev.schedules.filter(s => s.contract_id !== contract.contract_id),
          ...result.allSchedules
        ],
        journalEntries: adjustingEntry ? [adjustingEntry, ...prev.journalEntries] : prev.journalEntries,
        amendments: [result.amendment, ...prev.amendments]
      }));

      const updatedDataset = await loadLiveData(true);
      if (updatedDataset && inspectorPayload?.type === 'contract' && inspectorPayload.contract.contract_id === contract.contract_id) {
        const updatedContract = updatedDataset.contracts.find(c => c.contract_id === contract.contract_id) || contract;
        const updatedSchedules = updatedDataset.schedules.filter(s => s.contract_id === contract.contract_id);
        setInspectorPayload({
          ...inspectorPayload,
          contract: updatedContract,
          schedules: updatedSchedules
        });
      }

      toast.success(
        isAr ? `تم تعديل أسعار وبنود العقد #${contract.contract_number} بنجاح` : `Contract #${contract.contract_number} amended successfully`,
        {
          description: isAr
            ? `قيمة الفارق: ${D(delta).gte(0) ? '+' : ''}${D(delta).formatEGP(true)} • تم تحديث جدول الأقساط`
            : `Delta: ${D(delta).formatEGP(false)} • Schedules updated`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      console.error('Failed to apply price escalation:', err);
      const msg = (err as Error).message || String(err);
      if (msg.includes('Invariant 0.9')) {
        toast.error(
          isAr ? 'تعذر إتمام تعديل العقد: الفترة المحاسبية مقفلة' : 'Failed to execute escalation: Period locked',
          {
            description: msg,
            action: {
              label: isAr ? 'إلغاء قفل الفترة' : 'Unlock Period',
              onClick: () => handleTogglePeriodStatus(targetPeriod.period_id, 'OPEN')
            },
            duration: 8000
          }
        );
      } else {
        toast.error(isAr ? 'تعذر إتمام تعديل العقد' : 'Failed to execute escalation', {
          description: msg
        });
      }
    } finally {
      setIsMutating(false);
    }
  }, [showEscalationModal, escalationDelta, escalationReason, data.schedules, data.periods, supabase, activePeriod, loadLiveData, inspectorPayload, isAr, ensureActivePeriodOpen, handleTogglePeriodStatus]);

  // Handler: Execute Rescission
  const handleExecuteRescission = useCallback(async (overrideContract?: ERPContract) => {
    const contract = overrideContract || showRescissionModal;
    if (!contract) return;

    const targetPeriod = resolvePeriodForDate(rescissionDate, data.periods, activePeriod);
    if (!ensureActivePeriodOpen(isAr ? 'فسخ العقد' : 'Contract Rescission', targetPeriod)) {
      return;
    }

    setIsMutating(true);
    try {
      const contractSchedules = data.schedules.filter(s => s.contract_id === contract.contract_id);

      const handoverEntry = data.journalEntries.find(j => 
        j.entry_number === `JE-HANDOVER-${contract.contract_number}` ||
        (j.source_module === 'SALES' && j.source_entity_id === contract.contract_id && j.entry_number.startsWith('JE-HANDOVER'))
      );

      const result = RescissionEngine.processRescission(
        contract,
        contractSchedules,
        targetPeriod,
        rescissionDate,
        handoverEntry ? undefined : D(contract.gross_contract_value).times('0.45').toFixed(),
        '501000',
        '151000',
        'CFO_FARID',
        handoverEntry
      );

      const voidIds = contractSchedules
        .filter(s => s.status === 'Pending' || s.status === 'SUPERSEDED')
        .map(s => s.schedule_id);

      await ERPSupabaseService.persistRescission(
        supabase,
        contract.contract_id,
        result.rescissionRecord,
        result.journalEntry,
        voidIds
      );

      setData(prev => ({
        ...prev,
        contracts: prev.contracts.map(c => 
          c.contract_id === contract.contract_id ? { ...c, status: 'Rescinded' as const } : c
        ),
        schedules: prev.schedules.map(s => {
          if (s.contract_id === contract.contract_id && (s.status === 'Pending' || s.status === 'SUPERSEDED')) {
            return { ...s, status: 'Void' as const };
          }
          return s;
        }),
        pdcRecords: prev.pdcRecords.map(p => {
          if (p.contract_id === contract.contract_id && (p.status === 'In Safe' || p.status === 'Deposited')) {
            return { ...p, status: 'Void' as const };
          }
          return p;
        }),
        journalEntries: [result.journalEntry, ...prev.journalEntries],
        rescissions: [result.rescissionRecord, ...prev.rescissions]
      }));

      setRescissionStep(0);
      if (inspectorPayload?.type === 'contract' && inspectorPayload.contract.contract_id === contract.contract_id) {
        setInspectorPayload(null);
      }
      await loadLiveData();
      navigateToTab('rescissions');

      toast.success(
        isAr ? `تم فسخ العقد #${contract.contract_number} وإثبات التسوية المالية بنجاح` : `Contract #${contract.contract_number} rescinded successfully`,
        {
          description: isAr
            ? `تم خصم غرامة الفسخ وإثبات المسترد وإلغاء الأقساط والمستحقات المتبقية`
            : `Rescission penalty retained and pending installments cancelled`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message || String(err);
      if (msg.includes('Invariant 0.9')) {
        toast.error(
          isAr ? 'فشل فسخ العقد: الفترة المحاسبية مقفلة' : 'Contract rescission failed: Period locked',
          {
            description: msg,
            action: {
              label: isAr ? 'إلغاء قفل الفترة' : 'Unlock Period',
              onClick: () => handleTogglePeriodStatus(targetPeriod.period_id, 'OPEN')
            },
            duration: 8000
          }
        );
      } else {
        toast.error(isAr ? 'فشل فسخ العقد' : 'Contract rescission failed', { description: msg });
      }
    } finally {
      setIsMutating(false);
    }
  }, [showRescissionModal, data.schedules, data.journalEntries, data.periods, activePeriod, rescissionDate, supabase, inspectorPayload, loadLiveData, navigateToTab, isAr, ensureActivePeriodOpen, handleTogglePeriodStatus]);


  // Handler: Collect Payment
  const handleCollectPayment = useCallback(async (details?: {
    receiptDate?: string;
    destinationTreasury?: 'SAFE_101000' | 'BANK_102000';
    paymentMethod?: 'CASH' | 'INSTAPAY';
    notes?: string;
  }) => {
    if (!showPayModal) return;
    const payDate = details?.receiptDate || new Date().toISOString().split('T')[0];
    const targetPeriod = resolvePeriodForDate(payDate, data.periods, activePeriod);
    if (!ensureActivePeriodOpen(isAr ? 'تحصيل قسط' : 'Collect Installment', targetPeriod)) return;

    setIsMutating(true);
    try {
      const { contract, schedule } = showPayModal;
      const amount = schedule.nominal_value;
      const isInstaPay = details?.paymentMethod === 'INSTAPAY' || details?.destinationTreasury === 'BANK_102000';
      // UNIFIED OPERATING TREASURY DESTINATION: Both Cash and InstaPay deposit into Account 101000
      const targetAccount = '101000';
      const notes = details?.notes || '';

      const isDelivered = contract.handover_status === 'Delivered';
      const creditAccount = isDelivered ? '103000' : '203000';

      const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const uniqueTime = Date.now().toString(36).toUpperCase().slice(-4);
      const prefix = isInstaPay ? 'JE-IP' : 'JE-RCP';
      const entryNumber = `${prefix}-${contract.contract_number}-T${schedule.tranche_number}-${uniqueTime}${randSuffix}`;

      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: entryNumber,
        entry_date: payDate,
        period: targetPeriod,
        description: isAr 
          ? (isInstaPay
              ? (schedule.tranche_number === 0
                  ? `تحصيل دفعة مقدم التعاقد (قسط 0) عبر إنستاباي بالخزينة الرئيسية - عقد رقم ${contract.contract_number}${notes ? ` (${notes})` : ''}`
                  : `تحصيل القسط رقم ${schedule.tranche_number} عبر إنستاباي بالخزينة الرئيسية - عقد رقم ${contract.contract_number}${notes ? ` (${notes})` : ''}`)
              : (schedule.tranche_number === 0
                  ? `تحصيل دفعة مقدم التعاقد (قسط 0) نقداً بالخزينة - عقد رقم ${contract.contract_number}${notes ? ` (${notes})` : ''}`
                  : `تحصيل القسط رقم ${schedule.tranche_number} نقداً بالخزينة - عقد رقم ${contract.contract_number}${notes ? ` (${notes})` : ''}`))
          : `Installment #${schedule.tranche_number} collected via ${isInstaPay ? 'InstaPay' : 'Cash'} into Treasury - Contract ${contract.contract_number}`,
        source_module: 'SALES',
        source_entity_id: contract.contract_id,
        created_by: 'CFO_FARID',
        lines: [
          {
            account_code: targetAccount,
            debit_amount: amount,
            credit_amount: '0.00',
            memo: isAr 
              ? (isInstaPay 
                  ? `تحصيل إلكتروني فوري (إنستاباي) بالخزينة الرئيسية للعقد ${contract.contract_number}`
                  : `توريد نقدي لخزينة الشركة الرئيسية للعقد ${contract.contract_number}`)
              : `Collection into Treasury Safe (${isInstaPay ? 'InstaPay' : 'Cash'}) for Contract ${contract.contract_number}`
          },
          {
            account_code: creditAccount,
            debit_amount: '0.00',
            credit_amount: amount,
            memo: isDelivered 
              ? (isAr ? 'تسوية مديونية باقي ثمن الشقة على العميل' : 'Settlement of Customer Accounts Receivable') 
              : (isAr ? 'إثبات إيراد تعاقدي مؤجل لحين التسليم' : 'Credit to Deferred Contract Revenue')
          }
        ]
      });

      await ERPSupabaseService.persistTranchePayment(supabase, contract.contract_id, schedule.schedule_id, amount, entry);

      const updatedDataset = await loadLiveData(true);

      if (updatedDataset && inspectorPayload?.type === 'contract' && inspectorPayload.contract.contract_id === contract.contract_id) {
        const updatedContract = updatedDataset.contracts.find(c => c.contract_id === contract.contract_id) || contract;
        const updatedSchedules = updatedDataset.schedules.filter(s => s.contract_id === contract.contract_id);
        const updatedEntries = updatedDataset.journalEntries.filter(e => 
          e.lines.some(l => l.contract_id === contract.contract_id)
        );
        const updatedAmendments = updatedDataset.amendments?.filter(a => a.contract_id === contract.contract_id) || [];
        setInspectorPayload({
          type: 'contract',
          contract: updatedContract,
          schedules: updatedSchedules,
          amendments: updatedAmendments,
          latestJournalEntry: updatedEntries[0],
          allJournalEntries: updatedEntries
        });
      }

      const localizedBuyer = isAr ? localizeBuyerName(contract.buyer_name || 'عميل مباشر') : (contract.buyer_name || 'Direct Client');

      toast.success(
        isInstaPay
          ? (isAr ? `تم تحصيل القسط #${schedule.tranche_number} عبر إنستاباي` : `Installment #${schedule.tranche_number} via InstaPay`)
          : (isAr ? `تم توريد القسط #${schedule.tranche_number} للخزينة` : `Installment #${schedule.tranche_number} into Safe`),
        {
          description: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(5, 150, 105, 0.1)',
                  color: '#047857',
                  border: '1px solid rgba(5, 150, 105, 0.22)',
                  padding: '0.12rem 0.55rem',
                  borderRadius: '6px',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  +{D(amount).formatEGP(isAr)}
                </span>
                <span style={{
                  background: '#f8fafc',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  padding: '0.12rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  fontFamily: 'monospace'
                }}>
                  #{contract.contract_number}
                </span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <span>{isAr ? 'العميل:' : 'Client:'}</span>
                <strong style={{ color: '#0f172a', fontWeight: 800 }}>{localizedBuyer}</strong>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span>{isAr ? 'تم ترحيل القيد لليومية بنجاح' : 'Posted to GL'}</span>
              </div>
            </div>
          ),
          duration: 5000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (msg.includes('Invariant 0.9')) {
        const payDate = details?.receiptDate || new Date().toISOString().split('T')[0];
        const targetPeriod = resolvePeriodForDate(payDate, data.periods, activePeriod);
        ensureActivePeriodOpen(isAr ? 'تحصيل قسط' : 'Collect Installment', targetPeriod);
      } else {
        toast.error(isAr ? 'فشل تحصيل القسط' : 'Failed to collect installment', { description: msg });
      }
    } finally {
      setIsMutating(false);
    }
  }, [showPayModal, data.periods, activePeriod, isAr, supabase, loadLiveData, inspectorPayload, ensureActivePeriodOpen]);

  // Handler: Confirm Handover
  const handleConfirmHandover = useCallback(async (contract: ERPContract, handoverDate: string, rsvWipCost: Decimal | string) => {
    const targetPeriod = resolvePeriodForDate(handoverDate, data.periods, activePeriod);
    if (!ensureActivePeriodOpen(isAr ? 'تسليم الوحدة' : 'Unit Handover', targetPeriod)) return;
    setIsMutating(true);
    try {
      const entry = ContractsEngine.createHandoverModelBEntry(
        contract,
        targetPeriod,
        handoverDate,
        rsvWipCost,
        '501000',
        '151000',
        'CFO_FARID'
      );

      await ERPSupabaseService.persistJournalEntry(supabase, entry);
      await ERPSupabaseService.updateContractHandoverStatus(supabase, contract.contract_id, 'Delivered', handoverDate);

      const updatedDataset = await loadLiveData(true);
      if (updatedDataset && inspectorPayload?.type === 'contract' && inspectorPayload.contract.contract_id === contract.contract_id) {
        const updatedContract = updatedDataset.contracts.find(c => c.contract_id === contract.contract_id) || { ...contract, handover_status: 'Delivered' as const, handover_date: handoverDate };
        const updatedSchedules = updatedDataset.schedules.filter(s => s.contract_id === contract.contract_id);
        const updatedAmendments = updatedDataset.amendments?.filter(a => a.contract_id === contract.contract_id) || [];
        const updatedEntries = updatedDataset.journalEntries.filter(j => j.lines.some(l => l.contract_id === contract.contract_id));
        setInspectorPayload({
          type: 'contract',
          contract: updatedContract,
          schedules: updatedSchedules,
          amendments: updatedAmendments,
          allJournalEntries: updatedEntries,
          latestJournalEntry: entry
        });
      }

      setData(prev => ({
        ...prev,
        contracts: prev.contracts.map(c => c.contract_id === contract.contract_id ? { ...c, handover_status: 'Delivered' as const, handover_date: handoverDate } : c),
        journalEntries: [entry, ...prev.journalEntries]
      }));

      setShowHandoverModal(null);
      toast.success(
        isAr ? 'تم اعتماد محضر الاستلام وترحيل قيود الإيراد (Model B) بنجاح' : 'Unit handover certified & Model B revenue recognized',
        {
          description: isAr
            ? `العقد: #${contract.contract_number} • الوحدة: ${contract.unit_id}`
            : `Contract: #${contract.contract_number} • Unit: ${contract.unit_id}`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (msg.includes('Invariant 0.9')) {
        ensureActivePeriodOpen(isAr ? 'تسليم الوحدة' : 'Unit Handover', targetPeriod);
      } else {
        toast.error(isAr ? 'فشل إتمام إجراءات التسليم' : 'Failed to execute handover', { description: msg });
      }
    } finally {
      setIsMutating(false);
    }
  }, [data.periods, activePeriod, supabase, loadLiveData, inspectorPayload, isAr, ensureActivePeriodOpen]);

  // Handler: Toggle Contract Handover Status
  const handleToggleContractHandover = useCallback(async (contract: ERPContract) => {
    const nextStatus = contract.handover_status === 'Delivered' ? 'Pending' : 'Delivered';
    setIsMutating(true);
    try {
      await ERPSupabaseService.updateContractHandoverStatus(supabase, contract.contract_id, nextStatus);
      const updatedDataset = await loadLiveData(true);
      if (updatedDataset && inspectorPayload?.type === 'contract' && inspectorPayload.contract.contract_id === contract.contract_id) {
        const updatedContract = updatedDataset.contracts.find(c => c.contract_id === contract.contract_id) || { ...contract, handover_status: nextStatus };
        setInspectorPayload({
          ...inspectorPayload,
          contract: updatedContract
        });
      }

      toast.success(
        nextStatus === 'Delivered'
          ? (isAr ? `تم تسليم الوحدة وإثبات الاستلام رسمياً` : `Unit handed over and delivered`)
          : (isAr ? `تمت إعادة حالة الاستلام إلى معلق` : `Handover status reverted to pending`),
        {
          description: isAr
            ? `العقد: #${contract.contract_number} • الوحدة: ${contract.unit_id}`
            : `Contract: #${contract.contract_number} • Unit: ${contract.unit_id}`,
          duration: 4000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      toast.error(isAr ? 'فشل تغيير حالة الاستلام' : 'Failed to update handover status', { description: msg });
    } finally {
      setIsMutating(false);
    }
  }, [supabase, loadLiveData, inspectorPayload, isAr]);

  // Handler: Confirm Bounce Cheque (with truthful reversal accounting and schedule default)
  const handleConfirmBounceCheque = useCallback(async (item: ERPPDCRecord) => {
    if (item.status === 'Bounced') {
      toast.info(isAr ? 'هذا الشيك مسجل كمرتد بالفعل' : 'Cheque is already recorded as Bounced');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const targetPeriod = resolvePeriodForDate(today, data.periods, activePeriod);
    if (!ensureActivePeriodOpen(isAr ? 'إثبات ارتداد الشيك' : 'Bounce Cheque', targetPeriod)) return;
    setIsMutating(true);
    try {
      const contract = data.contracts.find(c => 
        c.contract_id === item.contract_id || 
        c.contract_number === item.contract_id
      );
      const schedule = data.schedules.find(s => 
        (item.schedule_id && s.schedule_id === item.schedule_id) ||
        (s.contract_id === item.contract_id && s.due_date === item.due_date)
      );

      const isPreviouslyCleared = item.status === 'Cleared';
      const isDeposited = item.status === 'Deposited';
      let bounceEntry: ERPJournalEntry | null = null;

      if (isDeposited) {
        // Reversal of deposit transit: Dr 103200 (Safe Custody returned) / Cr 104000 (Clearance transit reversed)
        bounceEntry = GeneralLedgerEngine.validateAndCreateEntry({
          entry_number: `JE-PDC-BNC-${item.cheque_number || item.cheque_id.slice(0, 6)}`,
          entry_date: today,
          period: targetPeriod,
          description: isAr 
            ? `إثبات ارتداد بنكي للشيك #${item.cheque_number} - العميل: ${item.drawer_name}` 
            : `Cheque #${item.cheque_number} bounced after bank deposit - returned to safe: ${item.drawer_name}`,
          source_module: 'PDC',
          source_entity_id: item.cheque_id,
          created_by: 'CFO_FARID',
          lines: [
            {
              account_code: '103200',
              debit_amount: D(item.nominal_value).toFixed(2),
              credit_amount: '0.00',
              contract_id: item.contract_id,
              memo: isAr ? `إعادة قيد الشيك المرتد بالخزينة #${item.cheque_number}` : `Returned bounced cheque to safe #${item.cheque_number}`
            },
            {
              account_code: '104000',
              debit_amount: '0.00',
              credit_amount: D(item.nominal_value).toFixed(2),
              contract_id: item.contract_id,
              memo: isAr ? `عكس حساب برسم التحصيل للشيك المرتد #${item.cheque_number}` : `Reversed cheques under collection #${item.cheque_number}`
            }
          ]
        });
      } else if (isPreviouslyCleared) {
        // Reversal of clearance: Dr 203000 (Deferred Revenue) or 103000 (Accounts Receivable) / Cr 102000 (Operating Bank)
        const isDelivered = contract?.handover_status === 'Delivered';
        const debitAccount = isDelivered ? '103000' : '203000';
        bounceEntry = GeneralLedgerEngine.validateAndCreateEntry({
          entry_number: `JE-PDC-BNC-${item.cheque_number || item.cheque_id.slice(0, 6)}`,
          entry_date: today,
          period: targetPeriod,
          description: isAr 
            ? `إثبات ارتداد بنكي بعد التحصيل للشيك #${item.cheque_number} - العميل: ${item.drawer_name}` 
            : `Cheque #${item.cheque_number} bounced after clearance - client: ${item.drawer_name}`,
          source_module: 'PDC',
          source_entity_id: item.cheque_id,
          created_by: 'CFO_FARID',
          lines: [
            {
              account_code: debitAccount,
              debit_amount: D(item.nominal_value).toFixed(2),
              credit_amount: '0.00',
              contract_id: item.contract_id,
              memo: isAr 
                ? (isDelivered ? `إعادة قيد مديونية العميل بعد ارتداد الشيك` : `عكس الإيراد المؤجل بعد ارتداد الشيك`) 
                : `Reversed revenue / customer receivable after bounce`
            },
            {
              account_code: '102000',
              debit_amount: '0.00',
              credit_amount: D(item.nominal_value).toFixed(2),
              contract_id: item.contract_id,
              memo: isAr ? `خصم قيمة الشيك المرتد من حساب البنك التشغيلي #${item.cheque_number}` : `Bank deduction for bounced cheque #${item.cheque_number}`
            }
          ]
        });
      }

      await ERPSupabaseService.persistPDCStatus(supabase, item.cheque_id, 'Bounced');
      if (bounceEntry) {
        await ERPSupabaseService.persistJournalEntry(supabase, bounceEntry);
      }

      if (schedule) {
        const schUpdatePayload: Record<string, unknown> = {
          status: 'Defaulted'
        };
        if (isPreviouslyCleared) {
          schUpdatePayload.amount_paid = '0.00';
          schUpdatePayload.paid_date = null;
        }
        await supabase
          .from('erp_installment_schedules')
          .update(schUpdatePayload)
          .eq('schedule_id', schedule.schedule_id);
      }

      if (contract && isPreviouslyCleared) {
        const newTotalCash = Math.max(0, D(contract.total_cash_collected || '0').minus(item.nominal_value).toNumber()).toFixed(2);
        await supabase
          .from('erp_contracts')
          .update({ total_cash_collected: newTotalCash })
          .eq('contract_id', contract.contract_id);
      }

      setData(prev => ({
        ...prev,
        contracts: isPreviouslyCleared && contract
          ? prev.contracts.map(c => c.contract_id === item.contract_id ? { ...c, total_cash_collected: Math.max(0, D(c.total_cash_collected || '0').minus(item.nominal_value).toNumber()).toFixed(2) } : c)
          : prev.contracts,
        schedules: prev.schedules.map(s => 
          (schedule && s.schedule_id === schedule.schedule_id)
            ? { 
                ...s, 
                status: 'Defaulted' as const,
                amount_paid: isPreviouslyCleared ? '0.00' : s.amount_paid,
                paid_date: isPreviouslyCleared ? undefined : s.paid_date
              }
            : s
        ),
        pdcRecords: prev.pdcRecords.map(p => p.cheque_id === item.cheque_id ? { ...p, status: 'Bounced' as const } : p),
        journalEntries: bounceEntry ? [bounceEntry, ...prev.journalEntries] : prev.journalEntries
      }));

      await loadLiveData(true);

      toast.success(
        isAr ? 'تم إثبات ارتداد الشيك وترحيل القيد العكسي' : 'Cheque Marked as Bounced',
        {
          description: isAr
            ? `تم تحويل حالة الشيك #${item.cheque_number} للعميل (${item.drawer_name}) إلى مرتد، وقيد مديونية العجز دفترياً بنجاح.`
            : `Cheque #${item.cheque_number} marked as Bounced and reverse GL entry posted.`
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (msg.includes('Invariant 0.9')) {
        const today = new Date().toISOString().split('T')[0];
        const targetPeriod = resolvePeriodForDate(today, data.periods, activePeriod);
        ensureActivePeriodOpen(isAr ? 'إثبات ارتداد الشيك' : 'Bounce Cheque', targetPeriod);
      } else {
        toast.error(isAr ? 'تعذر إثبات ارتداد الشيك' : 'Failed to record bounce', { description: msg });
      }
    } finally {
      setIsMutating(false);
    }
  }, [supabase, loadLiveData, isAr, data.periods, data.contracts, data.schedules, activePeriod, ensureActivePeriodOpen]);

  // Handler: PDC Status Change
  const handlePDCStatusChange = useCallback(async (chequeId: string, newStatus: 'In Safe' | 'Deposited' | 'Cleared' | 'Bounced') => {
    const todayStr = new Date().toISOString().split('T')[0];
    const targetPeriod = resolvePeriodForDate(todayStr, data.periods, activePeriod);
    if (newStatus !== 'In Safe' && !ensureActivePeriodOpen(isAr ? 'تحديث حالة ورقة القبض' : 'PDC Status Change', targetPeriod)) return;
    setIsMutating(true);
    try {
      const cheque = data.pdcRecords.find(p => p.cheque_id === chequeId);
      if (!cheque) return;

      if (newStatus === 'Bounced') {
        await handleConfirmBounceCheque(cheque);
        return;
      }

      if (newStatus === 'Deposited') {
        const entry = GeneralLedgerEngine.validateAndCreateEntry({
          entry_number: `JE-PDC-DEP-${cheque.cheque_number}`,
          entry_date: todayStr,
          period: targetPeriod,
          description: isAr 
            ? `إيداع القسط / الشيك رقم ${cheque.cheque_number} برسم التحصيل البنكي` 
            : `Cheque / Installment #${cheque.cheque_number} deposited for bank collection`,
          source_module: 'PDC',
          source_entity_id: cheque.cheque_id,
          created_by: 'CFO_FARID',
          lines: [
            {
              account_code: '104000',
              debit_amount: cheque.nominal_value,
              credit_amount: '0.00',
              contract_id: cheque.contract_id,
              memo: isAr ? `إيداع برسم التحصيل للقسط رقم ${cheque.cheque_number}` : `Deposited under collection #${cheque.cheque_number}`
            },
            {
              account_code: '103200',
              debit_amount: '0.00',
              credit_amount: cheque.nominal_value,
              contract_id: cheque.contract_id,
              memo: isAr ? `صرف من عهدة الخزينة للقسط رقم ${cheque.cheque_number}` : `Cleared from Safe custody #${cheque.cheque_number}`
            }
          ]
        });

        await ERPSupabaseService.persistPDCStatus(supabase, chequeId, newStatus);
        await ERPSupabaseService.persistJournalEntry(supabase, entry);

        setData(prev => ({
          ...prev,
          pdcRecords: prev.pdcRecords.map(p => p.cheque_id === chequeId ? { ...p, status: 'Deposited' as const, deposited_date: todayStr } : p),
          journalEntries: [entry, ...prev.journalEntries]
        }));
      } else if (newStatus === 'Cleared') {
        const linkedSchedule = data.schedules.find(s => 
          (cheque.schedule_id && s.schedule_id === cheque.schedule_id) ||
          (s.contract_id === cheque.contract_id && s.due_date === cheque.due_date)
        );
        const linkedContract = data.contracts.find(c => 
          c.contract_id === cheque.contract_id || 
          c.contract_number === cheque.contract_id
        );
        const isDelivered = linkedContract?.handover_status === 'Delivered';
        const isPreHandoverInstallment = !isDelivered && Boolean(linkedSchedule || cheque.schedule_id || linkedContract);
        const creditAccount = isDelivered ? '103000' : (isPreHandoverInstallment ? '203000' : '103200');
        const debitAccount = cheque.status === 'Deposited' ? '102000' : '101000';

        const entry = GeneralLedgerEngine.validateAndCreateEntry({
          entry_number: `JE-PDC-CLR-${cheque.cheque_number}`,
          entry_date: todayStr,
          period: targetPeriod,
          description: isAr 
            ? (isDelivered 
                ? `تحصيل قسط بعد التسليم - ورقة قبض #${cheque.cheque_number} - عقد ${linkedContract?.contract_number || ''}` 
                : (isPreHandoverInstallment
                    ? `تحصيل قسط تعاقدي - إيراد مؤجل - ورقة قبض #${cheque.cheque_number} - عقد ${linkedContract?.contract_number || ''}`
                    : `تحصيل وتوريد القسط رقم ${cheque.cheque_number} كاش باليد لخزينة الشركة`))
            : (isDelivered
                ? `Post-handover installment collection - Note #${cheque.cheque_number} - Contract ${linkedContract?.contract_number || ''}`
                : `Installment #${cheque.cheque_number} cleared`),
          source_module: 'PDC',
          source_entity_id: cheque.cheque_id,
          created_by: 'CFO_FARID',
          lines: [
            {
              account_code: debitAccount,
              debit_amount: cheque.nominal_value,
              credit_amount: '0.00',
              contract_id: cheque.contract_id,
              memo: isAr 
                ? (debitAccount === '102000' ? `تحصيل بنكي بحساب البنك للشيك ${cheque.cheque_number}` : `توريد كاش باليد لخزينة الشركة للقسط ${cheque.cheque_number}`)
                : `Installment #${cheque.cheque_number} funds collected`
            },
            {
              account_code: creditAccount,
              debit_amount: '0.00',
              credit_amount: cheque.nominal_value,
              contract_id: cheque.contract_id,
              memo: isDelivered
                ? (isAr ? `تسوية باقي أقساط الشقة بعد التسليم (103000)` : `Credit Accounts Receivable post-handover`)
                : (isPreHandoverInstallment
                    ? (isAr ? `إثبات إيراد تعاقدي مؤجل للوحدة قيد الإنشاء (203000)` : `Credit Deferred Contract Revenue pre-handover`)
                    : (isAr ? `صرف وتسوية القسط رقم ${cheque.cheque_number} من عهدة الخزينة` : `Installment #${cheque.cheque_number} cleared from Safe custody`))
            }
          ]
        });

        if (linkedSchedule && linkedContract) {
          await ERPSupabaseService.persistTranchePayment(
            supabase,
            linkedContract.contract_id,
            linkedSchedule.schedule_id,
            cheque.nominal_value,
            entry
          );
          await ERPSupabaseService.persistPDCStatus(supabase, chequeId, 'Cleared');
        } else {
          await ERPSupabaseService.persistPDCStatus(supabase, chequeId, newStatus);
          await ERPSupabaseService.persistJournalEntry(supabase, entry);
        }

        setData(prev => ({
          ...prev,
          pdcRecords: prev.pdcRecords.map(p => p.cheque_id === chequeId ? { ...p, status: 'Cleared' as const, cleared_date: todayStr } : p),
          schedules: linkedSchedule
            ? prev.schedules.map(s => s.schedule_id === linkedSchedule.schedule_id ? { ...s, status: 'Paid' as const, amount_paid: cheque.nominal_value, paid_date: todayStr } : s)
            : prev.schedules,
          contracts: linkedContract
            ? prev.contracts.map(c => c.contract_id === linkedContract.contract_id ? { ...c, total_cash_collected: D(c.total_cash_collected || 0).plus(cheque.nominal_value).toFixed(2) } : c)
            : prev.contracts,
          journalEntries: [entry, ...prev.journalEntries]
        }));
      } else {
        await ERPSupabaseService.persistPDCStatus(supabase, chequeId, newStatus);
        setData(prev => ({
          ...prev,
          pdcRecords: prev.pdcRecords.map(p => p.cheque_id === chequeId ? { ...p, status: newStatus } : p)
        }));
      }

      const updatedDataset = await loadLiveData(true);
      if (updatedDataset && inspectorPayload?.type === 'cheque' && inspectorPayload.cheque.cheque_id === chequeId) {
        const updatedCheque = updatedDataset.pdcRecords.find(p => p.cheque_id === chequeId);
        if (updatedCheque) {
          const linkedContract = updatedDataset.contracts.find(c => c.contract_id === updatedCheque.contract_id);
          const linkedSchedule = updatedDataset.schedules.find(s => s.schedule_id === updatedCheque.schedule_id);
          const clearingJournalEntry = updatedDataset.journalEntries.find(j => 
            j.source_entity_id === updatedCheque.cheque_id || 
            (updatedCheque.cheque_number && j.description && j.description.includes(updatedCheque.cheque_number))
          );
          setInspectorPayload({
            type: 'cheque',
            cheque: updatedCheque,
            linkedContract,
            linkedSchedule,
            clearingJournalEntry
          });
        }
      }

      const statusLabelsAr: Record<string, string> = {
        'Cleared': 'تم تحصيل القسط وتوريد قيمته بنجاح',
        'Deposited': 'تم تسجيل القسط بانتظار تحويل إنستاباي',
        'In Safe': 'تم إرجاع القسط إلى أمانات الخزنة',
        'Bounced': 'تم إثبات تعثر / رفض القسط'
      };
      const statusLabelsEn: Record<string, string> = {
        'Cleared': 'Installment collected and settled successfully',
        'Deposited': 'Installment awaiting InstaPay transfer',
        'In Safe': 'Installment returned to safe agenda',
        'Bounced': 'Installment marked as defaulted'
      };
      toast.success(
        isAr ? (statusLabelsAr[newStatus] || 'تم تحديث حالة القسط') : (statusLabelsEn[newStatus] || 'Installment status updated'),
        {
          description: isAr
            ? `إيصال/سند #${cheque.cheque_number} • القيمة: ${D(cheque.nominal_value).formatEGP(true)} • العميل: ${cheque.drawer_name}`
            : `Installment #${cheque.cheque_number} • Value: ${D(cheque.nominal_value).formatEGP(false)} • Client: ${cheque.drawer_name}`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (msg.includes('Invariant 0.9')) {
        const todayStr = new Date().toISOString().split('T')[0];
        const targetPeriod = resolvePeriodForDate(todayStr, data.periods, activePeriod);
        ensureActivePeriodOpen(isAr ? 'تحديث حالة ورقة القبض' : 'PDC Status Change', targetPeriod);
      } else {
        toast.error(isAr ? 'فشل تحديث حالة القسط' : 'Failed to update installment status', { description: msg });
      }
    } finally {
      setIsMutating(false);
    }
  }, [data.pdcRecords, data.schedules, data.contracts, data.periods, activePeriod, isAr, supabase, loadLiveData, inspectorPayload, ensureActivePeriodOpen, handleConfirmBounceCheque]);

  // Handler: Contract Supplement
  const handleSaveContractSupplement = useCallback(async (supplementData: SupplementData) => {
    setIsMutating(true);
    try {
      const targetContract = data.contracts.find(c => c.contract_id === supplementData.contractId);
      if (!targetContract) {
        throw new Error(isAr ? 'العقد المختار غير موجود في قاعدة البيانات' : 'Selected contract not found');
      }

      const newGrossValue = D(targetContract.gross_contract_value || '0').plus(supplementData.amount).toFixed(2);
      const existingContractSchedules = data.schedules.filter(
        s => s.contract_id === targetContract.contract_id && s.status !== 'Void'
      );
      const maxTranche = existingContractSchedules.length > 0 
        ? Math.max(...existingContractSchedules.map(s => s.tranche_number))
        : 0;
      const newTrancheNumber = maxTranche + 1;

      const newScheduleId = generateUUID();
      const newSchedule: ERPInstallmentSchedule = {
        schedule_id: newScheduleId,
        contract_id: targetContract.contract_id,
        tranche_number: newTrancheNumber,
        nominal_value: D(supplementData.amount).toFixed(2),
        amount_paid: '0.00',
        due_date: supplementData.dueDate,
        status: 'Pending',
        schedule_version: 1
      };

      const newChequeId = generateUUID();
      const newPdc: ERPPDCRecord = {
        cheque_id: newChequeId,
        contract_id: targetContract.contract_id,
        schedule_id: newScheduleId,
        cheque_number: supplementData.receiptNumber,
        bank_name: isAr ? 'الخزينة الرئيسية (أمانات نقداً باليد - 101000)' : 'Main Safe (Cash by Hand - 101000)',
        drawer_name: targetContract.buyer_name,
        nominal_value: D(supplementData.amount).toFixed(2),
        due_date: supplementData.dueDate,
        status: 'In Safe'
      };

      await ERPSupabaseService.addContractSupplement(supabase, {
        contractId: targetContract.contract_id,
        newGrossValue,
        newSchedule,
        newPdc
      });

      await loadLiveData();

      toast.success(
        isAr ? 'تم تسجيل وتثبيت ملحق العقد بنجاح' : 'Contract supplement recorded successfully',
        {
          description: isAr
            ? `العميل: ${targetContract.buyer_name} • البند: ${supplementData.supplementReasonAr} • القيمة: ${D(supplementData.amount).formatEGP(true)} • إجمالي العقد الجديد: ${D(newGrossValue).formatEGP(true)}`
            : `Client: ${targetContract.buyer_name} • Item: ${supplementData.supplementReasonAr} • Amount: ${D(supplementData.amount).formatEGP(false)} • New Gross: ${D(newGrossValue).formatEGP(false)}`,
          duration: 6000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      toast.error(isAr ? 'تعذر تسجيل ملحق العقد' : 'Failed to record contract supplement', { description: msg });
    } finally {
      setIsMutating(false);
    }
  }, [data.contracts, data.schedules, isAr, supabase, loadLiveData]);

  // Handler: Save New Cheque
  const handleSaveNewCheque = useCallback(async (chequeData: {
    contractId: string;
    scheduleId?: string;
    chequeNumber: string;
    bankName: string;
    drawerName: string;
    nominalValue: string;
    dueDate: string;
  }) => {
    setIsMutating(true);
    try {
      const chequeId = generateUUID();
      const newCheque: ERPPDCRecord = {
        cheque_id: chequeId,
        contract_id: chequeData.contractId,
        schedule_id: chequeData.scheduleId,
        cheque_number: chequeData.chequeNumber,
        bank_name: chequeData.bankName,
        drawer_name: chequeData.drawerName,
        nominal_value: D(chequeData.nominalValue).toFixed(2),
        due_date: chequeData.dueDate,
        status: 'In Safe'
      };

      const payload: any = {
        cheque_id: newCheque.cheque_id,
        contract_id: newCheque.contract_id,
        cheque_number: newCheque.cheque_number,
        bank_name: newCheque.bank_name,
        drawer_name: newCheque.drawer_name,
        nominal_value: newCheque.nominal_value,
        due_date: newCheque.due_date,
        status: newCheque.status
      };
      if (newCheque.schedule_id) {
        payload.schedule_id = newCheque.schedule_id;
      }

      await supabase.from('erp_pdc_records').insert([payload]);
      await loadLiveData();

      toast.success(
        isAr ? 'تم إثبات ورقة القبض وحفظها في الخزينة بنجاح' : 'Due / Cheque recorded in safe successfully',
        {
          description: isAr
            ? `كود/رقم: ${chequeData.chequeNumber} • القيمة: ${D(chequeData.nominalValue).formatEGP(true)} • العميل: ${chequeData.drawerName} • تاريخ الاستحقاق: ${chequeData.dueDate}`
            : `Code/No: ${chequeData.chequeNumber} • Value: ${D(chequeData.nominalValue).formatEGP(false)} • Client: ${chequeData.drawerName} • Due: ${chequeData.dueDate}`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      toast.error(isAr ? 'تعذر تسجيل ورقة القبض' : 'Failed to record cheque into safe', { description: msg });
    } finally {
      setIsMutating(false);
    }
  }, [supabase, loadLiveData, isAr]);

  // Handler: Bulk Collect Due PDCs Today
  const handleCollectDuePDCsToday = useCallback(async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const dueToday = data.pdcRecords.filter(p => p.status !== 'Cleared' && p.due_date <= todayStr);
    if (dueToday.length === 0) {
      alert(isAr ? 'لا توجد أقساط أو بنود مستحقة للتحصيل اليوم.' : 'No installments are due for collection today.');
      return;
    }

    const totalDue = dueToday.reduce((acc, p) => acc.plus(p.nominal_value || '0'), D(0));
    if (!confirm(isAr 
      ? `هل ترغب في تأكيد استلام عدد (${dueToday.length}) قسط مستحق اليوم بمبلغ إجمالي (${totalDue.formatEGP(isAr)}) وتوريدها نقدياً بالخزينة الرئيسية [101000]؟`
      : `Confirm hand cash collection of ${dueToday.length} due installments total ${totalDue.formatEGP(isAr)} into Main Safe?`)) {
      return;
    }

    const targetPeriod = resolvePeriodForDate(todayStr, data.periods, activePeriod);
    if (!ensureActivePeriodOpen(isAr ? 'التحصيل الجماعي للأقساط' : 'Bulk Collection', targetPeriod)) return;

    setIsMutating(true);
    try {
      const newEntries: ERPJournalEntry[] = [];
      for (const item of dueToday) {
        const linkedSchedule = data.schedules.find(s => 
          (item.schedule_id && s.schedule_id === item.schedule_id) ||
          (s.contract_id === item.contract_id && s.due_date === item.due_date)
        );
        const linkedContract = data.contracts.find(c => 
          c.contract_id === item.contract_id ||
          c.contract_number === item.contract_id
        );
        const isDelivered = linkedContract?.handover_status === 'Delivered';
        const isPreHandoverInstallment = !isDelivered && Boolean(linkedSchedule || item.schedule_id || linkedContract);
        const creditAccount = isDelivered ? '103000' : (isPreHandoverInstallment ? '203000' : '103200');
        const debitAccount = item.status === 'Deposited' ? '102000' : '101000';

        const entry = GeneralLedgerEngine.validateAndCreateEntry({
          entry_number: `JE-CASH-REC-${item.cheque_number}`,
          entry_date: todayStr,
          period: targetPeriod,
          description: isAr
            ? (isDelivered 
                ? `تحصيل قسط بعد التسليم - بند #${item.cheque_number} - العميل: ${item.drawer_name}` 
                : (isPreHandoverInstallment
                    ? `تحصيل قسط تعاقدي - إيراد مؤجل - بند #${item.cheque_number} - العميل: ${item.drawer_name}`
                    : `تحصيل قسط باليد نقداً بالخزينة - بند #${item.cheque_number} - العميل: ${item.drawer_name}`))
            : `Collection - Item #${item.cheque_number} - Client: ${item.drawer_name}`,
          source_module: 'PDC',
          source_entity_id: item.cheque_id,
          created_by: 'CFO_FARID',
          lines: [
            {
              account_code: debitAccount,
              debit_amount: item.nominal_value,
              credit_amount: '0.00',
              contract_id: item.contract_id,
              memo: isAr 
                ? (debitAccount === '102000' ? `تحصيل بنكي بحساب البنك - العميل: ${item.drawer_name}` : `تحصيل قسط نقداً باليد - العميل: ${item.drawer_name}`) 
                : `Collection - Client: ${item.drawer_name}`
            },
            {
              account_code: creditAccount,
              debit_amount: '0.00',
              credit_amount: item.nominal_value,
              contract_id: item.contract_id,
              memo: isDelivered 
                ? (isAr ? `تسوية باقي أقساط الشقة بعد التسليم (103000)` : `Credit Accounts Receivable post-handover`)
                : (isPreHandoverInstallment
                    ? (isAr ? `إثبات إيراد تعاقدي مؤجل للوحدة قيد الإنشاء (203000)` : `Credit Deferred Contract Revenue pre-handover`)
                    : (isAr ? `إثبات سداد قسط باليد - بند #${item.cheque_number}` : `Hand installment settlement - Item #${item.cheque_number}`))
            }
          ]
        });

        if (linkedSchedule && linkedContract) {
          await ERPSupabaseService.persistTranchePayment(
            supabase,
            linkedContract.contract_id,
            linkedSchedule.schedule_id,
            item.nominal_value,
            entry
          );
          await ERPSupabaseService.persistPDCStatus(supabase, item.cheque_id, 'Cleared');
        } else {
          await ERPSupabaseService.persistPDCStatus(supabase, item.cheque_id, 'Cleared');
          await ERPSupabaseService.persistJournalEntry(supabase, entry);
        }
        newEntries.push(entry);
      }

      setData(prev => {
        const clearedIds = new Set(dueToday.map(d => d.cheque_id));
        const schedMap = new Map(dueToday.filter(d => d.schedule_id).map(d => [d.schedule_id, d.nominal_value]));
        const contractCashMap = new Map<string, Decimal>();
        dueToday.forEach(d => {
          if (d.contract_id) {
            const cur = contractCashMap.get(d.contract_id) || D(0);
            contractCashMap.set(d.contract_id, cur.plus(d.nominal_value));
          }
        });

        return {
          ...prev,
          pdcRecords: prev.pdcRecords.map(p => clearedIds.has(p.cheque_id) ? { ...p, status: 'Cleared' as const, cleared_date: todayStr } : p),
          schedules: prev.schedules.map(s => schedMap.has(s.schedule_id) ? { ...s, status: 'Paid' as const, amount_paid: schedMap.get(s.schedule_id)!, paid_date: todayStr } : s),
          contracts: prev.contracts.map(c => contractCashMap.has(c.contract_id) ? { ...c, total_cash_collected: D(c.total_cash_collected || 0).plus(contractCashMap.get(c.contract_id)!).toFixed(2) } : c),
          journalEntries: [...newEntries, ...prev.journalEntries]
        };
      });

      await loadLiveData(true);

      toast.success(
        isAr ? `تم تحصيل كافة الأقساط المستحقة اليوم (${dueToday.length}) بنجاح` : `All ${dueToday.length} dues collected successfully`,
        {
          description: isAr
            ? `إجمالي النقدية الموردة للخزينة: ${totalDue.formatEGP(true)}`
            : `Total cash deposited to Safe: ${totalDue.formatEGP(false)}`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (msg.includes('Invariant 0.9')) {
        const targetPeriod = resolvePeriodForDate(todayStr, data.periods, activePeriod);
        ensureActivePeriodOpen(isAr ? 'التحصيل الجماعي للأقساط' : 'Bulk Collection', targetPeriod);
      } else {
        toast.error(isAr ? 'فشل التحصيل الجماعي للأقساط' : 'Bulk collection failed', { description: msg });
      }
    } finally {
      setIsMutating(false);
    }
  }, [data.pdcRecords, data.schedules, data.contracts, data.periods, isAr, activePeriod, supabase, loadLiveData, ensureActivePeriodOpen]);

  // Handler: Confirm Hand Collection
  const handleConfirmHandCollection = useCallback(async (
    item: ERPPDCRecord,
    receiptNo: string,
    date: string,
    amount: string,
    notes: string,
    method: 'CASH' | 'INSTAPAY' = 'CASH'
  ) => {
    if (item.status === 'Cleared') {
      const msg = isAr ? 'لا يمكن إعادة تحصيل قسط تم تحصيله وإثباته دفترياً مسبقاً' : 'Cannot re-collect an already cleared installment';
      toast.error(msg);
      return;
    }
    const targetPeriod = resolvePeriodForDate(date, data.periods, activePeriod);
    if (!ensureActivePeriodOpen(isAr ? 'تحصيل قسط' : 'Collect Installment', targetPeriod)) return;

    // Reject collected amount <= 0
    const collected = D(amount || '0');
    if (collected.lte(0)) {
      const msg = isAr ? 'يجب أن يكون المبلغ المحصل أكبر من صفر' : 'Collected amount must be greater than zero';
      toast.error(msg);
      return;
    }

    const contract = data.contracts.find(c => 
      c.contract_id === item.contract_id || 
      c.contract_number === item.contract_id
    );
    const schedule = data.schedules.find(s => 
      (item.schedule_id && s.schedule_id === item.schedule_id) ||
      (s.contract_id === item.contract_id && s.due_date === item.due_date && (s.status === 'Pending' || s.status === 'Partially Paid')) ||
      (s.contract_id === item.contract_id && (s.status === 'Pending' || s.status === 'Partially Paid'))
    );

    const nominal = schedule ? D(schedule.nominal_value || '0') : D(item.nominal_value || '0');
    const prevPaid = schedule ? D(schedule.amount_paid || '0') : D(0);
    const remaining = Decimal.max(0, nominal.minus(prevPaid));

    // Reject collected amount > remaining
    if (collected.gt(remaining)) {
      const msg = isAr 
        ? `المبلغ المدخل (${collected.toFixed(2)}) يتجاوز المتبقي من القسط (${remaining.toFixed(2)})`
        : `Entered amount (${collected.toFixed(2)}) exceeds remaining installment balance (${remaining.toFixed(2)})`;
      toast.error(msg);
      return;
    }

    setIsMutating(true);
    try {
      const isInstaPay = method === 'INSTAPAY';
      // UNIFIED OPERATING TREASURY DESTINATION: Both Cash and InstaPay deposit into Account 101000
      const targetAccount = '101000';

      const isDelivered = contract?.handover_status === 'Delivered';
      const isPreHandoverInstallment = !isDelivered && Boolean(schedule || item.schedule_id || contract);
      const creditAccount = isDelivered ? '103000' : (isPreHandoverInstallment ? '203000' : '103200');

      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: isInstaPay ? `JE-IP-${receiptNo}` : `JE-RCP-${receiptNo}`,
        entry_date: date,
        period: targetPeriod,
        description: isAr 
          ? (isInstaPay
              ? `تحصيل قسط عبر إنستاباي بالخزينة بموجب مرجع رقم ${receiptNo} من العميل: ${item.drawer_name}${notes ? ` - ${notes}` : ''}`
              : `تحصيل قسط نقداً بالخزينة بموجب إيصال رقم ${receiptNo} من العميل: ${item.drawer_name}${notes ? ` - ${notes}` : ''}`)
          : `Installment collected via ${isInstaPay ? 'InstaPay' : 'Cash'} into Treasury - Ref #${receiptNo} - Client: ${item.drawer_name}`,
        source_module: 'PDC',
        source_entity_id: item.cheque_id,
        created_by: 'CFO_FARID',
        lines: [
          {
            account_code: targetAccount,
            debit_amount: D(amount).toFixed(2),
            credit_amount: '0.00',
            memo: isInstaPay
              ? (isAr ? `تحويل فوري إنستاباي بالخزينة - مرجع #${receiptNo}` : `InstaPay transfer into Treasury - Ref #${receiptNo}`)
              : (isAr ? `استلام نقدي بالخزينة - إيصال #${receiptNo}` : `Hand cash collection into Treasury - Receipt #${receiptNo}`)
          },
          {
            account_code: creditAccount,
            debit_amount: '0.00',
            credit_amount: D(amount).toFixed(2),
            memo: isDelivered
              ? (isAr ? `تسوية مديونية باقي ثمن الشقة على العميل: ${item.drawer_name}` : `Settlement of customer receivable: ${item.drawer_name}`)
              : (isAr ? `إثبات تحصيل قسط العميل: ${item.drawer_name}` : `Settlement of installment for client: ${item.drawer_name}`)
          }
        ]
      });

      const newPaid = prevPaid.plus(collected);
      const isFullyPaid = newPaid.gte(nominal);
      const newScheduleStatus: InstallmentStatus = isFullyPaid ? 'Paid' : 'Partially Paid';
      const newPaidDate = isFullyPaid ? date : (schedule?.paid_date || null);

      if (isFullyPaid) {
        await ERPSupabaseService.persistPDCStatus(supabase, item.cheque_id, 'Cleared');
      }

      if (schedule) {
        await supabase
          .from('erp_installment_schedules')
          .update({
            status: newScheduleStatus,
            amount_paid: newPaid.toFixed(2),
            paid_date: newPaidDate
          })
          .eq('schedule_id', schedule.schedule_id);
      }

      if (contract) {
        const newTotalCash = D(contract.total_cash_collected || '0').plus(amount).toFixed(2);
        await supabase
          .from('erp_contracts')
          .update({ total_cash_collected: newTotalCash })
          .eq('contract_id', contract.contract_id);
      }

      await ERPSupabaseService.persistJournalEntry(supabase, entry);

      setData(prev => ({
        ...prev,
        contracts: prev.contracts.map(c => 
          (contract && c.contract_id === contract.contract_id) || c.contract_id === item.contract_id 
            ? { ...c, total_cash_collected: D(c.total_cash_collected || '0').plus(amount).toFixed(2) }
            : c
        ),
        schedules: prev.schedules.map(s => 
          (schedule && s.schedule_id === schedule.schedule_id)
            ? { ...s, status: newScheduleStatus, amount_paid: newPaid.toFixed(2), paid_date: newPaidDate || undefined }
            : s
        ),
        pdcRecords: prev.pdcRecords.map(p => 
          p.cheque_id === item.cheque_id 
            ? (isFullyPaid ? { ...p, status: 'Cleared' as const, cleared_date: date } : p)
            : p
        ),
        journalEntries: [entry, ...prev.journalEntries]
      }));

      await loadLiveData(true);

      const localizedBuyer = isAr ? localizeBuyerName(item.drawer_name || 'عميل مباشر') : (item.drawer_name || 'Direct Client');

      toast.success(
        isFullyPaid
          ? (isInstaPay
              ? (isAr ? 'تم تحصيل القسط بالكامل عبر إنستاباي' : 'Installment Fully Collected via InstaPay')
              : (isAr ? 'تم توريد القسط بالكامل إلى الخزينة' : 'Installment Fully Deposited into Safe'))
          : (isInstaPay
              ? (isAr ? 'تم تحصيل دفعة جزئية من القسط عبر إنستاباي' : 'Partial Installment Collected via InstaPay')
              : (isAr ? 'تم توريد دفعة جزئية من القسط إلى الخزينة' : 'Partial Installment Deposited into Safe')),
        {
          description: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(5, 150, 105, 0.1)',
                  color: '#047857',
                  border: '1px solid rgba(5, 150, 105, 0.22)',
                  padding: '0.12rem 0.55rem',
                  borderRadius: '6px',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  +{D(amount).formatEGP(isAr)}
                </span>
                {!isFullyPaid && (
                  <span style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    color: '#d97706',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    padding: '0.12rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {isAr ? `متبقي: ${nominal.minus(newPaid).formatEGP(isAr)}` : `Remaining: ${nominal.minus(newPaid).formatEGP(isAr)}`}
                  </span>
                )}
                <span style={{
                  background: '#f8fafc',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  padding: '0.12rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  fontFamily: 'monospace'
                }}>
                  #{receiptNo}
                </span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <span>{isAr ? 'العميل:' : 'Client:'}</span>
                <strong style={{ color: '#0f172a', fontWeight: 800 }}>{localizedBuyer}</strong>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span>{isInstaPay ? (isAr ? 'الخزينة الرئيسية - تحويل إنستاباي (101000)' : 'Treasury - InstaPay (101000)') : (isAr ? 'الخزينة الرئيسية - كاش باليد (101000)' : 'Treasury - Cash (101000)')}</span>
              </div>
            </div>
          ),
          duration: 5000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (msg.includes('Invariant 0.9')) {
        const targetPeriod = resolvePeriodForDate(date, data.periods, activePeriod);
        ensureActivePeriodOpen(isAr ? 'تحصيل قسط' : 'Collect Installment', targetPeriod);
      } else {
        toast.error(isAr ? 'تعذر إتمام عملية التحصيل' : 'Collection operation failed', { description: msg });
      }
    } finally {
      setIsMutating(false);
    }
  }, [data.contracts, data.schedules, data.periods, isAr, activePeriod, supabase, loadLiveData, ensureActivePeriodOpen]);


  // Handler: Create RSV Allocation
  const handleCreateRSVAllocation = useCallback(async (
    e?: React.FormEvent,
    overrideData?: { projectName: string; salesValue: string; wipAmount: string }
  ) => {
    if (e && e.preventDefault) e.preventDefault();
    const projName = (overrideData ? overrideData.projectName : rsvProjectName).trim();
    const wip = overrideData ? overrideData.wipAmount : rsvWipAmount;
    const sales = overrideData ? overrideData.salesValue : rsvSalesValue;
    if (!projName || !wip || !sales) return;
    setIsMutating(true);
    try {
      const newAlloc = RSVEngine.calculateAllocation(projName, wip, sales);
      try {
        await supabase.from('erp_cost_allocations').insert([newAlloc]);
      } catch (dbErr) {
        console.warn('Silent database sync for RSV allocation:', dbErr);
      }

      setData(prev => ({
        ...prev,
        costAllocations: [newAlloc, ...prev.costAllocations]
      }));
      handleInspectRSV(newAlloc);

      toast.success(
        isAr ? `تم حفظ وتطبيق نسبة أرباح المشروع (${projName})` : `RSV allocation generated for (${projName})`,
        {
          description: isAr
            ? `نسبة تكلفة المباني: ${(parseFloat(newAlloc.rsv_factor) * 100).toFixed(1)}% • إجمالي مصاريف المشروع: ${D(newAlloc.total_incurred_wip).formatEGP(true)}`
            : `RSV Factor: ${(parseFloat(newAlloc.rsv_factor) * 100).toFixed(1)}% • Incurred WIP: ${D(newAlloc.total_incurred_wip).formatEGP(false)}`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      toast.error(isAr ? 'فشل حفظ نسبة المشروع' : 'RSV allocation failed', { description: msg });
    } finally {
      setIsMutating(false);
    }
  }, [rsvProjectName, rsvWipAmount, rsvSalesValue, supabase, handleInspectRSV, isAr]);

  // Handler: Settle Tax
  const handleRemitTax = useCallback(async (taxId: string) => {
    const tax = data.taxRecords.find(t => t.tax_id === taxId);
    if (!tax) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const targetPeriod = resolvePeriodForDate(todayStr, data.periods, activePeriod);
    if (!ensureActivePeriodOpen(isAr ? 'سداد ضريبة ورسوم' : 'Remit Tax', targetPeriod)) return;
    setIsMutating(true);
    try {
      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-TAX-RMT-${tax.tax_id.slice(0, 8)}`,
        entry_date: todayStr,
        period: targetPeriod,
        description: `استيفاء / سداد ضريبة ورسوم الوحدة (${tax.tax_type})`,
        source_module: 'TAX',
        source_entity_id: tax.tax_id,
        created_by: 'CFO_FARID',
        lines: [
          {
            account_code: '150000',
            debit_amount: tax.tax_amount,
            credit_amount: '0.00',
            memo: `استيفاء وتسوية رسوم وتراخيص المشروع - ${tax.tax_type}`
          },
          {
            account_code: '101000',
            debit_amount: '0.00',
            credit_amount: tax.tax_amount,
            memo: `سداد / استيفاء ضريبة الوحدة نقداً باليد من الخزينة الرئيسية`
          }
        ]
      });

      try {
        await supabase.from('erp_tax_records').update({ remittance_status: 'Remitted to ETA' }).eq('tax_id', taxId);
        await ERPSupabaseService.persistJournalEntry(supabase, entry);
      } catch (dbErr) {
        console.warn('Silent database sync for tax remittance:', dbErr);
      }

      setData(prev => ({
        ...prev,
        taxRecords: prev.taxRecords.map(t => t.tax_id === taxId ? {
          ...t,
          remittance_status: 'Remitted to ETA'
        } : t),
        journalEntries: [entry, ...prev.journalEntries]
      }));

      setInspectorPayload(prev => {
        if (prev?.type === 'tax' && prev.tax.tax_id === taxId) {
          return {
            ...prev,
            tax: { ...prev.tax, remittance_status: 'Remitted to ETA' },
            remittanceJournalEntry: entry
          };
        }
        return prev;
      });

      toast.success(
        isAr ? `تم سداد واستيفاء ضريبة الوحدة (${tax.tax_type}) نقداً من الخزينة` : `Apartment tax (${tax.tax_type}) remitted from Safe`,
        {
          description: isAr
            ? `المبلغ: ${D(tax.tax_amount).formatEGP(true)} • تم إثبات قيد اليومية`
            : `Amount: ${D(tax.tax_amount).formatEGP(false)} • Journal entry posted`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      console.warn('Tax remit error:', err);
      const msg = (err as Error).message;
      if (msg.includes('Invariant 0.9')) {
        const todayStr = new Date().toISOString().split('T')[0];
        const targetPeriod = resolvePeriodForDate(todayStr, data.periods, activePeriod);
        ensureActivePeriodOpen(isAr ? 'سداد ضريبة ورسوم' : 'Remit Tax', targetPeriod);
      } else {
        toast.error(isAr ? 'فشل استيفاء ضريبة الوحدة' : 'Failed to remit tax', { description: msg });
      }
    } finally {
      setIsMutating(false);
    }
  }, [data.taxRecords, data.periods, activePeriod, supabase, isAr, ensureActivePeriodOpen]);

  // Handler: Confirm Partner Payout
  const handleConfirmPartnerPayout = useCallback(async (details: {
    partnerName: string;
    amount: string;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000';
    propertyId?: string;
    propertyTitle?: string;
    payoutDate: string;
    receiptRef: string;
    memo: string;
  }) => {
    const targetPeriod = resolvePeriodForDate(details.payoutDate, data.periods, activePeriod);
    if (!ensureActivePeriodOpen(isAr ? 'صرف أرباح الشركاء' : 'Partner Dividend Payout', targetPeriod)) {
      return;
    }
    setIsMutating(true);
    try {
      const routingAccount = details.paymentMethod === 'BANK_102000' ? '102000' : '101000';
      let cashBalance = D(0);
      for (const jEntry of data.journalEntries) {
        for (const line of jEntry.lines) {
          if (line.account_code === routingAccount) {
            cashBalance = cashBalance.plus(line.debit_amount).minus(line.credit_amount);
          }
        }
      }

      const payoutAmt = D(details.amount);
      if (cashBalance.lt(payoutAmt)) {
        const accNameAr = routingAccount === '101000' ? 'الخزينة الرئيسية (101000)' : 'الحساب البنكي التجاري (102000)';
        const accNameEn = routingAccount === '101000' ? 'Main Safe (101000)' : 'Commercial Bank Account (102000)';
        throw new Error(
          isAr
            ? `عفواً! رصيد ${accNameAr} غير كافٍ لصرف الأرباح. الرصيد المتاح: ${cashBalance.formatEGP(true)}، والمطلوب صرفه: ${payoutAmt.formatEGP(true)} (معيار INV-4.5).`
            : `ERP Invariant 4.5 Violation: Insufficient balance in ${accNameEn} (${cashBalance.toFixed(2)} EGP). Cannot disburse ${payoutAmt.toFixed(2)} EGP.`
        );
      }

      const entry = PartnersEngine.createPayoutJournalEntry({
        partnerName: details.partnerName,
        amount: details.amount,
        paymentMethod: details.paymentMethod,
        propertyTitle: details.propertyTitle,
        receiptRef: details.receiptRef,
        date: details.payoutDate,
        currentPeriod: targetPeriod,
        loggedBy: 'CHIEF_EXECUTIVE',
        routingAccount
      });

      try {
        await ERPSupabaseService.persistJournalEntry(supabase, entry);
      } catch (dbErr) {
        console.warn('Silent database sync for partner payout:', dbErr);
      }

      const newTx: ERPPartnerTransaction = {
        id: `pt-tx-${Date.now()}`,
        transaction_number: `PT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        partner_name: details.partnerName,
        type: 'PROFIT_DISTRIBUTION',
        amount: details.amount,
        property_id: details.propertyId,
        property_title: details.propertyTitle,
        payment_method: details.paymentMethod,
        journal_entry_number: entry.entry_number,
        date: details.payoutDate,
        status: 'COMPLETED',
        memo: details.memo,
        receipt_ref: details.receiptRef
      };

      try {
        await ERPSupabaseService.persistPartnerTransaction(supabase, {
          transaction_id: ensureUUID(newTx.id),
          partner_name: newTx.partner_name,
          property_id: newTx.property_id && isUUID(newTx.property_id) ? newTx.property_id : undefined,
          property_title: newTx.property_title,
          type: newTx.type,
          amount: newTx.amount,
          date: newTx.date,
          routing_account: routingAccount,
          journal_entry_id: isUUID(entry.entry_id) ? entry.entry_id : undefined,
          notes: newTx.memo
        });
      } catch (ptErr) {
        console.warn('Silent database sync for partner transaction:', ptErr);
      }

      setPartnerTransactions(prev => [newTx, ...prev]);
      setData(prev => ({
        ...prev,
        journalEntries: [entry, ...prev.journalEntries]
      }));

      toast.success(
        isAr 
          ? `تم صرف دفعة أرباح للشريك: ${details.partnerName}` 
          : `Profit dividend paid to ${details.partnerName}`,
        {
          description: isAr 
            ? `المبلغ: ${D(details.amount).formatEGP(true)} • تم إثبات قيد اليومية #${entry.entry_number}` 
            : `Amount: ${D(details.amount).formatEGP(false)} • Journal #${entry.entry_number}`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      console.error('Partner payout error:', err);
      const msg = (err as Error).message;
      if (msg.includes('Invariant 0.9')) {
        const targetPeriod = resolvePeriodForDate(details.payoutDate, data.periods, activePeriod);
        ensureActivePeriodOpen(isAr ? 'صرف أرباح الشركاء' : 'Partner Dividend Payout', targetPeriod);
      } else {
        toast.error(isAr ? 'فشل تسجيل صرف الأرباح' : 'Failed to record dividend payout', {
          description: msg
        });
      }
    } finally {
      setIsMutating(false);
    }
  }, [data.journalEntries, data.periods, isAr, activePeriod, supabase, ensureActivePeriodOpen]);

  // Handler: Confirm Partner Capital Injection
  const handleConfirmPartnerInjection = useCallback(async (details: {
    partnerName: string;
    amount: string;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000';
    propertyId?: string;
    propertyTitle?: string;
    commitmentId?: string;
    injectionDate: string;
    receiptRef: string;
    memo: string;
    role?: 'equity_partner' | 'land_partner' | 'silent_financier';
    phone?: string;
    nationalId?: string;
    projectSharePct?: number;
  }) => {
    const targetPeriod = resolvePeriodForDate(details.injectionDate, data.periods, activePeriod);
    if (!ensureActivePeriodOpen(isAr ? 'توريد رأس مال الشريك' : 'Partner Capital Injection', targetPeriod)) {
      return;
    }
    setIsMutating(true);
    try {
      const routingAccount = details.paymentMethod === 'BANK_102000' ? '102000' : '101000';
      const entry = PartnersEngine.createCapitalInjectionJournalEntry({
        partnerName: details.partnerName,
        amount: details.amount,
        paymentMethod: details.paymentMethod,
        propertyTitle: details.propertyTitle,
        receiptRef: details.receiptRef,
        date: details.injectionDate,
        currentPeriod: targetPeriod,
        loggedBy: 'CHIEF_EXECUTIVE',
        routingAccount
      });

      try {
        await ERPSupabaseService.persistJournalEntry(supabase, entry);
      } catch (dbErr) {
        console.warn('Silent database sync for partner injection:', dbErr);
      }
      const newTx: ERPPartnerTransaction = {
        id: `pt-tx-${Date.now()}`,
        transaction_number: `PT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        partner_name: details.partnerName,
        type: 'CAPITAL_INJECTION',
        amount: details.amount,
        property_id: details.propertyId,
        property_title: details.propertyTitle,
        commitment_id: details.commitmentId,
        payment_method: details.paymentMethod,
        journal_entry_number: entry.entry_number,
        date: details.injectionDate,
        status: 'COMPLETED',
        memo: details.memo,
        receipt_ref: details.receiptRef
      };

      try {
        await ERPSupabaseService.persistPartnerTransaction(supabase, {
          transaction_id: ensureUUID(newTx.id),
          partner_name: newTx.partner_name,
          property_id: newTx.property_id && isUUID(newTx.property_id) ? newTx.property_id : undefined,
          property_title: newTx.property_title,
          commitment_id: details.commitmentId && isUUID(details.commitmentId) ? details.commitmentId : undefined,
          type: newTx.type,
          amount: newTx.amount,
          date: newTx.date,
          routing_account: routingAccount,
          journal_entry_id: isUUID(entry.entry_id) ? entry.entry_id : undefined,
          notes: newTx.memo
        });
      } catch (ptErr) {
        console.warn('Silent database sync for partner injection transaction:', ptErr);
      }

      const roleArMap: Record<string, string> = {
        equity_partner: 'شريك ممول بالمشروع',
        land_partner: 'شريك مساهم بالأرض',
        silent_financier: 'ممول صامت'
      };
      const assignedRole = details.role || 'equity_partner';

      try {
        await ERPSupabaseService.persistPartnerProfile(supabase, {
          id: `pt-${Date.now()}`,
          name: details.partnerName,
          role: assignedRole,
          phone: details.phone,
          national_id: details.nationalId,
          joined_date: details.injectionDate
        });
      } catch (profErr) {
        console.warn('Silent database sync for partner profile:', profErr);
      }

      saveRegisteredPartner({
        name: details.partnerName,
        role: roleArMap[assignedRole] || 'شريك استثماري',
        isPermanent: false
      });

      setPartnerProfiles(prev => {
        if (prev.some(p => p.name === details.partnerName)) return prev;
        return [
          ...prev,
          {
            id: `pt-${Date.now()}`,
            name: details.partnerName,
            role: assignedRole,
            phone: details.phone,
            national_id: details.nationalId,
            notes: `شريك وممول استثماري - مساهمة مبدئية بقيمة ${details.amount} ج.م`,
            joined_date: details.injectionDate
          }
        ];
      });

      setData(prev => {
        const updatedCommitments = (prev.partnerCommitments || []).map(comm => {
          if (comm.commitment_id === details.commitmentId) {
            const newPaid = D(comm.paid_amount || 0).plus(D(details.amount || 0));
            const committed = D(comm.committed_amount || 0);
            return {
              ...comm,
              paid_amount: newPaid.toFixed(2),
              status: (newPaid.gte(committed) ? 'PAID' : 'PARTIALLY_PAID') as any
            };
          }
          return comm;
        });

        if (details.propertyId && details.projectSharePct && details.projectSharePct > 0) {
          const updatedProps = prev.properties.map(prop => {
            if (prop.id === details.propertyId) {
              const currentSplits = (prop.partner_splits as any[]) || [];
              const withoutPartner = currentSplits.filter(s => (s.partner_name || s.partnerName) !== details.partnerName && (s.partner_name || s.partnerName) !== PRIMARY_DEVELOPER_NAME);
              const partnerShare = details.projectSharePct!;
              const otherSharesSum = withoutPartner.reduce((sum, s) => sum + (Number(s.share_percentage || s.sharePct) || 0), 0);
              const devShare = Math.max(0, 100 - otherSharesSum - partnerShare);
              
              const newSplits = [
                { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: devShare },
                ...withoutPartner.map(s => ({ partner_name: s.partner_name || s.partnerName, share_percentage: s.share_percentage || s.sharePct })),
                { partner_name: details.partnerName, share_percentage: partnerShare }
              ];
              return { ...prop, partner_splits: newSplits };
            }
            return prop;
          });
          return {
            ...prev,
            properties: updatedProps,
            journalEntries: [entry, ...prev.journalEntries],
            partnerCommitments: updatedCommitments
          };
        }

        return {
          ...prev,
          journalEntries: [entry, ...prev.journalEntries],
          partnerCommitments: updatedCommitments
        };
      });

      setPartnerTransactions(prev => [newTx, ...prev]);

      toast.success(
        isAr 
          ? `تم إيداع مساهمة رأس مال جديدة من الشريك: ${details.partnerName}` 
          : `Capital contribution recorded from ${details.partnerName}`,
        {
          description: isAr 
            ? `المبلغ: ${D(details.amount).formatEGP(true)} • تم إثبات قيد اليومية #${entry.entry_number}` 
            : `Amount: ${D(details.amount).formatEGP(false)} • Journal #${entry.entry_number}`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      console.error('Partner injection error:', err);
      const msg = (err as Error).message;
      if (msg.includes('Invariant 0.9')) {
        const targetPeriod = resolvePeriodForDate(details.injectionDate, data.periods, activePeriod);
        ensureActivePeriodOpen(isAr ? 'توريد رأس مال الشريك' : 'Partner Capital Injection', targetPeriod);
      } else {
        toast.error(isAr ? 'فشل تسجيل مساهمة رأس المال' : 'Failed to record capital contribution', {
          description: msg
        });
      }
    } finally {
      setIsMutating(false);
    }
  }, [data.periods, activePeriod, supabase, isAr, ensureActivePeriodOpen]);

  // Handler: Create Partner Milestone Commitment
  const handleCreatePartnerCommitment = useCallback(async (payload: {
    propertyId: string;
    partnerName: string;
    milestoneName: string;
    milestonePhase?: string;
    committedAmount: string;
    dueDate: string;
    notes?: string;
  }) => {
    setIsMutating(true);
    try {
      const persisted = await ERPSupabaseService.persistPartnerCommitment(supabase, {
        property_id: payload.propertyId,
        partner_name: payload.partnerName,
        milestone_name: payload.milestoneName,
        milestone_phase: payload.milestonePhase,
        committed_amount: payload.committedAmount,
        due_date: payload.dueDate,
        notes: payload.notes
      });
      setData(prev => ({
        ...prev,
        partnerCommitments: [persisted, ...(prev.partnerCommitments || []).filter(c => c.commitment_id !== persisted.commitment_id)]
      }));
    } catch (err) {
      console.error('Failed to persist partner commitment:', err);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [supabase]);

  // Handler: Register New Partner Profile
  const handleRegisterNewPartner = useCallback(async (profileData: NewPartnerSubmitPayload) => {
    setIsMutating(true);
    try {
      const roleArMap: Record<string, string> = {
        equity_partner: 'شريك ممول بالمشروع',
        land_partner: 'شريك مساهم بالأرض',
        silent_financier: 'ممول صامت'
      };

      saveRegisteredPartner({
        name: profileData.name,
        role: roleArMap[profileData.role] || 'شريك استثماري',
        isPermanent: false,
        phone: profileData.phone,
        nationalId: profileData.nationalId,
        bankName: profileData.bankName,
        iban: profileData.iban,
        instapayHandle: profileData.instapayHandle
      });

      const newProfile: ERPPartnerProfile = {
        id: `pt-${Date.now()}`,
        name: profileData.name,
        role: profileData.role,
        phone: profileData.phone,
        national_id: profileData.nationalId,
        bank_name: profileData.bankName,
        iban: profileData.iban,
        instapay_handle: profileData.instapayHandle,
        preferred_payout_method: profileData.preferredPayoutMethod,
        notes: profileData.notes || `شريك وممول استثماري تم توثيقه بالنظام`,
        joined_date: new Date().toISOString().split('T')[0]
      };
      setPartnerProfiles(prev => [...prev.filter(p => p.name !== profileData.name), newProfile]);

      try {
        await ERPSupabaseService.persistPartnerProfile(supabase, {
          id: newProfile.id,
          name: newProfile.name,
          role: newProfile.role,
          phone: newProfile.phone,
          email: profileData.email,
          national_id: newProfile.national_id,
          joined_date: newProfile.joined_date
        });
      } catch (profileErr) {
        console.warn('Silent database sync for partner profile:', profileErr);
      }

      if (profileData.propertyId && profileData.sharePercentage && profileData.sharePercentage > 0) {
        const partnerShare = profileData.sharePercentage;
        setData(prev => {
          const updatedProps = prev.properties.map(prop => {
            if (prop.id === profileData.propertyId) {
              const currentSplits = (prop.partner_splits as any[]) || [];
              const withoutPartner = currentSplits.filter(
                s => (s.partner_name || s.partnerName) !== profileData.name && 
                     (s.partner_name || s.partnerName) !== PRIMARY_DEVELOPER_NAME
              );
              const otherSharesSum = withoutPartner.reduce(
                (sum, s) => sum + (Number(s.share_percentage || s.sharePct) || 0), 0
              );
              const devShare = Math.max(0, 100 - otherSharesSum - partnerShare);
              const newSplits = [
                { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: devShare },
                ...withoutPartner.map(s => ({
                  partner_name: s.partner_name || s.partnerName,
                  share_percentage: s.share_percentage || s.sharePct
                })),
                { partner_name: profileData.name, share_percentage: partnerShare }
              ];
              return { ...prop, partner_splits: newSplits };
            }
            return prop;
          });
          return { ...prev, properties: updatedProps };
        });
      }

      if (profileData.initialDeposit && D(profileData.initialDeposit.amount || 0).gt(0)) {
        const depositDate = profileData.initialDeposit.date || new Date().toISOString().split('T')[0];
        const targetPeriod = resolvePeriodForDate(depositDate, data.periods, activePeriod);
        if (!ensureActivePeriodOpen(isAr ? 'توريد رأس مال الشريك' : 'Partner Capital Injection', targetPeriod)) {
          return;
        }

        const entry = PartnersEngine.createCapitalInjectionJournalEntry({
          partnerName: profileData.name,
          amount: profileData.initialDeposit.amount,
          paymentMethod: profileData.initialDeposit.paymentMethod,
          receiptRef: profileData.initialDeposit.receiptRef,
          date: depositDate,
          currentPeriod: targetPeriod,
          loggedBy: 'CHIEF_EXECUTIVE',
          routingAccount: '101000'
        });

        try {
          await ERPSupabaseService.persistJournalEntry(supabase, entry);
        } catch (dbErr) {
          console.warn('Silent database sync for initial deposit:', dbErr);
        }

        const newTx: ERPPartnerTransaction = {
          id: `pt-tx-${Date.now()}`,
          transaction_number: `PT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          partner_name: profileData.name,
          type: 'CAPITAL_INJECTION',
          amount: profileData.initialDeposit.amount,
          payment_method: profileData.initialDeposit.paymentMethod,
          journal_entry_number: entry.entry_number,
          date: depositDate,
          status: 'COMPLETED',
          memo: `إيداع مساهمة رأس مال تأسيسية للشريك: ${profileData.name}`,
          receipt_ref: profileData.initialDeposit.receiptRef
        };

        try {
          await ERPSupabaseService.persistPartnerTransaction(supabase, {
            transaction_id: ensureUUID(newTx.id),
            partner_name: newTx.partner_name,
            type: newTx.type,
            amount: newTx.amount,
            date: newTx.date,
            routing_account: '101000',
            journal_entry_id: isUUID(entry.entry_id) ? entry.entry_id : undefined,
            notes: newTx.memo
          });
        } catch (txErr) {
          console.warn('Silent database sync for initial deposit partner transaction:', txErr);
        }

        setPartnerTransactions(prev => [newTx, ...prev]);
        setData(prev => ({ ...prev, journalEntries: [entry, ...prev.journalEntries] }));
      }

      toast.success(
        isAr 
          ? `تم توثيق وتسجيل الشريك: ${profileData.name} بنجاح` 
          : `Partner ${profileData.name} registered successfully`,
        {
          description: isAr 
            ? `تم ربط الحصص العقارية وتحديث دليل الشركاء المعتمد` 
            : `Equity splits balanced and partner directory updated`,
          duration: 4500
        }
      );
    } catch (err: unknown) {
      console.error('Error registering new partner:', err);
      toast.error(isAr ? 'فشل تسجيل الشريك' : 'Failed to register partner', {
        description: (err as Error).message
      });
    } finally {
      setIsMutating(false);
    }
  }, [supabase, data.periods, activePeriod, isAr, ensureActivePeriodOpen]);

  // Handler: Atomically save the project cost record and balanced journal entry.
  const handleSaveProjectExpense = useCallback(async (entry: ERPJournalEntry, costItem: ERPPropertyCostItem) => {
    const targetPeriod = resolvePeriodForDate(entry.entry_date, data.periods, activePeriod);
    if (!ensureActivePeriodOpen(isAr ? 'تسجيل مصروف مشروع' : 'Project Expense', targetPeriod)) return;
    setIsMutating(true);
    try {
      await ERPSupabaseService.persistExpenseWithCostItem(supabase, entry, costItem);
      setData(prev => ({
        ...prev,
        journalEntries: [entry, ...prev.journalEntries],
        propertyCosts: costItem ? [costItem, ...prev.propertyCosts] : prev.propertyCosts
      }));
      await loadLiveData(true);

      const entryTotal = (entry.lines || []).reduce((acc, l) => acc.plus(l.debit_amount || '0'), D(0)).formatEGP(isAr);
      toast.success(
        isAr 
          ? (costItem ? `تم تسجيل وترحيل قيد اليومية #${entry.entry_number} وتكلفة المشروع بنجاح` : `تم تسجيل وترحيل قيد اليومية #${entry.entry_number} بنجاح`)
          : (costItem ? `Journal entry #${entry.entry_number} and project cost item posted successfully` : `Journal entry #${entry.entry_number} posted successfully`),
        {
          description: `${entry.description} • ${entryTotal}`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (msg.includes('Invariant 0.9')) {
        const targetPeriod = resolvePeriodForDate(entry.entry_date, data.periods, activePeriod);
        ensureActivePeriodOpen(isAr ? 'تسجيل مصروف مشروع' : 'Project Expense', targetPeriod);
      } else {
        toast.error(
          isAr ? 'فشل تسجيل وترحيل الحركة وتكلفة المشروع' : 'Failed to post transaction and cost record', 
          { description: msg }
        );
      }
    } finally {
      setIsMutating(false);
    }
  }, [supabase, data.periods, activePeriod, loadLiveData, isAr, ensureActivePeriodOpen]);

  // Handler: Comprehensive Arabic Excel Export
  const handleExportExcel = useCallback(() => {
    try {
      exportComprehensiveArabicExcel(
        data,
        {
          cashBalance: totalCollectedCash,
          accountsReceivable: totalRemainingAR,
          totalWipIncurred: totalWipIncurred,
          totalAssets: D(totalCollectedCash).plus(totalRemainingAR).plus(totalWipIncurred).toFixed(2),
          totalLiabilities: totalTaxLiabilities,
          collectedSales: totalCollectedCash,
          grossContractValue: totalGrossContractValue,
          partnerFunding: totalContributedCapital
        },
        isAr
      );

      toast.success(
        isAr ? 'تم استخراج وتنزيل ملف الإكسيل الشامل (.xlsx) بنجاح' : 'Comprehensive Excel report generated (.xlsx)',
        {
          description: isAr
            ? 'يتضمن ميزان المراجعة، حركة الخزنة، الأستاذ العام، وسجل العقود والأقساط'
            : 'Includes Trial Balance, Safe Cash Ledger, Journal Entries & Contracts',
          duration: 4000
        }
      );
    } catch (err: unknown) {
      toast.error(isAr ? 'فشل استخراج ملف الإكسيل' : 'Failed to export Excel', { description: (err as Error).message });
    }
  }, [data, totalCollectedCash, totalRemainingAR, totalWipIncurred, totalTaxLiabilities, totalGrossContractValue, totalContributedCapital, isAr]);

  // Property Actions Handlers
  const handleOpenContractForProperty = useCallback((prop: Property, unit?: BuildingUnitItem) => {
    const isBld = prop.type === 'building' || (prop.title_ar || '').includes('عمارة') || (prop.title_en || '').toLowerCase().includes('building');
    const wholeContract = data.contracts.find(c => 
      (c.property_id === prop.id || c.unit_id === prop.title_ar || c.unit_id === prop.title_en) && 
      (c.status === 'Active' || c.status === 'Completed') &&
      (c.is_whole_building_sale || !c.building_unit_id)
    );
    if (isBld && (wholeContract || prop.listing_status === 'sold')) {
      alert(isAr 
        ? `عفواً! هذه العمارة تم بيعها بالكامل بموجب العقد (${wholeContract?.contract_number || 'مسجل'}) باسم (${wholeContract?.buyer_name || 'المشتري'}). لا يمكن بيع أي شقة منفصلة منها.`
        : `This building is already sold entirely under contract ${wholeContract?.contract_number || ''}. No individual apartments can be sold.`
      );
      return;
    }

    setSelectedPropertyId(prop.id);
    if (unit) {
      setIsWholeBuildingContract(false);
      setSelectedBuildingUnitId(unit.unit_id);
      setSelectedBuildingUnitNumber(unit.unit_number);
      const b = unit.price_egp;
      const t = unit.tax_amount_egp || 0;
      setBasePriceInput(b.toString());
      setApartmentTaxInput(t.toString());
      setApartmentTaxDesc(unit.tax_description || '');
      setCustomPrice((b + t).toString());
    } else {
      setIsWholeBuildingContract(isBld);
      setSelectedBuildingUnitId(undefined);
      setSelectedBuildingUnitNumber(undefined);
      const b = prop.price_egp;
      const t = prop.tax_amount_egp || 0;
      setBasePriceInput(b.toString());
      setApartmentTaxInput(t.toString());
      setApartmentTaxDesc('');
      setCustomPrice((b + t).toString());
    }
    setDownPaymentPct('0.15');
    setNumInstallments(prop.completion_status === 'off_plan' ? '12' : '6');
    setContractWizardStep(1);
    setShowNewContractModal(true);
  }, [data.contracts, isAr]);

  const handleOpenGenericNewContract = useCallback(() => {
    setSelectedPropertyId('');
    setSelectedBuildingUnitId(undefined);
    setSelectedBuildingUnitNumber(undefined);
    setContractWizardStep(1);
    setShowNewContractModal(true);
  }, []);

  const handleUpdatePropertyUnitTax = useCallback(async (propertyId: string, unitId: string, taxAmount: number, taxDesc?: string) => {
    await ERPSupabaseService.updateBuildingUnitTax(supabase, propertyId, unitId, taxAmount, taxDesc);
    await loadLiveData();
  }, [loadLiveData, supabase]);

  const handleOpenCalculatorForProperty = useCallback((prop?: Property) => {
    if (prop) {
      setCalculatorPropertyId(prop.id);
      navigateToTab(`calculator?propertyId=${encodeURIComponent(prop.id)}`);
    } else {
      navigateToTab('calculator');
    }
  }, [navigateToTab]);

  const handleOpenAuditForProperty = useCallback((prop?: Property) => {
    setAuditModalProperty(prop || data.properties[0] || null);
  }, [data.properties]);

  const handleAddPropertyCostItem = useCallback(async (item: ERPPropertyCostItem) => {
    setIsMutating(true);
    try {
      await ERPSupabaseService.addPropertyCostItem(supabase, item);
      setData(prev => ({
        ...prev,
        propertyCosts: [item, ...prev.propertyCosts]
      }));
      toast.success(
        isAr ? 'تم تسجيل فاتورة تكاليف البناء بنجاح' : 'Construction cost item registered',
        {
          description: isAr
            ? `البند: ${item.item_name_ar} • المبلغ: ${D(item.total_cost_egp).formatEGP(true)}`
            : `Item: ${item.item_name_en} • Total: ${D(item.total_cost_egp).formatEGP(false)}`,
          duration: 4000
        }
      );
    } catch (err) {
      console.warn('Fallback adding property cost item:', err);
      setData(prev => ({
        ...prev,
        propertyCosts: [item, ...prev.propertyCosts]
      }));
      toast.success(
        isAr ? 'تم تسجيل فاتورة التكاليف بنجاح' : 'Cost item recorded',
        { duration: 3000 }
      );
    } finally {
      setIsMutating(false);
    }
  }, [supabase, isAr]);

  const handleDeletePropertyCostItem = useCallback(async (itemId: string) => {
    setIsMutating(true);
    try {
      await ERPSupabaseService.deletePropertyCostItem(supabase, itemId);
      setData(prev => ({
        ...prev,
        propertyCosts: prev.propertyCosts.filter(c => c.item_id !== itemId && c.id !== itemId)
      }));
      toast.info(isAr ? 'تم حذف بند التكلفة' : 'Cost item deleted', { duration: 3000 });
    } catch (err) {
      console.warn('Fallback deleting property cost item:', err);
      setData(prev => ({
        ...prev,
        propertyCosts: prev.propertyCosts.filter(c => c.item_id !== itemId && c.id !== itemId)
      }));
      toast.info(isAr ? 'تم حذف بند التكلفة' : 'Cost item deleted', { duration: 3000 });
    } finally {
      setIsMutating(false);
    }
  }, [supabase, isAr]);

  const handleUpdatePropertyCostItem = useCallback(async (item: ERPPropertyCostItem) => {
    setIsMutating(true);
    try {
      await ERPSupabaseService.updatePropertyCostItem(supabase, item);
      setData(prev => ({
        ...prev,
        propertyCosts: prev.propertyCosts.map(c => (c.item_id === item.item_id || c.id === item.item_id) ? item : c)
      }));
      toast.success(isAr ? 'تم تحديث بيانات البند بنجاح' : 'Cost item updated');
    } catch (err) {
      console.warn('Fallback updating property cost item:', err);
      setData(prev => ({
        ...prev,
        propertyCosts: prev.propertyCosts.map(c => (c.item_id === item.item_id || c.id === item.item_id) ? item : c)
      }));
    } finally {
      setIsMutating(false);
    }
  }, [supabase, isAr]);

  const handleAddCostAdjustment = useCallback(async (updatedItem: ERPPropertyCostItem) => {
    setIsMutating(true);
    try {
      await ERPSupabaseService.addPropertyCostAdjustment(supabase, updatedItem);
      setData(prev => ({
        ...prev,
        propertyCosts: prev.propertyCosts.map(c => (c.item_id === updatedItem.item_id || c.id === updatedItem.item_id) ? updatedItem : c)
      }));
    } catch (err) {
      console.error('CRITICAL: Failed to persist cost adjustment to database:', err);
      toast.error(
        isAr ? 'فشل حفظ التسوية في قاعدة البيانات' : 'Failed to save cost adjustment to database',
        { description: err instanceof Error ? err.message : String(err) }
      );
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [supabase, isAr]);

  const handleCreateConstructionPurchaseOrder = useCallback(async (order: ERPConstructionPurchaseOrder) => {
    setIsMutating(true);
    try {
      if (!currentUser && process.env.NODE_ENV === 'development') {
        const orders = [...(data.purchaseOrders || []), order];
        window.localStorage.setItem('fin_os_local_purchase_orders', JSON.stringify(orders));
      } else {
        await ERPSupabaseService.createConstructionPurchaseOrder(supabase, { ...order, created_by: currentUser?.id });
      }
      setData(prev => ({ ...prev, purchaseOrders: [order, ...(prev.purchaseOrders || [])] }));
    } finally { setIsMutating(false); }
  }, [supabase, currentUser, data.purchaseOrders]);

  const handleRecordCostPayablePayment = useCallback(async (updatedItem: ERPPropertyCostItem) => {
    setIsMutating(true);
    try {
      const original = data.propertyCosts.find(item => item.item_id === updatedItem.item_id);
      if (!original) throw new Error('The payable is no longer available. Refresh and try again.');
      const paymentDate = updatedItem.payable_installments?.find(inst => D(inst.paid_amount_egp).gt(original.payable_installments?.find(prior => prior.installment_id === inst.installment_id)?.paid_amount_egp || 0) && !inst.installment_id.startsWith('inst-prior-'))?.payment_date || new Date().toISOString().slice(0, 10);
      const period = resolvePeriodForDate(paymentDate, data.periods, activePeriod);
      let result: { item: ERPPropertyCostItem; journal: ERPJournalEntry };
      if (!currentUser && process.env.NODE_ENV === 'development') {
        const settlement = prepareConstructionSettlement(original, updatedItem, period);
        result = { item: settlement.updatedItem, journal: settlement.journal };
      } else {
        result = await ERPSupabaseService.recordCostPayablePayment(supabase, updatedItem, original, period);
      }
      setData(prev => ({
        ...prev,
        propertyCosts: prev.propertyCosts.map(item => item.item_id === result.item.item_id ? result.item : item),
        journalEntries: prev.journalEntries.some(entry => entry.entry_id === result.journal.entry_id) ? prev.journalEntries : [result.journal, ...prev.journalEntries]
      }));
    } catch (err) {
      toast.error(isAr ? 'فشل حفظ سداد مستحقات المقاول' : 'Failed to save contractor settlement', { description: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally { setIsMutating(false); }
  }, [supabase, isAr, data.propertyCosts, data.periods, activePeriod, currentUser]);

  const handleUpdatePropertySellingPrice = useCallback(async (propertyId: string, newPriceEgp: number) => {
    setIsMutating(true);
    try {
      await ERPSupabaseService.updatePropertySellingPrice(supabase, propertyId, newPriceEgp);
      setData(prev => ({
        ...prev,
        properties: prev.properties.map(p => p.id === propertyId ? { ...p, price_egp: newPriceEgp } : p)
      }));
      toast.success(
        isAr ? 'تم تحديث سعر بيع العقار بنجاح' : 'Property selling price updated',
        {
          description: isAr ? `السعر الجديد: ${newPriceEgp.toLocaleString('ar-EG')} ج.م` : `New price: ${newPriceEgp.toLocaleString('en-US')} EGP`,
          duration: 4000
        }
      );
    } catch (err) {
      console.warn('Fallback updating property price:', err);
      setData(prev => ({
        ...prev,
        properties: prev.properties.map(p => p.id === propertyId ? { ...p, price_egp: newPriceEgp } : p)
      }));
      toast.success(
        isAr ? 'تم تحديث سعر بيع العقار' : 'Property price updated',
        { duration: 3000 }
      );
    } finally {
      setIsMutating(false);
    }
  }, [supabase, isAr]);

  const value: ERPWorkstationContextValue = {
    locale,
    isAr,
    activeTab,
    currency,
    setCurrency,
    toggleCurrency,
    currentUser,
    handleSignOut,

    hasSideWidgets,
    setHasSideWidgets,

    activePreset,
    selectPresetById,
    palettePresets: ERP_PALETTE_PRESETS,

    data,
    setData,
    isLoading,
    isMutating,
    setIsMutating,
    loadLiveData,
    realtimeStatus,
    lastSyncTime,
    triggerManualSync,

    activePeriod,
    urgentDuesCount,
    overdueAPCount,
    totalGrossContractValue,
    totalCollectedCash,
    totalWipIncurred,
    totalSafePDCs,
    totalInjectedCapital,
    wipAccounts,
    kpis,
    deferredRevenue,
    realizedRevenue,
    trancheStats,
    totalTaxLiabilities,
    totalContributedCapital,
    totalRemainingAR,
    unifiedPartners,
    partnerSummaries,
    contractPortfolioKPIs,

    partnerProfiles,
    setPartnerProfiles,
    partnerTransactions,
    setPartnerTransactions,

    liveNotifications,
    unreadNotificationsCount,
    hasCriticalAlerts,
    showNotificationCenter,
    setShowNotificationCenter,
    handleMarkNotificationRead,
    handleMarkAllNotificationsRead,
    handleDismissNotification,
    handleClearAllNotifications,
    handleNotificationAction,

    isDockCollapsed,
    setIsDockCollapsed,
    isMobileDockOpen,
    setIsMobileDockOpen,
    handleToggleDock,
    navigateToTab,

    inspectorPayload,
    setInspectorPayload,
    handleInspectContract,
    handleInspectCheque,
    handleInspectTax,
    handleInspectRSV,
    handleInspectRescission,

    showQuickSearch,
    setShowQuickSearch,
    isAcademyOpen,
    setIsAcademyOpen,
    isGuidedTourActive,
    setIsGuidedTourActive,
    showFirstTimeTourPrompt,
    setShowFirstTimeTourPrompt,

    showNewContractModal,
    setShowNewContractModal,
    selectedPropertyId,
    setSelectedPropertyId,
    selectedBuildingUnitId,
    setSelectedBuildingUnitId,
    selectedBuildingUnitNumber,
    setSelectedBuildingUnitNumber,
    isWholeBuildingContract,
    setIsWholeBuildingContract,

    customUnitName,
    setCustomUnitName,
    buyerName,
    setBuyerName,
    buyerNationalId,
    setBuyerNationalId,
    buyerPhone,
    setBuyerPhone,
    buyerEmail,
    setBuyerEmail,
    customPrice,
    setCustomPrice,
    basePriceInput,
    setBasePriceInput,
    apartmentTaxInput,
    setApartmentTaxInput,
    apartmentTaxDesc,
    setApartmentTaxDesc,
    paymentPlanType,
    setPaymentPlanType,
    downPaymentPct,
    setDownPaymentPct,
    numInstallments,
    setNumInstallments,
    firstPaymentDate,
    setFirstPaymentDate,
    cashRoutingAccount,
    setCashRoutingAccount,
    partnerSplits,
    setPartnerSplits,
    leadSelectionMode,
    setLeadSelectionMode,
    selectedLeadId,
    setSelectedLeadId,
    contractWizardStep,
    setContractWizardStep,

    showPayModal,
    setShowPayModal,
    showEscalationModal,
    setShowEscalationModal,
    escalationDelta,
    setEscalationDelta,
    escalationReason,
    setEscalationReason,
    showRescissionModal,
    setShowRescissionModal,
    selectedBranch,
    setSelectedBranch,
    rescissionStep,
    setRescissionStep,
    rescissionDate,
    setRescissionDate,

    showRSVModal,
    setShowRSVModal,
    rsvProjectName,
    setRsvProjectName,
    rsvWipAmount,
    setRsvWipAmount,
    rsvSalesValue,
    setRsvSalesValue,

    showHandoverModal,
    setShowHandoverModal,

    showNewPDCModal,
    setShowNewPDCModal,
    supplementInitialContractId,
    setSupplementInitialContractId,
    newPdcContractId,
    setNewPdcContractId,
    newPdcNumber,
    setNewPdcNumber,
    newPdcBank,
    setNewPdcBank,
    newPdcDrawer,
    setNewPdcDrawer,
    newPdcValue,
    setNewPdcValue,
    newPdcDueDate,
    setNewPdcDueDate,

    collectingPDCItem,
    setCollectingPDCItem,
    showProjectExpenseModal,
    setShowProjectExpenseModal,
    projectExpensePropertyId,
    setProjectExpensePropertyId,

    auditModalProperty,
    setAuditModalProperty,
    selectedAuditPropertyId,
    setSelectedAuditPropertyId,
    showCostModal,
    setShowCostModal,

    calculatorPropertyId,
    setCalculatorPropertyId,

    showPartnerPayoutModal,
    setShowPartnerPayoutModal,
    payoutInitialPartner,
    setPayoutInitialPartner,
    showPartnerInjectionModal,
    setShowPartnerInjectionModal,
    injectionInitialPartner,
    setInjectionInitialPartner,
    injectionInitialPropertyId,
    setInjectionInitialPropertyId,
    injectionInitialCommitmentId,
    setInjectionInitialCommitmentId,
    showNewPartnerModal,
    setShowNewPartnerModal,
    showPartnerOperationsModal,
    setShowPartnerOperationsModal,
    dossierTargetPartner,
    setDossierTargetPartner,

    handleCreateRealContract,
    handleExecuteEscalation,
    handleExecuteRescission,
    handleCollectPayment,
    handleConfirmHandover,
    handleToggleContractHandover,
    handlePDCStatusChange,
    handleSaveContractSupplement,
    handleSaveNewCheque,
    handleCollectDuePDCsToday,
    handleConfirmHandCollection,
    handleConfirmBounceCheque,
    handleTogglePeriodStatus,
    handlePostMonthlyEntries,
    handleCreateRSVAllocation,
    handleRemitTax,
    handleConfirmPartnerPayout,
    handleConfirmPartnerInjection,
    handleCreatePartnerCommitment,
    handleRegisterNewPartner,
    handleSaveProjectExpense,
    handleExportExcel,
    handleSaveProperty,
    handleOpenContractForProperty,
    handleOpenGenericNewContract,
    handleUpdatePropertyUnitTax,
    handleOpenCalculatorForProperty,
    handleOpenAuditForProperty,
    handleAddPropertyCostItem,
    handleDeletePropertyCostItem,
    handleUpdatePropertyCostItem,
    handleAddCostAdjustment,
    handleCreateConstructionPurchaseOrder,
    handleRecordCostPayablePayment,
    handleUpdatePropertySellingPrice,
  };

  return (
    <ERPWorkstationContext.Provider value={value}>
      {children}
    </ERPWorkstationContext.Provider>
  );
}
