-- ============================================================================
-- Migration 018: Partner Milestone Commitments & Property Equity Splits
-- 
-- 1. Adds partner_splits JSONB to public.properties to permanently persist
--    stated project-level equity splits in PostgreSQL.
-- 2. Backfills known baseline splits for existing properties.
-- 3. Creates erp_partner_commitments table for tracking capital commitments
--    tied to construction milestones with due dates and payment tracking.
-- 4. Adds commitment_id to erp_partner_transactions for explicit settlement linkage.
-- 5. Hardens RLS (fail-closed, authenticated + service_role, anon revoked).
-- ============================================================================

-- ─── 1. Add partner_splits to properties ──────────────────────────────────────

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS partner_splits JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.properties.partner_splits IS 
  'Array of stated project partner equity splits: [{"partner_name": "...", "share_percentage": 35.00, "is_archived": false}]. Sum of active shares should equal 100%.';

-- Backfill established properties with their baseline stated splits
UPDATE public.properties
SET partner_splits = jsonb_build_array(
  jsonb_build_object('partner_name', 'زكريا فريد', 'share_percentage', 65.00, 'is_archived', false),
  jsonb_build_object('partner_name', 'م. أحمد الشريف', 'share_percentage', 35.00, 'is_archived', false)
)
WHERE (title_ar LIKE '%الشيخ زايد%' OR title_ar LIKE '%النرجس%' OR title_ar LIKE '%الفردوس%')
  AND (partner_splits IS NULL OR partner_splits = '[]'::jsonb);

UPDATE public.properties
SET partner_splits = jsonb_build_array(
  jsonb_build_object('partner_name', 'زكريا فريد', 'share_percentage', 75.00, 'is_archived', false),
  jsonb_build_object('partner_name', 'د. هاني المنياوي', 'share_percentage', 25.00, 'is_archived', false)
)
WHERE (title_ar LIKE '%الساحل%' OR title_ar LIKE '%هاسيندا%' OR title_ar LIKE '%الصفوة%')
  AND (partner_splits IS NULL OR partner_splits = '[]'::jsonb);

UPDATE public.properties
SET partner_splits = jsonb_build_array(
  jsonb_build_object('partner_name', 'زكريا فريد', 'share_percentage', 70.00, 'is_archived', false),
  jsonb_build_object('partner_name', 'الحاج رجب الصاوي', 'share_percentage', 30.00, 'is_archived', false)
)
WHERE (title_ar LIKE '%السخنة%' OR title_ar LIKE '%الجونة%' OR title_ar LIKE '%البحر الأحمر%')
  AND (partner_splits IS NULL OR partner_splits = '[]'::jsonb);

UPDATE public.properties
SET partner_splits = jsonb_build_array(
  jsonb_build_object('partner_name', 'زكريا فريد', 'share_percentage', 100.00, 'is_archived', false)
)
WHERE partner_splits IS NULL OR partner_splits = '[]'::jsonb;

-- ─── 2. Create erp_partner_commitments Table ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.erp_partner_commitments (
  commitment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  partner_name VARCHAR(255) NOT NULL,
  partner_id UUID REFERENCES public.erp_partner_profiles(partner_id) ON DELETE SET NULL,
  milestone_name VARCHAR(255) NOT NULL,
  milestone_phase VARCHAR(50),
  committed_amount NUMERIC(18,2) NOT NULL CHECK (committed_amount > 0),
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED')),
  notes TEXT,
  created_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_commitments_property ON public.erp_partner_commitments(property_id);
CREATE INDEX IF NOT EXISTS idx_partner_commitments_partner ON public.erp_partner_commitments(partner_name);
CREATE INDEX IF NOT EXISTS idx_partner_commitments_due_date ON public.erp_partner_commitments(due_date);
CREATE INDEX IF NOT EXISTS idx_partner_commitments_status ON public.erp_partner_commitments(status);

COMMENT ON TABLE public.erp_partner_commitments IS 
  'Scheduled partner capital commitments tied to construction milestones and due dates. Purely informational; zero automated dilution or penalties.';

-- ─── 3. Link transactions to commitments ───────────────────────────────────────

ALTER TABLE public.erp_partner_transactions
  ADD COLUMN IF NOT EXISTS commitment_id UUID REFERENCES public.erp_partner_commitments(commitment_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partner_tx_commitment ON public.erp_partner_transactions(commitment_id);

-- ─── 4. Security & RLS Hardening (Fail-Closed) ─────────────────────────────────

GRANT USAGE ON SCHEMA public TO authenticated, service_role;
REVOKE ALL ON TABLE public.erp_partner_commitments FROM anon;
GRANT ALL ON TABLE public.erp_partner_commitments TO authenticated, service_role;

ALTER TABLE public.erp_partner_commitments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "erp_auth_all_erp_partner_commitments" ON public.erp_partner_commitments;
CREATE POLICY "erp_auth_all_erp_partner_commitments" ON public.erp_partner_commitments
  FOR ALL TO authenticated
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "erp_service_all_erp_partner_commitments" ON public.erp_partner_commitments;
CREATE POLICY "erp_service_all_erp_partner_commitments" ON public.erp_partner_commitments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 5. Reload PostgREST schema cache ──────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
