import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trophy, Crown, Calendar, CalendarDays, Flame, User as UserIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { UserHoverCard } from "@/components/ui/UserHoverCard";

interface LeaderboardEntry {
  user_id: string;
  score: number;
  rank: number;
  display_name: string;
  avatar_url: string | null;
}

interface UserGossip {
  id: string;
  content: string;
  gossip_alias: string;
  created_at: string;
  hotness_score: number; // Added hotness score
}

type TimeRange = "week" | "month";

export default function Leaderboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  // Gossip Bottom Sheet State
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [userGossip, setUserGossip] = useState<UserGossip[]>([]);
  const [loadingGossip, setLoadingGossip] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      const now = new Date();

      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(now.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);
      const weekStartStr = weekStart.toISOString().split("T")[0];

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthStartStr = monthStart.toISOString().split("T")[0];

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

      const scoreMap = new Map<string, number>();
      data.forEach((row) => {
        scoreMap.set(row.user_id, (scoreMap.get(row.user_id) || 0) + row.score);
      });

      let aggregatedScores = Array.from(scoreMap.entries()).map(([user_id, score]) => ({
        user_id,
        score,
      }));
      aggregatedScores.sort((a, b) => b.score - a.score);
      aggregatedScores = aggregatedScores.slice(0, 50);

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

  // Fetch Gossip specifically about the selected user
  const openGossipSheet = async (userEntry: LeaderboardEntry) => {
    setSelectedUser(userEntry);
    setLoadingGossip(true);

    // 1. Find all gossip posts they are tagged in
    const { data: tags } = await supabase
      .from("gossip_tags")
      .select("gossip_post_id")
      .eq("tagged_user_id", userEntry.user_id);

    if (!tags || tags.length === 0) {
      setUserGossip([]);
      setLoadingGossip(false);
      return;
    }

    const postIds = tags.map((t) => t.gossip_post_id);

    // 2. Fetch those specific gossip posts
    const { data: posts } = await supabase
      .from("anonymous_gossip_posts")
      .select("id, content, gossip_alias, created_at")
      .in("id", postIds);

    // 3. Fetch hotness scores to sort the tea
    const { data: scores } = await supabase.from("gossip_posts").select("id, hotness_score").in("id", postIds);

    const enrichedPosts = (posts || []).map((p) => {
      const score = scores?.find((s) => s.id === p.id)?.hotness_score || 0;
      return { ...p, hotness_score: score };
    });

    // Sort by hottest tea first
    enrichedPosts.sort((a, b) => b.hotness_score - a.hotness_score);

    setUserGossip(enrichedPosts);
    setLoadingGossip(false);
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl tracking-widest text-foreground uppercase">Leaderboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Who's the talk of campus?</p>
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTimeRange("week")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${timeRange === "week"
              ? "bg-[#7C3AED] text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]"
              : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
        >
          <Calendar className="h-4 w-4" />
          This Week
        </button>
        <button
          onClick={() => setTimeRange("month")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${timeRange === "month"
              ? "bg-[#EC4899] text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]"
              : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
        >
          <CalendarDays className="h-4 w-4" />
          This Month
        </button>
      </div>

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
                {/* ── ROW IS NOW A BUTTON THAT OPENS GOSSIP ── */}
                <div
                  onClick={() => openGossipSheet(entry)}
                  className="w-full flex items-center gap-4 rounded-2xl glass-panel p-4 text-left hover:border-primary/30 transition-colors cursor-pointer group"
                >
                  <span className="text-xl font-extrabold text-foreground w-8 text-center shrink-0">{entry.rank}</span>

                  {/* ── AVATAR IS A SEPARATE BUTTON TO GO TO PROFILE ── */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${entry.user_id}`);
                    }}
                    className="shrink-0 relative z-10"
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
                      {entry.avatar_url ? (
                        <AvatarImage src={entry.avatar_url} />
                      ) : (
                        <AvatarFallback className="bg-white/[0.04] font-bold text-sm text-foreground">
                          {entry.display_name.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <UserHoverCard userId={entry.user_id}>
                        <span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {entry.display_name}
                        </span>
                      </UserHoverCard>
                      {entry.rank === 1 && <Crown className="h-4 w-4 text-yellow-500 shrink-0" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                      Tap to read gossip <Flame className="h-3 w-3 text-primary" />
                    </span>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-primary shrink-0">{entry.score}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">PTS</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── THE GOSSIP BOTTOM SHEET ── */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent
          side="bottom"
          className="h-[85vh] bg-[#0A0A0A]/95 backdrop-blur-2xl border-t border-white/[0.05] rounded-t-3xl px-0 pt-0 flex flex-col"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-white/[0.05] shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-foreground text-left flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" />
                <span className="truncate max-w-[200px]">{selectedUser?.display_name}'s Tea</span>
              </SheetTitle>
              <button
                onClick={() => navigate(`/profile/${selectedUser?.user_id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] text-xs font-bold text-foreground hover:bg-white/[0.1] transition-colors"
              >
                <UserIcon className="h-3.5 w-3.5" />
                Profile
              </button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar">
            {loadingGossip ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : userGossip.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground font-medium">It's quiet... too quiet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">No active gossip found.</p>
              </div>
            ) : (
              userGossip.map((gossip, i) => (
                <motion.div
                  key={gossip.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl glass-panel p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-muted text-[10px]">🎭</AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-xs text-primary">{gossip.gossip_alias}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(gossip.created_at), { addSuffix: true })}
                    </span>

                    {/* Visual Hotness Indicator in Leaderboard */}
                    {gossip.hotness_score > 0 && (
                      <span
                        className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${gossip.hotness_score > 0.7 ? "bg-red-500/20 text-red-400 border-red-500/50" : "bg-orange-500/20 text-orange-400 border-orange-500/50"}`}
                      >
                        🔥 {(gossip.hotness_score * 100).toFixed(1)}°
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90 pl-8">{gossip.content}</p>
                </motion.div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
