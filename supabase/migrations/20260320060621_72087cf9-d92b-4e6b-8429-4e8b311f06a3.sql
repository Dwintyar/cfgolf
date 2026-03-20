-- Allow authenticated users to delete event_checkins (for undo check-in)
CREATE POLICY "Auth can delete checkins"
ON public.event_checkins
FOR DELETE
TO authenticated
USING (true);

-- Allow authenticated users to delete contestants (for walk-in removal if needed)
-- Already can't delete contestants per schema, so we add policy
CREATE POLICY "Auth can delete contestants"
ON public.contestants
FOR DELETE
TO authenticated
USING (true);