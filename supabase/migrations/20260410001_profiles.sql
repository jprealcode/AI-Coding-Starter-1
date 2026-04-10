-- ============================================================
-- PROJ-1: Authentifizierung & Benutzerverwaltung
-- Migration: profiles Tabelle, RLS, Custom Claims Hook
-- ============================================================

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email         TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT CHECK (role IN ('admin', 'approver')) NOT NULL DEFAULT 'approver',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Helper function: check if calling user is an active admin
--    SECURITY DEFINER: runs as function owner (bypasses RLS), preventing recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = TRUE
  );
$$;

-- 4. RLS Policies: profiles
-- SELECT: own profile (always) OR any profile (if admin)
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- UPDATE: own profile (last_seen_at) OR any profile (if admin)
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- INSERT / DELETE: blocked via RLS (only service role key can do this)
-- No INSERT policy → only service role can insert (used by /api/admin/users)
-- No DELETE policy → only service role can delete

-- 5. Guard: prevent deactivating the last active admin
CREATE OR REPLACE FUNCTION public.prevent_last_admin_deactivation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If we're deactivating an admin, ensure at least one other active admin remains
  IF OLD.role = 'admin' AND NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
    IF (
      SELECT COUNT(*) FROM public.profiles
      WHERE role = 'admin' AND is_active = TRUE AND user_id != OLD.user_id
    ) = 0 THEN
      RAISE EXCEPTION 'Mindestens ein aktiver Admin muss vorhanden bleiben.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_last_admin_deactivation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_deactivation();

-- 6. Custom Access Token Hook
--    Supabase calls this function when issuing JWTs.
--    It embeds the user role into the token as a custom claim.
--    Enable this in: Supabase Dashboard → Authentication → Hooks → Custom Access Token Hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER STABLE
AS $$
DECLARE
  claims        JSONB;
  user_profile  RECORD;
BEGIN
  claims := event -> 'claims';

  SELECT role, is_active
    INTO user_profile
    FROM public.profiles
   WHERE user_id = (event ->> 'user_id')::uuid;

  IF FOUND THEN
    claims := jsonb_set(claims, '{user_role}',    to_jsonb(user_profile.role));
    claims := jsonb_set(claims, '{user_active}',  to_jsonb(user_profile.is_active));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant execution to supabase_auth_admin (required for the hook)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id   ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role       ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active  ON public.profiles(is_active);

-- ============================================================
-- SETUP INSTRUCTIONS (after running this migration):
--
-- 1. Go to Supabase Dashboard → Authentication → Hooks
-- 2. Enable "Custom Access Token Hook"
-- 3. Select function: public.custom_access_token_hook
--
-- 4. Go to Supabase Dashboard → Authentication → Rate Limits
-- 5. Set "Max failed login attempts before rate limiting" to 5
--
-- 6. Create the first Admin user manually via Supabase Dashboard:
--    a) Authentication → Users → Add user
--    b) Run this SQL to create their profile:
--
--    INSERT INTO public.profiles (user_id, email, display_name, role, is_active)
--    VALUES ('<auth-user-id>', 'admin@hausverwaltung.de', 'Admin', 'admin', TRUE);
--
-- ============================================================
