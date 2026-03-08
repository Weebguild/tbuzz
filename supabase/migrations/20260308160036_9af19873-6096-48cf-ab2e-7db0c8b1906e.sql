-- Backfill entity_id for older notifications that are missing it

-- post_like: entity_id should be the post_id from the reaction
UPDATE public.notifications n
SET entity_id = r.post_id
FROM public.reactions r
WHERE n.type = 'post_like'
  AND n.entity_id IS NULL
  AND n.actor_id = r.user_id
  AND r.post_id IS NOT NULL
  AND r.created_at BETWEEN n.created_at - interval '5 seconds' AND n.created_at + interval '5 seconds';

-- post_comment: entity_id should be the post_id from the comment
UPDATE public.notifications n
SET entity_id = c.post_id
FROM public.comments c
WHERE n.type = 'post_comment'
  AND n.entity_id IS NULL
  AND n.actor_id = c.user_id
  AND c.post_id IS NOT NULL
  AND c.created_at BETWEEN n.created_at - interval '5 seconds' AND n.created_at + interval '5 seconds';

-- gossip_tag: entity_id should be the gossip_post_id from gossip_tags
UPDATE public.notifications n
SET entity_id = gt.gossip_post_id
FROM public.gossip_tags gt
WHERE n.type = 'gossip_tag'
  AND n.entity_id IS NULL
  AND n.recipient_id = gt.tagged_user_id
  AND gt.created_at BETWEEN n.created_at - interval '5 seconds' AND n.created_at + interval '5 seconds';

-- gossip_upvote: entity_id should be the gossip_post_id from the reaction
UPDATE public.notifications n
SET entity_id = r.gossip_post_id
FROM public.reactions r
WHERE n.type = 'gossip_upvote'
  AND n.entity_id IS NULL
  AND r.gossip_post_id IS NOT NULL
  AND r.created_at BETWEEN n.created_at - interval '5 seconds' AND n.created_at + interval '5 seconds';

-- follow: entity_id should be the follow record id
UPDATE public.notifications n
SET entity_id = f.id
FROM public.follows f
WHERE n.type = 'follow'
  AND n.entity_id IS NULL
  AND n.actor_id = f.follower_user_id
  AND n.recipient_id = f.following_user_id;