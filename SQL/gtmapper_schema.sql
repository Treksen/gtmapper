-- ═══════════════════════════════════════════════════════════════════════════
-- GT MAPPER · COMPLETE SCHEMA
-- Safe to run on a fresh OR existing Supabase project.
-- Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. DROP EVERYTHING ──────────────────────────────────────────────────────

DROP TABLE IF EXISTS form_submissions  CASCADE;
DROP TABLE IF EXISTS forms             CASCADE;
DROP TABLE IF EXISTS audit_log         CASCADE;
DROP TABLE IF EXISTS pending_actions   CASCADE;
DROP TABLE IF EXISTS announcements     CASCADE;
DROP TABLE IF EXISTS notifications     CASCADE;
DROP TABLE IF EXISTS officer_locations CASCADE;
DROP TABLE IF EXISTS visits            CASCADE;
DROP TABLE IF EXISTS profiles          CASCADE;
DROP TABLE IF EXISTS zones             CASCADE;
DROP TABLE IF EXISTS organisations     CASCADE;

DROP FUNCTION IF EXISTS is_super_admin()                               CASCADE;
DROP FUNCTION IF EXISTS my_org_id()                                    CASCADE;
DROP FUNCTION IF EXISTS my_role()                                      CASCADE;
DROP FUNCTION IF EXISTS handle_new_user()                              CASCADE;
DROP FUNCTION IF EXISTS enforce_super_admin_cap()                      CASCADE;
DROP FUNCTION IF EXISTS create_platform_user(TEXT,TEXT,TEXT,TEXT,UUID) CASCADE;

DROP POLICY IF EXISTS "form_photos_upload" ON storage.objects;
DROP POLICY IF EXISTS "form_photos_select" ON storage.objects;

-- ── 2. EXTENSIONS ───────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 3. TABLES ───────────────────────────────────────────────────────────────

CREATE TABLE organisations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE,
  country     TEXT        DEFAULT 'Kenya',
  description TEXT,
  status      TEXT        DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE zones (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID             NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name         TEXT             NOT NULL,
  description  TEXT,
  daily_target INTEGER          DEFAULT 20,
  color        TEXT             DEFAULT '#0a5c47',
  boundary     JSONB,
  center_lat   DOUBLE PRECISION,
  center_lng   DOUBLE PRECISION,
  active       BOOLEAN          DEFAULT true,
  created_at   TIMESTAMPTZ      DEFAULT NOW()
);

CREATE TABLE profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id       UUID        REFERENCES organisations(id) ON DELETE SET NULL,
  full_name    TEXT        NOT NULL,
  phone        TEXT,
  role         TEXT        NOT NULL CHECK (role IN ('super_admin','supervisor','officer')),
  zone_id      UUID        REFERENCES zones(id) ON DELETE SET NULL,
  avatar_url   TEXT,
  active       BOOLEAN     DEFAULT true,
  is_online    BOOLEAN     DEFAULT false,
  last_seen_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE visits (
  id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id       UUID             REFERENCES profiles(id) ON DELETE SET NULL,
  officer_name     TEXT,
  zone_id          UUID             REFERENCES zones(id) ON DELETE SET NULL,
  zone_name        TEXT,
  org_id           UUID             REFERENCES organisations(id) ON DELETE SET NULL,
  lat              DOUBLE PRECISION NOT NULL,
  lng              DOUBLE PRECISION NOT NULL,
  gps_accuracy     DOUBLE PRECISION,
  location_name    TEXT,
  beneficiary_type TEXT,
  visit_purpose    TEXT,
  outcome          TEXT             CHECK (outcome IN ('Completed','No show','Referred','Follow-up needed')),
  duration_minutes INTEGER,
  notes            TEXT,
  household_name   TEXT,
  household_id     TEXT,
  beneficiary_age  INTEGER,
  beneficiary_sex  TEXT             CHECK (beneficiary_sex IN ('Male','Female','Other')),
  health_condition TEXT,
  medications      TEXT,
  next_visit_date  DATE,
  referred_to      TEXT,
  visit_date       DATE             DEFAULT CURRENT_DATE,
  visited_at       TIMESTAMPTZ      DEFAULT NOW(),
  created_at       TIMESTAMPTZ      DEFAULT NOW()
);

CREATE TABLE officer_locations (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id  UUID             NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  accuracy    DOUBLE PRECISION,
  status      TEXT             DEFAULT 'active' CHECK (status IN ('active','inactive','offline')),
  recorded_at TIMESTAMPTZ      DEFAULT NOW()
);
CREATE INDEX idx_officer_locations_officer ON officer_locations(officer_id);
CREATE INDEX idx_officer_locations_time    ON officer_locations(recorded_at DESC);

