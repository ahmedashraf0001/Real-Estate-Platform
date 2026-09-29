-- Construction orders are unreceived commitments, separate from WIP and payables.
CREATE TABLE public.erp_construction_purchase_orders (
  order_id uuid PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  supplier_name text NOT NULL CHECK (length(btrim(supplier_name)) > 0),
  description text NOT NULL CHECK (length(btrim(description)) > 0),
  amount_egp numeric(18,2) NOT NULL CHECK (amount_egp > 0),
  order_date date NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status = 'DRAFT'),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX erp_construction_orders_property_date ON public.erp_construction_purchase_orders(property_id, order_date DESC);
ALTER TABLE public.erp_construction_purchase_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.erp_construction_purchase_orders FROM anon;
GRANT SELECT, INSERT ON public.erp_construction_purchase_orders TO authenticated;
GRANT ALL ON public.erp_construction_purchase_orders TO service_role;
CREATE POLICY construction_orders_read ON public.erp_construction_purchase_orders FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()));
CREATE POLICY construction_orders_create ON public.erp_construction_purchase_orders FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id));

ALTER TABLE public.erp_journal_entries ADD COLUMN construction_settlement_metadata jsonb;

-- Invoker rights preserve existing staff/project RLS. No history is rewritten.
CREATE OR REPLACE FUNCTION public.settle_construction_payable(
  p_item_id uuid, p_installment_id text, p_amount numeric, p_method text,
  p_payment_date date, p_period_id text, p_payment_id uuid,
  p_expected_paid numeric, p_notes text DEFAULT ''
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_cost public.erp_property_costs%ROWTYPE;
  v_period public.erp_accounting_periods%ROWTYPE;
  v_entry public.erp_journal_entries%ROWTYPE;
  v_installments jsonb;
  v_inst jsonb;
  v_next jsonb := '[]'::jsonb;
  v_found boolean := false;
  v_paid numeric(18,2);
  v_net numeric(18,2);
  v_rem numeric(18,2);
  v_inst_paid numeric(18,2);
  v_inst_total numeric(18,2);
  v_memo text;
  v_lines jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF p_payment_id IS NULL OR p_installment_id IS NULL OR length(btrim(p_installment_id)) = 0 OR p_payment_date IS NULL OR p_period_id IS NULL THEN
    RAISE EXCEPTION 'Payment identity, installment and date are required';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2) OR p_amount::text IN ('NaN','Infinity','-Infinity') THEN
    RAISE EXCEPTION 'Payment must be a positive finite amount with at most two decimals';
  END IF;
  IF p_method IS NULL OR p_method NOT IN ('CASH_101000', 'INSTAPAY_101000') THEN RAISE EXCEPTION 'Only cash and InstaPay through 101000 are permitted'; END IF;

  SELECT * INTO v_cost FROM public.erp_property_costs WHERE item_id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payable not found or inaccessible' USING ERRCODE = '42501'; END IF;
  IF v_cost.linked_account_code IS DISTINCT FROM '201000' THEN RAISE EXCEPTION 'This cost has no recognized accounts-payable source in 201000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = v_cost.property_id) THEN RAISE EXCEPTION 'Project not accessible' USING ERRCODE = '42501'; END IF;
  v_memo := (CASE WHEN p_method = 'INSTAPAY_101000' THEN 'إنستاباي' ELSE 'كاش بالخزينة' END) || ' • ' || COALESCE(v_cost.supplier_contractor, v_cost.item_name_ar) || ' • الخزينة 101000';

  SELECT * INTO v_entry FROM public.erp_journal_entries WHERE entry_id = p_payment_id;
  IF FOUND THEN
    IF v_entry.source_entity_id IS DISTINCT FROM p_item_id OR v_entry.entry_date IS DISTINCT FROM p_payment_date OR v_entry.description IS DISTINCT FROM v_memo
      OR v_entry.period_id IS DISTINCT FROM p_period_id
      OR v_entry.construction_settlement_metadata IS DISTINCT FROM jsonb_build_object('installment_id', p_installment_id, 'notes', p_notes)
      OR v_entry.created_by IS DISTINCT FROM auth.uid()::text
      OR NOT EXISTS (SELECT 1 FROM public.erp_journal_lines WHERE entry_id = p_payment_id AND account_code = '101000' AND credit_amount = p_amount) THEN
      RAISE EXCEPTION 'Payment identity already belongs to a different transaction';
    END IF;
    SELECT jsonb_agg(to_jsonb(l) ORDER BY line_number) INTO v_lines FROM public.erp_journal_lines l WHERE entry_id = p_payment_id;
    RETURN jsonb_build_object('item', to_jsonb(v_cost), 'journal', to_jsonb(v_entry) || jsonb_build_object('lines', v_lines));
  END IF;

  SELECT * INTO v_period FROM public.erp_accounting_periods WHERE period_id = p_period_id FOR SHARE;
  IF NOT FOUND OR v_period.status <> 'OPEN' OR p_payment_date < v_period.start_date OR p_payment_date > v_period.end_date THEN
    RAISE EXCEPTION 'Payment date must fall within an open accounting period';
  END IF;
  v_installments := COALESCE(v_cost.payable_installments, '[]'::jsonb);
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_installments) i GROUP BY i->>'installment_id' HAVING count(*) > 1) THEN RAISE EXCEPTION 'Duplicate installment identifiers'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_installments) i WHERE i->>'installment_id' IS NULL OR i->>'amount_egp' IS NULL OR (i->>'amount_egp')::numeric <= 0 OR (i->>'amount_egp')::numeric::text IN ('NaN','Infinity','-Infinity') OR COALESCE((i->>'paid_amount_egp')::numeric,0) < 0 OR COALESCE((i->>'paid_amount_egp')::numeric,0)::text IN ('NaN','Infinity','-Infinity')) THEN RAISE EXCEPTION 'Invalid installment totals'; END IF;
  v_net := greatest(0, COALESCE(v_cost.total_cost_egp, 0) + COALESCE((
    SELECT sum(CASE a->>'adjustment_type' WHEN 'SUPPLEMENT_UNDERPAYMENT' THEN abs((a->>'amount_egp')::numeric) WHEN 'REFUND_OVERPAYMENT' THEN -abs((a->>'amount_egp')::numeric) ELSE 0 END)
    FROM jsonb_array_elements(COALESCE(v_cost.adjustments, '[]'::jsonb)) a), 0));
  v_paid := CASE WHEN jsonb_array_length(v_installments) > 0 THEN
    (SELECT COALESCE(sum(COALESCE((i->>'paid_amount_egp')::numeric, 0)), 0) FROM jsonb_array_elements(v_installments) i)
    ELSE COALESCE(v_cost.paid_amount_egp, CASE WHEN v_cost.payment_term = 'FULL_CASH' OR v_cost.payment_term IS NULL THEN v_net ELSE 0 END) END;
  v_rem := greatest(0, v_net - v_paid);
  IF p_expected_paid IS NULL OR v_paid <> p_expected_paid THEN RAISE EXCEPTION 'Payable changed since it was opened; refresh before paying' USING ERRCODE = '40001'; END IF;
  IF p_amount > v_rem THEN RAISE EXCEPTION 'Payment exceeds outstanding liability'; END IF;

  -- Preserve paid opening balances that were recorded before any schedule existed.
  IF jsonb_array_length(v_installments) = 0 AND v_paid > 0 THEN
    v_next := jsonb_build_array(jsonb_build_object('installment_id', 'inst-prior-' || p_item_id, 'cost_item_id', p_item_id, 'installment_number', 0, 'title_ar', 'الدفعة المسددة مسبقاً', 'due_date', v_cost.logged_date, 'amount_egp', v_paid::text, 'paid_amount_egp', v_paid::text, 'status', 'PAID', 'payment_date', v_cost.logged_date));
  END IF;
  FOR v_inst IN SELECT value FROM jsonb_array_elements(v_installments) LOOP
    IF v_inst->>'installment_id' = p_installment_id THEN
      v_found := true;
      v_inst_paid := COALESCE((v_inst->>'paid_amount_egp')::numeric, 0);
      v_inst_total := (v_inst->>'amount_egp')::numeric;
      IF p_amount > greatest(0, v_inst_total - v_inst_paid) THEN RAISE EXCEPTION 'Payment exceeds installment balance'; END IF;
      v_inst := v_inst || jsonb_build_object('paid_amount_egp', (v_inst_paid + p_amount)::text, 'status', CASE WHEN v_inst_paid + p_amount >= v_inst_total THEN 'PAID' ELSE 'PARTIALLY_PAID' END, 'payment_date', p_payment_date, 'payment_method', p_method, 'treasury_account_code', '101000', 'payment_id', p_payment_id, 'notes', p_notes);
    END IF;
    v_next := v_next || jsonb_build_array(v_inst);
  END LOOP;
  IF NOT v_found THEN
    -- Direct settlement is permitted only on an invoice without pending scheduled tranches.
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_installments) i WHERE COALESCE((i->>'amount_egp')::numeric, 0) > COALESCE((i->>'paid_amount_egp')::numeric, 0)) THEN RAISE EXCEPTION 'Select an existing pending installment'; END IF;
    v_next := v_next || jsonb_build_array(jsonb_build_object('installment_id', p_installment_id, 'cost_item_id', p_item_id, 'installment_number', jsonb_array_length(v_next) + 1, 'title_ar', 'سداد مستحقات مباشرة', 'due_date', p_payment_date, 'amount_egp', v_rem::text, 'paid_amount_egp', p_amount::text, 'status', CASE WHEN p_amount >= v_rem THEN 'PAID' ELSE 'PARTIALLY_PAID' END, 'payment_date', p_payment_date, 'payment_method', p_method, 'treasury_account_code', '101000', 'payment_id', p_payment_id, 'notes', p_notes));
  END IF;

  INSERT INTO public.erp_journal_entries(entry_id, entry_number, entry_date, period_id, description, source_module, source_entity_id, created_by, is_locked, construction_settlement_metadata)
    VALUES (p_payment_id, 'AP-' || p_payment_id, p_payment_date, p_period_id, v_memo, 'MANUAL_ADJUSTMENT', p_item_id, auth.uid()::text, true, jsonb_build_object('installment_id', p_installment_id, 'notes', p_notes)) RETURNING * INTO v_entry;
  INSERT INTO public.erp_journal_lines(entry_id, line_number, account_code, debit_amount, credit_amount, memo) VALUES
    (p_payment_id, 1, '201000', p_amount, 0, v_memo), (p_payment_id, 2, '101000', 0, p_amount, v_memo);
  UPDATE public.erp_property_costs SET payable_installments = v_next, paid_amount_egp = v_paid + p_amount,
    remaining_amount_egp = greatest(0, v_rem - p_amount), net_effective_cost_egp = v_net, updated_at = now()
    WHERE item_id = p_item_id RETURNING * INTO v_cost;
  SELECT jsonb_agg(to_jsonb(l) ORDER BY line_number) INTO v_lines FROM public.erp_journal_lines l WHERE entry_id = p_payment_id;
  RETURN jsonb_build_object('item', to_jsonb(v_cost), 'journal', to_jsonb(v_entry) || jsonb_build_object('lines', v_lines));
