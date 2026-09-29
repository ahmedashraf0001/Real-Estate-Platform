-- Migration 019: Drop legacy, defective erp_partner_calls table
-- Superseded by erp_partner_commitments in migration 018.
-- Table contained 0 rows and lacked property_id, due_date, and milestone anchors.

DROP TABLE IF EXISTS public.erp_partner_calls CASCADE;
