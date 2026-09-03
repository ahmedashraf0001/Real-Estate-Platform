-- ═══════════════════════════════════════════════════════════
-- Migration 010: Building Properties Sales Modes & Unit Breakdown
-- Accommodates selling buildings as whole buildings OR individual apartments
-- ═══════════════════════════════════════════════════════════

-- 1. Add sales mode and unit breakdown columns to properties
ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS sale_mode TEXT DEFAULT 'both_flexible' 
    CHECK (sale_mode IN ('whole_building', 'individual_units', 'both_flexible')),
  ADD COLUMN IF NOT EXISTS total_units_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS building_units JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS parent_property_id UUID REFERENCES properties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_sale_mode ON properties(sale_mode);
CREATE INDEX IF NOT EXISTS idx_properties_parent_property_id ON properties(parent_property_id);

-- 2. Add building unit reference columns to erp_contracts
ALTER TABLE erp_contracts 
  ADD COLUMN IF NOT EXISTS is_whole_building_sale BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS building_unit_id TEXT,
  ADD COLUMN IF NOT EXISTS building_unit_number TEXT;

COMMENT ON COLUMN properties.sale_mode IS 'Sales strategy: whole_building (sold as whole block), individual_units (sold per apartment), or both_flexible (available either way)';
COMMENT ON COLUMN properties.building_units IS 'Array of apartment/unit specs inside the building: unit_id, unit_number, floor, area_sqm, bedrooms, price_egp, status';
COMMENT ON COLUMN properties.parent_property_id IS 'Points to the parent building property if this property is an apartment inside a building';
