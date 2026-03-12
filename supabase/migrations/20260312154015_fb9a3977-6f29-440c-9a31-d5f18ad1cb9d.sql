
-- 1. CREATE course_tees table
CREATE TABLE public.course_tees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  tee_name text NOT NULL,
  color text,
  rating numeric,
  slope integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.course_tees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course tees viewable by everyone"
  ON public.course_tees FOR SELECT TO public USING (true);

CREATE POLICY "Auth can create tees"
  ON public.course_tees FOR INSERT TO authenticated WITH CHECK (true);

-- 2. ALTER rounds: change default status from 'in_progress' to 'draft'
ALTER TABLE public.rounds ALTER COLUMN status SET DEFAULT 'draft';

-- 3. ALTER scorecards: add gross_score, net_score, course_id
ALTER TABLE public.scorecards
  ADD COLUMN IF NOT EXISTS gross_score integer,
  ADD COLUMN IF NOT EXISTS net_score integer,
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id);

-- 4. CREATE INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_round_players_round_id ON public.round_players(round_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_round_id ON public.scorecards(round_id);
CREATE INDEX IF NOT EXISTS idx_hole_scores_scorecard_id ON public.hole_scores(scorecard_id);
CREATE INDEX IF NOT EXISTS idx_course_holes_course_id ON public.course_holes(course_id);
CREATE INDEX IF NOT EXISTS idx_course_tees_course_id ON public.course_tees(course_id);
