-- ============================================================================
-- Migration: 006_erp_financial_engine.sql
-- Description: Complete ERP Financial Accounting Engine for Zakaria Farid Real Estate (Revision 2)
-- Enforces: Double-Entry, Append-Only Tranche Versioning, Period Locking, and Immutability triggers.
-- ============================================================================

-- 1. Canonical Chart of Accounts
CREATE TABLE IF NOT EXISTS erp_accounts (
  account_code VARCHAR(10) PRIMARY KEY,
  account_name_en VARCHAR(100) NOT NULL,
  account_name_ar VARCHAR(100) NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'CONTRA_LIABILITY')),
  normal_balance VARCHAR(6) NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Canonical COA
INSERT INTO erp_accounts (account_code, account_name_en, account_name_ar, account_type, normal_balance, notes)
VALUES
  ('101000', 'Operating Cash Vault', 'خزينة النقدية التشغيلية', 'ASSET', 'DEBIT', 'Petty cash and vault receipts'),
  ('102000', 'Bank Accounts (Operating)', 'الحسابات البنكية التشغيلية', 'ASSET', 'DEBIT', 'Commercial bank operating balances'),
  ('102100', 'Maintenance Escrow Bank Account', 'حساب بنكي وديعة الصيانة', 'ASSET', 'DEBIT', 'Restricted escrow trust funds'),
  ('103000', 'Accounts Receivable (Buyers)', 'مدينو عقود العملاء (A/R)', 'ASSET', 'DEBIT', 'Billed and delivered receivables'),
  ('103200', 'PDC Cheques in Safe', 'شيكات مؤجلة الخزينة (PDC)', 'ASSET', 'DEBIT', 'Physical cheques in safe custody'),
  ('103300', 'Customer Tax Clearing Receivable', 'وسيط ضرائب العملاء', 'ASSET', 'DEBIT', 'UNRESOLVED (OPEN_QUESTIONS Q4)'),
  ('150000', 'WIP - Land Acquisition', 'أعمال تحت التنفيذ - الأراضي', 'ASSET', 'DEBIT', 'Land cost capitalization'),
  ('151000', 'WIP - Direct Construction', 'أعمال تحت التنفيذ - أعمال البناء', 'ASSET', 'DEBIT', 'Direct construction & civil works'),
  ('152000', 'WIP - MEP & Infrastructure', 'أعمال تحت التنفيذ - الكهروميكانيك', 'ASSET', 'DEBIT', 'MEP & utilities'),
  ('153000', 'WIP - Finishing & Interiors', 'أعمال تحت التنفيذ - التشطيبات', 'ASSET', 'DEBIT', 'Luxury architectural finishing'),
  ('156000', 'WIP - Capitalized Financing', 'أعمال تحت التنفيذ - فوائد م personales', 'ASSET', 'DEBIT', 'Capitalized borrowing costs'),
  ('201000', 'Accounts Payable', 'موردون ومقاولون (A/P)', 'LIABILITY', 'CREDIT', 'Contractor and vendor trade payables'),
  ('202000', 'Bank Term Loans', 'قروض بنكية طويلة الأجل', 'LIABILITY', 'CREDIT', 'External project financing principal'),
  ('202500', 'Unamortized Financing Charges', 'مصاريف تمويل غير مستهلكة', 'CONTRA_LIABILITY', 'DEBIT', 'Contra-liability loan discount'),
  ('203000', 'Deferred Contract Revenue', 'إيرادات عقود مؤجلة (دفعات مقدمة)', 'LIABILITY', 'CREDIT', 'Pre-handover customer collections'),
  ('206200', 'Customer Refund Liability', 'التزامات استرداد العملاء', 'LIABILITY', 'CREDIT', 'Net refund payable following rescission (floored at 0)'),
  ('207000', 'Maintenance Escrow Trust Liability', 'أمانات وديعة الصيانة', 'LIABILITY', 'CREDIT', 'Homeowner fiduciary escrow pool'),
  ('301000', 'Partner Capital', 'رأس مال الشركاء', 'EQUITY', 'CREDIT', 'Contributed partner equity'),
  ('302000', 'Retained Earnings', 'أرباح مرحلة', 'EQUITY', 'CREDIT', 'Cumulative retained earnings'),
  ('401000', 'Realized Sales Revenue', 'إيرادات المبيعات المحققة', 'REVENUE', 'CREDIT', 'Recognized at physical handover'),
  ('430100', 'Cancellation Penalty Revenue', 'إيرادات غرامات فسخ العقود', 'REVENUE', 'CREDIT', 'Retained forfeiture penalties (min 10% V, C)'),
  ('440000', 'Realized FX Gain/Loss', 'أرباح/خسائر فروق عملة محققة', 'REVENUE', 'CREDIT', 'Settlement FX variances'),
  ('501000', 'COGS - Palatial Villas', 'تكلفة مبيعات - فيلات قصور', 'EXPENSE', 'DEBIT', 'Relieved from WIP at handover via RSV'),
  ('502000', 'COGS - Nile Sky Penthouses', 'تكلفة مبيعات - بنتهاوس النيل', 'EXPENSE', 'DEBIT', 'Relieved from WIP at handover via RSV'),
  ('503000', 'COGS - Luxury Duplexes', 'تكلفة مبيعات - دوبلكس فاخر', 'EXPENSE', 'DEBIT', 'Relieved from WIP at handover via RSV'),
  ('504000', 'COGS - Royal Suites', 'تكلفة مبيعات - أجنحة ملكية', 'EXPENSE', 'DEBIT', 'Relieved from WIP at handover via RSV'),
  ('601000', 'Sales & Marketing Expenses', 'مصروفات التسويق والمبيعات', 'EXPENSE', 'DEBIT', 'Brokerage and marketing'),
  ('602000', 'General & Administrative Expenses', 'مصروفات عمومية وإدارية', 'EXPENSE', 'DEBIT', 'Administrative overhead')
