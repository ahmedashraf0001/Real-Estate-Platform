-- ─── Site Settings Table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT UNIQUE NOT NULL,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Public read, authenticated admin write
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read site settings" ON site_settings;
CREATE POLICY "Public can read site settings"
  ON site_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage site settings" ON site_settings;
CREATE POLICY "Authenticated users can manage site settings"
  ON site_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Default Accent Color
INSERT INTO site_settings (key, value)
VALUES ('accent_color', '#C9A96A')
ON CONFLICT (key) DO NOTHING;
