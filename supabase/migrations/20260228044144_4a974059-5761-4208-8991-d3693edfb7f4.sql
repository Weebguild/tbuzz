
CREATE POLICY "Service role can update hotness"
  ON public.gossip_posts FOR UPDATE
  USING (true)
  WITH CHECK (true);
