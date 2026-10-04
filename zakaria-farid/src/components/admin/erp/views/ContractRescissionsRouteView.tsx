'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPWorkstation } from '../context/ERPWorkstationContext';
import { ContractRescissionsView } from '../v2/views/ContractRescissionsView';

export function ContractRescissionsRouteView() {
  const erp = useERPWorkstation();
  const searchParams = useSearchParams();

  const handledKeyRef = React.useRef<string | null>(null);

  useEffect(() => {
    const rescissionId = searchParams?.get('rescissionId') || searchParams?.get('inspect');
    const action = searchParams?.get('action');
    const contractId = searchParams?.get('contractId');
    const key = `${rescissionId || ''}_${action || ''}_${contractId || ''}`;

    if (!rescissionId && !action && !contractId) {
      handledKeyRef.current = null;
      return;
    }
    if (handledKeyRef.current === key) return;

    if (rescissionId) {
      const found = erp.data.rescissions.find(r => r.rescission_id === rescissionId);
      if (found) {
        handledKeyRef.current = key;
        erp.handleInspectRescission(found);
      }
    }

    if (action === 'new') {
      handledKeyRef.current = key;
      const target = contractId 
        ? erp.data.contracts.find(c => c.contract_id === contractId)
        : erp.data.contracts.find(c => c.status !== 'Rescinded') || erp.data.contracts[0];
      if (target) {
        erp.setSelectedBranch(target.handover_status === 'Delivered' ? 'Branch2_PostDelivery' : 'Branch1_PreDelivery');
        erp.setRescissionStep(0);
        erp.setShowRescissionModal(target);
      }
    }
  }, [searchParams, erp]);

  return (
    <ContractRescissionsView 
      rescissions={erp.data.rescissions}
      contracts={erp.data.contracts}
      properties={erp.data.properties}
      journalEntries={erp.data.journalEntries}
      isAr={erp.isAr}
      onInspectRescission={erp.handleInspectRescission}
      onPayRefund={erp.handlePayRefund}
      isMutating={erp.isMutating}
      onOpenRescissionModal={(c) => {
        erp.setSelectedBranch(c.handover_status === 'Delivered' ? 'Branch2_PostDelivery' : 'Branch1_PreDelivery');
        erp.setRescissionStep(0);
        erp.setShowRescissionModal(c);
      }}
      onNavigateToContracts={() => erp.navigateToTab('contracts')}
    />
  );
}

export default ContractRescissionsRouteView;
