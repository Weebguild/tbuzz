import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowUp, Flag, Loader2, Plus, X, Send, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ANIMALS = ["Panda", "Fox", "Owl", "Wolf", "Cat", "Bear", "Hawk", "Lynx", "Raven", "Tiger"];
const ADJECTIVES = ["Mysterious", "Sneaky", "Wild", "Electric", "Shadow", "Neon", "Cosmic", "Midnight", "Phantom", "Savage"];

function generateAlias() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${adj}${animal}${num}`;
}

const AVATAR_EMOJIS: Record<string, string> = {
  panda: "🐼", fox: "🦊", owl: "🦉", wolf: "🐺", cat: "🐱",
  bear: "🐻", hawk: "🦅", lynx: "🐱", raven: "🐦‍⬛", tiger: "🐯",
};

function getAvatarEmoji(alias: string): string {
  const animal = ANIMALS.find((a) => alias.toLowerCase().includes(a.toLowerCase()));
  return AVATAR_EMOJIS[animal?.toLowerCase() ?? "panda"] ?? "🎭";
}

interface GossipPost {
  id: string;
  content: string;
  gossip_alias: string;
  gossip_avatar: string;
  created_at: string;
  tagged_user_id: string | null;
  upvote_count: number;
  has_upvoted: boolean;
}

export default function Gossip() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<GossipPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  const fetchGossip = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from("gossip_posts")
      .select("*")
      .eq("university_id", profile.university_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
      return;
    }

    const postIds = data.map((p) => p.id);
    const { data: reactions } = await supabase
      .from("reactions")
      .select("gossip_post_id, user_id")
      .in("gossip_post_id", postIds);

    const enriched = data.map((post) => ({
      ...post,
      upvote_count: reactions?.filter((r) => r.gossip_post_id === post.id).length ?? 0,
      has_upvoted: reactions?.some((r) => r.gossip_post_id === post.id && r.user_id === user?.id) ?? false,
    }));

    setPosts(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchGossip();
  }, [profile]);

  const handlePost = async () => {
    if (!user || !profile || !content.trim()) return;
    setPosting(true);

    try {
      const alias = generateAlias();
      const animal = ANIMALS.find((a) => alias.includes(a))?.toLowerCase() ?? "panda";

      const { error } = await supabase.from("gossip_posts").insert({
        user_id: user.id,
        university_id: profile.university_id,
        content: content.trim(),
        gossip_alias: alias,
        gossip_avatar: animal,
      });

      if (error) throw error;

      setContent("");
      setShowComposer(false);
      toast.success("Gossip posted anonymously! 🤫");
      fetchGossip();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setPosting(false);
    }
  };

  const toggleUpvote = async (postId: string, hasUpvoted: boolean) => {
    if (!user) return;

    if (hasUpvoted) {
      await supabase
        .from("reactions")
        .delete()
        .eq("gossip_post_id", postId)
        .eq("user_id", user.id);
    } else {
      await supabase.from("reactions").insert({
        user_id: user.id,
        gossip_post_id: postId,
        reaction_type: "upvote",
      });
    }
    fetchGossip();
  };

  const reportPost = async (postId: string) => {
    if (!user) return;
    const { error } = await supabase.from("reports").insert({
      reporter_user_id: user.id,
      reported_gossip_post_id: postId,
      reason: "Flagged by user",
    });
    if (!error) toast.success("Report submitted. We'll review it. 🛡️");
  };

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Gossip</h1>
          <p className="text-xs text-muted-foreground">Anonymous. Unfiltered. Campus tea. ☕</p>
        </div>
        <Button
          size="icon"
          className="gradient-primary border-0 rounded-full h-10 w-10"
          onClick={() => setShowComposer(!showComposer)}
        >
          {showComposer ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </Button>
      </div>

      <AnimatePresence>
        {showComposer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="mb-4 border-secondary/20 bg-card/80 glow-pink">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-secondary" />
                  <span className="text-xs text-secondary font-medium">Posting anonymously</span>
                </div>
                <Textarea
                  placeholder="Spill the tea... ☕"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  className="bg-muted/30 border-border/30 resize-none"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={handlePost}
                    disabled={posting || !content.trim()}
                    className="bg-secondary hover:bg-secondary/90 border-0"
                  >
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-2xl mb-2">🤐</p>
          <p className="text-muted-foreground">No gossip yet. Start the drama!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-border/30 bg-card/60 backdrop-blur-sm hover:border-secondary/20 transition-colors">
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <Avatar className="h-9 w-9 ring-1 ring-secondary/30">
                      <AvatarFallback className="bg-muted text-lg">
                        {getAvatarEmoji(post.gossip_alias)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-secondary truncate">
                          {post.gossip_alias}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed">{post.content}</p>
                      <div className="mt-3 flex items-center gap-4">
                        <button
                          onClick={() => toggleUpvote(post.id, post.has_upvoted)}
                          className={`flex items-center gap-1 text-sm transition-colors ${
                            post.has_upvoted ? "text-primary" : "text-muted-foreground hover:text-primary"
                          }`}
                        >
                          <ArrowUp className={`h-4 w-4 ${post.has_upvoted ? "fill-current" : ""}`} />
                          {post.upvote_count > 0 && post.upvote_count}
                        </button>
                        <button
                          onClick={() => reportPost(post.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
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
