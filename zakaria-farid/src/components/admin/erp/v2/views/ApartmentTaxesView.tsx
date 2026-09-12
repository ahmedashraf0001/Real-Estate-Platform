'use client';

import React, { useState, useMemo } from 'react';
import { 
  Landmark, 
  CheckCircle2, 
  FileText, 
  Search, 
  Clock, 
  ArrowUpRight, 
  ShieldCheck,
  Building2,
  Eye,
  Receipt,
  Plus,
  HardHat,
  FileCheck,
  Layers,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';
import { ERPTaxRecord, ERPContract, ERPPropertyCostItem } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { localizeBuyerName } from '@/components/erp/JournalEntryPreview';
import { ZFPagination } from '../ZFPagination';
import { ZFKpiCard } from '../ZFKpiCard';
import { ZFFilterToolbar } from '../ZFFilterToolbar';
import { ZFErpBreadcrumb } from '../common/ZFErpBreadcrumb';
import styles from '../ZFWorkstationShell.module.css';

export interface ApartmentTaxesViewProps {
  taxRecords: ERPTaxRecord[];
  contracts: ERPContract[];
  properties?: Property[];
  propertyCosts?: ERPPropertyCostItem[];
  isAr?: boolean;
  isMutating?: boolean;
  onRemitTax: (taxId: string) => void;
  onInspectTax: (tax: ERPTaxRecord) => void;
  onOpenCostModal?: (propertyId?: string) => void;
}

export const ApartmentTaxesView: React.FC<ApartmentTaxesViewProps> = ({
  taxRecords,
  contracts,
  properties = [],
  propertyCosts = [],
  isAr = true,
  isMutating = false,
  onRemitTax,
  onInspectTax,
  onOpenCostModal
}) => {
  // Master Mode: Tab 1 (Project Statutory Costs) vs Tab 2 (Disposition Tax Archive)
  const [activeMode, setActiveMode] = useState<'capitalized_costs' | 'disposition_archive'>('capitalized_costs');

  // --------------------------------------------------------------------------
  // TAB 1 STATES: CAPITALIZED STATUTORY COSTS (WIP 150000)
  // --------------------------------------------------------------------------
  const [costCategoryFilter, setCostCategoryFilter] = useState<'all' | 'permits_engineering' | 'taxes_fees'>('all');
  const [costPropertyFilter, setCostPropertyFilter] = useState<string>('all');
  const [costSortBy, setCostSortBy] = useState<'amount_desc' | 'amount_asc' | 'date_desc' | 'date_asc' | 'project_asc'>('amount_desc');
  const [costSearchQuery, setCostSearchQuery] = useState<string>('');
  const [costViewMode, setCostViewMode] = useState<'cards' | 'table'>('table');
  const [costCurrentPage, setCostCurrentPage] = useState<number>(1);
  const [costPageSize, setCostPageSize] = useState<number>(10);

  // --------------------------------------------------------------------------
  // TAB 2 STATES: UNIT REAL ESTATE DISPOSITION TAX ARCHIVE (2.5%)
  // --------------------------------------------------------------------------
  const [archiveViewMode, setArchiveViewMode] = useState<'cards' | 'table'>('table');
  const [archiveStatusFilter, setArchiveStatusFilter] = useState<'all' | 'pending' | 'remitted'>('all');
  const [archiveTypeFilter, setArchiveTypeFilter] = useState<string>('all');
  const [archiveSortBy, setArchiveSortBy] = useState<'amount_desc' | 'amount_asc' | 'rate_desc' | 'unit_asc'>('amount_desc');
  const [archiveSearchQuery, setArchiveSearchQuery] = useState<string>('');
  const [archiveCurrentPage, setArchiveCurrentPage] = useState<number>(1);
  const [archivePageSize, setArchivePageSize] = useState<number>(10);

  // Properties map for quick lookup
  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>();
    properties.forEach(p => map.set(p.id, p));
    return map;
  }, [properties]);

  // ==========================================================================
  // TAB 1 DATA COMPUTATIONS: STATUTORY COSTS
  // ==========================================================================
  const allStatutoryCosts = useMemo(() => {
    return propertyCosts.filter(item => 
      item.category === 'taxes_fees' || item.category === 'permits_engineering'
    );
  }, [propertyCosts]);

  // Helper to identify Contractor Social Insurance vs Building Permits
  const isInsuranceItem = (c: ERPPropertyCostItem) => {
    const text = `${c.item_name_ar} ${c.item_name_en || ''} ${c.supplier_contractor || ''} ${c.notes || ''} ${c.invoice_ref || ''}`.toLowerCase();
    return text.includes('تأمين') || text.includes('اجتماعي') || text.includes('نقاب') || text.includes('عمالة') || text.includes('ins-') || text.includes('insurance');
  };

  // Tab 1 KPIs
  const costKpis = useMemo(() => {
    let totalStatutory = D(0);
    let totalInsurance = D(0);
    let totalPermits = D(0);
    let insuranceCount = 0;
    let permitsCount = 0;

    allStatutoryCosts.forEach(item => {
      const amount = D(item.total_cost_egp || item.total_amount || 0);
      totalStatutory = totalStatutory.plus(amount);

      if (isInsuranceItem(item)) {
        totalInsurance = totalInsurance.plus(amount);
        insuranceCount += 1;
      } else {
        totalPermits = totalPermits.plus(amount);
        permitsCount += 1;
      }
    });

    return {
      totalStatutory,
      totalInsurance,
      totalPermits,
      totalCount: allStatutoryCosts.length,
      insuranceCount,
      permitsCount
    };
  }, [allStatutoryCosts]);

  // Badge classification for Statutory Costs
  const getStatutoryCostBadge = (item: ERPPropertyCostItem) => {
    const text = `${item.item_name_ar} ${item.item_name_en || ''} ${item.supplier_contractor || ''} ${item.invoice_ref || ''}`.toLowerCase();
    
    if (isInsuranceItem(item)) {
      return {
        label: isAr ? 'تأمينات مقاولات ونقابة' : 'Contractor Insurance',
        color: '#475569',
        bg: 'rgba(71, 85, 105, 0.08)',
        border: 'rgba(71, 85, 105, 0.25)',
        icon: <ShieldCheck size={12} color="#475569" />
      };
    }
    if (text.includes('مرافق') || text.includes('مجلس') || text.includes('إشغال') || text.includes('مياه') || text.includes('كهرباء') || text.includes('mun-')) {
      return {
        label: isAr ? 'رسوم جهاز المدينة والمرافق' : 'Municipal & Utility',
        color: '#1d4ed8',
        bg: 'rgba(29, 78, 216, 0.08)',
        border: 'rgba(29, 78, 216, 0.25)',
        icon: <Landmark size={12} color="#1d4ed8" />
      };
    }
    if (text.includes('ترخيص') || text.includes('رخصة') || text.includes('lic-')) {
      return {
        label: isAr ? 'ترخيص بناء هندسي معتمد' : 'Building Permit',
        color: '#946f23',
        bg: 'rgba(184, 144, 62, 0.08)',
        border: 'rgba(184, 144, 62, 0.25)',
        icon: <FileText size={12} color="#946f23" />
      };
    }
    if (text.includes('جسات') || text.includes('تربة') || text.includes('geo-') || text.includes('استشار')) {
      return {
        label: isAr ? 'استشارات هندسية وجسات' : 'Engineering Borings',
        color: '#7c3aed',
        bg: 'rgba(124, 58, 237, 0.08)',
        border: 'rgba(124, 58, 237, 0.25)',
        icon: <Building2 size={12} color="#7c3aed" />
      };
    }
    return {
      label: item.category === 'permits_engineering' 
        ? (isAr ? 'تراخيص وهندسة' : 'Permits') 
        : (isAr ? 'ضرائب ورسوم حكومية' : 'Gov Fees'),
      color: '#946f23',
      bg: 'rgba(184, 144, 62, 0.08)',
      border: 'rgba(184, 144, 62, 0.25)',
      icon: <FileCheck size={12} color="#946f23" />
    };
  };

  const getPhaseName = (phase: string) => {
    switch (phase) {
      case 'planning_permits':
        return isAr ? 'التراخيص والتخطيط' : 'Planning & Permits';
      case 'excavation_foundation':
        return isAr ? 'الأساسات والحفر' : 'Excavation & Footings';
      case 'structural_skeleton':
        return isAr ? 'الهيكل والخرسانات' : 'Structural Skeleton';
      case 'masonry_roughing':
        return isAr ? 'المباني والتأسيس' : 'Masonry & MEP';
      case 'finishing_interiors':
        return isAr ? 'التشطيبات والديكور' : 'Finishing & Cladding';
      case 'final_inspection_handover':
        return isAr ? 'الجاهزية للتسليم' : 'Handover & Commissioning';
      default:
        return phase;
    }
  };

  // Filtered Statutory Costs
  const filteredCostItems = useMemo(() => {
    return allStatutoryCosts.filter(item => {
      if (costCategoryFilter !== 'all' && item.category !== costCategoryFilter) {
        return false;
      }
      if (costPropertyFilter !== 'all' && item.property_id !== costPropertyFilter) {
        return false;
      }
      if (costSearchQuery.trim()) {
        const q = costSearchQuery.toLowerCase();
        const prop = propertyMap.get(item.property_id);
        const propTitleAr = (prop?.title_ar || '').toLowerCase();
        const propTitleEn = (prop?.title_en || '').toLowerCase();
        const propLoc = (prop?.location || '').toLowerCase();
        const nameAr = (item.item_name_ar || '').toLowerCase();
        const nameEn = (item.item_name_en || '').toLowerCase();
        const supplier = (item.supplier_contractor || '').toLowerCase();
        const invRef = (item.invoice_ref || '').toLowerCase();
        const notes = (item.notes || '').toLowerCase();

        return propTitleAr.includes(q) || 
               propTitleEn.includes(q) || 
               propLoc.includes(q) || 
               nameAr.includes(q) || 
               nameEn.includes(q) || 
               supplier.includes(q) || 
               invRef.includes(q) || 
               notes.includes(q);
      }
      return true;
    });
  }, [allStatutoryCosts, costCategoryFilter, costPropertyFilter, costSearchQuery, propertyMap]);

  // Sorted Statutory Costs
  const sortedCostItems = useMemo(() => {
    const list = [...filteredCostItems];
    list.sort((a, b) => {
      if (costSortBy === 'amount_desc') {
        return D(b.total_cost_egp || b.total_amount || 0).minus(D(a.total_cost_egp || a.total_amount || 0)).toNumber();
      }
      if (costSortBy === 'amount_asc') {
        return D(a.total_cost_egp || a.total_amount || 0).minus(D(b.total_cost_egp || b.total_amount || 0)).toNumber();
      }
      if (costSortBy === 'date_desc') {
        return (b.logged_date || '').localeCompare(a.logged_date || '');
      }
      if (costSortBy === 'date_asc') {
        return (a.logged_date || '').localeCompare(b.logged_date || '');
      }
      if (costSortBy === 'project_asc') {
        const pA = propertyMap.get(a.property_id)?.title_ar || '';
        const pB = propertyMap.get(b.property_id)?.title_ar || '';
        return pA.localeCompare(pB, 'ar');
      }
      return 0;
    });
    return list;
  }, [filteredCostItems, costSortBy, propertyMap]);

  // Pagination for Tab 1
  const costTotalPages = Math.ceil(sortedCostItems.length / costPageSize) || 1;
  const paginatedCostItems = useMemo(() => {
    const start = (costCurrentPage - 1) * costPageSize;
    return sortedCostItems.slice(start, start + costPageSize);
  }, [sortedCostItems, costCurrentPage, costPageSize]);

  const costActiveFiltersCount = 
    (costCategoryFilter !== 'all' ? 1 : 0) +
    (costPropertyFilter !== 'all' ? 1 : 0) +
    (costSearchQuery.trim() ? 1 : 0) +
    (costSortBy !== 'amount_desc' ? 1 : 0);

  const handleResetCostFilters = () => {
    setCostCategoryFilter('all');
    setCostPropertyFilter('all');
    setCostSortBy('amount_desc');
    setCostSearchQuery('');
    setCostCurrentPage(1);
  };

  // ==========================================================================
  // TAB 2 DATA COMPUTATIONS: DISPOSITION TAX ARCHIVE
  // ==========================================================================
  const availableTaxTypes = useMemo(() => {
    const set = new Set<string>();
    taxRecords.forEach(t => {
      if (t.tax_type) set.add(t.tax_type);
    });
    return Array.from(set);
  }, [taxRecords]);

  const getTaxTypeBadge = (taxType: string) => {
    const norm = (taxType || '').toLowerCase();
    if (norm.includes('disposition') || norm.includes('تصرفات') || norm.includes('2.5')) {
      return {
        label: isAr ? 'ضريبة تصرفات عقارية (٢.٥٪)' : 'Disposition Tax (2.5%)',
        color: '#946f23',
        bg: 'rgba(184, 144, 62, 0.08)',
        border: 'rgba(184, 144, 62, 0.25)',
        icon: <Receipt size={12} color="#946f23" />
      };
    }
    if (norm.includes('municipal') || norm.includes('development') || norm.includes('تنمية')) {
      return {
        label: isAr ? 'رسوم تنمية وتطوير' : 'Development Fee',
        color: '#1e40af',
        bg: 'rgba(30, 64, 175, 0.08)',
        border: 'rgba(30, 64, 175, 0.25)',
        icon: <Building2 size={12} color="#1e40af" />
      };
    }
    if (norm.includes('estate') || norm.includes('عقارية') || norm.includes('عوايد')) {
      return {
        label: isAr ? 'ضريبة عقارية (عوايد)' : 'Real Estate Tax',
        color: '#475569',
        bg: 'rgba(71, 85, 105, 0.08)',
        border: 'rgba(71, 85, 105, 0.25)',
        icon: <Landmark size={12} color="#475569" />
      };
    }
    return {
      label: isAr ? (taxType || 'رسوم وضريبة شقة') : (taxType || 'Apartment Fee'),
      color: '#946f23',
      bg: 'rgba(184, 144, 62, 0.08)',
      border: 'rgba(184, 144, 62, 0.25)',
      icon: <ShieldCheck size={12} color="#946f23" />
    };
  };

  const archiveKpis = useMemo(() => {
    const pendingTax = taxRecords
      .filter(t => t.remittance_status !== 'Remitted to ETA')
      .reduce((acc, t) => acc.plus(t.tax_amount || '0'), D(0));
    const remittedTax = taxRecords
      .filter(t => t.remittance_status === 'Remitted to ETA')
      .reduce((acc, t) => acc.plus(t.tax_amount || '0'), D(0));
    const totalTax = pendingTax.plus(remittedTax);

    return {
      pendingTax,
      remittedTax,
      totalTax,
      totalCount: taxRecords.length,
      pendingCount: taxRecords.filter(t => t.remittance_status !== 'Remitted to ETA').length,
      remittedCount: taxRecords.filter(t => t.remittance_status === 'Remitted to ETA').length
    };
  }, [taxRecords]);

  const filteredArchiveTaxes = useMemo(() => {
    return taxRecords.filter(t => {
      const isRemitted = t.remittance_status === 'Remitted to ETA';
      if (archiveStatusFilter === 'pending' && isRemitted) return false;
      if (archiveStatusFilter === 'remitted' && !isRemitted) return false;
      if (archiveTypeFilter !== 'all' && t.tax_type !== archiveTypeFilter) return false;

      if (archiveSearchQuery.trim()) {
        const q = archiveSearchQuery.toLowerCase();
        const linked = contracts.find(c => c.contract_id === t.contract_id);
        const id = (t.tax_id || '').toLowerCase();
        const type = (t.tax_type || '').toLowerCase();
        const unit = (linked?.unit_id || '').toLowerCase();
        const contractNum = (linked?.contract_number || '').toLowerCase();
        const buyer = (linked?.buyer_name || '').toLowerCase();
        return id.includes(q) || type.includes(q) || unit.includes(q) || contractNum.includes(q) || buyer.includes(q);
      }

      return true;
    });
  }, [taxRecords, contracts, archiveStatusFilter, archiveTypeFilter, archiveSearchQuery]);

  const sortedArchiveTaxes = useMemo(() => {
    const list = [...filteredArchiveTaxes];
    list.sort((a, b) => {
      if (archiveSortBy === 'amount_desc') return D(b.tax_amount || '0').minus(D(a.tax_amount || '0')).toNumber();
      if (archiveSortBy === 'amount_asc') return D(a.tax_amount || '0').minus(D(b.tax_amount || '0')).toNumber();
      if (archiveSortBy === 'rate_desc') return D(b.tax_rate || '0').minus(D(a.tax_rate || '0')).toNumber();
      if (archiveSortBy === 'unit_asc') {
        const cA = contracts.find(c => c.contract_id === a.contract_id)?.unit_id || '';
        const cB = contracts.find(c => c.contract_id === b.contract_id)?.unit_id || '';
        return cA.localeCompare(cB);
      }
      return 0;
    });
    return list;
  }, [filteredArchiveTaxes, archiveSortBy, contracts]);

  const archiveTotalPages = Math.ceil(sortedArchiveTaxes.length / archivePageSize) || 1;
  const paginatedArchiveTaxes = useMemo(() => {
    const start = (archiveCurrentPage - 1) * archivePageSize;
    return sortedArchiveTaxes.slice(start, start + archivePageSize);
  }, [sortedArchiveTaxes, archiveCurrentPage, archivePageSize]);

  const archiveActiveFiltersCount = 
    (archiveStatusFilter !== 'all' ? 1 : 0) +
    (archiveTypeFilter !== 'all' ? 1 : 0) +
    (archiveSearchQuery.trim() ? 1 : 0) +
    (archiveSortBy !== 'amount_desc' ? 1 : 0);

  const handleResetArchiveFilters = () => {
    setArchiveStatusFilter('all');
    setArchiveTypeFilter('all');
    setArchiveSortBy('amount_desc');
    setArchiveSearchQuery('');
    setArchiveCurrentPage(1);
  };

  return (
    <div className={styles.stageContainer}>
      {/* 1. Header & Stage Breadcrumb */}
      <div className={styles.stageHeader}>
        <div className={styles.stageTitleArea}>
          <ZFErpBreadcrumb sectionTitle={isAr ? 'ضرائب وتراخيص المشاريع' : 'Project Statutory Taxes & Permits'} icon={<Receipt size={13} color="#946f23" />} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className={styles.stageTitle}>
              {isAr ? 'سجل ضرائب ورسوم وتراخيص المشاريع الإنشائية' : 'Project Statutory Taxes, Permits & Insurance Registry'}
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
              {isAr ? 'تكلفة رأسمالية محملة ع المبنى (WIP 150000)' : 'Capitalized WIP (GL 150000)'}
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
              {isAr ? 'معفى من ضريبة القيمة المضافة (قانون 67 لسنة 2016)' : 'VAT-Exempt Real Estate'}
            </span>
          </div>

          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            {isAr 
              ? 'متابعة الضرائب الإنشائية وتراخيص البناء وتأمينات المقاولات المحملة كرأسمال على المباني (حساب 150000 - مشروعات تحت التنفيذ)، واستردادها عبر معامل الرسملة.' 
              : 'Statutory building permits, municipal utility fees, and contractor insurance capitalized directly into building WIP (Account 150000), recovered via the Realized Sales Value factor.'}
          </p>
        </div>

        {/* Action Button */}
        {onOpenCostModal && (
          <div className={styles.stageActions}>
            <button
              type="button"
              onClick={() => onOpenCostModal()}
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
              <Plus size={16} />
              <span>{isAr ? '+ تسجيل رسم أو ترخيص حكومي جديد' : '+ New Statutory Fee / Permit'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. DUAL MODE SEGMENTED BAR (Building Statutory WIP vs Real Estate Disposition Archive) */}
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
          <button
            type="button"
            onClick={() => setActiveMode('capitalized_costs')}
            style={{
              padding: '0.45rem 1.15rem',
              borderRadius: '8px',
              border: 'none',
              background: activeMode === 'capitalized_costs' ? '#ffffff' : 'transparent',
              color: activeMode === 'capitalized_costs' ? '#0f172a' : '#64748b',
              fontWeight: activeMode === 'capitalized_costs' ? 800 : 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: activeMode === 'capitalized_costs' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <HardHat size={15} color={activeMode === 'capitalized_costs' ? '#946f23' : '#64748b'} />
            <span>{isAr ? 'ضرائب وتراخيص وتأمينات المباني (حساب 150000)' : 'Capitalized Statutory Costs (WIP 150000)'}</span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              background: activeMode === 'capitalized_costs' ? 'rgba(184, 144, 62, 0.12)' : '#e2e8f0',
              color: activeMode === 'capitalized_costs' ? '#946f23' : '#64748b'
            }}>
              {allStatutoryCosts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('disposition_archive')}
            style={{
              padding: '0.45rem 1.15rem',
              borderRadius: '8px',
              border: 'none',
              background: activeMode === 'disposition_archive' ? '#ffffff' : 'transparent',
              color: activeMode === 'disposition_archive' ? '#0f172a' : '#64748b',
              fontWeight: activeMode === 'disposition_archive' ? 800 : 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: activeMode === 'disposition_archive' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Receipt size={15} color={activeMode === 'disposition_archive' ? '#946f23' : '#64748b'} />
            <span>{isAr ? 'أرشيف ضريبة التصرفات العقارية للوحدات (٢.٥٪)' : 'Disposition Tax Archive (2.5%)'}</span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              background: activeMode === 'disposition_archive' ? 'rgba(184, 144, 62, 0.12)' : '#e2e8f0',
              color: activeMode === 'disposition_archive' ? '#946f23' : '#64748b'
            }}>
              {taxRecords.length}
            </span>
          </button>
        </div>

        <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ShieldCheck size={14} color="#15803d" />
          <span>
            {activeMode === 'capitalized_costs' 
              ? (isAr ? 'كل الرسوم الحكومية تضاف لرأس مال المبنى وتسترد تدريجياً عبر كشف حساب العقار' : 'Government fees capitalized into WIP ledger')
              : (isAr ? 'أرشيف رسمي تاريخي لموقف ضريبة التصرفات والتحصيل' : 'Historical disposition tax ledger')}
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODE 1: CAPITALIZED PROJECT STATUTORY COSTS (DEFAULT TAB)           */}
      {/* ==================================================================== */}
      {activeMode === 'capitalized_costs' && (
        <>
          {/* 3. ASYMMETRIC STATUTORY KPIS */}
          <div className={styles.asymmetricBentoGrid}>
            {/* Hero KPI: Total Capitalized Statutory Costs */}
            <ZFKpiCard
              variant="double-bezel"
              isFlagship={true}
              title={isAr ? 'إجمالي الضرائب والتراخيص المحملة ع المشاريع' : 'Total Capitalized Statutory Costs'}
              value={costKpis.totalStatutory.formatEGP(isAr)}
              icon={<Landmark size={20} />}
              accentColor="gold"
              progress={100}
              progressColor="#10b981"
              badge={{ 
                text: `${costKpis.totalCount} ${isAr ? 'إشعار ورسم رسمي' : 'Statutory items'}`, 
                variant: 'gold' 
              }}
              subtitleLabel={isAr ? 'نسبة التحميل الرأسمالي' : 'Capitalization Rate'}
              subtitleValue={isAr ? '100% محمل كرأسمال WIP (حساب 150000)' : '100% Capitalized WIP (GL 150000)'}
            />

            {/* Right Stack: 2 Compact Telemetry Cards */}
            <div className={styles.telemetryStack}>
              <ZFKpiCard
                variant="compact"
                title={isAr ? 'تأمينات اجتماعية ورسوم نقابة المقاولين' : 'Contractor Social Insurance & Syndicate'}
                value={costKpis.totalInsurance.formatEGP(isAr)}
                icon={<ShieldCheck size={16} />}
                accentColor="emerald"
                subtitleLabel={isAr ? 'الموقف الدفتري' : 'Settlement Status'}
                subtitleValue={`${costKpis.insuranceCount} ${isAr ? 'إشعار مسدد بالتأمينات (150000)' : 'Paid to Social Insurance'}`}
              />

              <ZFKpiCard
                variant="compact"
                title={isAr ? 'تراخيص البناء وتصاريح شبكات المرافق' : 'Building Permits & Municipal Utility Connections'}
                value={costKpis.totalPermits.formatEGP(isAr)}
                icon={<FileText size={16} />}
                accentColor="gold"
                subtitleLabel={isAr ? 'تراخيص ومرافق' : 'Approved Permits'}
                subtitleValue={`${costKpis.permitsCount} ${isAr ? 'ترخيص وإيصال معتمد' : 'Approved Permits'}`}
              />
            </div>
          </div>

          {/* 4. Toolbar: Sub-category Tabs, Project Filter, Search, Sort & View Switcher */}
          <ZFFilterToolbar
            tabs={[
              { 
                id: 'all', 
                label: isAr ? 'كل التكاليف الحكومية والتراخيص' : 'All Statutory Costs', 
                count: allStatutoryCosts.length 
              },
              { 
                id: 'permits_engineering', 
                label: isAr ? 'تراخيص وتصاريح البناء الهندسية' : 'Building Permits & Engineering', 
                count: costKpis.permitsCount 
              },
              { 
                id: 'taxes_fees', 
                label: isAr ? 'ضرائب وتأمينات ورسوم حكومية' : 'Taxes, Levies & Insurance', 
                count: costKpis.insuranceCount 
              }
            ]}
            activeTab={costCategoryFilter}
            onTabChange={(tabId) => {
              setCostCategoryFilter(tabId as any);
              setCostCurrentPage(1);
            }}
            searchQuery={costSearchQuery}
            onSearchChange={(q) => {
              setCostSearchQuery(q);
              setCostCurrentPage(1);
            }}
            searchPlaceholder={isAr ? 'دوّر باسم المشروع، الهيئة، رقم الرخصة، أو البيان...' : 'Search by project, authority, license ref...'}
            filters={[
              {
                id: 'property_filter',
                value: costPropertyFilter,
                onChange: (val) => {
                  setCostPropertyFilter(val);
                  setCostCurrentPage(1);
                },
                ariaLabel: isAr ? 'المشروع' : 'Project',
                icon: <Building2 size={13} color="#946f23" />,
                options: [
                  { value: 'all', label: isAr ? 'كل المشاريع والعمارات' : 'All Projects' },
                  ...properties.map(p => ({
                    value: p.id,
                    label: isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar)
                  }))
                ]
              }
            ]}
            sortBy={costSortBy}
            onSortChange={(val) => {
              setCostSortBy(val as any);
              setCostCurrentPage(1);
            }}
            sortOptions={[
              { value: 'amount_desc', label: isAr ? 'المبلغ: الأكبر الأول' : 'Highest Amount' },
              { value: 'amount_asc', label: isAr ? 'المبلغ: الأقل الأول' : 'Lowest Amount' },
              { value: 'date_desc', label: isAr ? 'التاريخ: الأحدث الأول' : 'Newest Date' },
              { value: 'date_asc', label: isAr ? 'التاريخ: الأقدم الأول' : 'Oldest Date' },
              { value: 'project_asc', label: isAr ? 'اسم المشروع: أ - ي' : 'Project (A-Z)' }
            ]}
            sortAriaLabel={isAr ? 'ترتيب التكاليف' : 'Sort Costs'}
            activeFiltersCount={costActiveFiltersCount}
            onResetFilters={handleResetCostFilters}
            viewMode={costViewMode}
            onViewModeChange={(mode) => setCostViewMode(mode as any)}
            isAr={isAr}
          />

          {/* 5. Main Content: Table or Cards */}
          {filteredCostItems.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '3.5rem 2rem',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <Landmark size={40} color="#946f23" style={{ margin: '0 auto 0.85rem' }} />
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem', fontWeight: 800 }}>
                {isAr ? 'لا توجد تكاليف حكومية أو تراخيص مطابقة للبحث' : 'No matching statutory costs found'}
              </h3>
              <p style={{ margin: '0.4rem 0 1.25rem', fontSize: '0.84rem' }}>
                {isAr 
                  ? 'يمكنك إضافة رسم أو ترخيص جديد للمشروع وتحميله على حساب مشروعات تحت التنفيذ (150000).' 
                  : 'You can record a new municipal fee, permit, or insurance cost for this project.'}
              </p>
              {onOpenCostModal && (
                <button
                  type="button"
                  onClick={() => onOpenCostModal(costPropertyFilter !== 'all' ? costPropertyFilter : undefined)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #d4af37 0%, #b8903e 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={15} />
                  <span>{isAr ? 'تسجيل ترخيص أو رسم الآن' : 'Record Permit Now'}</span>
                </button>
              )}
            </div>
          ) : costViewMode === 'table' ? (
            <div className={styles.tableCard}>
              <table className={styles.table} style={{ minWidth: '1200px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '130px', whiteSpace: 'nowrap' }}>{isAr ? 'كود المستند / الإشعار' : 'Doc Ref / Code'}</th>
                    <th style={{ minWidth: '190px' }}>{isAr ? 'العمارة / المشروع' : 'Building / Project'}</th>
                    <th style={{ minWidth: '180px' }}>{isAr ? 'نوع الرسم والتصنيف' : 'Statutory Category'}</th>
                    <th style={{ minWidth: '200px' }}>{isAr ? 'الجهة الحكومية / المورد' : 'Authority / Contractor'}</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>{isAr ? 'رقم الرخصة / الإيصال' : 'Invoice / License Ref'}</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>{isAr ? 'المرحلة الإنشائية' : 'Lifecycle Phase'}</th>
                    <th style={{ minWidth: '140px', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'المبلغ المسدد (جنيه)' : 'Paid Cost'}</th>
                    <th style={{ width: '160px', textAlign: 'center' }}>{isAr ? 'المعالجة المحاسبية' : 'GL Treatment'}</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>{isAr ? 'تاريخ السداد' : 'Logged Date'}</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>{isAr ? 'الحالة' : 'Status'}</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>{isAr ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCostItems.map(item => {
                    const prop = propertyMap.get(item.property_id);
                    const propTitle = isAr ? (prop?.title_ar || prop?.title_en) : (prop?.title_en || prop?.title_ar);
                    const badge = getStatutoryCostBadge(item);
                    const phaseName = getPhaseName(item.phase);
                    const amountVal = item.total_cost_egp || item.total_amount || '0';

                    return (
                      <tr 
                        key={item.item_id || item.id}
                        style={{ cursor: onOpenCostModal ? 'pointer' : 'default' }}
                        onClick={() => onOpenCostModal?.(item.property_id)}
                      >
                        {/* 1. Doc Code */}
                        <td>
                          <span style={{
                            fontFamily: 'monospace',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            color: '#475569',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '0.2rem 0.5rem',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            <Receipt size={11} color="#64748b" />
                            <span>#{item.invoice_ref || (item.item_id ? item.item_id.slice(0, 10).toUpperCase() : 'WIP-TAX')}</span>
                          </span>
                        </td>

                        {/* 2. Building / Project */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: '180px' }}>
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.84rem', lineHeight: 1.35, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Building2 size={13} color="#946f23" />
                              <span>{propTitle || (isAr ? 'مشروع عقاري' : 'Property')}</span>
                            </span>
                            {prop?.location && (
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                {prop.location}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Statutory Category Badge */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.22rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              background: badge.bg,
                              border: `1px solid ${badge.border}`,
                              color: badge.color,
                              width: 'fit-content'
                            }}>
                              {badge.icon}
                              <span>{badge.label}</span>
                            </span>
                            <span style={{ fontSize: '0.73rem', color: '#334155', fontWeight: 600, lineHeight: 1.35 }}>
                              {item.item_name_ar}
                            </span>
                          </div>
                        </td>

                        {/* 4. Authority / Supplier */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#1e293b', fontWeight: 700 }}>
                            <Landmark size={12} color="#64748b" />
                            <span>{item.supplier_contractor || (isAr ? 'جهة حكومية رسمية' : 'Municipal Authority')}</span>
                          </div>
                          {item.notes && (
                            <span style={{ fontSize: '0.71rem', color: '#64748b', display: 'block', marginTop: '0.15rem' }}>
                              {item.notes}
                            </span>
                          )}
                        </td>

                        {/* 5. Official License / Invoice Ref */}
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: '#946f23',
                            background: 'rgba(184, 144, 62, 0.08)',
                            border: '1px solid rgba(184, 144, 62, 0.25)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            display: 'inline-block'
                          }}>
                            {item.invoice_ref || (isAr ? 'إيصال رسمي' : 'Official Receipt')}
                          </span>
                        </td>

                        {/* 6. Lifecycle Phase */}
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            color: '#475569'
                          }}>
                            {phaseName}
                          </span>
                        </td>

                        {/* 7. Paid Cost Amount */}
                        <td style={{ whiteSpace: 'nowrap', textAlign: isAr ? 'left' : 'right' }}>
                          <strong style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>
                            <MoneyCell amount={amountVal} isAr={isAr} highlight />
                          </strong>
                        </td>

                        {/* 8. GL Treatment */}
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.22rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: '#fffbeb',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            color: '#b45309'
                          }}>
                            <span>{isAr ? 'حساب 150000 (WIP)' : 'GL 150000 (WIP)'}</span>
                          </span>
                        </td>

                        {/* 9. Logged Date */}
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                            {item.logged_date}
                          </span>
                        </td>

                        {/* 10. Status */}
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.22rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: '#f0fdf4',
                            border: '1px solid rgba(22, 163, 74, 0.25)',
                            color: '#15803d'
                          }}>
                            <CheckCircle2 size={12} color="#15803d" />
                            <span>{isAr ? 'مُعتمد ومحمل ع المشروع ✓' : 'Capitalized ✓'}</span>
                          </span>
                        </td>

                        {/* 11. Action */}
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onOpenCostModal?.(item.property_id)}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              color: '#946f23',
                              borderRadius: '7px',
                              padding: '0.3rem 0.65rem',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                              transition: 'all 0.15s ease'
                            }}
                            title={isAr ? 'عرض وتدقيق تكاليف العقار' : 'Audit Property Costs'}
                          >
                            <Eye size={12} color="#946f23" />
                            <span>{isAr ? 'تدقيق' : 'Audit'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {paginatedCostItems.map(item => {
                const prop = propertyMap.get(item.property_id);
                const propTitle = isAr ? (prop?.title_ar || prop?.title_en) : (prop?.title_en || prop?.title_ar);
                const badge = getStatutoryCostBadge(item);
                const phaseName = getPhaseName(item.phase);
                const amountVal = item.total_cost_egp || item.total_amount || '0';

                return (
                  <div
                    key={item.item_id || item.id}
                    onClick={() => onOpenCostModal?.(item.property_id)}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '16px',
                      padding: '1.35rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                      cursor: onOpenCostModal ? 'pointer' : 'default',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Header: Doc Ref & Capitalized Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: badge.bg,
                        border: `1px solid ${badge.border}`,
                        color: badge.color
                      }}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>

                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: '#f0fdf4',
                        border: '1px solid rgba(22, 163, 74, 0.25)',
                        color: '#15803d',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}>
                        <CheckCircle2 size={12} color="#15803d" />
                        <span>{isAr ? 'مُعتمد ومحمل ✓' : 'Capitalized'}</span>
                      </span>
                    </div>

                    {/* Building & Item Name */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', color: '#946f23', fontWeight: 800 }}>
                        <Building2 size={13} color="#946f23" />
                        <span>{propTitle || (isAr ? 'مشروع عقاري' : 'Project')}</span>
                        {prop?.location && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#64748b', fontWeight: 600 }}>{prop.location}</span>
                          </>
                        )}
                      </div>
                      <h3 style={{ margin: '0.4rem 0 0', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.4 }}>
                        {item.item_name_ar}
                      </h3>
                      {item.supplier_contractor && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#475569', marginTop: '0.35rem' }}>
                          <Landmark size={12} color="#64748b" />
                          <span>{item.supplier_contractor}</span>
                        </div>
                      )}
                    </div>

                    {/* Financial Block */}
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                          {isAr ? 'المبلغ المسدد بالدفاتر:' : 'Capitalized Amount:'}
                        </span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginTop: '0.2rem' }}>
                          <MoneyCell amount={amountVal} isAr={isAr} highlight />
                        </div>
                      </div>
                      <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                          {isAr ? 'المعالجة:' : 'GL Code:'}
                        </span>
                        <strong style={{ fontSize: '0.82rem', color: '#b45309', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                          {isAr ? 'حساب 150000' : 'Account 150000'}
                        </strong>
                      </div>
                    </div>

                    {/* Footer Info & Audit Trigger */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.74rem',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '0.75rem',
                      marginTop: 'auto'
                    }}>
                      <span style={{ color: '#64748b', fontFamily: 'monospace' }}>
                        {item.invoice_ref ? `#${item.invoice_ref}` : item.logged_date}
                      </span>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#946f23', fontWeight: 800 }}>
                        <span>{isAr ? 'تدقيق تكاليف المبنى' : 'Audit Lifecycle'}</span>
                        <ArrowUpRight size={13} color="#946f23" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Unified Pagination for Tab 1 */}
          <ZFPagination
            currentPage={costCurrentPage}
            totalPages={costTotalPages}
            totalItems={sortedCostItems.length}
            pageSize={costPageSize}
            pageSizeOptions={[10, 25, 50]}
            onPageChange={setCostCurrentPage}
            onPageSizeChange={sz => {
              setCostPageSize(sz);
              setCostCurrentPage(1);
            }}
            isAr={isAr}
            itemLabel={{ ar: 'رسم وترخيص', en: 'statutory items' }}
          />
        </>
      )}

      {/* ==================================================================== */}
      {/* MODE 2: UNIT DISPOSITION TAX ARCHIVE (HISTORICAL RECORD)             */}
      {/* ==================================================================== */}
      {activeMode === 'disposition_archive' && (
        <>
          {/* 3. TAX ARCHIVE RADAR KPIS */}
          <div className={styles.asymmetricBentoGrid}>
            <ZFKpiCard
              variant="double-bezel"
              isFlagship={true}
              title={isAr ? 'إجمالي أرشيف ضريبة التصرفات العقارية' : 'Total Disposition Tax Archive Pool'}
              value={archiveKpis.totalTax.formatEGP(isAr)}
              icon={<Landmark size={20} />}
              accentColor="gold"
              progress={archiveKpis.totalTax.isZero() ? 0 : archiveKpis.remittedTax.div(archiveKpis.totalTax).times(100).toFixed(1)}
              progressColor="#10b981"
              badge={{ text: `${archiveKpis.totalCount} ${isAr ? 'شقة وعقد' : 'tax records'}`, variant: 'gold' }}
              subtitleLabel={isAr ? 'المسدد فعلياً' : 'Settlement Ratio'}
              subtitleValue={`${archiveKpis.totalTax.isZero() ? '0' : archiveKpis.remittedTax.div(archiveKpis.totalTax).times(100).toFixed(1)}% (${archiveKpis.remittedTax.formatEGP(isAr)})`}
            />

            <div className={styles.telemetryStack}>
              <ZFKpiCard
                variant="compact"
                title={isAr ? 'ضرائب ورسوم باقية ما اتسددتش' : 'Pending Taxes & Fees'}
                value={archiveKpis.pendingTax.formatEGP(isAr)}
                icon={<FileText size={16} />}
                accentColor="rose"
                subtitleLabel={isAr ? 'الموقف الحالي' : 'Status'}
                subtitleValue={`${archiveKpis.pendingCount} ${isAr ? 'عقود لسه عليها رسوم' : 'pending collection'}`}
              />

              <ZFKpiCard
                variant="compact"
                title={isAr ? 'اتحصلت ودخلت الخزنة' : 'Settled Taxes in Safe'}
                value={archiveKpis.remittedTax.formatEGP(isAr)}
                icon={<CheckCircle2 size={16} />}
                accentColor="emerald"
                subtitleLabel={isAr ? 'حساب الإيداع' : 'GL Account'}
                subtitleValue={isAr ? 'اتحصلت في الخزنة' : 'collected in 101000'}
              />
            </div>
          </div>

          {/* 4. Toolbar: Status Tabs, Search & View Switcher */}
          <ZFFilterToolbar
            tabs={[
              { id: 'all', label: isAr ? 'كل الشقق والعقود' : 'All Records', count: taxRecords.length },
              { id: 'pending', label: isAr ? 'مستحق وما اتسددش' : 'Pending', count: archiveKpis.pendingCount },
              { id: 'remitted', label: isAr ? 'متسدد خلاص' : 'Settled', count: archiveKpis.remittedCount }
            ]}
            activeTab={archiveStatusFilter}
            onTabChange={(tabId) => {
              setArchiveStatusFilter(tabId as any);
              setArchiveCurrentPage(1);
            }}
            searchQuery={archiveSearchQuery}
            onSearchChange={(q) => {
              setArchiveSearchQuery(q);
              setArchiveCurrentPage(1);
            }}
            searchPlaceholder={isAr ? 'دوّر برقم العقد، الشقة، أو اسم العميل...' : 'Search taxes...'}
            filters={
              availableTaxTypes.length > 1
                ? [
                    {
                      id: 'tax_type',
                      value: archiveTypeFilter,
                      onChange: (val) => {
                        setArchiveTypeFilter(val);
                        setArchiveCurrentPage(1);
                      },
                      ariaLabel: isAr ? 'نوع الرسم' : 'Tax Type',
                      options: [
                        { value: 'all', label: isAr ? 'كل الرسوم والضرائب' : 'All Tax Types' },
                        ...availableTaxTypes.map(t => ({ value: t, label: t }))
                      ]
                    }
                  ]
                : undefined
            }
            sortBy={archiveSortBy}
            onSortChange={(val) => {
              setArchiveSortBy(val as any);
              setArchiveCurrentPage(1);
            }}
            sortOptions={[
              { value: 'amount_desc', label: isAr ? 'المبلغ: الأكبر الأول' : 'Highest Tax Amount' },
              { value: 'amount_asc', label: isAr ? 'المبلغ: الأقل الأول' : 'Lowest Tax Amount' },
              { value: 'rate_desc', label: isAr ? 'النسبة: الأكبر الأول' : 'Highest Rate' },
              { value: 'unit_asc', label: isAr ? 'رقم الشقة: أ - ي' : 'Unit ID (A-Z)' }
            ]}
            sortAriaLabel={isAr ? 'ترتيب الرسوم' : 'Sort Taxes'}
            activeFiltersCount={archiveActiveFiltersCount}
            onResetFilters={handleResetArchiveFilters}
            viewMode={archiveViewMode}
            onViewModeChange={(mode) => setArchiveViewMode(mode as any)}
            isAr={isAr}
          />

          {/* 5. Main Content: Table or Cards */}
          {filteredArchiveTaxes.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '3rem 2rem',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <Landmark size={36} color="#946f23" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>
                {isAr ? 'مفيش ضرائب أو رسوم مطابقة للبحث أو الفلتر' : 'No matching tax records found'}
              </h3>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
                {isAr ? 'كل الضرائب والرسوم متسددة ومضبوطة بالدفاتر.' : 'All apartment tax records have been reconciled.'}
              </p>
            </div>
          ) : archiveViewMode === 'table' ? (
            <div 
              className={styles.tableCard}
              style={{
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 transparent'
              }}
            >
              <table className={styles.table} style={{ minWidth: '1180px', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '110px', whiteSpace: 'nowrap' }}>{isAr ? 'كود الإشعار' : 'Tax Code'}</th>
                    <th style={{ minWidth: '160px' }}>{isAr ? 'نوع الرسم أو الضريبة' : 'Tax Assessment'}</th>
                    <th style={{ minWidth: '220px', maxWidth: '300px' }}>{isAr ? 'العميل والعقد والوحدة' : 'Customer & Unit'}</th>
                    <th style={{ minWidth: '130px', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'سعر الشقة الأصلي' : 'Base Price'}</th>
                    <th style={{ minWidth: '150px', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'قيمة الضريبة والنسبة' : 'Tax & Rate'}</th>
                    <th style={{ minWidth: '140px', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'إجمالي السعر بالضريبة' : 'Total with Tax'}</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>{isAr ? 'حالة السداد' : 'Status'}</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>{isAr ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedArchiveTaxes.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                        {isAr ? 'مفيش ضرائب أو رسوم مطابقة للبحث أو الفلتر.' : 'No tax records match the current filters.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedArchiveTaxes.map(t => {
                      const linkedContract = contracts.find(c => c.contract_id === t.contract_id);
                      const propertyTitle = linkedContract?.property_id ? (propertyMap.get(linkedContract.property_id)?.title_ar || propertyMap.get(linkedContract.property_id)?.title_en) : '';
                      const unitIdStr = linkedContract?.unit_id || '';
                      const propTitleStr = propertyTitle || '';
                      let displayUnit = unitIdStr;
                      let displaySubProperty = '';

                      if (propTitleStr && unitIdStr) {
                        if (unitIdStr.trim() === propTitleStr.trim() || unitIdStr.includes(propTitleStr)) {
                          displayUnit = unitIdStr;
                        } else if (propTitleStr.includes(unitIdStr)) {
                          displayUnit = propTitleStr;
                        } else {
                          displayUnit = unitIdStr;
                          displaySubProperty = propTitleStr;
                        }
                      } else {
                        displayUnit = unitIdStr || propTitleStr || (isAr ? 'وحدة سكنية' : 'Property Unit');
                      }

                      const totalVal = D(t.taxable_base).plus(t.tax_amount).toFixed(2);
                      const isRemitted = t.remittance_status === 'Remitted to ETA';
                      const taxBadge = getTaxTypeBadge(t.tax_type);
                      const buyerDisplayName = isAr ? localizeBuyerName(linkedContract?.buyer_name || 'عميل مباشر') : (linkedContract?.buyer_name || 'Direct Client');

                      return (
                        <tr 
                          key={t.tax_id}
                          onClick={() => onInspectTax(t)}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* 1. Tax Code */}
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontVariantNumeric: 'tabular-nums',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              color: '#475569',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '0.2rem 0.5rem',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}>
                              <Receipt size={11} color="#64748b" />
                              <span>#TX-{t.tax_id.slice(0, 8).toUpperCase()}</span>
                            </span>
                          </td>

                          {/* 2. Assessment Type Badge */}
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.22rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              background: taxBadge.bg,
                              border: `1px solid ${taxBadge.border}`,
                              color: taxBadge.color,
                              whiteSpace: 'nowrap'
                            }}>
                              {taxBadge.icon}
                              <span>{taxBadge.label}</span>
                            </span>
                          </td>

                          {/* 3. Customer, Unit & Contract */}
                          <td style={{ minWidth: '220px', maxWidth: '300px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.84rem', lineHeight: 1.3 }}>
                                {buyerDisplayName}
                              </span>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.35rem', 
                                fontSize: '0.74rem', 
                                color: '#334155', 
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                <Building2 size={12} color="#946f23" style={{ flexShrink: 0 }} />
                                <span 
                                  style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                  title={displayUnit}
                                >
                                  {displayUnit}
                                </span>
                                {displaySubProperty && (
                                  <span 
                                    style={{ color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}
                                    title={displaySubProperty}
                                  >
                                    • {displaySubProperty}
                                  </span>
                                )}
                              </div>
                              {linkedContract?.contract_number && (
                                <div style={{ fontSize: '0.7rem', color: '#64748b', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <FileText size={11} color="#94a3b8" />
                                  <span>{isAr ? 'عقد رقم: ' : 'Contract #'}</span>
                                  <span style={{ fontWeight: 700, color: '#946f23' }}>
                                    #{linkedContract.contract_number}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 4. Base Price */}
                          <td style={{ whiteSpace: 'nowrap', textAlign: isAr ? 'left' : 'right' }}>
                            <span style={{ color: '#334155', fontWeight: 600 }}>
                              <MoneyCell amount={t.taxable_base} isAr={isAr} />
                            </span>
                          </td>

                          {/* 5. Tax Amount & Rate */}
                          <td style={{ whiteSpace: 'nowrap', textAlign: isAr ? 'left' : 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                              <strong style={{ fontWeight: 800, color: '#0f172a' }}>
                                <MoneyCell amount={t.tax_amount} isAr={isAr} highlight />
                              </strong>
                              <span style={{
                                fontVariantNumeric: 'tabular-nums',
                                fontWeight: 800,
                                fontSize: '0.68rem',
                                color: '#946f23',
                                background: 'rgba(184, 144, 62, 0.08)',
                                border: '1px solid rgba(184, 144, 62, 0.25)',
                                padding: '0.12rem 0.4rem',
                                borderRadius: '4px'
                              }}>
                                {D(t.tax_rate).times(100).toFixed(1)}%
                              </span>
                            </div>
                          </td>

                          {/* 6. Total Price with Tax */}
                          <td style={{ whiteSpace: 'nowrap', textAlign: isAr ? 'left' : 'right' }}>
                            <strong style={{ fontWeight: 900, color: '#0f172a' }}>
                              <MoneyCell amount={totalVal} isAr={isAr} />
                            </strong>
                          </td>

                          {/* 7. Status */}
                          <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.22rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              background: isRemitted ? 'rgba(21, 128, 61, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                              color: isRemitted ? '#15803d' : '#b45309',
                              border: isRemitted ? '1px solid rgba(21, 128, 61, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)'
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isRemitted ? '#15803d' : '#b45309', display: 'inline-block' }} />
                              <span>{isRemitted ? (isAr ? 'مُسددة بالخزينة ✓' : 'Settled in Safe') : (isAr ? 'مستحقة السداد' : 'Pending Settlement')}</span>
                            </span>
                          </td>

                          {/* 8. Actions */}
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              {!isRemitted && (
                                <button
                                  type="button"
                                  onClick={() => onRemitTax(t.tax_id)}
                                  disabled={isMutating}
                                  className={styles.settleBtn}
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                                  title={isAr ? 'تسجيل سداد الضريبة كاش في الخزينة' : 'Settle Tax in Safe'}
                                >
                                  <CheckCircle2 size={12} color="#ffffff" />
                                  <span>{isAr ? 'سداد كاش' : 'Settle'}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onInspectTax(t)}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  color: '#946f23',
                                  borderRadius: '7px',
                                  padding: '0.3rem 0.65rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                  transition: 'all 0.15s ease'
                                }}
                                title={isAr ? 'عرض التفاصيل والإشعار' : 'Inspect Assessment'}
                              >
                                <Eye size={12} color="#946f23" />
                                <span>{isRemitted ? (isAr ? 'عرض الإيصال' : 'Receipt') : (isAr ? 'تفاصيل' : 'Inspect')}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
        ) : (
          <div className={styles.cardsGrid}>
            {paginatedArchiveTaxes.map(t => {
              const linkedContract = contracts.find(c => c.contract_id === t.contract_id);
              const propertyTitle = linkedContract?.property_id ? (propertyMap.get(linkedContract.property_id)?.title_ar || propertyMap.get(linkedContract.property_id)?.title_en) : '';
              const unitIdStr = linkedContract?.unit_id || '';
              const propTitleStr = propertyTitle || '';
              let displayUnit = unitIdStr;
              let displaySubProperty = '';

              if (propTitleStr && unitIdStr) {
                if (unitIdStr.trim() === propTitleStr.trim() || unitIdStr.includes(propTitleStr)) {
                  displayUnit = unitIdStr;
                } else if (propTitleStr.includes(unitIdStr)) {
                  displayUnit = propTitleStr;
                } else {
                  displayUnit = unitIdStr;
                  displaySubProperty = propTitleStr;
                }
              } else {
                displayUnit = unitIdStr || propTitleStr || (isAr ? 'وحدة سكنية' : 'Property Unit');
              }

              const totalVal = D(t.taxable_base).plus(t.tax_amount).toFixed(2);
              const isRemitted = t.remittance_status === 'Remitted to ETA';
              const taxBadge = getTaxTypeBadge(t.tax_type);
              const buyerDisplayName = isAr ? localizeBuyerName(linkedContract?.buyer_name || 'عميل مباشر') : (linkedContract?.buyer_name || 'Direct Client');

              return (
                <div
                  key={t.tax_id}
                  onClick={() => onInspectTax(t)}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '16px',
                    padding: '1.35rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: taxBadge.bg,
                      border: `1px solid ${taxBadge.border}`,
                      color: taxBadge.color
                    }}>
                      {taxBadge.icon}
                      <span>{taxBadge.label}</span>
                    </span>

                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: isRemitted ? 'rgba(21, 128, 61, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                      border: `1px solid ${isRemitted ? 'rgba(21, 128, 61, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                      color: isRemitted ? '#15803d' : '#b45309',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isRemitted ? '#15803d' : '#b45309', display: 'inline-block' }} />
                      <span>{isRemitted ? (isAr ? 'مُسددة بالخزينة ✓' : 'Settled in Safe') : (isAr ? 'مستحقة السداد' : 'Pending')}</span>
                    </span>
                  </div>

                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.4 }}>
                      {buyerDisplayName}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', color: '#64748b', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      <Building2 size={12} color="#946f23" style={{ flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, color: '#334155' }}>
                        {displayUnit}
                      </span>
                      {displaySubProperty && (
                        <>
                          <span>•</span>
                          <span style={{ color: '#475569' }}>{displaySubProperty}</span>
                        </>
                      )}
                      {linkedContract?.contract_number && (
                        <>
                          <span>•</span>
                          <span style={{
                            fontVariantNumeric: 'tabular-nums',
                            color: '#946f23',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            direction: 'ltr',
                            unicodeBidi: 'isolate'
                          }}>
                            #{linkedContract.contract_number}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                        {isAr ? 'قيمة الضريبة والرسوم:' : 'Tax Assessment Amount:'}
                      </span>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginTop: '0.2rem' }}>
                        <MoneyCell amount={t.tax_amount} isAr={isAr} highlight />
                      </div>
                    </div>
                    <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                        {isAr ? 'النسبة:' : 'Rate:'}
                      </span>
                      <strong style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                        {D(t.tax_rate).times(100).toFixed(1)}%
                      </strong>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '0.75rem'
                  }}>
                    <span style={{ color: '#64748b' }}>{isAr ? 'إجمالي السعر شامل الرسوم:' : 'Total with tax:'}</span>
                    <strong style={{ color: '#0f172a' }}><MoneyCell amount={totalVal} isAr={isAr} /></strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: '0.5rem' }}>
                    {!isRemitted ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemitTax(t.tax_id);
                        }}
                        disabled={isMutating}
                        className={styles.settleBtn}
                      >
                        <CheckCircle2 size={13} color="#ffffff" />
                        <span>{isAr ? 'تسجيل السداد كاش' : 'Settle in Safe'}</span>
                      </button>
                    ) : (
                      <span style={{ color: '#15803d', fontWeight: 800, fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle2 size={13} color="#15803d" />
                        <span>{isAr ? 'مُسددة بالخزينة ✓' : 'Settled in Safe'}</span>
                      </span>
                    )}

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#946f23', fontSize: '0.74rem', fontWeight: 800 }}>
                      <span>{isAr ? 'عرض التفاصيل' : 'Inspect'}</span>
                      <ArrowUpRight size={13} color="#946f23" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Unified Pagination for Tab 2 */}
        <ZFPagination
          currentPage={archiveCurrentPage}
          totalPages={archiveTotalPages}
          totalItems={sortedArchiveTaxes.length}
          pageSize={archivePageSize}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={setArchiveCurrentPage}
          onPageSizeChange={sz => {
            setArchivePageSize(sz);
            setArchiveCurrentPage(1);
          }}
          isAr={isAr}
          itemLabel={{ ar: 'شقة وعقد', en: 'tax records' }}
        />
        </>
      )}
    </div>
  );
};
