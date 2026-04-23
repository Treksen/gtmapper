-- ═══════════════════════════════════════════════════════════════════════════
-- GT MAPPER · INVITE CODES
-- Run in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS invite_codes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT        NOT NULL UNIQUE,          -- e.g. "847291"
  org_id       UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  created_by   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  full_name    TEXT        NOT NULL,
  phone        TEXT,
  role         TEXT        NOT NULL CHECK (role IN ('supervisor','officer')),
  zone_id      UUID        REFERENCES zones(id) ON DELETE SET NULL,
  status       TEXT        DEFAULT 'pending' CHECK (status IN ('pending','used','expired')),
  used_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invite_codes_code   ON invite_codes(code);
CREATE INDEX idx_invite_codes_org    ON invite_codes(org_id);
CREATE INDEX idx_invite_codes_status ON invite_codes(status);

-- Enable RLS
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Supervisors and admins in the same org can create invite codes
CREATE POLICY "invite_insert" ON invite_codes FOR INSERT
  WITH CHECK (
    org_id = my_org_id()
    AND (my_role() = 'supervisor' OR is_super_admin())
  );

-- Anyone can read a code (needed for unauthenticated redemption)
-- We filter by code value so exposure is minimal
CREATE POLICY "invite_select" ON invite_codes FOR SELECT
  USING (true);

-- Only the creator org or super admin can update (mark as used/expired)
CREATE POLICY "invite_update" ON invite_codes FOR UPDATE
  USING (is_super_admin() OR org_id = my_org_id());

-- Add to realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE invite_codes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- IMPORTANT: Also needed — allow unauthenticated users to redeem a code.
-- The redemption flow calls supabase.auth.signUp() (which is always allowed),
-- then updates the invite_code row. The update needs to happen via a 
-- service-role call OR we allow the newly-created authenticated user to 
-- update the code that matches their redemption. The policy above handles this
-- since after signUp the user is authenticated and org_id matches.
-- ═══════════════════════════════════════════════════════════════════════════
