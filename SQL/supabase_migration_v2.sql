DROP TABLE IF EXISTS form_submissions CASCADE;
DROP TABLE IF EXISTS forms CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS pending_actions CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS officer_locations CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS organisations CASCADE;
-- ═══════════════════════════════════════════════════════════════════════════
-- GT MAPPER UNIFIED · COMPLETE FRESH SCHEMA
-- Run this on a brand-new Supabase project (no existing tables)
-- ═══════════════════════════════════════════════════════════════════════════
-- HOW TO RUN:
--   Supabase dashboard → SQL Editor → New query → paste → Run
-- ═══════════════════════════════════════════════════════════════════════════

--CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- ══════════════════════════════════════════════════════════════════════
-- TABLES
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE organisations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE,
  country     TEXT        DEFAULT 'Kenya',
  description TEXT,
  status      TEXT        DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  created_by  UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE zones (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        REFERENCES organisations(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  description  TEXT,
  daily_target INTEGER     DEFAULT 20,
  color        TEXT        DEFAULT '#0a5c47',
  boundary     JSONB,
  center_lat   DOUBLE PRECISION,
  center_lng   DOUBLE PRECISION,
  active       BOOLEAN     DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id       UUID        REFERENCES organisations(id),
  full_name    TEXT        NOT NULL,
  phone        TEXT,
  role         TEXT        NOT NULL CHECK (role IN ('super_admin','supervisor','officer')),
  zone_id      UUID        REFERENCES zones(id),
  avatar_url   TEXT,
  active       BOOLEAN     DEFAULT true,
  is_online    BOOLEAN     DEFAULT false,
  last_seen_at TIMESTAMPTZ,
  joined_date  DATE        DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE visits (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id       UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  officer_name     TEXT,
  zone_id          UUID        REFERENCES zones(id),
  zone_name        TEXT,
  org_id           UUID        REFERENCES organisations(id),
  lat              DOUBLE PRECISION NOT NULL,
  lng              DOUBLE PRECISION NOT NULL,
  gps_accuracy     DOUBLE PRECISION,
  location_name    TEXT,
  beneficiary_type TEXT        NOT NULL,
  visit_purpose    TEXT        NOT NULL,
  outcome          TEXT        NOT NULL CHECK (outcome IN ('Completed','No show','Referred','Follow-up needed')),
  duration_minutes INTEGER,
  notes            TEXT,
  household_name   TEXT,
  household_id     TEXT,
  beneficiary_age  INTEGER,
  beneficiary_sex  TEXT        CHECK (beneficiary_sex IN ('Male','Female','Other')),
  health_condition TEXT,
  medications      TEXT,
  next_visit_date  DATE,
  referred_to      TEXT,
  synced           BOOLEAN     DEFAULT false,
  visit_date       DATE        DEFAULT CURRENT_DATE,
  visited_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE officer_locations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id  UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  accuracy    DOUBLE PRECISION,
  status      TEXT        DEFAULT 'active' CHECK (status IN ('active','inactive','offline')),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_officer_locations_officer ON officer_locations(officer_id);
CREATE INDEX idx_officer_locations_time    ON officer_locations(recorded_at DESC);

CREATE TABLE notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        REFERENCES organisations(id),
  type       TEXT        DEFAULT 'info' CHECK (type IN ('info','warning','alert','success')),
  title      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  officer_id UUID        REFERENCES profiles(id),
  read       BOOLEAN     DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE announcements (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        REFERENCES organisations(id),
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  created_by UUID        REFERENCES profiles(id),
  active     BOOLEAN     DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pending_actions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        REFERENCES organisations(id) ON DELETE CASCADE,
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
CREATE INDEX idx_pa_by     ON pending_actions(requested_by);

CREATE TABLE audit_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        REFERENCES organisations(id) ON DELETE SET NULL,
  actor_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role   TEXT,
  event_type   TEXT        NOT NULL,
  target_table TEXT,
  target_id    UUID,
  details      JSONB,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_al_created ON audit_log(created_at DESC);
CREATE INDEX idx_al_org     ON audit_log(org_id);
CREATE INDEX idx_al_actor   ON audit_log(actor_id);

CREATE TABLE forms (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        REFERENCES organisations(id) ON DELETE CASCADE,
  created_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL,
  description TEXT,
  schema      JSONB       NOT NULL DEFAULT '[]',
  status      TEXT        DEFAULT 'draft'
                          CHECK (status IN ('draft','pending_approval','approved','rejected')),
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
  form_id      UUID        REFERENCES forms(id) ON DELETE CASCADE,
  org_id       UUID        REFERENCES organisations(id) ON DELETE CASCADE,
  officer_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  zone_id      UUID        REFERENCES zones(id) ON DELETE SET NULL,
  data         JSONB       NOT NULL DEFAULT '{}',
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  status       TEXT        DEFAULT 'submitted'
                           CHECK (status IN ('submitted','edited_pending','approved')),
  edit_payload JSONB,
  edited_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_subs_officer ON form_submissions(officer_id);
CREATE INDEX idx_subs_form    ON form_submissions(form_id);
CREATE INDEX idx_subs_org     ON form_submissions(org_id);

-- ══════════════════════════════════════════════════════════════════════
-- SUPER ADMIN CAP — max 3 platform-wide
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION enforce_super_admin_cap()
RETURNS trigger AS $$
BEGIN
  IF NEW.role = 'super_admin' THEN
    IF (SELECT COUNT(*) FROM profiles WHERE role = 'super_admin' AND id != NEW.id) >= 3 THEN
      RAISE EXCEPTION 'Maximum of 3 Super Admins allowed on this platform.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_super_admin_cap
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_super_admin_cap();

-- ══════════════════════════════════════════════════════════════════════
-- AUTO-CREATE PROFILE ON SIGNUP
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, org_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'officer'),
    CASE
      WHEN new.raw_user_meta_data->>'role' = 'super_admin' THEN NULL
      ELSE (new.raw_user_meta_data->>'org_id')::uuid
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ══════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════
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

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION my_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- organisations
CREATE POLICY "orgs_select" ON organisations FOR SELECT USING (is_super_admin() OR id = my_org_id());
CREATE POLICY "orgs_insert" ON organisations FOR INSERT WITH CHECK (is_super_admin());
CREATE POLICY "orgs_update" ON organisations FOR UPDATE  USING (is_super_admin());
CREATE POLICY "orgs_delete" ON organisations FOR DELETE  USING (is_super_admin());

-- zones
CREATE POLICY "zone_select" ON zones FOR SELECT USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "zone_insert" ON zones FOR INSERT WITH CHECK (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "zone_update" ON zones FOR UPDATE  USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "zone_delete" ON zones FOR DELETE  USING (is_super_admin());

-- profiles
CREATE POLICY "prof_select" ON profiles FOR SELECT USING (is_super_admin() OR org_id = my_org_id() OR id = auth.uid());
CREATE POLICY "prof_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "prof_update" ON profiles FOR UPDATE  USING (id = auth.uid() OR is_super_admin());
CREATE POLICY "prof_delete" ON profiles FOR DELETE  USING (is_super_admin());

-- visits
CREATE POLICY "visit_select" ON visits FOR SELECT USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "visit_insert" ON visits FOR INSERT WITH CHECK (officer_id = auth.uid());
CREATE POLICY "visit_update" ON visits FOR UPDATE  USING (officer_id = auth.uid());

-- officer_locations
CREATE POLICY "loc_select" ON officer_locations FOR SELECT USING (
  is_super_admin() OR officer_id IN (SELECT id FROM profiles WHERE org_id = my_org_id())
);
CREATE POLICY "loc_insert" ON officer_locations FOR INSERT WITH CHECK (officer_id = auth.uid());
CREATE POLICY "loc_update" ON officer_locations FOR UPDATE  USING (officer_id = auth.uid());

-- notifications
CREATE POLICY "notif_select" ON notifications FOR SELECT USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "notif_update" ON notifications FOR UPDATE  USING (is_super_admin() OR org_id = my_org_id());

-- announcements
CREATE POLICY "ann_select" ON announcements FOR SELECT USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "ann_insert" ON announcements FOR INSERT WITH CHECK (is_super_admin() OR org_id = my_org_id());

-- pending_actions
CREATE POLICY "pa_select" ON pending_actions FOR SELECT USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "pa_insert" ON pending_actions FOR INSERT WITH CHECK (org_id = my_org_id() AND requested_by = auth.uid());
CREATE POLICY "pa_update" ON pending_actions FOR UPDATE  USING (is_super_admin());

-- audit_log
CREATE POLICY "al_select" ON audit_log FOR SELECT USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "al_insert" ON audit_log FOR INSERT WITH CHECK (is_super_admin() OR org_id = my_org_id() OR actor_id = auth.uid());

-- forms
CREATE POLICY "form_select" ON forms FOR SELECT USING (
  is_super_admin() OR (
    org_id = my_org_id() AND (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor'
      OR (status = 'approved' AND active = true)
    )
  )
);
CREATE POLICY "form_insert" ON forms FOR INSERT WITH CHECK (org_id = my_org_id() AND created_by = auth.uid());
CREATE POLICY "form_update" ON forms FOR UPDATE  USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "form_delete" ON forms FOR DELETE  USING (is_super_admin());

-- form_submissions
CREATE POLICY "sub_select" ON form_submissions FOR SELECT USING (is_super_admin() OR org_id = my_org_id());
CREATE POLICY "sub_insert" ON form_submissions FOR INSERT WITH CHECK (officer_id = auth.uid());
CREATE POLICY "sub_update" ON form_submissions FOR UPDATE  USING (is_super_admin() OR org_id = my_org_id());

-- ══════════════════════════════════════════════════════════════════════
-- REALTIME
-- ══════════════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE officer_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE visits;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE pending_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE form_submissions;

-- ══════════════════════════════════════════════════════════════════════
-- STORAGE BUCKET for form photo uploads
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-photos', 'form-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "form_photos_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'form-photos' AND auth.role() = 'authenticated');
CREATE POLICY "form_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'form-photos');

-- ══════════════════════════════════════════════════════════════════════
-- FIRST SUPER ADMIN — do this after the script succeeds:
--
-- 1. Authentication → Users → Invite user
--    Set email + password for your first Super Admin
--
-- 2. Copy that user's UUID from the Users list
--
-- 3. Run in SQL Editor (replace the UUID):
--    UPDATE profiles
--    SET role = 'super_admin', org_id = NULL
--    WHERE id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
--
-- Then log in — you can invite up to 2 more admins from the app.
-- ══════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════
-- DONE ✓
-- ══════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════
-- CREATE USER FUNCTION  (called from frontend via supabase.rpc())
-- Bypasses the need for service_role key in the browser.
-- Only super_admin profiles can call this successfully (checked inside).
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION create_platform_user(
  p_email      TEXT,
  p_password   TEXT,
  p_full_name  TEXT,
  p_role       TEXT,
  p_org_id     UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  -- runs as DB owner, not the calling user
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_user_id     UUID;
  v_result      JSON;
BEGIN
  -- Only super_admin may call this
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
IF v_caller_role NOT IN ('super_admin', 'supervisor') THEN
  RAISE EXCEPTION 'Not allowed.';
END IF;

  -- Validate role
  IF p_role NOT IN ('super_admin', 'supervisor', 'officer') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Enforce super_admin cap
  IF p_role = 'super_admin' THEN
    IF (SELECT COUNT(*) FROM profiles WHERE role = 'super_admin') >= 3 THEN
      RAISE EXCEPTION 'Maximum of 3 Super Admins allowed.';
    END IF;
  END IF;

  -- Create the auth user (email already confirmed, no verification email)
  v_user_id := (
    SELECT id FROM auth.users WHERE email = p_email
  );

  IF v_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'A user with that email already exists.';
  END IF;

  -- Insert into auth.users directly
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),  -- pre-confirmed, no email needed
    jsonb_build_object(
      'full_name', p_full_name,
      'role',      p_role,
      'org_id',    p_org_id
    ),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- The trigger handle_new_user() will auto-create the profile row.
  -- But we patch it immediately to ensure org_id and role are correct.
  UPDATE profiles
  SET
    full_name = p_full_name,
    role      = p_role,
    org_id    = p_org_id,
    active    = true
  WHERE id = v_user_id;

  RETURN json_build_object('id', v_user_id, 'email', p_email, 'role', p_role);
END;
$$;

-- Grant execute to authenticated users (the function checks role internally)
GRANT EXECUTE ON FUNCTION create_platform_user TO authenticated;

-- Also need pgcrypto for crypt()
--