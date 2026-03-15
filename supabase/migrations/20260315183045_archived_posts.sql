-- Add archive capabilities to posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Create an index to improve querying archived vs non-archived posts
CREATE INDEX IF NOT EXISTS posts_is_archived_idx ON public.posts(is_archived);

-- Function to delete archived posts older than 1 year
CREATE OR REPLACE FUNCTION delete_expired_archived_posts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.posts
  WHERE is_archived = true
    AND archived_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_cron if it doesn't exist (Requires supabase dashboard enable or superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule the job to run daily at midnight
-- It's safe to run this multiple times as the cron job ID 'delete-expired-archives' ensures only one such schedule
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'delete-expired-archives',
      '0 0 * * *', -- Every day at midnight
      'SELECT delete_expired_archived_posts();'
    );
  END IF;
END
$$;
