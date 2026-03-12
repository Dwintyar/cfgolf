
DROP VIEW IF EXISTS public.event_leaderboard;

CREATE VIEW public.event_leaderboard AS
SELECT
  c.event_id,
  c.id AS contestant_id,
  c.player_id,
  c.status,
  c.hcp,
  c.flight_id,
  COALESCE(SUM(sc.gross_score), 0)::int AS total_gross,
  COALESCE(SUM(sc.net_score), 0)::int AS total_net,
  ROW_NUMBER() OVER (
    PARTITION BY c.event_id
    ORDER BY COALESCE(SUM(sc.net_score), 0)
  )::int AS rank_net,
  ROW_NUMBER() OVER (
    PARTITION BY c.event_id
    ORDER BY COALESCE(SUM(sc.gross_score), 0)
  )::int AS rank_gross
FROM public.contestants c
LEFT JOIN public.scorecards sc
  ON sc.player_id = c.player_id
  AND sc.course_id IN (
    SELECT e.course_id FROM public.events e WHERE e.id = c.event_id
  )
GROUP BY c.event_id, c.id, c.player_id, c.status, c.hcp, c.flight_id;

ALTER VIEW public.event_leaderboard SET (security_invoker = on);
