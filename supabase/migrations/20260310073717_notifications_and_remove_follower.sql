-- Modify the existing notify_new_follow function to handle 'pending' status
CREATE OR REPLACE FUNCTION public.notify_new_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, entity_id)
    VALUES (NEW.following_user_id, NEW.follower_user_id, 'follow_request', NEW.id);
  ELSE
    INSERT INTO public.notifications (recipient_id, actor_id, type, entity_id)
    VALUES (NEW.following_user_id, NEW.follower_user_id, 'follow', NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

-- Create a new trigger and function for when a follow request is accepted
CREATE OR REPLACE FUNCTION public.notify_follow_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- If it goes from pending to accepted
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Delete the old follow_request notification
    DELETE FROM public.notifications 
    WHERE recipient_id = NEW.following_user_id 
      AND actor_id = NEW.follower_user_id 
      AND type = 'follow_request' 
      AND entity_id = NEW.id;
      
    -- Insert a new follow notification
    INSERT INTO public.notifications (recipient_id, actor_id, type, entity_id)
    VALUES (NEW.following_user_id, NEW.follower_user_id, 'follow', NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

-- Add the UPDATE trigger onto the follows table
DROP TRIGGER IF EXISTS on_follow_accepted ON public.follows;
CREATE TRIGGER on_follow_accepted
AFTER UPDATE ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_follow_accepted();
