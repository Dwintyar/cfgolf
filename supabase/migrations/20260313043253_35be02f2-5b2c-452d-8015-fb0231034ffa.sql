
-- Buddy relationships table (like Facebook friends)
CREATE TABLE public.buddy_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

ALTER TABLE public.buddy_connections ENABLE ROW LEVEL SECURITY;

-- Everyone can view connections (needed for buddy lists)
CREATE POLICY "Connections viewable by involved users" ON public.buddy_connections
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Users can send buddy requests
CREATE POLICY "Users can send buddy requests" ON public.buddy_connections
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Involved users can update (accept/decline)
CREATE POLICY "Involved users can update" ON public.buddy_connections
  FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Users can delete their own connections
CREATE POLICY "Users can remove connections" ON public.buddy_connections
  FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
