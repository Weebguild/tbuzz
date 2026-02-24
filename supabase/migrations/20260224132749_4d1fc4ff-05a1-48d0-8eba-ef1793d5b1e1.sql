CREATE POLICY "Users can delete own gossip"
ON public.gossip_posts
FOR DELETE
USING (user_id = auth.uid());