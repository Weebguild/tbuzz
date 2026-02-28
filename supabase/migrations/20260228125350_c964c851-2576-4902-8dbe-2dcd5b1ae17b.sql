
-- 1. conversations table
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 2. conversation_participants table
CREATE TABLE public.conversation_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- 3. messages table
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Security definer: check_mutual_follow
CREATE OR REPLACE FUNCTION public.check_mutual_follow(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.follows WHERE follower_user_id = user_a AND following_user_id = user_b
  ) AND EXISTS (
    SELECT 1 FROM public.follows WHERE follower_user_id = user_b AND following_user_id = user_a
  )
$$;

-- 5. Security definer: is_conversation_participant
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants WHERE conversation_id = conv_id AND user_id = uid
  )
$$;

-- 6. RLS: conversations
CREATE POLICY "View own conversations" ON public.conversations
FOR SELECT USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Create conversations" ON public.conversations
FOR INSERT WITH CHECK (true);

-- 7. RLS: conversation_participants
CREATE POLICY "View conversation participants" ON public.conversation_participants
FOR SELECT USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Insert conversation participants" ON public.conversation_participants
FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_conversation_participant(conversation_id, auth.uid()));

-- 8. RLS: messages
CREATE POLICY "View messages" ON public.messages
FOR SELECT USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Send messages" ON public.messages
FOR INSERT WITH CHECK (sender_id = auth.uid() AND public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Mark messages read" ON public.messages
FOR UPDATE USING (public.is_conversation_participant(conversation_id, auth.uid()) AND sender_id != auth.uid());

-- 9. Trigger: update conversations.updated_at on new message
CREATE OR REPLACE FUNCTION public.update_conversation_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_conversation_updated_at
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_updated_at();

-- 10. Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
