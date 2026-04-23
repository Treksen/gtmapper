-- ═══════════════════════════════════════════════════════════════════════
-- GT MAPPER — Fix handle_new_user trigger to fully populate profile
-- Run in: Supabase Dashboard → SQL Editor
-- This makes invite code redemption work without any post-signup update
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id  UUID;
  v_zone_id UUID;
  v_active  BOOLEAN;
BEGIN
  -- Safely cast org_id from metadata (null if empty/invalid)
  BEGIN
    v_org_id := NULLIF(NEW.raw_user_meta_data->>'org_id', '')::uuid;
  EXCEPTION WHEN others THEN
    v_org_id := NULL;
  END;

  -- Safely cast zone_id from metadata (null if empty/invalid)
  BEGIN
    v_zone_id := NULLIF(NEW.raw_user_meta_data->>'zone_id', '')::uuid;
  EXCEPTION WHEN others THEN
    v_zone_id := NULL;
  END;

  -- If invite_code_active is passed as 'true', activate immediately
  v_active := COALESCE(
    (NEW.raw_user_meta_data->>'active')::boolean,
    false
  );

  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    org_id,
    zone_id,
    phone,
    active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'officer'),
    v_org_id,
    v_zone_id,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    v_active,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    role       = EXCLUDED.role,
    org_id     = COALESCE(EXCLUDED.org_id, profiles.org_id),
    zone_id    = COALESCE(EXCLUDED.zone_id, profiles.zone_id),
    phone      = COALESCE(EXCLUDED.phone, profiles.phone),
    active     = EXCLUDED.active,
    updated_at = NOW();

  RETURN NEW;
END;
$$;
