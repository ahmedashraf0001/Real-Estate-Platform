'use client';

import React, { useMemo } from 'react';
import { 
  Building2, 
  Clock, 
  CheckCircle2, 
  DollarSign, 
  Plus,
  Layers,
  TrendingUp
} from 'lucide-react';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPContract, ERPPropertyCostItem } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { PropertyFinancialMatrix } from '../../PropertyFinancialMatrix';
import { ZFKpiCard } from '../ZFKpiCard';
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
              {isAr ? 'المشاريع والشقق المعروضة' : 'Property Portfolio Financial Status'}
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
              {isAr ? 'العماير والشقق' : 'Architectural Assets'}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
            {isAr 
              ? 'متابعة العماير والشقق، مصاريف المباني اللي اتصرفت، والشقق المتاحة والمباعة'
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

      {/* 2. THE 4 EXECUTIVE PROPERTY KPI CARDS */}
      <div className={styles.kpiGrid}>
        <ZFKpiCard
          title={isAr ? 'عدد كل الشقق' : 'Total Portfolio Listings'}
          value={totalProps}
          unitLabel={isAr ? 'شقة' : 'Units'}
          icon={<Building2 size={16} />}
          accentColor="slate"
          subtitleLabel={isAr ? 'حالة المعروض' : 'Catalog Inventory'}
          subtitleValue={isAr ? 'جاهزة وشغالة في البناء' : 'Ready & WIP'}
        />

        <ZFKpiCard
          title={isAr ? 'شقق جاهزة للبيع' : 'Available for Sale'}
          value={availableProps}
          unitLabel={isAr ? 'شقة متاحة' : 'Units Open'}
          icon={<Layers size={16} />}
          accentColor="gold"
          progress={totalProps > 0 ? Math.round((availableProps / totalProps) * 100) : 0}
          subtitleLabel={isAr ? 'نسبة المتاح للبيع' : 'Open Inventory'}
          subtitleValue={totalProps > 0 ? `${Math.round((availableProps / totalProps) * 100)}%` : '0%'}
        />

        <ZFKpiCard
          title={isAr ? 'شقق مبيوعة' : 'Contracted / Sold Units'}
          value={contractedProps}
          unitLabel={isAr ? 'شقة مبيوعة' : 'Units Sold'}
          icon={<CheckCircle2 size={16} />}
          accentColor="emerald"
          progress={soldPercent}
          subtitleLabel={isAr ? 'نسبة الشقق المبيوعة' : 'Portfolio Sold Rate'}
          subtitleValue={`${soldPercent}%`}
        />

        <ZFKpiCard
          title={isAr ? 'إجمالي قيمة الشقق المعروضة' : 'Gross Portfolio Valuation'}
          value={totalCatalogVal.formatEGP(isAr)}
          isFlagship={true}
          accentColor="gold"
          icon={<TrendingUp size={16} />}
          subtitleLabel={isAr ? 'إجمالي أسعار الشقق' : 'Catalog Valuation'}
          subtitleValue={isAr ? 'حسب سعر البيع' : 'List Price'}
        />
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
