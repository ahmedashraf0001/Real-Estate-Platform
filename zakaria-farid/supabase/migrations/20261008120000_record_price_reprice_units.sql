-- record_property_price: reprice available units atomically in BOTH branches.
-- Before: the revised (non-final) branch ignored p_unit_prices; the client applied them in a second
-- update (not atomic; history logged units_repriced = 0).
-- [user-confirmed 2026-10-08] A repriced building's saved price = sum of all unit prices
-- (reserved/contracted keep theirs). The sum is taken from the locked row, so a unit reserved
-- between calculator load and save keeps its price and the building price still matches.

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
  v_unit_sum NUMERIC;
  v_unpriced INTEGER := 0;
  v_price NUMERIC;
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
  END IF;

  -- Reprice AVAILABLE units only; reserved/contracted keep their price.
  SELECT
    COALESCE(jsonb_agg(
      CASE
        WHEN u->>'status' = 'available' AND COALESCE(p_unit_prices, '{}'::jsonb) ? (u->>'unit_id')
          THEN jsonb_set(u, '{price_egp}', to_jsonb(ROUND((p_unit_prices->>(u->>'unit_id'))::numeric, 2)))
        ELSE u
      END
      ORDER BY ord
    ), '[]'::jsonb),
    COUNT(*) FILTER (WHERE u->>'status' = 'available' AND COALESCE(p_unit_prices, '{}'::jsonb) ? (u->>'unit_id'))
  INTO v_units, v_repriced
  FROM jsonb_array_elements(COALESCE(v_prop.building_units, '[]'::jsonb)) WITH ORDINALITY AS t(u, ord);

  v_price := p_price_egp;
  IF v_repriced > 0 THEN
    SELECT
      SUM(CASE WHEN jsonb_typeof(u->'price_egp') = 'number' THEN (u->>'price_egp')::numeric END),
      COUNT(*) FILTER (WHERE jsonb_typeof(u->'price_egp') IS DISTINCT FROM 'number')
    INTO v_unit_sum, v_unpriced
    FROM jsonb_array_elements(v_units) AS t(u);
    -- Only enforce the sum when every unit has a price; otherwise keep the caller's total.
    IF v_unpriced = 0 AND v_unit_sum > 0 THEN
      v_price := ROUND(v_unit_sum, 2);
    END IF;
  END IF;

  IF p_finalize THEN
    UPDATE public.properties
    SET price_egp = v_price,
        building_units = CASE WHEN v_prop.building_units IS NULL THEN NULL ELSE v_units END,
        completion_status = 'ready',
        construction_completed_at = NOW(),
        price_finalized_at = NOW()
    WHERE id = p_property_id;
    v_stage := 'final';
  ELSE
    UPDATE public.properties
    SET price_egp = v_price,
        building_units = CASE WHEN v_prop.building_units IS NULL THEN NULL ELSE v_units END
    WHERE id = p_property_id;
    v_stage := 'revised';
  END IF;

  INSERT INTO public.erp_property_price_history
    (property_id, price_egp, stage, cost_basis_egp, area_m2, units_repriced, note, created_by)
  VALUES
    (p_property_id, v_price, v_stage, p_cost_basis_egp, v_prop.area_sqm, v_repriced, p_note,
     COALESCE((SELECT auth.uid())::text, 'SYSTEM'));

  RETURN jsonb_build_object('stage', v_stage, 'units_repriced', v_repriced, 'price_egp', v_price);
END;
$$;

REVOKE ALL ON FUNCTION public.record_property_price(UUID, NUMERIC, BOOLEAN, JSONB, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_property_price(UUID, NUMERIC, BOOLEAN, JSONB, NUMERIC, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
