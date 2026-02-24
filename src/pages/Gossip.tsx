import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeError } from "@/lib/sanitize-error";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowUp, Loader2, Plus, X, AtSign, MoreVertical, Flame, Clock, TrendingUp, Timer } from "lucide-react";
import { BurnerTimer } from "@/components/feed/BurnerTimer";
import { SelfDestructWrapper } from "@/components/feed/SelfDestructWrapper";
import { PostSkeleton } from "@/components/ui/PostSkeleton";
import { formatDistanceToNow } from "date-fns";
import { ActivityDrawer } from "@/components/layout/ActivityDrawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GossipPost {
  id: string;
  content: string;
  gossip_alias: string;
  gossip_avatar: string;
  created_at: string;
  expires_at: string | null;
  upvote_count: number;
  has_upvoted: boolean;
  tagged_users: { user_id: string; display_name: string }[];
  is_own: boolean;
  is_flagged?: boolean;
  hotness_score: number;
}

interface TagSuggestion {
  user_id: string;
  display_name: string;
  anonymous_alias: string | null;
}

type FilterMode = "trending" | "recent" | "popularity";
type TimeRange = "week" | "month" | "year";

export default function Gossip() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<GossipPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!loading) { setShowSkeleton(false); return; }
    const t = setTimeout(() => setShowSkeleton(true), 300);
    return () => clearTimeout(t);
  }, [loading]);
  const [showComposer, setShowComposer] = useState(false);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("trending");
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  const [tagQuery, setTagQuery] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagSuggestion[]>([]);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [isBurner, setIsBurner] = useState(false);

  const getTimeRangeDate = (range: TimeRange): Date => {
    const now = new Date();
    if (range === "week") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (range === "month") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return new Date(now.getFullYear(), 0, 1);
  };

  const fetchGossip = async () => {
    if (!profile) return;
    const since = getTimeRangeDate(timeRange).toISOString();

    // Use anonymous view for reading gossip (hides user_id)
    const { data, error } = await supabase
      .from("anonymous_gossip_posts")
      .select("id, content, gossip_alias, gossip_avatar, created_at, university_id")
      .eq("university_id", profile.university_id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);

    // Also fetch own posts to know which ones we can delete
    const { data: ownPosts } = await supabase
      .from("gossip_posts")
      .select("id, expires_at")
      .eq("user_id", user?.id ?? "");

    // Fetch expires_at and hotness_score for all posts
    const { data: extraData } = await supabase
      .from("gossip_posts")
      .select("id, expires_at, hotness_score")
      .in("id", data.map((p) => p.id));

    if (error) {
      console.error("[Gossip]", sanitizeError(error));
      return;
    }

    const postIds = data.map((p) => p.id);

    const [{ data: reactions }, { data: tags }] = await Promise.all([
      supabase.from("reactions").select("gossip_post_id, user_id").in("gossip_post_id", postIds),
      supabase.from("gossip_tags").select("gossip_post_id, tagged_user_id").in("gossip_post_id", postIds),
    ]);

    const taggedUserIds = [...new Set(tags?.map((t) => t.tagged_user_id) ?? [])];
    let taggedProfiles: { user_id: string; display_name: string }[] = [];
    if (taggedUserIds.length > 0) {
      const { data: tp } = await supabase.from("profiles").select("user_id, display_name").in("user_id", taggedUserIds);
      taggedProfiles = tp ?? [];
    }

    let enriched = data.map((post) => {
      const upvoteCount = reactions?.filter((r) => r.gossip_post_id === post.id).length ?? 0;
      const extra = extraData?.find((e) => e.id === post.id);
      return {
        ...post,
        expires_at: extra?.expires_at ?? null,
        hotness_score: extra?.hotness_score ?? 0,
        upvote_count: upvoteCount,
        has_upvoted: reactions?.some((r) => r.gossip_post_id === post.id && r.user_id === user?.id) ?? false,
        tagged_users:
          tags
            ?.filter((t) => t.gossip_post_id === post.id)
            .map((t) => {
              const p = taggedProfiles.find((tp) => tp.user_id === t.tagged_user_id);
              return { user_id: t.tagged_user_id, display_name: p?.display_name ?? "Unknown" };
            }) ?? [],
        is_own: ownPosts?.some((op) => op.id === post.id) ?? false,
      };
    });

    // ── THE GOSSIP GRAVITY ALGORITHM ──
    if (filterMode === "trending") {
      const now = new Date().getTime();
      enriched.sort((a, b) => {
        const ageHoursA = (now - new Date(a.created_at).getTime()) / (1000 * 60 * 60);
        const ageHoursB = (now - new Date(b.created_at).getTime()) / (1000 * 60 * 60);
        const heatA = (a.upvote_count * 1.5 + a.tagged_users.length * 2.0) / Math.pow(ageHoursA + 2, 1.8);
        const heatB = (b.upvote_count * 1.5 + b.tagged_users.length * 2.0) / Math.pow(ageHoursB + 2, 1.8);
        return heatB - heatA;
      });
    } else if (filterMode === "popularity") {
      enriched.sort((a, b) => b.upvote_count - a.upvote_count);
    }

    setPosts(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchGossip();
  }, [profile, filterMode, timeRange]);

  // ── REALTIME: Listen for changes to gossip_posts, reactions, gossip_tags ──
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel("gossip-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "gossip_posts" }, () => {
        fetchGossip();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, () => {
        fetchGossip();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => {
        fetchGossip();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, filterMode, timeRange]);

  const searchTags = async (query: string) => {
    setTagQuery(query);
    if (!query.trim() || !profile) {
      setTagSuggestions([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, anonymous_alias")
      .eq("university_id", profile.university_id)
      .ilike("display_name", `%${query}%`)
      .neq("user_id", user?.id ?? "")
      .limit(5);
    setTagSuggestions(data ?? []);
  };

  const addTag = (s: TagSuggestion) => {
    if (!selectedTags.find((t) => t.user_id === s.user_id)) {
      setSelectedTags([...selectedTags, s]);
    }
    setTagQuery("");
    setTagSuggestions([]);
  };

  const removeTag = (userId: string) => {
    setSelectedTags(selectedTags.filter((t) => t.user_id !== userId));
  };

  const handlePost = async () => {
    if (!user || !profile || !content.trim()) return;
    setPosting(true);
    try {
      const { data: insertedPost, error } = await supabase
        .from("gossip_posts")
        .insert({
          user_id: user.id,
          university_id: profile.university_id,
          content: content.trim(),
          gossip_alias: profile.anonymous_alias ?? "Anonymous",
          gossip_avatar: "mask",
          expires_at: isBurner ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (selectedTags.length > 0 && insertedPost) {
        await supabase
          .from("gossip_tags")
          .insert(selectedTags.map((t) => ({ gossip_post_id: insertedPost.id, tagged_user_id: t.user_id })));
      }

      setContent("");
      setSelectedTags([]);
      setIsBurner(false);
      setShowComposer(false);
      toast.success("Gossip posted!");
      fetchGossip();
    } catch (error: any) {
      toast.error(sanitizeError(error));
    } finally {
      setPosting(false);
    }
  };

  const toggleUpvote = async (postId: string, hasUpvoted: boolean) => {
    if (!user) return;
    if (hasUpvoted) {
      await supabase.from("reactions").delete().eq("gossip_post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("reactions").insert({ user_id: user.id, gossip_post_id: postId, reaction_type: "upvote" });
    }
    fetchGossip();
  };

  const reportPost = async (postId: string) => {
    if (!user) return;
    // Report via reports table only (no direct UPDATE on gossip_posts)
    const { error } = await supabase
      .from("reports")
      .insert({ reporter_user_id: user.id, reported_gossip_post_id: postId, reason: "Flagged by user" });
    if (!error) toast.success("Report submitted.");
  };

  const deleteGossip = async (postId: string) => {
    const { error } = await supabase.from("gossip_posts").delete().eq("id", postId);
    if (error) {
      toast.error(sanitizeError(error));
    } else {
      toast.success("Gossip deleted");
      fetchGossip();
    }
    setDeletePostId(null);
  };

  const filters: FilterMode[] = ["trending", "recent", "popularity"];
  const timeRanges: TimeRange[] = ["week", "month", "year"];

  const getFilterIcon = (mode: FilterMode) => {
    if (mode === "trending") return <Flame className="h-3.5 w-3.5 mr-1.5" />;
    if (mode === "recent") return <Clock className="h-3.5 w-3.5 mr-1.5" />;
    if (mode === "popularity") return <TrendingUp className="h-3.5 w-3.5 mr-1.5" />;
    return null;
  };

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-4xl tracking-widest text-foreground uppercase drop-shadow-md">Gossip</h1>
          <p className="text-xs text-muted-foreground/80 mt-0.5">Anonymous. Unfiltered. Campus tea.</p>
        </div>
        <div className="flex items-center gap-3">
          <ActivityDrawer />
          <button
            onClick={() => setShowComposer(!showComposer)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition-transform active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          >
            {showComposer ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 space-y-2.5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {filters.map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`flex items-center px-4 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all ${
                filterMode === mode
                  ? mode === "trending"
                    ? "bg-[#7C3AED] text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]"
                    : "bg-foreground text-background"
                  : "bg-black/40 border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white"
              }`}
            >
              {getFilterIcon(mode)}
              {mode}
            </button>
          ))}
        </div>
        {/* Conditional time range row */}
        <AnimatePresence>
          {filterMode === "popularity" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-1.5">
                {timeRanges.map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium capitalize transition-colors ${timeRange === range ? "bg-foreground text-background" : "bg-black/40 border border-white/10 text-muted-foreground hover:bg-white/10"}`}
                  >
                    This {range}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Composer */}
      <AnimatePresence>
        {showComposer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-5 rounded-3xl glass-panel p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary">
                  Posting as {profile?.anonymous_alias ?? "Anonymous"}
                </span>
              </div>
              <Textarea
                placeholder="Spill the tea..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                className="bg-black/20 border border-white/10 rounded-xl resize-none text-sm p-3 text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/50"
              />

              {/* Tag users */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <AtSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tag someone..."
                    value={tagQuery}
                    onChange={(e) => searchTags(e.target.value)}
                    className="h-9 rounded-full bg-black/40 border border-white/10 text-xs pl-3 text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                </div>
                {tagSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 rounded-xl border border-white/10 bg-[#0A0A0A]/95 backdrop-blur-md shadow-lg overflow-hidden">
                    <div className="p-1.5 space-y-0.5">
                      {tagSuggestions.map((s) => (
                        <button
                          key={s.user_id}
                          onClick={() => addTag(s)}
                          className="w-full text-left p-2 rounded-lg hover:bg-white/10 text-sm text-foreground transition-colors"
                        >
                          {s.display_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedTags.map((t) => (
                    <span
                      key={t.user_id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium border border-primary/30"
                    >
                      @{t.display_name}
                      <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={() => removeTag(t.user_id)} />
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsBurner(!isBurner)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isBurner
                      ? "bg-red-500/10 backdrop-blur-md text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                      : "bg-white/5 backdrop-blur-md text-muted-foreground border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <Timer className="h-3.5 w-3.5" />
                  24h Burner
                </button>
                <button
                  onClick={handlePost}
                  disabled={posting || !content.trim()}
                  className="px-5 py-2 rounded-full bg-primary text-white text-xs font-bold shadow-[0_0_15px_rgba(124,58,237,0.3)] disabled:opacity-40 disabled:shadow-none transition-transform active:scale-95"
                >
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts */}
      {loading ? (
        showSkeleton ? (
          <div className="space-y-3">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : null
      ) : posts.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-muted-foreground text-sm font-medium">No gossip yet. Start the drama!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <SelfDestructWrapper expiresAt={post.expires_at}>
              <div className={post.hotness_score > 0.7 ? "card-heat-high" : post.hotness_score >= 0.3 ? "card-heat-medium" : "card-heat-low"}>
                <div className="glass-card-box">
                  <span className="glass-floaters"></span>
                  <div className="glass-card-inner">
                    <div className="flex gap-3">
                      <Avatar className="h-9 w-9 ring-1 ring-white/10">
                        <AvatarFallback className="bg-black/40 text-base">🎭</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-primary drop-shadow-[0_0_8px_rgba(124,58,237,0.3)]">
                              {post.gossip_alias}
                            </span>
                            <span className="text-[11px] text-muted-foreground/80">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </span>
                            {post.expires_at && <BurnerTimer expiresAt={post.expires_at} />}
                            {post.hotness_score > 0.7 && (
                              <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/50">
                                🔥 HOT TEA
                              </span>
                            )}
                          </div>
                          {post.is_own && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[#0A0A0A] border-white/10">
                                <DropdownMenuItem
                                  onClick={() => setDeletePostId(post.id)}
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                >
                                  Delete Gossip
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{post.content}</p>
                        {post.tagged_users.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {post.tagged_users.map((t) => (
                              <span
                                key={t.user_id}
                                className="inline-flex px-2.5 py-0.5 rounded-full bg-[#EC4899]/10 text-[#EC4899] border border-[#EC4899]/20 text-[10px] font-bold"
                              >
                                @{t.display_name}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-3.5 flex items-center gap-4">
                          <button
                            onClick={() => toggleUpvote(post.id, post.has_upvoted)}
                            className={`flex items-center gap-1.5 text-sm transition-colors ${post.has_upvoted ? "text-primary drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            <ArrowUp className={`h-4 w-4 ${post.has_upvoted ? "fill-current" : ""}`} />
                            {post.upvote_count > 0 && <span className="text-[11px] font-bold">{post.upvote_count}</span>}
                          </button>
                          <button
                            onClick={() => reportPost(post.id)}
                            className="text-[11px] font-medium text-muted-foreground hover:text-destructive transition-colors"
                          >
                            Report
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </SelfDestructWrapper>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={(open) => !open && setDeletePostId(null)}>
        <AlertDialogContent className="bg-[#0A0A0A] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Are you sure you want to delete this gossip?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-foreground hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePostId && deleteGossip(deletePostId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
