'use client';

import React, { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPWorkstation } from '../context/ERPWorkstationContext';
import { CostAllocationView } from '../v2/views/CostAllocationView';

export function CostAllocationRouteView() {
  const erp = useERPWorkstation();
  const searchParams = useSearchParams();
  const handledKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const action = searchParams?.get('action');
    const key = `${action || ''}`;

    if (!action) {
      handledKeyRef.current = null;
      return;
    }
    if (handledKeyRef.current === key) return;

    if (action === 'new') {
      handledKeyRef.current = key;
      erp.setShowRSVModal(true);
    }
  }, [searchParams, erp]);

  const inspectId = searchParams?.get('inspect') || searchParams?.get('allocationId') || undefined;

  return (
    <CostAllocationView 
      costAllocations={erp.data.costAllocations}
      contracts={erp.data.contracts}
      properties={erp.data.properties}
      isAr={erp.isAr}
      initialInspectingAllocationId={inspectId}
      onOpenNewAllocation={() => erp.setShowRSVModal(true)}
    />
  );
}

export default CostAllocationRouteView;
