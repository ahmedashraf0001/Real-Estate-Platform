'use client';

import React, { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useERPWorkstation } from '../context/ERPWorkstationContext';
import { CockpitView } from '../v2/views/CockpitView';

export function CockpitRouteView() {
  const erp = useERPWorkstation();
  const searchParams = useSearchParams();

  const handledKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const action = searchParams?.get('action');
    const inspect = searchParams?.get('inspect');
    const key = `${action || ''}_${inspect || ''}`;

    if (!action && !inspect) {
      handledKeyRef.current = null;
      return;
    }
    if (handledKeyRef.current === key) return;
    handledKeyRef.current = key;

    if (inspect) {
      const contract = erp.data.contracts.find(c => c.contract_id === inspect || c.contract_number === inspect);
      if (contract) {
        erp.handleInspectContract(contract);
      } else {
        const cheque = erp.data.pdcRecords.find(p => p.cheque_id === inspect || p.cheque_number === inspect);
        if (cheque) {
          erp.handleInspectCheque(cheque);
        }
      }
    }

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
    }
  }, [searchParams, erp]);

  return (
    <CockpitView 
      isAr={erp.isAr}
      kpis={erp.kpis}
      totalGrossContractValue={erp.totalGrossContractValue}
      totalCollectedCash={erp.totalCollectedCash}
      totalWipIncurred={erp.totalWipIncurred}
      totalSafePDCs={erp.totalSafePDCs}
      totalInjectedCapital={erp.totalInjectedCapital}
      wipAccounts={erp.wipAccounts}
      contracts={erp.data.contracts}
      pdcRecords={erp.data.pdcRecords}
      schedules={erp.data.schedules}
      journalEntries={erp.data.journalEntries}
      propertyCosts={erp.data.propertyCosts}
      costAllocations={erp.data.costAllocations}
      properties={erp.data.properties}
      taxRecords={erp.data.taxRecords}
      partnerCalls={erp.data.partnerCalls}
      onOpenProjectExpense={() => erp.setShowProjectExpenseModal(true)}
      onInspectContract={erp.handleInspectContract}
      onInspectCheque={erp.handleInspectCheque}
      onCollectItem={erp.setCollectingPDCItem}
      onOpenNewCheque={() => {
        erp.setSupplementInitialContractId(null);
        erp.setShowNewPDCModal(true);
      }}
      onOpenNewContract={erp.handleOpenGenericNewContract}
      onNavigateTab={(tab) => erp.navigateToTab(tab)}
    />
  );
}

export default CockpitRouteView;
