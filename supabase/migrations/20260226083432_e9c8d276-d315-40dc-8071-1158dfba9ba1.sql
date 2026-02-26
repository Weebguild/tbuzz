
-- =============================================
-- SAVED POSTS TABLE
-- =============================================
CREATE TABLE public.saved_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved posts"
  ON public.saved_posts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can save posts"
  ON public.saved_posts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unsave posts"
  ON public.saved_posts FOR DELETE
  USING (user_id = auth.uid());

-- =============================================
-- SAVED GOSSIPS TABLE
-- =============================================
CREATE TABLE public.saved_gossips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  gossip_post_id UUID NOT NULL REFERENCES public.gossip_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, gossip_post_id)
);

ALTER TABLE public.saved_gossips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved gossips"
  ON public.saved_gossips FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can save gossips"
  ON public.saved_gossips FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unsave gossips"
  ON public.saved_gossips FOR DELETE
  USING (user_id = auth.uid());
