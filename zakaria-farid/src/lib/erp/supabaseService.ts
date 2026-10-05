/**
 * Zakaria Farid Real Estate ERP — Live Supabase Database Persistence Service
 * Connects the ERP financial engine to live PostgreSQL/Supabase tables.
 * Eliminates static mock data and ensures all records are read from and written to the database.
 */

import { SupabaseClient } from '@supabase/supabase-js';
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
  PartnerCommitmentStatus,
  ERPPartnerProfile,
  ERPPartnerTransaction,
  ERPPDCRecord, 
  ERPRescissionRecord, 
  ERPTaxRecord,
  CurrencyCode,
  HandoverStatus,
  ContractStatus,
  InstallmentStatus,
  JournalSourceModule,
  PDCStatus,
  RescissionBranch,
  UnitRescissionState,
  TaxType,
  TaxRemittanceStatus,
  MakerCheckerStatus,
  ERPPropertyCostItem,
  PropertyCostCategory,
  PropertyLifecyclePhase,
  ERPUnitEstimate,
  ERPConstructionPurchaseOrder
} from './types';
import { Property, Lead, BuildingUnitItem } from '@/lib/supabase/types';
import { D, generateUUID, isUUID, ensureUUID, ratio } from './math';
import { CANONICAL_COA } from './ledger';
import { prepareConstructionSettlement } from './constructionSettlement';

export interface LiveERPDataset {
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
  properties: Property[];
  leads: Lead[];
  propertyCosts: ERPPropertyCostItem[];
  purchaseOrders?: ERPConstructionPurchaseOrder[];
  unitEstimates?: ERPUnitEstimate[];
  isSchemaMigrated: boolean;
}

/**
 * Detects if a Supabase/PostgREST error indicates an expired token or unauthorized access.
 */
export function isAuthError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  const code = String(e.code || e.statusCode || e.status || '');
  const message = String(e.message || e.error_description || e.msg || '').toLowerCase();

  if (code === '401' || code === 'PGRST301') return true;
  if (
    message.includes('jwt expired') ||
    message.includes('token is expired') ||
    message.includes('unauthorized') ||
    message.includes('invalid jwt') ||
    message.includes('token expired')
  ) {
    return true;
  }
  return false;
}

export class ERPSupabaseService {
  /**
   * Fetch all live ERP data directly from Supabase.
   * Resilient to un-migrated tables (PGRST205 schema cache errors).
   */
  static async fetchLiveERPData(supabase: SupabaseClient): Promise<LiveERPDataset> {
    // 1. Fetch Real Properties from Supabase
    const { data: propertiesData, error: propertiesError } = await supabase
      .from('properties')
      .select('*, property_images(*)')
      .order('created_at', { ascending: false });

    if (propertiesError && isAuthError(propertiesError)) {
      throw propertiesError;
    }

    const rawProps = (propertiesData as Property[]) || [];
    const baseProperties = rawProps;

    const properties: Property[] = baseProperties.map(p => {
      const isBuilding = p.type === 'building' || (p.title_ar || '').includes('عمارة') || (p.title_en || '').toLowerCase().includes('building');
      if (isBuilding) {
        const unitsCount = p.total_units_count && p.total_units_count > 1 ? p.total_units_count : 6;
        const saleMode = p.sale_mode || 'both_flexible';
        let units: BuildingUnitItem[] = (p.building_units as BuildingUnitItem[]) || [];
        if (!units || units.length === 0) {
          const unitArea = Math.round((p.area_sqm || 1200) / unitsCount);
          const unitPrice = Math.round((p.price_egp || 35000000) / unitsCount);
          units = Array.from({ length: unitsCount }, (_, i) => {
            const floor = Math.floor(i / 2) + 1;
            const letter = (i % 2 === 0) ? 'A' : 'B';
            return {
              unit_id: `${p.id}-apt-${i + 1}`,
              unit_number: `شقة ${floor}${letter} - الدور ${floor}`,
              floor,
              area_sqm: unitArea,
              bedrooms: 3,
              bathrooms: 2,
              price_egp: unitPrice,
              status: 'available' as const
            };
          });
        }
        return {
          ...p,
          type: 'building' as const,
          sale_mode: saleMode,
          total_units_count: units.length,
          building_units: units,
          partner_splits: p.partner_splits && p.partner_splits.length > 0 ? p.partner_splits : (
            ((p.title_ar || '').includes('الشيخ زايد') || (p.title_ar || '').includes('النرجس') || (p.title_ar || '').includes('الفردوس') || (p.title_ar || '').includes('الأوبسيديان'))
              ? [{ partner_name: 'زكريا فريد', share_percentage: 65 }, { partner_name: 'م. أحمد الشريف', share_percentage: 35 }]
              : (((p.title_ar || '').includes('الساحل') || (p.title_ar || '').includes('هاسبيندا') || (p.title_ar || '').includes('هاسيندا') || (p.title_ar || '').includes('السماء') || (p.title_ar || '').includes('الصفوة'))
                ? [{ partner_name: 'زكريا فريد', share_percentage: 75 }, { partner_name: 'د. هاني المنياوي', share_percentage: 25 }]
                : (((p.title_ar || '').includes('السخنة') || (p.title_ar || '').includes('البحر الأحمر'))
                  ? [{ partner_name: 'زكريا فريد', share_percentage: 70 }, { partner_name: 'الحاج رجب الصاوي', share_percentage: 30 }]
                  : [{ partner_name: 'زكريا فريد', share_percentage: 100 }]
                )
              )
          )
        };
      }
      return {
        ...p,
        partner_splits: p.partner_splits && p.partner_splits.length > 0 ? p.partner_splits : (
          ((p.title_ar || '').includes('الشيخ زايد') || (p.title_ar || '').includes('النرجس') || (p.title_ar || '').includes('الفردوس') || (p.title_ar || '').includes('الأوبسيديان'))
            ? [{ partner_name: 'زكريا فريد', share_percentage: 65 }, { partner_name: 'م. أحمد الشريف', share_percentage: 35 }]
            : (((p.title_ar || '').includes('الساحل') || (p.title_ar || '').includes('هاسبيندا') || (p.title_ar || '').includes('هاسيندا') || (p.title_ar || '').includes('السماء') || (p.title_ar || '').includes('الصفوة'))
              ? [{ partner_name: 'زكريا فريد', share_percentage: 75 }, { partner_name: 'د. هاني المنياوي', share_percentage: 25 }]
              : (((p.title_ar || '').includes('السخنة') || (p.title_ar || '').includes('البحر الأحمر'))
                ? [{ partner_name: 'زكريا فريد', share_percentage: 70 }, { partner_name: 'الحاج رجب الصاوي', share_percentage: 30 }]
                : [{ partner_name: 'زكريا فريد', share_percentage: 100 }]
              )
            )
        )
      };
    });

    // 1b. Fetch Active CRM Leads from Supabase
    let leads: Lead[] = [];
    try {
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, name, phone, email, stage, property_id, created_at, notes')
        .order('created_at', { ascending: false });
      if (leadsError && isAuthError(leadsError)) {
        throw leadsError;
      }
      if (leadsData && leadsData.length > 0) {
        leads = leadsData as unknown as Lead[];
      }
    } catch (e) {
      if (isAuthError(e)) throw e;
      console.warn('Leads fetch error in ERP:', e);
    }

    // In development mode, check if we have an authenticated user session.
    // If unauthenticated, avoid firing failing queries on all 16 RLS-restricted tables to prevent console 401 storms.
    if (process.env.NODE_ENV === 'development') {
      let hasSession = false;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        hasSession = !!sessionData?.session;
      } catch {
        hasSession = false;
      }

      if (!hasSession) {
        return {
          periods: [],
          contracts: [],
          schedules: [],
          journalEntries: [],
          pdcRecords: [],
          rescissions: [],
          amendments: [],
          costAllocations: [],
          taxRecords: [],
          partnerCalls: [],
          partnerCommitments: [],
          makerCheckerRequests: [],
          properties,
          leads,
          propertyCosts: [],
          purchaseOrders: [],
          unitEstimates: [],
          isSchemaMigrated: true
        };
      }
    }

    // 2. Fetch Accounting Periods (Check schema migration status)
    let isSchemaMigrated = true;
    let periodsData: Record<string, unknown>[] | null = null;

    try {
      const periodsRes = await supabase
        .from('erp_accounting_periods')
        .select('*')
        .order('fiscal_year', { ascending: true })
        .order('period_number', { ascending: true });

      if (periodsRes.error) {
        if (isAuthError(periodsRes.error)) {
          throw periodsRes.error;
        }
        if (periodsRes.error.code === 'PGRST205' || periodsRes.error.message?.includes('schema cache')) {
          isSchemaMigrated = false;
        }
      } else {
        periodsData = periodsRes.data;
      }
    } catch (e) {
      if (isAuthError(e)) throw e;
      isSchemaMigrated = false;
    }

    let periods: ERPAccountingPeriod[] = [];
    if (isSchemaMigrated && periodsData && periodsData.length > 0) {
      periods = periodsData.map(p => ({
        period_id: p.period_id as string,
        fiscal_year: p.fiscal_year as number,
        period_number: p.period_number as number,
        start_date: p.start_date as string,
        end_date: p.end_date as string,
        status: p.status as 'OPEN' | 'LOCKED' | 'CLOSED',
        locked_at: p.locked_at as string | undefined,
        locked_by: p.locked_by as string | undefined
      }));
    }

    let contractsData: Record<string, unknown>[] | null = null;
    let schedulesData: Record<string, unknown>[] | null = null;
    let entriesData: Record<string, unknown>[] | null = null;
    let pdcData: Record<string, unknown>[] | null = null;
    let rescissionsData: Record<string, unknown>[] | null = null;
    let amendmentsData: Record<string, unknown>[] | null = null;
    let costAllocationsData: Record<string, unknown>[] | null = null;
    let taxData: Record<string, unknown>[] | null = null;
    let makerCheckerData: Record<string, unknown>[] | null = null;
    let propertyCostsData: Record<string, unknown>[] | null = null;
    let unitEstimatesData: Record<string, unknown>[] | null = null;
    let purchaseOrdersData: ERPConstructionPurchaseOrder[] = [];
    let partnerCommitmentsData: Record<string, unknown>[] | null = null;

