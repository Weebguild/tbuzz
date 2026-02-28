
-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS trg_hotness_on_reaction ON public.reactions;
DROP TRIGGER IF EXISTS trg_hotness_on_comment ON public.comments;
DROP FUNCTION IF EXISTS public.invoke_calculate_hotness();

-- Enable pg_net
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Recreate function using net.http_post (pg_net)
CREATE OR REPLACE FUNCTION public.invoke_calculate_hotness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text;
  _key text;
BEGIN
  SELECT decrypted_secret INTO _url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  PERFORM net.http_post(
    url := _url || '/functions/v1/calculate-hotness',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body := '{}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER trg_hotness_on_reaction
AFTER INSERT ON public.reactions
FOR EACH ROW
WHEN (NEW.gossip_post_id IS NOT NULL)
EXECUTE FUNCTION public.invoke_calculate_hotness();

CREATE TRIGGER trg_hotness_on_comment
AFTER INSERT ON public.comments
FOR EACH ROW
WHEN (NEW.gossip_post_id IS NOT NULL)
EXECUTE FUNCTION public.invoke_calculate_hotness();
