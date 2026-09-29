'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPWorkstation } from '../context/ERPWorkstationContext';
import { ApartmentTaxesView } from '../v2/views/ApartmentTaxesView';

export function ApartmentTaxesRouteView() {
  const erp = useERPWorkstation();
  const searchParams = useSearchParams();

  const handledKeyRef = React.useRef<string | null>(null);

  useEffect(() => {
    const taxId = searchParams?.get('taxId') || searchParams?.get('inspect');
    if (!taxId) {
      handledKeyRef.current = null;
      return;
    }
    if (handledKeyRef.current === taxId) return;

    const found = erp.data.taxRecords.find(t => t.tax_id === taxId);
    if (found) {
      handledKeyRef.current = taxId;
      erp.handleInspectTax(found);
    }
  }, [searchParams, erp]);

  return (
    <ApartmentTaxesView 
      taxRecords={erp.data.taxRecords}
      contracts={erp.data.contracts}
      properties={erp.data.properties}
      propertyCosts={erp.data.propertyCosts}
      onOpenCostModal={(propId) => {
        erp.setSelectedAuditPropertyId(propId || erp.data.properties[0]?.id || '');
        erp.setShowCostModal(true);
      }}
      isAr={erp.isAr}
      isMutating={erp.isMutating}
      onRemitTax={erp.handleRemitTax}
      onInspectTax={erp.handleInspectTax}
    />
  );
}

export default ApartmentTaxesRouteView;
