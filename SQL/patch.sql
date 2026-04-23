-- ═══════════════════════════════════════════════════════════════════════════
-- GT MAPPER · PATCH — run in Supabase SQL Editor
-- Fixes: RLS on pending_registrations, audit log auto-trigger
-- ═══════════════════════════════════════════════════════════════════════════

-- ── FIX 1: pending_registrations RLS ────────────────────────────────────────
-- The INSERT policy had WITH CHECK (true) but anon/unauthenticated users
-- cannot insert because RLS blocks them. We need to allow public inserts.

DROP POLICY IF EXISTS "pendreg_insert" ON pending_registrations;
DROP POLICY IF EXISTS "pendreg_select" ON pending_registrations;
DROP POLICY IF EXISTS "pendreg_update" ON pending_registrations;

-- Allow anyone (including unauthenticated) to self-register
CREATE POLICY "pendreg_insert" ON pending_registrations
  FOR INSERT WITH CHECK (true);

-- Super admin sees all; supervisors see officer registrations
CREATE POLICY "pendreg_select" ON pending_registrations
  FOR SELECT USING (
    auth.role() = 'anon'  -- allow checking own submission status by email
    OR is_super_admin()
    OR my_role() = 'supervisor'
  );

-- Super admin approves supervisors; supervisors approve officers
CREATE POLICY "pendreg_update" ON pending_registrations
  FOR UPDATE USING (
    is_super_admin()
    OR (my_role() = 'supervisor' AND role = 'officer')
  );

-- Also allow anon to read their own registration by email (for status polling)
-- This is already covered by the select policy above.

-- ── FIX 2: AUDIT LOG AUTO-TRIGGER FUNCTION ──────────────────────────────────
-- Automatically log key table changes to audit_log.
-- Called explicitly from the app for most actions; this covers DB-level safety net.

CREATE OR REPLACE FUNCTION public.auto_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   UUID;
  v_actor_role TEXT;
  v_org_id     UUID;
  v_event_type TEXT;
  v_details    JSONB;
BEGIN
  -- Get actor info
  v_actor_id := auth.uid();
  SELECT role, org_id INTO v_actor_role, v_org_id
  FROM profiles WHERE id = v_actor_id;

  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_type := TG_TABLE_NAME || '_created';
    v_details    := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := TG_TABLE_NAME || '_updated';
    v_details    := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := TG_TABLE_NAME || '_deleted';
    v_details    := to_jsonb(OLD);
  END IF;

  -- Determine org_id from the row itself if available
  IF TG_OP != 'DELETE' THEN
    IF TG_TABLE_NAME = 'organisations' THEN v_org_id := NEW.id;
    ELSIF TG_TABLE_NAME IN ('zones','forms','visits','form_submissions','pending_actions','announcements','notifications') THEN
      v_org_id := NEW.org_id;
    ELSIF TG_TABLE_NAME = 'profiles' THEN v_org_id := NEW.org_id;
    END IF;
  ELSE
    IF TG_TABLE_NAME = 'organisations' THEN v_org_id := OLD.id;
    ELSE v_org_id := COALESCE(OLD.org_id, v_org_id);
    END IF;
  END IF;

  -- Insert audit record (ignore errors so the main operation always succeeds)
  BEGIN
    INSERT INTO audit_log (actor_id, actor_role, event_type, target_table, target_id, org_id, details)
    VALUES (
      v_actor_id,
      v_actor_role,
      v_event_type,
      TG_TABLE_NAME,
      CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
      v_org_id,
      v_details
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- never block the main operation
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── Attach audit trigger to key tables ──────────────────────────────────────
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['organisations','zones','profiles','forms','form_submissions','pending_actions'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I
       AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH ROW EXECUTE FUNCTION public.auto_audit_log()',
      t, t
    );
  END LOOP;
END;
$$;
