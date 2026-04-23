-- ── ADD TO EXISTING SCHEMA ───────────────────────────────────────────────────
-- Run this in Supabase SQL Editor (safe to run on existing project)

CREATE TABLE IF NOT EXISTS pending_registrations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT        NOT NULL UNIQUE,
  full_name    TEXT        NOT NULL,
  role         TEXT        NOT NULL CHECK (role IN ('supervisor','officer')),
  password_hash TEXT       NOT NULL,
  status       TEXT        DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  review_note  TEXT,
  org_id       UUID        REFERENCES organisations(id) ON DELETE SET NULL,  -- set on approval
  zone_id      UUID        REFERENCES zones(id) ON DELETE SET NULL,          -- set on approval (officers)
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pendreg_status ON pending_registrations(status);
CREATE INDEX IF NOT EXISTS idx_pendreg_role   ON pending_registrations(role);

-- RLS
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (self-register)
CREATE POLICY "pendreg_insert" ON pending_registrations FOR INSERT WITH CHECK (true);

-- Super admin sees all; supervisors see officer registrations only
CREATE POLICY "pendreg_select" ON pending_registrations FOR SELECT
  USING (is_super_admin() OR my_role() = 'supervisor');

-- Super admin approves supervisors; supervisors approve officers
CREATE POLICY "pendreg_update" ON pending_registrations FOR UPDATE
  USING (is_super_admin() OR (my_role() = 'supervisor' AND role = 'officer'));

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE pending_registrations;
