import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Loader2, Trophy, Crown } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  score: number;
  rank: number;
  display_name: string;
  avatar_url: string | null;
}

export default function Leaderboard() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const fetchLeaderboard = async () => {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(now.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);
      const weekStartStr = weekStart.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("leaderboard_scores")
        .select("user_id, score")
        .eq("university_id", profile.university_id)
        .eq("week_start", weekStartStr)
        .order("score", { ascending: false })
        .limit(10);

      if (error || !data || data.length === 0) {
        setLoading(false);
        return;
      }

      const userIds = data.map((d) => d.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const enriched = data.map((entry, i) => ({
        ...entry,
        rank: i + 1,
        display_name: profiles?.find((p) => p.user_id === entry.user_id)?.display_name ?? "Unknown",
        avatar_url: profiles?.find((p) => p.user_id === entry.user_id)?.avatar_url ?? null,
      }));

      setEntries(enriched);
      setLoading(false);
    };

    fetchLeaderboard();
  }, [profile]);

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Leaderboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Who's the talk of campus this week?</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="py-20 text-center">
          <Trophy className="mx-auto h-12 w-12 text-foreground/20 mb-4" strokeWidth={1.5} />
          <p className="font-bold text-foreground">No scores yet</p>
          <p className="text-xs text-muted-foreground mt-1">Get gossiped about to climb the ranks!</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4">
                <span className="text-xl font-extrabold text-foreground w-8 text-center shrink-0">
                  {entry.rank}
                </span>
                <Avatar className="h-10 w-10 shrink-0">
                  {entry.avatar_url ? (
                    <AvatarImage src={entry.avatar_url} />
                  ) : (
                    <AvatarFallback className="bg-muted font-bold text-sm">
                      {entry.display_name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm truncate">{entry.display_name}</span>
                    {entry.rank === 1 && <Crown className="h-4 w-4 text-yellow-500 shrink-0" />}
                  </div>
                </div>
                <span className="text-sm font-bold text-primary shrink-0">{entry.score}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
