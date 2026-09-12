-- ============================================================================
-- 016_harden_security_and_leads_rls.sql
-- Phase 3: Security & RLS Hardening (Database Custodian)
--
-- 1. P1 Customer Leads Hardening (public.leads):
--    - Enables Row Level Security (RLS) on public.leads.
--    - Revokes all permissions from anon (REVOKE ALL ON ... FROM anon).
--    - Grants strictly INSERT permission to anon so website visitors can submit
--      inquiries and book viewings without requiring an account or session.
--    - Strictly BLOCKS SELECT, UPDATE, DELETE, and TRUNCATE from anon,
--      eliminating public scraping or exposure of customer phone numbers and PII.
--    - Replaces and tightens policies on public.leads:
--      * leads_anon_insert: FOR INSERT TO anon WITH CHECK (true)
--      * leads_auth_manage: FOR ALL TO authenticated
--        USING ((SELECT auth.role()) = 'authenticated')
--        WITH CHECK ((SELECT auth.role()) = 'authenticated')
--      * leads_service_manage: FOR ALL TO service_role USING (true) WITH CHECK (true)
--
-- 2. Complete ERP Tables RLS & Privilege Lockdown (All 16 ERP Tables + Auxiliary):
--    - Ensures ENABLE ROW LEVEL SECURITY on all 16 ERP tables and erp_property_costs.
--    - Unconditionally revokes all permissions from anon (REVOKE ALL ON ... FROM anon).
--    - Confines all access strictly to authenticated staff and service_role.
--    - Cleanses any legacy wildcard policies (e.g. erp_allow_all).
--    - Uses InitPlan-optimized cached subqueries ((SELECT auth.role()) = 'authenticated')
--      to avoid per-row re-evaluation and eliminate Supabase linter warnings.
--
-- 3. Viewing Bookings (public.bookings):
--    - Enables RLS on public.bookings.
--    - Revokes all permissions from anon.
--    - Grants full access strictly to authenticated and service_role.
--
-- 4. Dynamic Safeguard Sweep:
--    - Scans pg_tables for any table matching 'erp_%' in public schema to guarantee
--      RLS is enabled and anon access is revoked fail-closed.
--
-- Safety & Idempotency:
-- - Guarded by table existence checks and DROP POLICY IF EXISTS.
-- ============================================================================

-- ─── 0. Schema-level Usage ──────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ─── 1. P1 Customer Leads Hardening (public.leads) ───────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leads') THEN
    -- 1.1 Enforce Row Level Security
    ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

    -- 1.2 Strict least-privilege permissions:
    -- anon role is granted INSERT ONLY. SELECT, UPDATE, DELETE, and TRUNCATE are revoked.
    REVOKE ALL ON TABLE public.leads FROM anon;
    GRANT INSERT ON TABLE public.leads TO anon;
    GRANT ALL ON TABLE public.leads TO authenticated, service_role;

    -- 1.3 Clean drop of legacy and conflicting policies
    DROP POLICY IF EXISTS "Public can insert leads" ON public.leads;
    DROP POLICY IF EXISTS "Public can read leads" ON public.leads;
    DROP POLICY IF EXISTS "Authenticated users can read leads" ON public.leads;
    DROP POLICY IF EXISTS "Allow authenticated users to update leads" ON public.leads;
    DROP POLICY IF EXISTS "leads_anon_insert" ON public.leads;
    DROP POLICY IF EXISTS "leads_anon_select" ON public.leads;
    DROP POLICY IF EXISTS "leads_auth_manage" ON public.leads;
    DROP POLICY IF EXISTS "leads_service_manage" ON public.leads;

    -- 1.4 Policy 1: Anon can strictly INSERT new inquiries (no SELECT privilege)
    CREATE POLICY "leads_anon_insert" ON public.leads
      FOR INSERT
      TO anon
      WITH CHECK (true);

    -- 1.5 Policy 2: Authenticated staff can manage all leads (InitPlan optimized)
    CREATE POLICY "leads_auth_manage" ON public.leads
      FOR ALL
      TO authenticated
      USING ((SELECT auth.role()) = 'authenticated')
      WITH CHECK ((SELECT auth.role()) = 'authenticated');

    -- 1.6 Policy 3: Service role full access for background workers
    CREATE POLICY "leads_service_manage" ON public.leads
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ─── 2. Secure All 16 ERP Tables + erp_property_costs ────────────────────────
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
    'erp_partner_transactions',
    'erp_property_costs'
  ];
