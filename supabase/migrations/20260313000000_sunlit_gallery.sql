-- ========================================================================================
-- PHASE 1: SUNLIT GALLERY (DATING ECOSYSTEM) - DATABASE SCHEMA & RPCs
-- ========================================================================================

-- 1. STORAGE BUCKET: DATING MEDIA
-- ========================================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('dating_media', 'dating_media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Dating media is viewable by active profiles only" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'dating_media' AND 
  EXISTS (
    SELECT 1 FROM public.dating_profiles dp 
    WHERE dp.id = auth.uid() AND dp.is_active = true
  )
);

CREATE POLICY "Users can upload their own dating media" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'dating_media' AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own dating media" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'dating_media' AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own dating media" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'dating_media' AND (storage.foldername(name))[1] = auth.uid()::text
);


-- 2. TABLES & RLS POLICIES
-- ========================================================================================

-- Dating Profiles
CREATE TABLE IF NOT EXISTS public.dating_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  media text[] DEFAULT '{}'::text[],
  vitals jsonb DEFAULT '{}'::jsonb,
  prompts jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.dating_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active dating profiles" ON public.dating_profiles
FOR SELECT TO authenticated USING (is_active = true OR id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.dating_profiles
FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.dating_profiles
FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());


-- Dating Likes
CREATE TABLE IF NOT EXISTS public.dating_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_liked text NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (sender_id, receiver_id)
);

ALTER TABLE public.dating_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders can view their sent likes" ON public.dating_likes
FOR SELECT TO authenticated USING (sender_id = auth.uid());


-- Secret Crushes
CREATE TABLE IF NOT EXISTS public.secret_crushes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crush_username text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, crush_username)
);

ALTER TABLE public.secret_crushes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own secret crushes" ON public.secret_crushes
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- Trigger to update dating_profiles.updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_dating_profiles_updated_at ON public.dating_profiles;
CREATE TRIGGER update_dating_profiles_updated_at
BEFORE UPDATE ON public.dating_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 3. MATCHMAKING & RATE LIMITING RPCs
-- ========================================================================================

-- RPC: Send Dating Like (Enforces 4-like rule & checks match)
CREATE OR REPLACE FUNCTION public.send_dating_like(
  p_receiver_id uuid,
  p_content_liked text,
  p_comment text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_id uuid := auth.uid();
  v_likes_last_24h integer;
  v_is_match boolean := false;
  v_conversation_id uuid := null;
BEGIN
  -- 1. Check Rate Limit (Rule of 4)
  SELECT count(*) INTO v_likes_last_24h
  FROM public.dating_likes
  WHERE sender_id = v_sender_id AND created_at >= (now() - interval '24 hours');

  IF v_likes_last_24h >= 4 THEN
    RAISE EXCEPTION 'Daily limit of 4 likes reached. Please return tomorrow.';
  END IF;

  -- 2. Insert Like
  INSERT INTO public.dating_likes (sender_id, receiver_id, content_liked, comment)
  VALUES (v_sender_id, p_receiver_id, p_content_liked, p_comment)
  ON CONFLICT (sender_id, receiver_id) DO NOTHING;

  -- 3. Check for Mutual Match
  IF EXISTS (
    SELECT 1 FROM public.dating_likes 
    WHERE sender_id = p_receiver_id AND receiver_id = v_sender_id
  ) THEN
    v_is_match := true;
    
    -- 4. Check for existing conversation
    SELECT cp1.conversation_id INTO v_conversation_id
    FROM public.conversation_participants cp1
    JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = v_sender_id AND cp2.user_id = p_receiver_id
    LIMIT 1;

    -- 5. Create new conversation if none exists
    IF v_conversation_id IS NULL THEN
      INSERT INTO public.conversations (created_at, updated_at) 
      VALUES (now(), now()) 
      RETURNING id INTO v_conversation_id;

      INSERT INTO public.conversation_participants (conversation_id, user_id) 
      VALUES 
        (v_conversation_id, v_sender_id),
        (v_conversation_id, p_receiver_id);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'is_match', v_is_match,
    'conversation_id', v_conversation_id
  );
END;
$$;


-- RPC: Add Secret Crush (Checks for match via username)
CREATE OR REPLACE FUNCTION public.add_secret_crush(
  p_crush_username text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_crush_user_id uuid;
  v_sender_username text;
  v_is_match boolean := false;
  v_conversation_id uuid := null;
BEGIN
  -- 1. Ensure user hasn't exceeded 3 crushes
  IF (SELECT count(*) FROM public.secret_crushes WHERE user_id = v_user_id) >= 3 THEN
    RAISE EXCEPTION 'You can only have up to 3 secret crushes at a time.';
  END IF;

  -- 2. Insert the crush
  INSERT INTO public.secret_crushes (user_id, crush_username)
  VALUES (v_user_id, p_crush_username)
  ON CONFLICT (user_id, crush_username) DO NOTHING;

  -- 3. Resolve IDs and Usernames to check mutuality
  SELECT id INTO v_crush_user_id FROM public.profiles WHERE username = p_crush_username LIMIT 1;
  SELECT username INTO v_sender_username FROM public.profiles WHERE id = v_user_id LIMIT 1;

  IF v_crush_user_id IS NOT NULL AND v_sender_username IS NOT NULL THEN
    -- 4. Check if reciprocal
    IF EXISTS (
      SELECT 1 FROM public.secret_crushes 
      WHERE user_id = v_crush_user_id AND crush_username = v_sender_username
    ) THEN
      v_is_match := true;
      
      -- 5. Check for existing conversation
      SELECT cp1.conversation_id INTO v_conversation_id
      FROM public.conversation_participants cp1
      JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.user_id = v_user_id AND cp2.user_id = v_crush_user_id
      LIMIT 1;

      -- 6. Create new conversation if none exists
      IF v_conversation_id IS NULL THEN
        INSERT INTO public.conversations (created_at, updated_at) 
        VALUES (now(), now()) 
        RETURNING id INTO v_conversation_id;

        INSERT INTO public.conversation_participants (conversation_id, user_id) 
        VALUES 
          (v_conversation_id, v_user_id),
          (v_conversation_id, v_crush_user_id);
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'is_match', v_is_match,
    'conversation_id', v_conversation_id
  );
END;
$$;