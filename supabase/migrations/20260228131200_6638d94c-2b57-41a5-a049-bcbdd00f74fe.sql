
-- Drop all existing policies on conversations, conversation_participants, and messages
DROP POLICY IF EXISTS "Create conversations" ON public.conversations;
DROP POLICY IF EXISTS "View own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Insert conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "View conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "View messages" ON public.messages;
DROP POLICY IF EXISTS "Send messages" ON public.messages;
DROP POLICY IF EXISTS "Mark messages read" ON public.messages;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "View own conversations" ON public.conversations FOR SELECT TO authenticated USING (is_conversation_participant(id, auth.uid()));

CREATE POLICY "View conversation participants" ON public.conversation_participants FOR SELECT TO authenticated USING (is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Insert conversation participants" ON public.conversation_participants FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "View messages" ON public.messages FOR SELECT TO authenticated USING (is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Mark messages read" ON public.messages FOR UPDATE TO authenticated USING (is_conversation_participant(conversation_id, auth.uid()) AND sender_id <> auth.uid());
