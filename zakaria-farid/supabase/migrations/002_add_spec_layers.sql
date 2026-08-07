-- ═══════════════════════════════════════════════════════════
-- Add spec_layers JSONB column to properties table
-- Run in Supabase SQL Editor if not already applied
-- ═══════════════════════════════════════════════════════════

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS spec_layers JSONB DEFAULT '[]'::jsonb;
