-- ============================================================================
-- 009_property_lifecycle_costs.sql
-- Description: Property Material & Lifecycle Cost Auditing (بنود التكاليف ومواد البناء)
-- Tracks every material, contractor, permit, and finishing expense logged throughout
-- the entire construction and development lifecycle of each real estate property.
-- ============================================================================

CREATE TABLE IF NOT EXISTS erp_property_costs (
  item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL CHECK (
    category IN (
      'civil_structure',
      'mep_infrastructure',
      'finishing_interior',
      'site_facade',
      'permits_engineering',
      'land_allocation',
      'labor_subcontractor'
    )
  ),
  phase VARCHAR(50) NOT NULL CHECK (
    phase IN (
      'planning_permits',
      'excavation_foundation',
      'structural_skeleton',
      'masonry_roughing',
      'finishing_interiors',
      'final_inspection_handover'
    )
  ),
  item_name_ar VARCHAR(200) NOT NULL,
  item_name_en VARCHAR(200) NOT NULL,
  supplier_contractor VARCHAR(150),
  invoice_ref VARCHAR(100),
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit VARCHAR(50) NOT NULL DEFAULT 'مقطوعية',
  unit_cost_egp NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  total_cost_egp NUMERIC(18,2) NOT NULL DEFAULT 0.00,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  linked_account_code VARCHAR(10) DEFAULT '151000' REFERENCES erp_accounts(account_code),
  status VARCHAR(20) NOT NULL DEFAULT 'verified' CHECK (status IN ('verified', 'pending_audit', 'capitalized')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast property lookups and phase filtering
CREATE INDEX IF NOT EXISTS idx_erp_property_costs_prop ON erp_property_costs(property_id);
CREATE INDEX IF NOT EXISTS idx_erp_property_costs_cat ON erp_property_costs(category);
CREATE INDEX IF NOT EXISTS idx_erp_property_costs_phase ON erp_property_costs(phase);

-- Grant privileges to authenticated, anon, and service_role
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON TABLE erp_property_costs TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Enable RLS and create policy for authenticated administrators
ALTER TABLE erp_property_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "erp_auth_all_erp_property_costs" ON erp_property_costs;
CREATE POLICY "erp_auth_all_erp_property_costs" ON erp_property_costs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "erp_service_all_erp_property_costs" ON erp_property_costs;
CREATE POLICY "erp_service_all_erp_property_costs" ON erp_property_costs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
