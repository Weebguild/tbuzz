-- Hotness Heatmap Trigger
-- This trigger invokes the 'calculate-hotness' edge function
-- whenever a new reaction or comment is inserted on gossip posts.

-- Enable pg_net extension (required for HTTP calls from triggers)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to invoke the calculate-hotness edge function
CREATE OR REPLACE FUNCTION public.invoke_calculate_hotness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM extensions.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/calculate-hotness',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  RETURN NEW;
END;
$$;

-- Trigger on reactions table (for gossip upvotes)
CREATE TRIGGER trg_hotness_on_reaction
AFTER INSERT ON public.reactions
FOR EACH ROW
WHEN (NEW.gossip_post_id IS NOT NULL)
EXECUTE FUNCTION public.invoke_calculate_hotness();

-- Trigger on comments table (for gossip comments)
CREATE TRIGGER trg_hotness_on_comment
AFTER INSERT ON public.comments
FOR EACH ROW
WHEN (NEW.gossip_post_id IS NOT NULL)
EXECUTE FUNCTION public.invoke_calculate_hotness();
