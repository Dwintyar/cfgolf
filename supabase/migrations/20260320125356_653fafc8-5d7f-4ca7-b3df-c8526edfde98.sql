
-- Allow platform admins to update profiles (for approval)
CREATE POLICY "Platform admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));