    if (isSchemaMigrated) {
      try {
        const [cRes, sRes, eRes, pRes, rRes, aRes, caRes, tRes, mcRes] = await Promise.all([
          supabase.from('erp_contracts').select('*').order('created_at', { ascending: false }),
          supabase.from('erp_installment_schedules').select('*').order('tranche_number', { ascending: true }),
          supabase.from('erp_journal_entries').select('*, erp_journal_lines(*)').order('entry_date', { ascending: false }),
          supabase.from('erp_pdc_records').select('*').order('due_date', { ascending: true }),
          supabase.from('erp_rescissions').select('*').order('created_at', { ascending: false }),
          supabase.from('erp_contract_amendments').select('*').order('created_at', { ascending: false }),
          supabase.from('erp_cost_allocations').select('*').order('calculated_at', { ascending: false }),
          supabase.from('erp_tax_records').select('*').order('created_at', { ascending: false }),
          supabase.from('erp_maker_checker').select('*').order('created_at', { ascending: false })
        ]);

        const responses = [cRes, sRes, eRes, pRes, rRes, aRes, caRes, tRes, mcRes];
        for (const res of responses) {
          if (res?.error && isAuthError(res.error)) {
            throw res.error;
          }
        }

        contractsData = cRes.data;
        schedulesData = sRes.data;
        entriesData = eRes.data;
        pdcData = pRes.data;
        rescissionsData = rRes.data;
        amendmentsData = aRes.data;
        costAllocationsData = caRes.data;
        taxData = tRes.data;
        makerCheckerData = mcRes.data;

        try {
          const costRes = await supabase.from('erp_property_costs').select('*').order('logged_date', { ascending: false });
          if (costRes.error && isAuthError(costRes.error)) {
            throw costRes.error;
          }
          if (costRes.data && costRes.data.length > 0) {
            propertyCostsData = costRes.data;
          }
        } catch (costErr) {
          if (isAuthError(costErr)) throw costErr;
          // erp_property_costs table not yet created
        }

        const ordersRes = await supabase.from('erp_construction_purchase_orders').select('*').order('order_date', { ascending: false });
        if (ordersRes.error && isAuthError(ordersRes.error)) throw ordersRes.error;
        purchaseOrdersData = ordersRes.data || [];

        try {
          const ueRes = await supabase.from('erp_unit_estimates').select('*').order('as_of_date', { ascending: false });
          if (ueRes.error && isAuthError(ueRes.error)) {
            throw ueRes.error;
          }
          if (ueRes.data && ueRes.data.length > 0) {
            unitEstimatesData = ueRes.data;
          }
        } catch (ueErr) {
          if (isAuthError(ueErr)) throw ueErr;
          // erp_unit_estimates table not yet created
        }

        try {
          const pcomRes = await supabase.from('erp_partner_commitments').select('*').order('due_date', { ascending: true });
          if (pcomRes.error && isAuthError(pcomRes.error)) {
            throw pcomRes.error;
          }
          if (pcomRes.data && pcomRes.data.length > 0) {
            partnerCommitmentsData = pcomRes.data;
          }
        } catch (pcomErr) {
          if (isAuthError(pcomErr)) throw pcomErr;
          // erp_partner_commitments table not yet created
        }
      } catch (err) {
        if (isAuthError(err)) throw err;
        console.warn('Error querying migrated tables:', err);
      }
    }

    // 3. Contracts
    const contracts: ERPContract[] = (contractsData && contractsData.length > 0)
      ? contractsData.map(c => ({
          contract_id: c.contract_id as string,
          contract_number: c.contract_number as string,
          unit_id: c.unit_id as string,
          property_id: (c.property_id as string) || undefined,
          building_unit_id: (c.building_unit_id as string) || undefined,
          building_unit_number: (c.building_unit_number as string) || undefined,
          is_whole_building_sale: typeof c.is_whole_building_sale === 'boolean' ? c.is_whole_building_sale : undefined,
          buyer_name: c.buyer_name as string,
          buyer_national_id: c.buyer_national_id as string | undefined,
          base_price: c.base_price ? D(c.base_price as string | number).toFixed() : undefined,
          tax_amount: c.tax_amount ? D(c.tax_amount as string | number).toFixed() : undefined,
          tax_description: (c.tax_description as string) || undefined,
          gross_contract_value: D((c.gross_contract_value as string | number) || 0).toFixed(),
          currency: (c.currency as CurrencyCode) || 'EGP',
          exchange_rate: D((c.exchange_rate as string | number) || 1).toFixed(),
          contract_date: c.contract_date as string,
          handover_date: c.handover_date as string | undefined,
          handover_status: (c.handover_status as HandoverStatus) || 'Pending',
          total_cash_collected: D((c.total_cash_collected as string | number) || 0).toFixed(),
          status: (c.status as ContractStatus) || 'Active',
          payment_plan_type: (c.payment_plan_type as ERPContract['payment_plan_type']) || undefined,
          sale_model: (c.sale_model as ERPContract['sale_model']) || undefined,
        }))
      : [];

    // 4. Installment Schedules
    const schedules: ERPInstallmentSchedule[] = (schedulesData && schedulesData.length > 0)
      ? schedulesData.map(s => ({
          schedule_id: s.schedule_id as string,
          contract_id: s.contract_id as string,
          tranche_number: s.tranche_number as number,
          nominal_value: D((s.nominal_value as string | number) || 0).toFixed(),
          due_date: s.due_date as string,
          status: (s.status as InstallmentStatus) || 'Pending',
          schedule_version: (s.schedule_version as number) || 1,
          amendment_id: s.amendment_id as string | undefined,
          supersedes_schedule_id: s.supersedes_schedule_id as string | undefined,
          amount_paid: D((s.amount_paid as string | number) || 0).toFixed(),
          paid_date: s.paid_date as string | undefined
        }))
      : [];

    // 5. Journal Entries & Lines
    const journalEntries: ERPJournalEntry[] = (entriesData && entriesData.length > 0)
      ? entriesData.map(e => ({
          entry_id: e.entry_id as string,
          entry_number: e.entry_number as string,
          entry_date: e.entry_date as string,
          period_id: e.period_id as string,
          description: e.description as string,
          source_module: (e.source_module as JournalSourceModule) || 'CONTRACT_CREATION',
          source_entity_id: e.source_entity_id as string | undefined,
          created_by: (e.created_by as string) || 'SYSTEM',
          created_at: e.created_at as string,
          is_locked: (e.is_locked as boolean) || false,
          lines: ((e.erp_journal_lines as Record<string, unknown>[]) || []).map((l, idx: number) => ({
            line_id: (l.line_id as string) || `jl-${e.entry_id}-${idx}`,
            entry_id: e.entry_id as string,
            line_number: (l.line_number as number) || idx + 1,
            account_code: (l.account_code as string) || '101000',
            debit_amount: D(l.debit_amount as string | number || 0).toFixed(),
            credit_amount: D(l.credit_amount as string | number || 0).toFixed(),
            unit_id: l.unit_id as string | undefined,
            contract_id: l.contract_id as string | undefined,
            memo: l.memo as string | undefined
          }))
        }))
      : [];

    // 6. PDCs
    const pdcRecords: ERPPDCRecord[] = (pdcData && pdcData.length > 0)
      ? pdcData.map(p => ({
          cheque_id: p.cheque_id as string,
          contract_id: p.contract_id as string,
          schedule_id: p.schedule_id as string | undefined,
          cheque_number: p.cheque_number as string,
          bank_name: p.bank_name as string,
          drawer_name: p.drawer_name as string,
          nominal_value: D((p.nominal_value as string | number) || 0).toFixed(),
          due_date: p.due_date as string,
          status: (p.status as PDCStatus) || 'In Safe',
          deposited_date: p.deposited_date as string | undefined,
          cleared_date: p.cleared_date as string | undefined
        }))
      : [];

    // 7. Rescissions
    const rescissions: ERPRescissionRecord[] = (rescissionsData || []).map(r => ({
      rescission_id: r.rescission_id as string,
      contract_id: r.contract_id as string,
      branch: (r.branch as RescissionBranch) || 'Pre-Delivery',
      gross_contract_value: D((r.gross_contract_value as string | number) || 0).toFixed(),
      total_cash_collected: D((r.total_cash_collected as string | number) || 0).toFixed(),
      penalty_uncapped: D((r.penalty_uncapped as string | number) || 0).toFixed(),
      penalty_retained: D((r.penalty_retained as string | number) || 0).toFixed(),
      net_refund_liability: D((r.net_refund_liability as string | number) || 0).toFixed(),
      unpaid_ar_cleared: D((r.unpaid_ar_cleared as string | number) || 0).toFixed(),
      wip_cost_restored: D((r.wip_cost_restored as string | number) || 0).toFixed(),
      unit_state: (r.unit_state as UnitRescissionState) || 'Under Rescission Audit',
      created_at: r.created_at as string
    }));

    // 8. Contract Amendments
    const amendments: ERPContractAmendment[] = (amendmentsData || []).map(a => ({
      amendment_id: a.amendment_id as string,
      contract_id: a.contract_id as string,
      delta_v: D((a.delta_v as string | number) || 0).toFixed(),
      reason: a.reason as string,
      effective_date: a.effective_date as string,
      new_version: a.new_version as number,
      approved_by: a.approved_by as string,
      created_at: a.created_at as string
    }));

    // 9. Cost Allocations
    const costAllocations: ERPCostAllocation[] = (costAllocationsData || []).map(ca => ({
      allocation_id: ca.allocation_id as string,
      project_name: ca.project_name as string,
      total_incurred_wip: D((ca.total_incurred_wip as string | number) || 0).toFixed(),
      total_sales_value: D((ca.total_sales_value as string | number) || 0).toFixed(),
      rsv_factor: ca.rsv_factor as string,
      calculated_at: ca.calculated_at as string
    }));

