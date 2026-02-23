
-- Add hotness_score column to gossip_posts
ALTER TABLE public.gossip_posts ADD COLUMN IF NOT EXISTS hotness_score FLOAT DEFAULT 0.0;

-- Create index for sorting by hotness
CREATE INDEX IF NOT EXISTS idx_gossip_posts_hotness ON public.gossip_posts (hotness_score DESC);

-- Allow the edge function (service role) to update hotness_score
-- RLS already has admin/moderator update, but we need service role access which bypasses RLS
