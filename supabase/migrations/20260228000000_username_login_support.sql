
-- Adding email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Sync existing emails
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id;

-- Add UNIQUE constraint to display_name
-- Note: This might fail if there are already duplicate display names.
-- In a real scenario, duplicates would need to be resolved first.
ALTER TABLE public.profiles ADD CONSTRAINT profiles_display_name_key UNIQUE (display_name);

-- Trigger to sync email updates from auth.users to public.profiles
CREATE OR REPLACE FUNCTION public.handle_user_email_sync()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_sync();

-- Ensure email is also set on insertion if profiles are created after auth.users
-- This is a safety measure.
CREATE OR REPLACE FUNCTION public.handle_profile_email_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  SELECT email INTO NEW.email FROM auth.users WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS before_profile_insert_email ON public.profiles;
CREATE TRIGGER before_profile_insert_email
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_email_on_insert();