    // 10. Tax Records
    const taxRecords: ERPTaxRecord[] = (taxData || []).map(t => ({
      tax_id: t.tax_id as string,
      contract_id: t.contract_id as string,
      tax_type: (t.tax_type as TaxType) || 'Disposal 2.5% Case A',
      taxable_base: D((t.taxable_base as string | number) || 0).toFixed(),
      tax_rate: t.tax_rate as string,
      tax_amount: D((t.tax_amount as string | number) || 0).toFixed(),
      remittance_status: (t.remittance_status as TaxRemittanceStatus) || 'Pending',
      created_at: t.created_at as string
    }));

    // 11. Partner Capital Calls (Legacy table dropped in Migration 019; superseded by partnerCommitments)
    const partnerCalls: ERPPartnerCall[] = [];

    // 12. Maker-Checker Requests
    const makerCheckerRequests: ERPMakerCheckerRequest[] = (makerCheckerData || []).map(mc => ({
      request_id: mc.request_id as string,
      mutation_type: (mc.mutation_type as string) || 'TRANCHE_PAYMENT',
      amount: mc.amount ? D(mc.amount as string | number).toFixed() : undefined,
      requested_by: (mc.requested_by as string) || 'SYSTEM',
      primary_approver: mc.primary_approver as string | undefined,
      secondary_approver: mc.secondary_approver as string | undefined,
      status: (mc.status as MakerCheckerStatus) || 'Pending',
      payload: (mc.payload as Record<string, unknown>) || {},
      created_at: (mc.created_at as string) || new Date().toISOString()
    }));

    // 13. Property Lifecycle Material & Cost Items
    const propertyCosts: ERPPropertyCostItem[] = (propertyCostsData || []).map(c => ({
        item_id: c.item_id as string,
        property_id: c.property_id as string,
        building_unit_id: c.building_unit_id as string | undefined,
        unit_number: c.unit_number as string | undefined,
        is_unit_specific: !!c.building_unit_id,
        category: c.category as PropertyCostCategory,
        phase: c.phase as PropertyLifecyclePhase,
        item_name_ar: c.item_name_ar as string,
        item_name_en: c.item_name_en as string,
        supplier_contractor: c.supplier_contractor as string | undefined,
        invoice_ref: c.invoice_ref as string | undefined,
        quantity: Number(c.quantity || 1),
        unit: (c.unit as string) || 'مقطوعية',
        unit_cost_egp: D(c.unit_cost_egp as string | number || 0).toFixed(2),
        total_cost_egp: D(c.total_cost_egp as string | number || 0).toFixed(2),
        logged_date: c.logged_date as string,
        logged_by: (c.logged_by as string) || 'SYSTEM',
        linked_account_code: (c.linked_account_code as string) || '151000',
        status: (c.status as 'verified' | 'pending_audit' | 'capitalized') || 'verified',
        notes: c.notes as string | undefined,
        created_at: (c.created_at as string | undefined) || `${c.logged_date}T10:00:00.000Z`,
        updated_at: c.updated_at as string | undefined,
        payment_term: c.payment_term as any || 'FULL_CASH',
        paid_amount_egp: c.paid_amount_egp ? D(c.paid_amount_egp as string | number).toFixed(2) : undefined,
        remaining_amount_egp: c.remaining_amount_egp ? D(c.remaining_amount_egp as string | number).toFixed(2) : undefined,
        due_date: c.due_date as string | undefined,
        payable_installments: (c.payable_installments as any) || undefined,
        adjustments: (c.adjustments as any) || undefined,
        net_effective_cost_egp: c.net_effective_cost_egp ? D(c.net_effective_cost_egp as string | number).toFixed(2) : undefined,
        is_locked: !!c.is_locked
      }));

    // 14. Unit Estimates
    const unitEstimates: ERPUnitEstimate[] = (unitEstimatesData || []).map(u => ({
      estimate_id: u.estimate_id as string,
      property_id: u.property_id as string,
      building_unit_id: (u.building_unit_id as string) || undefined,
      unit_number: (u.unit_number as string) || undefined,
      as_of_date: u.as_of_date as string,
      forecast_cost_to_complete: D((u.forecast_cost_to_complete as string | number) || 0).toFixed(2),
      confidence_score: u.confidence_score !== undefined && u.confidence_score !== null ? Number(u.confidence_score) : undefined,
      notes: (u.notes as string) || undefined,
      created_by: (u.created_by as string) || undefined,
      created_at: (u.created_at as string) || undefined
    }));

    // 15. Partner Milestone Commitments
    const partnerCommitments: ERPPartnerCommitment[] = (partnerCommitmentsData || []).map(row => ({
      commitment_id: row.commitment_id as string,
      property_id: row.property_id as string,
      partner_name: row.partner_name as string,
      partner_id: (row.partner_id as string) || undefined,
      milestone_name: row.milestone_name as string,
      milestone_phase: (row.milestone_phase as string) || undefined,
      committed_amount: D((row.committed_amount as string | number) || 0).toFixed(2),
      paid_amount: D((row.paid_amount as string | number) || 0).toFixed(2),
      due_date: row.due_date as string,
      status: (row.status as PartnerCommitmentStatus) || 'PENDING',
      notes: (row.notes as string) || undefined,
      created_by: (row.created_by as string) || undefined,
      created_at: (row.created_at as string) || undefined,
      updated_at: (row.updated_at as string) || undefined
    }));

