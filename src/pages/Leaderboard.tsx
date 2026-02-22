import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trophy, Crown, Calendar, CalendarDays } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  score: number;
  rank: number;
  display_name: string;
  avatar_url: string | null;
}

type TimeRange = "week" | "month";

export default function Leaderboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  useEffect(() => {
    if (!profile) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      const now = new Date();

      // Calculate start of current week (Monday)
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(now.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);
      const weekStartStr = weekStart.toISOString().split("T")[0];

      // Calculate start of current month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthStartStr = monthStart.toISOString().split("T")[0];

      // Build the query based on the selected time range
      let query = supabase
        .from("leaderboard_scores")
        .select("user_id, score, week_start")
        .eq("university_id", profile.university_id);

      if (timeRange === "week") {
        query = query.eq("week_start", weekStartStr);
      } else if (timeRange === "month") {
        query = query.gte("week_start", monthStartStr);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Aggregate scores (vital for 'month' view since a user has multiple weekly rows)
      const scoreMap = new Map<string, number>();
      data.forEach((row) => {
        scoreMap.set(row.user_id, (scoreMap.get(row.user_id) || 0) + row.score);
      });

      // Convert back to array and sort by highest score
      let aggregatedScores = Array.from(scoreMap.entries()).map(([user_id, score]) => ({
        user_id,
        score,
      }));
      aggregatedScores.sort((a, b) => b.score - a.score);
      aggregatedScores = aggregatedScores.slice(0, 50); // Top 50 to keep the UI fast

      const userIds = aggregatedScores.map((d) => d.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const enriched = aggregatedScores.map((entry, i) => ({
        ...entry,
        rank: i + 1,
        display_name: profiles?.find((p) => p.user_id === entry.user_id)?.display_name ?? "Unknown",
        avatar_url: profiles?.find((p) => p.user_id === entry.user_id)?.avatar_url ?? null,
      }));

      setEntries(enriched);
      setLoading(false);
    };

    fetchLeaderboard();
  }, [profile, timeRange]);

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Leaderboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Who's the talk of campus?</p>
        </div>
      </div>

      {/* Time Range Toggle */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTimeRange("week")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            timeRange === "week"
              ? "bg-[#7C3AED] text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="h-4 w-4" />
          This Week
        </button>
        <button
          onClick={() => setTimeRange("month")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            timeRange === "month"
              ? "bg-[#EC4899] text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          This Month
        </button>
      </div>

      {/* Leaderboard List */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center py-20"
          >
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </motion.div>
        ) : entries.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-20 text-center"
          >
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" strokeWidth={1.5} />
            <p className="font-bold text-foreground">No scores for this {timeRange}</p>
            <p className="text-xs text-muted-foreground mt-1">Get gossiped about to climb the ranks!</p>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2.5"
          >
            {entries.map((entry, i) => (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <button
                  onClick={() => navigate(`/profile/${entry.user_id}`)}
                  className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left hover:border-primary/30 transition-colors"
                >
                  <span className="text-xl font-extrabold text-foreground w-8 text-center shrink-0">{entry.rank}</span>
                  <Avatar className="h-10 w-10 shrink-0 ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
                    {entry.avatar_url ? (
                      <AvatarImage src={entry.avatar_url} />
                    ) : (
                      <AvatarFallback className="bg-[#1A1A1A] font-bold text-sm text-foreground">
                        {entry.display_name.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-foreground truncate">{entry.display_name}</span>
                      {entry.rank === 1 && <Crown className="h-4 w-4 text-yellow-500 shrink-0" />}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-primary shrink-0">{entry.score}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">PTS</span>
                  </div>
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
