'use client';

import React from 'react';
import { Property } from '@/lib/supabase/types';
import { ERPPropertyCostItem } from '@/lib/erp/types';
import { ConstructionCostCalculator } from '../../ConstructionCostCalculator';
import styles from '../ZFWorkstationShell.module.css';

interface ConstructionFeasibilityViewProps {
  properties: Property[];
  propertyCosts?: ERPPropertyCostItem[];
  initialPropertyId?: string;
  onOpenAuditForProperty?: (property: Property) => void;
  onUpdateSellingPrice?: (propertyId: string, newPriceEgp: number) => Promise<void>;
  isAr?: boolean;
}

export const ConstructionFeasibilityView: React.FC<ConstructionFeasibilityViewProps> = ({
  properties,
  propertyCosts,
  initialPropertyId,
  onOpenAuditForProperty,
  onUpdateSellingPrice,
  isAr = true
}) => {
  return (
    <div className={styles.stageContainer}>
      <ConstructionCostCalculator 
        properties={properties}
        propertyCosts={propertyCosts}
        initialPropertyId={initialPropertyId}
        onOpenAuditForProperty={onOpenAuditForProperty}
        onUpdateSellingPrice={onUpdateSellingPrice}
        isAr={isAr}
      />
    </div>
  );
};
