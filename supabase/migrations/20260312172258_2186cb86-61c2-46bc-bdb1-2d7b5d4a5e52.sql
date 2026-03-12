
-- Conversations table
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Conversation participants
CREATE TABLE public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tee time bookings table
CREATE TABLE public.tee_time_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  tee_time time NOT NULL,
  players_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'confirmed',
  notes text,
  total_price numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tee_time_bookings ENABLE ROW LEVEL SECURITY;

-- Conversations: participants can view
CREATE POLICY "Participants can view conversations"
ON public.conversations FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants cp
  WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
));

CREATE POLICY "Auth can create conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (true);

-- Participants: can view own conversations
CREATE POLICY "Participants viewable"
ON public.conversation_participants FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants cp2
  WHERE cp2.conversation_id = conversation_participants.conversation_id AND cp2.user_id = auth.uid()
));

CREATE POLICY "Auth can add participants"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (true);

-- Messages: participants can view/send
CREATE POLICY "Participants can view messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants cp
  WHERE cp.conversation_id = chat_messages.conversation_id AND cp.user_id = auth.uid()
));

CREATE POLICY "Participants can send messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.conversation_participants cp
  WHERE cp.conversation_id = chat_messages.conversation_id AND cp.user_id = auth.uid()
));

-- Tee time bookings
CREATE POLICY "Users can view own bookings"
ON public.tee_time_bookings FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create bookings"
ON public.tee_time_bookings FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bookings"
ON public.tee_time_bookings FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can cancel own bookings"
ON public.tee_time_bookings FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
