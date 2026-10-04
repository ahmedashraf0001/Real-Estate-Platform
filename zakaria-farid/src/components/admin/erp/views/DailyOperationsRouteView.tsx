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
      const target = erp.data.pdcRecords.find(p => p.status !== 'Cleared' && p.status !== 'Void') || erp.data.pdcRecords[0];
      if (target) {
        erp.setCollectingPDCItem(target);
      } else if (erp.data.contracts.length > 0) {
        const ct = erp.data.contracts.find(c => c.status === 'Active') || erp.data.contracts[0];
        const sc = erp.data.schedules.find(s => s.contract_id === ct.contract_id && s.status === 'Pending') || erp.data.schedules.find(s => s.contract_id === ct.contract_id);
        if (sc) {
          erp.setCollectingPDCItem({
            cheque_id: sc.schedule_id || `SND-${ct.contract_id}-${sc.tranche_number}`,
            contract_id: ct.contract_id,
            schedule_id: sc.schedule_id,
            drawer_name: ct.buyer_name,
            cheque_number: `REC-${ct.contract_number || ct.contract_id.slice(-4)}-T${sc.tranche_number}`,
            bank_name: erp.isAr ? 'الخزينة النقدية الرئيسية' : 'Main Cash Safe',
            due_date: sc.due_date,
            nominal_value: sc.nominal_value,
            status: 'In Safe'
          });
        }
      }
    } else if (action === 'new_contract') {
      erp.handleOpenGenericNewContract();
    } else if (action === 'new_cheque') {
      erp.setSupplementInitialContractId(null);
      erp.setShowNewPDCModal(true);
    } else if (action === 'escalate') {
      const target = erp.data.contracts.find(c => c.status !== 'Rescinded') || erp.data.contracts[0];
      if (target) erp.setShowEscalationModal(target);
    } else if (action === 'partner_injection') {
      erp.setShowPartnerInjectionModal(true);
    } else if (action === 'partner_ops') {
      erp.setShowPartnerOperationsModal(true);
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
      onOpenNewCheque={() => {
        erp.setSupplementInitialContractId(null);
        erp.setShowNewPDCModal(true);
      }}
      onCollectItem={erp.setCollectingPDCItem}
      onOpenCashReceipt={() => {
        const target = erp.data.pdcRecords.find(p => p.status !== 'Cleared' && p.status !== 'Void') || erp.data.pdcRecords[0];
        if (target) {
          erp.setCollectingPDCItem(target);
        } else if (erp.data.contracts.length > 0) {
          const ct = erp.data.contracts.find(c => c.status === 'Active') || erp.data.contracts[0];
          const sc = erp.data.schedules.find(s => s.contract_id === ct.contract_id && s.status === 'Pending') || erp.data.schedules.find(s => s.contract_id === ct.contract_id);
          if (sc) {
            erp.setCollectingPDCItem({
              cheque_id: sc.schedule_id || `SND-${ct.contract_id}-${sc.tranche_number}`,
              contract_id: ct.contract_id,
              schedule_id: sc.schedule_id,
              drawer_name: ct.buyer_name,
              cheque_number: `REC-${ct.contract_number || ct.contract_id.slice(-4)}-T${sc.tranche_number}`,
              bank_name: erp.isAr ? 'الخزينة النقدية الرئيسية' : 'Main Cash Safe',
              due_date: sc.due_date,
              nominal_value: sc.nominal_value,
              status: 'In Safe'
            });
          }
        }
      }}
      onInspectContract={erp.handleInspectContract}
      onInspectCheque={erp.handleInspectCheque}
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
      onOpenPartnerOperations={() => erp.setShowPartnerOperationsModal(true)}
      onOpenPartnerPayout={() => erp.setShowPartnerPayoutModal(true)}
      onOpenPartnerInjection={() => erp.setShowPartnerInjectionModal(true)}
      onExportExcel={erp.handleExportExcel}
      onNavigateToTab={(tab) => erp.navigateToTab(tab)}
    />
  );
}

export default DailyOperationsRouteView;
