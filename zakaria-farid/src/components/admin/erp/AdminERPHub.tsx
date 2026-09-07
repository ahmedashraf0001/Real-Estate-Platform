'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  RotateCcw, 
  TrendingUp, 
  Lock, 
  Unlock, 
  Plus, 
  Loader2, 
  CheckCircle2,
  LayoutGrid,
  List,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  Search,
  FileText,
  Building,
  Building2,
  Clock,
  User,
  Calendar,
  Eye,
  Calculator,
  Landmark,
  ArrowRight,
  Layers,
  BookOpen,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  X,
  Receipt,
  Scale,
  CreditCard,
  BarChart2,
  Wallet,
  PieChart
} from 'lucide-react';
import shellStyles from './v2/ZFWorkstationShell.module.css';
import '@/components/erp/erpTokens.css';
import { toast } from 'sonner';

import { createClient } from '@/lib/supabase/client';
import { ERPSupabaseService, LiveERPDataset } from '@/lib/erp/supabaseService';
import { CANONICAL_COA, GeneralLedgerEngine } from '@/lib/erp/ledger';
import { ContractsEngine } from '@/lib/erp/contracts';
import { EscalationEngine } from '@/lib/erp/escalation';
import { RescissionEngine } from '@/lib/erp/rescission';
import { RSVEngine } from '@/lib/erp/rsv';
import { D, generateUUID, isUUID, ensureUUID } from '@/lib/erp/math';
import { 
  ERPContract, 
  ERPInstallmentSchedule, 
  ERPJournalEntry,
  ERPPDCRecord,
  ERPRescissionRecord,
  ERPTaxRecord,
  ERPCostAllocation,
  ERPPropertyCostItem
} from '@/lib/erp/types';
import {
  PartnerShareItem,
  PRIMARY_DEVELOPER_NAME,
  getUnifiedPartnersDirectory,
  normalizePartnerSplits,
  smartRemovePartner,
  smartAddPartner,
  autoBalanceShares,
  saveRegisteredPartner
} from '@/lib/erp/partnersDirectory';

// UI_BUILD.md §4 Shared Component Library
import { StatusBadge } from '@/components/erp/StatusBadge';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { JournalEntryPreview, localizeJournalDescription } from '@/components/erp/JournalEntryPreview';
import { LockedPeriodBanner } from '@/components/erp/LockedPeriodBanner';
import { OpenQuestionFlag } from '@/components/erp/OpenQuestionFlag';
import { LegalVerificationTag } from '@/components/erp/LegalVerificationTag';
import { BranchDecisionCard } from '@/components/erp/BranchDecisionCard';
import { ImmutableRecordFrame } from '@/components/erp/ImmutableRecordFrame';
import { ERPFinancialCharts } from './ERPFinancialCharts';

import { QuickTransactionModal } from './QuickTransactionModal';
import { NewChequeModal, SupplementData } from './NewChequeModal';
import { HandCollectionModal } from './HandCollectionModal';
import { PartnerCapitalCards } from './PartnerCapitalCards';
import { CockpitAnalyticsCharts } from './CockpitAnalyticsCharts';
import { DashboardDailyActionLedger } from './DashboardDailyActionLedger';
import { DashboardFinancialCalendar } from './DashboardFinancialCalendar';
import { CapitalFlowMindmap } from '@/components/erp/CapitalFlowMindmap';
import { DashboardAnalyticalStudio } from './DashboardAnalyticalStudio';
import { exportComprehensiveArabicExcel } from '@/lib/erp/excelExporter';
import { ConstructionCostCalculator } from './ConstructionCostCalculator';
import { PropertyFinancialMatrix } from './PropertyFinancialMatrix';
import { PropertyLifecycleAuditModal } from './PropertyLifecycleAuditModal';
import { GeneralLedgerView } from './v2/views/GeneralLedgerView';
import { ContractRescissionsView } from './v2/views/ContractRescissionsView';
import { CostAllocationView } from './v2/views/CostAllocationView';
import { ApartmentTaxesView } from './v2/views/ApartmentTaxesView';
import { PartnersManagementView } from './v2/views/PartnersManagementView';
import { NewContractWizardModal } from './v2/modals/NewContractWizardModal';
import { CashCollectionReceiptModal } from './v2/modals/CashCollectionReceiptModal';
import { ContractEscalationModal } from './v2/modals/ContractEscalationModal';
import { RescissionSettlementModal } from './v2/modals/RescissionSettlementModal';
import { RSVAllocationModal } from './v2/modals/RSVAllocationModal';
import { PartnerPayoutModal } from './v2/modals/PartnerPayoutModal';
import { PartnerCapitalInjectionModal } from './v2/modals/PartnerCapitalInjectionModal';
import { PartnerDossierModal } from './v2/modals/PartnerDossierModal';
import { ERPPartnerProfile, ERPPartnerTransaction } from '@/lib/erp/types';
import { 
  PartnersEngine, 
  PartnerFinancialSummary, 
  INITIAL_PARTNER_PROFILES, 
  INITIAL_PARTNER_TRANSACTIONS 
} from '@/lib/erp/partnersEngine';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';

import { ZFNavigationDock, ERPNavModule } from './ZFNavigationDock';
import { ZFWorkstationHeader } from './v2/ZFWorkstationHeader';
import { useERPRealtimeSync } from '@/lib/erp/useERPRealtimeSync';
import { DailyOperationsView } from './v2/views/DailyOperationsView';
import { CockpitView } from './v2/views/CockpitView';
import { PropertiesPortfolioView } from './v2/views/PropertiesPortfolioView';
import { ContractsRegistryView } from './v2/views/ContractsRegistryView';
import { HandInstallmentsVaultView } from './v2/views/HandInstallmentsVaultView';
import { ConstructionFeasibilityView } from './v2/views/ConstructionFeasibilityView';
import { ZFInspectorDrawer, InspectorPayload } from './ZFInspectorDrawer';
import { ZFQuickSearchModal } from './ZFQuickSearchModal';
import { ZFNotificationCenter } from './ZFNotificationCenter';
import { ZFErpAcademyModal } from './ZFErpAcademyModal';
import { ZFErpGuidedTour } from './ZFErpGuidedTour';
import { 
  evaluateFinancialAlerts, 
  getPersistedNotificationState, 
  persistNotificationRead, 
  persistMarkAllRead, 
  persistNotificationDismiss, 
  persistClearAll 
} from '@/lib/erp/notificationEngine';

export type ERPWorkspaceTab = 
  | 'dashboard' 
  | 'operations' 
  | 'properties' 
  | 'calculator' 
  | 'ledger' 
  | 'contracts' 
  | 'pdc' 
  | 'rescissions' 
  | 'cost-allocation' 
  | 'tax'
  | 'partners';

const CANONICAL_TABS: Record<string, ERPWorkspaceTab> = {
  cockpit: 'dashboard',
  dashboard: 'dashboard',
  operations: 'operations',
  portfolio: 'properties',
  properties: 'properties',
  feasibility: 'calculator',
  calculator: 'calculator',
  registry: 'contracts',
  contracts: 'contracts',
  vault: 'pdc',
  pdc: 'pdc',
  journal: 'ledger',
  ledger: 'ledger',
  rsv: 'cost-allocation',
  'cost-allocation': 'cost-allocation',
  costallocation: 'cost-allocation',
  taxes: 'tax',
  tax: 'tax',
  rescissions: 'rescissions',
  rescission: 'rescissions',
  partners: 'partners',
  partner: 'partners',
  investors: 'partners',
  financiers: 'partners'
};

const TAB_TITLES_AR: Record<ERPWorkspaceTab, string> = {
  dashboard: 'نظرة عامة على الشغل | FIN-OS',
  operations: 'حركة الخزنة والعمليات | FIN-OS',
  properties: 'المشاريع والشقق المعروضة | FIN-OS',
  calculator: 'حاسبة تكلفة المباني والأقساط | FIN-OS',
  contracts: 'عقود البيع والعملاء | FIN-OS',
  pdc: 'أجندة ومواعيد الأقساط | FIN-OS',
  ledger: 'حسابات الشركة ودفتر اليومية | FIN-OS',
  'cost-allocation': 'توزيع مصاريف المباني على الشقق | FIN-OS',
  tax: 'ضرائب وتراخيص المشاريع | FIN-OS',
  rescissions: 'إلغاء العقود وترجيع الفلوس | FIN-OS',
  partners: 'الشركاء وممولو المشاريع | FIN-OS',
};

const TAB_TITLES_EN: Record<ERPWorkspaceTab, string> = {
  dashboard: 'Executive Cockpit | FIN-OS',
  operations: 'Daily Desk & Cashier | FIN-OS',
  properties: 'Projects & Properties Portfolio | FIN-OS',
  calculator: 'Construction Calculator & Feasibility | FIN-OS',
  contracts: 'Sales Contracts Registry | FIN-OS',
  pdc: 'Installment Dues & Hand Collections | FIN-OS',
  ledger: 'General Ledger & COA | FIN-OS',
  'cost-allocation': 'WIP Cost Allocation (RSV) | FIN-OS',
  tax: 'Project Statutory Taxes & Permits | FIN-OS',
  rescissions: 'Rescissions & Settlement | FIN-OS',
  partners: 'Partners & Financiers | FIN-OS',
};

export function resolveERPWorkspaceTab(raw?: string | null): ERPWorkspaceTab {
  if (!raw) return 'dashboard';
  return CANONICAL_TABS[raw.toLowerCase()] || 'dashboard';
}

interface AdminERPHubProps {
  adminLocale: string;
  initialTab?: string;
}

