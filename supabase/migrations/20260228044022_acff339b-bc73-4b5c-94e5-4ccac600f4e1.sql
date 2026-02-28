
-- Drop and recreate with hardcoded URL approach
CREATE OR REPLACE FUNCTION public.invoke_calculate_hotness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://vipzxylcmmojpbifmmzf.supabase.co/functions/v1/calculate-hotness',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  RETURN NEW;
END;
$$;
