
-- Fix overly permissive INSERT policy on conversations
DROP POLICY "Create conversations" ON public.conversations;
CREATE POLICY "Create conversations" ON public.conversations
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
