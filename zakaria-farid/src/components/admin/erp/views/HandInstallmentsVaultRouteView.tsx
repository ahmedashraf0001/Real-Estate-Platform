'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPWorkstation } from '../context/ERPWorkstationContext';
import { HandInstallmentsVaultView } from '../v2/views/HandInstallmentsVaultView';

export function HandInstallmentsVaultRouteView() {
  const erp = useERPWorkstation();
  const searchParams = useSearchParams();

  const handledKeyRef = React.useRef<string | null>(null);

  useEffect(() => {
    erp.setHasSideWidgets(true);
    return () => {
      erp.setHasSideWidgets(false);
    };
  }, [erp]);

  useEffect(() => {
    const chequeId = searchParams?.get('chequeId') || searchParams?.get('inspect');
    const action = searchParams?.get('action');
    const key = `${chequeId || ''}_${action || ''}`;

    if (!chequeId && !action) {
      handledKeyRef.current = null;
      return;
    }
    if (handledKeyRef.current === key) return;

    if (chequeId) {
      const found = erp.data.pdcRecords.find(p => p.cheque_id === chequeId || p.cheque_number === chequeId);
      if (found) {
        handledKeyRef.current = key;
        erp.handleInspectCheque(found);
      }
    }
  }, [searchParams, erp]);

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
      onInspectCheque={erp.handleInspectCheque}
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
