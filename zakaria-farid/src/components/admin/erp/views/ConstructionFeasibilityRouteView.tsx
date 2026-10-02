'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPWorkstation } from '../context/ERPWorkstationContext';
import { ConstructionFeasibilityView } from '../v2/views/ConstructionFeasibilityView';

export function ConstructionFeasibilityRouteView() {
  const erp = useERPWorkstation();
  const searchParams = useSearchParams();
  const propertyId = searchParams?.get('propertyId') || erp.calculatorPropertyId;

  useEffect(() => {
    erp.setHasSideWidgets(true);
    return () => {
      erp.setHasSideWidgets(false);
    };
  }, [erp]);

  return (
    <ConstructionFeasibilityView 
      properties={erp.data.properties}
      propertyCosts={erp.data.propertyCosts}
      initialPropertyId={propertyId}
      onOpenAuditForProperty={erp.handleOpenAuditForProperty}
      onOpenContractForProperty={erp.handleOpenContractForProperty}
      onUpdateSellingPrice={erp.handleUpdatePropertySellingPrice}
      onNavigateToTab={(tab) => erp.navigateToTab(tab)}
      isAr={erp.isAr}
    />
  );
}

export default ConstructionFeasibilityRouteView;
