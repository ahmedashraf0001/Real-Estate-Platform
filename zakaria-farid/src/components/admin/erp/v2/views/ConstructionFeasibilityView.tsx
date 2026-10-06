'use client';

import React from 'react';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPPropertyCostItem, ERPPropertyPriceHistoryEntry } from '@/lib/erp/types';
import { CostPricingCalculator } from './calculator/CostPricingCalculator';
import styles from '../ZFWorkstationShell.module.css';

interface ConstructionFeasibilityViewProps {
  properties: Property[];
  propertyCosts?: ERPPropertyCostItem[];
  initialPropertyId?: string;
  onOpenAuditForProperty?: (property: Property) => void;
  onOpenContractForProperty?: (property: Property, unit?: BuildingUnitItem) => void;
  onUpdateSellingPrice?: (
    propertyId: string,
    newPriceEgp: number,
    options?: { finalize?: boolean; unitPrices?: Record<string, number>; costBasisEgp?: string }
  ) => Promise<boolean | void>;
  loadPriceHistory?: (propertyId: string) => Promise<ERPPropertyPriceHistoryEntry[]>;
  onNavigateToTab?: (tab: string) => void;
  isAr?: boolean;
}

export const ConstructionFeasibilityView: React.FC<ConstructionFeasibilityViewProps> = ({
  properties,
  propertyCosts,
  initialPropertyId,
  onOpenAuditForProperty,
  onUpdateSellingPrice,
  loadPriceHistory,
  onNavigateToTab,
  isAr = true
}) => {
  return (
    <div className={styles.stageContainer}>
      <CostPricingCalculator 
        properties={properties}
        propertyCosts={propertyCosts}
        initialPropertyId={initialPropertyId}
        onOpenAuditForProperty={onOpenAuditForProperty}
        onUpdateSellingPrice={onUpdateSellingPrice}
        loadPriceHistory={loadPriceHistory}
        onNavigateToTab={onNavigateToTab}
        isAr={isAr}
      />
    </div>
  );
};