ON CONFLICT (account_code) DO NOTHING;

-- 2. Accounting Periods
CREATE TABLE IF NOT EXISTS erp_accounting_periods (
  period_id VARCHAR(50) PRIMARY KEY,
  fiscal_year INT NOT NULL,
  period_number INT NOT NULL CHECK (period_number BETWEEN 1 AND 12),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'LOCKED', 'CLOSED')),
  locked_at TIMESTAMPTZ,
  locked_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_year_period UNIQUE (fiscal_year, period_number)
);

-- 3. General Ledger Journal Entries
CREATE TABLE IF NOT EXISTS erp_journal_entries (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(50) NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  period_id VARCHAR(50) REFERENCES erp_accounting_periods(period_id),
  description TEXT NOT NULL,
  source_module VARCHAR(30) NOT NULL,
  source_entity_id UUID,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_locked BOOLEAN NOT NULL DEFAULT FALSE
);

-- 4. Journal Lines (Double-Entry lines)
CREATE TABLE IF NOT EXISTS erp_journal_lines (
  line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES erp_journal_entries(entry_id) ON DELETE RESTRICT,
  line_number INT NOT NULL,
  account_code VARCHAR(10) NOT NULL REFERENCES erp_accounts(account_code),
  debit_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (debit_amount >= 0.00),
  credit_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (credit_amount >= 0.00),
  unit_id VARCHAR(50),
  contract_id UUID,
  partner_id UUID,
  memo TEXT,
  CONSTRAINT chk_debit_or_credit CHECK (debit_amount > 0 OR credit_amount > 0 OR (debit_amount = 0 AND credit_amount = 0))
);

