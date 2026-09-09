-- ============================================================================
-- 013_erp_schedule_immutability_and_partner_tables.sql
-- Workstream 3: Database Hardening, Rescission Cleanup & Partner Persistence
-- 
-- 1. Re-attaches BEFORE UPDATE OR DELETE trigger on erp_installment_schedules to
--    unconditionally block direct DELETE (§0.6), enforce column immutability,
--    and allow SUPERSEDED -> Void transition upon contract rescission.
-- 2. Creates erp_partner_profiles table.
-- 3. Creates erp_partner_transactions table.
-- 4. Enforces Row Level Security (RLS) and grants for authenticated and service_role.
-- ============================================================================

-- ─── 1. Schedule Immutability & DELETE Prevention Trigger (§0.6) ─────────────

CREATE OR REPLACE FUNCTION trg_guard_installment_schedule_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Unconditionally raise an exception on any direct DELETE attempt (§0.6)
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ERP Violation: installment_schedules rows are insert-only and cannot be deleted.';
  END IF;

  -- Block mutation of core financial columns
  IF TG_OP = 'UPDATE' THEN
    IF OLD.nominal_value != NEW.nominal_value OR
       OLD.due_date != NEW.due_date OR
       OLD.tranche_number != NEW.tranche_number OR
       OLD.contract_id != NEW.contract_id THEN
      RAISE EXCEPTION 'ERP Violation: Financial columns (nominal_value, due_date, tranche_number, contract_id) are immutable once inserted.';
    END IF;

    -- SUPERSEDED tranches can only transition to Void (upon contract rescission)
    IF OLD.status = 'SUPERSEDED' AND NEW.status NOT IN ('SUPERSEDED', 'Void') THEN
      RAISE EXCEPTION 'ERP Violation: SUPERSEDED tranches cannot transition to any status other than Void.';
    END IF;

    -- Void tranches are terminal
    IF OLD.status = 'Void' AND NEW.status != 'Void' THEN
      RAISE EXCEPTION 'ERP Violation: Void tranches cannot transition to any other status.';
    END IF;

    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_installment_schedule_immutability ON erp_installment_schedules;
CREATE TRIGGER check_installment_schedule_immutability
BEFORE UPDATE OR DELETE ON erp_installment_schedules
FOR EACH ROW
EXECUTE FUNCTION trg_guard_installment_schedule_immutability();

-- ─── 2. Partner Profiles Table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_partner_profiles (
  partner_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  national_id VARCHAR(50),
  role VARCHAR(50) DEFAULT 'equity_partner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Partner Transactions Table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_partner_transactions (
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name VARCHAR(255) NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  property_title VARCHAR(255),
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  date VARCHAR(30) NOT NULL,
  routing_account VARCHAR(20) NOT NULL,
  journal_entry_id UUID REFERENCES erp_journal_entries(entry_id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_partner_tx_partner ON erp_partner_transactions(partner_name);
CREATE INDEX IF NOT EXISTS idx_erp_partner_tx_date ON erp_partner_transactions(date);

-- ─── 4. Permissions & RLS ───────────────────────────────────────────────────

REVOKE ALL ON TABLE erp_partner_profiles, erp_partner_transactions FROM anon;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON TABLE erp_partner_profiles, erp_partner_transactions TO authenticated, service_role;

ALTER TABLE erp_partner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_partner_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "erp_auth_all_erp_partner_profiles" ON erp_partner_profiles;
DROP POLICY IF EXISTS "erp_service_all_erp_partner_profiles" ON erp_partner_profiles;

CREATE POLICY "erp_auth_all_erp_partner_profiles" ON erp_partner_profiles
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "erp_service_all_erp_partner_profiles" ON erp_partner_profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "erp_auth_all_erp_partner_transactions" ON erp_partner_transactions;
DROP POLICY IF EXISTS "erp_service_all_erp_partner_transactions" ON erp_partner_transactions;

CREATE POLICY "erp_auth_all_erp_partner_transactions" ON erp_partner_transactions
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "erp_service_all_erp_partner_transactions" ON erp_partner_transactions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
