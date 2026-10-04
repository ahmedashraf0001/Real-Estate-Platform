/**
 * Zakaria Farid Real Estate ERP — Properties Portfolio View (FIN-OS v2 Overhaul)
 * Authoritative executive workstation view for properties and units.
 * Features:
 * 1. Side Widgets docking into `#zf-side-widgets-slot` via <PropertiesSideWidgets>
 * 2. 3 Executive Workstation Tabs:
 *    - 'showcase' (المشروعات والعمارات): Redesigned 3-per-row cards with rich metrics and progress
 *    - 'matrix' (مصفوفة الوحدات والأدوار): Canonical table with floor sectioning, default shrink
 *    - 'analytics' (الرسوم البيانية والتحليلات): 5 visual analytics charts from CAD reference blueprint
 * 3. Egyptian Real Estate cartography modal and manual apartment tax editing
 */

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Layers, 
  Plus, 
  Calculator, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  LayoutGrid, 
  List, 
  X, 
  Wallet, 
  CheckCircle2, 
  Compass, 
  TrendingUp, 
  ShieldCheck, 
  LineChart 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPContract, ERPPropertyCostItem, ERPCostAllocation, ERPJournalEntry } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { 
  FlatInventoryUnit, 
  SHOWCASE_DEFAULT_PAGE_SIZE,
  isWholeBuildingSold,
  isUnitSold,
  isPropertyAvailableForContract
} from '@/lib/erp/propertiesPortfolioCalculations';

import { PropertiesSideWidgets } from './properties/PropertiesSideWidgets';
import { PropertiesInventoryKpis } from './properties/PropertiesInventoryKpis';
import { ProjectShowcaseCard } from './properties/ProjectShowcaseCard';
import { UnitsFloorMatrixTable } from './properties/UnitsFloorMatrixTable';
import { PropertiesAnalyticsView } from './properties/PropertiesAnalyticsView';
import { ERPPortfolioMapModal } from './properties/ERPPortfolioMapModal';

import styles from './PropertiesPortfolioView.module.css';
import shellStyles from '../ZFWorkstationShell.module.css';

export const PROPERTY_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  apartment: { ar: 'شقق سكنية', en: 'Apartments' },
  building: { ar: 'عمارات ومباني', en: 'Buildings' },
  villa: { ar: 'فيلات وقصور', en: 'Villas' },
  duplex: { ar: 'دوبلكس', en: 'Duplex' },
  penthouse: { ar: 'بنتهاوس', en: 'Penthouse' },
  townhouse: { ar: 'تاون هاوس', en: 'Townhouse' },
  commercial: { ar: 'تجاري وإداري', en: 'Commercial' },
  office: { ar: 'مكاتب إدارية', en: 'Offices' },
  garage: { ar: 'جراجات ومواقف', en: 'Garages' },
  chalet: { ar: 'شاليهات ساحلية', en: 'Chalets' },
  land: { ar: 'أراضي ومواقع', en: 'Land' },
  other: { ar: 'وحدات أخرى', en: 'Other' },
};

export const getPropertyTypeLabel = (rawType?: string | null, isAr: boolean = true): string => {
  if (!rawType) return isAr ? 'مشروع عقاري' : 'Property';
  const key = rawType.toLowerCase().trim();
  const entry = PROPERTY_TYPE_LABELS[key];
  if (entry) return isAr ? entry.ar : entry.en;
  return rawType.charAt(0).toUpperCase() + rawType.slice(1);
};

export const PROJECTS_PER_ROW = 3;

export interface PropertiesPortfolioViewProps {
  properties: Property[];
  contracts: ERPContract[];
  propertyCosts?: ERPPropertyCostItem[];
  costAllocations?: ERPCostAllocation[];
  journalEntries?: ERPJournalEntry[];
  initialMasterTab?: 'portfolio' | 'rsv' | 'showcase' | 'matrix' | 'analytics';
  initialSearchQuery?: string;
  isAr?: boolean;
  isMutating?: boolean;
  onOpenNewContract: () => void;
  onOpenContractForProperty: (property: Property, unit?: BuildingUnitItem) => void;
  onOpenCalculatorForProperty: (property: Property) => void;
  onOpenAuditForProperty?: (property: Property) => void;
  onUpdatePropertyUnitTax?: (propertyId: string, unitId: string, taxAmount: number, taxDesc?: string) => Promise<void>;
  onOpenNewAllocation?: () => void;
  onInspectRSV?: (allocation: ERPCostAllocation) => void;
}

