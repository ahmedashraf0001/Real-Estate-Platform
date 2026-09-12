'use client';

import React, { useMemo } from 'react';
import { 
  Building2, 
  Clock, 
  CheckCircle2, 
  DollarSign, 
  Plus, 
  Layers, 
  TrendingUp,
  Compass,
  Wallet
} from 'lucide-react';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPContract, ERPPropertyCostItem } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { PropertyFinancialMatrix } from '../../PropertyFinancialMatrix';
import { ZFKpiCard } from '../ZFKpiCard';
import { ZFErpBreadcrumb } from '../common/ZFErpBreadcrumb';
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
  // Financial Portfolio Telemetry Calculations (Real Investment Metrics)
  const { 
    totalProps, 
    contractedPropsCount, 
    availablePropsCount, 
    totalCatalogVal, 
    availableInventoryVal,
    contractedSalesVal,
    soldValuePct,
    avgPricePerSqm,
    totalAreaSqm,
    totalWipInvested
  } = useMemo(() => {
    const total = properties.length;
    
    // Check if property is contracted
    const isContractedProp = (p: Property) => {
      if (p.listing_status === 'sold') return true;
      return contracts.some(c => 
        c.status !== 'Rescinded' && (
          (c.property_id && c.property_id === p.id) ||
          (c.unit_id && (c.unit_id === p.title_ar || c.unit_id === p.title_en))
        )
      );
    };

    const contractedProps = properties.filter(isContractedProp);
    const availableProps = properties.filter(p => !isContractedProp(p));

    const catalogVal = properties.reduce((acc, p) => acc.plus(p.price_egp || 0), D(0));
    const availableVal = availableProps.reduce((acc, p) => acc.plus(p.price_egp || 0), D(0));
    const contractedVal = catalogVal.minus(availableVal);

    const totalArea = properties.reduce((acc, p) => acc.plus(p.area_sqm || 0), D(0));
    const avgPriceSqm = totalArea.isZero() ? D(0) : catalogVal.div(totalArea);

    const soldPct = catalogVal.isZero() ? 0 : Math.round(contractedVal.div(catalogVal).times(100).toNumber());

    // Total WIP costs from propertyCosts
    const wipTotal = propertyCosts.reduce((acc, c) => acc.plus(c.total_cost_egp || c.total_amount || 0), D(0));

    return {
      totalProps: total,
      contractedPropsCount: contractedProps.length,
      availablePropsCount: availableProps.length,
      totalCatalogVal: catalogVal,
      availableInventoryVal: availableVal,
      contractedSalesVal: contractedVal,
      soldValuePct: soldPct,
      avgPricePerSqm: avgPriceSqm,
      totalAreaSqm: totalArea,
      totalWipInvested: wipTotal
    };
  }, [properties, contracts, propertyCosts]);

  return (
    <div className={styles.stageContainer}>
      {/* 1. STAGE HEADER & QUICK ACTION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <ZFErpBreadcrumb sectionTitle={isAr ? 'المحفظة الاستثمارية للعقارات' : 'Investment Portfolio'} icon={<Building2 size={13} color="#946f23" />} />
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
              {isAr ? 'المحفظة الاستثمارية' : 'Investment Portfolio'}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
            {isAr 
              ? 'متابعة مؤشرات أسعار المتر، المخزون المتاح، رأس المال المنفذ بالبناء، ومعدل حجز الشقق'
              : 'Tracking price/sqm benchmarks, available inventory, WIP capital absorption, and sales velocity'}
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

      {/* 2. THE 4 EXECUTIVE PORTFOLIO INVESTMENT METRICS */}
      <div className={styles.kpiGrid}>
        {/* Metric 1: Avg Price / SQM */}
        <ZFKpiCard
          title={isAr ? 'متوسط سعر المتر البيعي' : 'Portfolio Avg Price / m²'}
          value={`${avgPricePerSqm.formatEGP(isAr)} / م²`}
          icon={<Compass size={16} />}
          accentColor="blue"
          subtitleLabel={isAr ? 'إجمالي مساحات المحفظة' : 'Recorded Area'}
          subtitleValue={`${totalAreaSqm.toNumber().toLocaleString()} م² (${totalProps} ${isAr ? 'عقار' : 'units'})`}
          tooltip={isAr 
            ? 'متوسط سعر بيع المتر المربع عبر كافة شقق ووحدات المحفظة المعروضة بالمتر المسطح.' 
            : 'Weighted average selling price per square meter across total portfolio catalog.'}
        />

        {/* Metric 2: Available Inventory Market Value */}
        <ZFKpiCard
          title={isAr ? 'قيمة المخزون المتاح للبيع' : 'Available Inventory Value'}
          value={availableInventoryVal.formatEGP(isAr)}
          icon={<Layers size={16} />}
          accentColor="gold"
          progress={100 - soldValuePct}
          progressColor="#946f23"
          subtitleLabel={isAr ? 'متاح للتعاقد الفوري' : 'Open for Contracts'}
          subtitleValue={`${availablePropsCount} ${isAr ? 'عقار شاغر' : 'open units'}`}
          tooltip={isAr 
            ? 'إجمالي القيمة النقدية المتوقع تحصيلها من بيع كافة الشقق والوحدات الشاغرة المتبقية.' 
            : 'Total aggregate list value of unsold units currently available for immediate booking.'}
        />

        {/* Metric 3: Absorbed Construction WIP Capital */}
        <ZFKpiCard
          title={isAr ? 'رأس المال المستثمر في المباني' : 'Absorbed WIP Capital'}
          value={totalWipInvested.formatEGP(isAr)}
          icon={<Building2 size={16} />}
          accentColor="amber"
          subtitleLabel={isAr ? 'أصل استثماري محمل' : 'Capitalized WIP'}
          subtitleValue={`${propertyCosts.length} ${isAr ? 'فاتورة وبند تكلفة' : 'cost items'}`}
          tooltip={isAr 
            ? 'إجمالي ما تم صرفه فعلياً من خرسانات وتشطيبات ورسوم مواقع محملة كرأسمال استثماري (حساب 150000).' 
            : 'Total capital expenditure incurred on land, structural concrete, and architectural fit-out.'}
        />

        {/* Metric 4: Portfolio Sales Velocity */}
        <ZFKpiCard
          title={isAr ? 'إجمالي مبيعات المحفظة' : 'Contracted Sales Volume'}
          value={contractedSalesVal.formatEGP(isAr)}
          isFlagship={true}
          accentColor="emerald"
          progress={soldValuePct}
          progressColor="#047857"
          icon={<TrendingUp size={16} />}
          badge={{ text: `${soldValuePct}% ${isAr ? 'مبيوع' : 'Sold'}`, variant: 'positive' }}
          subtitleLabel={isAr ? 'نسبة المبيعات من المحفظة' : 'Portfolio Sold Rate'}
          subtitleValue={`${soldValuePct}% (${contractedPropsCount} ${isAr ? 'عقار متعاقد عليه' : 'closed'})`}
          tooltip={isAr 
            ? 'مجموع أسعار العقود التي تم توثيقها وبيعها بالفعل، ونسبتها من إجمالي قيمة المحفظة.' 
            : 'Total gross value of contracted deals and the percentage sold against total portfolio ceiling.'}
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
