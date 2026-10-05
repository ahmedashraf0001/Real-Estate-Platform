'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPWorkstation } from '../context/ERPWorkstationContext';
import { DailyOperationsView } from '../v2/views/DailyOperationsView';

export function DailyOperationsRouteView() {
  const erp = useERPWorkstation();
  const searchParams = useSearchParams();

  const handledActionRef = React.useRef<string | null>(null);

  useEffect(() => {
    const action = searchParams?.get('action');
    if (!action) {
      handledActionRef.current = null;
      return;
    }
    if (handledActionRef.current === action) return;
    handledActionRef.current = action;

    if (action === 'tx') {
      erp.setShowProjectExpenseModal(true);
    } else if (action === 'receipt') {
      erp.openCollect({});
    } else if (action === 'new_contract') {
      erp.handleOpenGenericNewContract();
    }
  }, [searchParams, erp]);

  return (
    <DailyOperationsView 
      isAr={erp.isAr}
      kpis={erp.kpis}
      totalGrossContractValue={erp.totalGrossContractValue}
      totalCollectedCash={erp.totalCollectedCash}
      totalWipIncurred={erp.totalWipIncurred}
      totalSafePDCs={erp.totalSafePDCs}
      properties={erp.data.properties}
      contracts={erp.data.contracts}
      pdcRecords={erp.data.pdcRecords}
      schedules={erp.data.schedules}
      journalEntries={erp.data.journalEntries}
      activePeriod={erp.activePeriod}
      periods={erp.data.periods}
      propertyCosts={erp.data.propertyCosts}
      isMutating={erp.isMutating}
      partnerSummaries={erp.partnerSummaries}
      onOpenProjectExpense={() => erp.setShowProjectExpenseModal(true)}
      onOpenNewContract={erp.handleOpenGenericNewContract}
      onCollectItem={erp.setCollectingPDCItem}
      onOpenCashReceipt={() => erp.openCollect({})}
      onOpenCashTransfer={() => erp.setShowCashTransferModal(true)}
      onInspectContract={erp.handleInspectContract}
      onInspectTransaction={(payload) => erp.setInspectorPayload(payload)}
      onOpenContractForProperty={erp.handleOpenContractForProperty}
      onOpenAuditForProperty={erp.handleOpenAuditForProperty}
      onOpenCalculatorForProperty={erp.handleOpenCalculatorForProperty}
      onOpenRSVModal={() => erp.setShowRSVModal(true)}
      onOpenRescissionModal={(c) => erp.setShowRescissionModal(c)}
      onOpenEscalationModal={(c) => erp.setShowEscalationModal(c)}
      onOpenQuickSearch={() => erp.setShowQuickSearch(true)}
      onUpdatePropertyCostItem={erp.handleUpdatePropertyCostItem}
      onAddCostAdjustment={erp.handleAddCostAdjustment}
      onRecordPayablePayment={erp.handleRecordCostPayablePayment}
      onSaveExpenseEntry={erp.handleSaveProjectExpense}
      onOpenPartnerPayout={() => erp.setShowPartnerPayoutModal(true)}
      onOpenPartnerInjection={() => erp.setShowPartnerInjectionModal(true)}
      onExportExcel={erp.handleExportExcel}
      onNavigateToTab={(tab) => erp.navigateToTab(tab)}
    />
  );
}

export default DailyOperationsRouteView;
