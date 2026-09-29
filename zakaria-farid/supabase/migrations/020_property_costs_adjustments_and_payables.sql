-- ============================================================================
-- 020_property_costs_adjustments_and_payables.sql
-- Description: Reconcile erp_property_costs with frontend adjustments and payables schema
-- Adds missing columns: payment_term, paid_amount_egp, remaining_amount_egp,
-- due_date, payable_installments, adjustments, net_effective_cost_egp, is_locked, updated_at.
-- ============================================================================

-- 1. Add missing payables and adjustment columns to erp_property_costs
ALTER TABLE IF EXISTS public.erp_property_costs
  ADD COLUMN IF NOT EXISTS payment_term VARCHAR(50) DEFAULT 'FULL_CASH',
  ADD COLUMN IF NOT EXISTS paid_amount_egp NUMERIC(18,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS remaining_amount_egp NUMERIC(18,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS payable_installments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS adjustments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS net_effective_cost_egp NUMERIC(18,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Backfill existing historical rows
UPDATE public.erp_property_costs
SET 
  net_effective_cost_egp = COALESCE(total_cost_egp, 0.00),
  paid_amount_egp = COALESCE(total_cost_egp, 0.00),
  remaining_amount_egp = 0.00,
  payment_term = 'FULL_CASH',
  payable_installments = COALESCE(payable_installments, '[]'::jsonb),
  adjustments = COALESCE(adjustments, '[]'::jsonb),
  updated_at = NOW()
WHERE net_effective_cost_egp = 0.00 OR net_effective_cost_egp IS NULL;

-- 3. Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_erp_property_costs_due_date ON public.erp_property_costs(due_date);
CREATE INDEX IF NOT EXISTS idx_erp_property_costs_payment_term ON public.erp_property_costs(payment_term);
