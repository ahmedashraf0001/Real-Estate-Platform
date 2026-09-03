/**
 * Zakaria Farid Real Estate ERP — Type Definitions (Revision 2)
 * Source of Truth: AGENT_BUILD_SPEC.md (Revision 2)
 */

export type AccountType = 
  | 'ASSET' 
  | 'LIABILITY' 
  | 'EQUITY' 
  | 'REVENUE' 
  | 'EXPENSE' 
  | 'CONTRA_LIABILITY';

export type NormalBalance = 'DEBIT' | 'CREDIT';

export interface ERPAccount {
  account_code: string;
  account_name_en: string;
  account_name_ar: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  is_active: boolean;
  notes?: string;
}

export type PeriodStatus = 'OPEN' | 'LOCKED' | 'CLOSED';

export interface ERPAccountingPeriod {
  period_id: string;
  fiscal_year: number;
  period_number: number;
  start_date: string;
  end_date: string;
  status: PeriodStatus;
  locked_at?: string;
  locked_by?: string;
}

export type JournalSourceModule = 
  | 'SALES' 
  | 'RESCISSION' 
  | 'ESCALATION' 
  | 'PDC' 
  | 'WIP_ALLOCATION' 
  | 'TAX' 
  | 'CAPITAL_CALL'
  | 'MANUAL';

export interface ERPJournalLine {
  line_id: string;
  entry_id: string;
  line_number: number;
  account_code: string;
  debit_amount: string;  // Fixed-point string "12345.67"
  credit_amount: string; // Fixed-point string "12345.67"
  unit_id?: string;
  contract_id?: string;
  partner_id?: string;
  memo?: string;
}

export interface ERPJournalEntry {
  entry_id: string;
  entry_number: string;
  entry_date: string;
  period_id: string;
  description: string;
  source_module: JournalSourceModule;
  source_entity_id?: string;
  created_by: string;
  created_at: string;
  is_locked: boolean;
  lines: ERPJournalLine[];
}

export type ContractStatus = 'Active' | 'Rescinded' | 'Completed';
export type HandoverStatus = 'Pending' | 'Delivered';
export type CurrencyCode = 'EGP' | 'USD';

export interface ERPContractPartnerSplit {
  partner_name: string;
  share_percentage: string;
  share_amount: string;
  cash_share: string;
}

export interface ERPContract {
  contract_id: string;
  contract_number: string;
  unit_id: string;
  property_id?: string;
  lead_id?: string;
  buyer_name: string;
  buyer_phone?: string;
  buyer_email?: string;
  buyer_national_id?: string;
  gross_contract_value: string; // Fixed-point string
  currency: CurrencyCode;
  exchange_rate: string;        // e.g. "1.0000" or "48.5000"
  contract_date: string;
  handover_date?: string;
  handover_status: HandoverStatus;
  total_cash_collected: string; // Fixed-point string
  status: ContractStatus;
  payment_plan_type?: 'FULL_CASH' | 'UPFRONT_HANDOVER' | 'INSTALLMENTS';
  partner_splits?: ERPContractPartnerSplit[];
}

export type InstallmentStatus = 
  | 'Pending' 
  | 'Paid' 
  | 'Partially Paid' 
  | 'Defaulted' 
  | 'SUPERSEDED' 
  | 'Void';

export interface ERPInstallmentSchedule {
  schedule_id: string;
  contract_id: string;
  tranche_number: number; // 0 = Down Payment, 1..N = Installments
  nominal_value: string;  // Fixed-point string
  due_date: string;
  status: InstallmentStatus;
  schedule_version: number;
  amendment_id?: string;
  supersedes_schedule_id?: string;
  amount_paid: string;
  paid_date?: string;
}

export type PDCStatus = 'In Safe' | 'Deposited' | 'Cleared' | 'Bounced' | 'Void';

export interface ERPPDCRecord {
  cheque_id: string;
  contract_id: string;
  schedule_id?: string;
  cheque_number: string;
  bank_name: string;
  drawer_name: string;
  nominal_value: string;
  due_date: string;
  status: PDCStatus;
  deposited_date?: string;
  cleared_date?: string;
}

export type RescissionBranch = 'Pre-Delivery' | 'Post-Delivery';
export type UnitRescissionState = 
  | 'Under Rescission Audit' 
  | 'Site Inspection & Snagging' 
  | 'Re-appraisal' 
  | 'Managerial Sign-off' 
  | 'Available';

export interface ERPRescissionRecord {
  rescission_id: string;
  contract_id: string;
  branch: RescissionBranch;
  gross_contract_value: string;
  total_cash_collected: string;
  penalty_uncapped: string;
  penalty_retained: string;
  net_refund_liability: string;
  unpaid_ar_cleared: string;
  wip_cost_restored: string;
  unit_state: UnitRescissionState;
  journal_entry_id?: string;
  created_at: string;
}

export interface ERPContractAmendment {
  amendment_id: string;
  contract_id: string;
  delta_v: string;
  reason: string;
  effective_date: string;
  new_version: number;
  approved_by: string;
  created_at: string;
}

export interface ERPCostAllocation {
  allocation_id: string;
  project_name: string;
  total_incurred_wip: string;
  total_sales_value: string;
  rsv_factor: string; // e.g. "0.450000"
  calculated_at: string;
}

export type TaxType = 
  | 'Disposal 2.5% Case A' 
  | 'Disposal 2.5% Case B' 
  | 'Form 41 1%' 
  | 'Form 41 3%';

export type TaxRemittanceStatus = 'Pending' | 'Remitted to ETA';

export interface ERPTaxRecord {
  tax_id: string;
  contract_id: string;
  tax_type: TaxType;
  taxable_base: string;
  tax_rate: string;
  tax_amount: string;
  remittance_status: TaxRemittanceStatus;
  created_at: string;
}

export type CapitalCallStatus = 'Issued' | 'Funded' | 'Overdue';

export interface ERPPartnerCall {
  call_id: string;
  partner_name: string;
  project_budget_ceiling: string;
  pro_rata_percentage: string;
  call_amount: string;
  paid_amount?: string;
  status: CapitalCallStatus;
  created_at: string;
}

export type MakerCheckerStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ERPMakerCheckerRequest {
  request_id: string;
  mutation_type: string;
  amount?: string;
  requested_by: string;
  primary_approver?: string;
  secondary_approver?: string;
  status: MakerCheckerStatus;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface InvariantValidationResult {
  code: string;
  title: string;
  spec_ref: string;
  passed: boolean;
  details: string;
  checked_at: string;
}

export interface ERPAuditLog {
  log_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  performed_at: string;
  prior_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  ip_address?: string | null;
}
