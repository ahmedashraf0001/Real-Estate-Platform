-- Private viewing bookings created from Cal.com webhooks.
-- One lead per unique buyer (matched by email/phone); a lead can hold many
-- bookings, one per Cal.com booking UID (idempotent upsert key).

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  calcom_uid TEXT NOT NULL UNIQUE,
  agent_ref TEXT,
  event_type_slug TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'viewing_scheduling_request',
  attendee_name TEXT,
  attendee_email TEXT,
  attendee_phone TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_lead_id ON bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time DESC);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read bookings" ON bookings;
CREATE POLICY "Authenticated users can read bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage bookings" ON bookings;
CREATE POLICY "Authenticated users can manage bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Per-property Cal.com event link (which agent's event type handles viewings
-- for this listing). Falls back to NEXT_PUBLIC_CALCOM_DEFAULT_LINK in the app.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS calcom_event_link TEXT;
