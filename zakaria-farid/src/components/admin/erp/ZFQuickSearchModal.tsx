'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Search, 
  X, 
  FileText, 
  Landmark, 
  Wallet, 
  Building2, 
  Users, 
  UserCheck, 
  Sliders, 
  Plus, 
  Sun, 
  Moon, 
  EyeOff, 
  ExternalLink, 
  TrendingUp, 
  LayoutDashboard, 
  Calculator, 
  ShieldAlert, 
  ArrowRight,
  ArrowLeft,
  Compass,
  RotateCcw,
  PieChart,
  Layers,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { ERPContract, ERPPDCRecord, ERPPartnerProfile, ERPRescissionRecord, ERPTaxRecord } from '@/lib/erp/types';
import { Property, Lead } from '@/lib/supabase/types';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import { getStoredPlatformSettings, saveStoredPlatformSettings } from '@/lib/services/marketIntelligence';
import { createClient } from '@/lib/supabase/client';
import { FALLBACK_PROPERTIES } from '@/lib/data/fallbackProperties';

export type SearchCategoryKey = 
  | 'all' 
  | 'properties' 
  | 'leads' 
  | 'contracts' 
  | 'finance' 
  | 'rescissions' 
  | 'partners' 
  | 'actions';

export interface ZFQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  contracts?: ERPContract[];
  cheques?: ERPPDCRecord[];
  properties?: Property[];
  leads?: Lead[];
  partners?: ERPPartnerProfile[];
  rescissions?: any[];
  taxRecords?: any[];
  theme?: 'dark' | 'light';
  onSelectModule?: (mod: string) => void;
  onSelectContract?: (contract: ERPContract) => void;
  onSelectProperty?: (prop: Property) => void;
  onSelectLead?: (lead: Lead) => void;
  onOpenAcademy?: () => void;
  onStartGuidedTour?: () => void;
  isAr?: boolean;
  adminLocale?: string;
  locale?: string;
}