export const PropertiesPortfolioView: React.FC<PropertiesPortfolioViewProps> = ({
  properties,
  contracts,
  propertyCosts = [],
  costAllocations = [],
  journalEntries = [],
  initialMasterTab = 'showcase',
  initialSearchQuery = '',
  isAr = true,
  isMutating = false,
  onOpenNewContract,
  onOpenContractForProperty,
  onOpenCalculatorForProperty,
  onOpenAuditForProperty,
  onUpdatePropertyUnitTax,
  onOpenNewAllocation,
  onInspectRSV,
}) => {
  const router = useRouter();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [selectedCategoryPill, setSelectedCategoryPill] = useState<string>('all');
  const [filterUnitType, setFilterUnitType] = useState<string>('all');
  const [filterPropertyId, setFilterPropertyId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterCompletionStatus, setFilterCompletionStatus] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  // Selected Project filter (when isolated or clicked from cards/widgets)
  const [selectedProjectIdForTable, setSelectedProjectIdForTable] = useState<string | null>(null);

  // View Mode: 'grid' vs 'list'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Showcase Cards pagination (High-density responsive grid)
  const [projectCardPageIndex, setProjectCardPageIndex] = useState<number>(0);

  // Workstation Stage Sub-Tabs: 'showcase' | 'matrix' | 'analytics'
  const [activeTab, setActiveTab] = useState<'showcase' | 'matrix' | 'analytics'>(() => {
    if (initialMasterTab === 'matrix') return 'matrix';
    if (initialMasterTab === 'analytics') return 'analytics';
    return 'showcase';
  });

  const handleSelectTab = useCallback((tab: 'showcase' | 'matrix' | 'analytics') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.location) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('sub', tab);
        window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
      } catch {
        // Safe fallback in mocked or SSR environments
      }
    }
  }, []);

  useEffect(() => {
    if (initialMasterTab === 'matrix') setActiveTab('matrix');
    else if (initialMasterTab === 'analytics') setActiveTab('analytics');
    else if (initialMasterTab === 'showcase' || initialMasterTab === 'portfolio') setActiveTab('showcase');
  }, [initialMasterTab]);

  useEffect(() => {
    setProjectCardPageIndex(0);
  }, [selectedCategoryPill, searchQuery, filterUnitType, filterPropertyId, filterStatus, filterCity, filterCompletionStatus, minPrice, maxPrice]);

  // Modals
  const [isFullMapOpen, setIsFullMapOpen] = useState<boolean>(false);
  const [editingTaxUnit, setEditingTaxUnit] = useState<{
    unitId: string;
    unitNumber: string;
    propertyId: string;
    basePrice: number;
    taxAmount: string;
    taxDesc: string;
  } | null>(null);
  const [isSavingTax, setIsSavingTax] = useState<boolean>(false);

  const handleSaveUnitTax = async () => {
    if (!editingTaxUnit) return;
    setIsSavingTax(true);
    try {
      const taxAmt = parseFloat(editingTaxUnit.taxAmount) || 0;
      if (onUpdatePropertyUnitTax) {
        await onUpdatePropertyUnitTax(
          editingTaxUnit.propertyId,
          editingTaxUnit.unitId,
          taxAmt,
          editingTaxUnit.taxDesc
        );
      }
      setEditingTaxUnit(null);
    } catch (err) {
      console.error('Failed to save manual apartment tax:', err);
    } finally {
      setIsSavingTax(false);
    }
  };

  // Check if a property is fully contracted
  const isPropertyFullyContracted = useCallback((p: Property): boolean => {
    return !isPropertyAvailableForContract(p, contracts);
  }, [contracts]);

  // Apply filters trigger from side widgets (instant table & showcase synchronization)
  const handleApplyFilters = useCallback(() => {
    setProjectCardPageIndex(0);
    if (typeof document !== 'undefined') {
      const target = document.getElementById('properties-workspace-stage');
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, []);

  // Extract all inventory units (Flattened Units List)
  const allInventoryUnits = useMemo<FlatInventoryUnit[]>(() => {
    const unitsList: FlatInventoryUnit[] = [];

    const multiUnitBuildings = properties.filter(p => (p.building_units && p.building_units.length > 0) || p.type === 'building');
    const standaloneProps = properties.filter(p => !((p.building_units && p.building_units.length > 0) || p.type === 'building'));
    const orderedProps = [...multiUnitBuildings, ...standaloneProps];

    orderedProps.forEach((p) => {
      const pTitle = isAr ? (p.title_ar || p.title_en || 'مشروع عقاري') : (p.title_en || p.title_ar || 'Property');
      const bUnits = p.building_units || [];
      const isMasterSold = isWholeBuildingSold(p, contracts);

      if (bUnits.length > 0) {
        bUnits.forEach((u) => {
          const isUnitContracted = isUnitSold(p, u, contracts);
          const isReserved = !isUnitContracted && u.status === 'reserved';
          const uStatus: 'available' | 'reserved' | 'contracted' = isUnitContracted ? 'contracted' : isReserved ? 'reserved' : 'available';

          const basePrice = (u.price_egp || 0) + (u.tax_amount_egp || 0);
          const area = u.area_sqm || 0;

          const uNumLower = (u.unit_number || '').toLowerCase();
          const pTitleLower = pTitle.toLowerCase();
          let derivedUnitType = isAr ? 'شقق سكنية' : 'Apartments';
          if (uNumLower.includes('روف') || uNumLower.includes('roof') || uNumLower.includes('بنتهاوس') || uNumLower.includes('دوبلكس')) {
            derivedUnitType = isAr ? 'دوبلكس وبنتهاوس' : 'Duplex & Penthouse';
          } else if (uNumLower.includes('تجاري') || uNumLower.includes('إداري') || uNumLower.includes('مكتب') || pTitleLower.includes('تجاري')) {
            derivedUnitType = isAr ? 'تجاري وإداري' : 'Commercial';
          }

          unitsList.push({
            id: u.unit_id,
            propertyId: p.id,
            projectTitle: pTitle,
            unitType: derivedUnitType,
            unitNumber: u.unit_number || 'وحدة',
            floor: u.floor ?? 0,
            areaSqm: area,
            totalPrice: basePrice,
            downPayment: Math.round(basePrice * 0.2),
            monthlyInstallment: Math.round((basePrice * 0.8) / 36),
            status: uStatus,
            location: p.location || '',
            property: p,
            buildingUnit: u,
          });
        });
      } else {
        const isPropContracted = isMasterSold;
        const isReserved = !isPropContracted && p.listing_status === 'under_offer';
        const uStatus: 'available' | 'reserved' | 'contracted' = isPropContracted ? 'contracted' : isReserved ? 'reserved' : 'available';

        const basePrice = p.price_egp || 0;
        const area = p.area_sqm || 0;

        const pTitleLower = ((p.title_ar || '') + ' ' + (p.title_en || '')).toLowerCase();
        let singleType = getPropertyTypeLabel(p.type, isAr);
        if (pTitleLower.includes('دوبلكس') || pTitleLower.includes('بنتهاوس') || pTitleLower.includes('روف') || pTitleLower.includes('roof')) {
          singleType = isAr ? 'دوبلكس وبنتهاوس' : 'Duplex & Penthouse';
        } else if (pTitleLower.includes('فيلا') || pTitleLower.includes('قصر') || pTitleLower.includes('villa') || pTitleLower.includes('mansion')) {
          singleType = isAr ? 'فيلات وقصور' : 'Villas & Mansions';
        } else if (pTitleLower.includes('جراج') || pTitleLower.includes('تجاري') || pTitleLower.includes('مكتب') || pTitleLower.includes('garage') || pTitleLower.includes('commercial')) {
          singleType = isAr ? 'تجاري وإداري' : 'Commercial';
        }

        unitsList.push({
          id: p.id,
          propertyId: p.id,
          projectTitle: pTitle,
          unitType: singleType,
          unitNumber: p.title_ar || p.title_en || '1',
          floor: 0,
          areaSqm: area,
          totalPrice: basePrice,
          downPayment: Math.round(basePrice * 0.2),
          monthlyInstallment: Math.round((basePrice * 0.8) / 36),
          status: uStatus,
          location: p.location || '',
          property: p,
        });
      }
    });

    return unitsList;
  }, [properties, contracts, isAr]);

  // Unique Cities list for filter
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    properties.forEach(p => {
      if (p.location) {
        const loc = p.location.split('-')[0].split(',')[0].trim();
        if (loc) set.add(loc);
      }
    });
    return Array.from(set);
  }, [properties]);

  // Dynamic Type Pills
  const dynamicTypePills = useMemo(() => {
    const pills: { key: string; label: string; count: number }[] = [
      { key: 'all', label: isAr ? 'كافة المشروعات' : 'All Properties', count: properties.length }
    ];

    const typeCountMap = new Map<string, number>();
    properties.forEach(p => {
      const typeKey = (p.type || '').toLowerCase().trim() || 'other';
      typeCountMap.set(typeKey, (typeCountMap.get(typeKey) || 0) + 1);
    });

    Array.from(typeCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([typeKey, count]) => {
        pills.push({
          key: typeKey,
          label: getPropertyTypeLabel(typeKey, isAr),
          count
        });
      });

    return pills;
  }, [properties, isAr]);

  // Reset all filters
  const handleResetAllFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategoryPill('all');
    setFilterUnitType('all');
    setFilterPropertyId('all');
    setFilterStatus('all');
    setFilterCity('all');
    setFilterCompletionStatus('all');
    setMinPrice('');
    setMaxPrice('');
    setSelectedProjectIdForTable(null);
    setProjectCardPageIndex(0);
  }, []);

  // Filtered Projects for Showcase
  const filteredProjects = useMemo(() => {
    return properties.filter(p => {
      const titleLower = ((p.title_ar || '') + ' ' + (p.title_en || '')).toLowerCase();
      const locLower = (p.location || '').toLowerCase();
      const typeLower = (p.type || '').toLowerCase().trim();

      if (selectedCategoryPill !== 'all' && typeLower !== selectedCategoryPill) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = titleLower.includes(q);
        const matchLoc = locLower.includes(q);
        const matchType = typeLower.includes(q);
        if (!matchTitle && !matchLoc && !matchType) return false;
      }

      if (filterUnitType !== 'all') {
        const bUnits = p.building_units || [];
        if (bUnits.length > 0) {
          const hasMatchingType = bUnits.some(u => {
            const uText = ((u.unit_number || '') + ' ' + (p.title_ar || '') + ' ' + (p.title_en || '')).toLowerCase();
            if (filterUnitType === 'duplex' && uText.includes('دوبلكس')) return true;
            if (filterUnitType === 'penthouse' && (uText.includes('بنتهاوس') || uText.includes('روف') || uText.includes('roof'))) return true;
            if (filterUnitType === 'apartment') return true;
            if (filterUnitType === 'office' && (uText.includes('مكتب') || uText.includes('تجاري') || uText.includes('إداري'))) return true;
            if (filterUnitType === 'villa' && uText.includes('فيلا')) return true;
            if (filterUnitType === 'chalet' && uText.includes('شاليه')) return true;
            return false;
          });
          if (!hasMatchingType) return false;
        } else {
          if (filterUnitType === 'villa' && !typeLower.includes('villa') && !titleLower.includes('فيلا')) return false;
          if (filterUnitType === 'chalet' && !typeLower.includes('chalet') && !titleLower.includes('شاليه')) return false;
          if (filterUnitType === 'duplex' && !titleLower.includes('دوبلكس')) return false;
          if (filterUnitType === 'penthouse' && !titleLower.includes('بنتهاوس') && !titleLower.includes('روف')) return false;
          if (filterUnitType === 'apartment' && typeLower !== 'apartment') return false;
          if (filterUnitType === 'office' && !typeLower.includes('commercial') && !typeLower.includes('office')) return false;
        }
      }

      if (filterPropertyId !== 'all' && p.id !== filterPropertyId) {
        return false;
      }

      if (filterCity !== 'all' && !locLower.includes(filterCity.toLowerCase())) {
        return false;
      }

      if (filterStatus !== 'all') {
        const isContracted = isPropertyFullyContracted(p);
        if (filterStatus === 'available' && isContracted) return false;
        if (filterStatus === 'contracted' && !isContracted) return false;
      }

      if (filterCompletionStatus !== 'all') {
        const comp = p.completion_status;
        const pct = p.completion_percentage;
        if (filterCompletionStatus === 'ready') {
          if (comp !== 'ready' && (typeof pct !== 'number' || pct < 100)) return false;
        } else if (filterCompletionStatus === 'off_plan') {
          if (comp === 'ready' && (typeof pct !== 'number' || pct >= 100)) return false;
        }
      }

      if (minPrice.trim()) {
        const minVal = parseFloat(minPrice);
        if (!isNaN(minVal) && (p.price_egp || 0) < minVal) return false;
      }

      if (maxPrice.trim()) {
        const maxVal = parseFloat(maxPrice);
        if (!isNaN(maxVal) && (p.price_egp || 0) > maxVal) return false;
      }

      return true;
    });
  }, [properties, selectedCategoryPill, searchQuery, filterUnitType, filterPropertyId, filterCity, filterStatus, filterCompletionStatus, minPrice, maxPrice, isPropertyFullyContracted]);

  // High-Density Showcase Pagination (12 discrete cards per page by default)
  const SHOWCASE_PAGE_SIZE = SHOWCASE_DEFAULT_PAGE_SIZE || 12;
  const totalProjectPages = Math.max(1, Math.ceil(filteredProjects.length / SHOWCASE_PAGE_SIZE));
  const safeProjectPageIndex = Math.min(projectCardPageIndex, totalProjectPages - 1);
  const visibleProjects = useMemo(() => {
    if (viewMode === 'list') {
      return filteredProjects;
    }
    const startIdx = safeProjectPageIndex * SHOWCASE_PAGE_SIZE;
    return filteredProjects.slice(startIdx, startIdx + SHOWCASE_PAGE_SIZE);
  }, [filteredProjects, viewMode, safeProjectPageIndex, SHOWCASE_PAGE_SIZE]);

  // Filtered Units for the Matrix Table & Analytics
  const filteredUnits = useMemo(() => {
    return allInventoryUnits.filter(u => {
      if (selectedProjectIdForTable && u.propertyId !== selectedProjectIdForTable) {
        return false;
      }
      if (selectedCategoryPill !== 'all') {
        const pType = (u.property.type || '').toLowerCase().trim() || 'other';
        if (pType !== selectedCategoryPill) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = u.projectTitle.toLowerCase().includes(q);
        const matchNumber = u.unitNumber.toLowerCase().includes(q);
        const matchLoc = u.location.toLowerCase().includes(q);
        const matchType = u.unitType.toLowerCase().includes(q);
        if (!matchTitle && !matchNumber && !matchLoc && !matchType) return false;
      }
      if (filterUnitType !== 'all') {
        const t = u.unitType.toLowerCase();
        if (filterUnitType === 'apartment' && !t.includes('شقة')) return false;
        if (filterUnitType === 'villa' && !t.includes('فيلا')) return false;
        if (filterUnitType === 'duplex' && !t.includes('دوبلكس')) return false;
        if (filterUnitType === 'penthouse' && !t.includes('بنتهاوس') && !t.includes('رووف')) return false;
        if (filterUnitType === 'chalet' && !t.includes('شاليه')) return false;
        if (filterUnitType === 'office' && !t.includes('مكتب') && !t.includes('إداري')) return false;
      }
      if (filterPropertyId !== 'all' && u.propertyId !== filterPropertyId) {
        return false;
      }
      if (filterStatus !== 'all' && u.status !== filterStatus) {
        return false;
      }
      if (filterCity !== 'all' && !u.location.toLowerCase().includes(filterCity.toLowerCase())) {
        return false;
      }
      if (filterCompletionStatus !== 'all') {
        const comp = u.property.completion_status;
        const pct = u.property.completion_percentage;
        if (filterCompletionStatus === 'ready') {
          if (comp !== 'ready' && (typeof pct !== 'number' || pct < 100)) return false;
        } else if (filterCompletionStatus === 'off_plan') {
          if (comp === 'ready' && (typeof pct !== 'number' || pct >= 100)) return false;
        }
      }
      if (minPrice.trim()) {
        const minVal = parseFloat(minPrice);
        if (!isNaN(minVal) && u.totalPrice < minVal) return false;
      }
      if (maxPrice.trim()) {
        const maxVal = parseFloat(maxPrice);
        if (!isNaN(maxVal) && u.totalPrice > maxVal) return false;
      }
      return true;
    });
  }, [allInventoryUnits, selectedProjectIdForTable, selectedCategoryPill, searchQuery, filterUnitType, filterPropertyId, filterStatus, filterCity, filterCompletionStatus, minPrice, maxPrice]);

  // Telemetry Calculations for Top KPI Cards
  const {
    totalUnitsCount,
    availableUnitsCount,
    contractedUnitsCount,
    totalCatalogVal,
    availableInventoryVal,
    contractedSalesVal,
    totalAreaSqm,
    avgPricePerSqm,
    totalWipInvested,
  } = useMemo(() => {
    let totUnits = 0;
    let availUnits = 0;
    let contUnits = 0;
    let catVal = D(0);
    let availVal = D(0);
    let contVal = D(0);
    let areaTot = D(0);

    allInventoryUnits.forEach(u => {
      totUnits++;
      catVal = catVal.plus(u.totalPrice);
      areaTot = areaTot.plus(u.areaSqm);
      if (u.status === 'contracted') {
        contUnits++;
        contVal = contVal.plus(u.totalPrice);
      } else if (u.status === 'reserved') {
        // reserved
      } else {
        availUnits++;
        availVal = availVal.plus(u.totalPrice);
      }
    });

    const avgPrice = areaTot.isZero() ? D(0) : catVal.div(areaTot);
    const wipTotal = propertyCosts.reduce((acc, c) => acc.plus(c.total_cost_egp || c.total_amount || 0), D(0));

    return {
      totalUnitsCount: totUnits,
      availableUnitsCount: availUnits,
      contractedUnitsCount: contUnits,
      totalCatalogVal: catVal,
      availableInventoryVal: availVal,
      contractedSalesVal: contVal,
      totalAreaSqm: areaTot,
      avgPricePerSqm: avgPrice,
      totalWipInvested: wipTotal,
    };
  }, [allInventoryUnits, propertyCosts]);

  const soldPct = totalCatalogVal.isZero() 
    ? 0 
    : Math.round(contractedSalesVal.div(totalCatalogVal).times(100).toNumber());

  return (
    <div className={styles.stageContainer}>
      {/* ─── 1. TOP EXECUTIVE INVENTORY & PRICING KPIS (100% REPLICA OF REFERENCE) ─── */}
      <PropertiesInventoryKpis
        totalUnitsCount={totalUnitsCount}
        availableUnitsCount={availableUnitsCount}
        contractedUnitsCount={contractedUnitsCount}
        totalCatalogVal={totalCatalogVal}
        availableInventoryVal={availableInventoryVal}
        contractedSalesVal={contractedSalesVal}
        totalAreaSqm={totalAreaSqm}
        avgPricePerSqm={avgPricePerSqm}
        totalWipInvested={totalWipInvested}
        costItemsCount={propertyCosts.length}
        isAr={isAr}
      />

      {/* ─── 3. SIDE WIDGETS DOCKING (PORTAL INTO #zf-side-widgets-slot) ─── */}
      <PropertiesSideWidgets
        properties={properties}
        allInventoryUnits={allInventoryUnits}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        filterUnitType={filterUnitType}
        onFilterUnitTypeChange={setFilterUnitType}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        filterPropertyId={filterPropertyId}
        onFilterPropertyIdChange={setFilterPropertyId}
        filterCity={filterCity}
        onFilterCityChange={setFilterCity}
        uniqueCities={uniqueCities}
        onResetAllFilters={handleResetAllFilters}
        selectedProjectId={selectedProjectIdForTable}
        onSelectProject={setSelectedProjectIdForTable}
        onOpenFullMap={() => setIsFullMapOpen(true)}
        onOpenNewContract={onOpenNewContract}
        isAr={isAr}
        filterCompletionStatus={filterCompletionStatus}
        onFilterCompletionStatusChange={setFilterCompletionStatus}
        minPrice={minPrice}
        onMinPriceChange={setMinPrice}
        maxPrice={maxPrice}
        onMaxPriceChange={setMaxPrice}
        onApplyFilters={handleApplyFilters}
      />

      {/* ─── 4. MAIN WORKSPACE: 100% FULL-WIDTH WITH 3 EXECUTIVE TABS ─── */}
      <div className={styles.workspaceGrid} id="properties-workspace-stage">
        {/* Workstation Stage Sub-Tabs Header */}
        <div className={styles.workstationTabs}>
          <button
            type="button"
            className={`${styles.workstationTabBtn} ${activeTab === 'showcase' ? styles.workstationTabBtnActive : ''}`}
            onClick={() => handleSelectTab('showcase')}
          >
            <Building2 size={16} />
            <span>{isAr ? 'المشروعات والعمارات' : 'Projects & Buildings'}</span>
            <span style={{
              fontSize: '0.72rem',
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              background: activeTab === 'showcase' ? 'var(--erp-accent-soft, #eff6ff)' : '#f1f5f9',
              color: activeTab === 'showcase' ? 'var(--erp-accent, #2563eb)' : '#64748b',
              fontWeight: 700
            }}>
              {filteredProjects.length}
            </span>
          </button>

          <button
            type="button"
            className={`${styles.workstationTabBtn} ${activeTab === 'matrix' ? styles.workstationTabBtnActive : ''}`}
            onClick={() => handleSelectTab('matrix')}
          >
            <Layers size={16} />
            <span>{isAr ? 'مصفوفة الوحدات والأدوار' : 'Units & Floors Matrix'}</span>
            <span style={{
              fontSize: '0.72rem',
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              background: activeTab === 'matrix' ? 'var(--erp-accent-soft, #eff6ff)' : '#f1f5f9',
              color: activeTab === 'matrix' ? 'var(--erp-accent, #2563eb)' : '#64748b',
              fontWeight: 700
            }}>
              {filteredUnits.length}
            </span>
          </button>

          <button
            type="button"
            className={`${styles.workstationTabBtn} ${activeTab === 'analytics' ? styles.workstationTabBtnActive : ''}`}
            onClick={() => handleSelectTab('analytics')}
          >
            <LineChart size={16} />
            <span>{isAr ? 'الرسوم البيانية والتحليلات' : 'Analytics & Charts'}</span>
          </button>
        </div>

        {/* TAB CONTENT 1: SHOWCASE (المشروعات والعمارات) */}
        {activeTab === 'showcase' && (
          <div className={styles.mainColumn}>
            {/* Category Segmented Tabs Bar & View Toggle */}
            <div className={styles.cardsFilterBar}>
              <div className={styles.cardsFilterTabs}>
                {dynamicTypePills.map(pill => (
                  <button
                    key={pill.key}
                    type="button"
                    className={`${styles.cardsFilterPill} ${selectedCategoryPill === pill.key ? styles.cardsFilterPillActive : ''}`}
                    onClick={() => setSelectedCategoryPill(pill.key)}
                  >
                    <span>{pill.label}</span>
                    <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>({pill.count})</span>
                  </button>
                ))}
              </div>

              <div className={styles.cardsBarControls}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {isAr 
                    ? `${filteredProjects.length} مشروع معروض` 
                    : `${filteredProjects.length} properties displayed`}
                </span>
                {selectedCategoryPill !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryPill('all')}
                    className={shellStyles.btnSecondary}
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                  >
                    {isAr ? 'عرض الكل ✕' : 'Clear ✕'}
                  </button>
                )}
              </div>
            </div>

            {/* HIGH-DENSITY 3-4 COLUMN SHOWCASE GRID (Default >= 10 cards) */}
            {filteredProjects.length > 0 ? (
              <>
                <div className={styles.showcaseGrid}>
                  {visibleProjects.map((p, pIdx) => (
                    <ProjectShowcaseCard
                      key={p.id}
                      property={p}
                      contracts={contracts}
                      isSelected={selectedProjectIdForTable === p.id}
                      onSelect={() => setSelectedProjectIdForTable(prev => prev === p.id ? null : p.id)}
                      onViewUnits={() => {
                        setSelectedProjectIdForTable(p.id);
                        handleSelectTab('matrix');
                      }}
                      onOpenContract={() => onOpenContractForProperty(p)}
                      onOpenCalculator={() => onOpenCalculatorForProperty(p)}
                      onOpenLifecycle={() => router.push(`/fin-os/${isAr ? 'ar' : 'en'}/analysis?propertyId=${p.id}`)}
                      isAr={isAr}
                      index={pIdx}
                    />
                  ))}
                </div>

                {/* Clean Numeric Pagination when total pages > 1 */}
                {totalProjectPages > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: '#ffffff',
                    border: '1px solid var(--erp-border, #cbd5e1)',
                    borderRadius: '10px',
                    marginTop: '0.75rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                      {isAr 
                        ? `عرض ${safeProjectPageIndex * SHOWCASE_PAGE_SIZE + 1} - ${Math.min((safeProjectPageIndex + 1) * SHOWCASE_PAGE_SIZE, filteredProjects.length)} من أصل ${filteredProjects.length} مشروع`
                        : `Showing ${safeProjectPageIndex * SHOWCASE_PAGE_SIZE + 1} - ${Math.min((safeProjectPageIndex + 1) * SHOWCASE_PAGE_SIZE, filteredProjects.length)} of ${filteredProjects.length} projects`}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        disabled={safeProjectPageIndex === 0}
                        onClick={() => setProjectCardPageIndex(prev => Math.max(0, prev - 1))}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: '#ffffff',
                          border: '1px solid var(--erp-border, #cbd5e1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: safeProjectPageIndex === 0 ? 'not-allowed' : 'pointer',
                          opacity: safeProjectPageIndex === 0 ? 0.4 : 1,
                        }}
                        title={isAr ? 'الصفحة السابقة' : 'Previous page'}
                      >
                        {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                      </button>

                      {Array.from({ length: totalProjectPages }, (_, i) => {
                        const isActive = i === safeProjectPageIndex;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setProjectCardPageIndex(i)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              background: isActive ? 'var(--erp-accent, #2563eb)' : '#ffffff',
                              color: isActive ? '#ffffff' : '#334155',
                              border: '1px solid var(--erp-border, #cbd5e1)',
                              fontSize: '0.75rem',
                              fontWeight: isActive ? 800 : 600,
                              cursor: 'pointer',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {i + 1}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        disabled={safeProjectPageIndex >= totalProjectPages - 1}
                        onClick={() => setProjectCardPageIndex(prev => Math.min(totalProjectPages - 1, prev + 1))}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: '#ffffff',
                          border: '1px solid var(--erp-border, #cbd5e1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: safeProjectPageIndex >= totalProjectPages - 1 ? 'not-allowed' : 'pointer',
                          opacity: safeProjectPageIndex >= totalProjectPages - 1 ? 0.4 : 1,
                        }}
                        title={isAr ? 'الصفحة التالية' : 'Next page'}
                      >
                        {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                padding: '2.5rem 1.5rem',
                background: '#ffffff',
                border: '1px dashed var(--erp-border, #cbd5e1)',
                borderRadius: '12px',
                textAlign: 'center',
                color: 'var(--erp-text-muted, #64748b)'
              }}>
                <Building2 size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a' }}>{isAr ? 'لا توجد مشروعات مطابقة للفلاتر الحالية' : 'No properties matched'}</h4>
                <p style={{ fontSize: '0.78rem', margin: '0.35rem 0 0.75rem 0' }}>{isAr ? 'يرجى تغيير معايير البحث أو إعادة ضبط الفلاتر.' : 'Try adjusting your search criteria.'}</p>
                <button type="button" className={styles.filterResetBtn} onClick={handleResetAllFilters}>
                  {isAr ? 'إعادة ضبط كافة الفلاتر' : 'Reset Filters'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT 2: MATRIX (مصفوفة الوحدات والأدوار) */}
        {activeTab === 'matrix' && (
          <UnitsFloorMatrixTable
            units={filteredUnits}
            properties={properties}
            contracts={contracts}
            selectedProjectId={selectedProjectIdForTable}
            onSelectProject={setSelectedProjectIdForTable}
            onOpenContractForProperty={onOpenContractForProperty}
            onOpenCalculatorForProperty={onOpenCalculatorForProperty}
            onOpenAuditForProperty={onOpenAuditForProperty}
            onEditTaxUnit={setEditingTaxUnit}
            isAr={isAr}
            isMutating={isMutating}
          />
        )}

        {/* TAB CONTENT 3: ANALYTICS (الرسوم البيانية والتحليلات) */}
        {activeTab === 'analytics' && (
          <PropertiesAnalyticsView
            units={filteredUnits}
            properties={properties}
            contracts={contracts}
            isAr={isAr}
          />
        )}
      </div>

      {/* ─── FULL INTERACTIVE REAL MAP MODAL (LIGHT THEME) ─── */}
      <ERPPortfolioMapModal
        isOpen={isFullMapOpen}
        onClose={() => setIsFullMapOpen(false)}
        properties={properties}
        contracts={contracts}
        selectedProjectId={selectedProjectIdForTable}
        onSelectProjectAndFilter={(projId) => {
          setSelectedProjectIdForTable(projId);
          setIsFullMapOpen(false);
        }}
        isAr={isAr}
      />

      {/* ─── MANUAL APARTMENT TAX EDITING MODAL ─── */}
      {editingTaxUnit && (
        <div className={styles.modalOverlay} onClick={() => setEditingTaxUnit(null)}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div className={styles.sideCardIconSquircle}>
                  <ShieldCheck size={16} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'تعديل ضريبة الوحدة العقارية' : 'Edit Unit Property Tax'}
                </h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setEditingTaxUnit(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalBody} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  {isAr ? 'رقم الوحدة' : 'Unit Number'}
                </label>
                <input
                  type="text"
                  disabled
                  value={editingTaxUnit.unitNumber}
                  className={styles.filterInput}
                  style={{ background: '#f8fafc', color: '#64748b' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  {isAr ? 'السعر الأساسي' : 'Base Price'}
                </label>
                <input
                  type="text"
                  disabled
                  value={`${editingTaxUnit.basePrice.toLocaleString()} ج.م`}
                  className={styles.filterInput}
                  style={{ background: '#f8fafc', color: '#64748b' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                  {isAr ? 'قيمة الضريبة (ج.م)' : 'Tax Amount (EGP)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editingTaxUnit.taxAmount}
                  onChange={(e) => setEditingTaxUnit({ ...editingTaxUnit, taxAmount: e.target.value })}
                  className={styles.filterInput}
                  placeholder="0"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                  {isAr ? 'بيان / سبب الضريبة' : 'Tax Description'}
                </label>
                <input
                  type="text"
                  value={editingTaxUnit.taxDesc}
                  onChange={(e) => setEditingTaxUnit({ ...editingTaxUnit, taxDesc: e.target.value })}
                  className={styles.filterInput}
                  placeholder={isAr ? 'مثال: ضريبة تصرفات عقارية أو قيمة مضافة' : 'e.g. Real estate transaction tax'}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={shellStyles.btnPrimary}
                  style={{ flex: 1 }}
                  onClick={handleSaveUnitTax}
                  disabled={isSavingTax}
                >
                  {isSavingTax ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات' : 'Save Tax')}
                </button>
                <button
                  type="button"
                  className={shellStyles.btnSecondary}
                  onClick={() => setEditingTaxUnit(null)}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesPortfolioView;
