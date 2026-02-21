import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Heart, MessageCircle, Send, Image, Loader2, Plus, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles?: {
    display_name: string;
    avatar_url: string | null;
  };
  reaction_count: number;
  comment_count: number;
  has_liked: boolean;
}

export default function Feed() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [posting, setPosting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const fetchPosts = async () => {
    if (!profile) return;

    const { data: postsData, error } = await supabase
      .from("posts")
      .select("*")
      .eq("university_id", profile.university_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
      return;
    }

    // Fetch profiles for each post
    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    // Fetch reaction counts
    const postIds = postsData.map((p) => p.id);
    const { data: reactions } = await supabase
      .from("reactions")
      .select("post_id, user_id")
      .in("post_id", postIds);

    // Fetch comment counts
    const { data: comments } = await supabase
      .from("comments")
      .select("post_id")
      .in("post_id", postIds);

    const enriched = postsData.map((post) => ({
      ...post,
      profiles: profiles?.find((p) => p.user_id === post.user_id),
      reaction_count: reactions?.filter((r) => r.post_id === post.id).length ?? 0,
      comment_count: comments?.filter((c) => c.post_id === post.id).length ?? 0,
      has_liked: reactions?.some((r) => r.post_id === post.id && r.user_id === user?.id) ?? false,
    }));

    setPosts(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, [profile]);

  const handlePost = async () => {
    if (!user || !profile || !newPost.trim()) return;
    setPosting(true);

    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        await supabase.storage.from("post-images").upload(path, imageFile);
        const { data } = supabase.storage.from("post-images").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        university_id: profile.university_id,
        content: newPost.trim(),
        image_url: imageUrl,
      });

      if (error) throw error;

      setNewPost("");
      setImageFile(null);
      setShowComposer(false);
      toast.success("Posted! 🔥");
      fetchPosts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (postId: string, hasLiked: boolean) => {
    if (!user) return;

    if (hasLiked) {
      await supabase
        .from("reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
    } else {
      await supabase.from("reactions").insert({
        user_id: user.id,
        post_id: postId,
        reaction_type: "like",
      });
    }
    fetchPosts();
  };

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-gradient">T</h1>
        <Button
          size="icon"
          className="gradient-primary border-0 rounded-full h-10 w-10"
          onClick={() => setShowComposer(!showComposer)}
        >
          {showComposer ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </Button>
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
            <Card className="mb-4 border-primary/20 bg-card/80 glow-purple">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} />
                    ) : (
                      <AvatarFallback className="bg-muted text-xs">
                        {profile?.display_name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="What's happening on campus?"
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      rows={3}
                      className="bg-muted/30 border-border/30 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <label className="cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                        <Image className="h-5 w-5" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                      <Button
                        size="sm"
                        onClick={handlePost}
                        disabled={posting || !newPost.trim()}
                        className="gradient-primary border-0"
                      >
                        {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                    {imageFile && (
                      <p className="text-xs text-muted-foreground">📎 {imageFile.name}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-2xl mb-2">🤫</p>
          <p className="text-muted-foreground">No posts yet. Be the first!</p>
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
              <Card className="border-border/30 bg-card/60 backdrop-blur-sm hover:border-primary/20 transition-colors">
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <Avatar className="h-9 w-9">
                      {post.profiles?.avatar_url ? (
                        <AvatarImage src={post.profiles.avatar_url} />
                      ) : (
                        <AvatarFallback className="bg-muted text-xs">
                          {post.profiles?.display_name?.charAt(0) ?? "?"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">
                          {post.profiles?.display_name ?? "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed">{post.content}</p>
                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt="Post"
                          className="mt-2 rounded-lg max-h-64 w-full object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="mt-3 flex items-center gap-4">
                        <button
                          onClick={() => toggleLike(post.id, post.has_liked)}
                          className={`flex items-center gap-1 text-sm transition-colors ${
                            post.has_liked ? "text-secondary" : "text-muted-foreground hover:text-secondary"
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${post.has_liked ? "fill-current" : ""}`} />
                          {post.reaction_count > 0 && post.reaction_count}
                        </button>
                        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                          <MessageCircle className="h-4 w-4" />
                          {post.comment_count > 0 && post.comment_count}
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
