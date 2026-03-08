-- Clean up duplicate gossip reactions, keeping only the earliest one
DELETE FROM public.reactions a
USING public.reactions b
WHERE a.gossip_post_id IS NOT NULL
  AND a.user_id = b.user_id
  AND a.gossip_post_id = b.gossip_post_id
  AND a.created_at > b.created_at;

-- Clean up duplicate post reactions, keeping only the earliest one
DELETE FROM public.reactions a
USING public.reactions b
WHERE a.post_id IS NOT NULL
  AND a.user_id = b.user_id
  AND a.post_id = b.post_id
  AND a.created_at > b.created_at;

-- Now create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_post_reaction ON public.reactions (user_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_gossip_reaction ON public.reactions (user_id, gossip_post_id) WHERE gossip_post_id IS NOT NULL;