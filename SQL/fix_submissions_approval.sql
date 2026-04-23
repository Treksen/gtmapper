-- ═══════════════════════════════════════════════════════════════════════════
-- GT MAPPER — Fix form_submissions for supervisor approval
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add missing columns (safe — IF NOT EXISTS means no error if already run)
ALTER TABLE form_submissions
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- 2. Extend status CHECK to include 'rejected'
ALTER TABLE form_submissions
  DROP CONSTRAINT IF EXISTS form_submissions_status_check;

ALTER TABLE form_submissions
  ADD CONSTRAINT form_submissions_status_check
  CHECK (status IN ('submitted', 'edited_pending', 'approved', 'rejected'));

-- 3. Update RLS update policy so supervisors can approve/reject submissions
--    in their own organisation
DROP POLICY IF EXISTS "sub_update" ON form_submissions;

CREATE POLICY "sub_update" ON form_submissions FOR UPDATE
  USING (
    officer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('supervisor', 'super_admin')
        AND (org_id = form_submissions.org_id OR role = 'super_admin')
    )
  );
