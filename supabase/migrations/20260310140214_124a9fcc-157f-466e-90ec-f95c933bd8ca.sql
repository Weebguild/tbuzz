
-- 1. Add 'status' column to follows table (default 'accepted' so existing follows keep working)
ALTER TABLE public.follows ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'accepted';

-- 2. Add 'is_private' column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- 3. Drop any CHECK constraints on notifications.type
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'notifications'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 4. Re-create notify_new_follow trigger function to handle status properly
CREATE OR REPLACE FUNCTION public.notify_new_follow()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Only notify if the follow is immediately accepted (not a pending request)
  IF NEW.status = 'accepted' THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, entity_id)
    VALUES (NEW.following_user_id, NEW.follower_user_id, 'follow', NEW.id);
  ELSE
    -- For pending requests, send a follow_request notification
    INSERT INTO public.notifications (recipient_id, actor_id, type, entity_id)
    VALUES (NEW.following_user_id, NEW.follower_user_id, 'follow_request', NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. Ensure the trigger exists on the follows table
DROP TRIGGER IF EXISTS on_new_follow ON public.follows;
CREATE TRIGGER on_new_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_follow();
