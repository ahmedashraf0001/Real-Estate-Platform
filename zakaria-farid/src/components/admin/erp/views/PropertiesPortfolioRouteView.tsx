'use client';

import React, { useEffect, useRef } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useERPWorkstation } from '../context/ERPWorkstationContext';
import { PropertiesPortfolioView } from '../v2/views/PropertiesPortfolioView';

export function PropertiesPortfolioRouteView() {
  const erp = useERPWorkstation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || (erp.isAr ? 'ar' : 'en');
  const sub = searchParams?.get('sub');

  const handledKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (sub === 'rsv') {
      router.replace(`/fin-os/${locale}/cost-allocation`);
      return;
    }

    const inspectParam = searchParams?.get('inspect');
    const propertyId = searchParams?.get('propertyId') || inspectParam;
    const action = searchParams?.get('action');
    const key = `${propertyId || ''}_${action || ''}_${inspectParam || ''}`;

    if (!propertyId && !action && !inspectParam) {
      handledKeyRef.current = null;
      return;
    }
    if (handledKeyRef.current === key) return;
    handledKeyRef.current = key;

    const foundProp = propertyId ? erp.data.properties.find(p => p.id === propertyId || p.slug === propertyId) : null;

    if (action === 'new') {
      if (foundProp) {
        erp.handleOpenContractForProperty(foundProp);
      } else {
        erp.handleOpenGenericNewContract();
      }
    } else if (action === 'calc' && foundProp) {
      erp.handleOpenCalculatorForProperty(foundProp);
    } else if (foundProp && (action === 'audit' || inspectParam)) {
      erp.setAuditModalProperty(foundProp);
    }
  }, [searchParams, sub, locale, router, erp]);

  useEffect(() => {
    erp.setHasSideWidgets(true);
    return () => {
      erp.setHasSideWidgets(false);
    };
  }, [erp]);

  const rawPropId = searchParams?.get('propertyId');
  const rawAction = searchParams?.get('action');
  const rawInspect = searchParams?.get('inspect');
  const currentProp = rawPropId ? erp.data.properties.find(p => p.id === rawPropId || p.slug === rawPropId) : null;
  const searchQuery = searchParams?.get('search') || (currentProp && !rawAction && !rawInspect ? (erp.isAr ? currentProp.title_ar : (currentProp.title_en || currentProp.title_ar)) : undefined);

  return (
    <PropertiesPortfolioView 
      properties={erp.data.properties}
      contracts={erp.data.contracts}
      propertyCosts={erp.data.propertyCosts}
      costAllocations={erp.data.costAllocations}
      journalEntries={erp.data.journalEntries}
      initialMasterTab={(sub === 'matrix' || sub === 'analytics' || sub === 'showcase') ? sub : undefined}
      initialSearchQuery={searchQuery}
      onOpenNewAllocation={() => erp.setShowRSVModal(true)}
      onInspectRSV={erp.handleInspectRSV}
      onOpenNewContract={erp.handleOpenGenericNewContract}
      onOpenContractForProperty={erp.handleOpenContractForProperty}
      onOpenCalculatorForProperty={erp.handleOpenCalculatorForProperty}
      onOpenAuditForProperty={erp.handleOpenAuditForProperty}
      onUpdatePropertyUnitTax={erp.handleUpdatePropertyUnitTax}
      isAr={erp.isAr}
      isMutating={erp.isMutating}
    />
  );
}

export default PropertiesPortfolioRouteView;
