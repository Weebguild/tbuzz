import { useState, useEffect } from "react";
import { UserPlus, UserCheck, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHalo } from "@/hooks/useHalo";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface Suggestion {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  department: string | null;
  year: string | null;
  reason: string;
}

export function SuggestedConnections({ followingIds, onFollowToggle }: { followingIds: Set<string>, onFollowToggle: (id: string) => void }) {
  const { user, profile } = useAuth();
  const { getHaloClass } = useHalo();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user || !profile) return;
      setLoading(true);

      const excludeIds = Array.from(followingIds);
      excludeIds.push(user.id);

      // Simple recommendation: Same department or year
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, department, year")
        .eq("university_id", profile.university_id)
        .order("department", { ascending: true }) // Not ideal, but simple
        .limit(20);

      if (data) {
          const filtered = data.filter(p => !excludeIds.includes(p.user_id));
          const enriched = filtered.map(p => {
              let reason = "New on Campus";
              if (p.department === profile.department && p.department) {
                  reason = `In your Dept (${p.department.substring(0, 10)})`;
              } else if (p.year === profile.year && p.year) {
                  reason = `Class of ${p.year}`;
              }
              return { ...p, reason };
          });
          // Shuffle
          const shuffled = enriched.sort(() => 0.5 - Math.random());
          setSuggestions(shuffled.slice(0, 5));
      }
      setLoading(false);
    };

    fetchSuggestions();
  }, [user, profile, followingIds]);

  if (loading || suggestions.length === 0) return null;

  return (
    <div className="my-6">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Sparkles className="h-4 w-4 text-purple-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">People You May Know</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 px-1 snap-x">
        {suggestions.map((s, i) => (
          <motion.div
            key={s.user_id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="snap-start shrink-0 w-[140px] glass-panel rounded-2xl p-4 flex flex-col items-center text-center relative overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500/0 via-purple-500/50 to-purple-500/0" />
            <Avatar className={cn("h-16 w-16 mb-2 cursor-pointer border border-white/10 shadow-lg", getHaloClass(s.user_id))} onClick={() => navigate(`/profile/${s.user_id}`)}>
               <AvatarImage src={s.avatar_url || undefined} />
               <AvatarFallback className="bg-black/60 font-bold">{s.display_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <h4 className="text-sm font-bold text-white truncate w-full cursor-pointer" onClick={() => navigate(`/profile/${s.user_id}`)}>{s.display_name}</h4>
            <p className="text-[9px] font-medium text-purple-300 uppercase tracking-wider mt-1 mb-3 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">{s.reason}</p>
            <button
              onClick={() => onFollowToggle(s.user_id)}
              className="w-full py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/10 mt-auto"
            >
              Follow
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
