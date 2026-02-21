
-- 1. Add anonymous_alias and academic fields to profiles, drop interests
ALTER TABLE public.profiles ADD COLUMN anonymous_alias text;
ALTER TABLE public.profiles ADD COLUMN year text;
ALTER TABLE public.profiles ADD COLUMN department text;
ALTER TABLE public.profiles ADD COLUMN stream text;
ALTER TABLE public.profiles DROP COLUMN interests;

-- 2. Create gossip_tags table for multi-user tagging
CREATE TABLE public.gossip_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gossip_post_id uuid NOT NULL REFERENCES public.gossip_posts(id) ON DELETE CASCADE,
  tagged_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(gossip_post_id, tagged_user_id)
);

ALTER TABLE public.gossip_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View gossip tags" ON public.gossip_tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "Create gossip tags" ON public.gossip_tags FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.gossip_posts WHERE id = gossip_post_id AND user_id = auth.uid())
);

CREATE POLICY "Delete own gossip tags" ON public.gossip_tags FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.gossip_posts WHERE id = gossip_post_id AND user_id = auth.uid())
);

-- 3. Create function to update leaderboard scores when tags/reactions happen
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_tag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _university_id uuid;
  _week_start date;
BEGIN
  -- Get the tagged user's university
  SELECT university_id INTO _university_id FROM public.profiles WHERE user_id = NEW.tagged_user_id LIMIT 1;
  
  -- Calculate current week start (Monday)
  _week_start := date_trunc('week', now())::date;
  
  -- Upsert leaderboard score
  INSERT INTO public.leaderboard_scores (user_id, university_id, week_start, score)
  VALUES (NEW.tagged_user_id, _university_id, _week_start, 1)
  ON CONFLICT (user_id, week_start) DO UPDATE SET score = leaderboard_scores.score + 1;
  
  RETURN NEW;
END;
$$;

-- Add unique constraint on leaderboard_scores for upsert
ALTER TABLE public.leaderboard_scores ADD CONSTRAINT leaderboard_scores_user_week UNIQUE (user_id, week_start);

-- Create trigger for tag-based scoring
CREATE TRIGGER on_gossip_tag_insert
AFTER INSERT ON public.gossip_tags
FOR EACH ROW
EXECUTE FUNCTION public.update_leaderboard_on_tag();

-- 4. Create function to update leaderboard when gossip posts get upvoted (for tagged users)
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_gossip_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tagged_user record;
  _university_id uuid;
  _week_start date;
BEGIN
  IF NEW.gossip_post_id IS NULL THEN RETURN NEW; END IF;
  
  _week_start := date_trunc('week', now())::date;
  
  FOR _tagged_user IN
    SELECT gt.tagged_user_id, p.university_id
    FROM public.gossip_tags gt
    JOIN public.profiles p ON p.user_id = gt.tagged_user_id
    WHERE gt.gossip_post_id = NEW.gossip_post_id
  LOOP
    INSERT INTO public.leaderboard_scores (user_id, university_id, week_start, score)
    VALUES (_tagged_user.tagged_user_id, _tagged_user.university_id, _week_start, 1)
    ON CONFLICT (user_id, week_start) DO UPDATE SET score = leaderboard_scores.score + 1;
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_gossip_reaction_insert
AFTER INSERT ON public.reactions
FOR EACH ROW
EXECUTE FUNCTION public.update_leaderboard_on_gossip_reaction();

-- 5. Allow authenticated users to insert leaderboard scores (needed for triggers with SECURITY DEFINER, but also for direct access)
CREATE POLICY "System can insert leaderboard scores"
ON public.leaderboard_scores FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can update leaderboard scores"
ON public.leaderboard_scores FOR UPDATE
TO authenticated
USING (user_id = auth.uid());
