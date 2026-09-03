-- Migration 011: Manual Apartment Taxes & Dynamic Pricing
-- Taxes are entered by hand per apartment, non-static, and calculated in final contract pricing.

-- 1. Relax tax_type check constraint in erp_tax_records to allow custom manual apartment taxes
ALTER TABLE IF EXISTS erp_tax_records DROP CONSTRAINT IF EXISTS erp_tax_records_tax_type_check;
ALTER TABLE IF EXISTS erp_tax_records ALTER COLUMN tax_type TYPE VARCHAR(100);

-- 2. Add base_price, tax_amount, tax_description to erp_contracts if not present
ALTER TABLE IF EXISTS erp_contracts ADD COLUMN IF NOT EXISTS base_price NUMERIC(18,2);
ALTER TABLE IF EXISTS erp_contracts ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0.00;
ALTER TABLE IF EXISTS erp_contracts ADD COLUMN IF NOT EXISTS tax_description TEXT;

-- 3. Document JSONB field building_units tax support
COMMENT ON COLUMN properties.building_units IS 'Array of apartment/unit specs: unit_id, unit_number, floor, area_sqm, bedrooms, price_egp, tax_amount_egp, tax_description, status';
