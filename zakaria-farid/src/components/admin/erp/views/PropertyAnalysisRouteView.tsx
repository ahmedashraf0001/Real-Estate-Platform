'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPWorkstation } from '../context/ERPWorkstationContext';
import { PropertyAnalysisView } from '../v2/views/PropertyAnalysisView';

export function PropertyAnalysisRouteView() {
  const erp = useERPWorkstation();
  const searchParams = useSearchParams();
  const propertyId = searchParams?.get('propertyId') || undefined;
  const viewParam = searchParams?.get('view') as 'portfolio' | 'property' | null;
  const initialViewMode = viewParam === 'property' || viewParam === 'portfolio' 
    ? viewParam 
    : (propertyId ? 'property' : 'portfolio');
  const { setHasSideWidgets } = erp;

  // Mount Side Widgets container in workstation layout
  useEffect(() => {
    setHasSideWidgets(true);
    return () => {
      setHasSideWidgets(false);
    };
  }, [setHasSideWidgets]);

  return (
    <PropertyAnalysisView
      properties={erp.data.properties}
      propertyCosts={erp.data.propertyCosts}
      contracts={erp.data.contracts}
      costAllocations={erp.data.costAllocations}
      journalEntries={erp.data.journalEntries}
      schedules={erp.data.schedules}
      initialPropertyId={propertyId}
      initialViewMode={initialViewMode}
      isAr={erp.isAr}
      isMutating={erp.isMutating}
      activePreset={erp.activePreset}
      onUpdateSellingPrice={erp.handleUpdatePropertySellingPrice}
      onOpenAuditForProperty={erp.handleOpenAuditForProperty}
      onOpenContractForProperty={erp.handleOpenContractForProperty}
      onOpenQuickExpense={(propId) => {
        if (propId) {
          erp.setProjectExpensePropertyId(propId);
        }
        erp.setShowProjectExpenseModal(true);
      }}
      onNavigateTab={(tab, query) => {
        if (query && Object.keys(query).length > 0) {
          const qs = new URLSearchParams(query).toString();
          erp.navigateToTab(`${tab}?${qs}`);
        } else {
          erp.navigateToTab(tab);
        }
      }}
    />
  );
}

export default PropertyAnalysisRouteView;
