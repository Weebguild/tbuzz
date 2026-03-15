
-- 1. Add columns to gossip_posts
ALTER TABLE public.gossip_posts 
ADD COLUMN IF NOT EXISTS hidden_from_usernames TEXT[] DEFAULT '{}';

ALTER TABLE public.gossip_posts 
ADD COLUMN IF NOT EXISTS is_followers_only BOOLEAN DEFAULT false;

-- 2. Update the view to include the new column
DROP VIEW IF EXISTS public.anonymous_gossip_posts;

CREATE OR REPLACE VIEW public.anonymous_gossip_posts 
WITH (security_invoker = true)
AS
SELECT id, content, gossip_alias, gossip_avatar, created_at, tagged_user_id, university_id, hidden_from_usernames
FROM public.gossip_posts;

-- 3. Create RLS policy for viewing gossip (scoped by university, followers-only, and hidden users)
CREATE POLICY "View same-university gossip" ON public.gossip_posts
FOR SELECT TO authenticated
USING (
    (university_id = public.get_user_university_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
    AND (
      user_id = auth.uid()
      OR is_followers_only = false
      OR EXISTS (SELECT 1 FROM public.follows WHERE follower_user_id = auth.uid() AND following_user_id = gossip_posts.user_id AND status = 'accepted')
    )
    AND (
      NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.display_name = ANY(gossip_posts.hidden_from_usernames)
      )
    )
);
