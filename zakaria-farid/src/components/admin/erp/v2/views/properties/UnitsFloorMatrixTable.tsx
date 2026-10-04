'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Home, 
  Layers, 
  Plus, 
  Calculator, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2, 
  Clock, 
  Check, 
  DollarSign, 
  FolderMinus, 
  FolderPlus,
  Filter,
  Search,
  X,
  RotateCcw,
  List,
  LayoutGrid
} from 'lucide-react';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPContract } from '@/lib/erp/types';
import { 
  FlatInventoryUnit, 
  groupUnitsByFloor, 
  categorizeFloor,
  FloorGroup 
} from '@/lib/erp/propertiesPortfolioCalculations';
import { D } from '@/lib/erp/math';
import { getPropertyTypeLabel } from '../PropertiesPortfolioView';
import styles from '../PropertiesPortfolioView.module.css';
import shellStyles from '../../ZFWorkstationShell.module.css';

export interface UnitsFloorMatrixTableProps {
  units: FlatInventoryUnit[];
  properties: Property[];
  contracts: ERPContract[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onOpenContractForProperty: (property: Property, unit?: BuildingUnitItem) => void;
  onOpenCalculatorForProperty: (property: Property) => void;
  onOpenAuditForProperty?: (property: Property) => void;
  onEditTaxUnit?: (unit: {
    unitId: string;
    unitNumber: string;
    propertyId: string;
    basePrice: number;
    taxAmount: string;
    taxDesc: string;
  }) => void;
  isAr?: boolean;
  isMutating?: boolean;
}

export const UnitsFloorMatrixTable: React.FC<UnitsFloorMatrixTableProps> = ({
  units,
  properties,
  contracts,
  selectedProjectId,
  onSelectProject,
  onOpenContractForProperty,
  onOpenCalculatorForProperty,
  onOpenAuditForProperty,
  onEditTaxUnit,
  isAr = true,
  isMutating = false,
}) => {
  // View Format: 'direct' (default flat canonical table of units) vs 'hierarchical' (grouped by building & floor)
  const [viewFormat, setViewFormat] = useState<'direct' | 'hierarchical'>('direct');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Faceted Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUnitType, setSelectedUnitType] = useState<string>('ALL');
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  // Default Shrink State: All buildings and floors start COLLAPSED on load
  const [expandedBuildingIds, setExpandedBuildingIds] = useState<Record<string, boolean>>({});
  const [expandedFloorKeys, setExpandedFloorKeys] = useState<Record<string, boolean>>({});

  const toggleBuildingExpand = useCallback((groupId: string) => {
    setExpandedBuildingIds(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }, []);

  const toggleFloorExpand = useCallback((floorCompositeKey: string) => {
    setExpandedFloorKeys(prev => ({
      ...prev,
      [floorCompositeKey]: !prev[floorCompositeKey],
    }));
  }, []);

  // Distinct Unit Types in inventory
  const availableUnitTypes = useMemo(() => {
    const set = new Set<string>();
    units.forEach(u => {
      if (u.unitType && u.unitType.trim()) {
        set.add(u.unitType.trim());
      }
    });
    return Array.from(set).sort();
  }, [units]);

  // Floor Category Options
  const floorCategoryOptions = useMemo(() => [
    { value: 'ALL', labelAr: 'كافة الأدوار', labelEn: 'All Floors' },
    { value: 'ground', labelAr: 'الدور الأرضي', labelEn: 'Ground Floor' },
    { value: 'first', labelAr: 'الدور الأول', labelEn: '1st Floor' },
    { value: 'second', labelAr: 'الدور الثاني', labelEn: '2nd Floor' },
    { value: 'third', labelAr: 'الدور الثالث', labelEn: '3rd Floor' },
    { value: 'typical', labelAr: 'الأدوار المتكررة (٤+)', labelEn: 'Typical Floors (4+)' },
    { value: 'roof', labelAr: 'الرووف / البنتهاوس', labelEn: 'Roof / Penthouse' },
    { value: 'basement', labelAr: 'البدروم', labelEn: 'Basement' },
  ], []);

  // Filtered Units based on faceted criteria
  const filteredUnits = useMemo(() => {
    return units.filter(u => {
      // 1. Project selection filter
      if (selectedProjectId && u.propertyId !== selectedProjectId) {
        return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesUnit = (u.unitNumber || '').toLowerCase().includes(q);
        const matchesProject = (u.projectTitle || '').toLowerCase().includes(q);
        const matchesLocation = (u.location || '').toLowerCase().includes(q);
        const matchesType = (u.unitType || '').toLowerCase().includes(q);
        if (!matchesUnit && !matchesProject && !matchesLocation && !matchesType) {
          return false;
        }
      }

      // 3. Unit Type filter
      if (selectedUnitType !== 'ALL') {
        if (u.unitType !== selectedUnitType) {
          return false;
        }
      }

      // 4. Floor category filter
      if (selectedFloor !== 'ALL') {
        const floorInfo = categorizeFloor(u.floor, u.unitNumber, u.unitType, isAr);
        if (selectedFloor === 'typical') {
          if (!floorInfo.key.startsWith('typical')) {
            return false;
          }
        } else if (floorInfo.key !== selectedFloor) {
          return false;
        }
      }

      // 5. Status filter
      if (selectedStatus !== 'ALL') {
        if (u.status !== selectedStatus) {
          return false;
        }
      }

      // 6. Price range filter
      const minP = parseFloat(minPrice);
      if (!isNaN(minP) && minP > 0 && u.totalPrice < minP) {
        return false;
      }
      const maxP = parseFloat(maxPrice);
      if (!isNaN(maxP) && maxP > 0 && u.totalPrice > maxP) {
        return false;
      }

      return true;
    });
  }, [units, selectedProjectId, searchQuery, selectedUnitType, selectedFloor, selectedStatus, minPrice, maxPrice, isAr]);

  // Is any filter active?
  const isAnyFilterActive = useMemo(() => {
    return searchQuery.trim() !== '' || 
      selectedUnitType !== 'ALL' || 
      selectedFloor !== 'ALL' || 
      selectedStatus !== 'ALL' || 
      minPrice !== '' || 
      maxPrice !== '' || 
      !!selectedProjectId;
  }, [searchQuery, selectedUnitType, selectedFloor, selectedStatus, minPrice, maxPrice, selectedProjectId]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedUnitType('ALL');
    setSelectedFloor('ALL');
    setSelectedStatus('ALL');
    setMinPrice('');
    setMaxPrice('');
    if (selectedProjectId) {
      onSelectProject(null);
    }
  }, [selectedProjectId, onSelectProject]);

