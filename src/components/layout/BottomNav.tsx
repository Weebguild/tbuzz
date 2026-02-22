import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, MessageSquare, Trophy, User, Plus, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  year: string | null;
  department: string | null;
}

const tabs = [
  { path: "/feed", icon: Home },
  { path: "/gossip", icon: MessageSquare },
  { path: "center", icon: Plus, isCenter: true },
  { path: "/leaderboard", icon: Trophy },
  { path: "/profile", icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const openSearch = async () => {
    setShowSearch(true);
    if (user) {
      const { data } = await supabase.from("follows").select("following_user_id").eq("follower_user_id", user.id);
      setFollowingIds(new Set(data?.map((f) => f.following_user_id) ?? []));
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !profile) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, year, department")
      .eq("university_id", profile.university_id)
      .ilike("display_name", `%${query}%`)
      .neq("user_id", user?.id ?? "")
      .limit(20);
    setSearchResults(data ?? []);
  };

  const toggleFollow = async (targetUserId: string) => {
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
    <>
      {/* Search Bottom Sheet */}
      {showSearch && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowSearch(false);
              setSearchQuery("");
              setSearchResults([]);
            }}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl glass-panel border-t border-white/10 max-h-[80vh] flex flex-col">
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>
            <div className="px-4 pb-4 mt-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Search campus users..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-11 h-12 rounded-full bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2 no-scrollbar">
              {searchResults.map((r) => (
                <div
                  key={r.user_id}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                >
                  <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      setShowSearch(false);
                      navigate(`/profile/${r.user_id}`);
                    }}
                  >
                    <Avatar className="h-11 w-11 shrink-0 ring-2 ring-transparent">
                      {r.avatar_url ? (
                        <AvatarImage src={r.avatar_url} />
                      ) : (
                        <AvatarFallback className="bg-muted text-sm font-bold text-foreground">
                          {r.display_name.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{r.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate font-medium">
                        {[r.year, r.department].filter(Boolean).join(" · ") || "Student"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFollow(r.user_id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ml-2",
                      followingIds.has(r.user_id)
                        ? "border border-white/10 text-muted-foreground hover:bg-white/5"
                        : "bg-primary text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:scale-105",
                    )}
                  >
                    {followingIds.has(r.user_id) ? "Unfollow" : "Follow"}
                  </button>
                </div>
              ))}
              {searchQuery && searchResults.length === 0 && (
                <div className="text-center py-12">
                  <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">No users found</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Floating Glass Bottom Nav Bar */}
      <div className="fixed bottom-6 left-0 right-0 z-40 px-4 pointer-events-none">
        <nav className="mx-auto max-w-[340px] pointer-events-auto glass-panel rounded-full overflow-hidden safe-area-pb p-1.5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between px-2">
            {tabs.map((tab) => {
              if (tab.isCenter) {
                return (
                  <div key={tab.path} className="flex items-center justify-center relative -top-4 mx-1">
                    <button
                      onClick={openSearch}
                      className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-tr from-primary to-accent shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-transform active:scale-90 hover:scale-105"
                    >
                      <Search className="h-6 w-6 text-white drop-shadow-md" />
                    </button>
                  </div>
                );
              }

              const isActive = location.pathname === tab.path || (tab.path === "/feed" && location.pathname === "/");

              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className="flex flex-1 items-center justify-center py-3 relative group"
                >
                  {isActive && <motion.div layoutId="nav-pill" className="absolute inset-0 bg-white/10 rounded-full" />}
                  <tab.icon
                    className={cn(
                      "h-[22px] w-[22px] transition-all duration-300 relative z-10",
                      isActive
                        ? "text-white scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                        : "text-muted-foreground group-hover:text-white/70",
                    )}
                    fill={isActive ? "currentColor" : "none"}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {isActive && (
                    <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_10px_rgba(124,58,237,1)]" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
