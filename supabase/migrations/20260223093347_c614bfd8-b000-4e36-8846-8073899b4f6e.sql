
-- Restrict gossip_posts SELECT to only own posts (for deletion) and admins/mods
DROP POLICY "View same-university gossip" ON public.gossip_posts;

CREATE POLICY "View own gossip for management" ON public.gossip_posts
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'moderator')
  );
