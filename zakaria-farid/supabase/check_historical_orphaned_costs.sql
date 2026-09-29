-- ============================================================================
-- check_historical_orphaned_costs.sql
-- Description: Audit Query to Detect Orphaned WIP Journal Entries Missing in erp_property_costs
-- Run this in the Supabase SQL Editor to inspect records needing backfilling.
-- ============================================================================

SELECT 
  je.entry_id,
  je.entry_number,
  je.entry_date,
  je.description,
  je.source_module,
  je.source_entity_id AS property_or_source_id,
  jl.account_code,
  jl.debit_amount,
  jl.memo
FROM erp_journal_entries je
JOIN erp_journal_lines jl ON jl.entry_id = je.entry_id
WHERE (
  jl.account_code IN ('150000', '151000', '152000', '153000') 
  OR je.source_module = 'WIP_ALLOCATION'
)
AND CAST(jl.debit_amount AS NUMERIC) > 0
AND NOT EXISTS (
  SELECT 1 
  FROM erp_property_costs pc
  WHERE pc.invoice_ref = je.entry_number
     OR pc.item_id::text = je.source_entity_id::text
     OR (
       pc.logged_date = je.entry_date 
       AND CAST(pc.total_cost_egp AS NUMERIC) = CAST(jl.debit_amount AS NUMERIC)
       AND (je.source_entity_id IS NULL OR pc.property_id::text = je.source_entity_id::text)
     )
)
ORDER BY je.entry_date DESC;
