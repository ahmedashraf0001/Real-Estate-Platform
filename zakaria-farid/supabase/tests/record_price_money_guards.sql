-- Run only after 20261009100000_record_price_money_guards.sql in a disposable/test database.
-- All fixtures and price/history changes roll back. No production records selected.
BEGIN;
SET LOCAL plpgsql.check_asserts = on;
DO $$
DECLARE
  p UUID := gen_random_uuid();
  c UUID := gen_random_uuid();
  result JSONB;
  bad JSONB;
  before_history INTEGER;
  failed BOOLEAN;
BEGIN
  INSERT INTO public.properties (id, slug, title_en, title_ar, price_egp, area_sqm, type, location, completion_status, building_units)
  VALUES (p, 'money-guards-' || p, 'Money guard test', 'Money guard test', 200, 2, 'building', 'test', 'off_plan',
    '[{"unit_id":"a","status":"reserved","price_egp":100},{"unit_id":"b","status":"reserved","price_egp":100}]');

  -- Zero units repriced still saves authoritative unit sum in property, history and return.
  result := public.record_property_price(p, 400, FALSE, '{"a":200,"b":200}');
  ASSERT (result->>'price_egp')::numeric = 200, 'zero repriced RPC sum';
  ASSERT (result->>'units_repriced')::integer = 0, 'zero repriced count';
  ASSERT (SELECT price_egp = 200 FROM public.properties WHERE id = p), 'property sum';
  ASSERT (SELECT price_egp = 200 AND units_repriced = 0 FROM public.erp_property_price_history
    WHERE property_id = p AND stage = 'revised' ORDER BY created_at DESC LIMIT 1), 'history sum/count';

  SELECT COUNT(*) INTO before_history FROM public.erp_property_price_history WHERE property_id = p;
  -- Invalid prices rejected even for locked units, before any write.
  FOR bad IN SELECT value FROM jsonb_array_elements('[{"a":-1},{"a":1.5},{"a":null},{"a":"100"},{"a":true}]') LOOP
    failed := FALSE;
    BEGIN
      PERFORM public.record_property_price(p, 400, FALSE, bad);
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'INVALID_UNIT_PRICE' THEN RAISE; END IF;
      failed := TRUE;
    END;
    ASSERT failed, 'invalid unit price accepted';
  END LOOP;
  failed := FALSE;
  BEGIN
    PERFORM public.record_property_price(p, 400, FALSE, '{"unknown":100}');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'UNKNOWN_UNIT' THEN RAISE; END IF;
    failed := TRUE;
  END;
  ASSERT failed, 'unknown unit accepted';
  ASSERT (SELECT COUNT(*) = before_history FROM public.erp_property_price_history WHERE property_id = p), 'rejected requests wrote history';
  ASSERT (SELECT price_egp = 200 FROM public.properties WHERE id = p), 'rejected requests wrote property';

  UPDATE public.properties SET building_units = '[{"unit_id":"a","status":"available","price_egp":100},{"unit_id":"b","status":"available","price_egp":100}]' WHERE id = p;
  INSERT INTO public.erp_contracts (contract_id, contract_number, property_id, unit_id, building_unit_id, buyer_name, gross_contract_value, contract_date, status)
  VALUES (c, 'money-guards-' || c, p, p::text, 'a', 'Money guard test', 100, CURRENT_DATE, 'Active');
  result := public.record_property_price(p, 400, FALSE, '{"a":200,"b":200}');
  ASSERT (result->>'price_egp')::numeric = 300, 'live contract unit lock sum';
  ASSERT (result->>'units_repriced')::integer = 1, 'actual repriced count';
  ASSERT (SELECT (building_units->0->>'price_egp')::numeric = 100 FROM public.properties WHERE id = p), 'live contracted unit repriced';

  -- Both accepted whole-building identities are rejected, also in finalization.
  FOR bad IN SELECT value FROM jsonb_array_elements(jsonb_build_array(NULL, p::text)) LOOP
    UPDATE public.erp_contracts SET building_unit_id = bad #>> '{}' WHERE contract_id = c;
    failed := FALSE;
    BEGIN
      PERFORM public.record_property_price(p, 400, TRUE, '{"a":200}');
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'PROPERTY_SOLD_WHOLE' THEN RAISE; END IF;
      failed := TRUE;
    END;
    ASSERT failed, 'whole-building sale repriced';
    ASSERT (SELECT price_finalized_at IS NULL AND completion_status = 'off_plan' FROM public.properties WHERE id = p), 'blocked finalize wrote property';
  END LOOP;
  UPDATE public.erp_contracts SET status = 'Rescinded' WHERE contract_id = c;
  result := public.record_property_price(p, 400, FALSE, '{"a":200}');
  ASSERT (result->>'units_repriced')::integer = 1, 'rescinded contract locked unit';

  UPDATE public.properties SET building_units = '[{"unit_id":"a","status":"reserved","price_egp":100},{"unit_id":"b","status":"available"}]' WHERE id = p;
  failed := FALSE;
  BEGIN
    PERFORM public.record_property_price(p, 400, FALSE, '{}');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'UNPRICED_UNIT' THEN RAISE; END IF;
    failed := TRUE;
  END;
  ASSERT failed, 'unpriced unit accepted';

  -- Whole-property pricing retains piastres; unit sum may be zero.
  UPDATE public.properties SET building_units = '[{"unit_id":"a","status":"available","price_egp":0}]' WHERE id = p;
  result := public.record_property_price(p, 400, FALSE, '{}');
  ASSERT (result->>'price_egp')::numeric = 0, 'zero sum replaced by hint';
  UPDATE public.properties SET building_units = NULL WHERE id = p;
  result := public.record_property_price(p, 102.50);
  ASSERT (result->>'price_egp')::numeric = 102.50, 'whole-property piastres lost';
  failed := FALSE;
  BEGIN
    PERFORM public.record_property_price(p, 0);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'PRICE_MUST_BE_POSITIVE' THEN RAISE; END IF;
    failed := TRUE;
  END;
  ASSERT failed, 'nonpositive whole-property price accepted';
END;
$$;
ROLLBACK;
