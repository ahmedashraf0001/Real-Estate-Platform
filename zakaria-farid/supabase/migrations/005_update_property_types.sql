-- ═══════════════════════════════════════════════════════════
-- Migration 005: Update property_type enum with 'building' and 'garage'
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor)
-- ═══════════════════════════════════════════════════════════

ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'building';
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'garage';
