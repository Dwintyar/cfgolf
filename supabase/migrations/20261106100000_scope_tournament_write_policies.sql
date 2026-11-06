-- PR-2 (phase A): replace `true` write policies on tournament/event tables
-- with ownership checks. Tables with player-facing writes (events,
-- contestants, tour_players) are deliberately left for phase B because the
-- app writes to them from non-admin flows (ScorecardInput, Onboarding).

-- Helpers --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_tour(p_tour_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM tours t WHERE t.id = p_tour_id
                 AND (t.created_by = auth.uid() OR public.is_club_admin(t.organizer_club_id, auth.uid())));
$$;

CREATE OR REPLACE FUNCTION public.can_manage_event(p_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM events e WHERE e.id = p_event_id
                 AND (e.created_by = auth.uid() OR public.can_manage_tour(e.tour_id)))
      OR EXISTS (SELECT 1 FROM event_roles r WHERE r.event_id = p_event_id AND r.user_id = auth.uid()
                 AND r.role IN ('tournament_director','event_coordinator'))
      OR public.is_platform_admin(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_venue_admin(p_club_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_club_admin(p_club_id, auth.uid())
      OR EXISTS (SELECT 1 FROM club_staff s WHERE s.club_id = p_club_id AND s.user_id = auth.uid()
                 AND s.staff_role = 'course_admin')
      OR public.is_platform_admin(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_event_venue_admin(p_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM events e JOIN courses c ON c.id = e.course_id
                 WHERE e.id = p_event_id AND public.is_venue_admin(c.club_id));
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_tour(uuid), public.can_manage_event(uuid),
  public.is_venue_admin(uuid), public.is_event_venue_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_tour(uuid), public.can_manage_event(uuid),
  public.is_venue_admin(uuid), public.is_event_venue_admin(uuid) TO authenticated;


-- pairings
DROP POLICY IF EXISTS "Auth can delete pairings" ON public.pairings;
DROP POLICY IF EXISTS "Auth can manage pairings" ON public.pairings;
DROP POLICY IF EXISTS "Auth can update pairings" ON public.pairings;
CREATE POLICY "Managers insert pairings" ON public.pairings FOR INSERT TO authenticated WITH CHECK ((public.can_manage_event(event_id) OR public.is_event_venue_admin(event_id)));
CREATE POLICY "Managers update pairings" ON public.pairings FOR UPDATE TO authenticated USING ((public.can_manage_event(event_id) OR public.is_event_venue_admin(event_id))) WITH CHECK ((public.can_manage_event(event_id) OR public.is_event_venue_admin(event_id)));
CREATE POLICY "Managers delete pairings" ON public.pairings FOR DELETE TO authenticated USING ((public.can_manage_event(event_id) OR public.is_event_venue_admin(event_id)));

-- pairing_players
DROP POLICY IF EXISTS "Auth can delete pairing players" ON public.pairing_players;
DROP POLICY IF EXISTS "Auth can manage pairing players" ON public.pairing_players;
DROP POLICY IF EXISTS "Auth can update pairing players" ON public.pairing_players;
CREATE POLICY "Managers insert pairing_players" ON public.pairing_players FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pairings p WHERE p.id = pairing_id AND (public.can_manage_event(p.event_id) OR public.is_event_venue_admin(p.event_id))));
CREATE POLICY "Managers update pairing_players" ON public.pairing_players FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pairings p WHERE p.id = pairing_id AND (public.can_manage_event(p.event_id) OR public.is_event_venue_admin(p.event_id)))) WITH CHECK (EXISTS (SELECT 1 FROM public.pairings p WHERE p.id = pairing_id AND (public.can_manage_event(p.event_id) OR public.is_event_venue_admin(p.event_id))));
CREATE POLICY "Managers delete pairing_players" ON public.pairing_players FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pairings p WHERE p.id = pairing_id AND (public.can_manage_event(p.event_id) OR public.is_event_venue_admin(p.event_id))));

-- event_checkins
DROP POLICY IF EXISTS "Auth can delete checkins" ON public.event_checkins;
DROP POLICY IF EXISTS "Auth can manage checkins" ON public.event_checkins;
DROP POLICY IF EXISTS "Auth can update checkins" ON public.event_checkins;
CREATE POLICY "Managers insert event_checkins" ON public.event_checkins FOR INSERT TO authenticated WITH CHECK ((public.can_manage_event(event_id) OR public.is_event_venue_admin(event_id)));
CREATE POLICY "Managers update event_checkins" ON public.event_checkins FOR UPDATE TO authenticated USING ((public.can_manage_event(event_id) OR public.is_event_venue_admin(event_id))) WITH CHECK ((public.can_manage_event(event_id) OR public.is_event_venue_admin(event_id)));
CREATE POLICY "Managers delete event_checkins" ON public.event_checkins FOR DELETE TO authenticated USING ((public.can_manage_event(event_id) OR public.is_event_venue_admin(event_id)));

