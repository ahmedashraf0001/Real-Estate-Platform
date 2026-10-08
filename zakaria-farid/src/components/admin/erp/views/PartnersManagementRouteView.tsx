'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPWorkstation } from '../context/ERPWorkstationContext';
import { PartnersManagementView } from '../v2/views/PartnersManagementView';

export function PartnersManagementRouteView() {
  const erp = useERPWorkstation();
  const searchParams = useSearchParams();

  const handledKeyRef = React.useRef<string | null>(null);

  useEffect(() => {
    const action = searchParams?.get('action');
    const partnerName = searchParams?.get('partner') || searchParams?.get('inspect');
    const key = `${action || ''}_${partnerName || ''}`;

    if (!action && !partnerName) {
      handledKeyRef.current = null;
      return;
    }
    if (handledKeyRef.current === key) return;
    handledKeyRef.current = key;

    if (partnerName) {
      const found = erp.partnerSummaries.find(
        p => p.partnerName.toLowerCase() === partnerName.toLowerCase()
      );
      if (found) {
        erp.setDossierTargetPartner(found);
      }
    }

    if (action === 'new') {
      erp.setShowNewPartnerModal(true);
    } else if (action === 'payout') {
      if (partnerName) erp.setPayoutInitialPartner(partnerName);
      erp.setPayoutInitialPropertyId(searchParams?.get('property') || undefined);
      erp.setShowPartnerPayoutModal(true);
    } else if (action === 'inject') {
      if (partnerName) erp.setInjectionInitialPartner(partnerName);
      erp.setShowPartnerInjectionModal(true);
    }
  }, [searchParams, erp]);

  return (
    <PartnersManagementView 
      partnerProfiles={erp.partnerProfiles}
      partnerTransactions={erp.partnerTransactions}
      properties={erp.data.properties}
      contracts={erp.data.contracts}
      partnerCalls={erp.data.partnerCalls}
      partnerCommitments={erp.data.partnerCommitments || []}
      isAr={erp.isAr}
      isMutating={erp.isMutating}
      onOpenNewPartnerModal={() => erp.setShowNewPartnerModal(true)}
      onOpenPayout={(name, propertyId) => {
        erp.setPayoutInitialPartner(name);
        erp.setPayoutInitialPropertyId(propertyId);
        erp.setShowPartnerPayoutModal(true);
      }}
      onOpenInjection={(name, propId, commitmentId) => {
        erp.setInjectionInitialPartner(name);
        erp.setInjectionInitialPropertyId(propId);
        erp.setInjectionInitialCommitmentId(commitmentId);
        erp.setShowPartnerInjectionModal(true);
      }}
      onOpenDossier={(partner) => {
        erp.setDossierTargetPartner(partner);
      }}
      onConfirmCommitment={erp.handleCreatePartnerCommitment}
      onSaveProperty={erp.handleSaveProperty}
    />
  );
}

export default PartnersManagementRouteView;