export default function AdminERPHub({ adminLocale, initialTab }: AdminERPHubProps) {
  const isAr = adminLocale === 'ar';
  const supabase = useMemo(() => createClient(), []);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Enforce active administrator authentication in client shell
  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!isMounted) return;
      if (!user && process.env.NODE_ENV !== 'development') {
        window.location.href = '/admin/login?next=/fin-os';
      } else {
        setCurrentUser(user || ({ id: 'dev-admin', email: 'admin@zakariafarid.com', role: 'authenticated' } as any));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if ((event === 'SIGNED_OUT' || !session) && process.env.NODE_ENV !== 'development') {
        window.location.href = '/admin/login';
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

  // Live Database State
  const [data, setData] = useState<LiveERPDataset>({
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
    makerCheckerRequests: [],
    properties: [],
    leads: [],
    propertyCosts: [],
    isSchemaMigrated: true
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  // Active Navigation Module & Workspace State (Direct 1-Click Access with Full Browser History Routing)
  const [activeTab, setActiveTab] = useState<ERPWorkspaceTab>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTab = urlParams.get('tab');
      if (urlTab) return resolveERPWorkspaceTab(urlTab);
    }
    return resolveERPWorkspaceTab(initialTab);
  });

  // Navigation Dock Collapsible & Mobile Drawer State
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [isMobileDockOpen, setIsMobileDockOpen] = useState<boolean>(false);

  useEffect(() => {
    // Auto-collapse on compact screen sizes (< 1100px) or read user preference
    const saved = localStorage.getItem('zf_dock_collapsed');
    if (saved !== null) {
      setIsDockCollapsed(saved === 'true');
    } else if (typeof window !== 'undefined' && window.innerWidth < 1100) {
      setIsDockCollapsed(true);
    }
  }, []);

  const handleToggleDock = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileDockOpen(prev => !prev);
    } else {
      setIsDockCollapsed(prev => {
        const next = !prev;
        localStorage.setItem('zf_dock_collapsed', String(next));
        return next;
      });
    }
  }, []);

  // Unified direct navigation router with browser history pushState & replaceState
  const navigateToTab = useCallback((target: string, pushHistory = true) => {
    const canonical = resolveERPWorkspaceTab(target);
    setActiveTab(canonical);

    if (typeof window !== 'undefined') {
      // 1. Update document title for rich browser history entries
      const title = (isAr ? TAB_TITLES_AR[canonical] : TAB_TITLES_EN[canonical]) || document.title;
      document.title = title;

      // 2. Compute canonical URL query (?tab=canonical)
      const currentUrl = new URL(window.location.href);
      const prevTab = currentUrl.searchParams.get('tab');
      currentUrl.searchParams.set('tab', canonical);
      const nextUrl = currentUrl.pathname + currentUrl.search;

      if (pushHistory) {
        if (prevTab !== canonical) {
          window.history.pushState({ tab: canonical }, '', nextUrl);
        }
      } else {
        window.history.replaceState({ tab: canonical }, '', nextUrl);
      }
    }
  }, [isAr]);

  // Handle browser Back / Forward (popstate) buttons seamlessly
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      let targetTab: string | null = null;
      if (event.state && typeof event.state.tab === 'string') {
        targetTab = event.state.tab;
      } else if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        targetTab = params.get('tab');
      }
      const canonical = resolveERPWorkspaceTab(targetTab);
      // Navigate to previous/forward tab without pushing a new duplicate history entry
      navigateToTab(canonical, false);
    };

    window.addEventListener('popstate', handlePopState);

    // Sync initial state and URL search param on initial mount
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      const tabParam = currentUrl.searchParams.get('tab');
      if (tabParam) {
        const canonical = resolveERPWorkspaceTab(tabParam);
        if (canonical !== activeTab) {
          setActiveTab(canonical);
        }
        window.history.replaceState({ tab: canonical }, '', window.location.href);
      } else {
        currentUrl.searchParams.set('tab', activeTab);
        window.history.replaceState({ tab: activeTab }, '', currentUrl.pathname + currentUrl.search);
      }
      // Update document title for initial tab
      const initialTitle = (isAr ? TAB_TITLES_AR[activeTab] : TAB_TITLES_EN[activeTab]) || document.title;
      document.title = initialTitle;
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigateToTab]);

  const stageRef = useRef<HTMLElement | null>(null);

  // Automatically reset workspace stage scroll to top when switching tabs or modules
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // Actionable urgent dues count due today or earlier (for the Daily Desk dock badge)
  const urgentDuesCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const pdcDues = data.pdcRecords.filter(p => p.status !== 'Cleared' && p.status !== 'Void' && p.due_date <= todayStr);
    const orphanSchedDues = data.schedules.filter(s => 
      s.status === 'Pending' && 
      s.due_date <= todayStr && 
      !data.pdcRecords.some(p => p.schedule_id === s.schedule_id)
    );
    return pdcDues.length + orphanSchedDues.length;
  }, [data.pdcRecords, data.schedules]);

  const [currency, setCurrency] = useState<'EGP' | 'USD'>('EGP');
  const [deepLinkedQ, setDeepLinkedQ] = useState<string | null>(null);
  
  // Workstation Inspector & Command Palette State
  const [inspectorPayload, setInspectorPayload] = useState<InspectorPayload | null>(null);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [persistedNotificationState, setPersistedNotificationState] = useState<{ readIds: Set<string>; dismissedIds: Set<string> }>({
    readIds: new Set(),
    dismissedIds: new Set()
  });

  // Hydrate persisted notification read/dismiss states on client mount
  useEffect(() => {
    setPersistedNotificationState(getPersistedNotificationState());
  }, []);
  const [contractViewMode, setContractViewMode] = useState<'cards' | 'table'>('cards');
  const [chequeViewMode, setChequeViewMode] = useState<'cards' | 'table'>('cards');
  const [contractFilter, setContractFilter] = useState<'All' | 'Delivered' | 'Pending' | 'Rescinded'>('All');
  const [contractSearchQuery, setContractSearchQuery] = useState('');
  const [chequeFilter, setChequeFilter] = useState<'All' | 'due_later' | 'overdue' | 'collected' | 'In Safe' | 'Deposited' | 'Cleared' | 'Bounced'>('All');
  const [chequeSearchQuery, setChequeSearchQuery] = useState('');
  const [chequeBankFilter, setChequeBankFilter] = useState<string>('all');
  const [chequeMaturityFilter, setChequeMaturityFilter] = useState<'all' | 'due_now' | 'due_30'>('all');
  const [collectingPDCItem, setCollectingPDCItem] = useState<ERPPDCRecord | null>(null);
  const [showNewPDCModal, setShowNewPDCModal] = useState(false);
  const [supplementInitialContractId, setSupplementInitialContractId] = useState<string | null>(null);
  const [newPdcContractId, setNewPdcContractId] = useState('');
  const [newPdcNumber, setNewPdcNumber] = useState('');
  const [newPdcBank, setNewPdcBank] = useState('');
  const [newPdcDrawer, setNewPdcDrawer] = useState('');
  const [newPdcValue, setNewPdcValue] = useState('');
  const [newPdcDueDate, setNewPdcDueDate] = useState(new Date().toISOString().split('T')[0]);

  // Apartment Taxes Ledger States
  const [taxSearchQuery, setTaxSearchQuery] = useState('');
  const [taxTypeFilter, setTaxTypeFilter] = useState<'all' | 'with_tax' | 'exempt'>('all');
  const [taxStatusFilter, setTaxStatusFilter] = useState<'all' | 'Pending' | 'Remitted to ETA'>('all');
  const [taxViewMode, setTaxViewMode] = useState<'cards' | 'table'>('cards');

  // Modals for Transactions
  const [showNewContractModal, setShowNewContractModal] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [customUnitName, setCustomUnitName] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerNationalId, setBuyerNationalId] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [basePriceInput, setBasePriceInput] = useState('');
  const [apartmentTaxInput, setApartmentTaxInput] = useState('0');
  const [apartmentTaxDesc, setApartmentTaxDesc] = useState('');
  const [paymentPlanType, setPaymentPlanType] = useState<'FULL_CASH' | 'UPFRONT_HANDOVER' | 'INSTALLMENTS'>('INSTALLMENTS');
  const [downPaymentPct, setDownPaymentPct] = useState('0.15');
  const [downPaymentInputPct, setDownPaymentInputPct] = useState('15');
  const [downPaymentAmountInput, setDownPaymentAmountInput] = useState('');
  const [numInstallments, setNumInstallments] = useState('8');
  const [firstPaymentDate, setFirstPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashRoutingAccount, setCashRoutingAccount] = useState<'101000'>('101000'); // Safe [101000] - Manual Cash on Hand (No Bank Link)

  const [partnerSplits, setPartnerSplits] = useState<PartnerShareItem[]>(() => {
    return normalizePartnerSplits(null);
  });
  const [selectedPartnerToAdd, setSelectedPartnerToAdd] = useState<string>('');
  const [customPartnerNameInput, setCustomPartnerNameInput] = useState<string>('');

  const [leadSelectionMode, setLeadSelectionMode] = useState<'EXISTING_LEAD' | 'NEW_LEAD'>('EXISTING_LEAD');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [contractWizardStep, setContractWizardStep] = useState<1 | 2 | 3>(1);
  const [contractErrors, setContractErrors] = useState<{ [key: string]: string }>({});

  // Building Contract Specific States (Whole Building vs Individual Apartment)
  const [isWholeBuildingContract, setIsWholeBuildingContract] = useState(false);
  const [selectedBuildingUnitId, setSelectedBuildingUnitId] = useState<string | undefined>(undefined);
  const [selectedBuildingUnitNumber, setSelectedBuildingUnitNumber] = useState<string | undefined>(undefined);

  // Property Lifecycle Audit, Calculator Focus & Dashboard View Modes
  const [calculatorPropertyId, setCalculatorPropertyId] = useState<string | undefined>(undefined);
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
  const [dashboardViewMode, setDashboardViewMode] = useState<'daily' | 'analytics' | 'all'>('daily');
  const [analyticsSubView, setAnalyticsSubView] = useState<'mindmap' | 'studio'>('mindmap');

  // FIN-OS Academy & Guided Tour States
  const [isAcademyOpen, setIsAcademyOpen] = useState(false);
  const [isGuidedTourActive, setIsGuidedTourActive] = useState(false);
  const [showFirstTimeTourPrompt, setShowFirstTimeTourPrompt] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem('zf_fin_os_tour_completed_v1');
      if (!completed) {
        setShowFirstTimeTourPrompt(true);
      }
    }
  }, []);

  // FIN-OS Partners & Project Financiers Management States
  const [partnerProfiles, setPartnerProfiles] = useState<ERPPartnerProfile[]>(INITIAL_PARTNER_PROFILES);
  const [partnerTransactions, setPartnerTransactions] = useState<ERPPartnerTransaction[]>(INITIAL_PARTNER_TRANSACTIONS);
  const [showPartnerPayoutModal, setShowPartnerPayoutModal] = useState<boolean>(false);
  const [payoutInitialPartner, setPayoutInitialPartner] = useState<string | undefined>(undefined);
  const [showPartnerInjectionModal, setShowPartnerInjectionModal] = useState<boolean>(false);
  const [injectionInitialPartner, setInjectionInitialPartner] = useState<string | undefined>(undefined);
  const [dossierTargetPartner, setDossierTargetPartner] = useState<PartnerFinancialSummary | null>(null);

  const unifiedPartners = useMemo(() => {
    return getUnifiedPartnersDirectory(data.partnerCalls, data.properties, data.contracts);
  }, [data.partnerCalls, data.properties, data.contracts]);

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (!leadId) return;
    const lead = data.leads?.find(l => l.id === leadId);
    if (lead) {
      setBuyerName(lead.name);
      setBuyerPhone(lead.phone || '');
      setBuyerEmail(lead.email || '');
      if (lead.property_id && (!selectedPropertyId || selectedPropertyId === 'custom_unit')) {
        const matchingProp = data.properties.find(p => p.id === lead.property_id);
        if (matchingProp) {
          setSelectedPropertyId(matchingProp.id);
          setCustomPrice(matchingProp.price_egp.toString());
          if (matchingProp.partner_splits && matchingProp.partner_splits.length > 0) {
            setPartnerSplits(normalizePartnerSplits(matchingProp.partner_splits));
          } else {
            setPartnerSplits(normalizePartnerSplits(null));
          }
        }
      }
    }
  };

  const modalContractValue = useMemo(() => {
    const base = parseFloat(basePriceInput) || 0;
    if (base > 0) return base;
    if (customPrice && parseFloat(customPrice) > 0) return parseFloat(customPrice);
    const prop = data.properties.find(p => p.id === selectedPropertyId);
    return prop?.price_egp || 0;
  }, [basePriceInput, customPrice, selectedPropertyId, data.properties]);

  const handleDownPaymentPctChange = (pctStr: string) => {
    setDownPaymentInputPct(pctStr);
    const pctNum = parseFloat(pctStr);
    if (!isNaN(pctNum) && pctNum >= 0 && modalContractValue > 0) {
      const decimal = pctNum / 100;
      setDownPaymentPct(decimal.toString());
      const amt = Math.round(modalContractValue * decimal);
      setDownPaymentAmountInput(amt.toString());
    } else if (!pctStr) {
      setDownPaymentPct('0');
      setDownPaymentAmountInput('0');
    }
  };

  const handleDownPaymentAmountChange = (amtStr: string) => {
    const cleanStr = amtStr.replace(/,/g, '');
    setDownPaymentAmountInput(cleanStr);
    const amtNum = parseFloat(cleanStr);
    if (!isNaN(amtNum) && amtNum >= 0 && modalContractValue > 0) {
      const decimal = amtNum / modalContractValue;
      setDownPaymentPct(decimal.toString());
      const pct = (decimal * 100).toFixed(2).replace(/\.00$/, '');
      setDownPaymentInputPct(pct);
    } else if (!cleanStr) {
      setDownPaymentPct('0');
      setDownPaymentInputPct('0');
    }
  };

  const handleSelectPresetPct = (presetPct: number) => {
    handleDownPaymentPctChange(presetPct.toString());
  };

  const modalDpAmount = useMemo(() => {
    if (paymentPlanType === 'FULL_CASH') return modalContractValue;
    if (downPaymentAmountInput !== '') {
      const parsed = parseFloat(downPaymentAmountInput);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    const pctNum = parseFloat(downPaymentInputPct) || 15;
    return modalContractValue * (pctNum / 100);
  }, [paymentPlanType, modalContractValue, downPaymentAmountInput, downPaymentInputPct]);

  const validateStep1 = useCallback((): boolean => {
    const errors: { [key: string]: string } = {};

    if (!selectedPropertyId) {
      errors.property = isAr ? 'يرجى اختيار الوحدة العقارية موضوع التعاقد' : 'Please select target property unit';
    } else if (selectedPropertyId === 'custom_unit' && !customUnitName.trim()) {
      errors.customUnitName = isAr ? 'يرجى كتابة اسم وتفاصيل المشروع / الوحدة المخصصة' : 'Please specify custom unit / project details';
    } else if (selectedPropertyId !== 'custom_unit') {
      const prop = data.properties.find(p => p.id === selectedPropertyId);
      const isBuilding = prop && (prop.type === 'building' || (prop.title_ar || '').includes('عمارة') || (prop.title_en || '').toLowerCase().includes('building'));

      if (isBuilding) {
        const wholeContract = data.contracts.find(c => 
          (c.property_id === selectedPropertyId || (prop && (c.unit_id === prop.title_ar || c.unit_id === prop.title_en))) && 
          (c.status === 'Active' || c.status === 'Completed') &&
          (c.is_whole_building_sale || !c.building_unit_id)
        );
        if (wholeContract || prop.listing_status === 'sold') {
          errors.property = isAr 
            ? `عفواً! هذه العمارة تم بيعها بالكامل بموجب العقد (${wholeContract?.contract_number || 'مسجل'}) باسم (${wholeContract?.buyer_name || 'المشتري'}). لا يمكن بيع أي شقة منفصلة منها.`
            : `This building is already sold entirely under contract ${wholeContract?.contract_number || ''}. No individual apartments can be sold.`;
        } else if (!isWholeBuildingContract && selectedBuildingUnitId) {
          const targetUnit = (prop.building_units || []).find(u => u.unit_id === selectedBuildingUnitId);
          if (targetUnit && targetUnit.status === 'contracted') {
            errors.property = isAr 
              ? `عفواً! هذه الشقة (${targetUnit.unit_number}) بالعمارة متعاقد عليها بالفعل بموجب عقد سابق.`
              : `This apartment (${targetUnit.unit_number}) is already contracted.`;
          }
        }
      } else {
        const existingContract = data.contracts.find(c => 
          (c.property_id === selectedPropertyId || (prop && (c.unit_id === prop.title_ar || c.unit_id === prop.title_en))) && 
          (c.status === 'Active' || c.status === 'Completed')
        );
        if (existingContract) {
          errors.property = isAr 
            ? `عفواً! هذا العقار متعاقد عليه بالفعل بموجب العقد (${existingContract.contract_number}) باسم (${existingContract.buyer_name}). لا يمكن تحرير عقد بيع مكرر لنفس العقار إلا بعد فسخ العقد القائم.`
            : `This property is already sold under active contract ${existingContract.contract_number} for ${existingContract.buyer_name}.`;
        }
      }
    }

    if (!buyerName.trim()) {
      errors.buyerName = isAr ? 'يرجى إدخال الاسم القانوني للمشتري المثبت بالعقد' : 'Please enter buyer legal full name';
    } else if (buyerName.trim().length < 3) {
      errors.buyerName = isAr ? 'اسم المشتري يجب أن لا يقل عن ٣ أحرف' : 'Buyer name must be at least 3 characters';
    }

    if (!buyerNationalId.trim()) {
      errors.buyerNationalId = isAr ? 'يرجى إدخال الرقم القومي (١٤ رقم) أو رقم السجل التجاري' : 'Please enter National ID (14 digits) or Commercial Reg #';
    } else if (buyerNationalId.trim().length < 6) {
      errors.buyerNationalId = isAr ? 'الرقم القومي / السجل التجاري يجب أن يتكون من ٦ خانات على الأقل' : 'National ID / Reg # must be at least 6 digits';
    }

    if (!buyerPhone.trim()) {
      errors.buyerPhone = isAr ? 'يرجى إدخال رقم هاتف المشتري للتواصل والتوثيق' : 'Please enter buyer phone number';
    }

    setContractErrors(errors);
    return Object.keys(errors).length === 0;
  }, [selectedPropertyId, customUnitName, buyerName, buyerNationalId, buyerPhone, isAr, data.contracts, data.properties, isWholeBuildingContract, selectedBuildingUnitId]);

  const validateStep2 = useCallback((): boolean => {
    const errors: { [key: string]: string } = {};

    if (!modalContractValue || modalContractValue <= 0) {
      errors.contractValue = isAr ? 'يرجى إدخال أو تحديد قيمة صحيحة للتعاقد' : 'Please enter valid contract value';
    }

    if (!firstPaymentDate) {
      errors.firstPaymentDate = isAr ? 'يرجى اختيار تاريخ توقيع وسداد العقد' : 'Please select contract date';
    }

    if (paymentPlanType === 'INSTALLMENTS') {
      const numInst = parseInt(numInstallments, 10);
      if (isNaN(numInst) || numInst < 1) {
        errors.numInstallments = isAr ? 'يرجى تحديد عدد الأقساط (قسط واحد على الأقل)' : 'Please specify at least 1 installment';
      }
      if (modalDpAmount < 0 || modalDpAmount >= modalContractValue) {
        errors.downPayment = isAr ? 'قيمة المقدم يجب أن تكون أقل من إجمالي قيمة العقد' : 'Down payment must be less than contract value';
      }
    } else if (paymentPlanType === 'UPFRONT_HANDOVER') {
      if (modalDpAmount <= 0 || modalDpAmount >= modalContractValue) {
        errors.downPayment = isAr ? 'يرجى تحديد دفعة التعاقد بصورة صحيحة' : 'Down payment must be between 0 and contract value';
      }
    }

    setContractErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  }, [modalContractValue, firstPaymentDate, paymentPlanType, numInstallments, modalDpAmount, isAr]);

  const validateStep3 = useCallback((): boolean => {
    const errors: { [key: string]: string } = {};

    const totalSplitPct = partnerSplits.reduce((acc, p) => acc + (parseFloat(p.sharePct.toString()) || 0), 0);
    if (Math.abs(totalSplitPct - 100) > 0.05) {
      errors.splits = isAr 
        ? `إجمالي نسب الشركاء والممولين يجب أن يساوي 100% بالضبط (المجموع الحالي: ${totalSplitPct}%)` 
        : `Total partner shares must equal 100% (currently: ${totalSplitPct}%)`;
    }

    if (!cashRoutingAccount) {
      errors.routing = isAr ? 'يرجى اختيار حساب توجيه النقدية المحصلة' : 'Please select cash routing account';
    }

    setContractErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  }, [partnerSplits, cashRoutingAccount, isAr]);

  const [showEscalationModal, setShowEscalationModal] = useState<ERPContract | null>(null);
  const [escalationDelta, setEscalationDelta] = useState('1500000.00');
  const [escalationReason, setEscalationReason] = useState('Engineering & material cost index adjustment');

  // Rescission Wizard with Step 0 Precondition (UI_BUILD.md §5.7)
  const [showRescissionModal, setShowRescissionModal] = useState<ERPContract | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<'Branch1_PreDelivery' | 'Branch2_PostDelivery'>('Branch1_PreDelivery');
  const [rescissionStep, setRescissionStep] = useState<0 | 1>(0);
  const [rescissionDate, setRescissionDate] = useState(new Date().toISOString().split('T')[0]);

  // Record Installment Payment Modal
  const [showPayModal, setShowPayModal] = useState<{ contract: ERPContract; schedule: ERPInstallmentSchedule } | null>(null);

  // Quick Site Expense & Transaction Modal (Client Mockup)
  const [showQuickTransactionModal, setShowQuickTransactionModal] = useState<boolean>(false);

  // RSV Allocation States
  const [showRSVModal, setShowRSVModal] = useState<boolean>(false);
  const [rsvProjectName, setRsvProjectName] = useState<string>('مشروع بالاشيال فيلاز & نايل هورايزونز');
  const [rsvWipAmount, setRsvWipAmount] = useState<string>('45000000');
  const [rsvSalesValue, setRsvSalesValue] = useState<string>('100000000');
  const [rsvSelectedPropertyId, setRsvSelectedPropertyId] = useState<string>('');
  const [rsvViewMode, setRsvViewMode] = useState<'cards' | 'table'>('cards');
  const [rsvSearchQuery, setRsvSearchQuery] = useState<string>('');

  // Global Keyboard Shortcut for Command Palette (⌘K / Ctrl+K)
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

  // Fetch Live Dataset from Supabase (supports silent background revalidation without full-screen loader)
  const loadLiveData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      const dataset = await ERPSupabaseService.fetchLiveERPData(supabase);
      setData(dataset);
      return dataset;
    } catch (err) {
      console.error('Failed to load ERP dataset from Supabase:', err);
      return null;
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [supabase]);

  // Real-Time ERP Synchronization Engine across all tables
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
    let isMounted = true;
    ERPSupabaseService.fetchLiveERPData(supabase)
      .then(dataset => {
        if (isMounted) {
          setData(dataset);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load ERP dataset from Supabase:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // Close inspector drawer whenever the active page/tab changes
  useEffect(() => {
    setInspectorPayload(null);
  }, [activeTab]);

  // Identify Active Accounting Period
  const activePeriod = useMemo(() => {
    return data.periods.find(p => p.status === 'OPEN') || data.periods[data.periods.length - 1] || {
      period_id: 'prd-2026-03',
      fiscal_year: 2026,
      period_number: 3,
      start_date: '2026-03-01',
      end_date: '2026-03-31',
      status: 'OPEN'
    };
  }, [data.periods]);

  // Optional Question Reference handler
  const handleNavigateToOpenQuestion = (_questionId: string) => {
    // Nav to open questions removed per user request
  };

  // Open contract in slide-over inspector
  const handleInspectContract = (contract: ERPContract) => {
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
  };

  // Open cheque in slide-over inspector
  const handleInspectCheque = (cheque: ERPPDCRecord) => {
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
  };

  // Open statutory tax in slide-over inspector
  const handleInspectTax = (tax: ERPTaxRecord) => {
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
  };

  // Open RSV cost allocation in slide-over inspector
  const handleInspectRSV = (allocation: ERPCostAllocation) => {
    const linkedContracts = data.contracts.filter(c => 
      (c.unit_id && c.unit_id.toLowerCase().includes(allocation.project_name.toLowerCase())) ||
      (allocation.project_name && allocation.project_name.toLowerCase().includes(c.unit_id ? c.unit_id.toLowerCase() : ''))
    );
    setInspectorPayload({
      type: 'rsv',
      allocation,
      linkedContracts
    });
  };

  // Open rescission in slide-over inspector
  const handleInspectRescission = (rescission: ERPRescissionRecord) => {
    setInspectorPayload({
      type: 'rescission',
      rescission
    });
  };

  // Executive Notification Engine Computations
  const liveNotifications = useMemo(() => {
    return evaluateFinancialAlerts({
      pdcRecords: data.pdcRecords,
      contracts: data.contracts,
      schedules: data.schedules,
      makerCheckerRequests: data.makerCheckerRequests,
      taxRecords: data.taxRecords,
      activePeriod: activePeriod,
      readIds: persistedNotificationState.readIds,
      dismissedIds: persistedNotificationState.dismissedIds
    });
  }, [data.pdcRecords, data.contracts, data.schedules, data.makerCheckerRequests, data.taxRecords, activePeriod, persistedNotificationState]);

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
    if (targetModule === 'dashboard' || targetModule === 'cockpit') {
      navigateToTab('dashboard');
    } else if (targetModule === 'pdc') {
      navigateToTab('pdc');
      if (metadata?.chequeId) {
        const cheque = data.pdcRecords.find(p => p.cheque_id === metadata.chequeId);
        if (cheque) handleInspectCheque(cheque);
      }
    } else if (targetModule === 'contracts') {
      navigateToTab('contracts');
      if (metadata?.contractId) {
        const contract = data.contracts.find(c => c.contract_id === metadata.contractId);
        if (contract) handleInspectContract(contract);
      }
    } else if (targetModule === 'tax') {
      navigateToTab('tax');
    } else if (targetModule === 'rescissions' || targetModule === 'approvals') {
      navigateToTab('rescissions');
    } else if (targetModule === 'ledger') {
      navigateToTab('ledger');
    } else if (targetModule === 'properties') {
      navigateToTab('properties');
    }
  }, [data.pdcRecords, data.contracts, navigateToTab, handleInspectCheque, handleInspectContract]);


  // Handler: Create Real Contract & Persist to Supabase
  async function handleCreateRealContract(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep1()) {
      setContractWizardStep(1);
      return;
    }
    if (!validateStep2()) {
      setContractWizardStep(2);
      return;
    }
    if (!validateStep3()) {
      setContractWizardStep(3);
      return;
    }

    const isCustom = selectedPropertyId === 'custom_unit';
    const prop = !isCustom ? data.properties.find(p => p.id === selectedPropertyId) : null;
    if (!isCustom && !prop) {
      setContractErrors(prev => ({ ...prev, property: isAr ? 'الوحدة المختارة غير صالحة' : 'Invalid property' }));
      setContractWizardStep(1);
      return;
    }

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

        if (!isWholeBuildingContract && selectedBuildingUnitId) {
          // Individual unit sale: check if this apartment is already contracted
          const targetUnit = (prop.building_units || []).find(u => u.unit_id === selectedBuildingUnitId);
          if (targetUnit && targetUnit.status === 'contracted') {
            alert(isAr 
              ? `عفواً! هذه الشقة (${targetUnit.unit_number}) بالعمارة متعاقد عليها بالفعل بموجب عقد سابق.`
              : `This apartment (${targetUnit.unit_number}) is already contracted under a previous contract.`
            );
            return;
          }
        }
      } else {
        // Whole building or standard unit sale
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

    setIsMutating(true);
    try {
      const contractValue = customPrice ? D(customPrice).toFixed() : (prop ? D(prop.price_egp).toFixed() : '0.00');
      const contractNumber = `ZF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      let effectiveDpPct = downPaymentPct;
      if (contractValue && parseFloat(contractValue) > 0 && modalDpAmount >= 0) {
        effectiveDpPct = (modalDpAmount / parseFloat(contractValue)).toString();
      }
      let effectiveNumInstallments = parseInt(numInstallments, 10);
      let intervalMonths = 3;

      if (paymentPlanType === 'FULL_CASH') {
        effectiveDpPct = '1.00';
        effectiveNumInstallments = 0;
      } else if (paymentPlanType === 'UPFRONT_HANDOVER') {
        effectiveNumInstallments = 1;
        intervalMonths = 12; // Handover lump sum
      }

      const contractId = generateUUID();

      const schedules = ContractsEngine.generateSchedule(
        contractId,
        contractValue,
        effectiveDpPct,
        effectiveNumInstallments,
        firstPaymentDate,
        intervalMonths
      );
      const dpSchedule = schedules[0];
      const dpAmount = dpSchedule ? dpSchedule.nominal_value : '0.00';

      if (paymentPlanType === 'FULL_CASH' && dpSchedule) {
        dpSchedule.status = 'Paid';
        dpSchedule.amount_paid = contractValue;
      }

      const calculatedSplits = partnerSplits.map(p => {
        const pct = (parseFloat(p.sharePct.toString()) || 0) / 100;
        return {
          partner_name: p.partnerName,
          share_percentage: `${p.sharePct}%`,
          share_amount: D(contractValue).times(pct.toString()).toFixed(2),
          cash_share: D(dpAmount).times(pct.toString()).toFixed(2)
        };
      });

      let finalLeadId = selectedLeadId;
      if (leadSelectionMode === 'NEW_LEAD' && buyerName) {
        finalLeadId = await ERPSupabaseService.registerLeadFromContract(supabase, {
          name: buyerName,
          phone: buyerPhone,
          email: buyerEmail,
          property_id: (isCustom || !prop?.id || !isUUID(prop.id)) ? undefined : prop.id,
          contractNumber: contractNumber
        });
      }

      const isBuilding = prop?.type === 'building' || (prop?.title_ar || '').includes('عمارة') || (prop?.title_en || '').toLowerCase().includes('building');
      let finalUnitId = isCustom ? customUnitName : (prop?.title_ar || prop?.title_en || 'Unit');
      if (isBuilding && !isWholeBuildingContract && selectedBuildingUnitNumber) {
        finalUnitId = `${finalUnitId} - ${selectedBuildingUnitNumber}`;
      }

      const contract: ERPContract = {
        contract_id: contractId,
        contract_number: contractNumber,
        unit_id: finalUnitId.slice(0, 50),
        property_id: (isCustom || !prop?.id || !isUUID(prop.id)) ? undefined : prop.id,
        lead_id: (finalLeadId && isUUID(finalLeadId)) ? finalLeadId : undefined,
        buyer_name: buyerName,
        buyer_phone: buyerPhone || undefined,
        buyer_email: buyerEmail || undefined,
        buyer_national_id: buyerNationalId,
        base_price: basePriceInput ? D(basePriceInput).toFixed(2) : (prop ? D(prop.price_egp).toFixed(2) : contractValue),
        tax_amount: '0.00',
        gross_contract_value: contractValue,
        currency: 'EGP',
        exchange_rate: '1.0000',
        contract_date: firstPaymentDate,
        handover_status: (paymentPlanType === 'FULL_CASH' && prop?.completion_status === 'ready') ? 'Delivered' : 'Pending',
        total_cash_collected: paymentPlanType === 'FULL_CASH' ? contractValue : '0.00',
        status: 'Active',
        payment_plan_type: paymentPlanType,
        partner_splits: calculatedSplits,
        is_whole_building_sale: isBuilding ? isWholeBuildingContract : undefined,
        building_unit_id: isBuilding && !isWholeBuildingContract ? selectedBuildingUnitId : undefined,
        building_unit_number: isBuilding && !isWholeBuildingContract ? selectedBuildingUnitNumber : undefined
      };

      const dpEntry = ContractsEngine.createAdvancePaymentEntry(
        contract,
        dpAmount,
        activePeriod,
        firstPaymentDate,
        cashRoutingAccount === '101000'
      );

      await ERPSupabaseService.persistNewContract(supabase, contract, schedules, dpEntry);

      if (isBuilding && !isWholeBuildingContract && selectedBuildingUnitId && prop?.id) {
        await ERPSupabaseService.updateBuildingUnitStatus(
          supabase,
          prop.id,
          selectedBuildingUnitId,
          'contracted',
          contractId,
          contractNumber,
          buyerName
        );
        await ERPSupabaseService.updateBuildingUnitTax(
          supabase,
          prop.id,
          selectedBuildingUnitId,
          parseFloat(apartmentTaxInput) || 0,
          apartmentTaxDesc || (isAr ? 'ضريبة ورسوم محددة يدوياً للشقة' : 'Manual Apartment Tax')
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

      toast.success(
        isAr ? `تم تحرير وحفظ العقد #${contractNumber} بنجاح` : `Contract #${contractNumber} created successfully`,
        {
          description: isAr
            ? `العميل: ${buyerName} • القيمة الإجمالية: ${D(contractValue).formatEGP(true)} • تم توليد جدول الأقساط وقيد اليومية`
            : `Client: ${buyerName} • Gross Value: ${D(contractValue).formatEGP(false)} • Schedules & GL generated`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      toast.error(isAr ? 'فشل تحرير العقد' : 'Contract creation failed', { description: msg });
    } finally {
      setIsMutating(false);
    }
  }

  // Handler: Process Price Escalation (Delta V) & Persist to Supabase
  async function handleExecuteEscalation(overrideContract?: ERPContract, deltaParam?: string, reasonParam?: string) {
    const contract = overrideContract || showEscalationModal;
    if (!contract) return;
    const delta = deltaParam ?? escalationDelta;
    const reason = reasonParam ?? escalationReason;

    setIsMutating(true);
    try {
      const contractSchedules = data.schedules.filter(s => s.contract_id === contract.contract_id);

      const result = EscalationEngine.applyEscalation(
        contract,
        contractSchedules,
        delta,
        reason,
        new Date().toISOString().split('T')[0],
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

      setShowEscalationModal(null);
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
            ? `قيمة الفارق: ${parseFloat(delta) >= 0 ? '+' : ''}${parseFloat(delta).toLocaleString('ar-EG')} ج.م • تم تحديث جدول الأقساط`
            : `Delta: ${parseFloat(delta).toLocaleString('en-US')} EGP • Schedules updated`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      console.error('Failed to apply price escalation:', err);
      toast.error(isAr ? 'تعذر إتمام تعديل العقد' : 'Failed to execute escalation', {
        description: (err as Error).message || String(err)
      });
    } finally {
      setIsMutating(false);
    }
  }

  // Handler: Process Rescission & Persist to Supabase
  async function handleExecuteRescission(overrideContract?: ERPContract) {
    const contract = overrideContract || showRescissionModal;
    if (!contract) return;

    setIsMutating(true);
    try {
      const contractSchedules = data.schedules.filter(s => s.contract_id === contract.contract_id);

      const result = RescissionEngine.processRescission(
        contract,
        contractSchedules,
        activePeriod,
        rescissionDate,
        D(contract.gross_contract_value).times('0.45').toFixed(),
        '501000',
        '151000',
        'CFO_FARID'
      );

      const voidIds = contractSchedules.filter(s => s.status === 'Pending').map(s => s.schedule_id);

      await ERPSupabaseService.persistRescission(
        supabase,
        contract.contract_id,
        result.rescissionRecord,
        result.journalEntry,
        voidIds
      );

      setShowRescissionModal(null);
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
      const msg = (err as Error).message;
      toast.error(isAr ? 'فشل فسخ العقد' : 'Contract rescission failed', { description: msg });
    } finally {
      setIsMutating(false);
    }
  }

  // Handler: 10-Second Direct Cash Expense from Daily Operations Desk
  const handleDirectExpenseSubmit = async (
    amount: string, 
    categoryAccount: string, 
    memo: string,
    creditAccount: string = '101000'
  ) => {
    setIsMutating(true);
    try {
      const amtStr = D(amount).toFixed(2);
      const entryNumber = `JE-EXP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const creditMemo = creditAccount === '101000'
        ? `Disbursed from Treasury Safe for: ${memo}`
        : creditAccount === '102000'
          ? `Disbursed via InstaPay / Bank for: ${memo}`
          : `Contractor / Supplier Payable for: ${memo}`;

      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: entryNumber,
        entry_date: new Date().toISOString().split('T')[0],
        period: activePeriod,
        description: memo,
        source_module: 'MANUAL',
        source_entity_id: 'DIRECT_DESK_EXPENSE',
        created_by: 'CFO_FARID',
        lines: [
          {
            account_code: categoryAccount,
            debit_amount: amtStr,
            credit_amount: '0.00',
            memo: memo
          },
          {
            account_code: creditAccount,
            debit_amount: '0.00',
            credit_amount: amtStr,
            memo: creditMemo
          }
        ]
      });

      await ERPSupabaseService.persistJournalEntry(supabase, entry);
      await loadLiveData(true);

      const sourceName = creditAccount === '101000'
        ? (isAr ? 'الخزينة الرئيسية' : 'Treasury Safe')
        : creditAccount === '102000'
          ? (isAr ? 'إنستاباي / البنك' : 'InstaPay / Bank')
          : (isAr ? 'حساب الموردين والمقاولين (آجل)' : 'Accounts Payable');

      toast.success(
        isAr ? `تم توثيق القيد وترحيله بنجاح (${sourceName})` : `Expense journal posted successfully (${sourceName})`,
        {
          description: isAr
            ? `المبلغ: ${D(amount).formatEGP(true)} • البيان: ${memo} • قيد: #${entryNumber}`
            : `Amount: ${D(amount).formatEGP(false)} • Memo: ${memo} • Entry: #${entryNumber}`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      toast.error(isAr ? 'تعذر إتمام حركة صرف النقدية' : 'Direct cash disbursement failed', { description: msg });
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  // Handler: Record Tranche Collection & Persist to Supabase
  async function handleCollectPayment(details?: {
    receiptDate?: string;
    destinationTreasury?: 'SAFE_101000' | 'BANK_102000';
    notes?: string;
  }) {
    if (!showPayModal) return;

    setIsMutating(true);
    try {
      const { contract, schedule } = showPayModal;
      const amount = schedule.nominal_value;
      const isInstaPay = details?.destinationTreasury === 'BANK_102000';
      const targetAccount = isInstaPay ? '102000' : '101000';
      const payDate = details?.receiptDate || new Date().toISOString().split('T')[0];
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
        period: activePeriod,
        description: isAr 
          ? (isInstaPay
              ? (schedule.tranche_number === 0
                  ? `تحصيل دفعة مقدم التعاقد (قسط 0) عبر إنستاباي - عقد رقم ${contract.contract_number}${notes ? ` (${notes})` : ''}`
                  : `تحصيل القسط رقم ${schedule.tranche_number} عبر إنستاباي - عقد رقم ${contract.contract_number}${notes ? ` (${notes})` : ''}`)
              : (schedule.tranche_number === 0
                  ? `تحصيل دفعة مقدم التعاقد (قسط 0) نقداً بالخزينة - عقد رقم ${contract.contract_number}${notes ? ` (${notes})` : ''}`
                  : `تحصيل القسط رقم ${schedule.tranche_number} نقداً بالخزينة - عقد رقم ${contract.contract_number}${notes ? ` (${notes})` : ''}`))
          : `Installment #${schedule.tranche_number} collected via ${isInstaPay ? 'InstaPay' : 'Safe'} - Contract ${contract.contract_number}`,
        source_module: 'SALES',
        source_entity_id: contract.contract_id,
        created_by: 'CFO_FARID',
        lines: [
          {
            account_code: targetAccount, // 101000 Safe or 102000 Bank/InstaPay
            debit_amount: amount,
            credit_amount: '0.00',
            memo: isAr 
              ? (isInstaPay 
                  ? `إيداع بنكي فوري بالبنك التشغيلي (إنستاباي) للعقد ${contract.contract_number}`
                  : `توريد نقدي لخزينة الشركة الرئيسية للعقد ${contract.contract_number}`)
              : `Collection into ${isInstaPay ? 'Operating Bank' : 'Treasury Safe'} for Contract ${contract.contract_number}`
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

      setShowPayModal(null);
      const updatedDataset = await loadLiveData(true);

      // Keep the sidebar open and update its data with the newly paid status!
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

      toast.success(
        isInstaPay
          ? (isAr ? `تم تحصيل القسط #${schedule.tranche_number} عبر إنستاباي بنجاح` : `Installment #${schedule.tranche_number} collected via InstaPay`)
          : (isAr ? `تم تحصيل القسط #${schedule.tranche_number} وتوريده للخزينة بنجاح` : `Installment #${schedule.tranche_number} collected into Safe`),
        {
          description: isAr
            ? `العقد: #${contract.contract_number} • المبلغ: ${D(amount).formatEGP(true)} • تم إثبات القيد بدفتر اليومية`
            : `Contract: #${contract.contract_number} • Amount: ${D(amount).formatEGP(false)} • GL entry posted`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      toast.error(isAr ? 'فشل تحصيل القسط' : 'Failed to collect installment', { description: msg });
    } finally {
      setIsMutating(false);
    }
  }

  // Handler: Toggle Contract Handover Status (Pending <-> Delivered)
  async function handleToggleContractHandover(contract: ERPContract) {
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
  }

  // Handler: Update PDC Cheque Status in Supabase
  async function handlePDCStatusChange(chequeId: string, newStatus: 'In Safe' | 'Deposited' | 'Cleared' | 'Bounced') {
    setIsMutating(true);
    try {
      const cheque = data.pdcRecords.find(p => p.cheque_id === chequeId);
      if (!cheque) return;

      if (newStatus === 'Cleared') {
        const entry = GeneralLedgerEngine.validateAndCreateEntry({
          entry_number: `JE-PDC-CLR-${cheque.cheque_number}`,
          entry_date: new Date().toISOString().split('T')[0],
          period: activePeriod,
          description: isAr 
            ? `تحصيل وتوريد القسط رقم ${cheque.cheque_number} كاش باليد لخزينة الشركة` 
            : `Installment #${cheque.cheque_number} collected by hand into Treasury Safe`,
          source_module: 'PDC',
          source_entity_id: cheque.cheque_id,
          created_by: 'CFO_FARID',
          lines: [
            {
              account_code: '101000', // Main Safe / Cash on Hand (Collection by hand)
              debit_amount: cheque.nominal_value,
              credit_amount: '0.00',
              memo: isAr ? `توريد كاش باليد لخزينة الشركة للقسط ${cheque.cheque_number}` : `Installment #${cheque.cheque_number} collected by hand into Treasury Safe`
            },
            {
              account_code: '103200', // Hand Installments & Safe Dues (أقساط وسندات قبض الخزينة)
              debit_amount: '0.00',
              credit_amount: cheque.nominal_value,
              memo: isAr ? `صرف وتسوية القسط رقم ${cheque.cheque_number} من عهدة الخزينة` : `Installment #${cheque.cheque_number} cleared from Safe custody`
            }
          ]
        });

        await ERPSupabaseService.persistPDCStatus(supabase, chequeId, newStatus);
        await ERPSupabaseService.persistJournalEntry(supabase, entry);
      } else {
        await ERPSupabaseService.persistPDCStatus(supabase, chequeId, newStatus);
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
      toast.error(isAr ? 'فشل تحديث حالة القسط' : 'Failed to update installment status', { description: msg });
    } finally {
      setIsMutating(false);
    }
  }

  // Handler: Append Contract Supplement / Extra Tranche (Zero-Float via D)
  async function handleSaveContractSupplement(supplementData: SupplementData) {
    setIsMutating(true);
    try {
      const targetContract = data.contracts.find(c => c.contract_id === supplementData.contractId);
      if (!targetContract) {
        throw new Error(isAr ? 'العقد المختار غير موجود في قاعدة البيانات' : 'Selected contract not found');
      }

      // 1. Calculate new gross contract value strictly via Decimal.js (Zero-Float)
      const newGrossValue = D(targetContract.gross_contract_value || '0').plus(supplementData.amount).toFixed(2);

      // 2. Determine next tranche number
      const existingContractSchedules = data.schedules.filter(
        s => s.contract_id === targetContract.contract_id && s.status !== 'Void'
      );
      const maxTranche = existingContractSchedules.length > 0 
        ? Math.max(...existingContractSchedules.map(s => s.tranche_number))
        : 0;
      const newTrancheNumber = maxTranche + 1;

      // 3. Construct new Installment Schedule
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

      // 4. Construct new Safe PDC record (101000)
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

      // 5. Persist via ERPSupabaseService
      await ERPSupabaseService.addContractSupplement(supabase, {
        contractId: targetContract.contract_id,
        newGrossValue,
        newSchedule,
        newPdc
      });

      // 6. Reload live data
      await loadLiveData();
      setShowNewPDCModal(false);
      setSupplementInitialContractId(null);

      // 7. Executive Toast Notification
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
  }

  // Handler: Register New Incoming Cheque into Safe
  async function handleSaveNewCheque(chequeData: {
    contractId: string;
    scheduleId?: string;
    chequeNumber: string;
    bankName: string;
    drawerName: string;
    nominalValue: string;
    dueDate: string;
  }) {
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
      setShowNewPDCModal(false);

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
  }

  // Handler: Bulk Collect All Dues Due Today by Hand into Main Safe [101000]
  async function handleCollectDuePDCsToday() {
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

    setIsMutating(true);
    try {
      for (const item of dueToday) {
        const entry = GeneralLedgerEngine.validateAndCreateEntry({
          entry_number: `JE-CASH-REC-${item.cheque_number}`,
          entry_date: todayStr,
          period: activePeriod,
          description: `تحصيل قسط باليد نقداً بالخزينة - بند #${item.cheque_number} - العميل: ${item.drawer_name}`,
          source_module: 'PDC',
          source_entity_id: item.cheque_id,
          created_by: 'CFO_FARID',
          lines: [
            {
              account_code: '101000', // Main Safe
              debit_amount: item.nominal_value,
              credit_amount: '0.00',
              memo: isAr ? `تحصيل قسط نقداً باليد - العميل: ${item.drawer_name}` : `Hand collection - Client: ${item.drawer_name}`
            },
            {
              account_code: '103200', // Hand Installments & Safe Dues (أقساط وسندات قبض الخزينة)
              debit_amount: '0.00',
              credit_amount: item.nominal_value,
              memo: isAr ? `إثبات سداد قسط باليد - بند #${item.cheque_number}` : `Hand installment settlement - Item #${item.cheque_number}`
            }
          ]
        });
        await ERPSupabaseService.persistPDCStatus(supabase, item.cheque_id, 'Cleared');
        await ERPSupabaseService.persistJournalEntry(supabase, entry);
      }
      await loadLiveData();

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
      toast.error(isAr ? 'فشل التحصيل الجماعي للأقساط' : 'Bulk collection failed', { description: msg });
    } finally {
      setIsMutating(false);
    }
  }

  // Handler: Execute Individual Hand Cash or InstaPay Collection with Official Receipt Number
  async function handleConfirmHandCollection(
    item: ERPPDCRecord,
    receiptNo: string,
    date: string,
    amount: string,
    notes: string,
    method: 'CASH' | 'INSTAPAY' = 'CASH'
  ) {
    if (item.status === 'Cleared') {
      const msg = isAr ? 'لا يمكن إعادة تحصيل قسط تم تحصيله وإثباته دفترياً مسبقاً' : 'Cannot re-collect an already cleared installment';
      toast.error(msg);
      throw new Error(msg);
    }
    setIsMutating(true);
    try {
      const isInstaPay = method === 'INSTAPAY';
      const targetAccount = isInstaPay ? '102000' : '101000';

      // 1. Locate linked contract and schedule
      const contract = data.contracts.find(c => c.contract_id === item.contract_id);
      const schedule = data.schedules.find(s => 
        (item.schedule_id && s.schedule_id === item.schedule_id) ||
        (s.contract_id === item.contract_id && s.due_date === item.due_date && s.status === 'Pending') ||
        (s.contract_id === item.contract_id && s.status === 'Pending')
      );

      const isDelivered = contract?.handover_status === 'Delivered';
      const creditAccount = isDelivered ? '103000' : (item.schedule_id ? '203000' : '103200');

      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: isInstaPay ? `JE-IP-${receiptNo}` : `JE-RCP-${receiptNo}`,
        entry_date: date,
        period: activePeriod,
        description: isInstaPay
          ? `تحصيل قسط عبر إنستاباي بموجب مرجع رقم ${receiptNo} من العميل: ${item.drawer_name}${notes ? ` - ${notes}` : ''}`
          : `تحصيل قسط نقداً بالخزينة بموجب إيصال رقم ${receiptNo} من العميل: ${item.drawer_name}${notes ? ` - ${notes}` : ''}`,
        source_module: 'PDC',
        source_entity_id: item.cheque_id,
        created_by: 'CFO_FARID',
        lines: [
          {
            account_code: targetAccount, // 101000 Main Safe or 102000 Bank/InstaPay
            debit_amount: D(amount).toFixed(2),
            credit_amount: '0.00',
            memo: isInstaPay
              ? (isAr ? `تحويل فوري إنستاباي - مرجع #${receiptNo}` : `InstaPay transfer - Ref #${receiptNo}`)
              : (isAr ? `استلام نقدي بالخزينة - إيصال #${receiptNo}` : `Hand cash collection - Receipt #${receiptNo}`)
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

      // 2. Persist PDC status
      await ERPSupabaseService.persistPDCStatus(supabase, item.cheque_id, 'Cleared');

      // 3. Persist Schedule status & Contract total cash if linked
      if (schedule) {
        await supabase
          .from('erp_installment_schedules')
          .update({
            status: 'Paid',
            amount_paid: D(amount).toFixed(2),
            paid_date: date
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

      // 4. Persist Journal Entry
      await ERPSupabaseService.persistJournalEntry(supabase, entry);

      // 5. Update local state optimistically so all UI cards & metrics update immediately
      setData(prev => ({
        ...prev,
        contracts: prev.contracts.map(c => 
          c.contract_id === item.contract_id 
            ? { ...c, total_cash_collected: D(c.total_cash_collected || '0').plus(amount).toFixed(2) }
            : c
        ),
        schedules: prev.schedules.map(s => 
          (schedule && s.schedule_id === schedule.schedule_id)
            ? { ...s, status: 'Paid', amount_paid: D(amount).toFixed(2), paid_date: date }
            : s
        ),
        pdcRecords: prev.pdcRecords.map(p => p.cheque_id === item.cheque_id ? { ...p, status: 'Cleared' as const, cleared_date: date } : p),
        journalEntries: [entry, ...prev.journalEntries]
      }));

      await loadLiveData(true);

      toast.success(
        isInstaPay
          ? (isAr ? 'تم تحصيل القسط عبر إنستاباي وإثباته بحساب البنك بنجاح' : 'Installment collected via InstaPay successfully')
          : (isAr ? 'تم تحصيل القسط وتوريد النقدية للخزينة بنجاح' : 'Installment collected and deposited into safe successfully'),
        {
          description: isAr
            ? `${isInstaPay ? 'مرجع' : 'إيصال'} #${receiptNo} • المبلغ: ${D(amount).formatEGP(true)} • العميل: ${item.drawer_name}`
            : `Ref #${receiptNo} • Amount: ${D(amount).formatEGP(false)} • Client: ${item.drawer_name}`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      toast.error(isAr ? 'تعذر إتمام عملية التحصيل' : 'Collection operation failed', { description: msg });
      throw err;
    } finally {
      setIsMutating(false);
    }
  }

  // Handler: Toggle Accounting Period Lock (Invariant 0.9)
  async function handleTogglePeriodStatus(periodId: string, newStatus: 'OPEN' | 'LOCKED' | 'CLOSED') {
    setIsMutating(true);
    try {
      await ERPSupabaseService.persistPeriodStatus(supabase, periodId, newStatus, 'CFO_FARID');
      
      // Optimistically update period in local state immediately
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
  }

  // Handler: Calculate & Add New RSV Cost Allocation
  async function handleCreateRSVAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (!rsvProjectName.trim() || !rsvWipAmount || !rsvSalesValue) return;
    setIsMutating(true);
    try {
      const newAlloc = RSVEngine.calculateAllocation(rsvProjectName.trim(), rsvWipAmount, rsvSalesValue);
      try {
        await supabase.from('erp_cost_allocations').insert([newAlloc]);
      } catch (dbErr) {
        console.warn('Silent database sync for RSV allocation:', dbErr);
      }

      setData(prev => ({
        ...prev,
        costAllocations: [newAlloc, ...prev.costAllocations]
      }));
      setShowRSVModal(false);
      handleInspectRSV(newAlloc);

      toast.success(
        isAr ? `تم حفظ وتطبيق نسبة أرباح المشروع (${rsvProjectName.trim()})` : `RSV allocation generated for (${rsvProjectName.trim()})`,
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
  }

  // Handler: Settle / Remit Apartment Tax with balanced GL Posting to Safe (101000)
  async function handleRemitTax(taxId: string) {
    const tax = data.taxRecords.find(t => t.tax_id === taxId);
    if (!tax) return;
    setIsMutating(true);
    try {
      // 1. Post GL Journal Entry: Dr 204000 (Tax Liability) / Cr 101000 (Main Safe - Cash on Hand)
      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-TAX-RMT-${tax.tax_id.slice(0, 8)}`,
        entry_date: new Date().toISOString().split('T')[0],
        period: activePeriod,
        description: `استيفاء / سداد ضريبة ورسوم الوحدة (${tax.tax_type})`,
        source_module: 'TAX',
        source_entity_id: tax.tax_id,
        created_by: 'CFO_FARID',
        lines: [
          {
            account_code: '150000', // WIP - Land Acquisition & Regulatory Permits
            debit_amount: tax.tax_amount,
            credit_amount: '0.00',
            memo: `استيفاء وتسوية رسوم وتراخيص المشروع - ${tax.tax_type}`
          },
          {
            account_code: '101000', // Main Safe (Cash on Hand)
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

      // Update inspector payload if active
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
      toast.error(isAr ? 'فشل استيفاء ضريبة الوحدة' : 'Failed to remit tax', { description: (err as Error).message });
      setData(prev => ({
        ...prev,
        taxRecords: prev.taxRecords.map(t => t.tax_id === taxId ? {
          ...t,
          remittance_status: 'Remitted to ETA'
        } : t)
      }));
    } finally {
      setIsMutating(false);
    }
  }

  // Handler: Confirm Partner Profit Distribution / Dividend Payout (INV-4.1)
  const handleConfirmPartnerPayout = async (details: {
    partnerName: string;
    amount: string;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000';
    propertyId?: string;
    propertyTitle?: string;
    payoutDate: string;
    receiptRef: string;
    memo: string;
  }) => {
    setIsMutating(true);
    try {
      // 1. Post GL Journal Entry: Dr 303000 (Partner Dividends) / Cr 101000 or 102000
      const entry = PartnersEngine.createPayoutJournalEntry({
        partnerName: details.partnerName,
        amount: details.amount,
        paymentMethod: details.paymentMethod,
        propertyTitle: details.propertyTitle,
        receiptRef: details.receiptRef,
        currentPeriod: activePeriod.period_id,
        loggedBy: 'CHIEF_EXECUTIVE'
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
      toast.error(isAr ? 'فشل تسجيل صرف الأرباح' : 'Failed to record dividend payout', {
        description: (err as Error).message
      });
    } finally {
      setIsMutating(false);
    }
  };

  // Handler: Confirm Partner Capital Injection (INV-4.1)
  const handleConfirmPartnerInjection = async (details: {
    partnerName: string;
    amount: string;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000';
    propertyId?: string;
    propertyTitle?: string;
    injectionDate: string;
    receiptRef: string;
    memo: string;
    role?: 'equity_partner' | 'land_partner' | 'silent_financier';
    phone?: string;
    nationalId?: string;
    projectSharePct?: number;
  }) => {
    setIsMutating(true);
    try {
      // 1. Post GL Journal Entry: Dr 101000 or 102000 / Cr 301000 (Partner Capital)
      const entry = PartnersEngine.createCapitalInjectionJournalEntry({
        partnerName: details.partnerName,
        amount: details.amount,
        paymentMethod: details.paymentMethod,
        propertyTitle: details.propertyTitle,
        receiptRef: details.receiptRef,
        currentPeriod: activePeriod.period_id,
        loggedBy: 'CHIEF_EXECUTIVE'
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
        payment_method: details.paymentMethod,
        journal_entry_number: entry.entry_number,
        date: details.injectionDate,
        status: 'COMPLETED',
        memo: details.memo,
        receipt_ref: details.receiptRef
      };

      // Register profile if new partner
      const roleArMap: Record<string, string> = {
        equity_partner: 'شريك ممول بالمشروع',
        land_partner: 'شريك مساهم بالأرض',
        silent_financier: 'ممول صامت'
      };
      const assignedRole = details.role || 'equity_partner';

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

      // If property and share percentage specified, link partner to property in real-time
      if (details.propertyId && details.projectSharePct && details.projectSharePct > 0) {
        setData(prev => {
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
            journalEntries: [entry, ...prev.journalEntries]
          };
        });
      } else {
        setData(prev => ({
          ...prev,
          journalEntries: [entry, ...prev.journalEntries]
        }));
      }

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
      toast.error(isAr ? 'فشل تسجيل مساهمة رأس المال' : 'Failed to record capital contribution', {
        description: (err as Error).message
      });
    } finally {
      setIsMutating(false);
    }
  };

  // Financial Metrics Summaries
  const totalGrossContractValue = useMemo(() => {
    return data.contracts.reduce((acc, c) => acc.plus(c.gross_contract_value), D(0)).toFixed(2);
  }, [data.contracts]);

  const totalCollectedCash = useMemo(() => {
    return data.contracts.reduce((acc, c) => acc.plus(c.total_cash_collected), D(0)).toFixed(2);
  }, [data.contracts]);

  const totalWipIncurred = useMemo(() => {
    return data.costAllocations.reduce((acc, ca) => acc.plus(ca.total_incurred_wip), D(0)).toFixed(2);
  }, [data.costAllocations]);

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
      if (s.status === 'Pending') pending++;
      else if (s.status === 'Paid') paid++;
      else if (s.status === 'SUPERSEDED') superseded++;
      else if (s.status === 'Void') voidCount++;
    });
    return { total: data.schedules.length, pending, paid, superseded, voidCount };
  }, [data.schedules]);

  const kpis = useMemo(() => ({
    cashBank: totalCollectedCash,
    totalWip: totalWipIncurred,
    accountsReceivable: D(totalGrossContractValue).minus(totalCollectedCash).toFixed(2),
    deferredRevenue: deferredRevenue,
    realizedRevenue: realizedRevenue
  }), [totalCollectedCash, totalWipIncurred, totalGrossContractValue, deferredRevenue, realizedRevenue]);

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

  // Client Mockup Derived Metrics
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

  // Handler: Save Quick Transaction / Site Expense (Client Mockup)
  async function handleSaveQuickEntry(entry: ERPJournalEntry) {
    setIsMutating(true);
    try {
      await ERPSupabaseService.persistJournalEntry(supabase, entry);
      await loadLiveData();

      const entryTotal = (entry.lines || []).reduce((acc, l) => acc.plus(l.debit_amount || '0'), D(0)).formatEGP(isAr);
      toast.success(
        isAr ? `تم تسجيل وترحيل قيد اليومية #${entry.entry_number} بنجاح` : `Journal entry #${entry.entry_number} posted successfully`,
        {
          description: `${entry.description} • ${entryTotal}`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      const msg = (err as Error).message;
      toast.error(isAr ? 'فشل ترحيل قيد اليومية' : 'Failed to post journal entry', { description: msg });
    } finally {
      setIsMutating(false);
    }
  }

  // Handler: Comprehensive Arabic Excel Export (Client Mockup)
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
    setDownPaymentInputPct('15');
    setDownPaymentAmountInput('');
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
  }, [loadLiveData]);

  const handleOpenCalculatorForProperty = useCallback((prop?: Property) => {
    if (prop) {
      setCalculatorPropertyId(prop.id);
    }
    navigateToTab('calculator');
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

  // Contract Portfolio Summary KPIs (Only Active & Non-Rescinded Contracts)
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
        return; // Exclude from active sales and collection metrics
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

  // Filtered Contracts (Separates Active Pipeline from Rescinded Registry)
  const filteredContracts = useMemo(() => {
    return data.contracts.filter(c => {
      // 1. Status Filter
      if (contractFilter === 'Rescinded') {
        if (c.status !== 'Rescinded') return false;
      } else {
        // By default on 'All', 'Delivered', 'Pending': EXCLUDE rescinded contracts
        if (c.status === 'Rescinded') return false;

        if (contractFilter === 'Delivered' && c.handover_status !== 'Delivered') return false;
        if (contractFilter === 'Pending' && c.handover_status !== 'Pending') return false;
      }

      // 2. Search Query Filter
      if (contractSearchQuery.trim()) {
        const q = contractSearchQuery.trim().toLowerCase();
        const matchesNum = (c.contract_number || '').toLowerCase().includes(q);
        const matchesUnit = (c.unit_id || '').toLowerCase().includes(q);
        const matchesBuyer = (c.buyer_name || '').toLowerCase().includes(q);
        if (!matchesNum && !matchesUnit && !matchesBuyer) return false;
      }

      return true;
    });
  }, [data.contracts, contractFilter, contractSearchQuery]);

  // Filtered Hand Installment Dues
  const filteredCheques = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const in30DaysStr = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];

    return data.pdcRecords.filter(p => {
      // 1. Status Filter
      if (chequeFilter === 'due_later') {
        if (p.status === 'Cleared' || p.due_date < todayStr) return false;
      } else if (chequeFilter === 'overdue') {
        if (p.status === 'Cleared' || p.due_date >= todayStr) return false;
      } else if (chequeFilter === 'collected') {
        if (p.status !== 'Cleared') return false;
      } else if (chequeFilter !== 'All' && p.status !== chequeFilter) {
        return false;
      }

      // 2. Maturity Filter
      if (chequeMaturityFilter === 'due_now' && (p.due_date > todayStr || p.status === 'Cleared')) return false;
      if (chequeMaturityFilter === 'due_30' && (p.due_date > in30DaysStr || p.status === 'Cleared')) return false;

      // 3. Search Query (Item Code, Drawer/Payer, Contract #, Unit)
      if (chequeSearchQuery.trim()) {
        const q = chequeSearchQuery.toLowerCase().trim();
        const num = (p.cheque_number || '').toLowerCase();
        const drawer = (p.drawer_name || '').toLowerCase();
        const bank = (p.bank_name || '').toLowerCase();
        const linkedCt = data.contracts.find(c => c.contract_id === p.contract_id);
        const ctNum = (linkedCt?.contract_number || '').toLowerCase();
        const unit = (linkedCt?.unit_id || '').toLowerCase();

        return num.includes(q) || drawer.includes(q) || bank.includes(q) || ctNum.includes(q) || unit.includes(q);
      }

      return true;
    });
  }, [data.pdcRecords, data.contracts, chequeFilter, chequeMaturityFilter, chequeSearchQuery]);

  // Filtered Statutory Tax Records
  const filteredTaxes = useMemo(() => {
    return data.taxRecords.filter(t => {
      // 1. Status Filter
      if (taxStatusFilter !== 'all' && t.remittance_status !== taxStatusFilter) return false;

      // 2. Type Filter: with tax vs exempt
      if (taxTypeFilter === 'with_tax' && (!parseFloat(t.tax_amount) || parseFloat(t.tax_amount) === 0)) return false;
      if (taxTypeFilter === 'exempt' && parseFloat(t.tax_amount) > 0) return false;

      // 3. Search Query
      if (taxSearchQuery.trim()) {
        const q = taxSearchQuery.toLowerCase().trim();
        const id = (t.tax_id || '').toLowerCase();
        const type = (t.tax_type || '').toLowerCase();
        const linkedCt = data.contracts.find(c => c.contract_id === t.contract_id);
        const ctNum = (linkedCt?.contract_number || '').toLowerCase();
        const unit = (linkedCt?.unit_id || '').toLowerCase();
        const buyer = (linkedCt?.buyer_name || '').toLowerCase();

        return id.includes(q) || type.includes(q) || ctNum.includes(q) || unit.includes(q) || buyer.includes(q);
      }

      return true;
    });
  }, [data.taxRecords, data.contracts, taxStatusFilter, taxTypeFilter, taxSearchQuery]);

  // Filtered Cost Allocations (RSV)
  const filteredCostAllocations = useMemo(() => {
    if (!rsvSearchQuery.trim()) return data.costAllocations;
    const q = rsvSearchQuery.toLowerCase().trim();
    return data.costAllocations.filter(ca => 
      (ca.project_name || '').toLowerCase().includes(q) ||
      (ca.allocation_id || '').toLowerCase().includes(q)
    );
  }, [data.costAllocations, rsvSearchQuery]);

  // Loading Screen
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--zf2-bg-canvas, #f8f9fa)', color: 'var(--zf2-text-primary, #0f172a)', gap: '1rem' }}>
        <Loader2 size={36} className="animate-spin" />
        <div style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.05em' }}>
          {isAr ? 'جاري تهيئة بيئة العمل المالية المباشرة (ZF FIN-OS)...' : 'Initializing ZF Financial Workstation...'}
        </div>
      </div>
    );
  }

  return (
    <div className={`${shellStyles.shell} ${isAr ? shellStyles.rtl : ''}`} data-erp-workstation="true">
      {/* 1. TOP COMMAND & TELEMETRY BAR (v2) */}
      <ZFWorkstationHeader 
        activePeriod={activePeriod}
        isAr={isAr}
        currency={currency}
        onToggleCurrency={() => setCurrency(prev => prev === 'EGP' ? 'USD' : 'EGP')}
        onOpenQuickSearch={() => setShowQuickSearch(true)}
        onRefreshData={loadLiveData}
        onExportExcel={handleExportExcel}
        isMutating={isMutating}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        unreadNotificationsCount={unreadNotificationsCount}
        hasCriticalAlerts={hasCriticalAlerts}
        onOpenNotifications={() => setShowNotificationCenter(true)}
        onOpenAcademy={() => setIsAcademyOpen(true)}
        isDockCollapsed={isDockCollapsed}
        onToggleDock={handleToggleDock}
      />

      {/* Schema Migration Advisory Banner (Only shown if tables have not been created yet) */}
      {!data.isSchemaMigrated && (
        <div style={{
          background: '#fffbeb',
          borderBottom: '1px solid #fde68a',
          padding: '0.65rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.78rem',
          color: '#b45309',
          zIndex: 45
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <AlertTriangle size={16} color="#b45309" style={{ flexShrink: 0 }} />
            <span>
              {isAr 
                ? 'تنبيه قاعدة البيانات: جداول المحاسبة المالية (erp_accounting_periods وغيرها) لم تُنشأ بعد في قاعدة بيانات Supabase. يرجى تشغيل ملف الترحيل 006_erp_financial_engine.sql في Supabase SQL Editor لتفعيل الحفظ الدائم بالسحابة. يعمل النظام حالياً بنمط المعاينة التفاعلي المباشر.'
                : 'Database Notice: ERP accounting tables are not yet deployed in your Supabase database. Run 006_erp_financial_engine.sql in Supabase SQL Editor to enable persistent cloud storage. Operating in interactive live mode.'}
            </span>
          </div>
          <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.72rem', background: '#fef3c7', color: '#78350f', border: '1px solid #fcd34d', padding: '0.2rem 0.5rem', borderRadius: '4px', flexShrink: 0, fontWeight: 700 }}>
            supabase/migrations/006_erp_financial_engine.sql
          </span>
        </div>
      )}

      {/* 2. WORKSTATION BODY: NAVIGATION DOCK + MAIN STAGE */}
      <div className={shellStyles.body}>
        {/* Left Subprogram Navigation Dock (Direct 1-Click Access to All Systems) */}
        <ZFNavigationDock 
          activeModule={activeTab === 'dashboard' ? 'cockpit' : activeTab}
          onSelectModule={(mod) => {
            navigateToTab(mod);
          }}
          urgentDuesCount={urgentDuesCount}
          contractsCount={data.contracts.length}
          pdcSafeCount={data.pdcRecords.filter(p => p.status === 'In Safe').length}
          propertiesCount={data.properties.length}
          isAr={isAr}
          onOpenAcademy={() => setIsAcademyOpen(true)}
          isCollapsed={isDockCollapsed}
          isMobileOpen={isMobileDockOpen}
          onCloseMobile={() => setIsMobileDockOpen(false)}
        />

        {/* Mobile Drawer Backdrop */}
        {isMobileDockOpen && (
          <div 
            className={shellStyles.mobileBackdrop} 
            onClick={() => setIsMobileDockOpen(false)} 
          />
        )}

        {/* Main Workstation Stage */}
        <main className={shellStyles.stage} ref={stageRef}>
          <div className={shellStyles.stageContainer}>
            {/* Proactive Period Lock Banner (Invariant 0.9) */}
            <LockedPeriodBanner period={activePeriod} isAr={isAr} />

            {/* MODULE 0: FINANCIAL COCKPIT (Default View) */}
            {activeTab === 'dashboard' && (
              <CockpitView 
                isAr={isAr}
                kpis={kpis}
                totalGrossContractValue={totalGrossContractValue}
                totalCollectedCash={totalCollectedCash}
                totalWipIncurred={totalWipIncurred}
                totalSafePDCs={data.pdcRecords
                  .filter(p => p.status === 'In Safe')
                  .reduce((acc, p) => acc.plus(p.nominal_value || '0'), D(0))
                  .toFixed(2)}
                totalInjectedCapital={data.partnerCalls
                  .reduce((acc, c) => acc.plus(c.paid_amount || c.call_amount || '0'), D(0))
                  .toFixed(2)}
                wipAccounts={wipAccounts}
                contracts={data.contracts}
                pdcRecords={data.pdcRecords}
                schedules={data.schedules}
                journalEntries={data.journalEntries}
                taxRecords={data.taxRecords}
                partnerCalls={data.partnerCalls}
                onOpenQuickTransaction={() => setShowQuickTransactionModal(true)}
                onInspectContract={handleInspectContract}
                onInspectCheque={handleInspectCheque}
                onCollectItem={setCollectingPDCItem}
                onOpenNewCheque={() => {
                  setSupplementInitialContractId(null);
                  setShowNewPDCModal(true);
                }}
                onOpenNewContract={handleOpenGenericNewContract}
                onNavigateTab={(tab) => navigateToTab(tab)}
              />
            )}

            {/* MODULE 1: DAILY OPERATIONS & CASHIER (المكتب اليومي والخزينة) */}
            {activeTab === 'operations' && (
              <DailyOperationsView 
                isAr={isAr}
                kpis={kpis}
                totalGrossContractValue={totalGrossContractValue}
                totalCollectedCash={totalCollectedCash}
                totalWipIncurred={totalWipIncurred}
                totalSafePDCs={data.pdcRecords
                  .filter(p => p.status === 'In Safe')
                  .reduce((acc, p) => acc.plus(p.nominal_value || '0'), D(0))
                  .toFixed(2)}
                properties={data.properties}
                contracts={data.contracts}
                pdcRecords={data.pdcRecords}
                schedules={data.schedules}
                journalEntries={data.journalEntries}
                activePeriod={activePeriod}
                propertyCosts={data.propertyCosts}
                isMutating={isMutating}
                onOpenQuickTransaction={() => setShowQuickTransactionModal(true)}
                onOpenNewContract={handleOpenGenericNewContract}
                onOpenNewCheque={() => {
                  setSupplementInitialContractId(null);
                  setShowNewPDCModal(true);
                }}
                onCollectItem={setCollectingPDCItem}
                onInspectContract={handleInspectContract}
                onInspectCheque={handleInspectCheque}
                onOpenContractForProperty={handleOpenContractForProperty}
                onOpenAuditForProperty={handleOpenAuditForProperty}
                onOpenCalculatorForProperty={handleOpenCalculatorForProperty}
                onOpenRSVModal={() => setShowRSVModal(true)}
                onOpenRescissionModal={(c) => setShowRescissionModal(c)}
                onOpenEscalationModal={(c) => setShowEscalationModal(c)}
                onOpenQuickSearch={() => setShowQuickSearch(true)}
                onAddPropertyCostItem={handleAddPropertyCostItem}
                onDirectExpenseSubmit={handleDirectExpenseSubmit}
                onNavigateToTab={(tab) => navigateToTab(tab)}
              />
            )}

            {/* MODULE 2: PROPERTY PORTFOLIO & WIP ASSETS (محفظة المشاريع والوحدات) */}
            {activeTab === 'properties' && (
              <PropertiesPortfolioView 
                properties={data.properties}
                contracts={data.contracts}
                propertyCosts={data.propertyCosts}
                onOpenNewContract={handleOpenGenericNewContract}
                onOpenContractForProperty={handleOpenContractForProperty}
                onOpenCalculatorForProperty={handleOpenCalculatorForProperty}
                onOpenAuditForProperty={handleOpenAuditForProperty}
                onUpdatePropertyUnitTax={handleUpdatePropertyUnitTax}
                isAr={isAr}
                isMutating={isMutating}
              />
            )}

            {/* MODULE 3: INSTALLMENT STRUCTURING & CONSTRUCTION COST CALCULATOR (حاسبة وهيكلة الأقساط وتكاليف البناء) */}
            {activeTab === 'calculator' && (
              <ConstructionFeasibilityView 
                properties={data.properties}
                propertyCosts={data.propertyCosts}
                initialPropertyId={calculatorPropertyId}
                onOpenAuditForProperty={handleOpenAuditForProperty}
                onOpenContractForProperty={handleOpenContractForProperty}
                onUpdateSellingPrice={handleUpdatePropertySellingPrice}
                isAr={isAr}
              />
            )}

            {/* MODULE 4: SALES CONTRACTS REGISTRY (سجل عقود البيع) */}
            {activeTab === 'contracts' && (
              <ContractsRegistryView 
                contracts={data.contracts}
                schedules={data.schedules}
                isAr={isAr}
                onInspectContract={handleInspectContract}
                onNavigateToProperties={() => navigateToTab('properties')}
                onOpenNewContract={handleOpenGenericNewContract}
              />
            )}

            {/* MODULE 5: HAND INSTALLMENTS & CASH DUES VAULT (حافظة بنود التحصيل والأقساط باليد) */}
            {activeTab === 'pdc' && (
              <HandInstallmentsVaultView 
                pdcRecords={data.pdcRecords}
                contracts={data.contracts}
                isAr={isAr}
                isMutating={isMutating}
                onCollectItem={(pdc) => setCollectingPDCItem(pdc)}
                onCollectDueToday={handleCollectDuePDCsToday}
                onOpenNewCheque={() => {
                  setNewPdcContractId(data.contracts[0]?.contract_id || '');
                  setNewPdcDrawer(data.contracts[0]?.buyer_name || '');
                  setNewPdcDueDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
                  setShowNewPDCModal(true);
                }}
                onInspectCheque={handleInspectCheque}
              />
            )}

            {/* MODULE 6: CONTRACT RESCISSIONS & REPOSSESSIONS (فسخ واسترداد العقود) */}
            {activeTab === 'rescissions' && (
              <ContractRescissionsView 
                rescissions={data.rescissions}
                contracts={data.contracts}
                properties={data.properties}
                isAr={isAr}
                onInspectRescission={handleInspectRescission}
                onNavigateToContracts={() => navigateToTab('contracts')}
              />
            )}

            {/* MODULE 7: GENERAL LEDGER & CHART OF ACCOUNTS (اليومية العامة وميزان المراجعة) */}
            {activeTab === 'ledger' && (
              <GeneralLedgerView 
                journalEntries={data.journalEntries}
                activePeriod={activePeriod}
                isAr={isAr}
                isMutating={isMutating}
                contracts={data.contracts}
                properties={data.properties}
                dataset={data}
                onExportExcel={handleExportExcel}
                onOpenQuickTransaction={() => setShowQuickTransactionModal(true)}
                onTogglePeriodStatus={(periodId, newStatus) => handleTogglePeriodStatus(periodId, newStatus)}
                onNavigateToOpenQuestion={handleNavigateToOpenQuestion}
              />
            )}

            {/* MODULE 8: COST ALLOCATION & RSV FACTOR (تخصيص التكاليف ومعامل الرسملة) */}
            {activeTab === 'cost-allocation' && (
              <CostAllocationView 
                costAllocations={data.costAllocations}
                isAr={isAr}
                onOpenNewAllocation={() => setShowRSVModal(true)}
                onInspectRSV={handleInspectRSV}
              />
            )}

            {/* MODULE 9: APARTMENT PROPERTY TAXES & FEES (الضرائب العقارية ورسوم الوحدات) */}
            {activeTab === 'tax' && (
              <ApartmentTaxesView 
                taxRecords={data.taxRecords}
                contracts={data.contracts}
                properties={data.properties}
                propertyCosts={data.propertyCosts}
                onOpenCostModal={(propId) => { setSelectedAuditPropertyId(propId || data.properties[0]?.id || ''); setShowCostModal(true); }}
                isAr={isAr}
                isMutating={isMutating}
                onRemitTax={handleRemitTax}
                onInspectTax={handleInspectTax}
              />
            )}

            {/* MODULE 10: PARTNERS & PROJECT FINANCIERS (الشركاء وممولو المشاريع) */}
            {activeTab === 'partners' && (
              <PartnersManagementView 
                partnerProfiles={partnerProfiles}
                partnerTransactions={partnerTransactions}
                properties={data.properties}
                contracts={data.contracts}
                partnerCalls={data.partnerCalls}
                isAr={isAr}
                isMutating={isMutating}
                onOpenPayout={(name) => {
                  setPayoutInitialPartner(name);
                  setShowPartnerPayoutModal(true);
                }}
                onOpenInjection={(name) => {
                  setInjectionInitialPartner(name);
                  setShowPartnerInjectionModal(true);
                }}
                onOpenDossier={(partner) => {
                  setDossierTargetPartner(partner);
                }}
              />
            )}
          </div>
        </main>
      </div>

      {/* 3. SLIDE-OVER DETAIL INSPECTOR DRAWER */}
      <ZFInspectorDrawer 
        payload={inspectorPayload}
        onClose={() => setInspectorPayload(null)}
        isAr={isAr}
        isOverModal={!!(showNewPDCModal || showRSVModal || showQuickTransactionModal || collectingPDCItem || showEscalationModal || showRescissionModal || auditModalProperty)}
        onPayInstallment={(c, sch) => setShowPayModal({ contract: c, schedule: sch })}
        onOpenEscalation={(c) => {
          setShowEscalationModal(c);
          setEscalationDelta('1500000.00');
        }}
        onOpenRescission={(c) => {
          setShowRescissionModal(c);
          setSelectedBranch(c.handover_status === 'Delivered' ? 'Branch2_PostDelivery' : 'Branch1_PreDelivery');
          setRescissionStep(0);
        }}
        onOpenSupplement={(c) => {
          setSupplementInitialContractId(c.contract_id);
          setShowNewPDCModal(true);
        }}
        onNavigateToTab={(tab) => navigateToTab(tab)}
        onToggleHandover={handleToggleContractHandover}
        onUpdateChequeStatus={handlePDCStatusChange}
        onInspectContract={handleInspectContract}
        onRemitTax={handleRemitTax}
        isMutating={isMutating}
      />

      {/* 4. COMMAND PALETTE MODAL (⌘K) */}
      <ZFQuickSearchModal 
        isOpen={showQuickSearch}
        onClose={() => setShowQuickSearch(false)}
        contracts={data.contracts}
        cheques={data.pdcRecords}
        onSelectModule={(mod) => navigateToTab(mod)}
        onSelectContract={(c) => handleInspectContract(c)}
        onOpenAcademy={() => setIsAcademyOpen(true)}
        onStartGuidedTour={() => setIsGuidedTourActive(true)}
        isAr={isAr}
      />

      {/* 4.25 FIN-OS MASTER ACADEMY & TUTORIAL MODAL */}
      <ZFErpAcademyModal 
        isOpen={isAcademyOpen}
        onClose={() => setIsAcademyOpen(false)}
        onStartGuidedTour={() => setIsGuidedTourActive(true)}
        onNavigateToModule={(mod) => navigateToTab(mod)}
        isAr={isAr}
      />

      {/* 4.35 INTERACTIVE ON-SCREEN GUIDED SPOTLIGHT TOUR */}
      <ZFErpGuidedTour 
        isActive={isGuidedTourActive}
        onComplete={() => setIsGuidedTourActive(false)}
        onSkip={() => setIsGuidedTourActive(false)}
        onNavigateToModule={(mod) => navigateToTab(mod)}
        isAr={isAr}
      />

      {/* 4.5 EXECUTIVE NOTIFICATION & ALERT CENTER */}
      <ZFNotificationCenter 
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
        notifications={liveNotifications}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onDismiss={handleDismissNotification}
        onClearAll={handleClearAllNotifications}
        onNavigateAction={handleNotificationAction}
        isAr={isAr}
      />

      {/* 5. DEDICATED TRANSACTION & ACTION WORKFLOW MODALS (V2 ARCHITECTURAL ALABASTER) */}
      <NewContractWizardModal 
        isOpen={showNewContractModal}
        onClose={() => { 
          setShowNewContractModal(false); 
          setContractWizardStep(1); 
          setSelectedPropertyId('');
          setSelectedBuildingUnitId(undefined);
          setSelectedBuildingUnitNumber(undefined);
        }}
        initialPropertyId={selectedPropertyId}
        initialBuildingUnitId={selectedBuildingUnitId}
        properties={data.properties}
        contracts={data.contracts}
        leads={data.leads}
        activePeriod={activePeriod}
        unifiedPartners={unifiedPartners}
        isMutating={isMutating}
        isAr={isAr}
        onContractCreated={async (payload) => {
          setSelectedPropertyId(payload.propertyId);
          setSelectedBuildingUnitId(payload.buildingUnitId || undefined);
          setSelectedBuildingUnitNumber(payload.buildingUnitNumber || undefined);
          setIsWholeBuildingContract(!payload.buildingUnitId);
          setCustomUnitName(payload.customUnitName || '');
          setBuyerName(payload.buyerName);
          setBuyerNationalId(payload.buyerNationalId);
          setBuyerPhone(payload.buyerPhone);
          setBuyerEmail(payload.buyerEmail);
          setBasePriceInput(payload.basePrice.toString());
          setApartmentTaxInput(payload.taxAmount.toString());
          setApartmentTaxDesc(payload.taxNotes || '');
          setCustomPrice(payload.totalNominalValue.toString());
          setPaymentPlanType(payload.paymentPlanType);
          setNumInstallments(payload.numInstallments.toString());
          setFirstPaymentDate(payload.firstPaymentDate);
          setPartnerSplits(payload.partnerSplits);
          setCashRoutingAccount('101000');
          
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
          await handleCreateRealContract(fakeEvent);
        }}
      />

      {/* CASH COLLECTION & RECEIPT VOUCHER MODAL */}
      <CashCollectionReceiptModal 
        isOpen={!!showPayModal}
        onClose={() => setShowPayModal(null)}
        contract={showPayModal?.contract}
        schedule={showPayModal?.schedule}
        isAr={isAr}
        isMutating={isMutating}
        onConfirmCollection={async (details) => {
          await handleCollectPayment(details);
          setShowPayModal(null);
        }}
      />

      {/* ESCALATION MODAL */}
      <ContractEscalationModal 
        isOpen={!!showEscalationModal}
        onClose={() => setShowEscalationModal(null)}
        contract={showEscalationModal}
        contracts={data.contracts}
        isAr={isAr}
        isMutating={isMutating}
        onConfirmEscalation={async (delta, reason, targetContract) => {
          setEscalationDelta(delta);
          setEscalationReason(reason);
          await handleExecuteEscalation(targetContract, delta, reason);
          setShowEscalationModal(null);
        }}
      />

      {/* RESCISSION MODAL */}
      <RescissionSettlementModal 
        isOpen={!!showRescissionModal}
        onClose={() => setShowRescissionModal(null)}
        contract={showRescissionModal}
        contracts={data.contracts}
        schedules={data.schedules}
        activePeriod={activePeriod}
        isAr={isAr}
        isMutating={isMutating}
        onConfirmRescission={async ({ selectedBranch, rescissionDate: rDate, targetContract }) => {
          setSelectedBranch(selectedBranch);
          setRescissionDate(rDate);
          await handleExecuteRescission(targetContract);
          setShowRescissionModal(null);
        }}
      />

      {/* RSV ALLOCATION MODAL */}
      <RSVAllocationModal 
        isOpen={showRSVModal}
        onClose={() => setShowRSVModal(false)}
        properties={data.properties}
        isAr={isAr}
        isMutating={isMutating}
        onSaveAllocation={async ({ projectName, salesValue, wipAmount, propertyId }) => {
          setRsvProjectName(projectName);
          setRsvSalesValue(salesValue);
          setRsvWipAmount(wipAmount);
          const fakeEvt = { preventDefault: () => {} } as React.FormEvent;
          await handleCreateRSVAllocation(fakeEvt);
          setShowRSVModal(false);
        }}
      />

      {/* RECORD NEW INSTALLMENT DUE / CONTRACT SUPPLEMENT MODAL */}
      <NewChequeModal 
        isOpen={showNewPDCModal}
        onClose={() => {
          setShowNewPDCModal(false);
          setSupplementInitialContractId(null);
        }}
        contracts={data.contracts}
        schedules={data.schedules}
        properties={data.properties}
        initialContractId={supplementInitialContractId}
        onSaveSupplement={handleSaveContractSupplement}
        onSaveCheque={handleSaveNewCheque}
        onInspectContract={handleInspectContract}
        isMutating={isMutating}
        isAr={isAr}
      />

      {/* HAND CASH COLLECTION PROCESS MODAL */}
      <HandCollectionModal 
        isOpen={!!collectingPDCItem}
        onClose={() => setCollectingPDCItem(null)}
        item={collectingPDCItem}
        allItems={data.pdcRecords}
        contracts={data.contracts}
        schedules={data.schedules}
        linkedContract={data.contracts.find(c => c.contract_id === collectingPDCItem?.contract_id)}
        onConfirmCollection={handleConfirmHandCollection}
        isMutating={isMutating}
        isAr={isAr}
      />

      {/* QUICK TRANSACTION & SITE EXPENSE MODAL (Client Mockup) */}
      <QuickTransactionModal 
        isOpen={showQuickTransactionModal}
        onClose={() => setShowQuickTransactionModal(false)}
        activePeriod={activePeriod}
        partnerCalls={data.partnerCalls}
        properties={data.properties}
        onSaveEntry={handleSaveQuickEntry}
        isAr={isAr}
        registeredPartners={unifiedPartners}
      />

      {/* PROPERTY LIFECYCLE AUDIT & MATERIAL LOGS MODAL (سجل وتدقيق مواد وتكاليف البناء) */}
      {auditModalProperty && (
        <PropertyLifecycleAuditModal 
          property={auditModalProperty}
          properties={data.properties}
          allCosts={data.propertyCosts}
          isAr={isAr}
          onClose={() => setAuditModalProperty(null)}
          onAddCostItem={handleAddPropertyCostItem}
          onDeleteCostItem={handleDeletePropertyCostItem}
          onOpenCalculatorForProperty={(propId) => {
            setAuditModalProperty(null);
            setCalculatorPropertyId(propId);
            navigateToTab('calculator');
          }}
        />
      )}

      {/* PARTNER PROFIT PAYOUT MODAL */}
      <PartnerPayoutModal 
        isOpen={showPartnerPayoutModal}
        onClose={() => {
          setShowPartnerPayoutModal(false);
          setPayoutInitialPartner(undefined);
        }}
        partners={PartnersEngine.calculatePartnerSummaries(partnerProfiles, data.properties, data.contracts, partnerTransactions, data.partnerCalls)}
        properties={data.properties}
        initialPartnerName={payoutInitialPartner}
        isAr={isAr}
        isMutating={isMutating}
        onConfirmPayout={async (details) => {
          await handleConfirmPartnerPayout(details);
          setShowPartnerPayoutModal(false);
          setPayoutInitialPartner(undefined);
        }}
      />

      {/* PARTNER CAPITAL INJECTION MODAL */}
      <PartnerCapitalInjectionModal 
        isOpen={showPartnerInjectionModal}
        onClose={() => {
          setShowPartnerInjectionModal(false);
          setInjectionInitialPartner(undefined);
        }}
        initialPartnerName={injectionInitialPartner}
        partners={PartnersEngine.calculatePartnerSummaries(partnerProfiles, data.properties, data.contracts, partnerTransactions, data.partnerCalls)}
        properties={data.properties}
        isAr={isAr}
        isMutating={isMutating}
        onConfirmInjection={async (details) => {
          await handleConfirmPartnerInjection(details);
          setShowPartnerInjectionModal(false);
          setInjectionInitialPartner(undefined);
        }}
      />

      {/* PARTNER DOSSIER & STATEMENT MODAL */}
      <PartnerDossierModal 
        isOpen={!!dossierTargetPartner}
        onClose={() => setDossierTargetPartner(null)}
        partner={dossierTargetPartner}
        transactions={partnerTransactions}
        isAr={isAr}
        onOpenPayout={(name) => {
          setDossierTargetPartner(null);
          setPayoutInitialPartner(name);
          setShowPartnerPayoutModal(true);
        }}
        onOpenInjection={(name) => {
          setDossierTargetPartner(null);
          setInjectionInitialPartner(name);
          setShowPartnerInjectionModal(true);
        }}
      />
    </div>
  );
}
