-- Calculator money guards (user-confirmed 2026-10-09). Apply separately; older migration unchanged.
-- All recorded units may legitimately be priced at zero. History must accept their sum;
-- the RPC below still requires a positive price for properties without units.
ALTER TABLE public.erp_property_price_history
  DROP CONSTRAINT IF EXISTS erp_property_price_history_price_egp_check;
ALTER TABLE public.erp_property_price_history
  ADD CONSTRAINT erp_property_price_history_price_egp_check CHECK (price_egp >= 0);

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
  v_entry RECORD;
  v_unit_price NUMERIC;
BEGIN
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

  -- Property row lock serializes the atomic price/unit/history write.
  IF EXISTS (
    SELECT 1 FROM public.erp_contracts c
    WHERE c.property_id = p_property_id AND c.status IS DISTINCT FROM 'Rescinded'
      AND (c.building_unit_id IS NULL OR c.building_unit_id = p_property_id::text)
  ) THEN
    RAISE EXCEPTION 'PROPERTY_SOLD_WHOLE';
  END IF;

  IF jsonb_typeof(COALESCE(p_unit_prices, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_UNIT_PRICE';
  END IF;
  -- Validate every requested value before inspecting keys or changing a unit, including locked units.
  FOR v_entry IN SELECT key, value FROM jsonb_each(COALESCE(p_unit_prices, '{}'::jsonb)) LOOP
    IF jsonb_typeof(v_entry.value) IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'INVALID_UNIT_PRICE';
    END IF;
    v_unit_price := (v_entry.value #>> '{}')::numeric;
    IF v_unit_price::text IN ('NaN', 'Infinity', '-Infinity') OR v_unit_price < 0 OR v_unit_price <> ROUND(v_unit_price, 0) THEN
      RAISE EXCEPTION 'INVALID_UNIT_PRICE';
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(COALESCE(p_unit_prices, '{}'::jsonb)) AS k(unit_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(v_prop.building_units, '[]'::jsonb)) AS t(u)
      WHERE u->>'unit_id' = k.unit_id
    )
  ) THEN
    RAISE EXCEPTION 'UNKNOWN_UNIT';
  END IF;

  -- Available status alone is insufficient: any live unit contract locks its stored price.
  WITH unit_rows AS (
    SELECT u, ord,
      u->>'status' = 'available'
        AND COALESCE(p_unit_prices, '{}'::jsonb) ? (u->>'unit_id')
        AND NOT EXISTS (
          SELECT 1 FROM public.erp_contracts c
          WHERE c.status IS DISTINCT FROM 'Rescinded'
            AND c.building_unit_id = u->>'unit_id'
        ) AS reprice
    FROM jsonb_array_elements(COALESCE(v_prop.building_units, '[]'::jsonb)) WITH ORDINALITY AS t(u, ord)
  )
  SELECT COALESCE(jsonb_agg(
    CASE WHEN reprice THEN jsonb_set(u, '{price_egp}', p_unit_prices->(u->>'unit_id')) ELSE u END
    ORDER BY ord
  ), '[]'::jsonb), COUNT(*) FILTER (WHERE reprice)
  INTO v_units, v_repriced FROM unit_rows;

  IF jsonb_array_length(v_units) > 0 THEN
    SELECT SUM(CASE WHEN jsonb_typeof(u->'price_egp') = 'number' THEN (u->>'price_egp')::numeric END),
      COUNT(*) FILTER (WHERE jsonb_typeof(u->'price_egp') IS DISTINCT FROM 'number')
    INTO v_unit_sum, v_unpriced FROM jsonb_array_elements(v_units) AS t(u);
    IF v_unpriced > 0 THEN
      RAISE EXCEPTION 'UNPRICED_UNIT';
    END IF;
    -- Always use the authoritative unit sum, including zero replacements and zero total.
    v_price := v_unit_sum;
  ELSE
    IF p_price_egp IS NULL OR p_price_egp <= 0 THEN
      RAISE EXCEPTION 'PRICE_MUST_BE_POSITIVE';
    END IF;
    v_price := p_price_egp;
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
