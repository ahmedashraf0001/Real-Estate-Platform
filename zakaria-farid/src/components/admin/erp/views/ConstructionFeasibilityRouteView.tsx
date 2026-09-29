'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPWorkstation } from '../context/ERPWorkstationContext';
import { ConstructionFeasibilityView } from '../v2/views/ConstructionFeasibilityView';

export function ConstructionFeasibilityRouteView() {
  const erp = useERPWorkstation();
  const searchParams = useSearchParams();
  const propertyId = searchParams?.get('propertyId') || erp.calculatorPropertyId;

  return (
    <ConstructionFeasibilityView 
      properties={erp.data.properties}
      propertyCosts={erp.data.propertyCosts}
      initialPropertyId={propertyId}
      onOpenAuditForProperty={erp.handleOpenAuditForProperty}
      onOpenContractForProperty={erp.handleOpenContractForProperty}
      onUpdateSellingPrice={erp.handleUpdatePropertySellingPrice}
      isAr={erp.isAr}
    />
  );
}

export default ConstructionFeasibilityRouteView;
