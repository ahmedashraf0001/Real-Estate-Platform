'use client';

import React, { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPWorkstation } from '../context/ERPWorkstationContext';
import { ConstructionPayablesView } from '../v2/views/ConstructionPayablesView';

export function ConstructionPayablesRouteView() {
  const erp = useERPWorkstation();
  const searchParams = useSearchParams();
  const handledKeyRef = useRef<string | null>(null);

  useEffect(() => {
    erp.setHasSideWidgets(true);
    return () => {
      erp.setHasSideWidgets(false);
    };
  }, [erp]);

  useEffect(() => {
    const inspect = searchParams?.get('inspect') || searchParams?.get('contractId');
    if (!inspect) {
      handledKeyRef.current = null;
      return;
    }
    if (handledKeyRef.current === inspect) return;

    const found = erp.data.contracts.find(c => c.contract_id === inspect || c.contract_number === inspect);
    if (found) {
      handledKeyRef.current = inspect;
      erp.handleInspectContract(found);
    }
  }, [searchParams, erp]);

  return (
    <ConstructionPayablesView 
      properties={erp.data.properties}
      propertyCosts={erp.data.propertyCosts}
      contracts={erp.data.contracts}
      activePeriod={erp.activePeriod}
      periods={erp.data.periods}
      isAr={erp.isAr}
      isMutating={erp.isMutating}
      onSaveExpenseEntry={erp.handleSaveProjectExpense}
      onUpdatePropertyCostItem={erp.handleUpdatePropertyCostItem}
      onAddCostAdjustment={(updatedItem) => erp.handleAddCostAdjustment(updatedItem)}
      onRecordPayablePayment={(updatedItem) => erp.handleRecordCostPayablePayment(updatedItem)}
      onInspectContract={erp.handleInspectContract}
      onNavigateToTab={(tab) => erp.navigateToTab(tab)}
    />
  );
}

export default ConstructionPayablesRouteView;
