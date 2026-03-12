
-- TOURNAMENT ENGINE TABLES

-- 1. tours
CREATE TABLE public.tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organizer_club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  tournament_type text NOT NULL DEFAULT 'internal',
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::integer,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tours viewable by everyone" ON public.tours FOR SELECT TO public USING (true);
CREATE POLICY "Auth can create tours" ON public.tours FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Organizer can update tours" ON public.tours FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.members m WHERE m.club_id = tours.organizer_club_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin'))
);
CREATE POLICY "Organizer can delete tours" ON public.tours FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.members m WHERE m.club_id = tours.organizer_club_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin'))
);

-- 2. tour_clubs
CREATE TABLE public.tour_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid REFERENCES public.tours(id) ON DELETE CASCADE NOT NULL,
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  ticket_quota integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'invited',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tour_clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tour clubs viewable" ON public.tour_clubs FOR SELECT TO public USING (true);
CREATE POLICY "Auth can manage tour clubs" ON public.tour_clubs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update tour clubs" ON public.tour_clubs FOR UPDATE TO authenticated USING (true);

-- 3. tour_players
CREATE TABLE public.tour_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid REFERENCES public.tours(id) ON DELETE CASCADE NOT NULL,
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tour_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tour players viewable" ON public.tour_players FOR SELECT TO public USING (true);
CREATE POLICY "Auth can register players" ON public.tour_players FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update players" ON public.tour_players FOR UPDATE TO authenticated USING (true);

-- 4. events
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid REFERENCES public.tours(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES public.courses(id) NOT NULL,
  name text NOT NULL,
  event_date date NOT NULL,
  ticket_total integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events viewable" ON public.events FOR SELECT TO public USING (true);
CREATE POLICY "Auth can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update events" ON public.events FOR UPDATE TO authenticated USING (true);

-- 5. tickets
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  ticket_number integer NOT NULL,
  status text NOT NULL DEFAULT 'available',
  assigned_player_id uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tickets viewable" ON public.tickets FOR SELECT TO public USING (true);
CREATE POLICY "Auth can manage tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update tickets" ON public.tickets FOR UPDATE TO authenticated USING (true);

-- 6. tournament_flights
CREATE TABLE public.tournament_flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid REFERENCES public.tours(id) ON DELETE CASCADE NOT NULL,
  flight_name text NOT NULL,
  hcp_min integer NOT NULL DEFAULT 0,
  hcp_max integer NOT NULL DEFAULT 54,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_flights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Flights viewable" ON public.tournament_flights FOR SELECT TO public USING (true);
CREATE POLICY "Auth can manage flights" ON public.tournament_flights FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update flights" ON public.tournament_flights FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth can delete flights" ON public.tournament_flights FOR DELETE TO authenticated USING (true);

-- 7. contestants
CREATE TABLE public.contestants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ticket_id uuid REFERENCES public.tickets(id),
  status text NOT NULL DEFAULT 'competitor',
  hcp integer,
  flight_id uuid REFERENCES public.tournament_flights(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contestants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contestants viewable" ON public.contestants FOR SELECT TO public USING (true);
CREATE POLICY "Auth can manage contestants" ON public.contestants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update contestants" ON public.contestants FOR UPDATE TO authenticated USING (true);

-- 8. tournament_winner_categories
CREATE TABLE public.tournament_winner_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid REFERENCES public.tours(id) ON DELETE CASCADE NOT NULL,
  category_name text NOT NULL,
  flight_id uuid REFERENCES public.tournament_flights(id),
  rank_count integer NOT NULL DEFAULT 1,
  calculation_type text NOT NULL DEFAULT 'net',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_winner_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Winner categories viewable" ON public.tournament_winner_categories FOR SELECT TO public USING (true);
CREATE POLICY "Auth can manage categories" ON public.tournament_winner_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update categories" ON public.tournament_winner_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth can delete categories" ON public.tournament_winner_categories FOR DELETE TO authenticated USING (true);

-- 9. event_results
CREATE TABLE public.event_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  contestant_id uuid REFERENCES public.contestants(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.tournament_winner_categories(id) ON DELETE CASCADE NOT NULL,
  rank_position integer NOT NULL,
  score_value integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.event_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Results viewable" ON public.event_results FOR SELECT TO public USING (true);
CREATE POLICY "Auth can manage results" ON public.event_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update results" ON public.event_results FOR UPDATE TO authenticated USING (true);

-- 10. handicap_history
CREATE TABLE public.handicap_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  old_hcp integer,
  new_hcp integer,
  gross_score integer,
  net_score integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.handicap_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Handicap history viewable" ON public.handicap_history FOR SELECT TO public USING (true);
CREATE POLICY "Auth can insert handicap history" ON public.handicap_history FOR INSERT TO authenticated WITH CHECK (true);

-- INDEXES
CREATE INDEX idx_tours_organizer ON public.tours(organizer_club_id);
CREATE INDEX idx_tour_clubs_tour ON public.tour_clubs(tour_id);
CREATE INDEX idx_tour_players_tour ON public.tour_players(tour_id);
CREATE INDEX idx_tour_players_player ON public.tour_players(player_id);
CREATE INDEX idx_events_tour ON public.events(tour_id);
CREATE INDEX idx_events_course ON public.events(course_id);
CREATE INDEX idx_tickets_event ON public.tickets(event_id);
CREATE INDEX idx_contestants_event ON public.contestants(event_id);
CREATE INDEX idx_contestants_player ON public.contestants(player_id);
CREATE INDEX idx_event_results_event ON public.event_results(event_id);
CREATE INDEX idx_handicap_history_player ON public.handicap_history(player_id);