  // Group all filtered units by building/project first so no building is severed
  const groupedBuildings = useMemo<{
    groupId: string;
    isBuilding: boolean;
    propertyId: string;
    property: Property | null;
    projectTitle: string;
    location: string;
    units: {
      unit: FlatInventoryUnit;
      globalIndex: number;
    }[];
  }[]>(() => {
    const groups: {
      groupId: string;
      isBuilding: boolean;
      propertyId: string;
      property: Property | null;
      projectTitle: string;
      location: string;
      units: {
        unit: FlatInventoryUnit;
        globalIndex: number;
      }[];
    }[] = [];

    filteredUnits.forEach((u, idx) => {
      const globalIndex = idx + 1;
      const isMultiUnit = (u.property.building_units && u.property.building_units.length > 0) || u.property.type === 'building';
      const isSingleProjectIsolated = !!selectedProjectId;

      const groupId = (isMultiUnit || isSingleProjectIsolated) ? u.propertyId : 'standalone_properties';
      let group = groups.find(g => g.groupId === groupId);
      if (!group) {
        if (isMultiUnit || isSingleProjectIsolated) {
          group = {
            groupId: u.propertyId,
            isBuilding: isMultiUnit,
            propertyId: u.propertyId,
            property: u.property,
            projectTitle: u.projectTitle,
            location: u.location,
            units: [],
          };
        } else {
          group = {
            groupId: 'standalone_properties',
            isBuilding: false,
            propertyId: 'standalone_properties',
            property: null,
            projectTitle: isAr ? 'الفيلات والوحدات المستقلة' : 'Standalone Units & Villas',
            location: isAr ? 'مواقع متنوعة بالمحفظة' : 'Various portfolio locations',
            units: [],
          };
        }
        groups.push(group);
      }
      group.units.push({ unit: u, globalIndex });
    });

    return groups;
  }, [filteredUnits, selectedProjectId, isAr]);

  const expandAll = useCallback(() => {
    const allBuildings: Record<string, boolean> = {};
    const allFloors: Record<string, boolean> = {};
    groupedBuildings.forEach(g => {
      allBuildings[g.groupId] = true;
      const floors = groupUnitsByFloor(g.units, isAr);
      floors.forEach(f => {
        allFloors[`${g.groupId}-${f.floorKey}`] = true;
      });
    });
    setExpandedBuildingIds(allBuildings);
    setExpandedFloorKeys(allFloors);
  }, [groupedBuildings, isAr]);