-- event_results
DROP POLICY IF EXISTS "Auth can manage results" ON public.event_results;
DROP POLICY IF EXISTS "Auth can update results" ON public.event_results;
CREATE POLICY "Managers insert event_results" ON public.event_results FOR INSERT TO authenticated WITH CHECK (public.can_manage_event(event_id));
CREATE POLICY "Managers update event_results" ON public.event_results FOR UPDATE TO authenticated USING (public.can_manage_event(event_id)) WITH CHECK (public.can_manage_event(event_id));
CREATE POLICY "Managers delete event_results" ON public.event_results FOR DELETE TO authenticated USING (public.can_manage_event(event_id));

-- tickets
DROP POLICY IF EXISTS "Auth can manage tickets" ON public.tickets;
DROP POLICY IF EXISTS "Auth can update tickets" ON public.tickets;
CREATE POLICY "Managers insert tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (public.can_manage_event(event_id));
CREATE POLICY "Managers update tickets" ON public.tickets FOR UPDATE TO authenticated USING (public.can_manage_event(event_id)) WITH CHECK (public.can_manage_event(event_id));
CREATE POLICY "Managers delete tickets" ON public.tickets FOR DELETE TO authenticated USING (public.can_manage_event(event_id));

-- caddy_assignments
DROP POLICY IF EXISTS "Auth can manage caddy assignments" ON public.caddy_assignments;
DROP POLICY IF EXISTS "Auth can update caddy assignments" ON public.caddy_assignments;
CREATE POLICY "Managers insert caddy_assignments" ON public.caddy_assignments FOR INSERT TO authenticated WITH CHECK ((public.can_manage_event(event_id) OR public.is_event_venue_admin(event_id)));
CREATE POLICY "Managers update caddy_assignments" ON public.caddy_assignments FOR UPDATE TO authenticated USING ((public.can_manage_event(event_id) OR public.is_event_venue_admin(event_id))) WITH CHECK ((public.can_manage_event(event_id) OR public.is_event_venue_admin(event_id)));
CREATE POLICY "Managers delete caddy_assignments" ON public.caddy_assignments FOR DELETE TO authenticated USING ((public.can_manage_event(event_id) OR public.is_event_venue_admin(event_id)));

-- golf_cart_assignments
DROP POLICY IF EXISTS "Auth can manage carts" ON public.golf_cart_assignments;
DROP POLICY IF EXISTS "Auth can update carts" ON public.golf_cart_assignments;
CREATE POLICY "Managers insert golf_cart_assignments" ON public.golf_cart_assignments FOR INSERT TO authenticated WITH CHECK ((public.can_manage_event(event_id) OR public.is_event_venue_admin(event_id)));
CREATE POLICY "Managers update golf_cart_assignments" ON public.golf_cart_assignments FOR UPDATE TO authenticated USING ((public.can_manage_event(event_id) OR public.is_event_venue_admin(event_id))) WITH CHECK ((public.can_manage_event(event_id) OR public.is_event_venue_admin(event_id)));
CREATE POLICY "Managers delete golf_cart_assignments" ON public.golf_cart_assignments FOR DELETE TO authenticated USING ((public.can_manage_event(event_id) OR public.is_event_venue_admin(event_id)));

-- event_roles
DROP POLICY IF EXISTS "Club admins can delete roles" ON public.event_roles;
DROP POLICY IF EXISTS "Club admins can assign roles" ON public.event_roles;
DROP POLICY IF EXISTS "Club admins can update roles" ON public.event_roles;
CREATE POLICY "Managers insert event_roles" ON public.event_roles FOR INSERT TO authenticated WITH CHECK (public.can_manage_event(event_id));
CREATE POLICY "Managers update event_roles" ON public.event_roles FOR UPDATE TO authenticated USING (public.can_manage_event(event_id)) WITH CHECK (public.can_manage_event(event_id));
CREATE POLICY "Managers delete event_roles" ON public.event_roles FOR DELETE TO authenticated USING (public.can_manage_event(event_id));

