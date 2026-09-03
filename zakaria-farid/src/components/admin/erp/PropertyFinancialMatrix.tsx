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
  Search
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { ERPContract } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';

interface PropertyFinancialMatrixProps {
  properties: Property[];
  contracts: ERPContract[];
  onOpenContractForProperty: (property: Property) => void;
  onOpenCalculatorForProperty: (property: Property) => void;
  isAr: boolean;
}

export const PropertyFinancialMatrix: React.FC<PropertyFinancialMatrixProps> = ({
  properties,
  contracts,
  onOpenContractForProperty,
  onOpenCalculatorForProperty,
  isAr
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Robust contract-to-property resolver: matches by property_id OR unit_id (exact, prefix, or subtitle)
  const getContractForProperty = useCallback((p: Property): ERPContract | undefined => {
    return contracts.find(c => {
      if (c.status === 'Rescinded') return false;
      if (c.property_id && c.property_id === p.id) return true;
      if (c.unit_id) {
        const u = c.unit_id.trim();
        const ar = (p.title_ar || '').trim();
        const en = (p.title_en || '').trim();
        if (u === ar || u === en) return true;
        if (ar && (ar.startsWith(u) || u.startsWith(ar))) return true;
        if (en && (en.startsWith(u) || u.startsWith(en))) return true;
      }
      return false;
    });
  }, [contracts]);

  const filteredProperties = properties.filter(p => {
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

    const contract = getContractForProperty(p);
    const isSold = !!contract || p.listing_status === 'sold' || p.listing_status === 'under_offer';
    if (filterStatus === 'sold' && !isSold) return false;
    if (filterStatus === 'available' && isSold) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const pTitle = (isAr ? p.title_ar : p.title_en).toLowerCase();
      const loc = (p.location || '').toLowerCase();
      return pTitle.includes(q) || loc.includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header & Search Bar */}
      <div style={{
        background: 'rgba(18, 22, 34, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'rgba(212, 175, 55, 0.15)',
            color: 'var(--zf-gold, #d4af37)',
            padding: '0.55rem',
            borderRadius: '10px'
          }}>
            <Building2 size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
              {isAr ? 'لوحة الموقف المالي والتعاقدي للعقارات والمشاريع' : 'Property Portfolio Financial Status'}
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--zf-text-secondary, #a7acc0)' }}>
              {isAr ? `إجمالي العقارات بالكتالوج: ${properties.length} وحدة معروضة` : `Total Listings: ${properties.length} active units`}
            </span>
          </div>
        </div>

        {/* Filters and Search Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '0.4rem 0.75rem'
          }}>
            <Search size={14} color="#9ca3af" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم أو المنطقة...' : 'Search unit or location...'}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.76rem',
                outline: 'none',
                width: '150px'
              }}
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.4rem 0.65rem',
              color: '#ffffff',
              fontSize: '0.76rem',
              outline: 'none',
              colorScheme: 'dark'
            }}
          >
            <option value="all">{isAr ? 'جميع الفئات' : 'All Categories'}</option>
            <option value="standard">{isAr ? 'شقق سكنية عادية' : 'Standard Flats'}</option>
            <option value="duplex">{isAr ? 'دوبلكس' : 'Duplex'}</option>
            <option value="roof">{isAr ? 'شقق رووف مع السطح' : 'Roof Suites'}</option>
            <option value="building">{isAr ? 'عمارات ومباني كاملة' : 'Buildings'}</option>
            <option value="garage">{isAr ? 'جراجات سيارات' : 'Garages'}</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.4rem 0.65rem',
              color: '#ffffff',
              fontSize: '0.76rem',
              outline: 'none',
              colorScheme: 'dark'
            }}
          >
            <option value="all">{isAr ? 'كافة الحالات التعاقدية' : 'All Contract States'}</option>
            <option value="available">{isAr ? 'متاحة للتعاقد فقط' : 'Available for Sale'}</option>
            <option value="sold">{isAr ? 'مباعة بتعاقد نشط' : 'Contracted / Sold'}</option>
          </select>
        </div>
      </div>

      {/* Property Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '1.25rem'
      }}>
        {filteredProperties.map(property => {
          const contract = getContractForProperty(property);
          const isContracted = !!contract || property.listing_status === 'sold' || property.listing_status === 'under_offer';
          const grossVal = contract ? parseFloat(contract.gross_contract_value) : property.price_egp;
          const collectedCash = contract ? parseFloat(contract.total_cash_collected) : 0;
          const remainingAr = Math.max(0, grossVal - collectedCash);
          const collectionPercent = grossVal > 0 ? Math.round((collectedCash / grossVal) * 100) : 0;

          // Property image fallback
          const imgUrl = property.property_images?.[0]?.url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=85&w=800&auto=format&fit=crop';

          return (
            <div
              key={property.id}
              style={{
                background: 'rgba(18, 22, 34, 0.75)',
                border: isContracted 
                  ? '1px solid rgba(16, 185, 129, 0.3)' 
                  : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                transition: 'all 0.2s ease'
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
                  background: 'linear-gradient(to top, rgba(10, 12, 18, 0.9) 0%, transparent 60%)'
                }} />

                {/* Status Badge Over Image */}
                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  {isContracted ? (
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.9)',
                      color: '#ffffff',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                    }}>
                      <CheckCircle2 size={12} />
                      <span>{isAr ? 'مباع بتعاقد' : 'Contracted'}</span>
                    </span>
                  ) : (
                    <span style={{
                      background: 'rgba(59, 130, 246, 0.85)',
                      color: '#ffffff',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                    }}>
                      <Clock size={12} />
                      <span>{isAr ? 'متاح للتعاقد' : 'Available'}</span>
                    </span>
                  )}
                </div>

                {/* Type & Area Over Image Bottom */}
                <div style={{ position: 'absolute', bottom: '10px', right: '12px', left: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <span style={{
                    background: 'rgba(0, 0, 0, 0.6)',
                    color: 'var(--zf-gold, #d4af37)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
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

                  <span style={{ fontSize: '0.72rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                    <MapPin size={12} color="var(--zf-gold, #d4af37)" />
                    <span>{property.location || (isAr ? 'الشيخ زايد' : 'Sheikh Zayed')}</span>
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.3 }}>
                    {isAr ? property.title_ar : property.title_en}
                  </h4>
                  <div style={{ display: 'flex', gap: '0.85rem', fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.35rem' }}>
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

                {/* Financial Overview */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  fontSize: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                    <span>{isContracted ? (isAr ? 'قيمة التعاقد (V):' : 'Contract Value (V):') : (isAr ? 'السعر المعروض بالكتالوج:' : 'Listing Price:')}</span>
                    <span style={{ fontWeight: 800, color: 'var(--zf-gold, #d4af37)', fontFamily: 'monospace' }}>
                      {D(grossVal).formatEGP(isAr)}
                    </span>
                  </div>

                  {isContracted && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399', fontWeight: 700 }}>
                        <span>{isAr ? 'المحصل كاش (C):' : 'Collected Cash (C):'}</span>
                        <span style={{ fontFamily: 'monospace' }}>{D(collectedCash).formatEGP(isAr)} ({collectionPercent}%)</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8' }}>
                        <span>{isAr ? 'المتبقي كأقساط (A/R):' : 'Pending Tranches:'}</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{D(remainingAr).formatEGP(isAr)}</span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden', marginTop: '0.2rem' }}>
                        <div style={{ height: '100%', width: `${collectionPercent}%`, background: '#10b981', borderRadius: '999px' }} />
                      </div>
                    </>
                  )}
                </div>

                {/* Actions Footer */}
                <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', paddingTop: '0.25rem' }}>
                  {!isContracted ? (
                    <button
                      onClick={() => onOpenContractForProperty(property)}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, var(--zf-gold, #d4af37) 0%, #b89628 100%)',
                        color: '#0a0c12',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.55rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Plus size={14} />
                      <span>{isAr ? 'إنشاء عقد بيع للوحدة' : 'Create Contract'}</span>
                    </button>
                  ) : (
                    <div style={{
                      flex: 1,
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: '8px',
                      padding: '0.45rem 0.6rem',
                      fontSize: '0.72rem',
                      color: '#34d399',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      fontWeight: 700
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{isAr ? 'تم التعاقد' : 'Contracted'}</span>
                        {contract?.contract_number && (
                          <span style={{ fontSize: '0.68rem', color: '#a7f3d0', fontFamily: 'monospace' }}>
                            {contract.contract_number}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#e2e8f0', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isAr ? 'المشتري:' : 'Buyer:'} {contract?.buyer_name || (isAr ? 'مسجل بالعقد' : 'Registered')}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => onOpenCalculatorForProperty(property)}
                    title={isAr ? 'دراسة جدوى تكلفة بناء هذا العقار' : 'Calculate Construction Cost for this Property'}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#e2e8f0',
                      borderRadius: '8px',
                      padding: '0 0.65rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Calculator size={13} color="var(--zf-gold, #d4af37)" />
                    <span>{isAr ? 'حاسبة التكلفة' : 'Cost'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
