-- Add is_flagged column to gossip_posts
ALTER TABLE public.gossip_posts ADD COLUMN is_flagged boolean NOT NULL DEFAULT false;