export const ZFQuickSearchModal: React.FC<ZFQuickSearchModalProps> = ({
  isOpen,
  onClose,
  contracts,
  cheques,
  properties,
  leads,
  partners,
  rescissions,
  taxRecords,
  theme: propTheme,
  onSelectModule,
  onSelectContract,
  onSelectProperty,
  onSelectLead,
  onOpenAcademy,
  onStartGuidedTour,
  isAr,
  adminLocale,
  locale
}) => {
  const router = useRouter();
  const pathname = usePathname() || '';

  // Determine current active locale
  const currentLocale = adminLocale || locale || (isAr ? 'ar' : 'en');
  const effectiveIsAr = isAr !== undefined ? isAr : currentLocale === 'ar';

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategoryKey>('all');
  const [theme, setTheme] = useState<'dark' | 'light'>(propTheme || 'light');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Internal data store when invoked standalone
  const [internalProperties, setInternalProperties] = useState<Property[]>(properties || []);
  const [internalLeads, setInternalLeads] = useState<Lead[]>(leads || []);
  const [internalContracts, setInternalContracts] = useState<ERPContract[]>(contracts || []);
  const [internalCheques, setInternalCheques] = useState<ERPPDCRecord[]>(cheques || []);
  const [internalPartners, setInternalPartners] = useState<ERPPartnerProfile[]>(partners || []);
  const [internalRescissions, setInternalRescissions] = useState<any[]>(rescissions || []);
  const [internalTaxRecords, setInternalTaxRecords] = useState<any[]>(taxRecords || []);

  // 1. Synchronize props when passed
  useEffect(() => {
    if (properties && properties.length > 0) setInternalProperties(properties);
  }, [properties]);

  useEffect(() => {
    if (leads && leads.length > 0) setInternalLeads(leads);
  }, [leads]);

  useEffect(() => {
    if (contracts && contracts.length > 0) setInternalContracts(contracts);
  }, [contracts]);

  useEffect(() => {
    if (cheques && cheques.length > 0) setInternalCheques(cheques);
  }, [cheques]);

  useEffect(() => {
    if (partners && partners.length > 0) setInternalPartners(partners);
  }, [partners]);

  useEffect(() => {
    if (rescissions && rescissions.length > 0) setInternalRescissions(rescissions);
  }, [rescissions]);

  useEffect(() => {
    if (taxRecords && taxRecords.length > 0) setInternalTaxRecords(taxRecords);
  }, [taxRecords]);

  useEffect(() => {
    if (propTheme) setTheme(propTheme);
  }, [propTheme]);

  // 2. Intelligent background fetch for missing data when modal is open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const supabase = createClient();

    const loadMissingData = async () => {
      // Fetch properties if not provided
      if (!properties || properties.length === 0) {
        try {
          const { data, error } = await supabase
            .from('properties')
            .select('id, slug, title_ar, title_en, price_egp, location, type, listing_status, completion_status, building_units')
            .order('created_at', { ascending: false });
          if (isMounted && data && !error && data.length > 0) {
            setInternalProperties(data as Property[]);
          } else if (isMounted && (!properties || properties.length === 0)) {
            setInternalProperties(FALLBACK_PROPERTIES as Property[]);
          }
        } catch {
          if (isMounted && (!properties || properties.length === 0)) {
            setInternalProperties(FALLBACK_PROPERTIES as Property[]);
          }
        }
      }

      // Fetch leads if not provided
      if (!leads || leads.length === 0) {
        try {
          const { data, error } = await supabase
            .from('leads')
            .select('id, name, phone, email, stage, created_at, notes, message, property_id')
            .order('created_at', { ascending: false });
          if (isMounted && data && !error) {
            setInternalLeads(data as Lead[]);
          }
        } catch {}
      }

      // Fetch contracts if not provided
      if (!contracts || contracts.length === 0) {
        try {
          let res = await supabase.from('erp_contracts').select('*').order('created_at', { ascending: false });
          if (res.error) {
            res = await supabase.from('contracts').select('*').order('contract_date', { ascending: false });
          }
          if (isMounted && res.data && !res.error) {
            setInternalContracts(res.data as ERPContract[]);
          }
        } catch {}
      }

      // Fetch PDC cheques if not provided
      if (!cheques || cheques.length === 0) {
        try {
          let res = await supabase.from('erp_pdc_records').select('*').order('due_date', { ascending: true });
          if (res.error) {
            res = await supabase.from('pdc_records').select('*').order('due_date', { ascending: true });
          }
          if (isMounted && res.data && !res.error) {
            setInternalCheques(res.data as ERPPDCRecord[]);
          }
        } catch {}
      }

      // Fetch partner profiles if not provided
      if (!partners || partners.length === 0) {
        try {
          const { data, error } = await supabase
            .from('partner_profiles')
            .select('*')
            .order('joined_date', { ascending: false });
          if (isMounted && data && !error) {
            setInternalPartners(data as ERPPartnerProfile[]);
          }
        } catch {}
      }

      // Fetch rescissions if not provided
      if (!rescissions || rescissions.length === 0) {
        try {
          let res = await supabase.from('erp_rescissions').select('*').order('created_at', { ascending: false });
          if (res.error) {
            res = await supabase.from('rescissions').select('*').order('created_at', { ascending: false });
          }
          if (isMounted && res.data && !res.error) {
            setInternalRescissions(res.data);
          }
        } catch {}
      }

      // Fetch tax records if not provided
      if (!taxRecords || taxRecords.length === 0) {
        try {
          let res = await supabase.from('erp_tax_records').select('*').order('created_at', { ascending: false });
          if (res.error) {
            res = await supabase.from('tax_records').select('*').order('created_at', { ascending: false });
          }
          if (isMounted && res.data && !res.error) {
            setInternalTaxRecords(res.data);
          }
        } catch {}
      }
    };

    loadMissingData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, properties, leads, contracts, cheques, partners, rescissions, taxRecords]);

  // 3. Theme Awareness via data-theme and MutationObserver
  useEffect(() => {
    if (propTheme) {
      setTheme(propTheme);
      return;
    }

    const resolveTheme = (): 'dark' | 'light' => {
      if (typeof document !== 'undefined') {
        const docTheme = document.documentElement.getAttribute('data-theme') as 'dark' | 'light' | null;
        if (docTheme === 'dark' || docTheme === 'light') return docTheme;
      }
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('zf_theme') as 'dark' | 'light' | null;
        if (saved === 'dark' || saved === 'light') return saved;
      }
      return 'light';
    };

    setTheme(resolveTheme());

    if (typeof document !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
            setTheme(resolveTheme());
          }
        }
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'zf_theme') {
          setTheme(resolveTheme());
        }
      };
      window.addEventListener('storage', handleStorageChange);

      return () => {
        observer.disconnect();
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [propTheme]);

  // 4. Focus input & lock body scroll on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setSelectedCategory('all');
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Reset selected index when query or category filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, selectedCategory]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Navigation handlers
  const handleNavigateToPath = useCallback((path: string) => {
    router.push(path);
    onClose();
  }, [router, onClose]);

  const handleNavigateToFinOSTab = useCallback((tab: string, extraQuery?: string) => {
    if (onSelectModule && (pathname.includes('/fin-os') || pathname.startsWith('/fin-os'))) {
      onSelectModule(tab);
    } else {
      const extra = extraQuery ? `&${extraQuery}` : '';
      router.push(`/fin-os/${currentLocale}?tab=${tab}${extra}`);
    }
    onClose();
  }, [onSelectModule, pathname, currentLocale, router, onClose]);

  // 5. Search Index & Results Compilation
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const isArMode = effectiveIsAr;

    interface MatchItem {
      id: string;
      group: SearchCategoryKey;
      category: string;
      title: string;
      subtitle: string;
      icon: any;
      action: () => void;
      priority: number;
    }

    const matches: MatchItem[] = [];

    // Helper formatting functions
    const formatNumber = (val: string | number | undefined | null) => {
      if (val === undefined || val === null || val === '') return '0';
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? '0' : Math.round(num).toLocaleString('en-US');
    };

    const getPropTypeLabel = (type?: string) => {
      switch (type) {
        case 'villa': return isArMode ? 'فيلا مستقلة' : 'Villa';
        case 'penthouse': return isArMode ? 'بنتهاوس فاخر' : 'Penthouse';
        case 'duplex': return isArMode ? 'دوبلكس' : 'Duplex';
        case 'apartment': return isArMode ? 'شقة سكنية' : 'Apartment';
        case 'building': return isArMode ? 'عمارة بالكامل / صرح' : 'Building / Asset';
        case 'townhouse': return isArMode ? 'تاون هاوس' : 'Townhouse';
        case 'commercial': return isArMode ? 'تجاري واستثماري' : 'Commercial';
        default: return type || (isArMode ? 'صرح معماري' : 'Property');
      }
    };

    const getLeadStageLabel = (stage?: string | null) => {
      switch (stage) {
        case 'new': return isArMode ? 'عميل جديد' : 'New Lead';
        case 'contacted': return isArMode ? 'تم التواصل المبدئي' : 'Contacted';
        case 'viewing_scheduled': return isArMode ? 'معاينة مجدولة' : 'Viewing Scheduled';
        case 'negotiating': return isArMode ? 'مفاوضات متقدمة' : 'Negotiating';
        case 'won': case 'closed_won': return isArMode ? 'صفقة مكتملة بنجاح' : 'Deal Won';
        case 'lost': case 'closed_lost': return isArMode ? 'صفقة ملغاة' : 'Deal Lost';
        default: return stage || (isArMode ? 'طلب جاري' : 'In Progress');
      }
    };

    const getPartnerRoleLabel = (role?: string) => {
      switch (role) {
        case 'primary_developer': return isArMode ? 'المطور الرئيسي' : 'Primary Developer';
        case 'equity_partner': return isArMode ? 'شريك استثماري (رأس مال)' : 'Equity Partner';
        case 'land_partner': return isArMode ? 'شريك الأرض' : 'Land Partner';
        case 'silent_financier': return isArMode ? 'ممول صامت' : 'Silent Financier';
        default: return role || (isArMode ? 'شريك وممول' : 'Partner');
      }
    };

    // A. Quick Actions (الأوامر والإجراءات السريعة)
    const quickActions: MatchItem[] = [
      {
        id: 'qa-new-property',
        group: 'actions',
        title: isArMode ? 'إدراج صرح معماري جديد' : 'New Property Listing',
        subtitle: isArMode ? 'فتح استمارة إدراج صرح جديد بالمنظومة والموقع' : 'Open new architectural property listing form',
        category: isArMode ? 'إجراء سريع' : 'Quick Action',
        icon: Plus,
        action: () => handleNavigateToPath(`/admin/${currentLocale}/properties/new`),
        priority: 95
      },
      {
        id: 'qa-new-contract',
        group: 'actions',
        title: isArMode ? 'تحرير عقد بيع جديد' : 'Create New Contract Wizard',
        subtitle: isArMode ? 'إطلاق معالج تحرير العقود وجداول الأقساط' : 'Launch sales contract & installment schedule generator',
        category: isArMode ? 'إجراء سريع' : 'Quick Action',
        icon: FileText,
        action: () => handleNavigateToFinOSTab('contracts', 'action=new'),
        priority: 94
      },
      {
        id: 'qa-receipt-voucher',
        group: 'actions',
        title: isArMode ? 'تسجيل سند قبض نقدي' : 'Record Cash Receipt Voucher',
        subtitle: isArMode ? 'تحصيل دفعة كاش وإصدار سند قبض فوري وقيد مزدوج' : 'Direct cash collection & double-entry receipt voucher',
        category: isArMode ? 'إجراء سريع' : 'Quick Action',
        icon: Wallet,
        action: () => handleNavigateToFinOSTab('operations', 'action=receipt'),
        priority: 93
      },
      {
        id: 'qa-new-cheque',
        group: 'actions',
        title: isArMode ? 'تسجيل شيك جديد بالخزينة' : 'Register New Cheque (PDC)',
        subtitle: isArMode ? 'إيداع شيك أو ورقة قبض في خزينة الأقساط' : 'Add post-dated cheque or note to safe registry',
        category: isArMode ? 'إجراء سريع' : 'Quick Action',
        icon: Wallet,
        action: () => handleNavigateToFinOSTab('pdc', 'action=new'),
        priority: 92
      },
      {
        id: 'qa-treasury-tx',
        group: 'actions',
        title: isArMode ? 'حركة خزينة (إيداع / صرف)' : 'Treasury Transaction (Deposit / Payout)',
        subtitle: isArMode ? 'تسجيل إيداع بنكي، تمويل، أو مصروفات إنشائية نقدية' : 'Record bank deposit, capital call or cash disbursement',
        category: isArMode ? 'إجراء سريع' : 'Quick Action',
        icon: Zap,
        action: () => handleNavigateToFinOSTab('operations', 'action=tx'),
        priority: 91
      },
      {
        id: 'qa-rescission',
        group: 'actions',
        title: isArMode ? 'إلغاء وتسوية عقد (فسخ)' : 'Contract Rescission & Settlement',
        subtitle: isArMode ? 'بدء إجراءات فسخ عقد، حساب غرامة الاسترداد، وتفريغ الوحدة' : 'Initiate contract cancellation, forfeiture calculation & unit release',
        category: isArMode ? 'إجراء سريع' : 'Quick Action',
        icon: RotateCcw,
        action: () => handleNavigateToFinOSTab('rescissions', 'action=new'),
        priority: 90
      },
      {
        id: 'qa-new-partner',
        group: 'actions',
        title: isArMode ? 'إضافة شريك أو ممول جديد' : 'Add Partner or Project Financier',
        subtitle: isArMode ? 'تسجيل ملف شريك استثماري، نسبة الحصص، وتفاصيل الحساب' : 'Register equity investor profile, share card & payout terms',
        category: isArMode ? 'إجراء سريع' : 'Quick Action',
        icon: UserCheck,
        action: () => handleNavigateToFinOSTab('partners', 'action=new'),
        priority: 89
      },
      {
        id: 'qa-guided-tour',
        group: 'actions',
        title: isArMode ? 'تشغيل جولة المنظومة التفاعلية' : 'FIN-OS Master Guided Tour',
        subtitle: isArMode ? 'جولة تفاعلية حية تستعرض كافة شاشات الـ ERP ومؤشرات الأداء' : 'Live interactive walkthrough across all ERP modules and telemetry',
        category: isArMode ? 'المساعدة والتدريب' : 'Help & Tour',
        icon: Compass,
        action: () => {
          if (onStartGuidedTour) {
            onStartGuidedTour();
          } else if (onOpenAcademy) {
            onOpenAcademy();
          } else {
            router.push(`/fin-os/${currentLocale}?tab=dashboard`);
            toast.info(
              isArMode 
                ? 'يمكنك تشغيل جولة المنظومة التفاعلية من شريط أدوات FIN-OS' 
                : 'Launch the FIN-OS interactive tour from the workstation toolbar'
            );
          }
          onClose();
        },
        priority: 88
      },
      {
        id: 'qa-toggle-theme',
        group: 'actions',
        title: isArMode 
          ? `تبديل المظهر إلى الوضع ${theme === 'dark' ? 'النهاري الألباستر الفاخر' : 'الليلي الداكن'}` 
          : `Switch Theme to ${theme === 'dark' ? 'Alabaster Light' : 'Obsidian Dark'}`,
        subtitle: isArMode 
          ? 'التبديل الفوري بين المظهر النهاري والليلي في كامل لوحة التحكم والـ ERP' 
          : 'Instant theme toggle across all dashboard panels and ERP suite',
        category: isArMode ? 'أمر نظام' : 'System Command',
        icon: theme === 'dark' ? Sun : Moon,
        action: () => {
          const next = theme === 'dark' ? 'light' : 'dark';
          setTheme(next);
          document.documentElement.setAttribute('data-theme', next);
          localStorage.setItem('zf_theme', next);
          document.cookie = `zf_theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
          toast.success(
            isArMode 
              ? `تم تفعيل الوضع ${next === 'light' ? 'النهاري الألباستر الفاخر' : 'الليلي الداكن'}` 
              : `Switched to ${next === 'light' ? 'Luxury Alabaster Light' : 'Deep Obsidian Dark'} Mode`
          );
          onClose();
        },
        priority: 87
      },
      {
        id: 'qa-toggle-price-secrecy',
        group: 'actions',
        title: isArMode ? 'سرية الأسعار (إخفاء / إظهار POA)' : 'Toggle Price Secrecy (POA Mode)',
        subtitle: isArMode ? 'التحكم في إظهار أو إخفاء أسعار العقارات للجمهور على الموقع' : 'Toggle public price display on client website (POA Mode)',
        category: isArMode ? 'أمر نظام' : 'System Command',
        icon: EyeOff,
        action: () => {
          const currentSettings = getStoredPlatformSettings();
          const nextVal = !currentSettings.hidePropertyPrices;
          saveStoredPlatformSettings({ ...currentSettings, hidePropertyPrices: nextVal });
          toast.success(
            isArMode 
              ? (nextVal ? 'تم تفعيل سرية الأسعار: إخفاء الأسعار وعرض POA للجمهور' : 'تم تعطيل سرية الأسعار: عرض الأسعار الرسمية للجمهور') 
              : (nextVal ? 'Price Secrecy Enabled: Prices hidden (POA Mode)' : 'Price Secrecy Disabled: Prices visible publicly')
          );
          onClose();
        },
        priority: 86
      },
      {
        id: 'qa-live-preview',
        group: 'actions',
        title: isArMode ? 'معاينة المنصة الحية' : 'Live Platform Preview',
        subtitle: isArMode ? 'فتح البوابة الحية للمنصة في نافذة جديدة' : 'Open client-facing luxury portal in new tab',
        category: isArMode ? 'إجراء سريع' : 'Quick Action',
        icon: ExternalLink,
        action: () => {
          window.open(`/${currentLocale}`, '_blank');
          onClose();
        },
        priority: 85
      }
    ];

    // B. Complete 11 ERP Modules + Capital Mindmap
    const erpModules: MatchItem[] = [
      // 1. Cockpit
      {
        id: 'erp-cockpit',
        group: 'finance',
        title: isArMode ? 'نظرة عامة على الشغل ومؤشرات الأداء (Cockpit)' : 'Executive Cockpit & Financial KPIs',
        subtitle: isArMode ? 'الرؤية التنفيذية للمنظومة، كفاءة التحصيل، والسيولة النقدية' : 'Executive overview, collection efficiency & liquidity KPIs',
        category: isArMode ? 'المنظومة المالية FIN-OS' : 'Financial ERP (FIN-OS)',
        icon: TrendingUp,
        action: () => handleNavigateToFinOSTab('dashboard'),
        priority: 84
      },
      // 2. Daily Operations
      {
        id: 'erp-operations',
        group: 'finance',
        title: isArMode ? 'حركة الخزنة والعمليات اليومية (الصندوق)' : 'Treasury & Daily Operations',
        subtitle: isArMode ? 'حركة الصندوق، سندات القبض النقدية، وتدفقات السيولة' : 'Daily cashier desk, receipt vouchers & cash liquidity',
        category: isArMode ? 'المنظومة المالية FIN-OS' : 'Financial ERP (FIN-OS)',
        icon: Zap,
        action: () => handleNavigateToFinOSTab('operations'),
        priority: 83
      },
      // 3. Properties Financial Matrix
      {
        id: 'erp-properties',
        group: 'finance',
        title: isArMode ? 'محفظة المشاريع والعمارات (المصفوفة المالية)' : 'Properties Financial Matrix',
        subtitle: isArMode ? 'المصفوفة المالية للمشاريع، التدفقات النقدية، وتكاليف العمارات' : 'Project financial matrix, cash flows & building economics',
        category: isArMode ? 'المنظومة المالية FIN-OS' : 'Financial ERP (FIN-OS)',
        icon: Building2,
        action: () => handleNavigateToFinOSTab('properties'),
        priority: 82
      },
      // 4. Feasibility & Pricing Calculator
      {
        id: 'erp-calculator',
        group: 'finance',
        title: isArMode ? 'حاسبة تكلفة المباني وجدوى الأقساط' : 'Feasibility & Pricing Calculator',
        subtitle: isArMode ? 'دراسة جدوى تكاليف البناء، تسعير الوحدات، وخطط السداد' : 'Construction cost feasibility, unit pricing & payment plans',
        category: isArMode ? 'المنظومة المالية FIN-OS' : 'Financial ERP (FIN-OS)',
        icon: Calculator,
        action: () => handleNavigateToFinOSTab('calculator'),
        priority: 81
      },
      // 5. WIP Cost Allocation (RSV)
      {
        id: 'erp-cost-allocation',
        group: 'finance',
        title: isArMode ? 'توزيع مصاريف المباني والإنشاءات (RSV)' : 'WIP Cost Allocation (RSV)',
        subtitle: isArMode ? 'رسملة تكاليف الإنشاء وتوزيعها بنسبة القيمة البيعية النسبية' : 'Construction cost capitalization by relative sales value',
        category: isArMode ? 'المنظومة المالية FIN-OS' : 'Financial ERP (FIN-OS)',
        icon: PieChart,
        action: () => handleNavigateToFinOSTab('cost-allocation'),
        priority: 80
      },
      // 6. Sales Contracts
      {
        id: 'erp-contracts',
        group: 'contracts',
        title: isArMode ? 'عقود البيع والعملاء وجداول الأقساط' : 'Sales Contracts & Schedules',
        subtitle: isArMode ? 'سجل عقود البيع الرسمية، تسليم الوحدات، والالتزامات المالية' : 'Official sales contracts registry, handovers & schedules',
        category: isArMode ? 'المنظومة المالية FIN-OS' : 'Financial ERP (FIN-OS)',
        icon: FileText,
        action: () => handleNavigateToFinOSTab('contracts'),
        priority: 79
      },
      // 7. PDC Cheques & Dues
      {
        id: 'erp-pdc',
        group: 'contracts',
        title: isArMode ? 'أجندة ومواعيد الأقساط والشيكات (PDC)' : 'PDC Cheques & Dues Agenda',
        subtitle: isArMode ? 'أجندة الاستحقاقات، الشيكات الآجلة، وحافظة إيداع وتحصيل البنك' : 'Due dates agenda, safe cheques & bank deposit clearing',
        category: isArMode ? 'المنظومة المالية FIN-OS' : 'Financial ERP (FIN-OS)',
        icon: Wallet,
        action: () => handleNavigateToFinOSTab('pdc'),
        priority: 78
      },
      // 8. Contract Rescissions
      {
        id: 'erp-rescissions',
        group: 'rescissions',
        title: isArMode ? 'إلغاء العقود والتسويات المالية (فسخ)' : 'Contract Rescissions & Settlements',
        subtitle: isArMode ? 'إدارة طلبات الفسخ، حساب غرامات الاسترداد، وتسوية الالتزامات' : 'Rescission settlements, forfeiture penalties & refund liabilities',
        category: isArMode ? 'المنظومة المالية FIN-OS' : 'Financial ERP (FIN-OS)',
        icon: RotateCcw,
        action: () => handleNavigateToFinOSTab('rescissions'),
        priority: 77
      },
      // 9. General Ledger & COA
      {
        id: 'erp-ledger',
        group: 'finance',
        title: isArMode ? 'حسابات الشركة ودفتر اليومية والأستاذ العام' : 'General Ledger & Trial Balance',
        subtitle: isArMode ? 'القيود المزدوجة، دليل الحسابات المعتمد، وميزان المراجعة' : 'Double-entry journals, chart of accounts & trial balance',
        category: isArMode ? 'المنظومة المالية FIN-OS' : 'Financial ERP (FIN-OS)',
        icon: Landmark,
        action: () => handleNavigateToFinOSTab('ledger'),
        priority: 76
      },
      // 10. Partners & Equity
      {
        id: 'erp-partners',
        group: 'partners',
        title: isArMode ? 'الشركاء وممولو المشاريع وبطاقات الحصص' : 'Project Partners & Equity Cards',
        subtitle: isArMode ? 'حصص الشركاء، نداءات رأس المال، وتوزيعات الأرباح النقدية' : 'Partner equity cards, capital calls & dividend payouts',
        category: isArMode ? 'المنظومة المالية FIN-OS' : 'Financial ERP (FIN-OS)',
        icon: Users,
        action: () => handleNavigateToFinOSTab('partners'),
        priority: 75
      },
      // 11. Project Taxes & Permits
      {
        id: 'erp-tax',
        group: 'finance',
        title: isArMode ? 'ضرائب وتراخيص وتأمينات المباني والشقق' : 'Project Taxes, Permits & Insurance',
        subtitle: isArMode ? 'متابعة الضرائب العقارية، رسوم التصرفات، ورخص المباني الحكومية' : 'Property taxes, municipal permits, disposition fees & insurance',
        category: isArMode ? 'المنظومة المالية FIN-OS' : 'Financial ERP (FIN-OS)',
        icon: Landmark,
        action: () => handleNavigateToFinOSTab('tax'),
        priority: 74
      },
      // 12. Capital Flow Mindmap
      {
        id: 'erp-mindmap',
        group: 'finance',
        title: isArMode ? 'خريطة التدفق المالي التفاعلية (Mindmap)' : 'Capital Flow Mindmap',
        subtitle: isArMode ? 'مخطط مرئي تفاعلي لدورة رأس المال والسيولة النقدية' : 'Interactive visual map of capital cycle & treasury liquidity',
        category: isArMode ? 'المنظومة المالية FIN-OS' : 'Financial ERP (FIN-OS)',
        icon: Layers,
        action: () => {
          if (onSelectModule && (pathname.includes('/fin-os') || pathname.startsWith('/fin-os'))) {
            onSelectModule('dashboard');
          } else {
            router.push(`/fin-os/${currentLocale}?tab=dashboard&view=mindmap`);
          }
          onClose();
        },
        priority: 73
      }
    ];

    // C. Admin Suite Pages
    const adminPages: MatchItem[] = [
      {
        id: 'admin-dashboard',
        group: 'actions',
        title: isArMode ? 'لوحة القيادة التنفيذية' : 'Executive Dashboard',
        subtitle: isArMode ? 'الرؤية الاستراتيجية والمؤشرات العامة لإدارة المنصة' : 'Strategic overview & executive KPIs for platform management',
        category: isArMode ? 'لوحة الإدارة' : 'Admin Suite',
        icon: LayoutDashboard,
        action: () => handleNavigateToPath(`/admin/${currentLocale}`),
        priority: 72
      },
      {
        id: 'admin-analytics',
        group: 'actions',
        title: isArMode ? 'تحليلات السوق والذكاء العقاري' : 'Market Intelligence & Analytics',
        subtitle: isArMode ? 'رادار الأسعار، العوائد الاستثمارية، ومؤشرات الطلب بالسوق' : 'Price radar, ROI & regional demand metrics',
        category: isArMode ? 'لوحة الإدارة' : 'Admin Suite',
        icon: TrendingUp,
        action: () => handleNavigateToPath(`/admin/${currentLocale}/analytics`),
        priority: 71
      },
      {
        id: 'admin-properties',
        group: 'properties',
        title: isArMode ? 'محفظة العقارات والمشاريع' : 'Properties & Assets Portfolio',
        subtitle: isArMode ? 'استعراض وإدارة الصروح والوحدات السكنية المعروضة' : 'Browse and manage all properties & listed units',
        category: isArMode ? 'محفظة العقارات' : 'Properties Portfolio',
        icon: Building2,
        action: () => handleNavigateToPath(`/admin/${currentLocale}/properties`),
        priority: 70
      },
      {
        id: 'admin-properties-new',
        group: 'properties',
        title: isArMode ? 'إدراج صرح معماري جديد' : 'New Property Listing',
        subtitle: isArMode ? 'إضافة أصل أو مشروع معماري جديد إلى المحفظة' : 'Add new real estate asset or project to portfolio',
        category: isArMode ? 'محفظة العقارات' : 'Properties Portfolio',
        icon: Plus,
        action: () => handleNavigateToPath(`/admin/${currentLocale}/properties/new`),
        priority: 69
      },
      {
        id: 'admin-leads',
        group: 'leads',
        title: isArMode ? 'إدارة العملاء والمعاينات (CRM)' : 'Client CRM & Pipeline',
        subtitle: isArMode ? 'متابعة خط الصفقات، طلبات الشراء، وجدولة المعاينات' : 'Lead pipeline, purchase inquiries & viewing appointments',
        category: isArMode ? 'العملاء وخط الصفقات' : 'Clients & Pipeline',
        icon: Users,
        action: () => handleNavigateToPath(`/admin/${currentLocale}/leads`),
        priority: 68
      },
      {
        id: 'admin-settings',
        group: 'actions',
        title: isArMode ? 'إعدادات المنصة ورادار السوق' : 'Platform Settings & Market Radar',
        subtitle: isArMode ? 'التحكم في بيانات الاتصال، سياسات العرض، وسرية الأسعار' : 'Configure platform contact, display & price secrecy policies',
        category: isArMode ? 'إعدادات المنصة' : 'Platform Settings',
        icon: Sliders,
        action: () => handleNavigateToPath(`/admin/${currentLocale}/settings`),
        priority: 67
      }
    ];

    // 1. If query is empty: show top curated quick actions & navigation picks
    if (!q) {
      const topPicks = [
        ...quickActions.slice(0, 5),
        erpModules[0], // Cockpit
        erpModules[1], // Operations
        erpModules[5], // Contracts
        erpModules[6], // PDC
        erpModules[7], // Rescissions
        erpModules[8], // Ledger
        erpModules[9], // Partners
        erpModules[10], // Tax
        adminPages[0], // Executive Dashboard
        adminPages[2]  // Properties Portfolio
      ];

      const filteredPicks = selectedCategory === 'all' 
        ? topPicks 
        : topPicks.filter(item => item.group === selectedCategory);

      return filteredPicks.map((item, idx) => ({
        ...item,
        priority: 100 - idx
      }));
    }

    // 2. Match Quick Actions
    quickActions.forEach(qa => {
      if (
        qa.title.toLowerCase().includes(q) ||
        qa.subtitle.toLowerCase().includes(q)
      ) {
        matches.push(qa);
      }
    });

    // 3. Match ERP Modules
    erpModules.forEach(em => {
      if (
        em.title.toLowerCase().includes(q) ||
        em.subtitle.toLowerCase().includes(q) ||
        em.category.toLowerCase().includes(q)
      ) {
        matches.push(em);
      }
    });

    // 4. Match Admin Pages
    adminPages.forEach(ap => {
      if (
        ap.title.toLowerCase().includes(q) ||
        ap.subtitle.toLowerCase().includes(q)
      ) {
        matches.push(ap);
      }
    });

    // 5. Match Properties & Building Units (الصروح والوحدات الداخلية)
    internalProperties.forEach(p => {
      const typeAr = getPropTypeLabel(p.type);
      const titleAr = p.title_ar || '';
      const titleEn = p.title_en || '';
      const loc = p.location || '';
      const slug = p.slug || '';
      const priceStr = String(p.price_egp || '');

      // Check if property matches
      const propMatches = 
        titleAr.toLowerCase().includes(q) ||
        titleEn.toLowerCase().includes(q) ||
        loc.toLowerCase().includes(q) ||
        typeAr.toLowerCase().includes(q) ||
        (p.type && p.type.toLowerCase().includes(q)) ||
        slug.toLowerCase().includes(q) ||
        priceStr.includes(q);

      if (propMatches) {
        matches.push({
          id: `prop-${p.id}`,
          group: 'properties',
          category: isArMode ? 'محفظة العقارات' : 'Properties',
          title: isArMode ? titleAr : (titleEn || titleAr),
          subtitle: `${formatNumber(p.price_egp)} EGP | ${loc || (isArMode ? 'الموقع غير محدد' : 'Location TBD')} | ${typeAr}`,
          icon: Building2,
          priority: 85,
          action: () => {
            if (onSelectProperty) {
              onSelectProperty(p);
            } else {
              router.push(`/admin/${currentLocale}/properties/${p.id}/edit`);
            }
            onClose();
          }
        });
      }

      // Check building units inside this property
      if (Array.isArray(p.building_units)) {
        p.building_units.forEach((u: any, uIdx: number) => {
          const uNum = String(u.unit_number || u.number || '');
          const buyer = String(u.buyer_name || '');
          const uType = String(u.type || '');
          const uPrice = u.price_egp ? formatNumber(u.price_egp) : '';

          if (
            (uNum && uNum.toLowerCase().includes(q)) ||
            (buyer && buyer.toLowerCase().includes(q)) ||
            (uType && uType.toLowerCase().includes(q))
          ) {
            matches.push({
              id: `unit-${p.id}-${u.id || uIdx}`,
              group: 'properties',
              category: isArMode ? 'الوحدات السكنية' : 'Building Units',
              title: isArMode 
                ? `وحدة ${uNum} — ${titleAr}` 
                : `Unit ${uNum} — ${titleEn || titleAr}`,
              subtitle: `${uPrice ? `${uPrice} EGP | ` : ''}${buyer ? (isArMode ? `المشتري: ${buyer}` : `Buyer: ${buyer}`) : (u.status || (isArMode ? 'متاحة' : 'Available'))} | ${isArMode ? `الدور ${u.floor ?? 0}` : `Floor ${u.floor ?? 0}`}`,
              icon: Building2,
              priority: 86,
              action: () => {
                if (onSelectProperty) {
                  onSelectProperty(p);
                } else {
                  router.push(`/admin/${currentLocale}/properties/${p.id}/edit`);
                }
                onClose();
              }
            });
          }
        });
      }
    });

    // 6. Match Leads & CRM (العملاء والطلبات)
    internalLeads.forEach(lead => {
      const name = lead.name || '';
      const phone = lead.phone || '';
      const email = lead.email || '';
      const stageStr = lead.stage || '';
      const stageAr = getLeadStageLabel(lead.stage);
      const notes = lead.notes || '';
      const msg = lead.message || '';

      if (
        name.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        stageStr.toLowerCase().includes(q) ||
        stageAr.toLowerCase().includes(q) ||
        notes.toLowerCase().includes(q) ||
        msg.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `lead-${lead.id}`,
          group: 'leads',
          category: isArMode ? 'العملاء وخط الصفقات' : 'Leads & CRM',
          title: `${name} (${phone})`,
          subtitle: `${email || (isArMode ? 'بدون بريد' : 'No email')} | ${stageAr}`,
          icon: Users,
          priority: 78,
          action: () => {
            if (onSelectLead) {
              onSelectLead(lead);
            } else {
              router.push(`/admin/${currentLocale}/leads?search=${encodeURIComponent(phone || name)}`);
            }
            onClose();
          }
        });
      }
    });

    // 7. Match Contracts (عقود البيع)
    internalContracts.forEach(c => {
      const cNum = c.contract_number || '';
      const buyer = c.buyer_name || '';
      const unit = c.building_unit_number || c.unit_id || '';
      const valStr = String(c.gross_contract_value || '');
      const status = c.status || '';

      if (
        cNum.toLowerCase().includes(q) ||
        buyer.toLowerCase().includes(q) ||
        unit.toLowerCase().includes(q) ||
        valStr.includes(q) ||
        status.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `contract-${c.contract_id}`,
          group: 'contracts',
          category: isArMode ? 'عقود البيع' : 'Contracts',
          title: `${isArMode ? 'عقد بيع' : 'Contract'} #${cNum} (${unit})`,
          subtitle: `${formatNumber(c.gross_contract_value)} EGP | ${buyer} | ${status}`,
          icon: FileText,
          priority: 75,
          action: () => {
            if (onSelectContract) {
              onSelectContract(c);
            } else {
              handleNavigateToFinOSTab('contracts', `contractId=${c.contract_id}`);
            }
          }
        });
      }
    });

    // 8. Match PDC Cheques (شيكات وأقساط التحصيل)
    internalCheques.forEach(ch => {
      const chNum = ch.cheque_number || '';
      const drawer = ch.drawer_name || '';
      const bank = ch.bank_name || '';
      const nomStr = String(ch.nominal_value || '');
      const status = ch.status || '';
      const dueDate = ch.due_date || '';

      if (
        chNum.toLowerCase().includes(q) ||
        drawer.toLowerCase().includes(q) ||
        bank.toLowerCase().includes(q) ||
        nomStr.includes(q) ||
        status.toLowerCase().includes(q) ||
        dueDate.includes(q)
      ) {
        matches.push({
          id: `pdc-${ch.cheque_id}`,
          group: 'contracts',
          category: isArMode ? 'أقساط وشيكات' : 'PDC & Installments',
          title: `${isArMode ? 'بند قسط/شيك رقم' : 'Due Cheque/Note'} #${chNum} (${bank || 'Safe'})`,
          subtitle: `${formatNumber(ch.nominal_value)} EGP | ${drawer} | ${status === 'Cleared' ? (isArMode ? 'تم التحصيل' : 'Cleared') : (isArMode ? 'مستحق باليد' : 'Due In Hand')} (${dueDate})`,
          icon: Wallet,
          priority: 72,
          action: () => handleNavigateToFinOSTab('pdc')
        });
      }
    });

    // 9. Match Rescissions & Settlements (الإلغاءات والتسويات)
    internalRescissions.forEach(r => {
      const rId = String(r.rescission_id || '');
      const cId = String(r.contract_id || '');
      const branch = String(r.branch || '');
      const state = String(r.unit_state || '');
      const refund = String(r.net_refund_liability || '');
      const penalty = String(r.penalty_retained || '');

      // Lookup contract details if available
      const linkedContract = internalContracts.find(c => c.contract_id === r.contract_id);
      const cNum = linkedContract?.contract_number || cId.slice(0, 8);
      const buyer = linkedContract?.buyer_name || '';

      if (
        rId.toLowerCase().includes(q) ||
        cId.toLowerCase().includes(q) ||
        cNum.toLowerCase().includes(q) ||
        buyer.toLowerCase().includes(q) ||
        branch.toLowerCase().includes(q) ||
        state.toLowerCase().includes(q) ||
        refund.includes(q) ||
        penalty.includes(q) ||
        q.includes('فسخ') ||
        q.includes('استرداد') ||
        q.includes('resciss')
      ) {
        matches.push({
          id: `rescission-${r.rescission_id}`,
          group: 'rescissions',
          category: isArMode ? 'الإلغاءات والتسويات' : 'Rescissions & Settlements',
          title: isArMode 
            ? `تسوية فسخ عقد #${cNum} ${buyer ? `(${buyer})` : ''}`
            : `Rescission Settlement #${cNum} ${buyer ? `(${buyer})` : ''}`,
          subtitle: `${formatNumber(r.net_refund_liability)} EGP ${isArMode ? 'مسترد' : 'refund'} | ${isArMode ? 'غرامة' : 'penalty'}: ${formatNumber(r.penalty_retained)} EGP | ${state || branch}`,
          icon: RotateCcw,
          priority: 74,
          action: () => handleNavigateToFinOSTab('rescissions', `rescissionId=${r.rescission_id}`)
        });
      }
    });

    // 10. Match Partners & Financiers (الشركاء والممولين)
    internalPartners.forEach(part => {
      const name = part.name || '';
      const roleStr = part.role || '';
      const roleAr = getPartnerRoleLabel(part.role);
      const phone = part.phone || '';
      const bank = part.bank_name || '';
      const payoutMethod = part.preferred_payout_method || '';

      if (
        name.toLowerCase().includes(q) ||
        roleStr.toLowerCase().includes(q) ||
        roleAr.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q) ||
        bank.toLowerCase().includes(q) ||
        payoutMethod.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `partner-${part.id}`,
          group: 'partners',
          category: isArMode ? 'الشركاء والممولين' : 'Partners & Equity',
          title: name,
          subtitle: `${roleAr} | ${bank || payoutMethod || (isArMode ? 'حساب معتمد' : 'Verified Partner')}`,
          icon: UserCheck,
          priority: 71,
          action: () => handleNavigateToFinOSTab('partners')
        });
      }
    });

    // 11. Match Taxes & Permits (الضرائب والتراخيص)
    internalTaxRecords.forEach((tx, txIdx) => {
      const txId = String(tx.tax_id || txIdx);
      const txType = String(tx.tax_type || '');
      const txAmount = String(tx.tax_amount || '');
      const txBase = String(tx.taxable_base || '');
      const txStatus = String(tx.status || '');
      const unitNum = String(tx.building_unit_number || '');

      if (
        txType.toLowerCase().includes(q) ||
        txAmount.includes(q) ||
        txBase.includes(q) ||
        txStatus.toLowerCase().includes(q) ||
        unitNum.toLowerCase().includes(q) ||
        q.includes('ضريب') ||
        q.includes('tax')
      ) {
        matches.push({
          id: `tax-${txId}`,
          group: 'finance',
          category: isArMode ? 'الضرائب والرسوم' : 'Taxes & Permits',
          title: `${isArMode ? 'سجل ضريبي / رسوم' : 'Tax / Permit Record'} (${txType || 'Property Tax'})`,
          subtitle: `${formatNumber(tx.tax_amount)} EGP | ${txStatus || (isArMode ? 'مستحق' : 'Due')} ${unitNum ? `| وحدة ${unitNum}` : ''}`,
          icon: Landmark,
          priority: 66,
          action: () => handleNavigateToFinOSTab('tax')
        });
      }
    });

    // 12. Match Chart of Accounts (دليل الحسابات الشامل CANONICAL_COA)
    Object.values(CANONICAL_COA).forEach(acc => {
      const code = acc.account_code || '';
      const nameEn = acc.account_name_en || '';
      const nameAr = acc.account_name_ar || '';
      const type = acc.account_type || '';

      if (
        code.includes(q) ||
        nameEn.toLowerCase().includes(q) ||
        nameAr.includes(q) ||
        type.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `coa-${code}`,
          group: 'finance',
          category: isArMode ? 'دليل الحسابات' : 'Chart of Accounts',
          title: `[${code}] ${isArMode ? nameAr : nameEn}`,
          subtitle: `${type} | ${acc.normal_balance} balance`,
          icon: Landmark,
          priority: 62,
          action: () => handleNavigateToFinOSTab('ledger')
        });
      }
    });

    // Filter by selected category tab if not 'all'
    const categoryFiltered = selectedCategory === 'all'
      ? matches
      : matches.filter(m => m.group === selectedCategory);

    // Sort by priority and cap at 14 items for optimal UI ergonomics
    return categoryFiltered.sort((a, b) => b.priority - a.priority).slice(0, 14);
  }, [
    query, 
    selectedCategory,
    theme, 
    effectiveIsAr, 
    currentLocale, 
    pathname, 
    internalProperties, 
    internalLeads, 
    internalContracts, 
    internalCheques, 
    internalPartners, 
    internalRescissions,
    internalTaxRecords,
    onSelectProperty, 
    onSelectLead, 
    onSelectContract, 
    onSelectModule, 
    onOpenAcademy, 
    onStartGuidedTour, 
    handleNavigateToPath, 
    handleNavigateToFinOSTab, 
    onClose, 
    router
  ]);

  // Keyboard navigation listener (Arrow keys, Enter, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  if (!isOpen) return null;

  const isLight = theme === 'light';

  // Category Tabs Definition
  const categoryTabs: { key: SearchCategoryKey; label: string }[] = [
    { key: 'all', label: effectiveIsAr ? 'الكل' : 'All' },
    { key: 'properties', label: effectiveIsAr ? 'العقارات والوحدات' : 'Properties & Units' },
    { key: 'leads', label: effectiveIsAr ? 'العملاء' : 'Leads CRM' },
    { key: 'contracts', label: effectiveIsAr ? 'العقود والأقساط' : 'Contracts & Dues' },
    { key: 'finance', label: effectiveIsAr ? 'الخزينة والحسابات' : 'Finance & Treasury' },
    { key: 'rescissions', label: effectiveIsAr ? 'الإلغاءات والتسويات' : 'Rescissions' },
    { key: 'partners', label: effectiveIsAr ? 'الشركاء' : 'Partners' },
    { key: 'actions', label: effectiveIsAr ? 'الأوامر السريعة' : 'Quick Actions' },
  ];

  // Keycap button styling for footer
  const kbdCapsuleStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    height: '19px',
    padding: '0 5px',
    borderRadius: '4px',
    fontSize: '0.68rem',
    fontFamily: 'inherit',
    fontWeight: 700,
    background: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)',
    border: isLight ? '1px solid #D8D2C4' : '1px solid rgba(255, 255, 255, 0.15)',
    color: isLight ? '#0F172A' : '#DDA752',
    boxShadow: isLight ? '0 1px 2px rgba(15, 23, 42, 0.04)' : 'none',
    lineHeight: 1
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isLight ? 'rgba(15, 23, 42, 0.45)' : 'rgba(0, 0, 0, 0.85)',
        backdropFilter: isLight ? 'blur(8px)' : 'blur(12px)',
        WebkitBackdropFilter: isLight ? 'blur(8px)' : 'blur(12px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '8vh',
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <style>{`
        .zf-omni-input::placeholder {
          color: ${isLight ? '#64748B' : '#94A3B8'};
          opacity: 1;
        }
        .zf-search-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .zf-search-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .zf-search-scrollbar::-webkit-scrollbar-thumb {
          background: ${isLight ? 'rgba(148, 111, 35, 0.25)' : 'rgba(221, 167, 82, 0.25)'};
          border-radius: 4px;
        }
        .zf-search-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isLight ? 'rgba(148, 111, 35, 0.45)' : 'rgba(221, 167, 82, 0.45)'};
        }
        .zf-chip-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .zf-chip-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes zfSearchFadeIn {
          from {
            opacity: 0;
            transform: scale(0.98) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>

      <div
        style={{
          width: '680px',
          maxWidth: '94vw',
          background: isLight ? '#FFFFFF' : 'rgba(14, 18, 28, 0.98)',
          border: isLight ? '1.5px solid #D8D2C4' : '1.5px solid rgba(221, 167, 82, 0.35)',
          borderRadius: '16px',
          boxShadow: isLight
            ? '0 24px 64px rgba(15, 23, 42, 0.12), 0 4px 16px rgba(15, 23, 42, 0.06)'
            : '0 30px 60px rgba(0, 0, 0, 0.9), 0 0 25px rgba(221, 167, 82, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          direction: effectiveIsAr ? 'rtl' : 'ltr',
          textAlign: effectiveIsAr ? 'right' : 'left',
          animation: 'zfSearchFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 1. Search Input Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            padding: '1.05rem 1.25rem',
            background: isLight ? '#F8FAFC' : 'rgba(20, 25, 38, 0.8)',
            borderBottom: isLight ? '1px solid #D8D2C4' : '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <Search size={18} color={isLight ? '#946F23' : '#DDA752'} style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            className="zf-omni-input"
            placeholder={
              effectiveIsAr
                ? 'البحث الشامل في المنظومة (عقارات، عملاء، عقود، خزينة، شركاء، تسويات)...'
                : 'Universal Omni-Search (Properties, Leads, Contracts, Treasury, Partners)...'
            }
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: isLight ? '#0F172A' : '#FFFFFF',
              fontSize: '0.98rem',
              fontWeight: 500,
              width: '100%',
              fontFamily: 'inherit'
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: isLight ? '#94A3B8' : '#64748B',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s ease'
              }}
              title={effectiveIsAr ? 'مسح حقل البحث' : 'Clear search'}
            >
              <X size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={effectiveIsAr ? 'إغلاق' : 'Close'}
            style={{
              background: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
              border: isLight ? '1px solid #D8D2C4' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: isLight ? '#64748B' : '#94A3B8',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = isLight ? '#0F172A' : '#FFFFFF';
              e.currentTarget.style.background = isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.12)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = isLight ? '#64748B' : '#94A3B8';
              e.currentTarget.style.background = isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)';
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* 2. Category Filter Tabs (Chips) */}
        <div
          className="zf-chip-scrollbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1.15rem',
            background: isLight ? '#FAFAF9' : 'rgba(16, 21, 33, 0.7)',
            borderBottom: isLight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.06)',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}
        >
          {categoryTabs.map(tab => {
            const isActive = selectedCategory === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedCategory(tab.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.28rem 0.68rem',
                  borderRadius: '9999px',
                  fontSize: '0.73rem',
                  fontWeight: isActive ? 700 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: isActive
                    ? (isLight ? '1px solid #946F23' : '1px solid #DDA752')
                    : (isLight ? '1px solid #D8D2C4' : '1px solid rgba(255, 255, 255, 0.1)'),
                  background: isActive
                    ? (isLight ? '#946F23' : 'rgba(221, 167, 82, 0.25)')
                    : (isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.04)'),
                  color: isActive
                    ? (isLight ? '#FFFFFF' : '#E5B869')
                    : (isLight ? '#64748B' : '#94A3B8'),
                  boxShadow: isActive && isLight ? '0 1px 4px rgba(148, 111, 35, 0.2)' : 'none'
                }}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3. Results List */}
        <div
          className="zf-search-scrollbar"
          style={{
            maxHeight: '410px',
            overflowY: 'auto',
            padding: '0.6rem 0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem'
          }}
        >
          {results.length === 0 ? (
            <div
              style={{
                padding: '2.8rem 1rem',
                textAlign: 'center',
                color: isLight ? '#64748B' : '#94A3B8',
                fontSize: '0.88rem',
                fontWeight: 500
              }}
            >
              {query.trim()
                ? (effectiveIsAr ? 'لا توجد نتائج مطابقة لبحثك في كافة سجلات المنظومة والـ ERP' : 'No matching records found across system registers and ERP.')
                : (effectiveIsAr ? 'اكتب اسم عقار، رقم وحدة، عميل، عقد، شيك، أو كود حساب للبحث الفوري' : 'Type a property name, unit #, lead, contract, cheque, or account code...')}
            </div>
          ) : (
            results.map((r, index) => {
              const Icon = r.icon;
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={r.id}
                  ref={isSelected ? selectedItemRef : null}
                  onClick={r.action}
                  style={{
                    padding: '0.68rem 0.85rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                    background: isSelected
                      ? (isLight ? 'rgba(148, 111, 35, 0.08)' : 'rgba(221, 167, 82, 0.12)')
                      : 'transparent'
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      minWidth: 0,
                      flex: 1
                    }}
                  >
                    {/* Icon Box */}
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '9px',
                        background: isLight ? 'rgba(148, 111, 35, 0.1)' : 'rgba(221, 167, 82, 0.12)',
                        color: isLight ? '#946F23' : '#DDA752',
                        border: isLight
                          ? '1px solid rgba(148, 111, 35, 0.22)'
                          : '1px solid rgba(221, 167, 82, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Icon size={17} />
                    </div>

                    {/* Titles */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          color: isLight ? '#0F172A' : '#FFFFFF',
                          letterSpacing: '-0.01em',
                          lineHeight: 1.25,
                          marginBottom: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {r.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.74rem',
                          color: isLight ? '#64748B' : '#94A3B8',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {r.subtitle}
                      </div>
                    </div>
                  </div>

                  {/* Category Badge & Action Hint */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: isLight ? '#946F23' : '#DDA752',
                        background: isLight ? 'rgba(148, 111, 35, 0.08)' : 'rgba(221, 167, 82, 0.12)',
                        border: isLight
                          ? '1px solid rgba(148, 111, 35, 0.22)'
                          : '1px solid rgba(221, 167, 82, 0.25)',
                        padding: '0.16rem 0.52rem',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {r.category}
                    </span>

                    {isSelected && (
                      <div
                        style={{
                          color: isLight ? '#946F23' : '#DDA752',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: 0.9
                        }}
                      >
                        {effectiveIsAr ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. Keyboard Shortcuts Footer */}
        <div
          style={{
            padding: '0.68rem 1.25rem',
            background: isLight ? '#F8FAFC' : 'rgba(20, 25, 38, 0.95)',
            borderTop: isLight ? '1px solid #D8D2C4' : '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            color: isLight ? '#64748B' : '#94A3B8',
            direction: effectiveIsAr ? 'rtl' : 'ltr'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <kbd style={kbdCapsuleStyle}>↑↓</kbd>
              <span>{effectiveIsAr ? 'للتنقل' : 'navigate'}</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <kbd style={kbdCapsuleStyle}>↵</kbd>
              <span>{effectiveIsAr ? 'للاختيار' : 'select'}</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <kbd style={kbdCapsuleStyle}>ESC</kbd>
              <span>{effectiveIsAr ? 'للإغلاق' : 'close'}</span>
            </span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 700,
              fontSize: '0.68rem',
              color: isLight ? '#946F23' : '#DDA752'
            }}
          >
            <span>{effectiveIsAr ? 'محرك البحث الشامل' : 'Omni-Search'}</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span>v2.5</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZFQuickSearchModal;
