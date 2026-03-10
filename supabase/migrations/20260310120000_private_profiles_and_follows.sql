-- Migration: Add Private Profiles & Follow Requests

-- 1. profiles table: Add is_private
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- 2. follows table: Add status
ALTER TABLE public.follows 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending', 'accepted')) DEFAULT 'accepted';

-- Migration Data Update: Set status = 'accepted' for all existing rows 
UPDATE public.follows 
SET status = 'accepted' 
WHERE status IS NULL;

-- 3. gossip_posts table: Add is_followers_only
ALTER TABLE public.gossip_posts 
ADD COLUMN IF NOT EXISTS is_followers_only BOOLEAN DEFAULT false;

-- 4. ROW LEVEL SECURITY (RLS) POLICIES

-- Posts
DROP POLICY IF EXISTS "View same-university posts" ON public.posts;
CREATE POLICY "View same-university posts" ON public.posts
  FOR SELECT TO authenticated
  USING (
    (university_id = public.get_user_university_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
    AND
    (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = posts.user_id AND is_private = false)
      OR EXISTS (SELECT 1 FROM public.follows WHERE follower_user_id = auth.uid() AND following_user_id = posts.user_id AND status = 'accepted')
    )
  );

-- Gossip Posts
DROP POLICY IF EXISTS "View same-university gossip" ON public.gossip_posts;
CREATE POLICY "View same-university gossip" ON public.gossip_posts
  FOR SELECT TO authenticated
  USING (
    (university_id = public.get_user_university_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
    AND
    (
      user_id = auth.uid()
      OR is_followers_only = false
      OR EXISTS (SELECT 1 FROM public.follows WHERE follower_user_id = auth.uid() AND following_user_id = gossip_posts.user_id AND status = 'accepted')
    )
  );

-- Comments
DROP POLICY IF EXISTS "View comments" ON public.comments;
CREATE POLICY "View comments" ON public.comments
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = comments.user_id AND is_private = false)
    OR EXISTS (SELECT 1 FROM public.follows WHERE follower_user_id = auth.uid() AND following_user_id = comments.user_id AND status = 'accepted')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Reactions
DROP POLICY IF EXISTS "View reactions" ON public.reactions;
CREATE POLICY "View reactions" ON public.reactions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = reactions.user_id AND is_private = false)
    OR EXISTS (SELECT 1 FROM public.follows WHERE follower_user_id = auth.uid() AND following_user_id = reactions.user_id AND status = 'accepted')
    OR public.has_role(auth.uid(), 'admin')
  );