CREATE TABLE notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        REFERENCES organisations(id) ON DELETE CASCADE,
  officer_id UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  type       TEXT        DEFAULT 'info' CHECK (type IN ('info','warning','alert','success')),
  title      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  read       BOOLEAN     DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE announcements (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        REFERENCES organisations(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  created_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  active     BOOLEAN     DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pending_actions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  requested_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  action_type  TEXT        NOT NULL,
  target_table TEXT,
  target_id    UUID,
  payload      JSONB,
  status       TEXT        DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  review_note  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ
);
CREATE INDEX idx_pa_status ON pending_actions(status);
CREATE INDEX idx_pa_org    ON pending_actions(org_id);

CREATE TABLE audit_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        REFERENCES organisations(id) ON DELETE SET NULL,
  actor_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role   TEXT,
  event_type   TEXT        NOT NULL,
  target_table TEXT,
  target_id    UUID,
  details      JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_al_created ON audit_log(created_at DESC);
CREATE INDEX idx_al_org     ON audit_log(org_id);

CREATE TABLE forms (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  created_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL,
  description TEXT,
  schema      JSONB       NOT NULL DEFAULT '[]',
  status      TEXT        DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','rejected')),
  approved_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  version     INTEGER     DEFAULT 1,
  active      BOOLEAN     DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_forms_org    ON forms(org_id);
CREATE INDEX idx_forms_status ON forms(status);

CREATE TABLE form_submissions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id      UUID        NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  org_id       UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  officer_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  zone_id      UUID        REFERENCES zones(id) ON DELETE SET NULL,
  data         JSONB       NOT NULL DEFAULT '{}',
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  status       TEXT        DEFAULT 'submitted' CHECK (status IN ('submitted','edited_pending','approved')),
  edit_payload JSONB,
  edited_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_subs_officer ON form_submissions(officer_id);
CREATE INDEX idx_subs_form    ON form_submissions(form_id);
CREATE INDEX idx_subs_org     ON form_submissions(org_id);

-- ── 4. TRIGGER: AUTO-CREATE PROFILE ON SIGNUP ───────────────────────────────
-- Fires whenever a user is created in auth.users.
-- Reads full_name, role, and org_id from user_metadata.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, org_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'officer'),
    NULLIF(NEW.raw_user_meta_data->>'org_id', '')::uuid
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 5. HELPER FUNCTIONS ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION my_org_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION my_role()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ── 6. ROW-LEVEL SECURITY ───────────────────────────────────────────────────

ALTER TABLE organisations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones             ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE officer_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_actions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions  ENABLE ROW LEVEL SECURITY;

-- organisations
CREATE POLICY "orgs_select" ON organisations FOR SELECT USING (is_super_admin() OR id = my_org_id());
CREATE POLICY "orgs_insert" ON organisations FOR INSERT WITH CHECK (is_super_admin());
CREATE POLICY "orgs_update" ON organisations FOR UPDATE  USING (is_super_admin());
CREATE POLICY "orgs_delete" ON organisations FOR DELETE  USING (is_super_admin());

-- zones
CREATE POLICY "zone_select" ON zones FOR SELECT USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "zone_insert" ON zones FOR INSERT WITH CHECK (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "zone_update" ON zones FOR UPDATE  USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "zone_delete" ON zones FOR DELETE  USING (is_super_admin() OR org_id = my_org_id());

-- profiles
CREATE POLICY "prof_select" ON profiles FOR SELECT
  USING (id = auth.uid() OR is_super_admin() OR org_id = my_org_id());
CREATE POLICY "prof_insert" ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());
CREATE POLICY "prof_update" ON profiles FOR UPDATE
  USING (id = auth.uid() OR is_super_admin() OR (my_role() = 'supervisor' AND org_id = my_org_id()));
CREATE POLICY "prof_delete" ON profiles FOR DELETE
  USING (is_super_admin());

-- visits
CREATE POLICY "visit_select" ON visits FOR SELECT
  USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "visit_insert" ON visits FOR INSERT
  WITH CHECK (officer_id = auth.uid());
CREATE POLICY "visit_update" ON visits FOR UPDATE
  USING (officer_id = auth.uid() OR is_super_admin() OR org_id = my_org_id());

-- officer_locations
CREATE POLICY "loc_select" ON officer_locations FOR SELECT
  USING (is_super_admin() OR officer_id IN (SELECT id FROM profiles WHERE org_id = my_org_id()));
CREATE POLICY "loc_insert" ON officer_locations FOR INSERT
  WITH CHECK (officer_id = auth.uid());
CREATE POLICY "loc_update" ON officer_locations FOR UPDATE
  USING (officer_id = auth.uid());

-- notifications
CREATE POLICY "notif_select" ON notifications FOR SELECT
  USING (officer_id = auth.uid() OR is_super_admin() OR org_id = my_org_id());
CREATE POLICY "notif_insert" ON notifications FOR INSERT
  WITH CHECK (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "notif_update" ON notifications FOR UPDATE
  USING (officer_id = auth.uid() OR is_super_admin() OR org_id = my_org_id());

-- announcements
CREATE POLICY "ann_select" ON announcements FOR SELECT
  USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "ann_insert" ON announcements FOR INSERT
  WITH CHECK (is_super_admin() OR (org_id = my_org_id() AND my_role() = 'supervisor'));
CREATE POLICY "ann_update" ON announcements FOR UPDATE
  USING (is_super_admin() OR org_id = my_org_id());

-- pending_actions
CREATE POLICY "pa_select" ON pending_actions FOR SELECT
  USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "pa_insert" ON pending_actions FOR INSERT
  WITH CHECK (org_id = my_org_id() AND requested_by = auth.uid());
CREATE POLICY "pa_update" ON pending_actions FOR UPDATE
  USING (is_super_admin() OR (my_role() = 'supervisor' AND org_id = my_org_id()));

-- audit_log
CREATE POLICY "al_select" ON audit_log FOR SELECT
  USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "al_insert" ON audit_log FOR INSERT
  WITH CHECK (is_super_admin() OR org_id = my_org_id() OR actor_id = auth.uid());

-- forms
CREATE POLICY "form_select" ON forms FOR SELECT
  USING (
    is_super_admin()
    OR (org_id = my_org_id() AND my_role() = 'supervisor')
    OR (org_id = my_org_id() AND status = 'approved' AND active = true)
  );
CREATE POLICY "form_insert" ON forms FOR INSERT
  WITH CHECK (org_id = my_org_id() AND created_by = auth.uid());
CREATE POLICY "form_update" ON forms FOR UPDATE
  USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "form_delete" ON forms FOR DELETE
  USING (is_super_admin() OR (my_role() = 'supervisor' AND org_id = my_org_id()));

-- form_submissions
CREATE POLICY "sub_select" ON form_submissions FOR SELECT
  USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "sub_insert" ON form_submissions FOR INSERT
  WITH CHECK (officer_id = auth.uid());
CREATE POLICY "sub_update" ON form_submissions FOR UPDATE
  USING (is_super_admin() OR org_id = my_org_id());

-- ── 7. REALTIME ─────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE officer_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE visits;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE pending_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE form_submissions;

-- ── 8. STORAGE ──────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('form-photos', 'form-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "form_photos_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'form-photos' AND auth.role() = 'authenticated');
CREATE POLICY "form_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'form-photos');

-- ═══════════════════════════════════════════════════════════════════════════
-- SETUP GUIDE
-- ═══════════════════════════════════════════════════════════════════════════
--
-- STEP 1 — CREATE YOUR FIRST SUPER ADMIN
-- ────────────────────────────────────────
-- a) Supabase Dashboard → Authentication → Users → "Add user"
--    Enter email + password → click "Create user"
--
-- b) Copy the new user's UUID, then run in SQL Editor:
--
--      UPDATE profiles
--      SET role = 'super_admin', org_id = NULL
--      WHERE id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
--
--
-- STEP 2 — HOW ADMINS / SUPERVISORS ADD USERS FROM THE APP
-- ──────────────────────────────────────────────────────────
-- Create a Supabase Edge Function (e.g. "create-user") that uses the
-- SERVICE ROLE key server-side and calls:
--
--   const { data, error } = await supabaseAdmin.auth.admin.createUser({
--     email:         'jane@example.com',
--     password:      'securepassword',
--     email_confirm: true,            -- no confirmation email needed
--     user_metadata: {
--       full_name: 'Jane Doe',
--       role:      'supervisor',      -- 'supervisor' or 'officer'
--       org_id:    '<org-uuid>',
--     }
--   })
--
-- The handle_new_user() trigger fires automatically and inserts the
-- matching profiles row with the correct role and org_id.
-- Users can log in immediately after being created.
-- ═══════════════════════════════════════════════════════════════════════════
