-- ═══════════════════════════════════════════════════════════
-- Add videos & video_url columns to properties table
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ═══════════════════════════════════════════════════════════

-- 1. Add video columns to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]'::jsonb;

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 2. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
