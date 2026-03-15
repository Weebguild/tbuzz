
-- 1. Add columns to the posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- 2. Create an index to quickly filter out archived posts on the feed
CREATE INDEX IF NOT EXISTS posts_is_archived_idx ON public.posts(is_archived);

-- 3. Create a function to delete archived posts older than 1 year
CREATE OR REPLACE FUNCTION delete_expired_archived_posts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.posts
  WHERE is_archived = true
  AND archived_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
