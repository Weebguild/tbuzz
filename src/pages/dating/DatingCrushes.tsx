import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircleHeart, Loader2, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Match {
  conversation_id: string;
  matched_user_id: string;
  display_name: string;
  avatar_url: string | null;
  username: string;
}

export default function DatingCrushes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchMatches();
  }, [user]);

  const fetchMatches = async () => {
    try {
      // Get conversations that are dating matches
      // A match = both parties have sent dating_likes to each other
      const { data: myLikes } = await supabase
        .from("dating_likes")
        .select("receiver_id")
        .eq("sender_id", user!.id);

      if (!myLikes || myLikes.length === 0) { setLoading(false); return; }

      const likedIds = myLikes.map((l: any) => l.receiver_id);

      // Find who also liked me back (mutual)
      const { data: mutualLikes } = await supabase
        .from("dating_likes")
        .select("sender_id")
        .in("sender_id", likedIds)
        .eq("receiver_id", user!.id);

      if (!mutualLikes || mutualLikes.length === 0) { setLoading(false); return; }

      const matchedIds = mutualLikes.map((l: any) => l.sender_id);

      // Fetch profile info for matched users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", matchedIds);

      // Fetch conversations
      const { data: convos } = await (supabase as any)
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("user_id", [user!.id, ...matchedIds]);

      // Find shared conversation IDs
      const myConvoIds = (convos || []).filter((c: any) => c.user_id === user!.id).map((c: any) => c.conversation_id);
      const theirConvos = (convos || []).filter((c: any) => matchedIds.includes(c.user_id));

      const merged: Match[] = matchedIds.map((id: string) => {
        const pub = (profiles as any[])?.find((p: any) => p.user_id === id);
        const theirConvo = theirConvos.find((c: any) => c.user_id === id && myConvoIds.includes(c.conversation_id));
        return {
          conversation_id: theirConvo?.conversation_id ?? "",
          matched_user_id: id,
          display_name: pub?.display_name ?? "Unknown",
          avatar_url: pub?.avatar_url ?? null,
          username: pub?.username ?? "",
        };
      });

      setMatches(merged);
    } catch (err) {
      console.error("Error fetching matches:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(var(--dw-accent))" }} />
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-6">
      <h1 className="font-editorial text-4xl mb-1" style={{ color: "hsl(var(--dw-text))" }}>
        Matches
      </h1>
      <p className="text-sm mb-8" style={{ color: "hsl(var(--dw-text-soft))" }}>
        The feeling is mutual.
      </p>

      {matches.length === 0 ? (
        <EmptyMatchesState />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {matches.map((match, i) => (
              <motion.div
                key={match.matched_user_id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3 }}
              >
                <MatchCard match={match} onChat={() => navigate(`/messages/${match.conversation_id}`)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, onChat }: { match: Match; onChat: () => void }) {
  return (
    <button
      onClick={onChat}
      className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: "white",
        boxShadow: "var(--dw-shadow)",
        border: "1px solid hsl(var(--dw-border-soft))",
      }}
    >
      {/* Avatar with match ring */}
      <div className="relative shrink-0">
        <div
          className="w-14 h-14 rounded-full overflow-hidden"
          style={{ border: "2px solid hsl(340 75% 55% / 0.3)" }}
        >
          {match.avatar_url
            ? <img src={match.avatar_url} className="w-full h-full object-cover" />
            : (
              <div
                className="w-full h-full flex items-center justify-center text-lg font-bold text-white"
                style={{ background: "linear-gradient(135deg, hsl(340,75%,58%), hsl(340,70%,46%))" }}
              >
                {match.display_name[0]}
              </div>
            )
          }
        </div>
        {/* Match badge */}
        <div
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, hsl(340,75%,58%), hsl(340,70%,46%))" }}
        >
          <Heart className="w-2.5 h-2.5 text-white" fill="white" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: "hsl(var(--dw-text))" }}>
          {match.display_name}
        </p>
        <p className="text-xs truncate" style={{ color: "hsl(var(--dw-text-soft))" }}>
          @{match.username}
        </p>
      </div>

      <div
        className="px-4 py-2 rounded-full text-xs font-semibold text-white shrink-0"
        style={{ background: "linear-gradient(135deg, hsl(340,75%,58%), hsl(340,70%,46%))" }}
      >
        Chat
      </div>
    </button>
  );
}

function EmptyMatchesState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
        style={{ background: "hsl(340 75% 55% / 0.1)" }}
      >
        <MessageCircleHeart className="w-8 h-8" style={{ color: "hsl(var(--dw-accent))" }} />
      </div>
      <h3 className="font-editorial text-2xl mb-2" style={{ color: "hsl(var(--dw-text))" }}>
        No matches yet
      </h3>
      <p className="text-sm" style={{ color: "hsl(var(--dw-text-soft))" }}>
        Keep discovering. The right one is out there.
      </p>
    </div>
  );
}
