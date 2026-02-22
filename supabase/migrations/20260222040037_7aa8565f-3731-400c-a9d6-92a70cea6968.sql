
-- =============================================
-- FIX 1: Gossip anonymity - create view excluding user_id
-- =============================================
CREATE VIEW public.anonymous_gossip_posts 
WITH (security_invoker = true)
AS
SELECT id, content, gossip_alias, gossip_avatar, created_at, tagged_user_id, university_id
FROM public.gossip_posts;

-- =============================================
-- FIX 2: Scope overly permissive RLS policies
-- =============================================

-- Reactions: scope to same-university posts/gossip
DROP POLICY "View reactions" ON public.reactions;
CREATE POLICY "View reactions scoped" ON public.reactions
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (post_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.posts WHERE posts.id = reactions.post_id 
    AND posts.university_id = get_user_university_id(auth.uid())
  ))
  OR (gossip_post_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.gossip_posts WHERE gossip_posts.id = reactions.gossip_post_id 
    AND gossip_posts.university_id = get_user_university_id(auth.uid())
  ))
);

-- Comments: scope to same-university posts/gossip
DROP POLICY "View comments" ON public.comments;
CREATE POLICY "View comments scoped" ON public.comments
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (post_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.posts WHERE posts.id = comments.post_id 
    AND posts.university_id = get_user_university_id(auth.uid())
  ))
  OR (gossip_post_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.gossip_posts WHERE gossip_posts.id = comments.gossip_post_id 
    AND gossip_posts.university_id = get_user_university_id(auth.uid())
  ))
);

-- Follows: scope to same-university users
DROP POLICY "View follows" ON public.follows;
CREATE POLICY "View follows scoped" ON public.follows
FOR SELECT TO authenticated
USING (
  follower_user_id = auth.uid()
  OR following_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = follows.follower_user_id 
    AND profiles.university_id = get_user_university_id(auth.uid())
  )
);

-- User roles: restrict to own roles or admin
DROP POLICY "Authenticated can view roles" ON public.user_roles;
CREATE POLICY "View own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

-- =============================================
-- FIX 3: Server-side input validation via CHECK constraints
-- =============================================
ALTER TABLE public.posts ADD CONSTRAINT posts_content_length CHECK (char_length(content) <= 5000);
ALTER TABLE public.comments ADD CONSTRAINT comments_content_length CHECK (char_length(content) <= 2000);
ALTER TABLE public.gossip_posts ADD CONSTRAINT gossip_content_length CHECK (char_length(content) <= 3000);
ALTER TABLE public.gossip_posts ADD CONSTRAINT gossip_alias_length CHECK (char_length(gossip_alias) <= 50);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_display_name_length CHECK (char_length(display_name) <= 100);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_bio_length CHECK (char_length(bio) <= 500);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_alias_length CHECK (char_length(anonymous_alias) <= 50);
ALTER TABLE public.reports ADD CONSTRAINT reports_reason_length CHECK (char_length(reason) <= 1000);
