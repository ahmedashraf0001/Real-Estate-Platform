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
  Wallet
} from 'lucide-react';
import subStyles from './ZFSubprogram.module.css';
import legacyStyles from './AdminERPHub.module.css';
import '@/components/erp/erpTokens.css';

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
  autoBalanceShares
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
import { NewChequeModal } from './NewChequeModal';
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
import { GeneralLedgerView } from './GeneralLedgerView';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';

// FIN-OS Subprogram Workstation Shell Components
import { ZFCommandBar } from './ZFCommandBar';
import { ZFNavigationDock, ERPNavModule } from './ZFNavigationDock';
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

interface AdminERPHubProps {
  adminLocale: string;
}

export default function AdminERPHub({ adminLocale }: AdminERPHubProps) {
  const isAr = adminLocale === 'ar';
  const supabase = useMemo(() => createClient(), []);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Enforce active administrator authentication in client shell
  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!isMounted) return;
      if (!user) {
        window.location.href = '/admin/login?next=/fin-os';
      } else {
        setCurrentUser(user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT' || !session) {
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

  // Active Navigation Module & Workspace State
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'properties' | 'calculator' | 'ledger' | 'contracts' | 'pdc' | 'rescissions' | 'cost-allocation'
  >('dashboard');

  const stageRef = useRef<HTMLElement | null>(null);

  // Automatically reset workspace stage scroll to top when switching tabs or modules
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.scrollTop = 0;
    }
  }, [activeTab]);

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
    const tax = parseFloat(apartmentTaxInput) || 0;
    if (base > 0 || tax > 0) return base + tax;
    if (customPrice && parseFloat(customPrice) > 0) return parseFloat(customPrice);
    const prop = data.properties.find(p => p.id === selectedPropertyId);
    return prop?.price_egp || 0;
  }, [basePriceInput, apartmentTaxInput, customPrice, selectedPropertyId, data.properties]);

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
      setActiveTab('dashboard');
    } else if (targetModule === 'pdc') {
      setActiveTab('pdc');
      if (metadata?.chequeId) {
        const cheque = data.pdcRecords.find(p => p.cheque_id === metadata.chequeId);
        if (cheque) handleInspectCheque(cheque);
      }
    } else if (targetModule === 'contracts') {
      setActiveTab('contracts');
      if (metadata?.contractId) {
        const contract = data.contracts.find(c => c.contract_id === metadata.contractId);
        if (contract) handleInspectContract(contract);
      }
    } else if (targetModule === 'tax') {
      setActiveTab('calculator');
    } else if (targetModule === 'rescissions' || targetModule === 'approvals') {
      setActiveTab('rescissions');
    } else if (targetModule === 'ledger') {
      setActiveTab('ledger');
    } else if (targetModule === 'properties') {
      setActiveTab('properties');
    }
  }, [data.pdcRecords, data.contracts, data.taxRecords, handleInspectCheque, handleInspectContract, handleInspectTax]);


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
        tax_amount: apartmentTaxInput ? D(apartmentTaxInput).toFixed(2) : '0.00',
        tax_description: apartmentTaxDesc || (isAr ? 'ضريبة ورسوم محددة يدوياً للشقة' : 'Manual Apartment Tax'),
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
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsMutating(false);
    }
  }

  // Handler: Process Price Escalation (Delta V) & Persist to Supabase
  async function handleExecuteEscalation() {
    if (!showEscalationModal) return;

    setIsMutating(true);
    try {
      const contract = showEscalationModal;
      const contractSchedules = data.schedules.filter(s => s.contract_id === contract.contract_id);

      const result = EscalationEngine.applyEscalation(
        contract,
        contractSchedules,
        escalationDelta,
        escalationReason,
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
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsMutating(false);
    }
  }

  // Handler: Process Rescission & Persist to Supabase
  async function handleExecuteRescission() {
    if (!showRescissionModal) return;

    setIsMutating(true);
    try {
      const contract = showRescissionModal;
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
      setActiveTab('rescissions');
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsMutating(false);
    }
  }

  // Handler: Record Tranche Collection & Persist to Supabase
  async function handleCollectPayment() {
    if (!showPayModal) return;

    setIsMutating(true);
    try {
      const { contract, schedule } = showPayModal;
      const amount = schedule.nominal_value;

      const isDelivered = contract.handover_status === 'Delivered';
      const creditAccount = isDelivered ? '103000' : '203000';

      const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const uniqueTime = Date.now().toString(36).toUpperCase().slice(-4);
      const entryNumber = `JE-PAY-${contract.contract_number}-T${schedule.tranche_number}-${uniqueTime}${randSuffix}`;

      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: entryNumber,
        entry_date: new Date().toISOString().split('T')[0],
        period: activePeriod,
        description: `Installment #${schedule.tranche_number} collected by hand - Contract ${contract.contract_number}`,
        source_module: 'SALES',
        source_entity_id: contract.contract_id,
        created_by: 'CFO_FARID',
        lines: [
          {
            account_code: '101000', // Main Safe / Cash on Hand (Direct collection by hand, no bank link)
            debit_amount: amount,
            credit_amount: '0.00',
            memo: `Cash collection by hand into Treasury Safe for Contract ${contract.contract_number}`
          },
          {
            account_code: creditAccount,
            debit_amount: '0.00',
            credit_amount: amount,
            memo: isDelivered ? 'Settlement of Customer Accounts Receivable' : 'Credit to Deferred Contract Revenue'
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
    } catch (err: unknown) {
      alert((err as Error).message);
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
    } catch (err: unknown) {
      alert((err as Error).message);
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
          description: `PDC Cheque #${cheque.cheque_number} collected by hand into Treasury Safe`,
          source_module: 'PDC',
          source_entity_id: cheque.cheque_id,
          created_by: 'CFO_FARID',
          lines: [
            {
              account_code: '101000', // Main Safe / Cash on Hand (Collection by hand)
              debit_amount: cheque.nominal_value,
              credit_amount: '0.00',
              memo: `PDC Cheque #${cheque.cheque_number} collected by hand into Treasury Safe`
            },
            {
              account_code: '104000', // Cheques Under Collection / Safe
              debit_amount: '0.00',
              credit_amount: cheque.nominal_value,
              memo: `PDC Cheque #${cheque.cheque_number} cleared from Safe custody`
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
    } catch (err: unknown) {
      alert((err as Error).message);
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
    } catch (err: unknown) {
      alert((err as Error).message);
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
              memo: `تحصيل قسط نقداً باليد - العميل: ${item.drawer_name}`
            },
            {
              account_code: '104000', // Installments receivable
              debit_amount: '0.00',
              credit_amount: item.nominal_value,
              memo: `إثبات سداد قسط باليد - بند #${item.cheque_number}`
            }
          ]
        });
        await ERPSupabaseService.persistPDCStatus(supabase, item.cheque_id, 'Cleared');
        await ERPSupabaseService.persistJournalEntry(supabase, entry);
      }
      await loadLiveData();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsMutating(false);
    }
  }

  // Handler: Execute Individual Hand Cash Collection with Official Receipt Number
  async function handleConfirmHandCollection(
    item: ERPPDCRecord,
    receiptNo: string,
    date: string,
    amount: string,
    notes: string
  ) {
    setIsMutating(true);
    try {
      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-RCP-${receiptNo}`,
        entry_date: date,
        period: activePeriod,
        description: `تحصيل قسط نقداً باليد بموجب إيصال رقم ${receiptNo} من العميل: ${item.drawer_name}${notes ? ` - ${notes}` : ''}`,
        source_module: 'PDC',
        source_entity_id: item.cheque_id,
        created_by: 'CFO_FARID',
        lines: [
          {
            account_code: '101000', // Main Safe / Cash on Hand
            debit_amount: D(amount).toFixed(2),
            credit_amount: '0.00',
            memo: `استلام نقدي باليد - إيصال #${receiptNo}`
          },
          {
            account_code: '104000', // Installments receivable
            debit_amount: '0.00',
            credit_amount: D(amount).toFixed(2),
            memo: `سداد قسط العميل: ${item.drawer_name}`
          }
        ]
      });

      await ERPSupabaseService.persistPDCStatus(supabase, item.cheque_id, 'Cleared');
      await ERPSupabaseService.persistJournalEntry(supabase, entry);

      setData(prev => ({
        ...prev,
        pdcRecords: prev.pdcRecords.map(p => p.cheque_id === item.cheque_id ? { ...p, status: 'Cleared' as const } : p),
        journalEntries: [entry, ...prev.journalEntries]
      }));

      await loadLiveData(true);
    } catch (err: unknown) {
      alert((err as Error).message);
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
    } catch (err: unknown) {
      console.warn('Period toggle error:', err);
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
    } catch (err: unknown) {
      alert((err as Error).message);
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
            account_code: '204000', // Tax Liability
            debit_amount: tax.tax_amount,
            credit_amount: '0.00',
            memo: `استيفاء وتسوية ضريبة ورسوم الشقة - ${tax.tax_type}`
          },
          {
            account_code: '101000', // Main Safe (Cash on Hand - No Bank Link)
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
    } catch (err: unknown) {
      console.warn('Tax remit error:', err);
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
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsMutating(false);
    }
  }

  // Handler: Comprehensive Arabic Excel Export (Client Mockup)
  const handleExportExcel = useCallback(() => {
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

  const handleUpdatePropertyUnitTax = useCallback(async (propertyId: string, unitId: string, taxAmount: number, taxDesc?: string) => {
    await ERPSupabaseService.updateBuildingUnitTax(supabase, propertyId, unitId, taxAmount, taxDesc);
    await loadLiveData();
  }, [loadLiveData]);

  const handleOpenCalculatorForProperty = useCallback((prop?: Property) => {
    if (prop) {
      setCalculatorPropertyId(prop.id);
    }
    setActiveTab('calculator');
  }, []);

  const handleOpenAuditForProperty = useCallback((prop: Property) => {
    setAuditModalProperty(prop);
  }, []);

  const handleAddPropertyCostItem = useCallback(async (item: ERPPropertyCostItem) => {
    setIsMutating(true);
    try {
      await ERPSupabaseService.addPropertyCostItem(supabase, item);
      setData(prev => ({
        ...prev,
        propertyCosts: [item, ...prev.propertyCosts]
      }));
    } catch (err) {
      console.warn('Fallback adding property cost item:', err);
      setData(prev => ({
        ...prev,
        propertyCosts: [item, ...prev.propertyCosts]
      }));
    } finally {
      setIsMutating(false);
    }
  }, [supabase]);

  const handleDeletePropertyCostItem = useCallback(async (itemId: string) => {
    setIsMutating(true);
    try {
      await ERPSupabaseService.deletePropertyCostItem(supabase, itemId);
      setData(prev => ({
        ...prev,
        propertyCosts: prev.propertyCosts.filter(c => c.item_id !== itemId && c.id !== itemId)
      }));
    } catch (err) {
      console.warn('Fallback deleting property cost item:', err);
      setData(prev => ({
        ...prev,
        propertyCosts: prev.propertyCosts.filter(c => c.item_id !== itemId && c.id !== itemId)
      }));
    } finally {
      setIsMutating(false);
    }
  }, [supabase]);

  const handleUpdatePropertySellingPrice = useCallback(async (propertyId: string, newPriceEgp: number) => {
    setIsMutating(true);
    try {
      await ERPSupabaseService.updatePropertySellingPrice(supabase, propertyId, newPriceEgp);
      setData(prev => ({
        ...prev,
        properties: prev.properties.map(p => p.id === propertyId ? { ...p, price_egp: newPriceEgp } : p)
      }));
    } catch (err) {
      console.warn('Fallback updating property price:', err);
      setData(prev => ({
        ...prev,
        properties: prev.properties.map(p => p.id === propertyId ? { ...p, price_egp: newPriceEgp } : p)
      }));
    } finally {
      setIsMutating(false);
    }
  }, [supabase]);

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#07080b', color: 'var(--zf-gold, #d4af37)', gap: '1rem' }}>
        <Loader2 size={36} className="animate-spin" />
        <div style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.05em' }}>
          {isAr ? 'جاري تهيئة بيئة العمل المالية المباشرة (ZF FIN-OS)...' : 'Initializing ZF Financial Workstation...'}
        </div>
      </div>
    );
  }

  return (
    <div className={`${subStyles.workstation} ${isAr ? subStyles.rtl : ''}`} data-erp-workstation="true">
      {/* 1. TOP COMMAND & TELEMETRY BAR */}
      <ZFCommandBar 
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
      />

      {/* Schema Migration Advisory Banner (Only shown if tables have not been created yet) */}
      {!data.isSchemaMigrated && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.15) 0%, rgba(202, 138, 4, 0.08) 100%)',
          borderBottom: '1px solid rgba(234, 179, 8, 0.35)',
          padding: '0.65rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.78rem',
          color: '#fbbf24',
          zIndex: 45
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <AlertTriangle size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
            <span>
              {isAr 
                ? 'تنبيه قاعدة البيانات: جداول المحاسبة المالية (erp_accounting_periods وغيرها) لم تُنشأ بعد في قاعدة بيانات Supabase. يرجى تشغيل ملف الترحيل 006_erp_financial_engine.sql في Supabase SQL Editor لتفعيل الحفظ الدائم بالسحابة. يعمل النظام حالياً بنمط المعاينة التفاعلي المباشر.'
                : 'Database Notice: ERP accounting tables are not yet deployed in your Supabase database. Run 006_erp_financial_engine.sql in Supabase SQL Editor to enable persistent cloud storage. Operating in interactive live mode.'}
            </span>
          </div>
          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px', flexShrink: 0 }}>
            supabase/migrations/006_erp_financial_engine.sql
          </span>
        </div>
      )}

      {/* 2. WORKSTATION BODY: NAVIGATION DOCK + MAIN STAGE */}
      <div className={subStyles.workstationBody}>
        {/* Left Subprogram Navigation Dock */}
        <ZFNavigationDock 
          activeModule={activeTab === 'dashboard' ? 'cockpit' : (activeTab as ERPNavModule)}
          onSelectModule={(mod) => setActiveTab(mod === 'cockpit' ? 'dashboard' : mod)}
          contractsCount={data.contracts.length}
          pdcSafeCount={data.pdcRecords.filter(p => p.status === 'In Safe').length}
          propertiesCount={data.properties.length}
          pendingApprovalsCount={data.makerCheckerRequests.filter(r => r.status === 'Pending').length}
          openQuestionsCount={10}
          isAr={isAr}
          onOpenAcademy={() => setIsAcademyOpen(true)}
        />

        {/* Main Workstation Stage */}
        <main className={subStyles.workspaceStage} ref={stageRef}>
          <div className={subStyles.stageContainer}>
            {/* Proactive Period Lock Banner (Invariant 0.9) */}
            <LockedPeriodBanner period={activePeriod} isAr={isAr} />

          {/* MODULE 0: FINANCIAL COCKPIT */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Stage Header */}
              <div className={subStyles.stageHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div className={subStyles.stageTitleArea}>
                  <div className={subStyles.stageBreadcrumb}>
                    <span>FIN-OS</span>
                    <span>/</span>
                    <span>{isAr ? 'المراقبة التنفيذية' : 'Executive Cockpit'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                    <h1 className={subStyles.stageTitle} style={{ margin: 0 }}>
                      {isAr ? 'لوحة القيادة المالية والمنحنى المالي' : 'Financial Cockpit & Horizon Forecast'}
                    </h1>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '999px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#94a3b8'
                    }}>
                      <ShieldCheck size={13} color="#10b981" />
                      <span>{isAr ? 'الميزان متوازن (مدين = دائن)' : 'Ledger Balanced (Dr = Cr)'}</span>
                    </div>
                  </div>
                </div>

                <div className={subStyles.stageActions} data-tour="quick-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button 
                    type="button"
                    className={subStyles.actionBtnPrimary}
                    onClick={() => setShowQuickTransactionModal(true)}
                    disabled={isMutating}
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#ffffff'
                    }}
                  >
                    <DollarSign size={14} />
                    <span>{isAr ? '+ تسجيل قيد / مصروف' : '+ New Expense'}</span>
                  </button>

                  <button 
                    type="button"
                    className={subStyles.actionBtnPrimary}
                    onClick={() => setShowNewPDCModal(true)}
                    disabled={isMutating}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#e2e8f0'
                    }}
                  >
                    <Landmark size={14} />
                    <span>{isAr ? '+ استلام شيك' : '+ New Cheque'}</span>
                  </button>

                  <button 
                    type="button"
                    className={subStyles.actionBtnPrimary}
                    onClick={() => setShowNewContractModal(true)}
                    disabled={isMutating}
                  >
                    <Plus size={14} />
                    <span>{isAr ? '+ عقد بيع جديد' : '+ New Contract'}</span>
                  </button>
                </div>
              </div>

              {/* First-Time User Interactive Onboarding Welcome Pill */}
              {showFirstTimeTourPrompt && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)',
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  borderRadius: '12px',
                  padding: '0.75rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Sparkles size={18} color="#d4af37" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                      {isAr 
                        ? 'مرحباً بك في منظومة FIN-OS! هل ترغب في جولة تدريبية استرشادية مدتها دقيقتان للتعرف على المنظومة؟' 
                        : 'Welcome to FIN-OS! Would you like a 2-minute interactive guided tour of the platform?'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFirstTimeTourPrompt(false);
                        setIsGuidedTourActive(true);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #d4af37 0%, #b38f26 100%)',
                        border: 'none',
                        color: '#000000',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        padding: '0.4rem 0.85rem',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      {isAr ? 'ابدأ الجولة التفاعلية' : 'Start Tour'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFirstTimeTourPrompt(false);
                        setIsAcademyOpen(true);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#cbd5e1',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        padding: '0.4rem 0.85rem',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      {isAr ? 'دليل المنظومة' : 'Academy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFirstTimeTourPrompt(false);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('zf_fin_os_tour_completed_v1', 'true');
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '0.2rem'
                      }}
                      title={isAr ? 'إغلاق' : 'Dismiss'}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* Executive Dashboard Mode Switcher - Eliminates clutter & repetitive figures */}
              <div style={{
                background: 'rgba(18, 22, 34, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '0.4rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                justifyContent: 'flex-start',
                flexWrap: 'wrap'
              }}>
                <button
                  type="button"
                  onClick={() => setDashboardViewMode('daily')}
                  style={{
                    background: dashboardViewMode === 'daily' 
                      ? 'linear-gradient(135deg, #d4af37 0%, #b89628 100%)' 
                      : 'transparent',
                    color: dashboardViewMode === 'daily' ? '#0a0c12' : '#94a3b8',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>{isAr ? 'العمليات والمهام اليومية والاستحقاقات' : 'Daily Operations & Liquidity Schedule'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDashboardViewMode('analytics')}
                  style={{
                    background: dashboardViewMode === 'analytics' 
                      ? 'linear-gradient(135deg, #d4af37 0%, #b89628 100%)' 
                      : 'transparent',
                    color: dashboardViewMode === 'analytics' ? '#0a0c12' : '#94a3b8',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <TrendingUp size={15} />
                  <span>{isAr ? 'الاستوديو المالي والتحليلات' : 'Capital Flow & Analytics Studio'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDashboardViewMode('all')}
                  style={{
                    background: dashboardViewMode === 'all' 
                      ? 'rgba(255, 255, 255, 0.12)' 
                      : 'transparent',
                    color: dashboardViewMode === 'all' ? '#ffffff' : '#64748b',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease',
                    marginInlineStart: 'auto'
                  }}
                >
                  <Layers size={14} />
                  <span>{isAr ? 'العرض المجمع الشامل' : 'Comprehensive View'}</span>
                </button>
              </div>

              {/* 1. OPERATIONS & DAILY TASKS VIEW (No repetitive charts, focused execution) */}
              {(dashboardViewMode === 'daily' || dashboardViewMode === 'all') && (
                <>
                  {/* Today's Executive Financial Action Ledger */}
                  <div data-tour="action-ledger">
                    <DashboardDailyActionLedger 
                      pdcRecords={data.pdcRecords}
                      contracts={data.contracts}
                      schedules={data.schedules}
                      makerCheckerRequests={data.makerCheckerRequests}
                      taxRecords={data.taxRecords}
                      onInspectCheque={handleInspectCheque}
                      onInspectContract={handleInspectContract}
                      onInspectTax={handleInspectTax}
                      onNavigateToModule={(mod) => setActiveTab(mod === 'cockpit' ? 'dashboard' : mod as any)}
                      isAr={isAr}
                    />
                  </div>

                  {/* Monthly Financial & Installment Dues Calendar */}
                  <div data-tour="financial-calendar">
                    <DashboardFinancialCalendar 
                      pdcRecords={data.pdcRecords}
                      contracts={data.contracts}
                      schedules={data.schedules}
                      onInspectCheque={handleInspectCheque}
                      onInspectContract={handleInspectContract}
                      onCollectItem={(item) => setCollectingPDCItem(item)}
                      isAr={isAr}
                    />
                  </div>
                </>
              )}

              {/* 2. ANALYTICS & CAPITAL FLOW VIEW (Eliminates showing repetitive KPIs twice) */}
              {(dashboardViewMode === 'analytics' || dashboardViewMode === 'all') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {dashboardViewMode === 'analytics' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '10px',
                      padding: '0.5rem 0.85rem'
                    }}>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                        {isAr ? 'اختر أسلوب العرض التحليلي لبيانات رأس المال والسيولة:' : 'Select Analytics Visualization:'}
                      </span>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => setAnalyticsSubView('mindmap')}
                          style={{
                            background: analyticsSubView === 'mindmap' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                            color: analyticsSubView === 'mindmap' ? 'var(--zf-gold, #d4af37)' : '#64748b',
                            border: analyticsSubView === 'mindmap' ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid transparent',
                            borderRadius: '6px',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {isAr ? 'خريطة التدفقات التفاعلية (Mindmap)' : 'Capital Flow Mindmap'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnalyticsSubView('studio')}
                          style={{
                            background: analyticsSubView === 'studio' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                            color: analyticsSubView === 'studio' ? '#38bdf8' : '#64748b',
                            border: analyticsSubView === 'studio' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                            borderRadius: '6px',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {isAr ? 'استوديو التحليلات المالية (Studio)' : 'Analytical Studio'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Capital Flow Mindmap */}
                  {(dashboardViewMode === 'all' || analyticsSubView === 'mindmap') && (
                    <div data-tour="capital-mindmap">
                      <CapitalFlowMindmap 
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
                        taxRecords={data.taxRecords}
                        partnerCalls={data.partnerCalls}
                      />
                    </div>
                  )}

                  {/* Analytical Studio */}
                  {(dashboardViewMode === 'all' || analyticsSubView === 'studio') && (
                    <DashboardAnalyticalStudio 
                      isAr={isAr}
                      kpis={kpis}
                      totalGrossContractValue={totalGrossContractValue}
                      totalCollectedCash={totalCollectedCash}
                      totalWipIncurred={totalWipIncurred}
                      totalSafePDCs={data.pdcRecords
                        .filter(p => p.status === 'In Safe')
                        .reduce((acc, p) => acc.plus(p.nominal_value || '0'), D(0))
                        .toFixed(2)}
                      wipAccounts={wipAccounts}
                      trancheStats={trancheStats}
                      costAllocations={data.costAllocations}
                      partnerCalls={data.partnerCalls}
                      taxRecords={data.taxRecords}
                      totalInjectedCapital={data.partnerCalls
                        .reduce((acc, c) => acc.plus(c.paid_amount || c.call_amount || '0'), D(0))
                        .toFixed(2)}
                      registeredPartners={unifiedPartners}
                      onInjectCapital={() => setShowQuickTransactionModal(true)}
                      onInspectRSV={handleInspectRSV}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODULE: PROPERTY PORTFOLIO FINANCIAL STATUS */}
          {activeTab === 'properties' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className={subStyles.stageHeader}>
                <div className={subStyles.stageTitleArea}>
                  <div className={subStyles.stageBreadcrumb}>
                    <span>FIN-OS</span>
                    <span>/</span>
                    <span>{isAr ? 'المشاريع والمحفظة العقارية' : 'Projects & Portfolio'}</span>
                  </div>
                  <h1 className={subStyles.stageTitle}>
                    {isAr ? 'الموقف المالي والتعاقدي لمحفظة العقارات' : 'Property Portfolio Financial Status'}
                  </h1>
                </div>

                <div className={subStyles.stageActions}>
                  <button 
                    className={subStyles.actionBtnPrimary}
                    onClick={() => setShowNewContractModal(true)}
                    disabled={isMutating}
                  >
                    <Plus size={15} />
                    <span>{isAr ? 'عقد بيع جديد' : 'New Sales Contract'}</span>
                  </button>
                </div>
              </div>

              {/* Properties Portfolio Luxury Executive KPI Bar */}
              {(() => {
                const totalProps = data.properties.length;
                const contractedProps = data.properties.filter(p => 
                  data.contracts.some(c => c.status !== 'Rescinded' && (c.property_id === p.id || c.unit_id === p.title_ar || c.unit_id === p.title_en)) || 
                  p.listing_status === 'sold'
                ).length;
                const availableProps = Math.max(0, totalProps - contractedProps);
                const totalCatalogVal = data.properties.reduce((acc, p) => acc.plus(p.price_egp || 0), D(0));

                return (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '1.25rem'
                  }}>
                    {/* Card 1: Total Units */}
                    <div style={{
                      background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                      border: '1px solid rgba(212, 175, 55, 0.35)',
                      borderRadius: '16px',
                      padding: '1.35rem 1.45rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(212, 175, 55, 0.25)',
                      position: 'relative',
                      overflow: 'hidden',
                      minHeight: '155px'
                    }}>
                      <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(212, 175, 55, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 800, letterSpacing: '0.02em' }}>
                            {isAr ? 'إجمالي وحدات المحفظة' : 'Total Portfolio Listings'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--zf-text-muted, #94a3b8)' }}>
                            {isAr ? 'المقيدة بكتالوج الأصول المعمارية' : 'Catalog inventory'}
                          </span>
                        </div>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'rgba(212, 175, 55, 0.15)',
                          border: '1px solid rgba(212, 175, 55, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--zf-gold, #d4af37)',
                          boxShadow: '0 0 15px rgba(212, 175, 55, 0.2)'
                        }}>
                          <Building size={20} strokeWidth={2.2} />
                        </div>
                      </div>
                      <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--zf-gold, #d4af37)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                          {totalProps} {isAr ? 'وحدة ومبنى' : 'Units'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'rgba(212, 175, 55, 0.15)',
                          color: 'var(--zf-gold, #d4af37)',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          border: '1px solid rgba(212, 175, 55, 0.3)'
                        }}>
                          {isAr ? 'محفظة الأصول' : 'Portfolio'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {isAr ? 'جاهزة وتحت التنفيذ' : 'Ready & WIP'}
                        </span>
                      </div>
                    </div>

                    {/* Card 2: Available Units */}
                    <div style={{
                      background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      borderRadius: '16px',
                      padding: '1.35rem 1.45rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(59, 130, 246, 0.25)',
                      position: 'relative',
                      overflow: 'hidden',
                      minHeight: '155px'
                    }}>
                      <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.78rem', color: '#93c5fd', fontWeight: 800, letterSpacing: '0.02em' }}>
                            {isAr ? 'الوحدات المتاحة للتعاقد' : 'Available for Sale'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                            {isAr ? 'متاحة للبيع الفوري وإصدار العقود' : 'Open for client origination'}
                          </span>
                        </div>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#60a5fa',
                          boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)'
                        }}>
                          <Clock size={20} strokeWidth={2.4} />
                        </div>
                      </div>
                      <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#60a5fa', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                          {availableProps} {isAr ? 'وحدة متاحة' : 'Units Open'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#93c5fd',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          border: '1px solid rgba(59, 130, 246, 0.3)'
                        }}>
                          {totalProps > 0 ? `${((availableProps / totalProps) * 100).toFixed(0)}%` : '0%'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {isAr ? 'من إجمالي المعروض' : 'of inventory'}
                        </span>
                      </div>
                    </div>

                    {/* Card 3: Sold / Contracted */}
                    <div style={{
                      background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: '16px',
                      padding: '1.35rem 1.45rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(16, 185, 129, 0.25)',
                      position: 'relative',
                      overflow: 'hidden',
                      minHeight: '155px'
                    }}>
                      <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.78rem', color: '#6ee7b7', fontWeight: 800, letterSpacing: '0.02em' }}>
                            {isAr ? 'الوحدات المتعاقد عليها (المباعة)' : 'Contracted / Sold Units'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                            {isAr ? 'عقود بيع موثقة بالدفاتر' : 'Booked under active contracts'}
                          </span>
                        </div>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#10b981',
                          boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
                        }}>
                          <CheckCircle2 size={20} strokeWidth={2.4} />
                        </div>
                      </div>
                      <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10b981', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                          {contractedProps} {isAr ? 'وحدة مباعة' : 'Units Sold'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          {totalProps > 0 ? `${((contractedProps / totalProps) * 100).toFixed(0)}%` : '0%'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {isAr ? 'نسبة تسويق المحفظة' : 'portfolio sold'}
                        </span>
                      </div>
                    </div>

                    {/* Card 4: Total Portfolio Value */}
                    <div style={{
                      background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                      border: '1px solid rgba(212, 175, 55, 0.35)',
                      borderRadius: '16px',
                      padding: '1.35rem 1.45rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(212, 175, 55, 0.25)',
                      position: 'relative',
                      overflow: 'hidden',
                      minHeight: '155px'
                    }}>
                      <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(212, 175, 55, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 800, letterSpacing: '0.02em' }}>
                            {isAr ? 'القيمة السوقية للمحفظة' : 'Catalog Portfolio Value'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--zf-text-muted, #94a3b8)' }}>
                            {isAr ? 'إجمالي تقييم أسعار الوحدات' : 'Gross listing asset value'}
                          </span>
                        </div>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'rgba(212, 175, 55, 0.15)',
                          border: '1px solid rgba(212, 175, 55, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--zf-gold, #d4af37)',
                          boxShadow: '0 0 15px rgba(212, 175, 55, 0.2)'
                        }}>
                          <DollarSign size={20} strokeWidth={2.4} />
                        </div>
                      </div>
                      <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--zf-gold, #d4af37)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                          {totalCatalogVal.formatEGP(isAr)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'rgba(212, 175, 55, 0.15)',
                          color: 'var(--zf-gold, #d4af37)',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          border: '1px solid rgba(212, 175, 55, 0.3)'
                        }}>
                          {isAr ? 'سعر القائمة' : 'List Price'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {isAr ? 'تقييم تسعير العقارات' : 'catalog valuation'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <PropertyFinancialMatrix 
                properties={data.properties}
                contracts={data.contracts}
                propertyCosts={data.propertyCosts}
                onOpenContractForProperty={handleOpenContractForProperty}
                onOpenCalculatorForProperty={handleOpenCalculatorForProperty}
                onOpenAuditForProperty={handleOpenAuditForProperty}
                onUpdatePropertyUnitTax={handleUpdatePropertyUnitTax}
                isAr={isAr}
              />
            </div>
          )}

          {/* MODULE: CONSTRUCTION COST & FEASIBILITY CALCULATOR */}
          {activeTab === 'calculator' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className={subStyles.stageHeader}>
                <div className={subStyles.stageTitleArea}>
                  <div className={subStyles.stageBreadcrumb}>
                    <span>FIN-OS</span>
                    <span>/</span>
                    <span>{isAr ? 'حاسبة التكاليف والجدوى' : 'Cost & Feasibility'}</span>
                  </div>
                  <h1 className={subStyles.stageTitle}>
                    {isAr ? 'حاسبة تكاليف التشييد ومواد البناء والجدوى' : 'Construction Cost & Feasibility Estimator'}
                  </h1>
                </div>
              </div>

              <ConstructionCostCalculator 
                properties={data.properties}
                propertyCosts={data.propertyCosts}
                initialPropertyId={calculatorPropertyId}
                onOpenAuditForProperty={handleOpenAuditForProperty}
                onUpdateSellingPrice={handleUpdatePropertySellingPrice}
                isAr={isAr}
              />
            </div>
          )}

          {/* MODULE 1: GENERAL LEDGER & CHART OF ACCOUNTS */}
          {activeTab === 'ledger' && (
            <GeneralLedgerView
              journalEntries={data.journalEntries}
              activePeriod={activePeriod}
              isAr={isAr}
              isMutating={isMutating}
              onOpenQuickTransaction={() => setShowQuickTransactionModal(true)}
              onTogglePeriodStatus={(periodId, newStatus) => handleTogglePeriodStatus(periodId, newStatus)}
              onNavigateToOpenQuestion={handleNavigateToOpenQuestion}
            />
          )}

          {/* MODULE 3: CONTRACTS & RECEIVABLES */}
          {activeTab === 'contracts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Header */}
              <div className={subStyles.stageHeader}>
                <div className={subStyles.stageTitleArea}>
                  <div className={subStyles.stageBreadcrumb}>
                    <span>FIN-OS</span>
                    <span>/</span>
                    <span>{isAr ? 'المبيعات والتعاقدات' : 'Sales Contracts'}</span>
                  </div>
                  <h1 className={subStyles.stageTitle}>
                    {isAr ? 'سجل عقود البيع وتتبع إصدارات الأقساط' : 'Sales Contracts & Installment Pipeline'}
                  </h1>
                  <div style={{ fontSize: '0.78rem', color: 'var(--zf-text-muted, #6b7086)', marginTop: '0.25rem' }}>
                    {isAr 
                      ? 'المتابعة المركزية لكافة عقود البيع الموثقة، خطط التقسيط، نسب التحصيل الفعلي، وحالة تسليم الوحدات (IFRS 15).' 
                      : 'Centralized registry of booked sales contracts, installment schedules, cash collection, and unit handovers.'}
                  </div>
                </div>

                <div className={subStyles.stageActions}>
                  <button 
                    className={subStyles.actionBtnSecondary}
                    onClick={() => setActiveTab('properties')}
                    title={isAr ? 'الانتقال إلى الموقف المالي للعقارات لتحرير عقد جديد لوحدة' : 'Go to Property Portfolio to originate a contract'}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem' }}
                  >
                    <Building size={14} color="var(--zf-gold, #d4af37)" />
                    <span>{isAr ? 'تحرير عقد لوحدة (عبر محفظة العقارات)' : 'Originate Contract (via Portfolio)'}</span>
                  </button>
                </div>
              </div>

              {/* 1. CONTRACTS PORTFOLIO EXECUTIVE KPI BAR */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.25rem'
              }}>
                {/* KPI 1: Gross Portfolio Sales (V) */}
                <div 
                  style={{ 
                    background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    borderRadius: '16px',
                    padding: '1.35rem 1.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(212, 175, 55, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.25s ease',
                    minHeight: '155px'
                  }}
                >
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(212, 175, 55, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

                  {/* Top Row: Title + Icon Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 800, letterSpacing: '0.02em' }}>
                        {isAr ? 'إجمالي المبيعات التعاقدية (V)' : 'Gross Contract Value (V)'}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--zf-text-muted, #94a3b8)' }}>
                        {isAr ? 'محفظة العقود السارية المسجلة' : 'Active Booked Contracts'}
                      </span>
                    </div>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(212, 175, 55, 0.15)',
                      border: '1px solid rgba(212, 175, 55, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--zf-gold, #d4af37)',
                      boxShadow: '0 0 15px rgba(212, 175, 55, 0.2)'
                    }}>
                      <FileText size={20} strokeWidth={2.2} />
                    </div>
                  </div>

                  {/* Center: Big Monetary Value */}
                  <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                    <div style={{ 
                      fontSize: '1.75rem', 
                      fontWeight: 900, 
                      color: 'var(--zf-gold, #d4af37)', 
                      letterSpacing: '-0.02em', 
                      lineHeight: 1.15,
                      fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}>
                      {D(contractPortfolioKPIs.totalGross).formatEGP(isAr)}
                    </div>
                  </div>

                  {/* Bottom: Subtitle with Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'rgba(212, 175, 55, 0.15)',
                      color: 'var(--zf-gold, #d4af37)',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '999px',
                      border: '1px solid rgba(212, 175, 55, 0.3)'
                    }}>
                      {contractPortfolioKPIs.totalCount} {isAr ? 'عقود موثقة' : 'contracts'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {isAr ? 'مستقرة بدفاتر الحسابات' : 'booked to ledger'}
                    </span>
                  </div>
                </div>

                {/* KPI 2: Cash Collected (C) */}
                <div 
                  style={{ 
                    background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '16px',
                    padding: '1.35rem 1.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(16, 185, 129, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.25s ease',
                    minHeight: '155px'
                  }}
                >
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

                  {/* Top Row: Title + Icon Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.78rem', color: '#6ee7b7', fontWeight: 800, letterSpacing: '0.02em' }}>
                        {isAr ? 'السيولة المحصلة بالبنك (C)' : 'Total Cash Collected (C)'}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        {isAr ? 'تحصيلات نقدية مدفوعة فعلياً' : 'Cash collected & cleared'}
                      </span>
                    </div>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10b981',
                      boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
                    }}>
                      <DollarSign size={20} strokeWidth={2.4} />
                    </div>
                  </div>

                  {/* Center: Big Monetary Value */}
                  <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                    <div style={{ 
                      fontSize: '1.75rem', 
                      fontWeight: 900, 
                      color: '#10b981', 
                      letterSpacing: '-0.02em', 
                      lineHeight: 1.15,
                      fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}>
                      {D(contractPortfolioKPIs.totalCollected).formatEGP(isAr)}
                    </div>
                  </div>

                  {/* Bottom: Subtitle with Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '999px',
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      {isAr ? 'حسابات ١٠٢٠٠٠' : 'GL 102000'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {isAr ? 'نقدية فعلية مستقرة بالبنك' : 'Bank operating account'}
                    </span>
                  </div>
                </div>

                {/* KPI 3: Remaining Receivables (A/R) */}
                <div 
                  style={{ 
                    background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '16px',
                    padding: '1.35rem 1.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(245, 158, 11, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.25s ease',
                    minHeight: '155px'
                  }}
                >
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

                  {/* Top Row: Title + Icon Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.78rem', color: '#fcd34d', fontWeight: 800, letterSpacing: '0.02em' }}>
                        {isAr ? 'مديونية الأقساط المستحقة (A/R)' : 'Total Remaining A/R'}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        {isAr ? 'أقساط مستقبلية قيد التحصيل' : 'Scheduled Installments'}
                      </span>
                    </div>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fbbf24',
                      boxShadow: '0 0 15px rgba(245, 158, 11, 0.2)'
                    }}>
                      <Clock size={20} strokeWidth={2.4} />
                    </div>
                  </div>

                  {/* Center: Big Monetary Value */}
                  <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                    <div style={{ 
                      fontSize: '1.75rem', 
                      fontWeight: 900, 
                      color: '#fbbf24', 
                      letterSpacing: '-0.02em', 
                      lineHeight: 1.15,
                      fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}>
                      {D(contractPortfolioKPIs.totalRemaining).formatEGP(isAr)}
                    </div>
                  </div>

                  {/* Bottom: Subtitle with Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#fbbf24',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '999px',
                      border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}>
                      {isAr ? 'وفق الجداول' : 'On Schedule'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {isAr ? 'مستحقة وفق خطط التقسيط' : 'Pending tranches'}
                    </span>
                  </div>
                </div>

                {/* KPI 4: Portfolio Collection & Handover Rate */}
                <div 
                  style={{ 
                    background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    borderRadius: '16px',
                    padding: '1.35rem 1.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(59, 130, 246, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.25s ease',
                    minHeight: '155px'
                  }}
                >
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

                  {/* Top Row: Title + Icon Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.78rem', color: '#93c5fd', fontWeight: 800, letterSpacing: '0.02em' }}>
                        {isAr ? 'معدل التحصيل والتسليم' : 'Collection & Handover Rate'}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        {isAr ? 'نسبة الإنجاز المالي والتشغيلي' : 'Realized Recovery Rate'}
                      </span>
                    </div>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#60a5fa',
                      boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)'
                    }}>
                      <TrendingUp size={20} strokeWidth={2.4} />
                    </div>
                  </div>

                  {/* Center: Big Percentage + Progress Bar */}
                  <div style={{ margin: '0.65rem 0 0.35rem 0', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <div style={{ 
                        fontSize: '1.9rem', 
                        fontWeight: 900, 
                        color: '#ffffff', 
                        letterSpacing: '-0.02em', 
                        lineHeight: 1.15,
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}>
                        {contractPortfolioKPIs.overallProgress.toFixed(1)}%
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                        {isAr ? 'من إجمالي المبيعات' : 'of gross sales'}
                      </span>
                    </div>

                    <div style={{ marginTop: '0.5rem', width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ 
                        width: `${contractPortfolioKPIs.overallProgress}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, #3b82f6, #10b981)', 
                        borderRadius: '999px',
                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>

                  {/* Bottom: Subtitle with Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1, marginTop: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        {contractPortfolioKPIs.deliveredCount} {isAr ? 'مسلّمة' : 'Delivered'}
                      </span>
                      <span style={{
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#93c5fd',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        border: '1px solid rgba(59, 130, 246, 0.3)'
                      }}>
                        {contractPortfolioKPIs.pendingCount} {isAr ? 'قيد التنفيذ' : 'Pending'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {isAr ? 'محفظة الوحدات' : 'Units portfolio'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Filter, Search & View Mode Bar */}
              <div className={subStyles.filterBar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, minWidth: '320px' }}>
                  {/* Status Tabs */}
                  <div className={subStyles.filterTabs}>
                    {(['All', 'Delivered', 'Pending', 'Rescinded'] as const).map(f => {
                      const count = f === 'All' ? contractPortfolioKPIs.activeCount :
                                    f === 'Delivered' ? contractPortfolioKPIs.deliveredCount :
                                    f === 'Pending' ? contractPortfolioKPIs.pendingCount :
                                    contractPortfolioKPIs.rescindedCount;
                      return (
                        <button
                          key={f}
                          className={`${subStyles.filterTabItem} ${contractFilter === f ? subStyles.filterTabItemActive : ''}`}
                          onClick={() => setContractFilter(f)}
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.35rem',
                            color: f === 'Rescinded' && contractFilter === f ? '#f87171' : undefined
                          }}
                        >
                          <span>
                            {f === 'All' && (isAr ? 'السارية (الكل)' : 'Active Pipeline')}
                            {f === 'Delivered' && (isAr ? 'مسلّم' : 'Delivered')}
                            {f === 'Pending' && (isAr ? 'قيد الإنشاء' : 'Under Construction')}
                            {f === 'Rescinded' && (isAr ? 'عقود مفسوخة' : 'Rescinded')}
                          </span>
                          <span style={{ 
                            fontSize: '0.68rem', 
                            padding: '0.1rem 0.4rem', 
                            borderRadius: '999px', 
                            background: f === 'Rescinded' 
                              ? 'rgba(239, 68, 68, 0.2)' 
                              : contractFilter === f 
                                ? 'rgba(212, 175, 55, 0.25)' 
                                : 'rgba(255,255,255,0.08)',
                            color: f === 'Rescinded' ? '#f87171' : undefined
                          }}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Instant Search Bar */}
                  <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '380px' }}>
                    <input
                      type="text"
                      value={contractSearchQuery}
                      onChange={(e) => setContractSearchQuery(e.target.value)}
                      placeholder={isAr ? 'بحث برقم العقد أو اسم العميل أو الوحدة' : 'Search by contract #, buyer, unit'}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.85rem',
                        paddingRight: isAr ? '2rem' : '0.85rem',
                        paddingLeft: isAr ? '0.85rem' : '2rem',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      right: isAr ? '0.65rem' : 'auto',
                      left: isAr ? 'auto' : '0.65rem',
                      color: 'var(--zf-text-muted, #6b7086)',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <Search size={13} />
                    </div>
                  </div>
                </div>

                {/* View Mode Toggle */}
                <div className={subStyles.viewModeToggle}>
                  <button 
                    className={`${subStyles.viewModeBtn} ${contractViewMode === 'cards' ? subStyles.viewModeBtnActive : ''}`}
                    onClick={() => setContractViewMode('cards')}
                    title={isAr ? 'عرض بطاقات تنفيذية' : 'Cards View'}
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button 
                    className={`${subStyles.viewModeBtn} ${contractViewMode === 'table' ? subStyles.viewModeBtnActive : ''}`}
                    onClick={() => setContractViewMode('table')}
                    title={isAr ? 'عرض جدول تفصيلي' : 'Table View'}
                  >
                    <List size={14} />
                  </button>
                </div>
              </div>

              {/* 3. Empty State */}
              {filteredContracts.length === 0 && (
                <div style={{
                  padding: '3.5rem 2rem',
                  textAlign: 'center',
                  background: 'rgba(20, 24, 36, 0.4)',
                  borderRadius: '12px',
                  border: '1px dashed rgba(255, 255, 255, 0.1)'
                }}>
                  <FileText size={36} color="var(--zf-text-muted, #6b7086)" style={{ margin: '0 auto 0.75rem auto' }} />
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                    {isAr ? 'لا توجد عقود مطابقة' : 'No matching contracts found'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--zf-text-muted, #6b7086)', marginTop: '0.35rem' }}>
                    {isAr ? 'جرب تغيير شروط التصفية أو تفريغ خانة البحث.' : 'Try changing the status tab or clearing the search box.'}
                  </div>
                  {contractSearchQuery && (
                    <button
                      onClick={() => setContractSearchQuery('')}
                      style={{
                        marginTop: '1rem',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        padding: '0.4rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      {isAr ? 'مسح البحث' : 'Clear search'}
                    </button>
                  )}
                </div>
              )}

              {/* 4. View Mode 1: Executive Portfolio Cards */}
              {contractViewMode === 'cards' && filteredContracts.length > 0 && (
                <div className={subStyles.cardsGrid}>
                  {filteredContracts.map(c => {
                    const contractSchedules = data.schedules.filter(s => s.contract_id === c.contract_id && s.status !== 'SUPERSEDED');
                    const pendingSchedules = contractSchedules.filter(s => s.status === 'Pending');
                    const isSelected = inspectorPayload?.type === 'contract' && inspectorPayload.contract.contract_id === c.contract_id;
                    
                    const gross = D(c.gross_contract_value || '0');
                    const collected = D(c.total_cash_collected || '0');
                    const remaining = gross.minus(collected).isNegative() ? '0.00' : gross.minus(collected).toFixed(2);
                    const progress = gross.isZero() ? 0 : Math.min(100, Math.max(0, collected.div(gross).times(100).toNumber()));
                    const isFullyPaid = collected.greaterThanOrEqual(gross) && !gross.isZero();

                    return (
                      <div 
                        key={c.contract_id}
                        className={subStyles.workstationCard}
                        style={{ 
                          background: 'linear-gradient(165deg, #09141f 0%, #050b12 100%)',
                          border: '1px solid rgba(212, 175, 55, 0.28)',
                          borderInlineStart: isSelected ? '5px solid #10b981' : '5px solid var(--zf-gold, #d4af37)',
                          borderRadius: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.9rem',
                          padding: '1.25rem 1.35rem',
                          boxShadow: isSelected 
                            ? '0 0 25px rgba(212, 175, 55, 0.35), 0 10px 30px rgba(0, 0, 0, 0.6)' 
                            : '0 10px 30px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(212, 175, 55, 0.15)',
                          position: 'relative',
                          overflow: 'hidden',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => handleInspectContract(c)}
                      >
                        {/* 1. Official Legal Deed Header Ribbon */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(212, 175, 55, 0.08)',
                          border: '1px solid rgba(212, 175, 55, 0.2)',
                          borderRadius: '8px',
                          padding: '0.4rem 0.65rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <FileText size={13} color="var(--zf-gold, #d4af37)" />
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--zf-gold, #d4af37)', letterSpacing: '0.02em' }}>
                              {isAr ? 'صك تعاقد رسمي' : 'SALES DEED'}
                            </span>
                            <span style={{ color: '#475569' }}>•</span>
                            <span 
                              dir="ltr"
                              style={{ 
                                fontFamily: 'monospace', 
                                fontWeight: 900, 
                                fontSize: '0.76rem', 
                                color: '#ffffff',
                                background: 'rgba(0, 0, 0, 0.35)',
                                padding: '0.1rem 0.45rem',
                                borderRadius: '4px',
                                border: '1px solid rgba(212, 175, 55, 0.25)'
                              }}
                            >
                              #{c.contract_number}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              {c.contract_date}
                            </span>
                            <StatusBadge domain="unit" status={c.handover_status} isAr={isAr} />
                          </div>
                        </div>

                        {/* 2. Unit Headline & Legal Notice */}
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.35 }}>
                            {c.unit_id}
                          </h4>
                        </div>

                        {/* 3. Second Party / Buyer Dossier Strip */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.07)',
                          borderRadius: '8px',
                          padding: '0.45rem 0.75rem',
                          fontSize: '0.75rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <User size={13} color="var(--zf-gold, #d4af37)" />
                            <span style={{ color: '#94a3b8' }}>{isAr ? 'الطرف الثاني (المشتري):' : 'Buyer:'}</span>
                            <strong style={{ color: '#f8fafc' }}>{c.buyer_name}</strong>
                          </div>
                          <span style={{ 
                            fontSize: '0.66rem', 
                            color: 'var(--zf-gold, #d4af37)', 
                            background: 'rgba(212, 175, 55, 0.1)', 
                            padding: '0.12rem 0.45rem', 
                            borderRadius: '4px', 
                            border: '1px solid rgba(212, 175, 55, 0.25)',
                            fontWeight: 700
                          }}>
                            {isAr ? 'عقد موثق ومسجل' : 'Notarized'}
                          </span>
                        </div>

                        {/* Rescinded Alert Banner if applicable */}
                        {c.status === 'Rescinded' && (
                          <div style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            padding: '0.45rem 0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem'
                          }}>
                            <span style={{ fontSize: '0.72rem', color: '#fca5a5', fontWeight: 600 }}>
                              {isAr ? 'عقد مفسوخ رسمياً • تم نقل الملف لسجل الفسخ' : 'Rescinded • Moved to Rescissions'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab('rescissions');
                              }}
                              style={{
                                background: 'rgba(239, 68, 68, 0.25)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                borderRadius: '4px',
                                padding: '0.2rem 0.5rem',
                                color: '#ffffff',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {isAr ? 'سجل الفسخ' : 'View Rescission'}
                            </button>
                          </div>
                        )}

                        {/* 4. Contract Escrow & Financial Horizon Box */}
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.55)',
                          borderRadius: '10px',
                          padding: '0.75rem 0.95rem',
                          border: '1px solid rgba(212, 175, 55, 0.18)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem'
                        }}>
                          <div style={{ 
                            fontSize: '0.65rem', 
                            color: 'var(--zf-gold, #d4af37)', 
                            fontWeight: 800, 
                            letterSpacing: '0.04em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            paddingBottom: '0.25rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                          }}>
                            <Scale size={11} />
                            <span>{isAr ? 'الذمة المالية للتعاقد والتحصيل (CONTRACT ESCROW)' : 'CONTRACT ESCROW & RECEIVABLES'}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                            <span style={{ color: 'var(--zf-text-muted, #94a3b8)', fontWeight: 600 }}>
                              {isAr ? 'قيمة التعاقد الإجمالية (V):' : 'Gross Value (V):'}
                            </span>
                            <strong style={{ color: 'var(--zf-gold, #d4af37)', fontFamily: 'monospace', fontSize: '0.88rem' }}>
                              {D(c.gross_contract_value || '0').formatEGP(isAr)}
                            </strong>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                            <span style={{ color: '#10b981', fontWeight: 600 }}>
                              {isAr ? 'المحصل الفعلي بالبنك (C):' : 'Collected (C):'}
                            </span>
                            <strong style={{ color: '#10b981', fontFamily: 'monospace', fontSize: '0.88rem' }}>
                              {D(c.total_cash_collected || '0').formatEGP(isAr)}
                            </strong>
                          </div>

                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            fontSize: '0.78rem',
                            paddingTop: '0.35rem',
                            borderTop: '1px dashed rgba(255, 255, 255, 0.08)'
                          }}>
                            <span style={{ color: isFullyPaid ? '#10b981' : '#fbbf24', fontWeight: 600 }}>
                              {isAr ? 'المتبقي كأقساط (A/R):' : 'Remaining (A/R):'}
                            </span>
                            <strong style={{ color: isFullyPaid ? '#10b981' : '#f8fafc', fontFamily: 'monospace', fontSize: '0.88rem' }}>
                              {D(remaining).formatEGP(isAr)}
                            </strong>
                          </div>
                        </div>

                        {/* 5. Collection Progress Bar */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.25rem' }}>
                            <span style={{ color: 'var(--zf-text-muted, #94a3b8)' }}>
                              {isAr ? 'نسبة الوفاء والتحصيل التعاقدي:' : 'Contract Collection Rate:'}
                            </span>
                            <span style={{ fontWeight: 800, color: isFullyPaid ? '#10b981' : 'var(--zf-gold, #d4af37)' }}>
                              {progress.toFixed(1)}%
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                width: `${progress}%`, 
                                height: '100%', 
                                background: isFullyPaid ? '#10b981' : 'linear-gradient(90deg, #d4af37, #10b981)', 
                                borderRadius: '999px',
                                transition: 'width 0.3s ease'
                              }} 
                            />
                          </div>
                        </div>

                        {/* 6. Footer Info & Action Hint */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          fontSize: '0.72rem', 
                          paddingTop: '0.5rem', 
                          borderTop: '1px solid rgba(255, 255, 255, 0.07)' 
                        }}>
                          {isFullyPaid ? (
                            <span style={{ color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <CheckCircle2 size={12} /> {isAr ? 'كافة الأقساط مسددة بالكامل' : 'All tranches paid'}
                            </span>
                          ) : (
                            <span style={{ color: '#fbbf24', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={12} /> {pendingSchedules.length} {isAr ? 'أقساط قيد التحصيل' : 'tranches pending'}
                            </span>
                          )}

                          <span style={{ color: 'var(--zf-gold, #d4af37)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Eye size={13} />
                            <span>{isAr ? 'فحص وتدقيق العقد' : 'Inspect Contract'}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 5. View Mode 2: Dense Table View */}
              {contractViewMode === 'table' && filteredContracts.length > 0 && (
                <div className={subStyles.denseTableContainer}>
                  <table className={subStyles.denseTable}>
                    <thead>
                      <tr>
                        <th>{isAr ? 'رقم العقد' : 'Contract #'}</th>
                        <th>{isAr ? 'الوحدة' : 'Unit ID'}</th>
                        <th>{isAr ? 'العميل / المشتري' : 'Buyer'}</th>
                        <th>{isAr ? 'قيمة العقد (V)' : 'Gross (V)'}</th>
                        <th>{isAr ? 'المحصل (C)' : 'Collected (C)'}</th>
                        <th>{isAr ? 'المتبقي (A/R)' : 'Remaining (A/R)'}</th>
                        <th>{isAr ? 'الإنجاز' : 'Progress'}</th>
                        <th>{isAr ? 'التسليم' : 'Handover'}</th>
                        <th>{isAr ? 'التاريخ' : 'Date'}</th>
                        <th style={{ textAlign: 'center' }}>{isAr ? 'إجراء' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContracts.map(c => {
                        const gross = D(c.gross_contract_value || '0');
                        const collected = D(c.total_cash_collected || '0');
                        const remaining = gross.minus(collected).isNegative() ? '0.00' : gross.minus(collected).toFixed(2);
                        const progress = gross.isZero() ? 0 : Math.min(100, Math.max(0, collected.div(gross).times(100).toNumber()));
                        const isFullyPaid = collected.greaterThanOrEqual(gross) && !gross.isZero();

                        return (
                          <tr key={c.contract_id} onClick={() => handleInspectContract(c)} style={{ cursor: 'pointer' }}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--zf-gold, #d4af37)' }} dir="ltr">
                              #{c.contract_number}
                            </td>
                            <td style={{ fontWeight: 700, color: '#ffffff' }}>{c.unit_id}</td>
                            <td>{c.buyer_name}</td>
                            <td><MoneyCell amount={c.gross_contract_value} isAr={isAr} highlight /></td>
                            <td><MoneyCell amount={c.total_cash_collected} isAr={isAr} /></td>
                            <td>
                              <span style={{ color: isFullyPaid ? '#10b981' : '#fbbf24', fontWeight: 600 }}>
                                <MoneyCell amount={remaining} isAr={isAr} />
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <div style={{ width: '45px', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                                  <div style={{ width: `${progress}%`, height: '100%', background: isFullyPaid ? '#10b981' : 'var(--zf-gold, #d4af37)' }} />
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isFullyPaid ? '#10b981' : '#e2e8f0' }}>
                                  {progress.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td><StatusBadge domain="unit" status={c.handover_status} isAr={isAr} /></td>
                            <td><span className={subStyles.statusPill}>{c.contract_date}</span></td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInspectContract(c);
                                }}
                                style={{
                                  background: 'rgba(212, 175, 55, 0.12)',
                                  border: '1px solid rgba(212, 175, 55, 0.25)',
                                  color: 'var(--zf-gold, #d4af37)',
                                  borderRadius: '6px',
                                  padding: '0.25rem 0.6rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  cursor: 'pointer'
                                }}
                              >
                                <Eye size={12} />
                                <span>{isAr ? 'فحص' : 'View'}</span>
                              </button>
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

          {/* MODULE 4: HAND INSTALLMENTS & CASH DUES VAULT (حافظة بنود التحصيل والأقساط باليد) */}
          {activeTab === 'pdc' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className={subStyles.stageHeader}>
                <div className={subStyles.stageTitleArea}>
                  <div className={subStyles.stageBreadcrumb}>
                    <span>FIN-OS</span>
                    <span>/</span>
                    <span>{isAr ? 'بنود التحصيل والأقساط المستحقة' : 'Installments & Hand Dues'}</span>
                  </div>
                  <h1 className={subStyles.stageTitle}>
                    {isAr ? 'حافظة بنود التحصيل والأقساط المستحقة باليد' : 'Hand Installments & Cash Dues Vault'}
                  </h1>
                </div>

                {/* Top Action Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleCollectDuePDCsToday}
                    disabled={isMutating}
                    style={{
                      border: '1px solid rgba(16, 185, 129, 0.45)',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)',
                      color: '#6ee7b7',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      padding: '0.55rem 1rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)'
                    }}
                  >
                    <Wallet size={15} />
                    <span>{isAr ? 'تحصيل الأقساط المستحقة اليوم باليد' : 'Collect Today\'s Dues by Hand'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewPdcContractId(data.contracts[0]?.contract_id || '');
                      setNewPdcDrawer(data.contracts[0]?.buyer_name || '');
                      setNewPdcDueDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
                      setShowNewPDCModal(true);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #d4af37 0%, #b8972e 100%)',
                      color: '#07080b',
                      fontSize: '0.8rem',
                      fontWeight: 900,
                      padding: '0.55rem 1.15rem',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      cursor: 'pointer',
                      border: 'none',
                      boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)'
                    }}
                  >
                    <Plus size={16} strokeWidth={3} />
                    <span>{isAr ? '+ تسجيل بند قسط / استحقاق جديد' : '+ Record New Installment Due'}</span>
                  </button>
                </div>
              </div>

              {/* Hand Installments Executive KPI Bar */}
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const collectedDues = data.pdcRecords.filter(c => c.status === 'Cleared');
                const dueLaterDues = data.pdcRecords.filter(c => c.status !== 'Cleared' && c.due_date >= todayStr);
                const overdueDues = data.pdcRecords.filter(c => c.status !== 'Cleared' && c.due_date < todayStr);

                const collectedSum = collectedDues.reduce((acc, c) => acc.plus(c.nominal_value || '0'), D(0));
                const dueLaterSum = dueLaterDues.reduce((acc, c) => acc.plus(c.nominal_value || '0'), D(0));
                const overdueSum = overdueDues.reduce((acc, c) => acc.plus(c.nominal_value || '0'), D(0));
                const totalPortfolioSum = data.pdcRecords.reduce((acc, c) => acc.plus(c.nominal_value || '0'), D(0));

                return (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '1.25rem'
                  }}>
                    {/* Card 1: Due Later (مستحق لاحقاً باليد) */}
                    <div style={{
                      background: 'linear-gradient(145deg, rgba(56, 189, 248, 0.1) 0%, rgba(14, 18, 28, 0.95) 100%)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      borderRadius: '16px',
                      padding: '1.35rem 1.45rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
                      position: 'relative',
                      overflow: 'hidden',
                      minHeight: '155px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.78rem', color: '#93c5fd', fontWeight: 800 }}>
                            {isAr ? 'بنود مستحقة لاحقاً باليد' : 'Installments Due Later'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                            {isAr ? 'تستحق السداد نقداً في مواعيدها' : 'Scheduled future collections'}
                          </span>
                        </div>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#38bdf8'
                        }}>
                          <Clock size={20} strokeWidth={2.2} />
                        </div>
                      </div>
                      <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                          {dueLaterSum.formatEGP(isAr)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: '#93c5fd',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          border: '1px solid rgba(56, 189, 248, 0.3)'
                        }}>
                          {dueLaterDues.length} {isAr ? 'أقساط قادمة' : 'upcoming'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {isAr ? 'مجدولة بالعقود' : 'on schedule'}
                        </span>
                      </div>
                    </div>

                    {/* Card 2: Overdue (متأخرة عن موعدها) */}
                    <div style={{
                      background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      borderRadius: '16px',
                      padding: '1.35rem 1.45rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
                      position: 'relative',
                      overflow: 'hidden',
                      minHeight: '155px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.78rem', color: '#fca5a5', fontWeight: 800 }}>
                            {isAr ? 'بنود متأخرة عن موعد التحصيل' : 'Overdue Hand Dues'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                            {isAr ? 'تجاوزت تاريخ الاستحقاق وتتطلب التحصيل' : 'Requires collection follow-up'}
                          </span>
                        </div>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#f87171'
                        }}>
                          <AlertTriangle size={20} strokeWidth={2.4} />
                        </div>
                      </div>
                      <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f87171', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                          {overdueSum.formatEGP(isAr)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#fca5a5',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                          {overdueDues.length} {isAr ? 'أقساط متأخرة' : 'overdue'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {isAr ? 'تتطلب تواصل عاجل' : 'urgent contact'}
                        </span>
                      </div>
                    </div>

                    {/* Card 3: Collected (تم التحصيل باليد بالخزينة) */}
                    <div style={{
                      background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: '16px',
                      padding: '1.35rem 1.45rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
                      position: 'relative',
                      overflow: 'hidden',
                      minHeight: '155px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.78rem', color: '#6ee7b7', fontWeight: 800 }}>
                            {isAr ? 'بنود تم تحصيلها باليد (بالخزينة)' : 'Collected by Hand in Safe'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                            {isAr ? 'نقدية مستلمة وموردة بالخزينة [101000]' : 'Deposited in Cash Safe [101000]'}
                          </span>
                        </div>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#10b981'
                        }}>
                          <CheckCircle2 size={20} strokeWidth={2.4} />
                        </div>
                      </div>
                      <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10b981', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                          {collectedSum.formatEGP(isAr)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          {collectedDues.length} {isAr ? 'أقساط محصلة' : 'collected'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {isAr ? 'مسددة بالكامل' : 'fully settled'}
                        </span>
                      </div>
                    </div>

                    {/* Card 4: Total Portfolio Dues */}
                    <div style={{
                      background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                      border: '1px solid rgba(212, 175, 55, 0.35)',
                      borderRadius: '16px',
                      padding: '1.35rem 1.45rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
                      position: 'relative',
                      overflow: 'hidden',
                      minHeight: '155px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 800 }}>
                            {isAr ? 'إجمالي محفظة بنود العقود والأقساط' : 'Total Portfolio Dues'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                            {isAr ? 'إجمالي كافة الأقساط والدفعات المستحقة' : 'Cumulative contract dues'}
                          </span>
                        </div>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'rgba(212, 175, 55, 0.15)',
                          border: '1px solid rgba(212, 175, 55, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--zf-gold, #d4af37)'
                        }}>
                          <Receipt size={20} strokeWidth={2.2} />
                        </div>
                      </div>
                      <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--zf-gold, #d4af37)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                          {totalPortfolioSum.formatEGP(isAr)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'rgba(212, 175, 55, 0.15)',
                          color: 'var(--zf-gold, #d4af37)',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          border: '1px solid rgba(212, 175, 55, 0.3)'
                        }}>
                          {data.pdcRecords.length} {isAr ? 'إجمالي البنود' : 'items'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {isAr ? 'المحفظة التعاقدية' : 'contract portfolio'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Intelligent Search & Multi-Filter Control Hub */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                background: 'rgba(15, 18, 28, 0.85)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                padding: '1rem 1.25rem',
                borderRadius: '14px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  {/* Search Input */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.45rem 0.85rem',
                    minWidth: '280px',
                    flex: '1 1 300px'
                  }}>
                    <Search size={15} color="#94a3b8" />
                    <input
                      type="text"
                      placeholder={isAr ? 'بحث فوري بكود البند، اسم العميل، أو رقم العقد...' : 'Search item code, client, contract #...'}
                      value={chequeSearchQuery}
                      onChange={e => setChequeSearchQuery(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#ffffff',
                        fontSize: '0.82rem',
                        width: '100%'
                      }}
                    />
                    {chequeSearchQuery && (
                      <button
                        onClick={() => setChequeSearchQuery('')}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>


                  {/* Maturity Quick Filter */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(0, 0, 0, 0.35)',
                    padding: '0.25rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <button
                      type="button"
                      onClick={() => setChequeMaturityFilter('all')}
                      style={{
                        background: chequeMaturityFilter === 'all' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                        color: chequeMaturityFilter === 'all' ? 'var(--zf-gold, #d4af37)' : '#94a3b8',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isAr ? 'كافة التواريخ' : 'All Dates'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChequeMaturityFilter('due_now')}
                      style={{
                        background: chequeMaturityFilter === 'due_now' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                        color: chequeMaturityFilter === 'due_now' ? '#f87171' : '#94a3b8',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isAr ? 'مستحق اليوم أو متأخر' : 'Due / Overdue'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChequeMaturityFilter('due_30')}
                      style={{
                        background: chequeMaturityFilter === 'due_30' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                        color: chequeMaturityFilter === 'due_30' ? '#38bdf8' : '#94a3b8',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isAr ? 'يستحق خلال ٣٠ يوم' : 'Next 30 Days'}
                    </button>
                  </div>

                  {/* View Mode Toggle */}
                  <div className={subStyles.viewModeToggle}>
                    <button 
                      className={`${subStyles.viewModeBtn} ${chequeViewMode === 'cards' ? subStyles.viewModeBtnActive : ''}`}
                      onClick={() => setChequeViewMode('cards')}
                      title={isAr ? 'عرض بطاقات السندات والأقساط' : 'Cards view'}
                    >
                      <LayoutGrid size={14} />
                    </button>
                    <button 
                      className={`${subStyles.viewModeBtn} ${chequeViewMode === 'table' ? subStyles.viewModeBtnActive : ''}`}
                      onClick={() => setChequeViewMode('table')}
                      title={isAr ? 'عرض جدول محاسبي مكثف' : 'Table view'}
                    >
                      <List size={14} />
                    </button>
                  </div>
                </div>

                {/* Status Tabs */}
                <div className={subStyles.filterTabs}>
                  {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const dueLaterCount = data.pdcRecords.filter(c => c.status !== 'Cleared' && c.due_date >= todayStr).length;
                    const overdueCount = data.pdcRecords.filter(c => c.status !== 'Cleared' && c.due_date < todayStr).length;
                    const collectedCount = data.pdcRecords.filter(c => c.status === 'Cleared').length;

                    const tabs = [
                      { id: 'All', labelAr: 'الكل', labelEn: 'All', count: data.pdcRecords.length },
                      { id: 'due_later', labelAr: 'مستحقة لاحقاً باليد', labelEn: 'Due Later', count: dueLaterCount },
                      { id: 'overdue', labelAr: 'متأخرة عن موعدها', labelEn: 'Overdue', count: overdueCount },
                      { id: 'collected', labelAr: 'تم التحصيل باليد (بالخزينة)', labelEn: 'Collected by Hand', count: collectedCount }
                    ] as const;

                    return tabs.map(tab => (
                      <button
                        key={tab.id}
                        className={`${subStyles.filterTabItem} ${chequeFilter === tab.id ? subStyles.filterTabItemActive : ''}`}
                        onClick={() => setChequeFilter(tab.id as any)}
                      >
                        {isAr ? tab.labelAr : tab.labelEn}
                        <span style={{
                          marginRight: isAr ? '0.45rem' : undefined,
                          marginLeft: !isAr ? '0.45rem' : undefined,
                          background: chequeFilter === tab.id ? 'rgba(212, 175, 55, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                          padding: '0.12rem 0.45rem',
                          borderRadius: '999px',
                          fontSize: '0.68rem',
                          fontWeight: 800
                        }}>
                          {tab.count}
                        </span>
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* Empty State */}
              {filteredCheques.length === 0 && (
                <div style={{
                  padding: '3.5rem 2rem',
                  textAlign: 'center',
                  background: 'rgba(15, 18, 28, 0.5)',
                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(212, 175, 55, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--zf-gold, #d4af37)'
                  }}>
                    <Wallet size={28} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: 800 }}>
                      {isAr ? 'لا توجد أقساط أو بنود استحقاق مطابقة لمعايير البحث' : 'No dues match the current filter'}
                    </h3>
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                      {isAr ? 'جرّب إعادة تعيين الفلاتر أو تسجيل بند قسط جديد بالعقد.' : 'Try resetting search filters or record a new installment due.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      className={legacyStyles.actionBtnGhost}
                      onClick={() => {
                        setChequeFilter('All');
                        setChequeSearchQuery('');
                        setChequeMaturityFilter('all');
                      }}
                    >
                      {isAr ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
                    </button>
                    <button
                      className={legacyStyles.actionBtnGold}
                      onClick={() => setShowNewPDCModal(true)}
                    >
                      <Plus size={14} />
                      <span>{isAr ? 'تسجيل بند قسط جديد' : 'Record New Installment Due'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Installments Grid: Executive Cash Installment Due Voucher Cards */}
              {chequeViewMode === 'cards' && filteredCheques.length > 0 && (
                <div className={subStyles.cardsGrid}>
                  {filteredCheques.map(pdc => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isOverdue = pdc.status !== 'Cleared' && pdc.due_date < todayStr;
                    const isDueToday = pdc.status !== 'Cleared' && pdc.due_date === todayStr;
                    const isCollected = pdc.status === 'Cleared';
                    const linkedContract = data.contracts.find(c => c.contract_id === pdc.contract_id);

                    return (
                      <div 
                        key={pdc.cheque_id}
                        style={{
                          background: 'linear-gradient(175deg, #0a111e 0%, #060a12 100%)',
                          border: isCollected
                            ? '1.5px solid rgba(16, 185, 129, 0.45)'
                            : isOverdue 
                            ? '1.5px dashed rgba(239, 68, 68, 0.8)' 
                            : isDueToday 
                            ? '1.5px dashed rgba(245, 158, 11, 0.8)' 
                            : '1.5px dashed rgba(212, 175, 55, 0.45)',
                          borderRadius: '16px',
                          padding: '1.25rem 1.35rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '0.85rem',
                          boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.04), 0 10px 30px rgba(0, 0, 0, 0.55)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Security Ribbon Header */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'linear-gradient(90deg, rgba(20, 32, 52, 0.65) 0%, rgba(10, 20, 35, 0.75) 100%)',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          borderRadius: '8px',
                          padding: '0.45rem 0.75rem',
                          zIndex: 1
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <Wallet size={14} color="var(--zf-gold, #d4af37)" />
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--zf-gold, #d4af37)', letterSpacing: '0.04em' }}>
                              {isAr ? 'بند قسط تحصيل باليد' : 'HAND INSTALLMENT DUE'}
                            </span>
                            <span style={{ color: '#475569' }}>•</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#ffffff', fontSize: '0.8rem' }}>
                              № {pdc.cheque_number}
                            </span>
                          </div>

                          {/* Authentic Status Tag */}
                          <div>
                            {isCollected && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.45)', color: '#6ee7b7', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                                <CheckCircle2 size={11} /> {isAr ? 'تم التحصيل باليد (بالخزينة)' : 'Collected by Hand'}
                              </span>
                            )}
                            {!isCollected && isOverdue && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.45)', color: '#fca5a5', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                                ⚠️ {isAr ? 'متأخر عن موعده' : 'Overdue'}
                              </span>
                            )}
                            {!isCollected && isDueToday && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.45)', color: '#fbbf24', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                                ⏳ {isAr ? 'يستحق التحصيل اليوم' : 'Due Today'}
                              </span>
                            )}
                            {!isCollected && !isOverdue && !isDueToday && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.45)', color: '#93c5fd', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>
                                📅 {isAr ? 'مستحق لاحقاً باليد' : 'Due Later'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Certified Due Value Box */}
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.65)',
                          border: '1.5px solid rgba(212, 175, 55, 0.38)',
                          borderRadius: '10px',
                          padding: '0.7rem 1rem',
                          boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.6)',
                          zIndex: 1
                        }}>
                          <div style={{ 
                            fontSize: '0.66rem', 
                            color: 'var(--zf-gold, #d4af37)', 
                            fontWeight: 800, 
                            letterSpacing: '0.04em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}>
                            <DollarSign size={11} />
                            <span>{isAr ? 'قيمة القسط / البند المطلوب تحصيله (ج.م)' : 'INSTALLMENT DUE AMOUNT (EGP)'}</span>
                          </div>
                          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', marginTop: '0.2rem' }}>
                            <MoneyCell amount={pdc.nominal_value} isAr={isAr} highlight />
                          </div>
                        </div>

                        {/* Client & Due Date Section */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', fontSize: '0.75rem', zIndex: 1 }}>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>
                              {isAr ? 'العميل الملتزم بالسداد:' : 'Client / Payer:'}
                            </span>
                            <strong style={{ color: '#e2e8f0', fontSize: '0.82rem' }}>{pdc.drawer_name}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>
                              {isAr ? 'تاريخ الاستحقاق الدفتري:' : 'Due Date:'}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Calendar size={13} color="#94a3b8" />
                              <strong style={{ color: isOverdue ? '#f87171' : '#ffffff', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                {pdc.due_date}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Linked Contract Strip */}
                        {linkedContract && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.72rem',
                            color: '#94a3b8',
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            zIndex: 1
                          }}>
                            <FileText size={12} color="var(--zf-gold, #d4af37)" />
                            <span>{isAr ? 'عقد:' : 'Contract:'} <strong style={{ color: '#ffffff' }}>#{linkedContract.contract_number}</strong></span>
                            <span>•</span>
                            <span style={{ color: 'var(--zf-gold, #d4af37)' }}>{linkedContract.unit_id}</span>
                          </div>
                        )}

                        {/* Interactive Hand Collection Action Button directly on Card */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1, paddingTop: '0.25rem' }}>
                          {!isCollected ? (
                            <button
                              type="button"
                              onClick={() => setCollectingPDCItem(pdc)}
                              disabled={isMutating}
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.35rem',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.35) 100%)',
                                color: '#6ee7b7',
                                border: '1px solid rgba(16, 185, 129, 0.45)',
                                borderRadius: '8px',
                                padding: '0.55rem',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)'
                              }}
                            >
                              <Wallet size={14} />
                              <span>{isAr ? 'تحصيل البند نقداً باليد' : 'Collect Cash by Hand'}</span>
                            </button>
                          ) : (
                            <div style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              padding: '0.5rem',
                              borderRadius: '8px',
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: '#34d399',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              border: '1px solid rgba(16, 185, 129, 0.25)'
                            }}>
                              <CheckCircle2 size={13} />
                              <span>{isAr ? 'تم التحصيل باليد ومورد بالخزينة [101000]' : 'Collected in Safe [101000]'}</span>
                            </div>
                          )}

                          {/* Inspect Details Button */}
                          <button
                            type="button"
                            onClick={() => handleInspectCheque(pdc)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#e2e8f0',
                              borderRadius: '8px',
                              padding: '0.5rem 0.65rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title={isAr ? 'عرض تفاصيل البند' : 'Inspect details'}
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Installments Table: Dense Professional Accounting Table */}
              {chequeViewMode === 'table' && filteredCheques.length > 0 && (
                <div className={subStyles.denseTableContainer}>
                  <table className={subStyles.denseTable}>
                    <thead>
                      <tr>
                        <th>{isAr ? 'كود البند' : 'Item Code'}</th>
                        <th>{isAr ? 'العميل الملتزم بالسداد' : 'Client / Payer'}</th>
                        <th>{isAr ? 'العقد والوحدة' : 'Contract & Unit'}</th>
                        <th>{isAr ? 'قيمة القسط المطلوبة' : 'Installment Value'}</th>
                        <th>{isAr ? 'تاريخ الاستحقاق' : 'Due Date & Aging'}</th>
                        <th>{isAr ? 'حالة التحصيل' : 'Collection Status'}</th>
                        <th style={{ textAlign: 'center' }}>{isAr ? 'إجراء التحصيل باليد' : 'Hand Collection Action'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCheques.map(pdc => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const isOverdue = pdc.status !== 'Cleared' && pdc.due_date < todayStr;
                        const isCollected = pdc.status === 'Cleared';
                        const linkedContract = data.contracts.find(c => c.contract_id === pdc.contract_id);

                        return (
                          <tr key={pdc.cheque_id} onClick={() => handleInspectCheque(pdc)} style={{ cursor: 'pointer' }}>
                            <td>
                              <div style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--zf-gold, #d4af37)', fontSize: '0.85rem' }}>
                                #{pdc.cheque_number}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#ffffff' }}>{pdc.drawer_name}</div>
                            </td>
                            <td>
                              {linkedContract ? (
                                <div>
                                  <span style={{ color: 'var(--zf-gold, #d4af37)', fontWeight: 700, fontSize: '0.78rem' }}>{linkedContract.contract_number}</span>
                                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{linkedContract.unit_id}</div>
                                </div>
                              ) : (
                                <span style={{ color: '#64748b' }}>—</span>
                              )}
                            </td>
                            <td>
                              <MoneyCell amount={pdc.nominal_value} isAr={isAr} highlight />
                            </td>
                            <td>
                              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: isOverdue ? '#f87171' : '#ffffff' }}>
                                {pdc.due_date}
                              </div>
                              {isOverdue && (
                                <span style={{ color: '#f87171', fontSize: '0.68rem', fontWeight: 800 }}>
                                  {isAr ? 'متأخر' : 'Overdue'}
                                </span>
                              )}
                            </td>
                            <td>
                              {isCollected ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '999px',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#34d399',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  fontSize: '0.7rem',
                                  fontWeight: 800
                                }}>
                                  <CheckCircle2 size={11} /> {isAr ? 'تم التحصيل باليد' : 'Collected'}
                                </span>
                              ) : isOverdue ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '999px',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  color: '#f87171',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  fontSize: '0.7rem',
                                  fontWeight: 800
                                }}>
                                  ⚠️ {isAr ? 'متأخر عن موعده' : 'Overdue'}
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '999px',
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  color: '#93c5fd',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                  fontSize: '0.7rem',
                                  fontWeight: 800
                                }}>
                                  ⏳ {isAr ? 'مستحق لاحقاً باليد' : 'Due Later'}
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                {!isCollected ? (
                                  <button
                                    type="button"
                                    onClick={() => setCollectingPDCItem(pdc)}
                                    style={{
                                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)',
                                      border: '1px solid rgba(16, 185, 129, 0.45)',
                                      color: '#6ee7b7',
                                      padding: '0.3rem 0.65rem',
                                      borderRadius: '6px',
                                      fontSize: '0.74rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.3rem'
                                    }}
                                  >
                                    <Wallet size={12} />
                                    <span>{isAr ? 'تحصيل نقداً باليد' : 'Collect Cash'}</span>
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>
                                    {isAr ? 'مورد بالخزينة' : 'In Safe'}
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleInspectCheque(pdc)}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    color: '#e2e8f0',
                                    padding: '0.25rem 0.45rem',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer'
                                  }}
                                  title={isAr ? 'فحص التفاصيل' : 'Inspect'}
                                >
                                  <Eye size={12} />
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

          {/* MODULE 5: RESCISSIONS & REPOSSESSIONS */}
          {activeTab === 'rescissions' && (() => {
            let totalPenalty = D(0);
            let totalRefund = D(0);
            let totalGrossVoid = D(0);

            data.rescissions.forEach(r => {
              totalPenalty = totalPenalty.plus(r.penalty_retained || '0');
              totalRefund = totalRefund.plus(r.net_refund_liability || '0');
              totalGrossVoid = totalGrossVoid.plus(r.gross_contract_value || '0');
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className={subStyles.stageHeader}>
                  <div className={subStyles.stageTitleArea}>
                    <div className={subStyles.stageBreadcrumb}>
                      <span>FIN-OS</span>
                      <span>/</span>
                      <span>{isAr ? 'فسخ العقود' : 'Contract Rescissions'}</span>
                    </div>
                    <h1 className={subStyles.stageTitle}>
                      {isAr ? 'سجل فسخ العقود وتطبيق الحد الأدنى للاسترداد (Forfeiture Floor)' : 'Contract Rescissions & Forfeiture Floor'}
                    </h1>
                    <div style={{ fontSize: '0.78rem', color: 'var(--zf-text-muted, #6b7086)', marginTop: '0.25rem' }}>
                      {isAr 
                        ? 'السجل الرسمي المعتمد لكافة العقود المفسوخة، احتجاز غرامة الـ 10%، تسوية حساب رد العملاء 206200، واسترداد الوحدات للمخزون.' 
                        : 'Official registry for rescinded contracts, 10% forfeiture retention, customer refund liability (206200), and unit repossession.'}
                    </div>
                  </div>

                  <div className={subStyles.stageActions}>
                    <button
                      className={subStyles.actionBtnSecondary}
                      onClick={() => setActiveTab('contracts')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem' }}
                    >
                      <span>{isAr ? 'العودة لسجل العقود السارية' : 'Back to Active Contracts'}</span>
                    </button>
                  </div>
                </div>

                {/* Rescissions KPI Summary Bar */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1.25rem'
                }}>
                  {/* Card 1: Rescissions Count */}
                  <div style={{
                    background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '16px',
                    padding: '1.35rem 1.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(239, 68, 68, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '155px'
                  }}>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#fca5a5', fontWeight: 800, letterSpacing: '0.02em' }}>
                          {isAr ? 'إجمالي العقود المفسوخة' : 'Total Rescissions'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          {isAr ? 'عقود تم تسويتها وإلغاؤها نظامياً' : 'Voided contracts audited'}
                        </span>
                      </div>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f87171',
                        boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)'
                      }}>
                        <RotateCcw size={20} strokeWidth={2.4} />
                      </div>
                    </div>
                    <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f87171', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                        {data.rescissions.length}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#fca5a5',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                      }}>
                        {isAr ? 'مادة الفسخ القانوني' : 'Legal Rescission'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {isAr ? 'وحدات مستردة للمخزون' : 'repossessed'}
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Gross Value Voided */}
                  <div style={{
                    background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    borderRadius: '16px',
                    padding: '1.35rem 1.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(212, 175, 55, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '155px'
                  }}>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(212, 175, 55, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 800, letterSpacing: '0.02em' }}>
                          {isAr ? 'إجمالي المبيعات الملغاة (V)' : 'Voided Sales Value (V)'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--zf-text-muted, #94a3b8)' }}>
                          {isAr ? 'أصول استردت لمحفظة الشركة' : 'Assets restored to inventory'}
                        </span>
                      </div>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid rgba(212, 175, 55, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--zf-gold, #d4af37)',
                        boxShadow: '0 0 15px rgba(212, 175, 55, 0.2)'
                      }}>
                        <FileText size={20} strokeWidth={2.2} />
                      </div>
                    </div>
                    <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--zf-gold, #d4af37)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                        {D(totalGrossVoid).formatEGP(isAr)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: 'rgba(212, 175, 55, 0.15)',
                        color: 'var(--zf-gold, #d4af37)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        border: '1px solid rgba(212, 175, 55, 0.3)'
                      }}>
                        {isAr ? 'إعادة طرح' : 'Re-listing'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {isAr ? 'متاحة للبيع مجدداً' : 'ready for sale'}
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Penalty Retained */}
                  <div style={{
                    background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '16px',
                    padding: '1.35rem 1.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(245, 158, 11, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '155px'
                  }}>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#fcd34d', fontWeight: 800, letterSpacing: '0.02em' }}>
                          {isAr ? 'الغرامات المحتجزة للشركة (10%)' : 'Retained Penalties (10%)'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          {isAr ? 'إيرادات محتجزة بموجب العقد' : 'Recognized penalty revenue'}
                        </span>
                      </div>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fbbf24',
                        boxShadow: '0 0 15px rgba(245, 158, 11, 0.2)'
                      }}>
                        <DollarSign size={20} strokeWidth={2.4} />
                      </div>
                    </div>
                    <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fbbf24', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                        {D(totalPenalty).formatEGP(isAr)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#fbbf24',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        border: '1px solid rgba(245, 158, 11, 0.3)'
                      }}>
                        {isAr ? 'إيراد قطعي ٤٠٤٠٠٠' : 'GL 404000'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {isAr ? 'أرباح تعويضية للشركة' : 'retained earnings'}
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Customer Refund Liability */}
                  <div style={{
                    background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '16px',
                    padding: '1.35rem 1.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(16, 185, 129, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '155px'
                  }}>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#6ee7b7', fontWeight: 800, letterSpacing: '0.02em' }}>
                          {isAr ? 'صافي الرد للعملاء (206200)' : 'Customer Refund Liability'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          {isAr ? 'التزامات متداولة مستحقة للرد' : 'Payable under Forfeiture Floor'}
                        </span>
                      </div>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#10b981',
                        boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
                      }}>
                        <CheckCircle2 size={20} strokeWidth={2.4} />
                      </div>
                    </div>
                    <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10b981', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                        {D(totalRefund).formatEGP(isAr)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        {isAr ? 'حسابات ٢٠٦٢٠٠' : 'GL 206200'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {isAr ? 'مستحقات عملاء للرد' : 'refundable'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={subStyles.denseTableContainer}>
                  <table className={subStyles.denseTable}>
                    <thead>
                      <tr>
                        <th>{isAr ? 'كود الفسخ' : 'Rescission ID'}</th>
                        <th>{isAr ? 'العقد والوحدة' : 'Contract & Unit'}</th>
                        <th>{isAr ? 'العميل' : 'Customer'}</th>
                        <th>{isAr ? 'المسار' : 'Branch'}</th>
                        <th>{isAr ? 'قيمة العقد (V)' : 'Gross (V)'}</th>
                        <th>{isAr ? 'المحصل (C)' : 'Collected (C)'}</th>
                        <th>{isAr ? 'الغرامة المحتجزة' : 'Penalty Retained'}</th>
                        <th>{isAr ? 'صافي الرد (206200)' : 'Net Refund'}</th>
                        <th>{isAr ? 'حالة الوحدة' : 'Unit State'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rescissions.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--zf-text-muted, #6b7086)' }}>
                            {isAr ? 'لا توجد عقود مفسوخة مسجلة حتى الآن' : 'No rescinded contracts recorded yet.'}
                          </td>
                        </tr>
                      ) : (
                        data.rescissions.map(r => {
                          const linkedContract = data.contracts.find(ct => ct.contract_id === r.contract_id);
                          return (
                            <tr key={r.rescission_id} onClick={() => handleInspectRescission(r)} style={{ cursor: 'pointer' }}>
                              <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--zf-gold, #d4af37)' }}>
                                {r.rescission_id}
                              </td>
                              <td>
                                <div style={{ fontWeight: 700, color: '#ffffff' }}>
                                  {linkedContract?.unit_id || (isAr ? 'وحدة عقارية' : 'Property Unit')}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--zf-gold, #d4af37)', fontFamily: 'monospace' }}>
                                  #{linkedContract?.contract_number || r.contract_id.slice(0, 8)}
                                </div>
                              </td>
                              <td style={{ fontWeight: 600, color: '#e2e8f0' }}>
                                {linkedContract?.buyer_name || '—'}
                              </td>
                              <td>
                                <span className={subStyles.statusPill}>
                                  {r.branch === 'Pre-Delivery'
                                    ? (isAr ? 'المسار ١ (قبل التسليم)' : 'Pre-Delivery')
                                    : (isAr ? 'المسار ٢ (بعد التسليم)' : 'Post-Delivery')}
                                </span>
                              </td>
                              <td><MoneyCell amount={r.gross_contract_value} isAr={isAr} /></td>
                              <td><MoneyCell amount={r.total_cash_collected} isAr={isAr} /></td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <MoneyCell amount={r.penalty_retained} isAr={isAr} highlight />
                                  <LegalVerificationTag label={isAr ? 'غرامة ١٠٪' : '10%'} isAr={isAr} />
                                </div>
                              </td>
                              <td>
                                <span style={{ color: '#10b981', fontWeight: 700 }}>
                                  <MoneyCell amount={r.net_refund_liability} isAr={isAr} />
                                </span>
                              </td>
                              <td><StatusBadge domain="unit" status={r.unit_state} isAr={isAr} /></td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* MODULE 6: COST ALLOCATION & RSV */}
          {activeTab === 'cost-allocation' && (() => {
            const totalWip = data.costAllocations.reduce((acc, ca) => acc.plus(ca.total_incurred_wip || '0'), D(0));
            const totalSales = data.costAllocations.reduce((acc, ca) => acc.plus(ca.total_sales_value || '0'), D(0));
            const avgRsv = totalSales.isZero() ? '0.00%' : `${totalWip.div(totalSales).times(100).toFixed(2)}%`;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className={subStyles.stageHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div className={subStyles.stageTitleArea}>
                    <div className={subStyles.stageBreadcrumb}>
                      <span>FIN-OS</span>
                      <span>/</span>
                      <span>{isAr ? 'تخصيص التكاليف' : 'Cost Allocation'}</span>
                    </div>
                    <h1 className={subStyles.stageTitle}>
                      {isAr ? 'تخصيص التكاليف ورسملة الأعمال تحت التنفيذ (RSV)' : 'WIP Capitalization & Relative Sales Value (RSV)'}
                    </h1>
                  </div>

                  <div className={subStyles.stageActions}>
                    <button
                      type="button"
                      className={subStyles.actionBtnPrimary}
                      onClick={() => setShowRSVModal(true)}
                    >
                      <Calculator size={14} />
                      <span>{isAr ? 'حساب معامل رسملة جديد (RSV)' : 'New RSV Allocation'}</span>
                    </button>
                  </div>
                </div>

                {/* RSV KPI Bar */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1.25rem'
                }}>
                  {/* Card 1: Incurred WIP */}
                  <div style={{
                    background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    borderRadius: '16px',
                    padding: '1.35rem 1.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(212, 175, 55, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '155px'
                  }}>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(212, 175, 55, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 800, letterSpacing: '0.02em' }}>
                          {isAr ? 'إجمالي أعمال التنفيذ المتكبدة (WIP)' : 'Total Incurred WIP'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--zf-text-muted, #94a3b8)' }}>
                          {isAr ? 'تكاليف إنشائية مرسملة بالدفاتر' : 'GL 105000 Incurred costs'}
                        </span>
                      </div>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid rgba(212, 175, 55, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--zf-gold, #d4af37)',
                        boxShadow: '0 0 15px rgba(212, 175, 55, 0.2)'
                      }}>
                        <FileText size={20} strokeWidth={2.2} />
                      </div>
                    </div>
                    <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--zf-gold, #d4af37)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                        {D(totalWip).formatEGP(isAr)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: 'rgba(212, 175, 55, 0.15)',
                        color: 'var(--zf-gold, #d4af37)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        border: '1px solid rgba(212, 175, 55, 0.3)'
                      }}>
                        {isAr ? 'حسابات أستاذ ١٠٥٠٠٠' : 'GL 105000'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {isAr ? 'مدني وكهروميكانيك' : 'Civil & MEP costs'}
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Sales Ceiling */}
                  <div style={{
                    background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    borderRadius: '16px',
                    padding: '1.35rem 1.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(59, 130, 246, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '155px'
                  }}>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#93c5fd', fontWeight: 800, letterSpacing: '0.02em' }}>
                          {isAr ? 'سقف المبيعات المقدر للمشاريع' : 'Total Project Sales Ceiling'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          {isAr ? 'الوعاء البيعي لاحتساب النسب' : 'Sales Denominator'}
                        </span>
                      </div>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#60a5fa',
                        boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)'
                      }}>
                        <DollarSign size={20} strokeWidth={2.4} />
                      </div>
                    </div>
                    <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#60a5fa', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                        {D(totalSales).formatEGP(isAr)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#93c5fd',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        border: '1px solid rgba(59, 130, 246, 0.3)'
                      }}>
                        {isAr ? 'قيمة تعاقدية' : 'Sales Pool'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {isAr ? 'أساس قسمة RSV' : 'cost ratio base'}
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Weighted RSV Factor */}
                  <div style={{
                    background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '16px',
                    padding: '1.35rem 1.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(16, 185, 129, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '155px'
                  }}>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#6ee7b7', fontWeight: 800, letterSpacing: '0.02em' }}>
                          {isAr ? 'متوسط معامل الـ RSV (نسبة تكلفة الإنشاء)' : 'Weighted RSV Factor'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          {isAr ? 'معدل استنزال تكلفة المبيعات (COGS)' : 'Cost of sales relief rate'}
                        </span>
                      </div>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#10b981',
                        boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
                      }}>
                        <Calculator size={20} strokeWidth={2.4} />
                      </div>
                    </div>
                    <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                      <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#10b981', letterSpacing: '-0.02em', lineHeight: 1.15, fontFamily: 'monospace' }}>
                        {avgRsv}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        {isAr ? 'معيار IFRS 15' : 'IFRS 15'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {isAr ? 'تستنزل عند تسليم كل وحدة' : 'relieved at handover'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Search & View Mode Toolbar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '14px',
                  padding: '0.85rem 1.15rem'
                }}>
                  {/* Search input */}
                  <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                    <Search size={16} style={{ position: 'absolute', [isAr ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder={isAr ? 'بحث باسم المشروع أو كود المعامل...' : 'Search project name or allocation ID...'}
                      value={rsvSearchQuery}
                      onChange={e => setRsvSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: isAr ? '0.55rem 2.4rem 0.55rem 0.85rem' : '0.55rem 0.85rem 0.55rem 2.4rem',
                        color: '#ffffff',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* View Mode Switcher */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(0,0,0,0.3)', padding: '0.2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      type="button"
                      onClick={() => setRsvViewMode('cards')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: rsvViewMode === 'cards' ? 'var(--zf-gold, #d4af37)' : 'transparent',
                        color: rsvViewMode === 'cards' ? '#0b0f19' : '#94a3b8',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <LayoutGrid size={13} />
                      <span>{isAr ? 'بطاقات المشاريع' : 'Cards'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRsvViewMode('table')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: rsvViewMode === 'table' ? 'var(--zf-gold, #d4af37)' : 'transparent',
                        color: rsvViewMode === 'table' ? '#0b0f19' : '#94a3b8',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <List size={13} />
                      <span>{isAr ? 'جدول محاسبي' : 'Table'}</span>
                    </button>
                  </div>
                </div>

                {/* 1. CARDS VIEW */}
                {rsvViewMode === 'cards' && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                    gap: '1.25rem'
                  }}>
                    {filteredCostAllocations.map(ca => {
                      const rsvPct = D(ca.rsv_factor || '0').times(100).toFixed(2);
                      const grossMarginPct = D(1).minus(ca.rsv_factor || '0').times(100).toFixed(2);
                      return (
                        <div
                          key={ca.allocation_id}
                          onClick={() => handleInspectRSV(ca)}
                          style={{
                            background: 'linear-gradient(165deg, #071224 0%, #030814 100%)',
                            border: '1px solid rgba(14, 165, 233, 0.3)',
                            borderTop: '4px solid #0ea5e9',
                            borderRadius: '16px',
                            padding: '1.35rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.55), 0 0 20px rgba(14, 165, 233, 0.08)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = '#38bdf8';
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 12px 35px rgba(0, 0, 0, 0.7), 0 0 25px rgba(14, 165, 233, 0.25)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.3)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.55), 0 0 20px rgba(14, 165, 233, 0.08)';
                          }}
                        >
                          {/* Background Isometric Blueprint Grid Pattern */}
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            backgroundImage: 'radial-gradient(rgba(14, 165, 233, 0.08) 1px, transparent 0)',
                            backgroundSize: '20px 20px',
                            pointerEvents: 'none'
                          }} />

                          {/* 1. Quantitative Header Ribbon: IFRS 15 Formula Tag & Assessment Date */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              background: 'rgba(14, 165, 233, 0.14)',
                              border: '1px solid rgba(14, 165, 233, 0.38)',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: '#38bdf8'
                            }}>
                              <Calculator size={13} />
                              <span>{isAr ? 'معيار IFRS 15 • معامل رسملة الإنشاء (RSV)' : 'IFRS 15 • RSV Allocation Matrix'}</span>
                            </div>

                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              {new Date(ca.calculated_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                            </span>
                          </div>

                          {/* 2. Project Headline & Engineering Code */}
                          <div style={{ zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <Building2 size={16} color="#38bdf8" />
                              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                                {ca.project_name}
                              </h3>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--zf-text-muted, #94a3b8)', marginTop: '0.25rem', display: 'block' }}>
                              {isAr ? 'كود تخصيص الأعمال الإنشائية: ' : 'Allocation ID: '}
                              <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>#{ca.allocation_id.slice(0, 10)}</span>
                            </span>
                          </div>

                          {/* 3. Dual Split Analytics HUD Pods (RSV WIP vs Gross Margin) */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0.75rem',
                            zIndex: 1
                          }}>
                            {/* Pod 1: WIP Ratio (Cyan) */}
                            <div style={{
                              background: 'rgba(14, 165, 233, 0.08)',
                              border: '1px solid rgba(14, 165, 233, 0.28)',
                              borderRadius: '10px',
                              padding: '0.75rem 0.85rem'
                            }}>
                              <span style={{ fontSize: '0.67rem', color: '#7dd3fc', display: 'block', fontWeight: 800 }}>
                                {isAr ? 'معامل RSV (تكلفة WIP):' : 'RSV Factor (COGS):'}
                              </span>
                              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                                {ca.rsv_factor}
                              </div>
                              <span style={{ fontSize: '0.7rem', color: '#bae6fd', fontWeight: 700 }}>
                                {rsvPct}% {isAr ? 'من قيمة الوحدة' : 'cost ratio'}
                              </span>
                            </div>

                            {/* Pod 2: Gross Profit Margin (Mint) */}
                            <div style={{
                              background: 'rgba(16, 185, 129, 0.08)',
                              border: '1px solid rgba(16, 185, 129, 0.28)',
                              borderRadius: '10px',
                              padding: '0.75rem 0.85rem'
                            }}>
                              <span style={{ fontSize: '0.67rem', color: '#6ee7b7', display: 'block', fontWeight: 800 }}>
                                {isAr ? 'هامش الربح المقدر:' : 'Gross Profit Margin:'}
                              </span>
                              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#10b981', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                                {grossMarginPct}%
                              </div>
                              <span style={{ fontSize: '0.7rem', color: '#a7f3d0', fontWeight: 700 }}>
                                {isAr ? 'عائد ربحي معترف به' : 'profit margin'}
                              </span>
                            </div>
                          </div>

                          {/* 4. Dual Spectrum Progress Bar */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', zIndex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                              <span style={{ color: '#38bdf8', fontWeight: 800 }}>{isAr ? `تكلفة إنشاء WIP: ${rsvPct}%` : `WIP: ${rsvPct}%`}</span>
                              <span style={{ color: '#10b981', fontWeight: 800 }}>{isAr ? `هامش ربح: ${grossMarginPct}%` : `Margin: ${grossMarginPct}%`}</span>
                            </div>
                            <div style={{ width: '100%', height: '7px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex' }}>
                              <div style={{ width: `${Math.min(parseFloat(rsvPct) || 0, 100)}%`, background: 'linear-gradient(90deg, #0284c7, #38bdf8)', height: '100%' }} />
                              <div style={{ flex: 1, background: 'linear-gradient(90deg, #059669, #34d399)', height: '100%' }} />
                            </div>
                          </div>

                          {/* 5. Financial Pool Ceiling Breakdown */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.74rem', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.75rem', zIndex: 1 }}>
                            <div>
                              <span style={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>
                                {isAr ? 'تكاليف الإنشاء المتكبدة (105000):' : 'Incurred WIP:'}
                              </span>
                              <span style={{ color: 'var(--zf-gold, #d4af37)', fontWeight: 800 }}>
                                {D(ca.total_incurred_wip).formatEGP(isAr)}
                              </span>
                            </div>
                            <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                              <span style={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>
                                {isAr ? 'سقف المبيعات المقدر:' : 'Sales Ceiling:'}
                              </span>
                              <span style={{ color: '#38bdf8', fontWeight: 800 }}>
                                {D(ca.total_sales_value).formatEGP(isAr)}
                              </span>
                            </div>
                          </div>

                          {/* 6. Action Footer Button */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '0.25rem', zIndex: 1 }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInspectRSV(ca);
                              }}
                              style={{
                                background: 'rgba(14, 165, 233, 0.1)',
                                border: '1px solid rgba(14, 165, 233, 0.3)',
                                borderRadius: '8px',
                                padding: '0.45rem 0.85rem',
                                color: '#38bdf8',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Eye size={13} />
                              <span>{isAr ? 'فحص تفاصيل المعامل والتسليم' : 'Inspect RSV Details'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. DENSE TABLE VIEW */}
                {rsvViewMode === 'table' && (
                  <div className={subStyles.denseTableContainer}>
                    <table className={subStyles.denseTable}>
                      <thead>
                        <tr>
                          <th>{isAr ? 'المشروع' : 'Project'}</th>
                          <th>{isAr ? 'أعمال التنفيذ المتكبدة (WIP)' : 'Incurred WIP'}</th>
                          <th>{isAr ? 'سقف المبيعات المقدر' : 'Sales Value Ceiling'}</th>
                          <th>{isAr ? 'معامل RSV' : 'RSV Factor'}</th>
                          <th>{isAr ? 'نسبة تكلفة المبيعات' : 'COGS Relief Rate'}</th>
                          <th>{isAr ? 'هامش الربح المقدر' : 'Gross Margin'}</th>
                          <th>{isAr ? 'تاريخ الحساب' : 'Calculated Date'}</th>
                          <th>{isAr ? 'إجراء' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCostAllocations.map(ca => {
                          const grossMarginPct = D(1).minus(ca.rsv_factor || '0').times(100).toFixed(2);
                          return (
                            <tr 
                              key={ca.allocation_id}
                              onClick={() => handleInspectRSV(ca)}
                              style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
                            >
                              <td style={{ fontWeight: 700, color: 'var(--zf-gold, #d4af37)' }}>{ca.project_name}</td>
                              <td><MoneyCell amount={ca.total_incurred_wip} isAr={isAr} /></td>
                              <td><MoneyCell amount={ca.total_sales_value} isAr={isAr} /></td>
                              <td><span className={subStyles.statusPill}>{ca.rsv_factor}</span></td>
                              <td>
                                <span style={{ color: '#60a5fa', fontWeight: 700 }}>
                                  {D(ca.rsv_factor || '0').times(100).toFixed(2)}% {isAr ? 'من قيمة العقد' : 'of contract'}
                                </span>
                              </td>
                              <td>
                                <span style={{ color: '#10b981', fontWeight: 700 }}>
                                  {grossMarginPct}%
                                </span>
                              </td>
                              <td>{new Date(ca.calculated_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</td>
                              <td>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInspectRSV(ca);
                                  }}
                                  style={{
                                    background: 'rgba(212, 175, 55, 0.1)',
                                    border: '1px solid rgba(212, 175, 55, 0.25)',
                                    borderRadius: '6px',
                                    padding: '0.25rem 0.55rem',
                                    color: 'var(--zf-gold, #d4af37)',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Eye size={12} />
                                  <span>{isAr ? 'فحص' : 'Inspect'}</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {/* MODULE 7: APARTMENT TAXES & FEES LEDGER */}
          {(activeTab as any) === 'tax' && (() => {
            const pendingTax = data.taxRecords
              .filter(t => t.remittance_status !== 'Remitted to ETA')
              .reduce((acc, t) => acc.plus(t.tax_amount || '0'), D(0));
            const remittedTax = data.taxRecords
              .filter(t => t.remittance_status === 'Remitted to ETA')
              .reduce((acc, t) => acc.plus(t.tax_amount || '0'), D(0));
            const totalTax = pendingTax.plus(remittedTax);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className={subStyles.stageHeader}>
                  <div className={subStyles.stageTitleArea}>
                    <div className={subStyles.stageBreadcrumb}>
                      <span>FIN-OS</span>
                      <span>/</span>
                      <span>{isAr ? 'الضرائب والرسوم المضافة' : 'Apartment Taxes & Fees'}</span>
                    </div>
                    <h1 className={subStyles.stageTitle}>
                      {isAr ? 'سجل الضرائب والرسوم المضافة للوحدات والعقود' : 'Manual Apartment Taxes & Fees Ledger'}
                    </h1>
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                      {isAr 
                        ? 'سجل متابعة تفصيلي بالضرائب والرسوم المضافة يدوياً لكل شقة والمحسوبة تلقائياً ضمن إجمالي سعر التعاقد (غير ثابتة وتحدد يدوياً باليد).'
                        : 'Detailed tracking ledger of custom taxes added manually per apartment and calculated directly into gross contract pricing.'}
                    </p>
                  </div>
                </div>

                {/* Tax KPI Bar */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1.25rem'
                }}>
                  {/* Card 1: Pending Tax */}
                  <div style={{
                    background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '16px',
                    padding: '1.35rem 1.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(239, 68, 68, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '155px'
                  }}>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#fca5a5', fontWeight: 800, letterSpacing: '0.02em' }}>
                          {isAr ? 'الضرائب والرسوم قيد الاستيفاء' : 'Pending Taxes & Fees'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          {isAr ? 'مستحقة التحصيل مع أقساط العقود' : 'Due with contract installments'}
                        </span>
                      </div>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f87171',
                        boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)'
                      }}>
                        <Landmark size={20} strokeWidth={2.4} />
                      </div>
                    </div>
                    <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f87171', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                        {pendingTax.formatEGP(isAr)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#fca5a5',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                      }}>
                        {isAr ? 'حساب ٢٠٤٠٠٠' : 'GL 204000'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {isAr ? 'قيد التحصيل مع السداد' : 'pending collection'}
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Remitted Tax */}
                  <div style={{
                    background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '16px',
                    padding: '1.35rem 1.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(16, 185, 129, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '155px'
                  }}>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#6ee7b7', fontWeight: 800, letterSpacing: '0.02em' }}>
                          {isAr ? 'الضرائب والرسوم المستوفاة' : 'Settled / Collected Taxes'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          {isAr ? 'تم استيفاؤها وتحصيلها بالخزينة' : 'Collected into Main Safe (GL 101000)'}
                        </span>
                      </div>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#10b981',
                        boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
                      }}>
                        <CheckCircle2 size={20} strokeWidth={2.4} />
                      </div>
                    </div>
                    <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10b981', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                        {remittedTax.formatEGP(isAr)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        {isAr ? 'مستوفاة بالدفاتر' : 'Settled'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {isAr ? 'بالخزينة الرئيسية' : 'in Safe'}
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Total Assessed Tax Pool */}
                  <div style={{
                    background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    borderRadius: '16px',
                    padding: '1.35rem 1.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(212, 175, 55, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '155px'
                  }}>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'radial-gradient(circle, rgba(212, 175, 55, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 800, letterSpacing: '0.02em' }}>
                          {isAr ? 'إجمالي محفظة الضرائب المضافة للشقق' : 'Total Apartment Taxes Pool'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--zf-text-muted, #94a3b8)' }}>
                          {isAr ? 'محسوبة ضمن أسعار البيع الإجمالية' : 'Factored into gross sales prices'}
                        </span>
                      </div>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid rgba(212, 175, 55, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--zf-gold, #d4af37)',
                        boxShadow: '0 0 15px rgba(212, 175, 55, 0.2)'
                      }}>
                        <FileText size={20} strokeWidth={2.2} />
                      </div>
                    </div>
                    <div style={{ margin: '0.85rem 0 0.5rem 0', zIndex: 1 }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--zf-gold, #d4af37)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                        {totalTax.formatEGP(isAr)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: 'rgba(212, 175, 55, 0.15)',
                        color: 'var(--zf-gold, #d4af37)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        border: '1px solid rgba(212, 175, 55, 0.3)'
                      }}>
                        {data.taxRecords.length} {isAr ? 'سجلات ضريبية' : 'tax records'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {isAr ? 'مضافة يدوياً للشقق' : 'custom added'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. TAX CONTROL & FILTER TOOLBAR */}
                <div style={{
                  background: 'rgba(18, 22, 34, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  {/* Left (RTL Right): Filter Tabs */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* Type Filter */}
                    <div style={{
                      display: 'inline-flex',
                      background: 'rgba(0, 0, 0, 0.35)',
                      padding: '0.25rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      gap: '0.25rem'
                    }}>
                      {[
                        { id: 'all', labelAr: 'كافة الوحدات والعقود', labelEn: 'All Units', count: data.taxRecords.length },
                        { id: 'with_tax', labelAr: 'وحدات بضريبة مضافة', labelEn: 'With Manual Tax', count: data.taxRecords.filter(t => parseFloat(t.tax_amount) > 0).length },
                        { id: 'exempt', labelAr: 'معفاة / بدون ضريبة (٠ ج.م)', labelEn: 'Zero Tax (0 EGP)', count: data.taxRecords.filter(t => !parseFloat(t.tax_amount) || parseFloat(t.tax_amount) === 0).length }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setTaxTypeFilter(tab.id as any)}
                          style={{
                            border: 'none',
                            borderRadius: '7px',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: taxTypeFilter === tab.id ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                            color: taxTypeFilter === tab.id ? 'var(--zf-gold, #d4af37)' : '#94a3b8',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>{isAr ? tab.labelAr : tab.labelEn}</span>
                          <span style={{
                            marginLeft: isAr ? 0 : '0.35rem',
                            marginRight: isAr ? '0.35rem' : 0,
                            opacity: 0.75,
                            fontSize: '0.68rem',
                            fontWeight: 600
                          }}>
                            ({tab.count})
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Status Filter */}
                    <div style={{
                      display: 'inline-flex',
                      background: 'rgba(0, 0, 0, 0.35)',
                      padding: '0.25rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      gap: '0.25rem'
                    }}>
                      {[
                        { id: 'all', labelAr: 'الكل', labelEn: 'All' },
                        { id: 'Pending', labelAr: 'قيد التحصيل / الاستيفاء', labelEn: 'Pending' },
                        { id: 'Remitted to ETA', labelAr: 'مستوفاة ومسددة بالخزينة', labelEn: 'Settled' }
                      ].map(st => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setTaxStatusFilter(st.id as any)}
                          style={{
                            border: 'none',
                            borderRadius: '7px',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: taxStatusFilter === st.id ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                            color: taxStatusFilter === st.id ? '#6ee7b7' : '#94a3b8',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isAr ? st.labelAr : st.labelEn}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right (RTL Left): Search & View Switcher */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: '1 1 280px', justifyContent: 'flex-end' }}>
                    {/* Search Bar */}
                    <div style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      flex: '1 1 220px',
                      maxWidth: '360px'
                    }}>
                      <input
                        type="text"
                        placeholder={isAr ? 'بحث برقم العقد، الوحدة، المشتري، كود الضريبة...' : 'Search contract #, unit, buyer, tax ID...'}
                        value={taxSearchQuery}
                        onChange={e => setTaxSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(0, 0, 0, 0.45)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          padding: '0.42rem 0.75rem',
                          fontSize: '0.76rem',
                          color: '#ffffff',
                          outline: 'none'
                        }}
                      />
                      {taxSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTaxSearchQuery('')}
                          style={{
                            position: 'absolute',
                            right: isAr ? 'auto' : '8px',
                            left: isAr ? '8px' : 'auto',
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* View Switcher: Cards vs Table */}
                    <div style={{
                      display: 'inline-flex',
                      background: 'rgba(0, 0, 0, 0.35)',
                      padding: '0.2rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      <button
                        type="button"
                        onClick={() => setTaxViewMode('cards')}
                        title={isAr ? 'عرض البطاقات التنفيذية' : 'Cards View'}
                        style={{
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.35rem 0.55rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: taxViewMode === 'cards' ? 'rgba(212, 175, 55, 0.25)' : 'transparent',
                          color: taxViewMode === 'cards' ? 'var(--zf-gold, #d4af37)' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Layers size={13} />
                        <span>{isAr ? 'بطاقات' : 'Cards'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxViewMode('table')}
                        title={isAr ? 'عرض الجدول المحاسبي المكثف' : 'Table View'}
                        style={{
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.35rem 0.55rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: taxViewMode === 'table' ? 'rgba(212, 175, 55, 0.25)' : 'transparent',
                          color: taxViewMode === 'table' ? 'var(--zf-gold, #d4af37)' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <BookOpen size={13} />
                        <span>{isAr ? 'جدول' : 'Table'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. CONTENT AREA: CARDS VIEW OR DENSE TABLE VIEW */}
                {filteredTaxes.length === 0 ? (
                  <div style={{
                    background: 'rgba(18, 22, 34, 0.5)',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    borderRadius: '14px',
                    padding: '3rem 1.5rem',
                    textAlign: 'center',
                    color: 'var(--zf-text-muted, #6b7086)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <ShieldCheck size={36} style={{ opacity: 0.4, color: 'var(--zf-gold, #d4af37)' }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0' }}>
                      {isAr ? 'لا توجد سجلات ضريبية مطابقة لمعايير الفلترة الحالية' : 'No tax records match the selected filters.'}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setTaxTypeFilter('all'); setTaxStatusFilter('all'); setTaxSearchQuery(''); }}
                      style={{
                        background: 'rgba(212, 175, 55, 0.12)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        color: 'var(--zf-gold, #d4af37)',
                        borderRadius: '6px',
                        padding: '0.35rem 0.85rem',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: '0.25rem'
                      }}
                    >
                      {isAr ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
                    </button>
                  </div>
                ) : taxViewMode === 'cards' ? (
                  /* EXECUTIVE TAX VOUCHER CARDS GRID */
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                    gap: '1.25rem'
                  }}>
                    {filteredTaxes.map(t => {
                      const linkedContract = data.contracts.find(c => c.contract_id === t.contract_id);
                      const isDisposal = t.tax_type.includes('Disposal');
                      const isRemitted = t.remittance_status === 'Remitted to ETA';
                      const ratePct = D(t.tax_rate).times(100).toFixed(1);

                      return (
                        <div
                          key={t.tax_id}
                          onClick={() => handleInspectTax(t)}
                          style={{
                            background: 'linear-gradient(170deg, #18151f 0%, #0d0a14 100%)',
                            border: isRemitted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.35)',
                            borderTop: isRemitted ? '4px solid #10b981' : '4px solid #f59e0b',
                            borderRadius: '16px',
                            padding: '1.25rem 1.35rem',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '0.9rem',
                            cursor: 'pointer',
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.55), 0 0 20px rgba(245, 158, 11, 0.08)',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 12px 35px rgba(0, 0, 0, 0.7), 0 0 25px rgba(245, 158, 11, 0.2)';
                            e.currentTarget.style.borderColor = isRemitted ? '#10b981' : '#f59e0b';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.55), 0 0 20px rgba(245, 158, 11, 0.08)';
                            e.currentTarget.style.borderColor = isRemitted ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.35)';
                          }}
                        >
                          {/* Background Treasury Seal Grid Watermark */}
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            backgroundImage: 'radial-gradient(rgba(245, 158, 11, 0.05) 1px, transparent 0)',
                            backgroundSize: '18px 18px',
                            pointerEvents: 'none'
                          }} />

                          {/* 1. Header Ribbon: Firm Badge + Settlement Status */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 100%)',
                            border: '1px solid rgba(212, 175, 55, 0.25)',
                            borderRadius: '8px',
                            padding: '0.45rem 0.75rem',
                            zIndex: 1
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <ShieldCheck size={14} color="var(--zf-gold, #d4af37)" />
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--zf-gold, #d4af37)', letterSpacing: '0.02em' }}>
                                {isAr ? 'زكريا فريد للتطوير العقاري • حافظة الرسوم والضرائب' : 'ZF REAL ESTATE • TAX & FEES LEDGER'}
                              </span>
                            </div>

                            <span style={{
                              padding: '0.15rem 0.55rem',
                              borderRadius: '999px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              background: isRemitted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                              border: `1px solid ${isRemitted ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
                              color: isRemitted ? '#6ee7b7' : '#38bdf8',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}>
                              {isRemitted ? (
                                <>
                                  <CheckCircle2 size={11} />
                                  <span>{isAr ? 'مُستوفاة ومسددة' : 'Settled'}</span>
                                </>
                              ) : (
                                <>
                                  <Clock size={11} />
                                  <span>{isAr ? 'قيد الاستيفاء والتحصيل' : 'Pending Collection'}</span>
                                </>
                              )}
                            </span>
                          </div>

                          {/* 2. Tax Label & Description Headline */}
                          <div style={{ zIndex: 1 }}>
                            <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.3 }}>
                              {isAr 
                                ? (t.tax_type.includes('Disposal') 
                                    ? 'ضريبة ورسوم محددة يدوياً للشقة' 
                                    : t.tax_type)
                                : t.tax_type}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--zf-text-muted, #94a3b8)', marginTop: '0.2rem' }}>
                              {isAr ? 'كود القيد الضريبي للوحدة: ' : 'Tax Entry Code: '}
                              <span style={{ fontFamily: 'monospace', color: 'var(--zf-gold, #d4af37)', fontWeight: 700 }}>#{t.tax_id.slice(0, 12)}</span>
                            </div>
                          </div>

                          {/* 3. Slip Box for Tax Amount & Effective Rate */}
                          <div style={{
                            background: 'rgba(0, 0, 0, 0.65)',
                            border: '1.5px dashed rgba(56, 189, 248, 0.35)',
                            borderRadius: '10px',
                            padding: '0.8rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.6)',
                            zIndex: 1
                          }}>
                            <div>
                              <span style={{ fontSize: '0.67rem', color: '#38bdf8', display: 'block', fontWeight: 700 }}>
                                {isAr ? 'الضريبة المضافة يدوياً للشقة (ضمن السعر):' : 'Manual Tax Added (In Price):'}
                              </span>
                              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.02em', marginTop: '0.15rem' }}>
                                <MoneyCell amount={t.tax_amount} isAr={isAr} highlight />
                              </div>
                            </div>
                            <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                              <span style={{ fontSize: '0.67rem', color: '#94a3b8', display: 'block', fontWeight: 700 }}>
                                {isAr ? 'النسبة من الأساسي:' : 'Effective Rate:'}
                              </span>
                              <div style={{
                                fontSize: '0.95rem',
                                fontWeight: 800,
                                color: '#ffffff',
                                background: 'rgba(56, 189, 248, 0.2)',
                                border: '1px solid rgba(56, 189, 248, 0.45)',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                display: 'inline-block',
                                marginTop: '0.15rem'
                              }}>
                                {ratePct}%
                              </div>
                            </div>
                          </div>

                          {/* 4. Declared Entity & Contract Dossier */}
                          <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '8px',
                            padding: '0.65rem 0.85rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem',
                            fontSize: '0.74rem',
                            zIndex: 1
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ color: '#94a3b8' }}>{isAr ? 'العقد المنسوب إليه:' : 'Contract #:'}</span>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--zf-gold, #d4af37)' }}>
                                {linkedContract?.contract_number || t.contract_id?.slice(0, 10) || '—'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ color: '#94a3b8' }}>{isAr ? 'الوحدة / الشقة:' : 'Apartment:'}</span>
                              <span style={{ color: '#ffffff', fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {linkedContract?.unit_id || (isAr ? 'وحدة مباشرة' : 'Direct unit')}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ color: '#94a3b8' }}>{isAr ? 'اسم العميل / المشتري:' : 'Buyer:'}</span>
                              <span style={{ color: '#ffffff', fontWeight: 600 }}>
                                {linkedContract?.buyer_name || (isAr ? 'غير محدد' : 'N/A')}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '0.3rem' }}>
                              <span style={{ color: '#94a3b8' }}>{isAr ? 'سعر الشقة الأساسي:' : 'Base Price:'}</span>
                              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>
                                <MoneyCell amount={t.taxable_base} isAr={isAr} />
                              </span>
                            </div>
                          </div>

                          {/* 5. Card Footer: Remit Action + Dossier Link */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                            paddingTop: '0.75rem',
                            zIndex: 1
                          }}>
                            {isRemitted ? (
                              <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <CheckCircle2 size={14} />
                                <span>{isAr ? 'مستوفاة ومسددة بالخزينة' : 'Settled in Safe'}</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemitTax(t.tax_id);
                                }}
                                disabled={isMutating}
                                style={{
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  color: '#ffffff',
                                  padding: '0.35rem 0.85rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                                }}
                              >
                                <CheckCircle2 size={13} />
                                <span>{isAr ? 'إثبات الاستيفاء بالخزينة' : 'Settle in Safe'}</span>
                              </button>
                            )}

                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              color: '#fbbf24',
                              fontSize: '0.74rem',
                              fontWeight: 800
                            }}>
                              <span>{isAr ? 'فحص تفاصيل الوحدة' : 'Inspect Unit Tax'}</span>
                              <ArrowUpRight size={13} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* DENSE TABLE VIEW WITH CLICKABLE ROWS */
                  <div className={subStyles.denseTableContainer}>
                    <table className={subStyles.denseTable}>
                      <thead>
                        <tr>
                          <th>{isAr ? 'كود القيد' : 'Tax ID'}</th>
                          <th>{isAr ? 'بيان / مسمى الضريبة' : 'Tax Label'}</th>
                          <th>{isAr ? 'العقد والوحدة' : 'Contract & Unit'}</th>
                          <th>{isAr ? 'سعر الشقة الأساسي' : 'Base Price'}</th>
                          <th>{isAr ? 'النسبة المحسوبة' : 'Rate'}</th>
                          <th>{isAr ? 'الضريبة المضافة (يدوياً)' : 'Manual Tax'}</th>
                          <th>{isAr ? 'إجمالي السعر شامل الضريبة' : 'Total Price with Tax'}</th>
                          <th>{isAr ? 'حالة الاستيفاء' : 'Status'}</th>
                          <th style={{ textAlign: 'center' }}>{isAr ? 'إجراء التسوية' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTaxes.map(t => {
                          const linkedContract = data.contracts.find(c => c.contract_id === t.contract_id);
                          const totalVal = D(t.taxable_base).plus(t.tax_amount).toFixed(2);
                          return (
                            <tr 
                              key={t.tax_id}
                              onClick={() => handleInspectTax(t)}
                              style={{ cursor: 'pointer' }}
                              title={isAr ? 'انقر لفحص تفاصيل الضريبة في القائمة الجانبية' : 'Click to inspect tax details'}
                            >
                              <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--zf-gold, #d4af37)' }}>
                                {t.tax_id.slice(0, 14)}
                              </td>
                              <td style={{ fontWeight: 600 }}>
                                {isAr 
                                  ? (t.tax_type.includes('Disposal') 
                                      ? 'ضريبة ورسوم محددة يدوياً للشقة' 
                                      : t.tax_type)
                                  : t.tax_type}
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                  <span style={{ fontFamily: 'monospace', color: 'var(--zf-gold, #d4af37)', fontWeight: 700, fontSize: '0.74rem' }}>
                                    {linkedContract?.contract_number || '—'}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {linkedContract?.unit_id || (isAr ? 'تسوية مباشرة' : 'Direct')}
                                  </span>
                                </div>
                              </td>
                              <td><MoneyCell amount={t.taxable_base} isAr={isAr} /></td>
                              <td>
                                <span style={{ fontWeight: 700, color: '#cbd5e1' }}>{D(t.tax_rate).times(100).toFixed(1)}%</span>
                              </td>
                              <td><MoneyCell amount={t.tax_amount} isAr={isAr} highlight /></td>
                              <td>
                                <span style={{ fontWeight: 800, color: 'var(--zf-gold, #d4af37)' }}>
                                  <MoneyCell amount={totalVal} isAr={isAr} />
                                </span>
                              </td>
                              <td>
                                <span className={subStyles.statusPill} style={{
                                  background: t.remittance_status === 'Remitted to ETA' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                  color: t.remittance_status === 'Remitted to ETA' ? '#6ee7b7' : '#38bdf8',
                                  border: `1px solid ${t.remittance_status === 'Remitted to ETA' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(56, 189, 248, 0.35)'}`
                                }}>
                                  {t.remittance_status === 'Remitted to ETA' 
                                    ? (isAr ? 'مستوفاة بالخزينة' : 'Settled') 
                                    : (isAr ? 'قيد التحصيل' : 'Pending')}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                {t.remittance_status === 'Remitted to ETA' ? (
                                  <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <CheckCircle2 size={13} />
                                    <span>{isAr ? 'مسدد ومستوفى' : 'Settled'}</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRemitTax(t.tax_id)}
                                    disabled={isMutating}
                                    style={{
                                      background: 'linear-gradient(135deg, #10b981, #059669)',
                                      border: 'none',
                                      borderRadius: '6px',
                                      color: '#ffffff',
                                      padding: '0.3rem 0.75rem',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                                    }}
                                  >
                                    <CheckCircle2 size={12} />
                                    <span>{isAr ? 'إثبات الاستيفاء' : 'Settle'}</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          </div>
        </main>
      </div>

      {/* 3. SLIDE-OVER DETAIL INSPECTOR DRAWER */}
      <ZFInspectorDrawer 
        payload={inspectorPayload}
        onClose={() => setInspectorPayload(null)}
        isAr={isAr}
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
        onNavigateToTab={(tab) => setActiveTab(tab as any)}
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
        onSelectModule={(mod) => setActiveTab(mod === 'cockpit' ? 'dashboard' : mod)}
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
        onNavigateToModule={(mod) => setActiveTab(mod === 'cockpit' ? 'dashboard' : mod as any)}
        isAr={isAr}
      />

      {/* 4.35 INTERACTIVE ON-SCREEN GUIDED SPOTLIGHT TOUR */}
      <ZFErpGuidedTour 
        isActive={isGuidedTourActive}
        onComplete={() => setIsGuidedTourActive(false)}
        onSkip={() => setIsGuidedTourActive(false)}
        onNavigateToModule={(mod) => setActiveTab(mod === 'cockpit' ? 'dashboard' : mod as any)}
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

      {/* 5. TRANSACTION MODALS */}
      {/* MODAL: New Real Contract Form — 3-Step Luxury Executive Wizard */}
      {showNewContractModal && (
        <div className={legacyStyles.modalOverlay} onClick={() => { setShowNewContractModal(false); setContractWizardStep(1); }}>
          <div 
            className={legacyStyles.modalContent} 
            style={{ 
              maxWidth: '880px', 
              width: '94vw', 
              maxHeight: '92vh', 
              padding: '1.75rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.2rem'
            }} 
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.85rem' }}>
              <div>
                <h3 className={legacyStyles.modalTitle} style={{ fontSize: '1.35rem' }}>
                  {isAr ? 'تحرير عقد بيع جديد بقاعدة البيانات' : 'Execute Real Sales Contract'}
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--zf-text-secondary, #a7acc0)' }}>
                  {isAr ? 'معالج مالي تنفيذي متكامل: ربط الوحدة والمشتري، جدولة الأقساط، وتوزيع حصص الشركاء' : 'Executive deal workflow: Link property, schedule tranches & assign equity splits.'}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => { setShowNewContractModal(false); setContractWizardStep(1); }}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', borderRadius: '8px', padding: '0.4rem 0.65rem', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                ✕
              </button>
            </div>

            {/* Stepper Navigation Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '0.65rem'
            }}>
              {[
                { step: 1, titleAr: '١. أطراف التعاقد والوحدة', titleEn: '1. Unit & Buyer', descAr: 'الوحدة العقارية وهوية المشتري', descEn: 'Property & client identity' },
                { step: 2, titleAr: '٢. الشروط وجدولة السداد', titleEn: '2. Payment Terms', descAr: 'السعر، المقدم ونظام التقسيط', descEn: 'Price, DP & schedule' },
                { step: 3, titleAr: '٣. الشركاء والاعتماد النهائي', titleEn: '3. Finalization', descAr: 'حصص الممولين وتوجيه الخزينة', descEn: 'Splits & ledger posting' },
              ].map(item => {
                const isActive = contractWizardStep === item.step;
                const isCompleted = contractWizardStep > item.step;
                return (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => {
                      if (item.step === 2) {
                        if (!validateStep1()) return;
                      } else if (item.step === 3) {
                        if (!validateStep1()) {
                          setContractWizardStep(1);
                          return;
                        }
                        if (!validateStep2()) {
                          setContractWizardStep(2);
                          return;
                        }
                      }
                      setContractErrors({});
                      setContractWizardStep(item.step as 1 | 2 | 3);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '10px',
                      background: isActive 
                        ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)' 
                        : isCompleted ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.015)',
                      border: isActive 
                        ? '1px solid var(--zf-gold, #d4af37)' 
                        : isCompleted ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      textAlign: isAr ? 'right' : 'left',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      flexShrink: 0,
                      background: isActive ? 'var(--zf-gold, #d4af37)' : isCompleted ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                      color: isActive ? '#0c0e14' : isCompleted ? 'var(--zf-gold, #d4af37)' : '#64748b'
                    }}>
                      {isCompleted ? '✓' : item.step}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: isActive ? 'var(--zf-gold, #d4af37)' : isCompleted ? '#f8fafc' : '#94a3b8', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {isAr ? item.titleAr : item.titleEn}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '0.1rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {isAr ? item.descAr : item.descEn}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleCreateRealContract} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* ─── STEP 1: PROPERTY & BUYER ─── */}
              {contractWizardStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Card 1: Property Unit Selection */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ background: 'rgba(212, 175, 55, 0.12)', color: 'var(--zf-gold, #d4af37)', fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                        01
                      </span>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                        {isAr ? 'الوحدة العقارية موضوع التعاقد:' : 'Contract Target Property Unit:'}
                      </h4>
                    </div>

                    <select 
                      className={legacyStyles.formInput}
                      value={selectedPropertyId}
                      onChange={e => {
                        const id = e.target.value;
                        setSelectedPropertyId(id);
                        if (contractErrors.property) setContractErrors(prev => ({ ...prev, property: '' }));
                        if (id === 'custom_unit') {
                          setCustomPrice('');
                          setBasePriceInput('');
                          setApartmentTaxInput('0');
                          setApartmentTaxDesc('');
                          setCustomUnitName('');
                          setDownPaymentPct('0.15');
                          setDownPaymentInputPct('15');
                          setDownPaymentAmountInput('');
                          setNumInstallments('8');
                          return;
                        }
                        const prop = data.properties.find(p => p.id === id);
                        if (prop) {
                          const b = prop.price_egp;
                          const t = prop.tax_amount_egp || 0;
                          setBasePriceInput(b.toString());
                          setApartmentTaxInput(t.toString());
                          setApartmentTaxDesc('');
                          setCustomPrice((b + t).toString());
                          setDownPaymentPct('0.15');
                          setDownPaymentInputPct('15');
                          setDownPaymentAmountInput('');
                          setNumInstallments(prop.completion_status === 'off_plan' ? '12' : '6');
                          if (prop.partner_splits && prop.partner_splits.length > 0) {
                            setPartnerSplits(normalizePartnerSplits(prop.partner_splits));
                          } else {
                            setPartnerSplits(normalizePartnerSplits(null));
                          }
                        } else if (id === 'custom_unit') {
                          setPartnerSplits(normalizePartnerSplits(null));
                        }
                      }}
                      required
                    >
                      <option value="">{isAr ? '-- اختر الوحدة العقارية من الكتالوج --' : '-- Choose Property Unit --'}</option>
                      <option value="custom_unit" style={{ fontWeight: 800, color: 'var(--zf-gold, #d4af37)' }}>
                        {isAr ? '[+ إدخال وحدة / مشروع مخصص لزكريا فريد]' : '[+ Custom Developer Project / Unit]'}
                      </option>

                      {data.properties.filter(p => p.type === 'building').length > 0 && (
                        <optgroup label={isAr ? 'عمارات ومباني كاملة (Buildings)' : 'Buildings'}>
                          {data.properties.filter(p => p.type === 'building').map(p => {
                            const wholeContract = data.contracts.find(c => 
                              (c.property_id === p.id || c.unit_id === p.title_ar || c.unit_id === p.title_en) && 
                              (c.status === 'Active' || c.status === 'Completed') &&
                              (c.is_whole_building_sale || !c.building_unit_id)
                            );
                            const bUnits = p.building_units || [];
                            const unitContracts = data.contracts.filter(c => 
                              (c.property_id === p.id || c.unit_id?.includes(p.title_ar)) &&
                              (c.status === 'Active' || c.status === 'Completed') &&
                              c.building_unit_id
                            );
                            const allUnitsSold = bUnits.length > 0 && bUnits.every(u => u.status === 'contracted' || unitContracts.some(c => c.building_unit_id === u.unit_id));
                            const isFullySold = Boolean(wholeContract || allUnitsSold || p.listing_status === 'sold');

                            return (
                              <option key={p.id} value={p.id} disabled={isFullySold} style={isFullySold ? { color: '#94a3b8', fontStyle: 'italic' } : undefined}>
                                {isAr ? p.title_ar : p.title_en} {p.area_sqm ? `(${p.area_sqm} م²)` : ''} — {D(p.price_egp).formatEGP(isAr)} {wholeContract ? `[${isAr ? 'عمارة مباعة بالكامل' : 'Whole Building Sold'} - ${wholeContract.contract_number}]` : allUnitsSold ? `[${isAr ? 'كافة الشقق مباعة' : 'All Units Sold'}]` : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                      )}

                      {data.properties.filter(p => p.type === 'apartment' && !((p.title_ar || '').includes('دوبلكس') || (p.title_ar || '').includes('روف') || (p.title_ar || '').includes('رووف'))).length > 0 && (
                        <optgroup label={isAr ? 'شقق سكنية متكررة (Standard Flats)' : 'Standard Flats'}>
                          {data.properties.filter(p => p.type === 'apartment' && !((p.title_ar || '').includes('دوبلكس') || (p.title_ar || '').includes('روف') || (p.title_ar || '').includes('رووف'))).map(p => {
                            const activeContract = data.contracts.find(c => 
                              (c.property_id === p.id || c.unit_id === p.title_ar || c.unit_id === p.title_en) && 
                              (c.status === 'Active' || c.status === 'Completed')
                            );
                            return (
                              <option key={p.id} value={p.id} disabled={Boolean(activeContract)} style={activeContract ? { color: '#94a3b8', fontStyle: 'italic' } : undefined}>
                                {isAr ? p.title_ar : p.title_en} {p.area_sqm ? `(${p.area_sqm} م²)` : ''} — {D(p.price_egp).formatEGP(isAr)} {activeContract ? `[${isAr ? 'مُتعاقد عليه' : 'Sold'} - ${activeContract.contract_number}]` : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                      )}

                      {data.properties.filter(p => (p.title_ar || '').includes('دوبلكس') || (p.title_ar || '').includes('روف') || (p.title_ar || '').includes('رووف')).length > 0 && (
                        <optgroup label={isAr ? 'شقق دوبلكس ورووف (Duplex & Roof Suites)' : 'Duplex & Roof Suites'}>
                          {data.properties.filter(p => (p.title_ar || '').includes('دوبلكس') || (p.title_ar || '').includes('روف') || (p.title_ar || '').includes('رووف')).map(p => {
                            const activeContract = data.contracts.find(c => 
                              (c.property_id === p.id || c.unit_id === p.title_ar || c.unit_id === p.title_en) && 
                              (c.status === 'Active' || c.status === 'Completed')
                            );
                            return (
                              <option key={p.id} value={p.id} disabled={Boolean(activeContract)} style={activeContract ? { color: '#94a3b8', fontStyle: 'italic' } : undefined}>
                                {isAr ? p.title_ar : p.title_en} {p.area_sqm ? `(${p.area_sqm} م²)` : ''} — {D(p.price_egp).formatEGP(isAr)} {activeContract ? `[${isAr ? 'مُتعاقد عليه' : 'Sold'} - ${activeContract.contract_number}]` : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                      )}

                      {data.properties.filter(p => p.type === 'garage').length > 0 && (
                        <optgroup label={isAr ? 'جراجات وباكيات استثمارية (Garages)' : 'Garages'}>
                          {data.properties.filter(p => p.type === 'garage').map(p => {
                            const activeContract = data.contracts.find(c => 
                              (c.property_id === p.id || c.unit_id === p.title_ar || c.unit_id === p.title_en) && 
                              (c.status === 'Active' || c.status === 'Completed')
                            );
                            return (
                              <option key={p.id} value={p.id} disabled={Boolean(activeContract)} style={activeContract ? { color: '#94a3b8', fontStyle: 'italic' } : undefined}>
                                {isAr ? p.title_ar : p.title_en} {p.area_sqm ? `(${p.area_sqm} م²)` : ''} — {D(p.price_egp).formatEGP(isAr)} {activeContract ? `[${isAr ? 'مُتعاقد عليه' : 'Sold'} - ${activeContract.contract_number}]` : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                      )}
                    </select>
                    {contractErrors.property && (
                      <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                        {contractErrors.property}
                      </span>
                    )}

                    {/* Building Sales Scope Selector (Whole Building vs Individual Apartment) */}
                    {selectedPropertyId && selectedPropertyId !== 'custom_unit' && (() => {
                      const prop = data.properties.find(p => p.id === selectedPropertyId);
                      if (!prop || (prop.type !== 'building' && !(prop.title_ar || '').includes('عمارة') && !(prop.title_en || '').toLowerCase().includes('building'))) return null;
                      
                      const wholeContract = data.contracts.find(c => 
                        (c.property_id === prop.id || c.unit_id === prop.title_ar || c.unit_id === prop.title_en) && 
                        (c.status === 'Active' || c.status === 'Completed') &&
                        (c.is_whole_building_sale || !c.building_unit_id)
                      );
                      const isWholeBuildingSold = Boolean(wholeContract || prop.listing_status === 'sold');

                      if (isWholeBuildingSold) {
                        return (
                          <div style={{
                            marginTop: '0.65rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            borderRadius: '12px',
                            padding: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem'
                          }}>
                            <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0 }} />
                            <div>
                              <strong style={{ color: '#f87171', fontSize: '0.82rem', display: 'block' }}>
                                {isAr ? 'هذه العمارة تم بيعها بالكامل بموجب تعاقد رسمي!' : 'This building is already sold entirely!'}
                              </strong>
                              <span style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
                                {isAr 
                                  ? `العقد القائم: ${wholeContract?.contract_number || ''} للمشتري (${wholeContract?.buyer_name || ''}). لا يُسمح ببيع أي شقق منفصلة من هذه العمارة لأنها مبيعة بالكامل.` 
                                  : `Master contract: ${wholeContract?.contract_number || ''}. No individual apartments can be sold.`}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      const units = prop.building_units || [];

                      return (
                        <div style={{
                          marginTop: '0.65rem',
                          background: 'rgba(212, 175, 55, 0.08)',
                          border: '1px solid rgba(212, 175, 55, 0.25)',
                          borderRadius: '12px',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.65rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.78rem', color: '#ffffff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Building2 size={15} color="var(--zf-gold, #d4af37)" />
                              <span>{isAr ? 'نظام التعاقد على هذه العمارة:' : 'Building Contract Scope:'}</span>
                            </span>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsWholeBuildingContract(true);
                                  setSelectedBuildingUnitId(undefined);
                                  setSelectedBuildingUnitNumber(undefined);
                                  setCustomPrice(prop.price_egp.toString());
                                }}
                                style={{
                                  background: isWholeBuildingContract ? 'linear-gradient(135deg, #d4af37 0%, #b89628 100%)' : 'rgba(255, 255, 255, 0.05)',
                                  color: isWholeBuildingContract ? '#080c14' : '#94a3b8',
                                  border: isWholeBuildingContract ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '6px',
                                  padding: '0.3rem 0.65rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                {isAr ? '🏢 بيع العمارة كاملة' : 'Whole Building'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsWholeBuildingContract(false);
                                  const firstAvail = units.find(u => u.status !== 'contracted') || units[0];
                                  if (firstAvail) {
                                    setSelectedBuildingUnitId(firstAvail.unit_id);
                                    setSelectedBuildingUnitNumber(firstAvail.unit_number);
                                    setCustomPrice(firstAvail.price_egp.toString());
                                  }
                                }}
                                style={{
                                  background: !isWholeBuildingContract ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' : 'rgba(255, 255, 255, 0.05)',
                                  color: !isWholeBuildingContract ? '#080c14' : '#94a3b8',
                                  border: !isWholeBuildingContract ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '6px',
                                  padding: '0.3rem 0.65rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                {isAr ? '🚪 بيع شقة محددة' : 'Specific Apartment'}
                              </button>
                            </div>
                          </div>

                          {!isWholeBuildingContract && units.length > 0 && (
                            <div>
                              <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                                {isAr ? 'اختر الشقة / الوحدة المراد بيعها بالعمارة:' : 'Select Target Apartment in Building:'}
                              </label>
                              <select
                                className={legacyStyles.formInput}
                                value={selectedBuildingUnitId || ''}
                                onChange={(e) => {
                                  const uId = e.target.value;
                                  setSelectedBuildingUnitId(uId);
                                  const targetUnit = units.find(u => u.unit_id === uId);
                                  if (targetUnit) {
                                    setSelectedBuildingUnitNumber(targetUnit.unit_number);
                                    const b = targetUnit.price_egp;
                                    const t = targetUnit.tax_amount_egp || 0;
                                    setBasePriceInput(b.toString());
                                    setApartmentTaxInput(t.toString());
                                    setApartmentTaxDesc(targetUnit.tax_description || '');
                                    setCustomPrice((b + t).toString());
                                  }
                                }}
                              >
                                <option value="">{isAr ? '-- اختر الشقة --' : '-- Choose Apartment --'}</option>
                                {units.map((u) => {
                                  const isUnitSold = u.status === 'contracted';
                                  const baseAmt = u.price_egp || 0;
                                  const taxAmt = u.tax_amount_egp || 0;
                                  const totalUnitAmt = baseAmt + taxAmt;
                                  return (
                                    <option key={u.unit_id} value={u.unit_id} disabled={isUnitSold}>
                                      {u.unit_number} ({u.area_sqm} م²) — {isAr ? 'أساس:' : 'Base:'} {D(baseAmt).formatEGP(isAr)}
                                      {taxAmt > 0 ? ` + ${isAr ? 'ضريبة:' : 'Tax:'} ${D(taxAmt).formatEGP(isAr)}` : ''}
                                      {` = ${D(totalUnitAmt).formatEGP(isAr)}`}
                                      {isUnitSold ? ` [${isAr ? 'مباعة' : 'Sold'}]` : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Active Contract Alert for selected property */}
                    {selectedPropertyId && selectedPropertyId !== 'custom_unit' && (() => {
                      const prop = data.properties.find(p => p.id === selectedPropertyId);
                      if (prop && (prop.type === 'building' || (prop.title_ar || '').includes('عمارة')) && !isWholeBuildingContract) {
                        return null; // Apartment level checks handled in dropdown
                      }
                      const activeContract = data.contracts.find(c => 
                        (c.property_id === selectedPropertyId || (prop && (c.unit_id === prop.title_ar || c.unit_id === prop.title_en))) && 
                        (c.status === 'Active' || c.status === 'Completed') &&
                        (c.is_whole_building_sale || !c.building_unit_id)
                      );
                      if (!activeContract) return null;
                      return (
                        <div style={{
                          marginTop: '0.65rem',
                          padding: '0.75rem 1rem',
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.45)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <AlertCircle size={20} color="#f87171" style={{ flexShrink: 0 }} />
                          <div>
                            <strong style={{ color: '#f87171', fontSize: '0.84rem' }}>
                              {isAr ? 'تنبيه: هذا العقار مرتبط بالفعل بعقد نشط قائم!' : 'Warning: Property already has an active contract!'}
                            </strong>
                            <div style={{ marginTop: '3px', fontSize: '0.76rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                              {isAr 
                                ? `العقد القائم: ${activeContract.contract_number} — المشتري: ${activeContract.buyer_name} (قيمة: ${D(activeContract.gross_contract_value).formatEGP(isAr)}). لا يُسمح بإبرام بيع مكرر لنفس العقار إلا بعد اتخاذ إجراء فسخ العقد السابق أولاً.`
                                : `Active contract: ${activeContract.contract_number} (${activeContract.buyer_name}). Duplicate sales are blocked unless previously rescinded.`}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Custom Unit Name Input */}
                    {selectedPropertyId === 'custom_unit' && (
                      <div style={{ marginTop: '0.4rem' }}>
                        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--zf-gold, #d4af37)', display: 'block', marginBottom: '0.25rem' }}>
                          {isAr ? 'اسم وبيانات الوحدة / المشروع الخاص بالتطوير:' : 'Custom Project / Unit Details:'} <span style={{ color: '#f87171' }}>*</span>
                        </label>
                        <input
                          type="text"
                          className={legacyStyles.formInput}
                          value={customUnitName}
                          onChange={e => {
                            setCustomUnitName(e.target.value);
                            if (contractErrors.customUnitName) setContractErrors(prev => ({ ...prev, customUnitName: '' }));
                          }}
                          placeholder={isAr ? 'مثال: مشروع عمارة زايد ٤ - شقة ١٠٢ (مساحة ١٨٥ م²)' : 'e.g. Zayed Project 4 - Apt 102 (185 sqm)'}
                          style={{ borderColor: contractErrors.customUnitName ? '#ef4444' : undefined }}
                          required
                        />
                        {contractErrors.customUnitName && (
                          <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                            {contractErrors.customUnitName}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Selected Property Preview Card */}
                    {selectedPropertyId && selectedPropertyId !== 'custom_unit' && (() => {
                      const prop = data.properties.find(p => p.id === selectedPropertyId);
                      if (!prop) return null;
                      return (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          padding: '0.75rem 0.9rem',
                          background: 'rgba(212, 175, 55, 0.04)',
                          border: '1px solid rgba(212, 175, 55, 0.2)',
                          borderRadius: '8px'
                        }}>
                          {prop.property_images && prop.property_images.length > 0 ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={prop.property_images[0].url}
                              alt={prop.title_ar}
                              style={{ width: '64px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)', flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{ width: '64px', height: '48px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.7rem', flexShrink: 0 }}>
                              {isAr ? 'بدون صورة' : 'No img'}
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                              <strong style={{ fontSize: '0.84rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {isAr ? prop.title_ar : prop.title_en}
                              </strong>
                              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--zf-gold, #d4af37)', flexShrink: 0 }}>
                                {D(prop.price_egp).formatEGP(isAr)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.2rem', fontSize: '0.72rem', color: '#94a3b8' }}>
                              <span>{prop.location}</span>
                              {prop.area_sqm ? <span>• {prop.area_sqm} م²</span> : null}
                              {prop.bedrooms ? <span>• {prop.bedrooms} غرف</span> : null}
                              <span>• {prop.completion_status === 'ready' ? (isAr ? 'جاهز للتسليم' : 'Ready') : (isAr ? 'تحت الإنشاء' : 'Off-Plan')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Card 2: Buyer & CRM Sync */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: 'rgba(212, 175, 55, 0.12)', color: 'var(--zf-gold, #d4af37)', fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                          02
                        </span>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                          {isAr ? 'بيانات المشتري والربط بمنظومة العملاء (CRM):' : 'Buyer Legal Identity & CRM Sync:'}
                        </h4>
                      </div>

                      {/* Mode Toggle Buttons */}
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => { setLeadSelectionMode('EXISTING_LEAD'); }}
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: leadSelectionMode === 'EXISTING_LEAD' ? 'rgba(212, 175, 55, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                            color: leadSelectionMode === 'EXISTING_LEAD' ? 'var(--zf-gold, #d4af37)' : '#94a3b8',
                            border: leadSelectionMode === 'EXISTING_LEAD' ? '1px solid var(--zf-gold, #d4af37)' : '1px solid rgba(255, 255, 255, 0.08)',
                            transition: 'all 0.2s'
                          }}
                        >
                          {isAr ? 'اختيار عميل مسجل' : 'Existing CRM Lead'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLeadSelectionMode('NEW_LEAD');
                            setSelectedLeadId('');
                            setBuyerName('');
                            setBuyerPhone('');
                            setBuyerEmail('');
                          }}
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: leadSelectionMode === 'NEW_LEAD' ? 'rgba(212, 175, 55, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                            color: leadSelectionMode === 'NEW_LEAD' ? 'var(--zf-gold, #d4af37)' : '#94a3b8',
                            border: leadSelectionMode === 'NEW_LEAD' ? '1px solid var(--zf-gold, #d4af37)' : '1px solid rgba(255, 255, 255, 0.08)',
                            transition: 'all 0.2s'
                          }}
                        >
                          {isAr ? 'إضافة عميل جديد' : 'New Buyer'}
                        </button>
                      </div>
                    </div>

                    {/* Mode 1: Select Registered Lead */}
                    {leadSelectionMode === 'EXISTING_LEAD' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <select
                          className={legacyStyles.formInput}
                          value={selectedLeadId}
                          onChange={e => handleSelectLead(e.target.value)}
                        >
                          <option value="">{isAr ? '-- اختر العميل من قاعدة البيانات المسجلة --' : '-- Choose from Registered CRM Leads --'}</option>
                          {(data.leads || []).map(lead => (
                            <option key={lead.id} value={lead.id}>
                              {lead.name} {lead.phone ? `(${lead.phone})` : ''} {lead.property ? `[مهتم بـ: ${lead.property.title_ar || lead.property.title_en}]` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Buyer Inputs Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className={legacyStyles.formGroup}>
                        <label className={legacyStyles.formLabel}>
                          {isAr ? 'الاسم المثبت بالعقد:' : 'Legal Full Name:'} <span style={{ color: '#f87171' }}>*</span>
                        </label>
                        <input 
                          type="text" 
                          className={legacyStyles.formInput}
                          value={buyerName}
                          onChange={e => {
                            setBuyerName(e.target.value);
                            if (contractErrors.buyerName) setContractErrors(prev => ({ ...prev, buyerName: '' }));
                          }}
                          placeholder={isAr ? 'مثال: محمد السيد محمود' : 'e.g. John Doe'}
                          style={{ borderColor: contractErrors.buyerName ? '#ef4444' : undefined }}
                          required
                        />
                        {contractErrors.buyerName && (
                          <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                            {contractErrors.buyerName}
                          </span>
                        )}
                      </div>
                      <div className={legacyStyles.formGroup}>
                        <label className={legacyStyles.formLabel}>
                          {isAr ? 'الرقم القومي / السجل التجاري:' : 'National ID / Reg #:'} <span style={{ color: '#f87171' }}>*</span>
                        </label>
                        <input 
                          type="text" 
                          className={legacyStyles.formInput}
                          value={buyerNationalId}
                          onChange={e => {
                            setBuyerNationalId(e.target.value);
                            if (contractErrors.buyerNationalId) setContractErrors(prev => ({ ...prev, buyerNationalId: '' }));
                          }}
                          placeholder="29010201234567"
                          style={{ borderColor: contractErrors.buyerNationalId ? '#ef4444' : undefined }}
                          required
                        />
                        {contractErrors.buyerNationalId && (
                          <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                            {contractErrors.buyerNationalId}
                          </span>
                        )}
                      </div>
                      <div className={legacyStyles.formGroup}>
                        <label className={legacyStyles.formLabel}>
                          {isAr ? 'رقم الهاتف والتواصل:' : 'Phone Number:'} <span style={{ color: '#f87171' }}>*</span>
                        </label>
                        <input 
                          type="tel" 
                          className={legacyStyles.formInput}
                          value={buyerPhone}
                          onChange={e => {
                            setBuyerPhone(e.target.value);
                            if (contractErrors.buyerPhone) setContractErrors(prev => ({ ...prev, buyerPhone: '' }));
                          }}
                          placeholder="01012345678"
                          style={{ borderColor: contractErrors.buyerPhone ? '#ef4444' : undefined }}
                          required
                        />
                        {contractErrors.buyerPhone && (
                          <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                            {contractErrors.buyerPhone}
                          </span>
                        )}
                      </div>
                      <div className={legacyStyles.formGroup}>
                        <label className={legacyStyles.formLabel}>{isAr ? 'البريد الإلكتروني:' : 'Email Address:'}</label>
                        <input 
                          type="email" 
                          className={legacyStyles.formInput}
                          value={buyerEmail}
                          onChange={e => setBuyerEmail(e.target.value)}
                          placeholder="client@example.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 1 Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                    <button type="button" className={legacyStyles.actionBtnGhost} onClick={() => { setShowNewContractModal(false); setContractWizardStep(1); setContractErrors({}); }}>
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button 
                      type="button" 
                      className={legacyStyles.actionBtnGold}
                      onClick={() => {
                        if (validateStep1()) {
                          setContractErrors({});
                          setContractWizardStep(2);
                        }
                      }}
                    >
                      <span>{isAr ? 'المتابعة للشروط المالية وجدولة السداد' : 'Proceed to Payment Terms'}</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ─── STEP 2: FINANCIAL TERMS & PAYMENT PLAN ─── */}
              {contractWizardStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Card 1: Agreed Contract Value & Signing Date */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: 'rgba(212, 175, 55, 0.12)', color: 'var(--zf-gold, #d4af37)', fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                          01
                        </span>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                          {isAr ? 'قيمة التعاقد المتفق عليها وتاريخ التوقيع:' : 'Agreed Contract Value & Signing Date:'}
                        </h4>
                      </div>
                      <span style={{
                        fontSize: '0.66rem',
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        fontWeight: 700
                      }}>
                        {isAr ? 'شامل تكاليف البناء والضرائب والرسوم المسددة' : 'Includes All Incurred Costs & Taxes'}
                      </span>
                    </div>

                    {/* Inputs Row: Contract Value + Signing Date */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1rem', alignItems: 'start' }}>
                      <div className={legacyStyles.formGroup}>
                        <label className={legacyStyles.formLabel} style={{ fontWeight: 700, color: '#f8fafc' }}>
                          {isAr ? 'سعر بيع الشقة / قيمة التعاقد الإجمالية (ج.م) *' : 'Agreed Unit Selling Price (EGP) *'}
                        </label>
                        <input 
                          type="number" 
                          step="1000"
                          className={legacyStyles.formInput}
                          value={customPrice}
                          onChange={e => {
                            const val = e.target.value;
                            setCustomPrice(val);
                            setBasePriceInput(val);
                            if (contractErrors.contractValue) setContractErrors(prev => ({ ...prev, contractValue: '' }));
                          }}
                          placeholder="2500000"
                          style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--zf-gold, #d4af37)' }}
                          required
                        />
                        {customPrice && parseFloat(customPrice) > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                            {D(customPrice).formatEGP(isAr)}
                          </div>
                        )}
                      </div>

                      <div className={legacyStyles.formGroup}>
                        <label className={legacyStyles.formLabel}>{isAr ? 'تاريخ توقيع العقد *' : 'Contract Signing Date *'}</label>
                        <input 
                          type="date" 
                          className={legacyStyles.formInput}
                          value={firstPaymentDate}
                          onChange={e => setFirstPaymentDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Payment Plan & Flexible Down Payment */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ background: 'rgba(212, 175, 55, 0.12)', color: 'var(--zf-gold, #d4af37)', fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                        02
                      </span>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                        {isAr ? 'نظام وطريقة السداد والتحصيل:' : 'Payment Scheme & Installment Plan:'}
                      </h4>
                    </div>

                    {/* Plan Type Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
                      <button
                        type="button"
                        onClick={() => setPaymentPlanType('FULL_CASH')}
                        style={{
                          padding: '0.65rem 0.5rem',
                          borderRadius: '8px',
                          border: paymentPlanType === 'FULL_CASH' ? '1px solid var(--zf-gold, #d4af37)' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: paymentPlanType === 'FULL_CASH' ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          color: paymentPlanType === 'FULL_CASH' ? 'var(--zf-gold, #d4af37)' : 'var(--zf-text-secondary, #a7acc0)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.2rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span>{isAr ? 'سداد كاش كامل فوري' : 'Full Cash 100%'}</span>
                        <span style={{ fontSize: '0.66rem', opacity: 0.8 }}>{isAr ? 'سداد 100% بدون أقساط' : 'No installments'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentPlanType('UPFRONT_HANDOVER')}
                        style={{
                          padding: '0.65rem 0.5rem',
                          borderRadius: '8px',
                          border: paymentPlanType === 'UPFRONT_HANDOVER' ? '1px solid var(--zf-gold, #d4af37)' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: paymentPlanType === 'UPFRONT_HANDOVER' ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          color: paymentPlanType === 'UPFRONT_HANDOVER' ? 'var(--zf-gold, #d4af37)' : 'var(--zf-text-secondary, #a7acc0)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.2rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span>{isAr ? 'مقدم مع دفعة استلام' : 'Upfront + Handover'}</span>
                        <span style={{ fontSize: '0.66rem', opacity: 0.8 }}>{isAr ? 'دفعة حجز + دفعة تسليم' : 'Lump sum at delivery'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentPlanType('INSTALLMENTS')}
                        style={{
                          padding: '0.65rem 0.5rem',
                          borderRadius: '8px',
                          border: paymentPlanType === 'INSTALLMENTS' ? '1px solid var(--zf-gold, #d4af37)' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: paymentPlanType === 'INSTALLMENTS' ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          color: paymentPlanType === 'INSTALLMENTS' ? 'var(--zf-gold, #d4af37)' : 'var(--zf-text-secondary, #a7acc0)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.2rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span>{isAr ? 'تقسيط دوري منتظم' : 'Quarterly Installments'}</span>
                        <span style={{ fontSize: '0.66rem', opacity: 0.8 }}>{isAr ? 'مقدم + أقساط مجدولة' : 'Standard schedule'}</span>
                      </button>
                    </div>

                    {/* Plan Details: Full Cash */}
                    {paymentPlanType === 'FULL_CASH' && (
                      <div style={{
                        background: 'rgba(212, 175, 55, 0.04)',
                        border: '1px solid rgba(212, 175, 55, 0.2)',
                        borderRadius: '8px',
                        padding: '0.75rem 0.95rem',
                        fontSize: '0.75rem',
                        color: '#e2e8f0'
                      }}>
                        {isAr 
                          ? `سداد كاش كامل 100% بمبلغ ${D(modalContractValue).formatEGP(isAr)}: يتم قيد المبلغ بالكامل في الخزينة/البنك فورياً، وتُعتبر الوحدة مسددة بالكامل بدون أي مديونية أقساط لاحقة.`
                          : `100% Full Cash settlement of ${D(modalContractValue).formatEGP(isAr)}: full amount posted immediately to cash/bank with zero remaining installments.`
                        }
                      </div>
                    )}

                    {/* Plan Details: Upfront + Handover */}
                    {paymentPlanType === 'UPFRONT_HANDOVER' && (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(212, 175, 55, 0.25)',
                        borderRadius: '10px',
                        padding: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--zf-gold, #d4af37)' }}>
                            {isAr ? 'تحديد الدفعة المقدمة (حجز وتعاقد):' : 'Down Payment Specification:'}
                          </span>
                          {/* Preset Chips */}
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {[10, 15, 20, 25, 30, 40, 50].map(preset => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => handleSelectPresetPct(preset)}
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  background: Math.abs(parseFloat(downPaymentInputPct) - preset) < 0.1 ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                  color: Math.abs(parseFloat(downPaymentInputPct) - preset) < 0.1 ? 'var(--zf-gold, #d4af37)' : '#94a3b8',
                                  border: Math.abs(parseFloat(downPaymentInputPct) - preset) < 0.1 ? '1px solid var(--zf-gold, #d4af37)' : '1px solid rgba(255, 255, 255, 0.08)'
                                }}
                              >
                                {preset}%
                              </button>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '0.75rem', alignItems: 'start' }}>
                          {/* Percentage Input */}
                          <div>
                            <label style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                              {isAr ? 'نسبة المقدم (%):' : 'Down Payment Percentage (%):'}
                            </label>
                            <div style={{ position: 'relative' }}>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                className={legacyStyles.formInput}
                                style={{ padding: '0.45rem 0.65rem', fontSize: '0.85rem', fontWeight: 700 }}
                                value={downPaymentInputPct}
                                onChange={e => handleDownPaymentPctChange(e.target.value)}
                                placeholder="15"
                                required
                              />
                              <span style={{ position: 'absolute', [isAr ? 'left' : 'right']: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.78rem', fontWeight: 700 }}>
                                %
                              </span>
                            </div>
                          </div>

                          {/* Cash Amount Input */}
                          <div>
                            <label style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                              {isAr ? 'القيمة النقدية للمقدم (ج.م):' : 'Custom Cash Down Payment (EGP):'}
                            </label>
                            <div style={{ position: 'relative' }}>
                              <input
                                type="number"
                                min="0"
                                max={modalContractValue || undefined}
                                step="1000"
                                className={legacyStyles.formInput}
                                style={{ padding: '0.45rem 0.65rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--zf-gold, #d4af37)' }}
                                value={downPaymentAmountInput !== '' ? downPaymentAmountInput : (modalContractValue > 0 ? Math.round(modalContractValue * ((parseFloat(downPaymentInputPct) || 15) / 100)).toString() : '')}
                                onChange={e => handleDownPaymentAmountChange(e.target.value)}
                                placeholder={isAr ? 'اكتب المبلغ المدفوع كاش' : 'Type exact cash amount'}
                                required
                              />
                              <span style={{ position: 'absolute', [isAr ? 'left' : 'right']: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>
                                {isAr ? 'ج.م' : 'EGP'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Breakdown strip */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '0.75rem',
                          background: 'rgba(0, 0, 0, 0.35)',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          fontSize: '0.75rem'
                        }}>
                          <div>
                            <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>{isAr ? 'الدفعة المقدمة المسددة اليوم:' : 'Due Today (Down Payment):'}</span>
                            <strong style={{ color: '#f8fafc', fontSize: '0.88rem' }}>{D(modalDpAmount).formatEGP(isAr)}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>{isAr ? 'المتبقي كدفعة نهائية عند الاستلام:' : 'Final Balance at Handover:'}</span>
                            <strong style={{ color: 'var(--zf-gold, #d4af37)', fontSize: '0.88rem' }}>{D(Math.max(0, modalContractValue - modalDpAmount)).formatEGP(isAr)}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Plan Details: Installments */}
                    {paymentPlanType === 'INSTALLMENTS' && (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        padding: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--zf-gold, #d4af37)' }}>
                            {isAr ? 'تحديد الدفعة المقدمة والأقساط:' : 'Down Payment & Installments Setup:'}
                          </span>
                          {/* Preset Chips */}
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {[10, 15, 20, 25, 30, 40].map(preset => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => handleSelectPresetPct(preset)}
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  background: Math.abs(parseFloat(downPaymentInputPct) - preset) < 0.1 ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                  color: Math.abs(parseFloat(downPaymentInputPct) - preset) < 0.1 ? 'var(--zf-gold, #d4af37)' : '#94a3b8',
                                  border: Math.abs(parseFloat(downPaymentInputPct) - preset) < 0.1 ? '1px solid var(--zf-gold, #d4af37)' : '1px solid rgba(255, 255, 255, 0.08)'
                                }}
                              >
                                {preset}%
                              </button>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1.1fr', gap: '0.65rem', alignItems: 'start' }}>
                          {/* Percentage Input */}
                          <div>
                            <label style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                              {isAr ? 'نسبة المقدم (%):' : 'Down Payment %:'}
                            </label>
                            <div style={{ position: 'relative' }}>
                              <input
                                type="number"
                                min="0"
                                max="99"
                                step="0.5"
                                className={legacyStyles.formInput}
                                style={{ padding: '0.45rem 0.65rem', fontSize: '0.85rem', fontWeight: 700 }}
                                value={downPaymentInputPct}
                                onChange={e => handleDownPaymentPctChange(e.target.value)}
                                placeholder="15"
                                required
                              />
                              <span style={{ position: 'absolute', [isAr ? 'left' : 'right']: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.78rem', fontWeight: 700 }}>
                                %
                              </span>
                            </div>
                          </div>

                          {/* Cash Amount Input */}
                          <div>
                            <label style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                              {isAr ? 'قيمة المقدم كاش (ج.م):' : 'Custom Cash Down Payment:'}
                            </label>
                            <div style={{ position: 'relative' }}>
                              <input
                                type="number"
                                min="0"
                                max={modalContractValue || undefined}
                                step="1000"
                                className={legacyStyles.formInput}
                                style={{ padding: '0.45rem 0.65rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--zf-gold, #d4af37)' }}
                                value={downPaymentAmountInput !== '' ? downPaymentAmountInput : (modalContractValue > 0 ? Math.round(modalContractValue * ((parseFloat(downPaymentInputPct) || 15) / 100)).toString() : '')}
                                onChange={e => handleDownPaymentAmountChange(e.target.value)}
                                placeholder={isAr ? 'المبلغ المدفوع كاش' : 'Exact amount'}
                                required
                              />
                              <span style={{ position: 'absolute', [isAr ? 'left' : 'right']: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>
                                {isAr ? 'ج.م' : 'EGP'}
                              </span>
                            </div>
                          </div>

                          {/* Installments selector */}
                          <div>
                            <label style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                              {isAr ? 'مدة وعدد الأقساط:' : 'Quarterly Terms:'}
                            </label>
                            <select 
                              className={legacyStyles.formInput}
                              style={{ padding: '0.45rem 0.5rem', fontSize: '0.78rem' }}
                              value={numInstallments}
                              onChange={e => setNumInstallments(e.target.value)}
                            >
                              <option value="4">{isAr ? '٤ أقساط (سنة واحدة)' : '4 (1 Year)'}</option>
                              <option value="8">{isAr ? '٨ أقساط (سنتان)' : '8 (2 Years)'}</option>
                              <option value="12">{isAr ? '١٢ قسطاً (٣ سنوات)' : '12 (3 Years)'}</option>
                              <option value="16">{isAr ? '١٦ قسطاً (٤ سنوات)' : '16 (4 Years)'}</option>
                              <option value="20">{isAr ? '٢٠ قسطاً (٥ سنوات)' : '20 (5 Years)'}</option>
                              <option value="24">{isAr ? '٢٤ قسطاً (٦ سنوات)' : '24 (6 Years)'}</option>
                            </select>
                            {contractErrors.numInstallments && (
                              <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                                {contractErrors.numInstallments}
                              </span>
                            )}
                          </div>
                        </div>
                        {contractErrors.downPayment && (
                          <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                            {contractErrors.downPayment}
                          </span>
                        )}

                        {/* Financial Summary breakdown */}
                        {(() => {
                          const remaining = Math.max(0, modalContractValue - modalDpAmount);
                          const instCount = parseInt(numInstallments, 10) || 1;
                          const approxPerInst = remaining / instCount;

                          return (
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1.2fr 1.2fr',
                              gap: '0.65rem',
                              background: 'rgba(0, 0, 0, 0.35)',
                              padding: '0.6rem 0.85rem',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                              fontSize: '0.75rem'
                            }}>
                              <div>
                                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>{isAr ? 'الدفعة المقدمة اليوم:' : 'Down Payment Today:'}</span>
                                <strong style={{ color: '#f8fafc', fontSize: '0.84rem' }}>{D(modalDpAmount).formatEGP(isAr)}</strong>
                              </div>
                              <div>
                                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>{isAr ? 'إجمالي المتبقي المقسط:' : 'Total Scheduled Balance:'}</span>
                                <strong style={{ color: '#e2e8f0', fontSize: '0.84rem' }}>{D(remaining).formatEGP(isAr)}</strong>
                              </div>
                              <div>
                                <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>{isAr ? 'قيمة القسط الربع سنوي:' : 'Quarterly Installment:'}</span>
                                <strong style={{ color: 'var(--zf-gold, #d4af37)', fontSize: '0.84rem' }}>{D(approxPerInst).formatEGP(isAr)}</strong>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Step 2 Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                    <button type="button" className={legacyStyles.actionBtnGhost} onClick={() => setContractWizardStep(1)}>
                      <span>←</span>
                      <span>{isAr ? 'السابق (بيانات الوحدة والعميل)' : 'Back to Unit & Buyer'}</span>
                    </button>
                    <button 
                      type="button" 
                      className={legacyStyles.actionBtnGold}
                      onClick={() => {
                        if (validateStep2()) {
                          setContractErrors({});
                          setContractWizardStep(3);
                        }
                      }}
                    >
                      <span>{isAr ? 'المتابعة لحصص الشركاء والاعتماد' : 'Proceed to Partner Splits'}</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ─── STEP 3: PARTNERS & FINAL POSTING ─── */}
              {contractWizardStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Card 1: Partner Splits Allocation */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: 'rgba(212, 175, 55, 0.12)', color: 'var(--zf-gold, #d4af37)', fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                          01
                        </span>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                            {isAr ? 'توزيع حصص الشركاء والممولين من إيراد بيع الوحدة:' : 'Partner / Contributor Revenue Allocation:'}
                          </h4>
                          <div style={{ fontSize: '0.68rem', color: 'var(--zf-text-secondary, #a7acc0)', marginTop: '0.1rem' }}>
                            {isAr ? 'زكريا فريد هو المطور الأساسي والمالك الدائم لحصص العقار' : 'Zakaria Farid is the permanent anchor developer'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Sum Indicator & Auto-Balance Button */}
                      {(() => {
                        const currentTotal = partnerSplits.reduce((acc, p) => acc + p.sharePct, 0);
                        const isExact100 = Math.abs(currentTotal - 100) < 0.01;
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              background: isExact100 
                                ? 'rgba(212, 175, 55, 0.12)' 
                                : 'rgba(239, 68, 68, 0.15)',
                              color: isExact100 
                                ? 'var(--zf-gold, #d4af37)' 
                                : '#f87171',
                              border: isExact100 
                                ? '1px solid rgba(212, 175, 55, 0.3)' 
                                : '1px solid rgba(239, 68, 68, 0.3)'
                            }}>
                              {isExact100
                                ? (isAr ? 'إجمالي الحصص: 100%' : 'Total Shares: 100%')
                                : (isAr 
                                    ? `الإجمالي: ${currentTotal}% (يجب أن يساوي 100%)` 
                                    : `Total: ${currentTotal}% (Must = 100%)`
                                  )
                              }
                            </span>
                            {!isExact100 && (
                              <button
                                type="button"
                                onClick={() => setPartnerSplits(autoBalanceShares(partnerSplits))}
                                style={{
                                  background: 'rgba(212, 175, 55, 0.15)',
                                  color: 'var(--zf-gold, #d4af37)',
                                  border: '1px solid rgba(212, 175, 55, 0.4)',
                                  borderRadius: '6px',
                                  padding: '0.2rem 0.55rem',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {isAr ? 'موازنة الحصص تلقائياً (100%)' : 'Auto Balance 100%'}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Partner Rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {partnerSplits.map((partner, idx) => {
                        const isZakaria = partner.partnerName === PRIMARY_DEVELOPER_NAME || partner.isPermanent;
                        const shareDecimal = (parseFloat(partner.sharePct.toString()) || 0) / 100;
                        const partnerTotalAmount = modalContractValue * shareDecimal;
                        const partnerCashAmount = modalDpAmount * shareDecimal;

                        return (
                          <div key={idx} style={{
                            display: 'grid',
                            gridTemplateColumns: '1.4fr 0.8fr 1.3fr 1.3fr auto',
                            gap: '0.5rem',
                            alignItems: 'center',
                            background: isZakaria ? 'rgba(212, 175, 55, 0.04)' : 'rgba(0, 0, 0, 0.3)',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '8px',
                            border: isZakaria ? '1px solid rgba(212, 175, 55, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)'
                          }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isZakaria ? 'var(--zf-gold, #d4af37)' : '#f8fafc' }}>
                                  {partner.partnerName}
                                </span>
                                {isZakaria && (
                                  <span style={{
                                    background: 'rgba(212, 175, 55, 0.12)',
                                    color: 'var(--zf-gold, #d4af37)',
                                    border: '1px solid rgba(212, 175, 55, 0.25)',
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: '4px',
                                    fontSize: '0.62rem',
                                    fontWeight: 700
                                  }}>
                                    {isAr ? 'المطور الأساسي' : 'Primary Developer'}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              <label style={{ fontSize: '0.65rem', color: '#9ca3af', display: 'block' }}>{isAr ? 'الحصة %:' : 'Share %:'}</label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                step="1"
                                className={legacyStyles.formInput}
                                style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem', fontWeight: 800, textAlign: 'center' }}
                                value={partner.sharePct}
                                onChange={e => {
                                  const next = [...partnerSplits];
                                  next[idx].sharePct = parseFloat(e.target.value) || 0;
                                  setPartnerSplits(next);
                                }}
                                required
                              />
                            </div>

                            <div style={{ textAlign: isAr ? 'right' : 'left' }}>
                              <span style={{ fontSize: '0.65rem', color: '#9ca3af', display: 'block' }}>{isAr ? 'إجمالي نصيبه بالعقد:' : 'Total Contract Share:'}</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--zf-gold, #d4af37)' }}>
                                {D(partnerTotalAmount).formatEGP(isAr)}
                              </span>
                            </div>

                            <div style={{ textAlign: isAr ? 'right' : 'left' }}>
                              <span style={{ fontSize: '0.65rem', color: '#9ca3af', display: 'block' }}>{isAr ? 'نصيبه من الكاش الآن:' : 'Current Cash Share:'}</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f8fafc' }}>
                                {D(partnerCashAmount).formatEGP(isAr)}
                              </span>
                            </div>

                            <div>
                              {!isZakaria ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = smartRemovePartner(partnerSplits, idx);
                                    setPartnerSplits(updated);
                                  }}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.35rem 0.5rem',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    alignSelf: 'center',
                                    marginTop: '0.8rem'
                                  }}
                                  title={isAr ? 'حذف الشريك وإعادة حصته لزكريا فريد' : 'Remove partner and absorb share'}
                                >
                                  ✕
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.7rem', color: '#64748b', alignSelf: 'center', marginTop: '0.8rem' }}>—</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Partner Bar from Directory */}
                    {(() => {
                      const availablePartners = unifiedPartners.filter(
                        p => !partnerSplits.some(cp => cp.partnerName.toLowerCase() === p.name.toLowerCase())
                      );

                      return (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: selectedPartnerToAdd === '__custom__' ? '1fr 1fr auto' : '2fr auto',
                          gap: '0.5rem',
                          alignItems: 'center',
                          marginTop: '0.25rem',
                          padding: '0.45rem',
                          background: 'rgba(255, 255, 255, 0.015)',
                          border: '1px dashed rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px'
                        }}>
                          <select
                            style={{
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '6px',
                              padding: '0.35rem 0.5rem',
                              color: '#ffffff',
                              fontSize: '0.75rem',
                              colorScheme: 'dark'
                            }}
                            value={selectedPartnerToAdd}
                            onChange={e => setSelectedPartnerToAdd(e.target.value)}
                          >
                            <option value="">{isAr ? '-- إضافة شريك من دليل الشركاء المسجلين --' : '-- Choose registered partner --'}</option>
                            {availablePartners.map(ap => (
                              <option key={ap.name} value={ap.name}>
                                {ap.name} ({ap.role})
                              </option>
                            ))}
                            <option value="__custom__">{isAr ? '+ إدخال اسم شريك جديد يدوياً...' : '+ Type new custom partner...'}</option>
                          </select>

                          {selectedPartnerToAdd === '__custom__' && (
                            <input
                              type="text"
                              placeholder={isAr ? 'اسم الشريك الجديد' : 'New partner name'}
                              value={customPartnerNameInput}
                              onChange={e => setCustomPartnerNameInput(e.target.value)}
                              style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '6px',
                                padding: '0.35rem 0.5rem',
                                color: '#ffffff',
                                fontSize: '0.75rem'
                              }}
                            />
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const nameToAdd = selectedPartnerToAdd === '__custom__' ? customPartnerNameInput.trim() : selectedPartnerToAdd;
                              if (!nameToAdd) return;
                              const updated = smartAddPartner(partnerSplits, nameToAdd, 25);
                              setPartnerSplits(updated);
                              setSelectedPartnerToAdd('');
                              setCustomPartnerNameInput('');
                            }}
                            disabled={!selectedPartnerToAdd || (selectedPartnerToAdd === '__custom__' && !customPartnerNameInput.trim())}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: 'rgba(212, 175, 55, 0.15)',
                              color: 'var(--zf-gold, #d4af37)',
                              border: '1px solid rgba(212, 175, 55, 0.3)',
                              cursor: 'pointer',
                              opacity: (!selectedPartnerToAdd || (selectedPartnerToAdd === '__custom__' && !customPartnerNameInput.trim())) ? 0.5 : 1
                            }}
                          >
                            {isAr ? 'إضافة الشريك' : 'Add Partner'}
                          </button>
                        </div>
                      );
                    })()}
                    {contractErrors.splits && (
                      <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                        {contractErrors.splits}
                      </span>
                    )}
                  </div>

                  {/* Card 2: Cash Routing Selection */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ background: 'rgba(212, 175, 55, 0.12)', color: 'var(--zf-gold, #d4af37)', fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                        02
                      </span>
                      <label className={legacyStyles.formLabel} style={{ fontWeight: 700, color: '#ffffff' }}>
                        {isAr ? 'حساب استلام النقدية المحصلة باليد:' : 'Hand Cash Collection Account:'}
                      </label>
                      <OpenQuestionFlag 
                        questionId="Q3" 
                        summary="Cash receipt routing (101000 Safe vs 102000 Bank) is configured for hand collection." 
                        onNavigate={handleNavigateToOpenQuestion}
                        isAr={isAr}
                      />
                    </div>
                    <div style={{
                      padding: '0.65rem 0.85rem',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#6ee7b7',
                      fontSize: '0.82rem',
                      fontWeight: 700
                    }}>
                      <Wallet size={16} />
                      <span>{isAr ? '[١٠١٠٠٠] الخزينة الرئيسية (استلام وتوريد نقدي باليد - بدون أي ربط بنكي)' : '[101000] Main Safe (Direct Cash on Hand - No Bank Link)'}</span>
                    </div>
                  </div>

                  {/* Card 3: Executive Deal Summary Strip */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(18, 22, 34, 0.7) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '12px',
                    padding: '0.85rem 1.15rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '0.75rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>{isAr ? 'الوحدة والمشتري:' : 'Unit & Buyer:'}</span>
                      <strong style={{ fontSize: '0.84rem', color: '#ffffff' }}>{buyerName || '—'}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--zf-gold, #d4af37)', marginTop: '0.1rem' }}>
                        {selectedPropertyId === 'custom_unit' ? customUnitName : (data.properties.find(p => p.id === selectedPropertyId)?.title_ar || '—')}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>{isAr ? 'إجمالي قيمة العقد:' : 'Contract Value:'}</span>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--zf-gold, #d4af37)' }}>{D(modalContractValue).formatEGP(isAr)}</strong>
                      <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '0.1rem' }}>
                        {paymentPlanType === 'FULL_CASH' ? (isAr ? 'كاش فوري 100%' : 'Full Cash') : (isAr ? `مقدم: ${D(modalDpAmount).formatEGP(isAr)}` : `DP: ${D(modalDpAmount).formatEGP(isAr)}`)}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>{isAr ? 'تاريخ التوقيع والحساب:' : 'Date & Routing:'}</span>
                      <strong style={{ fontSize: '0.84rem', color: '#ffffff' }}>{firstPaymentDate}</strong>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                        {isAr ? 'الخزينة [101000]' : 'Safe [101000]'}
                      </div>
                    </div>
                  </div>

                  {/* Step 3 Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                    <button type="button" className={legacyStyles.actionBtnGhost} onClick={() => setContractWizardStep(2)}>
                      <span>←</span>
                      <span>{isAr ? 'السابق (الشروط المالية)' : 'Back to Payment Terms'}</span>
                    </button>
                    <button type="submit" className={legacyStyles.actionBtnGold} disabled={isMutating}>
                      {isMutating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                      <span>{isAr ? 'اعتماد وحفظ العقد بقاعدة البيانات' : 'Approve & Save Real Contract'}</span>
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

      {/* RESCISSION WIZARD WITH MANDATORY PRECONDITION STEP 0 */}
      {showRescissionModal && (
        <div className={legacyStyles.modalOverlay} onClick={() => setShowRescissionModal(null)}>
          <div className={legacyStyles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 className={legacyStyles.modalTitle}>
              {isAr ? 'معالج فسخ العقد وتطبيق الحد الأدنى للاسترداد (Forfeiture Floor)' : 'Contract Rescission Wizard'}
            </h3>

            {rescissionStep === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <BranchDecisionCard 
                  contract={showRescissionModal}
                  selectedBranch={selectedBranch}
                  onSelectBranch={setSelectedBranch}
                  isAr={isAr}
                />

                <div className={legacyStyles.formGroup}>
                  <label className={legacyStyles.formLabel}>
                    {isAr ? 'تاريخ طلب الفسخ المعتمد:' : 'Effective Rescission Date:'}
                  </label>
                  <input 
                    type="date"
                    className={legacyStyles.formInput}
                    value={rescissionDate}
                    onChange={e => setRescissionDate(e.target.value)}
                  />
                </div>

                <div className={legacyStyles.modalFooter}>
                  <button className={legacyStyles.actionBtnGhost} onClick={() => setShowRescissionModal(null)}>
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button className={legacyStyles.actionBtnGold} onClick={() => setRescissionStep(1)}>
                    <span>{isAr ? 'متابعة للخطوة ١: حساب الغرامة' : 'Proceed to Step 1: Computations'}</span>
                  </button>
                </div>
              </div>
            )}

            {rescissionStep === 1 && (() => {
              const contract = showRescissionModal;
              const contractSchedules = data.schedules.filter(s => s.contract_id === contract.contract_id);
              const computed = RescissionEngine.processRescission(
                contract,
                contractSchedules,
                activePeriod,
                rescissionDate,
                D(contract.gross_contract_value).times('0.45').toFixed(),
                '501000',
                '151000',
                'CFO_FARID'
              );
              const preview = {
                grossContractValue: computed.rescissionRecord.gross_contract_value,
                totalCashCollected: computed.rescissionRecord.total_cash_collected,
                penaltyRetained: computed.rescissionRecord.penalty_retained,
                netRefundLiability: computed.rescissionRecord.net_refund_liability,
                journalEntry: computed.journalEntry
              };

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <span style={{ color: 'var(--zf-text-muted, #6b7086)' }}>{isAr ? 'قيمة العقد (V):' : 'Gross (V):'} </span>
                        <strong>{D(preview.grossContractValue).formatEGP(isAr)}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--zf-text-muted, #6b7086)' }}>{isAr ? 'المحصل نقداً (C):' : 'Collected (C):'} </span>
                        <strong>{D(preview.totalCashCollected).formatEGP(isAr)}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--zf-text-muted, #6b7086)' }}>{isAr ? 'الغرامة المحتجزة:' : 'Penalty Retained:'} </span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <strong style={{ color: 'var(--zf-gold, #d4af37)' }}>{D(preview.penaltyRetained).formatEGP(isAr)}</strong>
                          <LegalVerificationTag label={isAr ? 'غرامة ١٠٪' : '10%'} isAr={isAr} />
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--zf-text-muted, #6b7086)' }}>{isAr ? 'صافي رد العميل (206200):' : 'Net Refund (206200):'} </span>
                        <strong style={{ color: 'var(--zf-state-paid, #6fcf97)' }}>{D(preview.netRefundLiability).formatEGP(isAr)}</strong>
                      </div>
                    </div>
                  </div>

                  <JournalEntryPreview entry={preview.journalEntry} isDraft={true} isAr={isAr} />

                  <div className={legacyStyles.modalFooter}>
                    <button className={legacyStyles.actionBtnGhost} onClick={() => setRescissionStep(0)}>
                      {isAr ? 'رجوع للخطوة ٠' : 'Back to Step 0'}
                    </button>
                    <button 
                      className={legacyStyles.actionBtnGold} 
                      style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#ffffff' }}
                      onClick={handleExecuteRescission} 
                      disabled={isMutating}
                    >
                      {isMutating ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                      <span>{isAr ? 'تأكيد الفسخ وترحيل القيد بالدفاتر' : 'Confirm & Post Rescission Entry'}</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ESCALATION MODAL */}
      {showEscalationModal && (
        <div className={legacyStyles.modalOverlay} onClick={() => setShowEscalationModal(null)}>
          <div className={legacyStyles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 className={legacyStyles.modalTitle}>
              {isAr ? 'تصعيد قيمة العقد (تعديل Delta V - الإصدار الثاني)' : 'Escalate Contract Value (Append-Only v2)'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--zf-text-secondary, #a7acc0)' }}>
              {showEscalationModal.contract_number} — {showEscalationModal.unit_id}
            </p>

            <div className={legacyStyles.formGroup}>
              <label className={legacyStyles.formLabel}>{isAr ? 'قيمة زيادة العقد (Delta V بالجنيه):' : 'Escalation Amount (Delta V in EGP):'}</label>
              <input 
                type="text" 
                className={legacyStyles.formInput} 
                value={escalationDelta} 
                onChange={e => setEscalationDelta(e.target.value)} 
              />
            </div>

            <div className={legacyStyles.formGroup}>
              <label className={legacyStyles.formLabel}>{isAr ? 'مبرر التعديل الهندسي / السعري:' : 'Engineering / Material Rationale:'}</label>
              <input 
                type="text" 
                className={legacyStyles.formInput} 
                value={escalationReason} 
                onChange={e => setEscalationReason(e.target.value)} 
              />
            </div>

            <div className={legacyStyles.modalFooter}>
              <button className={legacyStyles.actionBtnGhost} onClick={() => setShowEscalationModal(null)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button className={legacyStyles.actionBtnGold} onClick={handleExecuteEscalation} disabled={isMutating}>
                {isMutating ? <Loader2 size={15} className="animate-spin" /> : <TrendingUp size={15} />}
                <span>{isAr ? 'تطبيق وإدراج بالدفاتر' : 'Commit & Save v2'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showPayModal && (
        <div className={legacyStyles.modalOverlay} onClick={() => setShowPayModal(null)}>
          <div className={legacyStyles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 className={legacyStyles.modalTitle}>
              {isAr ? 'إثبات تحصيل القسط باليد (تم التحصيل)' : 'Record Hand Collection (Mark as Collected)'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--zf-text-secondary, #a7acc0)' }}>
              {showPayModal.contract.contract_number} — {isAr ? `قسط #${showPayModal.schedule.tranche_number}` : `Tranche #${showPayModal.schedule.tranche_number}`} ({D(showPayModal.schedule.nominal_value).formatEGP(isAr)})
            </p>

            <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', fontWeight: 800 }}>
                <CheckCircle2 size={16} />
                <span>{isAr ? 'التحصيل يدوي واستلام باليد (بدون ربط بنكي)' : 'Manual Hand Collection (No Bank Link)'}</span>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--zf-state-paid, #6fcf97)', marginTop: '0.35rem' }}>
                {isAr ? 'حساب الإيداع: الخزينة الرئيسية [١٠١٠٠٠]' : 'Receiving Account: Main Safe [101000]'}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                {showPayModal.contract.handover_status === 'Delivered' 
                  ? (isAr ? 'مدين: ١٠١٠٠٠ (الخزينة الرئيسية - استلام باليد) / دائن: ١٠٣٠٠٠ (مدينو عقود العملاء)' : 'Dr 101000 (Safe) / Cr 103000 (Accounts Receivable)') 
                  : (isAr ? 'مدين: ١٠١٠٠٠ (الخزينة الرئيسية - استلام باليد) / دائن: ٢٠٣٠٠٠ (إيرادات تعاقدية مؤجلة)' : 'Dr 101000 (Safe) / Cr 203000 (Deferred Contract Revenue)')}
              </div>
            </div>

            <div className={legacyStyles.modalFooter}>
              <button className={legacyStyles.actionBtnGhost} onClick={() => setShowPayModal(null)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button className={legacyStyles.actionBtnGold} onClick={handleCollectPayment} disabled={isMutating}>
                {isMutating ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                <span>{isAr ? 'تأكيد الاستلام باليد (تم التحصيل)' : 'Confirm Hand Collection (Mark Collected)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RSV ALLOCATION MODAL */}
      {showRSVModal && (
        <div className={legacyStyles.modalOverlay} onClick={() => setShowRSVModal(false)}>
          <div 
            className={legacyStyles.modalContent} 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '560px',
              background: 'linear-gradient(150deg, rgba(17, 23, 38, 0.98) 0%, rgba(10, 14, 24, 0.99) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '18px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(212, 175, 55, 0.1)'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(212, 175, 55, 0.15)',
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--zf-gold, #d4af37)',
                  flexShrink: 0
                }}>
                  <Calculator size={20} />
                </div>
                <div>
                  <h3 className={legacyStyles.modalTitle} style={{ margin: 0, fontSize: '1.15rem' }}>
                    {isAr ? 'حساب وتحديث معامل رسملة الأعمال (RSV Calculator)' : 'Calculate New RSV Allocation Factor'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--zf-text-muted, #94a3b8)', marginTop: '0.2rem' }}>
                    {isAr 
                      ? 'احتساب نسبة تكاليف الإنشاء المتكبدة (WIP حساب ١٠٥٠٠٠) لسقف المبيعات المقدر لتحديد تكلفة البضاعة المباعة (COGS حساب ٥٠١٠٠٠) طبقاً لمعيار IFRS 15.' 
                      : 'Calculates Relative Sales Value (RSV) factor to relieve WIP into COGS upon physical handover.'}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateRSVAllocation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.75rem' }}>
              {/* Quick Portfolio Property Selector */}
              <div className={legacyStyles.formGroup} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <label className={legacyStyles.formLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#e2e8f0', marginBottom: '0.35rem' }}>
                  <Building size={14} color="var(--zf-gold, #d4af37)" />
                  <span>{isAr ? 'اختر من مشروعات وعقارات المنظومة الحالية (اختياري):' : 'Select From Portfolio Properties (Optional Auto-fill):'}</span>
                </label>
                <select
                  className={legacyStyles.formInput}
                  value={rsvSelectedPropertyId}
                  onChange={e => {
                    const propId = e.target.value;
                    setRsvSelectedPropertyId(propId);
                    if (propId) {
                      const prop = data.properties.find(p => p.id === propId);
                      if (prop) {
                        const pTitle = isAr ? (prop.title_ar || prop.title_en) : (prop.title_en || prop.title_ar);
                        setRsvProjectName(pTitle);
                        const salesVal = (prop.price_egp || 100000000).toString();
                        setRsvSalesValue(salesVal);
                        // Standard 45% WIP suggestion
                        const suggestedWip = Math.round((prop.price_egp || 100000000) * 0.45).toString();
                        setRsvWipAmount(suggestedWip);
                      }
                    }
                  }}
                  style={{ background: 'rgba(0, 0, 0, 0.4)', color: '#ffffff', cursor: 'pointer' }}
                >
                  <option value="">{isAr ? '-- اختر عقار لملء القيم تلقائياً أو أدخل يدوياً بالأسفل --' : '-- Select property to auto-fill or enter manually below --'}</option>
                  {data.properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar)} ({D(p.price_egp || 0).formatEGP(isAr)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Name Field */}
              <div className={legacyStyles.formGroup}>
                <label className={legacyStyles.formLabel}>
                  {isAr ? 'اسم المشروع / المرحلة الإنشائية:' : 'Project Name / Construction Phase:'}
                </label>
                <input 
                  type="text" 
                  className={legacyStyles.formInput} 
                  value={rsvProjectName}
                  onChange={e => setRsvProjectName(e.target.value)}
                  placeholder={isAr ? 'مثال: مشروع بالاشيال فيلاز & نايل هورايزونز' : 'e.g. Palatial Villas & Nile Horizons'}
                  required
                />
              </div>

              {/* Sales Ceiling Field */}
              <div className={legacyStyles.formGroup}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className={legacyStyles.formLabel} style={{ margin: 0 }}>
                    {isAr ? 'سقف المبيعات المقدر لكامل المشروع (Sales Value بالجنيه):' : 'Projected Total Sales Value Ceiling (EGP):'}
                  </label>
                  <span style={{ fontSize: '0.74rem', color: '#60a5fa', fontWeight: 800, fontFamily: 'monospace' }}>
                    {D(rsvSalesValue || 0).formatEGP(isAr)}
                  </span>
                </div>
                <input 
                  type="number"
                  step="100000"
                  className={legacyStyles.formInput} 
                  value={rsvSalesValue}
                  onChange={e => setRsvSalesValue(e.target.value)}
                  placeholder="100000000"
                  required
                />
              </div>

              {/* Incurred WIP Field */}
              <div className={legacyStyles.formGroup}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className={legacyStyles.formLabel} style={{ margin: 0 }}>
                    {isAr ? 'إجمالي تكاليف الإنشاء المتكبدة بالدفاتر (WIP بالجنيه):' : 'Incurred Construction WIP (EGP):'}
                  </label>
                  <span style={{ fontSize: '0.74rem', color: 'var(--zf-gold, #d4af37)', fontWeight: 800, fontFamily: 'monospace' }}>
                    {D(rsvWipAmount || 0).formatEGP(isAr)}
                  </span>
                </div>
                <input 
                  type="number"
                  step="100000"
                  className={legacyStyles.formInput} 
                  value={rsvWipAmount}
                  onChange={e => setRsvWipAmount(e.target.value)}
                  placeholder="45000000"
                  required
                />

                {/* Quick Presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{isAr ? 'نسب تقديرية سريعة:' : 'Quick Presets:'}</span>
                  {[
                    { pct: 0.35, labelAr: '٣٥٪ تشطيب', labelEn: '35% Finishing' },
                    { pct: 0.45, labelAr: '٤٥٪ قياسي', labelEn: '45% Standard' },
                    { pct: 0.55, labelAr: '٥٥٪ إنشاء شامل', labelEn: '55% Full Structure' }
                  ].map(preset => (
                    <button
                      key={preset.pct}
                      type="button"
                      onClick={() => {
                        const sales = parseFloat(rsvSalesValue) || 100000000;
                        setRsvWipAmount(Math.round(sales * preset.pct).toString());
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '6px',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.68rem',
                        color: '#e2e8f0',
                        cursor: 'pointer'
                      }}
                    >
                      {isAr ? preset.labelAr : preset.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Live Formula & Calculation Result Card */}
              {(() => {
                const wip = parseFloat(rsvWipAmount) || 0;
                const sales = parseFloat(rsvSalesValue) || 0;
                const factor = sales > 0 ? (wip / sales) : 0;
                const factorPct = (factor * 100).toFixed(2);
                const grossMarginPct = sales > 0 ? (100 - factor * 100).toFixed(2) : '0.00';

                return (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(20, 26, 42, 0.95) 0%, rgba(12, 16, 28, 0.98) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    {/* Formula Display */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem',
                      color: '#94a3b8',
                      background: 'rgba(0,0,0,0.35)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      fontFamily: 'monospace'
                    }}>
                      <span>{isAr ? 'معادلة الاحتساب:' : 'Formula:'}</span>
                      <span style={{ color: '#e2e8f0' }}>
                        RSV = WIP ({D(wip).formatEGP(isAr)}) ÷ Sales ({D(sales).formatEGP(isAr)})
                      </span>
                    </div>

                    {/* Factor & Margin Highlights */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.75rem'
                    }}>
                      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', fontWeight: 700 }}>
                          {isAr ? 'معامل الرسملة (RSV Factor):' : 'Calculated RSV Factor:'}
                        </span>
                        <strong style={{ fontSize: '1.35rem', color: 'var(--zf-gold, #d4af37)', fontFamily: 'monospace', display: 'block', marginTop: '0.15rem' }}>
                          {factor.toFixed(4)}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700 }}>
                          ({factorPct}% {isAr ? 'نسبة تكلفة الإنشاء' : 'cost ratio'})
                        </span>
                      </div>

                      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', textAlign: isAr ? 'left' : 'right' }}>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', fontWeight: 700 }}>
                          {isAr ? 'هامش الربح الإجمالي المقدر:' : 'Projected Gross Margin:'}
                        </span>
                        <strong style={{ fontSize: '1.35rem', color: '#10b981', fontFamily: 'monospace', display: 'block', marginTop: '0.15rem' }}>
                          {grossMarginPct}%
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: '#6ee7b7', fontWeight: 700 }}>
                          ({isAr ? 'عائد التعاقد' : 'profit margin'})
                        </span>
                      </div>
                    </div>

                    {/* Progress Gauge */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${Math.min(parseFloat(factorPct) || 0, 100)}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', height: '100%' }} />
                        <div style={{ flex: 1, background: 'linear-gradient(90deg, #10b981, #34d399)', height: '100%' }} />
                      </div>
                    </div>

                    {/* Practical Accounting Explanation */}
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.45, borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.5rem' }}>
                      {isAr 
                        ? `أثر المعامل في الدفاتر: عند تسليم أي وحدة بقيمة 5,000,000 ج.م، سيتم تلقائياً ترحيل ${(5000000 * factor).toLocaleString()} ج.م من حساب (WIP 105000) إلى حساب (COGS 501000) والاعتراف بإيراد المبيعات طبقاً لمعيار IFRS 15.`
                        : `Ledger Impact: Upon delivery of a 5,000,000 EGP unit, ${(5000000 * factor).toLocaleString()} EGP will be relieved from WIP (105000) into COGS (501000) per IFRS 15.`}
                    </div>
                  </div>
                );
              })()}

              <div className={legacyStyles.modalFooter} style={{ marginTop: '0.5rem' }}>
                <button type="button" className={legacyStyles.actionBtnGhost} onClick={() => setShowRSVModal(false)}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className={legacyStyles.actionBtnGold} disabled={isMutating}>
                  {isMutating ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
                  <span>{isAr ? 'حساب واعتماد معامل الرسملة' : 'Commit & Save Allocation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD NEW INSTALLMENT DUE MODAL */}
      <NewChequeModal 
        isOpen={showNewPDCModal}
        onClose={() => setShowNewPDCModal(false)}
        contracts={data.contracts}
        schedules={data.schedules}
        onSaveCheque={handleSaveNewCheque}
        isMutating={isMutating}
        isAr={isAr}
      />

      {/* HAND CASH COLLECTION PROCESS MODAL */}
      <HandCollectionModal 
        isOpen={!!collectingPDCItem}
        onClose={() => setCollectingPDCItem(null)}
        item={collectingPDCItem}
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
          allCosts={data.propertyCosts}
          isAr={isAr}
          onClose={() => setAuditModalProperty(null)}
          onAddCostItem={handleAddPropertyCostItem}
          onDeleteCostItem={handleDeletePropertyCostItem}
          onOpenCalculatorForProperty={(propId) => {
            setAuditModalProperty(null);
            setCalculatorPropertyId(propId);
            setActiveTab('calculator');
          }}
        />
      )}
    </div>
  );
}
