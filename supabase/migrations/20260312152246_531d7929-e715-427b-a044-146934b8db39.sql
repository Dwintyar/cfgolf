
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_holes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hole_scores ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clubs policies
CREATE POLICY "Clubs viewable by everyone" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "Auth users can create clubs" ON public.clubs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Club owner can update" ON public.clubs FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Club owner can delete" ON public.clubs FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Members policies
CREATE POLICY "Members viewable" ON public.members FOR SELECT USING (true);
CREATE POLICY "Auth can join clubs" ON public.members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave clubs" ON public.members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Invitations policies
CREATE POLICY "Users see own invitations" ON public.club_invitations FOR SELECT TO authenticated USING (invited_user_id = auth.uid() OR invited_by = auth.uid());
CREATE POLICY "Auth can create invitations" ON public.club_invitations FOR INSERT TO authenticated WITH CHECK (invited_by = auth.uid());
CREATE POLICY "Invited user can update" ON public.club_invitations FOR UPDATE TO authenticated USING (invited_user_id = auth.uid());

-- Courses & holes policies
CREATE POLICY "Courses viewable" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Auth can create courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Course holes viewable" ON public.course_holes FOR SELECT USING (true);
CREATE POLICY "Auth can create holes" ON public.course_holes FOR INSERT TO authenticated WITH CHECK (true);

-- Rounds policies
CREATE POLICY "Rounds viewable by participants" ON public.rounds FOR SELECT TO authenticated USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.round_players rp WHERE rp.round_id = id AND rp.user_id = auth.uid())
);
CREATE POLICY "Auth can create rounds" ON public.rounds FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creator can update round" ON public.rounds FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- Round players policies
CREATE POLICY "Round players viewable" ON public.round_players FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.round_players rp2 WHERE rp2.round_id = round_id AND rp2.user_id = auth.uid())
);
CREATE POLICY "Auth can add players" ON public.round_players FOR INSERT TO authenticated WITH CHECK (true);

-- Scorecards policies
CREATE POLICY "Scorecards viewable" ON public.scorecards FOR SELECT TO authenticated USING (
  player_id = auth.uid() OR EXISTS (SELECT 1 FROM public.round_players rp WHERE rp.round_id = round_id AND rp.user_id = auth.uid())
);
CREATE POLICY "Players insert own scorecard" ON public.scorecards FOR INSERT TO authenticated WITH CHECK (player_id = auth.uid());
CREATE POLICY "Players update own scorecard" ON public.scorecards FOR UPDATE TO authenticated USING (player_id = auth.uid());

-- Hole scores policies
CREATE POLICY "Hole scores viewable" ON public.hole_scores FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.scorecards sc WHERE sc.id = scorecard_id AND (sc.player_id = auth.uid() OR EXISTS (SELECT 1 FROM public.round_players rp WHERE rp.round_id = sc.round_id AND rp.user_id = auth.uid())))
);
CREATE POLICY "Players insert own hole scores" ON public.hole_scores FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.scorecards sc WHERE sc.id = scorecard_id AND sc.player_id = auth.uid())
);
CREATE POLICY "Players update own hole scores" ON public.hole_scores FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.scorecards sc WHERE sc.id = scorecard_id AND sc.player_id = auth.uid())
);
