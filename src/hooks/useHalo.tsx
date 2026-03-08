import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface HaloContextType {
  getHaloClass: (userId: string) => string;
}

const HaloContext = createContext<HaloContextType>({
  getHaloClass: () => "ring-1 ring-white/10",
});

export function HaloProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followerIds, setFollowerIds] = useState<Set<string>>(new Set());
  const [recentDmUserIds, setRecentDmUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setFollowingIds(new Set());
      setFollowerIds(new Set());
      setRecentDmUserIds(new Set());
      return;
    }

    const fetchRelationships = async () => {
      // Fetch who I follow
      const { data: following } = await supabase
        .from("follows")
        .select("following_user_id")
        .eq("follower_user_id", user.id);

      // Fetch who follows me
      const { data: followers } = await supabase
        .from("follows")
        .select("follower_user_id")
        .eq("following_user_id", user.id);

      setFollowingIds(new Set((following || []).map((f) => f.following_user_id)));
      setFollowerIds(new Set((followers || []).map((f) => f.follower_user_id)));

      // Fetch active DM users (messaged in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: myConversations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (myConversations && myConversations.length > 0) {
        const convIds = myConversations.map((c) => c.conversation_id);

        const { data: recentMessages } = await supabase
          .from("messages")
          .select("conversation_id")
          .in("conversation_id", convIds)
          .gte("created_at", sevenDaysAgo.toISOString())
          .limit(500);

        if (recentMessages && recentMessages.length > 0) {
          const activeConvIds = [...new Set(recentMessages.map((m) => m.conversation_id))];

          const { data: participants } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .in("conversation_id", activeConvIds)
            .neq("user_id", user.id);

          setRecentDmUserIds(new Set((participants || []).map((p) => p.user_id)));
        }
      }
    };

    fetchRelationships();

    // Subscribe to follow changes
    const channel = supabase
      .channel("halo-follows")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follows" },
        () => {
          fetchRelationships();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getHaloClass = useCallback(
    (userId: string) => {
      if (!user || userId === user.id) return "ring-1 ring-white/20";

      const isMutual = followingIds.has(userId) && followerIds.has(userId);
      const isActiveDm = recentDmUserIds.has(userId);
      const isFollowing = followingIds.has(userId);
      const isFollower = followerIds.has(userId);

      if (isMutual)
        return "ring-2 ring-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.45)] animate-halo-pulse";
      if (isActiveDm)
        return "ring-2 ring-sky-400/90 shadow-[0_0_12px_rgba(56,189,248,0.4)]";
      if (isFollowing)
        return "ring-[1.5px] ring-purple-500/80";
      if (isFollower)
        return "ring-[1.5px] ring-amber-400/80";

      return "ring-1 ring-white/20";
    },
    [user, followingIds, followerIds, recentDmUserIds]
  );

  return (
    <HaloContext.Provider value={{ getHaloClass }}>
      {children}
    </HaloContext.Provider>
  );
}

export const useHalo = () => useContext(HaloContext);
