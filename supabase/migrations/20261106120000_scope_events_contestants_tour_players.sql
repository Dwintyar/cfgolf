-- PR-2 phase B: scope write policies on events, contestants and tour_players.
-- Depends on helpers from 20261106100000 (can_manage_tour, can_manage_event).
-- Ships together with app changes that stop players writing to events directly
-- and route onboarding profile claims through profile_claim_requests.

-- Players may move an event from scheduled/ready to playing when they open the
-- scorecard; nothing else about the event is writable by them.
CREATE OR REPLACE FUNCTION public.mark_event_playing(p_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.can_manage_event(p_event_id)
          OR EXISTS (SELECT 1 FROM contestants c
                     WHERE c.event_id = p_event_id AND c.player_id = auth.uid())) THEN
    RETURN;
  END IF;
  UPDATE events SET status = 'playing'
   WHERE id = p_event_id AND status IN ('scheduled', 'ready');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.mark_event_playing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_event_playing(uuid) TO authenticated;

-- events ----------------------------------------------------------------
DROP POLICY IF EXISTS "Auth can create events" ON public.events;
DROP POLICY IF EXISTS "Auth can update events" ON public.events;
CREATE POLICY "Managers insert events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_tour(tour_id));
CREATE POLICY "Managers update events" ON public.events FOR UPDATE TO authenticated
  USING (public.can_manage_event(id)) WITH CHECK (public.can_manage_event(id));
-- There was no DELETE policy, so TourDetail's delete silently did nothing.
CREATE POLICY "Managers delete events" ON public.events FOR DELETE TO authenticated
  USING (public.can_manage_event(id));

-- contestants -----------------------------------------------------------
DROP POLICY IF EXISTS "Auth can manage contestants" ON public.contestants;
DROP POLICY IF EXISTS "Auth can update contestants" ON public.contestants;
DROP POLICY IF EXISTS "Auth can delete contestants" ON public.contestants;
-- Players still self-register when they open a scorecard (existing behaviour),
-- but only as themselves.
CREATE POLICY "Managers or self insert contestants" ON public.contestants FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_event(event_id) OR player_id = auth.uid());
CREATE POLICY "Managers update contestants" ON public.contestants FOR UPDATE TO authenticated
  USING (public.can_manage_event(event_id)) WITH CHECK (public.can_manage_event(event_id));
CREATE POLICY "Managers delete contestants" ON public.contestants FOR DELETE TO authenticated
  USING (public.can_manage_event(event_id));

-- tour_players ----------------------------------------------------------
DROP POLICY IF EXISTS "Auth can register players" ON public.tour_players;
DROP POLICY IF EXISTS "Auth can update players" ON public.tour_players;
DROP POLICY IF EXISTS "Auth can delete players" ON public.tour_players;
-- Organizers manage the whole tour; a participating club's admins manage the
-- players registered under their own club.
CREATE POLICY "Managers insert tour_players" ON public.tour_players FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_tour(tour_id) OR public.is_club_admin(club_id, auth.uid()));
CREATE POLICY "Managers update tour_players" ON public.tour_players FOR UPDATE TO authenticated
  USING (public.can_manage_tour(tour_id) OR public.is_club_admin(club_id, auth.uid()))
  WITH CHECK (public.can_manage_tour(tour_id) OR public.is_club_admin(club_id, auth.uid()));
CREATE POLICY "Managers delete tour_players" ON public.tour_players FOR DELETE TO authenticated
  USING (public.can_manage_tour(tour_id) OR public.is_club_admin(club_id, auth.uid()));