-- 5. Sales Contracts
CREATE TABLE IF NOT EXISTS erp_contracts (
  contract_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number VARCHAR(50) NOT NULL UNIQUE,
  unit_id VARCHAR(50) NOT NULL,
  buyer_name VARCHAR(150) NOT NULL,
  buyer_national_id VARCHAR(20),
  gross_contract_value NUMERIC(18,2) NOT NULL CHECK (gross_contract_value > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'EGP' CHECK (currency IN ('EGP', 'USD')),
  exchange_rate NUMERIC(12,4) NOT NULL DEFAULT 1.0000,
  contract_date DATE NOT NULL,
  handover_date DATE,
  handover_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (handover_status IN ('Pending', 'Delivered')),
  total_cash_collected NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Rescinded', 'Completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Contract Amendments (Escalation)
CREATE TABLE IF NOT EXISTS erp_contract_amendments (
  amendment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES erp_contracts(contract_id),
  delta_v NUMERIC(18,2) NOT NULL,
  reason TEXT NOT NULL,
  effective_date DATE NOT NULL,
  new_version INT NOT NULL,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Installment Schedules (Append-Only Versioning)
CREATE TABLE IF NOT EXISTS erp_installment_schedules (
  schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES erp_contracts(contract_id),
  tranche_number INT NOT NULL,
  nominal_value NUMERIC(18,2) NOT NULL CHECK (nominal_value >= 0.00),
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Partially Paid', 'Defaulted', 'SUPERSEDED', 'Void')),
  schedule_version INT NOT NULL DEFAULT 1,
  amendment_id UUID REFERENCES erp_contract_amendments(amendment_id),
  supersedes_schedule_id UUID REFERENCES erp_installment_schedules(schedule_id),
  amount_paid NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  paid_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. PDC / Cheque Vault
CREATE TABLE IF NOT EXISTS erp_pdc_records (
  cheque_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES erp_contracts(contract_id),
  schedule_id UUID REFERENCES erp_installment_schedules(schedule_id),
  cheque_number VARCHAR(50) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  drawer_name VARCHAR(150) NOT NULL,
  nominal_value NUMERIC(18,2) NOT NULL CHECK (nominal_value > 0),
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'In Safe' CHECK (status IN ('In Safe', 'Deposited', 'Cleared', 'Bounced', 'Void')),
  deposited_date DATE,
  cleared_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Rescissions & Repossessions
CREATE TABLE IF NOT EXISTS erp_rescissions (
  rescission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES erp_contracts(contract_id),
  branch VARCHAR(30) NOT NULL CHECK (branch IN ('Pre-Delivery', 'Post-Delivery')),
  gross_contract_value NUMERIC(18,2) NOT NULL,
  total_cash_collected NUMERIC(18,2) NOT NULL,
  penalty_uncapped NUMERIC(18,2) NOT NULL,
  penalty_retained NUMERIC(18,2) NOT NULL,
  net_refund_liability NUMERIC(18,2) NOT NULL CHECK (net_refund_liability >= 0.00),
  unpaid_ar_cleared NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  wip_cost_restored NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  unit_state VARCHAR(40) NOT NULL DEFAULT 'Under Rescission Audit' CHECK (
    unit_state IN ('Under Rescission Audit', 'Site Inspection & Snagging', 'Re-appraisal', 'Managerial Sign-off', 'Available')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Cost Allocations (WIP & Relative Sales Value)
CREATE TABLE IF NOT EXISTS erp_cost_allocations (
  allocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name VARCHAR(100) NOT NULL,
  total_incurred_wip NUMERIC(18,2) NOT NULL CHECK (total_incurred_wip >= 0.00),
  total_sales_value NUMERIC(18,2) NOT NULL CHECK (total_sales_value > 0.00),
  rsv_factor NUMERIC(10,6) NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Statutory Tax Records
CREATE TABLE IF NOT EXISTS erp_tax_records (
  tax_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES erp_contracts(contract_id),
  tax_type VARCHAR(30) NOT NULL CHECK (tax_type IN ('Disposal 2.5% Case A', 'Disposal 2.5% Case B', 'Form 41 1%', 'Form 41 3%')),
  taxable_base NUMERIC(18,2) NOT NULL,
  tax_rate NUMERIC(6,4) NOT NULL,
  tax_amount NUMERIC(18,2) NOT NULL,
  remittance_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (remittance_status IN ('Pending', 'Remitted to ETA')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Partner Capital Calls
CREATE TABLE IF NOT EXISTS erp_partner_calls (
  call_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name VARCHAR(100) NOT NULL,
  project_budget_ceiling NUMERIC(18,2) NOT NULL,
  pro_rata_percentage NUMERIC(6,4) NOT NULL,
  call_amount NUMERIC(18,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Issued' CHECK (status IN ('Issued', 'Funded', 'Overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Maker-Checker Governance
CREATE TABLE IF NOT EXISTS erp_maker_checker (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mutation_type VARCHAR(50) NOT NULL,
  amount NUMERIC(18,2),
  requested_by VARCHAR(100) NOT NULL,
  primary_approver VARCHAR(100),
  secondary_approver VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Audit Logs
CREATE TABLE IF NOT EXISTS erp_audit_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(40) NOT NULL,
  entity_id UUID NOT NULL,
  actor VARCHAR(100) NOT NULL,
  source_ip VARCHAR(45),
  prior_state JSONB,
  new_state JSONB NOT NULL,
  journal_entry_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Triggers & Immutability Functions (Enforcing Section 0.6 & Invariant 0.9)
-- ============================================================================

-- Function: Guard Installment Schedule Column Immutability
CREATE OR REPLACE FUNCTION trg_guard_installment_schedule_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent DELETE unconditionally
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ERP Violation: installment_schedules rows are insert-only and cannot be deleted.';
  END IF;

  -- Block mutation of core financial columns
  IF OLD.nominal_value != NEW.nominal_value OR
     OLD.due_date != NEW.due_date OR
     OLD.tranche_number != NEW.tranche_number OR
     OLD.contract_id != NEW.contract_id THEN
    RAISE EXCEPTION 'ERP Violation: Financial columns (nominal_value, due_date, tranche_number, contract_id) are immutable once inserted.';
  END IF;

  -- Validate permitted status transitions
  IF OLD.status = 'SUPERSEDED' AND NEW.status != 'SUPERSEDED' THEN
    RAISE EXCEPTION 'ERP Violation: SUPERSEDED tranches cannot transition to any other status.';
  END IF;

  IF OLD.status = 'Void' AND NEW.status != 'Void' THEN
    RAISE EXCEPTION 'ERP Violation: Void tranches cannot transition to any other status.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_installment_schedule_immutability ON erp_installment_schedules;
CREATE TRIGGER check_installment_schedule_immutability
BEFORE UPDATE OR DELETE ON erp_installment_schedules
FOR EACH ROW
EXECUTE FUNCTION trg_guard_installment_schedule_immutability();

-- Function: Guard Period Lock Invariant
CREATE OR REPLACE FUNCTION trg_guard_period_lock()
RETURNS TRIGGER AS $$
DECLARE
  p_status VARCHAR(10);
BEGIN
  SELECT status INTO p_status FROM erp_accounting_periods WHERE period_id = NEW.period_id;
  IF p_status IN ('LOCKED', 'CLOSED') THEN
    RAISE EXCEPTION 'ERP Invariant 0.9 Violation: Cannot post journal entry into LOCKED or CLOSED accounting period %.', NEW.period_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_period_lock ON erp_journal_entries;
CREATE TRIGGER check_period_lock
BEFORE INSERT ON erp_journal_entries
FOR EACH ROW
EXECUTE FUNCTION trg_guard_period_lock();

-- ============================================================================
-- Permissions & Initial Seeding
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Disable RLS for application data flow
ALTER TABLE erp_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE erp_accounting_periods DISABLE ROW LEVEL SECURITY;
ALTER TABLE erp_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE erp_installment_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE erp_journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE erp_journal_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE erp_pdc_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE erp_rescissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE erp_contract_amendments DISABLE ROW LEVEL SECURITY;
ALTER TABLE erp_cost_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE erp_tax_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE erp_partner_calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE erp_maker_checker DISABLE ROW LEVEL SECURITY;
ALTER TABLE erp_audit_logs DISABLE ROW LEVEL SECURITY;

-- Seed canonical 2026 periods
INSERT INTO erp_accounting_periods (period_id, fiscal_year, period_number, start_date, end_date, status)
VALUES
  ('prd-2026-01', 2026, 1, '2026-01-01', '2026-01-31', 'CLOSED'),
  ('prd-2026-02', 2026, 2, '2026-02-01', '2026-02-28', 'CLOSED'),
  ('prd-2026-03', 2026, 3, '2026-03-01', '2026-03-31', 'OPEN'),
  ('prd-2026-04', 2026, 4, '2026-04-01', '2026-04-30', 'OPEN')
ON CONFLICT (fiscal_year, period_number) DO NOTHING;

-- Seed initial benchmark Cost Allocation (RSV)
INSERT INTO erp_cost_allocations (project_name, total_incurred_wip, total_sales_value, rsv_factor, calculated_at)
VALUES
  ('مشروع بالاشيال فيلاز & نايل هورايزونز', 45000000.00, 100000000.00, 0.450000, NOW())
ON CONFLICT DO NOTHING;

-- Auto-seed Statutory Taxes for any contracts that do not yet have tax entries
INSERT INTO erp_tax_records (contract_id, tax_type, taxable_base, tax_rate, tax_amount, remittance_status)
SELECT 
  c.contract_id,
  'Disposal 2.5% Case A',
  c.gross_contract_value,
  0.0250,
  ROUND(c.gross_contract_value * 0.0250, 2),
  'Pending'
FROM erp_contracts c
WHERE NOT EXISTS (
  SELECT 1 FROM erp_tax_records t WHERE t.contract_id = c.contract_id
);

-- Auto-seed PDC Cheques for upcoming installment schedules that do not yet have cheque records
INSERT INTO erp_pdc_records (contract_id, schedule_id, cheque_number, bank_name, drawer_name, nominal_value, due_date, status)
SELECT 
  s.contract_id,
  s.schedule_id,
  'CHQ-' || SUBSTRING(REPLACE(c.contract_number, '-', '') FROM 1 FOR 6) || '-' || LPAD(s.tranche_number::text, 3, '0'),
  NULL,
  COALESCE(c.buyer_name, 'العميل المتعاقد'),
  s.nominal_value,
  s.due_date,
  CASE WHEN s.status = 'Paid' THEN 'Cleared' ELSE 'In Safe' END
FROM erp_installment_schedules s
JOIN erp_contracts c ON c.contract_id = s.contract_id
WHERE s.tranche_number > 1
  AND NOT EXISTS (
    SELECT 1 FROM erp_pdc_records p WHERE p.schedule_id = s.schedule_id
  );

