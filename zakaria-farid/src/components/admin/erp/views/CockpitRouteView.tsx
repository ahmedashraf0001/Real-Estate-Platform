'use client';

import React, { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPWorkstation } from '../context/ERPWorkstationContext';
import { CockpitView } from '../v2/views/CockpitView';

export function CockpitRouteView() {
  const erp = useERPWorkstation();
  const searchParams = useSearchParams();

  const handledKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const action = searchParams?.get('action');
    const inspect = searchParams?.get('inspect');
    const key = `${action || ''}_${inspect || ''}`;

    if (!action && !inspect) {
      handledKeyRef.current = null;
      return;
    }
    if (handledKeyRef.current === key) return;
    handledKeyRef.current = key;

    if (inspect) {
      const contract = erp.data.contracts.find(c => c.contract_id === inspect || c.contract_number === inspect);
      if (contract) {
        erp.handleInspectContract(contract);
      }
    }

    if (action === 'tx') {
      erp.setShowProjectExpenseModal(true);
    } else if (action === 'receipt') {
      erp.openCollect({});
    } else if (action === 'new_contract') {
      erp.handleOpenGenericNewContract();
    }
  }, [searchParams, erp]);

  return (
    <CockpitView 
      isAr={erp.isAr}
      kpis={erp.kpis}
      totalGrossContractValue={erp.totalGrossContractValue}
      totalCollectedCash={erp.totalCollectedCash}
      totalWipIncurred={erp.totalWipIncurred}
      totalSafePDCs={erp.totalSafePDCs}
      totalInjectedCapital={erp.totalInjectedCapital}
      contracts={erp.data.contracts}
      pdcRecords={erp.data.pdcRecords}
      schedules={erp.data.schedules}
      journalEntries={erp.data.journalEntries}
      propertyCosts={erp.data.propertyCosts}
      costAllocations={erp.data.costAllocations}
      properties={erp.data.properties}
      taxRecords={erp.data.taxRecords}
      partnerCalls={erp.data.partnerCalls}
      onOpenProjectExpense={() => erp.setShowProjectExpenseModal(true)}
      onInspectContract={erp.handleInspectContract}
      onCollectItem={erp.setCollectingPDCItem}
      onOpenCollect={() => erp.openCollect({})}
      onOpenNewContract={erp.handleOpenGenericNewContract}
      onNavigateTab={(tab) => erp.navigateToTab(tab)}
    />
  );
}

export default CockpitRouteView;
