-- ============================================================================
-- 014_enforce_rls_and_security_hardening.sql
-- Supabase Security Hardening & Row Level Security (RLS) Enforcement Migration
--
-- Addresses Supabase Security Linter findings:
-- 1. Enables RLS on all 16 ERP tables and 5 public tables (resolves rls_disabled_in_public
--    and policy_exists_rls_disabled).
-- 2. Drops insecure legacy wildcard policy 'erp_allow_all' across all existing tables.
-- 3. Revokes all access permissions from 'anon' on all 16 erp_* tables.
-- 4. Establishes clean, strictly isolated policies on all 16 erp_* tables:
--    - Authenticated: FOR ALL TO authenticated USING (auth.role() = 'authenticated')
--                     WITH CHECK (auth.role() = 'authenticated')
--    - Service Role:  FOR ALL TO service_role USING (true) WITH CHECK (true)
-- 5. Establishes least-privilege policies on public-facing tables:
--    - properties & property_images: Public read (SELECT), Auth/Service manage (ALL)
--    - property_amenities: Public read (SELECT), Auth/Service manage (ALL)
--    - leads: Public/anon insert only (WITH CHECK (true)), Auth manage, Service full access (resolves sensitive_columns_exposed)
--    - newsletter_subscribers: Public/anon insert only (WITH CHECK (true)), Auth/Service manage (resolves rls_enabled_no_policy)
-- 6. Hardens search_path on critical trigger functions (resolves function_search_path_mutable):
--    - trg_guard_period_lock() SET search_path = public
--    - trg_guard_installment_schedule_immutability() SET search_path = public
--
-- Idempotency Guarantee:
-- All DROP POLICY statements are guarded by table existence checks so PostgreSQL
-- error 42P01 (relation does not exist) is impossible.
-- ============================================================================

-- ─── 0. Idempotent Schema Prerequisites ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  source TEXT DEFAULT 'Property Alerts Subscription',
  locale TEXT DEFAULT 'en',
  search_criteria TEXT,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 1. Enable Row Level Security (RLS) on all Tables ────────────────────────
-- Public-facing / CRM tables
ALTER TABLE IF EXISTS properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS property_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- 16 Core ERP Financial tables
ALTER TABLE IF EXISTS erp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_installment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_pdc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_rescissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_contract_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_cost_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_tax_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_partner_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_maker_checker ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_partner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS erp_partner_transactions ENABLE ROW LEVEL SECURITY;

-- ─── 2. Drop Insecure Legacy Wildcard Policy 'erp_allow_all' ─────────────────
DO $$
DECLARE
  tbl TEXT;
  target_tables TEXT[] := ARRAY[
    'properties',
    'property_images',
    'property_amenities',
    'leads',
    'newsletter_subscribers',
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
    'erp_audit_logs',
    'erp_partner_profiles',
    'erp_partner_transactions'
  ];
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('DROP POLICY IF EXISTS "erp_allow_all" ON %I;', tbl);
    END IF;
  END LOOP;
END $$;

-- Dynamic sweep across any remaining table in public schema that has erp_allow_all
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND policyname = 'erp_allow_all'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ─── 3. Revoke all permissions from anon on all erp_* tables ──────────────────
DO $$
DECLARE
  tbl TEXT;
  erp_tables TEXT[] := ARRAY[
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
    'erp_audit_logs',
    'erp_partner_profiles',
    'erp_partner_transactions'
  ];
BEGIN
  FOREACH tbl IN ARRAY erp_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('REVOKE ALL ON TABLE %I FROM anon;', tbl);
      EXECUTE format('GRANT ALL ON TABLE %I TO authenticated, service_role;', tbl);
    END IF;
  END LOOP;
END $$;

-- ─── 4. Isolated Policies on all erp_* tables ────────────────────────────────
-- Authenticated: FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated')
-- Service Role:  FOR ALL TO service_role USING (true) WITH CHECK (true)