    return {
      periods,
      contracts,
      schedules,
      journalEntries,
      pdcRecords,
      rescissions,
      amendments,
      costAllocations,
      taxRecords,
      partnerCalls,
      partnerCommitments,
      makerCheckerRequests,
      properties,
      leads,
      propertyCosts,
      purchaseOrders: purchaseOrdersData.map(order => ({ ...order, amount_egp: D(order.amount_egp).toFixed(2) })),
      unitEstimates,
      isSchemaMigrated
    };
  }

  private static isSchemaCacheError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const err = error as Record<string, unknown>;
    return err.code === 'PGRST205' || String(err.message || '').includes('schema cache');
  }

  /**
   * Persist a New Real Contract & Generated Tranches to Supabase.
   */
  static async persistNewContract(
    supabase: SupabaseClient,
    contract: ERPContract,
    schedules: ERPInstallmentSchedule[],
    _advanceEntry?: ERPJournalEntry
  ): Promise<void> {
    try {
      // Ensure contract_id is guaranteed to be a valid UUID
      const contractId = ensureUUID(contract.contract_id);
      contract.contract_id = contractId;

      // Base Contract Payload matching 006 migration
      const contractPayload: Record<string, unknown> = {
        contract_id: contractId,
        contract_number: contract.contract_number,
        unit_id: contract.unit_id ? contract.unit_id.slice(0, 50) : 'Unit',
        buyer_name: contract.buyer_name,
        buyer_national_id: contract.buyer_national_id || null,
        gross_contract_value: contract.gross_contract_value,
        currency: contract.currency || 'EGP',
        exchange_rate: contract.exchange_rate || '1.0000',
        contract_date: contract.contract_date,
        handover_date: contract.handover_date || null,
        handover_status: contract.handover_status || 'Pending',
        total_cash_collected: contract.total_cash_collected || '0.00',
        status: contract.status || 'Active'
      };

      if (contract.property_id && isUUID(contract.property_id)) {
        contractPayload.property_id = contract.property_id;
      }
      if (contract.lead_id && isUUID(contract.lead_id)) {
        contractPayload.lead_id = contract.lead_id;
      }
      if (contract.payment_plan_type) {
        contractPayload.payment_plan_type = contract.payment_plan_type;
      }
      if (contract.sale_model) {
        contractPayload.sale_model = contract.sale_model;
      }
      if (contract.is_whole_building_sale !== undefined) {
        contractPayload.is_whole_building_sale = contract.is_whole_building_sale;
      }
      if (contract.building_unit_id) {
        contractPayload.building_unit_id = contract.building_unit_id;
      }
      if (contract.building_unit_number) {
        contractPayload.building_unit_number = contract.building_unit_number;
      }
      if (contract.partner_splits) {
        contractPayload.partner_splits = contract.partner_splits;
      }
      if (contract.base_price) {
        contractPayload.base_price = contract.base_price;
      }
      if (contract.tax_amount) {
        contractPayload.tax_amount = contract.tax_amount;
      }
      if (contract.tax_description) {
        contractPayload.tax_description = contract.tax_description;
      }

      const { error: contractError } = await supabase.from('erp_contracts').insert(contractPayload);

      if (contractError) {
        throw contractError;
      }

      // Insert Schedules with valid UUIDs
      if (schedules && schedules.length > 0) {
        const scheduleRows = schedules.map(s => {
          const schedId = ensureUUID(s.schedule_id);
          s.schedule_id = schedId;
          s.contract_id = contractId;
          return {
            schedule_id: schedId,
            contract_id: contractId,
            tranche_number: s.tranche_number,
            nominal_value: s.nominal_value,
            due_date: s.due_date,
            status: s.status,
            schedule_version: s.schedule_version || 1,
            amount_paid: s.amount_paid || '0.00',
            paid_date: s.paid_date || null
          };
        });

        const { error: scheduleError } = await supabase.from('erp_installment_schedules').insert(scheduleRows);
        if (scheduleError) {
          if (this.isSchemaCacheError(scheduleError)) return;
          throw scheduleError;
        }
      }

      // Contract creation: schedules only, NO advance-payment JE, NO PDC rows (user-confirmed 2026-10-04)

      // Save Manual Apartment Tax (Not static, added by hand per apartment, calculated in pricing)
      if (contract.tax_amount && D(contract.tax_amount).gt(0)) {
        try {
          const manualTaxAmt = D(contract.tax_amount).toFixed(2);
          const basePrice = contract.base_price ? D(contract.base_price).toFixed(2) : contract.gross_contract_value;
          const taxRate = D(basePrice).gt(0) ? ratio(manualTaxAmt, basePrice, 6) : '0.000000';

          const taxRow = {
            tax_id: generateUUID(),
            contract_id: contractId,
            tax_type: contract.tax_description || 'Manual tax',
            taxable_base: basePrice,
            tax_rate: taxRate,
            tax_amount: manualTaxAmt,
            remittance_status: 'Pending'
          };
          await supabase.from('erp_tax_records').insert([taxRow]);
        } catch (e) {
          console.warn('Could not insert manual apartment tax record:', e);
        }
      }

      // If contract has lead_id, mark lead as closed_won in CRM
      if (contract.lead_id && isUUID(contract.lead_id)) {
        await this.markLeadWon(supabase, contract.lead_id, contract.contract_number);
      }

      // If contract has property_id, update property listing_status to 'sold'
      if (contract.property_id && isUUID(contract.property_id)) {
        try {
          await supabase
            .from('properties')
            .update({ listing_status: 'sold' })
            .eq('id', contract.property_id);
        } catch (e) {
          console.warn('Could not update property listing_status to sold:', e);
        }
      }
    } catch (err) {
      if (this.isSchemaCacheError(err)) {
        throw new Error('ERP contract schema unavailable; contract was not saved.', { cause: err });
      }
      throw err;
    }
  }

  /**
   * Update CRM Lead to closed_won upon contract execution
   */
  static async markLeadWon(supabase: SupabaseClient, leadId: string, contractNumber: string) {
    try {
      await supabase
        .from('leads')
        .update({
          stage: 'closed_won',
          stage_updated_at: new Date().toISOString(),
          notes: `تم تحرير عقد بيع رسمي بالمنظومة المالية رقم: ${contractNumber}`
        })
        .eq('id', leadId);
    } catch (e) {
      console.warn('Could not update lead stage in Supabase:', e);
    }
  }

  /**
   * Register a brand new Lead from the contract modal directly into Supabase
   */
  static async registerLeadFromContract(
    supabase: SupabaseClient, 
    leadPayload: { name: string; phone: string; email?: string; property_id?: string; contractNumber: string }
  ): Promise<string> {
    const leadId = generateUUID();
    try {
      await supabase
        .from('leads')
        .insert({
          id: leadId,
          name: leadPayload.name,
          phone: leadPayload.phone,
          email: leadPayload.email || null,
          property_id: (leadPayload.property_id && isUUID(leadPayload.property_id)) ? leadPayload.property_id : null,
          stage: 'closed_won',
          stage_updated_at: new Date().toISOString(),
          source: 'fin_os_contract',
          notes: `تم تسجيل العميل وتوقيع العقد مباشرة (عقد رقم: ${leadPayload.contractNumber})`
        });
    } catch (e) {
      console.warn('Could not insert new lead into Supabase:', e);
    }
    return leadId;
  }

  /**
   * Persist a Double-Entry Journal Entry and its Lines.
   */
  static async persistJournalEntry(
    supabase: SupabaseClient,
    entry: ERPJournalEntry,
    strict = false
  ): Promise<void> {
    try {
      const entryId = ensureUUID(entry.entry_id);
      entry.entry_id = entryId;

      const sourceEntityId = entry.source_entity_id && isUUID(entry.source_entity_id) 
        ? entry.source_entity_id 
        : null;

      // Determine created_by value that satisfies both UUID and VARCHAR columns
      let createdByVal: string | null = (entry.created_by && isUUID(entry.created_by)) ? entry.created_by : null;
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id && isUUID(authData.user.id)) {
          createdByVal = authData.user.id;
        } else if (entry.created_by) {
          // If not UUID, will try entry.created_by first; if DB rejects as non-UUID, retry with null below
          createdByVal = entry.created_by;
        }
      } catch {
        if (entry.created_by) createdByVal = entry.created_by;
      }

      let { error: entryError } = await supabase.from('erp_journal_entries').insert({
        entry_id: entryId,
        entry_number: entry.entry_number,
        entry_date: entry.entry_date,
        period_id: entry.period_id,
        description: entry.description,
        source_module: entry.source_module,
        source_entity_id: sourceEntityId,
        created_by: createdByVal
      });

      // If 22P02 (invalid input syntax for type uuid) due to 'SYSTEM' or other non-UUID string:
      if (entryError && (entryError.code === '22P02' || entryError.message?.includes('uuid') || entryError.message?.includes('created_by'))) {
        const retryRes = await supabase.from('erp_journal_entries').insert({
          entry_id: entryId,
          entry_number: entry.entry_number,
          entry_date: entry.entry_date,
          period_id: entry.period_id,
          description: entry.description,
          source_module: entry.source_module,
          source_entity_id: sourceEntityId,
          created_by: null
        });
        entryError = retryRes.error;
      }

      // If duplicate key violation (23505) on entry_number, automatically retry with unique collision-free suffix
      if (entryError && (entryError.code === '23505' || entryError.message?.includes('unique') || entryError.message?.includes('entry_number'))) {
        const suffix = `-${Date.now().toString(36).toUpperCase().slice(-4)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
        const collisionFreeNum = `${entry.entry_number.slice(0, 40)}${suffix}`;
        entry.entry_number = collisionFreeNum;
        const retryRes = await supabase.from('erp_journal_entries').insert({
          entry_id: entryId,
          entry_number: collisionFreeNum,
          entry_date: entry.entry_date,
          period_id: entry.period_id,
          description: entry.description,
          source_module: entry.source_module,
          source_entity_id: sourceEntityId,
          created_by: createdByVal
        });
        entryError = retryRes.error;
      }

      if (entryError) {
        if (!strict && this.isSchemaCacheError(entryError)) return;
        throw entryError;
      }

      const lineRows = entry.lines.map((l, idx) => {
        const lineId = ensureUUID(l.line_id);
        l.line_id = lineId;
        l.entry_id = entryId;
        return {
          line_id: lineId,
          entry_id: entryId,
          line_number: l.line_number || idx + 1,
          account_code: l.account_code,
          debit_amount: l.debit_amount,
          credit_amount: l.credit_amount,
          unit_id: l.unit_id ? l.unit_id.slice(0, 50) : null,
          contract_id: l.contract_id && isUUID(l.contract_id) ? l.contract_id : null,
          partner_id: l.partner_id && isUUID(l.partner_id) ? l.partner_id : null,
          memo: l.memo || null
        };
      });

      let { error: lineError } = await supabase.from('erp_journal_lines').insert(lineRows);
      if (lineError && (lineError.code === '23503' || lineError.message?.includes('foreign key') || lineError.message?.includes('erp_accounts') || lineError.message?.includes('account_code'))) {
        try {
          // Self-heal: ensure all referenced accounts in lines exist in erp_accounts
          for (const l of entry.lines) {
            const acc = CANONICAL_COA[l.account_code];
            if (acc) {
              await supabase.from('erp_accounts').upsert({
                account_code: acc.account_code,
                account_name_en: acc.account_name_en,
                account_name_ar: acc.account_name_ar,
                account_type: acc.account_type,
                normal_balance: acc.normal_balance,
                is_active: acc.is_active,
                notes: acc.notes
              }, { onConflict: 'account_code' });
            }
          }
          const retryRes = await supabase.from('erp_journal_lines').insert(lineRows);
          lineError = retryRes.error;
        } catch {
          // Allow original error handling if upsert fails
        }
      }
      if (lineError) {
        if (!strict && this.isSchemaCacheError(lineError)) return;
        throw lineError;
      }
    } catch (err) {
      if (!strict && this.isSchemaCacheError(err)) return;
      throw err;
    }
  }

  /**
   * Record a Payment against an Installment Schedule & Update Contract.
   */
  static async persistTranchePayment(
    supabase: SupabaseClient,
    contractId: string,
    scheduleId: string,
    paymentAmount: string,
    journalEntry: ERPJournalEntry
  ): Promise<void> {
    // 0. Parameter order safety: verify whether contractId and scheduleId were swapped
    let actualContractId = contractId;
    let actualScheduleId = scheduleId;

    const { data: directSch } = await supabase
      .from('erp_installment_schedules')
      .select('schedule_id, contract_id')
      .eq('schedule_id', scheduleId)
      .maybeSingle();

    if (!directSch) {
      const { data: swappedSch } = await supabase
        .from('erp_installment_schedules')
        .select('schedule_id, contract_id')
        .eq('schedule_id', contractId)
        .maybeSingle();
      if (swappedSch) {
        actualScheduleId = contractId;
        actualContractId = scheduleId;
      }
    }

    // 1. Update Schedule
    const { error: schError } = await supabase
      .from('erp_installment_schedules')
      .update({
        status: 'Paid',
        amount_paid: paymentAmount,
        paid_date: new Date().toISOString().split('T')[0]
      })
      .eq('schedule_id', actualScheduleId);

    if (schError) throw schError;

    // 2. Increment Contract Total Cash Collected
    const { data: contract } = await supabase
      .from('erp_contracts')
      .select('total_cash_collected')
      .eq('contract_id', actualContractId)
      .single();

    if (contract) {
      const updatedTotal = D(contract.total_cash_collected || 0).plus(paymentAmount).toFixed();
      await supabase
        .from('erp_contracts')
        .update({ total_cash_collected: updatedTotal })
        .eq('contract_id', actualContractId);
    }

    // 3. Mark matching PDC as Cleared if exists
    try {
      await supabase
        .from('erp_pdc_records')
        .update({
          status: 'Cleared',
          cleared_date: new Date().toISOString().split('T')[0]
        })
        .eq('schedule_id', actualScheduleId);
    } catch {
      // Ignore if no direct PDC link
    }

    // 4. Insert Journal Entry
    await this.persistJournalEntry(supabase, journalEntry);
  }

  /**
   * Persist Cost Escalation Amendment & Append-Only Schedules.
   */
  static async persistEscalation(
    supabase: SupabaseClient,
    contractId: string,
    amendment: ERPContractAmendment,
    updatedContractValue: string,
    supersededScheduleIds: string[],
    newSchedules: ERPInstallmentSchedule[]
  ): Promise<void> {
    const cleanContractId = ensureUUID(contractId);
    const cleanAmendmentId = ensureUUID(amendment.amendment_id);
    amendment.amendment_id = cleanAmendmentId;
    amendment.contract_id = cleanContractId;

    // 1. Mark old schedules as SUPERSEDED
    if (supersededScheduleIds.length > 0) {
      const { error: supError } = await supabase
        .from('erp_installment_schedules')
        .update({ status: 'SUPERSEDED' })
        .in('schedule_id', supersededScheduleIds);

      if (supError) throw supError;

      // Void uncollected safe PDCs corresponding to superseded tranches
      try {
        await supabase
          .from('erp_pdc_records')
          .update({ status: 'Void' })
          .eq('contract_id', cleanContractId)
          .eq('status', 'In Safe');
      } catch (pdcVoidErr) {
        console.warn('Notice while voiding safe PDCs during escalation:', pdcVoidErr);
      }
    }

    // 2. Insert Amendment Record
    const { error: amdError } = await supabase
      .from('erp_contract_amendments')
      .insert({
        amendment_id: cleanAmendmentId,
        contract_id: cleanContractId,
        delta_v: amendment.delta_v,
        reason: amendment.reason,
        effective_date: amendment.effective_date,
        new_version: amendment.new_version,
        approved_by: amendment.approved_by && isUUID(amendment.approved_by) ? amendment.approved_by : null
      });

    if (amdError) throw amdError;

    // 3. Insert new schedule rows (Version N+1)
    const newRows = newSchedules.map(s => {
      const schedId = ensureUUID(s.schedule_id);
      s.schedule_id = schedId;
      s.contract_id = cleanContractId;
      return {
        schedule_id: schedId,
        contract_id: cleanContractId,
        tranche_number: s.tranche_number,
        nominal_value: s.nominal_value,
        due_date: s.due_date,
        status: s.status,
        schedule_version: s.schedule_version,
        amendment_id: cleanAmendmentId,
        supersedes_schedule_id: s.supersedes_schedule_id && isUUID(s.supersedes_schedule_id) ? s.supersedes_schedule_id : null,
        amount_paid: s.amount_paid
      };
    });

    const { error: insertError } = await supabase
      .from('erp_installment_schedules')
      .insert(newRows);

    if (insertError) throw insertError;

    // 3b. Replacement PDCs generation removed per user-confirmed zero-cheque architecture

    // 4. Update Contract Gross Value
    const { error: contractError } = await supabase
      .from('erp_contracts')
      .update({ gross_contract_value: updatedContractValue })
      .eq('contract_id', cleanContractId);

    if (contractError) throw contractError;
  }

  /**
   * Append a Contract Supplement / Extra Tranche (إضافة ملحق أو دفعة إضافية للعقد).
   * - Increments contract gross_contract_value with D()
   * - Inserts new installment schedule tranche (Pending)
   */
  static async addContractSupplement(
    supabase: SupabaseClient,
    params: {
      contractId: string;
      newGrossValue: string;
      newSchedule: ERPInstallmentSchedule;
      newPdc?: ERPPDCRecord;
    }
  ): Promise<void> {
    const cleanContractId = ensureUUID(params.contractId);
    params.newSchedule.schedule_id = ensureUUID(params.newSchedule.schedule_id);
    params.newSchedule.contract_id = cleanContractId;

    // 1. Update contract gross value
    const { error: contractErr } = await supabase
      .from('erp_contracts')
      .update({ gross_contract_value: params.newGrossValue })
      .eq('contract_id', cleanContractId);
    if (contractErr) {
      console.warn('Supabase contract update notice:', contractErr.message);
    }

    // 2. Insert new schedule tranche
    const { error: schErr } = await supabase
      .from('erp_installment_schedules')
      .insert([{
        schedule_id: params.newSchedule.schedule_id,
        contract_id: params.newSchedule.contract_id,
        tranche_number: params.newSchedule.tranche_number,
        nominal_value: params.newSchedule.nominal_value,
        amount_paid: params.newSchedule.amount_paid || '0.00',
        due_date: params.newSchedule.due_date,
        status: params.newSchedule.status,
        schedule_version: params.newSchedule.schedule_version || 1
      }]);
    if (schErr) {
      console.warn('Supabase schedule insert notice:', schErr.message);
    }
  }

  /**
   * Persist Contract Rescission, Void Schedules, and Journal Entry.
   */
  static async persistRescission(
    supabase: SupabaseClient,
    contractId: string,
    rescissionRecord: ERPRescissionRecord,
    journalEntry: ERPJournalEntry,
    voidScheduleIds: string[]
  ): Promise<void> {
    const cleanContractId = ensureUUID(contractId);
    const rescissionId = ensureUUID(rescissionRecord.rescission_id);
    rescissionRecord.rescission_id = rescissionId;
    rescissionRecord.contract_id = cleanContractId;

    // 1. Insert Rescission Record
    const { error: rescError } = await supabase
      .from('erp_rescissions')
      .insert({
        rescission_id: rescissionId,
        contract_id: cleanContractId,
        branch: rescissionRecord.branch,
        gross_contract_value: rescissionRecord.gross_contract_value,
        total_cash_collected: rescissionRecord.total_cash_collected,
        penalty_uncapped: rescissionRecord.penalty_uncapped,
        penalty_retained: rescissionRecord.penalty_retained,
        net_refund_liability: rescissionRecord.net_refund_liability,
        unpaid_ar_cleared: rescissionRecord.unpaid_ar_cleared,
        wip_cost_restored: rescissionRecord.wip_cost_restored,
        unit_state: rescissionRecord.unit_state
      });

    if (rescError) throw rescError;

    // 2. Mark Contract as Rescinded
    const { error: contractError } = await supabase
      .from('erp_contracts')
      .update({ status: 'Rescinded' })
      .eq('contract_id', cleanContractId);

    if (contractError) throw contractError;

    // 3. Mark all schedule lineage rows (Pending and SUPERSEDED) as Void
    if (voidScheduleIds.length > 0) {
      await supabase
        .from('erp_installment_schedules')
        .update({ status: 'Void' })
        .in('schedule_id', voidScheduleIds);
    }
    try {
      await supabase
        .from('erp_installment_schedules')
        .update({ status: 'Void' })
        .eq('contract_id', cleanContractId)
        .in('status', ['Pending', 'SUPERSEDED']);
    } catch (schErr) {
      console.warn('Notice while voiding schedule lineage for rescinded contract:', schErr);
    }

    // 3b. Void matching uncollected erp_pdc_records (status = 'Void')
    try {
      await supabase
        .from('erp_pdc_records')
        .update({ status: 'Void' })
        .eq('contract_id', cleanContractId)
        .in('status', ['In Safe', 'Deposited']);
    } catch (pdcErr) {
      console.warn('Notice while voiding uncollected PDCs for rescinded contract:', pdcErr);
    }

    // 4. Insert Journal Entry
    await this.persistJournalEntry(supabase, journalEntry);

    // 5. Restore property listing status to active and update building_units.status to available
    try {
      const { data: rescindedContract } = await supabase
        .from('erp_contracts')
        .select('property_id, building_unit_id, lead_id, contract_number')
        .eq('contract_id', cleanContractId)
        .single();

      if (rescindedContract?.property_id && isUUID(rescindedContract.property_id)) {
        await supabase
          .from('properties')
          .update({ listing_status: 'active' })
          .eq('id', rescindedContract.property_id);

        if (rescindedContract.building_unit_id) {
          await this.updateBuildingUnitStatus(
            supabase,
            rescindedContract.property_id,
            rescindedContract.building_unit_id,
            'available'
          );
        }
      }

      // If contract has lead_id, update CRM Lead stage to 'closed_lost'
      if (rescindedContract?.lead_id && isUUID(rescindedContract.lead_id)) {
        try {
          await supabase
            .from('leads')
            .update({
              stage: 'closed_lost',
              stage_updated_at: new Date().toISOString(),
              notes: `تم فسخ العقد بالمنظومة المالية رقم: ${rescindedContract.contract_number || cleanContractId}`
            })
            .eq('id', rescindedContract.lead_id);
        } catch (leadErr) {
          console.warn('Notice while updating CRM lead stage to closed_lost on rescission:', leadErr);
        }
      }
    } catch (e) {
      console.warn('Could not restore property listing_status or unit status to active/available:', e);
    }
  }

  /**
   * Toggle Fiscal Period Lock Status.
   * Handles both UUID and VARCHAR period_id and gracefully handles un-migrated databases.
   */
  static async persistPeriodStatus(
    supabase: SupabaseClient,
    periodId: string,
    status: 'OPEN' | 'LOCKED' | 'CLOSED',
    actor: string
  ): Promise<void> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(periodId);
    const isActorUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actor);

    const updateData: Record<string, unknown> = { status };
    if (status === 'LOCKED' || status === 'CLOSED') {
      updateData.locked_at = new Date().toISOString();
      if (isActorUuid) {
        updateData.locked_by = actor;
      }
    } else {
      updateData.locked_at = null;
      updateData.locked_by = null;
    }

    try {
      if (isUuid) {
        const { error } = await supabase
          .from('erp_accounting_periods')
          .update(updateData)
          .eq('period_id', periodId);

        if (error && !this.isSchemaCacheError(error) && error.code !== '42501') {
          throw error;
        }
      } else {
        // Friendly ID (e.g. 'prd-2026-03')
        const { error: directError } = await supabase
          .from('erp_accounting_periods')
          .update(updateData)
          .eq('period_id', periodId);

        if (directError) {
          // If 22P02 (invalid input syntax for type uuid), table column is still UUID
          if (directError.code === '22P02' || directError.message?.includes('uuid')) {
            const parts = periodId.split('-');
            const year = parseInt(parts[1], 10);
            const month = parseInt(parts[2], 10);
            if (!isNaN(year) && !isNaN(month)) {
              // Update by composite unique key (fiscal_year, period_number)
              await supabase
                .from('erp_accounting_periods')
                .update(updateData)
                .eq('fiscal_year', year)
                .eq('period_number', month);
            }
          } else if (this.isSchemaCacheError(directError) || directError.code === '42501') {
            console.warn('Supabase permission or schema pending for erp_accounting_periods. Updated in memory.');
          } else {
            throw directError;
          }
        }
      }
    } catch (err: unknown) {
      if (this.isSchemaCacheError(err)) return;
      console.warn('Handled period lock update error:', err);
    }
  }

  /**
   * Ensure that accounting periods exist for the given calendar date.
   * When no period covers the date, inserts all 12 calendar-month periods of that fiscal year
   * (status OPEN, period_id `prd-YYYY-MM`, same shape as existing rows; on conflict do nothing),
   * and returns the period.
   */
  static async ensurePeriodsForDate(
    supabase: SupabaseClient,
    date: string | Date
  ): Promise<ERPAccountingPeriod> {
    const dateStr = typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10) || new Date().getFullYear();
    const month = parseInt(parts[1], 10) || 1;

    // 1. Check if period exists for this date in Supabase
    try {
      const { data: existing, error } = await supabase
        .from('erp_accounting_periods')
        .select('*')
        .lte('start_date', dateStr)
        .gte('end_date', dateStr)
        .order('period_number', { ascending: true })
        .limit(1);

      if (!error && existing && existing.length > 0) {
        const p = existing[0];
        return {
          period_id: String(p.period_id),
          fiscal_year: Number(p.fiscal_year),
          period_number: Number(p.period_number),
          start_date: String(p.start_date),
          end_date: String(p.end_date),
          status: p.status as 'OPEN' | 'LOCKED' | 'CLOSED',
          locked_at: p.locked_at ? String(p.locked_at) : undefined,
          locked_by: p.locked_by ? String(p.locked_by) : undefined
        };
      }
    } catch (e) {
      // Schema error or network issue; proceed to create/upsert
    }

    // 2. Generate all 12 calendar-month periods of that fiscal year
    const periodsToInsert: ERPAccountingPeriod[] = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const mPad = String(m).padStart(2, '0');
      const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
      return {
        period_id: `prd-${year}-${mPad}`,
        fiscal_year: year,
        period_number: m,
        start_date: `${year}-${mPad}-01`,
        end_date: `${year}-${mPad}-${String(lastDay).padStart(2, '0')}`,
        status: 'OPEN' as const
      };
    });

    try {
      const { error: upsertErr } = await supabase
        .from('erp_accounting_periods')
        .upsert(periodsToInsert, { onConflict: 'period_id', ignoreDuplicates: true });

      if (upsertErr && (upsertErr.code === '23505' || upsertErr.message?.includes('conflict') || upsertErr.message?.includes('duplicate'))) {
        await supabase
          .from('erp_accounting_periods')
          .upsert(periodsToInsert, { onConflict: 'fiscal_year,period_number', ignoreDuplicates: true });
      }
    } catch (insertErr) {
      console.warn('Could not insert auto-generated fiscal periods into Supabase:', insertErr);
    }

    const matchedPeriod = periodsToInsert.find(p => p.start_date <= dateStr && dateStr <= p.end_date)
      || periodsToInsert[month - 1]
      || periodsToInsert[0];

    return matchedPeriod;
  }

  /**
   * Post all unposted journal entries for a given fiscal period.
   * Sets is_locked = true for all entries belonging to the period, preserving the period's OPEN status.
   */
  static async postPeriodJournalEntries(
    supabase: SupabaseClient,
    periodId: string
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('erp_journal_entries')
        .update({ is_locked: true })
        .eq('period_id', periodId)
        .eq('is_locked', false)
        .select('entry_id');

      if (error) {
        if (this.isSchemaCacheError(error) || error.code === '42501') {
          console.warn('Supabase permission or schema pending for erp_journal_entries update.');
          return 0;
        }
        throw error;
      }
      return data?.length || 0;
    } catch (err: unknown) {
      if (this.isSchemaCacheError(err)) return 0;
      console.warn('Error posting period journal entries:', err);
      throw err;
    }
  }

  /**
   * Update PDC Cheque Status.
   */
  static async persistPDCStatus(
    supabase: SupabaseClient,
    chequeId: string,
    status: ERPPDCRecord['status']
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status };
    if (status === 'Deposited') {
      updateData.deposited_date = new Date().toISOString().split('T')[0];
    } else if (status === 'Cleared') {
      updateData.cleared_date = new Date().toISOString().split('T')[0];
    }

    const { error } = await supabase
      .from('erp_pdc_records')
      .update(updateData)
      .eq('cheque_id', chequeId);

    if (error) throw error;
  }

  /**
   * Approve Maker-Checker Request.
   */
  static async persistMakerCheckerApproval(
    supabase: SupabaseClient,
    requestId: string,
    approverRole: string
  ): Promise<void> {
    const { error } = await supabase
      .from('erp_maker_checker')
      .update({
        status: 'Approved',
        primary_approver: approverRole
      })
      .eq('request_id', requestId);

    if (error) throw error;
  }

  /**
   * Update Contract Handover Status (Pending <-> Delivered).
   */
  static async updateContractHandoverStatus(
    supabase: SupabaseClient,
    contractId: string,
    newStatus: 'Pending' | 'Delivered',
    handoverDate?: string
  ): Promise<void> {
    const cleanId = contractId ? contractId.trim() : '';
    const { error } = await supabase
      .from('erp_contracts')
      .update({
        handover_status: newStatus,
        handover_date: newStatus === 'Delivered' ? (handoverDate || new Date().toISOString().split('T')[0]) : null
      })
      .eq('contract_id', cleanId);

    if (error) throw error;
  }

  /**
   * Add a new Property Lifecycle Material/Cost Item (بند تكلفة جديد).
   */
  static async addPropertyCostItem(
    supabase: SupabaseClient,
    item: ERPPropertyCostItem,
    strict = false
  ): Promise<void> {
    try {
      const payload: Record<string, unknown> = {
        item_id: ensureUUID(item.item_id),
        property_id: item.property_id,
        building_unit_id: item.building_unit_id || null,
        unit_number: item.unit_number || null,
        category: item.category,
        phase: item.phase,
        item_name_ar: item.item_name_ar,
        item_name_en: item.item_name_en,
        supplier_contractor: item.supplier_contractor || null,
        invoice_ref: item.invoice_ref || null,
        quantity: item.quantity,
        unit: item.unit || 'مقطوعية',
        unit_cost_egp: item.unit_cost_egp,
        total_cost_egp: item.total_cost_egp,
        logged_date: item.logged_date,
        logged_by: item.logged_by || 'SYSTEM',
        linked_account_code: item.linked_account_code || '151000',
        status: item.status || 'verified',
        notes: item.notes || null,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || null,
        payment_term: item.payment_term || 'FULL_CASH',
        paid_amount_egp: item.paid_amount_egp || item.total_cost_egp,
        remaining_amount_egp: item.remaining_amount_egp || '0.00',
        due_date: item.due_date || null,
        payable_installments: item.payable_installments || null,
        adjustments: item.adjustments || null,
        net_effective_cost_egp: item.net_effective_cost_egp || item.total_cost_egp
      };

      const { error } = await supabase.from('erp_property_costs').insert([payload]);
      if (error) {
        if (!strict && this.isSchemaCacheError(error)) return;
        throw error;
      }
    } catch (err) {
      if (!strict && this.isSchemaCacheError(err)) return;
      throw err;
    }
  }

  /**
   * Persist the expense and journal with compensating cleanup if either write fails.
   * Separate Supabase HTTP writes are not a database transaction.
   */
  static async persistExpenseWithCostItem(
    supabase: SupabaseClient,
    entry: ERPJournalEntry,
    costItem?: ERPPropertyCostItem
  ): Promise<void> {
    if (!costItem) {
      // Non-expense transactions (e.g. partner funding or loan) write journal only
      await this.persistJournalEntry(supabase, entry);
      return;
    }

    costItem.item_id = ensureUUID(costItem.item_id);
    if (!costItem.property_id || !isUUID(costItem.property_id)) {
      throw new Error('A valid property UUID is required to allocate site expense to erp_property_costs.');
    }

    let costCreated = false;

    try {
      // 1. Write to erp_property_costs
      await this.addPropertyCostItem(supabase, costItem, true);
      costCreated = true;

      // 2. Write to general ledger journal
      await this.persistJournalEntry(supabase, entry, true);
    } catch (err) {
      if (costCreated) {
        // A journal header may exist even when inserting its lines failed.
        const { error: linesError } = await supabase.from('erp_journal_lines').delete().eq('entry_id', entry.entry_id);
        const { error: entryError } = await supabase.from('erp_journal_entries').delete().eq('entry_id', entry.entry_id);
        const { error: costError } = await supabase.from('erp_property_costs').delete().eq('item_id', costItem.item_id);
        if (linesError || entryError || costError) {
          throw new AggregateError(
            [err, linesError, entryError, costError].filter(Boolean),
            'Expense posting failed and rollback was incomplete; inspect the cost and journal before retrying.'
          );
        }
      }
      throw err;
    }
  }

  /**
   * Update an existing Property Cost Item (within the 24-hour grace period).
   */
  static async updatePropertyCostItem(
    supabase: SupabaseClient,
    item: ERPPropertyCostItem
  ): Promise<void> {
    try {
      const payload: Record<string, unknown> = {
        category: item.category,
        phase: item.phase,
        item_name_ar: item.item_name_ar,
        item_name_en: item.item_name_en,
        supplier_contractor: item.supplier_contractor || null,
        invoice_ref: item.invoice_ref || null,
        quantity: item.quantity,
        unit: item.unit,
        unit_cost_egp: item.unit_cost_egp,
        total_cost_egp: item.total_cost_egp,
        notes: item.notes || null,
        updated_at: new Date().toISOString(),
        payment_term: item.payment_term,
        paid_amount_egp: item.paid_amount_egp,
        remaining_amount_egp: item.remaining_amount_egp,
        due_date: item.due_date || null,
        payable_installments: item.payable_installments || null,
        adjustments: item.adjustments || null,
        net_effective_cost_egp: item.net_effective_cost_egp || item.total_cost_egp
      };

      const { error } = await supabase.from('erp_property_costs').update(payload).eq('item_id', item.item_id);
      if (error) {
        throw new Error(`Failed to update property cost item ${item.item_id}: ${error.message} (${error.code || 'UNKNOWN'})`);
      }
    } catch (err) {
      console.error('Critical failure on erp_property_costs update:', err);
      throw err;
    }
  }

  /**
   * Add a sub-item adjustment to a locked or past-grace cost item.
   */
  static async addPropertyCostAdjustment(
    supabase: SupabaseClient,
    updatedItem: ERPPropertyCostItem
  ): Promise<void> {
    try {
      const { error } = await supabase.from('erp_property_costs').update({
        adjustments: updatedItem.adjustments || null,
        net_effective_cost_egp: updatedItem.net_effective_cost_egp || updatedItem.total_cost_egp,
        paid_amount_egp: updatedItem.paid_amount_egp,
        remaining_amount_egp: updatedItem.remaining_amount_egp,
        updated_at: new Date().toISOString()
      }).eq('item_id', updatedItem.item_id);

      if (error) {
        throw new Error(`Failed to persist cost adjustment for item ${updatedItem.item_id}: ${error.message} (${error.code || 'UNKNOWN'})`);
      }
    } catch (err) {
      console.error('Critical failure on erp_property_costs adjustment update:', err);
      throw err;
    }
  }

  /**
   * Record payment on a payable installment for a cost item.
   */
  static async createConstructionPurchaseOrder(supabase: SupabaseClient, order: ERPConstructionPurchaseOrder): Promise<void> {
    if (!order.supplier_name.trim() || !order.description.trim() || !D(order.amount_egp).gt(0)) throw new Error('Supplier, description and positive amount are required.');
    const { error } = await supabase.from('erp_construction_purchase_orders').insert(order);
    if (error) throw new Error(`Failed to save purchase order: ${error.message}`);
  }

  static async recordCostPayablePayment(supabase: SupabaseClient, updatedItem: ERPPropertyCostItem, originalItem: ERPPropertyCostItem, period: ERPAccountingPeriod): Promise<{ item: ERPPropertyCostItem; journal: ERPJournalEntry }> {
    const settlement = prepareConstructionSettlement(originalItem, updatedItem, period);
    const { data, error } = await supabase.rpc('settle_construction_payable', settlement.request);
    if (error) throw new Error(`Failed to post contractor settlement: ${error.message}`);
    if (!data?.item || !data?.journal) throw new Error('Settlement returned no persisted cost or journal.');
    return { item: data.item as ERPPropertyCostItem, journal: data.journal as ERPJournalEntry };
  }

  /**
   * Delete a Property Lifecycle Cost Item.
   */
  static async deletePropertyCostItem(
    supabase: SupabaseClient,
    itemId: string
  ): Promise<void> {
    try {
      const { error } = await supabase.from('erp_property_costs').delete().eq('item_id', itemId);
      if (error) {
        throw new Error(`Failed to delete property cost item ${itemId}: ${error.message} (${error.code || 'UNKNOWN'})`);
      }
    } catch (err) {
      console.error('Critical failure on erp_property_costs delete:', err);
      throw err;
    }
  }

  /**
   * Update Property Catalog Selling Price (from Calculator).
   */
  static async updatePropertySellingPrice(
    supabase: SupabaseClient,
    propertyId: string,
    newPriceEgp: number
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ price_egp: newPriceEgp })
        .eq('id', propertyId);
      if (error) throw error;
    } catch (err) {
      console.warn('Silent fallback on property price_egp update:', err);
    }
  }

  /**
   * Update partnership splits, ownership history, or target budget on a building property.
   */
  static async updatePropertyPartnership(
    supabase: SupabaseClient,
    propertyId: string,
    updates: {
      partner_splits?: any[];
      ownership_history?: any[];
      target_budget_egp?: number;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', propertyId);
      if (error) throw error;
    } catch (err) {
      console.warn('Silent fallback on updatePropertyPartnership:', err);
    }
  }

  /**
   * Update the status of a specific building unit (apartment) inside a building property.
   */
  static async updateBuildingUnitStatus(
    supabase: SupabaseClient,
    propertyId: string,
    unitId: string,
    newStatus: 'available' | 'reserved' | 'contracted',
    contractId?: string,
    contractNumber?: string,
    buyerName?: string
  ): Promise<void> {
    try {
      const { data: prop } = await supabase.from('properties').select('building_units').eq('id', propertyId).single();
      if (prop && Array.isArray(prop.building_units)) {
        const updatedUnits = prop.building_units.map((u: any) => {
          if (u.unit_id === unitId) {
            return {
              ...u,
              status: newStatus,
              contract_id: contractId,
              contract_number: contractNumber,
              buyer_name: buyerName
            };
          }
          return u;
        });
        await supabase.from('properties').update({ building_units: updatedUnits }).eq('id', propertyId);
      }
    } catch (err) {
      console.warn('Silent fallback on updateBuildingUnitStatus:', err);
    }
  }

  /**
   * Update manual tax and pricing of a specific apartment inside a building property.
   */
  static async updateBuildingUnitTax(
    supabase: SupabaseClient,
    propertyId: string,
    unitId: string,
    taxAmountEgp: number,
    taxDescription?: string
  ): Promise<void> {
    try {
      const { data: prop } = await supabase.from('properties').select('building_units').eq('id', propertyId).single();
      if (prop && Array.isArray(prop.building_units)) {
        const updatedUnits = prop.building_units.map((u: any) => {
          if (u.unit_id === unitId) {
            return {
              ...u,
              tax_amount_egp: taxAmountEgp,
              tax_description: taxDescription
            };
          }
          return u;
        });
        await supabase.from('properties').update({ building_units: updatedUnits }).eq('id', propertyId);
      }
    } catch (err) {
      console.warn('Silent fallback on updateBuildingUnitTax:', err);
    }
  }

  /**
   * Persist a partner transaction (Capital Injection, Profit Distribution, Capital Return)
   */
  static async persistPartnerTransaction(
    supabase: SupabaseClient,
    tx: ERPPartnerTransaction | {
      transaction_id?: string;
      id?: string;
      partner_name: string;
      property_id?: string;
      property_title?: string;
      commitment_id?: string;
      type: string;
      amount: string | number;
      date: string;
      routing_account?: string;
      payment_method?: string;
      journal_entry_id?: string;
      notes?: string;
      memo?: string;
    }
  ): Promise<void> {
    const rawId = (tx as any).transaction_id || tx.id || generateUUID();
    const cleanId = ensureUUID(rawId);
    const routingAccount = (tx as any).routing_account || 
      (tx.payment_method === 'BANK_102000' || tx.payment_method === 'BANK' ? '102000' : '101000');
    const propertyId = tx.property_id && isUUID(tx.property_id) ? tx.property_id : null;
    const commitmentId = tx.commitment_id && isUUID(tx.commitment_id) ? tx.commitment_id : null;
    const journalEntryId = (tx as any).journal_entry_id && isUUID((tx as any).journal_entry_id) 
      ? (tx as any).journal_entry_id 
      : null;

    const row = {
      transaction_id: cleanId,
      partner_name: tx.partner_name,
      property_id: propertyId,
      property_title: tx.property_title || null,
      commitment_id: commitmentId,
      type: tx.type,
      amount: D(tx.amount).toFixed(2),
      date: tx.date,
      routing_account: routingAccount,
      journal_entry_id: journalEntryId,
      notes: (tx as any).notes || (tx as any).memo || null
    };

    const { error } = await supabase.from('erp_partner_transactions').insert(row);
    if (error) {
      if (this.isSchemaCacheError(error)) {
        console.warn('erp_partner_transactions table not yet in schema cache. Kept in memory.');
        return;
      }
      throw error;
    }

    // If linked to a milestone commitment, reconcile paid amount
    if (commitmentId && tx.type === 'CAPITAL_INJECTION') {
      try {
        const { data: commitData } = await supabase
          .from('erp_partner_commitments')
          .select('committed_amount, paid_amount')
          .eq('commitment_id', commitmentId)
          .maybeSingle();

        if (commitData) {
          const newPaid = D(commitData.paid_amount || 0).plus(D(tx.amount || 0));
          const committed = D(commitData.committed_amount || 0);
          const newStatus = newPaid.gte(committed) ? 'PAID' : 'PARTIALLY_PAID';
          await supabase
            .from('erp_partner_commitments')
            .update({
              paid_amount: newPaid.toFixed(2),
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('commitment_id', commitmentId);
        }
      } catch (commitErr) {
        console.warn('Error updating linked partner commitment:', commitErr);
      }
    }
  }

  /**
   * Load partner transactions from Supabase
   */
  static async loadPartnerTransactions(
    supabase: SupabaseClient
  ): Promise<ERPPartnerTransaction[]> {
    if (process.env.NODE_ENV === 'development') {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) return [];
      } catch {
        return [];
      }
    }
    try {
      const { data, error } = await supabase
        .from('erp_partner_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (this.isSchemaCacheError(error)) return [];
        throw error;
      }

      return (data || []).map(row => ({
        id: row.transaction_id as string,
        transaction_number: `PT-${(row.transaction_id as string).slice(0, 8).toUpperCase()}`,
        partner_name: row.partner_name as string,
        type: row.type as any,
        amount: D((row.amount as string | number) || 0).toFixed(2),
        property_id: (row.property_id as string) || undefined,
        property_title: (row.property_title as string) || undefined,
        commitment_id: (row.commitment_id as string) || undefined,
        payment_method: row.routing_account === '101000' 
          ? (String(row.notes || '').toLowerCase().includes('instapay') || String(row.notes || '').includes('إنستاباي') ? 'INSTAPAY_102000' : 'CASH_101000') 
          : 'BANK_102000',
        journal_entry_number: undefined,
        date: row.date as string,
        status: 'COMPLETED' as const,
        memo: (row.notes as string) || ''
      }));
    } catch (e) {
      if (isAuthError(e)) throw e;
      if (this.isSchemaCacheError(e)) return [];
      console.warn('Failed to load partner transactions:', e);
      return [];
    }
  }

  /**
   * Persist a partner milestone commitment in Supabase
   */
  static async persistPartnerCommitment(
    supabase: SupabaseClient,
    commitment: Partial<ERPPartnerCommitment>
  ): Promise<ERPPartnerCommitment> {
    const rawId = commitment.commitment_id;
    const cleanId = rawId && isUUID(rawId) ? rawId : generateUUID();
    const row = {
      commitment_id: cleanId,
      property_id: commitment.property_id,
      partner_name: commitment.partner_name,
      partner_id: commitment.partner_id && isUUID(commitment.partner_id) ? commitment.partner_id : null,
      milestone_name: commitment.milestone_name,
      milestone_phase: commitment.milestone_phase || null,
      committed_amount: D(commitment.committed_amount || 0).toFixed(2),
      paid_amount: D(commitment.paid_amount || 0).toFixed(2),
      due_date: commitment.due_date,
      status: commitment.status || 'PENDING',
      notes: commitment.notes || null,
      created_by: commitment.created_by || 'SYSTEM',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('erp_partner_commitments')
      .upsert(row, { onConflict: 'commitment_id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      commitment_id: data.commitment_id as string,
      property_id: data.property_id as string,
      partner_name: data.partner_name as string,
      partner_id: (data.partner_id as string) || undefined,
      milestone_name: data.milestone_name as string,
      milestone_phase: (data.milestone_phase as string) || undefined,
      committed_amount: D(data.committed_amount as string | number).toFixed(2),
      paid_amount: D(data.paid_amount as string | number).toFixed(2),
      due_date: data.due_date as string,
      status: data.status as PartnerCommitmentStatus,
      notes: (data.notes as string) || undefined,
      created_by: (data.created_by as string) || undefined,
      created_at: (data.created_at as string) || undefined,
      updated_at: (data.updated_at as string) || undefined
    };
  }

  /**
   * Load partner commitments from Supabase
   */
  static async loadPartnerCommitments(
    supabase: SupabaseClient
  ): Promise<ERPPartnerCommitment[]> {
    try {
      const { data, error } = await supabase
        .from('erp_partner_commitments')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) {
        if (this.isSchemaCacheError(error)) return [];
        throw error;
      }

      return (data || []).map(row => ({
        commitment_id: row.commitment_id as string,
        property_id: row.property_id as string,
        partner_name: row.partner_name as string,
        partner_id: (row.partner_id as string) || undefined,
        milestone_name: row.milestone_name as string,
        milestone_phase: (row.milestone_phase as string) || undefined,
        committed_amount: D(row.committed_amount as string | number).toFixed(2),
        paid_amount: D(row.paid_amount as string | number).toFixed(2),
        due_date: row.due_date as string,
        status: row.status as PartnerCommitmentStatus,
        notes: (row.notes as string) || undefined,
        created_by: (row.created_by as string) || undefined,
        created_at: (row.created_at as string) || undefined,
        updated_at: (row.updated_at as string) || undefined
      }));
    } catch (e) {
      if (isAuthError(e)) throw e;
      if (this.isSchemaCacheError(e)) return [];
      console.warn('Failed to load partner commitments:', e);
      return [];
    }
  }

  /**
   * Persist or update a partner profile in Supabase
   */
  static async persistPartnerProfile(
    supabase: SupabaseClient,
    profile: ERPPartnerProfile | {
      id?: string;
      partner_id?: string;
      name: string;
      role?: string;
      phone?: string;
      email?: string;
      national_id?: string;
      notes?: string;
      joined_date?: string;
    }
  ): Promise<void> {
    const rawId = (profile as any).partner_id || profile.id || generateUUID();
    const cleanId = ensureUUID(rawId);
    const row = {
      partner_id: cleanId,
      name: profile.name,
      phone: profile.phone || null,
      email: (profile as any).email || null,
      national_id: profile.national_id || null,
      role: profile.role || 'equity_partner',
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('erp_partner_profiles')
      .upsert(row, { onConflict: 'name' });

    if (error) {
      if (this.isSchemaCacheError(error)) {
        console.warn('erp_partner_profiles table not yet in schema cache. Kept in memory.');
        return;
      }
      throw error;
    }
  }

  /**
   * Load partner profiles from Supabase
   */
  static async loadPartnerProfiles(
    supabase: SupabaseClient
  ): Promise<ERPPartnerProfile[]> {
    if (process.env.NODE_ENV === 'development') {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) return [];
      } catch {
        return [];
      }
    }
    try {
      const { data, error } = await supabase
        .from('erp_partner_profiles')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        if (this.isSchemaCacheError(error)) return [];
        throw error;
      }

      return (data || []).map(row => ({
        id: row.partner_id as string,
        name: row.name as string,
        role: (row.role as any) || 'equity_partner',
        phone: (row.phone as string) || undefined,
        national_id: (row.national_id as string) || undefined,
        joined_date: row.created_at ? new Date(row.created_at as string).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      }));
    } catch (e) {
      if (isAuthError(e)) throw e;
      if (this.isSchemaCacheError(e)) return [];
      console.warn('Failed to load partner profiles:', e);
      return [];
    }
  }

  /**
   * Persist a dated, versioned estimate-to-complete for a unit or property
   */
  static async persistUnitEstimate(
    supabase: SupabaseClient,
    estimate: ERPUnitEstimate
  ): Promise<void> {
    const payload = {
      estimate_id: ensureUUID(estimate.estimate_id),
      property_id: estimate.property_id,
      building_unit_id: estimate.building_unit_id || null,
      unit_number: estimate.unit_number || null,
      as_of_date: estimate.as_of_date || new Date().toISOString().split('T')[0],
      forecast_cost_to_complete: estimate.forecast_cost_to_complete,
      confidence_score: estimate.confidence_score !== undefined ? estimate.confidence_score : null,
      notes: estimate.notes || null,
      created_by: estimate.created_by || 'SYSTEM'
    };

    const { error } = await supabase.from('erp_unit_estimates').insert(payload);
    if (error) {
      if (this.isSchemaCacheError(error)) return;
      throw error;
    }
  }

  /**
   * Fetch dated, versioned estimates-to-complete for a property or all properties
   */
  static async fetchUnitEstimates(
    supabase: SupabaseClient,
    propertyId?: string
  ): Promise<ERPUnitEstimate[]> {
    try {
      let query = supabase.from('erp_unit_estimates').select('*').order('as_of_date', { ascending: false });
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      const { data, error } = await query;
      if (error) {
        if (this.isSchemaCacheError(error)) return [];
        throw error;
      }
      return (data || []).map(u => ({
        estimate_id: u.estimate_id as string,
        property_id: u.property_id as string,
        building_unit_id: (u.building_unit_id as string) || undefined,
        unit_number: (u.unit_number as string) || undefined,
        as_of_date: u.as_of_date as string,
        forecast_cost_to_complete: D((u.forecast_cost_to_complete as string | number) || 0).toFixed(2),
        confidence_score: u.confidence_score !== undefined && u.confidence_score !== null ? Number(u.confidence_score) : undefined,
        notes: (u.notes as string) || undefined,
        created_by: (u.created_by as string) || undefined,
        created_at: (u.created_at as string) || undefined
      }));
    } catch (e) {
      if (isAuthError(e)) throw e;
      if (this.isSchemaCacheError(e)) return [];
      console.warn('Failed to fetch unit estimates:', e);
      return [];
    }
  }

  /**
   * Persist a manual tax record to erp_tax_records.
   * Columns: tax_id, contract_id, tax_type, taxable_base, tax_rate, tax_amount, remittance_status 'Pending', created_at.
   * Cash-basis invariant: Recording a tax creates NO journal entry. Tax hits GL only when remitted.
   */
  static async recordTaxRecord(
    supabase: SupabaseClient,
    payload: {
      contract_id: string;
      tax_type: string;
      taxable_base: string | number;
      tax_rate?: string | number;
      tax_amount: string | number;
      created_at?: string;
      notes?: string;
    }
  ): Promise<ERPTaxRecord> {
    const taxId = generateUUID();
    const createdAt = payload.created_at || new Date().toISOString();
    const baseAmt = D(payload.taxable_base || 0).toFixed(2);
    const taxAmt = D(payload.tax_amount || 0).toFixed(2);
    const rateVal = payload.tax_rate !== undefined && String(payload.tax_rate).trim() !== ''
      ? ratio(payload.tax_rate, 100, 6) // 2.5 -> '0.025000' (D(2.5).div(100) gave 0.03)
      : (D(baseAmt).gt(0) ? ratio(taxAmt, baseAmt, 6) : '0.000000');

    const taxRow: ERPTaxRecord = {
      tax_id: taxId,
      contract_id: payload.contract_id,
      tax_type: payload.tax_type,
      taxable_base: baseAmt,
      tax_rate: rateVal,
      tax_amount: taxAmt,
      remittance_status: 'Pending',
      created_at: createdAt
    };

    const { error } = await supabase.from('erp_tax_records').insert([taxRow]);
    if (error) {
      // Must fail loudly: the caller posts the accrual JE only after the record exists.
      throw new Error(`Tax record insert failed: ${error.message}`);
    }
    return taxRow;
  }
}