END;
$$;
REVOKE ALL ON FUNCTION public.settle_construction_payable(uuid,text,numeric,text,date,text,uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_construction_payable(uuid,text,numeric,text,date,text,uuid,numeric,text) TO authenticated;

-- Only new settlement journals are affected; existing legacy journal workflows remain intact.
CREATE OR REPLACE FUNCTION public.protect_construction_settlement_journal() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_TABLE_NAME = 'erp_journal_entries' THEN
    IF OLD.construction_settlement_metadata IS NOT NULL THEN RAISE EXCEPTION 'Posted construction settlements are immutable'; END IF;
  ELSIF EXISTS (SELECT 1 FROM public.erp_journal_entries WHERE entry_id = OLD.entry_id AND construction_settlement_metadata IS NOT NULL) THEN
    RAISE EXCEPTION 'Posted construction settlement lines are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER construction_settlement_entries_immutable BEFORE UPDATE OR DELETE ON public.erp_journal_entries FOR EACH ROW EXECUTE FUNCTION public.protect_construction_settlement_journal();
CREATE TRIGGER construction_settlement_lines_immutable BEFORE UPDATE OR DELETE ON public.erp_journal_lines FOR EACH ROW EXECUTE FUNCTION public.protect_construction_settlement_journal();

-- Deferred checks inspect the complete journal after both lines are inserted.
CREATE OR REPLACE FUNCTION public.check_construction_settlement_balance() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_id uuid := CASE WHEN TG_TABLE_NAME = 'erp_journal_entries' THEN NEW.entry_id ELSE COALESCE(NEW.entry_id, OLD.entry_id) END;
  v_count integer;
  v_debits numeric;
  v_credits numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM public.erp_journal_entries WHERE entry_id = v_id AND construction_settlement_metadata IS NOT NULL) THEN
    SELECT count(*), sum(debit_amount), sum(credit_amount) INTO v_count, v_debits, v_credits FROM public.erp_journal_lines WHERE entry_id = v_id;
    IF v_count <> 2 OR v_debits <= 0 OR v_debits <> v_credits OR NOT EXISTS (SELECT 1 FROM public.erp_journal_lines WHERE entry_id = v_id AND account_code = '201000' AND debit_amount = v_debits AND credit_amount = 0) OR NOT EXISTS (SELECT 1 FROM public.erp_journal_lines WHERE entry_id = v_id AND account_code = '101000' AND credit_amount = v_credits AND debit_amount = 0) THEN RAISE EXCEPTION 'Construction settlement requires exactly balanced 201000 debit and 101000 credit'; END IF;
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER construction_settlement_entry_balanced AFTER INSERT ON public.erp_journal_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_construction_settlement_balance();
CREATE CONSTRAINT TRIGGER construction_settlement_lines_balanced AFTER INSERT OR UPDATE OR DELETE ON public.erp_journal_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_construction_settlement_balance();
