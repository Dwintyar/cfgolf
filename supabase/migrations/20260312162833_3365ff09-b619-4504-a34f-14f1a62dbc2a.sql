
-- Fix security definer view issue
ALTER VIEW public.event_leaderboard SET (security_invoker = on);
