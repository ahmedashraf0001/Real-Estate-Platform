'use client';

import React, { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPWorkstation } from '../context/ERPWorkstationContext';
import { GeneralLedgerView } from '../v2/views/GeneralLedgerView';

export function GeneralLedgerRouteView() {
  const erp = useERPWorkstation();
  const { setHasSideWidgets, setShowProjectExpenseModal } = erp;
  const searchParams = useSearchParams();

  const sub = searchParams?.get('sub');
  const initialTab = sub || 'coa';

  const handledKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const action = searchParams?.get('action');
    if (!action) {
      handledKeyRef.current = null;
      return;
    }
    if (handledKeyRef.current === action) return;

    if (action === 'tx') {
      handledKeyRef.current = action;
      setShowProjectExpenseModal(true);
    }
  }, [searchParams, setShowProjectExpenseModal]);

  useEffect(() => {
    setHasSideWidgets(true);
    return () => {
      setHasSideWidgets(false);
    };
  }, [setHasSideWidgets]);

  return (
    <GeneralLedgerView 
      journalEntries={erp.data.journalEntries}
      activePeriod={erp.activePeriod}
      isAr={erp.isAr}
      isMutating={erp.isMutating}
      initialTab={initialTab}
      contracts={erp.data.contracts}
      properties={erp.data.properties}
      dataset={erp.data}
      periods={erp.data.periods}
      onExportExcel={erp.handleExportExcel}
      onOpenProjectExpense={() => erp.setShowProjectExpenseModal(true)}
      onTogglePeriodStatus={(periodId, newStatus) => erp.handleTogglePeriodStatus(periodId, newStatus)}
    />
  );
}

export default GeneralLedgerRouteView;
