
-- 1. TABLES FIRST
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
CREATE POLICY "View active profiles" ON public.dating_profiles FOR SELECT TO authenticated USING (is_active = true OR id = auth.uid());
CREATE POLICY "Manage own profile" ON public.dating_profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

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
CREATE POLICY "View sent likes" ON public.dating_likes FOR SELECT TO authenticated USING (sender_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.secret_crushes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crush_username text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, crush_username)
);
ALTER TABLE public.secret_crushes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own crushes" ON public.secret_crushes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. STORAGE BUCKET (now dating_profiles exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('dating_media', 'dating_media', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Dating media viewable by active profiles" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'dating_media' AND 
  EXISTS (SELECT 1 FROM public.dating_profiles dp WHERE dp.id = auth.uid() AND dp.is_active = true)
);

CREATE POLICY "Upload dating media" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dating_media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Update dating media" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'dating_media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Delete dating media" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'dating_media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. MATCHMAKING RPCs
CREATE OR REPLACE FUNCTION public.send_dating_like(p_receiver_id uuid, p_content_liked text, p_comment text) 
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender_id uuid := auth.uid();
  v_likes_last_24h integer;
  v_conv_id uuid;
BEGIN
  SELECT count(*) INTO v_likes_last_24h FROM public.dating_likes WHERE sender_id = v_sender_id AND created_at >= (now() - interval '24 hours');
  IF v_likes_last_24h >= 4 THEN RAISE EXCEPTION 'Daily limit of 4 likes reached.'; END IF;

  INSERT INTO public.dating_likes (sender_id, receiver_id, content_liked, comment) VALUES (v_sender_id, p_receiver_id, p_content_liked, p_comment) ON CONFLICT DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.dating_likes WHERE sender_id = p_receiver_id AND receiver_id = v_sender_id) THEN
    SELECT conversation_id INTO v_conv_id FROM public.conversation_participants WHERE user_id IN (v_sender_id, p_receiver_id) GROUP BY conversation_id HAVING count(DISTINCT user_id) = 2 LIMIT 1;
    IF v_conv_id IS NULL THEN
      INSERT INTO public.conversations (created_at, updated_at) VALUES (now(), now()) RETURNING id INTO v_conv_id;
      INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (v_conv_id, v_sender_id), (v_conv_id, p_receiver_id);
    END IF;
    RETURN jsonb_build_object('is_match', true, 'conversation_id', v_conv_id);
  END IF;
  
  RETURN jsonb_build_object('is_match', false, 'conversation_id', null);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_secret_crush(p_crush_username text) 
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_crush_user_id uuid;
  v_sender_username text;
  v_conv_id uuid;
BEGIN
  IF (SELECT count(*) FROM public.secret_crushes WHERE user_id = v_user_id) >= 3 THEN RAISE EXCEPTION 'Limit of 3 secret crushes reached.'; END IF;
  
  INSERT INTO public.secret_crushes (user_id, crush_username) VALUES (v_user_id, p_crush_username) ON CONFLICT DO NOTHING;

  SELECT user_id INTO v_crush_user_id FROM public.profiles WHERE display_name = p_crush_username LIMIT 1;
  SELECT display_name INTO v_sender_username FROM public.profiles WHERE user_id = v_user_id LIMIT 1;

  IF v_crush_user_id IS NOT NULL AND v_sender_username IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.secret_crushes WHERE user_id = v_crush_user_id AND crush_username = v_sender_username) THEN
      SELECT conversation_id INTO v_conv_id FROM public.conversation_participants WHERE user_id IN (v_user_id, v_crush_user_id) GROUP BY conversation_id HAVING count(DISTINCT user_id) = 2 LIMIT 1;
      IF v_conv_id IS NULL THEN
        INSERT INTO public.conversations (created_at, updated_at) VALUES (now(), now()) RETURNING id INTO v_conv_id;
        INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (v_conv_id, v_user_id), (v_conv_id, v_crush_user_id);
      END IF;
      RETURN jsonb_build_object('is_match', true, 'conversation_id', v_conv_id);
    END IF;
  END IF;

  RETURN jsonb_build_object('is_match', false, 'conversation_id', null);
END;
$$;
