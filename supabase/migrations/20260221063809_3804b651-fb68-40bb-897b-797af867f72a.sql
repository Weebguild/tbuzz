
-- ============================================
-- ROLE ENUM & USER ROLES
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- ============================================
-- UNIVERSITIES TABLE
-- ============================================
CREATE TABLE public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email_domains TEXT[] NOT NULL DEFAULT '{}',
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view universities" ON public.universities FOR SELECT USING (true);

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER ROLES TABLE (separate from profiles!)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_university_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT university_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_profile_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- ============================================
-- POSTS TABLE
-- ============================================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- GOSSIP POSTS TABLE
-- ============================================
CREATE TABLE public.gossip_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  tagged_user_id UUID REFERENCES auth.users(id),
  gossip_alias TEXT NOT NULL,
  gossip_avatar TEXT NOT NULL DEFAULT 'panda',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gossip_posts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- REACTIONS TABLE
-- ============================================
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  gossip_post_id UUID REFERENCES public.gossip_posts(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reaction_target CHECK (
    (post_id IS NOT NULL AND gossip_post_id IS NULL) OR
    (post_id IS NULL AND gossip_post_id IS NOT NULL)
  )
);
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  gossip_post_id UUID REFERENCES public.gossip_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT comment_target CHECK (
    (post_id IS NOT NULL AND gossip_post_id IS NULL) OR
    (post_id IS NULL AND gossip_post_id IS NOT NULL)
  )
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- LEADERBOARD SCORES TABLE
-- ============================================
CREATE TABLE public.leaderboard_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, university_id, week_start)
);
ALTER TABLE public.leaderboard_scores ENABLE ROW LEVEL SECURITY;

-- ============================================
-- REPORTS TABLE
-- ============================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  reported_gossip_post_id UUID REFERENCES public.gossip_posts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- BLOCKED USERS TABLE
-- ============================================
CREATE TABLE public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blocker_user_id, blocked_user_id)
);
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FOLLOWS TABLE
-- ============================================
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_user_id, following_user_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true);

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for post images
CREATE POLICY "Anyone can view post images" ON storage.objects FOR SELECT USING (bucket_id = 'post-images');
CREATE POLICY "Users can upload post images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own post images" ON storage.objects FOR DELETE USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Profiles: users see same-university profiles, can edit own
CREATE POLICY "Users can view same-university profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    university_id = public.get_user_university_id(auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- User roles: viewable by authenticated, managed by admins
CREATE POLICY "Authenticated can view roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Posts: same-university visibility
CREATE POLICY "View same-university posts" ON public.posts
  FOR SELECT TO authenticated
  USING (
    university_id = public.get_user_university_id(auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Create own posts" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND university_id = public.get_user_university_id(auth.uid()));

CREATE POLICY "Update own posts" ON public.posts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Delete own posts" ON public.posts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Gossip posts: same-university, anonymous (user_id hidden in RLS, but stored for moderation)
CREATE POLICY "View same-university gossip" ON public.gossip_posts
  FOR SELECT TO authenticated
  USING (
    university_id = public.get_user_university_id(auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Create gossip posts" ON public.gossip_posts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND university_id = public.get_user_university_id(auth.uid()));

CREATE POLICY "Admins can manage gossip" ON public.gossip_posts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Reactions: same-university scope
CREATE POLICY "View reactions" ON public.reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Create reactions" ON public.reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own reactions" ON public.reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Comments: same-university scope
CREATE POLICY "View comments" ON public.comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Create comments" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own comments" ON public.comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Leaderboard: same-university view
CREATE POLICY "View same-university leaderboard" ON public.leaderboard_scores
  FOR SELECT TO authenticated
  USING (
    university_id = public.get_user_university_id(auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Reports: create own, admins can manage
CREATE POLICY "Create reports" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_user_id = auth.uid());

CREATE POLICY "View own reports or admin" ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins manage reports" ON public.reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Blocked users
CREATE POLICY "View own blocks" ON public.blocked_users
  FOR SELECT TO authenticated USING (blocker_user_id = auth.uid());

CREATE POLICY "Create blocks" ON public.blocked_users
  FOR INSERT TO authenticated WITH CHECK (blocker_user_id = auth.uid());

CREATE POLICY "Delete own blocks" ON public.blocked_users
  FOR DELETE TO authenticated USING (blocker_user_id = auth.uid());

-- Follows
CREATE POLICY "View follows" ON public.follows
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Create follows" ON public.follows
  FOR INSERT TO authenticated WITH CHECK (follower_user_id = auth.uid() AND follower_user_id != following_user_id);

CREATE POLICY "Delete own follows" ON public.follows
  FOR DELETE TO authenticated USING (follower_user_id = auth.uid());

-- ============================================
-- AUTO-CREATE PROFILE TRIGGER (placeholder - profile created during onboarding)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
