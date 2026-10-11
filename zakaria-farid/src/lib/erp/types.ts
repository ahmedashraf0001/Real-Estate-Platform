/**
 * Zakaria Farid Real Estate ERP — Type Definitions (Revision 2)
 * Source of Truth: AGENT_BUILD_SPEC.md (Revision 2)
 */

import type { Decimal } from './math';

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
  | 'MANUAL'
  | 'MANUAL_ADJUSTMENT'
  | 'CONSTRUCTION_SETTLEMENT';

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
  base_price?: string;         // Base unit price before manual tax
  tax_amount?: string;         // Manual tax added per apartment (not static)
  tax_description?: string;    // Description of manual apartment tax
  gross_contract_value: string; // Fixed-point string (Base Price + Tax Amount)
  currency: CurrencyCode;
  exchange_rate: string;        // e.g. "1.0000" or "48.5000"
  contract_date: string;
  handover_date?: string;
  handover_status: HandoverStatus;
  total_cash_collected: string; // Fixed-point string
  status: ContractStatus;
  payment_plan_type?: 'FULL_CASH' | 'UPFRONT_HANDOVER' | 'INSTALLMENTS';
  sale_model?: SaleModel;
  partner_splits?: ERPContractPartnerSplit[];
  is_whole_building_sale?: boolean;
  building_unit_id?: string;
  building_unit_number?: string;
}

export type SaleModel = 'CASH_ON_DELIVERY' | 'OFF_PLAN_INSTALLMENTS';

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
  | 'Form 41 3%'
  | 'Custom Apartment Tax'
  | string;

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

