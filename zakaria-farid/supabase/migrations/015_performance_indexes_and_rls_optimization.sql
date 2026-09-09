-- ============================================================================
-- 015_performance_indexes_and_rls_optimization.sql
-- Database Performance Hardening, Foreign Key Indexing & RLS InitPlan Optimization
--
-- Optimizations Implemented:
-- 1. Performance B-Tree index on properties(created_at DESC) resolving slow query
--    recommendation surfaced on Supabase Dashboard (+72.48% query performance).
-- 2. Covering indexes for all 15 unindexed foreign keys across ERP domain tables,
--    eliminating sequential scans on relational joins and cascade operations.
-- 3. RLS InitPlan optimization: replaces per-row auth.role() re-evaluation with
--    cached (SELECT auth.role()) subquery across all 21 policies (auth_rls_initplan).
-- 4. Eliminates multiple permissive policies on SELECT across properties,
--    property_images, and property_amenities by decoupling write operations
--    (INSERT, UPDATE, DELETE) from the unified public SELECT policy.
--
-- Safety & Idempotency:
-- - All index creations use CREATE INDEX IF NOT EXISTS and check pg_tables.
-- - All policy modifications check pg_tables and use DROP POLICY IF EXISTS.
-- ============================================================================

-- ─── 1. B-Tree Index for Slow Query (Supabase Dashboard Recommendation) ──────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'properties') THEN
    CREATE INDEX IF NOT EXISTS idx_properties_created_at_desc 
      ON public.properties USING btree (created_at DESC);
  END IF;
END $$;

-- ─── 2. Covering Indexes for All 15 Unindexed Foreign Keys ───────────────────
DO $$
BEGIN
  -- 2.1 erp_contract_amendments(contract_id)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'erp_contract_amendments') THEN
    CREATE INDEX IF NOT EXISTS idx_erp_contract_amendments_contract_id 
      ON public.erp_contract_amendments(contract_id);
  END IF;

  -- 2.2 erp_contracts(lead_id, property_id)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'erp_contracts') THEN
    CREATE INDEX IF NOT EXISTS idx_erp_contracts_lead_id 
      ON public.erp_contracts(lead_id);
    CREATE INDEX IF NOT EXISTS idx_erp_contracts_property_id 
      ON public.erp_contracts(property_id);
  END IF;

  -- 2.3 erp_installment_schedules(amendment_id, contract_id, supersedes_schedule_id)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'erp_installment_schedules') THEN
    CREATE INDEX IF NOT EXISTS idx_erp_installment_schedules_amendment_id 
      ON public.erp_installment_schedules(amendment_id);
    CREATE INDEX IF NOT EXISTS idx_erp_installment_schedules_contract_id 
      ON public.erp_installment_schedules(contract_id);
    CREATE INDEX IF NOT EXISTS idx_erp_installment_schedules_supersedes_schedule_id 
      ON public.erp_installment_schedules(supersedes_schedule_id);
  END IF;

  -- 2.4 erp_journal_entries(period_id)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'erp_journal_entries') THEN
    CREATE INDEX IF NOT EXISTS idx_erp_journal_entries_period_id 
      ON public.erp_journal_entries(period_id);
  END IF;

  -- 2.5 erp_journal_lines(account_code, entry_id)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'erp_journal_lines') THEN
    CREATE INDEX IF NOT EXISTS idx_erp_journal_lines_account_code 
      ON public.erp_journal_lines(account_code);
    CREATE INDEX IF NOT EXISTS idx_erp_journal_lines_entry_id 
      ON public.erp_journal_lines(entry_id);
  END IF;

  -- 2.6 erp_partner_transactions(journal_entry_id, property_id)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'erp_partner_transactions') THEN
    CREATE INDEX IF NOT EXISTS idx_erp_partner_transactions_journal_entry_id 
      ON public.erp_partner_transactions(journal_entry_id);
    CREATE INDEX IF NOT EXISTS idx_erp_partner_transactions_property_id 
      ON public.erp_partner_transactions(property_id);
  END IF;

  -- 2.7 erp_pdc_records(contract_id, schedule_id)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'erp_pdc_records') THEN
    CREATE INDEX IF NOT EXISTS idx_erp_pdc_records_contract_id 
      ON public.erp_pdc_records(contract_id);
    CREATE INDEX IF NOT EXISTS idx_erp_pdc_records_schedule_id 
      ON public.erp_pdc_records(schedule_id);
  END IF;

  -- 2.8 erp_rescissions(contract_id)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'erp_rescissions') THEN
    CREATE INDEX IF NOT EXISTS idx_erp_rescissions_contract_id 
      ON public.erp_rescissions(contract_id);
  END IF;

  -- 2.9 erp_tax_records(contract_id)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'erp_tax_records') THEN
    CREATE INDEX IF NOT EXISTS idx_erp_tax_records_contract_id 
      ON public.erp_tax_records(contract_id);
  END IF;
END $$;

-- ─── 3. RLS InitPlan Optimization (21 Policies: (SELECT auth.role())) ─────────

