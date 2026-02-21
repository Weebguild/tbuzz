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
    if (!query.trim() || !profile) { setSearchResults([]); return; }
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
      setFollowingIds((prev) => { const n = new Set(prev); n.delete(targetUserId); return n; });
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
          <div className="fixed inset-0 z-50 bg-black/70" onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-elevated border-t border-border max-h-[80vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Search campus users..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 h-11 rounded-full bg-muted border-0 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-1">
              {searchResults.map((r) => (
                <div key={r.user_id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => { setShowSearch(false); navigate(`/profile/${r.user_id}`); }}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      {r.avatar_url ? <AvatarImage src={r.avatar_url} /> : <AvatarFallback className="bg-muted text-sm font-bold text-foreground">{r.display_name.charAt(0)}</AvatarFallback>}
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{r.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[r.year, r.department].filter(Boolean).join(" · ") || "Student"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFollow(r.user_id)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ml-2",
                      followingIds.has(r.user_id) ? "border border-border text-muted-foreground" : "bg-foreground text-background"
                    )}
                  >
                    {followingIds.has(r.user_id) ? "Unfollow" : "Follow"}
                  </button>
                </div>
              ))}
              {searchQuery && searchResults.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background safe-area-pb">
        <div className="mx-auto flex max-w-lg items-center justify-around px-4 py-2">
          {tabs.map((tab) => {
            if (tab.isCenter) {
              return (
                <div key={tab.path} className="flex items-center justify-center -mt-5">
                  <button
                    onClick={openSearch}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground shadow-lg shadow-black/30"
                  >
                    <Plus className="h-6 w-6 text-background" />
                  </button>
                </div>
              );
            }

            const isActive =
              location.pathname === tab.path ||
              (tab.path === "/feed" && location.pathname === "/");

            return (
              <Link
                key={tab.path}
                to={tab.path}
                className="flex flex-1 items-center justify-center py-2"
              >
                <tab.icon
                  className={cn(
                    "h-6 w-6 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                  fill={isActive ? "currentColor" : "none"}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
