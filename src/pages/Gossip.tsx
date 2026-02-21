import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowUp, Loader2, Plus, X, AtSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface GossipPost {
  id: string;
  content: string;
  gossip_alias: string;
  gossip_avatar: string;
  created_at: string;
  upvote_count: number;
  has_upvoted: boolean;
  tagged_users: { user_id: string; display_name: string }[];
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
  const [showComposer, setShowComposer] = useState(false);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("trending");
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  const [tagQuery, setTagQuery] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagSuggestion[]>([]);

  const getTimeRangeDate = (range: TimeRange): Date => {
    const now = new Date();
    if (range === "week") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (range === "month") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return new Date(now.getFullYear(), 0, 1);
  };

  const fetchGossip = async () => {
    if (!profile) return;
    const since = getTimeRangeDate(timeRange).toISOString();
    let query = supabase
      .from("gossip_posts")
      .select("*")
      .eq("university_id", profile.university_id)
      .gte("created_at", since)
      .limit(50);

    if (filterMode === "recent") {
      query = query.order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) { console.error(error); return; }

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
      return {
        ...post,
        upvote_count: upvoteCount,
        has_upvoted: reactions?.some((r) => r.gossip_post_id === post.id && r.user_id === user?.id) ?? false,
        tagged_users: tags?.filter((t) => t.gossip_post_id === post.id).map((t) => {
          const p = taggedProfiles.find((tp) => tp.user_id === t.tagged_user_id);
          return { user_id: t.tagged_user_id, display_name: p?.display_name ?? "Unknown" };
        }) ?? [],
      };
    });

    if (filterMode === "trending" || filterMode === "popularity") {
      enriched.sort((a, b) => b.upvote_count - a.upvote_count);
    }

    setPosts(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchGossip(); }, [profile, filterMode, timeRange]);

  const searchTags = async (query: string) => {
    setTagQuery(query);
    if (!query.trim() || !profile) { setTagSuggestions([]); return; }
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
      const { data: insertedPost, error } = await supabase.from("gossip_posts").insert({
        user_id: user.id,
        university_id: profile.university_id,
        content: content.trim(),
        gossip_alias: profile.anonymous_alias ?? "Anonymous",
        gossip_avatar: "mask",
      }).select("id").single();
      if (error) throw error;

      if (selectedTags.length > 0 && insertedPost) {
        await supabase.from("gossip_tags").insert(
          selectedTags.map((t) => ({ gossip_post_id: insertedPost.id, tagged_user_id: t.user_id }))
        );
      }

      setContent("");
      setSelectedTags([]);
      setShowComposer(false);
      toast.success("Gossip posted!");
      fetchGossip();
    } catch (error: any) { toast.error(error.message); }
    finally { setPosting(false); }
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
    const { error } = await supabase.from("reports").insert({ reporter_user_id: user.id, reported_gossip_post_id: postId, reason: "Flagged by user" });
    if (!error) toast.success("Report submitted.");
  };

  const filters: FilterMode[] = ["trending", "recent", "popularity"];
  const timeRanges: TimeRange[] = ["week", "month", "year"];

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Gossip</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Anonymous. Unfiltered. Campus tea.</p>
        </div>
        <button
          onClick={() => setShowComposer(!showComposer)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition-transform active:scale-95"
        >
          {showComposer ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 space-y-2.5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-colors ${filterMode === mode ? "bg-foreground text-background" : "border border-border text-foreground"}`}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium capitalize transition-colors ${timeRange === range ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}
            >
              This {range}
            </button>
          ))}
        </div>
      </div>

      {/* Composer */}
      <AnimatePresence>
        {showComposer && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mb-5 rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary">Posting as {profile?.anonymous_alias ?? "Anonymous"}</span>
              </div>
              <Textarea placeholder="Spill the tea..." value={content} onChange={(e) => setContent(e.target.value)} rows={3} className="border-0 bg-muted rounded-xl resize-none text-sm p-3 text-foreground placeholder:text-muted-foreground" />

              {/* Tag users */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <AtSign className="h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Tag someone..." value={tagQuery} onChange={(e) => searchTags(e.target.value)} className="h-9 rounded-full bg-muted border-0 text-xs pl-3 text-foreground placeholder:text-muted-foreground" />
                </div>
                {tagSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 rounded-xl border border-border bg-elevated shadow-lg overflow-hidden">
                    <div className="p-1.5 space-y-0.5">
                      {tagSuggestions.map((s) => (
                        <button key={s.user_id} onClick={() => addTag(s)} className="w-full text-left p-2 rounded-lg hover:bg-muted text-sm text-foreground transition-colors">
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
                    <span key={t.user_id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      @{t.display_name}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(t.user_id)} />
                    </span>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handlePost}
                  disabled={posting || !content.trim()}
                  className="px-5 py-2 rounded-full bg-foreground text-background text-xs font-semibold disabled:opacity-40 transition-transform active:scale-95"
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
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-muted-foreground text-sm">No gossip yet. Start the drama!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-muted text-base">🎭</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-primary">{post.gossip_alias}</span>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground">{post.content}</p>
                    {post.tagged_users.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {post.tagged_users.map((t) => (
                          <span key={t.user_id} className="inline-flex px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold">@{t.display_name}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-4">
                      <button onClick={() => toggleUpvote(post.id, post.has_upvoted)} className={`flex items-center gap-1.5 text-sm transition-colors ${post.has_upvoted ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                        <ArrowUp className={`h-4 w-4 ${post.has_upvoted ? "fill-current" : ""}`} />
                        {post.upvote_count > 0 && <span className="text-xs font-medium">{post.upvote_count}</span>}
                      </button>
                      <button onClick={() => reportPost(post.id)} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                        Report
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