  const collapseAll = useCallback(() => {
    setExpandedBuildingIds({});
    setExpandedFloorKeys({});
  }, []);

  const expandAllBuildingsOnly = useCallback(() => {
    const allBuildings: Record<string, boolean> = {};
    groupedBuildings.forEach(g => {
      allBuildings[g.groupId] = true;
    });
    setExpandedBuildingIds(allBuildings);
  }, [groupedBuildings]);

  // Reset page when filters or view format change
  useEffect(() => {
    setPage(1);
  }, [selectedProjectId, searchQuery, selectedUnitType, selectedFloor, selectedStatus, minPrice, maxPrice, viewFormat]);

  const totalPages = viewFormat === 'direct'
    ? Math.max(1, Math.ceil(filteredUnits.length / pageSize))
    : Math.max(1, Math.ceil(groupedBuildings.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedUnits = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredUnits.slice(start, start + pageSize);
  }, [filteredUnits, safePage, pageSize]);

  const paginatedBuildings = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return groupedBuildings.slice(start, start + pageSize);
  }, [groupedBuildings, safePage, pageSize]);

  // Currency Formatter
  const formatEgp = useCallback((val: number): string => {
    return `${Math.round(val).toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`;
  }, [isAr]);

  const selectedProjectObj = useMemo(() => {
    return selectedProjectId ? properties.find(p => p.id === selectedProjectId) || null : null;
  }, [properties, selectedProjectId]);

  const renderEmptyState = () => (
    <tr>
      <td colSpan={10} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 0.75rem auto',
          color: '#94a3b8'
        }}>
          <Building2 size={24} />
        </div>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
          {isAr ? 'لا توجد وحدات مطابقة لمعايير البحث والتصفية الحالية' : 'No units matching the criteria'}
        </div>
        <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.25rem' }}>
          {isAr ? 'جرّب تعديل الكلمات المفتاحية أو نطاق الأسعار أو إعادة ضبط التصفية.' : 'Try adjusting keywords, price range, or reset filters.'}
        </div>
        {isAnyFilterActive && (
          <button
            type="button"
            onClick={resetAllFilters}
            style={{
              marginTop: '0.85rem',
              padding: '0.45rem 1rem',
              borderRadius: '6px',
              background: 'var(--erp-accent, #2563eb)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isAr ? 'إعادة ضبط كافة الفلاتر' : 'Reset all filters'}
          </button>
        )}
      </td>
    </tr>
  );

  const renderUnitRow = (unit: FlatInventoryUnit, globalIndex: number, floorLabel?: string) => {
    const isUnitContracted = unit.status === 'contracted';
    const isUnitReserved = unit.status === 'reserved';
    const hasManualTax = (unit.buildingUnit?.tax_amount_egp || 0) > 0;
    const resolvedFloorLabel = floorLabel || categorizeFloor(unit.floor, unit.unitNumber, unit.unitType, isAr).label;

    return (
      <tr 
        key={unit.id} 
        className={shellStyles.canonicalRow}
        style={{ height: '54px', minHeight: '54px', cursor: 'pointer' }}
        onClick={() => {
          if (!isUnitContracted) {
            onOpenContractForProperty(unit.property, unit.buildingUnit);
          }
        }}
      >
        <td className={shellStyles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', color: '#64748b', textAlign: 'center', width: '45px' }}>
          {globalIndex}
        </td>

        <td className={shellStyles.canonicalTd}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{unit.projectTitle}</span>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{resolvedFloorLabel}</span>
          </div>
        </td>

        <td className={shellStyles.canonicalTd}>
          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`} style={{ fontSize: '0.68rem' }}>
            {unit.unitType}
          </span>
        </td>

        <td className={shellStyles.canonicalTd}>
          <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            {unit.unitNumber}
          </strong>
        </td>

        <td className={shellStyles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {unit.areaSqm} {isAr ? 'م²' : 'sqm'}
        </td>

        <td className={shellStyles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>{formatEgp(unit.totalPrice)}</span>
            {hasManualTax && (
              <span 
                style={{
                  fontSize: '0.62rem',
                  background: 'var(--erp-accent-tint, rgba(37, 99, 235, 0.08))',
                  color: 'var(--erp-accent, #2563eb)',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  border: '1px solid color-mix(in srgb, var(--erp-accent) 20%, transparent)',
                }}
                title={unit.buildingUnit?.tax_description || (isAr ? 'ضريبة محددة يدوياً' : 'Manual Tax')}
              >
                +Tax
              </span>
            )}
          </div>
        </td>

        <td className={`${shellStyles.canonicalTd} ${styles.colDownPayment}`} style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--erp-accent, #2563eb)', fontWeight: 600 }}>
          {formatEgp(unit.downPayment)}
        </td>

        <td className={shellStyles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', color: '#475569' }}>
          {formatEgp(unit.monthlyInstallment)}
        </td>

        <td className={shellStyles.canonicalTd}>
          {isUnitContracted ? (
            <span className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`}>
              <CheckCircle2 size={11} />
              <span>{isAr ? 'تم التعاقد' : 'Contracted'}</span>
            </span>
          ) : isUnitReserved ? (
            <span className={`${shellStyles.statusPill} ${shellStyles.statusPillAmber}`}>
              <Clock size={11} />
              <span>{isAr ? 'محجوزة' : 'Reserved'}</span>
            </span>
          ) : (
            <span className={`${shellStyles.statusPill} ${shellStyles.statusPillGreen}`}>
              <Check size={11} />
              <span>{isAr ? 'متاحة للبيع' : 'Available'}</span>
            </span>
          )}
        </td>

        <td className={shellStyles.canonicalTd} style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }} onClick={(e) => e.stopPropagation()}>
            {/* Tax edit button */}
            {unit.buildingUnit && onEditTaxUnit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTaxUnit({
                    unitId: unit.id,
                    unitNumber: unit.unitNumber,
                    propertyId: unit.propertyId,
                    basePrice: unit.buildingUnit?.price_egp || unit.totalPrice,
                    taxAmount: (unit.buildingUnit?.tax_amount_egp || 0).toString(),
                    taxDesc: unit.buildingUnit?.tax_description || '',
                  });
                }}
                style={{
                  padding: '4px 7px',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
                title={isAr ? 'تعديل الضريبة والرسوم اليدوية للشقة' : 'Edit Unit Tax'}
              >
                <DollarSign size={12} />
              </button>
            )}

            {/* Contract creation button */}
            {!isUnitContracted && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenContractForProperty(unit.property, unit.buildingUnit);
                }}
                disabled={isMutating}
                style={{
                  padding: '4px 9px',
                  borderRadius: '6px',
                  background: 'var(--erp-accent, #2563eb)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
                title={isAr ? 'تحرير عقد بيع لهذه الشقة' : 'Contract'}
              >
                <Plus size={12} />
                <span>{isAr ? 'عقد' : 'Contract'}</span>
              </button>
            )}

            {/* Calculator button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCalculatorForProperty(unit.property);
              }}
              style={{
                padding: '4px 7px',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center'
              }}
              title={isAr ? 'حاسبة التكاليف والجدوى' : 'Calculator'}
            >
              <Calculator size={12} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div 
      className={shellStyles.canonicalTableCard} 
      style={{ 
        background: '#ffffff !important', 
        border: '1px solid var(--erp-border, #cbd5e1)', 
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'none'
      }}
    >
      {/* ─── 1. TABLE TOP TOOLBAR: TITLE & CONTROLS ─── */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0.85rem 1.15rem', 
          borderBottom: '1px solid #f1f5f9',
          background: '#ffffff',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
            {selectedProjectObj 
              ? (isAr ? `مصفوفة وحدات: ${selectedProjectObj.title_ar || selectedProjectObj.title_en}` : `Units: ${selectedProjectObj.title_en || selectedProjectObj.title_ar}`)
              : (isAr ? 'مصفوفة الوحدات والأدوار' : 'Units & Floor Matrix')}
          </h3>
          
          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`} style={{ fontSize: '0.7rem' }}>
            {filteredUnits.length} {isAr ? 'وحدة' : 'units'}
            {filteredUnits.length !== units.length && (
              <span style={{ color: '#94a3b8', marginInlineStart: '0.25rem' }}>
                ({isAr ? `من أصل ${units.length}` : `of ${units.length}`})
              </span>
            )}
          </span>

          {/* View Format Segmented Switch */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#f1f5f9',
            borderRadius: '7px',
            padding: '2px',
            border: '1px solid #e2e8f0',
            gap: '2px',
          }}>
            <button
              type="button"
              onClick={() => { setViewFormat('direct'); setPage(1); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.55rem',
                borderRadius: '5px',
                border: 'none',
                background: viewFormat === 'direct' ? '#ffffff' : 'transparent',
                color: viewFormat === 'direct' ? 'var(--erp-accent, #2563eb)' : '#64748b',
                fontSize: '0.72rem',
                fontWeight: viewFormat === 'direct' ? 700 : 500,
                cursor: 'pointer',
                boxShadow: viewFormat === 'direct' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
              title={isAr ? 'عرض جدول الوحدات المباشر' : 'Direct Units View'}
            >
              <List size={13} />
              <span>{isAr ? 'قائمة الوحدات' : 'Direct Units'}</span>
            </button>
            <button
              type="button"
              onClick={() => { setViewFormat('hierarchical'); setPage(1); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.55rem',
                borderRadius: '5px',
                border: 'none',
                background: viewFormat === 'hierarchical' ? '#ffffff' : 'transparent',
                color: viewFormat === 'hierarchical' ? 'var(--erp-accent, #2563eb)' : '#64748b',
                fontSize: '0.72rem',
                fontWeight: viewFormat === 'hierarchical' ? 700 : 500,
                cursor: 'pointer',
                boxShadow: viewFormat === 'hierarchical' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
              title={isAr ? 'عرض التسلسل الهرمي للمباني والأدوار' : 'Hierarchical Building View'}
            >
              <LayoutGrid size={13} />
              <span>{isAr ? 'التسلسل الهرمي' : 'Hierarchical'}</span>
            </button>
          </div>

          {selectedProjectId && (
            <button
              type="button"
              onClick={() => onSelectProject(null)}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.72rem',
                color: 'var(--erp-accent, #2563eb)',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <span>{isAr ? 'عرض كافة المشروعات' : 'Clear project filter'}</span>
              <X size={11} />
            </button>
          )}
        </div>

        {/* Toolbar Controls: Expand / Collapse & Page Sizes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          
          {viewFormat === 'hierarchical' && (
            <>
              {/* Collapse All Button */}
              <button
                type="button"
                onClick={collapseAll}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.38rem 0.65rem',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid var(--erp-border, #cbd5e1)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title={isAr ? 'طي كافة أقسام العمارات والأدوار' : 'Collapse All Buildings and Floors'}
              >
                <FolderMinus size={13} color="#64748b" />
                <span>{isAr ? 'طي الكل' : 'Collapse All'}</span>
              </button>

              {/* Expand All Buildings Only */}
              <button
                type="button"
                onClick={expandAllBuildingsOnly}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.38rem 0.65rem',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid var(--erp-border, #cbd5e1)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title={isAr ? 'عرض قائمة الأدوار لكافة المباني' : 'Expand All Buildings'}
              >
                <Building2 size={13} color="var(--erp-accent, #2563eb)" />
                <span>{isAr ? 'عرض الأدوار' : 'Show Floors'}</span>
              </button>

              {/* Expand All Buildings and Units */}
              <button
                type="button"
                onClick={expandAll}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.38rem 0.65rem',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid var(--erp-border, #cbd5e1)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title={isAr ? 'توسيع كافة الأدوار وعرض تفاصيل جميع الوحدات' : 'Expand All Units'}
              >
                <FolderPlus size={13} color="var(--erp-accent, #2563eb)" />
                <span>{isAr ? 'توسيع كافة الوحدات' : 'Expand All Units'}</span>
              </button>
            </>
          )}

          {/* Page size select */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            style={{
              background: '#f8fafc',
              border: '1px solid var(--erp-border, #cbd5e1)',
              borderRadius: '6px',
              padding: '0.35rem 0.5rem',
              fontSize: '0.74rem',
              color: '#0f172a',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {viewFormat === 'direct' ? (
              <>
                <option value={10}>10 {isAr ? 'وحدات لكل صفحة' : 'units / page'}</option>
                <option value={20}>20 {isAr ? 'وحدات لكل صفحة' : 'units / page'}</option>
                <option value={50}>50 {isAr ? 'وحدات لكل صفحة' : 'units / page'}</option>
                <option value={100}>100 {isAr ? 'وحدة لكل صفحة' : 'units / page'}</option>
              </>
            ) : (
              <>
                <option value={5}>5 {isAr ? 'مشاريع لكل صفحة' : 'projects / page'}</option>
                <option value={10}>10 {isAr ? 'مشاريع لكل صفحة' : 'projects / page'}</option>
                <option value={20}>20 {isAr ? 'مشاريع لكل صفحة' : 'projects / page'}</option>
                <option value={50}>50 {isAr ? 'مشاريع لكل صفحة' : 'projects / page'}</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* ─── 2. FACETED FILTER & SEARCH BAR ─── */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0.65rem 1.15rem', 
          borderBottom: '1px solid var(--erp-border, #cbd5e1)',
          background: '#fafbfc',
          flexWrap: 'wrap',
          gap: '0.65rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
          
          {/* Instant Search Box */}
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              border: '1px solid var(--erp-border, #cbd5e1)',
              borderRadius: '8px',
              padding: '0 10px',
              height: '34px',
              background: '#ffffff',
              minWidth: '200px',
              maxWidth: '300px',
              flex: '1 1 200px'
            }}
          >
            <Search size={14} color="#94a3b8" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث برقم الوحدة، المشروع...' : 'Search unit #, project...'}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '0.78rem',
                color: '#0f172a',
                outline: 'none',
                width: '100%'
              }}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Unit Type Select */}
          <select
            value={selectedUnitType}
            onChange={(e) => setSelectedUnitType(e.target.value)}
            style={{
              height: '34px',
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid var(--erp-border, #cbd5e1)',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="ALL">{isAr ? 'جميع أنواع الوحدات' : 'All Unit Types'}</option>
            {availableUnitTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Floor Category Select */}
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            style={{
              height: '34px',
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid var(--erp-border, #cbd5e1)',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {floorCategoryOptions.map(f => (
              <option key={f.value} value={f.value}>
                {isAr ? f.labelAr : f.labelEn}
              </option>
            ))}
          </select>

          {/* Status Select */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              height: '34px',
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid var(--erp-border, #cbd5e1)',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="ALL">{isAr ? 'كافة حالات الوحدات' : 'All Statuses'}</option>
            <option value="available">{isAr ? 'متاحة للبيع' : 'Available'}</option>
            <option value="reserved">{isAr ? 'محجوزة' : 'Reserved'}</option>
            <option value="contracted">{isAr ? 'تم التعاقد' : 'Contracted'}</option>
          </select>

          {/* Price Range Filter Inputs */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder={isAr ? 'أدنى سعر' : 'Min Price'}
              style={{
                width: '95px',
                height: '34px',
                padding: '0 8px',
                borderRadius: '8px',
                border: '1px solid var(--erp-border, #cbd5e1)',
                background: '#ffffff',
                fontSize: '0.76rem',
                color: '#0f172a',
                fontVariantNumeric: 'tabular-nums',
                outline: 'none'
              }}
            />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>-</span>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder={isAr ? 'أقصى سعر' : 'Max Price'}
              style={{
                width: '95px',
                height: '34px',
                padding: '0 8px',
                borderRadius: '8px',
                border: '1px solid var(--erp-border, #cbd5e1)',
                background: '#ffffff',
                fontSize: '0.76rem',
                color: '#0f172a',
                fontVariantNumeric: 'tabular-nums',
                outline: 'none'
              }}
            />
          </div>

          {/* Reset Filters Button */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={resetAllFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                height: '34px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={isAr ? 'إعادة ضبط كافة معايير التصفية والبحث' : 'Reset all filters'}
            >
              <RotateCcw size={12} />
              <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 3. DATA TABLE SCROLL CONTAINER ─── */}
      <div className={styles.tableScrollArea} style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table 
          className={shellStyles.canonicalTable}
          style={{ 
            width: '100%', 
            borderCollapse: 'separate', 
            borderSpacing: 0, 
            textAlign: isAr ? 'right' : 'left', 
            minWidth: '850px' 
          }}
        >
          <thead 
            className={shellStyles.canonicalThead}
            style={{ 
              position: 'sticky', 
              top: 0, 
              zIndex: 10, 
              background: '#fafbfc' 
            }}
          >
            <tr style={{ background: '#fafbfc' }}>
              <th className={shellStyles.canonicalTh} style={{ width: '45px', textAlign: 'center' }}>#</th>
              <th className={shellStyles.canonicalTh}>{isAr ? 'المشروع / الطابق' : 'Project / Floor'}</th>
              <th className={shellStyles.canonicalTh}>{isAr ? 'نوع الوحدة' : 'Unit Type'}</th>
              <th className={shellStyles.canonicalTh}>{isAr ? 'رقم الوحدة' : 'Unit #'}</th>
              <th className={shellStyles.canonicalTh}>{isAr ? 'المساحة' : 'Area'}</th>
              <th className={shellStyles.canonicalTh}>{isAr ? 'السعر الإجمالي' : 'Total Price'}</th>
              <th className={`${shellStyles.canonicalTh} ${styles.colDownPayment}`}>{isAr ? 'المقدم (٢٠٪)' : 'Down Payment (20%)'}</th>
              <th className={shellStyles.canonicalTh}>{isAr ? 'القسط الشهري' : 'Monthly Inst.'}</th>
              <th className={shellStyles.canonicalTh}>{isAr ? 'الحالة' : 'Status'}</th>
              <th className={shellStyles.canonicalTh} style={{ textAlign: 'center' }}>{isAr ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {viewFormat === 'direct' ? (
              paginatedUnits.length > 0 ? (
                paginatedUnits.map((u, idx) => {
                  const globalIndex = (safePage - 1) * pageSize + idx + 1;
                  return renderUnitRow(u, globalIndex);
                })
              ) : (
                renderEmptyState()
              )
            ) : (
              paginatedBuildings.length > 0 ? (
                paginatedBuildings.map(group => {
                const isExpanded = !!expandedBuildingIds[group.groupId];
                const isIsolated = selectedProjectId === group.propertyId;

                // Group units within this building by floor
                const floorGroups: FloorGroup[] = groupUnitsByFloor(group.units, isAr);

                const totalInGroup = group.units.length;
                const availableInGroup = group.units.filter(u => u.unit.status === 'available').length;
                const contractedInGroup = group.units.filter(u => u.unit.status === 'contracted').length;

                return (
                  <React.Fragment key={group.groupId}>
                    {/* ─── 3.1. BUILDING SECTION HEADER ROW ─── */}
                    <tr 
                      className={styles.buildingSectionRow}
                      style={{
                        background: '#f8fafc',
                        borderBottom: '1px solid var(--erp-border, #cbd5e1)',
                        borderTop: '1px solid var(--erp-border, #cbd5e1)',
                      }}
                    >
                      <td colSpan={10} style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                          
                          {/* Leading: Toggle chevron, Icon, Title, Location */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <button
                              type="button"
                              onClick={() => toggleBuildingExpand(group.groupId)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                background: '#ffffff',
                                border: '1px solid var(--erp-border, #cbd5e1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#334155',
                                transition: 'all 0.15s ease',
                              }}
                              title={isExpanded ? (isAr ? 'طي وحدات هذا المبنى' : 'Collapse') : (isAr ? 'عرض وحدات هذا المبنى' : 'Expand')}
                            >
                              {isExpanded ? (
                                <ChevronDown size={15} />
                              ) : (
                                isAr ? <ChevronLeft size={15} /> : <ChevronRight size={15} />
                              )}
                            </button>

                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '7px',
                              background: 'var(--erp-accent-tint, rgba(37, 99, 235, 0.08))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--erp-accent, #2563eb)',
                            }}>
                              {group.isBuilding ? <Building2 size={15} /> : <Home size={15} />}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                                  {group.projectTitle}
                                </strong>
                                <span className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`} style={{ fontSize: '0.66rem', padding: '1px 6px' }}>
                                  {group.property ? getPropertyTypeLabel(group.property.type, isAr) : (isAr ? 'عقارات مستقلة' : 'Standalone')}
                                </span>
                              </div>
                              {group.location && (
                                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <MapPin size={10} color="#64748b" />
                                  <span>{group.location}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Trailing: Units count, Availability pill, Isolate button */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={`${shellStyles.statusPill} ${shellStyles.statusPillGreen}`} style={{ fontSize: '0.68rem' }}>
                              {availableInGroup} {isAr ? 'متاح' : 'available'}
                            </span>
                            {contractedInGroup > 0 && (
                              <span className={`${shellStyles.statusPill} ${shellStyles.statusPillBlue}`} style={{ fontSize: '0.68rem' }}>
                                {contractedInGroup} {isAr ? 'مباع' : 'sold'}
                              </span>
                            )}
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                              ({totalInGroup} {isAr ? 'وحدة' : 'units'})
                            </span>

                            {group.isBuilding && (
                              <button
                                type="button"
                                onClick={() => onSelectProject(isIsolated ? null : group.propertyId)}
                                style={{
                                  background: isIsolated ? 'var(--erp-accent, #2563eb)' : '#ffffff',
                                  color: isIsolated ? '#ffffff' : '#334155',
                                  border: '1px solid var(--erp-border, #cbd5e1)',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {isIsolated ? (isAr ? 'إلغاء التصفية ✕' : 'Clear ✕') : (isAr ? 'تصفية المشروع' : 'Isolate')}
                              </button>
                            )}
                          </div>

                        </div>
                      </td>
                    </tr>

                    {/* ─── 3.2. FLOOR SECTIONS (Rendered when building section is EXPANDED) ─── */}
                    {isExpanded && floorGroups.map(floorGroup => {
                      const floorCompositeKey = `${group.groupId}-${floorGroup.floorKey}`;
                      const isFloorExpanded = !!expandedFloorKeys[floorCompositeKey];

                      return (
                        <React.Fragment key={floorCompositeKey}>
                          {/* Floor Sub-Header Row */}
                          <tr 
                            className={styles.floorSectionRow}
                            style={{
                              background: isFloorExpanded ? '#f1f5f9' : '#fafbfc',
                              borderBottom: '1px solid #edf2f7',
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}
                            onClick={() => toggleFloorExpand(floorCompositeKey)}
                          >
                            <td colSpan={10} style={{ padding: '0.45rem 1.15rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFloorExpand(floorCompositeKey);
                                    }}
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '5px',
                                      background: '#ffffff',
                                      border: '1px solid var(--erp-border, #cbd5e1)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      color: '#334155',
                                    }}
                                    title={isFloorExpanded ? (isAr ? 'طي وحدات هذا الدور' : 'Collapse Floor') : (isAr ? 'عرض وحدات هذا الدور' : 'Expand Floor')}
                                  >
                                    {isFloorExpanded ? (
                                      <ChevronDown size={14} />
                                    ) : (
                                      isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />
                                    )}
                                  </button>

                                  <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '5px',
                                    background: isFloorExpanded ? 'var(--erp-accent-soft, #eff6ff)' : '#e2e8f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: isFloorExpanded ? 'var(--erp-accent, #2563eb)' : '#475569',
                                  }}>
                                    <Layers size={13} />
                                  </div>
                                  
                                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                                    {floorGroup.floorLabel}
                                  </span>
                                  
                                  <span style={{
                                    fontSize: '0.67rem',
                                    fontWeight: 700,
                                    background: '#e2e8f0',
                                    color: '#334155',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontVariantNumeric: 'tabular-nums',
                                  }}>
                                    {floorGroup.totalUnits} {isAr ? 'وحدة' : 'units'}
                                  </span>

                                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                    {isFloorExpanded ? (isAr ? '(انقر لطي الوحدات)' : '(click to collapse)') : (isAr ? '(انقر لعرض الوحدات)' : '(click to view units)')}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                  <span className={`${shellStyles.statusPill} ${floorGroup.availableUnits > 0 ? shellStyles.statusPillGreen : shellStyles.statusPillNeutral}`} style={{ fontSize: '0.66rem' }}>
                                    {floorGroup.availableUnits} {isAr ? 'متاح' : 'available'}
                                  </span>
                                  {floorGroup.contractedUnits > 0 && (
                                    <span className={`${shellStyles.statusPill} ${shellStyles.statusPillBlue}`} style={{ fontSize: '0.66rem' }}>
                                      {floorGroup.contractedUnits} {isAr ? 'مباع' : 'sold'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* ─── 3.3. CANONICAL UNIT ROWS (~54px height) ─── */}
                          {isFloorExpanded && floorGroup.units.map(({ unit, globalIndex }) => 
                            renderUnitRow(unit, globalIndex, floorGroup.floorLabel)
                          )}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
                })
              ) : (
                renderEmptyState()
              )
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 4. CANONICAL NUMERIC PAGINATION BAR ─── */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.15rem',
          borderTop: '1px solid #f1f5f9',
          background: '#ffffff',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
            {viewFormat === 'direct'
              ? (isAr 
                  ? `عرض ${(safePage - 1) * pageSize + 1} - ${Math.min(safePage * pageSize, filteredUnits.length)} من ${filteredUnits.length} وحدة`
                  : `Showing ${(safePage - 1) * pageSize + 1} - ${Math.min(safePage * pageSize, filteredUnits.length)} of ${filteredUnits.length} units`)
              : (isAr 
                  ? `عرض ${(safePage - 1) * pageSize + 1} - ${Math.min(safePage * pageSize, groupedBuildings.length)} من ${groupedBuildings.length} مبنى وقسم (${filteredUnits.length} وحدة)` 
                  : `Showing ${(safePage - 1) * pageSize + 1} - ${Math.min(safePage * pageSize, groupedBuildings.length)} of ${groupedBuildings.length} buildings/sections (${filteredUnits.length} units)`)}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              className={shellStyles.canonicalPaginationBtn}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid var(--erp-border, #cbd5e1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                opacity: safePage <= 1 ? 0.4 : 1,
              }}
            >
              {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pNum = i + 1;
              if (totalPages > 5 && safePage > 3) {
                pNum = safePage - 2 + i;
                if (pNum > totalPages) pNum = totalPages - 4 + i;
              }
              const isActive = pNum === safePage;

              return (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setPage(pNum)}
                  style={{
                    width: '30px',
                    height: '30px',
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
                  {pNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              className={shellStyles.canonicalPaginationBtn}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid var(--erp-border, #cbd5e1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                opacity: safePage >= totalPages ? 0.4 : 1,
              }}
            >
              {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default UnitsFloorMatrixTable;
