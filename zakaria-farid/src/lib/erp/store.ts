/**
 * Zakaria Farid Real Estate ERP — State Store & Initial Dataset
 * Pre-seeded with realistic Egyptian luxury developments (Palatial Villas, Nile Penthouses).
 */

import { 
  ERPAccountingPeriod, 
  ERPContract, 
  ERPContractAmendment, 
  ERPCostAllocation, 
  ERPInstallmentSchedule, 
  ERPJournalEntry, 
  ERPMakerCheckerRequest, 
  ERPPartnerCall, 
  ERPPartnerCommitment,
  ERPPDCRecord, 
  ERPRescissionRecord, 
  ERPTaxRecord 
} from './types';
import { GeneralLedgerEngine } from './ledger';
import { ContractsEngine } from './contracts';
import { RSVEngine } from './rsv';

export interface ERPStoreState {
  periods: ERPAccountingPeriod[];
  contracts: ERPContract[];
  schedules: ERPInstallmentSchedule[];
  journalEntries: ERPJournalEntry[];
  pdcRecords: ERPPDCRecord[];
  rescissions: ERPRescissionRecord[];
  amendments: ERPContractAmendment[];
  costAllocations: ERPCostAllocation[];
  taxRecords: ERPTaxRecord[];
  partnerCalls: ERPPartnerCall[];
  partnerCommitments?: ERPPartnerCommitment[];
  makerCheckerRequests: ERPMakerCheckerRequest[];
}

