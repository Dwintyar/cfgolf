
-- Add sandbagging flag to handicap_history
ALTER TABLE public.handicap_history
  ADD COLUMN IF NOT EXISTS sandbagging_flag boolean NOT NULL DEFAULT false;

-- Create handicap trend view
CREATE OR REPLACE VIEW public.player_handicap_trend AS
SELECT
  player_id,
  event_id,
  old_hcp,
  new_hcp,
  gross_score,
  net_score,
  sandbagging_flag,
  created_at
FROM public.handicap_history
ORDER BY created_at ASC;

ALTER VIEW public.player_handicap_trend SET (security_invoker = on);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_handicap_history_player ON public.handicap_history(player_id);
