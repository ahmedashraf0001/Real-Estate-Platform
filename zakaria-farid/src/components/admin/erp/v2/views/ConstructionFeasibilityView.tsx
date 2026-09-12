'use client';

import React from 'react';
import { Calculator } from 'lucide-react';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPPropertyCostItem } from '@/lib/erp/types';
import { ConstructionCostCalculator } from '../../ConstructionCostCalculator';
import { ZFErpBreadcrumb } from '../common/ZFErpBreadcrumb';
import styles from '../ZFWorkstationShell.module.css';

interface ConstructionFeasibilityViewProps {
  properties: Property[];
  propertyCosts?: ERPPropertyCostItem[];
  initialPropertyId?: string;
  onOpenAuditForProperty?: (property: Property) => void;
  onOpenContractForProperty?: (property: Property, unit?: BuildingUnitItem) => void;
  onUpdateSellingPrice?: (propertyId: string, newPriceEgp: number) => Promise<void>;
  isAr?: boolean;
}

export const ConstructionFeasibilityView: React.FC<ConstructionFeasibilityViewProps> = ({
  properties,
  propertyCosts,
  initialPropertyId,
  onOpenAuditForProperty,
  onOpenContractForProperty,
  onUpdateSellingPrice,
  isAr = true
}) => {
  return (
    <div className={styles.stageContainer}>
      <div>
        <ZFErpBreadcrumb 
          sectionTitle={isAr ? 'حاسبة تكلفة المباني والجدوى' : 'Construction Cost & Feasibility'} 
          icon={<Calculator size={13} color="#946f23" />} 
        />
      </div>
      <ConstructionCostCalculator 
        properties={properties}
        propertyCosts={propertyCosts}
        initialPropertyId={initialPropertyId}
        onOpenAuditForProperty={onOpenAuditForProperty}
        onOpenContractForProperty={onOpenContractForProperty}
        onUpdateSellingPrice={onUpdateSellingPrice}
        isAr={isAr}
      />
    </div>
  );
};