export function createInitialERPState(): ERPStoreState {
  // 1. Accounting Periods for 2026
  const periods: ERPAccountingPeriod[] = [
    { period_id: 'prd-2026-01', fiscal_year: 2026, period_number: 1, start_date: '2026-01-01', end_date: '2026-01-31', status: 'CLOSED', locked_at: '2026-02-05T12:00:00Z', locked_by: 'CFO_FARID' },
    { period_id: 'prd-2026-02', fiscal_year: 2026, period_number: 2, start_date: '2026-02-01', end_date: '2026-02-28', status: 'CLOSED', locked_at: '2026-03-05T12:00:00Z', locked_by: 'CFO_FARID' },
    { period_id: 'prd-2026-03', fiscal_year: 2026, period_number: 3, start_date: '2026-03-01', end_date: '2026-03-31', status: 'OPEN' },
    { period_id: 'prd-2026-04', fiscal_year: 2026, period_number: 4, start_date: '2026-04-01', end_date: '2026-04-30', status: 'OPEN' },
    { period_id: 'prd-2026-05', fiscal_year: 2026, period_number: 5, start_date: '2026-05-01', end_date: '2026-05-31', status: 'OPEN' },
    { period_id: 'prd-2026-06', fiscal_year: 2026, period_number: 6, start_date: '2026-06-01', end_date: '2026-06-30', status: 'OPEN' },
    { period_id: 'prd-2026-07', fiscal_year: 2026, period_number: 7, start_date: '2026-07-01', end_date: '2026-07-31', status: 'OPEN' },
    { period_id: 'prd-2026-08', fiscal_year: 2026, period_number: 8, start_date: '2026-08-01', end_date: '2026-08-31', status: 'OPEN' },
    { period_id: 'prd-2026-09', fiscal_year: 2026, period_number: 9, start_date: '2026-09-01', end_date: '2026-09-30', status: 'OPEN' },
    { period_id: 'prd-2026-10', fiscal_year: 2026, period_number: 10, start_date: '2026-10-01', end_date: '2026-10-31', status: 'OPEN' },
    { period_id: 'prd-2026-11', fiscal_year: 2026, period_number: 11, start_date: '2026-11-01', end_date: '2026-11-30', status: 'OPEN' },
    { period_id: 'prd-2026-12', fiscal_year: 2026, period_number: 12, start_date: '2026-12-01', end_date: '2026-12-31', status: 'OPEN' }
  ];

  const currentPeriod = periods[2]; // Period 3 (March 2026, OPEN)

  // 2. Initial Contracts
  const contract1: ERPContract = {
    contract_id: 'contract-villa-01',
    contract_number: 'CT-ZF-2026-001',
    property_id: 'al-yasmin-grand-residence',
    unit_id: 'BLD-YASMIN-BLOCK-A',
    buyer_name: 'المهندس كريم المنصوري',
    buyer_national_id: '28911040102938',
    gross_contract_value: '24000000.00', // 24M EGP
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2026-01-15',
    handover_date: '2027-06-30',
    handover_status: 'Pending',
    total_cash_collected: '3600000.00', // 15% Down payment paid
    status: 'Active'
  };

  const contract2: ERPContract = {
    contract_id: 'contract-penthouse-02',
    contract_number: 'CT-ZF-2026-002',
    property_id: 'al-yasmin-grand-residence',
    unit_id: 'yasmin-roof-302',
    buyer_name: 'د. منى الصاوي',
    buyer_national_id: '29205120108741',
    gross_contract_value: '35000000.00', // 35M EGP
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2026-02-01',
    handover_date: '2026-03-01',
    handover_status: 'Pending',
    total_cash_collected: '17500000.00', // 50% paid
    status: 'Active'
  };

  const contract3: ERPContract = {
    contract_id: 'contract-duplex-03',
    contract_number: 'CT-ZF-2026-003',
    property_id: 'andalus-residence-minya-elqamh',
    unit_id: 'DUPLEX-ANDALUS-101',
    buyer_name: 'يوسف بدر وشركاه',
    buyer_national_id: '28109030104492',
    gross_contract_value: '18000000.00', // 18M EGP
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2026-02-10',
    handover_status: 'Pending',
    total_cash_collected: '1800000.00', // 10% paid
    status: 'Active'
  };

  const contract4: ERPContract = {
    contract_id: 'contract-apt-04',
    contract_number: 'CT-ZF-2026-004',
    property_id: 'al-yasmin-grand-residence',
    unit_id: 'yasmin-apt-101',
    buyer_name: 'د. طارق عبد العزيز',
    buyer_national_id: '27804150103312',
    gross_contract_value: '6200000.00',
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2026-01-20',
    handover_status: 'Pending',
    total_cash_collected: '1860000.00', // 30% paid
    status: 'Active'
  };

  const contract5: ERPContract = {
    contract_id: 'contract-apt-05',
    contract_number: 'CT-ZF-2026-005',
    property_id: 'al-yasmin-grand-residence',
    unit_id: 'yasmin-apt-102',
    buyer_name: 'أحمد محمود السعيد',
    buyer_national_id: '28409110109923',
    gross_contract_value: '6200000.00',
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2025-11-10',
    handover_status: 'Pending',
    total_cash_collected: '930000.00', // 15% paid
    status: 'Active'
  };

  const contract6: ERPContract = {
    contract_id: 'contract-sky-06',
    contract_number: 'CT-ZF-2026-006',
    property_id: 'andalus-residence-minya-elqamh',
    unit_id: 'andalus-roof-402',
    buyer_name: 'المستشار شريف الحناوي',
    buyer_national_id: '27212080104561',
    gross_contract_value: '36000000.00',
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2025-06-15',
    handover_status: 'Pending',
    total_cash_collected: '28800000.00', // 80% paid (Ready for Handover)
    status: 'Active'
  };

  const contract7: ERPContract = {
    contract_id: 'contract-sokhna-07',
    contract_number: 'CT-ZF-2026-007',
    property_id: 'sokhna-sea-cliff-mansion',
    unit_id: 'SOKHNA-CLIFF-APT-01',
    buyer_name: 'م. حازم الصيرفي',
    buyer_national_id: '28603220101889',
    gross_contract_value: '28000000.00',
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2025-03-01',
    handover_status: 'Delivered',
    total_cash_collected: '28000000.00', // 100% paid (Completed)
    status: 'Active'
  };

  const contract8: ERPContract = {
    contract_id: 'contract-gouna-08',
    contract_number: 'CT-ZF-2026-008',
    property_id: 'gouna-water-sanctuary',
    unit_id: 'GOUNA-APT-12',
    buyer_name: 'خالد عبد الرحمن الشريف',
    buyer_national_id: '27907140102176',
    gross_contract_value: '31000000.00',
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2025-08-01',
    handover_status: 'Pending',
    total_cash_collected: '3100000.00', // Rescinded
    status: 'Rescinded'
  };

  const contract9: ERPContract = {
    contract_id: 'contract-comm-09',
    contract_number: 'CT-ZF-2026-009',
    property_id: 'andalus-residence-minya-elqamh',
    unit_id: 'GARAGE-ANDALUS-G01',
    buyer_name: 'شركة الأمل للتجارة والتوزيع',
    buyer_national_id: '29001010107734',
    gross_contract_value: '8500000.00',
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2026-02-15',
    handover_status: 'Pending',
    total_cash_collected: '2550000.00', // 30% paid
    status: 'Active'
  };

  const contract10: ERPContract = {
    contract_id: 'contract-apt-10',
    contract_number: 'CT-ZF-2026-010',
    property_id: 'andalus-residence-minya-elqamh',
    unit_id: 'andalus-apt-201',
    buyer_name: 'أستاذ سامح القاضي',
    buyer_national_id: '28308250106655',
    gross_contract_value: '2850000.00',
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2025-10-01',
    handover_status: 'Pending',
    total_cash_collected: '570000.00', // 20% paid
    status: 'Active'
  };

  const contract11: ERPContract = {
    contract_id: 'contract-north-11',
    contract_number: 'CT-ZF-2026-011',
    property_id: 'north-coast-seaside-sanctuary',
    unit_id: 'HACIENDA-APT-07',
    buyer_name: 'السيدة نادية المنشاوي',
    buyer_national_id: '28811190103421',
    gross_contract_value: '52000000.00',
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2026-02-05',
    handover_status: 'Pending',
    total_cash_collected: '10400000.00', // 20% paid
    status: 'Active'
  };

  const contract12: ERPContract = {
    contract_id: 'contract-madinaty-12',
    contract_number: 'CT-ZF-2026-012',
    property_id: 'madinaty-four-seasons-mansion',
    unit_id: 'MADINATY-DUPLEX-01',
    buyer_name: 'اللواء رفعت الشناوي',
    buyer_national_id: '26505050101234',
    gross_contract_value: '68000000.00',
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2025-04-10',
    handover_status: 'Pending',
    total_cash_collected: '51000000.00', // 75% paid (Ready for Handover)
    status: 'Active'
  };

  const deliveredContract2: ERPContract = { ...contract2, handover_status: 'Delivered' };
  const contracts: ERPContract[] = [
    contract1,
    deliveredContract2,
    contract3,
    contract4,
    contract5,
    contract6,
    contract7,
    contract8,
    contract9,
    contract10,
    contract11,
    contract12
  ];

  // 3. Generate Installment Schedules (with Invariant 4.3 remainder absorption)
  const schedules1 = ContractsEngine.generateSchedule(contract1.contract_id, contract1.gross_contract_value, '0.15', 8, '2026-07-01', 3);
  schedules1[0].status = 'Paid';
  schedules1[0].amount_paid = '3600000.00';
  schedules1[0].paid_date = '2026-07-01';

  const schedules2 = ContractsEngine.generateSchedule(contract2.contract_id, contract2.gross_contract_value, '0.20', 6, '2026-02-01', 3);
  schedules2[0].status = 'Paid';
  schedules2[0].amount_paid = '7000000.00';
  schedules2[0].paid_date = '2026-02-01';
  schedules2[1].status = 'Paid';
  schedules2[1].amount_paid = schedules2[1].nominal_value;
  schedules2[1].paid_date = '2026-02-20';
  schedules2[2].status = 'Paid';
  schedules2[2].amount_paid = schedules2[2].nominal_value;
  schedules2[2].paid_date = '2026-02-28';

  const schedules3 = ContractsEngine.generateSchedule(contract3.contract_id, contract3.gross_contract_value, '0.10', 6, '2026-08-01', 3);
  schedules3[0].status = 'Paid';
  schedules3[0].amount_paid = '1800000.00';
  schedules3[0].paid_date = '2026-08-01';

  const schedules4 = ContractsEngine.generateSchedule(contract4.contract_id, contract4.gross_contract_value, '0.30', 6, '2026-07-15', 3);
  schedules4[0].status = 'Paid';
  schedules4[0].amount_paid = '1860000.00';
  schedules4[0].paid_date = '2026-07-15';

  const schedules5 = ContractsEngine.generateSchedule(contract5.contract_id, contract5.gross_contract_value, '0.15', 6, '2025-11-10', 3);
  schedules5[0].status = 'Paid';
  schedules5[0].amount_paid = '930000.00';
  schedules5[0].paid_date = '2025-11-10';
  schedules5[1].status = 'Defaulted';
  schedules5[1].due_date = '2026-01-10';

  const schedules6 = ContractsEngine.generateSchedule(contract6.contract_id, contract6.gross_contract_value, '0.20', 5, '2026-01-15', 3);
  schedules6[0].status = 'Paid';
  schedules6[0].amount_paid = schedules6[0].nominal_value;
  schedules6[0].paid_date = '2026-01-15';
  schedules6[1].status = 'Paid';
  schedules6[1].amount_paid = schedules6[1].nominal_value;
  schedules6[1].paid_date = '2026-04-15';
  schedules6[2].status = 'Paid';
  schedules6[2].amount_paid = schedules6[2].nominal_value;
  schedules6[2].paid_date = '2026-07-15';
  schedules6[3].status = 'Paid';
  schedules6[3].amount_paid = schedules6[3].nominal_value;
  schedules6[3].paid_date = '2026-08-15';
  schedules6[4].due_date = '2026-11-15';

  const schedules7 = ContractsEngine.generateSchedule(contract7.contract_id, contract7.gross_contract_value, '0.25', 4, '2025-03-01', 3);
  schedules7.forEach((s, idx) => {
    s.status = 'Paid';
    s.amount_paid = s.nominal_value;
    s.paid_date = `2025-0${(idx + 1) * 3}-01`;
  });

  const schedules8 = ContractsEngine.generateSchedule(contract8.contract_id, contract8.gross_contract_value, '0.10', 4, '2025-08-01', 3);
  schedules8.forEach(s => {
    s.status = 'Void';
  });

  const schedules9 = ContractsEngine.generateSchedule(contract9.contract_id, contract9.gross_contract_value, '0.30', 5, '2026-08-15', 3);
  schedules9[0].status = 'Paid';
  schedules9[0].amount_paid = '2550000.00';
  schedules9[0].paid_date = '2026-08-15';

  const schedules10 = ContractsEngine.generateSchedule(contract10.contract_id, contract10.gross_contract_value, '0.20', 6, '2025-10-01', 3);
  schedules10[0].status = 'Paid';
  schedules10[0].amount_paid = '570000.00';
  schedules10[0].paid_date = '2025-10-01';
  schedules10[1].status = 'Defaulted';
  schedules10[1].due_date = '2026-01-10';

  const schedules11 = ContractsEngine.generateSchedule(contract11.contract_id, contract11.gross_contract_value, '0.20', 8, '2026-08-05', 3);
  schedules11[0].status = 'Paid';
  schedules11[0].amount_paid = '10400000.00';
  schedules11[0].paid_date = '2026-08-05';

  const schedules12 = ContractsEngine.generateSchedule(contract12.contract_id, contract12.gross_contract_value, '0.25', 6, '2026-01-10', 3);
  schedules12[0].status = 'Paid';
  schedules12[0].amount_paid = schedules12[0].nominal_value;
  schedules12[0].paid_date = '2026-01-10';
  schedules12[1].status = 'Paid';
  schedules12[1].amount_paid = schedules12[1].nominal_value;
  schedules12[1].paid_date = '2026-04-10';
  schedules12[2].status = 'Paid';
  schedules12[2].amount_paid = schedules12[2].nominal_value;
  schedules12[2].paid_date = '2026-07-10';
  schedules12[3].due_date = '2026-10-10';

  const schedules: ERPInstallmentSchedule[] = [
    ...schedules1,
    ...schedules2,
    ...schedules3,
    ...schedules4,
    ...schedules5,
    ...schedules6,
    ...schedules7,
    ...schedules8,
    ...schedules9,
    ...schedules10,
    ...schedules11,
    ...schedules12
  ];

  // 4. Initial Journal Entries (Balanced, Invariant 4.1 compliant)
  const journalEntries: ERPJournalEntry[] = [
    // Initial Partner Capital Contribution: Dr Bank 102000 / Cr Partner Capital 301000 (100M EGP)
    GeneralLedgerEngine.validateAndCreateEntry({
      entry_number: 'JE-2026-INIT-001',
      entry_date: '2026-03-02',
      period: currentPeriod,
      description: 'Founding Partner Capital Injection for Egyptian Luxury Developments',
      source_module: 'CAPITAL_CALL',
      created_by: 'CFO_FARID',
      lines: [
        {
          account_code: '102000',
          debit_amount: '100000000.00',
          credit_amount: '0.00',
          memo: 'Deposit into Commercial Bank Operating Account'
        },
        {
          account_code: '301000',
          debit_amount: '0.00',
          credit_amount: '100000000.00',
          memo: 'Partner Capital Credit'
        }
      ]
    }),

    // Incurred Construction WIP: Dr 150000/151000 / Cr Accounts Payable 201000 (45M EGP)
    GeneralLedgerEngine.validateAndCreateEntry({
      entry_number: 'JE-2026-WIP-002',
      entry_date: '2026-03-10',
      period: currentPeriod,
      description: 'Capitalized Direct Construction & Land Development WIP',
      source_module: 'WIP_ALLOCATION',
      created_by: 'CHIEF_ENGINEER',
      lines: [
        {
          account_code: '150000',
          debit_amount: '20000000.00',
          credit_amount: '0.00',
          memo: 'Land acquisition allocation'
        },
        {
          account_code: '151000',
          debit_amount: '25000000.00',
          credit_amount: '0.00',
          memo: 'Structural concrete & direct civil works'
        },
        {
          account_code: '201000',
          debit_amount: '0.00',
          credit_amount: '45000000.00',
          memo: 'Contractor Trade Payables'
        }
      ]
    }),

    // Advance Payment for Contract 1: Dr 101000 (Safe Vault) / Cr 203000 (3.6M EGP)
    ContractsEngine.createAdvancePaymentEntry(contract1, '3600000.00', currentPeriod, '2026-03-15', true, 'TELLER_1'),

    // Handover Entry for Contract 2 (Penthouse) Model B Net Recognition (Invariant 4.17):
    // Dr 203000 (17.5M), Dr 103000 (17.5M), Cr 401000 (35M), Dr 502000 (15.75M), Cr 151000 (15.75M)
    ContractsEngine.createHandoverModelBEntry(
      contract2,
      currentPeriod,
      '2026-03-01',
      '15750000.00', // RSV 45% of 35M
      '502000',
      '151000',
      'CFO_FARID'
    )
  ];

  // 5. PDC Records in Safe
  const pdcRecords: ERPPDCRecord[] = [
    {
      cheque_id: 'pdc-001',
      contract_id: contract1.contract_id,
      schedule_id: schedules1[1].schedule_id,
      cheque_number: 'SND-789012',
      bank_name: '',
      drawer_name: 'Eng. Karim El-Mansouri',
      nominal_value: schedules1[1].nominal_value,
      due_date: schedules1[1].due_date,
      status: 'In Safe'
    },
    {
      cheque_id: 'pdc-002',
      contract_id: contract1.contract_id,
      schedule_id: schedules1[2].schedule_id,
      cheque_number: 'SND-789013',
      bank_name: '',
      drawer_name: 'Eng. Karim El-Mansouri',
      nominal_value: schedules1[2].nominal_value,
      due_date: schedules1[2].due_date,
      status: 'In Safe'
    }
  ];

  // 6. Initial Cost Allocation (RSV)
  const costAllocations: ERPCostAllocation[] = [
    RSVEngine.calculateAllocation('Palatial Estates & Nile Horizons', '45000000.00', '100000000.00')
  ];

  // 7. Statutory Tax Records
  const taxRecords: ERPTaxRecord[] = [
    {
      tax_id: 'tax-001',
      contract_id: contract1.contract_id,
      tax_type: 'Disposal 2.5% Case A',
      taxable_base: '24000000.00',
      tax_rate: '0.0250',
      tax_amount: '600000.00',
      remittance_status: 'Pending',
      created_at: '2026-01-15T10:00:00Z'
    },
    {
      tax_id: 'tax-002',
      contract_id: contract2.contract_id,
      tax_type: 'Disposal 2.5% Case B',
      taxable_base: '35000000.00',
      tax_rate: '0.0250',
      tax_amount: '875000.00',
      remittance_status: 'Remitted to ETA',
      created_at: '2026-02-01T11:00:00Z'
    }
  ];

  // 8. Partner Capital Calls
  const partnerCalls: ERPPartnerCall[] = [
    {
      call_id: 'call-001',
      partner_name: 'Farid Investment Group',
      project_budget_ceiling: '250000000.00',
      pro_rata_percentage: '0.6000',
      call_amount: '60000000.00',
      status: 'Funded',
      created_at: '2026-01-02T09:00:00Z'
    },
    {
      call_id: 'call-002',
      partner_name: 'Nile Capital Partners',
      project_budget_ceiling: '250000000.00',
      pro_rata_percentage: '0.4000',
      call_amount: '40000000.00',
      status: 'Funded',
      created_at: '2026-01-02T09:00:00Z'
    }
  ];

  // 9. Maker-Checker Pending Queue
  const makerCheckerRequests: ERPMakerCheckerRequest[] = [
    {
      request_id: 'mc-req-101',
      mutation_type: 'CONTRACT_ESCALATION',
      amount: '1200000.00',
      requested_by: 'COMMERCIAL_AGENT_SAMIR',
      primary_approver: 'COMMERCIAL_DIRECTOR',
      secondary_approver: 'CHIEF_FINANCIAL_OFFICER',
      status: 'Pending',
      payload: {
        contract_id: contract1.contract_id,
        contract_number: contract1.contract_number,
        delta_v: '1200000.00',
        reason: 'Steel & Italian Carrara Marble index escalation'
      },
      created_at: '2026-03-02T14:30:00Z'
    }
  ];

  const rescissions: ERPRescissionRecord[] = [
    {
      rescission_id: 'rescission-001',
      contract_id: contract8.contract_id,
      branch: 'Pre-Delivery',
      gross_contract_value: '31000000.00',
      total_cash_collected: '3100000.00',
      penalty_uncapped: '3100000.00',
      penalty_retained: '3100000.00',
      net_refund_liability: '0.00',
      unpaid_ar_cleared: '27900000.00',
      wip_cost_restored: '0.00',
      unit_state: 'Available',
      created_at: '2026-01-20T10:00:00Z'
    }
  ];

  return {
    periods,
    contracts,
    schedules,
    journalEntries,
    pdcRecords,
    rescissions,
    amendments: [],
    costAllocations,
    taxRecords,
    partnerCalls,
    partnerCommitments: [],
    makerCheckerRequests
  };
}
