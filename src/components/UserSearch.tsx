import { useState, useEffect } from "react";
import { Search, User, X, Loader2, UserPlus, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHalo } from "@/hooks/useHalo";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface SearchResult {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    year: string | null;
    department: string | null;
}

export function UserSearch({ onClose }: { onClose: () => void }) {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const { getHaloClass } = useHalo();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (user) {
            const fetchFollowing = async () => {
                const { data } = await supabase.from("follows").select("following_user_id").eq("follower_user_id", user.id);
                setFollowingIds(new Set(data?.map((f) => f.following_user_id) ?? []));
            };
            fetchFollowing();
        }
    }, [user]);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim() || !profile) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        const { data } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url, year, department")
            .eq("university_id", profile.university_id)
            .ilike("display_name", `%${query}%`)
            .neq("user_id", user?.id ?? "")
            .limit(10);

        setSearchResults(data ?? []);
        setLoading(false);
    };

    const toggleFollow = async (e: React.MouseEvent, targetUserId: string) => {
        e.stopPropagation();
        if (!user) return;

        if (followingIds.has(targetUserId)) {
            await supabase.from("follows").delete().eq("follower_user_id", user.id).eq("following_user_id", targetUserId);
            setFollowingIds((prev) => {
                const n = new Set(prev);
                n.delete(targetUserId);
                return n;
            });
        } else {
            await supabase.from("follows").insert({ follower_user_id: user.id, following_user_id: targetUserId });
            setFollowingIds((prev) => new Set(prev).add(targetUserId));
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-start pt-20 px-4 sm:pt-32">
            {/* ── STYLES (Lakshay-art inspiration) ── */}
            <style>{`
        @keyframes cyber-rotate {
          100% { transform: translate(-50%, -50%) rotate(450deg); }
        }
        .cyber-glow-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cyber-layer {
          position: absolute;
          inset: -2px;
          border-radius: 9999px;
          z-index: -1;
          filter: blur(4px);
          overflow: hidden;
        }
        .cyber-layer::before {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          width: 200%;
          height: 200%;
          transform: translate(-50%, -50%) rotate(0deg);
          background-image: conic-gradient(
            transparent 0%,
            #402fb5 10%,
            transparent 20%,
            transparent 50%,
            #cf30aa 60%,
            transparent 70%
          );
          animation: cyber-rotate 4s linear infinite;
          opacity: 0;
          transition: opacity 0.5s;
        }
        .cyber-glow-container:focus-within .cyber-layer::before {
          opacity: 1;
        }
        .cyber-grid-bg {
          position: fixed;
          inset: 0;
          background-image: 
            linear-gradient(to right, #0f0f10 1px, transparent 1px),
            linear-gradient(to bottom, #0f0f10 1px, transparent 1px);
          background-size: 2rem 2rem;
          background-position: center;
          z-index: -2;
          mask-image: radial-gradient(circle at center, black, transparent 80%);
          opacity: 0.5;
        }
      `}</style>

            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[-1]"
            />

            {/* Cyber Grid */}
            <div className="cyber-grid-bg" />

            {/* ── SEARCH BAR (The Cyber-Glow Design) ── */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-full max-w-[400px] cyber-glow-container group"
            >
                <div className="cyber-layer opacity-50 group-hover:opacity-100 transition-opacity" />

                <div className="relative w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-purple-400 transition-colors z-20" />

                    <input
                        autoFocus
                        type="text"
                        placeholder="Search campus usernames..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className={cn(
                            "w-full h-14 pl-14 pr-14 rounded-full bg-[#010201] text-white text-lg",
                            "border border-white/5 focus:outline-none focus:ring-0",
                            "placeholder:text-[#c0b9c0] transition-shadow duration-500",
                            "group-focus-within:shadow-[0_0_30px_rgba(124,58,237,0.2)]"
                        )}
                    />

                    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2">
                        {loading && <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full text-muted-foreground transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Pink Mask Glow (Lakshay-art) */}
                    <div className="pointer-events-none absolute -top-2 left-10 w-8 h-4 bg-pink-500/40 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 animate-pulse" />
                </div>
            </motion.div>

            {/* ── RESULTS ── */}
            <div className="w-full max-w-[440px] mt-8 space-y-3 overflow-y-auto no-scrollbar pb-20">
                <AnimatePresence mode="popLayout">
                    {searchResults.map((r, i) => (
                        <motion.div
                            key={r.user_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => {
                                navigate(`/profile/${r.user_id}`);
                                onClose();
                            }}
                            className="group/item relative p-4 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-purple-500/30 transition-all cursor-pointer overflow-hidden backdrop-blur-md"
                        >
                            <div className="flex items-center gap-4 relative z-10">
                                <Avatar className={cn("h-14 w-14 border border-white/10 shadow-2xl", getHaloClass(r.user_id))}>
                                    {r.avatar_url ? (
                                        <AvatarImage src={r.avatar_url} />
                                    ) : (
                                        <AvatarFallback className="bg-black/40 text-lg font-bold">
                                            {r.display_name.charAt(0)}
                                        </AvatarFallback>
                                    )}
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-bold leading-none truncate text-base">
                                        {r.display_name}
                                    </h3>
                                    <p className="text-xs text-white/40 mt-1 font-medium truncate uppercase tracking-widest leading-none">
                                        {[r.year, r.department].filter(Boolean).join(" • ") || "MEMBER"}
                                    </p>
                                </div>

                                <button
                                    onClick={(e) => toggleFollow(e, r.user_id)}
                                    className={cn(
                                        "p-3 rounded-2xl transition-all duration-300 active:scale-90",
                                        followingIds.has(r.user_id)
                                            ? "bg-white/5 text-purple-400 border border-purple-500/20"
                                            : "bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)]"
                                    )}
                                >
                                    {followingIds.has(r.user_id) ? <UserCheck className="size-5" /> : <UserPlus className="size-5" />}
                                </button>
                            </div>

                            {/* Result background glow */}
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none" />
                        </motion.div>
                    ))}
                </AnimatePresence>

                {searchQuery && searchResults.length === 0 && !loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20 px-10 border border-dashed border-white/10 rounded-3xl"
                    >
                        <div className="flex justify-center mb-4 opacity-20">
                            <User className="size-12 text-white" />
                        </div>
                        <p className="text-white/40 text-sm font-light uppercase tracking-[0.2em]">Signal lost. No user found.</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
