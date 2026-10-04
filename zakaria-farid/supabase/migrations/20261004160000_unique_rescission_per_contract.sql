-- A contract can be rescinded only once (E2E found a double-post from a stale modal).
create unique index if not exists erp_rescissions_contract_id_key on public.erp_rescissions (contract_id);
