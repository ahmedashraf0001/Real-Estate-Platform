-- ============================================================================
-- 008_enforce_admin_erp_security.sql
-- Enforces strict administrator authentication and Row Level Security (RLS)
-- across all Zakaria Farid ERP Financial Engine tables and procedures.
--
-- Security Controls:
-- 1. Revokes all SELECT, INSERT, UPDATE, DELETE access from public 'anon' role.
-- 2. Enables Row Level Security (RLS) on all 14 ERP tables.
-- 3. Configures authenticated policies requiring a valid Supabase Auth session (auth.role() = 'authenticated').
-- 4. Preserves full administrative access for 'service_role'.
-- ============================================================================

-- ─── 1. Revoke table permissions from unauthenticated 'anon' role ───────────
REVOKE ALL ON TABLE 
  erp_accounts,
  erp_accounting_periods,
  erp_contracts,
  erp_installment_schedules,
  erp_journal_entries,
  erp_journal_lines,
  erp_pdc_records,
  erp_rescissions,
  erp_contract_amendments,
  erp_cost_allocations,
  erp_tax_records,
  erp_partner_calls,
  erp_maker_checker,
  erp_audit_logs
FROM anon;

-- Ensure authenticated users and service_role retain full access
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON TABLE 
  erp_accounts,
  erp_accounting_periods,
  erp_contracts,
  erp_installment_schedules,
  erp_journal_entries,
  erp_journal_lines,
  erp_pdc_records,
  erp_rescissions,
  erp_contract_amendments,
  erp_cost_allocations,
  erp_tax_records,
  erp_partner_calls,
  erp_maker_checker,
  erp_audit_logs
TO authenticated, service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;

-- ─── 2. Enable Row Level Security (RLS) on all ERP tables ────────────────────
ALTER TABLE erp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_installment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_pdc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_rescissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_contract_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_cost_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_tax_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_partner_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_maker_checker ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_audit_logs ENABLE ROW LEVEL SECURITY;

-- ─── 3. Create Authenticated Admin Policies (auth.role() = 'authenticated') ───

-- Helper macro loop for creating clean RLS policies across all tables
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'erp_accounts',
    'erp_accounting_periods',
    'erp_contracts',
    'erp_installment_schedules',
    'erp_journal_entries',
    'erp_journal_lines',
    'erp_pdc_records',
    'erp_rescissions',
    'erp_contract_amendments',
    'erp_cost_allocations',
    'erp_tax_records',
    'erp_partner_calls',
    'erp_maker_checker',
    'erp_audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Drop any existing conflicting policies
    EXECUTE format('DROP POLICY IF EXISTS "erp_auth_all_%s" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "erp_service_all_%s" ON %I;', tbl, tbl);

    -- Policy for authenticated administrators
    EXECUTE format('
      CREATE POLICY "erp_auth_all_%s" ON %I
      FOR ALL TO authenticated
      USING (auth.role() = ''authenticated'')
      WITH CHECK (auth.role() = ''authenticated'');
    ', tbl, tbl);

    -- Policy for backend service_role workers
    EXECUTE format('
      CREATE POLICY "erp_service_all_%s" ON %I
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
    ', tbl, tbl);
  END LOOP;
END $$;
