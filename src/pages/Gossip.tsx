import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowUp, Flag, Loader2, Plus, X, Send, Sparkles, AtSign, Filter } from "lucide-react";
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

  // Tagging
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

    // Get tagged user display names
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

    // Sort by filter mode
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

      // Insert tags
      if (selectedTags.length > 0 && insertedPost) {
        await supabase.from("gossip_tags").insert(
          selectedTags.map((t) => ({ gossip_post_id: insertedPost.id, tagged_user_id: t.user_id }))
        );
      }

      setContent("");
      setSelectedTags([]);
      setShowComposer(false);
      toast.success("Gossip posted! 🤫");
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
    if (!error) toast.success("Report submitted. 🛡️");
  };

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Gossip</h1>
          <p className="text-xs text-muted-foreground">Anonymous. Unfiltered. Campus tea. ☕</p>
        </div>
        <Button size="icon" className="gradient-primary border-0 rounded-full h-10 w-10" onClick={() => setShowComposer(!showComposer)}>
          {showComposer ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          {(["trending", "recent", "popularity"] as FilterMode[]).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={filterMode === mode ? "default" : "outline"}
              className={`text-xs h-7 capitalize ${filterMode === mode ? "gradient-primary border-0" : "border-border/50"}`}
              onClick={() => setFilterMode(mode)}
            >
              {mode}
            </Button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(["week", "month", "year"] as TimeRange[]).map((range) => (
            <Badge
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              className={`cursor-pointer text-[10px] capitalize ${timeRange === range ? "bg-secondary border-0" : "border-border/50"}`}
              onClick={() => setTimeRange(range)}
            >
              This {range}
            </Badge>
          ))}
        </div>
      </div>

      {/* Composer */}
      <AnimatePresence>
        {showComposer && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Card className="mb-4 border-secondary/20 bg-card/80 glow-pink">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-secondary" />
                  <span className="text-xs text-secondary font-medium">Posting as {profile?.anonymous_alias ?? "Anonymous"}</span>
                </div>
                <Textarea placeholder="Spill the tea... ☕" value={content} onChange={(e) => setContent(e.target.value)} rows={3} className="bg-muted/30 border-border/30 resize-none" />

                {/* Tag users */}
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <AtSign className="h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Tag someone..." value={tagQuery} onChange={(e) => searchTags(e.target.value)} className="bg-muted/30 border-border/30 text-xs h-8" />
                  </div>
                  {tagSuggestions.length > 0 && (
                    <Card className="absolute z-10 w-full mt-1 border-border/50 bg-card">
                      <CardContent className="p-2 space-y-1">
                        {tagSuggestions.map((s) => (
                          <button key={s.user_id} onClick={() => addTag(s)} className="w-full text-left p-2 rounded hover:bg-muted/50 text-sm">
                            {s.display_name}
                          </button>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTags.map((t) => (
                      <Badge key={t.user_id} variant="outline" className="text-xs border-secondary/30 text-secondary gap-1">
                        @{t.display_name}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(t.user_id)} />
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button size="sm" onClick={handlePost} disabled={posting || !content.trim()} className="bg-secondary hover:bg-secondary/90 border-0">
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-secondary" /></div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-2xl mb-2">🤐</p>
          <p className="text-muted-foreground">No gossip yet. Start the drama!</p>
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {posts.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/30 bg-card/60 backdrop-blur-sm hover:border-secondary/20 transition-colors">
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <Avatar className="h-9 w-9 ring-1 ring-secondary/30">
                      <AvatarFallback className="bg-muted text-lg">🎭</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-secondary truncate">{post.gossip_alias}</span>
                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed">{post.content}</p>
                      {post.tagged_users.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {post.tagged_users.map((t) => (
                            <Badge key={t.user_id} className="text-[10px] bg-secondary/20 text-secondary border-0">@{t.display_name}</Badge>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-4">
                        <button onClick={() => toggleUpvote(post.id, post.has_upvoted)} className={`flex items-center gap-1 text-sm transition-colors ${post.has_upvoted ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
                          <ArrowUp className={`h-4 w-4 ${post.has_upvoted ? "fill-current" : ""}`} />
                          {post.upvote_count > 0 && post.upvote_count}
                        </button>
                        <button onClick={() => reportPost(post.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Flag className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
