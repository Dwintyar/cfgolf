-- Close two critical holes found in the 6 Nov 2026 audit.
-- 1. system_admins: INSERT/UPDATE policies were `true`, so any signed-in
--    user could grant themselves super_admin.
-- 2. feature_flags: RLS was off and anon held full write grants.

-- system_admins ---------------------------------------------------------
DROP POLICY IF EXISTS "Only super_admin can insert" ON public.system_admins;
DROP POLICY IF EXISTS "Only super_admin can update" ON public.system_admins;

CREATE POLICY "Only super_admin can insert" ON public.system_admins
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Only super_admin can update" ON public.system_admins
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Only super_admin can delete" ON public.system_admins
  FOR DELETE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.system_admins FROM anon;

-- feature_flags ---------------------------------------------------------
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.feature_flags FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.feature_flags FROM authenticated;

-- Flags are read before login (useFeatureFlags), so SELECT stays public.
CREATE POLICY "Feature flags readable by everyone" ON public.feature_flags
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Platform admins can manage feature flags" ON public.feature_flags
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));
