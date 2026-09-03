'use client';

import React, { useMemo } from 'react';
import { 
  Building2, 
  Clock, 
  CheckCircle2, 
  DollarSign, 
  Plus,
  Layers
} from 'lucide-react';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPContract, ERPPropertyCostItem } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { PropertyFinancialMatrix } from '../../PropertyFinancialMatrix';
import styles from '../ZFWorkstationShell.module.css';

interface PropertiesPortfolioViewProps {
  properties: Property[];
  contracts: ERPContract[];
  propertyCosts?: ERPPropertyCostItem[];
  isAr?: boolean;
  isMutating?: boolean;
  onOpenNewContract: () => void;
  onOpenContractForProperty: (property: Property, unit?: BuildingUnitItem) => void;
  onOpenCalculatorForProperty: (property: Property) => void;
  onOpenAuditForProperty?: (property: Property) => void;
  onUpdatePropertyUnitTax?: (propertyId: string, unitId: string, taxAmount: number, taxDesc?: string) => Promise<void>;
}

export const PropertiesPortfolioView: React.FC<PropertiesPortfolioViewProps> = ({
  properties,
  contracts,
  propertyCosts = [],
  isAr = true,
  isMutating = false,
  onOpenNewContract,
  onOpenContractForProperty,
  onOpenCalculatorForProperty,
  onOpenAuditForProperty,
  onUpdatePropertyUnitTax
}) => {
  // Financial Portfolio KPI Calculations
  const { totalProps, contractedProps, availableProps, totalCatalogVal, soldPercent } = useMemo(() => {
    const total = properties.length;
    const contracted = properties.filter(p => 
      contracts.some(c => c.status !== 'Rescinded' && (c.property_id === p.id || c.unit_id === p.title_ar || c.unit_id === p.title_en)) || 
      p.listing_status === 'sold'
    ).length;
    const available = Math.max(0, total - contracted);
    const catalogVal = properties.reduce((acc, p) => acc.plus(p.price_egp || 0), D(0));
    const percent = total > 0 ? Math.round((contracted / total) * 100) : 0;

    return {
      totalProps: total,
      contractedProps: contracted,
      availableProps: available,
      totalCatalogVal: catalogVal,
      soldPercent: percent
    };
  }, [properties, contracts]);

  return (
    <div className={styles.stageContainer}>
      {/* 1. STAGE HEADER & QUICK ACTION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {isAr ? 'الموقف المالي والتعاقدي لمحفظة العقارات' : 'Property Portfolio Financial Status'}
            </h1>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '0.18rem 0.55rem',
              borderRadius: '6px',
              background: 'rgba(184, 144, 62, 0.09)',
              border: '1px solid rgba(184, 144, 62, 0.28)',
              color: '#946f23'
            }}>
              {isAr ? 'حصر الأصول المعمارية' : 'Architectural Assets'}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
            {isAr 
              ? 'متابعة حصر الأصول المعمارية، تكلفة الأراضي، والإنشاءات (WIP)، وحالة التسويق والتعاقد الفعلي'
              : 'Tracking real estate assets, land & WIP construction cost basis, and contract pipeline'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className={styles.btnPrimary} 
            onClick={onOpenNewContract}
            disabled={isMutating}
          >
            <Plus size={14} />
            <span>{isAr ? 'عقد بيع جديد' : 'New Sales Contract'}</span>
          </button>
        </div>
      </div>

      {/* 2. THE 4 EXECUTIVE PROPERTY KPI CARDS (Apple / Mercury Elegance) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {/* Card 1: Total Units */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
              {isAr ? 'إجمالي وحدات المحفظة' : 'Total Portfolio Listings'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.25rem 0' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {totalProps} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>{isAr ? 'وحدة ومبنى' : 'Units'}</span>
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'كتالوج الأصول المعمارية' : 'Catalog Inventory'}</span>
            <strong style={{ color: '#0f172a' }}>{isAr ? 'جاهزة وتحت التنفيذ' : 'Ready & WIP'}</strong>
          </div>
        </div>

        {/* Card 2: Available Units */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
              {isAr ? 'الوحدات المتاحة للتعاقد' : 'Available for Sale'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#946f23', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.25rem 0' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {availableProps} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#946f23' }}>{isAr ? 'وحدة متاحة' : 'Units Open'}</span>
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'نسبة المعروض الحر' : 'Open Inventory'}</span>
            <strong style={{ color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
              {totalProps > 0 ? `${Math.round((availableProps / totalProps) * 100)}%` : '0%'}
            </strong>
          </div>
        </div>

        {/* Card 3: Sold / Contracted Units */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
              {isAr ? 'الوحدات المتعاقد عليها (المباعة)' : 'Contracted / Sold Units'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#15803d', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.25rem 0' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {contractedProps} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#15803d' }}>{isAr ? 'وحدة مباعة' : 'Units Sold'}</span>
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'نسبة تسويق المحفظة' : 'Portfolio Sold Rate'}</span>
            <strong style={{ color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>{soldPercent}%</strong>
          </div>
        </div>

        {/* Card 4: Total Portfolio Value — Premier Gold Accent */}
        <div className={styles.card} style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #fefdfa 100%)',
          border: '1px solid rgba(184, 144, 62, 0.35)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 4px 16px -4px rgba(184, 144, 62, 0.12)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#946f23' }}>
              {isAr ? 'القيمة السوقية للمحفظة' : 'Gross Portfolio Valuation'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#b8903e', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.25rem 0' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {totalCatalogVal.formatEGP(isAr)}
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', borderTop: '1px solid rgba(184, 144, 62, 0.18)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'إجمالي تقييم أسعار الوحدات' : 'Catalog Valuation'}</span>
            <strong style={{ color: '#946f23' }}>{isAr ? 'سعر القائمة' : 'List Price'}</strong>
          </div>
        </div>
      </div>

      {/* 3. PROPERTY FINANCIAL MATRIX COMPONENT */}
      <PropertyFinancialMatrix 
        properties={properties}
        contracts={contracts}
        propertyCosts={propertyCosts}
        onOpenContractForProperty={onOpenContractForProperty}
        onOpenCalculatorForProperty={onOpenCalculatorForProperty}
        onOpenAuditForProperty={onOpenAuditForProperty}
        onUpdatePropertyUnitTax={onUpdatePropertyUnitTax}
        isAr={isAr}
      />
    </div>
  );
};