-- 3.1 Recreate erp_auth_all_<tbl> on all 16 ERP tables with cached InitPlan
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
      EXECUTE format('DROP POLICY IF EXISTS "erp_auth_all_%s" ON %I;', tbl, tbl);
      EXECUTE format('
        CREATE POLICY "erp_auth_all_%s" ON %I
        FOR ALL TO authenticated
        USING ((SELECT auth.role()) = ''authenticated'')
        WITH CHECK ((SELECT auth.role()) = ''authenticated'');
      ', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- 3.2 Optimize leads_auth_manage on leads with cached InitPlan
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leads') THEN
    DROP POLICY IF EXISTS "leads_auth_manage" ON leads;
    CREATE POLICY "leads_auth_manage" ON leads
      FOR ALL TO authenticated
      USING ((SELECT auth.role()) = 'authenticated')
      WITH CHECK ((SELECT auth.role()) = 'authenticated');
  END IF;
END $$;

-- 3.3 Optimize newsletter_auth_manage on newsletter_subscribers with cached InitPlan
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'newsletter_subscribers') THEN
    DROP POLICY IF EXISTS "newsletter_auth_manage" ON newsletter_subscribers;
    CREATE POLICY "newsletter_auth_manage" ON newsletter_subscribers
      FOR ALL TO authenticated
      USING ((SELECT auth.role()) = 'authenticated')
      WITH CHECK ((SELECT auth.role()) = 'authenticated');
  END IF;
END $$;

-- ─── 4. Eliminate Multiple Permissive Policies on SELECT (3 Tables) ──────────
-- On properties, property_images, and property_amenities:
-- Authenticated users previously matched both <table_name>_public_select AND
-- <table_name>_auth_manage for SELECT operations. We decouple mutations into
-- dedicated write policies so authenticated SELECT evaluates strictly once.

-- 4.1 properties: Decouple into single SELECT policy + explicit mutation policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'properties') THEN
    -- Drop legacy catch-all auth policy
    DROP POLICY IF EXISTS "properties_auth_manage" ON properties;
    DROP POLICY IF EXISTS "properties_auth_insert" ON properties;
    DROP POLICY IF EXISTS "properties_auth_update" ON properties;
    DROP POLICY IF EXISTS "properties_auth_delete" ON properties;
    DROP POLICY IF EXISTS "properties_public_select" ON properties;

    -- Single unified SELECT policy for both anon and authenticated
    CREATE POLICY "properties_public_select" ON properties
      FOR SELECT
      TO anon, authenticated
      USING (true);

    -- Dedicated write policies for authenticated staff with cached InitPlan
    CREATE POLICY "properties_auth_insert" ON properties
      FOR INSERT
      TO authenticated
      WITH CHECK ((SELECT auth.role()) = 'authenticated');

    CREATE POLICY "properties_auth_update" ON properties
      FOR UPDATE
      TO authenticated
      USING ((SELECT auth.role()) = 'authenticated')
      WITH CHECK ((SELECT auth.role()) = 'authenticated');

    CREATE POLICY "properties_auth_delete" ON properties
      FOR DELETE
      TO authenticated
      USING ((SELECT auth.role()) = 'authenticated');
  END IF;
END $$;

-- 4.2 property_images: Decouple into single SELECT policy + explicit mutation policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'property_images') THEN
    DROP POLICY IF EXISTS "property_images_auth_manage" ON property_images;
    DROP POLICY IF EXISTS "property_images_auth_insert" ON property_images;
    DROP POLICY IF EXISTS "property_images_auth_update" ON property_images;
    DROP POLICY IF EXISTS "property_images_auth_delete" ON property_images;
    DROP POLICY IF EXISTS "property_images_public_select" ON property_images;

    -- Single unified SELECT policy for both anon and authenticated
    CREATE POLICY "property_images_public_select" ON property_images
      FOR SELECT
      TO anon, authenticated
      USING (true);

    -- Dedicated write policies for authenticated staff with cached InitPlan
    CREATE POLICY "property_images_auth_insert" ON property_images
      FOR INSERT
      TO authenticated
      WITH CHECK ((SELECT auth.role()) = 'authenticated');

    CREATE POLICY "property_images_auth_update" ON property_images
      FOR UPDATE
      TO authenticated
      USING ((SELECT auth.role()) = 'authenticated')
      WITH CHECK ((SELECT auth.role()) = 'authenticated');

    CREATE POLICY "property_images_auth_delete" ON property_images
      FOR DELETE
      TO authenticated
      USING ((SELECT auth.role()) = 'authenticated');
  END IF;
END $$;

-- 4.3 property_amenities: Decouple into single SELECT policy + explicit mutation policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'property_amenities') THEN
    DROP POLICY IF EXISTS "property_amenities_auth_manage" ON property_amenities;
    DROP POLICY IF EXISTS "property_amenities_auth_insert" ON property_amenities;
    DROP POLICY IF EXISTS "property_amenities_auth_update" ON property_amenities;
    DROP POLICY IF EXISTS "property_amenities_auth_delete" ON property_amenities;
    DROP POLICY IF EXISTS "property_amenities_public_select" ON property_amenities;

    -- Single unified SELECT policy for both anon and authenticated
    CREATE POLICY "property_amenities_public_select" ON property_amenities
      FOR SELECT
      TO anon, authenticated
      USING (true);

    -- Dedicated write policies for authenticated staff with cached InitPlan
    CREATE POLICY "property_amenities_auth_insert" ON property_amenities
      FOR INSERT
      TO authenticated
      WITH CHECK ((SELECT auth.role()) = 'authenticated');

    CREATE POLICY "property_amenities_auth_update" ON property_amenities
      FOR UPDATE
      TO authenticated
      USING ((SELECT auth.role()) = 'authenticated')
      WITH CHECK ((SELECT auth.role()) = 'authenticated');

    CREATE POLICY "property_amenities_auth_delete" ON property_amenities
      FOR DELETE
      TO authenticated
      USING ((SELECT auth.role()) = 'authenticated');
  END IF;
END $$;
