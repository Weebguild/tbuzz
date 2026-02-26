
-- Fix mutable search_path on SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _post_owner UUID;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT user_id INTO _post_owner FROM public.posts WHERE id = NEW.post_id;
    IF _post_owner != NEW.user_id THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, entity_id)
      VALUES (_post_owner, NEW.user_id, 'post_comment', NEW.post_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_gossip_upvote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _tagged_user RECORD;
BEGIN
  IF NEW.reaction_type = 'upvote' AND NEW.gossip_post_id IS NOT NULL THEN
    FOR _tagged_user IN 
      SELECT tagged_user_id FROM public.gossip_tags WHERE gossip_post_id = NEW.gossip_post_id
    LOOP
      INSERT INTO public.notifications (recipient_id, actor_id, type, entity_id)
      VALUES (_tagged_user.tagged_user_id, NULL, 'gossip_upvote', NEW.gossip_post_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_gossip_tag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.gossip_posts WHERE id = NEW.gossip_post_id AND user_id = NEW.tagged_user_id) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (recipient_id, actor_id, type, entity_id)
  VALUES (NEW.tagged_user_id, NULL, 'gossip_tag', NEW.gossip_post_id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.notifications (recipient_id, actor_id, type, entity_id)
  VALUES (NEW.following_user_id, NEW.follower_user_id, 'follow', NEW.id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _post_owner UUID;
BEGIN
  IF NEW.reaction_type = 'like' AND NEW.post_id IS NOT NULL THEN
    SELECT user_id INTO _post_owner FROM public.posts WHERE id = NEW.post_id;
    IF _post_owner != NEW.user_id THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, entity_id)
      VALUES (_post_owner, NEW.user_id, 'post_like', NEW.post_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix overly permissive notifications INSERT policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (recipient_id != auth.uid() OR actor_id IS NULL);
