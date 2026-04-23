-- ═══════════════════════════════════════════════════════════════════════════
-- GT MAPPER · REALTIME & RLS FIX
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add forms table to realtime publication (was missing)
--    This is needed so supervisor dashboards update when form status changes
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE forms;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- already added, that's fine
  END;
END;
$$;

-- 2. Add DELETE policy for form_submissions (supervisors can delete submitted records)
DROP POLICY IF EXISTS "sub_delete" ON form_submissions;
CREATE POLICY "sub_delete" ON form_submissions FOR DELETE
  USING (is_super_admin() OR (my_role() = 'supervisor' AND org_id = my_org_id()));

-- 3. Ensure profiles is in realtime (for online presence)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END;
$$;

-- 4. Ensure form_submissions is in realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE form_submissions;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- IMPORTANT: Also enable realtime for form_submissions in Supabase Dashboard:
-- Database → Replication → supabase_realtime → make sure form_submissions
-- and profiles are checked/enabled.
-- ═══════════════════════════════════════════════════════════════════════════
