-- ═══════════════════════════════════════════════════════════
-- Zakaria Farid Real Estate — Database Schema
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ─── Extensions ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Types ───────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE property_type AS ENUM ('villa', 'apartment', 'townhouse', 'duplex', 'chalet');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE completion_status AS ENUM ('ready', 'off_plan');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('active', 'under_offer', 'sold');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── Properties ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug               TEXT NOT NULL UNIQUE,
  title_en           TEXT NOT NULL,
  title_ar           TEXT NOT NULL,
  description_en     TEXT NOT NULL DEFAULT '',
  description_ar     TEXT NOT NULL DEFAULT '',
  price_egp          NUMERIC(14, 2) NOT NULL,
  bedrooms           INTEGER NOT NULL DEFAULT 0,
  bathrooms          INTEGER NOT NULL DEFAULT 0,
  area_sqm           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  type               property_type NOT NULL DEFAULT 'apartment',
  location           TEXT NOT NULL,
  latitude           DOUBLE PRECISION,
  longitude          DOUBLE PRECISION,
  completion_status  completion_status NOT NULL DEFAULT 'ready',
  listing_status     listing_status NOT NULL DEFAULT 'active',
  is_featured        BOOLEAN NOT NULL DEFAULT FALSE,
  view               TEXT,
  floor_number       INTEGER,
  spec_layers        JSONB DEFAULT '[]'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_slug            ON properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_listing_status  ON properties(listing_status);
CREATE INDEX IF NOT EXISTS idx_properties_is_featured     ON properties(is_featured);
CREATE INDEX IF NOT EXISTS idx_properties_type            ON properties(type);

-- ─── Property Images ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_images (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  alt_text_en     TEXT,
  alt_text_ar     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);

-- ─── Property Amenities ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_amenities (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amenity_en   TEXT NOT NULL,
  amenity_ar   TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_property_amenities_property_id ON property_amenities(property_id);

-- ─── Leads ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id  UUID REFERENCES properties(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  email        TEXT,
  phone        TEXT NOT NULL,
  message      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_property_id ON leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at  ON leads(created_at DESC);

-- ─── Row-Level Security ───────────────────────────────────────────
-- Properties: public read, authenticated write
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active properties" ON properties;
CREATE POLICY "Public can read active properties"
  ON properties FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage properties" ON properties;
CREATE POLICY "Authenticated users can manage properties"
  ON properties FOR ALL
  USING (auth.role() = 'authenticated');

-- Property images: public read, authenticated write
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read property images" ON property_images;
CREATE POLICY "Public can read property images"
  ON property_images FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage property images" ON property_images;
CREATE POLICY "Authenticated users can manage property images"
  ON property_images FOR ALL
  USING (auth.role() = 'authenticated');

-- Property amenities: public read, authenticated write
ALTER TABLE property_amenities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read amenities" ON property_amenities;
CREATE POLICY "Public can read amenities"
  ON property_amenities FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage amenities" ON property_amenities;
CREATE POLICY "Authenticated users can manage amenities"
  ON property_amenities FOR ALL
  USING (auth.role() = 'authenticated');

-- Leads: public insert, authenticated read
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can insert leads" ON leads;
CREATE POLICY "Public can insert leads"
  ON leads FOR INSERT
  WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can read leads" ON leads;
CREATE POLICY "Authenticated users can read leads"
  ON leads FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─── Storage bucket for property images ──────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: public read
DROP POLICY IF EXISTS "Public read property images" ON storage.objects;
CREATE POLICY "Public read property images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

-- Storage policy: authenticated upload/delete
DROP POLICY IF EXISTS "Authenticated upload property images" ON storage.objects;
CREATE POLICY "Authenticated upload property images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete property images" ON storage.objects;
CREATE POLICY "Authenticated delete property images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

-- ─── Seed: Sample properties (for dev) ───────────────────────────
INSERT INTO properties (slug, title_en, title_ar, description_en, description_ar, price_egp, bedrooms, bathrooms, area_sqm, type, location, latitude, longitude, completion_status, listing_status, is_featured, finishing, furnishing, view, floor_number)
VALUES
  (
    'villa-sheikh-zayed-beverly-hills',
    'Luxury Villa in Beverly Hills, Sheikh Zayed',
    'فيلا فاخرة في بيفرلي هيلز، الشيخ زايد',
    'A stunning standalone villa in one of Sheikh Zayed''s most prestigious compounds. Features a private garden, swimming pool, and premium finishes throughout.',
    'فيلا مستقلة رائعة في أحد أرقى كمبوندات الشيخ زايد. تتميز بحديقة خاصة وحمام سباحة وتشطيبات فاخرة.',
    15000000, 5, 4, 450, 'villa', 'Sheikh Zayed', 30.0444, 31.2357, 'ready', 'active', true,
    'fully_finished', 'furnished', 'Pool and Garden View', 0
  ),
  (
    'apartment-new-cairo-fifth-settlement',
    'Spacious Apartment in Fifth Settlement, New Cairo',
    'شقة واسعة في التجمع الخامس، القاهرة الجديدة',
    'A beautifully finished apartment in the heart of the Fifth Settlement. Close to international schools, malls, and the American University.',
    'شقة جميلة التشطيب في قلب التجمع الخامس. قريبة من المدارس الدولية والمراكز التجارية والجامعة الأمريكية.',
    4500000, 3, 2, 185, 'apartment', 'New Cairo', 30.0131, 31.4381, 'ready', 'active', true,
    'fully_finished', 'unfurnished', 'Main Road View', 3
  ),
  (
    'townhouse-compound-sheikh-zayed',
    'Modern Townhouse in Westown, Sheikh Zayed',
    'تاون هاوس عصري في ويست تاون، الشيخ زايد',
    'A contemporary townhouse in the sought-after Westown Residences. Bright interiors, a private backyard, and access to world-class amenities.',
    'تاون هاوس عصري في ويست تاون ريزيدنسز. تصميم داخلي مشرق وحديقة خاصة ووصول لمرافق عالمية المستوى.',
    8500000, 4, 3, 280, 'townhouse', 'Sheikh Zayed', 30.0600, 31.1800, 'ready', 'active', true,
    'semi_finished', 'unfurnished', 'Landscape View', 0
  ),
  (
    'chalet-north-coast-sidi-abdel-rahman',
    'Beachfront Chalet, Sidi Abdel Rahman',
    'شاليه على الشاطئ، سيدي عبد الرحمن',
    'A premium chalet directly on the beach at Sidi Abdel Rahman with crystal-clear Mediterranean views. Fully furnished, ready to move in.',
    'شاليه فاخر مباشرة على الشاطئ في سيدي عبد الرحمن مع إطلالات رائعة على البحر المتوسط. مفروش بالكامل وجاهز للسكن.',
    6200000, 3, 2, 150, 'chalet', 'North Coast', 31.0200, 28.3400, 'ready', 'active', false,
    'fully_finished', 'furnished', 'Direct Sea View', 1
  )
ON CONFLICT (slug) DO NOTHING;
