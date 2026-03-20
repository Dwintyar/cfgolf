DROP POLICY IF EXISTS "Hole scores viewable" ON public.hole_scores;

CREATE POLICY "Hole scores viewable by authenticated"
ON public.hole_scores
FOR SELECT
TO authenticated
USING (true);