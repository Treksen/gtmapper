-- ═══════════════════════════════════════════════════════════════════════════
-- GT MAPPER · ADDITIONS (run after gtmapper_schema.sql)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Pending registrations ────────────────────────────────────────────────────
-- Users who self-register land here until approved by admin/supervisor.

CREATE TABLE IF NOT EXISTS pending_registrations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  role         TEXT        NOT NULL CHECK (role IN ('supervisor','officer')),
  org_id       UUID        REFERENCES organisations(id) ON DELETE SET NULL,
  zone_id      UUID        REFERENCES zones(id) ON DELETE SET NULL,
  status       TEXT        DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  review_note  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ
);

ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert their own registration
CREATE POLICY "pr_insert" ON pending_registrations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- User can read their own; supervisors/admins can read their org's
CREATE POLICY "pr_select" ON pending_registrations FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_super_admin()
    OR (org_id = my_org_id() AND my_role() = 'supervisor')
  );

-- Only admin/supervisor can update (approve/reject)
CREATE POLICY "pr_update" ON pending_registrations FOR UPDATE
  USING (is_super_admin() OR (my_role() = 'supervisor' AND org_id = my_org_id()));

-- Add to realtime so approval is instant
ALTER PUBLICATION supabase_realtime ADD TABLE pending_registrations;

-- ── Offline queue table ───────────────────────────────────────────────────────
-- Stores locally-queued submissions that haven't synced yet (server-side mirror)
-- The real offline queue lives in localStorage; this table receives them on sync.
-- No changes needed — form_submissions already serves this purpose.
-- Status 'submitted' = synced. The offline queue is purely frontend (localStorage).

-- ── Add 'awaiting_approval' active flag to profiles ───────────────────────────
-- Profiles created via self-register start as active=false until approved.
-- This is already supported by profiles.active boolean.
-- No schema change needed.
