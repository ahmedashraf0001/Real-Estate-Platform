-- Property price history and final pricing for under-construction properties
-- (user-confirmed 2026-10-06).
-- The price entered when an off-plan property is created is its initial price. After construction
-- finishes, the calculator sets the final price from actual cost. The final price applies to unsold
-- (available) units only; signed contracts never change. Every price change is kept in history.

-- ─── 1. Property columns ────────────────────────────────────────────────────────

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS construction_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS price_finalized_at TIMESTAMPTZ;

-- ─── 2. Price history ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.erp_property_price_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  price_egp NUMERIC(14,2) NOT NULL CHECK (price_egp > 0),
  stage VARCHAR(10) NOT NULL CHECK (stage IN ('initial', 'revised', 'final')),
  cost_basis_egp NUMERIC(18,2),
  area_m2 NUMERIC(12,2),
  units_repriced INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_price_history_property
  ON public.erp_property_price_history(property_id, created_at DESC);

COMMENT ON TABLE public.erp_property_price_history IS
  'Every selling-price change of a property: initial (at creation), revised (calculator), final (after construction).';

-- Backfill: the current price of every existing property is its initial price.
INSERT INTO public.erp_property_price_history (property_id, price_egp, stage, area_m2, note)
SELECT p.id, p.price_egp, 'initial', p.area_sqm, 'سعر مبدئي مسجل قبل تفعيل سجل الأسعار'
FROM public.properties p
WHERE p.price_egp > 0
  AND NOT EXISTS (SELECT 1 FROM public.erp_property_price_history h WHERE h.property_id = p.id);

-- New properties: the price entered at creation is recorded as the initial price.
CREATE OR REPLACE FUNCTION public.record_initial_property_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.price_egp > 0 THEN
    INSERT INTO public.erp_property_price_history (property_id, price_egp, stage, area_m2)
    VALUES (NEW.id, NEW.price_egp, 'initial', NEW.area_sqm);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_properties_initial_price ON public.properties;
CREATE TRIGGER trg_properties_initial_price
  AFTER INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.record_initial_property_price();

-- ─── 3. Atomic price change ─────────────────────────────────────────────────────
-- p_finalize = false: revise the price (any property).
-- p_finalize = true : off-plan only, once. Marks construction complete and the property ready,
--                     reprices AVAILABLE units from p_unit_prices ({"<unit_id>": <price>, ...}).
--                     Reserved and contracted units keep their price.

CREATE OR REPLACE FUNCTION public.record_property_price(
  p_property_id UUID,
  p_price_egp NUMERIC,
  p_finalize BOOLEAN DEFAULT FALSE,
  p_unit_prices JSONB DEFAULT '{}'::jsonb,
  p_cost_basis_egp NUMERIC DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_prop public.properties%ROWTYPE;
  v_units JSONB;
  v_repriced INTEGER := 0;
  v_stage VARCHAR(10);
BEGIN
  IF p_price_egp IS NULL OR p_price_egp <= 0 THEN
    RAISE EXCEPTION 'PRICE_MUST_BE_POSITIVE';
  END IF;

  SELECT * INTO v_prop FROM public.properties WHERE id = p_property_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROPERTY_NOT_FOUND';
  END IF;

  IF p_finalize THEN
    IF v_prop.completion_status <> 'off_plan' THEN
      RAISE EXCEPTION 'FINAL_PRICE_ONLY_FOR_OFF_PLAN';
    END IF;
    IF v_prop.price_finalized_at IS NOT NULL THEN
      RAISE EXCEPTION 'PRICE_ALREADY_FINAL';
    END IF;

    SELECT
      COALESCE(jsonb_agg(
        CASE
          WHEN u->>'status' = 'available' AND p_unit_prices ? (u->>'unit_id')
            THEN jsonb_set(u, '{price_egp}', to_jsonb(ROUND((p_unit_prices->>(u->>'unit_id'))::numeric, 2)))
          ELSE u
        END
        ORDER BY ord
      ), '[]'::jsonb),
      COUNT(*) FILTER (WHERE u->>'status' = 'available' AND p_unit_prices ? (u->>'unit_id'))
    INTO v_units, v_repriced
    FROM jsonb_array_elements(COALESCE(v_prop.building_units, '[]'::jsonb)) WITH ORDINALITY AS t(u, ord);

    UPDATE public.properties
    SET price_egp = p_price_egp,
        building_units = CASE WHEN v_prop.building_units IS NULL THEN NULL ELSE v_units END,
        completion_status = 'ready',
        construction_completed_at = NOW(),
        price_finalized_at = NOW()
    WHERE id = p_property_id;
    v_stage := 'final';
  ELSE
    UPDATE public.properties SET price_egp = p_price_egp WHERE id = p_property_id;
    v_stage := 'revised';
  END IF;

  INSERT INTO public.erp_property_price_history
    (property_id, price_egp, stage, cost_basis_egp, area_m2, units_repriced, note, created_by)
  VALUES
    (p_property_id, p_price_egp, v_stage, p_cost_basis_egp, v_prop.area_sqm, v_repriced, p_note,
     COALESCE((SELECT auth.uid())::text, 'SYSTEM'));

  RETURN jsonb_build_object('stage', v_stage, 'units_repriced', v_repriced);
END;
$$;

REVOKE ALL ON FUNCTION public.record_property_price(UUID, NUMERIC, BOOLEAN, JSONB, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_property_price(UUID, NUMERIC, BOOLEAN, JSONB, NUMERIC, TEXT) TO authenticated, service_role;

-- ─── 4. Security & RLS (fail-closed, same as other erp_ tables) ────────────────

REVOKE ALL ON TABLE public.erp_property_price_history FROM anon;
GRANT ALL ON TABLE public.erp_property_price_history TO authenticated, service_role;

ALTER TABLE public.erp_property_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "erp_auth_all_erp_property_price_history" ON public.erp_property_price_history;
CREATE POLICY "erp_auth_all_erp_property_price_history" ON public.erp_property_price_history
  FOR ALL TO authenticated
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "erp_service_all_erp_property_price_history" ON public.erp_property_price_history;
CREATE POLICY "erp_service_all_erp_property_price_history" ON public.erp_property_price_history
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
