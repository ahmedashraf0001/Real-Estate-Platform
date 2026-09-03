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
import { GeneralLedgerView } from './v2/views/GeneralLedgerView';
import { ContractRescissionsView } from './v2/views/ContractRescissionsView';
import { CostAllocationView } from './v2/views/CostAllocationView';
import { ApartmentTaxesView } from './v2/views/ApartmentTaxesView';
import { NewContractWizardModal } from './v2/modals/NewContractWizardModal';
import { CashCollectionReceiptModal } from './v2/modals/CashCollectionReceiptModal';
import { ContractEscalationModal } from './v2/modals/ContractEscalationModal';
import { RescissionSettlementModal } from './v2/modals/RescissionSettlementModal';
import { RSVAllocationModal } from './v2/modals/RSVAllocationModal';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';

// FIN-OS Subprogram Workstation Shell Components
import { ZFCommandBar } from './ZFCommandBar';
import { ZFNavigationDock, ERPNavModule } from './ZFNavigationDock';
import { ZFWorkstationHeader } from './v2/ZFWorkstationHeader';
import { ZFNavigationDockV2 } from './v2/ZFNavigationDockV2';
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
    'operations' | 'dashboard' | 'properties' | 'calculator' | 'ledger' | 'contracts' | 'pdc' | 'rescissions' | 'cost-allocation' | 'tax'
  >('operations');

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

  // Handler: 10-Second Direct Cash Expense from Daily Operations Desk
  const handleDirectExpenseSubmit = async (amount: string, categoryAccount: string, memo: string) => {
    setIsMutating(true);
    try {
      const amtStr = D(amount).toFixed(2);
      const entryNumber = `JE-EXP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
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
            account_code: '101000', // Main Safe / Cash on Hand
            debit_amount: '0.00',
            credit_amount: amtStr,
            memo: `Disbursed from Treasury Safe for: ${memo}`
          }
        ]
      });

      await ERPSupabaseService.persistJournalEntry(supabase, entry);
      await loadLiveData(true);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsMutating(false);
    }
  };

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
      <div className={subStyles.workstationBody}>
        {/* Left Subprogram Navigation Dock (v2) */}
        <ZFNavigationDockV2 
          activeModule={activeTab === 'dashboard' ? 'cockpit' : (activeTab as ERPNavModule)}
          onSelectModule={(mod) => setActiveTab(mod === 'cockpit' ? 'dashboard' : mod)}
          contractsCount={data.contracts.length}
          pdcSafeCount={data.pdcRecords.filter(p => p.status === 'In Safe').length}
          propertiesCount={data.properties.length}
          isAr={isAr}
        />

        {/* Main Workstation Stage */}
        <main className={subStyles.workspaceStage} ref={stageRef}>
          <div className={subStyles.stageContainer}>
            {/* Proactive Period Lock Banner (Invariant 0.9) */}
            <LockedPeriodBanner period={activePeriod} isAr={isAr} />

          {/* MODULE 0: DAILY OPERATIONS DESK (v2 Flagship) */}
          {(activeTab === 'operations' || (activeTab as string) === 'operations') && (
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
              isMutating={isMutating}
              onOpenQuickTransaction={() => setShowQuickTransactionModal(true)}
              onOpenNewContract={() => setShowNewContractModal(true)}
              onOpenNewCheque={() => setShowNewPDCModal(true)}
              onCollectItem={setCollectingPDCItem}
              onInspectContract={handleInspectContract}
              onOpenContractForProperty={handleOpenContractForProperty}
              onDirectExpenseSubmit={handleDirectExpenseSubmit}
              onNavigateToTab={(tab) => setActiveTab(tab === 'cockpit' ? 'dashboard' : tab)}
            />
          )}

          {/* MODULE 0: FINANCIAL COCKPIT (v2) */}
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
              onOpenNewCheque={() => setShowNewPDCModal(true)}
              onOpenNewContract={() => setShowNewContractModal(true)}
            />
          )}

          {/* MODULE: PROPERTY PORTFOLIO FINANCIAL STATUS (v2) */}
          {activeTab === 'properties' && (
            <PropertiesPortfolioView
              properties={data.properties}
              contracts={data.contracts}
              propertyCosts={data.propertyCosts}
              onOpenNewContract={() => setShowNewContractModal(true)}
              onOpenContractForProperty={handleOpenContractForProperty}
              onOpenCalculatorForProperty={handleOpenCalculatorForProperty}
              onOpenAuditForProperty={handleOpenAuditForProperty}
              onUpdatePropertyUnitTax={handleUpdatePropertyUnitTax}
              isAr={isAr}
              isMutating={isMutating}
            />
          )}

          {/* MODULE: CONSTRUCTION COST & FEASIBILITY CALCULATOR (v2) */}
          {activeTab === 'calculator' && (
            <ConstructionFeasibilityView
              properties={data.properties}
              propertyCosts={data.propertyCosts}
              initialPropertyId={calculatorPropertyId}
              onOpenAuditForProperty={handleOpenAuditForProperty}
              onUpdateSellingPrice={handleUpdatePropertySellingPrice}
              isAr={isAr}
            />
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

          {/* MODULE 3: CONTRACTS & RECEIVABLES (v2) */}
          {activeTab === 'contracts' && (
            <ContractsRegistryView
              contracts={data.contracts}
              schedules={data.schedules}
              isAr={isAr}
              onInspectContract={handleInspectContract}
              onNavigateToProperties={() => setActiveTab('properties')}
              onOpenNewContract={() => setShowNewContractModal(true)}
            />
          )}

          {/* MODULE 4: HAND INSTALLMENTS & CASH DUES VAULT (v2) */}
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

          {/* MODULE 5: RESCISSIONS & REPOSSESSIONS (v2) */}
          {activeTab === 'rescissions' && (
            <ContractRescissionsView
              rescissions={data.rescissions}
              contracts={data.contracts}
              isAr={isAr}
              onInspectRescission={handleInspectRescission}
              onNavigateToContracts={() => setActiveTab('contracts')}
            />
          )}

          {/* MODULE 6: COST ALLOCATION & RSV (v2) */}
          {activeTab === 'cost-allocation' && (
            <CostAllocationView
              costAllocations={data.costAllocations}
              isAr={isAr}
              onOpenNewAllocation={() => setShowRSVModal(true)}
              onInspectRSV={handleInspectRSV}
            />
          )}

          {/* MODULE 7: APARTMENT TAXES & FEES LEDGER (v2) */}
          {(activeTab as any) === 'tax' && (
            <ApartmentTaxesView
              taxRecords={data.taxRecords}
              contracts={data.contracts}
              isAr={isAr}
              isMutating={isMutating}
              onRemitTax={handleRemitTax}
              onInspectTax={handleInspectTax}
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

      {/* 5. DEDICATED TRANSACTION & ACTION WORKFLOW MODALS (V2 ARCHITECTURAL ALABASTER) */}
      <NewContractWizardModal 
        isOpen={showNewContractModal}
        onClose={() => { setShowNewContractModal(false); setContractWizardStep(1); }}
        properties={data.properties}
        contracts={data.contracts}
        leads={data.leads}
        activePeriod={activePeriod}
        unifiedPartners={unifiedPartners}
        isMutating={isMutating}
        isAr={isAr}
        onContractCreated={async (payload) => {
          setSelectedPropertyId(payload.propertyId);
          setSelectedBuildingUnitId(payload.buildingUnitId || '');
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
        onConfirmCollection={async () => {
          await handleCollectPayment();
          setShowPayModal(null);
        }}
      />

      {/* ESCALATION MODAL */}
      <ContractEscalationModal 
        isOpen={!!showEscalationModal}
        onClose={() => setShowEscalationModal(null)}
        contract={showEscalationModal}
        isAr={isAr}
        isMutating={isMutating}
        onConfirmEscalation={async (delta, reason) => {
          setEscalationDelta(delta);
          setEscalationReason(reason);
          await handleExecuteEscalation();
          setShowEscalationModal(null);
        }}
      />

      {/* RESCISSION MODAL */}
      <RescissionSettlementModal 
        isOpen={!!showRescissionModal}
        onClose={() => setShowRescissionModal(null)}
        contract={showRescissionModal}
        schedules={data.schedules}
        activePeriod={activePeriod}
        isAr={isAr}
        isMutating={isMutating}
        onConfirmRescission={async ({ selectedBranch, rescissionDate: rDate }) => {
          setSelectedBranch(selectedBranch);
          setRescissionDate(rDate);
          await handleExecuteRescission();
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
