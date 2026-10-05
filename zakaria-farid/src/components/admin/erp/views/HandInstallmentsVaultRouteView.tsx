'use client';

import React, { useEffect } from 'react';
import { useERPWorkstation } from '../context/ERPWorkstationContext';
import { HandInstallmentsVaultView } from '../v2/views/HandInstallmentsVaultView';

export function HandInstallmentsVaultRouteView() {
  const erp = useERPWorkstation();

  useEffect(() => {
    erp.setHasSideWidgets(true);
    return () => {
      erp.setHasSideWidgets(false);
    };
  }, [erp]);

  return (
    <HandInstallmentsVaultView 
      pdcRecords={erp.data.pdcRecords}
      contracts={erp.data.contracts}
      schedules={erp.data.schedules}
      properties={erp.data.properties}
      propertyCosts={erp.data.propertyCosts}
      isAr={erp.isAr}
      isMutating={erp.isMutating}
      onCollectItem={(pdc) => erp.setCollectingPDCItem(pdc)}
      onCollectDueToday={erp.handleCollectDuePDCsToday}
      onBounceItem={erp.handleConfirmBounceCheque}
      onOpenNewSupplement={(contractId) => {
        erp.setSupplementInitialContractId(contractId || null);
        erp.setShowNewPDCModal(true);
      }}
      onPDCStatusChange={erp.handlePDCStatusChange}
      onRecordPayablePayment={erp.handleRecordCostPayablePayment}
    />
  );
}

export default HandInstallmentsVaultRouteView;
