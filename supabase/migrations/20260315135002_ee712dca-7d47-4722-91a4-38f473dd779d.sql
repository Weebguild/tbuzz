
CREATE OR REPLACE FUNCTION delete_expired_archived_posts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.posts
  WHERE is_archived = true
  AND archived_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
