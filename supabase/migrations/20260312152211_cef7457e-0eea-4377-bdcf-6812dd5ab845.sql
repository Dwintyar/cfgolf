
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  handicap NUMERIC(4,1),
  bio TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clubs
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_personal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Members
CREATE TYPE public.member_role AS ENUM ('owner', 'admin', 'member');
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, club_id)
);

-- Club invitations
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TABLE public.club_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_email TEXT,
  status invitation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  image_url TEXT,
  par INTEGER,
  holes_count INTEGER NOT NULL DEFAULT 18,
  green_fee_price NUMERIC(8,2),
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Course holes
CREATE TABLE public.course_holes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL,
  par INTEGER NOT NULL DEFAULT 4,
  distance_yards INTEGER,
  handicap_index INTEGER,
  UNIQUE(course_id, hole_number)
);

-- Rounds
CREATE TABLE public.rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Round players
CREATE TABLE public.round_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  UNIQUE(round_id, user_id)
);

-- Scorecards
CREATE TABLE public.scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_score INTEGER,
  total_putts INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(round_id, player_id)
);

-- Hole scores
CREATE TABLE public.hole_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id UUID NOT NULL REFERENCES public.scorecards(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL,
  strokes INTEGER,
  putts INTEGER,
  fairway_hit BOOLEAN,
  gir BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scorecard_id, hole_number)
);
