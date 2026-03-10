
-- 1. Add parent_id column to comments for threaded replies
ALTER TABLE public.comments
ADD COLUMN parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE DEFAULT NULL;

-- 2. Create comment_reactions table
CREATE TABLE public.comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id, reaction_type)
);

-- 3. Enable RLS on comment_reactions
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for comment_reactions
CREATE POLICY "Users can view comment reactions"
ON public.comment_reactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create comment reactions"
ON public.comment_reactions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comment reactions"
ON public.comment_reactions FOR DELETE
TO authenticated
USING (user_id = auth.uid());
