--
ALTER TABLE public.reactions REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.gossip_posts REPLICA IDENTITY FULL;
CREATE POLICY "Enable Realtime Broadcast for Reactions" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Enable Realtime Broadcast for Comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Enable Realtime Broadcast for Gossip" ON public.gossip_posts FOR SELECT USING (true);
BEGIN;
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions, public.comments, public.gossip_posts;
--
