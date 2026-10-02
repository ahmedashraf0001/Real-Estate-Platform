'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPWorkstation } from '../context/ERPWorkstationContext';
import { ContractsRegistryView } from '../v2/views/ContractsRegistryView';
import { ERPContract } from '@/lib/erp/types';

export function ContractsRegistryRouteView() {
  const erp = useERPWorkstation();
  const searchParams = useSearchParams();

  const sub = searchParams?.get('sub');
  const initialMasterTab: 'contracts' | 'handover' | 'rescissions' = 
    sub === 'handover' ? 'handover' : (sub === 'rescissions' ? 'rescissions' : 'contracts');

  const [inspectedContract, setInspectedContract] = useState<ERPContract | null>(null);
  const handledKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const contractId = searchParams?.get('contractId') || searchParams?.get('inspect');
    const action = searchParams?.get('action');
    const propertyId = searchParams?.get('propertyId');
    const unitId = searchParams?.get('unitId');
    const key = `${contractId || ''}_${action || ''}_${propertyId || ''}_${unitId || ''}`;

    if (!contractId && !action) {
      handledKeyRef.current = null;
      return;
    }
    if (handledKeyRef.current === key) return;

    if (contractId) {
      const found = erp.data.contracts.find(c => c.contract_id === contractId || c.contract_number === contractId);
      if (found) {
        handledKeyRef.current = key;
        setInspectedContract(found);
      }
    }

    if (action === 'handover') {
      const target = erp.data.contracts.find(c => c.handover_status !== 'Delivered' && c.status !== 'Rescinded');
      if (target) {
        handledKeyRef.current = key;
        erp.setShowHandoverModal(target);
      }
    }

    if (action === 'new') {
      handledKeyRef.current = key;
      if (propertyId) {
        const prop = erp.data.properties.find(p => p.id === propertyId);
        if (prop) {
          const unit = unitId ? (prop.building_units || []).find(u => u.unit_id === unitId) : undefined;
          erp.handleOpenContractForProperty(prop, unit);
          return;
        }
      }
      erp.handleOpenGenericNewContract();
    }
  }, [searchParams, erp.data.contracts, erp.data.properties, erp]);

  const handleCloseInspection = useCallback(() => {
    setInspectedContract(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      let changed = false;
      ['inspect', 'contractId'].forEach(param => {
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param);
          changed = true;
        }
      });
      if (changed) {
        window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
      }
    }
  }, []);

  return (
    <ContractsRegistryView 
      key={initialMasterTab}
      contracts={erp.data.contracts}
      schedules={erp.data.schedules}
      rescissions={erp.data.rescissions}
      properties={erp.data.properties}
      isAr={erp.isAr}
      initialMasterTab={initialMasterTab}
      inspectedContract={inspectedContract}
      onCloseInspection={handleCloseInspection}
      onInspectContract={(c) => setInspectedContract(c)}
      onInspectRescission={erp.handleInspectRescission}
      onOpenNewContract={erp.handleOpenGenericNewContract}
      onOpenHandoverModal={(c) => erp.setShowHandoverModal(c)}
      onOpenCollectionModal={(contract, schedule) => {
        if (schedule) {
          erp.setShowPayModal({ contract, schedule });
        } else {
          setInspectedContract(contract);
        }
      }}
    />
  );
}

export default ContractsRegistryRouteView;
