-- Taxes are entered manually by the user (user-confirmed 2026-10-04).
-- Replace the fixed tax_type whitelist with a non-empty free-text check.
alter table public.erp_tax_records drop constraint if exists erp_tax_records_tax_type_check;
alter table public.erp_tax_records
  add constraint erp_tax_records_tax_type_check check (length(btrim(tax_type)) between 1 and 200);
