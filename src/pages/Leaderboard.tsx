import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Loader2, Trophy, Crown, Medal } from "lucide-react";

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
      // Get current week start (Monday)
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
        // If no leaderboard data, show empty state
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

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
  };

  return (
    <div className="px-4 pt-4">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Leaderboard</h1>
        <p className="text-xs text-muted-foreground">Who's the talk of campus this week? 👑</p>
      </div>

      {/* Top 3 Podium */}
      {entries.length >= 3 && (
        <div className="mb-6 flex items-end justify-center gap-3">
          {[entries[1], entries[0], entries[2]].map((entry, i) => {
            const heights = ["h-24", "h-32", "h-20"];
            const sizes = ["h-12 w-12", "h-16 w-16", "h-12 w-12"];
            const isFirst = i === 1;
            return (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center"
              >
                <Avatar className={`${sizes[i]} ${isFirst ? "ring-2 ring-yellow-400 glow-purple" : "ring-1 ring-border"} mb-2`}>
                  {entry.avatar_url ? (
                    <AvatarImage src={entry.avatar_url} />
                  ) : (
                    <AvatarFallback className="bg-muted font-bold">
                      {entry.display_name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <p className="text-xs font-semibold truncate max-w-[80px]">{entry.display_name}</p>
                <p className="text-xs text-primary font-bold">{entry.score}</p>
                <div className={`${heights[i]} w-16 rounded-t-lg gradient-primary mt-2 flex items-start justify-center pt-2`}>
                  <span className="text-lg font-bold">{entry.rank}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="py-20 text-center">
          <Trophy className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No scores this week yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Get gossiped about to climb the ranks!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.slice(3).map((entry, i) => (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-border/30 bg-card/60">
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  {getRankIcon(entry.rank)}
                  <Avatar className="h-8 w-8">
                    {entry.avatar_url ? (
                      <AvatarImage src={entry.avatar_url} />
                    ) : (
                      <AvatarFallback className="bg-muted text-xs">
                        {entry.display_name.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="flex-1 font-medium text-sm">{entry.display_name}</span>
                  <span className="text-sm font-bold text-primary">{entry.score}</span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
