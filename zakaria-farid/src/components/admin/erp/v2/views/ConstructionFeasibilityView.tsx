'use client';

import React from 'react';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPPropertyCostItem } from '@/lib/erp/types';
import { CostPricingCalculator } from './calculator/CostPricingCalculator';
import styles from '../ZFWorkstationShell.module.css';

interface ConstructionFeasibilityViewProps {
  properties: Property[];
  propertyCosts?: ERPPropertyCostItem[];
  initialPropertyId?: string;
  onOpenAuditForProperty?: (property: Property) => void;
  onOpenContractForProperty?: (property: Property, unit?: BuildingUnitItem) => void;
  onUpdateSellingPrice?: (propertyId: string, newPriceEgp: number) => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
  isAr?: boolean;
}

export const ConstructionFeasibilityView: React.FC<ConstructionFeasibilityViewProps> = ({
  properties,
  propertyCosts,
  initialPropertyId,
  onOpenAuditForProperty,
  onUpdateSellingPrice,
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
        onNavigateToTab={onNavigateToTab}
        isAr={isAr}
      />
    </div>
  );
};