BEGIN
  FOREACH tbl IN ARRAY erp_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      -- 2.1 Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

      -- 2.2 Completely revoke any access from anon
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon;', tbl);

      -- 2.3 Grant access strictly to authenticated staff and service_role
      EXECUTE format('GRANT ALL ON TABLE public.%I TO authenticated, service_role;', tbl);

      -- 2.4 Drop insecure or legacy policies
      EXECUTE format('DROP POLICY IF EXISTS "erp_allow_all" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "erp_auth_all_%s" ON public.%I;', tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS "erp_service_all_%s" ON public.%I;', tbl, tbl);

      -- 2.5 Recreate authenticated staff policy with InitPlan optimization
      EXECUTE format('
        CREATE POLICY "erp_auth_all_%s" ON public.%I
        FOR ALL TO authenticated
        USING ((SELECT auth.role()) = ''authenticated'')
        WITH CHECK ((SELECT auth.role()) = ''authenticated'');
      ', tbl, tbl);

      -- 2.6 Recreate service_role background policy
      EXECUTE format('
        CREATE POLICY "erp_service_all_%s" ON public.%I
        FOR ALL TO service_role
        USING (true)
        WITH CHECK (true);
      ', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- ─── 3. Viewing Bookings Table Hardening (public.bookings) ───────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings') THEN
    ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

    -- Revoke all access from anon (protect attendee phone/email/name)
    REVOKE ALL ON TABLE public.bookings FROM anon;
    GRANT ALL ON TABLE public.bookings TO authenticated, service_role;

    DROP POLICY IF EXISTS "Authenticated users can read bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Authenticated users can manage bookings" ON public.bookings;
    DROP POLICY IF EXISTS "bookings_auth_manage" ON public.bookings;
    DROP POLICY IF EXISTS "bookings_service_manage" ON public.bookings;

    CREATE POLICY "bookings_auth_manage" ON public.bookings
      FOR ALL
      TO authenticated
      USING ((SELECT auth.role()) = 'authenticated')
      WITH CHECK ((SELECT auth.role()) = 'authenticated');

    CREATE POLICY "bookings_service_manage" ON public.bookings
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ─── 4. Newsletter Subscribers Hardening (public.newsletter_subscribers) ─────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'newsletter_subscribers') THEN
    ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

    -- anon has INSERT only; no SELECT/UPDATE/DELETE
    REVOKE ALL ON TABLE public.newsletter_subscribers FROM anon;
    GRANT INSERT ON TABLE public.newsletter_subscribers TO anon;
    GRANT ALL ON TABLE public.newsletter_subscribers TO authenticated, service_role;

    DROP POLICY IF EXISTS "newsletter_anon_insert" ON public.newsletter_subscribers;
    DROP POLICY IF EXISTS "newsletter_auth_manage" ON public.newsletter_subscribers;
    DROP POLICY IF EXISTS "newsletter_service_manage" ON public.newsletter_subscribers;

    CREATE POLICY "newsletter_anon_insert" ON public.newsletter_subscribers
      FOR INSERT
      TO anon
      WITH CHECK (true);

    CREATE POLICY "newsletter_auth_manage" ON public.newsletter_subscribers
      FOR ALL
      TO authenticated
      USING ((SELECT auth.role()) = 'authenticated')
      WITH CHECK ((SELECT auth.role()) = 'authenticated');

    CREATE POLICY "newsletter_service_manage" ON public.newsletter_subscribers
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ─── 5. Dynamic Fail-Closed Sweep on any ERP tables ──────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename LIKE 'erp_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon;', r.tablename);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO authenticated, service_role;', r.tablename);
  END LOOP;
END $$;
