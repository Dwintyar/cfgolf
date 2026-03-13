
-- Club staff (caddy, marshal, starter, pro, etc.)
CREATE TABLE IF NOT EXISTS public.club_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  staff_role text NOT NULL DEFAULT 'staff',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id, staff_role)
);
ALTER TABLE public.club_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff viewable" ON public.club_staff FOR SELECT TO public USING (true);
CREATE POLICY "Auth can manage staff" ON public.club_staff FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update staff" ON public.club_staff FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth can delete staff" ON public.club_staff FOR DELETE TO authenticated USING (true);

-- Event check-ins with bag drop and locker
CREATE TABLE IF NOT EXISTS public.event_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  contestant_id uuid REFERENCES public.contestants(id) ON DELETE CASCADE NOT NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  bag_drop_number int,
  locker_number int,
  notes text,
  UNIQUE(event_id, contestant_id)
);
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Checkins viewable" ON public.event_checkins FOR SELECT TO public USING (true);
CREATE POLICY "Auth can manage checkins" ON public.event_checkins FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update checkins" ON public.event_checkins FOR UPDATE TO authenticated USING (true);

-- Golf cart assignments
CREATE TABLE IF NOT EXISTS public.golf_cart_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  cart_number int NOT NULL,
  contestant_id uuid REFERENCES public.contestants(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.golf_cart_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cart assignments viewable" ON public.golf_cart_assignments FOR SELECT TO public USING (true);
CREATE POLICY "Auth can manage carts" ON public.golf_cart_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update carts" ON public.golf_cart_assignments FOR UPDATE TO authenticated USING (true);

-- Caddy assignments
CREATE TABLE IF NOT EXISTS public.caddy_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  contestant_id uuid REFERENCES public.contestants(id) ON DELETE CASCADE NOT NULL,
  caddy_id uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, contestant_id)
);
ALTER TABLE public.caddy_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Caddy assignments viewable" ON public.caddy_assignments FOR SELECT TO public USING (true);
CREATE POLICY "Auth can manage caddy assignments" ON public.caddy_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update caddy assignments" ON public.caddy_assignments FOR UPDATE TO authenticated USING (true);
