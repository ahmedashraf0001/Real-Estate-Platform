-- ============================================================================
-- 012_property_cost_taxes_and_units.sql
-- Description: Enable Unit-Specific Construction Costs and Taxes & Fees (بنود الضرائب وتكاليف الوحدات)
-- Taxes and fees paid during construction are part of the property's construction بنود
-- and can be attributed to the entire property or a specific apartment unit.
-- ============================================================================

-- 1. Add building_unit_id and unit_number to erp_property_costs
ALTER TABLE IF EXISTS erp_property_costs 
ADD COLUMN IF NOT EXISTS building_unit_id TEXT,
ADD COLUMN IF NOT EXISTS unit_number TEXT;

-- 2. Expand category constraint to support 'taxes_fees'
ALTER TABLE IF EXISTS erp_property_costs 
DROP CONSTRAINT IF EXISTS erp_property_costs_category_check;

ALTER TABLE IF EXISTS erp_property_costs 
ADD CONSTRAINT erp_property_costs_category_check CHECK (
  category IN (
    'civil_structure',
    'mep_infrastructure',
    'finishing_interior',
    'site_facade',
    'permits_engineering',
    'land_allocation',
    'labor_subcontractor',
    'taxes_fees'
  )
);

CREATE INDEX IF NOT EXISTS idx_erp_property_costs_unit ON erp_property_costs(building_unit_id);
