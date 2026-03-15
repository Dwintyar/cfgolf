
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Club admins can update roles' AND tablename = 'event_roles') THEN
    CREATE POLICY "Club admins can update roles" ON public.event_roles FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Club admins can delete roles' AND tablename = 'event_roles') THEN
    CREATE POLICY "Club admins can delete roles" ON public.event_roles FOR DELETE TO authenticated USING (true);
  END IF;
END $$;