export type PartnerCommitmentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface ERPPartnerCommitment {
  commitment_id: string;
  property_id: string;
  partner_name: string;
  partner_id?: string;
  milestone_name: string;
  milestone_phase?: string;
  committed_amount: string;
  paid_amount: string;
  due_date: string;
  status: PartnerCommitmentStatus;
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export type PartnerRole = 'primary_developer' | 'equity_partner' | 'land_partner' | 'silent_financier';

export interface ERPPartnerProfile {
  id: string;
  name: string;
  role: PartnerRole;
  phone?: string;
  national_id?: string;
  bank_name?: string;
  iban?: string;
  instapay_handle?: string;
  preferred_payout_method?: 'INSTAPAY' | 'BANK' | 'CASH';
  notes?: string;
  joined_date: string;
}

export type PartnerTransactionType = 
  | 'CAPITAL_INJECTION'     // ضخ مساهمة رأس مال (Dr 101000 الخزينة عبر كاش/إنستاباي أو 102000 بنك, Cr 301000)
  | 'PROFIT_DISTRIBUTION'   // صرف وتوزيع أرباح (Dr 303000, Cr 101000 الخزينة عبر كاش/إنستاباي أو 102000 بنك)
  | 'CAPITAL_RETURN';       // استرداد رأس مال (Dr 301000, Cr 101000 الخزينة عبر كاش/إنستاباي أو 102000 بنك)

export interface ERPPartnerTransaction {
  id: string;
  transaction_number: string;
  partner_name: string;
  type: PartnerTransactionType;
  amount: string;
  property_id?: string;
  property_title?: string;
  commitment_id?: string;
  /** DEBT_OFFSET: settled from the partner's profit share, no cash moved. */
  payment_method: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000' | 'DEBT_OFFSET';
  journal_entry_number?: string;
  date: string;
  status: 'COMPLETED' | 'PENDING';
  memo: string;
  receipt_ref?: string;
  created_at?: string;
  updated_at?: string;
  adjustments?: ERPPropertyCostAdjustment[];
}

export type OwnershipActionType = 'FULL_INTERNAL_BUYOUT' | 'PARTIAL_SALE' | 'FULL_SUBSTITUTION' | 'INITIAL_FORMATION';

export interface BuildingOwnershipLogEntry {
  log_id: string;
  property_id: string;
  action_type: OwnershipActionType;
  from_partner_name: string;
  to_partner_name: string;
  transferred_share_pct: number;
  effective_date: string;
  transfer_value_egp?: string; // قيمة التنازل الودية المتفق عليها (اختياري للتوثيق)
  transferred_arrears_egp?: string; // قيمة المتأخرات المنقولة إن وجدت
  transferred_arrears_flag: boolean;
  notes?: string;
  created_at: string;
}

export interface DynamicBuildingCapitalInfo {
  propertyId: string;
  propertyTitle: string;
  targetBudgetEgp?: number;
  founderInjectedEgp: string;
  founderSharePct: number;
  impliedTotalCapitalEgp: string;
  totalActualInjectedEgp: string;
  fundingRatioPct: number;
  partnerStatuses: Array<{
    partnerName: string;
    sharePct: number;
    requiredContributionEgp: string;
    paidContributionEgp: string;
    arrearsEgp: string;
    hasArrears: boolean;
    isFounder: boolean;
  }>;
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

export type ERPNotificationSeverity = 'critical' | 'warning' | 'info' | 'success';

export type ERPNotificationCategory = 
  | 'cheque' 
  | 'approval' 
  | 'tax' 
  | 'contract' 
  | 'period' 
  | 'system'
  | 'contractor'
  | 'expense'
  | 'transaction';

export interface ERPNotification {
  id: string;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  severity: ERPNotificationSeverity;
  category: ERPNotificationCategory;
  createdAt: string;
  read: boolean;
  dismissed?: boolean;
  actionLabelAr?: string;
  actionLabelEn?: string;
  targetModule?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Property Lifecycle Material & Cost Audit Types (بنود التكاليف ودورة حياة العقار)
// ============================================================================

export type PropertyCostCategory = 
  | 'civil_structure'       // خرسانات وحديد وبناء
  | 'mep_infrastructure'     // كهروميكانيك، سباكة، عزل
  | 'finishing_interior'    // تشطيبات معمارية، سيراميك، دهانات، نجارة
  | 'site_facade'           // واجهات، مداخل رخام، مصاعد، لاندسكيب
  | 'permits_engineering'   // تراخيص، استشارات ومخططات، إشراف
  | 'taxes_fees'            // ضرائب ورسوم إنشائية وحكومية على البناء/الشقق
  | 'land_allocation'       // حصة الأرض المخصصة للعقار
  | 'labor_subcontractor';   // مصنعيات ومقاولو باطن

export type PropertyLifecyclePhase = 
  | 'planning_permits'          // التراخيص والتخطيط
  | 'excavation_foundation'     // الحفر والأساسات
  | 'structural_skeleton'       // الهيكل الإنشائي والأسقف
  | 'masonry_roughing'          // المباني وتأسيس التمديدات
  | 'finishing_interiors'       // التشطيبات والكسوات والدهانات
  | 'final_inspection_handover'; // المعاينة النهائية والجاهزية للبيع

export type CostAdjustmentType = 
  | 'REFUND_OVERPAYMENT'      // استرداد مبالغ مدفوعة بالزيادة عن طريق الخطأ (تسوية دائنة بالخصم)
  | 'SUPPLEMENT_UNDERPAYMENT'  // سداد مكمل لمبلغ مدفوع أقل من المستحق (تسوية مدينة بالإضافة)
  | 'ADMIN_NOTE';             // تعديل إداري للتوثيق

export interface ERPPropertyCostAdjustment {
  adjustment_id: string;
  parent_item_id: string;
  adjustment_type: CostAdjustmentType;
  amount_egp: string; // Positive string format "1000.00"
  reason: string;
  reference_invoice?: string;
  payment_method?: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000' | 'ON_CREDIT';
  created_at: string;
  logged_by: string;
  journal_entry_id?: string;
}

export type CostPaymentTerm = 
  | 'FULL_CASH'                   // سداد نقدي فوري كامل
  | 'DOWN_PAYMENT_INSTALLMENTS'   // دفعة مقدمة + أقساط مجدولة
  | 'FULL_DEFERRED';              // آجل بالكامل على أقساط / دفعات

export interface ERPPayableInstallment {
  installment_id: string;
  cost_item_id: string;
  installment_number: number;
  title_ar: string;
  title_en?: string;
  due_date: string; // YYYY-MM-DD
  amount_egp: string;
  paid_amount_egp: string;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  payment_date?: string;
  payment_method?: 'CASH_101000' | 'INSTAPAY_101000' | 'INSTAPAY_102000' | 'BANK_102000';
  treasury_account_code?: '101000' | '102000';
  payment_id?: string;
  notes?: string;
}

export interface ERPPropertyCostItem {
  item_id: string;
  id?: string;
  property_id: string;
  building_unit_id?: string;
  unit_number?: string;
  is_unit_specific?: boolean;
  category: PropertyCostCategory;
  phase: PropertyLifecyclePhase;
  item_name_ar: string;
  item_name_en: string;
  supplier_contractor?: string;
  invoice_ref?: string;
  quantity: number;
  unit: string;
  unit_cost_egp: string;  // Fixed-point string "12345.67"
  total_cost_egp: string; // Fixed-point string "12345.67"
  total_amount?: string | number; // Compatibility alias
  logged_date: string;    // ISO Date YYYY-MM-DD
  logged_by: string;
  linked_account_code?: string;
  status: 'verified' | 'pending_audit' | 'capitalized';
  notes?: string;
  created_at?: string;
  updated_at?: string;
  
  // Payment terms & Payables (جدولة الالتزامات والأقساط)
  payment_term?: CostPaymentTerm;
  paid_amount_egp?: string;
  remaining_amount_egp?: string;
  due_date?: string;
  payable_installments?: ERPPayableInstallment[];

  // Adjustments & Sub-items (البنود الفرعية والتسويات)
  adjustments?: ERPPropertyCostAdjustment[];
  net_effective_cost_egp?: string;
  is_locked?: boolean;
}

// ============================================================================
// DATED & VERSIONED UNIT ESTIMATE-TO-COMPLETE (تقديرات تكلفة إتمام الوحدات)
// ============================================================================

export interface ERPUnitEstimate {
  estimate_id: string;
  property_id: string;
  building_unit_id?: string;
  unit_number?: string;
  as_of_date: string; // ISO Date YYYY-MM-DD
  forecast_cost_to_complete: string; // Fixed-point string "1250000.00"
  confidence_score?: number; // 0..100
  notes?: string;
  created_by?: string;
  created_at?: string;
}

// ============================================================================
// MARGIN EXPOSURE SIGNALS & METRICS (إشارات مخاطر هوامش أرباح البيع تحت الإنشاء)
// ============================================================================

export type MarginExposureSignal = 
  | 'UNKNOWN'            // Missing or stale estimate (>90 days), or unclassified sale model
  | 'HEALTHY'            // Projected margin >= review band threshold
  | 'REVIEW_REQUIRED'    // Projected margin < review band threshold but >= 0
  | 'LOSS_EXPOSURE';     // Projected margin < 0 (contract in net projected loss)

export interface MarginExposureResult {
  contract_id: string;
  contract_number: string;
  sale_model: SaleModel | 'UNCLASSIFIED';
  gross_contract_value: string;
  attributable_incurred_cost: string;
  direct_unit_cost: string;
  common_allocated_cost: string;
  forecast_cost_to_complete: string;
  total_projected_cost: string;
  projected_margin_amount: string;
  projected_margin_percentage: string;
  signal: MarginExposureSignal;
  is_estimate_stale: boolean;
  estimate_as_of_date?: string;
  estimate_age_days?: number;
  notes?: string;
}

export interface MarginExposureConfig {
  /** Margin percentage threshold below which review is required. Default: 20 (%) */
  reviewThresholdPercent?: number;
  /** Maximum allowable days before an estimate is marked stale. Default: 90 days */
  staleEstimateDaysThreshold?: number;
}

export interface PortfolioMarginExposureSummary {
  /** Total contracts submitted to the evaluator */
  totalContractsSubmitted: number;
  /** Active contracts evaluated and subject to ongoing margin risk */
  activeContractsEvaluated: number;
  /** Rescinded/cancelled contracts explicitly excluded from active exposure */
  rescindedContractsExcluded: number;
  /** Total active off-plan contracts */
  totalOffPlanContracts: number;
  /** Total active cash on delivery contracts */
  totalCashOnDeliveryContracts: number;
  /** Total active unclassified contracts */
  totalUnclassifiedContracts: number;
  /** Count of contracts in healthy margin corridor */
  healthyCount: number;
  /** Count of contracts requiring cost engineering review */
  reviewRequiredCount: number;
  /** Count of contracts with projected loss */
  lossExposureCount: number;
  /** Count of contracts with unknown risk (missing/stale data or unclassified) */
  unknownCount: number;
  /** Net monetary value of projected loss exposure in EGP */
  totalExposureLossAmount: Decimal;
  /** Exact configuration applied during evaluation */
  appliedConfig: Required<MarginExposureConfig>;
  /** Detailed evaluation per active contract */
  contracts: MarginExposureResult[];
}




/** Unreceived purchase commitment. Never included in WIP or AP until invoiced. */
export interface ERPConstructionPurchaseOrder {
  order_id: string;
  property_id: string;
  supplier_name: string;
  description: string;
  amount_egp: string;
  order_date: string;
  status: 'DRAFT';
  created_by?: string;
  created_at?: string;
}

/** Stage of a property selling-price change (user-confirmed 2026-10-06). */
export type PropertyPriceStage = 'initial' | 'revised' | 'final';

export interface ERPPropertyPriceHistoryEntry {
  history_id: string;
  property_id: string;
  price_egp: string;
  stage: PropertyPriceStage;
  cost_basis_egp?: string;
  area_m2?: number;
  units_repriced: number;
  note?: string;
  created_at: string;
}
