/**
 * Zakaria Farid Real Estate ERP — Property Portfolio Financial Matrix
 * Directly bridges the properties catalog with the financial engine.
 * Displays each live real estate listing with its market pricing, contract/sale status,
 * cash collections, and one-click actions to generate sales contracts or run feasibility estimates.
 */

import React, { useState, useCallback } from 'react';
import { 
  Building2, 
  MapPin, 
  Maximize, 
  Bed, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Calculator, 
  Search,
  ShieldCheck,
  X,
  Layers,
  Home
} from 'lucide-react';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPContract, ERPPropertyCostItem } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';

interface PropertyFinancialMatrixProps {
  properties: Property[];
  contracts: ERPContract[];
  propertyCosts?: ERPPropertyCostItem[];
  onOpenContractForProperty: (property: Property, unit?: BuildingUnitItem) => void;
  onOpenCalculatorForProperty: (property: Property) => void;
  onOpenAuditForProperty?: (property: Property) => void;
  onUpdatePropertyUnitTax?: (propertyId: string, unitId: string, taxAmount: number, taxDesc?: string) => Promise<void>;
  isAr: boolean;
}

export const PropertyFinancialMatrix: React.FC<PropertyFinancialMatrixProps> = ({
  properties,
  contracts,
  propertyCosts = [],
  onOpenContractForProperty,
  onOpenCalculatorForProperty,
  onOpenAuditForProperty,
  onUpdatePropertyUnitTax,
  isAr
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBuildingModal, setSelectedBuildingModal] = useState<Property | null>(null);

  // Manual apartment tax editing state
  const [editingTaxUnit, setEditingTaxUnit] = useState<{
    unitId: string;
    unitNumber: string;
    propertyId: string;
    basePrice: number;
    taxAmount: string;
    taxDesc: string;
  } | null>(null);
  const [isSavingTax, setIsSavingTax] = useState(false);

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
      if (selectedBuildingModal) {
        const updatedUnits = (selectedBuildingModal.building_units || []).map(u => {
          if (u.unit_id === editingTaxUnit.unitId) {
            return {
              ...u,
              tax_amount_egp: taxAmt,
              tax_description: editingTaxUnit.taxDesc
            };
          }
          return u;
        });
        setSelectedBuildingModal({
          ...selectedBuildingModal,
          building_units: updatedUnits
        });
      }
      setEditingTaxUnit(null);
    } catch (err) {
      console.error('Failed to save manual apartment tax:', err);
    } finally {
      setIsSavingTax(false);
    }
  };

  // Master contract covering the whole property or whole building (not an individual apartment contract)
  const getMasterContractForProperty = useCallback((p: Property): ERPContract | undefined => {
    return contracts.find(c => {
      if (c.status === 'Rescinded') return false;
      if (c.building_unit_id) return false; // Specific apartment contract, not whole building
      if (c.property_id && c.property_id === p.id) return true;
      if (c.unit_id) {
        const u = c.unit_id.trim();
        const ar = (p.title_ar || '').trim();
        const en = (p.title_en || '').trim();
        if (u === ar || u === en) return true;
      }
      return false;
    });
  }, [contracts]);

  // All contracts linked to this property (master or unit-level)
  const getContractsForProperty = useCallback((p: Property): ERPContract[] => {
    return contracts.filter(c => {
      if (c.status === 'Rescinded') return false;
      if (c.property_id && c.property_id === p.id) return true;
      if (c.unit_id) {
        const u = c.unit_id.trim();
        const ar = (p.title_ar || '').trim();
        const en = (p.title_en || '').trim();
        if (u === ar || u === en) return true;
        if (ar && u.startsWith(ar)) return true;
        if (en && u.startsWith(en)) return true;
      }
      return false;
    });
  }, [contracts]);

  // Check if a property is completely sold/contracted (تم التعاقد بالكامل)
  const isPropertyFullyContracted = useCallback((p: Property): boolean => {
    const isBuilding = p.type === 'building' || (p.title_ar || '').includes('عمارة') || (p.title_en || '').toLowerCase().includes('building');
    const masterContract = getMasterContractForProperty(p);

    // If master contract exists or property listing_status is sold: fully contracted!
    if (masterContract || p.listing_status === 'sold') {
      return true;
    }

    // For buildings sold by individual units: only fully contracted if ALL units are contracted!
    if (isBuilding && p.building_units && p.building_units.length > 0) {
      const pContracts = getContractsForProperty(p);
      const allUnitsSold = p.building_units.every(u => 
        u.status === 'contracted' || pContracts.some(c => c.building_unit_id === u.unit_id)
      );
      return allUnitsSold;
    }

    return false;
  }, [getMasterContractForProperty, getContractsForProperty]);

  const baseFilteredProperties = properties.filter(p => {
    const title = (p.title_ar || p.title_en || '').toLowerCase();
    const isBuilding = p.type === 'building' || title.includes('عمارة') || title.includes('building');
    const isGarage = p.type === 'garage' || title.includes('جراج') || title.includes('garage');
    const isDuplex = title.includes('دوبلكس') || title.includes('duplex');
    const isRoof = title.includes('روف') || title.includes('رووف') || title.includes('roof');
    const isStandard = !isBuilding && !isGarage && !isDuplex && !isRoof;

    if (filterType === 'building' && !isBuilding) return false;
    if (filterType === 'garage' && !isGarage) return false;
    if (filterType === 'duplex' && !isDuplex) return false;
    if (filterType === 'roof' && !isRoof) return false;
    if (filterType === 'standard' && !isStandard) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const pTitle = (isAr ? p.title_ar : p.title_en).toLowerCase();
      const loc = (p.location || '').toLowerCase();
      return pTitle.includes(q) || loc.includes(q);
    }
    return true;
  });

  const availableProperties = baseFilteredProperties.filter(p => !isPropertyFullyContracted(p));
  const contractedProperties = baseFilteredProperties.filter(p => isPropertyFullyContracted(p));

  const contractedAggregates = React.useMemo(() => {
    let totalGross = D(0);
    let totalCollected = D(0);

    contractedProperties.forEach(p => {
      const c = getMasterContractForProperty(p);
      if (c) {
        totalGross = totalGross.plus(c.gross_contract_value || 0);
        totalCollected = totalCollected.plus(c.total_cash_collected || 0);
      } else {
        totalGross = totalGross.plus(p.price_egp || 0);
        totalCollected = totalCollected.plus(p.price_egp || 0);
      }
    });

    const totalRemaining = totalGross.minus(totalCollected);
    const avgCollectionPct = totalGross.gt(0) 
      ? Math.round(totalCollected.dividedBy(totalGross).times(100).toNumber()) 
      : 0;

    return {
      totalGross: totalGross.toFixed(2),
      totalCollected: totalCollected.toFixed(2),
      totalRemaining: totalRemaining.toFixed(2),
      avgCollectionPct,
      count: contractedProperties.length
    };
  }, [contractedProperties, getMasterContractForProperty]);

  // Card renderer reusable across both Available and Contracted portfolio sections
  const renderPropertyCard = (property: Property) => {
    const isBuildingProp = property.type === 'building' || (property.title_ar || property.title_en || '').toLowerCase().includes('عمارة') || (property.title_en || '').toLowerCase().includes('building');
    const masterContract = getMasterContractForProperty(property);
    const linkedContracts = getContractsForProperty(property);
    const isWholeBuildingSold = isBuildingProp && (!!masterContract || property.listing_status === 'sold');
    const isContracted = isPropertyFullyContracted(property);
    const contract = masterContract || linkedContracts[0];

    const grossVal = contract ? parseFloat(contract.gross_contract_value) : property.price_egp;
    const collectedCash = contract ? parseFloat(contract.total_cash_collected) : 0;
    const remainingAr = Math.max(0, grossVal - collectedCash);
    const collectionPercent = grossVal > 0 ? Math.round((collectedCash / grossVal) * 100) : 0;
    const areaSqm = property.area_sqm && property.area_sqm > 0 ? property.area_sqm : 200;
    const pricePerSqm = grossVal > 0 ? Math.round(grossVal / areaSqm) : 0;
    const suggestedDownpayment = Math.round(grossVal * 0.15); // 15% booking & contract downpayment

    const bUnits = property.building_units || [];
    const contractedUnitsCount = isWholeBuildingSold ? bUnits.length : bUnits.filter(u => u.status === 'contracted' || linkedContracts.some(c => c.building_unit_id === u.unit_id)).length;
    const isPartialUnitsSold = isBuildingProp && !isWholeBuildingSold && contractedUnitsCount > 0 && contractedUnitsCount < bUnits.length;

    // Property image fallback
    const imgUrl = property.property_images?.[0]?.url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=85&w=800&auto=format&fit=crop';

    return (
      <div
        key={property.id}
        style={{
          background: '#ffffff',
          border: isContracted 
            ? '1px solid rgba(5, 150, 105, 0.35)' 
            : isPartialUnitsSold
              ? '1px solid rgba(184, 144, 62, 0.45)'
              : '1px solid #e2e8f0',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: '430px',
          boxShadow: isContracted 
            ? '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -4px rgba(5, 150, 105, 0.08)'
            : '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -4px rgba(0,0,0,0.03)',
          transition: 'all 0.25s ease'
        }}
      >
        {/* Card Image Banner */}
        <div style={{ position: 'relative', height: '140px', width: '100%', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgUrl}
            alt={property.title_ar || property.title_en}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(15, 23, 42, 0.75) 0%, transparent 60%)'
          }} />

          {/* Status Badge Over Image */}
          <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
            {isContracted ? (
              <span style={{
                background: '#15803d',
                color: '#ffffff',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                <CheckCircle2 size={12} />
                <span>{isWholeBuildingSold ? (isAr ? 'مباع بتعاقد (عمارة كاملة)' : 'Sold (Whole Building)') : (isAr ? 'مباع بتعاقد' : 'Contracted')}</span>
              </span>
            ) : isPartialUnitsSold ? (
              <span style={{
                background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
                color: '#ffffff',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                <Building2 size={12} />
                <span>{isAr ? `بيع ${contractedUnitsCount}/${bUnits.length} شقق` : `${contractedUnitsCount}/${bUnits.length} Sold`}</span>
              </span>
            ) : (
              <span style={{
                background: '#946f23',
                color: '#ffffff',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                <Clock size={12} />
                <span>{isAr ? 'متاح للتعاقد' : 'Available'}</span>
              </span>
            )}
          </div>

          {/* Type & Area Over Image Bottom */}
          <div style={{ position: 'absolute', bottom: '10px', right: '12px', left: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span style={{
              background: 'rgba(15, 23, 42, 0.75)',
              color: '#fef08a',
              border: '1px solid rgba(254, 240, 138, 0.3)',
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 800
            }}>
              {(() => {
                const title = (property.title_ar || property.title_en || '').toLowerCase();
                if (property.type === 'building' || title.includes('عمارة') || title.includes('building')) return isAr ? 'عمارة سكنية' : 'Building';
                if (property.type === 'garage' || title.includes('جراج') || title.includes('garage')) return isAr ? 'جراج سيارات' : 'Garage';
                if (title.includes('دوبلكس') || title.includes('duplex')) return isAr ? 'دوبلكس' : 'Duplex';
                if (title.includes('روف') || title.includes('رووف') || title.includes('roof')) return isAr ? 'شقة رووف' : 'Roof Suite';
                return isAr ? 'شقة سكنية' : 'Standard Flat';
              })()}
            </span>

            <span style={{ fontSize: '0.72rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
              <MapPin size={12} color="#fef08a" />
              <span>{property.location || (isAr ? 'الشيخ زايد' : 'Sheikh Zayed')}</span>
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
          <div>
            <h4 style={{ 
              margin: 0, 
              fontSize: '0.92rem', 
              fontWeight: 800, 
              color: '#0f172a', 
              lineHeight: 1.35,
              minHeight: '2.5rem',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {isAr ? property.title_ar : property.title_en}
            </h4>
            <div style={{ display: 'flex', gap: '0.85rem', fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Maximize size={12} />
                <span>{property.area_sqm || 200} م²</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Bed size={12} />
                <span>{property.bedrooms || 3} غرف</span>
              </span>
              <span>
                {property.completion_status === 'ready' 
                  ? (isAr ? 'جاهز للتسليم' : 'Ready') 
                  : (isAr ? 'تحت الإنشاء (Off-Plan)' : 'Off-Plan')}
              </span>
            </div>
          </div>

          {/* Building Sales Mode & Units Roster Trigger */}
          {isBuildingProp && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isWholeBuildingSold ? '#ecfdf5' : 'rgba(184, 144, 62, 0.08)',
              border: isWholeBuildingSold ? '1px solid #a7f3d0' : '1px solid rgba(184, 144, 62, 0.25)',
              borderRadius: '8px',
              padding: '0.45rem 0.65rem',
              fontSize: '0.72rem'
            }}>
              <span style={{ color: isWholeBuildingSold ? '#059669' : '#946f23', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Building2 size={13} />
                <span>
                  {isWholeBuildingSold
                    ? (isAr ? `تم بيع العمارة بالكامل (${bUnits.length} شقق)` : `Whole Building Sold (${bUnits.length} Units)`)
                    : property.sale_mode === 'whole_building' ? (isAr ? 'بيع كعمارة كاملة' : 'Whole Block Only')
                    : property.sale_mode === 'individual_units' ? (isAr ? `شقق منفصلة (${bUnits.length})` : `Units (${bUnits.length})`)
                    : (isAr ? `متاح كعمارة أو شقق (${bUnits.length})` : `Whole / Units (${bUnits.length})`)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedBuildingModal(property)}
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                }}
              >
                <Layers size={12} />
                <span>{isAr ? 'مصفوفة الشقق' : 'Units'}</span>
              </button>
            </div>
          )}

          {/* Financial Overview - Uniform height & layout across all card states */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
            fontSize: '0.75rem',
            minHeight: '92px',
            justifyContent: 'center'
          }}>
            {/* Row 1: Primary Value */}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
              <span>{isContracted ? (isAr ? 'قيمة التعاقد (V):' : 'Contract Value (V):') : (isAr ? 'السعر المعروض بالكتالوج:' : 'Listing Price:')}</span>
              <span style={{ fontWeight: 800, color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
                {D(grossVal).formatEGP(isAr)}
              </span>
            </div>

            {/* Row 2: Secondary Metric */}
            {isContracted ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 700 }}>
                <span>{isAr ? 'المحصل كاش (C):' : 'Collected Cash (C):'}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{D(collectedCash).formatEGP(isAr)} ({collectionPercent}%)</span>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#946f23', fontWeight: 600 }}>
                <span>{isAr ? 'سعر المتر التقديري:' : 'Est. Price / SQM:'}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#946f23' }}>
                  {D(pricePerSqm).formatEGP(isAr)} / م²
                </span>
              </div>
            )}

            {/* Row 3: Auxiliary Financial Context */}
            {isContracted ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>{isAr ? 'المتبقي كأقساط (A/R):' : 'Remaining AR:'}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: remainingAr > 0 ? '#dc2626' : '#059669' }}>
                  {D(remainingAr).formatEGP(isAr)}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>{isAr ? 'مقدم الحجز والتعاقد (15%):' : 'Booking DP (15%):'}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: '#0f172a' }}>
                  {D(suggestedDownpayment).formatEGP(isAr)}
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar for Contracted Units */}
          {isContracted && (
            <div style={{
              width: '100%',
              height: '4px',
              background: '#e2e8f0',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${collectionPercent}%`,
                background: '#15803d',
                borderRadius: '2px'
              }} />
            </div>
          )}

          {/* Action CTAs */}
          <div style={{ display: 'flex', gap: '0.45rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
            {!isContracted ? (
              <button
                onClick={() => onOpenContractForProperty(property)}
                style={{
                  flex: 1,
                  minHeight: '40px',
                  background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
                  color: '#ffffff',
                  border: '1px solid #947228',
                  borderRadius: '8px',
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 1px 3px rgba(184, 144, 62, 0.25)',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
              >
                <Plus size={14} />
                <span>{isAr ? 'إنشاء عقد بيع للوحدة' : 'Create Contract'}</span>
              </button>
            ) : (
              <div style={{
                flex: 1,
                minHeight: '40px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '0.45rem 0.6rem',
                fontSize: '0.72rem',
                color: '#15803d',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                fontWeight: 700,
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{isAr ? (isWholeBuildingSold ? 'تم بيع العمارة' : 'تم التعاقد') : 'Contracted'}</span>
                  {contract?.contract_number && (
                    <span style={{ fontSize: '0.68rem', color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                      {contract.contract_number}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#0f172a', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isAr ? 'المشتري:' : 'Buyer:'} {contract?.buyer_name || (isAr ? 'مسجل بالعقد' : 'Registered')}
                </div>
              </div>
            )}

            {onOpenAuditForProperty && (
              <button
                onClick={() => onOpenAuditForProperty(property)}
                title={isAr ? 'تدقيق وسجل بنود ومواد البناء وتكاليف العقار' : 'Audit Lifecycle Materials & Costs'}
                style={{
                  minHeight: '40px',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  borderRadius: '8px',
                  padding: '0 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
              >
                <ShieldCheck size={13} color="#15803d" />
                <span>{isAr ? 'تدقيق المواد' : 'Audit'}</span>
              </button>
            )}

            <button
              onClick={() => onOpenCalculatorForProperty(property)}
              title={isAr ? 'حساب سعر البيع التقديري وتكاليف البناء' : 'Calculate Selling Price & Construction Cost'}
              style={{
                minHeight: '40px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#334155',
                borderRadius: '8px',
                padding: '0 0.75rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
            >
              <Calculator size={13} color="#946f23" />
              <span>{isAr ? 'حاسبة التسعير' : 'Pricing'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header & Search / Filter Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'rgba(184, 144, 62, 0.10)',
            color: '#946f23',
            padding: '0.55rem',
            borderRadius: '10px'
          }}>
            <Building2 size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              {isAr ? 'لوحة الموقف المالي والتعاقدي للعقارات والمشاريع' : 'Property Portfolio Financial Status'}
            </h3>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
              {isAr 
                ? `إجمالي المحفظة: ${properties.length} وحدة (${availableProperties.length} متاح — ${contractedProperties.length} تم التعاقد)` 
                : `Total: ${properties.length} units (${availableProperties.length} available — ${contractedProperties.length} contracted)`}
            </span>
          </div>
        </div>

        {/* Filters, Search and Segmented Switcher */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.4rem 0.75rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <Search size={14} color="#64748b" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم أو المنطقة...' : 'Search unit or location...'}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0f172a',
                fontSize: '0.76rem',
                outline: 'none',
                width: '200px',
                minWidth: '150px'
              }}
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.4rem 0.65rem',
              color: '#0f172a',
              fontSize: '0.76rem',
              outline: 'none',
              colorScheme: 'light',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            <option value="all">{isAr ? 'جميع الفئات' : 'All Categories'}</option>
            <option value="standard">{isAr ? 'شقق سكنية عادية' : 'Standard Flats'}</option>
            <option value="duplex">{isAr ? 'دوبلكس' : 'Duplex'}</option>
            <option value="roof">{isAr ? 'شقق رووف مع السطح' : 'Roof Suites'}</option>
            <option value="building">{isAr ? 'عمارات ومباني كاملة' : 'Buildings'}</option>
            <option value="garage">{isAr ? 'جراجات سيارات' : 'Garages'}</option>
          </select>

          {/* Segmented Portfolio Quick Tabs */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '2px'
          }}>
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              style={{
                background: filterStatus === 'all' ? '#0f172a' : 'transparent',
                color: filterStatus === 'all' ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {isAr ? `الكل (${baseFilteredProperties.length})` : `All (${baseFilteredProperties.length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('available')}
              style={{
                background: filterStatus === 'available' ? '#946f23' : 'transparent',
                color: filterStatus === 'available' ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {isAr ? `المتاحة للتعاقد (${availableProperties.length})` : `Available (${availableProperties.length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('sold')}
              style={{
                background: filterStatus === 'sold' ? '#15803d' : 'transparent',
                color: filterStatus === 'sold' ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {isAr ? `تم التعاقد (${contractedProperties.length})` : `Contracted (${contractedProperties.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* ─── PART 1: AVAILABLE PROPERTIES PORTFOLIO ─── */}
      {(filterStatus === 'all' || filterStatus === 'available') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Section Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '0.85rem 1.25rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ background: 'rgba(184, 144, 62, 0.10)', color: '#946f23', padding: '0.45rem', borderRadius: '8px' }}>
                <Clock size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'الوحدات والمشاريع المتاحة للتعاقد والبيع' : 'Available Properties & Open Inventory'}
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {isAr ? 'عقارات ووحدات شاغرة جاهزة للتعاقد الفوري أو قيد الإنشاء' : 'Unsold units and properties ready for contract execution'}
                </span>
              </div>
            </div>
            <span style={{
              background: 'rgba(184, 144, 62, 0.08)',
              color: '#946f23',
              border: '1px solid rgba(184, 144, 62, 0.25)',
              padding: '0.3rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.74rem',
              fontWeight: 800
            }}>
              {availableProperties.length} {isAr ? 'عقار متاح' : 'Available'}
            </span>
          </div>

          {availableProperties.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.25rem',
              alignItems: 'stretch'
            }}>
              {availableProperties.map(renderPropertyCard)}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '12px',
              color: '#64748b',
              fontSize: '0.84rem'
            }}>
              {isAr ? 'لا توجد عقارات متاحة حالياً وفق شروط البحث والفلاتر.' : 'No available properties match the current filters.'}
            </div>
          )}
        </div>
      )}

      {/* ─── PART 2: CONTRACTED & SOLD PORTFOLIO (تم التعاقد) ─── */}
      {(filterStatus === 'all' || filterStatus === 'sold') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: filterStatus === 'all' ? '1.5rem' : '0' }}>
          {/* Section Container & Financial Metrics Summary */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ background: '#f0fdf4', color: '#15803d', padding: '0.5rem', borderRadius: '10px' }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {isAr ? 'محفظة العقارات والمشاريع المُتعاقد عليها (تم التعاقد)' : 'Contracted & Sold Portfolio (Closed Deals)'}
                  </h4>
                  <span style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 600 }}>
                    {isAr ? 'عقارات ومشاريع تم توثيق عقود بيعها بالكامل وإلحاقها بدفاتر الحسابات' : 'Fully contracted and closed real estate inventory registered in ERP'}
                  </span>
                </div>
              </div>
              <span style={{
                background: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                fontSize: '0.76rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <CheckCircle2 size={13} />
                <span>{contractedProperties.length} {isAr ? 'عقار تم التعاقد عليه' : 'Contracted'}</span>
              </span>
            </div>

            {/* Financial Aggregate Strip for Contracted Inventory */}
            {contractedProperties.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                background: '#f8fafc',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                    {isAr ? 'إجمالي قيمة التعاقدات (Gross V):' : 'Gross Contract Value:'}
                  </span>
                  <strong style={{ fontSize: '0.92rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {D(contractedAggregates.totalGross).formatEGP(isAr)}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                    {isAr ? 'إجمالي النقدية المحصلة فعلياً (C):' : 'Total Cash Collected:'}
                  </span>
                  <strong style={{ fontSize: '0.92rem', color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                    {D(contractedAggregates.totalCollected).formatEGP(isAr)}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                    {isAr ? 'المتبقي كأقساط وتحصيلات (A/R):' : 'Outstanding A/R:'}
                  </span>
                  <strong style={{ fontSize: '0.92rem', color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
                    {D(contractedAggregates.totalRemaining).formatEGP(isAr)}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                    {isAr ? 'متوسط نسبة تحصيل المحفظة:' : 'Collection Rate:'}
                  </span>
                  <strong style={{ fontSize: '0.92rem', color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
                    {contractedAggregates.avgCollectionPct}%
                  </strong>
                </div>
              </div>
            )}
          </div>

          {contractedProperties.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.25rem',
              alignItems: 'stretch'
            }}>
              {contractedProperties.map(renderPropertyCard)}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              color: '#94a3b8',
              fontSize: '0.84rem'
            }}>
              {isAr ? 'لا توجد عقارات مُتعاقد عليها حالياً وفق شروط البحث والفلاتر.' : 'No contracted properties match the current filters.'}
            </div>
          )}
        </div>
      )}

      {/* BUILDING APARTMENTS & UNITS DOSSIER MODAL */}
      {selectedBuildingModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '960px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  background: 'rgba(184, 144, 62, 0.10)',
                  color: '#946f23',
                  padding: '0.6rem',
                  borderRadius: '12px'
                }}>
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                    {isAr ? selectedBuildingModal.title_ar : selectedBuildingModal.title_en}
                  </h3>
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    {isAr ? 'مصفوفة شقق ووحدات العمارة ونظام البيع' : 'Building Units Matrix & Apartment Sales Dossier'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBuildingModal(null)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  borderRadius: '8px',
                  padding: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Strategy & Summary KPIs */}
            {(() => {
              const bUnits = selectedBuildingModal.building_units || [];
              const bMasterContract = getMasterContractForProperty(selectedBuildingModal);
              const isWholeBuildingSold = !!bMasterContract || selectedBuildingModal.listing_status === 'sold';
              
              const bContracts = getContractsForProperty(selectedBuildingModal);
              const soldCount = isWholeBuildingSold ? bUnits.length : bUnits.filter(u => u.status === 'contracted' || bContracts.some(c => c.building_unit_id === u.unit_id)).length;
              const availCount = isWholeBuildingSold ? 0 : Math.max(0, bUnits.length - soldCount);
              const totalRetailVal = bUnits.reduce((acc, u) => acc + ((u.price_egp || 0) + (u.tax_amount_egp || 0)), 0);
              const totalTaxesVal = bUnits.reduce((acc, u) => acc + (u.tax_amount_egp || 0), 0);

              return (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.75rem'
                }}>
                  <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{isAr ? 'استراتيجية البيع المعتمدة:' : 'Sales Strategy:'}</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: isWholeBuildingSold ? '#059669' : '#946f23' }}>
                      {isWholeBuildingSold
                        ? (isAr ? '🏢 تم بيع العمارة بالكامل بموجب عقد رسمي' : '🏢 Sold Entirely Under Master Contract')
                        : selectedBuildingModal.sale_mode === 'whole_building' ? (isAr ? 'عمارة بالكامل فقط' : 'Whole Building Only')
                        : selectedBuildingModal.sale_mode === 'individual_units' ? (isAr ? 'بيع شقق منفصلة' : 'Individual Units')
                        : (isAr ? 'متاح كعمارة كاملة أو شقق' : 'Flexible (Whole or Units)')}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{isAr ? 'موقف شقق العمارة:' : 'Units Position:'}</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                      {soldCount} / {bUnits.length} {isAr ? (isWholeBuildingSold ? 'شقة مباعة (ضمن بيع العمارة)' : 'شقة مباعة') : 'Units Sold'}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{isAr ? 'الشقق المتاحة للتعاقد:' : 'Available Units:'}</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: availCount > 0 ? '#059669' : '#dc2626' }}>
                      {availCount} {isAr ? (isWholeBuildingSold ? 'شقة (العمارة مباعة بالكامل)' : 'شقة شاغرة') : 'Available'}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{isAr ? 'إجمالي المحفظة شاملاً الضرائب:' : 'Retail Value (Incl. Taxes):'}</span>
                      {totalTaxesVal > 0 && (
                        <span style={{ fontSize: '0.64rem', color: '#946f23', fontWeight: 700 }}>
                          +{D(totalTaxesVal).formatEGP(isAr)} {isAr ? 'ضرائب يدوية' : 'taxes'}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#946f23' }}>
                      {D(totalRetailVal).formatEGP(isAr)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Units Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem',
              marginTop: '0.5rem'
            }}>
              {(selectedBuildingModal.building_units || []).map((unit) => {
                const bMasterContract = getMasterContractForProperty(selectedBuildingModal);
                const isWholeBuildingSold = !!bMasterContract || selectedBuildingModal.listing_status === 'sold';
                const bContracts = getContractsForProperty(selectedBuildingModal);
                const unitContract = bContracts.find(c => c.building_unit_id === unit.unit_id);
                const isUnitSold = isWholeBuildingSold || unit.status === 'contracted' || !!unitContract;

                return (
                  <div key={unit.unit_id} style={{
                    background: isUnitSold ? '#f0fdf4' : '#ffffff',
                    border: isUnitSold ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                          {unit.unit_number}
                        </h4>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {isAr ? `الدور ${unit.floor} — ${unit.area_sqm} م²` : `Floor ${unit.floor} — ${unit.area_sqm} sqm`}
                        </span>
                      </div>
                      <span style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        background: isUnitSold ? '#f0fdf4' : '#fffbeb',
                        color: isUnitSold ? '#15803d' : '#946f23',
                        border: isUnitSold ? '1px solid #bbf7d0' : '1px solid rgba(184, 144, 62, 0.25)'
                      }}>
                        {isWholeBuildingSold 
                          ? (isAr ? 'مباعة (ضمن العمارة بالكامل)' : 'Sold with Building') 
                          : isUnitSold 
                            ? (isAr ? 'مُتعاقد عليها' : 'Sold') 
                            : (isAr ? 'متاحة للبيع' : 'Available')}
                      </span>
                    </div>

                    {/* Price Breakdown: Base Price + Manual Apartment Tax = Total Pricing */}
                    <div style={{ 
                      background: '#f8fafc', 
                      padding: '0.65rem 0.75rem', 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{isAr ? 'السعر الأساسي:' : 'Base Price:'}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {D(unit.price_egp).formatEGP(isAr)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.68rem', color: '#946f23', fontWeight: 700 }}>
                            {isAr ? 'الضريبة (يدوياً):' : 'Tax (Manual):'}
                          </span>
                          {!isUnitSold && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTaxUnit({
                                  unitId: unit.unit_id,
                                  unitNumber: unit.unit_number,
                                  propertyId: selectedBuildingModal.id,
                                  basePrice: unit.price_egp,
                                  taxAmount: (unit.tax_amount_egp ?? 0).toString(),
                                  taxDesc: unit.tax_description || ''
                                });
                              }}
                              style={{
                                background: '#e0f2fe',
                                color: '#946f23',
                                border: '1px solid #bae6fd',
                                borderRadius: '4px',
                                padding: '0.1rem 0.4rem',
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                              title={isAr ? 'تعديل الضريبة المضافة للشقة يدوياً' : 'Edit manual tax'}
                            >
                              {isAr ? 'تعديل الضريبة' : 'Edit Tax'}
                            </button>
                          )}
                        </div>
                        <span style={{ 
                          fontSize: '0.82rem', 
                          fontWeight: 700, 
                          color: (unit.tax_amount_egp && unit.tax_amount_egp > 0) ? '#0284c7' : '#64748b', 
                          fontVariantNumeric: 'tabular-nums' 
                        }}>
                          {unit.tax_amount_egp && unit.tax_amount_egp > 0 
                            ? `+ ${D(unit.tax_amount_egp).formatEGP(isAr)}` 
                            : (isAr ? '٠ ج.م' : '0 EGP')}
                        </span>
                      </div>

                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'baseline', 
                        borderTop: '1px solid #e2e8f0', 
                        paddingTop: '0.35rem',
                        marginTop: '0.1rem'
                      }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#946f23' }}>
                          {isAr ? 'الإجمالي شامل الضريبة:' : 'Total with Tax:'}
                        </span>
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
                          {D(unit.price_egp + (unit.tax_amount_egp || 0)).formatEGP(isAr)}
                        </span>
                      </div>
                    </div>

                    {isUnitSold ? (
                      <div style={{ 
                        fontSize: '0.72rem', 
                        color: '#15803d', 
                        background: '#f0fdf4', 
                        border: '1px solid #bbf7d0',
                        padding: '0.45rem 0.65rem', 
                        borderRadius: '6px',
                        lineHeight: 1.4
                      }}>
                        {isWholeBuildingSold ? (
                          <>
                            <div style={{ fontWeight: 800 }}>
                              {isAr ? 'مباعة ضمن بيع العمارة بالكامل' : 'Sold under master building contract'}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#15803d' }}>
                              {bMasterContract ? `${isAr ? 'عقد:' : 'Contract:'} ${bMasterContract.contract_number} (${bMasterContract.buyer_name})` : ''}
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontWeight: 800 }}>
                              {(unitContract?.contract_number || unit.contract_number) 
                                ? `${isAr ? 'عقد:' : 'Contract:'} ${unitContract?.contract_number || unit.contract_number}` 
                                : (isAr ? 'مباعة وموثقة' : 'Contracted')}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#15803d' }}>
                              {unitContract?.buyer_name || unit.buyer_name ? `${isAr ? 'المشتري:' : 'Buyer:'} ${unitContract?.buyer_name || unit.buyer_name}` : ''}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const bldg = selectedBuildingModal;
                          setSelectedBuildingModal(null);
                          onOpenContractForProperty(bldg, unit);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
                          color: '#ffffff',
                          border: '1px solid #947228',
                          borderRadius: '8px',
                          padding: '0.5rem',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 1px 3px rgba(184, 144, 62, 0.25)'
                        }}
                      >
                        <Plus size={14} />
                        <span>{isAr ? 'إنشاء عقد بيع لهذه الشقة' : 'Create Contract for Unit'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Manual Apartment Tax */}
      {editingTaxUnit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.2)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            padding: '1.75rem',
            direction: isAr ? 'rtl' : 'ltr',
            color: '#0f172a'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? `تحديد الضريبة يدوياً — ${editingTaxUnit.unitNumber}` : `Manual Tax — ${editingTaxUnit.unitNumber}`}
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: '0.2rem' }}>
                  {isAr ? 'الضريبة ليست نسبة ثابتة؛ تُضاف يدوياً لكل شقة وتُحسب ضمن التسعير' : 'Non-static manual tax per apartment calculated in pricing'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingTaxUnit(null)}
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.4rem' }}>
                  {isAr ? 'قيمة الضريبة المضافة للشقة باليد (ج.م):' : 'Manual Apartment Tax Amount (EGP):'}
                </label>
                <input
                  type="number"
                  step="1000"
                  value={editingTaxUnit.taxAmount}
                  onChange={e => setEditingTaxUnit({ ...editingTaxUnit, taxAmount: e.target.value })}
                  placeholder="50000"
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: '#946f23',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    outline: 'none'
                  }}
                />
                
                {/* Quick Helper Presets */}
                <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setEditingTaxUnit({ ...editingTaxUnit, taxAmount: '0' })}
                    style={{ fontSize: '0.65rem', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b', padding: '0.2rem 0.5rem', borderRadius: '5px', cursor: 'pointer' }}
                  >
                    {isAr ? '٠ بدون ضريبة' : '0 EGP'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tax25 = Math.round(editingTaxUnit.basePrice * 0.025);
                      setEditingTaxUnit({ ...editingTaxUnit, taxAmount: tax25.toString() });
                    }}
                    style={{ fontSize: '0.65rem', background: '#e0f2fe', border: '1px solid #bae6fd', color: '#946f23', padding: '0.2rem 0.5rem', borderRadius: '5px', cursor: 'pointer' }}
                  >
                    {isAr ? `٢.٥٪ استرشادية (${Math.round(editingTaxUnit.basePrice * 0.025).toLocaleString()} ج.م)` : '2.5% Guideline'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTaxUnit({ ...editingTaxUnit, taxAmount: '50000' })}
                    style={{ fontSize: '0.65rem', background: '#e0f2fe', border: '1px solid #bae6fd', color: '#946f23', padding: '0.2rem 0.5rem', borderRadius: '5px', cursor: 'pointer' }}
                  >
                    +50,000 ج.م
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTaxUnit({ ...editingTaxUnit, taxAmount: '100000' })}
                    style={{ fontSize: '0.65rem', background: '#e0f2fe', border: '1px solid #bae6fd', color: '#946f23', padding: '0.2rem 0.5rem', borderRadius: '5px', cursor: 'pointer' }}
                  >
                    +100,000 ج.م
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.4rem' }}>
                  {isAr ? 'بيان أو مسمى الضريبة للشقة (اختياري):' : 'Tax Note / Description (Optional):'}
                </label>
                <input
                  type="text"
                  value={editingTaxUnit.taxDesc}
                  onChange={e => setEditingTaxUnit({ ...editingTaxUnit, taxDesc: e.target.value })}
                  placeholder={isAr ? 'ضريبة ورسوم محددة يدوياً للشقة / ضريبة تصرفات عقارية' : 'Manual Apartment Tax'}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    color: '#0f172a',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Dynamic Pricing Calculation Preview */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b' }}>
                  <span>{isAr ? 'سعر الشقة الأساسي:' : 'Base Apartment Price:'}</span>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>{D(editingTaxUnit.basePrice).formatEGP(isAr)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#946f23' }}>
                  <span>{isAr ? 'الضريبة المضافة باليد:' : 'Manual Tax Added:'}</span>
                  <span style={{ fontWeight: 700 }}>+ {D(parseFloat(editingTaxUnit.taxAmount) || 0).formatEGP(isAr)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#946f23', fontWeight: 800, borderTop: '1px solid #e2e8f0', paddingTop: '0.45rem', marginTop: '0.2rem' }}>
                  <span>{isAr ? 'إجمالي السعر شامل الضريبة:' : 'Total Price with Tax:'}</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                    {D(editingTaxUnit.basePrice + (parseFloat(editingTaxUnit.taxAmount) || 0)).formatEGP(isAr)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingTaxUnit(null)}
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: '#475569',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveUnitTax}
                  disabled={isSavingTax}
                  style={{
                    flex: 2,
                    background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
                    border: '1px solid #947228',
                    color: '#ffffff',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    cursor: isSavingTax ? 'wait' : 'pointer',
                    boxShadow: '0 2px 8px rgba(184, 144, 62, 0.25)'
                  }}
                >
                  {isSavingTax ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الضريبة وتحديث تسعير الشقة' : 'Save Tax & Update Price')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
