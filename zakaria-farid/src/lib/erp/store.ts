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
  makerCheckerRequests: ERPMakerCheckerRequest[];
}

export function createInitialERPState(): ERPStoreState {
  // 1. Accounting Periods for 2026
  const periods: ERPAccountingPeriod[] = [
    {
      period_id: 'period-2026-01',
      fiscal_year: 2026,
      period_number: 1,
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      status: 'CLOSED',
      locked_at: '2026-02-05T12:00:00Z',
      locked_by: 'CFO_FARID'
    },
    {
      period_id: 'period-2026-02',
      fiscal_year: 2026,
      period_number: 2,
      start_date: '2026-02-01',
      end_date: '2026-02-28',
      status: 'CLOSED',
      locked_at: '2026-03-05T12:00:00Z',
      locked_by: 'CFO_FARID'
    },
    {
      period_id: 'period-2026-03',
      fiscal_year: 2026,
      period_number: 3,
      start_date: '2026-03-01',
      end_date: '2026-03-31',
      status: 'OPEN'
    },
    {
      period_id: 'period-2026-04',
      fiscal_year: 2026,
      period_number: 4,
      start_date: '2026-04-01',
      end_date: '2026-04-30',
      status: 'OPEN'
    }
  ];

  const currentPeriod = periods[2]; // Period 3 (March 2026, OPEN)

  // 2. Initial Contracts
  const contract1: ERPContract = {
    contract_id: 'contract-villa-01',
    contract_number: 'CT-ZF-2026-001',
    unit_id: 'VILLA-ROYAL-101',
    buyer_name: 'Eng. Karim El-Mansouri',
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
    unit_id: 'PENTHOUSE-NILE-202',
    buyer_name: 'Dr. Mona Al-Sawy',
    buyer_national_id: '29205120108741',
    gross_contract_value: '35000000.00', // 35M EGP
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2026-02-01',
    handover_date: '2026-03-01',
    handover_status: 'Delivered', // Handover happened
    total_cash_collected: '17500000.00', // 50% paid
    status: 'Active'
  };

  const contract3: ERPContract = {
    contract_id: 'contract-duplex-03',
    contract_number: 'CT-ZF-2026-003',
    unit_id: 'DUPLEX-GARDEN-303',
    buyer_name: 'Youssef Badr & Partners',
    buyer_national_id: '28109030104492',
    gross_contract_value: '18000000.00', // 18M EGP
    currency: 'EGP',
    exchange_rate: '1.0000',
    contract_date: '2026-02-10',
    handover_status: 'Pending',
    total_cash_collected: '1800000.00', // 10% paid
    status: 'Active'
  };

  const contracts: ERPContract[] = [contract1, contract2, contract3];

  // 3. Generate Installment Schedules (with Invariant 4.3 remainder absorption)
  const schedules1 = ContractsEngine.generateSchedule(contract1.contract_id, contract1.gross_contract_value, '0.15', 8, '2026-01-15', 3);
  schedules1[0].status = 'Paid';
  schedules1[0].amount_paid = '3600000.00';
  schedules1[0].paid_date = '2026-01-15';

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

  const schedules3 = ContractsEngine.generateSchedule(contract3.contract_id, contract3.gross_contract_value, '0.10', 6, '2026-02-10', 3);
  schedules3[0].status = 'Paid';
  schedules3[0].amount_paid = '1800000.00';
  schedules3[0].paid_date = '2026-02-10';

  const schedules: ERPInstallmentSchedule[] = [...schedules1, ...schedules2, ...schedules3];

  // 4. Initial Journal Entries (Balanced, Invariant 4.1 compliant)
  const journalEntries: ERPJournalEntry[] = [
    // Initial Partner Capital Contribution: Dr Bank 102000 / Cr Partner Capital 301000 (100M EGP)
    GeneralLedgerEngine.validateAndCreateEntry({
      entry_number: 'JE-2026-INIT-001',
      entry_date: '2026-01-02',
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
      entry_date: '2026-01-10',
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

    // Advance Payment for Contract 1: Dr 102000 / Cr 203000 (3.6M EGP)
    ContractsEngine.createAdvancePaymentEntry(contract1, '3600000.00', currentPeriod, '2026-01-15', false, 'TELLER_1'),

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
      cheque_number: 'CHQ-789012',
      bank_name: 'Commercial International Bank (CIB)',
      drawer_name: 'Eng. Karim El-Mansouri',
      nominal_value: schedules1[1].nominal_value,
      due_date: schedules1[1].due_date,
      status: 'In Safe'
    },
    {
      cheque_id: 'pdc-002',
      contract_id: contract1.contract_id,
      schedule_id: schedules1[2].schedule_id,
      cheque_number: 'CHQ-789013',
      bank_name: 'Commercial International Bank (CIB)',
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

  return {
    periods,
    contracts,
    schedules,
    journalEntries,
    pdcRecords,
    rescissions: [],
    amendments: [],
    costAllocations,
    taxRecords,
    partnerCalls,
    makerCheckerRequests
  };
}
