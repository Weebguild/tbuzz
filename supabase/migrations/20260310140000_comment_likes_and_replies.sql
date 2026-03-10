-- 1. Add parent_id to comments for threaded replies
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- 2. Create comment_reactions table
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, comment_id)
);

ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View comment reactions" ON public.comment_reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Create comment reactions" ON public.comment_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own comment reactions" ON public.comment_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
