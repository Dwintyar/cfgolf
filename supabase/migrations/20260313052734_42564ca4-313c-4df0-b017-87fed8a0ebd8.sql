-- Allow club owners to see all invitations for their clubs
CREATE POLICY "Club owners can view club invitations"
ON public.club_invitations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clubs
    WHERE clubs.id = club_invitations.club_id
    AND clubs.owner_id = auth.uid()
  )
);

-- Allow club owners to update invitations for their clubs (accept/reject)
CREATE POLICY "Club owners can update club invitations"
ON public.club_invitations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clubs
    WHERE clubs.id = club_invitations.club_id
    AND clubs.owner_id = auth.uid()
  )
);

-- Allow club owners to insert members (when accepting join requests)
CREATE POLICY "Club owners can add members"
ON public.members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clubs
    WHERE clubs.id = members.club_id
    AND clubs.owner_id = auth.uid()
  )
);