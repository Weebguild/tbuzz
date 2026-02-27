CREATE OR REPLACE FUNCTION public.resolve_username_to_email(target_display_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_email TEXT;
BEGIN
  SELECT au.email INTO result_email
  FROM auth.users au
  JOIN public.profiles p ON p.user_id = au.id
  WHERE p.display_name = target_display_name
  LIMIT 1;
  RETURN result_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_username_to_email(TEXT) TO anon, authenticated;