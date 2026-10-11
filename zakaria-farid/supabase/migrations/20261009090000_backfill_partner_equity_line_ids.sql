-- [user-confirmed 2026-10-09] Partner equity journal lines posted before 4a021ff
-- (capital injections on 301000, profit distributions on 303000) have no partner_id.
-- Fill it from the partner transaction that posted the entry, matched by partner name.
-- Cash lines stay untagged, as the current code posts them.
DO $$
DECLARE
  v_ambiguous integer;
  v_updated integer;
BEGIN
  SELECT count(*) INTO v_ambiguous
  FROM public.erp_partner_transactions t
  WHERE t.journal_entry_id IS NOT NULL
    AND (SELECT count(*) FROM public.erp_partner_profiles p WHERE p.name = t.partner_name) > 1;
  IF v_ambiguous > 0 THEN
    RAISE EXCEPTION 'partner name matches more than one profile for % transactions', v_ambiguous;
  END IF;

  UPDATE public.erp_journal_lines l
  SET partner_id = p.partner_id
  FROM public.erp_journal_entries e
  JOIN public.erp_partner_transactions t ON t.journal_entry_id::text = e.entry_id::text
  JOIN public.erp_partner_profiles p ON p.name = t.partner_name
  WHERE l.entry_id = e.entry_id
    AND e.source_module = 'CAPITAL_CALL'
    AND l.partner_id IS NULL
    AND ((t.type = 'CAPITAL_INJECTION' AND l.account_code = '301000')
      OR (t.type = 'PROFIT_DISTRIBUTION' AND l.account_code = '303000'));
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  -- Production had exactly 6 such lines when this was applied (2026-10-09).
  IF v_updated <> 6 THEN
    RAISE EXCEPTION 'expected 6 lines, got %', v_updated;
  END IF;
END $$;