DO $$
DECLARE
  tbl TEXT;
  erp_tables TEXT[] := ARRAY[
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
    'erp_audit_logs',
    'erp_partner_profiles',
    'erp_partner_transactions'
  ];
BEGIN
  FOREACH tbl IN ARRAY erp_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      -- Drop existing auth/service policies to maintain clean state
      EXECUTE format('DROP POLICY IF EXISTS "erp_auth_all_%s" ON %I;', tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS "erp_service_all_%s" ON %I;', tbl, tbl);

      -- Authenticated administrator & staff policy
      EXECUTE format('
        CREATE POLICY "erp_auth_all_%s" ON %I
        FOR ALL TO authenticated
        USING (auth.role() = ''authenticated'')
        WITH CHECK (auth.role() = ''authenticated'');
      ', tbl, tbl);

      -- Service role worker policy
      EXECUTE format('
        CREATE POLICY "erp_service_all_%s" ON %I
        FOR ALL TO service_role
        USING (true)
        WITH CHECK (true);
      ', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- ─── 5. Least-Privilege Public-Facing Policies ───────────────────────────────

-- 5.1 properties: Public read (SELECT), Authenticated/service_role manage (ALL)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'properties') THEN
    DROP POLICY IF EXISTS "Public can read active properties" ON properties;
    DROP POLICY IF EXISTS "Public can read properties" ON properties;
    DROP POLICY IF EXISTS "Authenticated users can manage properties" ON properties;
    DROP POLICY IF EXISTS "properties_public_select" ON properties;
    DROP POLICY IF EXISTS "properties_auth_manage" ON properties;
    DROP POLICY IF EXISTS "properties_service_manage" ON properties;

    CREATE POLICY "properties_public_select" ON properties
      FOR SELECT
      TO anon, authenticated
      USING (true);

    CREATE POLICY "properties_auth_manage" ON properties
      FOR ALL
      TO authenticated
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');

    CREATE POLICY "properties_service_manage" ON properties
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON properties FROM anon;
    GRANT SELECT ON properties TO anon;
    GRANT ALL ON properties TO authenticated, service_role;
  END IF;
END $$;


-- 5.2 property_images: Public read (SELECT), Authenticated/service_role manage (ALL)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'property_images') THEN
    DROP POLICY IF EXISTS "Public can read property images" ON property_images;
    DROP POLICY IF EXISTS "Authenticated users can manage property images" ON property_images;
    DROP POLICY IF EXISTS "property_images_public_select" ON property_images;
    DROP POLICY IF EXISTS "property_images_auth_manage" ON property_images;
    DROP POLICY IF EXISTS "property_images_service_manage" ON property_images;

    CREATE POLICY "property_images_public_select" ON property_images
      FOR SELECT
      TO anon, authenticated
      USING (true);

    CREATE POLICY "property_images_auth_manage" ON property_images
      FOR ALL
      TO authenticated
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');

    CREATE POLICY "property_images_service_manage" ON property_images
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON property_images FROM anon;
    GRANT SELECT ON property_images TO anon;
    GRANT ALL ON property_images TO authenticated, service_role;
  END IF;
END $$;


-- 5.3 property_amenities: Public read (SELECT), Authenticated/service_role manage (ALL)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'property_amenities') THEN
    DROP POLICY IF EXISTS "Public can read amenities" ON property_amenities;
    DROP POLICY IF EXISTS "Authenticated users can manage amenities" ON property_amenities;
    DROP POLICY IF EXISTS "property_amenities_public_select" ON property_amenities;
    DROP POLICY IF EXISTS "property_amenities_auth_manage" ON property_amenities;
    DROP POLICY IF EXISTS "property_amenities_service_manage" ON property_amenities;

    CREATE POLICY "property_amenities_public_select" ON property_amenities
      FOR SELECT
      TO anon, authenticated
      USING (true);

    CREATE POLICY "property_amenities_auth_manage" ON property_amenities
      FOR ALL
      TO authenticated
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');

    CREATE POLICY "property_amenities_service_manage" ON property_amenities
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON property_amenities FROM anon;
    GRANT SELECT ON property_amenities TO anon;
    GRANT ALL ON property_amenities TO authenticated, service_role;
  END IF;
