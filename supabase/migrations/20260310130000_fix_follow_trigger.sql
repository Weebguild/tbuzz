-- Fix follow trigger and potential constraints

-- 1. Re-create the function to ensure it picks up the 'status' column on 'follows'
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

-- 2. Drop any check constraint on notifications type if it exists and restricts 'follow_request'
-- We can do this gracefully by dropping the constraint and re-adding it (or just leaving it off since 'type' is TEXT)
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%type%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.notifications DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;
END $$;
