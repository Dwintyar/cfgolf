
-- Add shotgun start support to pairings
ALTER TABLE public.pairings
  ADD COLUMN IF NOT EXISTS start_hole integer,
  ADD COLUMN IF NOT EXISTS start_type text NOT NULL DEFAULT 'tee_time';

-- Create realtime leaderboard view
CREATE OR REPLACE VIEW public.event_leaderboard AS
SELECT
  c.event_id,
  c.id AS contestant_id,
  c.player_id,
  c.hcp,
  COALESCE(SUM(sc.gross_score), 0) AS total_gross,
  COALESCE(SUM(sc.net_score), 0) AS total_net
FROM public.contestants c
LEFT JOIN public.scorecards sc
  ON sc.player_id = c.player_id
  AND sc.course_id IN (
    SELECT e.course_id FROM public.events e WHERE e.id = c.event_id
  )
GROUP BY c.event_id, c.id, c.player_id, c.hcp;
