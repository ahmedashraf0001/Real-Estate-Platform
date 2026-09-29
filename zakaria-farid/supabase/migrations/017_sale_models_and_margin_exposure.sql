-- ============================================================================
-- Migration 017: Sale Models Distinction & Margin Exposure Unit Estimates
-- Supports Cash on Delivery (على المفتاح) vs Off-Plan Installments (البيع تحت الإنشاء بالتقسيط)
-- Tracks dated, versioned estimate-to-complete per unit without automated price modifications.
-- ============================================================================

-- 1. Add explicit sale_model to erp_contracts
-- Historical contracts remain strictly NULL (unclassified).
ALTER TABLE public.erp_contracts
  ADD COLUMN IF NOT EXISTS sale_model VARCHAR(50)
    CHECK (sale_model IN ('CASH_ON_DELIVERY', 'OFF_PLAN_INSTALLMENTS'));

CREATE INDEX IF NOT EXISTS idx_erp_contracts_sale_model ON public.erp_contracts(sale_model);

COMMENT ON COLUMN public.erp_contracts.sale_model IS 
  'Explicit commercial sale model: CASH_ON_DELIVERY (على المفتاح - self-funded, sold at market price on completion) or OFF_PLAN_INSTALLMENTS (البيع تحت الإنشاء بالتقسيط - sold early on installment plan against cost estimate). Historical contracts remain NULL.';

-- 2. Create dated, versioned unit estimate-to-complete table
CREATE TABLE IF NOT EXISTS public.erp_unit_estimates (
  estimate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  building_unit_id TEXT,
  unit_number TEXT,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  forecast_cost_to_complete NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  confidence_score NUMERIC(5,2),
  notes TEXT,
  created_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_unit_estimates_prop ON public.erp_unit_estimates(property_id);
CREATE INDEX IF NOT EXISTS idx_erp_unit_estimates_unit ON public.erp_unit_estimates(building_unit_id);
CREATE INDEX IF NOT EXISTS idx_erp_unit_estimates_date ON public.erp_unit_estimates(as_of_date);

COMMENT ON TABLE public.erp_unit_estimates IS 
  'Dated, versioned estimate-to-complete snapshots per unit or property to evaluate off-plan margin exposure.';

-- 3. Security and RLS Hardening (Fail-Closed)
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
REVOKE ALL ON TABLE public.erp_unit_estimates FROM anon;
GRANT ALL ON TABLE public.erp_unit_estimates TO authenticated, service_role;

ALTER TABLE public.erp_unit_estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "erp_auth_all_erp_unit_estimates" ON public.erp_unit_estimates;
CREATE POLICY "erp_auth_all_erp_unit_estimates" ON public.erp_unit_estimates
  FOR ALL TO authenticated
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "erp_service_all_erp_unit_estimates" ON public.erp_unit_estimates;
CREATE POLICY "erp_service_all_erp_unit_estimates" ON public.erp_unit_estimates
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