END $$;


-- 5.4 leads: Public/anon insert only (WITH CHECK (true)), Authenticated manage, Service role full access
-- CRITICAL HARDENING: anon has ZERO SELECT access to prevent PII exposure (phone, email, message)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leads') THEN
    DROP POLICY IF EXISTS "Public can insert leads" ON leads;
    DROP POLICY IF EXISTS "Authenticated users can read leads" ON leads;
    DROP POLICY IF EXISTS "Allow authenticated users to update leads" ON leads;
    DROP POLICY IF EXISTS "leads_anon_insert" ON leads;
    DROP POLICY IF EXISTS "leads_auth_manage" ON leads;
    DROP POLICY IF EXISTS "leads_service_manage" ON leads;

    CREATE POLICY "leads_anon_insert" ON leads
      FOR INSERT
      TO anon
      WITH CHECK (true);

    CREATE POLICY "leads_auth_manage" ON leads
      FOR ALL
      TO authenticated
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');

    CREATE POLICY "leads_service_manage" ON leads
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    REVOKE SELECT, UPDATE, DELETE, TRUNCATE ON leads FROM anon;
    GRANT INSERT ON leads TO anon;
    GRANT ALL ON leads TO authenticated, service_role;
  END IF;
END $$;


-- 5.5 newsletter_subscribers: Public/anon insert only (WITH CHECK (true)), Authenticated/service_role manage
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'newsletter_subscribers') THEN
    DROP POLICY IF EXISTS "newsletter_anon_insert" ON newsletter_subscribers;
    DROP POLICY IF EXISTS "newsletter_auth_manage" ON newsletter_subscribers;
    DROP POLICY IF EXISTS "newsletter_service_manage" ON newsletter_subscribers;

    CREATE POLICY "newsletter_anon_insert" ON newsletter_subscribers
      FOR INSERT
      TO anon
      WITH CHECK (true);

    CREATE POLICY "newsletter_auth_manage" ON newsletter_subscribers
      FOR ALL
      TO authenticated
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');

    CREATE POLICY "newsletter_service_manage" ON newsletter_subscribers
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    REVOKE SELECT, UPDATE, DELETE, TRUNCATE ON newsletter_subscribers FROM anon;
    GRANT INSERT ON newsletter_subscribers TO anon;
    GRANT ALL ON newsletter_subscribers TO authenticated, service_role;
  END IF;
END $$;


-- ─── 6. Harden Function Search Paths ─────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'trg_guard_period_lock' 
      AND pronamespace = 'public'::regnamespace
  ) THEN
    ALTER FUNCTION public.trg_guard_period_lock() SET search_path = public;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'trg_guard_installment_schedule_immutability' 
      AND pronamespace = 'public'::regnamespace
  ) THEN
    ALTER FUNCTION public.trg_guard_installment_schedule_immutability() SET search_path = public;
  END IF;
END $$;

-- Direct explicit invocations as specified in requirements
ALTER FUNCTION public.trg_guard_period_lock() SET search_path = public;
ALTER FUNCTION public.trg_guard_installment_schedule_immutability() SET search_path = public;

-- Re-attach schedule immutability trigger with BEFORE UPDATE OR DELETE (§0.6)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'erp_installment_schedules') THEN
    DROP TRIGGER IF EXISTS check_installment_schedule_immutability ON erp_installment_schedules;
    CREATE TRIGGER check_installment_schedule_immutability
    BEFORE UPDATE OR DELETE ON erp_installment_schedules
    FOR EACH ROW
    EXECUTE FUNCTION trg_guard_installment_schedule_immutability();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'erp_journal_entries') THEN
    DROP TRIGGER IF EXISTS check_period_lock ON erp_journal_entries;
    CREATE TRIGGER check_period_lock
    BEFORE INSERT ON erp_journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION trg_guard_period_lock();
  END IF;
END $$;