-- tour_clubs
DROP POLICY IF EXISTS "Auth can manage tour clubs" ON public.tour_clubs;
DROP POLICY IF EXISTS "Auth can update tour clubs" ON public.tour_clubs;
CREATE POLICY "Managers insert tour_clubs" ON public.tour_clubs FOR INSERT TO authenticated WITH CHECK (public.can_manage_tour(tour_id));
CREATE POLICY "Managers update tour_clubs" ON public.tour_clubs FOR UPDATE TO authenticated USING ((public.can_manage_tour(tour_id) OR public.is_club_admin(club_id, auth.uid()))) WITH CHECK ((public.can_manage_tour(tour_id) OR public.is_club_admin(club_id, auth.uid())));
CREATE POLICY "Managers delete tour_clubs" ON public.tour_clubs FOR DELETE TO authenticated USING (public.can_manage_tour(tour_id));

-- tournament_flights
DROP POLICY IF EXISTS "Auth can delete flights" ON public.tournament_flights;
DROP POLICY IF EXISTS "Auth can manage flights" ON public.tournament_flights;
DROP POLICY IF EXISTS "Auth can update flights" ON public.tournament_flights;
CREATE POLICY "Managers insert tournament_flights" ON public.tournament_flights FOR INSERT TO authenticated WITH CHECK (public.can_manage_tour(tour_id));
CREATE POLICY "Managers update tournament_flights" ON public.tournament_flights FOR UPDATE TO authenticated USING (public.can_manage_tour(tour_id)) WITH CHECK (public.can_manage_tour(tour_id));
CREATE POLICY "Managers delete tournament_flights" ON public.tournament_flights FOR DELETE TO authenticated USING (public.can_manage_tour(tour_id));

-- tournament_winner_categories
DROP POLICY IF EXISTS "Auth can delete categories" ON public.tournament_winner_categories;
DROP POLICY IF EXISTS "Auth can manage categories" ON public.tournament_winner_categories;
DROP POLICY IF EXISTS "Auth can update categories" ON public.tournament_winner_categories;
CREATE POLICY "Managers insert tournament_winner_categories" ON public.tournament_winner_categories FOR INSERT TO authenticated WITH CHECK (public.can_manage_tour(tour_id));
CREATE POLICY "Managers update tournament_winner_categories" ON public.tournament_winner_categories FOR UPDATE TO authenticated USING (public.can_manage_tour(tour_id)) WITH CHECK (public.can_manage_tour(tour_id));
CREATE POLICY "Managers delete tournament_winner_categories" ON public.tournament_winner_categories FOR DELETE TO authenticated USING (public.can_manage_tour(tour_id));

-- range_bays
DROP POLICY IF EXISTS "Auth can manage range bays" ON public.range_bays;
DROP POLICY IF EXISTS "Auth can update range bays" ON public.range_bays;
CREATE POLICY "Managers insert range_bays" ON public.range_bays FOR INSERT TO authenticated WITH CHECK (public.is_venue_admin(club_id));
CREATE POLICY "Managers update range_bays" ON public.range_bays FOR UPDATE TO authenticated USING (public.is_venue_admin(club_id)) WITH CHECK (public.is_venue_admin(club_id));
CREATE POLICY "Managers delete range_bays" ON public.range_bays FOR DELETE TO authenticated USING (public.is_venue_admin(club_id));

-- range_lessons
DROP POLICY IF EXISTS "Auth can create range lessons" ON public.range_lessons;
DROP POLICY IF EXISTS "Auth can update range lessons" ON public.range_lessons;
CREATE POLICY "Managers insert range_lessons" ON public.range_lessons FOR INSERT TO authenticated WITH CHECK (public.is_venue_admin(club_id));
CREATE POLICY "Managers update range_lessons" ON public.range_lessons FOR UPDATE TO authenticated USING (public.is_venue_admin(club_id)) WITH CHECK (public.is_venue_admin(club_id));
CREATE POLICY "Managers delete range_lessons" ON public.range_lessons FOR DELETE TO authenticated USING (public.is_venue_admin(club_id));

-- tee_time_slots
DROP POLICY IF EXISTS "Course admins can manage slots" ON public.tee_time_slots;
CREATE POLICY "Managers insert tee_time_slots" ON public.tee_time_slots FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND public.is_venue_admin(c.club_id)));
CREATE POLICY "Managers update tee_time_slots" ON public.tee_time_slots FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND public.is_venue_admin(c.club_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND public.is_venue_admin(c.club_id)));
CREATE POLICY "Managers delete tee_time_slots" ON public.tee_time_slots FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND public.is_venue_admin(c.club_id)));
