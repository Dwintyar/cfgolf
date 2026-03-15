
-- Posts/Feed table for Priority 8
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  image_url text,
  category text NOT NULL DEFAULT 'general',
  course_id uuid REFERENCES public.courses(id),
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts viewable by everyone" ON public.posts FOR SELECT TO public USING (true);
CREATE POLICY "Auth users can create posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE TO authenticated USING (author_id = auth.uid());

-- Post likes table
CREATE TABLE public.post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes viewable" ON public.post_likes FOR SELECT TO public USING (true);
CREATE POLICY "Auth can like" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Auth can unlike" ON public.post_likes FOR DELETE TO authenticated USING (user_id = auth.uid());
